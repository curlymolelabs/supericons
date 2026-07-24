import {
  buildFinalOutcomeCoverage,
  finalOutcomeIsAfterCutover,
  mapFinalOutcomeToEvidenceRow,
  mergeFinalAndLegacyHostedOutcomeRows,
} from '../supabase/functions/admin-api/index.ts';
import { buildAdminRollups } from '../lib/admin-dashboard-metrics.js';
import {
  buildDashboardV2Kpis,
  buildDashboardV2Series,
  compactDashboardV2EventRows,
  filterDashboardV2Rows,
  parseDashboardV2Filters,
} from '../lib/admin-dashboard-v2.js';

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

const settings = {
  dashboard_source: 'final' as const,
  web_final_outcome_cutover_at: '2026-07-24T02:00:00.000Z',
  local_mcp_coverage_cutover_at: '2026-07-24T03:00:00.000Z',
};

Deno.test('applies independent Web and Local MCP cutovers', () => {
  assert(!finalOutcomeIsAfterCutover({
    channel: 'web',
    completed_at: '2026-07-24T01:59:59.000Z',
  }, settings), 'A pre-cutover Web row was accepted.');
  assert(finalOutcomeIsAfterCutover({
    channel: 'web',
    completed_at: '2026-07-24T02:00:00.000Z',
  }, settings), 'The first verified Web row was rejected.');
  assert(!finalOutcomeIsAfterCutover({
    channel: 'local_mcp',
    completed_at: '2026-07-24T02:59:59.000Z',
  }, settings), 'A pre-cutover Local MCP row was accepted.');
  assert(finalOutcomeIsAfterCutover({
    channel: 'hosted_mcp',
    completed_at: '2026-07-01T00:00:00.000Z',
  }, settings), 'A valid Hosted MCP final row was rejected.');
});

Deno.test('maps final rows without promoting diagnostics', () => {
  const webZero = mapFinalOutcomeToEvidenceRow({
    id: 1,
    episode_id: '7089f7e0-d25b-43ba-8ec7-ae5e745a5349',
    channel: 'web',
    query: 'no matching icon',
    environment: 'production',
    traffic_class: 'unclassified_live',
    client_family: 'browser',
    library_filter: 'all',
    library_mode: 'all',
    final_match_count: 0,
    final_outcome: 'zero',
    settlement_state: 'completed',
    anonymous_client_hash: 'a'.repeat(64),
    completed_at: '2026-07-24T04:00:00.000Z',
    metadata: { local_match_count: 0, hosted_match_count: 0, hosted_state: 'zero' },
  });
  assert(webZero.signal_type === 'search_attempt', 'A final Web row lost its top-level role.');
  assert(webZero.search_outcome === 'zero', 'A final zero was changed.');
  assert(webZero.result_count === 0, 'A final zero gained results.');
  const [event] = compactDashboardV2EventRows([webZero]);
  assert(event.event_role === 'web_top_level', 'A Web final row became a diagnostic.');
});

Deno.test('fills Hosted MCP history without duplicating copied final rows', () => {
  const copied = mapFinalOutcomeToEvidenceRow({
    id: 20,
    episode_id: '00000000-0000-4000-8000-000000000020',
    source_event_id: 'mcp_usage_events:20',
    channel: 'hosted_mcp',
    query: 'copied final',
    environment: 'production',
    traffic_class: 'unclassified_live',
    client_family: 'chatgpt',
    tool_name: 'search_icons',
    final_match_count: 8,
    final_outcome: 'success',
    settlement_state: 'completed',
    latency_ms: 321,
    completed_at: '2026-07-24T04:00:00.000Z',
  });
  const legacyOnly = {
    id: 'mcp_usage_events:19',
    source_table: 'mcp_usage_events',
    event_type: 'search_outcome',
    event_id: '00000000-0000-4000-8000-000000000019',
    channel: 'hosted_mcp',
    tool_name: 'search_icons',
    latency_ms: 654,
    created_at: '2026-07-24T03:59:00.000Z',
  };
  const copiedSource = {
    ...legacyOnly,
    id: 'mcp_usage_events:20',
    event_id: '00000000-0000-4000-8000-000000000020',
  };
  const merged = mergeFinalAndLegacyHostedOutcomeRows(
    [copied],
    [legacyOnly, copiedSource] as never[],
  );
  assert(merged.length === 2, 'A copied Hosted MCP source row was counted twice.');
  assert(merged.some((row) => row.id === 'mcp_usage_events:19'), 'Pre-ledger Hosted MCP history was omitted.');
  assert(copied.latency_ms === 321, 'Final outcome latency was discarded.');
});

Deno.test('uses eligible final outcomes for true-zero rate', () => {
  const rows = [
    { id: 1, final_outcome: 'success', final_match_count: 8 },
    { id: 2, final_outcome: 'zero', final_match_count: 0 },
    { id: 3, final_outcome: 'error', final_match_count: 0 },
  ].map((entry, index) => mapFinalOutcomeToEvidenceRow({
    ...entry,
    episode_id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
    channel: 'hosted_mcp',
    query: `query ${index + 1}`,
    environment: 'production',
    traffic_class: 'unclassified_live',
    client_family: 'chatgpt',
    tool_name: 'search_icons',
    completed_at: `2026-07-24T04:00:0${index}.000Z`,
  }));
  const rollups = buildAdminRollups(rows);
  const series = buildDashboardV2Series(rollups.overview, rows);
  const kpis = buildDashboardV2Kpis(series, rows);
  assert(kpis.attempts === 3, 'Final event count is wrong.');
  assert(kpis.true_zero_count === 1, 'Final zero count is wrong.');
  assert(kpis.true_zero_rate_denominator === 2, 'Errors entered the zero-rate denominator.');
  assert(kpis.true_zero_rate === 0.5, 'The true-zero rate is wrong.');
});

Deno.test('excludes controlled traffic by default and warns across cutovers', () => {
  const filters = parseDashboardV2Filters(
    new URL('https://example.test/v2/search?window=7d&channel=all&include_test=false'),
    new Date('2026-07-24T12:00:00.000Z'),
  );
  const filtered = filterDashboardV2Rows([{
    environment: 'production',
    channel: 'hosted_mcp',
    traffic_class: 'unclassified_live',
    search_query: 'live',
  }, {
    environment: 'test',
    channel: 'hosted_mcp',
    traffic_class: 'controlled_test',
    search_query: 'test',
  }], filters);
  assert(filtered.length === 1 && filtered[0].search_query === 'live', 'Controlled traffic entered the default view.');
  const coverage = buildFinalOutcomeCoverage(settings, filters);
  assert(coverage.warnings.length === 2, 'A cross-cutover warning is missing.');
});
