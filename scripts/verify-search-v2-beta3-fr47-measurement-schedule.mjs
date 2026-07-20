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

function parseSummary(stdout) {
  return JSON.parse(stdout.trim());
}

function createGroupedFixture({ responseDelayMs = 0 } = {}) {
  const observations = {
    keepaliveRequests: 0,
    groupedRequests: [],
    realStableRequests: 0,
    sentinelRequests: 0,
  };
  const server = http.createServer(async (request, response) => {
    if (request.method === 'OPTIONS' && request.url === '/grouped') {
      observations.keepaliveRequests += 1;
      response.statusCode = 204;
      response.end();
      return;
    }

    let rawBody = '';
    for await (const chunk of request) rawBody += chunk;
    const body = rawBody ? JSON.parse(rawBody) : {};

    if (request.url === '/grouped') {
      const queries = Array.isArray(body.queries) ? body.queries : [];
      observations.groupedRequests.push({
        started_at_ms: Date.now(),
        logical_queries: queries.length,
      });
      if (responseDelayMs > 0) {
        await new Promise((resolveWait) => setTimeout(resolveWait, responseDelayMs));
      }
      sendJson(response, 200, {
        schema_version: 1,
        response_count: queries.length,
        responses: queries.map((query, index) => ({
          index,
          status: 200,
          body: {
            query: query.query,
            results: [{
              icon_id: 'lucide:settings',
              name: 'Settings',
              source_library: 'lucide',
              icon_type: 'svg',
              style: 'outline',
              svg: '<svg viewBox="0 0 24 24"><path d="M4 12h16"/></svg>',
            }],
          },
        })),
      });
      return;
    }

    if (request.url === '/stable') {
      observations.realStableRequests += 1;
      sendJson(response, 200, { results: [] });
      return;
    }

    if (request.url === '/stable-grouped-route-must-not-fallback') {
      observations.sentinelRequests += 1;
      sendJson(response, 404, {
        code: 'stable_fallback_disabled_for_fr47',
        retryable: false,
      });
      return;
    }

    sendJson(response, 404, { code: 'not_found' });
  });
  return { server, observations };
}

function measureArgs(port, extra = []) {
  return [
    'scripts/measure-search-v2-beta3-fr47-live.mjs',
    '--package-root', resolve('mcp'),
    '--grouped-url', `http://127.0.0.1:${port}/grouped`,
    '--stable-url', `http://127.0.0.1:${port}/stable`,
    '--samples', '3',
    '--timeout-ms', '20000',
    ...extra,
  ];
}

async function verifyWarmSchedule() {
  const fixture = createGroupedFixture();
  try {
    const port = await listen(fixture.server);
    const result = await runNode(measureArgs(port, [
      '--rate-window-reset-ms', '40',
      '--keepalive-interval-ms', '10',
    ]));
    assert.equal(result.exitCode, 0, result.stderr);
    const summary = parseSummary(result.stdout);
    assert.equal(summary.status, 'ok');
    assert.equal(summary.warm_measurement_strategy, 'options_keepalive_then_back_to_back_samples');
    assert.equal(summary.scenarios.length, 4);
    assert.deepEqual(summary.scenarios.map((scenario) => scenario.status), [
      'ok',
      'ok',
      'ok',
      'ok',
    ]);
    assert.deepEqual(summary.scenarios.map((scenario) => scenario.latencies_ms.length), [
      3,
      3,
      3,
      1,
    ]);
    assert.equal(fixture.observations.groupedRequests.length, 14);
    assert.ok(fixture.observations.keepaliveRequests >= 16);
    assert.equal(fixture.observations.realStableRequests, 0);
    assert.equal(fixture.observations.sentinelRequests, 0);
    assert.equal(
      fixture.observations.groupedRequests.every((request) => (
        request.logical_queries >= 1 && request.logical_queries <= 40
      )),
      true,
    );

    const scenarioBlocks = [
      { start: 0, measured: 3 },
      { start: 4, measured: 3 },
      { start: 8, measured: 3 },
      { start: 12, measured: 1 },
    ];
    for (const block of scenarioBlocks) {
      const warmup = fixture.observations.groupedRequests[block.start];
      const firstMeasured = fixture.observations.groupedRequests[block.start + 1];
      assert.ok(
        firstMeasured.started_at_ms - warmup.started_at_ms >= 30,
        'A rate-window reset must separate the scenario warmup from measured samples.',
      );
      for (let index = 1; index < block.measured; index += 1) {
        const previous = fixture.observations.groupedRequests[block.start + index];
        const current = fixture.observations.groupedRequests[block.start + index + 1];
        assert.ok(
          current.started_at_ms - previous.started_at_ms < 2000,
          'Measured warm samples must run back to back instead of aging out the worker.',
        );
      }
    }

    return {
      grouped_requests: fixture.observations.groupedRequests.length,
      keepalive_requests: fixture.observations.keepaliveRequests,
      scenario_samples: summary.scenarios.map((scenario) => scenario.latencies_ms.length),
    };
  } finally {
    await close(fixture.server);
  }
}

async function verifyFailedSamplesRemainVisible() {
  const fixture = createGroupedFixture({ responseDelayMs: 3100 });
  try {
    const port = await listen(fixture.server);
    const result = await runNode(measureArgs(port, [
      '--rate-window-reset-ms', '0',
      '--keepalive-interval-ms', '0',
    ]));
    assert.equal(result.exitCode, 1);
    const summary = parseSummary(result.stdout);
    assert.equal(summary.status, 'blocked');
    assert.equal(summary.scenarios.length, 1);
    assert.equal(summary.scenarios[0].id, 'one_slot');
    assert.equal(summary.scenarios[0].status, 'blocked');
    assert.equal(summary.scenarios[0].warmup_calls, 1);
    assert.equal(summary.scenarios[0].latencies_ms.length, 3);
    assert.ok(summary.scenarios[0].p95_ms > 3000);
    assert.match(summary.error.message, /one_slot p95 .* exceeds 3000 ms/);
    assert.equal(fixture.observations.realStableRequests, 0);
    assert.equal(fixture.observations.sentinelRequests, 0);

    return {
      failed_scenario: summary.scenarios[0].id,
      retained_samples: summary.scenarios[0].latencies_ms.length,
      retained_p95_ms: summary.scenarios[0].p95_ms,
    };
  } finally {
    await close(fixture.server);
  }
}

const warmSchedule = await verifyWarmSchedule();
const failureEvidence = await verifyFailedSamplesRemainVisible();

console.log(JSON.stringify({
  status: 'ok',
  warm_schedule: warmSchedule,
  failure_evidence: failureEvidence,
}, null, 2));
