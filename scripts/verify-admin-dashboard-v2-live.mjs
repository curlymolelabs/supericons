import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

function readArg(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : '';
}

function requireAvailability(value, label) {
  assert.ok(value && typeof value === 'object', `${label} is missing.`);
  assert.equal(typeof value.available, 'boolean', `${label} must state availability.`);
  assert.ok(Array.isArray(value.rows), `${label} must include rows.`);
  if (!value.available) {
    assert.ok(String(value.reason || '').trim(), `${label} must explain why it is unavailable.`);
  }
}

const adminUrl = (readArg('admin-url')
  || 'https://kcjmkakdhsqplvasgkjv.supabase.co/functions/v1/admin-api').replace(/\/+$/, '');
const outputPath = readArg('output');
const releaseFingerprint = readArg('release-fingerprint');
const adminSecret = String(process.env.PHASE_A_ADMIN_SECRET || '').trim();

assert.ok(outputPath, 'Provide --output for retained evidence.');
assert.match(releaseFingerprint, /^[0-9a-f]{64}$/, 'Provide --release-fingerprint.');
assert.ok(adminSecret, 'PHASE_A_ADMIN_SECRET must be present in the process environment.');

const summary = {
  artifact: 'admin_dashboard_v2_live_contract',
  admin_url: adminUrl,
  release_fingerprint: releaseFingerprint,
  status: 'running',
  started_at: new Date().toISOString(),
};

async function requestJson(path) {
  const startedAt = performance.now();
  const response = await fetch(`${adminUrl}${path}`, {
    headers: {
      accept: 'application/json',
      'x-admin-secret': adminSecret,
    },
    signal: AbortSignal.timeout(120_000),
  });
  const latencyMs = Math.round((performance.now() - startedAt) * 10) / 10;
  const payload = await response.json().catch(() => null);
  assert.equal(response.status, 200, `GET ${path} failed with HTTP ${response.status}.`);
  assert.ok(payload && typeof payload === 'object', `GET ${path} returned invalid JSON.`);
  return { payload, latency_ms: latencyMs };
}

function assertMeta(payload, expectedWindow) {
  assert.ok(payload.meta && typeof payload.meta === 'object', 'Response meta is missing.');
  assert.equal(payload.meta.window, expectedWindow);
  assert.ok(Number.isFinite(Number(payload.meta.generation_ms)), 'Response generation time is missing.');
}

async function verifyOverview(path, expectedWindow) {
  const result = await requestJson(path);
  const { payload } = result;
  assert.ok(payload.kpis && typeof payload.kpis === 'object', 'Overview KPIs are missing.');
  assert.ok(Array.isArray(payload.series), 'Overview series are missing.');
  assert.ok(Array.isArray(payload.outage_spans), 'Outage spans are missing.');
  assert.ok(payload.top_lists && typeof payload.top_lists === 'object', 'Top lists are missing.');
  for (const key of ['searched', 'returned', 'copied', 'zero']) {
    requireAvailability(payload.top_lists[key], `Top list ${key}`);
  }
  requireAvailability(payload.geography, 'Geography');
  assertMeta(payload, expectedWindow);
  return {
    latency_ms: result.latency_ms,
    series_rows: payload.series.length,
    searched_rows: payload.top_lists.searched.rows.length,
    returned_available: payload.top_lists.returned.available,
    returned_rows: payload.top_lists.returned.rows.length,
    copied_available: payload.top_lists.copied.available,
    copied_rows: payload.top_lists.copied.rows.length,
    zero_rows: payload.top_lists.zero.rows.length,
    geography_available: payload.geography.available,
    geography_rows: payload.geography.rows.length,
    identity_available: payload.kpis.identity_available !== false,
    series_days: new Set(
      payload.series
        .filter((row) => row.channel === 'all')
        .map((row) => row.day),
    ).size,
    raw_rows_truncated: payload.meta.raw_rows_truncated === true,
    identity_rows_truncated: payload.meta.identity_rows_truncated === true,
  };
}

try {
  const common = 'channel=all&include_test=false';
  const activity = await requestJson(`/v2/activity?window=30d&${common}&limit=50`);
  assert.ok(Array.isArray(activity.payload.activity), 'Activity rows are missing.');
  assert.ok(activity.payload.channel_counts && typeof activity.payload.channel_counts === 'object', 'Channel counts are missing.');
  assertMeta(activity.payload, '30d');

  const overview30d = await verifyOverview(`/v2/overview?window=30d&${common}`, '30d');
  assert.equal(overview30d.raw_rows_truncated, false, 'The bounded current-day source must cover the 30-day aggregate.');
  assert.equal(overview30d.identity_rows_truncated, false, 'The bounded identity source must cover the 30-day view.');
  assert.equal(overview30d.identity_available, true, 'The 30-day identity KPIs must be available.');
  assert.equal(overview30d.geography_available, true, 'The 30-day geography view must be available.');
  assert.ok(overview30d.series_days >= 29, 'The 30-day chart must include completed-day rollups.');
  const search = await requestJson(`/v2/search?window=30d&${common}&page=1&page_size=50`);
  assert.ok(Array.isArray(search.payload.queries), 'Search explorer rows are missing.');
  assert.ok(Array.isArray(search.payload.worklist), 'Gap worklist rows are missing.');
  requireAvailability(search.payload.icon_requests, 'Icon request inbox');
  requireAvailability(search.payload.contact_submissions, 'Contact inbox');
  assert.ok(search.payload.diagnostics && typeof search.payload.diagnostics === 'object', 'Diagnostics are missing.');
  assertMeta(search.payload, '30d');

  const audience = await requestJson(`/v2/audience?window=30d&${common}&page=1&page_size=50`);
  assert.ok(audience.payload.funnel && typeof audience.payload.funnel === 'object', 'Audience funnel is missing.');
  assert.equal(audience.payload.funnel.identity_available, true, 'The 30-day audience identity must be available.');
  assert.ok(Array.isArray(audience.payload.series), 'Audience series are missing.');
  requireAvailability(audience.payload.registered_users, 'Registered users');
  requireAvailability(audience.payload.clients, 'Client profiles');
  assert.equal(audience.payload.registered_users.available, true, 'The 30-day registered-user table must be available.');
  assert.equal(audience.payload.clients.available, true, 'The 30-day client table must be available.');
  assert.ok(audience.payload.funnel.mrr && typeof audience.payload.funnel.mrr === 'object', 'MRR state is missing.');
  if (!audience.payload.funnel.mrr.available) {
    assert.ok(String(audience.payload.funnel.mrr.reason || '').trim(), 'Unavailable MRR must include a reason.');
  }
  assertMeta(audience.payload, '30d');

  const overview1d = await verifyOverview(`/v2/overview?window=1d&${common}`, '1d');
  const overview7d = await verifyOverview(`/v2/overview?window=7d&${common}`, '7d');
  assert.ok(overview7d.series_days >= 6, 'The 7-day chart must include completed-day rollups.');
  const today = new Date();
  const to = today.toISOString().slice(0, 10);
  const fromDate = new Date(Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate() - 6,
  ));
  const from = fromDate.toISOString().slice(0, 10);
  const custom = await verifyOverview(
    `/v2/overview?window=custom&from=${from}&to=${to}&${common}`,
    'custom',
  );

  const warmRoutes = [
    ['/v2/activity?window=30d&channel=all&include_test=false&limit=50', 'activity'],
    ['/v2/overview?window=30d&channel=all&include_test=false', 'overview'],
    ['/v2/search?window=30d&channel=all&include_test=false&page=1&page_size=50', 'search'],
    ['/v2/audience?window=30d&channel=all&include_test=false&page=1&page_size=50', 'audience'],
  ];
  const warm = [];
  for (const [path, name] of warmRoutes) {
    const result = await requestJson(path);
    assert.ok(result.latency_ms < 5000, `Warm ${name} request took ${result.latency_ms} ms.`);
    warm.push({ name, latency_ms: result.latency_ms });
  }

  summary.routes = {
    activity: {
      latency_ms: activity.latency_ms,
      rows: activity.payload.activity.length,
      nonempty_channels: Object.values(activity.payload.channel_counts).filter((value) => Number(value) > 0).length,
    },
    overview_30d: overview30d,
    search: {
      latency_ms: search.latency_ms,
      query_rows: search.payload.queries.length,
      worklist_rows: search.payload.worklist.length,
      icon_requests_available: search.payload.icon_requests.available,
      icon_request_rows: search.payload.icon_requests.rows.length,
      contacts_available: search.payload.contact_submissions.available,
      contact_rows: search.payload.contact_submissions.rows.length,
    },
    audience: {
      latency_ms: audience.latency_ms,
      identity_available: audience.payload.funnel.identity_available !== false,
      registered_users_available: audience.payload.registered_users.available,
      registered_user_rows: audience.payload.registered_users.rows.length,
      clients_available: audience.payload.clients.available,
      client_rows: audience.payload.clients.rows.length,
      mrr_available: audience.payload.funnel.mrr.available === true,
    },
  };
  summary.chart_windows = {
    '1d': overview1d.series_rows,
    '7d': overview7d.series_rows,
    '30d': overview30d.series_rows,
    custom: custom.series_rows,
    custom_from: from,
    custom_to: to,
  };
  summary.warm_requests = warm;
  summary.warm_request_limit_ms = 5000;
  summary.status = 'ok';
} catch (error) {
  summary.status = 'failed';
  summary.error = error instanceof Error ? error.message : String(error);
  throw error;
} finally {
  summary.finished_at = new Date().toISOString();
  const absoluteOutput = resolve(outputPath);
  await mkdir(dirname(absoluteOutput), { recursive: true });
  await writeFile(absoluteOutput, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({ status: summary.status, output: outputPath }));
}
