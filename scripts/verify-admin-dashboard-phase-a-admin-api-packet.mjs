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
const preflightClassifierPath = 'scripts/admin-dashboard-admin-api-preflight-classifier.mjs';
const preflightClassifierTestPath = 'scripts/verify-admin-dashboard-phase-a-admin-api-preflight-classifier.mjs';
const preflightLiveTestPath = 'scripts/verify-admin-dashboard-phase-a-admin-api-preflight-live.mjs';
const railwayLiveGatePath = 'scripts/verify-admin-dashboard-phase-a-railway-live.mjs';
const databaseHealthSqlPath = 'scripts/sql/admin-dashboard-phase-a-measured-health.sql';
const databaseHealthParserPath = 'scripts/admin-dashboard-phase-a-db-health-parser.mjs';
const databaseHealthParserTestPath = 'scripts/verify-admin-dashboard-phase-a-db-health-parser.mjs';
const searchHealthPath = 'scripts/verify-admin-dashboard-phase-a-search-health.mjs';
const searchHealthLocalTestPath = 'scripts/verify-admin-dashboard-phase-a-search-health-local.mjs';
const localVerificationPath = 'references/verification/admin-dashboard-phase-a-admin-api-recovery-2y-local-verification-2026-07-17.json';
const inventoryPath = 'references/verification/admin-dashboard-phase-a-admin-api-recovery-2y-inventory-2026-07-17.json';
const priorAttempt2vPath = 'references/verification/admin-dashboard-phase-a-admin-api-recovery-2v-attempt-1-2026-07-17.json';
const priorAttempt2wPath = 'references/verification/admin-dashboard-phase-a-admin-api-recovery-2w-attempt-1-2026-07-17.json';
const priorLive2xPath = 'references/verification/admin-dashboard-phase-a-admin-api-recovery-2x-live-2026-07-17.json';
const priorRollback2xPath = 'references/verification/admin-dashboard-phase-a-admin-api-recovery-2x-rollback-2026-07-17.json';
const railwayCompletionPath = 'references/verification/admin-dashboard-phase-a-railway-protection-recovery-completion-2026-07-16.json';
const source = normalizedText(readFileSync(sourcePath, 'utf8'));
assert.equal(source.endsWith('\n'), true, 'Fingerprint source must end with one LF.');
assert.equal(sha256(source), expectedFingerprint, 'Approval fingerprint does not match the source.');

const fields = Object.fromEntries(source.trimEnd().split('\n').map((line) => {
  const separator = line.indexOf('=');
  assert.ok(separator > 0, `Malformed fingerprint line: ${line}`);
  return [line.slice(0, separator), line.slice(separator + 1)];
}));

assert.deepEqual(fields, {
  packet: 'admin_dashboard_phase_a_admin_api_recovery_2y',
  implementation_revision: 'f12fbb56807e9aec9a4bc02348de26c485467ad0',
  implementation_tree: 'ec786e919c7a42ce641f6d1853832b156fafba6a',
  rollback_revision: fields.rollback_revision,
  rollback_tree: fields.rollback_tree,
  runner_sha256: fields.runner_sha256,
  verifier_sha256: fields.verifier_sha256,
  live_gate_sha256: fields.live_gate_sha256,
  preflight_classifier_sha256: fields.preflight_classifier_sha256,
  preflight_classifier_test_sha256: fields.preflight_classifier_test_sha256,
  preflight_live_test_sha256: fields.preflight_live_test_sha256,
  railway_live_gate_sha256: fields.railway_live_gate_sha256,
  database_health_sql_sha256: fields.database_health_sql_sha256,
  database_health_parser_sha256: fields.database_health_parser_sha256,
  database_health_parser_test_sha256: fields.database_health_parser_test_sha256,
  search_health_gate_sha256: fields.search_health_gate_sha256,
  search_health_local_test_sha256: fields.search_health_local_test_sha256,
  rollup_gate_helper_sha256: fields.rollup_gate_helper_sha256,
  rollup_gate_test_sha256: fields.rollup_gate_test_sha256,
  backlog_sql_sha256: fields.backlog_sql_sha256,
  postflight_sql_sha256: fields.postflight_sql_sha256,
  admin_api_sha256: fields.admin_api_sha256,
  metrics_sha256: fields.metrics_sha256,
  defect_registry_sha256: fields.defect_registry_sha256,
  api_contract_gate_sha256: fields.api_contract_gate_sha256,
  metrics_gate_sha256: fields.metrics_gate_sha256,
  cache_helper_sha256: fields.cache_helper_sha256,
  cache_gate_sha256: fields.cache_gate_sha256,
  local_verification_sha256: fields.local_verification_sha256,
  preparation_railway_live_sha256: fields.preparation_railway_live_sha256,
  preparation_search_health_sha256: fields.preparation_search_health_sha256,
  inventory_sha256: fields.inventory_sha256,
  inventory_capture_sha256: fields.inventory_capture_sha256,
  railway_protection_completion_commit: 'cf21f1675713bf0e6573ac6762fbb719f09a6361',
  railway_protection_completion_sha256: fields.railway_protection_completion_sha256,
  railway_protection_deployment_id: 'd02a8053-0683-4f59-a68f-2ef27b143be1',
  railway_protection_version: '0.4.18',
  railway_protection_max_concurrent: '2',
  railway_protection_max_queued: '8',
  prior_attempt_commit: 'cb1c6de2a4ff61d959bc885077b1489431300cf9',
  prior_backlog_evidence_sha256: fields.prior_backlog_evidence_sha256,
  prior_preflight_evidence_sha256: fields.prior_preflight_evidence_sha256,
  prior_candidate_live_evidence_sha256: fields.prior_candidate_live_evidence_sha256,
  prior_rollback_failure_evidence_sha256: fields.prior_rollback_failure_evidence_sha256,
  prior_packet_revision: '00d9e8221584f9ec43111ed92e5341735851bfc5',
  prior_attempt_2v_sha256: fields.prior_attempt_2v_sha256,
  prior_attempt_2w_sha256: fields.prior_attempt_2w_sha256,
  prior_evidence_2x_commit: '6671eeaeb577d63b60ad8a8535b2e0adfbb97ca6',
  prior_live_2x_sha256: fields.prior_live_2x_sha256,
  prior_rollback_2x_sha256: fields.prior_rollback_2x_sha256,
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
  rollup_backlog_policy: 'measure_at_execution_no_holes_max_120',
  rollup_refresh_days_max: '120',
  rollup_refresh_confirmation_calls: '1',
  rollup_refresh_calls_max: '121',
  rollup_refresh_elapsed_limit_minutes: '20',
  queue_24h_p95_limit_ms: '1500',
  queue_all_p95_limit_ms: '1000',
  queue_cold_samples: '20',
  queue_warm_samples: '20',
  queue_cache_ttl_ms: '30000',
  queue_cache_max_entries: '64',
  legacy_preflight_max_latency_ms: '10000',
  legacy_preflight_request_timeout_ms: '12000',
  legacy_preflight_policy: 'require_healthy_http_200_under_10000ms',
  database_health_policy: 'read_only_three_indexed_1000ms_one_window_2000ms',
  search_health_policy: 'one_warmup_two_measured_strict_lucide_under_2000ms',
  disk_io_banner_policy: 'record_only',
  railway_protection_prerequisite: 'required_live_closed_zero_failures_no_synthetic_calls',
  rollback_environmental_failure_annotation: 'required',
  supabase_candidate_deployments_authorized: '1',
  conditional_rollback_deployments_authorized: '1',
  rollup_refresh_writes_authorized: 'measured_pending_days_up_to_120',
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
  [preflightClassifierPath, 'preflight_classifier_sha256'],
  [preflightClassifierTestPath, 'preflight_classifier_test_sha256'],
  [preflightLiveTestPath, 'preflight_live_test_sha256'],
  [railwayLiveGatePath, 'railway_live_gate_sha256'],
  [databaseHealthSqlPath, 'database_health_sql_sha256'],
  [databaseHealthParserPath, 'database_health_parser_sha256'],
  [databaseHealthParserTestPath, 'database_health_parser_test_sha256'],
  [searchHealthPath, 'search_health_gate_sha256'],
  [searchHealthLocalTestPath, 'search_health_local_test_sha256'],
  ['scripts/admin-dashboard-rollup-refresh-gate.mjs', 'rollup_gate_helper_sha256'],
  ['scripts/verify-admin-dashboard-phase-a-rollup-refresh-gate.mjs', 'rollup_gate_test_sha256'],
  ['scripts/sql/admin-dashboard-phase-a-rollup-backlog.sql', 'backlog_sql_sha256'],
  ['scripts/sql/admin-dashboard-phase-a-recovery-postflight.sql', 'postflight_sql_sha256'],
  ['supabase/functions/admin-api/index.ts', 'admin_api_sha256'],
  ['lib/admin-dashboard-metrics.js', 'metrics_sha256'],
  ['data/admin/known-search-defects.json', 'defect_registry_sha256'],
  ['scripts/verify-admin-dashboard-phase-a-api.mjs', 'api_contract_gate_sha256'],
  ['scripts/verify-admin-dashboard-phase-a-metrics.mjs', 'metrics_gate_sha256'],
  ['lib/bounded-async-cache.js', 'cache_helper_sha256'],
  ['scripts/verify-admin-dashboard-phase-a-cache.mjs', 'cache_gate_sha256'],
  [localVerificationPath, 'local_verification_sha256'],
  ['references/verification/admin-dashboard-phase-a-admin-api-recovery-2v-preparation-railway-live-2026-07-17.json',
    'preparation_railway_live_sha256'],
  ['references/verification/admin-dashboard-phase-a-admin-api-recovery-2v-preparation-search-health-2026-07-17.json',
    'preparation_search_health_sha256'],
  [inventoryPath, 'inventory_sha256'],
  [priorAttempt2vPath, 'prior_attempt_2v_sha256'],
  [priorAttempt2wPath, 'prior_attempt_2w_sha256'],
  [priorLive2xPath, 'prior_live_2x_sha256'],
  [priorRollback2xPath, 'prior_rollback_2x_sha256'],
  ['scripts/capture-admin-dashboard-phase-a-admin-api-inventory.ps1', 'inventory_capture_sha256'],
  [railwayCompletionPath, 'railway_protection_completion_sha256'],
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
assert.equal(inventory.derived_from.rollback_version, 49);
assert.equal(inventory.derived_from.rollback_updated_at, fields.pre_function_updated_at);
assert.equal(inventory.derived_from.strict_legacy_contract, 'pass');
assert.equal(inventory.mutations, 0);

const railwayCompletion = JSON.parse(readFileSync(railwayCompletionPath, 'utf8'));
const railwayLive = railwayCompletion.live_contract.find((entry) => entry && typeof entry === 'object');
assert.equal(railwayCompletion.candidate_deployment_id, fields.railway_protection_deployment_id);
assert.equal(railwayLive?.health?.version, fields.railway_protection_version);
assert.equal(railwayLive?.health?.hosted_search_resilience?.max_concurrent,
  Number(fields.railway_protection_max_concurrent));
assert.equal(railwayLive?.health?.hosted_search_resilience?.max_queued,
  Number(fields.railway_protection_max_queued));
assert.equal(railwayLive?.health?.hosted_search_resilience?.consecutive_failures, 0);
assert.equal(railwayCompletion.rollback_used, false);

assert.equal(
  execFileSync('git', ['rev-parse', fields.prior_attempt_commit], { encoding: 'utf8' }).trim(),
  fields.prior_attempt_commit,
);
for (const [path, field] of [
  ['references/verification/admin-dashboard-phase-a-admin-api-preflight-recovery-backlog-2026-07-16.json', 'prior_backlog_evidence_sha256'],
  ['references/verification/admin-dashboard-phase-a-admin-api-preflight-recovery-preflight-2026-07-16.json', 'prior_preflight_evidence_sha256'],
  ['references/verification/admin-dashboard-phase-a-admin-api-preflight-recovery-live-2026-07-16.json', 'prior_candidate_live_evidence_sha256'],
  ['references/verification/admin-dashboard-phase-a-admin-api-preflight-recovery-rollback-failure-2026-07-16.json', 'prior_rollback_failure_evidence_sha256'],
]) {
  assert.equal(sha256TextFile(path), fields[field], `${path} recovery evidence hash does not match.`);
}

const runner = normalizedText(readFileSync(runnerPath, 'utf8'));
assert.equal((runner.match(/& supabase functions deploy /g) || []).length, 1,
  'Runner must contain one scoped deploy command.');
assert.match(runner, /--project-ref \$ProjectRef --no-verify-jwt --use-api --workdir \$sourcePath/);
assert.match(runner, /-Revision \$script:Packet\.implementation_revision/);
assert.match(runner, /-Revision \$script:Packet\.rollback_revision/);
assert.match(runner, /if \(\$script:CandidateWentLive -and \$script:CandidateFunction\)/);
assert.match(runner, /admin-dashboard-phase-a-recovery-postflight\.sql/);
assert.match(runner, /admin-dashboard-phase-a-rollup-backlog\.sql/);
assert.match(runner, /PGOPTIONS=-c default_transaction_read_only=on/);
assert.match(runner, /pending_on_or_before_latest_complete_day/);
assert.equal(runner.includes('expected_pending_rollup_days'), false,
  'Runner must measure the pending rollup backlog at execution.');
assert.match(runner, /\$refreshDayLimit = \$pendingDayCount/);
assert.match(runner, /pendingDayCount -gt \[int\]\$script:Packet\.rollup_refresh_days_max/);
assert.match(runner, /-MaxRefreshDays \$pendingDayCount/);
assert.match(runner, /-Mode preflight/);
assert.match(runner, /\$PreflightMaxLatencyMs = 10000/);
assert.match(runner, /--preflight-max-latency-ms', "\$PreflightMaxLatencyMs"/);
assert.match(runner, /\[ValidateSet\('visible', 'absent', 'unknown'\)\]/);
assert.match(runner, /\[string\]\$DiskIoBannerObserved = 'unknown'/);
assert.equal(runner.includes('DiskIoWindowConfirmed'), false);
assert.match(runner, /disk_io_banner_is_gate = \$false/);
assert.match(runner, /admin-dashboard-phase-a-measured-health\.sql/);
assert.match(runner, /admin-dashboard-phase-a-db-health-parser\.mjs/);
assert.match(runner, /verify-admin-dashboard-phase-a-search-health\.mjs/);
assert.match(runner, /-Mode preflight[\s\S]*?Invoke-StrictSearchHealth[\s\S]*?Deploy-Revision/);
assert.equal(runner.includes("'degraded_proceed'"), false);
assert.ok(
  runner.indexOf('$preFunction = Get-AdminFunction') <
    runner.indexOf("'scripts/verify-admin-dashboard-phase-a-railway-live.mjs'"),
  'Supabase CLI authentication and function pins must be checked before write-once Railway evidence.',
);
assert.match(runner, /--expect-hosted-search-resilience', 'enabled'/);
assert.match(runner, /'--allow-active'/);
assert.match(runner, /admin_dashboard_phase_a_admin_api_rollback_verification_failure/);
assert.match(runner, /possible_shared_database_degradation/);
assert.match(runner, /service_restoration = 'not_verified'/);
assert.match(runner, /Read-Host 'Supabase database password' -AsSecureString/);
assert.match(runner, /Read-Host 'Supabase ADMIN_SECRET' -AsSecureString/);
assert.match(runner, /Remove-Item Env:PGPASSWORD/);
assert.match(runner, /Remove-Item Env:PHASE_A_ADMIN_SECRET/);
assert.match(runner, /\$LinkedProjectPath = Join-Path \$Root 'supabase\/\.temp\/linked-project\.json'/);
assert.match(runner, /if \("\$\(\$linkedProject\.ref\)" -ne \$ProjectRef\)/);
assert.match(runner, /if \(-not \$poolerUrl\.Contains\(\$ProjectRef\)\)/);
assert.match(runner, /\$querySeparator = if \(\$poolerUrl\.Contains\('\?'\)\) \{ '&' \} else \{ '\?' \}/);
assert.equal(/supabase\s+functions\s+deploy\s+mcp-search/i.test(runner), false,
  'Runner must not deploy mcp-search.');

for (const prohibited of [
  /supabase\s+(?:db|migration|link|secrets?)\b/i,
  /npm\s+publish/i,
  /\brailway\s+(?:up|link|variables|service|environment)\b/i,
  /supabase\s+functions\s+delete/i,
]) {
  assert.equal(prohibited.test(runner), false, `Runner contains prohibited command: ${prohibited}`);
}

const postflight = normalizedText(readFileSync('scripts/sql/admin-dashboard-phase-a-recovery-postflight.sql', 'utf8'));
assert.match(postflight, /begin read only;/i);
assert.match(postflight, /rollback;/i);
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
assert.match(liveGate, /20 \* 60 \* 1000/);
assert.match(liveGate, /refresh-rollups/);
assert.match(liveGate, /--max-refresh-days/);
assert.match(liveGate, /runBoundedRollupRefresh/);
assert.match(liveGate, /measureQueue\([\s\S]*?count = 20[\s\S]*?cacheMode = 'warm'/);
assert.match(liveGate, /withCacheProbe\([\s\S]*?cache_probe=/);
assert.ok(
  liveGate.indexOf('summary.queue_24h = {') < liveGate.indexOf('queue24hCold.p95_ms < 1500'),
  'Cold and warm 24-hour samples must be retained before the performance assertion.',
);
assert.ok(
  liveGate.indexOf('summary.queue_all = {') < liveGate.indexOf('queueAllCold.p95_ms < 1000'),
  'Cold and warm all-time samples must be retained before the performance assertion.',
);
assert.match(liveGate, /queue24hCold\.p95_ms < 1500/);
assert.match(liveGate, /queue24hWarm\.p95_ms < 1500/);
assert.match(liveGate, /queueAllCold\.p95_ms < 1000/);
assert.match(liveGate, /queueAllWarm\.p95_ms < 1000/);
assert.match(liveGate, /window=1d/);
assert.match(liveGate, /window=all/);
assert.match(liveGate, /x-admin-secret/);
assert.match(liveGate, /classifyAdminApiPreflight/);
assert.match(liveGate, /\['preflight', 'legacy', 'candidate'\]/);
assert.match(liveGate, /summary\.status = classification\.outcome === 'healthy' \? 'ok' : 'degraded_proceed'/);
assert.equal(liveGate.includes('mcp-search'), false);
assert.match(liveGate, /AbortSignal\.timeout\(preflightMaxLatencyMs \+ 2_000\)/);

const railwayLiveGate = normalizedText(readFileSync(railwayLiveGatePath, 'utf8'));
assert.match(railwayLiveGate, /const allowActive = process\.argv\.includes\('--allow-active'\)/);
assert.match(railwayLiveGate, /health\.hosted_search\.active >= 0 && health\.hosted_search\.active <= 2/);
assert.match(railwayLiveGate, /health\.hosted_search\.queued >= 0 && health\.hosted_search\.queued <= 8/);
assert.match(railwayLiveGate, /health\.hosted_search\?\.consecutive_failures, 0/);
assert.match(railwayLiveGate, /summary\.synthetic_tool_calls = 0/);

const databaseHealthSql = normalizedText(readFileSync(databaseHealthSqlPath, 'utf8'));
assert.match(databaseHealthSql, /begin read only;/i);
assert.match(databaseHealthSql, /set local statement_timeout = '3000ms';/i);
for (const marker of [
  'PHASE_A_HEALTH|recent_mcp_usage',
  'PHASE_A_HEALTH|recent_search_audit',
  'PHASE_A_HEALTH|latest_rollup_overview',
  'PHASE_A_HEALTH|recent_telemetry_window',
]) {
  assert.ok(databaseHealthSql.includes(marker), `Missing database health marker: ${marker}`);
}
assert.match(databaseHealthSql, /rollback;/i);
for (const prohibited of [
  /\binsert\s+into\b/i,
  /\bupdate\s+public\./i,
  /\bdelete\s+from\b/i,
  /\bdrop\s+(?:table|index|function)\b/i,
  /\balter\s+table\b/i,
  /\bcreate\s+(?:table|index|function)\b/i,
]) {
  assert.equal(prohibited.test(databaseHealthSql), false,
    `Measured database health SQL is not read-only: ${prohibited}`);
}

const searchHealth = normalizedText(readFileSync(searchHealthPath, 'utf8'));
assert.match(searchHealth, /query: 'calendar'/);
assert.match(searchHealth, /library: 'lucide'/);
assert.match(searchHealth, /library_mode: 'strict'/);
assert.match(searchHealth, /limit: 3/);
assert.match(searchHealth, /channel: 'internal_test'/);
assert.match(searchHealth, /environment: 'production'/);
assert.match(searchHealth, /readPositiveInteger\('measured-count', 2, 2, 5\)/);
assert.match(searchHealth, /readPositiveInteger\('latency-limit-ms', 2000, 1, 10000\)/);
assert.match(searchHealth, /measurement\.latency_ms < latencyLimitMs/);

execFileSync('node', [databaseHealthParserTestPath], {
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'inherit'],
});
execFileSync('node', [searchHealthLocalTestPath], {
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'inherit'],
});

execFileSync('node', [preflightClassifierTestPath], {
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'inherit'],
});
execFileSync('node', [preflightLiveTestPath], {
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'inherit'],
});

const backlogSql = normalizedText(readFileSync('scripts/sql/admin-dashboard-phase-a-rollup-backlog.sql', 'utf8'));
assert.match(backlogSql, /begin read only;/i);
assert.match(backlogSql, /rollback;/i);
assert.match(backlogSql, /pending_day_count/i);
for (const prohibited of [
  /\binsert\s+into\b/i,
  /\bupdate\s+public\./i,
  /\bdelete\s+from\b/i,
  /\bdrop\s+(?:table|index|function)\b/i,
  /\balter\s+table\b/i,
  /\bcreate\s+(?:table|index|function)\b/i,
]) {
  assert.equal(prohibited.test(backlogSql), false, `Backlog check is not read-only: ${prohibited}`);
}

execFileSync('node', ['scripts/verify-admin-dashboard-phase-a-rollup-refresh-gate.mjs'], {
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'inherit'],
});

const adminApi = normalizedText(readFileSync('supabase/functions/admin-api/index.ts', 'utf8'));
assert.match(adminApi, /segments\[2\] === 'refresh-rollups'/);
assert.match(adminApi, /segments\[2\] === 'dashboard'/);
assert.match(adminApi, /query_origin, requested_limit[\s\S]*?client_ip_public/);
assert.match(adminApi, /QUERY_QUEUE_CACHE_TTL_MS = 30_000/);
assert.match(adminApi, /QUERY_QUEUE_CACHE_MAX_ENTRIES = 64/);
assert.match(adminApi, /queryQueueCache\.getOrCreate/);
assert.match(adminApi, /fetchSearchEvidenceRows\([\s\S]*?fetchAllQueryReviews/);

execFileSync('node', ['scripts/verify-admin-dashboard-phase-a-cache.mjs'], {
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'inherit'],
});

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
    rollup_backlog_policy: fields.rollup_backlog_policy,
    rollup_refresh_days_max: 120,
    rollup_refresh_confirmation_calls: 1,
    rollup_refresh_calls_max: 121,
    rollup_refresh_elapsed_limit_minutes: 20,
    legacy_preflight_max_latency_ms: 10000,
    database_health_indexed_limit_ms: 1000,
    database_health_window_limit_ms: 2000,
    strict_search_measured_count: 2,
    strict_search_latency_limit_ms: 2000,
    queue_24h_p95_limit_ms: 1500,
    queue_all_p95_limit_ms: 1000,
    queue_cold_samples: 20,
    queue_warm_samples: 20,
    queue_cache_ttl_ms: 30000,
    queue_cache_max_entries: 64,
  },
  mutations: {
    admin_api_candidate_deployments: 1,
    conditional_admin_api_rollback_deployments: 1,
    rollup_refresh_writes: 'measured_pending_days_up_to_120',
    migration: 0,
    mcp_search: 0,
    railway: 0,
    storage: 0,
    npm_publication: 0,
  },
}, null, 2));
