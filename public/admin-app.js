const ADMIN_API_BASE = 'https://kcjmkakdhsqplvasgkjv.supabase.co/functions/v1/admin-api';
const ADMIN_SECRET_STORAGE_KEY = 'si_admin_secret';

const state = {
  stats: null,
  users: [],
  usersPagination: { page: 1, page_count: 1, total: 0, page_size: 25 },
  usersFilters: { q: '', plan: '', status: '', provider: '' },
  auditLog: [],
  auditPagination: { page: 1, page_count: 1, total: 0, page_size: 25 },
  auditFilters: { q: '', action: '' },
  selectedUser: null,
  toastTimer: null,
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
  window.sessionStorage.setItem(ADMIN_SECRET_STORAGE_KEY, secret);
}

function promptForAdminSecret(force = false) {
  const existing = getAdminSecret();
  if (existing && !force) return existing;
  const value = window.prompt('Enter ADMIN_SECRET for the Supericons admin API');
  if (!value) return '';
  setAdminSecret(value.trim());
  return getAdminSecret();
}

async function apiRequest(path, options = {}, retry = true) {
  const secret = getAdminSecret() || promptForAdminSecret();
  if (!secret) {
    throw new Error('Admin secret is required.');
  }

  const response = await fetch(`${ADMIN_API_BASE}${path}`, {
    ...options,
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
    promptForAdminSecret(true);
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
  $('statsTotalUsersValue').textContent = stats.total_users;
  $('statsActiveProValue').textContent = stats.active_pro;
  $('statsTotalPurchasesValue').textContent = stats.total_purchases;
  $('statsNewUsersValue').textContent = stats.new_users_30d;
  $('navUsersCount').textContent = stats.total_users;

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
}

async function refreshAll() {
  await Promise.all([loadStats(), loadUsers(), loadAudit()]);
}

function bindGlobalEvents() {
  $('statsRefreshBtn').addEventListener('click', () => {
    refreshAll().then(() => showToast('Admin data refreshed')).catch((error) => showToast(error.message, 'error'));
  });
  $('adminReconnectBtn').addEventListener('click', () => {
    promptForAdminSecret(true);
    refreshAll().then(() => showToast('Admin secret updated')).catch((error) => showToast(error.message, 'error'));
  });
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
    promptForAdminSecret();
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
