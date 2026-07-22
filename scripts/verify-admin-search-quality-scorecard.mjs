import assert from 'node:assert/strict';

import { buildAdminSearchQualityScorecard } from '../lib/admin-search-quality-scorecard.js';

const live = {
  traffic_class: 'unclassified_live',
  server_version: '0.4.20',
  server_build: 'abc123',
  source: 'mcp_usage_events',
};
const input = {
  events_complete: true,
  meta: { completeness: { event_rows_complete: true } },
  events: [
    {
      ...live,
      event_identifier: 'event-1',
      recorded_at: '2026-07-20T10:00:00Z',
      tool_name: 'search_icons',
      query_origin: 'agent_query',
      outcome: 'zero',
      result_count: 0,
      locale: 'ja',
      locale_recorded: true,
      returned_icon_refs_recorded: true,
      latency_ms: 100,
    },
    {
      ...live,
      event_identifier: 'event-2',
      recorded_at: '2026-07-20T10:01:00Z',
      tool_name: 'search_icons',
      query_origin: 'agent_query',
      outcome: 'success',
      result_count: 2,
      locale: 'ja',
      locale_recorded: true,
      returned_icon_refs: ['lucide:ship'],
      returned_icon_refs_recorded: true,
      latency_ms: 200,
    },
    {
      ...live,
      event_identifier: 'event-3',
      recorded_at: '2026-07-20T10:02:00Z',
      tool_name: 'recommend_icons',
      query_origin: 'agent_query',
      outcome: 'success',
      latency_ms: 300,
    },
    {
      ...live,
      event_identifier: 'event-4',
      recorded_at: '2026-07-20T10:03:00Z',
      tool_name: 'search_icons',
      query_origin: 'recommend_variant',
      outcome: 'zero',
      result_count: 0,
      source: 'search_request_audit',
    },
    {
      ...live,
      event_identifier: 'event-5',
      recorded_at: '2026-07-20T10:04:00Z',
      tool_name: 'get_icon',
      query_origin: 'icon_lookup',
      outcome: 'not_found',
      error_code: 'icon_not_found',
      result_count: 0,
    },
    {
      event_identifier: 'event-6',
      recorded_at: '2026-07-20T10:05:00Z',
      tool_name: 'search_icons',
      query_origin: 'agent_query',
      outcome: 'zero',
      result_count: 0,
      locale: 'de',
      traffic_class: 'controlled_test',
      source: 'mcp_usage_events',
    },
    {
      ...live,
      event_identifier: null,
      recorded_at: '2026-07-20T10:06:00Z',
      tool_name: 'search_icons',
      query_origin: 'agent_query',
      outcome: 'zero',
      result_count: 0,
      source: 'search_request_audit',
    },
  ],
};

const scorecard = buildAdminSearchQualityScorecard(input);
assert.equal(scorecard.scope.total_events, 7);
assert.equal(scorecard.scope.unclassified_live_events, 6);
assert.equal(scorecard.scope.controlled_or_local_events, 1);
assert.equal(scorecard.primary_metrics.direct_search.attempts, 2);
assert.equal(scorecard.primary_metrics.direct_search.zero_rate, 0.5);
assert.equal(scorecard.primary_metrics.direct_search.low_result_rate_among_known_counts, 0.5);
assert.equal(scorecard.primary_metrics.recommendation.attempts, 1);
assert.equal(scorecard.primary_metrics.recommendation.completion_rate, 1);
assert.equal(scorecard.primary_metrics.recommendation.relevance.status, 'not_measured');
assert.equal(scorecard.diagnostics.recommendation_variants.attempts, 1);
assert.equal(scorecard.diagnostics.exact_lookup.outcomes.not_found, 1);
assert.equal(scorecard.diagnostics.hosted_search_pipeline.attempts, 2);
assert.equal(scorecard.diagnostics.explicit_locale_direct_search.ja.attempts, 2);
assert.equal(scorecard.diagnostics.explicit_locale_direct_search.de.attempts, 0);
assert.equal(scorecard.claim_limits.multilingual_parity, 'not_claimed');
assert.equal(scorecard.data_quality.trustworthy_for_operational_counts, true);

const incomplete = buildAdminSearchQualityScorecard({ ...input, events_complete: false });
assert.equal(incomplete.data_quality.trustworthy_for_operational_counts, false);
assert.match(incomplete.data_quality.blockers[0], /incomplete/);

const duplicate = buildAdminSearchQualityScorecard({ events: [...input.events, input.events[0]] });
assert.equal(duplicate.data_quality.duplicate_event_identifiers, 1);
assert.equal(duplicate.data_quality.trustworthy_for_operational_counts, false);

assert.throws(() => buildAdminSearchQualityScorecard({ events: [] }), /empty/);

console.log(JSON.stringify({
  status: 'ok',
  total_events: scorecard.scope.total_events,
  direct_search_attempts: scorecard.primary_metrics.direct_search.attempts,
  recommendation_attempts: scorecard.primary_metrics.recommendation.attempts,
  exact_lookup_attempts: scorecard.diagnostics.exact_lookup.attempts,
  controlled_traffic_excluded: true,
  hosted_audit_double_count_blocked: true,
  unsupported_claims_blocked: true,
}, null, 2));
