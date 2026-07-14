import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

function read(path) {
  return readFileSync(path, 'utf8');
}

function normalizedHash(value) {
  return createHash('sha256').update(value.replace(/\r\n?/g, '\n')).digest('hex');
}

function hash(path) {
  return normalizedHash(read(path));
}

assert.equal(normalizedHash('line one\nline two\n'), normalizedHash('line one\r\nline two\r\n'));

const runner = read('scripts/run-material-production-baseline.ps1');
const expectedHashes = {
  measurementRunner: 'ccc227f446ae18ec0212bb2582e5bfe3cf1c6297a935bc648e2c22576cb4f719',
  measurementProfile: '155a2391296732730d31a11556d54669e959c724613718c90b895da100970b2a',
  sharedBetaRunner: '774d698b94afa7adc40104226f603b9d13b3c07539eb7c7c9aa81904cf011018',
  profileVerifier: '4d3420f8a25320e202320e2080bb266ca0af08929cbdd0e0d98d65ffcdb2c4dd',
  artifactVerifier: 'cb242285317dae13a4cec97c05523b24cd116da364161a0363b809045f39b40c',
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
assert.match(runner, /function Get-NormalizedTextSha256/);
assert.match(runner, /\.Replace\("`r`n", "`n"\)\.Replace\("`r", "`n"\)/);
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
    source: 'verify',
    channel: 'internal_test',
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
  shared_beta_runner_normalized_hash_pinned: true,
  line_ending_independence_verified: true,
  production_audit_contract_verified: true,
  preview_tamper_rejected: true,
  output_overwrite_blocked: true,
  deploy_commands_present: false,
  publication_commands_present: false,
}, null, 2));
