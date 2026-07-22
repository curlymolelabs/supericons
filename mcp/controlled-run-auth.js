import { createHmac, timingSafeEqual } from 'node:crypto';

export const CONTROLLED_RUN_HEADERS = Object.freeze({
  label: 'x-supericons-controlled-run-label',
  timestamp: 'x-supericons-controlled-run-timestamp',
  signature: 'x-supericons-controlled-run-signature',
});

const MAX_LABEL_LENGTH = 64;
const DEFAULT_MAX_AGE_SECONDS = 300;
const MAX_FUTURE_SKEW_SECONDS = 30;

function normalizeLabel(value) {
  const label = String(value || '')
    .trim()
    .toLowerCase();
  if (!label || label.length > MAX_LABEL_LENGTH || !/^[a-z0-9][a-z0-9._-]*$/.test(label)) return null;
  return label;
}

function getHeader(headers, name) {
  if (!headers) return '';
  if (typeof headers.get === 'function') return headers.get(name) || '';
  if (typeof headers === 'function') return headers(name) || '';
  return headers[name] || headers[name.toLowerCase()] || '';
}

function buildPayload(label, timestamp) {
  return `${timestamp}.${label}`;
}

function signPayload(secret, payload) {
  return createHmac('sha256', secret).update(payload).digest('hex');
}

export function createControlledRunHeaders(labelValue, secretValue, options = {}) {
  const label = normalizeLabel(labelValue);
  const secret = String(secretValue || '');
  if (!label)
    throw new Error('Controlled-run label must use 1 to 64 lowercase letters, numbers, dots, underscores, or hyphens.');
  if (secret.length < 32) throw new Error('Controlled-run secret must contain at least 32 characters.');

  const timestamp = String(Math.floor(Number(options.nowMs || Date.now()) / 1000));
  return {
    [CONTROLLED_RUN_HEADERS.label]: label,
    [CONTROLLED_RUN_HEADERS.timestamp]: timestamp,
    [CONTROLLED_RUN_HEADERS.signature]: signPayload(secret, buildPayload(label, timestamp)),
  };
}

export function verifyControlledRunHeaders(headers, secretValue, options = {}) {
  const secret = String(secretValue || '');
  if (secret.length < 32) return { valid: false, label: null, reason: 'secret_unavailable' };

  const label = normalizeLabel(getHeader(headers, CONTROLLED_RUN_HEADERS.label));
  const timestampText = String(getHeader(headers, CONTROLLED_RUN_HEADERS.timestamp) || '').trim();
  const signatureText = String(getHeader(headers, CONTROLLED_RUN_HEADERS.signature) || '')
    .trim()
    .toLowerCase();
  if (!label || !/^\d{10}$/.test(timestampText) || !/^[a-f0-9]{64}$/.test(signatureText)) {
    return { valid: false, label: null, reason: 'invalid_format' };
  }

  const nowSeconds = Math.floor(Number(options.nowMs || Date.now()) / 1000);
  const timestamp = Number(timestampText);
  const maxAgeSeconds = Math.max(1, Number(options.maxAgeSeconds || DEFAULT_MAX_AGE_SECONDS));
  if (timestamp > nowSeconds + MAX_FUTURE_SKEW_SECONDS) {
    return { valid: false, label: null, reason: 'timestamp_in_future' };
  }
  if (nowSeconds - timestamp > maxAgeSeconds) {
    return { valid: false, label: null, reason: 'expired' };
  }

  const expected = Buffer.from(signPayload(secret, buildPayload(label, timestampText)), 'hex');
  const received = Buffer.from(signatureText, 'hex');
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
    return { valid: false, label: null, reason: 'invalid_signature' };
  }

  return { valid: true, label, reason: null };
}
