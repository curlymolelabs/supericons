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
] = await Promise.all([
  readFile('admin.html', 'utf8'),
  readFile('public/admin-app.js', 'utf8'),
  readFile('supabase/functions/admin-api/index.ts', 'utf8'),
  readFile('supabase/migrations/20260725130000_expand_query_review_actions.sql', 'utf8'),
  readFile('supabase/rollbacks/20260725130000_expand_query_review_actions.down.sql', 'utf8'),
]);

for (const [path, source] of [
  ['admin.html', html],
  ['public/admin-app.js', frontend],
  ['supabase/functions/admin-api/index.ts', api],
  ['supabase/migrations/20260725130000_expand_query_review_actions.sql', migration],
  ['supabase/rollbacks/20260725130000_expand_query_review_actions.down.sql', rollback],
]) {
  assert.doesNotMatch(source, /[\u2013\u2014]/u, `${path} contains a forbidden dash character.`);
}

assert.ok(
  html.indexOf('data-row-label="Demand Inbox"') < html.indexOf('data-row-label="Search history"'),
  'Demand Inbox must appear before Search history.',
);
for (const label of [
  'Demand Inbox',
  'Failed and weak searches that need a human decision.',
]) {
  assert.ok(html.includes(label), `admin.html is missing ${label}.`);
}

for (const field of [
  "label: 'Query'",
  "label: 'Issue'",
  "label: 'Channel'",
  "label: 'Language'",
  "label: 'Country'",
  "label: 'Result count'",
  "label: 'Searches'",
  "label: 'Action'",
]) {
  assert.ok(frontend.includes(field), `Demand Inbox is missing ${field}.`);
}

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

assert.ok(api.includes('filteredDemandRows'), 'Demand Inbox does not use the v2 search payload.');
assert.ok(api.includes('historyEvidenceRows'), 'Demand Inbox does not use trusted final search rows.');
assert.ok(api.includes('dataRows.query_reviews'), 'Demand Inbox does not join human review actions.');
assert.ok(frontend.includes("apiRequest('/v2/search/review'"), 'Demand Inbox uses the wrong review endpoint.');
assert.ok(rollback.includes('Cannot restore the old review action constraint'), 'Rollback does not protect stored actions.');

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
  visible_fields: ['query', 'issue', 'channel', 'language', 'country', 'result_count', 'searches', 'action'],
  actions: ['add_icon', 'add_alias', 'improve_ranking', 'improve_docs', 'watch', 'ignore', 'resolved'],
  automatic_product_writes: 0,
}, null, 2));
