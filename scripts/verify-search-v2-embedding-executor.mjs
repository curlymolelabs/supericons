import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { executeEmbeddingSample } from '../lib/search-v2-embedding-executor.js';
import { createFileEmbeddingSampleLedger } from '../lib/search-v2-embedding-ledger.js';

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));
const sampleSet = readJson('data/semantic-search-v2/embedding-sample-set.json');
const candidates = readJson('data/semantic-search-v2/embedding-candidates.json').candidates;
const authorization = readJson('data/semantic-search-v2/embedding-sample-authorization.json');
assert.equal(authorization.status, 'revoked_by_owner');
const approvedTestAuthorization = { ...authorization, status: 'approved_once' };
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

function createMemoryLedger() {
  let reserved = false;
  const events = [];
  return {
    events,
    reserve(event) {
      if (reserved) throw new Error('Embedding sample execution already exists for this approval.');
      reserved = true;
      events.push({ event: 'execution_reserved', ...event });
    },
    recordAttempt(event) {
      events.push({ event: 'request_reserved', ...event });
    },
    recordFailure(event) {
      events.push({ event: 'execution_failed', ...event });
    },
    recordSuccess(event) {
      events.push({ event: 'execution_completed', ...event });
    },
  };
}

const allowed = createMockFetch();
const allowedLedger = createMemoryLedger();
const result = await executeEmbeddingSample({
  sampleSet,
  candidates,
  authorization: approvedTestAuthorization,
  pricing,
  suppliedFingerprint: authorization.authorization_fingerprint,
  suppliedSpendCapUsd: 1,
  environment,
  fetchImpl: allowed.fetchImpl,
  executionLedger: allowedLedger,
});
assert.equal(allowed.calls.length, 8);
assert.equal(result.request_count, 8);
assert.equal(result.retry_count, 0);
assert.equal(result.vectors_stored, false);
assert.equal(result.execution_ledger_recorded, true);
assert.ok(result.maximum_estimated_cost_usd < 1);
assert.ok(result.candidates.every((candidate) => candidate.top_1_pass_count === 6));
assert.doesNotMatch(JSON.stringify(result), /test-(?:voyage|gemini|openai)-secret/);
assert.ok(allowed.calls.every((call) => !JSON.stringify(call.options.body).includes('test-')));
assert.equal(allowedLedger.events.at(-1)?.event, 'execution_completed');

const replay = createMockFetch();
await assert.rejects(
  executeEmbeddingSample({
    sampleSet,
    candidates,
    authorization: approvedTestAuthorization,
    pricing,
    suppliedFingerprint: authorization.authorization_fingerprint,
    suppliedSpendCapUsd: 1,
    environment,
    fetchImpl: replay.fetchImpl,
    executionLedger: allowedLedger,
  }),
  /already exists/,
);
assert.equal(replay.calls.length, 0, 'a consumed approval must make zero calls on replay');

for (const deniedCase of [
  { name: 'revoked authorization', suppliedFingerprint: authorization.authorization_fingerprint, suppliedSpendCapUsd: 1, environment, authorization },
  { name: 'wrong fingerprint', suppliedFingerprint: '0'.repeat(64), suppliedSpendCapUsd: 1, environment },
  { name: 'wrong cap', suppliedFingerprint: authorization.authorization_fingerprint, suppliedSpendCapUsd: 2, environment },
  { name: 'missing key', suppliedFingerprint: authorization.authorization_fingerprint, suppliedSpendCapUsd: 1, environment: { ...environment, OPENAI_API_KEY: '' } },
  { name: 'wrong ledger root', suppliedFingerprint: authorization.authorization_fingerprint, suppliedSpendCapUsd: 1, environment, authorization: { ...approvedTestAuthorization, execution_ledger_root: 'output' } },
]) {
  const denied = createMockFetch();
  await assert.rejects(
    executeEmbeddingSample({
      sampleSet,
      candidates,
      authorization: deniedCase.authorization || approvedTestAuthorization,
      pricing,
      suppliedFingerprint: deniedCase.suppliedFingerprint,
      suppliedSpendCapUsd: deniedCase.suppliedSpendCapUsd,
      environment: deniedCase.environment,
      fetchImpl: denied.fetchImpl,
      executionLedger: createMemoryLedger(),
    }),
  );
  assert.equal(denied.calls.length, 0, `${deniedCase.name} should fail before a provider call`);
}

let failedCalls = 0;
let executionFailure = null;
const failureLedgerRoot = mkdtempSync(path.join(tmpdir(), 'search-v2-embedding-ledger-'));
try {
  await executeEmbeddingSample({
    sampleSet,
    candidates,
    authorization: approvedTestAuthorization,
    pricing,
    suppliedFingerprint: authorization.authorization_fingerprint,
    suppliedSpendCapUsd: 1,
    environment,
    fetchImpl: async () => {
      failedCalls += 1;
      return { ok: false, status: 503 };
    },
    executionLedger: createFileEmbeddingSampleLedger({ rootDirectory: failureLedgerRoot }),
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
assert.equal(executionFailure?.execution_summary?.ledger_failure_recorded, true);
assert.doesNotMatch(JSON.stringify(executionFailure?.execution_summary), /test-(?:voyage|gemini|openai)-secret/);

const failureLedgerPath = path.join(failureLedgerRoot, `${authorization.authorization_fingerprint}.jsonl`);
const failureLedgerText = readFileSync(failureLedgerPath, 'utf8');
const failureLedgerEvents = failureLedgerText.trim().split(/\r?\n/).map((line) => JSON.parse(line));
assert.deepEqual(failureLedgerEvents.map((event) => event.event), [
  'execution_reserved',
  'request_reserved',
  'execution_failed',
]);
assert.equal(failureLedgerEvents[1].attempt_number, 1);
assert.doesNotMatch(failureLedgerText, /test-(?:voyage|gemini|openai)-secret|vector|Search icon/);

const partialReplay = createMockFetch();
await assert.rejects(
  executeEmbeddingSample({
    sampleSet,
    candidates,
    authorization: approvedTestAuthorization,
    pricing,
    suppliedFingerprint: authorization.authorization_fingerprint,
    suppliedSpendCapUsd: 1,
    environment,
    fetchImpl: partialReplay.fetchImpl,
    executionLedger: createFileEmbeddingSampleLedger({ rootDirectory: failureLedgerRoot }),
  }),
  /already exists/,
);
assert.equal(partialReplay.calls.length, 0, 'a partial execution must block a new process from making calls');
rmSync(failureLedgerRoot, { recursive: true, force: true });

const concurrentLedgerRoot = mkdtempSync(path.join(tmpdir(), 'search-v2-embedding-concurrent-'));
const firstConcurrentLedger = createFileEmbeddingSampleLedger({ rootDirectory: concurrentLedgerRoot });
firstConcurrentLedger.reserve({
  authorization_fingerprint: authorization.authorization_fingerprint,
  spend_cap_usd: 1,
  approved_request_count: 8,
});
assert.throws(
  () => createFileEmbeddingSampleLedger({ rootDirectory: concurrentLedgerRoot }).reserve({
    authorization_fingerprint: authorization.authorization_fingerprint,
    spend_cap_usd: 1,
    approved_request_count: 8,
  }),
  /already exists/,
);
rmSync(concurrentLedgerRoot, { recursive: true, force: true });

const revokedRun = spawnSync(process.execPath, [
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
assert.equal(revokedRun.status, 1);
const revokedFailure = JSON.parse(revokedRun.stderr);
assert.equal(revokedFailure.status, 'failed_before_execution');
assert.equal(revokedFailure.request_attempt_count, 0);
assert.equal(revokedFailure.retry_count, 0);
assert.equal(revokedFailure.vectors_stored, false);
assert.match(revokedFailure.error, /not active/);
assert.doesNotMatch(revokedRun.stderr, /\bat file:\/\//, 'CLI failure should not print a stack trace');

for (const file of [
  'data/semantic-search-v2/embedding-sample-authorization.json',
  'data/semantic-search-v2/embedding-sample-pricing.json',
  'lib/search-v2-embedding-executor.js',
  'lib/search-v2-embedding-ledger.js',
  'scripts/run-search-v2-embedding-sample.mjs',
  'scripts/verify-search-v2-embedding-executor.mjs',
]) {
  assert.doesNotMatch(readFileSync(file, 'utf8'), /[\u2013\u2014]/, `${file}: forbidden punctuation`);
}

console.log(JSON.stringify({
  status: 'ok',
  allowed_requests: result.request_count,
  denied_cases: 5,
  replay_cases_blocked: 2,
  concurrent_reservations_blocked: 1,
  failed_request_attempts: failedCalls,
  revoked_cli_request_attempts: revokedFailure.request_attempt_count,
  vectors_stored: result.vectors_stored,
}, null, 2));
