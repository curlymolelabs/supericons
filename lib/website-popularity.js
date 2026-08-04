const DEFAULT_SUPABASE_URL = 'https://kcjmkakdhsqplvasgkjv.supabase.co';
const DEFAULT_SUPABASE_PUBLISHABLE_KEY =
  'sb_publishable_slbcWcnrQ45rkJPONFD7pw_hW0WpvBi';
const ALLOWED_STYLES = new Set(['outline', 'solid']);
const ALLOWED_STATUSES = new Set([
  'fresh',
  'stale',
  'failed',
  'insufficient_evidence',
]);
const ICON_REF_PATTERN = /^[a-z0-9][a-z0-9_-]*:[^\s:]+$/;

function readViteEnv(name) {
  try {
    return String(import.meta.env?.[name] || '').trim();
  } catch {
    return '';
  }
}

function normalizeTimestamp(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  const timestamp = new Date(value);
  return Number.isFinite(timestamp.getTime())
    ? timestamp.toISOString()
    : null;
}

function normalizeIconRefs(value) {
  if (!Array.isArray(value)) return [];
  const refs = [];
  const seen = new Set();

  for (const item of value) {
    const ref = String(item || '').trim().toLowerCase();
    if (!ICON_REF_PATTERN.test(ref) || seen.has(ref)) continue;
    seen.add(ref);
    refs.push(ref);
    if (refs.length >= 50) break;
  }
  return refs;
}

export function normalizeWebsitePopularityResponse(value) {
  const payload = Array.isArray(value) && value.length === 1
    ? value[0]
    : value;
  let status = ALLOWED_STATUSES.has(payload?.status)
    ? payload.status
    : 'failed';
  const calculatedAt = normalizeTimestamp(payload?.calculated_at);
  const staleAfter = normalizeTimestamp(payload?.stale_after);
  if (status === 'fresh' && (!calculatedAt || !staleAfter)) {
    status = 'failed';
  }
  const iconRefs = status === 'fresh'
    ? normalizeIconRefs(payload?.icon_refs)
    : [];

  return {
    status: status === 'fresh' && iconRefs.length < 6
      ? 'insufficient_evidence'
      : status,
    calculatedAt,
    staleAfter,
    iconRefs: iconRefs.length >= 6 ? iconRefs : [],
  };
}

function defaultIconKey(icon) {
  if (!icon?.lib || !icon?.id) return '';
  return `${icon.lib}:${icon.id}`.toLowerCase();
}

export function promoteWebsitePopularIcons(
  icons,
  popularRefs,
  {
    minimumRefs = 6,
    getIconKey = defaultIconKey,
  } = {}
) {
  const source = Array.isArray(icons) ? icons : [];
  const refs = normalizeIconRefs(popularRefs);
  const byRef = new Map();

  for (const icon of source) {
    const ref = String(getIconKey(icon) || '').trim().toLowerCase();
    if (ref && !byRef.has(ref)) byRef.set(ref, icon);
  }

  const promoted = [];
  const promotedRefs = [];
  for (const ref of refs) {
    const icon = byRef.get(ref);
    if (!icon) continue;
    promoted.push(icon);
    promotedRefs.push(ref);
  }

  if (promoted.length < minimumRefs) {
    return {
      icons: [...source],
      appliedRefs: [],
    };
  }

  const promotedSet = new Set(promotedRefs);
  return {
    icons: [
      ...promoted,
      ...source.filter((icon) => {
        const ref = String(getIconKey(icon) || '').trim().toLowerCase();
        return !promotedSet.has(ref);
      }),
    ],
    appliedRefs: promotedRefs,
  };
}

function getSupabaseUrl() {
  return readViteEnv('VITE_SUPABASE_URL')
    || DEFAULT_SUPABASE_URL;
}

function getSupabasePublishableKey() {
  return readViteEnv('VITE_SUPABASE_ANON_KEY')
    || DEFAULT_SUPABASE_PUBLISHABLE_KEY;
}

export async function fetchWebsitePopularIcons(
  style,
  {
    fetchImpl = globalThis.fetch,
    supabaseUrl = getSupabaseUrl(),
    publishableKey = getSupabasePublishableKey(),
  } = {}
) {
  if (!ALLOWED_STYLES.has(style)) {
    throw new Error('Website popularity style must be outline or solid');
  }
  if (typeof fetchImpl !== 'function') {
    throw new Error('Website popularity fetch is unavailable');
  }

  const response = await fetchImpl(
    `${String(supabaseUrl).replace(/\/+$/, '')}`
      + '/rest/v1/rpc/si_get_website_popular_icons',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: publishableKey,
        Authorization: `Bearer ${publishableKey}`,
      },
      body: JSON.stringify({ p_style: style }),
    }
  );

  if (!response.ok) {
    throw new Error(`Website popularity fetch failed (${response.status})`);
  }

  return normalizeWebsitePopularityResponse(await response.json());
}
