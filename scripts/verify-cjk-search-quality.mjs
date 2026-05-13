import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  MULTILINGUAL_SEARCH_LOCALES,
  expandCjkQuery,
  normalizeCjkSearchText,
} from '../lib/cjk-search-core.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');
const termsPath = path.join(rootDir, 'data/i18n/cjk-search-terms.json');
const publicTermsPath = path.join(rootDir, 'public/cjk-search-terms.json');
const packagedTermsPath = path.join(rootDir, 'mcp/public/cjk-search-terms.json');
const auditPath = path.join(rootDir, 'data/i18n/private/cjk-quality-audit.json');
const synonymsPath = path.join(rootDir, 'public/synonyms.json');

const MOJIBAKE_PATTERN = /(?:ÃƒÆ’|Ãƒâ€š|ÃƒÂ|ÃƒËœ|Ãƒâ„¢|ÃƒÂ |ÃƒÂ¡|ÃƒÂ£|ÃƒÂ¤|ÃƒÂ¥|ÃƒÂ¦|ÃƒÂ§|ÃƒÂ¨|ÃƒÂ©|ÃƒÂ­|ÃƒÂ°|ÃƒÂ±|ÃƒÂ²|ÃƒÂ³|ÃƒÂµ|ÃƒÂ¶|ÃƒÂ¸|ÃƒÂ¹|ÃƒÂº|ÃƒÂ½|ÃƒÂ¾|Ã¯Â¿Â½)/;
const CORRUPTED_LATIN_PATTERN = /\?/;
const PUBLIC_METADATA_PATTERN = /(?:openai|deepl|google cloud|microsoft translator|reviewer_model|reviewer_reasoning_effort|internal_review_status|prompt_notes|prompt_strategy|workflow_trace|agent_notes|private_confidence_rationale)/i;

const localeScriptTests = {
  'zh-Hans': /\p{Script=Han}/u,
  'zh-Hant': /\p{Script=Han}/u,
  ja: /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}ー]/u,
  ko: /\p{Script=Hangul}/u,
  es: /\p{Script=Latin}/u,
  de: /\p{Script=Latin}/u,
  pt: /\p{Script=Latin}/u,
  ar: /\p{Script=Arabic}/u,
  hi: /\p{Script=Devanagari}/u,
  vi: /\p{Script=Latin}/u,
  th: /\p{Script=Thai}/u,
};

function assertNoMojibake(value, context) {
  assert.ok(!MOJIBAKE_PATTERN.test(String(value || '')), `${context} contains likely mojibake: ${value}`);
  assert.ok(!CORRUPTED_LATIN_PATTERN.test(String(value || '')), `${context} contains likely corrupted Latin text: ${value}`);
}

function valuesForRecord(record) {
  return [
    record.term,
    ...(record.variants || []),
    ...(record.maps_to || []),
    ...(record.quality_warnings || []),
  ];
}

function termFor(data, locale, concept, variantIndex = -1) {
  const record = data.terms.find((item) => item.locale === locale && item.concept === concept);
  assert.ok(record, `missing term for ${locale}:${concept}`);
  return variantIndex >= 0 ? record.variants[variantIndex] : record.term;
}

const data = JSON.parse(await fs.readFile(termsPath, 'utf8'));
const publicData = JSON.parse(await fs.readFile(publicTermsPath, 'utf8'));
const publicTermsRaw = await fs.readFile(termsPath, 'utf8');
const websiteTermsRaw = await fs.readFile(publicTermsPath, 'utf8');
const packagedData = JSON.parse(await fs.readFile(packagedTermsPath, 'utf8'));
const packagedTermsRaw = await fs.readFile(packagedTermsPath, 'utf8');
const audit = JSON.parse(await fs.readFile(auditPath, 'utf8'));
const synonyms = JSON.parse(await fs.readFile(synonymsPath, 'utf8'));
const EXPECTED_CONCEPTS = Object.keys(synonyms);

assert.equal(data.version, 1);
assert.deepEqual(publicData, data, 'website public CJK terms must match source terms');
assert.deepEqual(packagedData, data, 'packaged MCP CJK terms must match source terms');
assert.ok(!PUBLIC_METADATA_PATTERN.test(publicTermsRaw), 'source public terms must not contain internal model or workflow metadata');
assert.ok(!PUBLIC_METADATA_PATTERN.test(websiteTermsRaw), 'website public terms must not contain internal model or workflow metadata');
assert.ok(!PUBLIC_METADATA_PATTERN.test(packagedTermsRaw), 'packaged public terms must not contain internal model or workflow metadata');
assert.deepEqual(data.locales, MULTILINGUAL_SEARCH_LOCALES);
assert.equal(audit.version, 1);
assert.ok(Array.isArray(audit.socratic_audit), 'internal audit must include socratic_audit');
assert.ok(Array.isArray(audit.design_thinking_audit), 'internal audit must include design_thinking_audit');
assert.ok(Array.isArray(audit.red_team_audit), 'internal audit must include red_team_audit');

for (const locale of MULTILINGUAL_SEARCH_LOCALES) {
  const records = data.terms.filter((record) => record.locale === locale);
  assert.equal(records.length, EXPECTED_CONCEPTS.length, `${locale} must cover all synonym concepts`);

  const concepts = new Set();
  const normalizedTerms = new Map();
  const scriptPattern = localeScriptTests[locale];
  assert.ok(scriptPattern, `missing script validator for ${locale}`);

  for (const record of records) {
    assert.equal(record.gate, 'auto_accept', `${locale}:${record.concept} must be auto_accept`);
    assert.ok(EXPECTED_CONCEPTS.includes(record.concept), `${locale}:${record.concept} is not in public synonyms`);
    assert.ok(Number(record.quality_score) >= 0.85, `${locale}:${record.concept} quality score is too low`);
    assert.ok(Number(record.source_confidence) >= 0.85, `${locale}:${record.concept} source confidence is too low`);
    assert.ok(Array.isArray(record.quality_warnings), `${locale}:${record.concept} quality_warnings must be an array`);
    assert.ok(record.quality_warnings.length === 0, `${locale}:${record.concept} must not ship warnings`);
    assert.ok(Array.isArray(record.maps_to) && record.maps_to.includes(record.concept), `${locale}:${record.concept} maps_to must include its concept`);
    assert.ok(scriptPattern.test(record.term), `${locale}:${record.concept} term has unexpected script: ${record.term}`);

    const normalized = normalizeCjkSearchText(record.term);
    assert.ok(normalized, `${locale}:${record.concept} normalizes to empty`);
    const previousConcept = normalizedTerms.get(normalized);
    assert.ok(!previousConcept || previousConcept === record.concept, `${locale} duplicate normalized term across concepts: ${record.term}`);
    normalizedTerms.set(normalized, record.concept);
    concepts.add(record.concept);

    for (const value of valuesForRecord(record)) {
      assertNoMojibake(value, `${locale}:${record.concept}`);
    }

    for (const variant of record.variants || []) {
      assert.ok(normalizeCjkSearchText(variant), `${locale}:${record.concept} variant normalizes to empty`);
      assertNoMojibake(variant, `${locale}:${record.concept} variant`);
    }
  }

  assert.deepEqual([...concepts].sort(), [...EXPECTED_CONCEPTS].sort(), `${locale} concept coverage mismatch`);
}

const smokeCases = [
  { query: termFor(data, 'zh-Hans', 'search'), locale: 'zh-Hans', expected: 'search' },
  { query: termFor(data, 'zh-Hant', 'search'), locale: 'zh-Hant', expected: 'search' },
  { query: termFor(data, 'ja', 'search'), locale: 'ja', expected: 'search' },
  { query: termFor(data, 'ja', 'settings', 0), locale: 'ja', expected: 'settings' },
  { query: termFor(data, 'ja', 'settings', 1), locale: 'ja', expected: 'settings' },
  { query: termFor(data, 'ko', 'settings'), locale: 'ko', expected: 'settings' },
  { query: termFor(data, 'ko', 'logout', 0), locale: 'ko', expected: 'logout' },
  { query: termFor(data, 'ko', 'logout'), locale: 'ko', expected: 'logout' },
  { query: termFor(data, 'es', 'password'), locale: 'es', expected: 'password' },
  { query: termFor(data, 'de', 'invoice'), locale: 'de', expected: 'invoice' },
  { query: termFor(data, 'pt', 'workflow'), locale: 'pt', expected: 'workflow' },
  { query: termFor(data, 'ar', 'password'), locale: 'ar', expected: 'password' },
  { query: termFor(data, 'hi', 'invoice'), locale: 'hi', expected: 'invoice' },
  { query: termFor(data, 'vi', 'workflow'), locale: 'vi', expected: 'workflow' },
  { query: termFor(data, 'th', 'search'), locale: 'th', expected: 'search' },
];

for (const smoke of smokeCases) {
  const expanded = expandCjkQuery(smoke.query, { locale: smoke.locale, terms: data.terms });
  assert.ok(expanded.variants.includes(smoke.expected), `${smoke.locale}:${smoke.query} should expand to ${smoke.expected}`);
}

console.log('verify-cjk-search-quality: ok');
