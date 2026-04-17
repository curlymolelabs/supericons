import assert from 'node:assert/strict';

import {
  addRecentSearchEntry,
  compareBrowseIconsByPopularity,
  compareSearchMatches,
  createEmptyPopularityRecord,
  getPopularityRecord,
  shouldSyncSearchOnBlur,
} from '../lib/icon-grid-behavior.js';

function makeIcon(id, name, lib = 'heroicons') {
  return { id, name, lib };
}

function record(overrides = {}) {
  return {
    ...createEmptyPopularityRecord(),
    ...overrides,
  };
}

const popularityMap = {
  'heroicons:server-stack': record({
    copyCount30d: 8,
    downloadCount30d: 6,
    favoriteCount30d: 4,
    popularityScore30d: 20,
    trendingScore7d: 9,
  }),
  'lucide:server': record({
    copyCount30d: 8,
    downloadCount30d: 1,
    favoriteCount30d: 1,
    popularityScore30d: 10,
    trendingScore7d: 4,
  }),
};

const browseIcons = [
  makeIcon('server', 'server', 'lucide'),
  makeIcon('server-stack', 'server stack', 'heroicons'),
  makeIcon('archive', 'archive', 'tabler'),
];

browseIcons.sort((a, b) => compareBrowseIconsByPopularity(a, b, popularityMap));
assert.deepEqual(
  browseIcons.map((icon) => `${icon.lib}:${icon.id}`),
  ['heroicons:server-stack', 'lucide:server', 'tabler:archive'],
  'default browse should surface higher-popularity icons first'
);

const tieBreak = [
  {
    icon: makeIcon('server', 'server', 'lucide'),
    aliasScore: 360,
    directScore: 250,
  },
  {
    icon: makeIcon('server-stack', 'server stack', 'heroicons'),
    aliasScore: 360,
    directScore: 250,
  },
];

tieBreak.sort((a, b) => compareSearchMatches(a, b, popularityMap, () => 99));
assert.equal(
  `${tieBreak[0].icon.lib}:${tieBreak[0].icon.id}`,
  'heroicons:server-stack',
  'search tie-breaks should prefer the more popular match when relevance is otherwise equal'
);

assert.equal(
  shouldSyncSearchOnBlur('self-hosted', 'self-hosted'),
  false,
  'blur should not re-sync and rerender when the current input already matches state'
);
assert.equal(
  shouldSyncSearchOnBlur('self hosted', 'self-hosted'),
  true,
  'blur should still commit meaningful input changes'
);

const recentSearches = ['server', 'home'];
const updatedRecents = addRecentSearchEntry(recentSearches, 'self-hosted', 3);
assert.deepEqual(updatedRecents, ['self-hosted', 'server', 'home']);

const dedupedRecents = addRecentSearchEntry(updatedRecents, 'server', 3);
assert.deepEqual(dedupedRecents, ['server', 'self-hosted', 'home']);

assert.deepEqual(
  getPopularityRecord(popularityMap, 'tabler:archive'),
  createEmptyPopularityRecord(),
  'icons without evidence should still receive a safe empty popularity record'
);

console.log('verify-icon-grid-behavior: ok');
