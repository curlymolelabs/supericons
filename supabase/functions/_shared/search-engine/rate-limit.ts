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

export function exceedsSearchRateLimit(currentCount: number, requestCost: number, perMinute: number) {
  const normalizedCount = Math.max(0, Math.floor(Number(currentCount) || 0));
  const normalizedRequestCost = Math.max(1, Math.floor(Number(requestCost) || 1));
  const normalizedLimit = Math.max(1, Math.floor(Number(perMinute) || 1));
  return normalizedCount + normalizedRequestCost > normalizedLimit;
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

// Tiered daily fair-use allowances measured in
// docs/si-v2/search/experiments/hosted-allowance-measurement-2026-07-19.md.
// Enforcement is disabled unless SEARCH_ENGINE_TIER_ENFORCEMENT=on (D-028/FR-43:
// it stays off until free-key issuance is live and both ingresses resolve tiers equally).
export const HOSTED_ALLOWANCE_POLICY = Object.freeze({
  version: '2026-07-19',
  burstPerMinute: 120,
  dailyByTier: Object.freeze({
    anonymous: 300,
    registered_free: 1500,
    paid: 5000,
  }),
});

export type AllowanceTier = keyof typeof HOSTED_ALLOWANCE_POLICY.dailyByTier;

export function isTierEnforcementEnabled() {
  return String(Deno.env.get('SEARCH_ENGINE_TIER_ENFORCEMENT') || '').trim().toLowerCase() === 'on';
}

export function resolveAllowanceTier(
  account: { isRegistered?: boolean; isPro?: boolean } | null | undefined,
): AllowanceTier {
  if (account?.isPro) return 'paid';
  if (account?.isRegistered) return 'registered_free';
  return 'anonymous';
}

export function secondsUntilUtcMidnight(now = new Date()) {
  const reset = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  return Math.max(1, Math.ceil((reset.getTime() - now.getTime()) / 1000));
}

export async function enforceDailyAllowance(
  adminClient: {
    from: (table: string) => {
      select: (columns: string, options: { count: 'exact'; head: true }) => {
        eq: (column: string, value: string) => {
          gte: (column: string, value: string) => Promise<{ count: number | null; error: unknown }>;
        };
      };
    };
  },
  { ipHash, tier }: { ipHash: string | null; tier: AllowanceTier },
) {
  if (!isTierEnforcementEnabled()) return;
  if (!ipHash) return;

  const dailyLimit = HOSTED_ALLOWANCE_POLICY.dailyByTier[tier]
    ?? HOSTED_ALLOWANCE_POLICY.dailyByTier.anonymous;
  const now = new Date();
  const utcMidnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const { count, error } = await adminClient
    .from('search_request_audit')
    .select('id', { count: 'exact', head: true })
    .eq('ip_hash', ipHash)
    .gte('created_at', utcMidnight.toISOString());

  if (error) {
    // Fail open on lookup errors: the allowance protects against abuse, and a
    // metering outage must never take search availability down with it.
    return;
  }

  if ((count || 0) + 1 > dailyLimit) {
    const retryAfterSeconds = secondsUntilUtcMidnight(now);
    throw new SearchEngineHttpError('Daily fair-use search allowance reached.', {
      status: 429,
      code: 'search_daily_allowance_reached',
      hint: 'The allowance resets at 00:00 UTC.',
      retryable: true,
      details: {
        retry_after_seconds: retryAfterSeconds,
        limit_scope: 'daily_allowance',
        tier,
        daily_limit: dailyLimit,
        resets_at_utc: new Date(utcMidnight.getTime() + (24 * 60 * 60 * 1000)).toISOString(),
      },
    });
  }
}

export async function enforceSearchRateLimit(req: Request, requestCost = 1) {
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
  if (exceedsSearchRateLimit(count || 0, requestCost, perMinute)) {
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
