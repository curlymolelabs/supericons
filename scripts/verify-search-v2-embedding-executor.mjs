import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

import { executeEmbeddingSample } from '../lib/search-v2-embedding-executor.js';

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));
const sampleSet = readJson('data/semantic-search-v2/embedding-sample-set.json');
const candidates = readJson('data/semantic-search-v2/embedding-candidates.json').candidates;
const authorization = readJson('data/semantic-search-v2/embedding-sample-authorization.json');
const pricing = readJson('data/semantic-search-v2/embedding-sample-pricing.json');
const environment = {
  VOYAGE_API_KEY: 'test-voyage-secret',
  GEMINI_API_KEY: 'test-gemini-secret',
  OPENAI_API_KEY: 'test-openai-secret',
};

function unitVector(dimensions, activeIndex) {
  return Array.from({ length: dimensions }, (_, index) => index === activeIndex ? 1 : 0);
}

function mockPayload(provider, dimensions, inputCount) {
  const vectors = Array.from({ length: inputCount }, (_, index) => unitVector(dimensions, index));
  if (provider === 'google') {
    return { embeddings: vectors.map((values) => ({ values })), usageMetadata: { promptTokenCount: inputCount * 3 } };
  }
  return {
    data: vectors.map((embedding, index) => ({ index, embedding })),
    usage: { total_tokens: inputCount * 3 },
  };
}

function createMockFetch() {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    const candidateIndex = Math.floor((calls.length - 1) / 2);
    const candidate = candidates.filter((entry) => !entry.optional)[candidateIndex];
    const body = JSON.parse(options.body);
    const inputCount = candidate.provider === 'google' ? body.requests.length : body.input.length;
    return {
      ok: true,
      status: 200,
      async json() {
        return mockPayload(candidate.provider, candidate.dimensions, inputCount);
      },
    };
  };
  return { calls, fetchImpl };
}

const allowed = createMockFetch();
const result = await executeEmbeddingSample({
  sampleSet,
  candidates,
  authorization,
  pricing,
  suppliedFingerprint: authorization.authorization_fingerprint,
  suppliedSpendCapUsd: 1,
  environment,
  fetchImpl: allowed.fetchImpl,
});
assert.equal(allowed.calls.length, 8);
assert.equal(result.request_count, 8);
assert.equal(result.retry_count, 0);
assert.equal(result.vectors_stored, false);
assert.ok(result.maximum_estimated_cost_usd < 1);
assert.ok(result.candidates.every((candidate) => candidate.top_1_pass_count === 6));
assert.doesNotMatch(JSON.stringify(result), /test-(?:voyage|gemini|openai)-secret/);
assert.ok(allowed.calls.every((call) => !JSON.stringify(call.options.body).includes('test-')));

for (const deniedCase of [
  { name: 'wrong fingerprint', suppliedFingerprint: '0'.repeat(64), suppliedSpendCapUsd: 1, environment },
  { name: 'wrong cap', suppliedFingerprint: authorization.authorization_fingerprint, suppliedSpendCapUsd: 2, environment },
  { name: 'missing key', suppliedFingerprint: authorization.authorization_fingerprint, suppliedSpendCapUsd: 1, environment: { ...environment, OPENAI_API_KEY: '' } },
]) {
  const denied = createMockFetch();
  await assert.rejects(
    executeEmbeddingSample({
      sampleSet,
      candidates,
      authorization,
      pricing,
      suppliedFingerprint: deniedCase.suppliedFingerprint,
      suppliedSpendCapUsd: deniedCase.suppliedSpendCapUsd,
      environment: deniedCase.environment,
      fetchImpl: denied.fetchImpl,
    }),
  );
  assert.equal(denied.calls.length, 0, `${deniedCase.name} should fail before a provider call`);
}

let failedCalls = 0;
let executionFailure = null;
try {
  await executeEmbeddingSample({
    sampleSet,
    candidates,
    authorization,
    pricing,
    suppliedFingerprint: authorization.authorization_fingerprint,
    suppliedSpendCapUsd: 1,
    environment,
    fetchImpl: async () => {
      failedCalls += 1;
      return { ok: false, status: 503 };
    },
  });
} catch (error) {
  executionFailure = error;
}
assert.match(executionFailure?.message || '', /status 503/);
assert.equal(failedCalls, 1, 'provider failure must not be retried');
assert.equal(executionFailure?.execution_summary?.request_attempt_count, 1);
assert.equal(executionFailure?.execution_summary?.retry_count, 0);
assert.equal(executionFailure?.execution_summary?.failed_candidate_id, 'e1-voyage-4-large-1024');
assert.equal(executionFailure?.execution_summary?.failed_input_kind, 'document');
assert.doesNotMatch(JSON.stringify(executionFailure?.execution_summary), /test-(?:voyage|gemini|openai)-secret/);

const missingKeyRun = spawnSync(process.execPath, [
  'scripts/run-search-v2-embedding-sample.mjs',
  '--authorization-fingerprint',
  authorization.authorization_fingerprint,
  '--spend-cap-usd',
  '1',
], {
  cwd: process.cwd(),
  encoding: 'utf8',
  env: {
    ...process.env,
    VOYAGE_API_KEY: '',
    GEMINI_API_KEY: '',
    OPENAI_API_KEY: '',
  },
});
assert.equal(missingKeyRun.status, 1);
const missingKeyFailure = JSON.parse(missingKeyRun.stderr);
assert.equal(missingKeyFailure.status, 'failed_before_execution');
assert.equal(missingKeyFailure.request_attempt_count, 0);
assert.equal(missingKeyFailure.retry_count, 0);
assert.equal(missingKeyFailure.vectors_stored, false);
assert.doesNotMatch(missingKeyRun.stderr, /\bat file:\/\//, 'CLI failure should not print a stack trace');

for (const file of [
  'data/semantic-search-v2/embedding-sample-authorization.json',
  'data/semantic-search-v2/embedding-sample-pricing.json',
  'lib/search-v2-embedding-executor.js',
  'scripts/run-search-v2-embedding-sample.mjs',
  'scripts/verify-search-v2-embedding-executor.mjs',
]) {
  assert.doesNotMatch(readFileSync(file, 'utf8'), /[\u2013\u2014]/, `${file}: forbidden punctuation`);
}

console.log(JSON.stringify({
  status: 'ok',
  allowed_requests: result.request_count,
  denied_cases: 3,
  failed_request_attempts: failedCalls,
  missing_key_cli_request_attempts: missingKeyFailure.request_attempt_count,
  vectors_stored: result.vectors_stored,
}, null, 2));
