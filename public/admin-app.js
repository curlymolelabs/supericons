const ADMIN_API_BASE = 'https://kcjmkakdhsqplvasgkjv.supabase.co/functions/v1/admin-api';
const ADMIN_SECRET_STORAGE_KEY = 'si_admin_secret';
const INTELLIGENCE_WINDOWS = [
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
const ACTIVE_QUERY_REVIEW_STATUSES = new Set(['needs_alias', 'needs_icon']);

const state = {
  stats: null,
  intelligenceOverview: null,
  intelligenceEvidence: [],
  intelligenceMetadataCoverage: 0,
  searchIntelligence: null,
  selectedQueryReview: null,
  queryReviewSaving: false,
  showReviewedQueries: false,
  intelligenceWindow: '30d',
  intelligenceFilters: { q: '', signal_type: '' },
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
    throw new Error(payload.error || `Request failed (${response.status})`);
  }

  return payload;
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
  let html = `
    <button class="page-btn" type="button" onclick="${onClickName}(${Math.max(1, pagination.page - 1)})">
      <span class="material-symbols-outlined">chevron_left</span>
    </button>
  `;
  for (let page = 1; page <= pagination.page_count; page += 1) {
    html += `<button class="page-btn ${page === pagination.page ? 'active' : ''}" type="button" onclick="${onClickName}(${page})">${page}</button>`;
  }
  html += `
    <button class="page-btn" type="button" onclick="${onClickName}(${Math.min(pagination.page_count, pagination.page + 1)})">
      <span class="material-symbols-outlined">chevron_right</span>
    </button>
  `;
  container.innerHTML = html;
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
  return INTELLIGENCE_WINDOWS.find((window) => window.key === state.intelligenceWindow) || INTELLIGENCE_WINDOWS[1];
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
  state.selectedQueryReview = {
    query: entry.query,
    library_filter: normalizeReviewLibraryFilter(entry.library_filter),
    job_category: normalizeReviewJobCategory(entry.job_category),
    status: normalizeSearchContextValue(entry.review_status),
    note: entry.review_note || '',
  };
  renderQueryReviewPanel();
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
  return entry?.evidence_text || '-';
}

function setIntelligenceWindowCopy() {
  const window = getCurrentIntelligenceWindow();
  $('intelligenceTotalEvidenceLabel').textContent = formatMetricWindowLabel('Evidence Rows');
  $('intelligenceCopyEventsLabel').textContent = formatMetricWindowLabel('Copy Events');
  $('intelligenceMcpBatchesLabel').textContent = formatMetricWindowLabel('MCP Batches');
  $('intelligenceKitDownloadsLabel').textContent = formatMetricWindowLabel('Kit Downloads');
  $('searchIntelUniqueQueriesLabel').textContent = formatMetricWindowLabel('Unique Queries');
  $('searchIntelSearchAttemptsLabel').textContent = formatMetricWindowLabel('Search Attempts');
  $('searchIntelZeroResultQueriesLabel').textContent = formatMetricWindowLabel('Zero-Result Queries');
  $('searchIntelLowResultQueriesLabel').textContent = formatMetricWindowLabel('Low-Result Queries');

  $('intelligenceTotalEvidenceDelta').textContent = `Raw signals captured in ${window.longLabel.toLowerCase()}`;
  $('intelligenceCopyEventsDelta').textContent = `Selection pressure in ${window.longLabel.toLowerCase()}`;
  $('intelligenceMcpBatchesDelta').textContent = `Agent search sessions logged in ${window.longLabel.toLowerCase()}`;
  $('intelligenceKitDownloadsDelta').textContent = `Collection pulls routed through Supericons in ${window.longLabel.toLowerCase()}`;
  $('searchIntelUniqueQueriesDelta').textContent = `Distinct search queries with captured evidence in ${window.longLabel.toLowerCase()}`;
  $('searchIntelSearchAttemptsDelta').textContent = `Settled searches captured in ${window.longLabel.toLowerCase()}`;
  $('searchIntelZeroResultQueriesDelta').textContent = `Distinct queries that returned no results in ${window.longLabel.toLowerCase()}`;
  $('searchIntelLowResultQueriesDelta').textContent = `Distinct queries with 1-3 results in ${window.longLabel.toLowerCase()}`;
}

function renderIntelligenceRows(containerId, rows, renderValue) {
  const container = $(containerId);
  if (!container) return;
  container.innerHTML = rows.length
    ? rows.map((row) => `
        <div class="stats-row">
          <span>${escapeHtml(row.label)}</span>
          <span class="stats-row__val">${renderValue(row)}</span>
        </div>
      `).join('')
    : emptyState('bubble_chart', 'No evidence yet');
}

function renderReviewableQueryRows(containerId, rows, renderValue, emptyLabel = 'No evidence yet') {
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
    lead.textContent = 'Save one simple decision so this query does not need to be re-triaged from scratch next week.';
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
    showToast('Query review saved');

    loadSearchIntelligence().catch((error) => {
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
  const window = getCurrentIntelligenceWindow();
  const queueSummary = summarizeQueryReviewQueue(getReviewableQueryEntries());
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
      copy_count: entry.copy_count,
      favorite_count: entry.favorite_count,
    })),
    (row) => `${escapeHtml(String(row.total_signals || 0))} signals - ${escapeHtml(String(row.copy_count || 0))} copy - ${escapeHtml(String(row.favorite_count || 0))} save`
  );

  renderIntelligenceRows(
    'searchIntelTopMcpQueries',
    (state.searchIntelligence?.top_mcp_queries || []).map((entry) => ({
      label: entry.query,
      batch_count: entry.batch_count,
      result_rows: entry.result_rows,
      converged_batches: entry.converged_batches,
    })),
    (row) => `${escapeHtml(String(row.batch_count || 0))} batches - ${escapeHtml(String(row.result_rows || 0))} results - ${escapeHtml(String(row.converged_batches || 0))} converged`
  );

  renderReviewableQueryRows(
    'searchIntelZeroResultQueries',
    (state.searchIntelligence?.top_zero_result_queries || []).map((entry) => ({
      query: entry.query,
      label: formatSearchContextLabel(entry.query, entry.library_filter, entry.job_category),
      library_filter: entry.library_filter,
      job_category: entry.job_category,
      review_status: entry.review_status,
      attempt_count: entry.attempt_count,
      zero_attempt_count: entry.zero_attempt_count,
    })),
    (row) => `${escapeHtml(String(row.zero_attempt_count || 0))} zero-result attempts - ${escapeHtml(String(row.attempt_count || 0))} total attempts`,
    state.showReviewedQueries ? 'No zero-result evidence yet' : 'No active zero-result queries'
  );

  renderReviewableQueryRows(
    'searchIntelLowResultQueries',
    (state.searchIntelligence?.top_low_result_queries || []).map((entry) => ({
      query: entry.query,
      label: formatSearchContextLabel(entry.query, entry.library_filter, entry.job_category),
      library_filter: entry.library_filter,
      job_category: entry.job_category,
      review_status: entry.review_status,
      low_attempt_count: entry.low_attempt_count,
      average_result_count: entry.average_result_count,
      minimum_result_count: entry.minimum_result_count,
    })),
    (row) => `${escapeHtml(String(row.low_attempt_count || 0))} low-result attempts - avg ${escapeHtml(formatAverageResultCount(row.average_result_count))} results - min ${escapeHtml(String(row.minimum_result_count ?? '-'))}`,
    state.showReviewedQueries ? 'No low-result evidence yet' : 'No active low-result queries'
  );

  renderReviewableQueryRows(
    'searchIntelReplacementQueries',
    (state.searchIntelligence?.top_replacement_queries || []).map((entry) => ({
      query: entry.query,
      label: entry.query,
      library_filter: entry.library_filter,
      job_category: entry.job_category,
      review_status: entry.review_status,
      replace_count: entry.replace_count,
      unique_replacements: entry.unique_replacements,
    })),
    (row) => `${escapeHtml(String(row.replace_count || 0))} replacements - ${escapeHtml(String(row.unique_replacements || 0))} alternate picks`,
    state.showReviewedQueries ? 'No replacement-heavy evidence yet' : 'No active replacement-heavy queries'
  );

  $('searchIntelNotes').innerHTML = `
    <div class="stats-row">
      <span>Current window</span>
      <span class="stats-row__val">${escapeHtml(window.shortLabel)}</span>
    </div>
    <div class="stats-row">
      <span>Current coverage</span>
      <span class="stats-row__val">${summary.search_attempts > 0 ? 'Search attempts + outcomes' : 'Search outcomes only'}</span>
    </div>
    <div class="stats-row">
      <span>Zero-result tracking</span>
      <span class="stats-row__val">${summary.zero_result_tracking_available ? 'Active' : 'Requires explicit search-attempt logging'}</span>
    </div>
    <div class="stats-row">
      <span>Blank purpose</span>
      <span class="stats-row__val">Unclassified icon or no purpose filter active</span>
    </div>
    <div class="stats-row">
      <span>Query signals</span>
      <span class="stats-row__val">${escapeHtml(String(summary.site_query_signals || 0))}</span>
    </div>
    <div class="stats-row">
      <span>MCP query batches</span>
      <span class="stats-row__val">${escapeHtml(String(summary.mcp_query_batches || 0))}</span>
    </div>
    <div class="stats-row">
      <span>Best current use</span>
      <span class="stats-row__val">${summary.search_attempts > 0 ? 'Find zero-result gaps, weak-result queries, and replacement pressure' : 'Find high-value queries and replacement pressure'}</span>
    </div>
    <div class="stats-row">
      <span>Query reviews</span>
      <span class="stats-row__val">${summary.query_review_feature_available ? 'Saved statuses active' : 'Apply icon_query_reviews migration'}</span>
    </div>
    <div class="stats-row">
      <span>Queue mode</span>
      <span class="stats-row__val">${state.showReviewedQueries ? 'All queries including reviewed' : 'Active queue only'}</span>
    </div>
  `;

  renderQueryReviewPanel();
}

function renderIntelligence() {
  const overview = state.intelligenceOverview || {};
  setIntelligenceWindowCopy();
  $('intelligenceTotalEvidenceValue').textContent = overview.total_evidence_rows || 0;
  $('intelligenceCopyEventsValue').textContent = overview.copy_events || 0;
  $('intelligenceMcpBatchesValue').textContent = overview.mcp_batches || 0;
  $('intelligenceKitDownloadsValue').textContent = overview.kit_downloads || 0;

  $('intelligenceKeySignals').innerHTML = `
    <div class="stats-row">
      <span>Explicit saves</span>
      <span class="stats-row__val">${escapeHtml(String(overview.favorite_events || 0))}</span>
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
    (row) => `${escapeHtml(String(row.copy_count || 0))} copies - ${escapeHtml(String(row.download_count || 0))} downloads - ${escapeHtml(String(row.favorite_count || 0))} saves - score ${escapeHtml(String(row.popularity_score || 0))}`
  );

  renderIntelligenceRows(
    'intelligenceTopCategories',
    (overview.top_job_categories || []).map((entry) => ({
      label: formatPurposeLabel(entry.job_category),
      count: entry.count,
    })),
    (row) => escapeHtml(String(row.count || 0))
  );

  renderIntelligenceRows(
    'intelligenceTopReplaced',
    (overview.top_replaced_icons || []).map((entry) => ({
      label: entry.icon_id,
      replace_count: entry.replace_count,
    })),
    (row) => escapeHtml(String(row.replace_count || 0))
  );

  renderSearchIntelligence();

  const tbody = $('intelligenceEvidenceBody');
  if (!tbody) return;
  if (!state.intelligenceEvidence.length) {
    tbody.innerHTML = `<tr><td colspan="7">${emptyState('hub', 'No evidence events matched these filters')}</td></tr>`;
    return;
  }

  tbody.innerHTML = state.intelligenceEvidence.map((entry) => `
    <tr>
      <td style="color:var(--si-text-dim);font-size:0.72rem;white-space:nowrap">${escapeHtml(formatDateTime(entry.created_at))}</td>
      <td><span class="action-chip ${actionChipClass(entry.signal_type || 'copy')}">${escapeHtml(entry.signal_type || '-')}</span></td>
      <td><span class="truncate-mono">${escapeHtml(entry.icon_id || '-')}</span></td>
      <td>${escapeHtml(entry.search_query || '-')}</td>
      <td>${escapeHtml(formatPurposeLabel(entry.job_category))}</td>
      <td>${escapeHtml(entry.ui_surface || '-')}</td>
      <td style="font-family:var(--si-font-label);font-size:0.75rem;color:var(--si-text-dim)">${escapeHtml(formatEvidenceNote(entry))}</td>
    </tr>
  `).join('');
}

async function loadIntelligenceOverview() {
  const payload = await apiRequest(`/intelligence/overview?window=${encodeURIComponent(state.intelligenceWindow)}`);
  state.intelligenceOverview = payload.overview || {};
  state.intelligenceMetadataCoverage = payload.metadata_coverage?.classified_icons || 0;
  renderIntelligence();
}

async function loadSearchIntelligence() {
  const payload = await apiRequest(`/intelligence/search?window=${encodeURIComponent(state.intelligenceWindow)}`);
  state.searchIntelligence = payload.search_intelligence || null;
  renderIntelligence();
}

async function loadIntelligenceEvidence() {
  const params = new URLSearchParams();
  params.set('window', state.intelligenceWindow);
  if (state.intelligenceFilters.q) params.set('q', state.intelligenceFilters.q);
  if (state.intelligenceFilters.signal_type) params.set('signal_type', state.intelligenceFilters.signal_type);
  params.set('limit', '50');
  const payload = await apiRequest(`/intelligence/evidence?${params.toString()}`);
  state.intelligenceEvidence = payload.evidence || [];
  renderIntelligence();
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
      loadIntelligenceEvidence().catch((error) => showToast(error.message, 'error'));
    }, 200);
  });

  $('intelligenceSignalFilter').addEventListener('change', (event) => {
    state.intelligenceFilters.signal_type = event.target.value;
    loadIntelligenceEvidence().catch((error) => showToast(error.message, 'error'));
  });

  $('intelligenceWindowFilter').addEventListener('change', (event) => {
    state.intelligenceWindow = event.target.value;
    Promise.all([loadIntelligenceOverview(), loadSearchIntelligence(), loadIntelligenceEvidence()])
      .catch((error) => showToast(error.message, 'error'));
  });
}

async function refreshAll() {
  await Promise.all([
    loadStats(),
    loadIntelligenceOverview(),
    loadSearchIntelligence(),
    loadIntelligenceEvidence(),
    loadUsers(),
    loadAudit(),
  ]);
}

function bindGlobalEvents() {
  ['searchIntelZeroResultQueries', 'searchIntelLowResultQueries', 'searchIntelReplacementQueries'].forEach((containerId) => {
    $(containerId)?.addEventListener('click', (event) => {
      const trigger = event.target instanceof Element
        ? event.target.closest('[data-review-query]')
        : null;
      if (!trigger) return;
      openQueryReview(
        trigger.dataset.reviewQuery || '',
        trigger.dataset.reviewLibraryFilter || 'all',
        trigger.dataset.reviewJobCategory || '',
      );
    });
  });

  $('queryReviewStatus')?.addEventListener('change', (event) => {
    if (!state.selectedQueryReview) return;
    state.selectedQueryReview.status = normalizeSearchContextValue(event.target.value);
    renderQueryReviewPanel();
  });

  $('queryReviewNote')?.addEventListener('input', (event) => {
    if (!state.selectedQueryReview) return;
    state.selectedQueryReview.note = event.target.value;
  });

  $('queryReviewForm')?.addEventListener('submit', (event) => {
    event.preventDefault();
    saveQueryReview().catch((error) => showToast(error.message, 'error'));
  });

  $('queryReviewClearBtn')?.addEventListener('click', (event) => {
    event.preventDefault();
    clearQueryReviewSelection();
  });

  $('queryReviewShowReviewed')?.addEventListener('change', (event) => {
    state.showReviewedQueries = event.target.checked;
    renderSearchIntelligence();
  });

  $('statsRefreshBtn').addEventListener('click', () => {
    refreshAll().then(() => showToast('Admin data refreshed')).catch((error) => showToast(error.message, 'error'));
  });
  $('intelligenceRefreshBtn').addEventListener('click', () => {
    Promise.all([loadIntelligenceOverview(), loadSearchIntelligence(), loadIntelligenceEvidence()])
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
  $('topbarEnvironment').textContent = window.location.hostname === 'localhost' ? 'Local shell' : 'Production';
}

async function init() {
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
window.switchTab = switchTab;
window.openModal = openModal;
window.closeModal = closeModal;
window.checkConfirm = checkConfirm;
window.changeUsersPage = changeUsersPage;
window.changeAuditPage = changeAuditPage;

init();
