import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { chromium } from 'playwright';
import { startAdminDashboardPhaseBLiveServer } from './serve-admin-dashboard-phase-b-live.mjs';

function ok(condition, message) {
  if (!condition) throw new Error(message);
}

function populated(value) {
  const text = String(value || '').trim();
  return text && !['000', '00%', 'Loading', 'Unavailable'].includes(text);
}

function readArg(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : '';
}

const adminSecret = String(process.env.ADMIN_SECRET || '').trim();
const outputPath = readArg('output');
ok(adminSecret, 'ADMIN_SECRET must be present in the process environment.');

const dashboard = await startAdminDashboardPhaseBLiveServer({
  adminSecret,
  port: 0,
});
const servedHtmlResponse = await fetch(dashboard.url);
const servedHtml = await servedHtmlResponse.text();
ok(servedHtmlResponse.ok, 'The local live dashboard HTML could not be loaded.');
ok(servedHtml.includes('managedAuth:true'), 'The managed local runtime configuration is missing.');
ok(!servedHtml.includes(adminSecret), 'The local live dashboard HTML contains the admin secret.');
ok((await fetch(new URL('/package.json', dashboard.url))).status === 404, 'The local gateway exposed an unapproved file.');
ok((await fetch(new URL('/api/admin/v2/overview', dashboard.url), {
  headers: { Origin: 'https://example.com' },
})).status === 403, 'The local gateway accepted a cross-site request.');

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const apiRequests = [];

page.on('request', (request) => {
  const url = new URL(request.url());
  if (url.pathname.startsWith('/api/admin/v2/')) {
    apiRequests.push({ path: url.pathname, search: url.search });
  }
});

try {
  await page.goto(dashboard.url, { waitUntil: 'domcontentloaded', timeout: 120_000 });
  await page.waitForFunction(() => (
    document.querySelector('#refreshButton')?.getAttribute('aria-busy') === 'false'
      && document.querySelector('#freshnessLine')?.textContent?.startsWith('Up to date')
      && !document.querySelector('#kpiClients')?.classList.contains('skeleton')
  ), null, { timeout: 120_000 });
  await page.waitForFunction(() => (
    document.querySelector('#kpiClientsNote')?.textContent?.includes('registered')
      && document.querySelector('#kpiClientsNote')?.textContent?.includes('privacy-safe identifiers')
      && !document.querySelector('#kpiClientsNote')?.textContent?.includes('0 registered')
  ), null, { timeout: 120_000 });

  ok(await page.locator('#adminSecretModal.open').count() === 0, 'The managed local dashboard requested a secret.');
  ok(await page.evaluate(() => (
    window.sessionStorage.getItem('si_admin_secret') === null
    && window.localStorage.getItem('si_admin_secret') === null
  )), 'The browser stored the admin secret.');
  ok(await page.evaluate(() => (
    [window.sessionStorage, window.localStorage].every((storage) => (
      Object.values(storage).every((value) => (
        !String(value).includes('@')
        && !String(value).includes('"users"')
        && !String(value).includes('"registered_users"')
      ))
    ))
  )), 'Browser storage contains account or email-bearing payloads.');
  ok(await page.locator('.nav-button').count() === 3, 'The dashboard must have exactly three navigation sections.');
  ok(await page.getByText('Stats', { exact: true }).count() === 0, 'The Stats section still exists.');
  ok(await page.getByText('Audit Log', { exact: true }).count() === 0, 'The Audit Log section still exists.');

  const kpis = await Promise.all(
    ['kpiClients', 'kpiSearches', 'kpiZero', 'kpiLow']
      .map((id) => page.locator(`#${id}`).innerText()),
  );
  ok(kpis.every(populated), 'One or more production KPIs are blank or unavailable.');

  ok(await page.locator('.chart svg').count() === 4, 'All four inline SVG charts did not render.');
  ok(await page.locator('#latestActivity .activity-row').count() > 0, 'Latest Activity has no real production rows.');
  const activityText = await page.locator('#latestActivity').innerText();
  ok(activityText.includes('User query'), 'Latest Activity does not use the approved origin wording.');

  const channelOptions = await page.locator('#channelFilter option').allTextContents();
  ok(channelOptions.some((value) => /\(\d+\)/.test(value)), 'The venue selector does not show live counts.');

  for (const tab of ['searched', 'returned', 'copied', 'zero']) {
    await page.click(`[data-top-list="${tab}"]`);
    const topListText = await page.locator('#topListTable').innerText();
    ok(topListText.trim() && !topListText.includes('Loading'), `The ${tab} top list has no truthful state.`);
  }
  const geographyText = await page.locator('#geographyList').innerText();
  ok(geographyText.trim() && !geographyText.includes('Loading'), 'Geography has no truthful production state.');

  await page.click('#nav-intelligence');
  await page.waitForSelector('#section-intelligence:not([hidden])');
  const explorerText = await page.locator('#queryExplorer').innerText();
  ok(explorerText.trim() && !explorerText.includes('Loading'), 'The production query explorer did not render.');
  ok(await page.locator('#diagnosticsDrawer:not([open])').count() === 1, 'Diagnostics should start collapsed.');
  for (const id of ['iconRequests', 'contactInbox']) {
    const text = await page.locator(`#${id}`).innerText();
    ok(text.trim() && !text.includes('Loading'), `${id} has no truthful production state.`);
  }

  await page.click('#nav-audience');
  await page.waitForSelector('#section-audience:not([hidden])');
  const funnel = await Promise.all(
    ['funnelClients', 'funnelRegistered', 'funnelPro']
      .map((id) => page.locator(`#${id}`).innerText()),
  );
  ok(funnel.every(populated), 'The production audience funnel is unavailable.');
  ok(Number(funnel[1]) > 0, 'The registered account funnel incorrectly shows zero.');
  ok(Number(funnel[2]) > 0, 'The Pro account funnel incorrectly shows zero.');
  for (const id of ['registeredUsers', 'allClients']) {
    const text = await page.locator(`#${id}`).innerText();
    ok(text.trim() && !text.includes('Loading'), `${id} has no truthful production state.`);
  }

  const liveContract = await page.evaluate(async () => {
    const common = 'window=30d&channel=all&include_test=false';
    const [overviewResponse, audienceResponse] = await Promise.all([
      fetch(`/api/admin/v2/overview?${common}`),
      fetch(`/api/admin/v2/audience?${common}&page=1&page_size=50`),
    ]);
    if (!overviewResponse.ok || !audienceResponse.ok) {
      throw new Error(`Production contract failed (${overviewResponse.status}, ${audienceResponse.status}).`);
    }
    const [overview, audience] = await Promise.all([
      overviewResponse.json(),
      audienceResponse.json(),
    ]);
    return {
      activityRows: document.querySelectorAll('#latestActivity .activity-row').length,
      identityAvailable: overview?.kpis?.identity_available !== false,
      geographyAvailable: overview?.geography?.available === true,
      identityRowsTruncated: overview?.meta?.identity_rows_truncated === true,
      rawRowsTruncated: overview?.meta?.raw_rows_truncated === true,
      completedSeriesDays: new Set(
        (overview?.series || [])
          .filter((row) => row.channel === 'all' && row.day < new Date().toISOString().slice(0, 10))
          .map((row) => row.day),
      ).size,
      audienceIdentityAvailable: audience?.funnel?.identity_available !== false,
      registeredUsersAvailable: audience?.registered_users?.available === true,
      clientsAvailable: audience?.clients?.available === true,
    };
  });
  ok(liveContract.identityAvailable, 'The 30-day identity KPI is unavailable.');
  ok(liveContract.geographyAvailable, 'The 30-day geography view is unavailable.');
  ok(!liveContract.identityRowsTruncated, 'The 30-day identity source is truncated.');
  ok(!liveContract.rawRowsTruncated, 'The current-day source is truncated.');
  ok(liveContract.completedSeriesDays > 0, 'The 30-day charts do not include completed-day rollups.');
  ok(liveContract.audienceIdentityAvailable, 'Audience identity is unavailable.');
  ok(liveContract.registeredUsersAvailable, 'Registered users are unavailable.');
  ok(liveContract.clientsAvailable, 'Client profiles are unavailable.');

  await page.click('[data-window="custom"]');
  const today = new Date();
  const to = today.toISOString().slice(0, 10);
  const from = new Date(Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate() - 6,
  )).toISOString().slice(0, 10);
  await page.fill('#customFrom', from);
  await page.fill('#customTo', to);
  const customOverviewRequest = page.waitForRequest((request) => {
    const url = new URL(request.url());
    return url.pathname === '/api/admin/v2/overview'
      && url.searchParams.get('window') === 'custom'
      && url.searchParams.get('from') === from
      && url.searchParams.get('to') === to;
  }, { timeout: 120_000 });
  await page.click('#applyCustomRange');
  await customOverviewRequest;
  await page.waitForFunction(() => (
    document.querySelector('#refreshButton')?.getAttribute('aria-busy') === 'false'
      && document.querySelector('#freshnessLine')?.textContent?.startsWith('Up to date')
  ), null, { timeout: 120_000 });
  ok(
    apiRequests.some((request) => (
      request.search.includes('window=custom')
        && request.search.includes(`from=${from}`)
        && request.search.includes(`to=${to}`)
    )),
    'Custom dates were not sent to the live API.',
  );

  const overview30dResponse = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return url.pathname === '/api/admin/v2/overview'
      && url.searchParams.get('window') === '30d'
      && response.status() === 200;
  }, { timeout: 120_000 });
  await page.click('[data-window="30d"]');
  await overview30dResponse;
  await page.waitForFunction(() => (
    document.querySelector('#refreshButton')?.getAttribute('aria-busy') === 'false'
      && document.querySelector('#freshnessLine')?.textContent?.startsWith('Up to date')
  ), null, { timeout: 120_000 });
  const warmStart = Date.now();
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 120_000 });
  await page.waitForFunction(() => (
    !document.querySelector('#kpiClients')?.classList.contains('skeleton')
  ), null, { timeout: 5_000 });
  const warmRenderMs = Date.now() - warmStart;
  ok(warmRenderMs < 1_000, `Warm cached content took ${warmRenderMs} ms to appear.`);
  await page.waitForFunction(() => (
    document.querySelector('#kpiClientsNote')?.textContent?.includes('registered accounts')
      && !document.querySelector('#kpiClientsNote')?.textContent?.startsWith('0 registered')
  ), null, { timeout: 120_000 });
  await page.waitForFunction(() => (
    document.querySelector('#refreshButton')?.getAttribute('aria-busy') === 'false'
      && document.querySelector('#freshnessLine')?.textContent?.startsWith('Up to date')
      && document.querySelectorAll('#latestActivity .activity-row').length > 0
  ), null, { timeout: 120_000 });

  const overflow = await page.evaluate(() => ({
    document: document.documentElement.scrollWidth <= document.documentElement.clientWidth + 2,
    sections: [...document.querySelectorAll('main section')]
      .filter((section) => !section.hidden)
      .every((section) => section.scrollWidth <= section.clientWidth + 2),
  }));
  ok(overflow.document, 'The live admin page has horizontal overflow.');
  ok(overflow.sections, 'The active dashboard section has horizontal overflow.');

  await page.click('#nav-overview');
  await page.evaluate(() => window.scrollTo(0, 0));
  await mkdir('.tmp', { recursive: true });
  const screenshotPath = '.tmp/admin-dashboard-v2-live.png';
  await page.screenshot({ path: screenshotPath, fullPage: true });
  const screenshot = await readFile(screenshotPath);

  const result = {
    artifact: 'admin_dashboard_v2_live_browser_walkthrough',
    status: 'ok',
    live_api_requests: apiRequests.length,
    latest_activity_rows: liveContract.activityRows,
    completed_series_days: liveContract.completedSeriesDays,
    navigation_sections: 3,
    inline_svg_charts: await page.locator('.chart svg').count(),
    warm_render_ms: warmRenderMs,
    horizontal_overflow: false,
    auth_prompt_shown: false,
    screenshot_sha256: createHash('sha256').update(screenshot).digest('hex'),
    screenshot_bytes: screenshot.length,
  };
  if (outputPath) {
    const absoluteOutput = resolve(outputPath);
    await mkdir(dirname(absoluteOutput), { recursive: true });
    await writeFile(absoluteOutput, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  }
  console.log(JSON.stringify({
    ...result,
    screenshot: screenshotPath,
    output: outputPath || null,
  }, null, 2));
} finally {
  await browser.close();
  await dashboard.close();
}
