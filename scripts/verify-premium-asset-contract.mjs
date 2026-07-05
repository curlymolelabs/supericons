const DEFAULT_ASSET_URL = 'https://kcjmkakdhsqplvasgkjv.supabase.co/functions/v1/serve-premium-asset';

const assetUrl = process.env.PREMIUM_ASSET_URL || DEFAULT_ASSET_URL;
const slug = process.env.PREMIUM_ASSET_SLUG || 'agentic-motion';
const file = process.env.PREMIUM_ASSET_FILE || 'bundle.json';
const timeoutMs = Number(process.env.PREMIUM_ASSET_CONTRACT_TIMEOUT_MS || 10000);
const anonKey = process.env.SUPABASE_ANON_KEY || '';
const ownerJwt = process.env.PREMIUM_ASSET_OWNER_JWT || '';
const nonOwnerJwt = process.env.PREMIUM_ASSET_NON_OWNER_JWT || '';

function buildUrl() {
  const url = new URL(assetUrl);
  url.searchParams.set('slug', slug);
  url.searchParams.set('file', file);
  return url.toString();
}

function bearer(token) {
  return token.startsWith('Bearer ') ? token : `Bearer ${token}`;
}

async function requestAsset({ label, token }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const headers = {};

  if (token) {
    headers.Authorization = bearer(token);
    if (anonKey) headers.apikey = anonKey;
  }

  try {
    const response = await fetch(buildUrl(), {
      method: 'GET',
      headers,
      signal: controller.signal,
    });
    const body = await response.text();
    return { label, response, body };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`${label} request failed: ${message}`);
  } finally {
    clearTimeout(timeout);
  }
}

function assertStatus({ label, response, body }, expectedStatus) {
  if (response.status === expectedStatus) {
    console.log(`[premium-asset-contract] ${label}: PASS (${response.status} ${response.statusText})`);
    return;
  }

  console.error(`[premium-asset-contract] ${label}: FAIL`);
  console.error(`Expected: ${expectedStatus}`);
  console.error(`Observed: ${response.status} ${response.statusText}`);
  console.error(`Body: ${body.slice(0, 500)}`);

  if (expectedStatus === 200 && response.status === 404) {
    console.error('The user may own the pack, but the asset is missing from the premium-icons bucket.');
  }

  process.exitCode = 1;
}

console.log('[premium-asset-contract] Checking licensed delivery contract');
console.log(`Endpoint: ${buildUrl()}`);

try {
  assertStatus(await requestAsset({ label: 'anonymous', token: '' }), 401);

  if (nonOwnerJwt) {
    assertStatus(await requestAsset({ label: 'authenticated non-owner', token: nonOwnerJwt }), 403);
  } else {
    console.log('[premium-asset-contract] authenticated non-owner: SKIP (set PREMIUM_ASSET_NON_OWNER_JWT)');
  }

  if (ownerJwt) {
    assertStatus(await requestAsset({ label: 'authenticated owner', token: ownerJwt }), 200);
  } else {
    console.log('[premium-asset-contract] authenticated owner: SKIP (set PREMIUM_ASSET_OWNER_JWT)');
  }
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error('[premium-asset-contract] FAIL');
  console.error(message);
  process.exit(1);
}

if (process.exitCode) {
  console.error('[premium-asset-contract] Contract check failed.');
} else {
  console.log('[premium-asset-contract] PASS');
}
