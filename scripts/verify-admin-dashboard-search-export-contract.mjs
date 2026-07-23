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

const groupedButtons = html.match(/data-export="queries-csv"/g) || [];
if (groupedButtons.length !== 1) {
  throw new Error(`Expected one grouped CSV action, found ${groupedButtons.length}.`);
}

const menuItems = html.match(/role="menuitem"/g) || [];
if (menuItems.length !== 2) {
  throw new Error(`Expected two alternative Search downloads, found ${menuItems.length}.`);
}

[
  '>Grouped CSV<',
  '<strong>MCP Requests CSV</strong>',
  '<strong>Full Audit JSON</strong>',
  'One top-level MCP search or exact icon lookup per row.',
  'Web searches and hosted diagnostics are excluded.',
  'integrity checks',
].forEach((value) => requireText(html, value, 'Search download UI'));

[
  '<strong>Table CSV</strong>',
  '>Download CSV<',
].forEach((value) => forbidText(html, value, 'Search download UI'));

[
  "SEARCH_EXPORT_SCHEMA_VERSION = '2.0'",
  "'supericons-search-history-grouped'",
  "'supericons-search-mcp-requests'",
  "'supericons-search-full-audit'",
  'activity_count',
  'activity_unit',
  'outcome_label',
  'country_exact_for_group',
  'venue_exact_for_group',
  'result_count_available',
  'success_count',
  'lookup_not_found_count',
  'row_grain',
  'export_generated_at_utc',
  'grouped_rows_have_activity',
  'grouped_activity_matches_groupable_primary_events',
  'primary_event_identifiers_are_unique',
  'grouped_history',
  'top_level_mcp_requests',
  'web_searches',
  'hosted_diagnostics',
].forEach((value) => requireText(app, value, 'Search export implementation'));

[
  'dashboardV2SearchHistoryRole',
  "['search', 'lookup'].includes(dashboardV2SearchHistoryRole(row))",
  'excluded_non_activity_rows',
  'Number(row.activity_count || 0) > 0',
  'total: compactHistoryRows.length',
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
    grouped_csv: 'one row per grouped Search history context',
    mcp_requests_csv: 'one top-level MCP request per row',
    full_audit_json: 'separate grouped, MCP, web, and diagnostic data sets',
  },
  filenames_include: ['export type', 'period', 'generation timestamp'],
  integrity_checks: 6,
}, null, 2));
