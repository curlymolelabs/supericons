import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { rerankHostedSearchCandidates } from '../lib/hosted-search-core.js';
import {
  getCandidateInterpretationFamilyIds,
  getSearchInterpretationPlan,
  getSearchRankingPolicy,
} from '../lib/search-ranking-policy.js';
import { searchIcons } from '../mcp/search.js';

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function iconRef(icon) {
  return `${icon.lib}:${icon.id}`;
}

function hashFile(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function resultFamilyIds(query, results) {
  return new Set(results.flatMap((icon) => getCandidateInterpretationFamilyIds(query, icon)));
}

const policy = getSearchRankingPolicy();
const familyIds = new Set();
for (const family of policy.interpretation_families || []) {
  assert.match(family.id, /^[a-z0-9_]+$/, `${family.id}: family id must be snake_case`);
  assert.ok(!familyIds.has(family.id), `${family.id}: duplicate family id`);
  familyIds.add(family.id);
  assert.ok(family.label, `${family.id}: family label is required`);
  assert.ok(family.retrieval_queries?.length > 0, `${family.id}: retrieval queries are required`);
  assert.ok(family.candidate_terms?.length > 0, `${family.id}: candidate terms are required`);
  for (const iconRef of family.candidate_icon_refs || []) {
    assert.match(iconRef, /^[a-z0-9-]+:[a-z0-9._-]+$/i, `${family.id}: invalid candidate icon ref`);
  }
}

for (const queryPolicy of policy.query_policies || []) {
  assert.ok(queryPolicy.trigger_terms?.length > 0, `${queryPolicy.id}: trigger terms are required`);
  for (const familyId of queryPolicy.bare_query_family_ids || []) {
    assert.ok(familyIds.has(familyId), `${queryPolicy.id}: unknown family ${familyId}`);
  }
  for (const [trigger, familyOverrides] of Object.entries(queryPolicy.retrieval_queries_by_trigger || {})) {
    assert.ok(queryPolicy.trigger_terms.includes(trigger), `${queryPolicy.id}: retrieval override uses unknown trigger ${trigger}`);
    for (const [familyId, retrievalQueries] of Object.entries(familyOverrides)) {
      assert.ok(familyIds.has(familyId), `${queryPolicy.id}: retrieval override uses unknown family ${familyId}`);
      assert.ok(retrievalQueries.length > 0, `${queryPolicy.id}: retrieval override for ${familyId} should not be empty`);
    }
  }
}

assert.equal(
  hashFile('lib/generated-search-ranking-policy.js'),
  hashFile('mcp/runtime/generated-search-ranking-policy.js'),
  'generated ranking policy copies should match',
);
assert.equal(
  hashFile('lib/search-ranking-policy.js'),
  hashFile('mcp/runtime/search-ranking-policy.js'),
  'ranking policy runtime copies should match',
);

const evaluationSet = readJson('data/semantic-search-v2/evaluation-set.json');
for (const groupId of ['july_11_regression_seeds', 'ambiguous_intent_diversity', 'brand_intent_gating']) {
  const group = evaluationSet.query_groups.find((entry) => entry.id === groupId);
  assert.equal(group?.review_status, 'owner_reviewed', `${groupId}: owner review should be recorded`);
}

const { icons } = readJson('public/icon-index.json');
const synonyms = readJson('public/synonyms.json');
const localSearch = (query, limit = 8) => searchIcons(query, icons, synonyms, { limit });

const helloResults = localSearch('hello');
assert.notEqual(iconRef(helloResults[0]), 'simpleicons:hellofresh', 'bare hello should not rank HelloFresh first');
assert.ok(
  resultFamilyIds('hello', helloResults).size >= 3,
  'bare hello should cover at least three approved interpretation families in the top eight',
);

const helloOnboardingResults = localSearch('hello onboarding screen');
assert.ok(helloOnboardingResults.length > 0, 'contextual hello onboarding search should return results');
assert.ok(
  getCandidateInterpretationFamilyIds('hello onboarding screen', helloOnboardingResults[0]).includes('greeting_gesture'),
  'hello onboarding should rank a greeting gesture first',
);

const helloMessageResults = localSearch('hello message');
assert.ok(
  getCandidateInterpretationFamilyIds('hello message', helloMessageResults[0]).includes('communication'),
  'hello message should rank communication first',
);

assert.equal(iconRef(localSearch('hellofresh')[0]), 'simpleicons:hellofresh', 'exact HelloFresh should keep identity priority');
assert.equal(iconRef(localSearch('HelloFresh logo')[0]), 'simpleicons:hellofresh', 'explicit HelloFresh logo should keep identity priority');

const swiftResults = localSearch('swift');
const swiftFamilies = resultFamilyIds('swift', swiftResults);
assert.ok(swiftFamilies.has('speed_motion'), 'bare swift should include speed or motion');
assert.ok(swiftFamilies.has('brand_identity'), 'bare swift should retain the brand interpretation');

const pickerResults = localSearch('picker');
assert.ok(
  resultFamilyIds('picker', pickerResults).size >= 3,
  'bare picker should cover at least three approved interpretation families in the top eight',
);

assert.match(iconRef(localSearch('magnifier')[0]), /:(search|zoom)/, 'magnifier should resolve to search or zoom');
assert.ok(
  localSearch('bell').every((icon) => !iconRef(icon).includes('barbell')),
  'bell results should exclude barbell substring collisions',
);

const hostedHelloCandidates = [
  { icon_id: 'simpleicons:hellofresh', name: 'HelloFresh', source_library: 'simpleicons', lexical_rank: 9.8, query_variant: 'hello' },
  { icon_id: 'material:waving_hand', name: 'Waving Hand', source_library: 'material', lexical_rank: 1.1, query_variant: 'waving hand' },
  { icon_id: 'lucide:smile', name: 'Smile', source_library: 'lucide', lexical_rank: 1.0, query_variant: 'smile' },
  { icon_id: 'material:chat', name: 'Chat', source_library: 'material', lexical_rank: 0.9, query_variant: 'chat' },
  { icon_id: 'lucide:text', name: 'Text', source_library: 'lucide', lexical_rank: 0.8, query_variant: 'text' },
];
const hostedHello = rerankHostedSearchCandidates('hello', hostedHelloCandidates);
assert.notEqual(hostedHello[0]?.icon_id, 'simpleicons:hellofresh', 'hosted hello should gate the substring brand match');
assert.ok(
  new Set(hostedHello.slice(0, 8).flatMap((result) => result.match_signals.interpretation_family_ids)).size >= 3,
  'hosted hello should diversify across approved families',
);

const hostedBrand = rerankHostedSearchCandidates('hellofresh', hostedHelloCandidates);
assert.equal(hostedBrand[0]?.icon_id, 'simpleicons:hellofresh', 'hosted exact brand search should keep identity priority');

assert.ok(getSearchInterpretationPlan('hello'), 'hello should have a maintained interpretation plan');
assert.equal(getSearchInterpretationPlan('unrelated query'), null, 'unmaintained queries should not receive hidden policy behavior');

console.log(JSON.stringify({
  status: 'ok',
  maintained_families: policy.interpretation_families.length,
  maintained_query_policies: policy.query_policies.length,
  maintained_brand_terms: policy.brand_terms.length,
  hello_top_8: helloResults.map(iconRef),
  hello_family_count_top_8: resultFamilyIds('hello', helloResults).size,
  picker_family_count_top_8: resultFamilyIds('picker', pickerResults).size,
}, null, 2));
