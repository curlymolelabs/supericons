import { chromium } from 'playwright';
import { startAdminDashboardPhaseBLiveServer } from './serve-admin-dashboard-phase-b-live.mjs';

const server = await startAdminDashboardPhaseBLiveServer({
  adminSecret: 'browser-contract-only',
  managedAuth: false,
  port: 0,
});
const apiBase = 'https://kcjmkakdhsqplvasgkjv.supabase.co/functions/v1/admin-api';
const browser = await chromium.launch({ headless: true });

function ok(condition, message) {
  if (!condition) throw new Error(message);
}

function successPayload(path, windowKey) {
  const meta = { window: windowKey, generated_at: '2026-07-18T00:00:00Z' };
  if (path === '/v2/activity') {
    return {
      activity: [{
        query: 'thirty day marker',
        result_count: 3,
        channel: 'hosted_mcp',
        created_at: '2026-07-18T00:00:00Z',
      }],
      channel_counts: { all: 1, hosted_mcp: 1 },
      meta,
    };
  }
  if (path === '/v2/overview') {
    return {
      kpis: {
        estimated_unique_clients: 30,
        registered_clients: 3,
        pro_clients: 1,
        anonymous_clients: 27,
        attempts: 300,
        success_count: 294,
        success_rate: 0.98,
        searches_per_client: 10,
        true_zero_count: 3,
        true_zero_rate: 0.01,
        low_result_count: 2,
        low_result_eligible_count: 100,
        low_result_rate: 0.02,
        client_measure: 'estimated_unique_clients',
        identity_available: true,
      },
      series: [],
      top_lists: {},
      geography: { available: true, coverage_rate: 0, rows: [] },
      meta,
    };
  }
  if (path === '/v2/search') {
    return {
      queries: [{
        query: 'thirty day marker',
        outcome_label: 'Success',
        result_count: 3,
        channel: 'hosted_mcp',
        last_seen: '2026-07-18T00:00:00Z',
      }],
      pagination: { page: 1, page_size: 25, total: 1, page_count: 1 },
      worklist: [],
      icon_requests: { available: true, rows: [] },
      contact_submissions: { available: true, rows: [] },
      diagnostics: {},
      meta,
    };
  }
  if (path === '/v2/audience') {
    return {
      funnel: {
        unique_clients: 30,
        registered_clients: 3,
        pro_clients: 1,
        identity_available: true,
        mrr: { available: false, reason: 'No verified price source.' },
      },
      registered_users: { available: true, total: 0, rows: [] },
      clients: { available: true, rows: [] },
      pagination: { page: 1, page_size: 25, total: 0, page_count: 1 },
      series: [],
      meta,
    };
  }
  if (path === '/users') {
    return { users: [], pagination: { page: 1, page_size: 0, total: 0, page_count: 1 } };
  }
  return null;
}

async function openDashboard(page) {
  await page.goto(server.url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.fill('#adminSecretInput', 'mock-secret');
  await page.click('#adminSecretSubmitBtn');
}

try {
  const allFailedPage = await browser.newPage({ viewport: { width: 1100, height: 900 } });
  await allFailedPage.route(`${apiBase}/**`, async (route) => {
    await route.fulfill({
      status: 500,
      headers: { 'access-control-allow-origin': '*' },
      json: { error: 'Synthetic upstream failure.' },
    });
  });
  await openDashboard(allFailedPage);
  await allFailedPage.waitForFunction(() => document.querySelector('#refreshButton')?.getAttribute('aria-busy') === 'false');
  const failedFreshness = await allFailedPage.locator('#freshnessLine').innerText();
  ok(!failedFreshness.includes('Up to date'), 'A failed refresh is labelled Up to date.');
  ok(
    await allFailedPage.locator('#kpiClients').innerText() !== '0',
    'A failed Overview request renders a measured zero for clients.',
  );
  ok(
    await allFailedPage.locator('#kpiSearches').innerText() !== '0',
    'A failed Overview request renders a measured zero for searches.',
  );
  ok(
    (await allFailedPage.locator('#section-overview').innerText()).includes('Synthetic upstream failure'),
    'The Overview error does not explain the failed source.',
  );
  await allFailedPage.close();

  const staleWindowPage = await browser.newPage({ viewport: { width: 1100, height: 900 } });
  await staleWindowPage.route(`${apiBase}/**`, async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace('/functions/v1/admin-api', '');
    const windowKey = url.searchParams.get('window') || '30d';
    if (windowKey === '7d') {
      await route.fulfill({
        status: 500,
        headers: { 'access-control-allow-origin': '*' },
        json: { error: 'Synthetic seven day failure.' },
      });
      return;
    }
    const payload = successPayload(path, windowKey);
    await route.fulfill({
      status: payload ? 200 : 404,
      headers: { 'access-control-allow-origin': '*' },
      json: payload || { error: 'Missing fixture.' },
    });
  });
  await openDashboard(staleWindowPage);
  await staleWindowPage.waitForFunction(() => document.querySelector('#kpiSearches')?.textContent === '300');
  const failedSevenDayResponse = staleWindowPage.waitForResponse((response) => (
    response.url().includes('/functions/v1/admin-api/')
    && response.url().includes('window=7d')
  ));
  await staleWindowPage.click('[data-window="7d"]');
  await failedSevenDayResponse;
  await staleWindowPage.waitForFunction(() => document.querySelector('#refreshButton')?.getAttribute('aria-busy') === 'false');
  ok(
    await staleWindowPage.locator('#kpiSearches').innerText() !== '300',
    'A failed seven-day refresh still presents the thirty-day search count.',
  );
  const staleFreshness = await staleWindowPage.locator('#freshnessLine').innerText();
  ok(!staleFreshness.includes('Up to date'), 'A failed seven-day refresh is labelled Up to date.');
  ok(
    (await staleWindowPage.locator('#section-overview').innerText()).includes('Synthetic seven day failure'),
    'The failed seven-day window does not explain the failed source.',
  );
  await staleWindowPage.close();

  console.log(JSON.stringify({
    status: 'ok',
    cases: ['all_endpoints_failed', 'window_change_failed'],
  }, null, 2));
} finally {
  await browser.close();
  await server.close();
}
