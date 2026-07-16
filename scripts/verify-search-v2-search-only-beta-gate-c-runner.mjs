import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const measurement = readFileSync('scripts/run-search-v2-latency-measurement.mjs', 'utf8');
const runner = readFileSync('scripts/run-search-v2-search-only-beta-gate-c.ps1', 'utf8');
const handler = readFileSync('supabase/functions/_shared/search-engine/handle-search-request.ts', 'utf8');
const sharedRecommendation = readFileSync(
  'supabase/functions/_shared/search-engine/shared-recommendation-search-request.ts',
  'utf8',
);
const evidence = readFileSync('scripts/search-v2-gate-c-evidence.mjs', 'utf8');

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
assert.match(handler, /const timingRecord = timing\.finish\('error'\)/);
assert.match(handler, /measurementTiming: includeTimingInResponse \? timingRecord : null/);
assert.match(sharedRecommendation, /measurementTiming: includeTimingInResponse \? timingRecord : null/);

assert.match(runner, /\[switch\]\$ExecuteApprovedGateC/);
assert.match(runner, /\[ValidateSet\('measure', 'finalize'\)\]/);
assert.match(runner, /if \(\$LASTEXITCODE -ne 0\)/);
assert.match(runner, /warm_summary\.error_rate_percent -gt 1/);
assert.match(runner, /warm_summary\.p95_ms -gt 2000/);
assert.match(runner, /Invoke-MeasurementStep -Mode 'search'/);
assert.match(runner, /Invoke-MeasurementStep -Mode 'localized'/);
assert.match(runner, /Invoke-MeasurementStep -Mode 'smoke'/);
assert.match(runner, /status = 'evidence_pending'/);
assert.match(runner, /throw 'Gate C measurements passed, but evidence is pending/);
assert.match(runner, /Finalize requires -LiveEvidencePath/);
assert.match(runner, /npm run verify:search-v2-tool-scoped-beta/);
assert.match(runner, /npm run verify:mcp-usage-dedupe/);
assert.match(runner, /search-v2-gate-c-evidence\.mjs/);
assert.doesNotMatch(runner, /status = 'ok'/);
assert.doesNotMatch(runner, /supabase functions deploy/i);
assert.doesNotMatch(runner, /npm publish/i);
assert.doesNotMatch(runner, /psql|supabase db|migration repair/i);
assert.doesNotMatch(runner, /model-provider|embedding/i);

for (const requiredEvidence of [
  'Platform error evidence is unreadable',
  'Search audit evidence is unreadable',
  'Audit capture is below the required minimum',
  'Recommendation byte parity failed',
  'version changed',
  'npm latest changed during Gate C',
]) {
  assert.ok(evidence.includes(requiredEvidence), `Missing complete-evidence gate: ${requiredEvidence}`);
}

for (const artifact of [measurement, runner, handler, sharedRecommendation, evidence]) {
  assert.doesNotMatch(artifact, /[\u2013\u2014]/);
}

console.log(JSON.stringify({
  status: 'ok',
  retains_public_stage_timing: true,
  retains_structured_error_code: true,
  retains_localized_attempts: true,
  timed_error_response_required: true,
  stops_after_failed_native_command: true,
  measure_phase_cannot_report_success: true,
  finalize_requires_complete_live_evidence: true,
  search_p95_limit_ms: 2000,
  localized_p95_limit_ms: 2000,
  material_outline_and_solid_smoke: true,
  invalid_request_smoke: true,
  deployment_commands_present: false,
  database_mutation_commands_present: false,
  npm_publication_commands_present: false,
}, null, 2));
