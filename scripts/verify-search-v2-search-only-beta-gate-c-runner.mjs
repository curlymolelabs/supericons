import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const measurement = readFileSync('scripts/run-search-v2-latency-measurement.mjs', 'utf8');
const runner = readFileSync('scripts/run-search-v2-search-only-beta-gate-c.ps1', 'utf8');

assert.match(measurement, /function publicMeasurementTiming/);
assert.match(measurement, /measurement_timing: publicMeasurementTiming/);
assert.match(measurement, /response_error_code/);
assert.match(measurement, /hosted_attempts: hostedAttempts/);
assert.match(measurement, /function workerStateSummaryFor/);
assert.match(measurement, /first_request: \[\]/);
assert.match(measurement, /reused_worker: \[\]/);
assert.match(measurement, /worker_summary: workerStateSummaryFor/);
assert.match(measurement, /material-settings-outline/);
assert.match(measurement, /material-settings-solid/);
assert.match(measurement, /invalid-library-mode/);
assert.match(measurement, /invalid_library_mode/);
assert.match(measurement, /style: searchCase\.style \|\| 'any'/);
assert.match(measurement, /smoke_summary/);

assert.match(runner, /\[switch\]\$ExecuteApprovedGateC/);
assert.match(runner, /if \(\$LASTEXITCODE -ne 0\)/);
assert.match(runner, /warm_summary\.error_rate_percent -gt 1/);
assert.match(runner, /warm_summary\.p95_ms -gt 2000/);
assert.match(runner, /Invoke-MeasurementStep -Mode 'search'/);
assert.match(runner, /Invoke-MeasurementStep -Mode 'localized'/);
assert.match(runner, /Invoke-MeasurementStep -Mode 'smoke'/);
assert.doesNotMatch(runner, /supabase functions deploy/i);
assert.doesNotMatch(runner, /npm publish/i);
assert.doesNotMatch(runner, /psql|supabase db|migration repair/i);
assert.doesNotMatch(runner, /model-provider|embedding/i);

for (const artifact of [measurement, runner]) {
  assert.doesNotMatch(artifact, /[\u2013\u2014]/);
}

console.log(JSON.stringify({
  status: 'ok',
  retains_public_stage_timing: true,
  retains_structured_error_code: true,
  retains_localized_attempts: true,
  stops_after_failed_native_command: true,
  search_p95_limit_ms: 2000,
  localized_p95_limit_ms: 2000,
  material_outline_and_solid_smoke: true,
  invalid_request_smoke: true,
  deployment_commands_present: false,
  database_mutation_commands_present: false,
  npm_publication_commands_present: false,
}, null, 2));
