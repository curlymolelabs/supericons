import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

function read(path) {
  return readFileSync(path, 'utf8');
}

const manifestPath = 'docs/si-v2/search/reviews/search-v2-latency-gate-a-authorization-manifest-2026-07-13.json';
const packetPath = 'docs/si-v2/search/reviews/search-v2-latency-gate-a-approval-request-2026-07-13.md';
const evidencePath = 'references/verification/search-v2-latency-gate-a-preparation-2026-07-13.md';
const expectedManifestHash = 'fcdfaeef7f19af49536438ca1518655813fcffd103866d352cdb792c6821bb25';

const manifestText = read(manifestPath);
const manifest = JSON.parse(manifestText);
const packet = read(packetPath);
const evidence = read(evidencePath);
const manifestHash = createHash('sha256').update(manifestText).digest('hex');

assert.equal(manifestHash, expectedManifestHash);
assert.equal(manifest.status, 'awaiting_owner_approval');
assert.equal(manifest.control_commit, 'ba7f7ea18');
assert.equal(manifest.treatment_commit, 'cacd283cb');
assert.equal(manifest.migration.sha256, '8ad558920ae3565bd26fe3706a1ba8ef0e8c3b2ac9ddafce9f7b15e995ede42e');
assert.equal(manifest.measurement.warm_search_samples_per_variant, 25);
assert.equal(manifest.measurement.warm_recommendation_samples_per_variant, 20);
assert.equal(manifest.limits.maximum_deployments, 4);
assert.equal(manifest.limits.npm_publications, 0);
assert.equal(manifest.limits.production_function_deployments, 0);

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

for (const artifact of [packet, evidence]) {
  assert.ok(artifact.includes(expectedManifestHash));
  assert.ok(artifact.includes('ba7f7ea18'));
  assert.ok(artifact.includes('cacd283cb'));
}
assert.match(packet, /No npm publication or production function deployment is authorized/);
assert.match(packet, /Twenty-five warm requests per variant/);
assert.match(packet, /Twenty warm recommendations per variant/);
assert.match(packet, /Delete `mcp-search-v2-beta` after measurement/);
assert.doesNotMatch(packet, /supabase db push`\./i);

console.log(JSON.stringify({
  status: 'ok',
  manifest_sha256: manifestHash,
  control_commit: manifest.control_commit,
  treatment_commit: manifest.treatment_commit,
  control_treatment_changed_files: changedFiles,
  maximum_function_deployments: manifest.limits.maximum_deployments,
  npm_publications_authorized: manifest.limits.npm_publications,
  production_function_deployments_authorized: manifest.limits.production_function_deployments,
}, null, 2));
