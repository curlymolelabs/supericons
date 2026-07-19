import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { searchIcons } from '../mcp/search.js';

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function normalize(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function candidateText(icon) {
  return normalize([
    icon.lib,
    icon.id,
    icon.name,
    icon.meaning,
    ...(icon.semanticTags || []),
    ...(icon.synonyms || []),
    ...(icon.aliases || []),
    ...(icon.searchTerms || []),
  ].filter(Boolean).join(' '));
}

function matchesFamily(icon, family) {
  const text = candidateText(icon);
  return normalize(family)
    .split(' ')
    .filter(Boolean)
    .every((token) => text.includes(token));
}

const fixture = readJson('data/search-intent-fixtures/production-vocabulary-gaps.json');
const icons = readJson('mcp/public/icon-index.json').icons
  .filter((icon) => icon.style !== 'solid');
const synonyms = readJson('mcp/public/synonyms.json');
const caseIds = new Set();
const failures = [];
const observations = [];

assert.equal(fixture.schema_version, 1);
assert.equal(fixture.cases.length, 31);

for (const testCase of fixture.cases) {
  assert.match(testCase.id, /^[a-z0-9-]+$/);
  assert.ok(!caseIds.has(testCase.id), `duplicate case id: ${testCase.id}`);
  caseIds.add(testCase.id);
  assert.ok(testCase.query);
  assert.ok(Array.isArray(testCase.acceptable_families));
  assert.ok(testCase.acceptable_families.length > 0);

  const results = searchIcons(testCase.query, icons, synonyms, {
    libraryMode: 'all',
    limit: 3,
  });
  const refs = results.map((icon) => `${icon.lib}:${icon.id}`);
  const irrelevant = results
    .slice(0, 3)
    .filter((icon) => !testCase.acceptable_families.some((family) => matchesFamily(icon, family)))
    .map((icon) => `${icon.lib}:${icon.id}`);

  if (results.length < 3) {
    failures.push(`${testCase.id}: expected 3 results, received ${results.length}: ${refs.join(', ')}`);
  }
  if (irrelevant.length > 0) {
    failures.push(`${testCase.id}: irrelevant top-3 results: ${irrelevant.join(', ')}`);
  }
  observations.push({
    id: testCase.id,
    query: testCase.query,
    top_icon_refs: refs,
  });
}

if (failures.length > 0) {
  console.error('verify-search-v2-vocabulary-gaps: failed');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(JSON.stringify({
  status: 'ok',
  cases: observations.length,
  observations,
}, null, 2));
