import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const sourceDir = path.join('data', 'i18n', 'messages');
const locales = fs.readdirSync(sourceDir).filter((file) => file.endsWith('.json')).map((file) => file.replace(/\.json$/, ''));
const requiredRoots = ['loggedIn', 'apiKeys', 'purchaseFlow', 'claimFlow'];

function readCatalog(locale) {
  return JSON.parse(fs.readFileSync(path.join(sourceDir, `${locale}.json`), 'utf8'));
}

function flattenKeys(value, prefix = '') {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [prefix];
  return Object.entries(value).flatMap(([key, child]) => flattenKeys(child, prefix ? `${prefix}.${key}` : key));
}

const en = readCatalog('en');
const expectedKeys = requiredRoots.flatMap((root) => flattenKeys(en[root], root));

for (const locale of locales) {
  const catalog = readCatalog(locale);
  for (const root of requiredRoots) {
    assert.ok(catalog[root], `${locale} missing ${root}`);
  }
  const keys = new Set(requiredRoots.flatMap((root) => flattenKeys(catalog[root], root)));
  for (const key of expectedKeys) {
    assert.ok(keys.has(key), `${locale} missing ${key}`);
  }
}

const store = fs.readFileSync('store.js', 'utf8');
assert.ok(store.includes('function getStripeLocale()'), 'store.js must map app locale to Stripe locale');
assert.ok(store.includes('function buildLocalizedReturnUrl'), 'store.js must preserve app locale in Stripe return URLs');
assert.ok((store.match(/locale: getStripeLocale\(\)/g) || []).length >= 3, 'checkout requests must send Stripe locale');
assert.ok((store.match(/success_url: buildLocalizedReturnUrl/g) || []).length >= 3, 'checkout success URLs must preserve app locale');
assert.ok((store.match(/cancel_url: buildLocalizedReturnUrl/g) || []).length >= 3, 'checkout cancel URLs must preserve app locale');
assert.ok(store.includes("t('apiKeys.modalTitle'"), 'API key modal must read from i18n catalog');
assert.ok(store.includes("t('loggedIn.dashboard.purchaseHistory'"), 'purchase dashboard must read from i18n catalog');

console.log('verify-logged-in-stripe-localization: ok');
