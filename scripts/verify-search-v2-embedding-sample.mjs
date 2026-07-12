import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { validateEmbeddingCandidates } from '../lib/search-v2-embedding-plan.js';
import { buildEmbeddingSamplePlan } from '../lib/search-v2-embedding-sample.js';
import {
  EMBEDDING_SAMPLE_LIMITS,
  validateEmbeddingProviderResponse,
} from '../lib/search-v2-embedding-provider.js';

const sampleSet = JSON.parse(readFileSync('data/semantic-search-v2/embedding-sample-set.json', 'utf8'));
const candidateConfig = JSON.parse(readFileSync('data/semantic-search-v2/embedding-candidates.json', 'utf8'));
const specification = readFileSync('docs/si-v2/search/search-engine-v2.md', 'utf8');
const decisions = readFileSync('docs/si-v2/search/decisions.md', 'utf8');
const authorizationRequest = readFileSync(
  'docs/si-v2/search/reviews/embedding-sample-authorization-request-2026-07-12.md',
  'utf8',
);
const candidates = validateEmbeddingCandidates(candidateConfig);

assert.match(specification, /Version: 1\.4/);
assert.match(specification, /FR-30/);
assert.match(decisions, /D-020: Multilingual assurance and embedding gates/);

const google = candidates.find((candidate) => candidate.provider === 'google');
assert.equal(google?.model, 'gemini-embedding-2', 'E3 should use Gemini Embedding 2');
assert.equal(google?.dimensions, 1024, 'E3 should remain in the common 1024-dimension lane');

const plan = buildEmbeddingSamplePlan({ sampleSet, candidates });
assert.deepEqual(buildEmbeddingSamplePlan({ sampleSet, candidates }), plan, 'sample plan should be deterministic');
assert.equal(plan.mode, 'sample-plan');
assert.equal(plan.network_allowed, false);
assert.equal(plan.writes_allowed, false);
assert.equal(plan.provider_execution_in_plan, false);
assert.equal(plan.separate_executor_available, true);
assert.equal('provider_execution_implemented' in plan, false, 'planner output should not use the misleading old field');
assert.equal(plan.authorization_required_for_execution, true);
assert.match(plan.authorization_fingerprint, /^[a-f0-9]{64}$/);
assert.ok(
  authorizationRequest.includes(plan.authorization_fingerprint),
  'authorization request should identify the exact reproducible sample plan',
);
assert.equal(plan.maximum_total_inputs_per_candidate, 12);
assert.equal(plan.document_count, 6);
assert.equal(plan.query_count, 6);
assert.equal(plan.total_inputs_per_candidate, 12);
assert.equal(plan.candidate_count, 4, 'optional E5 should not enter the first sample by default');
assert.equal(EMBEDDING_SAMPLE_LIMITS.maximum_inputs_per_request, 6);

for (const candidatePlan of plan.candidates) {
  assert.equal(candidatePlan.request_count, 2);
  assert.equal(candidatePlan.document_request.method, 'POST');
  assert.equal(candidatePlan.query_request.method, 'POST');
  assert.ok(candidatePlan.document_request.auth.environment_variable);
  assert.ok(candidatePlan.query_request.auth.environment_variable);
  assert.equal('value' in candidatePlan.document_request.auth, false, 'sample plan must not contain a credential value');
  assert.equal('headers' in candidatePlan.document_request, false, 'sample plan must not construct authenticated headers');
}

const googlePlan = plan.candidates.find((candidate) => candidate.provider === 'google');
assert.match(googlePlan.document_request.url, /gemini-embedding-2:batchEmbedContents$/);
assert.equal(googlePlan.document_request.body.requests.length, 6);
assert.ok(googlePlan.document_request.body.requests.every((request) => request.taskType === 'RETRIEVAL_DOCUMENT'));
assert.ok(googlePlan.query_request.body.requests.every((request) => request.taskType === 'RETRIEVAL_QUERY'));
assert.ok(googlePlan.query_request.body.requests.every((request) => request.outputDimensionality === 1024));

const unitVector = (dimensions) => [1, ...Array(dimensions - 1).fill(0)];
for (const candidate of candidates.filter((entry) => !entry.optional)) {
  const vector = unitVector(candidate.dimensions);
  const response = candidate.provider === 'google'
    ? { embeddings: [{ values: vector }, { values: vector }], usageMetadata: { promptTokenCount: 2 } }
    : { data: [{ index: 0, embedding: vector }, { index: 1, embedding: vector }], usage: { total_tokens: 2 } };
  const validation = validateEmbeddingProviderResponse({ candidate, response, expectedCount: 2 });
  assert.equal(validation.vector_count, 2);
  assert.ok(validation.norms.every((norm) => norm === 1));
}

const invalidVector = [2, ...Array(candidates[0].dimensions - 1).fill(0)];
assert.throws(
  () => validateEmbeddingProviderResponse({
    candidate: candidates[0],
    response: { data: [{ index: 0, embedding: invalidVector }] },
    expectedCount: 1,
  }),
  /unit norm check/,
);

assert.throws(
  () => validateEmbeddingProviderResponse({
    candidate: candidates[0],
    response: { data: [{ index: 0, embedding: [1] }] },
    expectedCount: 1,
  }),
  /wrong dimensions/,
);

const nonFiniteVector = unitVector(candidates[0].dimensions);
nonFiniteVector[0] = Number.NaN;
assert.throws(
  () => validateEmbeddingProviderResponse({
    candidate: candidates[0],
    response: { data: [{ index: 0, embedding: nonFiniteVector }] },
    expectedCount: 1,
  }),
  /non-finite value/,
);

assert.throws(
  () => validateEmbeddingProviderResponse({
    candidate: candidates[0],
    response: { data: [] },
    expectedCount: 1,
  }),
  /expected 1 vectors/,
);

assert.throws(
  () => buildEmbeddingSamplePlan({
    sampleSet: {
      ...sampleSet,
      documents: [...sampleSet.documents, { id: 'too-many', locale: 'en', text: 'Extra input' }],
    },
    candidates,
  }),
  /exceeds its input limit/,
);

for (const file of [
  'lib/search-v2-embedding-provider.js',
  'lib/search-v2-embedding-sample.js',
  'scripts/plan-search-v2-embedding-sample.mjs',
]) {
  const source = readFileSync(file, 'utf8');
  assert.doesNotMatch(source, /\bfetch\s*\(|node:(?:http|https|net)|child_process|process\.env/);
}

console.log(JSON.stringify({
  status: 'ok',
  authorization_fingerprint: plan.authorization_fingerprint,
  candidates: plan.candidates.map((candidate) => candidate.id),
  total_inputs_per_candidate: plan.total_inputs_per_candidate,
  provider_execution_in_plan: plan.provider_execution_in_plan,
  separate_executor_available: plan.separate_executor_available,
}, null, 2));
