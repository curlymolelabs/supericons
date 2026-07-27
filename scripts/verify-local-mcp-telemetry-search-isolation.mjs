import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { performance } from 'node:perf_hooks';

const rootDir = join(import.meta.dirname, '..');
const mcpDir = join(rootDir, 'mcp');
const configDir = await mkdtemp(join(tmpdir(), 'supericons-telemetry-isolation-'));
const telemetryRequests = [];
let delayTelemetry = false;

const httpServer = createServer(async (request, response) => {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  telemetryRequests.push({ url: request.url, body });

  if (
    delayTelemetry
    && request.url === '/functions/v1/local-mcp-telemetry'
  ) {
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  response.writeHead(202, { 'Content-Type': 'application/json' });
  response.end(JSON.stringify({ accepted: true, duplicate: false }));
});

await new Promise((resolve, reject) => {
  httpServer.once('error', reject);
  httpServer.listen(0, '127.0.0.1', resolve);
});
const address = httpServer.address();
const baseUrl = `http://127.0.0.1:${address.port}`;

let client;
let transport;
const localOutcomeRequests = () => telemetryRequests.filter((entry) => (
  entry.url === '/functions/v1/local-mcp-telemetry'
));
try {
  const sdkBase = join(
    mcpDir,
    'node_modules',
    '@modelcontextprotocol',
    'sdk',
    'dist',
    'esm',
    'client',
  );
  const { Client } = await import(pathToFileURL(join(sdkBase, 'index.js')).href);
  const { StdioClientTransport } = await import(
    pathToFileURL(join(sdkBase, 'stdio.js')).href
  );

  transport = new StdioClientTransport({
    command: process.execPath,
    args: [join(mcpDir, 'index.js')],
    cwd: mcpDir,
    env: {
      ...process.env,
      SUPERICONS_API_KEY: '',
      SUPERICONS_CONFIG_DIR: configDir,
      SUPERICONS_MCP_LOG_STARTUP: '0',
      SUPERICONS_SUPABASE_URL: baseUrl,
    },
    stderr: 'pipe',
  });
  client = new Client({
    name: 'local-attribution-isolation-check',
    version: '1.0.0',
  });
  await client.connect(transport);

  const input = {
    name: 'search_icons',
    arguments: {
      query: 'settings',
      library_mode: 'all',
      style: 'outline',
      limit: 8,
      include_query_frame: true,
    },
  };

  const quickStartedAt = performance.now();
  const quickResult = await client.callTool(input);
  const quickElapsedMs = performance.now() - quickStartedAt;

  const quickDeadline = Date.now() + 2000;
  while (localOutcomeRequests().length < 1 && Date.now() < quickDeadline) {
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  assert.equal(localOutcomeRequests().length, 1);

  delayTelemetry = true;
  const delayedStartedAt = performance.now();
  const delayedResult = await client.callTool(input);
  const delayedElapsedMs = performance.now() - delayedStartedAt;

  const delayedDeadline = Date.now() + 2000;
  while (localOutcomeRequests().length < 2 && Date.now() < delayedDeadline) {
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  assert.equal(localOutcomeRequests().length, 2);

  assert.deepEqual(
    delayedResult,
    quickResult,
    'Telemetry timing changed the search response.',
  );
  assert.ok(
    delayedElapsedMs < 750,
    `Search waited for delayed telemetry: ${delayedElapsedMs.toFixed(1)} ms`,
  );
  assert.equal(
    localOutcomeRequests().every((entry) => (
      entry.url === '/functions/v1/local-mcp-telemetry'
      && entry.body.contract_version === 3
    )),
    true,
  );

  console.log(JSON.stringify({
    status: 'passed',
    response_bytes_equal: true,
    ordered_results_equal: true,
    quick_search_ms: Number(quickElapsedMs.toFixed(1)),
    delayed_telemetry_search_ms: Number(delayedElapsedMs.toFixed(1)),
    delayed_telemetry_ms: 1500,
    search_latency_threshold_ms: 750,
    telemetry_requests: localOutcomeRequests().length,
    v2_retry_requests: telemetryRequests.filter((entry) => (
      String(entry.url).includes('/rpc/si_log_mcp_search_outcome_v2')
    )).length,
  }, null, 2));
} finally {
  if (transport) await transport.close().catch(() => {});
  void client;
  await new Promise((resolve) => httpServer.close(resolve));
  await rm(configDir, { recursive: true, force: true });
}
