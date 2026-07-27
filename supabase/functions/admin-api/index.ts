import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14?target=deno';
import { aggregateLocaleAttemptCounts } from '../../../lib/search-beta-measurement.js';
import {
  buildAdminRollups,
  buildEstimatedClientIdentity,
  classifySearchAttempt,
  deriveAuditQueryOrigin,
  matchKnownDefect,
  mergeTelemetryEvidenceRows,
  queryOriginNeedsLegacyIconEvidence,
  readMcpQueryOrigin,
  summarizeRawSearchAttempts,
} from '../../../lib/admin-dashboard-metrics.js';
import { createBoundedAsyncCache } from '../../../lib/bounded-async-cache.js';
import {
  aggregateDashboardV2IconRows,
  buildDashboardV2HistoryState,
  buildDashboardV2Clients,
  buildDashboardV2Geography,
  buildDashboardV2Kpis,
  buildDashboardV2QueryHistoryKey,
  buildDashboardV2Series,
  buildDashboardV2TopLists,
  compactDashboardV2EventRows,
  compactDashboardV2QueryRows,
  dashboardV2EventRole,
  dashboardV2SearchHistoryRole,
  fetchBoundedDashboardV2Pages,
  filterDashboardV2QueryRows,
  filterDashboardV2Rows,
  maskDashboardV2Identifier,
  mergeDashboardV2CurrentQueryDetails,
  normalizeDashboardV2QueryRows,
  parseDashboardV2Filters,
  parseDashboardV2QuerySearch,
} from '../../../lib/admin-dashboard-v2.js';
import knownSearchDefects from '../../../data/admin/known-search-defects.json' with { type: 'json' };

type AuditOutcome = 'started' | 'succeeded' | 'failed';
type JsonRecord = Record<string, unknown>;
type SupabaseClient = any;
type IntelligenceWindowKey = '1d' | '7d' | '30d' | '90d' | '1y' | 'all';
type QueryReviewStatus =
  | 'resolved'
  | 'needs_alias'
  | 'needs_icon'
  | 'ignore'
  | 'add_icon'
  | 'add_alias'
  | 'improve_ranking'
  | 'improve_docs'
  | 'watch';
type QueryIssueType = 'zero_result' | 'low_result' | 'replacement_heavy' | 'successful' | 'mcp';
type QueryEnvironment = 'production' | 'preview' | 'local' | 'test' | 'legacy';
type QueryEnvironmentFilter = QueryEnvironment | 'live' | 'all';
type QueryChannel = 'web' | 'hosted_mcp' | 'local_mcp' | 'internal_test' | 'unknown';
type QueryChannelFilter = QueryChannel | 'all';
type QueryOrigin = 'agent_query' | 'recommend_variant' | 'icon_lookup' | 'legacy_unknown';
type QueryOriginFilter = QueryOrigin | 'all';
type QuerySortField =
  | 'zero_attempt_count'
  | 'low_attempt_count'
  | 'attempt_count'
  | 'average_result_count'
  | 'minimum_result_count'
  | 'replacement_count'
  | 'mcp_batch_count'
  | 'last_seen'
  | 'first_seen'
  | 'status'
  | 'query';
type IntelligenceWindow = {
  key: IntelligenceWindowKey;
  shortLabel: string;
  longLabel: string;
  days: number | null;
};
type QueryReviewRow = {
  normalized_query: string;
  library_filter: string;
  job_category: string;
  status: QueryReviewStatus;
  note?: string | null;
  updated_at?: string | null;
};
type SearchEvidenceRow = Record<string, unknown>;
type AuthUser = {
  id: string;
  email?: string | null;
  created_at?: string | null;
  last_sign_in_at?: string | null;
  email_confirmed_at?: string | null;
  banned_until?: string | null;
  app_metadata?: {
    provider?: string | null;
    providers?: string[] | null;
  } | null;
  user_metadata?: Record<string, unknown> | null;
};

const DEFAULT_ALLOWED_ORIGINS = [
  'https://supericons.dev',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];

const DEFAULT_APP_BASE_URL = 'https://supericons.dev';
const DEFAULT_SUPPORT_EMAIL = 'hello@supericons.dev';
const DEFAULT_FROM_EMAIL = 'Supericons <receipts@auth.supericons.dev>';
const RESEND_EMAILS_URL = 'https://api.resend.com/emails';
const PAGE_SIZE = 25;
const DELETE_CANCELABLE_STATUSES = new Set(['active', 'trialing', 'past_due', 'unpaid']);
const EVIDENCE_PAGE_SIZE = 1000;
const QUERY_QUEUE_MAX_PAGE_SIZE = 100;
const QUERY_EXPORT_MAX_ROWS = 2000;
const QUERY_REVIEW_LOOKUP_CHUNK_SIZE = 10;
const QUERY_QUEUE_CACHE_TTL_MS = 30_000;
const QUERY_QUEUE_CACHE_MAX_ENTRIES = 64;
const SEARCH_EVENT_SNAPSHOT_CACHE_TTL_MS = 120_000;
const SEARCH_EVENT_SNAPSHOT_CACHE_MAX_ENTRIES = 1;
const LOW_RESULT_THRESHOLD = 3;
const QUERY_REVIEW_STATUSES = new Set<QueryReviewStatus>([
  'resolved',
  'needs_alias',
  'needs_icon',
  'ignore',
  'add_icon',
  'add_alias',
  'improve_ranking',
  'improve_docs',
  'watch',
]);
const QUERY_ISSUE_TYPES = new Set<QueryIssueType>(['zero_result', 'low_result', 'replacement_heavy', 'successful', 'mcp']);
const QUERY_ENVIRONMENT_FILTERS = new Set<QueryEnvironmentFilter>(['live', 'production', 'preview', 'local', 'test', 'legacy', 'all']);
const QUERY_CHANNEL_FILTERS = new Set<QueryChannelFilter>(['all', 'web', 'hosted_mcp', 'local_mcp', 'internal_test', 'unknown']);
const QUERY_ORIGIN_FILTERS = new Set<QueryOriginFilter>(['agent_query', 'recommend_variant', 'icon_lookup', 'legacy_unknown', 'all']);
const PRODUCTION_ANALYTICS_HOSTS = new Set(['supericons.dev', 'www.supericons.dev']);
const QUERY_SORT_FIELDS = new Set<QuerySortField>([
  'zero_attempt_count',
  'low_attempt_count',
  'attempt_count',
  'average_result_count',
  'minimum_result_count',
  'replacement_count',
  'mcp_batch_count',
  'last_seen',
  'first_seen',
  'status',
  'query',
]);
const INTELLIGENCE_WINDOWS: Record<IntelligenceWindowKey, IntelligenceWindow> = {
  '1d': { key: '1d', shortLabel: '24h', longLabel: 'Last 24 hours', days: 1 },
  '7d': { key: '7d', shortLabel: '7d', longLabel: 'Last 7 days', days: 7 },
  '30d': { key: '30d', shortLabel: '30d', longLabel: 'Last 30 days', days: 30 },
  '90d': { key: '90d', shortLabel: '90d', longLabel: 'Last 90 days', days: 90 },
  '1y': { key: '1y', shortLabel: '1y', longLabel: 'Last 12 months', days: 365 },
  all: { key: 'all', shortLabel: 'All time', longLabel: 'All recorded history', days: null },
};
const queryQueueCache = createBoundedAsyncCache({
  ttlMs: QUERY_QUEUE_CACHE_TTL_MS,
  maxEntries: QUERY_QUEUE_CACHE_MAX_ENTRIES,
});
const v2DashboardCache = createBoundedAsyncCache({
  ttlMs: 30_000,
  maxEntries: 64,
});
const searchEventSnapshotCache = createBoundedAsyncCache({
  ttlMs: SEARCH_EVENT_SNAPSHOT_CACHE_TTL_MS,
  maxEntries: SEARCH_EVENT_SNAPSHOT_CACHE_MAX_ENTRIES,
});

function getAllowedOrigins() {
  const configured = (Deno.env.get('ADMIN_ALLOWED_ORIGINS') || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  return configured.length > 0 ? configured : DEFAULT_ALLOWED_ORIGINS;
}

function getAllowedOrigin(req: Request) {
  const origin = req.headers.get('origin');
  const allowedOrigins = getAllowedOrigins();
  if (origin && allowedOrigins.includes(origin)) {
    return origin;
  }
  return allowedOrigins[0];
}

function getCorsHeaders(req: Request) {
  return {
    'Access-Control-Allow-Origin': getAllowedOrigin(req),
    'Access-Control-Allow-Headers': 'content-type, x-admin-secret',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Content-Type': 'application/json',
  };
}

function jsonResponse(req: Request, body: JsonRecord, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: getCorsHeaders(req),
  });
}

function contentResponse(
  req: Request,
  body: string,
  contentType: string,
  filename?: string,
  status = 200,
) {
  const headers: Record<string, string> = {
    ...getCorsHeaders(req),
    'Content-Type': contentType,
  };
  if (filename) {
    headers['Content-Disposition'] = `attachment; filename="${filename}"`;
  }
  return new Response(body, {
    status,
    headers,
  });
}

function parsePath(req: Request) {
  const url = new URL(req.url);
  const path = url.pathname
    .replace(/^\/functions\/v1\/admin-api/, '')
    .replace(/^\/admin-api/, '')
    || '/';
  const segments = path.split('/').filter(Boolean);
  return { url, path, segments };
}

function getAppBaseUrl() {
  return (Deno.env.get('APP_BASE_URL') || DEFAULT_APP_BASE_URL).replace(/\/+$/, '');
}

function escapeHtml(value: string | null | undefined) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatDateLabel(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  } catch {
    return value;
  }
}

function normalizeSearchQuery(value: unknown) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function normalizeAnalyticsToken(value: unknown) {
  return normalizeSearchQuery(value)
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');
}

function isUnclassifiedAnalyticsToken(value: unknown) {
  const source = normalizeAnalyticsToken(value);
  return !source
    || source === 'unknown'
    || source === 'legacy'
    || source === 'unclassified'
    || source === 'unclassified_hosted_search';
}

function normalizeReviewLibraryFilter(value: unknown) {
  return normalizeSearchQuery(value) || 'all';
}

function normalizeReviewJobCategory(value: unknown) {
  return normalizeSearchQuery(value) || '';
}

function buildQueryReviewContextKey({
  query,
  libraryFilter,
  jobCategory,
}: {
  query: unknown;
  libraryFilter?: unknown;
  jobCategory?: unknown;
}) {
  return [
    normalizeSearchQuery(query),
    normalizeReviewLibraryFilter(libraryFilter),
    normalizeReviewJobCategory(jobCategory),
  ].join('|');
}

function buildQueryWorkbenchGroupKey({
  query,
  libraryFilter,
  jobCategory,
  queryOrigin,
  channel,
  searcherKey,
}: {
  query: unknown;
  libraryFilter?: unknown;
  jobCategory?: unknown;
  queryOrigin?: unknown;
  channel?: unknown;
  searcherKey?: unknown;
}) {
  return buildDashboardV2QueryHistoryKey({
    query,
    libraryFilter,
    jobCategory,
    queryOrigin,
    channel,
    searcherKey,
  });
}

function parseIntelligenceWindow(url: URL): IntelligenceWindow {
  const raw = String(url.searchParams.get('window') || '30d').trim().toLowerCase() as IntelligenceWindowKey;
  return INTELLIGENCE_WINDOWS[raw] || INTELLIGENCE_WINDOWS['30d'];
}

function parseQueryEnvironmentFilter(url: URL): QueryEnvironmentFilter {
  const raw = normalizeSearchQuery(url.searchParams.get('environment')) as QueryEnvironmentFilter;
  return QUERY_ENVIRONMENT_FILTERS.has(raw) ? raw : 'live';
}

function parseQueryChannelFilter(url: URL): QueryChannelFilter {
  const raw = normalizeSearchQuery(url.searchParams.get('channel')) as QueryChannelFilter;
  return QUERY_CHANNEL_FILTERS.has(raw) ? raw : 'all';
}

function parseQueryOriginFilter(url: URL): QueryOriginFilter {
  const raw = normalizeSearchQuery(url.searchParams.get('query_origin')) as QueryOriginFilter;
  return QUERY_ORIGIN_FILTERS.has(raw) ? raw : 'agent_query';
}

function getProductionAnalyticsHosts() {
  const configured = (Deno.env.get('SUPERICONS_PRODUCTION_HOSTS') || '')
    .split(',')
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);
  return new Set([...PRODUCTION_ANALYTICS_HOSTS, ...configured]);
}

function normalizeAnalyticsHost(value: unknown) {
  let text = String(value || '').trim().toLowerCase();
  if (!text) return '';
  text = text.replace(/^\[|\]$/g, '');
  if (text === '::1') return text;
  if (text.includes('/') || text.includes(':')) {
    try {
      const parsed = new URL(text.includes('://') ? text : `https://${text}`);
      text = parsed.hostname.toLowerCase();
    } catch {
      text = text.split('/')[0].split(':')[0] || text;
    }
  }
  return text.replace(/^\[|\]$/g, '');
}

function classifyAnalyticsSource(value: unknown): QueryEnvironment | null {
  const source = normalizeAnalyticsToken(value);
  if (isUnclassifiedAnalyticsToken(source)) return null;
  if (source.includes('local')) return 'local';
  if (source.includes('preview') || source.includes('netlify')) return 'preview';
  if (source.includes('test') || source.includes('verify') || source.includes('internal') || source.includes('trap')) return 'test';
  if (
    source === 'web'
    || source === 'hosted_search'
    || source === 'mcp'
    || source === 'hosted_mcp'
    || source === 'mcp_search'
    || source === 'api'
    || source === 'cli'
    || source.includes('mcp')
  ) {
    return 'production';
  }
  return null;
}

// Every website surface that can submit a user icon request. Adding a new entry
// point means adding it here; every request read and review check uses this list.
const ICON_REQUEST_UI_SURFACES = [
  'grid_empty_feedback',
  'grid_low_result_feedback',
  'sidebar_request',
] as const;
const ICON_REQUEST_SIGNAL_TYPES = [
  'search_attempt',
  'icon_request',
] as const;

function classifyAnalyticsChannel(value: unknown): QueryChannel | null {
  const source = normalizeAnalyticsToken(value);
  if (isUnclassifiedAnalyticsToken(source)) return null;
  if (source.includes('local_mcp') || source === 'npm' || source === 'npx') return 'local_mcp';
  if (source === 'mcp' || source === 'hosted_mcp' || source === 'mcp_search' || source.includes('mcp')) return 'hosted_mcp';
  if (source === 'verify' || source === 'internal_test' || source === 'test' || source.includes('test') || source.includes('verify') || source.includes('trap')) return 'internal_test';
  if (
    source === 'web'
    || source === 'site'
    || source === 'local_web'
    || source === 'preview_web'
    || source === 'test_web'
    || source === 'grid'
    || source === 'grid_empty_feedback'
    || source === 'grid_low_result_feedback'
    || source === 'sidebar_request'
    || source === 'customize'
    || source === 'store'
    || source === 'hosted_search'
    || source === 'search_icons'
    || source === 'search_engine'
  ) {
    return 'web';
  }
  return null;
}

function classifyAnalyticsHost(value: unknown): QueryEnvironment | null {
  const host = normalizeAnalyticsHost(value);
  if (!host) return null;
  if (host === 'localhost' || host === '127.0.0.1' || host === '::1') return 'local';
  if (getProductionAnalyticsHosts().has(host)) return 'production';
  if (host.endsWith('.netlify.app')) return 'preview';
  return null;
}

function extractContextHost(value: unknown) {
  const text = String(value || '').trim();
  if (!text || text.startsWith('/')) return '';
  try {
    return new URL(text.includes('://') ? text : `https://${text}`).hostname;
  } catch {
    return '';
  }
}

function classifySearchEvidenceEnvironment(row: Record<string, unknown>): QueryEnvironment {
  const rowEnvironment = normalizeSearchQuery(row.environment);
  if (rowEnvironment === 'production' || rowEnvironment === 'preview' || rowEnvironment === 'local' || rowEnvironment === 'test') {
    return rowEnvironment;
  }
  if (rowEnvironment === 'legacy' && row.source_table !== 'search_request_audit') {
    return 'legacy';
  }

  const explicit = classifyAnalyticsSource(row.analytics_source)
    || (row.source_table === 'search_request_audit' ? classifyAnalyticsSource(row.ui_surface) : null);
  if (explicit) return explicit;

  const hostEnvironment = classifyAnalyticsHost(row.domain)
    || classifyAnalyticsHost(extractContextHost(row.context_url));
  if (hostEnvironment) return hostEnvironment;

  if (row.source_table === 'search_request_audit') {
    return 'production';
  }

  return 'legacy';
}

function classifySearchEvidenceChannel(row: Record<string, unknown>): QueryChannel {
  const explicit = classifyAnalyticsChannel(row.channel)
    || classifyAnalyticsChannel(row.analytics_channel)
    || classifyAnalyticsChannel(row.analytics_source)
    || classifyAnalyticsChannel(row.ui_surface);
  if (explicit) return explicit;

  const signalType = normalizeSearchQuery(row.signal_type);
  if (signalType === 'mcp_call') return 'hosted_mcp';

  if (row.source_table === 'search_request_audit') {
    return 'unknown';
  }

  if (signalType === 'search_attempt' || signalType === 'hosted_search_audit' || signalType === 'copy' || signalType === 'favorite' || signalType === 'replace') {
    return 'web';
  }
  return 'unknown';
}

function evidenceMatchesEnvironment(row: Record<string, unknown>, filter: QueryEnvironmentFilter) {
  if (filter === 'all') return true;
  const environment = classifySearchEvidenceEnvironment(row);
  if (filter === 'live') return environment === 'production';
  return environment === filter;
}

function filterEvidenceRowsByEnvironment<T extends Record<string, unknown>>(
  rows: T[],
  filter: QueryEnvironmentFilter,
) {
  return rows.filter((row) => evidenceMatchesEnvironment(row, filter));
}

function evidenceMatchesChannel(row: Record<string, unknown>, filter: QueryChannelFilter) {
  if (filter === 'all') return true;
  return classifySearchEvidenceChannel(row) === filter;
}

function filterEvidenceRowsByChannel<T extends Record<string, unknown>>(
  rows: T[],
  filter: QueryChannelFilter,
) {
  return rows.filter((row) => evidenceMatchesChannel(row, filter));
}

function filterEvidenceRowsByQueryOrigin<T extends Record<string, unknown>>(
  rows: T[],
  filter: QueryOriginFilter,
) {
  if (filter === 'all') return rows;
  return rows.filter((row) => String(row.query_origin || 'legacy_unknown') === filter);
}

function getWindowSinceIso(window: IntelligenceWindow) {
  if (window.days === null) return null;
  return new Date(Date.now() - (window.days * 24 * 60 * 60 * 1000)).toISOString();
}

function percentile(values: number[], p: number) {
  if (!Array.isArray(values) || values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.min(sorted.length - 1, Math.max(0, Math.ceil(p * sorted.length) - 1));
  return sorted[rank];
}

async function fetchAllRows<T extends Record<string, unknown>>(
  queryFactory: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
  maxRows = Number.POSITIVE_INFINITY,
) {
  const rows: T[] = [];
  let from = 0;

  while (true) {
    const remaining = maxRows - rows.length;
    if (remaining <= 0) break;
    const pageSize = Math.min(EVIDENCE_PAGE_SIZE, remaining);
    const to = from + pageSize - 1;
    const { data, error } = await queryFactory(from, to);
    if (error) throw error;

    const batch = data || [];
    rows.push(...batch);
    if (batch.length < pageSize) break;
    from += pageSize;
  }

  return rows;
}

async function fetchQueryReviews(
  adminClient: SupabaseClient,
  contexts: Array<{
    query: string;
    library_filter?: string | null;
    job_category?: string | null;
  }>,
) {
  const normalizedQueries = [...new Set(
    contexts
      .map((context) => normalizeSearchQuery(context.query))
      .filter(Boolean),
  )];
  const reviews = new Map<string, QueryReviewRow>();

  if (normalizedQueries.length === 0) {
    return { available: true, reviews };
  }

  let data: QueryReviewRow[] = [];

  try {
    data = await fetchQueryReviewRows(
      adminClient,
      normalizedQueries,
      'normalized_query, library_filter, job_category, status, note, updated_at',
    );
  } catch (error) {
    if (isMissingRelationError(error)) {
      return { available: false, reviews };
    }
    if (!isMissingColumnError(error)) {
      console.warn('admin-api query reviews unavailable:', formatAdminErrorMessage(error));
      return { available: false, reviews };
    }
    try {
      data = await fetchQueryReviewRows(
        adminClient,
        normalizedQueries,
        'normalized_query, library_filter, status, note, updated_at',
      );
    } catch (fallbackError) {
      console.warn('admin-api query reviews fallback unavailable:', formatAdminErrorMessage(fallbackError));
      return { available: false, reviews };
    }
  }

  for (const row of data) {
    reviews.set(buildQueryReviewContextKey({
      query: row.normalized_query,
      libraryFilter: row.library_filter,
      jobCategory: row.job_category || '',
    }), row);
  }

  return { available: true, reviews };
}

async function fetchQueryReviewRows(
  adminClient: SupabaseClient,
  normalizedQueries: string[],
  select: string,
) {
  const rows: QueryReviewRow[] = [];
  for (let index = 0; index < normalizedQueries.length; index += QUERY_REVIEW_LOOKUP_CHUNK_SIZE) {
    const chunk = normalizedQueries.slice(index, index + QUERY_REVIEW_LOOKUP_CHUNK_SIZE);
    const { data, error } = await adminClient
      .from('icon_query_reviews')
      .select(select)
      .in('normalized_query', chunk);

    if (error) throw error;
    rows.push(...((data || []) as QueryReviewRow[]));
  }
  return rows;
}

async function fetchAllQueryReviews(adminClient: SupabaseClient) {
  const reviews = new Map<string, QueryReviewRow>();
  try {
    const rows = await fetchAllRows<QueryReviewRow>((from, to) => (
      adminClient
        .from('icon_query_reviews')
        .select('normalized_query, library_filter, job_category, status, note, updated_at')
        .order('updated_at', { ascending: false })
        .range(from, to)
    ));
    for (const row of rows) {
      reviews.set(buildQueryReviewContextKey({
        query: row.normalized_query,
        libraryFilter: row.library_filter,
        jobCategory: row.job_category,
      }), row);
    }
    return { available: true, reviews };
  } catch (error) {
    if (isMissingRelationError(error)) {
      return { available: false, reviews };
    }
    throw error;
  }
}

function mergeQueryReview<T extends {
  query: string;
  library_filter?: string | null;
  job_category?: string | null;
}>(
  entry: T,
  reviews: Map<string, QueryReviewRow>,
) {
  const review = reviews.get(buildQueryReviewContextKey({
    query: entry.query,
    libraryFilter: entry.library_filter,
    jobCategory: entry.job_category,
  }));

  return {
    ...entry,
    review_status: review?.status || null,
    review_note: review?.note || null,
    review_updated_at: review?.updated_at || null,
  };
}

function parsePositiveInt(value: unknown, fallback: number, max: number) {
  const parsed = Number.parseInt(String(value || ''), 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(max, parsed);
}

function compareNullableValues(a: unknown, b: unknown, direction: 'asc' | 'desc') {
  const aMissing = a === null || a === undefined || a === '';
  const bMissing = b === null || b === undefined || b === '';
  if (aMissing && bMissing) return 0;
  if (aMissing) return 1;
  if (bMissing) return -1;

  if (typeof a === 'number' && typeof b === 'number') {
    return direction === 'asc' ? a - b : b - a;
  }

  const aTime = typeof a === 'string' ? Date.parse(a) : Number.NaN;
  const bTime = typeof b === 'string' ? Date.parse(b) : Number.NaN;
  if (Number.isFinite(aTime) && Number.isFinite(bTime)) {
    return direction === 'asc' ? aTime - bTime : bTime - aTime;
  }

  return direction === 'asc'
    ? String(a).localeCompare(String(b))
    : String(b).localeCompare(String(a));
}

async function fetchIconEvidenceRows(
  adminClient: SupabaseClient,
  since: string | null,
) {
  return await fetchAllRows<SearchEvidenceRow>((from, to) => {
    let query = adminClient
      .from('icon_evidence')
      .select('id, signal_type, search_query, icon_id, batch_id, agent_converged, replaced_with, result_count, library_filter, job_category, ui_surface, domain, context_url, session_hash, evidence_text, created_at')
      .neq('signal_type', 'icon_request')
      .not('search_query', 'is', null)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (since) {
      query = query.gte('created_at', since);
    }

    return query;
  });
}

async function fetchIconRequestEvidenceRows(
  adminClient: SupabaseClient,
  since: string | null,
) {
  const rows = await fetchAllRows<SearchEvidenceRow>((from, to) => {
    let query = adminClient
      .from('icon_evidence')
      .select('id, signal_type, search_query, icon_id, batch_id, agent_converged, replaced_with, result_count, library_filter, job_category, ui_surface, domain, context_url, session_hash, evidence_text, created_at')
      .eq('signal_type', 'icon_request')
      .not('evidence_text', 'is', null)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (since) {
      query = query.gte('created_at', since);
    }

    return query;
  });

  return rows.map((row): SearchEvidenceRow => ({
    ...row,
    environment: classifySearchEvidenceEnvironment(row),
    channel: classifySearchEvidenceChannel(row),
  }));
}

function toIsoTimeMs(value: unknown) {
  if (typeof value !== 'string') return null;
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : null;
}

function normalizeAuditCountry(value: unknown) {
  const text = typeof value === 'string' ? value.trim().toUpperCase() : '';
  return /^[A-Z]{2}$/.test(text) ? text : null;
}

function compactHashPrefix(value: unknown) {
  const text = typeof value === 'string' ? value.trim() : '';
  return text ? text.slice(0, 12) : null;
}

function constantTimeTextEqual(leftValue: string, rightValue: string) {
  const encoder = new TextEncoder();
  const left = encoder.encode(leftValue);
  const right = encoder.encode(rightValue);
  const length = Math.max(left.length, right.length);
  let difference = left.length ^ right.length;
  for (let index = 0; index < length; index += 1) {
    difference |= (left[index] || 0) ^ (right[index] || 0);
  }
  return difference === 0;
}

function optionalNonnegativeInteger(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : null;
}

function mapAuditRowToEvidenceRow(row: Record<string, unknown>) {
  const status = String(row.status || '').toLowerCase();
  const resultCount = optionalNonnegativeInteger(row.result_count);
  const source = normalizeSearchQuery(row.source);
  const channel = classifyAnalyticsChannel(row.channel) || classifyAnalyticsChannel(source) || 'unknown';
  const environment = classifyAnalyticsSource(row.environment) || classifyAnalyticsSource(source) || 'production';
  const sourceIsClassified = !isUnclassifiedAnalyticsToken(source);
  const uiSurface = sourceIsClassified ? source : 'unclassified_hosted_search';
  const queryOrigin = normalizeSearchQuery(row.query_origin) || deriveAuditQueryOrigin({
      tool_name: row.tool_name,
      channel,
      analytics_channel: channel,
      analytics_source: source,
      source,
      ui_surface: uiSurface,
    });
  const visitor = buildEstimatedClientIdentity(row);
  const knownDefect = matchKnownDefect({
    ...row,
    search_query: row.query_norm,
    audit_status: status,
  }, knownSearchDefects);
  return {
    id: row.id ? `search_request_audit:${String(row.id)}` : null,
    source_row_id: row.id ? String(row.id) : null,
    source_table: 'search_request_audit',
    event_id: row.attempt_id || null,
    analytics_source: sourceIsClassified ? source : null,
    analytics_channel: channel,
    environment,
    channel,
    signal_type: 'hosted_search_audit',
    search_query: normalizeSearchQuery(row.query_norm),
    icon_id: null,
    batch_id: null,
    agent_converged: null,
    replaced_with: null,
    result_count: resultCount,
    library_filter: normalizeReviewLibraryFilter(row.library_filter),
    library_mode: row.library_mode || null,
    search_outcome: row.search_outcome || null,
    query_origin: queryOrigin,
    requested_limit: null,
    known_defect_id: knownDefect?.id || null,
    error_code: row.error_code || null,
    confidence_label: row.confidence_label || null,
    beta_cohort: row.beta_cohort || null,
    job_category: null,
    ui_surface: uiSurface,
    domain: null,
    context_url: null,
    session_hash: row.session_hash || null,
    ip_hash: row.ip_hash || null,
    ip_hash_prefix: compactHashPrefix(row.ip_hash),
    country_code: normalizeAuditCountry(row.country_code),
    geo_source: row.geo_source || null,
    user_id: row.user_id || null,
    is_registered: row.is_registered === true || Boolean(row.user_id),
    account_plan: row.account_plan || null,
    subscription_status: row.subscription_status || null,
    is_pro: row.is_pro === true,
    client_family: row.client_family || null,
    tool_name: row.tool_name || null,
    locale: row.locale || null,
    anonymous_client_hash_prefix: compactHashPrefix(row.anonymous_client_hash),
    anonymous_client_hash: row.anonymous_client_hash || null,
    user_agent_hash_prefix: compactHashPrefix(row.user_agent_hash),
    api_key_hash_prefix: compactHashPrefix(row.api_key_hash),
    api_key_hash: row.api_key_hash || null,
    estimated_client_key: visitor.display_key,
    visitor_kind: visitor.kind,
    _estimated_client_key: visitor.key,
    mcp_server_version: row.mcp_server_version || null,
    request_id: row.request_id || null,
    dedupe_key: row.dedupe_key || null,
    search_request_audit_id: row.id ? String(row.id) : null,
    client_ip_public: null,
    audit_status: status || null,
    latency_ms: row.latency_ms ?? null,
    episode_id: row.episode_id || null,
    recovery_chain_id: row.recovery_chain_id || null,
    attempt_id: row.attempt_id || null,
    attempt_number: row.attempt_number ?? null,
    query_variant: row.query_variant || null,
    search_engine: row.search_engine || null,
    execution_route: row.execution_route || null,
    server_build: row.server_build || null,
    root_request_hash_prefix: compactHashPrefix(row.episode_id),
    evidence_text: `${channel} ${row.tool_name || source || 'hosted search'} ${status || 'audit'}`,
    created_at: row.created_at || null,
  };
}

async function fetchHostedSearchAuditRows(
  adminClient: SupabaseClient,
  since: string | null,
  until: string | null = null,
  maxRows = Number.POSITIVE_INFINITY,
  channel = 'all',
  liveOnly = false,
) {
  const fullSelect = 'id, query_norm, source, library_filter, library_mode, result_count, search_outcome, confidence_label, beta_cohort, status, error_code, latency_ms, session_hash, ip_hash, country_code, geo_source, user_id, is_registered, account_plan, subscription_status, is_pro, channel, environment, client_family, tool_name, locale, anonymous_client_hash, user_agent_hash, api_key_hash, mcp_server_version, request_id, dedupe_key, contract_version, episode_id, recovery_chain_id, attempt_id, attempt_number, query_variant, query_origin, search_engine, execution_route, server_build, created_at';
  const baseSelect = 'id, query_norm, source, library_filter, result_count, status, latency_ms, session_hash, ip_hash, created_at';
  async function load(select: string) {
    return await fetchAllRows<Record<string, unknown>>((from, to) => {
      let query = adminClient
        .from('search_request_audit')
        .select(select)
        .neq('source', 'trap')
        .order('created_at', { ascending: false })
        .range(from, to);

      if (since) {
        query = query.gte('created_at', since);
      }
      if (until) {
        query = query.lt('created_at', until);
      }
      if (select === fullSelect && channel !== 'all') {
        query = query.eq('channel', channel);
      }
      if (select === fullSelect && liveOnly) {
        query = query.in('environment', ['production', 'legacy']);
      }

      return query;
    }, maxRows);
  }

  try {
    const rows = await load(fullSelect);
    return rows.map(mapAuditRowToEvidenceRow);
  } catch (error) {
    if (!isMissingRelationError(error) && !isMissingColumnError(error)) throw error;
    try {
      const rows = await load(baseSelect);
      return rows.map(mapAuditRowToEvidenceRow);
    } catch (fallbackError) {
      if (isMissingRelationError(fallbackError)) return [];
      throw fallbackError;
    }
  }
}

function mapMcpUsageEventToEvidenceRow(row: Record<string, unknown>) {
  const resultCount = optionalNonnegativeInteger(row.result_count);
  const channel = classifyAnalyticsChannel(row.channel) || 'unknown';
  const environment = classifyAnalyticsSource(row.environment) || 'production';
  const visitor = buildEstimatedClientIdentity(row);
  const queryOrigin = readMcpQueryOrigin(row);
  const knownDefect = matchKnownDefect({
    ...row,
    search_query: row.query_norm,
    audit_status: row.status,
  }, knownSearchDefects);
  const metadata = row.metadata && typeof row.metadata === 'object'
    ? row.metadata as Record<string, unknown>
    : {};
  const returnedIconRefs = Array.isArray(metadata.returned_icon_refs)
    ? metadata.returned_icon_refs
      .map((value) => normalizeSearchQuery(value))
      .filter(Boolean)
      .slice(0, 100)
    : [];
  const returnedIconRefsRecorded = metadata.returned_icon_refs_recorded === true
    && !(resultCount !== null && resultCount > 0 && returnedIconRefs.length === 0);
  return {
    id: row.id ? `mcp_usage_events:${String(row.id)}` : null,
    source_row_id: row.id ? String(row.id) : null,
    source_table: 'mcp_usage_events',
    event_type: row.event_type || null,
    event_id: row.event_id || null,
    episode_id: metadata.episode_id || row.event_id || null,
    recovery_chain_id: metadata.recovery_chain_id || null,
    analytics_source: channel,
    analytics_channel: channel,
    environment,
    channel,
    signal_type: row.event_type === 'search_outcome' ? 'search_attempt' : 'mcp_call',
    search_query: normalizeSearchQuery(row.query_norm),
    icon_id: null,
    batch_id: row.request_id || row.dedupe_key || null,
    agent_converged: null,
    replaced_with: null,
    result_count: resultCount,
    library_filter: normalizeReviewLibraryFilter(row.library_filter),
    library_mode: row.library_mode || null,
    search_outcome: row.search_outcome || null,
    query_origin: queryOrigin,
    requested_limit: row.requested_limit ?? null,
    known_defect_id: knownDefect?.id || null,
    error_code: row.error_code || null,
    confidence_label: row.confidence_label || null,
    beta_cohort: row.beta_cohort || null,
    job_category: null,
    ui_surface: row.tool_name || row.client_family || channel,
    domain: null,
    context_url: null,
    session_hash: row.session_hash || null,
    ip_hash: row.ip_hash || null,
    ip_hash_prefix: compactHashPrefix(row.ip_hash),
    country_code: normalizeAuditCountry(row.country_code),
    geo_source: row.geo_source || null,
    user_id: row.user_id || null,
    is_registered: row.is_registered === true || Boolean(row.user_id),
    account_plan: row.account_plan || null,
    subscription_status: row.subscription_status || null,
    is_pro: row.is_pro === true,
    client_family: row.client_family || null,
    tool_name: row.tool_name || null,
    locale: row.locale || null,
    anonymous_client_hash_prefix: compactHashPrefix(row.anonymous_client_hash),
    anonymous_client_hash: row.anonymous_client_hash || null,
    user_agent_hash_prefix: compactHashPrefix(row.user_agent_hash),
    api_key_hash_prefix: compactHashPrefix(row.api_key_hash),
    api_key_hash: row.api_key_hash || null,
    estimated_client_key: visitor.display_key,
    visitor_kind: visitor.kind,
    _estimated_client_key: visitor.key,
    mcp_server_version: row.mcp_server_version || null,
    request_id: row.request_id || null,
    dedupe_key: row.dedupe_key || null,
    search_request_audit_id: row.search_request_audit_id ? String(row.search_request_audit_id) : null,
    client_ip_public: row.client_ip_public === true,
    audit_status: row.status || null,
    latency_ms: row.latency_ms ?? null,
    returned_icon_refs: returnedIconRefs,
    returned_icon_refs_recorded: returnedIconRefsRecorded,
    root_request_hash_prefix: compactHashPrefix(metadata.root_request_hash),
    search_execution: metadata.search_execution || null,
    server_build: metadata.server_build || null,
    traffic_class: metadata.traffic_class || null,
    evidence_text: `${row.client_family || 'unknown client'} ${row.tool_name || 'mcp tool'} ${row.status || 'event'}`,
    created_at: row.created_at || null,
  };
}

async function fetchMcpUsageEventRows(
  adminClient: SupabaseClient,
  since: string | null,
  until: string | null = null,
  maxRows = Number.POSITIVE_INFINITY,
  channel = 'all',
  liveOnly = false,
  eventTypes: string[] = [],
) {
  const select = 'id, event_id, request_id, dedupe_key, event_type, channel, environment, client_family, tool_name, query_norm, library_filter, library_mode, query_origin, requested_limit, result_count, search_outcome, confidence_label, beta_cohort, status, error_code, latency_ms, country_code, geo_source, client_ip_public, locale, anonymous_client_hash, session_hash, ip_hash, user_agent_hash, api_key_hash, user_id, is_registered, is_pro, account_plan, subscription_status, mcp_server_version, search_request_audit_id, metadata, created_at';

  try {
    const rows = await fetchAllRows<Record<string, unknown>>((from, to) => {
      let query = adminClient
        .from('mcp_usage_events')
        .select(select)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (since) {
        query = query.gte('created_at', since);
      }
      if (until) {
        query = query.lt('created_at', until);
      }
      if (channel !== 'all') {
        query = query.eq('channel', channel);
      }
      if (liveOnly) {
        query = query.in('environment', ['production', 'legacy']);
      }
      if (eventTypes.length > 0) {
        query = query.in('event_type', eventTypes);
      }

      return query;
    }, maxRows);
    return rows.map(mapMcpUsageEventToEvidenceRow);
  } catch (error) {
    if (isMissingRelationError(error) || isMissingColumnError(error)) return [];
    throw error;
  }
}

function buildQueryQueueCacheKey(url: URL) {
  const params = [...url.searchParams.entries()]
    .sort(([leftKey, leftValue], [rightKey, rightValue]) => (
      leftKey.localeCompare(rightKey) || leftValue.localeCompare(rightValue)
    ));
  return `${url.pathname}?${new URLSearchParams(params).toString()}`;
}

async function fetchTelemetryEvidenceRows(
  adminClient: SupabaseClient,
  since: string | null,
  until: string | null = null,
  maxRowsPerSource = Number.POSITIVE_INFINITY,
) : Promise<SearchEvidenceRow[]> {
  const [auditRows, mcpUsageRows] = await Promise.all([
    fetchHostedSearchAuditRows(adminClient, since, until, maxRowsPerSource),
    fetchMcpUsageEventRows(adminClient, since, until, maxRowsPerSource),
  ]);
  return mergeTelemetryEvidenceRows([...auditRows, ...mcpUsageRows])
    .map((row): SearchEvidenceRow => ({
      ...row,
      environment: classifySearchEvidenceEnvironment(row),
      channel: classifySearchEvidenceChannel(row),
    }));
}

async function fetchSearchEvidenceRows(
  adminClient: SupabaseClient,
  since: string | null,
  queryOrigin: QueryOriginFilter = 'all',
) : Promise<SearchEvidenceRow[]> {
  if (!queryOriginNeedsLegacyIconEvidence(queryOrigin)) {
    return (await fetchTelemetryEvidenceRows(adminClient, since))
      .filter((row) => String(row.query_origin || 'legacy_unknown') === queryOrigin)
      .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
  }

  const iconRows = await fetchIconEvidenceRows(adminClient, since);
  const auditRows = await fetchHostedSearchAuditRows(adminClient, since);
  const mcpUsageRows = await fetchMcpUsageEventRows(adminClient, since);
  const telemetryRows = mergeTelemetryEvidenceRows([...auditRows, ...mcpUsageRows]);
  const rows: SearchEvidenceRow[] = [...iconRows, ...telemetryRows] as SearchEvidenceRow[];
  return rows
    .map((row): SearchEvidenceRow => ({
      ...row,
      environment: classifySearchEvidenceEnvironment(row),
      channel: classifySearchEvidenceChannel(row),
    }))
    .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
}

function currentUtcDayStartIso(now = new Date()) {
  return `${now.toISOString().slice(0, 10)}T00:00:00.000Z`;
}

function nextUtcDayStartIso(day: string) {
  const epoch = Date.parse(`${day}T00:00:00.000Z`);
  return Number.isFinite(epoch) ? new Date(epoch + 86400000).toISOString() : null;
}

async function upsertRollupRows(
  adminClient: SupabaseClient,
  table: string,
  rows: Array<Record<string, unknown>>,
  onConflict: string,
) {
  const refreshedAt = new Date().toISOString();
  for (let offset = 0; offset < rows.length; offset += 500) {
    const batch = rows.slice(offset, offset + 500).map((row) => ({
      ...row,
      refreshed_at: refreshedAt,
    }));
    const { error } = await adminClient.from(table).upsert(batch, { onConflict });
    if (error) throw error;
  }
}

async function findNextCompletedTelemetryDay(
  adminClient: SupabaseClient,
  afterDay: string | null,
  currentDayStart: string,
) {
  const after = afterDay ? nextUtcDayStartIso(afterDay) : null;

  async function loadFirstAuditTime() {
    let query = adminClient
      .from('search_request_audit')
      .select('created_at')
      .neq('source', 'trap')
      .not('query_norm', 'is', null)
      .lt('created_at', currentDayStart)
      .order('created_at', { ascending: true })
      .limit(1);
    if (after) query = query.gte('created_at', after);
    const { data, error } = await query;
    if (error) {
      if (isMissingRelationError(error) || isMissingColumnError(error)) return null;
      throw error;
    }
    return data?.[0]?.created_at ? String(data[0].created_at) : null;
  }

  async function loadFirstUsageTime() {
    let query = adminClient
      .from('mcp_usage_events')
      .select('created_at')
      .eq('event_type', 'search_outcome')
      .not('query_norm', 'is', null)
      .lt('created_at', currentDayStart)
      .order('created_at', { ascending: true })
      .limit(1);
    if (after) query = query.gte('created_at', after);
    const { data, error } = await query;
    if (error) {
      if (isMissingRelationError(error) || isMissingColumnError(error)) return null;
      throw error;
    }
    return data?.[0]?.created_at ? String(data[0].created_at) : null;
  }

  const candidates = (await Promise.all([loadFirstAuditTime(), loadFirstUsageTime()]))
    .filter((value): value is string => Boolean(value))
    .sort();
  return candidates.length > 0 ? candidates[0].slice(0, 10) : null;
}

async function ensureCompletedDayRollups(adminClient: SupabaseClient) {
  async function loadLatestDay(table: string) {
    const result = await adminClient
      .from(table)
      .select('day')
      .order('day', { ascending: false })
      .limit(1);
    if (result.error) {
      if (isMissingRelationError(result.error)) return { available: false, day: null };
      throw result.error;
    }
    return {
      available: true,
      day: result.data?.[0]?.day ? String(result.data[0].day) : null,
    };
  }

  const [overviewState, queryState] = await Promise.all([
    loadLatestDay('admin_rollup_overview'),
    loadLatestDay('admin_rollup_queries'),
  ]);
  if (!overviewState.available || !queryState.available) {
    return { available: false, complete: false, refreshed_days: [] };
  }
  const latestDay = overviewState.day && queryState.day
    ? [overviewState.day, queryState.day].sort()[0]
    : null;
  const currentDayStart = currentUtcDayStartIso();
  const nextDay = await findNextCompletedTelemetryDay(adminClient, latestDay, currentDayStart);
  if (!nextDay) {
    return { available: true, complete: true, refreshed_days: [] };
  }

  const dayStart = `${nextDay}T00:00:00.000Z`;
  const dayEnd = nextUtcDayStartIso(nextDay);
  if (!dayEnd || dayEnd > currentDayStart) {
    return { available: true, complete: true, refreshed_days: [] };
  }

  const rawRows = await fetchTelemetryEvidenceRows(adminClient, dayStart, dayEnd);
  const rollups = buildAdminRollups(rawRows, knownSearchDefects);
  if (rollups.overview.length === 0) {
    throw new Error(`Completed telemetry day ${nextDay} produced no overview rollups.`);
  }
  await upsertRollupRows(
    adminClient,
    'admin_rollup_queries',
    rollups.queries,
    'day,query_norm,library_filter,query_origin,channel,environment,tool_name',
  );
  await upsertRollupRows(
    adminClient,
    'admin_rollup_overview',
    rollups.overview,
    'day,channel,environment,query_origin',
  );
  return {
    available: true,
    complete: false,
    refreshed_days: [nextDay],
  };
}

function sumRollupCounts(rows: Array<Record<string, unknown>>) {
  const fields = [
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
  const summary: Record<string, number> = Object.fromEntries(fields.map((field) => [field, 0]));
  for (const row of rows) {
    for (const field of fields) {
      const value = Number(row[field]);
      if (Number.isFinite(value)) summary[field] += value;
    }
  }
  return summary;
}

function mergeCountSummaries(
  left: Record<string, unknown>,
  right: Record<string, unknown>,
) {
  const merged: Record<string, unknown> = { ...left };
  for (const [key, value] of Object.entries(right)) {
    if (typeof value !== 'number' || !Number.isFinite(value)) continue;
    merged[key] = Number(merged[key] || 0) + value;
  }
  return merged;
}

async function fetchOverviewRollups(
  adminClient: SupabaseClient,
  since: string | null,
  environment: QueryEnvironmentFilter,
  channel: QueryChannelFilter,
  queryOrigin: QueryOriginFilter,
) {
  let query = adminClient
    .from('admin_rollup_overview')
    .select('day, channel, environment, query_origin, attempt_count, success_count, true_zero_count, low_result_count, low_result_eligible_count, approximate_low_result_count, error_count, clarification_count, partial_recommendation_count, defect_count, client_days')
    .order('day', { ascending: true });
  if (since) query = query.gte('day', since.slice(0, 10));
  if (environment !== 'all' && environment !== 'live') query = query.eq('environment', environment);
  if (environment === 'live') query = query.eq('environment', 'production');
  if (channel !== 'all') query = query.eq('channel', channel);
  if (queryOrigin !== 'all') query = query.eq('query_origin', queryOrigin);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

function compactPhaseAActivityRow(row: Record<string, unknown>) {
  return {
    id: row.id || null,
    query: row.search_query || null,
    library_filter: row.library_filter || 'all',
    result_count: row.result_count ?? null,
    requested_limit: row.requested_limit ?? null,
    search_outcome: row.search_outcome || null,
    query_origin: row.query_origin || 'legacy_unknown',
    tool_name: row.tool_name || null,
    channel: classifySearchEvidenceChannel(row),
    environment: classifySearchEvidenceEnvironment(row),
    country_code: row.country_code || null,
    estimated_client_key: row.estimated_client_key || null,
    visitor_kind: row.visitor_kind || null,
    known_defect_id: row.known_defect_id || null,
    error_code: row.error_code || null,
    latency_ms: row.latency_ms ?? null,
    created_at: row.created_at || null,
  };
}

async function buildPhaseADashboardPayload(adminClient: SupabaseClient, url: URL) {
  const window = parseIntelligenceWindow(url);
  const since = getWindowSinceIso(window);
  const environment = parseQueryEnvironmentFilter(url);
  const channel = parseQueryChannelFilter(url);
  const queryOrigin = parseQueryOriginFilter(url);
  const usesRollups = window.days === null || (window.days !== null && window.days >= 90);

  const recentSince = new Date(Date.now() - 86400000).toISOString();
  const recentRows = filterEvidenceRowsByQueryOrigin(
    filterEvidenceRowsByChannel(
      filterEvidenceRowsByEnvironment(
        await fetchTelemetryEvidenceRows(adminClient, recentSince),
        environment,
      ),
      channel,
    ),
    queryOrigin,
  );

  let summary: Record<string, unknown>;
  let rollupState: Record<string, unknown> = { available: true, refreshed_days: [] };
  if (usesRollups) {
    rollupState = await ensureCompletedDayRollups(adminClient);
    const completedRows = rollupState.available === true
      ? await fetchOverviewRollups(adminClient, since, environment, channel, queryOrigin)
      : [];
    const todayRows = filterEvidenceRowsByQueryOrigin(
      filterEvidenceRowsByChannel(
        filterEvidenceRowsByEnvironment(
          await fetchTelemetryEvidenceRows(adminClient, currentUtcDayStartIso()),
          environment,
        ),
        channel,
      ),
      queryOrigin,
    );
    const currentSummary = summarizeRawSearchAttempts(todayRows, knownSearchDefects);
    summary = mergeCountSummaries(sumRollupCounts(completedRows), currentSummary);
    summary.estimated_unique_clients = null;
    summary.searches_per_client = null;
    summary.returning_clients_within_month = null;
    summary.client_measure = 'client_days';
  } else {
    const rawRows = filterEvidenceRowsByQueryOrigin(
      filterEvidenceRowsByChannel(
        filterEvidenceRowsByEnvironment(
          await fetchTelemetryEvidenceRows(adminClient, since),
          environment,
        ),
        channel,
      ),
      queryOrigin,
    );
    summary = summarizeRawSearchAttempts(rawRows, knownSearchDefects);
    summary.client_measure = 'estimated_unique_clients';
  }

  const lowEligible = Number(summary.low_result_eligible_count || 0);
  const attempts = Number(summary.attempt_count || 0);
  summary.true_zero_rate = attempts > 0
    ? Number((Number(summary.true_zero_count || 0) / attempts).toFixed(4))
    : null;
  summary.low_result_rate = lowEligible > 0
    ? Number((Number(summary.low_result_count || 0) / lowEligible).toFixed(4))
    : null;

  return {
    summary,
    latest_activity: recentRows
      .filter((row) => String(row.signal_type || '') === 'search_attempt')
      .slice(0, 50)
      .map(compactPhaseAActivityRow),
    known_defects: knownSearchDefects.defects,
    rollups: rollupState,
    filters: {
      window: window.key,
      environment,
      channel,
      query_origin: queryOrigin,
    },
    limitations: {
      anonymous_identity_rotates_monthly: true,
      returning_clients_are_within_calendar_month: true,
      long_windows_use_client_days: usesRollups,
      rollup_backfill_complete: usesRollups ? rollupState.complete === true : true,
      approximate_low_results_excluded_from_headline_rate: true,
    },
  };
}

async function handlePhaseADashboard(req: Request, adminClient: SupabaseClient, url: URL) {
  return jsonResponse(req, await buildPhaseADashboardPayload(adminClient, url));
}

const V2_MAX_RAW_ROWS_PER_SOURCE = 30000;
const V2_MAX_IDENTITY_ROWS_PER_SOURCE = 30000;
const V2_IDENTITY_PAGE_CONCURRENCY = 4;
const V2_MAX_ROLLUP_ROWS = 50000;
const V2_ROLLUP_PAGE_CONCURRENCY = 4;
const V2_MAX_ICON_ROWS = 5000;
export const DASHBOARD_V2_RECONCILIATION_GRACE_SECONDS = 120;

type DashboardV2SortDirection = 'asc' | 'desc';
type DashboardV2SortType = 'text' | 'number' | 'date';
type DashboardV2SortDefinition = {
  type: DashboardV2SortType;
  value: (row: Record<string, unknown>) => unknown;
};
type DashboardV2SortSpec = {
  key: string;
  direction: DashboardV2SortDirection;
} | null;

const DASHBOARD_V2_SEARCH_SORTS: Record<string, DashboardV2SortDefinition> = {
  query: { type: 'text', value: (row) => row.query },
  searcher_identifier: { type: 'text', value: (row) => row.searcher_identifier },
  outcome: { type: 'text', value: (row) => row.outcome_label },
  country_code: { type: 'text', value: (row) => row.country_code },
  channel: { type: 'text', value: (row) => row.channel },
  result_count: { type: 'number', value: (row) => row.result_count },
  recorded_at: { type: 'date', value: (row) => row.recorded_at },
};

const DASHBOARD_V2_CLIENT_SORTS: Record<string, DashboardV2SortDefinition> = {
  searcher: { type: 'text', value: (row) => row.client_key },
  plan: { type: 'text', value: (row) => row.plan },
  country_code: { type: 'text', value: (row) => row.country_code },
  first_seen: { type: 'date', value: (row) => row.first_seen },
  last_seen: { type: 'date', value: (row) => row.last_seen },
  searches: { type: 'number', value: (row) => row.searches },
  top_query: { type: 'text', value: (row) => row.top_query },
};

export function parseDashboardV2Sort(
  url: URL,
  definitions: Record<string, DashboardV2SortDefinition>,
): DashboardV2SortSpec {
  const key = String(url.searchParams.get('sort_by') || '').trim();
  if (!key) return null;
  if (!Object.hasOwn(definitions, key)) {
    throw new Error('The dashboard sort column is invalid.');
  }
  const rawDirection = String(url.searchParams.get('sort_direction') || 'desc')
    .trim()
    .toLowerCase();
  if (!['asc', 'desc'].includes(rawDirection)) {
    throw new Error('The dashboard sort direction is invalid.');
  }
  return {
    key,
    direction: rawDirection as DashboardV2SortDirection,
  };
}

function dashboardV2SortValueIsMissing(value: unknown, type: DashboardV2SortType) {
  if (value === null || value === undefined || value === '') return true;
  if (type === 'number') return !Number.isFinite(Number(value));
  if (type === 'date') return !Number.isFinite(Date.parse(String(value)));
  return false;
}

export function sortDashboardV2Rows(
  rows: Array<Record<string, unknown>>,
  sort: DashboardV2SortSpec,
  definitions: Record<string, DashboardV2SortDefinition>,
) {
  if (!sort) return [...rows];
  const definition = definitions[sort.key];
  const direction = sort.direction === 'asc' ? 1 : -1;
  return rows
    .map((row, index) => ({ row, index }))
    .sort((left, right) => {
      const leftValue = definition.value(left.row);
      const rightValue = definition.value(right.row);
      const leftMissing = dashboardV2SortValueIsMissing(leftValue, definition.type);
      const rightMissing = dashboardV2SortValueIsMissing(rightValue, definition.type);
      if (leftMissing && rightMissing) return left.index - right.index;
      if (leftMissing) return 1;
      if (rightMissing) return -1;
      let result = 0;
      if (definition.type === 'number') {
        result = Number(leftValue) - Number(rightValue);
      } else if (definition.type === 'date') {
        result = Date.parse(String(leftValue)) - Date.parse(String(rightValue));
      } else {
        result = String(leftValue).localeCompare(String(rightValue), undefined, {
          numeric: true,
          sensitivity: 'base',
        });
      }
      return result === 0 ? left.index - right.index : result * direction;
    })
    .map((entry) => entry.row);
}

function buildDashboardV2CacheKey(endpoint: string, url: URL) {
  const params = [...url.searchParams.entries()]
    .filter(([key]) => key !== '_ts')
    .sort(([leftKey, leftValue], [rightKey, rightValue]) => (
      leftKey.localeCompare(rightKey) || leftValue.localeCompare(rightValue)
    ));
  return `${endpoint}?${new URLSearchParams(params)}`;
}

function buildSearchEventSnapshotCacheKey(
  url: URL,
  filters: ReturnType<typeof parseDashboardV2Filters>,
) {
  const params = new URLSearchParams([...url.searchParams.entries()]
    .filter(([key]) => !['_ts', 'page', 'page_size', 'snapshot_id'].includes(key))
    .sort(([leftKey, leftValue], [rightKey, rightValue]) => (
      leftKey.localeCompare(rightKey) || leftValue.localeCompare(rightValue)
    )));
  params.set('data_cutoff', filters.data_cutoff);
  params.sort();
  return `search-events-snapshot?${params}`;
}

async function buildSearchEventSnapshotId(snapshotKey: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(snapshotKey));
  return [...new Uint8Array(digest)]
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 24);
}

function dashboardV2EnvironmentFilter(filters: ReturnType<typeof parseDashboardV2Filters>) {
  return filters.include_test ? 'all' : 'live';
}

function rangeIncludesCurrentDay(filters: ReturnType<typeof parseDashboardV2Filters>) {
  const today = currentUtcDayStartIso().slice(0, 10);
  return (!filters.from_day || filters.from_day <= today) && filters.to_day >= today;
}

function dashboardV2CompletedRollupFilters(
  filters: ReturnType<typeof parseDashboardV2Filters>,
) {
  const todayStart = currentUtcDayStartIso();
  const today = todayStart.slice(0, 10);
  const yesterday = new Date(Date.parse(todayStart) - 86_400_000).toISOString().slice(0, 10);
  return {
    ...filters,
    to_day: filters.to_day < today ? filters.to_day : yesterday,
  };
}

function dashboardV2RangeHasCompletedDays(
  filters: ReturnType<typeof parseDashboardV2Filters>,
) {
  return !filters.from_day || filters.from_day <= filters.to_day;
}

function dashboardV2CurrentDayFilters(
  filters: ReturnType<typeof parseDashboardV2Filters>,
) {
  const todayStart = currentUtcDayStartIso();
  return {
    ...filters,
    from: todayStart,
    from_day: todayStart.slice(0, 10),
  };
}

type SearchTelemetrySettings = {
  dashboard_source: 'legacy' | 'shadow' | 'final';
  web_final_outcome_cutover_at: string | null;
  local_mcp_coverage_cutover_at: string | null;
};

async function fetchSearchTelemetrySettings(
  adminClient: SupabaseClient,
): Promise<SearchTelemetrySettings> {
  try {
    const { data, error } = await adminClient
      .from('search_telemetry_settings')
      .select('dashboard_source, web_final_outcome_cutover_at, local_mcp_coverage_cutover_at')
      .eq('setting_id', 'active')
      .maybeSingle();
    if (error) throw error;
    const source = String(data?.dashboard_source || 'legacy');
    return {
      dashboard_source: source === 'final' || source === 'shadow' ? source : 'legacy',
      web_final_outcome_cutover_at: data?.web_final_outcome_cutover_at
        ? String(data.web_final_outcome_cutover_at)
        : null,
      local_mcp_coverage_cutover_at: data?.local_mcp_coverage_cutover_at
        ? String(data.local_mcp_coverage_cutover_at)
        : null,
    };
  } catch (error) {
    if (isMissingRelationError(error) || isMissingColumnError(error)) {
      return {
        dashboard_source: 'legacy',
        web_final_outcome_cutover_at: null,
        local_mcp_coverage_cutover_at: null,
      };
    }
    throw error;
  }
}

export function finalOutcomeIsAfterCutover(
  row: Record<string, unknown>,
  settings: SearchTelemetrySettings,
) {
  const channel = String(row.channel || '');
  const completedAt = Date.parse(String(row.completed_at || ''));
  if (!Number.isFinite(completedAt)) return false;
  if (channel === 'web') {
    const cutover = Date.parse(String(settings.web_final_outcome_cutover_at || ''));
    return Number.isFinite(cutover) && completedAt >= cutover;
  }
  if (channel === 'local_mcp') {
    const cutover = Date.parse(String(settings.local_mcp_coverage_cutover_at || ''));
    return Number.isFinite(cutover) && completedAt >= cutover;
  }
  return channel === 'hosted_mcp';
}

export function buildFinalOutcomeCoverage(
  settings: SearchTelemetrySettings,
  filters: ReturnType<typeof parseDashboardV2Filters>,
) {
  const warnings: string[] = [];
  const includesWeb = filters.channel === 'all' || filters.channel === 'web';
  const includesLocal = filters.channel === 'all' || filters.channel === 'local_mcp';
  if (settings.dashboard_source === 'final' && includesWeb) {
    if (!settings.web_final_outcome_cutover_at) {
      warnings.push('Website final-outcome coverage is not verified yet, so website rows are excluded.');
    } else if (!filters.from || Date.parse(filters.from) < Date.parse(settings.web_final_outcome_cutover_at)) {
      warnings.push(`Website final-outcome coverage begins ${settings.web_final_outcome_cutover_at}. Earlier website activity is excluded.`);
    }
  }
  if (settings.dashboard_source === 'final' && includesLocal) {
    if (!settings.local_mcp_coverage_cutover_at) {
      warnings.push('Local MCP coverage is not verified yet, so Local MCP rows are excluded.');
    } else if (!filters.from || Date.parse(filters.from) < Date.parse(settings.local_mcp_coverage_cutover_at)) {
      warnings.push(`Local MCP coverage begins ${settings.local_mcp_coverage_cutover_at}. Earlier Local MCP activity is excluded.`);
    }
  }
  return {
    source: settings.dashboard_source,
    web_final_outcome_cutover_at: settings.web_final_outcome_cutover_at,
    local_mcp_coverage_cutover_at: settings.local_mcp_coverage_cutover_at,
    warnings,
  };
}

export function mapFinalOutcomeToEvidenceRow(row: Record<string, unknown>): SearchEvidenceRow {
  const metadata = row.metadata && typeof row.metadata === 'object'
    ? row.metadata as Record<string, unknown>
    : {};
  const visitor = buildEstimatedClientIdentity(row);
  const finalOutcome = String(row.final_outcome || '').toLowerCase();
  const channel = String(row.channel || 'unknown');
  const resultCount = optionalNonnegativeInteger(row.final_match_count);
  const returnedIconRefs = Array.isArray(metadata.returned_icon_refs)
    ? metadata.returned_icon_refs
      .map((value) => normalizeSearchQuery(value))
      .filter(Boolean)
      .slice(0, 100)
    : [];
  const returnedIconRefsRecorded = metadata.returned_icon_refs_recorded === true
    && !(resultCount !== null && resultCount > 0 && returnedIconRefs.length === 0);
  return {
    id: row.episode_id ? `search_final_outcomes:${String(row.episode_id)}` : null,
    source_row_id: row.id ? String(row.id) : null,
    source_table: 'search_final_outcomes',
    event_type: 'search_outcome',
    event_id: row.episode_id || null,
    episode_id: row.episode_id || null,
    recovery_chain_id: row.recovery_chain_id || null,
    analytics_source: channel,
    analytics_channel: channel,
    environment: row.environment || 'production',
    channel,
    signal_type: 'search_attempt',
    search_query: normalizeSearchQuery(row.query),
    icon_id: null,
    batch_id: row.recovery_chain_id || null,
    agent_converged: null,
    replaced_with: null,
    result_count: resultCount,
    library_filter: normalizeReviewLibraryFilter(row.library_filter),
    library_mode: row.library_mode || null,
    search_outcome: finalOutcome === 'success' ? 'results' : finalOutcome,
    query_origin: channel === 'web'
      ? 'agent_query'
      : String(row.tool_name || '') === 'recommend_icons'
        ? 'recommend_variant'
        : 'agent_query',
    requested_limit: optionalNonnegativeInteger(metadata.requested_limit),
    known_defect_id: null,
    error_code: finalOutcome === 'error' ? metadata.error_code || 'final_search_error' : null,
    confidence_label: null,
    beta_cohort: null,
    job_category: null,
    ui_surface: channel === 'web' ? 'website' : row.tool_name || channel,
    domain: null,
    context_url: null,
    session_hash: null,
    ip_hash: null,
    ip_hash_prefix: null,
    country_code: normalizeAuditCountry(row.country_code),
    geo_source: row.geo_source || null,
    user_id: row.user_id || null,
    is_registered: row.is_registered === true || Boolean(row.user_id),
    account_plan: null,
    subscription_status: null,
    is_pro: false,
    client_family: row.client_family || null,
    tool_name: row.tool_name || null,
    locale: row.locale || null,
    interface_locale: row.interface_locale || null,
    anonymous_client_hash_prefix: compactHashPrefix(row.anonymous_client_hash),
    anonymous_client_hash: row.anonymous_client_hash || null,
    user_agent_hash_prefix: null,
    api_key_hash_prefix: null,
    api_key_hash: null,
    estimated_client_key: visitor.display_key,
    visitor_kind: visitor.kind,
    _estimated_client_key: visitor.key,
    mcp_server_version: row.source_version || null,
    request_id: row.recovery_chain_id || null,
    dedupe_key: row.episode_id || null,
    search_request_audit_id: null,
    client_ip_public: row.client_ip_public === true,
    audit_status: finalOutcome === 'error' ? 'error' : 'ok',
    latency_ms: row.latency_ms ?? null,
    returned_icon_refs: returnedIconRefs,
    returned_icon_refs_recorded: returnedIconRefsRecorded,
    root_request_hash_prefix: compactHashPrefix(row.recovery_chain_id),
    search_execution: row.search_execution || null,
    server_build: row.server_build || null,
    traffic_class: row.traffic_class || null,
    legacy_identity_quality: row.legacy_identity_quality || null,
    settlement_state: row.settlement_state || null,
    diagnostic_attempt_count: row.diagnostic_attempt_count ?? null,
    _source_event_id: row.source_event_id || null,
    evidence_text: `${channel} final search ${finalOutcome || 'outcome'}`,
    created_at: row.completed_at || null,
  } as SearchEvidenceRow;
}

async function fetchFinalOutcomeRows(
  adminClient: SupabaseClient,
  filters: ReturnType<typeof parseDashboardV2Filters>,
  settings: SearchTelemetrySettings,
  { applyQuery = true } = {},
) {
  const select = 'id, contract_version, episode_id, recovery_chain_id, source_event_id, channel, query, environment, traffic_class, client_family, tool_name, library_filter, library_mode, style, locale, interface_locale, final_match_count, final_outcome, settlement_state, search_execution, server_build, diagnostic_attempt_count, legacy_identity_quality, source_version, anonymous_client_hash, user_id, is_registered, client_ip_public, country_code, geo_source, latency_ms, completed_at, metadata';
  const result = await fetchBoundedDashboardV2Pages(async ({
    from,
    to,
  }: {
    from: number;
    to: number;
    includeCount: boolean;
  }) => {
    let query = adminClient
      .from('search_final_outcomes')
      .select(select)
      .order('completed_at', { ascending: false })
      .range(from, to);
    if (filters.from) query = query.gte('completed_at', filters.from);
    if (filters.to_exclusive) query = query.lt('completed_at', filters.to_exclusive);
    if (filters.channel !== 'all') query = query.eq('channel', filters.channel);
    const { data, error } = await query;
    if (error) throw error;
    return {
      rows: (data || []) as Array<Record<string, unknown>>,
      total: null,
    };
  }, {
    maxRows: V2_MAX_IDENTITY_ROWS_PER_SOURCE + 1,
    pageSize: EVIDENCE_PAGE_SIZE,
    concurrency: V2_IDENTITY_PAGE_CONCURRENCY,
  });
  const truncated = result.rows.length > V2_MAX_IDENTITY_ROWS_PER_SOURCE;
  const rows = result.rows
    .slice(0, V2_MAX_IDENTITY_ROWS_PER_SOURCE)
    .filter((row: Record<string, unknown>) => finalOutcomeIsAfterCutover(row, settings))
    .map(mapFinalOutcomeToEvidenceRow);
  const filterValues = applyQuery ? filters : { ...filters, q: '' };
  return {
    rows: filterDashboardV2Rows(rows, filterValues) as SearchEvidenceRow[],
    truncated,
  };
}

export function mergeFinalAndLegacyHostedOutcomeRows(
  finalRows: SearchEvidenceRow[],
  hostedRows: SearchEvidenceRow[],
) {
  const finalSourceEventIds = new Set(
    finalRows
      .map((row) => String((row as Record<string, unknown>)._source_event_id || ''))
      .filter(Boolean),
  );
  const compatibleHostedRows = hostedRows
    .filter((row) => (
      row.source_table === 'mcp_usage_events'
      && row.event_type === 'search_outcome'
      && row.channel === 'hosted_mcp'
      && ['search_icons', 'recommend_icons'].includes(String(row.tool_name || ''))
      && !finalSourceEventIds.has(String(row.id || ''))
    ))
    .map((row) => ({
      ...row,
      legacy_identity_quality: row.event_id ? 'exact' : 'legacy_best_effort',
      settlement_state: row.audit_status === 'error' ? 'failed' : 'completed',
    }));
  return [...finalRows, ...compatibleHostedRows] as SearchEvidenceRow[];
}

async function fetchCompleteFinalOutcomeRows(
  adminClient: SupabaseClient,
  filters: ReturnType<typeof parseDashboardV2Filters>,
  settings: SearchTelemetrySettings,
  { applyQuery = true } = {},
) {
  const finalRows = await fetchFinalOutcomeRows(
    adminClient,
    filters,
    settings,
    { applyQuery },
  );
  if (filters.channel !== 'all' && filters.channel !== 'hosted_mcp') {
    return finalRows;
  }
  const hostedRows = await fetchMcpUsageEventRows(
    adminClient,
    filters.from,
    filters.to_exclusive,
    V2_MAX_IDENTITY_ROWS_PER_SOURCE + 1,
    'hosted_mcp',
    false,
    ['search_outcome'],
  );
  const truncated = hostedRows.length > V2_MAX_IDENTITY_ROWS_PER_SOURCE;
  const filterValues = applyQuery ? filters : { ...filters, q: '' };
  const rows = mergeFinalAndLegacyHostedOutcomeRows(
    finalRows.rows,
    hostedRows.slice(0, V2_MAX_IDENTITY_ROWS_PER_SOURCE) as SearchEvidenceRow[],
  );
  return {
    rows: filterDashboardV2Rows(rows, filterValues) as SearchEvidenceRow[],
    truncated: finalRows.truncated || truncated,
  };
}

async function fetchFinalWebDiagnosticRows(
  adminClient: SupabaseClient,
  filters: ReturnType<typeof parseDashboardV2Filters>,
) {
  if (filters.channel !== 'all' && filters.channel !== 'web') {
    return { rows: [] as SearchEvidenceRow[], truncated: false };
  }
  const select = 'diagnostic_id, episode_id, recovery_chain_id, diagnostic_type, channel, query, local_match_count, hosted_match_count, hosted_state, search_execution, error_code, environment, traffic_class, source_version, observed_at, metadata';
  try {
    const result = await fetchBoundedDashboardV2Pages(async ({
      from,
      to,
    }: {
      from: number;
      to: number;
      includeCount: boolean;
    }) => {
      let query = adminClient
        .from('search_episode_diagnostics')
        .select(select)
        .order('observed_at', { ascending: false })
        .range(from, to);
      if (filters.from) query = query.gte('observed_at', filters.from);
      if (filters.to_exclusive) query = query.lt('observed_at', filters.to_exclusive);
      const { data, error } = await query;
      if (error) throw error;
      return {
        rows: (data || []) as Array<Record<string, unknown>>,
        total: null,
      };
    }, {
      maxRows: V2_MAX_IDENTITY_ROWS_PER_SOURCE + 1,
      pageSize: EVIDENCE_PAGE_SIZE,
      concurrency: V2_IDENTITY_PAGE_CONCURRENCY,
    });
    const truncated = result.rows.length > V2_MAX_IDENTITY_ROWS_PER_SOURCE;
    const rows = result.rows
      .slice(0, V2_MAX_IDENTITY_ROWS_PER_SOURCE)
      .map((row: Record<string, unknown>): SearchEvidenceRow => ({
        id: `search_episode_diagnostics:${String(row.diagnostic_id || '')}`,
        source_row_id: String(row.diagnostic_id || ''),
        source_table: 'search_episode_diagnostics',
        event_id: row.diagnostic_id || null,
        analytics_source: 'web',
        analytics_channel: 'web',
        environment: row.environment || 'production',
        channel: 'web',
        signal_type: 'hosted_search_audit',
        search_query: normalizeSearchQuery(row.query),
        result_count: null,
        library_filter: 'all',
        library_mode: null,
        search_outcome: null,
        query_origin: String(row.diagnostic_type || 'diagnostic'),
        requested_limit: null,
        error_code: row.error_code || null,
        confidence_label: null,
        beta_cohort: null,
        job_category: null,
        ui_surface: 'website',
        session_hash: null,
        ip_hash: null,
        country_code: null,
        geo_source: null,
        user_id: null,
        is_registered: false,
        account_plan: null,
        subscription_status: null,
        is_pro: false,
        client_family: 'browser',
        tool_name: null,
        locale: null,
        interface_locale: row.metadata && typeof row.metadata === 'object'
          ? (row.metadata as Record<string, unknown>).interface_locale || null
          : null,
        anonymous_client_hash: null,
        estimated_client_key: null,
        visitor_kind: null,
        _estimated_client_key: null,
        mcp_server_version: row.source_version || null,
        request_id: row.recovery_chain_id || null,
        dedupe_key: row.diagnostic_id || null,
        client_ip_public: false,
        audit_status: String(row.diagnostic_type || 'diagnostic'),
        latency_ms: null,
        episode_id: row.episode_id || null,
        recovery_chain_id: row.recovery_chain_id || null,
        root_request_hash_prefix: compactHashPrefix(row.episode_id),
        search_execution: row.search_execution || null,
        traffic_class: row.traffic_class || null,
        local_match_count: row.local_match_count ?? null,
        hosted_match_count: row.hosted_match_count ?? null,
        hosted_state: row.hosted_state || null,
        evidence_text: `web ${String(row.diagnostic_type || 'diagnostic')}`,
        created_at: row.observed_at || null,
      } as SearchEvidenceRow));
    return { rows, truncated };
  } catch (error) {
    if (isMissingRelationError(error) || isMissingColumnError(error)) {
      return { rows: [] as SearchEvidenceRow[], truncated: false };
    }
    throw error;
  }
}

function dashboardV2Identity(value: unknown) {
  return String(value || '').trim();
}

function addDashboardV2IdentityIndex(
  index: Map<string, SearchEvidenceRow[]>,
  value: unknown,
  row: SearchEvidenceRow,
) {
  const identity = dashboardV2Identity(value);
  if (!identity) return;
  const rows = index.get(identity) || [];
  rows.push(row);
  index.set(identity, rows);
}

function uniqueDashboardV2Rows(rows: SearchEvidenceRow[]) {
  const uniqueRows = new Map<string, SearchEvidenceRow>();
  for (const row of rows) {
    const identity = dashboardV2Identity(
      row.id
      || `${row.source_table || 'source'}:${row.source_row_id || row.event_id || ''}`,
    );
    if (identity) uniqueRows.set(identity, row);
  }
  return [...uniqueRows.values()];
}

export function buildDashboardV2SourceReconciliation({
  auditRows,
  usageRows,
  finalRows,
  webDiagnosticRows,
  dataCutoff,
  sourceRowsComplete = true,
  localMcpCoverageCutoverAt = null,
}: {
  auditRows: SearchEvidenceRow[];
  usageRows: SearchEvidenceRow[];
  finalRows: SearchEvidenceRow[];
  webDiagnosticRows: SearchEvidenceRow[];
  dataCutoff: string;
  sourceRowsComplete?: boolean;
  localMcpCoverageCutoverAt?: string | null;
}) {
  const dataCutoffMs = Date.parse(dataCutoff);
  if (!Number.isFinite(dataCutoffMs)) {
    throw new Error('Source reconciliation requires a valid data cutoff.');
  }
  const reconciliationCutoff = new Date(
    dataCutoffMs - (DASHBOARD_V2_RECONCILIATION_GRACE_SECONDS * 1000),
  ).toISOString();
  const reconciliationCutoffMs = Date.parse(reconciliationCutoff);
  const localMcpCoverageCutoverMs = Date.parse(String(localMcpCoverageCutoverAt || ''));
  const usageByAuditBacklink = new Map<string, SearchEvidenceRow[]>();
  const rowsByEpisode = new Map<string, SearchEvidenceRow[]>();
  const rowsByRecoveryChain = new Map<string, SearchEvidenceRow[]>();
  const webDiagnosticsByEpisode = new Map<string, SearchEvidenceRow[]>();
  const webDiagnosticsByRecoveryChain = new Map<string, SearchEvidenceRow[]>();
  const usageByRequest = new Map<string, SearchEvidenceRow[]>();
  const usageByDedupe = new Map<string, SearchEvidenceRow[]>();
  const finalSourceEventIds = new Set<string>();
  const legacyUsageExportIds = new Set<string>();

  for (const row of usageRows) {
    addDashboardV2IdentityIndex(usageByAuditBacklink, row.search_request_audit_id, row);
    addDashboardV2IdentityIndex(rowsByEpisode, row.episode_id || row.event_id, row);
    addDashboardV2IdentityIndex(rowsByRecoveryChain, row.recovery_chain_id, row);
    addDashboardV2IdentityIndex(usageByRequest, row.request_id, row);
    addDashboardV2IdentityIndex(usageByDedupe, row.dedupe_key, row);
  }
  for (const row of finalRows) {
    addDashboardV2IdentityIndex(rowsByEpisode, row.episode_id || row.event_id, row);
    addDashboardV2IdentityIndex(rowsByRecoveryChain, row.recovery_chain_id, row);
    const sourceEventId = dashboardV2Identity(
      (row as Record<string, unknown>)._source_event_id,
    );
    if (sourceEventId) finalSourceEventIds.add(sourceEventId);
    if (row.source_table === 'mcp_usage_events') {
      const usageId = dashboardV2Identity(row.id);
      if (usageId) legacyUsageExportIds.add(usageId);
    }
  }
  for (const row of webDiagnosticRows) {
    addDashboardV2IdentityIndex(webDiagnosticsByEpisode, row.episode_id, row);
    addDashboardV2IdentityIndex(
      webDiagnosticsByRecoveryChain,
      row.recovery_chain_id,
      row,
    );
  }
  function emptyDiagnosticLinkageCounts(): Record<string, number> {
    return {
      audit_backlink: 0,
      episode_id: 0,
      recovery_chain_id: 0,
      exact_request_or_dedupe: 0,
      pending_linkage: 0,
      explained_unlinked_diagnostic: 0,
      explained_nonfinal_diagnostic: 0,
      unexplained: 0,
    };
  }

  function classifyDiagnosticRow(
    row: SearchEvidenceRow,
    linkageCounts: Record<string, number>,
    {
      allowDirectGatewayExclusion = false,
      allowWebDiagnosticLink = false,
      allowNonfinalWebExclusion = false,
    } = {},
  ): SearchEvidenceRow {
    const auditId = dashboardV2Identity(row.source_row_id);
    const episodeId = dashboardV2Identity(row.episode_id);
    const recoveryChainId = dashboardV2Identity(row.recovery_chain_id);
    const exactCandidates = uniqueDashboardV2Rows([
      ...(usageByRequest.get(dashboardV2Identity(row.request_id)) || []),
      ...(usageByDedupe.get(dashboardV2Identity(row.dedupe_key)) || []),
    ]);
    const candidates = [
      {
        tier: 'audit_backlink',
        rows: usageByAuditBacklink.get(auditId) || [],
      },
      {
        tier: 'episode_id',
        rows: [
          ...(rowsByEpisode.get(episodeId) || []),
          ...(allowWebDiagnosticLink
            ? webDiagnosticsByEpisode.get(episodeId) || []
            : []),
        ],
      },
      {
        tier: 'recovery_chain_id',
        rows: [
          ...(rowsByRecoveryChain.get(recoveryChainId) || []),
          ...(allowWebDiagnosticLink
            ? webDiagnosticsByRecoveryChain.get(recoveryChainId) || []
            : []),
        ],
      },
      {
        tier: 'exact_request_or_dedupe',
        rows: exactCandidates.length === 1 ? exactCandidates : [],
      },
    ];
    const linked = candidates.find((entry) => entry.rows.length > 0);
    let diagnosticAccountingStatus = 'unexplained';
    let diagnosticLinkageTier = 'unexplained';
    let diagnosticExplanation = 'A product identity exists but no exact linked outcome or diagnostic was found.';
    let diagnosticLinkMatchCount = 0;
    if (linked) {
      diagnosticAccountingStatus = 'linked_diagnostic';
      diagnosticLinkageTier = linked.tier;
      diagnosticExplanation = 'Linked by an exact recorded identity.';
      diagnosticLinkMatchCount = linked.rows.length;
    } else {
      const observedAtMs = Date.parse(String(row.created_at || ''));
      if (Number.isFinite(observedAtMs) && observedAtMs >= reconciliationCutoffMs) {
        diagnosticAccountingStatus = 'pending_linkage';
        diagnosticLinkageTier = 'pending_linkage';
        diagnosticExplanation = 'Inside the 120-second reconciliation grace period.';
      } else if (
        allowDirectGatewayExclusion
        &&
        row.signal_type === 'hosted_search_audit'
        && row.channel !== 'web'
        && !episodeId
        && !recoveryChainId
        && exactCandidates.length === 0
      ) {
        diagnosticAccountingStatus = 'explained_unlinked_gateway_diagnostic';
        diagnosticLinkageTier = 'explained_unlinked_diagnostic';
        diagnosticExplanation = 'Direct gateway work has no product episode and remains diagnostic only.';
      } else if (
        allowNonfinalWebExclusion
        && row.source_table === 'search_episode_diagnostics'
        && ['superseded', 'incomplete'].includes(String(
          row.query_origin || row.audit_status || '',
        ).toLowerCase())
      ) {
        diagnosticAccountingStatus = 'explained_nonfinal_web_diagnostic';
        diagnosticLinkageTier = 'explained_nonfinal_diagnostic';
        diagnosticExplanation = 'The Web episode ended without a countable final outcome.';
      }
    }
    linkageCounts[diagnosticLinkageTier] += 1;
    return {
      ...row,
      diagnostic_accounting_status: diagnosticAccountingStatus,
      diagnostic_linkage_tier: diagnosticLinkageTier,
      diagnostic_explanation: diagnosticExplanation,
      diagnostic_link_match_count: diagnosticLinkMatchCount,
    };
  }

  const auditLinkageCounts = emptyDiagnosticLinkageCounts();
  const webDiagnosticLinkageCounts = emptyDiagnosticLinkageCounts();
  const annotatedAuditRows = auditRows.map((row) => (
    classifyDiagnosticRow(row, auditLinkageCounts, {
      allowDirectGatewayExclusion: true,
      allowWebDiagnosticLink: true,
    })
  ));
  const annotatedWebDiagnosticRows = webDiagnosticRows.map((row) => (
    classifyDiagnosticRow(row, webDiagnosticLinkageCounts, {
      allowNonfinalWebExclusion: true,
    })
  ));
  const diagnosticRows = [...annotatedAuditRows, ...annotatedWebDiagnosticRows];

  const relevantUsageRows = usageRows.filter((row) => (
    row.event_type === 'search_outcome'
    && ['search_icons', 'recommend_icons'].includes(String(row.tool_name || ''))
    && ['hosted_mcp', 'local_mcp'].includes(String(row.channel || ''))
  ));
  const usageCounts: Record<string, number> = {
    linked_final: 0,
    represented_legacy_final: 0,
    outside_verified_coverage: 0,
    pending_linkage: 0,
    unexplained: 0,
  };
  for (const row of relevantUsageRows) {
    const rowId = dashboardV2Identity(row.id);
    if (finalSourceEventIds.has(rowId)) {
      usageCounts.linked_final += 1;
      continue;
    }
    if (legacyUsageExportIds.has(rowId)) {
      usageCounts.represented_legacy_final += 1;
      continue;
    }
    const observedAtMs = Date.parse(String(row.created_at || ''));
    if (
      row.channel === 'local_mcp'
      && Number.isFinite(localMcpCoverageCutoverMs)
      && Number.isFinite(observedAtMs)
      && observedAtMs < localMcpCoverageCutoverMs
    ) {
      usageCounts.outside_verified_coverage += 1;
    } else if (Number.isFinite(observedAtMs) && observedAtMs >= reconciliationCutoffMs) {
      usageCounts.pending_linkage += 1;
    } else {
      usageCounts.unexplained += 1;
    }
  }

  function unexplainedRowsByChannel(rows: SearchEvidenceRow[]) {
    const counts: Record<string, number> = {};
    for (const row of rows) {
      if (row.diagnostic_accounting_status !== 'unexplained') continue;
      const channel = String(row.channel || 'unknown');
      counts[channel] = (counts[channel] || 0) + 1;
    }
    return counts;
  }

  const unexplainedAuditRows = annotatedAuditRows.filter(
    (row) => row.diagnostic_accounting_status === 'unexplained',
  );
  const unexplainedWebDiagnosticRows = annotatedWebDiagnosticRows.filter(
    (row) => row.diagnostic_accounting_status === 'unexplained',
  );
  const unexplainedObservedAt = [...unexplainedAuditRows, ...unexplainedWebDiagnosticRows]
    .map((row) => String(row.created_at || ''))
    .filter((value) => Number.isFinite(Date.parse(value)))
    .sort((left, right) => Date.parse(left) - Date.parse(right));

  const checks = {
    source_rows_complete: sourceRowsComplete,
    audit_rows_accounted:
      auditLinkageCounts.unexplained === 0,
    usage_rows_accounted:
      usageCounts.unexplained === 0,
    final_rows_have_product_roles:
      finalRows.every((row) => ['top_level', 'web_top_level'].includes(dashboardV2EventRole(row))),
    web_diagnostics_have_diagnostic_roles:
      annotatedWebDiagnosticRows.every((row) => dashboardV2EventRole(row) === 'diagnostic'),
    diagnostics_kept_out_of_product_rows:
      diagnosticRows.every((row) => (
        dashboardV2EventRole(row) === 'diagnostic'
        && !['search', 'lookup'].includes(dashboardV2SearchHistoryRole(row))
      )),
    web_diagnostics_accounted:
      webDiagnosticLinkageCounts.unexplained === 0,
  };
  const status = Object.values(checks).every(Boolean) ? 'passed' : 'needs_attention';
  return {
    schema_version: 1,
    status,
    data_cutoff: new Date(dataCutoffMs).toISOString(),
    reconciliation_cutoff: reconciliationCutoff,
    grace_period_seconds: DASHBOARD_V2_RECONCILIATION_GRACE_SECONDS,
    checks,
    counts: {
      eligible_audit_rows: auditRows.length,
      relevant_usage_rows: relevantUsageRows.length,
      product_rows_exported: finalRows.length,
      web_diagnostics_exported: annotatedWebDiagnosticRows.length,
      diagnostics_exported: diagnosticRows.length,
      pending_rows:
        auditLinkageCounts.pending_linkage
        + webDiagnosticLinkageCounts.pending_linkage
        + usageCounts.pending_linkage,
      explained_exclusions:
        auditLinkageCounts.explained_unlinked_diagnostic
        + auditLinkageCounts.explained_nonfinal_diagnostic
        + webDiagnosticLinkageCounts.explained_unlinked_diagnostic
        + webDiagnosticLinkageCounts.explained_nonfinal_diagnostic,
      outside_verified_coverage_rows: usageCounts.outside_verified_coverage,
      unexplained_rows:
        auditLinkageCounts.unexplained
        + webDiagnosticLinkageCounts.unexplained
        + usageCounts.unexplained,
    },
    audit_linkage_counts: auditLinkageCounts,
    web_diagnostic_linkage_counts: webDiagnosticLinkageCounts,
    usage_accounting_counts: usageCounts,
    outside_verified_coverage: {
      local_mcp_before_cutover: usageCounts.outside_verified_coverage,
      local_mcp_coverage_cutover_at: localMcpCoverageCutoverAt,
    },
    unexplained_breakdown: {
      audit_by_channel: unexplainedRowsByChannel(unexplainedAuditRows),
      web_diagnostic_by_channel: unexplainedRowsByChannel(unexplainedWebDiagnosticRows),
      first_observed_at: unexplainedObservedAt[0] || null,
      last_observed_at: unexplainedObservedAt.at(-1) || null,
    },
    diagnostic_rows: diagnosticRows,
  };
}

async function fetchDashboardV2Telemetry(
  adminClient: SupabaseClient,
  filters: ReturnType<typeof parseDashboardV2Filters>,
  { applyQuery = true } = {},
) {
  const settings = await fetchSearchTelemetrySettings(adminClient);
  if (settings.dashboard_source === 'final') {
    return await fetchCompleteFinalOutcomeRows(adminClient, filters, settings, { applyQuery });
  }
  const [auditRows, usageRows] = await Promise.all([
    fetchHostedSearchAuditRows(
      adminClient,
      filters.from,
      filters.to_exclusive,
      V2_MAX_RAW_ROWS_PER_SOURCE + 1,
      filters.channel,
      filters.use_raw && !filters.include_test,
    ),
    fetchMcpUsageEventRows(
      adminClient,
      filters.from,
      filters.to_exclusive,
      V2_MAX_RAW_ROWS_PER_SOURCE + 1,
      filters.channel,
      filters.use_raw && !filters.include_test,
      ['search_outcome', 'tool_call'],
    ),
  ]);
  const truncated = (
    auditRows.length > V2_MAX_RAW_ROWS_PER_SOURCE
    || usageRows.length > V2_MAX_RAW_ROWS_PER_SOURCE
  );
  const rows = mergeTelemetryEvidenceRows([
    ...auditRows.slice(0, V2_MAX_RAW_ROWS_PER_SOURCE),
    ...usageRows.slice(0, V2_MAX_RAW_ROWS_PER_SOURCE),
  ]).map((row): SearchEvidenceRow => ({
    ...row,
    environment: classifySearchEvidenceEnvironment(row),
    channel: classifySearchEvidenceChannel(row),
  }));
  const filterValues = applyQuery ? filters : { ...filters, q: '' };
  return {
    rows: filterDashboardV2Rows(rows, filterValues) as SearchEvidenceRow[],
    truncated,
  };
}

async function fetchDashboardV2IdentityTelemetry(
  adminClient: SupabaseClient,
  filters: ReturnType<typeof parseDashboardV2Filters>,
  { includeDiagnostics = false } = {},
) {
  const settings = await fetchSearchTelemetrySettings(adminClient);
  if (settings.dashboard_source === 'final') {
    const finalRows = await fetchCompleteFinalOutcomeRows(adminClient, filters, settings);
    if (!includeDiagnostics) return finalRows;
    const [auditSourceRows, usageSourceRows, webDiagnosticRows] = await Promise.all([
      fetchHostedSearchAuditRows(
        adminClient,
        filters.from,
        filters.to_exclusive,
        V2_MAX_IDENTITY_ROWS_PER_SOURCE + 1,
        filters.channel,
        false,
      ),
      fetchMcpUsageEventRows(
        adminClient,
        filters.from,
        filters.to_exclusive,
        V2_MAX_IDENTITY_ROWS_PER_SOURCE + 1,
        filters.channel,
        false,
        ['search_outcome'],
      ),
      fetchFinalWebDiagnosticRows(adminClient, filters),
    ]);
    const auditRowsTruncated = auditSourceRows.length > V2_MAX_IDENTITY_ROWS_PER_SOURCE;
    const usageRowsTruncated = usageSourceRows.length > V2_MAX_IDENTITY_ROWS_PER_SOURCE;
    const auditRows = filterDashboardV2Rows(
      auditSourceRows.slice(0, V2_MAX_IDENTITY_ROWS_PER_SOURCE),
      filters,
    ) as SearchEvidenceRow[];
    const usageRows = filterDashboardV2Rows(
      usageSourceRows.slice(0, V2_MAX_IDENTITY_ROWS_PER_SOURCE),
      filters,
    ) as SearchEvidenceRow[];
    const filteredWebDiagnosticRows = filterDashboardV2Rows(
      webDiagnosticRows.rows,
      filters,
    ) as SearchEvidenceRow[];
    const reconciliation = buildDashboardV2SourceReconciliation({
      auditRows,
      usageRows,
      finalRows: finalRows.rows,
      webDiagnosticRows: filteredWebDiagnosticRows,
      dataCutoff: filters.data_cutoff,
      localMcpCoverageCutoverAt: settings.local_mcp_coverage_cutover_at,
      sourceRowsComplete: !(
        finalRows.truncated
        || auditRowsTruncated
        || usageRowsTruncated
        || webDiagnosticRows.truncated
      ),
    });
    const {
      diagnostic_rows: diagnosticRows,
      ...sourceReconciliation
    } = reconciliation;
    return {
      rows: [
        ...finalRows.rows,
        ...filterDashboardV2Rows(
          diagnosticRows,
          filters,
        ) as SearchEvidenceRow[],
      ],
      truncated: finalRows.truncated
        || auditRowsTruncated
        || usageRowsTruncated
        || webDiagnosticRows.truncated,
      source_reconciliation: sourceReconciliation,
    };
  }

  const auditSelect = 'id, query_norm, source, library_filter, library_mode, result_count, search_outcome, confidence_label, beta_cohort, status, error_code, latency_ms, session_hash, ip_hash, country_code, geo_source, user_id, is_registered, account_plan, subscription_status, is_pro, channel, environment, client_family, tool_name, locale, anonymous_client_hash, user_agent_hash, api_key_hash, mcp_server_version, request_id, dedupe_key, contract_version, episode_id, recovery_chain_id, attempt_id, attempt_number, query_variant, query_origin, search_engine, execution_route, server_build, created_at';
  const usageSelect = 'id, event_id, request_id, dedupe_key, event_type, channel, environment, client_family, tool_name, query_norm, library_filter, library_mode, query_origin, requested_limit, result_count, search_outcome, confidence_label, beta_cohort, status, error_code, latency_ms, country_code, geo_source, client_ip_public, locale, anonymous_client_hash, session_hash, ip_hash, user_agent_hash, api_key_hash, user_id, is_registered, is_pro, account_plan, subscription_status, mcp_server_version, search_request_audit_id, metadata, created_at';

  const loadAuditRows = async () => {
    try {
      const result = await fetchBoundedDashboardV2Pages(async ({
        from,
        to,
        includeCount,
      }: {
        from: number;
        to: number;
        includeCount: boolean;
      }) => {
        const source = adminClient.from('search_request_audit');
        let query = source.select(auditSelect);
        query = query
          .neq('source', 'trap')
          .order('created_at', { ascending: false })
          .range(from, to);
        if (filters.channel !== 'all') query = query.eq('channel', filters.channel);
        if (filters.use_raw && !filters.include_test) {
          query = query.in('environment', ['production', 'legacy']);
        }
        if (filters.from) query = query.gte('created_at', filters.from);
        if (filters.to_exclusive) query = query.lt('created_at', filters.to_exclusive);
        const { data, error, count } = await query;
        if (error) throw error;
        return {
          rows: (data || []) as Array<Record<string, unknown>>,
          total: null,
        };
      }, {
        maxRows: V2_MAX_IDENTITY_ROWS_PER_SOURCE + 1,
        pageSize: EVIDENCE_PAGE_SIZE,
        concurrency: V2_IDENTITY_PAGE_CONCURRENCY,
      });
      return result.rows;
    } catch (error) {
      if (isMissingRelationError(error) || isMissingColumnError(error)) return [];
      throw error;
    }
  };

  const loadUsageRows = async () => {
    try {
      const result = await fetchBoundedDashboardV2Pages(async ({
        from,
        to,
        includeCount,
      }: {
        from: number;
        to: number;
        includeCount: boolean;
      }) => {
        const source = adminClient.from('mcp_usage_events');
        let query = source.select(usageSelect);
        query = query
          .in('event_type', ['search_outcome', 'tool_call'])
          .order('created_at', { ascending: false })
          .range(from, to);
        if (filters.channel !== 'all') query = query.eq('channel', filters.channel);
        if (filters.use_raw && !filters.include_test) {
          query = query.in('environment', ['production', 'legacy']);
        }
        if (filters.from) query = query.gte('created_at', filters.from);
        if (filters.to_exclusive) query = query.lt('created_at', filters.to_exclusive);
        const { data, error, count } = await query;
        if (error) throw error;
        return {
          rows: (data || []) as Array<Record<string, unknown>>,
          total: null,
        };
      }, {
        maxRows: V2_MAX_IDENTITY_ROWS_PER_SOURCE + 1,
        pageSize: EVIDENCE_PAGE_SIZE,
        concurrency: V2_IDENTITY_PAGE_CONCURRENCY,
      });
      return result.rows;
    } catch (error) {
      if (isMissingRelationError(error) || isMissingColumnError(error)) return [];
      throw error;
    }
  };

  const [auditRows, usageRows] = await Promise.all([loadAuditRows(), loadUsageRows()]);
  const truncated = (
    auditRows.length > V2_MAX_IDENTITY_ROWS_PER_SOURCE
    || usageRows.length > V2_MAX_IDENTITY_ROWS_PER_SOURCE
  );
  const mappedUsageRows = usageRows
    .slice(0, V2_MAX_IDENTITY_ROWS_PER_SOURCE)
    .map(mapMcpUsageEventToEvidenceRow);
  const rows = mergeTelemetryEvidenceRows([
    ...auditRows
      .slice(0, V2_MAX_IDENTITY_ROWS_PER_SOURCE)
      .map(mapAuditRowToEvidenceRow),
    ...mappedUsageRows,
  ]).map((row): SearchEvidenceRow => ({
    ...row,
    environment: classifySearchEvidenceEnvironment(row),
    channel: classifySearchEvidenceChannel(row),
  })).filter((row) => (
    ['search', 'lookup'].includes(dashboardV2SearchHistoryRole(row))
    || (includeDiagnostics && dashboardV2SearchHistoryRole(row) === 'diagnostic')
  ));
  return {
    rows: filterDashboardV2Rows(rows, filters) as SearchEvidenceRow[],
    truncated,
  };
}

async function fetchDashboardV2OverviewRollups(
  adminClient: SupabaseClient,
  filters: ReturnType<typeof parseDashboardV2Filters>,
) {
  const overviewSelect = 'day, channel, environment, query_origin, attempt_count, success_count, true_zero_count, low_result_count, low_result_eligible_count, approximate_low_result_count, error_count, clarification_count, partial_recommendation_count, defect_count, client_days';
  const result = await fetchBoundedDashboardV2Pages(async ({
    from,
    to,
    includeCount,
  }: {
    from: number;
    to: number;
    includeCount: boolean;
  }) => {
    const source = adminClient.from('admin_rollup_overview');
    let query = includeCount
      ? source.select(overviewSelect, { count: 'exact' })
      : source.select(overviewSelect);
    query = query
      .order('day', { ascending: true })
      .order('channel', { ascending: true })
      .order('environment', { ascending: true })
      .order('query_origin', { ascending: true })
      .range(from, to);
    if (filters.from_day) query = query.gte('day', filters.from_day);
    if (filters.to_day) query = query.lte('day', filters.to_day);
    if (!filters.include_test) {
      query = query
        .eq('environment', 'production')
        .neq('channel', 'internal_test');
    }
    if (filters.channel !== 'all') query = query.eq('channel', filters.channel);
    const { data, error, count } = await query;
    if (error) throw error;
    return {
      rows: (data || []) as Array<Record<string, unknown>>,
      total: includeCount ? count : null,
    };
  }, {
    maxRows: V2_MAX_ROLLUP_ROWS,
    pageSize: EVIDENCE_PAGE_SIZE,
    concurrency: V2_ROLLUP_PAGE_CONCURRENCY,
  });
  return {
    rows: result.rows,
    total: result.total,
    truncated: result.total > V2_MAX_ROLLUP_ROWS,
  };
}

async function fetchDashboardV2QueryRollups(
  adminClient: SupabaseClient,
  filters: ReturnType<typeof parseDashboardV2Filters>,
) {
  const querySelect = 'day, query_norm, library_filter, query_origin, channel, environment, tool_name, attempt_count, success_count, true_zero_count, low_result_count, low_result_eligible_count, approximate_low_result_count, error_count, clarification_count, partial_recommendation_count, defect_count, client_days, first_seen, last_seen';
  const result = await fetchBoundedDashboardV2Pages(async ({
    from,
    to,
    includeCount,
  }: {
    from: number;
    to: number;
    includeCount: boolean;
  }) => {
    const source = adminClient.from('admin_rollup_queries');
    let query = includeCount
      ? source.select(querySelect, { count: 'exact' })
      : source.select(querySelect);
    query = query
      .order('day', { ascending: true })
      .order('query_norm', { ascending: true })
      .order('library_filter', { ascending: true })
      .order('query_origin', { ascending: true })
      .order('channel', { ascending: true })
      .order('environment', { ascending: true })
      .order('tool_name', { ascending: true })
      .range(from, to);
    if (filters.from_day) query = query.gte('day', filters.from_day);
    if (filters.to_day) query = query.lte('day', filters.to_day);
    if (!filters.include_test) {
      query = query
        .eq('environment', 'production')
        .neq('channel', 'internal_test');
    }
    if (filters.channel !== 'all') query = query.eq('channel', filters.channel);
    const { data, error, count } = await query;
    if (error) throw error;
    return {
      rows: (data || []) as Array<Record<string, unknown>>,
      total: includeCount ? count : null,
    };
  }, {
    maxRows: V2_MAX_ROLLUP_ROWS,
    pageSize: EVIDENCE_PAGE_SIZE,
    concurrency: V2_ROLLUP_PAGE_CONCURRENCY,
  });
  return {
    rows: result.rows,
    total: result.total,
    truncated: result.total > V2_MAX_ROLLUP_ROWS,
  };
}

async function buildDashboardV2DataRows(
  adminClient: SupabaseClient,
  filters: ReturnType<typeof parseDashboardV2Filters>,
  {
    applyQuery = true,
    includeQueryRows = true,
    separateQueryOrigins = false,
    separateChannels = false,
  } = {},
) {
  const telemetrySettings = await fetchSearchTelemetrySettings(adminClient);
  if (filters.use_raw || telemetrySettings.dashboard_source === 'final') {
    const [telemetry, reviews] = await Promise.all([
      fetchDashboardV2Telemetry(adminClient, filters, { applyQuery }),
      includeQueryRows
        ? fetchAllQueryReviews(adminClient)
        : Promise.resolve({ reviews: new Map(), available: false }),
    ]);
    const telemetryRows = telemetry.rows;
    const rollups = buildAdminRollups(telemetryRows, knownSearchDefects);
    return {
      telemetry_rows: telemetryRows,
      overview_rows: rollups.overview,
      query_rows: includeQueryRows
        ? buildQueryWorkbenchRows(telemetryRows, reviews.reviews, {
          separateQueryOrigins,
          separateChannels,
        })
        : [],
      query_reviews: reviews.reviews,
      query_review_available: includeQueryRows && reviews.available,
      raw_truncated: telemetry.truncated,
      rollup_truncated: false,
    };
  }

  const completedFilters = dashboardV2CompletedRollupFilters(filters);
  const completedRangeExists = dashboardV2RangeHasCompletedDays(completedFilters);
  const telemetryPromise = rangeIncludesCurrentDay(filters)
    ? fetchDashboardV2Telemetry(
      adminClient,
      dashboardV2CurrentDayFilters(filters),
      { applyQuery },
    )
    : Promise.resolve({ rows: [] as SearchEvidenceRow[], truncated: false });
  const [overviewRollups, queryRollups, reviews, telemetry] = await Promise.all([
    completedRangeExists
      ? fetchDashboardV2OverviewRollups(adminClient, completedFilters)
      : Promise.resolve({ rows: [] as Array<Record<string, unknown>>, total: 0, truncated: false }),
    completedRangeExists && includeQueryRows
      ? fetchDashboardV2QueryRollups(adminClient, completedFilters)
      : Promise.resolve({ rows: [] as Array<Record<string, unknown>>, total: 0, truncated: false }),
    includeQueryRows
      ? fetchAllQueryReviews(adminClient)
      : Promise.resolve({ reviews: new Map(), available: false }),
    telemetryPromise,
  ]);
  const telemetryRows = telemetry.rows;
  let completedOverviewRows = overviewRollups.rows;
  let completedQueryRows = queryRollups.rows;
  if (filters.q) {
    completedQueryRows = queryRollups.rows.filter((row: Record<string, unknown>) => (
      [
        row.query_norm,
        row.library_filter,
        row.channel,
        row.query_origin,
        row.tool_name,
      ].filter(Boolean).join(' ').toLowerCase().includes(filters.q)
    ));
    completedOverviewRows = completedQueryRows;
  }
  const todayRows = rangeIncludesCurrentDay(filters)
    ? telemetryRows.filter((row) => String(row.created_at || '').slice(0, 10) === currentUtcDayStartIso().slice(0, 10))
    : [];
  const currentRollups = buildAdminRollups(todayRows, knownSearchDefects);
  const aggregateQueryRows = includeQueryRows
    ? buildQueryWorkbenchRowsFromRollups(
      [...completedQueryRows, ...currentRollups.queries],
      reviews.reviews,
      { separateQueryOrigins, separateChannels },
    )
    : [];
  const currentQueryRows = includeQueryRows
    ? buildQueryWorkbenchRows(todayRows, reviews.reviews, {
      separateQueryOrigins,
      separateChannels,
    })
    : [];
  return {
    telemetry_rows: telemetryRows,
    overview_rows: [...completedOverviewRows, ...currentRollups.overview],
    query_rows: mergeDashboardV2CurrentQueryDetails(aggregateQueryRows, currentQueryRows),
    query_reviews: reviews.reviews,
    query_review_available: includeQueryRows && reviews.available,
    raw_truncated: telemetry.truncated,
    rollup_truncated: overviewRollups.truncated || (includeQueryRows && queryRollups.truncated),
  };
}

function dashboardV2Meta(
  filters: ReturnType<typeof parseDashboardV2Filters>,
  startedAt: number,
  extras: Record<string, unknown> = {},
) {
  return {
    window: filters.key,
    from: filters.from,
    to_exclusive: filters.to_exclusive,
    channel: filters.channel,
    include_test: filters.include_test,
    q: filters.q,
    view_id: filters.view_id,
    data_cutoff: filters.data_cutoff,
    filter_key: filters.filter_key,
    generated_at: new Date().toISOString(),
    generation_ms: Date.now() - startedAt,
    ...extras,
  };
}

function compactDashboardV2ActivityRow(row: Record<string, unknown>) {
  const compact = compactPhaseAActivityRow(row);
  return {
    ...compact,
    client_label: compact.estimated_client_key,
    origin: compact.query_origin,
    venue: compact.channel,
    timestamp: compact.created_at,
  };
}

function channelCountsFromSeries(series: Array<Record<string, unknown>>) {
  const counts: Record<string, number> = { all: 0 };
  for (const row of series) {
    const channel = String(row.channel || '');
    if (!channel || channel === 'all') continue;
    const attempts = Number(row.attempts || 0);
    counts[channel] = Number(counts[channel] || 0) + attempts;
    counts.all += attempts;
  }
  return counts;
}

async function channelCountsWithoutSelectedChannel(
  adminClient: SupabaseClient,
  filters: ReturnType<typeof parseDashboardV2Filters>,
  selectedSeries: Array<Record<string, unknown>>,
) {
  if (filters.channel === 'all') return channelCountsFromSeries(selectedSeries);
  const allChannelRows = await buildDashboardV2DataRows(
    adminClient,
    { ...filters, channel: 'all' },
    {
      applyQuery: true,
      includeQueryRows: false,
      separateQueryOrigins: false,
      separateChannels: false,
    },
  );
  const allChannelSeries = buildDashboardV2Series(
    allChannelRows.overview_rows,
    allChannelRows.telemetry_rows,
  );
  return channelCountsFromSeries(allChannelSeries);
}

async function fetchDashboardV2IconRows(
  adminClient: SupabaseClient,
  filters: ReturnType<typeof parseDashboardV2Filters>,
  signalType: string,
) {
  let query = adminClient
    .from('icon_evidence')
    .select('id, signal_type, search_query, icon_id, result_position, session_hash, evidence_text, created_at')
    .eq('signal_type', signalType)
    .not('icon_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(V2_MAX_ICON_ROWS);
  if (filters.from) query = query.gte('created_at', filters.from);
  if (filters.to_exclusive) query = query.lt('created_at', filters.to_exclusive);
  const { data, error } = await query;
  if (error) {
    if (isMissingRelationError(error) || isMissingColumnError(error)) {
      return { rows: [], available: false, reason: 'Icon action history is not available in this environment.', truncated: false };
    }
    throw error;
  }
  const rows = (data || []) as Array<Record<string, unknown>>;
  const filtered = filters.q
    ? rows.filter((row) => [row.search_query, row.icon_id, row.evidence_text].filter(Boolean).join(' ').toLowerCase().includes(filters.q))
    : rows;
  return {
    rows: filtered,
    available: true,
    reason: '',
    truncated: rows.length >= V2_MAX_ICON_ROWS,
  };
}

async function buildDashboardV2ActivityPayload(
  adminClient: SupabaseClient,
  url: URL,
) {
  const startedAt = Date.now();
  const filters = parseDashboardV2Filters(url);
  const page = parsePositiveInt(url.searchParams.get('page'), 1, 100000);
  const pageSize = parsePositiveInt(
    url.searchParams.get('page_size') || url.searchParams.get('limit'),
    50,
    100,
  );
  const telemetrySettings = await fetchSearchTelemetrySettings(adminClient);
  const telemetry = await fetchDashboardV2Telemetry(adminClient, filters);
  const telemetryRows = telemetry.rows;
  let overviewRows: Array<Record<string, unknown>>;
  if (filters.use_raw || telemetrySettings.dashboard_source === 'final') {
    overviewRows = buildAdminRollups(telemetryRows, knownSearchDefects).overview;
  } else if (filters.q) {
    const completedFilters = dashboardV2CompletedRollupFilters(filters);
    const queryRollups = dashboardV2RangeHasCompletedDays(completedFilters)
      ? await fetchDashboardV2QueryRollups(adminClient, completedFilters)
      : { rows: [] as Array<Record<string, unknown>>, total: 0, truncated: false };
    overviewRows = queryRollups.rows.filter((row: Record<string, unknown>) => (
      [row.query_norm, row.library_filter, row.channel, row.query_origin, row.tool_name]
        .filter(Boolean).join(' ').toLowerCase().includes(filters.q)
    ));
  } else {
    const completedFilters = dashboardV2CompletedRollupFilters(filters);
    const overviewRollups = dashboardV2RangeHasCompletedDays(completedFilters)
      ? await fetchDashboardV2OverviewRollups(adminClient, completedFilters)
      : { rows: [] as Array<Record<string, unknown>>, total: 0, truncated: false };
    overviewRows = overviewRollups.rows;
  }
  if (
    !filters.use_raw
    && telemetrySettings.dashboard_source !== 'final'
    && rangeIncludesCurrentDay(filters)
  ) {
    const today = currentUtcDayStartIso().slice(0, 10);
    const todayRows = telemetryRows.filter((row) => String(row.created_at || '').slice(0, 10) === today);
    overviewRows = [
      ...overviewRows,
      ...buildAdminRollups(todayRows, knownSearchDefects).overview,
    ];
  }
  const series = buildDashboardV2Series(overviewRows, telemetryRows);
  const channelCounts = await channelCountsWithoutSelectedChannel(
    adminClient,
    filters,
    series,
  );
  const sortedRows = telemetryRows
    .sort((left, right) => String(right.created_at || '').localeCompare(String(left.created_at || '')));
  const pageCount = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const start = (currentPage - 1) * pageSize;
  return {
    activity: sortedRows
      .slice(start, start + pageSize)
      .map(compactDashboardV2ActivityRow),
    channel_counts: channelCounts,
    pagination: {
      page: currentPage,
      page_size: pageSize,
      total: sortedRows.length,
      page_count: pageCount,
    },
    meta: dashboardV2Meta(filters, startedAt, {
      metric_scope: 'filtered_search_activity',
      completeness: { raw_rows_complete: !telemetry.truncated },
      row_limit: pageSize,
      raw_row_limit_per_source: V2_MAX_RAW_ROWS_PER_SOURCE,
      raw_rows_truncated: telemetry.truncated,
    }),
  };
}

async function buildDashboardV2OverviewPayload(
  adminClient: SupabaseClient,
  url: URL,
) {
  const startedAt = Date.now();
  const filters = parseDashboardV2Filters(url);
  const [dataRows, identityTelemetry, copySource, returnedSource] = await Promise.all([
    buildDashboardV2DataRows(adminClient, filters),
    filters.key === 'all'
      ? Promise.resolve({ rows: [], total: null, truncated: true, skipped_unbounded: true })
      : fetchDashboardV2IdentityTelemetry(adminClient, filters),
    filters.channel === 'all' || filters.channel === 'web'
      ? fetchDashboardV2IconRows(adminClient, filters, 'copy')
      : Promise.resolve({ rows: [], available: true, reason: '', truncated: false }),
    filters.channel === 'hosted_mcp'
      ? fetchDashboardV2IconRows(adminClient, filters, 'mcp_call')
      : Promise.resolve({ rows: [], available: false, reason: 'Returned-icon coverage is complete only for Hosted MCP. Web searches do not yet record every returned icon.', truncated: false }),
  ]);
  const identityRows = identityTelemetry.truncated ? [] : identityTelemetry.rows;
  const series = buildDashboardV2Series(dataRows.overview_rows, identityRows);
  const kpis = buildDashboardV2Kpis(series, identityRows);
  const topLists = buildDashboardV2TopLists(dataRows.query_rows);
  const geography = identityTelemetry.truncated
    ? {
      available: false,
      reason: filters.key === 'all'
        ? 'Country totals are not available for all recorded history because anonymous identities rotate over time.'
        : 'Exact country totals exceed the bounded identity-row limit for this period. Choose a shorter date range.',
      coverage_rate: 0,
      rows: [],
    }
    : buildDashboardV2Geography(identityRows);
  const copied = copySource.available
    ? {
      available: true,
      coverage: 'web_copy_and_download_events',
      rows: aggregateDashboardV2IconRows(copySource.rows, 'actions'),
      truncated: copySource.truncated,
    }
    : { available: false, reason: copySource.reason, rows: [] };
  const returned = returnedSource.available && !returnedSource.truncated
    ? {
      available: true,
      coverage: 'hosted_mcp_only',
      rows: aggregateDashboardV2IconRows(returnedSource.rows, 'returns'),
    }
    : {
      available: false,
      reason: returnedSource.truncated
        ? 'Returned-icon totals exceed the bounded source limit for this period. Choose a shorter date range.'
        : returnedSource.reason,
      rows: [],
    };
  const outageSpans = (knownSearchDefects.defects || [])
    .filter((defect: Record<string, unknown>) => defect.starts_at && defect.ends_at_inclusive)
    .filter((defect: Record<string, unknown>) => (
      (!filters.from || String(defect.ends_at_inclusive) >= filters.from)
      && (!filters.to_exclusive || String(defect.starts_at) < filters.to_exclusive)
    ))
    .map((defect: Record<string, unknown>) => ({
      id: defect.id,
      label: defect.name,
      from: defect.starts_at,
      to: defect.ends_at_inclusive,
    }));

  return {
    kpis: {
      ...kpis,
      identity_available: !identityTelemetry.truncated,
      identity_unavailable_reason: identityTelemetry.truncated
        ? filters.key === 'all'
          ? 'All-history reach uses daily totals because anonymous searcher counting resets over time.'
          : 'Exact searcher totals exceed the safe row limit for this period. Choose a shorter date range.'
        : null,
    },
    series,
    outage_spans: outageSpans,
    top_lists: {
      searched: dataRows.rollup_truncated
        ? {
          available: false,
          reason: 'Complete query rankings exceed the bounded rollup limit for this period. Choose a shorter date range.',
          rows: [],
        }
        : { available: true, rows: topLists.searched },
      returned,
      copied,
      zero: dataRows.rollup_truncated
        ? {
          available: false,
          reason: 'Complete zero-result rankings exceed the bounded rollup limit for this period. Choose a shorter date range.',
          rows: [],
        }
        : { available: true, rows: topLists.zero },
    },
    geography,
    meta: dashboardV2Meta(filters, startedAt, {
      metric_scope: 'filtered_search_activity',
      completeness: {
        raw_rows_complete: !dataRows.raw_truncated,
        identity_rows_complete: !identityTelemetry.truncated,
        rollup_rows_complete: !dataRows.rollup_truncated,
      },
      raw_row_limit_per_source: V2_MAX_RAW_ROWS_PER_SOURCE,
      raw_rows_truncated: dataRows.raw_truncated,
      identity_row_limit_per_source: V2_MAX_IDENTITY_ROWS_PER_SOURCE,
      identity_rows_truncated: identityTelemetry.truncated,
      identity_rows_skipped_unbounded: filters.key === 'all',
      rollup_rows_truncated: dataRows.rollup_truncated,
      rollup_data_complete: !dataRows.rollup_truncated,
      client_measure: kpis.client_measure,
      query_review_available: dataRows.query_review_available,
      copy_rows_truncated: copySource.truncated,
    }),
  };
}

async function fetchDashboardV2IconRequests(
  adminClient: SupabaseClient,
  filters: ReturnType<typeof parseDashboardV2Filters>,
) {
  if (filters.channel !== 'all' && filters.channel !== 'web') {
    return { available: true, rows: [] };
  }
  let query = adminClient
    .from('icon_evidence')
    .select('id, signal_type, evidence_text, search_query, library_filter, session_hash, domain, ui_surface, result_count, created_at', { count: 'exact' })
    .in('signal_type', [...ICON_REQUEST_SIGNAL_TYPES])
    .in('ui_surface', [...ICON_REQUEST_UI_SURFACES])
    .not('evidence_text', 'is', null)
    .order('created_at', { ascending: false })
    .limit(100);
  if (!filters.include_test) query = query.in('domain', [...getProductionAnalyticsHosts()]);
  if (filters.from) query = query.gte('created_at', filters.from);
  if (filters.to_exclusive) query = query.lt('created_at', filters.to_exclusive);
  const { data, error, count } = await query;
  if (error) {
    if (isMissingRelationError(error) || isMissingColumnError(error)) {
      return { available: false, reason: 'The icon request source is not available in this environment.', rows: [] };
    }
    throw error;
  }
  const sourceRows = ((data || []) as Array<Record<string, unknown>>)
    .filter((row) => String(row.evidence_text || '').trim())
    .map((row) => ({
      id: row.id,
      signal_type: row.signal_type,
      request_text: row.evidence_text,
      failed_query: row.search_query,
      search_query: row.search_query,
      library_filter: row.library_filter || 'all',
      ui_surface: row.ui_surface,
      result_count: optionalNonnegativeInteger(row.result_count),
      visitor_kind: 'anonymous',
      client_label: compactHashPrefix(row.session_hash) || 'Anonymous',
      country_code: null,
      created_at: row.created_at,
    }));
  if (Number(count || 0) > sourceRows.length) {
    return {
      available: false,
      reason: 'Complete icon requests exceed the safe inbox limit. Choose a shorter date range.',
      status_available: false,
      rows: [],
    };
  }
  if (!sourceRows.length) {
    return { available: true, status_available: true, rows: [] };
  }

  const { data: reviewData, error: reviewError } = await adminClient
    .from('admin_icon_request_reviews')
    .select('icon_evidence_id, status, note, updated_at')
    .in('icon_evidence_id', sourceRows.map((row) => row.id));
  if (reviewError && !isMissingRelationError(reviewError)) throw reviewError;
  const reviews = new Map(
    ((reviewData || []) as Array<Record<string, unknown>>)
      .map((row) => [String(row.icon_evidence_id || ''), row]),
  );
  const rows = sourceRows.map((row) => {
    const review = reviews.get(String(row.id || ''));
    return {
      ...row,
      reviewed: Boolean(review),
      status: review?.status || 'new',
      review_note: review?.note || null,
      reviewed_at: review?.updated_at || null,
    };
  }).sort((left, right) => (
    Number(left.reviewed) - Number(right.reviewed)
    || String(right.created_at || '').localeCompare(String(left.created_at || ''))
  ));
  return {
    available: true,
    status_available: !reviewError,
    status_reason: reviewError
      ? 'Request review status is not available until the dashboard review migration is applied.'
      : null,
    rows,
  };
}

async function handleDashboardV2IconRequestReview(
  req: Request,
  adminClient: SupabaseClient,
  body: JsonRecord,
) {
  const iconEvidenceId = String(body.icon_evidence_id || '').trim();
  const status = normalizeSearchQuery(body.status);
  if (!iconEvidenceId) {
    return jsonResponse(req, { error: 'icon_evidence_id is required' }, 400);
  }
  if (!['new', 'planned', 'added', 'declined'].includes(status)) {
    return jsonResponse(req, { error: 'status must be one of: new, planned, added, declined' }, 400);
  }
  const note = typeof body.note === 'string' ? body.note.trim() || null : null;
  const { data: requestRow, error: requestError } = await adminClient
    .from('icon_evidence')
    .select('id')
    .eq('id', iconEvidenceId)
    .in('signal_type', [...ICON_REQUEST_SIGNAL_TYPES])
    .in('ui_surface', [...ICON_REQUEST_UI_SURFACES])
    .maybeSingle();
  if (requestError) throw requestError;
  if (!requestRow) {
    return jsonResponse(req, { error: 'The selected user request was not found.' }, 404);
  }
  const { data, error } = await adminClient
    .from('admin_icon_request_reviews')
    .upsert({
      icon_evidence_id: iconEvidenceId,
      status,
      note,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'icon_evidence_id',
    })
    .select('icon_evidence_id, status, note, updated_at')
    .single();
  if (error) {
    if (isMissingRelationError(error)) {
      return jsonResponse(req, {
        error: 'Request review status is not available until the dashboard review migration is applied.',
      }, 409);
    }
    throw error;
  }
  v2DashboardCache.clear();
  searchEventSnapshotCache.clear();
  return jsonResponse(req, { success: true, review: data });
}

async function fetchDashboardV2Contacts(
  adminClient: SupabaseClient,
  filters: ReturnType<typeof parseDashboardV2Filters>,
) {
  if (filters.channel !== 'all' && filters.channel !== 'web') {
    return { available: true, rows: [] };
  }
  let query = adminClient
    .from('contact_submissions')
    .select('id, name, email, interest, message, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .limit(100);
  if (filters.from) query = query.gte('created_at', filters.from);
  if (filters.to_exclusive) query = query.lt('created_at', filters.to_exclusive);
  const { data, error, count } = await query;
  if (error) {
    if (isMissingRelationError(error) || isMissingColumnError(error)) {
      return { available: false, reason: 'Stored contact submissions are not available in this environment.', rows: [] };
    }
    throw error;
  }
  const rows = (data || []) as Array<Record<string, unknown>>;
  if (Number(count || 0) > rows.length) {
    return {
      available: false,
      reason: 'Complete contact submissions exceed the safe inbox limit. Choose a shorter date range.',
      rows: [],
    };
  }
  const filtered = filters.q && !filters.q.includes(':')
    ? rows.filter((row) => (
      [row.name, row.email, row.interest, row.message]
        .filter(Boolean).join(' ').toLowerCase().includes(filters.q)
    ))
    : rows;
  return { available: true, rows: filtered };
}

function dashboardV2SearchHistoryEventIssue(
  row: Record<string, unknown>,
  event: Record<string, unknown>,
) {
  const queryOrigin = String(event.query_origin || '').toLowerCase();
  const eventOutcome = String(event.outcome || '').toLowerCase();
  if (queryOrigin === 'icon_lookup') {
    if (eventOutcome === 'not_found') return 'not_found';
    if (eventOutcome === 'error') return 'error';
    if (eventOutcome === 'unknown') return 'unknown';
    return 'successful';
  }
  const classification = classifySearchAttempt(row, knownSearchDefects);
  if (classification.is_error) return 'error';
  if (classification.is_clarification) return 'clarification';
  if (classification.is_zero) return 'zero_result';
  if (classification.is_exact_low || classification.is_approximate_low) return 'low_result';
  if (classification.result_count === null) return 'unknown';
  return 'successful';
}

function compactDashboardV2SearchHistoryEventRows(
  rows: Array<Record<string, unknown>>,
) {
  const compactEvents = compactDashboardV2EventRows(rows) as Array<Record<string, unknown>>;
  return compactEvents
    .map((event: Record<string, unknown>, index: number) => {
      const issueType = dashboardV2SearchHistoryEventIssue(rows[index], event);
      const outcome = issueType === 'zero_result'
        ? 'zero'
        : issueType === 'low_result'
          ? 'low'
          : issueType === 'successful'
            ? 'success'
            : issueType;
      const outcomeLabels: Record<string, string> = {
        error: 'Error',
        clarification: 'Clarification',
        low_result: 'Low',
        not_found: 'Not found',
        successful: 'Success',
        unknown: 'Unknown',
        zero_result: 'Zero',
      };
      const resultUnit = event.query_origin === 'icon_lookup'
        ? 'match'
        : event.tool_name === 'recommend_icons'
          ? 'primary_pick'
          : 'icon';
      return {
        ...event,
        outcome,
        issue_type: issueType,
        outcome_label: outcomeLabels[issueType] || 'Unknown',
        activity_count: 1,
        estimated_client_id_count: event.searcher_identifier === 'Unknown searcher' ? 0 : 1,
        tools: event.tool_name ? [event.tool_name] : [],
        channels: event.channel ? [event.channel] : [],
        countries: event.country_code ? [event.country_code] : [],
        locales: event.locale ? [event.locale] : [],
        interface_locales: event.interface_locale ? [event.interface_locale] : [],
        query_origins: event.query_origin ? [event.query_origin] : [],
        visitor_kind: event.searcher_kind,
        result_unit: resultUnit,
        result_count_available: event.result_count !== null,
        typical_result_count: event.result_count,
        first_seen: event.recorded_at,
        last_seen: event.recorded_at,
      };
    })
    .filter((row: Record<string, unknown>) => String(row.query || '').trim());
}

function filterDashboardV2SearchHistoryEventRows(
  rows: Array<Record<string, unknown>>,
  searchValue: string,
  issue = '',
) {
  const parsed = parseDashboardV2QuerySearch(searchValue);
  const parsedFilters = parsed.filters as Record<string, string>;
  return rows.filter((row) => {
    if (parsed.text) {
      const haystack = [
        row.query,
        row.library_filter,
        row.channel,
        row.country_code,
        row.query_origin,
        row.searcher_identifier,
        row.tool_name,
      ].filter(Boolean).join(' ').toLowerCase();
      if (!haystack.includes(parsed.text)) return false;
    }
    const issueType = String(row.issue_type || '');
    if ((issue === 'zero_result' || parsedFilters.zero === 'true') && issueType !== 'zero_result') return false;
    if ((issue === 'low_result' || parsedFilters.low === 'true') && issueType !== 'low_result') return false;
    if (issue === 'error' && issueType !== 'error') return false;
    if (issue === 'clarification' && issueType !== 'clarification') return false;
    if (issue === 'successful' && issueType !== 'successful') return false;
    if (parsedFilters.venue && String(row.channel || '').toLowerCase() !== parsedFilters.venue) return false;
    if (parsedFilters.country && String(row.country_code || '').toLowerCase() !== parsedFilters.country) return false;
    if (parsedFilters.origin) {
      const expected = parsedFilters.origin === 'user' ? 'agent_query' : parsedFilters.origin;
      if (String(row.query_origin || '').toLowerCase() !== expected) return false;
    }
    if (parsedFilters.registered === 'true' && row.registered !== true && row.pro !== true) return false;
    if (parsedFilters.registered === 'false' && (row.registered === true || row.pro === true)) return false;
    return true;
  });
}

async function buildDashboardV2SearchPayload(
  adminClient: SupabaseClient,
  url: URL,
) {
  const startedAt = Date.now();
  const filters = parseDashboardV2Filters(url);
  const issue = normalizeSearchQuery(url.searchParams.get('issue'));
  const page = parsePositiveInt(url.searchParams.get('page'), 1, 100000);
  const pageSize = parsePositiveInt(url.searchParams.get('page_size'), 50, 100);
  const summaryView = String(url.searchParams.get('view') || '').toLowerCase() === 'summary';
  const sort = parseDashboardV2Sort(url, DASHBOARD_V2_SEARCH_SORTS);
  const telemetrySettings = await fetchSearchTelemetrySettings(adminClient);
  const historyTelemetryPromise = filters.use_raw
    ? Promise.resolve(null)
    : fetchDashboardV2IdentityTelemetry(adminClient, { ...filters, q: '' });
  const [dataRows, historyTelemetry, iconRequests, contacts] = await Promise.all([
    buildDashboardV2DataRows(
      adminClient,
      { ...filters, q: '' },
      { applyQuery: false, separateQueryOrigins: true, separateChannels: true },
    ),
    historyTelemetryPromise,
    fetchDashboardV2IconRequests(adminClient, filters),
    fetchDashboardV2Contacts(adminClient, filters),
  ]);
  const historySourceRows = historyTelemetry?.rows || dataRows.telemetry_rows;
  const historyEvidenceRows = historySourceRows.filter((row: Record<string, unknown>) => (
    ['search', 'lookup'].includes(dashboardV2SearchHistoryRole(row))
  ));
  const historySummaryRows = buildQueryWorkbenchRows(
    historyEvidenceRows.map((row) => ({
      ...row,
      job_category: null,
    })),
    dataRows.query_reviews,
    {
      separateQueryOrigins: true,
      separateChannels: false,
      separateSearchers: false,
      includeSearcherDetails: false,
    },
  );
  const compactHistoryEvents = compactDashboardV2SearchHistoryEventRows(historyEvidenceRows);
  const filteredHistoryEvents = filterDashboardV2SearchHistoryEventRows(
    compactHistoryEvents,
    filters.q,
    issue,
  );
  const filteredHistorySummaryRows = filterDashboardV2QueryRows(
    historySummaryRows,
    filters.q,
    issue,
  ) as Array<any>;
  const filteredWorklistRows = filterDashboardV2QueryRows(
    dataRows.query_rows,
    filters.q,
    issue,
  ) as Array<any>;
  const filteredDemandRows = filterDashboardV2QueryRows(
    historySummaryRows,
    filters.q,
    issue,
  ) as Array<any>;
  const sortedSummaryRows = [...filteredHistorySummaryRows].sort((left, right) => (
    String(right.last_seen || '').localeCompare(String(left.last_seen || ''))
    || Number(right.attempt_count || 0) - Number(left.attempt_count || 0)
    || left.query.localeCompare(right.query)
  ));
  const compactSummaryRows = compactDashboardV2QueryRows(sortedSummaryRows)
    .filter((row: Record<string, unknown>) => Number(row.activity_count || 0) > 0);
  const sortedEventRows = [...filteredHistoryEvents].sort((left, right) => (
    String(right.recorded_at || '').localeCompare(String(left.recorded_at || ''))
    || String(right.event_identifier || '').localeCompare(String(left.event_identifier || ''))
  ));
  const visibleRows = summaryView ? compactSummaryRows : sortedEventRows;
  const orderedHistoryRows = sortDashboardV2Rows(
    visibleRows,
    sort,
    DASHBOARD_V2_SEARCH_SORTS,
  );
  const excludedNonActivityRows = historyEvidenceRows.length - compactHistoryEvents.length;
  const historyActivities = filteredHistoryEvents.length;
  const webActivities = filteredHistoryEvents.filter(
    (row: Record<string, unknown>) => String(row.channel || '') === 'web',
  ).length;
  const pageCount = Math.max(1, Math.ceil(orderedHistoryRows.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const start = (currentPage - 1) * pageSize;
  const queries = orderedHistoryRows.slice(start, start + pageSize);
  const historyTruncated = historyTelemetry?.truncated ?? dataRows.raw_truncated;
  const worklist = compactDashboardV2QueryRows(
    filteredDemandRows
      .filter((row) => (
        (
          Number(row.true_zero_count || 0) > 0
          || Number(row.low_result_count || 0) > 0
        )
        && row.review_status !== 'resolved'
        && row.review_status !== 'ignore'
      ))
      .sort((left, right) => (
        (
          Number(right.true_zero_count || 0)
          + Number(right.low_result_count || 0)
        ) - (
          Number(left.true_zero_count || 0)
          + Number(left.low_result_count || 0)
        )
        || Number(right.estimated_unique_clients || 0) - Number(left.estimated_unique_clients || 0)
        || String(right.last_seen || '').localeCompare(String(left.last_seen || ''))
      ))
      .slice(0, 100),
  );
  const worklistUnavailableReason = historyTruncated
    ? 'Complete Gaps details exceed the safe limit for this period. Choose a shorter date range.'
    : null;
  const historyState = buildDashboardV2HistoryState({
    truncated: historyTruncated,
    rowLimit: V2_MAX_IDENTITY_ROWS_PER_SOURCE,
  });

  return {
    summary: {
      attempts: filteredWorklistRows.reduce((sum, row) => sum + Number(row.attempt_count || 0), 0),
      query_groups: filteredWorklistRows.length,
      history_attempts: historyActivities,
      history_rows: filteredHistoryEvents.length,
      table_rows: filteredHistoryEvents.length,
      summary_rows: compactSummaryRows.length,
      activities: historyActivities,
      requests: historyActivities,
      mcp_activities: Math.max(0, historyActivities - webActivities),
      web_activities: webActivities,
      excluded_non_activity_rows: excludedNonActivityRows,
    },
    queries,
    ...historyState,
    pagination: {
      page: currentPage,
      page_size: pageSize,
      total: orderedHistoryRows.length,
      page_count: pageCount,
      sort_by: sort?.key || null,
      sort_direction: sort?.direction || null,
    },
    worklist: worklistUnavailableReason ? [] : worklist,
    worklist_available: !worklistUnavailableReason,
    worklist_unavailable_reason: worklistUnavailableReason,
    icon_requests: iconRequests,
    contact_submissions: contacts,
    coverage: buildFinalOutcomeCoverage(telemetrySettings, filters),
    diagnostics: {
      known_defects: (knownSearchDefects.defects || []).map((defect: Record<string, unknown>) => ({
        id: defect.id,
        name: defect.name,
        classification: defect.classification,
        starts_at: defect.starts_at,
        ends_at_inclusive: defect.ends_at_inclusive,
      })),
      query_review_available: dataRows.query_review_available,
      final_outcome_source: telemetrySettings.dashboard_source,
      web_final_outcome_cutover_at: telemetrySettings.web_final_outcome_cutover_at,
      local_mcp_coverage_cutover_at: telemetrySettings.local_mcp_coverage_cutover_at,
      raw_rows_truncated: dataRows.raw_truncated,
      history_rows_truncated: historyTruncated,
      rollup_rows_truncated: dataRows.rollup_truncated,
      raw_access: 'Use the bounded admin API exports for detail.',
      query_row_grain: summaryView
        ? ['query', 'library_filter', 'query_origin']
        : ['recorded_search_event'],
      search_summary_row_grain: ['query', 'library_filter', 'query_origin'],
      activity_measure: 'Recorded top-level searches and exact icon lookups.',
      result_measure: summaryView
        ? 'Median recorded result count. Unavailable when a summary mixes incompatible result units.'
        : 'Exact result count recorded for this search event.',
      estimated_client_id_measure: 'Estimated client ID recorded for this search event. IDs may split or combine people.',
    },
    meta: dashboardV2Meta(filters, startedAt, {
      metric_scope: summaryView
        ? 'filtered_search_summary'
        : 'filtered_search_events',
      completeness: {
        raw_rows_complete: !dataRows.raw_truncated,
        rollup_rows_complete: !dataRows.rollup_truncated,
      },
      raw_row_limit_per_source: V2_MAX_RAW_ROWS_PER_SOURCE,
      raw_rows_truncated: dataRows.raw_truncated,
      rollup_rows_truncated: dataRows.rollup_truncated,
      rollup_data_complete: !dataRows.rollup_truncated,
      query_review_available: dataRows.query_review_available,
    }),
  };
}

function dashboardV2FieldCoverage(
  rows: Array<Record<string, unknown>>,
  predicate: (row: Record<string, unknown>) => boolean,
) {
  if (!rows.length) return { recorded: 0, total: 0, rate: null };
  const recorded = rows.filter(predicate).length;
  return {
    recorded,
    total: rows.length,
    rate: Number((recorded / rows.length).toFixed(4)),
  };
}

async function privacySafeRootRequestPrefix(row: Record<string, unknown>) {
  const requestId = String(row.request_id || row.batch_id || '').trim();
  if (!requestId) return null;
  const identity = String(
    row.session_hash
    || row.api_key_hash
    || row.anonymous_client_hash
    || row.ip_hash
    || 'unattributed',
  ).trim();
  const bytes = new TextEncoder().encode(`${identity}|${requestId}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)]
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 12);
}

async function addPrivacySafeRootRequestPrefixes(
  rows: Array<Record<string, unknown>>,
): Promise<Array<Record<string, unknown>>> {
  return await Promise.all(rows.map(async (row): Promise<Record<string, unknown>> => ({
    ...row,
    root_request_hash_prefix: await privacySafeRootRequestPrefix(row)
      || (typeof row.root_request_hash_prefix === 'string' ? row.root_request_hash_prefix : null),
  })));
}

async function buildDashboardV2SearchEventsPayload(
  adminClient: SupabaseClient,
  url: URL,
) {
  const startedAt = Date.now();
  const filters = parseDashboardV2Filters(url);
  const telemetrySettings = await fetchSearchTelemetrySettings(adminClient);
  const coverage = buildFinalOutcomeCoverage(telemetrySettings, filters);
  const eventScope = String(url.searchParams.get('event_scope') || 'primary').trim().toLowerCase();
  if (!['primary', 'audit'].includes(eventScope)) {
    throw new Error('The search event scope is invalid.');
  }
  const page = parsePositiveInt(url.searchParams.get('page'), 1, 100000);
  const pageSize = parsePositiveInt(url.searchParams.get('page_size'), 50, 100);
  const snapshotKey = buildSearchEventSnapshotCacheKey(url, filters);
  const snapshotId = await buildSearchEventSnapshotId(snapshotKey);
  const snapshot = await searchEventSnapshotCache.getOrCreate(snapshotKey, async () => {
    const snapshotStartedAt = Date.now();
    const telemetry = await fetchDashboardV2IdentityTelemetry(
      adminClient,
      filters,
      { includeDiagnostics: true },
    );
    const sourceReconciliation = 'source_reconciliation' in telemetry
      ? telemetry.source_reconciliation
      : {
        schema_version: 1,
        status: 'not_available',
        reason: 'Source-backed reconciliation requires the final-outcome source.',
      };
    const linkedRows = await addPrivacySafeRootRequestPrefixes(telemetry.rows);
    const sortedRows = [...linkedRows].sort((left, right) => (
      String(right.created_at || '').localeCompare(String(left.created_at || ''))
      || String(right.id || '').localeCompare(String(left.id || ''))
    ));
    const compactEvents = compactDashboardV2EventRows(sortedRows);
    const roleCounts = compactEvents.reduce((
      counts: Record<string, number>,
      event: Record<string, unknown>,
    ) => {
      const role = String(event.event_role || 'top_level');
      counts[role] = Number(counts[role] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);
    return {
      id: snapshotId,
      generated_at: new Date().toISOString(),
      generation_ms: Date.now() - snapshotStartedAt,
      events: eventScope === 'audit'
        ? compactEvents
        : compactEvents.filter((event: Record<string, unknown>) => event.event_role === 'top_level'),
      event_counts: {
        top_level: Number(roleCounts.top_level || 0),
        web_top_level: Number(roleCounts.web_top_level || 0),
        diagnostics: Number(roleCounts.diagnostic || 0),
      },
      complete: !telemetry.truncated,
      field_coverage: {
        locale: dashboardV2FieldCoverage(sortedRows, (row) => Boolean(row.locale)),
        interface_locale: dashboardV2FieldCoverage(sortedRows, (row) => Boolean(row.interface_locale)),
        country_code: dashboardV2FieldCoverage(sortedRows, (row) => Boolean(row.country_code)),
        root_request_identifier: dashboardV2FieldCoverage(sortedRows, (row) => Boolean(row.root_request_hash_prefix)),
        returned_icon_refs: dashboardV2FieldCoverage(sortedRows, (row) => row.returned_icon_refs_recorded === true),
        latency_ms: dashboardV2FieldCoverage(sortedRows, (row) => row.latency_ms !== null && row.latency_ms !== undefined),
        server_version: dashboardV2FieldCoverage(sortedRows, (row) => Boolean(row.mcp_server_version)),
        server_build: dashboardV2FieldCoverage(sortedRows, (row) => Boolean(row.server_build)),
      },
      source_reconciliation: sourceReconciliation,
    };
  });
  const requestedSnapshotId = String(url.searchParams.get('snapshot_id') || '').trim();
  const snapshotMatchesRequest = !requestedSnapshotId || requestedSnapshotId === snapshot.id;
  const complete = snapshot.complete === true;
  const exportAvailable = complete && snapshotMatchesRequest;
  const pageCount = Math.max(1, Math.ceil(snapshot.events.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const start = (currentPage - 1) * pageSize;
  const events = snapshot.events.slice(start, start + pageSize);

  return {
    events,
    events_complete: complete,
    events_export_available: exportAvailable,
    events_notice: !complete
      ? `Showing the newest event details. This view can load up to ${V2_MAX_IDENTITY_ROWS_PER_SOURCE.toLocaleString('en-US')} records from each search log. Older matching events may be omitted.`
      : snapshotMatchesRequest
        ? null
        : 'The export snapshot expired while pages were loading. Start the export again.',
    events_export_unavailable_reason: !complete
      ? `Complete event export exceeds the ${V2_MAX_IDENTITY_ROWS_PER_SOURCE.toLocaleString('en-US')}-record limit for each search log. Choose a narrower date range or venue before exporting.`
      : snapshotMatchesRequest
        ? null
        : 'The export snapshot expired while pages were loading. Start the export again.',
    snapshot_id: snapshot.id,
    event_scope: eventScope,
    event_counts: snapshot.event_counts,
    source_reconciliation: snapshot.source_reconciliation,
    pagination: {
      page: currentPage,
      page_size: pageSize,
      total: snapshot.events.length,
      page_count: pageCount,
    },
    field_coverage: snapshot.field_coverage,
    definitions: {
      grain: eventScope === 'primary'
        ? 'One final top-level search outcome per row. Internal search work is excluded.'
        : 'One final top-level search outcome or linked diagnostic per row. The event_role field keeps them separate.',
      primary_metric_source: 'Final search outcomes are the product metric source. Search request audit rows and website episode diagnostics are supporting detail only.',
      search_zero: 'A user-facing search or final recommendation completed with zero returned results.',
      lookup_not_found: 'An exact lookup completed without an icon or returned the icon_not_found code.',
      lookup_error: 'An exact lookup failed for a reason other than icon_not_found.',
      traffic_class: 'Recorded test, preview, local, named cohort, or unclassified live traffic. Unclassified live traffic is not assumed to be organic.',
      null_values: 'Null means the field was not recorded for that event. Null is never converted to zero.',
    },
    meta: dashboardV2Meta(filters, startedAt, {
      metric_scope: 'filtered_search_event_details',
      event_scope: eventScope,
      completeness: {
        event_rows_complete: complete,
      },
      event_row_limit_per_source: V2_MAX_IDENTITY_ROWS_PER_SOURCE,
      event_rows_truncated: !complete,
      raw_identifiers_exposed: false,
      final_outcome_source: telemetrySettings.dashboard_source,
      web_final_outcome_cutover_at: telemetrySettings.web_final_outcome_cutover_at,
      local_mcp_coverage_cutover_at: telemetrySettings.local_mcp_coverage_cutover_at,
      coverage_warnings: coverage.warnings,
      snapshot_id: snapshot.id,
      snapshot_matches_request: snapshotMatchesRequest,
      snapshot_generated_at: snapshot.generated_at,
      snapshot_generation_ms: snapshot.generation_ms,
      snapshot_ttl_ms: SEARCH_EVENT_SNAPSHOT_CACHE_TTL_MS,
      source_reconciliation_status: snapshot.source_reconciliation?.status || 'not_available',
    }),
  };
}

function buildDashboardV2UserTelemetry(rows: Array<Record<string, unknown>>) {
  const byUser = new Map<string, {
    searches: number;
    channels: Set<string>;
    countries: Map<string, number>;
    last_active: string | null;
  }>();
  for (const row of rows) {
    const userId = String(row.user_id || '');
    if (!userId) continue;
    const entry = byUser.get(userId) || {
      searches: 0,
      channels: new Set<string>(),
      countries: new Map<string, number>(),
      last_active: null,
    };
    entry.searches += 1;
    const channel = String(row.channel || 'unknown');
    entry.channels.add(channel);
    const country = normalizeAuditCountry(row.country_code) || 'Unknown';
    entry.countries.set(country, Number(entry.countries.get(country) || 0) + 1);
    if (!entry.last_active || String(row.created_at || '') > entry.last_active) {
      entry.last_active = row.created_at ? String(row.created_at) : null;
    }
    byUser.set(userId, entry);
  }
  return byUser;
}

async function buildDashboardV2AudiencePayload(
  adminClient: SupabaseClient,
  url: URL,
) {
  const startedAt = Date.now();
  const filters = parseDashboardV2Filters(url);
  const page = parsePositiveInt(url.searchParams.get('page'), 1, 100000);
  const pageSize = parsePositiveInt(url.searchParams.get('page_size'), 50, 100);
  const sort = parseDashboardV2Sort(url, DASHBOARD_V2_CLIENT_SORTS);
  const [dataRows, identityTelemetry, authUsers] = await Promise.all([
    buildDashboardV2DataRows(
      adminClient,
      filters,
      { includeQueryRows: false },
    ),
    filters.key === 'all'
      ? Promise.resolve({ rows: [], total: null, truncated: true, skipped_unbounded: true })
      : fetchDashboardV2IdentityTelemetry(adminClient, filters),
    listAllAuthUsers(adminClient),
  ]);
  const identityRows = identityTelemetry.truncated ? [] : identityTelemetry.rows;
  const series = buildDashboardV2Series(dataRows.overview_rows, identityRows);
  const clientRows = buildDashboardV2Clients(identityRows) as Array<any>;
  const userTelemetry = buildDashboardV2UserTelemetry(identityRows);
  const { users } = authUsers;
  const subscriptions = await fetchSubscriptions(adminClient, users.map((user) => user.id));
  const registeredUsers = users
    .map((user) => {
      const subscription = (subscriptions.get(user.id) || {}) as Record<string, unknown>;
      const telemetry = userTelemetry.get(user.id);
      const countries = telemetry
        ? [...telemetry.countries.entries()].sort((left, right) => right[1] - left[1])
        : [];
      return {
        user_id: user.id,
        identifier: maskDashboardV2Identifier(user.email || user.id),
        provider: formatProviderLabel(user),
        plan: subscription.plan || 'Free',
        signup_at: user.created_at || null,
        last_search: telemetry?.last_active || null,
        last_active: telemetry?.last_active || null,
        searches: telemetry?.searches || 0,
        venues: telemetry ? [...telemetry.channels].sort() : [],
        country_code: countries[0]?.[0] || null,
        activity_linked: Boolean(telemetry),
        activity_matches_filter: Boolean(telemetry),
      };
    })
    .filter((row) => {
      if (!filters.q) return true;
      return row.activity_matches_filter || [row.identifier, row.provider, row.plan, row.country_code, ...row.venues]
        .filter(Boolean).join(' ').toLowerCase().includes(filters.q);
    })
    .sort((left, right) => (
      String(right.last_search || '').localeCompare(String(left.last_search || ''))
      || String(right.signup_at || '').localeCompare(String(left.signup_at || ''))
    ));
  const filteredClients = clientRows.filter((row) => {
    if (!filters.q) return true;
    return [
      row.client_key,
      row.visitor_kind,
      row.plan,
      row.country_code,
      row.top_query,
    ].filter(Boolean).join(' ').toLowerCase().includes(filters.q);
  });
  const orderedClients = sortDashboardV2Rows(
    filteredClients,
    sort,
    DASHBOARD_V2_CLIENT_SORTS,
  );
  const dataUnavailable = identityTelemetry.truncated;
  const fallbackKpis = buildDashboardV2Kpis(series, identityRows);
  const uniqueClients = dataUnavailable
    ? Number(fallbackKpis.estimated_unique_clients || 0)
    : clientRows.length;
  const registeredClients = dataUnavailable
    ? users.length
    : clientRows.filter((row) => row.is_registered).length;
  const proClients = dataUnavailable
    ? users.filter((user) => String(
      (subscriptions.get(user.id) as Record<string, unknown> | undefined)?.plan || '',
    ).toLowerCase().includes('pro')).length
    : clientRows.filter((row) => row.is_pro).length;
  const pageCount = Math.max(1, Math.ceil(orderedClients.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageStart = (currentPage - 1) * pageSize;
  const unavailableReason = 'Searcher details exceed the safe row limit for this period. Choose a shorter date range.';

  return {
    funnel: {
      unique_clients: uniqueClients,
      registered_clients: registeredClients,
      registered_percentage: dataUnavailable
        ? null
        : uniqueClients ? registeredClients / uniqueClients : 0,
      pro_clients: proClients,
      pro_percentage: dataUnavailable
        ? null
        : uniqueClients ? proClients / uniqueClients : 0,
      client_measure: dataUnavailable ? 'client_days' : 'estimated_unique_clients',
      registered_measure: dataUnavailable ? 'all_registered_accounts' : 'active_registered_clients',
      pro_measure: dataUnavailable ? 'all_pro_accounts' : 'active_pro_clients',
      identity_available: !dataUnavailable,
      identity_unavailable_reason: dataUnavailable ? unavailableReason : null,
      mrr: {
        available: false,
        reason: 'Exact billing price is not linked to every active subscription.',
      },
    },
    registered_users: {
      available: true,
      total: users.length,
      rows: registeredUsers.slice(0, 100),
      activity_window: filters.key,
    },
    clients: dataUnavailable
      ? { available: false, reason: unavailableReason, rows: [] }
      : { available: true, rows: orderedClients.slice(pageStart, pageStart + pageSize) },
    series,
    pagination: {
      page: currentPage,
      page_size: pageSize,
      total: orderedClients.length,
      page_count: pageCount,
      sort_by: sort?.key || null,
      sort_direction: sort?.direction || null,
    },
    meta: dashboardV2Meta(filters, startedAt, {
      metric_scope: 'filtered_search_activity_and_all_time_accounts',
      completeness: {
        raw_rows_complete: !dataRows.raw_truncated,
        identity_rows_complete: !identityTelemetry.truncated,
        rollup_rows_complete: !dataRows.rollup_truncated,
        account_inventory_complete: true,
      },
      raw_row_limit_per_source: V2_MAX_RAW_ROWS_PER_SOURCE,
      raw_rows_truncated: dataRows.raw_truncated,
      identity_row_limit_per_source: V2_MAX_IDENTITY_ROWS_PER_SOURCE,
      identity_rows_truncated: identityTelemetry.truncated,
      identity_rows_skipped_unbounded: filters.key === 'all',
      rollup_rows_truncated: dataRows.rollup_truncated,
      audience_series_measure: dataUnavailable ? 'client_days' : 'registered_and_pro_clients',
      anonymous_identity_rotates_monthly: true,
      mrr_available: false,
    }),
  };
}

function isDashboardV2ValidationError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.startsWith('Choose both custom dates')
    || message.startsWith('The custom start date')
    || message.startsWith('Custom date ranges cannot exceed')
    || message.startsWith('The dashboard data cutoff')
    || message.startsWith('The dashboard view marker')
    || message.startsWith('The dashboard filter marker')
    || message.startsWith('The search event scope')
    || message.startsWith('The dashboard sort')
  );
}

async function handleDashboardV2(
  req: Request,
  adminClient: SupabaseClient,
  url: URL,
  endpoint: string,
) {
  try {
    const key = buildDashboardV2CacheKey(endpoint, url);
    const payload = await v2DashboardCache.getOrCreate(key, async () => {
      if (endpoint === 'activity') return await buildDashboardV2ActivityPayload(adminClient, url);
      if (endpoint === 'overview') return await buildDashboardV2OverviewPayload(adminClient, url);
      if (endpoint === 'search') return await buildDashboardV2SearchPayload(adminClient, url);
      if (endpoint === 'search-events') return await buildDashboardV2SearchEventsPayload(adminClient, url);
      if (endpoint === 'audience') return await buildDashboardV2AudiencePayload(adminClient, url);
      throw new Error('Unknown dashboard v2 endpoint.');
    });
    return jsonResponse(req, payload);
  } catch (error) {
    if (isDashboardV2ValidationError(error)) {
      return jsonResponse(req, { error: error instanceof Error ? error.message : String(error) }, 400);
    }
    throw error;
  }
}

async function handlePhaseARollupRefresh(req: Request, adminClient: SupabaseClient) {
  const payload = await ensureCompletedDayRollups(adminClient);
  queryQueueCache.clear();
  v2DashboardCache.clear();
  searchEventSnapshotCache.clear();
  return jsonResponse(req, payload);
}

function updateSeenRange(entry: Record<string, unknown>, createdAt: string | null) {
  if (!createdAt) return;
  const firstSeen = typeof entry.first_seen === 'string' ? entry.first_seen : null;
  const lastSeen = typeof entry.last_seen === 'string' ? entry.last_seen : null;
  if (!firstSeen || createdAt < firstSeen) entry.first_seen = createdAt;
  if (!lastSeen || createdAt > lastSeen) entry.last_seen = createdAt;
}

function queryResultUnit(row: Record<string, unknown>) {
  const queryOrigin = normalizeSearchQuery(row.query_origin).toLowerCase();
  const toolName = normalizeSearchQuery(row.tool_name).toLowerCase();
  if (queryOrigin === 'icon_lookup' || toolName === 'get_icon') return 'match';
  if (toolName === 'recommend_icons') return 'primary_pick';
  return 'icon';
}

function recordQueryResultCount(entry: Record<string, unknown>, resultCount: number) {
  entry.total_result_count = Number(entry.total_result_count || 0) + resultCount;
  entry.result_samples = Number(entry.result_samples || 0) + 1;
  const currentMinimum = typeof entry.minimum_result_count === 'number' ? entry.minimum_result_count : null;
  if (currentMinimum === null || resultCount < currentMinimum) {
    entry.minimum_result_count = resultCount;
  }
  const currentMaximum = typeof entry.maximum_result_count === 'number' ? entry.maximum_result_count : null;
  if (currentMaximum === null || resultCount > currentMaximum) {
    entry.maximum_result_count = resultCount;
  }
  const frequency = entry.result_count_frequency as Map<number, number>;
  frequency.set(resultCount, Number(frequency.get(resultCount) || 0) + 1);
}

function medianQueryResultCount(frequency: Map<number, number>) {
  const ordered = [...frequency.entries()]
    .sort(([left], [right]) => left - right);
  const sampleCount = ordered.reduce((sum, [, count]) => sum + count, 0);
  if (!sampleCount) return null;
  const lowerTarget = Math.floor((sampleCount - 1) / 2);
  const upperTarget = Math.floor(sampleCount / 2);
  let seen = 0;
  let lower: number | null = null;
  let upper: number | null = null;
  for (const [value, count] of ordered) {
    const nextSeen = seen + count;
    if (lower === null && lowerTarget < nextSeen) lower = value;
    if (upperTarget < nextSeen) {
      upper = value;
      break;
    }
    seen = nextSeen;
  }
  if (lower === null || upper === null) return null;
  return Number(((lower + upper) / 2).toFixed(2));
}

function getQueryWorkbenchEntry(
  map: Map<string, Record<string, unknown>>,
  query: string,
  libraryFilter: unknown,
  jobCategory: unknown,
  queryOrigin: unknown,
  separateQueryOrigins = false,
  channel: unknown = null,
  separateChannels = false,
  searcherKey: unknown = null,
  separateSearchers = false,
) {
  const normalizedQuery = normalizeSearchQuery(query);
  const normalizedLibrary = normalizeReviewLibraryFilter(libraryFilter);
  const normalizedJobCategory = normalizeReviewJobCategory(jobCategory);
  const normalizedQueryOrigin = normalizeSearchQuery(queryOrigin) || 'legacy_unknown';
  const key = separateQueryOrigins || separateChannels || separateSearchers
    ? buildQueryWorkbenchGroupKey({
      query: normalizedQuery,
      libraryFilter: normalizedLibrary,
      jobCategory: normalizedJobCategory,
      queryOrigin: separateQueryOrigins ? normalizedQueryOrigin : 'all',
      channel: separateChannels ? channel : 'all',
      searcherKey: separateSearchers ? searcherKey : 'all',
    })
    : buildQueryReviewContextKey({
      query: normalizedQuery,
      libraryFilter: normalizedLibrary,
      jobCategory: normalizedJobCategory,
    });
  const existing = map.get(key);
  if (existing) return existing;

  const entry: Record<string, unknown> = {
    query: normalizedQuery,
    library_filter: normalizedLibrary,
    job_category: normalizedJobCategory,
    attempt_count: 0,
    zero_attempt_count: 0,
    low_attempt_count: 0,
    low_result_eligible_count: 0,
    approximate_low_attempt_count: 0,
    clarification_attempt_count: 0,
    error_attempt_count: 0,
    defect_attempt_count: 0,
    partial_recommendation_count: 0,
    total_result_count: 0,
    result_samples: 0,
    result_count_frequency: new Map<number, number>(),
    result_units: new Set<string>(),
    minimum_result_count: null,
    maximum_result_count: null,
    replacement_count: 0,
    unique_replacements: new Set<string>(),
    successful_attempt_count: 0,
    successful_signal_count: 0,
    copy_count: 0,
    favorite_count: 0,
    unique_icons: new Set<string>(),
    mcp_batch_ids: new Set<string>(),
    mcp_converged_batch_ids: new Set<string>(),
    mcp_result_rows: 0,
    lookup_success_count: 0,
    lookup_not_found_count: 0,
    lookup_error_count: 0,
    lookup_unknown_count: 0,
    surfaces: new Set<string>(),
    domains: new Set<string>(),
    context_urls: new Set<string>(),
    session_hashes: new Set<string>(),
    ip_hash_prefixes: new Set<string>(),
    api_key_hash_prefixes: new Set<string>(),
    estimated_client_keys: new Set<string>(),
    searcher_details: new Map<string, Record<string, unknown>>(),
    visitor_kinds: new Set<string>(),
    countries: new Set<string>(),
    registered_user_ids: new Set<string>(),
    pro_user_ids: new Set<string>(),
    account_plans: new Set<string>(),
    subscription_statuses: new Set<string>(),
    audit_sources: new Set<string>(),
    environments: new Set<string>(),
    channels: new Set<string>(),
    client_families: new Set<string>(),
    tools: new Set<string>(),
    mcp_versions: new Set<string>(),
    locales: new Set<string>(),
    interface_locales: new Set<string>(),
    library_modes: new Set<string>(),
    search_outcomes: new Set<string>(),
    confidence_labels: new Set<string>(),
    beta_cohorts: new Set<string>(),
    query_origins: new Set<string>([normalizedQueryOrigin]),
    locale_attempt_counts: {} as Record<string, number>,
    first_seen: null,
    last_seen: null,
  };
  map.set(key, entry);
  return entry;
}

function buildQueryWorkbenchRows(
  evidenceRows: Array<Record<string, unknown>>,
  reviews: Map<string, QueryReviewRow>,
  {
    separateQueryOrigins = false,
    separateChannels = false,
    separateSearchers = false,
    includeSearcherDetails = true,
  } = {},
) {
  const map = new Map<string, Record<string, unknown>>();

  for (const row of evidenceRows) {
    const normalizedQuery = normalizeSearchQuery(row.search_query);
    if (!normalizedQuery) continue;

    const signalType = String(row.signal_type || '').toLowerCase();
    const createdAt = typeof row.created_at === 'string' ? row.created_at : null;
    const libraryFilter = row.library_filter;
    const jobCategory = row.job_category;
    const rowChannel = classifySearchEvidenceChannel(row);
    const recordedSearcherKey = typeof row._estimated_client_key === 'string'
      ? row._estimated_client_key.trim()
      : '';
    const fallbackSearcherKey = [
      'unknown',
      row.source_table,
      row.source_row_id,
      row.request_id,
      row.dedupe_key,
      row.created_at,
    ].filter(Boolean).join(':');
    const groupedSearcherKey = recordedSearcherKey || fallbackSearcherKey || 'unknown';
    const entry = getQueryWorkbenchEntry(
      map,
      normalizedQuery,
      libraryFilter,
      jobCategory,
      row.query_origin,
      separateQueryOrigins,
      rowChannel,
      separateChannels,
      groupedSearcherKey,
      separateSearchers,
    );
    updateSeenRange(entry, createdAt);
    (entry.environments as Set<string>).add(classifySearchEvidenceEnvironment(row));
    (entry.channels as Set<string>).add(rowChannel);
    (entry.query_origins as Set<string>).add(String(row.query_origin || 'legacy_unknown'));

    if (recordedSearcherKey) {
      (entry.estimated_client_keys as Set<string>).add(groupedSearcherKey);
    }
    if (includeSearcherDetails && (recordedSearcherKey || separateSearchers)) {
      const searcherKey = groupedSearcherKey;
      const details = entry.searcher_details as Map<string, Record<string, unknown>>;
      const searcher = details.get(searcherKey) || {
        label: recordedSearcherKey && typeof row.estimated_client_key === 'string' && row.estimated_client_key.trim()
          ? row.estimated_client_key.trim()
          : 'Unknown searcher',
        kind: typeof row.visitor_kind === 'string' ? row.visitor_kind : 'anonymous',
        account_linked: Boolean(row.user_id),
        searches: 0,
        channels: new Set<string>(),
        countries: new Set<string>(),
        first_seen: createdAt,
        last_seen: createdAt,
      };
      (searcher.channels as Set<string>).add(rowChannel);
      const searcherCountry = normalizeAuditCountry(row.country_code);
      if (searcherCountry) (searcher.countries as Set<string>).add(searcherCountry);
      if (!searcher.first_seen || (createdAt && createdAt < String(searcher.first_seen))) searcher.first_seen = createdAt;
      if (!searcher.last_seen || (createdAt && createdAt > String(searcher.last_seen))) searcher.last_seen = createdAt;
      details.set(searcherKey, searcher);
    }
    if (typeof row.visitor_kind === 'string' && row.visitor_kind.trim()) {
      (entry.visitor_kinds as Set<string>).add(row.visitor_kind.trim());
    }

    if (typeof row.ui_surface === 'string' && row.ui_surface.trim()) {
      (entry.surfaces as Set<string>).add(row.ui_surface.trim());
    }
    if (typeof row.domain === 'string' && row.domain.trim()) {
      (entry.domains as Set<string>).add(row.domain.trim());
    }
    if (typeof row.context_url === 'string' && row.context_url.trim()) {
      (entry.context_urls as Set<string>).add(row.context_url.trim());
    }
    if (typeof row.session_hash === 'string' && row.session_hash.trim()) {
      (entry.session_hashes as Set<string>).add(row.session_hash.trim());
    }
    if (typeof row.ip_hash_prefix === 'string' && row.ip_hash_prefix.trim()) {
      (entry.ip_hash_prefixes as Set<string>).add(row.ip_hash_prefix.trim());
    }
    if (typeof row.api_key_hash_prefix === 'string' && row.api_key_hash_prefix.trim()) {
      (entry.api_key_hash_prefixes as Set<string>).add(row.api_key_hash_prefix.trim());
    }
    const countryCode = normalizeAuditCountry(row.country_code);
    if (countryCode) {
      (entry.countries as Set<string>).add(countryCode);
    }
    if (typeof row.user_id === 'string' && row.user_id.trim()) {
      (entry.registered_user_ids as Set<string>).add(row.user_id.trim());
      if (row.is_pro === true) {
        (entry.pro_user_ids as Set<string>).add(row.user_id.trim());
      }
    }
    if (typeof row.account_plan === 'string' && row.account_plan.trim()) {
      (entry.account_plans as Set<string>).add(row.account_plan.trim());
    }
    if (typeof row.subscription_status === 'string' && row.subscription_status.trim()) {
      (entry.subscription_statuses as Set<string>).add(row.subscription_status.trim());
    }
    if (typeof row.source_table === 'string' && row.source_table.trim()) {
      (entry.audit_sources as Set<string>).add(row.source_table.trim());
    }
    if (typeof row.client_family === 'string' && row.client_family.trim()) {
      (entry.client_families as Set<string>).add(row.client_family.trim());
    }
    if (typeof row.tool_name === 'string' && row.tool_name.trim()) {
      (entry.tools as Set<string>).add(row.tool_name.trim());
    }
    if (typeof row.mcp_server_version === 'string' && row.mcp_server_version.trim()) {
      (entry.mcp_versions as Set<string>).add(row.mcp_server_version.trim());
    }
    if (typeof row.locale === 'string' && row.locale.trim()) {
      (entry.locales as Set<string>).add(row.locale.trim());
    }
    if (typeof row.interface_locale === 'string' && row.interface_locale.trim()) {
      (entry.interface_locales as Set<string>).add(row.interface_locale.trim());
    }
    if (typeof row.library_mode === 'string' && row.library_mode.trim()) {
      (entry.library_modes as Set<string>).add(row.library_mode.trim());
    }
    if (typeof row.search_outcome === 'string' && row.search_outcome.trim()) {
      (entry.search_outcomes as Set<string>).add(row.search_outcome.trim());
    }
    if (typeof row.confidence_label === 'string' && row.confidence_label.trim()) {
      (entry.confidence_labels as Set<string>).add(row.confidence_label.trim());
    }
    if (typeof row.beta_cohort === 'string' && row.beta_cohort.trim()) {
      (entry.beta_cohorts as Set<string>).add(row.beta_cohort.trim());
    }

    if (signalType === 'search_attempt') {
      entry.attempt_count = Number(entry.attempt_count || 0) + 1;
      const searcher = (entry.searcher_details as Map<string, Record<string, unknown>>)
        .get(groupedSearcherKey);
      if (searcher) searcher.searches = Number(searcher.searches || 0) + 1;
      const localeKey = typeof row.locale === 'string' && row.locale.trim()
        ? row.locale.trim()
        : '(missing)';
      const localeAttemptCounts = entry.locale_attempt_counts as Record<string, number>;
      localeAttemptCounts[localeKey] = Number(localeAttemptCounts[localeKey] || 0) + 1;
      const classification = classifySearchAttempt(row, knownSearchDefects);
      if (classification.is_partial_recommendation) {
        entry.partial_recommendation_count = Number(entry.partial_recommendation_count || 0) + 1;
      }
      if (classification.known_defect_id) {
        entry.defect_attempt_count = Number(entry.defect_attempt_count || 0) + 1;
      }
      if (classification.is_clarification) {
        entry.clarification_attempt_count = Number(entry.clarification_attempt_count || 0) + 1;
        continue;
      }
      if (classification.is_error) {
        entry.error_attempt_count = Number(entry.error_attempt_count || 0) + 1;
        continue;
      }
      if (classification.is_exact_low_eligible) {
        entry.low_result_eligible_count = Number(entry.low_result_eligible_count || 0) + 1;
      }
      const resultCount = classification.result_count;
      if (resultCount !== null) {
        recordQueryResultCount(entry, resultCount);
        (entry.result_units as Set<string>).add(queryResultUnit(row));
        if (classification.is_true_zero) {
          entry.zero_attempt_count = Number(entry.zero_attempt_count || 0) + 1;
        } else if (classification.is_exact_low) {
          entry.low_attempt_count = Number(entry.low_attempt_count || 0) + 1;
        } else if (classification.is_approximate_low) {
          entry.approximate_low_attempt_count = Number(entry.approximate_low_attempt_count || 0) + 1;
        } else {
          entry.successful_attempt_count = Number(entry.successful_attempt_count || 0) + 1;
        }
      }
    }

    if (signalType === 'replace') {
      entry.replacement_count = Number(entry.replacement_count || 0) + 1;
      if (typeof row.replaced_with === 'string' && row.replaced_with.trim()) {
        (entry.unique_replacements as Set<string>).add(row.replaced_with.trim());
      }
    }

    if (signalType === 'copy' || signalType === 'favorite') {
      entry.successful_signal_count = Number(entry.successful_signal_count || 0) + 1;
      if (signalType === 'copy') entry.copy_count = Number(entry.copy_count || 0) + 1;
      if (signalType === 'favorite') entry.favorite_count = Number(entry.favorite_count || 0) + 1;
      if (typeof row.icon_id === 'string' && row.icon_id.trim()) {
        (entry.unique_icons as Set<string>).add(row.icon_id.trim());
      }
    }

    if (signalType === 'mcp_call') {
      entry.mcp_result_rows = Number(entry.mcp_result_rows || 0) + 1;
      if (String(row.query_origin || '') === 'icon_lookup') {
        const searcher = (entry.searcher_details as Map<string, Record<string, unknown>>)
          .get(groupedSearcherKey);
        if (searcher) searcher.searches = Number(searcher.searches || 0) + 1;
        const resultCount = optionalNonnegativeInteger(row.result_count);
        const status = normalizeSearchQuery(row.audit_status).toLowerCase();
        const errorCode = normalizeSearchQuery(row.error_code).toLowerCase();
        const isError = ['error', 'failed', 'failure'].includes(status);
        const isNotFound = errorCode === 'icon_not_found'
          || (!isError && resultCount === 0);
        if (isNotFound) {
          entry.lookup_not_found_count = Number(entry.lookup_not_found_count || 0) + 1;
        } else if (isError) {
          entry.lookup_error_count = Number(entry.lookup_error_count || 0) + 1;
        } else if (resultCount !== null && resultCount > 0) {
          entry.lookup_success_count = Number(entry.lookup_success_count || 0) + 1;
        } else {
          entry.lookup_unknown_count = Number(entry.lookup_unknown_count || 0) + 1;
        }
        if (resultCount !== null) {
          recordQueryResultCount(entry, resultCount);
          (entry.result_units as Set<string>).add(queryResultUnit(row));
          if (resultCount > 0) {
            entry.successful_signal_count = Number(entry.successful_signal_count || 0) + 1;
          }
        }
      }
      if (typeof row.batch_id === 'string' && row.batch_id.trim()) {
        (entry.mcp_batch_ids as Set<string>).add(row.batch_id.trim());
        if (row.agent_converged === true) {
          (entry.mcp_converged_batch_ids as Set<string>).add(row.batch_id.trim());
        }
      }
      if (typeof row.icon_id === 'string' && row.icon_id.trim()) {
        (entry.unique_icons as Set<string>).add(row.icon_id.trim());
      }
    }
  }

  return [...map.values()].map((entry) => {
    const issueTypes: QueryIssueType[] = [];
    if (Number(entry.zero_attempt_count || 0) > 0) issueTypes.push('zero_result');
    if (Number(entry.low_attempt_count || 0) > 0 || Number(entry.approximate_low_attempt_count || 0) > 0) issueTypes.push('low_result');
    if (Number(entry.replacement_count || 0) > 0) issueTypes.push('replacement_heavy');
    if (Number(entry.successful_signal_count || 0) > 0 || Number(entry.successful_attempt_count || 0) > 0) issueTypes.push('successful');
    if ((entry.mcp_batch_ids as Set<string>).size > 0 || (entry.channels as Set<string>).has('hosted_mcp')) issueTypes.push('mcp');

    const resultSamples = Number(entry.result_samples || 0);
    const totalResultCount = Number(entry.total_result_count || 0);
    const review = reviews.get(buildQueryReviewContextKey({
      query: entry.query,
      libraryFilter: entry.library_filter,
      jobCategory: entry.job_category,
    }));

    return {
      query: entry.query as string,
      library_filter: entry.library_filter as string,
      job_category: entry.job_category as string,
      issue_types: issueTypes,
      attempt_count: Number(entry.attempt_count || 0),
      zero_attempt_count: Number(entry.zero_attempt_count || 0),
      low_attempt_count: Number(entry.low_attempt_count || 0),
      low_result_eligible_count: Number(entry.low_result_eligible_count || 0),
      approximate_low_attempt_count: Number(entry.approximate_low_attempt_count || 0),
      clarification_attempt_count: Number(entry.clarification_attempt_count || 0),
      error_attempt_count: Number(entry.error_attempt_count || 0),
      defect_attempt_count: Number(entry.defect_attempt_count || 0),
      partial_recommendation_count: Number(entry.partial_recommendation_count || 0),
      average_result_count: resultSamples > 0
        ? Number((totalResultCount / resultSamples).toFixed(2))
        : null,
      median_result_count: medianQueryResultCount(
        entry.result_count_frequency as Map<number, number>,
      ),
      minimum_result_count: typeof entry.minimum_result_count === 'number' ? entry.minimum_result_count : null,
      maximum_result_count: typeof entry.maximum_result_count === 'number' ? entry.maximum_result_count : null,
      result_sample_count: resultSamples,
      result_units: [...(entry.result_units as Set<string>)].sort((a, b) => a.localeCompare(b)),
      replacement_count: Number(entry.replacement_count || 0),
      unique_replacements: (entry.unique_replacements as Set<string>).size,
      successful_attempt_count: Number(entry.successful_attempt_count || 0),
      successful_signal_count: Number(entry.successful_signal_count || 0),
      copy_count: Number(entry.copy_count || 0),
      favorite_count: Number(entry.favorite_count || 0),
      unique_icons: (entry.unique_icons as Set<string>).size,
      mcp_batch_count: (entry.mcp_batch_ids as Set<string>).size,
      mcp_converged_batches: (entry.mcp_converged_batch_ids as Set<string>).size,
      mcp_result_rows: Number(entry.mcp_result_rows || 0),
      lookup_success_count: Number(entry.lookup_success_count || 0),
      lookup_not_found_count: Number(entry.lookup_not_found_count || 0),
      lookup_error_count: Number(entry.lookup_error_count || 0),
      lookup_unknown_count: Number(entry.lookup_unknown_count || 0),
      surfaces: [...(entry.surfaces as Set<string>)].sort((a, b) => a.localeCompare(b)),
      domains: [...(entry.domains as Set<string>)].sort((a, b) => a.localeCompare(b)),
      context_urls: [...(entry.context_urls as Set<string>)].sort((a, b) => a.localeCompare(b)).slice(0, 5),
      session_count: (entry.session_hashes as Set<string>).size,
      ip_hash_count: (entry.ip_hash_prefixes as Set<string>).size,
      ip_hash_prefixes: [...(entry.ip_hash_prefixes as Set<string>)].sort((a, b) => a.localeCompare(b)).slice(0, 5),
      api_key_hash_count: (entry.api_key_hash_prefixes as Set<string>).size,
      api_key_hash_prefixes: [...(entry.api_key_hash_prefixes as Set<string>)].sort((a, b) => a.localeCompare(b)).slice(0, 5),
      estimated_unique_clients: (entry.estimated_client_keys as Set<string>).size,
      searcher_details: [...(entry.searcher_details as Map<string, Record<string, unknown>>).values()]
        .map((searcher) => ({
          label: searcher.label,
          kind: searcher.kind,
          account_linked: searcher.account_linked,
          searches: searcher.searches,
          channels: [...(searcher.channels as Set<string>)].sort(),
          countries: [...(searcher.countries as Set<string>)].sort(),
          first_seen: searcher.first_seen,
          last_seen: searcher.last_seen,
        }))
        .sort((left, right) => (
          String(right.last_seen || '').localeCompare(String(left.last_seen || ''))
          || String(left.label || '').localeCompare(String(right.label || ''))
        ))
        .slice(0, 100),
      searcher_details_available: includeSearcherDetails,
      searcher_details_reason: includeSearcherDetails
        ? null
        : 'Searcher details were not included in this view.',
      visitor_kinds: [...(entry.visitor_kinds as Set<string>)].sort((a, b) => a.localeCompare(b)),
      countries: [...(entry.countries as Set<string>)].sort((a, b) => a.localeCompare(b)),
      registered_user_count: (entry.registered_user_ids as Set<string>).size,
      pro_user_count: (entry.pro_user_ids as Set<string>).size,
      account_plans: [...(entry.account_plans as Set<string>)].sort((a, b) => a.localeCompare(b)),
      subscription_statuses: [...(entry.subscription_statuses as Set<string>)].sort((a, b) => a.localeCompare(b)),
      audit_sources: [...(entry.audit_sources as Set<string>)].sort((a, b) => a.localeCompare(b)),
      environments: [...(entry.environments as Set<string>)].sort((a, b) => a.localeCompare(b)),
      channels: [...(entry.channels as Set<string>)].sort((a, b) => a.localeCompare(b)),
      client_families: [...(entry.client_families as Set<string>)].sort((a, b) => a.localeCompare(b)),
      tools: [...(entry.tools as Set<string>)].sort((a, b) => a.localeCompare(b)),
      mcp_versions: [...(entry.mcp_versions as Set<string>)].sort((a, b) => a.localeCompare(b)),
      locales: [...(entry.locales as Set<string>)].sort((a, b) => a.localeCompare(b)),
      interface_locales: [...(entry.interface_locales as Set<string>)].sort((a, b) => a.localeCompare(b)),
      library_modes: [...(entry.library_modes as Set<string>)].sort((a, b) => a.localeCompare(b)),
      search_outcomes: [...(entry.search_outcomes as Set<string>)].sort((a, b) => a.localeCompare(b)),
      confidence_labels: [...(entry.confidence_labels as Set<string>)].sort((a, b) => a.localeCompare(b)),
      beta_cohorts: [...(entry.beta_cohorts as Set<string>)].sort((a, b) => a.localeCompare(b)),
      query_origins: [...(entry.query_origins as Set<string>)].sort((a, b) => a.localeCompare(b)),
      locale_attempt_counts: Object.fromEntries(
        Object.entries(entry.locale_attempt_counts as Record<string, number>)
          .sort(([left], [right]) => left.localeCompare(right)),
      ),
      first_seen: typeof entry.first_seen === 'string' ? entry.first_seen : null,
      last_seen: typeof entry.last_seen === 'string' ? entry.last_seen : null,
      review_status: review?.status || null,
      review_note: review?.note || null,
      review_updated_at: review?.updated_at || null,
    };
  });
}

function parseQueryQueueParams(url: URL, { exportMode = false } = {}) {
  const page = parsePositiveInt(url.searchParams.get('page'), 1, 100000);
  const pageSize = exportMode
    ? parsePositiveInt(url.searchParams.get('limit') || url.searchParams.get('page_size'), QUERY_EXPORT_MAX_ROWS, QUERY_EXPORT_MAX_ROWS)
    : parsePositiveInt(url.searchParams.get('page_size'), PAGE_SIZE, QUERY_QUEUE_MAX_PAGE_SIZE);
  const rawIssueType = normalizeSearchQuery(url.searchParams.get('issue_type')) as QueryIssueType;
  const rawStatus = normalizeSearchQuery(url.searchParams.get('status'));
  const rawSort = normalizeSearchQuery(url.searchParams.get('sort')) as QuerySortField;
  const rawDirection = normalizeSearchQuery(url.searchParams.get('direction'));

  return {
    page,
    page_size: pageSize,
    q: normalizeSearchQuery(url.searchParams.get('q')),
    issue_type: QUERY_ISSUE_TYPES.has(rawIssueType) ? rawIssueType : '',
    status: rawStatus === 'untriaged' || QUERY_REVIEW_STATUSES.has(rawStatus as QueryReviewStatus)
      ? rawStatus
      : '',
    environment: parseQueryEnvironmentFilter(url),
    channel: parseQueryChannelFilter(url),
    query_origin: parseQueryOriginFilter(url),
    library_filter: normalizeSearchQuery(url.searchParams.get('library_filter')),
    job_category: normalizeSearchQuery(url.searchParams.get('job_category')),
    sort: QUERY_SORT_FIELDS.has(rawSort) ? rawSort : 'last_seen',
    direction: rawDirection === 'asc' ? 'asc' : 'desc',
  };
}

function filterQueryWorkbenchRows(
  rows: ReturnType<typeof buildQueryWorkbenchRows>,
  params: ReturnType<typeof parseQueryQueueParams>,
) {
  return rows.filter((row) => {
    if (params.q) {
      const haystack = [
        row.query,
        row.library_filter,
        row.job_category,
        row.issue_types.join(' '),
        row.review_status,
        row.review_note,
        row.surfaces.join(' '),
        row.countries.join(' '),
        row.account_plans.join(' '),
        row.subscription_statuses.join(' '),
        row.environments.join(' '),
        row.channels.join(' '),
        row.client_families.join(' '),
        row.tools.join(' '),
        row.mcp_versions.join(' '),
      ].filter(Boolean).join(' ').toLowerCase();
      if (!haystack.includes(params.q)) return false;
    }

    if (params.issue_type && !row.issue_types.includes(params.issue_type as QueryIssueType)) {
      return false;
    }

    if (params.status) {
      const status = normalizeSearchQuery(row.review_status);
      if (params.status === 'untriaged') {
        if (status) return false;
      } else if (status !== params.status) {
        return false;
      }
    }

    if (params.library_filter && row.library_filter !== params.library_filter) return false;
    if (params.job_category && row.job_category !== params.job_category) return false;
    if (params.channel !== 'all' && !row.channels.includes(params.channel as QueryChannel)) return false;
    if (params.query_origin !== 'all' && !row.query_origins.includes(params.query_origin as QueryOrigin)) return false;
    return true;
  });
}

function sortQueryWorkbenchRows(
  rows: ReturnType<typeof buildQueryWorkbenchRows>,
  params: ReturnType<typeof parseQueryQueueParams>,
) {
  return [...rows].sort((a, b) => {
    const field = params.sort;
    const aValue = field === 'status' ? (a.review_status || 'untriaged') : a[field as keyof typeof a];
    const bValue = field === 'status' ? (b.review_status || 'untriaged') : b[field as keyof typeof b];
    const compared = compareNullableValues(aValue, bValue, params.direction as 'asc' | 'desc');
    if (compared !== 0) return compared;
    const libraryCompared = a.library_filter.localeCompare(b.library_filter);
    if (libraryCompared !== 0) return libraryCompared;
    const jobCompared = a.job_category.localeCompare(b.job_category);
    if (jobCompared !== 0) return jobCompared;
    return a.query.localeCompare(b.query);
  });
}

function summarizeQueryWorkbenchRows(rows: ReturnType<typeof buildQueryWorkbenchRows>) {
  const summary = {
    total_queries: rows.length,
    untriaged: 0,
    needs_alias: 0,
    needs_icon: 0,
    resolved: 0,
    ignore: 0,
    zero_result: 0,
    low_result: 0,
    replacement_heavy: 0,
    successful: 0,
    mcp: 0,
  };

  for (const row of rows) {
    const status = normalizeSearchQuery(row.review_status);
    if (status === 'needs_alias') summary.needs_alias += 1;
    else if (status === 'needs_icon') summary.needs_icon += 1;
    else if (status === 'resolved') summary.resolved += 1;
    else if (status === 'ignore') summary.ignore += 1;
    else summary.untriaged += 1;

    for (const issueType of row.issue_types) {
      summary[issueType] += 1;
    }
  }

  return summary;
}

async function fetchQueryRollups(
  adminClient: SupabaseClient,
  since: string | null,
  environment: QueryEnvironmentFilter,
  channel: QueryChannelFilter,
  queryOrigin: QueryOriginFilter,
) {
  let query = adminClient
    .from('admin_rollup_queries')
    .select('day, query_norm, library_filter, query_origin, channel, environment, tool_name, attempt_count, success_count, true_zero_count, low_result_count, low_result_eligible_count, approximate_low_result_count, error_count, clarification_count, partial_recommendation_count, defect_count, client_days, first_seen, last_seen')
    .order('day', { ascending: true });
  if (since) query = query.gte('day', since.slice(0, 10));
  if (environment !== 'all' && environment !== 'live') query = query.eq('environment', environment);
  if (environment === 'live') query = query.eq('environment', 'production');
  if (channel !== 'all') query = query.eq('channel', channel);
  if (queryOrigin !== 'all') query = query.eq('query_origin', queryOrigin);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

function buildQueryWorkbenchRowsFromRollups(
  rollupRows: Array<Record<string, unknown>>,
  reviews: Map<string, QueryReviewRow>,
  { separateQueryOrigins = false, separateChannels = false } = {},
) {
  const grouped = new Map<string, Record<string, unknown>>();
  const countFields = [
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

  for (const row of rollupRows) {
    const query = normalizeSearchQuery(row.query_norm);
    if (!query) continue;
    const library = normalizeReviewLibraryFilter(row.library_filter);
    const key = separateQueryOrigins || separateChannels
      ? buildQueryWorkbenchGroupKey({
        query,
        libraryFilter: library,
        jobCategory: '',
        queryOrigin: separateQueryOrigins ? row.query_origin : 'all',
        channel: separateChannels ? row.channel : 'all',
      })
      : buildQueryReviewContextKey({ query, libraryFilter: library, jobCategory: '' });
    const entry = grouped.get(key) || {
      query,
      library_filter: library,
      job_category: '',
      first_seen: row.first_seen || null,
      last_seen: row.last_seen || null,
      environments: new Set<string>(),
      channels: new Set<string>(),
      tools: new Set<string>(),
      query_origins: new Set<string>(),
      ...Object.fromEntries(countFields.map((field) => [field, 0])),
    };
    for (const field of countFields) {
      const value = Number(row[field]);
      if (Number.isFinite(value)) entry[field] = Number(entry[field] || 0) + value;
    }
    if (row.environment) (entry.environments as Set<string>).add(String(row.environment));
    if (row.channel) (entry.channels as Set<string>).add(String(row.channel));
    if (row.tool_name) (entry.tools as Set<string>).add(String(row.tool_name));
    if (row.query_origin) (entry.query_origins as Set<string>).add(String(row.query_origin));
    if (!entry.first_seen || (row.first_seen && String(row.first_seen) < String(entry.first_seen))) entry.first_seen = row.first_seen;
    if (!entry.last_seen || (row.last_seen && String(row.last_seen) > String(entry.last_seen))) entry.last_seen = row.last_seen;
    grouped.set(key, entry);
  }

  return [...grouped.values()].map((entry) => {
    const issueTypes: QueryIssueType[] = [];
    if (Number(entry.true_zero_count || 0) > 0) issueTypes.push('zero_result');
    if (Number(entry.low_result_count || 0) > 0 || Number(entry.approximate_low_result_count || 0) > 0) issueTypes.push('low_result');
    if (Number(entry.success_count || 0) > 0) issueTypes.push('successful');
    if ((entry.channels as Set<string>).has('hosted_mcp')) issueTypes.push('mcp');
    const review = reviews.get(buildQueryReviewContextKey({
      query: entry.query,
      libraryFilter: entry.library_filter,
      jobCategory: '',
    }));
    return {
      query: String(entry.query),
      library_filter: String(entry.library_filter),
      job_category: '',
      issue_types: issueTypes,
      attempt_count: Number(entry.attempt_count || 0),
      zero_attempt_count: Number(entry.true_zero_count || 0),
      low_attempt_count: Number(entry.low_result_count || 0),
      low_result_eligible_count: Number(entry.low_result_eligible_count || 0),
      approximate_low_attempt_count: Number(entry.approximate_low_result_count || 0),
      clarification_attempt_count: Number(entry.clarification_count || 0),
      error_attempt_count: Number(entry.error_count || 0),
      defect_attempt_count: Number(entry.defect_count || 0),
      partial_recommendation_count: Number(entry.partial_recommendation_count || 0),
      successful_attempt_count: Number(entry.success_count || 0),
      successful_signal_count: 0,
      average_result_count: null,
      minimum_result_count: null,
      maximum_result_count: null,
      result_sample_count: 0,
      replacement_count: 0,
      unique_replacements: 0,
      copy_count: 0,
      favorite_count: 0,
      unique_icons: 0,
      mcp_batch_count: 0,
      mcp_converged_batches: 0,
      mcp_result_rows: 0,
      surfaces: [],
      domains: [],
      context_urls: [],
      session_count: 0,
      ip_hash_count: 0,
      ip_hash_prefixes: [],
      api_key_hash_count: 0,
      api_key_hash_prefixes: [],
      estimated_unique_clients: null,
      client_days: Number(entry.client_days || 0),
      searcher_details: [],
      visitor_kinds: [],
      countries: [],
      registered_user_count: 0,
      pro_user_count: 0,
      account_plans: [],
      subscription_statuses: [],
      audit_sources: ['admin_rollup_queries'],
      environments: [...(entry.environments as Set<string>)].sort(),
      channels: [...(entry.channels as Set<string>)].sort(),
      client_families: [],
      tools: [...(entry.tools as Set<string>)].sort(),
      mcp_versions: [],
      locales: [],
      library_modes: [],
      search_outcomes: [],
      confidence_labels: [],
      beta_cohorts: [],
      query_origins: [...(entry.query_origins as Set<string>)].sort(),
      locale_attempt_counts: {},
      first_seen: entry.first_seen || null,
      last_seen: entry.last_seen || null,
      review_status: review?.status || null,
      review_note: review?.note || null,
      review_updated_at: review?.updated_at || null,
    };
  });
}

async function buildRollupQueryQueuePayload(
  adminClient: SupabaseClient,
  url: URL,
  { exportMode = false } = {},
) {
  const window = parseIntelligenceWindow(url);
  const since = getWindowSinceIso(window);
  const params = parseQueryQueueParams(url, { exportMode });
  const rollupState = await ensureCompletedDayRollups(adminClient);
  if (rollupState.available !== true) return null;
  const queryReviewsPromise = fetchAllQueryReviews(adminClient);
  const [completedRows, rawTodayRows, queryReviews] = await Promise.all([
    fetchQueryRollups(
      adminClient,
      since,
      params.environment,
      params.channel,
      params.query_origin,
    ),
    fetchTelemetryEvidenceRows(adminClient, currentUtcDayStartIso()),
    queryReviewsPromise,
  ]);
  const todayRows = filterEvidenceRowsByQueryOrigin(
    filterEvidenceRowsByChannel(
      filterEvidenceRowsByEnvironment(
        rawTodayRows,
        params.environment,
      ),
      params.channel,
    ),
    params.query_origin,
  );
  const currentRollups = buildAdminRollups(todayRows, knownSearchDefects).queries;
  const rows = buildQueryWorkbenchRowsFromRollups([...completedRows, ...currentRollups], queryReviews.reviews);
  const filteredRows = filterQueryWorkbenchRows(
    rows as unknown as ReturnType<typeof buildQueryWorkbenchRows>,
    params,
  );
  const sortedRows = sortQueryWorkbenchRows(filteredRows, params);
  const pageCount = Math.max(1, Math.ceil(sortedRows.length / params.page_size));
  const currentPage = exportMode ? 1 : Math.min(params.page, pageCount);
  const start = exportMode ? 0 : (currentPage - 1) * params.page_size;
  return {
    queries: sortedRows.slice(start, start + params.page_size),
    pagination: {
      page: currentPage,
      page_size: params.page_size,
      total: sortedRows.length,
      page_count: pageCount,
    },
    summary: {
      ...summarizeQueryWorkbenchRows(filteredRows),
      query_review_feature_available: queryReviews.available,
      client_measure: 'client_days',
    },
    filters: {
      q: params.q,
      issue_type: params.issue_type,
      status: params.status,
      environment: params.environment,
      channel: params.channel,
      query_origin: params.query_origin,
      library_filter: params.library_filter,
      job_category: params.job_category,
      window: window.key,
    },
    sort: { field: params.sort, direction: params.direction },
    window: {
      key: window.key,
      short_label: window.shortLabel,
      long_label: window.longLabel,
    },
    rollups: rollupState,
  };
}

async function buildQueryQueuePayload(
  adminClient: SupabaseClient,
  url: URL,
  { exportMode = false } = {},
) {
  const window = parseIntelligenceWindow(url);
  if (window.days === null || (window.days !== null && window.days >= 90)) {
    const rollupPayload = await buildRollupQueryQueuePayload(adminClient, url, { exportMode });
    if (rollupPayload) return rollupPayload;
  }
  const since = getWindowSinceIso(window);
  const params = parseQueryQueueParams(url, { exportMode });
  const [rawEvidenceRows, queryReviews] = await Promise.all([
    fetchSearchEvidenceRows(adminClient, since, params.query_origin),
    fetchAllQueryReviews(adminClient),
  ]);
  const evidenceRows = filterEvidenceRowsByQueryOrigin(
    filterEvidenceRowsByChannel(
      filterEvidenceRowsByEnvironment(rawEvidenceRows, params.environment),
      params.channel,
    ),
    params.query_origin,
  );
  const rows = buildQueryWorkbenchRows(evidenceRows, queryReviews.reviews);
  const filteredRows = filterQueryWorkbenchRows(rows, params);
  const sortedRows = sortQueryWorkbenchRows(filteredRows, params);
  const pageCount = Math.max(1, Math.ceil(sortedRows.length / params.page_size));
  const currentPage = exportMode ? 1 : Math.min(params.page, pageCount);
  const start = exportMode ? 0 : (currentPage - 1) * params.page_size;
  const pagedRows = sortedRows.slice(start, start + params.page_size);
  const exportContexts = new Set(
    sortedRows.map((row) => buildQueryReviewContextKey({
      query: row.query,
      libraryFilter: row.library_filter,
      jobCategory: row.job_category,
    })),
  );
  const evidenceSample = exportMode
    ? evidenceRows
      .filter((row) => queryEvidenceMatchesExportRows(row, exportContexts))
      .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))
      .slice(0, 500)
      .map(compactQueryEvidenceRow)
    : undefined;

  const payload: Record<string, unknown> = {
    queries: pagedRows,
    pagination: {
      page: currentPage,
      page_size: params.page_size,
      total: sortedRows.length,
      page_count: pageCount,
    },
    summary: {
      ...summarizeQueryWorkbenchRows(filteredRows),
      query_review_feature_available: queryReviews.available,
    },
    filters: {
      q: params.q,
      issue_type: params.issue_type,
      status: params.status,
      environment: params.environment,
      channel: params.channel,
      query_origin: params.query_origin,
      library_filter: params.library_filter,
      job_category: params.job_category,
      window: window.key,
    },
    sort: {
      field: params.sort,
      direction: params.direction,
    },
    window: {
      key: window.key,
      short_label: window.shortLabel,
      long_label: window.longLabel,
    },
  };
  if (exportMode) {
    payload.evidence_sample = evidenceSample;
    payload.limitations = [
      'Export rows are bounded by the selected admin filters and maximum query export limit.',
      'Evidence sample is capped at 500 latest rows for agent readability.',
      'Raw IP addresses are not stored or exported; dashboard rows use hashed visitor groups.',
      'Registered/pro fields are populated only when a trusted authenticated hosted-search request includes a user token.',
      'Country is populated only when the hosting provider forwards a trusted country header.',
    ];
  }
  return payload;
}

function csvCell(value: unknown) {
  if (Array.isArray(value)) {
    return csvCell(value.join('|'));
  }
  const raw = String(value ?? '');
  const text = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
  if (!/[",\n\r]/.test(text)) return text;
  return `"${text.replaceAll('"', '""')}"`;
}

function queryRowsToCsv(rows: Array<Record<string, unknown>>) {
  const columns = [
    'query',
    'library_filter',
    'job_category',
    'issue_types',
    'review_status',
    'review_note',
    'attempt_count',
    'zero_attempt_count',
    'low_attempt_count',
    'low_result_eligible_count',
    'approximate_low_attempt_count',
    'clarification_attempt_count',
    'error_attempt_count',
    'defect_attempt_count',
    'partial_recommendation_count',
    'average_result_count',
    'minimum_result_count',
    'replacement_count',
    'successful_attempt_count',
    'successful_signal_count',
    'copy_count',
    'favorite_count',
    'mcp_batch_count',
    'session_count',
    'ip_hash_count',
    'ip_hash_prefixes',
    'api_key_hash_count',
    'api_key_hash_prefixes',
    'estimated_unique_clients',
    'client_days',
    'visitor_kinds',
    'countries',
    'registered_user_count',
    'pro_user_count',
    'account_plans',
    'subscription_statuses',
    'domains',
    'audit_sources',
    'environments',
    'channels',
    'client_families',
    'tools',
    'mcp_versions',
    'locales',
    'library_modes',
    'search_outcomes',
    'confidence_labels',
    'beta_cohorts',
    'query_origins',
    'first_seen',
    'last_seen',
  ];
  return [
    columns.join(','),
    ...rows.map((row) => columns.map((column) => csvCell(row[column])).join(',')),
  ].join('\n');
}

function compactQueryEvidenceRow(row: Record<string, unknown>) {
  return {
    source_table: row.source_table || 'icon_evidence',
    event_type: row.event_type || null,
    signal_type: row.signal_type || null,
    search_query: row.search_query || null,
    icon_id: row.icon_id || null,
    result_count: row.result_count ?? null,
    library_filter: row.library_filter || null,
    library_mode: row.library_mode || null,
    search_outcome: row.search_outcome || null,
    query_origin: row.query_origin || 'legacy_unknown',
    requested_limit: row.requested_limit ?? null,
    known_defect_id: row.known_defect_id || null,
    error_code: row.error_code || null,
    confidence_label: row.confidence_label || null,
    beta_cohort: row.beta_cohort || null,
    job_category: row.job_category || null,
    ui_surface: row.ui_surface || null,
    domain: row.domain || null,
    context_url: row.context_url || null,
    environment: classifySearchEvidenceEnvironment(row),
    channel: classifySearchEvidenceChannel(row),
    country_code: normalizeAuditCountry(row.country_code),
    ip_hash_prefix: compactHashPrefix(row.ip_hash_prefix),
    session_present: typeof row.session_hash === 'string' && row.session_hash.trim().length > 0,
    registered_user_present: row.is_registered === true || Boolean(row.user_id),
    account_plan: row.account_plan || null,
    subscription_status: row.subscription_status || null,
    pro_user: row.is_pro === true,
    client_family: row.client_family || null,
    tool_name: row.tool_name || null,
    locale: row.locale || null,
    anonymous_client_hash_prefix: row.anonymous_client_hash_prefix || null,
    user_agent_hash_prefix: row.user_agent_hash_prefix || null,
    api_key_hash_prefix: row.api_key_hash_prefix || null,
    estimated_client_key: row.estimated_client_key || null,
    visitor_kind: row.visitor_kind || null,
    mcp_server_version: row.mcp_server_version || null,
    request_id: row.request_id || null,
    dedupe_key: row.dedupe_key || null,
    audit_status: row.audit_status || null,
    latency_ms: row.latency_ms ?? null,
    evidence_text: row.evidence_text || null,
    replaced_with: row.replaced_with || null,
    created_at: row.created_at || null,
  };
}

function queryEvidenceMatchesExportRows(
  row: Record<string, unknown>,
  exportContexts: Set<string>,
) {
  return exportContexts.has(buildQueryReviewContextKey({
    query: normalizeSearchQuery(row.search_query),
    libraryFilter: normalizeReviewLibraryFilter(row.library_filter),
    jobCategory: normalizeReviewJobCategory(row.job_category),
  }));
}

function buildAgentAnalysisPack(payload: Record<string, unknown>) {
  const queries = Array.isArray(payload.queries) ? payload.queries as Array<Record<string, unknown>> : [];
  const evidenceSample = Array.isArray(payload.evidence_sample)
    ? payload.evidence_sample as Array<Record<string, unknown>>
    : [];
  const summary = payload.summary as Record<string, unknown> || {};
  const filters = payload.filters as Record<string, unknown> || {};
  const sort = payload.sort as Record<string, unknown> || {};
  const limitations = Array.isArray(payload.limitations)
    ? payload.limitations as string[]
    : [
      'Export is bounded by the selected admin filters and maximum export row limit.',
      'Raw IP addresses are not exported; only hash prefixes or aggregate counts may appear.',
    ];
  const analysisHints = [
    'Prioritize repeated zero-result queries before one-off misses.',
    'Review low-result queries for aliases, localized wording, and ranking problems.',
    'Compare countries, account status, and surfaces when deciding whether a gap affects paid or recurring users.',
  ];
  const exportedAt = typeof payload.exported_at === 'string' ? payload.exported_at : new Date().toISOString();
  const localeAttemptCounts = aggregateLocaleAttemptCounts(queries);
  const summaryMarkdown = [
    '# Supericons Query Analysis Pack',
    '',
    `Exported at: ${exportedAt}`,
    `Window: ${String(filters?.window || '')}`,
    `Rows included: ${queries.length}`,
    `Evidence rows included: ${evidenceSample.length}`,
    '',
    '## Summary',
    '',
    `- Total queries: ${String(summary?.total_queries || 0)}`,
    `- Untriaged: ${String(summary?.untriaged || 0)}`,
    `- Needs alias: ${String(summary?.needs_alias || 0)}`,
    `- Needs icon: ${String(summary?.needs_icon || 0)}`,
    `- Resolved: ${String(summary?.resolved || 0)}`,
    `- Ignored: ${String(summary?.ignore || 0)}`,
    `- Locale attempt counts: ${JSON.stringify(localeAttemptCounts)}`,
    '',
    '## Filters',
    '',
    `- Search: ${String(filters?.q || 'none')}`,
    `- Issue type: ${String(filters?.issue_type || 'all')}`,
    `- Status: ${String(filters?.status || 'all')}`,
    `- Environment: ${String(filters?.environment || 'live')}`,
    `- Library: ${String(filters?.library_filter || 'all')}`,
    `- Purpose: ${String(filters?.job_category || 'all')}`,
    `- Sort: ${String(sort?.field || '')} ${String(sort?.direction || '')}`,
    '',
    '## Suggested Analysis',
    '',
    ...analysisHints.map((hint) => `- ${hint}`),
    '',
    '## Limitations',
    '',
    ...limitations.map((limitation) => `- ${limitation}`),
  ].join('\n');

  return {
    exported_at: exportedAt,
    manifest: {
      format: 'supericons_query_analysis_pack',
      schema_version: 2,
      source: payload.fallback_source || 'admin_api',
      files: ['summary.md', 'queries.json', 'evidence_sample.json', 'export_manifest.json'],
      row_count: queries.length,
      evidence_sample_count: evidenceSample.length,
      recommended_for: ['agent_analysis', 'query_gap_triage', 'supericons_registry_updates'],
      large_data_strategy: 'Bounded JSON pack for filtered analysis; use CSV for flat spreadsheet work and NDJSON chunks for raw event firehose scale.',
    },
    summary,
    filters,
    sort,
    queries,
    measurement: {
      locale_attempt_counts: Object.fromEntries(
        Object.entries(localeAttemptCounts).sort(([left], [right]) => left.localeCompare(right)),
      ),
    },
    evidence_sample: evidenceSample,
    limitations,
    analysis_hints: analysisHints,
    files: {
      'summary.md': summaryMarkdown,
      'queries.json': JSON.stringify(queries, null, 2),
      'evidence_sample.json': JSON.stringify(evidenceSample, null, 2),
      'export_manifest.json': JSON.stringify({
        exported_at: exportedAt,
        format: 'supericons_query_analysis_pack',
        schema_version: 2,
        source: payload.fallback_source || 'admin_api',
        filters,
        sort,
        summary,
        row_count: queries.length,
        evidence_sample_count: evidenceSample.length,
        limitations,
      }, null, 2),
    },
  };
}

async function upsertQueryReview(
  adminClient: SupabaseClient,
  body: JsonRecord,
) {
  const normalizedQuery = normalizeSearchQuery(body.query);
  if (!normalizedQuery) {
    throw new Error('query is required');
  }

  const status = normalizeSearchQuery(body.status) as QueryReviewStatus;
  if (!QUERY_REVIEW_STATUSES.has(status)) {
    throw new Error(
      'status must be one of: add_icon, add_alias, improve_ranking, improve_docs, watch, ignore, resolved',
    );
  }

  const note = typeof body.note === 'string'
    ? body.note.trim() || null
    : null;
  const payload = {
    normalized_query: normalizedQuery,
    library_filter: normalizeReviewLibraryFilter(body.library_filter),
    job_category: normalizeReviewJobCategory(body.job_category),
    status,
    note,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await adminClient
    .from('icon_query_reviews')
    .upsert(payload, {
      onConflict: 'normalized_query,library_filter,job_category',
    })
    .select('normalized_query, library_filter, job_category, status, note, updated_at')
    .single();

  if (error) throw error;
  return data as QueryReviewRow;
}

function buildAccountDeletedEmail({
  recipientEmail,
  dashboardUrl,
}: {
  recipientEmail: string;
  dashboardUrl: string;
}) {
  const escapedEmail = escapeHtml(recipientEmail);
  const escapedDashboardUrl = escapeHtml(dashboardUrl);
  return {
    subject: 'Your Supericons account has been deleted',
    text: [
      'Your Supericons account has been deleted.',
      '',
      'All associated Supericons account data has been removed from our app.',
      `Questions? Reply to ${DEFAULT_SUPPORT_EMAIL}`,
      `Open Supericons: ${dashboardUrl}`,
    ].join('\n'),
    html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#0e0e0e;">
  <div style="padding:40px 20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#ffffff;text-align:center;">
    <div style="max-width:480px;margin:0 auto;">
      <a href="${escapedDashboardUrl}" style="display:inline-flex;align-items:center;justify-content:center;margin-bottom:32px;text-decoration:none;">
        <img src="${escapeHtml(getAppBaseUrl())}/logo_email_header.png" alt="Supericons" height="34" style="display:block;border:0;outline:none;text-decoration:none;" />
      </a>
      <div style="background:#131313;border:1px solid #262626;border-radius:16px;padding:48px 40px;box-shadow:0 10px 30px rgba(0,0,0,0.4);text-align:left;">
        <div style="font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#FF4F00;margin-bottom:12px;text-align:center;">Supericons admin</div>
        <h1 style="font-size:24px;font-weight:700;margin:0 0 16px;color:#ffffff;text-align:center;">Account deleted</h1>
        <p style="margin:0 0 24px;color:#cccaca;font-size:15px;line-height:1.6;text-align:center;">Your Supericons account has been deleted.</p>
        <div style="background:#171717;border:1px solid #262626;border-radius:14px;padding:18px 18px 16px;margin-bottom:24px;">
          <p style="margin:0 0 12px;color:#cccaca;font-size:14px;line-height:1.6;">All associated Supericons account data has been removed from our app.</p>
          <p style="margin:0;color:#cccaca;font-size:14px;line-height:1.6;">Deleting your Supericons account does not delete any external sign-in account such as Google.</p>
        </div>
        <div style="text-align:center;">
          <a href="${escapedDashboardUrl}" style="display:inline-block;background-color:#FF4F00;color:#000000;text-decoration:none;font-weight:700;font-size:14px;padding:14px 28px;border-radius:999px;">Open Supericons</a>
        </div>
      </div>
      <div style="margin-top:28px;color:#666;font-size:12px;line-height:1.6;">
        This email was sent to ${escapedEmail}.<br />
        Questions? Reply to <a href="mailto:${DEFAULT_SUPPORT_EMAIL}" style="color:#FF8A50;text-decoration:none;">${DEFAULT_SUPPORT_EMAIL}</a>.
      </div>
    </div>
  </div>
</body>
</html>`,
  };
}

async function sendEmail({
  to,
  subject,
  text,
  html,
}: {
  to: string;
  subject: string;
  text: string;
  html: string;
}) {
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  if (!resendApiKey) {
    return { ok: false, reason: 'missing_resend_api_key' };
  }

  const response = await fetch(RESEND_EMAILS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: DEFAULT_FROM_EMAIL,
      to: [to],
      subject,
      text,
      html,
    }),
  });

  if (!response.ok) {
    return {
      ok: false,
      reason: await response.text(),
    };
  }

  return { ok: true };
}

function isMissingRelationError(error: unknown) {
  if (!error || typeof error !== 'object') return false;
  const code = 'code' in error ? String(error.code) : '';
  const message = 'message' in error ? String(error.message) : '';
  return code === '42P01' || message.toLowerCase().includes('relation') && message.toLowerCase().includes('does not exist');
}

function isMissingColumnError(error: unknown) {
  if (!error || typeof error !== 'object') return false;
  const code = 'code' in error ? String(error.code) : '';
  const message = 'message' in error ? String(error.message).toLowerCase() : '';
  return code === '42703' || (message.includes('column') && message.includes('does not exist'));
}

function formatAdminErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (!error || typeof error !== 'object') return String(error);
  const fields = error as Record<string, unknown>;
  const message = typeof fields.message === 'string' && fields.message.trim()
    ? fields.message.trim()
    : 'Admin API request failed';
  const details = typeof fields.details === 'string' && fields.details.trim()
    ? fields.details.trim()
    : '';
  const hint = typeof fields.hint === 'string' && fields.hint.trim()
    ? fields.hint.trim()
    : '';
  const code = typeof fields.code === 'string' && fields.code.trim()
    ? `code ${fields.code.trim()}`
    : '';
  return [message, details, hint, code].filter(Boolean).join(' - ');
}

function summarizeProviders(user: AuthUser) {
  const rawProviders = Array.isArray(user.app_metadata?.providers)
    ? user.app_metadata?.providers ?? []
    : [];
  const singleProvider = user.app_metadata?.provider ? [user.app_metadata.provider] : [];
  const values = [...new Set([...rawProviders, ...singleProvider].filter(Boolean))];
  return values.length > 0 ? values : ['email'];
}

function formatProviderLabel(user: AuthUser) {
  return summarizeProviders(user)
    .map((value) => value === 'google' ? 'Google' : value === 'email' ? 'Email' : value)
    .join(', ');
}

function getDisplayName(user: AuthUser, profile?: Record<string, unknown> | null) {
  const profileName = typeof profile?.display_name === 'string' ? profile.display_name : null;
  if (profileName) return profileName;
  const metadata = user.user_metadata || {};
  const fullName = typeof metadata.full_name === 'string' ? metadata.full_name : null;
  const name = typeof metadata.name === 'string' ? metadata.name : null;
  if (fullName) return fullName;
  if (name) return name;
  if (user.email) return user.email.split('@')[0];
  return user.id;
}

async function listAllAuthUsers(adminClient: SupabaseClient) {
  const users: AuthUser[] = [];
  let page = 1;
  let total = 0;

  while (true) {
    const { data, error } = await adminClient.auth.admin.listUsers({
      page,
      perPage: 100,
    });

    if (error) throw error;

    const batch = (data?.users || []) as AuthUser[];
    total = data?.total || total;
    users.push(...batch);

    if (batch.length < 100) break;
    page += 1;
    if (users.length >= total && total > 0) break;
  }

  return { users, total: total || users.length };
}

async function fetchProfiles(adminClient: SupabaseClient, userIds: string[]) {
  if (userIds.length === 0) return new Map<string, Record<string, unknown>>();
  const { data, error } = await adminClient
    .from('si_profiles')
    .select('id, email, display_name, avatar_url, created_at')
    .in('id', userIds);

  if (error) throw error;
  return new Map((data || []).map((row: Record<string, unknown>) => [String(row.id), row]));
}

async function fetchSubscriptions(adminClient: SupabaseClient, userIds: string[]) {
  if (userIds.length === 0) return new Map<string, Record<string, unknown>>();
  const { data, error } = await adminClient
    .from('si_subscriptions')
    .select('id, user_id, stripe_subscription_id, stripe_customer_id, status, current_period_end, plan')
    .in('user_id', userIds);

  if (error) throw error;
  return new Map((data || []).map((row: Record<string, unknown>) => [String(row.user_id), row]));
}

async function fetchPurchaseCounts(adminClient: SupabaseClient, userIds: string[]) {
  const counts = new Map<string, number>();
  if (userIds.length === 0) return counts;

  const { data, error } = await adminClient
    .from('si_purchases')
    .select('user_id')
    .in('user_id', userIds);

  if (error) throw error;

  for (const row of (data || []) as Array<Record<string, unknown>>) {
    const userId = String(row.user_id);
    counts.set(userId, (counts.get(userId) || 0) + 1);
  }

  return counts;
}

async function fetchApiKeyCounts(adminClient: SupabaseClient, userIds: string[]) {
  const counts = new Map<string, number>();
  if (userIds.length === 0) return counts;

  const { data, error } = await adminClient
    .from('si_api_keys')
    .select('user_id, revoked')
    .in('user_id', userIds);

  if (error) {
    if (isMissingRelationError(error)) {
      return counts;
    }
    throw error;
  }

  for (const row of (data || []) as Array<Record<string, unknown>>) {
    const userId = String(row.user_id);
    if (row.revoked) continue;
    counts.set(userId, (counts.get(userId) || 0) + 1);
  }

  return counts;
}

async function fetchUserSnapshot(adminClient: SupabaseClient, userId: string) {
  const { data: authUserData, error: authError } = await adminClient.auth.admin.getUserById(userId);
  if (authError) throw authError;
  const user = authUserData?.user as AuthUser | null;
  if (!user) return null;

  const [{ data: profile, error: profileError }, { data: subscription, error: subscriptionError }, { data: purchases, error: purchasesError }, apiKeysResult] = await Promise.all([
    adminClient.from('si_profiles').select('id, email, display_name, avatar_url, created_at').eq('id', userId).maybeSingle(),
    adminClient.from('si_subscriptions').select('id, user_id, stripe_subscription_id, stripe_customer_id, status, current_period_end, plan').eq('user_id', userId).maybeSingle(),
    adminClient.from('si_purchases').select('id, user_id, product_id, stripe_session_id, purchased_at, source, si_products(name, slug)').eq('user_id', userId).order('purchased_at', { ascending: false }),
    adminClient.from('si_api_keys').select('id, key_prefix, label, created_at, last_used, revoked').eq('user_id', userId).order('created_at', { ascending: false }),
  ]);

  if (profileError) throw profileError;
  if (subscriptionError) throw subscriptionError;
  if (purchasesError) throw purchasesError;

  let apiKeys: Record<string, unknown>[] = [];
  if (apiKeysResult.error) {
    if (!isMissingRelationError(apiKeysResult.error)) throw apiKeysResult.error;
  } else {
    apiKeys = (apiKeysResult.data || []) as Record<string, unknown>[];
  }

  const { data: auditLog, error: auditError } = await adminClient
    .from('si_admin_audit_log')
    .select('id, action, outcome, note, error_text, target_id, target_email, payload, created_at')
    .or(`target_id.eq.${userId},target_email.eq.${user.email || ''}`)
    .order('created_at', { ascending: false })
    .limit(50);

  if (auditError) throw auditError;

  return {
    user,
    profile: profile || null,
    subscription: subscription || null,
    purchases: purchases || [],
    api_keys: apiKeys,
    audit_log: auditLog || [],
  };
}

async function insertAuditRow(
  adminClient: SupabaseClient,
  action: string,
  targetId: string,
  targetEmail: string | null,
  note: string | null,
  payload: JsonRecord,
) {
  const { data, error } = await adminClient
    .from('si_admin_audit_log')
    .insert({
      action,
      target_id: targetId,
      target_email: targetEmail,
      note,
      payload,
      outcome: 'started',
    })
    .select('id')
    .single();

  if (error) throw error;
  return String((data as Record<string, unknown>).id);
}

async function updateAuditRow(
  adminClient: SupabaseClient,
  auditId: string,
  outcome: AuditOutcome,
  updates: JsonRecord = {},
) {
  const payload = { outcome, ...updates };
  const { error } = await adminClient
    .from('si_admin_audit_log')
    .update(payload)
    .eq('id', auditId);

  if (error) throw error;
}

function summarizeSnapshot(snapshot: Record<string, unknown>) {
  return {
    email: snapshot.user && typeof snapshot.user === 'object' ? (snapshot.user as AuthUser).email || null : null,
    provider: snapshot.user && typeof snapshot.user === 'object' ? formatProviderLabel(snapshot.user as AuthUser) : null,
    has_profile: Boolean(snapshot.profile),
    subscription: snapshot.subscription || null,
    purchases_count: Array.isArray(snapshot.purchases) ? snapshot.purchases.length : 0,
    api_keys_count: Array.isArray(snapshot.api_keys) ? snapshot.api_keys.length : 0,
  };
}

async function cancelStripeSubscription(stripe: Stripe, subscriptionId: string) {
  return await stripe.subscriptions.cancel(subscriptionId);
}

async function deleteStripeCustomer(stripe: Stripe, customerId: string) {
  return await stripe.customers.del(customerId);
}

async function handleStats(req: Request, adminClient: SupabaseClient) {
  const hostedSearch24hSince = new Date(Date.now() - (24 * 60 * 60 * 1000)).toISOString();
  const hostedSearch30dSince = new Date(Date.now() - (30 * 24 * 60 * 60 * 1000)).toISOString();

  const [{ users }, activeProResult, purchasesResult, recentAuditResult, hostedSearch24hResult, hostedSearch30dResult] = await Promise.all([
    listAllAuthUsers(adminClient),
    adminClient.from('si_subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    adminClient.from('si_purchases').select('id', { count: 'exact', head: true }),
    adminClient.from('si_admin_audit_log').select('id, action, outcome, target_id, target_email, created_at').order('created_at', { ascending: false }).limit(5),
    adminClient
      .from('search_request_audit')
      .select('source, status, latency_ms, created_at')
      .gte('created_at', hostedSearch24hSince),
    adminClient
      .from('search_request_audit')
      .select('source, status, created_at')
      .gte('created_at', hostedSearch30dSince)
      .eq('status', 'trap_hit'),
  ]);

  if (activeProResult.error) throw activeProResult.error;
  if (purchasesResult.error) throw purchasesResult.error;
  if (recentAuditResult.error) throw recentAuditResult.error;

  let hostedSearchAvailable = true;
  if (hostedSearch24hResult.error || hostedSearch30dResult.error) {
    if (isMissingRelationError(hostedSearch24hResult.error) || isMissingRelationError(hostedSearch30dResult.error)) {
      hostedSearchAvailable = false;
    } else {
      throw hostedSearch24hResult.error || hostedSearch30dResult.error;
    }
  }

  const cutoff = Date.now() - (30 * 24 * 60 * 60 * 1000);
  const sortedUsers = [...users].sort((a, b) => {
    const aTime = new Date(a.created_at || 0).getTime();
    const bTime = new Date(b.created_at || 0).getTime();
    return bTime - aTime;
  });

  const newUsers30d = users.filter((user) => {
    const createdAt = new Date(user.created_at || 0).getTime();
    return Number.isFinite(createdAt) && createdAt >= cutoff;
  }).length;

  const hostedSearchRows = hostedSearchAvailable
    ? ((hostedSearch24hResult.data || []) as Array<Record<string, unknown>>)
    : [];
  const hostedLatencyValues = hostedSearchRows
    .map((row) => Number(row.latency_ms))
    .filter((value) => Number.isFinite(value) && value >= 0);
  const hostedSourceCounts = hostedSearchRows.reduce((acc, row) => {
    const source = String(row.source || '').trim().toLowerCase();
    if (!source || source === 'trap') return acc;
    acc.set(source, (acc.get(source) || 0) + 1);
    return acc;
  }, new Map<string, number>());
  const hostedTopSources = [...hostedSourceCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 4)
    .map(([source, count]) => ({ source, count }));
  const trapHits30d = hostedSearchAvailable
    ? (((hostedSearch30dResult.data || []) as Array<Record<string, unknown>>).length)
    : 0;

  return jsonResponse(req, {
    stats: {
      total_users: users.length,
      active_pro: activeProResult.count || 0,
      total_purchases: purchasesResult.count || 0,
      new_users_30d: newUsers30d,
      recent_signups: sortedUsers.slice(0, 5).map((user) => ({
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        provider: formatProviderLabel(user),
      })),
      recent_audit: recentAuditResult.data || [],
      hosted_search: {
        available: hostedSearchAvailable,
        total_requests_24h: hostedSearchRows.length,
        p95_latency_ms: Math.round(percentile(hostedLatencyValues, 0.95)),
        trap_hits_30d: trapHits30d,
        top_sources: hostedTopSources,
      },
    },
  });
}

async function handleIntelligenceOverview(req: Request, adminClient: SupabaseClient, url: URL) {
  const window = parseIntelligenceWindow(url);
  const since = getWindowSinceIso(window);
  const environment = parseQueryEnvironmentFilter(url);
  const channel = parseQueryChannelFilter(url);
  const queryOrigin = parseQueryOriginFilter(url);

  const [metadataCoverageResult, rawEvidenceRows] = await Promise.all([
    adminClient.from('icon_metadata').select('icon_id', { count: 'exact', head: true }),
    fetchSearchEvidenceRows(adminClient, since),
  ]);

  if (metadataCoverageResult.error) throw metadataCoverageResult.error;

  const evidenceRows: SearchEvidenceRow[] = filterEvidenceRowsByChannel(
    filterEvidenceRowsByEnvironment(rawEvidenceRows, environment),
    channel,
  )
    .map((row): SearchEvidenceRow => ({
      ...row,
      environment: classifySearchEvidenceEnvironment(row),
      channel: classifySearchEvidenceChannel(row),
    }))
    .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));

  const copyCounts = new Map<string, number>();
  const downloadCounts = new Map<string, number>();
  const favoriteCounts = new Map<string, number>();
  const replaceCounts = new Map<string, number>();
  const jobCategoryCounts = new Map<string, number>();
  const mcpAcceptance = new Map<string, { total: number; converged: number }>();
  const mcpBatchIds = new Set<string>();

  let copyEvents = 0;
  let favoriteEvents = 0;
  let kitDownloads = 0;

  for (const row of evidenceRows) {
    const signalType = String(row.signal_type || '').toLowerCase();
    const iconId = typeof row.icon_id === 'string' ? row.icon_id : null;
    const jobCategory = typeof row.job_category === 'string' ? row.job_category : null;
    const batchId = typeof row.batch_id === 'string' ? row.batch_id : null;
    const rowChannel = classifySearchEvidenceChannel(row);

    if (signalType === 'copy') {
      copyEvents += 1;
      if (iconId) {
        copyCounts.set(iconId, (copyCounts.get(iconId) || 0) + 1);
        if (typeof row.evidence_text === 'string' && row.evidence_text.startsWith('download:')) {
          downloadCounts.set(iconId, (downloadCounts.get(iconId) || 0) + 1);
        }
      }
    }

    if (signalType === 'favorite') {
      favoriteEvents += 1;
      if (iconId) {
        favoriteCounts.set(iconId, (favoriteCounts.get(iconId) || 0) + 1);
      }
    }

    if (signalType === 'kit_download') {
      kitDownloads += 1;
    }

    if (signalType === 'replace' && iconId) {
      replaceCounts.set(iconId, (replaceCounts.get(iconId) || 0) + 1);
    }

    if (rowChannel === 'hosted_mcp') {
      const eventId = batchId || (typeof row.id === 'string' ? row.id : null) || (typeof row.created_at === 'string' ? `${String(row.search_query || 'mcp')}:${row.created_at}` : null);
      if (eventId) mcpBatchIds.add(eventId);
    }

    if (signalType === 'mcp_call' && iconId && typeof row.agent_converged === 'boolean') {
      const current = mcpAcceptance.get(iconId) || { total: 0, converged: 0 };
      current.total += 1;
      if (row.agent_converged) current.converged += 1;
      mcpAcceptance.set(iconId, current);
    }

    if (jobCategory) {
      jobCategoryCounts.set(jobCategory, (jobCategoryCounts.get(jobCategory) || 0) + 1);
    }
  }

  const topIconIds = new Set<string>([
    ...copyCounts.keys(),
    ...downloadCounts.keys(),
    ...favoriteCounts.keys(),
  ]);

  const topIcons = [...topIconIds]
    .map((iconId) => {
      const copyCount = copyCounts.get(iconId) || 0;
      const downloadCount = downloadCounts.get(iconId) || 0;
      const favoriteCount = favoriteCounts.get(iconId) || 0;
      const replaceCount = replaceCounts.get(iconId) || 0;
      const mcpStats = mcpAcceptance.get(iconId);
      const popularityScore = copyCount + (downloadCount * 1.5) + (favoriteCount * 0.75);
      const retentionRate = copyCount > 0
        ? Math.max(0, 1 - (replaceCount / copyCount))
        : null;
      const mcpAcceptanceRate = mcpStats && mcpStats.total > 0
        ? mcpStats.converged / mcpStats.total
        : null;

      return {
        icon_id: iconId,
        copy_count: copyCount,
        download_count: downloadCount,
        favorite_count: favoriteCount,
        popularity_score: popularityScore,
        retention_rate: retentionRate,
        mcp_acceptance_rate: mcpAcceptanceRate,
      };
    });
  topIcons.sort((a, b) => {
    if (b.popularity_score !== a.popularity_score) return b.popularity_score - a.popularity_score;
    if (b.copy_count !== a.copy_count) return b.copy_count - a.copy_count;
    return a.icon_id.localeCompare(b.icon_id);
  });
  topIcons.splice(8);

  const topJobCategories = [...jobCategoryCounts.entries()]
    .sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      return a[0].localeCompare(b[0]);
    })
    .slice(0, 6)
    .map(([jobCategory, count]) => ({
      job_category: jobCategory,
      count,
    }));

  const topReplacedIcons = [...replaceCounts.entries()]
    .sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      return a[0].localeCompare(b[0]);
    })
    .slice(0, 6)
    .map(([iconId, replaceCount]) => ({
      icon_id: iconId,
      replace_count: replaceCount,
    }));

  const directSearchRows = filterEvidenceRowsByQueryOrigin(
    evidenceRows.filter((row) => String(row.signal_type || '') === 'search_attempt'),
    queryOrigin,
  );
  const searchMetrics = summarizeRawSearchAttempts(directSearchRows, knownSearchDefects);

  return jsonResponse(req, {
    overview: {
      window: {
        key: window.key,
        short_label: window.shortLabel,
        long_label: window.longLabel,
      },
      total_evidence_rows: evidenceRows.length,
      copy_events: copyEvents,
      copy_events_30d: copyEvents,
      favorite_events: favoriteEvents,
      favorite_events_30d: favoriteEvents,
      kit_downloads: kitDownloads,
      kit_downloads_30d: kitDownloads,
      mcp_batches: mcpBatchIds.size,
      mcp_batches_30d: mcpBatchIds.size,
      top_job_categories: topJobCategories,
      top_icons: topIcons.map((entry) => ({
        ...entry,
        copy_count_30d: entry.copy_count,
        download_count_30d: entry.download_count,
        favorite_count_30d: entry.favorite_count,
        popularity_score_30d: entry.popularity_score,
      })),
        top_replaced_icons: topReplacedIcons,
        recent_evidence: evidenceRows.slice(0, 12),
        search_metrics: searchMetrics,
        environment,
        channel,
        query_origin: queryOrigin,
      },
    metadata_coverage: {
      classified_icons: metadataCoverageResult.count || 0,
    },
  });
}

async function handleIntelligenceEvidence(req: Request, adminClient: SupabaseClient, url: URL) {
  const window = parseIntelligenceWindow(url);
  const since = getWindowSinceIso(window);
  const q = (url.searchParams.get('q') || '').trim().toLowerCase();
  const signalType = (url.searchParams.get('signal_type') || '').trim().toLowerCase();
  const page = parsePositiveInt(url.searchParams.get('page'), 1, 100000);
  const pageSize = parsePositiveInt(url.searchParams.get('page_size') || url.searchParams.get('limit'), 50, 100);
  const environment = parseQueryEnvironmentFilter(url);
  const channel = parseQueryChannelFilter(url);

  const evidenceRows = signalType === 'icon_request'
    ? await fetchIconRequestEvidenceRows(adminClient, since)
    : await fetchSearchEvidenceRows(adminClient, since);
  const data = filterEvidenceRowsByChannel(
    filterEvidenceRowsByEnvironment(
      evidenceRows,
      environment,
    ),
    channel,
  );

  const filteredEvidence = ((data || []) as Array<Record<string, unknown>>).filter((row) => {
    if (signalType && String(row.signal_type || '').toLowerCase() !== signalType) return false;
    if (!q) return true;
    const haystack = [
      row.icon_id,
      row.search_query,
      row.job_category,
      row.library_filter,
      row.result_count,
      row.ui_surface,
      row.country_code,
      row.ip_hash_prefix,
      row.api_key_hash_prefix,
      row.account_plan,
      row.subscription_status,
      row.audit_status,
      row.evidence_text,
    ].filter(Boolean).join(' ').toLowerCase();
    return haystack.includes(q);
  });
  const pageCount = Math.max(1, Math.ceil(filteredEvidence.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const start = (currentPage - 1) * pageSize;
  const evidence = filteredEvidence.slice(start, start + pageSize);

  return jsonResponse(req, {
    evidence,
    pagination: {
      page: currentPage,
      page_size: pageSize,
      total: filteredEvidence.length,
      page_count: pageCount,
    },
    window: {
      key: window.key,
      short_label: window.shortLabel,
      long_label: window.longLabel,
    },
    filters: {
      environment,
      channel,
    },
  });
}

async function handleIntelligenceSearch(req: Request, adminClient: SupabaseClient, url: URL) {
  const window = parseIntelligenceWindow(url);
  const since = getWindowSinceIso(window);
  const environment = parseQueryEnvironmentFilter(url);
  const channel = parseQueryChannelFilter(url);
  const rawData = await fetchSearchEvidenceRows(adminClient, since);
  const data = filterEvidenceRowsByChannel(filterEvidenceRowsByEnvironment(rawData, environment), channel);

  const querySet = new Set<string>();
  const attemptQuerySet = new Set<string>();
  const zeroResultQuerySet = new Set<string>();
  const lowResultQuerySet = new Set<string>();
  const attemptContextMap = new Map<string, {
    query: string;
    library_filter: string | null;
    job_category: string | null;
    attempt_count: number;
    zero_attempt_count: number;
    low_attempt_count: number;
    total_result_count: number;
    result_samples: number;
    minimum_result_count: number | null;
    last_seen: string | null;
  }>();
  const topQueryMap = new Map<string, {
    query: string;
    total_signals: number;
    successful_attempt_count: number;
    total_result_count: number;
    result_samples: number;
    copy_count: number;
    favorite_count: number;
    unique_icons: Set<string>;
    last_seen: string | null;
  }>();
  const topMcpMap = new Map<string, {
    query: string;
    batch_ids: Set<string>;
    converged_batches: Set<string>;
    result_rows: number;
    unique_icons: Set<string>;
    last_seen: string | null;
  }>();
  const topReplaceMap = new Map<string, {
    query: string;
    replace_count: number;
    unique_replacements: Set<string>;
    last_seen: string | null;
  }>();

  let searchAttempts = 0;
  let siteQuerySignals = 0;
  let mcpQueryBatches = 0;
  let replaceQuerySignals = 0;

  for (const row of (data || []) as Array<Record<string, unknown>>) {
    const normalizedQuery = normalizeSearchQuery(row.search_query);
    if (!normalizedQuery) continue;
    querySet.add(normalizedQuery);

    const createdAt = typeof row.created_at === 'string' ? row.created_at : null;
    const iconId = typeof row.icon_id === 'string' ? row.icon_id : null;
    const batchId = typeof row.batch_id === 'string' ? row.batch_id : null;
    const replacedWith = typeof row.replaced_with === 'string' ? row.replaced_with : null;
    const libraryFilter = typeof row.library_filter === 'string' ? row.library_filter : null;
    const jobCategory = typeof row.job_category === 'string' ? row.job_category : null;
    const signalType = String(row.signal_type || '').toLowerCase();
    const rowChannel = classifySearchEvidenceChannel(row);
    const rawResultCount = Number(row.result_count);
    const resultCount = Number.isFinite(rawResultCount) ? Math.max(0, Math.round(rawResultCount)) : null;

    if (signalType === 'search_attempt') {
      searchAttempts += 1;
      attemptQuerySet.add(normalizedQuery);

      const contextKey = [normalizedQuery, libraryFilter || 'all', jobCategory || 'all'].join('|');
      const entry = attemptContextMap.get(contextKey) || {
        query: normalizedQuery,
        library_filter: libraryFilter,
        job_category: jobCategory,
        attempt_count: 0,
        zero_attempt_count: 0,
        low_attempt_count: 0,
        total_result_count: 0,
        result_samples: 0,
        minimum_result_count: null,
        last_seen: null,
      };

      entry.attempt_count += 1;
      if (resultCount !== null) {
        entry.total_result_count += resultCount;
        entry.result_samples += 1;
        if (entry.minimum_result_count === null || resultCount < entry.minimum_result_count) {
          entry.minimum_result_count = resultCount;
        }
        if (resultCount === 0) {
          entry.zero_attempt_count += 1;
          zeroResultQuerySet.add(normalizedQuery);
        } else if (resultCount <= LOW_RESULT_THRESHOLD) {
          entry.low_attempt_count += 1;
          lowResultQuerySet.add(normalizedQuery);
        } else {
          const topEntry = topQueryMap.get(normalizedQuery) || {
            query: normalizedQuery,
            total_signals: 0,
            successful_attempt_count: 0,
            total_result_count: 0,
            result_samples: 0,
            copy_count: 0,
            favorite_count: 0,
            unique_icons: new Set<string>(),
            last_seen: null,
          };
          topEntry.total_signals += 1;
          topEntry.successful_attempt_count += 1;
          topEntry.total_result_count += resultCount;
          topEntry.result_samples += 1;
          if (!topEntry.last_seen || (createdAt && createdAt > topEntry.last_seen)) topEntry.last_seen = createdAt;
          topQueryMap.set(normalizedQuery, topEntry);
        }
      }
      if (!entry.last_seen || (createdAt && createdAt > entry.last_seen)) entry.last_seen = createdAt;
      attemptContextMap.set(contextKey, entry);
    }

    if (signalType === 'copy' || signalType === 'favorite') {
      siteQuerySignals += 1;
      const entry = topQueryMap.get(normalizedQuery) || {
        query: normalizedQuery,
        total_signals: 0,
        successful_attempt_count: 0,
        total_result_count: 0,
        result_samples: 0,
        copy_count: 0,
        favorite_count: 0,
        unique_icons: new Set<string>(),
        last_seen: null,
      };
      entry.total_signals += 1;
      if (signalType === 'copy') entry.copy_count += 1;
      if (signalType === 'favorite') entry.favorite_count += 1;
      if (iconId) entry.unique_icons.add(iconId);
      if (!entry.last_seen || (createdAt && createdAt > entry.last_seen)) entry.last_seen = createdAt;
      topQueryMap.set(normalizedQuery, entry);
    }

    if (rowChannel === 'hosted_mcp') {
      const entry = topMcpMap.get(normalizedQuery) || {
        query: normalizedQuery,
        batch_ids: new Set<string>(),
        converged_batches: new Set<string>(),
        result_rows: 0,
        unique_icons: new Set<string>(),
        last_seen: null,
      };
      entry.result_rows += 1;
      if (iconId) entry.unique_icons.add(iconId);
      const eventId = batchId || (typeof row.id === 'string' ? row.id : null) || (createdAt ? `${normalizedQuery}:${createdAt}` : null);
      if (eventId) {
        const beforeSize = entry.batch_ids.size;
        entry.batch_ids.add(eventId);
        if (entry.batch_ids.size > beforeSize) {
          mcpQueryBatches += 1;
        }
        if (signalType === 'mcp_call' && row.agent_converged === true) {
          entry.converged_batches.add(eventId);
        }
      }
      if (!entry.last_seen || (createdAt && createdAt > entry.last_seen)) entry.last_seen = createdAt;
      topMcpMap.set(normalizedQuery, entry);
    }

    if (signalType === 'replace') {
      replaceQuerySignals += 1;
      const entry = topReplaceMap.get(normalizedQuery) || {
        query: normalizedQuery,
        replace_count: 0,
        unique_replacements: new Set<string>(),
        last_seen: null,
      };
      entry.replace_count += 1;
      if (replacedWith) entry.unique_replacements.add(replacedWith);
      if (!entry.last_seen || (createdAt && createdAt > entry.last_seen)) entry.last_seen = createdAt;
      topReplaceMap.set(normalizedQuery, entry);
    }
  }

  const topQueries = [...topQueryMap.values()]
    .sort((a, b) => {
      if (b.total_signals !== a.total_signals) return b.total_signals - a.total_signals;
      if (b.favorite_count !== a.favorite_count) return b.favorite_count - a.favorite_count;
      return a.query.localeCompare(b.query);
    })
    .slice(0, 8)
    .map((entry) => ({
      query: entry.query,
      total_signals: entry.total_signals,
      successful_attempt_count: entry.successful_attempt_count,
      average_result_count: entry.result_samples > 0
        ? Number((entry.total_result_count / entry.result_samples).toFixed(2))
        : null,
      copy_count: entry.copy_count,
      favorite_count: entry.favorite_count,
      unique_icons: entry.unique_icons.size,
      last_seen: entry.last_seen,
    }));

  const topMcpQueries = [...topMcpMap.values()]
    .sort((a, b) => {
      if (b.batch_ids.size !== a.batch_ids.size) return b.batch_ids.size - a.batch_ids.size;
      if (b.result_rows !== a.result_rows) return b.result_rows - a.result_rows;
      return a.query.localeCompare(b.query);
    })
    .slice(0, 8)
    .map((entry) => ({
      query: entry.query,
      batch_count: entry.batch_ids.size,
      converged_batches: entry.converged_batches.size,
      result_rows: entry.result_rows,
      unique_icons: entry.unique_icons.size,
      last_seen: entry.last_seen,
    }));

  const topZeroResultQueries = [...attemptContextMap.values()]
    .filter((entry) => entry.zero_attempt_count > 0)
    .sort((a, b) => {
      if (b.zero_attempt_count !== a.zero_attempt_count) return b.zero_attempt_count - a.zero_attempt_count;
      if (b.attempt_count !== a.attempt_count) return b.attempt_count - a.attempt_count;
      if ((a.library_filter || '') !== (b.library_filter || '')) return (a.library_filter || '').localeCompare(b.library_filter || '');
      if ((a.job_category || '') !== (b.job_category || '')) return (a.job_category || '').localeCompare(b.job_category || '');
      return a.query.localeCompare(b.query);
    })
    .slice(0, 8)
    .map((entry) => ({
      query: entry.query,
      library_filter: entry.library_filter,
      job_category: entry.job_category,
      attempt_count: entry.attempt_count,
      zero_attempt_count: entry.zero_attempt_count,
      last_seen: entry.last_seen,
    }));

  const topLowResultQueries = [...attemptContextMap.values()]
    .filter((entry) => entry.zero_attempt_count === 0 && entry.low_attempt_count > 0)
    .sort((a, b) => {
      if (b.low_attempt_count !== a.low_attempt_count) return b.low_attempt_count - a.low_attempt_count;
      const aAverage = a.result_samples > 0 ? a.total_result_count / a.result_samples : Number.POSITIVE_INFINITY;
      const bAverage = b.result_samples > 0 ? b.total_result_count / b.result_samples : Number.POSITIVE_INFINITY;
      if (aAverage !== bAverage) return aAverage - bAverage;
      if ((a.library_filter || '') !== (b.library_filter || '')) return (a.library_filter || '').localeCompare(b.library_filter || '');
      if ((a.job_category || '') !== (b.job_category || '')) return (a.job_category || '').localeCompare(b.job_category || '');
      return a.query.localeCompare(b.query);
    })
    .slice(0, 8)
    .map((entry) => ({
      query: entry.query,
      library_filter: entry.library_filter,
      job_category: entry.job_category,
      low_attempt_count: entry.low_attempt_count,
      average_result_count: entry.result_samples > 0
        ? Number((entry.total_result_count / entry.result_samples).toFixed(2))
        : null,
      minimum_result_count: entry.minimum_result_count,
      last_seen: entry.last_seen,
    }));

  const topReplacementQueries = [...topReplaceMap.values()]
    .sort((a, b) => {
      if (b.replace_count !== a.replace_count) return b.replace_count - a.replace_count;
      return a.query.localeCompare(b.query);
    })
    .slice(0, 8)
    .map((entry) => ({
      query: entry.query,
      library_filter: 'all',
      job_category: null,
      replace_count: entry.replace_count,
      unique_replacements: entry.unique_replacements.size,
      last_seen: entry.last_seen,
    }));

  const queryReviews = await fetchQueryReviews(adminClient, [
    ...topZeroResultQueries,
    ...topLowResultQueries,
    ...topReplacementQueries,
  ]);

  return jsonResponse(req, {
    search_intelligence: {
      summary: {
        window: {
          key: window.key,
          short_label: window.shortLabel,
          long_label: window.longLabel,
        },
        unique_queries: attemptQuerySet.size || querySet.size,
        unique_queries_30d: attemptQuerySet.size || querySet.size,
        search_attempts: searchAttempts,
        search_attempts_30d: searchAttempts,
        site_query_signals: siteQuerySignals,
        site_query_signals_30d: siteQuerySignals,
        mcp_query_batches: mcpQueryBatches,
        mcp_query_batches_30d: mcpQueryBatches,
        zero_result_queries: zeroResultQuerySet.size,
        zero_result_queries_30d: zeroResultQuerySet.size,
        low_result_queries: [...lowResultQuerySet].filter((query) => !zeroResultQuerySet.has(query)).length,
        low_result_queries_30d: [...lowResultQuerySet].filter((query) => !zeroResultQuerySet.has(query)).length,
        replace_query_signals: replaceQuerySignals,
        replace_query_signals_30d: replaceQuerySignals,
        zero_result_tracking_available: searchAttempts > 0,
        query_review_feature_available: queryReviews.available,
        environment,
        channel,
      },
      top_queries: topQueries,
      top_mcp_queries: topMcpQueries,
      top_zero_result_queries: topZeroResultQueries.map((entry) => mergeQueryReview(entry, queryReviews.reviews)),
      top_low_result_queries: topLowResultQueries.map((entry) => mergeQueryReview(entry, queryReviews.reviews)),
      top_replacement_queries: topReplacementQueries.map((entry) => mergeQueryReview(entry, queryReviews.reviews)),
    },
  });
}

async function handleIntelligenceSearchQueue(req: Request, adminClient: SupabaseClient, url: URL) {
  const cacheKey = buildQueryQueueCacheKey(url);
  const payload = await queryQueueCache.getOrCreate(
    cacheKey,
    () => buildQueryQueuePayload(adminClient, url),
  );
  return jsonResponse(req, payload);
}

async function handleIntelligenceSearchDetail(req: Request, adminClient: SupabaseClient, url: URL) {
  const window = parseIntelligenceWindow(url);
  const since = getWindowSinceIso(window);
  const requestedQuery = normalizeSearchQuery(url.searchParams.get('query'));
  if (!requestedQuery) {
    return jsonResponse(req, { error: 'query is required' }, 400);
  }

  const requestedLibrary = normalizeReviewLibraryFilter(url.searchParams.get('library_filter'));
  const requestedJobCategory = normalizeReviewJobCategory(url.searchParams.get('job_category'));
  const environment = parseQueryEnvironmentFilter(url);
  const channel = parseQueryChannelFilter(url);
  const queryOrigin = parseQueryOriginFilter(url);
  const evidenceRows = filterEvidenceRowsByQueryOrigin(
    filterEvidenceRowsByChannel(
      filterEvidenceRowsByEnvironment(
        await fetchSearchEvidenceRows(adminClient, since),
        environment,
      ),
      channel,
    ),
    queryOrigin,
  );
  const contextEvidenceRows = evidenceRows.filter((row) => (
    normalizeSearchQuery(row.search_query) === requestedQuery
    && normalizeReviewLibraryFilter(row.library_filter) === requestedLibrary
    && normalizeReviewJobCategory(row.job_category) === requestedJobCategory
  ));
  const queryReviews = await fetchQueryReviews(adminClient, [{
    query: requestedQuery,
    library_filter: requestedLibrary,
    job_category: requestedJobCategory,
  }]);
  const summary = buildQueryWorkbenchRows(contextEvidenceRows, queryReviews.reviews)[0] || {
    query: requestedQuery,
    library_filter: requestedLibrary,
    job_category: requestedJobCategory,
    issue_types: [],
    attempt_count: 0,
    zero_attempt_count: 0,
    low_attempt_count: 0,
    clarification_attempt_count: 0,
    error_attempt_count: 0,
    average_result_count: null,
    minimum_result_count: null,
    replacement_count: 0,
    unique_replacements: 0,
    successful_signal_count: 0,
    copy_count: 0,
    favorite_count: 0,
    unique_icons: 0,
    mcp_batch_count: 0,
    mcp_converged_batches: 0,
    mcp_result_rows: 0,
    surfaces: [],
    domains: [],
    context_urls: [],
    session_count: 0,
    ip_hash_count: 0,
    ip_hash_prefixes: [],
    api_key_hash_count: 0,
    api_key_hash_prefixes: [],
    countries: [],
    registered_user_count: 0,
    pro_user_count: 0,
    account_plans: [],
    subscription_statuses: [],
    audit_sources: [],
    environments: [],
    channels: [],
    locales: [],
    library_modes: [],
    search_outcomes: [],
    confidence_labels: [],
    beta_cohorts: [],
    first_seen: null,
    last_seen: null,
    review_status: null,
    review_note: null,
    review_updated_at: null,
  };

  const resultCountHistory = contextEvidenceRows
    .filter((row) => String(row.signal_type || '').toLowerCase() === 'search_attempt')
    .sort((a, b) => String(a.created_at || '').localeCompare(String(b.created_at || '')))
    .map((row) => ({
      created_at: row.created_at || null,
      result_count: typeof row.result_count === 'number' ? row.result_count : Number(row.result_count ?? 0),
      library_filter: normalizeReviewLibraryFilter(row.library_filter),
      library_mode: row.library_mode || null,
      search_outcome: row.search_outcome || null,
      query_origin: row.query_origin || 'legacy_unknown',
      requested_limit: row.requested_limit ?? null,
      known_defect_id: row.known_defect_id || null,
      confidence_label: row.confidence_label || null,
      beta_cohort: row.beta_cohort || null,
      job_category: normalizeReviewJobCategory(row.job_category),
      ui_surface: row.ui_surface || null,
      note: row.evidence_text || null,
    }));

  const sortedRecentRows = [...contextEvidenceRows]
    .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
  const compactEvidenceRows = sortedRecentRows.slice(0, 75).map((row) => ({
    id: row.id || null,
    ...compactQueryEvidenceRow(row),
    session_hash: row.session_hash || null,
  }));

  const review = queryReviews.reviews.get(buildQueryReviewContextKey({
    query: requestedQuery,
    libraryFilter: requestedLibrary,
    jobCategory: requestedJobCategory,
  })) || null;

  let suggestedNextAction = 'Review query context';
  if (Number(summary.zero_attempt_count || 0) > 0) {
    suggestedNextAction = 'Check whether this needs an alias or a new icon';
  } else if (Number(summary.low_attempt_count || 0) > 0) {
    suggestedNextAction = 'Check whether aliases or ranking can improve weak results';
  } else if (Number(summary.replacement_count || 0) > 0) {
    suggestedNextAction = 'Review ranking because users replace this result';
  } else if (summary.review_status === 'resolved') {
    suggestedNextAction = 'Confirm this can stay resolved';
  }

  return jsonResponse(req, {
    query_detail: {
      summary,
      result_count_history: resultCountHistory,
      recent_evidence_rows: compactEvidenceRows,
      related_replacements: compactEvidenceRows.filter((row) => row.signal_type === 'replace'),
      related_copies: compactEvidenceRows.filter((row) => row.signal_type === 'copy'),
      related_favorites: compactEvidenceRows.filter((row) => row.signal_type === 'favorite'),
      review,
      suggested_next_action: suggestedNextAction,
    },
    window: {
      key: window.key,
      short_label: window.shortLabel,
      long_label: window.longLabel,
    },
    filters: {
      environment,
      channel,
      query_origin: queryOrigin,
    },
  });
}

async function handleIntelligenceSearchExport(req: Request, adminClient: SupabaseClient, url: URL) {
  const payload = await buildQueryQueuePayload(adminClient, url, { exportMode: true });
  const format = normalizeSearchQuery(url.searchParams.get('format')) || 'json';
  const exportPayload = {
    exported_at: new Date().toISOString(),
    ...payload,
  };

  if (format === 'csv') {
    const csv = queryRowsToCsv(payload.queries as Array<Record<string, unknown>>);
    return contentResponse(req, csv, 'text/csv; charset=utf-8', 'supericons-query-intelligence.csv');
  }

  if (format === 'agent_pack') {
    return jsonResponse(req, {
      agent_pack: buildAgentAnalysisPack(exportPayload),
    });
  }

  return jsonResponse(req, {
    export: exportPayload,
  });
}

async function handleIntelligenceSearchReview(req: Request, adminClient: SupabaseClient, body: JsonRecord) {
  try {
    const review = await upsertQueryReview(adminClient, body);
    queryQueueCache.clear();
    v2DashboardCache.clear();
    searchEventSnapshotCache.clear();
    return jsonResponse(req, {
      success: true,
      review,
    });
  } catch (error) {
    if (isMissingRelationError(error)) {
      return jsonResponse(req, { error: 'icon_query_reviews table is not available in this environment' }, 409);
    }

    const message = error instanceof Error ? error.message : String(error);
    const status = (
      message === 'query is required'
      || message.startsWith('status must be one of:')
    )
      ? 400
      : 500;

    return jsonResponse(req, { error: message }, status);
  }
}

async function handleUsersIndex(req: Request, adminClient: SupabaseClient, url: URL) {
  const q = (url.searchParams.get('q') || '').trim().toLowerCase();
  const planFilter = (url.searchParams.get('plan') || '').trim().toLowerCase();
  const statusFilter = (url.searchParams.get('status') || '').trim().toLowerCase();
  const providerFilter = (url.searchParams.get('provider') || '').trim().toLowerCase();
  const page = Math.max(1, Number.parseInt(url.searchParams.get('page') || '1', 10) || 1);

  const { users } = await listAllAuthUsers(adminClient);
  const userIds = users.map((user) => user.id);
  const [profiles, subscriptions, purchaseCounts, apiKeyCounts] = await Promise.all([
    fetchProfiles(adminClient, userIds),
    fetchSubscriptions(adminClient, userIds),
    fetchPurchaseCounts(adminClient, userIds),
    fetchApiKeyCounts(adminClient, userIds),
  ]);

  const enriched = users.map((user) => {
    const profile = (profiles.get(user.id) || null) as Record<string, unknown> | null;
    const subscription = (subscriptions.get(user.id) || null) as Record<string, unknown> | null;
    return {
      id: user.id,
      email: user.email || null,
      display_name: getDisplayName(user, profile),
      created_at: user.created_at || null,
      last_sign_in_at: user.last_sign_in_at || null,
      email_confirmed_at: user.email_confirmed_at || null,
      banned_until: user.banned_until || null,
      provider: formatProviderLabel(user),
      providers: summarizeProviders(user),
      plan: subscription?.plan || null,
      subscription_status: subscription?.status || 'free',
      current_period_end: subscription?.current_period_end || null,
      purchase_count: purchaseCounts.get(user.id) || 0,
      api_key_count: apiKeyCounts.get(user.id) || 0,
    };
  });

  const filtered = enriched.filter((user) => {
    if (q) {
      const haystack = [
        user.email,
        user.display_name,
        user.id,
      ].filter(Boolean).join(' ').toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    if (planFilter) {
      if (planFilter === 'free' && user.plan) return false;
      if (planFilter !== 'free' && String(user.plan || '').toLowerCase() !== planFilter) return false;
    }
    if (statusFilter && String(user.subscription_status || '').toLowerCase() !== statusFilter) return false;
    if (providerFilter && !user.providers.some((provider) => provider.toLowerCase() === providerFilter)) return false;
    return true;
  }).sort((a, b) => {
    const aTime = new Date(a.created_at || 0).getTime();
    const bTime = new Date(b.created_at || 0).getTime();
    return bTime - aTime;
  });

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const start = (currentPage - 1) * PAGE_SIZE;

  return jsonResponse(req, {
    users: filtered.slice(start, start + PAGE_SIZE),
    pagination: {
      page: currentPage,
      page_size: PAGE_SIZE,
      total: filtered.length,
      page_count: pageCount,
    },
    filters: {
      q,
      plan: planFilter,
      status: statusFilter,
      provider: providerFilter,
    },
  });
}

async function handleUserDetail(req: Request, adminClient: SupabaseClient, userId: string) {
  const snapshot = await fetchUserSnapshot(adminClient, userId);
  if (!snapshot) {
    return jsonResponse(req, { error: 'User not found' }, 404);
  }

  return jsonResponse(req, {
    user: {
      id: snapshot.user.id,
      email: snapshot.user.email || null,
      display_name: getDisplayName(snapshot.user, snapshot.profile as Record<string, unknown> | null),
      providers: summarizeProviders(snapshot.user),
      provider_label: formatProviderLabel(snapshot.user),
      created_at: snapshot.user.created_at || null,
      last_sign_in_at: snapshot.user.last_sign_in_at || null,
      email_confirmed_at: snapshot.user.email_confirmed_at || null,
      banned_until: snapshot.user.banned_until || null,
      profile: snapshot.profile,
      subscription: snapshot.subscription,
      purchases: snapshot.purchases,
      api_keys: snapshot.api_keys,
      audit_log: snapshot.audit_log,
    },
  });
}

async function handleAuditLog(req: Request, adminClient: SupabaseClient, url: URL) {
  const q = (url.searchParams.get('q') || '').trim().toLowerCase();
  const actionFilter = (url.searchParams.get('action') || '').trim().toLowerCase();
  const page = Math.max(1, Number.parseInt(url.searchParams.get('page') || '1', 10) || 1);

  const { data, error } = await adminClient
    .from('si_admin_audit_log')
    .select('id, action, outcome, target_id, target_email, note, error_text, payload, created_at')
    .order('created_at', { ascending: false })
    .limit(250);

  if (error) throw error;

  const filtered = ((data || []) as Array<Record<string, unknown>>).filter((row) => {
    if (actionFilter && String(row.action || '').toLowerCase() !== actionFilter) return false;
    if (q) {
      const haystack = [
        row.target_id,
        row.target_email,
        row.action,
        row.note,
        row.error_text,
      ].filter(Boolean).join(' ').toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const start = (currentPage - 1) * PAGE_SIZE;

  return jsonResponse(req, {
    audit_log: filtered.slice(start, start + PAGE_SIZE),
    pagination: {
      page: currentPage,
      page_size: PAGE_SIZE,
      total: filtered.length,
      page_count: pageCount,
    },
  });
}

async function handleSubscriptionCancel(req: Request, adminClient: SupabaseClient, subscriptionId: string) {
  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
    apiVersion: '2023-10-16',
  });

  const { data: subscription, error } = await adminClient
    .from('si_subscriptions')
    .select('id, user_id, stripe_subscription_id, stripe_customer_id, status, current_period_end, plan')
    .eq('id', subscriptionId)
    .maybeSingle();

  if (error) throw error;
  const subscriptionRecord = subscription as Record<string, unknown> | null;
  if (!subscriptionRecord) {
    return jsonResponse(req, { error: 'Subscription not found' }, 404);
  }

  const auditId = await insertAuditRow(
    adminClient,
    'subscription.cancel',
    String(subscriptionId),
    null,
    null,
    { subscription: subscriptionRecord },
  );

  try {
    if (!subscriptionRecord.stripe_subscription_id) {
      throw new Error('Subscription row is missing stripe_subscription_id');
    }

    await cancelStripeSubscription(stripe, String(subscriptionRecord.stripe_subscription_id));

    await updateAuditRow(adminClient, auditId, 'succeeded', {});
    return jsonResponse(req, { success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await updateAuditRow(adminClient, auditId, 'failed', { error_text: message });
    return jsonResponse(req, { error: message }, 500);
  }
}

async function handlePurchaseRevoke(req: Request, adminClient: SupabaseClient, purchaseId: string, note: string | null) {
  const { data: purchase, error } = await adminClient
    .from('si_purchases')
    .select('id, user_id, product_id, stripe_session_id, purchased_at, source, si_products(name, slug)')
    .eq('id', purchaseId)
    .maybeSingle();

  if (error) throw error;
  if (!purchase) {
    return jsonResponse(req, { error: 'Purchase not found' }, 404);
  }

  const auditId = await insertAuditRow(
    adminClient,
    'purchase.revoke',
    purchaseId,
    null,
    note,
    { purchase },
  );

  try {
    const { error: deleteError } = await adminClient
      .from('si_purchases')
      .delete()
      .eq('id', purchaseId);

    if (deleteError) throw deleteError;

    await updateAuditRow(adminClient, auditId, 'succeeded', {});
    return jsonResponse(req, { success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await updateAuditRow(adminClient, auditId, 'failed', { error_text: message });
    return jsonResponse(req, { error: message }, 500);
  }
}

async function handleApiKeyRevoke(req: Request, adminClient: SupabaseClient, apiKeyId: string, note: string | null) {
  const { data: apiKey, error } = await adminClient
    .from('si_api_keys')
    .select('id, user_id, key_prefix, label, created_at, last_used, revoked')
    .eq('id', apiKeyId)
    .maybeSingle();

  if (error) {
    if (isMissingRelationError(error)) {
      return jsonResponse(req, { error: 'si_api_keys table is not available in this environment' }, 409);
    }
    throw error;
  }

  const apiKeyRecord = apiKey as Record<string, unknown> | null;
  if (!apiKeyRecord) {
    return jsonResponse(req, { error: 'API key not found' }, 404);
  }

  const auditId = await insertAuditRow(
    adminClient,
    'api_key.revoke',
    apiKeyId,
    null,
    note,
    { api_key: apiKeyRecord },
  );

  try {
    if (apiKeyRecord.revoked) {
      await updateAuditRow(adminClient, auditId, 'succeeded', { note: note || 'API key already revoked' });
      return jsonResponse(req, { success: true, already_revoked: true });
    }

    const { error: updateError } = await adminClient
      .from('si_api_keys')
      .update({ revoked: true })
      .eq('id', apiKeyId)
      .eq('revoked', false);

    if (updateError) throw updateError;

    await updateAuditRow(adminClient, auditId, 'succeeded', {});
    return jsonResponse(req, { success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await updateAuditRow(adminClient, auditId, 'failed', { error_text: message });
    return jsonResponse(req, { error: message }, 500);
  }
}

async function handleBanToggle(req: Request, adminClient: SupabaseClient, userId: string, banned: boolean, note: string | null) {
  const snapshot = await fetchUserSnapshot(adminClient, userId);
  if (!snapshot) {
    return jsonResponse(req, { error: 'User not found' }, 404);
  }

  const action = banned ? 'user.ban' : 'user.unban';
  const auditId = await insertAuditRow(
    adminClient,
    action,
    userId,
    snapshot.user.email || null,
    note,
    summarizeSnapshot(snapshot),
  );

  try {
    const { error } = await adminClient.auth.admin.updateUserById(userId, {
      ban_duration: banned ? '876000h' : 'none',
    });
    if (error) throw error;

    await updateAuditRow(adminClient, auditId, 'succeeded', {});
    return jsonResponse(req, { success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await updateAuditRow(adminClient, auditId, 'failed', { error_text: message });
    return jsonResponse(req, { error: message }, 500);
  }
}

async function handleUserDelete(req: Request, adminClient: SupabaseClient, userId: string, body: JsonRecord) {
  const snapshot = await fetchUserSnapshot(adminClient, userId);
  if (!snapshot) {
    return jsonResponse(req, { error: 'User not found' }, 404);
  }

  const note = typeof body.note === 'string' ? body.note.trim() || null : null;
  const deleteStripeCustomerFlag = body.delete_stripe_customer === true;
  const email = snapshot.user.email || null;
  const auditId = await insertAuditRow(
    adminClient,
    'user.delete',
    userId,
    email,
    note,
    summarizeSnapshot(snapshot),
  );

  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
    apiVersion: '2023-10-16',
  });
  const warnings: string[] = [];

  try {
    const subscription = snapshot.subscription as Record<string, unknown> | null;
    const stripeSubscriptionId = typeof subscription?.stripe_subscription_id === 'string'
      ? subscription.stripe_subscription_id
      : null;
    const stripeCustomerId = typeof subscription?.stripe_customer_id === 'string'
      ? subscription.stripe_customer_id
      : null;
    const subscriptionStatus = typeof subscription?.status === 'string'
      ? subscription.status
      : null;

    if (stripeSubscriptionId && subscriptionStatus && DELETE_CANCELABLE_STATUSES.has(subscriptionStatus)) {
      await cancelStripeSubscription(stripe, stripeSubscriptionId);
    }

    if (deleteStripeCustomerFlag && stripeCustomerId) {
      await deleteStripeCustomer(stripe, stripeCustomerId);
    }

    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);
    if (deleteError) throw deleteError;

    if (email) {
      const emailResult = await sendEmail({
        to: email,
        ...buildAccountDeletedEmail({
          recipientEmail: email,
          dashboardUrl: getAppBaseUrl(),
        }),
      });
      if (!emailResult.ok) {
        warnings.push(`account_deleted_email_failed:${emailResult.reason}`);
      }
    }

    await updateAuditRow(adminClient, auditId, 'succeeded', {
      payload: {
        ...summarizeSnapshot(snapshot),
        delete_stripe_customer: deleteStripeCustomerFlag,
        warnings,
      },
    });

    return jsonResponse(req, { success: true, warnings });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await updateAuditRow(adminClient, auditId, 'failed', {
      error_text: message,
      payload: {
        ...summarizeSnapshot(snapshot),
        delete_stripe_customer: deleteStripeCustomerFlag,
        warnings,
      },
    });
    return jsonResponse(req, { error: message }, 500);
  }
}

export async function handleAdminApiRequest(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(req) });
  }

  const adminSecret = Deno.env.get('ADMIN_SECRET');
  const requestSecret = req.headers.get('x-admin-secret');
  if (!adminSecret || !requestSecret || !constantTimeTextEqual(requestSecret, adminSecret)) {
    return jsonResponse(req, { error: 'Forbidden' }, 403);
  }

  try {
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { url, segments } = parsePath(req);

    if (req.method === 'GET' && segments.length === 1 && segments[0] === 'stats') {
      return await handleStats(req, adminClient);
    }

    if (
      req.method === 'GET'
      && segments.length === 2
      && segments[0] === 'v2'
      && ['activity', 'overview', 'search', 'audience'].includes(segments[1])
    ) {
      return await handleDashboardV2(req, adminClient, url, segments[1]);
    }

    if (
      req.method === 'GET'
      && segments.length === 3
      && segments[0] === 'v2'
      && segments[1] === 'search'
      && segments[2] === 'events'
    ) {
      return await handleDashboardV2(req, adminClient, url, 'search-events');
    }

    if (
      req.method === 'POST'
      && segments.length === 3
      && segments[0] === 'v2'
      && segments[1] === 'search'
      && segments[2] === 'review'
    ) {
      const body = await req.json().catch(() => ({})) as JsonRecord;
      return await handleIntelligenceSearchReview(req, adminClient, body);
    }

    if (
      req.method === 'POST'
      && segments.length === 3
      && segments[0] === 'v2'
      && segments[1] === 'icon-requests'
      && segments[2] === 'review'
    ) {
      const body = await req.json().catch(() => ({})) as JsonRecord;
      return await handleDashboardV2IconRequestReview(req, adminClient, body);
    }

    if (req.method === 'GET' && segments.length === 1 && segments[0] === 'users') {
      return await handleUsersIndex(req, adminClient, url);
    }

    if (req.method === 'GET' && segments.length === 2 && segments[0] === 'users') {
      return await handleUserDetail(req, adminClient, segments[1]);
    }

    if (req.method === 'GET' && segments.length === 1 && segments[0] === 'audit-log') {
      return await handleAuditLog(req, adminClient, url);
    }

    if (req.method === 'GET' && segments.length === 2 && segments[0] === 'intelligence' && segments[1] === 'overview') {
      return await handleIntelligenceOverview(req, adminClient, url);
    }

    if (req.method === 'GET' && segments.length === 2 && segments[0] === 'intelligence' && segments[1] === 'search') {
      return await handleIntelligenceSearch(req, adminClient, url);
    }

    if (req.method === 'GET' && segments.length === 3 && segments[0] === 'intelligence' && segments[1] === 'search' && segments[2] === 'queue') {
      return await handleIntelligenceSearchQueue(req, adminClient, url);
    }

    if (req.method === 'GET' && segments.length === 3 && segments[0] === 'intelligence' && segments[1] === 'search' && segments[2] === 'dashboard') {
      return await handlePhaseADashboard(req, adminClient, url);
    }

    if (req.method === 'POST' && segments.length === 3 && segments[0] === 'intelligence' && segments[1] === 'search' && segments[2] === 'refresh-rollups') {
      return await handlePhaseARollupRefresh(req, adminClient);
    }

    if (req.method === 'GET' && segments.length === 3 && segments[0] === 'intelligence' && segments[1] === 'search' && segments[2] === 'query-detail') {
      return await handleIntelligenceSearchDetail(req, adminClient, url);
    }

    if (req.method === 'GET' && segments.length === 3 && segments[0] === 'intelligence' && segments[1] === 'search' && segments[2] === 'export') {
      return await handleIntelligenceSearchExport(req, adminClient, url);
    }

    if (req.method === 'GET' && segments.length === 2 && segments[0] === 'intelligence' && segments[1] === 'evidence') {
      return await handleIntelligenceEvidence(req, adminClient, url);
    }

    if (req.method === 'POST' && segments.length === 3 && segments[0] === 'intelligence' && segments[1] === 'search' && segments[2] === 'review') {
      const body = await req.json().catch(() => ({})) as JsonRecord;
      return await handleIntelligenceSearchReview(req, adminClient, body);
    }

    if (req.method === 'POST' && segments.length === 3 && segments[0] === 'users' && segments[2] === 'delete') {
      const body = await req.json().catch(() => ({})) as JsonRecord;
      return await handleUserDelete(req, adminClient, segments[1], body);
    }

    if (req.method === 'POST' && segments.length === 3 && segments[0] === 'users' && segments[2] === 'ban') {
      const body = await req.json().catch(() => ({})) as JsonRecord;
      const note = typeof body.note === 'string' ? body.note.trim() || null : null;
      return await handleBanToggle(req, adminClient, segments[1], true, note);
    }

    if (req.method === 'POST' && segments.length === 3 && segments[0] === 'users' && segments[2] === 'unban') {
      const body = await req.json().catch(() => ({})) as JsonRecord;
      const note = typeof body.note === 'string' ? body.note.trim() || null : null;
      return await handleBanToggle(req, adminClient, segments[1], false, note);
    }

    if (req.method === 'POST' && segments.length === 3 && segments[0] === 'subscriptions' && segments[2] === 'cancel') {
      return await handleSubscriptionCancel(req, adminClient, segments[1]);
    }

    if (req.method === 'POST' && segments.length === 3 && segments[0] === 'purchases' && segments[2] === 'revoke') {
      const body = await req.json().catch(() => ({})) as JsonRecord;
      const note = typeof body.note === 'string' ? body.note.trim() || null : null;
      return await handlePurchaseRevoke(req, adminClient, segments[1], note);
    }

    if (req.method === 'POST' && segments.length === 3 && segments[0] === 'api-keys' && segments[2] === 'revoke') {
      const body = await req.json().catch(() => ({})) as JsonRecord;
      const note = typeof body.note === 'string' ? body.note.trim() || null : null;
      return await handleApiKeyRevoke(req, adminClient, segments[1], note);
    }

    return jsonResponse(req, { error: 'Not found' }, 404);
  } catch (error) {
    console.error('admin-api error:', error);
    const message = formatAdminErrorMessage(error);
    return jsonResponse(req, { error: message }, 500);
  }
}

if (import.meta.main) {
  serve(handleAdminApiRequest);
}
