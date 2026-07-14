import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function readArg(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : null;
}

const searchPath = resolve(readArg('search') || '');
const recommendationPath = resolve(readArg('recommendation') || '');
const manifestHash = readArg('manifest-hash');
assert.ok(readArg('search'), 'Provide --search artifact path.');
assert.ok(readArg('recommendation'), 'Provide --recommendation artifact path.');
assert.match(manifestHash || '', /^[a-f0-9]{64}$/, 'Provide the approved manifest hash.');

const expectedAuditContract = {
  source: 'mcp',
  channel: 'hosted_mcp',
  environment: 'production',
  client_family: 'material_release_latency',
  beta_cohort: null,
};

function readAndVerify(path, expectedMode, expectedRequests) {
  const raw = readFileSync(path, 'utf8');
  assert.ok(!raw.includes('mcp_beta'), `${expectedMode} artifact contains beta source.`);
  assert.ok(!raw.includes('"environment": "preview"'), `${expectedMode} artifact contains preview environment.`);
  const artifact = JSON.parse(raw);
  assert.equal(artifact.schema_version, 1);
  assert.equal(artifact.manifest_sha256, manifestHash);
  assert.equal(artifact.endpoint, 'mcp-search');
  assert.equal(artifact.mode, expectedMode);
  assert.equal(artifact.variant, 'control');
  assert.equal(artifact.measurement_profile, 'production');
  assert.match(artifact.measurement_run_id || '', /^[a-f0-9-]{36}$/);
  assert.equal(artifact.sanitized_request_count, expectedRequests);
  assert.deepEqual(artifact.audit_contract, expectedAuditContract);
  assert.equal(artifact.first_request?.ok, true);
  assert.equal(artifact.warm_summary?.errors, 0);
  assert.ok(artifact.warm_summary?.p95_ms > 0);
  return artifact;
}

const search = readAndVerify(searchPath, 'search', 26);
assert.equal(search.warm_summary.samples, 25);
const recommendation = readAndVerify(recommendationPath, 'recommendation', 21);
assert.equal(recommendation.recommendation_path, 'grouped');
assert.equal(recommendation.warm_summary.samples, 20);
assert.notEqual(search.measurement_run_id, recommendation.measurement_run_id);

console.log(JSON.stringify({
  status: 'ok',
  search_p95_ms: search.warm_summary.p95_ms,
  recommendation_p95_ms: recommendation.warm_summary.p95_ms,
  search_requests: search.sanitized_request_count,
  recommendation_requests: recommendation.sanitized_request_count,
  production_audit_contract: true,
  beta_fields_absent: true,
}, null, 2));
