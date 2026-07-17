import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

const repoRoot = resolve(import.meta.dirname, '..');
const manifestPath = join(
  repoRoot,
  'docs',
  'si-v2',
  'search',
  'reviews',
  'search-v2-beta1-stage-reconciliation-manifest-2026-07-17.json',
);

function normalizedText(path) {
  return readFileSync(path, 'utf8').replaceAll('\r\n', '\n').replaceAll('\r', '\n');
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function sha256NormalizedText(path) {
  return sha256(Buffer.from(normalizedText(path), 'utf8'));
}

const args = process.argv.slice(2);
const hashIndex = args.indexOf('--expected-manifest');
const expectedManifest = hashIndex >= 0 ? args[hashIndex + 1] : '';
assert.match(expectedManifest, /^[a-f0-9]{64}$/);
const actualManifest = sha256NormalizedText(manifestPath);
assert.equal(actualManifest, expectedManifest);
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

assert.equal(manifest.schema_version, 1);
assert.equal(manifest.name, 'search_v2_beta1_existing_stage_reconciliation');
assert.equal(manifest.mode, 'existing_private_stage_read_only');
assert.equal(manifest.stage.id, 'efcd9a32-94aa-4a2d-a950-bca014b46c43');
assert.equal(manifest.package.name, '@supericons/mcp');
assert.equal(manifest.package.version, '0.4.19-beta.1');
assert.equal(manifest.package.tag, 'beta');
assert.equal(manifest.external_actions.additional_stage_uploads, 0);
assert.equal(manifest.external_actions.publications, 0);
assert.equal(manifest.external_actions.tag_changes, 0);
assert.equal(manifest.external_actions.deployments, 0);
assert.equal(manifest.external_actions.database_mutations, 0);
assert.equal(manifest.local_actions.maximum_verified_stage_records, 1);

const sourceManifestPath = join(repoRoot, manifest.source_release.manifest_path);
assert.equal(
  sha256NormalizedText(sourceManifestPath),
  manifest.source_release.manifest_sha256,
);
const source = JSON.parse(readFileSync(sourceManifestPath, 'utf8'));
assert.equal(source.package.name, manifest.package.name);
assert.equal(source.package.version, manifest.package.version);
assert.equal(source.package.publish_tag, manifest.package.tag);
assert.equal(source.package.archive_sha256, manifest.package.archive_sha256);
assert.equal(source.package.npm_shasum, manifest.package.npm_shasum);
assert.equal(source.package.npm_integrity, manifest.package.npm_integrity);
assert.equal(source.package.archive_size_bytes, manifest.package.archive_size_bytes);

const reconcilerPath = join(repoRoot, manifest.artifacts.reconciler);
assert.equal(
  sha256NormalizedText(reconcilerPath),
  manifest.artifacts.reconciler_sha256,
);
assert.equal(
  sha256NormalizedText(import.meta.filename),
  manifest.artifacts.verifier_sha256,
);
const reconcilerText = normalizedText(reconcilerPath);
assert.doesNotMatch(reconcilerText, /['"]stage['"]\s*,\s*['"]publish['"]/);
assert.doesNotMatch(reconcilerText, /['"]publish['"]\s*,\s*archive/i);
assert.doesNotMatch(reconcilerText, /['"]dist-tag['"]|supabase|railway|netlify/i);
assert.match(reconcilerText, /['"]stage['"]\s*,\s*['"]list['"]/);
assert.match(reconcilerText, /['"]stage['"]\s*,\s*['"]view['"]/);
assert.match(reconcilerText, /['"]stage['"]\s*,\s*['"]download['"]/);
assert.match(reconcilerText, /writeFileSync\(path,[\s\S]*flag: 'wx'/);

const selfTest = JSON.parse(execFileSync(process.execPath, [
  reconcilerPath,
  '--self-test',
], {
  cwd: repoRoot,
  encoding: 'utf8',
  windowsHide: true,
}));
assert.equal(selfTest.status, 'ok');
assert.equal(selfTest.missing_receipt_rejected, true);
assert.equal(selfTest.wrong_receipt_rejected, true);
assert.equal(selfTest.exact_stage_metadata_accepted, true);
assert.equal(selfTest.missing_stage_rejected, true);
assert.equal(selfTest.noisy_json_output_accepted, true);
assert.equal(selfTest.first_verified_record_writes, 1);
assert.equal(selfTest.second_verified_record_writes, 0);
assert.equal(selfTest.stage_publish_calls, 0);

const missingSwitch = spawnSync(process.execPath, [
  reconcilerPath,
  '--expected-manifest',
  actualManifest,
], {
  cwd: repoRoot,
  encoding: 'utf8',
  windowsHide: true,
});
assert.notEqual(missingSwitch.status, 0);
assert.match(
  `${missingSwitch.stdout}\n${missingSwitch.stderr}`,
  /disabled without the explicit execution switch/,
);
const wrongManifest = spawnSync(process.execPath, [
  reconcilerPath,
  '--execute-approved-reconciliation',
  '--expected-manifest',
  '0'.repeat(64),
], {
  cwd: repoRoot,
  encoding: 'utf8',
  windowsHide: true,
});
assert.notEqual(wrongManifest.status, 0);
assert.match(
  `${wrongManifest.stdout}\n${wrongManifest.stderr}`,
  /Expected values to be strictly equal/,
);

const stateRoot = process.env.LOCALAPPDATA
  ? join(process.env.LOCALAPPDATA, 'Supericons')
  : join(homedir(), '.supericons');
const receiptPath = join(
  stateRoot,
  'release-stage-attempts',
  `${manifest.source_release.manifest_sha256}.json`,
);
assert.equal(existsSync(receiptPath), true, 'The consumed source attempt receipt is missing');
const receipt = JSON.parse(readFileSync(receiptPath, 'utf8'));
assert.equal(receipt.schema_version, 1);
assert.equal(receipt.manifest_sha256, manifest.source_release.manifest_sha256);
assert.equal(receipt.package, `${manifest.package.name}@${manifest.package.version}`);
assert.equal(receipt.action, 'npm_stage_publish_reserved');
assert.doesNotMatch(JSON.stringify(receipt), /password|credential|token|secret/i);

const verifiedRecordPath = join(
  stateRoot,
  'staged-releases',
  `${manifest.source_release.manifest_sha256}.json`,
);
assert.equal(
  existsSync(verifiedRecordPath),
  false,
  'A verified stage record already exists, so the reconciliation packet is consumed',
);

for (const text of [normalizedText(manifestPath), reconcilerText]) {
  assert.doesNotMatch(text, /[\u2013\u2014]/);
}

console.log(JSON.stringify({
  status: 'ok',
  manifest_sha256: actualManifest,
  source_manifest_sha256: manifest.source_release.manifest_sha256,
  stage_id: manifest.stage.id,
  package: `${manifest.package.name}@${manifest.package.version}`,
  additional_stage_uploads: 0,
  publications: 0,
  tag_changes: 0,
  source_attempt_receipt_bound: true,
  verified_stage_record_absent: true,
  reconciler_self_test: 'passed',
  missing_execution_switch_rejected: true,
  wrong_manifest_rejected: true,
  noisy_json_output_probe: 'passed',
  atomic_record_replay_guard: 'passed',
}, null, 2));
