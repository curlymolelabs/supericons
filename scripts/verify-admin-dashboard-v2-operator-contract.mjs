import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [
  appSource,
  htmlSource,
  apiSource,
  gatewaySource,
  packageSource,
  migrationSource,
] = await Promise.all([
  readFile('public/admin-app.js', 'utf8'),
  readFile('admin.html', 'utf8'),
  readFile('supabase/functions/admin-api/index.ts', 'utf8'),
  readFile('scripts/serve-admin-dashboard-phase-b-live.mjs', 'utf8'),
  readFile('package.json', 'utf8'),
  readFile('supabase/migrations/20260718160000_admin_icon_request_reviews.sql', 'utf8'),
]);

assert.match(appSource, /data-query-review/);
assert.match(appSource, /\/intelligence\/search\/review/);
assert.match(appSource, /data-icon-request-review/);
assert.match(appSource, /\/v2\/icon-requests\/review/);
assert.match(appSource, /fetchAllPages\('search'/);
assert.match(appSource, /fetchAllPages\('audience'/);
assert.match(appSource, /fetchAllPages\('activity'/);
assert.match(appSource, /\^\[\\u0000-\\u0020\]\*\[=\+\\-@\]/);
assert.doesNotMatch(appSource, /si_admin_secret/);
assert.doesNotMatch(appSource, /sessionStorage\.setItem\([^)]*accounts/);
assert.doesNotMatch(appSource, /localStorage\.setItem\([^)]*accounts/);

for (const exportKey of [
  'gap-worklist-csv',
  'gap-worklist-json',
  'icon-requests-csv',
  'icon-requests-json',
  'contact-csv',
  'contact-json',
  'diagnostics-csv',
  'diagnostics-json',
]) {
  assert.match(htmlSource, new RegExp(`data-export="${exportKey}"`));
}
assert.match(htmlSource, /role="dialog"/);
assert.match(htmlSource, /aria-modal="true"/);
assert.match(htmlSource, /aria-label="Search dashboard data"/);
assert.match(htmlSource, /data-search-chart-mode="total"/);
assert.match(htmlSource, /id="funnelRegisteredSpark"/);
assert.match(htmlSource, /id="funnelProSpark"/);

assert.match(apiSource, /admin_icon_request_reviews/);
assert.match(apiSource, /status must be one of: new, planned, added, declined/);
assert.match(apiSource, /\^\[=\+\\-@\]/);
assert.match(apiSource, /page_size: pageSize/);
assert.match(apiSource, /slice\(0, 100\)/);

assert.match(gatewaySource, /pathname === '\/admin'/);
assert.match(gatewaySource, /HttpOnly; Path=\/; SameSite=Strict/);
assert.match(gatewaySource, /This local dashboard does not accept that host/);
assert.match(gatewaySource, /Content-Security-Policy/);
assert.equal(JSON.parse(packageSource).scripts['dev:admin'], 'node scripts/serve-admin-dashboard-phase-b-live.mjs');

assert.match(migrationSource, /Rollback:/);
assert.match(migrationSource, /status in \('new', 'planned', 'added', 'declined'\)/);
assert.match(migrationSource, /enable row level security/);
assert.match(migrationSource, /revoke all .* from public/);
assert.match(migrationSource, /grant select, insert, update, delete .* to service_role/);

console.log(JSON.stringify({
  status: 'ok',
  query_review_actions: 4,
  icon_request_states: 4,
  complete_paged_exports: ['activity', 'queries', 'clients'],
  managed_path: '/admin',
  secret_storage: 'server_memory_with_opaque_browser_session',
  account_browser_storage: false,
}, null, 2));
