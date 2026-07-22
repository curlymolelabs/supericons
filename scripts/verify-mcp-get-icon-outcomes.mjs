import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const usageEvents = [];
const SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M4 6h16v12H4z"/></svg>';

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve(server.address()));
  });
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    request.on('data', (chunk) => chunks.push(chunk));
    request.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    request.on('error', reject);
  });
}

const mockServer = createServer(async (request, response) => {
  const url = new URL(request.url, 'http://127.0.0.1');
  if (url.pathname === '/rest/v1/mcp_usage_events') {
    usageEvents.push(JSON.parse(await readBody(request)));
    response.writeHead(201);
    response.end();
    return;
  }
  if (url.pathname === '/functions/v1/mcp-search') {
    const body = JSON.parse(await readBody(request));
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(JSON.stringify({
      results: body.query === 'database'
        ? [{
          icon_id: 'lucide:database',
          id: 'database',
          name: 'Database',
          library: 'lucide',
          type: 'free',
          style: 'outline',
          svg: SVG,
          semantic: { depicts: ['database'] },
        }]
        : [],
    }));
    return;
  }
  response.writeHead(404);
  response.end();
});

const mockAddress = await listen(mockServer);
const mockBaseUrl = `http://127.0.0.1:${mockAddress.port}`;
const reservation = createServer();
const reservedAddress = await listen(reservation);
const appPort = reservedAddress.port;
await new Promise((resolve) => reservation.close(resolve));

const child = spawn(process.execPath, ['mcp/remote-server.js'], {
  cwd: rootDir,
  env: {
    ...process.env,
    PORT: String(appPort),
    SUPERICONS_SUPABASE_URL: mockBaseUrl,
    SUPABASE_SERVICE_ROLE_KEY: 'local-contract-test-key',
    RAILWAY_GIT_COMMIT_SHA: 'test-build-123',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
  windowsHide: true,
});
let childOutput = '';
child.stdout.on('data', (chunk) => { childOutput += chunk.toString(); });
child.stderr.on('data', (chunk) => { childOutput += chunk.toString(); });

async function waitForHealth() {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${appPort}/health`);
      if (response.ok) return;
    } catch {
      // The child is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Local MCP server did not become healthy. ${childOutput}`);
}

function payloadFor(result) {
  if (result?.structuredContent) return result.structuredContent;
  const text = result?.content?.find((entry) => entry.type === 'text')?.text;
  return text ? JSON.parse(text) : null;
}

async function waitForUsageEvent(predicate) {
  const deadline = Date.now() + 3000;
  while (Date.now() < deadline) {
    const match = usageEvents.find(predicate);
    if (match) return match;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error('Expected usage event was not written.');
}

const transport = new StreamableHTTPClientTransport(new URL(`http://127.0.0.1:${appPort}/mcp`));
const client = new Client({ name: 'get-icon-outcome-contract', version: '1.0.0' });

try {
  await waitForHealth();
  await client.connect(transport);

  const found = await client.callTool({
    name: 'get_icon',
    arguments: { id: 'database', library: 'lucide', style: 'outline' },
  });
  assert.equal(found.isError, undefined, JSON.stringify(found));
  const foundPayload = payloadFor(found);
  assert.equal(foundPayload.icon.icon_ref, 'lucide:database');
  const foundEvent = await waitForUsageEvent((event) => (
    event.tool_name === 'get_icon' && event.status === 'ok'
  ));
  assert.equal(foundEvent.result_count, 1);
  assert.deepEqual(foundEvent.metadata.returned_icon_refs, ['lucide:database']);
  assert.equal(foundEvent.metadata.returned_icon_refs_recorded, true);
  assert.equal(foundEvent.metadata.traffic_class, 'local');
  assert.equal(foundEvent.metadata.server_build, 'test-build-123');

  const missing = await client.callTool({
    name: 'get_icon',
    arguments: { id: 'definitely-not-a-real-icon', library: 'lucide', style: 'outline' },
  });
  assert.equal(missing.isError, true);
  const missingPayload = payloadFor(missing);
  assert.equal(missingPayload.code, 'icon_not_found');
  assert.equal(missingPayload.retryable, false);
  assert.match(missingPayload.next_step, /search_icons/);
  const missingEvent = await waitForUsageEvent((event) => (
    event.tool_name === 'get_icon' && event.error_code === 'icon_not_found'
  ));
  assert.equal(missingEvent.status, 'error');
  assert.equal(missingEvent.result_count, 0);
  assert.deepEqual(missingEvent.metadata.returned_icon_refs, []);
  assert.equal(missingEvent.metadata.returned_icon_refs_recorded, true);

  console.log(JSON.stringify({
    status: 'ok',
    found_outcome: 'success',
    not_found_code: missingPayload.code,
    result_counts: [foundEvent.result_count, missingEvent.result_count],
    returned_refs_recorded: true,
    traffic_class: foundEvent.metadata.traffic_class,
  }, null, 2));
} finally {
  await client.close().catch(() => {});
  child.kill();
  await new Promise((resolve) => mockServer.close(resolve));
}
