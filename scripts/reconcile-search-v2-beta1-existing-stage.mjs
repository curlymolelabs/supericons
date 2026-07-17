import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

const repoRoot = resolve(import.meta.dirname, '..');
const recoveryManifestPath = join(
  repoRoot,
  'docs',
  'si-v2',
  'search',
  'reviews',
  'search-v2-beta1-stage-reconciliation-manifest-2026-07-17.json',
);
const npmCli = join(dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js');
const npxCli = join(dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npx-cli.js');

function normalizedText(path) {
  return readFileSync(path, 'utf8').replaceAll('\r\n', '\n').replaceAll('\r', '\n');
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function sha256File(path) {
  return sha256(readFileSync(path));
}

function sha256NormalizedText(path) {
  return sha256(Buffer.from(normalizedText(path), 'utf8'));
}

function parseJsonOutput(text, description) {
  const value = String(text);
  const objectStart = value.indexOf('{');
  const arrayStart = value.indexOf('[');
  const start = objectStart < 0
    ? arrayStart
    : arrayStart < 0
      ? objectStart
      : Math.min(objectStart, arrayStart);
  assert.notEqual(start, -1, `${description} returned no JSON value`);
  const closing = value[start] === '{' ? '}' : ']';
  const end = value.lastIndexOf(closing);
  assert.ok(end >= start, `${description} returned incomplete JSON`);
  return JSON.parse(value.slice(start, end + 1));
}

function runNodeCli(cli, args, options = {}) {
  return spawnSync(process.execPath, [cli, ...args], {
    cwd: options.cwd || repoRoot,
    encoding: 'utf8',
    windowsHide: true,
    env: options.env || process.env,
  });
}

function runNpm(args, options = {}) {
  return runNodeCli(npmCli, args, options);
}

function runNpxNpm(args, options = {}) {
  return runNodeCli(npxCli, ['--yes', 'npm@11.18.0', ...args], options);
}

function requireSuccess(result, description) {
  assert.equal(
    result.status,
    0,
    `${description} failed: ${result.stderr || result.stdout || 'unknown error'}`,
  );
  return result;
}

function localStateRoot() {
  return process.env.LOCALAPPDATA
    ? join(process.env.LOCALAPPDATA, 'Supericons')
    : join(homedir(), '.supericons');
}

function assertSourceAttemptReceipt(path, sourceManifestSha256, packageSpec) {
  assert.equal(existsSync(path), true, 'The source staging-attempt receipt is missing');
  const receipt = JSON.parse(readFileSync(path, 'utf8'));
  assert.deepEqual(
    Object.keys(receipt).sort(),
    ['action', 'manifest_sha256', 'package', 'reserved_at_utc', 'schema_version'].sort(),
  );
  assert.equal(receipt.schema_version, 1);
  assert.equal(receipt.manifest_sha256, sourceManifestSha256);
  assert.equal(receipt.package, packageSpec);
  assert.equal(receipt.action, 'npm_stage_publish_reserved');
  assert.doesNotMatch(JSON.stringify(receipt), /password|credential|token|secret/i);
  return receipt;
}

function assertExistingStage(stageList, stageView, recovery) {
  const matches = stageList.filter((entry) => (
    entry.id === recovery.stage.id
    && entry.packageName === recovery.package.name
    && entry.version === recovery.package.version
  ));
  assert.equal(matches.length, 1, 'The existing private stage is missing or ambiguous');
  assert.equal(stageView.id, recovery.stage.id);
  assert.equal(stageView.packageName, recovery.package.name);
  assert.equal(stageView.version, recovery.package.version);
  assert.equal(stageView.tag, recovery.package.tag);
  assert.equal(stageView.access, 'public');
  assert.equal(stageView.shasum, recovery.package.npm_shasum);
}

function writeVerifiedStageRecord(path, record) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(record)}\n`, { encoding: 'utf8', flag: 'wx' });
}

function runSelfTest() {
  const root = mkdtempSync(join(tmpdir(), 'supericons-beta1-stage-reconcile-'));
  try {
    const sourceHash = 'a'.repeat(64);
    const packageSpec = '@supericons/mcp@0.4.19-beta.1';
    const receiptPath = join(root, 'attempt.json');
    assert.throws(
      () => assertSourceAttemptReceipt(receiptPath, sourceHash, packageSpec),
      /receipt is missing/,
    );
    writeFileSync(receiptPath, JSON.stringify({
      schema_version: 1,
      manifest_sha256: sourceHash,
      package: packageSpec,
      action: 'npm_stage_publish_reserved',
      reserved_at_utc: '2026-07-17T00:00:00.000Z',
    }));
    assertSourceAttemptReceipt(receiptPath, sourceHash, packageSpec);
    assert.throws(
      () => assertSourceAttemptReceipt(receiptPath, 'b'.repeat(64), packageSpec),
      /Expected values to be strictly equal/,
    );

    const stageId = '11111111-1111-4111-8111-111111111111';
    const recovery = {
      package: {
        name: '@supericons/mcp',
        version: '0.4.19-beta.1',
        tag: 'beta',
        npm_shasum: 'approved-shasum',
      },
      stage: { id: stageId },
    };
    const stageList = [{
      id: stageId,
      packageName: '@supericons/mcp',
      version: '0.4.19-beta.1',
    }];
    const stageView = {
      id: stageId,
      packageName: '@supericons/mcp',
      version: '0.4.19-beta.1',
      tag: 'beta',
      access: 'public',
      shasum: 'approved-shasum',
    };
    assertExistingStage(stageList, stageView, recovery);
    assert.throws(
      () => assertExistingStage([], stageView, recovery),
      /missing or ambiguous/,
    );

    const noisy = `npm notice private stage\n${JSON.stringify(stageView)}\nnpm notice done`;
    assert.equal(parseJsonOutput(noisy, 'noisy output').id, stageId);

    const recordPath = join(root, 'verified.json');
    const record = {
      schema_version: 1,
      manifest_sha256: sourceHash,
      package: packageSpec,
      tag: 'beta',
      stage_id: stageId,
      archive_sha256: 'c'.repeat(64),
      downloaded_archive_sha256_verified: true,
      installed_smoke_verified: true,
      reconciled_from_manifest_sha256: 'd'.repeat(64),
      reconciled_at_utc: '2026-07-17T00:00:00.000Z',
    };
    writeVerifiedStageRecord(recordPath, record);
    assert.throws(
      () => writeVerifiedStageRecord(recordPath, record),
      /EEXIST|file already exists/,
    );

    return {
      status: 'ok',
      missing_receipt_rejected: true,
      wrong_receipt_rejected: true,
      exact_stage_metadata_accepted: true,
      missing_stage_rejected: true,
      noisy_json_output_accepted: true,
      first_verified_record_writes: 1,
      second_verified_record_writes: 0,
      stage_publish_calls: 0,
    };
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

const args = process.argv.slice(2);
if (args.includes('--self-test')) {
  console.log(JSON.stringify(runSelfTest(), null, 2));
  process.exit(0);
}

assert.equal(
  args.includes('--execute-approved-reconciliation'),
  true,
  'Stage reconciliation is disabled without the explicit execution switch',
);
const expectedManifestIndex = args.indexOf('--expected-manifest');
const expectedRecoveryManifest = expectedManifestIndex >= 0
  ? args[expectedManifestIndex + 1]
  : '';
assert.match(expectedRecoveryManifest, /^[a-f0-9]{64}$/);
const actualRecoveryManifest = sha256NormalizedText(recoveryManifestPath);
assert.equal(actualRecoveryManifest, expectedRecoveryManifest);
const recovery = JSON.parse(readFileSync(recoveryManifestPath, 'utf8'));

assert.equal(recovery.schema_version, 1);
assert.equal(recovery.name, 'search_v2_beta1_existing_stage_reconciliation');
assert.equal(recovery.mode, 'existing_private_stage_read_only');
assert.equal(recovery.external_actions.additional_stage_uploads, 0);
assert.equal(recovery.external_actions.publications, 0);
assert.equal(recovery.external_actions.tag_changes, 0);
assert.equal(recovery.external_actions.deployments, 0);
assert.equal(recovery.external_actions.database_mutations, 0);
assert.equal(recovery.stage.id, 'efcd9a32-94aa-4a2d-a950-bca014b46c43');

const sourceManifestPath = join(repoRoot, recovery.source_release.manifest_path);
assert.equal(sha256NormalizedText(sourceManifestPath), recovery.source_release.manifest_sha256);
const source = JSON.parse(readFileSync(sourceManifestPath, 'utf8'));
assert.equal(source.package.name, recovery.package.name);
assert.equal(source.package.version, recovery.package.version);
assert.equal(source.package.publish_tag, recovery.package.tag);
assert.equal(source.package.archive_sha256, recovery.package.archive_sha256);
assert.equal(source.package.npm_shasum, recovery.package.npm_shasum);
assert.equal(source.package.npm_integrity, recovery.package.npm_integrity);
assert.equal(source.package.archive_size_bytes, recovery.package.archive_size_bytes);

assert.equal(
  sha256NormalizedText(import.meta.filename),
  recovery.artifacts.reconciler_sha256,
);
const recoveryVerifierPath = join(repoRoot, recovery.artifacts.verifier);
assert.equal(
  sha256NormalizedText(recoveryVerifierPath),
  recovery.artifacts.verifier_sha256,
);
requireSuccess(
  spawnSync(process.execPath, [
    recoveryVerifierPath,
    '--expected-manifest',
    actualRecoveryManifest,
  ], {
    cwd: repoRoot,
    encoding: 'utf8',
    windowsHide: true,
  }),
  'The stage reconciliation packet verifier',
);
const sourceVerifierPath = join(repoRoot, source.artifacts.packet_verifier);
assert.equal(
  sha256NormalizedText(sourceVerifierPath),
  source.artifacts.packet_verifier_sha256,
);
requireSuccess(
  spawnSync(process.execPath, [
    sourceVerifierPath,
    '--expected-manifest',
    recovery.source_release.manifest_sha256,
  ], {
    cwd: repoRoot,
    encoding: 'utf8',
    windowsHide: true,
  }),
  'The source publication packet verifier',
);

const packageSpec = `${recovery.package.name}@${recovery.package.version}`;
const attemptPath = join(
  localStateRoot(),
  'release-stage-attempts',
  `${recovery.source_release.manifest_sha256}.json`,
);
assertSourceAttemptReceipt(
  attemptPath,
  recovery.source_release.manifest_sha256,
  packageSpec,
);

const verifiedRecordPath = join(
  localStateRoot(),
  'staged-releases',
  `${recovery.source_release.manifest_sha256}.json`,
);
assert.equal(
  existsSync(verifiedRecordPath),
  false,
  'The verified stage record already exists. Refusing reconciliation replay',
);

const npmUser = requireSuccess(runNpm(['whoami']), 'npm authentication').stdout.trim();
assert.equal(npmUser.length > 0, true);
const tags = parseJsonOutput(
  requireSuccess(
    runNpm(['view', recovery.package.name, 'dist-tags', '--json']),
    'npm tag verification',
  ).stdout,
  'npm tag verification',
);
assert.equal(tags.latest, recovery.registry_state.latest_must_remain);
assert.equal(tags.beta, recovery.registry_state.beta_must_remain_before_approval);

const versionProbe = runNpm(['view', packageSpec, 'version', '--json']);
assert.notEqual(versionProbe.status, 0, 'The prerelease is already public');
assert.match(
  `${versionProbe.stdout}\n${versionProbe.stderr}`,
  /E404|No match found/,
  'The prerelease absence check failed unexpectedly',
);

const stageList = parseJsonOutput(
  requireSuccess(
    runNpxNpm(['stage', 'list', recovery.package.name, '--json']),
    'Existing private-stage list',
  ).stdout,
  'Existing private-stage list',
);
const stageView = parseJsonOutput(
  requireSuccess(
    runNpxNpm(['stage', 'view', recovery.stage.id, '--json']),
    'Existing private-stage view',
  ).stdout,
  'Existing private-stage view',
);
assertExistingStage(stageList, stageView, recovery);

const downloadRoot = join(
  repoRoot,
  'tmp',
  `search-v2-beta1-stage-reconciliation-${actualRecoveryManifest.slice(0, 12)}`,
);
rmSync(downloadRoot, { recursive: true, force: true });
mkdirSync(downloadRoot, { recursive: true });
const download = requireSuccess(
  runNpxNpm(['stage', 'download', recovery.stage.id, '--json'], { cwd: downloadRoot }),
  'Existing private-stage download',
);
const downloadMetadata = parseJsonOutput(
  `${download.stdout}\n${download.stderr}`,
  'Existing private-stage download',
)[recovery.package.name];
assert.equal(downloadMetadata.version, recovery.package.version);
assert.equal(downloadMetadata.size, recovery.package.archive_size_bytes);
assert.equal(downloadMetadata.shasum, recovery.package.npm_shasum);
assert.equal(downloadMetadata.integrity, recovery.package.npm_integrity);

const archives = readdirSync(downloadRoot).filter((name) => name.endsWith('.tgz'));
assert.equal(archives.length, 1, 'The stage download did not produce exactly one archive');
const archivePath = join(downloadRoot, archives[0]);
assert.equal(sha256File(archivePath), recovery.package.archive_sha256);

const smokePath = join(repoRoot, source.artifacts.published_smoke);
const smoke = parseJsonOutput(
  requireSuccess(
    spawnSync(process.execPath, [
      smokePath,
      '--package-spec',
      archivePath,
      '--expected-version',
      recovery.package.version,
      '--expected-route-fingerprint',
      source.search_contract.stdio_route_fingerprint,
    ], {
      cwd: repoRoot,
      encoding: 'utf8',
      windowsHide: true,
    }),
    'Installed staged-package smoke',
  ).stdout,
  'Installed staged-package smoke',
);
assert.equal(smoke.status, 'ok');
assert.equal(smoke.eligible_stdio_cases, source.search_contract.eligible_stdio_cases);
assert.equal(smoke.hosted_calls, 0);

const record = {
  schema_version: 1,
  manifest_sha256: recovery.source_release.manifest_sha256,
  package: packageSpec,
  tag: recovery.package.tag,
  stage_id: recovery.stage.id,
  archive_sha256: recovery.package.archive_sha256,
  downloaded_archive_sha256_verified: true,
  installed_smoke_verified: true,
  reconciled_from_manifest_sha256: actualRecoveryManifest,
  reconciled_at_utc: new Date().toISOString(),
};
writeVerifiedStageRecord(verifiedRecordPath, record);

console.log(JSON.stringify({
  status: 'staged_and_verified',
  recovery_manifest_sha256: actualRecoveryManifest,
  source_manifest_sha256: recovery.source_release.manifest_sha256,
  package: packageSpec,
  tag: recovery.package.tag,
  stage_id: recovery.stage.id,
  archive_sha256: recovery.package.archive_sha256,
  downloaded_archive_verified: true,
  installed_smoke_verified: true,
  eligible_stdio_cases: smoke.eligible_stdio_cases,
  hosted_calls: smoke.hosted_calls,
  additional_stage_uploads: 0,
  next_access_step: 'Approve this exact private stage in the npm browser with the account security key.',
}, null, 2));
