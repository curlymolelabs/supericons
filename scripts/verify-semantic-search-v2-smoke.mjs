import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

import { searchIcons } from '../mcp/search.js';
import {
  createSemanticRegistryMap,
  mergeSemanticMatchesIntoIcons,
} from '../mcp/semantic-registry.js';
import {
  buildIntentQueryVariants,
  buildSearchIntentProfile,
  getIntentCandidateAdjustment,
} from '../mcp/runtime/search-intent-core.js';

const iconIndex = JSON.parse(await fs.readFile('public/icon-index.json', 'utf8'));
const synonyms = JSON.parse(await fs.readFile('public/synonyms.json', 'utf8'));
const records = JSON.parse(await fs.readFile('public/registry/records.json', 'utf8'));
const semanticMap = createSemanticRegistryMap(records);

function iconKey(icon) {
  return `${icon.lib}:${icon.id}`;
}

function rerankIconsForIntent(query, icons) {
  const intentProfile = buildSearchIntentProfile(query);
  if (!intentProfile.expanded) return icons;

  return icons
    .map((icon, index) => {
      const adjustment = getIntentCandidateAdjustment(icon, intentProfile);
      return {
        icon,
        index,
        score: adjustment.boost - adjustment.penalty,
      };
    })
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .map((entry) => entry.icon);
}

function localMcpFallbackSearch(query, limit = 8) {
  const queryVariants = buildIntentQueryVariants(query, { maxVariants: 10 });
  const localResults = [];
  const seen = new Set();

  for (const queryVariant of queryVariants) {
    const variantResults = searchIcons(queryVariant, iconIndex.icons, synonyms, {
      limit: Math.max(limit * 2, 20),
    });

    for (const icon of variantResults) {
      const key = iconKey(icon);
      if (seen.has(key)) continue;
      seen.add(key);
      localResults.push(icon);
    }
  }

  const intentProfile = buildSearchIntentProfile(query);
  const merged = mergeSemanticMatchesIntoIcons(
    query,
    localResults,
    iconIndex.icons,
    semanticMap,
    { limit: intentProfile.expanded ? Math.max(limit * 4, 40) : limit },
  );

  return rerankIconsForIntent(query, merged)
    .slice(0, limit)
    .map(iconKey);
}

function assertFirst(query, expectedFirst) {
  const ids = localMcpFallbackSearch(query);
  assert.equal(ids[0], expectedFirst, `${query}: expected ${expectedFirst} first, got ${ids.join(', ')}`);
  return { query, ids, passed: true };
}

function assertAny(query, expectedPatterns, forbiddenPatterns = []) {
  const ids = localMcpFallbackSearch(query);
  const idText = ids.join(' ');
  assert.ok(
    expectedPatterns.some((pattern) => pattern.test(idText)),
    `${query}: expected one of ${expectedPatterns.join(', ')} in ${ids.join(', ')}`,
  );
  for (const pattern of forbiddenPatterns) {
    assert.ok(!pattern.test(idText), `${query}: forbidden pattern ${pattern} appeared in ${ids.join(', ')}`);
  }
  return { query, ids, passed: true };
}

const results = [
  assertFirst('xai', 'si:x-ai'),
  assertFirst('grok imagine', 'si:x-ai'),
  assertFirst('openai codex', 'si:openai-codex-app'),
  assertFirst('lovable', 'si:lovable'),
  assertFirst('kickbacks ai', 'si:kickbacks-ai'),
  assertAny(
    'powerful',
    [/power/i, /bolt/i, /zap/i, /rocket/i, /gauge/i],
    [/power[-_]off/i, /battery[-_]low/i, /plug[-_]off/i],
  ),
  assertAny(
    'strong',
    [/power/i, /bolt/i, /zap/i, /shield/i, /gauge/i],
    [/power[-_]off/i, /battery[-_]low/i, /plug[-_]off/i],
  ),
  assertAny(
    'license plate recognition camera scan car',
    [/scan/i, /camera/i, /\bcar/i],
    [/si:cartesia/i, /shopping[-_]cart/i, /tabler:license(?:$|\s)/i],
  ),
  assertAny(
    'license plate',
    [/photo[-_]scan/i, /\bscan/i, /camera/i],
    [/si:cartesia/i, /shopping[-_]cart/i],
  ),
  assertAny(
    'cursor ai code editor logo',
    [/si:kilo-code/i, /si:trae/i, /si:opencode/i, /si:openai-codex-app/i, /code/i, /terminal/i],
    [/barcode/i],
  ),
  assertAny(
    'vercel v0 ai app builder logo',
    [/si:base44/i, /si:bolt/i, /si:lovable/i, /si:vercel-eve/i, /simpleicons:v0/i, /simpleicons:vercel/i],
    [/barcode/i],
  ),
  assertAny(
    'neck pain person',
    [/person/i, /accessibility/i, /activity/i],
    [/paint/i],
  ),
  assertAny(
    'dream interpretation moon star eye mystical',
    [/moon/i, /star/i, /eye/i, /spark/i],
    [/dreamstime/i],
  ),
];

console.log(JSON.stringify({
  status: 'ok',
  smoke_cases: results.length,
  results,
}, null, 2));
