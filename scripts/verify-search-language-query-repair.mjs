import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { expandCjkQuery } from '../mcp/runtime/cjk-search-core.js';
import { searchIcons } from '../mcp/search.js';

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function iconRef(icon) {
  return `${icon.lib}:${icon.id}`.toLowerCase();
}

function includesAny(refs, fragments) {
  return fragments.some((fragment) => refs.some((ref) => ref.includes(String(fragment).toLowerCase())));
}

const corpus = readJson('data/search-intent-fixtures/language-query-repair-corpus.json');
const sourceAliases = readJson('data/i18n/multilingual-search-aliases.json');
const publicAliases = readJson('public/multilingual-search-aliases.json');
const packagedAliases = readJson('mcp/public/multilingual-search-aliases.json');
const cjkTerms = readJson('data/i18n/cjk-search-terms.json').terms;
const icons = readJson('mcp/public/icon-index.json').icons;
const synonyms = readJson('mcp/public/synonyms.json');
const allExpansionTerms = [...cjkTerms, ...sourceAliases.aliases];

assert.equal(corpus.schema_version, 1);
assert.equal(corpus.cases.length, 22);
assert.deepEqual(publicAliases, sourceAliases, 'website aliases must match the reviewed source artifact');
assert.deepEqual(packagedAliases, sourceAliases, 'packaged aliases must match the reviewed source artifact');

const expectedReviewedTerms = ['almacén', 'tuerca', 'toalla', 'llave fija', '资源收藏', '微信', 'airflow'];
for (const term of expectedReviewedTerms) {
  assert.ok(
    sourceAliases.aliases.some((record) => record.alias_type === 'reviewed_alias' && record.term === term),
    `reviewed alias is missing from the generated artifact: ${term}`,
  );
}

const unscopedSpanishExpansion = expandCjkQuery('almacen', { terms: allExpansionTerms });
assert.ok(unscopedSpanishExpansion.variants.includes('warehouse'));
const scopedSpanishExpansion = expandCjkQuery('almacen', { locale: 'es', terms: allExpansionTerms });
assert.ok(scopedSpanishExpansion.variants.includes('warehouse'));
const mixedBrandExpansion = expandCjkQuery('wechat 微信 logo', { terms: allExpansionTerms });
assert.ok(mixedBrandExpansion.variants.includes('wechat'));

const observations = [];
for (const testCase of corpus.cases) {
  const results = searchIcons(testCase.query, icons, synonyms, {
    locale: testCase.locale,
    library: testCase.library,
    libraryMode: testCase.library_mode,
    style: testCase.style,
    limit: testCase.limit,
  });
  const refs = results.map(iconRef);

  if (testCase.expected_decision === 'expected_zero') {
    assert.equal(refs.length, 0, `${testCase.case_id} must remain an honest zero: ${refs.join(', ')}`);
  } else {
    assert.ok(refs.length > 0, `${testCase.case_id} returned a false zero`);
    assert.ok(
      includesAny(refs.slice(0, 5), testCase.required_ref_fragments),
      `${testCase.case_id} lacks a reviewed result in its top five: ${refs.join(', ')}`,
    );
  }

  if (testCase.library_mode === 'strict' && testCase.library) {
    assert.ok(
      refs.every((ref) => ref.startsWith(`${testCase.library}:`)),
      `${testCase.case_id} violated its strict library: ${refs.join(', ')}`,
    );
  }
  assert.ok(
    !includesAny(refs.slice(0, 5), testCase.forbidden_ref_fragments),
    `${testCase.case_id} returned a forbidden top-five result: ${refs.join(', ')}`,
  );

  observations.push({
    case_id: testCase.case_id,
    result_refs: refs,
  });
}

console.log(JSON.stringify({
  status: 'ok',
  fixture_id: corpus.fixture_id,
  cases: observations.length,
  observations,
}, null, 2));
