import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const authSource = fs.readFileSync(path.join(root, 'auth.js'), 'utf8');
const indexSource = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

assert.ok(authSource.includes("const AUTH_FLOW_EVENT_STORAGE_KEY = 'si-auth-flow-event'"), 'auth flow bridge must persist events for cross-tab fallback');
assert.ok(authSource.includes("const AUTH_FLOW_BROADCAST_CHANNEL = 'si-auth-flow'"), 'auth flow bridge must use a BroadcastChannel when available');
assert.ok(authSource.includes('const AUTH_FLOW_SESSION_RETRY_ATTEMPTS'), 'auth flow bridge must retry until Supabase session storage is visible');
assert.ok(authSource.includes('function waitForAuthFlowSessionRetry()'), 'auth flow bridge must have a deterministic retry wait helper');
assert.ok(authSource.includes('function initAuthFlowBridge()'), 'auth flow bridge initializer must exist');
assert.ok(authSource.includes('new BroadcastChannel(AUTH_FLOW_BROADCAST_CHANNEL)'), 'auth flow bridge must initialize BroadcastChannel');
assert.ok(/window\.addEventListener\('storage'[\s\S]*?AUTH_FLOW_EVENT_STORAGE_KEY[\s\S]*?receiveAuthFlowEvent/.test(authSource), 'auth flow bridge must listen for localStorage fallback events');
assert.ok(authSource.includes("publishAuthFlowEvent('signed_in'"), 'signed-in auth events must be broadcast to stale tabs');
assert.ok(authSource.includes("publishAuthFlowEvent('password_updated'"), 'password update completion must be broadcast to stale tabs');
assert.ok(/handleAuthFlowEvent[\s\S]*?payload\.type === 'signed_in'[\s\S]*?refreshSessionFromAuthFlowEvent\(\)[\s\S]*?closeAuthModal/.test(authSource), 'signed-in bridge events must refresh session and close stale auth modals');
assert.ok(/handleAuthFlowEvent[\s\S]*?payload\.type === 'password_updated'[\s\S]*?refreshSessionFromAuthFlowEvent\(\)[\s\S]*?closeAuthModal/.test(authSource), 'password-updated bridge events must refresh session and close stale reset modals');
assert.ok(/refreshSessionFromAuthFlowEvent[\s\S]*?AUTH_FLOW_SESSION_RETRY_ATTEMPTS[\s\S]*?supabase\.auth\.getSession\(\)[\s\S]*?waitForAuthFlowSessionRetry/.test(authSource), 'auth flow bridge must retry session refresh before giving up');
assert.ok(authSource.includes("tr('auth.toast.emailConfirmed'"), 'confirmed-email bridge toast must be localized');
assert.ok(authSource.includes("tr('auth.toast.passwordUpdatedInAnotherTab'"), 'password-updated bridge toast must be localized');
assert.ok(authSource.includes("tr('auth.toast.signedIn'"), 'same-tab signed-in toast must be localized');
assert.ok(authSource.includes("tr('auth.toast.signedOut'"), 'signed-out toast must be localized');
assert.ok(indexSource.includes('id="authCompletionStage"'), 'auth completion stage markup must exist');
assert.ok(indexSource.includes('id="authCompletionContinueBtn"'), 'auth completion continue action must exist');
assert.ok(indexSource.includes('id="authCompletionCloseTabBtn"'), 'auth completion close-tab action must exist');
assert.ok(authSource.includes('const AUTH_COMPLETION_KIND'), 'auth completion kinds must be defined');
assert.ok(authSource.includes('function getCompletionStageConfig()'), 'auth completion copy config must exist');
assert.ok(authSource.includes('function showAuthCompletionStage('), 'auth completion stage renderer must exist');
assert.ok(authSource.includes("authModalState.stage === 'complete'"), 'auth modal must render a completion stage');
assert.ok(authSource.includes('authCompletionContinueBtn'), 'auth completion continue button must be wired');
assert.ok(authSource.includes('authCompletionCloseTabBtn'), 'auth completion close-tab button must be wired');
assert.ok(authSource.includes("tr('auth.completion.closeBlocked'"), 'blocked close-tab fallback must be localized');
assert.ok(/SIGNED_IN[\s\S]*?showAuthCompletionStage/.test(authSource), 'same-tab callback sign-in must show completion stage');
assert.ok(/resetKind === AUTH_RESET_KIND\.PASSWORD_RECOVERY[\s\S]*?showAuthCompletionStage\(AUTH_COMPLETION_KIND\.PASSWORD_UPDATED\)/.test(authSource), 'password recovery submit must show completion stage');

const locales = ['en', 'zh-Hans', 'zh-Hant', 'ja', 'ko', 'es', 'de', 'pt', 'ar', 'hi', 'vi', 'th'];
const catalogDirs = ['data/i18n/messages', 'public/i18n/messages', 'mcp/public/i18n/messages'];
const toastKeys = ['signedIn', 'signedOut', 'emailConfirmed', 'signedInInAnotherTab', 'passwordUpdatedInAnotherTab'];
const messagePaths = [
  ...toastKeys.map((key) => `auth.toast.${key}`),
  'auth.completion.continueHere',
  'auth.completion.closeThisTab',
  'auth.completion.closeBlocked',
  'auth.completion.emailConfirmed.modalTitle',
  'auth.completion.emailConfirmed.modalDesc',
  'auth.completion.emailConfirmed.modalNote',
  'auth.completion.emailConfirmed.stageTitle',
  'auth.completion.emailConfirmed.stageText',
  'auth.completion.signedIn.modalTitle',
  'auth.completion.signedIn.modalDesc',
  'auth.completion.signedIn.modalNote',
  'auth.completion.signedIn.stageTitle',
  'auth.completion.signedIn.stageText',
  'auth.completion.passwordUpdated.modalTitle',
  'auth.completion.passwordUpdated.modalDesc',
  'auth.completion.passwordUpdated.modalNote',
  'auth.completion.passwordUpdated.stageTitle',
  'auth.completion.passwordUpdated.stageText',
];

function getPath(object, dottedPath) {
  return dottedPath.split('.').reduce((value, key) => value?.[key], object);
}

for (const catalogDir of catalogDirs) {
  for (const locale of locales) {
    const catalog = JSON.parse(fs.readFileSync(path.join(root, catalogDir, `${locale}.json`), 'utf8'));
    for (const messagePath of messagePaths) {
      const value = getPath(catalog, messagePath);
      assert.equal(typeof value, 'string', `${catalogDir}/${locale}: ${messagePath} must exist`);
      assert.ok(value.trim().length >= 3, `${catalogDir}/${locale}: ${messagePath} must be message-like`);
      assert.ok(!value.includes('{'), `${catalogDir}/${locale}: ${messagePath} must not contain unresolved placeholders`);
      assert.doesNotMatch(value, /\?{3,}/, `${catalogDir}/${locale}: ${messagePath} must not be mojibake/question marks`);
    }
  }
}

console.log('verify-auth-flow-bridge: ok');
