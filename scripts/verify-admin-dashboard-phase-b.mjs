import { readFile } from 'node:fs/promises';

const html = await readFile('admin.html', 'utf8');
const app = await readFile('public/admin-app.js', 'utf8');
const prd = await readFile('docs/admin-dashboard-v2-prd-2026-07-17.md', 'utf8');
const mockup = await readFile('mockups/admin-dashboard-v2-mockup-2026-07-17.html', 'utf8');
const launcher = await readFile('start-admin-dashboard.cmd', 'utf8');
const runbook = await readFile('docs/admin-dashboard-v2-runbook.md', 'utf8');
const logo = await readFile('brand/supericons-logo.svg', 'utf8');

function includes(source, value, label) {
  if (!source.includes(value)) throw new Error(`${label} is missing: ${value}`);
}

function excludes(source, value, label) {
  if (source.includes(value)) throw new Error(`${label} still contains: ${value}`);
}

[
  'nav-overview',
  'nav-intelligence',
  'nav-audience',
  'section-overview',
  'section-intelligence',
  'section-audience',
  'globalSearch',
  'customFrom',
  'customTo',
  'channelFilter',
  'includeSearchTestTraffic',
  'searchDownloadToggle',
  'searchDownloadPopover',
  'kpiClients',
  'kpiSearches',
  'kpiZero',
  'kpiLow',
  'searchesChart',
  'clientsChart',
  'qualityChart',
  'latestActivity',
  'queryExplorer',
  'audienceChart',
  'registeredUsers',
  'registeredUsersSubtitle',
  'toggleRegisteredEmails',
  'allClients',
  'Top lists',
  'Returned',
  'Copied',
  'Latest Activity',
  '<span class="nav-label">Searches</span>',
  '<span class="nav-label">Users</span>',
  '>Search summary<',
  '<strong>Request log</strong>',
  '<strong>Audit bundle</strong>',
  'One row per unique query. For quick analysis.',
  'One row per tool call. Ground truth.',
  'Everything plus integrity checks. For verification.',
].forEach((value) => includes(html, value, 'admin.html'));

[
  '>Stats<',
  '>Audit Log<',
  'intelligenceRawSignalsTable',
  'queryEvidenceTable',
  'raw evidence table',
  'gapWorklist',
  'iconRequests',
  'contactInbox',
  'diagnosticsDrawer',
  'data-row-label="Gap worklist"',
  'data-row-label="Icon requests"',
  'data-row-label="Contact inbox"',
  '<strong>Table CSV</strong>',
  '>Download CSV<',
].forEach((value) => excludes(html, value, 'admin.html'));

[
  'return `/v2/${endpoint}?${params}`',
  "loadEndpoint('activity'",
  "loadEndpoint('overview'",
  "loadEndpoint('search'",
  "loadEndpoint('audience'",
  "loadEndpoint('accounts'",
  'loadLegacyActivity',
  'loadLegacyOverview',
  'loadLegacySearch',
  'loadLegacyAudience',
  'CACHE_TTL_MS = 30_000',
  'renderSearchBars',
  'renderLineChart',
  'exportRows',
  "state.topList = button.dataset.topList",
  "state.filters.window = button.dataset.window",
  'include_test',
  'User query',
  'Known defects and errors are excluded',
  'Clarification',
  'audit-bundle-json',
  'row.result_count_reason',
  'row.country_reason',
  'Icon not found',
  'recommendations',
  'Daily reach across the selected period',
  'No sign-in recorded',
  'Last sign-in',
  'Last search',
  'renderPagination',
  'iconSvg',
  "SEARCH_EXPORT_SCHEMA_VERSION = '3.1'",
  "'supericons-search-summary'",
  "'supericons-request-log'",
  "'supericons-audit-bundle'",
  'integrity_checks',
].forEach((value) => includes(app, value, 'public/admin-app.js'));

[
  'Direct search',
  'Plan not captured',
  'Location not captured',
  'Visitor details not captured',
  'No data available',
  'primary pick',
].forEach((value) => excludes(app, value, 'public/admin-app.js'));

[
  'Top returned icons',
  'SUPPORTED are labeled unavailable-data states',
  'V2.1 UI on existing API',
  'V2.2 API extensions',
  'V2.3 Discovery-dependent',
].forEach((value) => includes(prd, value, 'v2 PRD'));

[
  '>Searched<',
  '>Returned<',
  '>Copied<',
  '>Zero<',
].forEach((value) => includes(mockup, value, 'v2 mockup'));

[
  'npm run dev:admin',
  'http://127.0.0.1:4178/admin',
].forEach((value) => includes(launcher, value, 'start-admin-dashboard.cmd'));
excludes(launcher, 'ADMIN_SECRET', 'start-admin-dashboard.cmd');

[
  'One working dashboard',
  'start-admin-dashboard.cmd',
  'The file under `mockups/` is a design reference with example data.',
  'The page asks for the current temporary admin secret.',
  'Closing the server forgets the secret.',
].forEach((value) => includes(runbook, value, 'admin dashboard runbook'));

excludes(html, 'id="requestBadge"', 'admin.html');
excludes(app, 'requestBadge', 'public/admin-app.js');
includes(html, 'src="/brand/supericons-logo.svg"', 'admin.html');
excludes(html, 'class="brand-mark"', 'admin.html');
excludes(html, 'class="brand-name"', 'admin.html');
includes(logo, '<text x="152" y="138" class="brand">Supericons</text>', 'Supericons logo');

const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
const duplicateIds = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
if (duplicateIds.length) throw new Error(`admin.html has duplicate ids: ${duplicateIds.join(', ')}`);

const navButtons = [...html.matchAll(/class="nav-button[^"]*"/g)];
if (navButtons.length !== 3) throw new Error(`Expected exactly three navigation buttons, found ${navButtons.length}.`);

for (const match of html.matchAll(/font-size:\s*([0-9.]+)px/g)) {
  const size = Number(match[1]);
  if (Number.isFinite(size) && size < 11) {
    throw new Error(`admin.html contains dashboard text smaller than 11px: ${size}px.`);
  }
}

for (const match of app.matchAll(/font-size="([0-9.]+)"/g)) {
  const size = Number(match[1]);
  if (Number.isFinite(size) && size < 12) {
    throw new Error(`public/admin-app.js contains a chart label smaller than 12px: ${size}px.`);
  }
}

for (const [path, source] of [
  ['admin.html', html],
  ['public/admin-app.js', app],
  ['docs/admin-dashboard-v2-prd-2026-07-17.md', prd],
]) {
  if (/[\u2013\u2014]/u.test(source)) throw new Error(`${path} contains a forbidden dash character.`);
}

console.log('Admin dashboard V2.1 contract checks passed.');
