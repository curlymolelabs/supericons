import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { resolve } from 'node:path';

const repositoryRoot = resolve('.');
const lockScript = resolve('scripts/manage-search-v2-release-lock.mjs');
const benchmarkScript = resolve(
  'scripts/verify-search-v2-shared-candidate-rpc-production-benchmark.mjs',
);
const lockName = 'search-v2-beta3-shared-grouped';
const runId = randomUUID();
const migrationHash = createHash('sha256')
  .update(readFileSync(
    'supabase/migrations/20260714190000_search_v2_shared_recommendation_candidates.sql',
  ))
  .digest('hex');
let lockAcquired = false;
let apiRequests = 0;

function manageLock(args) {
  return JSON.parse(execFileSync(process.execPath, [lockScript, ...args], {
    cwd: repositoryRoot,
    encoding: 'utf8',
  }));
}

function runBenchmark(apiBase) {
  return new Promise((resolveChild) => {
    const child = spawn(process.execPath, [
      benchmarkScript,
      '--expected-migration-hash', migrationHash,
      '--management-api-base', apiBase,
    ], {
      cwd: repositoryRoot,
      env: { ...process.env, SUPABASE_ACCESS_TOKEN: 'fixture-only-token' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.once('close', (status) => resolveChild({ status, stdout, stderr }));
  });
}

const server = createServer((_request, response) => {
  apiRequests += 1;
  response.writeHead(500, { 'content-type': 'application/json' });
  response.end(JSON.stringify({ error: 'The lock fixture must prevent this request.' }));
});
await new Promise((resolveListen) => server.listen(0, '127.0.0.1', resolveListen));
const address = server.address();
assert.ok(address && typeof address === 'object');

try {
  const lock = manageLock([
    '--action', 'acquire',
    '--name', lockName,
    '--run-id', runId,
    '--owner-process-id', String(process.pid),
    '--repository-root', repositoryRoot,
  ]);
  assert.equal(lock.status, 'acquired');
  assert.equal(lock.process_id, process.pid);
  lockAcquired = true;

  const result = await runBenchmark(`http://127.0.0.1:${address.port}`);
  assert.notEqual(result.status, 0, 'The benchmark must stop when the release lock is held.');
  assert.match(
    `${result.stdout}\n${result.stderr}`,
    /Release lock search-v2-beta3-shared-grouped is already held/,
  );
  assert.equal(apiRequests, 0, 'The blocked benchmark reached its production API boundary.');

  console.log(JSON.stringify({
    status: 'ok',
    preheld_release_lock_blocked_benchmark: true,
    production_api_requests: apiRequests,
  }, null, 2));
} finally {
  await new Promise((resolveClose) => server.close(resolveClose));
  if (lockAcquired) {
    const lock = manageLock([
      '--action', 'release',
      '--name', lockName,
      '--run-id', runId,
      '--repository-root', repositoryRoot,
    ]);
    assert.equal(lock.status, 'released');
  }
}
