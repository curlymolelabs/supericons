// Split production gate for the Railway Material recovery release.
//
// The material-local profile is deterministic and runs once. The follow-up
// profile keeps correctness and candidate-local latency blocking while it
// records latency from the existing Supabase engine without blocking release.

import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

function readArg(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : '';
}

function readPositiveInteger(name, fallback, minimum = 1, maximum = Number.MAX_SAFE_INTEGER) {
  const raw = readArg(name);
  const value = raw ? Number(raw) : fallback;
  assert.equal(Number.isInteger(value), true, `--${name} must be an integer`);
  assert.ok(value >= minimum && value <= maximum, `--${name} must be between ${minimum} and ${maximum}`);
  return value;
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

function p95(values) {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.max(0, Math.ceil(sorted.length * 0.95) - 1)];
}

const profile = readArg('profile');
const mcpUrl = (readArg('mcp-url') || '').replace(/\/+$/, '');
const outputPath = resolve(readArg('output') || '');
const requestTimeoutMs = readPositiveInteger('request-timeout-ms', 120000, 60000, 180000);
const engineLatencyLimitMs = readPositiveInteger('engine-latency-limit-ms', 3000, 1, 120000);

assert.ok(['material-local', 'follow-up'].includes(profile),
  'Provide --profile material-local or --profile follow-up');
assert.match(mcpUrl, /^https?:\/\//, 'Provide --mcp-url with an HTTP or HTTPS endpoint');
assert.ok(readArg('output'), 'Provide --output with a write-once JSON path');
assert.equal(existsSync(outputPath), false, `Recovery gate evidence already exists: ${outputPath}`);

const relevanceFixture = JSON.parse(readFileSync(
  join(rootDir, 'references', 'verification', 'material-relevance-fixture-2026-07-14.json'),
  'utf8',
));

const transport = new StreamableHTTPClientTransport(new URL(mcpUrl));
const client = new Client({ name: 'material-railway-recovery-gate', version: '1.0.0' });
const summary = {
  artifact: 'material_railway_recovery_live_gate',
  profile,
  mcp_url: mcpUrl,
  request_timeout_ms: requestTimeoutMs,
  engine_latency_limit_ms: engineLatencyLimitMs,
  started_at: new Date().toISOString(),
  checks: [],
  latency: {},
  engine_latency_observations: [],
};

function record(name, detail = {}) {
  summary.checks.push({ name, ...detail });
  console.log(`ok - ${name}`);
}

function recordEngineLatency({ caseId, throughCandidateMs }) {
  summary.engine_latency_observations.push({
    case_id: caseId,
    metric: 'elapsed_ms',
    through_candidate_ms: throughCandidateMs,
    observation_threshold_ms: engineLatencyLimitMs,
    threshold_exceeded: throughCandidateMs > engineLatencyLimitMs,
  });
}

async function callToolRaw(name, args) {
  const startedAt = performance.now();
  const result = await client.callTool(
    { name, arguments: args },
    undefined,
    { timeout: requestTimeoutMs, maxTotalTimeout: requestTimeoutMs },
  );
  const elapsedMs = Number((performance.now() - startedAt).toFixed(1));
  return { result, payload: parseToolPayload(result, name), elapsedMs };
}

async function callTool(name, args) {
  return (await callToolRaw(name, args)).payload;
}

async function runMaterialLocalProfile() {
  const healthUrl = `${mcpUrl.replace(/\/mcp$/, '')}/health`;
  const healthResponse = await fetch(healthUrl, { signal: AbortSignal.timeout(requestTimeoutMs) });
  assert.equal(healthResponse.status, 200, 'MCP health endpoint failed');
  const health = await healthResponse.json();
  assert.equal(health.material_assets?.available, true, 'Railway Material bundle is unavailable');
  assert.equal(health.material_assets?.asset_count, 8524);
  record('health reports complete local Material bundle');

  const libraries = await callTool('list_libraries', {});
  const material = libraries.libraries?.find((library) => library.id === 'material');
  assert.ok(material, 'list_libraries omitted Material Symbols');
  assert.equal(material.count, 4262);
  record('list_libraries advertises material 4262');

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

  const relevanceLimit = 5;
  for (const style of ['outline', 'solid']) {
    let passed = 0;
    const misses = [];
    for (const fixture of relevanceFixture.queries) {
      const search = await callTool('search_icons', {
        query: fixture.query, library: 'material', library_mode: 'strict', style, limit: relevanceLimit,
      });
      const ids = (search.results || []).map(iconId);
      assert.ok((search.results || []).every((row) => isSvg(row.svg)),
        `relevance ${style} "${fixture.query}" returned undeliverable rows`);
      const hit = fixture.acceptable_icon_ids.some((id) => ids.includes(id));
      if (hit && ids.length > 0) passed += 1;
      else misses.push(fixture.query);
    }
    assert.equal(passed, relevanceFixture.queries.length,
      `relevance ${style}: ${passed}/${relevanceFixture.queries.length}, misses: ${misses.join(', ')}`);
    record(`relevance fixture ${style}: ${passed}/${relevanceFixture.queries.length} in top ${relevanceLimit}`,
      { misses });
  }

  const latencyCases = [
    ['search_icons', {
      query: 'settings', library: 'material', library_mode: 'strict', style: 'solid', limit: 5,
    }, 2000],
    ['get_icon', { id: 'settings', library: 'material', style: 'solid' }, 2000],
    ['preview_icons', {
      icon_refs: ['material:settings', 'material:home'], style: 'solid', limit: 2, include_image: true,
    }, 2000],
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
  assert.equal(summary.checks.length, 11, 'material-local profile must retain exactly 11 checks');
}

async function runFollowUpProfile() {
  const recommendationRaw = await callToolRaw('recommend_icons', {
    task: 'Choose a Material icon for application settings.',
    slots: ['settings'], library: 'material', style: 'solid', limit_per_slot: 3, response_mode: 'assets',
  });
  const recommended = recommendationRaw.payload.results?.[0]?.recommended;
  assert.equal(recommended?.library, 'material');
  assert.ok(isSvg(recommended?.svg), 'recommendation missing valid material SVG');
  assert.ok(recommendationRaw.elapsedMs <= engineLatencyLimitMs,
    `recommend_icons took ${recommendationRaw.elapsedMs} ms, above ${engineLatencyLimitMs} ms`);
  record('recommend_icons returns valid Material SVG within the candidate-local limit',
    { elapsed_ms: recommendationRaw.elapsedMs, path: 'candidate_local' });

  for (const query of ['settings', 'cog']) {
    const searchRaw = await callToolRaw('search_icons', { query, limit: 10 });
    const search = searchRaw.payload;
    assert.equal(search.results?.length, 10, `all-mode ${query} returned short results`);
    assert.ok(search.results.every((row) => isSvg(row.svg)), `all-mode ${query} has undeliverable rows`);
    recordEngineLatency({
      caseId: `all_mode_${query}`,
      throughCandidateMs: searchRaw.elapsedMs,
    });
    record(`all-mode ${query} returns 10/10 deliverable rows`, {
      elapsed_ms: searchRaw.elapsedMs,
      path: 'engine',
    });
  }

  const allModeSolidRaw = await callToolRaw('search_icons', {
    query: 'settings', library_mode: 'all', style: 'solid', limit: 10,
  });
  const allModeSolid = allModeSolidRaw.payload;
  assert.equal(allModeSolid.results?.length, 10, 'all-mode solid returned short results');
  assert.ok(allModeSolid.results.every((row) => (
    row.library === 'material' && row.style === 'solid' && isSvg(row.svg)
  )), 'all-mode solid returned an unsupported or undeliverable row');
  assert.ok(allModeSolidRaw.elapsedMs <= engineLatencyLimitMs,
    `all-mode solid took ${allModeSolidRaw.elapsedMs} ms, above ${engineLatencyLimitMs} ms`);
  record('all-mode solid returns 10/10 deliverable Material rows within the candidate-local limit',
    { elapsed_ms: allModeSolidRaw.elapsedMs, path: 'candidate_local' });

  const lucideRaw = await callToolRaw('search_icons', {
    query: 'calendar', library: 'lucide', library_mode: 'strict', limit: 5,
  });
  const lucide = lucideRaw.payload;
  assert.equal(lucide.results?.length, 5);
  assert.ok(lucide.results.every((row) => isSvg(row.svg) && row.library === 'lucide'));
  recordEngineLatency({
    caseId: 'lucide_strict_calendar',
    throughCandidateMs: lucideRaw.elapsedMs,
  });
  record('lucide strict regression returns five valid rows', {
    elapsed_ms: lucideRaw.elapsedMs,
    path: 'engine',
  });

  const recommendationSamples = [];
  for (let index = 0; index < 5; index += 1) {
    recommendationSamples.push((await callToolRaw('recommend_icons', {
      task: 'Choose a Material icon for application settings.',
      slots: ['settings'], library: 'material', style: 'solid', limit_per_slot: 3, response_mode: 'assets',
    })).elapsedMs);
  }
  const recommendP95Ms = p95(recommendationSamples);
  assert.ok(recommendP95Ms <= 3000, `recommend_icons warm p95 ${recommendP95Ms} ms exceeds 3000 ms`);
  summary.latency.recommend_icons = {
    samples_ms: recommendationSamples,
    warm_p95_ms: recommendP95Ms,
    gate_ms: 3000,
  };
  record('recommend_icons candidate-local warm p95 is within 3000 ms', {
    warm_p95_ms: recommendP95Ms,
    path: 'candidate_local',
  });
  assert.equal(summary.checks.length, 6, 'follow-up profile must retain exactly 6 checks');
}

await client.connect(transport, { timeout: requestTimeoutMs });
try {
  if (profile === 'material-local') await runMaterialLocalProfile();
  else await runFollowUpProfile();
  summary.status = 'ok';
} catch (error) {
  summary.status = 'failed';
  summary.error = error.message;
  process.exitCode = 1;
} finally {
  summary.finished_at = new Date().toISOString();
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  await client.close().catch(() => {});
  console.log(JSON.stringify({
    status: summary.status,
    profile,
    checks: summary.checks.length,
    output: outputPath,
  }, null, 2));
}
