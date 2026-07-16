import { recommendIconsForTask } from '../mcp/recommend-icons.js';
import { searchIconsHostedMcp } from '../mcp/hosted-search-client.js';

function normalizeHostedIcon(row) {
  if (!row?.icon_id) return null;
  const [libraryFromId, ...idParts] = String(row.icon_id).split(':');
  const library = row.library || row.source_library || libraryFromId;
  const id = idParts.join(':') || row.id || row.name;
  if (!library || !id || !row.svg) return null;

  return {
    id,
    name: row.name || id.replace(/[-_]/g, ' '),
    lib: library,
    library,
    type: row.icon_type || 'svg',
    style: row.style || 'outline',
    svg: row.svg,
    semantic: row.semantic || null,
  };
}

async function recommend({ task, library, slots, limitPerSlot = 3 }) {
  return recommendIconsForTask({
    task,
    library,
    slots,
    limitPerSlot,
    responseMode: 'plan',
    semanticMap: new Map(),
    searchIconsForQuery: async ({ query, library, style, limit, locale }) => {
      const payload = await searchIconsHostedMcp({ query, library, style, limit, locale });
      return (payload.results || []).map(normalizeHostedIcon).filter(Boolean);
    },
    buildIconResult: async (icon) => ({
      id: icon.id,
      name: icon.name,
      library: icon.library || icon.lib,
      style: icon.style,
      svg: icon.svg,
      semantic: icon.semantic || null,
    }),
  });
}

function idsForSlot(slot) {
  return [
    slot.recommended?.id,
    ...(slot.alternatives || []).map((alternative) => alternative.id),
  ].filter(Boolean);
}

function slotResultByName(result, slotName) {
  return result.results.find((slot) => slot.slot === slotName);
}

function hasPattern(ids, pattern) {
  return ids.some((id) => pattern.test(id));
}

const cases = [
  {
    id: 'hosted-tabler-ecommerce-logistics',
    library: 'tabler',
    task: 'Choose icons for an ecommerce admin dashboard.',
    slots: ['Products', 'Orders', 'Customers', 'Cart', 'Discounts', 'Inventory', 'Shipping', 'Returns', 'Payments', 'Store settings'],
    assertions: [
      { slot: 'Cart', type: 'top_in', ids: ['shopping-cart'] },
      { slot: 'Cart', type: 'none_match', pattern: /shopping-cart-(cog|x|off|discount|dollar|exclamation|heart|minus|pause|plus|question|share|star|bolt|copy)/i },
      { slot: 'Shipping', type: 'top_in', ids: ['truck-delivery', 'truck'] },
      { slot: 'Shipping', type: 'none_match', pattern: /cloud-upload|ship-off/i },
      { slot: 'Returns', type: 'top_in', ids: ['truck-return', 'receipt-refund', 'credit-card-refund'] },
      { slot: 'Payments', type: 'any_match', pattern: /credit-card|receipt|wallet|payment/i },
    ],
  },
  {
    id: 'hosted-phosphor-editor-quotes',
    library: 'phosphor',
    task: 'Choose icons for a content editor toolbar.',
    slots: ['Bold', 'Italic', 'Underline', 'Link', 'Image', 'Quote', 'Code block', 'Undo', 'Redo', 'Publish'],
    assertions: [
      { slot: 'Quote', type: 'top_in', ids: ['quotes'] },
      { slot: 'Undo', type: 'top_in', ids: ['arrow-counter-clockwise'] },
      { slot: 'Redo', type: 'top_in', ids: ['arrow-clockwise'] },
      { slot: 'Publish', type: 'any_match', pattern: /upload|rocket-launch/i },
    ],
  },
];

function evaluateAssertion(result, assertion) {
  const slot = slotResultByName(result, assertion.slot);
  const ids = slot ? idsForSlot(slot) : [];
  const topId = slot?.recommended?.id || null;
  if (!slot) return { passed: false, reason: 'slot_missing', topId, ids };

  switch (assertion.type) {
    case 'top_in':
      return { passed: assertion.ids.includes(topId), topId, ids };
    case 'any_match':
      return { passed: hasPattern(ids, assertion.pattern), topId, ids };
    case 'none_match':
      return { passed: !hasPattern(ids, assertion.pattern), topId, ids };
    default:
      return { passed: false, reason: `unknown_assertion_type:${assertion.type}`, topId, ids };
  }
}

const results = [];
for (const testCase of cases) {
  const recommendation = await recommend(testCase);
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

const summary = {
  case_count: results.length,
  passed_cases: results.filter((result) => result.passed).length,
  assertion_count: results.reduce((sum, result) => sum + result.assertions.length, 0),
  passed_assertions: results.reduce((sum, result) => sum + result.assertions.filter((assertion) => assertion.passed).length, 0),
};

console.log(JSON.stringify({ summary, results }, null, 2));

if (summary.passed_cases !== summary.case_count) {
  process.exitCode = 1;
}
