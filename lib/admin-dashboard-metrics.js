const QUERY_ORIGINS = new Set([
  'agent_query',
  'recommend_variant',
  'icon_lookup',
  'legacy_unknown',
]);

/**
 * @typedef {object} KnownSearchDefect
 * @property {string} id
 * @property {string[]=} library_filters
 * @property {string[]=} search_outcomes
 * @property {string[]=} statuses
 * @property {string[]=} error_codes
 * @property {boolean=} match_null_error_code
 * @property {string|null=} starts_at
 * @property {string|null=} ends_at_inclusive
 */

/**
 * @typedef {object} KnownSearchDefectRegistry
 * @property {KnownSearchDefect[]=} defects
 */

function cleanText(value) {
  const text = String(value ?? '').trim();
  return text || null;
}

function cleanToken(value) {
  return cleanText(value)?.toLowerCase() || null;
}

function nonnegativeInteger(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.round(number) : null;
}

function positiveInteger(value) {
  const number = nonnegativeInteger(value);
  return number !== null && number > 0 ? number : null;
}

function isPresent(value) {
  return value !== null && value !== undefined && value !== '';
}

function normalizeLibrary(value) {
  return cleanToken(value) || 'all';
}

function normalizeQuery(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function normalizeQueryOrigin(value) {
  const token = cleanToken(value);
  return QUERY_ORIGINS.has(token) ? token : 'legacy_unknown';
}

function normalizeOutcome(row) {
  const explicit = cleanToken(row.search_outcome);
  if (['results', 'clarification', 'zero', 'error'].includes(explicit)) return explicit;
  if (cleanToken(row.audit_status) === 'error' || cleanToken(row.status) === 'error') return 'error';
  const resultCount = nonnegativeInteger(row.result_count);
  return resultCount === 0 ? 'zero' : resultCount === null ? null : 'results';
}

function toEpoch(value) {
  const epoch = Date.parse(String(value || ''));
  return Number.isFinite(epoch) ? epoch : null;
}

export function deriveAuditQueryOrigin(row = {}) {
  const toolName = cleanToken(row.tool_name);
  if (toolName === 'recommend_icons') return 'recommend_variant';
  if (toolName === 'get_icon') return 'icon_lookup';
  if (toolName === 'search_icons') return 'agent_query';

  const channel = cleanToken(row.channel || row.analytics_channel);
  const source = cleanToken(row.analytics_source || row.source || row.ui_surface);
  if (channel === 'web') return 'agent_query';
  if (source && ['web', 'site', 'grid', 'hosted_search', 'search_icons'].includes(source)) {
    return 'agent_query';
  }
  return 'legacy_unknown';
}

export function readMcpQueryOrigin(row = {}) {
  return normalizeQueryOrigin(row.query_origin);
}

export function queryOriginNeedsLegacyIconEvidence(queryOrigin) {
  const origin = cleanToken(queryOrigin) || 'all';
  return origin === 'all' || origin === 'legacy_unknown';
}

export function deriveHostedMcpQueryOrigin(toolName) {
  const tool = cleanToken(toolName);
  if (tool === 'search_icons' || tool === 'recommend_icons') return 'agent_query';
  if (tool === 'get_icon') return 'icon_lookup';
  return 'legacy_unknown';
}

export function getRequestedLimitForTool(toolName, args = {}) {
  const tool = cleanToken(toolName);
  if (tool === 'search_icons') return positiveInteger(args.limit) || 10;
  if (tool === 'recommend_icons') {
    return Array.isArray(args.slots) && args.slots.length > 0 ? args.slots.length : null;
  }
  if (tool === 'get_icon') return 1;
  return null;
}

export function buildEstimatedClientIdentity(row = {}) {
  const candidates = [
    ['registered', row.user_id],
    ['api_key', row.api_key_hash],
    ['anonymous', row.anonymous_client_hash],
    ['session', row.session_hash],
    ['ip', row.ip_hash],
  ];
  for (const [kind, rawValue] of candidates) {
    const value = cleanText(rawValue);
    if (!value) continue;
    return {
      key: `${kind}:${value}`,
      kind,
      display_key: `${kind}:${value.slice(0, 12)}`,
    };
  }
  return { key: null, kind: null, display_key: null };
}

/**
 * @param {Record<string, unknown>} row
 * @param {KnownSearchDefectRegistry} registry
 * @returns {KnownSearchDefect|null}
 */
export function matchKnownDefect(row = {}, registry = { defects: [] }) {
  const library = normalizeLibrary(row.library_filter);
  const outcome = normalizeOutcome(row);
  const status = cleanToken(row.audit_status || row.status) || 'ok';
  const errorCode = cleanToken(row.error_code);
  const createdAt = toEpoch(row.created_at);
  if (createdAt === null) return null;

  for (const defect of Array.isArray(registry?.defects) ? registry.defects : []) {
    const libraries = Array.isArray(defect.library_filters)
      ? defect.library_filters.map(normalizeLibrary)
      : [];
    if (libraries.length > 0 && !libraries.includes(library)) continue;

    const outcomes = Array.isArray(defect.search_outcomes)
      ? defect.search_outcomes.map(cleanToken)
      : [];
    if (outcomes.length > 0 && !outcomes.includes(outcome)) continue;

    const statuses = Array.isArray(defect.statuses)
      ? defect.statuses.map(cleanToken)
      : [];
    if (statuses.length > 0 && !statuses.includes(status)) continue;

    const errorCodes = Array.isArray(defect.error_codes)
      ? defect.error_codes.map(cleanToken).filter(Boolean)
      : [];
    if (errorCode) {
      if (errorCodes.length > 0 && !errorCodes.includes(errorCode)) continue;
      if (errorCodes.length === 0) continue;
    } else if (defect.match_null_error_code !== true && errorCodes.length > 0) {
      continue;
    }

    const startsAt = defect.starts_at ? toEpoch(defect.starts_at) : null;
    const endsAt = defect.ends_at_inclusive ? toEpoch(defect.ends_at_inclusive) : null;
    if (startsAt !== null && createdAt < startsAt) continue;
    if (endsAt !== null && createdAt > endsAt) continue;
    return defect;
  }
  return null;
}

/**
 * @param {Record<string, unknown>} row
 * @param {KnownSearchDefectRegistry} registry
 */
export function classifySearchAttempt(row = {}, registry = { defects: [] }) {
  const toolName = cleanToken(row.tool_name);
  const resultCount = nonnegativeInteger(row.result_count);
  const requestedLimit = positiveInteger(row.requested_limit);
  const outcome = normalizeOutcome(row);
  const knownDefect = matchKnownDefect(row, registry);
  const isError = outcome === 'error';
  const isClarification = outcome === 'clarification';
  const isZero = !isError && !isClarification && resultCount === 0;
  const isTrueZero = isZero && !knownDefect;
  const isPartialRecommendation = toolName === 'recommend_icons'
    && !isError
    && !isClarification
    && resultCount !== null
    && requestedLimit !== null
    && resultCount < requestedLimit;
  const exactLowEligible = toolName === 'search_icons' && requestedLimit !== null;
  const isExactLow = exactLowEligible
    && resultCount !== null
    && resultCount > 0
    && resultCount < Math.min(requestedLimit, 3);
  const approximateLowEligible = toolName !== 'recommend_icons'
    && requestedLimit === null
    && !isError
    && !isClarification;
  const isApproximateLow = approximateLowEligible
    && resultCount !== null
    && resultCount > 0
    && resultCount <= 3;

  return {
    outcome,
    result_count: resultCount,
    requested_limit: requestedLimit,
    known_defect_id: knownDefect?.id || null,
    is_error: isError,
    is_clarification: isClarification,
    is_zero: isZero,
    is_true_zero: isTrueZero,
    is_exact_low: isExactLow,
    is_exact_low_eligible: exactLowEligible,
    is_approximate_low: isApproximateLow,
    is_approximate_low_eligible: approximateLowEligible,
    is_partial_recommendation: isPartialRecommendation,
  };
}

function mergeWithAuthority(auditRow, usageRow) {
  const merged = { ...auditRow };
  for (const [key, value] of Object.entries(usageRow)) {
    if (isPresent(value)) merged[key] = value;
  }
  merged.source_table = 'mcp_usage_events';
  merged.source_tables = ['mcp_usage_events', 'search_request_audit'];
  return merged;
}

function telemetryMergeKey(row) {
  const dedupeKey = cleanText(row.dedupe_key);
  if (dedupeKey) return `dedupe:${dedupeKey}`;
  const linkedAuditId = cleanText(row.search_request_audit_id);
  if (linkedAuditId) return `audit:${linkedAuditId}`;
  if (row.source_table === 'search_request_audit') {
    const auditId = cleanText(row.source_row_id);
    if (auditId) return `audit:${auditId}`;
  }
  return null;
}

export function mergeTelemetryEvidenceRows(rows = []) {
  const keyedGroups = new Map();
  const unkeyed = [];

  for (const row of rows) {
    const key = telemetryMergeKey(row);
    if (!key) {
      unkeyed.push(row);
      continue;
    }
    const group = keyedGroups.get(key) || [];
    group.push(row);
    keyedGroups.set(key, group);
  }

  const merged = [...unkeyed];
  for (const group of keyedGroups.values()) {
    const usage = group.find((row) => row.source_table === 'mcp_usage_events');
    const audit = group.find((row) => row.source_table === 'search_request_audit');
    if (usage && audit) {
      merged.push(mergeWithAuthority(audit, usage));
      continue;
    }
    merged.push(usage || audit || group[0]);
  }
  return merged.sort((left, right) => String(right.created_at || '').localeCompare(String(left.created_at || '')));
}

export function utcDay(value) {
  const epoch = toEpoch(value);
  return epoch === null ? null : new Date(epoch).toISOString().slice(0, 10);
}

export function splitCurrentUtcDay(rows = [], now = new Date()) {
  const currentDay = now.toISOString().slice(0, 10);
  const completed = [];
  const current = [];
  for (const row of rows) {
    if (utcDay(row.created_at) === currentDay) current.push(row);
    else completed.push(row);
  }
  return { current_day: currentDay, completed, current };
}

function incrementRollup(target, classification, clientKey) {
  target.attempt_count += 1;
  if (classification.outcome === 'results') target.success_count += 1;
  if (classification.is_true_zero) target.true_zero_count += 1;
  if (classification.is_exact_low) target.low_result_count += 1;
  if (classification.is_exact_low_eligible) target.low_result_eligible_count += 1;
  if (classification.is_approximate_low) target.approximate_low_result_count += 1;
  if (classification.is_error) target.error_count += 1;
  if (classification.is_clarification) target.clarification_count += 1;
  if (classification.is_partial_recommendation) target.partial_recommendation_count += 1;
  if (classification.known_defect_id) target.defect_count += 1;
  if (clientKey) target._clients.add(clientKey);
}

function newRollupBase() {
  return {
    attempt_count: 0,
    success_count: 0,
    true_zero_count: 0,
    low_result_count: 0,
    low_result_eligible_count: 0,
    approximate_low_result_count: 0,
    error_count: 0,
    clarification_count: 0,
    partial_recommendation_count: 0,
    defect_count: 0,
    client_days: 0,
    _clients: new Set(),
  };
}

function finalizeRollup(row) {
  const { _clients, ...publicRow } = row;
  return {
    ...publicRow,
    client_days: _clients.size,
  };
}

/**
 * @param {Record<string, unknown>[]} rows
 * @param {KnownSearchDefectRegistry} registry
 */
export function buildAdminRollups(rows = [], registry = { defects: [] }) {
  const overview = new Map();
  const queries = new Map();

  for (const row of rows) {
    if (cleanToken(row.signal_type) !== 'search_attempt') continue;
    const day = utcDay(row.created_at);
    const queryNorm = normalizeQuery(row.search_query || row.query_norm);
    if (!day || !queryNorm) continue;

    const channel = cleanToken(row.channel) || 'unknown';
    const environment = cleanToken(row.environment) || 'legacy';
    const queryOrigin = normalizeQueryOrigin(row.query_origin);
    const toolName = cleanToken(row.tool_name) || 'unknown';
    const libraryFilter = normalizeLibrary(row.library_filter);
    const identity = buildEstimatedClientIdentity(row);
    const classification = classifySearchAttempt(row, registry);
    const createdAt = new Date(toEpoch(row.created_at)).toISOString();

    const overviewKey = [day, channel, environment, queryOrigin].join('|');
    const overviewEntry = overview.get(overviewKey) || {
      day,
      channel,
      environment,
      query_origin: queryOrigin,
      ...newRollupBase(),
    };
    incrementRollup(overviewEntry, classification, identity.key);
    overview.set(overviewKey, overviewEntry);

    const queryKey = [day, queryNorm, libraryFilter, queryOrigin, channel, environment, toolName].join('|');
    const queryEntry = queries.get(queryKey) || {
      day,
      query_norm: queryNorm,
      library_filter: libraryFilter,
      query_origin: queryOrigin,
      channel,
      environment,
      tool_name: toolName,
      first_seen: createdAt,
      last_seen: createdAt,
      ...newRollupBase(),
    };
    if (createdAt < queryEntry.first_seen) queryEntry.first_seen = createdAt;
    if (createdAt > queryEntry.last_seen) queryEntry.last_seen = createdAt;
    incrementRollup(queryEntry, classification, identity.key);
    queries.set(queryKey, queryEntry);
  }

  return {
    overview: [...overview.values()].map(finalizeRollup),
    queries: [...queries.values()].map(finalizeRollup),
  };
}

/**
 * @param {Record<string, unknown>[]} rows
 * @param {KnownSearchDefectRegistry} registry
 */
export function summarizeRawSearchAttempts(rows = [], registry = { defects: [] }) {
  const clients = new Set();
  const clientDaysByMonth = new Map();
  const summary = newRollupBase();
  let countryResolvedEvents = 0;
  let publicIpEvents = 0;

  for (const row of rows) {
    if (cleanToken(row.signal_type) !== 'search_attempt') continue;
    const classification = classifySearchAttempt(row, registry);
    const identity = buildEstimatedClientIdentity(row);
    incrementRollup(summary, classification, identity.key);
    if (identity.key) {
      clients.add(identity.key);
      const day = utcDay(row.created_at);
      if (day) {
        const monthKey = `${day.slice(0, 7)}|${identity.key}`;
        const days = clientDaysByMonth.get(monthKey) || new Set();
        days.add(day);
        clientDaysByMonth.set(monthKey, days);
      }
    }
    if (row.client_ip_public === true) publicIpEvents += 1;
    if (row.client_ip_public === true && cleanText(row.country_code)) countryResolvedEvents += 1;
  }

  const returningClients = [...clientDaysByMonth.values()].filter((days) => days.size >= 2).length;
  return {
    ...finalizeRollup(summary),
    estimated_unique_clients: clients.size,
    searches_per_client: clients.size > 0 ? Number((summary.attempt_count / clients.size).toFixed(2)) : null,
    returning_clients_within_month: returningClients,
    public_ip_events: publicIpEvents,
    country_resolved_events: countryResolvedEvents,
    country_coverage_rate: publicIpEvents > 0
      ? Number((countryResolvedEvents / publicIpEvents).toFixed(4))
      : null,
  };
}

export const adminDashboardMetricContract = Object.freeze({
  query_origins: [...QUERY_ORIGINS],
  default_query_origin: 'agent_query',
  null_library_key: 'all',
  material_fix_completed_at: '2026-07-15T18:06:17.8324190Z',
});
