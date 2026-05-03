import assert from 'node:assert/strict';

import {
  addRecentSearchEntry,
  compareBrowseIconsByPopularity,
  compareSearchMatches,
  createEmptyPopularityRecord,
  getNextJobCategoryFilterForLibrarySelect,
  getPopularityRecord,
  resolveGridEmptyCopy,
  getScopedJobCategoryFilter,
  resolveGridHeadingText,
  shouldShowTagFilterBar,
  shouldSyncSearchOnBlur,
} from '../lib/icon-grid-behavior.js';
import {
  JOB_CATEGORY_DEFINITIONS,
  createIconTaxonomyMap,
} from '../lib/icon-taxonomy-seed.js';

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
  shouldShowTagFilterBar({ currentView: 'icons', activeLibrary: 'all' }),
  true,
  'tag menu should be visible in the All Icons browse scope'
);

assert.equal(
  shouldShowTagFilterBar({ currentView: 'icons', activeLibrary: 'material' }),
  true,
  'tag menu should be visible in specific library browse scopes'
);

assert.equal(
  shouldShowTagFilterBar({ currentView: 'icons', activeLibrary: 'favorites' }),
  false,
  'tag menu should be hidden in Favorites'
);

assert.equal(
  shouldShowTagFilterBar({ currentView: 'icons', activeLibrary: 'recent' }),
  false,
  'tag menu should be hidden in Recent'
);

assert.equal(
  shouldShowTagFilterBar({ currentView: 'dashboard', activeLibrary: 'all' }),
  false,
  'tag menu should be hidden on non-icon shell views'
);

assert.equal(
  getScopedJobCategoryFilter({
    currentView: 'icons',
    activeLibrary: 'all',
    activeJobCategoryFilter: 'ai-agent-workflows',
  }),
  'ai-agent-workflows',
  'All Icons should keep the selected tag filter'
);

assert.equal(
  getScopedJobCategoryFilter({
    currentView: 'icons',
    activeLibrary: 'material',
    activeJobCategoryFilter: 'navigation-wayfinding',
  }),
  'navigation-wayfinding',
  'specific library browse views should keep an effective tag filter'
);

assert.equal(
  getScopedJobCategoryFilter({
    currentView: 'icons',
    activeLibrary: 'favorites',
    activeJobCategoryFilter: 'ai-agent-workflows',
  }),
  null,
  'Favorites should not keep an effective hidden tag filter'
);

assert.equal(
  getScopedJobCategoryFilter({
    currentView: 'api-keys',
    activeLibrary: 'all',
    activeJobCategoryFilter: 'status-feedback',
  }),
  null,
  'store and account routes should not inherit an effective tag filter'
);

assert.equal(
  getNextJobCategoryFilterForLibrarySelect({
    nextLibraryId: 'all',
    activeJobCategoryFilter: 'ai-agent-workflows',
  }),
  'ai-agent-workflows',
  'clicking All Icons should preserve the selected tag when it can still be shown'
);

assert.equal(
  getNextJobCategoryFilterForLibrarySelect({
    nextLibraryId: 'favorites',
    activeJobCategoryFilter: 'status-feedback',
  }),
  'all',
  'Favorites should reset the stored tag because the tag menu is hidden there'
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
  'All Icons',
  'All Icons should keep the main heading stable when a tag is selected'
);

assert.equal(
  resolveGridHeadingText({
    currentView: 'icons',
    activeLibrary: 'lucide',
    activeJobCategoryLabel: 'Navigation & Wayfinding',
    currentTitle: 'Lucide + Navigation & Wayfinding',
    libraryTitle: 'Lucide',
  }),
  'Lucide',
  'library views should keep the library heading stable when a tag is selected'
);

assert.deepEqual(
  resolveGridEmptyCopy({
    searchQuery: 'stupid',
    hostedSearchPending: true,
  }),
  {
    title: 'Searching icons...',
    text: 'Checking the semantic search index for "stupid".',
  },
  'pending hosted search should show a loading state instead of a final no-results message'
);

assert.deepEqual(
  resolveGridEmptyCopy({
    searchQuery: 'stupid',
    hostedSearchPending: false,
  }),
  {
    title: 'No icons found',
    text: 'No icons match "stupid". Try a different search term.',
  },
  'completed searches with no matches should still show the final no-results message'
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

assert.ok(
  JOB_CATEGORY_DEFINITIONS.length >= 12,
  'tag taxonomy should cover a broad browse menu, not only three seed groups'
);

const taxonomyMap = createIconTaxonomyMap([
  makeIcon('credit-card', 'credit card', 'lucide'),
  makeIcon('file-bar-chart', 'file bar chart', 'lucide'),
  makeIcon('lock', 'lock', 'lucide'),
  makeIcon('github', 'GitHub', 'simpleicons'),
]);

assert.equal(
  taxonomyMap.get('lucide:credit-card')?.jobCategory,
  'commerce-finance',
  'credit card icons should be inferred into Commerce & Finance'
);

assert.equal(
  taxonomyMap.get('lucide:file-bar-chart')?.jobCategory,
  'files-content',
  'file chart icons should keep their file/content tag when the file object is prominent'
);

assert.equal(
  taxonomyMap.get('lucide:lock')?.jobCategory,
  'security-access',
  'lock icons should be inferred into Security & Access'
);

assert.equal(
  taxonomyMap.get('simpleicons:github')?.jobCategory,
  'brands-social',
  'Simple Icons should default to Brands & Social'
);

console.log('verify-icon-grid-behavior: ok');
