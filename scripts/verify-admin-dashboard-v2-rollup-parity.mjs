import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

function readArg(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : '';
}

const projectRef = readArg('project-ref') || 'kcjmkakdhsqplvasgkjv';
const adminUrl = (readArg('admin-url')
  || `https://${projectRef}.supabase.co/functions/v1/admin-api`).replace(/\/+$/, '');
const outputPath = readArg('output');
const releaseFingerprint = readArg('release-fingerprint');
const accessToken = String(process.env.SUPABASE_ACCESS_TOKEN || '').trim();
const adminSecret = String(process.env.PHASE_A_ADMIN_SECRET || '').trim();

assert.match(projectRef, /^[a-z]{20}$/, 'Project reference is malformed.');
assert.ok(outputPath, 'Provide --output for retained evidence.');
assert.match(releaseFingerprint, /^[0-9a-f]{64}$/, 'Provide --release-fingerprint.');
assert.ok(accessToken, 'SUPABASE_ACCESS_TOKEN must be present in the process environment.');
assert.ok(adminSecret, 'PHASE_A_ADMIN_SECRET must be present in the process environment.');

const managementQueryUrl = `https://api.supabase.com/v1/projects/${projectRef}/database/query`;
const summary = {
  artifact: 'admin_dashboard_v2_rollup_parity',
  project_ref: projectRef,
  release_fingerprint: releaseFingerprint,
  transaction_mode: 'read_only',
  mutations: 0,
  status: 'running',
  started_at: new Date().toISOString(),
};

async function queryDatabase(name, sql) {
  const startedAt = performance.now();
  const response = await fetch(managementQueryUrl, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
    signal: AbortSignal.timeout(15_000),
  });
  const latencyMs = Math.round((performance.now() - startedAt) * 10) / 10;
  const payload = await response.json().catch(() => null);
  assert.ok(
    response.status === 200 || response.status === 201,
    `${name} failed with HTTP ${response.status}.`,
  );
  assert.ok(Array.isArray(payload), `${name} returned invalid JSON.`);
  return { rows: payload, latency_ms: latencyMs };
}

async function requestOverview(path) {
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

function numeric(value) {
  const parsed = Number(value);
  assert.ok(Number.isFinite(parsed), `Expected a numeric value, received ${value}.`);
  return parsed;
}

const overviewSql = `
begin read only;
set local statement_timeout = '3000ms';
select
  day::text as day,
  sum(attempt_count)::bigint as attempts,
  sum(success_count)::bigint as success_count,
  sum(true_zero_count)::bigint as true_zero_count,
  sum(low_result_count)::bigint as low_result_count,
  sum(low_result_eligible_count)::bigint as low_result_eligible_count,
  sum(error_count)::bigint as error_count,
  sum(clarification_count)::bigint as clarification_count,
  sum(partial_recommendation_count)::bigint as partial_recommendation_count,
  sum(defect_count)::bigint as defect_count
from public.admin_rollup_overview
where environment = 'production'
  and day >= ((now() at time zone 'UTC')::date - 29)
  and day < (now() at time zone 'UTC')::date
group by day
order by day;
rollback;
`;

const querySql = `
begin read only;
set local statement_timeout = '3000ms';
select
  query_norm,
  coalesce(library_filter, 'all') as library_filter,
  sum(attempt_count)::bigint as searches
from public.admin_rollup_queries
where environment = 'production'
  and day >= ((now() at time zone 'UTC')::date - 7)
  and day < (now() at time zone 'UTC')::date
group by query_norm, coalesce(library_filter, 'all')
order by searches desc, query_norm asc, library_filter asc
limit 20;
rollback;
`;

try {
  const [expectedOverview, expectedQueries] = await Promise.all([
    queryDatabase('overview rollup parity source', overviewSql),
    queryDatabase('query rollup parity source', querySql),
  ]);
  const today = new Date().toISOString().slice(0, 10);
  const sevenDaysAgo = new Date(Date.parse(`${today}T00:00:00.000Z`) - (7 * 86_400_000))
    .toISOString().slice(0, 10);
  const yesterday = new Date(Date.parse(`${today}T00:00:00.000Z`) - 86_400_000)
    .toISOString().slice(0, 10);
  const [overview30d, completed7d] = await Promise.all([
    requestOverview('/v2/overview?window=30d&channel=all&include_test=false'),
    requestOverview(`/v2/overview?window=custom&from=${sevenDaysAgo}&to=${yesterday}&channel=all&include_test=false`),
  ]);

  assert.equal(overview30d.payload.meta.raw_rows_truncated, false);
  assert.equal(overview30d.payload.meta.rollup_rows_truncated, false);
  assert.equal(overview30d.payload.meta.identity_rows_truncated, false);

  const actualCompletedSeries = overview30d.payload.series
    .filter((row) => row.channel === 'all' && row.day < today);
  assert.equal(
    actualCompletedSeries.length,
    expectedOverview.rows.length,
    'The 30-day API and rollup table returned different completed-day counts.',
  );
  const actualByDay = new Map(actualCompletedSeries.map((row) => [row.day, row]));
  const countFields = [
    'attempts',
    'success_count',
    'true_zero_count',
    'low_result_count',
    'low_result_eligible_count',
    'error_count',
    'clarification_count',
    'partial_recommendation_count',
    'defect_count',
  ];
  for (const expected of expectedOverview.rows) {
    const actual = actualByDay.get(expected.day);
    assert.ok(actual, `The API is missing completed rollup day ${expected.day}.`);
    for (const field of countFields) {
      assert.equal(
        numeric(actual[field]),
        numeric(expected[field]),
        `${field} differs for ${expected.day}.`,
      );
    }
  }

  const searchedRows = completed7d.payload.top_lists?.searched?.rows;
  assert.ok(Array.isArray(searchedRows), 'The completed-range searched list is missing.');
  const actualQueries = new Map(searchedRows.map((row) => [
    `${row.query}|${row.library_filter || 'all'}`,
    numeric(row.searches),
  ]));
  for (const expected of expectedQueries.rows) {
    const key = `${expected.query_norm}|${expected.library_filter || 'all'}`;
    assert.equal(
      actualQueries.get(key),
      numeric(expected.searches),
      `Search count differs for ${key}.`,
    );
  }

  summary.status = 'ok';
  summary.overview = {
    completed_days_compared: expectedOverview.rows.length,
    first_day: expectedOverview.rows[0]?.day || null,
    last_day: expectedOverview.rows.at(-1)?.day || null,
    database_latency_ms: expectedOverview.latency_ms,
    api_latency_ms: overview30d.latency_ms,
    count_fields_compared: countFields,
  };
  summary.queries = {
    completed_days_compared: 7,
    top_rows_compared: expectedQueries.rows.length,
    database_latency_ms: expectedQueries.latency_ms,
    api_latency_ms: completed7d.latency_ms,
  };
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
