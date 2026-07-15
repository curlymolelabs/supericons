import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdirSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const rootDir = process.cwd();
const workspace = join(rootDir, 'tmp', 'verify-material-search-engine-probe');
rmSync(workspace, { recursive: true, force: true });
mkdirSync(workspace, { recursive: true });

let mode = 'healthy';
const server = createServer(async (_request, response) => {
  if (mode === 'slow') await new Promise((resolvePromise) => setTimeout(resolvePromise, 60));
  if (mode === 'error') {
    response.writeHead(500, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ error: 'search_service_unavailable' }));
    return;
  }
  response.writeHead(200, { 'Content-Type': 'application/json' });
  response.end(JSON.stringify({
    results: [
      { library: 'lucide', icon_id: 'calendar', svg: '<svg></svg>' },
      { library: 'lucide', icon_id: 'calendar-days', svg: '<svg></svg>' },
      { library: 'lucide', icon_id: 'calendar-range', svg: '<svg></svg>' },
    ],
  }));
});

await new Promise((resolvePromise) => server.listen(0, '127.0.0.1', resolvePromise));
const { port } = server.address();
const url = `http://127.0.0.1:${port}/mcp-search`;

async function runProbe(label, extraArgs = []) {
  const output = join(workspace, `${label}.json`);
  const result = await new Promise((resolvePromise) => {
    const child = spawn(process.execPath, [
      'scripts/probe-material-search-engine.mjs',
      '--search-url', url,
      '--output', output,
      '--count', '1',
      '--interval-ms', '0',
      '--request-timeout-ms', '2000',
      ...extraArgs,
    ], { cwd: rootDir });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('close', (status) => resolvePromise({ status, stdout, stderr }));
  });
  return {
    result,
    artifact: JSON.parse(readFileSync(output, 'utf8')),
  };
}

try {
  const healthy = await runProbe('healthy', ['--latency-limit-ms', '1000']);
  assert.equal(healthy.result.status, 0, healthy.result.stderr || healthy.result.stdout);
  assert.equal(healthy.artifact.status, 'ok');
  assert.equal(healthy.artifact.probes.length, 1);

  mode = 'error';
  const error = await runProbe('error', ['--latency-limit-ms', '1000']);
  assert.equal(error.result.status, 1);
  assert.equal(error.artifact.status, 'degraded');
  assert.equal(error.artifact.probes[0].status_code, 500);

  mode = 'slow';
  const slow = await runProbe('slow', ['--latency-limit-ms', '10']);
  assert.equal(slow.result.status, 1);
  assert.equal(slow.artifact.status, 'degraded');
  assert.match(slow.artifact.error, /above 10 ms/);

  const slowRecorded = await runProbe('slow-recorded', [
    '--latency-limit-ms', '10', '--latency-policy', 'record-only',
  ]);
  assert.equal(slowRecorded.result.status, 0, slowRecorded.result.stderr || slowRecorded.result.stdout);
  assert.equal(slowRecorded.artifact.status, 'ok');
  assert.equal(slowRecorded.artifact.contract.latency_policy, 'record-only');
  assert.equal(slowRecorded.artifact.probes[0].latency_exceeded, true);

  console.log('verify-material-search-engine-probe: 4 checks passed');
} finally {
  await new Promise((resolvePromise) => server.close(resolvePromise));
  rmSync(workspace, { recursive: true, force: true });
}
