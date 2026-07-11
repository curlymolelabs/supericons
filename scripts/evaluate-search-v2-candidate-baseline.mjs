import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { buildSearchQueryFrame } from '../lib/search-query-frame.js';
import { searchIcons } from '../mcp/search.js';

const repoRoot = join(import.meta.dirname, '..');
const evaluationSet = JSON.parse(readFileSync(
  join(repoRoot, 'data', 'semantic-search-v2', 'evaluation-set.json'),
  'utf8',
));
const icons = JSON.parse(readFileSync(join(repoRoot, 'mcp', 'public', 'icon-index.json'), 'utf8')).icons
  .filter((icon) => icon.type === 'svg' && icon.svg);
const synonyms = JSON.parse(readFileSync(join(repoRoot, 'mcp', 'public', 'synonyms.json'), 'utf8'));

function getGroup(id) {
  const group = evaluationSet.query_groups.find((entry) => entry.id === id);
  if (!group) throw new Error(`Missing evaluation group ${id}`);
  return group;
}

function normalize(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function matchesFamily(icon, family) {
  const candidate = normalize(`${icon.lib} ${icon.id} ${icon.name}`);
  const tokens = normalize(family).split(' ').filter(Boolean);
  return tokens.length > 0 && tokens.every((token) => candidate.includes(token));
}

function runObservedSearch(testCase) {
  const searchable = testCase.library_mode === 'strict'
    ? icons.filter((icon) => icon.lib === testCase.requested_library)
    : icons;
  const results = searchIcons(testCase.query, searchable, synonyms, {
    library: testCase.library_mode === 'strict' ? testCase.requested_library : undefined,
    limit: 5,
  });
  const proposedAvoidHits = [];

  for (const family of testCase.proposed_avoid_families || []) {
    for (const icon of results) {
      if (matchesFamily(icon, family)) {
        proposedAvoidHits.push(`${icon.lib}:${icon.id}`);
      }
    }
  }

  return {
    case_id: testCase.case_id,
    query: testCase.query,
    library_mode: testCase.library_mode || 'all',
    requested_library: testCase.requested_library || null,
    status: 'observed_current_deterministic_search',
    zero_result: results.length === 0,
    top_icon_refs: results.map((icon) => `${icon.lib}:${icon.id}`),
    proposed_avoid_hits: [...new Set(proposedAvoidHits)],
  };
}

const julyCases = getGroup('july_11_regression_seeds').queries.map((testCase) => ({
  ...runObservedSearch({ ...testCase, library_mode: 'all' }),
  query_frame: (() => {
    const frame = buildSearchQueryFrame(testCase.query);
    return {
      matched: frame.matched,
      intent_types: frame.intent_types,
      meaning_groups: frame.meaning_groups,
      confidence_floor: frame.confidence_floor,
    };
  })(),
}));

const libraryCases = getGroup('library_mode_contract').queries.map((testCase) => {
  if (testCase.library_mode === 'prefer') {
    return {
      case_id: testCase.case_id,
      query: testCase.query,
      library_mode: testCase.library_mode,
      requested_library: testCase.requested_library,
      status: 'not_implemented',
      reason: 'Current search accepts a library filter but has no preferred-library fallback mode.',
    };
  }
  return runObservedSearch(testCase);
});

const observedLibraryCases = libraryCases.filter((entry) => entry.status !== 'not_implemented');

console.log(JSON.stringify({
  schema_version: evaluationSet.schema_version,
  candidate_case_count: evaluationSet.query_groups.flatMap((group) => group.queries || []).length,
  summary: {
    july_seed_cases: julyCases.length,
    july_seed_zero_results: julyCases.filter((entry) => entry.zero_result).length,
    july_seed_unclassified_frames: julyCases.filter((entry) => !entry.query_frame.matched).length,
    observed_library_cases: observedLibraryCases.length,
    observed_library_zero_results: observedLibraryCases.filter((entry) => entry.zero_result).length,
    preferred_library_cases_not_implemented: libraryCases.filter((entry) => entry.status === 'not_implemented').length,
    cases_with_proposed_avoid_hits: [...julyCases, ...observedLibraryCases]
      .filter((entry) => entry.proposed_avoid_hits?.length > 0).length,
  },
  july_cases: julyCases,
  library_cases: libraryCases,
}, null, 2));
