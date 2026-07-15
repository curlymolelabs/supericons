import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const SVG = '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0h24v24H0z"/></svg>';
const usageEvents = [];
const snapshotRequests = [];
let snapshotFailure = false;
let hostedSearchRequests = 0;

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve(server.address()));
  });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

const mockServer = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1');
  if (url.pathname === '/material-snapshot') {
    snapshotRequests.push({
      icon: url.searchParams.get('icon'),
      fill: url.searchParams.get('fill'),
      wght: url.searchParams.get('wght'),
    });
    if (snapshotFailure) {
      res.writeHead(502, { 'content-type': 'text/plain' });
      res.end('snapshot unavailable');
      return;
    }
    res.writeHead(200, { 'content-type': 'image/svg+xml' });
    res.end(SVG);
    return;
  }

  if (url.pathname === '/rest/v1/mcp_usage_events') {
    usageEvents.push(JSON.parse(await readBody(req)));
    res.writeHead(201);
    res.end();
    return;
  }

  if (url.pathname === '/functions/v1/mcp-search') {
    hostedSearchRequests += 1;
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ results: [] }));
    return;
  }

  res.writeHead(404);
  res.end();
});

const mockAddress = await listen(mockServer);
const mockBaseUrl = `http://127.0.0.1:${mockAddress.port}`;
const portReservation = createServer();
const reservedAddress = await listen(portReservation);
const appPort = reservedAddress.port;
await new Promise((resolve) => portReservation.close(resolve));
const child = spawn(process.execPath, ['mcp/remote-server.js'], {
  cwd: rootDir,
  env: {
    ...process.env,
    PORT: String(appPort),
    SUPERICONS_SUPABASE_URL: mockBaseUrl,
    SUPERICONS_MCP_SEARCH_URL: `${mockBaseUrl}/functions/v1/mcp-search`,
    SUPERICONS_MATERIAL_SNAPSHOT_URL: `${mockBaseUrl}/material-snapshot`,
    SUPERICONS_MATERIAL_BUNDLE_PATH: join(rootDir, 'tmp', 'missing-material-bundle.json.gz'),
    SUPERICONS_MATERIAL_BUNDLE_MANIFEST_PATH: join(rootDir, 'tmp', 'missing-material-bundle-manifest.json'),
    SUPABASE_SERVICE_ROLE_KEY: 'local-contract-test-key',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
  windowsHide: true,
});
let childOutput = '';
child.stdout.on('data', (chunk) => { childOutput += chunk.toString(); });
child.stderr.on('data', (chunk) => { childOutput += chunk.toString(); });

async function waitForHealth() {
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${appPort}/health`);
      if (response.ok) return response.json();
    } catch {
      // The child is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Local MCP server did not become healthy. ${childOutput}`);
}

function parsePayload(result) {
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
const client = new Client({ name: 'material-server-contract', version: '1.0.0' });

try {
  const health = await waitForHealth();
  assert.equal(health.material_assets.available, false);
  await client.connect(transport);

  const exact = await client.callTool({
    name: 'get_icon',
    arguments: { id: 'settings', library: 'material', style: 'outline' },
  });
  assert.equal(exact.isError, undefined);
  assert.equal(parsePayload(exact).icon.id, 'settings');
  assert.equal(snapshotRequests.length, 1, 'exact lookup must fetch one asset');
  assert.equal(snapshotRequests[0].icon, 'settings');
  const exactEvent = await waitForUsageEvent((event) => (
    event.tool_name === 'get_icon' && event.status === 'ok'
  ));
  assert.equal(exactEvent.query_origin, 'icon_lookup');
  assert.equal(exactEvent.requested_limit, 1);
  assert.equal(exactEvent.client_ip_public, false);
  assert.equal(exactEvent.country_code, null);

  const preview = await client.callTool({
    name: 'preview_icons',
    arguments: {
      icon_refs: ['material:settings', 'material:home', 'material:person'],
      style: 'solid',
      include_image: true,
      limit: 3,
    },
  });
  const previewPayload = parsePayload(preview);
  assert.equal(previewPayload.image_included, true);
  assert.equal(previewPayload.results.length, 3);
  assert.ok(preview.content.some((entry) => (
    entry.type === 'image' && entry.mimeType === 'image/png' && entry.data.startsWith('iVBOR')
  )), 'preview must include PNG image content');
  assert.equal(snapshotRequests.length, 4, 'three fixed refs must add exactly three asset fetches');

  const beforeAllMode = snapshotRequests.length;
  const allModeSolid = await client.callTool({
    name: 'search_icons',
    arguments: { query: 'settings', library_mode: 'all', style: 'solid', limit: 5 },
  });
  const allModePayload = parsePayload(allModeSolid);
  assert.equal(allModePayload.results.length, 5);
  assert.ok(allModePayload.results.every((row) => row.library === 'material' && row.style === 'solid' && row.svg));
  assert.ok(snapshotRequests.length - beforeAllMode <= 5);
  assert.equal(hostedSearchRequests, 0, 'verified Material-only solid mode must not contact hosted search');
  const searchEvent = await waitForUsageEvent((event) => (
    event.tool_name === 'search_icons' && event.status === 'ok'
  ));
  assert.equal(searchEvent.query_origin, 'agent_query');
  assert.equal(searchEvent.requested_limit, 5);
  assert.equal(searchEvent.client_ip_public, false);

  snapshotFailure = true;
  const failed = await client.callTool({
    name: 'get_icon',
    arguments: { id: 'alarm', library: 'material', style: 'solid' },
  });
  assert.equal(failed.isError, true, 'snapshot failure must surface as an MCP tool error');
  const errorEvent = await waitForUsageEvent((event) => (
    event.tool_name === 'get_icon' && event.status === 'error'
  ));
  assert.equal(errorEvent.error_code, 'material_asset_unavailable');
  assert.equal(errorEvent.search_outcome, null);

  console.log(JSON.stringify({
    status: 'ok',
    exact_lookup_asset_fetches: 1,
    fixed_preview_asset_fetches: 3,
    preview_png_verified: true,
    all_mode_solid_count: allModePayload.results.length,
    error_code: errorEvent.error_code,
    hosted_search_requests: hostedSearchRequests,
    telemetry_contract: {
      get_icon: {
        query_origin: exactEvent.query_origin,
        requested_limit: exactEvent.requested_limit,
        client_ip_public: exactEvent.client_ip_public,
      },
      search_icons: {
        query_origin: searchEvent.query_origin,
        requested_limit: searchEvent.requested_limit,
        client_ip_public: searchEvent.client_ip_public,
      },
    },
  }));
} finally {
  await client.close().catch(() => {});
  child.kill();
  await new Promise((resolve) => mockServer.close(resolve));
}
