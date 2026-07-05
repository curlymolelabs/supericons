import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export class SearchEngineHttpError extends Error {
  status: number;
  code: string;
  hint: string;
  retryable: boolean;
  details: Record<string, unknown>;

  constructor(
    message: string,
    {
      status = 500,
      code = 'search_service_unavailable',
      hint = 'Retry the hosted search request.',
      retryable = status >= 500,
      details = {},
    }: {
      status?: number;
      code?: string;
      hint?: string;
      retryable?: boolean;
      details?: Record<string, unknown>;
    } = {},
  ) {
    super(message);
    this.name = 'SearchEngineHttpError';
    this.status = status;
    this.code = code;
    this.hint = hint;
    this.retryable = retryable;
    this.details = details;
  }
}

function getAdminClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
}

function getSearchRateLimitPerMinute() {
  const raw = Number.parseInt(Deno.env.get('SEARCH_ENGINE_RATE_LIMIT_PER_MINUTE') || '120', 10);
  return Number.isFinite(raw) && raw > 0 ? raw : 120;
}

function extractClientIp(req: Request) {
  const forwardedFor = req.headers.get('x-forwarded-for') || '';
  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() || null;
  }
  const realIp = req.headers.get('x-real-ip') || '';
  return realIp.trim() || null;
}

function normalizeCountryCode(value: string | null) {
  const normalized = String(value || '').trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(normalized)) return null;
  if (normalized === 'XX' || normalized === 'ZZ') return null;
  return normalized;
}

function extractTrustedCountry(req: Request) {
  const candidates = [
    { header: 'cf-ipcountry', source: 'cloudflare' },
    { header: 'x-vercel-ip-country', source: 'vercel' },
    { header: 'x-country-code', source: 'proxy' },
  ];

  for (const candidate of candidates) {
    const countryCode = normalizeCountryCode(req.headers.get(candidate.header));
    if (countryCode) {
      return {
        countryCode,
        geoSource: candidate.source,
      };
    }
  }

  return {
    countryCode: null,
    geoSource: null,
  };
}

async function sha256Hex(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export async function getAuditIdentity(req: Request) {
  const rawSessionHash = req.headers.get('x-si-session-hash') || '';
  const sessionHash = rawSessionHash.trim() || null;
  const ip = extractClientIp(req);
  const ipHash = ip ? await sha256Hex(ip) : null;
  const geo = extractTrustedCountry(req);

  return {
    sessionHash,
    ipHash,
    countryCode: geo.countryCode,
    geoSource: geo.geoSource,
  };
}

export async function enforceSearchRateLimit(req: Request) {
  const identity = await getAuditIdentity(req);
  if (!identity.ipHash) return identity;

  const admin = getAdminClient();
  const since = new Date(Date.now() - (60 * 1000)).toISOString();
  const { count, error } = await admin
    .from('search_request_audit')
    .select('id', { count: 'exact', head: true })
    .eq('ip_hash', identity.ipHash)
    .gte('created_at', since);

  if (error) {
    throw new SearchEngineHttpError('Hosted search rate-limit lookup failed.', {
      status: 503,
      code: 'search_service_unavailable',
      hint: 'Retry the hosted search request.',
      retryable: true,
    });
  }

  const perMinute = getSearchRateLimitPerMinute();
  if ((count || 0) >= perMinute) {
    throw new SearchEngineHttpError('Too many hosted search requests.', {
      status: 429,
      code: 'search_rate_limited',
      hint: 'Wait before sending more hosted search requests.',
      retryable: true,
      details: {
        retry_after_seconds: 60,
        limit_scope: 'ip',
      },
    });
  }

  return identity;
}
