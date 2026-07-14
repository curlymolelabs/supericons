import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

function read(path) {
  return readFileSync(path, 'utf8');
}

function hash(path) {
  return createHash('sha256').update(read(path)).digest('hex');
}

const runner = read('scripts/run-material-production-baseline.ps1');
const expectedHashes = {
  measurementRunner: '710d88083f9768c7bfa2d52fd6272a4e8edd519440f1bd694eb4d23938cb7b41',
  measurementProfile: '5e8260820c401b5e70401a3580fcc7956336b4fe230a31cd9bf84777df2050ec',
  sharedBetaRunner: 'e7be5a51fb3d449285a4929c3e343b0134fa781ea56dbbbbe191938ed57ba1a9',
  profileVerifier: 'ae929b27138c989fdfdc15150c7e04b09c6976a24e19effb504c84a1efe46dbb',
  artifactVerifier: '3566158976047eede62c8556e998ec62fd2f722899182519574b262bbd6df96e',
};

assert.equal(hash('scripts/run-material-production-latency-baseline.mjs'), expectedHashes.measurementRunner);
assert.equal(hash('scripts/lib/search-measurement-profile.mjs'), expectedHashes.measurementProfile);
assert.equal(hash('scripts/run-search-v2-latency-measurement.mjs'), expectedHashes.sharedBetaRunner);
assert.equal(hash('scripts/verify-material-production-latency-profile.mjs'), expectedHashes.profileVerifier);
assert.equal(hash('scripts/verify-material-production-latency-artifacts.mjs'), expectedHashes.artifactVerifier);
for (const expectedHash of Object.values(expectedHashes)) {
  assert.ok(runner.includes(expectedHash), `Packet 3 runner does not pin ${expectedHash}`);
}

assert.match(runner, /\[switch\]\$ExecuteApprovedMaterialProductionBaseline/);
assert.match(runner, /SUPERICONS_SEARCH_V2_MEASUREMENT_ENDPOINT = 'mcp-search'/);
assert.match(runner, /material-baseline-search\.json/);
assert.match(runner, /material-baseline-recommendation\.json/);
assert.match(runner, /--mode search/);
assert.match(runner, /--mode recommendation/);
assert.match(runner, /--recommendation-path grouped/);
assert.match(runner, /verify-material-production-latency-artifacts\.mjs/);
assert.match(runner, /Packet 3 output already exists and will not be overwritten/);
assert.match(runner, /Remove-Item Env:SUPERICONS_SEARCH_V2_MEASUREMENT_ENDPOINT/);
assert.doesNotMatch(runner, /supabase\s+(?:db|functions)/i);
assert.doesNotMatch(runner, /railway\s+up/i);
assert.doesNotMatch(runner, /npm\s+(?:publish|unpublish)/i);

const temporaryDirectory = mkdtempSync(join(tmpdir(), 'supericons-material-baseline-'));
try {
  const manifestHash = '5'.repeat(64);
  const auditContract = {
    source: 'mcp',
    channel: 'hosted_mcp',
    environment: 'production',
    client_family: 'material_release_latency',
    beta_cohort: null,
  };
  const makeArtifact = (mode, samples, requests) => ({
    schema_version: 1,
    manifest_sha256: manifestHash,
    measured_at: new Date(0).toISOString(),
    mode,
    variant: 'control',
    endpoint: 'mcp-search',
    ...(mode === 'recommendation' ? { recommendation_path: 'grouped' } : {}),
    first_request: { ok: true, duration_ms: 1 },
    warm_summary: { samples, successful: samples, errors: 0, p95_ms: 1 },
    warm_samples: [],
    measurement_profile: 'production',
    measurement_run_id: randomUUID(),
    sanitized_request_count: requests,
    audit_contract: auditContract,
  });
  const searchPath = join(temporaryDirectory, 'search.json');
  const recommendationPath = join(temporaryDirectory, 'recommendation.json');
  writeFileSync(searchPath, `${JSON.stringify(makeArtifact('search', 25, 26), null, 2)}\n`);
  writeFileSync(recommendationPath, `${JSON.stringify(makeArtifact('recommendation', 20, 21), null, 2)}\n`);

  const valid = spawnSync(process.execPath, [
    'scripts/verify-material-production-latency-artifacts.mjs',
    '--search', searchPath,
    '--recommendation', recommendationPath,
    '--manifest-hash', manifestHash,
  ], { encoding: 'utf8' });
  assert.equal(valid.status, 0, valid.stderr || valid.stdout);

  const tampered = JSON.parse(read(searchPath));
  tampered.audit_contract.environment = 'preview';
  writeFileSync(searchPath, `${JSON.stringify(tampered, null, 2)}\n`);
  const invalid = spawnSync(process.execPath, [
    'scripts/verify-material-production-latency-artifacts.mjs',
    '--search', searchPath,
    '--recommendation', recommendationPath,
    '--manifest-hash', manifestHash,
  ], { encoding: 'utf8' });
  assert.notEqual(invalid.status, 0, 'Preview-tagged production baseline should be rejected.');
} finally {
  rmSync(temporaryDirectory, { recursive: true, force: true });
}

console.log(JSON.stringify({
  status: 'ok',
  stable_endpoint_pinned: true,
  shared_beta_runner_hash_pinned: true,
  production_audit_contract_verified: true,
  preview_tamper_rejected: true,
  output_overwrite_blocked: true,
  deploy_commands_present: false,
  publication_commands_present: false,
}, null, 2));
