import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const rootDir = process.cwd();
const workspace = join(rootDir, 'tmp', 'verify-material-engine-attribution');
rmSync(workspace, { recursive: true, force: true });
mkdirSync(workspace, { recursive: true });

let mode = 'healthy';
const receivedBodies = [];
const server = createServer(async (request, response) => {
  let raw = '';
  for await (const chunk of request) raw += chunk;
  const body = JSON.parse(raw);
  receivedBodies.push(body);
  if (mode === 'error' || (mode === 'mixed' && body.query === 'cog')) {
    response.writeHead(500, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ error: 'search_service_unavailable' }));
    return;
  }
  await new Promise((resolvePromise) => setTimeout(resolvePromise, 20));
  response.writeHead(200, { 'Content-Type': 'application/json' });
  response.end(JSON.stringify({
    results: Array.from({ length: 10 }, (_, index) => ({
      library: index === 0 ? 'material' : 'lucide',
      icon_id: `settings-${index}`,
    })),
  }));
});

await new Promise((resolvePromise) => server.listen(0, '127.0.0.1', resolvePromise));
const { port } = server.address();
const searchUrl = `http://127.0.0.1:${port}/mcp-search`;

function writeGate(label, throughCandidateMs, includeDegradedCog = false) {
  const path = join(workspace, `${label}-gate.json`);
  const latencyFailures = [{
    case_id: 'all_mode_settings',
    metric: 'elapsed_ms',
    through_candidate_ms: throughCandidateMs,
    gate_ms: 100,
    direct_request: {
      query: 'settings', library_mode: 'strict', style: 'any', limit: 10, locale: null,
    },
    expected: { result_count: 10 },
  }];
  if (includeDegradedCog) {
    latencyFailures.push({
      case_id: 'all_mode_cog',
      metric: 'elapsed_ms',
      through_candidate_ms: 200,
      gate_ms: 100,
      direct_request: {
        query: 'cog', library_mode: 'strict', style: 'any', limit: 10, locale: null,
      },
      expected: { result_count: 10 },
    });
  }
  writeFileSync(path, `${JSON.stringify({
    artifact: 'material_railway_recovery_live_gate',
    profile: 'engine-dependent',
    status: 'latency_failed',
    checks: Array.from({ length: 6 }, (_, index) => ({ name: `check-${index + 1}` })),
    latency_failures: latencyFailures,
  }, null, 2)}\n`, 'utf8');
  return path;
}

async function runAttribution(label, throughCandidateMs, includeDegradedCog = false) {
  const gate = writeGate(label, throughCandidateMs, includeDegradedCog);
  const output = join(workspace, `${label}-output.json`);
  const result = await new Promise((resolvePromise) => {
    const child = spawn(process.execPath, [
      'scripts/probe-material-engine-attribution.mjs',
      '--search-url', searchUrl,
      '--gate-evidence', gate,
      '--output', output,
      '--overhead-budget-ms', '1000',
      '--request-timeout-ms', '2000',
    ], { cwd: rootDir });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('close', (status) => resolvePromise({ status, stdout, stderr }));
  });
  return { result, artifact: JSON.parse(readFileSync(output, 'utf8')) };
}

try {
  const attributed = await runAttribution('engine-attributed', 200);
  assert.equal(attributed.result.status, 0, attributed.result.stderr || attributed.result.stdout);
  assert.equal(attributed.artifact.status, 'engine_attributed');
  assert.equal(attributed.artifact.comparisons[0].status, 'engine_attributed');

  const posted = receivedBodies[0];
  assert.deepEqual({
    query: posted.query,
    library_mode: posted.library_mode,
    style: posted.style,
    limit: posted.limit,
    locale: posted.locale,
  }, {
    query: 'settings', library_mode: 'strict', style: 'any', limit: 10, locale: null,
  });
  assert.equal(posted.source, 'verify');
  assert.equal(posted.channel, 'internal_test');
  assert.equal(posted.environment, 'production');

  const overhead = await runAttribution('candidate-overhead', 2000);
  assert.equal(overhead.result.status, 2);
  assert.equal(overhead.artifact.status, 'candidate_overhead');
  assert.equal(overhead.artifact.comparisons[0].status, 'candidate_overhead');

  mode = 'mixed';
  const mixed = await runAttribution('candidate-overhead-precedence', 2000, true);
  assert.equal(mixed.result.status, 2);
  assert.equal(mixed.artifact.status, 'candidate_overhead');
  assert.deepEqual(mixed.artifact.comparisons.map((entry) => entry.status), [
    'candidate_overhead', 'dependency_degraded',
  ]);

  mode = 'error';
  const degraded = await runAttribution('dependency-degraded', 200);
  assert.equal(degraded.result.status, 1);
  assert.equal(degraded.artifact.status, 'dependency_degraded');
  assert.equal(degraded.artifact.comparisons[0].status, 'dependency_degraded');

  console.log('verify-material-engine-attribution: 4 checks passed');
} finally {
  await new Promise((resolvePromise) => server.close(resolvePromise));
  rmSync(workspace, { recursive: true, force: true });
}
