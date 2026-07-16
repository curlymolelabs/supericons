import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

function runNode(argumentsList, environment) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, argumentsList, {
      env: environment,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('close', (code) => resolve({ code, stdout, stderr }));
  });
}

const cases = [
  { name: 'healthy', status: 200, body: { stats: {} }, expectedExit: 0, expectedStatus: 'ok' },
  { name: 'legacy_5xx', status: 503, body: { error: 'unavailable' }, expectedExit: 0, expectedStatus: 'degraded_proceed' },
  { name: 'auth_rejected', status: 401, body: { error: 'unauthorized' }, expectedExit: 1, expectedStatus: 'blocked' },
];

const temporaryDirectory = mkdtempSync(join(tmpdir(), 'supericons-admin-preflight-'));
try {
  for (const testCase of cases) {
    const server = createServer((_request, response) => {
      response.writeHead(testCase.status, { 'content-type': 'application/json' });
      response.end(JSON.stringify(testCase.body));
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    const output = join(temporaryDirectory, `${testCase.name}.json`);
    const result = await runNode([
      'scripts/verify-admin-dashboard-phase-a-admin-api-live.mjs',
      '--admin-url', `http://127.0.0.1:${address.port}`,
      '--mode', 'preflight',
      '--output', output,
    ], { ...process.env, PHASE_A_ADMIN_SECRET: 'test-only-secret' });
    await new Promise((resolve) => server.close(resolve));

    assert.equal(result.code, testCase.expectedExit, `${testCase.name} exit code did not match. ${result.stderr}`);
    const evidence = JSON.parse(readFileSync(output, 'utf8'));
    assert.equal(evidence.status, testCase.expectedStatus, `${testCase.name} evidence status did not match.`);
    assert.equal(evidence.preflight.http_status, testCase.status);
  }
} finally {
  rmSync(temporaryDirectory, { recursive: true, force: true });
}

console.log(JSON.stringify({ status: 'ok', cases: cases.map(({ name }) => name) }));
