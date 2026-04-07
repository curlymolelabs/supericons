/**
 * Supericons Auth Module
 * Handles Supabase Auth: sign in, sign up, sign out, Google OAuth, session management.
 */

// Supabase client (loaded via CDN in index.html)
const SUPABASE_URL = 'https://kcjmkakdhsqplvasgkjv.supabase.co';
const SUPABASE_ANON = 'sb_publishable_slbcWcnrQ45rkJPONFD7pw_hW0WpvBi';

let supabase = null;
let currentUser = null;
let subscriptionStatus = null; // null | 'active' | 'canceled' | 'past_due'
let cachedClaimStatus = null;
let claimStatusRequest = null;
let authEpoch = 0;
let authReadyPromise = Promise.resolve();
let resolveAuthReady = null;
let authModalState = null;
let authToastTimeout = null;
const CLAIM_STATUS_REASONS = new Set([
  'legacy_credit',
  'cooldown_ready',
  'cooldown_wait',
  'subscription_required',
  'all_owned',
]);
const DEFAULT_CLAIM_STATUS = Object.freeze({
  canClaim: false,
  nextAvailable: null,
  reason: 'subscription_required',
});
const AUTH_INTENT_STORAGE_KEY = 'si-auth-intent';
const AUTH_INTENT_TTL_MS = 1000 * 60 * 60 * 6;
const AUTH_MODAL_DEFAULT_STATE = Object.freeze({
  mode: 'signin',
  context: 'default',
  stage: 'form',
  verifyEmail: '',
  recoveryEmail: '',
});
const AUTH_MODAL_COPY = {
  default: {
    signin: {
      title: 'Sign in to Supericons',
      desc: 'Access animated icon packs, manage purchases, and unlock Pro features.',
      note: 'Free account. No card required for free icons.',
      submit: 'Sign in',
      toggle: 'Don\'t have an account?',
      toggleAction: 'Sign up',
    },
    signup: {
      title: 'Create your Supericons account',
      desc: 'Save purchases, sync downloads, and unlock Pro features from one account.',
      note: 'Free account. No card required for free icons.',
      submit: 'Create account',
      toggle: 'Already have an account?',
      toggleAction: 'Sign in',
    },
  },
  purchase: {
    signin: {
      title: 'Sign in to continue your purchase',
      desc: 'Keep collection purchases tied to one account so downloads and updates stay in sync.',
      note: 'We\'ll bring you back so you can continue where you left off.',
      submit: 'Sign in to continue',
      toggle: 'Need an account first?',
      toggleAction: 'Sign up',
    },
    signup: {
      title: 'Create your account to buy collections',
      desc: 'Your purchases, downloads, and future updates will stay connected to this account.',
      note: 'We\'ll bring you back so you can continue where you left off.',
      submit: 'Create account',
      toggle: 'Already have an account?',
      toggleAction: 'Sign in',
    },
  },
  subscribe: {
    signin: {
      title: 'Sign in to go Pro',
      desc: 'Continue to Pro checkout for MCP access, workflow tools, and premium collections.',
      note: 'We\'ll bring you back so you can continue to checkout.',
      submit: 'Sign in to continue',
      toggle: 'Need an account first?',
      toggleAction: 'Sign up',
    },
    signup: {
      title: 'Create your account to go Pro',
      desc: 'Set up your account first, then continue to Pro checkout when you\'re ready.',
      note: 'We\'ll bring you back so you can continue to checkout.',
      submit: 'Create account',
      toggle: 'Already have an account?',
      toggleAction: 'Sign in',
    },
  },
  pro: {
    signin: {
      title: 'Sign in to unlock Pro tools',
      desc: 'Use Motion Lab exports, Converter downloads, and premium MCP access from one account.',
      note: 'Free account first. Upgrade only when you want Pro features.',
      submit: 'Sign in to continue',
      toggle: 'Need an account first?',
      toggleAction: 'Sign up',
    },
    signup: {
      title: 'Create your account to unlock Pro tools',
      desc: 'Save your workspace and keep premium tools connected to one account.',
      note: 'Free account first. Upgrade only when you want Pro features.',
      submit: 'Create account',
      toggle: 'Already have an account?',
      toggleAction: 'Sign in',
    },
  },
};
authModalState = { ...AUTH_MODAL_DEFAULT_STATE };

function createAuthReadyPromise() {
  let settled = false;
  authReadyPromise = new Promise(resolve => {
    resolveAuthReady = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
  });
}

function resolveCurrentAuthReady() {
  if (typeof resolveAuthReady === 'function') {
    const resolve = resolveAuthReady;
    resolveAuthReady = null;
    resolve();
  }
}

function beginAuthCycle({ resolved = false } = {}) {
  // Resolve the previous cycle so waiters can re-check the current epoch.
  resolveCurrentAuthReady();
  authEpoch += 1;
  createAuthReadyPromise();
  if (resolved) resolveCurrentAuthReady();
  return authEpoch;
}

function resetProState() {
  subscriptionStatus = null;
  cachedClaimStatus = null;
  claimStatusRequest = null;
  updateProBadge();
}

function dispatchAuthSignedIn() {
  window.dispatchEvent(new CustomEvent('supericons:auth-signed-in', {
    detail: {
      userId: currentUser?.id ?? null,
    },
  }));
}

// ── Init ──────────────────────────────────────────────────────
export function initAuth() {
  if (!window.supabase) {
    console.warn('[Auth] Supabase JS not loaded');
    return;
  }
  supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
  const bootEpoch = beginAuthCycle();

  // Listen for auth state changes
  supabase.auth.onAuthStateChange((event, session) => {
    currentUser = session?.user ?? null;
    updateAuthUI();

    if (event === 'PASSWORD_RECOVERY') {
      clearAuthCallbackHash();
      const recoveryEpoch = beginAuthCycle();
      void fetchSubscriptionForEpoch(recoveryEpoch);
      showPasswordResetStage(session?.user?.email || '');
    } else if (event === 'SIGNED_IN') {
      clearAuthCallbackHash();
      closeAuthModal({ preserveIntent: true, resetToDefault: true });
      showToast('Signed in successfully');
      const signInEpoch = beginAuthCycle();
      void fetchSubscriptionForEpoch(signInEpoch);
      dispatchAuthSignedIn();
    } else if (event === 'SIGNED_OUT') {
      clearAuthIntent();
      showToast('Signed out');
      beginAuthCycle({ resolved: true });
      resetProState();
    }
  });

  // Check for existing session
  supabase.auth.getSession()
    .then(({ data: { session } }) => {
      if (bootEpoch !== authEpoch) return;
      currentUser = session?.user ?? null;
      updateAuthUI();
      if (!currentUser) {
        resetProState();
        resolveCurrentAuthReady();
        return;
      }
      void fetchSubscriptionForEpoch(bootEpoch);
    })
    .catch((err) => {
      if (bootEpoch !== authEpoch) return;
      console.warn('[Auth] Failed to get session:', err?.message || err);
      currentUser = null;
      updateAuthUI();
      resetProState();
      resolveCurrentAuthReady();
    });

  // Wire up UI
  wireAuthListeners();
}

// ── Sign In (email) ───────────────────────────────────────────
export async function signInWithEmail(email, password) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

// ── Sign Up (email) ───────────────────────────────────────────
export async function signUpWithEmail(email, password) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: window.location.origin,
    },
  });
  if (error) throw error;
  return data;
}

export async function requestPasswordReset(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin,
  });
  if (error) throw error;
}

export async function updateUserPassword(password) {
  const { data, error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
  return data;
}

export async function updateUserProfile({ displayName }) {
  const nextDisplayName = (displayName || '').trim();
  const nextMetadata = {
    ...(currentUser?.user_metadata || {}),
    full_name: nextDisplayName,
    name: nextDisplayName,
  };
  const { data, error } = await supabase.auth.updateUser({
    data: nextMetadata,
  });
  if (error) throw error;
  if (data?.user) {
    currentUser = data.user;
  } else if (currentUser) {
    currentUser = {
      ...currentUser,
      user_metadata: nextMetadata,
    };
  }
  updateAuthUI();
  return data;
}

// ── Google OAuth ──────────────────────────────────────────────
export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
    },
  });
  if (error) throw error;
}

// ── Sign Out ──────────────────────────────────────────────────
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// ── Helpers ───────────────────────────────────────────────────
export function getUser() {
  return currentUser;
}

export function getSupabase() {
  return supabase;
}

export function isLoggedIn() {
  return currentUser !== null;
}

export function isPro() {
  return subscriptionStatus === 'active';
}

export function getClaimStatus() {
  return cachedClaimStatus;
}

export function invalidateClaimStatus() {
  cachedClaimStatus = null;
  claimStatusRequest = null;
}

export async function waitForAuth() {
  while (true) {
    const observedEpoch = authEpoch;
    const observedPromise = authReadyPromise;
    await observedPromise;
    if (observedEpoch === authEpoch) return;
  }
}

// ── Subscription Status ───────────────────────────────────────
async function fetchSubscriptionForEpoch(epoch) {
  const userId = currentUser?.id;
  if (!userId || !supabase) {
    if (epoch !== authEpoch) return;
    resetProState();
    resolveCurrentAuthReady();
    return;
  }

  try {
    const { data, error } = await Promise.race([
      supabase
        .from('si_subscriptions')
        .select('status, current_period_end')
        .eq('user_id', userId)
        .single(),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Subscription lookup timed out')), 5000);
      }),
    ]);

    if (epoch !== authEpoch || currentUser?.id !== userId) return;

    if (error || !data) {
      subscriptionStatus = null;
    } else {
      // Check if period has expired
      const isExpired = data.current_period_end && new Date(data.current_period_end) < new Date();
      subscriptionStatus = (data.status === 'active' && !isExpired) ? 'active' : data.status;
    }

    updateProBadge();
    resolveCurrentAuthReady();

    cachedClaimStatus = subscriptionStatus === 'active'
      ? null
      : { ...DEFAULT_CLAIM_STATUS };
    claimStatusRequest = null;
    return;
  } catch (e) {
    if (epoch !== authEpoch || currentUser?.id !== userId) return;
    console.warn('[Auth] Failed to fetch subscription:', e.message);
    resetProState();
    resolveCurrentAuthReady();
    return;
  }
}

function normalizeClaimStatus(data) {
  const reason = CLAIM_STATUS_REASONS.has(data?.reason)
    ? data.reason
    : DEFAULT_CLAIM_STATUS.reason;
  return {
    canClaim: data?.canClaim === true,
    nextAvailable: typeof data?.nextAvailable === 'string' ? data.nextAvailable : null,
    reason,
  };
}

async function requestClaimStatusWithToken(token) {
  return fetch(`${SUPABASE_URL}/functions/v1/claim-status`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'apikey': SUPABASE_ANON,
    },
  });
}

export async function fetchClaimStatus({ force = false } = {}) {
  const userId = currentUser?.id;
  if (!userId || !supabase || subscriptionStatus !== 'active') {
    cachedClaimStatus = { ...DEFAULT_CLAIM_STATUS };
    claimStatusRequest = null;
    return cachedClaimStatus;
  }

  if (!force && cachedClaimStatus) return cachedClaimStatus;
  if (!force && claimStatusRequest) return claimStatusRequest;
  if (force) claimStatusRequest = null;

  claimStatusRequest = (async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        cachedClaimStatus = { ...DEFAULT_CLAIM_STATUS };
        return cachedClaimStatus;
      }

      let res = await requestClaimStatusWithToken(token);
      if (res.status === 401) {
        // Session can be stale right after sign-in/tab restore; refresh once and retry.
        await supabase.auth.refreshSession();
        const { data: { session: retrySession } } = await supabase.auth.getSession();
        const retryToken = retrySession?.access_token;
        if (retryToken) {
          res = await requestClaimStatusWithToken(retryToken);
        }
      }

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          cachedClaimStatus = { ...DEFAULT_CLAIM_STATUS };
          return cachedClaimStatus;
        }
        throw new Error(`Claim status request failed (${res.status})`);
      }

      const payload = await res.json().catch(() => ({}));
      if (currentUser?.id !== userId) return cachedClaimStatus;
      cachedClaimStatus = normalizeClaimStatus(payload);
      return cachedClaimStatus;
    } catch (e) {
      if (currentUser?.id !== userId) return cachedClaimStatus;
      console.warn('[Auth] Failed to fetch claim status:', e?.message || e);
      cachedClaimStatus = { ...DEFAULT_CLAIM_STATUS };
      return cachedClaimStatus;
    } finally {
      claimStatusRequest = null;
    }
  })();

  return claimStatusRequest;
}

function updateProBadge() {
  const proBadge = document.getElementById('proDropdownBadge');
  const manageLink = document.getElementById('authManageSubscription');
  if (proBadge) proBadge.style.display = subscriptionStatus === 'active' ? 'inline-flex' : 'none';
  if (manageLink) manageLink.style.display = subscriptionStatus === 'active' ? 'flex' : 'none';
}

// ── Customer Portal ───────────────────────────────────────────
export async function openCustomerPortal() {
  if (!supabase || !currentUser) return;
  showToast('Opening subscription portal...');
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    const res = await fetch(`${SUPABASE_URL}/functions/v1/create-portal`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'apikey': SUPABASE_ANON,
      },
      body: JSON.stringify({ return_url: window.location.href }),
    });
    if (!res.ok) throw new Error('Portal unavailable');
    const { url } = await res.json();
    if (url) window.location.href = url;
  } catch (err) {
    showToast(err.message || 'Could not open subscription portal');
    console.error('[Auth] Portal error:', err);
  }
}

function getUserInitial() {
  if (!currentUser) return '?';
  const name = currentUser.user_metadata?.full_name
    || currentUser.user_metadata?.name
    || currentUser.email
    || '?';
  return name.charAt(0).toUpperCase();
}

function getUserDisplayName() {
  if (!currentUser) return '';
  return currentUser.user_metadata?.full_name
    || currentUser.user_metadata?.name
    || currentUser.email?.split('@')[0]
    || '';
}

function getUserAvatarUrl() {
  if (!currentUser) return null;
  return currentUser.user_metadata?.avatar_url
    || currentUser.user_metadata?.picture
    || null;
}

// ── UI Updates ────────────────────────────────────────────────
function updateAuthUI() {
  const signInBtn = document.getElementById('authSignInBtn');
  const avatarBtn = document.getElementById('authAvatarBtn');
  const avatarInitial = document.getElementById('authAvatarInitial');
  const avatarImg = document.getElementById('authAvatarImg');
  const dropdownName = document.getElementById('authDropdownName');
  const dropdownEmail = document.getElementById('authDropdownEmail');
  const myDownloadsItem = document.getElementById('sidebarMyDownloads');

  if (currentUser) {
    // Logged in: show avatar, hide sign-in
    if (signInBtn) signInBtn.style.display = 'none';
    if (avatarBtn) avatarBtn.style.display = 'flex';

    const avatarUrl = getUserAvatarUrl();
    if (avatarUrl && avatarImg) {
      avatarImg.src = avatarUrl;
      avatarImg.style.display = 'block';
      if (avatarInitial) avatarInitial.style.display = 'none';
    } else {
      if (avatarImg) avatarImg.style.display = 'none';
      if (avatarInitial) {
        avatarInitial.textContent = getUserInitial();
        avatarInitial.style.display = 'flex';
      }
    }

    if (dropdownName) dropdownName.textContent = getUserDisplayName();
    if (dropdownEmail) dropdownEmail.textContent = currentUser.email || '';
    if (myDownloadsItem) myDownloadsItem.style.display = 'flex';
    renderAccountModal();
  } else {
    // Logged out: show sign-in, hide avatar
    if (signInBtn) signInBtn.style.display = 'flex';
    if (avatarBtn) avatarBtn.style.display = 'none';
    if (myDownloadsItem) myDownloadsItem.style.display = 'none';
    closeAccountModal({ resetState: true });
  }
}

function setAccountStatus(targetId, message = '', tone = '') {
  const statusEl = document.getElementById(targetId);
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.className = `auth-modal__status${tone ? ` ${tone}` : ''}`;
}

function renderAccountModal() {
  const summaryName = document.getElementById('accountSummaryName');
  const summaryEmail = document.getElementById('accountSummaryEmail');
  const displayNameInput = document.getElementById('accountDisplayName');
  const emailDisplayInput = document.getElementById('accountEmailDisplay');
  const avatarInitial = document.getElementById('accountAvatarInitial');
  const passwordBtn = document.getElementById('accountPasswordBtn');

  if (summaryName) summaryName.textContent = getUserDisplayName();
  if (summaryEmail) summaryEmail.textContent = currentUser?.email || '';
  if (displayNameInput) displayNameInput.value = getUserDisplayName();
  if (emailDisplayInput) emailDisplayInput.value = currentUser?.email || '';
  if (avatarInitial) avatarInitial.textContent = getUserInitial();
  if (passwordBtn) passwordBtn.disabled = !currentUser?.email;
}

function openAccountModal() {
  if (!currentUser) return;
  renderAccountModal();
  setAccountStatus('accountProfileStatus');
  setAccountStatus('accountPasswordStatus');
  document.getElementById('accountModal')?.classList.add('open');
  window.setTimeout(() => {
    document.getElementById('accountDisplayName')?.focus();
  }, 0);
}

function closeAccountModal({ resetState = false } = {}) {
  document.getElementById('accountModal')?.classList.remove('open');
  if (resetState) {
    setAccountStatus('accountProfileStatus');
    setAccountStatus('accountPasswordStatus');
  }
}

// ── Modal Logic ───────────────────────────────────────────────
function getAuthCopy(context = authModalState.context, mode = authModalState.mode) {
  const normalizedContext = AUTH_MODAL_COPY[context] ? context : 'default';
  const normalizedMode = mode === 'signup' ? 'signup' : 'signin';
  return AUTH_MODAL_COPY[normalizedContext][normalizedMode];
}

function readStoredAuthIntent() {
  try {
    const raw = window.localStorage.getItem(AUTH_INTENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      window.localStorage.removeItem(AUTH_INTENT_STORAGE_KEY);
      return null;
    }
    const createdAt = Number(parsed.createdAt || 0);
    if (!createdAt || (Date.now() - createdAt) > AUTH_INTENT_TTL_MS) {
      window.localStorage.removeItem(AUTH_INTENT_STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function setAuthIntent(intent) {
  if (!intent || typeof intent !== 'object') {
    clearAuthIntent();
    return;
  }

  try {
    window.localStorage.setItem(AUTH_INTENT_STORAGE_KEY, JSON.stringify({
      ...intent,
      createdAt: Date.now(),
    }));
  } catch {
    // Ignore storage failures and continue with modal UX only.
  }
}

export function clearAuthIntent() {
  try {
    window.localStorage.removeItem(AUTH_INTENT_STORAGE_KEY);
  } catch {
    // Ignore storage failures.
  }
}

export function consumeAuthIntent() {
  const intent = readStoredAuthIntent();
  clearAuthIntent();
  return intent;
}

function setAuthStatus(message = '', type = '') {
  const statusEl = document.getElementById('authStatus');
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.className = `auth-modal__status${type ? ` ${type}` : ''}`;
}

function resetAuthForm({ preserveEmail = false } = {}) {
  const form = document.getElementById('authForm');
  const emailInput = document.getElementById('authEmail');
  const passwordInput = document.getElementById('authPassword');
  const preservedEmail = preserveEmail ? emailInput?.value?.trim() || '' : '';
  form?.reset();
  if (preserveEmail && emailInput) emailInput.value = preservedEmail;
  if (passwordInput) passwordInput.value = '';
}

function setStageStatus(elementId, message = '', type = '') {
  const statusEl = document.getElementById(elementId);
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.className = `auth-modal__status${type ? ` ${type}` : ''}`;
}

function resetRecoveryForms({ preserveEmail = false } = {}) {
  const forgotForm = document.getElementById('authForgotForm');
  const forgotEmailInput = document.getElementById('authForgotEmail');
  const resetForm = document.getElementById('authResetForm');
  const resetPasswordInput = document.getElementById('authResetPassword');
  const resetPasswordConfirmInput = document.getElementById('authResetPasswordConfirm');
  const preservedEmail = preserveEmail
    ? forgotEmailInput?.value?.trim() || authModalState.recoveryEmail || ''
    : '';

  forgotForm?.reset();
  resetForm?.reset();
  if (preserveEmail && forgotEmailInput) forgotEmailInput.value = preservedEmail;
  if (resetPasswordInput) resetPasswordInput.value = '';
  if (resetPasswordConfirmInput) resetPasswordConfirmInput.value = '';
  setStageStatus('authForgotStatus');
  setStageStatus('authResetStatus');
}

function clearAuthCallbackHash() {
  const hash = window.location.hash || '';
  if (!hash) return;
  if (!/(access_token=|refresh_token=|type=recovery|type=signup|type=invite)/.test(hash)) return;
  const cleanUrl = `${window.location.pathname}${window.location.search}`;
  window.history.replaceState({}, document.title, cleanUrl);
}

function focusAuthPrimaryField() {
  window.requestAnimationFrame(() => {
    if (authModalState.stage === 'verify') {
      document.getElementById('authVerifyBackBtn')?.focus();
      return;
    }
    if (authModalState.stage === 'forgot') {
      document.getElementById('authForgotEmail')?.focus();
      return;
    }
    if (authModalState.stage === 'reset') {
      document.getElementById('authResetPassword')?.focus();
      return;
    }
    document.getElementById('authEmail')?.focus();
  });
}

function renderAuthModal() {
  const modalTitle = document.getElementById('authModalTitle');
  const modalDesc = document.getElementById('authModalDesc');
  const modalNote = document.getElementById('authModalNote');
  const form = document.getElementById('authForm');
  const formStage = document.getElementById('authFormStage');
  const verifyStage = document.getElementById('authVerifyStage');
  const forgotStage = document.getElementById('authForgotStage');
  const resetStage = document.getElementById('authResetStage');
  const submitText = document.getElementById('authSubmitText');
  const toggleText = document.getElementById('authToggleText');
  const passwordInput = document.getElementById('authPassword');
  const googleBtn = document.getElementById('authGoogleBtn');
  const divider = document.querySelector('.auth-modal__divider');
  const forgotWrap = document.getElementById('authForgotWrap');
  const verifyText = document.getElementById('authVerifyText');
  const forgotEmailInput = document.getElementById('authForgotEmail');
  const resetText = document.getElementById('authResetText');
  const resetEmailInput = document.getElementById('authResetEmail');
  const copy = getAuthCopy();
  const isVerifyStage = authModalState.stage === 'verify';
  const isForgotStage = authModalState.stage === 'forgot';
  const isResetStage = authModalState.stage === 'reset';

  if (modalTitle) {
    modalTitle.textContent = isVerifyStage
      ? 'Check your email'
      : isForgotStage
        ? 'Reset your password'
        : isResetStage
          ? 'Set a new password'
          : copy.title;
  }
  if (modalDesc) {
    if (isVerifyStage) {
      modalDesc.textContent = 'Verify your email to finish creating your account and continue where you left off.';
    } else if (isForgotStage) {
      modalDesc.textContent = 'Enter your account email and we\'ll send you a secure reset link.';
    } else if (isResetStage) {
      modalDesc.textContent = 'Choose a new password to secure your Supericons account.';
    } else {
      modalDesc.textContent = copy.desc;
    }
  }
  if (modalNote) {
    if (isVerifyStage) {
      modalNote.textContent = 'After you verify, come back here and sign in to continue.';
    } else if (isForgotStage) {
      modalNote.textContent = 'The recovery link will bring you back here to choose a new password.';
    } else if (isResetStage) {
      modalNote.textContent = 'Use at least 8 characters. Strong passwords are recommended for launch.';
    } else {
      modalNote.textContent = copy.note;
    }
  }
  if (submitText) submitText.textContent = copy.submit;
  if (form) form.dataset.mode = authModalState.mode;
  if (passwordInput) {
    passwordInput.autocomplete = authModalState.mode === 'signup' ? 'new-password' : 'current-password';
    passwordInput.minLength = authModalState.mode === 'signup' ? 8 : 1;
  }
  if (formStage) formStage.hidden = isVerifyStage || isForgotStage || isResetStage;
  if (verifyStage) verifyStage.hidden = !isVerifyStage;
  if (forgotStage) forgotStage.hidden = !isForgotStage;
  if (resetStage) resetStage.hidden = !isResetStage;
  if (googleBtn) googleBtn.hidden = isVerifyStage || isForgotStage || isResetStage;
  if (divider) divider.hidden = isVerifyStage || isForgotStage || isResetStage;
  if (forgotWrap) forgotWrap.hidden = authModalState.mode !== 'signin' || isVerifyStage || isForgotStage || isResetStage;
  if (verifyText) {
    verifyText.textContent = authModalState.verifyEmail
      ? `We sent a confirmation link to ${authModalState.verifyEmail}.`
      : 'We sent a confirmation link to your email.';
  }
  if (forgotEmailInput && authModalState.recoveryEmail) {
    forgotEmailInput.value = authModalState.recoveryEmail;
  }
  if (resetText) {
    resetText.textContent = authModalState.recoveryEmail
      ? `Choose a new password for ${authModalState.recoveryEmail}.`
      : 'Choose a new password for your account.';
  }
  if (resetEmailInput) {
    resetEmailInput.value = authModalState.recoveryEmail || currentUser?.email || '';
  }
  if (toggleText) {
    toggleText.innerHTML = `${copy.toggle} <a href="#" id="authToggleLink">${copy.toggleAction}</a>`;
    const toggleLink = toggleText.querySelector('#authToggleLink');
    toggleLink?.addEventListener('click', (event) => {
      event.preventDefault();
      authModalState = {
        ...authModalState,
        mode: authModalState.mode === 'signup' ? 'signin' : 'signup',
        stage: 'form',
      };
      setAuthStatus();
      renderAuthModal();
      focusAuthPrimaryField();
    });
  }
}

function resetAuthModalState() {
  authModalState = { ...AUTH_MODAL_DEFAULT_STATE };
}

function shouldClearIntentOnClose() {
  return authModalState.context !== 'default' && authModalState.stage !== 'verify';
}

function closeAuthModal({ preserveIntent = false, resetToDefault = true } = {}) {
  document.getElementById('authModal')?.classList.remove('open');
  if (!preserveIntent && shouldClearIntentOnClose()) {
    clearAuthIntent();
  }
  if (resetToDefault) {
    resetAuthModalState();
    resetAuthForm();
    resetRecoveryForms();
    setAuthStatus();
    renderAuthModal();
  }
}

export function openAuthModal({
  mode = 'signin',
  context = 'default',
} = {}) {
  authModalState = {
    ...AUTH_MODAL_DEFAULT_STATE,
    mode: mode === 'signup' ? 'signup' : 'signin',
    context: AUTH_MODAL_COPY[context] ? context : 'default',
  };
  if (authModalState.context === 'default') {
    clearAuthIntent();
  }
  resetAuthForm();
  resetRecoveryForms();
  setAuthStatus();
  renderAuthModal();
  document.getElementById('authModal')?.classList.add('open');
  focusAuthPrimaryField();
}

function showAuthVerifyStage(email) {
  authModalState = {
    ...authModalState,
    mode: 'signin',
    stage: 'verify',
    verifyEmail: email || '',
  };
  setAuthStatus();
  resetAuthForm({ preserveEmail: true });
  resetRecoveryForms();
  renderAuthModal();
  focusAuthPrimaryField();
}

function showForgotPasswordStage(email = '') {
  authModalState = {
    ...authModalState,
    mode: 'signin',
    stage: 'forgot',
    recoveryEmail: email || authModalState.recoveryEmail || '',
  };
  setAuthStatus();
  resetAuthForm({ preserveEmail: true });
  resetRecoveryForms({ preserveEmail: true });
  renderAuthModal();
  focusAuthPrimaryField();
}

function showPasswordResetStage(email = '') {
  authModalState = {
    ...authModalState,
    mode: 'signin',
    stage: 'reset',
    recoveryEmail: email || authModalState.recoveryEmail || currentUser?.email || '',
  };
  setAuthStatus();
  resetAuthForm();
  resetRecoveryForms();
  renderAuthModal();
  document.getElementById('authModal')?.classList.add('open');
  focusAuthPrimaryField();
}

function wireAuthListeners() {
  const modal = document.getElementById('authModal');
  if (modal?.dataset.wired) return;
  if (modal) modal.dataset.wired = 'true';

  const backdrop = document.getElementById('authBackdrop');
  const closeBtn = document.getElementById('authClose');
  const signInBtn = document.getElementById('authSignInBtn');
  const avatarBtn = document.getElementById('authAvatarBtn');
  const dropdown = document.getElementById('authDropdown');
  const accountModal = document.getElementById('accountModal');
  const accountBackdrop = document.getElementById('accountBackdrop');
  const accountCloseBtn = document.getElementById('accountClose');
  const accountBtn = document.getElementById('authAccountBtn');
  const accountProfileForm = document.getElementById('accountProfileForm');
  const accountSaveBtn = document.getElementById('accountSaveBtn');
  const accountPasswordBtn = document.getElementById('accountPasswordBtn');
  const signOutBtn = document.getElementById('authSignOutBtn');
  const googleBtn = document.getElementById('authGoogleBtn');
  const form = document.getElementById('authForm');
  const submitBtn = document.getElementById('authSubmitBtn');
  const forgotBtn = document.getElementById('authForgotBtn');
  const forgotForm = document.getElementById('authForgotForm');
  const forgotSubmitBtn = document.getElementById('authForgotSubmitBtn');
  const forgotBackBtn = document.getElementById('authForgotBackBtn');
  const resetForm = document.getElementById('authResetForm');
  const resetSubmitBtn = document.getElementById('authResetSubmitBtn');
  const verifyBackBtn = document.getElementById('authVerifyBackBtn');

  renderAuthModal();

  if (signInBtn) {
    signInBtn.addEventListener('click', () => {
      openAuthModal({ mode: 'signin', context: 'default' });
    });
  }

  if (backdrop) backdrop.addEventListener('click', () => closeAuthModal());
  if (closeBtn) closeBtn.addEventListener('click', () => closeAuthModal());
  if (accountBackdrop) accountBackdrop.addEventListener('click', () => closeAccountModal({ resetState: true }));
  if (accountCloseBtn) accountCloseBtn.addEventListener('click', () => closeAccountModal({ resetState: true }));
  if (verifyBackBtn) {
    verifyBackBtn.addEventListener('click', () => {
      authModalState = {
        ...authModalState,
        mode: 'signin',
        stage: 'form',
      };
      setAuthStatus();
      renderAuthModal();
      focusAuthPrimaryField();
    });
  }
  if (forgotBackBtn) {
    forgotBackBtn.addEventListener('click', () => {
      authModalState = {
        ...authModalState,
        mode: 'signin',
        stage: 'form',
      };
      setStageStatus('authForgotStatus');
      renderAuthModal();
      focusAuthPrimaryField();
    });
  }

  if (avatarBtn) {
    avatarBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      dropdown?.classList.toggle('open');
    });
  }
  if (accountModal) {
    accountModal.addEventListener('click', (event) => {
      event.stopPropagation();
    });
  }
  document.addEventListener('click', () => dropdown?.classList.remove('open'));

  if (accountBtn) {
    accountBtn.addEventListener('click', () => {
      dropdown?.classList.remove('open');
      openAccountModal();
    });
  }

  if (signOutBtn) {
    signOutBtn.addEventListener('click', async () => {
      dropdown?.classList.remove('open');
      await signOut();
    });
  }

  const manageSubBtn = document.getElementById('authManageSubscription');
  if (manageSubBtn) {
    manageSubBtn.addEventListener('click', async () => {
      dropdown?.classList.remove('open');
      await openCustomerPortal();
    });
  }

  if (googleBtn) {
    googleBtn.addEventListener('click', async () => {
      try {
        await signInWithGoogle();
      } catch (err) {
        setAuthStatus(err.message || 'Google sign-in failed', 'error');
      }
    });
  }

  if (forgotBtn) {
    forgotBtn.addEventListener('click', () => {
      const email = document.getElementById('authEmail')?.value?.trim() || '';
      showForgotPasswordStage(email);
    });
  }

  if (form) {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const email = document.getElementById('authEmail')?.value?.trim();
      const password = document.getElementById('authPassword')?.value;

      if (!email || !password) return;

      if (submitBtn) submitBtn.disabled = true;
      setAuthStatus();

      try {
        const isSigningUp = form.dataset.mode === 'signup';
        if (isSigningUp) {
          const result = await signUpWithEmail(email, password);
          if (result?.session) {
            closeAuthModal({ preserveIntent: true, resetToDefault: true });
          } else {
            showAuthVerifyStage(email);
          }
        } else {
          await signInWithEmail(email, password);
          closeAuthModal({ preserveIntent: true, resetToDefault: true });
          resetAuthForm();
        }
      } catch (err) {
        setAuthStatus(err.message || 'Something went wrong', 'error');
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }

  if (forgotForm) {
    forgotForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const email = document.getElementById('authForgotEmail')?.value?.trim();
      if (!email) return;

      if (forgotSubmitBtn) forgotSubmitBtn.disabled = true;
      setStageStatus('authForgotStatus');

      try {
        authModalState = {
          ...authModalState,
          recoveryEmail: email,
        };
        await requestPasswordReset(email);
        setStageStatus('authForgotStatus', `We sent a reset link to ${email}.`, 'success');
      } catch (err) {
        setStageStatus('authForgotStatus', err.message || 'Could not send reset email', 'error');
      } finally {
        if (forgotSubmitBtn) forgotSubmitBtn.disabled = false;
      }
    });
  }

  if (resetForm) {
    resetForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const nextPassword = document.getElementById('authResetPassword')?.value || '';
      const confirmPassword = document.getElementById('authResetPasswordConfirm')?.value || '';

      if (!nextPassword || !confirmPassword) return;
      if (nextPassword.length < 8) {
        setStageStatus('authResetStatus', 'Use at least 8 characters for your new password.', 'error');
        return;
      }
      if (nextPassword !== confirmPassword) {
        setStageStatus('authResetStatus', 'Passwords do not match yet.', 'error');
        return;
      }

      if (resetSubmitBtn) resetSubmitBtn.disabled = true;
      setStageStatus('authResetStatus');

      try {
        await updateUserPassword(nextPassword);
        clearAuthCallbackHash();
        closeAuthModal({ preserveIntent: true, resetToDefault: true });
        showToast('Password updated');
        dispatchAuthSignedIn();
      } catch (err) {
        setStageStatus('authResetStatus', err.message || 'Could not update password', 'error');
      } finally {
        if (resetSubmitBtn) resetSubmitBtn.disabled = false;
      }
    });
  }

  if (accountProfileForm) {
    accountProfileForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const displayName = document.getElementById('accountDisplayName')?.value?.trim() || '';
      if (!displayName) {
        setAccountStatus('accountProfileStatus', 'Enter a display name to save.', 'error');
        return;
      }
      if (displayName.length < 2) {
        setAccountStatus('accountProfileStatus', 'Use at least 2 characters for your display name.', 'error');
        return;
      }

      if (accountSaveBtn) accountSaveBtn.disabled = true;
      setAccountStatus('accountProfileStatus');

      try {
        await updateUserProfile({ displayName });
        renderAccountModal();
        setAccountStatus('accountProfileStatus', 'Display name saved.', 'success');
        showToast('Account updated');
      } catch (err) {
        setAccountStatus('accountProfileStatus', err.message || 'Could not save display name', 'error');
      } finally {
        if (accountSaveBtn) accountSaveBtn.disabled = false;
      }
    });
  }

  if (accountPasswordBtn) {
    accountPasswordBtn.addEventListener('click', async () => {
      const email = currentUser?.email?.trim();
      if (!email) {
        setAccountStatus('accountPasswordStatus', 'No signed-in email is available for this account.', 'error');
        return;
      }

      accountPasswordBtn.disabled = true;
      setAccountStatus('accountPasswordStatus');

      try {
        await requestPasswordReset(email);
        setAccountStatus('accountPasswordStatus', `We sent a reset link to ${email}.`, 'success');
        showToast('Password reset email sent');
      } catch (err) {
        setAccountStatus('accountPasswordStatus', err.message || 'Could not send password reset email', 'error');
      } finally {
        accountPasswordBtn.disabled = false;
      }
    });
  }

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeAuthModal();
      closeAccountModal({ resetState: true });
      dropdown?.classList.remove('open');
    }
  });
}

function wireAuthListenersLegacy() {
  const modal = document.getElementById('authModal');
  // Guard: prevent duplicate listener attachment
  if (modal?.dataset.wired) return;
  if (modal) modal.dataset.wired = 'true';

  const backdrop = document.getElementById('authBackdrop');
  const closeBtn = document.getElementById('authClose');
  const signInBtn = document.getElementById('authSignInBtn');
  const avatarBtn = document.getElementById('authAvatarBtn');
  const dropdown = document.getElementById('authDropdown');
  const signOutBtn = document.getElementById('authSignOutBtn');
  const googleBtn = document.getElementById('authGoogleBtn');
  const toggleLink = document.getElementById('authToggleLink');
  const form = document.getElementById('authForm');
  const statusEl = document.getElementById('authStatus');
  const submitBtn = document.getElementById('authSubmitBtn');
  const submitText = document.getElementById('authSubmitText');
  const modalTitle = document.getElementById('authModalTitle');
  const toggleText = document.getElementById('authToggleText');


  // Open modal
  if (signInBtn) {
    signInBtn.addEventListener('click', () => {
      if (form) form.dataset.mode = 'signin';
      updateModalMode(false, modalTitle, submitText, toggleText);
      if (modal) modal.classList.add('open');
    });
  }

  // Close modal
  if (backdrop) backdrop.addEventListener('click', () => modal?.classList.remove('open'));
  if (closeBtn) closeBtn.addEventListener('click', () => modal?.classList.remove('open'));

  // Toggle sign in / sign up
  if (toggleLink) {
    toggleLink.addEventListener('click', (e) => {
      e.preventDefault();
      const nowSignUp = form?.dataset.mode !== 'signup';
      if (form) form.dataset.mode = nowSignUp ? 'signup' : 'signin';
      updateModalMode(nowSignUp, modalTitle, submitText, toggleText);
      if (statusEl) { statusEl.textContent = ''; statusEl.className = 'auth-modal__status'; }
    });
  }

  // Avatar dropdown
  if (avatarBtn) {
    avatarBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown?.classList.toggle('open');
    });
  }
  // Close dropdown on outside click
  document.addEventListener('click', () => dropdown?.classList.remove('open'));

  // Sign out
  if (signOutBtn) {
    signOutBtn.addEventListener('click', async () => {
      dropdown?.classList.remove('open');
      await signOut();
    });
  }

  // Manage Subscription (Customer Portal)
  const manageSubBtn = document.getElementById('authManageSubscription');
  if (manageSubBtn) {
    manageSubBtn.addEventListener('click', async () => {
      dropdown?.classList.remove('open');
      await openCustomerPortal();
    });
  }

  // Google sign in
  if (googleBtn) {
    googleBtn.addEventListener('click', async () => {
      try {
        await signInWithGoogle();
      } catch (err) {
        if (statusEl) {
          statusEl.textContent = err.message || 'Google sign-in failed';
          statusEl.className = 'auth-modal__status error';
        }
      }
    });
  }

  // Form submit (email sign in/up)
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('authEmail')?.value?.trim();
      const password = document.getElementById('authPassword')?.value;

      if (!email || !password) return;

      if (submitBtn) submitBtn.disabled = true;
      if (statusEl) { statusEl.textContent = ''; statusEl.className = 'auth-modal__status'; }

      try {
        const isSigningUp = form?.dataset.mode === 'signup';
        if (isSigningUp) {
          await signUpWithEmail(email, password);
          if (statusEl) {
            statusEl.textContent = 'Check your email to confirm your account';
            statusEl.className = 'auth-modal__status success';
          }
        } else {
          await signInWithEmail(email, password);
          modal?.classList.remove('open');
          form.reset();
        }
      } catch (err) {
        if (statusEl) {
          statusEl.textContent = err.message || 'Something went wrong';
          statusEl.className = 'auth-modal__status error';
        }
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }

  // Escape key closes modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      modal?.classList.remove('open');
      dropdown?.classList.remove('open');
    }
  });
}

function updateModalMode(isSignUp, titleEl, submitTextEl, toggleTextEl) {
  if (titleEl) titleEl.textContent = isSignUp ? 'Create an account' : 'Sign in to Supericons';
  if (submitTextEl) submitTextEl.textContent = isSignUp ? 'Create account' : 'Sign in';
  if (toggleTextEl) toggleTextEl.innerHTML = isSignUp
    ? 'Already have an account? <a href="#" id="authToggleLink">Sign in</a>'
    : 'Don\'t have an account? <a href="#" id="authToggleLink">Sign up</a>';

  // Sync form data-mode with current state
  const form = document.getElementById('authForm');
  if (form) form.dataset.mode = isSignUp ? 'signup' : 'signin';

  // Re-wire toggle link (innerHTML destroyed the old one)
  const newLink = toggleTextEl?.querySelector('#authToggleLink');
  if (newLink) {
    newLink.addEventListener('click', (e) => {
      e.preventDefault();
      const titleEl2 = document.getElementById('authModalTitle');
      const submitText2 = document.getElementById('authSubmitText');
      const toggleText2 = document.getElementById('authToggleText');
      const statusEl = document.getElementById('authStatus');
      updateModalMode(!isSignUp, titleEl2, submitText2, toggleText2);
      if (statusEl) { statusEl.textContent = ''; statusEl.className = 'auth-modal__status'; }
    });
  }
}

// ── Toast Helper ──────────────────────────────────────────────
function showToast(msg) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('visible');
  clearTimeout(authToastTimeout);
  authToastTimeout = window.setTimeout(() => {
    toast.classList.remove('visible');
  }, 2500);
}
