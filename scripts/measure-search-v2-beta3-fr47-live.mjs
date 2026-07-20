import assert from 'node:assert/strict';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { writeFileSync } from 'node:fs';

function readArgument(name, fallback = null) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

function percentile(values, quantile) {
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.max(0, Math.ceil(sorted.length * quantile) - 1);
  return sorted[index];
}

function parsePayload(result) {
  if (result?.structuredContent) return result.structuredContent;
  const text = result?.content?.find((entry) => entry.type === 'text')?.text;
  return text ? JSON.parse(text) : null;
}

const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const packageRoot = resolve(readArgument('--package-root', join(repoRoot, 'mcp')));
const groupedUrl = readArgument(
  '--grouped-url',
  'https://kcjmkakdhsqplvasgkjv.supabase.co/functions/v1/mcp-search-grouped',
);
const stableUrl = readArgument(
  '--stable-url',
  'https://kcjmkakdhsqplvasgkjv.supabase.co/functions/v1/mcp-search',
);
const outputPath = readArgument('--output');
const samples = Number(readArgument('--samples', '3'));
const minimumIntervalMs = Number(readArgument('--minimum-interval-ms', '22000'));
const timeoutMs = Number(readArgument('--timeout-ms', '20000'));

assert.ok(Number.isInteger(samples) && samples >= 3 && samples <= 10);
assert.ok(Number.isInteger(minimumIntervalMs) && minimumIntervalMs >= 0);
assert.ok(Number.isInteger(timeoutMs) && timeoutMs === 20000);

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

const englishSlots = [
  'home',
  'workouts',
  'progress',
  'goals',
  'nutrition',
  'calendar',
  'profile',
  'settings',
  'notifications',
  'search',
  'favorites',
  'history',
  'community',
  'coaching',
  'achievements',
  'heart rate',
  'sleep',
  'hydration',
  'running',
  'strength',
];
const japaneseSlots = [
  'ホーム',
  'ワークアウト',
  '進捗',
  '目標',
  '栄養',
  'カレンダー',
  'プロフィール',
  '設定',
  '通知',
  '検索',
  'お気に入り',
  '履歴',
  'コミュニティ',
  'コーチング',
  '実績',
  '心拍数',
  '睡眠',
  '水分補給',
  'ランニング',
  '筋力',
];
const scenarios = [
  {
    id: 'one_slot',
    slots: englishSlots.slice(0, 1),
    task: 'Choose navigation icons for a fitness application.',
    locale: null,
    measuredSamples: samples,
    p95LimitMs: 3000,
  },
  {
    id: 'ten_slots',
    slots: englishSlots.slice(0, 10),
    task: 'Choose navigation icons for a fitness application.',
    locale: null,
    measuredSamples: samples,
    p95LimitMs: 10000,
  },
  {
    id: 'twenty_slots',
    slots: englishSlots,
    task: 'Choose navigation and feature icons for a fitness application.',
    locale: null,
    measuredSamples: samples,
    p95LimitMs: 15000,
  },
  {
    id: 'japanese_twenty_slots',
    slots: japaneseSlots,
    task: 'フィットネスアプリのナビゲーションと機能のアイコンを選ぶ。',
    locale: 'ja',
    measuredSamples: 1,
    p95LimitMs: 15000,
  },
];

const transport = new StdioClientTransport({
  command: process.execPath,
  args: [join(packageRoot, 'index.js')],
  cwd: packageRoot,
  env: {
    ...process.env,
    SUPERICONS_MCP_GROUPED_SEARCH_URL: groupedUrl,
    SUPERICONS_MCP_SEARCH_URL: stableUrl,
    SUPERICONS_MCP_LOG_STARTUP: '0',
    SUPERICONS_MCP_TELEMETRY_ENABLED: '0',
    SUPERICONS_MCP_USAGE_DEBUG: '0',
  },
  stderr: 'pipe',
});
const client = new Client({ name: 'search-v2-beta3-fr47-live', version: '1.0.0' });
const summary = {
  artifact: 'search_v2_beta3_fr47_live',
  status: 'blocked',
  package_root: packageRoot,
  grouped_url: groupedUrl,
  stable_url: stableUrl,
  samples_per_english_scenario: samples,
  timeout_ms: timeoutMs,
  scenarios: [],
};
let lastCallStartedAt = 0;

async function waitForRequestSpacing() {
  const elapsed = Date.now() - lastCallStartedAt;
  const remaining = minimumIntervalMs - elapsed;
  if (remaining > 0) await new Promise((resolveWait) => setTimeout(resolveWait, remaining));
}

async function runTimedRecommendation(scenario) {
  await waitForRequestSpacing();
  lastCallStartedAt = Date.now();
  const startedAt = performance.now();
  let timeoutHandle;
  const timeout = new Promise((_, reject) => {
    timeoutHandle = setTimeout(
      () => reject(new Error(`FR-47 call exceeded ${timeoutMs} ms.`)),
      timeoutMs,
    );
  });
  let result;
  try {
    result = await Promise.race([
      client.callTool({
        name: 'recommend_icons',
        arguments: {
          task: scenario.task,
          slots: scenario.slots,
          response_mode: 'plan',
          limit_per_slot: 1,
          ...(scenario.locale ? { locale: scenario.locale } : {}),
        },
      }),
      timeout,
    ]);
  } finally {
    clearTimeout(timeoutHandle);
  }
  const latencyMs = Math.round(performance.now() - startedAt);
  const payload = parsePayload(result);
  assert.equal(result.isError, undefined);
  assert.equal(payload?.slot_count, scenario.slots.length);
  assert.equal(payload?.results?.length, scenario.slots.length);
  assert.equal(payload?.all_slots_resolved, true);
  assert.equal(payload.results.every((entry) => Boolean(entry.recommended)), true);
  return latencyMs;
}

try {
  await client.connect(transport);
  for (const scenario of scenarios) {
    await runTimedRecommendation(scenario);
    const latenciesMs = [];
    for (let index = 0; index < scenario.measuredSamples; index += 1) {
      latenciesMs.push(await runTimedRecommendation(scenario));
    }
    const p95Ms = percentile(latenciesMs, 0.95);
    const maximumMs = Math.max(...latenciesMs);
    assert.ok(
      p95Ms <= scenario.p95LimitMs,
      `${scenario.id} p95 ${p95Ms} ms exceeds ${scenario.p95LimitMs} ms.`,
    );
    assert.ok(
      maximumMs < timeoutMs,
      `${scenario.id} maximum ${maximumMs} ms reached the ${timeoutMs} ms timeout.`,
    );
    summary.scenarios.push({
      id: scenario.id,
      slot_count: scenario.slots.length,
      locale: scenario.locale,
      samples: scenario.measuredSamples,
      warmup_calls: 1,
      latencies_ms: latenciesMs,
      p95_ms: p95Ms,
      maximum_ms: maximumMs,
      p95_limit_ms: scenario.p95LimitMs,
      timeouts: 0,
      all_slots_resolved: true,
      status: 'ok',
    });
  }
  summary.status = 'ok';
  summary.finished_at = new Date().toISOString();
} catch (error) {
  summary.error = {
    name: error?.name || 'Error',
    message: error?.message || String(error),
  };
  summary.finished_at = new Date().toISOString();
  throw error;
} finally {
  await client.close().catch(() => {});
  const serialized = `${JSON.stringify(summary, null, 2)}\n`;
  if (outputPath) writeFileSync(resolve(outputPath), serialized, 'utf8');
  console.log(serialized.trim());
}
