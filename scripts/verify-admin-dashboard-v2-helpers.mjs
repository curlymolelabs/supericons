import assert from 'node:assert/strict';
import {
  aggregateDashboardV2IconRows,
  buildDashboardV2Clients,
  buildDashboardV2Geography,
  buildDashboardV2Kpis,
  buildDashboardV2QueryHistoryKey,
  buildDashboardV2Series,
  buildDashboardV2TopLists,
  compactDashboardV2QueryRows,
  fetchBoundedDashboardV2Pages,
  filterDashboardV2QueryRows,
  filterDashboardV2Rows,
  maskDashboardV2Identifier,
  mergeDashboardV2CurrentQueryDetails,
  normalizeDashboardV2QueryRows,
  parseDashboardV2Filters,
  parseDashboardV2Range,
} from '../lib/admin-dashboard-v2.js';

const now = new Date('2026-07-17T12:00:00.000Z');

{
  const sharedContext = {
    query: 'user',
    libraryFilter: 'lucide',
    queryOrigin: 'recommend_variant',
    channel: 'hosted_mcp',
  };
  const firstSearcher = buildDashboardV2QueryHistoryKey({
    ...sharedContext,
    searcherKey: 'anonymous:first',
  });
  const repeatedFirstSearcher = buildDashboardV2QueryHistoryKey({
    ...sharedContext,
    searcherKey: 'anonymous:first',
  });
  const secondSearcher = buildDashboardV2QueryHistoryKey({
    ...sharedContext,
    searcherKey: 'anonymous:second',
  });
  assert.equal(firstSearcher, repeatedFirstSearcher);
  assert.notEqual(
    firstSearcher,
    secondSearcher,
    'Two searchers using the same query were incorrectly combined into one history row.',
  );
}

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
  const source = Array.from({ length: 3500 }, (_, index) => ({ index }));
  let active = 0;
  let maximumActive = 0;
  let countRequests = 0;
  const result = await fetchBoundedDashboardV2Pages(async ({
    from,
    to,
    includeCount,
  }) => {
    active += 1;
    maximumActive = Math.max(maximumActive, active);
    if (includeCount) countRequests += 1;
    await new Promise((resolve) => setTimeout(resolve, 5));
    active -= 1;
    return {
      rows: source.slice(from, to + 1),
      total: includeCount ? source.length : null,
    };
  }, {
    maxRows: 5000,
    pageSize: 1000,
    concurrency: 3,
  });
  assert.equal(result.rows.length, 3500);
  assert.equal(result.rows[0].index, 0);
  assert.equal(result.rows.at(-1).index, 3499);
  assert.equal(result.total, 3500);
  assert.equal(maximumActive, 3);
  assert.equal(countRequests, 1);
}

{
  const source = Array.from({ length: 5000 }, (_, index) => ({ index }));
  const result = await fetchBoundedDashboardV2Pages(async ({
    from,
    to,
    includeCount,
  }) => ({
    rows: source.slice(from, to + 1),
    total: includeCount ? source.length : null,
  }), {
    maxRows: 2501,
    pageSize: 1000,
    concurrency: 4,
  });
  assert.equal(result.rows.length, 2501);
  assert.equal(result.total, 5000);
}

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

{
  const filters = parseDashboardV2Filters(new URL('https://example.test/v2/overview?window=1d&channel=all&include_test=false'), now);
  const filtered = filterDashboardV2Rows([
    { environment: 'production', channel: 'web', search_query: 'real user query' },
    { environment: 'production', channel: 'internal_test', search_query: 'synthetic production probe' },
    { environment: 'preview', channel: 'web', search_query: 'preview query' },
  ], filters);
  assert.deepEqual(
    filtered.map((row) => row.search_query),
    ['real user query'],
    'The default dashboard leaked internal test or preview traffic.',
  );
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
  assert.equal(compact[0].zero_attempt_count, 5);
  assert.equal(compact[0].low_attempt_count, 0);
  assert.equal(compact[0].channel, 'hosted_mcp');
}

{
  const aggregateRows = compactDashboardV2QueryRows(normalizeDashboardV2QueryRows([
    {
      query: 'healthy aggregate',
      library_filter: 'all',
      attempt_count: 5,
      successful_attempt_count: 5,
      zero_attempt_count: 0,
      low_attempt_count: 0,
      client_days: 3,
      channels: ['web'],
      countries: [],
      query_origins: ['agent_query'],
      audit_sources: ['admin_rollup_queries'],
      minimum_result_count: null,
    },
    {
      query: 'all zero aggregate',
      library_filter: 'all',
      attempt_count: 3,
      successful_attempt_count: 0,
      zero_attempt_count: 3,
      low_attempt_count: 0,
      client_days: 2,
      channels: ['hosted_mcp'],
      countries: [],
      query_origins: ['agent_query'],
      audit_sources: ['admin_rollup_queries'],
      minimum_result_count: null,
    },
    {
      query: 'mixed aggregate',
      library_filter: 'all',
      attempt_count: 5,
      successful_attempt_count: 4,
      zero_attempt_count: 1,
      low_attempt_count: 0,
      client_days: 4,
      channels: ['web'],
      countries: [],
      query_origins: ['agent_query'],
      audit_sources: ['admin_rollup_queries'],
      minimum_result_count: null,
    },
    {
      query: 'database',
      library_filter: 'lucide',
      attempt_count: 0,
      successful_attempt_count: 0,
      zero_attempt_count: 0,
      low_attempt_count: 0,
      estimated_unique_clients: 1,
      channels: ['hosted_mcp'],
      countries: ['SG'],
      query_origins: ['icon_lookup'],
      audit_sources: ['mcp_usage_events'],
      minimum_result_count: 1,
      maximum_result_count: 1,
      result_sample_count: 1,
      mcp_result_rows: 1,
    },
  ]));
  const healthy = aggregateRows.find((row) => row.query === 'healthy aggregate');
  assert.equal(healthy.issue_type, 'successful');
  assert.equal(healthy.outcome_label, 'Success');
  assert.equal(healthy.result_count, null);
  assert.equal(healthy.result_count_available, false);
  assert.equal(healthy.result_count_reason, 'Not available for aggregate view');
  assert.equal(healthy.country_code, null);
  assert.equal(healthy.country_available, false);
  assert.equal(healthy.estimated_client_id_count, 3);
  assert.equal(healthy.estimated_client_id_count_reason, 'Daily reach is available for this grouped period.');
  assert.equal('client_label' in healthy, false);

  const allZero = aggregateRows.find((row) => row.query === 'all zero aggregate');
  assert.equal(allZero.issue_type, 'zero_result');
  assert.equal(allZero.outcome_label, 'Zero');
  assert.equal(allZero.result_count, 0);
  assert.equal(allZero.result_count_available, true);

  const mixed = aggregateRows.find((row) => row.query === 'mixed aggregate');
  assert.equal(mixed.issue_type, 'mixed_result');
  assert.equal(mixed.outcome_label, 'Mixed: 1 of 5 zero');
  assert.equal(mixed.zero_attempt_count, 1);
  assert.equal(mixed.low_attempt_count, 0);
  assert.equal(mixed.result_count, null);
  assert.equal(mixed.result_count_available, false);
  assert.equal(mixed.country_code, null);
  assert.equal(mixed.country_available, false);

  const lookup = aggregateRows.find((row) => row.query_origin === 'icon_lookup');
  assert.equal(lookup.issue_type, 'successful');
  assert.equal(lookup.outcome_label, 'Success');
  assert.equal(lookup.result_count, 1);
  assert.equal(lookup.result_count_available, true);
}

{
  const [merged] = mergeDashboardV2CurrentQueryDetails(
    [{
      query: 'current detail',
      library_filter: 'lucide',
      query_origins: ['agent_query'],
      channels: ['hosted_mcp'],
      attempt_count: 8,
      successful_attempt_count: 8,
      client_days: 5,
      countries: [],
      audit_sources: ['admin_rollup_queries'],
      minimum_result_count: null,
      maximum_result_count: null,
      result_sample_count: 0,
      last_seen: '2026-07-18T10:18:00.123Z',
    }],
    [{
      query: 'current detail',
      library_filter: 'lucide',
      query_origins: ['agent_query'],
      channels: ['hosted_mcp'],
      attempt_count: 1,
      successful_attempt_count: 1,
      estimated_unique_clients: 1,
      countries: ['US'],
      audit_sources: ['search_request_audit'],
      minimum_result_count: 3,
      maximum_result_count: 3,
      result_sample_count: 1,
      first_seen: '2026-07-18T10:18:00Z',
      last_seen: '2026-07-18T10:18:00.123456+00:00',
    }],
  );
  const [compact] = compactDashboardV2QueryRows(normalizeDashboardV2QueryRows([merged]));
  assert.equal(compact.country_code, 'US');
  assert.equal(compact.country_available, true);
  assert.equal(compact.country_scope, 'current_day');
  assert.equal(compact.result_count, 3);
  assert.equal(compact.result_count_available, true);
  assert.equal(compact.result_count_kind, 'exact');
  assert.equal(compact.result_count_scope, 'current_day');
  assert.equal(compact.attempt_count, 8);

  const [stale] = mergeDashboardV2CurrentQueryDetails(
    [{
      query: 'do not cross records',
      library_filter: 'lucide',
      query_origins: ['agent_query'],
      channels: ['hosted_mcp'],
      attempt_count: 4,
      countries: [],
      audit_sources: ['admin_rollup_queries'],
      minimum_result_count: null,
      last_seen: '2026-07-18T10:18:00Z',
    }],
    [{
      query: 'do not cross records',
      library_filter: 'lucide',
      query_origins: ['agent_query'],
      channels: ['hosted_mcp'],
      countries: ['PL'],
      minimum_result_count: 7,
      maximum_result_count: 7,
      result_sample_count: 1,
      last_seen: '2026-07-18T10:17:00Z',
    }],
  );
  const [staleCompact] = compactDashboardV2QueryRows(normalizeDashboardV2QueryRows([stale]));
  assert.equal(staleCompact.country_available, false);
  assert.equal(staleCompact.result_count_available, false);
}

{
  const [grouped] = compactDashboardV2QueryRows(normalizeDashboardV2QueryRows([{
    query: 'settings',
    library_filter: 'all',
    attempt_count: 4,
    successful_attempt_count: 4,
    zero_attempt_count: 0,
    low_attempt_count: 0,
    estimated_unique_clients: 2,
    channels: ['hosted_mcp'],
    countries: ['SG'],
    query_origins: ['agent_query'],
    audit_sources: ['mcp_usage_events'],
    minimum_result_count: 2,
    maximum_result_count: 8,
  }]));
  assert.equal(grouped.result_count, null);
  assert.equal(grouped.result_count_min, 2);
  assert.equal(grouped.result_count_max, 8);
  assert.equal(grouped.result_count_kind, 'range_across_attempts');
  assert.equal(grouped.result_count_reason, 'Results ranged from 2 to 8 across 4 searches');
  assert.equal(grouped.activity_label, '4 searches');
  assert.equal(grouped.estimated_client_id_count, 2);
  assert.equal('client_label' in grouped, false);
}

{
  const [grouped] = compactDashboardV2QueryRows(normalizeDashboardV2QueryRows([{
    query: 'shield lock',
    library_filter: 'lucide',
    attempt_count: 3,
    successful_attempt_count: 3,
    zero_attempt_count: 0,
    low_attempt_count: 0,
    estimated_unique_clients: 3,
    channels: ['hosted_mcp'],
    countries: ['BR', 'SG'],
    query_origins: ['recommend_variant'],
    audit_sources: ['search_request_audit'],
    minimum_result_count: 10,
    maximum_result_count: 10,
  }]));
  assert.equal(grouped.country_code, null);
  assert.equal(grouped.country_count, 2);
  assert.equal(grouped.country_available, false);
  assert.equal(grouped.country_reason, '2 countries across grouped attempts');
  assert.equal(grouped.result_count, 10);
  assert.equal(grouped.result_count_kind, 'exact');
}

{
  const [recommendation] = compactDashboardV2QueryRows(normalizeDashboardV2QueryRows([{
    query: 'choose a gatekeeper icon',
    library_filter: 'lucide',
    attempt_count: 1,
    successful_attempt_count: 1,
    estimated_unique_clients: 1,
    channels: ['local_mcp'],
    countries: [],
    query_origins: ['agent_query'],
    tools: ['recommend_icons'],
    audit_sources: ['mcp_usage_events'],
    minimum_result_count: 1,
    maximum_result_count: 1,
    result_sample_count: 1,
  }]));
  assert.equal(recommendation.activity_label, '1 search');
  assert.equal(recommendation.result_count, 1);
  assert.equal(recommendation.result_unit, 'primary_pick');
}

{
  const kpis = buildDashboardV2Kpis([
    {
      day: '2026-07-17',
      channel: 'all',
      attempts: 10,
      success_count: 9,
      true_zero_count: 1,
      low_result_count: 0,
      low_result_eligible_count: 9,
      client_days: 4,
    },
  ], []);
  assert.equal(kpis.true_zero_count, 1);
  assert.equal(kpis.attempts, 10);
  assert.equal(kpis.true_zero_rate, 0.1);
}

{
  const kpis = buildDashboardV2Kpis([
    {
      day: '2026-07-17',
      channel: 'all',
      attempts: 100,
      success_count: 100,
      true_zero_count: 0,
      low_result_count: 0,
      low_result_eligible_count: 0,
      client_days: 10,
    },
  ], []);
  assert.equal(kpis.low_result_rate, null);
  assert.equal(kpis.low_result_rate_available, false);
  assert.equal(kpis.low_result_coverage_rate, 0);
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
  cases: 15,
  series_rows: series.length,
  query_filters: true,
  aggregate_query_semantics: true,
  true_zero_rate_uses_attempt_counts: true,
  searcher_semantics: true,
}, null, 2));
