import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

function readArg(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : '';
}

function normalizedText(value) {
  const normalized = value.replace(/\r\n/g, '\n');
  assert.equal(normalized.includes('\r'), false, 'Text contains a bare carriage return.');
  return normalized;
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function sha256TextFile(path) {
  return sha256(normalizedText(readFileSync(path, 'utf8')));
}

const expectedFingerprint = readArg('fingerprint');
assert.match(expectedFingerprint, /^[0-9a-f]{64}$/, 'Provide --fingerprint with the approved value.');

const sourcePath = 'references/verification/admin-dashboard-phase-a-railway-fingerprint-2026-07-16.txt';
const runnerPath = 'scripts/run-admin-dashboard-phase-a-railway-release.ps1';
const verifierPath = 'scripts/verify-admin-dashboard-phase-a-railway-packet.mjs';
const liveGatePath = 'scripts/verify-admin-dashboard-phase-a-railway-live.mjs';
const source = normalizedText(readFileSync(sourcePath, 'utf8'));
assert.equal(source.endsWith('\n'), true, 'Fingerprint source must end with one LF.');
assert.equal(sha256(source), expectedFingerprint, 'Approval fingerprint does not match the source.');

const fields = Object.fromEntries(source.trimEnd().split('\n').map((line) => {
  const separator = line.indexOf('=');
  assert.ok(separator > 0, `Malformed fingerprint line: ${line}`);
  return [line.slice(0, separator), line.slice(separator + 1)];
}));

assert.deepEqual(fields, {
  packet: 'admin_dashboard_phase_a_railway_release',
  implementation_revision: '3ce3224205c4ef13f7eb3ad0d83556db4c08c708',
  implementation_tree: '12070a25c24225b11cd19b0987cf500a23de1218',
  rollback_revision: '31ac66dfecc40e4549f08fc3d9dea99d583a3393',
  rollback_tree: '0064918488fe4c37382d2b21da43c1a5ba0f372c',
  runner_sha256: fields.runner_sha256,
  verifier_sha256: fields.verifier_sha256,
  live_gate_sha256: fields.live_gate_sha256,
  remote_server_sha256: fields.remote_server_sha256,
  usage_attribution_sha256: fields.usage_attribution_sha256,
  mcp_package_sha256: fields.mcp_package_sha256,
  mcp_lock_sha256: fields.mcp_lock_sha256,
  telemetry_gate_sha256: fields.telemetry_gate_sha256,
  server_contract_gate_sha256: fields.server_contract_gate_sha256,
  usage_dedupe_gate_sha256: fields.usage_dedupe_gate_sha256,
  hydration_gate_sha256: fields.hydration_gate_sha256,
  asset_bundle_gate_sha256: fields.asset_bundle_gate_sha256,
  local_verification_sha256: fields.local_verification_sha256,
  hash_mode: 'lf_normalized_utf8',
  project_id: 'b53f5f48-607f-49ae-a71e-37cc766f6973',
  environment_id: '6345c75b-5ac2-40d6-b176-a4a783ce3eb3',
  environment_name: 'production',
  service_id: '352420e5-6a02-43a4-99f2-f6dbde522acb',
  service_name: 'scintillating-imagination',
  predeployment_id: '5ea2e0b8-201a-4be9-81b7-a450d7f85c61',
  predeployment_image_digest: 'sha256:91288b2a0323f9af9341e8846768057968ff8bfb5af567bf644590c77a9a3b58',
  mcp_url: 'https://mcp.supericons.dev/mcp',
  expected_version: '0.4.18',
  expected_material_asset_count: '8524',
  synthetic_live_tool_calls: '0',
  live_telemetry_policy: 'local_contract_then_real_traffic_24h',
  country_coverage_target: '90_percent_of_eligible_real_traffic',
  railway_candidate_deployments_authorized: '1',
  conditional_rollback_deployments_authorized: '1',
  supabase_changes_authorized: 'false',
  database_changes_authorized: 'false',
  storage_changes_authorized: 'false',
  npm_publication_authorized: 'false',
  railway_configuration_changes_authorized: 'false',
});

const textHashes = [
  [runnerPath, 'runner_sha256'],
  [verifierPath, 'verifier_sha256'],
  [liveGatePath, 'live_gate_sha256'],
  ['mcp/remote-server.js', 'remote_server_sha256'],
  ['mcp/usage-attribution.js', 'usage_attribution_sha256'],
  ['mcp/package.json', 'mcp_package_sha256'],
  ['mcp/package-lock.json', 'mcp_lock_sha256'],
  ['scripts/verify-mcp-phase-a-telemetry.mjs', 'telemetry_gate_sha256'],
  ['scripts/verify-material-railway-server-contract.mjs', 'server_contract_gate_sha256'],
  ['scripts/verify-mcp-usage-dedupe.mjs', 'usage_dedupe_gate_sha256'],
  ['scripts/verify-material-railway-hydration.mjs', 'hydration_gate_sha256'],
  ['scripts/verify-material-railway-asset-bundle.mjs', 'asset_bundle_gate_sha256'],
  ['references/verification/admin-dashboard-phase-a-local-verification-2026-07-16.json', 'local_verification_sha256'],
];
for (const [path, field] of textHashes) {
  assert.match(fields[field], /^[0-9a-f]{64}$/, `${field} must be SHA-256.`);
  assert.equal(sha256TextFile(path), fields[field], `${path} hash does not match.`);
}

assert.equal(
  execFileSync('git', ['rev-parse', `${fields.implementation_revision}^{tree}`], { encoding: 'utf8' }).trim(),
  fields.implementation_tree,
);
assert.equal(
  execFileSync('git', ['rev-parse', `${fields.rollback_revision}^{tree}`], { encoding: 'utf8' }).trim(),
  fields.rollback_tree,
);

const runner = normalizedText(readFileSync(runnerPath, 'utf8'));
assert.equal((runner.match(/& railway up /g) || []).length, 1, 'Runner must contain one upload command.');
assert.match(runner, /--project \$ProjectId --environment \$EnvironmentId --service \$ServiceId/);
assert.match(runner, /-Revision \$ImplementationRevision/);
assert.match(runner, /-Revision \$RollbackRevision/);
assert.match(runner, /if \(\$script:CandidateWentLive -and \$script:CandidateDeploymentId\)/);
assert.match(runner, /verify-mcp-phase-a-telemetry\.mjs/);
assert.match(runner, /verify-material-railway-server-contract\.mjs/);
assert.match(runner, /verify-mcp-usage-dedupe\.mjs/);
assert.match(runner, /verify-material-railway-hydration\.mjs/);
assert.match(runner, /verify-material-railway-asset-bundle\.mjs/);
assert.match(runner, /synthetic_tool_calls -ne 0/);
assert.match(runner, /Railway deployment drifted/);
assert.match(runner, /Railway image digest drifted/);

for (const prohibited of [
  /\bsupabase\s+(?:functions|db|migration|link|secrets?)/i,
  /npm\s+publish/i,
  /railway\s+(?:variables?|delete|remove|link|redeploy)/i,
]) {
  assert.equal(prohibited.test(runner), false, `Runner contains prohibited command: ${prohibited}`);
}

const liveGate = normalizedText(readFileSync(liveGatePath, 'utf8'));
assert.equal(liveGate.includes('.callTool('), false, 'Live gate must not make synthetic tool calls.');
assert.match(liveGate, /await client\.listTools\(\)/);
assert.match(liveGate, /summary\.synthetic_tool_calls = 0/);
assert.match(liveGate, /health\.material_assets\?\.asset_count/);

const telemetryGate = normalizedText(readFileSync('scripts/verify-mcp-phase-a-telemetry.mjs', 'utf8'));
assert.match(telemetryGate, /query_origin/);
assert.match(telemetryGate, /requested_limit/);
assert.match(telemetryGate, /country_code/);
assert.match(telemetryGate, /client_ip_public/);

const remoteServer = normalizedText(readFileSync('mcp/remote-server.js', 'utf8'));
assert.match(remoteServer, /query_origin: deriveMcpQueryOrigin\(toolName\)/);
assert.match(remoteServer, /requested_limit: getMcpRequestedLimit\(toolName, args\)/);
assert.match(remoteServer, /client_ip_public: requestContext\?\.client_ip_public === true/);

console.log(JSON.stringify({
  status: 'ok',
  approval_fingerprint: expectedFingerprint,
  implementation_revision: fields.implementation_revision,
  rollback_revision: fields.rollback_revision,
  target: {
    project_id: fields.project_id,
    environment_id: fields.environment_id,
    service_id: fields.service_id,
    predeployment_id: fields.predeployment_id,
  },
  live_gate: {
    synthetic_tool_calls: 0,
    telemetry_rows_expected: 0,
    country_coverage_after_hours: 24,
  },
  mutations: {
    railway_candidate_deployments: 1,
    conditional_rollback_deployments: 1,
    railway_configuration: 0,
    supabase: 0,
    database: 0,
    storage: 0,
    npm_publication: 0,
  },
}, null, 2));
