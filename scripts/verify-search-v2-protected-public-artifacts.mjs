import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
} from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join, relative, resolve, sep } from 'node:path';

const args = process.argv.slice(2);
const repoRoot = resolve(import.meta.dirname, '..');
const builderPath = join(repoRoot, 'scripts', 'build-search-v2-protected-public-artifacts.mjs');
const defaultPrivateRecord = process.env.LOCALAPPDATA
  ? join(process.env.LOCALAPPDATA, 'Supericons', 'private', 'search-v2-engine-canaries.json')
  : join(homedir(), '.supericons', 'private', 'search-v2-engine-canaries.json');

function getArgument(name, fallback = null) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : fallback;
}

function sha256File(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function sha256TextFile(path) {
  const normalized = readFileSync(path, 'utf8').replace(/\r\n/g, '\n');
  return createHash('sha256').update(normalized, 'utf8').digest('hex');
}

const requiredThirdPartyIds = [
  'bootstrap-icons',
  'feather',
  'heroicons',
  'iconoir',
  'ionicons',
  'lucide',
  'material',
  'mingcute',
  'phosphor',
  'simple-icons',
  'tabler',
];

function walkFiles(root) {
  const output = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) output.push(...walkFiles(path));
    else output.push(path);
  }
  return output;
}

function verifyProtectedClasses(surfaceRoot, policy) {
  const textExtensions = /\.(?:js|json|md|txt)$/i;
  for (const file of walkFiles(surfaceRoot)) {
    const normalizedPath = `/${relative(surfaceRoot, file).split(sep).join('/')}`.toLowerCase();
    for (const segment of policy.public_forbidden_path_segments) {
      assert.equal(
        normalizedPath.includes(segment.toLowerCase()),
        false,
        `VC-3 protected path entered the public surface: ${normalizedPath}`,
      );
    }
    if (!textExtensions.test(file)) continue;
    const text = readFileSync(file, 'utf8').toLowerCase();
    for (const protectedClass of policy.protected_classes) {
      for (const identifier of protectedClass.public_forbidden_identifiers) {
        assert.equal(
          text.includes(identifier.toLowerCase()),
          false,
          `VC-3 protected class ${protectedClass.id} entered ${normalizedPath}`,
        );
      }
    }
  }
}

function verifyCanaries(sourceRoot, npmRoot, webRoot, privateRecord) {
  const sourceSynonyms = JSON.parse(readFileSync(join(sourceRoot, 'mcp', 'public', 'synonyms.json')));
  const npmSynonyms = JSON.parse(readFileSync(join(npmRoot, 'public', 'synonyms.json')));
  const webSynonyms = JSON.parse(readFileSync(join(webRoot, 'synonyms.json')));
  for (const entry of privateRecord.entries) {
    assert.equal(sourceSynonyms[entry.target].includes(entry.alias), false);
    assert.equal(npmSynonyms[entry.target].includes(entry.alias), true);
    assert.equal(webSynonyms[entry.target].includes(entry.alias), true);
  }
}

function verifyThirdPartySurface(surfaceRoot, expectedProvenanceHash) {
  const provenancePath = join(surfaceRoot, 'THIRD_PARTY_PROVENANCE.json');
  assert.equal(existsSync(provenancePath), true, 'VC-4 provenance file is missing');
  assert.equal(sha256File(provenancePath), expectedProvenanceHash);
  const provenance = JSON.parse(readFileSync(provenancePath, 'utf8'));
  assert.equal(provenance.schema_version, 1);
  assert.deepEqual(
    provenance.entries.map((entry) => entry.id).sort(),
    requiredThirdPartyIds,
  );
  for (const entry of provenance.entries) {
    assert.match(entry.license_spdx, /^[A-Za-z0-9-.+ ]+(?:AND [A-Za-z0-9-.+ ]+)?$/);
    assert.match(entry.license_sha256, /^[a-f0-9]{64}$/);
    const licensePath = join(surfaceRoot, entry.license_file);
    assert.equal(existsSync(licensePath), true, `VC-4 license file is missing for ${entry.id}`);
    assert.equal(sha256TextFile(licensePath), entry.license_sha256);
    if (entry.source_kind === 'npm') {
      assert.match(entry.source_version, /^\d+\.\d+\.\d+/);
      assert.match(entry.source_archive_integrity, /^sha512-/);
    } else {
      assert.equal(entry.id, 'material');
      assert.equal(entry.source_revision, '30f8fddd293b1f0189896dc4aaecdfaba1d37ae0');
    }
    if (entry.notice_file) {
      assert.match(entry.notice_sha256, /^[a-f0-9]{64}$/);
      const noticePath = join(surfaceRoot, entry.notice_file);
      assert.equal(existsSync(noticePath), true, `VC-4 notice file is missing for ${entry.id}`);
      assert.equal(sha256TextFile(noticePath), entry.notice_sha256);
    } else {
      assert.equal(entry.notice_sha256, null);
      assert.match(entry.notice_status, /not_present|contains_no_notice/);
    }
  }
  return provenance;
}

function verifyLicense(npmRoot, webRoot, expectedProvenanceHash) {
  const packageJson = JSON.parse(readFileSync(join(npmRoot, 'package.json'), 'utf8'));
  assert.equal(packageJson.license, 'SEE LICENSE IN LICENSE');
  assert.equal(packageJson.files.includes('LICENSE'), true);
  assert.equal(packageJson.files.includes('THIRD_PARTY_LICENSES/'), true);
  assert.equal(packageJson.files.includes('THIRD_PARTY_NOTICES.md'), true);
  assert.equal(packageJson.files.includes('THIRD_PARTY_PROVENANCE.json'), true);
  assert.match(readFileSync(join(npmRoot, 'LICENSE'), 'utf8'), /Supericons MCP Engine License 1\.0/);
  const npmNotices = readFileSync(join(npmRoot, 'THIRD_PARTY_NOTICES.md'), 'utf8');
  const webNotices = readFileSync(join(webRoot, 'third-party-notices.md'), 'utf8');
  const npmProvenance = verifyThirdPartySurface(npmRoot, expectedProvenanceHash);
  const webProvenance = verifyThirdPartySurface(webRoot, expectedProvenanceHash);
  assert.deepEqual(webProvenance, npmProvenance);
  for (const entry of npmProvenance.entries) {
    assert.equal(
      readFileSync(join(npmRoot, entry.license_file)).equals(
        readFileSync(join(webRoot, entry.license_file)),
      ),
      true,
    );
    assert.match(npmNotices, new RegExp(entry.display_name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  assert.match(webNotices, /THIRD_PARTY_PROVENANCE\.json/);
  assert.match(readFileSync(join(webRoot, 'search-engine-license.txt'), 'utf8'), /may not extract/);
  assert.match(webNotices, /Third-Party Icon Notices/);
}

function verifyMinification(sourceRoot, npmRoot, webRoot, policy) {
  for (const path of policy.minified_generated_modules) {
    const sourceName = path.replace(/^runtime\//, '');
    const sourceNpm = readFileSync(join(sourceRoot, 'mcp', path), 'utf8');
    const stagedNpm = readFileSync(join(npmRoot, path), 'utf8');
    const sourceWeb = readFileSync(join(sourceRoot, 'lib', sourceName), 'utf8');
    const stagedWeb = readFileSync(join(webRoot, 'runtime', sourceName), 'utf8');
    assert.ok(Buffer.byteLength(stagedNpm) < Buffer.byteLength(sourceNpm) * 0.8);
    assert.ok(Buffer.byteLength(stagedWeb) < Buffer.byteLength(sourceWeb) * 0.8);
    assert.doesNotMatch(stagedNpm, /Do not edit by hand|Generated by/);
    assert.doesNotMatch(stagedWeb, /Do not edit by hand|Generated by/);
  }
}

function requireRejected(result, pattern) {
  assert.notEqual(result.status, 0);
  assert.match(`${result.stdout || ''}\n${result.stderr || ''}`, pattern);
}

const privateRecordPath = resolve(getArgument('--private-record', defaultPrivateRecord));
if (!existsSync(privateRecordPath)) {
  throw new Error(`Private canary record is missing at ${privateRecordPath}. VC-4 fails closed.`);
}
const expectedPrivateRecordHash = getArgument('--expected-record-sha256', sha256File(privateRecordPath));
assert.match(expectedPrivateRecordHash, /^[a-f0-9]{64}$/);
assert.equal(sha256File(privateRecordPath), expectedPrivateRecordHash);
const sourceProvenancePath = join(repoRoot, 'mcp', 'THIRD_PARTY_PROVENANCE.json');
const expectedProvenanceHash = getArgument(
  '--expected-provenance-sha256',
  sha256File(sourceProvenancePath),
);
assert.match(expectedProvenanceHash, /^[a-f0-9]{64}$/);
assert.equal(sha256File(sourceProvenancePath), expectedProvenanceHash);
const privateRecord = JSON.parse(readFileSync(privateRecordPath, 'utf8'));
const policy = JSON.parse(readFileSync(
  join(repoRoot, 'data', 'search-intent-graph', 'public-bundle-policy.json'),
  'utf8',
));
assert.deepEqual(policy.charter_requirements, ['VC-3', 'VC-4']);
assert.deepEqual(policy.protected_classes.map((entry) => entry.id), [
  'usage_derived_ranking_weights',
  'query_behavior_signals',
  'community_curation_data',
  'contributor_reputation_data',
  'paid_design_intelligence',
]);

const temporaryRoot = mkdtempSync(join(tmpdir(), 'search-v2-protected-public-'));
try {
  execFileSync(process.execPath, [
    builderPath,
    '--source-root',
    repoRoot,
    '--output-root',
    temporaryRoot,
    '--expected-record-sha256',
    expectedPrivateRecordHash,
  ], {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const npmRoot = join(temporaryRoot, 'npm');
  const webRoot = join(temporaryRoot, 'web');
  verifyProtectedClasses(npmRoot, policy);
  verifyProtectedClasses(webRoot, policy);
  verifyCanaries(repoRoot, npmRoot, webRoot, privateRecord);
  verifyLicense(npmRoot, webRoot, expectedProvenanceHash);
  verifyMinification(repoRoot, npmRoot, webRoot, policy);

  const missingRecord = join(temporaryRoot, 'missing-private-record.json');
  requireRejected(spawnSync(process.execPath, [
    builderPath,
    '--source-root',
    repoRoot,
    '--output-root',
    join(temporaryRoot, 'missing-output'),
    '--private-record',
    missingRecord,
    '--expected-record-sha256',
    expectedPrivateRecordHash,
  ], { cwd: repoRoot, encoding: 'utf8' }), /Private canary record is missing/);

  requireRejected(spawnSync(process.execPath, [
    builderPath,
    '--source-root',
    repoRoot,
    '--output-root',
    join(temporaryRoot, 'wrong-hash-output'),
    '--private-record',
    privateRecordPath,
    '--expected-record-sha256',
    '0'.repeat(64),
  ], { cwd: repoRoot, encoding: 'utf8' }), /Expected values to be strictly equal/);

  console.log(JSON.stringify({
    status: 'ok',
    probes: {
      'VC-3_bundle_content': 'passed_npm_and_web',
      'VC-4_license_and_canary': 'passed_npm_and_web',
    },
    private_record_sha256: expectedPrivateRecordHash,
    third_party_provenance_sha256: expectedProvenanceHash,
    third_party_source_count: requiredThirdPartyIds.length,
    canary_count: privateRecord.entries.length,
    private_record_missing_probe: 'rejected',
    private_record_hash_mismatch_probe: 'rejected',
    source_canaries_absent: true,
    staged_modules_minified: policy.minified_generated_modules.length,
  }, null, 2));
} finally {
  rmSync(temporaryRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
