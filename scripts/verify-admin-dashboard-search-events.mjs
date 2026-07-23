import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { compactDashboardV2EventRows } from '../lib/admin-dashboard-v2.js';

const rows = compactDashboardV2EventRows([
  {
    id: 'mcp_usage_events:101',
    event_id: 'event-101',
    root_request_hash_prefix: '0123456789ab',
    created_at: '2026-07-22T12:00:00.000Z',
    search_query: 'slack',
    query_origin: 'icon_lookup',
    tool_name: 'get_icon',
    event_type: 'tool_call',
    audit_status: 'error',
    error_code: 'icon_not_found',
    library_filter: 'simpleicons',
    result_count: 0,
    latency_ms: 42,
    returned_icon_refs: [],
    returned_icon_refs_recorded: true,
    mcp_server_version: '0.4.20',
    server_build: 'abc123',
    traffic_class: 'unclassified_live',
    client_family: 'codex',
    estimated_client_key: 'anonymous:0123456789ab',
    visitor_kind: 'anonymous',
    country_code: 'SG',
    environment: 'production',
    source_table: 'mcp_usage_events',
    request_id: 'must-not-leak',
    session_hash: 'must-not-leak',
    api_key_hash: 'must-not-leak',
  },
  {
    id: 'mcp_usage_events:102',
    created_at: '2026-07-22T12:01:00.000Z',
    search_query: 'database',
    query_origin: 'agent_query',
    tool_name: 'search_icons',
    event_type: 'search_outcome',
    audit_status: 'ok',
    search_outcome: 'results',
    requested_limit: 10,
    result_count: 3,
    returned_icon_refs: ['lucide:database', 'tabler:database'],
    returned_icon_refs_recorded: true,
    locale: null,
    latency_ms: null,
    environment: 'test',
    estimated_client_key: 'session:abcdef123456',
    source_table: 'mcp_usage_events',
  },
  {
    id: 'mcp_usage_events:103',
    search_query: 'unknown',
    query_origin: 'icon_lookup',
    tool_name: 'get_icon',
    result_count: null,
    environment: 'production',
  },
  {
    id: 'mcp_usage_events:104',
    search_query: 'recommendation without recorded references',
    query_origin: 'agent_query',
    tool_name: 'recommend_icons',
    search_outcome: 'results',
    result_count: 4,
    returned_icon_refs: [],
    returned_icon_refs_recorded: true,
    environment: 'production',
  },
]);

assert.equal(rows[0].outcome, 'not_found');
assert.equal(rows[0].root_request_identifier, '0123456789ab');
assert.equal(rows[0].event_identifier, 'event-101');
assert.equal(rows[0].result_count, 0);
assert.equal(rows[0].locale, null);
assert.equal(rows[0].locale_recorded, false);
assert.equal(rows[0].traffic_class, 'unclassified_live');
assert.equal(rows[0].source, 'mcp_usage_events');
assert.equal(rows[0].event_role, 'top_level');
assert.equal(rows[1].outcome, 'success');
assert.deepEqual(rows[1].returned_icon_refs, ['lucide:database', 'tabler:database']);
assert.equal(rows[1].returned_icon_refs_recorded, true);
assert.equal(rows[1].traffic_class, 'controlled_test');
assert.equal(rows[1].latency_ms, null);
assert.equal(rows[2].outcome, 'unknown');
assert.equal(rows[2].result_count, null);
assert.equal(rows[2].event_identifier, 'mcp_usage_events:103');
assert.equal(rows[3].outcome, 'success');
assert.equal(rows[3].returned_icon_refs_recorded, false);

for (const row of rows) {
  for (const forbidden of ['request_id', 'session_hash', 'api_key_hash', 'user_id']) {
    assert.equal(Object.hasOwn(row, forbidden), false, `${forbidden} leaked into an event export row`);
  }
}

const api = await readFile('supabase/functions/admin-api/index.ts', 'utf8');
for (const required of [
  'buildDashboardV2SearchEventsPayload',
  'compactDashboardV2EventRows',
  'events_export_available',
  'field_coverage',
  'raw_identifiers_exposed: false',
  'privacySafeRootRequestPrefix',
  'primary_metric_source',
  "eventScope === 'audit'",
  "event_role === 'top_level'",
  'constantTimeTextEqual',
  "metric_scope: 'filtered_search_event_details'",
  'final_outcome_source: telemetrySettings.dashboard_source',
  'web_final_outcome_cutover_at: telemetrySettings.web_final_outcome_cutover_at',
  'local_mcp_coverage_cutover_at: telemetrySettings.local_mcp_coverage_cutover_at',
  'coverage_warnings: coverage.warnings',
]) {
  assert.match(api, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

console.log(JSON.stringify({
  status: 'ok',
  cases: rows.length,
  lookup_outcomes: rows.filter((row) => row.query_origin === 'icon_lookup').map((row) => row.outcome),
  privacy_safe: true,
  null_preserved: true,
}, null, 2));
