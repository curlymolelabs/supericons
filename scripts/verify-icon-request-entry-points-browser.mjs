import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.env.SI_BASE_URL || 'http://127.0.0.1:4173/';
const screenshotPath = process.env.SI_ICON_REQUEST_SCREENSHOT
  || 'references/verification/icon-request-entry-points-2026-07-27.png';
const iconFixture = [
  {
    name: 'onlyone',
    id: 'onlyone',
    lib: 'lucide',
    type: 'svg',
    style: 'outline',
    svg: '<svg viewBox="0 0 24 24"><path d="M4 12h16"/></svg>',
  },
  {
    name: 'alpha',
    id: 'alpha',
    lib: 'lucide',
    type: 'svg',
    style: 'outline',
    svg: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/></svg>',
  },
  {
    name: 'beta',
    id: 'beta',
    lib: 'lucide',
    type: 'svg',
    style: 'outline',
    svg: '<svg viewBox="0 0 24 24"><path d="M6 6h12v12H6z"/></svg>',
  },
  ...Array.from({ length: 447 }, (_, index) => ({
    name: `fixture icon ${index + 1}`,
    id: `fixture-${index + 1}`,
    lib: 'lucide',
    type: 'svg',
    style: 'outline',
    svg: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="7"/></svg>',
  })),
];

async function siteIsAvailable() {
  try {
    const response = await fetch(baseUrl);
    return response.ok;
  } catch {
    return false;
  }
}

let browser;
let localServer;
try {
  if (!process.env.SI_BASE_URL && !(await siteIsAvailable())) {
    localServer = spawn(
      process.execPath,
      ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '4173', '--strictPort'],
      {
        cwd: process.cwd(),
        stdio: 'ignore',
        windowsHide: true,
      },
    );
  }

  let serverReady = false;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    if (await siteIsAvailable()) {
      serverReady = true;
      break;
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 500));
  }
  assert.equal(
    serverReady,
    true,
    `The local site is not available at ${baseUrl}.`,
  );

  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1365, height: 900 } });
  const savedRequests = [];
  await page.addInitScript(() => {
    localStorage.setItem('si-hero-dismissed', '1');
  });

  await page.route('**/icon-index.json', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      icons: iconFixture,
      libraries: [{ id: 'lucide', count: iconFixture.length }],
    }),
  }));
  await page.route('**/icon-index-solid.json', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ icons: [], libraries: [] }),
  }));
  await page.route('**/rest/v1/icon_scores**', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: '[]',
  }));
  await page.route('https://mcp.supericons.dev/search-icons', async (route) => {
    const request = route.request();
    const payload = request.postDataJSON();
    const results = payload.query === 'onlyone'
      ? [{ icon_id: 'lucide:onlyone' }]
      : [];
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        results,
        search_runtime: { mode: 'browser_fixture' },
      }),
    });
  });
  await page.route('**/functions/v1/web-search-telemetry', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: '{}',
  }));
  await page.route('**/rest/v1/rpc/si_log_icon_evidence', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify('search-evidence-fixture'),
  }));
  await page.route('**/rest/v1/rpc/si_log_icon_request', async (route) => {
    savedRequests.push(route.request().postDataJSON());
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify('11111111-1111-4111-8111-111111111111'),
    });
  });

  const targetUrl = new URL(baseUrl);
  targetUrl.searchParams.set('view', 'icons');
  await page.goto(targetUrl.toString(), { waitUntil: 'commit' });

  const searchInput = page.locator('#searchInput');
  try {
    await searchInput.waitFor({ state: 'visible', timeout: 5000 });
  } catch {
    const heroSearchButton = page.locator('#heroSearchBtn');
    await heroSearchButton.waitFor({ state: 'visible', timeout: 120_000 });
    await heroSearchButton.click();
    await searchInput.waitFor({ state: 'visible', timeout: 120_000 });
  }
  await page.waitForSelector('.icon-cell', { timeout: 120_000 });

  const sidebarFontSizes = await page.evaluate(() => ({
    favorites: getComputedStyle(document.querySelector('[data-library="favorites"]')).fontSize,
    request: getComputedStyle(document.querySelector('#sidebarIconRequest')).fontSize,
  }));
  assert.equal(
    sidebarFontSizes.request,
    sidebarFontSizes.favorites,
    'The request action font size does not match the other sidebar items.',
  );
  await page.locator('#sidebarIconRequest').hover();
  await page.waitForTimeout(220);
  const requestIconMotion = await page.evaluate(() => {
    const request = document.querySelector('#sidebarIconRequest');
    const ring = document.querySelector('.sidebar-request-icon__ring');
    const plus = document.querySelector('.sidebar-request-icon__plus');
    const sweep = document.querySelector('.sidebar-request-icon__sweep');
    const ripple = document.querySelector('.sidebar-request-icon__ripple');
    return {
      animationName: getComputedStyle(plus).animationName,
      transform: getComputedStyle(plus).transform,
      ringAnimationName: getComputedStyle(ring).animationName,
      ringTransform: getComputedStyle(ring).transform,
      sweepAnimationName: getComputedStyle(sweep).animationName,
      sweepDashOffset: getComputedStyle(sweep).strokeDashoffset,
      sweepOpacity: Number.parseFloat(getComputedStyle(sweep).opacity),
      rippleAnimationName: getComputedStyle(ripple).animationName,
      rippleTransform: getComputedStyle(ripple).transform,
      stroke: getComputedStyle(plus).stroke,
      sweepStroke: getComputedStyle(sweep).stroke,
      rippleStroke: getComputedStyle(ripple).stroke,
      requestColor: getComputedStyle(request).color,
    };
  });
  assert.equal(requestIconMotion.animationName, 'sidebar-request-plus-pop');
  assert.notEqual(requestIconMotion.transform, 'none');
  assert.equal(requestIconMotion.ringAnimationName, 'sidebar-request-ring-breathe');
  assert.notEqual(requestIconMotion.ringTransform, 'none');
  assert.equal(requestIconMotion.sweepAnimationName, 'sidebar-request-ring-draw');
  assert.notEqual(requestIconMotion.sweepDashOffset, '100px');
  assert.ok(requestIconMotion.sweepOpacity > 0);
  assert.equal(requestIconMotion.rippleAnimationName, 'sidebar-request-confirmation-ripple');
  assert.notEqual(requestIconMotion.rippleTransform, 'none');
  assert.equal(requestIconMotion.stroke, requestIconMotion.requestColor);
  assert.equal(requestIconMotion.sweepStroke, requestIconMotion.requestColor);
  assert.equal(requestIconMotion.rippleStroke, requestIconMotion.requestColor);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  assert.deepEqual(
    await page.evaluate(() => ({
      plus: getComputedStyle(document.querySelector('.sidebar-request-icon__plus')).animationName,
      ring: getComputedStyle(document.querySelector('.sidebar-request-icon__ring')).animationName,
      sweep: getComputedStyle(document.querySelector('.sidebar-request-icon__sweep')).animationName,
      ripple: getComputedStyle(document.querySelector('.sidebar-request-icon__ripple')).animationName,
    })),
    { plus: 'none', ring: 'none', sweep: 'none', ripple: 'none' },
    'The request icon motion ignores the reduced-motion preference.',
  );
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.mouse.move(700, 20);

  await searchInput.fill('zzzz-no-match');
  await page.waitForFunction(() => (
    document.querySelectorAll('#iconGrid .icon-cell').length === 0
      && document.querySelector('#iconRequestPanel')?.hidden === false
  ), null, { timeout: 120_000 });
  await page.locator('#noResultsFeedbackInput').fill('Zero result request');
  await page.locator('#noResultsFeedbackForm button[type="submit"]').click();
  await page.waitForFunction(() => (
    document.querySelector('#noResultsFeedbackStatus')?.classList.contains('is-success')
  ));

  assert.equal(savedRequests[0]?.p_ui_surface, 'grid_empty_feedback');
  assert.equal(savedRequests[0]?.p_search_query, 'zzzz-no-match');
  assert.equal(savedRequests[0]?.p_result_count, 0);
  assert.equal(savedRequests[0]?.p_request_text, 'Zero result request');

  await searchInput.fill('onlyone');
  await page.waitForFunction(() => (
    document.querySelectorAll('#iconGrid .icon-cell').length === 1
      && document.querySelector('#iconRequestPanel')?.hidden === false
  ), null, { timeout: 120_000 });
  await page.locator('#noResultsFeedbackInput').fill('Low result request');
  await page.locator('#noResultsFeedbackForm button[type="submit"]').click();
  await page.waitForFunction(() => (
    document.querySelector('#noResultsFeedbackStatus')?.classList.contains('is-success')
  ));

  assert.equal(savedRequests[1]?.p_ui_surface, 'grid_low_result_feedback');
  assert.equal(savedRequests[1]?.p_search_query, 'onlyone');
  assert.equal(savedRequests[1]?.p_result_count, 1);
  assert.equal(savedRequests[1]?.p_request_text, 'Low result request');

  await page.getByRole('button', { name: 'Request an icon' }).click();
  await page.locator('#noResultsFeedbackInput').waitFor({ state: 'visible' });
  assert.equal(await page.locator('#noResultsFeedbackInput').inputValue(), 'onlyone');
  await page.locator('#noResultsFeedbackInput').fill('Sidebar request from one result');
  await page.locator('#noResultsFeedbackForm button[type="submit"]').click();
  await page.waitForFunction(() => (
    document.querySelector('#noResultsFeedbackStatus')?.classList.contains('is-success')
  ));

  assert.equal(savedRequests[2]?.p_ui_surface, 'sidebar_request');
  assert.equal(savedRequests[2]?.p_search_query, 'onlyone');
  assert.equal(savedRequests[2]?.p_result_count, 1);
  assert.equal(savedRequests[2]?.p_request_text, 'Sidebar request from one result');

  await searchInput.fill('zzzz-no-match');
  await page.waitForFunction(() => (
    document.querySelectorAll('#iconGrid .icon-cell').length === 0
      && document.querySelector('#iconRequestPanel')?.hidden === false
  ), null, { timeout: 120_000 });
  await page.locator('#noResultsFeedbackInput').fill('Request after search changed');
  await page.locator('#noResultsFeedbackForm button[type="submit"]').click();
  await page.waitForFunction(() => (
    document.querySelector('#noResultsFeedbackStatus')?.classList.contains('is-success')
  ));

  assert.equal(savedRequests[3]?.p_ui_surface, 'grid_empty_feedback');
  assert.equal(savedRequests[3]?.p_search_query, 'zzzz-no-match');
  assert.equal(savedRequests[3]?.p_result_count, 0);
  assert.equal(savedRequests[3]?.p_request_text, 'Request after search changed');

  await searchInput.fill('');
  await page.waitForFunction(() => (
    document.querySelectorAll('#iconGrid .icon-cell').length >= 200
      && document.querySelector('#iconRequestPanel')?.hidden === true
  ), null, { timeout: 120_000 });
  const gridBeforeStandaloneRequest = await page.evaluate(() => ({
    cells: document.querySelectorAll('#iconGrid .icon-cell').length,
    scrollTop: document.querySelector('#gridArea')?.scrollTop || 0,
  }));
  await page.getByRole('button', { name: 'Request an icon' }).click();
  await page.locator('#noResultsFeedbackInput').waitFor({ state: 'visible' });
  await page.waitForTimeout(500);
  const modalState = await page.evaluate(() => {
    const panel = document.querySelector('#iconRequestPanel');
    const card = document.querySelector('#iconRequestCard');
    const grid = document.querySelector('#gridArea');
    const cardRect = card?.getBoundingClientRect();
    return {
      isModal: panel?.classList.contains('icon-request-panel--modal'),
      panelPosition: panel ? getComputedStyle(panel).position : '',
      cardVisible: Boolean(card && card.getClientRects().length),
      cardInsideViewport: Boolean(
        cardRect
        && cardRect.top >= 0
        && cardRect.left >= 0
        && cardRect.bottom <= window.innerHeight
        && cardRect.right <= window.innerWidth
      ),
      cells: document.querySelectorAll('#iconGrid .icon-cell').length,
      scrollTop: grid?.scrollTop || 0,
    };
  });
  assert.equal(modalState.isModal, true, 'The sidebar request did not open as a modal.');
  assert.equal(modalState.panelPosition, 'fixed', 'The request modal is not fixed to the viewport.');
  assert.equal(modalState.cardVisible, true, 'The request modal card is not visible.');
  assert.equal(modalState.cardInsideViewport, true, 'The request modal card is outside the viewport.');
  assert.equal(
    modalState.cells,
    gridBeforeStandaloneRequest.cells,
    'Opening the request modal triggered another grid batch.',
  );
  assert.equal(
    modalState.scrollTop,
    gridBeforeStandaloneRequest.scrollTop,
    'Opening the request modal scrolled the icon grid.',
  );
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => document.querySelector('#iconRequestPanel')?.hidden === true);
  assert.equal(
    await page.evaluate(() => document.activeElement?.id),
    'sidebarIconRequest',
    'Closing the request modal did not return focus to its sidebar action.',
  );
  await page.getByRole('button', { name: 'Request an icon' }).click();
  await page.locator('#noResultsFeedbackInput').waitFor({ state: 'visible' });
  assert.equal(await page.locator('#noResultsFeedbackInput').inputValue(), '');
  await page.locator('#noResultsFeedbackInput').fill('Standalone sidebar request');
  await page.locator('#noResultsFeedbackForm button[type="submit"]').click();
  await page.waitForFunction(() => (
    document.querySelector('#noResultsFeedbackStatus')?.classList.contains('is-success')
  ));

  assert.equal(savedRequests[4]?.p_ui_surface, 'sidebar_request');
  assert.equal(savedRequests[4]?.p_search_query, null);
  assert.equal(savedRequests[4]?.p_result_count, null);
  assert.equal(savedRequests[4]?.p_request_text, 'Standalone sidebar request');

  const gridOrderBeforeViewChange = await page.locator('#iconGrid .icon-cell').evaluateAll(
    (cells) => cells.map((cell) => `${cell.dataset.iconLib}:${cell.dataset.iconId}`),
  );
  await page.getByRole('button', { name: 'Request an icon' }).click();
  await page.locator('#noResultsFeedbackInput').waitFor({ state: 'visible' });
  await page.locator('#iconRequestBackdrop').click({ position: { x: 5, y: 5 } });
  await page.waitForFunction(() => document.querySelector('#iconRequestPanel')?.hidden === true);
  await page.getByRole('button', { name: 'Request an icon' }).click();
  await page.locator('#noResultsFeedbackInput').waitFor({ state: 'visible' });
  await page.locator('#footerPricingLink').evaluate((link) => link.click());
  await page.waitForFunction(() => document.body.dataset.view === 'pricing');
  await page.locator('.store-back-btn').click();
  await page.waitForFunction((minimumGridLength) => (
    !document.body.dataset.view
      && document.querySelectorAll('#iconGrid .icon-cell').length >= minimumGridLength
  ), gridOrderBeforeViewChange.length);
  assert.equal(await page.locator('#iconRequestPanel').getAttribute('hidden'), '');
  assert.deepEqual(
    await page.locator('#iconGrid .icon-cell').evaluateAll(
      (cells, prefixLength) => cells
        .slice(0, prefixLength)
        .map((cell) => `${cell.dataset.iconLib}:${cell.dataset.iconId}`),
      gridOrderBeforeViewChange.length,
    ),
    gridOrderBeforeViewChange,
  );

  await mkdir(dirname(resolve(screenshotPath)), { recursive: true });
  await page.screenshot({ path: resolve(screenshotPath), fullPage: true });

  console.log(JSON.stringify({
    status: 'ok',
    zero_result_request: 'passed',
    low_result_request: 'passed',
    sidebar_context_invalidation: 'passed',
    request_view_observer_grid_order: 'passed',
    standalone_sidebar_request: 'passed',
    sidebar_font_size: 'passed',
    request_modal_viewport_position: 'passed',
    request_modal_does_not_scroll_grid: 'passed',
    request_modal_escape_and_backdrop_close: 'passed',
    request_icon_hover_motion: 'passed',
    request_icon_ring_motion: 'passed',
    request_icon_ring_draw: 'passed',
    request_icon_confirmation_ripple: 'passed',
    request_icon_reduced_motion: 'passed',
    captured_rpc_writes: savedRequests.length,
    screenshot: screenshotPath,
    hosted_systems_touched: false,
  }, null, 2));
} finally {
  await browser?.close();
  localServer?.kill();
}
