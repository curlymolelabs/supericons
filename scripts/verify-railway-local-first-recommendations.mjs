import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { createRailwayRecommendationSearch } from '../mcp/railway-local-search.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const hostedSearchRequests = [];
const usageEvents = [];
let failTelemetry = false;

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve(server.address()));
  });
}

async function readBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString('utf8');
  return text ? JSON.parse(text) : null;
}

function parsePayload(result) {
  if (result?.structuredContent) return result.structuredContent;
  const text = result?.content?.find((entry) => entry.type === 'text')?.text;
  return text ? JSON.parse(text) : null;
}

function nearestRankP95(values) {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.max(0, Math.ceil(sorted.length * 0.95) - 1)];
}

async function waitForUsageEvents(count) {
  const deadline = Date.now() + 3000;
  while (Date.now() < deadline) {
    if (usageEvents.length >= count) return;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  assert.fail(`Expected ${count} usage events, received ${usageEvents.length}.`);
}

const fallbackCalls = [];
const noResultRouter = createRailwayRecommendationSearch({
  localSearchOne: async () => [],
  hostedSearchOne: async (params) => {
    fallbackCalls.push(params);
    return [{ id: 'unexpected' }];
  },
});
assert.deepEqual(await noResultRouter.searchMany([{ query: 'unsupported phrase' }]), [[]]);
assert.equal(fallbackCalls.length, 0, 'An honest local zero-result must not use hosted fallback.');

const failureRouter = createRailwayRecommendationSearch({
  localSearchOne: async () => {
    const error = new Error('local fixture failed');
    error.code = 'local_fixture_failed';
    throw error;
  },
  hostedSearchOne: async (params) => {
    fallbackCalls.push(params);
    return [{ id: 'fallback', lib: 'lucide', svg: '<svg/>' }];
  },
});
const failureResults = await failureRouter.searchMany([
  { query: 'ホーム home', style: 'outline', locale: 'ja' },
  { query: 'settings', style: 'outline' },
  { query: 'profile', style: 'outline' },
]);
assert.equal(fallbackCalls.length, 1, 'A grouped local failure must use one hosted request.');
assert.equal(fallbackCalls[0].locale, null, 'Fallback must disable localized retry fanout.');
assert.equal(failureResults.length, 3);
assert.deepEqual(failureRouter.getRuntime(), {
  mode: 'hosted_fallback',
  fallback_used: true,
  hosted_search_calls: 1,
  local_failure_code: 'local_fixture_failed',
});

const mockServer = createServer(async (request, response) => {
  const url = new URL(request.url, 'http://127.0.0.1');
  if (url.pathname === '/rest/v1/mcp_usage_events') {
    usageEvents.push(await readBody(request));
    response.writeHead(failTelemetry ? 503 : 201);
    response.end();
    return;
  }
  if (url.pathname === '/functions/v1/mcp-search') {
    hostedSearchRequests.push(await readBody(request));
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ results: [] }));
    return;
  }
  response.writeHead(404);
  response.end();
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
    SUPERICONS_RAILWAY_LOCAL_FIRST: 'on',
    SUPERICONS_SUPABASE_URL: mockBaseUrl,
    SUPERICONS_MCP_SEARCH_URL: `${mockBaseUrl}/functions/v1/mcp-search`,
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
  throw new Error(`Railway MCP fixture did not become healthy. ${childOutput}`);
}

const EnglishSlots = [
  'home', 'search', 'notifications', 'profile', 'settings',
  'privacy', 'appearance', 'language', 'billing', 'help',
  'dashboard', 'analytics', 'orders', 'products', 'customers',
  'shipping', 'returns', 'coupons', 'checkout', 'logout',
];
const JapaneseSlots = [
  'ホーム', '検索', '通知', 'プロフィール', '設定',
  'プライバシー', '外観', '言語', '支払い', 'ヘルプ',
  'ダッシュボード', '分析', '注文', '商品', '顧客',
  '配送', '返品', '割引', 'カート', 'ログアウト',
];

const transport = new StreamableHTTPClientTransport(new URL(`http://127.0.0.1:${appPort}/mcp`));
const client = new Client({ name: 'railway-local-first-verifier', version: '1.0.0' });

async function callRecommendation({
  task,
  slots,
  locale,
  library,
  style = 'any',
  limitPerSlot = 1,
  responseMode = 'plan',
}) {
  const startedAt = performance.now();
  const result = await client.callTool({
    name: 'recommend_icons',
    arguments: {
      task,
      slots,
      ...(locale ? { locale } : {}),
      ...(library ? { library } : {}),
      style,
      limit_per_slot: limitPerSlot,
      response_mode: responseMode,
    },
  });
  const latencyMs = performance.now() - startedAt;
  const payload = parsePayload(result);
  assert.equal(result.isError, undefined, JSON.stringify(payload));
  assert.equal(payload.slot_count, slots.length);
  assert.equal(payload.results.length, slots.length);
  assert.equal(payload.all_slots_resolved, true, JSON.stringify({
    task,
    low_confidence_slots: payload.low_confidence_slots,
    clarification_slots: payload.clarification_slots,
  }));
  assert.ok(
    payload.results.every((slot) => Boolean(slot.recommended?.id && slot.recommended?.library)),
    JSON.stringify(payload.results.map((slot) => ({ slot: slot.slot, recommended: slot.recommended }))),
  );
  assert.equal(payload.search_runtime.mode, 'local_first');
  assert.equal(payload.search_runtime.fallback_used, false);
  assert.equal(payload.search_runtime.hosted_search_calls, 0);
  assert.equal(typeof payload.search_runtime.index_generated_at, 'string');
  return { payload, latencyMs };
}

try {
  const health = await waitForHealth();
  assert.equal(health.railway_local_first.enabled, true);
  assert.equal(health.railway_local_first.recommendation_mode, 'local_first');
  assert.ok(health.railway_local_first.icon_count > 20000);
  assert.ok(health.railway_local_first.semantic_record_count > 0);

  await client.connect(transport);
  const twentySlots = await callRecommendation({
    task: 'Choose navigation and feature icons for an online store.',
    slots: EnglishSlots,
  });
  const japanese = await callRecommendation({
    task: 'アプリのナビゲーションと機能のアイコンを選ぶ。',
    slots: JapaneseSlots,
    locale: 'ja',
  });
  const tenSlots = await callRecommendation({
    task: 'Choose navigation and feature icons for a fitness application.',
    slots: EnglishSlots.slice(0, 10),
  });
  const oneSlot = await callRecommendation({
    task: 'Choose an icon for application settings.',
    slots: ['settings'],
  });
  const aiDashboard = await callRecommendation({
    task: 'Choose distinct Lucide outline icons for an AI dashboard sidebar.',
    slots: ['model', 'prompt', 'dataset', 'evaluation', 'deployment', 'monitoring'],
    library: 'lucide',
    style: 'outline',
    limitPerSlot: 3,
    responseMode: 'assets',
  });
  const aiDashboardRefs = aiDashboard.payload.results.map((slot) => (
    `${slot.recommended.library}:${slot.recommended.id}`
  ));
  assert.equal(new Set(aiDashboardRefs).size, 6);
  assert.ok(aiDashboard.payload.results.every((slot) => (
    slot.recommended.library === 'lucide'
      && slot.recommended.style === 'outline'
      && /^<svg\b/.test(slot.recommended.svg || '')
  )));
  const material = await callRecommendation({
    task: 'Choose Material solid icons for primary application navigation.',
    slots: ['home', 'settings', 'favorite'],
    library: 'material',
    style: 'solid',
    limitPerSlot: 1,
    responseMode: 'assets',
  });
  assert.ok(material.payload.results.every((slot) => (
    slot.recommended.library === 'material'
      && slot.recommended.style === 'solid'
      && /^<svg\b/.test(slot.recommended.svg || '')
  )));

  const clarificationResult = await client.callTool({
    name: 'recommend_icons',
    arguments: {
      task: 'Choose an icon for this UI slot without assuming what the label means.',
      slots: ['run'],
      limit_per_slot: 3,
      response_mode: 'plan',
      include_query_frame: true,
    },
  });
  const clarification = parsePayload(clarificationResult);
  assert.equal(clarificationResult.isError, undefined);
  assert.equal(clarification.all_slots_resolved, false);
  assert.equal(clarification.needs_clarification, true);
  assert.deepEqual(clarification.clarification_slots, ['run']);
  assert.equal(clarification.results[0].recommended, null);
  assert.ok(clarification.results[0].interpretations.length >= 2);
  assert.equal(clarification.search_runtime.hosted_search_calls, 0);

  failTelemetry = true;
  const telemetryFailure = await callRecommendation({
    task: 'Choose an icon for application settings.',
    slots: ['settings'],
  });
  assert.equal(telemetryFailure.payload.all_slots_resolved, true);

  const repeatedTwentySlotLatencies = [];
  for (let index = 0; index < 5; index += 1) {
    const measurement = await callRecommendation({
      task: 'Choose navigation and feature icons for an online store.',
      slots: EnglishSlots,
    });
    repeatedTwentySlotLatencies.push(measurement.latencyMs);
  }

  await waitForUsageEvents(13);
  assert.equal(hostedSearchRequests.length, 0, 'Successful local recommendations must make zero hosted search calls.');
  const recommendationEvents = usageEvents.filter((event) => event.tool_name === 'recommend_icons');
  assert.equal(recommendationEvents.length, 13);
  assert.ok(recommendationEvents.every((event) => (
    event.status === 'ok'
      && event.metadata?.search_execution === 'local_first'
  )));

  const p95 = nearestRankP95(repeatedTwentySlotLatencies);
  assert.ok(oneSlot.latencyMs < 3000, `One-slot first call took ${oneSlot.latencyMs.toFixed(1)} ms.`);
  assert.ok(tenSlots.latencyMs < 3000, `Ten-slot first call took ${tenSlots.latencyMs.toFixed(1)} ms.`);
  assert.ok(twentySlots.latencyMs < 3000, `Twenty-slot first call took ${twentySlots.latencyMs.toFixed(1)} ms.`);
  assert.ok(japanese.latencyMs < 3000, `Japanese twenty-slot first call took ${japanese.latencyMs.toFixed(1)} ms.`);
  assert.ok(
    p95 < 500,
    `Twenty-slot local p95 ${p95.toFixed(1)} ms exceeded 500 ms. Samples: ${repeatedTwentySlotLatencies.map((value) => value.toFixed(1)).join(', ')}.`,
  );

  console.log(JSON.stringify({
    status: 'ok',
    hosted_search_requests: hostedSearchRequests.length,
    telemetry_events: recommendationEvents.length,
    result_counts: {
      one_slot: oneSlot.payload.results.length,
      ten_slots: tenSlots.payload.results.length,
      twenty_slots: twentySlots.payload.results.length,
      japanese_twenty_slots: japanese.payload.results.length,
      ai_dashboard_slots: aiDashboard.payload.results.length,
      material_solid_slots: material.payload.results.length,
      clarification_slots: clarification.clarification_slots.length,
    },
    latency_ms: {
      one_slot: Number(oneSlot.latencyMs.toFixed(1)),
      ten_slots: Number(tenSlots.latencyMs.toFixed(1)),
      twenty_slots: Number(twentySlots.latencyMs.toFixed(1)),
      japanese_twenty_slots: Number(japanese.latencyMs.toFixed(1)),
      repeated_twenty_slot_samples: repeatedTwentySlotLatencies.map((value) => Number(value.toFixed(1))),
      repeated_twenty_slot_p95: Number(p95.toFixed(1)),
    },
    fallback_contract: {
      local_zero_hosted_calls: 0,
      controlled_failure_hosted_calls: fallbackCalls.length,
    },
  }, null, 2));
} finally {
  await client.close().catch(() => {});
  child.kill();
  await new Promise((resolve) => mockServer.close(resolve));
}
