import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const localeNames = [
  'ar',
  'de',
  'en',
  'es',
  'hi',
  'ja',
  'ko',
  'pt',
  'th',
  'vi',
  'zh-Hans',
  'zh-Hant',
];

const [
  html,
  main,
  style,
  intelligence,
  adminApp,
  adminApi,
  migration,
  ...localeSources
] = await Promise.all([
  readFile('index.html', 'utf8'),
  readFile('main.js', 'utf8'),
  readFile('style.css', 'utf8'),
  readFile('lib/icon-intelligence.js', 'utf8'),
  readFile('public/admin-app.js', 'utf8'),
  readFile('supabase/functions/admin-api/index.ts', 'utf8'),
  readFile('supabase/migrations/20260727120000_icon_request_events.sql', 'utf8'),
  ...localeNames.map((locale) => readFile(`public/i18n/messages/${locale}.json`, 'utf8')),
]);

for (const [path, source] of [
  ['index.html', html],
  ['main.js', main],
  ['style.css', style],
  ['lib/icon-intelligence.js', intelligence],
  ['public/admin-app.js', adminApp],
  ['supabase/functions/admin-api/index.ts', adminApi],
  ['supabase/migrations/20260727120000_icon_request_events.sql', migration],
]) {
  assert.doesNotMatch(source, /[\u2013\u2014]/u, `${path} contains a forbidden dash character.`);
}

for (const marker of [
  'id="sidebarIconRequest"',
  'data-i18n="app.requestIcon"',
  'class="sidebar-icon sidebar-request-icon"',
  'class="sidebar-request-icon__plus"',
  'id="iconRequestPanel"',
  'id="iconRequestBackdrop"',
  'id="iconRequestCard"',
  'id="iconRequestClose"',
  'id="noResultsFeedbackForm"',
]) {
  assert.ok(html.includes(marker), `Website markup is missing ${marker}.`);
}
assert.ok(
  html.indexOf('id="iconRequestPanel"') > html.indexOf('id="gridEmpty"'),
  'The request panel is not placed after the grid empty state.',
);

for (const surface of [
  'grid_empty_feedback',
  'grid_low_result_feedback',
  'sidebar_request',
]) {
  assert.ok(main.includes(`'${surface}'`), `Website logic is missing ${surface}.`);
  assert.ok(adminApi.includes(`'${surface}'`), `Admin API is missing ${surface}.`);
  assert.ok(adminApp.includes(`${surface}:`), `Admin source labels are missing ${surface}.`);
}

assert.ok(main.includes('resultCount > 2'), 'Low-result visibility is not capped at 2 results.');
assert.ok(main.includes('resultCount === 0'), 'Zero-result requests are not distinguished.');
assert.ok(main.includes('iconRequestOpenedFromSidebar'), 'Sidebar request state is missing.');
assert.ok(main.includes('els.noResultsFeedbackInput.value = query'), 'Sidebar query prefill is missing.');
assert.ok(main.includes('getIconRequestStateKey'), 'Sidebar request context invalidation is missing.');
assert.ok(
  main.includes("classList.toggle('icon-request-panel--modal', modalVisible)"),
  'Sidebar requests do not use the request modal.',
);
assert.ok(
  !main.includes('els.iconRequestPanel?.scrollIntoView'),
  'The sidebar request still scrolls into the infinite grid.',
);
assert.ok(
  main.includes('clearSidebarIconRequestContext({ preserveStatus: true })'),
  'Successful sidebar requests do not clear their stored context.',
);
assert.ok(
  main.includes('new MutationObserver(() =>'),
  'View changes do not invalidate request-form context.',
);
assert.ok(
  !main.includes("t('app.iconRequestSearchFirst')"),
  'Standalone sidebar requests are still blocked by the search-first guard.',
);
assert.ok(
  style.includes('.icon-request-panel--modal')
    && style.includes('position: fixed;'),
  'The request modal is not fixed to the viewport.',
);
const sidebarButtonRule = style.match(/\.sidebar__item--button\s*\{[\s\S]*?\}/u)?.[0] || '';
assert.ok(sidebarButtonRule, 'The request sidebar button style is missing.');
assert.ok(
  !sidebarButtonRule.includes('font: inherit'),
  'The request sidebar button overrides the shared sidebar font size.',
);
assert.ok(
  style.includes('.sidebar__item--button:hover .sidebar-request-icon__plus')
    && style.includes('@keyframes sidebar-request-plus-pop'),
  'The request sidebar plus hover animation is missing.',
);

const writerStart = intelligence.indexOf('export async function logIconRequest');
const writerEnd = intelligence.indexOf('export async function fetchPopularityMap');
assert.ok(writerStart >= 0 && writerEnd > writerStart, 'The icon request writer is missing.');
const writer = intelligence.slice(writerStart, writerEnd);
assert.ok(writer.includes("postRpc('si_log_icon_request'"), 'The writer does not use the dedicated RPC.');
assert.ok(!writer.includes("p_signal_type: 'search_attempt'"), 'The writer fabricates a search attempt.');
assert.ok(writer.includes('p_result_count: safeResultCount'), 'The writer drops the result count.');
assert.ok(!writer.includes('p_created_at'), 'The writer supplies a caller-controlled creation time.');

assert.ok(
  adminApi.includes(".in('signal_type', [...ICON_REQUEST_SIGNAL_TYPES])"),
  'Demand Inbox does not read legacy and dedicated request signals together.',
);
assert.ok(
  adminApi.includes(".neq('signal_type', 'icon_request')"),
  'Dedicated requests can enter search analytics.',
);
for (const field of ['ui_surface: row.ui_surface', 'result_count: optionalNonnegativeInteger(row.result_count)']) {
  assert.ok(adminApi.includes(field), `The v2 response mapper is missing ${field}.`);
}
for (const label of ["label: 'Source'", "label: 'Results'"]) {
  assert.ok(adminApp.includes(label), `Demand Inbox is missing ${label}.`);
}

assert.ok(migration.includes('create or replace function public.si_log_icon_request'));
assert.ok(migration.includes('p_result_count integer default null'));
assert.ok(migration.includes("'icon_request'"));
assert.ok(migration.includes("timezone('utc', now())"));
assert.ok(!migration.includes('p_created_at'));
assert.ok(!migration.includes('create or replace function public.si_log_icon_evidence'));

for (const [index, source] of localeSources.entries()) {
  const catalog = JSON.parse(source);
  assert.equal(
    typeof catalog.app?.requestIcon,
    'string',
    `Locale ${localeNames[index]} is missing app.requestIcon.`,
  );
  assert.ok(catalog.app.requestIcon.trim(), `Locale ${localeNames[index]} has an empty app.requestIcon.`);
}

console.log(JSON.stringify({
  status: 'ok',
  entry_points: ['grid_empty_feedback', 'grid_low_result_feedback', 'sidebar_request'],
  dedicated_request_rpc: true,
  search_analytics_separation: true,
  demand_inbox_source_and_result_columns: true,
  locale_catalogs_verified: localeNames.length,
}, null, 2));
