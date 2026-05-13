import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');
const baseUrl = process.env.SUPERICONS_LOCAL_URL || 'http://127.0.0.1:5173/';
const localeDir = path.join(rootDir, 'data/i18n/messages');
const locales = fs
  .readdirSync(localeDir)
  .filter(file => file.endsWith('.json'))
  .map(file => path.basename(file, '.json'))
  .sort();

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

function readCatalog(locale) {
  return JSON.parse(fs.readFileSync(path.join(localeDir, `${locale}.json`), 'utf8'));
}

function get(obj, dotted) {
  return dotted.split('.').reduce((acc, key) => acc?.[key], obj);
}

function fill(template, values) {
  return String(template).replace(/\{(\w+)\}/g, (_, key) => values[key] ?? `{${key}}`);
}

function splitCatalogList(value) {
  return String(value || '').split('|').map(item => item.trim()).filter(Boolean);
}

function expectText(bodyText, expected, label) {
  assert.ok(expected, `${label}: expected text is empty`);
  const visible = String(bodyText);
  const needle = String(expected);
  assert.ok(
    visible.includes(needle)
      || visible.toLocaleLowerCase().includes(needle.toLocaleLowerCase()),
    `${label}: missing ${JSON.stringify(expected)}`,
  );
}

async function visibleText(page) {
  return page.locator('body').evaluate(body => body.innerText);
}

async function waitForText(page, expected, label) {
  await page.waitForFunction(
    needle => {
      const visible = document.body?.innerText || '';
      return visible.includes(needle)
        || visible.toLocaleLowerCase().includes(String(needle).toLocaleLowerCase());
    },
    expected,
    { timeout: 30000 },
  ).catch((error) => {
    throw new Error(`${label}: timed out waiting for ${JSON.stringify(expected)} (${error.message})`);
  });
}

async function createPage(browser, {
  pro = false,
  claimStatus = null,
  purchases = [],
} = {}) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  await page.addInitScript(({ pro: isProUser }) => {
    localStorage.setItem('si-hero-dismissed', '1');
    const user = isProUser
      ? {
        id: 'test-user',
        email: 'test@example.com',
        user_metadata: { full_name: 'Test User', name: 'Test User' },
        app_metadata: { providers: ['email'] },
      }
      : null;
    window.supabase = {
      createClient: () => ({
        auth: {
          onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
          getSession: async () => ({
            data: {
              session: user
                ? { user, access_token: 'test-token' }
                : null,
            },
          }),
          refreshSession: async () => ({
            data: {
              session: user
                ? { user, access_token: 'test-token' }
                : null,
            },
          }),
          signInWithPassword: async () => ({
            error: { message: 'Invalid login credentials' },
          }),
          signUp: async () => ({ data: {}, error: null }),
          signOut: async () => ({ error: null }),
          signInWithOAuth: async () => ({ error: null }),
          resetPasswordForEmail: async () => ({ error: null }),
          updateUser: async () => ({ data: { user }, error: null }),
          resend: async () => ({ error: null }),
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
    body: JSON.stringify(purchases),
  }));
  await page.route('**/functions/v1/claim-status', route => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify(claimStatus || {
      canClaim: false,
      nextAvailable: null,
      reason: 'subscription_required',
    }),
  }));

  return page;
}

async function openPacks(page, locale) {
  const url = new URL(baseUrl);
  url.searchParams.set('view', 'packs');
  url.searchParams.set('locale', locale);
  await page.goto(url.toString(), { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(
    expectedLocale => window.__supericons?.getActiveLocale?.() === expectedLocale,
    locale,
    { timeout: 30000 },
  );
  await page.waitForSelector('#packCatalog .pack-card__name, #packCatalog .promo-banner__title', { timeout: 30000 });
}

async function assertAnonymousPackCatalog(browser, locale) {
  const catalog = readCatalog(locale);
  const page = await createPage(browser);
  try {
    await openPacks(page, locale);
    await waitForText(page, get(catalog, 'packs.launch.name'), `${locale}: launch card name`);
    let text = await visibleText(page);

    expectText(text, get(catalog, 'packs.launch.name'), `${locale}: launch card name`);
    expectText(text, fill(get(catalog, 'packs.launch.savePercent'), { percent: 28 }), `${locale}: launch savings`);
    expectText(text, get(catalog, 'packs.launch.description'), `${locale}: launch card description`);
    expectText(text, get(catalog, 'packs.launch.getBundle'), `${locale}: launch card action`);
    expectText(text, get(catalog, 'packs.card.preview'), `${locale}: preview button`);
    expectText(text, fill(get(catalog, 'packs.card.buyPrice'), { price: '$5' }), `${locale}: pack card buy price`);
    expectText(text, get(catalog, 'packs.products.ai-agentic.name'), `${locale}: AI product name`);
    expectText(text, get(catalog, 'packs.products.status-feedback.name'), `${locale}: status product name`);
    expectText(text, get(catalog, 'packs.products.security-auth.description'), `${locale}: product description`);

    expectText(text, get(catalog, 'packs.pro.title'), `${locale}: Pro title`);
    expectText(text, get(catalog, 'packs.pro.monthlyDescription'), `${locale}: Pro monthly description`);
    expectText(text, get(catalog, 'pricing.monthly'), `${locale}: Pro monthly toggle`);
    expectText(text, get(catalog, 'pricing.annual'), `${locale}: Pro annual toggle`);
    expectText(text, get(catalog, 'packs.pro.subscribe'), `${locale}: Pro subscribe action`);
    for (const feature of splitCatalogList(get(catalog, 'packs.pro.monthlyFeatures'))) {
      expectText(text, feature, `${locale}: Pro monthly feature`);
    }

    await page.locator('.pro-card__plan-btn[data-plan="annual"]').click();
    text = await visibleText(page);
    expectText(text, get(catalog, 'packs.pro.annualDescription'), `${locale}: Pro annual description after toggle`);
    expectText(text, get(catalog, 'pricing.save45'), `${locale}: Pro annual savings after toggle`);
    for (const feature of splitCatalogList(get(catalog, 'packs.pro.annualFeatures'))) {
      expectText(text, feature, `${locale}: Pro annual feature`);
    }

    await page.locator('.pack-card__preview-btn').first().click();
    await page.waitForSelector('#collectionDetail .collection-detail__icon-cell--locked', { timeout: 30000 });
    text = await visibleText(page);
    expectText(text, get(catalog, 'packs.detail.backToCollections'), `${locale}: collection detail back button`);
    expectText(text, get(catalog, 'packs.detail.svgWithAnimations'), `${locale}: collection detail SVG metadata`);
    expectText(text, fill(get(catalog, 'packs.detail.animatedIconsCount'), { count: 50 }), `${locale}: collection detail icon count`);

    await page.locator('#collectionDetail .collection-detail__icon-cell--locked').first().click();
    await page.waitForSelector('.locked-panel', { timeout: 30000 });
    text = await visibleText(page);
    expectText(text, get(catalog, 'packs.locked.unlockMessage'), `${locale}: locked panel message`);
    expectText(text, fill(get(catalog, 'packs.locked.buyPrice'), { price: '$5' }), `${locale}: locked panel buy action`);
    expectText(text, get(catalog, 'packs.locked.goPro'), `${locale}: locked panel Pro action`);
  } finally {
    await page.close();
  }
}

async function assertProRedeemState(browser, locale, state) {
  const catalog = readCatalog(locale);
  const nextAvailable = '2099-05-10T12:00:00.000Z';
  const claimStatus = state === 'ready'
    ? { canClaim: true, reason: 'cooldown_ready', nextAvailable: null }
    : state === 'cooldown'
      ? { canClaim: false, reason: 'cooldown_wait', nextAvailable }
      : { canClaim: false, reason: 'all_owned', nextAvailable: null };
  const page = await createPage(browser, { pro: true, claimStatus });

  try {
    await openPacks(page, locale);

    if (state === 'ready') {
      await waitForText(page, get(catalog, 'packs.card.redeemNow'), `${locale}: redeem-now state`);
      await page.waitForSelector('.pack-card__redeem-btn', { timeout: 30000 });
      const text = await visibleText(page);
      expectText(text, get(catalog, 'packs.card.redeemNow'), `${locale}: redeem-now state`);
      return;
    }

    if (state === 'cooldown') {
      const dateText = new Intl.DateTimeFormat(locale, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }).format(new Date(nextAvailable));
      const expected = fill(get(catalog, 'packs.card.redeemOn'), { date: dateText });
      await waitForText(page, expected, `${locale}: redeem cooldown state`);
      const text = await visibleText(page);
      expectText(text, expected, `${locale}: redeem cooldown state`);
      return;
    }

    await waitForText(page, get(catalog, 'packs.card.allClaimableOwned'), `${locale}: all-owned redeem state`);
    const text = await visibleText(page);
    expectText(text, get(catalog, 'packs.card.allClaimableOwned'), `${locale}: all-owned redeem state`);
  } finally {
    await page.close();
  }
}

const browser = await chromium.launch({ headless: true });

try {
  for (const locale of locales) {
    await assertAnonymousPackCatalog(browser, locale);
  }

  for (const locale of locales) {
    await assertProRedeemState(browser, locale, 'ready');
    await assertProRedeemState(browser, locale, 'cooldown');
    await assertProRedeemState(browser, locale, 'all_owned');
  }

  console.log(`verify-packs-localization: ok (${locales.length} locales, packs page, Pro card, detail, locked panel, redeem states)`);
} finally {
  await browser.close();
}
