/**
 * Supericons Store Module
 * Handles collection catalog rendering, view switching, and Stripe checkout.
 */

import {
  getUser,
  getSupabase,
  isLoggedIn,
  isPro,
  getClaimStatus,
  fetchClaimStatus,
  invalidateClaimStatus,
  waitForAuth,
  openAuthModal,
  setAuthIntent,
  consumeAuthIntent,
} from './auth.js';
import {
  sanitizeCssCommentMetadata,
  sanitizeSvgExportMarkup,
} from './lib/public-metadata-sanitizer.js';
import {
  MOTION_LAB_PRESETS,
} from './lib/motion-lab-presets.js';
import {
  DOCS_PAGE_GROUPS,
  DOCS_PAGE_VIEWS,
  getDocsPageConfig,
} from './docs-pages.js';
import {
  searchDocs,
} from './lib/docs-search-index.js';
import { getDocsGuideConfig } from './lib/docs-guide-config.js';
import { PRODUCT_FACT_LABELS } from './lib/product-facts.js';
import {
  renderDocsArticleMarkup,
  renderDocsSiteShellMarkup,
} from './lib/docs-site-render.js';
import {
  buildRouteUrl,
  getRouteMeta,
  hasDirectRouteView,
  normalizeRouteView,
  shouldPersistRouteView,
} from './lib/view-route-policy.js';

// ── Constants ─────────────────────────────────────────────────
const SUPABASE_URL = 'https://kcjmkakdhsqplvasgkjv.supabase.co';
const SUPABASE_ANON = 'sb_publishable_slbcWcnrQ45rkJPONFD7pw_hW0WpvBi';
const PREMIUM_ASSET_FN = `${SUPABASE_URL}/functions/v1/serve-premium-asset`;
const STRIPE_PRO_MONTHLY = 'price_1TJVJE35D7agOGFjE6iECyMD';
const STRIPE_PRO_YEARLY = 'price_1TJVJC35D7agOGFjKc0GlrAy';
const STRIPE_LAUNCH_EDITION = 'price_1TJVJ935D7agOGFjrIsRlAOS';
const API_KEY_LIMIT = 5;
const PRO_PLANS = {
  monthly: {
    key: 'monthly',
    label: 'Monthly',
    priceId: STRIPE_PRO_MONTHLY,
    amount: '$15',
    period: '/mo',
    ctaLabel: '$15/mo',
  },
  annual: {
    key: 'annual',
    label: 'Annual',
    priceId: STRIPE_PRO_YEARLY,
    amount: '$99',
    period: '/yr',
    originalAmount: '$180',
    ctaLabel: '$99/yr',
  },
};
const PRO_WORKFLOW_BULLET = 'Workflow tools: Motion Lab, Converter (PNG <-> SVG)';
const freeIconsRounded = PRODUCT_FACT_LABELS.freeIconsRounded;
const freeIconsLabel = PRODUCT_FACT_LABELS.freeIconsLabel;
const freeIconsAcrossLibrariesLabel = PRODUCT_FACT_LABELS.freeIconsAcrossLibrariesLabel;
const mcpServerFreeIconsLabel = PRODUCT_FACT_LABELS.mcpServerFreeIconsLabel;
const mcpToolsLabel = PRODUCT_FACT_LABELS.mcpToolsLabel;
const PRO_BANNER_COPY = {
  monthly: {
    description: 'MCP access, workflow tools, and 1 premium collection every month.',
    features: [
      'MCP access for AI agents',
      PRO_WORKFLOW_BULLET,
      '1 premium collection/month',
      'Access all collections while active',
      'Unlimited commercial license',
    ],
  },
  annual: {
    description: 'Own all 8 premium collections now, plus future drops while annual is active.',
    features: [
      'MCP access for AI agents',
      PRO_WORKFLOW_BULLET,
      'Own all 8 premium collections now',
      'Future premium drops while annual is active',
      'Unlimited commercial license',
    ],
  },
};
const PRO_PRICING_COPY = {
  monthly: {
    description: 'Pro tools, full premium access, and 1 premium collection every month.',
    features: [
      'Everything in Free',
      '1 premium collection/month',
      'Access all collections while active',
      'Cancel anytime, keep what you claimed',
      'Motion Lab: export CSS animations',
      'Converter: unlimited SVG/PNG conversion',
      'Full MCP access (free + premium)',
      'Commercial use, unlimited projects',
      'Priority support',
    ],
  },
  annual: {
    description: 'Own all 8 premium collections now, plus future drops while your annual plan is active.',
    features: [
      'Everything in Free',
      'Own all 8 premium collections now',
      'Keep the 8 included collections forever',
      'Future premium drops while annual is active',
      'Motion Lab: export CSS animations',
      'Converter: unlimited SVG/PNG conversion',
      'Full MCP access (free + premium)',
      'Commercial use, unlimited projects',
      'Priority support',
    ],
  },
};
const MOTION_LAB_LOCKED_CSS = [
  '@keyframes si-bounce {',
  '  0%, 100% { transform: translateY(0); }',
  '  50% { transform: translateY(-6px); }',
  '}',
].join('\n');
const MOTION_LAB_LOCKED_SVG = '<!-- Animated SVG available with Pro -->';
const EXPORT_TRIGGER_TOOLTIP_COPY = 'Sets how the animation starts in your exported code. Loop: plays continuously. Hover: plays on mouse over. Click: plays on tap.';

// ── State ─────────────────────────────────────────────────────
let products = [];
let claimStatusLoadPromise = null;
let purchasesLoadPromise = null;
let purchasesLoadedForUserId = null;

// ── Premium Asset Fetcher ─────────────────────────────────────
// Fetches SVG/CSS through the Edge Function with auth headers.
// Falls back to direct public URL for local development.
async function fetchPremiumAsset(slug, filename) {
  const sb = getSupabase();
  let token = SUPABASE_ANON;

  if (sb) {
    try {
      const { data: { session } } = await sb.auth.getSession();
      if (session?.access_token) token = session.access_token;
    } catch (e) { /* use anon token */ }
  }

  // Try Edge Function first
  try {
    const res = await fetch(
      `${PREMIUM_ASSET_FN}?slug=${encodeURIComponent(slug)}&file=${encodeURIComponent(filename)}`,
      {
        headers: {
          'apikey': SUPABASE_ANON,
          'Authorization': `Bearer ${token}`,
        },
      }
    );
    if (res.ok) return res;
  } catch (e) {
    // Edge Function unavailable
  }

  // Fallback: direct public URL (local development only, stripped in production)
  if (import.meta.env.DEV) {
    return fetch(`/packs/${slug}/${filename}`);
  }

  // Production: return a synthetic error response
  return new Response(JSON.stringify({ error: 'Asset unavailable' }), {
    status: 503,
    headers: { 'Content-Type': 'application/json' },
  });
}
let userPurchases = [];
let currentView = 'icons'; // 'icons' | 'packs' | 'downloads' | 'dashboard' | 'api-keys' | 'docs' | 'docs-claude-code' | 'docs-codex' | 'docs-cursor' | 'collection-detail' | 'pricing' | 'privacy' | 'terms' | 'motion-lab' | 'converter' | 'converter-lab'
let previousView = 'icons';
let storeHistorySyncBound = false;
let currentCollectionData = null; // manifest data for the currently viewed collection
let currentCollectionBundle = null;
let activeCollectionProductId = null;
let activeCollectionProductSlug = null;
let authIntentResumePromise = null;
let toastTimeout = null;
let removeUpgradePrompt = null;
let premiumSelectionRequestId = 0;
let packCatalogNotice = null;
const DOCS_SIDEBAR_DRAWER_MEDIA = typeof window !== 'undefined' && typeof window.matchMedia === 'function'
  ? window.matchMedia('(max-width: 960px)')
  : null;

// ── Product display name overrides (avoids DB migration for renames) ─
const PRODUCT_NAME_OVERRIDES = {
  'ai-agentic': 'Agentic AI',
};
function getProductName(product) {
  return PRODUCT_NAME_OVERRIDES[product.slug] || product.name;
}

function getProPlan(plan = 'monthly') {
  return PRO_PLANS[plan] || PRO_PLANS.monthly;
}

function canManageApiKeys() {
  return isPro() || userPurchases.length > 0;
}

function findProductById(productId) {
  if (!productId) return null;
  return products.find(product => product.id === productId)
    || userPurchases.find(purchase => purchase.product_id === productId)?.si_products
    || null;
}

function getAuthReturnIntent(context, overrides = {}) {
  const intent = {
    context,
    view: overrides.view || currentView,
  };

  const productId = overrides.productId
    || (intent.view === 'collection-detail' ? activeCollectionProductId : null);
  const productSlug = overrides.productSlug
    || (intent.view === 'collection-detail' ? activeCollectionProductSlug : null);

  if (productId) intent.productId = productId;
  if (productSlug) intent.productSlug = productSlug;
  if (overrides.plan) intent.plan = overrides.plan;

  return intent;
}

function promptForAuth(context, overrides = {}) {
  setAuthIntent(getAuthReturnIntent(context, overrides));
  openAuthModal({ mode: 'signin', context });
}

async function restoreAuthIntent(intent) {
  if (!intent || !isLoggedIn()) return false;

  const view = intent.view || 'icons';

  if (view === 'collection-detail') {
    if (products.length === 0) {
      await fetchProducts();
    }
    await ensureUserPurchasesLoaded({ rerender: false });
    const product = findProductById(intent.productId)
      || products.find(item => item.slug === intent.productSlug)
      || null;
    if (product) {
      await renderCollectionDetail(product);
      return true;
    }
    switchView('packs');
    return true;
  }

  if (view === 'downloads' || view === 'dashboard' || view === 'api-keys') {
    await ensureUserPurchasesLoaded({ force: true, rerender: false });
  }

  if (view === 'mcp') {
    switchView('docs');
    return true;
  }

  const allowedViews = new Set(['icons', 'packs', 'downloads', 'dashboard', 'api-keys', ...DOCS_PAGE_VIEWS, 'pricing', 'motion-lab', 'converter', 'converter-lab', 'privacy', 'terms']);
  switchView(allowedViews.has(view) ? view : 'icons');
  return true;
}

async function resumePostAuthIntent() {
  if (authIntentResumePromise) return authIntentResumePromise;

  authIntentResumePromise = (async () => {
    await waitForAuth();
    if (!isLoggedIn()) return false;
    const intent = consumeAuthIntent();
    if (!intent) return false;
    return restoreAuthIntent(intent);
  })();

  try {
    return await authIntentResumePromise;
  } finally {
    authIntentResumePromise = null;
  }
}

function getProPlanPriceMarkup(planKey) {
  const plan = getProPlan(planKey);
  return `${plan.amount}<span style="font-size:0.65rem;font-weight:400">${plan.period}</span>`;
}

function renderPlainFeatureList(items) {
  return items.map(item => `<li>${item}</li>`).join('');
}

function renderPricingFeatureList(items) {
  return items.map(item => `<li><span class="material-symbols-outlined">check</span> ${item}</li>`).join('');
}

function redirectToDocs(hash = window.location.hash || '') {
  const target = `/?view=docs${hash}`;
  window.location.replace(target);
}

function formatClaimAvailability(nextAvailable) {
  if (!nextAvailable) return 'soon';
  const date = new Date(nextAvailable);
  if (Number.isNaN(date.getTime())) return 'soon';
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function isClaimableProduct(product) {
  if (!product || product.status !== 'active') return false;
  if (Object.prototype.hasOwnProperty.call(product, 'v1_launch')) {
    return product.v1_launch === true;
  }
  return product.pack_type === 'single';
}

function getOwnedBadgeMeta(source) {
  if (source === 'credit') {
    return {
      text: 'Redeemed',
      className: 'pack-card__badge--redeemed',
    };
  }

  return {
    text: 'Purchased',
    className: 'pack-card__badge--owned',
  };
}

function getPackCardState(product, isPurchased, priceDisplay) {
  const primary = isPurchased
    ? {
      action: 'open',
      label: '<span class="material-symbols-outlined" style="font-size:15px">visibility</span> View Collection',
      className: 'pack-card__btn--open',
    }
    : {
      action: 'purchase',
      label: `Buy $${priceDisplay}`,
      className: 'pack-card__btn--buy',
    };

  let redeem = null;
  const shouldShowRedeemState = !isPurchased && isPro() && isClaimableProduct(product);
  if (shouldShowRedeemState) {
    const claimStatus = getClaimStatus();
    if (!claimStatus) {
      redeem = { type: 'note', className: 'pack-card__redeem-note--muted', text: 'Checking redeem access...' };
    } else if (claimStatus.canClaim) {
      redeem = {
        type: 'action',
        action: 'claim',
        label: '<span class="material-symbols-outlined" style="font-size:14px">redeem</span> Redeem now',
        className: 'pack-card__redeem-btn',
      };
    } else if (claimStatus.reason === 'cooldown_wait') {
      redeem = {
        type: 'note',
        className: 'pack-card__redeem-note--cooldown',
        text: `Redeem on ${formatClaimAvailability(claimStatus.nextAvailable)}`,
      };
    } else if (claimStatus.reason === 'all_owned') {
      redeem = {
        type: 'note',
        className: 'pack-card__redeem-note--muted',
        text: 'All claimable collections owned',
      };
    }
  }

  return { primary, redeem };
}

function ensureClaimStatusLoaded() {
  if (!isLoggedIn() || !isPro()) return;
  if (getClaimStatus() || claimStatusLoadPromise) return;

  claimStatusLoadPromise = fetchClaimStatus()
    .catch((err) => {
      console.warn('[Store] Failed to fetch claim status:', err?.message || err);
    })
    .finally(() => {
      claimStatusLoadPromise = null;
      if (currentView === 'packs') {
        renderPackCatalog();
      }
    });
}

function rerenderCollectionSurfaceForCurrentView() {
  if (currentView === 'packs') {
    renderPackCatalog();
  } else if (currentView === 'collection-detail') {
    const product = findProductById(activeCollectionProductId)
      || products.find(item => item.slug === activeCollectionProductSlug)
      || null;
    if (product) void renderCollectionDetail(product);
  } else if (currentView === 'downloads') {
    renderDownloads();
  } else if (currentView === 'dashboard') {
    renderDashboard();
  } else if (currentView === 'api-keys') {
    renderApiKeysPage();
  }
}

async function ensureUserPurchasesLoaded({ force = false, rerender = true } = {}) {
  const user = getUser();
  if (!user) {
    userPurchases = [];
    purchasesLoadedForUserId = null;
    purchasesLoadPromise = null;
    const countEl = document.getElementById('countDownloads');
    if (countEl) countEl.textContent = '0';
    if (rerender) rerenderCollectionSurfaceForCurrentView();
    return userPurchases;
  }

  if (!force && purchasesLoadPromise) {
    return purchasesLoadPromise;
  }

  const request = (async () => {
    await fetchUserPurchases();
    purchasesLoadedForUserId = getUser()?.id || null;
    return userPurchases;
  })()
    .catch((err) => {
      console.warn('[Store] Failed to ensure purchases are loaded:', err?.message || err);
      return userPurchases;
    })
    .finally(() => {
      if (purchasesLoadPromise === request) {
        purchasesLoadPromise = null;
      }
      if (rerender) rerenderCollectionSurfaceForCurrentView();
    });

  purchasesLoadPromise = request;
  return request;
}

function getUpgradeCtasMarkup() {
  return `
    <div class="si-upsell__actions">
      <button class="si-upsell__cta si-upsell__cta--primary" data-pro-plan="monthly">
        ${getProPlan('monthly').label} - ${getProPlan('monthly').ctaLabel}
      </button>
      <button class="si-upsell__cta" data-pro-plan="annual">
        ${getProPlan('annual').label} - ${getProPlan('annual').ctaLabel}
      </button>
    </div>
  `;
}

function wireUpgradeCtas(root, onDone) {
  root.querySelectorAll('[data-pro-plan]').forEach(btn => {
    btn.addEventListener('click', () => {
      onDone?.();
      handleProSubscribe(btn.dataset.proPlan);
    });
  });
}

function closeUpgradePrompt() {
  if (typeof removeUpgradePrompt === 'function') {
    const cleanup = removeUpgradePrompt;
    removeUpgradePrompt = null;
    cleanup();
  }
}

// ── Init ──────────────────────────────────────────────────────
export function initStore() {
  wireStoreListeners();
  ensureStoreHistorySync();
  void fetchProducts();
  window.addEventListener('supericons:auth-signed-in', () => {
    void resumePostAuthIntent();
  });
  window.addEventListener('supericons:auth-signed-out', () => {
    void ensureUserPurchasesLoaded({ force: true, rerender: false });
    if (currentView === 'downloads' || currentView === 'dashboard') {
      switchView('icons');
      return;
    }
    rerenderCollectionSurfaceForCurrentView();
  });
  void waitForAuth()
    .then(async () => {
      await ensureUserPurchasesLoaded({ rerender: false });
      await resumePostAuthIntent();
    })
    .catch((err) => {
      console.warn('[Store] Initial purchase sync skipped:', err?.message || err);
    });
}

// ── Fetch Products ────────────────────────────────────────────
function syncViewFromLocation({ historyMode = 'replace' } = {}) {
  const params = new URLSearchParams(window.location.search);
  const requestedView = params.get('view');

  if (hasDirectRouteView(requestedView || '')) {
    const nextView = normalizeRouteView(requestedView || '');
    switchView(nextView, { historyMode });
    if (historyMode !== 'silent' && !shouldPersistRouteView(nextView)) {
      const nextUrl = buildRouteUrl({
        pathname: window.location.pathname,
        view: nextView,
        hash: window.location.hash,
      });
      window.history.replaceState({}, '', nextUrl);
    }
    return true;
  }

  return false;
}

function ensureStoreHistorySync() {
  if (storeHistorySyncBound) return;
  window.addEventListener('popstate', () => {
    if (syncViewFromLocation({ historyMode: 'silent' })) return;
    switchView('icons', { historyMode: 'silent' });
  });
  storeHistorySyncBound = true;
}

async function fetchProducts() {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/si_products?status=eq.active&order=created_at.asc`,
      {
        headers: {
          'apikey': SUPABASE_ANON,
          'Authorization': `Bearer ${SUPABASE_ANON}`,
        },
      }
    );
    if (!res.ok) return;
    products = await res.json();
    updatePackCount();
    if (currentView === 'packs') {
      renderPackCatalog();
    }
  } catch (e) {
    console.warn('[Store] Failed to fetch products:', e.message);
  }
}

// ── Fetch User Purchases ──────────────────────────────────────
export async function fetchUserPurchases() {
  const user = getUser();
  if (!user) {
    userPurchases = [];
    purchasesLoadedForUserId = null;
    const countEl = document.getElementById('countDownloads');
    if (countEl) countEl.textContent = '0';
    return userPurchases;
  }

  try {
    const sb = getSupabase();
    const { data: { session } } = await sb.auth.getSession();
    const token = session?.access_token || SUPABASE_ANON;

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/si_purchases?user_id=eq.${user.id}&select=*,si_products(*)`,
      {
        headers: {
          'apikey': SUPABASE_ANON,
          'Authorization': `Bearer ${token}`,
        },
      }
    );
    if (!res.ok) throw new Error(`Purchase fetch failed (${res.status})`);
    userPurchases = await res.json();
    purchasesLoadedForUserId = user.id;

    const countEl = document.getElementById('countDownloads');
    if (countEl) countEl.textContent = userPurchases.length;
    return userPurchases;
  } catch (e) {
    console.warn('[Store] Failed to fetch purchases:', e.message);
    return userPurchases;
  }
}

// ── Collection Count ─────────────────────────────────────────
function updatePackCount() {
  const countEl = document.querySelector('#sidebarAnimatedPacks .sidebar__item-count');
  if (countEl && products.length > 0) {
    countEl.textContent = products.length;
  }
}

function getStoreViewHeading(view) {
  if (DOCS_PAGE_VIEWS.has(view)) return 'Docs';

  switch (view) {
    case 'packs':
      return 'Premium Collections';
    case 'downloads':
      return 'My Collection';
    case 'dashboard':
      return 'My Purchases';
    case 'api-keys':
      return 'API Keys';
    case 'pricing':
      return 'Pricing';
    case 'privacy':
      return 'Privacy Policy';
    case 'terms':
      return 'Terms of Service';
    case 'motion-lab':
      return 'Motion Lab';
    case 'converter':
      return 'Icon Converter';
    case 'converter-lab':
      return 'Converter Lab';
    default:
      return 'My Purchases';
  }
}

// ── View Switching ────────────────────────────────────────────
export function switchView(view, { historyMode = 'replace' } = {}) {
  const si = window.__supericons;
  view = normalizeRouteView(view);
  const nextRouteMeta = getRouteMeta(view);

  if (currentView !== view) {
    closeDocsSidebarDrawer();
  }

  const activeRouteView = new URLSearchParams(window.location.search).get('view');
  const activeRouteMeta = getRouteMeta(activeRouteView || 'icons');
  const shouldMutateHistory = historyMode !== 'silent';
  const historyMethod = historyMode === 'push' ? 'pushState' : 'replaceState';
  if (shouldMutateHistory && nextRouteMeta.persistUrl) {
    const routeHash = activeRouteView === view ? window.location.hash : '';
    const docsUrl = buildRouteUrl({
      pathname: window.location.pathname,
      view,
      hash: routeHash,
    });
    const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (currentUrl !== docsUrl) {
      window.history[historyMethod]({}, '', docsUrl);
    }
  } else if (shouldMutateHistory && activeRouteMeta.persistUrl) {
    window.history[historyMethod]({}, '', window.location.pathname);
  }

  if (currentView === 'converter') {
    Object.assign(converterStableState, cloneConverterStateSnapshot(converterState));
  } else if (currentView === 'converter-lab') {
    Object.assign(converterLabState, cloneConverterStateSnapshot(converterState));
  }

  previousView = currentView;
  closeUpgradePrompt();
  document.getElementById('mlExportModal')?.remove();
  if (view !== 'collection-detail') {
    activeCollectionProductId = null;
    activeCollectionProductSlug = null;
  }

  if (view !== 'icons') {
    si?.dismissLanding?.();
  }

  // Restore the Customize panel if we're leaving a view that suppresses it
  const currentRouteMeta = getRouteMeta(currentView);
  if (currentRouteMeta.panelSuppressed && !nextRouteMeta.panelSuppressed) {
    if (si?.setPanelSuppressed) {
      si.setPanelSuppressed(false);
    } else {
      const restorePanel = document.getElementById('panel');
      if (restorePanel && restorePanel.dataset.hiddenByPricing) {
        restorePanel.classList.remove('panel--pricing-hidden');
        if (restorePanel.dataset.hiddenByPricing === 'was-open') {
          restorePanel.classList.add('panel-open');
        }
        delete restorePanel.dataset.hiddenByPricing;
      }
      const mainLayout = document.getElementById('mainLayout');
      if (mainLayout) mainLayout.classList.remove('panel-hidden');
    }
    document.body.removeAttribute('data-view');
  }

  currentView = view;
  si?.syncSidebarToggleButton?.();

  if (view === 'converter') {
    applyConverterStateSnapshot(converterStableState);
  } else if (view === 'converter-lab') {
    applyConverterStateSnapshot(converterLabState);
  }

  if (DOCS_PAGE_VIEWS.has(view)) {
    si?.setHeaderSearchMode?.('docs', { value: docsSearchQuery });
  } else {
    closeDocsSearch();
    pendingDocsSearchNavigation = null;
    resetDocsSearchHeaderUi();
    si?.setHeaderSearchMode?.('icons', { value: si?.state?.searchQuery || '' });
  }

  const gridArea = document.getElementById('gridArea');
  const gridTitle = document.getElementById('gridTitle');
  const gridMeta = document.getElementById('gridMeta');
  const gridActions = document.querySelector('.grid-header__actions');
  const shell = si?.shell;

  if (!gridArea) return;

  const resetShellScroll = () => {
    gridArea.scrollTop = 0;
    gridArea.scrollLeft = 0;
    window.scrollTo(0, 0);
  };

  const setStoreHeading = (title, meta = '') => {
    if (shell?.setHeading) {
      shell.setHeading(title, meta);
      return;
    }
    if (gridTitle) gridTitle.textContent = title;
    if (gridMeta) gridMeta.textContent = meta;
  };

  const enterStoreChrome = ({
    title,
    meta = '',
    searchMode = 'icons',
    searchValue = '',
    panelSuppressed = false,
  }) => {
    if (shell?.enterStoreView) {
      shell.enterStoreView({ title, meta, searchMode, searchValue, panelSuppressed });
      return;
    }

    gridArea.classList.add('store-active');
    if (gridActions) gridActions.style.display = 'none';
    if (gridTitle) gridTitle.textContent = title;
    if (gridMeta) gridMeta.textContent = meta;
    si?.setPanelSuppressed?.(Boolean(panelSuppressed));
    si?.setHeaderSearchMode?.(searchMode, { value: searchValue });
  };

  const leaveStoreChrome = () => {
    if (shell?.leaveStoreView) {
      shell.leaveStoreView();
      return;
    }
    gridArea.classList.remove('store-active');
    if (gridActions) gridActions.style.display = '';
    if (gridTitle) gridTitle.textContent = 'All Icons';
    if (gridMeta) gridMeta.textContent = '';
    si?.setPanelSuppressed?.(false);
  };

  if (nextRouteMeta.storeShell) {
    clearPremiumPreviewTimer();
    currentPremiumSelection = null;
    premiumPanelState = createPremiumPanelState();
    enterStoreChrome({
      title: view === 'collection-detail' ? '' : getStoreViewHeading(view),
      meta: '',
      searchMode: nextRouteMeta.searchMode,
      searchValue: nextRouteMeta.searchMode === 'docs' ? docsSearchQuery : (si?.state?.searchQuery || ''),
      panelSuppressed: nextRouteMeta.panelSuppressed,
    });

    if (view === 'packs') {
      ensureClaimStatusLoaded();
      renderPackCatalog();
      void ensureUserPurchasesLoaded({ rerender: true });
    } else if (view === 'collection-detail') {
      // Title/meta set by renderCollectionDetail
    } else if (view === 'downloads') {
      renderDownloads();
      void ensureUserPurchasesLoaded({ rerender: true });
    } else if (view === 'dashboard') {
      renderDashboard();
      void ensureUserPurchasesLoaded({ rerender: true });
    } else if (view === 'api-keys') {
      renderApiKeysPage();
      void ensureUserPurchasesLoaded({ rerender: true });
    } else if (DOCS_PAGE_VIEWS.has(view)) {
      document.body.setAttribute('data-view', 'docs');
      renderDocsSitePage(view);
    } else if (view === 'pricing') {
      document.body.setAttribute('data-view', 'pricing');
      renderPricingPage();
    } else if (view === 'privacy') {
      document.body.setAttribute('data-view', 'privacy');
      renderPrivacyPage();
    } else if (view === 'terms') {
      document.body.setAttribute('data-view', 'terms');
      renderTermsPage();
    } else if (view === 'motion-lab') {
      document.body.setAttribute('data-view', 'motion-lab');
      renderMotionLab();
    } else if (view === 'converter') {
      document.body.setAttribute('data-view', 'converter');
      renderConverter();
    } else if (view === 'converter-lab') {
      document.body.setAttribute('data-view', 'converter-lab');
      renderConverterLab();
    } else {
      setStoreHeading('My Purchases', '');
      renderDashboard();
    }

    // Insert back button into gridMeta (skip for collection-detail, which adds its own)
    if (gridMeta && view !== 'collection-detail') {
      const backBtn = document.createElement('button');
      backBtn.className = 'store-back-btn';
      backBtn.textContent = 'Back to icons';
      backBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        switchView('icons');
      });
      gridMeta.appendChild(backBtn);
    }

  } else {
    leaveStoreChrome();
    removePackCatalog();
    // Clean up any tool/store views lingering in the DOM
    document.getElementById('motionLabView')?.remove();
    document.getElementById('converterView')?.remove();
    document.getElementById('converterLabView')?.remove();
    document.getElementById('privacyView')?.remove();
    document.getElementById('termsView')?.remove();
    document.getElementById('apiKeysView')?.remove();
    document.getElementById('docsView')?.remove();
  }

  // Update sidebar active state
  si?.syncPurposeFilterBar?.();
  updateSidebarActive(view);
  resetShellScroll();
  window.requestAnimationFrame(resetShellScroll);
}

function updateSidebarActive(view) {
  // Clear all sidebar items first (including library items like All Icons)
  const items = document.querySelectorAll('.sidebar__item');
  items.forEach(item => item.classList.remove('active'));

  // Then highlight the active one
  if (view === 'packs') {
    document.getElementById('sidebarAnimatedPacks')?.classList.add('active');
  } else if (view === 'downloads') {
    document.getElementById('sidebarMyDownloads')?.classList.add('active');
  } else if (view === 'pricing') {
    document.getElementById('sidebarPricing')?.classList.add('active');
  } else if (view === 'privacy' || view === 'terms' || view === 'dashboard' || view === 'api-keys' || DOCS_PAGE_VIEWS.has(view)) {
    // Keep docs/legal views neutral in the sidebar.
  } else if (view === 'motion-lab') {
    document.getElementById('sidebarMotionLab')?.classList.add('active');
  } else if (view === 'converter') {
    document.getElementById('sidebarConverter')?.classList.add('active');
  } else if (view === 'converter-lab') {
    document.getElementById('sidebarConverter')?.classList.add('active');
  } else {
    // Default view: re-activate All Icons
    const allIcons = document.querySelector('.sidebar__item[data-library="all"]');
    if (allIcons) allIcons.classList.add('active');
  }
}

// ── Collection Catalog ───────────────────────────────────────
function renderPackCatalog() {
  removePackCatalog();

  const gridArea = document.getElementById('gridArea');
  if (!gridArea) return;

  const catalog = document.createElement('div');
  catalog.id = 'packCatalog';
  catalog.className = 'pack-catalog';

  if (products.length === 0) {
    catalog.innerHTML = `
      <div class="pack-catalog__empty">
        <span class="material-symbols-outlined" style="font-size:48px; color: var(--si-text-dim);">animation</span>
        <h3>Collections coming soon</h3>
        <p>Animated icon collections are being built. Check back soon.</p>
      </div>`;
  } else {
    if (packCatalogNotice) {
      catalog.appendChild(createPackCatalogNotice(packCatalogNotice));
    }
    // Add Pro subscription card if not subscribed
    if (!isPro()) {
      catalog.appendChild(createProSubscriptionCard());
    }
    // Add Launch Edition card
    const launchProducts = products.filter(p => p.v1_launch);
    const allLaunchOwned = launchProducts.length > 0 && launchProducts.every(p =>
      userPurchases.some(up => up.product_id === p.id)
    );
    if (allLaunchOwned && launchProducts.length > 1) {
      // Show completed Launch Edition badge
      const completeBadge = document.createElement('div');
      completeBadge.className = 'pack-card pack-card--launch-edition pack-card--owned';
      completeBadge.innerHTML = `
        <div class="pack-card__header">
          <span class="pack-card__type" style="color: var(--si-success)">Launch Edition</span>
          <span class="pack-card__badge pack-card__badge--owned">Complete</span>
        </div>
        <div class="pack-card__icon">
          <span class="material-symbols-outlined" style="font-size:48px; color: var(--si-success);">verified</span>
        </div>
        <h3 class="pack-card__name">Launch Edition</h3>
        <p class="pack-card__desc">You own all 8 launch collections. Enjoy unlimited use across all projects.</p>`;
      catalog.appendChild(completeBadge);
    } else if (launchProducts.length > 1) {
      catalog.appendChild(createLaunchEditionCard(launchProducts));
    }
    // Sort products by demand priority
    const slugPriority = {
      'ai-agentic': 1,
      'status-feedback': 2,
      'navigation-ui': 3,
      'developer-tools': 4,
      'ecommerce': 5,
      'navigation-menus': 6,
      'data-charts': 7,
      'social-communication': 8,
      'media-playback': 9,
      'security-auth': 10,
    };
    const sorted = [...products].sort((a, b) => (slugPriority[a.slug] || 99) - (slugPriority[b.slug] || 99));
    sorted.forEach(product => {
      catalog.appendChild(createPackCard(product));
    });
  }

  gridArea.appendChild(catalog);
}

function createPackCatalogNotice(notice) {
  const banner = document.createElement('div');
  banner.className = 'promo-banner promo-banner--success';

  banner.innerHTML = `
    <div class="promo-banner__left">
      <span class="material-symbols-outlined promo-banner__icon">celebration</span>
      <div class="promo-banner__info">
        <div class="promo-banner__title">${notice.title}</div>
        <div class="promo-banner__desc">${notice.description}</div>
      </div>
    </div>
    <div class="promo-banner__right">
      ${notice.actionLabel ? `<button class="promo-banner__btn promo-banner__btn--success" type="button" data-action="notice">${notice.actionLabel}</button>` : ''}
    </div>
  `;

  const actionBtn = banner.querySelector('[data-action="notice"]');
  actionBtn?.addEventListener('click', () => {
    if (notice.kind === 'pro-monthly') {
      const firstRedeemBtn = document.querySelector('.pack-card [data-action="redeem"]');
      if (firstRedeemBtn) {
        firstRedeemBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
        firstRedeemBtn.focus({ preventScroll: true });
      } else {
        ensureClaimStatusLoaded();
        showToast('Your claim options are loading. Try again in a moment.');
      }
      return;
    }

    if (notice.kind === 'pro-annual') {
      switchView('downloads');
    }
  });

  return banner;
}

function createPackCard(product) {
  const card = document.createElement('div');

  const ownedPurchase = userPurchases.find(p => p.product_id === product.id) || null;
  const isPurchased = Boolean(ownedPurchase);
  const badgeMeta = isPurchased ? getOwnedBadgeMeta(ownedPurchase?.source) : null;
  const priceDisplay = (product.price_cents / 100).toFixed(product.price_cents % 100 === 0 ? 0 : 2);
  const cardState = getPackCardState(product, isPurchased, priceDisplay);
  const showPrice = false;
  const previewActionMarkup = isPurchased
    ? ''
    : `<button class="pack-card__preview-btn" data-action="preview" data-product-slug="${product.slug}">
           Preview
         </button>`;
  const redeemRowMarkup = cardState.redeem
    ? (cardState.redeem.type === 'action'
      ? `<button class="${cardState.redeem.className}" data-action="redeem">${cardState.redeem.label}</button>`
      : `<div class="pack-card__redeem-note ${cardState.redeem.className}">${cardState.redeem.text}</div>`)
    : '';

  card.className = `pack-card ${product.pack_type === 'bundle' ? 'pack-card--bundle' : ''} ${isPurchased ? 'pack-card--owned' : ''}`;

  card.innerHTML = `
    <div class="pack-card__header">
      <span class="pack-card__type">${product.pack_type === 'bundle' ? 'Bundle' : 'Launch Edition'}</span>
      ${isPurchased ? `<span class="pack-card__badge ${badgeMeta.className}">${badgeMeta.text}</span>` : ''}
    </div>
    <h3 class="pack-card__name">${getProductName(product)}</h3>
    <p class="pack-card__desc">${product.description || `${product.icon_count} animated icons`}</p>
    <div class="pack-card__footer">
      <span class="pack-card__price">${showPrice ? `$${priceDisplay}` : ''}</span>
      <div class="pack-card__actions">
        ${previewActionMarkup}
        <button class="pack-card__btn ${cardState.primary.className}"
                data-action="primary"
                data-product-id="${product.id}"
                data-product-slug="${product.slug}">
          ${cardState.primary.label}
        </button>
      </div>
      ${redeemRowMarkup}
    </div>`;

  // Wire preview button
  const previewBtn = card.querySelector('[data-action="preview"]');
  previewBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    renderCollectionDetail(product);
  });

  // Wire primary action button (buy/view)
  const primaryBtn = card.querySelector('[data-action="primary"]');
  primaryBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (cardState.primary.action === 'open') {
      renderCollectionDetail(product);
    } else if (cardState.primary.action === 'purchase') {
      handlePurchase(product);
    }
  });

  // Wire redeem row action, when claim is currently available
  const redeemBtn = card.querySelector('[data-action="redeem"]');
  redeemBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    handlePackClaim(product);
  });

  // Card body click opens detail too
  card.addEventListener('click', () => {
    renderCollectionDetail(product);
  });

  return card;
}

function createProSubscriptionCard() {
  const card = document.createElement('div');
  card.className = 'promo-banner promo-banner--pro';
  const monthlyPlan = getProPlan('monthly');
  const annualPlan = getProPlan('annual');
  const monthlyFeatures = renderPlainFeatureList(PRO_BANNER_COPY.monthly.features);
  const annualFeatures = renderPlainFeatureList(PRO_BANNER_COPY.annual.features);

  card.innerHTML = `
    <div class="promo-banner__left">
      <span class="material-symbols-outlined promo-banner__icon">diamond</span>
      <div class="promo-banner__info">
        <div class="promo-banner__title">Go Pro</div>
        <div class="promo-banner__desc" id="proBannerDesc">${PRO_BANNER_COPY.monthly.description}</div>
      </div>
    </div>
    <div class="promo-banner__right">
      <div class="pro-card__toggle">
        <button class="pro-card__plan-btn pro-card__plan-btn--active" data-plan="monthly">Monthly</button>
        <button class="pro-card__plan-btn" data-plan="annual">Annual</button>
      </div>
      <div class="promo-banner__price-row">
        <span class="promo-banner__price" id="proPriceDisplay">${getProPlanPriceMarkup('monthly')}</span>
        <span class="pro-card__annual" id="proSavingsBadge" style="display:none">Save 45%</span>
        <button class="promo-banner__btn" id="proSubscribeBtn">Subscribe</button>
      </div>
    </div>
    <div class="promo-tooltip" id="proTooltip">
      <ul class="promo-tooltip__features" id="proTooltipFeatures">${monthlyFeatures}</ul>
    </div>`;

  // Wire plan toggle
  let selectedPlan = 'monthly';
  const toggleBtns = card.querySelectorAll('.pro-card__plan-btn');
  const priceDisplay = card.querySelector('#proPriceDisplay');
  const savingsBadge = card.querySelector('#proSavingsBadge');
  const tooltipFeatures = card.querySelector('#proTooltipFeatures');
  const bannerDesc = card.querySelector('#proBannerDesc');
  toggleBtns.forEach(tb => {
    tb.addEventListener('click', (e) => {
      e.stopPropagation();
      selectedPlan = tb.dataset.plan;
      toggleBtns.forEach(b => b.classList.remove('pro-card__plan-btn--active'));
      tb.classList.add('pro-card__plan-btn--active');
      if (selectedPlan === 'annual') {
        priceDisplay.innerHTML = `<span class="pro-card__annual">Save 45%</span> <span class="launch-card__original">${annualPlan.originalAmount}</span> ${annualPlan.amount}<span style="font-size:0.65rem;font-weight:400">${annualPlan.period}</span>`;
        savingsBadge.style.display = 'none';
        if (bannerDesc) bannerDesc.textContent = PRO_BANNER_COPY.annual.description;
        tooltipFeatures.innerHTML = annualFeatures;
      } else {
        priceDisplay.innerHTML = `${monthlyPlan.amount}<span style="font-size:0.65rem;font-weight:400">${monthlyPlan.period}</span>`;
        savingsBadge.style.display = 'none';
        if (bannerDesc) bannerDesc.textContent = PRO_BANNER_COPY.monthly.description;
        tooltipFeatures.innerHTML = monthlyFeatures;
      }
    });
  });

  // Wire subscribe button
  const btn = card.querySelector('#proSubscribeBtn');
  if (btn) {
    btn.addEventListener('click', () => handleProSubscribe(selectedPlan));
  }

  return card;
}

async function handleProSubscribe(plan = 'monthly') {
  if (!isLoggedIn()) {
    promptForAuth('subscribe', { plan });
    showToast('Sign in to continue to Pro checkout');
    return;
  }

  showToast('Redirecting to checkout...');

  const priceId = getProPlan(plan).priceId;

  try {
    const sb = getSupabase();
    const { data: { session } } = await sb.auth.getSession();
    const token = session?.access_token;

    const res = await fetch(`${SUPABASE_URL}/functions/v1/create-checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'apikey': SUPABASE_ANON,
      },
      body: JSON.stringify({
        price_id: priceId,
        mode: 'subscription',
        success_url: `${window.location.origin}?purchase=success&subscription_plan=${encodeURIComponent(plan)}`,
        cancel_url: `${window.location.origin}?purchase=canceled`,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Checkout failed');
    }

    const { url } = await res.json();
    if (url) window.location.href = url;
  } catch (err) {
    showToast(err.message || 'Payment error. Please try again.');
    console.error('[Store] Pro subscribe error:', err);
  }
}

async function requirePro() {
  await waitForAuth();
  if (!isLoggedIn()) {
    promptForAuth('pro');
    return 'anon';
  }
  if (!isPro()) return 'free';
  return 'pro';
}

// ── Collection Detail View ───────────────────────────────────
let packManifest = null;

async function loadManifest() {
  if (packManifest) return packManifest;
  try {
    const res = await fetch('/packs/manifest.json');
    if (res.ok) packManifest = await res.json();
  } catch (e) {
    console.warn('[Store] Could not load pack manifest:', e);
  }
  return packManifest || {};
}

// Look up obfuscated animation class from manifest classMap.
// Falls back to si-anim--{iconName} for free icons or dev mode.
function getAnimClass(collectionData, iconName) {
  return collectionData?.classMap?.[iconName] || `si-anim--${iconName}`;
}


async function renderCollectionDetail(product) {
  // Switch to detail view (sets store-active class, hides grid)
  switchView('collection-detail');
  activeCollectionProductId = product?.id || null;
  activeCollectionProductSlug = product?.slug || null;
  currentCollectionBundle = null;

  removePackCatalog();


  const gridArea = document.getElementById('gridArea');
  const gridTitle = document.getElementById('gridTitle');
  const gridMeta = document.getElementById('gridMeta');
  const shell = window.__supericons?.shell;
  if (!gridArea) return;

  if (shell?.setHeading) {
    shell.setHeading(getProductName(product), '');
  } else if (gridTitle) {
    gridTitle.textContent = getProductName(product);
  }
  if (gridMeta) {
    gridMeta.textContent = '';
    const backBtn = document.createElement('button');
    backBtn.className = 'store-back-btn';
    backBtn.textContent = 'Back to collections';
    backBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      switchView('packs');
    });
    gridMeta.appendChild(backBtn);
  }

  const isPurchased = userPurchases.some(p => p.product_id === product.id);
  const priceDisplay = (product.price_cents / 100).toFixed(product.price_cents % 100 === 0 ? 0 : 2);

  const detail = document.createElement('div');
  detail.id = 'collectionDetail';
  detail.className = 'collection-detail';

  // Collection header
  const header = document.createElement('div');
  header.className = 'collection-detail__header';
  header.innerHTML = `
    <div class="collection-detail__info">
      <p class="collection-detail__desc">${product.description || 'Animated icon collection'}</p>
      <div class="collection-detail__meta">
        <span class="collection-detail__count">
          <span class="material-symbols-outlined" style="font-size:16px">animation</span>
          ${product.icon_count || 20} animated icons
        </span>
        <span class="collection-detail__format">
          <span class="material-symbols-outlined" style="font-size:16px">code</span>
          SVG with animations
        </span>
      </div>
    </div>
    <div class="collection-detail__cta">
      ${isPurchased
        ? '<span class="collection-detail__purchased"><span class="material-symbols-outlined" style="font-size:18px">check_circle</span> Purchased</span>'
         : `<span class="collection-detail__price">$${priceDisplay}</span>
            <button class="collection-detail__buy-btn" id="collectionBuyBtn">Buy</button>`
      }
    </div>
  `;
  detail.appendChild(header);

  // Wire buy button if not purchased
  if (!isPurchased) {
    const buyBtn = header.querySelector('#collectionBuyBtn');
    if (buyBtn) {
      buyBtn.addEventListener('click', () => handlePurchase(product));
    }
  }

  // Icon preview grid
  const grid = document.createElement('div');
  grid.className = 'collection-detail__grid';

  // Anti-download: prevent right-click and drag on the grid
  grid.addEventListener('contextmenu', (e) => e.preventDefault());
  grid.addEventListener('dragstart', (e) => e.preventDefault());

  // ── Append shell immediately so header + skeleton are visible before any network I/O ──
  gridArea.appendChild(detail);

  // Load manifest and bundle in parallel (1 manifest + 1 bundle = 2 fetches total)
  const [manifest, bundle] = await Promise.all([
    loadManifest(),
    fetch(`/packs/${product.slug}/bundle.json`).then(r => r.ok ? r.json() : null).catch(() => null),
  ]);

  const collectionData = manifest[product.slug];
  currentCollectionData = collectionData;
  currentCollectionBundle = bundle;
  const iconList = collectionData
    ? collectionData.icons
    : getPlaceholderIcons(product.slug).map(n => ({ name: n }));

  // Inject CSS from bundle (no separate Edge Function call)
  if (bundle?.css) {
    const cssId = `collection-css-${product.slug}`;
    if (!document.getElementById(cssId)) {
      const style = document.createElement('style');
      style.id = cssId;
      style.textContent = bundle.css;
      document.head.appendChild(style);
    }
  }

  // Update icon count in header
  const countEl = header.querySelector('.collection-detail__count');
  if (countEl) {
    countEl.innerHTML = `<span class="material-symbols-outlined" style="font-size:16px">animation</span> ${iconList.length} animated icons`;
  }

  // Category tag color map
  const tagColors = {
    success: { bg: 'rgba(74,222,128,0.15)', color: '#4ade80' },
    error: { bg: 'rgba(255,107,107,0.15)', color: '#ff6b6b' },
    loading: { bg: 'rgba(255,79,0,0.12)', color: '#ff4f00' },
    notification: { bg: 'rgba(192,132,252,0.15)', color: '#c084fc' },
    action: { bg: 'rgba(96,165,250,0.15)', color: '#60a5fa' },
    feedback: { bg: 'rgba(251,191,36,0.15)', color: '#fbbf24' },
    shopping: { bg: 'rgba(74,222,128,0.15)', color: '#4ade80' },
    pricing: { bg: 'rgba(249,115,22,0.15)', color: '#f97316' },
    payment: { bg: 'rgba(96,165,250,0.15)', color: '#60a5fa' },
    ordering: { bg: 'rgba(148,163,184,0.15)', color: '#94a3b8' },
    delivery: { bg: 'rgba(192,132,252,0.15)', color: '#c084fc' },
    operations: { bg: 'rgba(34,211,238,0.15)', color: '#22d3ee' },
    loyalty: { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b' },
    security: { bg: 'rgba(16,185,129,0.15)', color: '#10b981' },
    utility: { bg: 'rgba(148,163,184,0.15)', color: '#94a3b8' },
    directional: { bg: 'rgba(96,165,250,0.15)', color: '#60a5fa' },
    menu: { bg: 'rgba(139,92,246,0.15)', color: '#8b5cf6' },
    search: { bg: 'rgba(251,191,36,0.15)', color: '#fbbf24' },
    layout: { bg: 'rgba(34,211,238,0.15)', color: '#22d3ee' },
    sidebar: { bg: 'rgba(52,211,153,0.15)', color: '#34d399' },
    zoom: { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b' },
    playback: { bg: 'rgba(34,197,94,0.15)', color: '#22c55e' },
    audio: { bg: 'rgba(139,92,246,0.15)', color: '#8b5cf6' },
    video: { bg: 'rgba(244,63,94,0.15)', color: '#f43f5e' },
    transport: { bg: 'rgba(34,211,238,0.15)', color: '#22d3ee' },
    display: { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b' },
    production: { bg: 'rgba(168,85,247,0.15)', color: '#a855f7' },
    state: { bg: 'rgba(34,211,238,0.15)', color: '#22d3ee' },
    media: { bg: 'rgba(251,146,60,0.15)', color: '#fb923c' },
    capture: { bg: 'rgba(244,63,94,0.15)', color: '#f43f5e' },
    output: { bg: 'rgba(52,211,153,0.15)', color: '#34d399' },
    access: { bg: 'rgba(251,191,36,0.15)', color: '#fbbf24' },
    identity: { bg: 'rgba(96,165,250,0.15)', color: '#60a5fa' },
    protection: { bg: 'rgba(239,68,68,0.15)', color: '#ef4444' },
    compliance: { bg: 'rgba(34,197,94,0.15)', color: '#22c55e' },
    authentication: { bg: 'rgba(167,139,250,0.15)', color: '#a78bfa' },
    encryption: { bg: 'rgba(34,211,238,0.15)', color: '#22d3ee' },
    monitoring: { bg: 'rgba(20,184,166,0.15)', color: '#14b8a6' },
    'access-control': { bg: 'rgba(129,140,248,0.15)', color: '#818cf8' },
    network: { bg: 'rgba(52,211,153,0.15)', color: '#34d399' },
  };

  detail.appendChild(grid);

  // Add watermark overlay for non-purchasers
  if (!isPurchased) {
    const watermark = document.createElement('div');
    watermark.className = 'collection-detail__watermark';
    watermark.textContent = 'PREVIEW';
    grid.style.position = 'relative';
    grid.appendChild(watermark);
  }

  // ── Build icon cells from bundle data (single fetch, no Edge Function) ──
  iconList.forEach((iconData, index) => {
    const iconName = typeof iconData === 'string' ? iconData : iconData.name;
    const purpose = iconData.purpose || '';
    const category = iconData.category || '';
    const tagStyle = tagColors[category] || tagColors.action;

    const cell = document.createElement('div');
    cell.className = `collection-detail__icon-cell si-icon-cell ${!isPurchased ? 'collection-detail__icon-cell--locked' : ''}`;
    cell.dataset.iconName = iconName;
    cell.style.setProperty('--cell-index', index);
    cell.tabIndex = 0;
    cell.setAttribute('role', 'button');
    cell.setAttribute('aria-pressed', 'false');
    cell.setAttribute(
      'aria-label',
      isPurchased
        ? `Preview and customize ${iconName}`
        : `View unlock options for ${iconName}`,
    );

    // Category tag
    if (category) {
      const tag = document.createElement('span');
      tag.className = 'collection-detail__category-tag';
      tag.textContent = category;
      tag.style.background = tagStyle.bg;
      tag.style.color = tagStyle.color;
      cell.appendChild(tag);
    }

    const preview = document.createElement('div');
    preview.className = `collection-detail__icon-preview si-anim ${getAnimClass(collectionData, iconName)}`;

    // Insert SVG from bundle data (instant, no network call)
    const svgText = bundle?.icons?.[iconName];
    if (svgText) {
      preview.innerHTML = svgText;
      const svgEl = preview.querySelector('svg');
      if (svgEl) {
        svgEl.removeAttribute('width');
        svgEl.removeAttribute('height');
      }
    } else {
      preview.innerHTML = '<span class="material-symbols-outlined" style="font-size:32px; color: var(--si-text-dim);">animation</span>';
    }

    cell.appendChild(preview);

    const nameEl = document.createElement('span');
    nameEl.className = 'collection-detail__icon-name';
    nameEl.textContent = iconName;
    cell.appendChild(nameEl);

    if (purpose) {
      const purposeEl = document.createElement('span');
      purposeEl.className = 'collection-detail__icon-purpose';
      purposeEl.textContent = purpose;
      cell.appendChild(purposeEl);
    }

    if (!isPurchased) {
      const lockBadge = document.createElement('span');
      lockBadge.className = 'collection-detail__lock-badge';
      lockBadge.innerHTML = '<span class="material-symbols-outlined" style="font-size:12px">lock</span>';
      cell.appendChild(lockBadge);
      cell.style.userSelect = 'none';
      cell.style.webkitUserSelect = 'none';
      const showLocked = () => showLockedPanel(iconName, product);
      cell.addEventListener('click', showLocked);
      cell.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        showLocked();
      });
    } else {
      const selectIcon = () => selectPremiumIcon(iconName, product.slug);
      cell.addEventListener('click', selectIcon);
      cell.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        selectIcon();
      });
    }

    // Insert cell into grid (before watermark if present)
    grid.insertBefore(cell, grid.lastChild?.classList?.contains('collection-detail__watermark') ? grid.lastChild : null);
  });

  if (isPurchased) {
    renderPremiumPanelEmptyState(getProductName(product));
  }
}

// Load collection CSS dynamically
// ── Premium Icon Selection + Customize Panel ──────────────────
// Premium icons get their own panel with animation-specific controls
// instead of the generic free icon panel.

// Cache for fetched collection CSS text
const _collectionCSSCache = {};
const PREMIUM_SVG_ROOT_CLASS_IGNORES = new Set(['si-icon', 'si-anim', 'si-anim-dc']);
const PREMIUM_STANDALONE_ROOT_CLASS = 'si-premium-standalone-root';
const PREMIUM_EXPORT_ROOT_CLASS = 'si-animated-icon';
const PREMIUM_COLOR_MODE_ORIGINAL = 'original';
const PREMIUM_COLOR_MODE_CUSTOM = 'custom';
const PREMIUM_NEUTRAL_HEX_COLORS = new Set([
  '#000000',
  '#111111',
  '#222222',
  '#333333',
  '#444444',
  '#555555',
  '#666666',
  '#777777',
  '#888888',
  '#999999',
  '#aaaaaa',
  '#bbbbbb',
  '#cccccc',
  '#dddddd',
  '#eeeeee',
  '#f5f5f5',
  '#ffffff',
]);

function escapeRegExp(value = '') {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getPremiumStandaloneRootSelector({
  hover = false,
  rootClassName = PREMIUM_STANDALONE_ROOT_CLASS,
} = {}) {
  return `svg.${rootClassName}${hover ? ':hover' : ''}`;
}

function getPremiumStandaloneRootSelectors({
  trigger = 'loop',
  rootClassName = PREMIUM_STANDALONE_ROOT_CLASS,
} = {}) {
  const baseSelector = getPremiumStandaloneRootSelector({ rootClassName });
  if (trigger === 'click') return [`${baseSelector}.active`];
  return [getPremiumStandaloneRootSelector({ hover: trigger === 'hover', rootClassName })];
}

function getPremiumTriggeredSelector({
  trigger = 'loop',
  rootClassName = PREMIUM_STANDALONE_ROOT_CLASS,
  descendant = '',
} = {}) {
  return getPremiumStandaloneRootSelectors({ trigger, rootClassName })
    .map(selector => `${selector}${descendant}`)
    .join(',\n');
}

function normalizePremiumHexColor(token = '') {
  const match = String(token || '').trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!match) return '';
  const raw = match[1].toLowerCase();
  if (raw.length === 3) {
    return `#${raw.split('').map(part => `${part}${part}`).join('')}`;
  }
  return `#${raw}`;
}

function isPremiumNeutralHexColor(token = '') {
  const normalized = normalizePremiumHexColor(token);
  if (!normalized) return false;
  return PREMIUM_NEUTRAL_HEX_COLORS.has(normalized);
}

function analyzePremiumColorProfile(svgText = '') {
  const hexMatches = String(svgText || '').match(/#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/g) || [];
  const colorCounts = new Map();
  hexMatches.forEach((token) => {
    const normalized = normalizePremiumHexColor(token);
    if (!normalized || isPremiumNeutralHexColor(normalized)) return;
    colorCounts.set(normalized, (colorCounts.get(normalized) || 0) + 1);
  });

  const authoredColors = [...colorCounts.entries()]
    .sort((left, right) => right[1] - left[1])
    .map(([color]) => color);
  const hasCurrentColor = /currentColor/i.test(svgText || '');
  const originalColor = authoredColors[0] || '#ffffff';

  return {
    hasCurrentColor,
    authoredColors,
    originalColor,
    supportsCustomColor: hasCurrentColor || authoredColors.length > 0,
    usesAuthoredPalette: authoredColors.length > 0,
  };
}

function resolvePremiumThemeBaseColor() {
  if (typeof window === 'undefined' || typeof window.getComputedStyle !== 'function') {
    return PREMIUM_PANEL_DEFAULTS.originalColor;
  }

  const preview = document.getElementById('panelPreview');
  const themeHost = preview || document.body || document.documentElement;
  const computed = window.getComputedStyle(themeHost);
  const themed = computed.getPropertyValue('--si-text').trim();
  return themed || computed.color || PREMIUM_PANEL_DEFAULTS.originalColor;
}

function resolvePremiumOriginalColor(colorProfile = null) {
  if (colorProfile?.authoredColors?.length) return colorProfile.authoredColors[0];
  if (colorProfile?.hasCurrentColor) return resolvePremiumThemeBaseColor();
  return PREMIUM_PANEL_DEFAULTS.originalColor;
}

function getPremiumAppliedColor(state = premiumPanelState) {
  if (!state) return '#ffffff';
  if (state.colorMode === PREMIUM_COLOR_MODE_CUSTOM) return state.color;
  return resolvePremiumOriginalColor(state.colorProfile);
}

function applyPremiumSvgColorOverrides(svgText = '', color, colorProfile, colorMode = PREMIUM_COLOR_MODE_CUSTOM) {
  let svg = String(svgText || '');
  const appliedColor = color || colorProfile?.originalColor || '#ffffff';
  svg = svg.replace(/stroke="currentColor"/g, `stroke="${appliedColor}"`);
  svg = svg.replace(/fill="currentColor"/g, `fill="${appliedColor}"`);

  if (colorMode === PREMIUM_COLOR_MODE_CUSTOM) {
    (colorProfile?.authoredColors || []).forEach((token) => {
      const escapedToken = escapeRegExp(token);
      svg = svg.replace(new RegExp(escapedToken, 'gi'), appliedColor);
    });
  }

  return svg;
}

function applyPremiumCssColorOverrides(cssText = '', color = '') {
  if (!cssText) return '';
  return String(cssText).replace(/currentColor/g, color || '#ffffff');
}

async function getCollectionCSS(slug, cssFilename) {
  if (_collectionCSSCache[slug]) return _collectionCSSCache[slug];

  // Check if CSS was already injected from the bundle (renderCollectionDetail)
  const injected = document.getElementById(`collection-css-${slug}`);
  if (injected?.textContent) {
    _collectionCSSCache[slug] = injected.textContent;
    return _collectionCSSCache[slug];
  }

  // Fallback: fetch via Edge Function (e.g. customize panel opened directly)
  const filename = cssFilename || `${slug}.css`;
  try {
    const res = await fetchPremiumAsset(slug, filename);
    if (res.ok) {
      _collectionCSSCache[slug] = await res.text();
      return _collectionCSSCache[slug];
    }
  } catch (e) { /* silent */ }
  return '';
}

function getPremiumSvgRootClasses(svgText = '') {
  const svgMatch = String(svgText || '').match(/<svg\b([^>]*)>/i);
  if (!svgMatch) return [];

  const classMatch = svgMatch[1].match(/\bclass="([^"]*)"/i);
  if (!classMatch) return [];

  return classMatch[1]
    .split(/\s+/)
    .map(token => token.trim())
    .filter(Boolean);
}

function getPremiumSvgCssContract(svgText = '', iconName = '', collectionData = currentCollectionData) {
  const rootClasses = getPremiumSvgRootClasses(svgText);
  const animClass = iconName ? getAnimClass(collectionData, iconName) : '';
  const relevantRootClasses = rootClasses.filter(token => !PREMIUM_SVG_ROOT_CLASS_IGNORES.has(token));

  return {
    animClass,
    rootClasses,
    relevantRootClasses,
    cssMatchTokens: [...new Set([animClass, ...relevantRootClasses].filter(Boolean))],
    standaloneRootClasses: [...new Set([...rootClasses, animClass, PREMIUM_STANDALONE_ROOT_CLASS].filter(Boolean))],
  };
}

function setPremiumSvgRootClasses(svgText, classTokens = []) {
  const tokens = [...new Set(classTokens.filter(Boolean))];
  return String(svgText || '').replace(/<svg\b([^>]*)>/i, (match, attrs) => {
    const classMatch = attrs.match(/\bclass="([^"]*)"/i);
    const classValue = tokens.join(' ');

    if (classMatch) {
      if (classValue) {
        return `<svg${attrs.replace(/\bclass="([^"]*)"/i, `class="${classValue}"`)}>`;
      }
      return `<svg${attrs.replace(/\s*\bclass="([^"]*)"/i, '')}>`;
    }

    if (!classValue) return `<svg${attrs}>`;
    return `<svg${attrs} class="${classValue}">`;
  });
}

function warnPremiumPreviewContract(message, context = {}) {
  if (!import.meta.env.DEV) return;
  console.warn('[Store] Premium preview contract:', message, context);
}

function extractIconCSS(fullCSS, iconName, { svgText = '', collectionData = currentCollectionData } = {}) {
  if (!fullCSS) return '';

  const { cssMatchTokens } = getPremiumSvgCssContract(svgText, iconName, collectionData);
  const blocks = [];
  let blockStart = 0;
  let braceDepth = 0;

  for (let i = 0; i < fullCSS.length; i += 1) {
    const char = fullCSS[i];
    if (char === '{') braceDepth += 1;
    if (char === '}') {
      braceDepth -= 1;
      if (braceDepth === 0) {
        const block = fullCSS.slice(blockStart, i + 1).trim();
        if (block) blocks.push(block);
        blockStart = i + 1;
      }
    }
  }

  const relevantRules = [];
  const keyframeBlocks = new Map();
  const neededKeyframes = new Set();

  const collectAnimationNames = (block) => {
    const matches = block.matchAll(/animation(?:-name)?\s*:\s*([^;}{]+)/g);
    for (const match of matches) {
      const value = match[1] || '';
      value.split(',').forEach((entry) => {
        const trimmed = entry.trim();
        if (!trimmed || trimmed === 'none') return;
        const name = trimmed.split(/\s+/)[0];
        if (name && !/^\d/.test(name)) {
          neededKeyframes.add(name);
        }
      });
    }
  };

  blocks.forEach((block) => {
    const keyframeMatch = block.match(/^\s*(?:\/\*[\s\S]*?\*\/\s*)*@keyframes\s+([\w-]+)/);
    if (keyframeMatch) {
      keyframeBlocks.set(keyframeMatch[1], block);
      return;
    }

    if (block.includes('.si-anim svg') || cssMatchTokens.some(token => block.includes(token))) {
      relevantRules.push(block);
      collectAnimationNames(block);
    }
  });

  const filteredKeyframes = [...neededKeyframes]
    .map((name) => keyframeBlocks.get(name))
    .filter(Boolean);

  return [...relevantRules, ...filteredKeyframes].join('\n\n');
}

// Inline <style> inside SVG is parsed as XML. Raw '&' and '<' in CSS text
// can break exported files, so sanitize before injecting.
function escapeSvgStyleText(styleText) {
  return String(styleText || '')
    .replace(/&(?![A-Za-z#][A-Za-z0-9]*;)/g, '&amp;')
    .replace(/</g, '&lt;');
}

function stripCssComments(cssText = '') {
  return String(cssText || '').replace(/\/\*[\s\S]*?\*\//g, '');
}

function sanitizePremiumExportCss(cssText = '') {
  return stripCssComments(cssText)
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    .trim();
}

function sanitizePremiumExportSvg(svgText = '', rootClassName = PREMIUM_EXPORT_ROOT_CLASS) {
  const withoutHtmlComments = String(svgText || '').replace(/<!--[\s\S]*?-->/g, '').trim();
  return setPremiumSvgRootClasses(withoutHtmlComments, [rootClassName].filter(Boolean));
}

function splitTopLevelCssBlocks(cssText = '') {
  const blocks = [];
  let blockStart = 0;
  let braceDepth = 0;

  for (let i = 0; i < cssText.length; i += 1) {
    const char = cssText[i];
    if (char === '{') braceDepth += 1;
    if (char === '}') {
      braceDepth -= 1;
      if (braceDepth === 0) {
        const block = cssText.slice(blockStart, i + 1).trim();
        if (block) blocks.push(block);
        blockStart = i + 1;
      }
    }
  }

  return blocks;
}

function dedupeCommaSeparatedSelectors(selectorText = '') {
  return [...new Set(String(selectorText || '')
    .split(',')
    .map(selector => selector.trim())
    .filter(Boolean))]
    .join(',\n');
}

function isStandaloneRootSelector(selector = '', rootSelector = '') {
  return selector === rootSelector
    || selector.startsWith(`${rootSelector} `)
    || selector.startsWith(`${rootSelector}.`)
    || selector.startsWith(`${rootSelector}:`)
    || selector.startsWith(`${rootSelector}[`)
    || selector.startsWith(`${rootSelector}>`)
    || selector.startsWith(`${rootSelector}+`)
    || selector.startsWith(`${rootSelector}~`);
}

function hasAnimationDeclaration(ruleBody = '') {
  return /\banimation(?:-[\w-]+)?\s*:/.test(ruleBody);
}

function normalizePremiumStandaloneExportCss(
  cssText = '',
  {
    rootTokens = [],
    rootSelector = getPremiumStandaloneRootSelector(),
  } = {},
) {
  let css = String(cssText || '');

  css = css.replace(/\.si-icon-cell:hover\s+/g, '');
  css = css.replace(/\.icon-card:hover\s+/g, '');
  css = css.replace(/\.si-anim--[\w-]+\s+svg/g, rootSelector);
  css = css.replace(/\.si-anim\s+svg/g, rootSelector);
  css = css.replace(/:root:hover/g, rootSelector);
  css = css.replace(/:root/g, rootSelector);

  rootTokens.forEach((token) => {
    const escapedToken = escapeRegExp(token);
    css = css.replace(new RegExp(`\\.${escapedToken}:hover\\s+svg`, 'g'), rootSelector);
    css = css.replace(new RegExp(`\\.${escapedToken}:hover\\b`, 'g'), rootSelector);
    css = css.replace(new RegExp(`\\.${escapedToken}\\s+svg`, 'g'), rootSelector);
    css = css.replace(new RegExp(`\\.${escapedToken}(?=(?:\\s|\\{|\\.|#|\\[|>|\\+|~|,|:|$))`, 'g'), rootSelector);
  });

  return css;
}

function scopePremiumStandaloneAnimationRules(
  cssText = '',
  {
    playMode = 'loop',
    rootSelector = getPremiumStandaloneRootSelector(),
    rootClassName = PREMIUM_STANDALONE_ROOT_CLASS,
  } = {},
) {
  const blocks = splitTopLevelCssBlocks(stripCssComments(cssText));
  if (!blocks.length) return cssText;

  const trigger = playMode === 'hover' || playMode === 'click' ? playMode : 'loop';
  const triggerRoots = getPremiumStandaloneRootSelectors({ trigger, rootClassName });

  return blocks.map((block) => {
    if (/^\s*@keyframes\b/.test(block)) return block;

    const openBraceIndex = block.indexOf('{');
    const closeBraceIndex = block.lastIndexOf('}');
    if (openBraceIndex === -1 || closeBraceIndex === -1 || closeBraceIndex <= openBraceIndex) {
      return block;
    }

    const selectorText = block.slice(0, openBraceIndex).trim();
    const ruleBody = block.slice(openBraceIndex + 1, closeBraceIndex).trim();
    if (!selectorText) return block;

    const selectors = selectorText
      .split(',')
      .map(selector => selector.trim())
      .filter(Boolean);

    const mappedSelectors = selectors.flatMap((selector) => {
      if (!hasAnimationDeclaration(ruleBody)) return [selector];
      if (!isStandaloneRootSelector(selector, rootSelector)) return [selector];

      const suffix = selector.slice(rootSelector.length);
      return triggerRoots.map(triggerRoot => `${triggerRoot}${suffix}`);
    });

    const nextSelectors = dedupeCommaSeparatedSelectors(mappedSelectors.join(','));
    return `${nextSelectors} {\n${ruleBody}\n}`;
  }).join('\n\n');
}

function buildAnimatedSvg(
  svgText,
  iconCSS,
  color,
  animSpeed,
  playMode,
  cssContract = null,
  colorProfile = null,
  colorMode = PREMIUM_COLOR_MODE_CUSTOM,
  {
    rootClassName = PREMIUM_STANDALONE_ROOT_CLASS,
    preserveInternalRootClasses = true,
    sanitizeForExport = false,
  } = {},
) {
  const contract = cssContract || getPremiumSvgCssContract(svgText);
  const rootTokens = [...new Set(contract.cssMatchTokens || [])];
  const rootSelector = getPremiumTriggeredSelector({ rootClassName });
  const hoverRootSelector = getPremiumTriggeredSelector({ trigger: 'hover', rootClassName });
  const clickRootSelector = getPremiumTriggeredSelector({ trigger: 'click', rootClassName });
  const rootClassTokens = preserveInternalRootClasses
    ? [...new Set([...(contract.rootClasses || []), contract.animClass, rootClassName].filter(Boolean))]
    : [rootClassName].filter(Boolean);
  let svg = setPremiumSvgRootClasses(svgText, rootClassTokens);
  svg = applyPremiumSvgColorOverrides(svg, color, colorProfile, colorMode);

  if (iconCSS) {
    // Rewrite CSS for self-contained SVG:
    let css = applyPremiumCssColorOverrides(iconCSS, color);

    if (sanitizeForExport) {
      css = normalizePremiumStandaloneExportCss(css, {
        rootTokens,
        rootSelector,
      });
    } else {
      if (playMode === 'hover') {
        rootTokens.forEach((token) => {
          const escapedToken = escapeRegExp(token);
          css = css.replace(
            new RegExp(`(?:\\.si-icon-cell:hover|\\.icon-card:hover)\\s+\\.${escapedToken}\\s+svg`, 'g'),
            hoverRootSelector,
          );
          css = css.replace(
            new RegExp(`(?:\\.si-icon-cell:hover|\\.icon-card:hover)\\s+\\.${escapedToken}(?=\\s)`, 'g'),
            `.${token}:hover`,
          );
        });
      }

      // Remove any remaining external parent hover selectors
      css = css.replace(/\.si-icon-cell:hover\s+/g, '');
      css = css.replace(/\.icon-card:hover\s+/g, '');

      // Strip .si-anim--{name} wrapper selectors for standalone SVG
      // .si-anim--bell svg => svg.si-premium-standalone-root
      // .si-anim--checkmark svg .si-check-circle => svg.si-premium-standalone-root .si-check-circle
      css = css.replace(/\.si-anim--[\w-]+\s+svg/g, rootSelector);
      // .si-anim svg => svg.si-premium-standalone-root
      css = css.replace(/\.si-anim\s+svg/g, rootSelector);
      rootTokens.forEach((token) => {
        const escapedToken = escapeRegExp(token);
        css = css.replace(new RegExp(`\\.${escapedToken}\\s+svg`, 'g'), rootSelector);
      });
      css = css.replace(/:root:hover/g, hoverRootSelector);
      css = css.replace(/:root/g, rootSelector);
      css = css.replace(new RegExp(`${escapeRegExp(rootSelector)}\\s*,\\s*${escapeRegExp(rootSelector)}`, 'g'), rootSelector);
      css = css.replace(new RegExp(`${escapeRegExp(hoverRootSelector)}\\s*,\\s*${escapeRegExp(hoverRootSelector)}`, 'g'), hoverRootSelector);
    }

    // Apply animation speed multiplier
    if (animSpeed !== 1) {
      css = css.replace(/animation:\s*([\w-]+)\s+([\d.]+)s/g, (match, name, duration) => {
        const newDuration = (parseFloat(duration) / animSpeed).toFixed(2);
        return `animation: ${name} ${newDuration}s`;
      });
    }

    if (sanitizeForExport) {
      css = scopePremiumStandaloneAnimationRules(css, {
        playMode,
        rootSelector,
        rootClassName,
      });
    } else {
      // For hover-triggered export, scope root animations to hovering the standalone SVG root
      if (playMode === 'hover') {
        css = css.replace(new RegExp(`${escapeRegExp(rootSelector)}\\s*{([^}]*animation[^}]*)}`, 'g'), `${hoverRootSelector} {$1}`);
        css = css.replace(new RegExp(`${escapeRegExp(rootSelector)}\\s+\\.([\\w-]+)\\s*{([^}]*animation[^}]*)}`, 'g'), `${hoverRootSelector} .$1 {$2}`);
      }

      if (playMode === 'click') {
        css = css.replace(new RegExp(`${escapeRegExp(rootSelector)}\\s*{([^}]*animation[^}]*)}`, 'g'), `${clickRootSelector} {$1}`);
        css = css.replace(
          new RegExp(`${escapeRegExp(rootSelector)}\\s+\\.([\\w-]+)\\s*{([^}]*animation[^}]*)}`, 'g'),
          (match, descendantClass, ruleBody) => `${getPremiumTriggeredSelector({
            trigger: 'click',
            rootClassName,
            descendant: ` .${descendantClass}`,
          })} {${ruleBody}}`,
        );
      }
    }

    // Preview-only one-shot mode: export UI no longer exposes this option.
    if (playMode === 'once') {
      css = css.replace(/infinite/g, '1');
    }

    if (playMode === 'click') {
      css = css.replace(/infinite/g, '3');
    }

    if (sanitizeForExport) {
      css = sanitizePremiumExportCss(css);
    }

    const styleTag = `<style>${escapeSvgStyleText(css)}</style>`;
    svg = svg.replace(/<svg([^>]*)>/, `<svg$1>${styleTag}`);
  }

  if (sanitizeForExport) {
    svg = sanitizePremiumExportSvg(svg, rootClassName);
  }

  return svg;
}

const PREMIUM_COLOR_SWATCHES = ['#ffffff', '#a3a3a3', '#737373', '#ff4f00', '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4'];
const PREMIUM_PANEL_DEFAULTS = Object.freeze({
  color: '#ffffff',
  colorMode: PREMIUM_COLOR_MODE_ORIGINAL,
  originalColor: '#ffffff',
  animSpeed: 1,
  playMode: 'loop', // 'loop' | 'hover' | 'click'
  pngSize: 48,
});

let premiumPreviewStopTimer = null;
let currentPremiumSelection = null;
let premiumPanelState = createPremiumPanelState();

function createPremiumPanelState({ svgText = '', pngSize = PREMIUM_PANEL_DEFAULTS.pngSize, colorProfile = null } = {}) {
  const nextColorProfile = colorProfile || analyzePremiumColorProfile(svgText);
  const originalColor = resolvePremiumOriginalColor(nextColorProfile);

  return {
    ...PREMIUM_PANEL_DEFAULTS,
    pngSize,
    color: originalColor,
    originalColor,
    colorProfile: nextColorProfile,
    lastValidColor: originalColor,
    previewState: 'stopped',
    previewStatus: premiumPrefersReducedMotion()
      ? 'Autoplay paused for reduced motion.'
      : 'Stopped on resting frame.',
  };
}

function premiumPrefersReducedMotion() {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function clearPremiumPreviewTimer() {
  if (premiumPreviewStopTimer) {
    window.clearTimeout(premiumPreviewStopTimer);
    premiumPreviewStopTimer = null;
  }
}

function escapePanelHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function humanizeCollectionSlug(slug) {
  return String(slug || 'premium-collection')
    .split('-')
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function getPremiumCollectionName(collectionSlug) {
  const product = products.find(item => item.slug === collectionSlug)
    || findProductById(activeCollectionProductId);
  return product ? getProductName(product) : humanizeCollectionSlug(collectionSlug);
}

function openPremiumPanelIfNeeded(si = window.__supericons) {
  if (!si?.state || si.state.panelOpen) return;
  if (typeof si.setPanelOpen === 'function') {
    si.setPanelOpen(true);
  } else {
    si.togglePanel();
  }
}

function getPremiumPanelBody() {
  const panel = document.getElementById('panel');
  if (!panel) return null;

  const directChildren = Array.from(panel.children);
  const panelBody = directChildren.find(child => child.classList.contains('panel__body'))
    || directChildren.find(child => child.classList.contains('panel__placeholder'))
    || document.createElement('div');

  panelBody.className = 'panel__body';
  panelBody.style.display = '';

  if (!panelBody.parentElement) {
    panel.appendChild(panelBody);
  } else if (panelBody.parentElement === panel) {
    directChildren
      .filter(child => child !== panelBody && child.classList.contains('panel__placeholder'))
      .forEach(child => child.remove());
  }

  const lockedPanel = panel.querySelector('.locked-panel');
  if (lockedPanel) lockedPanel.remove();

  const controls = panel.querySelector('.panel__controls');
  if (controls) controls.style.display = '';

  return panelBody;
}

function setPremiumPreviewMarkup(markup) {
  const preview = document.getElementById('panelPreview');
  if (preview) preview.innerHTML = markup;
}

function renderPremiumPanelEmptyState(collectionName = 'Premium Collection') {
  clearPremiumPreviewTimer();
  currentPremiumSelection = null;
  premiumPanelState = createPremiumPanelState();

  setPremiumPreviewMarkup(`
    <div class="panel__preview-frame is-stopped">
      <span class="material-symbols-outlined panel__preview-icon" style="font-size:64px; color: var(--si-text-dim);">animation</span>
    </div>
  `);

  const panelBody = getPremiumPanelBody();
  if (!panelBody) return;
  disablePremiumPanelTooltip(panelBody);

  panelBody.innerHTML = `
      <div class="panel__section">
        <div class="panel__meta">
          <div class="panel__meta-head">
            <span class="panel__meta-subtitle">${escapePanelHtml(collectionName)}</span>
          </div>
        </div>
        <div class="panel__inline-placeholder">
          <span class="material-symbols-outlined panel__placeholder-icon">play_circle</span>
          <p class="panel__placeholder-text">Choose an icon from the collection grid to load preview, playback, and export controls.</p>
        </div>
    </div>
  `;
}

function renderPremiumPanelLoading(iconName, collectionName) {
  clearPremiumPreviewTimer();
  premiumPanelState.previewState = 'stopped';
  premiumPanelState.previewStatus = 'Loading icon customization...';

  setPremiumPreviewMarkup(`
    <div class="panel__preview-frame is-stopped">
      <span class="material-symbols-outlined panel__preview-icon" style="font-size:64px; color: var(--si-text-dim);">hourglass_empty</span>
    </div>
  `);

  const panelBody = getPremiumPanelBody();
  if (!panelBody) return;
  disablePremiumPanelTooltip(panelBody);

  panelBody.innerHTML = `
    <div class="panel__section">
      <div class="panel__meta">
        <div class="panel__meta-head">
          <span class="panel__meta-subtitle">${escapePanelHtml(collectionName)}</span>
        </div>
        <p class="panel__meta-title">${escapePanelHtml(iconName)}</p>
        <p class="panel__meta-helper">Loading preview and export settings for this animated icon.</p>
      </div>
      <div class="panel__inline-placeholder">
        <span class="material-symbols-outlined panel__placeholder-icon">progress_activity</span>
        <p class="panel__placeholder-text">Loading icon customization...</p>
      </div>
    </div>
  `;
}

function renderPremiumPanelError(iconName, collectionName, message) {
  clearPremiumPreviewTimer();
  currentPremiumSelection = null;
  premiumPanelState.previewState = 'stopped';
  premiumPanelState.previewStatus = 'Could not load this icon.';

  setPremiumPreviewMarkup(`
    <div class="panel__preview-frame is-stopped">
      <span class="material-symbols-outlined panel__preview-icon" style="font-size:64px; color: var(--si-text-dim);">warning</span>
    </div>
  `);

  const panelBody = getPremiumPanelBody();
  if (!panelBody) return;
  disablePremiumPanelTooltip(panelBody);

  panelBody.classList.add('panel__body--error');
  panelBody.innerHTML = `
    <div class="panel__section">
      <div class="panel__meta">
        <div class="panel__meta-head">
          <span class="panel__meta-subtitle">${escapePanelHtml(collectionName)}</span>
        </div>
        <p class="panel__meta-title">${escapePanelHtml(iconName)}</p>
        <p class="panel__meta-helper">Try another icon or try again in a moment.</p>
      </div>
      <div class="panel__error-state">
        <span class="material-symbols-outlined panel__error-icon">warning</span>
        <p class="panel__error-title">We could not load this icon right now.</p>
        <p class="panel__error-text">${escapePanelHtml(message)}</p>
      </div>
    </div>
  `;
}

function getPremiumPreviewStatusText() {
  if (premiumPanelState.previewState === 'playing') return 'Playing once';
  return premiumPanelState.previewStatus || 'Stopped on resting frame.';
}

function syncPremiumPreviewUI() {
  const panelBody = document.getElementById('panel')?.querySelector('.panel__body');
  if (!panelBody) return;

  const status = panelBody.querySelector('#premPreviewStatus');
  if (status) status.textContent = getPremiumPreviewStatusText();

  const note = panelBody.querySelector('#premPreviewNote');
  if (note) {
    note.textContent = premiumPrefersReducedMotion()
      ? 'Preview only | autoplay respects reduced motion'
      : 'Preview only';
  }

  const toggleBtn = panelBody.querySelector('#premPreviewToggle');
  if (toggleBtn) {
    const isPlaying = premiumPanelState.previewState === 'playing';
    toggleBtn.classList.toggle('panel__toolbar-btn--active', isPlaying);
    toggleBtn.setAttribute('aria-pressed', String(isPlaying));
    toggleBtn.setAttribute('aria-label', isPlaying ? 'Stop preview' : 'Play preview');
    toggleBtn.setAttribute('data-tip', isPlaying ? 'Stop preview' : 'Play preview');
    toggleBtn.innerHTML = `
      <span class="material-symbols-outlined" style="font-size:16px">${isPlaying ? 'stop' : 'play_arrow'}</span>
    `;
  }
}

function splitCssValueList(value) {
  return String(value || '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

function getCssListValue(list, index) {
  if (!list.length) return '';
  return list[index] ?? list[list.length - 1] ?? '';
}

function parseCssTimeMs(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return 0;
  const numeric = Number.parseFloat(trimmed);
  if (!Number.isFinite(numeric)) return 0;
  if (trimmed.endsWith('ms')) return numeric;
  return numeric * 1000;
}

function formatCssTimeMs(value) {
  const rounded = Math.max(value, 1);
  return `${Number(rounded.toFixed(2))}ms`;
}

function escapeHtmlAttributeValue(value = '') {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function setSvgRootAttributes(svgText = '', attributes = {}) {
  return String(svgText || '').replace(/<svg\b([^>]*)>/i, (match, attrs) => {
    let nextAttrs = attrs;

    Object.entries(attributes).forEach(([name, rawValue]) => {
      if (!name) return;
      const value = rawValue == null ? '' : String(rawValue);
      const escapedValue = escapeHtmlAttributeValue(value);
      const attrPattern = new RegExp(`\\b${escapeRegExp(name)}="([^"]*)"`, 'i');

      if (attrPattern.test(nextAttrs)) {
        nextAttrs = nextAttrs.replace(attrPattern, `${name}="${escapedValue}"`);
        return;
      }

      nextAttrs += ` ${name}="${escapedValue}"`;
    });

    return `<svg${nextAttrs}>`;
  });
}

function applyAnimSpeedToPreview(speedFactor) {
  const preview = document.getElementById('panelPreview');
  if (!preview) return;

  preview.querySelectorAll('*').forEach((el) => {
    const computed = getComputedStyle(el);
    if (!computed.animationName || computed.animationName === 'none') return;

    if (!el.dataset.baseDuration) {
      el.dataset.baseDuration = computed.animationDuration;
    }

    const baseDurations = splitCssValueList(el.dataset.baseDuration).map(duration => {
      const baseMs = parseCssTimeMs(duration);
      if (!baseMs) return duration;
      return formatCssTimeMs(baseMs / speedFactor);
    });

    if (baseDurations.length) {
      el.style.setProperty('animation-duration', baseDurations.join(', '), 'important');
    }
  });
}

function getAnimationTimelineDurationMs(root) {
  if (!root) return 0;

  const nodes = [root, ...root.querySelectorAll('*')];
  let maxDuration = 0;

  nodes.forEach((node) => {
    const computed = getComputedStyle(node);
    if (!computed.animationName || computed.animationName === 'none') return;

    const names = splitCssValueList(computed.animationName);
    const durations = splitCssValueList(computed.animationDuration);
    const delays = splitCssValueList(computed.animationDelay);
    const iterations = splitCssValueList(computed.animationIterationCount);

    names.forEach((name, index) => {
      if (!name || name === 'none') return;

      const durationMs = parseCssTimeMs(getCssListValue(durations, index));
      const delayMs = parseCssTimeMs(getCssListValue(delays, index));
      const iterationToken = getCssListValue(iterations, index);
      const iterationCount = iterationToken === 'infinite'
        ? 1
        : Math.max(Number.parseFloat(iterationToken) || 1, 1);
      maxDuration = Math.max(maxDuration, delayMs + (durationMs * iterationCount));
    });
  });

  return maxDuration;
}

function getPremiumPreviewDurationMs() {
  const preview = document.getElementById('panelPreview');
  if (!preview) return 0;
  return getAnimationTimelineDurationMs(preview);
}

function getPremiumExportClickReplayDurationMs(svgText = '') {
  if (typeof document === 'undefined' || !document.body || !svgText) return 850;

  const host = document.createElement('div');
  host.setAttribute('aria-hidden', 'true');
  host.style.cssText = 'position:absolute;left:-9999px;top:-9999px;width:0;height:0;overflow:hidden;pointer-events:none;opacity:0;';
  document.body.appendChild(host);
  host.innerHTML = svgText;

  const svgEl = host.querySelector(`svg.${PREMIUM_EXPORT_ROOT_CLASS}`) || host.querySelector('svg');
  if (!svgEl) {
    host.remove();
    return 850;
  }

  svgEl.classList.add('active');
  const durationMs = Math.max(getAnimationTimelineDurationMs(svgEl), 350);
  host.remove();
  return durationMs;
}

function buildPremiumExportClickReplayHandler() {
  return [
    'var svg=this;',
    'if(!svg||!svg.classList)return;',
    "var replayMs=Number(svg.getAttribute('data-si-click-ms'))||850;",
    'if(svg.__siReplayTimer){window.clearTimeout(svg.__siReplayTimer);}',
    "svg.classList.remove('active');",
    'void svg.getBoundingClientRect();',
    "svg.classList.add('active');",
    "svg.__siReplayTimer=window.setTimeout(function(){svg.classList.remove('active');svg.__siReplayTimer=0;}, replayMs);",
  ].join('');
}

function applyPremiumExportClickReplayBehavior(
  svgText = '',
  {
    replayDurationMs = 0,
  } = {},
) {
  const safeReplayDuration = Math.max(Math.ceil(Number(replayDurationMs) || 0), 350) + 48;
  return setSvgRootAttributes(svgText, {
    'data-si-click-ms': String(safeReplayDuration),
    onclick: buildPremiumExportClickReplayHandler(),
  });
}

function buildPremiumPreviewSvg() {
  if (!currentPremiumSelection) return '';
  if (premiumPanelState.previewState !== 'playing') {
    return buildStaticPremiumSvg(currentPremiumSelection.svgText);
  }

  return buildAnimatedSvg(
    currentPremiumSelection.svgText,
    currentPremiumSelection.iconCSS || '',
    getPremiumAppliedColor(),
    premiumPanelState.animSpeed,
    'once',
    currentPremiumSelection.cssContract,
    currentPremiumSelection.colorProfile,
    premiumPanelState.colorMode,
  );
}

function renderPremiumPreview() {
  if (!currentPremiumSelection?.svgText) return;

  const stateClass = premiumPanelState.previewState === 'playing'
    ? 'panel__preview-frame is-playing'
    : 'panel__preview-frame is-resting';
  const previewSvg = buildPremiumPreviewSvg();

  setPremiumPreviewMarkup(`
    <div class="${stateClass}">
      <div class="panel__preview-icon panel__preview-icon--premium">${previewSvg}</div>
    </div>
  `);

  const svgEl = document.getElementById('panelPreview')?.querySelector('svg');
  if (svgEl) {
    svgEl.removeAttribute('width');
    svgEl.removeAttribute('height');
    svgEl.style.width = '64px';
    svgEl.style.height = '64px';
  }

  if (premiumPanelState.previewState === 'playing') {
    requestAnimationFrame(() => {
      const durationMs = Math.max(getPremiumPreviewDurationMs(), 350);
      clearPremiumPreviewTimer();
      premiumPreviewStopTimer = window.setTimeout(() => {
        premiumPanelState.previewState = 'stopped';
        premiumPanelState.previewStatus = 'Stopped on resting frame.';
        renderPremiumPreview();
      }, durationMs + 80);
    });
  } else {
    clearPremiumPreviewTimer();
  }

  syncPremiumPreviewUI();
}

function startPremiumPreview() {
  if (!currentPremiumSelection?.svgText) return;

  premiumPanelState.previewState = 'playing';
  premiumPanelState.previewStatus = 'Playing once';
  renderPremiumPreview();
}

function stopPremiumPreview(statusText = 'Stopped on resting frame.') {
  clearPremiumPreviewTimer();
  premiumPanelState.previewState = 'stopped';
  premiumPanelState.previewStatus = statusText;
  renderPremiumPreview();
}

function updatePremiumPreview() {
  if (!currentPremiumSelection?.svgText) return;

  startPremiumPreview();
}

function setPremiumColorValidation(message = '') {
  const panelBody = document.getElementById('panel')?.querySelector('.panel__body');
  if (!panelBody) return;

  const hex = panelBody.querySelector('#premColorHex');
  if (hex) hex.classList.toggle('customize-color__hex--invalid', Boolean(message));

  const hint = panelBody.querySelector('#premColorHint');
  if (hint) {
    hint.hidden = !message;
    hint.textContent = message || '';
  }
}

function buildStaticPremiumSvg(svgText) {
  return applyPremiumSvgColorOverrides(
    svgText,
    getPremiumAppliedColor(),
    currentPremiumSelection?.colorProfile || premiumPanelState.colorProfile,
    premiumPanelState.colorMode,
  );
}

function buildPremiumAnimatedExportSvg(selection = currentPremiumSelection, state = premiumPanelState) {
  if (!selection?.svgText) return '';

  const svg = buildAnimatedSvg(
    selection.svgText,
    selection.iconCSS,
    getPremiumAppliedColor(state),
    state.animSpeed,
    state.playMode,
    selection.cssContract,
    selection.colorProfile,
    state.colorMode,
    {
      rootClassName: PREMIUM_EXPORT_ROOT_CLASS,
      preserveInternalRootClasses: false,
      sanitizeForExport: true,
    },
  );

  if (!svg || state.playMode !== 'click') return svg;

  return applyPremiumExportClickReplayBehavior(svg, {
    replayDurationMs: getPremiumExportClickReplayDurationMs(svg),
  });
}

function buildPremiumStaticExportSvg(selection = currentPremiumSelection) {
  if (!selection?.svgText) return '';
  return buildStaticPremiumSvg(selection.svgText);
}

function toPremiumPascalCase(value) {
  const formatted = String(value || '')
    .replace(/[^a-zA-Z0-9]+([a-zA-Z0-9])/g, (_, next) => next.toUpperCase())
    .replace(/^[^a-zA-Z0-9]+/, '')
    .replace(/^[a-z]/, ch => ch.toUpperCase())
    .replace(/[^a-zA-Z0-9]/g, '');

  if (!formatted) return 'PremiumIcon';
  if (/^[0-9]/.test(formatted)) return `Premium${formatted}`;
  return formatted;
}

function escapeTemplateLiteral(value) {
  return String(value || '')
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$\{/g, '\\${');
}

function svgToBase64DataUri(svgText) {
  const encoded = btoa(unescape(encodeURIComponent(String(svgText || ''))));
  return `data:image/svg+xml;base64,${encoded}`;
}

function isPremiumBase64ExportSupported(playMode = premiumPanelState.playMode) {
  return playMode === 'loop';
}

function getPremiumBase64UnsupportedMessage(playMode = premiumPanelState.playMode) {
  if (playMode === 'hover') {
    return 'Base64 data URIs do not preserve hover-triggered SVG interaction. Use Animated SVG, HTML, or a framework component instead.';
  }

  if (playMode === 'click') {
    return 'Base64 data URIs do not preserve click-triggered SVG interaction. Use Animated SVG, HTML, or a framework component instead.';
  }

  return '';
}

function syncPremiumExportAffordances(panelBody = document.getElementById('panel')?.querySelector('.panel__body')) {
  if (!panelBody) return;

  const base64Btn = panelBody.querySelector('#premCopyBase64');
  if (!base64Btn) return;

  const supported = isPremiumBase64ExportSupported(premiumPanelState.playMode);
  base64Btn.classList.toggle('customize-export__btn--disabled', !supported);
  base64Btn.setAttribute('aria-disabled', String(!supported));

  if (supported) {
    base64Btn.removeAttribute('data-tip');
    return;
  }

  base64Btn.setAttribute('data-tip', getPremiumBase64UnsupportedMessage(premiumPanelState.playMode));
}

function buildPremiumReactCode(componentName, svgText) {
  const escapedSvg = escapeTemplateLiteral(svgText);
  return `import React from 'react';

const svgMarkup = \`${escapedSvg}\`;

function buildSvgMarkup(svgClassName = '', active = false) {
  const mergedSvgClassName = ['si-animated-icon', svgClassName, active ? 'active' : ''].filter(Boolean).join(' ');
  return svgMarkup.replace(/class="si-animated-icon"/, \`class="\${mergedSvgClassName}"\`);
}

export function ${componentName}Icon({ className = '', svgClassName = '', active = false, ...props }) {
  const resolvedSvgMarkup = buildSvgMarkup(svgClassName, active);
  return (
    <span
      {...props}
      className={className}
      dangerouslySetInnerHTML={{ __html: resolvedSvgMarkup }}
    />
  );
}
`;
}

function buildPremiumHtmlSnippet(svgText) {
  return svgText;
}

function buildPremiumVueCode(svgText) {
  const escapedSvg = escapeTemplateLiteral(svgText);
  return `<script setup>
import { computed } from 'vue';

const props = defineProps({
  className: { type: String, default: '' },
  svgClassName: { type: String, default: '' },
  active: { type: Boolean, default: false },
});

const svgMarkup = \`${escapedSvg}\`;
const resolvedSvgMarkup = computed(() => {
  const mergedSvgClassName = ['si-animated-icon', props.svgClassName, props.active ? 'active' : ''].filter(Boolean).join(' ');
  return svgMarkup.replace(/class="si-animated-icon"/, \`class="\${mergedSvgClassName}"\`);
});
</script>

<template>
  <span :class="props.className" v-html="resolvedSvgMarkup"></span>
</template>`;
}

function buildPremiumSvelteCode(svgText) {
  const escapedSvg = escapeTemplateLiteral(svgText);
  return `<script>
  export let className = '';
  export let svgClassName = '';
  export let active = false;

  const svgMarkup = \`${escapedSvg}\`;
  let resolvedSvgMarkup = svgMarkup;

  function buildSvgMarkup(svgClassName, active) {
    const mergedSvgClassName = ['si-animated-icon', svgClassName, active ? 'active' : ''].filter(Boolean).join(' ');
    return svgMarkup.replace(/class="si-animated-icon"/, \`class="\${mergedSvgClassName}"\`);
  }

  $: resolvedSvgMarkup = buildSvgMarkup(svgClassName, active);
</script>

<span class={className}>{@html resolvedSvgMarkup}</span>`;
}

function resetPremiumPanelControls() {
  if (!currentPremiumSelection?.svgText) return;

  premiumPanelState = {
    ...createPremiumPanelState({
      svgText: currentPremiumSelection.svgText,
      colorProfile: currentPremiumSelection.colorProfile,
    }),
  };

  renderPremiumPanel(currentPremiumSelection);
  showToast('Customize settings reset');
}

async function selectPremiumIcon(iconName, collectionSlug) {
  const si = window.__supericons;
  if (!si) return;
  const requestId = ++premiumSelectionRequestId;
  const collectionName = getPremiumCollectionName(collectionSlug);

  try {
    document.querySelectorAll('.collection-detail__icon-cell.selected').forEach(el => el.classList.remove('selected'));
    document.querySelectorAll('.collection-detail__icon-cell').forEach(cell => {
      const isSelected = cell.dataset.iconName === iconName;
      cell.classList.toggle('selected', isSelected);
      cell.setAttribute('aria-pressed', String(isSelected));
    });

    openPremiumPanelIfNeeded(si);
    renderPremiumPanelLoading(iconName, collectionName);

    let svgText = currentCollectionBundle?.icons?.[iconName] || '';
    if (!svgText) {
      const svgRes = await fetchPremiumAsset(collectionSlug, `${iconName}.svg`);
      if (!svgRes.ok) {
        renderPremiumPanelError(iconName, collectionName, 'We could not load this icon right now. Try another icon or try again.');
        showToast('Could not load icon');
        return;
      }
      svgText = await svgRes.text();
    }
    // Look up the CSS filename from the manifest for this collection
    const manifest = await loadManifest();
    const collData = manifest?.[collectionSlug];
    const collectionCSS = await getCollectionCSS(collectionSlug, collData?.css);
    const cssContract = getPremiumSvgCssContract(svgText, iconName, collData);
    const iconCSS = extractIconCSS(collectionCSS, iconName, { svgText, collectionData: collData });
    const colorProfile = analyzePremiumColorProfile(svgText);
    if (requestId !== premiumSelectionRequestId) return;

    if (collectionCSS && !iconCSS.trim()) {
      warnPremiumPreviewContract('No standalone CSS extracted for premium icon.', {
        iconName,
        collectionSlug,
        cssContract,
      });
      renderPremiumPanelError(iconName, collectionName, 'We could not load this icon preview right now. Try another icon or try again.');
      showToast('Could not load icon preview');
      return;
    }

    if (!svgText) {
      renderPremiumPanelError(iconName, collectionName, 'We could not load this icon right now. Try another icon or try again.');
      showToast('Could not load icon');
      return;
    }

    premiumPanelState = createPremiumPanelState({ svgText, colorProfile });
    currentPremiumSelection = {
      iconName,
      collectionSlug,
      collectionName,
      svgText,
      iconCSS,
      cssContract,
      colorProfile,
    };

    renderPremiumPanel(currentPremiumSelection);

    if (premiumPrefersReducedMotion()) {
      stopPremiumPreview('Autoplay paused for reduced motion.');
    } else {
      startPremiumPreview();
    }
  } catch (e) {
    console.warn('[Store] Failed to select premium icon:', e);
    renderPremiumPanelError(iconName, collectionName, 'We could not load this icon right now. Try another icon or try again.');
    showToast('Error loading icon');
  }
}

function renderPremiumPanel(selection) {
  if (!selection) return;
  const c = premiumPanelState;
  const panelBody = getPremiumPanelBody();
  if (!panelBody) return;
  hidePremiumPanelTooltip();
  const normalizedCustomColor = normalizePremiumHexColor(c.color);
  const usesPresetCustomColor = PREMIUM_COLOR_SWATCHES.some(sc => normalizePremiumHexColor(sc) === normalizedCustomColor);
  const base64Supported = isPremiumBase64ExportSupported(c.playMode);
  const base64UnsupportedMessage = base64Supported ? '' : getPremiumBase64UnsupportedMessage(c.playMode);
  const base64ButtonClass = `customize-export__btn${base64Supported ? '' : ' customize-export__btn--disabled'}`;
  const base64ButtonAttrs = base64Supported
    ? ''
    : ` aria-disabled="true" data-tip="${escapePanelHtml(base64UnsupportedMessage)}"`;

  panelBody.innerHTML = `
    <div class="panel__section">
      <div class="panel__meta">
        <div class="panel__meta-head">
          <span class="panel__meta-subtitle">${escapePanelHtml(selection.collectionName)}</span>
        </div>
        <p class="panel__meta-title">${escapePanelHtml(selection.iconName)}</p>
      </div>
    </div>

    <div class="panel__section panel__section--compact">
      <div class="panel__row panel__row--preview">
        <button class="panel__toolbar-btn panel__toolbar-btn--compact panel__toolbar-btn--icon" id="premPreviewToggle" type="button" aria-pressed="${c.previewState === 'playing'}" aria-label="Play preview" data-tip="Play preview">
          <span class="material-symbols-outlined" style="font-size:16px">play_arrow</span>
        </button>
        <div class="panel__row-control panel__row-control--slider">
          <div class="panel__control-label panel__control-label--tight">
            <span class="panel__control-title">Speed</span>
            <span class="customize-slider__value" id="premAnimSpeedValue">${c.animSpeed}x</span>
          </div>
          <div class="customize-slider">
            <input type="range" id="premAnimSpeed" min="0.25" max="3" step="0.25" value="${c.animSpeed}" class="customize-slider__range">
          </div>
        </div>
      </div>
      <div class="panel__preview-meta panel__preview-meta--compact">
        <span class="panel__preview-note" id="premPreviewNote">Preview only</span>
        <span class="panel__preview-status" id="premPreviewStatus">${escapePanelHtml(getPremiumPreviewStatusText())}</span>
      </div>
    </div>

    <div class="panel__section panel__section--compact">
      <div class="panel__section-title">Color</div>
      <div class="customize-color-palette" role="group" aria-label="Premium color palette">
        <button
          class="customize-color-dot customize-color-dot--original ${c.colorMode === PREMIUM_COLOR_MODE_ORIGINAL ? 'customize-color-dot--active' : ''}"
          id="premColorOriginal"
          type="button"
          data-prem-color-mode="${PREMIUM_COLOR_MODE_ORIGINAL}"
          data-tip="Default"
          aria-pressed="${c.colorMode === PREMIUM_COLOR_MODE_ORIGINAL}"
          aria-label="Use original color palette"
        ></button>
        ${PREMIUM_COLOR_SWATCHES.map(sc => {
          const active = c.colorMode === PREMIUM_COLOR_MODE_CUSTOM && normalizePremiumHexColor(sc) === normalizedCustomColor;
          return `<button class="customize-color-dot ${active ? 'customize-color-dot--active' : ''}" type="button" data-prem-color="${sc}" data-tip="${sc}" style="background:${sc}" aria-label="Color ${sc}" aria-pressed="${active}"></button>`;
        }).join('')}
        <label
          class="customize-color-add ${c.colorMode === PREMIUM_COLOR_MODE_CUSTOM && !usesPresetCustomColor ? 'customize-color-add--active' : ''}"
          id="premCustomColorAdd"
          data-tip="Custom color"
          aria-label="Choose custom color"
        >
          <span class="material-symbols-outlined" style="font-size:14px">add</span>
          <input type="color" id="premColorPicker" value="${c.color}" class="customize-color__picker-hidden">
        </label>
      </div>
    </div>

    <div class="panel__section panel__section--compact">
      <div class="panel__section-subtitle-row panel__section-subtitle-row--tight">
        <div class="panel__section-subtitle">Export trigger</div>
        <button
          class="panel__inline-tip"
          type="button"
          aria-label="Explain export trigger"
          data-tip="${escapePanelHtml(EXPORT_TRIGGER_TOOLTIP_COPY)}"
        >
          <span class="material-symbols-outlined" style="font-size:12px">info</span>
        </button>
      </div>
      <div class="panel__row panel__row--export-behavior">
        <div class="panel__segmented panel__segmented--compact panel__segmented--single-line" role="group" aria-label="Animation trigger">
          <button class="panel__segmented-btn panel__segmented-btn--choice ${c.playMode === 'loop' ? 'active' : ''}" type="button" data-prem-trigger="loop" aria-pressed="${c.playMode === 'loop'}">Loop</button>
          <button class="panel__segmented-btn panel__segmented-btn--choice ${c.playMode === 'hover' ? 'active' : ''}" type="button" data-prem-trigger="hover" aria-pressed="${c.playMode === 'hover'}">Hover</button>
          <button class="panel__segmented-btn panel__segmented-btn--choice ${c.playMode === 'click' ? 'active' : ''}" type="button" data-prem-trigger="click" aria-pressed="${c.playMode === 'click'}">Click</button>
        </div>
        <button class="panel__icon-btn panel__icon-btn--reset" id="premResetAll" type="button" aria-label="Reset all" data-tip="Reset all">
          <span class="material-symbols-outlined" style="font-size:16px">restart_alt</span>
        </button>
      </div>
    </div>

    <div class="panel__section panel__section--compact">
      <div class="panel__section-title">Export</div>
      <div class="customize-export-group">
        <div class="panel__section-subtitle">SVG</div>
        <div class="customize-export">
          <button class="customize-export__btn customize-export__btn--primary" id="premDownloadAnimSvg" type="button">
            <span class="material-symbols-outlined" style="font-size:16px">download</span> Download Animated SVG
          </button>
          <button class="customize-export__btn" id="premCopyAnimSvg" type="button">
            <span class="material-symbols-outlined" style="font-size:16px">content_copy</span> Copy Animated SVG
          </button>
          <button class="customize-export__btn customize-export__btn--subtle" id="premCopySvgOnly" type="button">
            <span class="material-symbols-outlined" style="font-size:16px">content_copy</span> Copy SVG (static)
          </button>
        </div>
      </div>

      <div class="customize-export-group customize-export-group--code">
        <div class="panel__section-subtitle">Code</div>
        <div class="customize-export">
          <button class="customize-export__btn" id="premCopyReact" type="button">
            <span class="material-symbols-outlined" style="font-size:16px">code</span> Copy React
          </button>
          <button class="${base64ButtonClass}" id="premCopyBase64" type="button"${base64ButtonAttrs}>
            <span class="material-symbols-outlined" style="font-size:16px">data_object</span> Copy Base64
          </button>
          <button class="customize-export__btn" id="premCopyHtml" type="button">
            <span class="material-symbols-outlined" style="font-size:16px">code</span> Copy HTML
          </button>
          <button class="customize-export__btn" id="premCopyVue" type="button">
            <span class="material-symbols-outlined" style="font-size:16px">code</span> Copy Vue
          </button>
          <button class="customize-export__btn" id="premCopySvelte" type="button">
            <span class="material-symbols-outlined" style="font-size:16px">code</span> Copy Svelte
          </button>
        </div>
      </div>

      <div class="customize-export-group customize-export-group--png">
        <div class="customize-export-group__head">
          <div class="panel__section-subtitle">PNG</div>
          <span class="png-size-badge" id="premPngBadge">${c.pngSize}px</span>
        </div>
        <div class="png-size-picker png-size-picker--compact">
          ${[16, 24, 32, 48, 64, 128, 256].map(s => `
            <button class="png-size-btn ${s === c.pngSize ? 'active' : ''}" data-prem-png-size="${s}" type="button">${s}</button>
          `).join('')}
        </div>
        <div class="customize-export">
          <button class="customize-export__btn" id="premDownloadPng" type="button">
            <span class="material-symbols-outlined" style="font-size:16px">image</span>
            Download PNG
          </button>
        </div>
      </div>
    </div>
  `;

  renderPremiumPreview();
  initPremiumPanelTooltip(panelBody);
  wirePremiumPanelEvents(panelBody);
}

function getPremiumPanelTooltip() {
  let tip = document.getElementById('premiumPanelTooltip');
  if (!tip) {
    tip = document.createElement('div');
    tip.id = 'premiumPanelTooltip';
    document.body.appendChild(tip);
  }
  return tip;
}

function hidePremiumPanelTooltip() {
  const tip = document.getElementById('premiumPanelTooltip');
  if (!tip) return;
  tip.classList.remove('visible', 'premium-panel-tooltip--below');
}

function positionPremiumPanelTooltip(tip, anchorEl) {
  const rect = anchorEl.getBoundingClientRect();
  const margin = 12;
  const tipRect = tip.getBoundingClientRect();
  const centerX = rect.left + (rect.width / 2);
  const clampedCenterX = Math.min(
    Math.max(centerX, margin + (tipRect.width / 2)),
    window.innerWidth - margin - (tipRect.width / 2),
  );
  const showBelow = rect.top < tipRect.height + 18;

  tip.classList.toggle('premium-panel-tooltip--below', showBelow);
  tip.style.left = `${clampedCenterX}px`;
  tip.style.top = showBelow
    ? `${rect.bottom + 8}px`
    : `${rect.top - 8}px`;
}

function initPremiumPanelTooltip(panelBody) {
  if (!panelBody) return;
  panelBody.classList.add('panel__body--premium-tooltips');

  if (panelBody.dataset.premiumTooltipBound === 'true') return;

  const tip = getPremiumPanelTooltip();
  let hideTimer = null;

  const showTooltip = (target) => {
    const el = target?.closest?.('[data-tip]');
    if (!el || !panelBody.contains(el)) return;
    clearTimeout(hideTimer);
    const text = el.getAttribute('data-tip');
    if (!text) return;
    tip.textContent = text;
    tip.classList.add('visible');
    positionPremiumPanelTooltip(tip, el);
  };

  const scheduleHide = () => {
    clearTimeout(hideTimer);
    hideTimer = window.setTimeout(() => {
      hidePremiumPanelTooltip();
    }, 50);
  };

  panelBody.addEventListener('mouseover', (e) => {
    showTooltip(e.target);
  });

  panelBody.addEventListener('mouseout', (e) => {
    const fromEl = e.target?.closest?.('[data-tip]');
    if (!fromEl || !panelBody.contains(fromEl)) return;
    const toEl = e.relatedTarget?.closest?.('[data-tip]');
    if (toEl === fromEl) return;
    scheduleHide();
  });

  panelBody.addEventListener('focusin', (e) => {
    showTooltip(e.target);
  });

  panelBody.addEventListener('focusout', (e) => {
    const fromEl = e.target?.closest?.('[data-tip]');
    if (!fromEl || !panelBody.contains(fromEl)) return;
    const toEl = e.relatedTarget?.closest?.('[data-tip]');
    if (toEl === fromEl) return;
    scheduleHide();
  });

  window.addEventListener('scroll', hidePremiumPanelTooltip, true);
  window.addEventListener('resize', hidePremiumPanelTooltip);

  panelBody.dataset.premiumTooltipBound = 'true';
}

function disablePremiumPanelTooltip(panelBody) {
  if (!panelBody) return;
  panelBody.classList.remove('panel__body--premium-tooltips');
  hidePremiumPanelTooltip();
}

function wirePremiumPanelEvents(panelBody) {
  const selection = currentPremiumSelection;
  if (!selection) return;

  const syncPremiumColorPaletteUI = () => {
    const originalBtn = panelBody.querySelector('#premColorOriginal');
    if (originalBtn) {
      const active = premiumPanelState.colorMode === PREMIUM_COLOR_MODE_ORIGINAL;
      originalBtn.classList.toggle('customize-color-dot--active', active);
      originalBtn.setAttribute('aria-pressed', String(active));
    }

    const normalizedActiveColor = normalizePremiumHexColor(premiumPanelState.color);
    let presetMatch = false;
    panelBody.querySelectorAll('[data-prem-color]').forEach((btn) => {
      const active = premiumPanelState.colorMode === PREMIUM_COLOR_MODE_CUSTOM
        && normalizePremiumHexColor(btn.dataset.premColor) === normalizedActiveColor;
      presetMatch ||= active;
      btn.classList.toggle('customize-color-dot--active', active);
      btn.setAttribute('aria-pressed', String(active));
    });

    const customAdd = panelBody.querySelector('#premCustomColorAdd');
    if (customAdd) {
      customAdd.classList.toggle(
        'customize-color-add--active',
        premiumPanelState.colorMode === PREMIUM_COLOR_MODE_CUSTOM && !presetMatch,
      );
    }

    const picker = panelBody.querySelector('#premColorPicker');
    if (picker) picker.value = premiumPanelState.color;
  };

  panelBody.querySelectorAll('[data-prem-color-mode]').forEach(btn => {
    btn.addEventListener('click', () => {
      premiumPanelState.colorMode = btn.dataset.premColorMode;
      syncPremiumColorPaletteUI();
      updatePremiumPreview();
    });
  });

  const picker = panelBody.querySelector('#premColorPicker');
  if (picker) picker.addEventListener('input', (e) => {
    premiumPanelState.colorMode = PREMIUM_COLOR_MODE_CUSTOM;
    premiumPanelState.color = e.target.value;
    premiumPanelState.lastValidColor = premiumPanelState.color;
    syncPremiumColorPaletteUI();
    updatePremiumPreview();
  });

  syncPremiumColorPaletteUI();

  panelBody.querySelectorAll('[data-prem-color]').forEach(btn => {
    btn.addEventListener('click', () => {
      premiumPanelState.colorMode = PREMIUM_COLOR_MODE_CUSTOM;
      premiumPanelState.color = btn.dataset.premColor;
      premiumPanelState.lastValidColor = premiumPanelState.color;
      syncPremiumColorPaletteUI();
      updatePremiumPreview();
    });
  });

  const speed = panelBody.querySelector('#premAnimSpeed');
  const speedVal = panelBody.querySelector('#premAnimSpeedValue');
  if (speed) speed.addEventListener('input', (e) => {
    premiumPanelState.animSpeed = Number.parseFloat(e.target.value);
    if (speedVal) speedVal.textContent = `${premiumPanelState.animSpeed}x`;
    updatePremiumPreview();
  });

  panelBody.querySelectorAll('[data-prem-trigger]').forEach(btn => {
    btn.addEventListener('click', () => {
      premiumPanelState.playMode = btn.dataset.premTrigger;
      panelBody.querySelectorAll('[data-prem-trigger]').forEach(other => {
        const active = other === btn;
        other.classList.toggle('active', active);
        other.setAttribute('aria-pressed', String(active));
      });
      syncPremiumExportAffordances(panelBody);
      hidePremiumPanelTooltip();
    });
  });

  const previewToggleBtn = panelBody.querySelector('#premPreviewToggle');
  previewToggleBtn?.addEventListener('click', () => {
    if (premiumPanelState.previewState === 'playing') {
      stopPremiumPreview();
      return;
    }
    startPremiumPreview();
  });

  const resetBtn = panelBody.querySelector('#premResetAll');
  resetBtn?.addEventListener('click', () => resetPremiumPanelControls());

  panelBody.querySelectorAll('[data-prem-png-size]').forEach(btn => {
    btn.addEventListener('click', () => {
      premiumPanelState.pngSize = Number.parseInt(btn.dataset.premPngSize, 10);
      panelBody.querySelectorAll('[data-prem-png-size]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const badge = panelBody.querySelector('#premPngBadge');
      if (badge) badge.textContent = `${premiumPanelState.pngSize}px`;
    });
  });

  const buildAnimatedPayload = () => buildPremiumAnimatedExportSvg(selection, premiumPanelState);
  const buildStaticPayload = () => buildPremiumStaticExportSvg(selection);
  const copyToClipboard = async (text, successMessage, failureMessage) => {
    if (!text) {
      showToast(failureMessage);
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      showToast(successMessage);
    } catch (err) {
      console.warn('[Store] Clipboard write failed:', err);
      showToast(failureMessage);
    }
  };

  const copyAnim = panelBody.querySelector('#premCopyAnimSvg');
  copyAnim?.addEventListener('click', async () => {
    const svg = buildAnimatedPayload();
    await copyToClipboard(
      svg,
      'Animated SVG copied',
      'Could not copy animated SVG. Try downloading it instead.',
    );
  });

  const copyStatic = panelBody.querySelector('#premCopySvgOnly');
  copyStatic?.addEventListener('click', async () => {
    const svg = buildStaticPayload();
    await copyToClipboard(
      svg,
      'Static SVG copied',
      'Could not copy static SVG. Try downloading it instead.',
    );
  });

  const dlAnim = panelBody.querySelector('#premDownloadAnimSvg');
  dlAnim?.addEventListener('click', () => {
    try {
      const svg = buildAnimatedPayload();
      if (!svg) {
        showToast('Could not download animated SVG. Try again.');
        return;
      }
      const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selection.iconName}-animated.svg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('Animated SVG downloaded');
    } catch (err) {
      console.warn('[Store] Failed to download animated SVG:', err);
      showToast('Could not download animated SVG. Try again.');
    }
  });

  const copyReact = panelBody.querySelector('#premCopyReact');
  copyReact?.addEventListener('click', async () => {
    const svg = buildAnimatedPayload();
    const componentName = toPremiumPascalCase(selection.iconName);
    const code = svg ? buildPremiumReactCode(componentName, svg) : '';
    await copyToClipboard(
      code,
      'React component copied',
      'Could not copy React component right now.',
    );
  });

  const copyBase64 = panelBody.querySelector('#premCopyBase64');
  copyBase64?.addEventListener('click', async () => {
    if (!isPremiumBase64ExportSupported(premiumPanelState.playMode)) {
      showToast(getPremiumBase64UnsupportedMessage(premiumPanelState.playMode));
      return;
    }
    const svg = buildAnimatedPayload();
    const dataUri = svg ? svgToBase64DataUri(svg) : '';
    await copyToClipboard(
      dataUri,
      'Base64 data URI copied',
      'Could not copy Base64 right now.',
    );
  });

  syncPremiumExportAffordances(panelBody);

  const copyHtml = panelBody.querySelector('#premCopyHtml');
  copyHtml?.addEventListener('click', async () => {
    const svg = buildAnimatedPayload();
    const html = svg ? buildPremiumHtmlSnippet(svg) : '';
    await copyToClipboard(
      html,
      'HTML snippet copied',
      'Could not copy HTML right now.',
    );
  });

  const copyVue = panelBody.querySelector('#premCopyVue');
  copyVue?.addEventListener('click', async () => {
    const svg = buildAnimatedPayload();
    const vueCode = svg ? buildPremiumVueCode(svg) : '';
    await copyToClipboard(
      vueCode,
      'Vue component copied',
      'Could not copy Vue component right now.',
    );
  });

  const copySvelte = panelBody.querySelector('#premCopySvelte');
  copySvelte?.addEventListener('click', async () => {
    const svg = buildAnimatedPayload();
    const svelteCode = svg ? buildPremiumSvelteCode(svg) : '';
    await copyToClipboard(
      svelteCode,
      'Svelte component copied',
      'Could not copy Svelte component right now.',
    );
  });

  const dlPng = panelBody.querySelector('#premDownloadPng');
  dlPng?.addEventListener('click', () => {
    try {
      const svg = buildStaticPayload();
      if (!svg) {
        showToast('Could not create PNG right now. Try again.');
        return;
      }
      const size = premiumPanelState.pngSize;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        showToast('Could not create PNG right now. Try again.');
        return;
      }

      const img = new Image();
      const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
      const blobUrl = URL.createObjectURL(blob);

      img.onload = () => {
        ctx.clearRect(0, 0, size, size);
        ctx.drawImage(img, 0, 0, size, size);
        canvas.toBlob((pngBlob) => {
          if (!pngBlob) {
            showToast('Could not create PNG right now. Try again.');
            return;
          }

          const dlUrl = URL.createObjectURL(pngBlob);
          const a = document.createElement('a');
          a.href = dlUrl;
          a.download = `${selection.iconName}-${size}px.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(dlUrl);
          showToast('PNG downloaded');
        });
        URL.revokeObjectURL(blobUrl);
      };

      img.onerror = () => {
        URL.revokeObjectURL(blobUrl);
        showToast('Could not create PNG right now. Try again.');
      };

      img.src = blobUrl;
    } catch (err) {
      console.warn('[Store] Failed to download PNG:', err);
      showToast('Could not create PNG right now. Try again.');
    }
  });
}

async function loadCollectionCSS(slug, cssFile) {
  const linkId = `collection-css-${slug}`;
  if (document.getElementById(linkId)) return; // already loaded
  // Fetch CSS through Edge Function and inject as <style> tag
  // (cannot use <link> with Edge Function URL due to auth headers)
  try {
    const res = await fetchPremiumAsset(slug, cssFile);
    if (!res.ok) return;
    const cssText = await res.text();
    const style = document.createElement('style');
    style.id = linkId;
    style.textContent = cssText;
    document.head.appendChild(style);
  } catch { /* silent */ }
}

// Show locked customize panel for non-purchasers
function showLockedPanel(iconName, product) {
  const panel = document.getElementById('panel');
  if (!panel) return;

  clearPremiumPreviewTimer();
  currentPremiumSelection = null;
  premiumPanelState = createPremiumPanelState();

  const priceDisplay = (product.price_cents / 100).toFixed(product.price_cents % 100 === 0 ? 0 : 2);

  // Replace preview with lock icon
  const preview = document.getElementById('panelPreview');
  if (preview) {
    preview.innerHTML = `
      <div class="locked-panel__preview" style="margin:0 auto;">
        <span class="material-symbols-outlined locked-panel__lock-icon">lock</span>
        <div class="locked-panel__icon-blur">
          <span class="material-symbols-outlined" style="font-size:48px; color: var(--si-text-dim); filter: blur(3px);">animation</span>
        </div>
      </div>
    `;
  }

  // Remove any existing customization controls (free icon panel body)
  const existingBody = panel.querySelector('.panel__body');
  if (existingBody) {
    disablePremiumPanelTooltip(existingBody);
    existingBody.style.display = 'none';
  }

  // Hide original placeholder
  const placeholder = panel.querySelector('.panel__placeholder');
  if (placeholder) placeholder.style.display = 'none';

  // Remove any existing customization controls
  const existingControls = panel.querySelector('.panel__controls');
  if (existingControls) existingControls.style.display = 'none';

  // Remove previous locked panel if exists
  const prevLocked = panel.querySelector('.locked-panel');
  if (prevLocked) prevLocked.remove();

  // Inject locked panel content
  const lockedDiv = document.createElement('div');
  lockedDiv.className = 'locked-panel';
  lockedDiv.innerHTML = `
    <h3 class="locked-panel__icon-name">${iconName}</h3>
    <p class="locked-panel__message">
      Unlock this collection to customize and export this icon.
    </p>
    <div class="locked-panel__collection-info">
      <span class="material-symbols-outlined" style="font-size:14px">collections_bookmark</span>
      ${product.name}
    </div>
    <div class="locked-panel__actions">
      <button class="locked-panel__buy-btn" id="lockedPanelBuyBtn">
        Buy $${priceDisplay}
      </button>
      <button class="locked-panel__pro-btn" id="lockedPanelProBtn">
        <span class="material-symbols-outlined" style="font-size:14px">diamond</span>
        Go Pro
      </button>
    </div>
  `;
  panel.appendChild(lockedDiv);

  // Wire buy button
  const buyBtn = lockedDiv.querySelector('#lockedPanelBuyBtn');
  if (buyBtn) {
    buyBtn.addEventListener('click', () => handlePurchase(product));
  }

  // Wire pro button
  const proBtn = lockedDiv.querySelector('#lockedPanelProBtn');
  if (proBtn) {
    proBtn.addEventListener('click', () => handleProSubscribe());
  }
}

// Placeholder icons per collection (fallback when manifest is unavailable)
function getPlaceholderIcons(slug) {
  const map = {
    'status-feedback': ['circle-check', 'circle-x', 'alert-triangle', 'info-circle', 'help-circle', 'ban', 'clock', 'hourglass', 'loader-2', 'refresh', 'progress-check', 'bell', 'eye', 'eye-off', 'thumb-up', 'thumb-down', 'star', 'shield-check', 'trophy', 'sparkles', 'power', 'toggle-right', 'bookmark', 'pinned', 'flag', 'archive', 'trash', 'send', 'cloud-check', 'wifi', 'bolt', 'flame', 'heart', 'link', 'lock', 'lock-open', 'mail-check', 'message-check', 'mood-smile', 'mood-sad', 'arrow-up', 'arrow-down', 'trending-up', 'trending-down', 'list-check', 'clipboard-check', 'filter', 'sort-ascending', 'circle-dot', 'rosette-discount-check'],
    'navigation-menus': ['hamburger-menu', 'close-x', 'arrow-back', 'arrow-forward', 'chevron-down', 'chevron-up', 'tab-switch', 'sidebar-expand', 'sidebar-collapse', 'search-open', 'filter-funnel', 'sort-order', 'grid-view', 'list-view', 'breadcrumb-trail', 'pagination-dots', 'scroll-top', 'expand-full', 'minimize-window', 'drag-handle'],
    'social-communication': ['chat-bubble', 'message-send', 'like-heart', 'share-link', 'comment-reply', 'mention-at', 'follow-plus', 'unfollow-minus', 'group-people', 'video-call', 'voice-message', 'emoji-reaction', 'pin-post', 'retweet-share', 'quote-block', 'thread-connect', 'mute-bell', 'block-user', 'report-flag', 'invite-mail'],
    'data-charts': ['bar-chart', 'line-graph', 'pie-chart', 'area-fill', 'scatter-plot', 'gauge-meter', 'counter-up', 'trend-arrow', 'dashboard-grid', 'table-data', 'filter-range', 'export-csv', 'refresh-data', 'compare-split', 'histogram-bars', 'funnel-chart', 'heatmap-grid', 'timeline-flow', 'kpi-card', 'progress-ring'],
    'ecommerce': ['cart-add', 'cart-remove', 'checkout-bag', 'payment-card', 'wallet-open', 'receipt-print', 'shipping-truck', 'package-box', 'return-arrow', 'coupon-tag', 'wishlist-heart', 'price-tag', 'sale-badge', 'inventory-stack', 'barcode-scan', 'store-front', 'review-stars', 'gift-wrap', 'subscription-renew', 'refund-back'],
    'media-playback': ['play-button', 'pause-button', 'stop-square', 'skip-forward', 'skip-back', 'volume-up', 'volume-mute', 'equalizer-bars', 'playlist-queue', 'shuffle-mix', 'repeat-loop', 'fullscreen-expand', 'picture-in-pip', 'captions-cc', 'speed-rate', 'record-dot', 'live-pulse', 'cast-screen', 'download-media', 'share-clip'],
    'security-auth': ['lock-closed', 'lock-open', 'key-turn', 'shield-check', 'fingerprint-scan', 'face-id', 'two-factor-code', 'password-eye', 'encrypt-scramble', 'firewall-wall', 'vpn-tunnel', 'audit-log', 'permission-grid', 'token-chip', 'certificate-seal', 'backup-cloud', 'restore-clock', 'scan-virus', 'alert-breach', 'compliance-check'],
    'ai-agentic': ['brain-pulse', 'robot-wave', 'code-complete', 'agent-loop', 'neural-network', 'prompt-input', 'response-stream', 'model-cube', 'training-cycle', 'inference-bolt', 'vector-space', 'embedding-dot', 'pipeline-flow', 'tool-use-wrench', 'memory-chip', 'context-window', 'fine-tune-dial', 'evaluation-chart', 'deploy-rocket', 'monitor-dashboard'],
  };
  return map[slug] || Array.from({ length: 20 }, (_, i) => `icon-${i + 1}`);
}

function removePackCatalog(options = {}) {
  const { keepDocs = false } = options;
  const existing = document.getElementById('packCatalog');
  if (existing) existing.remove();
  const existingDash = document.getElementById('dashboardView');
  if (existingDash) existingDash.remove();
  const existingApiKeys = document.getElementById('apiKeysView');
  if (existingApiKeys) existingApiKeys.remove();
  const existingDocs = document.getElementById('docsView');
  if (existingDocs && !keepDocs) {
    cleanupDocsPage();
    existingDocs.remove();
  }
  const existingDetail = document.getElementById('collectionDetail');
  if (existingDetail) existingDetail.remove();
  const existingPricing = document.getElementById('pricingView');
  if (existingPricing) existingPricing.remove();
  const existingPrivacy = document.getElementById('privacyView');
  if (existingPrivacy) existingPrivacy.remove();
  const existingTerms = document.getElementById('termsView');
  if (existingTerms) existingTerms.remove();
  // Tool views must also be mutually exclusive
  const existingML = document.getElementById('motionLabView');
  if (existingML) {
    existingML.remove();
    // Reset wired flag so controls re-bind when Motion Lab is re-opened
    if (typeof motionLab !== 'undefined') motionLab.controlsWired = false;
  }
  const existingConverter = document.getElementById('converterView');
  if (existingConverter) existingConverter.remove();
  const existingConverterLab = document.getElementById('converterLabView');
  if (existingConverterLab) existingConverterLab.remove();

  // Clean up any leaked locked panel from collection-detail view
  const panel = document.getElementById('panel');
  if (panel) {
    const lockedPanel = panel.querySelector('.locked-panel');
    if (lockedPanel) lockedPanel.remove();
    // Restore original panel state
    const placeholder = panel.querySelector('.panel__placeholder');
    if (placeholder) placeholder.style.display = '';
    const controls = panel.querySelector('.panel__controls');
    if (controls) controls.style.display = '';
    const preview = document.getElementById('panelPreview');
    if (preview && preview.querySelector('.locked-panel__preview')) {
      preview.innerHTML = `<span class="material-symbols-outlined panel__preview-icon"
        style="font-size:64px; color: var(--si-text-dim);">widgets</span>`;
    }
  }
}

// ── Downloads View ────────────────────────────────────────────
function renderDownloads() {
  removePackCatalog();

  const gridArea = document.getElementById('gridArea');
  if (!gridArea) return;

  const catalog = document.createElement('div');
  catalog.id = 'packCatalog';
  catalog.className = 'pack-catalog';

  if (userPurchases.length === 0) {
    catalog.innerHTML = `
      <div class="pack-catalog__empty">
        <span class="material-symbols-outlined" style="font-size:48px; color: var(--si-text-dim);">folder_special</span>
        <h3>No collections yet</h3>
        <p>Browse the premium collections to get started.</p>
        <button class="collection-detail__buy-btn" style="margin-top: var(--si-space-3);" id="emptyBrowseBtn">Browse Collections</button>
      </div>`;
    gridArea.appendChild(catalog);
    const browseBtn = catalog.querySelector('#emptyBrowseBtn');
    if (browseBtn) browseBtn.addEventListener('click', () => switchView('packs'));
    return;
  }

  // Show owned collections
  userPurchases.forEach(purchase => {
    if (purchase.si_products) {
      const product = purchase.si_products;
      const badgeMeta = getOwnedBadgeMeta(purchase.source);
      const card = document.createElement('div');
      card.className = 'pack-card pack-card--owned';
      card.innerHTML = `
        <div class="pack-card__header">
          <span class="pack-card__type">Collection</span>
          <span class="pack-card__badge ${badgeMeta.className}">${badgeMeta.text}</span>
        </div>
        <div class="pack-card__icon">
          <span class="material-symbols-outlined" style="font-size:32px; color: var(--si-primary);">diamond</span>
        </div>
        <h3 class="pack-card__name">${getProductName(product)}</h3>
        <p class="pack-card__desc">${product.description || ''}</p>
        <div class="pack-card__footer">
          <button class="pack-card__btn pack-card__btn--open" data-product-id="${product.id}">
            <span class="material-symbols-outlined" style="font-size:14px">open_in_new</span>
            Open Collection
          </button>
        </div>
      `;
      card.querySelector('.pack-card__btn--open')?.addEventListener('click', () => {
        renderCollectionDetail(product);
      });
      catalog.appendChild(card);
    }
  });

  gridArea.appendChild(catalog);
}

// ── Dashboard View ────────────────────────────────────────────
function renderDashboard() {
  removePackCatalog();

  const gridArea = document.getElementById('gridArea');
  if (!gridArea) return;

  const dashboard = document.createElement('div');
  dashboard.id = 'dashboardView';
  dashboard.className = 'dashboard-view';

  dashboard.innerHTML = `
    <div class="dashboard-section">
      <h3 class="dashboard-section__title">Purchase History</h3>
      ${userPurchases.length === 0
        ? '<p class="dashboard-section__empty">No purchases yet.</p>'
        : `<table class="dashboard-table">
            <thead>
              <tr><th>Collection</th><th>Date</th><th>Actions</th></tr>
            </thead>
            <tbody>
              ${userPurchases.map(p => `
                <tr>
                  <td>${p.si_products?.name || 'Unknown'}</td>
                  <td>${new Date(p.purchased_at).toLocaleDateString()}</td>
                  <td><button class="dashboard-table__view" data-product-id="${p.product_id}">View</button></td>
                </tr>
              `).join('')}
            </tbody>
          </table>`
      }
    </div>`;

  gridArea.appendChild(dashboard);

  // Wire view buttons to open collection detail
  dashboard.querySelectorAll('.dashboard-table__view').forEach(btn => {
    btn.addEventListener('click', () => {
      const product = products.find(p => p.id === btn.dataset.productId)
        || userPurchases.find(p => p.product_id === btn.dataset.productId)?.si_products;
      if (product) renderCollectionDetail(product);
    });
  });
}

function renderApiKeysPage() {
  removePackCatalog();

  const gridArea = document.getElementById('gridArea');
  if (!gridArea) return;

  const signedIn = isLoggedIn();
  const canManageKeys = canManageApiKeys();
  const page = document.createElement('div');
  page.id = 'apiKeysView';
  page.className = 'dashboard-view';
  const apiKeysSetupCopy = canManageKeys
    ? `
    <div class="api-keys__setup-copy">
      <p class="dashboard-section__copy">Connect your coding agent (Cursor, Claude Code, Codex, or any MCP-capable agent) to Supericons MCP to access your premium icon collections or Pro workflow tools like Motion Lab and Converter.</p>
      <p class="dashboard-section__copy dashboard-section__copy--muted"><a href="/?view=docs#docs-quickstart">See the setup guide for where to place your key in each client.</a></p>
    </div>`
    : `
    <div class="api-keys__setup-copy">
      <p class="dashboard-section__copy">Free MCP works without a key.</p>
      <p class="dashboard-section__copy dashboard-section__copy--muted">Purchase any premium collection or subscribe to Pro to use API keys for MCP access.</p>
    </div>`;

  page.innerHTML = `
    <div class="dashboard-section">
      ${signedIn ? `
        <p class="dashboard-section__copy dashboard-section__copy--compact" id="apiKeysUsage">Loading...</p>
        <p class="dashboard-section__copy dashboard-section__copy--muted dashboard-section__copy--compact" id="apiKeysLimitNote">Label each key by app or device so you can rotate them independently.</p>
        <div class="api-keys__tabs" id="apiKeysTabs" role="tablist" aria-label="API key states">
          <button class="api-keys__tab is-active" type="button" role="tab" aria-selected="true" data-filter="active">Active <span class="api-keys__tab-count">0</span></button>
          <button class="api-keys__tab" type="button" role="tab" aria-selected="false" data-filter="revoked">Revoked <span class="api-keys__tab-count">0</span></button>
          <button class="api-keys__tab" type="button" role="tab" aria-selected="false" data-filter="all">All <span class="api-keys__tab-count">0</span></button>
        </div>
        <div id="apiKeysContainer">
          <p class="dashboard-section__empty">Loading keys...</p>
        </div>
        <div class="api-keys__generate">
          <input type="text" class="api-keys__label-input" id="apiKeyLabel" placeholder="Key label (e.g. Cursor, Claude)" maxlength="50" ${canManageKeys ? '' : 'disabled'}>
          <button class="api-keys__generate-btn" id="generateApiKeyBtn" ${canManageKeys ? '' : 'disabled'}>
            <span class="material-symbols-outlined" style="font-size:14px">add</span>
            Generate Key
          </button>
        </div>
        ${apiKeysSetupCopy}
        ${canManageKeys ? '' : `
        <div class="api-keys__actions">
          <button class="dashboard-table__view" id="apiKeysBrowsePacksBtn">Browse Collections</button>
          <button class="dashboard-table__view" id="apiKeysPricingBtn">See Pricing</button>
        </div>`}
      ` : `
        <p class="dashboard-section__empty">Sign in to generate API keys and connect your MCP client to your Supericons account.</p>
        <div class="api-keys__actions">
          <button class="dashboard-table__view" id="apiKeysSignInBtn">Sign In</button>
        </div>
        ${apiKeysSetupCopy}
      `}
    </div>`;

  gridArea.appendChild(page);
  wireShellViewLinks(page);

  if (signedIn) {
    apiKeysViewFilter = 'active';
    apiKeysCache = [];
    fetchAndRenderApiKeys();
    const genBtn = document.getElementById('generateApiKeyBtn');
    if (genBtn) {
      genBtn.addEventListener('click', () => generateApiKey());
    }
    page.querySelectorAll('.api-keys__tab').forEach((tab) => {
      tab.addEventListener('click', () => setApiKeysViewFilter(tab.dataset.filter || 'active'));
    });
    if (!canManageKeys) {
      page.querySelector('#apiKeysBrowsePacksBtn')?.addEventListener('click', () => switchView('packs'));
      page.querySelector('#apiKeysPricingBtn')?.addEventListener('click', () => switchView('pricing'));
    }
    return;
  }

  page.querySelector('#apiKeysSignInBtn')?.addEventListener('click', () => {
    openAuthModal({ mode: 'signin', context: 'default' });
  });
}

// ── API Key Management UI ─────────────────────────────────────
// Note: escapeHtml is defined in the Motion Lab section below (line ~2597)

let apiKeysViewFilter = 'active';
let apiKeysCache = [];

function updateApiKeysTabButtons(keys = apiKeysCache) {
  const tabs = document.querySelectorAll('.api-keys__tab');
  if (!tabs.length) return;

  const counts = {
    active: keys.filter((key) => !key.revoked).length,
    revoked: keys.filter((key) => key.revoked).length,
    all: keys.length,
  };

  tabs.forEach((tab) => {
    const filter = tab.dataset.filter || 'active';
    const count = counts[filter] ?? 0;
    tab.classList.toggle('is-active', filter === apiKeysViewFilter);
    tab.setAttribute('aria-selected', filter === apiKeysViewFilter ? 'true' : 'false');
    const countEl = tab.querySelector('.api-keys__tab-count');
    if (countEl) countEl.textContent = String(count);
  });
}

function setApiKeysViewFilter(nextFilter) {
  apiKeysViewFilter = nextFilter;
  updateApiKeysTabButtons();
  renderApiKeysList(apiKeysCache);
}

function renderApiKeysList(keys) {
  const container = document.getElementById('apiKeysContainer');
  if (!container) return;

  const canCreateKeys = canManageApiKeys();
  const activeKeys = keys.filter((key) => !key.revoked);
  const revokedKeys = keys.filter((key) => key.revoked);
  const visibleKeys = apiKeysViewFilter === 'revoked'
    ? revokedKeys
    : apiKeysViewFilter === 'all'
      ? keys
      : activeKeys;

  if (keys.length === 0) {
    container.innerHTML = canCreateKeys
      ? '<p class="dashboard-section__empty">No API keys yet. Generate one to get started.</p>'
      : '<p class="dashboard-section__empty">No API keys on this account yet.</p>';
    return;
  }

  const tabCopy = apiKeysViewFilter === 'revoked'
    ? 'Revoked keys no longer work. Delete a history row if you no longer need the record.'
    : apiKeysViewFilter === 'all'
      ? 'See every key record in one place. Active keys can be revoked; revoked history can be deleted.'
      : 'These keys can still authenticate MCP clients and apps.';

  const emptyCopy = apiKeysViewFilter === 'revoked'
    ? 'No revoked key history yet. Revoked keys will appear here when you rotate them out.'
    : apiKeysViewFilter === 'all'
      ? 'No API keys yet. Generate one to get started.'
      : 'No active keys right now. Generate one to connect a client.';

  const renderKeyRows = (apiKeys) => apiKeys.map((key) => `
    <tr class="${key.revoked ? 'api-key--revoked' : ''}">
      <td class="api-key__prefix"><code>${key.key_prefix}...</code></td>
      <td>${escapeHtml(key.label || 'Default')}</td>
      <td>${new Date(key.created_at).toLocaleDateString()}</td>
      <td>${key.last_used ? new Date(key.last_used).toLocaleDateString() : 'Never'}</td>
      <td><span class="api-key__status ${key.revoked ? 'api-key__status--revoked' : 'api-key__status--active'}">${key.revoked ? 'Revoked' : 'Active'}</span></td>
      <td>
        ${key.revoked
          ? `<button class="api-key__delete-btn" data-key-id="${key.id}" data-key-prefix="${escapeHtml(key.key_prefix || '')}" data-key-label="${escapeHtml(key.label || 'Default')}" aria-label="Delete revoked key ${escapeHtml(key.label || 'Default')}">
              <span class="material-symbols-outlined">delete</span>
            </button>`
          : `<button class="api-key__revoke-btn" data-key-id="${key.id}" data-key-prefix="${escapeHtml(key.key_prefix || '')}" data-key-label="${escapeHtml(key.label || 'Default')}">Revoke</button>`}
      </td>
    </tr>
  `).join('');

  container.innerHTML = `
    <div class="api-keys__panel">
      <div class="api-keys__panel-header">
        <h4 class="api-keys__panel-title">${apiKeysViewFilter === 'revoked' ? 'Revoked History' : apiKeysViewFilter === 'all' ? 'All Keys' : 'Active Keys'}</h4>
        <p class="api-keys__panel-copy">${tabCopy}</p>
      </div>
      ${visibleKeys.length > 0 ? `
        <table class="dashboard-table dashboard-table--keys">
          <thead>
            <tr><th>Key</th><th>Label</th><th>Created</th><th>Last Used</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>${renderKeyRows(visibleKeys)}</tbody>
        </table>
      ` : `
        <p class="dashboard-section__empty">${emptyCopy}</p>
      `}
    </div>`;

  container.querySelectorAll('.api-key__revoke-btn').forEach((btn) => {
    btn.addEventListener('click', () => revokeApiKey(btn.dataset.keyId, {
      button: btn,
      keyPrefix: btn.dataset.keyPrefix || '',
      label: btn.dataset.keyLabel || 'Default',
    }));
  });

  container.querySelectorAll('.api-key__delete-btn').forEach((btn) => {
    btn.addEventListener('click', () => deleteApiKeyHistoryEntry(btn.dataset.keyId, {
      button: btn,
      keyPrefix: btn.dataset.keyPrefix || '',
      label: btn.dataset.keyLabel || 'Default',
    }));
  });
}

async function fetchAndRenderApiKeys() {
  const container = document.getElementById('apiKeysContainer');
  if (!container) return;
  const usageEl = document.getElementById('apiKeysUsage');
  const limitNoteEl = document.getElementById('apiKeysLimitNote');
  const genBtn = document.getElementById('generateApiKeyBtn');
  const labelInput = document.getElementById('apiKeyLabel');

  try {
    const sb = getSupabase();
    const { data: { session } } = await sb.auth.getSession();
    const token = session?.access_token;
    if (!token) {
      container.innerHTML = '<p class="dashboard-section__empty">Sign in again to load API keys.</p>';
      if (usageEl) usageEl.textContent = `Up to ${API_KEY_LIMIT} active keys`;
      if (limitNoteEl) limitNoteEl.textContent = 'Your session expired. Sign in again to manage keys.';
      return;
    }

    const res = await fetch(`${SUPABASE_URL}/functions/v1/api-keys`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': SUPABASE_ANON,
      },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to load keys');
    }
    const payload = await res.json().catch(() => ({}));
    const keys = Array.isArray(payload.keys) ? payload.keys : [];
    apiKeysCache = keys;
    const activeKeys = keys.filter(k => !k.revoked);
    const revokedKeys = keys.filter(k => k.revoked);
    const activeKeyCount = activeKeys.length;
    const limitReached = activeKeyCount >= API_KEY_LIMIT;
    const canCreateKeys = canManageApiKeys();

    if (usageEl) usageEl.textContent = `${activeKeyCount} of ${API_KEY_LIMIT} active keys in use`;
    if (limitNoteEl) {
      if (!canCreateKeys) {
        limitNoteEl.textContent = "You don't currently have access to API keys.";
      } else if (limitReached) {
        limitNoteEl.textContent = `You have reached the ${API_KEY_LIMIT}-key limit. Revoke one before creating another.`;
      } else if (revokedKeys.length > 0) {
        limitNoteEl.textContent = 'Revoked history is available in its own tab and does not count toward your active-key limit.';
      } else {
        limitNoteEl.textContent = 'Label each key by app or device so you can rotate them independently.';
      }
    }
    if (genBtn) genBtn.disabled = !canCreateKeys || limitReached;
    if (labelInput) labelInput.disabled = !canCreateKeys || limitReached;
    updateApiKeysTabButtons(keys);
    renderApiKeysList(keys);
  } catch (err) {
    apiKeysCache = [];
    updateApiKeysTabButtons([]);
    container.innerHTML = '<p class="dashboard-section__empty">Failed to load API keys.</p>';
    if (usageEl) usageEl.textContent = `Up to ${API_KEY_LIMIT} active keys`;
    if (limitNoteEl) limitNoteEl.textContent = 'We could not load your API keys right now.';
    console.error('[Store] API keys fetch error:', err);
  }
}

async function generateApiKey() {
  const labelInput = document.getElementById('apiKeyLabel');
  const genBtn = document.getElementById('generateApiKeyBtn');
  const label = labelInput?.value?.trim() || 'Default';
  const originalBtnMarkup = genBtn?.innerHTML || '';

  try {
    if (genBtn) {
      genBtn.disabled = true;
      genBtn.textContent = 'Generating...';
    }
    const sb = getSupabase();
    const { data: { session } } = await sb.auth.getSession();
    const token = session?.access_token;
    if (!token) {
      throw new Error('Sign in again to generate an API key.');
    }

    const res = await fetch(`${SUPABASE_URL}/functions/v1/api-keys`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'apikey': SUPABASE_ANON,
      },
      body: JSON.stringify({ label }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to generate key');
    }

    const { key, key_prefix } = await res.json();

    // Show the key in a copy-once modal
    showApiKeyModal(key, key_prefix, label);

    // Clear input and refresh list
    if (labelInput) labelInput.value = '';
    await fetchAndRenderApiKeys();
    if (genBtn?.isConnected) {
      genBtn.innerHTML = originalBtnMarkup;
    }
  } catch (err) {
    console.error('[Store] API key generation error:', err);
    showToast(err.message || 'Failed to generate API key');
    if (genBtn) {
      genBtn.disabled = false;
      genBtn.innerHTML = originalBtnMarkup;
    }
  }
}

function showApiKeyModal(fullKey, prefix, label) {
  // Create modal overlay
  const overlay = document.createElement('div');
  overlay.className = 'api-key-modal';
  overlay.innerHTML = `
    <div class="api-key-modal__backdrop"></div>
    <div class="api-key-modal__card">
      <h3 class="api-key-modal__title">
        <span class="material-symbols-outlined" style="font-size:20px; color: var(--si-success);">check_circle</span>
        API Key Generated
      </h3>
      <p class="api-key-modal__warning">
        Copy this key now. It will not be shown again.
      </p>
      <div class="api-key-modal__key-box">
        <code class="api-key-modal__key">${fullKey}</code>
        <button class="api-key-modal__copy" id="apiKeyCopyBtn">
          <span class="material-symbols-outlined" style="font-size:16px">content_copy</span>
          Copy
        </button>
      </div>
      <div class="api-key-modal__meta">
        <span>Label: ${escapeHtml(label)}</span>
        <span>Prefix: ${prefix}</span>
      </div>
      <button class="api-key-modal__close-btn" id="apiKeyModalClose">Done</button>
    </div>`;

  document.body.appendChild(overlay);

  // Wire copy button
  overlay.querySelector('#apiKeyCopyBtn').addEventListener('click', () => {
    navigator.clipboard.writeText(fullKey).then(() => {
      showToast('API key copied to clipboard');
      const copyBtn = overlay.querySelector('#apiKeyCopyBtn');
      copyBtn.innerHTML = '<span class="material-symbols-outlined" style="font-size:16px">check</span> Copied';
    });
  });

  // Wire close
  const closeModal = () => overlay.remove();
  overlay.querySelector('#apiKeyModalClose').addEventListener('click', closeModal);
  overlay.querySelector('.api-key-modal__backdrop').addEventListener('click', closeModal);
}

function showApiKeyLifecycleConfirmModal({
  keyPrefix = '',
  label = 'Default',
  title = 'Confirm action',
  description = '',
  confirmLabel = 'Continue',
} = {}) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'claim-confirm-modal';
    const safePrefix = escapeHtml(keyPrefix || 'Unknown key');
    const safeLabel = escapeHtml(label || 'Default');
    const safeTitle = escapeHtml(title);
    const safeDescription = escapeHtml(description);
    const safeConfirmLabel = escapeHtml(confirmLabel);

    overlay.innerHTML = `
      <div class="claim-confirm-modal__backdrop"></div>
      <div class="claim-confirm-modal__card" role="dialog" aria-modal="true" aria-labelledby="apiKeyLifecycleTitle">
        <button class="claim-confirm-modal__close" type="button" aria-label="Close">
          <span class="material-symbols-outlined">close</span>
        </button>
        <p class="claim-confirm-modal__eyebrow claim-confirm-modal__eyebrow--danger">API Key</p>
        <h3 class="claim-confirm-modal__title" id="apiKeyLifecycleTitle">${safeTitle}</h3>
        <p class="claim-confirm-modal__desc">${safeDescription}</p>
        <p class="claim-confirm-modal__meta claim-confirm-modal__meta--danger">Label: ${safeLabel} &middot; Prefix: ${safePrefix}...</p>
        <div class="claim-confirm-modal__actions">
          <button class="claim-confirm-modal__btn claim-confirm-modal__btn--ghost" type="button" data-action="cancel">Cancel</button>
          <button class="claim-confirm-modal__btn claim-confirm-modal__btn--danger" type="button" data-action="confirm">${safeConfirmLabel}</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const card = overlay.querySelector('.claim-confirm-modal__card');
    const closeBtn = overlay.querySelector('.claim-confirm-modal__close');
    const cancelBtn = overlay.querySelector('[data-action="cancel"]');
    const confirmBtn = overlay.querySelector('[data-action="confirm"]');
    const backdrop = overlay.querySelector('.claim-confirm-modal__backdrop');

    let settled = false;
    const close = (accepted) => {
      if (settled) return;
      settled = true;
      document.removeEventListener('keydown', onKeyDown);
      overlay.remove();
      resolve(accepted);
    };

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close(false);
      }
      if (event.key === 'Enter' && document.activeElement === confirmBtn) {
        event.preventDefault();
        close(true);
      }
    };

    backdrop?.addEventListener('click', () => close(false));
    closeBtn?.addEventListener('click', () => close(false));
    cancelBtn?.addEventListener('click', () => close(false));
    confirmBtn?.addEventListener('click', () => close(true));
    document.addEventListener('keydown', onKeyDown);

    requestAnimationFrame(() => {
      overlay.classList.add('open');
      confirmBtn?.focus();
      card?.scrollIntoView({ block: 'nearest' });
    });
  });
}

function showApiKeyRevokePrompt({ keyPrefix = '', label = 'Default' } = {}) {
  return showApiKeyLifecycleConfirmModal({
    keyPrefix,
    label,
    title: 'Revoke this API key?',
    description: 'This key will stop working for MCP clients and apps immediately. This action cannot be undone.',
    confirmLabel: 'Revoke key',
  });
}

function showApiKeyDeletePrompt({ keyPrefix = '', label = 'Default' } = {}) {
  return showApiKeyLifecycleConfirmModal({
    keyPrefix,
    label,
    title: 'Delete this revoked key record?',
    description: 'This only removes the history entry from your account. The key is already revoked and cannot be used again.',
    confirmLabel: 'Delete record',
  });
}

function showApiKeyRevokeConfirmModal({ keyPrefix = '', label = 'Default' } = {}) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'claim-confirm-modal';
    const safePrefix = escapeHtml(keyPrefix || 'Unknown key');
    const safeLabel = escapeHtml(label || 'Default');

    overlay.innerHTML = `
      <div class="claim-confirm-modal__backdrop"></div>
      <div class="claim-confirm-modal__card" role="dialog" aria-modal="true" aria-labelledby="apiKeyRevokeTitle">
        <button class="claim-confirm-modal__close" type="button" aria-label="Close">
          <span class="material-symbols-outlined">close</span>
        </button>
        <p class="claim-confirm-modal__eyebrow claim-confirm-modal__eyebrow--danger">API Key</p>
        <h3 class="claim-confirm-modal__title" id="apiKeyRevokeTitle">Revoke this API key?</h3>
        <p class="claim-confirm-modal__desc">This key will stop working for MCP clients and apps immediately. This action cannot be undone.</p>
        <p class="claim-confirm-modal__meta claim-confirm-modal__meta--danger">Label: ${safeLabel} · Prefix: ${safePrefix}...</p>
        <div class="claim-confirm-modal__actions">
          <button class="claim-confirm-modal__btn claim-confirm-modal__btn--ghost" type="button" data-action="cancel">Cancel</button>
          <button class="claim-confirm-modal__btn claim-confirm-modal__btn--danger" type="button" data-action="confirm">Revoke key</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const card = overlay.querySelector('.claim-confirm-modal__card');
    const closeBtn = overlay.querySelector('.claim-confirm-modal__close');
    const cancelBtn = overlay.querySelector('[data-action="cancel"]');
    const confirmBtn = overlay.querySelector('[data-action="confirm"]');
    const backdrop = overlay.querySelector('.claim-confirm-modal__backdrop');

    let settled = false;
    const close = (accepted) => {
      if (settled) return;
      settled = true;
      document.removeEventListener('keydown', onKeyDown);
      overlay.remove();
      resolve(accepted);
    };

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close(false);
      }
      if (event.key === 'Enter' && document.activeElement === confirmBtn) {
        event.preventDefault();
        close(true);
      }
    };

    backdrop?.addEventListener('click', () => close(false));
    closeBtn?.addEventListener('click', () => close(false));
    cancelBtn?.addEventListener('click', () => close(false));
    confirmBtn?.addEventListener('click', () => close(true));
    document.addEventListener('keydown', onKeyDown);

    requestAnimationFrame(() => {
      overlay.classList.add('open');
      confirmBtn?.focus();
      card?.scrollIntoView({ block: 'nearest' });
    });
  });
}

async function revokeApiKey(keyId, options = {}) {
  const { button = null, keyPrefix = '', label = 'Default' } = options;
  const confirmed = await showApiKeyRevokePrompt({ keyPrefix, label });
  if (!confirmed) return;

  const triggerBtn = button instanceof HTMLElement ? button : null;
  const originalBtnText = triggerBtn?.textContent || 'Revoke';

  try {
    if (triggerBtn) {
      triggerBtn.disabled = true;
      triggerBtn.textContent = 'Revoking...';
    }
    const sb = getSupabase();
    const { data: { session } } = await sb.auth.getSession();
    const token = session?.access_token;
    if (!token) {
      throw new Error('Sign in again to revoke API keys.');
    }

    const res = await fetch(`${SUPABASE_URL}/functions/v1/api-keys`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'apikey': SUPABASE_ANON,
      },
      body: JSON.stringify({ action: 'revoke', key_id: keyId }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to revoke key');
    }

    showToast('API key revoked');
    await fetchAndRenderApiKeys();
  } catch (err) {
    showToast(err.message || 'Failed to revoke key. Please try again.');
    console.error('[Store] API key revoke error:', err);
    if (triggerBtn) {
      triggerBtn.disabled = false;
      triggerBtn.textContent = originalBtnText;
    }
  }
}

// ── Pricing Page ──────────────────────────────────────────────
async function deleteApiKeyHistoryEntry(keyId, options = {}) {
  const { button = null, keyPrefix = '', label = 'Default' } = options;
  const confirmed = await showApiKeyDeletePrompt({ keyPrefix, label });
  if (!confirmed) return;

  const triggerBtn = button instanceof HTMLElement ? button : null;
  const originalBtnMarkup = triggerBtn?.innerHTML || '';

  try {
    if (triggerBtn) {
      triggerBtn.disabled = true;
      triggerBtn.textContent = 'Deleting...';
    }
    const sb = getSupabase();
    const { data: { session } } = await sb.auth.getSession();
    const token = session?.access_token;
    if (!token) {
      throw new Error('Sign in again to manage API key history.');
    }

    const res = await fetch(`${SUPABASE_URL}/functions/v1/api-keys`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'apikey': SUPABASE_ANON,
      },
      body: JSON.stringify({ action: 'delete', key_id: keyId }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to delete revoked key record');
    }

    showToast('Revoked key history deleted');
    await fetchAndRenderApiKeys();
  } catch (err) {
    const message = err?.message === 'Unsupported action'
      ? 'Delete support is not live yet. Redeploy the api-keys Edge Function and try again.'
      : (err.message || 'Failed to delete revoked key record. Please try again.');
    showToast(message);
    console.error('[Store] API key delete error:', err);
    if (triggerBtn) {
      triggerBtn.disabled = false;
      triggerBtn.innerHTML = originalBtnMarkup;
    }
  }
}

function renderPricingPage() {
  removePackCatalog();
  const monthlyPlan = getProPlan('monthly');
  const annualPlan = getProPlan('annual');
  const monthlyPricing = PRO_PRICING_COPY.monthly;
  const annualPricing = PRO_PRICING_COPY.annual;

  const gridArea = document.getElementById('gridArea');
  if (!gridArea) return;
  const page = document.createElement('div');
  page.id = 'pricingView';
  page.className = 'pricing-view';

  page.innerHTML = `
    <div class="pricing-header">
      <h2 class="pricing-header__title">Simple, transparent pricing</h2>
      <p class="pricing-header__subtitle">Free icons for everyone. Premium animated packs to polish your UI.</p>
      <div class="pricing-toggle" id="pricingToggle">
        <button class="pricing-toggle__seg pricing-toggle__seg--active" id="pricingMonthlyBtn" data-period="monthly">Monthly</button>
        <button class="pricing-toggle__seg" id="pricingAnnualBtn" data-period="annual">Annual</button>
        <span class="pricing-toggle__badge" id="pricingAnnualBadge" hidden>Save 45%</span>
      </div>
    </div>

    <div class="pricing-grid">
      <!-- Free -->
      <div class="pricing-card">
        <div class="pricing-card__header">
          <div class="pricing-card__icon-wrap pricing-card__icon-wrap--free">
            <span class="material-symbols-outlined" style="font-variation-settings:'FILL' 1">redeem</span>
          </div>
          <h3 class="pricing-card__name">Free</h3>
          <p class="pricing-card__desc">${freeIconsAcrossLibrariesLabel}, AI search, SVG export. No account needed.</p>
        </div>
        <div class="pricing-card__price">
          <span class="pricing-card__amount">$0</span>
        </div>
        <ul class="pricing-card__features">
          <li><span class="material-symbols-outlined">check</span> ${freeIconsAcrossLibrariesLabel}</li>
          <li><span class="material-symbols-outlined">check</span> Material, Lucide, Tabler, Phosphor + more</li>
          <li><span class="material-symbols-outlined">check</span> AI semantic search</li>
          <li><span class="material-symbols-outlined">check</span> SVG, PNG, CSS export</li>
          <li><span class="material-symbols-outlined">check</span> ${mcpServerFreeIconsLabel}</li>
          <li class="pricing-card__feature--dim"><span class="material-symbols-outlined">close</span> Animated premium packs</li>
          <li class="pricing-card__feature--dim"><span class="material-symbols-outlined">close</span> Premium icons via MCP</li>
        </ul>
        <button class="pricing-card__cta pricing-card__cta--secondary" id="pricingStartFreeBtn">Start for Free</button>
      </div>

      <!-- Pro -->
      <div class="pricing-card pricing-card--popular">
        <div class="pricing-card__ribbon">Most Popular</div>
        <div class="pricing-card__header">
          <div class="pricing-card__icon-wrap pricing-card__icon-wrap--pro">
            <span class="material-symbols-outlined" style="font-variation-settings:'FILL' 1">diamond</span>
          </div>
          <h3 class="pricing-card__name">Pro</h3>
          <p class="pricing-card__desc" id="pricingProDesc">${monthlyPricing.description}</p>
        </div>
        <div class="pricing-card__price">
          <span class="pricing-card__amount" id="pricingProAmount">${monthlyPlan.amount}</span>
          <span class="pricing-card__period" id="pricingProPeriod">${monthlyPlan.period}</span>
          <span class="pricing-card__original" id="pricingProOriginal" style="display:none"></span>
        </div>
        <ul class="pricing-card__features" id="pricingProFeatures">
          ${renderPricingFeatureList(monthlyPricing.features)}
        </ul>
        <button class="pricing-card__cta pricing-card__cta--primary" id="pricingProBtn">Go Pro</button>
      </div>

      <!-- Single Pack -->
      <div class="pricing-card">
        <div class="pricing-card__header">
          <div class="pricing-card__icon-wrap pricing-card__icon-wrap--pack">
            <span class="material-symbols-outlined" style="font-variation-settings:'FILL' 1">package_2</span>
          </div>
          <h3 class="pricing-card__name">Single Pack</h3>
          <p class="pricing-card__desc">Pick any one collection. 50 animated icons, yours permanently.</p>
        </div>
        <div class="pricing-card__price">
          <span class="pricing-card__amount">$5</span>
          <span class="pricing-card__period">per pack</span>
        </div>
        <ul class="pricing-card__features">
          <li><span class="material-symbols-outlined">check</span> Everything in Free</li>
          <li><span class="material-symbols-outlined">check</span> 50 animated SVG icons per pack</li>
          <li><span class="material-symbols-outlined">check</span> Unique hover animation per icon</li>
          <li><span class="material-symbols-outlined">check</span> Lifetime ownership</li>
          <li><span class="material-symbols-outlined">check</span> Single project license</li>
          <li><span class="material-symbols-outlined">check</span> MCP access for purchased pack</li>
          <li class="pricing-card__feature--dim"><span class="material-symbols-outlined">close</span> No Pro tools (Motion Lab, Converter)</li>
        </ul>
        <button class="pricing-card__cta pricing-card__cta--secondary" id="pricingBrowseBtn">Browse Packs</button>
      </div>

      <!-- Launch Bundle -->
      <div class="pricing-card pricing-card--launch">
        <div class="pricing-card__ribbon pricing-card__ribbon--launch">Save 28%</div>
        <div class="pricing-card__header">
          <div class="pricing-card__icon-wrap pricing-card__icon-wrap--launch">
            <span class="material-symbols-outlined" style="font-variation-settings:'FILL' 1">rocket_launch</span>
          </div>
          <h3 class="pricing-card__name">Launch Bundle</h3>
          <p class="pricing-card__desc">All 8 packs. 400 animated icons. One payment, no subscription.</p>
        </div>
        <div class="pricing-card__price">
          <span class="pricing-card__amount">$29</span>
          <span class="pricing-card__period">one-time</span>
          <span class="pricing-card__original">$40</span>
        </div>
        <ul class="pricing-card__features">
          <li><span class="material-symbols-outlined">check</span> All 8 premium packs</li>
          <li><span class="material-symbols-outlined">check</span> 400 animated SVG icons</li>
          <li><span class="material-symbols-outlined">check</span> AI, E-com, Media, Nav, Security + more</li>
          <li><span class="material-symbols-outlined">check</span> Lifetime ownership + future updates</li>
          <li><span class="material-symbols-outlined">check</span> Commercial use, unlimited projects</li>
          <li><span class="material-symbols-outlined">check</span> MCP access for all 8 packs</li>
          <li class="pricing-card__feature--dim"><span class="material-symbols-outlined">close</span> No Pro tools (Motion Lab, Converter)</li>
        </ul>
        <button class="pricing-card__cta pricing-card__cta--launch" id="pricingLaunchBtn">Get Launch Bundle</button>
      </div>
    </div>

    <div class="pricing-faq">
      <h3 class="pricing-faq__title">Frequently Asked Questions</h3>
      <div class="pricing-faq__list">
        <div class="pricing-faq__item">
          <button class="pricing-faq__question" aria-expanded="false">
            What are the 8 premium animated packs?
            <span class="material-symbols-outlined pricing-faq__chevron">expand_more</span>
          </button>
          <div class="pricing-faq__answer">
            Each pack contains 50 animated SVG icons with unique hover animations. The 8 packs cover: Agentic AI, Status &amp; Feedback, E-commerce, Navigation &amp; Menus, Media &amp; Playback, Security &amp; Auth, Social &amp; Communications, and Data &amp; Charts.
          </div>
        </div>
        <div class="pricing-faq__item">
          <button class="pricing-faq__question" aria-expanded="false">
            How do Pro Monthly and Pro Annual collection access work?
            <span class="material-symbols-outlined pricing-faq__chevron">expand_more</span>
          </button>
          <div class="pricing-faq__answer">
            Pro Monthly lets you add 1 premium collection to your permanent library each month. Pro Annual unlocks all 8 current premium collections immediately, keeps those 8 in your library permanently, and includes future premium drops while your annual subscription is active.
          </div>
        </div>
        <div class="pricing-faq__item">
          <button class="pricing-faq__question" aria-expanded="false">
            What is the MCP server?
            <span class="material-symbols-outlined pricing-faq__chevron">expand_more</span>
          </button>
          <div class="pricing-faq__answer">
            The MCP (Model Context Protocol) server lets AI coding agents search and retrieve icons programmatically. Free users can access ${freeIconsRounded} icons. Pro subscribers and pack owners can connect a Supericons API key to access the premium collections tied to their account.
          </div>
        </div>
        <div class="pricing-faq__item">
          <button class="pricing-faq__question" aria-expanded="false">
            Can I cancel my Pro subscription anytime?
            <span class="material-symbols-outlined pricing-faq__chevron">expand_more</span>
          </button>
          <div class="pricing-faq__answer">
            Yes. Cancel anytime from your dashboard and your Pro benefits stay active until the end of the paid billing period. Monthly subscribers keep any collections they already claimed. Annual subscribers keep the 8 included premium collections they already own.
          </div>
        </div>
        <div class="pricing-faq__item">
          <button class="pricing-faq__question" aria-expanded="false">
            What happens to my access if I cancel Pro?
            <span class="material-symbols-outlined pricing-faq__chevron">expand_more</span>
          </button>
          <div class="pricing-faq__answer">
            Monthly subscribers lose access to unclaimed collections and Pro tools when their term ends, but claimed collections stay in their library. Annual subscribers keep the 8 included premium collections they already own, but future premium drops, full-library live access, MCP access to unowned drops, and Pro tools end when the annual term ends unless they renew.
          </div>
        </div>
        <div class="pricing-faq__item">
          <button class="pricing-faq__question" aria-expanded="false">
            Can I use premium icons in commercial projects?
            <span class="material-symbols-outlined pricing-faq__chevron">expand_more</span>
          </button>
          <div class="pricing-faq__answer">
            Yes. All premium icons include a commercial license. Single Pack purchases and Pro Monthly claimed collections include a single-project license. Active Pro, Pro Annual included collections, and Launch Bundle include unlimited-project commercial use.
          </div>
        </div>
        <div class="pricing-faq__item">
          <button class="pricing-faq__question" aria-expanded="false">
            Is the Launch Bundle a limited offer?
            <span class="material-symbols-outlined pricing-faq__chevron">expand_more</span>
          </button>
          <div class="pricing-faq__answer">
            The Launch Bundle is available at launch pricing ($29 vs $40 individually). This is a one-time purchase with no subscription, and includes all 8 current packs plus any future updates to those packs.
          </div>
        </div>
      </div>
    </div>`;

  gridArea.appendChild(page);

  // Wire toggle
  const monthlyBtn = document.getElementById('pricingMonthlyBtn');
  const annualBtn = document.getElementById('pricingAnnualBtn');
  const proAmount = document.getElementById('pricingProAmount');
  const proPeriod = document.getElementById('pricingProPeriod');
  const proOriginal = document.getElementById('pricingProOriginal');
  const proDesc = document.getElementById('pricingProDesc');
  const proFeatures = document.getElementById('pricingProFeatures');
  const annualBadge = document.getElementById('pricingAnnualBadge');

  let isAnnualState = false;

  function setPeriod(annual) {
    const plan = annual ? getProPlan('annual') : getProPlan('monthly');
    const pricingCopy = annual ? annualPricing : monthlyPricing;
    isAnnualState = annual;
    monthlyBtn.classList.toggle('pricing-toggle__seg--active', !annual);
    annualBtn.classList.toggle('pricing-toggle__seg--active', annual);
    if (annualBadge) annualBadge.hidden = !annual;

    proAmount.textContent = plan.amount;
    proPeriod.textContent = plan.period;
    if (proDesc) proDesc.textContent = pricingCopy.description;
    if (proFeatures) proFeatures.innerHTML = renderPricingFeatureList(pricingCopy.features);
    if (plan.originalAmount) {
      proOriginal.style.display = 'inline';
      proOriginal.textContent = plan.originalAmount;
    } else {
      proOriginal.style.display = 'none';
      proOriginal.textContent = '';
    }
  }

  monthlyBtn?.addEventListener('click', () => setPeriod(false));
  annualBtn?.addEventListener('click', () => setPeriod(true));
  setPeriod(false);

  // Wire CTA buttons
  document.getElementById('pricingStartFreeBtn')?.addEventListener('click', () => switchView('icons'));
  document.getElementById('pricingBrowseBtn')?.addEventListener('click', () => switchView('packs'));

  document.getElementById('pricingProBtn')?.addEventListener('click', () => {
    const plan = isAnnualState ? 'annual' : 'monthly';
    handleProSubscribe(plan);
  });

  document.getElementById('pricingLaunchBtn')?.addEventListener('click', () => {
    handleLaunchEditionPurchase();
  });

  // Wire FAQ accordion
  page.querySelectorAll('.pricing-faq__question').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.pricing-faq__item');
      const isOpen = item.classList.contains('pricing-faq__item--open');
      // Close all
      page.querySelectorAll('.pricing-faq__item').forEach(i => i.classList.remove('pricing-faq__item--open'));
      // Toggle clicked
      if (!isOpen) item.classList.add('pricing-faq__item--open');
    });
  });
}

// ── Terms of Service Page ─────────────────────────────────────
let docsPageCleanup = null;
let shellViewLinkDelegationBound = false;
let docsSidebarToggleDelegationBound = false;
let docsSearchQuery = '';
let docsSearchResults = [];
let docsSearchOpen = false;
let docsSearchActiveIndex = -1;
let docsSearchBlurTimeout = null;
let pendingDocsSearchNavigation = null;
const DOCS_SIDEBAR_STORAGE_KEY = 'supericons-docs-sidebar-open-groups';
const DEFAULT_OPEN_DOCS_GROUP_KEYS = new Set();
let docsSidebarDrawerOpen = false;

function getDocsSidebarDrawerElements() {
  const page = document.getElementById('docsView');
  return {
    page,
    backdrop: page?.querySelector('.docs-shell__backdrop') || null,
    sidebar: page?.querySelector('#docsSidebarNav') || null,
    homeLink: page?.querySelector('.docs-shell__sidebar-home') || null,
    activeLink: page?.querySelector('.docs-shell__nav-link[aria-current="page"]') || null,
  };
}

export function isDocsSidebarDrawerMode() {
  return DOCS_PAGE_VIEWS.has(currentView) && Boolean(DOCS_SIDEBAR_DRAWER_MEDIA?.matches);
}

export function isDocsSidebarDrawerOpen() {
  return isDocsSidebarDrawerMode() && docsSidebarDrawerOpen;
}

function syncDocsSidebarDrawerUi({ restoreFocus = false, focusSidebar = false } = {}) {
  const { page, backdrop, sidebar, homeLink, activeLink } = getDocsSidebarDrawerElements();
  const isDrawerMode = isDocsSidebarDrawerMode();
  if (!isDrawerMode) {
    docsSidebarDrawerOpen = false;
  }
  const isOpen = isDrawerMode && docsSidebarDrawerOpen;

  page?.classList.toggle('docs-view--drawer-mode', isDrawerMode);
  page?.classList.toggle('docs-view--drawer-open', isOpen);

  if (backdrop) {
    backdrop.hidden = !isOpen;
    backdrop.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
  }

  if (sidebar) {
    sidebar.classList.toggle('is-open', isOpen);
    sidebar.setAttribute('aria-hidden', isDrawerMode && !isOpen ? 'true' : 'false');
  }

  document.body.classList.toggle('docs-sidebar-open', isOpen);
  window.__supericons?.syncSidebarToggleButton?.();

  if (restoreFocus && !isOpen) {
    document.getElementById('sidebarToggle')?.focus();
  }

  if (focusSidebar && isOpen) {
    const focusTarget = activeLink || homeLink || sidebar;
    window.requestAnimationFrame(() => {
      focusTarget?.focus?.();
    });
  }
}

export function closeDocsSidebarDrawer({ restoreFocus = false } = {}) {
  const wasOpen = docsSidebarDrawerOpen;
  docsSidebarDrawerOpen = false;
  syncDocsSidebarDrawerUi({ restoreFocus });
  return wasOpen;
}

export function openDocsSidebarDrawer() {
  if (!isDocsSidebarDrawerMode()) return false;
  docsSidebarDrawerOpen = true;
  syncDocsSidebarDrawerUi({ focusSidebar: true });
  return true;
}

export function toggleDocsSidebarDrawer() {
  if (!isDocsSidebarDrawerMode()) return false;
  if (docsSidebarDrawerOpen) {
    closeDocsSidebarDrawer({ restoreFocus: true });
    return false;
  }
  return openDocsSidebarDrawer();
}

function handleDocsSidebarDrawerMediaChange() {
  if (!DOCS_PAGE_VIEWS.has(currentView)) {
    docsSidebarDrawerOpen = false;
    document.body.classList.remove('docs-sidebar-open');
    window.__supericons?.syncSidebarToggleButton?.();
    return;
  }
  if (!DOCS_SIDEBAR_DRAWER_MEDIA?.matches) {
    closeDocsSidebarDrawer();
    return;
  }
  syncDocsSidebarDrawerUi();
}

if (DOCS_SIDEBAR_DRAWER_MEDIA) {
  if (typeof DOCS_SIDEBAR_DRAWER_MEDIA.addEventListener === 'function') {
    DOCS_SIDEBAR_DRAWER_MEDIA.addEventListener('change', handleDocsSidebarDrawerMediaChange);
  } else if (typeof DOCS_SIDEBAR_DRAWER_MEDIA.addListener === 'function') {
    DOCS_SIDEBAR_DRAWER_MEDIA.addListener(handleDocsSidebarDrawerMediaChange);
  }
}

function getDocsSearchElements({ createResults = false } = {}) {
  const input = document.getElementById('searchInput');
  const clearButton = document.getElementById('searchClear');
  const shortcut = document.getElementById('searchShortcut');
  const root = input?.closest('.header__search') || null;
  if (!root || !input) {
    return {
      root: null,
      input: null,
      clearButton: null,
      shortcut: null,
      results: null,
    };
  }

  let results = root.querySelector('#docsSearchResults');
  if (!results && createResults) {
    results = document.createElement('div');
    results.id = 'docsSearchResults';
    results.className = 'docs-search__results docs-search__results--header';
    results.hidden = true;
    root.appendChild(results);
  }

  return {
    root,
    input,
    clearButton,
    shortcut,
    results,
  };
}

function getDocsGroupKey(group) {
  const label = typeof group === 'string' ? group : group?.label || '';
  return label
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function loadDocsSidebarOpenGroups() {
  try {
    const raw = window.localStorage.getItem(DOCS_SIDEBAR_STORAGE_KEY);
    if (!raw) return new Set(DEFAULT_OPEN_DOCS_GROUP_KEYS);
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set(DEFAULT_OPEN_DOCS_GROUP_KEYS);
    return new Set(parsed.slice(0, 1).map((value) => String(value)));
  } catch {
    return new Set(DEFAULT_OPEN_DOCS_GROUP_KEYS);
  }
}

let docsSidebarOpenGroups = loadDocsSidebarOpenGroups();

function clearDocsSearchBlurTimeout() {
  if (docsSearchBlurTimeout) {
    window.clearTimeout(docsSearchBlurTimeout);
    docsSearchBlurTimeout = null;
  }
}

function closeDocsSearch({ clearQuery = false } = {}) {
  clearDocsSearchBlurTimeout();
  docsSearchOpen = false;
  docsSearchActiveIndex = -1;
  if (clearQuery) {
    docsSearchQuery = '';
    docsSearchResults = [];
  }
}

function updateDocsSearchState(query) {
  docsSearchQuery = query;
  docsSearchResults = query ? searchDocs(query, { limit: 8 }) : [];
  docsSearchActiveIndex = docsSearchResults.length ? 0 : -1;
  docsSearchOpen = Boolean(query);
}

function renderDocsSearch() {
  const { root, input, clearButton, shortcut, results } = getDocsSearchElements({ createResults: true });
  if (!root || !input || !results) return;

  root.classList.add('header__search--docs-mode');
  window.__supericons?.setHeaderSearchMode?.('docs', { value: docsSearchQuery });
  const isVisible = docsSearchOpen && Boolean(docsSearchQuery.trim());
  root.classList.toggle('header__search--docs-open', isVisible);
  input.setAttribute('aria-expanded', isVisible ? 'true' : 'false');
  if (shortcut) shortcut.style.display = docsSearchQuery ? 'none' : '';
  if (clearButton) clearButton.style.display = docsSearchQuery ? 'flex' : 'none';
  results.hidden = !isVisible;

  if (!isVisible) {
    results.innerHTML = '';
    return;
  }

  if (!docsSearchResults.length) {
    results.innerHTML = `
      <div class="docs-search__empty">
        <strong>No docs matches yet</strong>
        <p>Try <code>api key</code>, <code>motion lab</code>, <code>converter</code>, or <code>pricing</code>.</p>
      </div>`;
    return;
  }

  results.innerHTML = docsSearchResults.map((result, index) => {
    const isActive = index === docsSearchActiveIndex;
    const meta = result.sectionTitle
      ? `${result.pageTitle} · ${result.sectionTitle}`
      : result.pageTitle;
    const preview = result.preview || result.summary || '';
    return `
      <button
        class="docs-search__result${isActive ? ' is-active' : ''}"
        type="button"
        data-docs-search-view="${result.view}"
        data-docs-search-section="${result.sectionId || ''}"
        aria-selected="${isActive ? 'true' : 'false'}">
        <span class="docs-search__result-group">${escapeHtml(result.groupLabel)}</span>
        <strong class="docs-search__result-title">${escapeHtml(meta)}</strong>
        ${preview ? `<span class="docs-search__result-preview">${escapeHtml(preview)}</span>` : ''}
      </button>`;
  }).join('');
}

function openDocsSearchResult(result, { historyMode = 'push' } = {}) {
  if (!result?.view) return;
  const query = docsSearchQuery.trim();
  const hash = result.sectionId ? `#${result.sectionId}` : '';
  const nextUrl = `/?view=${result.view}${hash}`;
  const historyMethod = historyMode === 'replace' ? 'replaceState' : 'pushState';
  pendingDocsSearchNavigation = query
    ? {
      query,
      sectionId: result.sectionId || '',
    }
    : null;
  closeDocsSidebarDrawer();
  window.history[historyMethod]({}, '', nextUrl);
  closeDocsSearch({ clearQuery: true });
  switchView(result.view, { historyMode: 'silent' });
  if (!pendingDocsSearchNavigation && result.sectionId) {
    window.requestAnimationFrame(scrollDocsHashIntoView);
  }
}

function resetDocsSearchHeaderUi() {
  const { root, results } = getDocsSearchElements();
  root?.classList.remove('header__search--docs-mode', 'header__search--docs-open');
  if (results) {
    results.hidden = true;
    results.innerHTML = '';
  }
}

function buildDocsSearchHighlightCandidates(query) {
  const raw = String(query || '').trim();
  if (!raw) return [];

  const clean = raw.replace(/`/g, '').trim();
  const normalizedTokens = clean
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_./:-]+/g, ' ')
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);

  const candidates = new Set();
  if (clean) candidates.add(clean);

  if (normalizedTokens.length > 1) {
    const camel = `${normalizedTokens[0]}${normalizedTokens.slice(1).map((token) => token.charAt(0).toUpperCase() + token.slice(1)).join('')}`;
    candidates.add(normalizedTokens.join(' '));
    candidates.add(normalizedTokens.join('_'));
    candidates.add(normalizedTokens.join('-'));
    candidates.add(normalizedTokens.join('.'));
    candidates.add(camel);
    candidates.add(normalizedTokens.join('_').toUpperCase());
  }

  return [...candidates]
    .map((value) => value.trim())
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);
}

function clearDocsSearchHighlights(scope) {
  scope.querySelectorAll('mark.docs-search-highlight').forEach((mark) => {
    const parent = mark.parentNode;
    if (!parent) return;
    parent.replaceChild(document.createTextNode(mark.textContent || ''), mark);
    parent.normalize();
  });
}

function highlightDocsSearchMatches(scope, query) {
  if (!scope || !query) return null;
  clearDocsSearchHighlights(scope);

  const candidates = buildDocsSearchHighlightCandidates(query);
  if (!candidates.length) return null;

  const textNodes = [];
  const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.textContent?.trim()) return NodeFilter.FILTER_REJECT;
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      if (parent.closest('mark.docs-search-highlight')) return NodeFilter.FILTER_REJECT;
      if (['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(parent.tagName)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  while (walker.nextNode()) {
    textNodes.push(walker.currentNode);
  }

  let firstMatch = null;

  textNodes.forEach((node) => {
    const text = node.textContent || '';
    let matchedCandidate = '';
    let matchIndex = -1;

    for (const candidate of candidates) {
      const index = text.toLowerCase().indexOf(candidate.toLowerCase());
      if (index >= 0) {
        matchedCandidate = candidate;
        matchIndex = index;
        break;
      }
    }

    if (matchIndex < 0 || !matchedCandidate) return;

    const regex = new RegExp(escapeRegExp(matchedCandidate), 'gi');
    const fragment = document.createDocumentFragment();
    let lastIndex = 0;
    let didReplace = false;

    text.replace(regex, (match, offset) => {
      if (offset > lastIndex) {
        fragment.appendChild(document.createTextNode(text.slice(lastIndex, offset)));
      }
      const mark = document.createElement('mark');
      mark.className = 'docs-search-highlight';
      mark.textContent = match;
      fragment.appendChild(mark);
      if (!firstMatch) firstMatch = mark;
      lastIndex = offset + match.length;
      didReplace = true;
      return match;
    });

    if (!didReplace) return;

    if (lastIndex < text.length) {
      fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
    }

    node.parentNode?.replaceChild(fragment, node);
  });

  return firstMatch;
}

function applyPendingDocsSearchNavigation(page) {
  if (!pendingDocsSearchNavigation || !page) return;

  const { query, sectionId } = pendingDocsSearchNavigation;
  pendingDocsSearchNavigation = null;

  const article = page.querySelector('.docs-shell__page');
  if (!article) {
    if (sectionId) scrollDocsHashIntoView();
    return;
  }

  const firstMatch = highlightDocsSearchMatches(article, query);
  const target = firstMatch || (sectionId ? document.getElementById(sectionId) : null);

  if (target) {
    window.requestAnimationFrame(() => {
      target.scrollIntoView({ block: 'center', behavior: 'smooth' });
    });
    return;
  }

  if (sectionId) {
    window.requestAnimationFrame(scrollDocsHashIntoView);
  }
}

function persistDocsSidebarOpenGroups() {
  try {
    window.localStorage.setItem(
      DOCS_SIDEBAR_STORAGE_KEY,
      JSON.stringify([...docsSidebarOpenGroups]),
    );
  } catch {
    // Ignore storage failures and keep the sidebar usable.
  }
}

function getDocsGroupKeyForView(view) {
  const group = DOCS_PAGE_GROUPS.find((entry) => entry.pages.includes(view));
  return group ? getDocsGroupKey(group) : null;
}

function ensureDocsGroupOpenForView(view) {
  const activeGroupKey = getDocsGroupKeyForView(view);
  if (!activeGroupKey) return;
  if (docsSidebarOpenGroups.has(activeGroupKey)) return;
  docsSidebarOpenGroups = new Set([activeGroupKey]);
  persistDocsSidebarOpenGroups();
}

function cleanupDocsPage() {
  if (typeof docsPageCleanup === 'function') {
    docsPageCleanup();
  }
  docsPageCleanup = null;
  clearDocsSearchBlurTimeout();
}

function ensureShellViewLinkDelegation() {
  if (shellViewLinkDelegationBound) return;
  document.addEventListener('click', (event) => {
    if (event.defaultPrevented) return;
    if (event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    const link = event.target instanceof Element
      ? event.target.closest('[data-docs-view]')
      : null;
    if (!link) return;

    const targetView = link.getAttribute('data-docs-view');
    if (!targetView) return;

    event.preventDefault();
    closeDocsSidebarDrawer();
    switchView(targetView, { historyMode: 'push' });
  }, true);
  shellViewLinkDelegationBound = true;
}

function wireShellViewLinks() {
  ensureShellViewLinkDelegation();
}

function applyDocsSidebarGroupState(scope = document) {
  scope.querySelectorAll('.docs-shell__nav-group[data-docs-group]').forEach((group) => {
    const groupKey = group.getAttribute('data-docs-group');
    if (!groupKey) return;
    const isOpen = docsSidebarOpenGroups.has(groupKey);
    group.classList.toggle('is-collapsed', !isOpen);
    const trigger = group.querySelector('.docs-shell__nav-trigger');
    if (trigger) {
      trigger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    }
  });
}

function ensureDocsSidebarToggleDelegation() {
  if (docsSidebarToggleDelegationBound) return;
  document.addEventListener('click', (event) => {
    const trigger = event.target instanceof Element
      ? event.target.closest('[data-docs-group-toggle]')
      : null;
    if (!trigger) return;
    const groupKey = trigger.getAttribute('data-docs-group-toggle');
    if (!groupKey) return;
    event.preventDefault();
    if (docsSidebarOpenGroups.has(groupKey)) {
      docsSidebarOpenGroups = new Set();
    } else {
      docsSidebarOpenGroups = new Set([groupKey]);
    }
    persistDocsSidebarOpenGroups();
    applyDocsSidebarGroupState(document.getElementById('docsView') || document);
  });
  docsSidebarToggleDelegationBound = true;
}

function wireDocsPage(page) {
  cleanupDocsPage();

  let tocObserver = null;
  const docsDrawerBackdrop = page.querySelector('.docs-shell__backdrop');
  const {
    input: docsSearchInput,
    clearButton: docsSearchClearButton,
    results: docsSearchResultsPanel,
  } = getDocsSearchElements({ createResults: true });

  page.querySelectorAll('[data-copy-target]').forEach((button) => {
    button.addEventListener('click', async () => {
      const target = page.querySelector(`#${button.getAttribute('data-copy-target')}`);
      if (!target) return;
      try {
        await navigator.clipboard.writeText(target.textContent || '');
        const original = button.textContent;
        button.textContent = 'Copied';
        showToast('Copied to clipboard');
        window.setTimeout(() => {
          button.textContent = original;
        }, 1800);
      } catch (error) {
        console.error('[Store] Docs copy failed:', error);
        showToast('Copy failed. Please copy manually.');
      }
    });
  });

  wireShellViewLinks(page);
  renderDocsSearch();

  const handleDocsSearchInput = (event) => {
    updateDocsSearchState(event.target.value || '');
    renderDocsSearch();
  };

  const handleDocsSearchFocus = () => {
    clearDocsSearchBlurTimeout();
    if (docsSearchQuery.trim()) {
      docsSearchOpen = true;
      renderDocsSearch();
    }
  };

  const handleDocsSearchBlur = () => {
    clearDocsSearchBlurTimeout();
    docsSearchBlurTimeout = window.setTimeout(() => {
      closeDocsSearch();
      renderDocsSearch();
    }, 120);
  };

  const handleDocsSearchClear = (event) => {
    event.preventDefault();
    closeDocsSearch({ clearQuery: true });
    renderDocsSearch();
    docsSearchInput?.focus();
  };

  const handleDocsSearchPointerDown = (event) => {
    const button = event.target instanceof Element
      ? event.target.closest('[data-docs-search-view]')
      : null;
    if (!button) return;
    event.preventDefault();
  };

  const handleDocsSearchClick = (event) => {
    const button = event.target instanceof Element
      ? event.target.closest('[data-docs-search-view]')
      : null;
    if (!button) return;
    event.preventDefault();
    openDocsSearchResult({
      view: button.getAttribute('data-docs-search-view') || '',
      sectionId: button.getAttribute('data-docs-search-section') || '',
    });
  };

  const handleDocsDrawerBackdropClick = () => {
    closeDocsSidebarDrawer({ restoreFocus: true });
  };

  const handleDocsDrawerKeydown = (event) => {
    if (event.key !== 'Escape' || !isDocsSidebarDrawerOpen()) return;
    event.preventDefault();
    closeDocsSidebarDrawer({ restoreFocus: true });
  };

  const handleDocsSearchKeydown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeDocsSearch({ clearQuery: true });
      renderDocsSearch();
      docsSearchInput?.blur();
      return;
    }

    if (!docsSearchQuery.trim()) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (docsSearchResults.length) {
        docsSearchOpen = true;
        docsSearchActiveIndex = (docsSearchActiveIndex + 1 + docsSearchResults.length) % docsSearchResults.length;
        renderDocsSearch();
      }
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (docsSearchResults.length) {
        docsSearchOpen = true;
        docsSearchActiveIndex = (docsSearchActiveIndex - 1 + docsSearchResults.length) % docsSearchResults.length;
        renderDocsSearch();
      }
      return;
    }

    if (event.key === 'Enter' && docsSearchResults.length && docsSearchActiveIndex >= 0) {
      event.preventDefault();
      openDocsSearchResult(docsSearchResults[docsSearchActiveIndex]);
    }
  };

  docsSearchInput?.addEventListener('input', handleDocsSearchInput);
  docsSearchInput?.addEventListener('focus', handleDocsSearchFocus);
  docsSearchInput?.addEventListener('blur', handleDocsSearchBlur);
  docsSearchInput?.addEventListener('keydown', handleDocsSearchKeydown);
  docsSearchClearButton?.addEventListener('click', handleDocsSearchClear);
  docsSearchResultsPanel?.addEventListener('pointerdown', handleDocsSearchPointerDown);
  docsSearchResultsPanel?.addEventListener('click', handleDocsSearchClick);
  docsDrawerBackdrop?.addEventListener('click', handleDocsDrawerBackdropClick);
  document.addEventListener('keydown', handleDocsDrawerKeydown);

  const tocLinks = [...page.querySelectorAll('.docs-page-toc a[href^="#"], .docs-sidebar .docs-link-list a[href^="#"]')];
  const fallbackSections = [...page.querySelectorAll('.docs-shell__page section[id], .docs-hub section[id]')];
  const tocSections = tocLinks.length
    ? tocLinks
      .map((link) => page.querySelector(link.getAttribute('href')))
      .filter(Boolean)
    : fallbackSections;

  const setActiveTocLink = (id) => {
    tocLinks.forEach((link) => {
      const isMatch = link.getAttribute('href') === `#${id}`;
      link.classList.toggle('is-active', isMatch);
      if (isMatch) {
        link.setAttribute('aria-current', 'true');
      } else {
        link.removeAttribute('aria-current');
      }
    });
  };

  const initialHash = window.location.hash.replace(/^#/, '');
  if (initialHash) {
    setActiveTocLink(initialHash);
  } else if (tocLinks[0]) {
    setActiveTocLink(tocLinks[0].getAttribute('href').replace(/^#/, ''));
  }

  if (tocSections.length && typeof IntersectionObserver !== 'undefined') {
    tocObserver = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (visible?.target?.id) {
        setActiveTocLink(visible.target.id);
      }
    }, { rootMargin: '-20% 0px -60% 0px' });

    tocSections.forEach((section) => tocObserver.observe(section));
  }

  tocLinks.forEach((link) => {
    link.addEventListener('click', () => {
      setActiveTocLink(link.getAttribute('href').replace(/^#/, ''));
    });
  });

  const scrollTopBtn = page.querySelector('#docsScrollTop');
  const scrollDownBtn = page.querySelector('#docsScrollDown');
  const docsScroller = document.getElementById('gridArea');
  const syncScrollActionOffset = () => {
    const footer = document.querySelector('.footer');
    const footerHeight = footer ? Math.ceil(footer.getBoundingClientRect().height) : 0;
    page.style.setProperty('--docs-scroll-actions-bottom', `${footerHeight + 20}px`);
  };
  const getScrollMetrics = () => {
    const scrollTop = docsScroller ? docsScroller.scrollTop : window.scrollY;
    const scrollHeight = docsScroller
      ? docsScroller.scrollHeight
      : Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
    const clientHeight = docsScroller ? docsScroller.clientHeight : window.innerHeight;
    const maxScroll = Math.max(scrollHeight - clientHeight, 0);
    return {
      scrollTop,
      maxScroll,
      remainingScroll: Math.max(maxScroll - scrollTop, 0),
    };
  };

  const getSectionScrollTop = (section) => {
    if (!section) return 0;
    const sectionRect = section.getBoundingClientRect();
    if (docsScroller) {
      const scrollerRect = docsScroller.getBoundingClientRect();
      return Math.max(docsScroller.scrollTop + (sectionRect.top - scrollerRect.top) - 16, 0);
    }
    return Math.max(window.scrollY + sectionRect.top - 24, 0);
  };

  const scrollDocsTo = (top) => {
    if (docsScroller) {
      docsScroller.scrollTo({ top, behavior: 'smooth' });
    } else {
      window.scrollTo({ top, behavior: 'smooth' });
    }
  };

  const syncScrollButtons = () => {
    const { scrollTop, remainingScroll } = getScrollMetrics();
    if (scrollTopBtn) {
      scrollTopBtn.classList.toggle('is-visible', scrollTop > 600);
    }
    if (scrollDownBtn) {
      scrollDownBtn.classList.toggle('is-visible', remainingScroll > 220);
    }
  };

  const handleScrollTopClick = () => {
    scrollDocsTo(0);
  };

  const handleScrollDownClick = () => {
    const { scrollTop, maxScroll } = getScrollMetrics();
    const nextSection = tocSections.find((section) => getSectionScrollTop(section) > scrollTop + 120);
    scrollDocsTo(nextSection ? getSectionScrollTop(nextSection) : maxScroll);
  };

  if (scrollTopBtn || scrollDownBtn) {
    syncScrollActionOffset();
    window.addEventListener('resize', syncScrollActionOffset, { passive: true });
    if (scrollTopBtn) {
      scrollTopBtn.hidden = false;
      scrollTopBtn.addEventListener('click', handleScrollTopClick);
    }
    if (scrollDownBtn) {
      scrollDownBtn.hidden = false;
      scrollDownBtn.addEventListener('click', handleScrollDownClick);
    }
    syncScrollButtons();
    if (docsScroller) {
      docsScroller.addEventListener('scroll', syncScrollButtons, { passive: true });
    } else {
      window.addEventListener('scroll', syncScrollButtons, { passive: true });
    }
  }

  window.requestAnimationFrame(() => {
    applyPendingDocsSearchNavigation(page);
  });
  syncDocsSidebarDrawerUi();

  page.querySelectorAll('[data-expand]').forEach((button) => {
    button.addEventListener('click', () => {
      const targetId = button.getAttribute('data-expand');
      const grid = targetId ? page.querySelector(`#${targetId}`) : null;
      if (!grid) return;
      grid.classList.add('is-expanded');
      button.hidden = true;
      button.setAttribute('aria-expanded', 'true');
    });
  });

  docsPageCleanup = () => {
    tocObserver?.disconnect();
    docsSearchInput?.removeEventListener('input', handleDocsSearchInput);
    docsSearchInput?.removeEventListener('focus', handleDocsSearchFocus);
    docsSearchInput?.removeEventListener('blur', handleDocsSearchBlur);
    docsSearchInput?.removeEventListener('keydown', handleDocsSearchKeydown);
    docsSearchClearButton?.removeEventListener('click', handleDocsSearchClear);
    docsSearchResultsPanel?.removeEventListener('pointerdown', handleDocsSearchPointerDown);
    docsSearchResultsPanel?.removeEventListener('click', handleDocsSearchClick);
    docsDrawerBackdrop?.removeEventListener('click', handleDocsDrawerBackdropClick);
    document.removeEventListener('keydown', handleDocsDrawerKeydown);
    clearDocsSearchBlurTimeout();
    if (scrollTopBtn || scrollDownBtn) {
      window.removeEventListener('resize', syncScrollActionOffset);
      if (docsScroller) {
        docsScroller.removeEventListener('scroll', syncScrollButtons);
      } else {
        window.removeEventListener('scroll', syncScrollButtons);
      }
      scrollTopBtn?.removeEventListener('click', handleScrollTopClick);
      scrollDownBtn?.removeEventListener('click', handleScrollDownClick);
    }
  };
}

function scrollDocsHashIntoView() {
  const hash = window.location.hash;
  if (!hash || hash === '#') return;
  const target = document.getElementById(hash.slice(1));
  if (!target) return;
  window.requestAnimationFrame(() => {
    target.scrollIntoView({ block: 'start' });
  });
}

function updateDocsSidebarState(view, scope = document) {
  ensureDocsGroupOpenForView(view);
  scope.querySelectorAll('.docs-shell__nav-link[data-docs-view]').forEach((link) => {
    const isActive = link.getAttribute('data-docs-view') === view;
    link.classList.toggle('is-active', isActive);
    if (isActive) {
      link.setAttribute('aria-current', 'page');
    } else {
      link.removeAttribute('aria-current');
    }
  });
  applyDocsSidebarGroupState(scope);
}

function renderDocsSitePage(view = 'docs') {
  removePackCatalog({ keepDocs: true });

  const gridArea = document.getElementById('gridArea');
  if (!gridArea) return;

  let page = document.getElementById('docsView');

  if (!page) {
    page = document.createElement('div');
    page.id = 'docsView';
    page.className = 'docs-view docs-view--site';
    page.innerHTML = renderDocsSiteShellMarkup(view);
    gridArea.appendChild(page);
  }

  cleanupDocsPage();
  ensureDocsSidebarToggleDelegation();
  updateDocsSidebarState(view, page);
  renderDocsSearch();

  const article = page.querySelector('.docs-shell__page');
  if (!article) return;
  article.innerHTML = renderDocsArticleMarkup(view);

  wireDocsPage(page);
  syncDocsSidebarDrawerUi();
  scrollDocsHashIntoView();
}

function renderDocsGuidePage(view) {
  renderDocsSitePage(view);
  return;
  removePackCatalog();

  const guide = getDocsGuideConfig(view);
  if (!guide) {
    renderDocsPage();
    return;
  }

  const gridArea = document.getElementById('gridArea');
  if (!gridArea) return;

  const snippetsMarkup = guide.snippets
    .map((snippet, index) => `
      <div class="docs-code docs-code--with-copy" style="margin-top: ${index === 0 ? '22px' : '16px'};">
        <button class="docs-copy docs-copy--overlay" type="button" data-copy-target="${snippet.id}">${snippet.label}</button>
        <pre><code id="${snippet.id}">${snippet.code}</code></pre>
      </div>`)
    .join('');

  const relatedGuidesMarkup = guide.relatedGuides
    .map((link) => `<a href="${link.href}" data-docs-view="${link.view}">${link.label}</a>`)
    .join('');

  const page = document.createElement('div');
  page.id = 'docsView';
  page.className = 'docs-view docs-view--guide';

  page.innerHTML = `
    <div class="docs-hub">
      <section class="docs-hero">
        <span class="docs-eyebrow">${guide.eyebrow}</span>
        <h1 class="docs-hero__title">${guide.title}</h1>
        <p class="docs-hero__copy">${guide.heroCopy}</p>
        <div class="docs-hero__actions">
          <a class="docs-btn docs-btn--primary" href="/?view=docs" data-docs-view="docs">Back to docs</a>
          <a class="docs-btn docs-btn--secondary" href="/?view=pricing" data-docs-view="pricing">Pricing</a>
        </div>
        ${snippetsMarkup}
        ${guide.heroNote ? `<p class="docs-section__copy" style="margin-top: 14px;">${guide.heroNote}</p>` : ''}
      </section>

      <div class="docs-main">
        <div class="docs-column">
          <section class="docs-section" id="guide-flow">
            <h2 class="docs-section__title">${guide.eyebrow} flow</h2>
            <div class="docs-grid">
              ${guide.flowCards.map((card) => `
                <article class="docs-card">
                  <h3>${card.title}</h3>
                  <p>${card.copy}</p>
                </article>`).join('')}
            </div>
          </section>

          <section class="docs-section" id="guide-examples">
            <h2 class="docs-section__title">${guide.eyebrow} examples</h2>
            <div class="docs-code">
              <pre><code>${guide.exampleCode}</code></pre>
            </div>
          </section>

          <section class="docs-section" id="guide-premium">
            <h2 class="docs-section__title">Premium access</h2>
            <div class="docs-grid">
              ${guide.premiumCards.map((card) => `
                <article class="docs-card">
                  <h3>${card.title}</h3>
                  <p>${card.copy}</p>
                </article>`).join('')}
            </div>
          </section>

          <section class="docs-section" id="guide-troubleshooting">
            <h2 class="docs-section__title">Troubleshooting</h2>
            <div class="docs-grid">
              ${guide.troubleshootingCards.map((card) => `
                <article class="docs-card">
                  <h3>${card.title}</h3>
                  <p>${card.copy}</p>
                </article>`).join('')}
            </div>
          </section>
        </div>

        <aside class="docs-column docs-column--sidebar">
          <section class="docs-sidebar">
            <h3>On this page</h3>
            <div class="docs-link-list">
              <a href="#guide-flow">${guide.eyebrow} flow</a>
              <a href="#guide-examples">${guide.eyebrow} examples</a>
              <a href="#guide-premium">Premium access</a>
              <a href="#guide-troubleshooting">Troubleshooting</a>
            </div>
          </section>

          <section class="docs-sidebar">
            <h3>Related guides</h3>
            <div class="docs-link-list">
              ${relatedGuidesMarkup}
            </div>
          </section>

        </aside>
      </div>

      <div class="docs-scroll-actions" aria-label="Page navigation">
        <button class="docs-scroll-btn" id="docsScrollDown" aria-label="Go to next section" hidden>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </button>
        <button class="docs-scroll-btn" id="docsScrollTop" aria-label="Back to top" hidden>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="18 15 12 9 6 15"></polyline>
          </svg>
        </button>
      </div>
    </div>`;

  gridArea.appendChild(page);
  wireDocsPage(page);
  scrollDocsHashIntoView();
}

function renderDocsPage() {
  renderDocsSitePage('docs');
  return;
  removePackCatalog();

  const gridArea = document.getElementById('gridArea');
  if (!gridArea) return;

  const page = document.createElement('div');
  page.id = 'docsView';
  page.className = 'docs-view';

  page.innerHTML = `
    <div class="docs-hub">
      <section class="docs-hero">
        <span class="docs-eyebrow">Docs</span>
        <h1 class="docs-hero__title">Supericons docs and MCP setup</h1>
        <p class="docs-hero__copy">
          Everything you need to connect Supericons to your coding agent.
          Base setup takes under a minute. Add a Supericons API key to your MCP config to access any <a href="/?view=pricing" data-docs-view="pricing">premium collections or Pro workflow tools</a> tied to your account.
        </p>
        <div class="docs-hero__actions">
          <a class="docs-btn docs-btn--primary" href="#docs-quickstart">Quickstart</a>
          <a class="docs-btn docs-btn--secondary" href="/?view=api-keys" data-docs-view="api-keys">API Keys</a>
        </div>
        <div class="docs-pill-list">
          <a class="docs-pill" href="/" data-docs-view="icons">${freeIconsLabel}</a>
          <a class="docs-pill" href="#docs-tools">${mcpToolsLabel}</a>
          <a class="docs-pill" href="/?view=pricing" data-docs-view="pricing">Premium collection access</a>
          <a class="docs-pill" href="/?view=motion-lab" data-docs-view="motion-lab">Motion Lab MCP for Pro</a>
          <a class="docs-pill" href="/?view=converter" data-docs-view="converter">Converter MCP for Pro</a>
        </div>
      </section>

      <div class="docs-main">
        <div class="docs-column">
          <section class="docs-section" id="docs-quickstart">
            <h2 class="docs-section__title">Quickstart</h2>
            <p class="docs-section__copy">Start with the base MCP server config. Free icons work immediately. Premium icons require a <a href="/?view=pricing" data-docs-view="pricing">Pro subscription or collection (pack) purchase</a>, plus a Supericons API key.</p>
            <p class="docs-section__copy">Paste the snippet below into your client's MCP config file. If you are not sure where to find it, pick your client from the guides below.</p>
            <div class="docs-code docs-code--with-copy">
              <button class="docs-copy docs-copy--overlay" type="button" data-copy-target="docs-base-config">Copy</button>
              <pre><code id="docs-base-config">{
  "mcpServers": {
    "supericons": {
      "command": "npx",
      "args": ["-y", "supericons-mcp"]
    }
  }
}</code></pre>
            </div>
            <div class="docs-grid" style="margin-top: 18px;">
              <article class="docs-card">
                <h3>Free path</h3>
                <ul>
                  <li>Add the base MCP config to your client.</li>
                  <li>Restart or reload your MCP client.</li>
                  <li>Use <code>search_icons</code> or <code>get_icon</code> right away.</li>
                </ul>
              </article>
              <article class="docs-card">
                <h3>Premium path</h3>
                <ul>
                  <li><a href="/?view=pricing" data-docs-view="pricing">Subscribe to Pro or buy the collection you need.</a></li>
                  <li>Open <a href="/?view=api-keys" data-docs-view="api-keys">API Keys</a> and generate an API key.</li>
                  <li>Add <code>SUPERICONS_API_KEY</code> in the env or secrets field your client supports.</li>
                </ul>
              </article>
            </div>
          </section>

          <section class="docs-section" id="docs-premium">
            <h2 class="docs-section__title">Premium MCP setup</h2>
            <p class="docs-section__copy">An API key securely links your coding agent to your Supericons account. It unlocks whatever <a href="/?view=pricing" data-docs-view="pricing">premium collections or Pro workflow tools</a> you already own.</p>
            <div class="docs-code docs-code--with-copy">
              <button class="docs-copy docs-copy--overlay" type="button" data-copy-target="docs-premium-config">Copy</button>
              <pre><code id="docs-premium-config">{
  "mcpServers": {
    "supericons": {
      "command": "npx",
      "args": ["-y", "supericons-mcp"],
      "env": {
        "SUPERICONS_API_KEY": "your_key_here"
      }
    }
  }
}</code></pre>
            </div>
            <p class="docs-section__copy">This JSON-style example fits clients that support an <code>env</code> object in their MCP config. Use the client-specific guide for the exact syntax your editor expects.</p>
            <p class="docs-section__copy">Today MCP supports icon search, icon retrieval, library discovery, Motion Lab preset exports, and Converter workflows for Pro users.</p>
          </section>

          <section class="docs-section" id="docs-tools">
            <h2 class="docs-section__title">MCP tools</h2>
            <div class="docs-grid docs-grid--collapse" id="toolsGrid">
              <article class="docs-card">
                <h3><code>search_icons</code></h3>
                <p>Find the closest icon match across the free libraries and any premium collections your account can access.</p>
              </article>
              <article class="docs-card">
                <h3><code>get_icon</code></h3>
                <p>Retrieve a specific icon payload with ready-to-use SVG output that can be inserted directly into code.</p>
              </article>
              <article class="docs-card">
                <h3><code>list_libraries</code></h3>
                <p>List the libraries and premium collection sources your MCP session can currently access.</p>
              </article>
              <article class="docs-card">
                <h3><code>list_motion_presets</code> <span class="docs-badge docs-badge--pro">Pro</span></h3>
                <p>Browse available Motion Lab presets before generating CSS or animated SVGs.</p>
              </article>
              <article class="docs-card">
                <h3><code>export_motion_css</code> <span class="docs-badge docs-badge--pro">Pro</span></h3>
                <p>Generate Motion Lab CSS for a chosen icon, preset, trigger, duration, and intensity without leaving your coding agent.</p>
              </article>
              <article class="docs-card">
                <h3><code>export_animated_svg</code> <span class="docs-badge docs-badge--pro">Pro</span></h3>
                <p>Generate a self-contained animated SVG for the selected icon and preset as a single MCP response.</p>
              </article>
              <article class="docs-card">
                <h3><code>convert_svg_to_png</code> <span class="docs-badge docs-badge--pro">Pro</span></h3>
                <p>Render SVG input to PNG with a controlled output width and optional background through the Pro converter workflow.</p>
              </article>
              <article class="docs-card">
                <h3><code>convert_png_to_svg</code> <span class="docs-badge docs-badge--pro">Pro</span></h3>
                <p>Trace PNG input to SVG with the same converter-quality controls used by the browser workflow.</p>
              </article>
            </div>
            <button class="docs-expand-btn" type="button" data-expand="toolsGrid" aria-expanded="false">Show all 8 tools</button>
            <div class="docs-grid" style="margin-top: 14px;">
              <article class="docs-card docs-card--muted">
                <h3>Access by plan</h3>
                <p>Free users can search and retrieve from all free libraries. <a href="/?view=pricing" data-docs-view="pricing">Pro subscribers and collection owners</a> can access their premium assets by connecting an API key.</p>
              </article>
              <article class="docs-card docs-card--muted">
                <h3>Workflow tools require Pro</h3>
                <p><a href="/?view=motion-lab" data-docs-view="motion-lab">Motion Lab MCP</a> and <a href="/?view=converter" data-docs-view="converter">Converter MCP</a> are Pro-only. Collection ownership unlocks premium icon assets, but workflow tool access requires a <a href="/?view=pricing" data-docs-view="pricing">Pro subscription</a>.</p>
              </article>
            </div>
          </section>

          <section class="docs-section" id="docs-guides">
            <h2 class="docs-section__title">Client guides</h2>
            <p class="docs-section__copy">The Supericons stdio server can be used with any MCP-capable client. The core configuration is the same, but every client has its own setup process and settings file.</p>
            <div class="docs-pill-list docs-pill-list--compact" style="margin-top: 14px; margin-bottom: 18px;">
              <a class="docs-pill" href="/?view=docs-claude-code" data-docs-view="docs-claude-code">Claude Code</a>
              <a class="docs-pill" href="/?view=docs-codex" data-docs-view="docs-codex">Codex</a>
              <a class="docs-pill" href="/?view=docs-cursor" data-docs-view="docs-cursor">Cursor</a>
              <a class="docs-pill" href="https://opencode.ai/docs/mcp-servers" target="_blank" rel="noopener noreferrer">OpenCode</a>
              <a class="docs-pill" href="https://docs.cline.bot/mcp/adding-and-configuring-servers" target="_blank" rel="noopener noreferrer">Cline</a>
              <a class="docs-pill" href="https://docs.github.com/en/copilot/how-tos/use-copilot-agents/coding-agent/extend-coding-agent-with-mcp" target="_blank" rel="noopener noreferrer">Copilot agent</a>
              <a class="docs-pill" href="https://docs.windsurf.com/windsurf/cascade/mcp" target="_blank" rel="noopener noreferrer">Windsurf</a>
            </div>
            <div class="docs-grid docs-grid--collapse" id="guidesGrid">
              <article class="docs-card">
                <h3><a href="/?view=docs-claude-code" data-docs-view="docs-claude-code">Claude Code</a></h3>
                <p>Supericons setup guide plus Anthropic's official MCP docs for CLI setup, Windows notes, and troubleshooting.</p>
              </article>
              <article class="docs-card">
                <h3><a href="/?view=docs-codex" data-docs-view="docs-codex">Codex</a></h3>
                <p>Supericons setup guide plus OpenAI's official MCP docs for CLI and <code>config.toml</code> setup.</p>
              </article>
              <article class="docs-card">
                <h3><a href="/?view=docs-cursor" data-docs-view="docs-cursor">Cursor</a></h3>
                <p>Supericons setup guide plus Cursor's official MCP docs for JSON config and in-app MCP settings.</p>
              </article>
              <article class="docs-card">
                <h3><a href="https://opencode.ai/docs/mcp-servers" target="_blank" rel="noopener noreferrer">OpenCode</a></h3>
                <p>Official OpenCode MCP docs for server config and CLI flow.</p>
              </article>
              <article class="docs-card">
                <h3><a href="https://docs.cline.bot/mcp/adding-and-configuring-servers" target="_blank" rel="noopener noreferrer">Cline</a></h3>
                <p>Official Cline docs for the Servers UI and <code>cline_mcp_settings.json</code> config.</p>
              </article>
              <article class="docs-card">
                <h3><a href="https://docs.github.com/en/copilot/how-tos/use-copilot-agents/coding-agent/extend-coding-agent-with-mcp" target="_blank" rel="noopener noreferrer">Copilot agent</a></h3>
                <p>Official GitHub docs for repository MCP config and Copilot environment secrets.</p>
              </article>
              <article class="docs-card">
                <h3><a href="https://docs.windsurf.com/windsurf/cascade/mcp" target="_blank" rel="noopener noreferrer">Windsurf</a></h3>
                <p>Official Windsurf docs for settings UI and <code>mcp_config.json</code> setup.</p>
              </article>
            </div>
            <button class="docs-expand-btn" type="button" data-expand="guidesGrid" aria-expanded="false">Show all 7 guides</button>
          </section>

          <section class="docs-section" id="docs-workflow-tools">
            <h2 class="docs-section__title">Workflow Tools</h2>
            <p class="docs-section__copy"><a href="/?view=motion-lab" data-docs-view="motion-lab">Motion Lab</a> and <a href="/?view=converter" data-docs-view="converter">Converter</a> are free to browse in the browser. Exports (animation CSS, animated SVG, PNG, and SVG tracing) require a <a href="/?view=pricing" data-docs-view="pricing">Pro subscription</a>, both in the browser and through MCP.</p>
            <p class="docs-section__copy">Pro subscribers can also run both tools through MCP, triggering the same exports directly from their coding agent.</p>
            <p class="docs-section__copy">
              <a href="/?view=motion-lab" data-docs-view="motion-lab">Open Motion Lab in browser</a> &middot;
              <a href="/?view=converter" data-docs-view="converter">Open Converter in browser</a>
            </p>
            <div class="docs-grid">
              <article class="docs-card">
                <h3>Motion Lab MCP <span class="docs-badge docs-badge--pro">Pro</span></h3>
                <ul>
                  <li>Preset discovery</li>
                  <li>Trigger control</li>
                  <li>Motion CSS export</li>
                  <li>Standalone animated SVG export</li>
                </ul>
              </article>
              <article class="docs-card">
                <h3>Converter MCP <span class="docs-badge docs-badge--pro">Pro</span></h3>
                <ul>
                  <li>SVG to PNG conversion</li>
                  <li>PNG to SVG tracing</li>
                  <li>Input inspection and warnings</li>
                  <li>Suggested conversion settings</li>
                </ul>
              </article>
              <article class="docs-card docs-card--muted">
                <h3>Why this matters</h3>
                <p>Search-only MCP is useful, but workflow-tool access is the stronger Pro value proposition for design systems, prototyping, and coding-agent automation.</p>
              </article>
              <article class="docs-card docs-card--muted">
                <h3>Current status</h3>
                <p><a href="/?view=motion-lab" data-docs-view="motion-lab">Motion Lab MCP</a> and <a href="/?view=converter" data-docs-view="converter">Converter MCP</a> are Pro-only workflow tools. Collection ownership still works for icon access, but workflow tooling requires <a href="/?view=pricing" data-docs-view="pricing">Pro</a>.</p>
              </article>
            </div>
          </section>

          <section class="docs-section" id="docs-recipes">
            <h2 class="docs-section__title">Starter prompts</h2>
            <p class="docs-section__copy">Copy any of these prompts and paste them into your coding agent to get started.</p>
            <div class="docs-grid">
              <article class="docs-card">
                <div class="docs-card__head">
                  <h3>UI build</h3>
                  <button class="docs-copy" type="button" data-copy-target="recipe-ui-build">Copy</button>
                </div>
                <div class="docs-code docs-code--compact">
                  <pre><code id="recipe-ui-build">Find a tab icon for analytics.
Show the Lucide and Tabler options side by side.
Insert the chosen SVG into my React component.</code></pre>
                </div>
              </article>
              <article class="docs-card">
                <div class="docs-card__head">
                  <h3>Brand logos</h3>
                  <button class="docs-copy" type="button" data-copy-target="recipe-brand-logos">Copy</button>
                </div>
                <div class="docs-code docs-code--compact">
                  <pre><code id="recipe-brand-logos">Search Simple Icons for Stripe, Vercel, and Supabase.
Return the SVGs in monochrome.
Place them in a footer component.</code></pre>
                </div>
              </article>
              <article class="docs-card">
                <div class="docs-card__head">
                  <h3>Premium assets</h3>
                  <button class="docs-copy" type="button" data-copy-target="recipe-premium">Copy</button>
                </div>
                <div class="docs-code docs-code--compact">
                  <pre><code id="recipe-premium">Fetch icons from a premium collection tied to my Pro or collection access.
Drop them into a prototype component.
Keep access tied to my Supericons API key.</code></pre>
                </div>
              </article>
              <article class="docs-card">
                <div class="docs-card__head">
                  <h3>Explore what's available</h3>
                  <button class="docs-copy" type="button" data-copy-target="recipe-discovery">Copy</button>
                </div>
                <div class="docs-code docs-code--compact">
                  <pre><code id="recipe-discovery">List all Supericons MCP tools available to me.
Show which are free and which need Pro.
Then search for a secure login icon.</code></pre>
                </div>
              </article>
            </div>
          </section>

          <section class="docs-section" id="docs-troubleshooting">
            <h2 class="docs-section__title">Troubleshooting</h2>
            <div class="docs-grid">
              <article class="docs-card">
                <h3>Server installed but no tools appear</h3>
                <p>Restart or reload the MCP client after saving your config. Most missing-tool issues are simply caused by the client needing a refresh.</p>
              </article>
              <article class="docs-card">
                <h3>Premium icons do not appear</h3>
                <p>Verify your account has an active <a href="/?view=pricing" data-docs-view="pricing">Pro subscription or collection purchase</a>, then generate a new API key and update your client's config.</p>
              </article>
              <article class="docs-card">
                <h3>Invalid or revoked key</h3>
                <p>Open <a href="/?view=api-keys" data-docs-view="api-keys">API Keys</a>, revoke the old key if needed, generate a new one, and update the MCP env or secrets field.</p>
              </article>
              <article class="docs-card">
                <h3>Need exact client syntax</h3>
                <p>Use the client guides above when your editor uses a different MCP config format than the JSON-style example on this page.</p>
              </article>
            </div>
          </section>
        </div>

        <aside class="docs-column docs-column--sidebar">
          <section class="docs-sidebar">
            <h3>On this page</h3>
            <div class="docs-link-list">
              <a href="#docs-quickstart">Quickstart</a>
              <a href="#docs-premium">Premium setup</a>
              <a href="#docs-tools">MCP tools</a>
              <a href="#docs-guides">Client guides</a>
              <a href="#docs-workflow-tools">Workflow tools</a>
              <a href="#docs-recipes">Starter prompts</a>
              <a href="#docs-troubleshooting">Troubleshooting</a>
            </div>
          </section>

          <section class="docs-callout">
            <h3>What's live</h3>
            <p>Supericons MCP includes 8 tools: icon search, icon retrieval, library listing, Motion Lab preset browsing, motion CSS export, animated SVG export, SVG-to-PNG, and PNG-to-SVG tracing. Motion Lab and Converter exports are Pro-only.</p>
          </section>

        </aside>
      </div>

      <div class="docs-scroll-actions" aria-label="Page navigation">
        <button class="docs-scroll-btn" id="docsScrollDown" aria-label="Go to next section" hidden>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </button>
        <button class="docs-scroll-btn" id="docsScrollTop" aria-label="Back to top" hidden>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="18 15 12 9 6 15"></polyline>
          </svg>
        </button>
      </div>
    </div>`;

  gridArea.appendChild(page);
  wireDocsPage(page);
  scrollDocsHashIntoView();
}

function renderTermsPage() {
  removePackCatalog();

  const gridArea = document.getElementById('gridArea');
  if (!gridArea) return;

  const page = document.createElement('div');
  page.id = 'termsView';
  page.className = 'terms-view';

  page.innerHTML = `
    <div class="terms-content">
      <p class="terms-content__updated">Last updated: April 8, 2026</p>

      <section class="terms-section">
        <h3 class="terms-section__title">1. Usage Rights</h3>
        <p>SuperIcons provides free and premium icon assets for use in digital products. Free icons from the 10 open-source libraries available in SuperIcons retain their original open-source licenses.</p>
        <p>Premium animated collections are proprietary assets created by Curly Mole Labs. Your usage rights depend on your license tier (see Section 4 below).</p>
      </section>

      <section class="terms-section">
        <h3 class="terms-section__title">2. AI Output Rights</h3>
        <p>Icons retrieved via the <a href="/?view=docs" data-docs-view="docs">SuperIcons MCP server</a> may be used in AI-generated code output. The generated code (HTML, CSS, JSX) that references or embeds our icons is your property.</p>
        <p>However, the underlying SVG and CSS animation source files remain the intellectual property of Curly Mole Labs. You may not use AI tools to extract, reverse-engineer, or bulk-export raw icon assets.</p>
      </section>

      <section class="terms-section">
        <h3 class="terms-section__title">3. Redistribution Policy</h3>
        <p>You may <strong>not</strong>:</p>
        <ul>
          <li>Redistribute raw SVG or CSS animation source files</li>
          <li>Include premium icons in open-source projects as bundled assets</li>
          <li>Create competing icon libraries using SuperIcons assets</li>
          <li>Resell, sublicense, or share download access</li>
          <li>Build tools that generate or redistribute our icons</li>
        </ul>
        <p>You <strong>may</strong> use icons in compiled output (built websites, applications, production bundles) where the raw source is not directly extractable.</p>
      </section>

      <section class="terms-section">
        <h3 class="terms-section__title">4. Licensing Tiers</h3>
        <div class="terms-tier-grid">
          <div class="terms-tier">
            <h4>Single Project License</h4>
            <p>Applies to: A-la-carte purchases and <a href="/?view=pricing" data-docs-view="pricing">Pro Monthly</a> collection claims</p>
            <p>Use the purchased collection in one (1) project. Additional projects require additional purchases, <a href="/?view=pricing" data-docs-view="pricing">Launch Bundle</a>, <a href="/?view=pricing" data-docs-view="pricing">Pro Annual</a> ownership, or an active <a href="/?view=pricing" data-docs-view="pricing">Pro subscription</a>.</p>
          </div>
          <div class="terms-tier">
            <h4>Unlimited Project License</h4>
            <p>Applies to: Active <a href="/?view=pricing" data-docs-view="pricing">Pro subscribers</a>, <a href="/?view=pricing" data-docs-view="pricing">Pro Annual</a> included collections, <a href="/?view=pricing" data-docs-view="pricing">Launch Edition</a> purchasers</p>
            <p>Use eligible collections in unlimited projects, including client work. Valid for as long as your subscription is active for monthly Pro and future annual drops, and permanently for <a href="/?view=pricing" data-docs-view="pricing">Pro Annual</a> included collections and <a href="/?view=pricing" data-docs-view="pricing">Launch Edition</a> purchases.</p>
          </div>
        </div>
      </section>

      <section class="terms-section">
        <h3 class="terms-section__title">5. Refund Policy</h3>
        <p><strong><a href="/?view=pricing" data-docs-view="pricing">Pro Subscription</a>:</strong> You may cancel your subscription at any time. No partial refunds are issued for the current billing period. Your benefits remain active until the end of the paid period. Monthly claims stay in your library permanently. <a href="/?view=pricing" data-docs-view="pricing">Pro Annual</a> keeps the 8 included premium collections in your library permanently, while future premium drops and Pro tools end when the annual term ends unless renewed.</p>
        <p><strong>One-time Purchases:</strong> Due to the digital nature of our products, we do not offer refunds on individual collection purchases or the <a href="/?view=pricing" data-docs-view="pricing">Launch Edition</a> bundle once download access has been granted.</p>
        <p><strong>Exceptions:</strong> If you experience a technical issue that prevents you from accessing your purchased content, contact us within 14 days for a full refund or resolution.</p>
      </section>

      <section class="terms-section">
        <h3 class="terms-section__title">6. Contact</h3>
        <p>For questions about these terms, licensing, or refund requests:</p>
        <p>Email: <a href="mailto:hello@supericons.dev">hello@supericons.dev</a></p>
      </section>
    </div>`;

  gridArea.appendChild(page);
  wireShellViewLinks(page);
}

function renderPrivacyPage() {
  removePackCatalog();

  const gridArea = document.getElementById('gridArea');
  if (!gridArea) return;

  const page = document.createElement('div');
  page.id = 'privacyView';
  page.className = 'terms-view';

  page.innerHTML = `
    <div class="terms-content">
      <p class="terms-content__updated">Last updated: April 8, 2026</p>

      <section class="terms-section">
        <h3 class="terms-section__title">1. Overview</h3>
        <p>Supericons is an icon search, export, licensing, and MCP access product operated by Curly Mole Labs. This Privacy Policy explains what information we collect, how we use it, and how to contact us about privacy questions.</p>
      </section>

      <section class="terms-section">
        <h3 class="terms-section__title">2. Data We Collect</h3>
        <p>We may collect account information such as your email address, display name, authentication provider, and account identifiers when you create an account or sign in.</p>
        <p>We also store purchase, entitlement, and subscription records needed to grant access to <a href="/?view=pricing" data-docs-view="pricing">premium collections</a>, <a href="/?view=docs" data-docs-view="docs">MCP features</a>, and related product functionality.</p>
        <p>We collect anonymized, cookie-free usage analytics to understand how the product is used. No personal data is tied to these analytics.</p>
        <p>If you contact us, we may receive the information you include in your email or support request.</p>
      </section>

      <section class="terms-section">
        <h3 class="terms-section__title">3. How We Use Data</h3>
        <ul>
          <li>Providing sign-in, account recovery, and account management</li>
          <li>Processing purchases, subscriptions, and entitlements</li>
          <li>Delivering paid access to <a href="/?view=pricing" data-docs-view="pricing">premium collections</a> and <a href="/?view=docs" data-docs-view="docs">MCP features</a></li>
          <li>Responding to support requests and product questions</li>
          <li>Protecting the service against abuse, fraud, and unauthorized access</li>
          <li>Improving product quality and reliability</li>
        </ul>
      </section>

      <section class="terms-section">
        <h3 class="terms-section__title">4. Payments</h3>
        <p>Payments and subscription management are handled by Stripe. We do not store full payment card details on Supericons servers. Stripe may collect and process billing information according to its own privacy and security practices.</p>
      </section>

      <section class="terms-section">
        <h3 class="terms-section__title">5. Authentication And Email</h3>
        <p>Authentication may include email/password sign-in and Google sign-in. Transactional emails such as confirmation, password reset, and password-changed notifications are delivered through a secure email provider on our behalf.</p>
      </section>

      <section class="terms-section">
        <h3 class="terms-section__title">6. MCP Access</h3>
        <p>When you use Supericons through <a href="/?view=docs" data-docs-view="docs">MCP</a>, we may process requests needed to validate access, return icon results, and enforce premium entitlements tied to your account or <a href="/?view=api-keys" data-docs-view="api-keys">API key</a>.</p>
      </section>

      <section class="terms-section">
        <h3 class="terms-section__title">7. Third-Party Services</h3>
        <p>Supericons relies on third-party providers for authentication, billing, email delivery, and basic product analytics. These services may process limited data as needed to operate their respective functions. Payment processing is handled by Stripe.</p>
      </section>

      <section class="terms-section">
        <h3 class="terms-section__title">8. Data Retention</h3>
        <p>We retain account, billing, and entitlement records for as long as needed to operate the service, provide access to purchases, comply with legal obligations, resolve disputes, and support customers.</p>
      </section>

      <section class="terms-section">
        <h3 class="terms-section__title">9. Your Choices</h3>
        <p>You can update your display name inside the app and use password reset to recover access to your account. For privacy-related requests such as correction or deletion, contact us directly and we will process your request.</p>
      </section>

      <section class="terms-section">
        <h3 class="terms-section__title">10. Contact</h3>
        <p>For privacy questions or requests, contact us at <a href="mailto:hello@supericons.dev">hello@supericons.dev</a>.</p>
      </section>
    </div>`;

  gridArea.appendChild(page);
}

// ── Launch Edition Card ───────────────────────────────────────
function createLaunchEditionCard(launchProducts) {
  const card = document.createElement('div');
  card.className = 'promo-banner promo-banner--launch';

  const ownedCount = launchProducts.filter(p =>
    userPurchases.some(up => up.product_id === p.id)
  ).length;

  const retailPrice = 40;
  const savingsPercent = Math.round((1 - 29 / retailPrice) * 100);

  const isComplete = ownedCount === launchProducts.length;

  card.innerHTML = `
    <div class="promo-banner__left">
      <span class="material-symbols-outlined promo-banner__icon">deployed_code</span>
      <div class="promo-banner__info">
        <div class="promo-banner__title">Launch Edition <span class="pack-card__save-badge">Save ${savingsPercent}%</span></div>
        <div class="promo-banner__desc">All 8 collections, 400 animated icons, unlimited projects.</div>
      </div>
    </div>
    <div class="promo-banner__right">
      ${isComplete
        ? '<span class="launch-card__complete"><span class="material-symbols-outlined" style="font-size:14px">verified</span> Complete</span>'
        : `<div class="promo-banner__price-row">
             <span class="promo-banner__price"><span class="launch-card__original">$${retailPrice}</span> $29</span>
             ${ownedCount > 0 ? `<span class="launch-card__owned">${ownedCount}/8 owned</span>` : ''}
             <button class="promo-banner__btn" id="launchEditionBtn">Get Bundle</button>
           </div>`}
    </div>`;

  const btn = card.querySelector('#launchEditionBtn');
  if (btn) {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      handleLaunchEditionPurchase();
    });
  }

  return card;
}

async function handleLaunchEditionPurchase() {
  if (!isLoggedIn()) {
    promptForAuth('purchase');
    showToast('Sign in to continue your purchase');
    return;
  }

  showToast('Redirecting to checkout...');

  try {
    const sb = getSupabase();
    const { data: { session } } = await sb.auth.getSession();
    const token = session?.access_token;

    const res = await fetch(`${SUPABASE_URL}/functions/v1/create-checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'apikey': SUPABASE_ANON,
      },
      body: JSON.stringify({
        price_id: STRIPE_LAUNCH_EDITION,
        product_id: 'launch_edition',
        mode: 'payment',
        success_url: `${window.location.origin}?purchase=success&product_id=launch_edition`,
        cancel_url: `${window.location.origin}?purchase=canceled`,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Checkout failed');
    }

    const { url } = await res.json();
    if (url) window.location.href = url;
  } catch (err) {
    showToast(err.message || 'Payment error. Please try again.');
    console.error('[Store] Launch Edition checkout error:', err);
  }
}
// ── Credit Redemption ─────────────────────────────────────────
function getClaimFailureMessage(reason, nextAvailable, fallback) {
  if (reason === 'cooldown_wait') {
    return `Next claim available ${formatClaimAvailability(nextAvailable)}.`;
  }
  if (reason === 'all_owned') return 'All claimable collections are already in your library.';
  if (reason === 'already_owned') return 'This collection is already in your library.';
  if (reason === 'subscription_required') return 'An active Pro subscription is required to claim collections.';
  return fallback || 'Collection claim failed. Please try again.';
}

async function requestPackClaimWithToken(token, productId) {
  return fetch(`${SUPABASE_URL}/functions/v1/redeem-credit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'apikey': SUPABASE_ANON,
    },
    body: JSON.stringify({ product_id: productId }),
  });
}

function showPackClaimConfirmModal(productName, claimReason) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'claim-confirm-modal';

    const safeName = escapeHtml(productName || 'this collection');
    const usageCopy = claimReason === 'legacy_credit'
      ? 'This will use 1 legacy credit.'
      : 'This will use your active Pro claim.';

    overlay.innerHTML = `
      <div class="claim-confirm-modal__backdrop"></div>
      <div class="claim-confirm-modal__card" role="dialog" aria-modal="true" aria-labelledby="claimConfirmTitle">
        <button class="claim-confirm-modal__close" type="button" aria-label="Close">
          <span class="material-symbols-outlined">close</span>
        </button>
        <p class="claim-confirm-modal__eyebrow">Claim Collection</p>
        <h3 class="claim-confirm-modal__title" id="claimConfirmTitle">Add "${safeName}" to My Collection?</h3>
        <p class="claim-confirm-modal__desc">The collection unlocks immediately and will appear in your library.</p>
        <p class="claim-confirm-modal__meta">${usageCopy}</p>
        <div class="claim-confirm-modal__actions">
          <button class="claim-confirm-modal__btn claim-confirm-modal__btn--ghost" type="button" data-action="cancel">Cancel</button>
          <button class="claim-confirm-modal__btn claim-confirm-modal__btn--primary" type="button" data-action="confirm">Add to My Collection</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const card = overlay.querySelector('.claim-confirm-modal__card');
    const closeBtn = overlay.querySelector('.claim-confirm-modal__close');
    const cancelBtn = overlay.querySelector('[data-action="cancel"]');
    const confirmBtn = overlay.querySelector('[data-action="confirm"]');
    const backdrop = overlay.querySelector('.claim-confirm-modal__backdrop');

    let settled = false;
    const close = (accepted) => {
      if (settled) return;
      settled = true;
      document.removeEventListener('keydown', onKeyDown);
      overlay.remove();
      resolve(accepted);
    };

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close(false);
      }
      if (event.key === 'Enter' && document.activeElement === confirmBtn) {
        event.preventDefault();
        close(true);
      }
    };

    backdrop?.addEventListener('click', () => close(false));
    closeBtn?.addEventListener('click', () => close(false));
    cancelBtn?.addEventListener('click', () => close(false));
    confirmBtn?.addEventListener('click', () => close(true));
    document.addEventListener('keydown', onKeyDown);

    requestAnimationFrame(() => {
      overlay.classList.add('open');
      confirmBtn?.focus();
      card?.scrollIntoView({ block: 'nearest' });
    });
  });
}

async function handlePackClaim(product) {
  if (!isLoggedIn() || !isPro()) return;

  const claimStatus = getClaimStatus();
  if (!claimStatus) {
    showToast('Checking claim access...');
    ensureClaimStatusLoaded();
    return;
  }

  if (!claimStatus.canClaim) {
    showToast(getClaimFailureMessage(claimStatus.reason, claimStatus.nextAvailable, 'Claim unavailable right now.'));
    return;
  }

  const confirmed = await showPackClaimConfirmModal(product.name, claimStatus.reason);
  if (!confirmed) return;

  showToast('Adding collection to My Collection...');

  try {
    const sb = getSupabase();
    const { data: { session } } = await sb.auth.getSession();
    const token = session?.access_token;
    if (!token) throw new Error('Session expired. Please sign in again.');

    let res = await requestPackClaimWithToken(token, product.id);
    if (res.status === 401) {
      await sb.auth.refreshSession();
      const { data: { session: retrySession } } = await sb.auth.getSession();
      const retryToken = retrySession?.access_token;
      if (retryToken) {
        res = await requestPackClaimWithToken(retryToken, product.id);
      }
    }

    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(getClaimFailureMessage(payload.reason, payload.nextAvailable, payload.error));
    }

    showToast(`Added "${product.name}" to My Collection.`);
    invalidateClaimStatus();
    if (packCatalogNotice?.kind === 'pro-monthly') {
      packCatalogNotice = null;
    }

    await Promise.all([
      ensureUserPurchasesLoaded({ force: true, rerender: false }),
      fetchClaimStatus({ force: true }),
    ]);
    rerenderCollectionSurfaceForCurrentView();
  } catch (err) {
    showToast(err.message || 'Failed to add collection. Please try again.');
    console.error('[Store] Collection claim error:', err);
    invalidateClaimStatus();
    void Promise.all([
      ensureUserPurchasesLoaded({ force: true, rerender: false }),
      fetchClaimStatus(),
    ]).then(() => {
      rerenderCollectionSurfaceForCurrentView();
    });
  }
}

// ── Purchase Flow ─────────────────────────────────────────────
async function handlePurchase(product) {
  if (!isLoggedIn()) {
    promptForAuth('purchase', {
      view: currentView,
      productId: product?.id,
      productSlug: product?.slug,
    });
    showToast('Sign in to continue your purchase');
    return;
  }

  showToast('Redirecting to checkout...');

  try {
    const sb = getSupabase();
    const { data: { session } } = await sb.auth.getSession();
    const token = session?.access_token;

    const res = await fetch(`${SUPABASE_URL}/functions/v1/create-checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'apikey': SUPABASE_ANON,
      },
      body: JSON.stringify({
        product_id: product.id,
        price_id: product.stripe_price_id,
        success_url: `${window.location.origin}?purchase=success&product_id=${encodeURIComponent(product.id)}`,
        cancel_url: `${window.location.origin}?purchase=canceled`,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Checkout failed');
    }

    const { url } = await res.json();
    if (url) window.location.href = url;
  } catch (err) {
    showToast(err.message || 'Payment error. Please try again.');
    console.error('[Store] Checkout error:', err);
  }
}

// ── Download Flow ─────────────────────────────────────────────


// ── Listeners ─────────────────────────────────────────────────
function wireStoreListeners() {
  // Browse Collections sidebar item
  const packsBtn = document.getElementById('sidebarAnimatedPacks');
  if (packsBtn) {
    packsBtn.addEventListener('click', () => switchView('packs'));
  }

  // My Collection sidebar item
  const downloadsBtn = document.getElementById('sidebarMyDownloads');
  if (downloadsBtn) {
    downloadsBtn.addEventListener('click', async () => {
      await ensureUserPurchasesLoaded({ force: true, rerender: false });
      switchView('downloads');
    });
  }

  // Pricing sidebar item
  const pricingBtn = document.getElementById('sidebarPricing');
  if (pricingBtn) {
    pricingBtn.addEventListener('click', () => switchView('pricing'));
  }

  // Motion Lab sidebar item
  const motionLabBtn = document.getElementById('sidebarMotionLab');
  if (motionLabBtn) {
    motionLabBtn.addEventListener('click', () => switchView('motion-lab'));
  }

  // Converter sidebar item
  const converterBtn = document.getElementById('sidebarConverter');
  if (converterBtn) {
    converterBtn.addEventListener('click', () => switchView('converter'));
  }

  // My Purchases from avatar dropdown
  const purchasesBtn = document.getElementById('authMyPurchases');
  if (purchasesBtn) {
    purchasesBtn.addEventListener('click', async () => {
      document.getElementById('authDropdown')?.classList.remove('open');
      await ensureUserPurchasesLoaded({ force: true, rerender: false });
      switchView('dashboard');
    });
  }

  const apiKeysBtn = document.getElementById('authApiKeysBtn');
  if (apiKeysBtn) {
    apiKeysBtn.addEventListener('click', async () => {
      document.getElementById('authDropdown')?.classList.remove('open');
      await ensureUserPurchasesLoaded({ force: true, rerender: false });
      switchView('api-keys');
    });
  }

  // Check for purchase success/cancel URL params
  const params = new URLSearchParams(window.location.search);
  const purchaseProductId = params.get('product_id');
  const subscriptionPlan = params.get('subscription_plan');
  if (params.get('purchase') === 'success') {
    // Clean URL immediately
    window.history.replaceState({}, '', window.location.pathname);
    // Refresh purchases and route to the right post-checkout experience
    handlePurchaseSuccess(purchaseProductId, subscriptionPlan);
  } else if (params.get('purchase') === 'canceled') {
    showToast('Payment was not completed. Try again.');
    window.history.replaceState({}, '', window.location.pathname);
  }

  if (syncViewFromLocation({ historyMode: 'replace' })) {
    return;
  }
}

async function handlePurchaseSuccess(expectedProductId = null, subscriptionPlan = null) {
  // Wait for webhook to process, then fetch purchases.
  let retries = 0;
  const maxRetries = 6;
  const baselineCount = userPurchases.length;
  const expectsAnnualGrant = subscriptionPlan === 'annual';
  while (retries < maxRetries) {
    await new Promise(r => setTimeout(r, 1200));
    await ensureUserPurchasesLoaded({ force: true, rerender: false });
    if (!expectedProductId && !expectsAnnualGrant) break;
    if (expectsAnnualGrant && userPurchases.length > baselineCount) break;
    if (expectedProductId === 'launch_edition' && userPurchases.length > baselineCount) break;
    const foundExpected = userPurchases.some(p => p.product_id === expectedProductId);
    if (foundExpected) break;
    retries++;
  }
  await fetchClaimStatus({ force: true }).catch(() => {});

  if (subscriptionPlan) {
    const isAnnual = subscriptionPlan === 'annual';
    packCatalogNotice = isAnnual
      ? {
        kind: 'pro-annual',
        title: 'Welcome to Pro Annual',
        description: 'All 8 launch collections are now in your library. Browse the packs or open My Collection to start using them.',
        actionLabel: 'Open My Collection',
      }
      : {
        kind: 'pro-monthly',
        title: 'Welcome to Pro Monthly',
        description: 'Your first Pro claim is ready. Pick a premium collection below and redeem it now to add it to My Collection.',
        actionLabel: 'Redeem a collection',
      };
    showToast(isAnnual ? 'Pro Annual is active. Your collections are ready.' : 'Welcome to Pro. Redeem your first collection now.');
    switchView('packs');
    return;
  }

  packCatalogNotice = null;
  // Navigate to My Collection
  showToast('Purchase successful! Opening your collection...');
  switchView('downloads');
}

// ── Motion Lab ────────────────────────────────────────────────
// State
const motionLab = {
  svg: null,
  svgText: '',
  elements: [],
  selectedIds: new Set(),
  tracks: {},
  playback: { mode: 'hover', speed: 1, duration: 500 },
  isStopped: false,
  previewSize: 48,
  fillColor: null,
  strokeColor: null,
  assetProfile: null,
  controlsWired: false,   // guard against listener stacking on reload
  panelIndex: 0,
  panelTimer: null,
  panelPaused: false,
  panelTransitionTimer: null,
};

const MOTION_LAB_ROTATING_PANEL_ITEMS = [
  {
    title: 'Preview instantly',
    body: 'Click or hover an animation button to preview it.'
  },
  {
    title: 'Adjust the icon',
    body: 'Use Fill, Stroke, Size, Rotate, and Fade on the right.'
  },
  {
    title: 'Choose playback',
    body: 'Loop, Hover, and Click control how your export will play.'
  },
  {
    title: 'Export when ready',
    body: 'Download SVG or copy CSS once the motion looks right.'
  },
  {
    title: 'Reset anytime',
    body: 'Use the reset icons to restore a control to its default value.'
  },
  {
    title: 'Test colors',
    body: 'Not every icon supports both Fill and Stroke, so try them and see what works best.'
  }
];

function motionLabPrefersReducedMotion() {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function stopMotionLabRotatingPanel() {
  if (motionLab.panelTimer) {
    window.clearInterval(motionLab.panelTimer);
    motionLab.panelTimer = null;
  }
  clearMotionLabRotatingPanelTransition();
}

function clearMotionLabRotatingPanelTransition() {
  if (motionLab.panelTransitionTimer) {
    window.clearTimeout(motionLab.panelTransitionTimer);
    motionLab.panelTransitionTimer = null;
  }
}

function renderMotionLabRotatingPanel(index = motionLab.panelIndex) {
  const panelTitle = document.getElementById('mlRotatingPanelTitle');
  const panelCopy = document.getElementById('mlRotatingPanelCopy');
  const panelDots = document.getElementById('mlRotatingPanelDots');
  if (!panelTitle || !panelCopy || !panelDots || !MOTION_LAB_ROTATING_PANEL_ITEMS.length) return;

  const normalizedIndex = ((index % MOTION_LAB_ROTATING_PANEL_ITEMS.length) + MOTION_LAB_ROTATING_PANEL_ITEMS.length) % MOTION_LAB_ROTATING_PANEL_ITEMS.length;
  const item = MOTION_LAB_ROTATING_PANEL_ITEMS[normalizedIndex];
  motionLab.panelIndex = normalizedIndex;
  panelTitle.textContent = item.title;
  panelCopy.textContent = item.body;
  panelDots.querySelectorAll('.ml__rotating-panel-dot').forEach((dot, dotIndex) => {
    const isActive = dotIndex === normalizedIndex;
    dot.classList.toggle('active', isActive);
    dot.setAttribute('aria-current', isActive ? 'true' : 'false');
  });
}

function isMotionLabRotatingPanelPaused() {
  const panel = document.getElementById('mlRotatingPanel');
  return !!panel && (motionLab.panelPaused || panel.matches(':hover') || panel.matches(':focus-within'));
}

function setMotionLabRotatingPanelIndex(nextIndex, { animate = true, ignorePause = false } = {}) {
  const panelCard = document.getElementById('mlRotatingPanelCard');
  const normalizedIndex = ((nextIndex % MOTION_LAB_ROTATING_PANEL_ITEMS.length) + MOTION_LAB_ROTATING_PANEL_ITEMS.length) % MOTION_LAB_ROTATING_PANEL_ITEMS.length;
  const shouldAnimate = animate && panelCard && !motionLabPrefersReducedMotion();

  clearMotionLabRotatingPanelTransition();

  if (!shouldAnimate) {
    renderMotionLabRotatingPanel(normalizedIndex);
    return;
  }

  panelCard.classList.remove('is-entering');
  panelCard.classList.add('is-leaving');

  motionLab.panelTransitionTimer = window.setTimeout(() => {
    if (!ignorePause && isMotionLabRotatingPanelPaused()) {
      panelCard.classList.remove('is-leaving');
      motionLab.panelTransitionTimer = null;
      return;
    }
    renderMotionLabRotatingPanel(normalizedIndex);
    panelCard.classList.remove('is-leaving');
    panelCard.classList.add('is-entering');
    motionLab.panelTransitionTimer = window.setTimeout(() => {
      panelCard.classList.remove('is-entering');
      motionLab.panelTransitionTimer = null;
    }, 380);
  }, 180);
}

function startMotionLabRotatingPanelTimer() {
  if (motionLab.panelTimer) {
    window.clearInterval(motionLab.panelTimer);
    motionLab.panelTimer = null;
  }

  if (motionLabPrefersReducedMotion() || MOTION_LAB_ROTATING_PANEL_ITEMS.length < 2) return;

  motionLab.panelTimer = window.setInterval(() => {
    if (!document.getElementById('motionLabView')) {
      stopMotionLabRotatingPanel();
      return;
    }
    if (isMotionLabRotatingPanelPaused()) return;
    setMotionLabRotatingPanelIndex(motionLab.panelIndex + 1);
  }, 7000);
}

function initMotionLabRotatingPanel() {
  const panel = document.getElementById('mlRotatingPanel');
  if (!panel) return;
  const panelCard = document.getElementById('mlRotatingPanelCard');
  const panelDots = document.getElementById('mlRotatingPanelDots');

  stopMotionLabRotatingPanel();
  motionLab.panelPaused = false;
  renderMotionLabRotatingPanel(motionLab.panelIndex);

  const setPanelPaused = (paused) => {
    motionLab.panelPaused = paused;
    if (!paused) return;
    clearMotionLabRotatingPanelTransition();
    panelCard?.classList.remove('is-leaving', 'is-entering');
  };

  panel.addEventListener('mouseenter', () => { setPanelPaused(true); });
  panel.addEventListener('mouseleave', () => { setPanelPaused(false); });
  panel.addEventListener('focusin', () => { setPanelPaused(true); });
  panel.addEventListener('focusout', () => { setPanelPaused(false); });

  panelDots?.addEventListener('mousedown', (event) => {
    const dot = event.target.closest('.ml__rotating-panel-dot');
    if (!dot) return;
    event.preventDefault();
  });

  panelDots?.addEventListener('click', (event) => {
    const dot = event.target.closest('.ml__rotating-panel-dot');
    if (!dot) return;
    const nextIndex = Number.parseInt(dot.dataset.tipIndex || '', 10);
    if (!Number.isFinite(nextIndex)) return;
    clearMotionLabRotatingPanelTransition();
    panelCard?.classList.remove('is-leaving', 'is-entering');
    setMotionLabRotatingPanelIndex(nextIndex, { ignorePause: true });
    startMotionLabRotatingPanelTimer();
  });

  startMotionLabRotatingPanelTimer();
}

function renderMotionLab() {
  stopMotionLabRotatingPanel();
  motionLab.panelIndex = 0;
  motionLab.panelPaused = false;
  removePackCatalog(); // clears all competing views (motionLabView, converterView, pricingView, etc.)

  const gridArea = document.getElementById('gridArea');
  if (!gridArea) return;

  const view = document.createElement('div');
  view.id = 'motionLabView';
  view.className = 'ml';

  view.innerHTML = `
    <div class="ml__workspace">

      <!-- Left: Canvas + Stage + Bottom bar -->
      <div class="ml__center-col">

        <!-- Canvas area: drop zone or stage -->
        <div class="ml__canvas-wrap" id="mlCanvasWrap">
          <div class="ml__drop-zone" id="mlDropZone">
            <span class="material-symbols-outlined" style="font-size:40px;color:var(--si-text-dim)">animation</span>
            <p class="ml__drop-text">Drop an SVG, paste code, or pick from library</p>
            <div class="ml__drop-actions">
              <button class="ml__drop-btn" id="mlFileBtn">
                <span class="material-symbols-outlined" style="font-size:15px">upload_file</span> Upload
              </button>
              <button class="ml__drop-btn" id="mlPasteBtn">
                <span class="material-symbols-outlined" style="font-size:15px">content_paste</span> Paste
              </button>
              <button class="ml__drop-btn" id="mlLibraryBtn">
                <span class="material-symbols-outlined" style="font-size:15px">grid_view</span> Library
              </button>
            </div>
            <input type="file" id="mlFileInput" accept=".svg" style="display:none">
          </div>

          <!-- 4-Quadrant Stage (hidden until SVG loads) -->
          <div class="ml__stage" id="mlStage" style="display:none">

            <!-- Quadrant A: top - Motion -->
            <div class="ml__quad ml__quad--top" data-quad="motion">
              <span class="ml__quad-label">Motion</span>
              <div class="ml__quad-btns" id="mlControlBar">
                <button class="ml__preset-btn" data-preset="bounce">
                  <span class="material-symbols-outlined" style="font-size:13px">arrow_upward</span> Bounce
                </button>
                <button class="ml__preset-btn" data-preset="float">
                  <span class="material-symbols-outlined" style="font-size:13px">cloud</span> Float
                </button>
                <button class="ml__preset-btn" data-preset="shake">
                  <span class="material-symbols-outlined" style="font-size:13px">vibration</span> Shake
                </button>
                <button class="ml__preset-btn" data-preset="spin">
                  <span class="material-symbols-outlined" style="font-size:13px">rotate_right</span> Spin
                </button>
                <button class="ml__preset-btn" data-preset="pulse">
                  <span class="material-symbols-outlined" style="font-size:13px">radio_button_checked</span> Pulse
                </button>
                <button class="ml__preset-btn" data-preset="pop">
                  <span class="material-symbols-outlined" style="font-size:13px">open_in_full</span> Pop
                </button>
                <button class="ml__preset-btn" data-preset="heartbeat">
                  <span class="material-symbols-outlined" style="font-size:13px">favorite</span> Heartbeat
                </button>
                <button class="ml__preset-btn" data-preset="rubberband">
                  <span class="material-symbols-outlined" style="font-size:13px">straighten</span> Rubber Band
                </button>
                <button class="ml__preset-btn" data-preset="jelly">
                  <span class="material-symbols-outlined" style="font-size:13px">water_drop</span> Jelly
                </button>
                <button class="ml__preset-btn" data-preset="ring">
                  <span class="material-symbols-outlined" style="font-size:13px">notifications</span> Ring
                </button>
                <button class="ml__preset-btn" data-preset="wobble">
                  <span class="material-symbols-outlined" style="font-size:13px">tsunami</span> Wobble
                </button>
                <button class="ml__preset-btn" data-preset="magnetic">
                  <span class="material-symbols-outlined" style="font-size:13px">attractions</span> Magnetic
                </button>
                <button class="ml__preset-btn" data-preset="recoil">
                  <span class="material-symbols-outlined" style="font-size:13px">electric_bolt</span> Recoil
                </button>
                <button class="ml__preset-btn" data-preset="pendulum">
                  <span class="material-symbols-outlined" style="font-size:13px">swap_horiz</span> Pendulum
                </button>
                <button class="ml__preset-btn" data-preset="whiplash">
                  <span class="material-symbols-outlined" style="font-size:13px">crop_rotate</span> Whiplash
                </button>
                <button class="ml__preset-btn" data-preset="tremor">
                  <span class="material-symbols-outlined" style="font-size:13px">earthquake</span> Tremor
                </button>
                <button class="ml__preset-btn" data-preset="neonglow">
                  <span class="material-symbols-outlined" style="font-size:13px">flare</span> Neon Glow
                </button>
                <button class="ml__preset-btn" data-preset="breathe">
                  <span class="material-symbols-outlined" style="font-size:13px">spa</span> Breathe
                </button>
                <button class="ml__preset-btn" data-preset="metronome">
                  <span class="material-symbols-outlined" style="font-size:13px">timer</span> Metronome
                </button>
                <button class="ml__preset-btn" data-preset="orbit">
                  <span class="material-symbols-outlined" style="font-size:13px">motion_photos_on</span> Orbit
                </button>
                <button class="ml__preset-btn" data-preset="flicker">
                  <span class="material-symbols-outlined" style="font-size:13px">fluorescent</span> Flicker
                </button>
                <button class="ml__preset-btn" data-preset="squish">
                  <span class="material-symbols-outlined" style="font-size:13px">compress</span> Squish
                </button>
                <button class="ml__preset-btn" data-preset="glide">
                  <span class="material-symbols-outlined" style="font-size:13px">air</span> Glide
                </button>
                <button class="ml__preset-btn" data-preset="radar">
                  <span class="material-symbols-outlined" style="font-size:13px">radar</span> Radar
                </button>
                <button class="ml__preset-btn" data-preset="beacon">
                  <span class="material-symbols-outlined" style="font-size:13px">wifi_tethering</span> Beacon
                </button>
              </div>
            </div>

            <!-- Quadrant B: left - Entrances -->
            <div class="ml__quad ml__quad--left" data-quad="entrances">
              <span class="ml__quad-label">Entrances</span>
              <div class="ml__quad-btns">
                <button class="ml__preset-btn" data-preset="magneticIn">
                  <span class="material-symbols-outlined" style="font-size:13px">attractions</span> Magnetic In
                </button>
                <button class="ml__preset-btn" data-preset="fadeIn">
                  <span class="material-symbols-outlined" style="font-size:13px">gradient</span> Fade In
                </button>
                <button class="ml__preset-btn" data-preset="scaleUp">
                  <span class="material-symbols-outlined" style="font-size:13px">zoom_in</span> Scale Up
                </button>
                <button class="ml__preset-btn" data-preset="slideUp">
                  <span class="material-symbols-outlined" style="font-size:13px">arrow_upward</span> Slide Up
                </button>
                <button class="ml__preset-btn" data-preset="springLand">
                  <span class="material-symbols-outlined" style="font-size:13px">downloading</span> Spring Land
                </button>
                <button class="ml__preset-btn" data-preset="slingshot">
                  <span class="material-symbols-outlined" style="font-size:13px">swipe_right_alt</span> Slingshot
                </button>
                <button class="ml__preset-btn" data-preset="glitchOn">
                  <span class="material-symbols-outlined" style="font-size:13px">flash_on</span> Glitch On
                </button>
                <button class="ml__preset-btn" data-preset="unfold">
                  <span class="material-symbols-outlined" style="font-size:13px">unfold_more</span> Unfold
                </button>
                <button class="ml__preset-btn" data-preset="warpIn">
                  <span class="material-symbols-outlined" style="font-size:13px">blur_on</span> Warp In
                </button>
                <button class="ml__preset-btn" data-preset="slideRight">
                  <span class="material-symbols-outlined" style="font-size:13px">arrow_forward</span> Slide Right
                </button>
                <button class="ml__preset-btn" data-preset="slideDown">
                  <span class="material-symbols-outlined" style="font-size:13px">arrow_downward</span> Slide Down
                </button>
                <button class="ml__preset-btn" data-preset="flipIn">
                  <span class="material-symbols-outlined" style="font-size:13px">flip</span> Flip In
                </button>
                <button class="ml__preset-btn" data-preset="telegram">
                  <span class="material-symbols-outlined" style="font-size:13px">send</span> Telegram
                </button>
                <button class="ml__preset-btn" data-preset="bloom">
                  <span class="material-symbols-outlined" style="font-size:13px">filter_vintage</span> Bloom
                </button>
                <button class="ml__preset-btn" data-preset="shockwave">
                  <span class="material-symbols-outlined" style="font-size:13px">radio_button_checked</span> Shockwave
                </button>
              </div>
            </div>

            <!-- Icon preview (center) -->
            <div class="ml__preview" id="mlPreview"></div>

            <!-- Quadrant C: right - Exits -->
            <div class="ml__quad ml__quad--right" data-quad="exits">
              <span class="ml__quad-label">Exits</span>
              <div class="ml__quad-btns">
                <button class="ml__preset-btn" data-preset="fadeOut">
                  <span class="material-symbols-outlined" style="font-size:13px">gradient</span> Fade Out
                </button>
                <button class="ml__preset-btn" data-preset="scaleDown">
                  <span class="material-symbols-outlined" style="font-size:13px">zoom_out</span> Scale Down
                </button>
                <button class="ml__preset-btn" data-preset="slideOut">
                  <span class="material-symbols-outlined" style="font-size:13px">arrow_upward</span> Slide Out
                </button>
                <button class="ml__preset-btn" data-preset="vortex">
                  <span class="material-symbols-outlined" style="font-size:13px">cyclone</span> Vortex
                </button>
                <button class="ml__preset-btn" data-preset="glitchOff">
                  <span class="material-symbols-outlined" style="font-size:13px">flash_off</span> Glitch Off
                </button>
                <button class="ml__preset-btn" data-preset="dissolve">
                  <span class="material-symbols-outlined" style="font-size:13px">blur_on</span> Dissolve
                </button>
                <button class="ml__preset-btn" data-preset="popOut">
                  <span class="material-symbols-outlined" style="font-size:13px">close_fullscreen</span> Pop Out
                </button>
                <button class="ml__preset-btn" data-preset="slideLeft">
                  <span class="material-symbols-outlined" style="font-size:13px">arrow_back</span> Slide Left
                </button>
                <button class="ml__preset-btn" data-preset="sinkDown">
                  <span class="material-symbols-outlined" style="font-size:13px">download</span> Sink Down
                </button>
                <button class="ml__preset-btn" data-preset="flipOut">
                  <span class="material-symbols-outlined" style="font-size:13px">flip</span> Flip Out
                </button>
                <button class="ml__preset-btn" data-preset="implode">
                  <span class="material-symbols-outlined" style="font-size:13px">compress</span> Implode
                </button>
                <button class="ml__preset-btn" data-preset="puffOut">
                  <span class="material-symbols-outlined" style="font-size:13px">cloud_queue</span> Puff Out
                </button>
                <button class="ml__preset-btn" data-preset="launchOut">
                  <span class="material-symbols-outlined" style="font-size:13px">rocket_launch</span> Launch Out
                </button>
                <button class="ml__preset-btn" data-preset="shrinkSpin">
                  <span class="material-symbols-outlined" style="font-size:13px">autorenew</span> Shrink Spin
                </button>
                <button class="ml__preset-btn" data-preset="blinkOut">
                  <span class="material-symbols-outlined" style="font-size:13px">flash_off</span> Blink Out
                </button>
              </div>
            </div>

            <!-- Quadrant D: bottom - Special -->
            <div class="ml__quad ml__quad--bottom" data-quad="saved">
              <span class="ml__quad-label">Special</span>
              <div class="ml__quad-btns" id="mlSavedBtns">
                <button class="ml__preset-btn" data-preset="sparkle">
                  <span class="material-symbols-outlined" style="font-size:13px">auto_awesome</span> Sparkle
                </button>
                <button class="ml__preset-btn" data-preset="swing">
                  <span class="material-symbols-outlined" style="font-size:13px">sync_alt</span> Swing
                </button>
                <button class="ml__preset-btn" data-preset="jitter">
                  <span class="material-symbols-outlined" style="font-size:13px">electric_bolt</span> Jitter
                </button>
                <button class="ml__preset-btn" data-preset="chase">
                  <span class="material-symbols-outlined" style="font-size:13px">track_changes</span> Chase
                </button>
                <button class="ml__preset-btn" data-preset="stream">
                  <span class="material-symbols-outlined" style="font-size:13px">view_stream</span> Stream
                </button>
                <button class="ml__preset-btn" data-preset="trace">
                  <span class="material-symbols-outlined" style="font-size:13px">draw</span> Trace
                </button>
                <button class="ml__preset-btn" data-preset="flow">
                  <span class="material-symbols-outlined" style="font-size:13px">schema</span> Flow
                </button>
                <button class="ml__preset-btn" data-preset="converge">
                  <span class="material-symbols-outlined" style="font-size:13px">center_focus_strong</span> Converge
                </button>
                <button class="ml__preset-btn" data-preset="cube">
                  <span class="material-symbols-outlined" style="font-size:13px">view_in_ar</span> Cube
                </button>
                <button class="ml__preset-btn" data-preset="typing">
                  <span class="material-symbols-outlined" style="font-size:13px">keyboard</span> Typing
                </button>
                <button class="ml__preset-btn" data-preset="reason">
                  <span class="material-symbols-outlined" style="font-size:13px">account_tree</span> Reason
                </button>
                <button class="ml__preset-btn" data-preset="sweep">
                  <span class="material-symbols-outlined" style="font-size:13px">pie_chart</span> Sweep
                </button>
                <button class="ml__preset-btn" data-preset="scatter">
                  <span class="material-symbols-outlined" style="font-size:13px">scatter_plot</span> Scatter
                </button>
                <button class="ml__preset-btn" data-preset="crest">
                  <span class="material-symbols-outlined" style="font-size:13px">equalizer</span> Crest
                </button>
                <button class="ml__preset-btn" data-preset="tap">
                  <span class="material-symbols-outlined" style="font-size:13px">contactless</span> Tap
                </button>
                <button class="ml__preset-btn" data-preset="shuffle">
                  <span class="material-symbols-outlined" style="font-size:13px">shuffle</span> Shuffle
                </button>
                <button class="ml__preset-btn" data-preset="infinity">
                  <span class="material-symbols-outlined" style="font-size:13px">all_inclusive</span> Infinity
                </button>
                <button class="ml__preset-btn" data-preset="spatial">
                  <span class="material-symbols-outlined" style="font-size:13px">motion_photos_on</span> Spatial
                </button>
                <button class="ml__preset-btn" data-preset="pageFlip">
                  <span class="material-symbols-outlined" style="font-size:13px">flip</span> Page Flip
                </button>
                <button class="ml__preset-btn" data-preset="bookOpen">
                  <span class="material-symbols-outlined" style="font-size:13px">auto_stories</span> Book Open
                </button>
                <button class="ml__preset-btn" data-preset="domino">
                  <span class="material-symbols-outlined" style="font-size:13px">splitscreen</span> Domino
                </button>
                <button class="ml__preset-btn" data-preset="supernova">
                  <span class="material-symbols-outlined" style="font-size:13px">flare</span> Supernova
                </button>
                <button class="ml__preset-btn" data-preset="blackHole">
                  <span class="material-symbols-outlined" style="font-size:13px">blur_circular</span> Black Hole
                </button>
                <button class="ml__preset-btn" data-preset="fingerprint">
                  <span class="material-symbols-outlined" style="font-size:13px">fingerprint</span> Fingerprint
                </button>
                <button class="ml__preset-btn" data-preset="badgeTap">
                  <span class="material-symbols-outlined" style="font-size:13px">badge</span> Badge Tap
                </button>
              </div>
            </div>

          </div>
        </div>

        <!-- Bottom bar (visible after SVG load) -->
        <div class="ml__bottom-bar" id="mlBottomBar" style="display:none">
          <!-- Row 1: Size selector + Playback controls -->
          <div class="ml__size-strip" id="mlSizeStrip">
            <span class="ml__size-label">Size (px)</span>
            <button class="ml__size-btn" data-size="24">24</button>
            <button class="ml__size-btn ml__size-btn--active" data-size="48">48</button>
            <button class="ml__size-btn" data-size="64">64</button>
            <button class="ml__size-btn" data-size="96">96</button>
            <button class="ml__size-btn" data-size="128">128</button>
            <span class="ml__bar-divider"></span>
            <button class="ml__reset-anim-btn" id="mlResetAnimBtn" data-tip="Reset animation">
              <span class="material-symbols-outlined" style="font-size:16px">restart_alt</span>
            </button>
            <button class="ml__play-btn" id="mlPlayBtn" data-tip="Click or hover an animation button to preview it.">
              <span class="material-symbols-outlined" style="font-size:16px">stop</span>
            </button>
          </div>
          <!-- Row 2: Export trigger + Download/Copy -->
          <div class="ml__export-bar">
            <div class="ml__trigger-group">
              <span class="ml__trigger-info" data-tip="${EXPORT_TRIGGER_TOOLTIP_COPY}"><span class="material-symbols-outlined" style="font-size:12px">info</span></span>
              <label class="ml__trigger-opt"><input type="radio" name="mlTrigger" value="loop" checked> Loop</label>
              <label class="ml__trigger-opt"><input type="radio" name="mlTrigger" value="hover"> Hover</label>
              <label class="ml__trigger-opt"><input type="radio" name="mlTrigger" value="click"> Click</label>
            </div>
            <span class="ml__bar-divider"></span>
            <button class="ml__action-btn" id="mlDownloadBtn">
              <span class="material-symbols-outlined" style="font-size:14px">download</span> Download SVG
            </button>
            <button class="ml__action-btn" id="mlExportBtn">
              <span class="material-symbols-outlined" style="font-size:14px">content_copy</span> Copy CSS
            </button>
          </div>

          <div class="ml__rotating-panel" id="mlRotatingPanel">
            <div class="ml__rotating-panel-head">
              <span class="material-symbols-outlined" style="font-size:14px;color:var(--si-primary)">tips_and_updates</span>
              <span class="ml__rotating-panel-label">Quick Tips</span>
            </div>
            <div class="ml__rotating-panel-card" id="mlRotatingPanelCard">
              <div class="ml__rotating-panel-title" id="mlRotatingPanelTitle">${MOTION_LAB_ROTATING_PANEL_ITEMS[0].title}</div>
              <p class="ml__rotating-panel-copy" id="mlRotatingPanelCopy">${MOTION_LAB_ROTATING_PANEL_ITEMS[0].body}</p>
            </div>
            <div class="ml__rotating-panel-dots" id="mlRotatingPanelDots">
              ${MOTION_LAB_ROTATING_PANEL_ITEMS.map((_, index) => `
                <button
                  type="button"
                  class="ml__rotating-panel-dot${index === 0 ? ' active' : ''}"
                  data-tip-index="${index}"
                  aria-label="Show tip ${index + 1}"
                  aria-current="${index === 0 ? 'true' : 'false'}"
                ></button>
              `).join('')}
            </div>
          </div>
        </div>

      </div>

      <!-- Right: Properties + Playback -->
      <div class="ml__props-panel" id="mlPropsPanel">
        <div class="ml__panel-header">
          <span>Properties</span>
          <button class="ml__reset-btn" id="mlClearBtn" data-tip="Clear All">
            <span class="material-symbols-outlined" style="font-size:15px">restart_alt</span>
          </button>
        </div>

        <!-- Properties: Scale, Rotate, Opacity -->
        <div class="ml__props-empty" id="mlPropsContent">
          <span class="material-symbols-outlined" style="font-size:32px;color:var(--si-text-dim)">touch_app</span>
          <p>Select an element to edit</p>
        </div>

        <!-- Playback: Intensity, Speed (visible after SVG load) -->
        <div class="ml__playback-section" id="mlPlaybackSection" style="display:none">
          <div class="ml__section-title">Playback</div>
          <div class="ml__slider-row">
            <span class="ml__slider-label">Intensity</span>
            <input type="range" class="ml__prop-range" id="mlIntensity" min="10" max="200" step="5" value="100">
            <span class="ml__prop-val" id="mlIntensityVal">100%</span>
            <button class="ml__ctrl-reset" id="mlIntensityReset" data-tip="Reset">
              <span class="material-symbols-outlined" style="font-size:13px">restart_alt</span>
            </button>
          </div>
          <div class="ml__slider-row">
            <span class="ml__slider-label">Speed</span>
            <input type="range" class="ml__prop-range" id="mlSpeed" min="100" max="2000" step="50" value="500">
            <span class="ml__prop-val" id="mlSpeedVal">500ms</span>
            <button class="ml__ctrl-reset" id="mlSpeedReset" data-tip="Reset">
              <span class="material-symbols-outlined" style="font-size:13px">restart_alt</span>
            </button>
          </div>
        </div>
      </div>

    </div>

    <div class="desktop-tool-glimpse desktop-tool-glimpse--motionlab" id="mlMobileGlimpse">
      <div class="desktop-tool-glimpse__card" role="note" aria-label="Motion Lab mobile notice">
        <div class="desktop-tool-glimpse__eyebrow">Desktop-first tool</div>
        <h3 class="desktop-tool-glimpse__title">Motion Lab is optimized for desktop</h3>
        <p class="desktop-tool-glimpse__copy">Preview the workspace here, then open Supericons on a larger screen to animate and export with the full editor.</p>
        <p class="desktop-tool-glimpse__hint">This mobile view is read-only so you can get a feel for the interface without fighting the controls.</p>
        <div class="desktop-tool-glimpse__actions">
          <button type="button" class="desktop-tool-glimpse__btn desktop-tool-glimpse__btn--ghost" id="mlMobileBackBtn">Back to icons</button>
          <button type="button" class="desktop-tool-glimpse__btn" id="mlMobilePricingBtn">See pricing</button>
        </div>
      </div>
    </div>
  `;




  gridArea.appendChild(view);
  document.getElementById('mlMobileBackBtn')?.addEventListener('click', () => {
    stopMotionLabRotatingPanel();
    switchView('icons');
  });
  document.getElementById('mlMobilePricingBtn')?.addEventListener('click', () => {
    stopMotionLabRotatingPanel();
    switchView('pricing');
  });
  initMotionLabRotatingPanel();

  // Wire up SVG loading
  initMotionLabLoading();

  // Rehydrate state if SVG was previously loaded
  if (motionLab.svgText) {
    loadSvgIntoMotionLab(motionLab.svgText);
  }
}

function initMotionLabLoading() {
  const dropZone = document.getElementById('mlDropZone');
  const fileInput = document.getElementById('mlFileInput');
  const fileBtn = document.getElementById('mlFileBtn');
  const pasteBtn = document.getElementById('mlPasteBtn');
  const clearBtn = document.getElementById('mlClearBtn');

  if (!dropZone) return;

  // Library button - navigate back to icon grid
  const libBtn = document.getElementById('mlLibraryBtn');
  libBtn?.addEventListener('click', () => {
    stopMotionLabRotatingPanel();
    switchView('browse');
  });

  // File button
  fileBtn?.addEventListener('click', () => fileInput?.click());
  fileInput?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (file && file.name.endsWith('.svg')) {
      file.text().then(text => loadSvgIntoMotionLab(text));
    }
  });

  // Drag and drop
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('ml__drop-zone--active');
  });
  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('ml__drop-zone--active');
  });
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('ml__drop-zone--active');
    const file = e.dataTransfer?.files?.[0];
    if (file && file.name.endsWith('.svg')) {
      file.text().then(text => loadSvgIntoMotionLab(text));
    }
  });

  // Paste button (reads clipboard directly, like converter)
  pasteBtn?.addEventListener('click', async () => {
    try {
      const raw = await navigator.clipboard.readText();
      if (!raw || !raw.trim()) {
        showToast('Clipboard is empty. Copy an SVG first.');
        return;
      }
      let text = raw.trim();
      // Strip XML prolog if present (<?xml ... ?>)
      text = text.replace(/^<\?xml[^?]*\?>\s*/i, '');
      // Strip <!DOCTYPE> if present
      text = text.replace(/^<!DOCTYPE[^>]*>\s*/i, '');
      if (text.startsWith('<svg')) {
        loadSvgIntoMotionLab(text);
      } else {
        showToast('No SVG found in clipboard. Content must start with <svg>.');
      }
    } catch (err) {
      // Clipboard API requires secure context or user gesture
      showToast('Clipboard access denied. Try copying SVG code and clicking again.');
    }
  });

  // Clear button - reset all state and restore drop zone
  clearBtn?.addEventListener('click', () => {
    motionLab.svg = null;
    motionLab.svgText = '';
    motionLab.elements = [];
    motionLab.selectedIds.clear();
    motionLab.intensity = 100;
    motionLab.playback.mode = 'loop';
    motionLab.assetProfile = null;
    motionLab.controlsWired = false;

    const dropZone = document.getElementById('mlDropZone');
    const stage = document.getElementById('mlStage');
    const bottomBar = document.getElementById('mlBottomBar');
    const playbackSection = document.getElementById('mlPlaybackSection');
    const propsContent = document.getElementById('mlPropsContent');
    const intensitySlider = document.getElementById('mlIntensity');
    const speedSlider = document.getElementById('mlSpeed');

    if (dropZone) dropZone.style.display = '';
    if (stage) stage.style.display = 'none';
    if (bottomBar) bottomBar.style.display = 'none';
    if (playbackSection) playbackSection.style.display = 'none';
    if (intensitySlider) intensitySlider.value = 100;
    if (speedSlider) speedSlider.value = 500;
    const intensityVal = document.getElementById('mlIntensityVal');
    const speedVal = document.getElementById('mlSpeedVal');
    if (intensityVal) intensityVal.textContent = '100%';
    if (speedVal) speedVal.textContent = '500ms';

    clearMotionLabActivePresetAnimation();

    // Remove injected animation style
    const styleEl = document.getElementById('mlAnimStyle');
    if (styleEl) styleEl.remove();

    if (propsContent) {
      propsContent.className = 'ml__props-empty';
      propsContent.innerHTML = `
        <span class="material-symbols-outlined" style="font-size:32px;color:var(--si-text-dim)">touch_app</span>
        <p>Select an element to edit</p>
      `;
    }
    updateMotionLabAssetProfileHint();
  });

}

function loadSvgIntoMotionLab(svgText) {
  motionLab.svgText = svgText;

  // Clear stale state from previous icon load
  motionLab.selectedIds.clear();
  motionLab.tracks = {};
  motionLab.elements = [];
  motionLab.activePreset = null;
  motionLab.isStopped = true;
  motionLab.fillColor = null;
  motionLab.strokeColor = null;
  motionLab.assetProfile = null;

  // Parse SVG
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgText, 'image/svg+xml');
  const svgEl = doc.querySelector('svg');
  if (!svgEl) return;

  motionLab.svg = svgEl;

  // Default to loop so animation is immediately visible after preset click
  motionLab.playback.mode = 'loop';

  // Show stage + bottom bar, hide drop zone
  const dropZone = document.getElementById('mlDropZone');
  const preview = document.getElementById('mlPreview');
  const stage = document.getElementById('mlStage');
  const bottomBar = document.getElementById('mlBottomBar');
  const playbackSection = document.getElementById('mlPlaybackSection');

  if (dropZone) dropZone.style.display = 'none';
  if (stage) stage.style.display = '';
  if (bottomBar) bottomBar.style.display = '';
  if (playbackSection) playbackSection.style.display = '';
  syncMotionLabPlayButton({ hasAnimation: false, isStopped: true });
  if (preview) {
    preview.style.display = 'flex';
    preview.innerHTML = '';

    // Stage ring - visible animation boundary
    const stageRing = document.createElement('div');
    stageRing.className = 'ml__stage-ring';

    const clone = svgEl.cloneNode(true);
    clone.removeAttribute('width');
    clone.removeAttribute('height');
    // Ensure viewBox exists so it scales correctly
    if (!clone.hasAttribute('viewBox')) {
      clone.setAttribute('viewBox', '0 0 24 24');
    }

    // Normalize large-viewBox outline icons (e.g. Ionicons 512x512)
    // These icons lack explicit stroke-width and rely on CSS classes that are
    // stripped during data-URI parsing. Use viewBox size as heuristic.
    const vb = clone.getAttribute('viewBox');
    if (vb) {
      const parts = vb.trim().split(/\s+/);
      const vbWidth = parseFloat(parts[2]) || 0;
      if (vbWidth >= 256) {
        clone.setAttribute(MOTION_LAB_LARGE_VIEWBOX_ATTR, MOTION_LAB_LARGE_VIEWBOX_VALUE);
        const defaultSW = String(Math.round(vbWidth / 16));
        clone.querySelectorAll('path,circle,rect,polygon,polyline,line,ellipse').forEach(el => {
          if (!el.getAttribute('stroke-width')) {
            el.setAttribute('stroke-width', defaultSW);
          }
          if (!el.getAttribute('stroke') && el.getAttribute('fill') === 'none') {
            el.setAttribute('stroke', 'currentColor');
          }
        });
      }
    }
    wrapMotionLabDrawableChildren(clone);
    // Ensure currentColor resolves to theme-appropriate text color
    clone.style.color = 'var(--si-text)';
    motionLab.assetProfile = analyzeMotionLabSvgProfile(clone);

    // Apply preview size via attributes (SVGs in flexbox ignore CSS width/height)
    const sz = motionLab.previewSize;
    clone.setAttribute('width', sz);
    clone.setAttribute('height', sz);
    stageRing.style.width = (sz + 32) + 'px';
    stageRing.style.height = (sz + 32) + 'px';
    stageRing.appendChild(clone);
    preview.appendChild(stageRing);

    // Element selection on canvas (click to select SVG children)
    preview.addEventListener('click', (e) => {
      const selectionRoot = getMotionLabAnimTarget(clone);
      let target = e.target;
      while (target && target !== selectionRoot && target.parentElement !== selectionRoot) {
        target = target.parentElement;
      }
      if (isMotionLabAnimTarget(target)) return;
      if (target && target !== clone && target !== selectionRoot && target !== preview && target !== stageRing) {
        const selector = getElementSelector(target);
        selectElement(selector);
      }
    });
  }

  // Build element tree from the DOM-mounted clone (not parsed node)
  // clone is defined above in the if (preview) block
  const domSvg = document.querySelector('#mlPreview svg');
  if (domSvg) buildElementTree(domSvg);
  updateMotionLabAssetProfileHint();

  // Wire Phase 2 controls - guard flag prevents listener stacking on re-load
  if (!motionLab.controlsWired) {
    initMotionLabControls();
    motionLab.controlsWired = true;
  }

  // If rehydrating from saved state, replay CSS
  if (Object.keys(motionLab.tracks).length > 0) {
    generateAndInjectCSS();
  }
}


// Escape HTML to prevent XSS from SVG attribute values
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Sanitize a CSS selector string into a valid HTML id fragment.
 * Used consistently across updatePropsPanel, livePreviewProp, and updateLiveTransform.
 */
function sanitizeSel(selector) {
  return selector.replace(/[^\w-]/g, '_');
}

const MOTION_LAB_ANIM_TARGET_ATTR = 'data-ml-anim-target';
const MOTION_LAB_ANIM_TARGET_VALUE = 'true';
const MOTION_LAB_ANIM_TARGET_SELECTOR = `[${MOTION_LAB_ANIM_TARGET_ATTR}="${MOTION_LAB_ANIM_TARGET_VALUE}"]`;
const MOTION_LAB_HAS_ANIM_TARGET_ATTR = 'data-ml-has-anim-target';
const MOTION_LAB_HAS_ANIM_TARGET_VALUE = 'true';
const MOTION_LAB_LARGE_VIEWBOX_ATTR = 'data-ml-large-viewbox';
const MOTION_LAB_LARGE_VIEWBOX_VALUE = 'true';
const MOTION_LAB_DRAWABLE_SHAPE_SELECTOR = 'path,circle,rect,polygon,polyline,line,ellipse';
const MOTION_LAB_NON_DRAWABLE_TAGS = new Set([
  'defs',
  'metadata',
  'desc',
  'title',
  'lineargradient',
  'radialgradient',
  'stop',
  'clippath',
  'mask',
  'style',
  'filter',
  'pattern',
  'marker',
  'symbol',
]);

function isMotionLabAnimTarget(el) {
  return !!(el && el.nodeType === 1 && el.getAttribute?.(MOTION_LAB_ANIM_TARGET_ATTR) === MOTION_LAB_ANIM_TARGET_VALUE);
}

function hasMotionLabNonDrawableAncestor(el, svgEl) {
  let node = el?.parentElement;
  while (node && node !== svgEl) {
    if (MOTION_LAB_NON_DRAWABLE_TAGS.has(node.tagName.toLowerCase())) return true;
    node = node.parentElement;
  }
  return false;
}

function analyzeMotionLabSvgProfile(svgEl) {
  const shapes = Array.from(svgEl?.querySelectorAll?.(MOTION_LAB_DRAWABLE_SHAPE_SELECTOR) || []).filter((el) => {
    return !hasMotionLabNonDrawableAncestor(el, svgEl);
  });

  const shapeCount = shapes.length;
  const pathCount = shapes.filter((el) => el.tagName.toLowerCase() === 'path').length;
  const hasStroke = shapes.some((el) => {
    const stroke = (el.getAttribute('stroke') || '').trim().toLowerCase();
    return !!stroke && stroke !== 'none';
  });
  const hasFillNone = shapes.some((el) => {
    return (el.getAttribute('fill') || '').trim().toLowerCase() === 'none';
  });
  const largeViewBox = svgEl?.getAttribute?.(MOTION_LAB_LARGE_VIEWBOX_ATTR) === MOTION_LAB_LARGE_VIEWBOX_VALUE;

  let kind = 'multi-fill';
  if (shapeCount <= 1 && !hasStroke && !hasFillNone) {
    kind = 'single-fill-glyph';
  } else if (shapeCount <= 1) {
    kind = 'single-stroke-shape';
  } else if (hasStroke || hasFillNone) {
    kind = 'multi-stroke';
  }

  return { kind, shapeCount, pathCount, hasStroke, hasFillNone, largeViewBox };
}

function updateMotionLabAssetProfileHint(profile = motionLab.assetProfile) {
  return profile;
}

function hasMotionLabAnimationTracks() {
  return Object.values(motionLab.tracks).some(track => {
    return Array.isArray(track?.keyframes) && track.keyframes.length > 0;
  });
}

function syncMotionLabPlayButton({ hasAnimation = hasMotionLabAnimationTracks(), isStopped = !hasAnimation || motionLab.isStopped } = {}) {
  const playBtn = document.getElementById('mlPlayBtn');
  if (!playBtn) return;

  const icon = playBtn.querySelector('.material-symbols-outlined');
  const shouldShowPlay = !hasAnimation || isStopped;

  motionLab.isStopped = shouldShowPlay;
  if (icon) {
    icon.textContent = shouldShowPlay ? 'play_arrow' : 'stop';
  }
  playBtn.classList.toggle('ml__play-btn--active', shouldShowPlay);
}

function clearMotionLabPresetSelection(scope = document) {
  scope.querySelectorAll('.ml__preset-btn').forEach((btn) => btn.classList.remove('active'));
}

function clearMotionLabActivePresetAnimation({ restoreBaseCss = true, clearInlineAnimation = true } = {}) {
  motionLab.tracks = {};
  motionLab.activePreset = null;
  motionLab.isStopped = true;
  clearMotionLabPresetSelection();

  const styleEl = document.getElementById('mlAnimStyle');
  if (styleEl) {
    styleEl.textContent = restoreBaseCss ? getMotionLabBaseTransformCss('mlPreview') : '';
  }

  if (clearInlineAnimation) {
    const svgEl = document.querySelector('#mlPreview svg');
    if (svgEl) {
      svgEl.style.animation = '';
      svgEl.querySelectorAll('*').forEach((el) => {
        el.style.animation = '';
      });
    }
  }

  syncMotionLabPlayButton({ hasAnimation: false, isStopped: true });
}

function wrapMotionLabDrawableChildren(svgEl) {
  if (!svgEl) return;
  if (Array.from(svgEl.children).some(isMotionLabAnimTarget)) {
    svgEl.setAttribute(MOTION_LAB_HAS_ANIM_TARGET_ATTR, MOTION_LAB_HAS_ANIM_TARGET_VALUE);
    return;
  }

  const drawableChildren = Array.from(svgEl.children).filter((child) => {
    return !MOTION_LAB_NON_DRAWABLE_TAGS.has(child.tagName.toLowerCase());
  });
  if (!drawableChildren.length) {
    svgEl.removeAttribute(MOTION_LAB_HAS_ANIM_TARGET_ATTR);
    return;
  }

  const wrapper = svgEl.ownerDocument.createElementNS('http://www.w3.org/2000/svg', 'g');
  wrapper.setAttribute('class', 'ml-icon-root');
  wrapper.setAttribute(MOTION_LAB_ANIM_TARGET_ATTR, MOTION_LAB_ANIM_TARGET_VALUE);

  svgEl.insertBefore(wrapper, drawableChildren[0]);
  drawableChildren.forEach((child) => wrapper.appendChild(child));
  svgEl.setAttribute(MOTION_LAB_HAS_ANIM_TARGET_ATTR, MOTION_LAB_HAS_ANIM_TARGET_VALUE);
}

function getMotionLabSvgRoot() {
  return document.querySelector('#mlPreview svg');
}

function getMotionLabAnimTarget(svgEl = getMotionLabSvgRoot()) {
  if (!svgEl) return null;
  return Array.from(svgEl.children).find(isMotionLabAnimTarget) || svgEl;
}

function getMotionLabPreviewRootSelector(containerId = 'mlPreview') {
  return `#${containerId} svg[${MOTION_LAB_HAS_ANIM_TARGET_ATTR}="${MOTION_LAB_HAS_ANIM_TARGET_VALUE}"] ${MOTION_LAB_ANIM_TARGET_SELECTOR}, #${containerId} svg:not([${MOTION_LAB_HAS_ANIM_TARGET_ATTR}="${MOTION_LAB_HAS_ANIM_TARGET_VALUE}"])`;
}

function getMotionLabExportRootSelector() {
  return `svg[${MOTION_LAB_HAS_ANIM_TARGET_ATTR}="${MOTION_LAB_HAS_ANIM_TARGET_VALUE}"] ${MOTION_LAB_ANIM_TARGET_SELECTOR}, svg:not([${MOTION_LAB_HAS_ANIM_TARGET_ATTR}="${MOTION_LAB_HAS_ANIM_TARGET_VALUE}"])`;
}

function prefixSelectorList(prefix, selectorList) {
  return selectorList
    .split(',')
    .map((part) => `${prefix}${part.trim()}`)
    .join(', ');
}

function shouldUseMotionLabNonScalingStroke(svgEl = getMotionLabSvgRoot()) {
  return !!svgEl && svgEl.getAttribute(MOTION_LAB_LARGE_VIEWBOX_ATTR) !== MOTION_LAB_LARGE_VIEWBOX_VALUE;
}

function getElementSelector(el) {
  if (el.id) return `#${el.id}`;
  if (el.classList.length > 0 && !isMotionLabAnimTarget(el)) return `.${el.classList[0]}`;
  // Positional fallback: nth-child counts ALL children regardless of type
  const parent = el.parentElement;
  if (!parent) return el.tagName.toLowerCase();
  const allChildren = Array.from(parent.children);
  const idx = allChildren.indexOf(el);
  if (isMotionLabAnimTarget(parent)) {
    return `${MOTION_LAB_ANIM_TARGET_SELECTOR} > :nth-child(${idx + 1})`;
  }
  return `:nth-child(${idx + 1})`;
}

function buildElementTree(svgEl) {
  motionLab.elements = [];

  function walk(node, depth) {
    if (node.nodeType !== 1) return; // Element nodes only
    const tag = node.tagName.toLowerCase();
    // Skip defs, metadata, desc, title
    if (['defs', 'metadata', 'desc', 'title', 'linearGradient', 'radialGradient', 'stop', 'clipPath', 'mask'].includes(tag)) return;

    const selector = getElementSelector(node);
    const label = node.id
      ? `${tag}#${node.id}`
      : node.classList.length > 0
        ? `${tag}.${node.classList[0]}`
        : tag;

    motionLab.elements.push({ selector, label, node, depth });

    for (const child of node.children) {
      walk(child, depth + 1);
    }
  }

  // Walk SVG children (skip the svg root itself)
  const treeRoot = getMotionLabAnimTarget(svgEl);
  for (const child of treeRoot.children) {
    walk(child, 0);
  }

  // Auto-select first element so controls are immediately available
  if (motionLab.elements.length > 0 && motionLab.selectedIds.size === 0) {
    selectElement(motionLab.elements[0].selector);
  }
}

function selectElement(selector) {
  // Toggle selection
  if (motionLab.selectedIds.has(selector)) {
    motionLab.selectedIds.delete(selector);
    // Remove track if deselected and empty
    if (motionLab.tracks[selector] && motionLab.tracks[selector].keyframes.length === 0) {
      delete motionLab.tracks[selector];
    }
  } else {
    motionLab.selectedIds.add(selector);
    // Auto-create track when element is selected
    ensureTrack(selector);
  }

  // Update properties panel and timeline
  updatePropsPanel();
  renderTimeline();
}

function updatePropsPanel() {
  const content = document.getElementById('mlPropsContent');
  if (!content) return;

  if (motionLab.selectedIds.size === 0) {
    content.className = 'ml__props-empty';
    content.innerHTML = `
      <span class="material-symbols-outlined" style="font-size:32px;color:var(--si-text-dim)">touch_app</span>
      <p>Select an element to edit</p>
    `;
    return;
  }

  content.className = '';
  const selector = Array.from(motionLab.selectedIds)[motionLab.selectedIds.size - 1];
  // Use sanitizeSel for IDs so they match what livePreviewProp/updateLiveTransform use
  const sid = sanitizeSel(selector);

  // Helper: render a slider row with a per-control reset button
  const sliderRow = (lblTxt, inputId, min, max, step, val, prop, displayVal, resetDefault) => `
    <div class="ml__slider-row">
      <span class="ml__slider-label">${lblTxt}</span>
      <input type="range" class="ml__prop-range" min="${min}" max="${max}" step="${step}" value="${val}"
        data-prop="${prop}" data-sel="${escapeHtml(selector)}" id="${inputId}">
      <span class="ml__prop-val" id="val_${inputId}">${displayVal}</span>
      <button class="ml__ctrl-reset" data-reset-prop="${prop}" data-default="${resetDefault}" data-tip="Reset">
        <span class="material-symbols-outlined" style="font-size:13px">restart_alt</span>
      </button>
    </div>`;

  // Color dot row template (reused for fill and stroke)
  const colorDotRow = (type, activeColor) => {
    const colors = ['#000000','#FFFFFF','#FF6B35','#00D4FF','#A855F7','#22C55E','#FACC15'];
    let html = `<button class="ml__color-dot ml__color-dot--original${!activeColor ? ' ml__color-dot--active' : ''}" data-color="" data-tip="Default"></button>`;
    colors.forEach(c => {
      html += `<button class="ml__color-dot${activeColor === c ? ' ml__color-dot--active' : ''}" data-color="${c}" data-tip="${c}" style="background:${c}"></button>`;
    });
    html += `<button class="ml__color-add" id="ml${type}PickerBtn" data-tip="Custom color"><span class="material-symbols-outlined" style="font-size:14px">add</span><input type="color" class="ml__color-picker-hidden" id="ml${type}Picker" value="${activeColor || '#FFFFFF'}"></button>`;
    return html;
  };

  content.innerHTML = `

    <!-- Fill color -->
    <div class="ml__prop-group">
      <div class="ml__prop-title">Fill</div>
      <div class="ml__color-dots" id="mlFillDots">
        ${colorDotRow('Fill', motionLab.fillColor)}
      </div>
    </div>

    <!-- Stroke color -->
    <div class="ml__prop-group">
      <div class="ml__prop-title">Stroke</div>
      <div class="ml__color-dots" id="mlStrokeDots">
        ${colorDotRow('Stroke', motionLab.strokeColor)}
      </div>
    </div>

    <!-- Scale: 0% = no change, negative = shrink, positive = grow -->
    <div class="ml__prop-group">
      <div class="ml__prop-title">Scale</div>
      ${sliderRow('Size', `slScale_${sid}`, -75, 200, 5, 0, 'scalePct', '0%', 0)}
    </div>

    <!-- Rotate -->
    <div class="ml__prop-group">
      <div class="ml__prop-title">Rotate</div>
      <div class="ml__rotate-row">
        <div class="ml__dial" id="dial_${sid}">
          <div class="ml__dial-needle" id="dialNeedle_${sid}"></div>
        </div>
        <div class="ml__rotate-slider">
          ${sliderRow('', `slRot_${sid}`, 0, 360, 1, 0, 'rotate', '0deg', 0)}
        </div>
      </div>
    </div>

    <!-- Opacity -->
    <div class="ml__prop-group">
      <div class="ml__prop-title">Opacity</div>
      ${sliderRow('Fade', `slOpac_${sid}`, 0, 1, 0.05, 1, 'opacity', '1.00', 1)}
    </div>
  `;

  // Wire rotate slider <-> dial needle sync
  const rotSlider = document.getElementById(`slRot_${sid}`);
  const rotNeedle = document.getElementById(`dialNeedle_${sid}`);
  if (rotSlider && rotNeedle) {
    rotSlider.addEventListener('input', () => {
      rotNeedle.style.transform = `translateX(-50%) rotate(${rotSlider.value}deg)`;
    });
  }

  // Wire dial click -> set angle on slider
  const dial = document.getElementById(`dial_${sid}`);
  if (dial && rotSlider) {
    dial.addEventListener('click', (e) => {
      const rect = dial.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const angle = Math.atan2(e.clientY - cy, e.clientX - cx) * (180 / Math.PI) + 90;
      const deg = Math.round((angle + 360) % 360);
      rotSlider.value = deg;
      rotSlider.dispatchEvent(new Event('input', { bubbles: true }));
    });
  }

  // ── Color helpers (Fill + Stroke) ──────────────────────────────
  const SHAPE_TAGS = 'path, circle, rect, polygon, polyline, line, ellipse';
  const TABLER_BOUNDS_PATH_D = 'm00h24v24h0z';

  function normalizeMotionLabPathData(d = '') {
    return String(d).replace(/\s+/g, '').toLowerCase();
  }

  function shouldSkipFillRecolor(origEl) {
    if (!origEl) return true;

    const ownFill = (origEl.getAttribute('fill') || '').trim().toLowerCase();
    if (ownFill === 'none') return true;
    if (ownFill) return false;

    // MingCute line icons place an invisible layout/helper path inside
    // a parent <g fill="none">, while the visible glyph path sets its own fill.
    // Respect inherited fill="none" so we do not paint that helper box.
    let ancestor = origEl.parentElement;
    while (ancestor && ancestor.tagName?.toLowerCase() !== 'svg') {
      const inheritedFill = (ancestor.getAttribute('fill') || '').trim().toLowerCase();
      if (inheritedFill === 'none') return true;
      if (inheritedFill) return false;
      ancestor = ancestor.parentElement;
    }

    return false;
  }

  function shouldSkipStrokeRecolor(origEl) {
    if (!origEl) return true;

    const origStroke = (origEl.getAttribute('stroke') || '').trim().toLowerCase();
    if (origStroke === 'none') return true;

    // Tabler outline icons include an invisible bounds helper path:
    // <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
    if (
      origEl.tagName?.toLowerCase() === 'path' &&
      normalizeMotionLabPathData(origEl.getAttribute('d')) === TABLER_BOUNDS_PATH_D
    ) {
      return true;
    }

    return false;
  }

  function applyFillToSvg(color) {
    motionLab.fillColor = color || null;
    const svgEl = document.querySelector('#mlPreview svg');
    if (!svgEl || !motionLab.svgText) return;
    if (color) {
      // Parse original SVG to respect outline structure
      const origDoc = new DOMParser().parseFromString(motionLab.svgText, 'image/svg+xml');
      const origEls = origDoc.querySelectorAll(SHAPE_TAGS);
      svgEl.querySelectorAll(SHAPE_TAGS).forEach((el, i) => {
        if (shouldSkipFillRecolor(origEls[i])) return;
        el.setAttribute('fill', color);
      });
      // Set SVG root color for currentColor-based icons (affects fill channel)
      svgEl.style.color = color;
    } else {
      restoreOrigAttr('fill');
      // Only reset color if no stroke color is active on a stroke-based icon
      if (!motionLab.strokeColor) {
        svgEl.style.color = '#FFFFFF';
      }
    }
    // Keep CSS static overrides in sync with DOM state
    if (Object.keys(motionLab.tracks).length) generateAndInjectCSS();
  }

  function applyStrokeToSvg(color) {
    motionLab.strokeColor = color || null;
    const svgEl = document.querySelector('#mlPreview svg');
    if (!svgEl || !motionLab.svgText) return;
    const origDoc = new DOMParser().parseFromString(motionLab.svgText, 'image/svg+xml');
    const origSvg = origDoc.querySelector('svg');
    if (!origSvg) return;

    // Detect if this icon is stroke-based (root declares stroke="currentColor")
    const rootStroke = origSvg.getAttribute('stroke');
    const isStrokeBased = rootStroke === 'currentColor' || (rootStroke && rootStroke !== 'none');

    if (color) {
      const origEls = origDoc.querySelectorAll(SHAPE_TAGS);
      if (isStrokeBased) {
        // Stroke-based icons (Lucide, Tabler, Iconoir): recolor visible strokes only.
        // Tabler ships an invisible bounds helper path that must remain stroke="none".
        svgEl.querySelectorAll(SHAPE_TAGS).forEach((el, i) => {
          if (shouldSkipStrokeRecolor(origEls[i])) return;
          el.setAttribute('stroke', color);
        });
      } else {
        // Fill-based icons (Phosphor, Material): only apply to paths that had strokes
        svgEl.querySelectorAll(SHAPE_TAGS).forEach((el, i) => {
          const origStroke = origEls[i]?.getAttribute('stroke');
          if (!origStroke || origStroke === 'none') return;
          el.setAttribute('stroke', color);
        });
      }
      // Do NOT set svgEl.style.color here - that would change fill via currentColor
      // on fill-based icons, causing the "thick outline" bug
    } else {
      restoreOrigAttr('stroke');
    }
    // Keep CSS static overrides in sync with DOM state
    if (Object.keys(motionLab.tracks).length) generateAndInjectCSS();
  }

  function restoreOrigAttr(attr) {
    const svgEl = document.querySelector('#mlPreview svg');
    if (!svgEl || !motionLab.svgText) return;
    const parser = new DOMParser();
    const origDoc = parser.parseFromString(motionLab.svgText, 'image/svg+xml');
    const origSvg = origDoc.querySelector('svg');
    if (!origSvg) return;
    const origEls = origSvg.querySelectorAll(SHAPE_TAGS);
    svgEl.querySelectorAll(SHAPE_TAGS).forEach((el, i) => {
      if (origEls[i]) {
        const origVal = origEls[i].getAttribute(attr);
        if (origVal) el.setAttribute(attr, origVal);
        else el.removeAttribute(attr);
      }
    });
  }

  function syncDotHighlight(containerId, stateColor) {
    const dots = document.getElementById(containerId);
    if (!dots) return;
    dots.querySelectorAll('.ml__color-dot').forEach(d => d.classList.remove('ml__color-dot--active'));
    if (!stateColor) {
      const origDot = dots.querySelector('.ml__color-dot[data-color=""]');
      if (origDot) origDot.classList.add('ml__color-dot--active');
    } else {
      const match = dots.querySelector(`.ml__color-dot[data-color="${stateColor}"]`);
      if (match) match.classList.add('ml__color-dot--active');
    }
  }

  // Wire Fill dots
  const fillDots = document.getElementById('mlFillDots');
  if (fillDots) {
    fillDots.addEventListener('click', (e) => {
      const dot = e.target.closest('.ml__color-dot');
      if (!dot) return;
      applyFillToSvg(dot.dataset.color);
      syncDotHighlight('mlFillDots', motionLab.fillColor);
      const picker = document.getElementById('mlFillPicker');
      if (picker && dot.dataset.color) picker.value = dot.dataset.color;
    });
  }

  // Wire Stroke dots
  const strokeDots = document.getElementById('mlStrokeDots');
  if (strokeDots) {
    strokeDots.addEventListener('click', (e) => {
      const dot = e.target.closest('.ml__color-dot');
      if (!dot) return;
      applyStrokeToSvg(dot.dataset.color);
      syncDotHighlight('mlStrokeDots', motionLab.strokeColor);
      const picker = document.getElementById('mlStrokePicker');
      if (picker && dot.dataset.color) picker.value = dot.dataset.color;
    });
  }

  // Wire Fill picker (hidden input in + button)
  const fillPicker = document.getElementById('mlFillPicker');
  if (fillPicker) {
    fillPicker.addEventListener('input', (e) => {
      applyFillToSvg(e.target.value);
      if (fillDots) fillDots.querySelectorAll('.ml__color-dot').forEach(d => d.classList.remove('ml__color-dot--active'));
    });
  }

  // Wire Stroke picker
  const strokePicker = document.getElementById('mlStrokePicker');
  if (strokePicker) {
    strokePicker.addEventListener('input', (e) => {
      applyStrokeToSvg(e.target.value);
      if (strokeDots) strokeDots.querySelectorAll('.ml__color-dot').forEach(d => d.classList.remove('ml__color-dot--active'));
    });
  }

}

// ── Phase 2: Animation Engine ──────────────────────────────────

// ---- Track Management ----------------------------------------

/**
 * Ensure a track exists for a given selector. Auto-called when element is selected.
 * Track shape: { keyframes: [{offset: 0..1, props: {}}], easing: string, duration: number }
 */
function ensureTrack(selector) {
  if (!motionLab.tracks[selector]) {
    motionLab.tracks[selector] = {
      keyframes: [],
      easing: 'ease-in-out',
      duration: motionLab.playback.duration,
    };
  }
  return motionLab.tracks[selector];
}

/**
 * Add or update a keyframe on a track at the given offset (0..1).
 * If a keyframe at that offset already exists, merge props into it.
 */
function addKeyframe(selector, offset, props) {
  const track = ensureTrack(selector);
  const existing = track.keyframes.find(k => Math.abs(k.offset - offset) < 0.01);
  if (existing) {
    Object.assign(existing.props, props);
  } else {
    track.keyframes.push({ offset, props: { ...props } });
    track.keyframes.sort((a, b) => a.offset - b.offset);
  }
  renderTimeline();
  generateAndInjectCSS();
}

/**
 * Read current prop values from the properties panel for the active element
 * and return them as a CSS props object.
 */
function readPropsFromPanel(selector) {
  const props = {};
  const inputs = document.querySelectorAll(`[data-sel="${CSS.escape ? CSS.escape(selector) : selector}"]`);
  inputs.forEach(input => {
    const prop = input.dataset.prop;
    const val = input.value;
    if (!prop || val === '' || val === undefined) return;
    switch (prop) {
      case 'translateX': props['--ml-tx'] = `${val}px`; break;
      case 'translateY': props['--ml-ty'] = `${val}px`; break;
      case 'scalePct':   props['--ml-sc'] = String(1 + parseFloat(val) / 100); break;
      case 'rotate':     props['--ml-ro'] = `${val}deg`; break;
      case 'opacity':    props.opacity = val; break;
      case 'strokeDashoffset': props['stroke-dashoffset'] = val; break;
      case 'strokeWidth': props['stroke-width'] = val; break;
      default: break;
    }
  });
  // Collapse transform custom props into a transform string if any are set
  const tx = props['--ml-tx'] || '0px';
  const ty = props['--ml-ty'] || '0px';
  const sc = props['--ml-sc'] || '1';
  const ro = props['--ml-ro'] || '0deg';
  const hasTransform = props['--ml-tx'] || props['--ml-ty'] || props['--ml-sc'] || props['--ml-ro'];
  if (hasTransform) {
    props.transform = `translate(${tx}, ${ty}) scale(${sc}) rotate(${ro})`;
    delete props['--ml-tx'];
    delete props['--ml-ty'];
    delete props['--ml-sc'];
    delete props['--ml-ro'];
  }
  return props;
}

// ---- CSS Generation ----------------------------------------

/** Sanitize a selector string to a valid CSS animation name */
function selectorToAnimName(sel) {
  if (sel === '__root__') return 'ml-icon';
  return 'ml-' + sel.replace(/[^a-zA-Z0-9]/g, '_');
}

/**
 * Generate @keyframes + animation rule for one track.
 * @param {boolean} forPreview - If true, always emit loop-style CSS (infinite, no trigger selector).
 *                               If false, emit trigger-specific selectors for export.
 */
function generateTrackCSS(selector, track, trigger, containerId, forPreview = false) {
  if (!track.keyframes.length) return '';
  const name = selectorToAnimName(selector);
  const dur = (track.duration || motionLab.playback.duration);
  const easing = track.easing || 'ease-in-out';

  // Compute base transform from scale/rotate sliders
  const scEl = document.querySelector('[id^="slScale_"]');
  const roEl = document.querySelector('[id^="slRot_"]');
  const baseScale = scEl ? 1 + parseFloat(scEl.value) / 100 : 1;
  const baseRotate = roEl ? parseFloat(roEl.value) : 0;

  let css = `@keyframes ${name} {\n`;

  // Detect constant opacity (same value in every keyframe) to strip redundant output
  const opVals = track.keyframes.map(kf => kf.props.opacity).filter(v => v !== undefined);
  const opIsConst = opVals.length > 0 && opVals.every(v => v === opVals[0]);

  for (const kf of track.keyframes) {
    css += `  ${Math.round(kf.offset * 100)}% {\n`;
    for (const [prop, val] of Object.entries(kf.props)) {
      if (prop === 'opacity' && opIsConst) continue;
      let finalVal = val;
      // Pre-compose base scale/rotate into transform values
      if (prop === 'transform' && (baseScale !== 1 || baseRotate !== 0)) {
        finalVal = composeTransform(val, baseScale, baseRotate);
      }
      css += `    ${prop}: ${finalVal};\n`;
    }
    css += `  }\n`;
  }
  css += `}\n`;

  // Preview always uses simple loop selector (animation is always visible)
  if (forPreview) {
    const targetSelector = selector === '__root__'
      ? getMotionLabPreviewRootSelector(containerId)
      : `#${containerId} ${selector}`;
    css += `${targetSelector} {\n`;
    css += `  animation: ${name} ${dur}ms ${easing} infinite;\n`;
    css += `}\n\n`;
    return css;
  }

  // Export: build rule based on trigger mode
  const exportTarget = selector === '__root__' ? getMotionLabExportRootSelector() : selector;
  if (trigger === 'hover') {
    css += `${prefixSelectorList(`#${containerId}:hover `, exportTarget)} {\n`;
    css += `  animation: ${name} ${dur}ms ${easing} infinite;\n`;
    css += `}\n\n`;
  } else if (trigger === 'loop') {
    css += `${prefixSelectorList(`#${containerId} `, exportTarget)} {\n`;
    css += `  animation: ${name} ${dur}ms ${easing} infinite;\n`;
    css += `}\n\n`;
  } else if (trigger === 'click') {
    css += `${prefixSelectorList(`#${containerId}.ml--active `, exportTarget)} {\n`;
    css += `  animation: ${name} ${dur}ms ${easing} 3;\n`;
    css += `}\n\n`;
  }
  return css;
}

/**
 * Generate full CSS from all tracks.
 * @param {boolean} forPreview - If true, generate loop-style CSS for preview playback.
 *                               If false, generate trigger-specific CSS for export.
 */
function generateFullCSS(forPreview = false) {
  const trigger = motionLab.playback.mode;
  const containerId = 'mlPreview';
  const presetName = motionLab.activePreset || 'Custom';
  const dur = motionLab.playback.duration;

  // Metadata header
  let css = `/* Supericons Motion Lab */\n`;
  css += `/* Animation: ${presetName} | Trigger: ${trigger} | Duration: ${dur}ms */\n\n`;

  for (const [selector, track] of Object.entries(motionLab.tracks)) {
    css += generateTrackCSS(selector, track, trigger, containerId, forPreview);
  }

  // Emit static overrides (fill, stroke, scale, rotate, opacity)
  const staticRules = [];
  if (motionLab.fillColor) {
    // Only emit CSS fill if the SVG uses currentColor (fill not baked into paths).
    // When applyFillToSvg sets fill on paths directly, CSS override is redundant.
    let emitFill = true;
    const previewSvg = document.querySelector('#mlPreview svg');
    if (previewSvg) {
      const firstShape = previewSvg.querySelector('path, circle, rect, polygon, polyline, line, ellipse');
      if (firstShape && firstShape.getAttribute('fill') === motionLab.fillColor) {
        emitFill = false; // already baked into path attributes
      }
    }
    if (emitFill) {
      staticRules.push(`  fill: ${motionLab.fillColor};`);
    }
  }
  if (motionLab.strokeColor) {
    // Only emit CSS stroke for stroke-based icons (root has stroke="currentColor").
    // For fill-based icons (Phosphor, Material), omitting CSS stroke prevents cascading
    // to paths with pre-existing stroke-width but no inline stroke attribute.
    let emitStroke = true;
    if (motionLab.svgText) {
      const origDoc = new DOMParser().parseFromString(motionLab.svgText, 'image/svg+xml');
      const rootStroke = origDoc.querySelector('svg')?.getAttribute('stroke');
      emitStroke = rootStroke === 'currentColor' || (rootStroke && rootStroke !== 'none');
    }
    if (emitStroke) {
      staticRules.push(`  stroke: ${motionLab.strokeColor};`);
    }
  }
  // Read scale/rotate from live slider state
  const scEl = document.querySelector('[id^="slScale_"]');
  const roEl = document.querySelector('[id^="slRot_"]');
  const scPct = scEl ? parseFloat(scEl.value) : 0;
  const roDeg = roEl ? parseFloat(roEl.value) : 0;
  const rootTransformRules = [];
  if (scPct !== 0 || roDeg !== 0) {
    const sc = 1 + scPct / 100;
    const parts = [];
    if (scPct !== 0) parts.push(`scale(${sc})`);
    if (roDeg !== 0) parts.push(`rotate(${roDeg}deg)`);
    rootTransformRules.push(`  transform: ${parts.join(' ')};`);
    rootTransformRules.push(`  transform-origin: center;`);
  }
  // Read opacity
  const opEl = document.querySelector('[id^="slOpac_"]');
  const opVal = opEl ? parseFloat(opEl.value) : 1;
  if (opVal !== 1) {
    staticRules.push(`  opacity: ${opVal};`);
  }

  if (staticRules.length) {
    css += `/* Static overrides */\n`;
    css += `#${containerId} svg {\n${staticRules.join('\n')}\n}\n\n`;
  }
  if (rootTransformRules.length) {
    css += `/* Root transform overrides */\n`;
    const rootSelector = forPreview
      ? getMotionLabPreviewRootSelector(containerId)
      : prefixSelectorList(`#${containerId} `, getMotionLabExportRootSelector());
    css += `${rootSelector} {\n${rootTransformRules.join('\n')}\n}\n\n`;
  }

  return css;
}

function getMotionLabBaseTransformCss(containerId = 'mlPreview') {
  return `${getMotionLabPreviewRootSelector(containerId)} { transform-box: fill-box; transform-origin: center; }\n#${containerId} svg * { transform-box: fill-box; transform-origin: center; }\n`;
}

function buildMotionLabStandaloneSvgCss() {
  return sanitizeCssCommentMetadata(
    rewriteForStandalone(getMotionLabBaseTransformCss('mlPreview') + generateFullCSS()),
    { preserveBranding: true },
  );
}

function buildMotionLabExternalCss() {
  const usageNote = '/* Usage: apply this CSS with an inline <svg> inside <div id="icon-container">...</div> */\n';
  return sanitizeCssCommentMetadata(
    rewriteForExternal(getMotionLabBaseTransformCss('mlPreview') + generateFullCSS()) + usageNote,
    { preserveBranding: true },
  );
}

/**
 * Rewrite CSS selectors for self-contained SVG export.
 * Maps #mlPreview targets to #animated-icon (the SVG root itself).
 */
function rewriteForStandalone(css) {
  return css
    .replace(/#mlPreview:hover\s+svg\b/g,      '#animated-icon:hover')
    .replace(/#mlPreview\.ml--active\s+svg\b/g, '#animated-icon.active')
    .replace(/#mlPreview\s+svg\b/g,             '#animated-icon')
    // Also map any remaining container-prefixed element selectors
    // (e.g. "#mlPreview [data-ml-anim-target] > :nth-child(1)").
    .replace(/#mlPreview:hover\b/g,             '#animated-icon:hover')
    .replace(/#mlPreview\.ml--active\b/g,       '#animated-icon.active')
    .replace(/#mlPreview\b/g,                   '#animated-icon');
}

/**
 * Rewrite CSS selectors for external CSS export.
 * Maps #mlPreview to a user-friendly container id.
 */
function rewriteForExternal(css) {
  return css
    .replace(/#mlPreview:hover\s+/g,      '#icon-container:hover ')
    .replace(/#mlPreview\.ml--active\s+/g, '#icon-container.active ')
    .replace(/#mlPreview\s+/g,            '#icon-container ')
    // Future-proof: if selectors are emitted without a descendant combinator,
    // still remap the preview container id.
    .replace(/#mlPreview:hover\b/g,       '#icon-container:hover')
    .replace(/#mlPreview\.ml--active\b/g, '#icon-container.active')
    .replace(/#mlPreview\b/g,             '#icon-container');
}

/**
 * Pre-compose a transform string with base scale and rotate values.
 * Instead of appending (e.g., "scale(1.15) scale(1.25)"), this multiplies
 * scale values and merges rotate for clean output (e.g., "scale(1.4375) rotate(16deg)").
 */
function composeTransform(transformStr, baseScale, baseRotate) {
  const parts = [];

  // Extract and compose scale: multiply animation scale by base scale
  const scaleMatch = transformStr.match(/scale\(([^)]+)\)/);
  if (scaleMatch) {
    const animScale = parseFloat(scaleMatch[1]);
    const composed = animScale * baseScale;
    parts.push(`scale(${parseFloat(composed.toFixed(4))})`);
  } else if (baseScale !== 1) {
    parts.push(`scale(${baseScale})`);
  }

  // Extract and compose rotate: add animation rotate to base rotate
  const rotMatch = transformStr.match(/rotate\(([^)]+)\)/);
  if (rotMatch) {
    const animRotate = parseFloat(rotMatch[1]);
    const composed = animRotate + baseRotate;
    parts.push(`rotate(${parseFloat(composed.toFixed(2))}deg)`);
  } else if (baseRotate !== 0) {
    parts.push(`rotate(${baseRotate}deg)`);
  }

  // Preserve translate values as-is
  const txMatch = transformStr.match(/translateX\([^)]+\)/);
  const tyMatch = transformStr.match(/translateY\([^)]+\)/);
  const tMatch = transformStr.match(/translate\([^)]+\)/);
  if (txMatch) parts.unshift(txMatch[0]);
  if (tyMatch) parts.unshift(tyMatch[0]);
  if (tMatch) parts.unshift(tMatch[0]);

  return parts.join(' ') || transformStr;
}

/**
 * Strip all inline live-preview artifacts from an SVG clone for export.
 * Removes animation, transform, opacity, color, transformBox, transformOrigin
 * from the root and all children. Also removes empty style="" attributes.
 */
function cleanSvgClone(svgClone) {
  // Clean root element
  const clearProps = ['animation', 'transform', 'opacity', 'color', 'transformBox', 'transformOrigin'];
  clearProps.forEach(p => { svgClone.style[p] = ''; });

  // Detect fill-based icons: root has fill but no meaningful stroke
  const rootStroke = svgClone.getAttribute('stroke');
  const isFillBased = !rootStroke || rootStroke === 'none';

  // Clean all children
  const shapeSel = 'path, circle, rect, polygon, polyline, line, ellipse';
  svgClone.querySelectorAll('*').forEach(el => {
    clearProps.forEach(p => { el.style[p] = ''; });
    // Remove preview-only SVG attributes
    el.removeAttribute('vector-effect');
    // Strip dead stroke-width on fill-based icon paths (no visible stroke uses it)
    if (isFillBased && el.matches(shapeSel)) {
      const elStroke = el.getAttribute('stroke');
      if (!elStroke || elStroke === 'none') {
        el.removeAttribute('stroke-width');
      }
    }
    // Remove empty style attributes entirely
    if (el.hasAttribute('style') && !el.getAttribute('style').trim()) {
      el.removeAttribute('style');
    }
  });

  // Remove empty style on root too
  if (svgClone.hasAttribute('style') && !svgClone.getAttribute('style').trim()) {
    svgClone.removeAttribute('style');
  }
}

/**
 * Inject generated CSS into a <style> tag inside the preview.
 * Also applies base svg transform-origin for all animated elements.
 */
function generateAndInjectCSS({ forcePlay = false } = {}) {
  const preview = document.getElementById('mlPreview');
  if (!preview) return;

  // Find or create the style element
  let styleEl = document.getElementById('mlAnimStyle');
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'mlAnimStyle';
    preview.appendChild(styleEl);
  }

  // Preview always uses loop-style CSS (trigger only affects export)
  const css = generateFullCSS(true);
  const hasAnimation = hasMotionLabAnimationTracks();

  if (!hasAnimation) {
    styleEl.textContent = getMotionLabBaseTransformCss('mlPreview');
    syncMotionLabPlayButton({ hasAnimation: false, isStopped: true });
    return;
  }

  // If user explicitly stopped playback and this is NOT a play/preset action,
  // strip animation CSS so icon stays still.
  if (motionLab.isStopped && !forcePlay) {
    styleEl.textContent = getMotionLabBaseTransformCss('mlPreview');
    syncMotionLabPlayButton({ hasAnimation: true, isStopped: true });
    return;
  }

  // Clear any inline animation:none set by slider drags or stop button
  // so the stylesheet animation rules take effect
  const svgEl = preview.querySelector('svg');
  if (svgEl) {
    svgEl.style.animation = '';
    svgEl.querySelectorAll('*').forEach(el => { el.style.animation = ''; });
    // Force reflow so browser restarts animation with same name
    void svgEl.offsetHeight;
  }

  // Keep preview and export aligned on the same SVG transform foundation
  styleEl.textContent = getMotionLabBaseTransformCss('mlPreview') + css;

  syncMotionLabPlayButton({ hasAnimation: true, isStopped: false });

  // Apply non-scaling-stroke if any animation track uses scale transforms.
  // This prevents Pulse/Pop from bloating stroke-width on fill-based icons.
  if (svgEl) {
    const usesScale = Object.values(motionLab.tracks).some(track =>
      track.keyframes?.some(kf => {
        const t = kf.props?.transform;
        return t && /scale\(/.test(t);
      })
    );
    const animTarget = getMotionLabAnimTarget(svgEl);
    const shapes = animTarget
      ? animTarget.querySelectorAll('path,circle,rect,line,polyline,polygon,ellipse')
      : [];
    if (usesScale && shouldUseMotionLabNonScalingStroke(svgEl)) {
      shapes.forEach(el => { el.setAttribute('vector-effect', 'non-scaling-stroke'); });
    } else {
      shapes.forEach(el => { el.removeAttribute('vector-effect'); });
    }
  }
}


/** Wire up all playback controls: intensity, speed, trigger, play, export, presets */
function initMotionLabControls() {
  // ── Intensity slider ──────────────────────────────────────────
  const intensitySlider = document.getElementById('mlIntensity');
  const intensityVal = document.getElementById('mlIntensityVal');
  if (intensitySlider) {
    intensitySlider.addEventListener('input', () => {
      const pct = parseInt(intensitySlider.value, 10);
      if (intensityVal) intensityVal.textContent = `${pct}%`;
      motionLab.intensity = pct;
      // Re-apply the active preset with new intensity
      if (motionLab.activePreset) {
        applyPreset(motionLab.activePreset, true); // silent (no toast)
      }
    });
  }

  // ── Speed slider ──────────────────────────────────────────────
  const speedSlider = document.getElementById('mlSpeed');
  const speedVal = document.getElementById('mlSpeedVal');
  if (speedSlider) {
    speedSlider.addEventListener('input', () => {
      const ms = parseInt(speedSlider.value, 10);
      if (speedVal) speedVal.textContent = `${ms}ms`;
      motionLab.playback.duration = ms;
      for (const track of Object.values(motionLab.tracks)) {
        track.duration = ms;
      }
      generateAndInjectCSS();
    });
  }

  // ── Intensity reset ──────────────────────────────────────────
  const intensityReset = document.getElementById('mlIntensityReset');
  if (intensityReset && intensitySlider) {
    intensityReset.addEventListener('click', () => {
      intensitySlider.value = 100;
      if (intensityVal) intensityVal.textContent = '100%';
      motionLab.intensity = 100;
      if (motionLab.activePreset) applyPreset(motionLab.activePreset, true);
    });
  }

  // ── Speed reset ──────────────────────────────────────────────
  const speedReset = document.getElementById('mlSpeedReset');
  if (speedReset && speedSlider) {
    speedReset.addEventListener('click', () => {
      speedSlider.value = 500;
      if (speedVal) speedVal.textContent = '500ms';
      motionLab.playback.duration = 500;
      for (const track of Object.values(motionLab.tracks)) {
        track.duration = 500;
      }
      generateAndInjectCSS();
    });
  }

  // ── Trigger radio buttons (export-only; does NOT affect preview) ──
  document.querySelectorAll('[name="mlTrigger"]').forEach(radio => {
    radio.addEventListener('change', () => {
      motionLab.playback.mode = radio.value;
    });
  });

  // ── Size selector strip ────────────────────────────────────────
  const sizeStrip = document.getElementById('mlSizeStrip');
  if (sizeStrip) {
    sizeStrip.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-size]');
      if (!btn) return;
      const sz = parseInt(btn.dataset.size, 10);
      motionLab.previewSize = sz;

      // Update active button
      sizeStrip.querySelectorAll('.ml__size-btn').forEach(b => b.classList.remove('ml__size-btn--active'));
      btn.classList.add('ml__size-btn--active');

      // Resize SVG and stage ring
      const stageRing = document.querySelector('.ml__stage-ring');
      const svgEl = document.querySelector('#mlPreview svg');
      if (svgEl) {
        svgEl.setAttribute('width', sz);
        svgEl.setAttribute('height', sz);
      }
      if (stageRing) {
        stageRing.style.width = (sz + 32) + 'px';
        stageRing.style.height = (sz + 32) + 'px';
      }
    });
  }

  // ── Reset Animation button (clears animation state, keeps icon) ──
  const resetAnimBtn = document.getElementById('mlResetAnimBtn');
  if (resetAnimBtn) {
    resetAnimBtn.addEventListener('click', () => {
      // Clear animation state
      clearMotionLabActivePresetAnimation();
      motionLab.intensity = 100;
      motionLab.playback.duration = 500;

      // Reset sliders
      const intensitySlider = document.getElementById('mlIntensity');
      const speedSlider = document.getElementById('mlSpeed');
      const intensityVal = document.getElementById('mlIntensityVal');
      const speedVal = document.getElementById('mlSpeedVal');
      if (intensitySlider) intensitySlider.value = 100;
      if (speedSlider) speedSlider.value = 500;
      if (intensityVal) intensityVal.textContent = '100%';
      if (speedVal) speedVal.textContent = '500ms';

      // Clear inline preview overrides on SVG
      const svgEl = document.querySelector('#mlPreview svg');
      if (svgEl) {
        svgEl.style.transform = '';
        svgEl.style.opacity = '';
        svgEl.querySelectorAll('*').forEach(el => {
          el.style.transform = '';
          el.style.opacity = '';
        });
      }

      // Reset fill and stroke colors to original
      motionLab.fillColor = null;
      motionLab.strokeColor = null;
      const origSvg = document.querySelector('#mlPreview svg');
      if (origSvg && motionLab.svgText) {
        const p = new DOMParser();
        const origDoc = p.parseFromString(motionLab.svgText, 'image/svg+xml');
        const origRoot = origDoc.querySelector('svg');
        if (origRoot) {
          const shapeSel = 'path, circle, rect, polygon, polyline, line, ellipse';
          const origEls = origRoot.querySelectorAll(shapeSel);
          origSvg.querySelectorAll(shapeSel).forEach((el, i) => {
            if (origEls[i]) {
              ['fill', 'stroke'].forEach(attr => {
                const origVal = origEls[i].getAttribute(attr);
                if (origVal) el.setAttribute(attr, origVal);
                else el.removeAttribute(attr);
              });
            }
          });
        }
        origSvg.style.color = '#FFFFFF';
      }

      // Refresh properties panel
      updatePropsPanel();

      showToast('Animation reset');
    });
  }

  // ── Stop / Play button ────────────────────────────────────────
  const playBtn = document.getElementById('mlPlayBtn');
  if (playBtn) {
    playBtn.addEventListener('click', () => {
      const hasAnimation = hasMotionLabAnimationTracks();

      if (!hasAnimation) {
        clearMotionLabActivePresetAnimation();
        return;
      }

      if (motionLab.isStopped) {
        // Resume: re-inject CSS
        motionLab.isStopped = false;
        generateAndInjectCSS({ forcePlay: true });
      } else {
        // Stop: fully clear the active preset-backed animation session
        clearMotionLabActivePresetAnimation();
      }
    });
  }

  // ── Export CSS button ─────────────────────────────────────────
  const exportBtn = document.getElementById('mlExportBtn');
  if (exportBtn) {
    exportBtn.addEventListener('click', async () => {
      const status = await requirePro();
      if (status === 'pro') {
        showExportModal();
      } else if (status === 'free') {
        showLockedExportModal();
      }
    });
  }

  // ── Download SVG button ──────────────────────────────────────
  const downloadBtn = document.getElementById('mlDownloadBtn');
  if (downloadBtn) {
    downloadBtn.addEventListener('click', async () => {
      const svgEl = document.getElementById('mlPreview')?.querySelector('svg');
      if (!svgEl) { showToast('Load an SVG first'); return; }
      const status = await requirePro();
      if (status !== 'pro') {
        if (status === 'free') showLockedExportModal();
        return;
      }
      const svgClone = svgEl.cloneNode(true);
      svgClone.id = 'animated-icon';
      // Strip inline live-preview artifacts from clone
      cleanSvgClone(svgClone);
      // Generate CSS and rewrite selectors for standalone SVG
      const css = buildMotionLabStandaloneSvgCss();
      const styleTag = document.createElementNS('http://www.w3.org/2000/svg', 'style');
      styleTag.textContent = css;
      svgClone.insertBefore(styleTag, svgClone.firstChild);
      downloadFile('animated-icon.svg', svgClone.outerHTML, 'image/svg+xml');
      showToast('SVG downloaded');
    });
  }

  // ── Preset buttons (delegated on stage so all quadrants work) ─
  const controlBar = document.getElementById('mlStage');
  if (controlBar) {
    let savedTracks = null;
    let savedActivePreset = null;
    let savedIsStopped = null;

    // Hover preview: temporarily apply preset on hover
    controlBar.addEventListener('mouseover', (e) => {
      const btn = e.target.closest('[data-preset]');
      if (!btn || motionLab.selectedIds.size === 0) return;
      if (!savedTracks) {
        savedTracks = JSON.parse(JSON.stringify(motionLab.tracks));
        savedActivePreset = motionLab.activePreset;
        savedIsStopped = motionLab.isStopped;
      }
      applyPreset(btn.dataset.preset, true);
    });

    controlBar.addEventListener('mouseout', (e) => {
      const btn = e.target.closest('[data-preset]');
      if (!btn) return;
      if (savedTracks !== null) {
        motionLab.tracks = savedTracks;
        motionLab.activePreset = savedActivePreset;
        motionLab.isStopped = savedIsStopped ?? true;
        savedTracks = null;
        savedActivePreset = null;
        savedIsStopped = null;
        generateAndInjectCSS();
      }

    });

    // Click: toggle preset on/off
    controlBar.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-preset]');
      if (!btn) return;
      if (motionLab.selectedIds.size === 0) {
        showToast('Select an element first');
        return;
      }
      savedTracks = null; // clear stash so mouseout won't revert
      savedActivePreset = null;
      savedIsStopped = null;

      const presetName = btn.dataset.preset;
      const isActive = btn.classList.contains('active');

      // Deselect all preset buttons
      clearMotionLabPresetSelection(controlBar);

      if (isActive) {
        // Toggle off: clear tracks and reset
        clearMotionLabActivePresetAnimation();
      } else {
        // Apply the preset
        btn.classList.add('active');
        applyPreset(presetName);
      }
    });
  }

  // ── Properties panel: live slider preview ─────────────────────
  // Event-delegated on stable parent so re-renders of mlPropsContent
  // don't break the binding
  document.getElementById('mlPropsPanel')?.addEventListener('input', (e) => {
    const input = e.target;
    if (input.tagName !== 'INPUT') return;
    const prop = input.dataset?.prop;
    const selector = input.dataset?.sel;

    // Update adjacent value display
    const valEl = input.closest('.ml__slider-row')?.querySelector('.ml__prop-val');
    if (valEl) {
      valEl.textContent = formatPropDisplay(prop, input.value);
    }

    // Temporarily strip running animation so inline styles take effect,
    // then restore on next frame so CSS animation can resume
    if (selector) {
      const target = document.querySelector(`#mlPreview svg ${selector}`) ||
                     document.querySelector('#mlPreview svg');
      if (target) {
        target.style.animation = 'none';
        // For opacity, keep animation stripped so inline opacity wins.
        // For other props, restore animation on next frame.
        if (prop !== 'opacity') {
          requestAnimationFrame(() => { target.style.animation = ''; });
        }
      }
    }

    // Live preview on SVG canvas
    if (selector) livePreviewProp(selector, prop, input.value);

    // Re-generate CSS when property changes so animation keyframes
    // compose the new base values
    if ((prop === 'scalePct' || prop === 'rotate' || prop === 'opacity') && Object.keys(motionLab.tracks).length) {
      generateAndInjectCSS();
    }

    // Also update reset button's data-current
    const resetBtn = input.closest('.ml__slider-row')?.querySelector('[data-reset-prop]');
    if (resetBtn) resetBtn.dataset.current = input.value;
  });

  // ── Per-control reset buttons ─────────────────────────────────
  document.getElementById('mlPropsPanel')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-reset-prop]');
    if (!btn) return;
    const row = btn.closest('.ml__slider-row');
    if (!row) return;
    const slider = row.querySelector('input[type="range"]');
    if (!slider) return;
    const defaultVal = parseFloat(btn.dataset.default ?? '0');
    slider.value = defaultVal;
    slider.dispatchEvent(new Event('input', { bubbles: true }));
  });

  // ── ML DOM Tooltip (bypasses overflow clipping) ───────────────
  initMLTooltip();
}

/**
 * DOM-based tooltip for Motion Lab controls.
 * Uses a real <div> on document.body so it is never clipped by
 * overflow containers (.ml__props-panel, .ml__rotate-slider, etc.).
 */
function initMLTooltip() {
  let tip = document.getElementById('mlTooltip');
  if (!tip) {
    tip = document.createElement('div');
    tip.id = 'mlTooltip';
    document.body.appendChild(tip);
  }

  const view = document.getElementById('motionLabView');
  if (!view) return;

  let hideTimer = null;

  view.addEventListener('mouseover', (e) => {
    const el = e.target.closest('[data-tip]');
    if (!el) return;
    clearTimeout(hideTimer);
    const text = el.getAttribute('data-tip');
    if (!text) return;
    tip.textContent = text;
    tip.classList.add('visible');
    // Position above the element
    const rect = el.getBoundingClientRect();
    tip.style.left = `${rect.left + rect.width / 2}px`;
    tip.style.top = `${rect.top - 6}px`;
  });

  view.addEventListener('mouseout', (e) => {
    const el = e.target.closest('[data-tip]');
    if (!el) return;
    hideTimer = setTimeout(() => {
      tip.classList.remove('visible');
    }, 50);
  });
}


// ---- Live Preview Helpers ----------------------------------------

/**
 * Format a prop value for display in the properties panel.
 */
function formatPropDisplay(prop, rawVal) {
  const v = parseFloat(rawVal);
  switch (prop) {
    case 'scalePct':   return `${v > 0 ? '+' : ''}${v}%`;
    case 'rotate':     return `${v}deg`;
    case 'opacity':    return v.toFixed(2);
    default:           return rawVal;
  }
}

/**
 * Apply a single property directly to the SVG element in the preview for live feedback.
 * Does NOT create a keyframe - just a transient visual preview.
 */
function livePreviewProp(selector, prop, rawVal) {
  const v = parseFloat(rawVal);
  switch (prop) {
    case 'opacity': {
      const animTarget = getMotionLabAnimTarget();
      if (animTarget) animTarget.style.opacity = String(v);
      break;
    }
    case 'scalePct':
    case 'rotate':
      updateLiveTransform(selector);
      break;
  }
}

/**
 * Read all transform sliders for a selector and apply them as a composite
 * inline transform on the element - used for real-time transform preview.
 */
function updateLiveTransform(selector) {
  const sid = sanitizeSel(selector);
  const scEl = document.getElementById(`slScale_${sid}`);
  const roEl = document.getElementById(`slRot_${sid}`);
  const scPct = scEl ? parseFloat(scEl.value) : 0;
  const sc = 1 + scPct / 100;
  const ro = roEl ? parseFloat(roEl.value) : 0;
  const animTarget = getMotionLabAnimTarget();
  if (!animTarget) return;
  animTarget.style.transform = `scale(${sc}) rotate(${ro}deg)`;
  animTarget.style.transformBox = 'fill-box';
  animTarget.style.transformOrigin = 'center';

  // Apply non-scaling-stroke to keep stroke width constant under scale
  const shapes = animTarget.querySelectorAll('path,circle,rect,line,polyline,polygon,ellipse');
  if (sc !== 1 && shouldUseMotionLabNonScalingStroke()) {
    shapes.forEach(el => { el.setAttribute('vector-effect', 'non-scaling-stroke'); });
  } else {
    shapes.forEach(el => { el.removeAttribute('vector-effect'); });
  }
}

// ---- Preset Engine ----------------------------------------

const PRESETS = MOTION_LAB_PRESETS;

/**
 * Scale preset keyframe numeric values by the current intensity factor.
 * Intensity 100% = original, 50% = half amplitude, 200% = double amplitude.
 * Only scales non-zero, non-identity values (0px, 0deg, scale(1) are neutral - skip those).
 */
function scaleKeyframesByIntensity(keyframes) {
  const factor = (motionLab.intensity ?? 100) / 100;
  if (factor === 1) return keyframes;

  return keyframes.map(kf => {
    const props = {};
    for (const [prop, val] of Object.entries(kf.props)) {
      if (prop === 'transform') {
        // Scale numeric values in transform strings (skip 0 values and identity scale(1))
        props[prop] = val.replace(/(translateX|translateY|rotate)\((-?[\d.]+)(px|deg)\)/g, (m, fn, num, unit) => {
          const n = parseFloat(num);
          if (n === 0) return m;
          return `${fn}(${(n * factor).toFixed(2)}${unit})`;
        }).replace(/scale\(([\d.]+)\)/g, (m, num) => {
          const s = parseFloat(num);
          if (s === 1) return m; // identity - skip
          // Scale the delta from 1 by the factor
          const delta = (s - 1) * factor;
          return `scale(${(1 + delta).toFixed(3)})`;
        });
      } else if (prop === 'opacity') {
        // Fade: scale how transparent it gets (0 → 0, 1 → stay)
        const v = parseFloat(val);
        props[prop] = v === 0 ? String(Math.max(0, 1 - factor).toFixed(2)) : val;
      } else if (prop === 'stroke-dashoffset') {
        const v = parseFloat(val);
        props[prop] = v === 0 ? '0' : String(Math.round(v * factor));
      } else {
        props[prop] = val;
      }
    }
    return { offset: kf.offset, props };
  });
}

function cloneMotionLabPreset(preset) {
  return {
    ...preset,
    keyframes: preset.keyframes.map((kf) => ({
      offset: kf.offset,
      props: { ...kf.props },
    })),
  };
}

function formatMotionLabNumber(value, digits = 3) {
  return parseFloat(value.toFixed(digits)).toString();
}

function scaleMotionLabTransformValue(value, multipliers) {
  return value
    .replace(/translateX\((-?[\d.]+)(px)\)/g, (match, num, unit) => {
      const scaled = parseFloat(num) * multipliers.translate;
      return `translateX(${formatMotionLabNumber(scaled, 2)}${unit})`;
    })
    .replace(/translateY\((-?[\d.]+)(px)\)/g, (match, num, unit) => {
      const scaled = parseFloat(num) * multipliers.translate;
      return `translateY(${formatMotionLabNumber(scaled, 2)}${unit})`;
    })
    .replace(/translate\((-?[\d.]+)px,\s*(-?[\d.]+)px\)/g, (match, x, y) => {
      const scaledX = formatMotionLabNumber(parseFloat(x) * multipliers.translate, 2);
      const scaledY = formatMotionLabNumber(parseFloat(y) * multipliers.translate, 2);
      return `translate(${scaledX}px, ${scaledY}px)`;
    })
    .replace(/rotate\((-?[\d.]+)(deg)\)/g, (match, num, unit) => {
      const n = parseFloat(num);
      if (Math.abs(n) >= 180) return match;
      return `rotate(${formatMotionLabNumber(n * multipliers.rotate, 2)}${unit})`;
    })
    .replace(/scale\(([\d.]+)\)/g, (match, num) => {
      const s = parseFloat(num);
      if (s === 1) return match;
      const next = Math.max(0, 1 + ((s - 1) * multipliers.scale));
      return `scale(${formatMotionLabNumber(next)})`;
    });
}

function scaleMotionLabFilterValue(value, multiplier) {
  return value.replace(/(-?[\d.]+)px/g, (match, num) => {
    const scaled = Math.max(0, parseFloat(num) * multiplier);
    return `${formatMotionLabNumber(scaled, 2)}px`;
  });
}

function adaptPresetForAssetProfile(presetName, preset, profile = motionLab.assetProfile) {
  if (!preset || profile?.kind !== 'single-fill-glyph') return preset;

  const adapted = cloneMotionLabPreset(preset);
  const transformMultipliers = {
    translate: 1.7,
    rotate: 1.25,
    scale: 1.18,
  };
  const filterMultiplier = 1.6;

  adapted.keyframes = adapted.keyframes.map((kf) => {
    const props = { ...kf.props };
    if (props.transform) {
      props.transform = scaleMotionLabTransformValue(props.transform, transformMultipliers);
    }
    if (props.filter) {
      props.filter = scaleMotionLabFilterValue(props.filter, filterMultiplier);
    }
    return { ...kf, props };
  });

  return adapted;
}

function applyPreset(presetName, silent = false) {
  const preset = adaptPresetForAssetProfile(presetName, PRESETS[presetName]);
  if (!preset) return;
  const dur = motionLab.playback.duration;

  // Track active preset for intensity re-application
  motionLab.activePreset = presetName;

  const scaledKeyframes = scaleKeyframesByIntensity(preset.keyframes);

  // Target the SVG root so the entire icon animates as one unit
  const rootSel = '__root__';
  motionLab.tracks[rootSel] = {
    keyframes: scaledKeyframes.map(kf => ({
      offset: kf.offset,
      props: { ...kf.props },
    })),
    easing: preset.easing,
    duration: dur,
  };

  generateAndInjectCSS({ forcePlay: true });
  if (!silent) showToast(`Applied "${presetName}" preset`);
}

/** Compose: merge preset keyframes into existing tracks (Shift+click) */
function composePreset(presetName) {
  const preset = adaptPresetForAssetProfile(presetName, PRESETS[presetName]);
  if (!preset) return;
  const dur = motionLab.playback.duration;

  motionLab.selectedIds.forEach(selector => {
    const track = ensureTrack(selector);
    // Merge each preset keyframe into existing track
    for (const kf of preset.keyframes) {
      const existing = track.keyframes.find(k => Math.abs(k.offset - kf.offset) < 0.01);
      if (existing) {
        // Merge props (existing + new)
        Object.assign(existing.props, { ...kf.props });
      } else {
        track.keyframes.push({ offset: kf.offset, props: { ...kf.props } });
      }
    }
    track.keyframes.sort((a, b) => a.offset - b.offset);
    track.duration = dur;
    // Merge easing only if track didn't have keyframes before
    if (track.keyframes.length === preset.keyframes.length) {
      track.easing = preset.easing;
    }
  });

  renderTimeline();
  generateAndInjectCSS({ forcePlay: true });
  showToast(`Composed "${presetName}" (Shift+click to layer more)`);
}



// ---- Timeline Rendering ----------------------------------------

const TRACK_COLORS = ['#00D4FF', '#FF6B35', '#A855F7', '#22C55E', '#FACC15', '#F472B6', '#38BDF8', '#FB923C'];
const TRACK_HEIGHT = 32;
const TRACK_LABEL_W = 110;
const KF_RADIUS = 5;

function renderTimeline() {
  const tracksEl = document.getElementById('mlTracks');
  if (!tracksEl) return;

  const sels = Array.from(motionLab.selectedIds).filter(s => motionLab.tracks[s]);
  if (sels.length === 0) {
    tracksEl.innerHTML = '<div class="ml__tracks-empty">Select elements and add keyframes</div>';
    return;
  }

  tracksEl.innerHTML = '';

  sels.forEach((selector, i) => {
    const track = motionLab.tracks[selector];
    const color = TRACK_COLORS[i % TRACK_COLORS.length];
    const el = motionLab.elements.find(e => e.selector === selector);
    const label = el ? el.label : selector;

    const row = document.createElement('div');
    row.className = 'ml__track-row';
    row.dataset.selector = selector;

    const labelEl = document.createElement('div');
    labelEl.className = 'ml__track-label';
    labelEl.style.color = color;
    labelEl.textContent = label;

    const laneEl = document.createElement('div');
    laneEl.className = 'ml__track-lane';

    // Render keyframe diamonds
    track.keyframes.forEach((kf, kfIdx) => {
      const diamond = document.createElement('div');
      diamond.className = 'ml__track-kf';
      diamond.style.left = `${kf.offset * 100}%`;
      diamond.style.borderColor = color;
      diamond.title = `${Math.round(kf.offset * 100)}%`;
      diamond.dataset.kfIdx = kfIdx;

      // Click keyframe to select and show its props in panel
      diamond.addEventListener('click', (e) => {
        e.stopPropagation();
        // Populate props panel with this keyframe values
        populatePropsFromKeyframe(selector, kf);
      });
      laneEl.appendChild(diamond);
    });

    // Click on track lane to add keyframe at that position
    laneEl.addEventListener('click', (e) => {
      if (e.target !== laneEl) return;
      const rect = laneEl.getBoundingClientRect();
      const offset = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const props = readPropsFromPanel(selector);
      addKeyframe(selector, parseFloat(offset.toFixed(2)), Object.keys(props).length ? props : { opacity: '1' });
    });

    row.appendChild(labelEl);
    row.appendChild(laneEl);
    tracksEl.appendChild(row);
  });
}

/** Populate the props panel inputs with a keyframe's saved values */
function populatePropsFromKeyframe(selector, kf) {
  const props = kf.props;
  const trySet = (prop, val) => {
    const el = document.querySelector(`[data-prop="${prop}"][data-sel]`);
    if (el) {
      el.value = val;
      if (el.type === 'range') {
        const valEl = el.nextElementSibling;
        if (valEl) valEl.textContent = parseFloat(val).toFixed(2);
      }
    }
  };
  if (props.opacity !== undefined) trySet('opacity', props.opacity);
  if (props['stroke-dashoffset'] !== undefined) trySet('strokeDashoffset', props['stroke-dashoffset']);
  if (props['stroke-width'] !== undefined) trySet('strokeWidth', props['stroke-width']);
  // Decompose transform string back into individual inputs
  if (props.transform) {
    const t = props.transform;
    const tx = t.match(/translateX?\(([^,)]+)/);
    const ty = t.match(/translateY\(([^)]+)/)  || t.match(/translate\([^,]+,([^)]+)/);
    const sc = t.match(/scale\(([^)]+)/);
    const ro = t.match(/rotate\(([^)]+)/);
    if (tx) trySet('translateX', parseFloat(tx[1]));
    if (ty) trySet('translateY', parseFloat(ty[1]));
    if (sc) trySet('scale', parseFloat(sc[1]));
    if (ro) trySet('rotate', parseFloat(ro[1]));
  }
}

// ---- Export Modal ----------------------------------------

function createMotionLabExportModal({ cssContent, svgContent, locked = false }) {
  document.getElementById('mlExportModal')?.remove();

  const modal = document.createElement('div');
  modal.id = 'mlExportModal';
  modal.className = 'ml-modal';
  const codeClass = locked ? 'ml-modal__code ml-modal__code--locked' : 'ml-modal__code';
  const cssActions = locked ? '' : `
    <div class="ml-modal__actions">
      <button class="ml-modal__action-btn" id="mlCopyCss">
        <span class="material-symbols-outlined" style="font-size:16px">content_copy</span> Copy CSS
      </button>
      <button class="ml-modal__action-btn" id="mlDownloadCss">
        <span class="material-symbols-outlined" style="font-size:16px">download</span> Download .css
      </button>
    </div>
  `;
  const svgActions = locked ? '' : `
    <div class="ml-modal__actions">
      <button class="ml-modal__action-btn" id="mlCopySvg">
        <span class="material-symbols-outlined" style="font-size:16px">content_copy</span> Copy SVG
      </button>
      <button class="ml-modal__action-btn" id="mlDownloadSvg">
        <span class="material-symbols-outlined" style="font-size:16px">download</span> Download .svg
      </button>
    </div>
  `;
  const upgradeBanner = locked ? `
    <div class="ml-modal__upgrade si-upsell">
      <div class="si-upsell__eyebrow">Pro feature</div>
      <div class="si-upsell__title">Export animations with Pro</div>
      <p class="si-upsell__body">Preview every preset for free, then subscribe to copy CSS or download the final animated SVG.</p>
      ${getUpgradeCtasMarkup()}
      <button class="si-upsell__dismiss" data-upsell-dismiss>Maybe Later</button>
    </div>
  ` : '';

  modal.innerHTML = `
    <div class="ml-modal__backdrop"></div>
    <div class="ml-modal__box">
      <div class="ml-modal__header">
        <span>Export Animation</span>
        <button class="ml-modal__close" id="mlModalClose">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>
      <div class="ml-modal__tabs">
        <button class="ml-modal__tab ml-modal__tab--active" data-tab="css">CSS</button>
        <button class="ml-modal__tab" data-tab="svg">Self-contained SVG</button>
      </div>
      <div class="ml-modal__body">
        <div class="ml-modal__tab-content" data-tab-panel="css">
          <pre class="${codeClass}" id="mlCssOutput">${escapeHtml(cssContent)}</pre>
          ${cssActions}
        </div>
        <div class="ml-modal__tab-content" data-tab-panel="svg" style="display:none">
          <pre class="${codeClass}" id="mlSvgOutput">${escapeHtml(svgContent)}</pre>
          ${svgActions}
        </div>
      </div>
      ${upgradeBanner}
    </div>
  `;
  document.body.appendChild(modal);

  modal.querySelectorAll('.ml-modal__tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const activeTab = tab.dataset.tab;
      modal.querySelectorAll('.ml-modal__tab').forEach(t => t.classList.toggle('ml-modal__tab--active', t === tab));
      modal.querySelectorAll('[data-tab-panel]').forEach(panel => {
        panel.style.display = panel.dataset.tabPanel === activeTab ? '' : 'none';
      });
    });
  });

  modal.querySelector('#mlModalClose')?.addEventListener('click', () => modal.remove());
  modal.querySelector('.ml-modal__backdrop')?.addEventListener('click', () => modal.remove());

  if (locked) {
    modal.querySelector('[data-upsell-dismiss]')?.addEventListener('click', () => modal.remove());
    wireUpgradeCtas(modal, () => modal.remove());
  }

  return modal;
}

function showExportModal() {
  const rawCSS = generateFullCSS();
  const cleanCSS = rawCSS
    ? buildMotionLabExternalCss()
    : '/* No animations defined yet */';

  // Self-contained SVG tab
  const svgEl = document.getElementById('mlPreview')?.querySelector('svg');
  let svgExport = '';
  if (svgEl) {
    const svgClone = svgEl.cloneNode(true);
    svgClone.id = 'animated-icon';
    // Strip inline live-preview artifacts from clone
    cleanSvgClone(svgClone);
    // Rewrite selectors for self-contained SVG
    const standaloneCSS = buildMotionLabStandaloneSvgCss();
    const styleTag = document.createElementNS('http://www.w3.org/2000/svg', 'style');
    styleTag.textContent = standaloneCSS;
    svgClone.insertBefore(styleTag, svgClone.firstChild);
    svgExport = sanitizeSvgExportMarkup(svgClone.outerHTML, { preserveBranding: true });
  }

  const modal = createMotionLabExportModal({
    cssContent: cleanCSS,
    svgContent: svgExport || '<!-- Load an SVG first -->',
  });

  modal.querySelector('#mlCopyCss')?.addEventListener('click', () => {
    navigator.clipboard.writeText(cleanCSS).then(() => showToast('CSS copied!'));
  });

  modal.querySelector('#mlDownloadCss')?.addEventListener('click', () => {
    downloadFile('animation.css', cleanCSS, 'text/css');
  });

  modal.querySelector('#mlCopySvg')?.addEventListener('click', () => {
    navigator.clipboard.writeText(svgExport).then(() => showToast('SVG copied!'));
  });

  modal.querySelector('#mlDownloadSvg')?.addEventListener('click', () => {
    downloadFile('animated-icon.svg', svgExport, 'image/svg+xml');
  });
}

function showLockedExportModal() {
  createMotionLabExportModal({
    cssContent: MOTION_LAB_LOCKED_CSS,
    svgContent: MOTION_LAB_LOCKED_SVG,
    locked: true,
  });
}

function downloadFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function showUpgradePrompt(anchorEl, context) {
  closeUpgradePrompt();
  if (!anchorEl) return null;

  const prompt = document.createElement('div');
  prompt.className = 'conv__upgrade-prompt si-upsell';
  prompt.setAttribute('role', 'dialog');
  prompt.setAttribute('aria-live', 'polite');
  prompt.innerHTML = `
    <div class="si-upsell__eyebrow">Pro feature</div>
    <div class="si-upsell__title">Exporting ${escapeHtml(context)} requires Pro</div>
    <p class="si-upsell__body">Keep previewing and adjusting settings for free. Subscribe to download files or copy the converted output.</p>
    ${getUpgradeCtasMarkup()}
    <button class="si-upsell__dismiss" data-upsell-dismiss>Maybe Later</button>
  `;
  document.body.appendChild(prompt);

  const positionPrompt = () => {
    if (!document.body.contains(prompt)) return;
    const rect = anchorEl.getBoundingClientRect();
    const promptWidth = prompt.offsetWidth || 320;
    const promptHeight = prompt.offsetHeight || 0;
    let left = Math.min(rect.left, window.innerWidth - promptWidth - 12);
    left = Math.max(12, left);
    let top = rect.bottom + 12;
    if (top + promptHeight > window.innerHeight - 12) {
      top = Math.max(12, rect.top - promptHeight - 12);
    }
    prompt.style.left = `${Math.round(left)}px`;
    prompt.style.top = `${Math.round(top)}px`;
  };

  const handleOutsideClick = (e) => {
    if (prompt.contains(e.target) || anchorEl.contains(e.target)) return;
    closeUpgradePrompt();
  };
  const handleEscape = (e) => {
    if (e.key === 'Escape') closeUpgradePrompt();
  };
  const cleanup = () => {
    document.removeEventListener('mousedown', handleOutsideClick, true);
    document.removeEventListener('keydown', handleEscape);
    window.removeEventListener('resize', positionPrompt);
    window.removeEventListener('scroll', positionPrompt, true);
    prompt.remove();
  };

  removeUpgradePrompt = cleanup;
  positionPrompt();
  document.addEventListener('mousedown', handleOutsideClick, true);
  document.addEventListener('keydown', handleEscape);
  window.addEventListener('resize', positionPrompt);
  window.addEventListener('scroll', positionPrompt, true);
  prompt.querySelector('[data-upsell-dismiss]')?.addEventListener('click', () => closeUpgradePrompt());
  wireUpgradeCtas(prompt, () => closeUpgradePrompt());
  return prompt;
}

// ── Converter ────────────────────────────────────────────────

// Debounce helper for expensive re-traces
function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}
const debouncedRunConversion = debounce(() => runConversion(), 400);

const converterState = {
  mode: 'svg-to-png',   // 'svg-to-png' | 'png-to-svg'
  svgText: '',
  svgPreparedText: '',
  svgRasterAdvice: null,
  pngBlob: null,
  pngDataUrl: '',
  outputBlob: null,
  outputDataUrl: '',
  // SVG→PNG options
  size: 64,
  background: 'transparent', // 'transparent' | 'white' | 'custom'
  bgColor: '#ffffff',
  padding: 8,
  quality: 1,
  fillColor: null,
  strokeColor: null,
  paintSupport: {
    supportsFill: false,
    supportsStroke: false,
    mode: 'unknown',
    fillCount: 0,
    strokeCount: 0,
  },
  // PNG→SVG options
  threshold: 128,
  assetMode: 'logo',
  preset: 'auto',
  exportSizeMode: 'auto', // 'auto' | 'original' | 'custom'
  exportTargetWidth: 512,
  smoothness: 50,        // 0-100: curve smoothness (trace resolution + path tolerance)
  previewBackground: 'transparent', // 'transparent' | 'white' | 'black' | 'custom'
  previewBgColor: '#ffffff',
  compareMode: 'trace', // 'trace' | 'split'
  autoCrop: true,
  enhanceSmallIcons: true,
  noiseCleanup: 'medium', // 'low' | 'medium' | 'high'
  invert: false,
  previewOriginalDataUrl: '',
  traceMetrics: null,
  traceAdvice: null,
  outputPreviewSize: null,
  outputExportSize: null,
  inputZoom: 1,
  outputZoom: 1,
  labStrategy: 'stable',
  labLastTraceRoute: '',
  labLastTraceClass: '',
  labLastServiceRequestedColorMode: '',
  labLastServiceQualityMode: '',
};

function createDefaultConverterState() {
  return {
    mode: 'svg-to-png',
    svgText: '',
    svgPreparedText: '',
    svgRasterAdvice: null,
    pngBlob: null,
    pngDataUrl: '',
    outputBlob: null,
    outputDataUrl: '',
    size: 64,
    background: 'transparent',
    bgColor: '#ffffff',
    padding: 8,
    quality: 1,
    fillColor: null,
    strokeColor: null,
    paintSupport: {
      supportsFill: false,
      supportsStroke: false,
      mode: 'unknown',
      fillCount: 0,
      strokeCount: 0,
    },
    threshold: 128,
    assetMode: 'logo',
    preset: 'auto',
    exportSizeMode: 'auto',
    exportTargetWidth: 512,
    smoothness: 50,
    previewBackground: 'transparent',
    previewBgColor: '#ffffff',
    compareMode: 'trace',
    autoCrop: true,
    enhanceSmallIcons: true,
    noiseCleanup: 'medium',
    invert: false,
    previewOriginalDataUrl: '',
    traceMetrics: null,
    traceAdvice: null,
    outputPreviewSize: null,
    outputExportSize: null,
    inputZoom: 1,
    outputZoom: 1,
    labStrategy: 'stable',
    labLastTraceRoute: '',
    labLastTraceClass: '',
    labLastServiceRequestedColorMode: '',
    labLastServiceQualityMode: '',
  };
}

function cloneConverterStateSnapshot(source) {
  return {
    ...source,
    paintSupport: source.paintSupport ? { ...source.paintSupport } : { ...createDefaultConverterState().paintSupport },
    traceMetrics: source.traceMetrics ? { ...source.traceMetrics } : null,
    traceAdvice: source.traceAdvice ? { ...source.traceAdvice } : null,
    outputPreviewSize: source.outputPreviewSize ? { ...source.outputPreviewSize } : null,
    outputExportSize: source.outputExportSize ? { ...source.outputExportSize } : null,
  };
}

function applyConverterStateSnapshot(snapshot) {
  const next = {
    ...createDefaultConverterState(),
    ...cloneConverterStateSnapshot(snapshot),
  };
  Object.assign(converterState, next);
}

const converterStableState = cloneConverterStateSnapshot(converterState);
const converterLabState = cloneConverterStateSnapshot(createDefaultConverterState());

const CONVERTER_SVG_NS = 'http://www.w3.org/2000/svg';
const CONVERTER_SVG_SHAPES = 'path, circle, rect, polygon, polyline, line, ellipse';
const CONVERTER_SVG_FILL_TARGETS = `${CONVERTER_SVG_SHAPES}, text, tspan`;
const CONVERTER_COLOR_SWATCHES = ['#000000', '#FFFFFF', '#FF6B35', '#00D4FF', '#A855F7', '#22C55E', '#FACC15'];
const CONVERTER_BOUNDS_PATH_D = 'm00h24v24h0z';
const CONVERTER_TRANSPARENT_BG_SENTINEL = [255, 0, 255];
const CONVERTER_PROOF_SERVICE_URL = import.meta.env.VITE_CONVERTER_PROOF_URL || (import.meta.env.DEV ? 'http://127.0.0.1:4318/api/convert/png-to-svg' : '');
const CONVERTER_PROOF_SERVICE_REQUIRED = Boolean(CONVERTER_PROOF_SERVICE_URL);
const CONVERTER_COMPARE_OPTIONS = [
  { key: 'trace', label: 'Default' },
  { key: 'split', label: 'Split' },
];
const CONVERTER_NOISE_OPTIONS = [
  { key: 'low', label: 'Low' },
  { key: 'medium', label: 'Medium' },
  { key: 'high', label: 'High' },
];
const CONVERTER_PREVIEW_ZOOM_MIN = 1;
const CONVERTER_PREVIEW_ZOOM_MAX = 2;
const CONVERTER_PREVIEW_ZOOM_STEP = 0.1;
let converterMonoEngineReady = null;
let converterInputObjectUrl = '';
let converterOutputObjectUrl = '';

function revokeConverterObjectUrl(url) {
  if (!url || typeof url !== 'string' || !url.startsWith('blob:')) return;
  URL.revokeObjectURL(url);
}

function replaceConverterInputObjectUrl(nextUrl = '') {
  if (converterInputObjectUrl && converterInputObjectUrl !== nextUrl) {
    revokeConverterObjectUrl(converterInputObjectUrl);
  }
  converterInputObjectUrl = nextUrl && nextUrl.startsWith('blob:') ? nextUrl : '';
}

function replaceConverterOutputObjectUrl(nextUrl = '') {
  if (converterOutputObjectUrl && converterOutputObjectUrl !== nextUrl) {
    revokeConverterObjectUrl(converterOutputObjectUrl);
  }
  converterOutputObjectUrl = nextUrl && nextUrl.startsWith('blob:') ? nextUrl : '';
}

function renderConverterColorDotRow(type, activeColor, disabled = false) {
  const disabledAttrs = disabled ? ' disabled aria-disabled="true"' : '';
  let html = `<button type="button" class="conv__color-dot conv__color-dot--original${!activeColor ? ' conv__color-dot--active' : ''}${disabled ? ' is-disabled' : ''}" data-conv-color="" data-conv-color-kind="${type}" data-tip="Default"${disabledAttrs}></button>`;
  CONVERTER_COLOR_SWATCHES.forEach((color) => {
    html += `<button type="button" class="conv__color-dot${activeColor === color ? ' conv__color-dot--active' : ''}${disabled ? ' is-disabled' : ''}" data-conv-color="${color}" data-conv-color-kind="${type}" data-tip="${color}" style="background:${color}"${disabledAttrs}></button>`;
  });
  html += `<label class="conv__color-add${disabled ? ' is-disabled' : ''}" data-tip="Custom color">
    <span class="material-symbols-outlined" style="font-size:14px">add</span>
    <input type="color" class="conv__color-picker-hidden" id="conv${type}Picker" value="${activeColor || '#FFFFFF'}"${disabled ? ' disabled' : ''}>
  </label>`;
  return html;
}

function renderConverterChipGroup(groupId, options, activeKey, dataAttr) {
  return options.map((option) => `
    <button
      type="button"
      class="conv__chip-btn${option.key === activeKey ? ' conv__chip-btn--active' : ''}"
      data-${dataAttr}="${option.key}"
      data-conv-group="${groupId}"
    >${option.label}</button>
  `).join('');
}

function getConverterPresetLabel(preset) {
  if (preset === 'auto') return 'Auto';
  if (preset === 'detailed') return 'Exact';
  if (preset === 'default') return 'Balanced';
  return 'Compact';
}

function getConverterDefaultExportLongestEdge(assetMode = 'logo') {
  return assetMode === 'icon' ? 128 : 512;
}

function clampConverterExportTargetWidth(value, assetMode = 'logo') {
  const fallback = getConverterDefaultExportLongestEdge(assetMode);
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(16, Math.min(4096, Math.round(parsed)));
}

function getConverterExportSize({
  assetMode = 'logo',
  cropWidth,
  cropHeight,
  exportSizeMode = 'auto',
  exportTargetWidth = null,
}) {
  const safeCropWidth = Math.max(1, Math.round(cropWidth || 1));
  const safeCropHeight = Math.max(1, Math.round(cropHeight || 1));

  if (exportSizeMode === 'original') {
    return { width: safeCropWidth, height: safeCropHeight };
  }

  if (exportSizeMode === 'custom') {
    const width = clampConverterExportTargetWidth(exportTargetWidth, assetMode);
    return {
      width,
      height: Math.max(1, Math.round((width * safeCropHeight) / safeCropWidth)),
    };
  }

  const targetLongestEdge = getConverterDefaultExportLongestEdge(assetMode);
  if (safeCropWidth >= safeCropHeight) {
    return {
      width: targetLongestEdge,
      height: Math.max(1, Math.round((targetLongestEdge * safeCropHeight) / safeCropWidth)),
    };
  }
  return {
    width: Math.max(1, Math.round((targetLongestEdge * safeCropWidth) / safeCropHeight)),
    height: targetLongestEdge,
  };
}

function getConverterRequestedColorMode(assetMode = 'logo') {
  return assetMode === 'icon' ? 'mono' : 'color';
}

function getConverterServiceQualityMode(preset, assetMode = 'logo') {
  if (preset === 'posterized2') return 'compact';
  if (preset === 'detailed') return 'exact';
  if (preset === 'auto') return assetMode === 'icon' ? 'compact' : 'auto';
  return 'exact';
}

function resolveConverterPreset(preset, traceProfile, requestedColorMode) {
  if (preset !== 'auto') return preset;
  if (traceProfile?.likelyTinyLineIcon || traceProfile?.likelySingleColorMark) return 'detailed';
  if (requestedColorMode === 'mono' || traceProfile?.likelySingleHueLogo) return 'detailed';
  const likelyChromaticFlatArtwork = (
    traceProfile?.likelyFlatArtwork
    && traceProfile?.neutralCoverage < 0.14
    && traceProfile?.chromaticCoverage > 0.82
  );
  if (likelyChromaticFlatArtwork) return 'detailed';
  if (traceProfile?.likelyFlatArtwork) return 'posterized2';
  return 'default';
}

function normalizeConverterPathData(d = '') {
  return String(d).replace(/\s+/g, '').toLowerCase();
}

function getConverterInheritedPaint(el, attrName) {
  let ancestor = el.parentElement;
  while (ancestor) {
    const val = (ancestor.getAttribute(attrName) || '').trim().toLowerCase();
    if (val) return val;
    ancestor = ancestor.parentElement;
  }
  return '';
}

function isConverterVisibleFillTarget(el) {
  if (!el) return false;
  const ownFill = (el.getAttribute('fill') || '').trim().toLowerCase();
  if (ownFill === 'none') return false;
  if (ownFill) return true;

  const inheritedFill = getConverterInheritedPaint(el, 'fill');
  if (inheritedFill === 'none') return false;
  if (inheritedFill) return true;

  // SVG defaults to visible black fill when no fill is specified.
  return true;
}

function isConverterVisibleStrokeTarget(el) {
  if (!el) return false;
  const ownStroke = (el.getAttribute('stroke') || '').trim().toLowerCase();
  if (ownStroke === 'none') return false;
  if (
    ownStroke === 'none' &&
    el.tagName?.toLowerCase() === 'path' &&
    normalizeConverterPathData(el.getAttribute('d')) === CONVERTER_BOUNDS_PATH_D
  ) {
    return false;
  }
  if (ownStroke) return true;

  const inheritedStroke = getConverterInheritedPaint(el, 'stroke');
  if (inheritedStroke === 'none') return false;
  if (inheritedStroke) return true;

  return false;
}

function analyzeConverterSvgPaintSupport(svgText) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgText, 'image/svg+xml');
  const svgEl = doc.querySelector('svg');
  if (!svgEl) {
    return { supportsFill: false, supportsStroke: false, mode: 'unknown', fillCount: 0, strokeCount: 0 };
  }

  let fillCount = 0;
  let strokeCount = 0;
  doc.querySelectorAll(CONVERTER_SVG_FILL_TARGETS).forEach((el) => {
    if (isConverterVisibleFillTarget(el)) fillCount += 1;
  });
  doc.querySelectorAll(CONVERTER_SVG_SHAPES).forEach((el) => {
    if (isConverterVisibleStrokeTarget(el)) strokeCount += 1;
  });

  let mode = 'unknown';
  if (fillCount > 0 && strokeCount > 0) mode = 'mixed';
  else if (fillCount > 0) mode = 'fill-only';
  else if (strokeCount > 0) mode = 'stroke-only';

  return {
    supportsFill: fillCount > 0,
    supportsStroke: strokeCount > 0,
    mode,
    fillCount,
    strokeCount,
  };
}

function sanitizeConverterSvg(svgEl) {
  svgEl.querySelectorAll('script, foreignObject').forEach((node) => node.remove());
  svgEl.querySelectorAll('*').forEach((node) => {
    Array.from(node.attributes).forEach((attr) => {
      if (/^on/i.test(attr.name)) {
        node.removeAttribute(attr.name);
      }
    });
  });
}

function inspectConverterSvgRasterRisks(svgText) {
  const hasExternalFontImport = /@import\s+url\((['"]?)https?:\/\/[^)]+\1\)/i.test(svgText);
  const hasRemoteUrlReference = /url\((['"]?)https?:\/\/[^)]+\1\)/i.test(svgText);
  const hasExternalImageHref = /<(?:image|feImage)\b[^>]+(?:href|xlink:href)=["']https?:\/\//i.test(svgText);
  const hasTextNode = /<text[\s>]/i.test(svgText);

  return {
    hasExternalFontImport,
    hasRemoteUrlReference,
    hasExternalImageHref,
    hasTextNode,
    riskCount: [hasExternalFontImport, hasRemoteUrlReference, hasExternalImageHref].filter(Boolean).length,
  };
}

function stripConverterSvgImportRules(styleText) {
  return styleText.replace(/@import\s+url\((['"]?)https?:\/\/[^)]+\1\)\s*;?/gi, '');
}

function stripConverterSvgExternalFontImports(svgText) {
  let normalized = false;
  const nextSvg = svgText.replace(/<style\b([^>]*)>([\s\S]*?)<\/style>/gi, (fullMatch, attrs, cssText) => {
    const nextCss = stripConverterSvgImportRules(cssText);
    if (nextCss === cssText) return fullMatch;
    normalized = true;
    const trimmedCss = nextCss.trim();
    return trimmedCss ? `<style${attrs}>${trimmedCss}</style>` : '';
  });

  if (normalized) {
    return {
      svgText: nextSvg,
      normalized: true,
    };
  }

  const globallyStripped = stripConverterSvgImportRules(svgText);
  return {
    svgText: globallyStripped,
    normalized: globallyStripped !== svgText,
  };
}

function setConverterInlinePaintStyle(el, propertyName, value) {
  if (!el) return;
  const currentStyle = (el.getAttribute('style') || '').trim();
  const withoutProperty = currentStyle
    .replace(new RegExp(`(?:^|;)\\s*${propertyName}\\s*:[^;]*`, 'gi'), '')
    .replace(/^;\s*|\s*;$/g, '')
    .trim();
  const nextStyle = withoutProperty
    ? `${withoutProperty}; ${propertyName}: ${value};`
    : `${propertyName}: ${value};`;
  el.setAttribute('style', nextStyle);
}

function prepareConverterSvgForRasterization(svgText) {
  if (!svgText) {
    return {
      svgText,
      normalized: false,
      advice: null,
      risks: inspectConverterSvgRasterRisks(''),
    };
  }

  const risks = inspectConverterSvgRasterRisks(svgText);
  if (!risks.hasExternalFontImport) {
    return {
      svgText,
      normalized: false,
      advice: null,
      risks,
    };
  }

  const normalized = stripConverterSvgExternalFontImports(svgText);
  const nextSvgText = normalized.normalized ? normalized.svgText : svgText;
  return {
    svgText: nextSvgText,
    normalized: normalized.normalized,
    advice: {
      tone: 'warn',
      text: risks.hasTextNode
        ? 'External web font imports were removed so this SVG can render. The PNG may use a fallback font unless the text is converted to paths.'
        : 'External web font imports were removed so this SVG can render reliably in the browser export path.',
    },
    risks,
  };
}

function applyConverterFillOverrides(svgEl) {
  if (!converterState.fillColor) return;
  svgEl.querySelectorAll(CONVERTER_SVG_FILL_TARGETS).forEach((el) => {
    if (!isConverterVisibleFillTarget(el)) return;
    el.setAttribute('fill', converterState.fillColor);
    setConverterInlinePaintStyle(el, 'fill', converterState.fillColor);
  });
}

function applyConverterStrokeOverrides(svgEl) {
  if (!converterState.strokeColor) return;
  svgEl.querySelectorAll(CONVERTER_SVG_SHAPES).forEach((el) => {
    if (!isConverterVisibleStrokeTarget(el)) return;
    el.setAttribute('stroke', converterState.strokeColor);
    setConverterInlinePaintStyle(el, 'stroke', converterState.strokeColor);
  });
}

function appendConverterPaintOverrideStyle(doc, svgEl) {
  const rules = [];
  if (converterState.fillColor) {
    rules.push(`text, tspan { fill: ${converterState.fillColor} !important; }`);
  }
  if (!rules.length) return;
  const styleEl = doc.createElementNS('http://www.w3.org/2000/svg', 'style');
  styleEl.setAttribute('data-conv-paint-override', 'true');
  styleEl.textContent = rules.join('\n');
  svgEl.appendChild(styleEl);
}

function buildStyledConverterSvg({ width = null, height = null } = {}) {
  const sourceSvg = converterState.svgPreparedText || converterState.svgText;
  if (!sourceSvg) return null;

  const parser = new DOMParser();
  const doc = parser.parseFromString(sourceSvg, 'image/svg+xml');
  const svgEl = doc.querySelector('svg');
  if (!svgEl) return null;

  sanitizeConverterSvg(svgEl);
  applyConverterFillOverrides(svgEl);
  applyConverterStrokeOverrides(svgEl);
  appendConverterPaintOverrideStyle(doc, svgEl);

  if (width != null) svgEl.setAttribute('width', width);
  if (height != null) svgEl.setAttribute('height', height);

  const serializer = new XMLSerializer();
  return serializer.serializeToString(svgEl);
}

function syncConverterChipGroup(groupId, activeKey, dataAttr) {
  document.querySelectorAll(`.conv__chip-btn[data-conv-group="${groupId}"]`).forEach((btn) => {
    btn.classList.toggle('conv__chip-btn--active', btn.dataset[dataAttr] === activeKey);
  });
}

function syncConverterColorDots(containerId, activeColor) {
  const dots = document.getElementById(containerId);
  if (!dots) return;
  dots.querySelectorAll('.conv__color-dot').forEach((dot) => dot.classList.remove('conv__color-dot--active'));
  if (!activeColor) {
    dots.querySelector('.conv__color-dot[data-conv-color=""]')?.classList.add('conv__color-dot--active');
    return;
  }
  dots.querySelector(`.conv__color-dot[data-conv-color="${activeColor}"]`)?.classList.add('conv__color-dot--active');
}

function setConverterColorRowDisabled(containerId, disabled) {
  const row = document.getElementById(containerId);
  if (!row) return;
  row.classList.toggle('is-disabled', disabled);
  row.querySelectorAll('button, input[type="color"]').forEach((control) => {
    control.disabled = disabled;
    control.setAttribute('aria-disabled', disabled ? 'true' : 'false');
  });
}

function updateConverterSvgUiState() {
  const fillPicker = document.getElementById('convFillPicker');
  const strokePicker = document.getElementById('convStrokePicker');
  if (fillPicker) fillPicker.value = converterState.fillColor || '#FFFFFF';
  if (strokePicker) strokePicker.value = converterState.strokeColor || '#FFFFFF';
  syncConverterColorDots('convFillDots', converterState.fillColor);
  syncConverterColorDots('convStrokeDots', converterState.strokeColor);
  setConverterColorRowDisabled('convFillDots', !converterState.paintSupport.supportsFill);
  setConverterColorRowDisabled('convStrokeDots', !converterState.paintSupport.supportsStroke);
  updateConverterLabSummary();
}

function resetConverterSvgStyleState() {
  converterState.fillColor = null;
  converterState.strokeColor = null;
}

function resetConverterPngStyleState() {
  converterState.previewBackground = 'transparent';
  converterState.previewBgColor = '#ffffff';
  converterState.compareMode = 'trace';
  converterState.autoCrop = true;
  converterState.exportSizeMode = 'auto';
  converterState.exportTargetWidth = getConverterDefaultExportLongestEdge(converterState.assetMode || 'logo');
  converterState.enhanceSmallIcons = true;
  converterState.noiseCleanup = 'medium';
  converterState.invert = false;
  converterState.previewOriginalDataUrl = '';
  converterState.traceMetrics = null;
  converterState.outputPreviewSize = null;
  converterState.outputExportSize = null;
}

function clampConverterPreviewZoom(value) {
  const stepped = Math.round(value / CONVERTER_PREVIEW_ZOOM_STEP) * CONVERTER_PREVIEW_ZOOM_STEP;
  return Math.max(CONVERTER_PREVIEW_ZOOM_MIN, Math.min(CONVERTER_PREVIEW_ZOOM_MAX, stepped));
}

function getConverterPreviewZoomPercent(zoom) {
  return `${Math.round(zoom * 100)}%`;
}

function getConverterOutputPreviewBaseScale(previewSize, {
  compareMode = 'trace',
  stageWidth = 230,
  stageHeight = 190,
} = {}) {
  if (!previewSize) return 1;
  const paneCount = compareMode === 'split' ? 2 : 1;
  const maxPreviewWidth = Math.max(1, Math.floor(stageWidth / paneCount) - 20);
  const maxPreviewHeight = Math.max(1, stageHeight - 20);
  return Math.min(
    1,
    maxPreviewWidth / Math.max(1, previewSize.width),
    maxPreviewHeight / Math.max(1, previewSize.height),
  );
}

function centerConverterPreviewViewport(viewport) {
  if (!viewport) return;
  viewport.scrollLeft = Math.max(0, (viewport.scrollWidth - viewport.clientWidth) / 2);
  viewport.scrollTop = Math.max(0, (viewport.scrollHeight - viewport.clientHeight) / 2);
}

function updateConverterPreviewZoomUi({ center = false } = {}) {
  const inputStage = document.getElementById('convInputStage');
  const inputSurface = document.getElementById('convInputSurface');
  const inputImg = document.getElementById('convInputImg');
  const outputStage = document.getElementById('convPreviewStage');
  const outputOverlay = document.getElementById('convCompareOverlay');
  const outputSplit = document.getElementById('convCompareSplit');
  const originalOverlayImg = document.getElementById('convOriginalOverlayImg');
  const outputOverlayImg = document.getElementById('convOutputOverlayImg');
  const originalSplitImg = document.getElementById('convOriginalSplitImg');
  const outputSplitImg = document.getElementById('convOutputSplitImg');

  if (inputSurface) {
    const inputPercent = getConverterPreviewZoomPercent(converterState.inputZoom);
    inputSurface.style.width = inputPercent;
    inputSurface.style.minHeight = `${Math.round(190 * converterState.inputZoom)}px`;
  }
  if (inputStage) {
    inputStage.classList.toggle('is-pannable', converterState.inputZoom > CONVERTER_PREVIEW_ZOOM_MIN);
  }
  if (inputImg) {
    inputImg.style.maxHeight = `${Math.round(180 * converterState.inputZoom)}px`;
  }

  const previewSize = converterState.mode === 'png-to-svg' ? converterState.outputPreviewSize : null;
  const previewCompareMode = converterState.mode === 'png-to-svg' && converterState.compareMode === 'split'
    ? 'split'
    : 'trace';
  const outputPreviewScale = previewSize
    ? getConverterOutputPreviewBaseScale(previewSize, {
      compareMode: previewCompareMode,
      stageWidth: outputStage?.clientWidth || 230,
      stageHeight: outputStage?.clientHeight || 190,
    })
    : 1;
  const outputPixelWidth = previewSize
    ? Math.max(1, Math.round(previewSize.width * outputPreviewScale * converterState.outputZoom))
    : null;
  const outputPixelHeight = previewSize
    ? Math.max(1, Math.round(previewSize.height * outputPreviewScale * converterState.outputZoom))
    : null;

  if (outputOverlay) {
    if (outputPixelWidth && outputPixelHeight) {
      outputOverlay.style.width = `${outputPixelWidth}px`;
      outputOverlay.style.height = `${outputPixelHeight}px`;
      outputOverlay.style.minHeight = `${outputPixelHeight}px`;
    } else {
      const outputPercent = getConverterPreviewZoomPercent(converterState.outputZoom);
      outputOverlay.style.width = outputPercent;
      outputOverlay.style.height = outputPercent;
      outputOverlay.style.minHeight = `${Math.round(190 * converterState.outputZoom)}px`;
    }
  }
  if (outputSplit) {
    if (outputPixelWidth && outputPixelHeight) {
      outputSplit.style.width = `${outputPixelWidth * 2}px`;
      outputSplit.style.height = `${outputPixelHeight}px`;
      outputSplit.style.minHeight = `${outputPixelHeight}px`;
    } else {
      const outputPercent = getConverterPreviewZoomPercent(converterState.outputZoom);
      outputSplit.style.width = outputPercent;
      outputSplit.style.height = outputPercent;
      outputSplit.style.minHeight = `${Math.round(190 * converterState.outputZoom)}px`;
    }
  }
  [originalOverlayImg, outputOverlayImg, originalSplitImg, outputSplitImg].forEach((img) => {
    if (!img) return;
    if (outputPixelWidth && outputPixelHeight) {
      img.style.width = `${outputPixelWidth}px`;
      img.style.height = `${outputPixelHeight}px`;
      img.style.maxWidth = 'none';
      img.style.maxHeight = 'none';
    } else {
      img.style.width = '';
      img.style.height = '';
      img.style.maxWidth = '';
      img.style.maxHeight = '';
    }
  });
  if (outputSplit) {
    outputSplit.querySelectorAll('.conv__compare-pane').forEach((pane) => {
      if (outputPixelWidth && outputPixelHeight) {
        pane.style.width = `${outputPixelWidth}px`;
        pane.style.height = `${outputPixelHeight}px`;
        pane.style.minWidth = `${outputPixelWidth}px`;
        pane.style.minHeight = `${outputPixelHeight}px`;
      } else {
        pane.style.width = '';
        pane.style.height = '';
        pane.style.minWidth = '';
        pane.style.minHeight = '';
      }
    });
  }
  if (outputStage) {
    outputStage.classList.toggle('is-pannable', converterState.outputZoom > CONVERTER_PREVIEW_ZOOM_MIN);
  }

  if (center) {
    requestAnimationFrame(() => {
      centerConverterPreviewViewport(inputStage);
      centerConverterPreviewViewport(outputStage);
    });
  }
}

function setConverterPreviewZoom(kind, direction) {
  const key = kind === 'output' ? 'outputZoom' : 'inputZoom';
  const viewport = document.getElementById(kind === 'output' ? 'convPreviewStage' : 'convInputStage');
  const centerX = viewport && viewport.scrollWidth > 0
    ? (viewport.scrollLeft + viewport.clientWidth / 2) / viewport.scrollWidth
    : 0.5;
  const centerY = viewport && viewport.scrollHeight > 0
    ? (viewport.scrollTop + viewport.clientHeight / 2) / viewport.scrollHeight
    : 0.5;
  const delta = direction === 'in' ? CONVERTER_PREVIEW_ZOOM_STEP : -CONVERTER_PREVIEW_ZOOM_STEP;
  const next = clampConverterPreviewZoom(converterState[key] + delta);
  if (next === converterState[key]) return;
  converterState[key] = next;
  updateConverterPreviewZoomUi();
  if (viewport) {
    requestAnimationFrame(() => {
      viewport.scrollLeft = Math.max(0, centerX * viewport.scrollWidth - viewport.clientWidth / 2);
      viewport.scrollTop = Math.max(0, centerY * viewport.scrollHeight - viewport.clientHeight / 2);
    });
  }
}

function handleConverterPreviewWheel(event, kind) {
  if (Math.abs(event.deltaY) < 1) return;
  event.preventDefault();
  setConverterPreviewZoom(kind, event.deltaY < 0 ? 'in' : 'out');
}

function bindConverterPreviewPan(stage, kind) {
  if (!stage || stage.dataset.convPanBound === 'true') return;
  stage.dataset.convPanBound = 'true';

  let drag = null;

  const endDrag = () => {
    drag = null;
    stage.classList.remove('is-grabbing');
  };

  stage.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    const zoom = kind === 'output' ? converterState.outputZoom : converterState.inputZoom;
    if (zoom <= CONVERTER_PREVIEW_ZOOM_MIN) return;
    drag = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startLeft: stage.scrollLeft,
      startTop: stage.scrollTop,
    };
    stage.classList.add('is-grabbing');
    stage.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  });

  stage.addEventListener('pointermove', (event) => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    stage.scrollLeft = drag.startLeft - (event.clientX - drag.startX);
    stage.scrollTop = drag.startTop - (event.clientY - drag.startY);
  });

  stage.addEventListener('pointerup', endDrag);
  stage.addEventListener('pointercancel', endDrag);
  stage.addEventListener('pointerleave', (event) => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    endDrag();
  });
}

function resetConverterPreviewZoom() {
  converterState.inputZoom = 1;
  converterState.outputZoom = 1;
}

function getConverterRgbDistance(data, index, rgb) {
  return Math.abs(data[index] - rgb[0])
    + Math.abs(data[index + 1] - rgb[1])
    + Math.abs(data[index + 2] - rgb[2]);
}

function getConverterRgbLuminance(rgb) {
  return (rgb[0] * 0.2126) + (rgb[1] * 0.7152) + (rgb[2] * 0.0722);
}

function clampConverterColorChannel(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function converterRgbToHex(rgb) {
  return `#${rgb.map((value) => clampConverterColorChannel(value).toString(16).padStart(2, '0')).join('')}`;
}

function pickConverterMonochromeFill(traceProfile, bgColor = null) {
  const palette = Array.isArray(traceProfile?.palette) ? traceProfile.palette : [];
  if (!palette.length) {
    return converterRgbToHex(traceProfile?.dominantColor || [0, 0, 0]);
  }
  if (!bgColor) {
    return converterRgbToHex(traceProfile?.dominantChromaticColor || traceProfile?.dominantColor || palette[0]);
  }

  let best = palette[0];
  let bestDistance = -1;
  for (const candidate of palette) {
    const distance = Math.abs(candidate[0] - bgColor[0])
      + Math.abs(candidate[1] - bgColor[1])
      + Math.abs(candidate[2] - bgColor[2]);
    if (distance > bestDistance) {
      best = candidate;
      bestDistance = distance;
    }
  }
  return converterRgbToHex(best);
}

function getConverterTransparentMonoThreshold(traceProfile) {
  const palette = Array.isArray(traceProfile?.palette) ? traceProfile.palette : [];
  if (palette.length < 2) return null;

  let darkest = palette[0];
  let lightest = palette[0];
  for (const candidate of palette) {
    if (getConverterRgbLuminance(candidate) < getConverterRgbLuminance(darkest)) darkest = candidate;
    if (getConverterRgbLuminance(candidate) > getConverterRgbLuminance(lightest)) lightest = candidate;
  }

  const darkLum = getConverterRgbLuminance(darkest);
  const lightLum = getConverterRgbLuminance(lightest);
  if (lightLum < 215 || darkLum > 175 || (lightLum - darkLum) < 55) {
    return null;
  }

  return (lightLum + darkLum) / 2;
}

function getConverterTransparentIconAlphaThreshold(traceProfile) {
  if (traceProfile?.likelyTinyLineIcon) return 176;
  if (traceProfile?.likelySingleColorMark) return 152;
  return 96;
}

function parseConverterSvgColor(value) {
  if (!value) return null;
  const color = String(value).trim().toLowerCase();
  if (!color || color === 'none' || color === 'transparent' || color === 'currentcolor') return null;
  if (color === 'white') return [255, 255, 255];
  if (color === 'black') return [0, 0, 0];

  const hexMatch = color.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hexMatch) {
    const hex = hexMatch[1];
    if (hex.length === 3) {
      return hex.split('').map((part) => parseInt(part + part, 16));
    }
    return [
      parseInt(hex.slice(0, 2), 16),
      parseInt(hex.slice(2, 4), 16),
      parseInt(hex.slice(4, 6), 16),
    ];
  }

  const rgbMatch = color.match(/^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i);
  if (rgbMatch) {
    return rgbMatch.slice(1, 4).map((part) => clampConverterColorChannel(Number(part)));
  }
  return null;
}

function getConverterQuantizedColorKey(r, g, b, step = 24) {
  const quantize = (value) => clampConverterColorChannel(Math.round(value / step) * step);
  return `${quantize(r)},${quantize(g)},${quantize(b)}`;
}

function parseConverterColorKey(key) {
  return key.split(',').map((part) => clampConverterColorChannel(Number(part) || 0));
}

function getConverterHueInfo(rgb) {
  const [r, g, b] = rgb.map((value) => value / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let hue = null;
  if (delta > 0.0001) {
    if (max === r) hue = ((g - b) / delta) % 6;
    else if (max === g) hue = (b - r) / delta + 2;
    else hue = (r - g) / delta + 4;
    hue *= 60;
    if (hue < 0) hue += 360;
  }
  const saturation = max === 0 ? 0 : delta / max;
  return { hue, saturation };
}

function getConverterHueDistance(a, b) {
  const diff = Math.abs(a - b);
  return Math.min(diff, 360 - diff);
}

function dedupeConverterPalette(colors, minDistance = 52) {
  const unique = [];
  colors.forEach((candidate) => {
    if (!unique.some((existing) => (
      Math.abs(existing[0] - candidate[0])
      + Math.abs(existing[1] - candidate[1])
      + Math.abs(existing[2] - candidate[2])
    ) < minDistance)) {
      unique.push(candidate);
    }
  });
  return unique;
}

function getConverterCornerForegroundCoverage(imageData, colorMode, threshold, bgColor, invert = false) {
  const { data, width, height } = imageData;
  const sampleW = Math.max(1, Math.min(width, Math.round(width * 0.18)));
  const sampleH = Math.max(1, Math.min(height, Math.round(height * 0.18)));
  const corners = [
    { startX: 0, startY: 0 },
    { startX: width - sampleW, startY: 0 },
    { startX: 0, startY: height - sampleH },
    { startX: width - sampleW, startY: height - sampleH },
  ];

  let foregroundCount = 0;
  let totalCount = 0;
  corners.forEach(({ startX, startY }) => {
    for (let y = startY; y < startY + sampleH; y++) {
      for (let x = startX; x < startX + sampleW; x++) {
        const index = (y * width + x) * 4;
        totalCount += 1;
        if (isConverterForegroundPixel(data, index, colorMode, threshold, bgColor, invert)) {
          foregroundCount += 1;
        }
      }
    }
  });

  return totalCount ? foregroundCount / totalCount : 0;
}

function getConverterTraceClass(traceProfile, requestedColorMode, assetMode = 'logo') {
  if (!traceProfile) return assetMode === 'icon' ? 'mono-mask' : 'general-color';
  if (assetMode === 'icon') {
    if (traceProfile.likelyTinyLineIcon) return 'tiny-line-icon';
    if (traceProfile.likelySingleColorMark) return 'single-color-mark';
    return 'mono-mask';
  }
  if (requestedColorMode === 'mono') return 'mono-mask';
  if (traceProfile.likelyTileIconColor) return 'tile-icon-color';
  if (traceProfile.likelyFlatArtwork || traceProfile.likelySingleHueLogo) return 'flat-logo-color';
  return 'general-color';
}

function analyzeConverterTraceProfile(imageData, colorMode, threshold, bgColor, invert = false) {
  const { data, width, height } = imageData;
  const counts = new Map();
  let foregroundPixels = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 4;
      if (!isConverterForegroundPixel(data, index, colorMode, threshold, bgColor, invert)) continue;
      foregroundPixels += 1;
      const key = getConverterQuantizedColorKey(data[index], data[index + 1], data[index + 2], 24);
      counts.set(key, (counts.get(key) || 0) + 1);
    }
  }

  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const significantThreshold = Math.max(8, Math.round(foregroundPixels * 0.01));
  const significant = sorted.filter(([, count]) => count >= significantThreshold);
  const foregroundCoverage = (width * height) ? foregroundPixels / (width * height) : 0;
  const dominantCoverage = foregroundPixels && significant.length
    ? significant[0][1] / foregroundPixels
    : 0;
  const topFourCoverage = foregroundPixels
    ? significant.slice(0, 4).reduce((sum, [, count]) => sum + count, 0) / foregroundPixels
    : 0;
  const topTwoCoverage = foregroundPixels
    ? significant.slice(0, 2).reduce((sum, [, count]) => sum + count, 0) / foregroundPixels
    : 0;
  const cornerForegroundCoverage = getConverterCornerForegroundCoverage(imageData, colorMode, threshold, bgColor, invert);
  const topPalette = dedupeConverterPalette(significant.slice(0, 6).map(([key]) => parseConverterColorKey(key)));
  const dominantColor = topPalette[0] || [0, 0, 0];
  const dominantHueInfo = getConverterHueInfo(dominantColor);
  const dominantChromaticColor = topPalette.find((rgb) => getConverterHueInfo(rgb).hue != null) || null;
  const dominantChromaticHueInfo = dominantChromaticColor ? getConverterHueInfo(dominantChromaticColor) : null;
  const sameHueCoverage = foregroundPixels
    ? significant.reduce((sum, [key, count]) => {
      const info = getConverterHueInfo(parseConverterColorKey(key));
      if (dominantHueInfo.hue == null || info.hue == null) return sum + count;
      return getConverterHueDistance(dominantHueInfo.hue, info.hue) <= 34 ? sum + count : sum;
    }, 0) / foregroundPixels
    : 0;
  const neutralCoverage = foregroundPixels
    ? significant.reduce((sum, [key, count]) => {
      const info = getConverterHueInfo(parseConverterColorKey(key));
      return info.hue == null ? sum + count : sum;
    }, 0) / foregroundPixels
    : 0;
  const chromaticCoverage = foregroundPixels
    ? significant.reduce((sum, [key, count]) => {
      const info = getConverterHueInfo(parseConverterColorKey(key));
      return info.hue != null ? sum + count : sum;
    }, 0) / foregroundPixels
    : 0;
  const sameChromaticHueCoverage = (foregroundPixels && dominantChromaticHueInfo?.hue != null)
    ? significant.reduce((sum, [key, count]) => {
      const info = getConverterHueInfo(parseConverterColorKey(key));
      if (info.hue == null) return sum;
      return getConverterHueDistance(dominantChromaticHueInfo.hue, info.hue) <= 28 ? sum + count : sum;
    }, 0) / foregroundPixels
    : 0;
  const likelySingleHueLogo = (
    colorMode === 'color'
    && dominantChromaticHueInfo?.hue != null
    && significant.length > 0
    && significant.length <= 12
    && topTwoCoverage >= 0.7
    && chromaticCoverage >= 0.55
    && sameChromaticHueCoverage >= 0.72
    && neutralCoverage <= 0.42
  );
  const likelyFlatArtwork = (
    colorMode === 'color'
    && significant.length > 0
    && significant.length <= 8
    && topFourCoverage >= 0.82
  );
  const likelyTinyLineIcon = (
    colorMode === 'color'
    && Math.max(width, height) <= 96
    && foregroundCoverage <= 0.22
    && topTwoCoverage >= 0.78
    && significant.length <= 6
  );
  const likelySingleColorMark = (
    colorMode === 'color'
    && !likelyTinyLineIcon
    && sameChromaticHueCoverage >= 0.84
    && chromaticCoverage >= 0.64
    && neutralCoverage <= 0.22
    && foregroundCoverage <= 0.44
    && significant.length <= 8
  );
  const likelyTileIconColor = (
    colorMode === 'color'
    && !likelyTinyLineIcon
    && likelyFlatArtwork
    && foregroundCoverage >= 0.5
    && cornerForegroundCoverage >= 0.36
    && dominantCoverage >= 0.42
  );
  const recommendedColorCount = likelySingleHueLogo
    ? Math.min(3, Math.max(2, topPalette.length || 2))
    : likelyFlatArtwork
      ? Math.min(8, Math.max(4, topPalette.length || 4))
      : Math.min(12, Math.max(6, significant.length || 6));

  return {
    foregroundPixels,
    foregroundCoverage,
    dominantCoverage,
    cornerForegroundCoverage,
    approximateColorCount: counts.size,
    significantColorCount: significant.length,
    topTwoCoverage,
    topFourCoverage,
    sameHueCoverage,
    sameChromaticHueCoverage,
    neutralCoverage,
    chromaticCoverage,
    dominantColor,
    dominantChromaticColor,
    palette: topPalette.slice(0, recommendedColorCount),
    likelySingleHueLogo,
    likelyFlatArtwork,
    likelyTinyLineIcon,
    likelySingleColorMark,
    likelyTileIconColor,
    recommendedColorCount,
  };
}

function getConverterTraceRoute(requestedColorMode, traceProfile) {
  if (requestedColorMode === 'mono') return 'mono-exact';
  if (traceProfile?.likelySingleHueLogo) return 'mono-exact';
  if (requestedColorMode === 'color' && traceProfile?.likelyFlatArtwork) return 'flat-art-color';
  return 'color-default';
}

function resolveConverterLabStrategy({
  requestedColorMode,
  traceProfile,
  assetMode,
  preset,
}) {
  const baseTraceRoute = getConverterTraceRoute(requestedColorMode, traceProfile);
  const baseTraceClass = getConverterTraceClass(traceProfile, requestedColorMode, assetMode);
  const baseServiceRequestedColorMode = (
    requestedColorMode === 'mono'
    || baseTraceClass === 'tiny-line-icon'
    || baseTraceClass === 'single-color-mark'
    || baseTraceClass === 'mono-mask'
  ) ? 'mono' : 'color';
  const baseServiceQualityMode = getConverterServiceQualityMode(preset, assetMode);

  if (currentView !== 'converter-lab' || converterState.labStrategy === 'stable') {
    return {
      traceRoute: baseTraceRoute,
      traceClass: baseTraceClass,
      serviceRequestedColorMode: baseServiceRequestedColorMode,
      serviceQualityMode: baseServiceQualityMode,
    };
  }

  if (
    converterState.labStrategy === 'brand-color-first'
    && assetMode === 'logo'
    && requestedColorMode === 'color'
    && (
      traceProfile?.likelySingleHueLogo
      || traceProfile?.likelySingleColorMark
      || traceProfile?.likelyFlatArtwork
    )
  ) {
    return {
      traceRoute: 'flat-art-color',
      traceClass: 'flat-logo-color',
      serviceRequestedColorMode: 'color',
      serviceQualityMode: 'exact',
    };
  }

  return {
    traceRoute: baseTraceRoute,
    traceClass: baseTraceClass,
    serviceRequestedColorMode: baseServiceRequestedColorMode,
    serviceQualityMode: baseServiceQualityMode,
  };
}

function findNearestConverterPaletteIndex(palette, rgb) {
  let bestIndex = 0;
  let bestDistance = Infinity;
  for (let i = 0; i < palette.length; i++) {
    const candidate = palette[i];
    const distance = Math.abs(candidate[0] - rgb[0])
      + Math.abs(candidate[1] - rgb[1])
      + Math.abs(candidate[2] - rgb[2]);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = i;
    }
  }
  return { index: bestIndex, distance: bestDistance };
}

function smoothConverterPaletteLabels(labels, width, height, passes = 1) {
  let current = labels;
  for (let pass = 0; pass < passes; pass++) {
    const next = current.slice();
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;
        const neighborCounts = new Map();
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const label = current[idx + dy * width + dx];
            neighborCounts.set(label, (neighborCounts.get(label) || 0) + 1);
          }
        }
        let winner = current[idx];
        let winnerCount = 0;
        neighborCounts.forEach((count, label) => {
          if (count > winnerCount) {
            winner = label;
            winnerCount = count;
          }
        });
        if (winnerCount >= 6 && winner !== current[idx]) {
          next[idx] = winner;
        }
      }
    }
    current = next;
  }
  return current;
}

function flattenConverterColorArtwork(imageData, bgColor, threshold, traceProfile, preset = 'posterized2') {
  if (!traceProfile?.palette?.length) return;

  const { data, width, height } = imageData;
  const bg = bgColor || [255, 255, 255];
  const bgCutoff = Math.max(18, Math.min(96, Math.round(threshold * 0.9)));
  const palette = traceProfile.palette;
  const isSimplePreset = preset === 'posterized2';
  const shouldSnapPalette = traceProfile.likelySingleHueLogo || traceProfile.likelyFlatArtwork || isSimplePreset;
  const labels = new Int16Array(width * height);
  labels.fill(-1);

  for (let i = 0; i < labels.length; i++) {
    const index = i * 4;
    if (data[index + 3] < 128) {
      data[index] = bg[0]; data[index + 1] = bg[1]; data[index + 2] = bg[2]; data[index + 3] = 255;
      continue;
    }
    const bgDistance = Math.abs(data[index] - bg[0])
      + Math.abs(data[index + 1] - bg[1])
      + Math.abs(data[index + 2] - bg[2]);
    if (bgDistance <= bgCutoff) {
      data[index] = bg[0]; data[index + 1] = bg[1]; data[index + 2] = bg[2]; data[index + 3] = 255;
      continue;
    }

    const nearest = findNearestConverterPaletteIndex(palette, [data[index], data[index + 1], data[index + 2]]);
    if (bgDistance < Math.max(28, nearest.distance * 0.9)) {
      data[index] = bg[0]; data[index + 1] = bg[1]; data[index + 2] = bg[2]; data[index + 3] = 255;
      continue;
    }

    labels[i] = nearest.index;
    if (shouldSnapPalette) {
      const rgb = palette[nearest.index];
      data[index] = rgb[0];
      data[index + 1] = rgb[1];
      data[index + 2] = rgb[2];
      data[index + 3] = 255;
    } else {
      data[index + 3] = 255;
    }
  }

  const shouldSmooth = traceProfile.likelySingleHueLogo || (traceProfile.likelyFlatArtwork && isSimplePreset);
  if (!shouldSmooth) return;

  const smoothingPasses = traceProfile.likelySingleHueLogo
    ? 2
    : traceProfile.topFourCoverage >= 0.92
      ? 2
      : 1;
  const smoothed = smoothConverterPaletteLabels(labels, width, height, smoothingPasses);
  for (let i = 0; i < smoothed.length; i++) {
    const index = i * 4;
    const label = smoothed[i];
    if (label < 0) {
      data[index] = bg[0]; data[index + 1] = bg[1]; data[index + 2] = bg[2]; data[index + 3] = 255;
      continue;
    }
    const rgb = palette[label];
    data[index] = rgb[0];
    data[index + 1] = rgb[1];
    data[index + 2] = rgb[2];
    data[index + 3] = 255;
  }
}

function retintConverterForegroundSvg(svgStr, fillColor, includeWhite = false) {
  if (!svgStr || !fillColor) return svgStr;
  try {
    const doc = new DOMParser().parseFromString(svgStr, 'image/svg+xml');
    doc.querySelectorAll(CONVERTER_SVG_SHAPES).forEach((shape) => {
      const fill = (shape.getAttribute('fill') || '').trim().toLowerCase();
      const isWhiteFill = fill === '#fff'
        || fill === '#ffffff'
        || fill === 'white'
        || fill === 'rgb(255,255,255)'
        || fill === 'rgb(255, 255, 255)';
      if (!fill || fill === 'none' || (!includeWhite && isWhiteFill)) {
        return;
      }
      shape.setAttribute('fill', fillColor);
    });
    return new XMLSerializer().serializeToString(doc);
  } catch {
    return svgStr;
  }
}

function isConverterForegroundPixel(data, index, colorMode, threshold, bgColor, invert = false) {
  if ((data[index + 3] || 0) < 16) return false;

  let isForeground = false;
  if (colorMode === 'mono') {
    if (!bgColor) {
      return true;
    }
    isForeground = getConverterRgbDistance(data, index, bgColor) > threshold;
    return invert ? !isForeground : isForeground;
  }

  if (!bgColor) return (data[index + 3] || 0) >= 128;
  return getConverterRgbDistance(data, index, bgColor) >= Math.max(18, threshold);
}

function detectConverterContentBounds(imageData, colorMode, threshold, bgColor, invert = false) {
  const { data, width, height } = imageData;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 4;
      if (!isConverterForegroundPixel(data, index, colorMode, threshold, bgColor, invert)) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }

  if (maxX < minX || maxY < minY) {
    return { x: 0, y: 0, width, height, cropped: false };
  }

  const pad = 1;
  const x = Math.max(0, minX - pad);
  const y = Math.max(0, minY - pad);
  const right = Math.min(width - 1, maxX + pad);
  const bottom = Math.min(height - 1, maxY + pad);
  const croppedWidth = Math.max(1, right - x + 1);
  const croppedHeight = Math.max(1, bottom - y + 1);

  return {
    x,
    y,
    width: croppedWidth,
    height: croppedHeight,
    cropped: x !== 0 || y !== 0 || croppedWidth !== width || croppedHeight !== height,
  };
}

function getConverterEnhanceScale(width, height, enabled) {
  if (!enabled) return 1;
  const maxDim = Math.max(width, height);
  if (maxDim >= 96) return 1;
  if (maxDim <= 24) return 4;
  if (maxDim <= 48) return 3;
  return 2;
}

function getConverterMicroIconUpscale(width, height, traceClass) {
  const maxDim = Math.max(width, height);
  if (traceClass === 'tiny-line-icon') {
    if (maxDim <= 32) return 8;
    if (maxDim <= 48) return 6;
    if (maxDim <= 64) return 4;
    return 3;
  }
  if (traceClass === 'mono-mask' || traceClass === 'single-color-mark') {
    if (maxDim <= 32) return 6;
    if (maxDim <= 48) return 4;
    if (maxDim <= 64) return 3;
    return 2;
  }
  return 4;
}

function applyBinaryNoiseCleanup(imageData, level) {
  if (level === 'low') return;

  const { data, width, height } = imageData;
  const iterations = level === 'high' ? 2 : 1;
  const removeThreshold = level === 'high' ? 2 : 1;
  const fillThreshold = level === 'high' ? 6 : 7;
  let mask = new Uint8Array(width * height);

  for (let i = 0; i < mask.length; i++) {
    mask[i] = data[i * 4] < 128 ? 1 : 0;
  }

  for (let pass = 0; pass < iterations; pass++) {
    const next = mask.slice();
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;
        let neighbors = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            neighbors += mask[idx + dy * width + dx];
          }
        }
        if (mask[idx] && neighbors <= removeThreshold) next[idx] = 0;
        if (!mask[idx] && neighbors >= fillThreshold) next[idx] = 1;
      }
    }
    mask = next;
  }

  for (let i = 0; i < mask.length; i++) {
    const value = mask[i] ? 0 : 255;
    const index = i * 4;
    data[index] = value;
    data[index + 1] = value;
    data[index + 2] = value;
    data[index + 3] = 255;
  }
}

function applyBinaryIconThinning(imageData, passes = 1) {
  if (passes <= 0) return;

  const { data, width, height } = imageData;
  let mask = new Uint8Array(width * height);

  for (let i = 0; i < mask.length; i++) {
    mask[i] = data[i * 4] < 128 ? 1 : 0;
  }

  for (let pass = 0; pass < passes; pass++) {
    const next = mask.slice();
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;
        if (!mask[idx]) continue;

        const north = mask[idx - width];
        const south = mask[idx + width];
        const west = mask[idx - 1];
        const east = mask[idx + 1];
        const northwest = mask[idx - width - 1];
        const northeast = mask[idx - width + 1];
        const southwest = mask[idx + width - 1];
        const southeast = mask[idx + width + 1];

        const cardinalNeighbors = north + south + west + east;
        const allNeighbors = cardinalNeighbors + northwest + northeast + southwest + southeast;

        // Preserve endpoints / tiny features, but shave a single layer off
        // thicker icon outlines where a pixel is clearly on the exterior edge.
        if (allNeighbors >= 2 && allNeighbors <= 5 && cardinalNeighbors <= 3) {
          next[idx] = 0;
        }
      }
    }
    mask = next;
  }

  for (let i = 0; i < mask.length; i++) {
    const value = mask[i] ? 0 : 255;
    const index = i * 4;
    data[index] = value;
    data[index + 1] = value;
    data[index + 2] = value;
    data[index + 3] = 255;
  }
}

function applyBinaryIconErosion(imageData, passes = 1) {
  if (passes <= 0) return;

  const { data, width, height } = imageData;
  let mask = new Uint8Array(width * height);

  for (let i = 0; i < mask.length; i++) {
    mask[i] = data[i * 4] < 128 ? 1 : 0;
  }

  for (let pass = 0; pass < passes; pass++) {
    const next = mask.slice();
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;
        if (!mask[idx]) continue;

        const north = mask[idx - width];
        const south = mask[idx + width];
        const west = mask[idx - 1];
        const east = mask[idx + 1];
        const cardinalNeighbors = north + south + west + east;

        // A single erosion step for thick icon outlines. We only shave pixels
        // that are clearly on the outer edge, while preserving interior runs.
        if (cardinalNeighbors <= 2) {
          next[idx] = 0;
        }
      }
    }
    mask = next;
  }

  for (let i = 0; i < mask.length; i++) {
    const value = mask[i] ? 0 : 255;
    const index = i * 4;
    data[index] = value;
    data[index + 1] = value;
    data[index + 2] = value;
    data[index + 3] = 255;
  }
}

function getConverterTraceComplexity(pathCount, sizeKb) {
  const score = pathCount + Math.round(sizeKb / 4);
  if (score >= 220) return 'Heavy';
  if (score >= 90) return 'Medium';
  return 'Light';
}

function measureConverterTraceMetrics(svgStr, sizeKb) {
  const doc = new DOMParser().parseFromString(svgStr, 'image/svg+xml');
  const pathCount = doc.querySelectorAll('path').length;
  const shapeCount = doc.querySelectorAll(CONVERTER_SVG_SHAPES).length;
  return {
    pathCount,
    shapeCount,
    complexity: getConverterTraceComplexity(pathCount || shapeCount, sizeKb),
  };
}

function stripConverterRuntimeSvgAttrs(svgStr) {
  if (!svgStr) return svgStr;
  try {
    const doc = new DOMParser().parseFromString(svgStr, 'image/svg+xml');
    if (doc.querySelector('parsererror')) return svgStr;
    const svg = doc.querySelector('svg');
    if (!svg) return svgStr;
    svg.removeAttribute('id');
    svg.removeAttribute('style');
    return new XMLSerializer().serializeToString(doc);
  } catch {
    return svgStr;
  }
}

function stripConverterMonoStroke(svgStr) {
  if (!svgStr) return svgStr;
  try {
    const doc = new DOMParser().parseFromString(svgStr, 'image/svg+xml');
    if (doc.querySelector('parsererror')) return svgStr;
    doc.querySelectorAll(CONVERTER_SVG_SHAPES).forEach((shape) => {
      shape.removeAttribute('stroke');
      shape.removeAttribute('stroke-width');
      shape.removeAttribute('stroke-linecap');
      shape.removeAttribute('stroke-linejoin');
      shape.removeAttribute('stroke-miterlimit');
      shape.removeAttribute('vector-effect');
    });
    return new XMLSerializer().serializeToString(doc);
  } catch {
    return svgStr;
  }
}

function buildConverterTraceArtifact(
  svgStr,
  originalW,
  originalH,
  fillColor = null,
  {
    stripMonoStroke = false,
    backgroundStripColor = [255, 255, 255],
    forceRetint = false,
    exportWidth = originalW,
    exportHeight = originalH,
  } = {},
) {
  let cleanSvg = stripConverterRuntimeSvgAttrs(svgStr);
  cleanSvg = normalizeSvgOutput(cleanSvg, originalW, originalH, exportWidth, exportHeight);
  cleanSvg = stripBackgroundPaths(cleanSvg, backgroundStripColor);
  if (stripMonoStroke) {
    cleanSvg = stripConverterMonoStroke(cleanSvg);
  }
  if (fillColor) {
    cleanSvg = retintConverterForegroundSvg(cleanSvg, fillColor, forceRetint);
  }
  cleanSvg = sanitizeSvgExportMarkup(cleanSvg, { preserveBranding: false });
  const svgBlob = new Blob([cleanSvg], { type: 'image/svg+xml' });
  const sizeKb = Math.round(svgBlob.size / 1024);
  const traceMetrics = measureConverterTraceMetrics(cleanSvg, sizeKb);
  return {
    cleanSvg,
    svgBlob,
    sizeKb,
    traceMetrics,
  };
}

function buildConverterServiceTraceArtifact(
  svgStr,
  metrics = null,
  {
    fillColor = null,
    backgroundStripColor = null,
    stripMonoStroke = false,
    forceRetint = false,
    originalWidth = null,
    originalHeight = null,
    exportWidth = originalWidth,
    exportHeight = originalHeight,
  } = {},
) {
  let cleanSvg = stripConverterRuntimeSvgAttrs(svgStr);
  if (originalWidth && originalHeight) {
    cleanSvg = normalizeSvgOutput(cleanSvg, originalWidth, originalHeight, exportWidth, exportHeight);
  }
  if (backgroundStripColor) {
    cleanSvg = stripBackgroundPaths(cleanSvg, backgroundStripColor);
  }
  if (stripMonoStroke) {
    cleanSvg = stripConverterMonoStroke(cleanSvg);
  }
  if (fillColor) {
    cleanSvg = retintConverterForegroundSvg(cleanSvg, fillColor, forceRetint);
  }
  cleanSvg = sanitizeSvgExportMarkup(cleanSvg, { preserveBranding: false });
  const svgBlob = new Blob([cleanSvg], { type: 'image/svg+xml' });
  const sizeKb = Math.round(svgBlob.size / 1024);
  const pathCount = Number(metrics?.pathCount ?? 0);
  const shapeCount = Number(metrics?.shapeCount ?? pathCount);
  const traceMetrics = (pathCount || shapeCount)
    ? {
        pathCount,
        shapeCount,
        complexity: getConverterTraceComplexity(pathCount || shapeCount, sizeKb),
      }
    : measureConverterTraceMetrics(cleanSvg, sizeKb);

  return {
    cleanSvg,
    svgBlob,
    sizeKb,
    traceMetrics,
  };
}

function shouldFallbackFromMonoTrace({
  traceArtifact,
  traceProfile,
  requestedColorMode,
  cropWidth,
  cropHeight,
}) {
  if (!traceArtifact?.traceMetrics) return true;
  const { traceMetrics, sizeKb } = traceArtifact;
  const cropArea = Math.max(1, cropWidth * cropHeight);
  const density = traceMetrics.pathCount / cropArea;
  const isLogoLike = Boolean(traceProfile?.likelySingleHueLogo);
  const explicitMono = requestedColorMode === 'mono';

  if (!traceMetrics.pathCount || !traceMetrics.shapeCount) return true;
  if (traceMetrics.complexity === 'Heavy' && (isLogoLike || explicitMono)) return true;
  if (isLogoLike && (traceMetrics.pathCount > 120 || sizeKb > 96 || density > 0.0012)) return true;
  if (explicitMono && (traceMetrics.pathCount > 900 || sizeKb > 260 || density > 0.0035)) return true;
  return false;
}

function getConverterTraceAdvice({
  traceProfile,
  traceMetrics,
  requestedColorMode,
  effectiveColorMode,
  sizeKb,
  traceRoute = 'color-fallback',
  resolvedPreset = 'default',
}) {
  if (!traceProfile || !traceMetrics) return null;

  const isHeavyTrace = traceMetrics.complexity === 'Heavy' || traceMetrics.pathCount >= 1200 || sizeKb >= 300;
  const isDetailedColorSource = (
    requestedColorMode === 'color'
    && effectiveColorMode === 'color'
    && !traceProfile.likelySingleHueLogo
    && !traceProfile.likelyFlatArtwork
    && (
      traceProfile.significantColorCount >= 10
      || traceProfile.approximateColorCount >= 28
      || traceProfile.topFourCoverage < 0.78
    )
  );

  if (isHeavyTrace && isDetailedColorSource) {
    return {
      tone: 'warn',
      text: 'This source image includes extra screenshot detail. For cleaner icon SVGs, upload an image that contains only the logo or symbol.',
    };
  }

  if (resolvedPreset === 'detailed' && (traceMetrics.pathCount >= 700 || sizeKb >= 160)) {
    return {
      tone: 'info',
      text: 'Exact keeps more detail and can produce a larger SVG. Switch to Compact if you want a smaller file.',
    };
  }

  if (resolvedPreset !== 'posterized2' && (traceMetrics.pathCount >= 1200 || sizeKb >= 300)) {
    return {
      tone: 'info',
      text: 'This SVG is on the larger side. Switch to Compact if you want a smaller file.',
    };
  }

  return null;
}

function updateConverterPreviewStage() {
  const stage = document.getElementById('convPreviewStage');
  const overlay = document.getElementById('convCompareOverlay');
  const split = document.getElementById('convCompareSplit');
  const originalOverlay = document.getElementById('convOriginalOverlayImg');
  const outputOverlay = document.getElementById('convOutputOverlayImg');
  const originalSplit = document.getElementById('convOriginalSplitImg');
  const outputSplit = document.getElementById('convOutputSplitImg');
  if (!stage || !overlay || !split || !originalOverlay || !outputOverlay || !originalSplit || !outputSplit) return;

  const outputSrc = converterState.outputDataUrl || '';
  const originalSrc = converterState.previewOriginalDataUrl || converterState.pngDataUrl || '';

  outputOverlay.src = outputSrc;
  outputSplit.src = outputSrc;
  originalOverlay.src = originalSrc;
  originalSplit.src = originalSrc;

  stage.dataset.previewBg = converterState.previewBackground;
  stage.style.setProperty('--conv-preview-bg', converterState.previewBackground === 'custom' ? converterState.previewBgColor : 'transparent');

  const hasOutput = Boolean(outputSrc);
  const showCompare = converterState.mode === 'png-to-svg' && hasOutput;
  const compareMode = showCompare && converterState.compareMode === 'split' ? 'split' : 'trace';
  const isSplit = compareMode === 'split';

  split.hidden = !isSplit;
  overlay.hidden = isSplit;
  overlay.classList.remove('is-overlay');

  originalOverlay.style.display = 'none';
  outputOverlay.style.display = hasOutput ? '' : 'none';

  if (!hasOutput) {
    originalOverlay.style.display = 'none';
    outputOverlay.style.display = 'none';
  }

  updateConverterPreviewZoomUi({ center: true });
}

function updateConverterPngUiState() {
  document.querySelectorAll('[name="convAssetMode"]').forEach((radio) => {
    radio.checked = radio.value === converterState.assetMode;
  });
  document.querySelectorAll('[name="convExportSizeMode"]').forEach((radio) => {
    radio.checked = radio.value === converterState.exportSizeMode;
  });
  document.querySelector(`[name="convPreviewBg"][value="${converterState.previewBackground}"]`)?.setAttribute('checked', 'checked');
  document.querySelectorAll('[name="convPreviewBg"]').forEach((radio) => {
    radio.checked = radio.value === converterState.previewBackground;
  });
  const exportWidthWrap = document.getElementById('convExportWidthWrap');
  const exportWidthInput = document.getElementById('convExportWidth');
  if (exportWidthWrap) {
    exportWidthWrap.style.display = converterState.exportSizeMode === 'custom' ? 'inline-flex' : 'none';
  }
  if (exportWidthInput) {
    exportWidthInput.value = clampConverterExportTargetWidth(
      converterState.exportTargetWidth,
      converterState.assetMode,
    );
  }
  const previewColor = document.getElementById('convPreviewBgColor');
  if (previewColor) {
    previewColor.value = converterState.previewBgColor;
    previewColor.style.display = converterState.previewBackground === 'custom' ? 'inline-block' : 'none';
  }
  syncConverterChipGroup('compare', converterState.compareMode, 'compare');
  syncConverterChipGroup('noise', converterState.noiseCleanup, 'cleanup');
  const autoCrop = document.getElementById('convAutoCrop');
  const enhance = document.getElementById('convEnhanceSmall');
  const invert = document.getElementById('convInvertMono');
  if (autoCrop) autoCrop.checked = converterState.autoCrop;
  if (enhance) enhance.checked = converterState.enhanceSmallIcons;
  if (invert) invert.checked = converterState.invert;
  updateConverterPreviewStage();
  updateConverterPreviewZoomUi();
  updateConverterLabSummary();
}

function renderConverter() {
  removePackCatalog();

  const gridArea = document.getElementById('gridArea');
  if (!gridArea) return;

  const view = document.createElement('div');
  view.id = 'converterView';
  view.className = 'converter';
  view.innerHTML = `
    <div class="conv__header">
      <div class="conv__mode-tabs">
        <button class="conv__mode-tab conv__mode-tab--active" id="convSvgToPng" data-mode="svg-to-png">
          <span class="material-symbols-outlined" style="font-size:16px">image</span> SVG → PNG
        </button>
        <button class="conv__mode-tab" id="convPngToSvg" data-mode="png-to-svg">
          <span class="material-symbols-outlined" style="font-size:16px">code</span> PNG → SVG
        </button>
      </div>
    </div>

    <div class="conv__body">
      <!-- Input Panel -->
      <div class="conv__panel conv__panel--input">
        <div class="conv__panel-label">Input</div>
        <div class="conv__drop-zone" id="convDropZone">
          <input type="file" id="convFileInput" accept=".svg,.png,.jpg,.jpeg,.gif,.webp" style="display:none">
          <span class="material-symbols-outlined conv__drop-icon">upload_file</span>
          <p class="conv__drop-text" id="convDropText">Drop an SVG here or click to browse</p>
          <div class="conv__drop-btns">
            <button class="conv__drop-btn" id="convBrowseBtn">Browse</button>
            <button class="conv__drop-btn conv__drop-btn--ghost" id="convPasteBtn">Paste SVG Code</button>
          </div>
        </div>
        <div class="conv__input-preview" id="convInputPreview" style="display:none">
          <button class="conv__clear-btn" id="convClearBtn" aria-label="Clear converter input">
            <span class="material-symbols-outlined" style="font-size:16px">close</span>
          </button>
          <div class="conv__input-stage" id="convInputStage">
            <div class="conv__input-surface" id="convInputSurface">
              <img class="conv__preview-img" id="convInputImg" alt="Input">
            </div>
          </div>
          <div class="conv__input-meta" id="convInputMeta"></div>
        </div>
      </div>

      <!-- Arrow -->
      <div class="conv__arrow">
        <span class="material-symbols-outlined" style="font-size:32px;color:var(--si-accent)">arrow_forward</span>
      </div>

      <!-- Output Panel -->
      <div class="conv__panel conv__panel--output">
        <div class="conv__panel-label">Output</div>
        <div class="conv__output-empty" id="convOutputEmpty">
          <span class="material-symbols-outlined" style="font-size:40px;color:var(--si-text-dim)">image_search</span>
          <p>Preview appears here</p>
        </div>
        <div class="conv__output-preview" id="convOutputPreview" style="display:none">
          <div class="conv__preview-stage" id="convPreviewStage" data-preview-bg="transparent">
            <div class="conv__compare-overlay" id="convCompareOverlay">
              <img class="conv__preview-img conv__preview-img--original" id="convOriginalOverlayImg" alt="Original preview">
              <img class="conv__preview-img conv__preview-img--output" id="convOutputOverlayImg" alt="Output preview">
            </div>
            <div class="conv__compare-split" id="convCompareSplit" hidden>
              <div class="conv__compare-pane">
                <img class="conv__preview-img" id="convOriginalSplitImg" alt="Original split preview">
              </div>
              <div class="conv__compare-pane">
                <img class="conv__preview-img" id="convOutputSplitImg" alt="Output split preview">
              </div>
            </div>
          </div>
          <div class="conv__output-meta" id="convOutputMeta"></div>
          <div class="conv__actions" id="convActions" style="display:none">
            <button class="conv__action-btn conv__action-btn--primary" id="convDownload">
              <span class="material-symbols-outlined" style="font-size:16px">download</span>
              <span id="convDownloadLabel">Download PNG</span>
            </button>
            <button class="conv__action-btn" id="convCopyClipboard">
              <span class="material-symbols-outlined" style="font-size:16px">content_copy</span> <span id="convCopyLabel">Copy</span>
            </button>
          </div>
        </div>
        <div class="conv__quality-note" id="convQualityNote" style="display:none"></div>
      </div>
    </div>

    <!-- Options -->
    <div class="conv__options" id="convOptions">
      <!-- SVG→PNG options (shown by default) -->
      <div class="conv__opts-group" id="convSvgOpts">
        <div class="conv__opt-row">
          <label class="conv__opt-label">Size <span class="conv__tip-icon" data-tip="Output width in pixels. The height adjusts automatically to maintain aspect ratio.">?</span></label>
          <div class="conv__size-presets">
            <button class="conv__size-btn" data-size="32">32</button>
            <button class="conv__size-btn conv__size-btn--active" data-size="64">64</button>
            <button class="conv__size-btn" data-size="128">128</button>
            <button class="conv__size-btn" data-size="256">256</button>
            <button class="conv__size-btn" data-size="512">512</button>
            <div class="conv__size-custom-wrap">
              <input type="number" class="conv__size-custom" id="convCustomSize" min="1" max="4096" value="64">
              <span class="conv__size-custom-unit">px</span>
            </div>
          </div>
        </div>
        <div class="conv__opt-row">
          <label class="conv__opt-label">Fill <span class="conv__tip-icon" data-tip="Recolors visible fill shapes. Some uploaded SVGs may be stroke-only.">?</span></label>
          <div class="conv__color-dots" id="convFillDots">
            ${renderConverterColorDotRow('Fill', converterState.fillColor, true)}
          </div>
        </div>
        <div class="conv__opt-row">
          <label class="conv__opt-label">Stroke <span class="conv__tip-icon" data-tip="Recolors visible stroke paths. Some uploaded SVGs may be fill-only.">?</span></label>
          <div class="conv__color-dots" id="convStrokeDots">
            ${renderConverterColorDotRow('Stroke', converterState.strokeColor, true)}
          </div>
        </div>
        <div class="conv__opt-row">
          <label class="conv__opt-label">Background <span class="conv__tip-icon" data-tip="Choose a background color for the exported PNG. Transparent is ideal for icons used in apps and websites.">?</span></label>
          <div class="conv__bg-options">
            <label class="conv__radio"><input type="radio" name="convBg" value="transparent" checked> Transparent</label>
            <label class="conv__radio"><input type="radio" name="convBg" value="white"> White</label>
            <label class="conv__radio"><input type="radio" name="convBg" value="custom"> Custom</label>
            <input type="color" id="convBgColor" value="#ffffff" class="conv__color-input" style="display:none">
          </div>
        </div>
        <div class="conv__opt-row">
          <label class="conv__opt-label">Padding <span class="conv__tip-icon" data-tip="Adds inner spacing between the icon and the image edge. Useful for app icons and social media avatars.">?</span></label>
          <div class="conv__slider-row">
            <input type="range" id="convPadding" min="0" max="32" value="8" class="conv__slider">
            <span class="conv__slider-val" id="convPaddingVal">8px</span>
          </div>
        </div>
        <div class="conv__opt-row">
          <label class="conv__opt-label">Quality <span class="conv__tip-icon" data-tip="Multiplies the output resolution. 2x at 64px produces a 128px image. Use 2x or 3x for Retina/HiDPI displays.">?</span></label>
          <div class="conv__bg-options">
            <label class="conv__radio"><input type="radio" name="convQuality" value="1" checked> 1x</label>
            <label class="conv__radio"><input type="radio" name="convQuality" value="2"> 2x</label>
            <label class="conv__radio"><input type="radio" name="convQuality" value="3"> 3x</label>
            <label class="conv__radio"><input type="radio" name="convQuality" value="4"> 4x</label>
          </div>
        </div>
        <button class="conv__reset-btn" id="convResetSvg" data-tip="Reset to defaults">
          <span class="material-symbols-outlined">restart_alt</span> Reset
        </button>
      </div>

      <!-- PNG→SVG options (hidden by default) -->
      <div class="conv__opts-group" id="convPngOpts" style="display:none">
        <div class="conv__opt-row">
          <label class="conv__opt-label">Mode <span class="conv__tip-icon" data-tip="Icon preserves tiny symbols and cutouts. Logo is tuned for flat brand artwork and raster logos.">?</span></label>
          <div class="conv__bg-options">
            <label class="conv__radio"><input type="radio" name="convAssetMode" value="icon"> Icon</label>
            <label class="conv__radio"><input type="radio" name="convAssetMode" value="logo" checked> Logo</label>
          </div>
        </div>
        <div class="conv__opt-row">
          <label class="conv__opt-label">Preset <span class="conv__tip-icon" data-tip="Auto chooses the best trace path. Compact favors smaller SVGs. Exact keeps more detail when fidelity matters most.">?</span></label>
          <div class="conv__bg-options">
            <label class="conv__radio"><input type="radio" name="convPreset" value="auto" checked> Auto</label>
            <label class="conv__radio"><input type="radio" name="convPreset" value="posterized2"> Compact</label>
            <label class="conv__radio"><input type="radio" name="convPreset" value="detailed"> Exact</label>
          </div>
        </div>
        <div class="conv__opt-row">
          <label class="conv__opt-label">Output Size <span class="conv__tip-icon" data-tip="Auto uses a practical export size. Original keeps the cropped PNG dimensions. Custom sets export width in px and derives height automatically. This changes export dimensions, not preview size, and usually does not reduce SVG KB unless the paths are simplified.">?</span></label>
          <div class="conv__bg-options">
            <label class="conv__radio"><input type="radio" name="convExportSizeMode" value="auto" checked> Auto</label>
            <label class="conv__radio"><input type="radio" name="convExportSizeMode" value="original"> Original</label>
            <label class="conv__radio"><input type="radio" name="convExportSizeMode" value="custom"> Custom</label>
            <div class="conv__size-custom-wrap" id="convExportWidthWrap" style="display:none">
              <input type="number" class="conv__size-custom" id="convExportWidth" min="16" max="4096" value="512">
              <span class="conv__size-custom-unit">px</span>
            </div>
          </div>
        </div>
        <div class="conv__opt-row">
          <label class="conv__opt-label">Background <span class="conv__tip-icon" data-tip="Changes the preview surface only so you can inspect the traced SVG on different backgrounds.">?</span></label>
          <div class="conv__bg-options">
            <label class="conv__radio"><input type="radio" name="convPreviewBg" value="transparent" checked> Transparent</label>
            <label class="conv__radio"><input type="radio" name="convPreviewBg" value="white"> White</label>
            <label class="conv__radio"><input type="radio" name="convPreviewBg" value="black"> Black</label>
            <label class="conv__radio"><input type="radio" name="convPreviewBg" value="custom"> Custom</label>
            <input type="color" id="convPreviewBgColor" value="#ffffff" class="conv__color-input" style="display:none">
          </div>
        </div>
        <div class="conv__opt-row">
          <label class="conv__opt-label">Compare <span class="conv__tip-icon" data-tip="Switch between the traced result and the original source to judge fidelity.">?</span></label>
          <div class="conv__chip-group" id="convCompareModes">
            ${renderConverterChipGroup('compare', CONVERTER_COMPARE_OPTIONS, converterState.compareMode, 'compare')}
          </div>
        </div>
        <div class="conv__opt-row">
          <label class="conv__opt-label">Helpers <span class="conv__tip-icon" data-tip="Auto Crop trims empty edges around the source image before tracing, which usually gives cleaner logo and icon results.">?</span></label>
          <div class="conv__bg-options">
            <label class="conv__radio"><input type="checkbox" id="convAutoCrop" checked> Auto Crop</label>
          </div>
        </div>
        <button class="conv__reset-btn" id="convResetPng" data-tip="Reset to defaults">
          <span class="material-symbols-outlined">restart_alt</span> Reset
        </button>
      </div>
    </div>

    <div class="desktop-tool-glimpse desktop-tool-glimpse--converter" id="convMobileGlimpse">
      <div class="desktop-tool-glimpse__card" role="note" aria-label="Converter mobile notice">
        <div class="desktop-tool-glimpse__eyebrow">Desktop-first tool</div>
        <h3 class="desktop-tool-glimpse__title">Converter is optimized for desktop</h3>
        <p class="desktop-tool-glimpse__copy">Preview the converter here, then open Supericons on a larger screen to convert and export files with the full workspace.</p>
        <p class="desktop-tool-glimpse__hint">On smaller screens this stays read-only so the interface remains clear instead of cramped.</p>
        <div class="desktop-tool-glimpse__actions">
          <button type="button" class="desktop-tool-glimpse__btn desktop-tool-glimpse__btn--ghost" id="convMobileBackBtn">Back to icons</button>
          <button type="button" class="desktop-tool-glimpse__btn" id="convMobilePricingBtn">See pricing</button>
        </div>
      </div>
    </div>

  `;
  gridArea.appendChild(view);
  document.getElementById('convMobileBackBtn')?.addEventListener('click', () => switchView('icons'));
  document.getElementById('convMobilePricingBtn')?.addEventListener('click', () => switchView('pricing'));
  initConverterControls();
}

function renderConverterLab() {
  renderConverter();

  const view = document.getElementById('converterView');
  const header = view?.querySelector('.conv__header');
  if (!view || !header) return;

  view.dataset.converterVariant = 'lab';

  const intro = document.createElement('div');
  intro.id = 'converterLabIntro';
  intro.style.marginBottom = '20px';
  intro.innerHTML = `
    <div class="desktop-tool-glimpse__eyebrow">Experimental route</div>
    <p style="margin: 10px 0 0; max-width: 760px; color: var(--si-text-dim);">
      This lab is isolated from the stable converter. Its settings persist separately so we can test ideas here
      without mutating the current production browser workflow.
    </p>
    <div style="display:flex; gap:12px; flex-wrap:wrap; margin-top: 12px;">
      <button class="collection-detail__buy-btn" id="converterLabOpenStableBtn">Open stable converter</button>
      <button class="collection-detail__buy-btn collection-detail__buy-btn--ghost" id="converterLabBackBtn">Back to icons</button>
    </div>
  `;

  header.prepend(intro);
  document.getElementById('converterLabOpenStableBtn')?.addEventListener('click', () => switchView('converter'));
  document.getElementById('converterLabBackBtn')?.addEventListener('click', () => switchView('icons'));

  const options = document.getElementById('convOptions');
  if (options) {
    const labPanel = document.createElement('div');
    labPanel.id = 'converterLabPanel';
    labPanel.className = 'conv__opts-group';
    labPanel.style.marginBottom = '16px';
    labPanel.innerHTML = `
      <div class="conv__opt-row" style="display:block;">
        <label class="conv__opt-label">Lab Strategy</label>
        <p style="margin: 6px 0 12px; color: var(--si-text-dim);">
          Strategy affects only the lab route. Stable baseline matches the current converter. Brand color first is an experimental logo path for colored marks.
        </p>
        <div class="conv__chip-group" id="converterLabStrategyGroup" style="display:flex; flex-wrap:wrap; gap:8px;">
          ${CONVERTER_LAB_STRATEGIES.map((strategy) => `
            <button
              type="button"
              class="conv__chip-btn"
              data-converter-lab-strategy="${strategy.key}"
              title="${strategy.note}"
            >${strategy.label}</button>
          `).join('')}
        </div>
      </div>
      <div class="conv__opt-row" style="display:block;">
        <label class="conv__opt-label">Lab Starter Profiles</label>
        <p style="margin: 6px 0 12px; color: var(--si-text-dim);">
          These are lab-only helper presets. They do not change the stable converter and exist to speed up side-by-side testing.
        </p>
        <div class="conv__chip-group" id="converterLabStarterGroup" style="display:flex; flex-wrap:wrap; gap:8px;">
          ${CONVERTER_LAB_STARTERS.map((starter) => `
            <button
              type="button"
              class="conv__chip-btn"
              data-converter-lab-starter="${starter.key}"
              title="${starter.note}"
            >${starter.label}</button>
          `).join('')}
        </div>
      </div>
      <div class="conv__opt-row" style="display:block; margin-top: 16px;">
        <label class="conv__opt-label">Live Lab Summary</label>
        <div
          id="converterLabSummary"
          style="margin-top: 8px; padding: 12px; border: 1px solid var(--si-border); border-radius: 12px; background: var(--si-surface-2); color: var(--si-text-dim);"
        ></div>
      </div>
    `;
    options.prepend(labPanel);
  }

  document.querySelectorAll('[data-converter-lab-starter]').forEach((button) => {
    button.addEventListener('click', () => applyConverterLabStarter(button.dataset.converterLabStarter || ''));
  });
  document.querySelectorAll('[data-converter-lab-strategy]').forEach((button) => {
    button.addEventListener('click', () => applyConverterLabStrategy(button.dataset.converterLabStrategy || ''));
  });

  updateConverterLabSummary();
}

const CONVERTER_LAB_STARTERS = [
  {
    key: 'safe-full-color',
    label: 'Safe full-color',
    note: 'Use this as a conservative starting point for logos or artwork with multiple colors.',
    assetMode: 'logo',
    preset: 'auto',
  },
  {
    key: 'flat-logo-pass',
    label: 'Flat logo pass',
    note: 'A sharper first pass for flat colored logo artwork.',
    assetMode: 'logo',
    preset: 'detailed',
  },
  {
    key: 'tiny-interface-icon',
    label: 'Tiny interface icon',
    note: 'A detail-preserving pass for small UI icon sources.',
    assetMode: 'icon',
    preset: 'detailed',
  },
  {
    key: 'single-color-mark',
    label: 'Single-color mark',
    note: 'A tight pass for simple brand marks and wordmarks.',
    assetMode: 'logo',
    preset: 'detailed',
  },
  {
    key: 'small-colored-badge',
    label: 'Small colored badge',
    note: 'A compact icon-oriented pass for small colored marks or badges.',
    assetMode: 'icon',
    preset: 'detailed',
  },
  {
    key: 'high-contrast-mask',
    label: 'High-contrast mask',
    note: 'A strong starting point for silhouette-like or mask-like inputs.',
    assetMode: 'logo',
    preset: 'detailed',
  },
];

const CONVERTER_LAB_STRATEGIES = [
  {
    key: 'stable',
    label: 'Stable baseline',
    note: 'Uses the same route-selection logic as the current production converter.',
  },
  {
    key: 'brand-color-first',
    label: 'Brand color first',
    note: 'Experimental logo strategy that resists mono routing for single-hue colored marks.',
  },
];

function getActiveConverterLabStarterKey() {
  const match = CONVERTER_LAB_STARTERS.find((starter) => (
    starter.assetMode === converterState.assetMode
    && starter.preset === converterState.preset
  ));
  return match?.key || '';
}

function updateConverterLabSummary() {
  const summary = document.getElementById('converterLabSummary');
  if (!summary) return;

  const proofServiceState = CONVERTER_PROOF_SERVICE_URL ? 'Configured' : 'Browser only';
  const outputMetrics = converterState.traceMetrics
    ? `${converterState.traceMetrics.pathCount} paths · ${converterState.traceMetrics.complexity}`
    : 'No trace metrics yet';
  const activeStarter = getActiveConverterLabStarterKey();
  const activeStrategy = CONVERTER_LAB_STRATEGIES.find((strategy) => strategy.key === converterState.labStrategy);

  document.querySelectorAll('[data-converter-lab-starter]').forEach((button) => {
    button.classList.toggle('conv__chip-btn--active', button.dataset.converterLabStarter === activeStarter);
  });
  document.querySelectorAll('[data-converter-lab-strategy]').forEach((button) => {
    button.classList.toggle('conv__chip-btn--active', button.dataset.converterLabStrategy === converterState.labStrategy);
  });

  summary.innerHTML = `
    <div style="display:grid; gap:8px;">
      <div><strong>Mode:</strong> ${converterState.mode === 'png-to-svg' ? 'PNG → SVG' : 'SVG → PNG'}</div>
      <div><strong>Strategy:</strong> ${activeStrategy?.label || converterState.labStrategy}</div>
      <div><strong>Asset mode:</strong> ${converterState.assetMode}</div>
      <div><strong>Preset:</strong> ${getConverterPresetLabel(converterState.preset)}</div>
      <div><strong>Compare:</strong> ${converterState.compareMode}</div>
      <div><strong>Proof service:</strong> ${proofServiceState}</div>
      <div><strong>Trace route:</strong> ${converterState.labLastTraceRoute || 'Not resolved yet'}</div>
      <div><strong>Trace class:</strong> ${converterState.labLastTraceClass || 'Not resolved yet'}</div>
      <div><strong>Service mode:</strong> ${converterState.labLastServiceRequestedColorMode || 'Not resolved yet'}</div>
      <div><strong>Service quality:</strong> ${converterState.labLastServiceQualityMode || 'Not resolved yet'}</div>
      <div><strong>Trace summary:</strong> ${outputMetrics}</div>
      <div><strong>Export target:</strong> ${converterState.exportSizeMode}${converterState.exportSizeMode === 'custom' ? ` (${converterState.exportTargetWidth}px)` : ''}</div>
    </div>
  `;
}

function applyConverterLabStarter(starterKey) {
  const starter = CONVERTER_LAB_STARTERS.find((item) => item.key === starterKey);
  if (!starter) return;

  converterState.assetMode = starter.assetMode;
  converterState.preset = starter.preset;
  converterState.exportSizeMode = 'auto';
  converterState.exportTargetWidth = getConverterDefaultExportLongestEdge(starter.assetMode);
  converterState.compareMode = 'split';
  converterState.autoCrop = true;
  updateConverterPngUiState();
  updateConverterLabSummary();

  if (converterState.mode === 'png-to-svg' && converterState.pngDataUrl) {
    runConversion();
  }
}

function applyConverterLabStrategy(strategyKey) {
  const strategy = CONVERTER_LAB_STRATEGIES.find((item) => item.key === strategyKey);
  if (!strategy) return;
  converterState.labStrategy = strategy.key;
  updateConverterLabSummary();
  if (converterState.mode === 'png-to-svg' && converterState.pngDataUrl) {
    runConversion();
  }
}

function initConverterControls() {
  // Mode tabs
  document.querySelectorAll('.conv__mode-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.conv__mode-tab').forEach(t => t.classList.remove('conv__mode-tab--active'));
      tab.classList.add('conv__mode-tab--active');
      converterState.mode = tab.dataset.mode;
      // Toggle option panels
      const svgOpts = document.getElementById('convSvgOpts');
      const pngOpts = document.getElementById('convPngOpts');
      const dropText = document.getElementById('convDropText');
      const fileInput = document.getElementById('convFileInput');
      if (converterState.mode === 'svg-to-png') {
        if (svgOpts) svgOpts.style.display = '';
        if (pngOpts) pngOpts.style.display = 'none';
        if (dropText) dropText.textContent = 'Drop an SVG here or click to browse';
        if (fileInput) fileInput.accept = '.svg';
        document.getElementById('convDownloadLabel').textContent = 'Download PNG';
        document.getElementById('convCopyLabel').textContent = 'Copy';
        document.getElementById('convPasteBtn').style.display = '';
      } else {
        if (svgOpts) svgOpts.style.display = 'none';
        if (pngOpts) pngOpts.style.display = '';
        if (dropText) dropText.textContent = 'Drop a PNG/JPG here or click to browse';
        if (fileInput) fileInput.accept = '.png,.jpg,.jpeg,.gif,.webp';
        document.getElementById('convDownloadLabel').textContent = 'Download SVG';
        document.getElementById('convCopyLabel').textContent = 'Copy SVG';
        document.getElementById('convPasteBtn').style.display = 'none';
      }
      // Full state reset when switching modes
      clearConverterInput();
    });
  });

  // File input / browse
  const browseBtn = document.getElementById('convBrowseBtn');
  const fileInput = document.getElementById('convFileInput');
  browseBtn?.addEventListener('click', () => fileInput?.click());
  fileInput?.addEventListener('change', e => {
    const file = e.target.files?.[0];
    if (file) loadConverterFile(file);
  });

  // Drag and drop
  const dropZone = document.getElementById('convDropZone');
  dropZone?.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('conv__drop-zone--active'); });
  dropZone?.addEventListener('dragleave', () => dropZone.classList.remove('conv__drop-zone--active'));
  dropZone?.addEventListener('drop', e => {
    e.preventDefault();
    dropZone.classList.remove('conv__drop-zone--active');
    const file = e.dataTransfer?.files?.[0];
    if (file) loadConverterFile(file);
  });

  // Clear button
  document.getElementById('convClearBtn')?.addEventListener('click', clearConverterInput);
  document.getElementById('convInputStage')?.addEventListener('wheel', (event) => handleConverterPreviewWheel(event, 'input'), { passive: false });
  document.getElementById('convPreviewStage')?.addEventListener('wheel', (event) => handleConverterPreviewWheel(event, 'output'), { passive: false });
  bindConverterPreviewPan(document.getElementById('convInputStage'), 'input');
  bindConverterPreviewPan(document.getElementById('convPreviewStage'), 'output');
  ['convInputImg', 'convOriginalOverlayImg', 'convOutputOverlayImg', 'convOriginalSplitImg', 'convOutputSplitImg'].forEach((id) => {
    document.getElementById(id)?.addEventListener('load', () => {
      updateConverterPreviewZoomUi({ center: true });
    });
  });

  // Paste SVG code button
  document.getElementById('convPasteBtn')?.addEventListener('click', async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && text.trim().startsWith('<')) {
        loadConverterSvgText(text.trim(), 'pasted.svg');
      } else {
        showToast('Clipboard does not contain SVG code');
      }
    } catch {
      // Clipboard API denied - fall back to prompt
      const text = prompt('Paste your SVG code:');
      if (text && text.trim().startsWith('<')) {
        loadConverterSvgText(text.trim(), 'pasted.svg');
      }
    }
  });

  // Keyboard paste (Ctrl+V) on drop zone
  document.addEventListener('paste', e => {
    const conv = document.getElementById('converterView');
    if (!conv) return;
    const text = e.clipboardData?.getData('text/plain');
    if (text && text.trim().startsWith('<svg')) {
      e.preventDefault();
      loadConverterSvgText(text.trim(), 'pasted.svg');
    }
  });

  // Size presets
  document.querySelectorAll('.conv__size-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.conv__size-btn').forEach(b => b.classList.remove('conv__size-btn--active'));
      btn.classList.add('conv__size-btn--active');
      converterState.size = parseInt(btn.dataset.size, 10);
      const customInput = document.getElementById('convCustomSize');
      if (customInput) customInput.value = converterState.size;
      runConversion();
    });
  });

  // Custom size
  document.getElementById('convCustomSize')?.addEventListener('input', e => {
    const val = parseInt(e.target.value, 10);
    if (val >= 1 && val <= 4096) {
      converterState.size = val;
      document.querySelectorAll('.conv__size-btn').forEach(b => b.classList.remove('conv__size-btn--active'));
      runConversion();
    }
  });

  // Background
  document.querySelectorAll('[name="convBg"]').forEach(radio => {
    radio.addEventListener('change', () => {
      converterState.background = radio.value;
      const colorPicker = document.getElementById('convBgColor');
      if (colorPicker) colorPicker.style.display = radio.value === 'custom' ? 'inline-block' : 'none';
      runConversion();
    });
  });
  document.getElementById('convBgColor')?.addEventListener('input', e => {
    converterState.bgColor = e.target.value;
    runConversion();
  });

  // Fill / stroke palettes
  const fillDots = document.getElementById('convFillDots');
  fillDots?.addEventListener('click', (event) => {
    const dot = event.target.closest('.conv__color-dot');
    if (!dot || dot.disabled || !converterState.paintSupport.supportsFill) return;
    converterState.fillColor = dot.dataset.convColor || null;
    updateConverterSvgUiState();
    runConversion();
  });
  document.getElementById('convFillPicker')?.addEventListener('input', (event) => {
    if (!converterState.paintSupport.supportsFill) return;
    converterState.fillColor = event.target.value;
    updateConverterSvgUiState();
    runConversion();
  });

  const strokeDots = document.getElementById('convStrokeDots');
  strokeDots?.addEventListener('click', (event) => {
    const dot = event.target.closest('.conv__color-dot');
    if (!dot || dot.disabled || !converterState.paintSupport.supportsStroke) return;
    converterState.strokeColor = dot.dataset.convColor || null;
    updateConverterSvgUiState();
    runConversion();
  });
  document.getElementById('convStrokePicker')?.addEventListener('input', (event) => {
    if (!converterState.paintSupport.supportsStroke) return;
    converterState.strokeColor = event.target.value;
    updateConverterSvgUiState();
    runConversion();
  });

  // Padding
  document.getElementById('convPadding')?.addEventListener('input', e => {
    converterState.padding = parseInt(e.target.value, 10);
    const valEl = document.getElementById('convPaddingVal');
    if (valEl) valEl.textContent = `${converterState.padding}px`;
    runConversion();
  });

  // Quality
  document.querySelectorAll('[name="convQuality"]').forEach(radio => {
    radio.addEventListener('change', () => {
      converterState.quality = parseInt(radio.value, 10);
      runConversion();
    });
  });

  // PNG→SVG options
  document.querySelectorAll('[name="convAssetMode"]').forEach(r => {
    r.addEventListener('change', e => {
      converterState.assetMode = e.target.value;
      if (converterState.exportSizeMode === 'auto') {
        converterState.exportTargetWidth = getConverterDefaultExportLongestEdge(converterState.assetMode);
      }
      updateConverterPngUiState();
      runConversion();
    });
  });
  document.querySelectorAll('[name="convPreset"]').forEach(r => {
    r.addEventListener('change', e => { converterState.preset = e.target.value; runConversion(); });
  });
  document.querySelectorAll('[name="convExportSizeMode"]').forEach(r => {
    r.addEventListener('change', e => {
      converterState.exportSizeMode = e.target.value;
      if (converterState.exportSizeMode === 'auto') {
        converterState.exportTargetWidth = getConverterDefaultExportLongestEdge(converterState.assetMode);
      }
      updateConverterPngUiState();
      runConversion();
    });
  });
  document.getElementById('convExportWidth')?.addEventListener('change', (event) => {
    converterState.exportTargetWidth = clampConverterExportTargetWidth(event.target.value, converterState.assetMode);
    updateConverterPngUiState();
    if (converterState.exportSizeMode === 'custom') {
      runConversion();
    }
  });
  document.querySelectorAll('[name="convPreviewBg"]').forEach((radio) => {
    radio.addEventListener('change', () => {
      converterState.previewBackground = radio.value;
      updateConverterPngUiState();
    });
  });
  document.getElementById('convPreviewBgColor')?.addEventListener('input', (event) => {
    converterState.previewBgColor = event.target.value;
    updateConverterPngUiState();
  });
  document.querySelectorAll('.conv__chip-btn[data-conv-group="compare"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      converterState.compareMode = btn.dataset.compare || 'trace';
      updateConverterPngUiState();
    });
  });
  document.getElementById('convAutoCrop')?.addEventListener('change', (event) => {
    converterState.autoCrop = Boolean(event.target.checked);
    updateConverterPngUiState();
    runConversion();
  });

  // Reset buttons
  document.getElementById('convResetPng')?.addEventListener('click', () => {
    // Reset PNG→SVG state to defaults
    converterState.assetMode = 'logo';
    converterState.preset = 'auto';
    converterState.exportSizeMode = 'auto';
    converterState.exportTargetWidth = getConverterDefaultExportLongestEdge('logo');
    converterState.threshold = 128;
    converterState.smoothness = 50;
    resetConverterPngStyleState();
    // Update UI controls
    document.querySelector('[name="convAssetMode"][value="logo"]').checked = true;
    document.querySelector('[name="convPreset"][value="auto"]').checked = true;
    document.querySelector('[name="convExportSizeMode"][value="auto"]').checked = true;
    const exportWidth = document.getElementById('convExportWidth');
    if (exportWidth) exportWidth.value = getConverterDefaultExportLongestEdge('logo');
    updateConverterPngUiState();
    runConversion();
  });
  document.getElementById('convResetSvg')?.addEventListener('click', () => {
    // Reset SVG→PNG state to defaults
    converterState.size = 64;
    converterState.background = 'transparent';
    converterState.bgColor = '#ffffff';
    converterState.padding = 8;
    converterState.quality = 1;
    resetConverterSvgStyleState();
    // Update UI controls
    document.querySelectorAll('.conv__size-btn').forEach(b => {
      b.classList.toggle('conv__size-btn--active', b.dataset.size === '64');
    });
    const customSize = document.getElementById('convCustomSize');
    if (customSize) customSize.value = 64;
    document.querySelector('[name="convBg"][value="transparent"]').checked = true;
    const colorPicker = document.getElementById('convBgColor');
    if (colorPicker) { colorPicker.style.display = 'none'; colorPicker.value = '#ffffff'; }
    const padSlider = document.getElementById('convPadding');
    if (padSlider) padSlider.value = 8;
    const padVal = document.getElementById('convPaddingVal');
    if (padVal) padVal.textContent = '8px';
    document.querySelector('[name="convQuality"][value="1"]').checked = true;
    updateConverterSvgUiState();
    runConversion();
  });

  // Download button
  document.getElementById('convDownload')?.addEventListener('click', async (e) => {
    if (!converterState.outputBlob) return;
    const status = await requirePro();
    if (status !== 'pro') {
      if (status === 'free') showUpgradePrompt(e.currentTarget, 'conversions');
      return;
    }
    closeUpgradePrompt();
    const ext = converterState.mode === 'svg-to-png' ? 'png' : 'svg';
    const url = URL.createObjectURL(converterState.outputBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `icon.${ext}`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });

  // Copy to clipboard
  document.getElementById('convCopyClipboard')?.addEventListener('click', async (e) => {
    if (!converterState.outputBlob) return;
    const status = await requirePro();
    if (status !== 'pro') {
      if (status === 'free') showUpgradePrompt(e.currentTarget, 'conversions');
      return;
    }
    closeUpgradePrompt();
    try {
      if (converterState.mode === 'svg-to-png') {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': converterState.outputBlob })]);
        showToast('PNG copied to clipboard!');
      } else {
        const text = await converterState.outputBlob.text();
        await navigator.clipboard.writeText(text);
        showToast('SVG code copied!');
      }
    } catch {
      showToast('Copy failed - try downloading instead');
    }
  });

  // Global paste (Ctrl+V)
  const handlePaste = (e) => {
    if (!document.getElementById('converterView')) return; // Only active when converter is open
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const blob = item.getAsFile();
        if (blob) loadConverterFile(blob);
        return;
      }
      if (item.type === 'text/plain') {
        item.getAsString(text => {
          if (text.trim().startsWith('<svg')) {
            loadConverterSvgText(text.trim());
          }
        });
        return;
      }
    }
  };
  document.addEventListener('paste', handlePaste);
  // Clean up when view is removed
  const view = document.getElementById('converterView');
  if (view) {
    const observer = new MutationObserver(() => {
      if (!document.getElementById('converterView')) {
        document.removeEventListener('paste', handlePaste);
        observer.disconnect();
      }
    });
    observer.observe(document.body, { childList: true });
  }

  updateConverterSvgUiState();
  updateConverterPngUiState();
  updateConverterPreviewZoomUi();
}

function loadConverterFile(file) {
  const reader = new FileReader();
  if (file.type === 'image/svg+xml' || file.name?.endsWith('.svg')) {
    reader.onload = e => loadConverterSvgText(e.target.result, file.name || 'icon.svg');
    reader.readAsText(file);
  } else {
    reader.onload = e => loadConverterPng(e.target.result, file.name || 'image');
    reader.readAsDataURL(file);
  }
}

function loadConverterSvgText(svgText, filename) {
  resetConverterPreviewZoom();
  const rasterPrep = prepareConverterSvgForRasterization(svgText);
  converterState.svgText = svgText;
  converterState.svgPreparedText = rasterPrep.normalized ? rasterPrep.svgText : '';
  converterState.svgRasterAdvice = rasterPrep.advice;
  converterState.mode = 'svg-to-png';
  converterState.traceMetrics = null;
  converterState.traceAdvice = null;
  converterState.outputExportSize = null;
  converterState.previewOriginalDataUrl = '';
  converterState.labLastTraceRoute = '';
  converterState.labLastTraceClass = '';
  converterState.labLastServiceRequestedColorMode = '';
  converterState.labLastServiceQualityMode = '';
  converterState.paintSupport = analyzeConverterSvgPaintSupport(rasterPrep.svgText || svgText);
  // Switch to SVG→PNG mode
  document.querySelectorAll('.conv__mode-tab').forEach(t => t.classList.remove('conv__mode-tab--active'));
  document.querySelector('[data-mode="svg-to-png"]')?.classList.add('conv__mode-tab--active');
  document.getElementById('convSvgOpts').style.display = '';
  document.getElementById('convPngOpts').style.display = 'none';
  document.getElementById('convDownloadLabel').textContent = 'Download PNG';
  document.getElementById('convCopyLabel').textContent = 'Copy';
  document.getElementById('convPasteBtn').style.display = '';

  // Show input preview with SVG rendered as img
  const previewSvg = rasterPrep.svgText || svgText;
  const blob = new Blob([previewSvg], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  replaceConverterInputObjectUrl(url);
  showConverterInput(url, filename || 'Pasted SVG', svgText.length);
  converterState.pngDataUrl = '';
  updateConverterSvgUiState();
  updateConverterPreviewStage();
  updateConverterPreviewZoomUi({ center: true });
  runConversion();
}

function loadConverterPng(dataUrl, filename) {
  resetConverterPreviewZoom();
  replaceConverterInputObjectUrl('');
  converterState.pngDataUrl = dataUrl;
  converterState.svgText = '';
  converterState.svgPreparedText = '';
  converterState.svgRasterAdvice = null;
  converterState.previewOriginalDataUrl = dataUrl;
  converterState.traceMetrics = null;
  converterState.traceAdvice = null;
  converterState.outputExportSize = null;
  converterState.labLastTraceRoute = '';
  converterState.labLastTraceClass = '';
  converterState.labLastServiceRequestedColorMode = '';
  converterState.labLastServiceQualityMode = '';
  converterState.paintSupport = {
    supportsFill: false,
    supportsStroke: false,
    mode: 'unknown',
    fillCount: 0,
    strokeCount: 0,
  };
  converterState.mode = 'png-to-svg';
  // Switch to PNG→SVG mode
  document.querySelectorAll('.conv__mode-tab').forEach(t => t.classList.remove('conv__mode-tab--active'));
  document.querySelector('[data-mode="png-to-svg"]')?.classList.add('conv__mode-tab--active');
  document.getElementById('convSvgOpts').style.display = 'none';
  document.getElementById('convPngOpts').style.display = '';
  document.getElementById('convDownloadLabel').textContent = 'Download SVG';
  document.getElementById('convCopyLabel').textContent = 'Copy SVG';
  document.getElementById('convPasteBtn').style.display = 'none';
  showConverterInput(dataUrl, filename, null);
  updateConverterSvgUiState();
  updateConverterPngUiState();
  updateConverterPreviewZoomUi({ center: true });
  runConversion();
}

function showConverterInput(url, filename, byteSize) {
  const dropZone = document.getElementById('convDropZone');
  const inputPreview = document.getElementById('convInputPreview');
  const inputImg = document.getElementById('convInputImg');
  const inputMeta = document.getElementById('convInputMeta');
  if (dropZone) dropZone.style.display = 'none';
  if (inputPreview) inputPreview.style.display = '';
  if (inputImg) inputImg.src = url;
  if (inputMeta && filename) {
    const sizeStr = byteSize ? ` · ${(byteSize / 1024).toFixed(1)}KB` : '';
    inputMeta.textContent = `${filename}${sizeStr}`;
  }
  updateConverterPreviewZoomUi({ center: true });
}

function resetConverterOutputPlaceholder(message = 'Preview appears here', icon = 'image_search') {
  const outputEmpty = document.getElementById('convOutputEmpty');
  if (!outputEmpty) return;
  outputEmpty.innerHTML = `
    <span class="material-symbols-outlined" style="font-size:40px;color:var(--si-text-dim)">${icon}</span>
    <p>${message}</p>
  `;
}

function showConverterPendingOutput(message = 'Tracing preview…') {
  converterState.outputBlob = null;
  replaceConverterOutputObjectUrl('');
  converterState.outputDataUrl = '';
  converterState.traceMetrics = null;
  converterState.traceAdvice = null;
  converterState.outputPreviewSize = null;
  converterState.outputExportSize = null;

  const outputPreview = document.getElementById('convOutputPreview');
  const outputEmpty = document.getElementById('convOutputEmpty');
  const outputMeta = document.getElementById('convOutputMeta');
  const outputNote = document.getElementById('convQualityNote');
  const actions = document.getElementById('convActions');

  if (outputPreview) outputPreview.style.display = 'none';
  resetConverterOutputPlaceholder(message, 'progress_activity');
  if (outputEmpty) outputEmpty.style.display = '';
  if (outputMeta) outputMeta.textContent = '';
  if (outputNote) {
    outputNote.textContent = '';
    outputNote.style.display = 'none';
    outputNote.classList.remove('conv__quality-note--warn', 'conv__quality-note--info');
  }
  if (actions) actions.style.display = 'none';
  updateConverterPreviewStage();
  updateConverterLabSummary();
}

function showConverterProofServiceOffline(proofErr) {
  converterState.outputBlob = null;
  replaceConverterOutputObjectUrl('');
  converterState.outputDataUrl = '';
  converterState.traceMetrics = null;
  converterState.outputPreviewSize = null;
  converterState.outputExportSize = null;
  converterState.traceAdvice = {
    tone: 'warn',
    text: 'Start npm run converter:proof-service in a second terminal while npm run dev is running.',
  };

  const outputPreview = document.getElementById('convOutputPreview');
  const outputEmpty = document.getElementById('convOutputEmpty');
  const outputMeta = document.getElementById('convOutputMeta');
  const outputNote = document.getElementById('convQualityNote');
  const actions = document.getElementById('convActions');

  if (outputPreview) outputPreview.style.display = 'none';
  resetConverterOutputPlaceholder('Local PNG-to-SVG service is offline.', 'cloud_off');
  if (outputEmpty) outputEmpty.style.display = '';
  if (outputMeta) outputMeta.textContent = 'Reliable color tracing requires the local vector service.';
  if (outputNote) {
    outputNote.textContent = converterState.traceAdvice.text;
    outputNote.style.display = '';
    outputNote.classList.remove('conv__quality-note--info');
    outputNote.classList.add('conv__quality-note--warn');
  }
  if (actions) actions.style.display = 'none';
  updateConverterPreviewStage();
  updateConverterLabSummary();
  console.warn('[Converter] Local proof service unavailable:', proofErr);
}

function showConverterSvgDecodeFailure(traceAdvice = null) {
  converterState.outputBlob = null;
  replaceConverterOutputObjectUrl('');
  converterState.outputDataUrl = '';
  converterState.traceMetrics = null;
  converterState.traceAdvice = traceAdvice;
  converterState.outputPreviewSize = null;
  converterState.outputExportSize = null;

  const outputPreview = document.getElementById('convOutputPreview');
  const outputEmpty = document.getElementById('convOutputEmpty');
  const outputMeta = document.getElementById('convOutputMeta');
  const outputNote = document.getElementById('convQualityNote');
  const actions = document.getElementById('convActions');

  if (outputPreview) outputPreview.style.display = 'none';
  resetConverterOutputPlaceholder('This SVG could not be rasterized.', 'warning');
  if (outputEmpty) outputEmpty.style.display = '';
  if (outputMeta) outputMeta.textContent = 'Browser image export can fail on unsupported embedded resources.';
  if (outputNote) {
    outputNote.classList.remove('conv__quality-note--info', 'conv__quality-note--warn');
    if (traceAdvice?.text) {
      outputNote.textContent = traceAdvice.text;
      outputNote.classList.add(`conv__quality-note--${traceAdvice.tone || 'warn'}`);
      outputNote.style.display = '';
    } else {
      outputNote.textContent = 'Common causes: external web fonts, remote images, or unsupported embedded resources.';
      outputNote.classList.add('conv__quality-note--warn');
      outputNote.style.display = '';
    }
  }
  if (actions) actions.style.display = 'none';
  updateConverterPreviewStage();
}

function clearConverterInput() {
  resetConverterPreviewZoom();
  replaceConverterInputObjectUrl('');
  replaceConverterOutputObjectUrl('');
  converterState.svgText = '';
  converterState.svgPreparedText = '';
  converterState.pngDataUrl = '';
  converterState.outputBlob = null;
  converterState.outputDataUrl = '';
  converterState.previewOriginalDataUrl = '';
  converterState.traceMetrics = null;
  converterState.traceAdvice = null;
  converterState.svgRasterAdvice = null;
  converterState.outputPreviewSize = null;
  converterState.labLastTraceRoute = '';
  converterState.labLastTraceClass = '';
  converterState.labLastServiceRequestedColorMode = '';
  converterState.labLastServiceQualityMode = '';
  converterState.paintSupport = {
    supportsFill: false,
    supportsStroke: false,
    mode: 'unknown',
    fillCount: 0,
    strokeCount: 0,
  };
  document.getElementById('convDropZone').style.display = '';
  document.getElementById('convInputPreview').style.display = 'none';
  document.getElementById('convOutputPreview').style.display = 'none';
  document.getElementById('convOutputEmpty').style.display = '';
  resetConverterOutputPlaceholder();
  document.getElementById('convActions').style.display = 'none';
  const fileInput = document.getElementById('convFileInput');
  if (fileInput) fileInput.value = '';
  updateConverterSvgUiState();
  updateConverterPngUiState();
  updateConverterPreviewZoomUi();
  updateConverterLabSummary();
}

function runConversion() {
  if (converterState.mode === 'svg-to-png') {
    if (!converterState.svgText) return;
    convertSvgToPng();
  } else {
    if (!converterState.pngDataUrl) return;
    convertPngToSvg();
  }
}

// SVG-to-PNG race guard (mirrors PNG-to-SVG token)
let _svgConvToken = 0;

function convertSvgToPng() {
  const sourceSvgText = converterState.svgPreparedText || converterState.svgText;
  const { size, background, bgColor, padding, quality } = converterState;
  const myToken = ++_svgConvToken;
  const targetSize = size * quality;
  showConverterPendingOutput('Rendering preview…');

  // Parse SVG to get viewBox / intrinsic size
  const parser = new DOMParser();
  const doc = parser.parseFromString(sourceSvgText, 'image/svg+xml');
  const svgEl = doc.querySelector('svg');
  if (!svgEl) { showToast('Invalid SVG'); return; }

  // Get intrinsic aspect ratio from viewBox (or width/height attrs)
  let vbW, vbH;
  const vb = svgEl.getAttribute('viewBox');
  if (vb) {
    const parts = vb.split(/[\s,]+/).map(Number);
    vbW = parts[2];
    vbH = parts[3];
  }
  if (!vbW || !vbH) {
    vbW = parseFloat(svgEl.getAttribute('width')) || targetSize;
    vbH = parseFloat(svgEl.getAttribute('height')) || targetSize;
  }

  // Fit inside targetSize while preserving aspect ratio
  const ar = vbW / vbH;
  let canvasW, canvasH;
  if (ar >= 1) {
    canvasW = targetSize;
    canvasH = Math.round(targetSize / ar);
  } else {
    canvasH = targetSize;
    canvasW = Math.round(targetSize * ar);
  }

  const sized = buildStyledConverterSvg({ width: canvasW, height: canvasH });
  if (!sized) {
    showToast('SVG render failed');
    return;
  }

  const blob = new Blob([sized], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const img = new Image();
  img.onload = () => {
    if (myToken !== _svgConvToken) { URL.revokeObjectURL(url); return; }

    const canvas = document.createElement('canvas');
    canvas.width = canvasW;
    canvas.height = canvasH;
    const ctx = canvas.getContext('2d');

    // Background
    if (background === 'transparent') {
      ctx.clearRect(0, 0, canvasW, canvasH);
    } else if (background === 'white') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvasW, canvasH);
    } else {
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, canvasW, canvasH);
    }

    // Draw with padding
    const p = padding * quality;
    ctx.drawImage(img, p, p, canvasW - p * 2, canvasH - p * 2);
    URL.revokeObjectURL(url);

    if (myToken !== _svgConvToken) return;

    canvas.toBlob(pngBlob => {
      if (!pngBlob || myToken !== _svgConvToken) return;
      converterState.outputBlob = pngBlob;
      const outUrl = URL.createObjectURL(pngBlob);
      replaceConverterOutputObjectUrl(outUrl);
      converterState.outputDataUrl = outUrl;
      const displayW = Math.round(canvasW / quality);
      const displayH = Math.round(canvasH / quality);
      showConverterOutput(
        outUrl,
        `${displayW}x${displayH}${quality > 1 ? ` @${quality}x` : ''} PNG`,
        Math.round(pngBlob.size / 1024),
        null,
        null,
        { width: displayW, height: displayH },
      );
    }, 'image/png');
  };
  img.onerror = () => {
    URL.revokeObjectURL(url);
    showConverterSvgDecodeFailure(
      converterState.svgRasterAdvice || {
        tone: 'warn',
        text: 'This SVG could not be rasterized by the browser image pipeline. Common causes: external web fonts, remote images, or unsupported embedded resources.',
      },
    );
    showToast('SVG render failed');
  };
  img.src = url;
}

function showConverterOutput(url, label, sizeKb, traceMetrics = null, traceAdvice = null, previewSize = null, exportSize = null) {
  const outputPreview = document.getElementById('convOutputPreview');
  const outputEmpty = document.getElementById('convOutputEmpty');
  const outputMeta = document.getElementById('convOutputMeta');
  const outputNote = document.getElementById('convQualityNote');
  const actions = document.getElementById('convActions');

  if (outputPreview) outputPreview.style.display = '';
  if (outputEmpty) outputEmpty.style.display = 'none';
  replaceConverterOutputObjectUrl(url);
  converterState.outputDataUrl = url;
  converterState.traceMetrics = traceMetrics;
  converterState.traceAdvice = traceAdvice;
  converterState.outputPreviewSize = previewSize;
  converterState.outputExportSize = exportSize;
  if (outputMeta) {
    const metricsHtml = traceMetrics
      ? ` &middot; ${traceMetrics.pathCount} paths &middot; ${traceMetrics.complexity}`
      : '';
    outputMeta.innerHTML = `${label} &middot; ~${sizeKb}KB${metricsHtml}`;
  }
  if (outputNote) {
    outputNote.classList.remove('conv__quality-note--warn', 'conv__quality-note--info');
    if (traceAdvice?.text) {
      outputNote.textContent = traceAdvice.text;
      outputNote.classList.add(`conv__quality-note--${traceAdvice.tone || 'info'}`);
      outputNote.style.display = '';
    } else {
      outputNote.textContent = '';
      outputNote.style.display = 'none';
    }
  }
  if (actions) actions.style.display = '';
  updateConverterPreviewStage();
  updateConverterLabSummary();
}

// Lazy-load imagetracerjs from CDN
const IMAGETRACER_CDN = 'https://cdn.jsdelivr.net/npm/imagetracerjs@1.2.6/imagetracer_v1.2.6.js';
let imageTracerReady = null;

function loadImageTracer() {
  if (imageTracerReady) return imageTracerReady;
  imageTracerReady = new Promise((resolve, reject) => {
    if (window.ImageTracer) { resolve(window.ImageTracer); return; }
    const script = document.createElement('script');
    script.src = IMAGETRACER_CDN;
    script.onload = () => resolve(window.ImageTracer);
    script.onerror = () => reject(new Error('Failed to load imagetracerjs'));
    document.head.appendChild(script);
  });
  return imageTracerReady;
}

async function loadConverterMonoEngine() {
  if (!converterMonoEngineReady) {
    converterMonoEngineReady = import('vectortracer');
  }
  return converterMonoEngineReady;
}

function converterDegreesToRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

function buildConverterMonoEngineConfig({
  preset,
  smoothness = 50,
  noiseCleanup = 'medium',
  traceProfile = null,
  invert = false,
  cropWidth,
  cropHeight,
  traceWidth,
  traceHeight,
  fillColor = '#000000',
}) {
  const smoothFactor = Math.max(0, Math.min(1, smoothness / 100));
  const cleanupWeight = noiseCleanup === 'high' ? 2 : noiseCleanup === 'medium' ? 1 : 0;
  const isSimple = preset === 'posterized2';
  const isDetailed = preset === 'detailed';
  const logoLike = Boolean(traceProfile?.likelySingleHueLogo);
  const useSpline = isDetailed || (!isSimple && (logoLike || smoothFactor >= 0.45));

  const cornerBase = isSimple ? 22 : isDetailed ? 58 : 40;
  const cornerMax = isSimple
    ? (logoLike ? 38 : 34)
    : isDetailed
      ? (logoLike ? 84 : 74)
      : (logoLike ? 60 : 52);
  const spliceBase = isSimple ? 14 : isDetailed ? 40 : 26;
  const spliceMax = isSimple
    ? (logoLike ? 28 : 24)
    : isDetailed
      ? (logoLike ? 66 : 56)
      : (logoLike ? 48 : 40);
  const maxIterations = isSimple
    ? Math.round(4 + smoothFactor * 2)
    : isDetailed
      ? Math.round(10 + smoothFactor * 5)
      : Math.round(7 + smoothFactor * 3);
  const lengthThreshold = isSimple
    ? Math.max(4, 5 + cleanupWeight)
    : isDetailed
      ? Math.max(1, 2 + Math.max(0, cleanupWeight - 1))
      : Math.max(2, 3 + Math.floor(cleanupWeight / 2));
  const filterSpeckle = isSimple
    ? (noiseCleanup === 'high' ? 10 : noiseCleanup === 'medium' ? 8 : 6)
    : isDetailed
      ? (noiseCleanup === 'high' ? 5 : noiseCleanup === 'medium' ? 3 : 2)
      : (noiseCleanup === 'high' ? 7 : noiseCleanup === 'medium' ? 5 : 3);
  const pathPrecision = isSimple
    ? 1
    : isDetailed
      ? (logoLike ? 5 : 4)
      : (logoLike ? 3 : 2);
  const scale = traceWidth > 0 ? cropWidth / traceWidth : 1;

  return {
    params: {
      debug: false,
      mode: useSpline ? 'spline' : 'polygon',
      cornerThreshold: converterDegreesToRadians(cornerBase + (cornerMax - cornerBase) * smoothFactor),
      lengthThreshold,
      maxIterations,
      spliceThreshold: converterDegreesToRadians(spliceBase + (spliceMax - spliceBase) * smoothFactor),
      filterSpeckle,
      pathPrecision,
    },
    options: {
      invert,
      pathFill: fillColor,
      backgroundColor: 'transparent',
      attributes: `viewBox="0 0 ${cropWidth} ${cropHeight}" width="${cropWidth}" height="${cropHeight}"`,
      scale: Number.isFinite(scale) && scale > 0 ? scale : (cropHeight > 0 && traceHeight > 0 ? cropHeight / traceHeight : 1),
    },
  };
}

function isValidConverterSvg(svgStr) {
  if (!svgStr || !/<svg[\s>]/i.test(svgStr)) return false;
  try {
    const doc = new DOMParser().parseFromString(svgStr, 'image/svg+xml');
    const svg = doc.querySelector('svg');
    if (!svg || doc.querySelector('parsererror')) return false;
    return Boolean(doc.querySelector(CONVERTER_SVG_SHAPES));
  } catch {
    return false;
  }
}

async function traceWithConverterMonoEngine(imageData, config) {
  const { BinaryImageConverter } = await loadConverterMonoEngine();
  const source = {
    data: new Uint8ClampedArray(imageData.data),
    width: imageData.width,
    height: imageData.height,
  };

  return new Promise((resolve, reject) => {
    let converter;

    const cleanup = () => {
      if (!converter) return;
      try {
        converter.free();
      } catch {
        // Ignore cleanup failures while falling back to the old engine.
      }
      converter = null;
    };

    try {
      converter = new BinaryImageConverter(source, config.params, config.options);
      converter.init();

      const runBatch = () => {
        try {
          let done = false;
          for (let i = 0; i < 128 && !done; i++) {
            done = converter.tick();
          }
          if (done) {
            const svg = converter.getResult();
            cleanup();
            resolve(svg);
            return;
          }
          requestAnimationFrame(runBatch);
        } catch (err) {
          cleanup();
          reject(err);
        }
      };

      requestAnimationFrame(runBatch);
    } catch (err) {
      cleanup();
      reject(err);
    }
  });
}

async function traceWithImageTracerEngine(imageData, options) {
  const ImageTracer = await loadImageTracer();
  return ImageTracer.imagedataToSVG(imageData, options);
}

async function traceWithConverterProofService(
  imageBase64,
  qualityMode = 'exact',
  requestedColorMode = 'color',
  traceClass = 'general-color',
  uiMode = 'logo',
) {
  if (!CONVERTER_PROOF_SERVICE_URL) {
    throw new Error('Converter proof service URL is not configured.');
  }

  const response = await fetch(CONVERTER_PROOF_SERVICE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      imageBase64,
      mimeType: 'image/png',
      qualityMode,
      requestedColorMode,
      traceClass,
      uiMode,
    }),
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new Error(payload?.error || `Converter proof service failed (${response.status}).`);
  }

  if (!payload?.svg || typeof payload.svg !== 'string') {
    throw new Error('Converter proof service returned no SVG.');
  }

  return payload;
}

// Conversion token: increments each time a new conversion starts.
// When an async trace finishes, it checks if its token matches the
// current value - if not, a newer conversion superseded it, so discard.
let _convToken = 0;

function cloneConverterImageData(imageData) {
  return new ImageData(
    new Uint8ClampedArray(imageData.data),
    imageData.width,
    imageData.height,
  );
}

function imageDataToConverterPngDataUrl(imageData) {
  const canvas = document.createElement('canvas');
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const ctx = canvas.getContext('2d');
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png');
}

async function convertPngToSvg() {
  const {
    pngDataUrl,
    threshold,
    preset,
    assetMode = 'logo',
    exportSizeMode = 'auto',
    exportTargetWidth = null,
    smoothness,
    autoCrop,
    enhanceSmallIcons,
    noiseCleanup,
    invert,
  } = converterState;
  const myToken = ++_convToken;
  showConverterPendingOutput(`Tracing ${getConverterPresetLabel(preset)} preview…`);

  try {
    // Load image into canvas
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = pngDataUrl;
    });
    if (myToken !== _convToken) return;

    const srcW = img.naturalWidth;
    const srcH = img.naturalHeight;
    const sourceCanvas = document.createElement('canvas');
    sourceCanvas.width = srcW;
    sourceCanvas.height = srcH;
    const sourceCtx = sourceCanvas.getContext('2d', { willReadFrequently: true });
    sourceCtx.drawImage(img, 0, 0, srcW, srcH);
    const sourceImageData = sourceCtx.getImageData(0, 0, srcW, srcH);
    const sourceBg = detectBackgroundFromCorners(sourceImageData.data, srcW, srcH);
    const requestedColorMode = getConverterRequestedColorMode(assetMode);
    const cropBounds = autoCrop
      ? detectConverterContentBounds(sourceImageData, requestedColorMode, threshold, sourceBg, invert)
      : { x: 0, y: 0, width: srcW, height: srcH, cropped: false };

    const cropCanvas = document.createElement('canvas');
    cropCanvas.width = cropBounds.width;
    cropCanvas.height = cropBounds.height;
    const cropCtx = cropCanvas.getContext('2d', { willReadFrequently: true });
    cropCtx.drawImage(
      sourceCanvas,
      cropBounds.x,
      cropBounds.y,
      cropBounds.width,
      cropBounds.height,
      0,
      0,
      cropBounds.width,
      cropBounds.height,
    );
    converterState.previewOriginalDataUrl = cropCanvas.toDataURL('image/png');
    const cropImageData = cropCtx.getImageData(0, 0, cropBounds.width, cropBounds.height);
    const traceProfile = analyzeConverterTraceProfile(cropImageData, requestedColorMode, threshold, sourceBg, invert);
    const exportSize = getConverterExportSize({
      assetMode,
      cropWidth: cropBounds.width,
      cropHeight: cropBounds.height,
      exportSizeMode,
      exportTargetWidth,
    });
    const effectivePreset = resolveConverterPreset(preset, traceProfile, requestedColorMode);
    const strategyResolution = resolveConverterLabStrategy({
      requestedColorMode,
      traceProfile,
      assetMode,
      preset,
    });
    let traceRoute = strategyResolution.traceRoute;
    const effectiveColorMode = traceRoute === 'mono-exact' ? 'mono' : requestedColorMode;
    const traceBackgroundFill = (
      effectiveColorMode === 'color' && !sourceBg
        ? CONVERTER_TRANSPARENT_BG_SENTINEL
        : [255, 255, 255]
    );
    const explicitMonoFill = requestedColorMode === 'mono' ? converterRgbToHex(traceProfile.dominantColor || [0, 0, 0]) : null;
    const logoRouteFill = (requestedColorMode === 'color' && traceRoute === 'mono-exact')
      ? converterRgbToHex(traceProfile.dominantColor)
      : null;
    const traceFillColor = logoRouteFill || explicitMonoFill;
    const effectiveThreshold = logoRouteFill ? Math.max(threshold, 170) : threshold;
    const traceClass = strategyResolution.traceClass;
    const serviceRequestedColorMode = strategyResolution.serviceRequestedColorMode;
    const serviceQualityMode = strategyResolution.serviceQualityMode;
    converterState.labLastTraceRoute = traceRoute;
    converterState.labLastTraceClass = traceClass;
    converterState.labLastServiceRequestedColorMode = serviceRequestedColorMode;
    converterState.labLastServiceQualityMode = serviceQualityMode;
    updateConverterLabSummary();

    if (CONVERTER_PROOF_SERVICE_URL) {
      try {
        let proofTraceGeometryWidth = cropBounds.width;
        let proofTraceGeometryHeight = cropBounds.height;
        const proofServiceImageBase64 = serviceRequestedColorMode === 'mono'
          ? (() => {
              const iconMaskThreshold = assetMode === 'icon'
                ? Math.min(232, effectiveThreshold + (traceClass === 'tiny-line-icon' ? 64 : 32))
                : effectiveThreshold;
              if (
                assetMode === 'icon'
                && (traceClass === 'tiny-line-icon' || traceClass === 'mono-mask' || traceClass === 'single-color-mark')
              ) {
                const upscaleFactor = getConverterMicroIconUpscale(
                  cropCanvas.width,
                  cropCanvas.height,
                  traceClass,
                );
                const upscaledCanvas = document.createElement('canvas');
                upscaledCanvas.width = cropCanvas.width * upscaleFactor;
                upscaledCanvas.height = cropCanvas.height * upscaleFactor;
                proofTraceGeometryWidth = upscaledCanvas.width;
                proofTraceGeometryHeight = upscaledCanvas.height;
                const upscaledCtx = upscaledCanvas.getContext('2d');
                upscaledCtx.imageSmoothingEnabled = true;
                upscaledCtx.imageSmoothingQuality = 'high';
                upscaledCtx.drawImage(cropCanvas, 0, 0, upscaledCanvas.width, upscaledCanvas.height);
                const upscaledImage = upscaledCtx.getImageData(0, 0, upscaledCanvas.width, upscaledCanvas.height);
                preprocessImageData(upscaledImage, {
                  colorMode: 'mono',
                  threshold: iconMaskThreshold,
                  invert,
                  noiseCleanup,
                  traceProfile,
                  preset: effectivePreset,
                  backgroundFillColor: [255, 255, 255],
                });
                applyBinaryIconThinning(
                  upscaledImage,
                  traceClass === 'tiny-line-icon' ? 2 : 0,
                );
                applyBinaryIconErosion(
                  upscaledImage,
                  traceClass === 'tiny-line-icon' ? 1 : 0,
                );
                upscaledCtx.putImageData(upscaledImage, 0, 0);
                return upscaledCanvas.toDataURL('image/png');
              }
              const monoProofImage = cloneConverterImageData(cropImageData);
              preprocessImageData(monoProofImage, {
                colorMode: 'mono',
                threshold: iconMaskThreshold,
                invert,
                noiseCleanup,
                traceProfile,
                preset: effectivePreset,
                backgroundFillColor: [255, 255, 255],
              });
              applyBinaryIconThinning(
                monoProofImage,
                assetMode === 'icon' && traceClass === 'tiny-line-icon' ? 2 : 0,
              );
              applyBinaryIconErosion(
                monoProofImage,
                assetMode === 'icon' && traceClass === 'tiny-line-icon' ? 1 : 0,
              );
              return imageDataToConverterPngDataUrl(monoProofImage);
            })()
          : cropCanvas.toDataURL('image/png');

        const proofResult = await traceWithConverterProofService(
          proofServiceImageBase64,
          serviceQualityMode,
          serviceRequestedColorMode,
          traceClass,
          assetMode,
        );
        if (myToken !== _convToken) return;

        const traceArtifact = buildConverterServiceTraceArtifact(
          proofResult.svg,
          proofResult.metrics,
          serviceRequestedColorMode === 'mono'
            ? {
                fillColor: pickConverterMonochromeFill(traceProfile, sourceBg),
                backgroundStripColor: [255, 255, 255],
                stripMonoStroke: true,
                forceRetint: true,
                originalWidth: proofTraceGeometryWidth,
                originalHeight: proofTraceGeometryHeight,
                exportWidth: exportSize.width,
                exportHeight: exportSize.height,
              }
            : {
                originalWidth: proofTraceGeometryWidth,
                originalHeight: proofTraceGeometryHeight,
                exportWidth: exportSize.width,
                exportHeight: exportSize.height,
              },
        );
        const { svgBlob, sizeKb, traceMetrics } = traceArtifact;
        converterState.outputBlob = svgBlob;
        const url = URL.createObjectURL(svgBlob);
        const croppedSuffix = cropBounds.cropped ? ' · cropped' : '';
        const sizeWarning = sizeKb > 300
          ? ` <span style="color:#f97316">⚠ Large</span>`
          : '';
        showConverterOutput(
          url,
          `SVG (${cropBounds.width}x${cropBounds.height}${croppedSuffix} -> ${exportSize.width}x${exportSize.height} export)${sizeWarning}`,
          sizeKb,
          traceMetrics,
          null,
          { width: cropBounds.width, height: cropBounds.height },
          exportSize,
        );
        return;
      } catch (proofErr) {
        if (CONVERTER_PROOF_SERVICE_REQUIRED) {
          if (myToken !== _convToken) return;
          showConverterProofServiceOffline(proofErr);
          return;
        }
        console.warn('[Converter] Local proof service unavailable, falling back to browser tracer:', proofErr);
      }
    }

    // Trace resolution now starts from cropped bounds and supports a sharper small-icon boost.
    const smoothFactor = smoothness / 100;
    const basePx = effectivePreset === 'detailed' ? 768 : effectivePreset === 'default' ? 640 : 512;
    const maxTracePx = Math.round(basePx * (0.85 + smoothFactor * 1.15));
    let enhanceScale = getConverterEnhanceScale(
      cropBounds.width,
      cropBounds.height,
      enhanceSmallIcons || traceProfile.likelySingleHueLogo,
    );
    if (traceProfile.likelySingleHueLogo && enhanceScale === 1 && Math.max(cropBounds.width, cropBounds.height) <= 320) {
      enhanceScale = 2;
    }

    let traceW = Math.max(1, Math.round(cropBounds.width * enhanceScale));
    let traceH = Math.max(1, Math.round(cropBounds.height * enhanceScale));
    const downScale = Math.min(1, maxTracePx / Math.max(traceW, traceH));
    traceW = Math.max(1, Math.round(traceW * downScale));
    traceH = Math.max(1, Math.round(traceH * downScale));

    const canvas = document.createElement('canvas');
    canvas.width = traceW;
    canvas.height = traceH;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const useSharpUpscale = enhanceScale > 1 && (effectiveColorMode === 'mono' || traceProfile.likelyFlatArtwork);
    ctx.imageSmoothingEnabled = !useSharpUpscale;
    ctx.imageSmoothingQuality = useSharpUpscale ? 'low' : 'high';
    ctx.drawImage(cropCanvas, 0, 0, traceW, traceH);
    const traceSourceImageData = ctx.getImageData(0, 0, traceW, traceH);
    let imageData = cloneConverterImageData(traceSourceImageData);
    let fallbackImageData = imageData;

    // ── Preprocessing: threshold + background removal ──
    preprocessImageData(imageData, {
      colorMode: effectiveColorMode,
      threshold: effectiveThreshold,
      invert,
      noiseCleanup,
      traceProfile,
      preset: effectivePreset,
      backgroundFillColor: traceBackgroundFill,
    });

    let traceArtifact = null;
    if (effectiveColorMode === 'mono') {
      const monoConfig = buildConverterMonoEngineConfig({
        preset: effectivePreset,
        smoothness,
        noiseCleanup,
        traceProfile,
        invert,
        cropWidth: cropBounds.width,
        cropHeight: cropBounds.height,
        traceWidth: traceW,
        traceHeight: traceH,
        fillColor: traceFillColor || '#000000',
      });
      fallbackImageData = imageData;
      try {
        const monoSvgResult = await traceWithConverterMonoEngine(imageData, monoConfig);
        if (isValidConverterSvg(monoSvgResult)) {
          const monoArtifact = buildConverterTraceArtifact(
            monoSvgResult,
            cropBounds.width,
            cropBounds.height,
            traceFillColor,
            {
              stripMonoStroke: true,
              backgroundStripColor: traceBackgroundFill,
              forceRetint: true,
              exportWidth: exportSize.width,
              exportHeight: exportSize.height,
            },
          );
          const monoTraceLooksEmpty = !monoArtifact?.traceMetrics?.pathCount || !monoArtifact?.traceMetrics?.shapeCount;
          if (!shouldFallbackFromMonoTrace({
            traceArtifact: monoArtifact,
            traceProfile,
            requestedColorMode,
            cropWidth: cropBounds.width,
            cropHeight: cropBounds.height,
          })) {
            traceArtifact = monoArtifact;
          } else if (requestedColorMode === 'mono' && monoTraceLooksEmpty) {
            const retryInvert = !invert;
            const retryImageData = cloneConverterImageData(traceSourceImageData);
            preprocessImageData(retryImageData, {
              colorMode: effectiveColorMode,
              threshold: effectiveThreshold,
              invert: retryInvert,
              noiseCleanup,
              traceProfile,
              preset: effectivePreset,
              backgroundFillColor: traceBackgroundFill,
            });
            fallbackImageData = retryImageData;
            const retryMonoConfig = buildConverterMonoEngineConfig({
              preset: effectivePreset,
              smoothness,
              noiseCleanup,
              traceProfile,
              invert: retryInvert,
              cropWidth: cropBounds.width,
              cropHeight: cropBounds.height,
              traceWidth: traceW,
              traceHeight: traceH,
              fillColor: traceFillColor || '#000000',
            });
            try {
              const retryMonoSvgResult = await traceWithConverterMonoEngine(retryImageData, retryMonoConfig);
              if (isValidConverterSvg(retryMonoSvgResult)) {
                const retryArtifact = buildConverterTraceArtifact(
                  retryMonoSvgResult,
                  cropBounds.width,
                  cropBounds.height,
                  traceFillColor,
                  {
                    stripMonoStroke: true,
                    backgroundStripColor: traceBackgroundFill,
                    forceRetint: true,
                    exportWidth: exportSize.width,
                    exportHeight: exportSize.height,
                  },
                );
                if (!shouldFallbackFromMonoTrace({
                  traceArtifact: retryArtifact,
                  traceProfile,
                  requestedColorMode,
                  cropWidth: cropBounds.width,
                  cropHeight: cropBounds.height,
                })) {
                  traceArtifact = retryArtifact;
                } else {
                  traceRoute = 'mono-fallback';
                }
              } else {
                traceRoute = 'mono-fallback';
              }
            } catch (retryMonoErr) {
              console.warn('[Converter] Mono polarity retry failed, falling back to ImageTracer:', retryMonoErr);
              traceRoute = 'mono-fallback';
            }
          } else {
            traceRoute = 'mono-fallback';
          }
        } else {
          traceRoute = 'mono-fallback';
        }
      } catch (monoErr) {
        console.warn('[Converter] Mono engine failed, falling back to ImageTracer:', monoErr);
        traceRoute = 'mono-fallback';
      }
    }

    if (!traceArtifact) {
      // Build options from current state after crop/upscale decisions are known.
      const options = buildImageTracerOptions(
        effectivePreset,
        effectiveColorMode,
        effectiveThreshold,
        smoothness,
        noiseCleanup,
        traceProfile,
        traceRoute,
      );

      // Scale factor: imagetracerjs traces at traceW x traceH but we want
      // path coordinates in the cropped source coordinate space.
      options.scale = cropBounds.width / traceW;
      const svgResult = await traceWithImageTracerEngine(fallbackImageData, options);
      traceArtifact = buildConverterTraceArtifact(
        svgResult,
        cropBounds.width,
        cropBounds.height,
        traceFillColor,
        {
          stripMonoStroke: effectiveColorMode === 'mono',
          backgroundStripColor: traceBackgroundFill,
          forceRetint: effectiveColorMode === 'mono',
          exportWidth: exportSize.width,
          exportHeight: exportSize.height,
        },
      );
    }
    if (myToken !== _convToken) return;

    const { cleanSvg, svgBlob, sizeKb, traceMetrics } = traceArtifact;
    converterState.outputBlob = svgBlob;
    const url = URL.createObjectURL(svgBlob);
    const traceAdvice = getConverterTraceAdvice({
      traceProfile,
      traceMetrics,
      requestedColorMode,
      effectiveColorMode,
      sizeKb,
      traceRoute,
      resolvedPreset: effectivePreset,
    });
    const croppedSuffix = cropBounds.cropped ? ' · cropped' : '';

    const sizeWarning = sizeKb > 300
      ? ` <span style="color:#f97316">⚠ Large</span>`
      : '';
    showConverterOutput(
      url,
      `SVG (${cropBounds.width}x${cropBounds.height}${croppedSuffix} -> ${exportSize.width}x${exportSize.height} export)${sizeWarning}`,
      sizeKb,
      traceMetrics,
      traceAdvice,
      { width: cropBounds.width, height: cropBounds.height },
      exportSize,
    );
  } catch (err) {
    if (myToken !== _convToken) return;
    console.error('[Converter] PNG-to-SVG failed:', err);
    resetConverterOutputPlaceholder();
    showToast('Tracing failed: ' + (err.message || 'Unknown error'));
  }
}

function buildImageTracerOptions(preset, colorMode, threshold, smoothness = 50, noiseCleanup = 'medium', traceProfile = null, traceRoute = 'color-default') {
  // Base options per preset - tuned for sharp, clean icon output
  // `scale` is set dynamically in convertPngToSvg() to compensate for downsampling
  const presetOptions = {
    posterized2: { numberofcolors: 2, colorsampling: 0, mincolorratio: 0, colorquantcycles: 1, pathomit: 2, ltres: 0.4, qtres: 0.4 },
    default:     { numberofcolors: 16, colorsampling: 2, mincolorratio: 0.01, colorquantcycles: 3, pathomit: 3, ltres: 0.4, qtres: 0.4 },
    detailed:    { numberofcolors: 32, colorsampling: 2, mincolorratio: 0, colorquantcycles: 5, pathomit: 1, ltres: 0.18, qtres: 0.18 },
  };

  const base = { ...(presetOptions[preset] || presetOptions.posterized2) };
  const cleanupWeight = noiseCleanup === 'high' ? 2 : noiseCleanup === 'medium' ? 1 : 0;
  base.strokewidth = 0;

  if (colorMode === 'mono') {
    // Mono: we preprocess pixels to binary (black/white) in preprocessImageData(),
    // so we only need 2 colors and minimal blur (thresholding is already done)
    base.numberofcolors = 2;
    base.colorsampling = 0;
    base.colorquantcycles = 1;
    base.blurradius = 0; // no blur - preprocessing handles threshold
    base.blurdelta = 0;
    // Tight path tolerance for sharp mono edges
    if (preset === 'posterized2') {
      base.ltres = 0.34;
      base.qtres = 0.34;
      base.pathomit = Math.max(3, 4 + cleanupWeight * 2);
    } else if (preset === 'detailed') {
      base.ltres = 0.14;
      base.qtres = 0.14;
      base.pathomit = Math.max(0, cleanupWeight - 1);
    } else {
      base.ltres = 0.22;
      base.qtres = 0.22;
      base.pathomit = Math.max(1, 2 + cleanupWeight);
    }
  } else {
    // Color mode: need enough palette entries to distinguish icon colors
    // from the white background. With only 2 (Simple preset), k-means
    // quantizes everything to near-white shades that all get stripped.
    base.numberofcolors = Math.max(base.numberofcolors, 8);
    base.colorsampling = 2; // k-means for reliable color separation
    base.colorquantcycles = Math.max(base.colorquantcycles, 3);
    base.pathomit = Math.max(base.pathomit || 2, 1 + cleanupWeight * 2);
    base.mincolorratio = Math.max(base.mincolorratio || 0, cleanupWeight * 0.01);
    if (traceRoute === 'flat-art-color') {
      const flatBaseCount = traceProfile?.recommendedColorCount || 5;
      if (preset === 'posterized2') {
        base.numberofcolors = Math.max(4, Math.min(flatBaseCount + 1, 8));
        base.pathomit = Math.max(2, 1 + cleanupWeight);
        base.mincolorratio = Math.max(base.mincolorratio || 0, 0.004 + cleanupWeight * 0.004);
      } else if (preset === 'detailed') {
        base.numberofcolors = Math.max(8, Math.min(flatBaseCount + 4, 12));
        base.pathomit = Math.max(0, cleanupWeight - 1);
        base.mincolorratio = Math.max(base.mincolorratio || 0, 0.001);
        base.ltres = Math.max(base.ltres, 0.24);
        base.qtres = Math.max(base.qtres, 0.24);
      } else {
        base.numberofcolors = Math.max(6, Math.min(flatBaseCount + 2, 10));
        base.pathomit = Math.max(1, cleanupWeight);
        base.mincolorratio = Math.max(base.mincolorratio || 0, 0.002 + cleanupWeight * 0.002);
      }
      base.colorsampling = 2; // k-means preserves flat-logo colors more reliably
      base.colorquantcycles = Math.max(base.colorquantcycles, 4);
      base.blurradius = 0;
      base.blurdelta = 0;
    } else if (traceProfile?.likelyFlatArtwork) {
      base.numberofcolors = Math.min(
        Math.max(3, traceProfile.recommendedColorCount || 6),
        Math.max(base.numberofcolors, 3),
      );
      base.colorsampling = 0;
      base.colorquantcycles = 1;
      base.pathomit = Math.max(base.pathomit, 2 + cleanupWeight);
      base.mincolorratio = Math.max(base.mincolorratio, 0.015 + cleanupWeight * 0.01);
    }
  }

  // Smoothness adjustments: lower ltres/qtres = tighter Bezier fit,
  // slight blur radius smooths pixel staircase boundaries.
  const sf = (smoothness || 50) / 100; // 0..1
  // ltres/qtres: from preset value (sf=0) down to 0.1 (sf=1)
  base.ltres = Math.max(0.1, (base.ltres || 0.5) * (1 - sf * 0.8));
  base.qtres = Math.max(0.1, (base.qtres || 0.5) * (1 - sf * 0.8));
  // Blur: 0 at sf=0, up to 2 at sf=1 (only in color mode; mono uses preprocessing)
  if (colorMode !== 'mono' && traceRoute !== 'flat-art-color' && sf > 0.2) {
    base.blurradius = Math.round(sf * 2);
    base.blurdelta = 20;
  }

  return base;
}

// ── Image preprocessing: threshold + background removal ──
// Returns the detected background colour [R,G,B] or null.
function preprocessImageData(imageData, {
  colorMode,
  threshold,
  invert = false,
  noiseCleanup = 'medium',
  traceProfile = null,
  preset = 'posterized2',
  backgroundFillColor = [255, 255, 255],
}) {
  const d = imageData.data; // RGBA flat array
  const w = imageData.width;
  const h = imageData.height;

  // Detect background color from corner pixels (shared logic)
  const bgColor = detectBackgroundFromCorners(d, w, h);

  if (colorMode === 'mono') {
    const transparentMonoThreshold = !bgColor ? getConverterTransparentMonoThreshold(traceProfile) : null;
    // Mono mode: convert to opaque black (foreground) and opaque white (background).
    // We use OPAQUE white, not transparent, because imagetracerjs ignores alpha
    // when all RGB channels are the same (it would trace everything as one solid fill).
    // White paths are stripped post-trace by stripBackgroundPaths().
    for (let i = 0; i < d.length; i += 4) {
      let isForeground;

      if (d[i + 3] < 16) {
        // Already transparent pixel -> definitely background
        isForeground = false;
      } else if (!bgColor) {
        if (transparentMonoThreshold != null) {
          const luminance = getConverterRgbLuminance([d[i], d[i + 1], d[i + 2]]);
          isForeground = luminance <= transparentMonoThreshold;
        } else if (traceProfile?.likelyTinyLineIcon || traceProfile?.likelySingleColorMark) {
          isForeground = d[i + 3] >= getConverterTransparentIconAlphaThreshold(traceProfile);
        } else {
          // Pure white/light transparent icons should still trace their visible pixels.
          isForeground = true;
        }
      } else if (bgColor) {
        // Has a detected background color: foreground = pixels far from bg
        const dist = Math.abs(d[i] - bgColor[0])
                   + Math.abs(d[i + 1] - bgColor[1])
                   + Math.abs(d[i + 2] - bgColor[2]);
        isForeground = dist > threshold;
      }

      if (invert && (bgColor || transparentMonoThreshold != null)) isForeground = !isForeground;

      if (isForeground) {
        d[i] = 0; d[i + 1] = 0; d[i + 2] = 0; d[i + 3] = 255;       // opaque black
      } else {
        d[i] = 255; d[i + 1] = 255; d[i + 2] = 255; d[i + 3] = 255; // opaque white
      }
    }
    applyBinaryNoiseCleanup(imageData, noiseCleanup);
  } else {
    // Color mode: replace background pixels with opaque white.
    // We use opaque white (not transparent) because imagetracerjs produces
    // garbage when mixing opaque and transparent pixels with residual RGB.
    // White paths are stripped post-trace by stripBackgroundPaths().
    const bgFill = backgroundFillColor;
    if (bgColor) {
      const bgTolerance = threshold;
      for (let i = 0; i < d.length; i += 4) {
        if (d[i + 3] < 128) {
          // Already transparent -> normalize to the synthetic background fill
          d[i] = bgFill[0]; d[i + 1] = bgFill[1]; d[i + 2] = bgFill[2]; d[i + 3] = 255;
          continue;
        }
        const dist = Math.abs(d[i] - bgColor[0])
                   + Math.abs(d[i + 1] - bgColor[1])
                   + Math.abs(d[i + 2] - bgColor[2]);
        if (dist < bgTolerance) {
          d[i] = bgFill[0]; d[i + 1] = bgFill[1]; d[i + 2] = bgFill[2]; d[i + 3] = 255;
        }
      }
    } else {
      for (let i = 0; i < d.length; i += 4) {
        if (d[i + 3] < 128) {
          d[i] = bgFill[0]; d[i + 1] = bgFill[1]; d[i + 2] = bgFill[2]; d[i + 3] = 255;
        }
      }
    }
    if (traceProfile?.likelyFlatArtwork || traceProfile?.likelySingleHueLogo) {
      flattenConverterColorArtwork(imageData, bgColor || bgFill, threshold, traceProfile, preset);
    }
  }
  return bgColor; // [R,G,B] or null
}

// Sample corners to find the dominant background color
function detectBackgroundFromCorners(d, w, h) {
  const sample = (cx, cy) => {
    const idx = (cy * w + cx) * 4;
    return [d[idx], d[idx + 1], d[idx + 2], d[idx + 3]];
  };
  const corners = [
    sample(0, 0), sample(w - 1, 0),
    sample(0, h - 1), sample(w - 1, h - 1)
  ];

  // If 3+ corners are transparent, the background is already transparent
  if (corners.filter(c => c[3] < 128).length >= 3) return null;

  // Find most common corner color (3+ must agree)
  const dist = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);
  for (let i = 0; i < corners.length; i++) {
    if (corners[i][3] < 128) continue; // skip transparent corners
    let matches = 0;
    for (let j = 0; j < corners.length; j++) {
      if (corners[j][3] < 128) continue;
      if (dist(corners[i], corners[j]) < 30) matches++;
    }
    if (matches >= 3) return corners[i].slice(0, 3); // [R, G, B]
  }
  return null; // no clear background
}

// Remove paths whose fill matches the background colour (with tolerance).
// After preprocessing, bg is normalised to white in both mono and color modes,
// but this function handles ANY colour so light-on-dark icons work if
// preprocessing logic is ever changed.
function stripBackgroundPaths(svgStr, bgColor) {
  const tolerance = 55; // allow for quantisation drift
  try {
    const doc = new DOMParser().parseFromString(svgStr, 'image/svg+xml');
    if (doc.querySelector('parsererror')) return svgStr;
    doc.querySelectorAll(CONVERTER_SVG_SHAPES).forEach((shape) => {
      const fillRgb = parseConverterSvgColor(shape.getAttribute('fill'));
      if (!fillRgb) return;
      const dist = Math.abs(fillRgb[0] - bgColor[0])
                 + Math.abs(fillRgb[1] - bgColor[1])
                 + Math.abs(fillRgb[2] - bgColor[2]);
      if (dist < tolerance) {
        shape.remove();
      }
    });
    return new XMLSerializer().serializeToString(doc);
  } catch {
    return svgStr;
  }
}

function normalizeSvgOutput(svgStr, originalW, originalH, exportW = originalW, exportH = originalH) {
  const viewBoxWidth = Math.max(1, Math.round(originalW || 1));
  const viewBoxHeight = Math.max(1, Math.round(originalH || 1));
  const exportWidth = Math.max(1, Math.round(exportW || viewBoxWidth));
  const exportHeight = Math.max(1, Math.round(exportH || viewBoxHeight));
  svgStr = svgStr.replace(/<svg([^>]*)>/, (m, attrs) => {
    attrs = attrs
      .replace(/\s*width="[^"]*"/, '')
      .replace(/\s*height="[^"]*"/, '')
      .replace(/\s*viewBox="[^"]*"/, '');
    return `<svg${attrs} viewBox="0 0 ${viewBoxWidth} ${viewBoxHeight}" width="${exportWidth}" height="${exportHeight}">`;
  });
  return svgStr;
}


// ── Toast Helper ──────────────────────────────────────────────
function showToast(msg) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('visible');
  clearTimeout(toastTimeout);
  toastTimeout = window.setTimeout(() => {
    toast.classList.remove('visible');
  }, 2500);
}

// ── Exports for main.js ───────────────────────────────────────
const premiumThemeToggleBtn = document.getElementById('themeToggle');
premiumThemeToggleBtn?.addEventListener('click', () => {
  window.requestAnimationFrame(() => {
    if (!currentPremiumSelection || premiumPanelState.colorMode !== PREMIUM_COLOR_MODE_ORIGINAL) return;

    const colorProfile = currentPremiumSelection.colorProfile || premiumPanelState.colorProfile;
    if (!colorProfile?.hasCurrentColor || colorProfile.authoredColors?.length) return;

    const resolved = resolvePremiumOriginalColor(colorProfile);
    premiumPanelState.originalColor = resolved;
    premiumPanelState.color = resolved;
    renderPremiumPanel(currentPremiumSelection);
  });
});

export function getCurrentView() { return currentView; }
export function isStoreView() { return currentView !== 'icons'; }
export { loadSvgIntoMotionLab };

