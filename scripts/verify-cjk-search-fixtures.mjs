import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { searchIcons } from '../mcp/search.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

function iconId(icon) {
  return `${icon.lib}:${icon.id}`;
}

async function readJson(relativePath) {
  return JSON.parse(await fs.readFile(path.join(rootDir, relativePath), 'utf8'));
}

const { icons } = await readJson('public/icon-index.json');
const synonyms = await readJson('public/synonyms.json');
const fixtureData = await readJson('data/i18n/cjk-search-fixtures.json');

assert.equal(fixtureData.version, 1);
assert.ok(Array.isArray(fixtureData.fixtures), 'fixtures must be an array');

const countsByLocale = new Map();
let failed = false;

for (const fixture of fixtureData.fixtures) {
  countsByLocale.set(fixture.locale, (countsByLocale.get(fixture.locale) || 0) + 1);
  const results = searchIcons(fixture.query, icons, synonyms, {
    locale: fixture.locale,
    limit: fixture.topN || 8,
  });
  const ids = results.map(iconId);
  const missing = fixture.requiredIncluded.filter((id) => !ids.includes(id));

  if (missing.length > 0) {
    failed = true;
    console.error(`[FAIL] ${fixture.locale}:${fixture.query}: missing ${missing.join(', ')}`);
    console.error(`       got: ${ids.join(', ')}`);
    continue;
  }

  console.log(`[PASS] ${fixture.locale}:${fixture.query}: ${ids.join(', ')}`);
}

for (const locale of ['zh-Hans', 'zh-Hant', 'ja', 'ko', 'es', 'de', 'pt', 'ar', 'hi', 'vi', 'th']) {
  assert.ok((countsByLocale.get(locale) || 0) >= 25, `${locale} must have at least 25 fixtures`);
}

if (failed) process.exit(1);
console.log('verify-cjk-search-fixtures: ok');
