const DAY_MS = 86_400_000;
const WINDOW_DAYS = {
  '1d': 1,
  '7d': 7,
  '30d': 30,
  '90d': 90,
  '1y': 365,
  all: null,
};
const VALID_CHANNELS = new Set([
  'all',
  'web',
  'hosted_mcp',
  'local_mcp',
  'internal_test',
  'unknown',
]);

export async function fetchBoundedDashboardV2Pages(
  fetchPage,
  {
    maxRows,
    pageSize = 1000,
    concurrency = 4,
  },
) {
  if (typeof fetchPage !== 'function') throw new TypeError('fetchPage must be a function.');
  if (!Number.isInteger(maxRows) || maxRows < 1) throw new TypeError('maxRows must be a positive integer.');
  if (!Number.isInteger(pageSize) || pageSize < 1) throw new TypeError('pageSize must be a positive integer.');
  if (!Number.isInteger(concurrency) || concurrency < 1) throw new TypeError('concurrency must be a positive integer.');

  const firstSize = Math.min(pageSize, maxRows);
  const first = await fetchPage({ from: 0, to: firstSize - 1, includeCount: true });
  const firstRows = Array.isArray(first?.rows) ? first.rows : [];
  const reportedTotal = Number(first?.total);
  const hasTotal = first?.total !== null
    && first?.total !== undefined
    && Number.isFinite(reportedTotal)
    && reportedTotal >= 0;
  const targetRows = hasTotal ? Math.min(maxRows, reportedTotal) : maxRows;
  const rows = firstRows.slice(0, targetRows);

  if (rows.length >= targetRows || firstRows.length < firstSize) {
    return { rows, total: hasTotal ? reportedTotal : rows.length };
  }

  const starts = [];
  for (let from = firstSize; from < targetRows; from += pageSize) starts.push(from);
  let reachedShortPage = false;
  for (let index = 0; index < starts.length && !reachedShortPage; index += concurrency) {
    const batchStarts = starts.slice(index, index + concurrency);
    const pages = await Promise.all(batchStarts.map(async (from) => {
      const expectedSize = Math.min(pageSize, targetRows - from);
      const page = await fetchPage({
        from,
        to: from + expectedSize - 1,
        includeCount: false,
      });
      return {
        expectedSize,
        rows: Array.isArray(page?.rows) ? page.rows : [],
      };
    }));
    for (const page of pages) {
      rows.push(...page.rows);
      if (!hasTotal && page.rows.length < page.expectedSize) reachedShortPage = true;
    }
  }

  return {
    rows: rows.slice(0, maxRows),
    total: hasTotal ? reportedTotal : Math.min(rows.length, maxRows),
  };
}

function numeric(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function text(value) {
  return String(value ?? '').trim();
}

function dayOf(value) {
  return text(value).slice(0, 10);
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function first(values, fallback = null) {
  return Array.isArray(values) && values.length ? values[0] : fallback;
}

function clientKey(row) {
  return text(row._estimated_client_key || row.estimated_client_key || row.client_key);
}

function displayClientKey(row) {
  return text(row.estimated_client_key || row.client_label || row.client_key) || 'Unknown client';
}

function normalizeCountry(value) {
  const country = text(value).toUpperCase();
  return /^[A-Z]{2}$/.test(country) ? country : 'Unknown';
}

function normalizeChannel(value) {
  const channel = text(value).toLowerCase();
  return VALID_CHANNELS.has(channel) && channel !== 'all' ? channel : 'unknown';
}

function isLiveEnvironment(value) {
  const environment = text(value).toLowerCase();
  return environment === 'production' || environment === 'legacy' || !environment;
}

export function parseDashboardV2Range(url, now = new Date()) {
  const rawWindow = text(url.searchParams.get('window')).toLowerCase();
  const window = Object.hasOwn(WINDOW_DAYS, rawWindow) ? rawWindow : '30d';
  const rawFrom = text(url.searchParams.get('from'));
  const rawTo = text(url.searchParams.get('to'));
  const custom = rawFrom || rawTo || window === 'custom';
  let from;
  let toExclusive;
  let key = window;
  let durationDays;

  if (custom) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(rawFrom) || !/^\d{4}-\d{2}-\d{2}$/.test(rawTo)) {
      throw new Error('Choose both custom dates in YYYY-MM-DD format.');
    }
    const fromMs = Date.parse(`${rawFrom}T00:00:00.000Z`);
    const toMs = Date.parse(`${rawTo}T00:00:00.000Z`);
    if (!Number.isFinite(fromMs) || !Number.isFinite(toMs) || fromMs > toMs) {
      throw new Error('The custom start date must not be after the end date.');
    }
    durationDays = Math.round((toMs - fromMs) / DAY_MS) + 1;
    if (durationDays > 366) throw new Error('Custom date ranges cannot exceed 366 days.');
    from = new Date(fromMs).toISOString();
    toExclusive = new Date(toMs + DAY_MS).toISOString();
    key = 'custom';
  } else {
    const days = WINDOW_DAYS[window];
    durationDays = days;
    if (days === null) {
      from = null;
    } else if (days === 1) {
      from = new Date(now.getTime() - DAY_MS).toISOString();
    } else {
      const todayStartMs = Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
      );
      from = new Date(todayStartMs - ((days - 1) * DAY_MS)).toISOString();
    }
    toExclusive = null;
  }

  return {
    key,
    from,
    to_exclusive: toExclusive,
    from_day: from ? dayOf(from) : null,
    to_day: toExclusive ? dayOf(new Date(Date.parse(toExclusive) - 1).toISOString()) : dayOf(now.toISOString()),
    duration_days: durationDays,
    use_raw: durationDays === 1,
  };
}

export function parseDashboardV2Filters(url, now = new Date()) {
  const rawCutoff = text(url.searchParams.get('data_cutoff'));
  const cutoff = rawCutoff ? new Date(rawCutoff) : now;
  if (!Number.isFinite(cutoff.getTime())) {
    throw new Error('The dashboard data cutoff must be a valid date and time.');
  }
  if (cutoff.getTime() > now.getTime() + 60_000) {
    throw new Error('The dashboard data cutoff cannot be in the future.');
  }
  const range = parseDashboardV2Range(url, cutoff);
  if (rawCutoff && (!range.to_exclusive || Date.parse(range.to_exclusive) > cutoff.getTime())) {
    range.to_exclusive = cutoff.toISOString();
    range.to_day = dayOf(cutoff.toISOString());
  }
  const rawChannel = text(url.searchParams.get('channel')).toLowerCase();
  const channel = VALID_CHANNELS.has(rawChannel) ? rawChannel : 'all';
  const includeTest = text(url.searchParams.get('include_test')).toLowerCase() === 'true';
  const q = text(url.searchParams.get('q')).toLowerCase();
  const rawViewId = text(url.searchParams.get('view_id'));
  const viewId = rawViewId || 'legacy-view';
  if (!/^[a-zA-Z0-9_-]{1,80}$/.test(viewId)) {
    throw new Error('The dashboard view marker is invalid.');
  }
  const filterKey = text(url.searchParams.get('filter_key')) || 'legacy';
  if (filterKey.length > 512) {
    throw new Error('The dashboard filter marker is too long.');
  }
  return {
    ...range,
    channel,
    include_test: includeTest,
    q,
    view_id: viewId,
    data_cutoff: cutoff.toISOString(),
    filter_key: filterKey,
  };
}

export function filterDashboardV2Rows(rows, filters) {
  return rows.filter((row) => {
    if (!filters.include_test && !isLiveEnvironment(row.environment)) return false;
    if (!filters.include_test && normalizeChannel(row.channel) === 'internal_test') return false;
    if (filters.channel !== 'all' && normalizeChannel(row.channel) !== filters.channel) return false;
    if (filters.q) {
      const haystack = [
        row.search_query,
        row.query,
        row.query_norm,
        row.library_filter,
        row.country_code,
        row.channel,
        row.query_origin,
        row.tool_name,
      ].map(text).join(' ').toLowerCase();
      if (!haystack.includes(filters.q)) return false;
    }
    return true;
  });
}

const SERIES_COUNT_FIELDS = [
  'attempt_count',
  'success_count',
  'true_zero_count',
  'low_result_count',
  'low_result_eligible_count',
  'approximate_low_result_count',
  'error_count',
  'clarification_count',
  'partial_recommendation_count',
  'defect_count',
  'client_days',
];

function seriesEntry(day, channel) {
  return {
    day,
    channel,
    attempts: 0,
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
    registered_clients: 0,
    pro_clients: 0,
  };
}

export function buildDashboardV2Series(overviewRows, identityRows = []) {
  const grouped = new Map();
  for (const row of overviewRows) {
    const day = dayOf(row.day);
    if (!day) continue;
    const channel = normalizeChannel(row.channel);
    const key = `${day}|${channel}`;
    const entry = grouped.get(key) || seriesEntry(day, channel);
    entry.attempts += numeric(row.attempt_count);
    for (const field of SERIES_COUNT_FIELDS.filter((value) => value !== 'attempt_count')) {
      entry[field] += numeric(row[field]);
    }
    grouped.set(key, entry);
  }

  const identitySets = new Map();
  for (const row of identityRows) {
    const day = dayOf(row.created_at);
    const keyValue = clientKey(row);
    if (!day || !keyValue) continue;
    const channel = normalizeChannel(row.channel);
    for (const bucket of [`${day}|${channel}`, `${day}|all`]) {
      const sets = identitySets.get(bucket) || { registered: new Set(), pro: new Set(), clients: new Set() };
      sets.clients.add(keyValue);
      if (row.is_registered === true || row.user_id) sets.registered.add(keyValue);
      if (row.is_pro === true) sets.pro.add(keyValue);
      identitySets.set(bucket, sets);
    }
  }

  const days = unique([...grouped.values()].map((row) => row.day)).sort();
  for (const day of days) {
    const rows = [...grouped.values()].filter((row) => row.day === day);
    const aggregate = seriesEntry(day, 'all');
    for (const row of rows) {
      aggregate.attempts += row.attempts;
      for (const field of SERIES_COUNT_FIELDS.filter((value) => value !== 'attempt_count')) {
        aggregate[field] += numeric(row[field]);
      }
      const sets = identitySets.get(`${day}|${row.channel}`);
      if (sets) {
        row.registered_clients = sets.registered.size;
        row.pro_clients = sets.pro.size;
        if (row.client_days === 0) row.client_days = sets.clients.size;
      }
    }
    const aggregateSets = identitySets.get(`${day}|all`);
    if (aggregateSets) {
      aggregate.registered_clients = aggregateSets.registered.size;
      aggregate.pro_clients = aggregateSets.pro.size;
      aggregate.client_days = aggregateSets.clients.size || aggregate.client_days;
    }
    grouped.set(`${day}|all`, aggregate);
  }

  return [...grouped.values()].sort((left, right) => (
    left.day.localeCompare(right.day) || left.channel.localeCompare(right.channel)
  ));
}

export function buildDashboardV2Kpis(series, identityRows = []) {
  const aggregateRows = series.filter((row) => row.channel === 'all');
  const attempts = aggregateRows.reduce((sum, row) => sum + numeric(row.attempts), 0);
  const successCount = aggregateRows.reduce((sum, row) => sum + numeric(row.success_count), 0);
  const trueZeroCount = aggregateRows.reduce((sum, row) => sum + numeric(row.true_zero_count), 0);
  const lowResultCount = aggregateRows.reduce((sum, row) => sum + numeric(row.low_result_count), 0);
  const lowEligible = aggregateRows.reduce((sum, row) => sum + numeric(row.low_result_eligible_count), 0);
  const clients = new Set();
  const registered = new Set();
  const pro = new Set();
  for (const row of identityRows) {
    const key = clientKey(row);
    if (!key) continue;
    clients.add(key);
    if (row.is_registered === true || row.user_id) registered.add(key);
    if (row.is_pro === true) pro.add(key);
  }
  const estimatedClients = clients.size || aggregateRows.reduce((sum, row) => sum + numeric(row.client_days), 0);
  return {
    estimated_unique_clients: estimatedClients,
    registered_clients: registered.size,
    pro_clients: pro.size,
    anonymous_clients: Math.max(0, estimatedClients - registered.size),
    attempts,
    success_count: successCount,
    success_rate: attempts ? successCount / attempts : 0,
    searches_per_client: estimatedClients ? Number((attempts / estimatedClients).toFixed(2)) : 0,
    true_zero_count: trueZeroCount,
    true_zero_rate: attempts ? trueZeroCount / attempts : 0,
    low_result_count: lowResultCount,
    low_result_eligible_count: lowEligible,
    low_result_rate: lowEligible ? lowResultCount / lowEligible : null,
    low_result_rate_available: lowEligible > 0,
    low_result_coverage_rate: attempts ? lowEligible / attempts : 0,
    client_measure: clients.size ? 'estimated_unique_clients' : 'client_days',
  };
}

export function normalizeDashboardV2QueryRows(rows) {
  return rows.map((row) => {
    const attempts = numeric(row.attempt_count);
    const success = numeric(row.success_count ?? row.successful_attempt_count);
    const zero = numeric(row.true_zero_count ?? row.zero_attempt_count);
    const low = numeric(row.low_result_count ?? row.low_attempt_count);
    const clients = numeric(row.estimated_unique_clients ?? row.client_days);
    const auditSources = Array.isArray(row.audit_sources) ? row.audit_sources : [];
    const minimumResultCount = row.minimum_result_count;
    const maximumResultCount = row.maximum_result_count;
    const hasMinimumResultCount = minimumResultCount !== null
      && minimumResultCount !== undefined
      && Number.isFinite(Number(minimumResultCount));
    const hasMaximumResultCount = maximumResultCount !== null
      && maximumResultCount !== undefined
      && Number.isFinite(Number(maximumResultCount));
    return {
      query: text(row.query || row.query_norm),
      library_filter: text(row.library_filter) || 'all',
      query_origins: Array.isArray(row.query_origins) ? row.query_origins : [row.query_origin].filter(Boolean),
      channels: Array.isArray(row.channels) ? row.channels : [row.channel].filter(Boolean),
      countries: Array.isArray(row.countries) ? row.countries : [],
      visitor_kinds: Array.isArray(row.visitor_kinds) ? row.visitor_kinds : [],
      estimated_client_keys: Array.isArray(row.estimated_client_keys) ? row.estimated_client_keys : [],
      searcher_details: Array.isArray(row.searcher_details) ? row.searcher_details : [],
      tools: Array.isArray(row.tools) ? row.tools : [row.tool_name].filter(Boolean),
      account_plans: Array.isArray(row.account_plans) ? row.account_plans : [],
      review_status: row.review_status || null,
      review_note: row.review_note || null,
      attempt_count: attempts,
      success_count: success,
      true_zero_count: zero,
      low_result_count: low,
      low_result_eligible_count: numeric(row.low_result_eligible_count),
      distinct_clients: clients,
      first_seen: row.first_seen || null,
      last_seen: row.last_seen || null,
      result_count: hasMinimumResultCount ? Number(minimumResultCount) : null,
      result_count_min: hasMinimumResultCount ? Number(minimumResultCount) : null,
      result_count_max: hasMaximumResultCount ? Number(maximumResultCount) : null,
      result_sample_count: numeric(row.result_sample_count ?? row.result_samples),
      result_count_available: hasMinimumResultCount,
      mcp_result_rows: numeric(row.mcp_result_rows),
      registered_user_count: numeric(row.registered_user_count),
      pro_user_count: numeric(row.pro_user_count),
      audit_sources: auditSources,
      issue_types: Array.isArray(row.issue_types)
        ? row.issue_types
        : [
          ...(zero > 0 ? ['zero_result'] : []),
          ...(low > 0 ? ['low_result'] : []),
          ...(success > 0 ? ['successful'] : []),
        ],
    };
  }).filter((row) => row.query);
}

export function buildDashboardV2TopLists(rows) {
  const normalized = normalizeDashboardV2QueryRows(rows);
  const searched = [...normalized]
    .sort((left, right) => right.attempt_count - left.attempt_count || left.query.localeCompare(right.query))
    .slice(0, 100)
    .map((row) => ({
      query: row.query,
      library_filter: row.library_filter,
      searches: row.attempt_count,
      distinct_clients: row.distinct_clients,
      client_measure: row.audit_sources.includes('admin_rollup_queries') ? 'client_days' : 'estimated_unique_clients',
      hit_rate: row.attempt_count ? row.success_count / row.attempt_count : 0,
      last_seen: row.last_seen,
    }));
  const zero = normalized
    .filter((row) => row.true_zero_count > 0)
    .sort((left, right) => right.true_zero_count - left.true_zero_count || right.distinct_clients - left.distinct_clients)
    .slice(0, 100)
    .map((row) => ({
      query: row.query,
      library_filter: row.library_filter,
      count: row.true_zero_count,
      distinct_clients: row.distinct_clients,
      client_measure: row.audit_sources.includes('admin_rollup_queries') ? 'client_days' : 'estimated_unique_clients',
      last_seen: row.last_seen,
    }));
  return { searched, zero };
}

export function aggregateDashboardV2IconRows(rows, countLabel = 'count') {
  const grouped = new Map();
  for (const row of rows) {
    const iconId = text(row.icon_id);
    if (!iconId) continue;
    const entry = grouped.get(iconId) || {
      icon_id: iconId,
      library: text(row.library) || iconId.split(':')[0] || null,
      count: 0,
      clients: new Set(),
      queries: new Set(),
      actions: new Set(),
    };
    entry.count += 1;
    const key = clientKey(row) || text(row.session_hash);
    if (key) entry.clients.add(key);
    const query = text(row.search_query || row.query_norm);
    if (query) entry.queries.add(query);
    const action = text(row.evidence_text);
    if (action) entry.actions.add(action);
    grouped.set(iconId, entry);
  }
  return [...grouped.values()]
    .sort((left, right) => right.count - left.count || left.icon_id.localeCompare(right.icon_id))
    .slice(0, 100)
    .map((entry) => ({
      icon_id: entry.icon_id,
      library: entry.library,
      [countLabel]: entry.count,
      count: entry.count,
      distinct_clients: entry.clients.size,
      distinct_queries: entry.queries.size,
      action: first([...entry.actions].sort(), null),
    }));
}

export function buildDashboardV2Geography(rows) {
  const grouped = new Map();
  let withCountry = 0;
  for (const row of rows) {
    const country = normalizeCountry(row.country_code);
    if (country !== 'Unknown') withCountry += 1;
    const entry = grouped.get(country) || { country_code: country, searches: 0, clients: new Set() };
    entry.searches += 1;
    const key = clientKey(row);
    if (key) entry.clients.add(key);
    grouped.set(country, entry);
  }
  const total = rows.length;
  return {
    available: true,
    coverage_rate: total ? withCountry / total : 0,
    rows: [...grouped.values()]
      .sort((left, right) => right.searches - left.searches || left.country_code.localeCompare(right.country_code))
      .map((entry) => ({
        country_code: entry.country_code,
        searches: entry.searches,
        distinct_clients: entry.clients.size,
        percentage: total ? entry.searches / total : 0,
      })),
  };
}

export function maskDashboardV2Identifier(value) {
  const identifier = text(value);
  if (!identifier.includes('@')) return identifier ? `${identifier.slice(0, 8)}...` : 'Hidden';
  const [local, domain] = identifier.split('@');
  return `${local.slice(0, 1) || '*'}***@${domain}`;
}

function topQuery(queryCounts) {
  return [...queryCounts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))[0]?.[0] || null;
}

export function buildDashboardV2Clients(rows) {
  const grouped = new Map();
  for (const row of rows) {
    const key = clientKey(row);
    if (!key) continue;
    const entry = grouped.get(key) || {
      client_key: displayClientKey(row),
      visitor_kind: text(row.visitor_kind) || 'anonymous',
      plan: text(row.account_plan) || 'Free',
      countries: new Map(),
      first_seen: row.created_at || null,
      last_seen: row.created_at || null,
      searches: 0,
      queries: new Map(),
      user_id: row.user_id || null,
      is_registered: row.is_registered === true || Boolean(row.user_id),
      is_pro: row.is_pro === true,
    };
    entry.searches += 1;
    const country = normalizeCountry(row.country_code);
    entry.countries.set(country, numeric(entry.countries.get(country)) + 1);
    const query = text(row.search_query || row.query_norm);
    if (query) entry.queries.set(query, numeric(entry.queries.get(query)) + 1);
    if (!entry.first_seen || text(row.created_at) < text(entry.first_seen)) entry.first_seen = row.created_at;
    if (!entry.last_seen || text(row.created_at) > text(entry.last_seen)) entry.last_seen = row.created_at;
    if (row.is_pro === true) {
      entry.is_pro = true;
      entry.visitor_kind = 'pro';
    } else if (row.is_registered === true || row.user_id) {
      entry.is_registered = true;
      if (entry.visitor_kind === 'anonymous') entry.visitor_kind = 'registered';
    }
    if (row.account_plan) entry.plan = row.account_plan;
    grouped.set(key, entry);
  }
  return [...grouped.values()]
    .sort((left, right) => text(right.last_seen).localeCompare(text(left.last_seen)))
    .map((entry) => ({
      client_key: entry.client_key,
      visitor_kind: entry.visitor_kind,
      plan: entry.plan,
      country_code: [...entry.countries.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] || 'Unknown',
      first_seen: entry.first_seen,
      last_seen: entry.last_seen,
      searches: entry.searches,
      top_query: topQuery(entry.queries),
      user_id: entry.user_id,
      is_registered: entry.is_registered,
      is_pro: entry.is_pro,
    }));
}

export function parseDashboardV2QuerySearch(value) {
  const filters = {};
  const plain = [];
  for (const token of text(value).split(/\s+/).filter(Boolean)) {
    const separator = token.indexOf(':');
    if (separator > 0) {
      const key = token.slice(0, separator).toLowerCase();
      const filterValue = token.slice(separator + 1).toLowerCase();
      if (['zero', 'low', 'venue', 'country', 'origin', 'registered'].includes(key) && filterValue) {
        filters[key] = filterValue;
        continue;
      }
    }
    plain.push(token.toLowerCase());
  }
  return { filters, text: plain.join(' ') };
}

export function filterDashboardV2QueryRows(rows, searchValue, issue = '') {
  const parsed = parseDashboardV2QuerySearch(searchValue);
  return normalizeDashboardV2QueryRows(rows).filter((row) => {
    if (parsed.text) {
      const haystack = [
        row.query,
        row.library_filter,
        ...row.channels,
        ...row.countries,
        ...row.query_origins,
      ].join(' ').toLowerCase();
      if (!haystack.includes(parsed.text)) return false;
    }
    const zeroRequired = issue === 'zero_result' || parsed.filters.zero === 'true';
    const lowRequired = issue === 'low_result' || parsed.filters.low === 'true';
    if (zeroRequired && row.true_zero_count === 0) return false;
    if (lowRequired && row.low_result_count === 0) return false;
    if (parsed.filters.venue && !row.channels.includes(parsed.filters.venue)) return false;
    if (parsed.filters.country && !row.countries.map((value) => text(value).toLowerCase()).includes(parsed.filters.country)) return false;
    if (parsed.filters.origin) {
      const expected = parsed.filters.origin === 'user' ? 'agent_query' : parsed.filters.origin;
      if (!row.query_origins.includes(expected)) return false;
    }
    if (parsed.filters.registered === 'true' && row.registered_user_count === 0 && !row.visitor_kinds.includes('registered') && !row.visitor_kinds.includes('pro')) return false;
    if (parsed.filters.registered === 'false' && (row.registered_user_count > 0 || row.visitor_kinds.includes('registered') || row.visitor_kinds.includes('pro'))) return false;
    return true;
  });
}

export function compactDashboardV2QueryRows(rows) {
  return rows.map((row) => {
    const attempts = numeric(row.attempt_count);
    const zeroCount = numeric(row.true_zero_count ?? row.zero_attempt_count);
    const allZero = attempts > 0 && zeroCount === attempts;
    const mixed = zeroCount > 0 && zeroCount < attempts;
    const low = numeric(row.low_result_count ?? row.low_attempt_count) > 0;
    const aggregateView = Array.isArray(row.audit_sources)
      && row.audit_sources.includes('admin_rollup_queries');
    const queryOrigin = first(row.query_origins, 'legacy_unknown');
    const tools = unique(Array.isArray(row.tools) ? row.tools : []);
    const resultSamples = numeric(row.result_sample_count);
    const resultMin = row.result_count_min !== null
      && row.result_count_min !== undefined
      && Number.isFinite(Number(row.result_count_min))
      ? Number(row.result_count_min)
      : row.result_count !== null
        && row.result_count !== undefined
        && Number.isFinite(Number(row.result_count))
        ? Number(row.result_count)
        : null;
    const resultMax = row.result_count_max !== null
      && row.result_count_max !== undefined
      && Number.isFinite(Number(row.result_count_max))
      ? Number(row.result_count_max)
      : null;
    const hasCompleteRange = resultMin !== null && resultMax !== null;
    const exactFromSamples = resultMin !== null
      && (hasCompleteRange
        ? resultMin === resultMax
        : resultSamples === 1 || (resultSamples === 0 && attempts === 1));
    const rangeAvailable = !aggregateView
      && hasCompleteRange
      && resultMin !== resultMax;
    const resultCountAvailable = allZero || (!aggregateView && (exactFromSamples || rangeAvailable));
    const resultCountKind = allZero || exactFromSamples
      ? 'exact'
      : rangeAvailable
        ? 'range_across_attempts'
        : 'unavailable';
    const resultUnit = queryOrigin === 'icon_lookup'
      ? 'match'
      : queryOrigin === 'agent_query' && tools.includes('recommend_icons')
        ? 'primary_pick'
        : 'icon';
    const lookupEvents = numeric(row.mcp_result_rows);
    const activityCount = attempts || lookupEvents || resultSamples;
    const activityUnit = queryOrigin === 'icon_lookup' ? 'lookup' : 'search';
    const activityLabel = activityCount === 1
      ? activityUnit
      : activityUnit === 'search'
        ? 'searches'
        : 'lookups';
    const countries = unique(Array.isArray(row.countries) ? row.countries : []);
    const countryCode = countries.length === 1 ? countries[0] : null;
    const channels = unique(Array.isArray(row.channels) ? row.channels : []);
    const channel = channels.length === 1 ? channels[0] : 'unknown';
    const outcomeLabel = allZero
      ? 'Zero'
      : mixed
        ? `Mixed: ${zeroCount} of ${attempts} zero`
        : low
          ? 'Low'
          : 'Success';
    return {
      query: row.query,
      library_filter: row.library_filter,
      query_origin: queryOrigin,
      origin: queryOrigin,
      visitor_kind: first(row.visitor_kinds, row.registered_user_count > 0 ? 'registered' : 'anonymous'),
      activity_count: activityCount,
      activity_kind: activityUnit,
      activity_label: `${activityCount} ${activityLabel}`,
      estimated_client_id_count: row.distinct_clients,
      searchers: aggregateView
        ? []
        : (Array.isArray(row.searcher_details) ? row.searcher_details : []),
      searcher_details_available: !aggregateView && Array.isArray(row.searcher_details),
      searcher_details_reason: aggregateView
        ? 'Searcher details are not available for a grouped daily view.'
        : null,
      estimated_client_id_count_reason: aggregateView
        ? 'Daily reach is available for this grouped period.'
        : 'Searchers seen in the selected period.',
      country_code: countryCode,
      country_count: countries.length,
      country_available: countries.length === 1,
      country_reason: countries.length > 1
        ? `${countries.length} countries across grouped attempts`
        : countryCode
        ? null
        : aggregateView
          ? 'Not available for aggregate view'
          : 'Country not recorded',
      channel,
      channel_count: channels.length,
      channel_available: channels.length === 1,
      channel_reason: channels.length > 1
        ? `${channels.length} venues across grouped attempts`
        : channels.length === 0
          ? 'Venue not recorded'
          : null,
      result_count: allZero ? 0 : resultCountKind === 'exact' ? resultMin : null,
      result_count_min: rangeAvailable ? resultMin : null,
      result_count_max: rangeAvailable ? resultMax : null,
      result_unit: resultUnit,
      result_count_available: resultCountAvailable,
      result_count_kind: resultCountKind,
      result_count_reason: resultCountAvailable
        ? resultCountKind === 'range_across_attempts'
          ? `Results ranged from ${resultMin} to ${resultMax} across ${activityCount} ${activityLabel}`
          : null
        : aggregateView
          ? 'Not available for aggregate view'
          : mixed
            ? 'Mixed outcomes in selected view'
            : 'Not available for this view',
      issue_type: allZero ? 'zero_result' : mixed ? 'mixed_result' : low ? 'low_result' : 'successful',
      outcome_label: outcomeLabel,
      attempt_count: attempts,
      zero_attempt_count: zeroCount,
      low_attempt_count: numeric(row.low_result_count ?? row.low_attempt_count),
      distinct_clients: row.distinct_clients,
      first_seen: row.first_seen,
      last_seen: row.last_seen,
      review_status: row.review_status,
      review_note: row.review_note,
    };
  });
}
