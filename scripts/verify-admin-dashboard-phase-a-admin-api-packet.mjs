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

const sourcePath = 'references/verification/admin-dashboard-phase-a-admin-api-fingerprint-2026-07-16.txt';
const runnerPath = 'scripts/run-admin-dashboard-phase-a-admin-api-release.ps1';
const verifierPath = 'scripts/verify-admin-dashboard-phase-a-admin-api-packet.mjs';
const liveGatePath = 'scripts/verify-admin-dashboard-phase-a-admin-api-live.mjs';
const inventoryPath = 'references/verification/admin-dashboard-phase-a-admin-api-inventory-2026-07-16.json';
const source = normalizedText(readFileSync(sourcePath, 'utf8'));
assert.equal(source.endsWith('\n'), true, 'Fingerprint source must end with one LF.');
assert.equal(sha256(source), expectedFingerprint, 'Approval fingerprint does not match the source.');

const fields = Object.fromEntries(source.trimEnd().split('\n').map((line) => {
  const separator = line.indexOf('=');
  assert.ok(separator > 0, `Malformed fingerprint line: ${line}`);
  return [line.slice(0, separator), line.slice(separator + 1)];
}));

assert.deepEqual(fields, {
  packet: 'admin_dashboard_phase_a_admin_api_release',
  implementation_revision: '3ce3224205c4ef13f7eb3ad0d83556db4c08c708',
  implementation_tree: '12070a25c24225b11cd19b0987cf500a23de1218',
  rollback_revision: fields.rollback_revision,
  rollback_tree: fields.rollback_tree,
  runner_sha256: fields.runner_sha256,
  verifier_sha256: fields.verifier_sha256,
  live_gate_sha256: fields.live_gate_sha256,
  postflight_sql_sha256: fields.postflight_sql_sha256,
  admin_api_sha256: fields.admin_api_sha256,
  metrics_sha256: fields.metrics_sha256,
  defect_registry_sha256: fields.defect_registry_sha256,
  api_contract_gate_sha256: fields.api_contract_gate_sha256,
  metrics_gate_sha256: fields.metrics_gate_sha256,
  local_verification_sha256: fields.local_verification_sha256,
  inventory_sha256: fields.inventory_sha256,
  inventory_capture_sha256: fields.inventory_capture_sha256,
  hash_mode: 'lf_normalized_utf8',
  project_ref: 'kcjmkakdhsqplvasgkjv',
  linked_project_ref_check: 'required',
  database_url_query_parameters: 'preserved',
  function_name: 'admin-api',
  admin_url: 'https://kcjmkakdhsqplvasgkjv.supabase.co/functions/v1/admin-api',
  pre_function_id: fields.pre_function_id,
  pre_function_version: fields.pre_function_version,
  pre_function_updated_at: fields.pre_function_updated_at,
  pre_verify_jwt: 'false',
  rollup_refresh_calls_max: '60',
  rollup_refresh_elapsed_limit_minutes: '20',
  queue_24h_p95_limit_ms: '1500',
  queue_all_p95_limit_ms: '1000',
  queue_warm_samples: '10',
  supabase_candidate_deployments_authorized: '1',
  conditional_rollback_deployments_authorized: '1',
  rollup_refresh_writes_authorized: 'true',
  migration_changes_authorized: 'false',
  mcp_search_changes_authorized: 'false',
  railway_changes_authorized: 'false',
  storage_changes_authorized: 'false',
  npm_publication_authorized: 'false',
});

for (const field of ['rollback_revision', 'rollback_tree', 'pre_function_id']) {
  assert.match(fields[field], /^[0-9a-f-]{36,64}$/, `${field} is malformed.`);
}
assert.match(fields.pre_function_version, /^\d+$/);
assert.ok(Number(fields.pre_function_version) > 0);
assert.match(fields.pre_function_updated_at, /^\d+$/);
assert.ok(Number(fields.pre_function_updated_at) > 0);

const textHashes = [
  [runnerPath, 'runner_sha256'],
  [verifierPath, 'verifier_sha256'],
  [liveGatePath, 'live_gate_sha256'],
  ['scripts/sql/admin-dashboard-phase-a-hosted-postflight.sql', 'postflight_sql_sha256'],
  ['supabase/functions/admin-api/index.ts', 'admin_api_sha256'],
  ['lib/admin-dashboard-metrics.js', 'metrics_sha256'],
  ['data/admin/known-search-defects.json', 'defect_registry_sha256'],
  ['scripts/verify-admin-dashboard-phase-a-api.mjs', 'api_contract_gate_sha256'],
  ['scripts/verify-admin-dashboard-phase-a-metrics.mjs', 'metrics_gate_sha256'],
  ['references/verification/admin-dashboard-phase-a-local-verification-2026-07-16.json', 'local_verification_sha256'],
  [inventoryPath, 'inventory_sha256'],
  ['scripts/capture-admin-dashboard-phase-a-admin-api-inventory.ps1', 'inventory_capture_sha256'],
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

const inventory = JSON.parse(readFileSync(inventoryPath, 'utf8'));
assert.equal(inventory.project_ref, fields.project_ref);
assert.equal(inventory.function_name, fields.function_name);
assert.equal(inventory.function.id, fields.pre_function_id);
assert.equal(String(inventory.function.version), fields.pre_function_version);
assert.equal(inventory.function.updated_at, fields.pre_function_updated_at);
assert.equal(inventory.function.verify_jwt, false);
assert.equal(inventory.function.status.toUpperCase(), 'ACTIVE');
assert.equal(inventory.source_download.succeeded, true, 'Current source download must be retained.');
assert.match(inventory.source_download.index_sha256, /^[0-9a-f]{64}$/);
assert.ok(
  inventory.source_download.matching_git_revisions.includes(fields.rollback_revision),
  'Rollback revision must match the downloaded live admin API source.',
);
assert.equal(inventory.mutations, 0);

const runner = normalizedText(readFileSync(runnerPath, 'utf8'));
assert.equal((runner.match(/& supabase functions deploy /g) || []).length, 1,
  'Runner must contain one scoped deploy command.');
assert.match(runner, /--project-ref \$ProjectRef --no-verify-jwt --use-api --workdir \$sourcePath/);
assert.match(runner, /-Revision \$script:Packet\.implementation_revision/);
assert.match(runner, /-Revision \$script:Packet\.rollback_revision/);
assert.match(runner, /if \(\$script:CandidateWentLive -and \$script:CandidateFunction\)/);
assert.match(runner, /admin-dashboard-phase-a-hosted-postflight\.sql/);
assert.match(runner, /Read-Host 'Supabase database password' -AsSecureString/);
assert.match(runner, /Read-Host 'Supabase ADMIN_SECRET' -AsSecureString/);
assert.match(runner, /Remove-Item Env:PGPASSWORD/);
assert.match(runner, /Remove-Item Env:PHASE_A_ADMIN_SECRET/);
assert.match(runner, /\$LinkedProjectPath = Join-Path \$Root 'supabase\/\.temp\/linked-project\.json'/);
assert.match(runner, /if \("\$\(\$linkedProject\.ref\)" -ne \$ProjectRef\)/);
assert.match(runner, /if \(-not \$poolerUrl\.Contains\(\$ProjectRef\)\)/);
assert.match(runner, /\$querySeparator = if \(\$poolerUrl\.Contains\('\?'\)\) \{ '&' \} else \{ '\?' \}/);
assert.equal(runner.includes('mcp-search'), false, 'Runner must not deploy mcp-search.');

for (const prohibited of [
  /supabase\s+(?:db|migration|link|secrets?)\b/i,
  /npm\s+publish/i,
  /\brailway\b/i,
  /supabase\s+functions\s+delete/i,
]) {
  assert.equal(prohibited.test(runner), false, `Runner contains prohibited command: ${prohibited}`);
}

const postflight = normalizedText(readFileSync('scripts/sql/admin-dashboard-phase-a-hosted-postflight.sql', 'utf8'));
for (const prohibited of [
  /\binsert\s+into\b/i,
  /\bupdate\s+public\./i,
  /\bdelete\s+from\b/i,
  /\bdrop\s+(?:table|index|function)\b/i,
  /\balter\s+table\b/i,
  /\bcreate\s+(?:table|index|function)\b/i,
]) {
  assert.equal(prohibited.test(postflight), false, `Postflight is not read-only: ${prohibited}`);
}

const liveGate = normalizedText(readFileSync(liveGatePath, 'utf8'));
assert.match(liveGate, /attempt <= 60/);
assert.match(liveGate, /20 \* 60 \* 1000/);
assert.match(liveGate, /refresh-rollups/);
assert.match(liveGate, /measureQueue\([\s\S]*?count = 10/);
assert.match(liveGate, /queue24h\.p95_ms < 1500/);
assert.match(liveGate, /queueAll\.p95_ms < 1000/);
assert.match(liveGate, /window=1d/);
assert.match(liveGate, /window=all/);
assert.match(liveGate, /x-admin-secret/);
assert.equal(liveGate.includes('mcp-search'), false);

const adminApi = normalizedText(readFileSync('supabase/functions/admin-api/index.ts', 'utf8'));
assert.match(adminApi, /segments\[2\] === 'refresh-rollups'/);
assert.match(adminApi, /segments\[2\] === 'dashboard'/);
assert.match(adminApi, /query_origin, requested_limit[\s\S]*?client_ip_public/);

console.log(JSON.stringify({
  status: 'ok',
  approval_fingerprint: expectedFingerprint,
  implementation_revision: fields.implementation_revision,
  rollback_revision: fields.rollback_revision,
  pre_function: {
    id: fields.pre_function_id,
    version: Number(fields.pre_function_version),
    updated_at: fields.pre_function_updated_at,
    verify_jwt: false,
  },
  gates: {
    rollup_refresh_calls_max: 60,
    rollup_refresh_elapsed_limit_minutes: 20,
    queue_24h_p95_limit_ms: 1500,
    queue_all_p95_limit_ms: 1000,
    queue_warm_samples: 10,
  },
  mutations: {
    admin_api_candidate_deployments: 1,
    conditional_admin_api_rollback_deployments: 1,
    rollup_refresh_writes: true,
    migration: 0,
    mcp_search: 0,
    railway: 0,
    storage: 0,
    npm_publication: 0,
  },
}, null, 2));
