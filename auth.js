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
let creditBalance = 0;
let authEpoch = 0;
let authReadyPromise = Promise.resolve();
let resolveAuthReady = null;

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
  creditBalance = 0;
  updateProBadge();
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

    if (event === 'SIGNED_IN') {
      showToast('Signed in successfully');
      const signInEpoch = beginAuthCycle();
      void fetchSubscriptionForEpoch(signInEpoch);
    } else if (event === 'SIGNED_OUT') {
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
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: window.location.origin,
    },
  });
  if (error) throw error;
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

export function getCreditBalance() {
  return creditBalance;
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

    if (subscriptionStatus === 'active') {
      // Credits are a secondary side effect. Do not block auth readiness on them.
      void fetchCreditBalance(userId);
      return;
    }

    creditBalance = 0;
    return;
  } catch (e) {
    if (epoch !== authEpoch || currentUser?.id !== userId) return;
    console.warn('[Auth] Failed to fetch subscription:', e.message);
    resetProState();
    resolveCurrentAuthReady();
    return;
  }
}

async function fetchCreditBalance(expectedUserId = currentUser?.id) {
  if (!expectedUserId || !supabase) { creditBalance = 0; return; }
  try {
    const { data, error } = await supabase
      .from('si_credits')
      .select('type')
      .eq('user_id', expectedUserId);
    if (currentUser?.id !== expectedUserId) return;
    if (error || !data) {
      creditBalance = 0;
    } else {
      const earned = data.filter(c => c.type === 'earned' || c.type === 'bonus').length;
      const redeemed = data.filter(c => c.type === 'redeemed').length;
      creditBalance = earned - redeemed;
    }
  } catch (e) {
    if (currentUser?.id !== expectedUserId) return;
    console.warn('[Auth] Failed to fetch credits:', e.message);
    creditBalance = 0;
  }
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
  } else {
    // Logged out: show sign-in, hide avatar
    if (signInBtn) signInBtn.style.display = 'flex';
    if (avatarBtn) avatarBtn.style.display = 'none';
    if (myDownloadsItem) myDownloadsItem.style.display = 'none';
  }
}

// ── Modal Logic ───────────────────────────────────────────────
function wireAuthListeners() {
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
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}
