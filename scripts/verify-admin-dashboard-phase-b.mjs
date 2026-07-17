import { readFile } from 'node:fs/promises';

const html = await readFile('admin.html', 'utf8');
const app = await readFile('public/admin-app.js', 'utf8');
const inventory = await readFile('docs/admin-dashboard-phase-b-component-inventory.md', 'utf8');

function expectIncludes(source, value, label) {
  if (!source.includes(value)) {
    throw new Error(`${label} is missing: ${value}`);
  }
}

function expectExcludes(source, value, label) {
  if (source.includes(value)) {
    throw new Error(`${label} still contains: ${value}`);
  }
}

[
  'phaseBKpiStrip',
  'phaseBLatestActivity',
  'phaseBGapPanel',
  'phaseBRefreshStatus',
  'intelligenceRawSignalsDetails',
  'Estimated unique clients',
  'Real searches',
  'True zero rate',
  'Low-result rate',
  'Gap Worklist',
  'Diagnostics',
  'Search dashboard...',
].forEach((value) => expectIncludes(html, value, 'admin.html'));

[
  'queryExplorerEnvironmentFilter',
  'queryExplorerChannelFilter',
  'queryExplorerSearch',
  'queryExplorerPurposeFilter',
].forEach((value) => expectExcludes(html, `id="${value}"`, 'admin.html duplicate filters'));

[
  'loadPhaseBDashboard',
  'renderPhaseBDashboard',
  'readPhaseBCache',
  'writePhaseBCache',
  "params.set('query_origin', 'agent_query')",
  'quickReviewQuery',
  'phaseBVisitorLabel',
  'phaseBOriginLabel',
  'refresh-spinner',
].forEach((value) => expectIncludes(app, value, 'public/admin-app.js'));

[
  'Plan not captured',
  'Location not captured',
  'Visitor details not captured',
  'Audience not captured',
  'country not captured',
].forEach((value) => expectExcludes(app, value, 'public/admin-app.js default copy'));

[
  'Global filter bar',
  'KPI strip',
  'Latest Activity',
  'Gap Worklist',
  'Diagnostics',
].forEach((value) => expectIncludes(inventory, value, 'component inventory'));

const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
const duplicates = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
if (duplicates.length) {
  throw new Error(`admin.html has duplicate ids: ${duplicates.join(', ')}`);
}

for (const [path, source] of [
  ['admin.html', html],
  ['public/admin-app.js', app],
  ['docs/admin-dashboard-phase-b-component-inventory.md', inventory],
]) {
  if (/[\u2013\u2014]/u.test(source)) {
    throw new Error(`${path} contains a forbidden dash character.`);
  }
}

console.log('Admin dashboard Phase B contract checks passed.');
