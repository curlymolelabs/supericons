import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { searchIcons } from '../mcp/search.js';
import { buildSearchQueryFrame } from '../mcp/runtime/search-query-frame.js';

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function iconRef(icon) {
  return `${icon.lib}:${icon.id}`;
}

function searchableText(icon) {
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

const favoriteResults = searchIcons('favorite', icons, synonyms, {
  library: 'material',
  libraryMode: 'strict',
  limit: 5,
});
assert.equal(favoriteResults.length, 5);
assert.ok(
  favoriteResults.every((icon) => /favorite|heart|star|bookmark/.test(searchableText(icon))),
  'favorite must not return substring fillers such as start or saver',
);
const cases = [
  {
    id: 'analytics-dashboard-prefer-tabler',
    query: 'analytics dashboard',
    options: { library: 'tabler', libraryMode: 'prefer' },
    acceptable: /dashboard|analytics|gauge|chart|metrics/,
    forbidden: /mobiledata|campaignmonitor/,
    expectedGroup: 'analytics_dashboard',
    requireVariant: true,
    expectedFirstLibrary: 'tabler',
  },
  {
    id: 'restore-deleted-item',
    query: 'restore an item that was deleted by mistake',
    acceptable: /restore|undo|archive|history|trash|recovery|retry/,
    forbidden: /dishwasher|car.?wash/,
    expectedGroup: 'restore_deleted_item',
    requireVariant: true,
  },
  {
    id: 'analytics-dashboard-transposition-typos',
    query: 'analtyics dashbord',
    acceptable: /analytics|dashboard|chart|gauge|metrics/,
    forbidden: /mobiledata|campaignmonitor/,
    requireVariant: true,
  },
  {
    id: 'cloud-deployment',
    query: 'cloud deployment',
    acceptable: /cloud|upload|deploy|vercel|server|rocket|release|package/,
    forbidden: /production.quantity|factory/,
    expectedGroup: 'cloud_deployment',
    requireVariant: true,
  },
  {
    id: 'deploy-to-production',
    query: 'deploy to production',
    acceptable: /cloud|upload|deploy|vercel|server|rocket|release|package/,
    forbidden: /production.quantity|factory/,
    expectedGroup: 'cloud_deployment',
    requireVariant: true,
  },
  {
    id: 'package-delivery',
    query: 'package deliver send class',
    acceptable: /package|delivery|deliver|send|truck|box/,
    forbidden: /school|classification/,
    expectedGroup: 'package_delivery',
    requireVariant: true,
  },
  {
    id: 'user-profile',
    query: 'user profile',
    acceptable: /user|profile|avatar|account.circle|person/,
    forbidden: /balance|wallet|bank/,
    expectedGroup: 'user_profile_identity',
    requireVariant: true,
  },
  {
    id: 'unit-test',
    query: 'unit test',
    acceptable: /test|tube|pipe|checklist|beaker|bug/,
    forbidden: /aspect.ratio|call.quality|ac.unit/,
    expectedGroup: 'software_testing',
    requireVariant: true,
  },
  {
    id: 'docker-container',
    query: 'docker container',
    acceptable: /docker|container|shipping.container|sandbox|package|box/,
    forbidden: /animated.image|broken.image/,
    expectedGroup: 'container_platform',
    requireVariant: true,
  },
  {
    id: 'dark-mode-confidence-floor',
    query: 'dark mode',
    acceptable: /dark.mode|dark.theme|moon|night/,
    forbidden: /moderator|airplanemode|model/,
    expectedGroup: 'dark_theme',
  },
  {
    id: 'plural-databases',
    query: 'databases',
    acceptable: /database/,
    forbidden: /mobiledata/,
    requireVariant: true,
    expectedVariantKind: 'normalized_inflection',
  },
  {
    id: 'plural-screenshots',
    query: 'screenshots',
    acceptable: /screenshot/,
    forbidden: /broken.image/,
    requireVariant: true,
    expectedVariantKind: 'normalized_inflection',
  },
  {
    id: 'plural-customers',
    query: 'customers',
    acceptable: /user|customer|people|group/,
    forbidden: /airplane|browser.not.supported/,
  },
  {
    id: 'plural-slides',
    query: 'slides',
    acceptable: /slide|presentation|projector/,
    forbidden: /landslide/,
  },
  {
    id: 'trash-corpus-reach',
    query: 'trash',
    acceptable: /trash|delete|bin|recycle/,
    forbidden: /cash|flash/,
  },
  {
    id: 'info-corpus-reach',
    query: 'info',
    acceptable: /info|information|about|help/,
    forbidden: /inbox|infinity/,
  },
];

const observations = [];
for (const testCase of cases) {
  const results = searchIcons(testCase.query, icons, synonyms, {
    ...testCase.options,
    limit: 3,
  });
  assert.ok(results.length > 0, `${testCase.id}: expected at least one result`);
  for (const result of results.slice(0, 3)) {
    const text = searchableText(result);
    assert.match(text, testCase.acceptable, `${testCase.id}: irrelevant result ${iconRef(result)}`);
    assert.doesNotMatch(text, testCase.forbidden, `${testCase.id}: forbidden result ${iconRef(result)}`);
  }
  if (testCase.expectedFirstLibrary) {
    assert.equal(
      results[0].lib,
      testCase.expectedFirstLibrary,
      `${testCase.id}: preferred library should rank first`,
    );
  }
  if (testCase.requireVariant) {
    assert.ok(
      results.every((result) => result.query_variant),
      `${testCase.id}: fallback results must report their matched query variant`,
    );
  }
  if (testCase.expectedVariantKind) {
    assert.ok(
      results.every((result) => result.query_variant_kind === testCase.expectedVariantKind),
      `${testCase.id}: results must report ${testCase.expectedVariantKind}`,
    );
  }
  if (testCase.expectedGroup) {
    const frame = buildSearchQueryFrame(testCase.query);
    assert.ok(
      frame.meaning_groups.includes(testCase.expectedGroup),
      `${testCase.id}: missing intent group ${testCase.expectedGroup}`,
    );
  }
  observations.push({
    id: testCase.id,
    top_icon_refs: results.map(iconRef),
    matched_query_variants: results.map((result) => result.query_variant || null),
  });
}

console.log(JSON.stringify({
  status: 'ok',
  cases: observations.length,
  observations,
}, null, 2));
