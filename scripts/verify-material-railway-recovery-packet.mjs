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

const sourcePath = 'references/verification/material-railway-recovery-narrow-fingerprint-2026-07-16.txt';
const runnerPath = 'scripts/run-material-railway-recovery.ps1';
const verifierPath = 'scripts/verify-material-railway-recovery-packet.mjs';
const recoveryGatePath = 'scripts/verify-material-railway-recovery-live.mjs';
const searchProbePath = 'scripts/probe-material-search-engine.mjs';
const searchProbeVerifierPath = 'scripts/verify-material-search-engine-probe.mjs';
const priorAttemptRecordPath = 'references/verification/material-railway-recovery-attribution-attempt-2026-07-16.md';
const priorAttemptEvidence = [
  'references/verification/material-railway-recovery-attribution-legacy-preflight-2026-07-15.json',
  'references/verification/material-railway-recovery-attribution-stability-preflight-attempt-1-2026-07-15.json',
  'references/verification/material-railway-recovery-attribution-stability-preflight-attempt-2-2026-07-15.json',
  'references/verification/material-railway-recovery-attribution-material-gate-2026-07-15.json',
  'references/verification/material-railway-recovery-attribution-engine-attempt-1-2026-07-15.json',
  'references/verification/material-railway-recovery-attribution-attempt-1-2026-07-15.json',
  'references/verification/material-railway-recovery-attribution-rollback-2026-07-15.json',
];

const source = normalizedText(readFileSync(sourcePath, 'utf8'));
assert.equal(source.endsWith('\n'), true, 'Fingerprint source must end with one LF.');
assert.equal(sha256(source), expectedFingerprint, 'Approval fingerprint does not match the narrow packet source.');

const fields = Object.fromEntries(
  source.trimEnd().split('\n').map((line) => {
    const separator = line.indexOf('=');
    assert.ok(separator > 0, `Malformed fingerprint line: ${line}`);
    return [line.slice(0, separator), line.slice(separator + 1)];
  }),
);

assert.deepEqual(fields, {
  packet: 'material_railway_hydration_narrow_recovery',
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
  prior_attempt_record_sha256: fields.prior_attempt_record_sha256,
  prior_legacy_preflight_sha256: fields.prior_legacy_preflight_sha256,
  prior_stability_attempt_1_sha256: fields.prior_stability_attempt_1_sha256,
  prior_stability_attempt_2_sha256: fields.prior_stability_attempt_2_sha256,
  prior_material_gate_sha256: fields.prior_material_gate_sha256,
  prior_follow_up_gate_sha256: fields.prior_follow_up_gate_sha256,
  prior_attribution_sha256: fields.prior_attribution_sha256,
  prior_rollback_sha256: fields.prior_rollback_sha256,
  bundle_sha256: '66ef383bad9e3847da107f0d8f37f0bd1cb695afd4e3c4cd3470ef1c97723ed9',
  hash_mode: 'lf_normalized_utf8_for_text_raw_sha256_for_bundle',
  project_id: 'b53f5f48-607f-49ae-a71e-37cc766f6973',
  environment_id: '6345c75b-5ac2-40d6-b176-a4a783ce3eb3',
  environment_name: 'production',
  service_id: '352420e5-6a02-43a4-99f2-f6dbde522acb',
  service_name: 'scintillating-imagination',
  predeployment_id: '9186be87-a85f-4dd8-9807-323394e47c33',
  predeployment_image_digest: 'sha256:77a61f1c058822ccbb81f83ae471297b9bd472de1aba0704b0fd53938025ee41',
  rollback_revision: '02b2c22ea8a76decee92d83c853ca6cf33899e6c',
  rollback_tree: 'b5cea763f36be4e32453d4e1aca49988a4d3a72f',
  mcp_url: 'https://mcp.supericons.dev/mcp',
  search_url: 'https://kcjmkakdhsqplvasgkjv.supabase.co/functions/v1/mcp-search',
  expected_version: '0.4.18',
  expected_asset_count: '8524',
  stability_probe_count: '6',
  stability_window_seconds: '180',
  stability_interval_ms: '36000',
  preflight_latency_policy: 'record_only',
  preflight_observation_threshold_ms: '5000',
  preflight_request_timeout_ms: '30000',
  preflight_attempt_limit: '3',
  preflight_retry_window_seconds: '900',
  preflight_retry_delay_seconds: '90',
  material_local_gate_checks: '11',
  follow_up_gate_checks: '6',
  postdeploy_gate_checks: '17',
  follow_up_attempt_limit: '1',
  mcp_request_timeout_ms: '120000',
  search_p95_limit_ms: '2000',
  get_icon_p95_limit_ms: '2000',
  preview_p95_limit_ms: '2000',
  candidate_local_follow_up_limit_ms: '3000',
  engine_latency_policy: 'record_only',
  engine_latency_observation_threshold_ms: '3000',
  correctness_failure_action: 'verified_rollback',
  candidate_local_latency_failure_action: 'verified_rollback',
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
  'remote_server_sha256', 'material_hydration_sha256', 'prior_attempt_record_sha256',
  'prior_legacy_preflight_sha256', 'prior_stability_attempt_1_sha256',
  'prior_stability_attempt_2_sha256', 'prior_material_gate_sha256',
  'prior_follow_up_gate_sha256', 'prior_attribution_sha256', 'prior_rollback_sha256',
  'bundle_sha256',
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
  [priorAttemptRecordPath, 'prior_attempt_record_sha256'],
  [priorAttemptEvidence[0], 'prior_legacy_preflight_sha256'],
  [priorAttemptEvidence[1], 'prior_stability_attempt_1_sha256'],
  [priorAttemptEvidence[2], 'prior_stability_attempt_2_sha256'],
  [priorAttemptEvidence[3], 'prior_material_gate_sha256'],
  [priorAttemptEvidence[4], 'prior_follow_up_gate_sha256'],
  [priorAttemptEvidence[5], 'prior_attribution_sha256'],
  [priorAttemptEvidence[6], 'prior_rollback_sha256'],
]) {
  assert.equal(sha256TextFile(path), fields[field], `${path} hash does not match the narrow packet.`);
}
assert.equal(sha256File('mcp/material-mcp-assets.json.gz'), fields.bundle_sha256);

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
assert.match(runner, /\$PreflightObservationThresholdMilliseconds = 5000/);
assert.match(runner, /\$FollowUpObservationThresholdMilliseconds = 3000/);
assert.match(runner, /\$MaxPreflightAttempts = 3/);
assert.match(runner, /\$MaxPreflightRetryWindowSeconds = 900/);
assert.match(runner, /\$PreflightRetryDelaySeconds = 90/);
assert.match(runner, /\$McpRequestTimeoutMilliseconds = 120000/);
assert.match(runner, /'--latency-policy', 'record-only'/);
assert.match(runner, /-RequestTimeoutMilliseconds 30000/);
assert.match(runner, /-Profile 'material-local'/);
assert.match(runner, /-Profile 'follow-up'/);
assert.match(runner, /candidate_follow_up_correctness_or_local_latency_failed/);
assert.match(runner, /material-railway-recovery-narrow-stability-preflight-attempt-\$attempt-2026-07-16\.json/);
assert.match(runner, /material-railway-recovery-narrow-follow-up-gate-2026-07-16\.json/);
assert.equal(runner.includes('Invoke-EngineAttribution'), false,
  'The narrow runner must not contain latency attribution.');
assert.equal(runner.includes('candidate_engine_overhead'), false,
  'Engine latency must not trigger rollback in the narrow packet.');
assert.equal(runner.includes('MaxEngineAttempts'), false,
  'The narrow packet must run one follow-up gate.');
assert.ok(
  runner.indexOf("-Profile 'material-local'") < runner.indexOf("-Profile 'follow-up'"),
  'Material-local gates must run before follow-up correctness checks.',
);

for (const prohibited of [
  /\bsupabase\s+(?:functions|db|migration|link|secrets?)/i,
  /npm\s+publish/i,
  /railway\s+(?:variables?|delete|remove|link|redeploy)/i,
]) {
  assert.equal(prohibited.test(runner), false, `Runner contains prohibited command pattern: ${prohibited}`);
}

const recoveryGate = normalizedText(readFileSync(recoveryGatePath, 'utf8'));
assert.match(recoveryGate, /\['material-local', 'follow-up'\]/);
assert.match(recoveryGate, /timeout: requestTimeoutMs, maxTotalTimeout: requestTimeoutMs/);
assert.match(recoveryGate, /summary\.checks\.length, 11/);
assert.match(recoveryGate, /summary\.checks\.length, 6/);
assert.match(recoveryGate, /engine_latency_observations/);
assert.match(recoveryGate, /threshold_exceeded: throughCandidateMs > engineLatencyLimitMs/);
assert.match(recoveryGate, /path: 'candidate_local'/);
assert.match(recoveryGate, /assert\.ok\(recommendationRaw\.elapsedMs <= engineLatencyLimitMs/);
assert.match(recoveryGate, /assert\.ok\(allModeSolidRaw\.elapsedMs <= engineLatencyLimitMs/);
assert.match(recoveryGate, /assert\.ok\(recommendP95Ms <= 3000/);
assert.equal(recoveryGate.includes("summary.status = 'latency_failed'"), false,
  'Existing engine latency must be record-only.');
assert.equal(recoveryGate.includes('direct_request'), false,
  'The follow-up gate must not create latency attribution requests.');

const searchProbe = normalizedText(readFileSync(searchProbePath, 'utf8'));
for (const required of [
  "source: 'verify'",
  "channel: 'internal_test'",
  "environment: 'production'",
  "client_family: clientFamily",
  "['blocking', 'record-only'].includes(latencyPolicy)",
  "probe.latency_exceeded = true",
  'AbortSignal.timeout(requestTimeoutMilliseconds)',
]) {
  assert.ok(searchProbe.includes(required), `Search probe is missing: ${required}`);
}

const remoteServer = normalizedText(readFileSync('mcp/remote-server.js', 'utf8'));
assert.match(remoteServer,
  /const allModeMaterialSolid = libraryMode === 'all' && style === 'solid';/);
assert.match(remoteServer,
  /const hostedLibrary = allModeMaterialSolid \? 'material' : library;/);
assert.match(remoteServer,
  /const hostedLibraryMode = allModeMaterialSolid \? 'strict' : libraryMode;/);
assert.match(remoteServer,
  /const useLocalMaterialRanking = hostedLibrary === 'material' && hostedLibraryMode === 'strict';/);
assert.match(remoteServer,
  /if \(useLocalMaterialRanking\) \{\s+rankedRows = searchLocalMaterialRows/);
assert.match(recoveryGate,
  /task: 'Choose a Material icon for application settings\.'[\s\S]+library: 'material', style: 'solid'/);

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
  preflight: {
    probes: Number(fields.stability_probe_count),
    window_seconds: Number(fields.stability_window_seconds),
    latency_policy: fields.preflight_latency_policy,
    observation_threshold_ms: Number(fields.preflight_observation_threshold_ms),
    attempt_limit: Number(fields.preflight_attempt_limit),
  },
  postdeploy_gates: {
    material_local: Number(fields.material_local_gate_checks),
    follow_up: Number(fields.follow_up_gate_checks),
    total: Number(fields.postdeploy_gate_checks),
    engine_latency_policy: fields.engine_latency_policy,
    candidate_local_latency_limit_ms: Number(fields.candidate_local_follow_up_limit_ms),
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
