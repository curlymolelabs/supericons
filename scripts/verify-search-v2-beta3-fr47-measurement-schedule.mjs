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

function createGroupedFixture({ responseDelayMs = 0, workerStates = null } = {}) {
  const observations = {
    fixtureStartedAtMs: Date.now(),
    groupedRequests: [],
    realStableRequests: 0,
    sentinelRequests: 0,
  };
  const server = http.createServer(async (request, response) => {
    let rawBody = '';
    for await (const chunk of request) rawBody += chunk;
    const body = rawBody ? JSON.parse(rawBody) : {};

    if (request.url === '/grouped') {
      const queries = Array.isArray(body.queries) ? body.queries : [];
      const requestOrdinal = observations.groupedRequests.length + 1;
      const workerState = Array.isArray(workerStates)
        ? workerStates[Math.min(requestOrdinal - 1, workerStates.length - 1)]
        : requestOrdinal === 1 ? 'first_request' : 'reused_worker';
      observations.groupedRequests.push({
        started_at_ms: Date.now(),
        logical_queries: queries.length,
        worker_state: workerState,
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
        measurement_timing: {
          schema_version: 2,
          event: 'search_stage_timing',
          measurement_variant: 'unspecified',
          worker_state: workerState,
          worker_request_ordinal: requestOrdinal,
          module_age_ms_at_handler_entry: Date.now() - observations.fixtureStartedAtMs,
          outcome: 'results',
          total_ms: responseDelayMs,
          stages_ms: {
            candidate_search: Math.max(0, responseDelayMs - 1),
            audit_write: 1,
          },
          counts: {
            query_variants: queries.length,
            candidate_rows: queries.length,
            unique_candidates: queries.length,
            final_results: queries.length,
          },
          approximate_sizes: {
            candidate_svg_characters: 0,
            candidate_payload_characters: 0,
            response_json_characters: 0,
          },
        },
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

async function verifyWorkerClassifiedSchedule() {
  const fixture = createGroupedFixture();
  try {
    const port = await listen(fixture.server);
    const result = await runNode(measureArgs(port, [
      '--rate-window-reset-ms', '40',
    ]));
    assert.equal(result.exitCode, 0, result.stderr);
    const summary = parseSummary(result.stdout);
    assert.equal(summary.status, 'ok');
    assert.equal(
      summary.measurement_strategy,
      'actual_routed_samples_with_worker_classification',
    );
    assert.equal(summary.worker_affinity_assumed, false);
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
    assert.equal(fixture.observations.groupedRequests.length, 10);
    assert.equal(fixture.observations.realStableRequests, 0);
    assert.equal(fixture.observations.sentinelRequests, 0);
    assert.equal(
      summary.scenarios.every((scenario) => (
        scenario.rate_window_resets[0].duration_ms >= 30
        && scenario.rate_window_resets.every((reset) => reset.network_requests === 0)
        && scenario.worker_affinity_assumed === false
      )),
      true,
    );
    assert.deepEqual(
      summary.scenarios.map((scenario) => scenario.worker_cohorts.reused_worker.sample_count),
      [2, 3, 3, 1],
    );
    assert.deepEqual(
      summary.scenarios.map((scenario) => scenario.worker_cohorts.first_request.sample_count),
      [1, 0, 0, 0],
    );
    assert.equal(
      summary.scenarios.every((scenario) => scenario.sample_records.every((sample) => (
        ['first_request', 'reused_worker'].includes(sample.worker_state)
        && Number.isInteger(sample.worker_request_ordinal)
        && Number.isFinite(sample.module_age_ms_at_handler_entry)
        && Number.isFinite(sample.handler_total_ms)
        && Number.isInteger(sample.query_variants)
        && Number.isInteger(sample.candidate_rows)
        && Number.isInteger(sample.final_results)
        && Number.isFinite(sample.response_json_characters)
      ))),
      true,
    );
    assert.equal(
      fixture.observations.groupedRequests.every((request) => (
        request.logical_queries >= 1 && request.logical_queries <= 40
      )),
      true,
    );

    return {
      grouped_requests: fixture.observations.groupedRequests.length,
      reset_network_requests: 0,
      scenario_samples: summary.scenarios.map((scenario) => scenario.latencies_ms.length),
      reused_worker_samples: summary.scenarios.map(
        (scenario) => scenario.worker_cohorts.reused_worker.sample_count,
      ),
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
    ]));
    assert.equal(result.exitCode, 1);
    const summary = parseSummary(result.stdout);
    assert.equal(summary.status, 'blocked');
    assert.equal(summary.scenarios.length, 1);
    assert.equal(summary.scenarios[0].id, 'one_slot');
    assert.equal(summary.scenarios[0].status, 'blocked');
    assert.equal(summary.scenarios[0].latencies_ms.length, 3);
    assert.ok(summary.scenarios[0].overall_p95_ms > 3000);
    assert.match(summary.error.message, /one_slot p95 .* exceeds 3000 ms/);
    assert.equal(fixture.observations.realStableRequests, 0);
    assert.equal(fixture.observations.sentinelRequests, 0);

    return {
      failed_scenario: summary.scenarios[0].id,
      retained_samples: summary.scenarios[0].latencies_ms.length,
      retained_p95_ms: summary.scenarios[0].overall_p95_ms,
    };
  } finally {
    await close(fixture.server);
  }
}

async function verifyMixedWorkerClassification() {
  const fixture = createGroupedFixture({
    workerStates: [
      'first_request',
      'reused_worker',
      'first_request',
      'reused_worker',
      'first_request',
      'reused_worker',
    ],
  });
  try {
    const port = await listen(fixture.server);
    const result = await runNode(measureArgs(port, ['--rate-window-reset-ms', '0']));
    assert.equal(result.exitCode, 0, result.stderr);
    const summary = parseSummary(result.stdout);
    const firstScenario = summary.scenarios[0];
    assert.equal(firstScenario.worker_cohorts.first_request.sample_count, 2);
    assert.equal(firstScenario.worker_cohorts.reused_worker.sample_count, 1);
    assert.equal(firstScenario.status, 'ok');
    assert.equal(summary.status, 'ok');
    return {
      first_request_samples: firstScenario.worker_cohorts.first_request.sample_count,
      reused_worker_samples: firstScenario.worker_cohorts.reused_worker.sample_count,
    };
  } finally {
    await close(fixture.server);
  }
}

async function verifyAllFirstRequestCohortPasses() {
  const fixture = createGroupedFixture({ workerStates: ['first_request'] });
  try {
    const port = await listen(fixture.server);
    const result = await runNode(measureArgs(port, ['--rate-window-reset-ms', '0']));
    assert.equal(result.exitCode, 0, result.stderr);
    const summary = parseSummary(result.stdout);
    assert.equal(summary.scenarios.length, 4);
    assert.equal(summary.scenarios[0].worker_cohorts.first_request.sample_count, 3);
    assert.equal(summary.scenarios[0].worker_cohorts.reused_worker.sample_count, 0);
    assert.equal(
      summary.scenarios.every((scenario) => scenario.worker_cohorts.reused_worker.sample_count === 0),
      true,
    );
    assert.equal(summary.status, 'ok');
    return {
      first_request_samples: summary.scenarios.reduce(
        (total, scenario) => total + scenario.worker_cohorts.first_request.sample_count,
        0,
      ),
      reused_worker_samples: 0,
      release_passed: true,
    };
  } finally {
    await close(fixture.server);
  }
}

const workerClassifiedSchedule = await verifyWorkerClassifiedSchedule();
const failureEvidence = await verifyFailedSamplesRemainVisible();
const mixedWorkerClassification = await verifyMixedWorkerClassification();
const allFirstRequestCohort = await verifyAllFirstRequestCohortPasses();

console.log(JSON.stringify({
  status: 'ok',
  worker_classified_schedule: workerClassifiedSchedule,
  failure_evidence: failureEvidence,
  mixed_worker_classification: mixedWorkerClassification,
  all_first_request_cohort: allFirstRequestCohort,
}, null, 2));
