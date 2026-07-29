import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { searchIcons } from '../mcp/search.js';
import { buildIntentQueryVariants } from '../lib/search-intent-core.js';
import { buildSearchRankingQueryVariants } from '../lib/search-ranking-policy.js';

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function iconRef(icon) {
  return `${icon.lib}:${icon.id}`.toLowerCase();
}

function includesAny(refs, fragments) {
  return fragments.some((fragment) =>
    refs.some((ref) => ref.includes(String(fragment).toLowerCase())),
  );
}

const corpus = readJson('data/search-intent-fixtures/assessment-checklist-recall-corpus.json');
const icons = readJson('mcp/public/icon-index.json').icons;
const synonyms = readJson('mcp/public/synonyms.json');
const reviewedRefs = new Set(corpus.reviewed_refs.map((ref) => String(ref).toLowerCase()));
const reviewedHostedVariants = new Set([
  'list check',
  'list checks',
  'clipboard check',
  'clipboard list',
  'file check',
]);

assert.equal(corpus.schema_version, 1);
assert.equal(corpus.cases.length, 12);

const observations = [];
for (const testCase of corpus.cases) {
  const hostedVariants = buildSearchRankingQueryVariants(
    testCase.query,
    buildIntentQueryVariants(testCase.query, { maxVariants: 10 }),
    { maxVariants: 14 },
  );
  const results = searchIcons(testCase.query, icons, synonyms, {
    library: testCase.library,
    libraryMode: testCase.library_mode,
    style: testCase.style,
    limit: testCase.limit,
  });
  const refs = results.map(iconRef);

  if (testCase.expected_decision === 'expected_zero') {
    assert.equal(refs.length, 0, `${testCase.case_id} must remain an honest zero: ${refs.join(', ')}`);
  } else {
    assert.ok(
      refs.length >= testCase.minimum_results,
      `${testCase.case_id} returned ${refs.length}, expected at least ${testCase.minimum_results}: ${refs.join(', ')}`,
    );
    assert.ok(
      includesAny(refs.slice(0, 5), testCase.required_ref_fragments),
      `${testCase.case_id} lacks a reviewed result in its top five: ${refs.join(', ')}`,
    );
    if (testCase.minimum_reviewed_results) {
      const reviewedCount = refs
        .slice(0, 5)
        .filter((ref) => reviewedRefs.has(ref))
        .length;
      assert.ok(
        reviewedCount >= testCase.minimum_reviewed_results,
        `${testCase.case_id} returned ${reviewedCount} reviewed results, expected at least ${testCase.minimum_reviewed_results}: ${refs.join(', ')}`,
      );
    }
    if (testCase.minimum_reviewed_results >= 3) {
      const hostedReviewedVariantCount = hostedVariants
        .filter((variant) => reviewedHostedVariants.has(variant))
        .length;
      assert.ok(
        hostedReviewedVariantCount >= 3,
        `${testCase.case_id} did not activate enough reviewed hosted retrieval variants: ${hostedVariants.join(', ')}`,
      );
    }
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
    hosted_query_variants: hostedVariants,
    result_refs: refs,
  });
}

console.log(JSON.stringify({
  status: 'ok',
  fixture_id: corpus.fixture_id,
  cases: observations.length,
  hosted_variant_activation_checked: true,
  observations,
}, null, 2));
