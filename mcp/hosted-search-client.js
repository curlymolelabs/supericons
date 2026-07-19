import { existsSync, readFileSync } from 'node:fs';
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
  getBetaCohortForRequest,
  getHostedSearchFunctionNameForTool,
} from './release-channel.js';
import { hostedSearchResilience } from './hosted-search-resilience.js';

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
}) {
  return hostedSearchResilience.execute(async () => {
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

    if (response.ok) return response.json();

    const payload = await response.json().catch(() => null);
    const error = new Error(payload?.message || `${failureLabel} failed (${response.status})`);
    error.code = payload?.error || failureCode;
    error.status = response.status;
    error.retryable = Boolean(payload?.retryable) || response.status === 429 || response.status >= 500;
    error.hosted_search_dependency_failure = response.status >= 500;
    const retryAfter = Number(response.headers.get('retry-after'));
    if (Number.isFinite(retryAfter) && retryAfter > 0) {
      error.retry_after_seconds = Math.min(retryAfter, 30);
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

export function getHostedSearchResilienceStatus() {
  return hostedSearchResilience.getStatus();
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

export async function searchIconQueriesHostedMcp({ queries }) {
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
    url = getDirectHostedSearchUrl();
    postSearch = postHostedSearch;
    publicKey = process.env.SUPERICONS_SEARCH_ENGINE_ANON_KEY || process.env.SUPABASE_ANON_KEY || SUPABASE_ANON;
    if (shouldRequireJwt() && !looksLikeJwt(publicKey)) {
      throw new Error('hosted MCP search requires a legacy Supabase anon JWT; publishable keys are not valid bearer tokens');
    }
  } else {
    url = getPublicGatewayUrl(routeToolName);
    postSearch = postPublicSearch;
    publicKey = getPublicGatewayAnonKey();
  }

  const headers = { 'Content-Type': 'application/json' };
  if (publicKey) headers.apikey = publicKey;
  if (apiKey) headers['x-supericons-api-key'] = apiKey;
  if (looksLikeJwt(publicKey)) headers.Authorization = `Bearer ${publicKey}`;

  const payload = await postSearch(url, headers, { queries: groupedQueries });
  if (!Array.isArray(payload?.responses) || payload.responses.length !== groupedQueries.length) {
    throw new Error('grouped hosted search returned an invalid response');
  }

  return payload.responses.map((entry, index) => {
    if (entry?.index !== index || !Number.isInteger(entry?.status)) {
      throw new Error('grouped hosted search returned responses out of order');
    }
    return entry.status >= 200 && entry.status < 300 && entry.body && typeof entry.body === 'object'
      ? entry.body
      : { results: [], grouped_status: entry.status };
  });
}
