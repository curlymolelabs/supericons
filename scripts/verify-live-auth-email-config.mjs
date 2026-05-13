import assert from 'node:assert/strict';
import fs from 'node:fs';

const accessToken = process.env.SUPABASE_ACCESS_TOKEN || '';
const explicitProjectRef = process.env.SUPABASE_PROJECT_REF || process.env.PROJECT_REF || '';

function inferProjectRef() {
  if (explicitProjectRef) return explicitProjectRef;
  const authSource = fs.readFileSync('auth.js', 'utf8');
  const match = authSource.match(/const SUPABASE_URL = 'https:\/\/([a-z0-9-]+)\.supabase\.co'/);
  return match?.[1] || '';
}

function readNumber(config, key) {
  const value = config?.[key];
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function hasConfiguredValue(config, key) {
  const value = config?.[key];
  return typeof value === 'string' ? value.trim().length > 0 : Boolean(value);
}

function findMatchingKeys(config, pattern) {
  return Object.keys(config || {}).filter((key) => pattern.test(key)).sort();
}

function summarize(config) {
  const rateLimitEmailSent = readNumber(config, 'rate_limit_email_sent');
  const smtpSignals = {
    externalEmailEnabled: Boolean(config.external_email_enabled),
    smtpHostConfigured: hasConfiguredValue(config, 'smtp_host'),
    smtpPortConfigured: config.smtp_port !== undefined && config.smtp_port !== null,
    smtpUserConfigured: hasConfiguredValue(config, 'smtp_user'),
    smtpAdminEmailConfigured: hasConfiguredValue(config, 'smtp_admin_email'),
    smtpSenderNameConfigured: hasConfiguredValue(config, 'smtp_sender_name'),
  };
  const hookSignalKeys = findMatchingKeys(config, /(hook|email).*send|send.*(hook|email)|auth_hook/i);

  return {
    rateLimitEmailSent,
    ...smtpSignals,
    hookSignalKeys,
  };
}

const projectRef = inferProjectRef();
assert.ok(projectRef, 'Set SUPABASE_PROJECT_REF or keep SUPABASE_URL in auth.js so the project ref can be inferred.');

if (!accessToken) {
  console.log('verify-live-auth-email-config: skipped (set SUPABASE_ACCESS_TOKEN to inspect live Supabase Auth config without printing secrets)');
  process.exit(0);
}

const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/config/auth`, {
  headers: {
    Authorization: `Bearer ${accessToken}`,
  },
});

const bodyText = await response.text();
let config = {};
try {
  config = bodyText ? JSON.parse(bodyText) : {};
} catch {
  throw new Error(`Supabase Management API returned non-JSON response with status ${response.status}`);
}

if (!response.ok) {
  const message = config?.message || config?.error || `Supabase Management API returned ${response.status}`;
  throw new Error(message);
}

const summary = summarize(config);
const failures = [];

if (!summary.externalEmailEnabled) failures.push('external_email_enabled is not enabled');
if (!summary.smtpHostConfigured) failures.push('smtp_host is not configured');
if (!summary.smtpPortConfigured) failures.push('smtp_port is not configured');
if (!summary.smtpUserConfigured) failures.push('smtp_user is not configured');
if (!summary.smtpAdminEmailConfigured) failures.push('smtp_admin_email is not configured');
if (summary.rateLimitEmailSent === null) failures.push('rate_limit_email_sent is not present in the Auth config');
if (summary.rateLimitEmailSent !== null && summary.rateLimitEmailSent <= 2) {
  failures.push(`rate_limit_email_sent is ${summary.rateLimitEmailSent}; raise it above the built-in-provider test value`);
}

console.log('verify-live-auth-email-config summary:', JSON.stringify(summary, null, 2));

if (failures.length) {
  console.error('Live Supabase Auth email config is not production-ready:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('verify-live-auth-email-config: ok');
