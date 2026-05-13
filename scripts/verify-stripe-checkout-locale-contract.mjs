import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from 'playwright';

const baseUrl = process.env.SUPERICONS_LOCAL_URL || 'http://127.0.0.1:5173/';

const localeMap = {
  'zh-Hans': 'zh',
  'zh-Hant': 'zh-TW',
  ar: 'ar',
  de: 'de',
  en: 'en',
  es: 'es',
  hi: 'hi',
  ja: 'ja',
  ko: 'ko',
  pt: 'pt',
  th: 'th',
  vi: 'vi',
};

const products = [
  {
    id: 'b3604c59-a37e-4cbe-bd02-882b1b6c0f9e',
    name: 'Status & Feedback',
    slug: 'status-feedback',
    description: 'App state animations: loading, success, error, notifications',
    price_cents: 500,
    stripe_price_id: 'price_status_feedback',
    pack_type: 'single',
    icon_count: 50,
    preview_url: null,
    css_filename: null,
    status: 'active',
    created_at: '2026-03-24T11:16:54.195094+00:00',
    v1_launch: true,
  },
  {
    id: '9050e40a-33c0-4c26-b39b-a904704bf24c',
    name: 'Navigation & Menus',
    slug: 'navigation-menus',
    description: 'UI chrome animations: hamburger, tabs, sidebar, search',
    price_cents: 500,
    stripe_price_id: 'price_navigation_menus',
    pack_type: 'single',
    icon_count: 50,
    preview_url: null,
    css_filename: null,
    status: 'active',
    created_at: '2026-03-24T11:16:54.195094+00:00',
    v1_launch: true,
  },
  {
    id: '12cc864a-3cfc-40a2-b387-e6f7fa98d830',
    name: 'Social & Communication',
    slug: 'social-communication',
    description: 'Reactions, messaging, and sharing animations',
    price_cents: 500,
    stripe_price_id: 'price_social_communication',
    pack_type: 'single',
    icon_count: 50,
    preview_url: null,
    css_filename: null,
    status: 'active',
    created_at: '2026-03-24T11:16:54.195094+00:00',
    v1_launch: true,
  },
  {
    id: '947d0b82-6c6f-477a-84c2-8bbfcb225375',
    name: 'Data & Charts',
    slug: 'data-charts',
    description: 'Dashboard loading states and chart animations',
    price_cents: 500,
    stripe_price_id: 'price_data_charts',
    pack_type: 'single',
    icon_count: 50,
    preview_url: null,
    css_filename: null,
    status: 'active',
    created_at: '2026-03-24T11:16:54.195094+00:00',
    v1_launch: true,
  },
  {
    id: 'c1e8e06f-4846-4276-b4da-f01cb89da71e',
    name: 'E-commerce',
    slug: 'ecommerce',
    description: 'Cart, payment, and shipping feedback animations',
    price_cents: 500,
    stripe_price_id: 'price_ecommerce',
    pack_type: 'single',
    icon_count: 50,
    preview_url: null,
    css_filename: null,
    status: 'active',
    created_at: '2026-03-24T11:16:54.195094+00:00',
    v1_launch: true,
  },
  {
    id: '84e27cca-3b15-4f27-acb0-d7e8f254eb41',
    name: 'Media & Playback',
    slug: 'media-playback',
    description: 'Player controls and recording state animations',
    price_cents: 500,
    stripe_price_id: 'price_media_playback',
    pack_type: 'single',
    icon_count: 50,
    preview_url: null,
    css_filename: null,
    status: 'active',
    created_at: '2026-03-24T11:16:54.195094+00:00',
    v1_launch: true,
  },
  {
    id: 'b83ccb85-7e9e-4d0c-8cdc-fdfbb892bdbd',
    name: 'Security & Auth',
    slug: 'security-auth',
    description: 'Login flows, permissions, and trust signal animations',
    price_cents: 500,
    stripe_price_id: 'price_security_auth',
    pack_type: 'single',
    icon_count: 50,
    preview_url: null,
    css_filename: null,
    status: 'active',
    created_at: '2026-03-24T11:16:54.195094+00:00',
    v1_launch: true,
  },
  {
    id: 'a7f6f112-f408-4b59-a90d-57081ccad390',
    name: 'AI & Agentic',
    slug: 'ai-agentic',
    description: 'AI-native app states and agent feedback animations',
    price_cents: 500,
    stripe_price_id: 'price_ai_agentic',
    pack_type: 'single',
    icon_count: 50,
    preview_url: null,
    css_filename: null,
    status: 'active',
    created_at: '2026-03-24T11:16:54.195094+00:00',
    v1_launch: true,
  },
];

function assertEdgeFunctionForwardsLocale() {
  const source = fs.readFileSync('supabase/functions/create-checkout/index.ts', 'utf8');
  assert.ok(source.includes('const { price_id, product_id, success_url, cancel_url, mode, locale }'), 'create-checkout must read locale from request JSON');
  assert.ok(source.includes('locale: normalizeStripeLocale(locale)'), 'create-checkout must pass normalized locale to Stripe Checkout');
  assert.ok(source.includes('const appLocale = normalizeAppLocale(locale)'), 'create-checkout must normalize the app locale for localized product copy');
  assert.ok(source.includes('stripe.prices.retrieve(price_id)'), 'create-checkout must retrieve Stripe price details before creating localized line items');
  assert.ok(source.includes('price_data: priceData'), 'create-checkout must use inline price_data so Checkout can show localized product names');
  assert.ok(source.includes('product_data: productData'), 'create-checkout must pass localized product_data into Stripe Checkout');
  assert.ok(source.includes('locale: appLocale'), 'create-checkout metadata must keep the app locale for fulfillment/auditing');
  assert.ok(source.includes('Price does not match product'), 'create-checkout must verify the requested product and price are paired');
  for (const stripeLocale of new Set(Object.values(localeMap))) {
    assert.ok(source.includes(`'${stripeLocale}'`), `create-checkout must allow Stripe locale ${stripeLocale}`);
  }
  for (const product of products) {
    assert.ok(source.includes(product.slug), `create-checkout must include localized copy for ${product.slug}`);
  }
}

async function createCheckoutPage(browser, { pro = false } = {}) {
  const checkoutRequests = [];
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  await page.addInitScript(({ pro: isProUser }) => {
    localStorage.setItem('si-hero-dismissed', '1');
    const user = {
      id: 'test-user',
      email: 'test@example.com',
      user_metadata: { full_name: 'Test User', name: 'Test User' },
      app_metadata: { providers: ['email'] },
    };
    window.supabase = {
      createClient: () => ({
        auth: {
          onAuthStateChange: (callback) => {
            setTimeout(() => callback('SIGNED_IN', { user }), 0);
            return { data: { subscription: { unsubscribe() {} } } };
          },
          getSession: async () => ({
            data: { session: { user, access_token: 'test-token' } },
          }),
          refreshSession: async () => ({
            data: { session: { user, access_token: 'test-token' } },
          }),
          signOut: async () => ({ error: null }),
        },
        from: () => ({
          select() { return this; },
          eq() { return this; },
          single: async () => (
            isProUser
              ? {
                data: {
                  status: 'active',
                  current_period_end: '2099-01-01T00:00:00.000Z',
                },
                error: null,
              }
              : { data: null, error: { message: 'No subscription' } }
          ),
        }),
      }),
    };
  }, { pro });

  await page.route('**/@supabase/supabase-js@2/**', route => route.fulfill({
    contentType: 'application/javascript',
    body: '',
  }));
  await page.route('**/rest/v1/si_products**', route => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify(products),
  }));
  await page.route('**/rest/v1/si_purchases**', route => route.fulfill({
    contentType: 'application/json',
    body: '[]',
  }));
  await page.route('**/functions/v1/claim-status', route => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({ canClaim: true, nextAvailable: null, reason: 'cooldown_ready' }),
  }));
  await page.route('**/functions/v1/create-checkout', async (route) => {
    checkoutRequests.push(route.request().postDataJSON());
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ url: `${baseUrl}?checkout_mock=1` }),
    });
  });

  return { page, checkoutRequests };
}

async function openView(page, view, locale) {
  const url = new URL(baseUrl);
  url.searchParams.set('view', view);
  url.searchParams.set('locale', locale);
  await page.goto(url.toString(), { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(
    expectedLocale => window.__supericons?.getActiveLocale?.() === expectedLocale,
    locale,
    { timeout: 30000 },
  );
}

function assertCheckoutRequest(payload, { locale, mode, productId }) {
  const expectedStripeLocale = localeMap[locale];
  assert.equal(payload.locale, expectedStripeLocale, `${locale}: checkout locale`);
  if (mode === 'payment') {
    assert.ok(payload.mode === undefined || payload.mode === 'payment', `${locale}: checkout mode`);
  } else {
    assert.equal(payload.mode, mode, `${locale}: checkout mode`);
  }
  if (productId) assert.equal(payload.product_id, productId, `${locale}: product id`);

  const successUrl = new URL(payload.success_url);
  const cancelUrl = new URL(payload.cancel_url);
  assert.equal(successUrl.searchParams.get('locale'), locale, `${locale}: success URL preserves locale`);
  assert.equal(cancelUrl.searchParams.get('locale'), locale, `${locale}: cancel URL preserves locale`);
}

assertEdgeFunctionForwardsLocale();

const browser = await chromium.launch({ headless: true });

try {
  for (const locale of Object.keys(localeMap)) {
    const { page, checkoutRequests } = await createCheckoutPage(browser);
    try {
      await openView(page, 'packs', locale);
      await page.waitForSelector('#packCatalog .pack-card__btn--buy', { timeout: 30000 });

      await page.locator('#packCatalog .pack-card__btn--buy').first().click();
      await page.waitForFunction(() => new URLSearchParams(window.location.search).get('checkout_mock') === '1');
      assertCheckoutRequest(checkoutRequests.at(-1), {
        locale,
        mode: 'payment',
        productId: products.find(product => product.slug === 'ai-agentic').id,
      });

      await openView(page, 'packs', locale);
      await page.waitForSelector('#launchEditionBtn', { timeout: 30000 });
      await page.locator('#launchEditionBtn').click();
      await page.waitForFunction(() => new URLSearchParams(window.location.search).get('checkout_mock') === '1');
      assertCheckoutRequest(checkoutRequests.at(-1), {
        locale,
        mode: 'payment',
        productId: 'launch_edition',
      });

      await openView(page, 'packs', locale);
      await page.waitForSelector('#proSubscribeBtn', { timeout: 30000 });
      await page.locator('#proSubscribeBtn').click();
      await page.waitForFunction(() => new URLSearchParams(window.location.search).get('checkout_mock') === '1');
      assertCheckoutRequest(checkoutRequests.at(-1), {
        locale,
        mode: 'subscription',
      });
    } finally {
      await page.close();
    }
  }

  console.log(`verify-stripe-checkout-locale-contract: ok (${Object.keys(localeMap).length} locales, pack, bundle, and Pro checkout requests)`);
} finally {
  await browser.close();
}
