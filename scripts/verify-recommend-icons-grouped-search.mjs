import assert from 'node:assert/strict';

import { recommendIconsForTask } from '../mcp/recommend-icons.js';

const stubIcon = {
  id: 'settings',
  name: 'Settings',
  lib: 'lucide',
  style: 'outline',
  svg: '<svg></svg>',
};

function buildIconResult(icon) {
  return {
    id: icon.id,
    name: icon.name,
    library: icon.lib,
    style: icon.style,
    svg: icon.svg,
  };
}

let groupedCalls = 0;
let singleCalls = 0;
let groupedQueries = [];
const grouped = await recommendIconsForTask({
  task: 'Choose icons for application settings and account profile.',
  slots: ['cog', 'profile'],
  limitPerSlot: 2,
  responseMode: 'plan',
  semanticMap: new Map(),
  searchIconsForQuery: async () => {
    singleCalls += 1;
    return [stubIcon];
  },
  searchIconsForQueries: async (queries) => {
    groupedCalls += 1;
    groupedQueries = queries;
    return queries.map(() => [stubIcon]);
  },
  buildIconResult,
});

assert.equal(groupedCalls, 1, 'One recommendation must use one grouped search call.');
assert.equal(singleCalls, 0, 'Grouped mode must not fall back to separate search calls.');
assert.ok(groupedQueries.length >= 2, 'Grouped search must include variants from every resolved slot.');
assert.equal(groupedQueries.every((query) => query.limit === 10), true);
assert.equal(grouped.results.length, 2);
assert.equal(grouped.results.every((result) => Boolean(result.recommended)), true);

let clarificationGroupedCalls = 0;
let clarificationSingleCalls = 0;
const clarification = await recommendIconsForTask({
  task: 'Choose an icon.',
  slots: ['hello'],
  limitPerSlot: 2,
  responseMode: 'plan',
  semanticMap: new Map(),
  searchIconsForQuery: async () => {
    clarificationSingleCalls += 1;
    return [stubIcon];
  },
  searchIconsForQueries: async () => {
    clarificationGroupedCalls += 1;
    return [];
  },
  buildIconResult,
});
assert.equal(clarification.needs_clarification, true);
assert.equal(clarificationGroupedCalls, 0, 'Clarification must short-circuit grouped retrieval.');
assert.equal(clarificationSingleCalls, 0, 'Clarification must short-circuit separate retrieval.');

let fallbackCalls = 0;
await recommendIconsForTask({
  task: 'Choose an icon for application settings.',
  slots: ['cog'],
  limitPerSlot: 2,
  responseMode: 'plan',
  semanticMap: new Map(),
  searchIconsForQuery: async () => {
    fallbackCalls += 1;
    return [stubIcon];
  },
  buildIconResult,
});
assert.ok(fallbackCalls > 1, 'Existing callers must retain separate-search fallback behavior.');

const parityInput = {
  task: 'Choose icons for application settings and account profile.',
  slots: ['cog', 'profile'],
  limitPerSlot: 2,
  responseMode: 'plan',
  semanticMap: new Map(),
  buildIconResult,
};
const parityIcons = [
  stubIcon,
  { id: 'user', name: 'User', lib: 'lucide', style: 'outline', svg: '<svg></svg>' },
];
const separateParity = await recommendIconsForTask({
  ...parityInput,
  searchIconsForQuery: async () => parityIcons,
});
const groupedParity = await recommendIconsForTask({
  ...parityInput,
  searchIconsForQuery: async () => {
    throw new Error('Separate callback must not run during grouped parity.');
  },
  searchIconsForQueries: async (queries) => queries.map(() => parityIcons),
});
assert.deepEqual(groupedParity, separateParity, 'Grouped recommendation results must match separate searches exactly.');

const twentySlots = [
  'home',
  'workouts',
  'progress',
  'goals',
  'nutrition',
  'calendar',
  'profile',
  'settings',
  'notifications',
  'search',
  'favorites',
  'history',
  'community',
  'coaching',
  'achievements',
  'heart rate',
  'sleep',
  'hydration',
  'running',
  'strength',
];
let twentySlotGroupedCalls = 0;
let twentySlotQueryCount = 0;
const twentySlotRecommendation = await recommendIconsForTask({
  task: 'Choose navigation and feature icons for a fitness application.',
  slots: twentySlots,
  limitPerSlot: 1,
  responseMode: 'plan',
  semanticMap: new Map(),
  searchIconsForQuery: async () => {
    throw new Error('The 20-slot case must use grouped search.');
  },
  searchIconsForQueries: async (queries) => {
    twentySlotGroupedCalls += 1;
    twentySlotQueryCount = queries.length;
    assert.equal(queries.every((query) => query.limit === 10), true);
    return queries.map(() => parityIcons);
  },
  buildIconResult,
});
assert.equal(twentySlotGroupedCalls, 1, 'Twenty slots must use one grouped hosted request.');
assert.equal(twentySlotRecommendation.slot_count, 20);
assert.equal(twentySlotRecommendation.results.length, 20);
assert.ok(twentySlotQueryCount <= 40, 'Twenty slots must stay inside the recommendation query-fanout cap.');

let localizedTwentySlotQueryCount = 0;
const localizedTwentySlotRecommendation = await recommendIconsForTask({
  task: 'フィットネスアプリのナビゲーションアイコンを選ぶ。',
  slots: Array.from({ length: 20 }, (_, index) => `設定 ${index + 1}`),
  locale: 'ja',
  limitPerSlot: 1,
  responseMode: 'plan',
  semanticMap: new Map(),
  searchIconsForQuery: async () => {
    throw new Error('The localized 20-slot case must use grouped search.');
  },
  searchIconsForQueries: async (queries) => {
    localizedTwentySlotQueryCount = queries.length;
    assert.equal(queries.every((query) => query.limit === 10), true);
    return queries.map(() => parityIcons);
  },
  buildIconResult,
});
assert.equal(localizedTwentySlotRecommendation.slot_count, 20);
assert.ok(
  localizedTwentySlotQueryCount <= 40,
  'Twenty localized slots must stay inside the recommendation query-fanout cap.',
);

let repeatedSlotQueryCount = 0;
const repeatedSlotRecommendation = await recommendIconsForTask({
  task: 'Choose icons for application settings.',
  slots: Array.from({ length: 20 }, () => 'settings'),
  limitPerSlot: 1,
  responseMode: 'plan',
  semanticMap: new Map(),
  searchIconsForQuery: async () => {
    throw new Error('The repeated-slot case must use grouped search.');
  },
  searchIconsForQueries: async (queries) => {
    repeatedSlotQueryCount = queries.length;
    assert.equal(queries.every((query) => query.limit === 10), true);
    return queries.map(() => parityIcons);
  },
  buildIconResult,
});
assert.equal(repeatedSlotRecommendation.results.length, 20);
assert.equal(repeatedSlotRecommendation.results.every((result) => Boolean(result.recommended)), true);
assert.ok(
  repeatedSlotQueryCount <= 2,
  'Repeated slots must reuse identical logical searches instead of issuing 40 duplicates.',
);

const groupedFailure = new Error('Hosted request timed out.');
groupedFailure.code = 'hosted_search_timeout';
await assert.rejects(
  recommendIconsForTask({
    task: 'Choose settings icons.',
    slots: ['settings'],
    limitPerSlot: 1,
    responseMode: 'plan',
    semanticMap: new Map(),
    searchIconsForQuery: async () => [],
    searchIconsForQueries: async () => {
      throw groupedFailure;
    },
    buildIconResult,
  }),
  (error) => error === groupedFailure,
  'Grouped dependency failures must reach the tool handler instead of becoming false no-results.',
);

console.log(JSON.stringify({
  status: 'ok',
  grouped_calls: groupedCalls,
  grouped_query_count: groupedQueries.length,
  clarification_retrieval_calls: 0,
  fallback_calls: fallbackCalls,
  recommendation_result_parity: true,
  twenty_slot_grouped_calls: twentySlotGroupedCalls,
  twenty_slot_query_count: twentySlotQueryCount,
  localized_twenty_slot_query_count: localizedTwentySlotQueryCount,
  repeated_twenty_slot_query_count: repeatedSlotQueryCount,
  candidate_limit_preserved: 10,
  grouped_failure_propagated: true,
}, null, 2));
