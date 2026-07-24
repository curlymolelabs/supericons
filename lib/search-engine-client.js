import { getSupabase } from '../auth.js';

const DEFAULT_SUPABASE_URL = 'https://kcjmkakdhsqplvasgkjv.supabase.co';
const DEFAULT_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_slbcWcnrQ45rkJPONFD7pw_hW0WpvBi';
const DEFAULT_SEARCH_ENGINE_URL = 'https://mcp.supericons.dev/search-icons';
const DEFAULT_WEB_SEARCH_TELEMETRY_FUNCTION = 'web-search-telemetry';

function looksLikeJwt(value) {
  return /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(String(value || '').trim());
}

function readViteEnv(name) {
  if (typeof import.meta === 'undefined' || !import.meta.env) return '';
  return String(import.meta.env[name] || '').trim();
}

function readNodeEnv(name) {
  if (typeof process === 'undefined' || !process.env) return '';
  return String(process.env[name] || '').trim();
}

function readWindowConfig(name) {
  if (typeof window === 'undefined') return '';
  return String(window[name] || '').trim();
}

function readBoolean(value, fallback) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return fallback;
  if (normalized === '0' || normalized === 'false' || normalized === 'off' || normalized === 'no') return false;
  if (normalized === '1' || normalized === 'true' || normalized === 'on' || normalized === 'yes') return true;
  return fallback;
}

function getSupabaseUrl() {
  const override = readWindowConfig('__SUPERICONS_SUPABASE_URL__');
  if (override) return override;
  return readViteEnv('VITE_SUPABASE_URL')
    || readNodeEnv('SUPABASE_URL')
    || DEFAULT_SUPABASE_URL;
}

function getHostedSearchUrl() {
  const override = readWindowConfig('__SUPERICONS_SEARCH_ENGINE_URL__');
  if (override) return String(override).replace(/\/+$/, '');
  const fromVite = readViteEnv('VITE_SUPERICONS_SEARCH_ENGINE_URL');
  if (fromVite) return String(fromVite).replace(/\/+$/, '');
  return DEFAULT_SEARCH_ENGINE_URL;
}

function getWebSearchTelemetryUrl() {
  const override = readWindowConfig('__SUPERICONS_WEB_SEARCH_TELEMETRY_URL__');
  if (override) return String(override).replace(/\/+$/, '');
  const fromVite = readViteEnv('VITE_SUPERICONS_WEB_SEARCH_TELEMETRY_URL');
  if (fromVite) return String(fromVite).replace(/\/+$/, '');
  return `${getSupabaseUrl().replace(/\/+$/, '')}/functions/v1/${DEFAULT_WEB_SEARCH_TELEMETRY_FUNCTION}`;
}

function isSupabaseSearchUrl(value) {
  try {
    return new URL(value).hostname.endsWith('.supabase.co');
  } catch {
    return false;
  }
}

function shouldRequireJwt() {
  const fromWindow = readWindowConfig('__SUPERICONS_SEARCH_ENGINE_REQUIRE_JWT__');
  if (fromWindow) return readBoolean(fromWindow, true);
  const fromVite = readViteEnv('VITE_SUPERICONS_SEARCH_ENGINE_REQUIRE_JWT');
  if (fromVite) return readBoolean(fromVite, true);
  const fromNode = readNodeEnv('SUPERICONS_SEARCH_ENGINE_REQUIRE_JWT');
  if (fromNode) return readBoolean(fromNode, true);
  return true;
}

function getHostedSearchKey() {
  return readWindowConfig('__SUPERICONS_SEARCH_ENGINE_ANON_KEY__')
    || readViteEnv('VITE_SUPERICONS_SEARCH_ENGINE_ANON_KEY')
    || readViteEnv('VITE_SUPABASE_ANON_KEY')
    || readNodeEnv('SUPERICONS_SEARCH_ENGINE_ANON_KEY')
    || readNodeEnv('SUPABASE_ANON_KEY')
    || '';
}

async function getSignedInAccessToken() {
  try {
    const supabase = getSupabase();
    if (!supabase?.auth?.getSession) return '';
    const { data } = await supabase.auth.getSession();
    return data?.session?.access_token || '';
  } catch {
    return '';
  }
}

async function buildHostedSearchHeaders(searchUrl) {
  if (!isSupabaseSearchUrl(searchUrl)) {
    return { 'Content-Type': 'application/json' };
  }

  const configuredKey = getHostedSearchKey();
  const isJwt = looksLikeJwt(configuredKey);
  const requiresJwt = shouldRequireJwt();
  const signedInAccessToken = await getSignedInAccessToken();
  const authorizationToken = signedInAccessToken || (isJwt ? configuredKey : '');

  if (!configuredKey) {
    throw new Error('hosted search anon key is missing; configure VITE_SUPERICONS_SEARCH_ENGINE_ANON_KEY or VITE_SUPABASE_ANON_KEY');
  }

  if (requiresJwt && !authorizationToken) {
    throw new Error('hosted search requires a legacy Supabase anon JWT; publishable keys are not valid bearer tokens');
  }

  const key = configuredKey || DEFAULT_SUPABASE_PUBLISHABLE_KEY;
  const headers = {
    'Content-Type': 'application/json',
    apikey: key,
  };

  if (authorizationToken) {
    headers.Authorization = `Bearer ${authorizationToken}`;
  }

  return headers;
}

export async function searchIconsHosted({
  query,
  library = null,
  libraryMode = null,
  style = 'any',
  limit = 20,
  locale = null,
  source = 'web',
  includeQueryFrame = false,
  episodeId = null,
}) {
  const searchUrl = getHostedSearchUrl();
  const response = await fetch(searchUrl, {
    method: 'POST',
    headers: await buildHostedSearchHeaders(searchUrl),
    body: JSON.stringify({
      query,
      library,
      library_mode: libraryMode,
      style,
      limit,
      locale,
      source,
      ...(episodeId ? { id: episodeId, episode_id: episodeId } : {}),
      ...(includeQueryFrame ? { include_query_frame: true } : {}),
    }),
  });

  if (!response.ok) {
    throw new Error(`hosted search failed (${response.status})`);
  }

  return response.json();
}

export async function logWebSearchTelemetry(payload) {
  try {
    const key = getHostedSearchKey() || DEFAULT_SUPABASE_PUBLISHABLE_KEY;
    const signedInAccessToken = await getSignedInAccessToken();
    const headers = {
      'Content-Type': 'application/json',
      apikey: key,
    };
    if (signedInAccessToken) {
      headers.Authorization = `Bearer ${signedInAccessToken}`;
    }
    const response = await fetch(getWebSearchTelemetryUrl(), {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      keepalive: true,
    });
    return response.ok;
  } catch {
    return false;
  }
}
