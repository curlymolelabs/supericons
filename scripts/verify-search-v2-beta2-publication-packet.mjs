import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
} from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';

const repoRoot = resolve(import.meta.dirname, '..');
const args = process.argv.slice(2);
const manifestPath = join(
  repoRoot,
  'docs',
  'si-v2',
  'search',
  'reviews',
  'search-v2-beta2-publication-authorization-manifest-2026-07-20.json',
);
const approvalRequestPath = join(
  repoRoot,
  'docs',
  'si-v2',
  'search',
  'reviews',
  'search-v2-beta2-publication-approval-request-2026-07-20.md',
);
const defaultPrivateRecord = process.env.LOCALAPPDATA
  ? join(process.env.LOCALAPPDATA, 'Supericons', 'private', 'search-v2-engine-canaries.json')
  : join(homedir(), '.supericons', 'private', 'search-v2-engine-canaries.json');
const npmCli = process.platform === 'win32'
  ? join(dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js')
  : 'npm';
const powerShell = process.platform === 'win32' ? 'powershell.exe' : 'pwsh';

function getArgument(name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : null;
}

function sha256Buffer(value) {
  return createHash('sha256').update(value).digest('hex');
}

function sha256File(path) {
  return sha256Buffer(readFileSync(path));
}

function normalizedText(path) {
  return readFileSync(path, 'utf8').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

function sha256NormalizedText(path) {
  return sha256Buffer(Buffer.from(normalizedText(path), 'utf8'));
}

function run(executable, commandArgs, options = {}) {
  const result = spawnSync(executable, commandArgs, {
    cwd: options.cwd || repoRoot,
    encoding: 'utf8',
    windowsHide: true,
    maxBuffer: options.maxBuffer || 100 * 1024 * 1024,
    env: options.env || process.env,
  });
  assert.equal(
    result.status,
    0,
    `${executable} ${commandArgs.join(' ')} failed:\n${result.stdout || ''}\n${result.stderr || ''}`,
  );
  return `${result.stdout || ''}${result.stderr || ''}`;
}

function parseJsonOutput(text) {
  const source = String(text || '').trim();
  for (let start = 0; start < source.length; start += 1) {
    if (source[start] !== '{' && source[start] !== '[') continue;
    const opening = source[start];
    const closing = opening === '{' ? '}' : ']';
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let end = start; end < source.length; end += 1) {
      const character = source[end];
      if (inString) {
        if (escaped) escaped = false;
        else if (character === '\\') escaped = true;
        else if (character === '"') inString = false;
        continue;
      }
      if (character === '"') {
        inString = true;
        continue;
      }
      if (character === opening) depth += 1;
      if (character === closing) depth -= 1;
      if (depth !== 0) continue;
      try {
        return JSON.parse(source.slice(start, end + 1));
      } catch {
        break;
      }
    }
  }
  throw new Error('Command output did not contain a complete JSON value.');
}

function runJson(executable, commandArgs, options = {}) {
  return parseJsonOutput(run(executable, commandArgs, options));
}

function runNodeJson(commandArgs, options = {}) {
  return runJson(process.execPath, commandArgs, options);
}

function runPowerShellJson(commandArgs) {
  return runJson(powerShell, [
    '-NoProfile',
    '-ExecutionPolicy',
    'Bypass',
    ...commandArgs,
  ]);
}

function assertArtifactHash(manifest, name, hashName) {
  const path = join(repoRoot, manifest.artifacts[name]);
  assert.equal(existsSync(path), true, `${name} is missing.`);
  assert.equal(
    sha256NormalizedText(path),
    manifest.artifacts[hashName],
    `${name} changed after the manifest was prepared.`,
  );
}

const expectedManifestHash = getArgument('--expected-manifest');
assert.match(expectedManifestHash || '', /^[a-f0-9]{64}$/);
assert.equal(sha256NormalizedText(manifestPath), expectedManifestHash);
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const approvalRequest = readFileSync(approvalRequestPath, 'utf8');

assert.equal(manifest.schema_version, 1);
assert.equal(manifest.name, 'search_v2_beta2_publication');
assert.equal(manifest.package.name, '@supericons/mcp');
assert.equal(manifest.package.version, '0.4.19-beta.2');
assert.equal(manifest.package.publish_tag, 'beta');
assert.equal(manifest.package.latest_must_remain, '0.4.17');
assert.equal(manifest.package.rollback_beta_tag_to, '0.4.19-beta.1');
assert.equal(manifest.package.archive_sha256, '520c9c99986a4eddd2f7d38cf3f517be412953e4471669f0db9c24c6bfdcec73');
assert.equal(manifest.package.archive_size_bytes, 6132653);
assert.equal(manifest.package.file_count, 65);
assert.equal(manifest.package.npm_shasum, '1bf884205b55c57cf04d562f7ef9b9c4f0aea900');
assert.equal(
  manifest.package.npm_integrity,
  'sha512-40VCC6kk8oVY0bzOm4eq65vi7qhy5dKpDr97QQSAb/VCnBjlixrIUiAHu024qgVqhxb5Nhwimm8Kq8ld9J2+Eg==',
);
assert.equal(manifest.search_contract.fixed_cases, 225);
assert.equal(manifest.search_contract.eligible_stdio_cases, 150);
assert.equal(
  manifest.search_contract.fixed_fingerprint,
  '3e529b41a8eb1d175f20c9da51788fea7e101a0eb51795e305ccdb5641729777',
);
assert.equal(
  manifest.search_contract.stdio_route_fingerprint,
  '357d161cf6059b9371ea38591f267f623e43e37cfd680cb5a097af50861c1659',
);
assert.equal(manifest.search_contract.beta1_matrix_cases, 14);
assert.equal(manifest.public_bundle.vc3_required, true);
assert.equal(manifest.public_bundle.vc4_required, true);
assert.equal(manifest.public_bundle.private_record_sha256, 'abed31fb65d8ae606680ac55e862ef2f06a091617e3c266b79ecd12c2fd03963');
assert.equal(manifest.public_bundle.third_party_provenance_sha256, 'e86d3d35ad3b5bd1436d19d3c44964a5693ff3044db21480511f0e4b26628a94');
assert.equal(manifest.publication_flow.mode, 'npm_staged_browser_security_key');
assert.equal(manifest.publication_attempts.maximum_additional_stage_commands, 1);
assert.equal(manifest.external_actions.maximum_private_npm_staged_uploads, 1);
assert.equal(manifest.external_actions.maximum_npm_prerelease_publications, 1);
assert.equal(manifest.external_actions.maximum_conditional_npm_deprecations, 1);
assert.equal(manifest.external_actions.maximum_beta_tag_rollbacks, 1);
assert.equal(manifest.external_actions.npm_latest_changes, 0);
assert.equal(manifest.external_actions.function_deployments, 0);
assert.equal(manifest.external_actions.database_mutations, 0);
assert.equal(manifest.external_actions.web_deployments, 0);
assert.equal(manifest.external_actions.model_provider_calls, 0);

for (const [name, hashName] of [
  ['stager', 'stager_sha256'],
  ['postapproval_finalizer', 'postapproval_finalizer_sha256'],
  ['published_smoke', 'published_smoke_sha256'],
  ['protected_builder', 'protected_builder_sha256'],
  ['protected_verifier', 'protected_verifier_sha256'],
  ['matrix_verifier', 'matrix_verifier_sha256'],
  ['incident_verifier', 'incident_verifier_sha256'],
  ['packet_verifier', 'packet_verifier_sha256'],
]) {
  assertArtifactHash(manifest, name, hashName);
}

const status = execFileSync('git', ['status', '--porcelain'], {
  cwd: repoRoot,
  encoding: 'utf8',
  windowsHide: true,
});
assert.equal(status.trim(), '', 'The beta.2 publication worktree must be clean.');
run('git', ['merge-base', '--is-ancestor', manifest.implementation.package_source_commit, 'HEAD']);
const packageSourceChanges = execFileSync('git', [
  'diff',
  '--name-only',
  `${manifest.implementation.package_source_commit}..HEAD`,
  '--',
  'mcp',
  'lib',
  'public',
  'data/product-facts.json',
  'data/search-intent-fixtures',
  'data/search-intent-graph',
], {
  cwd: repoRoot,
  encoding: 'utf8',
  windowsHide: true,
}).trim();
assert.equal(packageSourceChanges, '', 'Packaged source changed after the protected archive commit.');

const approvedArchive = join(repoRoot, manifest.package.archive_path);
assert.equal(existsSync(approvedArchive), true, 'The approved beta.2 archive is missing.');
assert.equal(sha256File(approvedArchive), manifest.package.archive_sha256);
assert.equal(readFileSync(approvedArchive).length, manifest.package.archive_size_bytes);

const temporaryRoot = mkdtempSync(join(tmpdir(), 'search-v2-beta2-packet-'));
try {
  const protectedRoot = join(temporaryRoot, 'protected');
  const archiveRoot = join(temporaryRoot, 'archive');
  run(process.execPath, [
    join(repoRoot, manifest.artifacts.protected_builder),
    '--source-root',
    repoRoot,
    '--source-commit',
    manifest.implementation.package_source_commit,
    '--output-root',
    protectedRoot,
    '--private-record',
    defaultPrivateRecord,
    '--expected-record-sha256',
    manifest.public_bundle.private_record_sha256,
  ]);
  mkdirSync(archiveRoot, { recursive: true });
  const pack = runJson(
    process.execPath,
    [
      ...(npmCli === 'npm' ? [] : [npmCli]),
      'pack',
      '--ignore-scripts',
      '--json',
      '--pack-destination',
      archiveRoot,
    ],
    { cwd: join(protectedRoot, 'npm') },
  )[0];
  assert.equal(pack.name, manifest.package.name);
  assert.equal(pack.version, manifest.package.version);
  assert.equal(pack.size, manifest.package.archive_size_bytes);
  assert.equal(pack.unpackedSize, manifest.package.unpacked_size_bytes);
  assert.equal(pack.entryCount, manifest.package.file_count);
  assert.equal(pack.shasum, manifest.package.npm_shasum);
  assert.equal(pack.integrity, manifest.package.npm_integrity);
  const rebuiltArchive = join(archiveRoot, basename(pack.filename));
  assert.equal(sha256File(rebuiltArchive), manifest.package.archive_sha256);
} finally {
  rmSync(temporaryRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}

const phaseParity = runNodeJson([join(repoRoot, 'scripts', 'verify-search-v2-phase1-parity.mjs')]);
assert.equal(phaseParity.status, 'ok');
assert.equal(phaseParity.fixed_suite_cases_executed, 225);
assert.equal(phaseParity.deterministic_result_fingerprint, manifest.search_contract.fixed_fingerprint);

const packageRoute = runNodeJson([
  join(repoRoot, 'scripts', 'verify-search-v2-tool-scoped-package.mjs'),
]);
assert.equal(packageRoute.status, 'ok');
assert.equal(packageRoute.stdio_route_fingerprint, manifest.search_contract.stdio_route_fingerprint);

const matrix = runNodeJson([
  join(repoRoot, manifest.artifacts.matrix_verifier),
  '--tarball',
  approvedArchive,
]);
assert.equal(matrix.status, 'ok');
assert.equal(matrix.passed, 14);
assert.equal(matrix.failed, 0);

const installedSmoke = runNodeJson([
  join(repoRoot, manifest.artifacts.published_smoke),
  '--package-spec',
  approvedArchive,
  '--expected-version',
  manifest.package.version,
  '--expected-route-fingerprint',
  manifest.search_contract.stdio_route_fingerprint,
]);
assert.equal(installedSmoke.status, 'ok');
assert.equal(installedSmoke.eligible_stdio_cases, 150);
assert.equal(installedSmoke.hosted_calls, 0);

const protection = runNodeJson([
  join(repoRoot, manifest.artifacts.protected_verifier),
  '--expected-record-sha256',
  manifest.public_bundle.private_record_sha256,
  '--expected-provenance-sha256',
  manifest.public_bundle.third_party_provenance_sha256,
]);
assert.equal(protection.status, 'ok');
assert.equal(protection.probes['VC-3_bundle_content'], 'passed_npm_and_web');
assert.equal(protection.probes['VC-4_license_and_canary'], 'passed_npm_and_web');

const incident = runNodeJson([join(repoRoot, manifest.artifacts.incident_verifier)]);
assert.equal(incident.status, 'ok');
assert.equal(incident.package_version, manifest.package.version);
assert.equal(incident.rollback_beta_tag_to, manifest.package.rollback_beta_tag_to);

run(npmCli === 'npm' ? 'npm' : process.execPath, [
  ...(npmCli === 'npm' ? [] : [npmCli]),
  '--prefix',
  'mcp',
  'run',
  'prepublishOnly',
]);
const audit = runJson(npmCli === 'npm' ? 'npm' : process.execPath, [
  ...(npmCli === 'npm' ? [] : [npmCli]),
  'audit',
  '--prefix',
  'mcp',
  '--omit=dev',
  '--json',
]);
assert.equal(audit.metadata.vulnerabilities.total, 0);

const stageAttempt = runPowerShellJson([
  '-File',
  join(repoRoot, manifest.artifacts.stager),
  '-RunStageAttemptSelfTest',
]);
assert.equal(stageAttempt.status, 'ok');
assert.equal(stageAttempt.first_execution_stage_calls, 1);
assert.equal(stageAttempt.second_execution_stage_calls, 0);
const stagedVerification = runPowerShellJson([
  '-File',
  join(repoRoot, manifest.artifacts.stager),
  '-RunStagedVerificationSelfTest',
]);
assert.equal(stagedVerification.status, 'ok');

for (const scenario of [
  'integrity_mismatch',
  'tag_mismatch',
  'smoke_failure',
  'already_deprecated',
]) {
  const rollback = runPowerShellJson([
    '-File',
    join(repoRoot, manifest.artifacts.postapproval_finalizer),
    '-RunRollbackSelfTest',
    '-RollbackTestScenario',
    scenario,
  ]);
  assert.equal(rollback.status, 'ok');
  assert.equal(rollback.publish_calls, 0);
  assert.equal(rollback.latest_mutation_calls, 0);
  if (scenario !== 'already_deprecated') {
    assert.equal(rollback.beta_tag_rollback_calls, 1);
  }
}

for (const mode of [
  ['-RunStageRecordSelfTest'],
  ['-RunFinalizationOutcomeSelfTest'],
  ['-RunOuterFlowRollbackSelfTest', '-OuterFlowTestScenario', 'packet_verifier_failure'],
  ['-RunOuterFlowRollbackSelfTest', '-OuterFlowTestScenario', 'authentication_failure'],
]) {
  const result = runPowerShellJson([
    '-File',
    join(repoRoot, manifest.artifacts.postapproval_finalizer),
    ...mode,
  ]);
  assert.equal(result.status, 'ok');
  if (mode[0] === '-RunOuterFlowRollbackSelfTest') {
    assert.equal(result.beta_tag_rollback_calls, 1);
    assert.equal(result.latest_mutation_calls, 0);
  }
}

assert.match(approvalRequest, new RegExp(expectedManifestHash));
assert.match(approvalRequest, /npm-only/);
assert.match(approvalRequest, /No Railway, Supabase, database, or web deployment/);
for (const text of [
  normalizedText(manifestPath),
  approvalRequest,
  normalizedText(join(repoRoot, manifest.artifacts.stager)),
  normalizedText(join(repoRoot, manifest.artifacts.postapproval_finalizer)),
  normalizedText(join(repoRoot, manifest.artifacts.packet_verifier)),
]) {
  assert.doesNotMatch(text, /[\u2013\u2014]/);
}

const expectedProbeIds = [
  'archive_byte_identity',
  'package_source_freeze',
  'fixed_225_fingerprint',
  'installed_150_route',
  'beta1_14_case_matrix',
  'vc3_vc4_public_boundary',
  'incident_guardrails',
  'prepublish_suite',
  'dependency_audit_zero',
  'single_use_stage',
  'staged_download_verification',
  'postapproval_replay',
  'exact_prerelease_deprecation',
  'beta_tag_rollback',
  'latest_unchanged',
  'owner_request_binding',
];
assert.deepEqual(manifest.probe_inventory, expectedProbeIds);

console.log(JSON.stringify({
  status: 'ok',
  manifest_sha256: expectedManifestHash,
  source_commit: manifest.implementation.package_source_commit,
  archive_sha256: manifest.package.archive_sha256,
  package: `${manifest.package.name}@${manifest.package.version}`,
  probes: Object.fromEntries(expectedProbeIds.map((id) => [id, 'passed'])),
  fixed_fingerprint: phaseParity.deterministic_result_fingerprint,
  route_fingerprint: installedSmoke.stdio_route_fingerprint,
  matrix_passed: matrix.passed,
  installed_hosted_calls: installedSmoke.hosted_calls,
  rollback_beta_tag_to: manifest.package.rollback_beta_tag_to,
  latest_must_remain: manifest.package.latest_must_remain,
  dependency_vulnerabilities: audit.metadata.vulnerabilities.total,
  packed_files: readdirSync(join(repoRoot, 'mcp')).length > 0 ? manifest.package.file_count : 0,
}, null, 2));
