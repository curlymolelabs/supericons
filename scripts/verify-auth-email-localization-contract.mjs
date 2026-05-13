import assert from 'node:assert/strict';
import fs from 'node:fs';

const locales = ['ar', 'de', 'en', 'es', 'hi', 'ja', 'ko', 'pt', 'th', 'vi', 'zh-Hans', 'zh-Hant'];

const authSource = fs.readFileSync('auth.js', 'utf8');
assert.ok(authSource.includes('function buildLocalizedAuthRedirectUrl()'), 'auth.js must build localized auth redirect URLs');
assert.ok((authSource.match(/buildLocalizedAuthRedirectUrl\(\)/g) || []).length >= 3, 'auth.js must use localized redirect URLs for flows that cannot store locale metadata first');
assert.ok(authSource.includes("window.location.origin.replace(/\\/+$/, '')"), 'auth redirects must use the exact origin without a trailing slash for Supabase allow-list matching');
assert.ok(authSource.includes('encodeURIComponent(locale)'), 'auth redirects must preserve the app locale safely in the URL');
assert.ok(authSource.includes('function getBareAuthRedirectUrl()'), 'auth.js must support bare origin redirects for account recovery links');
assert.ok(authSource.includes('async function persistCurrentAuthLocale()'), 'auth.js must persist the selected locale before signed-in account recovery emails');
assert.ok(/signUpWithEmail[\s\S]*?data:\s*\{[\s\S]*?locale:\s*getActiveLocale\(\)/.test(authSource), 'email signup must store the selected locale in user metadata');
assert.ok(/requestPasswordReset[\s\S]*?persistCurrentAuthLocale\(\)[\s\S]*?getBareAuthRedirectUrl\(\)/.test(authSource), 'signed-in account password resets must persist locale and use a bare redirect URL to avoid Site URL fallback');
assert.ok(authSource.includes('accountPasswordCooldownUntil'), 'account password reset flow must track its own visible cooldown');
assert.ok(authSource.includes('function startAccountPasswordCooldown()'), 'account password reset flow must start a visible cooldown after reset attempts');
assert.ok(authSource.includes("tr('account.password.resetInSeconds'"), 'account password reset cooldown must use password-reset wording');
assert.ok(!/accountPasswordCooldownUntil[\s\S]{0,900}tr\('auth\.resendInSeconds'/.test(authSource), 'account password reset cooldown must not reuse confirmation resend wording');
assert.ok(
  /if \(isAuthRateLimitError\(err\)\) \{\s*startForgotPasswordCooldown\(\);\s*setStageStatus\('authForgotStatus', [\s\S]*?, 'success'\);/m.test(authSource),
  'forgot-password rate limits must render as sent/cooldown state, not an immediate error',
);
assert.ok(
  /if \(isAuthRateLimitError\(err\)\) \{\s*startAccountPasswordCooldown\(\);\s*setAccountStatus\('accountPasswordStatus', [\s\S]*?, 'success'\);/m.test(authSource),
  'account password reset rate limits must render as sent/cooldown state, not an immediate error',
);
assert.ok(authSource.includes('async function notifyPasswordChanged('), 'auth.js must request a password-changed notification after password updates');
assert.ok(authSource.includes('/functions/v1/notify-password-changed'), 'auth.js must call the password-changed notification function');
assert.ok(authSource.includes("'apikey': SUPABASE_ANON"), 'notify-password-changed call must include the Supabase anon apikey header');
assert.ok(authSource.includes('Requesting password change notification email'), 'notify-password-changed call must log a diagnostic before invoking the function');
assert.ok(authSource.includes('Requesting password reset email'), 'password reset requests must log the redirect origin for debugging');
assert.ok(authSource.includes('async function getCurrentAccessToken()'), 'auth.js must be able to capture the recovery access token before password update');
assert.ok(/const passwordChangeNotificationToken = await getCurrentAccessToken\(\);[\s\S]*?await updateUserPassword\(nextPassword\);[\s\S]*?await notifyPasswordChanged\(passwordChangeNotificationToken\);/.test(authSource), 'password-changed notification must use the access token captured before password update succeeds');

const hookSource = fs.readFileSync('supabase/functions/send-email/index.ts', 'utf8');
const notifySource = fs.readFileSync('supabase/functions/notify-password-changed/index.ts', 'utf8');
assert.ok(hookSource.includes("standardwebhooks@1.0.0"), 'send-email hook must verify Supabase webhook signatures');
assert.ok(hookSource.includes('RESEND_API_KEY'), 'send-email hook must use Resend for outbound mail');
assert.ok(hookSource.includes('Supericons <no-reply@auth.supericons.dev>'), 'send-email hook must default to the verified no-reply auth sender');
assert.ok(hookSource.includes('SEND_EMAIL_HOOK_SECRET'), 'send-email hook must require the Supabase hook secret');
assert.ok(hookSource.includes('type EmailIntent'), 'send-email hook must have an explicit three-email intent contract');
assert.ok(hookSource.includes("EMAIL_TEMPLATE_VERSION = 'supericons-auth-email-v2-link-only-2026-05-12'"), 'send-email hook must include a deploy-visible template version');
assert.ok(hookSource.includes("'confirm_signup' | 'reset_password' | 'password_changed'"), 'send-email hook must restrict supported intents to the three Supericons auth emails');
assert.ok(hookSource.includes('resolveEmailIntent'), 'send-email hook must resolve incoming Supabase events explicitly');
assert.ok(hookSource.includes('Unsupported auth email action'), 'send-email hook must reject unsupported auth email events');
assert.ok(hookSource.includes('safeEventSummary'), 'send-email hook must log safe unsupported-event metadata');
assert.ok(hookSource.includes('localeFromRedirect'), 'send-email hook must infer locale from the auth redirect URL');
assert.ok(hookSource.includes('function getAuthBaseUrl'), 'send-email hook must build verify URLs from the Supabase auth base URL');
assert.ok(hookSource.includes('function resolveRedirectTo'), 'send-email hook must resolve redirect_to explicitly');
assert.ok(hookSource.includes('redirectToFromConfirmationUrl'), 'send-email hook must recover redirect_to from Supabase confirmation_url when needed');
assert.ok(/new URL\('\/auth\/v1\/verify', authBaseUrl\)[\s\S]*?url\.searchParams\.set\('redirect_to', redirectTo\)/.test(hookSource), 'send-email hook must preserve redirect_to when rebuilding verify links');
assert.ok(/const providedUrl = asString\(emailData\.confirmation_url\);[\s\S]*?if \(providedUrl\) return providedUrl;/.test(hookSource), 'send-email hook may fall back to confirmation_url only after token-based URL building');
assert.ok(hookSource.includes('redirectOrigin: safeUrlOrigin'), 'send-email hook must log a safe redirect origin');
assert.ok(hookSource.includes("dir = locale === 'ar' ? 'rtl' : 'ltr'"), 'send-email hook must render RTL direction for Arabic only');
assert.ok(hookSource.includes('logo_email_header.png'), 'send-email hook must use the Supericons email logo');
assert.ok(hookSource.includes('#0e0e0e'), 'send-email hook must use the dark email background');
assert.ok(hookSource.includes('#131313'), 'send-email hook must use the dark email card');
assert.ok(hookSource.includes('#FF4F00'), 'send-email hook must use the Supericons orange accent');
assert.ok(hookSource.includes('max-width: 480px'), 'send-email hook must match the template width');
assert.ok(hookSource.includes('height="34"'), 'send-email hook must match the template logo height');
assert.ok(hookSource.includes('padding: 48px 40px'), 'send-email hook must match the template card padding');
assert.ok(hookSource.includes('border-radius: 99px'), 'send-email hook must match the template CTA radius');
assert.ok(hookSource.includes('template_version'), 'send-email hook must tag outbound emails with template version');
assert.ok(hookSource.includes('[send-email] Sent auth email'), 'send-email hook must log safe successful send metadata');
assert.ok(hookSource.includes('Auth email hook verification failed'), 'send-email hook must log signature verification failures separately');
assert.ok(hookSource.includes('Auth email delivery failed'), 'send-email hook must log delivery failures separately');
assert.ok(/Invalid auth email hook signature[\s\S]*?status: 401/.test(hookSource), 'send-email hook must reserve 401 for signature failures');
assert.ok(/Auth email delivery failed[\s\S]*?status: 500/.test(hookSource), 'send-email hook must return 500 for delivery/rendering failures');

for (const locale of locales) {
  assert.ok(hookSource.includes(`${locale}:`) || hookSource.includes(`'${locale}':`), `send-email hook missing locale ${locale}`);
}

for (const intent of ['confirm_signup', 'reset_password', 'password_changed']) {
  assert.ok(hookSource.includes(`${intent}:`), `send-email hook missing ${intent} email copy`);
}

for (const removedAction of ['magiclink', 'email_change', 'reauthentication']) {
  assert.ok(!hookSource.includes(removedAction), `send-email hook must not include unsupported ${removedAction} email handling`);
}

assert.ok(!/invite\s*:/.test(hookSource), 'send-email hook must not include unsupported invite email handling');
assert.ok(!hookSource.includes('Verification code'), 'send-email hook must not show verification code text');
assert.ok(!hookSource.includes('codeLabel'), 'send-email hook must not render a code label');
assert.ok(!hookSource.includes('Sign in to Supericons'), 'send-email hook must not fall back to sign-in email copy');
assert.ok(!hookSource.includes('Curly Mole Labs sends this email'), 'send-email hook must not include redundant Curly Mole Labs security footer copy');
assert.ok(!hookSource.includes('&copy; 2026 Curly Mole Labs'), 'send-email hook must not include redundant Curly Mole Labs footer');
assert.ok(!/actions:\s*Record/.test(hookSource), 'send-email hook must not use a broad generic action map');
assert.ok(!/email_action_type \|\| ['"]/.test(hookSource), 'send-email hook must not default missing email action types to another action');

assert.ok(notifySource.includes('supabase.auth.getUser()'), 'notify-password-changed must authenticate the caller through Supabase Auth');
assert.ok(notifySource.includes('deploy notify-password-changed --no-verify-jwt'), 'notify-password-changed must be deployed with gateway JWT verification off for browser CORS preflight');
assert.ok(notifySource.includes("intent: 'password_changed'"), 'notify-password-changed must render the password_changed email');
assert.ok(notifySource.includes('to: user.email'), 'notify-password-changed must send only to the authenticated user email');
assert.ok(!/body\.(to|email|recipient)/.test(notifySource), 'notify-password-changed must not accept a recipient from the request body');
assert.ok(notifySource.includes('EMAIL_TEMPLATE_VERSION'), 'notify-password-changed must expose the shared template version');
assert.ok(!notifySource.includes('../send-email'), 'notify-password-changed must be self-contained for Supabase browser deploy bundling');

const obviousMojibake = ['ÃƒÂ©', 'ÃƒÂ¼', 'ÃƒÂ£', 'Ã Â¤', 'Ã£â€š', 'Ã¬â€”', 'Ã˜Â§', 'Ø£', 'à¤', 'ã', 'ì'];
for (const marker of obviousMojibake) {
  assert.ok(!hookSource.includes(marker), `send-email hook contains possible mojibake marker ${marker}`);
}

console.log(`verify-auth-email-localization-contract: ok (${locales.length} locales, 3 email intents, auth redirects, Send Email hook contract)`);
