import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { getConfiguredApiKey, SUPABASE_ANON, SUPABASE_URL } from './auth.js';
import {
  expandCjkQuery,
  normalizeCjkSearchText,
} from './runtime/cjk-search-core.js';
import {
  DETERMINISTIC_BETA_COHORT,
  GROUPED_HOSTED_SEARCH_FUNCTION,
  getBetaCohortForRequest,
  getHostedSearchFunctionNameForTool,
} from './release-channel.js';
import {
  createHostedSearchResilience,
  hostedSearchResilience,
} from './hosted-search-resilience.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const cjkTermsPath = join(__dirname, 'public', 'cjk-search-terms.json');
const multilingualAliasesPath = join(__dirname, 'public', 'multilingual-search-aliases.json');
const cjkSearchTerms = existsSync(cjkTermsPath)
  ? JSON.parse(readFileSync(cjkTermsPath, 'utf8')).terms || []
  : [];
const multilingualSearchAliases = existsSync(multilingualAliasesPath)
  ? JSON.parse(readFileSync(multilingualAliasesPath, 'utf8')).aliases || []
  : [];
const multilingualExpansionTerms = [...cjkSearchTerms, ...multilingualSearchAliases];
const packageMetadata = JSON.parse(readFileSync(join(__dirname, 'package.json'), 'utf8'));
const mcpPackageVersion = String(packageMetadata.version || '');

function normalizeUsageToken(value, { maxLength = 80 } = {}) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, maxLength);
}

function normalizeUsageText(value, { maxLength = 120 } = {}) {
  const text = String(value || '').trim();
  return text ? text.slice(0, maxLength) : null;
}

function normalizeUsageHash(value) {
  const text = String(value || '').trim().toLowerCase();
  return /^[a-f0-9]{16,128}$/.test(text) ? text : null;
}

function normalizeUsageCountry(value) {
  const text = String(value || '').trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(text)) return null;
  if (['XX', 'ZZ', 'T1'].includes(text)) return null;
  return text;
}

function hashSecret(value) {
  const text = String(value || '').trim();
  return text ? createHash('sha256').update(text).digest('hex') : null;
}

function buildUsagePayload(
  usageContext = {},
  {
    apiKeyHash = null,
    routeToolName = null,
    routeLocale = null,
    routeQuery = '',
  } = {},
) {
  const context = usageContext && typeof usageContext === 'object' ? usageContext : {};
  const toolName = normalizeUsageToken(routeToolName || context.tool_name, { maxLength: 64 }) || 'search_icons';
  const explicitBetaCohort = normalizeUsageToken(context.beta_cohort, { maxLength: 80 });
  const requestBetaCohort = getBetaCohortForRequest(mcpPackageVersion, toolName, {
    locale: routeLocale,
    query: routeQuery,
  });
  const payload = {
    source: normalizeUsageToken(context.source, { maxLength: 40 }) || 'mcp',
    channel: normalizeUsageToken(context.channel, { maxLength: 40 }) || 'local_mcp',
    environment: normalizeUsageToken(context.environment, { maxLength: 40 }) || 'local',
    client_family: normalizeUsageToken(context.client_family, { maxLength: 64 }) || 'mcp_stdio',
    tool_name: toolName,
    request_id: normalizeUsageText(context.request_id, { maxLength: 120 }),
    dedupe_key: normalizeUsageText(context.dedupe_key, { maxLength: 180 }),
    session_hash: normalizeUsageHash(context.session_hash),
    ip_hash: normalizeUsageHash(context.ip_hash),
    country_code: normalizeUsageCountry(context.country_code),
    geo_source: normalizeUsageToken(context.geo_source, { maxLength: 64 }),
    anonymous_client_hash: normalizeUsageHash(context.anonymous_client_hash),
    user_agent_hash: normalizeUsageHash(context.user_agent_hash),
    api_key_hash: normalizeUsageHash(context.api_key_hash) || apiKeyHash,
    mcp_server_version: normalizeUsageText(context.mcp_server_version, { maxLength: 40 }),
    beta_cohort: explicitBetaCohort === DETERMINISTIC_BETA_COHORT
      ? requestBetaCohort
      : explicitBetaCohort || requestBetaCohort,
  };

  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== null && value !== undefined && value !== '')
  );
}

function looksLikeJwt(value) {
  return /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(String(value || '').trim());
}

function shouldRequireJwt() {
  const raw = String(process.env.SUPERICONS_SEARCH_ENGINE_REQUIRE_JWT || '').trim().toLowerCase();
  return raw !== '0' && raw !== 'false' && raw !== 'off';
}

function shouldUseInternalHostedDebug() {
  const raw = String(process.env.SUPERICONS_INTERNAL_HOSTED_DEBUG || '').trim().toLowerCase();
  return raw === '1' || raw === 'true' || raw === 'on';
}

function getPublicGatewayUrl(toolName = 'search_icons') {
  return (
    process.env.SUPERICONS_MCP_SEARCH_URL
    || `${SUPABASE_URL}/functions/v1/${getHostedSearchFunctionNameForTool(mcpPackageVersion, toolName)}`
  ).replace(/\/+$/, '');
}

function getGroupedPublicGatewayUrl() {
  return (
    process.env.SUPERICONS_MCP_GROUPED_SEARCH_URL
    || `${SUPABASE_URL}/functions/v1/${GROUPED_HOSTED_SEARCH_FUNCTION}`
  ).replace(/\/+$/, '');
}

function getDirectHostedSearchUrl() {
  return (
    process.env.SUPERICONS_SEARCH_ENGINE_URL
    || `${SUPABASE_URL}/functions/v1/search-icons`
  ).replace(/\/+$/, '');
}

function hasSearchResults(payload) {
  return Array.isArray(payload?.results) && payload.results.length > 0;
}

const HOSTED_SEARCH_REQUEST_TIMEOUT_MS = 20_000;
const groupedHostedSearchResilience = createHostedSearchResilience();

function buildLocalizedRetryQueries(query, locale) {
  if (!locale || multilingualExpansionTerms.length === 0) return [];

  const expanded = expandCjkQuery(query, {
    locale,
    terms: multilingualExpansionTerms,
  });
  const original = normalizeCjkSearchText(query);
  const seen = new Set([original]);
  const retryQueries = [];

  for (const variant of expanded.variants || []) {
    const normalized = normalizeCjkSearchText(variant);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    retryQueries.push(normalized);
  }

  return retryQueries.slice(0, 8);
}

async function postSearchRequest(url, headers, body, {
  failureLabel,
  failureCode,
  resilience = hostedSearchResilience,
}) {
  return resilience.execute(async () => {
    let response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(HOSTED_SEARCH_REQUEST_TIMEOUT_MS),
      });
    } catch (cause) {
      const error = new Error(`${failureLabel} dependency did not respond in time.`, { cause });
      error.code = 'hosted_search_timeout';
      error.status = 503;
      error.retryable = true;
      error.hosted_search_dependency_failure = true;
      throw error;
    }

    if (response.ok) {
      try {
        return await response.json();
      } catch (cause) {
        const error = new Error(`${failureLabel} returned an invalid JSON response.`, { cause });
        error.code = failureCode;
        error.status = 502;
        error.retryable = true;
        error.hosted_search_dependency_failure = true;
        throw error;
      }
    }

    const payload = await response.json().catch(() => null);
    const error = new Error(payload?.message || `${failureLabel} failed (${response.status})`);
    error.code = payload?.error || failureCode;
    error.status = response.status;
    error.retryable = Boolean(payload?.retryable) || response.status === 429 || response.status >= 500;
    error.hosted_search_dependency_failure = response.status >= 500;
    const retryAfter = Number(response.headers.get('retry-after'));
    if (Number.isFinite(retryAfter) && retryAfter > 0) {
      // Burst 429s retry within seconds; a daily allowance may not reset for
      // hours, so its reset time must never be clamped down to 30 seconds.
      error.retry_after_seconds = payload?.limit_scope === 'daily_allowance'
        || payload?.details?.limit_scope === 'daily_allowance'
        ? retryAfter
        : Math.min(retryAfter, 30);
    }
    // Daily-allowance 429s carry tier, daily_limit, and resets_at_utc so
    // clients can tell users exactly when the allowance returns. Older
    // gateways spread these at the top level instead of a details object.
    if (payload?.details && typeof payload.details === 'object') {
      error.details = payload.details;
    } else if (payload?.limit_scope || payload?.resets_at_utc) {
      const { limit_scope, tier, daily_limit, resets_at_utc, retry_after_seconds } = payload;
      error.details = { limit_scope, tier, daily_limit, resets_at_utc, retry_after_seconds };
    }
    throw error;
  });
}

async function postHostedSearch(url, headers, body) {
  return postSearchRequest(url, headers, body, {
    failureLabel: 'hosted MCP search',
    failureCode: 'hosted_search_failed',
  });
}

async function postPublicSearch(url, headers, body) {
  return postSearchRequest(url, headers, body, {
    failureLabel: 'public MCP search',
    failureCode: 'public_search_failed',
  });
}

async function postGroupedHostedSearch(url, headers, body) {
  return postSearchRequest(url, headers, body, {
    failureLabel: 'grouped hosted MCP search',
    failureCode: 'grouped_hosted_search_failed',
    resilience: groupedHostedSearchResilience,
  });
}

async function postGroupedPublicSearch(url, headers, body) {
  return postSearchRequest(url, headers, body, {
    failureLabel: 'grouped public MCP search',
    failureCode: 'grouped_public_search_failed',
    resilience: groupedHostedSearchResilience,
  });
}

export function getHostedSearchResilienceStatus() {
  return hostedSearchResilience.getStatus();
}

export function getGroupedHostedSearchResilienceStatus() {
  return groupedHostedSearchResilience.getStatus();
}

async function retryLocalizedHostedSearch({ postSearch, url, headers, body, locale }) {
  const retryQueries = buildLocalizedRetryQueries(body.query, locale);

  for (const retryQuery of retryQueries) {
    const retryPayload = await postSearch(url, headers, {
      ...body,
      query: retryQuery,
      locale: null,
      localized_query: body.query,
      localized_locale: locale,
    });
    if (hasSearchResults(retryPayload)) return retryPayload;
  }

  return null;
}

function getPublicGatewayAnonKey() {
  return (
    process.env.SUPERICONS_MCP_SEARCH_ANON_KEY
    || process.env.SUPERICONS_SEARCH_ENGINE_ANON_KEY
    || process.env.SUPABASE_ANON_KEY
    || process.env.SUPERICONS_SUPABASE_ANON
    || ''
  );
}

export async function searchIconsHostedMcp({
  query,
  library = null,
  libraryMode = 'strict',
  limit = 20,
  style = 'any',
  locale = null,
  includeQueryFrame = false,
  usageContext = null,
  routeToolName = null,
}) {
  const apiKey = getConfiguredApiKey();
  const usagePayload = buildUsagePayload(usageContext, {
    apiKeyHash: apiKey ? hashSecret(apiKey) : null,
    routeToolName,
    routeLocale: locale,
    routeQuery: query,
  });

  if (shouldUseInternalHostedDebug()) {
    const baseUrl = getDirectHostedSearchUrl();
    const anonKey = process.env.SUPERICONS_SEARCH_ENGINE_ANON_KEY || process.env.SUPABASE_ANON_KEY || SUPABASE_ANON;
    const isJwt = looksLikeJwt(anonKey);

    if (shouldRequireJwt() && !isJwt) {
      throw new Error('hosted MCP search requires a legacy Supabase anon JWT; publishable keys are not valid bearer tokens');
    }

    const headers = {
      'Content-Type': 'application/json',
      apikey: anonKey,
    };

    if (apiKey) {
      headers['x-supericons-api-key'] = apiKey;
    }

    if (isJwt) {
      headers.Authorization = `Bearer ${anonKey}`;
    }

    const body = {
      query,
      library,
      library_mode: libraryMode,
      limit,
      style,
      locale,
      ...usagePayload,
      ...(includeQueryFrame ? { include_query_frame: true } : {}),
    };
    const payload = await postHostedSearch(baseUrl, headers, body);
    if (hasSearchResults(payload) || !locale) return payload;

    return await retryLocalizedHostedSearch({
      postSearch: postHostedSearch,
      url: baseUrl,
      headers,
      body,
      locale,
    }) || payload;
  }

  const publicAnonKey = getPublicGatewayAnonKey();
  const headers = {
    'Content-Type': 'application/json',
  };

  if (publicAnonKey) {
    headers.apikey = publicAnonKey;
  }

  if (apiKey) {
    headers['x-supericons-api-key'] = apiKey;
  }
  if (looksLikeJwt(publicAnonKey)) {
    headers.Authorization = `Bearer ${publicAnonKey}`;
  }

  const url = getPublicGatewayUrl(usagePayload.tool_name);
  const body = {
    query,
    library,
    library_mode: libraryMode,
    limit,
    style,
    locale,
    ...usagePayload,
    ...(includeQueryFrame ? { include_query_frame: true } : {}),
  };
  const payload = await postPublicSearch(url, headers, body);
  if (hasSearchResults(payload) || !locale) return payload;

  return await retryLocalizedHostedSearch({
    postSearch: postPublicSearch,
    url,
    headers,
    body,
    locale,
  }) || payload;
}

function shouldRetryGroupedSearchIndividually(error) {
  const status = Number(error?.status);
  const code = String(error?.code || '');
  if ([404, 405, 501, 502, 503, 504].includes(status)) return true;
  return [
    'grouped_hosted_search_invalid_response',
    'grouped_hosted_search_failed',
    'grouped_search_temporarily_unavailable',
    'hosted_search_timeout',
    'public_search_failed',
  ].includes(code);
}

async function searchIconQueriesIndividually(queries) {
  const responses = [];
  for (const query of queries) {
    responses.push(await searchIconsHostedMcp(query));
  }
  return responses;
}

function shouldUseGroupedHostedSearch() {
  if (String(process.env.SUPERICONS_MCP_GROUPED_SEARCH_URL || '').trim()) return true;
  if (shouldUseInternalHostedDebug()) return false;
  return !String(process.env.SUPERICONS_MCP_SEARCH_URL || '').trim();
}

function appendGroupedMeasurementRecord(payload, logicalQueryCount) {
  const outputPath = String(process.env.SUPERICONS_MCP_GROUPED_TIMING_OUTPUT || '').trim();
  if (!outputPath) return;

  const timing = payload?.measurement_timing;
  const validWorkerState = ['first_request', 'reused_worker'].includes(timing?.worker_state);
  const validTiming = (
    timing?.schema_version === 2
    && timing?.event === 'search_stage_timing'
    && validWorkerState
    && Number.isInteger(timing?.worker_request_ordinal)
    && timing.worker_request_ordinal > 0
    && Number.isFinite(timing?.module_age_ms_at_handler_entry)
    && Number.isFinite(timing?.total_ms)
    && Number.isFinite(timing?.stages_ms?.candidate_search)
    && Number.isFinite(timing?.stages_ms?.audit_write)
  );
  if (!validTiming) {
    const error = new Error('Grouped hosted search returned no usable worker timing record.');
    error.code = 'grouped_measurement_timing_missing';
    error.retryable = false;
    throw error;
  }

  appendFileSync(outputPath, `${JSON.stringify({
    schema_version: 1,
    logical_query_count: logicalQueryCount,
    measurement_timing: timing,
  })}\n`, 'utf8');
}

async function searchIconQueriesGrouped(queries) {
  if (!Array.isArray(queries) || queries.length < 1 || queries.length > 96) {
    throw new Error('grouped hosted search requires between 1 and 96 queries');
  }

  const apiKey = getConfiguredApiKey();
  const apiKeyHash = apiKey ? hashSecret(apiKey) : null;
  const routeToolNames = new Set();
  const groupedQueries = queries.map((entry, index) => {
    const {
      libraryMode = 'strict',
      includeQueryFrame = false,
      usageContext = null,
      routeToolName = null,
      ...searchFields
    } = entry || {};
    const usagePayload = buildUsagePayload(usageContext, { apiKeyHash, routeToolName });
    routeToolNames.add(usagePayload.tool_name);
    const baseDedupeKey = usagePayload.dedupe_key;
    return {
      ...searchFields,
      library_mode: libraryMode,
      ...usagePayload,
      ...(baseDedupeKey ? { dedupe_key: `${baseDedupeKey}:${index}`.slice(0, 180) } : {}),
      ...(includeQueryFrame ? { include_query_frame: true } : {}),
    };
  });
  if (routeToolNames.size !== 1) {
    throw new Error('grouped hosted search requires one tool route per request');
  }
  const [routeToolName] = routeToolNames;

  let url;
  let postSearch;
  let publicKey;
  if (shouldUseInternalHostedDebug()) {
    url = getGroupedPublicGatewayUrl();
    postSearch = postGroupedHostedSearch;
    publicKey = process.env.SUPERICONS_SEARCH_ENGINE_ANON_KEY || process.env.SUPABASE_ANON_KEY || SUPABASE_ANON;
    if (shouldRequireJwt() && !looksLikeJwt(publicKey)) {
      throw new Error('hosted MCP search requires a legacy Supabase anon JWT; publishable keys are not valid bearer tokens');
    }
  } else {
    url = getGroupedPublicGatewayUrl();
    postSearch = postGroupedPublicSearch;
    publicKey = getPublicGatewayAnonKey();
  }

  const headers = { 'Content-Type': 'application/json' };
  if (publicKey) headers.apikey = publicKey;
  if (apiKey) headers['x-supericons-api-key'] = apiKey;
  if (looksLikeJwt(publicKey)) headers.Authorization = `Bearer ${publicKey}`;

  const payload = await postSearch(url, headers, {
    queries: groupedQueries,
    ...(routeToolName === 'recommend_icons' ? { candidate_only: true } : {}),
  });
  if (!Array.isArray(payload?.responses) || payload.responses.length !== groupedQueries.length) {
    const error = new Error('Grouped hosted search returned an invalid response.');
    error.code = 'grouped_hosted_search_invalid_response';
    error.status = 502;
    error.retryable = true;
    throw error;
  }
  appendGroupedMeasurementRecord(payload, groupedQueries.length);

  const responses = payload.responses.map((entry, index) => {
    if (entry?.index !== index || !Number.isInteger(entry?.status)) {
      const error = new Error('Grouped hosted search returned responses out of order.');
      error.code = 'grouped_hosted_search_invalid_response';
      error.status = 502;
      error.retryable = true;
      throw error;
    }
    if (
      entry.status >= 200
      && entry.status < 300
      && entry.body
      && typeof entry.body === 'object'
      && !Array.isArray(entry.body)
      && Array.isArray(entry.body.results)
      && !entry.body.error
      && !entry.body.code
    ) {
      return entry.body;
    }

    const body = entry?.body && typeof entry.body === 'object' ? entry.body : {};
    if (entry.status >= 200 && entry.status < 300) {
      const error = new Error(`Grouped hosted search returned an invalid result for query ${index + 1}.`);
      error.code = 'grouped_hosted_search_invalid_response';
      error.status = 502;
      error.retryable = true;
      throw error;
    }
    const error = new Error(
      body.message || body.error || `Grouped hosted search failed for query ${index + 1}.`,
    );
    error.code = body.code || body.error || 'grouped_hosted_search_failed';
    error.status = entry.status;
    error.retryable = typeof body.retryable === 'boolean'
      ? body.retryable
      : entry.status === 429 || entry.status >= 500;
    if (typeof body.hint === 'string') error.hint = body.hint;
    if (body.details && typeof body.details === 'object') error.details = body.details;
    const retryAfterSeconds = Number(body.retry_after_seconds || body.details?.retry_after_seconds);
    if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
      error.retry_after_seconds = retryAfterSeconds;
    }
    throw error;
  });

  return responses;
}

export async function searchIconQueriesHostedMcp({ queries }) {
  if (!shouldUseGroupedHostedSearch()) {
    return await searchIconQueriesIndividually(queries);
  }
  try {
    return await searchIconQueriesGrouped(queries);
  } catch (error) {
    if (!shouldRetryGroupedSearchIndividually(error)) throw error;
    return await searchIconQueriesIndividually(queries);
  }
}
