import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { LOCALE_METADATA, SUPPORTED_LOCALES } from '../lib/i18n/locales.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');
const sourceDir = path.join(rootDir, 'data/i18n/messages');
const publicDir = path.join(rootDir, 'public/i18n/messages');
const mcpDir = path.join(rootDir, 'mcp/public/i18n/messages');

const MOJIBAKE_PATTERN = /(?:ÃƒÆ’|Ãƒâ€š|ÃƒÂ|ÃƒËœ|Ãƒâ„¢|ÃƒÂ |ÃƒÂ¡|ÃƒÂ£|ÃƒÂ¤|ÃƒÂ¥|ÃƒÂ¦|ÃƒÂ§|ÃƒÂ¨|ÃƒÂ©|ÃƒÂ­|ÃƒÂ°|ÃƒÂ±|ÃƒÂ²|ÃƒÂ³|ÃƒÂµ|ÃƒÂ¶|ÃƒÂ¸|ÃƒÂ¹|ÃƒÂº|ÃƒÂ½|ÃƒÂ¾|Ã¯Â¿Â½)/;
const CORRUPTED_LATIN_PATTERN = /\uFFFD/;
const PUBLIC_METADATA_PATTERN = /(?:openai|deepl|google cloud|microsoft translator|reviewer_model|reviewer_reasoning_effort|internal_review_status|prompt_notes|prompt_strategy|workflow_trace|agent_notes|private_confidence_rationale)/i;
const EXPECTED_NATIVE_LABELS = Object.freeze({
  en: 'English',
  'zh-Hans': '\u7b80\u4f53\u4e2d\u6587',
  'zh-Hant': '\u7e41\u9ad4\u4e2d\u6587',
  ja: '\u65e5\u672c\u8a9e',
  ko: '\ud55c\uad6d\uc5b4',
  es: 'Espa\u00f1ol',
  de: 'Deutsch',
  pt: 'Portugu\u00eas',
  ar: '\u0627\u0644\u0639\u0631\u0628\u064a\u0629',
  hi: '\u0939\u093f\u0928\u094d\u0926\u0940',
  vi: 'Ti\u1ebfng Vi\u1ec7t',
  th: '\u0e44\u0e17\u0e22',
});
const QUESTION_MARK_FORBIDDEN_PATHS = new Set([
  'account.password.resetInSeconds',
]);

function flattenMessages(value, prefix = '', out = new Map()) {
  for (const [key, child] of Object.entries(value || {})) {
    const nextKey = prefix ? `${prefix}.${key}` : key;
    if (child && typeof child === 'object' && !Array.isArray(child)) {
      flattenMessages(child, nextKey, out);
    } else {
      out.set(nextKey, String(child ?? ''));
    }
  }
  return out;
}

function placeholders(value) {
  return [...String(value || '').matchAll(/\{([a-zA-Z0-9_]+)\}/g)].map((match) => match[1]).sort();
}

async function readCatalog(dir, locale) {
  const raw = await fs.readFile(path.join(dir, `${locale}.json`), 'utf8');
  assert.ok(!PUBLIC_METADATA_PATTERN.test(raw), `${locale} contains internal metadata`);
  assert.ok(!MOJIBAKE_PATTERN.test(raw), `${locale} contains likely mojibake`);
  assert.ok(!CORRUPTED_LATIN_PATTERN.test(raw), `${locale} contains likely replacement question mark corruption`);
  return JSON.parse(raw);
}

const english = await readCatalog(sourceDir, 'en');
const englishFlat = flattenMessages(english);
const englishKeys = [...englishFlat.keys()].sort();

for (const locale of SUPPORTED_LOCALES) {
  assert.equal(LOCALE_METADATA[locale]?.nativeLabel, EXPECTED_NATIVE_LABELS[locale], `${locale} native label must not be mojibake`);

  const source = await readCatalog(sourceDir, locale);
  const sourceFlat = flattenMessages(source);
  assert.deepEqual([...sourceFlat.keys()].sort(), englishKeys, `${locale} source keys must match English`);

  for (const key of englishKeys) {
    if (QUESTION_MARK_FORBIDDEN_PATHS.has(key)) {
      assert.ok(!sourceFlat.get(key).includes('?'), `${locale}:${key} must not contain literal question marks`);
    }

    assert.deepEqual(
      placeholders(sourceFlat.get(key)),
      placeholders(englishFlat.get(key)),
      `${locale}:${key} placeholder mismatch`,
    );
    assert.ok(sourceFlat.get(key).trim(), `${locale}:${key} must not be empty`);
  }

  for (const outputDir of [publicDir, mcpDir]) {
    const output = await readCatalog(outputDir, locale);
    assert.deepEqual(output, source, `${locale} public catalog must match source in ${outputDir}`);
  }
}

console.log('verify-i18n-catalogs: ok');
