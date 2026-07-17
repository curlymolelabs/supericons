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

function requireRejected(result, pattern) {
  assert.notEqual(result.status, 0, 'Fail-closed probe unexpectedly succeeded');
  assert.match(`${result.stdout || ''}\n${result.stderr || ''}`, pattern);
}

const expectedManifestHash = getArgument('--expected-manifest');
assert.match(expectedManifestHash || '', /^[a-f0-9]{64}$/);
const actualManifestHash = sha256NormalizedText(manifestPath);
assert.equal(actualManifestHash, expectedManifestHash);
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const probeResults = new Map();
const passProbe = (id, result = 'passed') => {
  assert.equal(probeResults.has(id), false, `Probe ${id} executed more than once`);
  probeResults.set(id, result);
};
passProbe('manifest_hash_binding');

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
passProbe('artifact_hash_binding');

assert.equal(manifest.probe_inventory.schema_version, 1);
const predecessorManifestPath = join(repoRoot, manifest.probe_inventory.predecessor_manifest_path);
assert.equal(
  sha256NormalizedText(predecessorManifestPath),
  manifest.probe_inventory.predecessor_manifest_sha256,
);
const predecessorManifest = JSON.parse(readFileSync(predecessorManifestPath, 'utf8'));
const predecessorVerifierPath = join(repoRoot, predecessorManifest.artifacts.packet_verifier);
assert.equal(
  sha256NormalizedText(predecessorVerifierPath),
  predecessorManifest.artifacts.packet_verifier_sha256,
);
const predecessorVerifierText = readFileSync(predecessorVerifierPath, 'utf8');
const extractedPredecessorProbeIds = [...new Set(
  [...predecessorVerifierText.matchAll(
    /\b([a-z0-9_]+_probe|postapproval_rollback_self_tests|staged_archive_verification)\s*:/g,
  )].map((match) => match[1]),
)].sort();
assert.deepEqual(
  [...manifest.probe_inventory.predecessor_probe_ids].sort(),
  extractedPredecessorProbeIds,
);
const activeProbeIds = manifest.probe_inventory.active.map((entry) => entry.id);
const retiredProbeIds = manifest.probe_inventory.retired.map((entry) => entry.id);
assert.equal(new Set(activeProbeIds).size, activeProbeIds.length);
assert.equal(new Set(retiredProbeIds).size, retiredProbeIds.length);
assert.equal(activeProbeIds.some((id) => retiredProbeIds.includes(id)), false);
for (const retired of manifest.probe_inventory.retired) {
  assert.ok(String(retired.reason || '').trim().length >= 20);
}
for (const predecessorProbeId of extractedPredecessorProbeIds) {
  assert.equal(
    activeProbeIds.includes(predecessorProbeId) || retiredProbeIds.includes(predecessorProbeId),
    true,
    `Predecessor probe ${predecessorProbeId} disappeared without retirement`,
  );
}
passProbe('monotonic_probe_inventory');

const privateRecordPath = resolve(getArgument('--private-record', defaultPrivateRecord));
assert.equal(existsSync(privateRecordPath), true, 'Private canary record is missing');
assert.equal(sha256File(privateRecordPath), manifest.public_bundle.private_record_sha256);
const privateRecord = JSON.parse(readFileSync(privateRecordPath, 'utf8'));
assert.ok(Array.isArray(privateRecord.entries) && privateRecord.entries.length >= 3);
passProbe('private_record_presence_and_hash');

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
passProbe('vc3_bundle_content_npm_web');
passProbe('vc4_license_canary_npm_web');
passProbe('private_record_missing_rejected');
passProbe('private_record_hash_mismatch_rejected');
passProbe('source_canary_absence');

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
  passProbe('clean_worktree_repack_byte_identity');

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
  assert.deepEqual(
    smoke.material_checks.map((entry) => entry.style).sort(),
    ['outline', 'solid'],
  );
  passProbe('installed_stdio_route_fingerprint_150');
  passProbe('installed_eligible_hosted_calls_zero', smoke.hosted_calls);
  passProbe('material_outline_and_solid');
  passProbe('staged_archive_verification');

  requireRejected(spawnSync(process.execPath, [
    join(repoRoot, manifest.artifacts.published_smoke),
    '--package-spec',
    rebuiltArchive,
    '--expected-version',
    manifest.package.version,
    '--expected-route-fingerprint',
    manifest.search_contract.stdio_route_fingerprint,
    '--inject-hosted-call',
  ], {
    cwd: repoRoot,
    encoding: 'utf8',
    windowsHide: true,
    maxBuffer: 32 * 1024 * 1024,
  }), /Hosted calls were observed/);
  passProbe('hosted_call_negative_probe');
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
passProbe('consumed_stage_attempt_probe');

const stageRecordSelfTest = runJson('powershell.exe', [
  '-NoProfile',
  '-ExecutionPolicy',
  'Bypass',
  '-File',
  join(repoRoot, manifest.artifacts.postapproval_finalizer),
  '-RunStageRecordSelfTest',
]);
assert.equal(stageRecordSelfTest.status, 'ok');
passProbe('postapproval_stage_record_probe');
const finalizationSelfTest = runJson('powershell.exe', [
  '-NoProfile',
  '-ExecutionPolicy',
  'Bypass',
  '-File',
  join(repoRoot, manifest.artifacts.postapproval_finalizer),
  '-RunFinalizationOutcomeSelfTest',
]);
assert.equal(finalizationSelfTest.status, 'ok');
passProbe('postapproval_terminal_replay_probe');
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
passProbe('postapproval_rollback_self_tests');

const packageAudit = runNpmJson(['audit', '--prefix', 'mcp', '--json']);
assert.equal(packageAudit.metadata.vulnerabilities.total, 0);
passProbe('mcp_dependency_audit_zero');

assert.deepEqual(
  [...probeResults.keys()].sort(),
  [...activeProbeIds].sort(),
  'The executed behavioral probe set differs from the manifest inventory',
);

console.log(JSON.stringify({
  status: 'ok',
  manifest_sha256: actualManifestHash,
  implementation_commit: manifest.implementation.commit,
  package: `${manifest.package.name}@${manifest.package.version}`,
  archive_sha256: manifest.package.archive_sha256,
  clean_repack_byte_identical: true,
  eligible_stdio_cases: manifest.search_contract.eligible_stdio_cases,
  stdio_route_fingerprint: manifest.search_contract.stdio_route_fingerprint,
  measured_hosted_calls: probeResults.get('installed_eligible_hosted_calls_zero'),
  hosted_call_negative_probe: probeResults.get('hosted_call_negative_probe'),
  charter_probes: protectedVerification.probes,
  active_probe_count: activeProbeIds.length,
  retired_probe_count: retiredProbeIds.length,
  probe_inventory_complete: true,
  private_record_bound: true,
  private_record_values_disclosed: false,
  package_vulnerabilities: 0,
  staging_replay_guard: 'passed',
  finalization_replay_guard: 'passed',
  rollback_scenarios: 4,
  web_deployment_authorized: false,
}, null, 2));
