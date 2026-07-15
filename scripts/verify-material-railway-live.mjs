// Live MCP-layer gate for the Railway-side Material hydration delivery.
//
// Runs entirely through the hosted MCP endpoint (local or deployed). It does
// not test the search engine URL directly. The engine remains on its stable
// deployment, and the MCP layer delivers the validated local Material bundle.
//
// Usage:
//   node scripts/verify-material-railway-live.mjs --mcp-url http://localhost:8791/mcp --output tmp/out.json
//
// Gate contents:
// 1. list_libraries advertises Material with full verified counts.
// 2. The full five-tool Material contract in both styles (search, get_icon,
//    recommend, preview) with valid inline SVG everywhere.
// 3. The 20-query curated relevance fixture in outline AND solid.
// 4. All-mode result-count integrity (settings, cog) with every row deliverable.
// 5. Non-material regression (lucide strict) untouched.

import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
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

function isSvg(value) {
  return typeof value === 'string'
    && /^<svg\b/i.test(value.trim())
    && !/<script\b/i.test(value)
    && !/<image\b/i.test(value);
}

function iconId(row) {
  return String(row?.icon_id || row?.id || '').replace(/^material:/, '');
}

function parseToolPayload(result, toolName) {
  assert.notEqual(result?.isError, true, `${toolName} returned an MCP error`);
  if (result?.structuredContent && typeof result.structuredContent === 'object') {
    return result.structuredContent;
  }
  const text = result?.content?.find((entry) => entry.type === 'text')?.text;
  assert.ok(text, `${toolName} returned no parsable payload`);
  return JSON.parse(text);
}

const mcpUrl = (readArg('mcp-url') || 'http://localhost:8791/mcp').replace(/\/+$/, '');
const outputPath = readArg('output') || 'tmp/material-railway-live-gate.json';
assert.match(mcpUrl, /^https?:\/\//, 'Provide --mcp-url');

const relevanceFixture = JSON.parse(readFileSync(
  join(rootDir, 'references', 'verification', 'material-relevance-fixture-2026-07-14.json'),
  'utf8',
));

const transport = new StreamableHTTPClientTransport(new URL(mcpUrl));
const client = new Client({ name: 'material-railway-live-gate', version: '1.0.0' });

const summary = {
  mcp_url: mcpUrl,
  started_at: new Date().toISOString(),
  checks: [],
  latency: {},
};
function record(name, detail = {}) {
  summary.checks.push({ name, ...detail });
  console.log(`ok - ${name}`);
}

async function callToolRaw(name, args) {
  const startedAt = performance.now();
  const result = await client.callTool({ name, arguments: args });
  const elapsedMs = Math.round((performance.now() - startedAt) * 10) / 10;
  return { result, payload: parseToolPayload(result, name), elapsedMs };
}

async function callTool(name, args) {
  return (await callToolRaw(name, args)).payload;
}

function p95(values) {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.max(0, Math.ceil(sorted.length * 0.95) - 1)];
}

await client.connect(transport);
try {
  const healthUrl = `${mcpUrl.replace(/\/mcp$/, '')}/health`;
  const healthResponse = await fetch(healthUrl);
  assert.equal(healthResponse.status, 200, 'MCP health endpoint failed');
  const health = await healthResponse.json();
  assert.equal(health.material_assets?.available, true, 'Railway Material bundle is unavailable');
  assert.equal(health.material_assets?.asset_count, 8524);
  record('health reports complete local Material bundle');

  // 1. Capability advertising.
  const libraries = await callTool('list_libraries', {});
  const material = libraries.libraries?.find((library) => library.id === 'material');
  assert.ok(material, 'list_libraries omitted Material Symbols');
  assert.equal(material.count, 4262);
  record('list_libraries advertises material 4262');

  // 2. Five-tool contract in both styles.
  for (const style of ['outline', 'solid']) {
    const search = await callTool('search_icons', {
      query: 'settings', library: 'material', library_mode: 'strict', style, limit: 5,
    });
    assert.ok(search.results?.length > 0, `no ${style} material results`);
    assert.ok(search.results.every((row) => isSvg(row.svg)), `invalid ${style} SVG in search`);
    assert.ok(search.results.every((row) => row.style === style), `wrong reported style for ${style}`);
    assert.ok(search.results.some((row) => iconId(row) === 'settings'), `settings missing in ${style}`);

    const icon = await callTool('get_icon', { id: 'settings', library: 'material', style });
    assert.equal(icon.icon?.id, 'settings');
    assert.equal(icon.icon?.style, style);
    assert.ok(isSvg(icon.icon?.svg), `invalid ${style} SVG in get_icon`);
    record(`material search + get_icon deliver valid ${style} SVG`);
  }

  const solidSearch = await callTool('search_icons', {
    query: 'settings', library: 'material', library_mode: 'strict', style: 'solid', limit: 1,
  });
  const outlineSearch = await callTool('search_icons', {
    query: 'settings', library: 'material', library_mode: 'strict', style: 'outline', limit: 1,
  });
  assert.notEqual(solidSearch.results[0].svg, outlineSearch.results[0].svg,
    'solid and outline variants must differ');
  record('solid and outline variants are visibly distinct payloads');

  const recommendation = await callTool('recommend_icons', {
    task: 'Choose a Material icon for application settings.',
    slots: ['settings'], library: 'material', style: 'solid', limit_per_slot: 3, response_mode: 'assets',
  });
  const recommended = recommendation.results?.[0]?.recommended;
  assert.equal(recommended?.library, 'material');
  assert.ok(isSvg(recommended?.svg), 'recommendation missing valid material SVG');
  record('recommend_icons returns valid material SVG');

  const previewResult = await callToolRaw('preview_icons', {
    icon_refs: ['material:settings', 'material:home', 'material:person'],
    style: 'solid', limit: 3, include_image: true,
  });
  const preview = previewResult.payload;
  assert.ok((preview.results?.length || 0) > 0, 'preview returned no material rows');
  assert.equal(preview.image_included, true);
  assert.ok(previewResult.result.content?.some((entry) => (
    entry.type === 'image' && entry.mimeType === 'image/png' && entry.data?.startsWith('iVBOR')
  )), 'preview returned no valid PNG image content');
  record('preview_icons returns Material rows and PNG image content');

  // 3. Relevance fixture, both styles.
  //
  // Every curated concept must return an accepted icon in the first five
  // results. This keeps the original fixture contract intact.
  const RELEVANCE_LIMIT = 5;
  const RELEVANCE_MINIMUM = relevanceFixture.queries.length;
  for (const style of ['outline', 'solid']) {
    let passed = 0;
    const misses = [];
    for (const fixture of relevanceFixture.queries) {
      const search = await callTool('search_icons', {
        query: fixture.query, library: 'material', library_mode: 'strict', style, limit: RELEVANCE_LIMIT,
      });
      const ids = (search.results || []).map(iconId);
      const allSvg = (search.results || []).every((row) => isSvg(row.svg));
      assert.ok(allSvg, `relevance ${style} "${fixture.query}" returned undeliverable rows`);
      const hit = fixture.acceptable_icon_ids.some((id) => ids.includes(id));
      if (hit && ids.length > 0) passed += 1;
      else misses.push(fixture.query);
    }
    assert.ok(passed >= RELEVANCE_MINIMUM,
      `relevance ${style}: ${passed}/${relevanceFixture.queries.length}, misses: ${misses.join(', ')}`);
    record(`relevance fixture ${style}: ${passed}/${relevanceFixture.queries.length} in top ${RELEVANCE_LIMIT}`, { misses });
  }

  // 4. All-mode count integrity.
  for (const query of ['settings', 'cog']) {
    const search = await callTool('search_icons', { query, limit: 10 });
    assert.equal(search.results?.length, 10, `all-mode ${query} returned short results`);
    assert.ok(search.results.every((row) => isSvg(row.svg)), `all-mode ${query} has undeliverable rows`);
    record(`all-mode ${query} returns 10/10 deliverable rows`);
  }

  const allModeSolid = await callTool('search_icons', {
    query: 'settings', library_mode: 'all', style: 'solid', limit: 10,
  });
  assert.equal(allModeSolid.results?.length, 10, 'all-mode solid returned short results');
  assert.ok(allModeSolid.results.every((row) => (
    row.library === 'material' && row.style === 'solid' && isSvg(row.svg)
  )), 'all-mode solid returned an unsupported or undeliverable row');
  record('all-mode solid returns 10/10 deliverable Material rows');

  // 5. Non-material regression.
  const lucide = await callTool('search_icons', {
    query: 'calendar', library: 'lucide', library_mode: 'strict', limit: 5,
  });
  assert.equal(lucide.results?.length, 5);
  assert.ok(lucide.results.every((row) => isSvg(row.svg) && row.library === 'lucide'));
  record('lucide strict regression untouched');

  // 6. Warm per-tool latency. The functional checks above warm the process
  // and asset bundle before these samples are collected.
  const latencyCases = [
    ['search_icons', {
      query: 'settings', library: 'material', library_mode: 'strict', style: 'solid', limit: 5,
    }, 2000],
    ['get_icon', { id: 'settings', library: 'material', style: 'solid' }, 2000],
    ['preview_icons', {
      icon_refs: ['material:settings', 'material:home'], style: 'solid', limit: 2, include_image: true,
    }, 2000],
    ['recommend_icons', {
      task: 'Choose a Material icon for application settings.',
      slots: ['settings'], library: 'material', style: 'solid', limit_per_slot: 3, response_mode: 'assets',
    }, 3000],
  ];
  for (const [toolName, args, gateMs] of latencyCases) {
    const samples = [];
    for (let index = 0; index < 5; index += 1) {
      samples.push((await callToolRaw(toolName, args)).elapsedMs);
    }
    const warmP95Ms = p95(samples);
    assert.ok(warmP95Ms <= gateMs, `${toolName} warm p95 ${warmP95Ms} ms exceeds ${gateMs} ms`);
    summary.latency[toolName] = { samples_ms: samples, warm_p95_ms: warmP95Ms, gate_ms: gateMs };
    record(`${toolName} warm p95 is within ${gateMs} ms`, { warm_p95_ms: warmP95Ms });
  }

  summary.status = 'ok';
} catch (error) {
  summary.status = 'failed';
  summary.error = error.message;
  throw error;
} finally {
  summary.finished_at = new Date().toISOString();
  mkdirSync(dirname(join(rootDir, outputPath)), { recursive: true });
  writeFileSync(join(rootDir, outputPath), `${JSON.stringify(summary, null, 2)}\n`);
  await client.close().catch(() => {});
  console.log(JSON.stringify({ status: summary.status, checks: summary.checks.length, output: outputPath }));
}
