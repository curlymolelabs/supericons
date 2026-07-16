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
  ['publisher', 'publisher_sha256'],
  ['published_smoke', 'published_smoke_sha256'],
  ['hosted_comparison_runner', 'hosted_comparison_runner_sha256'],
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
assert.equal(manifest.hosted_comparison.gating, false);

assert.equal(manifest.external_actions.maximum_npm_prerelease_publications, 1);
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
assert.match(requestText, /Publish the exact `@supericons\/mcp@0\.4\.19-beta\.0` archive once/);
assert.match(requestText, /at most 50 sequential sanitized stable-hosted comparison requests with no retries/);
assert.match(requestText, /No function deployment, database action, production load test/);
for (const artifact of [manifestText, requestText]) {
  assert.doesNotMatch(artifact, /[\u2013\u2014]/);
}

const publisherPath = join(repoRoot, manifest.artifacts.publisher);
const powerShell = process.platform === 'win32' ? 'powershell.exe' : 'pwsh';
requireRejected(spawnSync(powerShell, [
  '-NoProfile',
  '-ExecutionPolicy',
  'Bypass',
  '-File',
  publisherPath,
], { cwd: repoRoot, encoding: 'utf8' }), /Publication is disabled/);
requireRejected(spawnSync(powerShell, [
  '-NoProfile',
  '-ExecutionPolicy',
  'Bypass',
  '-File',
  publisherPath,
  '-ExecuteApprovedPublication',
  '-ApprovedManifestSha256',
  '0'.repeat(64),
], { cwd: repoRoot, encoding: 'utf8' }), /does not match the owner-approved fingerprint/);

for (const scenario of ['integrity_mismatch', 'tag_mismatch']) {
  const rollbackResult = JSON.parse(execFileSync(powerShell, [
    '-NoProfile',
    '-ExecutionPolicy',
    'Bypass',
    '-File',
    publisherPath,
    '-RunRollbackSelfTest',
    '-RollbackTestScenario',
    scenario,
  ], { cwd: repoRoot, encoding: 'utf8' }));
  assert.equal(rollbackResult.status, 'ok');
  assert.equal(rollbackResult.scenario, scenario);
  assert.equal(rollbackResult.publish_calls, 1);
  assert.equal(rollbackResult.deprecation_calls, 1);
  assert.equal(rollbackResult.latest_mutation_calls, 0);
}
const nativeCommandCapture = JSON.parse(execFileSync(powerShell, [
  '-NoProfile',
  '-ExecutionPolicy',
  'Bypass',
  '-File',
  publisherPath,
  '-RunNativeCommandCaptureSelfTest',
], { cwd: repoRoot, encoding: 'utf8' }));
assert.equal(nativeCommandCapture.status, 'ok');
assert.equal(nativeCommandCapture.exit_code, 1);
assert.equal(nativeCommandCapture.expected_absence_captured, true);

const comparisonPath = join(repoRoot, manifest.artifacts.hosted_comparison_runner);
const comparisonPlan = JSON.parse(execFileSync(process.execPath, [comparisonPath], {
  cwd: repoRoot,
  encoding: 'utf8',
}));
assert.equal(comparisonPlan.status, 'plan_only');
assert.equal(comparisonPlan.manifest_sha256, actualManifestHash);
assert.equal(comparisonPlan.sanitized_fixed_cases, 50);
assert.equal(comparisonPlan.network_calls_made, 0);
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
  rollback_self_tests: ['integrity_mismatch', 'tag_mismatch'],
  native_command_absence_probe: 'captured',
  npm_publications_authorized_by_manifest: manifest.external_actions.maximum_npm_prerelease_publications,
  deployments_authorized_by_manifest: manifest.external_actions.function_deployments,
  database_mutations_authorized_by_manifest: manifest.external_actions.database_mutations,
  monitoring_activations_authorized_by_manifest: manifest.external_actions.monitoring_activations,
}, null, 2));
