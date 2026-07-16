const ADMIN_API_BASE = 'https://kcjmkakdhsqplvasgkjv.supabase.co/functions/v1/admin-api';
const ADMIN_SECRET_STORAGE_KEY = 'si_admin_secret';
const ADMIN_SIDEBAR_COLLAPSED_KEY = 'si_admin_sidebar_collapsed';
const INTELLIGENCE_WINDOWS = [
  { key: '1d', shortLabel: '24h', longLabel: 'Last 24 hours' },
  { key: '7d', shortLabel: '7d', longLabel: 'Last 7 days' },
  { key: '30d', shortLabel: '30d', longLabel: 'Last 30 days' },
  { key: '90d', shortLabel: '90d', longLabel: 'Last 90 days' },
  { key: '1y', shortLabel: '1y', longLabel: 'Last 12 months' },
  { key: 'all', shortLabel: 'All time', longLabel: 'All recorded history' },
];
const PURPOSE_LABELS = {
  'ai-agent-workflows': 'AI & Agents',
  'navigation-wayfinding': 'Navigation & Wayfinding',
  'status-feedback': 'Status & Feedback',
};
const QUERY_REVIEW_STATUS_LABELS = {
  resolved: 'Resolved',
  needs_alias: 'Needs Alias',
  needs_icon: 'Needs Icon',
  ignore: 'Ignore',
};
const QUERY_ISSUE_LABELS = {
  zero_result: 'Zero results',
  low_result: 'Low results',
  replacement_heavy: 'Replaced often',
  successful: 'Successful',
  mcp: 'MCP',
};
const QUERY_ENVIRONMENT_LABELS = {
  live: 'Production',
  production: 'Production',
  preview: 'Preview',
  local: 'Local / dev',
  test: 'Automated test',
  legacy: 'Unclassified source',
  all: 'All environments',
};
const QUERY_ENVIRONMENT_VALUES = new Set(Object.keys(QUERY_ENVIRONMENT_LABELS));
const QUERY_CHANNEL_LABELS = {
  all: 'All channels',
  web: 'Web',
  hosted_mcp: 'Hosted MCP',
  local_mcp: 'Local MCP / npm',
  cli: 'CLI',
  api: 'API',
  internal_test: 'Internal / test',
  unknown: 'Unclassified',
};
const QUERY_CHANNEL_VALUES = new Set(Object.keys(QUERY_CHANNEL_LABELS));
const UMAMI_TABLE_KEYS = new Set([
  'path',
  'fullPath',
  'entry',
  'exit',
  'title',
  'query',
  'referrer',
  'channel',
  'domain',
  'browser',
  'city',
]);
const ACTIVE_QUERY_REVIEW_STATUSES = new Set(['needs_alias', 'needs_icon']);

const state = {
  stats: null,
  intelligenceOverview: null,
  intelligenceEvidence: [],
  intelligenceEvidencePagination: { page: 1, page_count: 1, total: 0, page_size: 50 },
  intelligenceMetadataCoverage: 0,
  searchIntelligence: null,
  queryQueue: [],
  queryQueueSummary: null,
  queryQueuePagination: { page: 1, page_count: 1, total: 0, page_size: 25 },
  queryQueueFilters: { q: '', issue_type: '', status: '', environment: 'live', channel: 'all', library_filter: '', job_category: '' },
  queryQueueSort: { field: 'last_seen', direction: 'desc' },
  queryQueueFallback: false,
  queryQueueFallbackMessage: '',
  selectedQueryDetail: null,
  queryDetailLoading: false,
  selectedQueryReview: null,
  queryReviewSaving: false,
  showReviewedQueries: false,
  intelligenceWindow: '30d',
  intelligenceFilters: { q: '', signal_type: '', channel: 'all' },
  umami: { loaded: false, files: [], tables: {}, summary: null },
  users: [],
  usersPagination: { page: 1, page_count: 1, total: 0, page_size: 25 },
  usersFilters: { q: '', plan: '', status: '', provider: '' },
  auditLog: [],
  auditPagination: { page: 1, page_count: 1, total: 0, page_size: 25 },
  auditFilters: { q: '', action: '' },
  selectedUser: null,
  toastTimer: null,
  adminSecretPrompt: null,
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

function formatNumber(value) {
  const number = Number(value || 0);
  if (!Number.isFinite(number)) return '0';
  return new Intl.NumberFormat('en-US').format(number);
}

function stripTokenLikeText(value) {
  return String(value ?? '')
    .replace(/access_token=[^&#\s]+/gi, 'access_token=[hidden]')
    .replace(/refresh_token=[^&#\s]+/gi, 'refresh_token=[hidden]')
    .replace(/id_token=[^&#\s]+/gi, 'id_token=[hidden]')
    .replace(/token=[^&#\s]+/gi, 'token=[hidden]')
    .replace(/key=[^&#\s]+/gi, 'key=[hidden]')
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[hidden-token]')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[hidden-email]');
}

function sanitizeAnalyticsPath(value) {
  const text = stripTokenLikeText(value).trim();
  if (!text) return '';
  try {
    const parsed = new URL(text, 'https://supericons.dev');
    const safeParams = new URLSearchParams();
    parsed.searchParams.forEach((paramValue, key) => {
      const normalizedKey = key.toLowerCase();
      if (normalizedKey.includes('token') || normalizedKey.includes('secret') || normalizedKey.includes('key')) {
        safeParams.set(key, '[hidden]');
      } else {
        safeParams.set(key, stripTokenLikeText(paramValue));
      }
    });
    const query = safeParams.toString();
    const path = `${parsed.pathname}${query ? `?${query}` : ''}`;
    return path === '/' && !text.startsWith('/') ? stripTokenLikeText(text.split('#')[0]) : path;
  } catch {
    return text.split('#')[0];
  }
}

function parseCsvText(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;
  const source = String(text || '').replace(/^\uFEFF/, '');

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];
    if (char === '"') {
      if (inQuotes && next === '"') {
        cell += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === ',' && !inQuotes) {
      row.push(cell);
      cell = '';
      continue;
    }
    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(cell);
      if (row.some((value) => String(value).trim() !== '')) rows.push(row);
      row = [];
      cell = '';
      continue;
    }
    cell += char;
  }

  row.push(cell);
  if (row.some((value) => String(value).trim() !== '')) rows.push(row);
  if (!rows.length) return [];
  const headers = rows[0].map((header) => String(header || '').trim());
  return rows.slice(1).map((values) => headers.reduce((record, header, index) => {
    record[header] = values[index] ?? '';
    return record;
  }, {}));
}

function numberFromCsv(value) {
  const parsed = Number(String(value ?? '').replace(/,/g, '').trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatDate(value, options = {}) {
  if (!value) return '-';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '-';
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      ...options,
    }).format(date);
  } catch {
    return value;
  }
}

function formatDateTime(value) {
  return formatDate(value, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatRelativeDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '-';
  const deltaMs = Date.now() - date.getTime();
  const deltaHours = Math.floor(deltaMs / (1000 * 60 * 60));
  if (deltaHours < 1) return 'Just now';
  if (deltaHours < 24) return `${deltaHours}h ago`;
  const deltaDays = Math.floor(deltaHours / 24);
  if (deltaDays < 7) return `${deltaDays}d ago`;
  return formatDate(value);
}

function getAdminSecret() {
  return window.sessionStorage.getItem(ADMIN_SECRET_STORAGE_KEY) || '';
}

function setAdminSecret(secret) {
  const value = String(secret || '').trim();
  if (!value) {
    window.sessionStorage.removeItem(ADMIN_SECRET_STORAGE_KEY);
    return;
  }
  window.sessionStorage.setItem(ADMIN_SECRET_STORAGE_KEY, value);
}

function setAdminSecretError(message = '') {
  const errorEl = $('adminSecretError');
  if (!errorEl) return;
  errorEl.textContent = message;
  errorEl.style.display = message ? 'block' : 'none';
}

function closeAdminSecretModal() {
  $('adminSecretModal')?.classList.remove('open');
  $('adminSecretModal')?.setAttribute('aria-hidden', 'true');
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
  const cancelBtn = $('adminSecretCancelBtn');
  const lead = $('adminSecretLead');

  if (!overlay || !input) {
    return Promise.reject(new Error('Admin auth modal is unavailable.'));
  }

  overlay.classList.add('open');
  overlay.setAttribute('aria-hidden', 'false');
  input.value = '';
  setAdminSecretError(error);
  if (lead) {
    lead.innerHTML = force
      ? 'Enter the current Supabase <code>ADMIN_SECRET</code> to reconnect the Supericons admin API for this browser tab.'
      : 'Enter the Supabase <code>ADMIN_SECRET</code> to unlock the Supericons admin API for this browser tab.';
  }
  if (cancelBtn) {
    cancelBtn.style.display = existing ? '' : 'none';
  }

  requestAnimationFrame(() => input.focus());

  const promise = new Promise((resolve, reject) => {
    state.adminSecretPrompt = { promise: null, resolve, reject };
  });
  state.adminSecretPrompt.promise = promise;
  return promise;
}

async function ensureAdminSecret(force = false, error = '') {
  const existing = getAdminSecret();
  if (existing && !force) return existing;
  return openAdminSecretModal({ force, error });
}

function submitAdminSecretForm(event) {
  event.preventDefault();
  const input = $('adminSecretInput');
  const value = String(input?.value || '').trim();
  if (!value) {
    setAdminSecretError('Enter the current ADMIN_SECRET to continue.');
    input?.focus();
    return;
  }

  setAdminSecret(value);
  closeAdminSecretModal();
  setAdminSecretError('');

  const pending = state.adminSecretPrompt;
  state.adminSecretPrompt = null;
  pending?.resolve(getAdminSecret());
}

function cancelAdminSecretPrompt() {
  if (!getAdminSecret()) {
    setAdminSecretError('Admin secret is required to use the dashboard.');
    $('adminSecretInput')?.focus();
    return;
  }

  closeAdminSecretModal();
  setAdminSecretError('');
  const pending = state.adminSecretPrompt;
  state.adminSecretPrompt = null;
  pending?.reject(new Error('Admin secret update canceled.'));
}

async function apiRequest(path, options = {}, retry = true) {
  const secret = await ensureAdminSecret();
  if (!secret) {
    throw new Error('Admin secret is required.');
  }

  const method = String(options.method || 'GET').toUpperCase();
  const requestUrl = method === 'GET'
    ? `${ADMIN_API_BASE}${path}${path.includes('?') ? '&' : '?'}_ts=${Date.now()}`
    : `${ADMIN_API_BASE}${path}`;

  const response = await fetch(requestUrl, {
    ...options,
    method,
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-secret': secret,
      ...(options.headers || {}),
    },
  });

  let payload = {};
  try {
    payload = await response.json();
  } catch {
    payload = {};
  }

  if (response.status === 403 && retry) {
    setAdminSecret('');
    await ensureAdminSecret(true, 'That ADMIN_SECRET was rejected. Enter the current secret and try again.');
    return apiRequest(path, options, false);
  }

  if (!response.ok) {
    throw new Error(formatApiErrorMessage(payload, response.status));
  }

  return payload;
}

function formatApiErrorMessage(payload, status) {
  const fallback = `Request failed (${status})`;
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

async function apiRawRequest(path, options = {}, retry = true) {
  const secret = await ensureAdminSecret();
  if (!secret) {
    throw new Error('Admin secret is required.');
  }

  const method = String(options.method || 'GET').toUpperCase();
  const requestUrl = method === 'GET'
    ? `${ADMIN_API_BASE}${path}${path.includes('?') ? '&' : '?'}_ts=${Date.now()}`
    : `${ADMIN_API_BASE}${path}`;

  const response = await fetch(requestUrl, {
    ...options,
    method,
    cache: 'no-store',
    headers: {
      'x-admin-secret': secret,
      ...(options.headers || {}),
    },
  });

  if (response.status === 403 && retry) {
    setAdminSecret('');
    await ensureAdminSecret(true, 'That ADMIN_SECRET was rejected. Enter the current secret and try again.');
    return apiRawRequest(path, options, false);
  }

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const payload = await response.json();
      message = payload.error || message;
    } catch {
      // Keep the status-based message when the response is not JSON.
    }
    throw new Error(message);
  }

  return response;
}

function showToast(message, type = 'info') {
  const toast = $('adminToast');
  if (!toast) return;
  toast.textContent = message;
  toast.className = `toast open ${type === 'error' ? 'error' : ''}`.trim();
  clearTimeout(state.toastTimer);
  state.toastTimer = window.setTimeout(() => {
    toast.className = 'toast';
  }, 3200);
}

function emptyState(icon, label) {
  return `
    <div class="empty-state">
      <span class="material-symbols-outlined">${icon}</span>
      <span class="empty-state__label">${escapeHtml(label)}</span>
    </div>
  `;
}

function initials(value) {
  const text = String(value || '').trim();
  if (!text) return 'SI';
  const parts = text.split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]).join('').toUpperCase();
}

function actionChipClass(action) {
  if (action.includes('search')) return 'search';
  if (action.includes('delete')) return 'delete';
  if (action.includes('cancel')) return 'cancel';
  if (action.includes('ban')) return 'ban';
  return 'revoke';
}

function providerBadge(providerLabel) {
  const normalized = String(providerLabel || '').toLowerCase();
  const badgeClass = normalized.includes('google') ? 'badge-google' : 'badge-email';
  return `<span class="badge ${badgeClass}">${escapeHtml(providerLabel || 'Email')}</span>`;
}

function planBadge(plan) {
  if (!plan) return '<span class="badge badge-free">Free</span>';
  const label = plan === 'pro_annual' ? 'Pro Annual' : plan === 'pro_monthly' ? 'Pro Monthly' : plan;
  return `<span class="badge badge-pro">${escapeHtml(label)}</span>`;
}

function statusBadge(user) {
  if (user.banned_until && new Date(user.banned_until) > new Date()) {
    return '<span class="badge badge-canceled">Banned</span>';
  }
  const status = String(user.subscription_status || 'free').toLowerCase();
  if (status === 'active') return '<span class="badge badge-active">Active</span>';
  if (status === 'trialing') return '<span class="badge badge-warning">Trialing</span>';
  if (status === 'canceled') return '<span class="badge badge-canceled">Canceled</span>';
  return '<span class="badge badge-free">Free</span>';
}

function renderPagination(containerId, infoId, pagination, onClickName, itemLabel) {
  $(infoId).textContent = pagination.total
    ? `Showing ${((pagination.page - 1) * pagination.page_size) + 1}-${Math.min(pagination.page * pagination.page_size, pagination.total)} of ${pagination.total} ${itemLabel}`
    : `No ${itemLabel} found`;
  const container = $(containerId);
  if (!container) return;
  if (pagination.page_count <= 1) {
    container.innerHTML = '';
    return;
  }
  const pages = getVisiblePaginationPages(pagination);
  let html = `
    <button class="page-btn" type="button" onclick="${onClickName}(${Math.max(1, pagination.page - 1)})">
      <span class="material-symbols-outlined">chevron_left</span>
    </button>
  `;
  for (const page of pages) {
    if (page === 'ellipsis') {
      html += '<span class="pagination__ellipsis">...</span>';
      continue;
    }
    html += `<button class="page-btn ${page === pagination.page ? 'active' : ''}" type="button" onclick="${onClickName}(${page})">${page}</button>`;
  }
  html += `
    <button class="page-btn" type="button" onclick="${onClickName}(${Math.min(pagination.page_count, pagination.page + 1)})">
      <span class="material-symbols-outlined">chevron_right</span>
    </button>
  `;
  container.innerHTML = html;
}

function getVisiblePaginationPages(pagination) {
  const total = Math.max(1, Number(pagination.page_count || 1));
  const current = Math.min(total, Math.max(1, Number(pagination.page || 1)));
  if (total <= 9) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }

  const visible = new Set([1, total, current, current - 1, current + 1]);
  if (current <= 4) {
    [2, 3, 4, 5].forEach((page) => visible.add(page));
  }
  if (current >= total - 3) {
    [total - 4, total - 3, total - 2, total - 1].forEach((page) => visible.add(page));
  }

  const pages = [...visible]
    .filter((page) => page >= 1 && page <= total)
    .sort((a, b) => a - b);
  const result = [];
  let previous = 0;
  for (const page of pages) {
    if (previous && page - previous > 1) {
      result.push('ellipsis');
    }
    result.push(page);
    previous = page;
  }
  return result;
}

function sumMetric(rows, metric) {
  return (rows || []).reduce((sum, row) => sum + numberFromCsv(row[metric]), 0);
}

function mapUmamiRows(rows, { sanitizeName = false } = {}) {
  return (rows || []).map((row) => ({
    name: sanitizeName ? sanitizeAnalyticsPath(row.name) : stripTokenLikeText(row.name),
    country: stripTokenLikeText(row.country || ''),
    pageviews: numberFromCsv(row.pageviews),
    visitors: numberFromCsv(row.visitors),
    visits: numberFromCsv(row.visits),
    bounces: numberFromCsv(row.bounces),
    totalTime: numberFromCsv(row.totaltime),
  })).filter((row) => row.name);
}

function sortByVisitors(rows) {
  return [...(rows || [])].sort((a, b) => {
    if (b.visitors !== a.visitors) return b.visitors - a.visitors;
    if (b.pageviews !== a.pageviews) return b.pageviews - a.pageviews;
    return String(a.name).localeCompare(String(b.name));
  });
}

function aggregateCountryRows(rows) {
  const map = new Map();
  (rows || []).forEach((row) => {
    const key = row.country || row.name || 'Unknown';
    const current = map.get(key) || { name: key, visitors: 0, pageviews: 0, visits: 0 };
    current.visitors += row.visitors;
    current.pageviews += row.pageviews;
    current.visits += row.visits;
    map.set(key, current);
  });
  return sortByVisitors([...map.values()]);
}

function inferUmamiTableName(fileName) {
  const base = String(fileName || '')
    .replace(/\.csv$/i, '')
    .trim();
  if (base.toLowerCase() === 'fullpath') return 'fullPath';
  return UMAMI_TABLE_KEYS.has(base) ? base : '';
}

function buildUmamiSummary(tables) {
  const mapped = {};
  Object.entries(tables || {}).forEach(([key, rows]) => {
    mapped[key] = mapUmamiRows(rows, { sanitizeName: ['path', 'fullPath', 'entry', 'exit', 'query'].includes(key) });
  });

  const allRows = Object.values(mapped).flat();
  const maxVisitors = allRows.reduce((max, row) => Math.max(max, row.visitors || 0), 0);
  const pathRows = sortByVisitors(mapped.path || []);
  const channelRows = sortByVisitors(mapped.channel || []);
  const referrerRows = sortByVisitors(mapped.referrer || []);
  const browserRows = sortByVisitors(mapped.browser || []);
  const cityRows = sortByVisitors(mapped.city || []);
  const countryRows = aggregateCountryRows(cityRows);

  return {
    file_count: Object.keys(tables || {}).length,
    visitors: maxVisitors,
    pageviews: Math.max(sumMetric(mapped.path || [], 'pageviews'), sumMetric(mapped.fullPath || [], 'pageviews')),
    top_paths: pathRows.slice(0, 5),
    top_channels: channelRows.slice(0, 5),
    top_referrers: referrerRows.slice(0, 5),
    top_browsers: browserRows.slice(0, 4),
    top_countries: countryRows.slice(0, 5),
    top_cities: cityRows.slice(0, 5),
  };
}

async function importUmamiCsvFiles(files) {
  const selected = Array.isArray(files) ? files : [];
  if (!selected.length) return;
  const tables = {};
  const loadedFiles = [];

  for (const file of selected) {
    const tableName = inferUmamiTableName(file.name);
    if (!tableName) continue;
    const text = await file.text();
    tables[tableName] = parseCsvText(text);
    loadedFiles.push(file.name);
  }

  if (!loadedFiles.length) {
    showToast('No recognized Umami CSV files found', 'error');
    return;
  }

  state.umami = {
    loaded: true,
    files: loadedFiles,
    tables,
    summary: buildUmamiSummary(tables),
  };
  renderUmamiSummary();
  renderDecisionCockpit();
  showToast('Umami CSVs loaded locally');
}

function renderSummaryRows(containerId, rows, emptyLabel) {
  const container = $(containerId);
  if (!container) return;
  if (!rows || rows.length === 0) {
    container.innerHTML = emptyState('info', emptyLabel);
    return;
  }
  container.innerHTML = `
    <div class="summary-list">
      ${rows.map((row) => `
        <div class="summary-list__row">
          <span class="summary-list__label">${escapeHtml(row.name)}</span>
          <span class="summary-list__value">${escapeHtml(formatNumber(row.visitors || row.count || 0))}</span>
        </div>
      `).join('')}
    </div>
  `;
}

function renderUmamiSummary() {
  const summary = state.umami.summary;
  const status = $('umamiImportStatus');
  if (status) {
    status.textContent = summary
      ? `${summary.file_count} files loaded locally. URLs are cleaned before display.`
      : 'No Umami files loaded';
  }
  if (!summary) {
    $('umamiAudienceSummary').innerHTML = emptyState('upload_file', 'Import Umami CSVs to see web audience context');
    $('umamiChannelSummary').innerHTML = emptyState('route', 'Import channel, referrer, path, browser, and city CSVs');
    return;
  }

  $('umamiAudienceSummary').innerHTML = `
    <div class="summary-list">
      <div class="summary-list__row">
        <span class="summary-list__label">Known web visitors</span>
        <span class="summary-list__value">${escapeHtml(formatNumber(summary.visitors))}</span>
      </div>
      <div class="summary-list__row">
        <span class="summary-list__label">Page views from imported path tables</span>
        <span class="summary-list__value">${escapeHtml(formatNumber(summary.pageviews))}</span>
      </div>
      ${(summary.top_countries || []).slice(0, 3).map((row) => `
        <div class="summary-list__row">
          <span class="summary-list__label">${escapeHtml(row.name)}</span>
          <span class="summary-list__value">${escapeHtml(formatNumber(row.visitors))}</span>
        </div>
      `).join('')}
    </div>
  `;

  $('umamiChannelSummary').innerHTML = `
    <div class="summary-list">
      ${(summary.top_channels || []).slice(0, 4).map((row) => `
        <div class="summary-list__row">
          <span class="summary-list__label">${escapeHtml(row.name)}</span>
          <span class="summary-list__value">${escapeHtml(formatNumber(row.visitors))}</span>
        </div>
      `).join('')}
      ${(summary.top_referrers || []).slice(0, 3).map((row) => `
        <div class="summary-list__row">
          <span class="summary-list__label">${escapeHtml(row.name)}</span>
          <span class="summary-list__value">${escapeHtml(formatNumber(row.visitors))}</span>
        </div>
      `).join('')}
    </div>
  `;
}

function getHostedSourceCount(sourceName) {
  const rows = state.stats?.hosted_search?.top_sources || [];
  const source = normalizeSearchContextValue(sourceName);
  return rows.reduce((total, row) => (
    normalizeSearchContextValue(row.source) === source ? total + Number(row.count || 0) : total
  ), 0);
}

function countFeedbackRequests() {
  const evidenceRows = state.intelligenceEvidence || [];
  return evidenceRows.filter((entry) => (
    normalizeSearchContextValue(entry.ui_surface) === 'grid_empty_feedback'
    || String(entry.evidence_text || '').toLowerCase().includes('feedback')
  )).length;
}

function getTopAttentionQuery(kind) {
  const search = state.searchIntelligence || {};
  const key = kind === 'zero'
    ? 'top_zero_result_queries'
    : kind === 'low'
      ? 'top_low_result_queries'
      : 'top_replacement_queries';
  return Array.isArray(search[key]) && search[key].length ? search[key][0] : null;
}

function buildDecisionActions() {
  const actions = [];
  const searchSummary = state.searchIntelligence?.summary || {};
  const stats = state.stats || {};
  const hostedSearch = stats.hosted_search || {};
  const zeroCount = Number(searchSummary.zero_result_queries || 0);
  const lowCount = Number(searchSummary.low_result_queries || 0);
  const mcpCount = Number(searchSummary.mcp_query_batches || 0) || getHostedSourceCount('mcp');
  const feedbackCount = countFeedbackRequests();
  const p95 = Number(hostedSearch.p95_latency_ms || 0);
  const topZero = getTopAttentionQuery('zero');
  const topLow = getTopAttentionQuery('low');
  const topReplace = getTopAttentionQuery('replace');

  if (zeroCount > 0) {
    actions.push({
      hot: true,
      icon: 'add_box',
      label: 'Add or alias',
      title: `${formatNumber(zeroCount)} zero-result queries need triage`,
      body: topZero?.query
        ? `Start with "${topZero.query}". Check whether it needs a new icon, alias, or localized wording.`
        : 'Open Query Explorer and review zero-result searches before they age out.',
      meta: ['Search Demand', queryEnvironmentLabel(state.queryQueueFilters.environment)],
    });
  }

  if (lowCount > 0) {
    actions.push({
      hot: actions.length === 0,
      icon: 'tune',
      label: 'Improve ranking',
      title: `${formatNumber(lowCount)} low-result queries may need better matching`,
      body: topLow?.query
        ? `"${topLow.query}" returned weak choices. Add aliases or adjust ranking before making new icons.`
        : 'Use low-result rows to improve aliases and ranking quality.',
      meta: ['Search Quality', queryChannelLabel(state.queryQueueFilters.channel)],
    });
  }

  if (mcpCount > 0) {
    actions.push({
      hot: actions.length === 0,
      icon: 'psychology',
      label: 'Agent demand',
      title: `${formatNumber(mcpCount)} MCP searches show agent usage`,
      body: 'Review MCP query wording and make sure library labels say Supericons, not only si.',
      meta: ['Hosted MCP', 'Agent workflows'],
    });
  }

  if (feedbackCount > 0) {
    actions.push({
      hot: actions.length === 0,
      icon: 'forum',
      label: 'User request',
      title: `${formatNumber(feedbackCount)} no-result feedback items are visible`,
      body: 'Read the latest activity feed for direct icon requests and convert repeated ones into backlog items.',
      meta: ['Feedback', 'No-results form'],
    });
  }

  if (topReplace) {
    actions.push({
      hot: actions.length === 0,
      icon: 'swap_horiz',
      label: 'Result fit',
      title: 'Some icons are being replaced',
      body: `"${topReplace.query}" has replacement signals. Check whether the first result is visually wrong.`,
      meta: ['Ranking', 'Selection pressure'],
    });
  }

  if (p95 > 3000) {
    actions.push({
      hot: actions.length === 0,
      icon: 'speed',
      label: 'Performance',
      title: `Hosted search P95 is ${formatNumber(p95)}ms`,
      body: 'Check hosted search latency before adding more search complexity.',
      meta: ['Reliability', 'Last 24 hours'],
    });
  }

  if (actions.length === 0) {
    actions.push({
      hot: true,
      icon: 'check_circle',
      label: 'Stable',
      title: 'No urgent search gaps in the loaded window',
      body: 'Keep watching zero-result queries, feedback, and MCP demand as usage grows.',
      meta: ['Watchlist', getCurrentIntelligenceWindow().longLabel],
    });
  }

  return actions.slice(0, 5);
}

function renderDecisionCockpit() {
  const actions = buildDecisionActions();
  const stats = state.stats || {};
  const searchSummary = state.searchIntelligence?.summary || {};
  const hostedSearch = stats.hosted_search || {};
  const umami = state.umami.summary || {};
  const metrics = [
    { label: 'Total users', value: stats.total_users || 0, meta: `${formatNumber(stats.new_users_30d || 0)} new in 30d` },
    { label: 'Active pro', value: stats.active_pro || 0, meta: 'Paid users' },
    { label: 'Web visitors', value: umami.visitors || 0, meta: state.umami.loaded ? 'Imported from Umami' : 'Import CSVs' },
    { label: 'MCP searches', value: searchSummary.mcp_query_batches || getHostedSourceCount('mcp') || 0, meta: getCurrentIntelligenceWindow().shortLabel },
    { label: 'Zero results', value: searchSummary.zero_result_queries || 0, meta: 'Queries to triage' },
    { label: 'Feedback', value: countFeedbackRequests(), meta: 'Visible requests' },
  ];

  $('decisionCockpitStamp').textContent = `${getCurrentIntelligenceWindow().longLabel} - ${queryEnvironmentLabel(state.queryQueueFilters.environment)} - ${queryChannelLabel(state.queryQueueFilters.channel)}`;
  $('decisionActions').innerHTML = actions.map((action) => `
    <div class="decision-action ${action.hot ? 'decision-action--hot' : ''}">
      <div class="decision-action__label">
        <span class="material-symbols-outlined">${escapeHtml(action.icon)}</span>
        ${escapeHtml(action.label)}
      </div>
      <div class="decision-action__title">${escapeHtml(action.title)}</div>
      <div class="decision-action__body">${escapeHtml(action.body)}</div>
      <div class="decision-action__meta">
        ${(action.meta || []).map((item) => `<span>${escapeHtml(item)}</span>`).join('<span>&middot;</span>')}
      </div>
    </div>
  `).join('');
  $('decisionMetricStrip').innerHTML = metrics.map((metric) => `
    <div class="decision-metric">
      <div class="decision-metric__label">${escapeHtml(metric.label)}</div>
      <div class="decision-metric__value">${escapeHtml(formatNumber(metric.value))}</div>
      <div class="decision-metric__meta">${escapeHtml(metric.meta)}</div>
    </div>
  `).join('');
}

function renderStats() {
  const stats = state.stats;
  if (!stats) return;
  const hostedSearch = stats.hosted_search || {};
  $('statsTotalUsersValue').textContent = stats.total_users;
  $('statsActiveProValue').textContent = stats.active_pro;
  $('statsTotalPurchasesValue').textContent = stats.total_purchases;
  $('statsNewUsersValue').textContent = stats.new_users_30d;
  $('statsHostedSearchValue').textContent = hostedSearch.total_requests_24h || 0;
  $('statsHostedSearchP95Value').textContent = `${hostedSearch.p95_latency_ms || 0}ms`;
  $('statsHostedSearchTrapValue').textContent = hostedSearch.trap_hits_30d || 0;
  $('navUsersCount').textContent = stats.total_users;
  $('statsTotalUsersDelta').textContent = `${formatNumber(stats.new_users_30d || 0)} new users in the last 30 days`;
  $('statsActiveProDelta').textContent = `${formatNumber(stats.active_pro || 0)} active paid subscriptions`;

  const hostedSourceSummary = Array.isArray(hostedSearch.top_sources) && hostedSearch.top_sources.length > 0
    ? hostedSearch.top_sources.map((entry) => `${entry.source}: ${entry.count}`).join(' - ')
    : 'No recent hosted search traffic';
  $('statsHostedSearchDelta').textContent = hostedSearch.available === false
    ? 'search_request_audit is not available in this environment'
    : hostedSourceSummary;

  $('statsRecentSignups').innerHTML = stats.recent_signups.length
    ? stats.recent_signups.map((user) => `
        <div class="stats-row">
          <span>${escapeHtml(user.email || user.id)}</span>
          <span class="stats-row__val">${escapeHtml(formatRelativeDate(user.created_at))}</span>
        </div>
      `).join('')
    : emptyState('person_off', 'No recent signups');

  $('statsRecentActions').innerHTML = stats.recent_audit.length
    ? stats.recent_audit.map((entry) => `
        <div class="stats-row">
          <span class="action-chip ${actionChipClass(entry.action)}">${escapeHtml(entry.action)}</span>
          <span class="stats-row__val">${escapeHtml(formatRelativeDate(entry.created_at))}</span>
        </div>
      `).join('')
    : emptyState('history', 'No audit actions yet');

  renderDecisionCockpit();
  renderUmamiSummary();
}

async function loadStats() {
  const payload = await apiRequest('/stats');
  state.stats = payload.stats;
  renderStats();
}

function formatPercent(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '-';
  return `${Math.round(value * 100)}%`;
}

function getCurrentIntelligenceWindow() {
  return INTELLIGENCE_WINDOWS.find((window) => window.key === state.intelligenceWindow)
    || INTELLIGENCE_WINDOWS.find((window) => window.key === '30d')
    || INTELLIGENCE_WINDOWS[0];
}

function formatMetricWindowLabel(baseLabel) {
  return `${baseLabel} (${getCurrentIntelligenceWindow().shortLabel})`;
}

function formatPurposeLabel(value) {
  const normalized = String(value || '').trim();
  if (!normalized) return '-';
  if (normalized === '-') return '-';
  if (PURPOSE_LABELS[normalized]) return PURPOSE_LABELS[normalized];
  return normalized
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatSearchContextLabel(query, libraryFilter, jobCategory) {
  const parts = [String(query || '').trim()];
  if (libraryFilter && libraryFilter !== 'all') parts.push(formatPurposeLabel(libraryFilter));
  if (jobCategory) parts.push(formatPurposeLabel(jobCategory));
  return parts.filter(Boolean).join(' - ');
}

function normalizeSearchContextValue(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function normalizeAnalyticsContextToken(value) {
  return normalizeSearchContextValue(value)
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');
}

function isUnclassifiedContextToken(value) {
  const source = normalizeAnalyticsContextToken(value);
  return !source
    || source === 'unknown'
    || source === 'legacy'
    || source === 'unclassified'
    || source === 'unclassified_hosted_search';
}

function normalizeReviewLibraryFilter(value) {
  return normalizeSearchContextValue(value) || 'all';
}

function normalizeReviewJobCategory(value) {
  return normalizeSearchContextValue(value) || '';
}

function buildQueryReviewContextKey(query, libraryFilter, jobCategory) {
  return [
    normalizeSearchContextValue(query),
    normalizeReviewLibraryFilter(libraryFilter),
    normalizeReviewJobCategory(jobCategory),
  ].join('|');
}

function formatLibraryFilterLabel(value) {
  const normalized = normalizeReviewLibraryFilter(value);
  return normalized === 'all' ? 'All libraries' : formatPurposeLabel(normalized);
}

function queryReviewStatusLabel(status) {
  const normalized = normalizeSearchContextValue(status);
  if (!normalized) return 'Untriaged';
  return QUERY_REVIEW_STATUS_LABELS[normalized] || normalized;
}

function queryReviewBadgeClass(status) {
  const normalized = normalizeSearchContextValue(status);
  if (normalized === 'resolved') return 'badge-review-resolved';
  if (normalized === 'needs_alias') return 'badge-review-needs-alias';
  if (normalized === 'needs_icon') return 'badge-review-needs-icon';
  if (normalized === 'ignore') return 'badge-review-ignore';
  return 'badge-review-untriaged';
}

function queryReviewBadge(status) {
  return `<span class="badge ${queryReviewBadgeClass(status)}">${escapeHtml(queryReviewStatusLabel(status))}</span>`;
}

function formatIssueTypeLabel(issueType) {
  return QUERY_ISSUE_LABELS[normalizeSearchContextValue(issueType)] || formatPurposeLabel(issueType);
}

function queryIssueBadge(issueType) {
  const normalized = normalizeSearchContextValue(issueType);
  const className = normalized === 'zero_result'
    ? 'badge-review-needs-icon'
    : normalized === 'low_result'
      ? 'badge-review-needs-alias'
      : normalized === 'replacement_heavy'
        ? 'badge-warning'
        : normalized === 'successful'
          ? 'badge-active'
          : 'badge-free';
  return `<span class="badge ${className}">${escapeHtml(formatIssueTypeLabel(normalized))}</span>`;
}

function normalizeQueryEnvironment(value) {
  const normalized = normalizeSearchContextValue(value) || 'live';
  return QUERY_ENVIRONMENT_VALUES.has(normalized) ? normalized : 'live';
}

function queryEnvironmentLabel(value) {
  return QUERY_ENVIRONMENT_LABELS[normalizeQueryEnvironment(value)] || QUERY_ENVIRONMENT_LABELS.live;
}

function queryEnvironmentBadge(value) {
  return `<span class="badge badge-free">${escapeHtml(queryEnvironmentLabel(value))}</span>`;
}

function normalizeQueryChannel(value) {
  const normalized = normalizeSearchContextValue(value) || 'all';
  return QUERY_CHANNEL_VALUES.has(normalized) ? normalized : 'all';
}

function queryChannelLabel(value) {
  return QUERY_CHANNEL_LABELS[normalizeQueryChannel(value)] || QUERY_CHANNEL_LABELS.unknown;
}

function queryChannelBadge(value) {
  return `<span class="badge badge-free">${escapeHtml(queryChannelLabel(value))}</span>`;
}

function syncQueryEnvironmentControls() {
  const value = normalizeQueryEnvironment(state.queryQueueFilters.environment);
  ['intelligenceEnvironmentFilter', 'queryExplorerEnvironmentFilter'].forEach((id) => {
    const select = $(id);
    if (select) select.value = value;
  });
}

function syncQueryChannelControls() {
  const value = normalizeQueryChannel(state.queryQueueFilters.channel);
  ['intelligenceChannelFilter', 'queryExplorerChannelFilter'].forEach((id) => {
    const select = $(id);
    if (select) select.value = value;
  });
}

function refreshEnvironmentScopedIntelligence() {
  state.queryQueuePagination.page = 1;
  state.intelligenceEvidencePagination.page = 1;
  state.selectedQueryDetail = null;
  syncQueryEnvironmentControls();
  syncQueryChannelControls();
  renderQueryDetailDrawer();
  return Promise.all([
    loadIntelligenceOverview(),
    loadSearchIntelligence(),
    loadQueryQueue(),
    loadIntelligenceEvidence(),
  ]);
}

function classifyClientHost(value) {
  let text = String(value || '').trim().toLowerCase();
  if (!text) return '';
  text = text.replace(/^\[|\]$/g, '');
  if (text === '::1') return 'local';
  if (text.includes('/') || text.includes(':')) {
    try {
      text = new URL(text.includes('://') ? text : `https://${text}`).hostname.toLowerCase();
    } catch {
      text = text.split('/')[0].split(':')[0] || text;
    }
  }
  if (text === 'localhost' || text === '127.0.0.1') return 'local';
  if (text === 'supericons.dev' || text === 'www.supericons.dev') return 'production';
  if (text.endsWith('.netlify.app')) return 'preview';
  return '';
}

function classifyClientContextUrl(value) {
  const text = String(value || '').trim();
  if (!text || text.startsWith('/')) return '';
  try {
    return classifyClientHost(new URL(text.includes('://') ? text : `https://${text}`).hostname);
  } catch {
    return '';
  }
}

function classifyClientAnalyticsSource(value) {
  const source = normalizeAnalyticsContextToken(value);
  if (isUnclassifiedContextToken(source)) return '';
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
  return '';
}

function classifyClientAnalyticsChannel(value) {
  const source = normalizeAnalyticsContextToken(value);
  if (isUnclassifiedContextToken(source)) return '';
  if (source.includes('local_mcp') || source === 'npm' || source === 'npx') return 'local_mcp';
  if (source === 'mcp' || source === 'hosted_mcp' || source === 'mcp_search' || source.includes('mcp')) return 'hosted_mcp';
  if (source === 'cli' || source.includes('cli')) return 'cli';
  if (source === 'api' || source.includes('api')) return 'api';
  if (source === 'verify' || source === 'internal_test' || source === 'test' || source.includes('test') || source.includes('verify') || source.includes('trap')) return 'internal_test';
  if (
    source === 'web'
    || source === 'site'
    || source === 'local_web'
    || source === 'preview_web'
    || source === 'test_web'
    || source === 'grid'
    || source === 'grid_empty_feedback'
    || source === 'customize'
    || source === 'store'
    || source === 'hosted_search'
    || source === 'search_icons'
    || source === 'search_engine'
  ) {
    return 'web';
  }
  return '';
}

function entryHasHostedAuditSource(entry) {
  const values = [
    entry?.source_table,
    entry?.ui_surface,
    entry?.evidence_text,
    ...(Array.isArray(entry?.audit_sources) ? entry.audit_sources : []),
    ...(Array.isArray(entry?.surfaces) ? entry.surfaces : []),
  ].map(normalizeAnalyticsContextToken).filter(Boolean);
  return values.includes('search_request_audit')
    || values.includes('unclassified_hosted_search');
}

function classifyClientEvidenceEnvironment(entry) {
  const explicit = normalizeSearchContextValue(entry?.environment);
  if (explicit === 'production' || explicit === 'preview' || explicit === 'local' || explicit === 'test') {
    return explicit;
  }
  if (explicit === 'legacy' && !entryHasHostedAuditSource(entry)) return 'legacy';

  const sourceEnvironment = classifyClientAnalyticsSource(entry?.analytics_source || entry?.source)
    || classifyClientAnalyticsSource(entry?.ui_surface);
  if (sourceEnvironment) return sourceEnvironment;

  if (entryHasHostedAuditSource(entry)) return 'production';

  return classifyClientHost(entry?.domain) || classifyClientContextUrl(entry?.context_url) || 'legacy';
}

function classifyClientEvidenceChannel(entry) {
  const explicitFields = [
    entry?.channel,
    entry?.analytics_channel,
    entry?.analytics_source,
    entry?.source,
    entry?.ui_surface,
  ];
  for (const field of explicitFields) {
    const channel = classifyClientAnalyticsChannel(field);
    if (channel) return channel;
  }

  const signalType = normalizeSearchContextValue(entry?.signal_type);
  if (signalType === 'mcp_call') return 'hosted_mcp';
  if (entryHasHostedAuditSource(entry)) return 'unknown';
  if (signalType === 'search_attempt' || signalType === 'hosted_search_audit' || signalType === 'copy' || signalType === 'favorite' || signalType === 'replace') return 'web';
  if (classifyClientEvidenceEnvironment(entry) === 'local') return 'web';
  return 'unknown';
}

function collectClientRowEnvironments(row) {
  const environments = new Set();
  const rawEnvironments = Array.isArray(row?.environments) ? row.environments : [];
  rawEnvironments.forEach((value) => {
    const normalized = normalizeSearchContextValue(value);
    if (normalized === 'production' || normalized === 'preview' || normalized === 'local' || normalized === 'test') {
      environments.add(normalized);
    } else if (normalized === 'legacy' && !entryHasHostedAuditSource(row)) {
      environments.add('legacy');
    }
  });

  [
    row?.environment,
    row?.analytics_source,
    row?.source,
    row?.ui_surface,
    ...(Array.isArray(row?.surfaces) ? row.surfaces : []),
  ].forEach((value) => {
    const environment = classifyClientAnalyticsSource(value);
    if (environment) environments.add(environment);
  });

  const hostEnvironment = classifyClientHost(row?.domain) || classifyClientContextUrl(row?.context_url);
  if (hostEnvironment) environments.add(hostEnvironment);
  if (entryHasHostedAuditSource(row)) environments.add('production');
  if (!environments.size) environments.add(classifyClientEvidenceEnvironment(row));
  if (environments.size > 1 && environments.has('legacy')) environments.delete('legacy');
  return [...environments].filter(Boolean);
}

function collectClientRowChannels(row) {
  const channels = new Set();
  const rawChannels = Array.isArray(row?.channels) ? row.channels : [];
  rawChannels.forEach((value) => {
    const normalized = normalizeQueryChannel(value);
    if (normalized !== 'all') channels.add(normalized);
  });

  [
    row?.channel,
    row?.analytics_channel,
    row?.analytics_source,
    row?.source,
    row?.ui_surface,
    row?.source_table,
    ...(Array.isArray(row?.surfaces) ? row.surfaces : []),
    ...(Array.isArray(row?.audit_sources) ? row.audit_sources : []),
  ].forEach((value) => {
    const channel = classifyClientAnalyticsChannel(value);
    if (channel) channels.add(channel);
  });

  const issueTypes = Array.isArray(row?.issue_types) ? row.issue_types.map(normalizeSearchContextValue) : [];
  if (issueTypes.includes('mcp') || Number(row?.mcp_batch_count || 0) > 0 || Number(row?.mcp_result_rows || 0) > 0) {
    channels.add('hosted_mcp');
  }

  if (!channels.size) channels.add(classifyClientEvidenceChannel(row));
  const nonUnclassified = [...channels].filter((value) => value && value !== 'unknown' && value !== 'all');
  return nonUnclassified.length ? nonUnclassified : [...channels].filter(Boolean);
}

function rowMatchesQueryEnvironment(row, filterValue = state.queryQueueFilters.environment) {
  const filter = normalizeQueryEnvironment(filterValue);
  if (filter === 'all') return true;
  const environments = collectClientRowEnvironments(row);
  if (filter === 'live') return environments.includes('production');
  return environments.includes(filter);
}

function rowMatchesQueryChannel(row, filterValue = state.queryQueueFilters.channel) {
  const filter = normalizeQueryChannel(filterValue);
  if (filter === 'all') return true;
  const channels = collectClientRowChannels(row);
  return channels.includes(filter);
}

function formatQueryContextText(row) {
  const parts = [
    row.library_filter ? formatLibraryFilterLabel(row.library_filter) : 'All libraries',
    row.job_category ? formatPurposeLabel(row.job_category) : 'No purpose filter',
  ];
  return parts.join(' - ');
}

function compactIdentifier(value, prefix = '') {
  const text = String(value || '').trim();
  if (!text) return '';
  const compact = text.length > 12 ? `${text.slice(0, 6)}...${text.slice(-4)}` : text;
  return prefix ? `${prefix}${compact}` : compact;
}

function formatQueryDomains(row) {
  const domains = Array.isArray(row.domains) ? row.domains.filter(Boolean) : [];
  if (domains.length) return domains.slice(0, 2).join(', ');
  const urls = Array.isArray(row.context_urls) ? row.context_urls.filter(Boolean) : [];
  if (!urls.length) return 'No source recorded';
  return urls.slice(0, 1).map((value) => {
    try {
      return new URL(value).hostname;
    } catch {
      return sanitizeAnalyticsPath(value);
    }
  }).join(', ');
}

function formatQueryAudienceText(row) {
  const sessionCount = Number(row.session_count || 0);
  const registeredCount = Number(row.registered_user_count || 0);
  const proCount = Number(row.pro_user_count || 0);
  const countryCount = Array.isArray(row.countries) ? row.countries.length : 0;
  const ipHashCount = Number(row.ip_hash_count || 0);
  const clientFamilies = Array.isArray(row.client_families)
    ? row.client_families.filter((value) => value && value !== 'unknown')
    : [];
  const parts = [];
  if (proCount > 0) parts.push(`${proCount} pro`);
  if (registeredCount > 0) parts.push(`${registeredCount} registered`);
  if (ipHashCount > 0) parts.push(`${ipHashCount} IP group${ipHashCount === 1 ? '' : 's'}`);
  else if (sessionCount > 0) parts.push(`${sessionCount} visitor${sessionCount === 1 ? '' : 's'}`);
  if (countryCount > 0) parts.push(`${countryCount} countr${countryCount === 1 ? 'y' : 'ies'}`);
  else if (ipHashCount > 0) parts.push('country not captured');
  if (clientFamilies.length > 0) parts.push(clientFamilies.slice(0, 2).join(', '));
  return parts.length ? parts.join(' - ') : 'Visitor details not captured';
}

function formatPlanText(plan) {
  if (!plan) return '';
  if (plan === 'pro_annual') return 'Pro Annual';
  if (plan === 'pro_monthly') return 'Pro Monthly';
  return String(plan);
}

function formatQueryAccountText(row) {
  const registeredCount = Number(row.registered_user_count || 0);
  const proCount = Number(row.pro_user_count || 0);
  const sessionCount = Number(row.session_count || 0);
  const ipHashCount = Number(row.ip_hash_count || 0);
  const apiKeyHashCount = Number(row.api_key_hash_count || 0);
  const plans = Array.isArray(row.account_plans) ? row.account_plans.map(formatPlanText).filter(Boolean) : [];
  const statuses = Array.isArray(row.subscription_statuses) ? row.subscription_statuses.filter(Boolean) : [];
  const clientFamilies = Array.isArray(row.client_families)
    ? row.client_families.filter((value) => value && value !== 'unknown')
    : [];
  const details = [...new Set([...plans, ...statuses])].slice(0, 2).join(' - ');

  if (proCount > 0) {
    return details ? `Pro user activity - ${details}` : 'Pro user activity';
  }
  if (registeredCount > 0) {
    return details ? `Registered user activity - ${details}` : 'Registered user activity';
  }
  if (apiKeyHashCount > 0) return 'API key used - account not resolved';
  if (clientFamilies.length > 0) return `Anonymous MCP usage - ${clientFamilies.slice(0, 2).join(', ')}`;
  if (sessionCount > 0 || ipHashCount > 0) return 'Anonymous usage';
  return 'Audience not captured';
}

function formatEvidenceVisitor(entry) {
  const accountBits = [];
  if (entry.user_email) accountBits.push(entry.user_email);
  else if (entry.user_id) accountBits.push(compactIdentifier(entry.user_id, 'User '));
  else if (entry.api_key_hash_prefix) accountBits.push(compactIdentifier(entry.api_key_hash_prefix, 'API key '));
  else accountBits.push('Visitor');

  const plan = entry.account_plan || entry.plan;
  if (plan) accountBits.push(plan === 'pro_annual' ? 'Pro Annual' : plan === 'pro_monthly' ? 'Pro Monthly' : plan);
  else if (entry.subscription_status) accountBits.push(entry.subscription_status);
  else accountBits.push('Plan not captured');

  const contextBits = [];
  if (entry.country || entry.country_code) contextBits.push(entry.country || entry.country_code);
  if (entry.ip_address) contextBits.push(compactIdentifier(entry.ip_address));
  if (entry.ip_hash_prefix) contextBits.push(`IP ${compactIdentifier(entry.ip_hash_prefix)}`);
  if (entry.session_hash) contextBits.push(compactIdentifier(entry.session_hash, 'Session '));
  return {
    account: accountBits.filter(Boolean).join(' - '),
    context: contextBits.filter(Boolean).join(' - ') || 'Location not captured',
  };
}

function setQueryReviewSelection(entry) {
  if (!entry) return;
  state.selectedQueryReview = {
    query: entry.query,
    library_filter: normalizeReviewLibraryFilter(entry.library_filter),
    job_category: normalizeReviewJobCategory(entry.job_category),
    status: normalizeSearchContextValue(entry.review_status),
    note: entry.review_note || '',
  };
  renderQueryReviewPanel();
}

function summarizeQueryReviewQueue(rows) {
  return rows.reduce((acc, row) => {
    const status = normalizeSearchContextValue(row.review_status);
    if (status === 'resolved') acc.resolved += 1;
    else if (status === 'needs_alias') acc.needs_alias += 1;
    else if (status === 'needs_icon') acc.needs_icon += 1;
    else if (status === 'ignore') acc.ignore += 1;
    else acc.untriaged += 1;
    return acc;
  }, {
    untriaged: 0,
    needs_alias: 0,
    needs_icon: 0,
    resolved: 0,
    ignore: 0,
  });
}

function shouldShowReviewableQuery(row) {
  if (state.showReviewedQueries) return true;
  const status = normalizeSearchContextValue(row.review_status);
  return !status || ACTIVE_QUERY_REVIEW_STATUSES.has(status);
}

function renderQueryReviewSummary(summary) {
  const container = $('queryReviewSummary');
  if (!container) return;
  container.innerHTML = `
    <span class="query-review-summary__item">${queryReviewBadge('')}<span>${escapeHtml(String(summary.untriaged || 0))}</span></span>
    <span class="query-review-summary__item">${queryReviewBadge('needs_alias')}<span>${escapeHtml(String(summary.needs_alias || 0))}</span></span>
    <span class="query-review-summary__item">${queryReviewBadge('needs_icon')}<span>${escapeHtml(String(summary.needs_icon || 0))}</span></span>
    <span class="query-review-summary__item">${queryReviewBadge('resolved')}<span>${escapeHtml(String(summary.resolved || 0))}</span></span>
    <span class="query-review-summary__item">${queryReviewBadge('ignore')}<span>${escapeHtml(String(summary.ignore || 0))}</span></span>
  `;
}

function getReviewableQueryEntries() {
  return [
    ...(state.searchIntelligence?.top_zero_result_queries || []),
    ...(state.searchIntelligence?.top_low_result_queries || []),
    ...(state.searchIntelligence?.top_replacement_queries || []),
  ];
}

function findQueryReviewEntry(query, libraryFilter, jobCategory) {
  const targetKey = buildQueryReviewContextKey(query, libraryFilter, jobCategory);
  return getReviewableQueryEntries().find((entry) => (
    buildQueryReviewContextKey(entry.query, entry.library_filter, entry.job_category) === targetKey
  )) || null;
}

function openQueryReview(query, libraryFilter = 'all', jobCategory = '') {
  const entry = findQueryReviewEntry(query, libraryFilter, jobCategory);
  if (!entry) return;
  setQueryReviewSelection(entry);
}

function clearQueryReviewSelection() {
  state.selectedQueryReview = null;
  state.queryReviewSaving = false;
  renderQueryReviewPanel();
}

function applySavedQueryReviewToState(review) {
  if (!review || !state.searchIntelligence) return;

  const normalizedReview = {
    query: normalizeSearchContextValue(review.normalized_query),
    library_filter: normalizeReviewLibraryFilter(review.library_filter),
    job_category: normalizeReviewJobCategory(review.job_category),
    review_status: normalizeSearchContextValue(review.status),
    review_note: review.note || '',
    review_updated_at: review.updated_at || null,
  };

  ['top_zero_result_queries', 'top_low_result_queries', 'top_replacement_queries'].forEach((key) => {
    const rows = state.searchIntelligence?.[key];
    if (!Array.isArray(rows)) return;
    rows.forEach((entry) => {
      if (buildQueryReviewContextKey(entry.query, entry.library_filter, entry.job_category)
        !== buildQueryReviewContextKey(
          normalizedReview.query,
          normalizedReview.library_filter,
          normalizedReview.job_category,
        )) {
        return;
      }

      entry.review_status = normalizedReview.review_status;
      entry.review_note = normalizedReview.review_note;
      entry.review_updated_at = normalizedReview.review_updated_at;
    });
  });

  if (Array.isArray(state.queryQueue)) {
    state.queryQueue.forEach((entry) => {
      if (buildQueryReviewContextKey(entry.query, entry.library_filter, entry.job_category)
        !== buildQueryReviewContextKey(
          normalizedReview.query,
          normalizedReview.library_filter,
          normalizedReview.job_category,
        )) {
        return;
      }
      entry.review_status = normalizedReview.review_status;
      entry.review_note = normalizedReview.review_note;
      entry.review_updated_at = normalizedReview.review_updated_at;
    });
  }

  const detailSummary = state.selectedQueryDetail?.summary;
  if (detailSummary && buildQueryReviewContextKey(detailSummary.query, detailSummary.library_filter, detailSummary.job_category)
    === buildQueryReviewContextKey(
      normalizedReview.query,
      normalizedReview.library_filter,
      normalizedReview.job_category,
    )) {
    detailSummary.review_status = normalizedReview.review_status;
    detailSummary.review_note = normalizedReview.review_note;
    detailSummary.review_updated_at = normalizedReview.review_updated_at;
    state.selectedQueryDetail.review = {
      normalized_query: normalizedReview.query,
      library_filter: normalizedReview.library_filter,
      job_category: normalizedReview.job_category,
      status: normalizedReview.review_status,
      note: normalizedReview.review_note,
      updated_at: normalizedReview.review_updated_at,
    };
  }
}

function formatAverageResultCount(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '-';
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function formatEvidenceNote(entry) {
  const signalType = String(entry?.signal_type || '').toLowerCase();
  if (signalType === 'search_attempt') {
    const parts = [];
    if (entry.evidence_text) parts.push(entry.evidence_text);
    if (typeof entry.result_count === 'number') {
      parts.push(`${entry.result_count} results`);
    }
    if (entry.library_filter) {
      parts.push(entry.library_filter === 'all' ? 'all libraries' : entry.library_filter);
    }
    return parts.join(' - ') || '-';
  }
  if (signalType === 'hosted_search_audit') {
    const parts = ['hosted search'];
    if (entry.audit_status) parts.push(entry.audit_status);
    if (typeof entry.result_count === 'number') parts.push(`${entry.result_count} results`);
    if (entry.latency_ms !== null && entry.latency_ms !== undefined) parts.push(`${entry.latency_ms} ms`);
    return parts.join(' - ');
  }
  return entry?.evidence_text || '-';
}

function buildQueryQueueParams({ includePage = true, exportFormat = '' } = {}) {
  const params = new URLSearchParams();
  params.set('window', state.intelligenceWindow);
  params.set('environment', normalizeQueryEnvironment(state.queryQueueFilters.environment));
  if (includePage) {
    params.set('page', String(state.queryQueuePagination.page || 1));
    params.set('page_size', String(state.queryQueuePagination.page_size || 25));
  }
  if (exportFormat) {
    params.set('format', exportFormat);
    params.set('limit', '2000');
  }
  if (state.queryQueueFilters.q) params.set('q', state.queryQueueFilters.q);
  if (state.queryQueueFilters.issue_type) params.set('issue_type', state.queryQueueFilters.issue_type);
  if (state.queryQueueFilters.status) params.set('status', state.queryQueueFilters.status);
  if (state.queryQueueFilters.channel && state.queryQueueFilters.channel !== 'all') {
    params.set('channel', normalizeQueryChannel(state.queryQueueFilters.channel));
  }
  if (state.queryQueueFilters.library_filter) params.set('library_filter', state.queryQueueFilters.library_filter);
  if (state.queryQueueFilters.job_category) params.set('job_category', state.queryQueueFilters.job_category);
  params.set('sort', state.queryQueueSort.field || 'zero_attempt_count');
  params.set('direction', state.queryQueueSort.direction || 'desc');
  return params;
}

function parseQueryMetricNumber(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function createFallbackQueryRow(query, libraryFilter = 'all', jobCategory = '') {
  return {
    query: normalizeSearchContextValue(query),
    library_filter: normalizeReviewLibraryFilter(libraryFilter),
    job_category: normalizeReviewJobCategory(jobCategory),
    issue_types: [],
    attempt_count: 0,
    zero_attempt_count: 0,
    low_attempt_count: 0,
    total_result_count: 0,
    result_samples: 0,
    average_result_count: null,
    minimum_result_count: null,
    replacement_count: 0,
    unique_replacements: 0,
    successful_attempt_count: 0,
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
    channels: [],
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
    client_families: [],
    tools: [],
    mcp_versions: [],
    first_seen: null,
    last_seen: null,
    review_status: null,
    review_note: null,
    review_updated_at: null,
    __surfaces: new Set(),
    __unique_replacements: new Set(),
    __unique_icons: new Set(),
    __mcp_batch_ids: new Set(),
    __mcp_converged_batch_ids: new Set(),
    __domains: new Set(),
    __context_urls: new Set(),
    __channels: new Set(),
    __session_hashes: new Set(),
    __ip_hash_prefixes: new Set(),
    __api_key_hash_prefixes: new Set(),
    __countries: new Set(),
    __registered_user_ids: new Set(),
    __pro_user_ids: new Set(),
    __account_plans: new Set(),
    __subscription_statuses: new Set(),
    __audit_sources: new Set(),
    __environments: new Set(),
    __client_families: new Set(),
    __tools: new Set(),
    __mcp_versions: new Set(),
  };
}

function getFallbackQueryRow(map, query, libraryFilter = 'all', jobCategory = '') {
  const normalizedQuery = normalizeSearchContextValue(query);
  if (!normalizedQuery) return null;
  const key = buildQueryReviewContextKey(normalizedQuery, libraryFilter, jobCategory);
  if (!map.has(key)) {
    map.set(key, createFallbackQueryRow(normalizedQuery, libraryFilter, jobCategory));
  }
  return map.get(key);
}

function addFallbackIssue(row, issueType) {
  const normalized = normalizeSearchContextValue(issueType);
  if (normalized && !row.issue_types.includes(normalized)) {
    row.issue_types.push(normalized);
  }
}

function updateFallbackSeenRange(row, createdAt) {
  if (!createdAt) return;
  const value = String(createdAt);
  if (!row.first_seen || value < row.first_seen) row.first_seen = value;
  if (!row.last_seen || value > row.last_seen) row.last_seen = value;
}

function mergeFallbackReview(row, source) {
  const status = normalizeSearchContextValue(source?.review_status || source?.status);
  if (status) row.review_status = status;
  if (source?.review_note || source?.note) row.review_note = source.review_note || source.note || '';
  if (source?.review_updated_at || source?.updated_at) {
    row.review_updated_at = source.review_updated_at || source.updated_at || null;
  }
  if (source?.first_seen) updateFallbackSeenRange(row, source.first_seen);
  if (source?.last_seen) updateFallbackSeenRange(row, source.last_seen);
}

function mergeTopQueryFallbackRows(map) {
  const search = state.searchIntelligence || {};

  (search.top_zero_result_queries || []).forEach((entry) => {
    const row = getFallbackQueryRow(map, entry.query, entry.library_filter, entry.job_category);
    if (!row) return;
    addFallbackIssue(row, 'zero_result');
    row.zero_attempt_count = Math.max(row.zero_attempt_count, Number(entry.zero_attempt_count || 0));
    row.attempt_count = Math.max(row.attempt_count, Number(entry.attempt_count || row.zero_attempt_count || 0));
    row.minimum_result_count = row.minimum_result_count === null ? 0 : Math.min(row.minimum_result_count, 0);
    row.average_result_count = row.average_result_count ?? 0;
    mergeFallbackReview(row, entry);
  });

  (search.top_low_result_queries || []).forEach((entry) => {
    const row = getFallbackQueryRow(map, entry.query, entry.library_filter, entry.job_category);
    if (!row) return;
    addFallbackIssue(row, 'low_result');
    row.low_attempt_count = Math.max(row.low_attempt_count, Number(entry.low_attempt_count || 0));
    row.attempt_count = Math.max(row.attempt_count, Number(entry.attempt_count || row.low_attempt_count || 0));
    const averageResultCount = parseQueryMetricNumber(entry.average_result_count);
    const minimumResultCount = parseQueryMetricNumber(entry.minimum_result_count);
    if (averageResultCount !== null) row.average_result_count = averageResultCount;
    if (minimumResultCount !== null) {
      row.minimum_result_count = row.minimum_result_count === null
        ? minimumResultCount
        : Math.min(row.minimum_result_count, minimumResultCount);
    }
    mergeFallbackReview(row, entry);
  });

  (search.top_replacement_queries || []).forEach((entry) => {
    const row = getFallbackQueryRow(map, entry.query, entry.library_filter, entry.job_category);
    if (!row) return;
    addFallbackIssue(row, 'replacement_heavy');
    row.replacement_count = Math.max(row.replacement_count, Number(entry.replace_count || entry.replacement_count || 0));
    row.unique_replacements = Math.max(row.unique_replacements, Number(entry.unique_replacements || 0));
    mergeFallbackReview(row, entry);
  });

  (search.top_mcp_queries || []).forEach((entry) => {
    const row = getFallbackQueryRow(map, entry.query, entry.library_filter, entry.job_category);
    if (!row) return;
    addFallbackIssue(row, 'mcp');
    row.mcp_batch_count = Math.max(row.mcp_batch_count, Number(entry.batch_count || 0));
    row.mcp_converged_batches = Math.max(row.mcp_converged_batches, Number(entry.converged_batches || 0));
    row.mcp_result_rows = Math.max(row.mcp_result_rows, Number(entry.result_rows || 0));
    mergeFallbackReview(row, entry);
  });

  (search.top_queries || []).forEach((entry) => {
    const row = getFallbackQueryRow(map, entry.query, entry.library_filter, entry.job_category);
    if (!row) return;
    addFallbackIssue(row, 'successful');
    row.successful_attempt_count = Math.max(row.successful_attempt_count, Number(entry.successful_attempt_count || 0));
    row.successful_signal_count = Math.max(row.successful_signal_count, Number(entry.total_signals || 0));
    row.copy_count = Math.max(row.copy_count, Number(entry.copy_count || 0));
    row.favorite_count = Math.max(row.favorite_count, Number(entry.favorite_count || 0));
    mergeFallbackReview(row, entry);
  });
}

function mergeEvidenceFallbackRows(map) {
  (state.intelligenceEvidence || []).forEach((entry) => {
    const row = getFallbackQueryRow(map, entry.search_query, entry.library_filter, entry.job_category);
    if (!row) return;
    const signalType = normalizeSearchContextValue(entry.signal_type);
    updateFallbackSeenRange(row, entry.created_at);
    if (entry.ui_surface) row.__surfaces.add(String(entry.ui_surface).trim());
    if (entry.domain) row.__domains.add(String(entry.domain).trim());
    if (entry.context_url) row.__context_urls.add(String(entry.context_url).trim());
    row.__channels.add(classifyClientEvidenceChannel(entry));
    if (entry.session_hash) row.__session_hashes.add(String(entry.session_hash).trim());
    if (entry.ip_hash_prefix) row.__ip_hash_prefixes.add(String(entry.ip_hash_prefix).trim());
    if (entry.api_key_hash_prefix) row.__api_key_hash_prefixes.add(String(entry.api_key_hash_prefix).trim());
    if (entry.country_code || entry.country) row.__countries.add(String(entry.country_code || entry.country).trim().toUpperCase());
    if (entry.user_id) row.__registered_user_ids.add(String(entry.user_id).trim());
    if (entry.is_registered === true && entry.session_hash) row.__registered_user_ids.add(String(entry.session_hash).trim());
    if (entry.is_pro === true && entry.user_id) row.__pro_user_ids.add(String(entry.user_id).trim());
    if (entry.account_plan || entry.plan) row.__account_plans.add(String(entry.account_plan || entry.plan).trim());
    if (entry.subscription_status) row.__subscription_statuses.add(String(entry.subscription_status).trim());
    if (entry.source_table) row.__audit_sources.add(String(entry.source_table).trim());
    if (entry.client_family) row.__client_families.add(String(entry.client_family).trim());
    if (entry.tool_name) row.__tools.add(String(entry.tool_name).trim());
    if (entry.mcp_server_version) row.__mcp_versions.add(String(entry.mcp_server_version).trim());
    row.__environments.add(classifyClientEvidenceEnvironment(entry));

    if (signalType === 'search_attempt') {
      row.attempt_count += 1;
      const resultCount = parseQueryMetricNumber(entry.result_count);
      if (resultCount !== null) {
        const roundedResultCount = Math.max(0, Math.round(resultCount));
        row.total_result_count += roundedResultCount;
        row.result_samples += 1;
        row.minimum_result_count = row.minimum_result_count === null
          ? roundedResultCount
          : Math.min(row.minimum_result_count, roundedResultCount);
        if (roundedResultCount === 0) {
          row.zero_attempt_count += 1;
          addFallbackIssue(row, 'zero_result');
        } else if (roundedResultCount <= 3) {
          row.low_attempt_count += 1;
          addFallbackIssue(row, 'low_result');
        } else {
          row.successful_attempt_count += 1;
          addFallbackIssue(row, 'successful');
        }
      }
    }

    if (signalType === 'replace') {
      row.replacement_count += 1;
      addFallbackIssue(row, 'replacement_heavy');
      if (entry.replaced_with) row.__unique_replacements.add(String(entry.replaced_with));
    }

    if (signalType === 'copy' || signalType === 'favorite') {
      row.successful_signal_count += 1;
      addFallbackIssue(row, 'successful');
      if (signalType === 'copy') row.copy_count += 1;
      if (signalType === 'favorite') row.favorite_count += 1;
      if (entry.icon_id) row.__unique_icons.add(String(entry.icon_id));
    }

    if (signalType === 'mcp_call') {
      addFallbackIssue(row, 'mcp');
      row.mcp_result_rows += 1;
      if (entry.batch_id) {
        row.__mcp_batch_ids.add(String(entry.batch_id));
        if (entry.agent_converged === true) row.__mcp_converged_batch_ids.add(String(entry.batch_id));
      }
      if (entry.icon_id) row.__unique_icons.add(String(entry.icon_id));
    }
  });
}

function finalizeFallbackQueryRow(row) {
  const resultSamples = Number(row.result_samples || 0);
  const totalResultCount = Number(row.total_result_count || 0);
  if (resultSamples > 0) {
    row.average_result_count = Number((totalResultCount / resultSamples).toFixed(2));
  }
  row.surfaces = [...row.__surfaces].filter(Boolean).sort((a, b) => a.localeCompare(b));
  row.domains = [...row.__domains].filter(Boolean).sort((a, b) => a.localeCompare(b));
  row.context_urls = [...row.__context_urls].filter(Boolean).sort((a, b) => a.localeCompare(b)).slice(0, 5);
  row.channels = [...row.__channels].filter(Boolean).sort((a, b) => a.localeCompare(b));
  if (row.channels.includes('hosted_mcp')) addFallbackIssue(row, 'mcp');
  row.session_count = row.__session_hashes.size;
  row.ip_hash_count = row.__ip_hash_prefixes.size;
  row.ip_hash_prefixes = [...row.__ip_hash_prefixes].filter(Boolean).sort((a, b) => a.localeCompare(b)).slice(0, 5);
  row.api_key_hash_count = row.__api_key_hash_prefixes.size;
  row.api_key_hash_prefixes = [...row.__api_key_hash_prefixes].filter(Boolean).sort((a, b) => a.localeCompare(b)).slice(0, 5);
  row.countries = [...row.__countries].filter(Boolean).sort((a, b) => a.localeCompare(b));
  row.registered_user_count = row.__registered_user_ids.size;
  row.pro_user_count = row.__pro_user_ids.size;
  row.account_plans = [...row.__account_plans].filter(Boolean).sort((a, b) => a.localeCompare(b));
  row.subscription_statuses = [...row.__subscription_statuses].filter(Boolean).sort((a, b) => a.localeCompare(b));
  row.audit_sources = [...row.__audit_sources].filter(Boolean).sort((a, b) => a.localeCompare(b));
  row.client_families = [...row.__client_families].filter(Boolean).sort((a, b) => a.localeCompare(b));
  row.tools = [...row.__tools].filter(Boolean).sort((a, b) => a.localeCompare(b));
  row.mcp_versions = [...row.__mcp_versions].filter(Boolean).sort((a, b) => a.localeCompare(b));
  if (row.__environments.size === 0) row.__environments.add('legacy');
  row.environments = [...row.__environments].filter(Boolean).sort((a, b) => a.localeCompare(b));
  row.unique_replacements = Math.max(row.unique_replacements, row.__unique_replacements.size);
  row.unique_icons = Math.max(row.unique_icons, row.__unique_icons.size);
  row.mcp_batch_count = Math.max(row.mcp_batch_count, row.__mcp_batch_ids.size);
  row.mcp_converged_batches = Math.max(row.mcp_converged_batches, row.__mcp_converged_batch_ids.size);
  delete row.total_result_count;
  delete row.result_samples;
  delete row.__surfaces;
  delete row.__unique_replacements;
  delete row.__unique_icons;
  delete row.__mcp_batch_ids;
  delete row.__mcp_converged_batch_ids;
  delete row.__domains;
  delete row.__context_urls;
  delete row.__channels;
  delete row.__session_hashes;
  delete row.__ip_hash_prefixes;
  delete row.__api_key_hash_prefixes;
  delete row.__countries;
  delete row.__registered_user_ids;
  delete row.__pro_user_ids;
  delete row.__account_plans;
  delete row.__subscription_statuses;
  delete row.__audit_sources;
  delete row.__environments;
  delete row.__client_families;
  delete row.__tools;
  delete row.__mcp_versions;
  return row;
}

function buildFallbackQueryQueueRows() {
  const map = new Map();
  mergeTopQueryFallbackRows(map);
  mergeEvidenceFallbackRows(map);
  return [...map.values()]
    .map(finalizeFallbackQueryRow)
    .filter((row) => row.query);
}

function queryQueueRowMatchesFilters(row) {
  const filters = state.queryQueueFilters;
  if (filters.q) {
    const haystack = [
      row.query,
      row.library_filter,
      row.job_category,
      (row.issue_types || []).join(' '),
      row.review_status,
      row.review_note,
      (row.surfaces || []).join(' '),
      (row.countries || []).join(' '),
      (row.api_key_hash_prefixes || []).join(' '),
      (row.account_plans || []).join(' '),
      (row.subscription_statuses || []).join(' '),
      (row.environments || []).join(' '),
      (row.channels || []).join(' '),
      (row.client_families || []).join(' '),
      (row.tools || []).join(' '),
      (row.mcp_versions || []).join(' '),
    ].filter(Boolean).join(' ').toLowerCase();
    if (!haystack.includes(filters.q)) return false;
  }

  if (filters.issue_type && !(row.issue_types || []).includes(filters.issue_type)) {
    return false;
  }

  if (!rowMatchesQueryEnvironment(row, filters.environment)) {
    return false;
  }

  if (!rowMatchesQueryChannel(row, filters.channel)) {
    return false;
  }

  if (filters.status) {
    const status = normalizeSearchContextValue(row.review_status);
    if (filters.status === 'untriaged') {
      if (status) return false;
    } else if (status !== filters.status) {
      return false;
    }
  }

  if (filters.library_filter && normalizeReviewLibraryFilter(row.library_filter) !== filters.library_filter) return false;
  if (filters.job_category && normalizeReviewJobCategory(row.job_category) !== filters.job_category) return false;
  return true;
}

function rowMatchesIntelligenceEvidenceFilters(entry) {
  if (!rowMatchesQueryEnvironment(entry, state.queryQueueFilters.environment)) {
    return false;
  }
  if (!rowMatchesQueryChannel(entry, state.queryQueueFilters.channel)) {
    return false;
  }

  const signalFilter = normalizeSearchContextValue(state.intelligenceFilters.signal_type);
  if (signalFilter && normalizeSearchContextValue(entry.signal_type) !== signalFilter) {
    return false;
  }

  const queryText = String(state.intelligenceFilters.q || '').trim().toLowerCase();
  if (queryText) {
    const haystack = [
      entry.search_query,
      entry.icon_id,
      entry.library_filter,
      entry.job_category,
      entry.ui_surface,
      entry.signal_type,
      entry.domain,
      entry.context_url,
      entry.source,
      entry.analytics_source,
      entry.source_table,
      entry.country,
      entry.country_code,
      entry.user_email,
      classifyClientEvidenceChannel(entry),
      classifyClientEvidenceEnvironment(entry),
    ].filter(Boolean).join(' ').toLowerCase();
    if (!haystack.includes(queryText)) return false;
  }

  return true;
}

function compareQueryQueueValues(a, b, direction) {
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

function sortQueryQueueRowsClient(rows) {
  const field = state.queryQueueSort.field || 'zero_attempt_count';
  const direction = state.queryQueueSort.direction === 'asc' ? 'asc' : 'desc';
  return [...rows].sort((a, b) => {
    const aValue = field === 'status' ? (a.review_status || 'untriaged') : a[field];
    const bValue = field === 'status' ? (b.review_status || 'untriaged') : b[field];
    const compared = compareQueryQueueValues(aValue, bValue, direction);
    if (compared !== 0) return compared;
    const libraryCompared = normalizeReviewLibraryFilter(a.library_filter).localeCompare(normalizeReviewLibraryFilter(b.library_filter));
    if (libraryCompared !== 0) return libraryCompared;
    const purposeCompared = normalizeReviewJobCategory(a.job_category).localeCompare(normalizeReviewJobCategory(b.job_category));
    if (purposeCompared !== 0) return purposeCompared;
    return String(a.query || '').localeCompare(String(b.query || ''));
  });
}

function summarizeClientQueryRows(rows) {
  return rows.reduce((summary, row) => {
    const status = normalizeSearchContextValue(row.review_status);
    if (status === 'needs_alias') summary.needs_alias += 1;
    else if (status === 'needs_icon') summary.needs_icon += 1;
    else if (status === 'resolved') summary.resolved += 1;
    else if (status === 'ignore') summary.ignore += 1;
    else summary.untriaged += 1;

    (row.issue_types || []).forEach((issueType) => {
      if (summary[issueType] !== undefined) summary[issueType] += 1;
    });
    return summary;
  }, {
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
    query_review_feature_available: state.searchIntelligence?.summary?.query_review_feature_available === true,
  });
}

function buildFallbackQueryQueuePayload({ includePage = true, exportMode = false } = {}) {
  const rows = buildFallbackQueryQueueRows();
  const filteredRows = rows.filter(queryQueueRowMatchesFilters);
  const sortedRows = sortQueryQueueRowsClient(filteredRows);
  const requestedPageSize = Number(state.queryQueuePagination.page_size || 25);
  const pageSize = exportMode || !includePage
    ? Math.max(1, Math.min(2000, sortedRows.length || 1))
    : Math.max(1, requestedPageSize);
  const pageCount = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const currentPage = exportMode || !includePage
    ? 1
    : Math.min(Math.max(1, Number(state.queryQueuePagination.page || 1)), pageCount);
  const start = exportMode || !includePage ? 0 : (currentPage - 1) * pageSize;
  const pagedRows = sortedRows.slice(start, start + pageSize);

  return {
    queries: pagedRows,
    pagination: {
      page: currentPage,
      page_size: pageSize,
      total: sortedRows.length,
      page_count: pageCount,
    },
    summary: summarizeClientQueryRows(filteredRows),
    filters: {
      ...state.queryQueueFilters,
      window: state.intelligenceWindow,
    },
    sort: {
      field: state.queryQueueSort.field || 'zero_attempt_count',
      direction: state.queryQueueSort.direction || 'desc',
    },
    fallback_source: 'visible_admin_data',
  };
}

function applyQueryQueuePayload(payload, { fallback = false, message = '' } = {}) {
  if (payload.filters?.environment) {
    state.queryQueueFilters.environment = normalizeQueryEnvironment(payload.filters.environment);
  }
  if (payload.filters?.channel) {
    state.queryQueueFilters.channel = normalizeQueryChannel(payload.filters.channel);
  }
  const payloadRows = payload.queries || [];
  const visibleRows = payloadRows.filter(queryQueueRowMatchesFilters);
  const localFilterApplied = visibleRows.length !== payloadRows.length;
  state.queryQueue = visibleRows;
  state.queryQueueSummary = localFilterApplied ? summarizeClientQueryRows(visibleRows) : (payload.summary || {});
  const payloadPagination = payload.pagination || state.queryQueuePagination;
  state.queryQueuePagination = localFilterApplied
    ? {
      page: 1,
      page_size: Number(payloadPagination.page_size || state.queryQueuePagination.page_size || 25),
      total: visibleRows.length,
      page_count: 1,
    }
    : payloadPagination;
  state.queryQueueFallback = fallback;
  state.queryQueueFallbackMessage = localFilterApplied
    ? (message || 'Showing rows that match the active filters from the loaded API page.')
    : message;
  syncQueryEnvironmentControls();
  syncQueryChannelControls();
  renderQueryExplorer();
  renderQueryReviewSummary({
    untriaged: state.queryQueueSummary.untriaged || 0,
    needs_alias: state.queryQueueSummary.needs_alias || 0,
    needs_icon: state.queryQueueSummary.needs_icon || 0,
    resolved: state.queryQueueSummary.resolved || 0,
    ignore: state.queryQueueSummary.ignore || 0,
  });
}

function applyFallbackQueryQueue(message = '') {
  const payload = buildFallbackQueryQueuePayload();
  applyQueryQueuePayload(payload, {
    fallback: true,
    message: message || 'Showing rows from the visible evidence table and top query cards.',
  });
}

function findFallbackEvidenceRows(summary) {
  if (!summary) return [];
  return (state.intelligenceEvidence || []).filter((entry) => (
    normalizeSearchContextValue(entry.search_query) === normalizeSearchContextValue(summary.query)
    && normalizeReviewLibraryFilter(entry.library_filter) === normalizeReviewLibraryFilter(summary.library_filter)
    && normalizeReviewJobCategory(entry.job_category) === normalizeReviewJobCategory(summary.job_category)
  ));
}

function buildFallbackQueryDetail(row, message = '') {
  const evidenceRows = findFallbackEvidenceRows(row)
    .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
  const resultCountHistory = evidenceRows
    .filter((entry) => normalizeSearchContextValue(entry.signal_type) === 'search_attempt')
    .slice()
    .sort((a, b) => String(a.created_at || '').localeCompare(String(b.created_at || '')))
    .map((entry) => ({
      created_at: entry.created_at || null,
      result_count: parseQueryMetricNumber(entry.result_count),
      library_filter: normalizeReviewLibraryFilter(entry.library_filter),
      job_category: normalizeReviewJobCategory(entry.job_category),
      ui_surface: entry.ui_surface || null,
      note: entry.evidence_text || null,
    }));

  let suggestedNextAction = message || 'Review query context';
  if (Number(row.zero_attempt_count || 0) > 0) {
    suggestedNextAction = 'Check whether this needs an alias or a new icon';
  } else if (Number(row.low_attempt_count || 0) > 0) {
    suggestedNextAction = 'Check whether aliases or ranking can improve weak results';
  } else if (Number(row.replacement_count || 0) > 0) {
    suggestedNextAction = 'Review ranking because users replace this result';
  }

  return {
    summary: row,
    result_count_history: resultCountHistory,
    recent_evidence_rows: evidenceRows.slice(0, 75),
    related_replacements: evidenceRows.filter((entry) => normalizeSearchContextValue(entry.signal_type) === 'replace'),
    related_copies: evidenceRows.filter((entry) => normalizeSearchContextValue(entry.signal_type) === 'copy'),
    related_favorites: evidenceRows.filter((entry) => normalizeSearchContextValue(entry.signal_type) === 'favorite'),
    review: null,
    suggested_next_action: suggestedNextAction,
  };
}

function csvCellClient(value) {
  if (Array.isArray(value)) return csvCellClient(value.join('|'));
  const text = stripTokenLikeText(value);
  if (!/[",\n\r]/.test(text)) return text;
  return `"${text.replaceAll('"', '""')}"`;
}

function queryRowsToCsvClient(rows) {
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
    'first_seen',
    'last_seen',
  ];
  return [
    columns.join(','),
    ...rows.map((row) => columns.map((column) => csvCellClient(row[column])).join(',')),
  ].join('\n');
}

function compactClientEvidenceRow(entry) {
  return {
    source_table: entry.source_table || 'icon_evidence',
    signal_type: entry.signal_type || null,
    search_query: entry.search_query ? stripTokenLikeText(entry.search_query) : null,
    icon_id: entry.icon_id ? stripTokenLikeText(entry.icon_id) : null,
    result_count: entry.result_count ?? null,
    library_filter: entry.library_filter || null,
    job_category: entry.job_category || null,
    ui_surface: entry.ui_surface || null,
    domain: entry.domain ? stripTokenLikeText(entry.domain) : null,
    context_url: entry.context_url ? sanitizeAnalyticsPath(entry.context_url) : null,
    channel: classifyClientEvidenceChannel(entry),
    environment: entry.environment || classifyClientEvidenceEnvironment(entry),
    country_code: entry.country_code || entry.country || null,
    ip_hash_prefix: entry.ip_hash_prefix || null,
    session_present: Boolean(entry.session_hash),
    registered_user_present: entry.is_registered === true || Boolean(entry.user_id),
    account_plan: entry.account_plan || entry.plan || null,
    subscription_status: entry.subscription_status || null,
    pro_user: entry.is_pro === true,
    client_family: entry.client_family || null,
    tool_name: entry.tool_name || null,
    locale: entry.locale || null,
    anonymous_client_hash_prefix: entry.anonymous_client_hash_prefix || null,
    user_agent_hash_prefix: entry.user_agent_hash_prefix || null,
    api_key_hash_prefix: entry.api_key_hash_prefix || null,
    mcp_server_version: entry.mcp_server_version || null,
    request_id: entry.request_id || null,
    dedupe_key: entry.dedupe_key || null,
    audit_status: entry.audit_status || null,
    evidence_text: entry.evidence_text ? stripTokenLikeText(entry.evidence_text) : null,
    replaced_with: entry.replaced_with || null,
    created_at: entry.created_at || null,
  };
}

function buildClientEvidenceSample(queries) {
  const contexts = new Set((queries || []).map((row) => buildQueryReviewContextKey(row.query, row.library_filter, row.job_category)));
  return (state.intelligenceEvidence || [])
    .filter((entry) => contexts.has(buildQueryReviewContextKey(entry.search_query, entry.library_filter, entry.job_category)))
    .slice()
    .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))
    .slice(0, 250)
    .map(compactClientEvidenceRow);
}

function buildClientAgentAnalysisPack(payload) {
  const queries = Array.isArray(payload.queries) ? payload.queries : [];
  const evidenceSample = Array.isArray(payload.evidence_sample)
    ? payload.evidence_sample
    : buildClientEvidenceSample(queries);
  const summary = payload.summary || {};
  const filters = payload.filters || {};
  const limitations = [
    'Generated from visible admin data because the full query export API was unavailable.',
    'May not include full history beyond loaded evidence and top query rows.',
    'Evidence sample is capped for agent readability.',
    'Raw IP addresses are not exported; only hash prefixes or aggregate counts may appear.',
    'Registered/pro and country fields appear only when they were captured by the backend.',
  ];
  const analysisHints = [
    'Prioritize repeated zero-result queries before one-off misses.',
    'Review low-result queries for aliases, localized wording, and ranking problems.',
    'Compare countries, account status, and surfaces when deciding whether a gap affects paid or recurring users.',
  ];
  const summaryMarkdown = [
    '# Supericons Query Analysis Pack',
    '',
    `Exported at: ${payload.exported_at}`,
    `Window: ${String(filters.window || state.intelligenceWindow)}`,
    `Environment: ${queryEnvironmentLabel(filters.environment || state.queryQueueFilters.environment)}`,
    `Rows included: ${queries.length}`,
    `Evidence rows included: ${evidenceSample.length}`,
    '',
    '## Summary',
    '',
    `- Total queries: ${String(summary.total_queries || 0)}`,
    `- Untriaged: ${String(summary.untriaged || 0)}`,
    `- Needs alias: ${String(summary.needs_alias || 0)}`,
    `- Needs icon: ${String(summary.needs_icon || 0)}`,
    `- Resolved: ${String(summary.resolved || 0)}`,
    `- Ignored: ${String(summary.ignore || 0)}`,
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
    agent_pack: {
      manifest: {
        format: 'supericons_query_analysis_pack',
        schema_version: 2,
        source: 'visible_admin_data',
        exported_at: payload.exported_at,
        row_count: queries.length,
        evidence_sample_count: evidenceSample.length,
        recommended_for: ['agent_analysis', 'query_gap_triage', 'supericons_registry_updates'],
        large_data_strategy: 'Bounded JSON pack for filtered analysis; use CSV for flat spreadsheet work and NDJSON chunks for raw event firehose scale.',
      },
      summary,
      filters,
      sort: payload.sort || {},
      queries,
      evidence_sample: evidenceSample,
      limitations,
      analysis_hints: analysisHints,
      files: {
        'summary.md': summaryMarkdown,
        'queries.json': JSON.stringify(queries, null, 2),
        'evidence_sample.json': JSON.stringify(evidenceSample, null, 2),
        'export_manifest.json': JSON.stringify({
          exported_at: payload.exported_at,
          format: 'supericons_query_analysis_pack',
          schema_version: 2,
          source: 'visible_admin_data',
          filters,
          sort: payload.sort || {},
          summary,
          row_count: queries.length,
          evidence_sample_count: evidenceSample.length,
          limitations,
        }, null, 2),
      },
    },
  };
}

function exportFallbackQueryView(format) {
  const payload = {
    exported_at: new Date().toISOString(),
    ...buildFallbackQueryQueuePayload({ includePage: false, exportMode: true }),
  };

  if (format === 'csv') {
    downloadTextFile('supericons-query-intelligence.csv', queryRowsToCsvClient(payload.queries || []), 'text/csv;charset=utf-8');
    showToast('CSV export ready from visible query rows');
    return;
  }

  const filename = format === 'agent_pack'
    ? 'supericons-query-agent-pack.json'
    : 'supericons-query-intelligence.json';
  const body = format === 'agent_pack'
    ? buildClientAgentAnalysisPack(payload)
    : { export: payload };
  downloadTextFile(filename, JSON.stringify(body, null, 2), 'application/json;charset=utf-8');
  showToast(format === 'agent_pack' ? 'Agent pack export ready from visible query rows' : 'JSON export ready from visible query rows');
}

function downloadTextFile(filename, content, type = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function renderQueryExplorerSummary() {
  const summaryEl = $('queryExplorerSummary');
  if (!summaryEl) return;
  const summary = state.queryQueueSummary || {};
  const fallbackNote = state.queryQueueFallback || state.queryQueueFallbackMessage
    ? `<span>${escapeHtml(state.queryQueueFallbackMessage || 'Showing visible evidence rows')}</span>`
    : '';
  summaryEl.innerHTML = `
    <span>${queryEnvironmentBadge(state.queryQueueFilters.environment)}</span>
    <span>${queryChannelBadge(state.queryQueueFilters.channel)}</span>
    <span>${escapeHtml(String(summary.total_queries || 0))} matching queries</span>
    <span>${queryReviewBadge('')} ${escapeHtml(String(summary.untriaged || 0))}</span>
    <span>${queryReviewBadge('needs_alias')} ${escapeHtml(String(summary.needs_alias || 0))}</span>
    <span>${queryReviewBadge('needs_icon')} ${escapeHtml(String(summary.needs_icon || 0))}</span>
    <span>${queryIssueBadge('zero_result')} ${escapeHtml(String(summary.zero_result || 0))}</span>
    <span>${queryIssueBadge('low_result')} ${escapeHtml(String(summary.low_result || 0))}</span>
    ${fallbackNote}
  `;
}

function renderQueryExplorer() {
  renderQueryExplorerSummary();
  const tbody = $('queryExplorerTableBody');
  if (!tbody) return;

  if (!state.queryQueue.length) {
    tbody.innerHTML = `<tr><td colspan="5">${emptyState('manage_search', 'No query rows matched these filters')}</td></tr>`;
  } else {
    tbody.innerHTML = state.queryQueue.map((row) => {
      const key = buildQueryReviewContextKey(row.query, row.library_filter, row.job_category);
      const surfaces = (row.surfaces || []).join(', ') || 'No surface recorded';
      const channels = collectClientRowChannels(row).map(queryChannelLabel).join(', ')
        || queryChannelLabel(classifyClientEvidenceChannel(row));
      const environments = collectClientRowEnvironments(row).map(queryEnvironmentLabel).join(', ')
        || queryEnvironmentLabel(state.queryQueueFilters.environment);
      return `
        <tr data-query-key="${escapeHtml(key)}">
          <td>
            <button class="payload-toggle query-explorer__query" type="button" data-query-action="detail" data-query-key="${escapeHtml(key)}">
              <span class="material-symbols-outlined">open_in_new</span>
              <span>${escapeHtml(row.query || '-')}</span>
            </button>
            <div class="query-explorer__context">
              <span>${escapeHtml(formatQueryContextText(row))}</span>
              <span>${escapeHtml(formatQueryDomains(row))}</span>
              <span>${escapeHtml(channels)}</span>
              <span>${escapeHtml(environments)}</span>
            </div>
          </td>
          <td>
            <div style="display:flex;flex-wrap:wrap;gap:0.3rem;margin-bottom:0.45rem;">
              ${(row.issue_types || []).length ? row.issue_types.map(queryIssueBadge).join(' ') : '<span class="badge badge-free">No issue</span>'}
              ${queryReviewBadge(row.review_status)}
            </div>
            <div class="query-explorer__metric-grid">
              <span><strong>${escapeHtml(String(row.attempt_count || 0))}</strong> attempts</span>
              <span><strong>${escapeHtml(String(row.zero_attempt_count || 0))}</strong> zero</span>
              <span><strong>${escapeHtml(String(row.low_attempt_count || 0))}</strong> low</span>
              <span><strong>${escapeHtml(formatAverageResultCount(row.average_result_count))}</strong> avg</span>
              <span><strong>${escapeHtml(String(row.minimum_result_count ?? '-'))}</strong> min</span>
              <span><strong>${escapeHtml(String(row.replacement_count || 0))}</strong> replaced</span>
            </div>
          </td>
          <td>
            <div class="query-explorer__audience">
              <span>${escapeHtml(formatQueryAudienceText(row))}</span>
              <span>${escapeHtml(formatQueryAccountText(row))}</span>
            </div>
          </td>
          <td>
            <div class="query-explorer__last-seen">
              <strong>${escapeHtml(formatDateTime(row.last_seen))}</strong>
              <span>${escapeHtml(surfaces)}</span>
            </div>
          </td>
          <td>
            <span class="query-explorer__row-actions">
              <button class="btn btn-ghost btn-sm" type="button" data-query-action="detail" data-query-key="${escapeHtml(key)}">
                <span class="material-symbols-outlined" style="font-size:14px">visibility</span>
              </button>
              <button class="btn btn-ghost btn-sm" type="button" data-query-action="review" data-query-key="${escapeHtml(key)}">
                Review
              </button>
              <button class="btn btn-ghost btn-sm" type="button" data-query-action="copy" data-query-key="${escapeHtml(key)}">
                <span class="material-symbols-outlined" style="font-size:14px">content_copy</span>
              </button>
            </span>
          </td>
        </tr>
      `;
    }).join('');
  }

  renderPagination(
    'queryExplorerPaginationControls',
    'queryExplorerPaginationInfo',
    state.queryQueuePagination,
    'changeQueryExplorerPage',
    'queries'
  );
}

function findQueryQueueRowByKey(key) {
  return state.queryQueue.find((row) => (
    buildQueryReviewContextKey(row.query, row.library_filter, row.job_category) === key
  )) || null;
}

async function loadQueryQueue() {
  try {
    const payload = await apiRequest(`/intelligence/search/queue?${buildQueryQueueParams().toString()}`);
    applyQueryQueuePayload(payload, { fallback: false, message: '' });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    applyFallbackQueryQueue(`Full query API unavailable: ${message}. Showing visible evidence and top lists.`);
  }
}

function renderQueryDetailDrawer() {
  const content = $('queryDetailContent');
  const title = $('queryDetailTitle');
  const context = $('queryDetailContext');
  const badges = $('queryDetailBadges');
  if (!content || !title || !context || !badges) return;

  if (state.queryDetailLoading) {
    title.textContent = 'Loading query detail';
    context.textContent = 'Fetching evidence for the selected query.';
    badges.innerHTML = '';
    content.innerHTML = emptyState('hourglass_top', 'Loading query detail...');
    return;
  }

  const detail = state.selectedQueryDetail;
  if (!detail?.summary) {
    title.textContent = 'Query detail';
    context.textContent = 'Select a query to inspect it.';
    badges.innerHTML = '';
    content.innerHTML = emptyState('manage_search', 'Select a query to inspect it.');
    return;
  }

  const row = detail.summary;
  title.textContent = row.query || 'Query detail';
  context.textContent = formatQueryContextText(row);
  badges.innerHTML = `
    ${queryReviewBadge(row.review_status)}
    ${(row.issue_types || []).map(queryIssueBadge).join(' ')}
  `;
  const audienceLines = [
    `Audience: ${formatQueryAudienceText(row)}`,
    `Countries: ${Array.isArray(row.countries) && row.countries.length ? row.countries.join(', ') : 'Not captured'}`,
    `IP groups: ${Number(row.ip_hash_count || 0) || 'Not captured'}`,
    `IP group prefixes: ${Array.isArray(row.ip_hash_prefixes) && row.ip_hash_prefixes.length ? row.ip_hash_prefixes.join(', ') : 'Not captured'}`,
    `API key groups: ${Number(row.api_key_hash_count || 0) || 'Not captured'}`,
    `API key prefixes: ${Array.isArray(row.api_key_hash_prefixes) && row.api_key_hash_prefixes.length ? row.api_key_hash_prefixes.join(', ') : 'Not captured'}`,
    `Plans: ${Array.isArray(row.account_plans) && row.account_plans.length ? row.account_plans.join(', ') : 'Not captured'}`,
    `Sources: ${Array.isArray(row.audit_sources) && row.audit_sources.length ? row.audit_sources.join(', ') : 'icon_evidence'}`,
    `Environment: ${collectClientRowEnvironments(row).map(queryEnvironmentLabel).join(', ') || queryEnvironmentLabel(state.queryQueueFilters.environment)}`,
    `Channel: ${collectClientRowChannels(row).map(queryChannelLabel).join(', ') || queryChannelLabel(state.queryQueueFilters.channel)}`,
    `Client: ${Array.isArray(row.client_families) && row.client_families.length ? row.client_families.join(', ') : 'Not captured'}`,
    `Tools: ${Array.isArray(row.tools) && row.tools.length ? row.tools.join(', ') : 'Not captured'}`,
    `MCP versions: ${Array.isArray(row.mcp_versions) && row.mcp_versions.length ? row.mcp_versions.join(', ') : 'Not captured'}`,
    `Domains: ${formatQueryDomains(row)}`,
  ];

  const recentRows = detail.recent_evidence_rows || [];
  const recentList = recentRows.length
    ? recentRows.slice(0, 8).map((entry) => `
        <div class="query-detail-list__item">
          <strong>${escapeHtml(entry.signal_type || '-')}</strong>
          <span>${escapeHtml(formatDateTime(entry.created_at))}</span>
          <br />
          <span>${escapeHtml(formatEvidenceVisitor(entry).context)}</span>
          <br />
          <span>${escapeHtml(formatEvidenceNote(entry))}</span>
        </div>
      `).join('')
    : emptyState('hub', 'No evidence rows matched this query context');

  const history = detail.result_count_history || [];
  const historyList = history.length
    ? history.slice(-8).reverse().map((entry) => `
        <div class="query-detail-list__item">
          <strong>${escapeHtml(String(entry.result_count ?? '-'))} results</strong>
          <span>${escapeHtml(formatDateTime(entry.created_at))}</span>
        </div>
      `).join('')
    : emptyState('query_stats', 'No result-count history yet');

  content.innerHTML = `
    <div class="query-detail-metrics">
      <div class="query-detail-metric">
        <div class="query-detail-metric__label">Attempts</div>
        <div class="query-detail-metric__value">${escapeHtml(String(row.attempt_count || 0))}</div>
      </div>
      <div class="query-detail-metric">
        <div class="query-detail-metric__label">Zero results</div>
        <div class="query-detail-metric__value">${escapeHtml(String(row.zero_attempt_count || 0))}</div>
      </div>
      <div class="query-detail-metric">
        <div class="query-detail-metric__label">Low results</div>
        <div class="query-detail-metric__value">${escapeHtml(String(row.low_attempt_count || 0))}</div>
      </div>
      <div class="query-detail-metric">
        <div class="query-detail-metric__label">Average results</div>
        <div class="query-detail-metric__value">${escapeHtml(formatAverageResultCount(row.average_result_count))}</div>
      </div>
    </div>

    <div class="drawer-section-title">Suggested next action</div>
    <div class="query-review-lead">${escapeHtml(detail.suggested_next_action || 'Review query context')}</div>

    <div class="drawer-section-title">Audience and source</div>
    <div class="query-detail-list">
      ${audienceLines.map((line) => `<div class="query-detail-list__item">${escapeHtml(line)}</div>`).join('')}
    </div>

    <div class="drawer-section-title">Review</div>
    <div class="query-review-form">
      <div class="query-review-lead">Review applies to this query, library, and purpose across all environments.</div>
      <select class="filter-select" id="queryDetailStatus" aria-label="Query detail review status">
        <option value="">Select status</option>
        <option value="resolved" ${normalizeSearchContextValue(row.review_status) === 'resolved' ? 'selected' : ''}>Resolved</option>
        <option value="needs_alias" ${normalizeSearchContextValue(row.review_status) === 'needs_alias' ? 'selected' : ''}>Needs Alias</option>
        <option value="needs_icon" ${normalizeSearchContextValue(row.review_status) === 'needs_icon' ? 'selected' : ''}>Needs Icon</option>
        <option value="ignore" ${normalizeSearchContextValue(row.review_status) === 'ignore' ? 'selected' : ''}>Ignore</option>
      </select>
      <textarea class="query-review-textarea" id="queryDetailNote" placeholder="Add a note for the next review pass.">${escapeHtml(row.review_note || '')}</textarea>
      <div class="query-detail-actions">
        <button class="btn btn-primary btn-sm" type="button" id="queryDetailSaveReviewBtn">Save Review</button>
        <button class="btn btn-ghost btn-sm" type="button" id="queryDetailShowEvidenceBtn">Show Evidence</button>
        <button class="btn btn-ghost btn-sm" type="button" id="queryDetailExportBtn">Export Query</button>
      </div>
    </div>

    <div class="drawer-section-title">Result history</div>
    <div class="query-detail-list">${historyList}</div>

    <div class="drawer-section-title">Recent evidence</div>
    <div class="query-detail-list">${recentList}</div>
  `;

  $('queryDetailSaveReviewBtn')?.addEventListener('click', () => {
    saveQueryDetailReview().catch((error) => showToast(error.message, 'error'));
  });
  $('queryDetailShowEvidenceBtn')?.addEventListener('click', () => {
    showEvidenceForSelectedQuery().catch((error) => showToast(error.message, 'error'));
  });
  $('queryDetailExportBtn')?.addEventListener('click', () => {
    exportSelectedQuery().catch((error) => showToast(error.message, 'error'));
  });
}

function openQueryDetailDrawerShell() {
  $('queryDrawerOverlay')?.classList.add('open');
  const drawer = $('queryDetailDrawer');
  drawer?.classList.add('open');
  drawer?.setAttribute('aria-hidden', 'false');
}

function closeQueryDetailDrawer() {
  $('queryDrawerOverlay')?.classList.remove('open');
  const drawer = $('queryDetailDrawer');
  drawer?.classList.remove('open');
  drawer?.setAttribute('aria-hidden', 'true');
}

async function openQueryDetail(row) {
  if (!row) return;
  openQueryDetailDrawerShell();
  state.queryDetailLoading = true;
  renderQueryDetailDrawer();

  const params = new URLSearchParams();
  params.set('window', state.intelligenceWindow);
  params.set('environment', normalizeQueryEnvironment(state.queryQueueFilters.environment));
  params.set('query', row.query || '');
  params.set('library_filter', normalizeReviewLibraryFilter(row.library_filter));
  params.set('job_category', normalizeReviewJobCategory(row.job_category));
  try {
    const payload = await apiRequest(`/intelligence/search/query-detail?${params.toString()}`);
    state.selectedQueryDetail = payload.query_detail || null;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    state.selectedQueryDetail = buildFallbackQueryDetail(row, `Full query detail API unavailable: ${message}`);
  }
  state.queryDetailLoading = false;
  if (state.selectedQueryDetail?.summary) {
    setQueryReviewSelection(state.selectedQueryDetail.summary);
  }
  renderQueryDetailDrawer();
}

async function saveQueryDetailReview() {
  const summary = state.selectedQueryDetail?.summary;
  if (!summary) return;
  state.selectedQueryReview = {
    query: summary.query,
    library_filter: normalizeReviewLibraryFilter(summary.library_filter),
    job_category: normalizeReviewJobCategory(summary.job_category),
    status: normalizeSearchContextValue($('queryDetailStatus')?.value),
    note: $('queryDetailNote')?.value || '',
  };
  await saveQueryReview();
}

async function showEvidenceForSelectedQuery() {
  const summary = state.selectedQueryDetail?.summary;
  if (!summary) return;
  state.intelligenceFilters.q = summary.query || '';
  state.intelligenceEvidencePagination.page = 1;
  const input = $('intelligenceSearch');
  if (input) input.value = state.intelligenceFilters.q;
  await loadIntelligenceEvidence();
  showToast('Evidence table filtered to this query');
}

async function exportCurrentQueryView(format) {
  if (state.queryQueueFallback) {
    exportFallbackQueryView(format);
    return;
  }

  const params = buildQueryQueueParams({ includePage: false, exportFormat: format });
  try {
    if (format === 'csv') {
      const response = await apiRawRequest(`/intelligence/search/export?${params.toString()}`);
      const csv = await response.text();
      downloadTextFile('supericons-query-intelligence.csv', csv, 'text/csv;charset=utf-8');
      showToast('CSV export ready');
      return;
    }

    const payload = await apiRequest(`/intelligence/search/export?${params.toString()}`);
    const filename = format === 'agent_pack'
      ? 'supericons-query-agent-pack.json'
      : 'supericons-query-intelligence.json';
    downloadTextFile(filename, JSON.stringify(payload, null, 2), 'application/json;charset=utf-8');
    showToast(format === 'agent_pack' ? 'Agent pack export ready' : 'JSON export ready');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    applyFallbackQueryQueue(`Full export API unavailable: ${message}. Exporting visible evidence and top lists.`);
    exportFallbackQueryView(format);
  }
}

async function exportSelectedQuery() {
  const summary = state.selectedQueryDetail?.summary;
  if (!summary) return;
  const previousFilters = { ...state.queryQueueFilters };
  state.queryQueueFilters = {
    ...state.queryQueueFilters,
    q: summary.query || '',
    library_filter: normalizeReviewLibraryFilter(summary.library_filter),
    job_category: normalizeReviewJobCategory(summary.job_category),
  };
  try {
    await exportCurrentQueryView('agent_pack');
  } finally {
    state.queryQueueFilters = previousFilters;
  }
}

function setIntelligenceWindowCopy() {
  const window = getCurrentIntelligenceWindow();
  const environmentLabel = queryEnvironmentLabel(state.queryQueueFilters.environment);
  const scope = `${window.longLabel.toLowerCase()} - ${environmentLabel}`;
  $('intelligenceTotalEvidenceLabel').textContent = formatMetricWindowLabel('Evidence Rows');
  $('intelligenceCopyEventsLabel').textContent = formatMetricWindowLabel('Icon Copy Events');
  $('intelligenceMcpBatchesLabel').textContent = formatMetricWindowLabel('MCP Events');
  $('intelligenceKitDownloadsLabel').textContent = formatMetricWindowLabel('Kit Downloads');
  $('searchIntelUniqueQueriesLabel').textContent = formatMetricWindowLabel('Unique Queries');
  $('searchIntelSearchAttemptsLabel').textContent = formatMetricWindowLabel('Search Attempts');
  $('searchIntelZeroResultQueriesLabel').textContent = formatMetricWindowLabel('Zero-Result Queries');
  $('searchIntelLowResultQueriesLabel').textContent = formatMetricWindowLabel('Low-Result Queries');

  $('intelligenceTotalEvidenceDelta').textContent = `Raw signals captured in ${scope}`;
  $('intelligenceCopyEventsDelta').textContent = `Selection pressure in ${scope}`;
  $('intelligenceMcpBatchesDelta').textContent = `Agent search sessions logged in ${scope}`;
  $('intelligenceKitDownloadsDelta').textContent = `Collection pulls routed through Supericons in ${scope}`;
  $('searchIntelUniqueQueriesDelta').textContent = `Distinct search queries with captured evidence in ${scope}`;
  $('searchIntelSearchAttemptsDelta').textContent = `Settled searches captured in ${scope}`;
  $('searchIntelZeroResultQueriesDelta').textContent = `Distinct queries that returned no results in ${scope}`;
  $('searchIntelLowResultQueriesDelta').textContent = `Distinct queries with 1-3 results in ${scope}`;
}

function renderIntelligenceRows(containerId, rows, renderValue, emptyLabel = 'No matching rows') {
  const container = $(containerId);
  if (!container) return;
  container.innerHTML = rows.length
    ? rows.map((row) => `
        <div class="stats-row">
          <span>${escapeHtml(row.label)}</span>
          <span class="stats-row__val">${renderValue(row)}</span>
        </div>
      `).join('')
    : emptyState('bubble_chart', emptyLabel);
}

function renderReviewableQueryRows(containerId, rows, renderValue, emptyLabel = 'No reviewable query rows yet') {
  const container = $(containerId);
  if (!container) return;
  const visibleRows = rows.filter(shouldShowReviewableQuery);
  container.innerHTML = visibleRows.length
    ? visibleRows.map((row) => `
        <button
          class="stats-row stats-row--reviewable"
          type="button"
          data-review-query="${escapeHtml(row.query || '')}"
          data-review-library-filter="${escapeHtml(row.library_filter || '')}"
          data-review-job-category="${escapeHtml(row.job_category || '')}"
        >
          <span class="stats-row__label-group">
            <span>${escapeHtml(row.label)}</span>
            ${queryReviewBadge(row.review_status)}
          </span>
          <span class="stats-row__val">${renderValue(row)}</span>
        </button>
      `).join('')
    : emptyState('bubble_chart', emptyLabel);
}

function renderQueryReviewPanel() {
  const available = state.searchIntelligence?.summary?.query_review_feature_available === true;
  const selected = state.selectedQueryReview;
  const isSaving = state.queryReviewSaving === true;
  const lead = $('queryReviewLead');
  const queryEl = $('queryReviewQuery');
  const libraryEl = $('queryReviewLibrary');
  const purposeEl = $('queryReviewPurpose');
  const statusBadgeEl = $('queryReviewCurrentStatus');
  const statusInput = $('queryReviewStatus');
  const noteInput = $('queryReviewNote');
  const saveBtn = $('queryReviewSaveBtn');
  const clearBtn = $('queryReviewClearBtn');

  if (!lead || !queryEl || !libraryEl || !purposeEl || !statusBadgeEl || !statusInput || !noteInput || !saveBtn || !clearBtn) {
    return;
  }

  if (!available) {
    lead.textContent = 'Saved query statuses are disabled until the icon_query_reviews migration is applied.';
  } else if (isSaving) {
    lead.textContent = 'Saving review now. The badge should update here immediately and the lists will re-sync in the background.';
  } else if (!selected) {
    lead.textContent = 'Select a zero-result, low-result, or replacement-heavy query above to classify it for future triage.';
  } else {
    lead.textContent = 'Review applies to this query, library, and purpose across all environments.';
  }

  queryEl.textContent = selected?.query || '-';
  libraryEl.textContent = selected ? formatLibraryFilterLabel(selected.library_filter) : '-';
  purposeEl.textContent = selected?.job_category
    ? formatPurposeLabel(selected.job_category)
    : 'No purpose filter';
  statusBadgeEl.innerHTML = queryReviewBadge(selected?.status || '');

  statusInput.value = selected?.status || '';
  noteInput.value = selected?.note || '';

  const formDisabled = !available || !selected || isSaving;
  statusInput.disabled = formDisabled;
  noteInput.disabled = formDisabled;
  clearBtn.disabled = !selected || isSaving;
  saveBtn.disabled = formDisabled || !selected?.status;
  saveBtn.textContent = isSaving ? 'Saving...' : 'Save Review';
}

async function saveQueryReview() {
  const selected = state.selectedQueryReview;
  if (!selected) {
    showToast('Select a query to review first', 'error');
    return;
  }

  if (!selected.status) {
    showToast('Choose a review status before saving', 'error');
    return;
  }

  if (state.queryReviewSaving) return;
  state.queryReviewSaving = true;
  renderQueryReviewPanel();

  try {
    const payload = await apiRequest('/intelligence/search/review', {
      method: 'POST',
      body: JSON.stringify({
        query: selected.query,
        library_filter: selected.library_filter,
        job_category: selected.job_category || null,
        status: selected.status,
        note: selected.note || null,
      }),
    });

    const review = payload.review || {};
    state.selectedQueryReview = {
      query: selected.query,
      library_filter: normalizeReviewLibraryFilter(review.library_filter || selected.library_filter),
      job_category: normalizeReviewJobCategory(review.job_category || selected.job_category),
      status: normalizeSearchContextValue(review.status || selected.status),
      note: review.note || '',
    };

    applySavedQueryReviewToState(review);
    state.queryReviewSaving = false;
    renderSearchIntelligence();
    renderQueryExplorer();
    renderQueryDetailDrawer();
    showToast('Query review saved');

    const detailSummary = state.selectedQueryDetail?.summary;
    Promise.all([
      loadSearchIntelligence(),
      loadQueryQueue(),
      detailSummary ? openQueryDetail(detailSummary) : Promise.resolve(),
    ]).catch((error) => {
      showToast(error.message, 'error');
    });
  } catch (error) {
    state.queryReviewSaving = false;
    renderQueryReviewPanel();
    throw error;
  }
}

function renderSearchIntelligence() {
  const summary = state.searchIntelligence?.summary || {};
  const queueSummary = state.queryQueueSummary
    ? {
      untriaged: state.queryQueueSummary.untriaged || 0,
      needs_alias: state.queryQueueSummary.needs_alias || 0,
      needs_icon: state.queryQueueSummary.needs_icon || 0,
      resolved: state.queryQueueSummary.resolved || 0,
      ignore: state.queryQueueSummary.ignore || 0,
    }
    : summarizeQueryReviewQueue(getReviewableQueryEntries());
  const showReviewedToggle = $('queryReviewShowReviewed');

  $('searchIntelUniqueQueriesValue').textContent = summary.unique_queries || 0;
  $('searchIntelSearchAttemptsValue').textContent = summary.search_attempts || 0;
  $('searchIntelZeroResultQueriesValue').textContent = summary.zero_result_queries || 0;
  $('searchIntelLowResultQueriesValue').textContent = summary.low_result_queries || 0;
  renderQueryReviewSummary(queueSummary);
  if (showReviewedToggle) {
    showReviewedToggle.checked = state.showReviewedQueries;
  }

  renderIntelligenceRows(
    'searchIntelTopQueries',
    (state.searchIntelligence?.top_queries || []).map((entry) => ({
      label: entry.query,
      total_signals: entry.total_signals,
      successful_attempt_count: entry.successful_attempt_count,
      average_result_count: entry.average_result_count,
      copy_count: entry.copy_count,
      favorite_count: entry.favorite_count,
    })),
    (row) => {
      const attempts = Number(row.successful_attempt_count || 0);
      const copies = Number(row.copy_count || 0);
      const saves = Number(row.favorite_count || 0);
      if (attempts > 0) {
        return `${escapeHtml(String(attempts))} attempts - avg ${escapeHtml(formatAverageResultCount(row.average_result_count))} results - ${escapeHtml(String(copies))} copy - ${escapeHtml(String(saves))} save`;
      }
      return `${escapeHtml(String(row.total_signals || 0))} signals - ${escapeHtml(String(copies))} copy - ${escapeHtml(String(saves))} save`;
    },
    'No successful search or engagement signals yet'
  );

  renderIntelligenceRows(
    'searchIntelTopMcpQueries',
    (state.searchIntelligence?.top_mcp_queries || []).map((entry) => ({
      label: entry.query,
      batch_count: entry.batch_count,
      result_rows: entry.result_rows,
      converged_batches: entry.converged_batches,
    })),
    (row) => `${escapeHtml(String(row.batch_count || 0))} MCP events - ${escapeHtml(String(row.result_rows || 0))} results - ${escapeHtml(String(row.converged_batches || 0))} converged`,
    'No MCP query events in this window'
  );

  renderQueryReviewPanel();
}

function renderIntelligence() {
  const overview = state.intelligenceOverview || {};
  const searchSummary = state.searchIntelligence?.summary || {};
  const searchAttempts = Number(searchSummary.search_attempts || 0);
  const copyEvents = Number(overview.copy_events || 0);
  const favoriteEvents = Number(overview.favorite_events || 0);
  const kitDownloads = Number(overview.kit_downloads || 0);
  const mcpBatches = Number(overview.mcp_batches || 0);
  const iconActionEvents = copyEvents + favoriteEvents + kitDownloads;
  const hasRecordedPurposes = Array.isArray(overview.top_job_categories) && overview.top_job_categories.length > 0;
  const dataMix = iconActionEvents > 0
    ? 'Searches plus icon actions'
    : (searchAttempts > 0 ? 'Search-only window' : 'No activity in this window');
  const purposeCoverage = hasRecordedPurposes
    ? 'Purpose-tagged rows captured'
    : (searchAttempts > 0 ? 'Needs purpose-filtered searches or icon actions' : 'No purpose rows in this window');

  setIntelligenceWindowCopy();
  $('intelligenceTotalEvidenceValue').textContent = overview.total_evidence_rows || 0;
  $('intelligenceCopyEventsValue').textContent = copyEvents;
  $('intelligenceMcpBatchesValue').textContent = mcpBatches;
  $('intelligenceKitDownloadsValue').textContent = kitDownloads;

  $('intelligenceKeySignals').innerHTML = `
    <div class="stats-row">
      <span>Data mix</span>
      <span class="stats-row__val">${escapeHtml(dataMix)}</span>
    </div>
    <div class="stats-row">
      <span>Icon actions</span>
      <span class="stats-row__val">${escapeHtml(String(iconActionEvents))}</span>
    </div>
    <div class="stats-row">
      <span>Explicit saves</span>
      <span class="stats-row__val">${escapeHtml(String(favoriteEvents))}</span>
    </div>
    <div class="stats-row">
      <span>Purpose coverage</span>
      <span class="stats-row__val">${escapeHtml(purposeCoverage)}</span>
    </div>
    <div class="stats-row">
      <span>Metadata coverage</span>
      <span class="stats-row__val">${escapeHtml(String(state.intelligenceMetadataCoverage || 0))}</span>
    </div>
  `;

  renderIntelligenceRows(
    'intelligenceTopIcons',
    (overview.top_icons || []).map((icon) => ({
      label: icon.icon_id,
      copy_count: icon.copy_count,
      download_count: icon.download_count ?? icon.download_count_30d,
      favorite_count: icon.favorite_count ?? icon.favorite_count_30d,
      popularity_score: icon.popularity_score ?? icon.popularity_score_30d,
      retention_rate: icon.retention_rate,
      mcp_acceptance_rate: icon.mcp_acceptance_rate,
    })),
    (row) => `${escapeHtml(String(row.copy_count || 0))} copies - ${escapeHtml(String(row.download_count || 0))} downloads - ${escapeHtml(String(row.favorite_count || 0))} saves - score ${escapeHtml(String(row.popularity_score || 0))}`,
    'No copied, saved, or downloaded icons in this window'
  );

  renderIntelligenceRows(
    'intelligenceTopCategories',
    (overview.top_job_categories || []).map((entry) => ({
      label: formatPurposeLabel(entry.job_category),
      count: entry.count,
    })),
    (row) => escapeHtml(String(row.count || 0)),
    'No purpose-filtered searches or icon actions in this window'
  );

  renderIntelligenceRows(
    'intelligenceTopReplaced',
    (overview.top_replaced_icons || []).map((entry) => ({
      label: entry.icon_id,
      replace_count: entry.replace_count,
    })),
    (row) => escapeHtml(String(row.replace_count || 0)),
    'No replacement events in this window'
  );

  renderSearchIntelligence();
  renderDecisionCockpit();

  const tbody = $('intelligenceEvidenceBody');
  if (!tbody) return;
  const loadedEvidenceRows = state.intelligenceEvidence || [];
  const visibleEvidenceRows = loadedEvidenceRows.filter(rowMatchesIntelligenceEvidenceFilters);
  const localEvidenceFiltered = visibleEvidenceRows.length !== loadedEvidenceRows.length;
  if (localEvidenceFiltered) {
    $('intelligenceEvidencePaginationInfo').textContent = `${visibleEvidenceRows.length} visible events from ${loadedEvidenceRows.length} loaded rows`;
    $('intelligenceEvidencePaginationControls').innerHTML = '';
  } else {
    renderPagination(
      'intelligenceEvidencePaginationControls',
      'intelligenceEvidencePaginationInfo',
      state.intelligenceEvidencePagination,
      'changeIntelligenceEvidencePage',
      'evidence rows'
    );
  }
  if (!visibleEvidenceRows.length) {
    tbody.innerHTML = `<tr><td colspan="6">${emptyState('hub', 'No evidence events matched these filters')}</td></tr>`;
    return;
  }

  tbody.innerHTML = visibleEvidenceRows.map((entry) => {
    const visitor = formatEvidenceVisitor(entry);
    const resultParts = [];
    if (entry.icon_id) resultParts.push(entry.icon_id);
    if (entry.result_count !== null && entry.result_count !== undefined) resultParts.push(`${entry.result_count} results`);
    if (entry.library_filter) resultParts.push(entry.library_filter === 'all' ? 'all libraries' : entry.library_filter);
    const sourceParts = [
      entry.ui_surface || '-',
      formatPurposeLabel(entry.job_category),
      entry.domain || '',
    ].filter((value) => value && value !== '-');
    return `
      <tr>
        <td style="color:var(--si-text-dim);font-size:0.72rem;white-space:nowrap">${escapeHtml(formatDateTime(entry.created_at))}</td>
        <td><span class="action-chip ${actionChipClass(entry.signal_type || 'copy')}">${escapeHtml(entry.signal_type || '-')}</span></td>
        <td>
          <div class="query-activity-cell">
            <strong>${escapeHtml(visitor.account)}</strong>
            <span>${escapeHtml(visitor.context)}</span>
          </div>
        </td>
        <td>
          <div class="query-activity-cell">
            <strong>${escapeHtml(entry.search_query || '-')}</strong>
            <span>${escapeHtml(resultParts.join(' - ') || 'No result detail')}</span>
          </div>
        </td>
        <td>
          <div class="query-activity-cell">
            <strong>${escapeHtml(sourceParts.join(' - ') || '-')}</strong>
            <span>${escapeHtml(entry.context_url ? sanitizeAnalyticsPath(entry.context_url) : 'No URL recorded')}</span>
          </div>
        </td>
        <td style="font-family:var(--si-font-label);font-size:0.75rem;color:var(--si-text-dim)">${escapeHtml(formatEvidenceNote(entry))}</td>
      </tr>
    `;
  }).join('');
}

async function loadIntelligenceOverview() {
  const params = new URLSearchParams();
  params.set('window', state.intelligenceWindow);
  params.set('environment', normalizeQueryEnvironment(state.queryQueueFilters.environment));
  params.set('channel', normalizeQueryChannel(state.queryQueueFilters.channel));
  const payload = await apiRequest(`/intelligence/overview?${params.toString()}`);
  state.intelligenceOverview = payload.overview || {};
  state.intelligenceMetadataCoverage = payload.metadata_coverage?.classified_icons || 0;
  renderIntelligence();
}

async function loadSearchIntelligence() {
  const params = new URLSearchParams();
  params.set('window', state.intelligenceWindow);
  params.set('environment', normalizeQueryEnvironment(state.queryQueueFilters.environment));
  params.set('channel', normalizeQueryChannel(state.queryQueueFilters.channel));
  const payload = await apiRequest(`/intelligence/search?${params.toString()}`);
  state.searchIntelligence = payload.search_intelligence || null;
  renderIntelligence();
  if (state.queryQueueFallback) applyFallbackQueryQueue(state.queryQueueFallbackMessage);
}

async function loadIntelligenceEvidence() {
  const params = new URLSearchParams();
  params.set('window', state.intelligenceWindow);
  params.set('environment', normalizeQueryEnvironment(state.queryQueueFilters.environment));
  params.set('channel', normalizeQueryChannel(state.queryQueueFilters.channel));
  if (state.intelligenceFilters.q) params.set('q', state.intelligenceFilters.q);
  if (state.intelligenceFilters.signal_type) params.set('signal_type', state.intelligenceFilters.signal_type);
  params.set('page', String(state.intelligenceEvidencePagination.page || 1));
  params.set('page_size', String(state.intelligenceEvidencePagination.page_size || 50));
  const payload = await apiRequest(`/intelligence/evidence?${params.toString()}`);
  state.intelligenceEvidence = payload.evidence || [];
  state.intelligenceEvidencePagination = payload.pagination || state.intelligenceEvidencePagination;
  renderIntelligence();
  if (state.queryQueueFallback) applyFallbackQueryQueue(state.queryQueueFallbackMessage);
}

function renderUsers() {
  const tbody = $('usersTableBody');
  if (!tbody) return;
  $('usersPanelSubtitle').textContent = `${state.usersPagination.total} total accounts`;
  if (!state.users.length) {
    tbody.innerHTML = `<tr><td colspan="7">${emptyState('group_off', 'No users matched these filters')}</td></tr>`;
  } else {
    tbody.innerHTML = state.users.map((user) => `
      <tr onclick="openDrawer('${escapeHtml(user.id)}')">
        <td>
          <div class="user-cell">
            <div class="avatar ${String(user.provider || '').toLowerCase().includes('google') ? 'google' : ''}">${escapeHtml(initials(user.display_name || user.email || user.id))}</div>
            <div>
              <div class="user-cell__email">${escapeHtml(user.email || 'No email')}</div>
              <div class="user-cell__name">${escapeHtml(user.display_name || user.id)}</div>
            </div>
          </div>
        </td>
        <td>${providerBadge(user.provider)}</td>
        <td>${planBadge(user.plan)}</td>
        <td>${statusBadge(user)}</td>
        <td style="color:var(--si-text)">${user.purchase_count}</td>
        <td>${escapeHtml(formatDate(user.created_at))}</td>
        <td><button class="btn btn-ghost btn-sm" type="button" onclick="event.stopPropagation();openDrawer('${escapeHtml(user.id)}')">View</button></td>
      </tr>
    `).join('');
  }
  renderPagination('usersPaginationControls', 'usersPaginationInfo', state.usersPagination, 'changeUsersPage', 'users');
}

async function loadUsers() {
  const params = new URLSearchParams();
  Object.entries(state.usersFilters).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  params.set('page', String(state.usersPagination.page || 1));
  const payload = await apiRequest(`/users?${params.toString()}`);
  state.users = payload.users || [];
  state.usersPagination = payload.pagination;
  renderUsers();
}

function renderAudit() {
  const tbody = $('auditTableBody');
  if (!tbody) return;
  if (!state.auditLog.length) {
    tbody.innerHTML = `<tr><td colspan="6">${emptyState('history', 'No audit events matched these filters')}</td></tr>`;
  } else {
    tbody.innerHTML = state.auditLog.map((entry, index) => `
      <tr>
        <td style="color:var(--si-text-dim);font-size:0.72rem;white-space:nowrap">${escapeHtml(formatDateTime(entry.created_at))}</td>
        <td><span class="action-chip ${actionChipClass(entry.action)}">${escapeHtml(entry.action)}</span></td>
        <td><span class="truncate-mono">${escapeHtml(entry.target_email || entry.target_id)}</span></td>
        <td style="font-family:var(--si-font-label);font-size:0.75rem">${escapeHtml(entry.outcome || 'started')}</td>
        <td style="font-family:var(--si-font-label);font-size:0.75rem;color:var(--si-text-dim)">${escapeHtml(entry.note || entry.error_text || '')}</td>
        <td><button class="payload-toggle" type="button" data-payload-index="${index}"><span class="material-symbols-outlined">data_object</span>View</button></td>
      </tr>
    `).join('');
    tbody.querySelectorAll('[data-payload-index]').forEach((button) => {
      button.addEventListener('click', () => {
        const entry = state.auditLog[Number(button.dataset.payloadIndex)];
        window.alert(JSON.stringify(entry.payload || {}, null, 2));
      });
    });
  }
  renderPagination('auditPaginationControls', 'auditPaginationInfo', state.auditPagination, 'changeAuditPage', 'events');
}

async function loadAudit() {
  const params = new URLSearchParams();
  Object.entries(state.auditFilters).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  params.set('page', String(state.auditPagination.page || 1));
  const payload = await apiRequest(`/audit-log?${params.toString()}`);
  state.auditLog = payload.audit_log || [];
  state.auditPagination = payload.pagination;
  renderAudit();
}

function setBadge(element, label, variant) {
  element.className = `badge ${variant}`;
  element.textContent = label;
}

function renderDrawer(userData) {
  state.selectedUser = userData;
  const user = userData.user || userData;
  const subscription = user.subscription || null;
  const purchases = user.purchases || [];
  const apiKeys = user.api_keys || [];
  const auditLog = user.audit_log || [];

  $('drawerAvatar').textContent = initials(user.display_name || user.email || user.id);
  $('drawerName').textContent = user.display_name || user.email || user.id;
  $('drawerEmail').textContent = user.email || 'No email';
  setBadge($('drawerProvider'), user.provider_label || (user.providers || []).join(', ') || 'Email', String(user.provider_label || '').toLowerCase().includes('google') ? 'badge-google' : 'badge-email');
  setBadge($('drawerPlan'), subscription?.plan === 'pro_annual' ? 'Pro Annual' : subscription?.plan === 'pro_monthly' ? 'Pro Monthly' : 'Free', subscription?.plan ? 'badge-pro' : 'badge-free');
  setBadge($('drawerStatus'), user.banned_until && new Date(user.banned_until) > new Date() ? 'Banned' : subscription?.status === 'active' ? 'Active' : subscription?.status === 'trialing' ? 'Trialing' : subscription?.status === 'canceled' ? 'Canceled' : 'Free', user.banned_until && new Date(user.banned_until) > new Date() ? 'badge-canceled' : subscription?.status === 'active' ? 'badge-active' : subscription?.status === 'trialing' ? 'badge-warning' : subscription?.status === 'canceled' ? 'badge-canceled' : 'badge-free');

  $('drawerUserId').textContent = user.id;
  $('drawerEmailValue').textContent = user.email || 'No email';
  $('drawerEmailVerified').textContent = user.email_confirmed_at ? 'Yes' : 'No';
  $('drawerAuthProvider').textContent = user.provider_label || (user.providers || []).join(', ') || 'Email';
  $('drawerLastSignIn').textContent = formatDateTime(user.last_sign_in_at);
  $('drawerJoined').textContent = formatDate(user.created_at);
  $('drawerBanStatus').textContent = user.banned_until && new Date(user.banned_until) > new Date() ? `Banned until ${formatDateTime(user.banned_until)}` : 'Not banned';
  $('drawerBanButton').innerHTML = `<span class="material-symbols-outlined" style="font-size:14px">${user.banned_until && new Date(user.banned_until) > new Date() ? 'lock_open' : 'block'}</span>${user.banned_until && new Date(user.banned_until) > new Date() ? 'Unban User' : 'Ban User'}`;

  $('drawerSubscriptionPlan').innerHTML = subscription ? planBadge(subscription.plan) : '<span class="badge badge-free">Free</span>';
  $('drawerSubscriptionStatus').innerHTML = subscription ? statusBadge({ subscription_status: subscription.status, banned_until: null }) : '<span class="badge badge-free">Free</span>';
  $('drawerSubscriptionPeriodEnd').textContent = formatDate(subscription?.current_period_end);
  $('drawerStripeSubscriptionId').textContent = subscription?.stripe_subscription_id || '-';
  $('drawerStripeCustomerId').textContent = subscription?.stripe_customer_id || '-';
  $('drawerCancelSubscriptionButton').disabled = !subscription?.id;
  $('drawerCancelSubscriptionButton').style.opacity = subscription?.id ? '1' : '0.4';

  $('drawerPurchasesTitle').textContent = `${purchases.length} Purchases`;
  $('drawerPurchasesList').innerHTML = purchases.length
    ? purchases.map((purchase) => `
        <div class="purchase-row">
          <div>
            <div class="purchase-row__pack">${escapeHtml(purchase.si_products?.name || purchase.product_id)}</div>
            <div class="purchase-row__date">${escapeHtml(formatDate(purchase.purchased_at))} (${escapeHtml(purchase.source || 'purchase')})</div>
          </div>
          <button class="btn btn-danger btn-sm" type="button" data-revoke-purchase="${escapeHtml(purchase.id)}">Revoke</button>
        </div>
      `).join('')
    : emptyState('inventory_2', 'No purchases found');

  $('drawerKeysContent').innerHTML = apiKeys.length
    ? apiKeys.map((key) => `
        <div class="purchase-row">
          <div>
            <div class="purchase-row__pack">${escapeHtml(key.label || 'Untitled key')}</div>
            <div class="purchase-row__date">${escapeHtml(key.key_prefix || '')} · ${escapeHtml(key.revoked ? 'Revoked' : 'Active')}</div>
          </div>
          <button class="btn btn-danger btn-sm" type="button" data-revoke-key="${escapeHtml(key.id)}" ${key.revoked ? 'disabled style="opacity:0.4;cursor:not-allowed"' : ''}>Revoke</button>
        </div>
      `).join('')
    : emptyState('key_off', 'No API keys found');

  $('drawerAuditContent').innerHTML = auditLog.length
    ? auditLog.map((entry) => `
        <div class="stats-row" style="flex-direction:column;align-items:flex-start;gap:4px;padding:0.6rem 0">
          <div style="display:flex;align-items:center;gap:0.5rem">
            <span class="action-chip ${actionChipClass(entry.action)}">${escapeHtml(entry.action)}</span>
            <span style="font-family:var(--si-font-label);font-size:0.7rem;color:var(--si-text-dim)">${escapeHtml(formatDateTime(entry.created_at))}</span>
          </div>
          <span style="font-family:var(--si-font-label);font-size:0.72rem;color:var(--si-text-dim)">${escapeHtml(entry.note || entry.error_text || entry.outcome || '')}</span>
        </div>
      `).join('')
    : emptyState('checklist', 'No admin actions on this user');

  $('drawerPurchasesList').querySelectorAll('[data-revoke-purchase]').forEach((button) => {
    button.addEventListener('click', () => revokePurchase(button.dataset.revokePurchase));
  });
  $('drawerKeysContent').querySelectorAll('[data-revoke-key]').forEach((button) => {
    button.addEventListener('click', () => revokeApiKey(button.dataset.revokeKey));
  });

  $('drawerOverlay').classList.add('open');
  $('userDrawer').classList.add('open');
  switchTab(document.querySelector('.drawer-tab'), 'tab-account');
}

async function openDrawer(userId) {
  try {
    const payload = await apiRequest(`/users/${encodeURIComponent(userId)}`);
    renderDrawer(payload.user);
  } catch (error) {
    showToast(error.message, 'error');
  }
}

function closeDrawer() {
  $('drawerOverlay').classList.remove('open');
  $('userDrawer').classList.remove('open');
}

function switchPanel(name) {
  document.querySelectorAll('.panel').forEach((panel) => panel.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach((item) => item.classList.remove('active'));
  $(`panel-${name}`).classList.add('active');
  $(`nav-${name}`).classList.add('active');
}

function applySidebarCollapsedState(collapsed) {
  document.body.classList.toggle('sidebar-collapsed', collapsed);
  const button = $('sidebarToggleBtn');
  const icon = button?.querySelector('.material-symbols-outlined');
  if (button) {
    button.setAttribute('aria-label', collapsed ? 'Expand sidebar' : 'Collapse sidebar');
    button.title = collapsed ? 'Expand sidebar' : 'Collapse sidebar';
  }
  if (icon) {
    icon.textContent = collapsed ? 'menu' : 'menu_open';
  }
}

function toggleSidebar() {
  const collapsed = !document.body.classList.contains('sidebar-collapsed');
  window.localStorage.setItem(ADMIN_SIDEBAR_COLLAPSED_KEY, collapsed ? '1' : '0');
  applySidebarCollapsedState(collapsed);
}

function restoreSidebarState() {
  applySidebarCollapsedState(window.localStorage.getItem(ADMIN_SIDEBAR_COLLAPSED_KEY) === '1');
}

function setQueryWorkbenchView(view) {
  const normalized = view === 'activity' ? 'activity' : 'queries';
  document.querySelectorAll('[data-query-workbench-view]').forEach((button) => {
    const active = button.dataset.queryWorkbenchView === normalized;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', active ? 'true' : 'false');
  });
  $('queryWorkbenchPaneQueries')?.classList.toggle('active', normalized === 'queries');
  $('queryWorkbenchPaneActivity')?.classList.toggle('active', normalized === 'activity');
}

function switchTab(element, tabId) {
  document.querySelectorAll('.drawer-tab').forEach((tab) => tab.classList.remove('active'));
  document.querySelectorAll('.drawer-body').forEach((body) => {
    body.style.display = 'none';
  });
  element.classList.add('active');
  $(tabId).style.display = 'block';
}

function openModal() {
  if (!state.selectedUser) return;
  $('modalEmailTarget').textContent = state.selectedUser.email || 'No email';
  $('confirmInput').placeholder = state.selectedUser.email || '';
  $('confirmInput').value = '';
  $('deleteStripeCustomerToggle').checked = false;
  $('deleteModal').classList.add('open');
  checkConfirm();
}

function closeModal() {
  $('deleteModal').classList.remove('open');
}

function checkConfirm() {
  const expected = state.selectedUser?.email || '';
  const match = $('confirmInput').value === expected;
  $('confirmDeleteBtn').disabled = !match;
  $('confirmDeleteBtn').style.opacity = match ? '1' : '0.4';
  $('confirmDeleteBtn').style.cursor = match ? 'pointer' : 'not-allowed';
}

async function confirmDeleteUser() {
  if (!state.selectedUser) return;
  try {
    await apiRequest(`/users/${encodeURIComponent(state.selectedUser.id)}/delete`, {
      method: 'POST',
      body: JSON.stringify({
        delete_stripe_customer: $('deleteStripeCustomerToggle').checked,
      }),
    });
    closeModal();
    closeDrawer();
    showToast(`Deleted ${state.selectedUser.email || state.selectedUser.id}`);
    await Promise.all([loadStats(), loadUsers(), loadAudit()]);
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function toggleBanUser() {
  if (!state.selectedUser) return;
  const isBanned = state.selectedUser.banned_until && new Date(state.selectedUser.banned_until) > new Date();
  const endpoint = isBanned ? 'unban' : 'ban';
  try {
    await apiRequest(`/users/${encodeURIComponent(state.selectedUser.id)}/${endpoint}`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
    showToast(`${isBanned ? 'Unbanned' : 'Banned'} ${state.selectedUser.email || state.selectedUser.id}`);
    await Promise.all([openDrawer(state.selectedUser.id), loadAudit(), loadUsers()]);
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function cancelSubscription() {
  const subscriptionId = state.selectedUser?.subscription?.id;
  if (!subscriptionId) return;
  if (!window.confirm('Cancel this Stripe subscription now?')) return;
  try {
    await apiRequest(`/subscriptions/${encodeURIComponent(subscriptionId)}/cancel`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
    showToast('Subscription canceled');
    await Promise.all([openDrawer(state.selectedUser.id), loadAudit(), loadUsers(), loadStats()]);
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function revokePurchase(purchaseId) {
  if (!purchaseId || !window.confirm('Revoke this purchase?')) return;
  try {
    await apiRequest(`/purchases/${encodeURIComponent(purchaseId)}/revoke`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
    showToast('Purchase revoked');
    await Promise.all([openDrawer(state.selectedUser.id), loadAudit(), loadUsers(), loadStats()]);
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function revokeApiKey(apiKeyId) {
  if (!apiKeyId || !window.confirm('Revoke this API key?')) return;
  try {
    await apiRequest(`/api-keys/${encodeURIComponent(apiKeyId)}/revoke`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
    showToast('API key revoked');
    await Promise.all([openDrawer(state.selectedUser.id), loadAudit(), loadUsers()]);
  } catch (error) {
    showToast(error.message, 'error');
  }
}

function changeUsersPage(page) {
  state.usersPagination.page = page;
  loadUsers().catch((error) => showToast(error.message, 'error'));
}

function changeAuditPage(page) {
  state.auditPagination.page = page;
  loadAudit().catch((error) => showToast(error.message, 'error'));
}

function changeQueryExplorerPage(page) {
  state.queryQueuePagination.page = page;
  loadQueryQueue().catch((error) => showToast(error.message, 'error'));
}

function changeIntelligenceEvidencePage(page) {
  state.intelligenceEvidencePagination.page = page;
  loadIntelligenceEvidence().catch((error) => showToast(error.message, 'error'));
}

function bindSearchInputs() {
  let userSearchTimer = null;
  $('user-search').addEventListener('input', (event) => {
    clearTimeout(userSearchTimer);
    userSearchTimer = window.setTimeout(() => {
      state.usersFilters.q = event.target.value.trim();
      state.usersPagination.page = 1;
      loadUsers().catch((error) => showToast(error.message, 'error'));
    }, 200);
  });

  $('userPlanFilter').addEventListener('change', (event) => {
    state.usersFilters.plan = event.target.value;
    state.usersPagination.page = 1;
    loadUsers().catch((error) => showToast(error.message, 'error'));
  });

  $('userStatusFilter').addEventListener('change', (event) => {
    state.usersFilters.status = event.target.value;
    state.usersPagination.page = 1;
    loadUsers().catch((error) => showToast(error.message, 'error'));
  });

  $('userProviderFilter').addEventListener('change', (event) => {
    state.usersFilters.provider = event.target.value;
    state.usersPagination.page = 1;
    loadUsers().catch((error) => showToast(error.message, 'error'));
  });

  let auditSearchTimer = null;
  $('auditSearch').addEventListener('input', (event) => {
    clearTimeout(auditSearchTimer);
    auditSearchTimer = window.setTimeout(() => {
      state.auditFilters.q = event.target.value.trim();
      state.auditPagination.page = 1;
      loadAudit().catch((error) => showToast(error.message, 'error'));
    }, 200);
  });

  $('auditActionFilter').addEventListener('change', (event) => {
    state.auditFilters.action = event.target.value;
    state.auditPagination.page = 1;
    loadAudit().catch((error) => showToast(error.message, 'error'));
  });

  let intelligenceSearchTimer = null;
  $('intelligenceSearch').addEventListener('input', (event) => {
    clearTimeout(intelligenceSearchTimer);
    intelligenceSearchTimer = window.setTimeout(() => {
      state.intelligenceFilters.q = event.target.value.trim();
      state.intelligenceEvidencePagination.page = 1;
      loadIntelligenceEvidence().catch((error) => showToast(error.message, 'error'));
    }, 200);
  });

  $('intelligenceSignalFilter').addEventListener('change', (event) => {
    state.intelligenceFilters.signal_type = event.target.value;
    state.intelligenceEvidencePagination.page = 1;
    loadIntelligenceEvidence().catch((error) => showToast(error.message, 'error'));
  });

  $('intelligenceChannelFilter')?.addEventListener('change', (event) => {
    state.queryQueueFilters.channel = normalizeQueryChannel(event.target.value);
    state.intelligenceFilters.channel = state.queryQueueFilters.channel;
    refreshEnvironmentScopedIntelligence().catch((error) => showToast(error.message, 'error'));
  });

  $('intelligenceEnvironmentFilter')?.addEventListener('change', (event) => {
    state.queryQueueFilters.environment = normalizeQueryEnvironment(event.target.value);
    refreshEnvironmentScopedIntelligence().catch((error) => showToast(error.message, 'error'));
  });

  let queryExplorerSearchTimer = null;
  $('queryExplorerSearch')?.addEventListener('input', (event) => {
    clearTimeout(queryExplorerSearchTimer);
    queryExplorerSearchTimer = window.setTimeout(() => {
      state.queryQueueFilters.q = event.target.value.trim();
      state.queryQueuePagination.page = 1;
      loadQueryQueue().catch((error) => showToast(error.message, 'error'));
    }, 200);
  });

  $('queryExplorerIssueFilter')?.addEventListener('change', (event) => {
    state.queryQueueFilters.issue_type = event.target.value;
    state.queryQueuePagination.page = 1;
    loadQueryQueue().catch((error) => showToast(error.message, 'error'));
  });

  $('queryExplorerStatusFilter')?.addEventListener('change', (event) => {
    state.queryQueueFilters.status = event.target.value;
    state.queryQueuePagination.page = 1;
    loadQueryQueue().catch((error) => showToast(error.message, 'error'));
  });

  $('queryExplorerEnvironmentFilter')?.addEventListener('change', (event) => {
    state.queryQueueFilters.environment = normalizeQueryEnvironment(event.target.value);
    refreshEnvironmentScopedIntelligence().catch((error) => showToast(error.message, 'error'));
  });

  $('queryExplorerChannelFilter')?.addEventListener('change', (event) => {
    state.queryQueueFilters.channel = normalizeQueryChannel(event.target.value);
    state.intelligenceFilters.channel = state.queryQueueFilters.channel;
    refreshEnvironmentScopedIntelligence().catch((error) => showToast(error.message, 'error'));
  });

  let queryLibraryTimer = null;
  $('queryExplorerLibraryFilter')?.addEventListener('input', (event) => {
    clearTimeout(queryLibraryTimer);
    queryLibraryTimer = window.setTimeout(() => {
      state.queryQueueFilters.library_filter = normalizeSearchContextValue(event.target.value);
      state.queryQueuePagination.page = 1;
      loadQueryQueue().catch((error) => showToast(error.message, 'error'));
    }, 250);
  });

  let queryPurposeTimer = null;
  $('queryExplorerPurposeFilter')?.addEventListener('input', (event) => {
    clearTimeout(queryPurposeTimer);
    queryPurposeTimer = window.setTimeout(() => {
      state.queryQueueFilters.job_category = normalizeSearchContextValue(event.target.value);
      state.queryQueuePagination.page = 1;
      loadQueryQueue().catch((error) => showToast(error.message, 'error'));
    }, 250);
  });

  $('queryExplorerSort')?.addEventListener('change', (event) => {
    state.queryQueueSort.field = event.target.value;
    state.queryQueuePagination.page = 1;
    loadQueryQueue().catch((error) => showToast(error.message, 'error'));
  });

  $('queryExplorerDirection')?.addEventListener('change', (event) => {
    state.queryQueueSort.direction = event.target.value;
    state.queryQueuePagination.page = 1;
    loadQueryQueue().catch((error) => showToast(error.message, 'error'));
  });

  $('queryExplorerPageSize')?.addEventListener('change', (event) => {
    state.queryQueuePagination.page_size = Number(event.target.value) || 25;
    state.queryQueuePagination.page = 1;
    loadQueryQueue().catch((error) => showToast(error.message, 'error'));
  });

  $('intelligenceWindowFilter').addEventListener('change', (event) => {
    state.intelligenceWindow = event.target.value;
    state.queryQueuePagination.page = 1;
    state.intelligenceEvidencePagination.page = 1;
    Promise.all([loadIntelligenceOverview(), loadSearchIntelligence(), loadQueryQueue(), loadIntelligenceEvidence()])
      .catch((error) => showToast(error.message, 'error'));
  });

  $('umamiCsvButton')?.addEventListener('click', () => {
    $('umamiCsvInput')?.click();
  });

  $('umamiCsvInput')?.addEventListener('change', (event) => {
    importUmamiCsvFiles(Array.from(event.target.files || []))
      .catch((error) => showToast(error.message, 'error'));
  });

  $('umamiCsvClearButton')?.addEventListener('click', () => {
    state.umami = { loaded: false, files: [], tables: {}, summary: null };
    const input = $('umamiCsvInput');
    if (input) input.value = '';
    renderUmamiSummary();
    renderDecisionCockpit();
  });
}

async function refreshAll() {
  await Promise.all([
    loadStats(),
    loadIntelligenceOverview(),
    loadSearchIntelligence(),
    loadQueryQueue(),
    loadIntelligenceEvidence(),
    loadUsers(),
    loadAudit(),
  ]);
}

function bindGlobalEvents() {
  $('sidebarToggleBtn')?.addEventListener('click', toggleSidebar);
  document.querySelectorAll('[data-query-workbench-view]').forEach((button) => {
    button.addEventListener('click', () => setQueryWorkbenchView(button.dataset.queryWorkbenchView || 'queries'));
  });

  $('queryExplorerTableBody')?.addEventListener('click', (event) => {
    const trigger = event.target instanceof Element
      ? event.target.closest('[data-query-action]')
      : null;
    if (!trigger) return;
    const row = findQueryQueueRowByKey(trigger.dataset.queryKey || '');
    if (!row) return;
    const action = trigger.dataset.queryAction;
    if (action === 'detail') {
      openQueryDetail(row).catch((error) => showToast(error.message, 'error'));
      return;
    }
    if (action === 'review') {
      openQueryDetail(row).catch((error) => showToast(error.message, 'error'));
      return;
    }
    if (action === 'copy') {
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(row.query || '').then(
          () => showToast('Query copied'),
          () => showToast('Copy failed', 'error'),
        );
      } else {
        showToast('Copy is not available in this browser', 'error');
      }
    }
  });

  $('queryExplorerExportCsv')?.addEventListener('click', () => {
    exportCurrentQueryView('csv').catch((error) => showToast(error.message, 'error'));
  });
  $('queryExplorerExportJson')?.addEventListener('click', () => {
    exportCurrentQueryView('json').catch((error) => showToast(error.message, 'error'));
  });
  $('queryExplorerExportAgentPack')?.addEventListener('click', () => {
    exportCurrentQueryView('agent_pack').catch((error) => showToast(error.message, 'error'));
  });

  $('statsRefreshBtn').addEventListener('click', () => {
    refreshAll().then(() => showToast('Admin data refreshed')).catch((error) => showToast(error.message, 'error'));
  });
  $('intelligenceRefreshBtn').addEventListener('click', () => {
    Promise.all([loadIntelligenceOverview(), loadSearchIntelligence(), loadQueryQueue(), loadIntelligenceEvidence()])
      .then(() => showToast('Icon intelligence refreshed'))
      .catch((error) => showToast(error.message, 'error'));
  });
  $('adminReconnectBtn').addEventListener('click', async () => {
    try {
      await openAdminSecretModal({ force: true });
      await refreshAll();
      showToast('Admin secret updated');
    } catch (error) {
      if (error?.message !== 'Admin secret update canceled.') {
        showToast(error.message, 'error');
      }
    }
  });
  $('adminSecretForm').addEventListener('submit', submitAdminSecretForm);
  $('adminSecretCancelBtn').addEventListener('click', cancelAdminSecretPrompt);
  $('drawerBanButton').addEventListener('click', () => {
    toggleBanUser().catch((error) => showToast(error.message, 'error'));
  });
  $('drawerCancelSubscriptionButton').addEventListener('click', () => {
    cancelSubscription().catch((error) => showToast(error.message, 'error'));
  });
  $('confirmDeleteBtn').addEventListener('click', () => {
    confirmDeleteUser().catch((error) => showToast(error.message, 'error'));
  });
  $('deleteModal').addEventListener('click', (event) => {
    if (event.target === $('deleteModal')) closeModal();
  });

  $('topbarHost').textContent = window.location.host || 'supericons.dev';
  const adminHost = window.location.hostname;
  const isLocalAdminHost = adminHost === 'localhost' || adminHost === '127.0.0.1' || adminHost === '::1';
  $('topbarEnvironment').textContent = isLocalAdminHost ? 'Local shell' : 'Production';
}

async function init() {
  restoreSidebarState();
  bindSearchInputs();
  bindGlobalEvents();
  try {
    await ensureAdminSecret();
    await refreshAll();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

window.switchPanel = switchPanel;
window.openDrawer = openDrawer;
window.closeDrawer = closeDrawer;
window.closeQueryDetailDrawer = closeQueryDetailDrawer;
window.switchTab = switchTab;
window.openModal = openModal;
window.closeModal = closeModal;
window.checkConfirm = checkConfirm;
window.changeUsersPage = changeUsersPage;
window.changeAuditPage = changeAuditPage;
window.changeQueryExplorerPage = changeQueryExplorerPage;
window.changeIntelligenceEvidencePage = changeIntelligenceEvidencePage;

init();
