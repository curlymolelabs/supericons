import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { searchIcons } from '../mcp/search.js';
import { buildWebSearchQueryPlan } from '../lib/web-cjk-search-smoke.js';
import { buildIntentQueryVariants } from '../lib/search-intent-core.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

async function readJson(relativePath) {
  return JSON.parse(await fs.readFile(path.join(rootDir, relativePath), 'utf8'));
}

function iconId(icon) {
  return `${icon.lib}:${icon.id}`;
}

function termFor(cjkTerms, locale, concept, variantIndex = -1) {
  const record = cjkTerms.find((item) => item.locale === locale && item.concept === concept);
  assert.ok(record, `missing CJK term for ${locale}:${concept}`);
  return variantIndex >= 0 ? record.variants[variantIndex] : record.term;
}

const { icons } = await readJson('public/icon-index.json');
const synonyms = await readJson('public/synonyms.json');
const cjkTerms = (await readJson('public/cjk-search-terms.json')).terms;

const cases = [
  { locale: 'zh-Hans', concept: 'search', requiredIncluded: ['material:search', 'lucide:search'] },
  { locale: 'zh-Hant', concept: 'search', requiredIncluded: ['material:search', 'lucide:search'] },
  { locale: 'ja', concept: 'search', requiredIncluded: ['material:search', 'lucide:search'] },
  { locale: 'ja', concept: 'settings', variantIndex: 0, requiredIncluded: ['material:settings', 'lucide:settings'] },
  { locale: 'ja', concept: 'settings', variantIndex: 1, requiredIncluded: ['material:settings', 'lucide:settings'] },
  { locale: 'ko', concept: 'settings', requiredIncluded: ['material:settings', 'lucide:settings'] },
  { locale: 'ko', concept: 'logout', variantIndex: 0, requiredIncluded: ['material:logout', 'tabler:logout'] },
  { locale: 'ja', concept: 'music', requiredIncluded: ['lucide:music', 'tabler:music'] },
  { locale: 'ko', concept: 'password', requiredIncluded: ['material:password', 'tabler:password'] },
  { locale: 'zh-Hans', concept: 'firewall', requiredIncluded: ['tabler:firewall-check', 'tabler:firewall-flame'] },
  { locale: 'zh-Hant', concept: 'invoice', requiredIncluded: ['tabler:invoice', 'phosphor:invoice'] },
  { locale: 'ja', concept: 'llm', requiredIncluded: ['si:stepfun', 'lucide:brain'] },
  { locale: 'ko', concept: 'workflow', requiredIncluded: ['lucide:workflow', 'material:workflow'] },
  { locale: 'es', concept: 'password', requiredIncluded: ['material:password', 'tabler:password'] },
  { locale: 'de', concept: 'invoice', requiredIncluded: ['tabler:invoice', 'phosphor:invoice'] },
  { locale: 'pt', concept: 'workflow', requiredIncluded: ['lucide:workflow', 'material:workflow'] },
  { locale: 'es', concept: 'firewall', requiredIncluded: ['tabler:firewall-check', 'tabler:firewall-flame'] },
  { locale: 'de', concept: 'music', requiredIncluded: ['lucide:music', 'tabler:music'] },
  { locale: 'pt', concept: 'search', requiredIncluded: ['material:search', 'lucide:search'] },
  { locale: 'ar', concept: 'password', requiredIncluded: ['material:password', 'tabler:password'] },
  { locale: 'hi', concept: 'invoice', requiredIncluded: ['tabler:invoice', 'phosphor:invoice'] },
  { locale: 'vi', concept: 'workflow', requiredIncluded: ['lucide:workflow', 'material:workflow'] },
  { locale: 'th', concept: 'search', requiredIncluded: ['material:search', 'lucide:search'] },
  { locale: 'ar', concept: 'firewall', requiredIncluded: ['tabler:firewall-check', 'tabler:firewall-flame'] },
  { locale: 'vi', concept: 'music', requiredIncluded: ['lucide:music', 'tabler:music'] },
];

let failed = false;

for (const item of cases) {
  const query = termFor(cjkTerms, item.locale, item.concept, item.variantIndex);
  const plan = buildWebSearchQueryPlan(query, cjkTerms, buildIntentQueryVariants);
  assert.equal(plan.locale, item.locale, `${item.locale}:${item.concept} should infer locale`);
  assert.ok(plan.variants.includes(item.concept), `${item.locale}:${item.concept} should expand to English concept`);

  const results = searchIcons(query, icons, synonyms, {
    locale: plan.locale,
    limit: 8,
  });
  const ids = results.map(iconId);
  const missing = item.requiredIncluded.filter((id) => !ids.includes(id));
  if (missing.length > 0) {
    failed = true;
    console.error(`[FAIL] ${item.locale}:${item.concept}:${query}: missing ${missing.join(', ')}`);
    console.error(`       got: ${ids.join(', ')}`);
    continue;
  }

  console.log(`[PASS] ${item.locale}:${item.concept}:${query}: ${ids.join(', ')}`);
}

if (failed) process.exit(1);
console.log('verify-web-cjk-search: ok');
