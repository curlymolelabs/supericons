import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  assertMeasurementTarget,
  buildMeasurementUsageContext,
  normalizeMeasurementProfile,
  productionizeMeasurementPayload,
} from './lib/search-measurement-profile.mjs';

assert.equal(normalizeMeasurementProfile(null), 'beta');
assert.equal(normalizeMeasurementProfile('production'), 'production');
assert.throws(() => normalizeMeasurementProfile('staging'), /beta or production/);

assert.doesNotThrow(() => assertMeasurementTarget('production', 'mcp-search'));
assert.throws(
  () => assertMeasurementTarget('production', 'mcp-search-v2-beta'),
  /must target stable mcp-search/,
);

assert.deepEqual(buildMeasurementUsageContext('production', 'search_icons'), {
  source: 'verify',
  channel: 'internal_test',
  environment: 'production',
  client_family: 'material_release_latency',
  tool_name: 'search_icons',
});

assert.deepEqual(buildMeasurementUsageContext('beta', 'recommend_icons', {
  betaCohort: 'deterministic-v2-roundtrip-measurement',
}), {
  source: 'mcp_beta',
  channel: 'hosted_mcp',
  environment: 'preview',
  client_family: 'latency_gate_a',
  tool_name: 'recommend_icons',
  beta_cohort: 'deterministic-v2-roundtrip-measurement',
});

const productionized = productionizeMeasurementPayload({
  queries: [{
    query: 'settings',
    source: 'mcp_beta',
    channel: 'hosted_mcp',
    environment: 'preview',
    client_family: 'latency_gate_a',
    tool_name: 'recommend_icons',
    beta_cohort: 'deterministic-v2-beta',
  }],
}, { runId: '11111111-1111-4111-8111-111111111111', requestSequence: 3 });
assert.deepEqual(productionized.queries[0], {
  query: 'settings',
  source: 'verify',
  channel: 'internal_test',
  environment: 'production',
  client_family: 'material_release_latency',
  tool_name: 'recommend_icons',
  request_id: '11111111-1111-4111-8111-111111111111',
  dedupe_key: 'material-baseline:11111111-1111-4111-8111-111111111111:3:0',
});

const runner = readFileSync('scripts/run-material-production-latency-baseline.mjs', 'utf8');
assert.match(runner, /const ENDPOINT_NAME = 'mcp-search'/);
assert.match(runner, /productionizeMeasurementPayload/);
assert.match(runner, /measurement_profile: 'production'/);
assert.match(runner, /sanitized_request_count/);
assert.match(runner, /audit_contract/);
assert.match(runner, /expectedRequestCount = mode === 'search' \? 26 : 21/);
assert.doesNotMatch(runner, /mcp-search-v2-beta/);

const sharedRunner = readFileSync('scripts/run-search-v2-latency-measurement.mjs', 'utf8');
assert.match(sharedRunner, /source: 'mcp_beta'/);
assert.match(sharedRunner, /environment: 'preview'/);

console.log(JSON.stringify({
  status: 'ok',
  stable_endpoint_required_for_production: true,
  production_source: 'verify',
  production_channel: 'internal_test',
  production_environment: 'production',
  production_beta_cohort_present: false,
  stable_request_count_locked: true,
  measurement_run_id_added: true,
  shared_beta_runner_unchanged: true,
  beta_profile_preserved: true,
}, null, 2));
