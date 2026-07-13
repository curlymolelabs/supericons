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

console.log(JSON.stringify({
  status: 'ok',
  grouped_calls: groupedCalls,
  grouped_query_count: groupedQueries.length,
  clarification_retrieval_calls: 0,
  fallback_calls: fallbackCalls,
  recommendation_result_parity: true,
}, null, 2));
