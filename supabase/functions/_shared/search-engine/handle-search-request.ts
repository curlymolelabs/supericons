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
import { buildSearchQueryFrame } from '../../../../lib/search-query-frame.js';
import { buildSearchRankingQueryVariants } from '../../../../lib/search-ranking-policy.js';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-si-session-hash, x-supericons-api-key',
};

const ENGINE_VERSION = 'search-v1';
const PUBLIC_SEMANTIC_PROFILE_FIELDS = [
  'source_library',
  'source_name',
  'label',
  'name',
  'slug',
  'purpose',
  'category',
  'asset_type',
  'pack',
  'source_url',
  'source_trust',
  'meaning',
  'depicts',
  'semantic_tags',
  'ai_category',
  'ai_category_label',
  'ai_filter_tags',
  'job_category',
  'secondary_categories',
  'synonyms',
  'aliases',
  'search_terms',
  'filter_tags',
  'use_when',
  'avoid_when',
  'rights',
  'variants',
  'quality_status',
  'access',
];

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

const AUDIT_CHANNELS = new Set(['web', 'hosted_mcp', 'local_mcp', 'cli', 'api', 'internal_test', 'unknown']);
const AUDIT_ENVIRONMENTS = new Set(['production', 'preview', 'local', 'test', 'legacy']);

function normalizeAuditToken(value: unknown, { maxLength = 80 } = {}) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, maxLength);
}

function normalizeAuditText(value: unknown, { maxLength = 120 } = {}) {
  const text = String(value || '').trim();
  return text ? text.slice(0, maxLength) : null;
}

function normalizeAuditHash(value: unknown) {
  const text = String(value || '').trim().toLowerCase();
  return /^[a-f0-9]{16,128}$/.test(text) ? text : null;
}

function normalizeAuditCountry(value: unknown) {
  const text = String(value || '').trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(text)) return null;
  if (['XX', 'ZZ', 'T1'].includes(text)) return null;
  return text;
}

function channelFromSource(source: unknown) {
  const token = normalizeAuditToken(source);
  if (token.includes('local_mcp') || token === 'npm' || token === 'npx') return 'local_mcp';
  if (token === 'mcp' || token === 'hosted_mcp' || token === 'mcp_search' || token.includes('mcp')) return 'hosted_mcp';
  if (token === 'cli' || token.includes('cli')) return 'cli';
  if (token === 'api' || token.includes('api')) return 'api';
  if (token === 'test' || token === 'verify' || token.includes('test') || token.includes('verify') || token.includes('trap')) return 'internal_test';
  if (token === 'web' || token === 'site' || token === 'hosted_search' || token.includes('web')) return 'web';
  return null;
}

function environmentFromSource(source: unknown) {
  const token = normalizeAuditToken(source);
  if (token.includes('local')) return 'local';
  if (token.includes('preview') || token.includes('netlify')) return 'preview';
  if (token.includes('test') || token.includes('verify') || token.includes('internal') || token.includes('trap')) return 'test';
  if (token === 'web' || token === 'hosted_search' || token === 'mcp' || token === 'hosted_mcp' || token === 'mcp_search' || token === 'api' || token === 'cli' || token.includes('mcp')) {
    return 'production';
  }
  return null;
}

function buildSearchAuditContext(body: Record<string, unknown>, source: string) {
  const channelToken = normalizeAuditToken(body?.channel);
  const environmentToken = normalizeAuditToken(body?.environment);
  const clientFamily = normalizeAuditToken(body?.client_family, { maxLength: 64 }) || 'unknown';
  const toolName = normalizeAuditToken(body?.tool_name, { maxLength: 64 }) || null;
  const locale = normalizeAuditText(body?.locale, { maxLength: 32 });

  return {
    channel: AUDIT_CHANNELS.has(channelToken) ? channelToken : (channelFromSource(source) || 'unknown'),
    environment: AUDIT_ENVIRONMENTS.has(environmentToken) ? environmentToken : (environmentFromSource(source) || 'production'),
    client_family: clientFamily,
    tool_name: toolName,
    locale,
    anonymous_client_hash: normalizeAuditHash(body?.anonymous_client_hash),
    user_agent_hash: normalizeAuditHash(body?.user_agent_hash),
    api_key_hash: normalizeAuditHash(body?.api_key_hash),
    mcp_server_version: normalizeAuditText(body?.mcp_server_version, { maxLength: 40 }),
    request_id: normalizeAuditText(body?.request_id, { maxLength: 120 }),
    dedupe_key: normalizeAuditText(body?.dedupe_key, { maxLength: 180 }),
    session_hash: normalizeAuditHash(body?.session_hash),
    ip_hash: normalizeAuditHash(body?.ip_hash),
    country_code: normalizeAuditCountry(body?.country_code),
    geo_source: normalizeAuditToken(body?.geo_source, { maxLength: 64 }) || null,
  };
}

function normalizeStyle(value: unknown) {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'outline' || normalized === 'solid') return normalized;
  return 'any';
}

function normalizeBoolean(value: unknown) {
  const normalized = String(value || '').trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'on' || normalized === 'yes';
}

function buildPublicSemanticPayload(publicRecord: Record<string, unknown>) {
  const recordPayload = publicRecord.record && typeof publicRecord.record === 'object' && !Array.isArray(publicRecord.record)
    ? (publicRecord.record as Record<string, unknown>)
    : {};
  const semantic: Record<string, unknown> = {};

  for (const field of PUBLIC_SEMANTIC_PROFILE_FIELDS) {
    const value = publicRecord[field] ?? recordPayload[field];
    if (Array.isArray(value)) {
      const clean = value.filter((item) => typeof item === 'string' && item.trim().length > 0);
      if (clean.length > 0) semantic[field] = clean;
      continue;
    }
    if (typeof value === 'string' && value.trim().length > 0) {
      semantic[field] = value.trim();
    }
  }

  return semantic;
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

function extractBearerToken(req: Request) {
  const authorization = req.headers.get('authorization') || '';
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

function isMissingAuditColumnError(error: unknown) {
  if (!error || typeof error !== 'object') return false;
  const code = 'code' in error ? String(error.code) : '';
  const message = 'message' in error ? String(error.message).toLowerCase() : '';
  return code === '42703' || (message.includes('column') && message.includes('does not exist'));
}

function emptySearchAuditAccount() {
  return {
    userId: null,
    isRegistered: false,
    accountPlan: null,
    subscriptionStatus: null,
    isPro: false,
  };
}

async function resolveSearchAuditAccountFromUserId(adminClient: any, userId: string) {
  const { data: subscription } = await adminClient
    .from('si_subscriptions')
    .select('status, plan')
    .eq('user_id', userId)
    .maybeSingle();

  const status = typeof subscription?.status === 'string' ? subscription.status : null;
  return {
    userId,
    isRegistered: true,
    accountPlan: typeof subscription?.plan === 'string' ? subscription.plan : null,
    subscriptionStatus: status,
    isPro: status === 'active',
  };
}

async function resolveSearchAuditAccountByApiKeyHash(adminClient: any, apiKeyHash: string | null) {
  if (!apiKeyHash) return emptySearchAuditAccount();

  const { data: apiKeyRow, error } = await adminClient
    .from('si_api_keys')
    .select('id, user_id')
    .eq('key_hash', apiKeyHash)
    .eq('revoked', false)
    .maybeSingle();

  if (error || !apiKeyRow?.user_id) return emptySearchAuditAccount();

  void adminClient
    .from('si_api_keys')
    .update({ last_used: new Date().toISOString() })
    .eq('id', apiKeyRow.id);

  return await resolveSearchAuditAccountFromUserId(adminClient, apiKeyRow.user_id);
}

async function resolveSearchAuditAccount(adminClient: any, req: Request, apiKeyHash: string | null = null) {
  const token = extractBearerToken(req);
  if (!token) {
    return await resolveSearchAuditAccountByApiKeyHash(adminClient, apiKeyHash);
  }

  try {
    const { data, error } = await adminClient.auth.getUser(token);
    const user = data?.user || null;
    if (error || !user?.id) {
      return await resolveSearchAuditAccountByApiKeyHash(adminClient, apiKeyHash);
    }

    return await resolveSearchAuditAccountFromUserId(adminClient, user.id);
  } catch {
    return await resolveSearchAuditAccountByApiKeyHash(adminClient, apiKeyHash);
  }
}

function stripEnrichedAuditColumns(payload: Record<string, unknown>) {
  const {
    country_code: _countryCode,
    geo_source: _geoSource,
    user_id: _userId,
    is_registered: _isRegistered,
    account_plan: _accountPlan,
    subscription_status: _subscriptionStatus,
    is_pro: _isPro,
    channel: _channel,
    environment: _environment,
    client_family: _clientFamily,
    tool_name: _toolName,
    locale: _locale,
    anonymous_client_hash: _anonymousClientHash,
    user_agent_hash: _userAgentHash,
    api_key_hash: _apiKeyHash,
    mcp_server_version: _mcpServerVersion,
    request_id: _requestId,
    dedupe_key: _dedupeKey,
    ...basePayload
  } = payload;
  return basePayload;
}

async function insertSearchAudit(adminClient: any, payload: Record<string, unknown>) {
  const { error } = await adminClient.from('search_request_audit').insert(payload);
  if (!error) return;
  if (!isMissingAuditColumnError(error)) throw error;

  const fallback = await adminClient
    .from('search_request_audit')
    .insert(stripEnrichedAuditColumns(payload));
  if (fallback.error) throw fallback.error;
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
  let adminClient: any = null;
  let queryNorm = '';
  let source = defaultSource;
  let library: string | null = null;
  let identity = {
    sessionHash: null as string | null,
    ipHash: null as string | null,
    countryCode: null as string | null,
    geoSource: null as string | null,
  };
  let account = {
    userId: null as string | null,
    isRegistered: false,
    accountPlan: null as string | null,
    subscriptionStatus: null as string | null,
    isPro: false,
  };
  let auditContext = {
    channel: channelFromSource(defaultSource) || 'unknown',
    environment: environmentFromSource(defaultSource) || 'production',
    client_family: 'unknown',
    tool_name: null as string | null,
    locale: null as string | null,
    anonymous_client_hash: null as string | null,
    user_agent_hash: null as string | null,
    api_key_hash: null as string | null,
    mcp_server_version: null as string | null,
    request_id: null as string | null,
    dedupe_key: null as string | null,
    session_hash: null as string | null,
    ip_hash: null as string | null,
    country_code: null as string | null,
    geo_source: null as string | null,
  };

  try {
    const body = await req.json().catch(() => ({}));
    queryNorm = normalizeQuery(body?.query);
    library = normalizeLibrary(body?.library);
    source = normalizeSource(body?.source, defaultSource);
    auditContext = buildSearchAuditContext(body as Record<string, unknown>, source);
    const style = normalizeStyle(body?.style);
    const limit = Math.max(1, Math.min(50, Number(body?.limit || 20)));
    const includeQueryFrame = normalizeBoolean(body?.include_query_frame);
    const queryFrame = includeQueryFrame
      ? buildSearchQueryFrame(queryNorm, { locale: body?.locale || null })
      : null;

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
    account = await resolveSearchAuditAccount(adminClient, req, auditContext.api_key_hash);

    const intentProfile = buildSearchIntentProfile(queryNorm);
    const queryVariants = buildSearchRankingQueryVariants(
      queryNorm,
      buildIntentQueryVariants(queryNorm, { maxVariants: 10 }),
      { maxVariants: 14 },
    );
    const candidateBatches = await Promise.all(
      queryVariants.map((variant, index) =>
        adminClient.rpc('si_search_icon_candidates', {
          p_query: variant,
          p_library: library,
          p_limit: Math.max(limit * 3, 40),
        }).then((result: any) => ({ ...result, variant, index }))
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
        .select('icon_id, source_library, source_name, label, purpose, category, depicts, semantic_tags, synonyms, use_when, avoid_when, record')
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
      return {
        ...row,
        semantic: buildPublicSemanticPayload(publicRecord),
      };
    });

    await insertSearchAudit(adminClient, {
      query_norm: queryNorm,
      source,
      library_filter: library,
      result_count: results.length,
      status: 'ok',
      latency_ms: Date.now() - startedAt,
      ...auditContext,
      session_hash: auditContext.session_hash || identity.sessionHash,
      ip_hash: auditContext.ip_hash || identity.ipHash,
      country_code: auditContext.country_code || identity.countryCode,
      geo_source: auditContext.geo_source || identity.geoSource,
      user_id: account.userId,
      is_registered: account.isRegistered,
      account_plan: account.accountPlan,
      subscription_status: account.subscriptionStatus,
      is_pro: account.isPro,
    });

    return buildJsonResponse({
      query: queryNorm,
      results,
      engine_version: ENGINE_VERSION,
      query_expansion: {
        variants: queryVariants,
        expanded: queryVariants.length > 1,
        ...(queryFrame ? { query_frame: queryFrame } : {}),
      },
      railway_promotion_triggers: RAILWAY_PROMOTION_TRIGGERS,
    });
  } catch (error) {
    if (adminClient && queryNorm) {
      try {
        await insertSearchAudit(adminClient, {
          query_norm: queryNorm,
          source,
          library_filter: library,
          result_count: 0,
          status: 'error',
          latency_ms: Date.now() - startedAt,
          ...auditContext,
          session_hash: auditContext.session_hash || identity.sessionHash,
          ip_hash: auditContext.ip_hash || identity.ipHash,
          country_code: auditContext.country_code || identity.countryCode,
          geo_source: auditContext.geo_source || identity.geoSource,
          user_id: account.userId,
          is_registered: account.isRegistered,
          account_plan: account.accountPlan,
          subscription_status: account.subscriptionStatus,
          is_pro: account.isPro,
        });
      } catch {
        // Ignore secondary audit failures while returning the primary error.
      }
    }

    return buildErrorResponse(error);
  }
}
