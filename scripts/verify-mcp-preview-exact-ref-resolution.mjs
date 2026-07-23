import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><path d="M2 2h20v20H2z"/></svg>';
let hostedSearchRequests = 0;
let materialSnapshotRequests = 0;

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
  if (url.pathname === '/functions/v1/mcp-search') {
    hostedSearchRequests += 1;
    const body = JSON.parse(await readBody(req));
    await new Promise((resolve) => setTimeout(resolve, 150));
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({
      results: [
        {
          icon_id: 'lucide:folder',
          id: 'folder',
          name: 'Folder',
          library: 'lucide',
          source_library: 'lucide',
          icon_type: 'svg',
          style: 'outline',
          svg: SVG,
          matched_query: body.query,
        },
      ],
    }));
    return;
  }
  if (url.pathname === '/material-snapshot') {
    materialSnapshotRequests += 1;
    res.writeHead(500, { 'content-type': 'text/plain' });
    res.end('The packaged Material bundle should satisfy this request.');
    return;
  }
  if (url.pathname === '/rest/v1/mcp_usage_events') {
    await readBody(req);
    res.writeHead(201);
    res.end();
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
const appBaseUrl = `http://127.0.0.1:${appPort}`;
const child = spawn(process.execPath, ['mcp/remote-server.js'], {
  cwd: rootDir,
  env: {
    ...process.env,
    PORT: String(appPort),
    SUPERICONS_SUPABASE_URL: mockBaseUrl,
    SUPERICONS_MCP_SEARCH_URL: `${mockBaseUrl}/functions/v1/mcp-search`,
    SUPERICONS_MATERIAL_SNAPSHOT_URL: `${mockBaseUrl}/material-snapshot`,
    SUPERICONS_MCP_BASE_URL: appBaseUrl,
    SUPERICONS_WEB_BASE_URL: appBaseUrl,
    SUPABASE_SERVICE_ROLE_KEY: 'local-preview-test-key',
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
      const response = await fetch(`${appBaseUrl}/health`);
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

function iconRefs(payload) {
  return payload.results.map((icon) => icon.icon_ref);
}

const transport = new StreamableHTTPClientTransport(new URL(`${appBaseUrl}/mcp`));
const client = new Client({ name: 'preview-exact-ref-gate', version: '1.0.0' });

const sevenRefs = [
  'lucide:folder',
  'lucide:folder-tree',
  'lucide:file-type',
  'lucide:eye',
  'lucide:eye-off',
  'lucide:upload',
  'lucide:more-horizontal',
];
const twelveMixedRefs = [
  'lucide:folder',
  'tabler:home',
  'phosphor:user',
  'heroicons:bell',
  'bootstrap:calendar',
  'iconoir:search',
  'ionicons:settings-outline',
  'mingcute:arrow_up_line',
  'si:cohere',
  'simpleicons:figma',
  'material:settings',
  'lucide:heart',
];

try {
  await waitForHealth();
  await client.connect(transport);

  const seven = await client.callTool({
    name: 'preview_icons',
    arguments: { icon_refs: sevenRefs, include_image: true, limit: 7 },
  });
  const sevenPayload = parsePayload(seven);
  assert.equal(seven.isError, undefined);
  assert.deepEqual(iconRefs(sevenPayload), sevenRefs);
  assert.deepEqual(seven.content.map((entry) => entry.type), ['text', 'image']);
  assert.equal(sevenPayload.rendered_count, 7);
  assert.equal(typeof sevenPayload.preview_url, 'string');
  assert.equal(typeof sevenPayload.image_url, 'string');
  assert.equal(hostedSearchRequests, 0, 'known refs must not call hosted search');

  const mixed = await client.callTool({
    name: 'preview_icons',
    arguments: { icon_refs: twelveMixedRefs, include_image: true, limit: 12 },
  });
  const mixedPayload = parsePayload(mixed);
  assert.equal(mixed.isError, undefined);
  assert.deepEqual(iconRefs(mixedPayload), twelveMixedRefs);
  assert.equal(mixedPayload.rendered_count, 12);
  assert.equal(hostedSearchRequests, 0, 'mixed known refs must not call hosted search');
  assert.equal(materialSnapshotRequests, 0, 'Material preview must use the packaged asset bundle');

  const materialSolid = await client.callTool({
    name: 'preview_icons',
    arguments: {
      icon_refs: ['material:settings', 'material:home'],
      style: 'solid',
      include_image: false,
      limit: 2,
    },
  });
  const materialSolidPayload = parsePayload(materialSolid);
  assert.deepEqual(iconRefs(materialSolidPayload), ['material:settings', 'material:home']);
  assert.ok(materialSolidPayload.results.every((icon) => icon.style === 'solid'));
  assert.equal(materialSnapshotRequests, 0, 'Material solid preview must use the packaged asset bundle');

  const partial = await client.callTool({
    name: 'preview_icons',
    arguments: {
      icon_refs: ['lucide:folder', 'lucide:folder', 'lucide:not-a-real-icon'],
      include_image: false,
      limit: 3,
    },
  });
  const partialPayload = parsePayload(partial);
  assert.deepEqual(iconRefs(partialPayload), ['lucide:folder']);
  assert.match(partialPayload.warnings.join(' '), /lucide:not-a-real-icon/);
  assert.equal(hostedSearchRequests, 0, 'unknown known-ref input must not call hosted search');

  const invalid = await client.callTool({
    name: 'preview_icons',
    arguments: { icon_refs: ['not-a-valid-ref'], include_image: false },
  });
  assert.equal(invalid.isError, true);
  assert.match(invalid.content.find((entry) => entry.type === 'text')?.text || '', /library:id/);
  assert.equal(hostedSearchRequests, 0, 'invalid refs must not call hosted search');

  const concurrentCalls = await Promise.all(
    Array.from({ length: 4 }, () => client.callTool({
      name: 'preview_icons',
      arguments: { icon_refs: sevenRefs, include_image: false, limit: 7 },
    })),
  );
  assert.ok(concurrentCalls.every((result) => result.isError !== true));
  const imageResponses = await Promise.all(
    concurrentCalls.map((result) => fetch(parsePayload(result).image_url)),
  );
  assert.ok(imageResponses.every((response) => response.ok));
  assert.equal(hostedSearchRequests, 0, 'concurrent fixed-ref previews must not call hosted search');

  const queryOnly = await client.callTool({
    name: 'preview_icons',
    arguments: { query: 'folder', library: 'lucide', include_image: false, limit: 1 },
  });
  const queryPayload = parsePayload(queryOnly);
  assert.equal(queryOnly.isError, undefined);
  assert.equal(queryPayload.results[0].icon_ref, 'lucide:folder');
  assert.equal(hostedSearchRequests, 1, 'query-only preview must make exactly one hosted search');

  const finalHealth = await (await fetch(`${appBaseUrl}/health`)).json();
  assert.equal(finalHealth.hosted_search.active, 0);
  assert.equal(finalHealth.hosted_search.queued, 0);

  console.log(JSON.stringify({
    status: 'ok',
    seven_ref_preview: 'passed',
    twelve_mixed_ref_preview: 'passed',
    material_outline_and_solid: 'passed',
    duplicate_unknown_invalid_refs: 'passed',
    concurrent_preview_and_image_requests: 'passed',
    known_ref_hosted_search_requests: 0,
    query_only_hosted_search_requests: hostedSearchRequests,
    final_guard: finalHealth.hosted_search,
  }, null, 2));
} finally {
  await client.close().catch(() => {});
  child.kill();
  await new Promise((resolve) => mockServer.close(resolve));
}
