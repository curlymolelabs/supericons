import assert from 'node:assert/strict';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const baseUrl = String(process.argv[2] || 'https://mcp.supericons.dev').replace(/\/+$/, '');
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

function parsePayload(result) {
  if (result?.structuredContent) return result.structuredContent;
  const text = result?.content?.find((entry) => entry.type === 'text')?.text;
  return text ? JSON.parse(text) : null;
}

function nearestRankP95(values) {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.max(0, Math.ceil(sorted.length * 0.95) - 1)];
}

const healthResponse = await fetch(`${baseUrl}/health`);
assert.equal(healthResponse.ok, true);
const health = await healthResponse.json();
assert.equal(health.railway_local_first?.enabled, true);
assert.equal(health.railway_local_first?.recommendation_mode, 'local_first');
assert.ok(health.railway_local_first?.icon_count > 20000);
assert.ok(health.railway_local_first?.semantic_record_count > 0);

const transport = new StreamableHTTPClientTransport(new URL(`${baseUrl}/mcp`));
const client = new Client({ name: 'railway-local-first-live-verifier', version: '1.0.0' });

async function callRecommendation({ task, slots, locale, library, style = 'any', responseMode = 'plan' }) {
  const startedAt = performance.now();
  const result = await client.callTool({
    name: 'recommend_icons',
    arguments: {
      task,
      slots,
      ...(locale ? { locale } : {}),
      ...(library ? { library } : {}),
      style,
      limit_per_slot: 1,
      response_mode: responseMode,
    },
  });
  const latencyMs = performance.now() - startedAt;
  const payload = parsePayload(result);
  assert.equal(result.isError, undefined, JSON.stringify(payload));
  assert.equal(payload.results.length, slots.length);
  assert.equal(payload.all_slots_resolved, true, JSON.stringify(payload.low_confidence_slots));
  assert.ok(payload.results.every((slot) => Boolean(slot.recommended?.id && slot.recommended?.library)));
  assert.equal(payload.search_runtime?.mode, 'local_first');
  assert.equal(payload.search_runtime?.fallback_used, false);
  assert.equal(payload.search_runtime?.hosted_search_calls, 0);
  return { payload, latencyMs };
}

try {
  await client.connect(transport);

  const twenty = await callRecommendation({
    task: 'Choose navigation and feature icons for an online store.',
    slots: EnglishSlots,
  });
  const japanese = await callRecommendation({
    task: 'アプリのナビゲーションと機能のアイコンを選ぶ。',
    slots: JapaneseSlots,
    locale: 'ja',
  });
  const ten = await callRecommendation({
    task: 'Choose navigation and feature icons for a fitness application.',
    slots: EnglishSlots.slice(0, 10),
  });
  const one = await callRecommendation({
    task: 'Choose an icon for application settings.',
    slots: ['settings'],
  });
  const material = await callRecommendation({
    task: 'Choose Material solid icons for primary application navigation.',
    slots: ['home', 'settings', 'favorite'],
    library: 'material',
    style: 'solid',
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
  assert.equal(clarification.needs_clarification, true);
  assert.deepEqual(clarification.clarification_slots, ['run']);
  assert.equal(clarification.results[0].recommended, null);
  assert.equal(clarification.search_runtime?.hosted_search_calls, 0);

  const repeatedTwentySlotLatencies = [];
  for (let index = 0; index < 5; index += 1) {
    const measurement = await callRecommendation({
      task: 'Choose navigation and feature icons for an online store.',
      slots: EnglishSlots,
    });
    repeatedTwentySlotLatencies.push(measurement.latencyMs);
  }
  const repeatedP95 = nearestRankP95(repeatedTwentySlotLatencies);

  assert.ok(one.latencyMs <= 3000, `Live one-slot latency was ${one.latencyMs.toFixed(1)} ms.`);
  assert.ok(ten.latencyMs <= 10000, `Live ten-slot latency was ${ten.latencyMs.toFixed(1)} ms.`);
  assert.ok(twenty.latencyMs <= 15000, `Live twenty-slot latency was ${twenty.latencyMs.toFixed(1)} ms.`);
  assert.ok(japanese.latencyMs <= 15000, `Live Japanese twenty-slot latency was ${japanese.latencyMs.toFixed(1)} ms.`);
  assert.ok(repeatedP95 <= 500, `Live repeated twenty-slot p95 was ${repeatedP95.toFixed(1)} ms.`);

  console.log(JSON.stringify({
    status: 'ok',
    base_url: baseUrl,
    version: health.version,
    execution_mode: 'local_first',
    hosted_search_calls_reported: 0,
    result_counts: {
      one_slot: one.payload.results.length,
      ten_slots: ten.payload.results.length,
      twenty_slots: twenty.payload.results.length,
      japanese_twenty_slots: japanese.payload.results.length,
      material_solid_slots: material.payload.results.length,
      clarification_slots: clarification.clarification_slots.length,
    },
    latency_ms: {
      one_slot: Number(one.latencyMs.toFixed(1)),
      ten_slots: Number(ten.latencyMs.toFixed(1)),
      twenty_slots: Number(twenty.latencyMs.toFixed(1)),
      japanese_twenty_slots: Number(japanese.latencyMs.toFixed(1)),
      repeated_twenty_slot_samples: repeatedTwentySlotLatencies.map((value) => Number(value.toFixed(1))),
      repeated_twenty_slot_p95: Number(repeatedP95.toFixed(1)),
    },
  }, null, 2));
} finally {
  await client.close().catch(() => {});
}
