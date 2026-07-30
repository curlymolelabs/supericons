import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  compactDashboardV2QueryRows,
  filterDashboardV2QueryRows,
} from '../lib/admin-dashboard-v2.js';

const [
  html,
  frontend,
  api,
  migration,
  rollback,
  requestReviewMigration,
  iconRequestMigration,
] = await Promise.all([
  readFile('admin.html', 'utf8'),
  readFile('public/admin-app.js', 'utf8'),
  readFile('supabase/functions/admin-api/index.ts', 'utf8'),
  readFile('supabase/migrations/20260725130000_expand_query_review_actions.sql', 'utf8'),
  readFile('supabase/rollbacks/20260725130000_expand_query_review_actions.down.sql', 'utf8'),
  readFile('supabase/migrations/20260718160000_admin_icon_request_reviews.sql', 'utf8'),
  readFile('supabase/migrations/20260727120000_icon_request_events.sql', 'utf8'),
]);

for (const [path, source] of [
  ['admin.html', html],
  ['public/admin-app.js', frontend],
  ['supabase/functions/admin-api/index.ts', api],
  ['supabase/migrations/20260725130000_expand_query_review_actions.sql', migration],
  ['supabase/rollbacks/20260725130000_expand_query_review_actions.down.sql', rollback],
  ['supabase/migrations/20260718160000_admin_icon_request_reviews.sql', requestReviewMigration],
  ['supabase/migrations/20260727120000_icon_request_events.sql', iconRequestMigration],
]) {
  assert.doesNotMatch(source, /[\u2013\u2014]/u, `${path} contains a forbidden dash character.`);
}

assert.ok(
  html.indexOf('data-row-label="Search history"') < html.indexOf('data-row-label="Gaps"')
  && html.indexOf('data-row-label="Gaps"') < html.indexOf('data-row-label="User requests"'),
  'Search history, Gaps, and User requests are in the wrong order.',
);
for (const label of [
  'Gaps',
  'Failed and weak searches that need a human decision.',
  'All gaps',
  'Zero results',
  'Low results',
  'User requests',
  'What people asked us to add from the icon grid or sidebar.',
]) {
  assert.ok(html.includes(label), `admin.html is missing ${label}.`);
}
assert.ok(html.includes('id="gapsIssueFilter"'), 'Gaps is missing its issue filter.');
for (const exportKey of ['gap-worklist-csv', 'icon-requests-csv']) {
  assert.ok(
    html.includes(`data-export="${exportKey}"`),
    `admin.html is missing the ${exportKey} download action.`,
  );
  assert.ok(
    frontend.includes(`'${exportKey}'`),
    `public/admin-app.js is missing the ${exportKey} export data source.`,
  );
}

for (const field of [
  "label: 'Query'",
  "label: 'Issue'",
  "label: 'Channel'",
  "label: 'Language'",
  "label: 'Country'",
  "label: 'Result count'",
  "label: 'Searches'",
  "label: 'Last seen'",
  "label: 'Action'",
]) {
  assert.ok(frontend.includes(field), `Gaps is missing ${field}.`);
}
assert.ok(
  frontend.includes("{ label: 'Last seen', sortKey: 'last_seen', sortType: 'date'"),
  'Gaps Last seen is not date-sortable.',
);

for (const action of [
  'add_icon',
  'add_alias',
  'improve_ranking',
  'improve_docs',
  'watch',
  'ignore',
  'resolved',
]) {
  assert.ok(frontend.includes(`value="${action}"`), `Frontend is missing ${action}.`);
  assert.ok(api.includes(`'${action}'`), `Admin API is missing ${action}.`);
  assert.ok(migration.includes(`'${action}'`), `Migration is missing ${action}.`);
}

assert.ok(api.includes('filteredDemandRows'), 'Gaps does not use the v2 search payload.');
assert.ok(api.includes('historyEvidenceRows'), 'Gaps does not use trusted final search rows.');
assert.ok(api.includes('dataRows.query_reviews'), 'Gaps does not join human review actions.');
for (const contract of [
  "url.searchParams.get('gaps_issue')",
  "url.searchParams.get('gaps_page')",
  "url.searchParams.get('gaps_page_size')",
  "url.searchParams.get('gaps_sort_by')",
  'worklist_pagination',
]) {
  assert.ok(api.includes(contract), `Gaps API is missing ${contract}.`);
}
assert.ok(
  api.includes('orderedWorklist.slice(worklistStart, worklistStart + gapsPageSize)'),
  'Gaps does not paginate the complete ordered result set.',
);
for (const contract of [
  "gapsIssue: 'all'",
  "params.set('gaps_issue', state.gapsIssue)",
  "params.set('gaps_page', String(currentPage('worklist')))",
  "params.set('gaps_page_size', String(rowLimit('worklist')))",
  'serverPagination: worklistPagination',
  "SERVER_PAGINATED_LISTS = new Set(['activity', 'queries', 'worklist', 'clients'])",
]) {
  assert.ok(frontend.includes(contract), `Gaps frontend is missing ${contract}.`);
}
assert.ok(frontend.includes("apiRequest('/v2/search/review'"), 'Gaps uses the wrong review endpoint.');
assert.ok(rollback.includes('Cannot restore the old review action constraint'), 'Rollback does not protect stored actions.');

for (const field of [
  "label: 'User request'",
  "label: 'Source'",
  "label: 'Results'",
  "label: 'Submitted'",
  "label: 'Review'",
  'row.failed_query || row.search_query',
  'row.library_filter',
  'row.ui_surface',
  'row.result_count',
  'row.created_at',
  'data-icon-request-status',
  'data-icon-request-note',
  'data-icon-request-save',
]) {
  assert.ok(frontend.includes(field), `User requests is missing ${field}.`);
}
assert.ok(
  frontend.includes("{ label: 'Submitted', sortKey: 'created_at', sortType: 'date'"),
  'User requests Submitted is not date-sortable.',
);
for (const sourceRule of [
  ".from('icon_evidence')",
  ".in('signal_type', [...ICON_REQUEST_SIGNAL_TYPES])",
  ".in('ui_surface', [...ICON_REQUEST_UI_SURFACES])",
  'search_query',
  'library_filter',
  ".from('admin_icon_request_reviews')",
]) {
  assert.ok(api.includes(sourceRule), `User requests is missing source rule ${sourceRule}.`);
}
for (const status of ['new', 'planned', 'added', 'declined']) {
  assert.ok(frontend.includes(`value="${status}"`), `User requests is missing status ${status}.`);
  assert.ok(api.includes(`'${status}'`), `Admin API is missing user request status ${status}.`);
  assert.ok(requestReviewMigration.includes(`'${status}'`), `Review migration is missing status ${status}.`);
}
assert.ok(frontend.includes("apiRequest('/v2/icon-requests/review'"), 'User requests uses the wrong review endpoint.');
assert.ok(frontend.includes('icon_evidence_id: iconEvidenceId, status, note'), 'User requests does not save status and note together.');
assert.ok(api.includes('Number(left.reviewed) - Number(right.reviewed)'), 'Unreviewed user requests are not ordered first.');
assert.ok(api.includes(".in('domain', [...getProductionAnalyticsHosts()])"), 'User requests does not respect the production traffic filter.');
assert.ok(api.includes(".neq('signal_type', 'icon_request')"), 'Icon requests can leak into search analytics.');
assert.ok(iconRequestMigration.includes('public.si_log_icon_request'), 'The dedicated request RPC is missing.');
assert.ok(iconRequestMigration.includes("'icon_request'"), 'The dedicated request signal is missing.');
assert.ok(
  iconRequestMigration.includes("p_result_count integer default null"),
  'Standalone sidebar requests cannot keep result_count null.',
);
assert.ok(
  iconRequestMigration.includes('search_query and result_count must both be present or both be null'),
  'Search context can be stored partially.',
);

for (const forbidden of [
  'insert into public.icons',
  'update public.icons',
  'insert into public.icon_aliases',
  'update public.icon_aliases',
]) {
  assert.ok(!migration.toLowerCase().includes(forbidden), `Migration contains an automatic product write: ${forbidden}.`);
  assert.ok(!api.toLowerCase().includes(forbidden), `Admin API contains an automatic product write: ${forbidden}.`);
}

const [row] = compactDashboardV2QueryRows([{
  query: 'missing brand',
  library_filter: 'all',
  job_category: '',
  query_origins: ['agent_query'],
  tools: ['search_icons'],
  attempt_count: 2,
  zero_attempt_count: 2,
  low_attempt_count: 0,
  successful_attempt_count: 0,
  error_attempt_count: 0,
  clarification_attempt_count: 0,
  estimated_unique_clients: 1,
  result_sample_count: 2,
  result_count_min: 0,
  result_count_max: 0,
  median_result_count: 0,
  result_units: ['icon'],
  countries: ['SG'],
  channels: ['hosted_mcp'],
  locales: ['zh-CN'],
  environments: ['production'],
  first_seen: '2026-07-25T00:00:00Z',
  last_seen: '2026-07-25T00:01:00Z',
  review_status: 'add_icon',
}]);

assert.equal(row.issue_type, 'zero_result');
assert.equal(row.channel, 'hosted_mcp');
assert.equal(row.locale, 'zh-CN');
assert.deepEqual(row.locales, ['zh-CN']);
assert.equal(row.country_code, 'SG');
assert.equal(row.typical_result_count, 0);
assert.equal(row.review_status, 'add_icon');

const demandCandidates = filterDashboardV2QueryRows([{
  query: 'missing brand',
  attempt_count: 1,
  zero_attempt_count: 1,
  low_attempt_count: 0,
  successful_attempt_count: 0,
  estimated_unique_clients: 1,
  locales: ['zh-CN'],
  countries: ['SG'],
  environments: ['production'],
}], '', '').filter((candidate) => (
  Number(candidate.true_zero_count || 0) > 0
  || Number(candidate.low_result_count || 0) > 0
));
assert.equal(demandCandidates.length, 1, 'A zero-result row disappeared after v2 normalization.');
assert.deepEqual(demandCandidates[0].locales, ['zh-CN'], 'Language disappeared after v2 normalization.');
assert.deepEqual(demandCandidates[0].countries, ['SG'], 'Country disappeared after v2 normalization.');
assert.deepEqual(demandCandidates[0].environments, ['production'], 'Environment disappeared after v2 normalization.');
assert.ok(api.includes('Number(row.true_zero_count || 0) > 0'), 'Admin API reads the wrong normalized zero field.');
assert.ok(api.includes('Number(row.low_result_count || 0) > 0'), 'Admin API reads the wrong normalized low field.');

console.log(JSON.stringify({
  status: 'ok',
  source: 'v2_final_search_rows',
  test_traffic_filter: 'inherited_from_v2_filters',
  user_request_sources: ['grid_empty_feedback', 'grid_low_result_feedback', 'sidebar_request'],
  user_request_signal_types: ['search_attempt', 'icon_request'],
  user_request_review_source: 'admin_icon_request_reviews',
  visible_fields: ['query', 'issue', 'channel', 'language', 'country', 'result_count', 'searches', 'last_seen', 'action'],
  user_request_fields: ['request_text', 'search_query', 'library_filter', 'ui_surface', 'result_count', 'created_at', 'status', 'note'],
  actions: ['add_icon', 'add_alias', 'improve_ranking', 'improve_docs', 'watch', 'ignore', 'resolved'],
  automatic_product_writes: 0,
}, null, 2));
