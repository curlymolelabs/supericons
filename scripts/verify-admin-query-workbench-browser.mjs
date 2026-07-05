import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const adminUrl = process.env.ADMIN_WORKBENCH_URL || 'http://127.0.0.1:5173/admin.html';
const apiBase = 'https://kcjmkakdhsqplvasgkjv.supabase.co/functions/v1/admin-api';

const queryRows = [
  {
    query: 'boxrec',
    library_filter: 'all',
    job_category: '',
    issue_types: ['zero_result'],
    attempt_count: 2,
    zero_attempt_count: 2,
    low_attempt_count: 0,
    average_result_count: 0,
    minimum_result_count: 0,
    replacement_count: 0,
    successful_signal_count: 0,
    copy_count: 0,
    favorite_count: 0,
    mcp_batch_count: 0,
    first_seen: '2026-06-01T10:00:00Z',
    last_seen: '2026-06-10T10:00:00Z',
    review_status: null,
    review_note: null,
    review_updated_at: null,
    surfaces: ['site'],
  },
  {
    query: 'boxing ring',
    library_filter: 'all',
    job_category: '',
    issue_types: ['zero_result'],
    attempt_count: 1,
    zero_attempt_count: 1,
    low_attempt_count: 0,
    average_result_count: 0,
    minimum_result_count: 0,
    replacement_count: 0,
    successful_signal_count: 0,
    copy_count: 0,
    favorite_count: 0,
    mcp_batch_count: 0,
    first_seen: '2026-06-03T10:00:00Z',
    last_seen: '2026-06-09T10:00:00Z',
    review_status: 'needs_icon',
    review_note: 'Add sports venue icon candidate.',
    review_updated_at: '2026-06-10T12:00:00Z',
    surfaces: ['site'],
  },
  {
    query: 'deepseek',
    library_filter: 'all',
    job_category: 'ai-agent-workflows',
    issue_types: ['low_result', 'mcp'],
    attempt_count: 3,
    zero_attempt_count: 0,
    low_attempt_count: 3,
    average_result_count: 1,
    minimum_result_count: 1,
    replacement_count: 0,
    successful_signal_count: 0,
    copy_count: 0,
    favorite_count: 0,
    mcp_batch_count: 1,
    first_seen: '2026-06-04T10:00:00Z',
    last_seen: '2026-06-08T10:00:00Z',
    review_status: null,
    review_note: null,
    review_updated_at: null,
    surfaces: ['mcp'],
  },
  {
    query: 'openai simpleicons',
    library_filter: 'simpleicons',
    job_category: 'ai-agent-workflows',
    issue_types: ['replacement_heavy', 'successful'],
    attempt_count: 4,
    zero_attempt_count: 0,
    low_attempt_count: 0,
    average_result_count: 9,
    minimum_result_count: 6,
    replacement_count: 3,
    successful_signal_count: 2,
    copy_count: 1,
    favorite_count: 1,
    mcp_batch_count: 0,
    first_seen: '2026-06-02T10:00:00Z',
    last_seen: '2026-06-07T10:00:00Z',
    review_status: 'resolved',
    review_note: 'Ranking looks acceptable.',
    review_updated_at: '2026-06-09T12:00:00Z',
    surfaces: ['site'],
  },
];

for (let index = 1; index <= 28; index += 1) {
  queryRows.push({
    query: `older query ${String(index).padStart(2, '0')}`,
    library_filter: 'all',
    job_category: 'status-feedback',
    issue_types: ['successful'],
    attempt_count: 1,
    zero_attempt_count: 0,
    low_attempt_count: 0,
    average_result_count: 8,
    minimum_result_count: 5,
    replacement_count: 0,
    successful_signal_count: 1,
    copy_count: 1,
    favorite_count: 0,
    mcp_batch_count: 0,
    first_seen: `2026-05-${String(index).padStart(2, '0')}T10:00:00Z`,
    last_seen: `2026-05-${String(index).padStart(2, '0')}T10:00:00Z`,
    review_status: null,
    review_note: null,
    review_updated_at: null,
    surfaces: ['site'],
  });
}

queryRows.forEach((row) => {
  if (row.successful_attempt_count === undefined) {
    row.successful_attempt_count = row.issue_types.includes('successful')
      ? Math.max(0, Number(row.attempt_count || 0) - Number(row.zero_attempt_count || 0) - Number(row.low_attempt_count || 0))
      : 0;
  }
  row.session_count = row.session_count || 1;
  row.ip_hash_count = row.ip_hash_count || 1;
  row.ip_hash_prefixes = row.ip_hash_prefixes || ['abc123def456'];
  row.countries = row.countries || ['US'];
  row.registered_user_count = row.query === 'boxrec' ? 1 : 0;
  row.pro_user_count = row.query === 'boxrec' ? 1 : 0;
  row.account_plans = row.query === 'boxrec' ? ['pro_monthly'] : [];
  row.subscription_statuses = row.query === 'boxrec' ? ['active'] : [];
  row.audit_sources = row.audit_sources || ['icon_evidence'];
  row.domains = row.domains || ['supericons.dev'];
  row.context_urls = row.context_urls || ['/'];
  row.environments = row.environments || ['production'];
});

queryRows.push({
  query: 'local-only query',
  library_filter: 'all',
  job_category: '',
  issue_types: ['zero_result'],
  attempt_count: 1,
  zero_attempt_count: 1,
  low_attempt_count: 0,
  average_result_count: 0,
  minimum_result_count: 0,
  replacement_count: 0,
  successful_signal_count: 0,
  copy_count: 0,
  favorite_count: 0,
  mcp_batch_count: 0,
  first_seen: '2026-06-11T10:00:00Z',
  last_seen: '2026-06-11T10:00:00Z',
  review_status: null,
  review_note: null,
  review_updated_at: null,
  surfaces: ['site'],
  session_count: 1,
  ip_hash_count: 1,
  ip_hash_prefixes: ['local1234567'],
  countries: [],
  registered_user_count: 0,
  pro_user_count: 0,
  account_plans: [],
  subscription_statuses: [],
  audit_sources: ['icon_evidence'],
  domains: ['localhost'],
  context_urls: ['/'],
  environments: ['local'],
});

queryRows.push({
  query: 'stale mcp source row',
  library_filter: 'all',
  job_category: 'ai-agent-workflows',
  issue_types: ['mcp', 'successful'],
  attempt_count: 1,
  zero_attempt_count: 0,
  low_attempt_count: 0,
  average_result_count: 4,
  minimum_result_count: 4,
  replacement_count: 0,
  successful_signal_count: 0,
  copy_count: 0,
  favorite_count: 0,
  mcp_batch_count: 1,
  first_seen: '2026-06-12T10:00:00Z',
  last_seen: '2026-06-12T10:00:00Z',
  review_status: null,
  review_note: null,
  review_updated_at: null,
  surfaces: ['mcp'],
  channels: ['unknown'],
  environments: ['legacy'],
  audit_sources: ['search_request_audit'],
  session_count: 1,
  ip_hash_count: 1,
  ip_hash_prefixes: ['mcp123456789'],
  countries: ['SG'],
});

queryRows.push({
  query: 'unclassified audit source row',
  library_filter: 'all',
  job_category: '',
  issue_types: ['zero_result'],
  attempt_count: 1,
  zero_attempt_count: 1,
  low_attempt_count: 0,
  average_result_count: 0,
  minimum_result_count: 0,
  replacement_count: 0,
  successful_signal_count: 0,
  copy_count: 0,
  favorite_count: 0,
  mcp_batch_count: 0,
  first_seen: '2026-06-12T11:00:00Z',
  last_seen: '2026-06-12T11:00:00Z',
  review_status: null,
  review_note: null,
  review_updated_at: null,
  surfaces: ['unclassified_hosted_search'],
  channels: ['unknown'],
  environments: ['legacy'],
  audit_sources: ['search_request_audit'],
  session_count: 1,
  ip_hash_count: 1,
  ip_hash_prefixes: ['unk123456789'],
  countries: [],
});

const evidenceRows = [
  {
    id: 'e1',
    signal_type: 'search_attempt',
    icon_id: null,
    search_query: 'boxrec',
    job_category: '',
    ui_surface: 'site',
    evidence_text: 'settled search',
    result_count: 0,
    library_filter: 'all',
    session_hash: 'visitor-boxrec-01',
    ip_hash_prefix: 'abc123def456',
    country_code: 'US',
    user_id: 'user-boxrec',
    is_registered: true,
    account_plan: 'pro_monthly',
    subscription_status: 'active',
    is_pro: true,
    domain: 'supericons.dev',
    context_url: '/',
    environment: 'production',
    created_at: '2026-06-10T10:00:00Z',
  },
  {
    id: 'e2',
    signal_type: 'search_attempt',
    icon_id: null,
    search_query: 'boxrec',
    job_category: '',
    ui_surface: 'site',
    evidence_text: 'settled search',
    result_count: 0,
    library_filter: 'all',
    session_hash: 'visitor-boxrec-02',
    domain: 'supericons.dev',
    context_url: '/',
    environment: 'production',
    created_at: '2026-06-09T10:00:00Z',
  },
  {
    id: 'e3',
    signal_type: 'search_attempt',
    icon_id: null,
    search_query: 'deepseek',
    job_category: 'ai-agent-workflows',
    ui_surface: 'mcp',
    evidence_text: 'agent query',
    result_count: 1,
    library_filter: 'all',
    session_hash: 'visitor-deepseek-01',
    domain: 'supericons.dev',
    context_url: '/',
    environment: 'production',
    created_at: '2026-06-08T10:00:00Z',
  },
  {
    id: 'e5',
    signal_type: 'hosted_search_audit',
    icon_id: null,
    search_query: 'hosted audit query',
    job_category: 'ai-agent-workflows',
    ui_surface: 'hosted',
    evidence_text: 'hosted search request',
    result_count: 7,
    library_filter: 'lucide',
    session_hash: 'visitor-hosted-01',
    domain: 'supericons.dev',
    context_url: '/api/search',
    environment: 'production',
    created_at: '2026-06-07T10:00:00Z',
  },
  {
    id: 'e4',
    signal_type: 'search_attempt',
    icon_id: null,
    search_query: 'local-only query',
    job_category: '',
    ui_surface: 'site',
    evidence_text: 'local settled search',
    result_count: 0,
    library_filter: 'all',
    session_hash: 'visitor-local-01',
    domain: 'localhost',
    context_url: '/',
    environment: 'local',
    created_at: '2026-06-11T10:00:00Z',
  },
];

function normalizeMockToken(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');
}

function mockHostedAuditRow(row) {
  return [
    ...(Array.isArray(row.audit_sources) ? row.audit_sources : []),
    ...(Array.isArray(row.surfaces) ? row.surfaces : []),
    row.source_table,
  ].map(normalizeMockToken).some((value) => value === 'search_request_audit' || value === 'unclassified_hosted_search');
}

function mockChannelFromValue(value) {
  const source = normalizeMockToken(value);
  if (!source || source === 'unknown' || source === 'legacy' || source === 'unclassified' || source === 'unclassified_hosted_search') return '';
  if (source.includes('local_mcp') || source === 'npm' || source === 'npx') return 'local_mcp';
  if (source === 'mcp' || source === 'hosted_mcp' || source === 'mcp_search' || source.includes('mcp')) return 'hosted_mcp';
  if (source === 'cli' || source.includes('cli')) return 'cli';
  if (source === 'api' || source.includes('api')) return 'api';
  if (source.includes('test') || source.includes('verify') || source.includes('trap')) return 'internal_test';
  if (source === 'web' || source === 'site' || source === 'grid' || source === 'hosted_search' || source === 'search_icons') return 'web';
  return '';
}

function mockRowChannels(row) {
  const channels = new Set();
  (row.channels || []).forEach((value) => {
    const normalized = normalizeMockToken(value);
    if (normalized && normalized !== 'all') channels.add(normalized);
  });
  [
    ...(Array.isArray(row.surfaces) ? row.surfaces : []),
    ...(Array.isArray(row.audit_sources) ? row.audit_sources : []),
    row.source,
    row.analytics_source,
    row.ui_surface,
  ].forEach((value) => {
    const channel = mockChannelFromValue(value);
    if (channel) channels.add(channel);
  });
  if ((row.issue_types || []).includes('mcp') || Number(row.mcp_batch_count || 0) > 0) channels.add('hosted_mcp');
  const known = [...channels].filter((value) => value && value !== 'unknown');
  return known.length ? known : [...channels].filter(Boolean);
}

function mockEnvironmentFromValue(value) {
  const source = normalizeMockToken(value);
  if (!source || source === 'unknown' || source === 'legacy' || source === 'unclassified' || source === 'unclassified_hosted_search') return '';
  if (source.includes('local')) return 'local';
  if (source.includes('preview') || source.includes('netlify')) return 'preview';
  if (source.includes('test') || source.includes('verify') || source.includes('internal') || source.includes('trap')) return 'test';
  if (source === 'web' || source === 'hosted_search' || source === 'mcp' || source.includes('mcp') || source === 'api' || source === 'cli') return 'production';
  return '';
}

function mockRowEnvironments(row) {
  const environments = new Set();
  (row.environments || []).forEach((value) => {
    const normalized = normalizeMockToken(value);
    if (['production', 'preview', 'local', 'test'].includes(normalized)) {
      environments.add(normalized);
    } else if (normalized === 'legacy' && !mockHostedAuditRow(row)) {
      environments.add('legacy');
    }
  });
  [
    ...(Array.isArray(row.surfaces) ? row.surfaces : []),
    row.source,
    row.analytics_source,
    row.ui_surface,
  ].forEach((value) => {
    const environment = mockEnvironmentFromValue(value);
    if (environment) environments.add(environment);
  });
  if (mockHostedAuditRow(row)) environments.add('production');
  if (!environments.size) environments.add(row.environment || 'legacy');
  if (environments.size > 1 && environments.has('legacy')) environments.delete('legacy');
  return [...environments];
}

function rowMatchesEnvironment(row, environment) {
  const normalized = environment || 'live';
  if (normalized === 'all') return true;
  const environments = mockRowEnvironments(row);
  if (normalized === 'live') return environments.includes('production');
  return environments.includes(normalized);
}

function rowMatchesChannel(row, channel) {
  const normalized = channel || 'all';
  if (normalized === 'all') return true;
  return mockRowChannels(row).includes(normalized);
}

function applyQueryQueue(url) {
  let rows = [...queryRows];
  const issue = url.searchParams.get('issue_type') || '';
  const status = url.searchParams.get('status') || '';
  const q = (url.searchParams.get('q') || '').toLowerCase();
  const sort = url.searchParams.get('sort') || 'zero_attempt_count';
  const direction = url.searchParams.get('direction') || 'desc';
  const environment = url.searchParams.get('environment') || 'live';
  const channel = url.searchParams.get('channel') || 'all';

  rows = rows.filter((row) => rowMatchesEnvironment(row, environment));
  rows = rows.filter((row) => rowMatchesChannel(row, channel));
  if (issue) rows = rows.filter((row) => row.issue_types.includes(issue));
  if (status) {
    rows = rows.filter((row) => (
      status === 'untriaged' ? !row.review_status : row.review_status === status
    ));
  }
  if (q) {
    rows = rows.filter((row) => [
      row.query,
      row.library_filter,
      row.job_category,
      row.review_note || '',
    ].join(' ').toLowerCase().includes(q));
  }

  rows.sort((a, b) => {
    const aValue = sort === 'status' ? (a.review_status || 'untriaged') : a[sort];
    const bValue = sort === 'status' ? (b.review_status || 'untriaged') : b[sort];
    const compared = typeof aValue === 'number' && typeof bValue === 'number'
      ? aValue - bValue
      : String(aValue ?? '').localeCompare(String(bValue ?? ''));
    return direction === 'asc' ? compared : -compared;
  });

  const pageSize = Number(url.searchParams.get('page_size') || 25);
  const page = Number(url.searchParams.get('page') || 1);
  const pageRows = rows.slice((page - 1) * pageSize, page * pageSize);

  return {
    queries: pageRows,
    pagination: {
      page,
      page_size: pageSize,
      total: rows.length,
      page_count: Math.max(1, Math.ceil(rows.length / pageSize)),
    },
    summary: {
      total_queries: rows.length,
      untriaged: rows.filter((row) => !row.review_status).length,
      needs_alias: rows.filter((row) => row.review_status === 'needs_alias').length,
      needs_icon: rows.filter((row) => row.review_status === 'needs_icon').length,
      resolved: rows.filter((row) => row.review_status === 'resolved').length,
      ignore: rows.filter((row) => row.review_status === 'ignore').length,
      zero_result: rows.filter((row) => row.issue_types.includes('zero_result')).length,
      low_result: rows.filter((row) => row.issue_types.includes('low_result')).length,
      replacement_heavy: rows.filter((row) => row.issue_types.includes('replacement_heavy')).length,
      successful: rows.filter((row) => row.issue_types.includes('successful')).length,
      mcp: rows.filter((row) => row.issue_types.includes('mcp')).length,
      query_review_feature_available: true,
    },
    filters: Object.fromEntries(url.searchParams.entries()),
    sort: {
      field: sort,
      direction,
    },
    window: {
      key: '30d',
      short_label: '30d',
      long_label: 'Last 30 days',
    },
  };
}

function ok(condition, message) {
  if (!condition) throw new Error(message);
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, acceptDownloads: true });
await page.addInitScript(() => window.localStorage.removeItem('si_admin_sidebar_collapsed'));
let forceFallbackRoutes = false;

await page.route(`${apiBase}**`, async (route) => {
  const req = route.request();
  const url = new URL(req.url());
  const path = url.pathname.replace('/functions/v1/admin-api', '');
  const headers = {
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'content-type, x-admin-secret',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'content-type': 'application/json',
  };

  if (req.method() === 'OPTIONS') {
    await route.fulfill({ status: 204, headers, body: '' });
    return;
  }

  if (forceFallbackRoutes && [
    '/intelligence/search/queue',
    '/intelligence/search/query-detail',
    '/intelligence/search/export',
  ].includes(path)) {
    await route.fulfill({ status: 404, headers, json: { error: `No mock for ${path}` } });
    return;
  }

  if (path === '/stats') {
    await route.fulfill({
      status: 200,
      headers,
      json: {
        stats: {
          total_users: 0,
          active_pro: 0,
          total_purchases: 0,
          new_users_30d: 0,
          hosted_search: { total_requests_24h: 0, p95_latency_ms: 0, trap_hits_30d: 0, top_sources: [] },
          recent_signups: [],
          recent_audit: [],
        },
      },
    });
    return;
  }

  if (path === '/users') {
    await route.fulfill({ status: 200, headers, json: { users: [], pagination: { page: 1, page_size: 25, total: 0, page_count: 1 } } });
    return;
  }

  if (path === '/audit-log') {
    await route.fulfill({ status: 200, headers, json: { audit_log: [], pagination: { page: 1, page_size: 25, total: 0, page_count: 1 } } });
    return;
  }

  if (path === '/intelligence/overview') {
    const filteredEvidence = evidenceRows.filter((row) => rowMatchesEnvironment(row, url.searchParams.get('environment') || 'live'));
    await route.fulfill({
      status: 200,
      headers,
      json: {
        overview: {
          total_evidence_rows: filteredEvidence.length,
          copy_events: 0,
          mcp_batches: 1,
          kit_downloads: 0,
          favorite_events: 0,
          top_icons: [],
          top_job_categories: [],
          top_replaced_icons: [],
        },
        metadata_coverage: { classified_icons: 0 },
      },
    });
    return;
  }

  if (path === '/intelligence/search') {
    const rows = applyQueryQueue(url).queries;
    await route.fulfill({
      status: 200,
      headers,
      json: {
        search_intelligence: {
          summary: {
            unique_queries: rows.length,
            search_attempts: rows.reduce((sum, row) => sum + Number(row.attempt_count || 0), 0),
            zero_result_queries: rows.filter((row) => row.issue_types.includes('zero_result')).length,
            low_result_queries: rows.filter((row) => row.issue_types.includes('low_result')).length,
            zero_result_tracking_available: true,
            query_review_feature_available: true,
            environment: url.searchParams.get('environment') || 'live',
          },
          top_queries: rows
            .filter((row) => row.issue_types.includes('successful'))
            .slice(0, 8)
            .map((row) => ({
              query: row.query,
              successful_attempt_count: row.successful_attempt_count,
              average_result_count: row.average_result_count,
              total_signals: Number(row.successful_attempt_count || 0) + Number(row.copy_count || 0) + Number(row.favorite_count || 0),
              copy_count: row.copy_count,
              favorite_count: row.favorite_count,
            })),
          top_mcp_queries: [],
          top_zero_result_queries: rows.filter((row) => row.issue_types.includes('zero_result')),
          top_low_result_queries: rows.filter((row) => row.issue_types.includes('low_result')),
          top_replacement_queries: rows.filter((row) => row.issue_types.includes('replacement_heavy')),
        },
      },
    });
    return;
  }

  if (path === '/intelligence/search/queue') {
    await route.fulfill({ status: 200, headers, json: applyQueryQueue(url) });
    return;
  }

  if (path === '/intelligence/search/query-detail') {
    const environment = url.searchParams.get('environment') || 'live';
    const selected = queryRows
      .filter((row) => rowMatchesEnvironment(row, environment))
      .find((row) => row.query === url.searchParams.get('query')) || queryRows[0];
    await route.fulfill({
      status: 200,
      headers,
      json: {
        query_detail: {
          summary: selected,
          result_count_history: [{ created_at: selected.last_seen, result_count: selected.minimum_result_count ?? 0 }],
          recent_evidence_rows: evidenceRows.filter((row) => row.search_query === selected.query && rowMatchesEnvironment(row, environment)),
          related_replacements: [],
          related_copies: [],
          related_favorites: [],
          review: null,
          suggested_next_action: 'Check whether this needs an alias or a new icon',
        },
        window: { key: '30d', short_label: '30d', long_label: 'Last 30 days' },
      },
    });
    return;
  }

  if (path === '/intelligence/search/export') {
    const payload = { exported_at: '2026-06-12T00:00:00.000Z', ...applyQueryQueue(url) };
    const filteredEvidence = evidenceRows.filter((row) => rowMatchesEnvironment(row, url.searchParams.get('environment') || 'live'));
    if (url.searchParams.get('format') === 'csv') {
      await route.fulfill({
        status: 200,
        headers: { ...headers, 'content-type': 'text/csv' },
        body: 'query,attempt_count\nboxrec,2\n',
      });
      return;
    }
    if (url.searchParams.get('format') === 'agent_pack') {
      await route.fulfill({
        status: 200,
        headers,
        json: {
          agent_pack: {
            manifest: {
              format: 'supericons_query_analysis_pack',
              schema_version: 2,
              source: 'admin_api',
              row_count: payload.queries.length,
              evidence_sample_count: filteredEvidence.length,
            },
            summary: payload.summary,
            filters: payload.filters,
            sort: payload.sort,
            queries: payload.queries,
            evidence_sample: filteredEvidence,
            limitations: ['mock bounded export'],
            files: {
              'summary.md': '# Summary',
              'queries.json': JSON.stringify(payload.queries),
              'evidence_sample.json': JSON.stringify(filteredEvidence),
              'export_manifest.json': '{}',
            },
          },
        },
      });
      return;
    }
    await route.fulfill({ status: 200, headers, json: { export: payload } });
    return;
  }

  if (path === '/intelligence/evidence') {
    const q = (url.searchParams.get('q') || '').trim().toLowerCase();
    const signalType = url.searchParams.get('signal_type') || '';
    const filteredEvidence = evidenceRows
      .filter((row) => rowMatchesEnvironment(row, url.searchParams.get('environment') || 'live'))
      .filter((row) => !signalType || row.signal_type === signalType)
      .filter((row) => !q || String(row.search_query || '').toLowerCase().includes(q) || String(row.icon_id || '').toLowerCase().includes(q));
    await route.fulfill({
      status: 200,
      headers,
      json: {
        evidence: filteredEvidence,
        pagination: { page: 1, page_size: 50, total: filteredEvidence.length, page_count: 1 },
        window: { key: '30d', short_label: '30d', long_label: 'Last 30 days' },
        filters: { environment: url.searchParams.get('environment') || 'live' },
      },
    });
    return;
  }

  if (path === '/intelligence/search/review') {
    const body = JSON.parse(req.postData() || '{}');
    const row = queryRows.find((entry) => entry.query === body.query);
    if (row) {
      row.review_status = body.status;
      row.review_note = body.note || '';
      row.review_updated_at = '2026-06-12T00:00:00Z';
    }
    await route.fulfill({
      status: 200,
      headers,
      json: {
        success: true,
        review: {
          normalized_query: body.query,
          library_filter: body.library_filter || 'all',
          job_category: body.job_category || '',
          status: body.status,
          note: body.note || '',
          updated_at: '2026-06-12T00:00:00Z',
        },
      },
    });
    return;
  }

  await route.fulfill({ status: 404, headers, json: { error: `No mock for ${path}` } });
});

await page.goto(adminUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.fill('#adminSecretInput', 'mock-secret');
await page.click('#adminSecretSubmitBtn');
await page.click('#nav-intelligence');
await page.waitForSelector('#panel-intelligence.active #queryExplorerTableBody tr', { timeout: 30000 });

const noInitialHorizontalOverflow = await page.evaluate(() => {
  const root = document.documentElement;
  const panelScroller = document.querySelector('#panel-intelligence > div[style*="overflow-y"]');
  return {
    document: root.scrollWidth <= root.clientWidth + 2,
    panel: !panelScroller || panelScroller.scrollWidth <= panelScroller.clientWidth + 2,
  };
});
ok(noInitialHorizontalOverflow.document, 'Admin document has horizontal overflow.');
ok(noInitialHorizontalOverflow.panel, 'Icon Intelligence panel has horizontal overflow.');

await page.evaluate(() => {
  window.__lastExportBlob = null;
  const original = URL.createObjectURL.bind(URL);
  URL.createObjectURL = (blob) => {
    window.__lastExportBlob = blob;
    return original(blob);
  };
});

const initialText = await page.locator('#panel-intelligence #queryExplorerTableBody').innerText();
ok(await page.locator('#intelligenceEnvironmentFilter').inputValue() === 'live', 'Top environment filter did not default to Live only.');
ok(await page.locator('#queryExplorerEnvironmentFilter').inputValue() === 'live', 'Query Explorer did not default to Live only.');
ok(await page.locator('#intelligenceSearch').getAttribute('placeholder') === 'Filter latest activity...', 'Latest Activity search placeholder is misleading.');
ok(await page.locator('#intelligenceSignalFilter option[value="hosted_search_audit"]').count() === 1, 'Hosted search audit signal option is missing.');
ok(await page.locator('#intelligenceRawSignalsDetails:not([open])').count() === 1, 'Raw signal panels should start collapsed.');
ok(await page.locator('#intelligenceSearchSummaryDetails:not([open])').count() === 1, 'Search summary panels should start collapsed.');
ok(initialText.includes('boxrec'), 'Initial query table did not include boxrec.');
ok(initialText.includes('IP group'), 'Initial query table did not include hashed IP group context.');
ok(initialText.includes('Pro user activity'), 'Initial query table did not surface registered/pro audience context.');
ok(!initialText.includes('Account data not captured'), 'Initial query table still showed low-value account capture copy.');
ok(!initialText.includes('local-only query'), 'Initial live query table included a local-only row.');
ok(initialText.includes('stale mcp source row'), 'Production view did not recover stale hosted MCP rows from legacy environment labels.');
ok(initialText.includes('unclassified audit source row'), 'Production view did not include unclassified hosted audit rows.');
ok(((await page.locator('#searchIntelTopQueries').textContent()) || '').includes('openai simpleicons'), 'Successful resultful searches did not feed the top successful queries card.');
ok(((await page.locator('#intelligenceTopIcons').textContent()) || '').includes('No copied, saved, or downloaded icons in this window'), 'Top Icons empty state is not specific.');
const keySignalsText = (await page.locator('#intelligenceKeySignals').textContent()) || '';
ok(keySignalsText.includes('Search-only window'), 'Key Signals did not explain that the current window has search activity but no icon actions.');
ok(keySignalsText.includes('Needs purpose-filtered searches or icon actions'), 'Key Signals did not explain why purpose coverage is empty.');

await page.selectOption('#intelligenceChannelFilter', 'unknown');
await page.waitForTimeout(500);
const unclassifiedChannelText = await page.locator('#panel-intelligence #queryExplorerTableBody').innerText();
ok(unclassifiedChannelText.includes('unclassified audit source row'), 'Unclassified channel did not keep genuinely unclassified hosted audit rows.');
ok(!unclassifiedChannelText.includes('stale mcp source row'), 'Unclassified channel still swallowed rows that can be inferred as Hosted MCP.');
await page.selectOption('#intelligenceChannelFilter', 'hosted_mcp');
await page.waitForTimeout(500);
const hostedMcpQueryText = await page.locator('#panel-intelligence #queryExplorerTableBody').innerText();
ok(hostedMcpQueryText.includes('stale mcp source row'), 'Hosted MCP channel did not recover MCP rows from stale unknown channel labels.');
ok(!hostedMcpQueryText.includes('unclassified audit source row'), 'Hosted MCP channel included unclassified hosted audit rows.');
await page.selectOption('#intelligenceChannelFilter', 'all');
await page.waitForTimeout(500);

await page.selectOption('#intelligenceEnvironmentFilter', 'local');
await page.waitForTimeout(500);
const localText = await page.locator('#panel-intelligence #queryExplorerTableBody').innerText();
ok(await page.locator('#queryExplorerEnvironmentFilter').inputValue() === 'local', 'Top environment filter did not sync Query Explorer to Local.');
ok(localText.includes('local-only query'), 'Local environment filter did not include local-only query.');
ok(!localText.includes('boxrec'), 'Local environment filter still included production query rows.');
await page.selectOption('#queryExplorerEnvironmentFilter', 'live');
await page.waitForTimeout(500);
ok(await page.locator('#intelligenceEnvironmentFilter').inputValue() === 'live', 'Query Explorer environment filter did not sync top filter back to Live.');

await page.click('#queryWorkbenchTabActivity');
await page.waitForSelector('#queryWorkbenchPaneActivity.active #intelligenceEvidenceBody tr', { timeout: 10000 });
const activityText = await page.locator('#queryWorkbenchPaneActivity').innerText();
ok(activityText.includes('Session'), 'Latest Activity tab did not include session context.');
ok(activityText.includes('grid') || activityText.includes('mcp'), 'Latest Activity tab did not include surface context.');
await page.selectOption('#intelligenceSignalFilter', 'hosted_search_audit');
await page.waitForTimeout(350);
const hostedActivityText = await page.locator('#queryWorkbenchPaneActivity').innerText();
ok(hostedActivityText.includes('hosted audit query'), 'Hosted search audit filter did not show hosted search activity.');
ok(!hostedActivityText.includes('boxrec'), 'Hosted search audit filter still showed ordinary search attempts.');
await page.selectOption('#intelligenceSignalFilter', '');
await page.waitForTimeout(350);
await page.selectOption('#intelligenceChannelFilter', 'hosted_mcp');
await page.waitForTimeout(500);
await page.click('#queryWorkbenchTabActivity');
await page.waitForSelector('#queryWorkbenchPaneActivity.active #intelligenceEvidenceBody tr', { timeout: 10000 });
const hostedChannelActivityText = await page.locator('#queryWorkbenchPaneActivity').innerText();
ok(hostedChannelActivityText.includes('deepseek'), 'Hosted MCP channel filter did not show MCP evidence.');
ok(!hostedChannelActivityText.includes('boxrec'), 'Hosted MCP channel filter still showed web evidence.');
ok((await page.locator('#intelligenceEvidencePaginationInfo').innerText()).includes('visible events from'), 'Locally filtered evidence feed did not explain visible rows.');
await page.selectOption('#intelligenceChannelFilter', 'all');
await page.waitForTimeout(500);
await page.click('#queryWorkbenchTabQueries');
await page.waitForSelector('#queryWorkbenchPaneQueries.active #queryExplorerTableBody tr', { timeout: 10000 });

await page.click('#sidebarToggleBtn');
await page.waitForFunction(() => document.body.classList.contains('sidebar-collapsed'), null, { timeout: 10000 });
await page.click('#sidebarToggleBtn');
await page.waitForFunction(() => !document.body.classList.contains('sidebar-collapsed'), null, { timeout: 10000 });

await page.locator('#queryExplorerPaginationControls button').filter({ hasText: /^2$/ }).click();
await page.waitForTimeout(350);
const secondPageText = await page.locator('#panel-intelligence #queryExplorerTableBody').innerText();
ok(secondPageText.includes('older query'), 'Query Explorer pagination did not reach older rows.');

await page.selectOption('#queryExplorerIssueFilter', 'zero_result');
await page.waitForTimeout(350);
const zeroText = await page.locator('#panel-intelligence #queryExplorerTableBody').innerText();
ok(zeroText.includes('boxing ring'), 'Zero-result filter did not include reviewed zero-result row.');

await page.selectOption('#queryExplorerStatusFilter', 'untriaged');
await page.waitForTimeout(350);
const untriagedZeroText = await page.locator('#panel-intelligence #queryExplorerTableBody').innerText();
ok(untriagedZeroText.includes('boxrec'), 'Untriaged zero-result filter did not include boxrec.');
ok(!untriagedZeroText.includes('boxing ring'), 'Untriaged zero-result filter still included reviewed row.');

await page.click('#panel-intelligence [data-query-action="detail"][data-query-key="boxrec|all|"]');
await page.waitForSelector('#queryDetailSaveReviewBtn', { timeout: 10000 });
const detailText = (await page.locator('#queryDetailDrawer').innerText()).toLowerCase();
ok(detailText.includes('result history'), 'Query drawer did not show result history.');
ok(detailText.includes('suggested next action'), 'Query drawer did not show suggested next action.');
ok(detailText.includes('review applies to this query, library, and purpose across all environments'), 'Query drawer does not explain review scope.');

await page.selectOption('#queryDetailStatus', 'needs_alias');
await page.fill('#queryDetailNote', 'Map to known boxing-related terms.');
await page.click('#queryDetailSaveReviewBtn');
await page.waitForTimeout(500);
ok(queryRows.find((row) => row.query === 'boxrec')?.review_status === 'needs_alias', 'Review save did not update mock query row.');

await page.click('#queryDrawerOverlay');
await page.waitForSelector('#queryDetailDrawer:not(.open)', { timeout: 10000 });
await page.selectOption('#queryExplorerStatusFilter', '');
await page.waitForTimeout(350);

await page.click('#queryExplorerExportJson');
await page.waitForFunction(() => window.__lastExportBlob !== null, null, { timeout: 10000 });
const jsonExport = await page.evaluate(async () => await window.__lastExportBlob.text());
ok(jsonExport.includes('queries') && jsonExport.includes('boxrec'), 'JSON export blob did not include query rows.');
ok(JSON.parse(jsonExport).export?.filters?.environment === 'live', 'JSON export did not preserve live environment filter.');

await page.evaluate(() => {
  window.__lastExportBlob = null;
});
await page.click('#queryExplorerExportAgentPack');
await page.waitForFunction(() => window.__lastExportBlob !== null, null, { timeout: 10000 });
const agentPackExport = await page.evaluate(async () => await window.__lastExportBlob.text());
const parsedAgentPackExport = JSON.parse(agentPackExport).agent_pack;
ok(parsedAgentPackExport?.manifest?.schema_version === 2, 'Agent pack export did not include schema version 2.');
ok(parsedAgentPackExport?.filters?.environment === 'live', 'Agent pack export did not preserve live environment filter.');
ok(Array.isArray(parsedAgentPackExport?.queries) && parsedAgentPackExport.queries.some((row) => row.query === 'boxrec'), 'Agent pack export did not expose structured query rows.');
ok(Array.isArray(parsedAgentPackExport?.evidence_sample), 'Agent pack export did not expose a structured evidence sample.');
ok(parsedAgentPackExport?.files?.['summary.md'], 'Agent pack export did not include compatibility summary.md.');

forceFallbackRoutes = true;
await page.goto(adminUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
if (await page.locator('#adminSecretModal.open').count()) {
  await page.fill('#adminSecretInput', 'mock-secret');
  await page.click('#adminSecretSubmitBtn');
}
await page.click('#nav-intelligence');
await page.waitForFunction(() => {
  const text = document.querySelector('#panel-intelligence #queryExplorerTableBody')?.innerText || '';
  const summary = document.querySelector('#panel-intelligence #queryExplorerSummary')?.innerText || '';
  return text.includes('boxrec') && summary.includes('Full query API unavailable');
}, null, { timeout: 30000 });

const fallbackText = await page.locator('#panel-intelligence #queryExplorerTableBody').innerText();
ok(fallbackText.includes('boxrec'), 'Fallback Query Explorer did not include visible zero-result query evidence.');
ok(fallbackText.includes('deepseek'), 'Fallback Query Explorer did not include visible low-result query evidence.');

await page.click('#panel-intelligence [data-query-action="detail"][data-query-key="boxrec|all|"]');
await page.waitForSelector('#queryDetailSaveReviewBtn', { timeout: 10000 });
const fallbackDetailText = (await page.locator('#queryDetailDrawer').innerText()).toLowerCase();
ok(fallbackDetailText.includes('result history'), 'Fallback query drawer did not show result history.');
ok(fallbackDetailText.includes('review applies to this query, library, and purpose across all environments'), 'Fallback query drawer does not explain review scope.');

await page.evaluate(() => {
  window.__lastExportBlob = null;
  const original = URL.createObjectURL.bind(URL);
  URL.createObjectURL = (blob) => {
    window.__lastExportBlob = blob;
    return original(blob);
  };
});
await page.click('#queryDrawerOverlay');
await page.waitForSelector('#queryDetailDrawer:not(.open)', { timeout: 10000 });
await page.click('#queryExplorerExportJson');
await page.waitForFunction(() => window.__lastExportBlob !== null, null, { timeout: 10000 });
const fallbackJsonExport = await page.evaluate(async () => await window.__lastExportBlob.text());
ok(fallbackJsonExport.includes('visible_admin_data') && fallbackJsonExport.includes('boxrec'), 'Fallback JSON export did not include visible query rows.');

await page.evaluate(() => {
  window.__lastExportBlob = null;
});
await page.click('#queryExplorerExportAgentPack');
await page.waitForFunction(() => window.__lastExportBlob !== null, null, { timeout: 10000 });
const fallbackAgentPackExport = await page.evaluate(async () => await window.__lastExportBlob.text());
const parsedFallbackAgentPackExport = JSON.parse(fallbackAgentPackExport).agent_pack;
ok(parsedFallbackAgentPackExport?.manifest?.source === 'visible_admin_data', 'Fallback agent pack did not record visible admin data source.');
ok(Array.isArray(parsedFallbackAgentPackExport?.queries) && parsedFallbackAgentPackExport.queries.some((row) => row.query === 'boxrec'), 'Fallback agent pack did not expose structured query rows.');
ok(Array.isArray(parsedFallbackAgentPackExport?.limitations) && parsedFallbackAgentPackExport.limitations.some((line) => line.includes('visible admin data')), 'Fallback agent pack did not explain visible-data limitation.');

await page.screenshot({ path: '.tmp/admin-query-workbench-browser.png', fullPage: true });
await browser.close();

const screenshot = await readFile('.tmp/admin-query-workbench-browser.png');
console.log(JSON.stringify({
  ok: true,
  adminUrl,
  screenshot: '.tmp/admin-query-workbench-browser.png',
  screenshot_bytes: screenshot.length,
}, null, 2));
