import { readFile } from 'node:fs/promises';

const html = await readFile('admin.html', 'utf8');
const app = await readFile('public/admin-app.js', 'utf8');
const api = await readFile('supabase/functions/admin-api/index.ts', 'utf8');
const helpers = await readFile('lib/admin-dashboard-v2.js', 'utf8');

function requireText(source, value, label) {
  if (!source.includes(value)) {
    throw new Error(`${label} is missing: ${value}`);
  }
}

function forbidText(source, value, label) {
  if (source.includes(value)) {
    throw new Error(`${label} still contains: ${value}`);
  }
}

const summaryButtons = html.match(/data-export="search-summary-csv"/g) || [];
if (summaryButtons.length !== 1) {
  throw new Error(`Expected one Search summary action, found ${summaryButtons.length}.`);
}

const menuItems = html.match(/role="menuitem"/g) || [];
if (menuItems.length !== 2) {
  throw new Error(`Expected two alternative Search downloads, found ${menuItems.length}.`);
}

[
  '>Search summary<',
  '<strong>Request log</strong>',
  '<strong>Audit bundle</strong>',
  'One row per unique query. For quick analysis.',
  'One row per tool call. Ground truth.',
  'Everything plus integrity checks. For verification.',
].forEach((value) => requireText(html, value, 'Search download UI'));

[
  'data-export="queries-csv"',
  'data-export="query-events-csv"',
  'data-export="query-audit-json"',
  '<strong>Grouped CSV</strong>',
  '<strong>MCP Requests CSV</strong>',
  '<strong>Full Audit JSON</strong>',
  '<strong>Table CSV</strong>',
  '>Download CSV<',
].forEach((value) => forbidText(html, value, 'Search download UI'));

[
  "SEARCH_EXPORT_SCHEMA_VERSION = '3.0'",
  "'supericons-search-summary'",
  "'supericons-request-log'",
  "'supericons-audit-bundle'",
  'searchSummaryCsvRow',
  'requestLogCsvRow',
  'distinct_searcher_ids',
  'typical_result_count',
  'returned_icon_refs',
  'success_count',
  'lookup_not_found_count',
  'summary_rows_have_requests',
  'summary_request_count_matches_primary_events',
  'summary_grain_is_unique',
  'request_event_ids_are_unique',
  'search_summary',
  'request_log',
  'web_searches',
  'hosted_diagnostics',
].forEach((value) => requireText(app, value, 'Search export implementation'));

[
  'dashboardV2SearchHistoryRole',
  "['search', 'lookup'].includes(dashboardV2SearchHistoryRole(row))",
  'excluded_non_activity_rows',
  'Number(row.activity_count || 0) > 0',
  'total: compactHistoryRows.length',
  'separateQueryOrigins: true',
  'separateChannels: false',
  'separateSearchers: false',
  'includeSearcherDetails: false',
  "query_row_grain: ['query', 'library_filter', 'query_origin']",
].forEach((value) => requireText(api, value, 'Search history API'));

requireText(helpers, 'export function dashboardV2SearchHistoryRole', 'Search history role helper');
forbidText(
  api,
  'const historyEvidenceRows = historyTelemetry?.rows || dataRows.telemetry_rows',
  'Search history API',
);

for (const [path, source] of [
  ['admin.html', html],
  ['public/admin-app.js', app],
  ['supabase/functions/admin-api/index.ts', api],
  ['lib/admin-dashboard-v2.js', helpers],
]) {
  if (/[\u2013\u2014]/u.test(source)) {
    throw new Error(`${path} contains a forbidden dash character.`);
  }
}

console.log(JSON.stringify({
  status: 'ok',
  exports: {
    search_summary: 'one row per query, library, and origin',
    request_log: 'one top-level MCP request per row',
    audit_bundle: 'separate summary, request, web, and diagnostic data sets',
  },
  filenames_include: ['export type', 'period', 'generation timestamp'],
  integrity_checks: 7,
}, null, 2));
