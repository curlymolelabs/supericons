import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

const repoRoot = resolve(import.meta.dirname, '..');
const manifestPath = join(
  repoRoot,
  'docs',
  'si-v2',
  'search',
  'reviews',
  'search-v2-local-first-beta-publication-authorization-manifest-2026-07-16.json',
);
const requestPath = join(
  repoRoot,
  'docs',
  'si-v2',
  'search',
  'reviews',
  'search-v2-local-first-beta-publication-approval-request-2026-07-16.md',
);
const args = process.argv.slice(2);

function getArgument(name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : null;
}

function normalizeText(value) {
  return value.replace(/\r\n?/g, '\n');
}

function sha256Text(value) {
  return createHash('sha256').update(normalizeText(value)).digest('hex');
}

function sha256File(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function runNpm(args, cwd) {
  const npmExecPath = process.env.npm_execpath
    || join(dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js');
  assert.ok(existsSync(npmExecPath), 'npm CLI entry point was not found.');
  return execFileSync(process.execPath, [npmExecPath, ...args], {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function packCommittedPackage(commit) {
  const temporaryRoot = mkdtempSync(join(tmpdir(), 'search-v2-publication-packet-'));
  const worktreePath = join(temporaryRoot, 'worktree');
  const packPath = join(temporaryRoot, 'pack');
  let worktreeAdded = false;

  try {
    mkdirSync(packPath, { recursive: true });
    execFileSync('git', ['worktree', 'add', '--detach', '--quiet', worktreePath, commit], {
      cwd: repoRoot,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    worktreeAdded = true;
    const [record] = JSON.parse(runNpm([
      'pack',
      '--json',
      '--ignore-scripts',
      '--pack-destination',
      packPath,
    ], join(worktreePath, 'mcp')));
    const tarballPath = join(packPath, record.filename);
    return {
      ...record,
      archive_sha256: sha256File(tarballPath),
    };
  } finally {
    try {
      if (worktreeAdded) {
        execFileSync('git', ['worktree', 'remove', '--force', worktreePath], {
          cwd: repoRoot,
          stdio: ['ignore', 'pipe', 'pipe'],
        });
      }
    } finally {
      rmSync(temporaryRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
    }
  }
}

function requireRejected(result, pattern) {
  assert.notEqual(result.status, 0, 'Fail-closed probe unexpectedly succeeded.');
  assert.match(`${result.stdout || ''}\n${result.stderr || ''}`, pattern);
}

const manifestText = readFileSync(manifestPath, 'utf8');
const requestText = readFileSync(requestPath, 'utf8');
const manifest = JSON.parse(manifestText);
const actualManifestHash = sha256Text(manifestText);
const expectedManifestHash = getArgument('--expected-manifest');
if (expectedManifestHash) {
  assert.equal(actualManifestHash, expectedManifestHash);
}
assert.equal(manifest.hash_mode, 'utf8_lf_normalized_text');
assert.equal(manifest.implementation.commit, 'b06bba157a0f63ef435eadaa8f8797fefe0d8617');
assert.equal(manifest.implementation.release_type, 'npm_prerelease_only');
assert.equal(manifest.implementation.hosted_function_deployment_required, false);
assert.equal(manifest.implementation.database_migration_required, false);
assert.equal(manifest.package.requires_interactive_otp, false);
assert.equal(manifest.package.browser_security_key_approval_required, true);
assert.equal(manifest.publication_flow.mode, 'npm_staged_browser_security_key');
assert.equal(manifest.publication_flow.staging_cli, 'npm@11.18.0');
assert.equal(manifest.publication_flow.staging_requires_2fa, false);
assert.equal(
  manifest.publication_flow.staged_archive_download_and_smoke_required_before_browser_approval,
  true,
);
assert.equal(manifest.publication_flow.browser_approval_requires_owner_access, true);
assert.equal(manifest.publication_flow.postapproval_registry_and_smoke_verification_required, true);
assert.equal(manifest.publication_flow.postapproval_failure_requires_exact_prerelease_deprecation, true);
assert.equal(manifest.publication_flow.postapproval_finalization_single_use, true);
assert.equal(manifest.publication_flow.postapproval_deprecation_must_be_empty_before_success, true);
assert.deepEqual(manifest.publication_flow.postapproval_terminal_outcomes, [
  'published_and_verified',
  'rolled_back',
]);
assert.equal(manifest.publication_flow.postapproval_replay_behavior, 'reject_before_external_request');
assert.equal(manifest.publication_flow.publish_tag_locked_at_staging, 'beta');
assert.equal(manifest.publication_attempts.recorded_eotp_rejections, 1);
assert.equal(manifest.publication_attempts.recorded_private_stage_commands, 1);
assert.equal(manifest.publication_attempts.maximum_additional_direct_publish_commands, 0);
assert.equal(manifest.publication_attempts.maximum_additional_stage_commands, 0);
assert.equal(manifest.publication_attempts.maximum_successful_publications, 1);
assert.equal(manifest.publication_attempts.receipt_schema_version, 1);
assert.equal(manifest.publication_attempts.receipt_scope, 'user_local_application_data');
assert.equal(manifest.publication_attempts.receipt_contains_credentials, false);
assert.equal(manifest.publication_attempts.consumption_timing, 'immediately_before_npm_stage_publish');
assert.equal(manifest.publication_attempts.finalization_outcome_schema_version, 1);
assert.equal(manifest.publication_attempts.finalization_outcome_scope, 'user_local_application_data');
assert.equal(manifest.publication_attempts.finalization_outcome_contains_credentials, false);
assert.equal(manifest.reconciliation.mode, 'existing_private_stage_read_only');
assert.equal(
  manifest.reconciliation.source_manifest_sha256,
  '48c6fb3239e90ba7f3cfe118418e5c597de4840dea816901854870ec0af0a2d3',
);
assert.equal(manifest.reconciliation.existing_stage_id, 'c45e936a-4fc0-4857-981b-d88cfb3a025a');
assert.equal(manifest.reconciliation.source_attempt_receipt_required, true);
assert.equal(manifest.reconciliation.additional_stage_publish_calls, 0);
assert.equal(manifest.reconciliation.read_only_stage_list_view_and_download, true);
assert.equal(manifest.reconciliation.downloaded_archive_and_installed_smoke_required, true);

const archivePath = join(repoRoot, manifest.package.archive_path);
assert.equal(sha256File(archivePath), manifest.package.archive_sha256);
assert.equal(readFileSync(archivePath).length, manifest.package.archive_size_bytes);
assert.ok(manifest.package.archive_size_bytes < manifest.package.maximum_size_bytes);

const packed = packCommittedPackage(manifest.implementation.commit);
assert.equal(packed.name, manifest.package.name);
assert.equal(packed.version, manifest.package.version);
assert.equal(packed.size, manifest.package.archive_size_bytes);
assert.equal(packed.unpackedSize, manifest.package.unpacked_size_bytes);
assert.equal(packed.entryCount, manifest.package.file_count);
assert.equal(packed.shasum, manifest.package.npm_shasum);
assert.equal(packed.integrity, manifest.package.npm_integrity);
assert.equal(packed.archive_sha256, manifest.package.archive_sha256);

for (const [pathKey, hashKey] of [
  ['stager', 'stager_sha256'],
  ['stage_reconciler', 'stage_reconciler_sha256'],
  ['postapproval_finalizer', 'postapproval_finalizer_sha256'],
  ['published_smoke', 'published_smoke_sha256'],
  ['hosted_comparison_runner', 'hosted_comparison_runner_sha256'],
  ['packet_verifier', 'packet_verifier_sha256'],
]) {
  const artifactPath = join(repoRoot, manifest.artifacts[pathKey]);
  assert.equal(sha256Text(readFileSync(artifactPath, 'utf8')), manifest.artifacts[hashKey]);
}

assert.equal(manifest.search_contract.fixed_cases, 225);
assert.equal(manifest.search_contract.eligible_stdio_cases, 150);
assert.equal(
  manifest.search_contract.helper_fingerprint,
  'ef2934097555867d1695e9861f35c346132f6c33ec9899c602635ce12aba76c8',
);
assert.equal(
  manifest.search_contract.stdio_route_fingerprint,
  '7a56bd231101974a5c0a3d347ed500153402d5095a1e2eadbb6739a124c32184',
);
assert.equal(manifest.search_contract.model_provider_calls, 0);
assert.equal(manifest.routes.eligible_search_icons, 'packaged_local_index');
assert.equal(manifest.routes.localized_search_icons, 'stable_mcp_search');
assert.equal(manifest.routes.non_ascii_search_icons, 'stable_mcp_search');
assert.equal(manifest.routes.recommend_icons, 'stable_mcp_search');
assert.equal(manifest.routes.web_search, 'unchanged');
assert.equal(manifest.routes.stable_fallback_beta_cohort, null);
assert.equal(manifest.published_smoke.hosted_calls, 0);
assert.equal(manifest.published_smoke.hosted_call_measurement, 'outbound_fetch_interceptor');
assert.equal(manifest.published_smoke.negative_probe, 'one_observed_call_must_fail');

assert.equal(manifest.hosted_comparison.case_ids.length, 50);
assert.equal(new Set(manifest.hosted_comparison.case_ids).size, 50);
assert.equal(manifest.hosted_comparison.maximum_requests, 50);
assert.equal(manifest.hosted_comparison.maximum_concurrency, 1);
assert.equal(manifest.hosted_comparison.maximum_retries, 0);
assert.equal(manifest.hosted_comparison.allowance_scope, 'manifest_total');
assert.equal(manifest.hosted_comparison.attempt_receipt_schema_version, 1);
assert.equal(manifest.hosted_comparison.attempt_receipt_scope, 'user_local_application_data');
assert.equal(manifest.hosted_comparison.attempt_receipt_contains_credentials, false);
assert.equal(
  manifest.hosted_comparison.attempt_receipt_timing,
  'immediately_before_first_hosted_request',
);
assert.equal(manifest.hosted_comparison.partial_run_consumes_allowance, true);
assert.equal(manifest.hosted_comparison.gating, false);

assert.equal(manifest.external_actions.maximum_npm_prerelease_publications, 1);
assert.equal(manifest.external_actions.maximum_private_npm_staged_uploads, 0);
assert.equal(manifest.external_actions.maximum_conditional_npm_deprecations, 1);
assert.equal(manifest.external_actions.maximum_stable_hosted_comparison_requests, 50);
assert.equal(manifest.external_actions.function_deployments, 0);
assert.equal(manifest.external_actions.database_mutations, 0);
assert.equal(manifest.external_actions.migration_history_repairs, 0);
assert.equal(manifest.external_actions.normal_database_pushes, 0);
assert.equal(manifest.external_actions.production_load_tests, 0);
assert.equal(manifest.external_actions.npm_latest_changes, 0);
assert.equal(manifest.external_actions.model_provider_calls, 0);
assert.equal(manifest.external_actions.monitoring_activations, 0);
assert.equal(manifest.monitoring.activation_authorized, false);
assert.equal(
  manifest.rollback.postpublication_verification_failure,
  'deprecate_exact_prerelease_and_keep_latest_unchanged',
);

assert.match(requestText, new RegExp(actualManifestHash));
assert.match(requestText, /Reconcile the existing exact private stage without another staged upload/);
assert.match(requestText, /approves only the verified stage on npmjs\.com with the account security key/);
assert.match(requestText, /Run at most 50 sequential, sanitized fixed-case requests against stable hosted search/);
assert.match(requestText, /Concurrency is one and retries are zero/);
assert.match(requestText, /A partial comparison consumes the full manifest allowance/);
assert.match(requestText, /A repeated finalizer run is rejected before any external request/);
assert.match(requestText, /This request does not authorize:[\s\S]*a Supabase function deployment/);
assert.match(requestText, /a database migration, history repair, or normal database push/);
assert.match(requestText, /a production load test/);
for (const artifact of [manifestText, requestText]) {
  assert.doesNotMatch(artifact, /[\u2013\u2014]/);
}

const stagerPath = join(repoRoot, manifest.artifacts.stager);
const powerShell = process.platform === 'win32' ? 'powershell.exe' : 'pwsh';
requireRejected(spawnSync(powerShell, [
  '-NoProfile',
  '-ExecutionPolicy',
  'Bypass',
  '-File',
  stagerPath,
], { cwd: repoRoot, encoding: 'utf8' }), /Staging is disabled/);
requireRejected(spawnSync(powerShell, [
  '-NoProfile',
  '-ExecutionPolicy',
  'Bypass',
  '-File',
  stagerPath,
  '-ExecuteApprovedStaging',
  '-ApprovedManifestSha256',
  '0'.repeat(64),
], { cwd: repoRoot, encoding: 'utf8' }), /does not match the audited release fingerprint/);
const stageAttemptBudget = JSON.parse(execFileSync(powerShell, [
  '-NoProfile',
  '-ExecutionPolicy',
  'Bypass',
  '-File',
  stagerPath,
  '-RunStageAttemptSelfTest',
], { cwd: repoRoot, encoding: 'utf8' }));
assert.equal(stageAttemptBudget.status, 'ok');
assert.equal(stageAttemptBudget.failed_preflight_stage_calls, 0);
assert.equal(stageAttemptBudget.first_execution_stage_calls, 1);
assert.equal(stageAttemptBudget.second_execution_stage_calls, 0);
assert.equal(stageAttemptBudget.stage_id_captured, true);
assert.equal(stageAttemptBudget.receipt_manifest_bound, true);
assert.equal(stageAttemptBudget.receipt_contains_credentials, false);
requireRejected(spawnSync(powerShell, [
  '-NoProfile',
  '-ExecutionPolicy',
  'Bypass',
  '-File',
  stagerPath,
  '-ExecuteApprovedStaging',
  '-ApprovedManifestSha256',
  actualManifestHash,
], { cwd: repoRoot, encoding: 'utf8' }), /supports exactly one manifest-bound staging command/);

const stagerText = readFileSync(stagerPath, 'utf8');
assert.match(stagerText, /npm@\$NpmStageCliVersion/);
assert.match(stagerText, /'stage',\s*'publish'/);
assert.match(stagerText, /'stage',\s*'download'/);
assert.doesNotMatch(stagerText, /@\('publish',\s*\$archivePath/);
assert.match(stagerText, /downloaded staged archive does not match the approved SHA-256/);

const stageReconcilerPath = join(repoRoot, manifest.artifacts.stage_reconciler);
const stageReconciliation = JSON.parse(execFileSync(powerShell, [
  '-NoProfile',
  '-ExecutionPolicy',
  'Bypass',
  '-File',
  stageReconcilerPath,
  '-RunReconciliationSelfTest',
], { cwd: repoRoot, encoding: 'utf8' }));
assert.equal(stageReconciliation.status, 'ok');
assert.equal(stageReconciliation.missing_source_receipt_rejected, true);
assert.equal(stageReconciliation.exact_stage_metadata_accepted, true);
assert.equal(stageReconciliation.first_verified_record_writes, 1);
assert.equal(stageReconciliation.second_verified_record_writes, 0);
assert.equal(stageReconciliation.stage_publish_calls, 0);
assert.equal(stageReconciliation.verified_record_manifest_bound, true);
assert.equal(stageReconciliation.verified_record_contains_credentials, false);
const stageReconcilerText = readFileSync(stageReconcilerPath, 'utf8');
assert.doesNotMatch(stageReconcilerText, /'stage',\s*'publish'/);
assert.doesNotMatch(stageReconcilerText, /npm\s+publish/);
assert.match(stageReconcilerText, /'stage',\s*'download'/);

const finalizerPath = join(repoRoot, manifest.artifacts.postapproval_finalizer);
const stageRecordGuard = JSON.parse(execFileSync(powerShell, [
  '-NoProfile',
  '-ExecutionPolicy',
  'Bypass',
  '-File',
  finalizerPath,
  '-RunStageRecordSelfTest',
], { cwd: repoRoot, encoding: 'utf8' }));
assert.equal(stageRecordGuard.status, 'ok');
assert.equal(stageRecordGuard.missing_record_rejected, true);
assert.equal(stageRecordGuard.valid_record_accepted, true);
assert.equal(stageRecordGuard.wrong_manifest_rejected, true);

const finalizationOutcome = JSON.parse(execFileSync(powerShell, [
  '-NoProfile',
  '-ExecutionPolicy',
  'Bypass',
  '-File',
  finalizerPath,
  '-RunFinalizationOutcomeSelfTest',
], { cwd: repoRoot, encoding: 'utf8' }));
assert.equal(finalizationOutcome.status, 'ok');
assert.equal(finalizationOutcome.rolled_back_replay_external_requests, 0);
assert.equal(finalizationOutcome.verified_replay_external_requests, 0);
assert.equal(finalizationOutcome.in_progress_replay_external_requests, 0);
assert.equal(finalizationOutcome.terminal_records_manifest_bound, true);
assert.equal(finalizationOutcome.terminal_records_credential_free, true);

for (const scenario of [
  'integrity_mismatch',
  'tag_mismatch',
  'smoke_failure',
  'already_deprecated',
]) {
  const rollbackResult = JSON.parse(execFileSync(powerShell, [
    '-NoProfile',
    '-ExecutionPolicy',
    'Bypass',
    '-File',
    finalizerPath,
    '-RunRollbackSelfTest',
    '-RollbackTestScenario',
    scenario,
  ], { cwd: repoRoot, encoding: 'utf8' }));
  assert.equal(rollbackResult.status, 'ok');
  assert.equal(rollbackResult.scenario, scenario);
  assert.equal(rollbackResult.publish_calls, 0);
  assert.equal(rollbackResult.deprecation_calls, scenario === 'already_deprecated' ? 0 : 1);
  assert.equal(rollbackResult.latest_mutation_calls, 0);
  assert.equal(rollbackResult.comparison_calls, 0);
}

const finalizerText = readFileSync(finalizerPath, 'utf8');
assert.match(finalizerText, /Assert-VerifiedStageRecord/);
assert.match(finalizerText, /Test-PostApprovalRegistryState/);
assert.match(finalizerText, /Invoke-ExactPrereleaseRollback/);
assert.match(finalizerText, /--package-spec \$packageSpec/);
assert.ok(
  finalizerText.indexOf('New-FinalizationReservation `')
    < finalizerText.indexOf('& node $packetVerifierPath --expected-manifest'),
  'Finalization must be reserved before the packet verifier can make external requests.',
);
assert.ok(
  finalizerText.indexOf('New-FinalizationReservation `')
    < finalizerText.indexOf("$npmUser = & $readInvoker @('whoami')"),
  'Finalization must be reserved before npm authentication is checked.',
);

const comparisonPath = join(repoRoot, manifest.artifacts.hosted_comparison_runner);
const comparisonPlan = JSON.parse(execFileSync(process.execPath, [comparisonPath], {
  cwd: repoRoot,
  encoding: 'utf8',
}));
assert.equal(comparisonPlan.status, 'plan_only');
assert.equal(comparisonPlan.manifest_sha256, actualManifestHash);
assert.equal(comparisonPlan.sanitized_fixed_cases, 50);
assert.equal(comparisonPlan.network_calls_made, 0);
const comparisonAttemptBudget = JSON.parse(execFileSync(process.execPath, [
  comparisonPath,
  '--run-attempt-budget-self-test',
], { cwd: repoRoot, encoding: 'utf8' }));
assert.equal(comparisonAttemptBudget.status, 'ok');
assert.equal(comparisonAttemptBudget.first_execution_maximum_requests, 50);
assert.equal(comparisonAttemptBudget.second_execution_requests, 0);
assert.equal(comparisonAttemptBudget.partial_then_rerun_requests, 0);
assert.equal(comparisonAttemptBudget.receipt_manifest_bound, true);
assert.equal(comparisonAttemptBudget.receipt_contains_credentials, false);
requireRejected(spawnSync(process.execPath, [
  comparisonPath,
  '--execute-approved',
  '0'.repeat(64),
], { cwd: repoRoot, encoding: 'utf8' }), /does not match the current manifest/);

const smokePath = join(repoRoot, manifest.artifacts.published_smoke);
const smokeOutput = JSON.parse(execFileSync(process.execPath, [
  smokePath,
  '--package-spec',
  archivePath,
  '--expected-version',
  manifest.package.version,
  '--expected-route-fingerprint',
  manifest.search_contract.stdio_route_fingerprint,
], {
  cwd: repoRoot,
  encoding: 'utf8',
  maxBuffer: 32 * 1024 * 1024,
}));
assert.equal(smokeOutput.status, 'ok');
assert.equal(smokeOutput.eligible_stdio_cases, 150);
assert.equal(smokeOutput.hosted_calls, 0);
assert.equal(smokeOutput.material_checks.length, 2);
requireRejected(spawnSync(process.execPath, [
  smokePath,
  '--package-spec',
  archivePath,
  '--expected-version',
  manifest.package.version,
  '--expected-route-fingerprint',
  manifest.search_contract.stdio_route_fingerprint,
  '--inject-hosted-call',
], {
  cwd: repoRoot,
  encoding: 'utf8',
  maxBuffer: 32 * 1024 * 1024,
}), /Hosted calls were observed/);

console.log(JSON.stringify({
  status: 'ok',
  manifest_sha256: actualManifestHash,
  implementation_commit: manifest.implementation.commit,
  package: `${manifest.package.name}@${manifest.package.version}`,
  archive_sha256: manifest.package.archive_sha256,
  archive_size_bytes: manifest.package.archive_size_bytes,
  stdio_route_fingerprint: manifest.search_contract.stdio_route_fingerprint,
  eligible_stdio_cases: smokeOutput.eligible_stdio_cases,
  hosted_comparison_plan_requests: comparisonPlan.maximum_requests,
  measured_hosted_calls: smokeOutput.hosted_calls,
  hosted_call_negative_probe: 'rejected',
  publication_flow: manifest.publication_flow.mode,
  staged_archive_verification: 'hash_and_installed_smoke_required',
  consumed_stage_attempt_probe: 'second_stage_command_rejected',
  existing_private_stage_id: manifest.reconciliation.existing_stage_id,
  stage_reconciliation_probe: 'read_only_first_record_one_second_record_zero',
  postapproval_stage_record_probe: 'missing_and_wrong_rejected',
  postapproval_terminal_replay_probe: 'success_rollback_and_in_progress_zero_external_requests',
  postapproval_rollback_self_tests: [
    'integrity_mismatch',
    'tag_mismatch',
    'smoke_failure',
    'already_deprecated',
  ],
  hosted_comparison_attempt_probe: 'complete_and_partial_reruns_zero_requests',
  npm_publications_authorized_by_manifest: manifest.external_actions.maximum_npm_prerelease_publications,
  deployments_authorized_by_manifest: manifest.external_actions.function_deployments,
  database_mutations_authorized_by_manifest: manifest.external_actions.database_mutations,
  monitoring_activations_authorized_by_manifest: manifest.external_actions.monitoring_activations,
}, null, 2));
