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
import { homedir, tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';

const args = process.argv.slice(2);
const repoRoot = resolve(import.meta.dirname, '..');
const manifestPath = join(
  repoRoot,
  'docs',
  'si-v2',
  'search',
  'reviews',
  'search-v2-beta1-publication-authorization-manifest-2026-07-17.json',
);
const defaultPrivateRecord = process.env.LOCALAPPDATA
  ? join(process.env.LOCALAPPDATA, 'Supericons', 'private', 'search-v2-engine-canaries.json')
  : join(homedir(), '.supericons', 'private', 'search-v2-engine-canaries.json');
const npmCli = process.platform === 'win32'
  ? join(dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js')
  : null;

function getArgument(name, fallback = null) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : fallback;
}

function sha256Buffer(value) {
  return createHash('sha256').update(value).digest('hex');
}

function sha256File(path) {
  return sha256Buffer(readFileSync(path));
}

function normalizedText(path) {
  return readFileSync(path, 'utf8').replaceAll('\r\n', '\n').replaceAll('\r', '\n');
}

function sha256NormalizedText(path) {
  return sha256Buffer(Buffer.from(normalizedText(path), 'utf8'));
}

function runJson(executable, commandArgs, options = {}) {
  const text = execFileSync(executable, commandArgs, {
    cwd: options.cwd || repoRoot,
    encoding: 'utf8',
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: options.env || process.env,
  });
  return JSON.parse(text);
}

function runNpmJson(commandArgs, options = {}) {
  return npmCli
    ? runJson(process.execPath, [npmCli, ...commandArgs], options)
    : runJson('npm', commandArgs, options);
}

function assertArtifactHash(manifest, name, hashName) {
  const path = join(repoRoot, manifest.artifacts[name]);
  assert.equal(existsSync(path), true, `${name} is missing`);
  assert.equal(sha256NormalizedText(path), manifest.artifacts[hashName], `${name} hash moved`);
}

const expectedManifestHash = getArgument('--expected-manifest');
assert.match(expectedManifestHash || '', /^[a-f0-9]{64}$/);
const actualManifestHash = sha256NormalizedText(manifestPath);
assert.equal(actualManifestHash, expectedManifestHash);
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

assert.equal(manifest.schema_version, 1);
assert.equal(manifest.name, 'search_v2_protected_local_first_beta_publication');
assert.equal(manifest.implementation.commit, 'bbff99a54db666711f1baf59658b5995e812ff0e');
assert.equal(manifest.package.name, '@supericons/mcp');
assert.equal(manifest.package.version, '0.4.19-beta.1');
assert.equal(manifest.package.publish_tag, 'beta');
assert.equal(manifest.package.latest_must_remain, '0.4.17');
assert.equal(manifest.package.maximum_size_bytes, 7000000);
assert.equal(manifest.search_contract.eligible_stdio_cases, 150);
assert.equal(
  manifest.search_contract.stdio_route_fingerprint,
  '7a56bd231101974a5c0a3d347ed500153402d5095a1e2eadbb6739a124c32184',
);
assert.equal(manifest.public_bundle.charter_probes['VC-3_bundle_content'], 'required');
assert.equal(manifest.public_bundle.charter_probes['VC-4_license_and_canary'], 'required');
assert.deepEqual(manifest.public_bundle.protected_classes, [
  'usage_derived_ranking_weights',
  'query_behavior_signals',
  'community_curation_data',
  'contributor_reputation_data',
  'paid_design_intelligence',
]);
assert.equal(manifest.public_bundle.web_deployment_authorized, false);
assert.equal(manifest.public_bundle.private_record_sha256.length, 64);
assert.equal(manifest.external_actions.maximum_private_npm_staged_uploads, 1);
assert.equal(manifest.external_actions.maximum_npm_prerelease_publications, 1);
assert.equal(manifest.external_actions.maximum_conditional_npm_deprecations, 1);
assert.equal(manifest.external_actions.maximum_stable_hosted_comparison_requests, 0);
assert.equal(manifest.external_actions.function_deployments, 0);
assert.equal(manifest.external_actions.database_mutations, 0);
assert.equal(manifest.external_actions.npm_latest_changes, 0);
assert.equal(manifest.external_actions.web_deployments, 0);
assert.equal(manifest.external_actions.model_provider_calls, 0);
assert.equal(manifest.beta_window.minimum_organic_attempts, 200);
assert.equal(manifest.beta_window.minimum_complete_green_days, 3);
assert.equal(manifest.beta_window.session_count_is_gate, false);
assert.equal(manifest.beta_window.scripted_suites_eligible, false);

for (const [name, hashName] of [
  ['stager', 'stager_sha256'],
  ['postapproval_finalizer', 'postapproval_finalizer_sha256'],
  ['published_smoke', 'published_smoke_sha256'],
  ['protected_builder', 'protected_builder_sha256'],
  ['protected_verifier', 'protected_verifier_sha256'],
  ['packet_verifier', 'packet_verifier_sha256'],
]) {
  assertArtifactHash(manifest, name, hashName);
}

const privateRecordPath = resolve(getArgument('--private-record', defaultPrivateRecord));
assert.equal(existsSync(privateRecordPath), true, 'Private canary record is missing');
assert.equal(sha256File(privateRecordPath), manifest.public_bundle.private_record_sha256);
const privateRecord = JSON.parse(readFileSync(privateRecordPath, 'utf8'));
assert.ok(Array.isArray(privateRecord.entries) && privateRecord.entries.length >= 3);

const protectedVerification = runJson(process.execPath, [
  join(repoRoot, manifest.artifacts.protected_verifier),
  '--private-record',
  privateRecordPath,
  '--expected-record-sha256',
  manifest.public_bundle.private_record_sha256,
]);
assert.equal(protectedVerification.status, 'ok');
assert.equal(protectedVerification.probes['VC-3_bundle_content'], 'passed_npm_and_web');
assert.equal(protectedVerification.probes['VC-4_license_and_canary'], 'passed_npm_and_web');
assert.equal(protectedVerification.private_record_missing_probe, 'rejected');
assert.equal(protectedVerification.private_record_hash_mismatch_probe, 'rejected');
assert.equal(protectedVerification.source_canaries_absent, true);

const temporaryRoot = mkdtempSync(join(tmpdir(), 'search-v2-beta1-packet-'));
const cleanSourceRoot = join(temporaryRoot, 'source');
const protectedRoot = join(temporaryRoot, 'protected');
const archiveRoot = join(temporaryRoot, 'archive');
let worktreeAdded = false;
try {
  execFileSync('git', [
    'worktree',
    'add',
    '--detach',
    cleanSourceRoot,
    manifest.implementation.commit,
  ], {
    cwd: repoRoot,
    encoding: 'utf8',
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  worktreeAdded = true;
  assert.equal(
    execFileSync('git', ['status', '--porcelain'], {
      cwd: cleanSourceRoot,
      encoding: 'utf8',
      windowsHide: true,
    }),
    '',
  );
  runJson(process.execPath, [
    join(repoRoot, manifest.artifacts.protected_builder),
    '--source-root',
    cleanSourceRoot,
    '--source-commit',
    manifest.implementation.commit,
    '--output-root',
    protectedRoot,
    '--private-record',
    privateRecordPath,
    '--expected-record-sha256',
    manifest.public_bundle.private_record_sha256,
  ]);
  mkdirSync(archiveRoot, { recursive: true });
  const pack = runNpmJson([
    'pack',
    '--ignore-scripts',
    '--json',
    '--pack-destination',
    archiveRoot,
  ], { cwd: join(protectedRoot, 'npm') })[0];
  assert.equal(pack.name, manifest.package.name);
  assert.equal(pack.version, manifest.package.version);
  assert.equal(pack.size, manifest.package.archive_size_bytes);
  assert.equal(pack.unpackedSize, manifest.package.unpacked_size_bytes);
  assert.equal(pack.entryCount, manifest.package.file_count);
  assert.equal(pack.shasum, manifest.package.npm_shasum);
  assert.equal(pack.integrity, manifest.package.npm_integrity);
  const rebuiltArchive = join(archiveRoot, basename(pack.filename));
  assert.equal(sha256File(rebuiltArchive), manifest.package.archive_sha256);

  const approvedArchive = join(repoRoot, manifest.package.archive_path);
  assert.equal(existsSync(approvedArchive), true, 'Approved archive is missing');
  assert.equal(sha256File(approvedArchive), manifest.package.archive_sha256);
  assert.equal(readFileSync(rebuiltArchive).equals(readFileSync(approvedArchive)), true);

  const smoke = runJson(process.execPath, [
    join(repoRoot, manifest.artifacts.published_smoke),
    '--package-spec',
    rebuiltArchive,
    '--expected-version',
    manifest.package.version,
    '--expected-route-fingerprint',
    manifest.search_contract.stdio_route_fingerprint,
  ]);
  assert.equal(smoke.status, 'ok');
  assert.equal(smoke.eligible_stdio_cases, 150);
  assert.equal(smoke.hosted_calls, 0);
  assert.equal(smoke.stdio_route_fingerprint, manifest.search_contract.stdio_route_fingerprint);
} finally {
  if (worktreeAdded) {
    spawnSync('git', ['worktree', 'remove', '--force', cleanSourceRoot], {
      cwd: repoRoot,
      encoding: 'utf8',
      windowsHide: true,
    });
  }
  rmSync(temporaryRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}

const stageSelfTest = runJson('powershell.exe', [
  '-NoProfile',
  '-ExecutionPolicy',
  'Bypass',
  '-File',
  join(repoRoot, manifest.artifacts.stager),
  '-RunStageAttemptSelfTest',
]);
assert.equal(stageSelfTest.status, 'ok');
assert.equal(stageSelfTest.first_execution_stage_calls, 1);
assert.equal(stageSelfTest.second_execution_stage_calls, 0);

const stageRecordSelfTest = runJson('powershell.exe', [
  '-NoProfile',
  '-ExecutionPolicy',
  'Bypass',
  '-File',
  join(repoRoot, manifest.artifacts.postapproval_finalizer),
  '-RunStageRecordSelfTest',
]);
assert.equal(stageRecordSelfTest.status, 'ok');
const finalizationSelfTest = runJson('powershell.exe', [
  '-NoProfile',
  '-ExecutionPolicy',
  'Bypass',
  '-File',
  join(repoRoot, manifest.artifacts.postapproval_finalizer),
  '-RunFinalizationOutcomeSelfTest',
]);
assert.equal(finalizationSelfTest.status, 'ok');
for (const scenario of ['integrity_mismatch', 'tag_mismatch', 'smoke_failure', 'already_deprecated']) {
  const rollback = runJson('powershell.exe', [
    '-NoProfile',
    '-ExecutionPolicy',
    'Bypass',
    '-File',
    join(repoRoot, manifest.artifacts.postapproval_finalizer),
    '-RunRollbackSelfTest',
    '-RollbackTestScenario',
    scenario,
  ]);
  assert.equal(rollback.status, 'ok');
  assert.equal(rollback.publish_calls, 0);
  assert.equal(rollback.latest_mutation_calls, 0);
  assert.equal(rollback.comparison_calls, 0);
}

const packageAudit = runNpmJson(['audit', '--prefix', 'mcp', '--json']);
assert.equal(packageAudit.metadata.vulnerabilities.total, 0);

console.log(JSON.stringify({
  status: 'ok',
  manifest_sha256: actualManifestHash,
  implementation_commit: manifest.implementation.commit,
  package: `${manifest.package.name}@${manifest.package.version}`,
  archive_sha256: manifest.package.archive_sha256,
  clean_repack_byte_identical: true,
  eligible_stdio_cases: manifest.search_contract.eligible_stdio_cases,
  stdio_route_fingerprint: manifest.search_contract.stdio_route_fingerprint,
  hosted_calls: 0,
  charter_probes: protectedVerification.probes,
  private_record_bound: true,
  private_record_values_disclosed: false,
  package_vulnerabilities: 0,
  staging_replay_guard: 'passed',
  finalization_replay_guard: 'passed',
  rollback_scenarios: 4,
  web_deployment_authorized: false,
}, null, 2));
