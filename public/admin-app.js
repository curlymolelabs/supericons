const ADMIN_RUNTIME_CONFIG = window.__SI_ADMIN_RUNTIME__ || {};
const ADMIN_API_BASE = String(
  ADMIN_RUNTIME_CONFIG.apiBase
    || 'https://kcjmkakdhsqplvasgkjv.supabase.co/functions/v1/admin-api',
).replace(/\/+$/, '');
const ADMIN_API_MANAGED_AUTH = ADMIN_RUNTIME_CONFIG.managedAuth === true;
const ADMIN_SECRET_STORAGE_KEY = 'si_admin_secret';
const CACHE_PREFIX = 'si_admin_dashboard_v2_cache';
const CACHE_TTL_MS = 30_000;

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
  api: 'API',
  cli: 'CLI',
  internal_test: 'Test',
  unknown: 'Unclassified',
};

const ORIGIN_LABELS = {
  agent_query: 'User query',
  page_load: 'Page load',
  internal_test: 'Test',
  unknown: 'Unclassified',
};

const state = {
  activeSection: 'overview',
  filters: {
    window: '30d',
    from: '',
    to: '',
    channel: 'all',
    includeTest: false,
    q: '',
  },
  explorerQuery: '',
  explorerIssue: '',
  topList: 'searched',
  data: {
    activity: null,
    overview: null,
    search: null,
    audience: null,
  },
  errors: {},
  loading: new Set(),
  refreshedAt: null,
  refreshStartedAt: null,
  toastTimer: null,
  adminSecretPrompt: null,
  requestToken: 0,
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
  return window.sessionStorage.getItem(ADMIN_SECRET_STORAGE_KEY) || '';
}

function setAdminSecret(secret) {
  if (ADMIN_API_MANAGED_AUTH) return;
  const value = String(secret || '').trim();
  if (value) window.sessionStorage.setItem(ADMIN_SECRET_STORAGE_KEY, value);
  else window.sessionStorage.removeItem(ADMIN_SECRET_STORAGE_KEY);
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
  if (modal && ADMIN_API_MANAGED_AUTH) modal.style.display = 'none';
}

function openAdminSecretModal({ force = false, error = '' } = {}) {
  if (ADMIN_API_MANAGED_AUTH) {
    closeAdminSecretModal();
    return Promise.resolve('');
  }
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
  overlay.setAttribute('aria-hidden', 'false');
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
    closeAdminSecretModal();
    return '';
  }
  const existing = getAdminSecret();
  return existing && !force ? existing : openAdminSecretModal({ force, error });
}

function submitAdminSecret(event) {
  event.preventDefault();
  const input = $('adminSecretInput');
  const value = String(input?.value || '').trim();
  if (!value) {
    setAdminSecretError('Enter the current admin secret.');
    input?.focus();
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
  const response = await fetch(requestUrl, {
    ...options,
    method,
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      ...(secret ? { 'x-admin-secret': secret } : {}),
      ...(options.headers || {}),
    },
  });
  let payload = {};
  try {
    payload = await response.json();
  } catch {
    payload = {};
  }
  if (response.status === 403 && retry && !ADMIN_API_MANAGED_AUTH) {
    setAdminSecret('');
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

function sharedParams({ forSearch = false } = {}) {
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

function endpointPath(endpoint) {
  const params = sharedParams({ forSearch: endpoint === 'search' });
  if (endpoint === 'activity') params.set('limit', '50');
  if (endpoint === 'search') {
    params.set('page', '1');
    params.set('page_size', '100');
    if (state.explorerIssue) params.set('issue', state.explorerIssue);
  }
  if (endpoint === 'audience') {
    params.set('page', '1');
    params.set('page_size', '100');
  }
  return `/v2/${endpoint}?${params}`;
}

function cacheKey(endpoint) {
  return `${CACHE_PREFIX}:${endpoint}:${endpointPath(endpoint)}`;
}

function readCache(endpoint) {
  try {
    const value = JSON.parse(window.sessionStorage.getItem(cacheKey(endpoint)) || 'null');
    if (!value || !value.payload || !Number.isFinite(value.savedAt)) return null;
    return value;
  } catch {
    return null;
  }
}

function writeCache(endpoint, payload) {
  try {
    window.sessionStorage.setItem(cacheKey(endpoint), JSON.stringify({
      payload,
      savedAt: Date.now(),
    }));
  } catch {
    // The dashboard still works when browser storage is unavailable.
  }
}

function clearDashboardCache() {
  try {
    for (let index = window.sessionStorage.length - 1; index >= 0; index -= 1) {
      const key = window.sessionStorage.key(index);
      if (key?.startsWith(CACHE_PREFIX)) window.sessionStorage.removeItem(key);
    }
  } catch {
    // Refreshing from the API is sufficient when browser storage is unavailable.
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
  if (!state.refreshedAt) {
    line.textContent = Object.keys(state.errors).length
      ? 'Some production data could not be loaded'
      : 'Waiting for production data';
    return;
  }
  const elapsed = Math.max(0, Date.now() - state.refreshStartedAt);
  line.textContent = `Up to date, loaded in ${formatNumber(elapsed)} ms`;
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
  return `${pill('Anonymous')} ${escapeHtml(truncate(key, 18))}`;
}

function outcomeFor(row = {}) {
  const resultCount = number(row.result_count ?? row.results);
  const outcome = String(row.issue_type || row.outcome || row.search_outcome || '').toLowerCase();
  if (outcome.includes('error')) return { label: 'Error', tone: 'zero' };
  if (outcome.includes('zero') || row.true_zero || resultCount === 0) return { label: 'Zero', tone: 'zero' };
  if (outcome.includes('low') || row.low_result) return { label: 'Low', tone: 'low' };
  return { label: 'Success', tone: 'ok' };
}

function table(headers, rows, emptyReason) {
  if (!rows.length) return emptyState(emptyReason);
  return `
    <table>
      <thead><tr>${headers.map((header) => `<th class="${header.number ? 'number' : ''}">${escapeHtml(header.label)}</th>`).join('')}</tr></thead>
      <tbody>${rows.map((row) => `
        <tr>${headers.map((header) => `<td class="${header.number ? 'number' : ''}">${header.render(row)}</td>`).join('')}</tr>
      `).join('')}</tbody>
    </table>
  `;
}

function csvCell(value) {
  const text = String(value ?? '');
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
    for (const field of fields) current[field] = number(current[field]) + number(row[field]);
    days.set(day, current);
  }
  return [...days.values()].sort((a, b) => a.day.localeCompare(b.day));
}

function chartUnavailable(reason) {
  return `<div class="chart-empty">${escapeHtml(reason)}</div>`;
}

function linePath(points, xFor, yFor, field) {
  return points
    .map((row, index) => `${index ? 'L' : 'M'} ${xFor(index).toFixed(2)} ${yFor(number(row[field])).toFixed(2)}`)
    .join(' ');
}

function axisLabels(points, xFor, width, height, left, bottom) {
  if (!points.length) return '';
  const indexes = [...new Set([0, Math.floor((points.length - 1) / 2), points.length - 1])];
  return indexes.map((index) => `
    <text x="${xFor(index)}" y="${height - 6}" text-anchor="${index === 0 ? 'start' : index === points.length - 1 ? 'end' : 'middle'}" fill="#73706d" font-size="10">${escapeHtml(formatDate(`${points[index].day}T00:00:00Z`))}</text>
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
  const width = 760;
  const height = 220;
  const left = 38;
  const right = 10;
  const top = 20;
  const bottom = 188;
  const maxValue = Math.max(1, ...points.flatMap((row) => lines.map((line) => number(row[line.field]))));
  const xFor = (index) => left + (index * (width - left - right) / Math.max(1, points.length - 1));
  const yFor = (value) => bottom - (number(value) / maxValue) * (bottom - top);
  const grid = [0, 0.5, 1].map((ratio) => {
    const y = yFor(maxValue * ratio);
    return `<line x1="${left}" x2="${width - right}" y1="${y}" y2="${y}" stroke="#302f2f" stroke-dasharray="3 5" />
      <text x="${left - 7}" y="${y + 3}" text-anchor="end" fill="#73706d" font-size="9">${escapeHtml(options.percent ? formatPercent(maxValue * ratio, 0) : formatNumber(maxValue * ratio))}</text>`;
  }).join('');
  const outageSpans = normalizeList(options.outageSpans).map((span) => {
    const start = points.findIndex((row) => row.day >= String(span.from || span.start || '').slice(0, 10));
    const endIndex = points.findLastIndex((row) => row.day <= String(span.to || span.end || '').slice(0, 10));
    if (start < 0 || endIndex < 0) return '';
    const x1 = xFor(start);
    const x2 = xFor(Math.max(start, endIndex));
    return `<rect x="${x1}" y="${top}" width="${Math.max(7, x2 - x1 + 7)}" height="${bottom - top}" fill="rgba(255,124,115,0.08)" />
      <text x="${x1 + 3}" y="${top + 10}" fill="#ff7c73" font-size="8">${escapeHtml(span.label || 'Outage')}</text>`;
  }).join('');
  const paths = lines.map((line, index) => {
    const color = line.color || CHART_COLORS[index % CHART_COLORS.length];
    return `
      <path d="${linePath(points, xFor, yFor, line.field)}" fill="none" stroke="${color}" stroke-width="2.5" />
      ${points.map((row, pointIndex) => `<circle cx="${xFor(pointIndex)}" cy="${yFor(row[line.field])}" r="2.4" fill="${color}"><title>${escapeHtml(`${row.day}: ${line.label} ${options.percent ? formatPercent(row[line.field], 1) : formatNumber(row[line.field])}`)}</title></circle>`).join('')}
    `;
  }).join('');
  const legend = lines.map((line, index) => {
    const color = line.color || CHART_COLORS[index % CHART_COLORS.length];
    return `<g transform="translate(${left + index * 145},7)"><circle cx="4" cy="4" r="4" fill="${color}"/><text x="13" y="8" fill="#aaa7a4" font-size="10">${escapeHtml(line.label)}</text></g>`;
  }).join('');
  element.innerHTML = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(options.label || 'Trend chart')}">${grid}${outageSpans}${paths}${legend}${axisLabels(points, xFor, width, height, left, bottom)}</svg>`;
}

function renderSearchBars(element, series) {
  if (!element) return;
  const rows = chartRows(series).filter((row) => String(row.channel || row.venue || '') !== 'all');
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
  const width = 760;
  const height = 220;
  const left = 38;
  const right = 10;
  const top = 25;
  const bottom = 188;
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
  const legend = channels.slice(0, 5).map((channel, index) => `<g transform="translate(${left + index * 126},7)"><rect width="8" height="8" rx="2" fill="${CHART_COLORS[index % CHART_COLORS.length]}"/><text x="13" y="8" fill="#aaa7a4" font-size="9">${escapeHtml(channelLabel(channel))}</text></g>`).join('');
  element.innerHTML = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Searches over time">${legend}<line x1="${left}" x2="${width - right}" y1="${bottom}" y2="${bottom}" stroke="#302f2f"/>${bars}${axisLabels(days.map((day) => ({ day })), xFor, width, height, left, bottom)}</svg>`;
}

function unwrapRows(value) {
  if (Array.isArray(value)) return value;
  return normalizeList(value?.rows);
}

function availability(value, defaultReason) {
  if (Array.isArray(value)) return { available: true, rows: value, reason: '' };
  if (!value) return { available: false, rows: [], reason: defaultReason };
  return {
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
    ...Object.entries(CHANNEL_LABELS)
      .filter(([key]) => key !== 'all' && number(counts[key]) > 0)
      .map(([key, label]) => `<option value="${escapeHtml(key)}">${escapeHtml(label)} (${formatNumber(counts[key])})</option>`),
  ];
  if (current !== 'all' && number(counts[current]) === 0) {
    options.push(`<option value="${escapeHtml(current)}">${escapeHtml(channelLabel(current))}</option>`);
  }
  select.innerHTML = options.join('');
  select.value = current;
}

function renderActivity() {
  const element = $('latestActivity');
  if (!element) return;
  if (state.loading.has('activity') && !state.data.activity) return;
  const rows = normalizeList(state.data.activity?.activity);
  if (!rows.length) {
    element.innerHTML = emptyState(state.errors.activity || 'No real user queries match these filters.');
    return;
  }
  element.innerHTML = rows.map((row) => {
    const outcome = outcomeFor(row);
    const library = safeText(row.library_filter || row.library, 'All libraries');
    const origin = originLabel(row.query_origin || row.origin);
    const country = safeText(row.country_code || row.country, 'Unknown');
    return `
      <div class="activity-row">
        <div class="activity-query">
          <strong>${escapeHtml(safeText(row.query, 'Empty query'))}</strong>
          <div class="activity-meta">${escapeHtml(library)} | ${escapeHtml(origin)}</div>
        </div>
        <div>${visitorLabel(row)}</div>
        <div>${pill(`${formatNumber(row.result_count ?? row.results)} results`, outcome.tone)}</div>
        <div>${pill(country)} ${pill(channelLabel(row.channel || row.venue), 'info')}</div>
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
    const attempts = number(row.eligible_attempts || row.attempts);
    const lowEligible = number(row.low_result_eligible_count || row.eligible_attempts || row.attempts);
    return {
      ...row,
      true_zero_rate: attempts ? number(row.true_zeros || row.true_zero_count) / attempts : 0,
      low_result_rate: lowEligible ? number(row.low_results || row.low_result_count) / lowEligible : 0,
    };
  });
}

function renderKpis() {
  const kpis = state.data.overview?.kpis || {};
  if (!state.data.overview && state.loading.has('overview')) return;
  const clients = number(kpis.estimated_unique_clients ?? kpis.unique_clients);
  const registered = number(kpis.registered_clients ?? kpis.registered);
  const pro = number(kpis.pro_clients ?? kpis.pro);
  const anonymous = number(kpis.anonymous_clients ?? Math.max(0, clients - registered));
  const searches = number(kpis.attempts ?? kpis.searches);
  const successRate = number(kpis.success_rate ?? (searches ? number(kpis.success_count) / searches : 0));
  if (kpis.identity_available === false) {
    setSkeleton($('kpiClients'), 'Unavailable');
    $('kpiClientsNote').textContent = kpis.identity_unavailable_reason || 'Choose a shorter date range for exact client counts.';
  } else {
    setSkeleton($('kpiClients'), formatNumber(clients));
    $('kpiClientsNote').textContent = `${formatNumber(registered)} registered, ${formatNumber(pro)} Pro, ${formatNumber(anonymous)} anonymous`;
  }
  setSkeleton($('kpiSearches'), formatNumber(searches));
  $('kpiSearchesNote').textContent = `${formatNumber(kpis.searches_per_client)} per client, ${formatPercent(successRate)} successful`;
  setSkeleton($('kpiZero'), formatPercent(kpis.true_zero_rate));
  $('kpiZeroNote').textContent = `${formatNumber(kpis.true_zero_count)} true zeros. Known defects and errors are excluded.`;
  setSkeleton($('kpiLow'), formatPercent(kpis.low_result_rate));
  $('kpiLowNote').textContent = `${formatNumber(kpis.low_result_count)} of ${formatNumber(kpis.low_result_eligible_count)} eligible searches`;
}

function renderCharts() {
  const overview = state.data.overview;
  if (!overview && state.loading.has('overview')) return;
  const series = overview?.series;
  renderSearchBars($('searchesChart'), series);
  renderLineChart(
    $('clientsChart'),
    series,
    [{ field: 'client_days', label: 'Client-days', color: CHART_COLORS[1] }],
    { label: 'Unique clients over time', emptyReason: 'Client history will appear after the v2 summary endpoint is live.' },
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

function topListConfig(key) {
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
        { label: 'Clients', number: true, render: (row) => formatNumber(row.distinct_clients) },
      ],
    };
  }
  if (key === 'zero') {
    return {
      headers: [
        { label: 'Query', render: (row) => `<strong>${escapeHtml(safeText(row.query, 'Empty query'))}</strong><div class="activity-meta">${escapeHtml(safeText(row.library_filter, 'All libraries'))}</div>` },
        { label: 'Zeros', number: true, render: (row) => formatNumber(row.count ?? row.attempt_count ?? row.zero_attempt_count) },
        { label: 'Clients', number: true, render: (row) => formatNumber(row.distinct_clients ?? row.estimated_unique_clients) },
        { label: 'Last seen', render: (row) => escapeHtml(formatDate(row.last_seen, true)) },
      ],
    };
  }
  return {
    headers: [
      { label: 'Query', render: (row) => `<strong>${escapeHtml(safeText(row.query, 'Empty query'))}</strong><div class="activity-meta">${escapeHtml(safeText(row.library_filter, 'All libraries'))}</div>` },
      { label: 'Searches', number: true, render: (row) => formatNumber(row.count ?? row.searches ?? row.attempt_count) },
      { label: 'Clients', number: true, render: (row) => formatNumber(row.distinct_clients ?? row.estimated_unique_clients) },
      { label: 'Hit rate', number: true, render: (row) => formatPercent(row.hit_rate ?? row.success_rate) },
    ],
  };
}

function renderTopList() {
  const element = $('topListTable');
  if (!element) return;
  if (!state.data.overview && state.loading.has('overview')) return;
  document.querySelectorAll('[data-top-list]').forEach((button) => {
    button.classList.toggle('active', button.dataset.topList === state.topList);
  });
  const value = state.data.overview?.top_lists?.[state.topList];
  const list = availability(value, 'This list is not available from the current data source.');
  $('topListSubtitle').textContent = list.available
    ? `Top 50 for ${appliedWindowLabel().toLowerCase()}`
    : list.reason;
  if (!list.available) {
    element.innerHTML = emptyState(list.reason);
    return;
  }
  element.innerHTML = table(
    topListConfig(state.topList).headers,
    list.rows,
    `No ${state.topList} rows match these filters.`,
  );
}

function renderGeography() {
  const element = $('geographyList');
  if (!element) return;
  if (!state.data.overview && state.loading.has('overview')) return;
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
  if (!state.data.search && state.loading.has('search')) return;
  const rows = normalizeList(state.data.search?.queries);
  const headers = [
    {
      label: 'Query',
      render: (row) => `<strong>${escapeHtml(safeText(row.query, 'Empty query'))}</strong><div class="activity-meta">${escapeHtml(safeText(row.library_filter || row.library, 'All libraries'))} | ${escapeHtml(originLabel(row.query_origin || row.origin))}</div>`,
    },
    { label: 'Outcome', render: (row) => { const value = outcomeFor(row); return pill(value.label, value.tone); } },
    { label: 'Client', render: (row) => visitorLabel(row) },
    { label: 'Country', render: (row) => pill(safeText(row.country_code || row.country, 'Unknown')) },
    { label: 'Venue', render: (row) => pill(channelLabel(row.channel || row.venue), 'info') },
    { label: 'Results', number: true, render: (row) => formatNumber(row.result_count ?? row.results) },
    { label: 'Last seen', render: (row) => escapeHtml(formatDate(row.last_seen || row.created_at, true)) },
  ];
  element.innerHTML = table(headers, rows, state.errors.search || 'No queries match these filters.');
}

function renderWorklist() {
  const element = $('gapWorklist');
  if (!element) return;
  const rows = normalizeList(state.data.search?.worklist);
  element.innerHTML = table([
    { label: 'Query', render: (row) => `<strong>${escapeHtml(safeText(row.query, 'Empty query'))}</strong><div class="activity-meta">${escapeHtml(safeText(row.review_status || row.why, 'Not reviewed'))}</div>` },
    { label: 'Issue', render: (row) => { const value = outcomeFor(row); return pill(value.label, value.tone); } },
    { label: 'Clients', number: true, render: (row) => formatNumber(row.distinct_clients ?? row.estimated_unique_clients) },
    { label: 'Attempts', number: true, render: (row) => formatNumber(row.attempt_count) },
  ], rows, 'No unresolved search gaps match these filters.');
}

function renderIconRequests() {
  const element = $('iconRequests');
  if (!element) return;
  const inbox = availability(state.data.search?.icon_requests, 'Icon requests are not available from the current data source.');
  $('requestBadge').textContent = formatNumber(inbox.rows.length);
  $('requestBadge').hidden = inbox.rows.length === 0;
  if (!inbox.available) {
    element.innerHTML = emptyState(inbox.reason);
    return;
  }
  element.innerHTML = table([
    { label: 'Request', render: (row) => `<strong>${escapeHtml(safeText(row.request_text || row.evidence_text))}</strong>` },
    { label: 'Submitter', render: (row) => visitorLabel(row) },
    { label: 'Country', render: (row) => pill(safeText(row.country_code || row.country, 'Unknown')) },
    { label: 'Submitted', render: (row) => escapeHtml(formatDate(row.created_at, true)) },
  ], inbox.rows, 'No icon requests have been submitted in this period.');
}

function renderContactInbox() {
  const element = $('contactInbox');
  if (!element) return;
  const inbox = availability(state.data.search?.contact_submissions, 'Stored contact submissions are not available from the current data source.');
  if (!inbox.available) {
    element.innerHTML = emptyState(inbox.reason);
    return;
  }
  element.innerHTML = table([
    { label: 'From', render: (row) => `<strong>${escapeHtml(safeText(row.name, 'No name'))}</strong><div class="activity-meta">${escapeHtml(truncate(row.email, 34))}</div>` },
    { label: 'Interest', render: (row) => pill(safeText(row.interest, 'General')) },
    { label: 'Message', render: (row) => escapeHtml(truncate(row.message, 90)) },
    { label: 'Received', render: (row) => escapeHtml(formatDate(row.created_at, true)) },
  ], inbox.rows, 'No contact submissions have been stored yet.');
}

function renderDiagnostics() {
  const element = $('diagnosticsContent');
  if (!element) return;
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

function renderAudience() {
  const data = state.data.audience;
  if (!data && state.loading.has('audience')) return;
  const funnel = data?.funnel || {};
  const clients = number(funnel.unique_clients);
  const registered = number(funnel.registered_clients);
  const pro = number(funnel.pro_clients);
  if (funnel.identity_available === false) {
    const reason = funnel.identity_unavailable_reason || 'Choose a shorter date range for exact client counts.';
    setSkeleton($('funnelClients'), 'Unavailable');
    $('funnelClientsNote').textContent = reason;
    setSkeleton($('funnelRegistered'), 'Unavailable');
    $('funnelRegisteredNote').textContent = reason;
    setSkeleton($('funnelPro'), 'Unavailable');
    $('funnelProNote').textContent = reason;
  } else {
    setSkeleton($('funnelClients'), formatNumber(clients));
    $('funnelClientsNote').textContent = appliedWindowLabel();
    setSkeleton($('funnelRegistered'), formatNumber(registered));
    $('funnelRegisteredNote').textContent = `${formatPercent(funnel.registered_percentage ?? (clients ? registered / clients : 0))} of clients`;
    setSkeleton($('funnelPro'), formatNumber(pro));
    $('funnelProNote').textContent = `${formatPercent(funnel.pro_percentage ?? (clients ? pro / clients : 0))} of clients`;
  }
  const mrr = funnel.mrr || {};
  $('funnelMrr').textContent = mrr.available ? safeText(mrr.display_value) : 'Unavailable';
  $('funnelMrrNote').textContent = mrr.reason || 'Exact billing price is not linked to every active subscription.';
  renderLineChart(
    $('audienceChart'),
    data?.series,
    [
      { field: 'registered_clients', label: 'Registered', color: CHART_COLORS[1] },
      { field: 'pro_clients', label: 'Pro', color: CHART_COLORS[2] },
    ],
    { label: 'Registered and Pro clients over time', emptyReason: 'Audience history will appear after the v2 summary endpoint is live.' },
  );

  const users = availability(data?.registered_users, 'Registered-user enrichment is not available from the current data source.');
  $('registeredUsers').innerHTML = users.available
    ? table([
      { label: 'User', render: (row) => `<strong>${escapeHtml(safeText(row.identifier, 'Hidden'))}</strong><div class="activity-meta">${escapeHtml(safeText(row.provider, 'Unknown provider'))}</div>` },
      { label: 'Plan', render: (row) => pill(safeText(row.plan, 'Free'), String(row.plan || '').toLowerCase().includes('pro') ? 'pro' : '') },
      { label: 'Signed up', render: (row) => escapeHtml(formatDate(row.signup_at || row.created_at)) },
      { label: 'Last active', render: (row) => escapeHtml(formatDate(row.last_active || row.last_sign_in_at, true)) },
      { label: 'Searches', number: true, render: (row) => formatNumber(row.searches) },
      { label: 'Venues', render: (row) => escapeHtml(normalizeList(row.venues).map(channelLabel).join(', ') || '-') },
      { label: 'Country', render: (row) => pill(safeText(row.country_code || row.country, 'Unknown')) },
    ], users.rows, 'No registered users match these filters.')
    : emptyState(users.reason);

  const allClients = availability(data?.clients, 'Client profiles are not available from the current data source.');
  $('allClients').innerHTML = allClients.available
    ? table([
      { label: 'Client', render: (row) => visitorLabel(row) },
      { label: 'Plan', render: (row) => pill(safeText(row.plan, 'Free'), String(row.plan || '').toLowerCase().includes('pro') ? 'pro' : '') },
      { label: 'Country', render: (row) => pill(safeText(row.country_code || row.country, 'Unknown')) },
      { label: 'First seen', render: (row) => escapeHtml(formatDate(row.first_seen, true)) },
      { label: 'Last seen', render: (row) => escapeHtml(formatDate(row.last_seen, true)) },
      { label: 'Searches', number: true, render: (row) => formatNumber(row.searches) },
      { label: 'Top query', render: (row) => escapeHtml(truncate(row.top_query, 34)) },
    ], allClients.rows, 'No clients match these filters.')
    : emptyState(allClients.reason);
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

async function fetchEndpoint(endpoint) {
  try {
    return await apiRequest(endpointPath(endpoint));
  } catch (error) {
    if (error.status !== 404) throw error;
    return legacyEndpoint(endpoint);
  }
}

async function loadEndpoint(endpoint, token, { force = false } = {}) {
  const cached = force ? null : readCache(endpoint);
  if (cached?.payload) {
    state.data[endpoint] = cached.payload;
    renderAll();
    if (Date.now() - cached.savedAt < CACHE_TTL_MS) return cached.payload;
  }

  state.loading.add(endpoint);
  delete state.errors[endpoint];
  setRefreshState();
  try {
    const payload = await fetchEndpoint(endpoint);
    if (token !== state.requestToken) return null;
    state.data[endpoint] = payload;
    writeCache(endpoint, payload);
    return payload;
  } catch (error) {
    if (token === state.requestToken) {
      state.errors[endpoint] = error.message || `Could not load ${endpoint}.`;
      if (!state.data[endpoint]) state.data[endpoint] = null;
    }
    return null;
  } finally {
    if (token === state.requestToken) {
      state.loading.delete(endpoint);
      renderAll();
    }
  }
}

async function refreshDashboard({ force = false } = {}) {
  const token = state.requestToken + 1;
  state.requestToken = token;
  state.refreshStartedAt = Date.now();
  if (force) clearDashboardCache();
  await loadEndpoint('activity', token, { force });
  await Promise.all([
    loadEndpoint('overview', token, { force }),
    loadEndpoint('search', token, { force }),
    loadEndpoint('audience', token, { force }),
  ]);
  if (token !== state.requestToken) return;
  state.refreshedAt = Date.now();
  setRefreshState();
  if (force && Object.keys(state.errors).length === 0) showToast('Production data refreshed.');
}

let filterTimer = null;
function scheduleRefresh(delay = 240) {
  window.clearTimeout(filterTimer);
  filterTimer = window.setTimeout(() => refreshDashboard({ force: true }), delay);
}

function exportData(key) {
  const overview = state.data.overview || {};
  const search = state.data.search || {};
  const audience = state.data.audience || {};
  const mapping = {
    'series-searches': chartRows(overview.series),
    'series-clients': aggregateDays(overview.series, ['client_days']),
    'series-quality': qualitySeries(overview.series),
    'top-list-csv': unwrapRows(overview.top_lists?.[state.topList]),
    'top-list-json': unwrapRows(overview.top_lists?.[state.topList]),
    geography: unwrapRows(overview.geography),
    activity: normalizeList(state.data.activity?.activity),
    'queries-csv': normalizeList(search.queries),
    'queries-json': normalizeList(search.queries),
    'registered-users': unwrapRows(audience.registered_users),
    clients: unwrapRows(audience.clients),
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

function initializeEvents() {
  document.querySelectorAll('.nav-button').forEach((button) => {
    button.addEventListener('click', () => setSection(button.dataset.section));
  });
  document.querySelectorAll('[data-top-list]').forEach((button) => {
    button.addEventListener('click', () => {
      state.topList = button.dataset.topList;
      renderTopList();
    });
  });
  document.querySelectorAll('[data-export]').forEach((button) => {
    button.addEventListener('click', () => exportData(button.dataset.export));
  });
  $('periodButtons')?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-window]');
    if (!button) return;
    state.filters.window = button.dataset.window;
    document.querySelectorAll('[data-window]').forEach((candidate) => {
      candidate.classList.toggle('active', candidate === button);
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
    scheduleRefresh(0);
  });
  $('channelFilter')?.addEventListener('change', (event) => {
    state.filters.channel = event.target.value;
    scheduleRefresh(0);
  });
  $('includeTestTraffic')?.addEventListener('change', (event) => {
    state.filters.includeTest = event.target.checked;
    scheduleRefresh(0);
  });
  $('globalSearch')?.addEventListener('input', (event) => {
    state.filters.q = String(event.target.value || '').trim();
    scheduleRefresh();
  });
  $('explorerSearch')?.addEventListener('input', (event) => {
    state.explorerQuery = String(event.target.value || '').trim();
    scheduleRefresh();
  });
  $('explorerIssue')?.addEventListener('change', (event) => {
    state.explorerIssue = event.target.value;
    scheduleRefresh(0);
  });
  $('refreshButton')?.addEventListener('click', () => refreshDashboard({ force: true }));
  $('adminSecretForm')?.addEventListener('submit', submitAdminSecret);
  $('adminSecretCancelBtn')?.addEventListener('click', cancelAdminSecret);
}

async function initializeDashboard() {
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
