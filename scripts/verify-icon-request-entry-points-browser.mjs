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

  await searchInput.fill('');
  await page.waitForFunction(() => (
    document.querySelectorAll('#iconGrid .icon-cell').length === 3
      && document.querySelector('#iconRequestPanel')?.hidden === true
  ), null, { timeout: 120_000 });
  await page.getByRole('button', { name: 'Request an icon' }).click();
  await page.locator('#noResultsFeedbackInput').waitFor({ state: 'visible' });
  assert.equal(await page.locator('#noResultsFeedbackInput').inputValue(), '');
  await page.locator('#noResultsFeedbackInput').fill('Standalone sidebar request');
  await page.locator('#noResultsFeedbackForm button[type="submit"]').click();
  await page.waitForFunction(() => (
    document.querySelector('#noResultsFeedbackStatus')?.classList.contains('is-success')
  ));

  assert.equal(savedRequests[2]?.p_ui_surface, 'sidebar_request');
  assert.equal(savedRequests[2]?.p_search_query, null);
  assert.equal(savedRequests[2]?.p_result_count, null);
  assert.equal(savedRequests[2]?.p_request_text, 'Standalone sidebar request');

  await mkdir(dirname(resolve(screenshotPath)), { recursive: true });
  await page.screenshot({ path: resolve(screenshotPath), fullPage: true });

  console.log(JSON.stringify({
    status: 'ok',
    zero_result_request: 'passed',
    low_result_request: 'passed',
    standalone_sidebar_request: 'passed',
    captured_rpc_writes: savedRequests.length,
    screenshot: screenshotPath,
    hosted_systems_touched: false,
  }, null, 2));
} finally {
  await browser?.close();
  localServer?.kill();
}
