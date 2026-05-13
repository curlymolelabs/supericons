import assert from 'node:assert/strict';
import fs from 'node:fs';

const authSource = fs.readFileSync('auth.js', 'utf8');
const sendEmailSource = fs.readFileSync('supabase/functions/send-email/index.ts', 'utf8');
const notifySource = fs.readFileSync('supabase/functions/notify-password-changed/index.ts', 'utf8');
const checklist = fs.readFileSync('docs/supabase-auth-email-deployment-checklist.md', 'utf8');
const runbook = fs.readFileSync('docs/supabase-auth-email-production-runbook.md', 'utf8');
const liveConfigVerifier = fs.readFileSync('scripts/verify-live-auth-email-config.mjs', 'utf8');

assert.ok(authSource.includes('supabase.auth.signUp'), 'signup must remain on Supabase Auth for secure user creation');
assert.ok(authSource.includes('supabase.auth.resend'), 'signup confirmation resend must remain on Supabase Auth');
assert.ok(authSource.includes('supabase.auth.resetPasswordForEmail'), 'password reset must remain on Supabase Auth for secure recovery tokens');
assert.ok(authSource.includes('/functions/v1/notify-password-changed'), 'password-changed notification must use the dedicated Edge Function');

assert.ok(sendEmailSource.includes('RESEND_API_KEY'), 'send-email must use Resend API for localized hook delivery');
assert.ok(sendEmailSource.includes('SEND_EMAIL_HOOK_SECRET'), 'send-email must verify the Auth Hook secret');
assert.ok(sendEmailSource.includes("'confirm_signup' | 'reset_password' | 'password_changed'"), 'send-email must keep the three supported auth email intents explicit');
assert.ok(notifySource.includes('supabase.auth.getUser()'), 'notify-password-changed must verify the signed-in user before sending');

for (const doc of [checklist, runbook]) {
  assert.ok(doc.includes('custom SMTP'), 'auth email docs must explicitly require custom SMTP for production capacity');
  assert.ok(doc.includes('Send Email Hook'), 'auth email docs must preserve the localized Send Email Hook layer');
  assert.ok(doc.includes('429 Too Many Requests'), 'auth email docs must explain the 429 failure mode');
  assert.ok(doc.includes('/auth/v1/signup'), 'auth email docs must mention the signup Auth endpoint');
  assert.ok(doc.includes('/auth/v1/recover'), 'auth email docs must mention the recovery Auth endpoint');
  assert.ok(doc.includes('RESEND_API_KEY'), 'auth email docs must list the Resend API secret by name only');
  assert.ok(doc.includes('SEND_EMAIL_HOOK_SECRET'), 'auth email docs must list the hook secret by name only');
  assert.ok(doc.includes('AUTH_EMAIL_FROM'), 'auth email docs must list the sender secret by name only');
}

assert.ok(runbook.includes('2 emails per hour'), 'production runbook must document the built-in provider test limit');
assert.ok(runbook.includes('rate_limit_email_sent'), 'production runbook must name the Supabase email-send rate limit setting');
assert.ok(runbook.includes('https://supabase.com/docs/guides/auth/rate-limits'), 'production runbook must cite Supabase Auth rate-limit docs');
assert.ok(runbook.includes('https://supabase.com/docs/guides/auth/auth-smtp'), 'production runbook must cite Supabase SMTP docs');
assert.ok(runbook.includes('https://supabase.com/docs/guides/auth/auth-hooks/send-email-hook'), 'production runbook must cite Supabase Send Email Hook docs');
assert.ok(runbook.includes('Supabase Auth should remain the source of truth'), 'production runbook must warn against custom auth-token handling');
assert.ok(runbook.includes('npm run verify:live-auth-email-config'), 'production runbook must include the live config verifier command');
assert.ok(checklist.includes('npm run verify:live-auth-email-config'), 'deployment checklist must include the live config verifier command');
assert.ok(liveConfigVerifier.includes('SUPABASE_ACCESS_TOKEN'), 'live config verifier must use a Supabase management token from the environment');
assert.ok(liveConfigVerifier.includes('/config/auth'), 'live config verifier must inspect Supabase Auth config');
assert.ok(liveConfigVerifier.includes('rate_limit_email_sent'), 'live config verifier must inspect the Auth email-send rate limit');
assert.ok(liveConfigVerifier.includes('smtp_host'), 'live config verifier must inspect custom SMTP configuration');
assert.ok(liveConfigVerifier.includes('external_email_enabled'), 'live config verifier must inspect whether external email is enabled');
assert.ok(!/smtp_pass/.test(liveConfigVerifier), 'live config verifier must not read or print SMTP password fields');

const forbiddenSecretPatterns = [
  /RESEND_API_KEY\s*=\s*['"][^'"]+['"]/,
  /SEND_EMAIL_HOOK_SECRET\s*=\s*['"][^'"]+['"]/,
  /AUTH_EMAIL_FROM\s*=\s*['"][^'"]+['"]/,
  /smtp_pass\s*[:=]\s*['"][^'"]+['"]/i,
];

for (const [name, content] of [
  ['deployment checklist', checklist],
  ['production runbook', runbook],
]) {
  for (const pattern of forbiddenSecretPatterns) {
    assert.ok(!pattern.test(content), `${name} must not contain secret-looking values`);
  }
}

console.log('verify-auth-email-production-readiness: ok');
