import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';

import { createHostedSearchResilience } from '../mcp/hosted-search-resilience.js';

function deferred() {
  let resolve;
  const promise = new Promise((accept) => {
    resolve = accept;
  });
  return { promise, resolve };
}

function dependencyFailure(message = 'dependency failed') {
  const error = new Error(message);
  error.hosted_search_dependency_failure = true;
  return error;
}

const concurrencyGuard = createHostedSearchResilience({
  maxConcurrent: 2,
  maxQueued: 4,
  queueTimeoutMs: 1000,
});
let active = 0;
let peak = 0;
const releases = Array.from({ length: 4 }, () => deferred());
const concurrencyRuns = releases.map((release) => concurrencyGuard.execute(async () => {
  active += 1;
  peak = Math.max(peak, active);
  await release.promise;
  active -= 1;
  return true;
}));
await new Promise((resolve) => setImmediate(resolve));
assert.equal(peak, 2, 'The process-wide engine request cap must be two.');
releases[0].resolve();
releases[1].resolve();
await new Promise((resolve) => setImmediate(resolve));
releases[2].resolve();
releases[3].resolve();
await Promise.all(concurrencyRuns);

let currentTime = 1000;
const circuitGuard = createHostedSearchResilience({
  failureThreshold: 2,
  openDurationMs: 30_000,
  now: () => currentTime,
});
let operations = 0;
for (let attempt = 0; attempt < 2; attempt += 1) {
  await assert.rejects(
    circuitGuard.execute(async () => {
      operations += 1;
      throw dependencyFailure();
    }),
    /dependency failed/,
  );
}
await assert.rejects(
  circuitGuard.execute(async () => {
    operations += 1;
  }),
  (error) => error?.code === 'hosted_search_circuit_open',
);
assert.equal(operations, 2, 'An open circuit must not contact the dependency.');
currentTime += 30_001;
assert.equal(await circuitGuard.execute(async () => {
  operations += 1;
  return 'recovered';
}), 'recovered');
assert.equal(circuitGuard.getStatus().state, 'closed');

const clientSource = readFileSync('mcp/hosted-search-client.js', 'utf8');
assert.equal(clientSource.includes('attempt < 3'), false, 'The hosted client must not retry 5xx responses internally.');
assert.match(clientSource, /resilience\.execute/);
assert.match(clientSource, /groupedHostedSearchResilience/);
assert.match(clientSource, /AbortSignal\.timeout\(HOSTED_SEARCH_REQUEST_TIMEOUT_MS\)/);
const remoteServerSource = readFileSync('mcp/remote-server.js', 'utf8');
assert.match(remoteServerSource, /hosted_search: hostedSearch/);
assert.match(remoteServerSource, /grouped_hosted_search: groupedHostedSearch/);
const mcpPackage = JSON.parse(readFileSync('mcp/package.json', 'utf8'));
assert.equal(mcpPackage.files.includes('hosted-search-resilience.js'), true);

let requestCount = 0;
const server = createServer((_request, response) => {
  requestCount += 1;
  response.writeHead(503, { 'content-type': 'application/json' });
  response.end(JSON.stringify({ error: 'unavailable', retryable: true }));
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const address = server.address();
process.env.SUPERICONS_MCP_SEARCH_URL = `http://127.0.0.1:${address.port}`;

try {
  const { searchIconsHostedMcp } = await import('../mcp/hosted-search-client.js');
  for (let attempt = 0; attempt < 2; attempt += 1) {
    await assert.rejects(searchIconsHostedMcp({ query: 'settings', limit: 3 }), /MCP search failed/);
  }
  await assert.rejects(
    searchIconsHostedMcp({ query: 'settings', limit: 3 }),
    (error) => error?.code === 'hosted_search_circuit_open',
  );
  assert.equal(requestCount, 2, 'Two failed calls must create two HTTP requests, not six retries.');
} finally {
  delete process.env.SUPERICONS_MCP_SEARCH_URL;
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}

console.log(JSON.stringify({
  status: 'ok',
  checks: 10,
  max_concurrent_engine_requests: 2,
  internal_5xx_retries: 0,
  failure_threshold: 2,
  open_duration_ms: 30000,
}, null, 2));
