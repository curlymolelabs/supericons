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
    registeredUsers: 1,
    clients: 1,
  },
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
  searcherDetailsReturnFocus: null,
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

function baseFilterParams({ forSearch = false } = {}) {
  const params = new URLSearchParams();
  params.set('window', state.filters.window);
  if (state.filters.window === 'custom') {
    params.set('from', state.filters.from);
    params.set('to', state.filters.to);
  }
  params.set('channel', state.filters.channel);
  params.set('include_test', String(state.filters.includeTest));
  const query = forSearch
    ? [state.filters.q, state.explorerQuery].filter(Boolean).join(' ').trim()
    : state.filters.q;
  if (query) params.set('q', query);
  return params;
}

function activeFilterKey() {
  return baseFilterParams().toString();
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

function sharedParams({ forSearch = false, includeView = true } = {}) {
  const params = baseFilterParams({ forSearch });
  if (includeView && state.view) {
    params.set('view_id', state.view.id);
    params.set('data_cutoff', state.view.cutoff);
    params.set('filter_key', state.view.filterKey);
  }
  return params;
}

function endpointPath(endpoint, { includeView = true } = {}) {
  if (endpoint === 'accounts') return '/users?page=all';
  const params = sharedParams({ forSearch: endpoint === 'search', includeView });
  if (endpoint === 'activity') {
    params.set('page', String(currentPage('activity')));
    params.set('page_size', String(rowLimit('activity')));
  }
  if (endpoint === 'search') {
    params.set('page', String(currentPage('queries')));
    params.set('page_size', String(rowLimit('queries')));
    if (state.explorerIssue) params.set('issue', state.explorerIssue);
  }
  if (endpoint === 'audience') {
    params.set('page', String(currentPage('clients')));
    params.set('page_size', String(rowLimit('clients')));
  }
  return `/v2/${endpoint}?${params}`;
}

function endpointDataKey(endpoint) {
  return endpoint === 'accounts' ? 'accounts' : endpointPath(endpoint, { includeView: false });
}

function acceptsDashboardView(endpoint, payload) {
  if (endpoint === 'accounts') return true;
  return Boolean(
    state.view
    && payload?.meta?.view_id === state.view.id
    && payload?.meta?.data_cutoff === state.view.cutoff
    && payload?.meta?.filter_key === state.view.filterKey
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
  const kind = String(row.visitor_kind || row.kind || '').toLowerCase();
  const key = safeText(
    row.visitor_label
      || row.client_label
      || row.client_key
      || row.estimated_client_key
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
  if (origin === 'icon_lookup') {
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

function searcherCountLabel(value) {
  const count = number(value);
  return `${formatNumber(count)} ${count === 1 ? 'searcher' : 'searchers'}`;
}

function queryActivityCell(row = {}, rowIndex = -1) {
  const count = number(row.activity_count ?? row.attempt_count);
  const kind = String(row.activity_kind || '').toLowerCase() === 'lookup' ? 'lookup' : 'search';
  const label = count === 1 ? kind : kind === 'search' ? 'searches' : 'lookups';
  return `<span title="Recorded ${escapeHtml(kind)} activity for this searcher">${formatNumber(count)} ${escapeHtml(label)}</span>`;
}

function querySearcherCell(row = {}, rowIndex = -1) {
  const searcher = normalizeList(row.searchers)[0];
  if (!searcher) return '<span class="muted-cell">Unknown searcher</span>';
  const detailsAvailable = row.searcher_details_available === true;
  const kind = safeText(searcher.kind, 'anonymous');
  return `
    <strong>${escapeHtml(safeText(searcher.label, 'Unknown searcher'))}</strong>
    <div class="activity-meta">
      ${escapeHtml(kind)}${searcher.account_linked ? ' | Account linked' : ''}
      ${detailsAvailable ? `<button class="icon-button inline-icon-button" type="button" data-searcher-details="${rowIndex}" aria-label="Open Searcher details" title="Searcher details">${iconSvg('info')}</button>` : ''}
    </div>
  `;
}

function closeSearcherDetails() {
  const modal = $('searcherDetailsModal');
  modal?.classList.remove('open');
  modal?.setAttribute('aria-hidden', 'true');
  if (state.searcherDetailsReturnFocus instanceof HTMLElement) {
    state.searcherDetailsReturnFocus.focus();
  }
  state.searcherDetailsReturnFocus = null;
}

function openSearcherDetails(rowIndex, trigger) {
  const row = state.visibleQueryRows[Number(rowIndex)];
  const modal = $('searcherDetailsModal');
  const content = $('searcherDetailsContent');
  const lead = $('searcherDetailsLead');
  if (!row || !modal || !content) return;
  const searchers = normalizeList(row.searchers);
  if (lead) {
    lead.textContent = `${safeText(row.query, 'Selected query')}: ${searcherCountLabel(row.estimated_client_id_count ?? searchers.length)}.`;
  }
  content.innerHTML = table([
    { label: 'Searcher', render: (item) => `<strong>${escapeHtml(safeText(item.label, 'Anonymous'))}</strong><div class="activity-meta">${escapeHtml(safeText(item.kind, 'anonymous'))}${item.account_linked ? ' | Account linked' : ''}</div>` },
    { label: 'Searches', number: true, render: (item) => formatNumber(item.searches) },
    { label: 'Venues', render: (item) => normalizeList(item.channels).length ? escapeHtml(item.channels.map(channelLabel).join(', ')) : '<span class="muted-cell">Not recorded</span>' },
    { label: 'Country', render: (item) => normalizeList(item.countries).length ? escapeHtml(item.countries.join(', ')) : '<span class="muted-cell">Not recorded</span>' },
    { label: 'First seen', render: (item) => escapeHtml(formatDate(item.first_seen, true)) },
    { label: 'Last seen', render: (item) => escapeHtml(formatDate(item.last_seen, true)) },
  ], searchers, row.searcher_details_reason || 'Searcher details are not available for this grouped view.');
  state.searcherDetailsReturnFocus = trigger instanceof HTMLElement ? trigger : null;
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  requestAnimationFrame(() => $('closeSearcherDetails')?.focus());
}

function queryResultCell(row = {}) {
  if (String(row.query_origin || row.origin || '').toLowerCase() === 'icon_lookup'
    && row.result_count_available === false) {
    return '<span class="muted-cell">Lookup completed</span>';
  }
  if (row.result_count_available === false) {
    return `<span class="muted-cell">${escapeHtml(row.result_count_reason || 'Not available for this view')}</span>`;
  }
  if (row.result_count_kind === 'range_across_attempts') {
    const range = `${formatNumber(row.result_count_min)} to ${formatNumber(row.result_count_max)}`;
    const scope = row.result_count_scope === 'current_day'
      ? 'Exact results recorded today within this grouped period'
      : row.result_count_reason || 'Result range across grouped activity';
    return `<span title="${escapeHtml(scope)}">${escapeHtml(range)} ${escapeHtml(countWithUnit(2, row.result_unit).replace(/^2 /, ''))}</span>`;
  }
  if (row.result_unit === 'match' && number(row.result_count ?? row.results) === 0) {
    return 'Icon not found';
  }
  const value = countWithUnit(row.result_count ?? row.results, row.result_unit);
  if (row.result_count_scope !== 'current_day') return value;
  return `<span title="Exact result recorded today within this grouped period">${value}</span>`;
}

function queryCountryCell(row = {}) {
  const country = row.country_code || row.country;
  if (row.country_available === false || !country) {
    if (number(row.country_count) > 1) {
      return `<span title="${escapeHtml(row.country_reason || 'Multiple countries across grouped activity')}">${pill(`${formatNumber(row.country_count)} countries`)}</span>`;
    }
    return `<span class="muted-cell">${escapeHtml(row.country_reason || 'Country not recorded')}</span>`;
  }
  if (row.country_scope !== 'current_day') return pill(country);
  return `<span title="Country recorded today within this grouped period">${pill(country)}</span>`;
}

function queryChannelCell(row = {}) {
  if (row.channel_available === false) {
    return `<span class="muted-cell">${escapeHtml(row.channel_reason || 'Venue not recorded')}</span>`;
  }
  const channel = String(row.channel || row.venue || '').toLowerCase();
  if (channel === 'hosted_mcp') {
    return `<span class="muted-cell">${escapeHtml(channelLabel(channel))}</span>`;
  }
  return pill(channelLabel(row.channel || row.venue), 'info');
}

function table(headers, rows, emptyReason) {
  if (!rows.length) return emptyState(emptyReason);
  return `
    <table>
      <thead><tr>${headers.map((header) => `<th class="${header.number ? 'number' : ''}">${escapeHtml(header.label)}</th>`).join('')}</tr></thead>
      <tbody>${rows.map((row, rowIndex) => `
        <tr>${headers.map((header) => `<td class="${header.number ? 'number' : ''}">${header.render(row, rowIndex)}</td>`).join('')}</tr>
      `).join('')}</tbody>
    </table>
  `;
}

function csvCell(value) {
  const raw = String(value ?? '');
  const text = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
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
        { label: 'Icon', render: (row) => `<strong>${escapeHtml(safeText(row.icon_name || row.icon_id))}</strong><div class="activity-meta">${escapeHtml(safeText(row.library, 'Library unknown'))}</div>` },
        { label: 'Returns', number: true, render: (row) => formatNumber(row.count ?? row.returns) },
        { label: 'Queries', number: true, render: (row) => formatNumber(row.distinct_queries) },
      ],
    };
  }
  if (key === 'copied') {
    return {
      headers: [
        { label: 'Icon', render: (row) => `<strong>${escapeHtml(safeText(row.icon_name || row.icon_id))}</strong><div class="activity-meta">${escapeHtml(safeText(row.action, 'Copy or download'))}</div>` },
        { label: 'Actions', number: true, render: (row) => formatNumber(row.count ?? row.actions) },
        { label: 'Est. reach', number: true, render: (row) => formatNumber(row.distinct_clients) },
      ],
    };
  }
  if (key === 'zero') {
    return {
      headers: [
        { label: 'Query', render: (row) => `<button class="text-link" type="button" data-open-worklist="${escapeHtml(safeText(row.query, ''))}">${escapeHtml(safeText(row.query, 'Empty query'))}</button><div class="activity-meta">${escapeHtml(safeText(row.library_filter, 'All libraries'))}</div>` },
        { label: 'Zeros', number: true, render: (row) => formatNumber(row.count ?? row.attempt_count ?? row.zero_attempt_count) },
        { label: clientHeader, number: true, render: (row) => formatNumber(row.distinct_clients ?? row.estimated_unique_clients) },
        { label: 'Last seen', render: (row) => escapeHtml(formatDate(row.last_seen, true)) },
      ],
    };
  }
  return {
    headers: [
      { label: 'Query', render: (row) => `<strong>${escapeHtml(safeText(row.query, 'Empty query'))}</strong><div class="activity-meta">${escapeHtml(safeText(row.library_filter, 'All libraries'))}</div>` },
      { label: 'Searches', number: true, render: (row) => formatNumber(row.count ?? row.searches ?? row.attempt_count) },
      { label: clientHeader, number: true, render: (row) => formatNumber(row.distinct_clients ?? row.estimated_unique_clients) },
      { label: 'Hit rate', number: true, render: (row) => formatPercent(row.hit_rate ?? row.success_rate) },
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
  element.innerHTML = table(
    topListConfig(state.topList, list.rows).headers,
    rowsForPage('topList', list.rows),
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
  if (!element) return;
  if (!state.data.search && state.loading.has('search')) {
    renderPagination('queries', 0, 1);
    element.innerHTML = loadingState('Loading query explorer');
    return;
  }
  if (state.data.search?.queries_available === false) {
    renderPagination('queries', 0, 1);
    element.innerHTML = emptyState(state.data.search.queries_unavailable_reason || 'Complete query history is not available for this period.');
    return;
  }
  const rows = rowsForPage('queries', state.data.search?.queries, state.data.search?.pagination);
  state.visibleQueryRows = rows;
  const headers = [
    {
      label: 'Query',
      render: (row) => `<strong>${escapeHtml(safeText(row.query, 'Empty query'))}</strong><div class="activity-meta">${escapeHtml(safeText(row.library_filter || row.library, 'All libraries'))} | ${escapeHtml(originLabel(row.query_origin || row.origin))}</div>`,
    },
    { label: 'Searcher', render: (row, rowIndex) => querySearcherCell(row, rowIndex) },
    { label: 'Searches', render: (row, rowIndex) => queryActivityCell(row, rowIndex) },
    { label: 'Outcome', render: (row) => { const value = outcomeFor(row); return pill(value.label, value.tone); } },
    { label: 'Country', render: (row) => queryCountryCell(row) },
    { label: 'Venue', render: (row) => queryChannelCell(row) },
    { label: 'Returned', number: true, render: (row) => queryResultCell(row) },
    { label: 'Last seen', render: (row) => escapeHtml(formatDate(row.last_seen || row.created_at, true)) },
  ];
  element.innerHTML = table(headers, rows, state.errors.search || 'No queries match these filters.');
}

function renderWorklist() {
  const element = $('gapWorklist');
  if (!element) return;
  if (!state.data.search && state.loading.has('search')) {
    renderPagination('worklist', 0, 1);
    element.innerHTML = loadingState('Loading gap worklist');
    return;
  }
  if (!state.data.search && state.errors.search) {
    renderPagination('worklist', 0, 1);
    element.innerHTML = emptyState(state.errors.search);
    return;
  }
  if (state.data.search?.worklist_available === false) {
    renderPagination('worklist', 0, 1);
    element.innerHTML = emptyState(state.data.search.worklist_unavailable_reason || 'The complete worklist is not available for this period.');
    return;
  }
  const rows = rowsForPage('worklist', state.data.search?.worklist);
  const clientHeader = rows.some((row) => row.client_measure === 'client_days') ? 'Daily reach' : 'Est. reach';
  element.innerHTML = table([
    { label: 'Query', render: (row) => `<strong>${escapeHtml(safeText(row.query, 'Empty query'))}</strong><div class="activity-meta">${escapeHtml(safeText(row.review_status || row.why, 'Not reviewed'))}</div>` },
    { label: 'Issue', render: (row) => { const value = outcomeFor(row); return pill(value.label, value.tone); } },
    { label: clientHeader, number: true, render: (row) => formatNumber(row.distinct_clients ?? row.estimated_unique_clients) },
    { label: 'Attempts', number: true, render: (row) => formatNumber(row.attempt_count) },
    {
      label: 'WHY',
      render: (row) => {
        const key = `query:${safeText(row.query, '')}:${safeText(row.library_filter, 'all')}`;
        const value = safeText(row.review_status, '');
        return `<select class="inline-select" data-query-review data-query="${escapeHtml(row.query)}" data-library="${escapeHtml(row.library_filter || 'all')}" aria-label="Review ${escapeHtml(row.query)}"${state.savingRows.has(key) ? ' disabled' : ''}>
          <option value=""${!value ? ' selected' : ''}>Not reviewed</option>
          <option value="needs_alias"${value === 'needs_alias' ? ' selected' : ''}>Needs alias</option>
          <option value="needs_icon"${value === 'needs_icon' ? ' selected' : ''}>Needs icon</option>
          <option value="resolved"${value === 'resolved' ? ' selected' : ''}>Resolved</option>
          <option value="ignore"${value === 'ignore' ? ' selected' : ''}>Ignore</option>
        </select>`;
      },
    },
  ], rows, 'No unresolved search gaps match these filters.');
}

function renderIconRequests() {
  const element = $('iconRequests');
  if (!element) return;
  if (!state.data.search && state.loading.has('search')) {
    renderPagination('iconRequests', 0, 1);
    element.innerHTML = loadingState('Loading icon requests');
    return;
  }
  if (!state.data.search && state.errors.search) {
    renderPagination('iconRequests', 0, 1);
    element.innerHTML = emptyState(state.errors.search);
    return;
  }
  const inbox = availability(state.data.search?.icon_requests, 'Icon requests are not available from the current data source.');
  if (!inbox.available) {
    renderPagination('iconRequests', 0, 1);
    element.innerHTML = emptyState(inbox.reason);
    return;
  }
  element.innerHTML = table([
    { label: 'Request', render: (row) => `<strong>${escapeHtml(safeText(row.request_text || row.evidence_text))}</strong>` },
    { label: 'Submitter', render: (row) => visitorLabel(row) },
    { label: 'Country', render: (row) => pill(safeText(row.country_code || row.country, 'Unknown')) },
    { label: 'Submitted', render: (row) => escapeHtml(formatDate(row.created_at, true)) },
    {
      label: 'Status',
      render: (row) => {
        if (inbox.status_available === false) return `<span class="muted-cell">${escapeHtml(inbox.status_reason || 'Status unavailable')}</span>`;
        const key = `request:${safeText(row.id, '')}`;
        const value = safeText(row.status, 'new');
        return `<select class="inline-select" data-icon-request-review data-request-id="${escapeHtml(row.id)}" aria-label="Status for ${escapeHtml(safeText(row.request_text || row.evidence_text, 'icon request'))}"${state.savingRows.has(key) ? ' disabled' : ''}>
          <option value="new"${value === 'new' ? ' selected' : ''}>New</option>
          <option value="planned"${value === 'planned' ? ' selected' : ''}>Planned</option>
          <option value="added"${value === 'added' ? ' selected' : ''}>Added</option>
          <option value="declined"${value === 'declined' ? ' selected' : ''}>Declined</option>
        </select>`;
      },
    },
  ], rowsForPage('iconRequests', inbox.rows), 'No icon requests have been submitted in this period.');
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
  element.innerHTML = table([
    { label: 'From', render: (row) => `<strong>${escapeHtml(safeText(row.name, 'No name'))}</strong><div class="activity-meta">${escapeHtml(truncate(row.email, 34))}</div>` },
    { label: 'Interest', render: (row) => pill(safeText(row.interest, 'General')) },
    { label: 'Message', render: (row) => escapeHtml(truncate(row.message, 90)) },
    { label: 'Received', render: (row) => escapeHtml(formatDate(row.created_at, true)) },
  ], rowsForPage('contact', inbox.rows), 'No contact submissions have been stored yet.');
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
  renderContactInbox();
  renderDiagnostics();
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
    if ($('registeredUsers')) $('registeredUsers').innerHTML = emptyState(state.errors.audience);
    if ($('allClients')) $('allClients').innerHTML = emptyState(state.errors.audience);
    renderPagination('registeredUsers', 0, 1);
    renderPagination('clients', 0, 1);
    return;
  }
  const funnel = data?.funnel || {};
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
    ? table([
      { label: 'User', render: (row) => `<strong>${escapeHtml(safeText(row.identifier, 'Hidden'))}</strong><div class="activity-meta">${escapeHtml(safeText(row.provider, 'Unknown provider'))}</div>` },
      { label: 'Plan', render: (row) => pill(safeText(row.plan, 'Free'), String(row.plan || '').toLowerCase().includes('pro') ? 'pro' : '') },
      { label: 'Signed up', render: (row) => escapeHtml(formatDate(row.signup_at || row.created_at, true)) },
      { label: 'Last sign-in', render: (row) => row.last_sign_in ? escapeHtml(formatDate(row.last_sign_in, true)) : '<span class="muted-cell">No sign-in recorded</span>' },
      { label: 'Last search', render: (row) => row.last_search ? escapeHtml(formatDate(row.last_search, true)) : '<span class="muted-cell">No linked search</span>' },
      { label: 'Searches', number: true, render: (row) => row.searches == null ? '<span class="muted-cell">Not linked</span>' : formatNumber(row.searches) },
      { label: 'Venues', render: (row) => normalizeList(row.venues).length ? escapeHtml(row.venues.map(channelLabel).join(', ')) : '<span class="muted-cell">Not linked</span>' },
      { label: 'Country', render: (row) => row.country_code || row.country ? pill(row.country_code || row.country) : '<span class="muted-cell">Not linked</span>' },
    ], rowsForPage('registeredUsers', registeredRows), 'No registered users match these filters.')
    : emptyState(users.reason);
  if (!users.available && !accounts.available) renderPagination('registeredUsers', 0, 1);

  const allClients = availability(data?.clients, 'Searcher details are not available from the current data source.');
  $('allClients').innerHTML = allClients.available
    ? table([
      { label: 'Searcher', render: (row) => visitorLabel(row) },
      { label: 'Plan', render: (row) => pill(safeText(row.plan, 'Free'), String(row.plan || '').toLowerCase().includes('pro') ? 'pro' : '') },
      { label: 'Country', render: (row) => pill(safeText(row.country_code || row.country, 'Unknown')) },
      { label: 'First seen', render: (row) => escapeHtml(formatDate(row.first_seen, true)) },
      { label: 'Last seen', render: (row) => escapeHtml(formatDate(row.last_seen, true)) },
      { label: 'Searches', number: true, render: (row) => formatNumber(row.searches) },
      { label: 'Top query', render: (row) => escapeHtml(truncate(row.top_query, 34)) },
    ], rowsForPage('clients', allClients.rows, data?.pagination), 'No searchers match these filters.')
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
  const [zero, low, evidence] = await Promise.all([
    apiRequest(`/intelligence/search/queue?${zeroParams}`),
    apiRequest(`/intelligence/search/queue?${lowParams}`),
    apiRequest(`/intelligence/evidence?${evidenceParams}`),
  ]);
  const zeroRows = normalizeList(zero.queries).map((row) => legacyQueueRow(row, 'zero_result'));
  const lowRows = normalizeList(low.queries).map((row) => legacyQueueRow(row, 'low_result'));
  const requests = normalizeList(evidence.evidence)
    .filter((row) => row.ui_surface === 'grid_empty_feedback' && String(row.evidence_text || '').trim())
    .map((row) => ({
      ...row,
      request_text: row.evidence_text,
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

async function fetchAllPages(endpoint, rowsPath) {
  const pageSize = 100;
  const params = sharedParams({ forSearch: endpoint === 'search' });
  params.set('page', '1');
  params.set('page_size', String(pageSize));
  if (endpoint === 'search' && state.explorerIssue) params.set('issue', state.explorerIssue);
  const first = await apiRequest(`/v2/${endpoint}?${params}`);
  if (endpoint === 'activity' && first.meta?.raw_rows_truncated === true) {
    throw new Error('Complete activity exceeds the safe export limit. Choose a shorter date range.');
  }
  if (endpoint === 'search' && first.queries_available === false) {
    throw new Error(first.queries_unavailable_reason || 'Complete query data is not available for this period.');
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

async function exportData(key) {
  const overview = state.data.overview || {};
  const search = state.data.search || {};
  const audience = state.data.audience || {};
  let completeRows = null;
  try {
    if (key === 'queries-csv' || key === 'queries-json') {
      completeRows = await fetchAllPages('search', (payload) => normalizeList(payload.queries));
    } else if (key === 'gap-worklist-csv' || key === 'gap-worklist-json') {
      const queryRows = await fetchAllPages('search', (payload) => normalizeList(payload.queries));
      completeRows = queryRows.filter((row) => (
        ['zero_result', 'low_result', 'mixed_result'].includes(String(row.issue_type || ''))
        && !['resolved', 'ignore'].includes(String(row.review_status || ''))
      ));
    } else if (key === 'clients') {
      completeRows = await fetchAllPages('audience', (payload) => unwrapRows(payload.clients));
    } else if (key === 'activity') {
      completeRows = await fetchAllPages('activity', (payload) => normalizeList(payload.activity));
    }
  } catch (error) {
    showToast(error.message || 'The complete export could not be loaded.', true);
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
    'queries-csv': completeRows ?? normalizeList(search.queries),
    'queries-json': completeRows ?? normalizeList(search.queries),
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
  const rows = normalizeList(mapping[key]).map(plainExportRow);
  exportRows(
    `supericons-${key}-${state.filters.window}`,
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
  const status = String(select.value || '').trim();
  if (!status) {
    showToast('Choose a review action.', true);
    renderWorklist();
    return;
  }
  const key = `query:${query}:${libraryFilter}`;
  state.savingRows.add(key);
  renderWorklist();
  try {
    await apiRequest('/intelligence/search/review', {
      method: 'POST',
      body: JSON.stringify({ query, library_filter: libraryFilter, status }),
    });
    showToast('Search gap review saved.');
    await refreshListEndpoint('queries');
  } catch (error) {
    showToast(error.message || 'The search gap review could not be saved.', true);
    renderWorklist();
  } finally {
    state.savingRows.delete(key);
    renderWorklist();
  }
}

async function saveIconRequestReview(select) {
  const iconEvidenceId = String(select.dataset.requestId || '').trim();
  const status = String(select.value || '').trim();
  const key = `request:${iconEvidenceId}`;
  state.savingRows.add(key);
  renderIconRequests();
  try {
    await apiRequest('/v2/icon-requests/review', {
      method: 'POST',
      body: JSON.stringify({ icon_evidence_id: iconEvidenceId, status }),
    });
    showToast('Icon request status saved.');
    await refreshListEndpoint('queries');
  } catch (error) {
    showToast(error.message || 'The icon request status could not be saved.', true);
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

    const toggle = document.createElement('button');
    toggle.className = 'small-button icon-button panel-toggle';
    toggle.type = 'button';
    toggle.dataset.panelToggle = '';
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', `Collapse ${title}`);
    toggle.title = `Collapse ${title}`;
    toggle.innerHTML = iconSvg('collapse');
    actions.appendChild(toggle);
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
      exportData(button.dataset.export);
    });
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
    const searcherDetailsButton = event.target.closest('[data-searcher-details]');
    if (searcherDetailsButton) {
      openSearcherDetails(searcherDetailsButton.dataset.searcherDetails, searcherDetailsButton);
      return;
    }
    const worklistButton = event.target.closest('[data-open-worklist]');
    if (worklistButton) {
      openWorklist(worklistButton.dataset.openWorklist);
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
    const requestReview = event.target.closest('[data-icon-request-review]');
    if (requestReview) saveIconRequestReview(requestReview);
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
  $('includeTestTraffic')?.addEventListener('change', (event) => {
    state.filters.includeTest = event.target.checked;
    resetPages();
    scheduleRefresh(0);
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
  $('closeSearcherDetails')?.addEventListener('click', closeSearcherDetails);
  $('searcherDetailsModal')?.addEventListener('click', (event) => {
    if (event.target === event.currentTarget) closeSearcherDetails();
  });
  $('searcherDetailsModal')?.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeSearcherDetails();
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
