import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

import { MotionLabHttpError } from './errors.ts';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function getAdminClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
}

export function getMotionLabAdminClient() {
  return getAdminClient();
}

function getSessionSecret() {
  return Deno.env.get('MOTION_LAB_SESSION_SECRET') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
}

function base64UrlEncodeBytes(bytes: Uint8Array) {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlEncodeString(value: string) {
  return base64UrlEncodeBytes(encoder.encode(value));
}

function base64UrlDecodeToString(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return decoder.decode(bytes);
}

async function importHmacKey(secret: string) {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
}

async function signPayloadSegment(payloadSegment: string) {
  const secret = getSessionSecret();
  if (!secret) {
    throw new MotionLabHttpError('Motion Lab session secret is not configured.', {
      status: 503,
      code: 'motion_lab_service_unavailable',
      hint: 'Set MOTION_LAB_SESSION_SECRET before enabling hosted Motion Lab endpoints.',
      retryable: false,
    });
  }

  const key = await importHmacKey(secret);
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payloadSegment));
  return base64UrlEncodeBytes(new Uint8Array(signature));
}

function getSessionTtlSeconds() {
  const raw = Number.parseInt(Deno.env.get('MOTION_LAB_SESSION_TTL_SECONDS') || '900', 10);
  return Number.isFinite(raw) && raw > 60 ? raw : 900;
}

export async function validateMotionLabApiKeyHash(keyHash: string) {
  if (!keyHash || typeof keyHash !== 'string' || keyHash.length !== 64) {
    throw new MotionLabHttpError('Invalid Motion Lab API key hash.', {
      status: 422,
      code: 'motion_lab_invalid_request',
      hint: 'Send a SHA-256 hex string in api_key_hash.',
      retryable: false,
    });
  }

  const admin = getAdminClient();

  const { data: keys, error: keyError } = await admin
    .from('si_api_keys')
    .select('id, user_id')
    .eq('key_hash', keyHash)
    .eq('revoked', false)
    .limit(1);

  if (keyError) {
    throw new MotionLabHttpError('Motion Lab auth lookup failed.', {
      status: 503,
      code: 'motion_lab_service_unavailable',
      hint: 'Retry the Motion Lab session request.',
      retryable: true,
    });
  }

  if (!keys || keys.length === 0) {
    throw new MotionLabHttpError('Motion Lab MCP requires a valid API key.', {
      status: 401,
      code: 'motion_lab_auth_required',
      hint: 'Check SUPERICONS_API_KEY and retry.',
      retryable: false,
    });
  }

  const keyRecord = keys[0];

  admin
    .from('si_api_keys')
    .update({ last_used: new Date().toISOString() })
    .eq('id', keyRecord.id)
    .then(() => {});

  const { data: subscription, error: subscriptionError } = await admin
    .from('si_subscriptions')
    .select('id')
    .eq('user_id', keyRecord.user_id)
    .eq('status', 'active')
    .limit(1);

  if (subscriptionError) {
    throw new MotionLabHttpError('Motion Lab entitlement check failed.', {
      status: 503,
      code: 'motion_lab_service_unavailable',
      hint: 'Retry the Motion Lab session request.',
      retryable: true,
    });
  }

  const isPro = Boolean(subscription && subscription.length > 0);
  if (!isPro) {
    throw new MotionLabHttpError('Motion Lab MCP requires a Pro account.', {
      status: 403,
      code: 'motion_lab_pro_required',
      hint: 'Upgrade your Supericons account or verify your API key is linked to Pro.',
      retryable: false,
    });
  }

  return {
    userId: keyRecord.user_id,
    isPro,
  };
}

export async function mintMotionLabSession(userId: string) {
  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresAt = issuedAt + getSessionTtlSeconds();
  const payload = {
    scope: 'motion_lab',
    user_id: userId,
    is_pro: true,
    iat: issuedAt,
    exp: expiresAt,
  };

  const payloadSegment = base64UrlEncodeString(JSON.stringify(payload));
  const signatureSegment = await signPayloadSegment(payloadSegment);
  return {
    sessionToken: `${payloadSegment}.${signatureSegment}`,
    expiresAt: new Date(expiresAt * 1000).toISOString(),
  };
}

export async function requireMotionLabSession(req: Request) {
  const authHeader = req.headers.get('Authorization') || '';
  if (!authHeader.startsWith('Bearer ')) {
    throw new MotionLabHttpError('Motion Lab bearer token is required.', {
      status: 401,
      code: 'motion_lab_auth_required',
      hint: 'Exchange your API key for a Motion Lab session token first.',
      retryable: false,
    });
  }

  const token = authHeader.slice('Bearer '.length).trim();
  const [payloadSegment, signatureSegment] = token.split('.');
  if (!payloadSegment || !signatureSegment) {
    throw new MotionLabHttpError('Motion Lab session token is invalid.', {
      status: 401,
      code: 'motion_lab_auth_required',
      hint: 'Exchange your API key for a new Motion Lab session token.',
      retryable: false,
    });
  }

  const expectedSignature = await signPayloadSegment(payloadSegment);
  if (expectedSignature !== signatureSegment) {
    throw new MotionLabHttpError('Motion Lab session token signature is invalid.', {
      status: 401,
      code: 'motion_lab_auth_required',
      hint: 'Exchange your API key for a new Motion Lab session token.',
      retryable: false,
    });
  }

  let payload;
  try {
    payload = JSON.parse(base64UrlDecodeToString(payloadSegment));
  } catch {
    throw new MotionLabHttpError('Motion Lab session token payload is invalid.', {
      status: 401,
      code: 'motion_lab_auth_required',
      hint: 'Exchange your API key for a new Motion Lab session token.',
      retryable: false,
    });
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (!payload?.exp || payload.exp <= nowSeconds) {
    throw new MotionLabHttpError('Motion Lab session token has expired.', {
      status: 401,
      code: 'motion_lab_auth_required',
      hint: 'Exchange your API key for a fresh Motion Lab session token.',
      retryable: false,
    });
  }

  if (!payload?.is_pro || payload?.scope !== 'motion_lab' || typeof payload?.user_id !== 'string') {
    throw new MotionLabHttpError('Motion Lab session token does not grant access.', {
      status: 403,
      code: 'motion_lab_pro_required',
      hint: 'Use a Pro-linked API key to start a Motion Lab session.',
      retryable: false,
    });
  }

  return {
    userId: payload.user_id,
    isPro: true,
  };
}
