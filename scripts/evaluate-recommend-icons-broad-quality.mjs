import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
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
const reportPath = join(repoRoot, 'data', 'si-registry', 'generated', 'recommend-icons-broad-quality-report.json');

const freeIcons = JSON.parse(readFileSync(join(mcpPublicDir, 'icon-index.json'), 'utf8')).icons
  .filter((entry) => entry.type === 'svg' && entry.svg)
  .map((icon) => ({ ...icon, premium: false }));
const synonyms = JSON.parse(readFileSync(join(mcpPublicDir, 'synonyms.json'), 'utf8'));
const semanticMap = createSemanticRegistryMap(loadSemanticRegistryRecords(mcpPublicDir));

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

async function recommend({ task, library, slots, limitPerSlot = 3, locale = null }) {
  return recommendIconsForTask({
    task,
    library,
    slots,
    locale,
    limitPerSlot,
    responseMode: 'plan',
    semanticMap,
    searchIconsForQuery: async ({ query, library, limit }) => {
      const searchable = library ? freeIcons.filter((icon) => icon.lib === library) : freeIcons;
      const baseline = searchIcons(query, searchable, synonyms, { library, limit });
      return mergeSemanticMatchesIntoIcons(query, baseline, searchable, semanticMap, { limit });
    },
    buildIconResult: async (icon) => buildIconResult(icon),
  });
}

function idsForSlot(slot) {
  return [
    slot.recommended?.id,
    ...(slot.alternatives || []).map((alternative) => alternative.id),
  ].filter(Boolean);
}

function candidateKeysForSlot(slot) {
  return [
    slot.recommended ? `${slot.recommended.library}:${slot.recommended.id}` : null,
    ...(slot.alternatives || []).map((alternative) => `${alternative.library}:${alternative.id}`),
  ].filter(Boolean);
}

function hasPattern(ids, pattern) {
  return ids.some((id) => pattern.test(id));
}

function slotResultByName(result, slotName) {
  return result.results.find((slot) => slot.slot === slotName);
}

const cases = [
  {
    id: 'lucide-security-negative-positive',
    library: 'lucide',
    task: 'Choose icons for account security status settings.',
    slots: ['Security', 'Unlock account', 'Blocked user', 'Disabled notifications', 'Enabled notifications'],
    assertions: [
      { slot: 'Security', type: 'top_in', ids: ['shield', 'shield-check', 'lock', 'lock-keyhole'] },
      { slot: 'Security', type: 'none_match', pattern: /open|unlock|ban|minus|off|slash/i },
      { slot: 'Unlock account', type: 'any_in', ids: ['lock-open', 'lock-keyhole-open', 'unlock'] },
      { slot: 'Blocked user', type: 'any_match', pattern: /ban|block|user-x|user-minus/i },
      { slot: 'Disabled notifications', type: 'any_match', pattern: /off|bell-off|slash/i },
    ],
  },
  {
    id: 'lucide-read-more-navigation-negative-positive',
    library: 'lucide',
    task: 'Choose icons for article navigation, read-more links, and explicit shaped arrow buttons.',
    slots: ['Read more', 'Next page', 'Arrow right circle', 'Arrow right square'],
    assertions: [
      { slot: 'Read more', type: 'top_in', ids: ['arrow-right', 'move-right'] },
      { slot: 'Read more', type: 'none_match', pattern: /circle|square|up|down|left/i },
      { slot: 'Next page', type: 'none_match', pattern: /left|up|down/i },
      { slot: 'Arrow right circle', type: 'any_match', pattern: /circle.*arrow.*right|arrow.*right.*circle/i },
      { slot: 'Arrow right square', type: 'any_match', pattern: /square.*arrow.*right|arrow.*right.*square/i },
    ],
  },
  {
    id: 'cross-library-back-navigation',
    library: 'lucide',
    task: 'Choose icons for backward and previous-page navigation.',
    slots: ['Previous page', 'Back'],
    assertions: [
      { slot: 'Previous page', type: 'top_match', pattern: /left|back|previous|chevron/i },
      { slot: 'Previous page', type: 'none_match', pattern: /file|archive|audio|floppy|cash|brand|copy|send-to-back/i },
      { slot: 'Back', type: 'top_match', pattern: /left|back|previous|chevron/i },
      { slot: 'Back', type: 'none_match', pattern: /file|archive|audio|floppy|cash|brand|copy|send-to-back/i },
    ],
  },
  {
    id: 'mingcute-news-negative-positive',
    library: 'mingcute',
    task: 'Choose icons for a mobile news reader.',
    slots: ['Notifications', 'Notifications off', 'Bookmarks tab', 'Add bookmark', 'Edit bookmark', 'Remove bookmark', 'Search bar', 'AI search'],
    assertions: [
      { slot: 'Notifications', type: 'none_match', pattern: /off/i },
      { slot: 'Notifications off', type: 'any_in', ids: ['notification_off_line'] },
      { slot: 'Bookmarks tab', type: 'none_match', pattern: /^bookmark_(add|edit|remove)_line$/i },
      { slot: 'Add bookmark', type: 'top_in', ids: ['bookmark_add_line'] },
      { slot: 'Edit bookmark', type: 'top_in', ids: ['bookmark_edit_line'] },
      { slot: 'Remove bookmark', type: 'top_in', ids: ['bookmark_remove_line'] },
      { slot: 'Search bar', type: 'none_match', pattern: /^search_.*_ai_line$/i },
      { slot: 'AI search', type: 'any_match', pattern: /^search.*ai.*line$|^search_.*_ai_line$/i },
    ],
  },
  {
    id: 'mingcute-ai-productivity-workspace',
    library: 'mingcute',
    task: 'Choose icons for an AI productivity workspace with smart search, automation, projects, and tasks.',
    slots: ['AI assistant', 'Smart search', 'Automation', 'Projects', 'Tasks'],
    assertions: [
      { slot: 'AI assistant', type: 'any_match', pattern: /ai|brain|robot|spark/i },
      { slot: 'Smart search', type: 'any_match', pattern: /search.*ai|ai.*search|spark|brain/i },
      { slot: 'Automation', type: 'any_match', pattern: /workflow|flow|robot|spark|automation|refresh|settings/i },
      { slot: 'Projects', type: 'any_match', pattern: /folder|project|briefcase|board|layout|grid/i },
      { slot: 'Projects', type: 'none_match', pattern: /locked|lock|forbid|private|secure/i },
      { slot: 'Tasks', type: 'any_match', pattern: /task|check|todo|list|checkbox/i },
    ],
  },
  {
    id: 'mingcute-localized-notifications-off',
    library: 'mingcute',
    locale: 'zh-Hans',
    task: '为移动应用选择图标。',
    slots: ['通知关闭'],
    assertions: [
      { slot: '通知关闭', type: 'top_in', ids: ['notification_off_line'] },
    ],
  },
  {
    id: 'lucide-generic-search-bookmark-link',
    library: 'lucide',
    task: 'Choose generic utility icons for a toolbar.',
    slots: ['Search', 'Add bookmark', 'Link'],
    assertions: [
      { slot: 'Search', type: 'top_in', ids: ['search'] },
      { slot: 'Add bookmark', type: 'top_in', ids: ['bookmark-plus'] },
      { slot: 'Link', type: 'none_in', ids: ['unlink'] },
    ],
  },
  {
    id: 'lucide-billing-currency-negative-positive',
    library: 'lucide',
    task: 'Choose icons for billing and finance settings.',
    slots: ['Billing', 'Receipt', 'Rupee receipt', 'Euro receipt', 'Yen receipt', 'Pound receipt', 'Cent receipt'],
    assertions: [
      { slot: 'Billing', type: 'none_in', ids: ['receipt-indian-rupee', 'receipt-cent', 'receipt-japanese-yen', 'receipt-euro', 'receipt-pound-sterling'] },
      { slot: 'Receipt', type: 'none_in', ids: ['receipt-indian-rupee', 'receipt-cent', 'receipt-japanese-yen', 'receipt-euro', 'receipt-pound-sterling'] },
      { slot: 'Receipt', type: 'none_match', pattern: /receipt-(russian-ruble|swiss-franc|turkish-lira|bitcoin|dollar|euro|yen|yuan|rupee|pound|cent)|(?:^|[-_])(ruble|franc|lira|bitcoin|dollar|euro|yen|yuan|rupee|pound|cent)(?:[-_]|$)/i },
      { slot: 'Rupee receipt', type: 'any_in', ids: ['receipt-indian-rupee'] },
      { slot: 'Euro receipt', type: 'any_in', ids: ['receipt-euro'] },
      { slot: 'Yen receipt', type: 'any_in', ids: ['receipt-japanese-yen'] },
      { slot: 'Pound receipt', type: 'any_in', ids: ['receipt-pound-sterling'] },
      { slot: 'Cent receipt', type: 'any_in', ids: ['receipt-cent'] },
    ],
  },
  {
    id: 'phosphor-editor-negative-alternatives',
    library: 'phosphor',
    task: 'Choose icons for a content editor toolbar.',
    slots: ['Link', 'Image', 'Comments', 'Undo', 'Redo'],
    assertions: [
      { slot: 'Link', type: 'none_match', pattern: /break/i },
      { slot: 'Image', type: 'none_match', pattern: /broken/i },
      { slot: 'Comments', type: 'none_match', pattern: /slash/i },
      { slot: 'Undo', type: 'top_in', ids: ['arrow-counter-clockwise'] },
      { slot: 'Undo', type: 'none_in', ids: ['arrow-clockwise', 'arrows-clockwise'] },
      { slot: 'Undo', type: 'none_in', ids: ['clock-clockwise'] },
      { slot: 'Redo', type: 'top_in', ids: ['arrow-clockwise'] },
      { slot: 'Redo', type: 'none_in', ids: ['arrow-counter-clockwise', 'arrows-counter-clockwise'] },
      { slot: 'Redo', type: 'none_in', ids: ['clock-counter-clockwise'] },
    ],
  },
  {
    id: 'phosphor-explicit-editor-states',
    library: 'phosphor',
    task: 'Choose icons for explicit disabled or broken editor states.',
    slots: ['Broken link', 'Broken image', 'Comments off'],
    assertions: [
      { slot: 'Broken link', type: 'top_match', pattern: /break|broken|slash/i },
      { slot: 'Broken image', type: 'top_match', pattern: /broken|off|slash/i },
      { slot: 'Comments off', type: 'top_match', pattern: /slash|off/i },
    ],
  },
  {
    id: 'tabler-security-admin-expanded',
    library: 'tabler',
    task: 'Choose icons for a security and admin settings panel.',
    slots: ['Two-factor auth', 'Permissions', 'Audit log', 'Security', 'Users'],
    assertions: [
      { slot: 'Two-factor auth', type: 'any_match', pattern: /lock|key|shield|finger|password|auth|2fa|user-check/i },
      { slot: 'Permissions', type: 'any_match', pattern: /lock|key|shield|user|users|adjustments|settings/i },
      { slot: 'Audit log', type: 'any_match', pattern: /history|timeline|list|file|notes|clipboard|report|logs?/i },
      { slot: 'Security', type: 'none_match', pattern: /off|ban|minus|open|unlock/i },
    ],
  },
  {
    id: 'ecommerce-cross-library-risk-sample',
    library: 'lucide',
    task: 'Choose icons for an ecommerce admin.',
    slots: ['Checkout', 'Customers', 'Coupons', 'Orders', 'Products'],
    assertions: [
      { slot: 'Checkout', type: 'none_match', pattern: /fork|knife|git/i },
      { slot: 'Customers', type: 'none_match', pattern: /ticket|plane|caret/i },
      { slot: 'Coupons', type: 'none_match', pattern: /bean|candy|cannabis|off/i },
      { slot: 'Orders', type: 'any_match', pattern: /package|receipt|shopping|list|clipboard/i },
      { slot: 'Products', type: 'any_match', pattern: /package|box|shopping|tag/i },
    ],
  },
  {
    id: 'tabler-ecommerce-risk-sample',
    library: 'tabler',
    task: 'Choose icons for an ecommerce admin covering storefront, checkout, customers, coupons, orders, and products.',
    slots: ['Storefront', 'Checkout', 'Customers', 'Coupons', 'Orders', 'Products'],
    assertions: [
      { slot: 'Storefront', type: 'any_match', pattern: /store|building-store|shop|shopping/i },
      { slot: 'Storefront', type: 'none_match', pattern: /(?:^|[-_])(cancel|x|off|discount|heart|exclamation|minus|plus|search|share|star|question|bolt|code|copy|dollar|down|up|pin|pause)(?:[-_]|$)/i },
      { slot: 'Checkout', type: 'none_match', pattern: /fork|knife|git|branch|merge/i },
      { slot: 'Checkout', type: 'none_match', pattern: /(?:^|[-_])(cancel|x|off|discount|heart|exclamation|minus|plus|search|share|star|question|bolt|code|copy|dollar|down|up|pin|pause)(?:[-_]|$)/i },
      { slot: 'Customers', type: 'none_match', pattern: /caret|plane|ticket/i },
      { slot: 'Customers', type: 'none_match', pattern: /(?:^|[-_])(cancel|x|off|discount|heart|exclamation|minus|plus|search|share|star|question|bolt|code|copy|dollar|down|up|pin|pause)(?:[-_]|$)/i },
      { slot: 'Coupons', type: 'none_match', pattern: /(?:^|[-_])(off|disabled|slash|x)(?:[-_]|$)/i },
      { slot: 'Coupons', type: 'none_match', pattern: /^percentage-\d+$/i },
      { slot: 'Orders', type: 'any_match', pattern: /package|receipt|shopping|list|clipboard|file/i },
      { slot: 'Orders', type: 'none_match', pattern: /(?:^|[-_])(cancel|x|off|discount|heart|exclamation|minus|plus|search|share|star|question|bolt|code|copy|dollar|down|up|pin|pause)(?:[-_]|$)/i },
      { slot: 'Products', type: 'any_match', pattern: /package|box|shopping|tag|archive/i },
      { slot: 'Products', type: 'none_match', pattern: /(?:^|[-_])(cancel|x|off|discount|heart|exclamation|minus|plus|search|share|star|question|bolt|code|copy|dollar|down|up|pin|pause)(?:[-_]|$)/i },
    ],
  },
  {
    id: 'tabler-explicit-media-states',
    library: 'tabler',
    task: 'Choose icons for explicit broken and disabled media states.',
    slots: ['Broken image'],
    assertions: [
      { slot: 'Broken image', type: 'top_match', pattern: /broken|off/i },
    ],
  },
  {
    id: 'tabler-generic-editor-brand-suppression',
    library: 'tabler',
    task: 'Choose generic content editor toolbar icons.',
    slots: ['Image', 'Comments', 'Link'],
    assertions: [
      { slot: 'Image', type: 'top_in', ids: ['photo', 'image-in-picture'] },
      { slot: 'Image', type: 'none_match', pattern: /^brand-/i },
      { slot: 'Comments', type: 'any_match', pattern: /message|messages|comment/i },
      { slot: 'Comments', type: 'none_match', pattern: /^brand-/i },
      { slot: 'Link', type: 'none_match', pattern: /^brand-|unlink/i },
    ],
  },
  {
    id: 'tabler-explicit-commerce-states',
    library: 'tabler',
    task: 'Choose icons for explicit ecommerce disabled and cancelled states.',
    slots: ['Store off', 'Cancel order'],
    assertions: [
      { slot: 'Store off', type: 'top_match', pattern: /off|x|cancel/i },
      { slot: 'Cancel order', type: 'any_match', pattern: /cancel|x|remove|minus/i },
    ],
  },
  {
    id: 'phosphor-notifications-settings',
    library: 'phosphor',
    task: 'Choose generic app settings and notification icons.',
    slots: ['Notifications off', 'Settings'],
    assertions: [
      { slot: 'Notifications off', type: 'top_match', pattern: /bell.*slash|slash.*bell|notification.*slash/i },
      { slot: 'Settings', type: 'top_in', ids: ['gear', 'gear-six', 'sliders-horizontal', 'sliders'] },
    ],
  },
  {
    id: 'all-library-generic-ui-brand-suppression',
    task: 'Choose generic UI icons for an admin app. Do not use brand logos.',
    slots: ['Settings', 'Search', 'Users', 'Billing'],
    assertions: [
      { slot: 'Settings', type: 'none_candidate_match', pattern: /^simpleicons:|^.*:brand-/i },
      { slot: 'Settings', type: 'top_match', pattern: /settings|cog|gear|sliders|adjustments/i },
      { slot: 'Search', type: 'none_candidate_match', pattern: /^simpleicons:|^.*:brand-/i },
      { slot: 'Users', type: 'none_candidate_match', pattern: /^simpleicons:|^.*:brand-/i },
      { slot: 'Billing', type: 'none_candidate_match', pattern: /^simpleicons:|^.*:brand-/i },
    ],
  },
  {
    id: 'lucide-broad-admin-no-duplicate-primary',
    library: 'lucide',
    task: 'Choose icons for a broad ecommerce admin dashboard.',
    slots: ['Storefront', 'Checkout', 'Billing', 'Orders', 'Products', 'Customers'],
    assertions: [
      { type: 'unique_recommended' },
    ],
  },
];

function evaluateAssertion(result, assertion) {
  if (assertion.type === 'unique_recommended') {
    const topIds = result.results.map((resultSlot) => (
      resultSlot.recommended ? `${resultSlot.recommended.library}:${resultSlot.recommended.id}` : null
    )).filter(Boolean);
    return {
      passed: topIds.length === new Set(topIds).size,
      topId: null,
      ids: topIds,
    };
  }

  const slot = slotResultByName(result, assertion.slot);
  const ids = slot ? idsForSlot(slot) : [];
  const topId = slot?.recommended?.id || null;

  if (!slot) {
    return { passed: false, reason: 'slot_missing', topId, ids };
  }

  switch (assertion.type) {
    case 'top_in':
      return { passed: assertion.ids.includes(topId), topId, ids };
    case 'any_in':
      return { passed: ids.some((id) => assertion.ids.includes(id)), topId, ids };
    case 'none_in':
      return { passed: !ids.some((id) => assertion.ids.includes(id)), topId, ids };
    case 'any_match':
      return { passed: hasPattern(ids, assertion.pattern), topId, ids };
    case 'none_match':
      return { passed: !hasPattern(ids, assertion.pattern), topId, ids };
    case 'top_match':
      return { passed: Boolean(topId && assertion.pattern.test(topId)), topId, ids };
    case 'none_top_match':
      return { passed: Boolean(!topId || !assertion.pattern.test(`${slot.recommended.library}:${topId}`)), topId, ids };
    case 'none_candidate_match': {
      const candidateKeys = candidateKeysForSlot(slot);
      return { passed: !hasPattern(candidateKeys, assertion.pattern), topId, ids: candidateKeys };
    }
    default:
      return { passed: false, reason: `unknown_assertion_type:${assertion.type}`, topId, ids };
  }
}

const results = [];
for (const testCase of cases) {
  const recommendation = await recommend(testCase);
  const planChars = JSON.stringify(recommendation, null, 2).length;
  const assertions = testCase.assertions.map((assertion) => {
    const outcome = evaluateAssertion(recommendation, assertion);
    return {
      slot: assertion.slot,
      type: assertion.type,
      expected_ids: assertion.ids,
      pattern: assertion.pattern ? String(assertion.pattern) : undefined,
      passed: outcome.passed,
      reason: outcome.reason,
      top_id: outcome.topId,
      actual_ids: outcome.ids,
    };
  });

  results.push({
    id: testCase.id,
    library: testCase.library,
    plan_chars: planChars,
    all_slots_resolved: recommendation.all_slots_resolved,
    low_confidence_slots: recommendation.low_confidence_slots,
    passed: assertions.every((assertion) => assertion.passed),
    assertions,
    recommendations: recommendation.results.map((slot) => ({
      slot: slot.slot,
      recommended: slot.recommended ? `${slot.recommended.library}:${slot.recommended.id}` : null,
      confidence: slot.confidence,
      alternatives: slot.alternatives.map((alternative) => `${alternative.library}:${alternative.id}`),
    })),
  });
}

const report = {
  schema_version: '1.0.0',
  generated_at: new Date().toISOString(),
  summary: {
    case_count: results.length,
    passed_cases: results.filter((result) => result.passed).length,
    assertion_count: results.reduce((sum, result) => sum + result.assertions.length, 0),
    passed_assertions: results.reduce((sum, result) => sum + result.assertions.filter((assertion) => assertion.passed).length, 0),
    max_plan_chars: Math.max(...results.map((result) => result.plan_chars)),
  },
  results,
};

mkdirSync(dirname(reportPath), { recursive: true });
writeFileSync(reportPath, JSON.stringify(report, null, 2));

console.log(JSON.stringify(report.summary, null, 2));
console.log(`Report: ${reportPath}`);

if (report.summary.passed_assertions !== report.summary.assertion_count) {
  const failed = results.flatMap((result) => result.assertions
    .filter((assertion) => !assertion.passed)
    .map((assertion) => `${result.id} / ${assertion.slot} / ${assertion.type}`));
  console.error(`Broad recommend_icons quality evaluation found ${failed.length} issue(s):`);
  failed.forEach((failure) => console.error(`- ${failure}`));
  process.exitCode = 1;
}
