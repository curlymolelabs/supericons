import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

import { buildPrivateRowMaps } from './catalog.ts';
import { normalizeQuery } from './normalize.ts';
import { rerankCandidates } from './rank.ts';
import { enforceSearchRateLimit, SearchEngineHttpError } from './rate-limit.ts';
import type { CandidateRow, PrivateFeatureRow, PrivateManifestRow } from './types.ts';

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

    const { data: candidates, error: candidateError } = await adminClient.rpc('si_search_icon_candidates', {
      p_query: queryNorm,
      p_library: library,
      p_limit: Math.max(limit * 3, 40),
    });

    if (candidateError) {
      throw candidateError;
    }

    const iconIds = ((candidates || []) as CandidateRow[]).map((row) => row.icon_id);

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
    const results = rerankCandidates(
      queryNorm,
      (candidates || []) as CandidateRow[],
      manifestsById,
      featuresById,
    ).slice(0, limit);

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
