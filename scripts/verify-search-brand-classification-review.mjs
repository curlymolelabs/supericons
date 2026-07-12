import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { getBrandRankAdjustment } from '../lib/search-ranking-policy.js';
import { searchIcons } from '../mcp/search.js';

const iconIndex = JSON.parse(readFileSync('public/icon-index.json', 'utf8'));
const policy = JSON.parse(readFileSync('data/search-intent-graph/ranking-policy.json', 'utf8'));
const synonyms = JSON.parse(readFileSync('public/synonyms.json', 'utf8'));
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
assert.match(review, /Status: approved with one correction/);
assert.match(review, /Exact single-token `supericons` is `distinctive_exact`/);
assert.match(decisions, /D-019: Bounded brand-classification scope/);
assert.match(specification, /Version: 1\.3/);
assert.match(specification, /FR-29/);

const lovable = policy.brand_terms.find((entry) => entry.term === 'lovable');
assert.equal(lovable?.match_class, 'ambiguous_exact', 'approved Lovable classification should be active');

const activeSiRefs = new Set(policy.brand_terms.flatMap((entry) => (
  entry.icon_refs || []
)).filter((iconRef) => iconRef.startsWith('si:')));
assert.equal(activeSiRefs.size, 50, 'all 50 approved SI brand records should be active');

for (const row of rows) {
  const icon = siBrands.find((entry) => entry.name === row.label);
  assert.ok(icon, `${row.label}: SI brand record should exist`);
  const iconRef = `si:${icon.id}`;
  const matchingTerms = policy.brand_terms.filter((entry) => entry.icon_refs?.includes(iconRef));
  assert.ok(
    matchingTerms.some((entry) => entry.match_class === row.matchClass),
    `${row.label}: active policy should include the approved ${row.matchClass} class`,
  );

  const explicitResults = searchIcons(`${row.label} logo`, iconIndex.icons, synonyms, { limit: 1 });
  assert.equal(
    `${explicitResults[0]?.lib}:${explicitResults[0]?.id}`,
    iconRef,
    `${row.label}: explicit logo query should rank identity first`,
  );
}

for (const brandTerm of policy.brand_terms) {
  for (const iconRef of brandTerm.icon_refs || []) {
    const candidate = { icon_id: iconRef, name: brandTerm.term, assetType: 'brand-logo' };
    const exact = getBrandRankAdjustment(brandTerm.term, candidate);
    if (brandTerm.match_class === 'distinctive_exact') {
      assert.equal(exact.boost, 300, `${brandTerm.term}: distinctive exact term should receive identity priority`);
    } else {
      assert.equal(exact.penalty, 20, `${brandTerm.term}: ambiguous exact term should share with concepts`);
      assert.equal(
        getBrandRankAdjustment(`${brandTerm.term} logo`, candidate).boost,
        300,
        `${brandTerm.term}: explicit logo query should receive identity priority`,
      );
    }
    for (const blockedAlias of brandTerm.blocked_aliases || []) {
      const blocked = getBrandRankAdjustment(blockedAlias, candidate);
      assert.equal(blocked.penalty, 1000, `${blockedAlias}: rejected alias should not receive brand priority`);
      assert.equal(blocked.match_class, 'blocked_alias', `${blockedAlias}: rejected alias should be labeled consistently`);
    }
  }
}

console.log(JSON.stringify({
  status: 'ok',
  si_brand_records: siBrands.length,
  approved_distinctive: rows.filter((row) => row.matchClass === 'distinctive_exact').length,
  approved_ambiguous: rows.filter((row) => row.matchClass === 'ambiguous_exact').length,
  active_brand_terms: policy.brand_terms.length,
  active_si_brand_records: activeSiRefs.size,
}, null, 2));
