import { SUPABASE_ANON, SUPABASE_URL } from './auth.js';

function looksLikeJwt(value) {
  return /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(String(value || '').trim());
}

function shouldRequireJwt() {
  const raw = String(process.env.SUPERICONS_SEARCH_ENGINE_REQUIRE_JWT || '').trim().toLowerCase();
  return raw !== '0' && raw !== 'false' && raw !== 'off';
}

export async function searchIconsHostedMcp({
  query,
  library = null,
  limit = 20,
}) {
  const baseUrl = (
    process.env.SUPERICONS_SEARCH_ENGINE_URL
    || `${SUPABASE_URL}/functions/v1/search-icons`
  ).replace(/\/+$/, '');
  const anonKey = process.env.SUPERICONS_SEARCH_ENGINE_ANON_KEY || process.env.SUPABASE_ANON_KEY || SUPABASE_ANON;
  const isJwt = looksLikeJwt(anonKey);

  if (shouldRequireJwt() && !isJwt) {
    throw new Error('hosted MCP search requires a legacy Supabase anon JWT; publishable keys are not valid bearer tokens');
  }

  const headers = {
    'Content-Type': 'application/json',
    apikey: anonKey,
  };

  if (isJwt) {
    headers.Authorization = `Bearer ${anonKey}`;
  }

  const response = await fetch(baseUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      query,
      library,
      limit,
      source: 'mcp',
    }),
  });

  if (!response.ok) {
    throw new Error(`hosted MCP search failed (${response.status})`);
  }

  return response.json();
}
