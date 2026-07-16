import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { runBoundedRollupRefresh } from './admin-dashboard-rollup-refresh-gate.mjs';

function readArg(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : '';
}

function percentile(values, fraction) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1)];
}

const adminUrl = (readArg('admin-url') || 'https://kcjmkakdhsqplvasgkjv.supabase.co/functions/v1/admin-api')
  .replace(/\/+$/, '');
const mode = readArg('mode') || 'candidate';
const outputPath = readArg('output');
const maxRefreshDaysText = readArg('max-refresh-days');
const adminSecret = String(process.env.PHASE_A_ADMIN_SECRET || '');

assert.ok(['legacy', 'candidate'].includes(mode), 'Mode must be legacy or candidate.');
assert.ok(outputPath, 'Provide --output for retained evidence.');
assert.ok(adminSecret, 'PHASE_A_ADMIN_SECRET must be present in the process environment.');
const maxRefreshDays = mode === 'candidate' ? Number(maxRefreshDaysText) : 0;
if (mode === 'candidate') {
  assert.ok(Number.isInteger(maxRefreshDays) && maxRefreshDays >= 0 && maxRefreshDays <= 120,
    'Candidate mode requires --max-refresh-days between 0 and 120.');
}

const summary = {
  artifact: 'admin_dashboard_phase_a_admin_api_live_contract',
  admin_url: adminUrl,
  mode,
  started_at: new Date().toISOString(),
};

async function requestJson(path, { method = 'GET' } = {}) {
  const startedAt = performance.now();
  const response = await fetch(`${adminUrl}${path}`, {
    method,
    headers: {
      'content-type': 'application/json',
      'x-admin-secret': adminSecret,
    },
    signal: AbortSignal.timeout(120_000),
  });
  const latencyMs = Math.round((performance.now() - startedAt) * 10) / 10;
  const payload = await response.json().catch(() => null);
  assert.equal(response.status, 200, `${method} ${path} failed with HTTP ${response.status}.`);
  assert.ok(payload && typeof payload === 'object', `${method} ${path} returned invalid JSON.`);
  return { payload, latency_ms: latencyMs };
}

async function measureQueue(path, count = 20) {
  await requestJson(path);
  const samples = [];
  for (let index = 0; index < count; index += 1) {
    const sample = await requestJson(path);
    assert.ok(Array.isArray(sample.payload.queries), 'Queue response must include queries.');
    samples.push(sample.latency_ms);
  }
  return {
    samples_ms: samples,
    p95_ms: percentile(samples, 0.95),
    max_ms: Math.max(...samples),
  };
}

try {
  if (mode === 'legacy') {
    const stats = await requestJson('/stats');
    assert.ok(stats.payload.stats && typeof stats.payload.stats === 'object');
    summary.status = 'ok';
    summary.legacy_stats_latency_ms = stats.latency_ms;
    summary.rollup_writes = 0;
  } else {
    const refreshes = [];
    summary.rollup_refreshes = refreshes;
    summary.rollup_refresh_day_limit = maxRefreshDays;
    const refreshDeadline = Date.now() + (20 * 60 * 1000);
    const refreshResult = await runBoundedRollupRefresh({
      maxRefreshDays,
      deadlineEpochMs: refreshDeadline,
      refreshes,
      requestRefresh: () => requestJson('/intelligence/search/refresh-rollups', { method: 'POST' }),
    });

    const dashboard = await requestJson(
      '/intelligence/search/dashboard?window=1d&environment=production&channel=all&query_origin=agent_query',
    );
    assert.ok(dashboard.payload.summary && typeof dashboard.payload.summary === 'object');
    assert.ok(Array.isArray(dashboard.payload.latest_activity));
    assert.equal(dashboard.payload.filters?.query_origin, 'agent_query');
    assert.equal(dashboard.payload.limitations?.approximate_low_results_excluded_from_headline_rate, true);

    const commonFilters = 'environment=production&channel=all&query_origin=agent_query';
    const queue24h = await measureQueue(`/intelligence/search/queue?window=1d&${commonFilters}`);
    const queueAll = await measureQueue(`/intelligence/search/queue?window=all&${commonFilters}`);
    summary.dashboard_24h = {
      latency_ms: dashboard.latency_ms,
      latest_activity_count: dashboard.payload.latest_activity.length,
      filters: dashboard.payload.filters,
    };
    summary.queue_24h = queue24h;
    summary.queue_all = queueAll;
    summary.performance_contract = {
      queue_24h_p95_limit_ms: 1500,
      queue_all_p95_limit_ms: 1000,
      warm_samples_each: 20,
      rollup_refresh_elapsed_limit_minutes: 20,
      rollup_refresh_day_limit: maxRefreshDays,
      rollup_refresh_call_limit: maxRefreshDays + 1,
    };
    assert.ok(queue24h.p95_ms < 1500, `24h queue p95 was ${queue24h.p95_ms} ms.`);
    assert.ok(queueAll.p95_ms < 1000, `All-time queue p95 was ${queueAll.p95_ms} ms.`);

    summary.status = 'ok';
    summary.rollup_backfill_complete = true;
    summary.rollup_refreshed_days = refreshResult.refreshed_days;
    summary.rollup_refresh_call_count = refreshResult.calls;
  }
} catch (error) {
  summary.status = 'failed';
  summary.error = error instanceof Error ? error.message : String(error);
  throw error;
} finally {
  summary.finished_at = new Date().toISOString();
  const absoluteOutput = resolve(outputPath);
  mkdirSync(dirname(absoluteOutput), { recursive: true });
  writeFileSync(absoluteOutput, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({ status: summary.status, output: outputPath }));
}
