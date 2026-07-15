import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

function readArg(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : '';
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function normalizedText(value) {
  const normalized = value.replace(/\r\n/g, '\n');
  assert.equal(normalized.includes('\r'), false, 'Text contains an unsupported bare carriage return.');
  return normalized;
}

function sha256TextFile(path) {
  return sha256(normalizedText(readFileSync(path, 'utf8')));
}

function sha256File(path) {
  return sha256(readFileSync(path));
}

const expectedFingerprint = readArg('fingerprint');
assert.match(expectedFingerprint, /^[0-9a-f]{64}$/, 'Provide --fingerprint with the approved SHA-256 value.');

const sourcePath = 'references/verification/material-railway-recovery-fingerprint-2026-07-15.txt';
const runnerPath = 'scripts/run-material-railway-recovery.ps1';
const verifierPath = 'scripts/verify-material-railway-recovery-packet.mjs';
const recoveryGatePath = 'scripts/verify-material-railway-recovery-live.mjs';
const searchProbePath = 'scripts/probe-material-search-engine.mjs';
const searchProbeVerifierPath = 'scripts/verify-material-search-engine-probe.mjs';
const incidentProbePath = 'references/verification/material-railway-incident-engine-probes-2026-07-15.json';
const incidentRecordPath = 'references/verification/material-railway-release-attempt-2026-07-15.md';

const source = normalizedText(readFileSync(sourcePath, 'utf8'));
assert.equal(source.endsWith('\n'), true, 'Fingerprint source must end with one LF.');
assert.equal(sha256(source), expectedFingerprint, 'Approval fingerprint does not match the recovery packet source.');

const fields = Object.fromEntries(
  source.trimEnd().split('\n').map((line) => {
    const separator = line.indexOf('=');
    assert.ok(separator > 0, `Malformed fingerprint line: ${line}`);
    return [line.slice(0, separator), line.slice(separator + 1)];
  }),
);

assert.deepEqual(fields, {
  packet: 'material_railway_hydration_recovery',
  implementation_revision: '13f28d7e72484538b0a2be14f680ef8a4c4e3c52',
  implementation_tree: '27668ce5ff4027aabe28432f1ce2eaf6386bb109',
  runner_sha256: fields.runner_sha256,
  verifier_sha256: fields.verifier_sha256,
  recovery_gate_sha256: fields.recovery_gate_sha256,
  legacy_gate_sha256: fields.legacy_gate_sha256,
  search_probe_sha256: fields.search_probe_sha256,
  search_probe_verifier_sha256: fields.search_probe_verifier_sha256,
  asset_bundle_gate_sha256: fields.asset_bundle_gate_sha256,
  hydration_gate_sha256: fields.hydration_gate_sha256,
  server_contract_gate_sha256: fields.server_contract_gate_sha256,
  usage_dedupe_gate_sha256: fields.usage_dedupe_gate_sha256,
  remote_server_sha256: fields.remote_server_sha256,
  material_hydration_sha256: fields.material_hydration_sha256,
  incident_probe_sha256: fields.incident_probe_sha256,
  incident_record_sha256: fields.incident_record_sha256,
  bundle_sha256: '66ef383bad9e3847da107f0d8f37f0bd1cb695afd4e3c4cd3470ef1c97723ed9',
  hash_mode: 'lf_normalized_utf8_for_text_raw_sha256_for_bundle',
  project_id: 'b53f5f48-607f-49ae-a71e-37cc766f6973',
  environment_id: '6345c75b-5ac2-40d6-b176-a4a783ce3eb3',
  environment_name: 'production',
  service_id: '352420e5-6a02-43a4-99f2-f6dbde522acb',
  service_name: 'scintillating-imagination',
  predeployment_id: 'e789c810-ad5d-4808-9bdc-396a799372c5',
  predeployment_image_digest: 'sha256:043f4d748963bcd3e6198880472066a02690351569c601db0ef289b52cef9392',
  rollback_revision: '02b2c22ea8a76decee92d83c853ca6cf33899e6c',
  rollback_tree: 'b5cea763f36be4e32453d4e1aca49988a4d3a72f',
  mcp_url: 'https://mcp.supericons.dev/mcp',
  search_url: 'https://kcjmkakdhsqplvasgkjv.supabase.co/functions/v1/mcp-search',
  expected_version: '0.4.18',
  expected_asset_count: '8524',
  stability_probe_count: '6',
  stability_window_seconds: '180',
  stability_interval_ms: '36000',
  stability_latency_limit_ms: '3000',
  material_local_gate_checks: '11',
  engine_dependent_gate_checks: '6',
  postdeploy_gate_checks: '17',
  engine_attempt_limit: '3',
  engine_retry_window_seconds: '600',
  engine_retry_delay_seconds: '90',
  mcp_request_timeout_ms: '120000',
  search_p95_limit_ms: '2000',
  get_icon_p95_limit_ms: '2000',
  preview_p95_limit_ms: '2000',
  recommend_p95_limit_ms: '3000',
  retry_budget_exhaustion_action: 'verified_rollback',
  railway_deployments_authorized: '1',
  conditional_rollback_deployments_authorized: '1',
  supabase_changes_authorized: 'false',
  database_changes_authorized: 'false',
  storage_changes_authorized: 'false',
  npm_publication_authorized: 'false',
});

const hashFields = [
  'runner_sha256', 'verifier_sha256', 'recovery_gate_sha256', 'legacy_gate_sha256',
  'search_probe_sha256', 'search_probe_verifier_sha256', 'asset_bundle_gate_sha256',
  'hydration_gate_sha256', 'server_contract_gate_sha256', 'usage_dedupe_gate_sha256',
  'remote_server_sha256', 'material_hydration_sha256', 'incident_probe_sha256',
  'incident_record_sha256', 'bundle_sha256',
];
for (const field of hashFields) {
  assert.match(fields[field], /^[0-9a-f]{64}$/, `${field} must be a lowercase SHA-256 value.`);
}

for (const [path, field] of [
  [runnerPath, 'runner_sha256'],
  [verifierPath, 'verifier_sha256'],
  [recoveryGatePath, 'recovery_gate_sha256'],
  ['scripts/verify-material-railway-legacy-live.mjs', 'legacy_gate_sha256'],
  [searchProbePath, 'search_probe_sha256'],
  [searchProbeVerifierPath, 'search_probe_verifier_sha256'],
  ['scripts/verify-material-railway-asset-bundle.mjs', 'asset_bundle_gate_sha256'],
  ['scripts/verify-material-railway-hydration.mjs', 'hydration_gate_sha256'],
  ['scripts/verify-material-railway-server-contract.mjs', 'server_contract_gate_sha256'],
  ['scripts/verify-mcp-usage-dedupe.mjs', 'usage_dedupe_gate_sha256'],
  ['mcp/remote-server.js', 'remote_server_sha256'],
  ['mcp/material-hydration.js', 'material_hydration_sha256'],
  [incidentProbePath, 'incident_probe_sha256'],
  [incidentRecordPath, 'incident_record_sha256'],
]) {
  assert.equal(sha256TextFile(path), fields[field], `${path} hash does not match the recovery packet.`);
}
assert.equal(
  sha256File('mcp/material-mcp-assets.json.gz'),
  fields.bundle_sha256,
  'Material asset bundle hash does not match the recovery packet.',
);

const implementationTree = execFileSync(
  'git', ['rev-parse', `${fields.implementation_revision}^{tree}`], { encoding: 'utf8' },
).trim();
const rollbackTree = execFileSync(
  'git', ['rev-parse', `${fields.rollback_revision}^{tree}`], { encoding: 'utf8' },
).trim();
assert.equal(implementationTree, fields.implementation_tree);
assert.equal(rollbackTree, fields.rollback_tree);

const runner = normalizedText(readFileSync(runnerPath, 'utf8'));
assert.equal((runner.match(/& railway up /g) || []).length, 1,
  'Runner must have one scoped Railway upload command.');
assert.equal((runner.match(/Start-RevisionDeployment/g) || []).length, 3,
  'Runner must call the deployment helper only for candidate and rollback.');
assert.match(runner, /\$StabilityProbeCount = 6/);
assert.match(runner, /\$StabilityProbeIntervalMilliseconds = 36000/);
assert.match(runner, /\$MaxEngineAttempts = 3/);
assert.match(runner, /\$MaxEngineRetryWindowSeconds = 600/);
assert.match(runner, /\$EngineRetryDelaySeconds = 90/);
assert.match(runner, /\$McpRequestTimeoutMilliseconds = 120000/);
assert.match(runner, /-Profile 'material-local'/);
assert.match(runner, /-Profile 'engine-dependent'/);
assert.match(runner, /candidate_engine_gate_failed_with_healthy_control_attempt_/);
assert.match(runner, /dependency_unresolved_after_retry_budget/);
assert.match(runner, /Invoke-SearchEngineProbe[\s\S]+-Count 1/,
  'Every failed engine gate must be followed by a direct control probe.');
assert.ok(
  runner.indexOf("-Profile 'material-local'") < runner.indexOf("-Profile 'engine-dependent'"),
  'Material-local gates must run before engine-dependent attempts.',
);

for (const prohibited of [
  /\bsupabase\s+(?:functions|db|migration|link|secrets?)/i,
  /npm\s+publish/i,
  /railway\s+(?:variables?|delete|remove|link|redeploy)/i,
]) {
  assert.equal(prohibited.test(runner), false, `Runner contains prohibited command pattern: ${prohibited}`);
}

const recoveryGate = normalizedText(readFileSync(recoveryGatePath, 'utf8'));
assert.match(recoveryGate, /\['material-local', 'engine-dependent'\]/);
assert.match(recoveryGate, /timeout: requestTimeoutMs, maxTotalTimeout: requestTimeoutMs/);
assert.match(recoveryGate, /summary\.checks\.length, 11/);
assert.match(recoveryGate, /summary\.checks\.length, 6/);
assert.match(recoveryGate, /engineLatencyLimitMs/);

const searchProbe = normalizedText(readFileSync(searchProbePath, 'utf8'));
for (const required of [
  "source: 'verify'",
  "channel: 'internal_test'",
  "environment: 'production'",
  "client_family: clientFamily",
  'AbortSignal.timeout(requestTimeoutMilliseconds)',
]) {
  assert.ok(searchProbe.includes(required), `Search probe is missing: ${required}`);
}

execFileSync(process.execPath, [searchProbeVerifierPath], { stdio: 'inherit' });

console.log(JSON.stringify({
  status: 'ok',
  approval_fingerprint: expectedFingerprint,
  implementation_revision: fields.implementation_revision,
  implementation_tree: fields.implementation_tree,
  rollback_revision: fields.rollback_revision,
  target: {
    project_id: fields.project_id,
    environment_id: fields.environment_id,
    service_id: fields.service_id,
    predeployment_id: fields.predeployment_id,
  },
  stability_preflight: {
    probes: Number(fields.stability_probe_count),
    window_seconds: Number(fields.stability_window_seconds),
    latency_limit_ms: Number(fields.stability_latency_limit_ms),
  },
  postdeploy_gates: {
    material_local: Number(fields.material_local_gate_checks),
    engine_dependent: Number(fields.engine_dependent_gate_checks),
    total: Number(fields.postdeploy_gate_checks),
    engine_attempt_limit: Number(fields.engine_attempt_limit),
  },
  mutations: {
    railway_candidate_deployments: 1,
    conditional_rollback_deployments: 1,
    supabase: 0,
    database: 0,
    storage: 0,
    npm_publication: 0,
  },
}, null, 2));
