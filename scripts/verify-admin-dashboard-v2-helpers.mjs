import assert from 'node:assert/strict';
import {
  aggregateDashboardV2IconRows,
  buildDashboardV2Clients,
  buildDashboardV2Geography,
  buildDashboardV2Kpis,
  buildDashboardV2Series,
  buildDashboardV2TopLists,
  compactDashboardV2QueryRows,
  filterDashboardV2QueryRows,
  filterDashboardV2Rows,
  maskDashboardV2Identifier,
  parseDashboardV2Filters,
  parseDashboardV2Range,
} from '../lib/admin-dashboard-v2.js';

const now = new Date('2026-07-17T12:00:00.000Z');

{
  const range = parseDashboardV2Range(new URL('https://example.test/v2/overview?window=30d'), now);
  assert.equal(range.key, '30d');
  assert.equal(range.duration_days, 30);
  assert.equal(range.from, '2026-06-18T00:00:00.000Z');
  assert.equal(range.use_raw, false);
}

{
  const range = parseDashboardV2Range(new URL('https://example.test/v2/overview?window=1d'), now);
  assert.equal(range.duration_days, 1);
  assert.equal(range.from, '2026-07-16T12:00:00.000Z');
  assert.equal(range.use_raw, true);
}

{
  const range = parseDashboardV2Range(
    new URL('https://example.test/v2/overview?window=30d'),
    new Date('2026-07-17T00:00:00.000Z'),
  );
  assert.equal(range.duration_days, 30);
  assert.equal(range.from, '2026-06-18T00:00:00.000Z');
  assert.equal(range.use_raw, false);
}

{
  const range = parseDashboardV2Range(new URL('https://example.test/v2/overview?window=custom&from=2026-07-01&to=2026-07-17'), now);
  assert.equal(range.key, 'custom');
  assert.equal(range.from_day, '2026-07-01');
  assert.equal(range.to_day, '2026-07-17');
  assert.equal(range.duration_days, 17);
}

assert.throws(
  () => parseDashboardV2Range(new URL('https://example.test/v2/overview?window=custom&from=2025-01-01&to=2026-07-17'), now),
  /cannot exceed 366 days/,
);

{
  const filters = parseDashboardV2Filters(new URL('https://example.test/v2/overview?window=7d&channel=web&include_test=true&q=database'), now);
  assert.equal(filters.channel, 'web');
  assert.equal(filters.include_test, true);
  assert.equal(filters.q, 'database');
  const filtered = filterDashboardV2Rows([
    { environment: 'production', channel: 'web', search_query: 'database' },
    { environment: 'test', channel: 'web', search_query: 'database' },
    { environment: 'production', channel: 'hosted_mcp', search_query: 'database' },
  ], filters);
  assert.equal(filtered.length, 2);
}

const identityRows = [
  { created_at: '2026-07-16T01:00:00Z', channel: 'web', _estimated_client_key: 'a', estimated_client_key: 'anon:a', is_registered: false, is_pro: false, country_code: 'SG', search_query: 'database' },
  { created_at: '2026-07-16T02:00:00Z', channel: 'hosted_mcp', _estimated_client_key: 'b', estimated_client_key: 'user:b', user_id: 'b', is_registered: true, is_pro: true, country_code: 'US', search_query: 'calendar', account_plan: 'pro_monthly' },
  { created_at: '2026-07-17T01:00:00Z', channel: 'web', _estimated_client_key: 'a', estimated_client_key: 'anon:a', is_registered: false, is_pro: false, country_code: null, search_query: 'database' },
];

const series = buildDashboardV2Series([
  { day: '2026-07-16', channel: 'web', attempt_count: 4, success_count: 3, true_zero_count: 1, low_result_count: 1, low_result_eligible_count: 3, client_days: 1 },
  { day: '2026-07-16', channel: 'hosted_mcp', attempt_count: 2, success_count: 2, true_zero_count: 0, low_result_count: 0, low_result_eligible_count: 2, client_days: 1 },
  { day: '2026-07-17', channel: 'web', attempt_count: 3, success_count: 3, true_zero_count: 0, low_result_count: 0, low_result_eligible_count: 3, client_days: 1 },
], identityRows);

{
  const aggregate = series.find((row) => row.day === '2026-07-16' && row.channel === 'all');
  assert.equal(aggregate.attempts, 6);
  assert.equal(aggregate.registered_clients, 1);
  assert.equal(aggregate.pro_clients, 1);
  assert.equal(aggregate.client_days, 2);
  const kpis = buildDashboardV2Kpis(series, identityRows);
  assert.equal(kpis.attempts, 9);
  assert.equal(kpis.estimated_unique_clients, 2);
  assert.equal(kpis.registered_clients, 1);
  assert.equal(kpis.pro_clients, 1);
  assert.equal(kpis.true_zero_count, 1);
}

const queryRows = [
  {
    query: 'database',
    library_filter: 'lucide',
    attempt_count: 7,
    successful_attempt_count: 7,
    zero_attempt_count: 0,
    low_attempt_count: 0,
    estimated_unique_clients: 4,
    channels: ['web'],
    countries: ['SG'],
    query_origins: ['agent_query'],
    visitor_kinds: ['anonymous'],
    last_seen: '2026-07-17T01:00:00Z',
  },
  {
    query: 'missing brand',
    library_filter: 'all',
    attempt_count: 5,
    successful_attempt_count: 0,
    zero_attempt_count: 5,
    low_attempt_count: 0,
    estimated_unique_clients: 3,
    channels: ['hosted_mcp'],
    countries: ['DE'],
    query_origins: ['agent_query'],
    visitor_kinds: ['registered'],
    registered_user_count: 1,
    last_seen: '2026-07-17T02:00:00Z',
  },
];

{
  const lists = buildDashboardV2TopLists(queryRows);
  assert.equal(lists.searched[0].query, 'database');
  assert.equal(lists.searched[0].hit_rate, 1);
  assert.equal(lists.zero[0].query, 'missing brand');
  const filtered = filterDashboardV2QueryRows(queryRows, 'zero:true venue:hosted_mcp country:de registered:true');
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].query, 'missing brand');
  const compact = compactDashboardV2QueryRows(filtered);
  assert.equal(compact[0].issue_type, 'zero_result');
  assert.equal(compact[0].channel, 'hosted_mcp');
}

{
  const geography = buildDashboardV2Geography(identityRows);
  assert.equal(geography.rows[0].country_code, 'SG');
  assert.equal(geography.rows.find((row) => row.country_code === 'Unknown').searches, 1);
  assert.equal(geography.coverage_rate, 2 / 3);
}

{
  const icons = aggregateDashboardV2IconRows([
    { icon_id: 'lucide:database', session_hash: 'a', search_query: 'database', evidence_text: 'copy:svg' },
    { icon_id: 'lucide:database', session_hash: 'b', search_query: 'storage', evidence_text: 'download:png' },
    { icon_id: 'lucide:calendar', session_hash: 'a', search_query: 'date', evidence_text: 'copy:svg' },
  ], 'actions');
  assert.equal(icons[0].icon_id, 'lucide:database');
  assert.equal(icons[0].actions, 2);
  assert.equal(icons[0].distinct_clients, 2);
  assert.equal(icons[0].distinct_queries, 2);
}

{
  const clients = buildDashboardV2Clients(identityRows);
  assert.equal(clients.length, 2);
  assert.equal(clients.find((row) => row.client_key === 'user:b').visitor_kind, 'pro');
  assert.equal(maskDashboardV2Identifier('hello@example.com'), 'h***@example.com');
}

console.log(JSON.stringify({
  status: 'ok',
  cases: 11,
  series_rows: series.length,
  query_filters: true,
  privacy_safe_identifiers: true,
}, null, 2));
