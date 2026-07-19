import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

function listen(server) {
  return new Promise((resolveAddress, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolveAddress(server.address()));
  });
}

const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const packageRoot = resolve(repoRoot, 'mcp');
const sdkClientRoot = join(
  packageRoot,
  'node_modules',
  '@modelcontextprotocol',
  'sdk',
  'dist',
  'esm',
  'client',
);
const { Client } = await import(pathToFileURL(join(sdkClientRoot, 'index.js')).href);
const { StdioClientTransport } = await import(pathToFileURL(join(sdkClientRoot, 'stdio.js')).href);

const expectedDetails = {
  limit_scope: 'daily_allowance',
  tier: 'anonymous',
  daily_limit: 300,
  resets_at_utc: '2026-07-21T00:00:00.000Z',
  retry_after_seconds: 43200,
};
let requestCount = 0;
const mockGateway = createServer((_req, res) => {
  requestCount += 1;
  res.writeHead(429, {
    'content-type': 'application/json',
    'retry-after': String(expectedDetails.retry_after_seconds),
  });
  res.end(JSON.stringify({
    error: 'hosted_allowance_exceeded',
    message: 'Daily hosted search allowance reached.',
    retryable: true,
    details: expectedDetails,
  }));
});
const address = await listen(mockGateway);
const gatewayUrl = `http://127.0.0.1:${address.port}/search`;
const transport = new StdioClientTransport({
  command: process.execPath,
  args: [join(packageRoot, 'index.js')],
  cwd: packageRoot,
  env: {
    ...process.env,
    SUPERICONS_MCP_LOG_STARTUP: '0',
    SUPERICONS_MCP_SEARCH_URL: gatewayUrl,
    SUPERICONS_ALLOW_LOCAL_SEARCH_FALLBACK: '0',
    SUPERICONS_MCP_TELEMETRY_ENABLED: '0',
  },
  stderr: 'pipe',
});
const client = new Client({ name: 'search-v2-429-propagation', version: '1.0.0' });

try {
  await client.connect(transport);
  const result = await client.callTool({
    name: 'search_icons',
    arguments: {
      query: 'base de datos',
      locale: 'es',
      limit: 3,
    },
  });
  const text = result.content.find((entry) => entry.type === 'text')?.text;
  const payload = JSON.parse(text);
  assert.equal(requestCount, 1);
  assert.equal(payload.code, 'hosted_allowance_exceeded');
  assert.equal(payload.status, 429);
  assert.equal(payload.retryable, true);
  assert.equal(payload.retry_after_seconds, expectedDetails.retry_after_seconds);
  assert.deepEqual(payload.details, expectedDetails);
  assert.equal(typeof payload.suggested_response_markdown, 'string');
  assert.equal(typeof payload.next_step, 'string');
  assert.equal('image_url' in payload, false);
  assert.equal('markdown_image' in payload, false);

  console.log(JSON.stringify({
    status: 'ok',
    gateway_requests: requestCount,
    code: payload.code,
    retry_after_seconds: payload.retry_after_seconds,
    details: payload.details,
  }, null, 2));
} finally {
  await transport.close().catch(() => {});
  await new Promise((resolveClose) => mockGateway.close(resolveClose));
}
