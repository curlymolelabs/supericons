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

function verifySemanticRows(expectedRows, payload, windowLabel) {
  const explorerRows = payload.queries;
  assert.ok(Array.isArray(explorerRows), `${windowLabel} query explorer is missing.`);
  assert.ok(explorerRows.length >= 10, `${windowLabel} query explorer returned fewer than 10 rows.`);
  const explorerByKey = new Map(explorerRows.map((row) => [
    `${row.query}|${row.library_filter || 'all'}`,
    row,
  ]));
  const semanticRows = expectedRows.slice(0, 10);
  assert.equal(semanticRows.length, 10, `${windowLabel} database sample returned fewer than 10 rows.`);
  for (const [semanticIndex, expected] of semanticRows.entries()) {
    const key = `${expected.query_norm}|${expected.library_filter || 'all'}`;
    const actual = explorerByKey.get(key);
    const sampleLabel = `${windowLabel} semantic sample ${semanticIndex + 1}`;
    assert.ok(actual, `The API query explorer is missing ${sampleLabel}.`);
    for (const field of [
      'zero_attempt_count',
      'issue_type',
      'outcome_label',
      'country_available',
      'country_code',
      'result_count_available',
    ]) {
      assert.ok(
        Object.hasOwn(actual, field),
        `The API query explorer ${sampleLabel} is missing semantic field ${field}.`,
      );
    }
    const attempts = numeric(expected.attempts);
    const zeroCount = numeric(expected.true_zero_count);
    const lowCount = numeric(expected.low_result_count);
    const allZero = attempts > 0 && zeroCount === attempts;
    const mixed = zeroCount > 0 && zeroCount < attempts;
    const expectedIssue = allZero
      ? 'zero_result'
      : mixed
        ? 'mixed_result'
        : lowCount > 0
          ? 'low_result'
          : 'successful';
    const expectedLabel = allZero
      ? 'Zero'
      : mixed
        ? `Mixed: ${zeroCount} of ${attempts} zero`
        : lowCount > 0
          ? 'Low'
          : 'Success';
    assert.equal(numeric(actual.attempt_count), attempts, `Attempt count differs for ${sampleLabel}.`);
    assert.equal(numeric(actual.zero_attempt_count), zeroCount, `Zero count differs for ${sampleLabel}.`);
    assert.equal(actual.issue_type, expectedIssue, `Outcome type differs for ${sampleLabel}.`);
    assert.equal(actual.outcome_label, expectedLabel, `Outcome label differs for ${sampleLabel}.`);
    assert.equal(actual.country_available, false, `Aggregate country availability differs for ${sampleLabel}.`);
    assert.equal(actual.country_code, null, `Aggregate country must be null for ${sampleLabel}.`);
    if (allZero) {
      assert.equal(actual.result_count_available, true, `All-zero result availability differs for ${sampleLabel}.`);
      assert.equal(numeric(actual.result_count), 0, `All-zero result count differs for ${sampleLabel}.`);
    } else {
      assert.equal(actual.result_count_available, false, `Aggregate result availability differs for ${sampleLabel}.`);
      assert.equal(actual.result_count, null, `Aggregate result count must be null for ${sampleLabel}.`);
      assert.equal(actual.result_count_reason, 'Not available for aggregate view');
    }
  }
  return semanticRows.length;
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
  sum(attempt_count)::bigint as attempts,
  sum(success_count)::bigint as success_count,
  sum(true_zero_count)::bigint as true_zero_count,
  sum(low_result_count)::bigint as low_result_count,
  max(last_seen)::text as last_seen
from public.admin_rollup_queries
where environment = 'production'
  and day >= ((now() at time zone 'UTC')::date - 7)
  and day < (now() at time zone 'UTC')::date
group by query_norm, coalesce(library_filter, 'all')
order by last_seen desc, attempts desc, query_norm asc, library_filter asc;
rollback;
`;

function semanticQuerySql(completedDays = null) {
  const rangeClause = completedDays === null
    ? ''
    : `and day >= ((now() at time zone 'UTC')::date - ${completedDays - 1})`;
  return `
begin read only;
set local statement_timeout = '3000ms';
select
  query_norm,
  coalesce(library_filter, 'all') as library_filter,
  sum(attempt_count)::bigint as attempts,
  sum(success_count)::bigint as success_count,
  sum(true_zero_count)::bigint as true_zero_count,
  sum(low_result_count)::bigint as low_result_count,
  max(last_seen)::text as last_seen
from public.admin_rollup_queries
where environment = 'production'
  ${rangeClause}
  and day < (now() at time zone 'UTC')::date
group by query_norm, coalesce(library_filter, 'all')
having max(last_seen) < date_trunc('day', now() at time zone 'UTC')
order by last_seen desc, attempts desc, query_norm asc, library_filter asc
limit 100;
rollback;
  `;
}

try {
  const [
    expectedOverview,
    expectedQueries,
    expectedSemantic7d,
    expectedSemantic30d,
    expectedSemanticAll,
  ] = await Promise.all([
    queryDatabase('overview rollup parity source', overviewSql),
    queryDatabase('query rollup parity source', querySql),
    queryDatabase('7-day query semantic source', semanticQuerySql(7)),
    queryDatabase('30-day query semantic source', semanticQuerySql(30)),
    queryDatabase('all-history query semantic source', semanticQuerySql()),
  ]);
  const today = new Date().toISOString().slice(0, 10);
  const sevenDaysAgo = new Date(Date.parse(`${today}T00:00:00.000Z`) - (7 * 86_400_000))
    .toISOString().slice(0, 10);
  const yesterday = new Date(Date.parse(`${today}T00:00:00.000Z`) - 86_400_000)
    .toISOString().slice(0, 10);
  const [
    overview30d,
    completed7d,
    completedSearch7d,
    search7d,
    search30d,
    searchAll,
  ] = await Promise.all([
    requestOverview('/v2/overview?window=30d&channel=all&include_test=false'),
    requestOverview(`/v2/overview?window=custom&from=${sevenDaysAgo}&to=${yesterday}&channel=all&include_test=false`),
    requestOverview(`/v2/search?window=custom&from=${sevenDaysAgo}&to=${yesterday}&channel=all&include_test=false&page=1&page_size=100`),
    requestOverview('/v2/search?window=7d&channel=all&include_test=false&page=1&page_size=100'),
    requestOverview('/v2/search?window=30d&channel=all&include_test=false&page=1&page_size=100'),
    requestOverview('/v2/search?window=all&channel=all&include_test=false&page=1&page_size=100'),
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
  assert.ok(searchedRows.length >= 20, 'The completed-range searched list is unexpectedly short.');
  const expectedQueriesByKey = new Map(expectedQueries.rows.map((row) => [
    `${row.query_norm}|${row.library_filter || 'all'}`,
    numeric(row.attempts),
  ]));
  const actualQueriesToCompare = searchedRows.slice(0, 50);
  for (const [index, actual] of actualQueriesToCompare.entries()) {
    const key = `${actual.query}|${actual.library_filter || 'all'}`;
    const expectedSearches = expectedQueriesByKey.get(key);
    assert.notEqual(expectedSearches, undefined, `The database rollup is missing API query ${key}.`);
    assert.equal(
      numeric(actual.searches),
      expectedSearches,
      `Search count differs for ${key}.`,
    );
    if (index > 0) {
      assert.ok(
        numeric(actualQueriesToCompare[index - 1].searches) >= numeric(actual.searches),
        'The searched list is not ordered by search count.',
      );
    }
  }

  const semanticRows = expectedQueries.rows.slice(0, 10);
  const completedSemanticCount = verifySemanticRows(
    semanticRows,
    completedSearch7d.payload,
    'completed 7-day',
  );
  const windowSemanticCounts = {
    '7d': verifySemanticRows(expectedSemantic7d.rows, search7d.payload, '7-day'),
    '30d': verifySemanticRows(expectedSemantic30d.rows, search30d.payload, '30-day'),
    all: verifySemanticRows(expectedSemanticAll.rows, searchAll.payload, 'all-history'),
  };

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
    top_rows_compared: actualQueriesToCompare.length,
    completed_semantic_rows_compared: completedSemanticCount,
    window_semantic_rows_compared: windowSemanticCounts,
    database_rows_available: expectedQueries.rows.length,
    database_latency_ms: expectedQueries.latency_ms,
    overview_api_latency_ms: completed7d.latency_ms,
    search_api_latency_ms: completedSearch7d.latency_ms,
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
