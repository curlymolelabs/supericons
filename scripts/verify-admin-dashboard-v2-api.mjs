import { readFile } from 'node:fs/promises';

const api = await readFile('supabase/functions/admin-api/index.ts', 'utf8');
const helpers = await readFile('lib/admin-dashboard-v2.js', 'utf8');
const frontend = await readFile('public/admin-app.js', 'utf8');

function includes(source, value, label) {
  if (!source.includes(value)) throw new Error(`${label} is missing: ${value}`);
}

[
  "['activity', 'overview', 'search', 'audience'].includes(segments[1])",
  'handleDashboardV2',
  'buildDashboardV2ActivityPayload',
  'buildDashboardV2OverviewPayload',
  'buildDashboardV2SearchPayload',
  'buildDashboardV2AudiencePayload',
  'handleDashboardV2IconRequestReview',
  'v2DashboardCache',
  'ttlMs: 30_000',
  'V2_MAX_RAW_ROWS_PER_SOURCE = 2500',
  'V2_MAX_IDENTITY_ROWS_PER_SOURCE = 25000',
  'V2_IDENTITY_PAGE_CONCURRENCY = 4',
  'V2_MAX_ROLLUP_ROWS = 50000',
  'V2_ROLLUP_PAGE_CONCURRENCY = 4',
  'V2_MAX_ICON_ROWS = 5000',
  'dashboardV2CompletedRollupFilters',
  'dashboardV2CurrentDayFilters',
  'fetchDashboardV2IdentityTelemetry',
  'buildQueryWorkbenchGroupKey',
  'queryOrigin: normalizedQueryOrigin',
  'queryOrigin: row.query_origin',
  'separateQueryOrigins = false',
  '{ applyQuery: false, separateQueryOrigins: true }',
  'includeQueryRows = true',
  '{ applyQuery: false, includeQueryRows: false }',
  "select(auditSelect, { count: 'exact' })",
  "select(usageSelect, { count: 'exact' })",
  "select(overviewSelect, { count: 'exact' })",
  "select(querySelect, { count: 'exact' })",
  ".eq('event_type', 'search_outcome')",
  ".filter((row) => String(row.signal_type || '') === 'search_attempt')",
  "from('admin_rollup_overview')",
  "from('admin_rollup_queries')",
  "from('contact_submissions')",
  "from('icon_evidence')",
  "from('admin_icon_request_reviews')",
  "segments[1] === 'icon-requests'",
  "segments[2] === 'review'",
  "status must be one of: new, planned, added, declined",
  "url.searchParams.get('page_size')",
  'raw_rows_truncated',
  'identity_rows_truncated',
  'rollup_rows_truncated',
  'rollup_data_complete',
  'identity_unavailable_reason',
  'Returned-icon coverage is complete only for Hosted MCP',
  'Exact billing price is not linked to every active subscription',
  'total: users.length',
  'activity_window: filters.key',
  "client_measure: dataUnavailable ? 'client_days' : 'estimated_unique_clients'",
  "audience_series_measure: dataUnavailable ? 'client_days' : 'registered_and_pro_clients'",
  'v2DashboardCache.clear()',
].forEach((value) => includes(api, value, 'admin-api'));

[
  'parseDashboardV2Range',
  'fetchBoundedDashboardV2Pages',
  'Custom date ranges cannot exceed 366 days.',
  'use_raw: durationDays === 1',
  'buildDashboardV2Series',
  'buildDashboardV2Kpis',
  'buildDashboardV2TopLists',
  'buildDashboardV2Geography',
  'aggregateDashboardV2IconRows',
  'buildDashboardV2Clients',
  'parseDashboardV2QuerySearch',
  "['zero', 'low', 'venue', 'country', 'origin', 'registered']",
  'maskDashboardV2Identifier',
  'result_count_available',
  'country_available',
  'outcome_label',
  'Mixed: ${zeroCount} of ${attempts} zero',
].forEach((value) => includes(helpers, value, 'v2 helpers'));

[
  'identity_available === false',
  'identity_unavailable_reason',
  'Returned-icon coverage is partial',
  'Exact billing price is not linked to every active subscription',
  'Lookup completed',
  'Client-days across the selected period',
  'registeredUsersSubtitle',
].forEach((value) => includes(frontend, value, 'dashboard frontend'));

if (api.includes('if (rangeStart !== null && signup < rangeStart)')) {
  throw new Error('Registered users are still filtered by the selected date range.');
}

for (const [path, source] of [
  ['supabase/functions/admin-api/index.ts', api],
  ['lib/admin-dashboard-v2.js', helpers],
  ['public/admin-app.js', frontend],
]) {
  if (/[\u2013\u2014]/u.test(source)) throw new Error(`${path} contains a forbidden dash character.`);
}

console.log(JSON.stringify({
  status: 'ok',
  endpoints: [
    'GET /v2/activity',
    'GET /v2/overview',
    'GET /v2/search',
    'GET /v2/audience',
    'POST /v2/icon-requests/review',
  ],
  cache_ttl_ms: 30000,
  raw_row_limit_per_source: 2500,
  identity_row_limit_per_source: 25000,
  identity_page_concurrency: 4,
  rollup_row_limit: 50000,
  rollup_page_concurrency: 4,
  icon_row_limit: 5000,
  custom_range_days_max: 366,
}, null, 2));
