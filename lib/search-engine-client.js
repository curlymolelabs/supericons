const DEFAULT_SUPABASE_URL = 'https://kcjmkakdhsqplvasgkjv.supabase.co';
const DEFAULT_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_slbcWcnrQ45rkJPONFD7pw_hW0WpvBi';

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
  return `${getSupabaseUrl().replace(/\/+$/, '')}/functions/v1/search-icons`;
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

function buildHostedSearchHeaders() {
  const configuredKey = getHostedSearchKey();
  const isJwt = looksLikeJwt(configuredKey);
  const requiresJwt = shouldRequireJwt();

  if (!configuredKey) {
    throw new Error('hosted search anon key is missing; configure VITE_SUPERICONS_SEARCH_ENGINE_ANON_KEY or VITE_SUPABASE_ANON_KEY');
  }

  if (requiresJwt && !isJwt) {
    throw new Error('hosted search requires a legacy Supabase anon JWT; publishable keys are not valid bearer tokens');
  }

  const key = configuredKey || DEFAULT_SUPABASE_PUBLISHABLE_KEY;
  const headers = {
    'Content-Type': 'application/json',
    apikey: key,
  };

  if (isJwt) {
    headers.Authorization = `Bearer ${key}`;
  }

  return headers;
}

export async function searchIconsHosted({
  query,
  library = null,
  limit = 20,
  source = 'web',
}) {
  const response = await fetch(getHostedSearchUrl(), {
    method: 'POST',
    headers: buildHostedSearchHeaders(),
    body: JSON.stringify({
      query,
      library,
      limit,
      source,
    }),
  });

  if (!response.ok) {
    throw new Error(`hosted search failed (${response.status})`);
  }

  return response.json();
}
