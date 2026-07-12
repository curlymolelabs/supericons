import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const iconIndex = JSON.parse(readFileSync('public/icon-index.json', 'utf8'));
const policy = JSON.parse(readFileSync('data/search-intent-graph/ranking-policy.json', 'utf8'));
const reviewPath = 'docs/si-v2/search/reviews/si-brand-classification-owner-review-2026-07-12.md';
const review = readFileSync(reviewPath, 'utf8');
const decisions = readFileSync('docs/si-v2/search/decisions.md', 'utf8');
const specification = readFileSync('docs/si-v2/search/search-engine-v2.md', 'utf8');

const siBrands = iconIndex.icons.filter((icon) => (
  icon.lib === 'si'
  && (icon.assetType === 'brand-logo' || icon.filterTags?.includes('brand-logo'))
));
assert.equal(siBrands.length, 50, 'bounded SI review should cover exactly 50 brand-logo records');

const rows = [...review.matchAll(/^\|\s*(\d+)\s*\|\s*([^|]+?)\s*\|\s*`(distinctive_exact|ambiguous_exact)`\s*\|/gm)]
  .map((match) => ({ number: Number(match[1]), label: match[2].trim(), matchClass: match[3] }));
assert.equal(rows.length, 50, 'review table should contain 50 classification rows');
assert.deepEqual(rows.map((row) => row.number), Array.from({ length: 50 }, (_, index) => index + 1));
assert.deepEqual(
  rows.map((row) => row.label).sort((left, right) => left.localeCompare(right)),
  siBrands.map((icon) => icon.name).sort((left, right) => left.localeCompare(right)),
  'review table labels should match the current SI brand-logo catalog',
);
assert.match(review, /Status: awaiting owner review/);
assert.match(decisions, /D-019: Bounded brand-classification scope/);
assert.match(specification, /Version: 1\.3/);
assert.match(specification, /FR-29/);

const lovable = policy.brand_terms.find((entry) => entry.term === 'lovable');
assert.equal(lovable?.match_class, 'ambiguous_exact', 'approved Lovable classification should be active');
assert.equal(policy.brand_terms.length, 3, 'unapproved table proposals should not become active policy');

console.log(JSON.stringify({
  status: 'ok',
  si_brand_records: siBrands.length,
  proposed_distinctive: rows.filter((row) => row.matchClass === 'distinctive_exact').length,
  proposed_ambiguous: rows.filter((row) => row.matchClass === 'ambiguous_exact').length,
  active_brand_terms: policy.brand_terms.length,
}, null, 2));
