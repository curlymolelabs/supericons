import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  getCandidateInterpretationFamilyIds,
  rerankSearchCandidatesAtFusion,
} from '../lib/search-ranking-policy.js';
import { rerankHostedSearchCandidates } from '../lib/hosted-search-core.js';
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

function iconRef(icon) {
  return `${icon.lib}:${icon.id}`;
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
  return normalize(family).split(' ').filter(Boolean).every((token) => text.includes(token));
}

function matchesAnyFamily(icon, families = []) {
  return families.some((family) => matchesFamily(icon, family));
}

const evaluationSet = readJson('data/semantic-search-v2/evaluation-set.json');
const group = evaluationSet.query_groups.find((entry) => entry.id === 'library_mode_contract');
assert.equal(group?.review_status, 'owner_reviewed', 'library cases should record owner approval');
assert.equal(group.queries.length, 15, 'library contract should contain 15 cases');

const localMcpSource = readFileSync('mcp/index.js', 'utf8');
const remoteMcpSource = readFileSync('mcp/remote-server.js', 'utf8');
const hostedClientSource = readFileSync('mcp/hosted-search-client.js', 'utf8');
const hostedHandlerSource = readFileSync('supabase/functions/_shared/search-engine/handle-search-request.ts', 'utf8');
for (const [label, source] of [
  ['local MCP', localMcpSource],
  ['remote MCP', remoteMcpSource],
  ['hosted client', hostedClientSource],
  ['hosted handler', hostedHandlerSource],
]) {
  assert.match(source, /library_mode/, `${label}: library_mode should be wired through the contract`);
}
assert.doesNotMatch(localMcpSource, /library_mode:[\s\S]{0,160}default\('strict'\)/, 'local MCP should derive the mode from whether a library was named');
assert.doesNotMatch(remoteMcpSource, /library_mode:[\s\S]{0,160}default\('strict'\)/, 'remote MCP should derive the mode from whether a library was named');
const mcpPackage = readJson('mcp/package.json');
assert.ok(mcpPackage.files.includes('runtime/generated-search-ranking-policy.js'), 'MCP package should include generated ranking policy');
assert.ok(mcpPackage.files.includes('runtime/search-ranking-policy.js'), 'MCP package should include ranking policy runtime');

const { icons } = readJson('public/icon-index.json');
const synonyms = readJson('public/synonyms.json');
const observations = [];

for (const testCase of group.queries) {
  const results = searchIcons(testCase.query, icons, synonyms, {
    library: testCase.requested_library,
    libraryMode: testCase.library_mode,
    limit: 8,
  });
  const refs = results.map(iconRef);

  assert.ok(results.length > 0, `${testCase.case_id}: should return a useful family`);
  assert.ok(
    matchesAnyFamily(results[0], testCase.acceptable_families)
      || getCandidateInterpretationFamilyIds(testCase.query, results[0]).length > 0,
    `${testCase.case_id}: top result ${refs[0]} should match an acceptable family`,
  );
  assert.ok(
    !(testCase.prohibited_top_icon_refs || []).includes(refs[0]),
    `${testCase.case_id}: prohibited result ${refs[0]} should not rank first`,
  );
  for (const avoidFamily of testCase.proposed_avoid_families || []) {
    assert.ok(
      results.slice(0, 8).every((icon) => !matchesFamily(icon, avoidFamily)),
      `${testCase.case_id}: top eight should not contain ${avoidFamily}`,
    );
  }

  if (testCase.library_mode === 'strict') {
    assert.ok(
      results.every((icon) => icon.lib === testCase.requested_library),
      `${testCase.case_id}: strict mode should not cross libraries`,
    );
  }

  if (testCase.library_mode === 'prefer') {
    const topThreeRequestedCount = results.slice(0, 3)
      .filter((icon) => icon.lib === testCase.requested_library).length;
    const crossLibraryCount = results.slice(0, 8)
      .filter((icon) => icon.lib !== testCase.requested_library).length;
    assert.ok(
      topThreeRequestedCount >= testCase.minimum_requested_library_results_top_3,
      `${testCase.case_id}: preferred library should appear in the top three`,
    );
    assert.ok(
      crossLibraryCount >= testCase.minimum_cross_library_alternatives_top_8,
      `${testCase.case_id}: prefer mode should include a labeled cross-library alternative`,
    );
  }

  if (testCase.library_mode === 'all') {
    assert.ok(new Set(results.map((icon) => icon.lib)).size >= 2, `${testCase.case_id}: all mode should search multiple libraries`);
  }

  observations.push({ case_id: testCase.case_id, top_icon_refs: refs });
}

for (const retrievalTier of ['lexical', 'synonym', 'intent_family', 'vector']) {
  const ranked = rerankSearchCandidatesAtFusion('bell', [
    { lib: 'phosphor', id: 'barbell', name: 'Barbell', retrieval_tier: retrievalTier },
    { lib: 'phosphor', id: 'bell', name: 'Bell', retrieval_tier: 'lexical' },
  ]);
  assert.equal(iconRef(ranked[0]), 'phosphor:bell', `${retrievalTier}: no tier may bypass final policy enforcement`);
}

const hostedCandidates = [
  { icon_id: 'lucide:cog', name: 'Cog', source_library: 'lucide', lexical_rank: 1.2 },
  { icon_id: 'bootstrap:gear', name: 'Gear', source_library: 'bootstrap', lexical_rank: 1.0 },
  { icon_id: 'bootstrap:incognito', name: 'Incognito', source_library: 'bootstrap', lexical_rank: 2.0 },
];
const hostedStrict = rerankHostedSearchCandidates(
  'cog',
  hostedCandidates,
  new Map(),
  new Map(),
  { libraryMode: 'strict', requestedLibrary: 'bootstrap' },
);
assert.deepEqual(hostedStrict.map((entry) => entry.icon_id), ['bootstrap:gear'], 'hosted strict mode should stay safe and inside the requested library');
const hostedPrefer = rerankHostedSearchCandidates(
  'cog',
  hostedCandidates,
  new Map(),
  new Map(),
  { libraryMode: 'prefer', requestedLibrary: 'bootstrap' },
);
assert.equal(hostedPrefer[0]?.icon_id, 'bootstrap:gear', 'hosted prefer mode should put a safe requested-library result first');
assert.ok(hostedPrefer.some((entry) => entry.source_library === 'lucide'), 'hosted prefer mode should retain a cross-library alternative');
const hostedAll = rerankHostedSearchCandidates(
  'cog',
  hostedCandidates,
  new Map(),
  new Map(),
  { libraryMode: 'all' },
);
assert.equal(hostedAll[0]?.icon_id, 'lucide:cog', 'hosted all mode should keep the strongest safe result');

console.log(JSON.stringify({
  status: 'ok',
  cases: observations.length,
  strict_cases: group.queries.filter((entry) => entry.library_mode === 'strict').length,
  prefer_cases: group.queries.filter((entry) => entry.library_mode === 'prefer').length,
  all_cases: group.queries.filter((entry) => entry.library_mode === 'all').length,
  observations,
}, null, 2));
