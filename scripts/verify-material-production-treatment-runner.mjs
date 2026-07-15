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

const expectedHashes = {
  treatmentWrapper: 'f62a507623057bc88fdaffb0f8ea9f6769e3fa4a457224f4316fb6586cf4c958',
  measurementProfile: '155a2391296732730d31a11556d54669e959c724613718c90b895da100970b2a',
  sharedBetaRunner: '774d698b94afa7adc40104226f603b9d13b3c07539eb7c7c9aa81904cf011018',
  profileVerifier: '4d3420f8a25320e202320e2080bb266ca0af08929cbdd0e0d98d65ffcdb2c4dd',
  artifactVerifier: '2521fb0cfaf2dac7b44c7ec3db4e5453a312484f5aeae637dc4741727c7c275b',
  baselineSearch: '0344385fd16aac5aa6e55ff2a5dd5fd82f5f1f86230025025922ea1de27332ae',
  baselineRecommendation: '151ec835b5ac0e510510f692f395eee2169e461606470b9fae14a4c6714cea99',
};

assert.equal(hash('scripts/run-material-production-latency-treatment.mjs'), expectedHashes.treatmentWrapper);
assert.equal(hash('scripts/lib/search-measurement-profile.mjs'), expectedHashes.measurementProfile);
assert.equal(hash('scripts/run-search-v2-latency-measurement.mjs'), expectedHashes.sharedBetaRunner);
assert.equal(hash('scripts/verify-material-production-latency-profile.mjs'), expectedHashes.profileVerifier);
assert.equal(hash('scripts/verify-material-production-treatment-artifacts.mjs'), expectedHashes.artifactVerifier);
assert.equal(hash('tmp/material-baseline-search.json'), expectedHashes.baselineSearch);
assert.equal(hash('tmp/material-baseline-recommendation.json'), expectedHashes.baselineRecommendation);

const runner = read('scripts/run-material-production-treatment.ps1');
for (const expectedHash of Object.values(expectedHashes)) {
  assert.ok(runner.includes(expectedHash), `Treatment runner does not pin ${expectedHash}`);
}
assert.match(runner, /\[switch\]\$ExecuteApprovedMaterialProductionTreatment/);
assert.match(runner, /function Get-NormalizedTextSha256/);
assert.match(runner, /SUPERICONS_SEARCH_V2_MEASUREMENT_ENDPOINT = 'mcp-search'/);
assert.match(runner, /material-treatment-search\.json/);
assert.match(runner, /material-treatment-recommendation\.json/);
assert.match(runner, /--variant treatment/);
assert.match(runner, /--recommendation-path grouped/);
assert.match(runner, /already exists and will not be overwritten/);
assert.match(runner, /follow its rollback gate/);
assert.doesNotMatch(runner, /supabase\s+(?:db|functions)/i);
assert.doesNotMatch(runner, /railway\s+up/i);
assert.doesNotMatch(runner, /npm\s+(?:publish|unpublish)/i);

const wrapper = read('scripts/run-material-production-latency-treatment.mjs');
assert.match(wrapper, /ENDPOINT_NAME = 'mcp-search'/);
assert.match(wrapper, /material-treatment:/);
assert.match(wrapper, /measurement_phase: 'treatment'/);
assert.match(wrapper, /readArg\('variant'\), 'treatment'/);
assert.doesNotMatch(wrapper, /mcp-search-v2-beta/);

const productionRelease = read('scripts/verify-material-production-release.mjs');
assert.match(productionRelease, /source: 'verify'/);
assert.match(productionRelease, /channel: 'internal_test'/);
assert.match(productionRelease, /environment: 'production'/);

function treatmentArtifact(sourcePath, p95) {
  const artifact = JSON.parse(read(sourcePath));
  artifact.variant = 'treatment';
  artifact.measurement_phase = 'treatment';
  artifact.measurement_run_id = randomUUID();
  artifact.warm_summary.p95_ms = p95;
  return artifact;
}

function runVerifier(paths) {
  return spawnSync(process.execPath, [
    'scripts/verify-material-production-treatment-artifacts.mjs',
    '--baseline-search', 'tmp/material-baseline-search.json',
    '--baseline-recommendation', 'tmp/material-baseline-recommendation.json',
    '--treatment-search', paths.search,
    '--treatment-recommendation', paths.recommendation,
  ], { encoding: 'utf8' });
}

const temporaryDirectory = mkdtempSync(join(tmpdir(), 'supericons-material-treatment-'));
try {
  const paths = {
    search: join(temporaryDirectory, 'search.json'),
    recommendation: join(temporaryDirectory, 'recommendation.json'),
  };
  writeFileSync(paths.search, `${JSON.stringify(treatmentArtifact('tmp/material-baseline-search.json', 1500), null, 2)}\n`);
  writeFileSync(
    paths.recommendation,
    `${JSON.stringify(treatmentArtifact('tmp/material-baseline-recommendation.json', 500), null, 2)}\n`,
  );
  const valid = runVerifier(paths);
  assert.equal(valid.status, 0, valid.stderr || valid.stdout);

  writeFileSync(paths.search, `${JSON.stringify(treatmentArtifact('tmp/material-baseline-search.json', 2000.001), null, 2)}\n`);
  const slowSearch = runVerifier(paths);
  assert.notEqual(slowSearch.status, 0, 'Search treatment above 2,000 ms must fail.');

  writeFileSync(paths.search, `${JSON.stringify(treatmentArtifact('tmp/material-baseline-search.json', 1500), null, 2)}\n`);
  writeFileSync(
    paths.recommendation,
    `${JSON.stringify(treatmentArtifact('tmp/material-baseline-recommendation.json', 559.205), null, 2)}\n`,
  );
  const slowRecommendation = runVerifier(paths);
  assert.notEqual(slowRecommendation.status, 0, 'Recommendation regression above 100 ms must fail.');
} finally {
  rmSync(temporaryDirectory, { recursive: true, force: true });
}

console.log(JSON.stringify({
  status: 'ok',
  baseline_artifacts_pinned: true,
  treatment_outputs_write_once: true,
  stable_endpoint_pinned: true,
  treatment_audit_identity_pinned: true,
  search_absolute_gate_ms: 2000,
  search_regression_gate_ms: 100,
  recommendation_regression_gate_ms: 100,
  deploy_commands_present: false,
  publication_commands_present: false,
}, null, 2));
