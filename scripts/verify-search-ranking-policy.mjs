import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { rerankHostedSearchCandidates } from '../lib/hosted-search-core.js';
import {
  buildSearchRankingQueryVariants,
  getBrandRankAdjustment,
  getCandidateInterpretationFamilyIds,
  getExpressiveFallbackPenalty,
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
assert.ok(
  Array.isArray(policy.candidate_strength_policy?.expressive_fallback_tags)
    && policy.candidate_strength_policy.expressive_fallback_tags.length > 0,
  'candidate strength policy should define expressive fallback tags',
);
assert.ok(
  Number(policy.candidate_strength_policy?.broad_match_penalty) > 0,
  'candidate strength policy should define a positive broad-match penalty',
);
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
  assert.ok(queryPolicy.bare_intent_types?.length > 0, `${queryPolicy.id}: public intent types are required`);
  for (const intentType of [
    ...(queryPolicy.bare_intent_types || []),
    ...(queryPolicy.context_intent_types || []),
  ]) {
    assert.match(intentType, /^[a-z0-9_]+$/, `${queryPolicy.id}: intent type should be snake_case`);
  }
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

const cogRetrievalVariants = buildSearchRankingQueryVariants('cog', ['cog'], { maxVariants: 14 });
assert.deepEqual(
  cogRetrievalVariants,
  ['cog', 'gear'],
  'cog should add the first distinct settings-family retrieval term without expanding every synonym',
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
const swiftCase = evaluationSet.query_groups
  .flatMap((group) => group.queries || [])
  .find((entry) => entry.case_id === 'brand-gate-swift');
const swiftOrdering = swiftCase?.ordering_expectation;
assert.ok(swiftOrdering, 'bare swift should declare its reviewed ordering expectation');
const swiftRefs = swiftResults.map(iconRef);
const personLaunchedIndex = swiftRefs.indexOf(swiftOrdering.included_icon_ref);
assert.ok(personLaunchedIndex >= 0, 'bare swift should retain the related Person Launched icon');
assert.ok(
  personLaunchedIndex + 1 >= swiftOrdering.rank_min && personLaunchedIndex + 1 <= swiftOrdering.rank_max,
  'Person Launched should stay in the reviewed lower-rank range for bare swift',
);
assert.ok(
  swiftOrdering.any_brand_ref_before.some((ref) => {
    const index = swiftRefs.indexOf(ref);
    return index >= 0 && index < personLaunchedIndex;
  }),
  'bare swift should rank an approved Swift identity before Person Launched',
);
assert.ok(
  swiftOrdering.any_conventional_ref_before.some((ref) => {
    const index = swiftRefs.indexOf(ref);
    return index >= 0 && index < personLaunchedIndex;
  }),
  'bare swift should rank a conventional speed icon before Person Launched',
);

const expressiveCandidate = {
  name: 'Person Launched',
  id: 'person-launched',
  aiFilterTags: ['trending-culture', 'meme', 'speed'],
  secondaryCategories: ['humor', 'meme'],
  synonyms: ['flung', 'catapulted', 'takeoff', 'yeeted fast'],
};
assert.equal(
  getExpressiveFallbackPenalty('swift', expressiveCandidate),
  25,
  'an expressive related match should receive the generic fallback penalty',
);
assert.equal(
  getExpressiveFallbackPenalty('person launched', expressiveCandidate),
  0,
  'an expressive icon should keep full priority for its own name',
);
assert.equal(
  getExpressiveFallbackPenalty('takeoff', expressiveCandidate),
  0,
  'an expressive icon should keep full priority for an approved direct synonym',
);
assert.equal(iconRef(localSearch('person launched')[0]), 'si:person-launched', 'Person Launched should rank first for its own name');
assert.equal(iconRef(localSearch('takeoff')[0]), 'si:person-launched', 'Person Launched should rank first for its approved takeoff meaning');
assert.ok(
  localSearch('yeet').slice(0, 3).some((icon) => iconRef(icon) === 'si:person-launched'),
  'Person Launched should remain visible for the related yeet meaning',
);

const lovableResults = localSearch('lovable');
const lovableFamilies = resultFamilyIds('lovable', lovableResults);
assert.ok(lovableResults.some((icon) => iconRef(icon) === 'si:lovable'), 'bare lovable should retain the brand interpretation');
assert.ok(lovableFamilies.has('brand_identity'), 'bare lovable should identify the brand family');
assert.ok(lovableFamilies.has('love_affection'), 'bare lovable should include love or affection concepts');
assert.ok(
  lovableResults.every((icon) => !iconRef(icon).includes('boxing-glove')),
  'bare lovable should not admit boxing glove substring leakage',
);
assert.equal(iconRef(localSearch('lovable logo')[0]), 'si:lovable', 'explicit Lovable logo should keep identity priority');

const lovableBrandTerm = policy.brand_terms.find((entry) => entry.term === 'lovable');
assert.equal(lovableBrandTerm?.match_class, 'ambiguous_exact', 'Lovable should be maintained as ambiguous exact');
assert.equal(getSearchInterpretationPlan('lovable')?.needs_clarification, true, 'bare lovable should remain explicitly ambiguous');
assert.deepEqual(
  getSearchInterpretationPlan('lovable logo')?.families.map((family) => family.id),
  ['brand_identity'],
  'explicit Lovable logo context should narrow to brand identity',
);

const lovableCase = evaluationSet.query_groups
  .find((entry) => entry.id === 'brand_logo_exact')
  ?.queries.find((entry) => entry.case_id === 'legacy-brand-lovable');
assert.equal(lovableCase?.expected_top_icon_ids, undefined, 'bare lovable should permit rather than require brand rank 1');
assert.ok(
  lovableCase?.required_interpretation_families_top_8?.includes('love_affection'),
  'bare lovable fixture should require love or affection in the top eight',
);

const lovableLogoCase = evaluationSet.query_groups
  .find((entry) => entry.id === 'brand_intent_gating')
  ?.queries.find((entry) => entry.case_id === 'brand-gate-lovable-logo');
assert.deepEqual(lovableLogoCase?.expected_top_icon_ids, ['si:lovable'], 'explicit Lovable logo fixture should require rank 1');

const ambiguousConceptExpectations = new Map([
  ['artificial analysis', ['data_analysis']],
  ['bolt', ['electrical_power', 'speed_motion']],
  ['cohere', ['cohesion_connection']],
  ['goose', ['bird_animal']],
  ['opencode', ['source_code']],
  ['open code', ['source_code']],
  ['pinecone', ['pine_nature']],
  ['portkey', ['key_object']],
  ['runway', ['airport_runway', 'fashion_runway']],
  ['smithery', ['workshop_craft']],
  ['stagehand', ['theatre_stage']],
  ['temporal', ['time_concept']],
  ['grok', ['understanding_insight']],
  ['codex', ['book_manuscript']],
]);
for (const [query, requiredFamilies] of ambiguousConceptExpectations) {
  const results = localSearch(query);
  const families = resultFamilyIds(query, results);
  for (const familyId of requiredFamilies) {
    assert.ok(families.has(familyId), `${query}: top eight should include ${familyId}`);
  }
}

for (const brandTerm of policy.brand_terms.filter((entry) => entry.match_class === 'ambiguous_exact')) {
  const explicitResults = localSearch(`${brandTerm.term} logo`);
  assert.ok(
    brandTerm.icon_refs.includes(iconRef(explicitResults[0])),
    `${brandTerm.term}: explicit logo query should rank an approved identity first`,
  );
}

for (const brandTerm of policy.brand_terms) {
  const candidate = { icon_id: brandTerm.icon_refs[0], name: brandTerm.term, assetType: 'brand-logo' };
  for (const blockedAlias of brandTerm.blocked_aliases || []) {
    assert.equal(
      getBrandRankAdjustment(blockedAlias, candidate).match_class,
      'blocked_alias',
      `${blockedAlias}: rejected alias should use the generic blocked-alias rule`,
    );
    assert.notEqual(
      iconRef(localSearch(blockedAlias)[0] || {}),
      brandTerm.icon_refs[0],
      `${blockedAlias}: rejected alias should not rank the SI brand first`,
    );
  }
}

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

const hostedExpressiveOrdering = rerankHostedSearchCandidates('swift', [
  { icon_id: 'material:speed', name: 'Speed', source_library: 'material', lexical_rank: 1, query_variant: 'speed' },
  { icon_id: 'iconoir:apple-swift', name: 'Apple Swift', source_library: 'iconoir', lexical_rank: 0.95, query_variant: 'swift' },
  {
    icon_id: 'si:person-launched',
    name: 'Person Launched',
    source_library: 'si',
    lexical_rank: 0.98,
    query_variant: 'speed',
    aiFilterTags: ['trending-culture', 'meme', 'speed'],
    secondaryCategories: ['humor', 'meme'],
  },
]);
assert.deepEqual(
  hostedExpressiveOrdering.map((entry) => entry.icon_id),
  ['material:speed', 'iconoir:apple-swift', 'si:person-launched'],
  'hosted ranking should keep conventional and identity results before an expressive broad match',
);
assert.equal(
  hostedExpressiveOrdering[2]?.match_signals?.expressive_fallback_penalty,
  25,
  'hosted ranking should expose the maintained expressive fallback penalty',
);

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
  swift_top_8: swiftRefs,
  person_launched_rank_for_swift: personLaunchedIndex + 1,
  lovable_top_8: lovableResults.map(iconRef),
  lovable_family_count_top_8: lovableFamilies.size,
}, null, 2));
