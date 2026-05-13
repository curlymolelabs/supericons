import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync('auth.js', 'utf8');

assert.ok(source.includes('function refreshAuthCooldownUiOnResume()'), 'auth.js must have a dedicated auth cooldown resume refresh');
assert.ok(source.includes('AUTH_ACCOUNT_PASSWORD_COOLDOWN_STORAGE_PREFIX'), 'account password cooldown must have a persistent storage key');
assert.ok(source.includes('function getAccountPasswordCooldownStorageKey('), 'account password cooldown must be scoped per signed-in user');
assert.ok(source.includes('function readStoredAccountPasswordCooldownUntil('), 'account password cooldown must be readable from persistent storage');
assert.ok(source.includes('function writeStoredAccountPasswordCooldownUntil('), 'account password cooldown must be writable to persistent storage');
assert.ok(source.includes('function getAccountPasswordCooldownUntil()'), 'account password cooldown must reconcile memory and persistent storage');
assert.ok(/getAccountPasswordCooldownUntil[\s\S]*?readStoredAccountPasswordCooldownUntil\(\)[\s\S]*?Math\.max/.test(source), 'account password cooldown must use the later of memory and stored deadlines');
assert.ok(/renderAccountModal[\s\S]*?getAccountPasswordCooldownUntil\(\) - Date\.now\(\)/.test(source), 'account password cooldown rendering must recompute from the persistent absolute deadline');
assert.ok(/scheduleAuthStageRefresh[\s\S]*?getAccountPasswordCooldownUntil\(\) - Date\.now\(\)/.test(source), 'account password cooldown scheduler must use the persistent absolute deadline');
assert.ok(/refreshAuthCooldownUiOnResume[\s\S]*?getAccountPasswordCooldownUntil\(\)[\s\S]*?renderAccountModal\(\)/.test(source), 'account password cooldown must re-render from its absolute timestamp on resume');
assert.ok(/refreshAuthCooldownUiOnResume[\s\S]*?authModalState\.verifyResendCooldownUntil[\s\S]*?authModalState\.forgotSubmitCooldownUntil[\s\S]*?renderAuthModal\(\)/.test(source), 'signup and forgot cooldowns must keep using the shared resume refresh path');
assert.ok(/refreshAuthCooldownUiOnResume[\s\S]*?scheduleAuthStageRefresh\(\)/.test(source), 'resume refresh must restart the cooldown scheduler after recomputing labels');
assert.ok(source.includes("window.addEventListener('focus', refreshAuthCooldownUiOnResume)"), 'auth cooldowns must refresh when the browser window regains focus');
assert.ok(source.includes("window.addEventListener('pageshow', refreshAuthCooldownUiOnResume)"), 'auth cooldowns must refresh when the page is restored from navigation cache');
assert.ok(/document\.addEventListener\('visibilitychange'[\s\S]*?!document\.hidden[\s\S]*?refreshAuthCooldownUiOnResume\(\)/.test(source), 'auth cooldowns must refresh when a hidden tab becomes visible again');
assert.ok(/window\.addEventListener\('storage'[\s\S]*?AUTH_ACCOUNT_PASSWORD_COOLDOWN_STORAGE_PREFIX[\s\S]*?refreshAuthCooldownUiOnResume\(\)/.test(source), 'account password cooldown must refresh across same-origin tabs');
assert.ok(/startAccountPasswordCooldown[\s\S]*?Date\.now\(\) \+ AUTH_EMAIL_REQUEST_COOLDOWN_MS[\s\S]*?writeStoredAccountPasswordCooldownUntil\(deadline\)/.test(source), 'starting an account password cooldown must persist the absolute deadline');
assert.ok(/accountPasswordBtn\.addEventListener\('click'[\s\S]*?Date\.now\(\) < getAccountPasswordCooldownUntil\(\)[\s\S]*?return;/.test(source), 'account password reset clicks must be blocked while a persisted cooldown is active');
assert.ok(!/accountPasswordCooldownUntil\s*[-+]{2}/.test(source), 'account password cooldown must not be decremented directly');

console.log('verify-auth-cooldown-resume: ok');
