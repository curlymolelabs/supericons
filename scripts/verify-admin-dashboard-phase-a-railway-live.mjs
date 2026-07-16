import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

function readArg(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : '';
}

const mcpUrl = (readArg('mcp-url') || 'https://mcp.supericons.dev/mcp').replace(/\/+$/, '');
const outputPath = readArg('output');
const expectedVersion = readArg('expect-version') || '0.4.18';
const expectedAssetCount = Number(readArg('expect-material-assets') || 8524);
const expectedResilience = readArg('expect-hosted-search-resilience') || 'any';

assert.ok(outputPath, 'Provide --output for retained evidence.');
assert.ok(Number.isInteger(expectedAssetCount) && expectedAssetCount > 0);
assert.ok(['any', 'enabled', 'disabled'].includes(expectedResilience));

const summary = {
  artifact: 'admin_dashboard_phase_a_railway_live_contract',
  mcp_url: mcpUrl,
  started_at: new Date().toISOString(),
};

const transport = new StreamableHTTPClientTransport(new URL(mcpUrl));
const client = new Client({ name: 'phase-a-release-handshake', version: '1.0.0' });

try {
  const healthResponse = await fetch(`${mcpUrl.replace(/\/mcp$/, '')}/health`, {
    signal: AbortSignal.timeout(15_000),
  });
  assert.equal(healthResponse.status, 200);
  const health = await healthResponse.json();
  assert.equal(health.ok, true);
  assert.equal(health.version, expectedVersion);
  assert.equal(health.material_assets?.available, true);
  assert.equal(health.material_assets?.asset_count, expectedAssetCount);
  if (expectedResilience === 'enabled') {
    assert.equal(health.hosted_search?.state, 'closed');
    assert.equal(health.hosted_search?.max_concurrent, 2);
    assert.equal(health.hosted_search?.max_queued, 8);
    assert.equal(health.hosted_search?.active, 0);
    assert.equal(health.hosted_search?.queued, 0);
  } else if (expectedResilience === 'disabled') {
    assert.equal(health.hosted_search, undefined);
  }

  await client.connect(transport);
  const tools = await client.listTools();
  const toolNames = new Set((tools.tools || []).map((tool) => tool.name));
  for (const name of ['search_icons', 'recommend_icons', 'get_icon', 'preview_icons']) {
    assert.equal(toolNames.has(name), true, `Missing MCP tool: ${name}`);
  }

  summary.status = 'ok';
  summary.health = {
    version: health.version,
    material_assets_available: health.material_assets.available,
    material_asset_count: health.material_assets.asset_count,
    hosted_search_resilience: health.hosted_search || null,
  };
  summary.mcp_handshake = {
    tool_count: toolNames.size,
    required_tools: ['search_icons', 'recommend_icons', 'get_icon', 'preview_icons'],
  };
  summary.synthetic_tool_calls = 0;
  summary.telemetry_rows_expected = 0;
} catch (error) {
  summary.status = 'failed';
  summary.error = error instanceof Error ? error.message : String(error);
  throw error;
} finally {
  summary.finished_at = new Date().toISOString();
  const absoluteOutput = resolve(outputPath);
  mkdirSync(dirname(absoluteOutput), { recursive: true });
  writeFileSync(absoluteOutput, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  await client.close().catch(() => {});
  console.log(JSON.stringify({ status: summary.status, output: outputPath }));
}
