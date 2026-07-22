import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { setTimeout as delay } from 'node:timers/promises';

import { createControlledRunHeaders } from '../mcp/controlled-run-auth.js';

const secret = 'local-search-v2-route-integrity-secret-20260723';
const label = 'search-v2-route-integrity';
const hostedRequests = [];

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve(server.address()));
  });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

const hostedServer = createServer(async (req, res) => {
  const body = JSON.parse(await readBody(req));
  hostedRequests.push(body);
  if (body.query === 'hard hat construction worker') {
    res.writeHead(503, { 'content-type': 'application/json' });
    res.end(
      JSON.stringify({
        error: 'forced_hosted_outage',
        message: 'Forced hosted outage for route-integrity verification.',
        retryable: true,
      }),
    );
    return;
  }
  res.writeHead(200, { 'content-type': 'application/json' });
  res.end(JSON.stringify({ results: [] }));
});

const hostedAddress = await listen(hostedServer);
const portReservation = createServer();
const appAddress = await listen(portReservation);
await new Promise((resolve) => portReservation.close(resolve));
const baseUrl = `http://127.0.0.1:${appAddress.port}`;

const child = spawn(process.execPath, ['mcp/remote-server.js'], {
  env: {
    ...process.env,
    PORT: String(appAddress.port),
    SUPERICONS_RAILWAY_LOCAL_FIRST: 'on',
    SUPERICONS_MCP_SEARCH_URL: `http://127.0.0.1:${hostedAddress.port}/search`,
    SUPERICONS_CONTROLLED_RUN_SECRET: secret,
    SUPERICONS_MCP_USAGE_DEBUG: '0',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
  windowsHide: true,
});

let childOutput = '';
child.stdout.on('data', (chunk) => {
  childOutput = `${childOutput}${chunk}`.slice(-12_000);
});
child.stderr.on('data', (chunk) => {
  childOutput = `${childOutput}${chunk}`.slice(-12_000);
});

async function waitForHealth() {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (child.exitCode !== null) throw new Error(`Candidate server exited early.\n${childOutput}`);
    try {
      const response = await fetch(`${baseUrl}/health`);
      if (response.ok) return;
    } catch {
      // The candidate is still starting.
    }
    await delay(100);
  }
  throw new Error(`Candidate server did not become healthy.\n${childOutput}`);
}

async function postSearch(query, headers = {}) {
  const response = await fetch(`${baseUrl}/search-icons`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify({ query, library_mode: 'all', limit: 10 }),
  });
  return { response, payload: await response.json() };
}

try {
  await waitForHealth();

  const controlled = await postSearch('sports', createControlledRunHeaders(label, secret));
  assert.equal(controlled.response.status, 200);
  assert.equal(controlled.payload.search_runtime.mode, 'local_fallback');
  assert.equal(controlled.payload.search_runtime.fallback_used, true);
  assert.ok(controlled.payload.results.length > 0);
  assert.equal(hostedRequests[0].environment, 'test');
  assert.match(hostedRequests[0].beta_cohort, /^controlled-run[_:]/);

  const ordinary = await postSearch('amazing');
  assert.equal(ordinary.response.status, 200);
  assert.equal(ordinary.payload.search_runtime.mode, 'local_fallback');
  assert.equal(hostedRequests[1].environment, 'local');
  assert.equal(Object.hasOwn(hostedRequests[1], 'beta_cohort'), false);

  const outage = await postSearch('hard hat construction worker');
  assert.equal(outage.response.status, 503);
  assert.equal(outage.payload.retryable, true);
  assert.equal(Object.hasOwn(outage.payload, 'results'), false);
  assert.equal(Object.hasOwn(outage.payload, 'search_runtime'), false);

  console.log(
    JSON.stringify(
      {
        status: 'ok',
        controlled_traffic_forwarded_as_test: true,
        ordinary_local_fixture_preserved_as_local: true,
        hosted_outage_propagated: true,
        hidden_local_success_on_outage: false,
      },
      null,
      2,
    ),
  );
} finally {
  child.kill('SIGTERM');
  await Promise.race([new Promise((resolveExit) => child.once('exit', resolveExit)), delay(2_000)]);
  if (child.exitCode === null) child.kill('SIGKILL');
  await new Promise((resolveClose) => hostedServer.close(resolveClose));
}
