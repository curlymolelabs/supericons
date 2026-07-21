import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

function readArgument(name, fallback = null) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

function normalizedText(value) {
  return String(value).replace(/\r\n?/g, '\n');
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function sha256TextFile(path) {
  return sha256(normalizedText(readFileSync(path, 'utf8')));
}

function gitText(revision, path) {
  return execFileSync('git', ['show', `${revision}:${path}`], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
}

function run(command, args) {
  execFileSync(command, args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
    maxBuffer: 64 * 1024 * 1024,
  });
}

const manifestPath =
  'docs/si-v2/search/reviews/search-v2-beta3-shared-grouped-release-manifest-2026-07-21.json';
const expectedManifestHash = readArgument('--manifest-hash');
const skipNestedReleaseSimulations =
  process.argv.includes('--skip-nested-release-simulations');
assert.match(
  expectedManifestHash || '',
  /^[0-9a-f]{64}$/,
  'Provide --manifest-hash with 64 lowercase hex characters.',
);
if (skipNestedReleaseSimulations) {
  assert.equal(
    process.env.SUPERICONS_BETA3_NESTED_RELEASE_SIMULATION === '1'
      || process.env.SUPERICONS_BETA3_RELEASE_RUNNER === '1',
    true,
    'Nested release simulations may be skipped only by the committed rollback harness or release runner.',
  );
}

const manifestText = normalizedText(readFileSync(manifestPath, 'utf8'));
const manifestHash = sha256(manifestText);
assert.equal(manifestHash, expectedManifestHash, 'The release manifest hash does not match.');
const manifest = JSON.parse(manifestText);

assert.equal(manifest.schema_version, 1);
assert.equal(manifest.release, 'search-v2-beta3-shared-grouped-endpoint');
assert.equal(manifest.attempt, 4);
assert.equal(manifest.packet_revision, 7);
assert.equal(
  manifest.supersedes_manifest_sha256,
  'e35a819f62b8a4007e2b5f3587a5c7a118d13bc1466923d805aaa85257cc25c5',
);
assert.equal(manifest.prior_attempt.status, 'rolled_back');
assert.equal(manifest.prior_attempt.grouped_function_removed, true);
assert.equal(manifest.prior_attempt.shared_candidate_rpc_removed, true);
assert.equal(manifest.prior_attempt.stable_function_mutated, false);
assert.equal(manifest.prior_attempt.one_slot_p95_ms, 6238);
assert.equal(manifest.project_ref, 'kcjmkakdhsqplvasgkjv');
assert.equal(manifest.function_name, 'mcp-search-grouped');
assert.equal(manifest.stable_function.name, 'mcp-search');
assert.equal(manifest.stable_function.verify_jwt, false);
assert.equal(manifest.stable_function.status, 'ACTIVE');
assert.equal(manifest.grouped_function_present_before, false);
assert.equal(manifest.deployments_authorized, 1);
assert.equal(manifest.conditional_deletions_authorized, 1);
assert.equal(manifest.stable_function_deployments_authorized, 0);
assert.equal(manifest.npm_publications_authorized, 0);
assert.equal(manifest.shared_candidate_rpc.migration_version, '20260714190000');
assert.equal(
  manifest.shared_candidate_rpc.migration_path,
  'supabase/migrations/20260714190000_search_v2_shared_recommendation_candidates.sql',
);
assert.equal(
  manifest.shared_candidate_rpc.migration_sha256,
  'f22d209938aaafa685e4f1ab074b8e9d3802de503a91d9d3d24b2c05ef207ae6',
);
assert.equal(manifest.shared_candidate_rpc.present_before, false);
assert.equal(manifest.shared_candidate_rpc.migration_record_present_before, false);
assert.equal(manifest.database_mutations_authorized.shared_candidate_rpc_creations, 1);
assert.equal(manifest.database_mutations_authorized.migration_history_inserts, 1);
assert.equal(manifest.database_mutations_authorized.conditional_shared_candidate_rpc_drops, 1);
assert.equal(manifest.database_mutations_authorized.conditional_migration_history_deletes, 1);
assert.equal(manifest.live_gates.shared_candidate_pipeline, true);
assert.equal(manifest.live_gates.shared_candidate_rpc_call_count, 1);
assert.equal(manifest.live_gates.maximum_logical_queries, 40);
assert.equal(manifest.live_gates.in_band_stage_timing, true);
assert.equal(manifest.live_gates.worker_affinity_assumed, false);
assert.equal(
  manifest.live_gates.measurement_strategy,
  'actual_routed_samples_with_worker_classification',
);
assert.equal(manifest.live_gates.worker_timing_recorded, true);
assert.equal(manifest.live_gates.worker_cohorts_separated, true);
assert.equal(manifest.live_gates.all_routed_samples_counted, true);
assert.equal(manifest.live_gates.rate_window_reset_ms, 65000);
assert.equal(manifest.live_gates.failed_samples_preserved, true);
assert.equal(manifest.live_gates.mcp_grouped_client_stable_fallback_disabled, true);
assert.equal(manifest.live_gates.fr47_stable_fallback_disabled, true);
assert.equal(manifest.live_gates.rollback_function_id_pinned, true);
assert.equal(manifest.live_gates.rollback_shared_candidate_definition_pinned, true);
assert.equal(manifest.live_gates.committed_negative_path_harness, true);
assert.equal(manifest.live_gates.committed_rollback_simulation, true);
assert.equal(manifest.live_gates.committed_measurement_schedule_harness, true);
assert.equal(manifest.live_gates.committed_database_manager_fixture, true);
assert.equal(manifest.live_gates.committed_concurrent_run_fixture, true);
assert.equal(manifest.live_gates.cross_worktree_release_lock, true);
assert.equal(manifest.live_gates.cross_worktree_simulation_lock, true);
assert.equal(manifest.live_gates.release_lock_actual_owner_pid, true);
assert.equal(manifest.live_gates.live_lock_cleanup_refused, true);
assert.equal(manifest.live_gates.abandoned_lock_list_and_cleanup, true);
assert.equal(manifest.live_gates.simulation_evidence_run_owned, true);
assert.equal(manifest.live_gates.lock_release_requires_acquisition, true);
assert.equal(manifest.live_gates.preheld_lock_errors_preserved, true);
assert.equal(manifest.live_gates.unique_release_workspaces, true);
assert.equal(manifest.live_gates.database_run_ownership, true);
assert.equal(manifest.live_gates.dry_run_skips_nested_release_simulations, true);
assert.equal(manifest.live_gates.indexed_candidate_collection, true);
assert.equal(manifest.live_gates.preexpanded_grouped_queries, true);
assert.equal(manifest.live_gates.production_benchmark_exact_parity, true);
assert.equal(manifest.live_gates.production_benchmark_release_lock, true);
assert.equal(manifest.live_gates.production_benchmark_database_advisory_lock, true);
assert.equal(manifest.live_gates.database_apply_rollback_advisory_lock, true);
assert.equal(manifest.live_gates.docker_smoke_unique_run_owned_container, true);
assert.equal(manifest.live_gates.concurrent_docker_smoke_fixture, true);
assert.equal(manifest.live_gates.docker_readiness_diagnostics, true);
assert.equal(manifest.live_gates.concurrency_harnesses_top_level_only, true);
assert.equal(manifest.live_gates.production_benchmark_v4_p95_ms_max, 500);
assert.equal(manifest.live_gates.production_benchmark_speedup_minimum, 3);
assert.equal(manifest.live_gates.one_slot_actual_routed_p95_ms_max, 3000);
assert.equal(manifest.live_gates.ten_slot_actual_routed_p95_ms_max, 10000);
assert.equal(manifest.live_gates.twenty_slot_actual_routed_p95_ms_max, 15000);
assert.match(manifest.source_revision, /^[0-9a-f]{40}$/);
assert.match(manifest.source_tree, /^[0-9a-f]{40}$/);
assert.match(manifest.stable_route_blob, /^[0-9a-f]{40}$/);

assert.equal(
  execFileSync('git', ['rev-parse', manifest.source_revision], { encoding: 'utf8' }).trim(),
  manifest.source_revision,
);
assert.equal(
  execFileSync('git', ['rev-parse', `${manifest.source_revision}^{tree}`], {
    encoding: 'utf8',
  }).trim(),
  manifest.source_tree,
);
assert.equal(
  execFileSync(
    'git',
    ['rev-parse', `${manifest.source_revision}:supabase/functions/mcp-search/index.ts`],
    { encoding: 'utf8' },
  ).trim(),
  manifest.stable_route_blob,
);
assert.equal(
  execFileSync('git', ['rev-parse', 'main:supabase/functions/mcp-search/index.ts'], {
    encoding: 'utf8',
  }).trim(),
  manifest.stable_route_blob,
  'The stable mcp-search source must be byte-identical to main.',
);

for (const entry of manifest.source_files) {
  assert.match(entry.sha256, /^[0-9a-f]{64}$/);
  assert.equal(
    sha256(normalizedText(gitText(manifest.source_revision, entry.path))),
    entry.sha256,
    `${entry.path} does not match the pinned source revision.`,
  );
}
for (const entry of manifest.packet_files) {
  assert.match(entry.sha256, /^[0-9a-f]{64}$/);
  assert.equal(sha256TextFile(entry.path), entry.sha256, `${entry.path} hash does not match.`);
}

const sourceGraphPaths = manifest.source_files.map((entry) => entry.path);
const sourceGraphDiff = execFileSync(
  'git',
  ['diff', '--name-only', manifest.source_revision, '--', ...sourceGraphPaths],
  { encoding: 'utf8' },
).trim();
assert.equal(sourceGraphDiff, '', 'Packet commits must not alter the pinned deployment source graph.');
assert.equal(JSON.parse(readFileSync('mcp/package.json', 'utf8')).version, '0.4.19-beta.2');

const paths = {
  runner: 'scripts/run-search-v2-beta3-grouped-release.ps1',
  packet: 'scripts/verify-search-v2-beta3-grouped-packet.mjs',
  live: 'scripts/verify-search-v2-beta3-grouped-live.mjs',
  latency: 'scripts/measure-search-v2-beta3-fr47-live.mjs',
  negative: 'scripts/verify-search-v2-beta3-grouped-negative-paths.mjs',
  rollback: 'scripts/verify-search-v2-beta3-grouped-rollback-simulation.mjs',
  schedule: 'scripts/verify-search-v2-beta3-fr47-measurement-schedule.mjs',
  databaseManager: 'scripts/manage-search-v2-shared-candidate-rpc.mjs',
  databaseFixture: 'scripts/verify-search-v2-shared-candidate-rpc-manager.mjs',
  databaseSmoke: 'scripts/verify-search-v2-shared-recommendation-migration-smoke.mjs',
  databaseSmokeConcurrency:
    'scripts/verify-search-v2-shared-recommendation-migration-smoke-concurrency.mjs',
  productionBenchmark: 'scripts/verify-search-v2-shared-candidate-rpc-production-benchmark.mjs',
  productionBenchmarkLock:
    'scripts/verify-search-v2-shared-candidate-rpc-production-benchmark-lock.mjs',
  releaseLock: 'scripts/manage-search-v2-release-lock.mjs',
  concurrentRun: 'scripts/verify-search-v2-beta3-concurrent-run-lock.mjs',
};
const runner = normalizedText(readFileSync(paths.runner, 'utf8'));
const live = normalizedText(readFileSync(paths.live, 'utf8'));
const latency = normalizedText(readFileSync(paths.latency, 'utf8'));
const rollback = normalizedText(readFileSync(paths.rollback, 'utf8'));
const schedule = normalizedText(readFileSync(paths.schedule, 'utf8'));
const databaseManager = normalizedText(readFileSync(paths.databaseManager, 'utf8'));
const databaseFixture = normalizedText(readFileSync(paths.databaseFixture, 'utf8'));
const databaseSmoke = normalizedText(readFileSync(paths.databaseSmoke, 'utf8'));
const databaseSmokeConcurrency = normalizedText(
  readFileSync(paths.databaseSmokeConcurrency, 'utf8'),
);
const productionBenchmark = normalizedText(readFileSync(paths.productionBenchmark, 'utf8'));
const productionBenchmarkLock = normalizedText(
  readFileSync(paths.productionBenchmarkLock, 'utf8'),
);
const sharedMigration = normalizedText(readFileSync(manifest.shared_candidate_rpc.migration_path, 'utf8'));
const groupedRoute = normalizedText(readFileSync('supabase/functions/mcp-search-grouped/index.ts', 'utf8'));
const releaseLock = normalizedText(readFileSync(paths.releaseLock, 'utf8'));
const concurrentRun = normalizedText(readFileSync(paths.concurrentRun, 'utf8'));

assert.match(runner, /\$FunctionName = 'mcp-search-grouped'/);
assert.match(runner, /\$StableFunctionName = 'mcp-search'/);
assert.equal((runner.match(/supabase functions deploy \$FunctionName/g) || []).length, 1);
assert.equal((runner.match(/supabase functions delete \$FunctionName/g) || []).length, 1);
assert.equal(/supabase functions deploy \$StableFunctionName/.test(runner), false);
assert.equal(/supabase functions delete \$StableFunctionName/.test(runner), false);
assert.equal(/npm\s+publish/i.test(runner), false);
assert.match(runner, /--action', 'preflight'/);
assert.match(runner, /--action', 'apply'/);
assert.match(runner, /--action', 'inspect'/);
assert.match(runner, /--action', 'verify'/);
assert.match(runner, /--action', 'rollback'/);
assert.ok(
  runner.indexOf("'--action', 'apply'") < runner.indexOf('supabase functions deploy $FunctionName'),
  'The shared candidate RPC must be verified before endpoint deployment.',
);
assert.ok(
  runner.indexOf('$endpointRollback = Remove-GroupedFunctionForRollback')
    < runner.lastIndexOf("'--action', 'rollback'"),
  'Endpoint rollback must run before the database dependency rollback.',
);
assert.match(runner, /blocked_unverified_function/);
assert.match(runner, /blocked_mismatched_function/);
assert.match(runner, /blocked_unverified_state/);
assert.match(runner, /retained_for_endpoint_dependency/);
assert.match(runner, /The grouped function id changed during live verification/);
assert.match(runner, /The shared candidate RPC changed during live verification/);
assert.match(runner, /stable_function_mutated = \$false/);
assert.match(runner, /git status --porcelain=v1 --untracked-files=no/);
assert.match(runner, /manage-search-v2-release-lock\.mjs/);
assert.match(runner, /--owner-process-id', "\$PID"/);
assert.match(runner, /\$RunId = \[guid\]::NewGuid/);
assert.match(runner, /--skip-nested-release-simulations/);
assert.match(runner, /SUPERICONS_BETA3_RELEASE_RUNNER/);
assert.match(runner, /The unique release workspace already exists/);
assert.equal(runner.includes('search-v2-beta3-shared-grouped-release-20260721'), false);
assert.match(runner, /SimulationEvidenceDirectory/);
assert.match(runner, /SUPERICONS_BETA3_ROLLBACK_SIMULATION/);
assert.match(runner, /BETA3_SHIM_BIN_DIR/);
assert.match(runner, /The simulation evidence directory is outside its unique rollback workspace/);
assert.match(runner, /Simulation mode requires the committed node shim/);
assert.match(runner, /Simulation mode requires the committed npx shim/);
assert.match(runner, /'-C', \$RepositoryRoot/);
assert.match(runner, /Push-Location \$Destination/);
assert.match(runner, /'-xf', "\.\.\/\$archiveFileName"/);
assert.equal(runner.includes('Read-Host'), false);
assert.equal(runner.includes('--keepalive-interval-ms'), false);
assert.match(runner, /search-v2-beta3-indexed-grouped-live-2026-07-21\.json/);
assert.match(runner, /search-v2-beta3-indexed-fr47-live-2026-07-21\.json/);

assert.match(databaseManager, /si_search_icon_candidates_v4\(jsonb,text,integer\)/);
assert.match(databaseManager, /Shared and batched candidate RPC results differ/);
assert.match(databaseManager, /PUBLIC can execute the shared candidate RPC/);
assert.match(databaseManager, /begin;[\s\S]*commit;/);
assert.match(databaseManager, /pg_advisory_xact_lock\(hashtextextended/);
assert.match(databaseManager, /Rollback refused because the shared candidate RPC definition changed/);
assert.match(databaseManager, /drop function public\.si_search_icon_candidates_v4/);
assert.match(databaseManager, /delete from supabase_migrations\.schema_migrations/);
assert.match(databaseManager, /supericons_release_owner:/);
assert.match(databaseManager, /present_other_owner/);
assert.match(databaseManager, /belongs to another release run/);
assert.match(databaseManager, /statements\[2\] = '\$\{ownerMarker\}'/);
assert.match(databaseFixture, /mismatched_definition_rollback_refused/);
assert.match(databaseFixture, /mismatched_owner_rollback_refused/);
assert.match(databaseFixture, /function_and_migration_history_rolled_back_together/);
assert.match(databaseSmoke, /exact_batched_result_parity/);
assert.match(databaseSmoke, /randomUUID\(\)/);
assert.match(databaseSmoke, /com\.supericons\.search-v2-smoke-run/);
assert.match(databaseSmoke, /containerDetails\(\)/);
assert.match(databaseSmoke, /removeOwnedContainer\(\)/);
assert.match(databaseSmoke, /Docker Desktop must be running/);
assert.match(databaseSmoke, /did not become ready within 60 seconds/);
assert.equal(databaseSmoke.includes("docker', ['rm', '-f', containerName"), false);
assert.match(databaseSmokeConcurrency, /Promise\.all\(\[runSmoke\(\), runSmoke\(\)\]\)/);
assert.match(databaseSmokeConcurrency, /unique_container_names/);
assert.match(databaseSmokeConcurrency, /owner_checked_cleanup/);
assert.match(productionBenchmark, /exact_result_parity: true/);
assert.match(productionBenchmark, /v4_absent_before_and_after: true/);
assert.match(productionBenchmark, /speedup >= 3/);
assert.match(productionBenchmark, /indexedP95 <= 500/);
assert.match(productionBenchmark, /search-v2-beta3-shared-grouped/);
assert.match(productionBenchmark, /--owner-process-id/);
assert.match(productionBenchmark, /pg_advisory_xact_lock\(hashtextextended/);
assert.match(productionBenchmark, /finally \{/);
assert.match(productionBenchmarkLock, /preheld_release_lock_blocked_benchmark/);
assert.match(productionBenchmarkLock, /production_api_requests: apiRequests/);
assert.match(sharedMigration, /candidate_ids as/);
assert.match(sharedMigration, /join public\.icon_catalog c\s+on c\.search_document @@ q\.query_ts/);
assert.match(sharedMigration, /join public\.icon_search_public_registry_metadata r\s+on r\.search_document @@ q\.query_ts/);
assert.match(groupedRoute, /expandCandidateQueryVariants:\s*false/);
assert.match(releaseLock, /mkdirSync\(lockPath\)/);
assert.match(releaseLock, /already held/);
assert.match(releaseLock, /belongs to another run and was not released/);
assert.match(releaseLock, /cleanup-stale/);
assert.match(releaseLock, /action === 'list'/);
assert.match(releaseLock, /ownerProcessId/);
assert.match(releaseLock, /processIsAlive/);
assert.match(releaseLock, /Only version 2 locks have trustworthy owner PIDs/);
assert.match(concurrentRun, /A concurrent release runner must be refused/);
assert.match(concurrentRun, /evidence_unchanged/);
assert.match(concurrentRun, /live_lock_cleanup_refused/);
assert.match(concurrentRun, /abandoned_lock_listed_and_cleaned/);

assert.match(live, /direct_grouped_http/);
assert.match(live, /measurement_timing/);
assert.match(live, /stages_ms\?\.candidate_search/);
assert.match(live, /stages_ms\?\.audit_write/);
assert.match(live, /SUPERICONS_MCP_SEARCH_URL = stableFallbackSentinelUrl/);
assert.match(live, /stable_fallback_disabled: true/);
assert.match(live, /process\.exitCode = 1/);
assert.equal(live.includes('throw error;'), false);

assert.match(latency, /id: 'one_slot'/);
assert.match(latency, /id: 'ten_slots'/);
assert.match(latency, /id: 'twenty_slots'/);
assert.match(latency, /id: 'japanese_twenty_slots'/);
assert.match(latency, /p95LimitMs: 3000/);
assert.match(latency, /p95LimitMs: 10000/);
assert.match(latency, /p95LimitMs: 15000/);
assert.match(latency, /timeoutMs === 20000/);
assert.match(latency, /actual_routed_samples_with_worker_classification/);
assert.match(latency, /worker_affinity_assumed: false/);
assert.match(latency, /SUPERICONS_MCP_GROUPED_TIMING_OUTPUT/);
assert.match(latency, /worker_cohorts/);
assert.match(latency, /overall_p95_ms <= scenario\.p95LimitMs/);
assert.match(latency, /async function resetRateWindow/);
assert.equal(latency.includes("method: 'OPTIONS'"), false);
assert.equal(latency.includes('keepalive'), false);
assert.ok(
  latency.indexOf('summary.scenarios.push(scenarioSummary)')
    < latency.indexOf('overall_p95_ms <= scenario.p95LimitMs'),
  'Failed latency samples must be added to the evidence before the p95 assertion.',
);
assert.match(latency, /process\.exitCode = 1/);

assert.match(rollback, /retained_for_endpoint_dependency/);
assert.match(rollback, /database_rollback_count/);
assert.match(rollback, /match_bsdtar/);
assert.match(rollback, /match_gnu_tar/);
assert.match(rollback, /expectedDatabaseRollbackCount: 1/);
assert.match(rollback, /database_owner_run_id/);
assert.match(rollback, /search-v2-beta3-shared-grouped-simulation/);
assert.match(rollback, /releaseSimulationLock/);
assert.match(rollback, /SimulationEvidenceDirectory/);
assert.match(rollback, /snapshotProductionEvidence/);
assert.match(rollback, /A rollback simulation changed production release evidence/);
assert.equal(rollback.includes('removeGeneratedEvidence'), false);
assert.match(schedule, /actual_routed_samples_with_worker_classification/);
assert.match(schedule, /reset_network_requests: 0/);
assert.match(schedule, /mixed_worker_classification/);
assert.match(schedule, /all_first_request_cohort/);
assert.match(schedule, /overall_p95_ms > 3000/);
assert.match(concurrentRun, /concurrent_rollback_simulation_refused/);
assert.match(concurrentRun, /preheld_release_lock_preserved_original_error/);
assert.match(concurrentRun, /preheld_simulation_lock_preserved_original_error/);
assert.match(concurrentRun, /if \(releaseTestLockAcquired\) releaseLock/);
assert.match(concurrentRun, /if \(simulationTestLockAcquired\) releaseLock/);
assert.match(concurrentRun, /doesNotMatch\(output, \/belongs to another run and was not released\//);

for (const path of [...Object.values(paths), manifestPath]) {
  const text = readFileSync(path, 'utf8');
  assert.equal(/[\u2013\u2014]/u.test(text), false, `${path} contains a prohibited dash character.`);
}

run('node', [paths.databaseFixture]);
run('node', [paths.databaseSmoke]);
run('node', ['scripts/verify-hosted-search-grouped-client.mjs']);
run('node', ['scripts/verify-mcp-agent-friendly-errors.mjs']);
run('node', ['scripts/verify-hosted-search-resilience.mjs']);
run('node', ['scripts/verify-recommend-icons-grouped-search.mjs']);
run('node', ['scripts/verify-search-v2-deterministic-mcp-default.mjs']);
run('node', ['scripts/verify-search-v2-phase1-parity.mjs']);
run('deno', [
  'run',
  '--allow-read',
  '--allow-env',
  'scripts/verify-search-v2-grouped-http-request.ts',
]);
run('deno', [
  'run',
  '--allow-read',
  '--allow-env',
  'scripts/verify-search-v2-shared-recommendation-pipeline.ts',
]);
run('deno', ['check', 'supabase/functions/mcp-search-grouped/index.ts']);
if (!skipNestedReleaseSimulations) {
  run('node', [paths.databaseSmokeConcurrency]);
  run('node', [paths.productionBenchmarkLock]);
  run('node', [paths.negative]);
  run('node', [paths.rollback]);
  run('node', [paths.schedule]);
  run('node', [paths.concurrentRun]);
}

console.log(JSON.stringify({
  status: 'ok',
  manifest_sha256: manifestHash,
  source_revision: manifest.source_revision,
  source_tree: manifest.source_tree,
  source_file_count: manifest.source_files.length,
  packet_file_count: manifest.packet_files.length,
  stable_route_blob: manifest.stable_route_blob,
  mutations: {
    grouped_function_deployments: 1,
    conditional_grouped_function_deletions: 1,
    shared_candidate_rpc_creations: 1,
    migration_history_inserts: 1,
    conditional_shared_candidate_rpc_drops: 1,
    conditional_migration_history_deletes: 1,
    stable_function_deployments: 0,
    npm_publications: 0,
  },
  committed_safety_harnesses: skipNestedReleaseSimulations
    ? 'skipped_in_nested_simulation'
    : 'passed',
}, null, 2));
