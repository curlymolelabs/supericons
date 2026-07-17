import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  buildAdminRollups,
  buildEstimatedClientIdentity,
  classifySearchAttempt,
  deriveAuditQueryOrigin,
  deriveHostedMcpQueryOrigin,
  getRequestedLimitForTool,
  matchKnownDefect,
  mergeTelemetryEvidenceRows,
  queryOriginNeedsLegacyIconEvidence,
  readMcpQueryOrigin,
  splitCurrentUtcDay,
  summarizeRawSearchAttempts,
} from '../lib/admin-dashboard-metrics.js';

const defectRegistry = JSON.parse(readFileSync(
  new URL('../data/admin/known-search-defects.json', import.meta.url),
  'utf8',
));

const tests = [];

function test(name, run) {
  tests.push({ name, run });
}

function attempt(overrides = {}) {
  return {
    signal_type: 'search_attempt',
    source_table: 'mcp_usage_events',
    created_at: '2026-07-15T12:00:00.000Z',
    search_query: 'settings',
    library_filter: 'lucide',
    channel: 'hosted_mcp',
    environment: 'production',
    query_origin: 'agent_query',
    tool_name: 'search_icons',
    result_count: 5,
    requested_limit: 5,
    search_outcome: 'results',
    audit_status: 'ok',
    anonymous_client_hash: 'anon-a',
    ...overrides,
  };
}

test('derives origins without changing mcp-search', () => {
  assert.equal(deriveAuditQueryOrigin({ tool_name: 'recommend_icons' }), 'recommend_variant');
  assert.equal(deriveAuditQueryOrigin({ tool_name: 'get_icon' }), 'icon_lookup');
  assert.equal(deriveAuditQueryOrigin({ channel: 'web' }), 'agent_query');
  assert.equal(deriveAuditQueryOrigin({}), 'legacy_unknown');
  assert.equal(readMcpQueryOrigin({ query_origin: null }), 'legacy_unknown');
  assert.equal(deriveHostedMcpQueryOrigin('recommend_icons'), 'agent_query');
});

test('loads legacy icon evidence only for queue origins that can include it', () => {
  assert.equal(queryOriginNeedsLegacyIconEvidence('all'), true);
  assert.equal(queryOriginNeedsLegacyIconEvidence('legacy_unknown'), true);
  assert.equal(queryOriginNeedsLegacyIconEvidence('agent_query'), false);
  assert.equal(queryOriginNeedsLegacyIconEvidence('recommend_variant'), false);
  assert.equal(queryOriginNeedsLegacyIconEvidence('icon_lookup'), false);
});

test('records resolved requested limits per tool', () => {
  assert.equal(getRequestedLimitForTool('search_icons', {}), 10);
  assert.equal(getRequestedLimitForTool('search_icons', { limit: 3 }), 3);
  assert.equal(getRequestedLimitForTool('recommend_icons', { slots: ['a', 'b', 'c'] }), 3);
  assert.equal(getRequestedLimitForTool('get_icon', {}), 1);
});

test('uses exactly one estimated client identity per row', () => {
  assert.deepEqual(
    buildEstimatedClientIdentity({
      user_id: 'user-a',
      api_key_hash: 'api-a',
      anonymous_client_hash: 'anon-a',
    }),
    { key: 'registered:user-a', kind: 'registered', display_key: 'registered:user-a' },
  );
  assert.equal(
    buildEstimatedClientIdentity({ api_key_hash: 'api-a', anonymous_client_hash: 'anon-a' }).key,
    'api_key:api-a',
  );
});

test('classifies exact low results and capped successes correctly', () => {
  assert.equal(classifySearchAttempt(attempt({ result_count: 3, requested_limit: 3 }), defectRegistry).is_exact_low, false);
  assert.equal(classifySearchAttempt(attempt({ result_count: 2, requested_limit: 3 }), defectRegistry).is_exact_low, true);
  assert.equal(classifySearchAttempt(attempt({ result_count: 1, requested_limit: 1 }), defectRegistry).is_exact_low, false);
});

test('keeps recommendation slot outcomes out of low-result metrics', () => {
  const classified = classifySearchAttempt(attempt({
    tool_name: 'recommend_icons',
    result_count: 2,
    requested_limit: 3,
  }), defectRegistry);
  assert.equal(classified.is_exact_low, false);
  assert.equal(classified.is_approximate_low, false);
  assert.equal(classified.is_partial_recommendation, true);
});

test('bounds the Material defect to zero outcomes before the exact completion time', () => {
  const before = attempt({
    created_at: '2026-07-15T18:06:17.8324190Z',
    library_filter: 'material',
    result_count: 0,
    search_outcome: 'zero',
  });
  const after = { ...before, created_at: '2026-07-15T18:06:17.833Z' };
  const success = { ...before, result_count: 5, search_outcome: 'results' };
  assert.equal(matchKnownDefect(before, defectRegistry)?.id, 'material_assets_unavailable_before_2026_07_15');
  assert.equal(matchKnownDefect(after, defectRegistry), null);
  assert.equal(matchKnownDefect(success, defectRegistry), null);
  assert.equal(classifySearchAttempt(before, defectRegistry).is_true_zero, false);
});

test('merges duplicate ledgers with stable usage-event authority', () => {
  const audit = {
    source_table: 'search_request_audit',
    source_row_id: '42',
    dedupe_key: 'shared',
    query_origin: 'recommend_variant',
    requested_limit: null,
    latency_ms: 400,
    error_code: 'engine_timeout',
    created_at: '2026-07-15T12:00:00Z',
  };
  const usage = {
    source_table: 'mcp_usage_events',
    search_request_audit_id: '42',
    dedupe_key: 'shared',
    query_origin: 'agent_query',
    requested_limit: 3,
    latency_ms: null,
    created_at: '2026-07-15T12:00:01Z',
  };
  const left = mergeTelemetryEvidenceRows([audit, usage]);
  const right = mergeTelemetryEvidenceRows([usage, audit]);
  assert.deepEqual(left, right);
  assert.equal(left.length, 1);
  assert.equal(left[0].source_table, 'mcp_usage_events');
  assert.equal(left[0].query_origin, 'agent_query');
  assert.equal(left[0].requested_limit, 3);
  assert.equal(left[0].latency_ms, 400);
  assert.equal(left[0].error_code, 'engine_timeout');
});

test('builds stable completed-day rollup keys', () => {
  const rows = [
    attempt({ library_filter: null, result_count: 0, search_outcome: 'zero' }),
    attempt({ search_query: 'calendar', anonymous_client_hash: 'anon-b' }),
  ];
  const rollups = buildAdminRollups(rows, defectRegistry);
  assert.equal(rollups.overview.length, 1);
  assert.equal(rollups.overview[0].attempt_count, 2);
  assert.equal(rollups.overview[0].client_days, 2);
  assert.equal(rollups.queries.find((row) => row.query_norm === 'settings').library_filter, 'all');
});

test('keeps icon lookups out of search zero-rate rollups', () => {
  const lookup = attempt({
    signal_type: 'mcp_call',
    search_query: 'snowflake',
    query_origin: 'icon_lookup',
    tool_name: 'get_icon',
    result_count: 1,
    requested_limit: 1,
    search_outcome: null,
  });
  const rollups = buildAdminRollups([
    attempt({ result_count: 0, search_outcome: 'zero' }),
    lookup,
  ], defectRegistry);
  assert.equal(rollups.overview[0].attempt_count, 1);
  assert.equal(rollups.overview[0].true_zero_count, 1);
  assert.equal(rollups.queries.some((row) => row.query_origin === 'icon_lookup'), false);
});

test('keeps the current UTC day out of completed-day refresh input', () => {
  const rows = [
    attempt({ created_at: '2026-07-15T23:59:59Z' }),
    attempt({ created_at: '2026-07-16T00:00:00Z' }),
  ];
  const split = splitCurrentUtcDay(rows, new Date('2026-07-16T10:00:00Z'));
  assert.equal(split.completed.length, 1);
  assert.equal(split.current.length, 1);
});

test('reports estimated clients and returning clients within a month', () => {
  const rows = [
    attempt({ created_at: '2026-07-01T01:00:00Z', anonymous_client_hash: 'anon-a' }),
    attempt({ created_at: '2026-07-02T01:00:00Z', anonymous_client_hash: 'anon-a' }),
    attempt({ created_at: '2026-07-02T02:00:00Z', anonymous_client_hash: 'anon-b' }),
  ];
  const summary = summarizeRawSearchAttempts(rows, defectRegistry);
  assert.equal(summary.attempt_count, 3);
  assert.equal(summary.estimated_unique_clients, 2);
  assert.equal(summary.searches_per_client, 1.5);
  assert.equal(summary.returning_clients_within_month, 1);
});

for (const entry of tests) {
  await entry.run();
}

console.log(`Admin dashboard Phase A metric contract passed ${tests.length} tests.`);
