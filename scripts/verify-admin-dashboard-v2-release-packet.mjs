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
assert.match(expectedFingerprint, /^[0-9a-f]{64}$/, 'Provide --fingerprint.');

const sourcePath = 'references/verification/admin-dashboard-v2-release-fingerprint-2026-07-17.txt';
const source = normalizedText(readFileSync(sourcePath, 'utf8'));
assert.equal(source.endsWith('\n'), true, 'Fingerprint source must end with one LF.');
assert.equal(sha256(source), expectedFingerprint, 'Release fingerprint does not match the source.');

const fields = Object.fromEntries(source.trimEnd().split('\n').map((line) => {
  const separator = line.indexOf('=');
  assert.ok(separator > 0, `Malformed fingerprint line: ${line}`);
  return [line.slice(0, separator), line.slice(separator + 1)];
}));

assert.deepEqual(fields, {
  packet: 'admin_dashboard_v2_release',
  implementation_revision: '4c700177d616eab4abbd78a6fbc5361f5360a52c',
  implementation_tree: fields.implementation_tree,
  rollback_revision: 'f12fbb56807e9aec9a4bc02348de26c485467ad0',
  rollback_tree: fields.rollback_tree,
  rollback_index_sha256: '70b7dd28d8ff6d3bc1da39a7cbd7bfa79380dd279e044fedab57bfa01d742c54',
  runner_sha256: fields.runner_sha256,
  verifier_sha256: fields.verifier_sha256,
  database_gate_sha256: fields.database_gate_sha256,
  v2_live_gate_sha256: fields.v2_live_gate_sha256,
  phase_a_live_gate_sha256: fields.phase_a_live_gate_sha256,
  inventory_capture_sha256: fields.inventory_capture_sha256,
  credential_helper_sha256: fields.credential_helper_sha256,
  credential_test_sha256: fields.credential_test_sha256,
  admin_api_sha256: fields.admin_api_sha256,
  v2_helper_sha256: fields.v2_helper_sha256,
  v2_api_gate_sha256: fields.v2_api_gate_sha256,
  v2_helper_gate_sha256: fields.v2_helper_gate_sha256,
  phase_a_api_gate_sha256: fields.phase_a_api_gate_sha256,
  phase_a_metrics_gate_sha256: fields.phase_a_metrics_gate_sha256,
  phase_a_cache_gate_sha256: fields.phase_a_cache_gate_sha256,
  phase_b_gate_sha256: fields.phase_b_gate_sha256,
  phase_b_browser_gate_sha256: fields.phase_b_browser_gate_sha256,
  railway_gate_sha256: fields.railway_gate_sha256,
  search_gate_sha256: fields.search_gate_sha256,
  local_verification_sha256: fields.local_verification_sha256,
  hash_mode: 'lf_normalized_utf8',
  project_ref: 'kcjmkakdhsqplvasgkjv',
  linked_project_ref_check: 'required',
  function_name: 'admin-api',
  pre_function_id: '1ca7655a-e504-416f-9173-750016e79b73',
  pre_function_version: '53',
  pre_function_updated_at: '1784280647363',
  pre_function_verify_jwt: 'false',
  pre_function_ezbr_sha256: 'ba80ddb3b4c156f2aef9db1c67452fffa71a293c988d538b947f7e7c54026f38',
  pre_mcp_search_id: 'ce1f7353-c5e7-4c8c-aeac-75d1f4df5a43',
  pre_mcp_search_version: '39',
  pre_mcp_search_updated_at: '1784045797971',
  schema_policy: 'management_api_read_only_phase_a_exact',
  database_health_policy: 'read_only_statement_timeouts_1000_1000_1000_2000',
  rollup_backlog_policy: 'measure_at_execution_no_holes_max_120',
  rollup_refresh_days_max: '120',
  rollup_refresh_confirmation_calls: '1',
  v2_routes: 'activity_overview_search_audience',
  v2_windows: '1d_7d_30d_custom',
  v2_cache_ttl_ms: '30000',
  v2_warm_request_limit_ms: '5000',
  phase_a_queue_24h_p95_limit_ms: '1500',
  phase_a_queue_all_cold_p95_limit_ms: '1300',
  phase_a_queue_all_warm_p95_limit_ms: '1000',
  phase_a_queue_samples_each: '20',
  candidate_deployments_authorized: '1',
  conditional_rollback_deployments_authorized: '1',
  migration_changes_authorized: 'false',
  mcp_search_changes_authorized: 'false',
  railway_changes_authorized: 'false',
  storage_changes_authorized: 'false',
  npm_publication_authorized: 'false',
});

for (const field of [
  'implementation_tree',
  'rollback_tree',
  'runner_sha256',
  'verifier_sha256',
  'database_gate_sha256',
  'v2_live_gate_sha256',
  'phase_a_live_gate_sha256',
  'inventory_capture_sha256',
  'credential_helper_sha256',
  'credential_test_sha256',
  'admin_api_sha256',
  'v2_helper_sha256',
  'v2_api_gate_sha256',
  'v2_helper_gate_sha256',
  'phase_a_api_gate_sha256',
  'phase_a_metrics_gate_sha256',
  'phase_a_cache_gate_sha256',
  'phase_b_gate_sha256',
  'phase_b_browser_gate_sha256',
  'railway_gate_sha256',
  'search_gate_sha256',
  'local_verification_sha256',
]) {
  assert.match(fields[field], /^[0-9a-f]{40,64}$/, `${field} is malformed.`);
}

const textHashes = [
  ['scripts/run-admin-dashboard-v2-release.ps1', 'runner_sha256'],
  ['scripts/verify-admin-dashboard-v2-release-packet.mjs', 'verifier_sha256'],
  ['scripts/verify-admin-dashboard-v2-database.mjs', 'database_gate_sha256'],
  ['scripts/verify-admin-dashboard-v2-live.mjs', 'v2_live_gate_sha256'],
  ['scripts/verify-admin-dashboard-phase-a-admin-api-live.mjs', 'phase_a_live_gate_sha256'],
  ['scripts/capture-admin-dashboard-phase-a-admin-api-inventory.ps1', 'inventory_capture_sha256'],
  ['scripts/admin-dashboard-release-credentials.ps1', 'credential_helper_sha256'],
  ['scripts/verify-admin-dashboard-release-credentials.ps1', 'credential_test_sha256'],
  ['supabase/functions/admin-api/index.ts', 'admin_api_sha256'],
  ['lib/admin-dashboard-v2.js', 'v2_helper_sha256'],
  ['scripts/verify-admin-dashboard-v2-api.mjs', 'v2_api_gate_sha256'],
  ['scripts/verify-admin-dashboard-v2-helpers.mjs', 'v2_helper_gate_sha256'],
  ['scripts/verify-admin-dashboard-phase-a-api.mjs', 'phase_a_api_gate_sha256'],
  ['scripts/verify-admin-dashboard-phase-a-metrics.mjs', 'phase_a_metrics_gate_sha256'],
  ['scripts/verify-admin-dashboard-phase-a-cache.mjs', 'phase_a_cache_gate_sha256'],
  ['scripts/verify-admin-dashboard-phase-b.mjs', 'phase_b_gate_sha256'],
  ['scripts/verify-admin-dashboard-phase-b-browser.mjs', 'phase_b_browser_gate_sha256'],
  ['scripts/verify-admin-dashboard-phase-a-railway-live.mjs', 'railway_gate_sha256'],
  ['scripts/verify-admin-dashboard-phase-a-search-health.mjs', 'search_gate_sha256'],
  ['references/verification/admin-dashboard-v2-release-local-verification-2026-07-17.json',
    'local_verification_sha256'],
];
for (const [path, field] of textHashes) {
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

const rollbackSource = normalizedText(execFileSync(
  'git',
  ['show', `${fields.rollback_revision}:supabase/functions/admin-api/index.ts`],
  { encoding: 'utf8' },
));
assert.equal(sha256(rollbackSource), fields.rollback_index_sha256);

const implementationSource = normalizedText(execFileSync(
  'git',
  ['show', `${fields.implementation_revision}:supabase/functions/admin-api/index.ts`],
  { encoding: 'utf8' },
));
assert.equal(sha256(implementationSource), fields.admin_api_sha256);

const implementationHelper = normalizedText(execFileSync(
  'git',
  ['show', `${fields.implementation_revision}:lib/admin-dashboard-v2.js`],
  { encoding: 'utf8' },
));
assert.equal(sha256(implementationHelper), fields.v2_helper_sha256);

const changedPaths = execFileSync(
  'git',
  ['diff', '--name-only', `${fields.rollback_revision}..${fields.implementation_revision}`],
  { encoding: 'utf8' },
).trim().split(/\r?\n/).filter(Boolean);
for (const prefix of [
  'supabase/functions/mcp-search/',
  'supabase/migrations/',
  'mcp/',
]) {
  assert.equal(
    changedPaths.some((path) => path.startsWith(prefix)),
    false,
    `Implementation revision changes a prohibited path: ${prefix}`,
  );
}

const runner = normalizedText(readFileSync('scripts/run-admin-dashboard-v2-release.ps1', 'utf8'));
assert.equal((runner.match(/& supabase functions deploy \$FunctionName/g) || []).length, 1);
assert.match(runner, /--project-ref \$ProjectRef --no-verify-jwt --use-api --workdir \$sourcePath/);
assert.match(runner, /-Revision \$script:Packet\.implementation_revision/);
assert.match(runner, /-Revision \$script:Packet\.rollback_revision/);
assert.match(runner, /if \(\$candidateToRollback\)/);
assert.match(runner, /Assert-LinkedProject/);
assert.match(runner, /-Name 'mcp-search'/);
assert.match(runner, /mcp-search version changed during the admin-api release/);
assert.equal(runner.includes('Read-Host'), false, 'Release runner must not prompt.');
assert.equal(runner.includes('ApprovalFingerprint'), false, 'Release runner must not export approval ceremony.');
assert.equal(/supabase\s+functions\s+deploy\s+mcp-search/i.test(runner), false);
for (const prohibited of [
  /supabase\s+(?:db|migration|link|secrets?)\b/i,
  /supabase\s+functions\s+delete/i,
  /npm\s+publish/i,
  /\brailway\s+(?:up|link|variables|service|environment)\b/i,
]) {
  assert.equal(prohibited.test(runner), false, `Runner contains prohibited command: ${prohibited}`);
}

const databaseGate = normalizedText(readFileSync('scripts/verify-admin-dashboard-v2-database.mjs', 'utf8'));
assert.match(databaseGate, /begin read only;/i);
assert.match(databaseGate, /statement_timeout = '3000ms'/i);
assert.match(databaseGate, /pending_on_or_before_latest_complete_day/);
assert.match(databaseGate, /SUPABASE_ACCESS_TOKEN/);
for (const prohibited of [
  /\binsert\s+into\b/i,
  /\bupdate\s+public\./i,
  /\bdelete\s+from\b/i,
  /\bdrop\s+(?:table|index|function)\b/i,
  /\balter\s+table\b/i,
  /\bcreate\s+(?:table|index|function)\b/i,
]) {
  assert.equal(prohibited.test(databaseGate), false, `Database gate is not read-only: ${prohibited}`);
}

const v2LiveGate = normalizedText(readFileSync('scripts/verify-admin-dashboard-v2-live.mjs', 'utf8'));
for (const endpoint of ['/v2/activity', '/v2/overview', '/v2/search', '/v2/audience']) {
  assert.ok(v2LiveGate.includes(endpoint), `V2 live gate does not check ${endpoint}.`);
}
for (const window of ['window=1d', 'window=7d', 'window=30d', 'window=custom']) {
  assert.ok(v2LiveGate.includes(window), `V2 live gate does not check ${window}.`);
}
assert.match(v2LiveGate, /Warm \$\{name\} request took/);
assert.match(v2LiveGate, /x-admin-secret/);
assert.equal(/\bmethod:\s*['"]POST['"]/.test(v2LiveGate), false, 'V2 live gate must be read-only.');

const localVerification = JSON.parse(
  readFileSync('references/verification/admin-dashboard-v2-release-local-verification-2026-07-17.json', 'utf8'),
);
assert.equal(localVerification.status, 'ok');
assert.equal(localVerification.project_ref, fields.project_ref);
assert.equal(localVerification.implementation_revision, fields.implementation_revision);
assert.equal(localVerification.database_preparation.status, 'ok');
assert.equal(localVerification.database_preparation.mutations, 0);
assert.equal(localVerification.checks.deno, 'pass');
assert.equal(localVerification.checks.v2_helpers, 'pass');
assert.equal(localVerification.checks.v2_api, 'pass');
assert.equal(localVerification.checks.phase_a_regression, 'pass');
assert.equal(localVerification.checks.phase_b_browser, 'pass');
assert.equal(localVerification.checks.powershell_parser, 'pass');
assert.equal(localVerification.checks.credential_resolution, 'pass');

console.log(JSON.stringify({
  status: 'ok',
  release_fingerprint: expectedFingerprint,
  implementation_revision: fields.implementation_revision,
  rollback_revision: fields.rollback_revision,
  pre_function: {
    id: fields.pre_function_id,
    version: Number(fields.pre_function_version),
    updated_at: fields.pre_function_updated_at,
    verify_jwt: false,
  },
  routes: fields.v2_routes.split('_'),
  windows: fields.v2_windows.split('_'),
  mutations: {
    admin_api_candidate_deployments: 1,
    conditional_admin_api_rollback_deployments: 1,
    migration: 0,
    mcp_search: 0,
    railway: 0,
    storage: 0,
    npm_publication: 0,
  },
}, null, 2));
