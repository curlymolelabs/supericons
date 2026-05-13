import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const sourceDir = path.join('data', 'i18n', 'messages');
const outputDirs = [path.join('public', 'i18n', 'messages'), path.join('mcp', 'public', 'i18n', 'messages')];
const locales = fs.readdirSync(sourceDir).filter((file) => file.endsWith('.json')).map((file) => file.replace(/\.json$/, ''));

const spanishLeakSnippets = [
  'Comprar packs te da esos iconos',
  'Previsualiza y exporta animaciones de iconos',
  'Corrige problemas comunes con la configuración de MCP',
];

const englishConfirmToast = [
  'This removes every saved favorite stored in this browser',
  'This removes your recent icon history stored in this browser',
  'This only affects data stored in the current browser',
  'This Device',
  'Only this browser storage is affected',
  'Favorites cleared on this device',
  'Recent icons cleared on this device',
];

function readCatalog(root, locale) {
  return JSON.parse(fs.readFileSync(path.join(root, `${locale}.json`), 'utf8'));
}

function flatten(value, prefix = '', out = new Map()) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    for (const [key, child] of Object.entries(value)) flatten(child, prefix ? `${prefix}.${key}` : key, out);
  } else {
    out.set(prefix, String(value ?? ''));
  }
  return out;
}

function stripHtml(value) {
  return String(value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function privacyParagraphs(catalog) {
  return [...String(catalog.legal?.privacy?.bodyHtml || '').matchAll(/<section\b[^>]*>.*?<p>(.*?)<\/p>/gs)]
    .map((match) => stripHtml(match[1]));
}

function longEnoughForLocale(locale, value, latinMin, compactMin = Math.ceil(latinMin * 0.45)) {
  const text = stripHtml(value);
  const compact = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Script=Thai}]/u.test(text);
  return text.length >= (compact ? compactMin : latinMin);
}

function assertCommon(locale, catalog) {
  const flat = flatten(catalog);
  if (locale !== 'es') {
    const serialized = JSON.stringify(catalog.docs?.pages || {});
    for (const snippet of spanishLeakSnippets) {
      assert.ok(!serialized.includes(snippet), `${locale} docs contains Spanish leak: ${snippet}`);
    }
  }
  if (locale !== 'en') {
    for (const snippet of englishConfirmToast) {
      assert.ok(!JSON.stringify(catalog.confirm || {}).includes(snippet), `${locale} confirm contains English fallback`);
      assert.ok(!JSON.stringify(catalog.toast || {}).includes(snippet), `${locale} toast contains English fallback`);
    }
    assert.notEqual(flat.get('auth.copy.default.signin.note'), flat.get('auth.copy.default.signin.desc'), `${locale} default signin note repeats account description`);
    assert.notEqual(flat.get('auth.copy.default.signup.note'), flat.get('auth.copy.default.signup.desc'), `${locale} default signup note repeats account description`);
  }
}

function assertDocs(locale, catalog) {
  if (['de', 'pt', 'ar', 'hi', 'vi', 'th'].includes(locale)) {
    assert.notEqual(catalog.docs?.pages?.['docs-mcp-others']?.navLabel, 'Other MCP clients', `${locale} docs-mcp-others navLabel is English`);
  }
  if (locale === 'de') {
    const others = catalog.docs?.pages?.['docs-mcp-others'] || {};
    const universal = catalog.docs?.pages?.['docs-mcp-universal'] || {};
    assert.notEqual(others.summary, universal.summary, 'de docs-mcp-others summary must not copy universal setup');
    assert.notEqual(others.bodyHtml, universal.bodyHtml, 'de docs-mcp-others bodyHtml must not copy universal setup');
  }
}

function assertLoggedIn(locale, catalog) {
  if (locale === 'en') return;
  const apiValues = [...flatten(catalog.apiKeys).values()];
  assert.ok(new Set(apiValues).size >= 40, `${locale} apiKeys has too many repeated placeholders`);
  assert.notEqual(catalog.apiKeys.generateKey, catalog.account?.menu?.apiKeys, `${locale} apiKeys.generateKey is a section-title placeholder`);
  assert.notEqual(catalog.apiKeys.revoke, catalog.actions?.close, `${locale} apiKeys.revoke says close`);
  assert.ok(longEnoughForLocale(locale, catalog.apiKeys.setup?.pro, 40), `${locale} apiKeys.setup.pro is too thin`);
  assert.ok(longEnoughForLocale(locale, catalog.apiKeys.limitNote, 25), `${locale} apiKeys.limitNote is too thin`);
  assert.ok(longEnoughForLocale(locale, catalog.apiKeys.modalWarning, 25), `${locale} apiKeys.modalWarning is too thin`);
  if (['de', 'pt', 'ar'].includes(locale)) {
    assert.notEqual(catalog.loggedIn?.dashboard?.date, catalog.account?.menu?.purchases, `${locale} dashboard.date says purchases`);
    assert.notEqual(catalog.loggedIn?.dashboard?.actions, catalog.nav?.collections, `${locale} dashboard.actions says collections`);
    assert.ok(String(catalog.purchaseFlow?.paymentError || '').length > 20, `${locale} purchaseFlow.paymentError is too thin`);
    assert.ok(String(catalog.claimFlow?.description || '').length > 35, `${locale} claimFlow.description is too thin`);
    const privacy = privacyParagraphs(catalog);
    assert.ok(new Set(privacy).size >= 8, `${locale} privacy section bodies are too repetitive`);
  }
}

for (const locale of locales) {
  const source = readCatalog(sourceDir, locale);
  assertCommon(locale, source);
  assertDocs(locale, source);
  assertLoggedIn(locale, source);
  for (const outputDir of outputDirs) {
    const output = readCatalog(outputDir, locale);
    assert.deepEqual(output.confirm, source.confirm, `${locale} confirm mismatch in ${outputDir}`);
    assert.deepEqual(output.toast, source.toast, `${locale} toast mismatch in ${outputDir}`);
    assert.deepEqual(output.docs.pages, source.docs.pages, `${locale} docs page mismatch in ${outputDir}`);
    assert.deepEqual(output.apiKeys, source.apiKeys, `${locale} apiKeys mismatch in ${outputDir}`);
    assert.deepEqual(output.loggedIn, source.loggedIn, `${locale} loggedIn mismatch in ${outputDir}`);
    assert.deepEqual(output.purchaseFlow, source.purchaseFlow, `${locale} purchaseFlow mismatch in ${outputDir}`);
    assert.deepEqual(output.claimFlow, source.claimFlow, `${locale} claimFlow mismatch in ${outputDir}`);
    assert.deepEqual(output.legal.privacy, source.legal.privacy, `${locale} privacy mismatch in ${outputDir}`);
  }
}

console.log('verify-i18n-audit-findings: ok');
