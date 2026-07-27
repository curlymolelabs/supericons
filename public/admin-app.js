const ADMIN_RUNTIME_CONFIG = window.__SI_ADMIN_RUNTIME__ || {};
const ADMIN_API_BASE = String(
  ADMIN_RUNTIME_CONFIG.apiBase
    || 'https://kcjmkakdhsqplvasgkjv.supabase.co/functions/v1/admin-api',
).replace(/\/+$/, '');
const ADMIN_API_MANAGED_AUTH = ADMIN_RUNTIME_CONFIG.managedAuth === true;
const ADMIN_SESSION_URL = `${ADMIN_API_BASE}/session`;
const CACHE_PREFIX = 'si_admin_dashboard_v2_cache';
const CACHE_TTL_MS = 30_000;
const REQUEST_TIMEOUT_MS = 15_000;
const AUTO_REFRESH_MS = Number(ADMIN_RUNTIME_CONFIG.autoRefreshMs) > 0
  ? Number(ADMIN_RUNTIME_CONFIG.autoRefreshMs)
  : 30_000;
const DEFAULT_ROW_LIMIT = 25;
const ROW_LIMIT_OPTIONS = [25, 50, 100];
const CHART_FONT_SIZE = 14;
const SERVER_PAGINATED_LISTS = new Set(['activity', 'queries', 'clients']);
const ICON_REQUEST_UI_SURFACES = new Set([
  'grid_empty_feedback',
  'grid_low_result_feedback',
  'sidebar_request',
]);
const ICON_REQUEST_SOURCE_LABELS = {
  grid_empty_feedback: 'No results',
  grid_low_result_feedback: 'Few results',
  sidebar_request: 'Sidebar',
};
const memoryCache = new Map();
let adminSecretMemory = '';
let managedSessionChecked = false;
let managedSessionReady = false;

const WINDOW_LABELS = {
  '1d': 'Last 24 hours',
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
  '1y': 'Last 12 months',
  all: 'All recorded history',
  custom: 'Custom date range',
};

const CHANNEL_LABELS = {
  all: 'All venues',
  web: 'Web',
  hosted_mcp: 'Hosted MCP',
  local_mcp: 'Local MCP',
  internal_test: 'Test',
  unknown: 'Unclassified',
};
const STANDARD_CHANNELS = ['web', 'hosted_mcp', 'local_mcp'];

const ORIGIN_LABELS = {
  agent_query: 'User query',
  recommend_variant: 'Recommendation subquery',
  icon_lookup: 'Exact icon lookup',
  legacy_unknown: 'Older telemetry',
  page_load: 'Page load',
  internal_test: 'Test',
  unknown: 'Unclassified',
};

const state = {
  activeSection: 'overview',
  filters: {
    window: '1d',
    from: '',
    to: '',
    channel: 'all',
    includeTest: false,
    q: '',
  },
  searchIncludeTest: false,
  explorerQuery: '',
  explorerIssue: '',
  topList: 'searched',
  searchChartMode: 'venue',
  showRegisteredEmails: false,
  rowLimits: {
    topList: DEFAULT_ROW_LIMIT,
    activity: DEFAULT_ROW_LIMIT,
    queries: DEFAULT_ROW_LIMIT,
    worklist: DEFAULT_ROW_LIMIT,
    iconRequests: DEFAULT_ROW_LIMIT,
    contact: DEFAULT_ROW_LIMIT,
    localAttribution: DEFAULT_ROW_LIMIT,
    registeredUsers: DEFAULT_ROW_LIMIT,
    clients: DEFAULT_ROW_LIMIT,
  },
  pages: {
    topList: 1,
    activity: 1,
    queries: 1,
    worklist: 1,
    iconRequests: 1,
    contact: 1,
    localAttribution: 1,
    registeredUsers: 1,
    clients: 1,
  },
  sorts: {},
  data: {
    activity: null,
    overview: null,
    search: null,
    audience: null,
    accounts: null,
  },
  dataKeys: {},
  errors: {},
  loading: new Set(),
  refreshedAt: null,
  refreshedFilterKey: '',
  refreshStartedAt: null,
  toastTimer: null,
  adminSecretPrompt: null,
  modalReturnFocus: null,
  savingRows: new Set(),
  requestToken: 0,
  endpointTokens: {},
  view: null,
  visibleQueryRows: [],
  autoRefreshEnabled: false,
  autoRefreshTimer: null,
};

function $(id) {
  return document.getElementById(id);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatNumber(value) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(number(value));
}

function formatPercent(value, digits = 0) {
  const parsed = number(value);
  const percentage = Math.abs(parsed) <= 1 ? parsed * 100 : parsed;
  return `${percentage.toFixed(digits)}%`;
}

function formatDate(value, withTime = false) {
  if (!value) return '-';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '-';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    ...(withTime ? { hour: 'numeric', minute: '2-digit' } : {}),
  }).format(date);
}

function formatRelativeDate(value) {
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return '-';
  const minutes = Math.max(0, Math.floor((Date.now() - time) / 60_000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days < 7 ? `${days}d ago` : formatDate(value);
}

function truncate(value, limit = 28) {
  const text = String(value ?? '');
  return text.length > limit ? `${text.slice(0, Math.max(1, limit - 3))}...` : text;
}

function normalizeList(value) {
  return Array.isArray(value) ? value : [];
}

function safeText(value, fallback = '-') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function rowLimit(key) {
  const value = Number(state.rowLimits[key]);
  return ROW_LIMIT_OPTIONS.includes(value) ? value : DEFAULT_ROW_LIMIT;
}

function currentPage(key) {
  return Math.max(1, Number(state.pages[key]) || 1);
}

function pageSequence(page, pageCount) {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, index) => index + 1);
  const pages = new Set([1, 2, 3, page - 1, page, page + 1, pageCount]);
  const ordered = [...pages].filter((value) => value >= 1 && value <= pageCount).sort((a, b) => a - b);
  const output = [];
  for (const value of ordered) {
    if (output.length && value - output[output.length - 1] > 1) output.push('ellipsis');
    output.push(value);
  }
  return output;
}

function iconSvg(name) {
  const paths = {
    collapse: '<path d="m6 14 6-6 6 6"/>',
    expand: '<path d="m6 10 6 6 6-6"/>',
    eye: '<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2.5"/>',
    eyeOff: '<path d="m3 3 18 18"/><path d="M10.6 6.2A11.8 11.8 0 0 1 12 6c6.5 0 10 6 10 6a18.4 18.4 0 0 1-2.2 3"/><path d="M6.6 6.6C3.6 8.4 2 12 2 12s3.5 6 10 6a10.6 10.6 0 0 0 3.4-.5"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 8h.01"/>',
  };
  return `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths[name] || ''}</svg>`;
}

function renderPagination(key, total, pageCount, page = currentPage(key)) {
  const element = document.querySelector(`[data-pagination="${key}"]`);
  if (!element) return;
  if (pageCount <= 1 || total <= rowLimit(key)) {
    element.innerHTML = '';
    element.hidden = true;
    return;
  }
  const safePage = Math.min(Math.max(1, page), pageCount);
  state.pages[key] = safePage;
  const start = (safePage - 1) * rowLimit(key) + 1;
  const end = Math.min(total, safePage * rowLimit(key));
  const pages = pageSequence(safePage, pageCount).map((value) => (
    value === 'ellipsis'
      ? '<span class="pagination-ellipsis" aria-hidden="true">...</span>'
      : `<button class="pagination-button${value === safePage ? ' active' : ''}" type="button" data-page-number="${value}"${value === safePage ? ' aria-current="page"' : ''}>${value}</button>`
  )).join('');
  element.hidden = false;
  element.innerHTML = `
    <span class="pagination-summary">${formatNumber(start)}-${formatNumber(end)} of ${formatNumber(total)}</span>
    <div class="pagination-pages">
      <button class="pagination-button pagination-step" type="button" data-page-prev aria-label="Previous page"${safePage === 1 ? ' disabled' : ''}>Previous</button>
      ${pages}
      <button class="pagination-button pagination-step" type="button" data-page-next aria-label="Next page"${safePage === pageCount ? ' disabled' : ''}>Next</button>
    </div>
  `;
}

function rowsForPage(key, rows, serverPagination = null) {
  const values = normalizeList(rows);
  if (serverPagination) {
    const page = number(serverPagination.page) || currentPage(key);
    const total = number(serverPagination.total) || values.length;
    const pageCount = number(serverPagination.page_count) || Math.max(1, Math.ceil(total / rowLimit(key)));
    renderPagination(key, total, pageCount, page);
    return values.slice(0, rowLimit(key));
  }
  const total = values.length;
  const pageCount = Math.max(1, Math.ceil(total / rowLimit(key)));
  const page = Math.min(currentPage(key), pageCount);
  state.pages[key] = page;
  renderPagination(key, total, pageCount, page);
  const start = (page - 1) * rowLimit(key);
  return values.slice(start, start + rowLimit(key));
}

function resetPages() {
  Object.keys(state.pages).forEach((key) => {
    state.pages[key] = 1;
  });
}

function maskIdentifier(value) {
  const identifier = String(value || '').trim();
  if (!identifier.includes('@')) return identifier ? `${identifier.slice(0, 8)}...` : 'Hidden';
  const [local, domain] = identifier.split('@');
  return `${local.slice(0, 1) || '*'}***@${domain}`;
}

function accountDirectoryRows() {
  return normalizeList(state.data.accounts?.users);
}

function isActiveProAccount(user) {
  return String(user?.plan || '').toLowerCase().includes('pro')
    && String(user?.subscription_status || 'active').toLowerCase() === 'active';
}

function accountSummary() {
  const rows = accountDirectoryRows();
  return {
    available: rows.length > 0,
    registered: number(state.data.accounts?.pagination?.total) || rows.length,
    pro: rows.filter(isActiveProAccount).length,
  };
}

function showToast(message, isError = false) {
  const toast = $('adminToast');
  if (!toast) return;
  window.clearTimeout(state.toastTimer);
  toast.textContent = message;
  toast.style.borderColor = isError ? 'var(--red)' : 'var(--line)';
  toast.classList.add('show');
  state.toastTimer = window.setTimeout(() => toast.classList.remove('show'), 3200);
}

function getAdminSecret() {
  if (ADMIN_API_MANAGED_AUTH) return '';
  return adminSecretMemory;
}

function setAdminSecret(secret) {
  if (ADMIN_API_MANAGED_AUTH) return;
  adminSecretMemory = String(secret || '').trim();
}

function setAdminSecretError(message = '') {
  const element = $('adminSecretError');
  if (!element) return;
  element.textContent = message;
  element.style.display = message ? 'block' : 'none';
}

function closeAdminSecretModal() {
  const modal = $('adminSecretModal');
  modal?.classList.remove('open');
  modal?.setAttribute('aria-hidden', 'true');
  if (state.modalReturnFocus instanceof HTMLElement) state.modalReturnFocus.focus();
  state.modalReturnFocus = null;
}

function openAdminSecretModal({ force = false, error = '' } = {}) {
  const existing = getAdminSecret();
  if (existing && !force) return Promise.resolve(existing);
  if (state.adminSecretPrompt?.promise) {
    setAdminSecretError(error);
    return state.adminSecretPrompt.promise;
  }

  const overlay = $('adminSecretModal');
  const input = $('adminSecretInput');
  const cancel = $('adminSecretCancelBtn');
  if (!overlay || !input) return Promise.reject(new Error('Admin sign-in is unavailable.'));

  overlay.classList.add('open');
  overlay.style.removeProperty('display');
  overlay.setAttribute('aria-hidden', 'false');
  state.modalReturnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  input.value = '';
  setAdminSecretError(error);
  if (cancel) cancel.hidden = !existing;
  requestAnimationFrame(() => input.focus());

  const promise = new Promise((resolve, reject) => {
    state.adminSecretPrompt = { promise: null, resolve, reject };
  });
  state.adminSecretPrompt.promise = promise;
  return promise;
}

async function ensureAdminSecret(force = false, error = '') {
  if (ADMIN_API_MANAGED_AUTH) {
    if (force) {
      managedSessionChecked = true;
      managedSessionReady = false;
    } else if (!managedSessionChecked) {
      const response = await fetch(ADMIN_SESSION_URL, {
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(formatApiErrorMessage(payload, response.status));
      managedSessionChecked = true;
      managedSessionReady = payload.authenticated === true;
    }
    if (managedSessionReady) {
      closeAdminSecretModal();
      return '';
    }
    return openAdminSecretModal({ force, error });
  }
  const existing = getAdminSecret();
  return existing && !force ? existing : openAdminSecretModal({ force, error });
}

async function submitAdminSecret(event) {
  event.preventDefault();
  const input = $('adminSecretInput');
  const submit = $('adminSecretSubmitBtn');
  const value = String(input?.value || '').trim();
  if (!value) {
    setAdminSecretError('Enter the current admin secret.');
    input?.focus();
    return;
  }

  if (ADMIN_API_MANAGED_AUTH) {
    if (submit?.disabled) return;
    if (submit) {
      submit.disabled = true;
      submit.textContent = 'Checking...';
    }
    setAdminSecretError('');
    try {
      const response = await fetch(ADMIN_SESSION_URL, {
        method: 'POST',
        cache: 'no-store',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ secret: value }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(formatApiErrorMessage(payload, response.status));
      managedSessionChecked = true;
      managedSessionReady = payload.authenticated === true;
      if (!managedSessionReady) throw new Error('The admin secret could not be confirmed.');
      input.value = '';
      closeAdminSecretModal();
      const pending = state.adminSecretPrompt;
      state.adminSecretPrompt = null;
      pending?.resolve('');
    } catch (error) {
      managedSessionChecked = true;
      managedSessionReady = false;
      if (input) input.value = '';
      setAdminSecretError(error.message || 'The admin secret could not be confirmed.');
      input?.focus();
    } finally {
      if (submit) {
        submit.disabled = false;
        submit.textContent = 'Open dashboard';
      }
    }
    return;
  }

  setAdminSecret(value);
  closeAdminSecretModal();
  setAdminSecretError('');
  const pending = state.adminSecretPrompt;
  state.adminSecretPrompt = null;
  pending?.resolve(value);
}

function cancelAdminSecret() {
  if (!getAdminSecret()) {
    setAdminSecretError('The admin secret is required.');
    return;
  }
  closeAdminSecretModal();
  const pending = state.adminSecretPrompt;
  state.adminSecretPrompt = null;
  pending?.reject(new Error('Admin sign-in canceled.'));
}

function formatApiErrorMessage(payload, status) {
  const fallback = `Request failed (${status}).`;
  const raw = payload?.error || payload?.message;
  if (!raw) return fallback;
  if (typeof raw === 'string') return raw;
  if (typeof raw !== 'object') return String(raw);
  const parts = [
    raw.message,
    raw.details,
    raw.hint,
    raw.code ? `code ${raw.code}` : '',
  ]
    .filter(Boolean)
    .map((value) => String(value).trim())
    .filter(Boolean);
  return parts.length > 0 ? parts.join(' - ') : fallback;
}

async function apiRequest(path, options = {}, retry = true) {
  const secret = await ensureAdminSecret();
  const method = String(options.method || 'GET').toUpperCase();
  const requestUrl = method === 'GET'
    ? `${ADMIN_API_BASE}${path}${path.includes('?') ? '&' : '?'}_ts=${Date.now()}`
    : `${ADMIN_API_BASE}${path}`;
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  if (options.signal) {
    if (options.signal.aborted) controller.abort();
    else options.signal.addEventListener('abort', () => controller.abort(), { once: true });
  }
  let response;
  try {
    response = await fetch(requestUrl, {
      ...options,
      method,
      cache: 'no-store',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(secret ? { 'x-admin-secret': secret } : {}),
        ...(options.headers || {}),
      },
    });
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error(`The ${method} request timed out after ${REQUEST_TIMEOUT_MS / 1000} seconds.`);
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
  let payload = {};
  try {
    payload = await response.json();
  } catch {
    payload = {};
  }
  if ([401, 403].includes(response.status) && retry) {
    if (ADMIN_API_MANAGED_AUTH) {
      managedSessionChecked = true;
      managedSessionReady = false;
    } else {
      setAdminSecret('');
    }
    await ensureAdminSecret(true, 'That secret was rejected. Enter the current admin secret.');
    return apiRequest(path, options, false);
  }
  if (!response.ok) {
    const error = new Error(formatApiErrorMessage(payload, response.status));
    error.status = response.status;
    throw error;
  }
  return payload;
}

function baseFilterParams({ forSearch = false, useSearchTestFilter = false } = {}) {
  const params = new URLSearchParams();
  params.set('window', state.filters.window);
  if (state.filters.window === 'custom') {
    params.set('from', state.filters.from);
    params.set('to', state.filters.to);
  }
  params.set('channel', state.filters.channel);
  params.set('include_test', String(
    forSearch || useSearchTestFilter
      ? state.searchIncludeTest
      : state.filters.includeTest,
  ));
  const query = forSearch
    ? [state.filters.q, state.explorerQuery].filter(Boolean).join(' ').trim()
    : state.filters.q;
  if (query) params.set('q', query);
  return params;
}

function activeFilterKey({ forSearch = false, useSearchTestFilter = false } = {}) {
  return baseFilterParams({ forSearch, useSearchTestFilter }).toString();
}

function beginDashboardView() {
  const id = window.crypto?.randomUUID
    ? window.crypto.randomUUID().replaceAll('-', '')
    : `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  state.view = {
    id,
    cutoff: new Date().toISOString(),
    filterKey: activeFilterKey(),
  };
}

function sharedParams({ forSearch = false, useSearchTestFilter = false, includeView = true } = {}) {
  const params = baseFilterParams({ forSearch, useSearchTestFilter });
  if (includeView && state.view) {
    params.set('view_id', state.view.id);
    params.set('data_cutoff', state.view.cutoff);
    params.set('filter_key', activeFilterKey({ forSearch, useSearchTestFilter }));
  }
  return params;
}

function endpointPath(endpoint, { includeView = true } = {}) {
  if (endpoint === 'accounts') return '/users?page=all';
  const params = sharedParams({
    forSearch: endpoint === 'search',
    useSearchTestFilter: endpoint === 'audience',
    includeView,
  });
  if (endpoint === 'activity') {
    params.set('page', String(currentPage('activity')));
    params.set('page_size', String(rowLimit('activity')));
  }
  if (endpoint === 'search') {
    params.set('page', String(currentPage('queries')));
    params.set('page_size', String(rowLimit('queries')));
    const sort = state.sorts.queries;
    if (sort?.key) {
      params.set('sort_by', sort.key);
      params.set('sort_direction', sort.direction);
    }
    if (state.explorerIssue) params.set('issue', state.explorerIssue);
  }
  if (endpoint === 'audience') {
    params.set('page', String(currentPage('clients')));
    params.set('page_size', String(rowLimit('clients')));
    const sort = state.sorts.clients;
    if (sort?.key) {
      params.set('sort_by', sort.key);
      params.set('sort_direction', sort.direction);
    }
  }
  return `/v2/${endpoint}?${params}`;
}

function endpointDataKey(endpoint) {
  return endpoint === 'accounts' ? 'accounts' : endpointPath(endpoint, { includeView: false });
}

function acceptsDashboardView(endpoint, payload) {
  if (endpoint === 'accounts') return true;
  const expectedFilterKey = activeFilterKey({
    forSearch: endpoint === 'search',
    useSearchTestFilter: endpoint === 'audience',
  });
  return Boolean(
    state.view
    && payload?.meta?.view_id === state.view.id
    && payload?.meta?.data_cutoff === state.view.cutoff
    && payload?.meta?.filter_key === expectedFilterKey
  );
}

function cacheKey(endpoint) {
  return `${CACHE_PREFIX}:${endpoint}:${endpointDataKey(endpoint)}`;
}

function readCache(endpoint) {
  let value = memoryCache.get(cacheKey(endpoint)) || null;
  if (!value && endpoint === 'overview') {
    try {
      value = JSON.parse(
        window.localStorage.getItem(cacheKey(endpoint))
          || window.sessionStorage.getItem(cacheKey(endpoint))
          || 'null',
      );
    } catch {
      value = null;
    }
  }
  if (!value || !value.payload || !Number.isFinite(value.savedAt)) return null;
  return value;
}

function writeCache(endpoint, payload) {
  const value = {
    payload,
    savedAt: Date.now(),
  };
  memoryCache.set(cacheKey(endpoint), value);
  if (endpoint === 'overview') {
    try {
      window.localStorage.setItem(cacheKey(endpoint), JSON.stringify({
        savedAt: value.savedAt,
        payload: {
          __partial: true,
          kpis: payload.kpis,
          series: payload.series,
          outage_spans: payload.outage_spans,
          meta: payload.meta,
        },
      }));
      window.sessionStorage.removeItem(cacheKey(endpoint));
    } catch {
      // The current page still uses its memory cache.
    }
  }
}

function clearActiveDashboardCache() {
  const activeKeys = new Set(
    ['activity', 'overview', 'search', 'audience', 'accounts'].map((endpoint) => cacheKey(endpoint)),
  );
  for (const key of memoryCache.keys()) {
    if (activeKeys.has(key)) memoryCache.delete(key);
  }
  for (const storage of [window.localStorage, window.sessionStorage]) {
    try {
      for (let index = storage.length - 1; index >= 0; index -= 1) {
        const key = storage.key(index);
        if (key && activeKeys.has(key)) storage.removeItem(key);
      }
    } catch {
      // A network refresh is sufficient when browser storage is unavailable.
    }
  }
}

function appliedWindowLabel() {
  if (state.filters.window !== 'custom') return WINDOW_LABELS[state.filters.window] || 'Selected period';
  if (!state.filters.from || !state.filters.to) return 'Custom date range';
  return `${formatDate(`${state.filters.from}T00:00:00Z`)} to ${formatDate(`${state.filters.to}T00:00:00Z`)}`;
}

function setFreshness() {
  const line = $('freshnessLine');
  if (!line) return;
  if (state.loading.size) {
    line.textContent = state.refreshedAt ? 'Refreshing production data' : 'Loading production data';
    return;
  }
  const failedEndpoints = Object.keys(state.errors);
  if (failedEndpoints.length) {
    const hasCurrentStaleData = failedEndpoints.some((endpoint) => (
      Boolean(state.data[endpoint])
      && state.dataKeys[endpoint] === endpointDataKey(endpoint)
    ));
    if (hasCurrentStaleData) {
      line.textContent = 'Some panels could not be updated; showing stale data';
    } else if (failedEndpoints.length === Object.keys(state.data).length) {
      line.textContent = 'Production data could not be loaded';
    } else {
      line.textContent = 'Some production data could not be loaded';
    }
    return;
  }
  if (!state.refreshedAt) {
    line.textContent = 'Waiting for production data';
    return;
  }
  const elapsed = Math.max(0, Date.now() - state.refreshStartedAt);
  const refreshedAt = new Date(state.refreshedAt);
  const stamp = Number.isFinite(refreshedAt.getTime())
    ? new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(refreshedAt)
    : '';
  line.textContent = stamp ? `Updated ${stamp}` : 'Up to date';
  line.title = `Loaded in ${formatNumber(elapsed)} ms`;
}

function setRefreshState() {
  const button = $('refreshButton');
  if (!button) return;
  const busy = state.loading.size > 0;
  button.disabled = busy;
  button.setAttribute('aria-busy', String(busy));
  button.textContent = busy ? 'Refreshing' : 'Refresh';
  setFreshness();
}

function emptyState(reason) {
  return `<div class="empty">${escapeHtml(reason)}</div>`;
}

function loadingState(label = 'Loading production data') {
  return `<div class="skeleton" role="status" aria-label="${escapeHtml(label)}" style="height:150px"></div>`;
}

function pill(label, tone = '') {
  return `<span class="pill ${escapeHtml(tone)}">${escapeHtml(label)}</span>`;
}

function channelLabel(value) {
  return CHANNEL_LABELS[String(value || '').toLowerCase()] || safeText(value, 'Unclassified');
}

function originLabel(value) {
  return ORIGIN_LABELS[String(value || '').toLowerCase()] || safeText(value, 'Unclassified');
}

function visitorLabel(row = {}) {
  const kind = String(row.visitor_kind || row.searcher_kind || row.kind || '').toLowerCase();
  const key = safeText(
    row.visitor_label
      || row.client_label
      || row.client_key
      || row.estimated_client_key
      || row.searcher_identifier
      || row.identifier,
    'Unknown',
  );
  if (kind === 'pro' || row.is_pro) return `${pill('PRO', 'pro')} ${escapeHtml(truncate(key, 18))}`;
  if (kind === 'registered' || row.is_registered) return `${pill('Registered', 'info')} ${escapeHtml(truncate(key, 18))}`;
  if (kind === 'api_key') return `${pill('API key', 'info')} ${escapeHtml(truncate(key, 18))}`;
  return `<span class="chip" title="Anonymous searcher">${escapeHtml(truncate(key, 18))}</span>`;
}

function activityDayLabel(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  const now = new Date();
  const dayText = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date).toUpperCase();
  if (date.toDateString() === now.toDateString()) return `TODAY · ${dayText}`;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return `YESTERDAY · ${dayText}`;
  return dayText;
}

function outcomeFor(row = {}) {
  const rawResultCount = row.result_count ?? row.results;
  const hasResultCount = rawResultCount !== null
    && rawResultCount !== undefined
    && Number.isFinite(Number(rawResultCount));
  const resultCount = hasResultCount ? Number(rawResultCount) : null;
  const outcome = String(row.issue_type || row.outcome || row.search_outcome || '').toLowerCase();
  const origin = String(row.query_origin || row.origin || '').toLowerCase();
  if (outcome.includes('error')) return { label: 'Error', tone: 'zero' };
  if (outcome.includes('clarification')) return { label: 'Clarification', tone: 'info' };
  if (origin === 'icon_lookup') {
    if (outcome.includes('mixed')) {
      return {
        label: safeText(row.outcome_label, 'Mixed lookup results'),
        tone: 'low',
      };
    }
    if (outcome.includes('not_found')) return { label: 'Not found', tone: 'low' };
    if (!hasResultCount) return { label: 'Lookup', tone: 'info' };
    return resultCount > 0
      ? { label: 'Success', tone: 'ok' }
      : { label: 'Not found', tone: 'low' };
  }
  if (outcome.includes('mixed')) {
    return {
      label: safeText(row.outcome_label, `Mixed: ${formatNumber(row.zero_attempt_count)} of ${formatNumber(row.attempt_count)} zero`),
      tone: 'low',
    };
  }
  if (outcome.includes('zero') || row.true_zero || (hasResultCount && resultCount === 0)) {
    return { label: safeText(row.outcome_label, 'Zero'), tone: 'zero' };
  }
  if (outcome.includes('low') || row.low_result) return { label: 'Low', tone: 'low' };
  if (outcome.includes('unknown')) return { label: safeText(row.outcome_label, 'Unknown'), tone: 'info' };
  return { label: safeText(row.outcome_label, 'Success'), tone: 'ok' };
}

function countWithUnit(value, unit = 'icon') {
  const count = number(value);
  const labels = {
    icon: ['icon', 'icons'],
    match: ['icon found', 'icons found'],
    primary_pick: ['recommendation', 'recommendations'],
  };
  const [singular, plural] = labels[unit] || labels.icon;
  return `${formatNumber(count)} ${count === 1 ? singular : plural}`;
}

function queryRequestCell(row = {}) {
  const count = number(row.activity_count ?? row.attempt_count);
  return `<span title="Top-level tool calls represented by this query summary">${formatNumber(count)}</span>`;
}

function queryEstimatedClientIdsCell(row = {}) {
  const count = number(row.estimated_client_id_count);
  return `<span title="Estimated client IDs are not people. One user may produce several IDs, and one ID may represent shared infrastructure.">${formatNumber(count)}</span>`;
}

function queryTypicalResultCell(row = {}) {
  if (row.typical_result_count === null || row.typical_result_count === undefined) {
    return `<span class="muted-cell">${escapeHtml(row.result_count_reason || 'Not recorded')}</span>`;
  }
  if (row.result_unit === 'match' && number(row.typical_result_count) === 0) {
    return 'Icon not found';
  }
  const range = row.result_count_min !== null && row.result_count_max !== null
    ? `Results ranged from ${formatNumber(row.result_count_min)} to ${formatNumber(row.result_count_max)}.`
    : '';
  const samples = number(row.result_sample_count);
  const detail = `${range}${range ? ' ' : ''}Median of ${formatNumber(samples)} recorded result ${samples === 1 ? 'count' : 'counts'}.`;
  return `<span title="${escapeHtml(detail)}">${escapeHtml(countWithUnit(row.typical_result_count, row.result_unit))}</span>`;
}

function queryEventResultCell(row = {}) {
  if (row.result_count === null || row.result_count === undefined) {
    return '<span class="muted-cell">Not recorded</span>';
  }
  if (row.result_unit === 'match' && number(row.result_count) === 0) {
    return 'Icon not found';
  }
  return escapeHtml(countWithUnit(row.result_count, row.result_unit));
}

function queryCountryCell(row = {}) {
  const countries = normalizeList(row.countries);
  const country = row.country_code || row.country;
  if (row.country_available === false || !country) {
    if (number(row.country_count) > 1) {
      return `<span title="${escapeHtml(countries.join(', ') || row.country_reason || 'Multiple countries across grouped activity')}">${pill(`${formatNumber(row.country_count)} countries`)}</span>`;
    }
    return `<span class="muted-cell">${escapeHtml(row.country_reason || 'Country not recorded')}</span>`;
  }
  if (row.country_scope !== 'current_day') return pill(country);
  return `<span title="Country recorded today within this grouped period">${pill(country)}</span>`;
}

function queryLocaleCell(row = {}) {
  const locales = normalizeList(row.locales);
  if (locales.length > 1) {
    return `<span title="${escapeHtml(locales.join(', '))}">${pill(`${formatNumber(locales.length)} languages`, 'info')}</span>`;
  }
  const locale = safeText(row.locale || locales[0], '');
  return locale
    ? pill(locale, 'info')
    : `<span class="muted-cell">${escapeHtml(row.locale_reason || 'Language not recorded')}</span>`;
}

function queryChannelCell(row = {}) {
  if (row.channel_available === false) {
    const channels = normalizeList(row.channels);
    if (channels.length > 1) {
      return `<span title="${escapeHtml(channels.map(channelLabel).join(', '))}">${pill(`${formatNumber(channels.length)} channels`, 'info')}</span>`;
    }
    return `<span class="muted-cell">${escapeHtml(row.channel_reason || 'Channel not recorded')}</span>`;
  }
  const channel = String(row.channel || row.venue || '').toLowerCase();
  if (channel === 'hosted_mcp') {
    return `<span class="muted-cell">${escapeHtml(channelLabel(channel))}</span>`;
  }
  return pill(channelLabel(row.channel || row.venue), 'info');
}

function demandActionValue(value) {
  const status = safeText(value, '');
  if (status === 'needs_icon') return 'add_icon';
  if (status === 'needs_alias') return 'add_alias';
  return status;
}

function sortableHeaders(headers) {
  return headers.filter((header) => header.sortKey);
}

function headerSortValue(header, row) {
  if (typeof header.sortValue === 'function') return header.sortValue(row);
  return row?.[header.sortKey];
}

// A blank, unlinked, or unparseable cell has no position on the scale. It is treated as
// missing so it never competes with real values in either direction.
function isMissingSortValue(value, type) {
  if (value === null || value === undefined || value === '') return true;
  if (type === 'date') return !Number.isFinite(new Date(value).getTime());
  if (type === 'number') return !Number.isFinite(Number(value));
  return false;
}

function compareSortValues(left, right, type) {
  if (type === 'date') return new Date(left).getTime() - new Date(right).getTime();
  if (type === 'number') return Number(left) - Number(right);
  return String(left).localeCompare(String(right), undefined, { numeric: true, sensitivity: 'base' });
}

function activeSort(tableKey, headers) {
  const sort = state.sorts[tableKey];
  if (!sort) return null;
  const header = sortableHeaders(headers).find((candidate) => candidate.sortKey === sort.key);
  return header ? { header, direction: sort.direction === 'asc' ? 'asc' : 'desc' } : null;
}

// Missing values always sort last so an empty column never masquerades as the smallest value.
function sortRows(tableKey, rows, headers) {
  const values = normalizeList(rows);
  const sort = activeSort(tableKey, headers);
  if (!sort) return values;
  const direction = sort.direction === 'asc' ? 1 : -1;
  const type = sort.header.sortType || 'text';
  return values
    .map((row, index) => ({ row, index }))
    .sort((left, right) => {
      const leftValue = headerSortValue(sort.header, left.row);
      const rightValue = headerSortValue(sort.header, right.row);
      const leftMissing = isMissingSortValue(leftValue, type);
      const rightMissing = isMissingSortValue(rightValue, type);
      // Direction is applied only to real values, so missing rows stay last either way.
      if (leftMissing || rightMissing) {
        if (leftMissing && rightMissing) return left.index - right.index;
        return leftMissing ? 1 : -1;
      }
      const result = compareSortValues(leftValue, rightValue, type) * direction;
      return result !== 0 ? result : left.index - right.index;
    })
    .map((entry) => entry.row);
}

function sortIndicator(direction) {
  const path = direction === 'asc' ? 'm5 12 5-5 5 5' : 'm5 8 5 5 5-5';
  return `<svg class="sort-icon" aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${path ? `<path d="${path}"/>` : ''}</svg>`;
}

function tableHeaderCell(header, tableKey, sort, sortDisabledReason) {
  const classes = [header.number ? 'number' : '', header.sortKey ? 'sortable' : ''].filter(Boolean).join(' ');
  if (!header.sortKey || !tableKey) {
    return `<th class="${classes}">${escapeHtml(header.label)}</th>`;
  }
  if (sortDisabledReason) {
    return `<th class="${classes} sort-unavailable" title="${escapeHtml(sortDisabledReason)}">${escapeHtml(header.label)}</th>`;
  }
  const isActive = sort && sort.header.sortKey === header.sortKey;
  const direction = isActive ? sort.direction : null;
  const nextDirection = isActive && direction === 'desc' ? 'asc' : 'desc';
  const ariaSort = isActive ? (direction === 'asc' ? 'ascending' : 'descending') : 'none';
  const hint = isActive
    ? `Sorted ${direction === 'asc' ? 'ascending' : 'descending'}. Click to sort ${nextDirection === 'asc' ? 'ascending' : 'descending'}.`
    : `Sort by ${header.label}`;
  return `<th class="${classes}${isActive ? ' sorted' : ''}" aria-sort="${ariaSort}">
    <button type="button" class="sort-button" data-sort-table="${escapeHtml(tableKey)}" data-sort-key="${escapeHtml(header.sortKey)}" title="${escapeHtml(hint)}">
      <span>${escapeHtml(header.label)}</span>${isActive ? sortIndicator(direction) : ''}
    </button>
  </th>`;
}

function table(headers, rows, emptyReason, { sortTableKey = '', sortDisabledReason = '' } = {}) {
  if (!rows.length) return emptyState(emptyReason);
  const sort = sortTableKey ? activeSort(sortTableKey, headers) : null;
  return `
    <table>
      <thead><tr>${headers.map((header) => tableHeaderCell(header, sortTableKey, sort, sortDisabledReason)).join('')}</tr></thead>
      <tbody>${rows.map((row, rowIndex) => `
        <tr>${headers.map((header) => `<td class="${header.number ? 'number' : ''}">${header.render(row, rowIndex)}</td>`).join('')}</tr>
      `).join('')}</tbody>
    </table>
  `;
}

// A server-sorted page keeps the order returned by the API. Other partial lists stay
// unsortable because reordering one page would misrepresent the complete list.
function sortedTableParts(tableKey, headers, rows, { serverPagination = null, serverSorting = false } = {}) {
  const values = normalizeList(rows);
  const total = serverPagination ? number(serverPagination.total) || values.length : values.length;
  const partialServerPage = Boolean(serverPagination) && total > values.length;
  const sortDisabledReason = partialServerPage && !serverSorting
    ? `Sorting needs the complete list. This view loads ${formatNumber(values.length)} of ${formatNumber(total)} rows per page. Raise "Rows" or narrow the filters to sort.`
    : '';
  const ordered = partialServerPage ? values : sortRows(tableKey, values, headers);
  return {
    rows: rowsForPage(tableKey, ordered, serverPagination),
    tableOptions: { sortTableKey: tableKey, sortDisabledReason },
  };
}

function sortedTable(tableKey, headers, rows, emptyReason, options = {}) {
  const parts = sortedTableParts(tableKey, headers, rows, options);
  return table(headers, parts.rows, emptyReason, parts.tableOptions);
}

function setSort(tableKey, sortKey) {
  const current = state.sorts[tableKey];
  const direction = current && current.key === sortKey && current.direction === 'desc' ? 'asc' : 'desc';
  state.sorts[tableKey] = { key: sortKey, direction };
  state.pages[tableKey] = 1;
  if (SERVER_PAGINATED_LISTS.has(tableKey)) refreshListEndpoint(tableKey);
  else renderAll();
}

function csvCell(value) {
  const raw = String(value ?? '');
  const text = /^[\u0000-\u0020]*[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return `"${text.replaceAll('"', '""')}"`;
}

function toCsv(rows) {
  if (!rows.length) return '';
  const keys = [...new Set(rows.flatMap((row) => Object.keys(row || {})))];
  return [
    keys.map(csvCell).join(','),
    ...rows.map((row) => keys.map((key) => {
      const value = row?.[key];
      return csvCell(Array.isArray(value) || (value && typeof value === 'object') ? JSON.stringify(value) : value);
    }).join(',')),
  ].join('\r\n');
}

function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function exportRows(filename, rows, format = 'csv') {
  const cleanRows = normalizeList(rows);
  if (!cleanRows.length) {
    showToast('There is no data to export for this view.', true);
    return;
  }
  if (format === 'json') {
    downloadFile(`${filename}.json`, JSON.stringify(cleanRows, null, 2), 'application/json');
  } else {
    downloadFile(`${filename}.csv`, toCsv(cleanRows), 'text/csv;charset=utf-8');
  }
}

function plainExportRow(row = {}) {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [
    key,
    Array.isArray(value) ? value.join('|') : value,
  ]));
}

const SEARCH_EXPORT_SCHEMA_VERSION = '4.1';

function searchExportPeriod() {
  const labels = {
    '1d': '24h',
    '7d': '7d',
    '30d': '30d',
    '90d': '90d',
    '1y': '12m',
    all: 'all-time',
  };
  if (state.filters.window === 'custom') {
    return {
      key: 'custom',
      label: `${state.filters.from}-to-${state.filters.to}`,
      from: state.filters.from || null,
      to: state.filters.to || null,
    };
  }
  return {
    key: state.filters.window,
    label: labels[state.filters.window] || state.filters.window,
    from: null,
    to: null,
  };
}

function searchExportTimestampToken(value = new Date().toISOString()) {
  return String(value)
    .replace(/\.\d{3}Z$/, 'Z')
    .replaceAll(':', '')
    .replaceAll('-', '');
}

function searchExportBaseName(type, generatedAt) {
  const period = searchExportPeriod().label
    .replace(/[^a-z0-9-]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
  const names = {
    search_summary: 'supericons-search-summary',
    request_log: 'supericons-request-log',
    audit_bundle: 'supericons-audit-bundle',
  };
  return `${names[type] || `supericons-search-${type}`}-${period}-${searchExportTimestampToken(generatedAt)}`;
}

function searchExportFilters() {
  return {
    channel: state.filters.channel,
    include_test: state.searchIncludeTest,
    query: [state.filters.q, state.explorerQuery].filter(Boolean).join(' ').trim() || null,
    outcome: state.explorerIssue || null,
  };
}

function searchSummaryCsvRow(row = {}) {
  const requestCount = number(row.activity_count ?? row.attempt_count);
  const lookupRow = String(row.query_origin || row.origin || '').toLowerCase() === 'icon_lookup';
  return {
    query: row.query,
    library_filter: row.library_filter,
    query_origin: row.query_origin,
    tool: normalizeList(row.tools).join('|'),
    searches: lookupRow ? 0 : requestCount,
    lookups: lookupRow ? requestCount : 0,
    distinct_searcher_ids: number(row.estimated_client_id_count),
    outcome: row.outcome_label || outcomeFor(row).label,
    success_count: number(row.successful_attempt_count) + number(row.lookup_success_count),
    zero_count: number(row.zero_attempt_count),
    low_count: number(row.low_attempt_count),
    not_found_count: number(row.lookup_not_found_count),
    error_count: number(row.error_attempt_count) + number(row.lookup_error_count),
    typical_result_count: row.typical_result_count,
    result_unit: row.result_unit,
    country_codes: normalizeList(row.countries).join('|'),
    interface_locales: normalizeList(row.interface_locales).join('|'),
    channel: normalizeList(row.channels).join('|') || row.channel,
    first_seen_utc: row.first_seen,
    last_seen_utc: row.last_seen,
  };
}

function requestLogCsvRow(row = {}) {
  return {
    event_id: row.event_identifier,
    episode_id: row.episode_id,
    recovery_chain_id: row.recovery_chain_id,
    recorded_at_utc: row.recorded_at,
    query: row.query,
    query_origin: row.query_origin,
    tool_name: row.tool_name,
    outcome: row.outcome,
    status: row.status,
    error_code: row.error_code,
    library_filter: row.library_filter,
    library_mode: row.library_mode,
    locale: row.locale,
    interface_locale: row.interface_locale,
    requested_limit: row.requested_limit,
    result_count: row.result_count,
    returned_icon_refs: normalizeList(row.returned_icon_refs).join('|'),
    returned_icon_refs_recorded: row.returned_icon_refs_recorded,
    latency_ms: row.latency_ms,
    search_execution: row.search_execution,
    diagnostic_attempt_count: row.diagnostic_attempt_count,
    server_version: row.server_version,
    server_build: row.server_build,
    traffic_class: row.traffic_class,
    channel: row.channel,
    environment: row.environment,
    client_family: row.client_family,
    estimated_client_id: row.searcher_identifier,
    country_code: row.country_code,
    geo_source: row.geo_source,
    registered: row.registered,
    pro: row.pro,
    identity_quality: row.identity_quality,
  };
}

function searchSummaryKey(row = {}) {
  return JSON.stringify([
    safeText(row.query, '').toLowerCase(),
    safeText(row.library_filter, 'all').toLowerCase(),
    safeText(row.query_origin, 'legacy_unknown').toLowerCase(),
  ]);
}

function searchAuditIntegrity(
  summaryRows,
  topLevelEvents,
  webSearchEvents,
  diagnostics,
  sourceReconciliation,
) {
  const summaries = normalizeList(summaryRows);
  const primaryEvents = [...normalizeList(topLevelEvents), ...normalizeList(webSearchEvents)];
  const groupablePrimaryEvents = primaryEvents.filter((row) => safeText(row.query, '').trim());
  const summaryRequestCount = summaries.reduce(
    (sum, row) => sum + number(row.activity_count),
    0,
  );
  const zeroRequestRows = summaries.filter((row) => number(row.activity_count) <= 0);
  const summaryKeys = summaries.map(searchSummaryKey);
  const duplicateSummaryKeys = summaryKeys.length - new Set(summaryKeys).size;
  const identifiers = primaryEvents
    .map((row) => safeText(row.event_identifier, '').trim())
    .filter(Boolean);
  const duplicateIdentifiers = identifiers.length - new Set(identifiers).size;
  const missingIdentifiers = primaryEvents.length - identifiers.length;
  const unexpectedPrimaryRoles = primaryEvents.filter((row) => (
    !['top_level', 'web_top_level'].includes(String(row.event_role || ''))
  )).length;
  const unexpectedDiagnosticRoles = normalizeList(diagnostics).filter((row) => (
    String(row.event_role || '') !== 'diagnostic'
  )).length;
  const outcomeComponentCount = (row) => (
    number(row.successful_attempt_count)
    + number(row.zero_attempt_count)
    + number(row.low_attempt_count)
    + number(row.error_attempt_count)
    + number(row.clarification_attempt_count)
    + number(row.unknown_attempt_count)
    + number(row.lookup_success_count)
    + number(row.lookup_not_found_count)
    + number(row.lookup_error_count)
    + number(row.lookup_unknown_count)
  );
  const componentGapRows = summaries.filter((row) => (
    outcomeComponentCount(row) !== number(row.activity_count)
  ));
  const falseSuccessRows = summaries.filter((row) => (
    safeText(row.outcome_label).toLowerCase() === 'success'
    && number(row.successful_attempt_count) + number(row.lookup_success_count)
      !== number(row.activity_count)
  ));
  const unclassifiedSummaryRows = summaries.filter((row) => (
    number(row.unknown_attempt_count) > 0
    || number(row.lookup_unknown_count) > 0
  ));
  const positiveResultUnrecordedRefRows = normalizeList(topLevelEvents).filter((row) => (
    number(row.result_count) > 0
    && row.returned_icon_refs_recorded !== true
  ));
  const recordedPositiveResultMissingRefRows = normalizeList(topLevelEvents).filter((row) => (
    number(row.result_count) > 0
    && row.returned_icon_refs_recorded === true
    && normalizeList(row.returned_icon_refs).length === 0
  ));
  const untruthfulSearcherDetailRows = summaries.filter((row) => (
    row.searcher_details_available === true
    && normalizeList(row.searchers).length === 0
    && number(row.estimated_client_id_count) > 0
  ));
  const suspiciousQueryTextRows = primaryEvents.filter((row) => {
    const query = safeText(row.query);
    return /\?{2,}/u.test(query) || /[\p{L}]\?[\p{L}]/u.test(query);
  });
  const structuralChecks = {
    summary_rows_have_requests: zeroRequestRows.length === 0,
    summary_request_count_matches_primary_events: summaryRequestCount === groupablePrimaryEvents.length,
    summary_grain_is_unique: duplicateSummaryKeys === 0,
    request_event_ids_are_unique: duplicateIdentifiers === 0,
    request_event_ids_are_recorded: missingIdentifiers === 0,
    request_roles_are_valid: unexpectedPrimaryRoles === 0,
    diagnostic_roles_are_valid: unexpectedDiagnosticRoles === 0,
    source_reconciliation_passes: sourceReconciliation?.status === 'passed',
  };
  const semanticChecks = {
    summary_outcome_components_reconcile: componentGapRows.length === 0,
    success_labels_match_success_counts: falseSuccessRows.length === 0,
    summary_has_no_unclassified_requests: unclassifiedSummaryRows.length === 0,
    recorded_positive_results_have_returned_refs: recordedPositiveResultMissingRefRows.length === 0,
    searcher_detail_availability_is_truthful: untruthfulSearcherDetailRows.length === 0,
  };
  const checks = { ...structuralChecks, ...semanticChecks };
  const structuralStatus = Object.values(structuralChecks).every(Boolean)
    ? 'passed'
    : 'needs_attention';
  const semanticStatus = Object.values(semanticChecks).every(Boolean)
    ? 'passed'
    : 'needs_attention';
  return {
    status: structuralStatus === 'passed' && semanticStatus === 'passed'
      ? 'passed'
      : 'needs_attention',
    structural_status: structuralStatus,
    semantic_status: semanticStatus,
    checks,
    warnings: {
      suspicious_query_text_patterns: suspiciousQueryTextRows.length,
      positive_result_refs_not_recorded: positiveResultUnrecordedRefRows.length,
    },
    counts: {
      search_summary_rows: summaries.length,
      summary_requests: summaryRequestCount,
      groupable_primary_events: groupablePrimaryEvents.length,
      request_log_rows: normalizeList(topLevelEvents).length,
      web_searches: normalizeList(webSearchEvents).length,
      diagnostics: normalizeList(diagnostics).length,
      zero_request_summary_rows: zeroRequestRows.length,
      duplicate_summary_keys: duplicateSummaryKeys,
      duplicate_request_event_ids: duplicateIdentifiers,
      missing_request_event_ids: missingIdentifiers,
      unexpected_request_roles: unexpectedPrimaryRoles,
      unexpected_diagnostic_roles: unexpectedDiagnosticRoles,
      outcome_component_gap_rows: componentGapRows.length,
      false_success_rows: falseSuccessRows.length,
      unclassified_summary_rows: unclassifiedSummaryRows.length,
      positive_result_refs_not_recorded: positiveResultUnrecordedRefRows.length,
      recorded_positive_result_missing_ref_rows: recordedPositiveResultMissingRefRows.length,
      untruthful_searcher_detail_rows: untruthfulSearcherDetailRows.length,
      suspicious_query_text_rows: suspiciousQueryTextRows.length,
    },
    source_reconciliation: sourceReconciliation || {
      status: 'not_available',
    },
  };
}

function setSkeleton(element, text) {
  if (!element) return;
  element.classList.remove('skeleton');
  element.textContent = text;
}

const CHART_COLORS = ['#ff5a1f', '#76a9ff', '#6dd6a0', '#f6c75b', '#c79cff', '#ff7c73'];

function chartRows(series) {
  if (Array.isArray(series)) return series;
  if (Array.isArray(series?.daily)) return series.daily;
  if (Array.isArray(series?.rows)) return series.rows;
  return [];
}

function aggregateDays(series, fields) {
  const rows = chartRows(series);
  const allRows = rows.filter((row) => String(row.channel || row.venue || '') === 'all');
  const source = allRows.length ? allRows : rows;
  const days = new Map();
  for (const row of source) {
    const day = String(row.day || row.date || '').slice(0, 10);
    if (!day) continue;
    const current = days.get(day) || { day };
    for (const field of fields) {
      if (row[field] === null || row[field] === undefined) continue;
      current[field] = number(current[field]) + number(row[field]);
    }
    days.set(day, current);
  }
  return [...days.values()].sort((a, b) => a.day.localeCompare(b.day));
}

function chartUnavailable(reason) {
  return `<div class="chart-empty">${escapeHtml(reason)}</div>`;
}

function linePath(points, xFor, yFor, field) {
  let drawing = false;
  return points.map((row, index) => {
    if (row[field] === null || row[field] === undefined || !Number.isFinite(Number(row[field]))) {
      drawing = false;
      return '';
    }
    const command = drawing ? 'L' : 'M';
    drawing = true;
    return `${command} ${xFor(index).toFixed(2)} ${yFor(number(row[field])).toFixed(2)}`;
  }).filter(Boolean).join(' ');
}

function axisLabels(points, xFor, width, height, left, bottom) {
  if (!points.length) return '';
  const indexes = [...new Set([0, Math.floor((points.length - 1) / 2), points.length - 1])];
  return indexes.map((index) => `
    <text x="${xFor(index)}" y="${height - 7}" text-anchor="${index === 0 ? 'start' : index === points.length - 1 ? 'end' : 'middle'}" fill="#c7c4c1" font-size="${CHART_FONT_SIZE}">${escapeHtml(formatDate(`${points[index].day}T00:00:00Z`))}</text>
  `).join('') + `
    <line x1="${left}" x2="${width - 8}" y1="${bottom}" y2="${bottom}" stroke="#302f2f" />
  `;
}

function renderLineChart(element, series, lines, options = {}) {
  if (!element) return;
  const points = aggregateDays(series, lines.map((line) => line.field));
  if (!points.length) {
    element.innerHTML = chartUnavailable(options.emptyReason || 'No chart data exists for this period.');
    return;
  }
  const width = Math.max(320, Math.round(element.clientWidth || 520));
  const height = 240;
  const left = 54;
  const right = 16;
  const top = 28;
  const bottom = 205;
  const plottedValues = points.flatMap((row) => lines.map((line) => row[line.field]))
    .filter((value) => value !== null && value !== undefined && Number.isFinite(Number(value)))
    .map(number);
  if (!plottedValues.length) {
    element.innerHTML = chartUnavailable(options.emptyReason || 'No eligible chart data exists for this period.');
    return;
  }
  const maxValue = Math.max(1, ...plottedValues);
  const xFor = (index) => left + (index * (width - left - right) / Math.max(1, points.length - 1));
  const yFor = (value) => bottom - (number(value) / maxValue) * (bottom - top);
  const grid = [0, 0.5, 1].map((ratio) => {
    const y = yFor(maxValue * ratio);
    return `<line x1="${left}" x2="${width - right}" y1="${y}" y2="${y}" stroke="#302f2f" stroke-dasharray="3 5" />
      <text x="${left - 9}" y="${y + 5}" text-anchor="end" fill="#c7c4c1" font-size="${CHART_FONT_SIZE}">${escapeHtml(options.percent ? formatPercent(maxValue * ratio, 0) : formatNumber(maxValue * ratio))}</text>`;
  }).join('');
  const outageSpans = normalizeList(options.outageSpans).map((span) => {
    const start = points.findIndex((row) => row.day >= String(span.from || span.start || '').slice(0, 10));
    const endIndex = points.findLastIndex((row) => row.day <= String(span.to || span.end || '').slice(0, 10));
    if (start < 0 || endIndex < 0) return '';
    const x1 = xFor(start);
    const x2 = xFor(Math.max(start, endIndex));
    return `<rect x="${x1}" y="${top}" width="${Math.max(7, x2 - x1 + 7)}" height="${bottom - top}" fill="rgba(255,124,115,0.08)" />
      <text x="${x1 + 4}" y="${top + 14}" fill="#ff7c73" font-size="${CHART_FONT_SIZE}">${escapeHtml(span.label || 'Outage')}</text>`;
  }).join('');
  const paths = lines.map((line, index) => {
    const color = line.color || CHART_COLORS[index % CHART_COLORS.length];
    return `
      <path d="${linePath(points, xFor, yFor, line.field)}" fill="none" stroke="${color}" stroke-width="2.5" />
      ${points.map((row, pointIndex) => (
        row[line.field] === null || row[line.field] === undefined || !Number.isFinite(Number(row[line.field]))
          ? ''
          : `<circle cx="${xFor(pointIndex)}" cy="${yFor(row[line.field])}" r="2.4" fill="${color}"><title>${escapeHtml(`${row.day}: ${line.label} ${options.percent ? formatPercent(row[line.field], 1) : formatNumber(row[line.field])}`)}</title></circle>`
      )).join('')}
    `;
  }).join('');
  const legendSlot = Math.max(150, (width - left - right) / Math.max(1, lines.length));
  const legend = lines.map((line, index) => {
    const color = line.color || CHART_COLORS[index % CHART_COLORS.length];
    return `<g transform="translate(${left + index * legendSlot},7)"><circle cx="5" cy="6" r="4" fill="${color}"/><text x="15" y="11" fill="#c7c4c1" font-size="${CHART_FONT_SIZE}">${escapeHtml(line.label)}</text></g>`;
  }).join('');
  element.innerHTML = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(options.label || 'Trend chart')}">${grid}${outageSpans}${paths}${legend}${axisLabels(points, xFor, width, height, left, bottom)}</svg>`;
}

function renderSparkline(element, series, field, label, color) {
  if (!element) return;
  const points = aggregateDays(series, [field])
    .filter((row) => row[field] !== null && row[field] !== undefined);
  if (points.length < 2) {
    element.innerHTML = `<span class="muted-cell">${escapeHtml(label)} history needs two days</span>`;
    return;
  }
  const width = 160;
  const height = 30;
  const values = points.map((row) => number(row[field]));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(1, max - min);
  const xFor = (index) => 2 + index * (width - 4) / Math.max(1, points.length - 1);
  const yFor = (value) => height - 3 - ((value - min) / range) * (height - 6);
  const path = points.map((row, index) => `${index ? 'L' : 'M'} ${xFor(index).toFixed(2)} ${yFor(number(row[field])).toFixed(2)}`).join(' ');
  element.innerHTML = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(label)}"><path d="${path}" fill="none" stroke="${color}" stroke-width="2"/><circle cx="${xFor(points.length - 1)}" cy="${yFor(values.at(-1))}" r="2.5" fill="${color}"><title>${escapeHtml(`${points.at(-1).day}: ${formatNumber(values.at(-1))}`)}</title></circle></svg>`;
}

function renderSearchBars(element, series, mode = 'venue') {
  if (!element) return;
  const sourceRows = chartRows(series);
  let rows = mode === 'total'
    ? sourceRows.filter((row) => String(row.channel || row.venue || '') === 'all')
    : sourceRows.filter((row) => String(row.channel || row.venue || '') !== 'all');
  if (mode === 'total' && !rows.length) {
    const totals = new Map();
    for (const row of sourceRows) {
      const day = String(row.day || row.date || '').slice(0, 10);
      if (!day || String(row.channel || row.venue || '') === 'all') continue;
      totals.set(day, number(totals.get(day)) + number(row.attempts ?? row.searches));
    }
    rows = [...totals.entries()].map(([day, attempts]) => ({ day, channel: 'all', attempts }));
  }
  const channels = [...new Set(rows.map((row) => String(row.channel || row.venue || 'unknown')))];
  const days = [...new Set(rows.map((row) => String(row.day || row.date || '').slice(0, 10)).filter(Boolean))].sort();
  if (!rows.length || !days.length) {
    element.innerHTML = chartUnavailable('Search history will appear after the v2 summary endpoint is live.');
    return;
  }
  const byDay = new Map(days.map((day) => [day, {}]));
  for (const row of rows) {
    const day = String(row.day || row.date || '').slice(0, 10);
    const channel = String(row.channel || row.venue || 'unknown');
    byDay.get(day)[channel] = number(byDay.get(day)[channel]) + number(row.attempts ?? row.searches);
  }
  const totals = days.map((day) => channels.reduce((sum, channel) => sum + number(byDay.get(day)[channel]), 0));
  const max = Math.max(1, ...totals);
  const width = Math.max(320, Math.round(element.clientWidth || 520));
  const height = 240;
  const left = 54;
  const right = 16;
  const top = 30;
  const bottom = 205;
  const slot = (width - left - right) / days.length;
  const barWidth = Math.max(2, Math.min(24, slot * 0.68));
  const bars = days.map((day, index) => {
    let cursor = bottom;
    return channels.map((channel, channelIndex) => {
      const value = number(byDay.get(day)[channel]);
      const barHeight = value / max * (bottom - top);
      cursor -= barHeight;
      return `<rect x="${left + index * slot + (slot - barWidth) / 2}" y="${cursor}" width="${barWidth}" height="${barHeight}" fill="${CHART_COLORS[channelIndex % CHART_COLORS.length]}"><title>${escapeHtml(`${day}: ${channelLabel(channel)} ${formatNumber(value)}`)}</title></rect>`;
    }).join('');
  }).join('');
  const xFor = (index) => left + index * slot + slot / 2;
  const visibleChannels = channels.slice(0, 5);
  const legendSlot = Math.max(92, (width - left - right) / Math.max(1, visibleChannels.length));
  const legend = visibleChannels.map((channel, index) => `<g transform="translate(${left + index * legendSlot},7)"><rect width="10" height="10" rx="2" fill="${CHART_COLORS[index % CHART_COLORS.length]}"/><text x="16" y="11" fill="#c7c4c1" font-size="${CHART_FONT_SIZE}">${escapeHtml(channel === 'all' ? 'Total' : channelLabel(channel))}</text></g>`).join('');
  const grid = [0, 0.5, 1].map((ratio) => {
    const value = max * ratio;
    const y = bottom - ratio * (bottom - top);
    return `<line x1="${left}" x2="${width - right}" y1="${y}" y2="${y}" stroke="#302f2f" stroke-dasharray="3 5"/>
      <text x="${left - 9}" y="${y + 5}" text-anchor="end" fill="#c7c4c1" font-size="${CHART_FONT_SIZE}">${formatNumber(value)}</text>`;
  }).join('');
  element.innerHTML = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Searches over time">${grid}${legend}${bars}${axisLabels(days.map((day) => ({ day })), xFor, width, height, left, bottom)}</svg>`;
}

function unwrapRows(value) {
  if (Array.isArray(value)) return value;
  return normalizeList(value?.rows);
}

function availability(value, defaultReason) {
  if (Array.isArray(value)) return { available: true, rows: value, reason: '' };
  if (!value) return { available: false, rows: [], reason: defaultReason };
  return {
    ...value,
    available: value.available !== false,
    rows: normalizeList(value.rows),
    reason: value.reason || defaultReason,
  };
}

function renderNavigation() {
  document.querySelectorAll('.nav-button').forEach((button) => {
    const active = button.dataset.section === state.activeSection;
    button.classList.toggle('active', active);
    button.setAttribute('aria-current', active ? 'page' : 'false');
  });
  ['overview', 'intelligence', 'audience'].forEach((section) => {
    const element = $(`section-${section}`);
    if (element) element.hidden = section !== state.activeSection;
  });
}

function renderChannelFilter() {
  const select = $('channelFilter');
  if (!select) return;
  const countsValue = state.data.activity?.channel_counts;
  const counts = Array.isArray(countsValue)
    ? Object.fromEntries(countsValue.map((row) => [row.channel || row.venue, number(row.count)]))
    : (countsValue || {});
  const current = state.filters.channel;
  const options = [
    `<option value="all">All venues${number(counts.all) ? ` (${formatNumber(counts.all)})` : ''}</option>`,
    ...STANDARD_CHANNELS.map((key) => `<option value="${escapeHtml(key)}">${escapeHtml(CHANNEL_LABELS[key])} (${formatNumber(counts[key])})</option>`),
    ...Object.entries(CHANNEL_LABELS)
      .filter(([key]) => !['all', ...STANDARD_CHANNELS].includes(key))
      .filter(([key]) => number(counts[key]) > 0 || (key === 'internal_test' && state.filters.includeTest))
      .map(([key, label]) => `<option value="${escapeHtml(key)}">${escapeHtml(label)} (${formatNumber(counts[key])})</option>`),
  ];
  if (current !== 'all' && !options.some((option) => option.includes(`value="${escapeHtml(current)}"`))) {
    options.push(`<option value="${escapeHtml(current)}">${escapeHtml(channelLabel(current))}</option>`);
  }
  select.innerHTML = options.join('');
  select.value = current;
}

function renderActivity() {
  const element = $('latestActivity');
  if (!element) return;
  if (state.loading.has('activity') && !state.data.activity) {
    renderPagination('activity', 0, 1);
    element.innerHTML = loadingState('Loading latest activity');
    return;
  }
  const rows = rowsForPage('activity', state.data.activity?.activity, state.data.activity?.pagination);
  if (!rows.length) {
    element.innerHTML = emptyState(state.errors.activity || 'No real user queries match these filters.');
    return;
  }
  let previousDayLabel = '';
  element.innerHTML = rows.map((row) => {
    const outcome = outcomeFor(row);
    const library = safeText(row.library_filter || row.library, 'All libraries');
    const origin = originLabel(row.query_origin || row.origin);
    const country = safeText(row.country_code || row.country, '');
    const channel = String(row.channel || row.venue || '').toLowerCase();
    const channelPill = channel && channel !== 'hosted_mcp' ? ` ${pill(channelLabel(channel), 'info')}` : '';
    const countryPill = country && country.toLowerCase() !== 'unknown' ? pill(country) : '';
    const dayLabel = activityDayLabel(row.created_at || row.timestamp);
    const separator = dayLabel && dayLabel !== previousDayLabel
      ? `<div class="activity-day">${escapeHtml(dayLabel)}</div>`
      : '';
    if (dayLabel) previousDayLabel = dayLabel;
    return `
      ${separator}
      <div class="activity-row">
        <div class="activity-query">
          <strong>${escapeHtml(safeText(row.query, 'Empty query'))}</strong>
          <div class="activity-meta">${escapeHtml(library)} | ${escapeHtml(origin)}</div>
        </div>
        <div>${visitorLabel(row)}</div>
        <div>${pill(`${formatNumber(row.result_count ?? row.results)} results`, outcome.tone)}</div>
        <div>${countryPill}${channelPill}</div>
        <div class="activity-meta" title="${escapeHtml(String(row.created_at || row.timestamp || ''))}">${escapeHtml(formatRelativeDate(row.created_at || row.timestamp))}</div>
      </div>
    `;
  }).join('');
}

function qualitySeries(series) {
  return aggregateDays(series, [
    'attempts',
    'eligible_attempts',
    'low_result_eligible_count',
    'true_zeros',
    'true_zero_count',
    'low_results',
    'low_result_count',
  ]).map((row) => {
    const attempts = number(row.attempts);
    const lowEligible = number(row.low_result_eligible_count ?? row.eligible_attempts);
    return {
      ...row,
      true_zero_rate: attempts ? number(row.true_zeros ?? row.true_zero_count) / attempts : null,
      low_result_rate: lowEligible ? number(row.low_results ?? row.low_result_count) / lowEligible : null,
      low_result_coverage_rate: attempts ? lowEligible / attempts : 0,
    };
  });
}

function renderKpis() {
  const kpis = state.data.overview?.kpis || {};
  if (!state.data.overview && state.loading.has('overview')) {
    [
      ['kpiClients', 'kpiClientsNote', 'Loading client activity'],
      ['kpiSearches', 'kpiSearchesNote', 'Loading search volume'],
      ['kpiZero', 'kpiZeroNote', 'Loading true zero rate'],
      ['kpiLow', 'kpiLowNote', 'Loading low-result rate'],
    ].forEach(([valueId, noteId, note]) => {
      const value = $(valueId);
      if (value) {
        value.textContent = '000';
        value.classList.add('skeleton');
      }
      if ($(noteId)) $(noteId).textContent = note;
    });
    return;
  }
  if (!state.data.overview && state.errors.overview) {
    [
      ['kpiClients', 'kpiClientsNote'],
      ['kpiSearches', 'kpiSearchesNote'],
      ['kpiZero', 'kpiZeroNote'],
      ['kpiLow', 'kpiLowNote'],
    ].forEach(([valueId, noteId]) => {
      setSkeleton($(valueId), 'Unavailable');
      if ($(noteId)) $(noteId).textContent = state.errors.overview;
    });
    return;
  }
  const clients = number(kpis.estimated_unique_clients ?? kpis.unique_clients);
  const searches = number(kpis.attempts ?? kpis.searches);
  const successRate = number(kpis.success_rate ?? (searches ? number(kpis.success_count) / searches : 0));
  if (kpis.identity_available === false && kpis.client_measure === 'client_days') {
    setSkeleton($('kpiClients'), formatNumber(clients));
    $('kpiClientsNote').textContent = 'Daily reach across the selected period';
  } else if (kpis.identity_available === false) {
    setSkeleton($('kpiClients'), 'Unavailable');
    $('kpiClientsNote').textContent = kpis.identity_unavailable_reason || 'Choose a shorter date range for exact searcher totals.';
  } else {
    setSkeleton($('kpiClients'), formatNumber(clients));
    $('kpiClientsNote').textContent = '';
    $('kpiClientsNote').title = 'Searchers seen in the selected period';
  }
  setSkeleton($('kpiSearches'), formatNumber(searches));
  $('kpiSearchesNote').textContent = `${formatNumber(kpis.searches_per_client)} per ${kpis.client_measure === 'client_days' ? 'daily reach unit' : 'searcher'}, ${formatPercent(successRate)} successful`;
  setSkeleton($('kpiZero'), formatPercent(kpis.true_zero_rate));
  $('kpiZeroNote').textContent = `${formatNumber(kpis.true_zero_count)} true zeros. Known defects and errors are excluded.`;
  if (kpis.low_result_rate_available === false) {
    setSkeleton($('kpiLow'), 'Unavailable');
    $('kpiLowNote').textContent = 'No searches in this view have exact low-result eligibility.';
  } else {
    setSkeleton($('kpiLow'), formatPercent(kpis.low_result_rate));
    $('kpiLowNote').textContent = `${formatNumber(kpis.low_result_count)} of ${formatNumber(kpis.low_result_eligible_count)} eligible searches. ${formatPercent(kpis.low_result_coverage_rate)} coverage.`;
  }
}

function renderCharts() {
  const overview = state.data.overview;
  if (!overview && state.loading.has('overview')) {
    ['searchesChart', 'clientsChart', 'qualityChart'].forEach((id) => {
      if ($(id)) $(id).innerHTML = loadingState(`Loading ${id}`);
    });
    return;
  }
  if (!overview && state.errors.overview) {
    ['searchesChart', 'clientsChart', 'qualityChart'].forEach((id) => {
      if ($(id)) $(id).innerHTML = chartUnavailable(state.errors.overview);
    });
    return;
  }
  const series = overview?.series;
  renderSearchBars($('searchesChart'), series, state.searchChartMode);
  renderLineChart(
    $('clientsChart'),
    series,
    [{ field: 'client_days', label: 'Daily reach', color: CHART_COLORS[1] }],
    { label: 'Estimated reach over time', emptyReason: 'Estimated reach history will appear after the v2 summary endpoint is live.' },
  );
  renderLineChart(
    $('qualityChart'),
    qualitySeries(series),
    [
      { field: 'true_zero_rate', label: 'True zero rate', color: CHART_COLORS[5] },
      { field: 'low_result_rate', label: 'Low-result rate', color: CHART_COLORS[3] },
    ],
    {
      label: 'Search quality trend',
      percent: true,
      outageSpans: overview?.outage_spans,
      emptyReason: 'Quality history will appear after the v2 summary endpoint is live.',
    },
  );
}

function topListConfig(key, rows = []) {
  const clientHeader = rows.some((row) => row.client_measure === 'client_days') ? 'Daily reach' : 'Est. reach';
  if (key === 'returned') {
    return {
      headers: [
        { label: 'Icon', sortKey: 'icon', sortValue: (row) => row.icon_name || row.icon_id || null, render: (row) => `<strong>${escapeHtml(safeText(row.icon_name || row.icon_id))}</strong><div class="activity-meta">${escapeHtml(safeText(row.library, 'Library unknown'))}</div>` },
        { label: 'Returns', number: true, sortKey: 'returns', sortType: 'number', sortValue: (row) => row.count ?? row.returns ?? null, render: (row) => formatNumber(row.count ?? row.returns) },
        { label: 'Queries', number: true, sortKey: 'distinct_queries', sortType: 'number', render: (row) => formatNumber(row.distinct_queries) },
      ],
    };
  }
  if (key === 'copied') {
    return {
      headers: [
        { label: 'Icon', sortKey: 'icon', sortValue: (row) => row.icon_name || row.icon_id || null, render: (row) => `<strong>${escapeHtml(safeText(row.icon_name || row.icon_id))}</strong><div class="activity-meta">${escapeHtml(safeText(row.action, 'Copy or download'))}</div>` },
        { label: 'Actions', number: true, sortKey: 'actions', sortType: 'number', sortValue: (row) => row.count ?? row.actions ?? null, render: (row) => formatNumber(row.count ?? row.actions) },
        { label: 'Est. reach', number: true, sortKey: 'distinct_clients', sortType: 'number', render: (row) => formatNumber(row.distinct_clients) },
      ],
    };
  }
  if (key === 'zero') {
    return {
      headers: [
        { label: 'Query', sortKey: 'query', render: (row) => `<button class="text-link" type="button" data-open-worklist="${escapeHtml(safeText(row.query, ''))}">${escapeHtml(safeText(row.query, 'Empty query'))}</button><div class="activity-meta">${escapeHtml(safeText(row.library_filter, 'All libraries'))}</div>` },
        { label: 'Zeros', number: true, sortKey: 'zeros', sortType: 'number', sortValue: (row) => row.count ?? row.attempt_count ?? row.zero_attempt_count ?? null, render: (row) => formatNumber(row.count ?? row.attempt_count ?? row.zero_attempt_count) },
        { label: clientHeader, number: true, sortKey: 'distinct_clients', sortType: 'number', sortValue: (row) => row.distinct_clients ?? row.estimated_unique_clients ?? null, render: (row) => formatNumber(row.distinct_clients ?? row.estimated_unique_clients) },
        { label: 'Last seen', sortKey: 'last_seen', sortType: 'date', render: (row) => escapeHtml(formatDate(row.last_seen, true)) },
      ],
    };
  }
  return {
    headers: [
      { label: 'Query', sortKey: 'query', render: (row) => `<strong>${escapeHtml(safeText(row.query, 'Empty query'))}</strong><div class="activity-meta">${escapeHtml(safeText(row.library_filter, 'All libraries'))}</div>` },
      { label: 'Searches', number: true, sortKey: 'searches', sortType: 'number', sortValue: (row) => row.count ?? row.searches ?? row.attempt_count ?? null, render: (row) => formatNumber(row.count ?? row.searches ?? row.attempt_count) },
      { label: clientHeader, number: true, sortKey: 'distinct_clients', sortType: 'number', sortValue: (row) => row.distinct_clients ?? row.estimated_unique_clients ?? null, render: (row) => formatNumber(row.distinct_clients ?? row.estimated_unique_clients) },
      { label: 'Hit rate', number: true, sortKey: 'hit_rate', sortType: 'number', sortValue: (row) => row.hit_rate ?? row.success_rate ?? null, render: (row) => formatPercent(row.hit_rate ?? row.success_rate) },
    ],
  };
}

function renderTopList() {
  const element = $('topListTable');
  if (!element) return;
  if (!state.data.overview && state.loading.has('overview')) {
    renderPagination('topList', 0, 1);
    element.innerHTML = loadingState('Loading top lists');
    return;
  }
  if (!state.data.overview && state.errors.overview) {
    renderPagination('topList', 0, 1);
    element.innerHTML = emptyState(state.errors.overview);
    $('topListSubtitle').textContent = state.errors.overview;
    return;
  }
  document.querySelectorAll('[data-top-list]').forEach((button) => {
    button.classList.toggle('active', button.dataset.topList === state.topList);
  });
  const value = state.data.overview?.top_lists?.[state.topList];
  const list = availability(value, 'This list is not available from the current data source.');
  $('topListSubtitle').textContent = list.available
    ? `Top ${formatNumber(list.rows.length)} available for ${appliedWindowLabel().toLowerCase()}.`
    : list.reason;
  if (!list.available) {
    renderPagination('topList', 0, 1);
    element.innerHTML = emptyState(list.reason);
    return;
  }
  element.innerHTML = sortedTable(
    'topList',
    topListConfig(state.topList, list.rows).headers,
    list.rows,
    `No ${state.topList} rows match these filters.`,
  );
}

function renderGeography() {
  const element = $('geographyList');
  if (!element) return;
  if (!state.data.overview && state.loading.has('overview')) {
    element.innerHTML = loadingState('Loading country coverage');
    $('geographySubtitle').textContent = 'Loading country coverage';
    return;
  }
  if (!state.data.overview && state.errors.overview) {
    element.innerHTML = emptyState(state.errors.overview);
    $('geographySubtitle').textContent = state.errors.overview;
    return;
  }
  const geography = availability(
    state.data.overview?.geography,
    'Country history is not available from the current data source.',
  );
  if (!geography.available) {
    element.innerHTML = emptyState(geography.reason);
    $('geographySubtitle').textContent = geography.reason;
    return;
  }
  const max = Math.max(1, ...geography.rows.map((row) => number(row.searches)));
  $('geographySubtitle').textContent = `${formatPercent(state.data.overview?.geography?.coverage_rate)} of searches have a country`;
  element.innerHTML = geography.rows.length
    ? geography.rows.slice(0, 12).map((row) => `
      <div class="geo-row">
        <strong>${escapeHtml(safeText(row.country_code || row.country, 'Unknown'))}</strong>
        <div class="geo-bar"><span style="width:${Math.min(100, number(row.searches) / max * 100)}%"></span></div>
        <div class="number">${formatNumber(row.searches)} <span class="activity-meta">(${formatPercent(row.percentage)})</span></div>
      </div>
    `).join('')
    : emptyState('No country data matches these filters.');
}

function renderOverview() {
  renderKpis();
  renderCharts();
  renderTopList();
  renderGeography();
  renderActivity();
}

function renderQueryExplorer() {
  const element = $('queryExplorer');
  const subtitle = $('searchHistorySubtitle');
  const includeTest = $('includeSearchTestTraffic');
  if (includeTest) includeTest.checked = state.searchIncludeTest;
  if (!element) return;
  if (!state.data.search && state.loading.has('search')) {
    if (subtitle) subtitle.textContent = 'One row per recorded search. No grouping. Loading data.';
    renderPagination('queries', 0, 1);
    element.innerHTML = loadingState('Loading search history');
    return;
  }
  if (state.data.search?.queries_available === false) {
    if (subtitle) subtitle.textContent = state.data.search.queries_unavailable_reason || 'Complete query history is not available for this period.';
    renderPagination('queries', 0, 1);
    element.innerHTML = emptyState(state.data.search.queries_unavailable_reason || 'Complete query history is not available for this period.');
    return;
  }
  const summary = state.data.search?.summary || {};
  if (subtitle) {
    const tableRows = number(summary.table_rows ?? state.data.search?.pagination?.total);
    const testScope = state.searchIncludeTest ? 'test traffic included' : 'test traffic excluded';
    const coverageWarning = normalizeList(state.data.search?.coverage?.warnings)
      .map((warning) => safeText(warning))
      .filter(Boolean)
      .join(' ');
    subtitle.textContent = [
      `One row per recorded search. No grouping. ${formatNumber(tableRows)} searches | ${testScope}`,
      coverageWarning,
    ].filter(Boolean).join(' | ');
  }
  const headers = [
    {
      label: 'Search term',
      sortKey: 'query',
      render: (row) => {
        const tools = normalizeList(row.tools);
        const details = [
          safeText(row.library_filter || row.library, 'All libraries'),
          originLabel(row.query_origin || row.origin),
          tools.join(', '),
        ].filter(Boolean);
        return `<strong>${escapeHtml(safeText(row.query, 'Empty query'))}</strong><div class="activity-meta">${escapeHtml(details.join(' | '))}</div>`;
      },
    },
    { label: 'Estimated client ID', sortKey: 'searcher_identifier', sortValue: (row) => row.searcher_identifier, render: (row) => visitorLabel(row) },
    { label: 'Outcome', sortKey: 'outcome', sortValue: (row) => outcomeFor(row).label, render: (row) => { const value = outcomeFor(row); return pill(value.label, value.tone); } },
    { label: 'Country', sortKey: 'country_code', sortValue: (row) => (row.country_available === false ? null : row.country_code || row.country || null), render: (row) => queryCountryCell(row) },
    { label: 'Channel', sortKey: 'channel', sortValue: (row) => (row.channel_available === false ? null : channelLabel(row.channel || row.venue)), render: (row) => queryChannelCell(row) },
    { label: 'Result', number: true, sortKey: 'result_count', sortType: 'number', sortValue: (row) => row.result_count ?? null, render: (row) => queryEventResultCell(row) },
    { label: 'Time', sortKey: 'recorded_at', sortType: 'date', sortValue: (row) => row.recorded_at, render: (row) => escapeHtml(formatDate(row.recorded_at, true)) },
  ];
  const queryParts = sortedTableParts('queries', headers, state.data.search?.queries, {
    serverPagination: state.data.search?.pagination,
    serverSorting: true,
  });
  const rows = queryParts.rows;
  state.visibleQueryRows = rows;
  const notice = state.data.search?.queries_complete === false
    ? `<div class="data-notice" role="status">${escapeHtml(state.data.search.queries_notice || 'Showing the newest available search details. Narrow the filters for exact totals.')}</div>`
    : '';
  element.innerHTML = `${notice}${table(headers, rows, state.errors.search || 'No queries match these filters.', queryParts.tableOptions)}`;
}

function renderWorklist() {
  const element = $('gapWorklist');
  const subtitle = $('gapsSubtitle');
  if (!element) return;
  if (!state.data.search && state.loading.has('search')) {
    if (subtitle) subtitle.textContent = 'Loading failed and weak searches.';
    renderPagination('worklist', 0, 1);
    element.innerHTML = loadingState('Loading demand');
    return;
  }
  if (!state.data.search && state.errors.search) {
    if (subtitle) subtitle.textContent = state.errors.search;
    renderPagination('worklist', 0, 1);
    element.innerHTML = emptyState(state.errors.search);
    return;
  }
  if (state.data.search?.worklist_available === false) {
    if (subtitle) subtitle.textContent = state.data.search.worklist_unavailable_reason || 'Demand details are not available for this period.';
    renderPagination('worklist', 0, 1);
    element.innerHTML = emptyState(state.data.search.worklist_unavailable_reason || 'Demand details are not available for this period.');
    return;
  }
  const demandRows = normalizeList(state.data.search?.worklist);
  if (subtitle) {
    const testScope = state.searchIncludeTest ? 'test traffic included' : 'test traffic excluded';
    subtitle.textContent = `${formatNumber(demandRows.length)} failed or weak queries need review | ${testScope}`;
  }
  element.innerHTML = sortedTable('worklist', [
    {
      label: 'Query',
      sortKey: 'query',
      render: (row) => {
        const details = [
          safeText(row.library_filter, 'All libraries'),
          originLabel(row.query_origin || row.origin),
        ].filter(Boolean);
        return `<strong>${escapeHtml(safeText(row.query, 'Empty query'))}</strong><div class="activity-meta">${escapeHtml(details.join(' | '))}</div>`;
      },
    },
    { label: 'Issue', sortKey: 'issue', sortValue: (row) => outcomeFor(row).label, render: (row) => { const value = outcomeFor(row); return pill(value.label, value.tone); } },
    { label: 'Channel', sortKey: 'channel', sortValue: (row) => channelLabel(row.channel || row.venue), render: (row) => queryChannelCell(row) },
    { label: 'Language', sortKey: 'locale', sortValue: (row) => row.locale || normalizeList(row.locales)[0] || null, render: (row) => queryLocaleCell(row) },
    { label: 'Country', sortKey: 'country_code', sortValue: (row) => row.country_code || row.country || null, render: (row) => queryCountryCell(row) },
    { label: 'Result count', number: true, sortKey: 'result_count', sortType: 'number', sortValue: (row) => row.result_count ?? null, render: (row) => queryTypicalResultCell(row) },
    { label: 'Searches', number: true, sortKey: 'searches', sortType: 'number', sortValue: (row) => row.searches ?? row.activity_count ?? row.requests ?? null, render: (row) => queryRequestCell(row) },
    { label: 'Last seen', sortKey: 'last_seen', sortType: 'date', render: (row) => escapeHtml(formatDate(row.last_seen, true)) },
    {
      label: 'Action',
      sortKey: 'review_status',
      sortValue: (row) => demandActionValue(row.review_status) || null,
      render: (row) => {
        const query = safeText(row.query, '');
        const library = safeText(row.library_filter, 'all');
        const jobCategory = safeText(row.job_category, '');
        const key = `query:${query}:${library}:${jobCategory}`;
        const value = demandActionValue(row.review_status);
        return `<select class="inline-select" data-query-review data-query="${escapeHtml(query)}" data-library="${escapeHtml(library)}" data-job-category="${escapeHtml(jobCategory)}" aria-label="Choose action for ${escapeHtml(query)}"${state.savingRows.has(key) ? ' disabled' : ''}>
          <option value=""${!value ? ' selected' : ''}>Choose action</option>
          <option value="add_icon"${value === 'add_icon' ? ' selected' : ''}>Add icon</option>
          <option value="add_alias"${value === 'add_alias' ? ' selected' : ''}>Add alias</option>
          <option value="improve_ranking"${value === 'improve_ranking' ? ' selected' : ''}>Improve ranking</option>
          <option value="improve_docs"${value === 'improve_docs' ? ' selected' : ''}>Improve docs</option>
          <option value="watch"${value === 'watch' ? ' selected' : ''}>Watch</option>
          <option value="resolved"${value === 'resolved' ? ' selected' : ''}>Resolved</option>
          <option value="ignore"${value === 'ignore' ? ' selected' : ''}>Ignore</option>
        </select>`;
      },
    },
  ], demandRows, 'No failed or weak searches match these filters.');
}

function renderIconRequests() {
  const element = $('iconRequests');
  const subtitle = $('userRequestsSubtitle');
  if (!element) return;
  if (!state.data.search && state.loading.has('search')) {
    if (subtitle) subtitle.textContent = 'Loading requests from people.';
    renderPagination('iconRequests', 0, 1);
    element.innerHTML = loadingState('Loading user requests');
    return;
  }
  if (!state.data.search && state.errors.search) {
    if (subtitle) subtitle.textContent = state.errors.search;
    renderPagination('iconRequests', 0, 1);
    element.innerHTML = emptyState(state.errors.search);
    return;
  }
  const inbox = availability(state.data.search?.icon_requests, 'Icon requests are not available from the current data source.');
  if (!inbox.available) {
    if (subtitle) subtitle.textContent = inbox.reason;
    renderPagination('iconRequests', 0, 1);
    element.innerHTML = emptyState(inbox.reason);
    return;
  }
  const scope = state.searchIncludeTest ? 'test traffic included' : 'test traffic excluded';
  if (subtitle) {
    subtitle.textContent = `${formatNumber(inbox.rows.length)} requests in this period | ${scope} | unreviewed first`;
  }
  element.innerHTML = sortedTable('iconRequests', [
    {
      label: 'User request',
      sortKey: 'request_text',
      sortValue: (row) => row.request_text || row.evidence_text || null,
      render: (row) => {
        const query = safeText(row.failed_query || row.search_query, 'No search');
        const library = safeText(row.library_filter, 'all');
        return `<strong>${escapeHtml(safeText(row.request_text || row.evidence_text))}</strong><div class="activity-meta">Query: ${escapeHtml(query)} | Library: ${escapeHtml(library)}</div>`;
      },
    },
    {
      label: 'Source',
      sortKey: 'ui_surface',
      sortValue: (row) => row.ui_surface || row.request_source || null,
      render: (row) => escapeHtml(
        safeText(row.request_source || ICON_REQUEST_SOURCE_LABELS[row.ui_surface], 'Unknown'),
      ),
    },
    {
      label: 'Results',
      number: true,
      sortKey: 'result_count',
      sortType: 'number',
      sortValue: (row) => row.result_count ?? null,
      render: (row) => row.result_count === null || row.result_count === undefined
        ? '<span class="muted-cell">Not recorded</span>'
        : escapeHtml(formatNumber(row.result_count)),
    },
    { label: 'Submitted', sortKey: 'created_at', sortType: 'date', render: (row) => escapeHtml(formatDate(row.created_at, true)) },
    {
      label: 'Review',
      sortKey: 'status',
      sortValue: (row) => (inbox.status_available === false ? null : safeText(row.status, 'new')),
      render: (row) => {
        if (inbox.status_available === false) return `<span class="muted-cell">${escapeHtml(inbox.status_reason || 'Status unavailable')}</span>`;
        const key = `request:${safeText(row.id, '')}`;
        const value = safeText(row.status, 'new');
        const disabled = state.savingRows.has(key) ? ' disabled' : '';
        return `<div class="request-review" data-icon-request-review data-request-id="${escapeHtml(row.id)}">
          <select class="inline-select" data-icon-request-status aria-label="Status for ${escapeHtml(safeText(row.request_text || row.evidence_text, 'user request'))}"${disabled}>
            <option value="new"${value === 'new' ? ' selected' : ''}>New</option>
            <option value="planned"${value === 'planned' ? ' selected' : ''}>Planned</option>
            <option value="added"${value === 'added' ? ' selected' : ''}>Added</option>
            <option value="declined"${value === 'declined' ? ' selected' : ''}>Declined</option>
          </select>
          <input class="request-note" data-icon-request-note value="${escapeHtml(safeText(row.review_note, ''))}" maxlength="400" aria-label="Review note for ${escapeHtml(safeText(row.request_text || row.evidence_text, 'user request'))}" placeholder="Optional note"${disabled} />
          <button class="small-button" data-icon-request-save type="button"${disabled}>Save</button>
        </div>`;
      },
    },
  ], inbox.rows, 'No icon requests have been submitted in this period.');
}

function renderContactInbox() {
  const element = $('contactInbox');
  if (!element) return;
  if (!state.data.search && state.loading.has('search')) {
    renderPagination('contact', 0, 1);
    element.innerHTML = loadingState('Loading contact inbox');
    return;
  }
  if (!state.data.search && state.errors.search) {
    renderPagination('contact', 0, 1);
    element.innerHTML = emptyState(state.errors.search);
    return;
  }
  const inbox = availability(state.data.search?.contact_submissions, 'Stored contact submissions are not available from the current data source.');
  if (!inbox.available) {
    renderPagination('contact', 0, 1);
    element.innerHTML = emptyState(inbox.reason);
    return;
  }
  element.innerHTML = sortedTable('contact', [
    { label: 'From', sortKey: 'name', sortValue: (row) => row.name || row.email || null, render: (row) => `<strong>${escapeHtml(safeText(row.name, 'No name'))}</strong><div class="activity-meta">${escapeHtml(truncate(row.email, 34))}</div>` },
    { label: 'Interest', sortKey: 'interest', render: (row) => pill(safeText(row.interest, 'General')) },
    { label: 'Message', sortKey: 'message', render: (row) => escapeHtml(truncate(row.message, 90)) },
    { label: 'Received', sortKey: 'created_at', sortType: 'date', render: (row) => escapeHtml(formatDate(row.created_at, true)) },
  ], inbox.rows, 'No contact submissions have been stored yet.');
}

function renderDiagnostics() {
  const element = $('diagnosticsContent');
  if (!element) return;
  if (!state.data.search && state.loading.has('search')) {
    element.innerHTML = loadingState('Loading diagnostics');
    return;
  }
  if (!state.data.search && state.errors.search) {
    element.innerHTML = emptyState(state.errors.search);
    return;
  }
  const diagnostics = state.data.search?.diagnostics;
  if (!diagnostics || !Object.keys(diagnostics).length) {
    element.innerHTML = emptyState('No diagnostics are available for this period.');
    return;
  }
  element.innerHTML = `<pre style="white-space:pre-wrap;margin:0;color:var(--muted);font:11px/1.65 ui-monospace,monospace">${escapeHtml(JSON.stringify(diagnostics, null, 2))}</pre>`;
}

function renderSearch() {
  renderQueryExplorer();
  renderWorklist();
  renderIconRequests();
}

function registeredUserDisplayRows(audienceUsers) {
  const accounts = accountDirectoryRows();
  if (!accounts.length) return normalizeList(audienceUsers);
  const telemetryByUserId = new Map(normalizeList(audienceUsers)
    .filter((row) => row.user_id)
    .map((row) => [String(row.user_id), row]));
  const telemetryByMaskedIdentifier = new Map(normalizeList(audienceUsers)
    .filter((row) => row.identifier)
    .map((row) => [String(row.identifier), row]));
  return accounts.map((user) => {
    const email = String(user.email || '');
    const telemetry = telemetryByUserId.get(String(user.id || ''))
      || telemetryByMaskedIdentifier.get(maskIdentifier(email || user.id));
    const hasLinkedActivity = telemetry?.activity_linked === true
      || number(telemetry?.searches) > 0
      || Boolean(telemetry?.last_search || telemetry?.last_active);
    return {
      identifier: state.showRegisteredEmails ? email || user.id : maskIdentifier(email || user.id),
      email,
      provider: user.provider,
      plan: user.plan || 'Free',
      signup_at: user.created_at,
      last_sign_in: user.last_sign_in_at || null,
      last_search: telemetry?.last_search || telemetry?.last_active || null,
      searches: hasLinkedActivity ? number(telemetry?.searches) : null,
      venues: hasLinkedActivity ? normalizeList(telemetry?.venues) : [],
      country_code: hasLinkedActivity ? telemetry?.country_code || null : null,
    };
  }).sort((left, right) => (
    String(right.last_search || '').localeCompare(String(left.last_search || ''))
    || String(right.last_sign_in || '').localeCompare(String(left.last_sign_in || ''))
    || String(right.signup_at || '').localeCompare(String(left.signup_at || ''))
  ));
}

function renderEmailVisibilityControl() {
  const button = $('toggleRegisteredEmails');
  if (!button) return;
  button.setAttribute('aria-pressed', String(state.showRegisteredEmails));
  button.setAttribute('aria-label', state.showRegisteredEmails ? 'Hide user emails' : 'Show user emails');
  button.title = state.showRegisteredEmails ? 'Hide user emails' : 'Show user emails';
  button.innerHTML = iconSvg(state.showRegisteredEmails ? 'eyeOff' : 'eye');
}

function renderLocalMcpAttribution(report, error = '') {
  const kpis = $('localAttributionKpis');
  const breakdown = $('localAttributionBreakdown');
  const subtitle = $('localAttributionSubtitle');
  if (!kpis || !breakdown || !subtitle) return;
  if (error) {
    subtitle.textContent = 'Local npm installation data is unavailable';
    kpis.innerHTML = emptyState(error);
    breakdown.innerHTML = '';
    renderPagination('localAttribution', 0, 1);
    return;
  }
  if (!report) {
    subtitle.textContent = 'Loading Local npm installation data';
    kpis.innerHTML = loadingState('Loading Local npm installation data');
    breakdown.innerHTML = '';
    return;
  }
  if (report.available === false) {
    subtitle.textContent = safeText(report.reason, 'Local npm installation data is unavailable.');
    kpis.innerHTML = emptyState(report.reason);
    breakdown.innerHTML = '';
    renderPagination('localAttribution', 0, 1);
    return;
  }

  const coverage = report.measurement_coverage_rate == null
    ? 'No Local npm searches in this period'
    : `${formatPercent(report.measurement_coverage_rate)} of Local npm searches measured`;
  const coverageStart = report.coverage_starts_at
    ? ` Data starts ${formatDate(report.coverage_starts_at, true)}.`
    : '';
  const testScope = state.searchIncludeTest ? ' Test traffic included.' : ' Test traffic excluded.';
  subtitle.textContent = `Best-effort installation count. ${coverage}.${coverageStart}${testScope}`;
  const cards = [
    ['Observed installations', report.observed_installations, 'Active package installations seen in this period'],
    ['New', report.new_installations, 'First measured in this period'],
    ['Returning', report.returning_installations, 'Measured before and during this period'],
    ['Measured searches', report.measured_searches, `${formatNumber(report.total_local_searches)} total Local npm searches`],
  ];
  kpis.innerHTML = cards.map(([label, value, note]) => `
    <div class="kpi">
      <div class="kpi-label">${escapeHtml(label)}</div>
      <div class="kpi-value">${formatNumber(value)}</div>
      <div class="kpi-note">${escapeHtml(note)}</div>
    </div>
  `).join('');

  const groups = [
    ['Country', report.countries],
    ['Client', report.client_families],
    ['Package', report.package_versions],
    ['OS', report.os_platforms],
  ];
  const rows = groups.flatMap(([dimension, values]) => normalizeList(values).map((row) => ({
    dimension,
    value: row.value,
    searches: row.searches,
    observed_installations: row.observed_installations,
  })));
  breakdown.innerHTML = sortedTable('localAttribution', [
    { label: 'Breakdown', sortKey: 'dimension', render: (row) => escapeHtml(row.dimension) },
    { label: 'Value', sortKey: 'value', render: (row) => escapeHtml(safeText(row.value, 'Unknown')) },
    { label: 'Searches', number: true, sortKey: 'searches', sortType: 'number', render: (row) => formatNumber(row.searches) },
    { label: 'Observed installations', number: true, sortKey: 'observed_installations', sortType: 'number', render: (row) => formatNumber(row.observed_installations) },
  ], rows, state.searchIncludeTest
    ? 'No attributed Local npm searches match these filters.'
    : 'No attributed Local npm searches match these filters. Package 0.4.24 adds this measurement.');
}

function renderAudience() {
  const data = state.data.audience;
  if (!data && state.loading.has('audience')) {
    [
      ['funnelClients', 'funnelClientsNote', 'Loading clients'],
      ['funnelRegistered', 'funnelRegisteredNote', 'Loading registered accounts'],
      ['funnelPro', 'funnelProNote', 'Loading Pro accounts'],
    ].forEach(([valueId, noteId, note]) => {
      const value = $(valueId);
      if (value) {
        value.textContent = '000';
        value.classList.add('skeleton');
      }
      if ($(noteId)) $(noteId).textContent = note;
    });
    if ($('funnelMrr')) $('funnelMrr').textContent = 'Loading';
    if ($('funnelMrrNote')) $('funnelMrrNote').textContent = 'Loading billing availability';
    if ($('audienceChart')) $('audienceChart').innerHTML = loadingState('Loading audience history');
    renderLocalMcpAttribution(null);
    if ($('registeredUsers')) $('registeredUsers').innerHTML = loadingState('Loading registered users');
    if ($('allClients')) $('allClients').innerHTML = loadingState('Loading searcher details');
    return;
  }
  if (!data && state.errors.audience) {
    ['funnelClients', 'funnelRegistered', 'funnelPro', 'funnelMrr'].forEach((id) => setSkeleton($(id), 'Unavailable'));
    ['funnelClientsNote', 'funnelRegisteredNote', 'funnelProNote', 'funnelMrrNote'].forEach((id) => {
      if ($(id)) $(id).textContent = state.errors.audience;
    });
    if ($('audienceChart')) $('audienceChart').innerHTML = chartUnavailable(state.errors.audience);
    renderLocalMcpAttribution(null, state.errors.audience);
    if ($('registeredUsers')) $('registeredUsers').innerHTML = emptyState(state.errors.audience);
    if ($('allClients')) $('allClients').innerHTML = emptyState(state.errors.audience);
    renderPagination('registeredUsers', 0, 1);
    renderPagination('clients', 0, 1);
    return;
  }
  const funnel = data?.funnel || {};
  renderLocalMcpAttribution(data?.local_mcp_attribution);
  const accounts = accountSummary();
  const clients = number(funnel.unique_clients);
  const registered = accounts.available ? accounts.registered : number(funnel.registered_clients);
  const pro = accounts.available ? accounts.pro : number(funnel.pro_clients);
  if (funnel.identity_available === false) {
    setSkeleton($('funnelClients'), formatNumber(clients));
    $('funnelClientsNote').textContent = funnel.client_measure === 'client_days'
      ? 'Daily reach across the selected period'
      : funnel.identity_unavailable_reason || 'Exact searcher totals are not available.';
  } else {
    setSkeleton($('funnelClients'), formatNumber(clients));
    $('funnelClientsNote').textContent = '';
    $('funnelClientsNote').title = 'Searchers seen in the selected period';
  }
  setSkeleton($('funnelRegistered'), formatNumber(registered));
  $('funnelRegisteredNote').textContent = accounts.available
    ? 'All time: registered accounts'
    : `${formatPercent(funnel.registered_percentage ?? (clients ? registered / clients : 0))} of searchers`;
  setSkeleton($('funnelPro'), formatNumber(pro));
  $('funnelProNote').textContent = accounts.available
    ? `All time: ${formatNumber(pro)} of ${formatNumber(registered)} registered accounts`
    : `${formatPercent(funnel.pro_percentage ?? (clients ? pro / clients : 0))} of searchers`;
  const mrr = funnel.mrr || {};
  $('funnelMrr').textContent = mrr.available ? safeText(mrr.display_value) : 'Unavailable';
  $('funnelMrrNote').textContent = mrr.reason || 'Exact billing price is not linked to every active subscription.';
  renderSparkline(
    $('funnelClientsSpark'),
    data?.series,
    'client_days',
    'Estimated reach over time',
    CHART_COLORS[0],
  );
  renderSparkline($('funnelRegisteredSpark'), data?.series, 'registered_clients', 'Registered clients over time', CHART_COLORS[1]);
  renderSparkline($('funnelProSpark'), data?.series, 'pro_clients', 'Pro clients over time', CHART_COLORS[2]);
  if (funnel.identity_available === false) {
    renderLineChart(
      $('audienceChart'),
      data?.series,
      [{ field: 'client_days', label: 'Daily reach', color: CHART_COLORS[1] }],
      { label: 'Daily reach over time', emptyReason: 'Daily reach history is not available for this period.' },
    );
  } else {
    const linkedFields = ['registered_clients', 'pro_clients'];
    const hasLinkedSignal = normalizeList(data?.series)
      .some((point) => linkedFields.some((field) => number(point?.[field]) > 0));
    const audienceChart = $('audienceChart');
    if (!hasLinkedSignal && audienceChart) {
      audienceChart.style.minHeight = '0';
      audienceChart.innerHTML = '<div class="chart-empty">No account-linked search activity in this period yet. The trend chart appears when registered or Pro searches occur.</div>';
    } else {
      if (audienceChart) audienceChart.style.minHeight = '170px';
      renderLineChart(
        audienceChart,
        data?.series,
        [
          { field: 'registered_clients', label: 'Linked registered', color: CHART_COLORS[1] },
          { field: 'pro_clients', label: 'Linked Pro', color: CHART_COLORS[2] },
        ],
        { label: 'Account-linked searchers over time', emptyReason: 'Account-linked search history will appear when requests send an API key.' },
      );
    }
  }

  const users = availability(data?.registered_users, 'Registered-user enrichment is not available from the current data source.');
  const registeredRows = registeredUserDisplayRows(users.rows);
  if ($('registeredUsersSubtitle')) {
    const total = accounts.available ? accounts.registered : number(data?.registered_users?.total ?? users.rows.length);
    $('registeredUsersSubtitle').textContent = accounts.available
      ? `${formatNumber(total)} accounts in all recorded history. Search activity follows ${appliedWindowLabel().toLowerCase()}.`
      : `${formatNumber(total)} total users. Activity columns reflect ${appliedWindowLabel().toLowerCase()}.`;
  }
  renderEmailVisibilityControl();
  $('registeredUsers').innerHTML = users.available || accounts.available
    ? sortedTable('registeredUsers', [
      { label: 'User', sortKey: 'identifier', sortValue: (row) => row.identifier, render: (row) => `<strong>${escapeHtml(safeText(row.identifier, 'Hidden'))}</strong><div class="activity-meta">${escapeHtml(safeText(row.provider, 'Unknown provider'))}</div>` },
      { label: 'Plan', sortKey: 'plan', render: (row) => pill(safeText(row.plan, 'Free'), String(row.plan || '').toLowerCase().includes('pro') ? 'pro' : '') },
      { label: 'Signed up', sortKey: 'signup_at', sortType: 'date', sortValue: (row) => row.signup_at || row.created_at, render: (row) => escapeHtml(formatDate(row.signup_at || row.created_at, true)) },
      { label: 'Last sign-in', sortKey: 'last_sign_in', sortType: 'date', render: (row) => row.last_sign_in ? escapeHtml(formatDate(row.last_sign_in, true)) : '<span class="muted-cell">No sign-in recorded</span>' },
      { label: 'Last search', sortKey: 'last_search', sortType: 'date', render: (row) => row.last_search ? escapeHtml(formatDate(row.last_search, true)) : '<span class="muted-cell">No linked search</span>' },
      { label: 'Searches', number: true, sortKey: 'searches', sortType: 'number', render: (row) => row.searches == null ? '<span class="muted-cell">Not linked</span>' : formatNumber(row.searches) },
      { label: 'Venues', sortKey: 'venues', sortValue: (row) => (normalizeList(row.venues).length ? row.venues.map(channelLabel).join(', ') : null), render: (row) => normalizeList(row.venues).length ? escapeHtml(row.venues.map(channelLabel).join(', ')) : '<span class="muted-cell">Not linked</span>' },
      { label: 'Country', sortKey: 'country_code', sortValue: (row) => row.country_code || row.country || null, render: (row) => row.country_code || row.country ? pill(row.country_code || row.country) : '<span class="muted-cell">Not linked</span>' },
    ], registeredRows, 'No registered users match these filters.')
    : emptyState(users.reason);
  if (!users.available && !accounts.available) renderPagination('registeredUsers', 0, 1);

  const allClients = availability(data?.clients, 'Searcher details are not available from the current data source.');
  $('allClients').innerHTML = allClients.available
    ? sortedTable('clients', [
      { label: 'Searcher', sortKey: 'searcher', sortValue: (row) => row.estimated_client_key || row.client_key || row.identifier || null, render: (row) => visitorLabel(row) },
      { label: 'Plan', sortKey: 'plan', render: (row) => pill(safeText(row.plan, 'Free'), String(row.plan || '').toLowerCase().includes('pro') ? 'pro' : '') },
      { label: 'Country', sortKey: 'country_code', sortValue: (row) => row.country_code || row.country || null, render: (row) => pill(safeText(row.country_code || row.country, 'Unknown')) },
      { label: 'First seen', sortKey: 'first_seen', sortType: 'date', render: (row) => escapeHtml(formatDate(row.first_seen, true)) },
      { label: 'Last seen', sortKey: 'last_seen', sortType: 'date', render: (row) => escapeHtml(formatDate(row.last_seen, true)) },
      { label: 'Searches', number: true, sortKey: 'searches', sortType: 'number', render: (row) => formatNumber(row.searches) },
      { label: 'Top query', sortKey: 'top_query', render: (row) => escapeHtml(truncate(row.top_query, 34)) },
    ], allClients.rows, 'No searchers match these filters.', {
      serverPagination: data?.pagination,
      serverSorting: true,
    })
    : emptyState(allClients.reason);
  if (!allClients.available) renderPagination('clients', 0, 1);
}

function renderAll() {
  renderNavigation();
  renderChannelFilter();
  renderOverview();
  renderSearch();
  renderAudience();
  setRefreshState();
}

function legacyParams({ queue = false } = {}) {
  const params = new URLSearchParams();
  params.set('window', state.filters.window === 'custom' ? '30d' : state.filters.window);
  params.set('environment', state.filters.includeTest ? 'all' : 'live');
  params.set('channel', state.filters.channel);
  params.set('query_origin', 'all');
  if (state.filters.q) params.set('q', state.filters.q);
  if (queue) {
    params.set('page', '1');
    params.set('page_size', '100');
  }
  return params;
}

async function legacyDashboard() {
  const params = legacyParams();
  return apiRequest(`/intelligence/search/dashboard?${params}`);
}

async function loadLegacyActivity() {
  const dashboard = await legacyDashboard();
  const summary = dashboard.summary || {};
  const channelCounts = normalizeList(dashboard.latest_activity).reduce((counts, row) => {
    const channel = String(row.channel || 'unknown');
    counts.all = number(counts.all) + 1;
    counts[channel] = number(counts[channel]) + 1;
    return counts;
  }, {});
  return {
    activity: normalizeList(dashboard.latest_activity),
    channel_counts: channelCounts,
    meta: {
      source: 'phase_a_compatibility',
      note: 'Venue counts cover the latest activity sample until the v2 summary endpoint is live.',
    },
  };
}

async function loadLegacyOverview() {
  const [dashboard, intelligence] = await Promise.all([
    legacyDashboard(),
    apiRequest(`/intelligence/overview?${legacyParams()}`),
  ]);
  const summary = dashboard.summary || {};
  const topIcons = normalizeList(intelligence.overview?.top_icons);
  return {
    kpis: {
      estimated_unique_clients: summary.estimated_unique_clients,
      registered_clients: summary.registered_clients,
      pro_clients: summary.pro_clients,
      anonymous_clients: summary.anonymous_clients,
      attempts: summary.attempt_count,
      success_count: summary.success_count,
      success_rate: summary.attempt_count ? number(summary.success_count) / number(summary.attempt_count) : 0,
      searches_per_client: summary.searches_per_client,
      true_zero_count: summary.true_zero_count,
      true_zero_rate: summary.true_zero_rate,
      low_result_count: summary.low_result_count,
      low_result_eligible_count: summary.low_result_eligible_count,
      low_result_rate: summary.low_result_rate,
    },
    series: [],
    outage_spans: [],
    top_lists: {
      searched: {
        available: false,
        reason: 'Top searched queries need the v2 summary endpoint.',
        rows: [],
      },
      returned: {
        available: false,
        reason: 'Returned-icon coverage is partial until the v2 endpoint labels it by venue.',
        rows: [],
      },
      copied: {
        available: false,
        reason: topIcons.length
          ? 'The current endpoint omits older copy rows. The v2 endpoint will include the complete combined total.'
          : 'Copy and download totals need the v2 summary endpoint.',
        rows: [],
      },
      zero: {
        available: false,
        reason: 'Top zero-result queries need the v2 summary endpoint.',
        rows: [],
      },
    },
    geography: {
      available: false,
      reason: 'Country totals need the v2 summary endpoint.',
      rows: [],
    },
    meta: { source: 'phase_a_compatibility' },
  };
}

function legacyQueueRow(row, issueType) {
  return {
    ...row,
    issue_type: issueType,
    result_count: issueType === 'zero_result' ? 0 : row.minimum_result_count,
    channel: normalizeList(row.channels)[0] || 'unknown',
    country_code: normalizeList(row.countries)[0] || 'Unknown',
    query_origin: normalizeList(row.query_origins)[0] || 'agent_query',
    visitor_kind: normalizeList(row.visitor_kinds)[0] || 'anonymous',
    client_label: normalizeList(row.estimated_client_keys)[0] || 'Estimated client',
  };
}

async function loadLegacySearch() {
  const base = legacyParams({ queue: true });
  const zeroParams = new URLSearchParams(base);
  zeroParams.set('issue_type', 'zero_result');
  const lowParams = new URLSearchParams(base);
  lowParams.set('issue_type', 'low_result');
  const evidenceParams = legacyParams();
  evidenceParams.set('signal_type', 'search_attempt');
  evidenceParams.set('page', '1');
  evidenceParams.set('page_size', '100');
  const requestEvidenceParams = legacyParams();
  requestEvidenceParams.set('signal_type', 'icon_request');
  requestEvidenceParams.set('page', '1');
  requestEvidenceParams.set('page_size', '100');
  const [zero, low, evidence, requestEvidence] = await Promise.all([
    apiRequest(`/intelligence/search/queue?${zeroParams}`),
    apiRequest(`/intelligence/search/queue?${lowParams}`),
    apiRequest(`/intelligence/evidence?${evidenceParams}`),
    apiRequest(`/intelligence/evidence?${requestEvidenceParams}`),
  ]);
  const zeroRows = normalizeList(zero.queries).map((row) => legacyQueueRow(row, 'zero_result'));
  const lowRows = normalizeList(low.queries).map((row) => legacyQueueRow(row, 'low_result'));
  const requests = [
    ...normalizeList(evidence.evidence),
    ...normalizeList(requestEvidence.evidence),
  ]
    .filter((row) => ICON_REQUEST_UI_SURFACES.has(row.ui_surface) && String(row.evidence_text || '').trim())
    .map((row) => ({
      ...row,
      request_text: row.evidence_text,
      request_source: ICON_REQUEST_SOURCE_LABELS[row.ui_surface] || 'Unknown',
      client_label: row.estimated_client_key,
    }));
  return {
    queries: [...zeroRows, ...lowRows],
    worklist: [...zeroRows, ...lowRows]
      .sort((a, b) => number(b.estimated_unique_clients) - number(a.estimated_unique_clients))
      .slice(0, 50),
    icon_requests: { available: true, rows: requests },
    contact_submissions: {
      available: false,
      reason: 'Stored contact messages need the v2 inbox endpoint.',
      rows: [],
    },
    diagnostics: {
      source: 'Phase A compatibility view',
      note: 'The v2 endpoint will replace this bounded zero and low-result sample with the single full query explorer.',
      known_defects: normalizeList(state.data.activity?.known_defects),
    },
    meta: { source: 'phase_a_compatibility' },
  };
}

async function loadLegacyAudience() {
  const [dashboard, users] = await Promise.all([
    legacyDashboard(),
    apiRequest('/users?page=1&page_size=100'),
  ]);
  const summary = dashboard.summary || {};
  const registeredUsers = normalizeList(users.users).map((user) => ({
    identifier: user.email || user.id,
    provider: user.provider,
    plan: user.plan || user.account_plan,
    signup_at: user.created_at,
    last_active: user.last_sign_in_at || user.last_active,
    searches: user.searches || 0,
    venues: user.venues || [],
    country_code: user.country_code,
  }));
  return {
    funnel: {
      unique_clients: summary.estimated_unique_clients,
      registered_clients: summary.registered_clients,
      pro_clients: summary.pro_clients,
      mrr: {
        available: false,
        reason: 'Exact billing price is not linked to every active subscription.',
      },
    },
    registered_users: { available: true, rows: registeredUsers },
    clients: {
      available: false,
      reason: 'Per-client profiles need the v2 audience endpoint.',
      rows: [],
    },
    series: [],
    meta: { source: 'phase_a_compatibility' },
  };
}

async function legacyEndpoint(endpoint) {
  if (endpoint === 'activity') return loadLegacyActivity();
  if (endpoint === 'overview') return loadLegacyOverview();
  if (endpoint === 'search') return loadLegacySearch();
  if (endpoint === 'audience') return loadLegacyAudience();
  throw new Error(`Unsupported dashboard endpoint: ${endpoint}`);
}

async function loadAccountDirectory() {
  const first = await apiRequest('/users?page=1');
  const pageCount = Math.max(1, number(first.pagination?.page_count) || 1);
  const remaining = pageCount > 1
    ? await Promise.all(
      Array.from({ length: pageCount - 1 }, (_, index) => apiRequest(`/users?page=${index + 2}`)),
    )
    : [];
  const users = [
    ...normalizeList(first.users),
    ...remaining.flatMap((payload) => normalizeList(payload.users)),
  ];
  return {
    users,
    pagination: {
      ...(first.pagination || {}),
      page: 1,
      page_size: users.length,
      total: number(first.pagination?.total) || users.length,
      page_count: 1,
    },
  };
}

async function fetchEndpoint(endpoint) {
  if (endpoint === 'accounts') return loadAccountDirectory();
  try {
    return await apiRequest(endpointPath(endpoint));
  } catch (error) {
    if (error.status !== 404) throw error;
    return legacyEndpoint(endpoint);
  }
}

async function loadEndpoint(endpoint, token, { force = false } = {}) {
  state.endpointTokens[endpoint] = token;
  const dataKey = endpointDataKey(endpoint);
  const existingMatches = state.dataKeys[endpoint] === dataKey;
  const cached = force ? null : readCache(endpoint);
  if (cached?.payload) {
    state.data[endpoint] = cached.payload;
    state.dataKeys[endpoint] = dataKey;
    renderAll();
    if (
      acceptsDashboardView(endpoint, cached.payload)
      && Date.now() - cached.savedAt < CACHE_TTL_MS
      && cached.payload.__partial !== true
    ) {
      return cached.payload;
    }
  }

  state.loading.add(endpoint);
  delete state.errors[endpoint];
  if (!existingMatches && !cached?.payload) {
    state.data[endpoint] = null;
    delete state.dataKeys[endpoint];
  }
  renderAll();
  try {
    const payload = await fetchEndpoint(endpoint);
    if (state.endpointTokens[endpoint] !== token) return null;
    if (!acceptsDashboardView(endpoint, payload)) {
      throw new Error(`The ${endpoint} response belongs to an older dashboard view.`);
    }
    state.data[endpoint] = payload;
    state.dataKeys[endpoint] = dataKey;
    writeCache(endpoint, payload);
    return payload;
  } catch (error) {
    if (state.endpointTokens[endpoint] === token) {
      state.errors[endpoint] = error.message || `Could not load ${endpoint}.`;
      if (!existingMatches || state.dataKeys[endpoint] !== dataKey) {
        state.data[endpoint] = null;
        delete state.dataKeys[endpoint];
      }
    }
    return null;
  } finally {
    if (state.endpointTokens[endpoint] === token) {
      state.loading.delete(endpoint);
      renderAll();
    }
  }
}

async function refreshDashboard({ force = false, includeAccounts = true, notify = true } = {}) {
  beginDashboardView();
  const token = state.requestToken + 1;
  state.requestToken = token;
  state.refreshStartedAt = Date.now();
  if (force) clearActiveDashboardCache();
  const requests = [
    loadEndpoint('activity', token, { force }),
    loadEndpoint('overview', token, { force }),
    loadEndpoint('search', token, { force }),
    loadEndpoint('audience', token, { force }),
  ];
  if (includeAccounts || !state.data.accounts) {
    requests.push(loadEndpoint('accounts', token, { force }));
  }
  await Promise.all(requests);
  if (token !== state.requestToken) return;
  if (Object.keys(state.errors).length === 0) {
    state.refreshedAt = Date.now();
    state.refreshedFilterKey = activeFilterKey();
  } else if (state.refreshedFilterKey !== activeFilterKey()) {
    state.refreshedAt = null;
  }
  setRefreshState();
  if (force && notify && Object.keys(state.errors).length === 0) showToast('Production data refreshed.');
}

function setAutoRefresh(enabled) {
  state.autoRefreshEnabled = enabled === true;
  if (state.autoRefreshTimer) {
    window.clearInterval(state.autoRefreshTimer);
    state.autoRefreshTimer = null;
  }
  if (!state.autoRefreshEnabled) return;
  state.autoRefreshTimer = window.setInterval(() => {
    if (document.hidden || state.loading.size > 0) return;
    refreshDashboard({ force: true, includeAccounts: false, notify: false });
  }, AUTO_REFRESH_MS);
}

async function refreshListEndpoint(key) {
  const endpoint = key === 'queries'
    ? 'search'
    : key === 'clients'
      ? 'audience'
      : key === 'activity'
        ? 'activity'
        : null;
  if (!endpoint) {
    renderAll();
    return;
  }
  if (!state.view || state.view.filterKey !== activeFilterKey()) beginDashboardView();
  const token = state.requestToken + 1;
  state.requestToken = token;
  state.refreshStartedAt = Date.now();
  await loadEndpoint(endpoint, token, { force: true });
  if (token !== state.requestToken) return;
  if (!state.errors[endpoint]) {
    state.refreshedAt = Date.now();
    state.refreshedFilterKey = activeFilterKey();
  }
  setRefreshState();
}

let filterTimer = null;
function scheduleRefresh(delay = 240) {
  window.clearTimeout(filterTimer);
  filterTimer = window.setTimeout(() => refreshDashboard({ force: true, includeAccounts: false }), delay);
}

let endpointFilterTimer = null;
function scheduleEndpointRefresh(endpoint, delay = 240) {
  window.clearTimeout(endpointFilterTimer);
  endpointFilterTimer = window.setTimeout(() => refreshListEndpoint(endpoint), delay);
}

async function fetchAllPages(endpoint, rowsPath, options = {}) {
  const pageSize = 100;
  const params = sharedParams({ forSearch: endpoint === 'search' });
  params.set('page', '1');
  params.set('page_size', String(pageSize));
  if (endpoint === 'search' && state.explorerIssue) params.set('issue', state.explorerIssue);
  if (endpoint === 'search' && options.view) params.set('view', options.view);
  const first = await apiRequest(`/v2/${endpoint}?${params}`);
  if (endpoint === 'activity' && first.meta?.raw_rows_truncated === true) {
    throw new Error('Complete activity exceeds the safe export limit. Choose a shorter date range.');
  }
  if (endpoint === 'search' && first.queries_available === false) {
    throw new Error(first.queries_unavailable_reason || 'Complete query data is not available for this period.');
  }
  if (endpoint === 'search' && first.queries_export_available === false) {
    throw new Error(first.queries_export_unavailable_reason || 'Complete query export is not available for this period. Narrow the filters and try again.');
  }
  if (endpoint === 'audience' && first.clients?.available === false) {
    throw new Error(first.clients.reason || 'Complete client data is not available for this period.');
  }
  const firstRows = rowsPath(first);
  const pageCount = Math.max(1, number(first.pagination?.page_count) || 1);
  if (pageCount === 1) return firstRows;
  const rest = [];
  for (let firstPage = 2; firstPage <= pageCount; firstPage += 4) {
    const pages = Array.from(
      { length: Math.min(4, pageCount - firstPage + 1) },
      (_, index) => firstPage + index,
    );
    const batch = await Promise.all(pages.map(async (page) => {
      const pageParams = new URLSearchParams(params);
      pageParams.set('page', String(page));
      const payload = await apiRequest(`/v2/${endpoint}?${pageParams}`);
      return rowsPath(payload);
    }));
    rest.push(...batch);
  }
  return [firstRows, ...rest].flat();
}

async function fetchAllSearchEvents(eventScope = 'primary') {
  const pageSize = 100;
  const params = sharedParams({ forSearch: true });
  params.set('page', '1');
  params.set('page_size', String(pageSize));
  params.set('event_scope', eventScope);
  const first = await apiRequest(`/v2/search/events?${params}`);
  if (first.events_export_available === false) {
    throw new Error(first.events_export_unavailable_reason || 'Complete event export is not available for this period. Narrow the filters and try again.');
  }
  const pageCount = Math.max(1, number(first.pagination?.page_count) || 1);
  const snapshotId = String(first.snapshot_id || '').trim();
  if (pageCount > 1 && !snapshotId) {
    throw new Error('The event export could not establish a stable snapshot. Start the export again.');
  }
  const events = [...normalizeList(first.events)];
  for (let firstPage = 2; firstPage <= pageCount; firstPage += 4) {
    const pages = Array.from(
      { length: Math.min(4, pageCount - firstPage + 1) },
      (_, index) => firstPage + index,
    );
    const batch = await Promise.all(pages.map(async (page) => {
      const pageParams = new URLSearchParams(params);
      pageParams.set('page', String(page));
      if (snapshotId) pageParams.set('snapshot_id', snapshotId);
      const payload = await apiRequest(`/v2/search/events?${pageParams}`);
      if (payload.events_export_available === false) {
        throw new Error(payload.events_export_unavailable_reason || 'The event export snapshot expired. Start the export again.');
      }
      if (snapshotId && String(payload.snapshot_id || '').trim() !== snapshotId) {
        throw new Error('The event export changed while pages were loading. Start the export again.');
      }
      return normalizeList(payload.events);
    }));
    events.push(...batch.flat());
  }
  return {
    events,
    events_complete: first.events_complete === true,
    events_export_available: first.events_export_available !== false,
    snapshot_id: snapshotId || null,
    event_scope: first.event_scope || eventScope,
    event_counts: first.event_counts || {},
    source_reconciliation: first.source_reconciliation || {
      status: 'not_available',
    },
    field_coverage: first.field_coverage || {},
    definitions: first.definitions || {},
    meta: first.meta || {},
  };
}

async function exportData(key) {
  const overview = state.data.overview || {};
  const search = state.data.search || {};
  const audience = state.data.audience || {};
  let completeRows = null;
  let eventExport = null;
  try {
    if (key === 'search-summary-csv' || key === 'audit-bundle-json') {
      completeRows = await fetchAllPages(
        'search',
        (payload) => normalizeList(payload.queries),
        { view: 'summary' },
      );
    } else if (key === 'gap-worklist-csv' || key === 'gap-worklist-json') {
      const queryRows = await fetchAllPages(
        'search',
        (payload) => normalizeList(payload.queries),
        { view: 'summary' },
      );
      completeRows = queryRows.filter((row) => (
        ['zero_result', 'low_result', 'mixed_result'].includes(String(row.issue_type || ''))
        && !['resolved', 'ignore'].includes(String(row.review_status || ''))
      ));
    } else if (key === 'clients') {
      completeRows = await fetchAllPages('audience', (payload) => unwrapRows(payload.clients));
    } else if (key === 'activity') {
      completeRows = await fetchAllPages('activity', (payload) => normalizeList(payload.activity));
    } else if (key === 'request-log-csv') {
      eventExport = await fetchAllSearchEvents('primary');
    }
    if (key === 'audit-bundle-json') {
      eventExport = await fetchAllSearchEvents('audit');
    }
  } catch (error) {
    showToast(error.message || 'The complete export could not be loaded.', true);
    return;
  }
  const generatedAt = new Date().toISOString();
  if (eventExport) {
    if (key === 'audit-bundle-json') {
      const events = normalizeList(eventExport.events);
      const searchSummary = normalizeList(completeRows);
      const requestLog = events.filter((row) => row.event_role === 'top_level');
      const webSearches = events.filter((row) => row.event_role === 'web_top_level');
      const diagnostics = events.filter((row) => row.event_role === 'diagnostic');
      const integrity = searchAuditIntegrity(
        searchSummary,
        requestLog,
        webSearches,
        diagnostics,
        eventExport.source_reconciliation,
      );
      const audit = {
        export_schema_version: SEARCH_EXPORT_SCHEMA_VERSION,
        export_type: 'audit_bundle',
        description: 'Everything plus integrity checks. For verification.',
        generated_at_utc: generatedAt,
        period: searchExportPeriod(),
        filters: searchExportFilters(),
        contents: {
          search_summary: 'One row per unique query, library, and origin. For quick analysis.',
          request_log: 'One top-level MCP tool call per row. Ground truth.',
          web_searches: 'One top-level web search per row.',
          diagnostics: 'Supporting Web, MCP, and gateway work. These rows are not additional user activity.',
          field_coverage: 'Recorded-field coverage across the audit event source.',
          source_reconciliation: 'Checks source tables against exported product outcomes and diagnostics at one fixed cutoff.',
          integrity_checks: 'Automated structure, meaning, and source-reconciliation checks.',
        },
        summary: {
          search_summary_rows: searchSummary.length,
          requests: integrity.counts.summary_requests,
          request_log_rows: requestLog.length,
          web_searches: webSearches.length,
          diagnostics: diagnostics.length,
          excluded_non_activity_rows: number(search.summary?.excluded_non_activity_rows),
        },
        integrity_checks: integrity,
        source_reconciliation: eventExport.source_reconciliation,
        search_summary: searchSummary,
        request_log: requestLog,
        web_searches: webSearches,
        diagnostics,
        field_coverage: eventExport.field_coverage,
        csv_schemas: {
          search_summary: Object.keys(searchSummaryCsvRow({})),
          request_log: Object.keys(requestLogCsvRow({})),
        },
        definitions: {
          ...eventExport.definitions,
          search_summary_grain: 'One row per normalized query, library filter, and query origin.',
          summary_requests: 'The top-level tool calls represented by each Search summary row.',
          low_count: 'All low-result requests, including approximate low results from older or local clients.',
          typical_result_count: 'The median recorded result count. It is blank when a row mixes result units or has no recorded result count.',
          distinct_searcher_ids: 'Estimated client IDs, not people. One user may produce several IDs, and one ID may represent shared infrastructure.',
          request_log_grain: 'One top-level MCP tool call per row.',
          root_request_identifier: 'Legacy request-grouping identifier retained only for investigation. It may collide and must not be treated as a session ID.',
          source_separation: 'Request log rows, web searches, and diagnostics are separate arrays so supporting work cannot inflate user activity.',
          diagnostic_accounting_status: 'Shows whether a diagnostic is linked, pending, an explained direct gateway request, or unexplained.',
          diagnostic_linkage_tier: 'Shows the exact identifier used to link a diagnostic to a final outcome.',
          integrity_status: 'Overall status passes only when structure, meaning, and source reconciliation all pass.',
          returned_icon_ref_coverage: 'Missing icon references are a coverage warning when the source states they were not recorded. A recorded positive result with an empty reference list fails the meaning checks.',
        },
        source_meta: eventExport.meta,
      };
      downloadFile(
        `${searchExportBaseName('audit_bundle', generatedAt)}.json`,
        JSON.stringify(audit, null, 2),
        'application/json;charset=utf-8',
      );
    } else {
      exportRows(
        searchExportBaseName('request_log', generatedAt),
        eventExport.events.map((row) => plainExportRow(requestLogCsvRow(row))),
        'csv',
      );
    }
    return;
  }
  const mapping = {
    'series-searches': chartRows(overview.series),
    'series-clients': aggregateDays(overview.series, ['client_days']),
    'series-quality': qualitySeries(overview.series),
    'top-list-csv': unwrapRows(overview.top_lists?.[state.topList]),
    'top-list-json': unwrapRows(overview.top_lists?.[state.topList]),
    geography: unwrapRows(overview.geography),
    activity: completeRows ?? normalizeList(state.data.activity?.activity),
    'search-summary-csv': completeRows ?? normalizeList(search.queries),
    'gap-worklist-csv': completeRows ?? normalizeList(search.worklist),
    'gap-worklist-json': completeRows ?? normalizeList(search.worklist),
    'icon-requests-csv': unwrapRows(search.icon_requests),
    'icon-requests-json': unwrapRows(search.icon_requests),
    'contact-csv': unwrapRows(search.contact_submissions),
    'contact-json': unwrapRows(search.contact_submissions),
    'diagnostics-csv': Object.entries(search.diagnostics || {}).map(([field, value]) => ({
      field,
      value: typeof value === 'object' ? JSON.stringify(value) : value,
    })),
    'diagnostics-json': [search.diagnostics || {}],
    'registered-users': registeredUserDisplayRows(unwrapRows(audience.registered_users)).map((row) => {
      const copy = { ...row };
      if (!state.showRegisteredEmails) delete copy.email;
      return copy;
    }),
    clients: completeRows ?? unwrapRows(audience.clients),
  };
  const mappedRows = normalizeList(mapping[key]);
  const rows = key === 'search-summary-csv'
    ? mappedRows.map((row) => plainExportRow(searchSummaryCsvRow(row)))
    : mappedRows.map(plainExportRow);
  exportRows(
    key === 'search-summary-csv'
      ? searchExportBaseName('search_summary', generatedAt)
      : `supericons-${key}-${state.filters.window}`,
    rows,
    key.endsWith('json') ? 'json' : 'csv',
  );
}

function setSection(section) {
  if (!['overview', 'intelligence', 'audience'].includes(section)) return;
  state.activeSection = section;
  renderNavigation();
}

async function saveQueryReview(select) {
  const query = String(select.dataset.query || '').trim();
  const libraryFilter = String(select.dataset.library || 'all').trim() || 'all';
  const jobCategory = String(select.dataset.jobCategory || '').trim();
  const status = String(select.value || '').trim();
  if (!status) {
    showToast('Choose a review action.', true);
    renderWorklist();
    return;
  }
  const key = `query:${query}:${libraryFilter}:${jobCategory}`;
  state.savingRows.add(key);
  renderWorklist();
  try {
    await apiRequest('/v2/search/review', {
      method: 'POST',
      body: JSON.stringify({
        query,
        library_filter: libraryFilter,
        job_category: jobCategory,
        status,
      }),
    });
    showToast('Demand action saved.');
    await refreshListEndpoint('queries');
  } catch (error) {
    showToast(error.message || 'The search gap review could not be saved.', true);
    renderWorklist();
  } finally {
    state.savingRows.delete(key);
    renderWorklist();
  }
}

async function saveIconRequestReview(review) {
  const iconEvidenceId = String(review.dataset.requestId || '').trim();
  const status = String(review.querySelector('[data-icon-request-status]')?.value || '').trim();
  const note = String(review.querySelector('[data-icon-request-note]')?.value || '').trim();
  const key = `request:${iconEvidenceId}`;
  state.savingRows.add(key);
  renderIconRequests();
  try {
    await apiRequest('/v2/icon-requests/review', {
      method: 'POST',
      body: JSON.stringify({ icon_evidence_id: iconEvidenceId, status, note }),
    });
    showToast('User request review saved.');
    await refreshListEndpoint('queries');
  } catch (error) {
    showToast(error.message || 'The user request review could not be saved.', true);
    renderIconRequests();
  } finally {
    state.savingRows.delete(key);
    renderIconRequests();
  }
}

function openWorklist(query) {
  state.activeSection = 'intelligence';
  state.explorerQuery = String(query || '').trim();
  state.pages.queries = 1;
  state.pages.worklist = 1;
  renderNavigation();
  if ($('explorerSearch')) $('explorerSearch').value = state.explorerQuery;
  document.querySelector('.panel[data-row-key="worklist"]')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  scheduleEndpointRefresh('queries', 0);
}

function initializePanelControls() {
  document.querySelectorAll('.grid-2, .grid-main-side').forEach((grid, groupIndex) => {
    const panels = [...grid.children].filter((child) => child.classList.contains('panel'));
    if (panels.length < 2) return;
    panels.forEach((panel) => {
      panel.dataset.collapseGroup = `panel-row-${groupIndex + 1}`;
    });
  });

  document.querySelectorAll('.panel').forEach((panel, index) => {
    const head = panel.querySelector(':scope > .panel-head');
    if (!head) return;
    const title = safeText(head.querySelector('.panel-title')?.textContent, `Panel ${index + 1}`);
    let actions = head.querySelector(':scope > .panel-actions');
    if (!actions) {
      actions = document.createElement('div');
      actions.className = 'panel-actions';
      [...head.children]
        .filter((child) => child.matches('button, label, select'))
        .forEach((child) => actions.appendChild(child));
      head.appendChild(actions);
    }

    const key = panel.dataset.rowKey;
    if (key) {
      const label = document.createElement('label');
      label.className = 'row-limit-control';
      label.innerHTML = `
        <span>Rows</span>
        <select data-row-limit="${escapeHtml(key)}" aria-label="Rows shown in ${escapeHtml(panel.dataset.rowLabel || title)}">
          ${ROW_LIMIT_OPTIONS.map((value) => `<option value="${value}"${value === rowLimit(key) ? ' selected' : ''}>${value}</option>`).join('')}
        </select>
      `;
      actions.prepend(label);
      const pagination = document.createElement('div');
      pagination.className = 'pagination';
      pagination.dataset.pagination = key;
      pagination.hidden = true;
      panel.appendChild(pagination);
    }

    if (panel.dataset.panelCollapse !== 'false') {
      const toggle = document.createElement('button');
      toggle.className = 'small-button icon-button panel-toggle';
      toggle.type = 'button';
      toggle.dataset.panelToggle = '';
      toggle.setAttribute('aria-expanded', 'true');
      toggle.setAttribute('aria-label', `Collapse ${title}`);
      toggle.title = `Collapse ${title}`;
      toggle.innerHTML = iconSvg('collapse');
      actions.appendChild(toggle);
    }
  });
  document.querySelectorAll('.scroll-region').forEach((region) => {
    region.tabIndex = 0;
    if (!region.getAttribute('aria-label')) {
      const panelTitle = region.closest('.panel')?.querySelector('.panel-title')?.textContent?.trim();
      region.setAttribute('aria-label', `${panelTitle || 'Dashboard results'} scroll area`);
    }
  });
}

function setPanelCollapsed(panel, collapsed) {
  panel.classList.toggle('is-collapsed', collapsed);
  const title = safeText(panel.querySelector('.panel-title')?.textContent, 'panel');
  const button = panel.querySelector('[data-panel-toggle]');
  if (!button) return;
  const action = collapsed ? 'Expand' : 'Collapse';
  button.setAttribute('aria-expanded', String(!collapsed));
  button.setAttribute('aria-label', `${action} ${title}`);
  button.title = `${action} ${title}`;
  button.innerHTML = iconSvg(collapsed ? 'expand' : 'collapse');
}

function setPage(key, page) {
  state.pages[key] = Math.max(1, Number(page) || 1);
  if (SERVER_PAGINATED_LISTS.has(key)) {
    refreshListEndpoint(key);
  } else {
    renderAll();
  }
}

function setSearchDownloadMenuOpen(open) {
  const toggle = $('searchDownloadToggle');
  const popover = $('searchDownloadPopover');
  if (!toggle || !popover) return;
  toggle.setAttribute('aria-expanded', String(open));
  popover.hidden = !open;
}

function initializeEvents() {
  document.querySelectorAll('.nav-button').forEach((button) => {
    button.addEventListener('click', () => setSection(button.dataset.section));
  });
  document.querySelectorAll('[data-top-list]').forEach((button) => {
    button.addEventListener('click', () => {
      state.topList = button.dataset.topList;
      state.pages.topList = 1;
      renderTopList();
    });
  });
  document.querySelectorAll('[data-export]').forEach((button) => {
    button.addEventListener('click', () => {
      setSearchDownloadMenuOpen(false);
      exportData(button.dataset.export);
    });
  });
  $('searchDownloadToggle')?.addEventListener('click', (event) => {
    event.stopPropagation();
    const open = event.currentTarget.getAttribute('aria-expanded') !== 'true';
    setSearchDownloadMenuOpen(open);
    if (open) $('searchDownloadPopover')?.querySelector('[role="menuitem"]')?.focus();
  });
  document.querySelectorAll('[data-row-limit]').forEach((select) => {
    select.addEventListener('change', () => {
      const key = select.dataset.rowLimit;
      state.rowLimits[key] = Number(select.value);
      state.pages[key] = 1;
      if (SERVER_PAGINATED_LISTS.has(key)) refreshListEndpoint(key);
      else renderAll();
    });
  });
  document.querySelectorAll('[data-panel-toggle]').forEach((button) => {
    button.addEventListener('click', () => {
      const panel = button.closest('.panel');
      if (!panel) return;
      const collapsed = !panel.classList.contains('is-collapsed');
      const group = panel.dataset.collapseGroup;
      const panels = group
        ? [...document.querySelectorAll(`.panel[data-collapse-group="${group}"]`)]
        : [panel];
      panels.forEach((target) => setPanelCollapsed(target, collapsed));
    });
  });
  document.addEventListener('click', (event) => {
    if (!event.target.closest('#searchDownloadMenu')) setSearchDownloadMenuOpen(false);
    const worklistButton = event.target.closest('[data-open-worklist]');
    if (worklistButton) {
      openWorklist(worklistButton.dataset.openWorklist);
      return;
    }
    const requestSave = event.target.closest('[data-icon-request-save]');
    if (requestSave) {
      const review = requestSave.closest('[data-icon-request-review]');
      if (review) saveIconRequestReview(review);
      return;
    }
    const sortButton = event.target.closest('[data-sort-table][data-sort-key]');
    if (sortButton) {
      setSort(sortButton.dataset.sortTable, sortButton.dataset.sortKey);
      return;
    }
    const button = event.target.closest('[data-pagination] button');
    if (!button) return;
    const pagination = button.closest('[data-pagination]');
    const key = pagination?.dataset.pagination;
    if (!key) return;
    if (button.dataset.pageNumber) setPage(key, Number(button.dataset.pageNumber));
    else if (button.hasAttribute('data-page-prev')) setPage(key, currentPage(key) - 1);
    else if (button.hasAttribute('data-page-next')) setPage(key, currentPage(key) + 1);
  });
  document.addEventListener('change', (event) => {
    const queryReview = event.target.closest('[data-query-review]');
    if (queryReview) {
      saveQueryReview(queryReview);
      return;
    }
  });
  document.querySelectorAll('[data-search-chart-mode]').forEach((button) => {
    button.addEventListener('click', () => {
      state.searchChartMode = button.dataset.searchChartMode;
      document.querySelectorAll('[data-search-chart-mode]').forEach((candidate) => {
        const active = candidate === button;
        candidate.classList.toggle('active', active);
        candidate.setAttribute('aria-pressed', String(active));
      });
      renderCharts();
    });
  });
  $('toggleRegisteredEmails')?.addEventListener('click', () => {
    state.showRegisteredEmails = !state.showRegisteredEmails;
    renderAudience();
  });
  $('periodButtons')?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-window]');
    if (!button) return;
    state.filters.window = button.dataset.window;
    resetPages();
    document.querySelectorAll('[data-window]').forEach((candidate) => {
      const active = candidate === button;
      candidate.classList.toggle('active', active);
      candidate.setAttribute('aria-pressed', String(active));
    });
    $('customRange').hidden = state.filters.window !== 'custom';
    if (state.filters.window !== 'custom') scheduleRefresh(0);
  });
  $('applyCustomRange')?.addEventListener('click', () => {
    const from = $('customFrom')?.value || '';
    const to = $('customTo')?.value || '';
    if (!from || !to || from > to) {
      showToast('Choose a valid start and end date.', true);
      return;
    }
    state.filters.from = from;
    state.filters.to = to;
    resetPages();
    scheduleRefresh(0);
  });
  $('channelFilter')?.addEventListener('change', (event) => {
    state.filters.channel = event.target.value;
    resetPages();
    scheduleRefresh(0);
  });
  $('includeSearchTestTraffic')?.addEventListener('change', (event) => {
    state.searchIncludeTest = event.target.checked;
    state.pages.queries = 1;
    scheduleEndpointRefresh('queries', 0);
    scheduleEndpointRefresh('audience', 0);
  });
  $('globalSearch')?.addEventListener('input', (event) => {
    state.filters.q = String(event.target.value || '').trim();
    resetPages();
    scheduleRefresh();
  });
  $('explorerSearch')?.addEventListener('input', (event) => {
    state.explorerQuery = String(event.target.value || '').trim();
    state.pages.queries = 1;
    scheduleEndpointRefresh('queries');
  });
  $('explorerIssue')?.addEventListener('change', (event) => {
    state.explorerIssue = event.target.value;
    state.pages.queries = 1;
    scheduleEndpointRefresh('queries', 0);
  });
  $('refreshButton')?.addEventListener('click', () => refreshDashboard({ force: true }));
  $('autoRefresh')?.addEventListener('change', (event) => {
    setAutoRefresh(event.target.checked);
  });
  $('adminSecretForm')?.addEventListener('submit', submitAdminSecret);
  $('adminSecretCancelBtn')?.addEventListener('click', cancelAdminSecret);
  $('adminSecretModal')?.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      if (getAdminSecret()) cancelAdminSecret();
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = [...event.currentTarget.querySelectorAll('input, button:not([hidden]):not([disabled])')];
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') setSearchDownloadMenuOpen(false);
  });
}

async function initializeDashboard() {
  initializePanelControls();
  initializeEvents();
  renderAll();
  try {
    await ensureAdminSecret();
    await refreshDashboard();
  } catch (error) {
    setFreshness();
    if (error.message !== 'Admin sign-in canceled.') showToast(error.message || 'The dashboard could not start.', true);
  }
}

initializeDashboard();
