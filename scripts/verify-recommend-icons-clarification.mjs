import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { recommendIconsForTask } from '../mcp/recommend-icons.js';

const stubIcons = [
  { id: 'hand-waving', name: 'Hand Waving', lib: 'phosphor', style: 'outline', svg: '<svg></svg>' },
  { id: 'chat', name: 'Chat', lib: 'phosphor', style: 'outline', svg: '<svg></svg>' },
  { id: 'smile', name: 'Smile', lib: 'lucide', style: 'outline', svg: '<svg></svg>' },
];
const evaluationSet = JSON.parse(readFileSync('data/semantic-search-v2/evaluation-set.json', 'utf8'));
const ambiguityGroup = evaluationSet.query_groups.find((group) => group.id === 'ambiguous_intent_diversity');
const clarificationCase = ambiguityGroup?.queries.find((testCase) => testCase.case_id === 'ambiguity-recommend-hello-needs-clarification');
assert.ok(clarificationCase, 'evaluation set should include the recommendation clarification case');

async function recommend({ task, slot, includeQueryFrame = false }) {
  return recommendIconsForTask({
    task,
    slots: [slot],
    limitPerSlot: 2,
    responseMode: 'plan',
    includeQueryFrame,
    semanticMap: new Map(),
    searchIconsForQuery: async () => stubIcons,
    buildIconResult: async (icon) => ({
      id: icon.id,
      name: icon.name,
      library: icon.lib,
      style: icon.style,
      svg: icon.svg,
    }),
  });
}

const ambiguous = await recommend({
  task: clarificationCase.task,
  slot: clarificationCase.slot,
});
const ambiguousSlot = ambiguous.results[0];
assert.equal(ambiguous.needs_clarification, true, 'ambiguous recommendation should request clarification');
assert.deepEqual(ambiguous.clarification_slots, ['hello'], 'payload should identify the slot needing clarification');
assert.equal(ambiguous.all_slots_resolved, false, 'clarification should keep the slot unresolved');
assert.equal(ambiguousSlot.needs_clarification, true, 'ambiguous slot should request clarification');
assert.equal(ambiguousSlot.recommended, null, 'ambiguous slot should not present a guessed recommendation');
assert.deepEqual(ambiguousSlot.alternatives, [], 'ambiguous slot should not present guessed alternatives');
assert.equal('score' in ambiguousSlot.confidence, false, 'clarification confidence should not expose an internal score');
assert.ok(
  ambiguousSlot.interpretations.length >= clarificationCase.minimum_interpretation_options,
  'ambiguous slot should return the approved minimum interpretation options',
);
assert.deepEqual(
  ambiguousSlot.interpretations.slice(0, 3),
  [
    { family_id: 'greeting_gesture', label: 'Greeting gesture' },
    { family_id: 'friendly_face', label: 'Friendly face' },
    { family_id: 'communication', label: 'Message or conversation' },
  ],
  'clarification options should use stable public family IDs and labels',
);
assert.equal('query_frame' in ambiguous, false, 'normal clarification response should keep diagnostics opt-in');
assert.equal('query_frame' in ambiguousSlot, false, 'normal clarification slot should keep diagnostics opt-in');

const narrowed = await recommend({
  task: 'Choose an icon for a friendly onboarding screen.',
  slot: 'hello',
  includeQueryFrame: true,
});
const narrowedSlot = narrowed.results[0];
assert.equal(narrowed.needs_clarification, false, 'task context should avoid unnecessary clarification');
assert.ok(narrowedSlot.recommended, 'context-narrowed slot should return a recommendation');
assert.equal(narrowedSlot.needs_clarification, undefined, 'resolved slot should omit clarification-only fields');
assert.equal(narrowedSlot.query_frame.interpretation_status, 'context_narrowed', 'slot frame should report context narrowing');
assert.equal(narrowedSlot.query_frame.interpretation_family_ids[0], 'greeting_gesture', 'onboarding should prioritize greeting gesture');

const singleMeaning = await recommend({
  task: 'Choose an icon for application settings.',
  slot: 'cog',
  includeQueryFrame: true,
});
assert.equal(singleMeaning.needs_clarification, false, 'single-family maintained intent should not request clarification');
assert.ok(singleMeaning.results[0].recommended, 'single-family slot should return a recommendation');
assert.deepEqual(singleMeaning.results[0].query_frame.interpretation_family_ids, ['settings_control']);

console.log(JSON.stringify({
  status: 'ok',
  ambiguous_interpretations: ambiguousSlot.interpretations.length,
  narrowed_primary_family: narrowedSlot.query_frame.interpretation_family_ids[0],
  single_family: singleMeaning.results[0].query_frame.interpretation_family_ids[0],
}, null, 2));
