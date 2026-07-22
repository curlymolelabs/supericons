const MAINTAINED_LOCALES = Object.freeze(['ar', 'de', 'es', 'hi', 'ja', 'ko', 'pt', 'th', 'vi', 'zh-CN', 'zh-TW']);
const CONTROLLED_TRAFFIC = new Set(['controlled_test', 'preview', 'local']);
const ALLOWED_OUTCOMES = new Set(['success', 'zero', 'not_found', 'error', 'clarification', 'unknown']);

function text(value) {
  return value === null || value === undefined ? '' : String(value).trim();
}

function finiteNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function booleanValue(value) {
  if (value === true || value === false) return value;
  const normalized = text(value).toLowerCase();
  if (normalized === 'true') return true;
  if (normalized === 'false') return false;
  return null;
}

function listValue(value) {
  if (Array.isArray(value)) return value.map(text).filter(Boolean);
  const normalized = text(value);
  if (!normalized) return [];
  try {
    const parsed = JSON.parse(normalized);
    if (Array.isArray(parsed)) return parsed.map(text).filter(Boolean);
  } catch {
    return normalized.split('|').map(text).filter(Boolean);
  }
  return [];
}

function normalizeLocale(value) {
  const raw = text(value).replace('_', '-');
  if (!raw) return null;
  const lower = raw.toLowerCase();
  if (lower === 'zh-cn' || lower === 'zh-hans') return 'zh-CN';
  if (lower === 'zh-tw' || lower === 'zh-hant') return 'zh-TW';
  return lower.split('-')[0];
}

function percentile(values, fraction) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const index = Math.max(0, Math.ceil(fraction * sorted.length) - 1);
  return sorted[index];
}

function rate(numerator, denominator) {
  return denominator ? Number((numerator / denominator).toFixed(4)) : null;
}

function summarizeOutcomes(rows, names) {
  const counts = Object.fromEntries(names.map((name) => [name, 0]));
  for (const row of rows) {
    const outcome = text(row.outcome).toLowerCase() || 'unknown';
    if (Object.hasOwn(counts, outcome)) counts[outcome] += 1;
  }
  return counts;
}

function valueBreakdown(rows, field, { onlyErrors = false } = {}) {
  const counts = new Map();
  for (const row of rows) {
    if (onlyErrors && row.outcome !== 'error') continue;
    const value = text(row[field]).toLowerCase() || 'unrecorded';
    counts.set(value, (counts.get(value) || 0) + 1);
  }
  return Object.fromEntries([...counts.entries()].sort((left, right) => (
    right[1] - left[1] || left[0].localeCompare(right[0])
  )));
}

function channelBreakdown(rows) {
  const channels = [...new Set(rows.map((row) => row.channel || 'unknown'))].sort();
  return Object.fromEntries(channels.map((channel) => {
    const channelRows = rows.filter((row) => (row.channel || 'unknown') === channel);
    return [channel, {
      attempts: channelRows.length,
      outcomes: summarizeOutcomes(channelRows, ['success', 'zero', 'not_found', 'error', 'clarification', 'unknown']),
      client_families: valueBreakdown(channelRows, 'client_family'),
      server_versions: valueBreakdown(channelRows, 'server_version'),
      error_codes: valueBreakdown(channelRows, 'error_code', { onlyErrors: true }),
    }];
  }));
}

function latencySummary(rows) {
  const values = rows.map((row) => finiteNumber(row.latency_ms)).filter(Number.isFinite);
  return {
    recorded: values.length,
    coverage: rate(values.length, rows.length),
    p50_ms: percentile(values, 0.5),
    p95_ms: percentile(values, 0.95),
  };
}

function coverage(rows, predicate) {
  return rate(rows.filter(predicate).length, rows.length);
}

function isExactLookup(row) {
  return text(row.tool_name) === 'get_icon' || text(row.query_origin) === 'icon_lookup';
}

function isDirectSearch(row) {
  return text(row.tool_name) === 'search_icons' && text(row.query_origin) === 'agent_query';
}

function isFinalRecommendation(row) {
  return text(row.tool_name) === 'recommend_icons' && text(row.query_origin) === 'agent_query';
}

function isRecommendationVariant(row) {
  return text(row.query_origin) === 'recommend_variant';
}

function isUnclassifiedLive(row) {
  return text(row.traffic_class) === 'unclassified_live';
}

function isToolLedger(row) {
  return text(row.source) === 'mcp_usage_events';
}

function isHostedSearchAudit(row) {
  return text(row.source) === 'search_request_audit';
}

function normalizeEvent(row) {
  return {
    ...row,
    event_identifier: text(row.event_identifier) || null,
    root_request_identifier: text(row.root_request_identifier) || null,
    recorded_at: text(row.recorded_at) || null,
    query: text(row.query) || null,
    query_origin: text(row.query_origin),
    tool_name: text(row.tool_name),
    outcome: text(row.outcome).toLowerCase() || 'unknown',
    traffic_class: text(row.traffic_class) || 'unclassified',
    channel: text(row.channel) || null,
    client_family: text(row.client_family) || null,
    environment: text(row.environment) || null,
    source: text(row.source) || null,
    locale: normalizeLocale(row.locale),
    locale_recorded: booleanValue(row.locale_recorded),
    requested_limit: finiteNumber(row.requested_limit),
    result_count: finiteNumber(row.result_count),
    returned_icon_refs: listValue(row.returned_icon_refs),
    returned_icon_refs_recorded: booleanValue(row.returned_icon_refs_recorded),
    latency_ms: finiteNumber(row.latency_ms),
    server_version: text(row.server_version) || null,
    server_build: text(row.server_build) || null,
    error_code: text(row.error_code) || null,
  };
}

function sourceCoverage(events) {
  const sources = [...new Set(events.map((row) => row.source || 'unrecorded'))].sort();
  return Object.fromEntries(sources.map((source) => {
    const rows = events.filter((row) => (row.source || 'unrecorded') === source);
    return [source, {
      rows: rows.length,
      event_identifier: coverage(rows, (row) => Boolean(row.event_identifier)),
      root_request_identifier: coverage(rows, (row) => Boolean(row.root_request_identifier)),
      error_code_among_errors: coverage(
        rows.filter((row) => row.outcome === 'error'),
        (row) => Boolean(row.error_code),
      ),
      returned_icon_refs_instrumentation: coverage(rows, (row) => row.returned_icon_refs_recorded === true),
      server_version: coverage(rows, (row) => Boolean(row.server_version)),
      server_build: coverage(rows, (row) => Boolean(row.server_build)),
    }];
  }));
}

function detectUnlabeledRepeatedWorkloads(events) {
  const eligible = events.filter((row) => (
    isUnclassifiedLive(row)
    && isToolLedger(row)
    && (isDirectSearch(row) || isFinalRecommendation(row) || isExactLookup(row))
    && row.query
  ));
  const counts = new Map();
  for (const row of eligible) {
    const key = `${row.tool_name}\u0000${row.channel || 'unknown'}\u0000${row.query}`;
    const current = counts.get(key) || {
      tool_name: row.tool_name,
      channel: row.channel || 'unknown',
      attempts: 0,
      distinct_searchers: new Set(),
    };
    current.attempts += 1;
    if (row.searcher_identifier) current.distinct_searchers.add(row.searcher_identifier);
    counts.set(key, current);
  }
  return [...counts.values()]
    .filter((entry) => entry.attempts >= 100 && entry.distinct_searchers.size >= 50)
    .sort((left, right) => right.attempts - left.attempts)
    .map((entry, index) => ({
      pattern: `repeated_pattern_${index + 1}`,
      tool_name: entry.tool_name,
      channel: entry.channel,
      attempts: entry.attempts,
      distinct_searchers: entry.distinct_searchers.size,
    }));
}

function dataQuality(events, inputState) {
  const identifiers = events.map((row) => row.event_identifier).filter(Boolean);
  const duplicateIdentifiers = identifiers.length - new Set(identifiers).size;
  const futureTimestamps = events.filter((row) => {
    if (!row.recorded_at) return false;
    const time = Date.parse(row.recorded_at);
    return Number.isFinite(time) && time > Date.now() + 5 * 60 * 1000;
  }).length;
  const invalidOutcomes = events.filter((row) => !ALLOWED_OUTCOMES.has(row.outcome)).length;
  const contradictions = events.filter((row) => (
    (['zero', 'not_found'].includes(row.outcome) && row.result_count > 0)
    || (row.outcome === 'success' && row.result_count === 0)
  )).length;
  const complete = inputState.events_complete !== false
    && inputState.meta?.completeness?.event_rows_complete !== false;
  const unlabeledRepeatedWorkloads = detectUnlabeledRepeatedWorkloads(events);
  const blockers = [];
  if (!complete) blockers.push('The API reported that the selected event history is incomplete.');
  if (duplicateIdentifiers) blockers.push(`${duplicateIdentifiers} duplicate event identifiers were found.`);
  if (invalidOutcomes) blockers.push(`${invalidOutcomes} events use an unsupported outcome value.`);
  if (contradictions) blockers.push(`${contradictions} events have an outcome that contradicts the result count.`);
  if (futureTimestamps) blockers.push(`${futureTimestamps} events have timestamps more than five minutes in the future.`);
  if (unlabeledRepeatedWorkloads.length) {
    blockers.push(`${unlabeledRepeatedWorkloads.length} high-volume repeated workload pattern(s) are labeled as unclassified live traffic and may be controlled tests.`);
  }
  return {
    expected_grain: 'one recorded request per row',
    rows: events.length,
    complete,
    event_identifier_coverage: coverage(events, (row) => Boolean(row.event_identifier)),
    root_request_identifier_coverage: coverage(events, (row) => Boolean(row.root_request_identifier)),
    duplicate_event_identifiers: duplicateIdentifiers,
    invalid_outcomes: invalidOutcomes,
    contradictory_outcomes: contradictions,
    future_timestamps: futureTimestamps,
    field_coverage: {
      locale: coverage(events, (row) => Boolean(row.locale)),
      tool_name: coverage(events, (row) => Boolean(row.tool_name)),
      result_count: coverage(events, (row) => row.result_count !== null),
      returned_icon_refs_instrumentation: coverage(events, (row) => row.returned_icon_refs_recorded === true),
      latency: coverage(events, (row) => row.latency_ms !== null),
      server_version: coverage(events, (row) => Boolean(row.server_version)),
      server_build: coverage(events, (row) => Boolean(row.server_build)),
      traffic_class: coverage(events, (row) => Boolean(row.traffic_class)),
      source: coverage(events, (row) => Boolean(row.source)),
    },
    field_coverage_by_source: sourceCoverage(events),
    suspected_unlabeled_controlled_workloads: unlabeledRepeatedWorkloads,
    trustworthy_for_operational_counts: blockers.length === 0,
    blockers,
  };
}

function directSearchMetrics(rows) {
  const outcomes = summarizeOutcomes(rows, ['success', 'zero', 'error', 'clarification', 'unknown']);
  const knownResultCounts = rows.filter((row) => row.result_count !== null);
  const lowResults = knownResultCounts.filter((row) => row.result_count >= 1 && row.result_count <= 2).length;
  return {
    definition: 'Top-level search_icons requests with query_origin agent_query. Internal recommendation variants and exact lookups are excluded.',
    attempts: rows.length,
    outcomes,
    error_codes: valueBreakdown(rows, 'error_code', { onlyErrors: true }),
    zero_rate: rate(outcomes.zero, rows.length),
    error_rate: rate(outcomes.error, rows.length),
    low_result_rate_among_known_counts: rate(lowResults, knownResultCounts.length),
    result_count_recorded: knownResultCounts.length,
    latency: latencySummary(rows),
  };
}

function recommendationMetrics(rows) {
  const outcomes = summarizeOutcomes(rows, ['success', 'zero', 'error', 'clarification', 'unknown']);
  return {
    definition: 'Top-level recommend_icons requests with query_origin agent_query. Completion is an operational proxy and does not prove relevance.',
    attempts: rows.length,
    outcomes,
    error_codes: valueBreakdown(rows, 'error_code', { onlyErrors: true }),
    completion_rate: rate(outcomes.success, rows.length),
    clarification_rate: rate(outcomes.clarification, rows.length),
    error_rate: rate(outcomes.error, rows.length),
    latency: latencySummary(rows),
    relevance: {
      status: 'not_measured',
      reason: 'The event export has no human relevance judgment.',
    },
  };
}

function lookupMetrics(rows) {
  const outcomes = summarizeOutcomes(rows, ['success', 'not_found', 'error', 'unknown']);
  return {
    definition: 'Exact get_icon requests. Not found is separate from a direct-search zero and from a system error.',
    attempts: rows.length,
    outcomes,
    error_codes: valueBreakdown(rows, 'error_code', { onlyErrors: true }),
    not_found_rate: rate(outcomes.not_found, rows.length),
    error_rate: rate(outcomes.error, rows.length),
    latency: latencySummary(rows),
  };
}

function localeMetrics(rows) {
  return Object.fromEntries(MAINTAINED_LOCALES.map((locale) => {
    const localeRows = rows.filter((row) => row.locale === locale);
    const outcomes = summarizeOutcomes(localeRows, ['success', 'zero', 'error', 'clarification', 'unknown']);
    return [locale, {
      attempts: localeRows.length,
      zero_rate: rate(outcomes.zero, localeRows.length),
      error_rate: rate(outcomes.error, localeRows.length),
      relevance_reviewed: 0,
      parity_claim_ready: false,
      reason: localeRows.length < 100
        ? 'Fewer than the proposed 100 top-level direct-search attempts are recorded.'
        : 'A relevance review is still required before a live quality parity claim.',
    }];
  }));
}

export function buildAdminSearchQualityScorecard(input) {
  const sourceEvents = Array.isArray(input) ? input : input?.events;
  if (!Array.isArray(sourceEvents)) throw new Error('Expected an Events JSON export or an array of event rows.');
  if (!sourceEvents.length) throw new Error('The event export is empty.');
  const events = sourceEvents.map(normalizeEvent);
  const unclassifiedLive = events.filter(isUnclassifiedLive);
  const liveToolEvents = unclassifiedLive.filter(isToolLedger);
  const controlled = events.filter((row) => CONTROLLED_TRAFFIC.has(row.traffic_class));
  const namedCohort = events.filter((row) => row.traffic_class === 'named_cohort');
  const liveDirect = liveToolEvents.filter(isDirectSearch);
  const liveRecommendations = liveToolEvents.filter(isFinalRecommendation);
  const liveLookups = liveToolEvents.filter(isExactLookup);
  const liveAuditRows = unclassifiedLive.filter(isHostedSearchAudit);
  const liveVariants = liveAuditRows.filter(isRecommendationVariant);
  const quality = dataQuality(events, Array.isArray(input) ? {} : input);
  const generatedAt = new Date().toISOString();
  return {
    schema_version: 2,
    generated_at: generatedAt,
    scope: {
      source: 'admin Events export',
      event_grain: 'one recorded request per row',
      total_events: events.length,
      unclassified_live_events: unclassifiedLive.length,
      named_cohort_events: namedCohort.length,
      controlled_or_local_events: controlled.length,
      caution: 'Unclassified live traffic is not called organic because the telemetry does not prove who generated it.',
      primary_metric_source: 'mcp_usage_events top-level tool rows',
      diagnostic_source: 'search_request_audit hosted search pipeline rows',
    },
    data_quality: quality,
    primary_metrics: {
      direct_search: directSearchMetrics(liveDirect),
      recommendation: recommendationMetrics(liveRecommendations),
    },
    diagnostics: {
      exact_lookup: lookupMetrics(liveLookups),
      recommendation_variants: {
        definition: 'Internal recommendation search variants. These diagnose the recommendation engine and are not user-visible failures.',
        attempts: liveVariants.length,
        outcomes: summarizeOutcomes(liveVariants, ['success', 'zero', 'error', 'clarification', 'unknown']),
      },
      hosted_search_pipeline: {
        definition: 'Lower-level search_request_audit rows. These can include a tool fallback or internal recommendation work and are not added to top-level tool KPIs.',
        attempts: liveAuditRows.length,
        outcomes: summarizeOutcomes(liveAuditRows, ['success', 'zero', 'error', 'clarification', 'unknown']),
        error_codes: valueBreakdown(liveAuditRows, 'error_code', { onlyErrors: true }),
      },
      top_level_tool_events_by_channel: channelBreakdown(liveToolEvents),
      explicit_locale_direct_search: localeMetrics(liveDirect),
    },
    claim_limits: {
      composite_quality_score: 'not_calculated',
      recommendation_relevance: 'not_measured',
      returned_icon_relevance: 'not_measured',
      multilingual_parity: 'not_claimed',
      organic_usage: 'not_claimed',
      reasons: [
        'Completion and zero-result rates do not measure whether returned icons were relevant.',
        'Only explicit recorded locales are used. Query text is not used to guess language.',
        'A proposed 100 attempts per locale is a review trigger, not an industry standard or proof of parity.',
        'Top-level MCP tool events and lower-level hosted search audit rows are kept in separate metrics to prevent fallback double counting.',
      ],
    },
  };
}

export const adminSearchQualityScorecardConstants = Object.freeze({
  maintained_locales: MAINTAINED_LOCALES,
  allowed_outcomes: [...ALLOWED_OUTCOMES],
});
