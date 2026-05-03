import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

import { buildPrivateRowMaps } from './catalog.ts';
import { normalizeQuery } from './normalize.ts';
import { rerankCandidates } from './rank.ts';
import { enforceSearchRateLimit, SearchEngineHttpError } from './rate-limit.ts';
import type { CandidateRow, PrivateFeatureRow, PrivateManifestRow } from './types.ts';
import {
  buildIntentQueryVariants,
  buildSearchIntentProfile,
  getIntentCandidateAdjustment,
} from '../../../../lib/search-intent-core.js';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-si-session-hash, x-supericons-api-key',
};

const ENGINE_VERSION = 'search-v1';

const RAILWAY_PROMOTION_TRIGGERS = {
  averageCpuMs: 1500,
  p95LatencyMs: 2000,
  requiresPython: false,
  requiresLongLivedWorker: false,
};

function buildJsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

function normalizeLibrary(value: unknown) {
  const normalized = String(value || '').trim().toLowerCase();
  return normalized || null;
}

function normalizeSource(value: unknown, fallback = 'web') {
  const normalized = String(value || '').trim().toLowerCase();
  return normalized || fallback;
}

function normalizeStyle(value: unknown) {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'outline' || normalized === 'solid') return normalized;
  return 'any';
}

function buildErrorResponse(error: unknown) {
  const normalized = error instanceof SearchEngineHttpError
    ? error
    : new SearchEngineHttpError(
      error instanceof Error ? error.message : 'Hosted search failed.',
      {
        status: 500,
        code: 'search_service_unavailable',
        hint: 'Retry the hosted search request.',
        retryable: true,
      },
    );

  return buildJsonResponse({
    error: normalized.code,
    message: normalized.message,
    hint: normalized.hint,
    retryable: normalized.retryable,
    ...normalized.details,
  }, normalized.status);
}

export async function handleSearchRequest(
  req: Request,
  { defaultSource = 'web' }: { defaultSource?: string } = {},
) {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return buildJsonResponse({ error: 'method_not_allowed' }, 405);
  }

  const startedAt = Date.now();
  let adminClient = null;
  let queryNorm = '';
  let source = defaultSource;
  let library: string | null = null;
  let identity = { sessionHash: null as string | null, ipHash: null as string | null };

  try {
    const body = await req.json().catch(() => ({}));
    queryNorm = normalizeQuery(body?.query);
    library = normalizeLibrary(body?.library);
    source = normalizeSource(body?.source, defaultSource);
    const style = normalizeStyle(body?.style);
    const limit = Math.max(1, Math.min(50, Number(body?.limit || 20)));

    identity = await enforceSearchRateLimit(req);

    if (!queryNorm) {
      return buildJsonResponse({
        query: queryNorm,
        results: [],
        engine_version: ENGINE_VERSION,
        railway_promotion_triggers: RAILWAY_PROMOTION_TRIGGERS,
      });
    }

    adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const intentProfile = buildSearchIntentProfile(queryNorm);
    const queryVariants = buildIntentQueryVariants(queryNorm, { maxVariants: 6 });
    const candidateBatches = await Promise.all(
      queryVariants.map((variant, index) =>
        adminClient.rpc('si_search_icon_candidates', {
          p_query: variant,
          p_library: library,
          p_limit: Math.max(limit * 3, 40),
        }).then((result) => ({ ...result, variant, index }))
      ),
    );

    const candidatesById = new Map<string, CandidateRow>();
    for (const batch of candidateBatches) {
      if (batch.error) throw batch.error;
      for (const rawRow of (batch.data || []) as CandidateRow[]) {
        const adjustment = getIntentCandidateAdjustment(rawRow, intentProfile);
        const row = {
          ...rawRow,
          query_variant: batch.variant,
          query_variant_rank: batch.index,
          intent_boost: adjustment.boost + Math.max(0, 6 - batch.index),
          intent_penalty: adjustment.penalty,
          lexical_rank: Number(rawRow.lexical_rank || 0),
        };
        const existing = candidatesById.get(row.icon_id);
        const rowScore = (row.lexical_rank || 0) + (row.intent_boost || 0) - (row.intent_penalty || 0);
        const existingScore = existing
          ? (existing.lexical_rank || 0) + (existing.intent_boost || 0) - (existing.intent_penalty || 0)
          : -Infinity;
        if (!existing || rowScore > existingScore) {
          candidatesById.set(row.icon_id, row);
        }
      }
    }

    const candidates = [...candidatesById.values()];

    const iconIds = candidates.map((row) => row.icon_id);

    let manifests: PrivateManifestRow[] = [];
    let features: PrivateFeatureRow[] = [];

    if (iconIds.length > 0) {
      const [manifestResult, featureResult] = await Promise.all([
        adminClient
          .from('icon_search_private_manifest')
          .select('icon_id, semantic_aliases, use_cases, contraindications, trust_tier, explanation_short')
          .in('icon_id', iconIds),
        adminClient
          .from('icon_search_private_features')
          .select('icon_id, popularity_score, behavioral_score, editorial_score, replace_risk_score, manual_boost, manual_penalty')
          .in('icon_id', iconIds),
      ]);

      if (manifestResult.error) throw manifestResult.error;
      if (featureResult.error) throw featureResult.error;

      manifests = (manifestResult.data || []) as PrivateManifestRow[];
      features = (featureResult.data || []) as PrivateFeatureRow[];
    }

    const { manifestsById, featuresById } = buildPrivateRowMaps(manifests, features);
    const rankedResults = rerankCandidates(
      queryNorm,
      (candidates || []) as CandidateRow[],
      manifestsById,
      featuresById,
    )
      .filter((row) => style === 'any' || row.style === style)
      .slice(0, limit);

    const resultIconIds = rankedResults.map((row) => row.icon_id);
    let publicRecordsById = new Map<string, Record<string, unknown>>();

    if (resultIconIds.length > 0) {
      const publicRegistryResult = await adminClient
        .from('icon_registry_public_export')
        .select('icon_id, label, source_name, depicts, semantic_tags, synonyms, use_when, avoid_when')
        .in('icon_id', resultIconIds);

      if (publicRegistryResult.error) throw publicRegistryResult.error;
      publicRecordsById = new Map(
        (publicRegistryResult.data || []).map((record: Record<string, unknown>) => [
          String(record.icon_id),
          record,
        ]),
      );
    }

    const results = rankedResults.map((row) => {
      const publicRecord = publicRecordsById.get(row.icon_id);
      if (!publicRecord) return row;
      const { icon_id: _iconId, ...semantic } = publicRecord;
      return {
        ...row,
        semantic,
      };
    });

    await adminClient.from('search_request_audit').insert({
      query_norm: queryNorm,
      source,
      library_filter: library,
      result_count: results.length,
      status: 'ok',
      latency_ms: Date.now() - startedAt,
      session_hash: identity.sessionHash,
      ip_hash: identity.ipHash,
    });

    return buildJsonResponse({
      query: queryNorm,
      results,
      engine_version: ENGINE_VERSION,
      query_expansion: {
        variants: queryVariants,
        expanded: queryVariants.length > 1,
      },
      railway_promotion_triggers: RAILWAY_PROMOTION_TRIGGERS,
    });
  } catch (error) {
    if (adminClient && queryNorm) {
      try {
        await adminClient.from('search_request_audit').insert({
          query_norm: queryNorm,
          source,
          library_filter: library,
          result_count: 0,
          status: 'error',
          latency_ms: Date.now() - startedAt,
          session_hash: identity.sessionHash,
          ip_hash: identity.ipHash,
        });
      } catch {
        // Ignore secondary audit failures while returning the primary error.
      }
    }

    return buildErrorResponse(error);
  }
}
