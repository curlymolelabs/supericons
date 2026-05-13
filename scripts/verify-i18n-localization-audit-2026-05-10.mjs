import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { SUPPORTED_LOCALES } from '../lib/i18n/locales.js';
import { buildRouteUrl } from '../lib/view-route-policy.js';

const sourceDir = path.join('data', 'i18n', 'messages');

function read(locale) {
  return JSON.parse(fs.readFileSync(path.join(sourceDir, `${locale}.json`), 'utf8'));
}

function stripHtml(value) {
  return String(value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function privacyParagraphs(catalog) {
  return [...String(catalog.legal?.privacy?.bodyHtml || '').matchAll(/<section\b[^>]*>[\s\S]*?<p>([\s\S]*?)<\/p>/g)]
    .map((match) => stripHtml(match[1]));
}

function assertLong(locale, key, value, min = 16) {
  const text = stripHtml(value);
  const compact = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Script=Thai}]/u.test(text);
  const required = compact ? Math.ceil(min * 0.45) : min;
  assert.ok(text.length >= required, `${locale}:${key} is too thin: ${text}`);
}

function assertFlow(locale, catalog) {
  const checks = [
    ['loggedIn.downloads.noCollections', catalog.loggedIn?.downloads?.noCollections],
    ['loggedIn.downloads.browseHint', catalog.loggedIn?.downloads?.browseHint],
    ['loggedIn.dashboard.date', catalog.loggedIn?.dashboard?.date],
    ['loggedIn.dashboard.actions', catalog.loggedIn?.dashboard?.actions],
    ['purchaseFlow.signInToPurchase', catalog.purchaseFlow?.signInToPurchase],
    ['purchaseFlow.redirecting', catalog.purchaseFlow?.redirecting],
    ['purchaseFlow.checkoutFailed', catalog.purchaseFlow?.checkoutFailed],
    ['purchaseFlow.paymentError', catalog.purchaseFlow?.paymentError],
    ['purchaseFlow.proAnnualDescription', catalog.purchaseFlow?.proAnnualDescription],
    ['claimFlow.title', catalog.claimFlow?.title],
    ['claimFlow.description', catalog.claimFlow?.description],
    ['claimFlow.confirm', catalog.claimFlow?.confirm],
    ['claimFlow.cancel', catalog.claimFlow?.cancel],
  ];

  for (const [key, value] of checks) {
    assert.ok(value && value !== '...' && value !== 'Checkout' && value !== '{name}', `${locale}:${key} is a placeholder`);
  }

  assert.notEqual(catalog.loggedIn?.downloads?.browseHint, catalog.nav?.collections, `${locale}:browseHint says only collections`);
  assert.notEqual(catalog.loggedIn?.dashboard?.actions, catalog.nav?.collections, `${locale}:dashboard.actions says only collections`);
  assert.notEqual(catalog.purchaseFlow?.proAnnualDescription, catalog.nav?.collections, `${locale}:proAnnualDescription says only collections`);
  assert.notEqual(catalog.claimFlow?.confirm, catalog.nav?.collections, `${locale}:claimFlow.confirm says only collections`);
  assert.notEqual(catalog.claimFlow?.cancel, catalog.actions?.close, `${locale}:claimFlow.cancel says close`);

  assertLong(locale, 'loggedIn.downloads.browseHint', catalog.loggedIn?.downloads?.browseHint, 24);
  assertLong(locale, 'purchaseFlow.signInToPurchase', catalog.purchaseFlow?.signInToPurchase, 14);
  assertLong(locale, 'purchaseFlow.paymentError', catalog.purchaseFlow?.paymentError, 22);
  assertLong(locale, 'purchaseFlow.proAnnualDescription', catalog.purchaseFlow?.proAnnualDescription, 60);
  assertLong(locale, 'claimFlow.description', catalog.claimFlow?.description, 35);
}

function assertPrivacy(locale, catalog) {
  const privacy = catalog.legal?.privacy?.bodyHtml || '';
  const paras = privacyParagraphs(catalog);
  assert.ok((privacy.match(/<section\b/g) || []).length >= 10, `${locale}:privacy needs 10 sections`);
  assert.ok(paras.length >= 10, `${locale}:privacy needs detailed paragraphs`);
  assert.ok(new Set(paras).size >= 8, `${locale}:privacy paragraphs are too repetitive`);
}

function assertSeo(locale, catalog) {
  assertLong(locale, 'seo.title', catalog.seo?.title, 12);
  assertLong(locale, 'seo.description', catalog.seo?.description, 60);
  assertLong(locale, 'seo.twitterDescription', catalog.seo?.twitterDescription, 35);
  if (locale !== 'en') {
    assert.notEqual(catalog.seo.title, read('en').seo.title, `${locale}:seo title must be localized`);
    assert.notEqual(catalog.seo.description, read('en').seo.description, `${locale}:seo description must be localized`);
  }
}

for (const locale of SUPPORTED_LOCALES) {
  const catalog = read(locale);
  assertSeo(locale, catalog);
  if (locale !== 'en') {
    assertPrivacy(locale, catalog);
    assertFlow(locale, catalog);
    assert.notEqual(catalog.pricing?.plans?.free?.cta, catalog.pricing?.plans?.free?.name, `${locale}:free CTA repeats plan name`);
    assertLong(locale, 'pricing.plans.free.cta', catalog.pricing?.plans?.free?.cta, 10);
  }
}

for (const locale of ['zh-Hans', 'zh-Hant']) {
  const pages = read(locale).docs.pages;
  assert.equal(pages['docs-access-api-keys'].navLabel.includes('API'), true, `${locale}:API Keys nav should retain API`);
  assert.ok(/MCP/.test(pages['docs-access-api-keys'].summary), `${locale}:API keys summary should retain MCP`);
  assert.ok(/Motion Lab/.test(pages['docs-access-premium'].summary), `${locale}:premium summary should retain Motion Lab`);
  assert.ok(/Converter/.test(pages['docs-access-premium'].summary), `${locale}:premium summary should retain Converter`);
  assert.ok(/MCP/.test(pages['docs-troubleshooting'].summary), `${locale}:troubleshooting summary should retain MCP`);
  assert.ok(/API/.test(pages['docs-troubleshooting'].summary), `${locale}:troubleshooting summary should retain API`);
  assert.ok(/trace class/.test(pages['docs-converter-settings'].summary), `${locale}:converter settings summary should retain trace class`);
}

assert.equal(
  buildRouteUrl({ pathname: '/', view: 'pricing', search: '?locale=ja' }),
  '/?locale=ja&view=pricing',
  'buildRouteUrl should preserve locale for persisted routes',
);
assert.equal(
  buildRouteUrl({ pathname: '/', view: 'icons', search: '?locale=ar&view=pricing' }),
  '/?locale=ar',
  'buildRouteUrl should preserve locale when returning to icons',
);

const css = fs.readFileSync('style.css', 'utf8');
const rtlSelectors = css.match(/html\[dir="rtl"\]/g) || [];
assert.ok(rtlSelectors.length >= 12, `expected broader RTL CSS coverage, found ${rtlSelectors.length}`);

const index = fs.readFileSync('index.html', 'utf8');
for (const locale of SUPPORTED_LOCALES) {
  const hreflang = locale === 'zh-Hans' ? 'zh-Hans' : locale === 'zh-Hant' ? 'zh-Hant' : locale;
  assert.ok(index.includes(`hreflang="${hreflang}"`), `missing hreflang for ${locale}`);
}
assert.ok(index.includes('hreflang="x-default"'), 'missing x-default hreflang');

console.log('verify-i18n-localization-audit-2026-05-10: ok');
