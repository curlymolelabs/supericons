import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { searchIcons } from '../mcp/search.js';
import { normalizeSearchQueryRequest } from '../mcp/search-query-normalization.js';
import { buildSearchQueryFrame } from '../mcp/runtime/search-query-frame.js';

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function iconRef(icon) {
  return `${icon.lib}:${icon.id}`;
}

function resultText(icon) {
  return [
    iconRef(icon),
    icon.name,
    icon.meaning,
    ...(icon.semanticTags || []),
    ...(icon.synonyms || []),
    ...(icon.aliases || []),
    ...(icon.searchTerms || []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

const icons = readJson('mcp/public/icon-index.json').icons
  .filter((icon) => icon.style !== 'solid');
const synonyms = readJson('mcp/public/synonyms.json');

const solidRequest = normalizeSearchQueryRequest('settings solid', 'any');
assert.equal(solidRequest.query, 'settings');
assert.equal(solidRequest.style, 'solid');
assert.equal(solidRequest.inferred_style, 'solid');

const constrainedRequest = normalizeSearchQueryRequest(
  'settings visually distinct 18px',
  'any',
);
assert.equal(constrainedRequest.query, 'settings');
assert.deepEqual(constrainedRequest.removed_constraints, ['visually distinct', 'size']);

const solidStateRequest = normalizeSearchQueryRequest('solid state drive', 'any');
assert.equal(solidStateRequest.query, 'solid state drive');
assert.equal(solidStateRequest.style, 'any');

const k8sResults = searchIcons('k8s', icons, synonyms, { limit: 3 });
assert.ok(k8sResults.length > 0);
assert.equal(iconRef(k8sResults[0]), 'simpleicons:kubernetes');

const typoCases = [
  {
    query: 'notifcation',
    acceptable: /notification|bell/,
    expectedVariant: 'notification',
  },
  {
    query: 'databse',
    acceptable: /database/,
    expectedVariant: 'database',
  },
];
for (const testCase of typoCases) {
  const results = searchIcons(testCase.query, icons, synonyms, { limit: 3 });
  assert.equal(results.length, 3, `${testCase.query}: expected three typo-recovered results`);
  assert.ok(
    results.every((icon) => testCase.acceptable.test(resultText(icon))),
    `${testCase.query}: typo recovery returned an unrelated result`,
  );
  assert.ok(
    results.every((icon) => icon.query_variant === testCase.expectedVariant),
    `${testCase.query}: corrected query variant is missing`,
  );
  assert.ok(
    results.every((icon) => icon.query_variant_kind === 'normalized_typo'),
    `${testCase.query}: typo match kind is missing`,
  );
}

const expressiveCases = [
  {
    id: 'ship-it',
    query: 'ship it',
    group: 'ship_it_expression',
    acceptable: /rocket.launch|deployed.code|package.check|check.circle|send/,
  },
  {
    id: 'burnout',
    query: 'burnout',
    group: 'burnout_expression',
    acceptable: /flame|battery.low|battery.warning|coffee|hourglass/,
  },
  {
    id: 'chill',
    query: 'chill',
    group: 'chill_expression',
    acceptable: /relax|coffee|weather.snow|sun.snow|smile|sofa/,
  },
  {
    id: 'doomscrolling',
    query: 'doomscrolling',
    group: 'doomscrolling_expression',
    acceptable: /mouse.scroll|phone|hourglass|warning|screen.time/,
  },
  {
    id: 'ai-slop',
    query: 'ai slop',
    group: 'ai_low_quality_output',
    acceptable: /bot.off|warning|trash|x.circle|image.off/,
  },
  {
    id: 'touch-grass',
    query: 'touch grass',
    group: 'touch_grass_expression',
    acceptable: /sprout|leaf|tree|sun|footprints/,
  },
  {
    id: 'brainstorm',
    query: 'brainstorm',
    group: 'brainstorm_expression',
    acceptable: /brain|lightbulb|sparkles|cloud|network/,
  },
  {
    id: 'lightbulb-moment',
    query: 'lightbulb moment',
    group: 'lightbulb_moment_expression',
    acceptable: /lightbulb|sparkles|idea|bolt|brain/,
  },
];

const observations = [];
for (const testCase of expressiveCases) {
  const frame = buildSearchQueryFrame(testCase.query);
  assert.ok(
    frame.meaning_groups.includes(testCase.group),
    `${testCase.id}: missing intent group ${testCase.group}`,
  );
  const results = searchIcons(testCase.query, icons, synonyms, { limit: 3 });
  assert.equal(results.length, 3, `${testCase.id}: expected three expressive results`);
  assert.ok(
    results.every((icon) => testCase.acceptable.test(resultText(icon))),
    `${testCase.id}: expressive mapping returned an unrelated result`,
  );
  assert.ok(
    results.every((icon) => icon.query_variant_kind === 'semantic_fallback'),
    `${testCase.id}: expressive results must be labeled`,
  );
  observations.push({
    id: testCase.id,
    top_icon_refs: results.map(iconRef),
    matched_query_variants: results.map((icon) => icon.query_variant),
  });
}

console.log(JSON.stringify({
  status: 'ok',
  parser_cases: 3,
  alias_cases: 1,
  typo_cases: typoCases.length,
  expressive_cases: observations.length,
  observations,
}, null, 2));
