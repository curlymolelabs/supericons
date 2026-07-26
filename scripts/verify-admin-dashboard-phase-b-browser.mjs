import { chromium } from 'playwright';
import { mkdir, readFile } from 'node:fs/promises';
import { startAdminDashboardPhaseBLiveServer } from './serve-admin-dashboard-phase-b-live.mjs';

const server = await startAdminDashboardPhaseBLiveServer({
  adminSecret: 'browser-contract-only',
  managedAuth: false,
  port: 0,
});
const apiBase = 'https://kcjmkakdhsqplvasgkjv.supabase.co/functions/v1/admin-api';
const requests = [];
const writes = [];
let requestRound = 0;
const iconRequestReviews = new Map([
  ['22222222-2222-4222-8222-222222222222', { status: 'planned', note: 'Review with the next brand set.' }],
]);
const registeredRows = Array.from({ length: 23 }, (_, index) => ({
  user_id: `user-${index + 1}`,
  identifier: `u***${index + 1}@example.test`,
  provider: index % 2 === 0 ? 'Google' : 'Email',
  plan: index < 2 ? 'pro_monthly' : 'Free',
  signup_at: `2026-06-${String((index % 23) + 1).padStart(2, '0')}T00:00:00Z`,
  last_active: null,
  searches: index < 3 ? 10 - index : 0,
  venues: index < 3 ? ['web'] : [],
  country_code: index < 3 ? 'SG' : null,
  activity_linked: index < 3,
}));
const accountRows = Array.from({ length: 23 }, (_, index) => ({
  id: `user-${index + 1}`,
  email: `user${index + 1}@example.test`,
  provider: index % 2 === 0 ? 'Google' : 'Email',
  plan: index < 2 ? 'pro_monthly' : null,
  subscription_status: index < 2 ? 'active' : 'free',
  created_at: `2026-06-${String((index % 23) + 1).padStart(2, '0')}T08:15:00Z`,
  last_sign_in_at: `2026-07-${String((index % 17) + 1).padStart(2, '0')}T09:30:00Z`,
  api_key_count: index < 2 ? 1 : 0,
}));
const queryRows = [
  {
    query: 'healthy aggregate',
    library_filter: 'all',
    query_origin: 'agent_query',
    visitor_kind: 'anonymous',
    client_label: '3 clients',
    country_code: 'US',
    country_available: true,
    country_scope: 'current_day',
    channel: 'web',
    channels: ['web'],
    countries: ['US'],
    result_count: 3,
    typical_result_count: 3,
    result_sample_count: 5,
    result_count_available: true,
    result_count_kind: 'exact',
    result_count_scope: 'current_day',
    result_unit: 'icon',
    issue_type: 'successful',
    outcome_label: 'Success',
    attempt_count: 5,
    activity_count: 5,
    activity_kind: 'search',
    zero_attempt_count: 0,
    last_seen: '2026-07-17T07:40:00Z',
  },
  {
    query: 'mixed aggregate',
    library_filter: 'all',
    query_origin: 'agent_query',
    visitor_kind: 'anonymous',
    client_label: '4 clients',
    country_code: null,
    country_available: false,
    country_reason: 'Not available for aggregate view',
    channel: 'web',
    result_count: null,
    result_count_available: false,
    result_count_reason: 'Not available for aggregate view',
    issue_type: 'mixed_result',
    outcome_label: 'Mixed: 4 success, 1 zero',
    attempt_count: 5,
    activity_count: 5,
    activity_kind: 'search',
    zero_attempt_count: 1,
    last_seen: '2026-07-17T07:35:00Z',
  },
  {
    query: 'icon lookup',
    library_filter: 'lucide',
    query_origin: 'icon_lookup',
    visitor_kind: 'anonymous',
    client_label: '1 client',
    country_code: 'SG',
    country_available: true,
    channel: 'hosted_mcp',
    channels: ['hosted_mcp'],
    countries: ['SG'],
    result_count: 1,
    typical_result_count: 1,
    result_sample_count: 1,
    result_count_available: true,
    result_count_kind: 'exact',
    result_unit: 'match',
    issue_type: 'successful',
    outcome_label: 'Success',
    attempt_count: 0,
    activity_count: 1,
    activity_kind: 'lookup',
    estimated_client_id_count: 1,
    zero_attempt_count: 0,
    last_seen: '2026-07-17T07:32:00Z',
  },
  {
    query: 'icon lookup pending',
    library_filter: 'lucide',
    query_origin: 'icon_lookup',
    visitor_kind: 'anonymous',
    client_label: '1 client',
    country_code: 'SG',
    country_available: true,
    channel: 'hosted_mcp',
    result_count: null,
    result_count_available: false,
    result_count_reason: 'Not available for this view',
    issue_type: 'unknown',
    outcome_label: 'Lookup',
    attempt_count: 0,
    activity_count: 1,
    activity_kind: 'lookup',
    zero_attempt_count: 0,
    last_seen: '2026-07-17T07:31:00Z',
  },
  {
    query: 'icon lookup missing',
    library_filter: 'lucide',
    query_origin: 'icon_lookup',
    visitor_kind: 'anonymous',
    client_label: '1 client',
    country_code: 'SG',
    country_available: true,
    channel: 'hosted_mcp',
    channels: ['hosted_mcp'],
    countries: ['SG'],
    result_count: 0,
    typical_result_count: 0,
    result_sample_count: 1,
    result_count_available: true,
    result_count_kind: 'exact',
    result_unit: 'match',
    issue_type: 'not_found',
    outcome_label: 'Not found',
    attempt_count: 0,
    activity_count: 1,
    activity_kind: 'lookup',
    zero_attempt_count: 0,
    last_seen: '2026-07-17T07:30:30Z',
  },
  {
    query: 'recommendation request',
    library_filter: 'lucide',
    query_origin: 'agent_query',
    visitor_kind: 'anonymous',
    client_label: '1 client',
    country_code: 'SG',
    country_available: true,
    channel: 'local_mcp',
    channels: ['local_mcp'],
    countries: ['SG'],
    result_count: 8,
    typical_result_count: 8,
    result_sample_count: 1,
    result_count_available: true,
    result_count_kind: 'exact',
    result_unit: 'primary_pick',
    issue_type: 'successful',
    outcome_label: 'Success',
    attempt_count: 1,
    activity_count: 1,
    activity_kind: 'search',
    zero_attempt_count: 0,
    last_seen: '2026-07-17T07:30:15Z',
  },
  {
    query: 'missing brand',
    library_filter: 'all',
    query_origin: 'agent_query',
    visitor_kind: 'anonymous',
    client_label: 'anon:def456',
    country_code: 'DE',
    country_available: true,
    channel: 'hosted_mcp',
    result_count: 0,
    result_count_available: true,
    result_count_kind: 'exact',
    result_unit: 'icon',
    issue_type: 'zero_result',
    outcome_label: 'Zero',
    attempt_count: 5,
    activity_count: 5,
    activity_kind: 'search',
    zero_attempt_count: 5,
    last_seen: '2026-07-17T07:30:00Z',
  },
  {
    query: '=SUM(1,1)',
    library_filter: 'all',
    query_origin: 'agent_query',
    visitor_kind: 'anonymous',
    client_label: '1 client',
    country_code: 'SG',
    country_available: true,
    channel: 'web',
    channels: ['web'],
    countries: ['SG'],
    result_count: 1,
    typical_result_count: 1,
    result_sample_count: 1,
    result_count_available: true,
    result_count_kind: 'exact',
    result_unit: 'icon',
    issue_type: 'successful',
    outcome_label: 'Success',
    attempt_count: 1,
    activity_count: 1,
    activity_kind: 'search',
    zero_attempt_count: 0,
    last_seen: '2026-07-17T07:25:00Z',
  },
  {
    query: 'varying results',
    library_filter: 'lucide',
    query_origin: 'recommend_variant',
    visitor_kind: 'anonymous',
    country_code: 'SG',
    country_available: true,
    channel: 'local_mcp',
    result_count: null,
    result_count_min: 2,
    result_count_max: 8,
    typical_result_count: 5,
    result_sample_count: 4,
    result_count_available: true,
    result_count_kind: 'range_across_attempts',
    result_count_reason: 'Results ranged from 2 to 8 across 3 searches',
    result_unit: 'icon',
    issue_type: 'successful',
    outcome_label: 'Success',
    attempt_count: 4,
    activity_count: 4,
    activity_kind: 'search',
    estimated_client_id_count: 2,
    channels: ['local_mcp'],
    countries: ['SG'],
    tools: ['search_icons'],
    zero_attempt_count: 0,
    last_seen: '2026-07-17T07:22:00Z',
  },
  {
    query: 'approximate low results',
    library_filter: 'lucide',
    query_origin: 'agent_query',
    visitor_kind: 'anonymous',
    country_code: 'SG',
    country_available: true,
    channel: 'local_mcp',
    channels: ['local_mcp'],
    countries: ['SG'],
    result_count: 1,
    typical_result_count: 1,
    result_sample_count: 2,
    result_count_available: true,
    result_count_kind: 'exact',
    result_unit: 'icon',
    issue_type: 'low_result',
    outcome_label: 'Low',
    attempt_count: 2,
    activity_count: 2,
    activity_kind: 'search',
    estimated_client_id_count: 1,
    successful_attempt_count: 0,
    zero_attempt_count: 0,
    low_attempt_count: 2,
    approximate_low_attempt_count: 2,
    last_seen: '2026-07-17T07:21:00Z',
  },
  ...Array.from({ length: 55 }, (_, index) => ({
    query: `healthy query ${index + 1}`,
    library_filter: 'all',
    query_origin: 'agent_query',
    visitor_kind: 'anonymous',
    client_label: `${index + 1} clients`,
    country_code: null,
    country_available: false,
    country_reason: 'Not available for aggregate view',
    channel: 'web',
    result_count: null,
    result_count_available: false,
    result_count_reason: 'Not available for aggregate view',
    issue_type: 'successful',
    outcome_label: 'Success',
    attempt_count: index + 1,
    activity_count: index + 1,
    activity_kind: 'search',
    zero_attempt_count: 0,
    last_seen: '2026-07-17T07:20:00Z',
  })),
];
for (const row of queryRows) {
  const activityCount = Number(row.activity_count || 0);
  const lookupRow = row.query_origin === 'icon_lookup';
  row.successful_attempt_count ??= !lookupRow && row.issue_type === 'successful'
    ? activityCount
    : !lookupRow && row.issue_type === 'mixed_result'
      ? Math.max(0, activityCount
        - Number(row.zero_attempt_count || 0)
        - Number(row.low_attempt_count || 0)
        - Number(row.error_attempt_count || 0)
        - Number(row.clarification_attempt_count || 0))
      : 0;
  row.zero_attempt_count ??= !lookupRow && row.issue_type === 'zero_result'
    ? activityCount
    : 0;
  row.low_attempt_count ??= !lookupRow && row.issue_type === 'low_result'
    ? activityCount
    : 0;
  row.error_attempt_count ??= !lookupRow && row.issue_type === 'error'
    ? activityCount
    : 0;
  row.clarification_attempt_count ??= !lookupRow && row.issue_type === 'clarification'
    ? activityCount
    : 0;
  row.unknown_attempt_count ??= !lookupRow && row.issue_type === 'unknown'
    ? activityCount
    : 0;
  row.lookup_success_count ??= lookupRow && row.issue_type === 'successful'
    ? activityCount
    : 0;
  row.lookup_not_found_count ??= lookupRow && row.issue_type === 'not_found'
    ? activityCount
    : 0;
  row.lookup_error_count ??= lookupRow && row.issue_type === 'error'
    ? activityCount
    : 0;
  row.lookup_unknown_count ??= lookupRow && row.issue_type === 'unknown'
    ? activityCount
    : 0;
  row.searchers ??= [];
  row.searcher_details_available ??= false;
}
const eventRows = [
  {
    event_identifier: 'event-1',
    episode_id: '11111111-1111-4111-8111-111111111111',
    recovery_chain_id: '11111111-1111-4111-8111-111111111111',
    root_request_identifier: '0123456789ab',
    recorded_at: '2026-07-17T07:32:00Z',
    query: '\t=HYPERLINK("https://example.com")',
    query_origin: 'icon_lookup',
    tool_name: 'get_icon',
    event_type: 'tool_call',
    outcome: 'success',
    status: 'ok',
    library_filter: 'lucide',
    locale: null,
    locale_recorded: false,
    requested_limit: 1,
    result_count: 1,
    returned_icon_refs: ['lucide:database'],
    returned_icon_refs_recorded: true,
    latency_ms: 42,
    search_execution: 'hosted_fused',
    diagnostic_attempt_count: 2,
    server_version: '0.4.20',
    server_build: 'abc123',
    traffic_class: 'unclassified_live',
    channel: 'hosted_mcp',
    environment: 'production',
    client_family: 'codex',
    searcher_identifier: 'anonymous:0123456789ab',
    identity_quality: 'exact',
    source: 'mcp_usage_events',
    event_role: 'top_level',
  },
  {
    event_identifier: 'event-2',
    root_request_identifier: 'fedcba987654',
    recorded_at: '2026-07-17T07:30:30Z',
    query: 'icon lookup missing',
    query_origin: 'icon_lookup',
    tool_name: 'get_icon',
    event_type: 'tool_call',
    outcome: 'not_found',
    status: 'error',
    error_code: 'icon_not_found',
    library_filter: 'lucide',
    locale: null,
    locale_recorded: false,
    requested_limit: 1,
    result_count: 0,
    returned_icon_refs: [],
    returned_icon_refs_recorded: true,
    latency_ms: 23,
    server_version: '0.4.20',
    traffic_class: 'unclassified_live',
    channel: 'hosted_mcp',
    environment: 'production',
    client_family: 'codex',
    searcher_identifier: 'anonymous:fedcba987654',
    source: 'mcp_usage_events',
    event_role: 'top_level',
  },
  ...Array.from({ length: 103 }, (_, index) => ({
    event_identifier: `event-${index + 3}`,
    recorded_at: '2026-07-17T07:20:00Z',
    query: `event query ${index + 1}`,
    query_origin: 'agent_query',
    tool_name: 'search_icons',
    event_type: 'search_outcome',
    outcome: 'success',
    status: 'ok',
    result_count: 10,
    returned_icon_refs: [`lucide:event-${index + 1}`],
    returned_icon_refs_recorded: true,
    traffic_class: 'unclassified_live',
    channel: 'hosted_mcp',
    environment: 'production',
    searcher_identifier: `anonymous:event${index + 1}`,
    source: 'mcp_usage_events',
    event_role: 'top_level',
  })),
  {
    event_identifier: 'web-event-1',
    recorded_at: '2026-07-17T07:19:00Z',
    query: 'web search',
    query_origin: 'agent_query',
    tool_name: 'web_search',
    event_type: 'search_attempt',
    outcome: 'success',
    status: 'ok',
    result_count: 8,
    traffic_class: 'unclassified_live',
    channel: 'web',
    environment: 'production',
    searcher_identifier: 'anonymous:web1',
    source: 'search_request_audit',
    event_role: 'web_top_level',
  },
  {
    event_identifier: 'diagnostic-1',
    recorded_at: '2026-07-17T07:18:00Z',
    query: 'recommendation subquery',
    query_origin: 'recommend_variant',
    tool_name: 'search_icons',
    event_type: 'search_attempt',
    outcome: 'zero',
    status: 'ok',
    result_count: 0,
    traffic_class: 'unclassified_live',
    channel: 'hosted_mcp',
    environment: 'production',
    searcher_identifier: 'anonymous:diag1',
    source: 'search_request_audit',
    event_role: 'diagnostic',
    diagnostic_accounting_status: 'linked',
    diagnostic_linkage_tier: 'episode_id',
  },
];
const clientRows = Array.from({ length: 55 }, (_, index) => ({
  visitor_kind: 'anonymous',
  client_label: `anon:client${index + 1}`,
  plan: 'Free',
  country_code: index % 2 ? 'SG' : 'US',
  first_seen: '2026-07-15T00:00:00Z',
  last_seen: '2026-07-17T07:58:00Z',
  searches: index + 1,
  top_query: `query ${index + 1}`,
}));

function ok(condition, message) {
  if (!condition) throw new Error(message);
}

function sortedMockRows(rows, searchParams, fields) {
  const sortBy = searchParams.get('sort_by');
  if (!sortBy || !fields[sortBy]) return [...rows];
  const direction = searchParams.get('sort_direction') === 'asc' ? 1 : -1;
  const { field, type = 'text' } = fields[sortBy];
  return rows
    .map((row, index) => ({ row, index }))
    .sort((left, right) => {
      const leftValue = left.row[field];
      const rightValue = right.row[field];
      const leftMissing = leftValue === null || leftValue === undefined || leftValue === '';
      const rightMissing = rightValue === null || rightValue === undefined || rightValue === '';
      if (leftMissing && rightMissing) return left.index - right.index;
      if (leftMissing) return 1;
      if (rightMissing) return -1;
      const result = type === 'number'
        ? Number(leftValue) - Number(rightValue)
        : String(leftValue).localeCompare(String(rightValue), undefined, { numeric: true });
      return result === 0 ? left.index - right.index : result * direction;
    })
    .map((entry) => entry.row);
}

async function assertPanelActionsStayOnOneLine(page, sectionSelector) {
  const issues = await page.locator(`${sectionSelector} .panel-head`).evaluateAll((heads) => heads.flatMap((head) => {
    if (!(head instanceof HTMLElement) || head.offsetParent === null) return [];
    const actions = head.querySelector(':scope > .panel-actions');
    if (!(actions instanceof HTMLElement)) return [];
    const children = Array.from(actions.children).filter((child) => child instanceof HTMLElement && child.offsetParent !== null);
    if (children.length < 2) return [];
    const rects = children.map((child) => child.getBoundingClientRect());
    const top = Math.min(...rects.map((rect) => rect.top));
    const bottom = Math.max(...rects.map((rect) => rect.bottom));
    const tallest = Math.max(...rects.map((rect) => rect.height));
    const wrapped = bottom - top > tallest + 2;
    const overflowed = actions.scrollWidth > actions.clientWidth + 1 || head.scrollWidth > head.clientWidth + 1;
    if (!wrapped && !overflowed) return [];
    return [{
      panel: head.querySelector('.panel-title')?.textContent?.trim() || 'Unknown panel',
      wrapped,
      overflowed,
    }];
  }));
  ok(issues.length === 0, `Panel actions wrapped or overflowed at 1024px: ${JSON.stringify(issues)}`);
}

function responseFor(path, searchParams = new URLSearchParams()) {
  const windowKey = searchParams.get('window') || '1d';
  const allHistory = windowKey === 'all';
  const meta = { window: windowKey, generated_at: '2026-07-17T08:00:00Z' };
  if (path === '/v2/activity') {
    return {
      activity: [{
        query: 'database',
        library_filter: 'lucide',
        query_origin: 'agent_query',
        visitor_kind: 'anonymous',
        client_label: 'anon:abc123',
        result_count: 3,
        country_code: 'SG',
        channel: 'web',
        created_at: '2026-07-17T07:58:00Z',
      }],
      channel_counts: { all: 17, web: 10, hosted_mcp: 7 },
      meta,
    };
  }
  if (path === '/v2/overview') {
    return {
      kpis: {
        estimated_unique_clients: allHistory ? 90 : 32,
        registered_clients: 0,
        pro_clients: 0,
        anonymous_clients: 32,
        attempts: 128,
        success_count: 116,
        success_rate: 0.90625,
        searches_per_client: 4,
        true_zero_count: 8,
        true_zero_rate: 0.0625,
        low_result_count: 4,
        low_result_eligible_count: 80,
        low_result_rate: 0.05,
        client_measure: allHistory ? 'client_days' : 'estimated_unique_clients',
        identity_available: !allHistory,
        identity_unavailable_reason: allHistory ? 'Exact client profiles are unavailable for all recorded history.' : null,
      },
      series: [
        { day: '2026-07-15', channel: 'all', attempts: 40, client_days: 12, true_zero_count: 2, low_result_count: 1, low_result_eligible_count: 30, registered_clients: 3, pro_clients: 1 },
        { day: '2026-07-15', channel: 'web', attempts: 25 },
        { day: '2026-07-15', channel: 'hosted_mcp', attempts: 15 },
        { day: '2026-07-16', channel: 'all', attempts: 45, client_days: 14, true_zero_count: 4, low_result_count: 2, low_result_eligible_count: 25, registered_clients: 4, pro_clients: 1 },
        { day: '2026-07-16', channel: 'web', attempts: 30 },
        { day: '2026-07-16', channel: 'hosted_mcp', attempts: 15 },
        { day: '2026-07-17', channel: 'all', attempts: 43, client_days: 13, true_zero_count: 2, low_result_count: 1, low_result_eligible_count: 25, registered_clients: 5, pro_clients: 2 },
        { day: '2026-07-17', channel: 'web', attempts: 28 },
        { day: '2026-07-17', channel: 'hosted_mcp', attempts: 15 },
      ],
      outage_spans: [{ from: '2026-07-16T11:30:00Z', to: '2026-07-16T13:20:00Z', label: 'Outage Jul 16' }],
      top_lists: {
        searched: { available: true, rows: [{ query: 'database', searches: 18, distinct_clients: 9, hit_rate: 1 }] },
        returned: { available: false, reason: 'Web result-set linkage is incomplete.', rows: [] },
        copied: { available: true, rows: [{ icon_id: 'lucide:database', action: 'copy', actions: 7, distinct_clients: 4 }] },
        zero: { available: true, rows: [{ query: 'missing brand', count: 5, distinct_clients: 4, last_seen: '2026-07-17T07:30:00Z' }] },
      },
      geography: {
        available: true,
        coverage_rate: 0.75,
        rows: [
          { country_code: 'SG', searches: 60, distinct_clients: 14, percentage: 0.46875 },
          { country_code: 'US', searches: 36, distinct_clients: 9, percentage: 0.28125 },
          { country_code: 'Unknown', searches: 32, distinct_clients: 9, percentage: 0.25 },
        ],
      },
      meta,
    };
  }
  if (path === '/v2/search') {
    const page = Number(searchParams.get('page') || 1);
    const pageSize = Number(searchParams.get('page_size') || 25);
    const orderedQueryRows = sortedMockRows(queryRows, searchParams, {
      query: { field: 'query' },
      searches: { field: 'activity_count', type: 'number' },
      estimated_client_id_count: { field: 'estimated_client_id_count', type: 'number' },
      outcome: { field: 'outcome_label' },
      country_code: { field: 'country_code' },
      channel: { field: 'channel' },
      result_count: { field: 'result_count', type: 'number' },
      last_seen: { field: 'last_seen' },
    });
    const pageCount = Math.ceil(orderedQueryRows.length / pageSize);
    const start = (page - 1) * pageSize;
    return {
      summary: {
        table_rows: queryRows.length,
        activities: queryRows.reduce((sum, row) => sum + Number(row.activity_count || 0), 0),
      },
      queries: orderedQueryRows.slice(start, start + pageSize),
      coverage: {
        source: 'final',
        web_final_outcome_cutover_at: '2026-07-17T07:00:00Z',
        local_mcp_coverage_cutover_at: '2026-07-17T07:05:00Z',
        warnings: ['Website final-outcome coverage begins 2026-07-17T07:00:00Z. Earlier website activity is excluded.'],
      },
      pagination: {
        page,
        page_size: pageSize,
        total: orderedQueryRows.length,
        page_count: pageCount,
        sort_by: searchParams.get('sort_by'),
        sort_direction: searchParams.get('sort_direction'),
      },
      worklist_available: true,
      worklist: [{
        query: 'missing brand',
        library_filter: 'all',
        query_origin: 'agent_query',
        issue_type: 'zero_result',
        outcome_label: 'Zero',
        distinct_clients: 4,
        estimated_client_id_count: 4,
        attempt_count: 5,
        activity_count: 5,
        channel: 'hosted_mcp',
        channels: ['hosted_mcp'],
        channel_available: true,
        locale: 'zh-CN',
        locales: ['zh-CN'],
        locale_available: true,
        country_code: 'SG',
        countries: ['SG'],
        country_available: true,
        country_scope: 'selected_period',
        result_count: 0,
        typical_result_count: 0,
        result_sample_count: 5,
        result_count_available: true,
        result_unit: 'icon',
      }],
      icon_requests: {
        available: true,
        status_available: true,
        rows: [
          {
            id: '11111111-1111-4111-8111-111111111111',
            request_text: 'A better database migration icon',
            failed_query: 'database migration',
            library_filter: 'all',
            reviewed: iconRequestReviews.has('11111111-1111-4111-8111-111111111111'),
            status: iconRequestReviews.get('11111111-1111-4111-8111-111111111111')?.status || 'new',
            review_note: iconRequestReviews.get('11111111-1111-4111-8111-111111111111')?.note || null,
            created_at: '2026-07-17T06:00:00Z',
          },
          {
            id: '22222222-2222-4222-8222-222222222222',
            request_text: 'A clearer electric pickup truck icon',
            failed_query: 'electric pickup truck',
            library_filter: 'phosphor',
            reviewed: true,
            status: iconRequestReviews.get('22222222-2222-4222-8222-222222222222')?.status || 'new',
            review_note: iconRequestReviews.get('22222222-2222-4222-8222-222222222222')?.note || null,
            created_at: '2026-07-17T05:30:00Z',
          },
        ],
      },
      contact_submissions: {
        available: true,
        rows: [{
          name: 'Product team',
          email: 'team@example.test',
          interest: 'Licensing',
          message: 'Need an icon license for an app.',
          created_at: '2026-07-17T05:00:00Z',
        }],
      },
      diagnostics: {
        known_defects: 2,
        query_review_available: true,
        raw_access: 'available through API export',
      },
      meta,
    };
  }
  if (path === '/v2/search/events') {
    const eventScope = searchParams.get('event_scope') || 'primary';
    const scopedEventRows = eventScope === 'audit'
      ? eventRows
      : eventRows.filter((row) => row.event_role === 'top_level');
    const page = Number(searchParams.get('page') || 1);
    const pageSize = Number(searchParams.get('page_size') || 25);
    const pageCount = Math.ceil(scopedEventRows.length / pageSize);
    const start = (page - 1) * pageSize;
    const snapshotId = `event-snapshot-${eventScope}`;
    if (page > 1 && searchParams.get('snapshot_id') !== snapshotId) {
      return { error: 'The event export snapshot was not preserved.' };
    }
    return {
      events: scopedEventRows.slice(start, start + pageSize),
      events_complete: true,
      events_export_available: true,
      snapshot_id: snapshotId,
      event_scope: eventScope,
      event_counts: {
        top_level: eventRows.filter((row) => row.event_role === 'top_level').length,
        web_top_level: eventRows.filter((row) => row.event_role === 'web_top_level').length,
        diagnostics: eventRows.filter((row) => row.event_role === 'diagnostic').length,
      },
      pagination: {
        page,
        page_size: pageSize,
        total: scopedEventRows.length,
        page_count: pageCount,
      },
      field_coverage: {
        locale: { recorded: 0, total: scopedEventRows.length, rate: 0 },
        returned_icon_refs: { recorded: scopedEventRows.length - 1, total: scopedEventRows.length, rate: 0.9905 },
      },
      definitions: {
        grain: 'One deduplicated event.',
        null_values: 'Null means the field was not recorded.',
      },
      source_reconciliation: {
        status: 'passed',
        cutoff_at: '2026-07-17T08:00:00Z',
        grace_seconds: 120,
        product_source_rows: 105,
        diagnostic_source_rows: 2,
        linked_product_rows: 105,
        linked_diagnostic_rows: 1,
        explained_direct_gateway_diagnostics: 1,
        pending_rows: 0,
        unexplained_rows: 0,
        source_complete: true,
      },
      meta,
    };
  }
  if (path === '/v2/audience') {
    const page = Number(searchParams.get('page') || 1);
    const pageSize = Number(searchParams.get('page_size') || 25);
    const orderedClientRows = sortedMockRows(clientRows, searchParams, {
      searcher: { field: 'client_label' },
      plan: { field: 'plan' },
      country_code: { field: 'country_code' },
      first_seen: { field: 'first_seen' },
      last_seen: { field: 'last_seen' },
      searches: { field: 'searches', type: 'number' },
      top_query: { field: 'top_query' },
    });
    const pageCount = Math.ceil(orderedClientRows.length / pageSize);
    const start = (page - 1) * pageSize;
    return {
      funnel: {
        unique_clients: allHistory ? 90 : 32,
        registered_clients: 0,
        registered_percentage: 0,
        pro_clients: 0,
        pro_percentage: 0,
        client_measure: allHistory ? 'client_days' : 'estimated_unique_clients',
        identity_available: !allHistory,
        identity_unavailable_reason: allHistory ? 'Exact client profiles are unavailable for all recorded history.' : null,
        mrr: { available: false, reason: 'Exact billing price is not linked to every active subscription.' },
      },
      series: [
        { day: '2026-07-15', channel: 'all', client_days: 12, registered_clients: 3, pro_clients: 1 },
        { day: '2026-07-16', channel: 'all', client_days: 14, registered_clients: 4, pro_clients: 1 },
        { day: '2026-07-17', channel: 'all', client_days: 13, registered_clients: 5, pro_clients: 2 },
      ],
      registered_users: {
        available: true,
        total: 23,
        rows: registeredRows,
      },
      clients: allHistory ? {
        available: false,
        reason: 'Exact client profiles exceed the bounded identity-row limit for this period. Choose a shorter date range.',
        rows: [],
      } : {
        available: true,
        rows: orderedClientRows.slice(start, start + pageSize),
      },
      pagination: {
        page,
        page_size: pageSize,
        total: orderedClientRows.length,
        page_count: pageCount,
        sort_by: searchParams.get('sort_by'),
        sort_direction: searchParams.get('sort_direction'),
      },
      meta,
    };
  }
  if (path === '/users') {
    return {
      users: accountRows,
      pagination: {
        page: 1,
        page_size: 25,
        total: accountRows.length,
        page_count: 1,
      },
    };
  }
  return { error: `No mock for ${path}` };
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1024, height: 1000 } });
await page.addInitScript(({ base }) => {
  window.__SI_ADMIN_RUNTIME__ = Object.freeze({
    apiBase: base,
    managedAuth: false,
    autoRefreshMs: 100,
  });
}, { base: apiBase });

await page.route(`${apiBase}/**`, async (route) => {
  const url = new URL(route.request().url());
  const path = url.pathname.replace('/functions/v1/admin-api', '');
  if (route.request().method() === 'POST') {
    const body = route.request().postDataJSON();
    writes.push({ path, body });
    if (path === '/v2/icon-requests/review') {
      iconRequestReviews.set(body.icon_evidence_id, {
        status: body.status,
        note: body.note,
      });
    }
    await route.fulfill({
      status: 200,
      headers: { 'access-control-allow-origin': '*' },
      json: {
        success: true,
        review: path.includes('icon-requests')
          ? { icon_evidence_id: body.icon_evidence_id, status: body.status, note: body.note }
          : { normalized_query: body.query, status: body.status },
      },
    });
    return;
  }
  requests.push({ path, search: url.search });
  requestRound += 1;
  if (requestRound > 4) await new Promise((resolve) => setTimeout(resolve, 450));
  const payload = responseFor(path, url.searchParams);
  if (payload?.meta) {
    payload.meta = {
      ...payload.meta,
      view_id: url.searchParams.get('view_id'),
      data_cutoff: url.searchParams.get('data_cutoff'),
      filter_key: url.searchParams.get('filter_key'),
    };
  }
  await route.fulfill({
    status: payload.error ? 404 : 200,
    headers: { 'access-control-allow-origin': '*' },
    json: payload,
  });
});

try {
  await page.goto(server.url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  ok(await page.locator('#adminSecretModal').getAttribute('role') === 'dialog', 'The admin access prompt has no dialog role.');
  ok(await page.locator('#adminSecretModal').getAttribute('aria-modal') === 'true', 'The admin access prompt is not modal.');
  await page.waitForFunction(() => document.activeElement?.id === 'adminSecretInput');
  await page.focus('#adminSecretSubmitBtn');
  await page.keyboard.press('Tab');
  ok(await page.evaluate(() => document.activeElement?.id === 'adminSecretInput'), 'Tab escaped the admin access dialog.');
  await page.fill('#adminSecretInput', 'mock-secret');
  await page.click('#adminSecretSubmitBtn');
  await page.waitForFunction(() => document.querySelector('#kpiClients')?.textContent === '32');
  const initialV2Requests = requests.filter((request) => request.path.startsWith('/v2/')).slice(0, 4);
  for (const field of ['view_id', 'data_cutoff', 'filter_key']) {
    const values = new Set(initialV2Requests.map((request) => new URLSearchParams(request.search).get(field)));
    ok(values.size === 1 && !values.has(null), `Initial v2 requests do not share one ${field}.`);
  }

  ok(await page.locator('.nav-button').count() === 3, 'The dashboard must have exactly three navigation sections.');
  const unnamedControls = await page.locator('button, input, select').evaluateAll((elements) => elements.flatMap((element) => {
    if (!(element instanceof HTMLElement) || element.offsetParent === null) return [];
    const label = element.getAttribute('aria-label')
      || element.getAttribute('title')
      || element.textContent?.trim()
      || element.closest('label')?.textContent?.trim();
    return label ? [] : [element.outerHTML.slice(0, 120)];
  }));
  ok(unnamedControls.length === 0, `Visible controls lack accessible names: ${JSON.stringify(unnamedControls)}`);
  ok(
    await page.locator('[data-window="1d"]').getAttribute('aria-pressed') === 'true',
    'The dashboard does not start with the 24-hour period selected.',
  );
  ok(
    initialV2Requests.every((request) => new URLSearchParams(request.search).get('window') === '1d'),
    'The initial dashboard requests do not use the 24-hour period.',
  );
  const unfocusableScrollRegions = await page.locator('.scroll-region').evaluateAll(
    (regions) => regions.filter((region) => region.tabIndex < 0).map((region) => region.id || region.className),
  );
  ok(unfocusableScrollRegions.length === 0, `Scroll regions are not keyboard reachable: ${unfocusableScrollRegions.join(', ')}`);
  ok(await page.getByText('Stats', { exact: true }).count() === 0, 'The Stats section still exists.');
  ok(await page.getByText('Audit Log', { exact: true }).count() === 0, 'The Audit Log section still exists.');
  ok(await page.locator('#kpiSearches').innerText() === '128', 'Real search KPI is incorrect.');
  ok(await page.locator('#kpiZero').innerText() === '6%', 'True zero KPI is incorrect.');
  ok(await page.locator('#kpiLow').innerText() === '5%', 'Low-result KPI is incorrect.');
  const reachNote = await page.locator('#kpiClientsNote').innerText();
  ok(reachNote === '', 'Estimated reach repeats its visible scope in a note.');
  ok(!reachNote.includes('registered'), 'The filtered reach card mixes in all-time registered-account totals.');
  ok(!reachNote.includes('Pro'), 'The filtered reach card mixes in all-time Pro-account totals.');
  await assertPanelActionsStayOnOneLine(page, '#section-overview:not([hidden])');

  const activity = await page.locator('#latestActivity').innerText();
  ok(activity.includes('database'), 'Latest Activity did not render the live query.');
  ok(activity.includes('User query'), 'Latest Activity did not use the approved origin wording.');
  ok(activity.includes('SG'), 'Latest Activity did not render the country.');

  const channelOptions = await page.locator('#channelFilter option').allTextContents();
  ok(channelOptions.some((value) => value.includes('Web (10)')), 'The venue selector does not show live counts.');
  ok(channelOptions.some((value) => value === 'Local MCP (0)'), 'The stable venue selector hides Local MCP when its count is zero.');
  ok(channelOptions.every((value) => !value.startsWith('CLI')), 'The venue selector advertises an unused CLI venue.');
  ok(channelOptions.every((value) => !value.startsWith('API')), 'The venue selector advertises an unused API venue.');
  ok(await page.locator('#searchesChart svg').count() === 1, 'The search chart did not render inline SVG.');
  await page.click('[data-search-chart-mode="total"]');
  ok(await page.locator('[data-search-chart-mode="total"]').getAttribute('aria-pressed') === 'true', 'The total search chart mode was not selected.');
  ok((await page.locator('#searchesChart').innerText()).includes('Total'), 'The total search chart legend is missing.');
  await page.click('[data-search-chart-mode="venue"]');
  ok(await page.locator('#qualityChart').innerText().then((text) => !text.includes('No chart')), 'The quality chart did not render.');
  const chartFontSizes = await page.locator('#section-overview .chart svg text').evaluateAll(
    (nodes) => nodes.map((node) => {
      const svg = node.ownerSVGElement;
      const scale = svg.getBoundingClientRect().width / svg.viewBox.baseVal.width;
      return Number(node.getAttribute('font-size')) * scale;
    }),
  );
  ok(chartFontSizes.length > 0, 'The charts did not render any readable labels.');
  ok(chartFontSizes.every((size) => Number.isFinite(size) && size >= 12), 'A rendered chart label is smaller than 12px.');

  await page.click('[data-top-list="returned"]');
  ok((await page.locator('#topListTable').innerText()).includes('linkage is incomplete'), 'Returned-icon coverage was not explained.');
  await page.click('[data-top-list="copied"]');
  ok((await page.locator('#topListTable').innerText()).includes('lucide:database'), 'Copied icons did not render.');
  await page.click('[data-top-list="zero"]');
  await page.click('[data-open-worklist="missing brand"]');
  await page.waitForSelector('#section-intelligence:not([hidden])');
  ok(await page.locator('#explorerSearch').inputValue() === 'missing brand', 'Top zero did not open the matching worklist query.');
  await page.waitForFunction(() => (
    document.querySelector('#queryExplorer tbody tr')
      && document.querySelector('#refreshButton')?.getAttribute('aria-busy') === 'false'
  ));

  await page.click('#nav-intelligence');
  await page.waitForSelector('#section-intelligence:not([hidden])');
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.evaluate(() => window.scrollTo(0, 0));
  const compactLayout = await page.evaluate(() => {
    const box = (selector) => document.querySelector(selector)?.getBoundingClientRect();
    const topbarElement = document.querySelector('.topbar');
    const filterElement = document.querySelector('.filter-bar');
    const topbar = box('.topbar');
    const filter = box('.filter-bar');
    const pagination = box('[data-pagination="queries"]');
    return {
      topbarHeight: topbar?.height,
      filterHeight: filter?.height,
      filterBorderWidth: filterElement ? getComputedStyle(filterElement).borderTopWidth : null,
      filterBackground: filterElement ? getComputedStyle(filterElement).backgroundColor : null,
      topbarBorderWidth: topbarElement ? getComputedStyle(topbarElement).borderBottomWidth : null,
      redundantHeadingCount: document.querySelectorAll('#section-intelligence .section-head').length,
      paginationBottom: pagination?.bottom,
      paginationTop: pagination?.top,
      viewportHeight: window.innerHeight,
    };
  });
  ok(compactLayout.topbarHeight <= 110, `The combined header band is too tall at ${compactLayout.topbarHeight}px.`);
  ok(compactLayout.filterHeight === undefined, 'The standalone filter bar must not exist; filters live inside the header band.');
  ok(compactLayout.topbarBorderWidth === '1px', 'The header band must end with its single divider line.');
  ok(compactLayout.redundantHeadingCount === 0, 'The redundant Search Intelligence heading still exists.');
  ok(await page.locator('.panel[data-row-key="worklist"]').isVisible(), 'Gaps is not visible on the Searches page.');
  ok(await page.locator('.panel[data-row-key="iconRequests"]').isVisible(), 'User requests is not visible on the Searches page.');
  await assertPanelActionsStayOnOneLine(page, '#section-intelligence:not([hidden])');
  ok(await page.locator('[data-row-limit]').count() === 7, 'Every visible long list must have a row display control.');
  ok(
    await page.locator('[data-panel-toggle]').count()
      === await page.locator('.panel:not([data-panel-collapse="false"])').count(),
    'Every collapsible dashboard panel must have a collapse control.',
  );
  const initialRowLimits = await page.locator('[data-row-limit]').evaluateAll(
    (selects) => selects.map((select) => select.value),
  );
  ok(initialRowLimits.every((value) => value === '25'), 'Long lists must show 25 rows by default.');
  for (const key of ['topList', 'activity', 'queries', 'worklist', 'iconRequests', 'registeredUsers', 'clients']) {
    ok(
      await page.locator(`.panel[data-row-key="${key}"] [data-row-limit="${key}"]`).count() === 1,
      `The ${key} row control is attached to the wrong panel.`,
    );
  }
  ok(await page.locator('#queryExplorer tbody tr').count() === 25, 'The query explorer did not apply the 25-row default.');
  ok(await page.locator('[data-pagination="queries"] [data-page-number="1"]').count() === 1, 'Query page 1 is missing.');
  ok(await page.locator('[data-pagination="queries"] [data-page-number="2"]').count() === 1, 'Query page 2 is missing.');
  ok(await page.locator('[data-pagination="queries"] [data-page-number="3"]').count() === 1, 'Query page 3 is missing.');
  ok(await page.locator('[data-pagination="queries"] [data-page-next]').count() === 1, 'The query Next button is missing.');
  const querySortRequest = page.waitForRequest((request) => {
    if (!request.url().includes('/functions/v1/admin-api/v2/search')) return false;
    const params = new URL(request.url()).searchParams;
    return params.get('sort_by') === 'searches' && params.get('sort_direction') === 'desc';
  });
  await page.click('[data-sort-table="queries"][data-sort-key="searches"]');
  await querySortRequest;
  await page.waitForFunction(() => document.querySelector('#refreshButton')?.getAttribute('aria-busy') === 'false');
  ok(
    (await page.locator('#queryExplorer tbody tr').first().innerText()).includes('healthy query 55'),
    'Search history did not apply full-dataset server sorting.',
  );
  const ascendingQuerySortRequest = page.waitForRequest((request) => {
    if (!request.url().includes('/functions/v1/admin-api/v2/search')) return false;
    const params = new URL(request.url()).searchParams;
    return params.get('sort_by') === 'searches' && params.get('sort_direction') === 'asc';
  });
  await page.click('[data-sort-table="queries"][data-sort-key="searches"]');
  await ascendingQuerySortRequest;
  await page.waitForFunction(() => document.querySelector('#refreshButton')?.getAttribute('aria-busy') === 'false');
  await page.click('[data-pagination="queries"] [data-page-number="2"]');
  await page.waitForFunction(() => document.querySelector('[data-pagination="queries"] [aria-current="page"]')?.textContent === '2');
  ok(requests.some((request) => request.path === '/v2/search' && request.search.includes('page=2') && request.search.includes('page_size=25')), 'Query page 2 was not requested from the API.');
  await page.click('[data-pagination="queries"] [data-page-number="1"]');
  await page.waitForFunction(() => document.querySelector('[data-pagination="queries"] [aria-current="page"]')?.textContent === '1');
  await page.selectOption('[data-row-limit="queries"]', '50');
  await page.waitForFunction(() => document.querySelectorAll('#queryExplorer tbody tr').length === 50);
  ok(requests.some((request) => request.path === '/v2/search' && request.search.includes('page_size=50')), 'The 50-row query page was not requested from the API.');
  const unrelatedBeforeExplorerFilter = requests.filter((request) => request.path !== '/v2/search').length;
  const filteredSearchRequest = page.waitForRequest((request) => (
    request.url().includes('/functions/v1/admin-api/v2/search')
    && new URL(request.url()).searchParams.get('q')?.includes('healthy')
  ));
  await page.fill('#explorerSearch', 'healthy');
  await filteredSearchRequest;
  await page.waitForFunction(() => document.querySelector('#refreshButton')?.getAttribute('aria-busy') === 'false');
  ok(
    requests.filter((request) => request.path !== '/v2/search').length === unrelatedBeforeExplorerFilter,
    'Explorer filtering reloaded an unrelated dashboard endpoint.',
  );
  const clearedSearchRequest = page.waitForRequest((request) => (
    request.url().includes('/functions/v1/admin-api/v2/search')
    && !new URL(request.url()).searchParams.get('q')
  ));
  await page.fill('#explorerSearch', '');
  await clearedSearchRequest;
  await page.waitForFunction(() => document.querySelector('#refreshButton')?.getAttribute('aria-busy') === 'false');
  const scrollStyle = await page.locator('#queryExplorer').evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      maxHeight: style.maxHeight,
      overflowY: style.overflowY,
      scrollbarWidth: style.scrollbarWidth,
      height: element.getBoundingClientRect().height,
      panelHeight: element.closest('.panel')?.getBoundingClientRect().height,
    };
  });
  ok(
    scrollStyle.maxHeight !== 'none' || scrollStyle.height < scrollStyle.panelHeight,
    'The query explorer height is not bounded.',
  );
  ok(scrollStyle.overflowY === 'auto', 'The query explorer does not scroll vertically.');
  ok(scrollStyle.scrollbarWidth === 'none', 'The query explorer shows a vertical scrollbar.');
  const queryPanel = page.locator('.panel[data-row-key="queries"]');
  ok(await queryPanel.locator('[data-panel-toggle]').count() === 0, 'Search history still has an unrelated panel collapse control.');
  ok(await page.locator('[data-panel-toggle] svg').count() === await page.locator('[data-panel-toggle]').count(), 'Collapse controls must use icons.');
  const toggleLabels = await page.locator('[data-panel-toggle]').evaluateAll((buttons) => buttons.map((button) => button.textContent.trim()));
  ok(toggleLabels.every((label) => label === ''), 'Collapse controls still waste space on text labels.');
  ok(await page.locator('.panel[data-row-key="worklist"]').count() === 1, 'Gaps is missing or duplicated.');
  ok(await page.locator('.panel[data-row-key="worklist"] .panel-title').innerText() === 'Gaps', 'Gaps uses the wrong title.');
  const searchPanelOrder = await page.locator('#section-intelligence > .panel').evaluateAll((panels) => (
    panels.map((panel) => panel.getAttribute('data-row-key'))
  ));
  ok(
    searchPanelOrder.indexOf('queries') < searchPanelOrder.indexOf('worklist')
      && searchPanelOrder.indexOf('worklist') < searchPanelOrder.indexOf('iconRequests'),
    `Search history, Gaps, and User requests are in the wrong order: ${JSON.stringify(searchPanelOrder)}`,
  );
  const demandHeaders = await page.locator('#gapWorklist th').evaluateAll((headers) => (
    headers.map((header) => header.textContent.replace(/\s+/g, ' ').trim())
  ));
  ok(
    JSON.stringify(demandHeaders) === JSON.stringify([
      'Query',
      'Issue',
      'Channel',
      'Language',
      'Country',
      'Result count',
      'Searches',
      'Last seen',
      'Action',
    ]),
    `Gaps columns are wrong: ${JSON.stringify(demandHeaders)}`,
  );
  const demandText = await page.locator('#gapWorklist').innerText();
  for (const expected of ['missing brand', 'Hosted MCP', 'zh-CN', 'SG', '0 icons', '5']) {
    ok(demandText.includes(expected), `Gaps did not show ${expected}.`);
  }
  const demandAction = page.locator('#gapWorklist [data-query-review]').first();
  const demandOptions = await demandAction.locator('option').allTextContents();
  ok(
    JSON.stringify(demandOptions) === JSON.stringify([
      'Choose action',
      'Add icon',
      'Add alias',
      'Improve ranking',
      'Improve docs',
      'Watch',
      'Resolved',
      'Ignore',
    ]),
    `Gaps actions are wrong: ${JSON.stringify(demandOptions)}`,
  );
  const actionWrite = page.waitForResponse((response) => (
    response.request().method() === 'POST'
    && response.url().includes('/functions/v1/admin-api/v2/search/review')
  ));
  await demandAction.selectOption('add_alias');
  await actionWrite;
  const savedAction = writes.findLast((write) => write.path === '/v2/search/review');
  ok(savedAction?.body?.status === 'add_alias', 'Gaps did not save the selected action.');
  ok(savedAction?.body?.query === 'missing brand', 'Gaps saved the action against the wrong query.');
  const requestHeaders = await page.locator('#iconRequests th').evaluateAll((headers) => (
    headers.map((header) => header.textContent.replace(/\s+/g, ' ').trim())
  ));
  ok(
    JSON.stringify(requestHeaders) === JSON.stringify(['User request', 'Submitted', 'Review']),
    `User requests columns are wrong: ${JSON.stringify(requestHeaders)}`,
  );
  const requestRows = page.locator('#iconRequests tbody tr');
  ok(await requestRows.count() === 2, 'User requests did not render both stored requests.');
  const firstRequestText = await requestRows.first().innerText();
  for (const expected of ['A better database migration icon', 'Failed query: database migration', 'Library: all']) {
    ok(firstRequestText.includes(expected), `User requests did not show ${expected}.`);
  }
  ok(
    await requestRows.first().locator('[data-icon-request-status]').inputValue() === 'new',
    'The unreviewed user request is not first.',
  );
  await requestRows.first().locator('[data-icon-request-status]').selectOption('planned');
  await requestRows.first().locator('[data-icon-request-note]').fill('Add to the next database set.');
  const requestWrite = page.waitForResponse((response) => (
    response.request().method() === 'POST'
      && response.url().includes('/functions/v1/admin-api/v2/icon-requests/review')
  ));
  await requestRows.first().locator('[data-icon-request-save]').click();
  await requestWrite;
  await page.waitForFunction(() => (
    document.querySelector('#iconRequests [data-icon-request-status]')?.value === 'planned'
      && document.querySelector('#iconRequests [data-icon-request-note]')?.value === 'Add to the next database set.'
  ));
  const savedRequest = writes.findLast((write) => write.path === '/v2/icon-requests/review');
  ok(savedRequest?.body?.status === 'planned', 'User requests did not save the selected status.');
  ok(savedRequest?.body?.note === 'Add to the next database set.', 'User requests did not save the review note.');
  ok(
    savedRequest?.body?.icon_evidence_id === '11111111-1111-4111-8111-111111111111',
    'User requests saved the review against the wrong evidence row.',
  );
  ok(await page.locator('.panel[data-row-key="contact"]').count() === 0, 'The removed contact panel still takes up Search history space.');
  ok((await page.locator('#queryExplorer').innerText()).includes('missing brand'), 'The single query explorer did not render.');
  ok(await page.locator('.panel[data-row-key="queries"] .panel-title').innerText() === 'Search history', 'The query summary table is not labelled Search history.');
  ok(await page.locator('#searchDataGuide').count() === 0, 'The old data guide still takes up table space.');
  const historySubtitle = await page.locator('#searchHistorySubtitle').innerText();
  ok(historySubtitle.includes('One row per unique query. For quick analysis.'), 'Search history does not use the approved summary description.');
  ok(historySubtitle.includes(`${queryRows.length} rows`), 'Search history does not show its exact summary row count.');
  ok(historySubtitle.includes('searches'), 'Search history does not show its exact search count.');
  ok(historySubtitle.includes('test traffic excluded'), 'Search history does not state its default test-traffic scope.');
  ok(!(await queryPanel.innerText()).includes('Filters: zero:true'), 'Search history still shows hardcoded filter claims.');
  ok(await queryPanel.getByText('Advanced', { exact: true }).count() === 0, 'Search history still has a duplicate Advanced control.');
  const tableBoxBeforeMenu = await page.locator('#queryExplorer').boundingBox();
  ok(await page.locator('[data-export="search-summary-csv"]').count() === 1, 'The Search summary action is missing or duplicated.');
  ok(await page.locator('[data-export="search-summary-csv"]').innerText() === 'Search summary', 'The primary download does not use the approved label.');
  await page.click('#searchDownloadToggle');
  ok(await page.locator('#searchDownloadPopover').isVisible(), 'The download menu did not open.');
  ok(await page.locator('#searchDownloadPopover [role="menuitem"]').count() === 2, 'The download menu does not have exactly two alternative exports.');
  ok(await page.getByText('Request log', { exact: true }).count() === 1, 'The request export does not use the approved label.');
  ok(await page.getByText('Audit bundle', { exact: true }).count() === 1, 'The audit export does not use the approved label.');
  ok(await page.getByText('One row per tool call. Ground truth.', { exact: true }).count() === 1, 'The Request log description is wrong.');
  ok(await page.getByText('Everything plus integrity checks. For verification.', { exact: true }).count() === 1, 'The Audit bundle description is wrong.');
  ok(await page.getByText('Table CSV', { exact: true }).count() === 0, 'The old ambiguous Table CSV label is still visible.');
  const tableBoxWithMenu = await page.locator('#queryExplorer').boundingBox();
  ok(
    Math.abs(tableBoxBeforeMenu.x - tableBoxWithMenu.x) < 1
      && Math.abs(tableBoxBeforeMenu.width - tableBoxWithMenu.width) < 1,
    'Opening downloads moved or narrowed the main table.',
  );
  await page.click('#searchDownloadToggle');
  ok(!(await page.locator('#searchDownloadPopover').isVisible()), 'The download menu did not close.');
  const includeTestRequest = page.waitForRequest((request) => (
    request.url().includes('/functions/v1/admin-api/v2/search')
    && new URL(request.url()).searchParams.get('include_test') === 'true'
  ));
  await page.check('#includeSearchTestTraffic');
  const includedTestTrafficRequest = await includeTestRequest;
  await page.waitForFunction(() => document.querySelector('#refreshButton')?.getAttribute('aria-busy') === 'false');
  ok(
    new URL(includedTestTrafficRequest.url()).searchParams.get('filter_key')?.includes('include_test=true'),
    'The included test-traffic request carries the wrong filter key.',
  );
  ok((await page.locator('#searchHistorySubtitle').innerText()).includes('test traffic included'), 'Search history did not update its test-traffic scope.');
  ok((await page.locator('#gapsSubtitle').innerText()).includes('test traffic included'), 'Gaps did not update its test-traffic scope.');
  ok((await page.locator('#userRequestsSubtitle').innerText()).includes('test traffic included'), 'User requests did not update its test-traffic scope.');
  await page.click('#searchDownloadToggle');
  const includedTestAuditDownload = page.waitForEvent('download');
  await page.click('[data-export="audit-bundle-json"]');
  const includedTestAudit = await includedTestAuditDownload;
  const includedTestAuditPath = await includedTestAudit.path();
  const includedTestAuditPayload = JSON.parse(await readFile(includedTestAuditPath, 'utf8'));
  ok(includedTestAuditPayload.filters.include_test === true, 'The included test-traffic export reports the wrong filter.');
  ok(
    includedTestAuditPayload.source_meta.filter_key.includes('include_test=true'),
    'The included test-traffic export source metadata reports the wrong filter key.',
  );
  const excludeTestRequest = page.waitForRequest((request) => (
    request.url().includes('/functions/v1/admin-api/v2/search')
    && new URL(request.url()).searchParams.get('include_test') === 'false'
  ));
  await page.uncheck('#includeSearchTestTraffic');
  await excludeTestRequest;
  await page.waitForFunction(() => document.querySelector('#refreshButton')?.getAttribute('aria-busy') === 'false');
  const queryHeaders = await page.locator('#queryExplorer th').evaluateAll((headers) => (
    headers.map((header) => header.textContent.replace(/\s+/g, ' ').trim())
  ));
  ok(queryHeaders.includes('Searches'), 'Search history does not show recorded searches.');
  ok(queryHeaders.includes('Est. client IDs'), 'Search history does not show estimated client IDs.');
  ok(queryHeaders.includes('Typical result'), 'Search history does not show its typical result.');
  ok(!queryHeaders.includes('Searcher'), 'Search history still exposes the old per-searcher grain.');
  const varyingRows = page.locator('#queryExplorer tbody tr').filter({ hasText: 'varying results' });
  ok(await varyingRows.count() === 1, 'The same query, library, and origin was not combined into one summary row.');
  const firstVaryingRow = varyingRows.first();
  ok((await firstVaryingRow.innerText()).includes('4'), 'The combined summary does not show its search count.');
  ok((await firstVaryingRow.innerText()).includes('5 icons'), 'The combined summary does not show its median result count.');
  ok(await queryPanel.locator('[data-searcher-details]').count() === 0, 'Search history still has unnecessary row-detail controls.');
  ok(!(await firstVaryingRow.innerText()).includes('min'), 'A grouped result range still uses the ambiguous minimum label.');
  const healthyRow = page.locator('#queryExplorer tbody tr').filter({ hasText: 'healthy aggregate' });
  ok((await healthyRow.innerText()).includes('Success'), 'A healthy aggregate query was not labelled Success.');
  ok((await healthyRow.innerText()).includes('3 icons'), 'The typical result was hidden from the query summary.');
  ok((await healthyRow.innerText()).includes('US'), 'The exact current-day country was hidden from the grouped query row.');
  const mixedRow = page.locator('#queryExplorer tbody tr').filter({ hasText: 'mixed aggregate' });
  ok((await mixedRow.innerText()).includes('Mixed: 4 success, 1 zero'), 'A mixed aggregate query was mislabelled.');
  const iconLookupRow = page.locator('#queryExplorer tbody tr').filter({
    has: page.getByText('icon lookup', { exact: true }),
  });
  ok((await iconLookupRow.innerText()).includes('Success'), 'A successful icon lookup did not render as Success.');
  ok(!(await iconLookupRow.innerText()).includes('Zero'), 'An icon lookup rendered a false Zero pill.');
  ok((await iconLookupRow.innerText()).includes('1'), 'A successful icon lookup did not render its activity count.');
  ok((await iconLookupRow.innerText()).includes('1 icon found'), 'A successful icon lookup did not identify the found icon.');
  const missingLookupRow = page.locator('#queryExplorer tbody tr').filter({
    has: page.getByText('icon lookup missing', { exact: true }),
  });
  ok((await missingLookupRow.innerText()).includes('Icon not found'), 'A failed icon lookup did not explain that the icon was not found.');
  const recommendationRow = page.locator('#queryExplorer tbody tr').filter({
    has: page.getByText('recommendation request', { exact: true }),
  });
  ok((await recommendationRow.innerText()).includes('8 recommendations'), 'A recommendation request did not use the approved returned-result wording.');
  const approximateLowRow = page.locator('#queryExplorer tbody tr').filter({
    has: page.getByText('approximate low results', { exact: true }),
  });
  ok((await approximateLowRow.innerText()).includes('Low'), 'Approximate-low results were not shown as Low.');
  ok(!(await approximateLowRow.innerText()).includes('Success'), 'Approximate-low results were shown as Success.');
  const searchHistoryPanelText = await queryPanel.innerText();
  ok(
    searchHistoryPanelText.includes('Website final-outcome coverage begins'),
    `The independent Web cutover warning is not visible above Search history: ${searchHistoryPanelText.slice(0, 300)}`,
  );
  await mkdir('output/playwright', { recursive: true });
  await page.screenshot({
    path: 'output/playwright/admin-search-data-integrity.png',
    fullPage: true,
  });
  const pendingLookupRow = page.locator('#queryExplorer tbody tr').filter({
    has: page.getByText('icon lookup pending', { exact: true }),
  });
  ok((await pendingLookupRow.innerText()).includes('Lookup'), 'An unavailable icon lookup did not render an honest lookup state.');
  ok(!(await pendingLookupRow.innerText()).includes('Zero'), 'An unavailable icon lookup rendered a false Zero pill.');
  ok((await pendingLookupRow.innerText()).includes('Not available for this view'), 'The unavailable icon lookup result state was not explained.');
  ok(await page.locator('#autoRefresh').count() === 1, 'The 30-second auto-refresh option is missing.');
  ok(!(await page.locator('#autoRefresh').isChecked()), 'Auto-refresh must be off until the operator enables it.');
  const autoRefreshRequest = page.waitForRequest((request) => (
    request.url().includes('/functions/v1/admin-api/v2/overview')
  ));
  await page.check('#autoRefresh');
  await autoRefreshRequest;
  await page.uncheck('#autoRefresh');
  await page.waitForFunction(() => document.querySelector('#refreshButton')?.getAttribute('aria-busy') === 'false');
  const queryDownload = page.waitForEvent('download');
  await page.click('[data-export="search-summary-csv"]');
  const queryExport = await queryDownload;
  const queryExportPath = await queryExport.path();
  const queryExportText = await readFile(queryExportPath, 'utf8');
  ok(
    /^supericons-search-summary-24h-\d{8}T\d{6}Z\.csv$/.test(queryExport.suggestedFilename()),
    'The Search summary filename does not identify its data, period, and generation time.',
  );
  ok(queryExportText.split(/\r?\n/).filter(Boolean).length === queryRows.length + 1, 'The query export contains only the visible page.');
  ok(queryExportText.split(/\r?\n/, 1)[0].split(',').length === 20, 'The Search summary CSV is not the approved 20-column schema.');
  ok(queryExportText.includes("\"'=SUM(1,1)\""), 'The query CSV leaves a spreadsheet formula active.');
  for (const column of ['"query"', '"library_filter"', '"query_origin"', '"searches"', '"lookups"', '"distinct_searcher_ids"', '"outcome"', '"success_count"', '"typical_result_count"', '"result_unit"', '"country_codes"', '"interface_locales"', '"channel"', '"last_seen_utc"']) {
    ok(queryExportText.includes(column), `The Search summary CSV omits ${column}.`);
  }
  for (const column of ['"searcher_identifier"', '"searcher_kind"', '"job_category"', '"row_grain"', '"export_type"']) {
    ok(!queryExportText.includes(column), `The Search summary CSV still contains unnecessary ${column}.`);
  }
  const queryExportLines = queryExportText.split(/\r?\n/).filter(Boolean);
  const queryExportHeaders = queryExportLines[0].split(',').map((value) => value.replaceAll('"', ''));
  const approximateLowExportLine = queryExportLines.find((line) => line.includes('"approximate low results"'));
  ok(Boolean(approximateLowExportLine), 'The Search summary CSV omits the approximate-low row.');
  const approximateLowExportCells = approximateLowExportLine.split(',').map((value) => value.replaceAll('"', ''));
  ok(
    approximateLowExportCells[queryExportHeaders.indexOf('outcome')] === 'Low',
    'The Search summary CSV labels approximate-low results incorrectly.',
  );
  ok(
    Number(approximateLowExportCells[queryExportHeaders.indexOf('low_count')]) === 2,
    'The Search summary CSV omits approximate-low requests from low_count.',
  );
  for (const key of ['request-log-csv', 'audit-bundle-json']) {
    ok(await page.locator(`[data-export="${key}"]`).count() === 1, `${key} is missing.`);
  }
  ok(await page.locator('[data-export="queries-json"], [data-export="query-events-json"]').count() === 0, 'Old duplicate JSON download controls are still visible.');
  const primaryEventRows = eventRows.filter((row) => row.event_role === 'top_level');
  await page.click('#searchDownloadToggle');
  const eventCsvDownload = page.waitForEvent('download');
  await page.click('[data-export="request-log-csv"]');
  const eventCsv = await eventCsvDownload;
  const eventCsvPath = await eventCsv.path();
  const eventCsvText = await readFile(eventCsvPath, 'utf8');
  ok(
    /^supericons-request-log-24h-\d{8}T\d{6}Z\.csv$/.test(eventCsv.suggestedFilename()),
    'The Request log filename does not identify its data, period, and generation time.',
  );
  ok(eventCsvText.split(/\r?\n/).filter(Boolean).length === primaryEventRows.length + 1, 'The event CSV contains diagnostics or only the first page.');
  ok(eventCsvText.split(/\r?\n/, 1)[0].split(',').length === 33, 'The Request log CSV is not the approved 33-column schema.');
  ok(eventCsvText.includes('"returned_icon_refs"'), 'The event CSV omits returned icon references.');
  ok(eventCsvText.includes('"estimated_client_id"'), 'The Request log omits the estimated client identifier.');
  ok(eventCsvText.includes('"episode_id"'), 'The Request log omits the final episode identifier.');
  ok(eventCsvText.includes('"recovery_chain_id"'), 'The Request log omits the recovery-chain identifier.');
  ok(eventCsvText.includes('"diagnostic_attempt_count"'), 'The Request log omits the linked diagnostic-attempt count.');
  ok(eventCsvText.includes('"interface_locale"'), 'The Request log omits interface locale.');
  ok(eventCsvText.includes('"geo_source"'), 'The Request log omits the country source.');
  ok(eventCsvText.includes('"identity_quality"'), 'The Request log omits identity quality.');
  ok(!eventCsvText.includes('"root_request_identifier"'), 'The Request log exposes the unreliable legacy root identifier.');
  ok(!eventCsvText.includes('"export_type"'), 'The Request log repeats file-level metadata in every row.');
  ok(eventCsvText.includes('"\'\t=HYPERLINK(""https://example.com"")"'), 'The event CSV leaves a whitespace-prefixed spreadsheet formula active.');
  ok(!eventCsvText.includes('"request_id"'), 'The event CSV exposes a raw request ID field.');
  await page.click('#searchDownloadToggle');
  const auditDownload = page.waitForEvent('download');
  await page.click('[data-export="audit-bundle-json"]');
  const auditJson = await auditDownload;
  const auditJsonPath = await auditJson.path();
  const auditPayload = JSON.parse(await readFile(auditJsonPath, 'utf8'));
  ok(
    /^supericons-audit-bundle-24h-\d{8}T\d{6}Z\.json$/.test(auditJson.suggestedFilename()),
    'The Audit bundle filename does not identify its data, period, and generation time.',
  );
  ok(auditPayload.export_schema_version === '4.1', 'The audit JSON does not state its schema version.');
  ok(auditPayload.export_type === 'audit_bundle', 'The audit JSON does not identify its export type.');
  ok(auditPayload.search_summary.length === queryRows.length, 'The audit JSON contains only the visible table page.');
  ok(auditPayload.request_log.length === primaryEventRows.length, 'The audit JSON request count is wrong.');
  ok(auditPayload.web_searches.length === 1, 'The audit JSON does not separate web searches.');
  ok(auditPayload.diagnostics.length === 1, 'The audit JSON does not separate diagnostics.');
  ok(auditPayload.source_reconciliation.status === 'passed', 'The audit JSON source reconciliation did not pass.');
  ok(auditPayload.integrity_checks.checks.source_reconciliation_passes === true, 'The audit JSON does not require source reconciliation.');
  ok(Boolean(auditPayload.integrity_checks.status), 'The audit JSON omits integrity checks.');
  ok(auditPayload.integrity_checks.semantic_status === 'needs_attention', 'The audit JSON did not flag the fixture\'s unclassified lookup.');
  ok(auditPayload.integrity_checks.checks.summary_outcome_components_reconcile === true, 'The audit JSON does not reconcile outcome components.');
  ok(auditPayload.integrity_checks.checks.success_labels_match_success_counts === true, 'The audit JSON permits false Success labels.');
  ok(auditPayload.integrity_checks.checks.summary_has_no_unclassified_requests === false, 'The audit JSON permits unclassified requests.');
  ok(auditPayload.integrity_checks.checks.recorded_positive_results_have_returned_refs === true, 'The audit JSON permits an empty recorded reference list.');
  ok(auditPayload.integrity_checks.checks.searcher_detail_availability_is_truthful === true, 'The audit JSON permits false searcher-detail availability.');
  ok(Number.isInteger(auditPayload.integrity_checks.warnings.suspicious_query_text_patterns), 'The audit JSON omits query-text review warnings.');
  ok(Boolean(auditPayload.contents.search_summary), 'The audit JSON omits the Search summary definition.');
  ok(Boolean(auditPayload.contents.request_log), 'The audit JSON omits the Request log definition.');
  ok(auditPayload.csv_schemas.search_summary.length === 20, 'The Audit bundle has the wrong Search summary schema.');
  ok(auditPayload.csv_schemas.request_log.length === 33, 'The Audit bundle has the wrong Request log schema.');
  ok(Boolean(auditPayload.field_coverage.returned_icon_refs), 'The audit JSON omits field coverage.');
  ok(Boolean(auditPayload.definitions.grain), 'The audit JSON omits metric definitions.');
  const pagedEventRequests = requests.filter((request) => (
    request.path === '/v2/search/events'
    && Number(new URLSearchParams(request.search).get('page') || 1) > 1
  ));
  ok(pagedEventRequests.length > 0, 'The event export did not request a later page.');
  ok(pagedEventRequests.every((request) => (
    new URLSearchParams(request.search).get('snapshot_id')
      === `event-snapshot-${new URLSearchParams(request.search).get('event_scope') || 'primary'}`
  )), 'The event export did not keep one stable API snapshot across pages.');
  ok(await page.locator('#diagnosticsDrawer').count() === 0, 'The old diagnostics drawer still takes up Search history space.');

  await page.click('#nav-audience');
  await page.waitForSelector('#section-audience:not([hidden])');
  await assertPanelActionsStayOnOneLine(page, '#section-audience:not([hidden])');
  ok((await page.locator('#section-audience').innerText()).includes('Reach and accounts'), 'Separate reach and account totals are still presented as one funnel.');
  ok(!(await page.locator('#section-audience').innerText()).includes('Audience funnel'), 'The audience section still claims separate populations form a funnel.');
  ok(await page.locator('#funnelRegistered').innerText() === '23', 'Registered funnel count is incorrect.');
  ok(await page.locator('#funnelPro').innerText() === '2', 'Pro funnel count is incorrect.');
  ok(
    await page.locator('#funnelClients').innerText() === await page.locator('#kpiClients').innerText(),
    'Overview and Audience estimated reach disagree for the same view.',
  );
  ok(await page.locator('#funnelRegisteredSpark svg').count() === 1, 'The registered funnel sparkline is missing.');
  ok(await page.locator('#funnelProSpark svg').count() === 1, 'The Pro funnel sparkline is missing.');
  ok(await page.locator('#audienceChart svg').getAttribute('aria-label') === 'Account-linked searchers over time', 'The audience chart does not explain that it measures API-key-linked search activity.');
  ok((await page.locator('#registeredUsers').innerText()).includes('pro_monthly'), 'Registered users did not render.');
  ok((await page.locator('#registeredUsersSubtitle').innerText()).includes('23 accounts in all recorded history'), 'The registered-account scope is missing.');
  ok(await page.locator('#toggleRegisteredEmails svg').count() === 1, 'The email visibility icon is missing.');
  ok(!(await page.locator('#registeredUsers').innerText()).includes('user1@example.test'), 'Full emails must start hidden.');
  ok((await page.locator('#registeredUsers').innerText()).includes('u***@example.test'), 'Masked emails are missing.');
  await page.click('#toggleRegisteredEmails');
  ok((await page.locator('#registeredUsers').innerText()).includes('user1@example.test'), 'The email visibility control did not reveal emails.');
  const enrichedRegisteredRow = page.locator('#registeredUsers tbody tr').filter({ hasText: 'user1@example.test' });
  ok((await enrichedRegisteredRow.innerText()).includes('10'), 'Registered-user search activity was discarded.');
  ok((await enrichedRegisteredRow.innerText()).includes('Web'), 'Registered-user venue enrichment was discarded.');
  const firstRegisteredRow = page.locator('#registeredUsers tbody tr').first();
  const registeredHeaders = await page.locator('#registeredUsers th').evaluateAll((headers) => (
    headers.map((header) => header.textContent.replace(/\s+/g, ' ').trim())
  ));
  ok(registeredHeaders.includes('Last sign-in'), 'The account sign-in time is not separate.');
  ok(registeredHeaders.includes('Last search'), 'The linked search time is not separate.');
  ok(/\d{1,2}:\d{2}/.test(await firstRegisteredRow.innerText()), 'Signup and activity timestamps are missing their time.');
  ok(await page.locator('[data-pagination="clients"] [data-page-next]').count() === 1, 'The client list Next button is missing.');
  const clientSortRequest = page.waitForRequest((request) => {
    if (!request.url().includes('/functions/v1/admin-api/v2/audience')) return false;
    const params = new URL(request.url()).searchParams;
    return params.get('sort_by') === 'searches' && params.get('sort_direction') === 'desc';
  });
  await page.click('[data-sort-table="clients"][data-sort-key="searches"]');
  await clientSortRequest;
  await page.waitForFunction(() => document.querySelector('#refreshButton')?.getAttribute('aria-busy') === 'false');
  ok(
    (await page.locator('#allClients tbody tr').first().innerText()).includes('client55'),
    'Searchers did not apply full-dataset server sorting.',
  );
  await page.click('[data-pagination="clients"] [data-page-next]');
  await page.waitForFunction(() => document.querySelector('[data-pagination="clients"] [aria-current="page"]')?.textContent === '2');
  ok(requests.some((request) => request.path === '/v2/audience' && request.search.includes('page=2') && request.search.includes('page_size=25')), 'Client page 2 was not requested from the API.');

  await page.click('[data-window="all"]');
  await page.waitForFunction(() => document.querySelector('#kpiClients')?.textContent === '90');
  ok((await page.locator('#kpiClientsNote').innerText()).includes('Daily reach'), 'The All view did not label its daily reach estimate.');
  ok(await page.locator('#funnelClients').innerText() === '90', 'The All-view funnel did not render daily reach.');
  ok((await page.locator('#funnelClientsNote').innerText()).includes('Daily reach'), 'The All-view funnel estimate is not labelled.');
  ok((await page.locator('#audienceChart').innerText()).includes('Daily reach'), 'The All-view audience chart did not use the honest daily reach fallback.');
  ok((await page.locator('#allClients').innerText()).includes('Choose a shorter date range'), 'The All-view client list did not show its bounded notice.');
  ok((await page.locator('#registeredUsersSubtitle').innerText()).includes('23 accounts in all recorded history'), 'The All view hid registered accounts.');

  await page.click('[data-window="custom"]');
  await page.fill('#customFrom', '2026-07-15');
  await page.fill('#customTo', '2026-07-17');
  await page.click('#applyCustomRange');
  await page.waitForTimeout(700);
  ok(requests.some((request) => request.search.includes('window=custom') && request.search.includes('from=2026-07-15') && request.search.includes('to=2026-07-17')), 'Custom date filters were not sent to the API.');
  ok(
    requests.filter((request) => request.path === '/users').length === 1,
    'Filter changes reloaded the all-account directory.',
  );

  const download = page.waitForEvent('download');
  await page.click('[data-export="registered-users"]');
  const downloaded = await download;
  ok(downloaded.suggestedFilename().endsWith('.csv'), 'The list export did not create a CSV file.');

  const defaultOverviewResponse = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return url.pathname.endsWith('/v2/overview')
      && url.searchParams.get('window') === '1d';
  });
  await page.click('[data-window="1d"]');
  await defaultOverviewResponse;
  await page.waitForFunction(() => (
    document.querySelector('#refreshButton')?.getAttribute('aria-busy') === 'false'
      && document.querySelector('#freshnessLine')?.textContent?.startsWith('Updated')
  ), null, { timeout: 5000 });
  const cachedOverviewBeforeReload = await page.evaluate(() => {
    const key = Object.keys(window.localStorage)
      .find((candidate) => candidate.includes('si_admin_dashboard_v2_cache:overview:'));
    return key ? JSON.parse(window.localStorage.getItem(key) || 'null') : null;
  });
  ok(
    cachedOverviewBeforeReload?.payload?.__partial === true
      && cachedOverviewBeforeReload?.payload?.kpis?.estimated_unique_clients === 32,
    `The warm aggregate Overview cache was not written before reload: ${JSON.stringify(cachedOverviewBeforeReload)}`,
  );
  await page.reload({ waitUntil: 'domcontentloaded' });
  ok(await page.locator('#adminSecretModal.open').count() === 1, 'Direct development mode persisted its secret across reload.');
  ok(
    await page.evaluate(() => (
      window.sessionStorage.getItem('si_admin_secret') === null
      && window.localStorage.getItem('si_admin_secret') === null
    )),
    'Direct development mode stored the admin secret.',
  );
  const cacheKeysAfterReload = await page.evaluate(() => Object.keys(window.localStorage));
  ok(
    cacheKeysAfterReload.some((candidate) => candidate.endsWith(
      ':overview:/v2/overview?window=1d&channel=all&include_test=false',
    )),
    `Reload removed the warm aggregate Overview cache: ${JSON.stringify(cacheKeysAfterReload)}`,
  );
  await page.fill('#adminSecretInput', 'mock-secret');
  await page.evaluate(() => {
    window.__warmRenderStartedAt = performance.now();
    window.__warmRenderAt = null;
    const target = document.querySelector('#kpiClients');
    const observer = new MutationObserver(() => {
      if (target?.textContent === '32') {
        window.__warmRenderAt = performance.now();
        observer.disconnect();
      }
    });
    observer.observe(target, { childList: true, characterData: true, subtree: true });
  });
  await page.click('#adminSecretSubmitBtn');
  await page.waitForFunction(() => Number.isFinite(window.__warmRenderAt), null, { polling: 20 });
  const warmMs = await page.evaluate(() => window.__warmRenderAt - window.__warmRenderStartedAt);
  ok(warmMs < 500, `Warm cached content took ${warmMs} ms to appear.`);

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ok(overflow <= 1, `The dashboard has ${overflow}px of horizontal overflow.`);

  console.log(JSON.stringify({
    status: 'ok',
    requests: requests.length,
    warm_render_ms: warmMs,
    navigation_sections: 3,
    inline_svg_charts: await page.locator('.chart svg').count(),
    compact_layout: compactLayout,
  }, null, 2));
} finally {
  await browser.close();
  await server.close();
}
