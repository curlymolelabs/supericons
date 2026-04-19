import assert from 'node:assert/strict';

import {
  addRecentSearchEntry,
  compareBrowseIconsByPopularity,
  compareSearchMatches,
  createEmptyPopularityRecord,
  getNextJobCategoryFilterForLibrarySelect,
  getPopularityRecord,
  getScopedJobCategoryFilter,
  resolveGridHeadingText,
  shouldShowPurposeFilterBar,
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

assert.equal(
  shouldShowPurposeFilterBar({ currentView: 'icons', activeLibrary: 'all' }),
  true,
  'purpose chips should be visible in the All Icons browse scope'
);

assert.equal(
  shouldShowPurposeFilterBar({ currentView: 'icons', activeLibrary: 'material' }),
  false,
  'purpose chips should be hidden in specific free-library browse scopes until taxonomy coverage is mature'
);

assert.equal(
  shouldShowPurposeFilterBar({ currentView: 'icons', activeLibrary: 'favorites' }),
  false,
  'purpose chips should be hidden in Favorites'
);

assert.equal(
  shouldShowPurposeFilterBar({ currentView: 'icons', activeLibrary: 'recent' }),
  false,
  'purpose chips should be hidden in Recent'
);

assert.equal(
  shouldShowPurposeFilterBar({ currentView: 'dashboard', activeLibrary: 'all' }),
  false,
  'purpose chips should be hidden on non-icon shell views'
);

assert.equal(
  getScopedJobCategoryFilter({
    currentView: 'icons',
    activeLibrary: 'all',
    activeJobCategoryFilter: 'ai-agent-workflows',
  }),
  'ai-agent-workflows',
  'All Icons should keep the selected purpose filter'
);

assert.equal(
  getScopedJobCategoryFilter({
    currentView: 'icons',
    activeLibrary: 'material',
    activeJobCategoryFilter: 'navigation-wayfinding',
  }),
  null,
  'specific free-library browse views should not keep an effective hidden purpose filter'
);

assert.equal(
  getScopedJobCategoryFilter({
    currentView: 'icons',
    activeLibrary: 'favorites',
    activeJobCategoryFilter: 'ai-agent-workflows',
  }),
  null,
  'Favorites should not keep an effective hidden purpose filter'
);

assert.equal(
  getScopedJobCategoryFilter({
    currentView: 'api-keys',
    activeLibrary: 'all',
    activeJobCategoryFilter: 'status-feedback',
  }),
  null,
  'store and account routes should not inherit an effective purpose filter'
);

assert.equal(
  getNextJobCategoryFilterForLibrarySelect({
    nextLibraryId: 'all',
    activeJobCategoryFilter: 'ai-agent-workflows',
  }),
  'all',
  'clicking All Icons should reset the stored purpose filter to the default state'
);

assert.equal(
  getNextJobCategoryFilterForLibrarySelect({
    nextLibraryId: 'favorites',
    activeJobCategoryFilter: 'status-feedback',
  }),
  'status-feedback',
  'non-root library navigation should preserve the stored purpose filter until All Icons is selected'
);

assert.equal(
  resolveGridHeadingText({
    currentView: 'store-shell',
    activeLibrary: 'all',
    activeJobCategoryLabel: 'AI Agent Workflows',
    currentTitle: 'Premium Collections',
    libraryTitle: 'All Icons',
  }),
  'Premium Collections',
  'store-owned routes should keep their own heading instead of being overwritten by icon-grid state'
);

assert.equal(
  resolveGridHeadingText({
    currentView: 'icons',
    activeLibrary: 'all',
    activeJobCategoryLabel: 'AI Agent Workflows',
    currentTitle: 'Premium Collections',
    libraryTitle: 'All Icons',
  }),
  'AI Agent Workflows',
  'All Icons should still promote the active purpose label when the icon grid owns the heading'
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
