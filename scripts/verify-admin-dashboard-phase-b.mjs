import { readFile } from 'node:fs/promises';

const html = await readFile('admin.html', 'utf8');
const app = await readFile('public/admin-app.js', 'utf8');
const prd = await readFile('docs/admin-dashboard-v2-prd-2026-07-17.md', 'utf8');
const mockup = await readFile('mockups/admin-dashboard-v2-mockup-2026-07-17.html', 'utf8');

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
  'includeTestTraffic',
  'kpiClients',
  'kpiSearches',
  'kpiZero',
  'kpiLow',
  'searchesChart',
  'clientsChart',
  'qualityChart',
  'latestActivity',
  'queryExplorer',
  'gapWorklist',
  'iconRequests',
  'contactInbox',
  'diagnosticsDrawer',
  'audienceChart',
  'registeredUsers',
  'registeredUsersSubtitle',
  'toggleRegisteredEmails',
  'allClients',
  'Top lists',
  'Returned',
  'Copied',
  'Latest Activity',
].forEach((value) => includes(html, value, 'admin.html'));

[
  '>Stats<',
  '>Audit Log<',
  'intelligenceRawSignalsTable',
  'queryEvidenceTable',
  'raw evidence table',
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
  'Mixed: ${formatNumber(row.zero_attempt_count)} of ${formatNumber(row.attempt_count)} zero',
  'row.result_count_reason',
  'row.country_reason',
  'Lookup completed',
  'Client-days across the selected period',
  'No sign-in recorded',
  'Last active uses account sign-in',
  'renderPagination',
  'iconSvg',
].forEach((value) => includes(app, value, 'public/admin-app.js'));

[
  'Direct search',
  'Plan not captured',
  'Location not captured',
  'Visitor details not captured',
  'No data available',
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
