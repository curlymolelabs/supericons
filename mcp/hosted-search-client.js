import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { getConfiguredApiKey, SUPABASE_ANON, SUPABASE_URL } from './auth.js';
import {
  expandCjkQuery,
  normalizeCjkSearchText,
} from './runtime/cjk-search-core.js';

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

function getPublicGatewayUrl() {
  return (
    process.env.SUPERICONS_MCP_SEARCH_URL
    || `${SUPABASE_URL}/functions/v1/mcp-search`
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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getRetryDelayMs(response, attempt) {
  const retryAfter = Number(response.headers.get('retry-after'));
  if (Number.isFinite(retryAfter) && retryAfter > 0) {
    return Math.min(retryAfter * 1000, 5000);
  }
  return Math.min(500 * 2 ** attempt, 2500);
}

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

async function postHostedSearch(url, headers, body) {
  let lastStatus = 0;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (response.ok) {
      return response.json();
    }

    lastStatus = response.status;
    if (response.status !== 429 && response.status < 500) break;
    await sleep(getRetryDelayMs(response, attempt));
  }

  throw new Error(`hosted MCP search failed (${lastStatus})`);
}

async function postPublicSearch(url, headers, body) {
  let lastStatus = 0;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (response.ok) {
      return response.json();
    }

    lastStatus = response.status;
    if (response.status !== 429 && response.status < 500) break;
    await sleep(getRetryDelayMs(response, attempt));
  }

  throw new Error(`public MCP search failed (${lastStatus})`);
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

export async function searchIconsHostedMcp({
  query,
  library = null,
  limit = 20,
  style = 'any',
  locale = null,
}) {
  const apiKey = getConfiguredApiKey();

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
      limit,
      style,
      locale,
      source: 'mcp',
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

  const headers = {
    'Content-Type': 'application/json',
  };

  if (apiKey) {
    headers['x-supericons-api-key'] = apiKey;
  }

  const url = getPublicGatewayUrl();
  const body = {
    query,
    library,
    limit,
    style,
    locale,
    source: 'mcp',
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
