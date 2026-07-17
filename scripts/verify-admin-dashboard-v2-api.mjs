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
  'v2DashboardCache',
  'ttlMs: 30_000',
  'V2_MAX_RAW_ROWS_PER_SOURCE = 2500',
  'V2_MAX_ROLLUP_ROWS = 10000',
  'V2_MAX_ICON_ROWS = 5000',
  "from('admin_rollup_overview')",
  "from('admin_rollup_queries')",
  "from('contact_submissions')",
  "from('icon_evidence')",
  'raw_rows_truncated',
  'rollup_rows_truncated',
  'identity_unavailable_reason',
  'Returned-icon coverage is complete only for Hosted MCP',
  'Exact billing price is not linked to every active subscription',
  'v2DashboardCache.clear()',
].forEach((value) => includes(api, value, 'admin-api'));

[
  'parseDashboardV2Range',
  'Custom date ranges cannot exceed 366 days.',
  'buildDashboardV2Series',
  'buildDashboardV2Kpis',
  'buildDashboardV2TopLists',
  'buildDashboardV2Geography',
  'aggregateDashboardV2IconRows',
  'buildDashboardV2Clients',
  'parseDashboardV2QuerySearch',
  "['zero', 'low', 'venue', 'country', 'origin', 'registered']",
  'maskDashboardV2Identifier',
].forEach((value) => includes(helpers, value, 'v2 helpers'));

[
  'identity_available === false',
  'identity_unavailable_reason',
  'Returned-icon coverage is partial',
  'Exact billing price is not linked to every active subscription',
].forEach((value) => includes(frontend, value, 'dashboard frontend'));

for (const [path, source] of [
  ['supabase/functions/admin-api/index.ts', api],
  ['lib/admin-dashboard-v2.js', helpers],
  ['public/admin-app.js', frontend],
]) {
  if (/[\u2013\u2014]/u.test(source)) throw new Error(`${path} contains a forbidden dash character.`);
}

console.log(JSON.stringify({
  status: 'ok',
  endpoints: ['/v2/activity', '/v2/overview', '/v2/search', '/v2/audience'],
  cache_ttl_ms: 30000,
  raw_row_limit_per_source: 2500,
  rollup_row_limit: 10000,
  icon_row_limit: 5000,
  custom_range_days_max: 366,
}, null, 2));
