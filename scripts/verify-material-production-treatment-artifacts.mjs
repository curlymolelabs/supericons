import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const RELEASE_FINGERPRINT = '534b6bb9e1405a6a15096081f8245117f5f470cdf22044c57640d06afa393b5a';
const BASELINE_SEARCH_SHA256 = '0344385fd16aac5aa6e55ff2a5dd5fd82f5f1f86230025025922ea1de27332ae';
const BASELINE_RECOMMENDATION_SHA256 = '151ec835b5ac0e510510f692f395eee2169e461606470b9fae14a4c6714cea99';
const SEARCH_ABSOLUTE_LIMIT_MS = 2000;
const REGRESSION_LIMIT_MS = 100;

const expectedAuditContract = {
  source: 'verify',
  channel: 'internal_test',
  environment: 'production',
  client_family: 'material_release_latency',
  beta_cohort: null,
};

function readArg(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : '';
}

function normalizedSha256(raw) {
  return createHash('sha256').update(raw.replace(/\r\n?/g, '\n'), 'utf8').digest('hex');
}

function readArtifact(path, expected) {
  const raw = readFileSync(resolve(path), 'utf8');
  const artifact = JSON.parse(raw);
  assert.equal(artifact.schema_version, 1, `${expected.label} schema version`);
  assert.equal(artifact.manifest_sha256, RELEASE_FINGERPRINT, `${expected.label} release fingerprint`);
  assert.equal(artifact.endpoint, 'mcp-search', `${expected.label} endpoint`);
  assert.equal(artifact.mode, expected.mode, `${expected.label} mode`);
  assert.equal(artifact.variant, expected.variant, `${expected.label} variant`);
  assert.equal(artifact.measurement_profile, 'production', `${expected.label} measurement profile`);
  assert.equal(artifact.sanitized_request_count, expected.requests, `${expected.label} request count`);
  assert.deepEqual(artifact.audit_contract, expectedAuditContract, `${expected.label} audit contract`);
  assert.equal(artifact.first_request?.ok, true, `${expected.label} first request`);
  assert.equal(artifact.warm_summary?.errors, 0, `${expected.label} warm errors`);
  assert.ok(artifact.warm_summary?.p95_ms > 0, `${expected.label} positive p95`);
  assert.ok(!raw.includes('mcp_beta'), `${expected.label} beta source`);
  assert.ok(!raw.includes('"environment": "preview"'), `${expected.label} preview environment`);
  return { raw, artifact };
}

const baselineSearch = readArtifact(readArg('baseline-search'), {
  label: 'baseline search',
  mode: 'search',
  variant: 'control',
  requests: 26,
});
const baselineRecommendation = readArtifact(readArg('baseline-recommendation'), {
  label: 'baseline recommendation',
  mode: 'recommendation',
  variant: 'control',
  requests: 21,
});
const treatmentSearch = readArtifact(readArg('treatment-search'), {
  label: 'treatment search',
  mode: 'search',
  variant: 'treatment',
  requests: 26,
});
const treatmentRecommendation = readArtifact(readArg('treatment-recommendation'), {
  label: 'treatment recommendation',
  mode: 'recommendation',
  variant: 'treatment',
  requests: 21,
});

assert.equal(normalizedSha256(baselineSearch.raw), BASELINE_SEARCH_SHA256, 'baseline search artifact hash');
assert.equal(
  normalizedSha256(baselineRecommendation.raw),
  BASELINE_RECOMMENDATION_SHA256,
  'baseline recommendation artifact hash',
);
assert.equal(treatmentSearch.artifact.measurement_phase, 'treatment');
assert.equal(treatmentRecommendation.artifact.measurement_phase, 'treatment');
assert.notEqual(
  treatmentSearch.artifact.measurement_run_id,
  treatmentRecommendation.artifact.measurement_run_id,
  'treatment run IDs must differ',
);

const baselineSearchP95 = baselineSearch.artifact.warm_summary.p95_ms;
const treatmentSearchP95 = treatmentSearch.artifact.warm_summary.p95_ms;
const baselineRecommendationP95 = baselineRecommendation.artifact.warm_summary.p95_ms;
const treatmentRecommendationP95 = treatmentRecommendation.artifact.warm_summary.p95_ms;

assert.equal(baselineSearchP95, 3337.062, 'approved search baseline changed');
assert.equal(baselineRecommendationP95, 459.204, 'approved recommendation baseline changed');
assert.ok(
  treatmentSearchP95 <= SEARCH_ABSOLUTE_LIMIT_MS,
  `search treatment p95 ${treatmentSearchP95} ms exceeds ${SEARCH_ABSOLUTE_LIMIT_MS} ms`,
);
assert.ok(
  treatmentSearchP95 <= baselineSearchP95 + REGRESSION_LIMIT_MS,
  `search treatment p95 ${treatmentSearchP95} ms regressed by more than ${REGRESSION_LIMIT_MS} ms`,
);
assert.ok(
  treatmentRecommendationP95 <= baselineRecommendationP95 + REGRESSION_LIMIT_MS,
  `recommendation treatment p95 ${treatmentRecommendationP95} ms regressed by more than ${REGRESSION_LIMIT_MS} ms`,
);

console.log(JSON.stringify({
  status: 'ok',
  search: {
    baseline_p95_ms: baselineSearchP95,
    treatment_p95_ms: treatmentSearchP95,
    absolute_limit_ms: SEARCH_ABSOLUTE_LIMIT_MS,
    regression_limit_ms: REGRESSION_LIMIT_MS,
  },
  recommendation: {
    baseline_p95_ms: baselineRecommendationP95,
    treatment_p95_ms: treatmentRecommendationP95,
    regression_limit_ms: REGRESSION_LIMIT_MS,
  },
  production_audit_contract: true,
  beta_fields_absent: true,
}, null, 2));
