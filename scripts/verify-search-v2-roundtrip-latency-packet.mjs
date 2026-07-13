import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const manifestPath = 'docs/si-v2/search/reviews/search-v2-roundtrip-latency-authorization-manifest-2026-07-14.json';
const packetPath = 'docs/si-v2/search/reviews/search-v2-roundtrip-latency-approval-request-2026-07-14.md';
const evidencePath = 'references/verification/search-v2-roundtrip-latency-preparation-2026-07-14.md';
const expectedManifestHash = 'd0ebaabd2ccb439755ad5bd53d44faa1ba0c8ab08acd96ed52e92d6bf07937c8';
const expectedMigrationHash = 'f965c0b354a8d2e31be8791ac5b2041838be6bc8a2b40a97735f90d27f81cded';
const expectedRunnerHash = 'bba4cf618fc5c6b01bd162492790bb67495e4a9942d37905b4a790d6fbbe3a11';

function read(path) {
  return readFileSync(path, 'utf8');
}

function gitShow(commit, path) {
  return execFileSync('git', ['show', `${commit}:${path}`], { encoding: 'utf8' });
}

const manifestText = read(manifestPath);
const manifest = JSON.parse(manifestText);
const packet = read(packetPath);
const evidence = read(evidencePath);
const runner = read('scripts/apply-search-v2-batched-candidates-hosted.ps1');
const measurementRunner = read('scripts/run-search-v2-roundtrip-latency-measurement.mjs');
const manifestHash = createHash('sha256').update(manifestText).digest('hex');
const migrationHash = createHash('sha256')
  .update(read('supabase/migrations/20260714120000_search_v2_batched_candidates.sql'))
  .digest('hex');
const measurementRunnerHash = createHash('sha256').update(measurementRunner).digest('hex');

assert.equal(manifestHash, expectedManifestHash);
assert.equal(migrationHash, expectedMigrationHash);
assert.equal(measurementRunnerHash, expectedRunnerHash);
assert.equal(manifest.measurement_runner.sha256, expectedRunnerHash);
assert.equal(manifest.status, 'awaiting_owner_approval');
assert.equal(manifest.implementation_commit, '8ba345fa9');
assert.equal(manifest.control_endpoint, 'mcp-search-v2-control');
assert.equal(manifest.treatment_endpoint, 'mcp-search-v2-treatment');
assert.equal(manifest.database.migration_version, '20260714120000');
assert.equal(manifest.database.normal_db_push_allowed, false);
assert.equal(manifest.database.older_history_repair_allowed, false);
assert.deepEqual(manifest.database.allowed_history_repairs, ['20260714120000']);
assert.equal(manifest.variant_contract.maximum_function_deployments, 2);
assert.equal(manifest.variant_contract.control_recommendation_path, 'separate');
assert.equal(manifest.variant_contract.treatment_recommendation_path, 'grouped');
assert.equal(manifest.parity_gate.cases.length, 5);
assert.equal(manifest.parity_gate.requests_per_case_per_variant, 3);
assert.equal(manifest.recommendation_measurement.expected_control_hosted_requests, 4);
assert.equal(manifest.recommendation_measurement.expected_treatment_hosted_requests, 1);
assert.equal(manifest.publication_limits.direct_hosted_search_p95_ms, 2000);
assert.equal(manifest.publication_limits.one_slot_recommendation_p95_ms, 3000);
assert.equal(manifest.prohibited_actions.includes('deployment of search-icons or mcp-search'), true);
assert.equal(manifest.prohibited_actions.includes('npm publication or tag change'), true);
assert.equal(manifest.prohibited_actions.includes('external model-provider call'), true);

const control = gitShow(manifest.implementation_commit, 'supabase/functions/mcp-search-v2-control/index.ts');
const treatment = gitShow(manifest.implementation_commit, 'supabase/functions/mcp-search-v2-treatment/index.ts');
assert.match(control, /candidateRpcName: 'si_search_icon_candidates_v2'/);
assert.doesNotMatch(control, /candidateBatchRpcName/);
assert.match(treatment, /handleGroupedSearchRequest/);
assert.match(treatment, /candidateBatchRpcName: 'si_search_icon_candidates_v3'/);
assert.match(treatment, /hydrateFinalSvg: true/);

const committedMigrationHash = createHash('sha256')
  .update(gitShow(manifest.implementation_commit, 'supabase/migrations/20260714120000_search_v2_batched_candidates.sql'))
  .digest('hex');
assert.equal(committedMigrationHash, expectedMigrationHash);
assert.ok(runner.includes(`$expectedMigrationHash = '${expectedMigrationHash}'`));
assert.doesNotMatch(runner, /supabase db push/i);
assert.match(measurementRunner, /mcp-search-v2-control/);
assert.match(measurementRunner, /mcp-search-v2-treatment/);
assert.match(measurementRunner, /variantOrder/);
assert.match(measurementRunner, /searchIconQueriesHostedMcp/);
assert.match(measurementRunner, /if \(parity\.passed\)/);
assert.match(measurementRunner, /actual_http_requests/);

for (const artifact of [packet, evidence]) {
  assert.ok(artifact.includes(expectedManifestHash));
  assert.ok(artifact.includes(manifest.implementation_commit));
  assert.ok(artifact.includes(expectedMigrationHash));
}
assert.match(packet, /No production function deployment, normal database push, older migration repair, npm publication, scheduled warm ping, public invitation, or model-provider call is authorized/);
assert.match(packet, /Latency and error limits are publication gates, not early diagnostic stops/);
assert.match(packet, /Every first request is reported separately/);

console.log(JSON.stringify({
  status: 'ok',
  manifest_sha256: manifestHash,
  implementation_commit: manifest.implementation_commit,
  migration_sha256: migrationHash,
  measurement_runner_sha256: measurementRunnerHash,
  isolated_endpoints: [manifest.control_endpoint, manifest.treatment_endpoint],
  maximum_function_deployments: manifest.variant_contract.maximum_function_deployments,
  production_function_deployments: 0,
  npm_publications: 0,
  model_provider_calls: 0,
}, null, 2));
