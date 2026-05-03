import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const dictionaryPath = resolve('data/search-intent-dictionary/search-intent-dictionary.json');
const mindMapPath = resolve('data/search-intent-dictionary/search-intent-mind-map.json');
const fixturesPath = resolve('data/search-intent-dictionary/search-intent-dictionary-fixtures.json');
const dictionary = JSON.parse(readFileSync(dictionaryPath, 'utf8'));
const mindMap = JSON.parse(readFileSync(mindMapPath, 'utf8'));
const fixtures = JSON.parse(readFileSync(fixturesPath, 'utf8'));

const allowedCategories = new Set(dictionary.categories || []);
const terms = new Set();
const failures = [];

assert.equal(typeof dictionary.version, 'number', 'dictionary.version must be a number');
assert.ok(Array.isArray(dictionary.categories), 'dictionary.categories must be an array');
assert.ok(Array.isArray(dictionary.entries), 'dictionary.entries must be an array');
assert.equal(typeof mindMap.version, 'number', 'mindMap.version must be a number');
assert.ok(Array.isArray(mindMap.nodes), 'mindMap.nodes must be an array');
assert.ok(Array.isArray(mindMap.aliases), 'mindMap.aliases must be an array');

for (const entry of dictionary.entries) {
  const term = String(entry.term || '').trim().toLowerCase();
  if (!term) failures.push('entry has empty term');
  if (terms.has(term)) failures.push(`duplicate term: ${term}`);
  terms.add(term);

  if (!allowedCategories.has(entry.category)) {
    failures.push(`${term}: unknown category "${entry.category}"`);
  }

  for (const field of ['variants', 'prefer', 'avoid']) {
    if (!Array.isArray(entry[field])) {
      failures.push(`${term}: ${field} must be an array`);
      continue;
    }
  }

  if ((entry.variants || []).length === 0) {
    failures.push(`${term}: variants must not be empty`);
  }

  if ((entry.prefer || []).length === 0) {
    failures.push(`${term}: prefer must not be empty`);
  }

  const allTerms = [
    ...(entry.variants || []),
    ...(entry.prefer || []),
    ...(entry.avoid || []),
    ...(entry.avoid_unless || []),
  ];
  for (const value of allTerms) {
    if (String(value || '').trim().length === 0) {
      failures.push(`${term}: contains an empty mapping string`);
    }
  }
}

const mindMapNodes = new Set();
for (const node of mindMap.nodes || []) {
  const id = String(node.id || '').trim().toLowerCase();
  if (!id) failures.push('mind-map node has empty id');
  if (mindMapNodes.has(id)) failures.push(`duplicate mind-map node id: ${id}`);
  mindMapNodes.add(id);

  for (const field of ['related_terms', 'icon_concepts', 'avoid_concepts']) {
    if (!Array.isArray(node[field])) {
      failures.push(`${id}: mind-map ${field} must be an array`);
      continue;
    }
    for (const value of node[field]) {
      if (String(value || '').trim().length === 0) {
        failures.push(`${id}: mind-map ${field} contains an empty string`);
      }
    }
  }
}

for (const alias of mindMap.aliases || []) {
  const term = String(alias.term || '').trim().toLowerCase();
  const node = String(alias.node || '').trim().toLowerCase();
  if (!term) failures.push('mind-map alias has empty term');
  if (terms.has(term)) failures.push(`mind-map alias duplicates dictionary term: ${term}`);
  if (!mindMapNodes.has(node)) failures.push(`${term}: mind-map alias points to missing node "${node}"`);
  terms.add(term);

  for (const field of ['extra_related_terms', 'extra_icon_concepts', 'extra_avoid_concepts', 'avoid_unless']) {
    if (alias[field] === undefined) continue;
    if (!Array.isArray(alias[field])) {
      failures.push(`${term}: mind-map ${field} must be an array when present`);
      continue;
    }
    for (const value of alias[field]) {
      if (String(value || '').trim().length === 0) {
        failures.push(`${term}: mind-map ${field} contains an empty string`);
      }
    }
  }
}

const {
  buildIntentQueryVariants,
  buildSearchIntentProfile,
  getIntentCandidateAdjustment,
} = await import('../lib/search-intent-core.js');

function includesVariant(variants, expected) {
  return variants.some((variant) =>
    variant === expected || variant.includes(expected) || expected.includes(variant)
  );
}

for (const fixture of fixtures.fixtures || []) {
  const variants = buildIntentQueryVariants(fixture.query);
  for (const expected of fixture.expected_variants || []) {
    if (!includesVariant(variants, expected)) {
      failures.push(`${fixture.query}: missing expected variant "${expected}" in ${JSON.stringify(variants)}`);
    }
  }

  const profile = buildSearchIntentProfile(fixture.query);
  for (const preferred of fixture.expected_prefer || []) {
    const adjustment = getIntentCandidateAdjustment({ icon_id: `test:${preferred}`, name: preferred }, profile);
    if (adjustment.boost <= 0) failures.push(`${fixture.query}: expected ${preferred} to be boosted`);
  }
  for (const avoided of fixture.expected_avoid || []) {
    const adjustment = getIntentCandidateAdjustment({ icon_id: `test:${avoided}`, name: avoided }, profile);
    if (adjustment.penalty <= 0) failures.push(`${fixture.query}: expected ${avoided} to be penalized`);
  }
}

if (failures.length > 0) {
  console.error('verify-search-intent-dictionary: failed');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('verify-search-intent-dictionary: ok');
