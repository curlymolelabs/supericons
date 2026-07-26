import {
  buildDashboardV2SourceReconciliation,
  buildFinalOutcomeCoverage,
  DASHBOARD_V2_RECONCILIATION_GRACE_SECONDS,
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
    country_code: 'ES',
    geo_source: 'railway_geoip',
    locale: 'es',
    interface_locale: 'en',
    completed_at: '2026-07-24T04:00:00.000Z',
    metadata: { local_match_count: 0, hosted_match_count: 0, hosted_state: 'zero' },
  });
  assert(webZero.signal_type === 'search_attempt', 'A final Web row lost its top-level role.');
  assert(webZero.search_outcome === 'zero', 'A final zero was changed.');
  assert(webZero.result_count === 0, 'A final zero gained results.');
  assert(webZero.country_code === 'ES', 'A linked Web country was discarded.');
  assert(webZero.geo_source === 'railway_geoip', 'A linked country source was discarded.');
  assert(webZero.locale === 'es', 'Query locale was discarded.');
  assert(webZero.interface_locale === 'en', 'Interface locale was discarded.');
  const [event] = compactDashboardV2EventRows([webZero]);
  assert(event.event_role === 'web_top_level', 'A Web final row became a diagnostic.');
  assert(event.interface_locale === 'en', 'Interface locale was omitted from the event export.');
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
    environment: 'production',
    channel: 'local_mcp',
    traffic_class: 'controlled_test',
    search_query: 'test',
  }], filters);
  assert(filtered.length === 1 && filtered[0].search_query === 'live', 'Controlled traffic entered the default view.');
  const includeControlledFilters = parseDashboardV2Filters(
    new URL('https://example.test/v2/search?window=7d&channel=all&include_test=true'),
    new Date('2026-07-24T12:00:00.000Z'),
  );
  const included = filterDashboardV2Rows([{
    environment: 'production',
    channel: 'hosted_mcp',
    traffic_class: 'unclassified_live',
    search_query: 'live',
  }, {
    environment: 'production',
    channel: 'local_mcp',
    traffic_class: 'controlled_test',
    search_query: 'test',
  }], includeControlledFilters);
  assert(included.length === 2, 'The explicit test-traffic filter did not include controlled Local MCP traffic.');
  const coverage = buildFinalOutcomeCoverage(settings, filters);
  assert(coverage.warnings.length === 2, 'A cross-cutover warning is missing.');
});

Deno.test('reconciles final outcomes and keeps direct gateway work diagnostic only', () => {
  const episodeId = '00000000-0000-4000-8000-000000000010';
  const finalRow = mapFinalOutcomeToEvidenceRow({
    id: 10,
    episode_id: episodeId,
    recovery_chain_id: episodeId,
    source_event_id: 'mcp_usage_events:10',
    channel: 'hosted_mcp',
    query: 'calendar',
    environment: 'production',
    traffic_class: 'unclassified_live',
    client_family: 'chatgpt',
    tool_name: 'search_icons',
    final_match_count: 6,
    final_outcome: 'success',
    settlement_state: 'completed',
    completed_at: '2026-07-24T11:55:00.000Z',
  });
  const usageRow = {
    id: 'mcp_usage_events:10',
    source_row_id: '10',
    source_table: 'mcp_usage_events',
    event_type: 'search_outcome',
    event_id: episodeId,
    episode_id: episodeId,
    recovery_chain_id: episodeId,
    signal_type: 'search_attempt',
    channel: 'hosted_mcp',
    tool_name: 'search_icons',
    created_at: '2026-07-24T11:55:00.000Z',
  };
  const auditRows = [{
    id: 'search_request_audit:20',
    source_row_id: '20',
    source_table: 'search_request_audit',
    signal_type: 'hosted_search_audit',
    episode_id: episodeId,
    recovery_chain_id: episodeId,
    channel: 'hosted_mcp',
    created_at: '2026-07-24T11:55:00.000Z',
  }, {
    id: 'search_request_audit:21',
    source_row_id: '21',
    source_table: 'search_request_audit',
    signal_type: 'hosted_search_audit',
    channel: 'hosted_mcp',
    created_at: '2026-07-24T11:55:01.000Z',
  }, {
    id: 'search_request_audit:22',
    source_row_id: '22',
    source_table: 'search_request_audit',
    signal_type: 'hosted_search_audit',
    channel: 'hosted_mcp',
    environment: 'test',
    created_at: '2026-07-24T11:55:02.000Z',
  }, {
    id: 'search_request_audit:23',
    source_row_id: '23',
    source_table: 'search_request_audit',
    signal_type: 'hosted_search_audit',
    channel: 'hosted_mcp',
    created_at: '2026-07-24T11:58:00.000Z',
  }];
  const webDiagnosticRow = {
    id: 'search_episode_diagnostics:30',
    source_row_id: '30',
    source_table: 'search_episode_diagnostics',
    signal_type: 'search_episode_diagnostic',
    episode_id: '00000000-0000-4000-8000-000000000030',
    channel: 'web',
    created_at: '2026-07-24T11:55:03.000Z',
  };
  const webFinalRow = mapFinalOutcomeToEvidenceRow({
    id: 30,
    episode_id: '00000000-0000-4000-8000-000000000030',
    recovery_chain_id: '00000000-0000-4000-8000-000000000030',
    source_event_id: 'icon_evidence:30',
    channel: 'web',
    query: 'web calendar',
    environment: 'production',
    traffic_class: 'unclassified_live',
    client_family: 'web',
    tool_name: 'web_search',
    final_match_count: 8,
    final_outcome: 'success',
    settlement_state: 'completed',
    completed_at: '2026-07-24T11:55:03.000Z',
  });
  const reconciliation = buildDashboardV2SourceReconciliation({
    auditRows: auditRows as never[],
    usageRows: [usageRow] as never[],
    finalRows: [finalRow, webFinalRow],
    webDiagnosticRows: [webDiagnosticRow] as never[],
    dataCutoff: '2026-07-24T12:00:00.000Z',
  });
  assert(DASHBOARD_V2_RECONCILIATION_GRACE_SECONDS === 120, 'The reconciliation grace period changed.');
  assert(reconciliation.status === 'passed', 'Valid source rows did not reconcile.');
  assert(reconciliation.audit_linkage_counts.episode_id === 1, 'The exact episode link was missed.');
  assert(
    reconciliation.audit_linkage_counts.explained_unlinked_diagnostic === 2,
    'Direct gateway diagnostics were not explained.',
  );
  assert(reconciliation.audit_linkage_counts.pending_linkage === 1, 'The boundary row was not pending.');
  assert(
    reconciliation.web_diagnostic_linkage_counts.episode_id === 1,
    'The Web diagnostic was not linked to its final outcome.',
  );
  assert(reconciliation.counts.unexplained_rows === 0, 'A valid source row became unexplained.');
  const diagnosticEvents = compactDashboardV2EventRows(reconciliation.diagnostic_rows);
  assert(
    diagnosticEvents.every((row: Record<string, unknown>) => row.event_role === 'diagnostic'),
    'A supporting diagnostic entered the product event roles.',
  );
  assert(
    diagnosticEvents.some((row: Record<string, unknown>) => (
      row.diagnostic_accounting_status === 'explained_unlinked_gateway_diagnostic'
    )),
    'The diagnostic accounting status was not exported.',
  );
});

Deno.test('fails source reconciliation for an old product identity with no exact outcome', () => {
  const reconciliation = buildDashboardV2SourceReconciliation({
    auditRows: [{
      id: 'search_request_audit:40',
      source_row_id: '40',
      source_table: 'search_request_audit',
      signal_type: 'hosted_search_audit',
      episode_id: '00000000-0000-4000-8000-000000000040',
      channel: 'hosted_mcp',
      created_at: '2026-07-24T11:57:59.999Z',
    }] as never[],
    usageRows: [],
    finalRows: [],
    webDiagnosticRows: [],
    dataCutoff: '2026-07-24T12:00:00.000Z',
  });
  assert(reconciliation.status === 'needs_attention', 'An unexplained old source row passed reconciliation.');
  assert(reconciliation.counts.unexplained_rows === 1, 'The unexplained row was not counted.');
  assert(
    reconciliation.unexplained_breakdown.audit_by_channel.hosted_mcp === 1,
    'The unexplained Hosted MCP row was hidden from the channel breakdown.',
  );
});

Deno.test('separates Local MCP rows before verified coverage from unexplained rows', () => {
  const beforeCutover = buildDashboardV2SourceReconciliation({
    auditRows: [],
    usageRows: [{
      id: 'mcp_usage_events:70',
      event_type: 'search_outcome',
      tool_name: 'search_icons',
      channel: 'local_mcp',
      created_at: '2026-07-24T02:59:59.999Z',
    }] as never[],
    finalRows: [],
    webDiagnosticRows: [],
    dataCutoff: '2026-07-24T12:00:00.000Z',
    localMcpCoverageCutoverAt: '2026-07-24T03:00:00.000Z',
  });
  assert(beforeCutover.status === 'passed', 'A pre-cutover Local MCP row failed reconciliation.');
  assert(
    beforeCutover.usage_accounting_counts.outside_verified_coverage === 1,
    'The pre-cutover Local MCP row was not separated.',
  );
  assert(beforeCutover.counts.unexplained_rows === 0, 'A pre-cutover Local MCP row stayed unexplained.');

  const atCutover = buildDashboardV2SourceReconciliation({
    auditRows: [],
    usageRows: [{
      id: 'mcp_usage_events:71',
      event_type: 'search_outcome',
      tool_name: 'search_icons',
      channel: 'local_mcp',
      created_at: '2026-07-24T03:00:00.000Z',
    }] as never[],
    finalRows: [],
    webDiagnosticRows: [],
    dataCutoff: '2026-07-24T12:00:00.000Z',
    localMcpCoverageCutoverAt: '2026-07-24T03:00:00.000Z',
  });
  assert(atCutover.status === 'needs_attention', 'A missing post-cutover Local MCP final outcome passed.');
  assert(atCutover.counts.unexplained_rows === 1, 'A post-cutover Local MCP gap was hidden.');
});

Deno.test('fails source reconciliation when an old Web diagnostic has no final outcome', () => {
  const reconciliation = buildDashboardV2SourceReconciliation({
    auditRows: [],
    usageRows: [],
    finalRows: [],
    webDiagnosticRows: [{
      id: 'search_episode_diagnostics:50',
      source_row_id: '50',
      source_table: 'search_episode_diagnostics',
      signal_type: 'search_episode_diagnostic',
      episode_id: '00000000-0000-4000-8000-000000000050',
      channel: 'web',
      created_at: '2026-07-24T11:57:59.999Z',
    }] as never[],
    dataCutoff: '2026-07-24T12:00:00.000Z',
  });
  assert(reconciliation.status === 'needs_attention', 'An orphaned Web diagnostic passed reconciliation.');
  assert(reconciliation.counts.unexplained_rows === 1, 'The orphaned Web diagnostic was not counted.');
  assert(
    reconciliation.web_diagnostic_linkage_counts.episode_id === 0,
    'A Web diagnostic incorrectly linked to itself.',
  );
});

Deno.test('does not let a generic Web diagnostic excuse a missing final outcome', () => {
  const episodeId = '00000000-0000-4000-8000-000000000051';
  const reconciliation = buildDashboardV2SourceReconciliation({
    auditRows: [{
      id: 'search_request_audit:51',
      source_row_id: '51',
      source_table: 'search_request_audit',
      signal_type: 'hosted_search_audit',
      episode_id: episodeId,
      recovery_chain_id: episodeId,
      channel: 'web',
      created_at: '2026-07-24T11:55:00.000Z',
    }] as never[],
    usageRows: [],
    finalRows: [],
    webDiagnosticRows: [{
      id: 'search_episode_diagnostics:51',
      source_row_id: '51',
      source_table: 'search_episode_diagnostics',
      signal_type: 'hosted_search_audit',
      episode_id: episodeId,
      recovery_chain_id: episodeId,
      query_origin: 'diagnostic',
      channel: 'web',
      created_at: '2026-07-24T11:55:00.000Z',
    }] as never[],
    dataCutoff: '2026-07-24T12:00:00.000Z',
  });
  assert(
    reconciliation.status === 'needs_attention',
    'A generic Web diagnostic incorrectly excused a missing final outcome.',
  );
  assert(
    reconciliation.audit_linkage_counts.episode_id === 1,
    'The raw Web attempt was not linked by its exact episode identity.',
  );
  assert(
    reconciliation.web_diagnostic_linkage_counts.unexplained === 1,
    'The generic Web diagnostic was not kept unexplained.',
  );
  assert(reconciliation.counts.product_rows_exported === 0, 'A generic diagnostic became a product row.');
});

Deno.test('accounts for superseded and incomplete Web episodes as diagnostics only', () => {
  const supersededEpisode = '00000000-0000-4000-8000-000000000060';
  const incompleteEpisode = '00000000-0000-4000-8000-000000000061';
  const reconciliation = buildDashboardV2SourceReconciliation({
    auditRows: [{
      id: 'search_request_audit:60',
      source_row_id: '60',
      source_table: 'search_request_audit',
      signal_type: 'hosted_search_audit',
      episode_id: supersededEpisode,
      recovery_chain_id: supersededEpisode,
      channel: 'web',
      created_at: '2026-07-24T11:55:00.000Z',
    }, {
      id: 'search_request_audit:61',
      source_row_id: '61',
      source_table: 'search_request_audit',
      signal_type: 'hosted_search_audit',
      episode_id: incompleteEpisode,
      recovery_chain_id: incompleteEpisode,
      channel: 'web',
      created_at: '2026-07-24T11:55:01.000Z',
    }] as never[],
    usageRows: [],
    finalRows: [],
    webDiagnosticRows: [{
      id: 'search_episode_diagnostics:60',
      source_row_id: '60',
      source_table: 'search_episode_diagnostics',
      signal_type: 'hosted_search_audit',
      episode_id: supersededEpisode,
      recovery_chain_id: supersededEpisode,
      query_origin: 'superseded',
      channel: 'web',
      created_at: '2026-07-24T11:55:00.000Z',
    }, {
      id: 'search_episode_diagnostics:61',
      source_row_id: '61',
      source_table: 'search_episode_diagnostics',
      signal_type: 'hosted_search_audit',
      episode_id: incompleteEpisode,
      recovery_chain_id: incompleteEpisode,
      audit_status: 'incomplete',
      channel: 'web',
      created_at: '2026-07-24T11:55:01.000Z',
    }] as never[],
    dataCutoff: '2026-07-24T12:00:00.000Z',
  });
  assert(reconciliation.status === 'passed', 'Expected non-final Web diagnostics did not reconcile.');
  assert(
    reconciliation.audit_linkage_counts.episode_id === 2,
    'Web attempts were not linked to their exact episode diagnostics.',
  );
  assert(
    reconciliation.web_diagnostic_linkage_counts.explained_nonfinal_diagnostic === 2,
    'Non-final Web diagnostics were not explicitly explained.',
  );
  assert(reconciliation.counts.unexplained_rows === 0, 'Expected Web diagnostics became unexplained.');
  assert(reconciliation.counts.product_rows_exported === 0, 'A Web diagnostic became a product row.');
  assert(
    compactDashboardV2EventRows(reconciliation.diagnostic_rows).every((
      row: Record<string, unknown>,
    ) => row.event_role === 'diagnostic'),
    'A non-final Web event entered the product event roles.',
  );
});
