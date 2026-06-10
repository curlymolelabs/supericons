import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { searchIcons } from '../mcp/search.js';
import { recommendIconsForTask } from '../mcp/recommend-icons.js';
import {
  createSemanticRegistryMap,
  getSemanticRecordForIcon,
  loadSemanticRegistryRecords,
  mergeSemanticMatchesIntoIcons,
} from '../mcp/semantic-registry.js';

const repoRoot = join(import.meta.dirname, '..');
const mcpPublicDir = join(repoRoot, 'mcp', 'public');
const freeIcons = JSON.parse(readFileSync(join(mcpPublicDir, 'icon-index.json'), 'utf8')).icons
  .filter((entry) => entry.type === 'svg' && entry.svg)
  .map((icon) => ({ ...icon, premium: false }));
const synonyms = JSON.parse(readFileSync(join(mcpPublicDir, 'synonyms.json'), 'utf8'));
const semanticMap = createSemanticRegistryMap(loadSemanticRegistryRecords(mcpPublicDir));

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function buildIconResult(icon) {
  if (!icon?.svg) return null;
  const semanticRecord = getSemanticRecordForIcon(semanticMap, icon);
  return {
    id: icon.id,
    name: icon.name,
    library: icon.lib,
    style: icon.style,
    svg: icon.svg,
    semantic: semanticRecord ? {
      label: semanticRecord.label || null,
      purpose: semanticRecord.purpose || null,
      category: semanticRecord.category || null,
    } : null,
  };
}

async function recommend(responseMode) {
  return recommendIconsForTask({
    task: 'Build a simple mobile news app MVP using Supericons. Use MingCute icons.',
    library: 'mingcute',
    responseMode,
    slots: [
      'App logo/title',
      'Notifications',
      'Home tab',
      'Trending tab',
      'Bookmarks tab',
      'Profile tab',
      'Search bar',
      'Share article',
      'Settings',
      'Read more',
      'Category chips',
    ],
    limitPerSlot: 3,
    semanticMap,
    searchIconsForQuery: async ({ query, library, limit }) => {
      const searchable = freeIcons.filter((icon) => icon.lib === library);
      const baseline = searchIcons(query, searchable, synonyms, { library, limit });
      return mergeSemanticMatchesIntoIcons(query, baseline, searchable, semanticMap, { limit });
    },
    buildIconResult: async (icon) => buildIconResult(icon),
  });
}

async function recommendFor({ task, library, slots, responseMode = 'plan' }) {
  return recommendIconsForTask({
    task,
    library,
    responseMode,
    slots,
    limitPerSlot: 3,
    semanticMap,
    searchIconsForQuery: async ({ query, library, limit }) => {
      const searchable = freeIcons.filter((icon) => icon.lib === library);
      const baseline = searchIcons(query, searchable, synonyms, { library, limit });
      return mergeSemanticMatchesIntoIcons(query, baseline, searchable, semanticMap, { limit });
    },
    buildIconResult: async (icon) => buildIconResult(icon),
  });
}

const planResult = await recommend(undefined);
const planJson = JSON.stringify(planResult, null, 2);

assert(planResult.response_mode === 'plan', 'Default response mode should be plan.');
assert(planResult.all_slots_resolved === true, 'Plan result should report all slots resolved.');
assert(Array.isArray(planResult.low_confidence_slots), 'Plan result should include low_confidence_slots.');
assert(planResult.low_confidence_slots.length === 0, 'News app plan should not have low-confidence slots.');
assert(planResult.fallback_recommended === false, 'Plan result should not recommend fallback for all-resolved high/medium slots.');
assert(planJson.length < 15000, `Plan result should stay compact; got ${planJson.length} characters.`);

for (const slot of planResult.results) {
  assert(slot.recommended, `${slot.slot} should have a recommendation.`);
  assert(!('guidance' in slot), `${slot.slot} plan slot should omit guidance when it is not needed.`);
  assert(!('svg' in slot.recommended), `${slot.slot} plan recommendation should not include svg.`);
  assert(!('semantic' in slot.recommended), `${slot.slot} plan recommendation should not include full semantic payload.`);
  for (const alternative of slot.alternatives) {
    assert(!('svg' in alternative), `${slot.slot} plan alternative should not include svg.`);
    assert(!('semantic' in alternative), `${slot.slot} plan alternative should not include full semantic payload.`);
  }
}

const assetsResult = await recommend('assets');
assert(assetsResult.response_mode === 'assets', 'Assets response mode should be reported.');
for (const slot of assetsResult.results) {
  assert(slot.recommended?.svg, `${slot.slot} assets recommendation should include svg.`);
  for (const alternative of slot.alternatives) {
    assert(!('svg' in alternative), `${slot.slot} assets alternative should not include svg.`);
  }
}

const fullResult = await recommend('full');
assert(fullResult.response_mode === 'full', 'Full response mode should be reported.');
assert(fullResult.results.some((slot) => slot.alternatives.some((alternative) => alternative.svg)), 'Full mode should include alternative SVGs.');

function getSlot(result, slotName) {
  return result.results.find((slot) => slot.slot === slotName);
}

const adminPlanResult = await recommendFor({
  task: 'Choose icons for a simple admin dashboard sidebar using Lucide icons.',
  library: 'lucide',
  slots: ['Users', 'Billing', 'Database', 'Settings', 'Reports', 'Security', 'Monitoring'],
});
const securitySlot = getSlot(adminPlanResult, 'Security');
const securityId = securitySlot?.recommended?.id;
assert(securityId !== 'lock-keyhole-open', 'Security should not recommend lock-keyhole-open for a generic secure slot.');
assert(
  ['shield', 'shield-check', 'lock', 'lock-keyhole'].includes(securityId),
  `Security should recommend a conventional secure icon; got ${securityId}.`
);

const billingSlot = getSlot(adminPlanResult, 'Billing');
const billingAlternativeIds = billingSlot.alternatives.map((alternative) => alternative.id);
assert(!billingAlternativeIds.includes('receipt-indian-rupee'), 'Generic billing alternatives should not include receipt-indian-rupee.');
assert(!billingAlternativeIds.includes('receipt-cent'), 'Generic billing alternatives should not include receipt-cent.');

const notificationsSlot = getSlot(planResult, 'Notifications');
const notificationAlternativeIds = notificationsSlot.alternatives.map((alternative) => alternative.id);
assert(!notificationAlternativeIds.includes('notification_off_line'), 'Plain notification alternatives should not include notification_off_line.');

const bookmarksSlot = getSlot(planResult, 'Bookmarks tab');
const bookmarkAlternativeIds = bookmarksSlot.alternatives.map((alternative) => alternative.id);
assert(!bookmarkAlternativeIds.includes('bookmark_edit_line'), 'Plain bookmark alternatives should not include bookmark_edit_line.');

console.log(JSON.stringify({
  plan_chars: planJson.length,
  assets_chars: JSON.stringify(assetsResult, null, 2).length,
  full_chars: JSON.stringify(fullResult, null, 2).length,
}, null, 2));
