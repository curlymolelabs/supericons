import assert from 'node:assert/strict';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';

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
const stableFallbackSentinelUrl =
  `${stableUrl}-grouped-route-must-not-fallback`;
const outputPath = readArgument('--output');
const samples = Number(readArgument('--samples', '3'));
const rateWindowResetMs = Number(readArgument('--rate-window-reset-ms', '65000'));
const timeoutMs = Number(readArgument('--timeout-ms', '20000'));
const timingWorkspace = mkdtempSync(join(tmpdir(), 'supericons-beta3-fr47-'));
const timingOutputPath = join(timingWorkspace, 'grouped-worker-timing.jsonl');

assert.ok(Number.isInteger(samples) && samples >= 3 && samples <= 10);
assert.ok(Number.isInteger(rateWindowResetMs) && rateWindowResetMs >= 0);
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
    SUPERICONS_MCP_SEARCH_URL: stableFallbackSentinelUrl,
    SUPERICONS_MCP_LOG_STARTUP: '0',
    SUPERICONS_MCP_TELEMETRY_ENABLED: '0',
    SUPERICONS_MCP_USAGE_DEBUG: '0',
    SUPERICONS_MCP_GROUPED_TIMING_OUTPUT: timingOutputPath,
  },
  stderr: 'pipe',
});
const client = new Client({ name: 'search-v2-beta3-fr47-live', version: '1.0.0' });
const summary = {
  artifact: 'search_v2_beta3_fr47_live',
  status: 'blocked',
  package_root: packageRoot,
  grouped_url: groupedUrl,
  stable_fallback_url: stableFallbackSentinelUrl,
  stable_fallback_disabled: true,
  samples_per_english_scenario: samples,
  timeout_ms: timeoutMs,
  rate_window_reset_ms: rateWindowResetMs,
  measurement_strategy: 'actual_routed_samples_with_worker_classification',
  worker_affinity_assumed: false,
  timing_transport: 'measurement_only_jsonl',
  scenarios: [],
};
let failure = null;
let timingRecordsRead = 0;

async function resetRateWindow() {
  if (rateWindowResetMs === 0) {
    return {
      duration_ms: 0,
      network_requests: 0,
    };
  }

  const startedAt = Date.now();
  await new Promise((resolveWait) => setTimeout(resolveWait, rateWindowResetMs));

  return {
    duration_ms: Date.now() - startedAt,
    network_requests: 0,
  };
}

function readNextWorkerTiming() {
  assert.equal(existsSync(timingOutputPath), true, 'The MCP timing output file was not created.');
  const lines = readFileSync(timingOutputPath, 'utf8')
    .split(/\r?\n/)
    .filter(Boolean);
  assert.equal(
    lines.length,
    timingRecordsRead + 1,
    'Each recommendation call must emit exactly one grouped worker timing record.',
  );
  const record = JSON.parse(lines[timingRecordsRead]);
  timingRecordsRead = lines.length;
  const timing = record?.measurement_timing;
  assert.equal(record?.schema_version, 1);
  assert.ok(Number.isInteger(record?.logical_query_count) && record.logical_query_count > 0);
  assert.equal(timing?.schema_version, 2);
  assert.equal(timing?.event, 'search_stage_timing');
  assert.ok(['first_request', 'reused_worker'].includes(timing?.worker_state));
  assert.ok(Number.isInteger(timing?.worker_request_ordinal));
  assert.ok(timing.worker_request_ordinal > 0);
  assert.ok(Number.isFinite(timing?.module_age_ms_at_handler_entry));
  assert.ok(Number.isFinite(timing?.total_ms));
  assert.ok(Number.isFinite(timing?.stages_ms?.candidate_search));
  assert.ok(Number.isFinite(timing?.stages_ms?.audit_write));
  return {
    logical_query_count: record.logical_query_count,
    timing,
  };
}

function summarizeCohort(samples, workerState) {
  const cohort = samples.filter((sample) => sample.worker_state === workerState);
  const latencies = cohort.map((sample) => sample.end_to_end_latency_ms);
  return {
    sample_count: cohort.length,
    latencies_ms: latencies,
    p95_ms: latencies.length > 0 ? percentile(latencies, 0.95) : null,
    maximum_ms: latencies.length > 0 ? Math.max(...latencies) : null,
  };
}

async function runTimedRecommendation(scenario) {
  const startedAt = performance.now();
  let timeoutHandle;
  const timeout = new Promise((_, reject) => {
    timeoutHandle = setTimeout(
      () => {
        const error = new Error(`FR-47 call exceeded ${timeoutMs} ms.`);
        error.code = 'fr47_timeout';
        reject(error);
      },
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
  const workerRecord = readNextWorkerTiming();
  return {
    end_to_end_latency_ms: latencyMs,
    logical_query_count: workerRecord.logical_query_count,
    worker_state: workerRecord.timing.worker_state,
    worker_request_ordinal: workerRecord.timing.worker_request_ordinal,
    module_age_ms_at_handler_entry: workerRecord.timing.module_age_ms_at_handler_entry,
    handler_total_ms: workerRecord.timing.total_ms,
    candidate_search_ms: workerRecord.timing.stages_ms.candidate_search,
    audit_write_ms: workerRecord.timing.stages_ms.audit_write,
  };
}

try {
  await client.connect(transport);
  for (const scenario of scenarios) {
    const maximumAttempts = scenario.measuredSamples;
    const scenarioSummary = {
      id: scenario.id,
      slot_count: scenario.slots.length,
      locale: scenario.locale,
      sample_target: scenario.measuredSamples,
      maximum_attempts: maximumAttempts,
      rate_window_resets: [],
      measured_back_to_back: true,
      worker_affinity_assumed: false,
      sample_records: [],
      latencies_ms: [],
      overall_p95_ms: null,
      overall_maximum_ms: null,
      worker_cohorts: {
        first_request: null,
        reused_worker: null,
      },
      p95_limit_ms: scenario.p95LimitMs,
      timeouts: 0,
      all_slots_resolved: false,
      status: 'blocked',
    };
    summary.scenarios.push(scenarioSummary);

    scenarioSummary.rate_window_resets.push(await resetRateWindow());
    for (let index = 0; index < maximumAttempts; index += 1) {
      if (index > 0 && index % 3 === 0) {
        scenarioSummary.rate_window_resets.push(await resetRateWindow());
      }
      try {
        const sample = await runTimedRecommendation(scenario);
        sample.sample_number = scenarioSummary.sample_records.length + 1;
        scenarioSummary.sample_records.push(sample);
        scenarioSummary.latencies_ms.push(sample.end_to_end_latency_ms);
      } catch (error) {
        if (error?.code === 'fr47_timeout') scenarioSummary.timeouts += 1;
        throw error;
      }
    }
    scenarioSummary.overall_p95_ms = percentile(scenarioSummary.latencies_ms, 0.95);
    scenarioSummary.overall_maximum_ms = Math.max(...scenarioSummary.latencies_ms);
    scenarioSummary.worker_cohorts.first_request = summarizeCohort(
      scenarioSummary.sample_records,
      'first_request',
    );
    scenarioSummary.worker_cohorts.reused_worker = summarizeCohort(
      scenarioSummary.sample_records,
      'reused_worker',
    );
    scenarioSummary.all_slots_resolved = true;
    assert.equal(scenarioSummary.sample_records.length, scenario.measuredSamples);
    assert.ok(
      scenarioSummary.overall_p95_ms <= scenario.p95LimitMs,
      `${scenario.id} p95 ${scenarioSummary.overall_p95_ms} ms exceeds ${scenario.p95LimitMs} ms.`,
    );
    assert.ok(
      scenarioSummary.overall_maximum_ms < timeoutMs,
      `${scenario.id} maximum ${scenarioSummary.overall_maximum_ms} ms reached the ${timeoutMs} ms timeout.`,
    );
    scenarioSummary.status = 'ok';
  }
  summary.status = 'ok';
  summary.finished_at = new Date().toISOString();
} catch (error) {
  summary.error = {
    name: error?.name || 'Error',
    message: error?.message || String(error),
  };
  summary.finished_at = new Date().toISOString();
  failure = error;
} finally {
  await client.close().catch(() => {});
  const serialized = `${JSON.stringify(summary, null, 2)}\n`;
  if (outputPath) writeFileSync(resolve(outputPath), serialized, 'utf8');
  console.log(serialized.trim());
  rmSync(timingWorkspace, { recursive: true, force: true });
}

if (failure) {
  console.error(failure?.stack || failure?.message || String(failure));
  process.exitCode = 1;
}
