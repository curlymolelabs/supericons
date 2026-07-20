import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import http from 'node:http';
import { resolve } from 'node:path';

async function listen(server) {
  await new Promise((resolveListen, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolveListen);
  });
  return server.address().port;
}

async function close(server) {
  if (!server.listening) return;
  await new Promise((resolveClose, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolveClose();
    });
  });
}

async function runNode(args) {
  const child = spawn(process.execPath, args, {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (chunk) => {
    stdout += chunk;
  });
  child.stderr.on('data', (chunk) => {
    stderr += chunk;
  });
  const exitCode = await new Promise((resolveExit, reject) => {
    child.once('error', reject);
    child.once('exit', resolveExit);
  });
  return { exitCode, stdout, stderr };
}

function sendJson(response, status, payload) {
  response.statusCode = status;
  response.setHeader('content-type', 'application/json');
  response.end(JSON.stringify(payload));
}

async function verifyGroupedLiveFailureCannotUseStableFallback() {
  const counts = {
    grouped: 0,
    realStable: 0,
    sentinelStable: 0,
  };
  const server = http.createServer(async (request, response) => {
    let body = '';
    for await (const chunk of request) body += chunk;
    const payload = body ? JSON.parse(body) : {};

    if (request.url === '/grouped') {
      counts.grouped += 1;
      if (counts.grouped === 1) {
        const queries = Array.isArray(payload.queries) ? payload.queries : [];
        sendJson(response, 200, {
          schema_version: 1,
          response_count: queries.length,
          responses: queries.map((_, index) => ({
            index,
            status: 200,
            body: {
              results: [{ ref: `lucide:grouped-${index}` }],
            },
          })),
        });
        return;
      }
      sendJson(response, 503, {
        code: 'grouped_hosted_search_failed',
        retryable: true,
      });
      return;
    }

    if (request.url === '/stable') {
      counts.realStable += 1;
      sendJson(response, 200, {
        results: [{ ref: 'lucide:stable' }],
      });
      return;
    }

    if (request.url === '/stable-grouped-route-must-not-fallback') {
      counts.sentinelStable += 1;
      sendJson(response, 404, {
        code: 'stable_fallback_disabled_for_grouped_gate',
        retryable: false,
      });
      return;
    }

    sendJson(response, 404, { code: 'not_found' });
  });

  try {
    const port = await listen(server);
    const result = await runNode([
      'scripts/verify-search-v2-beta3-grouped-live.mjs',
      '--grouped-url', `http://127.0.0.1:${port}/grouped`,
      '--stable-url', `http://127.0.0.1:${port}/stable`,
      '--request-timeout-ms', '5000',
    ]);

    assert.equal(result.exitCode, 1);
    assert.equal(counts.grouped, 2);
    assert.equal(counts.realStable, 0);
    assert.equal(counts.sentinelStable, 1);
    assert.match(result.stdout, /"status": "blocked"/);
    assert.equal(
      result.stderr.includes('Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)'),
      false,
    );

    return {
      grouped_requests: counts.grouped,
      real_stable_requests: counts.realStable,
      sentinel_requests: counts.sentinelStable,
      clean_exit_code: result.exitCode,
    };
  } finally {
    await close(server);
  }
}

async function verifyFr47FailureCannotUseStableFallback() {
  const counts = {
    grouped: 0,
    realStable: 0,
    sentinelStable: 0,
  };
  const server = http.createServer(async (request, response) => {
    for await (const _chunk of request) {
      // Drain the request before responding.
    }

    if (request.url === '/grouped') {
      counts.grouped += 1;
      sendJson(response, 503, {
        code: 'grouped_hosted_search_failed',
        retryable: true,
      });
      return;
    }

    if (request.url === '/stable') {
      counts.realStable += 1;
      sendJson(response, 200, {
        results: [{
          ref: 'lucide:stable',
          name: 'stable',
          library: 'lucide',
        }],
      });
      return;
    }

    if (request.url === '/stable-grouped-route-must-not-fallback') {
      counts.sentinelStable += 1;
      sendJson(response, 404, {
        code: 'stable_fallback_disabled_for_fr47',
        retryable: false,
      });
      return;
    }

    sendJson(response, 404, { code: 'not_found' });
  });

  try {
    const port = await listen(server);
    const result = await runNode([
      'scripts/measure-search-v2-beta3-fr47-live.mjs',
      '--package-root', resolve('mcp'),
      '--grouped-url', `http://127.0.0.1:${port}/grouped`,
      '--stable-url', `http://127.0.0.1:${port}/stable`,
      '--samples', '3',
      '--minimum-interval-ms', '0',
      '--timeout-ms', '20000',
    ]);

    assert.equal(result.exitCode, 1);
    assert.ok(counts.grouped >= 1);
    assert.equal(counts.realStable, 0);
    assert.ok(counts.sentinelStable >= 1);
    assert.match(result.stdout, /"status": "blocked"/);

    return {
      grouped_requests: counts.grouped,
      real_stable_requests: counts.realStable,
      sentinel_requests: counts.sentinelStable,
      exit_code: result.exitCode,
    };
  } finally {
    await close(server);
  }
}

const groupedLive = await verifyGroupedLiveFailureCannotUseStableFallback();
const fr47 = await verifyFr47FailureCannotUseStableFallback();

console.log(JSON.stringify({
  status: 'ok',
  grouped_live: groupedLive,
  fr47,
}, null, 2));
