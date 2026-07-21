import assert from 'node:assert/strict';
import {
  evaluateCandidateBenchmark,
  expectedWarmSampleCount,
  reportAndAssertCandidateBenchmark,
} from './lib/search-v2-candidate-benchmark-policy.mjs';

const observedColdVariation = evaluateCandidateBenchmark({
  indexedLatencies: [1349.7, ...Array.from({ length: expectedWarmSampleCount }, (_, index) => (
    22 + (index % 5)
  ))],
  controlLatencies: [1436, ...Array.from({ length: expectedWarmSampleCount }, (_, index) => (
    990 + (index % 7)
  ))],
});
assert.equal(observedColdVariation.status, 'ok');
assert.equal(observedColdVariation.indexed_v4.first_call_ms, 1349.7);
assert.equal(observedColdVariation.indexed_v4.warm_samples_ms.length, 20);
assert.ok(observedColdVariation.indexed_v4.warm_p95_ms < 500);
assert.equal(
  observedColdVariation.sample_contract.first_call_release_gate,
  'actual_routed_end_to_end_one_slot_p95_at_most_3000_ms',
);

const warmFailure = evaluateCandidateBenchmark({
  indexedLatencies: [100, ...Array.from({ length: expectedWarmSampleCount }, () => 700)],
  controlLatencies: [1200, ...Array.from({ length: expectedWarmSampleCount }, () => 1000)],
});
const captured = [];
assert.throws(
  () => reportAndAssertCandidateBenchmark(warmFailure, (line) => captured.push(line)),
  /warm candidate p95 was 700 ms/,
);
assert.equal(captured.length, 1, 'The failed benchmark summary was not emitted before assertion.');
const failedEvidence = JSON.parse(captured[0]);
assert.equal(failedEvidence.status, 'blocked');
assert.equal(failedEvidence.indexed_v4.all_samples_ms.length, 21);
assert.equal(failedEvidence.v3_control.all_samples_ms.length, 21);
assert.equal(failedEvidence.gates.warm_v4_p95_passed, false);

const speedupFailure = evaluateCandidateBenchmark({
  indexedLatencies: [100, ...Array.from({ length: expectedWarmSampleCount }, () => 400)],
  controlLatencies: [100, ...Array.from({ length: expectedWarmSampleCount }, () => 500)],
});
assert.throws(
  () => reportAndAssertCandidateBenchmark(speedupFailure, () => {}),
  /warm candidate speedup was only 1.25x/,
);

console.log(JSON.stringify({
  status: 'ok',
  first_call_preserved: true,
  warm_sample_count: expectedWarmSampleCount,
  cold_variation_does_not_hide_warm_regression: true,
  failed_summary_emitted_before_assertion: true,
  warm_p95_gate_protected: true,
  warm_speedup_gate_protected: true,
  authoritative_first_call_gate: 'actual_routed_end_to_end_one_slot_p95_at_most_3000_ms',
}, null, 2));
