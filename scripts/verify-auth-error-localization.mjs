import fs from 'node:fs';
import path from 'node:path';

const messagesDir = path.join(process.cwd(), 'data', 'i18n', 'messages');
const requiredErrorKeys = [
  'invalidCredentials',
  'tooManyAttempts',
  'signInFailed',
  'tooManySignupAttempts',
  'passwordMin',
  'signupFailed',
  'resetTooSoon',
  'resetFailed',
  'confirmationTooSoon',
  'resendFailed',
  'signOutFailed',
  'googleFailed',
  'passwordTooShort',
  'passwordsMismatch',
  'updatePasswordFailed'
];

const actionLabelKeys = [
  'continueWithGoogle',
  'forgotPassword',
  'backToSignIn',
  'resendConfirmation',
  'sendResetLink',
  'updatePassword',
  'getNewResetLink'
];
const actionLabelPaths = [
  'app.signIn',
  'account.title',
  'account.menu.account',
  'account.menu.manageSubscription',
  'account.menu.signOut',
  'account.profile.saveDisplayName',
  'account.password.setPassword',
  'account.password.sendResetEmail',
  'checkout.cta',
  'auth.copy.default.signin.submit',
  'auth.copy.default.signup.submit',
  'auth.copy.default.signin.toggleAction',
  'auth.copy.default.signup.toggleAction'
];
const requiredMessagePaths = [
  'auth.forgot.description',
  'auth.forgot.note',
  'auth.forgot.sentStatus',
  'auth.reset.createForEmail',
  'auth.reset.chooseForEmail',
  'auth.reset.createForAccount',
  'auth.reset.chooseForAccount',
  'auth.verify.existing.modalDesc',
  'auth.verify.existing.modalNote',
  'auth.verify.existing.stageText',
  'auth.verify.unconfirmed.modalDesc',
  'auth.verify.unconfirmed.modalNote',
  'auth.verify.unconfirmed.stageText',
  'auth.verify.unconfirmed.resentStatus',
  'auth.verify.callback.resetTitle',
  'auth.verify.callback.linkTitle',
  'auth.verify.callback.resetDesc',
  'auth.verify.callback.linkDesc',
  'auth.verify.callback.resetNote',
  'auth.verify.callback.linkNote',
  'auth.verify.callback.stageTitle',
  'auth.verify.callback.stageText',
  'auth.verify.pending.modalDesc',
  'auth.verify.pending.modalNote',
  'auth.verify.pending.stageText',
  'auth.verify.pending.sentStatus',
  'auth.verify.pending.resentStatus',
  'auth.toast.passwordSignInAdded',
  'auth.toast.passwordUpdated',
  'account.toast.updated',
  'account.profile.enterName',
  'account.profile.nameTooShort',
  'account.profile.saved',
  'account.profile.saveFailed',
  'account.password.noEmail',
  'account.password.addStatus',
  'account.password.resetSent',
  'account.password.resetToast',
  'account.password.resetInSeconds',
  'checkout.openingPortal',
  'checkout.signInAgainPortal',
  'checkout.portalUnavailable',
  'checkout.portalFailed',
  'auth.copy.purchase.signin.desc',
  'auth.copy.purchase.signup.desc',
  'auth.copy.subscribe.signin.desc',
  'auth.copy.subscribe.signup.desc',
  'auth.copy.pro.signin.desc',
  'auth.copy.pro.signup.desc'
];

const failures = [];
const replacementCharacter = String.fromCharCode(0xfffd);
const forbiddenValueMarkers = ['????', replacementCharacter];

function minimumUsefulLength(value) {
  const letters = Array.from(value).filter((char) => /\p{Letter}/u.test(char));
  if (!letters.length) return 12;
  const latinLetters = letters.filter((char) => /\p{Script=Latin}/u.test(char));
  return latinLetters.length / letters.length > 0.6 ? 12 : 6;
}

function collectAuthActionLabels(auth) {
  const labels = new Set();
  for (const key of actionLabelKeys) {
    if (typeof auth[key] === 'string') labels.add(auth[key].trim());
  }
  for (const context of Object.values(auth.copy || {})) {
    for (const mode of Object.values(context || {})) {
      for (const key of ['title', 'submit', 'toggleAction']) {
        if (typeof mode?.[key] === 'string') labels.add(mode[key].trim());
      }
    }
  }
  return labels;
}

function readPath(source, dottedPath) {
  return dottedPath.split('.').reduce((value, key) => value?.[key], source);
}

function flattenMessages(value, prefix = '', out = []) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return out;
  for (const [key, child] of Object.entries(value)) {
    const nextKey = prefix ? `${prefix}.${key}` : key;
    if (child && typeof child === 'object' && !Array.isArray(child)) {
      flattenMessages(child, nextKey, out);
    } else if (typeof child === 'string') {
      out.push([nextKey, child]);
    }
  }
  return out;
}

function isLikelyActionPath(dottedPath) {
  return /(?:^|\.)(?:cta|submit|toggleAction|sendResetLink|resendConfirmation|continueWithGoogle|forgotPassword|backToSignIn|updatePassword|getNewResetLink|saveDisplayName|setPassword|sendResetEmail|signOut|signIn|copy|copySvg|copyBase64|download|downloadSvg|downloadPng|clear|clearAll|close|cancel|revoke|generateKey|manageSubscription)$/.test(dottedPath);
}

function collectActionLabels(catalog) {
  const labels = collectAuthActionLabels(catalog.auth || {});
  for (const dottedPath of actionLabelPaths) {
    const value = readPath(catalog, dottedPath);
    if (typeof value === 'string') labels.add(value.trim());
  }
  for (const [dottedPath, value] of flattenMessages(catalog)) {
    if (isLikelyActionPath(dottedPath)) labels.add(value.trim());
  }
  return labels;
}

function placeholders(value) {
  return Array.from(String(value).matchAll(/\{([a-zA-Z0-9_]+)\}/g), (match) => match[1]).sort();
}

function placeholderSignature(value) {
  return placeholders(value).join(',');
}

const englishCatalog = JSON.parse(fs.readFileSync(path.join(messagesDir, 'en.json'), 'utf8'));

for (const fileName of fs.readdirSync(messagesDir).filter((file) => file.endsWith('.json')).sort()) {
  const locale = fileName.replace(/\.json$/, '');
  const catalog = JSON.parse(fs.readFileSync(path.join(messagesDir, fileName), 'utf8'));
  const auth = catalog.auth || {};
  const labels = collectActionLabels(catalog);
  const errors = auth.errors || {};

  for (const key of requiredErrorKeys) {
    const value = errors[key];
    if (typeof value !== 'string' || !value.trim()) {
      failures.push(`${locale}: auth.errors.${key} is missing`);
      continue;
    }

    const normalized = value.trim();
    if (labels.has(normalized)) {
      failures.push(`${locale}: auth.errors.${key} is an action label: "${normalized}"`);
    }

    const minLength = minimumUsefulLength(normalized);
    if (normalized.length < minLength) {
      failures.push(`${locale}: auth.errors.${key} is too short to be a useful error message: "${normalized}"`);
    }
  }

  for (const dottedPath of requiredMessagePaths) {
    const value = readPath(catalog, dottedPath);
    if (typeof value !== 'string' || !value.trim()) {
      failures.push(`${locale}: ${dottedPath} is missing`);
      continue;
    }

    const normalized = value.trim();
    if (forbiddenValueMarkers.some((marker) => normalized.includes(marker))) {
      failures.push(`${locale}: ${dottedPath} contains damaged placeholder text`);
    }

    if (dottedPath === 'account.password.resetInSeconds' && normalized.includes('?')) {
      failures.push(`${locale}: ${dottedPath} contains a literal question mark, which usually means the localized countdown text was corrupted`);
    }

    if (labels.has(normalized)) {
      failures.push(`${locale}: ${dottedPath} is an action label: "${normalized}"`);
    }

    const englishValue = readPath(englishCatalog, dottedPath);
    if (typeof englishValue === 'string' && placeholderSignature(englishValue) !== placeholderSignature(normalized)) {
      failures.push(`${locale}: ${dottedPath} placeholder mismatch; expected {${placeholderSignature(englishValue)}} got {${placeholderSignature(normalized)}}`);
    }

    const minLength = minimumUsefulLength(normalized);
    if (normalized.length < minLength) {
      failures.push(`${locale}: ${dottedPath} is too short to be a useful message: "${normalized}"`);
    }
  }
}

if (failures.length) {
  console.error('Auth error localization verification failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Auth error localization verification passed.');
