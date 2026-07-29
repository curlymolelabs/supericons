import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = (await readFile(new URL('../public/admin-app.js', import.meta.url), 'utf8'))
  .replace(/\binitializeDashboard\(\);\s*$/, '');
const context = vm.createContext({
  AbortController,
  Blob,
  URL,
  URLSearchParams,
  console,
  crypto,
  fetch,
  navigator: {},
  document: {
    querySelector: () => null,
    querySelectorAll: () => [],
  },
  window: {
    __SI_ADMIN_RUNTIME__: {},
    clearTimeout,
    crypto,
    localStorage: {
      getItem: () => null,
      removeItem: () => {},
      setItem: () => {},
    },
    setTimeout,
  },
});
vm.runInContext(source, context);

const partitions = vm.runInContext(`
  state.filters.window = '30d';
  state.view = {
    id: 'partition_test',
    cutoff: '2026-07-29T11:36:49.000Z',
    filterKey: '',
  };
  searchEventExportPartitions();
`, context);
assert.deepEqual(
  JSON.parse(JSON.stringify(partitions)),
  [
    { from: '2026-06-30', to: '2026-07-06' },
    { from: '2026-07-07', to: '2026-07-13' },
    { from: '2026-07-14', to: '2026-07-20' },
    { from: '2026-07-21', to: '2026-07-27' },
    { from: '2026-07-28', to: '2026-07-29' },
  ],
);

const shortPeriod = vm.runInContext(`
  state.filters.window = '7d';
  searchEventExportPartitions();
`, context);
assert.equal(shortPeriod.length, 0);

const customPartitions = vm.runInContext(`
  state.filters.window = 'custom';
  state.filters.from = '2026-07-01';
  state.filters.to = '2026-07-08';
  searchEventExportPartitions();
`, context);
assert.deepEqual(
  JSON.parse(JSON.stringify(customPartitions)),
  [
    { from: '2026-07-01', to: '2026-07-07' },
    { from: '2026-07-08', to: '2026-07-08' },
  ],
);

context.exportFixtures = [
  {
    partition: { from: '2026-07-01', to: '2026-07-07' },
    events: [{ id: 'first', created_at: '2026-07-02T00:00:00Z' }],
    events_complete: true,
    events_export_available: true,
    snapshot_id: 'snapshot-first',
    event_counts: { top_level: 1, diagnostics: 3 },
    field_coverage: {
      country_code: { recorded: 1, total: 1, rate: 1 },
    },
    source_reconciliation: {
      status: 'passed',
      checks: { source_rows_complete: true, audit_rows_accounted: true },
      counts: { eligible_audit_rows: 3, unexplained_rows: 0 },
      audit_linkage_counts: { episode_id: 3, unexplained: 0 },
      web_diagnostic_linkage_counts: { episode_id: 0, unexplained: 0 },
      usage_accounting_counts: { linked_final: 1, unexplained: 0 },
      outside_verified_coverage: {
        local_mcp_before_cutover: 0,
        local_mcp_coverage_cutover_at: '2026-07-01T00:00:00Z',
      },
      unexplained_breakdown: {
        audit_by_channel: {},
        web_diagnostic_by_channel: {},
        first_observed_at: null,
        last_observed_at: null,
      },
    },
    definitions: { grain: 'One event.' },
    meta: { generation_ms: 120, from: '2026-07-01T00:00:00Z' },
  },
  {
    partition: { from: '2026-07-08', to: '2026-07-08' },
    events: [{ id: 'second', created_at: '2026-07-08T00:00:00Z' }],
    events_complete: true,
    events_export_available: true,
    snapshot_id: 'snapshot-second',
    event_counts: { top_level: 2, diagnostics: 4 },
    field_coverage: {
      country_code: { recorded: 1, total: 3, rate: 0.3333 },
    },
    source_reconciliation: {
      status: 'needs_attention',
      checks: { source_rows_complete: true, audit_rows_accounted: false },
      counts: { eligible_audit_rows: 4, unexplained_rows: 1 },
      audit_linkage_counts: { episode_id: 3, unexplained: 1 },
      web_diagnostic_linkage_counts: { episode_id: 0, unexplained: 0 },
      usage_accounting_counts: { linked_final: 2, unexplained: 0 },
      outside_verified_coverage: {
        local_mcp_before_cutover: 0,
        local_mcp_coverage_cutover_at: '2026-07-01T00:00:00Z',
      },
      unexplained_breakdown: {
        audit_by_channel: { hosted_mcp: 1 },
        web_diagnostic_by_channel: {},
        first_observed_at: '2026-07-08T00:00:00Z',
        last_observed_at: '2026-07-08T00:00:00Z',
      },
    },
    definitions: { grain: 'One event.' },
    meta: { generation_ms: 80, to_exclusive: '2026-07-09T00:00:00Z' },
  },
];
const merged = vm.runInContext(`
  state.filters.window = 'custom';
  state.filters.from = '2026-07-01';
  state.filters.to = '2026-07-08';
  mergeSearchEventExports(exportFixtures, 'audit');
`, context);
const result = JSON.parse(JSON.stringify(merged));
assert.deepEqual(result.events.map((event) => event.id), ['second', 'first']);
assert.deepEqual(result.event_counts, { top_level: 3, diagnostics: 7 });
assert.deepEqual(result.field_coverage.country_code, {
  recorded: 2,
  total: 4,
  rate: 0.5,
});
assert.equal(result.source_reconciliation.status, 'needs_attention');
assert.equal(result.source_reconciliation.checks.audit_rows_accounted, false);
assert.equal(result.source_reconciliation.counts.eligible_audit_rows, 7);
assert.equal(result.source_reconciliation.counts.unexplained_rows, 1);
assert.equal(result.source_reconciliation.unexplained_breakdown.audit_by_channel.hosted_mcp, 1);
assert.equal(result.meta.export_partition_count, 2);
assert.equal(result.meta.generation_ms, 200);

const apiSource = await readFile(
  new URL('../supabase/functions/admin-api/index.ts', import.meta.url),
  'utf8',
);
const pageSizeLimits = [...apiSource.matchAll(
  /const pageSize = parsePositiveInt\(url\.searchParams\.get\('page_size'\), 50, (\d+)\);/g,
)].map((match) => Number(match[1]));
assert.equal(pageSizeLimits[0], 100);
assert.equal(pageSizeLimits[1], 500);

assert.match(source, /const EXPORT_REQUEST_TIMEOUT_MS = 60_000;/);
assert.match(source, /const SEARCH_EVENT_EXPORT_PAGE_SIZE = 500;/);
assert.match(source, /requestTimeoutMs: EXPORT_REQUEST_TIMEOUT_MS/);

console.log('Admin search export partitioning verification passed.');
