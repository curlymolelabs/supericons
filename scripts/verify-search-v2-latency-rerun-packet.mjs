import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const manifestPath = 'docs/si-v2/search/reviews/search-v2-latency-rerun-authorization-manifest-2026-07-13.json';
const packetPath = 'docs/si-v2/search/reviews/search-v2-latency-rerun-approval-request-2026-07-13.md';
const evidencePath = 'references/verification/search-v2-latency-rerun-preparation-2026-07-13.md';
const expectedManifestHash = '5be12fca18ad902af3569366691a17bbfaafb6114cec4dc413945c8d18c586c6';

function read(path) {
  return readFileSync(path, 'utf8');
}

function gitShow(commit, path) {
  return execFileSync('git', ['show', `${commit}:${path}`], { encoding: 'utf8' });
}

const manifestText = read(manifestPath);
const manifest = JSON.parse(manifestText);
const packet = read(packetPath);
const evidence = read(evidencePath);
const runner = read('scripts/run-search-v2-latency-measurement.mjs');
const liveParityVerifier = read('scripts/verify-search-v2-live-parity-artifacts.mjs');
const manifestHash = createHash('sha256').update(manifestText).digest('hex');

assert.equal(manifestHash, expectedManifestHash);
assert.equal(manifest.status, 'awaiting_owner_approval');
assert.equal(manifest.base_commit, '5a2d054af');
assert.equal(manifest.control_commit, '53191e366');
assert.equal(manifest.treatment_commit, '87c445b7c');
assert.equal(manifest.database.sql_mutations_authorized, 0);
assert.equal(manifest.database.history_repairs_authorized, 0);
assert.equal(manifest.limits.maximum_function_deployments, 6);
assert.equal(manifest.limits.npm_publications, 0);
assert.equal(manifest.limits.production_function_deployments, 0);
assert.equal(manifest.limits.model_provider_calls, 0);
assert.equal(manifest.parity_precheck.requests_per_case_per_variant, 3);
assert.equal(manifest.parity_precheck.must_pass_before_latency, true);
assert.equal(manifest.parity_precheck.cases.length, 5);
assert.ok(manifest.parity_precheck.cases.find((entry) => entry.case_id === 'cog-bootstrap-strict')?.minimum_results >= 1);
assert.ok(manifest.parity_precheck.cases.find((entry) => entry.case_id === 'settings-zh-hans-expanded')?.minimum_results >= 1);
assert.deepEqual(manifest.deployment_sequence, [
  'control_parity',
  'treatment_parity',
  'control_search',
  'treatment_search',
  'control_recommendation',
  'treatment_recommendation',
]);

const changedFiles = execFileSync(
  'git',
  ['diff', '--name-only', manifest.control_commit, manifest.treatment_commit],
  { encoding: 'utf8' },
).trim().split(/\r?\n/).filter(Boolean);
assert.deepEqual(changedFiles, ['supabase/functions/mcp-search-v2-beta/index.ts']);

const variantDiff = execFileSync(
  'git',
  ['diff', manifest.control_commit, manifest.treatment_commit, '--', changedFiles[0]],
  { encoding: 'utf8' },
);
for (const expected of [
  "measurementVariant: 'treatment'",
  "candidateRpcName: 'si_search_icon_candidates_v2'",
  'hydrateFinalSvg: true',
]) {
  assert.ok(variantDiff.includes(expected), `Treatment diff is missing ${expected}`);
}

for (const commit of [manifest.control_commit, manifest.treatment_commit]) {
  assert.match(gitShow(commit, 'lib/hosted-search-core.js'), /a\.icon_id\.localeCompare\(b\.icon_id\)/);
  assert.match(gitShow(commit, 'lib/search-ranking-policy.js'), /variant !== normalizedQuery/);
}

for (const mode of ['parity', 'search', 'localized', 'recommendation']) {
  assert.ok(runner.includes(`'${mode}'`), `Measurement runner is missing ${mode} mode`);
}
assert.match(runner, /--manifest-hash/);
assert.match(runner, /for \(let repetition = 0; repetition < 3/);
assert.match(runner, /query: '设置'/);
assert.match(liveParityVerifier, /--manifest/);
assert.match(liveParityVerifier, /minimum_results/);

for (const artifact of [packet, evidence]) {
  assert.ok(artifact.includes(expectedManifestHash));
  assert.ok(artifact.includes(manifest.control_commit));
  assert.ok(artifact.includes(manifest.treatment_commit));
}
assert.match(packet, /No SQL mutation, production function deployment, npm publication, scheduled warm ping, or model-provider call is authorized/);
assert.match(packet, /Repeated parity is a separate gate before latency sampling/);
assert.match(packet, /Twenty warm recommendations per variant/);
assert.match(packet, /safe stage evidence cannot be produced, the measurement is incomplete/);

console.log(JSON.stringify({
  status: 'ok',
  manifest_sha256: manifestHash,
  base_commit: manifest.base_commit,
  control_commit: manifest.control_commit,
  treatment_commit: manifest.treatment_commit,
  control_treatment_changed_files: changedFiles,
  maximum_function_deployments: manifest.limits.maximum_function_deployments,
  sql_mutations_authorized: manifest.database.sql_mutations_authorized,
  npm_publications_authorized: manifest.limits.npm_publications,
  production_function_deployments_authorized: manifest.limits.production_function_deployments,
}, null, 2));
