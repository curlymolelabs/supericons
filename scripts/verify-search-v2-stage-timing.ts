import assert from 'node:assert/strict';

import {
  createSearchStageTimer,
  estimateCandidatePayloadCharacters,
} from '../supabase/functions/_shared/search-engine/stage-timing.ts';

const records: Array<Record<string, unknown>> = [];
let clock = 100;
const timer = createSearchStageTimer(
  (record) => records.push(record as unknown as Record<string, unknown>),
  () => clock,
  'control',
);

await timer.measure('candidate_search', async () => {
  clock += 12.5;
});
timer.measureSync('reranking', () => {
  clock += 3.25;
});
timer.addCounts({
  query_variants: 4,
  candidate_rows: 160,
  unique_candidates: 72,
  final_results: 8,
});
timer.addApproximateSizes({
  candidate_svg_characters: 32500,
  candidate_payload_characters: 41000,
  response_json_characters: 8400,
});
clock += 1;
timer.finish('results');

assert.equal(records.length, 1);
assert.deepEqual(records[0], {
  schema_version: 1,
  event: 'search_stage_timing',
  measurement_variant: 'control',
  worker_state: 'first_request',
  outcome: 'results',
  total_ms: 16.75,
  stages_ms: {
    candidate_search: 12.5,
    reranking: 3.25,
  },
  counts: {
    query_variants: 4,
    candidate_rows: 160,
    unique_candidates: 72,
    final_results: 8,
  },
  approximate_sizes: {
    candidate_svg_characters: 32500,
    candidate_payload_characters: 41000,
    response_json_characters: 8400,
  },
});

let operationRan = false;
const disabled = createSearchStageTimer(null, () => 0);
await disabled.measure('candidate_search', async () => {
  operationRan = true;
});
disabled.finish('results');
assert.equal(operationRan, true);

const throwingSink = createSearchStageTimer(() => {
  throw new Error('timing sink failure');
}, () => 0);
assert.doesNotThrow(() => throwingSink.finish('error'));

const serialized = JSON.stringify(records[0]);
const timingKeys = new Set<string>();
function collectKeys(value: unknown) {
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    timingKeys.add(key);
    collectKeys(child);
  }
}
collectKeys(records[0]);
for (const prohibited of ['query', 'icon_id', 'session_hash', 'ip_hash']) {
  assert.equal(timingKeys.has(prohibited), false, `Timing record leaked prohibited field: ${prohibited}`);
}
assert.equal(serialized.includes('<svg'), false, 'Timing record leaked SVG content.');

const oldPayloadCharacters = estimateCandidatePayloadCharacters([{
  icon_id: 'lucide:settings',
  name: 'settings',
  svg: '<svg>settings</svg>',
  lexical_rank: 2.5,
}]);
const lightweightPayloadCharacters = estimateCandidatePayloadCharacters([{
  icon_id: 'lucide:settings',
  name: 'settings',
  lexical_rank: 2.5,
}]);
assert.ok(oldPayloadCharacters > lightweightPayloadCharacters);
assert.ok(oldPayloadCharacters - lightweightPayloadCharacters >= '<svg>settings</svg>'.length);

console.log(JSON.stringify({
  status: 'ok',
  safe_fields_only: true,
  sink_failure_contained: true,
  disabled_path_preserved: true,
  candidate_payload_comparison: 'verified_without_serializing_svg_content',
}, null, 2));
