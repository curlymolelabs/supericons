import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

function readArg(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : '';
}

function parsePayload(result) {
  if (result?.structuredContent) return result.structuredContent;
  const text = result?.content?.find((entry) => entry.type === 'text')?.text;
  return text ? JSON.parse(text) : null;
}

function isSvg(value) {
  return typeof value === 'string' && /^<svg\b/i.test(value.trim());
}

const mcpUrl = (readArg('mcp-url') || 'https://mcp.supericons.dev/mcp').replace(/\/+$/, '');
const outputPath = readArg('output') || 'tmp/material-railway-legacy-live.json';
const expectedVersion = readArg('expect-version') || '0.4.17';
const summary = {
  artifact: 'material_railway_legacy_live_probe',
  mcp_url: mcpUrl,
  started_at: new Date().toISOString(),
};

const transport = new StreamableHTTPClientTransport(new URL(mcpUrl));
const client = new Client({ name: 'material-railway-legacy-gate', version: '1.0.0' });

try {
  const healthResponse = await fetch(`${mcpUrl.replace(/\/mcp$/, '')}/health`);
  assert.equal(healthResponse.status, 200);
  const health = await healthResponse.json();
  assert.equal(health.version, expectedVersion);
  assert.equal(health.material_assets, undefined);

  await client.connect(transport);
  const materialStartedAt = performance.now();
  const materialResult = await client.callTool({
    name: 'search_icons',
    arguments: {
      query: 'settings', library: 'material', library_mode: 'strict', style: 'outline', limit: 3,
    },
  });
  const material = parsePayload(materialResult);
  const materialLatencyMs = Math.round((performance.now() - materialStartedAt) * 10) / 10;
  assert.notEqual(materialResult.isError, true);
  assert.equal(material.results?.length || 0, 0);

  const lucideStartedAt = performance.now();
  const lucideResult = await client.callTool({
    name: 'search_icons',
    arguments: { query: 'calendar', library: 'lucide', library_mode: 'strict', limit: 3 },
  });
  const lucide = parsePayload(lucideResult);
  const lucideLatencyMs = Math.round((performance.now() - lucideStartedAt) * 10) / 10;
  assert.equal(lucide.results?.length, 3);
  assert.ok(lucide.results.every((row) => row.library === 'lucide' && isSvg(row.svg)));

  summary.status = 'ok';
  summary.health_version = health.version;
  summary.material_result_count = 0;
  summary.material_latency_ms = materialLatencyMs;
  summary.lucide_result_count = lucide.results.length;
  summary.lucide_latency_ms = lucideLatencyMs;
} catch (error) {
  summary.status = 'failed';
  summary.error = error instanceof Error ? error.message : String(error);
  throw error;
} finally {
  summary.finished_at = new Date().toISOString();
  const absoluteOutput = join(rootDir, outputPath);
  mkdirSync(dirname(absoluteOutput), { recursive: true });
  writeFileSync(absoluteOutput, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  await client.close().catch(() => {});
  console.log(JSON.stringify({ status: summary.status, output: outputPath }));
}
