import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const sourceDir = path.join('data', 'i18n', 'messages');
const outputDirs = [path.join('public', 'i18n', 'messages'), path.join('mcp', 'public', 'i18n', 'messages')];
const locales = fs.readdirSync(sourceDir).filter((file) => file.endsWith('.json')).map((file) => file.replace(/\.json$/, ''));

const forbiddenFallbacks = [
  'This localized summary covers the same operational policy',
  'Supericons provides free and premium icon assets for digital products. Free icons keep their original open-source licenses. Premium collections are owned by Curly Mole Labs and are covered by your purchased license.',
  'Supericons is operated by Curly Mole Labs. We may collect account, purchase, subscription, support, and cookie-free product analytics data needed to run the service.',
];
const forbiddenPricingFallbacks = [
  'Everything in Free',
  'Start for Free',
  'Browse Packs',
  'Get Launch Bundle',
  'What are the 8 premium animated packs',
  'How do Pro Monthly and Pro Annual collection access work',
  'AI semantic search',
];

function readCatalog(dir, locale) {
  return JSON.parse(fs.readFileSync(path.join(dir, `${locale}.json`), 'utf8'));
}

function count(value, pattern) {
  return (String(value).match(pattern) || []).length;
}

function stripHtml(value) {
  return String(value).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

function extractHeadings(html) {
  return [...String(html).matchAll(/<h3\b[^>]*>(.*?)<\/h3>/g)].map((match) => stripHtml(match[1]));
}

function splitPipe(value) {
  return String(value || '').split('|').map((item) => item.trim()).filter(Boolean);
}

function normalizedTitle(value) {
  return stripHtml(value).replace(/^\d+[\s.)-]*/, '').trim().toLowerCase();
}

function isThinText(value) {
  const text = stripHtml(value);
  const latinWords = text.match(/[A-Za-zÀ-ž]+/g) || [];
  const hasCjkOrThai = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Script=Thai}]/u.test(text);
  const hasArabicOrIndic = /[\p{Script=Arabic}\p{Script=Devanagari}]/u.test(text);
  if (text.length < 8) return true;
  if (!hasCjkOrThai && !hasArabicOrIndic && latinWords.length <= 1 && text.length < 18) return true;
  return false;
}

function assertNoRepeatedHeadings(locale, pageName, headings) {
  assert.ok(headings.length > 0, `${locale} ${pageName} headings missing`);
  const normalized = headings.map(normalizedTitle);
  const unique = new Set(normalized);
  assert.equal(unique.size, normalized.length, `${locale} ${pageName} has duplicate section headings`);
  assert.ok(unique.size >= Math.min(headings.length, 6), `${locale} ${pageName} headings are too repetitive`);
}

function assertLegal(locale, catalog) {
  const terms = catalog.legal?.terms?.bodyHtml || '';
  const privacy = catalog.legal?.privacy?.bodyHtml || '';
  assert.ok(count(terms, /<section\b/g) >= 7, `${locale} terms must include at least 7 sections`);
  assert.ok(count(privacy, /<section\b/g) >= 10, `${locale} privacy must include at least 10 sections`);
  assert.ok(count(terms, /<p\b/g) >= 10, `${locale} terms must keep detailed paragraph coverage`);
  assert.ok(count(privacy, /<p\b/g) >= 10, `${locale} privacy must keep detailed paragraph coverage`);
  assert.ok(terms.includes('id="single-icon-license"'), `${locale} terms must include the single-icon license anchor`);
  assert.ok(terms.includes('v1.0'), `${locale} terms must include the single-icon license version`);
  assert.ok(terms.includes('hello@supericons.dev'), `${locale} terms must include the license support email`);
  assertNoRepeatedHeadings(locale, 'terms', extractHeadings(terms));
  assertNoRepeatedHeadings(locale, 'privacy', extractHeadings(privacy));
  for (const snippet of forbiddenFallbacks) {
    assert.ok(!terms.includes(snippet), `${locale} terms contains old fallback snippet`);
    assert.ok(!privacy.includes(snippet), `${locale} privacy contains old fallback snippet`);
  }
}

function assertListQuality(locale, fieldName, value, expectedCount, minLength = 8) {
  const items = splitPipe(value);
  assert.equal(items.length, expectedCount, `${locale} ${fieldName} item count`);
  for (const item of items) {
    const text = stripHtml(item);
    const hasCompactScript = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Script=Thai}]/u.test(text);
    const requiredLength = hasCompactScript ? Math.min(minLength, 4) : minLength;
    assert.ok(text.length >= requiredLength, `${locale} ${fieldName} item is too short: ${item}`);
    assert.ok(!/^(pro|mcp|premium|ai|svg|png|css)$/i.test(text), `${locale} ${fieldName} item is a placeholder: ${item}`);
  }
}

function assertPricing(locale, catalog) {
  const pricing = catalog.pricing;
  assert.ok(pricing?.headerTitle, `${locale} pricing.headerTitle missing`);
  assert.ok(pricing?.headerSubtitle, `${locale} pricing.headerSubtitle missing`);
  assert.ok(pricing?.plans?.free?.name, `${locale} pricing free plan missing`);
  assert.ok(pricing?.plans?.pro?.monthlyFeatures, `${locale} pricing pro monthly features missing`);
  assert.ok(pricing?.plans?.singlePack?.features, `${locale} pricing single pack features missing`);
  assert.ok(pricing?.plans?.launchBundle?.features, `${locale} pricing launch bundle features missing`);
  assert.ok(stripHtml(pricing?.plans?.singlePack?.period).length >= 2, `${locale} single pack period missing`);
  assert.ok(stripHtml(pricing?.plans?.launchBundle?.period).length >= 2, `${locale} launch bundle period missing`);
  assertListQuality(locale, 'free features', pricing?.plans?.free?.features, 6);
  assertListQuality(locale, 'pro monthly features', pricing?.plans?.pro?.monthlyFeatures, 9);
  assertListQuality(locale, 'pro annual features', pricing?.plans?.pro?.annualFeatures, 9);
  assertListQuality(locale, 'single pack features', pricing?.plans?.singlePack?.features, 7);
  assertListQuality(locale, 'launch bundle features', pricing?.plans?.launchBundle?.features, 7);
  assertListQuality(locale, 'FAQ questions', pricing?.faq?.questions, 7, 12);
  assertListQuality(locale, 'FAQ answers', pricing?.faq?.answers, 7, 45);
  const answers = splitPipe(pricing?.faq?.answers).map(stripHtml);
  assert.ok(new Set(answers).size >= 6, `${locale} pricing FAQ answers are too repetitive`);
  for (const [index, answer] of answers.entries()) {
    assert.ok(!isThinText(answer), `${locale} pricing FAQ answer ${index + 1} is too thin: ${answer}`);
  }
  if (locale !== 'en') {
    const pricingText = JSON.stringify(pricing);
    for (const snippet of forbiddenPricingFallbacks) {
      assert.ok(!pricingText.includes(snippet), `${locale} pricing contains English fallback: ${snippet}`);
    }
    if (locale !== 'es') {
      assert.ok(!pricingText.includes('por pack'), `${locale} pricing contains Spanish fallback: por pack`);
      assert.ok(!pricingText.includes('pago único'), `${locale} pricing contains Spanish fallback: pago único`);
    }
    const allowedRootKeys = ['headerTitle', 'headerSubtitle', 'freeIconsAcrossLibraries', 'mcpServerFreeIcons', 'monthly', 'annual', 'save45', 'save28', 'mostPopular', 'faqTitle', 'plans', 'faq'];
    for (const key of Object.keys(pricing)) {
      assert.ok(allowedRootKeys.includes(key), `${locale} pricing contains stale helper key: ${key}`);
    }
  }
}

for (const locale of locales) {
  const source = readCatalog(sourceDir, locale);
  assertLegal(locale, source);
  assertPricing(locale, source);
  for (const dir of outputDirs) {
    const output = readCatalog(dir, locale);
    assert.deepEqual(output.legal, source.legal, `${locale} legal catalog mismatch in ${dir}`);
    assert.deepEqual(output.pricing, source.pricing, `${locale} pricing catalog mismatch in ${dir}`);
  }
}

console.log('verify-commercial-localization: ok');
