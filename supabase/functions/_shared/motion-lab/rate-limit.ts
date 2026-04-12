import { MotionLabHttpError } from './errors.ts';
import { getMotionLabAdminClient } from './auth.ts';

type MotionLabRateLimitBucket =
  | 'motion-lab-session'
  | 'motion-lab-recipe'
  | 'motion-lab-render-css'
  | 'motion-lab-render-animated-svg';

type MotionLabRateLimitSubjectKind = 'api_key_hash' | 'user';

type MotionLabRateLimitBucketConfig = {
  bucket: MotionLabRateLimitBucket;
  subjectKind: MotionLabRateLimitSubjectKind;
  limit: number;
  windowSeconds: number;
  scope: string;
};

type MotionLabRateLimitSummary = {
  enabled: boolean;
  available: boolean;
  degraded: boolean;
  bucket: MotionLabRateLimitBucket;
  subjectKind: MotionLabRateLimitSubjectKind;
  limit: number;
  windowSeconds: number;
  limitScope: string;
  requests: number | null;
  remaining: number | null;
  retryAfterSeconds: number | null;
  reason: 'applied' | 'missing_config' | 'backend_unavailable';
};

type MotionLabRateLimitRpcRow = {
  allowed: boolean;
  request_count: number;
  remaining: number;
  retry_after_seconds: number;
  window_started_at: string;
  window_ends_at: string;
};

const DEFAULT_BUCKET_CONFIGS: Record<MotionLabRateLimitBucket, MotionLabRateLimitBucketConfig> = {
  'motion-lab-session': {
    bucket: 'motion-lab-session',
    subjectKind: 'api_key_hash',
    limit: 12,
    windowSeconds: 600,
    scope: 'motion-lab-session:api_key_hash',
  },
  'motion-lab-recipe': {
    bucket: 'motion-lab-recipe',
    subjectKind: 'user',
    limit: 180,
    windowSeconds: 600,
    scope: 'motion-lab-recipe:user',
  },
  'motion-lab-render-css': {
    bucket: 'motion-lab-render-css',
    subjectKind: 'user',
    limit: 120,
    windowSeconds: 600,
    scope: 'motion-lab-render-css:user',
  },
  'motion-lab-render-animated-svg': {
    bucket: 'motion-lab-render-animated-svg',
    subjectKind: 'user',
    limit: 120,
    windowSeconds: 600,
    scope: 'motion-lab-render-animated-svg:user',
  },
};

const ENV_OVERRIDES: Record<MotionLabRateLimitBucket, { limit: string; window: string }> = {
  'motion-lab-session': {
    limit: 'MOTION_LAB_RATE_LIMIT_SESSION_MAX',
    window: 'MOTION_LAB_RATE_LIMIT_SESSION_WINDOW_SECONDS',
  },
  'motion-lab-recipe': {
    limit: 'MOTION_LAB_RATE_LIMIT_RECIPE_MAX',
    window: 'MOTION_LAB_RATE_LIMIT_RECIPE_WINDOW_SECONDS',
  },
  'motion-lab-render-css': {
    limit: 'MOTION_LAB_RATE_LIMIT_RENDER_CSS_MAX',
    window: 'MOTION_LAB_RATE_LIMIT_RENDER_CSS_WINDOW_SECONDS',
  },
  'motion-lab-render-animated-svg': {
    limit: 'MOTION_LAB_RATE_LIMIT_RENDER_SVG_MAX',
    window: 'MOTION_LAB_RATE_LIMIT_RENDER_SVG_WINDOW_SECONDS',
  },
};

let missingConfigWarningShown = false;
let backendWarningShown = false;

function parsePositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value || '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function readSupabaseAdminConfig() {
  const url = Deno.env.get('SUPABASE_URL') || '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  return {
    url,
    serviceRoleKey,
    configured: Boolean(url && serviceRoleKey),
  };
}

function warnMissingConfigOnce() {
  if (missingConfigWarningShown) return;
  console.warn('[Motion Lab] Postgres rate limiting is not configured. Motion Lab will fail open until the required Supabase admin environment is available.');
  missingConfigWarningShown = true;
}

function warnBackendFailureOnce(error: unknown) {
  if (backendWarningShown) return;
  const message = error instanceof Error ? error.message : 'Unknown Postgres rate limit failure.';
  console.warn(`[Motion Lab] Postgres rate limiting is unavailable. Motion Lab is temporarily failing open. Cause: ${message}`);
  backendWarningShown = true;
}

function resolveBucketConfig(bucket: MotionLabRateLimitBucket): MotionLabRateLimitBucketConfig {
  const defaults = DEFAULT_BUCKET_CONFIGS[bucket];
  const overrides = ENV_OVERRIDES[bucket];

  return {
    ...defaults,
    limit: parsePositiveInt(Deno.env.get(overrides.limit), defaults.limit),
    windowSeconds: parsePositiveInt(Deno.env.get(overrides.window), defaults.windowSeconds),
  };
}

function sanitizeSubject(subject: string) {
  return subject.trim().toLowerCase();
}

function buildLimitExceededError(limitScope: string, retryAfterSeconds: number) {
  return new MotionLabHttpError('Motion Lab request limit reached for this window.', {
    status: 429,
    code: 'motion_lab_rate_limited',
    hint: 'Wait before retrying. If you are running a bulk workflow, reduce request frequency or reuse existing results where possible.',
    retryable: true,
    details: {
      retry_after_seconds: retryAfterSeconds,
      limit_scope: limitScope,
    },
  });
}

export function getMotionLabRateLimiter() {
  return getMotionLabAdminClient();
}

export function getMotionLabRateLimitConfigSummary() {
  const supabaseAdmin = readSupabaseAdminConfig();
  const buckets = Object.values(DEFAULT_BUCKET_CONFIGS).map((bucketConfig) => resolveBucketConfig(bucketConfig.bucket));

  return {
    configured: supabaseAdmin.configured,
    backend: 'postgres',
    buckets,
  };
}

export function buildMotionLabRateLimitScope(bucket: MotionLabRateLimitBucket, subjectKind: MotionLabRateLimitSubjectKind) {
  return `${bucket}:${subjectKind}`;
}

export async function enforceMotionLabRateLimit({
  bucket,
  subject,
}: {
  bucket: MotionLabRateLimitBucket;
  subject: string;
}): Promise<MotionLabRateLimitSummary> {
  const config = resolveBucketConfig(bucket);
  const limitScope = buildMotionLabRateLimitScope(bucket, config.subjectKind);
  const sanitizedSubject = sanitizeSubject(subject || '');

  if (!sanitizedSubject) {
    throw new MotionLabHttpError('Motion Lab rate limit subject is required.', {
      status: 500,
      code: 'motion_lab_service_unavailable',
      hint: 'Retry when the Motion Lab service is available.',
      retryable: true,
    });
  }

  const supabaseAdmin = readSupabaseAdminConfig();
  if (!supabaseAdmin.configured) {
    warnMissingConfigOnce();
    return {
      enabled: false,
      available: false,
      degraded: true,
      bucket,
      subjectKind: config.subjectKind,
      limit: config.limit,
      windowSeconds: config.windowSeconds,
      limitScope,
      requests: null,
      remaining: null,
      retryAfterSeconds: null,
      reason: 'missing_config',
    };
  }

  try {
    const admin = getMotionLabAdminClient();
    const { data, error } = await admin
      .rpc('si_enforce_motion_lab_rate_limit', {
        p_bucket: bucket,
        p_subject_kind: config.subjectKind,
        p_subject_key: sanitizedSubject,
        p_limit: config.limit,
        p_window_seconds: config.windowSeconds,
      })
      .single<MotionLabRateLimitRpcRow>();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      throw new Error('Motion Lab rate limit RPC returned no data.');
    }

    const requests = Number(data.request_count);
    const remaining = Number(data.remaining);
    const retryAfterSeconds = Number(data.retry_after_seconds);

    if (!data.allowed) {
      throw buildLimitExceededError(limitScope, retryAfterSeconds);
    }

    return {
      enabled: true,
      available: true,
      degraded: false,
      bucket,
      subjectKind: config.subjectKind,
      limit: config.limit,
      windowSeconds: config.windowSeconds,
      limitScope,
      requests,
      remaining: Number.isFinite(remaining) ? Math.max(0, remaining) : Math.max(0, config.limit - requests),
      retryAfterSeconds: Number.isFinite(retryAfterSeconds) ? retryAfterSeconds : config.windowSeconds,
      reason: 'applied',
    };
  } catch (error) {
    if (error instanceof MotionLabHttpError && error.code === 'motion_lab_rate_limited') {
      throw error;
    }

    warnBackendFailureOnce(error);
    return {
      enabled: true,
      available: false,
      degraded: true,
      bucket,
      subjectKind: config.subjectKind,
      limit: config.limit,
      windowSeconds: config.windowSeconds,
      limitScope,
      requests: null,
      remaining: null,
      retryAfterSeconds: null,
      reason: 'backend_unavailable',
    };
  }
}
