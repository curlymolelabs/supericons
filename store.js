/**
 * Supericons Store Module
 * Handles collection catalog rendering, view switching, and Stripe checkout.
 */

import { getUser, getSupabase, isLoggedIn, isPro, getCreditBalance } from './auth.js';

// ── Constants ─────────────────────────────────────────────────
const SUPABASE_URL = 'https://kcjmkakdhsqplvasgkjv.supabase.co';
const SUPABASE_ANON = 'sb_publishable_slbcWcnrQ45rkJPONFD7pw_hW0WpvBi';
const PREMIUM_ASSET_FN = `${SUPABASE_URL}/functions/v1/serve-premium-asset`;
const STRIPE_PRO_MONTHLY = 'price_1TEtIs3eLO1ro0kliSB6whjH';
const STRIPE_PRO_YEARLY = 'price_1TEtK73eLO1ro0klfhQrsrJa';
const STRIPE_LAUNCH_EDITION = 'price_1TEtZz3eLO1ro0kl0Xk8q1Nw';

// ── State ─────────────────────────────────────────────────────
let products = [];

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
let currentView = 'icons'; // 'icons' | 'packs' | 'downloads' | 'dashboard' | 'collection-detail'
let previousView = 'icons';
let currentCollectionData = null; // manifest data for the currently viewed collection

// ── Product display name overrides (avoids DB migration for renames) ─
const PRODUCT_NAME_OVERRIDES = {
  'ai-agentic': 'Agentic AI',
};
function getProductName(product) {
  return PRODUCT_NAME_OVERRIDES[product.slug] || product.name;
}

// ── Init ──────────────────────────────────────────────────────
export function initStore() {
  wireStoreListeners();
  fetchProducts();
}

// ── Fetch Products ────────────────────────────────────────────
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
  } catch (e) {
    console.warn('[Store] Failed to fetch products:', e.message);
  }
}

// ── Fetch User Purchases ──────────────────────────────────────
export async function fetchUserPurchases() {
  const user = getUser();
  if (!user) { userPurchases = []; return; }

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
    if (!res.ok) return;
    userPurchases = await res.json();

    const countEl = document.getElementById('countDownloads');
    if (countEl) countEl.textContent = userPurchases.length;
  } catch (e) {
    console.warn('[Store] Failed to fetch purchases:', e.message);
  }
}

// ── Collection Count ─────────────────────────────────────────
function updatePackCount() {
  const countEl = document.querySelector('#sidebarAnimatedPacks .sidebar__item-count');
  if (countEl && products.length > 0) {
    countEl.textContent = products.length;
  }
}

function updateSidebarCreditBadge() {
  const credits = getCreditBalance();
  const sidebarSection = document.querySelector('.sidebar__section-title--pro');
  if (!sidebarSection) return;

  // Remove existing badge if any
  const existing = sidebarSection.querySelector('.sidebar__credit-badge');
  if (existing) existing.remove();

  if (isPro() && credits > 0) {
    const badge = document.createElement('span');
    badge.className = 'sidebar__credit-badge';
    badge.textContent = `${credits} credit${credits !== 1 ? 's' : ''}`;
    sidebarSection.appendChild(badge);
  }
}

// ── View Switching ────────────────────────────────────────────
export function switchView(view) {
  previousView = currentView;

  // Restore the Customize panel if we're leaving a full-width view
  const fullWidthViews = ['pricing', 'motion-lab', 'converter'];
  if (fullWidthViews.includes(currentView) && !fullWidthViews.includes(view)) {
    const restorePanel = document.getElementById('panel');
    if (restorePanel && restorePanel.dataset.hiddenByPricing) {
      restorePanel.classList.remove('panel--pricing-hidden');
      if (restorePanel.dataset.hiddenByPricing === 'was-open') {
        restorePanel.classList.add('panel-open');
      }
      delete restorePanel.dataset.hiddenByPricing;
    }
    // Restore the 3-column grid
    const mainLayout = document.getElementById('mainLayout');
    if (mainLayout) mainLayout.classList.remove('panel-hidden');
    document.body.removeAttribute('data-view');
  }

  currentView = view;

  const gridArea = document.getElementById('gridArea');
  const gridTitle = document.getElementById('gridTitle');
  const gridMeta = document.getElementById('gridMeta');
  const gridActions = document.querySelector('.grid-header__actions');

  if (!gridArea) return;

  // Hide landing hero in store views
  const landingHero = document.getElementById('landingHero');

  if (view === 'packs' || view === 'downloads' || view === 'dashboard' || view === 'collection-detail' || view === 'pricing' || view === 'terms' || view === 'motion-lab' || view === 'converter') {
    // Add class to hide all existing grid content (icon cells, empty state, actions)
    gridArea.classList.add('store-active');
    if (landingHero) landingHero.style.display = 'none';
    if (gridActions) gridActions.style.display = 'none';

    // Reset customize panel to placeholder state (clear stale free icon controls)
    const panel = document.getElementById('panel');
    if (panel) {
      const panelPreview = document.getElementById('panelPreview');
      if (panelPreview) {
        panelPreview.innerHTML = `<span class="material-symbols-outlined panel__preview-icon"
          style="font-size:64px; color: var(--si-text-dim);">widgets</span>`;
      }
      const panelBody = panel.querySelector('.panel__body');
      if (panelBody) {
        panelBody.className = 'panel__placeholder';
        panelBody.innerHTML = '<span class="material-symbols-outlined panel__placeholder-icon">touch_app</span><p class="panel__placeholder-text">Select an icon from the grid to customize it</p>';
      }
      const panelControls = panel.querySelector('.panel__controls');
      if (panelControls) panelControls.style.display = '';
      const lockedPanel = panel.querySelector('.locked-panel');
      if (lockedPanel) lockedPanel.remove();
    }

    if (view === 'packs') {
      if (gridTitle) gridTitle.textContent = 'Premium Collections';
      if (gridMeta) gridMeta.textContent = '';
      renderPackCatalog();
    } else if (view === 'collection-detail') {
      // Title/meta set by renderCollectionDetail
    } else if (view === 'downloads') {
      if (gridTitle) gridTitle.textContent = 'My Collection';
      if (gridMeta) gridMeta.textContent = '';
      renderDownloads();
    } else if (view === 'pricing') {
      if (gridTitle) gridTitle.textContent = 'Pricing';
      if (gridMeta) gridMeta.textContent = '';
      // Hide the customize panel and collapse its grid column
      const pricingPanel = document.getElementById('panel');
      if (pricingPanel && !pricingPanel.dataset.hiddenByPricing) {
        pricingPanel.dataset.hiddenByPricing = pricingPanel.classList.contains('panel-open') ? 'was-open' : 'was-closed';
        pricingPanel.classList.remove('panel-open');
        pricingPanel.classList.add('panel--pricing-hidden');
      }
      const mainLayout = document.getElementById('mainLayout');
      if (mainLayout) mainLayout.classList.add('panel-hidden');
      document.body.setAttribute('data-view', 'pricing');
      renderPricingPage();
    } else if (view === 'terms') {
      if (gridTitle) gridTitle.textContent = 'Terms of Service';
      if (gridMeta) gridMeta.textContent = '';
      renderTermsPage();
    } else if (view === 'motion-lab') {
      if (gridTitle) gridTitle.textContent = 'Motion Lab';
      if (gridMeta) gridMeta.textContent = '';
      // Hide customize panel, expand grid
      const mlPanel = document.getElementById('panel');
      if (mlPanel && !mlPanel.dataset.hiddenByPricing) {
        mlPanel.dataset.hiddenByPricing = mlPanel.classList.contains('panel-open') ? 'was-open' : 'was-closed';
        mlPanel.classList.remove('panel-open');
        mlPanel.classList.add('panel--pricing-hidden');
      }
      const mlLayout = document.getElementById('mainLayout');
      if (mlLayout) mlLayout.classList.add('panel-hidden');
      document.body.setAttribute('data-view', 'motion-lab');
      renderMotionLab();
    } else if (view === 'converter') {
      if (gridTitle) gridTitle.textContent = 'Icon Converter';
      if (gridMeta) gridMeta.textContent = '';
      const cvPanel = document.getElementById('panel');
      if (cvPanel && !cvPanel.dataset.hiddenByPricing) {
        cvPanel.dataset.hiddenByPricing = cvPanel.classList.contains('panel-open') ? 'was-open' : 'was-closed';
        cvPanel.classList.remove('panel-open');
        cvPanel.classList.add('panel--pricing-hidden');
      }
      const cvLayout = document.getElementById('mainLayout');
      if (cvLayout) cvLayout.classList.add('panel-hidden');
      document.body.setAttribute('data-view', 'converter');
      renderConverter();
    } else {
      if (gridTitle) gridTitle.textContent = 'My Purchases';
      if (gridMeta) gridMeta.textContent = '';
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
    // Restore icon grid
    gridArea.classList.remove('store-active');
    if (gridActions) gridActions.style.display = '';
    if (gridTitle) gridTitle.textContent = 'All Icons';
    if (gridMeta) gridMeta.textContent = '';
    if (landingHero) landingHero.style.display = '';
    removePackCatalog();
    // Clean up any tool/store views lingering in the DOM
    document.getElementById('motionLabView')?.remove();
    document.getElementById('converterView')?.remove();
  }

  // Update sidebar active state
  updateSidebarActive(view);
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
  } else if (view === 'motion-lab') {
    document.getElementById('sidebarMotionLab')?.classList.add('active');
  } else if (view === 'converter') {
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
    // Update sidebar credit badge
    updateSidebarCreditBadge();

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

function createPackCard(product) {
  const card = document.createElement('div');

  const isPurchased = userPurchases.some(p => p.product_id === product.id);
  const priceDisplay = (product.price_cents / 100).toFixed(product.price_cents % 100 === 0 ? 0 : 2);
  const credits = getCreditBalance();
  const canClaim = isPro() && credits > 0 && !isPurchased;

  card.className = `pack-card ${product.pack_type === 'bundle' ? 'pack-card--bundle' : ''} ${isPurchased ? 'pack-card--owned' : ''}`;

  // Determine CTA label and style
  let ctaLabel = `Get Collection $${priceDisplay}`;
  let ctaClass = '';
  if (isPurchased) {
    ctaLabel = '<span class="material-symbols-outlined" style="font-size:16px">folder_open</span> Open';
    ctaClass = 'pack-card__btn--open';
  } else if (canClaim) {
    ctaLabel = `<span class="material-symbols-outlined" style="font-size:14px">confirmation_number</span> Claim (${credits} left)`;
    ctaClass = 'pack-card__btn--claim';
  }

  card.innerHTML = `
    <div class="pack-card__header">
      <span class="pack-card__type">${product.pack_type === 'bundle' ? 'Bundle' : 'Launch Edition'}</span>
      ${isPurchased ? '<span class="pack-card__badge">Purchased</span>' : ''}
    </div>
    <h3 class="pack-card__name">${getProductName(product)}</h3>
    <p class="pack-card__desc">${product.description || `${product.icon_count} animated icons`}</p>
    <div class="pack-card__footer">
      <span class="pack-card__price">${isPurchased ? '' : `$${priceDisplay}`}</span>
      <div class="pack-card__actions">
        <button class="pack-card__preview-btn" data-product-slug="${product.slug}">
          Preview <span class="material-symbols-outlined" style="font-size:14px">arrow_forward</span>
        </button>
        <button class="pack-card__btn ${ctaClass}" 
                data-product-id="${product.id}"
                data-product-slug="${product.slug}">
          ${ctaLabel}
        </button>
      </div>
    </div>`;

  // Wire preview button (opens detail view)
  const previewBtn = card.querySelector('.pack-card__preview-btn');
  previewBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    renderCollectionDetail(product);
  });

  // Wire buy/open/claim button
  const btn = card.querySelector('.pack-card__btn');
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (isPurchased) {
      renderCollectionDetail(product);
    } else if (canClaim) {
      handleCreditRedeem(product);
    } else {
      handlePurchase(product);
    }
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

  const monthlyFeatures = `
    <li>MCP + API access for AI agents</li>
    <li>Workflow tools (PNG-to-SVG, batch export)</li>
    <li>1 free collection per month</li>
    <li>Unlimited commercial license</li>`;
  const annualFeatures = `
    <li>MCP + API access for AI agents</li>
    <li>Workflow tools (PNG-to-SVG, batch export)</li>
    <li>3 collections included upfront</li>
    <li>Unlimited commercial license</li>`;

  card.innerHTML = `
    <div class="promo-banner__left">
      <span class="material-symbols-outlined promo-banner__icon">diamond</span>
      <div class="promo-banner__info">
        <div class="promo-banner__title">Go Pro</div>
        <div class="promo-banner__desc">MCP access, workflow tools, and premium collection access.</div>
      </div>
    </div>
    <div class="promo-banner__right">
      <div class="pro-card__toggle">
        <button class="pro-card__plan-btn pro-card__plan-btn--active" data-plan="monthly">Monthly</button>
        <button class="pro-card__plan-btn" data-plan="annual">Annual</button>
      </div>
      <div class="promo-banner__price-row">
        <span class="promo-banner__price" id="proPriceDisplay">$15<span style="font-size:0.65rem;font-weight:400">/mo</span></span>
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
  toggleBtns.forEach(tb => {
    tb.addEventListener('click', (e) => {
      e.stopPropagation();
      selectedPlan = tb.dataset.plan;
      toggleBtns.forEach(b => b.classList.remove('pro-card__plan-btn--active'));
      tb.classList.add('pro-card__plan-btn--active');
      if (selectedPlan === 'annual') {
        priceDisplay.innerHTML = '<span class="pro-card__annual">Save 45%</span> <span class="launch-card__original">$180</span> $99<span style="font-size:0.65rem;font-weight:400">/yr</span>';
        savingsBadge.style.display = 'none';
        tooltipFeatures.innerHTML = annualFeatures;
      } else {
        priceDisplay.innerHTML = '$15<span style="font-size:0.65rem;font-weight:400">/mo</span>';
        savingsBadge.style.display = 'none';
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
    const modal = document.getElementById('authModal');
    if (modal) modal.classList.add('open');
    showToast('Sign in to subscribe');
    return;
  }

  showToast('Redirecting to checkout...');

  const priceId = plan === 'annual' ? STRIPE_PRO_YEARLY : STRIPE_PRO_MONTHLY;

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
        success_url: `${window.location.origin}?purchase=success`,
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

  removePackCatalog();


  const gridArea = document.getElementById('gridArea');
  const gridTitle = document.getElementById('gridTitle');
  const gridMeta = document.getElementById('gridMeta');
  if (!gridArea) return;

  if (gridTitle) gridTitle.textContent = getProductName(product);
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
           <button class="collection-detail__buy-btn" id="collectionBuyBtn">Get Collection</button>`
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

  // Format tools placeholder (for purchased users)
  if (isPurchased) {
    const tools = document.createElement('div');
    tools.className = 'collection-detail__tools';
    tools.innerHTML = `
      <div class="collection-detail__tools-placeholder">
        <span class="material-symbols-outlined" style="font-size:24px; color: var(--si-text-dim);">build</span>
        <span>Format Tools (Coming Soon)</span>
      </div>
    `;
    detail.appendChild(tools);
  }

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
    cell.style.setProperty('--cell-index', index);

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
      cell.addEventListener('click', () => showLockedPanel(iconName, product));
    } else {
      cell.addEventListener('click', () => selectPremiumIcon(iconName, product.slug));
    }

    // Insert cell into grid (before watermark if present)
    grid.insertBefore(cell, grid.lastChild?.classList?.contains('collection-detail__watermark') ? grid.lastChild : null);
  });
}

// Load collection CSS dynamically
// ── Premium Icon Selection + Customize Panel ──────────────────
// Premium icons get their own panel with animation-specific controls
// instead of the generic free icon panel.

// Cache for fetched collection CSS text
const _collectionCSSCache = {};

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

function extractIconCSS(fullCSS, iconName) {
  // Extract all @keyframes and rules relevant to this specific icon
  // Match: .si-anim--{iconName} or obfuscated class rules and their associated @keyframes
  // Use the obfuscated class token from the manifest classMap if available
  const animClass = getAnimClass(currentCollectionData, iconName);
  const lines = fullCSS.split('\n');
  const relevantRules = [];
  const neededKeyframes = new Set();
  let inBlock = false;
  let braceDepth = 0;
  let currentBlock = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (!inBlock) {
      // Check if this line starts a rule block containing our icon's anim class
      if (line.includes(animClass) || line.includes('.si-anim svg')) {
        inBlock = true;
        braceDepth = 0;
        currentBlock = line;
        braceDepth += (line.match(/{/g) || []).length;
        braceDepth -= (line.match(/}/g) || []).length;
        if (braceDepth <= 0) {
          inBlock = false;
          relevantRules.push(currentBlock);
          // Extract keyframe name from animation property
          const animMatch = currentBlock.match(/animation:\s*([\w-]+)/);
          if (animMatch) neededKeyframes.add(animMatch[1]);
          currentBlock = '';
        }
        continue;
      }

      // Check if this is a @keyframes block
      if (line.trim().startsWith('@keyframes')) {
        inBlock = true;
        braceDepth = 0;
        currentBlock = line;
        braceDepth += (line.match(/{/g) || []).length;
        braceDepth -= (line.match(/}/g) || []).length;
        if (braceDepth <= 0) {
          inBlock = false;
          const nameMatch = currentBlock.match(/@keyframes\s+([\w-]+)/);
          if (nameMatch) {
            // Store temporarily, we'll include only needed ones
            relevantRules.push({ type: 'keyframes', name: nameMatch[1], css: currentBlock });
          }
          currentBlock = '';
        }
        continue;
      }
    } else {
      currentBlock += '\n' + line;
      braceDepth += (line.match(/{/g) || []).length;
      braceDepth -= (line.match(/}/g) || []).length;
      if (braceDepth <= 0) {
        inBlock = false;
        if (currentBlock.includes(`si-anim--${iconName}`) || currentBlock.includes('.si-anim svg')) {
          relevantRules.push(currentBlock);
          const animMatch = currentBlock.match(/animation:\s*([\w-]+)/);
          if (animMatch) neededKeyframes.add(animMatch[1]);
        } else if (currentBlock.trim().startsWith('@keyframes')) {
          const nameMatch = currentBlock.match(/@keyframes\s+([\w-]+)/);
          if (nameMatch) {
            relevantRules.push({ type: 'keyframes', name: nameMatch[1], css: currentBlock });
          }
        }
        currentBlock = '';
      }
    }
  }

  // Filter: keep only keyframes that are referenced, and all icon-specific rules
  const filtered = relevantRules
    .filter(r => {
      if (typeof r === 'string') return true; // icon rule
      if (r.type === 'keyframes') return neededKeyframes.has(r.name);
      return false;
    })
    .map(r => typeof r === 'string' ? r : r.css);

  return filtered.join('\n\n');
}

function buildAnimatedSvg(svgText, iconCSS, color, strokeWidth, animSpeed, playMode) {
  let svg = svgText;
  // Apply color
  svg = svg.replace(/stroke="currentColor"/g, `stroke="${color}"`);
  svg = svg.replace(/fill="currentColor"/g, `fill="${color}"`);
  // Apply stroke width
  svg = svg.replace(/stroke-width="[^"]*"/g, `stroke-width="${strokeWidth}"`);

  if (iconCSS) {
    // Rewrite CSS for self-contained SVG:
    let css = iconCSS;

    // Remove external parent hover selectors
    css = css.replace(/\.si-icon-cell:hover\s+/g, '');
    css = css.replace(/,\s*\n?\.icon-card:hover\s+/g, '');
    css = css.replace(/\.icon-card:hover\s+/g, '');

    // Strip .si-anim--{name} wrapper selectors for standalone SVG
    // .si-anim--bell svg => :root
    // .si-anim--checkmark svg .si-check-circle => :root .si-check-circle
    css = css.replace(/\.si-anim--[\w-]+\s+svg/g, ':root');
    // .si-anim svg => :root
    css = css.replace(/\.si-anim\s+svg/g, ':root');

    // Apply animation speed multiplier
    if (animSpeed !== 1) {
      css = css.replace(/animation:\s*([\w-]+)\s+([\d.]+)s/g, (match, name, duration) => {
        const newDuration = (parseFloat(duration) / animSpeed).toFixed(2);
        return `animation: ${name} ${newDuration}s`;
      });
    }

    // For hover-triggered export, wrap :root selectors in :hover
    if (playMode === 'hover') {
      css = css.replace(/:root\s*{([^}]*animation[^}]*)}/g, ':root:hover {$1}');
      css = css.replace(/:root\s+\.([\w-]+)\s*{([^}]*animation[^}]*)}/g, ':root:hover .$1 {$2}');
    }

    // Apply play mode: replace infinite with 1 for once mode
    if (playMode === 'once') {
      css = css.replace(/infinite/g, '1');
    }

    const styleTag = `<style>${css}</style>`;
    svg = svg.replace(/<svg([^>]*)>/, `<svg$1>${styleTag}`);
  }

  return svg;
}

// Premium panel state
let premiumPanelState = {
  color: '#ffffff',
  strokeWidth: 2,
  animSpeed: 1,
  playMode: 'auto', // 'hover' | 'auto' | 'once'
};

async function selectPremiumIcon(iconName, collectionSlug) {
  const si = window.__supericons;
  if (!si) return;

  try {
    const svgRes = await fetchPremiumAsset(collectionSlug, `${iconName}.svg`);
    if (!svgRes.ok) { showToast('Could not load icon'); return; }
    const svgText = await svgRes.text();
    // Look up the CSS filename from the manifest for this collection
    const manifest = await loadManifest();
    const collData = manifest?.[collectionSlug];
    const collectionCSS = await getCollectionCSS(collectionSlug, collData?.css);
    const iconCSS = extractIconCSS(collectionCSS, iconName);

    // Highlight selected cell
    document.querySelectorAll('.collection-detail__icon-cell.selected').forEach(el => el.classList.remove('selected'));
    document.querySelectorAll('.collection-detail__icon-cell').forEach(cell => {
      const nameEl = cell.querySelector('.collection-detail__icon-name');
      if (nameEl && nameEl.textContent === iconName) cell.classList.add('selected');
    });

    // Render the premium panel
    renderPremiumPanel(iconName, collectionSlug, svgText, iconCSS);

    // Open panel if closed
    if (si.state && !si.state.panelOpen) si.togglePanel();
  } catch (e) {
    console.warn('[Store] Failed to select premium icon:', e);
    showToast('Error loading icon');
  }
}

function renderPremiumPanel(iconName, collectionSlug, svgText, iconCSS) {
  const panel = document.getElementById('panel');
  if (!panel) return;
  const c = premiumPanelState;

  // Preview: wrap in si-anim classes so collection CSS triggers animation
  const preview = document.getElementById('panelPreview');
  if (preview) {
    const animCls = getAnimClass(currentCollectionData, iconName);
    preview.innerHTML = `<div class="panel__preview-icon si-anim ${animCls}" style="color:${c.color};--si-stroke-width:${c.strokeWidth};">${svgText}</div>`;
    const svgEl = preview.querySelector('svg');
    if (svgEl) {
      svgEl.removeAttribute('width');
      svgEl.removeAttribute('height');
      svgEl.style.width = '64px';
      svgEl.style.height = '64px';
    }
  }

  // Build panel body
  const panelBody = panel.querySelector('.panel__placeholder') || panel.querySelector('.panel__body') || document.createElement('div');
  panelBody.className = 'panel__body';

  // Remove any locked panel
  const lockedPanel = panel.querySelector('.locked-panel');
  if (lockedPanel) lockedPanel.remove();

  const defaultSwatches = ['#ffffff','#a3a3a3','#737373','#ff4f00','#ef4444','#f97316','#eab308','#22c55e','#3b82f6','#8b5cf6','#ec4899','#06b6d4'];

  panelBody.innerHTML = `
    <!-- Icon Info -->
    <div class="panel__section">
      <div style="text-align:center; padding-bottom: var(--si-space-2);">
        <p style="font-size: 1rem; color: var(--si-text); margin-bottom: 0.15rem; font-weight: 500;">${iconName}</p>
        <p style="font-size: 0.75rem; color: var(--si-text-dim);">Premium Collection &middot; Animated SVG</p>
      </div>
    </div>

    <!-- Color -->
    <div class="panel__section">
      <div class="panel__section-title">Color</div>
      <div class="customize-color">
        <input type="color" id="premColorPicker" value="${c.color}" class="customize-color__input">
        <input type="text" id="premColorHex" value="${c.color}" class="customize-color__hex" maxlength="7" spellcheck="false">
      </div>
      <div class="customize-swatches" id="premColorSwatches">
        ${defaultSwatches.map(sc => `<button class="customize-swatch" data-prem-color="${sc}" style="background:${sc};" aria-label="Color ${sc}"></button>`).join('')}
      </div>
    </div>

    <!-- Stroke Width -->
    <div class="panel__section">
      <div class="panel__section-title">Stroke Width</div>
      <div class="customize-slider">
        <input type="range" id="premStrokeSlider" min="0.5" max="3" step="0.1" value="${c.strokeWidth}" class="customize-slider__range">
        <span class="customize-slider__value" id="premStrokeValue">${c.strokeWidth}px</span>
      </div>
    </div>

    <!-- Animation Controls -->
    <div class="panel__section">
      <div class="panel__section-title">Animation</div>
      <div class="customize-slider">
        <label style="font-size:0.7rem; color: var(--si-text-dim); margin-bottom: 4px; display: block;">Speed</label>
        <input type="range" id="premAnimSpeed" min="0.25" max="3" step="0.25" value="${c.animSpeed}" class="customize-slider__range">
        <span class="customize-slider__value" id="premAnimSpeedValue">${c.animSpeed}x</span>
      </div>
    </div>

    <!-- Export -->
    <div class="panel__section">
      <div class="panel__section-title">Export</div>
      <div class="customize-export">
        <button class="customize-export__btn" id="premCopyAnimSvg">
          <span class="material-symbols-outlined" style="font-size:16px">content_copy</span> Copy Animated SVG
        </button>
        <button class="customize-export__btn" id="premCopySvgOnly">
          <span class="material-symbols-outlined" style="font-size:16px">content_copy</span> Copy SVG (static)
        </button>
        <button class="customize-export__btn" id="premDownloadAnimSvg">
          <span class="material-symbols-outlined" style="font-size:16px">download</span> Download Animated SVG
        </button>
      </div>

      <div class="panel__section-divider"></div>
      <div class="panel__section-subtitle">PNG Size</div>
      <div class="png-size-picker">
        ${[16, 24, 32, 48, 64, 128, 256].map(s => `
          <button class="png-size-btn ${s === 48 ? 'active' : ''}" data-prem-png-size="${s}">${s}</button>
        `).join('')}
      </div>
      <div class="customize-export">
        <button class="customize-export__btn" id="premDownloadPng">
          <span class="material-symbols-outlined" style="font-size:16px">image</span>
          Download PNG <span class="png-size-badge" id="premPngBadge">48px</span>
        </button>
      </div>
    </div>
  `;

  // Restore panel body (replace placeholder if needed)
  const placeholder = panel.querySelector('.panel__placeholder');
  if (placeholder) {
    placeholder.replaceWith(panelBody);
  }
  // Show controls
  const controls = panel.querySelector('.panel__controls');
  if (controls) controls.style.display = '';

  let pngSize = 48;

  // Wire up event listeners
  wirePremiumPanelEvents(panelBody, iconName, collectionSlug, svgText, iconCSS, () => pngSize, (s) => { pngSize = s; });
}

function wirePremiumPanelEvents(panelBody, iconName, slug, svgText, iconCSS, getPngSize, setPngSize) {
  const c = premiumPanelState;

  // Color
  const picker = panelBody.querySelector('#premColorPicker');
  const hex = panelBody.querySelector('#premColorHex');
  if (picker) picker.addEventListener('input', (e) => {
    c.color = e.target.value;
    if (hex) hex.value = c.color;
    updatePremiumPreview(svgText, iconName);
  });
  if (hex) hex.addEventListener('input', (e) => {
    if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) {
      c.color = e.target.value;
      if (picker) picker.value = c.color;
      updatePremiumPreview(svgText, iconName);
    }
  });

  // Color swatches
  panelBody.querySelectorAll('[data-prem-color]').forEach(btn => {
    btn.addEventListener('click', () => {
      c.color = btn.dataset.premColor;
      if (picker) picker.value = c.color;
      if (hex) hex.value = c.color;
      updatePremiumPreview(svgText, iconName);
    });
  });

  // Stroke
  const stroke = panelBody.querySelector('#premStrokeSlider');
  const strokeVal = panelBody.querySelector('#premStrokeValue');
  if (stroke) stroke.addEventListener('input', (e) => {
    c.strokeWidth = parseFloat(e.target.value);
    if (strokeVal) strokeVal.textContent = `${c.strokeWidth}px`;
    updatePremiumPreview(svgText, iconName);
  });

  // Animation speed
  const speed = panelBody.querySelector('#premAnimSpeed');
  const speedVal = panelBody.querySelector('#premAnimSpeedValue');
  if (speed) speed.addEventListener('input', (e) => {
    c.animSpeed = parseFloat(e.target.value);
    if (speedVal) speedVal.textContent = `${c.animSpeed}x`;
    applyAnimSpeedToPreview(c.animSpeed);
  });

  // PNG size
  panelBody.querySelectorAll('[data-prem-png-size]').forEach(btn => {
    btn.addEventListener('click', () => {
      setPngSize(parseInt(btn.dataset.premPngSize));
      panelBody.querySelectorAll('[data-prem-png-size]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const badge = panelBody.querySelector('#premPngBadge');
      if (badge) badge.textContent = `${getPngSize()}px`;
    });
  });

  // Export: Copy Animated SVG
  const copyAnim = panelBody.querySelector('#premCopyAnimSvg');
  if (copyAnim) copyAnim.addEventListener('click', () => {
    const svg = buildAnimatedSvg(svgText, iconCSS, c.color, c.strokeWidth, c.animSpeed, c.playMode);
    navigator.clipboard.writeText(svg).then(() => showToast('Animated SVG copied'));
  });

  // Export: Copy static SVG
  const copyStatic = panelBody.querySelector('#premCopySvgOnly');
  if (copyStatic) copyStatic.addEventListener('click', () => {
    let svg = svgText;
    svg = svg.replace(/stroke="currentColor"/g, `stroke="${c.color}"`);
    svg = svg.replace(/fill="currentColor"/g, `fill="${c.color}"`);
    svg = svg.replace(/stroke-width="[^"]*"/g, `stroke-width="${c.strokeWidth}"`);
    navigator.clipboard.writeText(svg).then(() => showToast('Static SVG copied'));
  });

  // Export: Download Animated SVG
  const dlAnim = panelBody.querySelector('#premDownloadAnimSvg');
  if (dlAnim) dlAnim.addEventListener('click', () => {
    const svg = buildAnimatedSvg(svgText, iconCSS, c.color, c.strokeWidth, c.animSpeed, c.playMode);
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${iconName}-animated.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Animated SVG downloaded');
  });

  // Export: Download PNG
  const dlPng = panelBody.querySelector('#premDownloadPng');
  if (dlPng) dlPng.addEventListener('click', () => {
    let svg = svgText;
    svg = svg.replace(/stroke="currentColor"/g, `stroke="${c.color}"`);
    svg = svg.replace(/fill="currentColor"/g, `fill="${c.color}"`);
    svg = svg.replace(/stroke-width="[^"]*"/g, `stroke-width="${c.strokeWidth}"`);
    const size = getPngSize();
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const blobUrl = URL.createObjectURL(blob);
    img.onload = () => {
      ctx.drawImage(img, 0, 0, size, size);
      canvas.toBlob((pngBlob) => {
        const dlUrl = URL.createObjectURL(pngBlob);
        const a = document.createElement('a');
        a.href = dlUrl;
        a.download = `${iconName}-${size}px.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(dlUrl);
        showToast(`PNG downloaded (${size}x${size}px)`);
      });
      URL.revokeObjectURL(blobUrl);
    };
    img.src = blobUrl;
  });
}

function updatePremiumPreview(svgText, iconName) {
  const c = premiumPanelState;
  const preview = document.getElementById('panelPreview');
  if (!preview) return;
  const animCls = getAnimClass(currentCollectionData, iconName);
  preview.innerHTML = `<div class="panel__preview-icon si-anim ${animCls}" style="color:${c.color};--si-stroke-width:${c.strokeWidth};">${svgText}</div>`;
  const svgEl = preview.querySelector('svg');
  if (svgEl) {
    svgEl.removeAttribute('width');
    svgEl.removeAttribute('height');
    svgEl.style.width = '64px';
    svgEl.style.height = '64px';
  }
  // Apply current speed to preview
  if (c.animSpeed !== 1) {
    requestAnimationFrame(() => applyAnimSpeedToPreview(c.animSpeed));
  }
}

function applyAnimSpeedToPreview(speedFactor) {
  const preview = document.getElementById('panelPreview');
  if (!preview) return;
  const allEls = preview.querySelectorAll('*');
  allEls.forEach(el => {
    const computed = getComputedStyle(el);
    if (computed.animationName && computed.animationName !== 'none') {
      // Store base durations on first read to prevent compounding
      if (!el.dataset.baseDuration) {
        el.dataset.baseDuration = computed.animationDuration;
      }
      const baseDurations = el.dataset.baseDuration.split(',').map(d => {
        const base = parseFloat(d.trim());
        return `${(base / speedFactor).toFixed(3)}s`;
      });
      el.style.setProperty('animation-duration', baseDurations.join(', '), 'important');
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
  if (existingBody) existingBody.style.display = 'none';

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
        $${priceDisplay} Get Collection
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

function removePackCatalog() {
  const existing = document.getElementById('packCatalog');
  if (existing) existing.remove();
  const existingDash = document.getElementById('dashboardView');
  if (existingDash) existingDash.remove();
  const existingDetail = document.getElementById('collectionDetail');
  if (existingDetail) existingDetail.remove();
  const existingPricing = document.getElementById('pricingView');
  if (existingPricing) existingPricing.remove();
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
      const card = document.createElement('div');
      card.className = 'pack-card pack-card--owned';
      card.innerHTML = `
        <div class="pack-card__header">
          <span class="pack-card__type">Collection</span>
          <span class="pack-card__badge pack-card__badge--owned">Owned</span>
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
    </div>
    ${(isPro() || userPurchases.length > 0) ? `
    <div class="dashboard-section">
      <h3 class="dashboard-section__title">
        API Keys
        <span class="dashboard-section__subtitle">For MCP and programmatic access</span>
      </h3>
      <div id="apiKeysContainer">
        <p class="dashboard-section__empty">Loading keys...</p>
      </div>
      <div class="api-keys__generate">
        <input type="text" class="api-keys__label-input" id="apiKeyLabel" placeholder="Key label (e.g. Cursor, Claude)" maxlength="50">
        <button class="api-keys__generate-btn" id="generateApiKeyBtn">
          <span class="material-symbols-outlined" style="font-size:14px">add</span>
          Generate Key
        </button>
      </div>
    </div>` : ''}`;

  gridArea.appendChild(dashboard);

  // Wire view buttons to open collection detail
  dashboard.querySelectorAll('.dashboard-table__view').forEach(btn => {
    btn.addEventListener('click', () => {
      const product = products.find(p => p.id === btn.dataset.productId)
        || userPurchases.find(p => p.product_id === btn.dataset.productId)?.si_products;
      if (product) renderCollectionDetail(product);
    });
  });

  // Wire API key generation
  if (isPro() || userPurchases.length > 0) {
    fetchAndRenderApiKeys();
    const genBtn = document.getElementById('generateApiKeyBtn');
    if (genBtn) {
      genBtn.addEventListener('click', () => generateApiKey());
    }
  }
}

// ── API Key Management UI ─────────────────────────────────────
// Note: escapeHtml is defined in the Motion Lab section below (line ~2597)

async function fetchAndRenderApiKeys() {
  const container = document.getElementById('apiKeysContainer');
  if (!container) return;

  try {
    const sb = getSupabase();
    const { data: { session } } = await sb.auth.getSession();
    const token = session?.access_token;

    const res = await fetch(`${SUPABASE_URL}/functions/v1/api-keys`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': SUPABASE_ANON,
      },
    });

    if (!res.ok) throw new Error('Failed to load keys');
    const { keys } = await res.json();

    if (!keys || keys.length === 0) {
      container.innerHTML = '<p class="dashboard-section__empty">No API keys yet. Generate one to get started.</p>';
      return;
    }

    container.innerHTML = `
      <table class="dashboard-table dashboard-table--keys">
        <thead>
          <tr><th>Key</th><th>Label</th><th>Created</th><th>Last Used</th><th>Status</th><th></th></tr>
        </thead>
        <tbody>
          ${keys.map(k => `
            <tr class="${k.revoked ? 'api-key--revoked' : ''}">
              <td class="api-key__prefix"><code>${k.key_prefix}...</code></td>
              <td>${escapeHtml(k.label || 'Default')}</td>
              <td>${new Date(k.created_at).toLocaleDateString()}</td>
              <td>${k.last_used ? new Date(k.last_used).toLocaleDateString() : 'Never'}</td>
              <td><span class="api-key__status ${k.revoked ? 'api-key__status--revoked' : 'api-key__status--active'}">${k.revoked ? 'Revoked' : 'Active'}</span></td>
              <td>${k.revoked ? '' : `<button class="api-key__revoke-btn" data-key-id="${k.id}">Revoke</button>`}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>`;

    // Wire revoke buttons
    container.querySelectorAll('.api-key__revoke-btn').forEach(btn => {
      btn.addEventListener('click', () => revokeApiKey(btn.dataset.keyId));
    });
  } catch (err) {
    container.innerHTML = '<p class="dashboard-section__empty">Failed to load API keys.</p>';
    console.error('[Store] API keys fetch error:', err);
  }
}

async function generateApiKey() {
  const labelInput = document.getElementById('apiKeyLabel');
  const label = labelInput?.value?.trim() || 'Default';

  try {
    const sb = getSupabase();
    const { data: { session } } = await sb.auth.getSession();
    const token = session?.access_token;

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
    fetchAndRenderApiKeys();
  } catch (err) {
    console.error('[Store] API key generation error:', err);
    showToast(err.message || 'Failed to generate API key');
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

async function revokeApiKey(keyId) {
  const confirmed = confirm('Revoke this API key? This cannot be undone.');
  if (!confirmed) return;

  try {
    const sb = getSupabase();
    const { data: { session } } = await sb.auth.getSession();
    const token = session?.access_token;

    const res = await fetch(`${SUPABASE_URL}/functions/v1/api-keys`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'apikey': SUPABASE_ANON,
      },
      body: JSON.stringify({ key_id: keyId }),
    });

    if (!res.ok) throw new Error('Failed to revoke key');

    showToast('API key revoked');
    fetchAndRenderApiKeys();
  } catch (err) {
    showToast('Failed to revoke key. Please try again.');
    console.error('[Store] API key revoke error:', err);
  }
}

// ── Pricing Page ──────────────────────────────────────────────
function renderPricingPage() {
  removePackCatalog();

  const gridArea = document.getElementById('gridArea');
  if (!gridArea) return;

  const isAnnual = false;
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
        <span class="pricing-toggle__badge">Save 45%</span>
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
          <p class="pricing-card__desc">20,000+ icons, 9 libraries, AI search, SVG export. No account needed.</p>
        </div>
        <div class="pricing-card__price">
          <span class="pricing-card__amount">$0</span>
          <span class="pricing-card__period">forever</span>
        </div>
        <ul class="pricing-card__features">
          <li><span class="material-symbols-outlined">check</span> 20,000+ icons across 9 libraries</li>
          <li><span class="material-symbols-outlined">check</span> Material, Lucide, Tabler, Phosphor + more</li>
          <li><span class="material-symbols-outlined">check</span> AI semantic search</li>
          <li><span class="material-symbols-outlined">check</span> SVG, PNG, CSS export</li>
          <li><span class="material-symbols-outlined">check</span> MCP server (20,000+ free icons)</li>
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
          <p class="pricing-card__desc">A new animated pack drops in your account every month. Keep all claimed packs forever.</p>
        </div>
        <div class="pricing-card__price">
          <span class="pricing-card__amount" id="pricingProAmount">$15</span>
          <span class="pricing-card__period" id="pricingProPeriod">/mo</span>
          <span class="pricing-card__original" id="pricingProOriginal" style="display:none"></span>
        </div>
        <ul class="pricing-card__features">
          <li><span class="material-symbols-outlined">check</span> Everything in Free</li>
          <li><span class="material-symbols-outlined">check</span> 1 pack credit per billing cycle</li>
          <li><span class="material-symbols-outlined">check</span> Claimed packs are yours forever</li>
          <li><span class="material-symbols-outlined">check</span> Full MCP access (free + premium)</li>
          <li><span class="material-symbols-outlined">check</span> Commercial use, unlimited projects</li>
          <li><span class="material-symbols-outlined">check</span> 3 bonus packs upfront (annual)</li>
          <li><span class="material-symbols-outlined">check</span> Priority support</li>
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
          <li class="pricing-card__feature--dim"><span class="material-symbols-outlined">close</span> No monthly credit drops</li>
          <li><span class="material-symbols-outlined">check</span> MCP access for purchased pack</li>
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
          <li class="pricing-card__feature--dim"><span class="material-symbols-outlined">close</span> No monthly credit drops</li>
          <li><span class="material-symbols-outlined">check</span> MCP access for all 8 packs</li>
        </ul>
        <button class="pricing-card__cta pricing-card__cta--launch" id="pricingLaunchBtn">Get Launch Bundle</button>
      </div>
    </div>

    <div class="pricing-packs-strip">
      <p class="pricing-packs-strip__label">What's inside the Launch Bundle:</p>
      <div class="pricing-packs-strip__list">
        <span class="pricing-pack-chip"><span class="material-symbols-outlined" style="font-size:14px;font-variation-settings:'FILL' 1">smart_toy</span> Agentic AI</span>
        <span class="pricing-pack-chip"><span class="material-symbols-outlined" style="font-size:14px;font-variation-settings:'FILL' 1">shopping_cart</span> E-commerce</span>
        <span class="pricing-pack-chip"><span class="material-symbols-outlined" style="font-size:14px;font-variation-settings:'FILL' 1">play_circle</span> Media &amp; Playback</span>
        <span class="pricing-pack-chip"><span class="material-symbols-outlined" style="font-size:14px;font-variation-settings:'FILL' 1">menu</span> Navigation &amp; Menus</span>
        <span class="pricing-pack-chip"><span class="material-symbols-outlined" style="font-size:14px;font-variation-settings:'FILL' 1">lock</span> Security &amp; Auth</span>
        <span class="pricing-pack-chip"><span class="material-symbols-outlined" style="font-size:14px;font-variation-settings:'FILL' 1">favorite</span> Social &amp; Comms</span>
        <span class="pricing-pack-chip"><span class="material-symbols-outlined" style="font-size:14px;font-variation-settings:'FILL' 1">bar_chart</span> Data &amp; Charts</span>
        <span class="pricing-pack-chip"><span class="material-symbols-outlined" style="font-size:14px;font-variation-settings:'FILL' 1">thumb_up</span> Status &amp; Feedback</span>
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
            Each pack contains 50 solid icons from Material Symbols, each with a unique story-driven CSS hover animation. The 8 packs cover: Agentic AI, E-commerce, Media &amp; Playback, Navigation &amp; Menus, Security &amp; Auth, Social &amp; Communications, Data &amp; Charts, and Status &amp; Feedback. That's 400 animated SVG icons in total.
          </div>
        </div>
        <div class="pricing-faq__item">
          <button class="pricing-faq__question" aria-expanded="false">
            How do monthly Pro credits work?
            <span class="material-symbols-outlined pricing-faq__chevron">expand_more</span>
          </button>
          <div class="pricing-faq__answer">
            Pro subscribers receive 1 free pack credit per billing cycle. Annual subscribers also get 3 packs included upfront when they subscribe. You choose which collection to unlock each month, and claimed packs are yours permanently, even if you cancel.
          </div>
        </div>
        <div class="pricing-faq__item">
          <button class="pricing-faq__question" aria-expanded="false">
            What is the MCP server?
            <span class="material-symbols-outlined pricing-faq__chevron">expand_more</span>
          </button>
          <div class="pricing-faq__answer">
            The SuperIcons MCP (Model Context Protocol) server lets AI coding agents like Claude, Cursor, and Windsurf search and retrieve icons programmatically. The free MCP server gives access to the full free icon library. Pro subscribers get an API key for premium animated icon access through MCP.
          </div>
        </div>
        <div class="pricing-faq__item">
          <button class="pricing-faq__question" aria-expanded="false">
            Can I cancel my Pro subscription anytime?
            <span class="material-symbols-outlined pricing-faq__chevron">expand_more</span>
          </button>
          <div class="pricing-faq__answer">
            Yes, cancel anytime from your dashboard. Your Pro benefits remain active until the end of the current billing period. Any packs claimed with your monthly credit are yours to keep permanently.
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

  let isAnnualState = false;

  function setPeriod(annual) {
    isAnnualState = annual;
    monthlyBtn.classList.toggle('pricing-toggle__seg--active', !annual);
    annualBtn.classList.toggle('pricing-toggle__seg--active', annual);

    if (annual) {
      proAmount.textContent = '$99';
      proPeriod.textContent = '/yr';
      proOriginal.style.display = 'inline';
      proOriginal.textContent = '$180';
    } else {
      proAmount.textContent = '$15';
      proPeriod.textContent = '/mo';
      proOriginal.style.display = 'none';
    }
  }

  monthlyBtn?.addEventListener('click', () => setPeriod(false));
  annualBtn?.addEventListener('click', () => setPeriod(true));

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
function renderTermsPage() {
  removePackCatalog();

  const gridArea = document.getElementById('gridArea');
  if (!gridArea) return;

  const page = document.createElement('div');
  page.id = 'termsView';
  page.className = 'terms-view';

  page.innerHTML = `
    <div class="terms-content">
      <p class="terms-content__updated">Last updated: March 26, 2026</p>

      <section class="terms-section">
        <h3 class="terms-section__title">1. Usage Rights</h3>
        <p>SuperIcons provides free and premium icon assets for use in digital products. Free icons from the 9 open-source libraries (Lucide, Heroicons, Material, Bootstrap, Phosphor, Tabler, Ionicons, Font Awesome, Radix) retain their original open-source licenses.</p>
        <p>Premium animated collections are proprietary assets created by Curly Mole Labs. Your usage rights depend on your license tier (see Section 4 below).</p>
      </section>

      <section class="terms-section">
        <h3 class="terms-section__title">2. AI Output Rights</h3>
        <p>Icons retrieved via the SuperIcons MCP server or API may be used in AI-generated code output. The generated code (HTML, CSS, JSX) that references or embeds our icons is your property.</p>
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
            <p>Applies to: A-la-carte purchases, credit redemptions</p>
            <p>Use the purchased collection in one (1) project. Additional projects require additional purchases or a Pro subscription.</p>
          </div>
          <div class="terms-tier">
            <h4>Unlimited Project License</h4>
            <p>Applies to: Pro subscribers, Launch Edition purchasers</p>
            <p>Use purchased collections in unlimited projects, including client work. Valid for as long as your Pro subscription is active, or permanently for Launch Edition.</p>
          </div>
        </div>
      </section>

      <section class="terms-section">
        <h3 class="terms-section__title">5. Refund Policy</h3>
        <p><strong>Pro Subscription:</strong> You may cancel your subscription at any time. No partial refunds are issued for the current billing period. Your benefits remain active until the end of the paid period. Collections claimed with credits are yours permanently.</p>
        <p><strong>One-time Purchases:</strong> Due to the digital nature of our products, we do not offer refunds on individual collection purchases or the Launch Edition bundle once download access has been granted.</p>
        <p><strong>Exceptions:</strong> If you experience a technical issue that prevents you from accessing your purchased content, contact us within 14 days for a full refund or resolution.</p>
      </section>

      <section class="terms-section">
        <h3 class="terms-section__title">6. Contact</h3>
        <p>For questions about these terms, licensing, or refund requests:</p>
        <p>Email: <a href="mailto:hello@supericons.dev">hello@supericons.dev</a></p>
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
    const modal = document.getElementById('authModal');
    if (modal) modal.classList.add('open');
    showToast('Sign in to purchase');
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
        success_url: `${window.location.origin}?purchase=success`,
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
async function handleCreditRedeem(product) {
  if (!isLoggedIn() || !isPro()) return;

  const credits = getCreditBalance();
  if (credits <= 0) {
    showToast('No credits available');
    return;
  }

  // Confirmation
  const confirmed = confirm(`Use 1 credit to unlock "${product.name}"?\n\n${credits} credit${credits > 1 ? 's' : ''} remaining.`);
  if (!confirmed) return;

  showToast('Claiming collection...');

  try {
    const sb = getSupabase();
    const { data: { session } } = await sb.auth.getSession();
    const token = session?.access_token;

    const res = await fetch(`${SUPABASE_URL}/functions/v1/redeem-credit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'apikey': SUPABASE_ANON,
      },
      body: JSON.stringify({ product_id: product.id }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Redemption failed');
    }

    const { remaining_credits } = await res.json();
    showToast(`Claimed "${product.name}"! ${remaining_credits} credit${remaining_credits !== 1 ? 's' : ''} remaining.`);

    // Refresh purchases and re-render
    await fetchUserPurchases();
    renderPackCatalog();
  } catch (err) {
    showToast(err.message || 'Failed to redeem credit. Please try again.');
    console.error('[Store] Credit redeem error:', err);
  }
}

// ── Purchase Flow ─────────────────────────────────────────────
async function handlePurchase(product) {
  if (!isLoggedIn()) {
    // Open auth modal
    const modal = document.getElementById('authModal');
    if (modal) modal.classList.add('open');
    showToast('Sign in to purchase');
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
        success_url: `${window.location.origin}?purchase=success`,
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
      await fetchUserPurchases();
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
      await fetchUserPurchases();
      switchView('dashboard');
    });
  }

  // Check for purchase success/cancel URL params
  const params = new URLSearchParams(window.location.search);
  if (params.get('purchase') === 'success') {
    // Clean URL immediately
    window.history.replaceState({}, '', window.location.pathname);
    // Show success toast
    showToast('Purchase successful! Opening your collection...');
    // Refresh purchases and navigate to My Collection
    handlePurchaseSuccess();
  } else if (params.get('purchase') === 'canceled') {
    showToast('Payment was not completed. Try again.');
    window.history.replaceState({}, '', window.location.pathname);
  }
}

async function handlePurchaseSuccess() {
  // Wait for webhook to process, then fetch purchases
  let retries = 0;
  const maxRetries = 3;
  while (retries < maxRetries) {
    await new Promise(r => setTimeout(r, 1500));
    await fetchUserPurchases();
    if (userPurchases.length > 0) break;
    retries++;
  }
  // Navigate to My Collection
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
  controlsWired: false,   // guard against listener stacking on reload
};

function renderMotionLab() {
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
                <button class="ml__preset-btn" data-preset="bounce" title="Bounce up">
                  <span class="material-symbols-outlined" style="font-size:13px">arrow_upward</span> Bounce
                </button>
                <button class="ml__preset-btn" data-preset="float" title="Gentle float">
                  <span class="material-symbols-outlined" style="font-size:13px">cloud</span> Float
                </button>
                <button class="ml__preset-btn" data-preset="shake" title="Horizontal shake">
                  <span class="material-symbols-outlined" style="font-size:13px">vibration</span> Shake
                </button>
                <button class="ml__preset-btn" data-preset="spin" title="360 spin">
                  <span class="material-symbols-outlined" style="font-size:13px">rotate_right</span> Spin
                </button>
                <button class="ml__preset-btn" data-preset="pulse" title="Pulse in and out">
                  <span class="material-symbols-outlined" style="font-size:13px">radio_button_checked</span> Pulse
                </button>
                <button class="ml__preset-btn" data-preset="pop" title="Pop in with spring">
                  <span class="material-symbols-outlined" style="font-size:13px">open_in_full</span> Pop
                </button>
                <button class="ml__preset-btn" data-preset="heartbeat" title="Double-thump cardiac rhythm">
                  <span class="material-symbols-outlined" style="font-size:13px">favorite</span> Heartbeat
                </button>
                <button class="ml__preset-btn" data-preset="rubberband" title="Elastic stretch and snap">
                  <span class="material-symbols-outlined" style="font-size:13px">straighten</span> Rubber Band
                </button>
                <button class="ml__preset-btn" data-preset="jelly" title="Gelatin wobble">
                  <span class="material-symbols-outlined" style="font-size:13px">water_drop</span> Jelly
                </button>
                <button class="ml__preset-btn" data-preset="ring" title="Bell swing from top pivot">
                  <span class="material-symbols-outlined" style="font-size:13px">notifications</span> Ring
                </button>
                <button class="ml__preset-btn" data-preset="wobble" title="Asymmetric rocking">
                  <span class="material-symbols-outlined" style="font-size:13px">tsunami</span> Wobble
                </button>
                <button class="ml__preset-btn" data-preset="magnetic" title="Magnetic pull and snap">
                  <span class="material-symbols-outlined" style="font-size:13px">attractions</span> Magnetic
                </button>
                <button class="ml__preset-btn" data-preset="recoil" title="Anticipation then explosive release">
                  <span class="material-symbols-outlined" style="font-size:13px">electric_bolt</span> Recoil
                </button>
                <button class="ml__preset-btn" data-preset="pendulum" title="Sinusoidal swing">
                  <span class="material-symbols-outlined" style="font-size:13px">swap_horiz</span> Pendulum
                </button>
                <button class="ml__preset-btn" data-preset="whiplash" title="Cascading spring snap">
                  <span class="material-symbols-outlined" style="font-size:13px">crop_rotate</span> Whiplash
                </button>
                <button class="ml__preset-btn" data-preset="tremor" title="Seismic micro-vibration">
                  <span class="material-symbols-outlined" style="font-size:13px">earthquake</span> Tremor
                </button>
                <button class="ml__preset-btn" data-preset="neonglow" title="Pulsing cyan aura glow">
                  <span class="material-symbols-outlined" style="font-size:13px">flare</span> Neon Glow
                </button>
                <button class="ml__preset-btn" data-preset="breathe" title="Ultra-slow ambient scale">
                  <span class="material-symbols-outlined" style="font-size:13px">spa</span> Breathe
                </button>
                <button class="ml__preset-btn" data-preset="metronome" title="Steady left-right tilt">
                  <span class="material-symbols-outlined" style="font-size:13px">timer</span> Metronome
                </button>
                <button class="ml__preset-btn" data-preset="orbit" title="Circular orbit path">
                  <span class="material-symbols-outlined" style="font-size:13px">motion_photos_on</span> Orbit
                </button>
                <button class="ml__preset-btn" data-preset="flicker" title="Rapid lightbulb stutter">
                  <span class="material-symbols-outlined" style="font-size:13px">fluorescent</span> Flicker
                </button>
                <button class="ml__preset-btn" data-preset="squish" title="Compression squeeze">
                  <span class="material-symbols-outlined" style="font-size:13px">compress</span> Squish
                </button>
                <button class="ml__preset-btn" data-preset="glide" title="Slow horizontal drift">
                  <span class="material-symbols-outlined" style="font-size:13px">air</span> Glide
                </button>
              </div>
            </div>

            <!-- Quadrant B: left - Entrances -->
            <div class="ml__quad ml__quad--left" data-quad="entrances">
              <span class="ml__quad-label">Entrances</span>
              <div class="ml__quad-btns">
                <button class="ml__preset-btn" data-preset="fade" title="Fade in">
                  <span class="material-symbols-outlined" style="font-size:13px">gradient</span> Fade
                </button>
                <button class="ml__preset-btn" data-preset="fadeIn" title="Opacity fade in">
                  <span class="material-symbols-outlined" style="font-size:13px">gradient</span> Fade In
                </button>
                <button class="ml__preset-btn" data-preset="scaleUp" title="Scale from zero">
                  <span class="material-symbols-outlined" style="font-size:13px">zoom_in</span> Scale Up
                </button>
                <button class="ml__preset-btn" data-preset="slideUp" title="Slide up from below">
                  <span class="material-symbols-outlined" style="font-size:13px">arrow_upward</span> Slide Up
                </button>
                <button class="ml__preset-btn" data-preset="springLand" title="Spring bounce landing">
                  <span class="material-symbols-outlined" style="font-size:13px">downloading</span> Spring Land
                </button>
                <button class="ml__preset-btn" data-preset="slingshot" title="Elastic launch from left">
                  <span class="material-symbols-outlined" style="font-size:13px">swipe_right_alt</span> Slingshot
                </button>
                <button class="ml__preset-btn" data-preset="glitchOn" title="Digital artifact entrance">
                  <span class="material-symbols-outlined" style="font-size:13px">flash_on</span> Glitch On
                </button>
                <button class="ml__preset-btn" data-preset="unfold" title="Reveal from below">
                  <span class="material-symbols-outlined" style="font-size:13px">unfold_more</span> Unfold
                </button>
                <button class="ml__preset-btn" data-preset="warpIn" title="Warp from distance">
                  <span class="material-symbols-outlined" style="font-size:13px">blur_on</span> Warp In
                </button>
                <button class="ml__preset-btn" data-preset="slideRight" title="Slide in from left">
                  <span class="material-symbols-outlined" style="font-size:13px">arrow_forward</span> Slide Right
                </button>
                <button class="ml__preset-btn" data-preset="slideDown" title="Drop in from above">
                  <span class="material-symbols-outlined" style="font-size:13px">arrow_downward</span> Slide Down
                </button>
                <button class="ml__preset-btn" data-preset="flipIn" title="Flip rotation entrance">
                  <span class="material-symbols-outlined" style="font-size:13px">flip</span> Flip In
                </button>
                <button class="ml__preset-btn" data-preset="telegram" title="Diagonal arc entry">
                  <span class="material-symbols-outlined" style="font-size:13px">send</span> Telegram
                </button>
                <button class="ml__preset-btn" data-preset="bloom" title="Scale with counter-rotation">
                  <span class="material-symbols-outlined" style="font-size:13px">filter_vintage</span> Bloom
                </button>
                <button class="ml__preset-btn" data-preset="shockwave" title="Explosive scale entry">
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
                <button class="ml__preset-btn" data-preset="fadeOut" title="Fade to invisible">
                  <span class="material-symbols-outlined" style="font-size:13px">gradient</span> Fade Out
                </button>
                <button class="ml__preset-btn" data-preset="scaleDown" title="Shrink to zero">
                  <span class="material-symbols-outlined" style="font-size:13px">zoom_out</span> Scale Down
                </button>
                <button class="ml__preset-btn" data-preset="slideOut" title="Slide up and away">
                  <span class="material-symbols-outlined" style="font-size:13px">arrow_upward</span> Slide Out
                </button>
                <button class="ml__preset-btn" data-preset="vortex" title="Spiral drain exit">
                  <span class="material-symbols-outlined" style="font-size:13px">cyclone</span> Vortex
                </button>
                <button class="ml__preset-btn" data-preset="glitchOff" title="Digital artifact exit">
                  <span class="material-symbols-outlined" style="font-size:13px">flash_off</span> Glitch Off
                </button>
                <button class="ml__preset-btn" data-preset="dissolve" title="Expand and dissolve">
                  <span class="material-symbols-outlined" style="font-size:13px">blur_on</span> Dissolve
                </button>
                <button class="ml__preset-btn" data-preset="popOut" title="Spring squish then vanish">
                  <span class="material-symbols-outlined" style="font-size:13px">close_fullscreen</span> Pop Out
                </button>
                <button class="ml__preset-btn" data-preset="slideLeft" title="Slide out to left">
                  <span class="material-symbols-outlined" style="font-size:13px">arrow_back</span> Slide Left
                </button>
                <button class="ml__preset-btn" data-preset="sinkDown" title="Gravity sink downward">
                  <span class="material-symbols-outlined" style="font-size:13px">download</span> Sink Down
                </button>
                <button class="ml__preset-btn" data-preset="flipOut" title="Flip rotation exit">
                  <span class="material-symbols-outlined" style="font-size:13px">flip</span> Flip Out
                </button>
                <button class="ml__preset-btn" data-preset="implode" title="Crush inward">
                  <span class="material-symbols-outlined" style="font-size:13px">compress</span> Implode
                </button>
                <button class="ml__preset-btn" data-preset="puffOut" title="Smoke evaporation">
                  <span class="material-symbols-outlined" style="font-size:13px">cloud_queue</span> Puff Out
                </button>
                <button class="ml__preset-btn" data-preset="launchOut" title="Diagonal arc exit">
                  <span class="material-symbols-outlined" style="font-size:13px">rocket_launch</span> Launch Out
                </button>
                <button class="ml__preset-btn" data-preset="shrinkSpin" title="Rotate while shrinking">
                  <span class="material-symbols-outlined" style="font-size:13px">autorenew</span> Shrink Spin
                </button>
                <button class="ml__preset-btn" data-preset="blinkOut" title="Rapid flicker then gone">
                  <span class="material-symbols-outlined" style="font-size:13px">flash_off</span> Blink Out
                </button>
              </div>
            </div>

            <!-- Quadrant D: bottom - My Animations -->
            <div class="ml__quad ml__quad--bottom" data-quad="saved">
              <span class="ml__quad-label">My Animations</span>
              <div class="ml__quad-btns" id="mlSavedBtns">
                <button class="ml__preset-btn" data-preset="sparkle" title="Golden sparkle glow">
                  <span class="material-symbols-outlined" style="font-size:13px">auto_awesome</span> Sparkle
                </button>
                <button class="ml__preset-btn" data-preset="swing" title="Pendulum swing">
                  <span class="material-symbols-outlined" style="font-size:13px">sync_alt</span> Swing
                </button>
                <button class="ml__preset-btn" data-preset="jitter" title="Micro jitter">
                  <span class="material-symbols-outlined" style="font-size:13px">electric_bolt</span> Jitter
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
            <button class="ml__play-btn" id="mlPlayBtn" data-tip="Stop / Play">
              <span class="material-symbols-outlined" style="font-size:16px">stop</span>
            </button>
          </div>
          <!-- Row 2: Export trigger + Download/Copy -->
          <div class="ml__export-bar">
            <div class="ml__trigger-group">
              <span class="ml__trigger-info" data-tip="Sets how the animation starts in your exported code. Loop: plays continuously. Hover: plays on mouse over. Click: plays on tap."><span class="material-symbols-outlined" style="font-size:12px">info</span></span>
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

          <!-- AI Agent -->
          <div class="ml__agent-box">
            <div class="ml__agent-header">
              <span class="material-symbols-outlined" style="font-size:14px;color:var(--si-primary)">smart_toy</span>
              <span class="ml__agent-title">AI Agent</span>
              <span class="ml__coming-soon">Coming Soon</span>
            </div>
            <div class="ml__agent-row">
              <textarea class="ml__agent-input" id="mlAgentInput" rows="2"
                placeholder='Describe animation... e.g. "make it sparkle and glow"'></textarea>
              <button class="ml__agent-apply-btn" id="mlAgentApply" data-tip="Generate">
                <span class="material-symbols-outlined" style="font-size:16px">auto_fix_high</span>
              </button>
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
  `;




  gridArea.appendChild(view);

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
  libBtn?.addEventListener('click', () => switchView('browse'));

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
    motionLab.tracks = {};
    motionLab.activePreset = null;
    motionLab.intensity = 100;
    motionLab.playback.mode = 'loop';
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

    document.querySelectorAll('.ml__preset-btn').forEach(b => b.classList.remove('active'));

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
  });

  // Agent Apply button - keyword-based preset matching
  const agentApplyBtn = document.getElementById('mlAgentApply');
  const agentInput = document.getElementById('mlAgentInput');
  agentApplyBtn?.addEventListener('click', () => {
    const text = agentInput?.value?.trim().toLowerCase() || '';
    if (!text) { showToast('Describe the animation you want.'); return; }

    // Map keywords to preset names
    const keywordMap = [
      // Motion (existing)
      { keys: ['pulse', 'throb'], preset: 'pulse' },
      { keys: ['bounce', 'jump', 'hop'], preset: 'bounce' },
      { keys: ['spin', 'rotate', 'turn', 'whirl', '360'], preset: 'spin' },
      { keys: ['shake', 'vibrate', 'rattle'], preset: 'shake' },
      { keys: ['float', 'hover', 'levitate', 'drift'], preset: 'float' },
      { keys: ['pop', 'burst'], preset: 'pop' },
      { keys: ['sparkle', 'shine', 'glitter', 'golden'], preset: 'sparkle' },
      { keys: ['swing', 'sway', 'rock'], preset: 'swing' },
      { keys: ['jitter', 'nervous', 'twitch'], preset: 'jitter' },
      // Motion (new)
      { keys: ['heartbeat', 'heart', 'cardiac', 'thump'], preset: 'heartbeat' },
      { keys: ['rubberband', 'rubber', 'stretch', 'elastic', 'band'], preset: 'rubberband' },
      { keys: ['jelly', 'gelatin', 'wobbly', 'gummy'], preset: 'jelly' },
      { keys: ['ring', 'bell', 'chime', 'ding'], preset: 'ring' },
      { keys: ['wobble', 'unstable', 'tilt'], preset: 'wobble' },
      { keys: ['magnetic', 'magnet', 'attract', 'pull'], preset: 'magnetic' },
      { keys: ['recoil', 'kickback', 'muscle'], preset: 'recoil' },
      { keys: ['pendulum', 'clock', 'tick'], preset: 'pendulum' },
      { keys: ['whiplash', 'whip', 'snap', 'lash'], preset: 'whiplash' },
      { keys: ['tremor', 'earthquake', 'seismic', 'quake'], preset: 'tremor' },
      { keys: ['neonglow', 'neon', 'glow', 'aura', 'plasma'], preset: 'neonglow' },
      { keys: ['breathe', 'breath', 'zen', 'calm', 'ambient'], preset: 'breathe' },
      { keys: ['metronome', 'tempo', 'rhythm'], preset: 'metronome' },
      // Entrances
      { keys: ['fade', 'fad', 'opacity'], preset: 'fade' },
      { keys: ['fadein', 'fade in', 'appear'], preset: 'fadeIn' },
      { keys: ['scaleup', 'scale up', 'grow', 'zoom in'], preset: 'scaleUp' },
      { keys: ['slideup', 'slide up', 'rise'], preset: 'slideUp' },
      { keys: ['springland', 'spring land', 'spring', 'land'], preset: 'springLand' },
      { keys: ['slingshot', 'launch', 'catapult'], preset: 'slingshot' },
      { keys: ['glitchon', 'glitch on', 'glitch in', 'digital'], preset: 'glitchOn' },
      { keys: ['unfold', 'reveal', 'origami'], preset: 'unfold' },
      { keys: ['warpin', 'warp in', 'warp', 'teleport'], preset: 'warpIn' },
      // Exits
      { keys: ['fadeout', 'fade out', 'vanish', 'invisible', 'dissolve'], preset: 'fadeOut' },
      { keys: ['scaledown', 'scale down', 'shrink', 'zoom out'], preset: 'scaleDown' },
      { keys: ['slideout', 'slide out', 'exit'], preset: 'slideOut' },
      { keys: ['vortex', 'spiral', 'drain', 'tornado'], preset: 'vortex' },
      { keys: ['glitchoff', 'glitch off', 'glitch out'], preset: 'glitchOff' },
      { keys: ['dissolve', 'dissipate', 'evaporate'], preset: 'dissolve' },
      // Phase 2: Motion
      { keys: ['orbit', 'circular', 'revolve'], preset: 'orbit' },
      { keys: ['flicker', 'lightbulb', 'strobe'], preset: 'flicker' },
      { keys: ['squish', 'compress', 'squeeze'], preset: 'squish' },
      { keys: ['glide', 'aerodynamic', 'soar'], preset: 'glide' },
      // Phase 2: Entrances
      { keys: ['slideright', 'slide right', 'enter right'], preset: 'slideRight' },
      { keys: ['slidedown', 'slide down', 'drop in', 'drop'], preset: 'slideDown' },
      { keys: ['flipin', 'flip in', 'flip enter'], preset: 'flipIn' },
      { keys: ['telegram', 'messenger', 'paper plane', 'arc in'], preset: 'telegram' },
      { keys: ['bloom', 'flower', 'blossom', 'petal'], preset: 'bloom' },
      { keys: ['shockwave', 'shock', 'explosive', 'impact'], preset: 'shockwave' },
      // Phase 2: Exits
      { keys: ['popout', 'pop out', 'squish out'], preset: 'popOut' },
      { keys: ['slideleft', 'slide left', 'exit left'], preset: 'slideLeft' },
      { keys: ['sinkdown', 'sink', 'gravity', 'heavy', 'fall'], preset: 'sinkDown' },
      { keys: ['flipout', 'flip out', 'flip exit'], preset: 'flipOut' },
      { keys: ['implode', 'crush', 'collapse'], preset: 'implode' },
      { keys: ['puffout', 'puff', 'smoke', 'vapor'], preset: 'puffOut' },
      { keys: ['launchout', 'launch out', 'rocket', 'takeoff'], preset: 'launchOut' },
      { keys: ['shrinkspin', 'shrink spin', 'spin away'], preset: 'shrinkSpin' },
      { keys: ['blinkout', 'blink out', 'blink'], preset: 'blinkOut' },
    ];

    const matched = keywordMap.filter(m => m.keys.some(k => text.includes(k)));
    if (matched.length === 0) {
      showToast('Try: bounce, heartbeat, jelly, magnetic, glitch on, vortex');
      return;
    }

    // Apply first match normally, rest as composed
    applyPreset(matched[0].preset);
    for (let i = 1; i < matched.length; i++) {
      composePreset(matched[i].preset);
    }
    showToast(`Applied: ${matched.map(m => m.preset).join(' + ')}`);
    if (agentInput) agentInput.value = '';
  });
}

function loadSvgIntoMotionLab(svgText) {
  motionLab.svgText = svgText;

  // Clear stale state from previous icon load
  motionLab.selectedIds.clear();
  motionLab.tracks = {};
  motionLab.elements = [];
  motionLab.activePreset = null;
  motionLab.fillColor = null;
  motionLab.strokeColor = null;

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
    // Ensure currentColor resolves to theme-appropriate text color
    clone.style.color = 'var(--si-text)';

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
      let target = e.target;
      while (target && target !== clone && target.parentElement !== clone) {
        target = target.parentElement;
      }
      if (target && target !== clone && target !== preview && target !== stageRing) {
        const selector = getElementSelector(target);
        selectElement(selector);
      }
    });
  }

  // Build element tree from the DOM-mounted clone (not parsed node)
  // clone is defined above in the if (preview) block
  const domSvg = document.querySelector('#mlPreview svg');
  if (domSvg) buildElementTree(domSvg);

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

function getElementSelector(el) {
  if (el.id) return `#${el.id}`;
  if (el.classList.length > 0) return `.${el.classList[0]}`;
  // Positional fallback: nth-child counts ALL children regardless of type
  const parent = el.parentElement;
  if (!parent) return el.tagName.toLowerCase();
  const allChildren = Array.from(parent.children);
  const idx = allChildren.indexOf(el);
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
  for (const child of svgEl.children) {
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
      <div class="ml__prop-title">Fill
        <button class="ml__ctrl-reset" id="mlFillReset" data-tip="Reset fill">
          <span class="material-symbols-outlined" style="font-size:13px">restart_alt</span>
        </button>
      </div>
      <div class="ml__color-dots" id="mlFillDots">
        ${colorDotRow('Fill', motionLab.fillColor)}
      </div>
    </div>

    <!-- Stroke color -->
    <div class="ml__prop-group">
      <div class="ml__prop-title">Stroke
        <button class="ml__ctrl-reset" id="mlStrokeReset" data-tip="Reset stroke">
          <span class="material-symbols-outlined" style="font-size:13px">restart_alt</span>
        </button>
      </div>
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

  function applyFillToSvg(color) {
    motionLab.fillColor = color || null;
    const svgEl = document.querySelector('#mlPreview svg');
    if (!svgEl || !motionLab.svgText) return;
    if (color) {
      // Parse original SVG to respect outline structure
      const origDoc = new DOMParser().parseFromString(motionLab.svgText, 'image/svg+xml');
      const origEls = origDoc.querySelectorAll(SHAPE_TAGS);
      svgEl.querySelectorAll(SHAPE_TAGS).forEach((el, i) => {
        const origFill = origEls[i]?.getAttribute('fill');
        // Skip elements with fill="none" (outline paths)
        if (origFill === 'none') return;
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
      if (isStrokeBased) {
        // Stroke-based icons (Lucide, Tabler, Iconoir): apply to all shape elements
        svgEl.querySelectorAll(SHAPE_TAGS).forEach(el => {
          el.setAttribute('stroke', color);
        });
      } else {
        // Fill-based icons (Phosphor, Material): only apply to paths that had strokes
        const origEls = origDoc.querySelectorAll(SHAPE_TAGS);
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

  // Wire Fill reset
  const fillResetBtn = document.getElementById('mlFillReset');
  if (fillResetBtn) {
    fillResetBtn.addEventListener('click', () => {
      applyFillToSvg(null);
      syncDotHighlight('mlFillDots', null);
      const picker = document.getElementById('mlFillPicker');
      if (picker) picker.value = '#FFFFFF';
    });
  }

  // Wire Stroke reset
  const strokeResetBtn = document.getElementById('mlStrokeReset');
  if (strokeResetBtn) {
    strokeResetBtn.addEventListener('click', () => {
      applyStrokeToSvg(null);
      syncDotHighlight('mlStrokeDots', null);
      const picker = document.getElementById('mlStrokePicker');
      if (picker) picker.value = '#FFFFFF';
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

  // Resolve CSS target: __root__ targets the SVG element itself
  const cssTarget = selector === '__root__' ? 'svg' : selector;

  // Preview always uses simple loop selector (animation is always visible)
  if (forPreview) {
    css += `#${containerId} ${cssTarget} {\n`;
    css += `  animation: ${name} ${dur}ms ${easing} infinite;\n`;
    css += `}\n\n`;
    return css;
  }

  // Export: build rule based on trigger mode
  if (trigger === 'hover') {
    css += `#${containerId}:hover ${cssTarget} {\n`;
    css += `  animation: ${name} ${dur}ms ${easing} infinite;\n`;
    css += `}\n\n`;
  } else if (trigger === 'loop') {
    css += `#${containerId} ${cssTarget} {\n`;
    css += `  animation: ${name} ${dur}ms ${easing} infinite;\n`;
    css += `}\n\n`;
  } else if (trigger === 'click') {
    css += `#${containerId}.ml--active ${cssTarget} {\n`;
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
  if (scPct !== 0 || roDeg !== 0) {
    const sc = 1 + scPct / 100;
    const parts = [];
    if (scPct !== 0) parts.push(`scale(${sc})`);
    if (roDeg !== 0) parts.push(`rotate(${roDeg}deg)`);
    staticRules.push(`  transform: ${parts.join(' ')};`);
    staticRules.push(`  transform-origin: center;`);
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

  return css;
}

/**
 * Rewrite CSS selectors for self-contained SVG export.
 * Maps #mlPreview targets to #animated-icon (the SVG root itself).
 */
function rewriteForStandalone(css) {
  return css
    .replace(/#mlPreview:hover\s+svg\b/g,      '#animated-icon:hover')
    .replace(/#mlPreview\.ml--active\s+svg\b/g, '#animated-icon.active')
    .replace(/#mlPreview\s+svg\b/g,             '#animated-icon');
}

/**
 * Rewrite CSS selectors for external CSS export.
 * Maps #mlPreview to a user-friendly container id.
 */
function rewriteForExternal(css) {
  return css
    .replace(/#mlPreview:hover\s+/g,      '#icon-container:hover ')
    .replace(/#mlPreview\.ml--active\s+/g, '#icon-container.active ')
    .replace(/#mlPreview\s+/g,            '#icon-container ');
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
  const hasAnimation = css.trim().length > 0;

  // If user explicitly stopped playback and this is NOT a play/preset action,
  // strip animation CSS so icon stays still.
  if (motionLab.isStopped && !forcePlay) {
    const baseCSS = `#mlPreview svg { transform-origin: center; }\n#mlPreview svg * { transform-box: fill-box; transform-origin: center; }\n`;
    styleEl.textContent = baseCSS;
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

  // Add transform-origin for smooth scale/rotate (both root and children)
  const baseCSS = `#mlPreview svg { transform-origin: center; }\n#mlPreview svg * { transform-box: fill-box; transform-origin: center; }\n`;
  styleEl.textContent = baseCSS + css;

  // Sync the stop/play button to reflect animation state
  const playBtn = document.getElementById('mlPlayBtn');
  if (playBtn) {
    const icon = playBtn.querySelector('.material-symbols-outlined');
    if (hasAnimation) {
      motionLab.isStopped = false;
      if (icon) icon.textContent = 'stop';
      playBtn.classList.remove('ml__play-btn--active');
    } else {
      motionLab.isStopped = true;
      if (icon) icon.textContent = 'play_arrow';
      playBtn.classList.add('ml__play-btn--active');
    }
  }

  // Apply non-scaling-stroke if any animation track uses scale transforms.
  // This prevents Pulse/Pop from bloating stroke-width on fill-based icons.
  if (svgEl) {
    const usesScale = Object.values(motionLab.tracks).some(track =>
      track.keyframes?.some(kf => {
        const t = kf.props?.transform;
        return t && /scale\(/.test(t);
      })
    );
    const shapes = svgEl.querySelectorAll('path,circle,rect,line,polyline,polygon,ellipse');
    if (usesScale) {
      shapes.forEach(el => { el.setAttribute('vector-effect', 'non-scaling-stroke'); });
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
      motionLab.tracks = {};
      motionLab.activePreset = null;
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

      // Deselect all preset buttons
      document.querySelectorAll('.ml__preset-btn').forEach(b => b.classList.remove('active'));

      // Remove injected animation CSS
      const styleEl = document.getElementById('mlAnimStyle');
      if (styleEl) styleEl.textContent = '';

      // Clear inline animation overrides on SVG
      const svgEl = document.querySelector('#mlPreview svg');
      if (svgEl) {
        svgEl.style.animation = '';
        svgEl.style.transform = '';
        svgEl.style.opacity = '';
        svgEl.querySelectorAll('*').forEach(el => {
          el.style.animation = '';
          el.style.transform = '';
          el.style.opacity = '';
        });
      }

      // Sync stop button to play_arrow (no animation active)
      motionLab.isStopped = true;
      const playBtn = document.getElementById('mlPlayBtn');
      if (playBtn) {
        const icon = playBtn.querySelector('.material-symbols-outlined');
        if (icon) icon.textContent = 'play_arrow';
        playBtn.classList.add('ml__play-btn--active');
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
      const styleEl = document.getElementById('mlAnimStyle');
      const icon = playBtn.querySelector('.material-symbols-outlined');

      if (motionLab.isStopped) {
        // Resume: re-inject CSS
        motionLab.isStopped = false;
        generateAndInjectCSS({ forcePlay: true });
        if (icon) icon.textContent = 'stop';
        playBtn.classList.remove('ml__play-btn--active');
      } else {
        // Stop: strip all animation CSS
        motionLab.isStopped = true;
        if (styleEl) styleEl.textContent = '';
        // Also clear inline animation-play-state on all SVG elements
        const svgEl = document.querySelector('#mlPreview svg');
        if (svgEl) {
          svgEl.style.animation = 'none';
          svgEl.querySelectorAll('*').forEach(el => { el.style.animation = 'none'; });
        }
        if (icon) icon.textContent = 'play_arrow';
        playBtn.classList.add('ml__play-btn--active');
      }
    });
  }

  // ── Export CSS button ─────────────────────────────────────────
  const exportBtn = document.getElementById('mlExportBtn');
  if (exportBtn) {
    exportBtn.addEventListener('click', showExportModal);
  }

  // ── Download SVG button ──────────────────────────────────────
  const downloadBtn = document.getElementById('mlDownloadBtn');
  if (downloadBtn) {
    downloadBtn.addEventListener('click', () => {
      const svgEl = document.getElementById('mlPreview')?.querySelector('svg');
      if (!svgEl) { showToast('Load an SVG first'); return; }
      const svgClone = svgEl.cloneNode(true);
      svgClone.id = 'animated-icon';
      // Strip inline live-preview artifacts from clone
      cleanSvgClone(svgClone);
      // Generate CSS and rewrite selectors for standalone SVG
      const css = rewriteForStandalone(generateFullCSS());
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

    // Hover preview: temporarily apply preset on hover
    controlBar.addEventListener('mouseover', (e) => {
      const btn = e.target.closest('[data-preset]');
      if (!btn || motionLab.selectedIds.size === 0) return;
      if (!savedTracks) {
        savedTracks = JSON.parse(JSON.stringify(motionLab.tracks));
        savedActivePreset = motionLab.activePreset;
      }
      applyPreset(btn.dataset.preset, true);
    });

    controlBar.addEventListener('mouseout', (e) => {
      const btn = e.target.closest('[data-preset]');
      if (!btn) return;
      if (savedTracks !== null) {
        motionLab.tracks = savedTracks;
        motionLab.activePreset = savedActivePreset;
        savedTracks = null;
        savedActivePreset = null;
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

      const presetName = btn.dataset.preset;
      const isActive = btn.classList.contains('active');

      // Deselect all preset buttons
      controlBar.querySelectorAll('.ml__preset-btn').forEach(b => b.classList.remove('active'));

      if (isActive) {
        // Toggle off: clear tracks and reset
        motionLab.activePreset = null;
        motionLab.tracks = {};
        generateAndInjectCSS();
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
      // Target SVG root so opacity applies to entire icon uniformly
      const svgRoot = document.querySelector('#mlPreview svg');
      if (svgRoot) svgRoot.style.opacity = String(v);
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
  // Always target SVG root so all paths transform as a unit
  const svgRoot = document.querySelector('#mlPreview svg');
  if (!svgRoot) return;
  svgRoot.style.transform = `scale(${sc}) rotate(${ro}deg)`;
  svgRoot.style.transformBox = 'fill-box';
  svgRoot.style.transformOrigin = 'center';

  // Apply non-scaling-stroke to keep stroke width constant under scale
  const shapes = svgRoot.querySelectorAll('path,circle,rect,line,polyline,polygon,ellipse');
  if (sc !== 1) {
    shapes.forEach(el => { el.setAttribute('vector-effect', 'non-scaling-stroke'); });
  } else {
    shapes.forEach(el => { el.removeAttribute('vector-effect'); });
  }
}

// ---- Preset Engine ----------------------------------------

const PRESETS = {
  pulse: {
    keyframes: [
      { offset: 0,    props: { transform: 'scale(1)', opacity: '1' } },
      { offset: 0.5,  props: { transform: 'scale(1.15)', opacity: '1' } },
      { offset: 1,    props: { transform: 'scale(1)', opacity: '1' } },
    ],
    easing: 'ease-in-out',
    // Which numeric values get scaled by intensity (from 1.15 → scaled)
    intensityTarget: { prop: 'transform', pattern: /scale\(([^)]+)\)/, base: 1, range: 0.15 },
  },
  bounce: {
    keyframes: [
      { offset: 0,    props: { transform: 'translateY(0px)' } },
      { offset: 0.4,  props: { transform: 'translateY(-6px)' } },
      { offset: 0.65, props: { transform: 'translateY(-2px)' } },
      { offset: 0.8,  props: { transform: 'translateY(-4px)' } },
      { offset: 1,    props: { transform: 'translateY(0px)' } },
    ],
    easing: 'ease-out',
  },
  spin: {
    keyframes: [
      { offset: 0, props: { transform: 'rotate(0deg)' } },
      { offset: 1, props: { transform: 'rotate(360deg)' } },
    ],
    easing: 'linear',
  },
  shake: {
    keyframes: [
      { offset: 0,    props: { transform: 'translateX(0px)' } },
      { offset: 0.15, props: { transform: 'translateX(-3px)' } },
      { offset: 0.30, props: { transform: 'translateX(3px)' } },
      { offset: 0.45, props: { transform: 'translateX(-3px)' } },
      { offset: 0.60, props: { transform: 'translateX(3px)' } },
      { offset: 0.75, props: { transform: 'translateX(-2px)' } },
      { offset: 1,    props: { transform: 'translateX(0px)' } },
    ],
    easing: 'ease-out',
  },
  float: {
    keyframes: [
      { offset: 0,   props: { transform: 'translateY(0px)' } },
      { offset: 0.5, props: { transform: 'translateY(-4px)' } },
      { offset: 1,   props: { transform: 'translateY(0px)' } },
    ],
    easing: 'ease-in-out',
  },
  pop: {
    keyframes: [
      { offset: 0,    props: { transform: 'scale(0.85)' } },
      { offset: 0.55, props: { transform: 'scale(1.1)' } },
      { offset: 0.75, props: { transform: 'scale(0.97)' } },
      { offset: 1,    props: { transform: 'scale(1)' } },
    ],
    easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
  fade: {
    keyframes: [
      { offset: 0, props: { opacity: '0' } },
      { offset: 1, props: { opacity: '1' } },
    ],
    easing: 'ease-in-out',
  },
  // ── Starter customs (Saved quadrant) ──────────────────────────
  sparkle: {
    keyframes: [
      { offset: 0,   props: { filter: 'drop-shadow(0 0 0px transparent)', opacity: '1' } },
      { offset: 0.5, props: { filter: 'drop-shadow(0 0 6px rgba(255,215,0,0.8))', opacity: '0.85' } },
      { offset: 1,   props: { filter: 'drop-shadow(0 0 0px transparent)', opacity: '1' } },
    ],
    easing: 'ease-in-out',
  },
  swing: {
    keyframes: [
      { offset: 0,    props: { transform: 'rotate(0deg)' } },
      { offset: 0.25, props: { transform: 'rotate(15deg)' } },
      { offset: 0.75, props: { transform: 'rotate(-15deg)' } },
      { offset: 1,    props: { transform: 'rotate(0deg)' } },
    ],
    easing: 'ease-in-out',
  },
  jitter: {
    keyframes: [
      { offset: 0,   props: { transform: 'translate(0px, 0px)' } },
      { offset: 0.2, props: { transform: 'translate(2px, -2px)' } },
      { offset: 0.4, props: { transform: 'translate(-2px, 2px)' } },
      { offset: 0.6, props: { transform: 'translate(2px, 2px)' } },
      { offset: 0.8, props: { transform: 'translate(-2px, -2px)' } },
      { offset: 1,   props: { transform: 'translate(0px, 0px)' } },
    ],
    easing: 'linear',
  },

  // ── New Motion presets (NextGen physics-derived) ───────────────
  heartbeat: {
    keyframes: [
      { offset: 0,    props: { transform: 'scale(1)' } },
      { offset: 0.14, props: { transform: 'scale(1.18)' } },
      { offset: 0.28, props: { transform: 'scale(1)' } },
      { offset: 0.42, props: { transform: 'scale(1.12)' } },
      { offset: 0.56, props: { transform: 'scale(1)' } },
      { offset: 1,    props: { transform: 'scale(1)' } },
    ],
    easing: 'ease-in-out',
  },
  rubberband: {
    keyframes: [
      { offset: 0,   props: { transform: 'scale(1)' } },
      { offset: 0.3, props: { transform: 'scale(1.2)' } },
      { offset: 0.5, props: { transform: 'scale(0.9)' } },
      { offset: 0.7, props: { transform: 'scale(1.05)' } },
      { offset: 1,   props: { transform: 'scale(1)' } },
    ],
    easing: 'cubic-bezier(0.68, -0.55, 0.27, 1.55)',
  },
  jelly: {
    keyframes: [
      { offset: 0,    props: { transform: 'scale(1)' } },
      { offset: 0.15, props: { transform: 'scale(0.92)' } },
      { offset: 0.30, props: { transform: 'scale(1.06)' } },
      { offset: 0.45, props: { transform: 'scale(0.96)' } },
      { offset: 0.60, props: { transform: 'scale(1.02)' } },
      { offset: 0.75, props: { transform: 'scale(0.99)' } },
      { offset: 1,    props: { transform: 'scale(1)' } },
    ],
    easing: 'linear',
  },
  ring: {
    keyframes: [
      { offset: 0,   props: { transform: 'rotate(0deg)' } },
      { offset: 0.1, props: { transform: 'rotate(18deg)' } },
      { offset: 0.2, props: { transform: 'rotate(-15deg)' } },
      { offset: 0.3, props: { transform: 'rotate(12deg)' } },
      { offset: 0.4, props: { transform: 'rotate(-9deg)' } },
      { offset: 0.5, props: { transform: 'rotate(5deg)' } },
      { offset: 0.6, props: { transform: 'rotate(-2deg)' } },
      { offset: 0.7, props: { transform: 'rotate(0deg)' } },
      { offset: 1,   props: { transform: 'rotate(0deg)' } },
    ],
    easing: 'ease-out',
  },
  wobble: {
    keyframes: [
      { offset: 0,    props: { transform: 'rotate(0deg) translateX(0px)' } },
      { offset: 0.15, props: { transform: 'rotate(-6deg) translateX(-3px)' } },
      { offset: 0.30, props: { transform: 'rotate(5deg) translateX(2px)' } },
      { offset: 0.45, props: { transform: 'rotate(-3deg) translateX(-1px)' } },
      { offset: 0.60, props: { transform: 'rotate(2deg) translateX(1px)' } },
      { offset: 0.75, props: { transform: 'rotate(-1deg) translateX(0px)' } },
      { offset: 1,    props: { transform: 'rotate(0deg) translateX(0px)' } },
    ],
    easing: 'ease-in-out',
  },
  magnetic: {
    keyframes: [
      { offset: 0,   props: { transform: 'translate(0px, 0px) scale(1)' } },
      { offset: 0.3, props: { transform: 'translate(3px, -3px) scale(1.08)' } },
      { offset: 0.5, props: { transform: 'translate(4px, -4px) scale(1.12)' } },
      { offset: 0.7, props: { transform: 'translate(1px, -1px) scale(1.03)' } },
      { offset: 1,   props: { transform: 'translate(0px, 0px) scale(1)' } },
    ],
    easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  },
  recoil: {
    keyframes: [
      { offset: 0,    props: { transform: 'scale(1) rotate(0deg)' } },
      { offset: 0.15, props: { transform: 'scale(0.85) rotate(-3deg)' } },
      { offset: 0.40, props: { transform: 'scale(1.2) rotate(2deg)' } },
      { offset: 0.60, props: { transform: 'scale(0.97) rotate(-1deg)' } },
      { offset: 0.80, props: { transform: 'scale(1.03) rotate(0deg)' } },
      { offset: 1,    props: { transform: 'scale(1) rotate(0deg)' } },
    ],
    easing: 'ease-out',
  },
  pendulum: {
    keyframes: [
      { offset: 0,    props: { transform: 'rotate(0deg)' } },
      { offset: 0.25, props: { transform: 'rotate(20deg)' } },
      { offset: 0.5,  props: { transform: 'rotate(0deg)' } },
      { offset: 0.75, props: { transform: 'rotate(-20deg)' } },
      { offset: 1,    props: { transform: 'rotate(0deg)' } },
    ],
    easing: 'ease-in-out',
  },
  whiplash: {
    keyframes: [
      { offset: 0,   props: { transform: 'rotate(0deg)' } },
      { offset: 0.2, props: { transform: 'rotate(-12deg)' } },
      { offset: 0.4, props: { transform: 'rotate(8deg)' } },
      { offset: 0.6, props: { transform: 'rotate(-4deg)' } },
      { offset: 0.8, props: { transform: 'rotate(2deg)' } },
      { offset: 1,   props: { transform: 'rotate(0deg)' } },
    ],
    easing: 'cubic-bezier(0.68, -0.55, 0.27, 1.55)',
  },
  tremor: {
    keyframes: [
      { offset: 0,   props: { transform: 'translate(0px, 0px)' } },
      { offset: 0.1, props: { transform: 'translate(-2px, 1px)' } },
      { offset: 0.2, props: { transform: 'translate(1px, -2px)' } },
      { offset: 0.3, props: { transform: 'translate(-1px, 0px)' } },
      { offset: 0.4, props: { transform: 'translate(2px, 1px)' } },
      { offset: 0.5, props: { transform: 'translate(-1px, -1px)' } },
      { offset: 0.6, props: { transform: 'translate(0px, 2px)' } },
      { offset: 0.7, props: { transform: 'translate(1px, -1px)' } },
      { offset: 0.8, props: { transform: 'translate(-2px, 0px)' } },
      { offset: 0.9, props: { transform: 'translate(1px, 1px)' } },
      { offset: 1,   props: { transform: 'translate(0px, 0px)' } },
    ],
    easing: 'linear',
  },
  neonglow: {
    keyframes: [
      { offset: 0,   props: { filter: 'drop-shadow(0 0 1px rgba(34,211,238,0.6))', opacity: '1' } },
      { offset: 0.5, props: { filter: 'drop-shadow(0 0 8px rgba(34,211,238,0.9)) drop-shadow(0 0 16px rgba(34,211,238,0.4))', opacity: '1' } },
      { offset: 1,   props: { filter: 'drop-shadow(0 0 1px rgba(34,211,238,0.6))', opacity: '1' } },
    ],
    easing: 'ease-in-out',
  },
  breathe: {
    keyframes: [
      { offset: 0,   props: { transform: 'scale(1)', opacity: '1' } },
      { offset: 0.5, props: { transform: 'scale(1.06)', opacity: '0.85' } },
      { offset: 1,   props: { transform: 'scale(1)', opacity: '1' } },
    ],
    easing: 'ease-in-out',
  },
  metronome: {
    keyframes: [
      { offset: 0,    props: { transform: 'rotate(0deg)' } },
      { offset: 0.25, props: { transform: 'rotate(15deg)' } },
      { offset: 0.5,  props: { transform: 'rotate(0deg)' } },
      { offset: 0.75, props: { transform: 'rotate(-15deg)' } },
      { offset: 1,    props: { transform: 'rotate(0deg)' } },
    ],
    easing: 'ease-in-out',
  },

  // ── Entrance presets ──────────────────────────────────────────
  fadeIn: {
    keyframes: [
      { offset: 0, props: { opacity: '0' } },
      { offset: 1, props: { opacity: '1' } },
    ],
    easing: 'ease-in-out',
  },
  scaleUp: {
    keyframes: [
      { offset: 0,   props: { transform: 'scale(0)', opacity: '0' } },
      { offset: 0.6, props: { transform: 'scale(1.05)', opacity: '1' } },
      { offset: 1,   props: { transform: 'scale(1)', opacity: '1' } },
    ],
    easing: 'ease-out',
  },
  slideUp: {
    keyframes: [
      { offset: 0, props: { transform: 'translateY(20px)', opacity: '0' } },
      { offset: 1, props: { transform: 'translateY(0px)', opacity: '1' } },
    ],
    easing: 'ease-out',
  },
  springLand: {
    keyframes: [
      { offset: 0,   props: { transform: 'translateY(-20px) scale(0.8)', opacity: '0' } },
      { offset: 0.5, props: { transform: 'translateY(3px) scale(1.05)', opacity: '1' } },
      { offset: 0.7, props: { transform: 'translateY(-2px) scale(0.98)', opacity: '1' } },
      { offset: 1,   props: { transform: 'translateY(0px) scale(1)', opacity: '1' } },
    ],
    easing: 'cubic-bezier(0.68, -0.55, 0.27, 1.55)',
  },
  slingshot: {
    keyframes: [
      { offset: 0,   props: { transform: 'translateX(-30px) scale(0.7)', opacity: '0' } },
      { offset: 0.4, props: { transform: 'translateX(5px) scale(1.1)', opacity: '1' } },
      { offset: 0.6, props: { transform: 'translateX(-2px) scale(0.98)', opacity: '1' } },
      { offset: 1,   props: { transform: 'translateX(0px) scale(1)', opacity: '1' } },
    ],
    easing: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  },
  glitchOn: {
    keyframes: [
      { offset: 0,    props: { transform: 'translateX(0px)', opacity: '0' } },
      { offset: 0.15, props: { transform: 'translateX(-3px)', opacity: '0.6' } },
      { offset: 0.30, props: { transform: 'translateX(2px)', opacity: '0.3' } },
      { offset: 0.45, props: { transform: 'translateX(-1px)', opacity: '0.8' } },
      { offset: 0.60, props: { transform: 'translateX(1px)', opacity: '0.5' } },
      { offset: 0.75, props: { transform: 'translateX(0px)', opacity: '0.9' } },
      { offset: 1,    props: { transform: 'translateX(0px)', opacity: '1' } },
    ],
    easing: 'linear',
  },
  unfold: {
    keyframes: [
      { offset: 0,   props: { transform: 'scale(1) translateY(10px)', opacity: '0' } },
      { offset: 0.6, props: { transform: 'scale(1) translateY(-2px)', opacity: '1' } },
      { offset: 0.8, props: { transform: 'scale(1) translateY(1px)', opacity: '1' } },
      { offset: 1,   props: { transform: 'scale(1) translateY(0px)', opacity: '1' } },
    ],
    easing: 'ease-out',
  },
  warpIn: {
    keyframes: [
      { offset: 0,   props: { transform: 'scale(3) rotate(15deg)', opacity: '0' } },
      { offset: 0.6, props: { transform: 'scale(0.95) rotate(-2deg)', opacity: '1' } },
      { offset: 0.8, props: { transform: 'scale(1.03) rotate(1deg)', opacity: '1' } },
      { offset: 1,   props: { transform: 'scale(1) rotate(0deg)', opacity: '1' } },
    ],
    easing: 'ease-out',
  },

  // ── Exit presets ──────────────────────────────────────────────
  fadeOut: {
    keyframes: [
      { offset: 0, props: { opacity: '1' } },
      { offset: 1, props: { opacity: '0' } },
    ],
    easing: 'ease-in-out',
  },
  scaleDown: {
    keyframes: [
      { offset: 0, props: { transform: 'scale(1)', opacity: '1' } },
      { offset: 1, props: { transform: 'scale(0)', opacity: '0' } },
    ],
    easing: 'ease-in',
  },
  slideOut: {
    keyframes: [
      { offset: 0, props: { transform: 'translateY(0px)', opacity: '1' } },
      { offset: 1, props: { transform: 'translateY(-20px)', opacity: '0' } },
    ],
    easing: 'ease-in',
  },
  vortex: {
    keyframes: [
      { offset: 0, props: { transform: 'scale(1) rotate(0deg)', opacity: '1' } },
      { offset: 1, props: { transform: 'scale(0) rotate(540deg)', opacity: '0' } },
    ],
    easing: 'ease-in',
  },
  glitchOff: {
    keyframes: [
      { offset: 0,   props: { transform: 'translateX(0px)', opacity: '1' } },
      { offset: 0.2, props: { transform: 'translateX(2px)', opacity: '0.8' } },
      { offset: 0.4, props: { transform: 'translateX(-3px)', opacity: '0.5' } },
      { offset: 0.6, props: { transform: 'translateX(1px)', opacity: '0.3' } },
      { offset: 0.8, props: { transform: 'translateX(-1px)', opacity: '0.15' } },
      { offset: 1,   props: { transform: 'translateX(0px)', opacity: '0' } },
    ],
    easing: 'linear',
  },
  dissolve: {
    keyframes: [
      { offset: 0, props: { transform: 'scale(1)', opacity: '1' } },
      { offset: 1, props: { transform: 'scale(1.3)', opacity: '0' } },
    ],
    easing: 'ease-in',
  },

  // ── Phase 2: Additional Motion presets ─────────────────────────
  orbit: {
    keyframes: [
      { offset: 0,    props: { transform: 'translate(3px, 0px)' } },
      { offset: 0.25, props: { transform: 'translate(0px, 3px)' } },
      { offset: 0.5,  props: { transform: 'translate(-3px, 0px)' } },
      { offset: 0.75, props: { transform: 'translate(0px, -3px)' } },
      { offset: 1,    props: { transform: 'translate(3px, 0px)' } },
    ],
    easing: 'linear',
  },
  flicker: {
    keyframes: [
      { offset: 0,    props: { opacity: '1' } },
      { offset: 0.15, props: { opacity: '0.4' } },
      { offset: 0.3,  props: { opacity: '1' } },
      { offset: 0.5,  props: { opacity: '0.2' } },
      { offset: 0.7,  props: { opacity: '0.8' } },
      { offset: 0.85, props: { opacity: '0.3' } },
      { offset: 1,    props: { opacity: '1' } },
    ],
    easing: 'linear',
  },
  squish: {
    keyframes: [
      { offset: 0,    props: { transform: 'scale(1)' } },
      { offset: 0.25, props: { transform: 'scale(1.15)' } },
      { offset: 0.5,  props: { transform: 'scale(1)' } },
      { offset: 0.75, props: { transform: 'scale(0.85)' } },
      { offset: 1,    props: { transform: 'scale(1)' } },
    ],
    easing: 'ease-in-out',
  },
  glide: {
    keyframes: [
      { offset: 0,    props: { transform: 'translateX(0px) rotate(0deg)' } },
      { offset: 0.25, props: { transform: 'translateX(4px) rotate(2deg)' } },
      { offset: 0.5,  props: { transform: 'translateX(0px) rotate(0deg)' } },
      { offset: 0.75, props: { transform: 'translateX(-4px) rotate(-2deg)' } },
      { offset: 1,    props: { transform: 'translateX(0px) rotate(0deg)' } },
    ],
    easing: 'ease-in-out',
  },

  // ── Phase 2: Additional Entrance presets ──────────────────────
  slideRight: {
    keyframes: [
      { offset: 0, props: { transform: 'translateX(-20px)', opacity: '0' } },
      { offset: 1, props: { transform: 'translateX(0px)', opacity: '1' } },
    ],
    easing: 'ease-out',
  },
  slideDown: {
    keyframes: [
      { offset: 0, props: { transform: 'translateY(-20px)', opacity: '0' } },
      { offset: 1, props: { transform: 'translateY(0px)', opacity: '1' } },
    ],
    easing: 'ease-out',
  },
  flipIn: {
    keyframes: [
      { offset: 0,   props: { transform: 'rotate(90deg)', opacity: '0' } },
      { offset: 0.6, props: { transform: 'rotate(-5deg)', opacity: '1' } },
      { offset: 0.8, props: { transform: 'rotate(2deg)', opacity: '1' } },
      { offset: 1,   props: { transform: 'rotate(0deg)', opacity: '1' } },
    ],
    easing: 'ease-out',
  },
  telegram: {
    keyframes: [
      { offset: 0,   props: { transform: 'translate(-30px, 15px) rotate(-25deg)', opacity: '0' } },
      { offset: 0.5, props: { transform: 'translate(3px, -2px) rotate(3deg)', opacity: '1' } },
      { offset: 0.7, props: { transform: 'translate(-1px, 1px) rotate(-1deg)', opacity: '1' } },
      { offset: 1,   props: { transform: 'translate(0px, 0px) rotate(0deg)', opacity: '1' } },
    ],
    easing: 'ease-out',
  },
  bloom: {
    keyframes: [
      { offset: 0,   props: { transform: 'scale(0) rotate(-90deg)', opacity: '0' } },
      { offset: 0.5, props: { transform: 'scale(1.1) rotate(10deg)', opacity: '1' } },
      { offset: 0.7, props: { transform: 'scale(0.95) rotate(-3deg)', opacity: '1' } },
      { offset: 1,   props: { transform: 'scale(1) rotate(0deg)', opacity: '1' } },
    ],
    easing: 'ease-out',
  },
  shockwave: {
    keyframes: [
      { offset: 0,   props: { transform: 'scale(0.3)', opacity: '0' } },
      { offset: 0.3, props: { transform: 'scale(1.25)', opacity: '1' } },
      { offset: 0.5, props: { transform: 'scale(0.92)', opacity: '1' } },
      { offset: 0.7, props: { transform: 'scale(1.05)', opacity: '1' } },
      { offset: 1,   props: { transform: 'scale(1)', opacity: '1' } },
    ],
    easing: 'ease-out',
  },

  // ── Phase 2: Additional Exit presets ──────────────────────────
  popOut: {
    keyframes: [
      { offset: 0,   props: { transform: 'scale(1)', opacity: '1' } },
      { offset: 0.3, props: { transform: 'scale(1.15)', opacity: '1' } },
      { offset: 1,   props: { transform: 'scale(0)', opacity: '0' } },
    ],
    easing: 'cubic-bezier(0.55, 0.06, 0.68, 0.19)',
  },
  slideLeft: {
    keyframes: [
      { offset: 0, props: { transform: 'translateX(0px)', opacity: '1' } },
      { offset: 1, props: { transform: 'translateX(-20px)', opacity: '0' } },
    ],
    easing: 'ease-in',
  },
  sinkDown: {
    keyframes: [
      { offset: 0,   props: { transform: 'translateY(0px) scale(1)', opacity: '1' } },
      { offset: 0.6, props: { transform: 'translateY(4px) scale(0.9)', opacity: '0.7' } },
      { offset: 1,   props: { transform: 'translateY(15px) scale(0.6)', opacity: '0' } },
    ],
    easing: 'ease-in',
  },
  flipOut: {
    keyframes: [
      { offset: 0,   props: { transform: 'rotate(0deg)', opacity: '1' } },
      { offset: 0.3, props: { transform: 'rotate(-5deg)', opacity: '1' } },
      { offset: 1,   props: { transform: 'rotate(90deg)', opacity: '0' } },
    ],
    easing: 'ease-in',
  },
  implode: {
    keyframes: [
      { offset: 0,   props: { transform: 'scale(1)', opacity: '1' } },
      { offset: 0.3, props: { transform: 'scale(1.1)', opacity: '1' } },
      { offset: 1,   props: { transform: 'scale(0)', opacity: '0' } },
    ],
    easing: 'ease-in',
  },
  puffOut: {
    keyframes: [
      { offset: 0,   props: { transform: 'scale(1)', opacity: '1' } },
      { offset: 0.5, props: { transform: 'scale(1.15)', opacity: '0.6' } },
      { offset: 1,   props: { transform: 'scale(1.5)', opacity: '0' } },
    ],
    easing: 'ease-out',
  },
  launchOut: {
    keyframes: [
      { offset: 0, props: { transform: 'translate(0px, 0px) rotate(0deg)', opacity: '1' } },
      { offset: 1, props: { transform: 'translate(30px, -15px) rotate(25deg)', opacity: '0' } },
    ],
    easing: 'ease-in',
  },
  shrinkSpin: {
    keyframes: [
      { offset: 0, props: { transform: 'scale(1) rotate(0deg)', opacity: '1' } },
      { offset: 1, props: { transform: 'scale(0) rotate(360deg)', opacity: '0' } },
    ],
    easing: 'ease-in',
  },
  blinkOut: {
    keyframes: [
      { offset: 0,    props: { opacity: '1' } },
      { offset: 0.15, props: { opacity: '0.3' } },
      { offset: 0.3,  props: { opacity: '0.8' } },
      { offset: 0.45, props: { opacity: '0.1' } },
      { offset: 0.6,  props: { opacity: '0.6' } },
      { offset: 0.75, props: { opacity: '0.15' } },
      { offset: 1,    props: { opacity: '0' } },
    ],
    easing: 'linear',
  },
};

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

function applyPreset(presetName, silent = false) {
  const preset = PRESETS[presetName];
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
  const preset = PRESETS[presetName];
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

function showExportModal() {
  const rawCSS = generateFullCSS();
  // CSS tab: rewrite for external use with user-friendly container id
  const cleanCSS = rawCSS
    ? rewriteForExternal(rawCSS) + '/* Usage: <div id="icon-container"><svg>...</svg></div> */\n'
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
    const standaloneCSS = rewriteForStandalone(generateFullCSS());
    const styleTag = document.createElementNS('http://www.w3.org/2000/svg', 'style');
    styleTag.textContent = standaloneCSS;
    svgClone.insertBefore(styleTag, svgClone.firstChild);
    svgExport = svgClone.outerHTML;
  }

  // Remove existing modal
  document.getElementById('mlExportModal')?.remove();

  const modal = document.createElement('div');
  modal.id = 'mlExportModal';
  modal.className = 'ml-modal';
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
        <div class="ml-modal__tab-content" id="mlTabCss">
          <pre class="ml-modal__code" id="mlCssOutput">${escapeHtml(cleanCSS)}</pre>
          <div class="ml-modal__actions">
            <button class="ml-modal__action-btn" id="mlCopyCss">
              <span class="material-symbols-outlined" style="font-size:16px">content_copy</span> Copy CSS
            </button>
            <button class="ml-modal__action-btn" id="mlDownloadCss">
              <span class="material-symbols-outlined" style="font-size:16px">download</span> Download .css
            </button>
          </div>
        </div>
        <div class="ml-modal__tab-content" id="mlTabSvg" style="display:none">
          <pre class="ml-modal__code" id="mlSvgOutput">${escapeHtml(svgExport || '<!-- Load an SVG first -->')}</pre>
          <div class="ml-modal__actions">
            <button class="ml-modal__action-btn" id="mlCopySvg">
              <span class="material-symbols-outlined" style="font-size:16px">content_copy</span> Copy SVG
            </button>
            <button class="ml-modal__action-btn" id="mlDownloadSvg">
              <span class="material-symbols-outlined" style="font-size:16px">download</span> Download .svg
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  // Tab switching
  modal.querySelectorAll('.ml-modal__tab').forEach(tab => {
    tab.addEventListener('click', () => {
      modal.querySelectorAll('.ml-modal__tab').forEach(t => t.classList.remove('ml-modal__tab--active'));
      tab.classList.add('ml-modal__tab--active');
      document.getElementById('mlTabCss').style.display = tab.dataset.tab === 'css' ? '' : 'none';
      document.getElementById('mlTabSvg').style.display = tab.dataset.tab === 'svg' ? '' : 'none';
    });
  });

  // Close
  modal.querySelector('#mlModalClose').addEventListener('click', () => modal.remove());
  modal.querySelector('.ml-modal__backdrop').addEventListener('click', () => modal.remove());

  // Copy CSS
  modal.querySelector('#mlCopyCss')?.addEventListener('click', () => {
    navigator.clipboard.writeText(cleanCSS).then(() => showToast('CSS copied!'));
  });

  // Download CSS
  modal.querySelector('#mlDownloadCss')?.addEventListener('click', () => {
    downloadFile('animation.css', cleanCSS, 'text/css');
  });

  // Copy SVG
  modal.querySelector('#mlCopySvg')?.addEventListener('click', () => {
    navigator.clipboard.writeText(svgExport).then(() => showToast('SVG copied!'));
  });

  // Download SVG
  modal.querySelector('#mlDownloadSvg')?.addEventListener('click', () => {
    downloadFile('animated-icon.svg', svgExport, 'image/svg+xml');
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
  // PNG→SVG options
  threshold: 128,
  preset: 'posterized2', // imagetracerjs preset
  colorMode: 'mono',
  smoothness: 50,        // 0-100: curve smoothness (trace resolution + path tolerance)
};

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
          <img class="conv__preview-img" id="convInputImg" alt="Input">
          <div class="conv__input-meta" id="convInputMeta"></div>
          <button class="conv__clear-btn" id="convClearBtn">
            <span class="material-symbols-outlined" style="font-size:16px">close</span>
          </button>
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
          <div class="conv__checker" id="convChecker">
            <img class="conv__preview-img" id="convOutputImg" alt="Output">
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
          <label class="conv__opt-label">Preset <span class="conv__tip-icon" data-tip="Controls tracing complexity. Simple produces clean 2-color paths (best for logos/icons). Balanced uses 16 colors with good detail. Detailed preserves fine edges with 32 colors.">?</span></label>
          <div class="conv__bg-options">
            <label class="conv__radio"><input type="radio" name="convPreset" value="posterized2" checked> Simple</label>
            <label class="conv__radio"><input type="radio" name="convPreset" value="default"> Balanced</label>
            <label class="conv__radio"><input type="radio" name="convPreset" value="detailed"> Detailed</label>
          </div>
        </div>
        <div class="conv__opt-row">
          <label class="conv__opt-label">Color Mode <span class="conv__tip-icon" data-tip="Monochrome traces the image as black paths on transparent background, best for icons. Color preserves multiple fill colors from the original image.">?</span></label>
          <div class="conv__bg-options">
            <label class="conv__radio"><input type="radio" name="convColorMode" value="mono" checked> Monochrome</label>
            <label class="conv__radio"><input type="radio" name="convColorMode" value="color"> Color</label>
          </div>
        </div>
        <div class="conv__opt-row">
          <label class="conv__opt-label">Threshold <span class="conv__tip-icon" data-tip="Controls background removal sensitivity. In Monochrome: how different a pixel must be from the background to be kept. In Color: how similar to the background a pixel must be to be removed. Higher values are more aggressive.">?</span></label>
          <div class="conv__slider-row">
            <input type="range" id="convThreshold" min="0" max="255" value="128" class="conv__slider">
            <span class="conv__slider-val" id="convThresholdVal">128</span>
          </div>
        </div>
        <div class="conv__opt-row">
          <label class="conv__opt-label">Smoothness <span class="conv__tip-icon" data-tip="Controls curve quality. Higher values produce smoother arcs and rounder shapes by tracing at higher resolution and fitting tighter Bezier curves. Use higher values for logos with curves (like arches or circles). Lower values preserve sharp pixel edges.">?</span></label>
          <div class="conv__slider-row">
            <input type="range" id="convSmoothness" min="0" max="100" value="50" class="conv__slider">
            <span class="conv__slider-val" id="convSmoothnessVal">50</span>
          </div>
        </div>
        <button class="conv__reset-btn" id="convResetPng" data-tip="Reset to defaults">
          <span class="material-symbols-outlined">restart_alt</span> Reset
        </button>
      </div>
    </div>

  `;
  gridArea.appendChild(view);
  initConverterControls();
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
  document.querySelectorAll('[name="convPreset"]').forEach(r => {
    r.addEventListener('change', e => { converterState.preset = e.target.value; runConversion(); });
  });
  document.querySelectorAll('[name="convColorMode"]').forEach(r => {
    r.addEventListener('change', e => { converterState.colorMode = e.target.value; runConversion(); });
  });
  // Threshold: update value display immediately, but debounce the expensive re-trace
  document.getElementById('convThreshold')?.addEventListener('input', e => {
    converterState.threshold = parseInt(e.target.value, 10);
    const valEl = document.getElementById('convThresholdVal');
    if (valEl) valEl.textContent = converterState.threshold;
    debouncedRunConversion();
  });
  // Also fire immediately on release (mouseup/touchend) to ensure final value is traced
  document.getElementById('convThreshold')?.addEventListener('change', () => {
    clearTimeout(window._convDebounceTimer);
    runConversion();
  });
  // Smoothness slider
  document.getElementById('convSmoothness')?.addEventListener('input', e => {
    converterState.smoothness = parseInt(e.target.value, 10);
    const valEl = document.getElementById('convSmoothnessVal');
    if (valEl) valEl.textContent = converterState.smoothness;
    debouncedRunConversion();
  });
  document.getElementById('convSmoothness')?.addEventListener('change', () => {
    clearTimeout(window._convDebounceTimer);
    runConversion();
  });

  // Reset buttons
  document.getElementById('convResetPng')?.addEventListener('click', () => {
    // Reset PNG→SVG state to defaults
    converterState.preset = 'posterized2';
    converterState.colorMode = 'mono';
    converterState.threshold = 128;
    converterState.smoothness = 50;
    // Update UI controls
    document.querySelector('[name="convPreset"][value="posterized2"]').checked = true;
    document.querySelector('[name="convColorMode"][value="mono"]').checked = true;
    const slider = document.getElementById('convThreshold');
    if (slider) slider.value = 128;
    const valEl = document.getElementById('convThresholdVal');
    if (valEl) valEl.textContent = '128';
    const smoothSlider = document.getElementById('convSmoothness');
    if (smoothSlider) smoothSlider.value = 50;
    const smoothVal = document.getElementById('convSmoothnessVal');
    if (smoothVal) smoothVal.textContent = '50';
    runConversion();
  });
  document.getElementById('convResetSvg')?.addEventListener('click', () => {
    // Reset SVG→PNG state to defaults
    converterState.size = 64;
    converterState.background = 'transparent';
    converterState.bgColor = '#ffffff';
    converterState.padding = 8;
    converterState.quality = 1;
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
    runConversion();
  });

  // Download button
  document.getElementById('convDownload')?.addEventListener('click', () => {
    if (!converterState.outputBlob) return;
    const ext = converterState.mode === 'svg-to-png' ? 'png' : 'svg';
    const url = URL.createObjectURL(converterState.outputBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `icon.${ext}`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });

  // Copy to clipboard
  document.getElementById('convCopyClipboard')?.addEventListener('click', async () => {
    if (!converterState.outputBlob) return;
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
  converterState.svgText = svgText;
  converterState.mode = 'svg-to-png';
  // Switch to SVG→PNG mode
  document.querySelectorAll('.conv__mode-tab').forEach(t => t.classList.remove('conv__mode-tab--active'));
  document.querySelector('[data-mode="svg-to-png"]')?.classList.add('conv__mode-tab--active');
  document.getElementById('convSvgOpts').style.display = '';
  document.getElementById('convPngOpts').style.display = 'none';
  document.getElementById('convDownloadLabel').textContent = 'Download PNG';
  document.getElementById('convCopyLabel').textContent = 'Copy';
  document.getElementById('convPasteBtn').style.display = '';

  // Show input preview with SVG rendered as img
  const blob = new Blob([svgText], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  showConverterInput(url, filename || 'Pasted SVG', svgText.length);
  converterState.pngDataUrl = '';
  runConversion();
}

function loadConverterPng(dataUrl, filename) {
  converterState.pngDataUrl = dataUrl;
  converterState.svgText = '';
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
}

function clearConverterInput() {
  converterState.svgText = '';
  converterState.pngDataUrl = '';
  converterState.outputBlob = null;
  converterState.outputDataUrl = '';
  document.getElementById('convDropZone').style.display = '';
  document.getElementById('convInputPreview').style.display = 'none';
  document.getElementById('convOutputPreview').style.display = 'none';
  document.getElementById('convOutputEmpty').style.display = '';
  document.getElementById('convActions').style.display = 'none';
  const fileInput = document.getElementById('convFileInput');
  if (fileInput) fileInput.value = '';
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
  const { svgText, size, background, bgColor, padding, quality } = converterState;
  const myToken = ++_svgConvToken;
  const targetSize = size * quality;

  // Parse SVG to get viewBox / intrinsic size
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgText, 'image/svg+xml');
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

  // Set explicit dimensions for rendering
  svgEl.setAttribute('width', canvasW);
  svgEl.setAttribute('height', canvasH);
  const serializer = new XMLSerializer();
  const sized = serializer.serializeToString(svgEl);

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
      converterState.outputDataUrl = outUrl;
      const displayW = Math.round(canvasW / quality);
      const displayH = Math.round(canvasH / quality);
      showConverterOutput(outUrl, `${displayW}x${displayH}${quality > 1 ? ` @${quality}x` : ''} PNG`, Math.round(pngBlob.size / 1024));
    }, 'image/png');
  };
  img.onerror = () => { URL.revokeObjectURL(url); showToast('SVG render failed'); };
  img.src = url;
}

function showConverterOutput(url, label, sizeKb) {
  const outputPreview = document.getElementById('convOutputPreview');
  const outputEmpty = document.getElementById('convOutputEmpty');
  const outputImg = document.getElementById('convOutputImg');
  const outputMeta = document.getElementById('convOutputMeta');
  const actions = document.getElementById('convActions');

  if (outputPreview) outputPreview.style.display = '';
  if (outputEmpty) outputEmpty.style.display = 'none';
  if (outputImg) outputImg.src = url;
  if (outputMeta) outputMeta.innerHTML = `${label} &middot; ~${sizeKb}KB`;
  if (actions) actions.style.display = '';
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

// Conversion token: increments each time a new conversion starts.
// When an async trace finishes, it checks if its token matches the
// current value - if not, a newer conversion superseded it, so discard.
let _convToken = 0;

async function convertPngToSvg() {
  const { pngDataUrl, threshold, preset, colorMode, smoothness } = converterState;
  const myToken = ++_convToken;

  // Show loading state (hide previous output)
  const outputEmpty = document.getElementById('convOutputEmpty');
  const outputPreview = document.getElementById('convOutputPreview');
  const actions = document.getElementById('convActions');
  if (outputPreview) outputPreview.style.display = 'none';
  if (actions) actions.style.display = 'none';
  if (outputEmpty) {
    outputEmpty.style.display = '';
    outputEmpty.innerHTML = `<span class="material-symbols-outlined" style="font-size:40px;color:var(--si-text-dim)">hourglass_top</span><p>Tracing...</p>`;
  }

  try {
    const ImageTracer = await loadImageTracer();
    if (myToken !== _convToken) return;

    // Build options from current state
    const options = buildImageTracerOptions(preset, colorMode, threshold, smoothness);

    // Load image into canvas
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = pngDataUrl;
    });
    if (myToken !== _convToken) return;

    // Trace resolution scales with smoothness (0=192px, 50=320px, 100=512px)
    // Higher resolution = more pixels for the tracer to follow curves accurately.
    const basePx = preset === 'detailed' ? 384 : 256;
    const smoothFactor = smoothness / 100; // 0..1
    const MAX_TRACE_PX = Math.round(basePx * (0.75 + smoothFactor * 1.25));
    const srcW = img.naturalWidth;
    const srcH = img.naturalHeight;
    const downScale = Math.min(1, MAX_TRACE_PX / Math.max(srcW, srcH));
    const traceW = Math.round(srcW * downScale);
    const traceH = Math.round(srcH * downScale);

    const canvas = document.createElement('canvas');
    canvas.width = traceW;
    canvas.height = traceH;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, traceW, traceH);
    const imageData = ctx.getImageData(0, 0, traceW, traceH);

    // ── Preprocessing: threshold + background removal ──
    const detectedBg = preprocessImageData(imageData, colorMode, threshold);

    // Scale factor: imagetracerjs traces at traceW x traceH but we want
    // path coordinates in the ORIGINAL srcW x srcH coordinate space.
    // The `scale` option multiplies all output path coordinates.
    const upScale = srcW / traceW; // e.g., 512/256 = 2.0
    options.scale = upScale;

    // Trace
    const svgResult = ImageTracer.imagedataToSVG(imageData, options);
    if (myToken !== _convToken) return;

    // Normalize: ensure viewBox matches original dimensions
    let cleanSvg = normalizeSvgOutput(svgResult, srcW, srcH);

    // Strip background-colored paths (the traced background) to produce
    // icon paths on transparent background.
    // Preprocessing normalises any detected bg to white [255,255,255],
    // so we always strip white. detectedBg is kept for diagnostics.
    cleanSvg = stripBackgroundPaths(cleanSvg, [255, 255, 255]);

    const svgBlob = new Blob([cleanSvg], { type: 'image/svg+xml' });
    converterState.outputBlob = svgBlob;
    const url = URL.createObjectURL(svgBlob);
    converterState.outputDataUrl = url;
    const sizeKb = Math.round(svgBlob.size / 1024);

    const sizeWarning = sizeKb > 300
      ? ` <span style="color:#f97316">⚠ Large</span>`
      : '';
    showConverterOutput(url, `SVG (${srcW}x${srcH})${sizeWarning}`, sizeKb);
  } catch (err) {
    if (myToken !== _convToken) return;
    console.error('[Converter] PNG-to-SVG failed:', err);
    if (outputEmpty) outputEmpty.innerHTML = `<span class="material-symbols-outlined" style="font-size:40px;color:var(--si-text-dim)">image_search</span><p>Preview appears here</p>`;
    showToast('Tracing failed: ' + (err.message || 'Unknown error'));
  }
}

function buildImageTracerOptions(preset, colorMode, threshold, smoothness = 50) {
  // Base options per preset - tuned for sharp, clean icon output
  // `scale` is set dynamically in convertPngToSvg() to compensate for downsampling
  const presetOptions = {
    posterized2: { numberofcolors: 2, colorsampling: 0, mincolorratio: 0, colorquantcycles: 1, pathomit: 4, ltres: 0.5, qtres: 0.5 },
    default:     { numberofcolors: 16, colorsampling: 2, mincolorratio: 0.01, colorquantcycles: 3, pathomit: 4, ltres: 0.5, qtres: 0.5 },
    detailed:    { numberofcolors: 32, colorsampling: 2, mincolorratio: 0, colorquantcycles: 5, pathomit: 2, ltres: 0.2, qtres: 0.2 },
  };

  const base = { ...(presetOptions[preset] || presetOptions.posterized2) };

  if (colorMode === 'mono') {
    // Mono: we preprocess pixels to binary (black/white) in preprocessImageData(),
    // so we only need 2 colors and minimal blur (thresholding is already done)
    base.numberofcolors = 2;
    base.colorsampling = 0;
    base.colorquantcycles = 1;
    base.blurradius = 0; // no blur - preprocessing handles threshold
    base.blurdelta = 0;
    // Tight path tolerance for sharp mono edges
    base.ltres = 0.3;
    base.qtres = 0.3;
  } else {
    // Color mode: need enough palette entries to distinguish icon colors
    // from the white background. With only 2 (Simple preset), k-means
    // quantizes everything to near-white shades that all get stripped.
    base.numberofcolors = Math.max(base.numberofcolors, 8);
    base.colorsampling = 2; // k-means for reliable color separation
    base.colorquantcycles = Math.max(base.colorquantcycles, 3);
  }

  // Smoothness adjustments: lower ltres/qtres = tighter Bezier fit,
  // slight blur radius smooths pixel staircase boundaries.
  const sf = (smoothness || 50) / 100; // 0..1
  // ltres/qtres: from preset value (sf=0) down to 0.1 (sf=1)
  base.ltres = Math.max(0.1, (base.ltres || 0.5) * (1 - sf * 0.8));
  base.qtres = Math.max(0.1, (base.qtres || 0.5) * (1 - sf * 0.8));
  // Blur: 0 at sf=0, up to 2 at sf=1 (only in color mode; mono uses preprocessing)
  if (colorMode !== 'mono' && sf > 0.2) {
    base.blurradius = Math.round(sf * 2);
    base.blurdelta = 20;
  }

  return base;
}

// ── Image preprocessing: threshold + background removal ──
// Returns the detected background colour [R,G,B] or null.
function preprocessImageData(imageData, colorMode, threshold) {
  const d = imageData.data; // RGBA flat array
  const w = imageData.width;
  const h = imageData.height;

  // Detect background color from corner pixels (shared logic)
  const bgColor = detectBackgroundFromCorners(d, w, h);

  if (colorMode === 'mono') {
    // Mono mode: convert to opaque black (foreground) and opaque white (background).
    // We use OPAQUE white, not transparent, because imagetracerjs ignores alpha
    // when all RGB channels are the same (it would trace everything as one solid fill).
    // White paths are stripped post-trace by stripBackgroundPaths().
    for (let i = 0; i < d.length; i += 4) {
      let isForeground;

      if (d[i + 3] < 128) {
        // Already transparent pixel -> definitely background
        isForeground = false;
      } else if (bgColor) {
        // Has a detected background color: foreground = pixels far from bg
        const dist = Math.abs(d[i] - bgColor[0])
                   + Math.abs(d[i + 1] - bgColor[1])
                   + Math.abs(d[i + 2] - bgColor[2]);
        isForeground = dist > threshold;
      } else {
        // No background detected (corners are transparent): luminance fallback
        const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        isForeground = gray < threshold;
      }

      if (isForeground) {
        d[i] = 0; d[i + 1] = 0; d[i + 2] = 0; d[i + 3] = 255;       // opaque black
      } else {
        d[i] = 255; d[i + 1] = 255; d[i + 2] = 255; d[i + 3] = 255; // opaque white
      }
    }
  } else {
    // Color mode: replace background pixels with opaque white.
    // We use opaque white (not transparent) because imagetracerjs produces
    // garbage when mixing opaque and transparent pixels with residual RGB.
    // White paths are stripped post-trace by stripBackgroundPaths().
    if (bgColor) {
      const bgTolerance = threshold;
      for (let i = 0; i < d.length; i += 4) {
        if (d[i + 3] < 128) {
          // Already transparent -> make opaque white
          d[i] = 255; d[i + 1] = 255; d[i + 2] = 255; d[i + 3] = 255;
          continue;
        }
        const dist = Math.abs(d[i] - bgColor[0])
                   + Math.abs(d[i + 1] - bgColor[1])
                   + Math.abs(d[i + 2] - bgColor[2]);
        if (dist < bgTolerance) {
          d[i] = 255; d[i + 1] = 255; d[i + 2] = 255; d[i + 3] = 255; // opaque white
        }
      }
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
  const bgR = bgColor[0], bgG = bgColor[1], bgB = bgColor[2];
  const tolerance = 55; // allow for quantisation drift
  return svgStr.replace(
    /<path[^>]*fill="rgb\((\d+),(\d+),(\d+)\)"[^>]*\/>/g,
    (match, r, g, b) => {
      const dist = Math.abs(parseInt(r) - bgR)
                 + Math.abs(parseInt(g) - bgG)
                 + Math.abs(parseInt(b) - bgB);
      return dist < tolerance ? '' : match;
    }
  );
}

function normalizeSvgOutput(svgStr, originalW, originalH) {
  // imagetracerjs embeds the trace canvas dimensions; override with original
  // so the downloaded SVG matches the source image's aspect ratio
  svgStr = svgStr.replace(/<svg([^>]*)>/, (m, attrs) => {
    // Remove any existing width/height/viewBox then rewrite
    attrs = attrs
      .replace(/\s*width="[^"]*"/, '')
      .replace(/\s*height="[^"]*"/, '')
      .replace(/\s*viewBox="[^"]*"/, '');
    return `<svg${attrs} viewBox="0 0 ${originalW} ${originalH}" width="${originalW}" height="${originalH}">`;
  });
  return svgStr;
}


// ── Toast Helper ──────────────────────────────────────────────
function showToast(msg) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}

// ── Exports for main.js ───────────────────────────────────────
export function getCurrentView() { return currentView; }
export function isStoreView() { return currentView !== 'icons'; }
export { loadSvgIntoMotionLab };

