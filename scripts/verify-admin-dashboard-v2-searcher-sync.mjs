import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const files = Object.fromEntries(await Promise.all([
  'admin.html',
  'public/admin-app.js',
  'lib/admin-dashboard-v2.js',
  'supabase/functions/admin-api/index.ts',
  'docs/admin-dashboard-v2-search-ids-and-page-sync-fix-plan-2026-07-18.md',
].map(async (path) => [path, await readFile(new URL(`../${path}`, import.meta.url), 'utf8')])));

const html = files['admin.html'];
const app = files['public/admin-app.js'];
const helpers = files['lib/admin-dashboard-v2.js'];
const api = files['supabase/functions/admin-api/index.ts'];
const plan = files['docs/admin-dashboard-v2-search-ids-and-page-sync-fix-plan-2026-07-18.md'];

for (const [label, source] of [['dashboard HTML', html], ['dashboard UI code', app]]) {
  for (const forbidden of [
    'privacy-safe identifier',
    'Observed ID',
    'Search ID',
    'Client-days',
    'client-days',
  ]) {
    assert.ok(
      !source.includes(forbidden),
      `${label} still exposes the old or intermediate term "${forbidden}".`,
    );
  }
}

assert.match(html, /Searchers seen in the selected period/);
assert.match(html, />Searchers</);
assert.match(app, /function searcherCountLabel\(/);
assert.match(app, /Searcher details/);
assert.match(app, /data-searcher-details/);
assert.match(app, /label: 'Last sign-in'/);
assert.match(app, /label: 'Last search'/);
assert.match(app, /params\.set\('view_id'/);
assert.match(app, /params\.set\('data_cutoff'/);
assert.match(app, /params\.set\('filter_key'/);
assert.match(app, /function acceptsDashboardView\(/);
assert.match(app, /payload\?\.meta\?\.view_id/);
assert.match(app, /payload\?\.meta\?\.data_cutoff/);
assert.match(app, /payload\?\.meta\?\.filter_key/);

assert.match(helpers, /view_id/);
assert.match(helpers, /data_cutoff/);
assert.match(helpers, /filter_key/);
assert.match(api, /view_id: filters\.view_id/);
assert.match(api, /data_cutoff: filters\.data_cutoff/);
assert.match(api, /filter_key: filters\.filter_key/);
assert.match(api, /metric_scope: 'filtered_search_activity'/);
assert.match(api, /metric_scope: 'filtered_search_activity_and_all_time_accounts'/);
assert.match(api, /completeness:/);
assert.ok(
  !api.includes("const identityFilters = { ...filters, q: '' };"),
  'Audience still clears the text filter before computing reach and activity.',
);
assert.match(api, /last_search:/);
assert.match(plan, /^# Admin dashboard searchers and page sync fix plan/m);

console.log(JSON.stringify({
  status: 'ok',
  checks: 35,
  contract: 'admin_dashboard_v2_searcher_sync',
}, null, 2));
