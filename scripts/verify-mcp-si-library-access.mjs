import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const repoRoot = join(import.meta.dirname, '..');
const mcpDir = join(repoRoot, 'mcp');
const packageJson = JSON.parse(readFileSync(join(mcpDir, 'package.json'), 'utf8'));
const sdkClientRoot = join(
  mcpDir,
  'node_modules',
  '@modelcontextprotocol',
  'sdk',
  'dist',
  'esm',
  'client',
);
const { Client } = await import(pathToFileURL(join(sdkClientRoot, 'index.js')).href);
const { StdioClientTransport } = await import(pathToFileURL(join(sdkClientRoot, 'stdio.js')).href);

function parseToolPayload(result, label) {
  const text = result?.content?.find((entry) => entry?.type === 'text')?.text;
  assert.equal(typeof text, 'string', `${label} did not return text content`);
  return JSON.parse(text);
}

const transport = new StdioClientTransport({
  command: process.execPath,
  args: [join(mcpDir, 'index.js')],
  cwd: mcpDir,
  env: {
    ...process.env,
    SUPERICONS_API_KEY: '',
    SUPERICONS_DISABLE_TELEMETRY: '1',
    SUPERICONS_MCP_LOG_STARTUP: '0',
  },
  stderr: 'pipe',
});
const client = new Client({ name: 'mcp-si-library-access-verifier', version: '1.0.0' });

try {
  await client.connect(transport);

  const tools = await client.listTools();
  const searchTool = tools.tools.find((tool) => tool.name === 'search_icons');
  assert.ok(searchTool, 'search_icons tool is missing');
  assert.equal(
    searchTool.inputSchema?.properties?.library_mode?.default,
    undefined,
    'library_mode must not inject strict before the server can inspect the library',
  );

  const globalPayload = parseToolPayload(await client.callTool({
    name: 'search_icons',
    arguments: {
      query: 'database',
      limit: 5,
    },
  }), 'global search');
  assert.equal(globalPayload.library_mode, 'all');
  assert.equal(globalPayload.requested_library, null);
  assert.ok(globalPayload.results.length > 0, 'global search returned no results');
  assert.ok(
    globalPayload.results.some((icon) => (icon.library || icon.source_library) !== 'si'),
    'global search should not be restricted to SI',
  );

  const siPayload = parseToolPayload(await client.callTool({
    name: 'search_icons',
    arguments: {
      query: 'agent scout',
      library: 'si',
      limit: 10,
    },
  }), 'explicit SI search');
  assert.equal(siPayload.library_mode, 'strict');
  assert.equal(siPayload.requested_library, 'si');
  assert.ok(siPayload.results.length > 0, 'explicit SI search returned no results');
  assert.ok(
    siPayload.results.every((icon) => (icon.library || icon.source_library) === 'si'),
    'explicit SI search returned an icon from another library',
  );
  assert.equal(siPayload.results[0].icon_ref, 'si:agent-scout');

  console.log(JSON.stringify({
    status: 'ok',
    package_version: packageJson.version,
    omitted_library_mode: globalPayload.library_mode,
    omitted_library_result_refs: globalPayload.results.map((icon) => icon.icon_ref),
    explicit_si_mode: siPayload.library_mode,
    explicit_si_result_refs: siPayload.results.map((icon) => icon.icon_ref),
    telemetry: 'disabled',
  }, null, 2));
} finally {
  await transport.close().catch(() => {});
  await client.close().catch(() => {});
}
