import assert from 'node:assert/strict';

export const expectedWarmSampleCount = 20;
export const warmP95LimitMs = 500;
export const warmSpeedupMinimum = 3;

function percentile(values, quantile) {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.max(0, Math.ceil(sorted.length * quantile) - 1)];
}

export function evaluateCandidateBenchmark({ indexedLatencies, controlLatencies }) {
  assert.equal(indexedLatencies.length, expectedWarmSampleCount + 1);
  assert.equal(controlLatencies.length, expectedWarmSampleCount + 1);
  assert.equal(indexedLatencies.every(Number.isFinite), true);
  assert.equal(controlLatencies.every(Number.isFinite), true);

  const indexedFirstCall = indexedLatencies[0];
  const controlFirstCall = controlLatencies[0];
  const indexedWarmLatencies = indexedLatencies.slice(1);
  const controlWarmLatencies = controlLatencies.slice(1);
  const indexedWarmP95 = percentile(indexedWarmLatencies, 0.95);
  const controlWarmP95 = percentile(controlWarmLatencies, 0.95);
  const warmSpeedup = controlWarmP95 / indexedWarmP95;
  const warmP95Passed = indexedWarmP95 <= warmP95LimitMs;
  const warmSpeedupPassed = warmSpeedup >= warmSpeedupMinimum;

  return {
    status: warmP95Passed && warmSpeedupPassed ? 'ok' : 'blocked',
    sample_contract: {
      first_call_samples_per_implementation: 1,
      warm_samples_per_implementation: expectedWarmSampleCount,
      first_call_classification: 'first_call_after_function_creation',
      first_call_release_gate: 'actual_routed_end_to_end_one_slot_p95_at_most_3000_ms',
    },
    indexed_v4: {
      all_samples_ms: indexedLatencies,
      first_call_ms: indexedFirstCall,
      warm_samples_ms: indexedWarmLatencies,
      warm_p95_ms: indexedWarmP95,
      maximum_ms: Math.max(...indexedLatencies),
    },
    v3_control: {
      all_samples_ms: controlLatencies,
      first_call_ms: controlFirstCall,
      warm_samples_ms: controlWarmLatencies,
      warm_p95_ms: controlWarmP95,
      maximum_ms: Math.max(...controlLatencies),
    },
    warm_speedup: Number(warmSpeedup.toFixed(2)),
    gates: {
      first_call_recorded: true,
      warm_v4_p95_ms_max: warmP95LimitMs,
      warm_v4_p95_passed: warmP95Passed,
      warm_speedup_minimum: warmSpeedupMinimum,
      warm_speedup_passed: warmSpeedupPassed,
    },
  };
}

export function reportAndAssertCandidateBenchmark(summary, writeLine = console.log) {
  writeLine(JSON.stringify(summary, null, 2));
  assert.equal(summary.gates.first_call_recorded, true);
  assert.equal(
    summary.gates.warm_v4_p95_passed,
    true,
    `The indexed v4 warm candidate p95 was ${summary.indexed_v4.warm_p95_ms} ms.`,
  );
  assert.equal(
    summary.gates.warm_speedup_passed,
    true,
    `The indexed v4 warm candidate speedup was only ${summary.warm_speedup}x.`,
  );
}
