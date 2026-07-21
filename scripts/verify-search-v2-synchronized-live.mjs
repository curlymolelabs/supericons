import assert from 'node:assert/strict';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const baseUrl = String(process.argv[2] || 'https://mcp.supericons.dev').replace(/\/+$/, '');
const expectedVersion = String(process.argv[3] || '0.4.20');

function parsePayload(result) {
  if (result?.structuredContent) return result.structuredContent;
  const text = result?.content?.find((entry) => entry.type === 'text')?.text;
  assert.equal(typeof text, 'string', 'MCP tool returned no text payload.');
  return JSON.parse(text);
}

async function postSearch(body) {
  const response = await fetch(`${baseUrl}/search-icons`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  assert.equal(response.status, 200, `Public search returned HTTP ${response.status}.`);
  return response.json();
}

const healthResponse = await fetch(`${baseUrl}/health`);
assert.equal(healthResponse.status, 200);
const health = await healthResponse.json();
assert.equal(health.version, expectedVersion);
assert.equal(health.railway_local_first?.enabled, true);
assert.equal(health.railway_local_first?.search_mode, 'local_first');
assert.equal(health.railway_local_first?.recommendation_mode, 'local_first');

const webEnglish = await postSearch({
  query: 'application settings',
  library_mode: 'all',
  style: 'outline',
  limit: 20,
});
assert.equal(webEnglish.search_runtime?.mode, 'local_first');
assert.equal(webEnglish.search_runtime?.hosted_search_calls, 0);
assert.equal(webEnglish.results?.[0]?.icon_id, 'material:settings_applications');
assert.ok(webEnglish.results.every((row) => !Object.hasOwn(row, 'svg')));
assert.ok(webEnglish.results.every((row) => !Object.hasOwn(row, 'semantic')));

const webJapanese = await postSearch({
  query: '設定',
  locale: 'ja',
  library_mode: 'all',
  style: 'outline',
  limit: 20,
});
assert.equal(webJapanese.search_runtime?.mode, 'local_first');
assert.equal(webJapanese.search_runtime?.hosted_search_calls, 0);
assert.equal(webJapanese.results?.[0]?.icon_id, 'material:settings');

const transport = new StreamableHTTPClientTransport(new URL(`${baseUrl}/mcp`));
const client = new Client({ name: 'search-v2-synchronized-live', version: '1.0.0' });
try {
  await client.connect(transport);

  const searchStartedAt = performance.now();
  const searchResult = parsePayload(await client.callTool({
    name: 'search_icons',
    arguments: { query: 'dropdown', library_mode: 'all', limit: 10 },
  }));
  const searchLatencyMs = performance.now() - searchStartedAt;
  assert.equal(searchResult.search_runtime?.mode, 'local_first');
  assert.equal(searchResult.search_runtime?.hosted_search_calls, 0);
  assert.equal(searchResult.results?.[0]?.icon_ref, 'material:dropdown');

  const slots = [
    'home', 'search', 'notifications', 'profile', 'settings',
    'privacy', 'appearance', 'language', 'billing', 'help',
    'dashboard', 'analytics', 'orders', 'products', 'customers',
    'shipping', 'returns', 'coupons', 'checkout', 'logout',
  ];
  const recommendationStartedAt = performance.now();
  const recommendation = parsePayload(await client.callTool({
    name: 'recommend_icons',
    arguments: {
      task: 'Choose navigation and feature icons for an online store.',
      slots,
      response_mode: 'plan',
    },
  }));
  const recommendationLatencyMs = performance.now() - recommendationStartedAt;
  assert.equal(recommendation.search_runtime?.mode, 'local_first');
  assert.equal(recommendation.search_runtime?.hosted_search_calls, 0);
  assert.equal(recommendation.slot_count, 20);
  assert.equal(recommendation.results?.length, 20);
  if (!recommendation.all_slots_resolved) {
    console.error(JSON.stringify({
      all_slots_resolved: recommendation.all_slots_resolved,
      needs_clarification: recommendation.needs_clarification,
      clarification_slots: recommendation.clarification_slots,
      low_confidence_slots: recommendation.low_confidence_slots,
    }, null, 2));
  }
  assert.equal(recommendation.all_slots_resolved, true);
  assert.ok(recommendationLatencyMs <= 15000, `20-slot recommendation took ${recommendationLatencyMs} ms.`);

  console.log(JSON.stringify({
    status: 'ok',
    deployment_base_url: baseUrl,
    version: health.version,
    index_generated_at: health.railway_local_first.index_generated_at,
    web_search: {
      english_top: webEnglish.results[0].icon_id,
      japanese_top: webJapanese.results[0].icon_id,
    },
    hosted_mcp: {
      search_top: searchResult.results[0].icon_ref,
      search_latency_ms: Number(searchLatencyMs.toFixed(1)),
      recommendation_count: recommendation.results.length,
      recommendation_latency_ms: Number(recommendationLatencyMs.toFixed(1)),
      route: recommendation.search_runtime.mode,
    },
  }, null, 2));
} finally {
  await transport.close().catch(() => {});
}
