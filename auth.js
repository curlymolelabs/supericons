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
const AUTH_ACCOUNT_PASSWORD_COOLDOWN_STORAGE_PREFIX = 'si-auth-account-password-cooldown';
const AUTH_FLOW_EVENT_STORAGE_KEY = 'si-auth-flow-event';
const AUTH_FLOW_BROADCAST_CHANNEL = 'si-auth-flow';
const AUTH_INTENT_TTL_MS = 1000 * 60 * 60 * 6;
const AUTH_EMAIL_REQUEST_COOLDOWN_MS = 60 * 1000;
const AUTH_FLOW_SESSION_RETRY_ATTEMPTS = 4;
const AUTH_FLOW_SESSION_RETRY_DELAY_MS = 150;
const AUTH_FLOW_SOURCE_ID = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const AUTH_VERIFY_KIND = Object.freeze({
  SIGNUP_PENDING: 'signup_pending',
  SIGNUP_EXISTING_HINT: 'signup_existing_hint',
  SIGNIN_UNCONFIRMED: 'signin_unconfirmed',
  CALLBACK_ERROR: 'callback_error',
});
const AUTH_CALLBACK_FLOW = Object.freeze({
  GENERIC: 'generic',
  RECOVERY: 'recovery',
  SIGNUP: 'signup',
});
const AUTH_RESET_KIND = Object.freeze({
  PASSWORD_RECOVERY: 'password_recovery',
  ADD_PASSWORD: 'add_password',
});
const AUTH_COMPLETION_KIND = Object.freeze({
  EMAIL_CONFIRMED: 'email_confirmed',
  SIGNED_IN: 'signed_in',
  PASSWORD_UPDATED: 'password_updated',
});
const AUTH_MODAL_DEFAULT_STATE = Object.freeze({
  mode: 'signin',
  context: 'default',
  stage: 'form',
  verifyEmail: '',
  verifyKind: AUTH_VERIFY_KIND.SIGNUP_PENDING,
  verifyResendCooldownUntil: 0,
  forgotSubmitCooldownUntil: 0,
  accountPasswordCooldownUntil: 0,
  callbackErrorMessage: '',
  callbackErrorFlow: AUTH_CALLBACK_FLOW.GENERIC,
  completionKind: AUTH_COMPLETION_KIND.SIGNED_IN,
  recoveryEmail: '',
  resetKind: AUTH_RESET_KIND.PASSWORD_RECOVERY,
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
let verifyResendRefreshTimer = null;
let authFlowChannel = null;
const seenAuthFlowEventIds = new Set();

function tr(key, params = {}, fallback = key) {
  const value = window.__supericons?.t?.(key, params);
  return value && value !== key ? value : fallback;
}

function getActiveLocale() {
  return window.__supericons?.getActiveLocale?.() || document.documentElement.lang || 'en';
}

function createAuthFlowEventId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function readAuthCallbackParams() {
  const searchParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams((window.location.hash || '').replace(/^#/, ''));
  return hashParams.toString() ? hashParams : searchParams;
}

function hasAuthCallbackPayload() {
  const params = readAuthCallbackParams();
  return Boolean(
    params.has('access_token')
      || params.has('refresh_token')
      || params.has('code')
      || params.has('type')
      || params.has('error')
      || params.has('error_description')
      || params.has('error_code'),
  );
}

function getAuthCallbackFlowFromUrl() {
  const params = readAuthCallbackParams();
  const description = params.get('error_description') || params.get('error') || '';
  return inferAuthCallbackFlow(params, description);
}

function isAuthModalOpen() {
  return document.getElementById('authModal')?.classList.contains('open') || false;
}

function isAccountModalOpen() {
  return document.getElementById('accountModal')?.classList.contains('open') || false;
}

function publishAuthFlowEvent(type, detail = {}) {
  const payload = {
    id: createAuthFlowEventId(),
    sourceId: AUTH_FLOW_SOURCE_ID,
    type,
    at: Date.now(),
    locale: getActiveLocale(),
    userId: currentUser?.id || null,
    email: currentUser?.email || detail.email || '',
    ...detail,
  };

  try {
    authFlowChannel?.postMessage(payload);
  } catch {
    // BroadcastChannel can be unavailable or blocked; localStorage fallback follows.
  }

  try {
    window.localStorage?.setItem(AUTH_FLOW_EVENT_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Cross-tab sync is a convenience layer; auth still works in the active tab.
  }
}

function waitForAuthFlowSessionRetry() {
  return new Promise((resolve) => {
    window.setTimeout(resolve, AUTH_FLOW_SESSION_RETRY_DELAY_MS);
  });
}

async function refreshSessionFromAuthFlowEvent() {
  if (!supabase) return null;
  for (let attempt = 0; attempt < AUTH_FLOW_SESSION_RETRY_ATTEMPTS; attempt += 1) {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      console.warn('[Auth] Could not refresh session after auth flow event:', error?.message || error);
      return null;
    }
    currentUser = session?.user ?? null;
    updateAuthUI();
    if (session?.user || attempt === AUTH_FLOW_SESSION_RETRY_ATTEMPTS - 1) {
      return session;
    }
    await waitForAuthFlowSessionRetry();
  }
  return null;
}

async function handleAuthFlowEvent(payload) {
  if (!payload || typeof payload !== 'object') return;
  if (!payload.id || seenAuthFlowEventIds.has(payload.id)) return;
  seenAuthFlowEventIds.add(payload.id);
  if (payload.sourceId === AUTH_FLOW_SOURCE_ID) return;

  const hadAuthModalOpen = isAuthModalOpen();
  const wasVerifyStage = authModalState.stage === 'verify';
  const wasResetStage = authModalState.stage === 'reset';
  const hadAccountModalOpen = isAccountModalOpen();

  if (payload.type === 'signed_in') {
    const session = await refreshSessionFromAuthFlowEvent();
    if (!session?.user) return;
    if (hadAuthModalOpen) {
      closeAuthModal({ preserveIntent: true, resetToDefault: true });
    }
    if (hadAccountModalOpen) {
      closeAccountModal({ resetState: true });
    }
    const signInEpoch = beginAuthCycle();
    void fetchSubscriptionForEpoch(signInEpoch);
    dispatchAuthSignedIn();
    if (hadAuthModalOpen) {
      showToast(wasVerifyStage
        ? tr('auth.toast.emailConfirmed', {}, 'Email confirmed. You are signed in.')
        : tr('auth.toast.signedInInAnotherTab', {}, 'Signed in in another tab.'));
    }
    return;
  }

  if (payload.type === 'password_updated') {
    const session = await refreshSessionFromAuthFlowEvent();
    if (session?.user && hadAuthModalOpen && wasResetStage) {
      closeAuthModal({ preserveIntent: true, resetToDefault: true });
      showToast(tr('auth.toast.passwordUpdatedInAnotherTab', {}, 'Password updated in another tab.'));
    }
    if (session?.user && hadAccountModalOpen) {
      closeAccountModal({ resetState: true });
      showToast(tr('auth.toast.passwordUpdatedInAnotherTab', {}, 'Password updated in another tab.'));
    }
  }
}

function receiveAuthFlowEvent(rawPayload) {
  let payload = rawPayload;
  if (typeof rawPayload === 'string') {
    try {
      payload = JSON.parse(rawPayload);
    } catch {
      return;
    }
  }
  void handleAuthFlowEvent(payload);
}

function initAuthFlowBridge() {
  if (typeof window.BroadcastChannel === 'function') {
    try {
      authFlowChannel = new BroadcastChannel(AUTH_FLOW_BROADCAST_CHANNEL);
      authFlowChannel.onmessage = (event) => receiveAuthFlowEvent(event.data);
    } catch {
      authFlowChannel = null;
    }
  }

  window.addEventListener('storage', (event) => {
    if (event.key === AUTH_FLOW_EVENT_STORAGE_KEY && event.newValue) {
      receiveAuthFlowEvent(event.newValue);
    }
  });
}

function getAccountPasswordCooldownStorageKey(user = currentUser) {
  const userKey = String(user?.id || user?.email || '').trim();
  return userKey ? `${AUTH_ACCOUNT_PASSWORD_COOLDOWN_STORAGE_PREFIX}:${userKey}` : '';
}

function readStoredAccountPasswordCooldownUntil(user = currentUser) {
  const storageKey = getAccountPasswordCooldownStorageKey(user);
  if (!storageKey) return 0;
  try {
    const raw = window.localStorage?.getItem(storageKey);
    const deadline = Number(raw || 0);
    if (!Number.isFinite(deadline) || deadline <= 0) return 0;
    if (Date.now() >= deadline) {
      window.localStorage?.removeItem(storageKey);
      return 0;
    }
    return deadline;
  } catch {
    return 0;
  }
}

function writeStoredAccountPasswordCooldownUntil(deadline, user = currentUser) {
  const storageKey = getAccountPasswordCooldownStorageKey(user);
  if (!storageKey) return;
  try {
    if (Number.isFinite(deadline) && deadline > Date.now()) {
      window.localStorage?.setItem(storageKey, String(deadline));
    } else {
      window.localStorage?.removeItem(storageKey);
    }
  } catch {
    // Storage can be unavailable in private contexts; in-memory cooldown still works.
  }
}

function getAccountPasswordCooldownUntil() {
  const stateDeadline = Number(authModalState.accountPasswordCooldownUntil || 0);
  const storedDeadline = readStoredAccountPasswordCooldownUntil();
  const deadline = Math.max(
    Number.isFinite(stateDeadline) ? stateDeadline : 0,
    storedDeadline,
  );
  if (deadline <= Date.now()) {
    if (authModalState.accountPasswordCooldownUntil) {
      authModalState = {
        ...authModalState,
        accountPasswordCooldownUntil: 0,
      };
    }
    writeStoredAccountPasswordCooldownUntil(0);
    return 0;
  }
  if (deadline !== stateDeadline) {
    authModalState = {
      ...authModalState,
      accountPasswordCooldownUntil: deadline,
    };
  }
  return deadline;
}

function getStripeLocale() {
  const locale = String(getActiveLocale()).toLowerCase();
  const map = {
    'zh-hans': 'zh',
    'zh-hant': 'zh-TW',
    ar: 'ar',
    de: 'de',
    en: 'en',
    es: 'es',
    fr: 'fr',
    hi: 'hi',
    ja: 'ja',
    ko: 'ko',
    pt: 'pt',
    th: 'th',
    vi: 'vi',
  };
  return map[locale] || 'auto';
}

function getBareAuthRedirectUrl() {
  const origin = window.location.origin.replace(/\/+$/, '');
  return origin;
}

function buildLocalizedAuthRedirectUrl() {
  const origin = getBareAuthRedirectUrl();
  const locale = getActiveLocale();
  if (locale && locale !== 'en') {
    return `${origin}?locale=${encodeURIComponent(locale)}`;
  }
  return origin;
}

function isSameEmail(left, right) {
  return String(left || '').trim().toLowerCase() === String(right || '').trim().toLowerCase();
}

async function persistCurrentAuthLocale() {
  if (!currentUser) return false;
  const locale = getActiveLocale();
  if (!locale || locale === currentUser.user_metadata?.locale) return false;

  const nextMetadata = {
    ...(currentUser.user_metadata || {}),
    locale,
  };
  const { data, error } = await supabase.auth.updateUser({ data: nextMetadata });
  if (error) throw error;
  currentUser = data?.user || currentUser;
  return true;
}

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

function dispatchAuthSignedOut() {
  window.dispatchEvent(new CustomEvent('supericons:auth-signed-out'));
}

// ── Init ──────────────────────────────────────────────────────
export function initAuth() {
  if (!window.supabase) {
    console.warn('[Auth] Supabase JS not loaded');
    return;
  }
  supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
  const bootEpoch = beginAuthCycle();
  const callbackError = readAuthCallbackError();
  initAuthFlowBridge();

  // Listen for auth state changes
  supabase.auth.onAuthStateChange((event, session) => {
    currentUser = session?.user ?? null;
    updateAuthUI();

    if (event === 'PASSWORD_RECOVERY') {
      const callbackFlow = getAuthCallbackFlowFromUrl();
      clearAuthCallbackHash();
      const recoveryEpoch = beginAuthCycle();
      void fetchSubscriptionForEpoch(recoveryEpoch);
      showPasswordResetStage(session?.user?.email || '');
      publishAuthFlowEvent('password_recovery_opened', {
        flow: callbackFlow,
        email: session?.user?.email || '',
      });
    } else if (event === 'SIGNED_IN') {
      const signedInFromCallback = hasAuthCallbackPayload();
      const callbackFlow = signedInFromCallback ? getAuthCallbackFlowFromUrl() : AUTH_CALLBACK_FLOW.GENERIC;
      clearAuthCallbackHash();
      const signInEpoch = beginAuthCycle();
      void fetchSubscriptionForEpoch(signInEpoch);
      dispatchAuthSignedIn();
      publishAuthFlowEvent('signed_in', {
        flow: signedInFromCallback ? callbackFlow : 'direct',
        email: session?.user?.email || '',
      });
      if (signedInFromCallback) {
        showAuthCompletionStage(callbackFlow === AUTH_CALLBACK_FLOW.SIGNUP
          ? AUTH_COMPLETION_KIND.EMAIL_CONFIRMED
          : AUTH_COMPLETION_KIND.SIGNED_IN);
      } else {
        closeAuthModal({ preserveIntent: true, resetToDefault: true });
        showToast(tr('auth.toast.signedIn', {}, 'Signed in successfully.'));
      }
    } else if (event === 'USER_UPDATED') {
      const updateEpoch = beginAuthCycle();
      void fetchSubscriptionForEpoch(updateEpoch);
    } else if (event === 'SIGNED_OUT') {
      clearAuthIntent();
      showToast(tr('auth.toast.signedOut', {}, 'Signed out.'));
      beginAuthCycle({ resolved: true });
      resetProState();
      dispatchAuthSignedOut();
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

  if (callbackError) {
    clearAuthCallbackHash();
    showAuthVerifyStage('', {
      kind: AUTH_VERIFY_KIND.CALLBACK_ERROR,
      callbackErrorMessage: callbackError.description,
      callbackErrorFlow: callbackError.flow,
    });
  }
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
      data: {
        locale: getActiveLocale(),
      },
      emailRedirectTo: getBareAuthRedirectUrl(),
    },
  });
  if (error) throw error;
  return data;
}

export async function resendSignupConfirmation(email) {
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email,
    options: {
      emailRedirectTo: buildLocalizedAuthRedirectUrl(),
    },
  });
  if (error) throw error;
}

export async function requestPasswordReset(email) {
  const isCurrentAccountReset = currentUser?.email && isSameEmail(currentUser.email, email);
  const localePersisted = isCurrentAccountReset ? await persistCurrentAuthLocale() : false;
  const redirectTo = isCurrentAccountReset ? getBareAuthRedirectUrl() : buildLocalizedAuthRedirectUrl();
  console.info('[Auth] Requesting password reset email', {
    locale: getActiveLocale(),
    localePersisted,
    redirectOrigin: new URL(redirectTo).origin,
    redirectTo,
  });
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  });
  if (error) throw error;
}

export async function updateUserPassword(password) {
  const { data, error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
  return data;
}

async function getCurrentAccessToken() {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw error;
  return session?.access_token || '';
}

async function notifyPasswordChanged(accessToken = '') {
  const token = accessToken || await getCurrentAccessToken();
  if (!token) throw new Error('Missing auth session');

  console.info('[Auth] Requesting password change notification email');
  const response = await fetch(`${SUPABASE_URL}/functions/v1/notify-password-changed`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'apikey': SUPABASE_ANON,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ locale: getActiveLocale() }),
  });

  const responseText = await response.text();
  let body = {};
  if (responseText) {
    try {
      body = JSON.parse(responseText);
    } catch {
      body = {};
    }
  }
  if (!response.ok) {
    throw new Error(body.error || responseText || 'Password change notification failed');
  }
  console.info('[Auth] Password change notification email requested', body);
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
      redirectTo: buildLocalizedAuthRedirectUrl(),
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
async function requestCustomerPortalWithToken(token) {
  return fetch(`${SUPABASE_URL}/functions/v1/create-portal`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'apikey': SUPABASE_ANON,
    },
    body: JSON.stringify({ return_url: window.location.href, locale: getStripeLocale() }),
  });
}

export async function openCustomerPortal() {
  if (!supabase || !currentUser) return;
  showToast(tr('checkout.openingPortal', {}, 'Opening subscription portal...'));
  try {
    const { data: { session } } = await supabase.auth.getSession();
    let token = session?.access_token;
    if (!token) throw new Error(tr('checkout.signInAgainPortal', {}, 'Sign in again to open the subscription portal.'));

    let res = await requestCustomerPortalWithToken(token);
    if (res.status === 401) {
      await supabase.auth.refreshSession();
      const { data: { session: retrySession } } = await supabase.auth.getSession();
      token = retrySession?.access_token;
      if (!token) throw new Error(tr('checkout.signInAgainPortal', {}, 'Sign in again to open the subscription portal.'));
      res = await requestCustomerPortalWithToken(token);
    }

    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      const message = typeof payload?.error === 'string' && payload.error.trim()
        ? payload.error.trim()
        : tr('checkout.portalUnavailable', {}, 'Portal unavailable');
      throw new Error(message);
    }

    const { url } = await res.json();
    if (url) window.location.href = url;
  } catch (err) {
    showToast(err.message || tr('checkout.portalFailed', {}, 'Could not open subscription portal'));
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

function showUserInitialAvatar(avatarImg, avatarInitial) {
  if (avatarImg) {
    avatarImg.style.display = 'none';
    avatarImg.removeAttribute('src');
  }
  if (avatarInitial) {
    avatarInitial.textContent = getUserInitial();
    avatarInitial.style.display = 'flex';
  }
}

function applyUserAvatarImage(avatarImg, avatarInitial) {
  const avatarUrl = getUserAvatarUrl();
  if (!avatarImg || !avatarUrl) {
    showUserInitialAvatar(avatarImg, avatarInitial);
    return;
  }

  avatarImg.onload = () => {
    avatarImg.style.display = 'block';
    if (avatarInitial) avatarInitial.style.display = 'none';
  };
  avatarImg.onerror = () => {
    showUserInitialAvatar(avatarImg, avatarInitial);
  };
  avatarImg.src = avatarUrl;

  if (avatarImg.complete) {
    if (avatarImg.naturalWidth > 0) {
      avatarImg.style.display = 'block';
      if (avatarInitial) avatarInitial.style.display = 'none';
    } else {
      showUserInitialAvatar(avatarImg, avatarInitial);
    }
  }
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
    applyUserAvatarImage(avatarImg, avatarInitial);

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
  const passwordTitle = document.getElementById('accountPasswordTitle');
  const passwordCopy = document.getElementById('accountPasswordCopy');
  const passwordBtn = document.getElementById('accountPasswordBtn');
  const oauthOnly = isOAuthOnlyUser();
  const passwordCooldownRemaining = Math.max(0, getAccountPasswordCooldownUntil() - Date.now());

  if (summaryName) summaryName.textContent = getUserDisplayName();
  if (summaryEmail) summaryEmail.textContent = currentUser?.email || '';
  if (displayNameInput) displayNameInput.value = getUserDisplayName();
  if (emailDisplayInput) emailDisplayInput.value = currentUser?.email || '';
  if (avatarInitial) avatarInitial.textContent = getUserInitial();
  if (passwordTitle) passwordTitle.textContent = oauthOnly
    ? tr('account.password.addTitle', {}, 'Add password sign-in')
    : tr('account.password.title', {}, 'Password');
  if (passwordCopy) {
    passwordCopy.textContent = oauthOnly
      ? tr('account.password.addDescription', {}, 'You currently sign in with Google. Set a password if you also want to sign in with email.')
      : tr('account.password.description', {}, 'Use the secure recovery flow to choose a new password.');
  }
  if (passwordBtn) {
    passwordBtn.disabled = !currentUser?.email || (!oauthOnly && passwordCooldownRemaining > 0);
    passwordBtn.textContent = !oauthOnly && passwordCooldownRemaining > 0
      ? tr('account.password.resetInSeconds', { seconds: Math.ceil(passwordCooldownRemaining / 1000) }, 'Send another reset email in {seconds}s')
      : oauthOnly
        ? tr('account.password.setPassword', {}, 'Set password')
        : tr('account.password.sendResetEmail', {}, 'Send password reset email');
  }
  scheduleAuthStageRefresh();
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
  const copy = AUTH_MODAL_COPY[normalizedContext][normalizedMode];
  const base = `auth.copy.${normalizedContext}.${normalizedMode}`;
  return Object.fromEntries(Object.entries(copy).map(([key, value]) => [
    key,
    tr(`${base}.${key}`, {}, value),
  ]));
}

function getCurrentProviders(user = currentUser) {
  const providers = user?.app_metadata?.providers;
  if (Array.isArray(providers) && providers.length) return providers;
  const singleProvider = user?.app_metadata?.provider;
  if (typeof singleProvider === 'string' && singleProvider) return [singleProvider];
  return [];
}

function hasEmailProvider(user = currentUser) {
  const providers = getCurrentProviders(user);
  return providers.length === 0 || providers.includes('email');
}

function isOAuthOnlyUser(user = currentUser) {
  const providers = getCurrentProviders(user);
  return providers.length > 0 && !providers.includes('email');
}

function isLikelyExistingSignupResult(data) {
  if (!data?.user || data?.session) return false;
  const identities = data.user.identities;
  return Array.isArray(identities) && identities.length === 0;
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
  setStageStatus('authVerifyStatus');
  setStageStatus('authForgotStatus');
  setStageStatus('authResetStatus');
}

function inferAuthCallbackFlow(params, description = '') {
  const explicitType = String(params.get('type') || '').trim().toLowerCase();
  if (explicitType === 'recovery') return AUTH_CALLBACK_FLOW.RECOVERY;
  if (explicitType === 'signup' || explicitType === 'invite') return AUTH_CALLBACK_FLOW.SIGNUP;
  if (/recover|reset password|otp|magic link/i.test(description)) return AUTH_CALLBACK_FLOW.RECOVERY;
  if (/confirm|signup|sign up|verify email/i.test(description)) return AUTH_CALLBACK_FLOW.SIGNUP;
  return AUTH_CALLBACK_FLOW.GENERIC;
}

function readAuthCallbackError() {
  const searchParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams((window.location.hash || '').replace(/^#/, ''));
  const params = [hashParams, searchParams].find((candidate) => candidate.has('error') || candidate.has('error_description'));
  if (!params) return null;

  const description = params.get('error_description') || params.get('error') || 'This link is invalid or has expired.';

  return {
    code: params.get('error_code') || params.get('error') || '',
    description,
    flow: inferAuthCallbackFlow(params, description),
  };
}

function clearAuthCallbackHash() {
  const url = new URL(window.location.href);
  let changed = false;

  if (url.hash && /(access_token=|refresh_token=|type=recovery|type=signup|type=invite|error=|error_description=|error_code=)/.test(url.hash)) {
    url.hash = '';
    changed = true;
  }

  ['error', 'error_code', 'error_description'].forEach((key) => {
    if (url.searchParams.has(key)) {
      url.searchParams.delete(key);
      changed = true;
    }
  });

  if (!changed) return;
  const nextSearch = url.searchParams.toString();
  const cleanUrl = `${url.pathname}${nextSearch ? `?${nextSearch}` : ''}${url.hash}`;
  window.history.replaceState({}, document.title, cleanUrl);
}

function scheduleAuthStageRefresh() {
  if (verifyResendRefreshTimer) {
    clearTimeout(verifyResendRefreshTimer);
    verifyResendRefreshTimer = null;
  }
  const verifyRemaining = authModalState.stage === 'verify'
    ? Number(authModalState.verifyResendCooldownUntil || 0) - Date.now()
    : 0;
  const forgotRemaining = authModalState.stage === 'forgot'
    ? Number(authModalState.forgotSubmitCooldownUntil || 0) - Date.now()
    : 0;
  const accountRemaining = document.getElementById('accountModal')?.classList.contains('open')
    ? getAccountPasswordCooldownUntil() - Date.now()
    : 0;
  const remaining = Math.max(verifyRemaining, forgotRemaining, accountRemaining);
  if (remaining <= 0) return;
  verifyResendRefreshTimer = window.setTimeout(() => {
    renderAuthModal();
    renderAccountModal();
  }, Math.min(remaining, 1000));
}

function refreshAuthCooldownUiOnResume() {
  const hasAuthModalCooldown = Boolean(authModalState.verifyResendCooldownUntil || authModalState.forgotSubmitCooldownUntil);
  const hasAccountCooldown = Boolean(getAccountPasswordCooldownUntil());
  if (!hasAuthModalCooldown && !hasAccountCooldown) return;

  if (hasAuthModalCooldown) renderAuthModal();
  if (hasAccountCooldown) renderAccountModal();
  scheduleAuthStageRefresh();
}

function getVerifyStageConfig() {
  const verifyEmail = authModalState.verifyEmail || tr('auth.yourEmail', {}, 'your email');
  const isRecoveryCallback = authModalState.callbackErrorFlow === AUTH_CALLBACK_FLOW.RECOVERY;
  switch (authModalState.verifyKind) {
    case AUTH_VERIFY_KIND.SIGNUP_EXISTING_HINT:
      return {
        icon: 'mail_lock',
        modalTitle: tr('auth.verify.existing.modalTitle', {}, 'Use your existing account'),
        modalDesc: tr('auth.verify.existing.modalDesc', {}, 'This email may already belong to a Supericons account. Sign in instead of creating another one.'),
        modalNote: tr('auth.verify.existing.modalNote', {}, 'If you usually sign in with Google, continue with Google. Otherwise go back and sign in with your email.'),
        stageTitle: tr('auth.verify.existing.stageTitle', {}, 'Account already exists'),
        stageText: tr('auth.verify.existing.stageText', { email: verifyEmail }, '{email} may already be tied to an existing Supericons account.'),
        showGoogle: true,
        showResend: false,
        backLabel: tr('auth.backToSignIn', {}, 'Back to sign in'),
      };
    case AUTH_VERIFY_KIND.SIGNIN_UNCONFIRMED:
      return {
        icon: 'mark_email_unread',
        modalTitle: tr('auth.verify.unconfirmed.modalTitle', {}, 'Confirm your email'),
        modalDesc: tr('auth.verify.unconfirmed.modalDesc', {}, 'Check your inbox to confirm your email address before signing in.'),
        modalNote: tr('auth.verify.unconfirmed.modalNote', {}, 'If you cannot find the email, or the link no longer works, send a new confirmation email below.'),
        stageTitle: tr('auth.verify.unconfirmed.stageTitle', {}, 'Email confirmation needed'),
        stageText: tr('auth.verify.unconfirmed.stageText', { email: verifyEmail }, 'Send a new confirmation email to {email}.'),
        showGoogle: false,
        showResend: true,
        backLabel: tr('auth.backToSignIn', {}, 'Back to sign in'),
        primaryActionLabel: tr('auth.resendConfirmation', {}, 'Resend confirmation'),
      };
    case AUTH_VERIFY_KIND.CALLBACK_ERROR:
      return {
        icon: 'link_off',
        modalTitle: isRecoveryCallback
          ? tr('auth.verify.callback.resetTitle', {}, 'This reset link is no longer valid')
          : tr('auth.verify.callback.linkTitle', {}, 'This link is no longer valid'),
        modalDesc: isRecoveryCallback
          ? tr('auth.verify.callback.resetDesc', {}, 'The password reset link is invalid, incomplete, or has expired.')
          : tr('auth.verify.callback.linkDesc', {}, 'The sign-in or recovery link is invalid, incomplete, or has expired.'),
        modalNote: isRecoveryCallback
          ? tr('auth.verify.callback.resetNote', {}, 'Request a fresh reset email and try again.')
          : tr('auth.verify.callback.linkNote', {}, 'Start over from Supericons and request a fresh email if needed.'),
        stageTitle: tr('auth.verify.callback.stageTitle', {}, 'Link expired or invalid'),
        stageText: authModalState.callbackErrorMessage || tr('auth.verify.callback.stageText', {}, 'This link can no longer be used.'),
        showGoogle: false,
        showResend: isRecoveryCallback,
        backLabel: tr('auth.backToSignIn', {}, 'Back to sign in'),
        primaryActionLabel: isRecoveryCallback ? tr('auth.getNewResetLink', {}, 'Get a new reset link') : tr('auth.resendConfirmation', {}, 'Resend confirmation'),
      };
    case AUTH_VERIFY_KIND.SIGNUP_PENDING:
    default:
      return {
        icon: 'mark_email_read',
        modalTitle: tr('auth.verify.pending.modalTitle', {}, 'Check your email'),
        modalDesc: tr('auth.verify.pending.modalDesc', {}, 'Open the confirmation email to finish creating your Supericons account.'),
        modalNote: tr('auth.verify.pending.modalNote', {}, 'If it does not show up right away, you can request another in about a minute.'),
        stageTitle: tr('auth.verify.pending.stageTitle', {}, 'Check your email'),
        stageText: tr('auth.verify.pending.stageText', { email: verifyEmail }, 'Look for the confirmation email we sent to {email}.'),
        showGoogle: false,
        showResend: true,
        backLabel: tr('auth.backToSignIn', {}, 'Back to sign in'),
        primaryActionLabel: tr('auth.resendConfirmation', {}, 'Resend confirmation'),
      };
  }
}

function getCompletionStageConfig() {
  switch (authModalState.completionKind) {
    case AUTH_COMPLETION_KIND.PASSWORD_UPDATED:
      return {
        icon: 'lock_reset',
        modalTitle: tr('auth.completion.passwordUpdated.modalTitle', {}, 'Password updated'),
        modalDesc: tr('auth.completion.passwordUpdated.modalDesc', {}, 'Your password has been changed.'),
        modalNote: tr('auth.completion.passwordUpdated.modalNote', {}, 'Your original Supericons tab has been updated if it is still open.'),
        stageTitle: tr('auth.completion.passwordUpdated.stageTitle', {}, 'Password updated'),
        stageText: tr('auth.completion.passwordUpdated.stageText', {}, 'You can return to your original Supericons tab, continue here, or close this tab.'),
      };
    case AUTH_COMPLETION_KIND.EMAIL_CONFIRMED:
      return {
        icon: 'task_alt',
        modalTitle: tr('auth.completion.emailConfirmed.modalTitle', {}, 'Email confirmed'),
        modalDesc: tr('auth.completion.emailConfirmed.modalDesc', {}, 'Your Supericons account is ready.'),
        modalNote: tr('auth.completion.emailConfirmed.modalNote', {}, 'Your original Supericons tab has been updated if it is still open.'),
        stageTitle: tr('auth.completion.emailConfirmed.stageTitle', {}, 'Email confirmed'),
        stageText: tr('auth.completion.emailConfirmed.stageText', {}, 'You can return to your original Supericons tab, continue here, or close this tab.'),
      };
    case AUTH_COMPLETION_KIND.SIGNED_IN:
    default:
      return {
        icon: 'login',
        modalTitle: tr('auth.completion.signedIn.modalTitle', {}, 'Signed in'),
        modalDesc: tr('auth.completion.signedIn.modalDesc', {}, 'You are signed in to Supericons.'),
        modalNote: tr('auth.completion.signedIn.modalNote', {}, 'Your original Supericons tab has been updated if it is still open.'),
        stageTitle: tr('auth.completion.signedIn.stageTitle', {}, 'Signed in'),
        stageText: tr('auth.completion.signedIn.stageText', {}, 'You can return to your original Supericons tab, continue here, or close this tab.'),
      };
  }
}

function focusAuthPrimaryField() {
  window.requestAnimationFrame(() => {
    if (authModalState.stage === 'verify') {
      const primaryVerifyAction = document.getElementById('authVerifyResendBtn')?.hidden
        ? null
        : document.getElementById('authVerifyResendBtn');
      const verifyGoogleAction = document.getElementById('authVerifyGoogleBtn')?.hidden
        ? null
        : document.getElementById('authVerifyGoogleBtn');
      (primaryVerifyAction || verifyGoogleAction || document.getElementById('authVerifyBackBtn'))?.focus();
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
    if (authModalState.stage === 'complete') {
      document.getElementById('authCompletionContinueBtn')?.focus();
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
  const verifyIcon = document.getElementById('authVerifyIcon');
  const verifyTitle = document.getElementById('authVerifyTitle');
  const forgotStage = document.getElementById('authForgotStage');
  const resetStage = document.getElementById('authResetStage');
  const resetIcon = document.getElementById('authResetIcon');
  const resetStageTitle = document.getElementById('authResetStageTitle');
  const completionStage = document.getElementById('authCompletionStage');
  const completionIcon = document.getElementById('authCompletionIcon');
  const completionTitle = document.getElementById('authCompletionTitle');
  const completionText = document.getElementById('authCompletionText');
  const completionContinueBtn = document.getElementById('authCompletionContinueBtn');
  const completionCloseTabBtn = document.getElementById('authCompletionCloseTabBtn');
  const submitText = document.getElementById('authSubmitText');
  const toggleText = document.getElementById('authToggleText');
  const passwordInput = document.getElementById('authPassword');
  const googleBtn = document.getElementById('authGoogleBtn');
  const verifyGoogleBtn = document.getElementById('authVerifyGoogleBtn');
  const verifyResendBtn = document.getElementById('authVerifyResendBtn');
  const divider = document.querySelector('.auth-modal__divider');
  const forgotWrap = document.getElementById('authForgotWrap');
  const verifyText = document.getElementById('authVerifyText');
  const forgotEmailInput = document.getElementById('authForgotEmail');
  const forgotSubmitBtn = document.getElementById('authForgotSubmitBtn');
  const forgotSubmitText = document.getElementById('authForgotSubmitText');
  const resetText = document.getElementById('authResetText');
  const resetEmailInput = document.getElementById('authResetEmail');
  const resetSubmitText = document.getElementById('authResetSubmitText');
  const copy = getAuthCopy();
  const isVerifyStage = authModalState.stage === 'verify';
  const isForgotStage = authModalState.stage === 'forgot';
  const isResetStage = authModalState.stage === 'reset';
  const isCompletionStage = authModalState.stage === 'complete';
  const verifyConfig = getVerifyStageConfig();
  const completionConfig = getCompletionStageConfig();
  const verifyCooldownRemaining = Math.max(0, Number(authModalState.verifyResendCooldownUntil || 0) - Date.now());
  const forgotCooldownRemaining = Math.max(0, Number(authModalState.forgotSubmitCooldownUntil || 0) - Date.now());
  const isAddPasswordReset = authModalState.resetKind === AUTH_RESET_KIND.ADD_PASSWORD;

  if (modalTitle) {
    modalTitle.textContent = isVerifyStage
      ? verifyConfig.modalTitle
      : isForgotStage
        ? tr('auth.forgot.title', {}, 'Reset your password')
        : isResetStage
          ? tr('auth.reset.title', {}, 'Set a new password')
          : isCompletionStage
            ? completionConfig.modalTitle
            : copy.title;
  }
  if (modalDesc) {
    if (isVerifyStage) {
      modalDesc.textContent = verifyConfig.modalDesc;
    } else if (isForgotStage) {
      modalDesc.textContent = tr('auth.forgot.description', {}, 'Enter your account email and we will send you a secure reset link.');
    } else if (isResetStage) {
      modalDesc.textContent = isAddPasswordReset
        ? tr('auth.reset.addDescription', {}, 'Create a password so you can sign in with email as well as Google.')
        : tr('auth.reset.description', {}, 'Choose a new password to secure your Supericons account.');
    } else if (isCompletionStage) {
      modalDesc.textContent = completionConfig.modalDesc;
    } else {
      modalDesc.textContent = copy.desc;
    }
  }
  if (modalNote) {
    if (isVerifyStage) {
      modalNote.textContent = verifyConfig.modalNote;
    } else if (isForgotStage) {
      modalNote.textContent = tr('auth.forgot.note', {}, 'The recovery link will bring you back here to choose a new password.');
    } else if (isResetStage) {
      modalNote.textContent = isAddPasswordReset
        ? tr('auth.reset.addNote', {}, 'Google sign-in will keep working after you add password access.')
        : tr('auth.reset.note', {}, 'Use at least 8 characters. Strong passwords are recommended.');
    } else if (isCompletionStage) {
      modalNote.textContent = completionConfig.modalNote;
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
  if (formStage) formStage.hidden = isVerifyStage || isForgotStage || isResetStage || isCompletionStage;
  if (verifyStage) verifyStage.hidden = !isVerifyStage;
  if (forgotStage) forgotStage.hidden = !isForgotStage;
  if (resetStage) resetStage.hidden = !isResetStage;
  if (completionStage) completionStage.hidden = !isCompletionStage;
  if (googleBtn) googleBtn.hidden = isVerifyStage || isForgotStage || isResetStage || isCompletionStage;
  if (completionIcon) completionIcon.textContent = completionConfig.icon;
  if (completionTitle) completionTitle.textContent = completionConfig.stageTitle;
  if (completionText) completionText.textContent = completionConfig.stageText;
  if (completionContinueBtn) completionContinueBtn.textContent = tr('auth.completion.continueHere', {}, 'Continue here');
  if (completionCloseTabBtn) completionCloseTabBtn.textContent = tr('auth.completion.closeThisTab', {}, 'Close this tab');
  if (verifyIcon) verifyIcon.textContent = verifyConfig.icon;
  if (verifyTitle) verifyTitle.textContent = verifyConfig.stageTitle;
  if (verifyGoogleBtn) verifyGoogleBtn.hidden = !isVerifyStage || !verifyConfig.showGoogle;
  if (verifyResendBtn) {
    verifyResendBtn.hidden = !isVerifyStage || !verifyConfig.showResend;
    verifyResendBtn.disabled = verifyCooldownRemaining > 0;
    verifyResendBtn.textContent = verifyCooldownRemaining > 0
      ? tr('auth.resendInSeconds', { seconds: Math.ceil(verifyCooldownRemaining / 1000) }, 'Resend in {seconds}s')
      : (verifyConfig.primaryActionLabel || tr('auth.resendConfirmation', {}, 'Resend confirmation'));
  }
  if (forgotSubmitBtn) {
    forgotSubmitBtn.disabled = forgotCooldownRemaining > 0;
  }
  if (forgotSubmitText) {
    forgotSubmitText.textContent = forgotCooldownRemaining > 0
      ? tr('auth.sendAgainInSeconds', { seconds: Math.ceil(forgotCooldownRemaining / 1000) }, 'Send again in {seconds}s')
      : tr('auth.sendResetLink', {}, 'Send reset link');
  }
  if (divider) divider.hidden = isVerifyStage || isForgotStage || isResetStage || isCompletionStage;
  if (forgotWrap) forgotWrap.hidden = authModalState.mode !== 'signin' || isVerifyStage || isForgotStage || isResetStage || isCompletionStage;
  if (verifyText) {
    verifyText.textContent = verifyConfig.stageText;
  }
  if (resetIcon) resetIcon.textContent = isAddPasswordReset ? 'key' : 'password';
  if (resetStageTitle) resetStageTitle.textContent = isAddPasswordReset
    ? tr('auth.reset.addTitle', {}, 'Add password sign-in')
    : tr('auth.reset.title', {}, 'Set a new password');
  if (forgotEmailInput && authModalState.recoveryEmail) {
    forgotEmailInput.value = authModalState.recoveryEmail;
  }
  if (resetText) {
    resetText.textContent = authModalState.recoveryEmail
      ? (isAddPasswordReset
        ? tr('auth.reset.createForEmail', { email: authModalState.recoveryEmail }, 'Create a password for {email}.')
        : tr('auth.reset.chooseForEmail', { email: authModalState.recoveryEmail }, 'Choose a new password for {email}.'))
      : (isAddPasswordReset
        ? tr('auth.reset.createForAccount', {}, 'Create a password for your account.')
        : tr('auth.reset.chooseForAccount', {}, 'Choose a new password for your account.'));
  }
  if (resetEmailInput) {
    resetEmailInput.value = authModalState.recoveryEmail || currentUser?.email || '';
  }
  if (resetSubmitText) {
    resetSubmitText.textContent = isAddPasswordReset
      ? tr('account.password.setPassword', {}, 'Set password')
      : tr('auth.updatePassword', {}, 'Update password');
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
  scheduleAuthStageRefresh();
}

function resetAuthModalState() {
  if (verifyResendRefreshTimer) {
    clearTimeout(verifyResendRefreshTimer);
    verifyResendRefreshTimer = null;
  }
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

function showAuthVerifyStage(email, {
  kind = AUTH_VERIFY_KIND.SIGNUP_PENDING,
  callbackErrorMessage = '',
  callbackErrorFlow = AUTH_CALLBACK_FLOW.GENERIC,
  startCooldown = false,
  statusMessage = '',
  statusType = 'success',
} = {}) {
  const nextVerifyResendCooldownUntil = startCooldown
    ? Date.now() + AUTH_EMAIL_REQUEST_COOLDOWN_MS
    : 0;
  authModalState = {
    ...authModalState,
    mode: 'signin',
    stage: 'verify',
    verifyEmail: email || '',
    verifyKind: kind,
    verifyResendCooldownUntil: nextVerifyResendCooldownUntil,
    callbackErrorMessage,
    callbackErrorFlow,
  };
  setAuthStatus();
  setStageStatus('authVerifyStatus', statusMessage, statusMessage ? statusType : '');
  resetAuthForm({ preserveEmail: true });
  resetRecoveryForms();
  renderAuthModal();
  document.getElementById('authModal')?.classList.add('open');
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

function showPasswordResetStage(email = '', {
  kind = AUTH_RESET_KIND.PASSWORD_RECOVERY,
} = {}) {
  authModalState = {
    ...authModalState,
    mode: 'signin',
    stage: 'reset',
    recoveryEmail: email || authModalState.recoveryEmail || currentUser?.email || '',
    resetKind: kind,
  };
  setAuthStatus();
  resetAuthForm();
  resetRecoveryForms();
  renderAuthModal();
  document.getElementById('authModal')?.classList.add('open');
  focusAuthPrimaryField();
}

function showAuthCompletionStage(kind = AUTH_COMPLETION_KIND.SIGNED_IN) {
  authModalState = {
    ...AUTH_MODAL_DEFAULT_STATE,
    stage: 'complete',
    completionKind: kind,
  };
  resetAuthForm();
  resetRecoveryForms();
  setAuthStatus();
  setStageStatus('authCompletionStatus');
  renderAuthModal();
  document.getElementById('authModal')?.classList.add('open');
  focusAuthPrimaryField();
}

function startVerifyResendCooldown() {
  authModalState = {
    ...authModalState,
    verifyResendCooldownUntil: Date.now() + AUTH_EMAIL_REQUEST_COOLDOWN_MS,
  };
  renderAuthModal();
}

function startForgotPasswordCooldown() {
  authModalState = {
    ...authModalState,
    forgotSubmitCooldownUntil: Date.now() + AUTH_EMAIL_REQUEST_COOLDOWN_MS,
  };
  renderAuthModal();
}

function startAccountPasswordCooldown() {
  const deadline = Date.now() + AUTH_EMAIL_REQUEST_COOLDOWN_MS;
  writeStoredAccountPasswordCooldownUntil(deadline);
  authModalState = {
    ...authModalState,
    accountPasswordCooldownUntil: deadline,
  };
  renderAccountModal();
}

function isAuthRateLimitError(error) {
  return /too many requests|rate limit|wait a little/i.test(String(error?.message || ''));
}

function getNormalizedSignInError(error) {
  const message = String(error?.message || '').trim();
  if (/email.*not confirmed/i.test(message)) {
    return {
      kind: 'verify',
      verifyKind: AUTH_VERIFY_KIND.SIGNIN_UNCONFIRMED,
    };
  }
  if (/invalid login credentials/i.test(message)) {
    return {
      kind: 'status',
      message: tr('auth.errors.invalidCredentials', {}, 'That email and password did not match. If you usually sign in with Google, continue with Google instead.'),
    };
  }
  if (isAuthRateLimitError(error)) {
    return {
      kind: 'status',
      message: tr('auth.errors.tooManyAttempts', {}, 'Too many attempts right now. Please wait a moment and try again.'),
    };
  }
  return {
    kind: 'status',
    message: message || tr('auth.errors.signInFailed', {}, 'We could not sign you in right now.'),
  };
}

function getNormalizedSignUpError(error) {
  const message = String(error?.message || '').trim();
  if (isAuthRateLimitError(error)) {
    return {
      kind: 'status',
      message: tr('auth.errors.tooManySignupAttempts', {}, 'Too many signup attempts right now. Please wait a moment and try again.'),
    };
  }
  if (/user already registered/i.test(message)) {
    return {
      kind: 'verify',
      verifyKind: AUTH_VERIFY_KIND.SIGNUP_EXISTING_HINT,
    };
  }
  if (/password/i.test(message)) {
    return {
      kind: 'status',
      message: message || tr('auth.errors.passwordMin', {}, 'Use at least 8 characters for your password.'),
    };
  }
  return {
    kind: 'status',
    message: message || tr('auth.errors.signupFailed', {}, 'We could not create your account right now.'),
  };
}

function getNormalizedForgotPasswordError(error) {
  const message = String(error?.message || '').trim();
  if (isAuthRateLimitError(error)) {
    return tr('auth.errors.resetTooSoon', {}, 'Please wait a moment before requesting another reset email.');
  }
  return message || tr('auth.errors.resetFailed', {}, 'We could not send a reset email right now.');
}

function getNormalizedResendError(error) {
  const message = String(error?.message || '').trim();
  if (isAuthRateLimitError(error)) {
    return tr('auth.errors.confirmationTooSoon', {}, 'A confirmation email was just sent. Please wait about a minute before requesting another.');
  }
  return tr('auth.errors.resendFailed', {}, 'We could not send another confirmation email right now. If you already have an account, sign in instead.');
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
  const verifyGoogleBtn = document.getElementById('authVerifyGoogleBtn');
  const verifyResendBtn = document.getElementById('authVerifyResendBtn');
  const form = document.getElementById('authForm');
  const submitBtn = document.getElementById('authSubmitBtn');
  const forgotBtn = document.getElementById('authForgotBtn');
  const forgotForm = document.getElementById('authForgotForm');
  const forgotSubmitBtn = document.getElementById('authForgotSubmitBtn');
  const forgotBackBtn = document.getElementById('authForgotBackBtn');
  const resetForm = document.getElementById('authResetForm');
  const resetSubmitBtn = document.getElementById('authResetSubmitBtn');
  const verifyBackBtn = document.getElementById('authVerifyBackBtn');
  const completionContinueBtn = document.getElementById('authCompletionContinueBtn');
  const completionCloseTabBtn = document.getElementById('authCompletionCloseTabBtn');

  renderAuthModal();

  window.addEventListener('supericons:locale-change', () => {
    renderAuthModal();
    renderAccountModal();
  });
  window.addEventListener('focus', refreshAuthCooldownUiOnResume);
  window.addEventListener('pageshow', refreshAuthCooldownUiOnResume);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) refreshAuthCooldownUiOnResume();
  });
  window.addEventListener('storage', (event) => {
    if (event.key?.startsWith(AUTH_ACCOUNT_PASSWORD_COOLDOWN_STORAGE_PREFIX)) {
      refreshAuthCooldownUiOnResume();
    }
  });

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
      setStageStatus('authVerifyStatus');
      renderAuthModal();
      focusAuthPrimaryField();
    });
  }
  if (completionContinueBtn) {
    completionContinueBtn.addEventListener('click', () => {
      closeAuthModal({ preserveIntent: true, resetToDefault: true });
    });
  }
  if (completionCloseTabBtn) {
    completionCloseTabBtn.addEventListener('click', () => {
      window.close();
      window.setTimeout(() => {
        setStageStatus(
          'authCompletionStatus',
          tr('auth.completion.closeBlocked', {}, 'Your browser did not close this tab automatically. You can close it manually.'),
          '',
        );
      }, 250);
    });
  }
  if (verifyResendBtn) {
    verifyResendBtn.addEventListener('click', async () => {
      const email = authModalState.verifyEmail?.trim();
      const cooldownUntil = Number(authModalState.verifyResendCooldownUntil || 0);
      if (authModalState.verifyKind === AUTH_VERIFY_KIND.CALLBACK_ERROR && authModalState.callbackErrorFlow === AUTH_CALLBACK_FLOW.RECOVERY) {
        showForgotPasswordStage(authModalState.recoveryEmail || currentUser?.email || '');
        return;
      }
      if (!email || Date.now() < cooldownUntil) return;

      verifyResendBtn.disabled = true;
      setStageStatus('authVerifyStatus');

      try {
        await resendSignupConfirmation(email);
        startVerifyResendCooldown();
        const resendMessage = authModalState.verifyKind === AUTH_VERIFY_KIND.SIGNIN_UNCONFIRMED
          ? tr('auth.verify.unconfirmed.resentStatus', { email }, 'A new confirmation email has been sent to {email}.')
          : tr('auth.verify.pending.resentStatus', { email }, 'Check {email} for a new confirmation email.');
        setStageStatus('authVerifyStatus', resendMessage, 'success');
      } catch (err) {
        setStageStatus('authVerifyStatus', getNormalizedResendError(err), 'error');
      } finally {
        renderAuthModal();
      }
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
      try {
        await signOut();
        window.location.replace(window.location.origin);
      } catch (err) {
        showToast(err?.message || tr('auth.errors.signOutFailed', {}, 'Could not sign you out right now.'));
      }
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
        setAuthStatus(err.message || tr('auth.errors.googleFailed', {}, 'Google sign-in failed'), 'error');
      }
    });
  }

  if (verifyGoogleBtn) {
    verifyGoogleBtn.addEventListener('click', async () => {
      try {
        await signInWithGoogle();
      } catch (err) {
        showToast(err.message || tr('auth.errors.googleFailed', {}, 'Google sign-in failed'));
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
            const isExistingHint = isLikelyExistingSignupResult(result);
            showAuthVerifyStage(email, {
              kind: isExistingHint
                ? AUTH_VERIFY_KIND.SIGNUP_EXISTING_HINT
                : AUTH_VERIFY_KIND.SIGNUP_PENDING,
              startCooldown: !isExistingHint,
              statusMessage: isExistingHint
                ? ''
                : tr('auth.verify.pending.sentStatus', { email }, 'We sent a confirmation email to {email}. You can request another in about a minute.'),
            });
          }
        } else {
          await signInWithEmail(email, password);
          closeAuthModal({ preserveIntent: true, resetToDefault: true });
          resetAuthForm();
        }
      } catch (err) {
        if (form.dataset.mode === 'signup') {
          const normalized = getNormalizedSignUpError(err);
          if (normalized.kind === 'verify') {
            showAuthVerifyStage(email, { kind: normalized.verifyKind });
          } else {
            setAuthStatus(normalized.message, 'error');
          }
        } else {
          const normalized = getNormalizedSignInError(err);
          if (normalized.kind === 'verify') {
            showAuthVerifyStage(email, { kind: normalized.verifyKind });
          } else {
            setAuthStatus(normalized.message, 'error');
          }
        }
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }

  if (forgotForm) {
    forgotForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const email = document.getElementById('authForgotEmail')?.value?.trim();
      const cooldownUntil = Number(authModalState.forgotSubmitCooldownUntil || 0);
      if (!email) return;
      if (Date.now() < cooldownUntil) return;

      if (forgotSubmitBtn) forgotSubmitBtn.disabled = true;
      setStageStatus('authForgotStatus');

      try {
        authModalState = {
          ...authModalState,
          recoveryEmail: email,
        };
        await requestPasswordReset(email);
        startForgotPasswordCooldown();
        setStageStatus('authForgotStatus', tr('auth.forgot.sentStatus', { email }, 'If an account matches {email}, you will get a reset link shortly.'), 'success');
      } catch (err) {
        if (isAuthRateLimitError(err)) {
          startForgotPasswordCooldown();
          setStageStatus('authForgotStatus', tr('auth.forgot.sentStatus', { email }, 'If an account matches {email}, you will get a reset link shortly.'), 'success');
        } else {
          setStageStatus('authForgotStatus', getNormalizedForgotPasswordError(err), 'error');
        }
      } finally {
        renderAuthModal();
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
        setStageStatus('authResetStatus', tr('auth.errors.passwordTooShort', {}, 'Use at least 8 characters for your new password.'), 'error');
        return;
      }
      if (nextPassword !== confirmPassword) {
        setStageStatus('authResetStatus', tr('auth.errors.passwordsMismatch', {}, 'Passwords do not match yet.'), 'error');
        return;
      }

      if (resetSubmitBtn) resetSubmitBtn.disabled = true;
      setStageStatus('authResetStatus');

      try {
        const passwordChangeNotificationToken = await getCurrentAccessToken();
        await updateUserPassword(nextPassword);
        try {
          await notifyPasswordChanged(passwordChangeNotificationToken);
        } catch (notifyErr) {
          console.warn('[Auth] Password changed but notification email failed:', notifyErr);
        }
        clearAuthCallbackHash();
        const resetKind = authModalState.resetKind;
        publishAuthFlowEvent('password_updated', {
          resetKind,
          email: currentUser?.email || '',
        });
        dispatchAuthSignedIn();
        if (resetKind === AUTH_RESET_KIND.PASSWORD_RECOVERY) {
          showAuthCompletionStage(AUTH_COMPLETION_KIND.PASSWORD_UPDATED);
        } else {
          closeAuthModal({ preserveIntent: true, resetToDefault: true });
          showToast(tr('auth.toast.passwordSignInAdded', {}, 'Password sign-in added'));
        }
      } catch (err) {
        setStageStatus('authResetStatus', err.message || tr('auth.errors.updatePasswordFailed', {}, 'Could not update password'), 'error');
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
        setAccountStatus('accountProfileStatus', tr('account.profile.enterName', {}, 'Enter a display name to save.'), 'error');
        return;
      }
      if (displayName.length < 2) {
        setAccountStatus('accountProfileStatus', tr('account.profile.nameTooShort', {}, 'Use at least 2 characters for your display name.'), 'error');
        return;
      }

      if (accountSaveBtn) accountSaveBtn.disabled = true;
      setAccountStatus('accountProfileStatus');

      try {
        await updateUserProfile({ displayName });
        renderAccountModal();
        setAccountStatus('accountProfileStatus', tr('account.profile.saved', {}, 'Display name saved.'), 'success');
        showToast(tr('account.toast.updated', {}, 'Account updated'));
      } catch (err) {
        setAccountStatus('accountProfileStatus', err.message || tr('account.profile.saveFailed', {}, 'Could not save display name'), 'error');
      } finally {
        if (accountSaveBtn) accountSaveBtn.disabled = false;
      }
    });
  }

  if (accountPasswordBtn) {
    accountPasswordBtn.addEventListener('click', async () => {
      const email = currentUser?.email?.trim();
      if (!email) {
        setAccountStatus('accountPasswordStatus', tr('account.password.noEmail', {}, 'No signed-in email is available for this account.'), 'error');
        return;
      }
      if (Date.now() < getAccountPasswordCooldownUntil()) {
        renderAccountModal();
        return;
      }

      accountPasswordBtn.disabled = true;
      setAccountStatus('accountPasswordStatus');

      try {
        if (isOAuthOnlyUser()) {
          closeAccountModal({ resetState: true });
          showPasswordResetStage(email, { kind: AUTH_RESET_KIND.ADD_PASSWORD });
          setStageStatus('authResetStatus', tr('account.password.addStatus', {}, 'Set a password you can use alongside Google sign-in.'), 'success');
        } else {
          await requestPasswordReset(email);
          startAccountPasswordCooldown();
          setAccountStatus('accountPasswordStatus', tr('account.password.resetSent', { email }, 'A password reset email has been sent to {email}.'), 'success');
          showToast(tr('account.password.resetToast', {}, 'Password reset email sent'));
        }
      } catch (err) {
        if (isAuthRateLimitError(err)) {
          startAccountPasswordCooldown();
          setAccountStatus('accountPasswordStatus', tr('account.password.resetSent', { email }, 'A password reset email has been sent to {email}.'), 'success');
        } else {
          setAccountStatus('accountPasswordStatus', getNormalizedForgotPasswordError(err), 'error');
        }
      } finally {
        renderAccountModal();
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
