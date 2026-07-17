import { mkdir, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright';
import { startAdminDashboardPhaseBLiveServer } from './serve-admin-dashboard-phase-b-live.mjs';

function ok(condition, message) {
  if (!condition) throw new Error(message);
}

const adminSecret = String(process.env.ADMIN_SECRET || '').trim();
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
ok((await fetch(new URL('/api/admin/stats', dashboard.url), {
  headers: { Origin: 'https://example.com' },
})).status === 403, 'The local gateway accepted a cross-site request.');
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const apiRequests = [];

page.on('request', (request) => {
  const url = new URL(request.url());
  if (url.pathname.startsWith('/api/admin')) {
    apiRequests.push(url.pathname);
  }
});

try {
  await page.goto(dashboard.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.click('#nav-intelligence');
  await page.waitForSelector('#phaseBLatestActivity .phase-b-chip--origin', { timeout: 60000 });

  ok(await page.locator('#adminSecretModal.open').count() === 0, 'The managed local dashboard requested a secret.');
  ok(await page.evaluate(() => window.sessionStorage.getItem('si_admin_secret') === null), 'The browser stored the admin secret.');
  ok(apiRequests.includes('/api/admin/intelligence/search/dashboard'), 'The live dashboard endpoint was not requested.');
  ok(await page.locator('#phaseBLatestActivity .phase-b-activity-row').count() > 0, 'Latest Activity has no real rows.');
  ok(await page.locator('#phaseBLatestActivity .phase-b-chip--origin').count() > 0, 'Latest Activity has no origin labels.');
  ok((await page.locator('#phaseBLatestActivity').innerText()).includes('Direct search'), 'Latest Activity is not scoped to direct searches.');

  const kpis = await page.locator('#phaseBKpiStrip .phase-b-kpi__value').allInnerTexts();
  ok(kpis.length === 4, 'The four Phase B KPIs did not render.');
  ok(kpis.every((value) => value && value !== '-'), 'A Phase B KPI is blank or unavailable.');

  const panelText = await page.locator('#panel-intelligence').innerText();
  ok(!panelText.toLowerCase().includes('not captured'), 'The live dashboard includes placeholder data copy.');
  ok(await page.locator('#intelligenceRawSignalsDetails:not([open])').count() === 1, 'Diagnostics should start collapsed.');

  const livePayload = await page.evaluate(async () => {
    const response = await fetch('/api/admin/intelligence/search/dashboard?window=30d&environment=production&channel=all&query_origin=agent_query');
    if (!response.ok) throw new Error(`Dashboard contract request failed (${response.status}).`);
    return response.json();
  });
  ok(livePayload?.filters?.query_origin === 'agent_query', 'The live dashboard did not pin direct-search origin.');
  ok(Array.isArray(livePayload.latest_activity) && livePayload.latest_activity.length > 0, 'The live contract returned no activity.');
  ok(livePayload.latest_activity.every((row) => row.query_origin === 'agent_query'), 'A non-direct origin entered Latest Activity.');
  ok(Number.isFinite(livePayload?.summary?.true_zero_count), 'The true-zero metric is missing.');
  ok(Number.isFinite(livePayload?.summary?.estimated_unique_clients)
    || Number.isFinite(livePayload?.summary?.client_days), 'The client metric is missing.');

  await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
  const warmStart = Date.now();
  await page.click('#nav-intelligence');
  await page.waitForSelector('#phaseBLatestActivity .phase-b-activity-row', { timeout: 60000 });
  const warmRenderMs = Date.now() - warmStart;
  ok(warmRenderMs < 500, `Warm cached content took ${warmRenderMs} ms to appear.`);

  const overflow = await page.evaluate(() => ({
    document: document.documentElement.scrollWidth <= document.documentElement.clientWidth + 2,
    panel: document.querySelector('#panel-intelligence > div[style*="overflow-y"]')?.scrollWidth
      <= document.querySelector('#panel-intelligence > div[style*="overflow-y"]')?.clientWidth + 2,
  }));
  ok(overflow.document, 'The live admin page has horizontal overflow.');
  ok(overflow.panel, 'The live intelligence panel has horizontal overflow.');

  await page.evaluate(() => {
    window.scrollTo(0, 0);
    const panelScroller = document.querySelector('#panel-intelligence > div[style*="overflow-y"]');
    if (panelScroller) panelScroller.scrollTop = 0;
  });
  await mkdir('.tmp', { recursive: true });
  const screenshotPath = '.tmp/admin-dashboard-phase-b-live.png';
  await page.screenshot({ path: screenshotPath, fullPage: true });
  const screenshot = await readFile(screenshotPath);

  console.log(JSON.stringify({
    ok: true,
    live_api_requests: apiRequests.length,
    latest_activity_rows: livePayload.latest_activity.length,
    client_measure: livePayload.summary.client_measure,
    true_zero_count: livePayload.summary.true_zero_count,
    warm_render_ms: warmRenderMs,
    horizontal_overflow: false,
    auth_prompt_shown: false,
    screenshot: screenshotPath,
    screenshot_sha256: createHash('sha256').update(screenshot).digest('hex'),
    screenshot_bytes: screenshot.length,
  }, null, 2));
} finally {
  await browser.close();
  await dashboard.close();
}
