import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const relevance = JSON.parse(readFileSync(
  'references/verification/material-relevance-fixture-2026-07-14.json',
  'utf8',
));
const acceptableByQuery = new Map(
  relevance.queries.map((entry) => [entry.query, entry.acceptable_icon_ids[0]]),
);
const tempDir = mkdtempSync(join(tmpdir(), 'supericons-material-production-runner-'));
const outputPath = join(tempDir, 'result.json');
const revision = 'a'.repeat(40);

function svg() {
  return '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M1 1h22v22H1z"/></svg>';
}

function resultsFor(query) {
  if (query.library === 'material') {
    const acceptable = acceptableByQuery.get(query.query) || 'settings';
    return [{
      icon_id: `material:${acceptable}`,
      id: acceptable,
      library: 'material',
      source_library: 'material',
      style: query.style,
      svg: svg(),
    }];
  }
  return Array.from({ length: query.limit }, (_, index) => ({
    icon_id: `lucide:mock-${index}`,
    id: `mock-${index}`,
    library: 'lucide',
    source_library: 'lucide',
    style: 'outline',
    svg: svg(),
  }));
}

const server = createServer((request, response) => {
  let rawBody = '';
  request.setEncoding('utf8');
  request.on('data', (chunk) => { rawBody += chunk; });
  request.on('end', () => {
    try {
      const payload = JSON.parse(rawBody);
      assert.equal(payload.queries, undefined, 'Stable mcp-search does not accept a grouped query envelope.');
      if (payload.client_family === 'material_release_gate') {
        assert.ok(
          payload.source === 'verify'
          && payload.channel === 'internal_test'
          && payload.environment === 'production'
          && payload.tool_name === 'search_icons'
          && typeof payload.dedupe_key === 'string',
          'Production release query audit contract changed.',
        );
      }
      response.writeHead(200, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ results: resultsFor(payload) }));
    } catch (error) {
      response.writeHead(500, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }));
    }
  });
});

async function listen() {
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  return server.address().port;
}

async function reservePort() {
  const reservation = createServer();
  await new Promise((resolve, reject) => {
    reservation.once('error', reject);
    reservation.listen(0, '127.0.0.1', resolve);
  });
  const port = reservation.address().port;
  await new Promise((resolve) => reservation.close(resolve));
  return port;
}

async function startRemoteMcp(searchPort) {
  const port = await reservePort();
  const child = spawn(process.execPath, ['mcp/remote-server.js'], {
    env: {
      ...process.env,
      PORT: String(port),
      SUPERICONS_MCP_SEARCH_URL: `http://127.0.0.1:${searchPort}/mcp-search`,
      SUPERICONS_REMOTE_MCP_BASE_URL: `http://127.0.0.1:${port}`,
      SUPERICONS_API_KEY: '',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (chunk) => { stdout += chunk; });
  child.stderr.on('data', (chunk) => { stderr += chunk; });

  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (child.exitCode !== null) {
      throw new Error(`Hosted MCP exited during startup. ${stderr || stdout}`);
    }
    try {
      const response = await fetch(`http://127.0.0.1:${port}/health`);
      if (response.ok) return { child, port, getOutput: () => ({ stdout, stderr }) };
    } catch {
      // The process is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  child.kill();
  throw new Error(`Hosted MCP did not become healthy. ${stderr || stdout}`);
}

async function stopChild(child) {
  if (!child || child.exitCode !== null) return;
  child.kill();
  await new Promise((resolve) => {
    const timeout = setTimeout(resolve, 5000);
    child.once('close', () => {
      clearTimeout(timeout);
      resolve();
    });
  });
}

async function runChild(searchPort, mcpPort) {
  return await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [
      'scripts/verify-material-production-release.mjs',
      '--revision', revision,
      '--output', outputPath,
      '--search-url', `http://127.0.0.1:${searchPort}/mcp-search`,
      '--mcp-url', `http://127.0.0.1:${mcpPort}/mcp`,
    ], { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.once('error', reject);
    child.once('close', (code) => resolve({ code, stdout, stderr }));
  });
}

let remoteMcp = null;
try {
  const port = await listen();
  remoteMcp = await startRemoteMcp(port);
  const result = await runChild(port, remoteMcp.port);
  assert.equal(result.code, 0, result.stderr || result.stdout);
  const artifact = JSON.parse(readFileSync(outputPath, 'utf8'));
  assert.equal(artifact.revision, revision);
  assert.equal(artifact.search.request_count, 92);
  assert.equal(artifact.search.logical_queries, 92);
  assert.equal(artifact.search.relevance_checks, 40);
  assert.equal(artifact.search.smoke_checks, 50);
  assert.equal(artifact.search.all_mode_checks, 2);
  assert.equal(artifact.hosted_mcp.material_library.count, 4262);
  assert.deepEqual(artifact.hosted_mcp.material_library.supported_styles, ['outline', 'solid']);
  assert.equal(artifact.hosted_mcp.exact_icon_checks.outline, true);
  assert.equal(artifact.hosted_mcp.exact_icon_checks.solid, true);
  assert.ok(artifact.hosted_mcp.recommendation_icon_id);
  assert.ok(artifact.hosted_mcp.preview_result_count > 0);
  assert.match(
    readFileSync('scripts/verify-material-production-release.mjs', 'utf8'),
    /Production release evidence already exists/,
  );
  console.log(JSON.stringify({
    status: 'ok',
    request_count: artifact.search.request_count,
    logical_queries: artifact.search.logical_queries,
    relevance_checks: artifact.search.relevance_checks,
    smoke_checks: artifact.search.smoke_checks,
    all_mode_checks: artifact.search.all_mode_checks,
    hosted_mcp_tools_checked: 5,
    internal_test_audit_contract: true,
    hosted_systems_touched: false,
  }, null, 2));
} finally {
  await stopChild(remoteMcp?.child);
  await new Promise((resolve) => server.close(resolve));
  rmSync(tempDir, { recursive: true, force: true });
}
