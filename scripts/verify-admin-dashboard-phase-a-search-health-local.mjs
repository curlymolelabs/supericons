import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const temporaryDirectory = mkdtempSync(join(tmpdir(), 'phase-a-search-health-'));
const outputPath = join(temporaryDirectory, 'evidence.json');
let requestCount = 0;
const server = createServer((request, response) => {
  requestCount += 1;
  response.writeHead(200, { 'content-type': 'application/json' });
  response.end(JSON.stringify({
    results: [
      { id: 'calendar', library: 'lucide' },
      { id: 'calendar-days', library: 'lucide' },
      { id: 'calendar-range', library: 'lucide' },
    ],
  }));
});

await new Promise((resolvePromise) => server.listen(0, '127.0.0.1', resolvePromise));
const address = server.address();
assert.ok(address && typeof address === 'object');

try {
  const child = spawn(process.execPath, [
    'scripts/verify-admin-dashboard-phase-a-search-health.mjs',
    '--search-url', `http://127.0.0.1:${address.port}`,
    '--output', outputPath,
    '--warmup-count', '1',
    '--measured-count', '2',
    '--latency-limit-ms', '2000',
    '--request-timeout-ms', '5000',
  ], { cwd: process.cwd(), stdio: ['ignore', 'pipe', 'pipe'] });
  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (chunk) => { stdout += chunk; });
  child.stderr.on('data', (chunk) => { stderr += chunk; });
  const exitCode = await new Promise((resolvePromise) => child.on('close', resolvePromise));
  assert.equal(exitCode, 0, stderr || stdout);
  const evidence = JSON.parse(readFileSync(outputPath, 'utf8'));
  assert.equal(evidence.status, 'ok');
  assert.equal(evidence.warmups.length, 1);
  assert.equal(evidence.measurements.length, 2);
  assert.equal(evidence.synthetic_internal_test_calls, 3);
  assert.equal(requestCount, 3);
  console.log(JSON.stringify({ status: 'ok', cases: 1, requests: requestCount }, null, 2));
} finally {
  await new Promise((resolvePromise) => server.close(resolvePromise));
  rmSync(temporaryDirectory, { recursive: true, force: true });
}
