import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const appPath = resolve(process.cwd(), 'public/admin-app.js');
const source = readFileSync(appPath, 'utf8');

// Skips the parameter list before brace matching so destructured parameters such as
// `function table(headers, rows, reason, { sortTableKey = '' })` do not end extraction early.
function extractFunction(name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `public/admin-app.js no longer defines ${name}`);
  let parens = 0;
  let bodyStart = -1;
  for (let index = start + `function ${name}`.length; index < source.length; index += 1) {
    const character = source[index];
    if (character === '(') parens += 1;
    else if (character === ')') {
      parens -= 1;
      if (parens === 0) {
        bodyStart = source.indexOf('{', index);
        break;
      }
    }
  }
  assert.notEqual(bodyStart, -1, `Could not locate the body of ${name}`);
  let depth = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1;
    if (source[index] === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  throw new Error(`Unterminated function ${name} in public/admin-app.js`);
}

const sandbox = [
  'function normalizeList(value) { return Array.isArray(value) ? value : []; }',
  'function emptyState(reason) { return `<div class="empty">${reason}</div>`; }',
  'const state = { sorts: {} };',
  extractFunction('escapeHtml'),
  extractFunction('sortableHeaders'),
  extractFunction('headerSortValue'),
  extractFunction('isMissingSortValue'),
  extractFunction('compareSortValues'),
  extractFunction('activeSort'),
  extractFunction('sortRows'),
  extractFunction('sortIndicator'),
  extractFunction('tableHeaderCell'),
  extractFunction('table'),
  'return { sortRows, table, state };',
].join('\n');

const { sortRows, table, state } = new Function(sandbox)();

const headers = [
  { label: 'User', sortKey: 'identifier' },
  { label: 'Signed up', sortKey: 'signup_at', sortType: 'date' },
  { label: 'Last search', sortKey: 'last_search', sortType: 'date' },
  { label: 'Searches', sortKey: 'searches', sortType: 'number' },
];

const users = [
  { identifier: 'b@example.com', signup_at: '2026-07-17T21:34:00Z', last_search: null, searches: null },
  { identifier: 'o@example.com', signup_at: '2026-07-24T18:50:00Z', last_search: '2026-07-25T06:54:00Z', searches: 15 },
  { identifier: 'a@example.com', signup_at: '2026-07-13T10:03:00Z', last_search: '2026-07-23T23:35:00Z', searches: 4 },
  { identifier: 'z@example.com', signup_at: '2026-07-15T06:23:00Z', last_search: null, searches: null },
];

const initials = (rows) => rows.map((row) => row.identifier[0]);

function sortUsers(key, direction) {
  state.sorts.registeredUsers = { key, direction };
  return initials(sortRows('registeredUsers', users, headers));
}

assert.deepEqual(sortUsers('signup_at', 'desc'), ['o', 'b', 'z', 'a'], 'Newest signup must lead a descending signup sort.');
assert.deepEqual(sortUsers('signup_at', 'asc'), ['a', 'z', 'b', 'o'], 'Oldest signup must lead an ascending signup sort.');
assert.deepEqual(sortUsers('searches', 'desc'), ['o', 'a', 'b', 'z'], 'Highest search count must lead a descending numeric sort.');
assert.deepEqual(sortUsers('identifier', 'asc'), ['a', 'b', 'o', 'z'], 'Text sorts alphabetically.');

// Rows without a recorded value must stay at the end in BOTH directions. Reversing the
// comparator alone would float unlinked accounts to the top of a descending sort.
assert.deepEqual(sortUsers('last_search', 'desc'), ['o', 'a', 'b', 'z'], 'Descending date sort keeps unrecorded rows last.');
assert.deepEqual(sortUsers('last_search', 'asc'), ['a', 'o', 'b', 'z'], 'Ascending date sort also keeps unrecorded rows last.');

const numeric = [{ n: '10' }, { n: '9' }, { n: '100' }];
const numericHeaders = [{ label: 'N', sortKey: 'n', sortType: 'number' }];
state.sorts.numeric = { key: 'n', direction: 'asc' };
assert.deepEqual(
  sortRows('numeric', numeric, numericHeaders).map((row) => row.n),
  ['9', '10', '100'],
  'Numeric columns must compare as numbers, not as text.',
);

state.sorts.unknown = { key: 'missing_column', direction: 'desc' };
assert.deepEqual(
  sortRows('unknown', numeric, numericHeaders).map((row) => row.n),
  ['10', '9', '100'],
  'An unknown sort key must leave the source order untouched.',
);

const ties = [{ k: 'x', id: 1 }, { k: 'x', id: 2 }, { k: 'x', id: 3 }];
state.sorts.ties = { key: 'k', direction: 'desc' };
assert.deepEqual(
  sortRows('ties', ties, [{ label: 'K', sortKey: 'k' }]).map((row) => row.id),
  [1, 2, 3],
  'Equal values must keep their original relative order.',
);

const mutable = [{ v: 3 }, { v: 1 }];
state.sorts.mutable = { key: 'v', direction: 'asc' };
sortRows('mutable', mutable, [{ label: 'V', sortKey: 'v', sortType: 'number' }]);
assert.deepEqual(mutable.map((row) => row.v), [3, 1], 'Sorting must not mutate the source rows.');

// Rendered header markup: sortable columns must be real buttons carrying accessible state.
const renderHeaders = [
  { label: 'User', sortKey: 'identifier', render: (row) => row.identifier },
  { label: 'Signed up', sortKey: 'signup_at', sortType: 'date', render: (row) => row.signup_at },
  { label: 'Searches', number: true, sortKey: 'searches', sortType: 'number', render: (row) => String(row.searches) },
  { label: 'Venues', render: () => 'Web' },
];
const renderRows = [{ identifier: 'a@example.com', signup_at: '2026-07-13', searches: 4 }];

delete state.sorts.registeredUsers;
const unsorted = table(renderHeaders, renderRows, 'none', { sortTableKey: 'registeredUsers' });
assert.equal((unsorted.match(/data-sort-key=/g) || []).length, 3, 'Every sortable column needs a sort control.');
assert.ok(unsorted.includes('<th class="">Venues</th>'), 'Columns without a sortKey stay plain headers.');
assert.doesNotMatch(unsorted, /aria-sort="(ascending|descending)"/, 'No column may claim a sort before one is chosen.');
assert.ok(unsorted.includes('class="number sortable"'), 'Numeric alignment survives the sortable header.');

state.sorts.registeredUsers = { key: 'signup_at', direction: 'desc' };
const descending = table(renderHeaders, renderRows, 'none', { sortTableKey: 'registeredUsers' });
assert.ok(descending.includes('aria-sort="descending"'), 'The active column must expose its direction to screen readers.');
assert.equal((descending.match(/aria-sort="(ascending|descending)"/g) || []).length, 1, 'Only one column may be marked sorted.');
assert.ok(descending.includes('sort-icon'), 'The active column shows a direction indicator.');
assert.ok(descending.includes('Click to sort ascending'), 'The tooltip states what the next click does.');

state.sorts.registeredUsers = { key: 'signup_at', direction: 'asc' };
assert.ok(
  table(renderHeaders, renderRows, 'none', { sortTableKey: 'registeredUsers' }).includes('aria-sort="ascending"'),
  'Ascending state must be exposed too.',
);

const blocked = table(renderHeaders, renderRows, 'none', {
  sortTableKey: 'queries',
  sortDisabledReason: 'Sorting needs the complete list.',
});
assert.doesNotMatch(blocked, /data-sort-key=/, 'A disabled sort must not offer clickable controls.');
assert.ok(blocked.includes('Sorting needs the complete list.'), 'A disabled sort must say why.');

assert.doesNotMatch(
  table(renderHeaders, renderRows, 'none'),
  /data-sort-key=/,
  'Tables rendered without a sort key stay plain.',
);

const hostile = table(
  [{ label: '<img src=x onerror=alert(1)>', sortKey: 'k', render: () => 'v' }],
  renderRows,
  'none',
  { sortTableKey: 'hostile' },
);
assert.doesNotMatch(hostile, /<img src=x/, 'Header labels must be escaped inside sort buttons.');

// Server-paginated lists must preserve API order rather than sorting one page locally.
assert.match(
  source,
  /partialServerPage\s*\?\s*values\s*:\s*sortRows\(/,
  'Server-paginated tables must skip client sorting while only part of the list is loaded.',
);
assert.match(
  source,
  /sortDisabledReason/,
  'A disabled sort must explain why it is unavailable.',
);
assert.match(
  source,
  /partialServerPage\s*&&\s*!serverSorting/,
  'A partial list may expose sorting only when the server sorts the complete filtered dataset.',
);
assert.match(
  source,
  /SERVER_PAGINATED_LISTS\.has\(tableKey\)\)\s*refreshListEndpoint\(tableKey\)/,
  'Sorting a server-paginated table must request a new API page.',
);
assert.match(
  source,
  /params\.set\('sort_by', sort\.key\)/,
  'Server sorting must send its selected column to the API.',
);
assert.match(
  source,
  /params\.set\('sort_direction', sort\.direction\)/,
  'Server sorting must send its selected direction to the API.',
);
assert.equal(
  (source.match(/serverSorting: true/g) || []).length,
  2,
  'Search history and Searchers must both use complete server sorting.',
);

for (const tableKey of ['registeredUsers', 'clients', 'queries', 'topList', 'worklist', 'iconRequests', 'contact']) {
  assert.match(
    source,
    new RegExp(`sortedTable(Parts)?\\(\\s*'${tableKey}'`),
    `Table ${tableKey} must render through the sorting helper.`,
  );
}

console.log('Admin dashboard table sorting checks passed.');
