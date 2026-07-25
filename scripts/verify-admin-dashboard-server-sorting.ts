import {
  parseDashboardV2Sort,
  sortDashboardV2Rows,
} from '../supabase/functions/admin-api/index.ts';

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

function assertEqual<T>(actual: T, expected: T, message: string) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${message} Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}.`);
  }
}

const definitions = {
  label: { type: 'text' as const, value: (row: Record<string, unknown>) => row.label },
  count: { type: 'number' as const, value: (row: Record<string, unknown>) => row.count },
  seen: { type: 'date' as const, value: (row: Record<string, unknown>) => row.seen },
};

Deno.test('accepts only declared sort fields and directions', () => {
  const empty = parseDashboardV2Sort(new URL('https://example.test/v2/search'), definitions);
  assert(empty === null, 'A request without sort_by must preserve the existing order.');

  const defaultDirection = parseDashboardV2Sort(
    new URL('https://example.test/v2/search?sort_by=count'),
    definitions,
  );
  assertEqual(defaultDirection, { key: 'count', direction: 'desc' }, 'The default direction is wrong.');

  const ascending = parseDashboardV2Sort(
    new URL('https://example.test/v2/search?sort_by=label&sort_direction=asc'),
    definitions,
  );
  assertEqual(ascending, { key: 'label', direction: 'asc' }, 'Ascending sorting was not accepted.');

  let invalidField = '';
  try {
    parseDashboardV2Sort(new URL('https://example.test/v2/search?sort_by=private_field'), definitions);
  } catch (error) {
    invalidField = error instanceof Error ? error.message : String(error);
  }
  assert(invalidField === 'The dashboard sort column is invalid.', 'An undeclared field was not rejected.');

  let invalidDirection = '';
  try {
    parseDashboardV2Sort(
      new URL('https://example.test/v2/search?sort_by=count&sort_direction=sideways'),
      definitions,
    );
  } catch (error) {
    invalidDirection = error instanceof Error ? error.message : String(error);
  }
  assert(invalidDirection === 'The dashboard sort direction is invalid.', 'An invalid direction was not rejected.');
});

Deno.test('sorts the complete row list while keeping missing values last', () => {
  const rows = [
    { id: 'missing', label: null, count: null, seen: null },
    { id: 'second', label: 'Beta 10', count: 10, seen: '2026-07-20T00:00:00Z' },
    { id: 'first', label: 'alpha', count: 2, seen: '2026-07-18T00:00:00Z' },
    { id: 'tie', label: 'Beta 2', count: 10, seen: '2026-07-19T00:00:00Z' },
  ];

  const ids = (values: Array<Record<string, unknown>>) => values.map((row) => row.id);
  assertEqual(
    ids(sortDashboardV2Rows(rows, { key: 'count', direction: 'desc' }, definitions)),
    ['second', 'tie', 'first', 'missing'],
    'Descending numeric sorting is wrong.',
  );
  assertEqual(
    ids(sortDashboardV2Rows(rows, { key: 'count', direction: 'asc' }, definitions)),
    ['first', 'second', 'tie', 'missing'],
    'Ascending numeric sorting is wrong.',
  );
  assertEqual(
    ids(sortDashboardV2Rows(rows, { key: 'label', direction: 'asc' }, definitions)),
    ['first', 'tie', 'second', 'missing'],
    'Natural text sorting is wrong.',
  );
  assertEqual(
    ids(sortDashboardV2Rows(rows, { key: 'seen', direction: 'desc' }, definitions)),
    ['second', 'tie', 'first', 'missing'],
    'Descending date sorting is wrong.',
  );
  assertEqual(
    ids(sortDashboardV2Rows(rows, null, definitions)),
    ['missing', 'second', 'first', 'tie'],
    'A request without sorting changed the existing order.',
  );
  assertEqual(ids(rows), ['missing', 'second', 'first', 'tie'], 'Sorting mutated the source rows.');
});
