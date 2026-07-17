import { mkdir, readFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const adminUrl = process.env.ADMIN_PHASE_B_URL || 'http://127.0.0.1:5173/admin.html';
const apiBase = 'https://kcjmkakdhsqplvasgkjv.supabase.co/functions/v1/admin-api';
let dashboardRequestCount = 0;
let reviewedStatus = null;

function ok(condition, message) {
  if (!condition) throw new Error(message);
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

await page.route(`${apiBase}/**`, async (route) => {
  const request = route.request();
  const url = new URL(request.url());
  const path = url.pathname.replace('/functions/v1/admin-api', '');
  const headers = { 'access-control-allow-origin': '*' };

  if (path === '/intelligence/search/dashboard') {
    dashboardRequestCount += 1;
    if (dashboardRequestCount > 1) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    await route.fulfill({
      status: 200,
      headers,
      json: {
        summary: {
          attempt_count: 128,
          success_count: 116,
          true_zero_count: 8,
          low_result_count: 4,
          low_result_eligible_count: 80,
          estimated_unique_clients: 32,
          searches_per_client: 4,
          returning_clients_within_month: 7,
          client_measure: 'estimated_unique_clients',
          true_zero_rate: 0.0625,
          low_result_rate: 0.05,
        },
        latest_activity: [
          {
            id: 'activity-1',
            query: 'database',
            library_filter: 'lucide',
            result_count: 3,
            requested_limit: 3,
            search_outcome: 'success',
            query_origin: 'agent_query',
            tool_name: 'search_icons',
            channel: 'hosted_mcp',
            environment: 'production',
            country_code: 'SG',
            estimated_client_key: 'anonymous:abc123def456',
            visitor_kind: 'anonymous',
            created_at: '2026-07-17T08:00:00Z',
          },
        ],
        filters: {
          window: url.searchParams.get('window'),
          channel: url.searchParams.get('channel'),
          environment: url.searchParams.get('environment'),
          query_origin: url.searchParams.get('query_origin'),
        },
        limitations: {
          anonymous_identity_rotates_monthly: true,
        },
      },
    });
    return;
  }

  if (path === '/intelligence/search/queue') {
    const issueType = url.searchParams.get('issue_type') || 'zero_result';
    const status = reviewedStatus;
    const active = status !== 'resolved' && status !== 'ignore';
    const queries = active ? [{
      query: issueType === 'low_result' ? 'rare upload' : 'missing brand',
      library_filter: 'all',
      job_category: '',
      issue_types: [issueType],
      attempt_count: issueType === 'low_result' ? 3 : 5,
      zero_attempt_count: issueType === 'zero_result' ? 5 : 0,
      low_attempt_count: issueType === 'low_result' ? 3 : 0,
      estimated_unique_clients: issueType === 'low_result' ? 2 : 4,
      client_measure: 'estimated_unique_clients',
      first_seen: '2026-07-16T01:00:00Z',
      last_seen: '2026-07-17T07:30:00Z',
      review_status: status,
      channels: ['hosted_mcp'],
      environments: ['production'],
    }] : [];
    await route.fulfill({
      status: 200,
      headers,
      json: {
        queries,
        summary: { total_queries: queries.length },
        pagination: { page: 1, page_size: 100, total: queries.length, page_count: 1 },
        filters: {
          environment: url.searchParams.get('environment') || 'live',
          channel: url.searchParams.get('channel') || 'all',
        },
      },
    });
    return;
  }

  if (path === '/intelligence/search/review') {
    reviewedStatus = JSON.parse(request.postData() || '{}').status || null;
    await route.fulfill({ status: 200, headers, json: { success: true } });
    return;
  }

  if (path === '/stats') {
    await route.fulfill({
      status: 200,
      headers,
      json: {
        stats: {
          total_users: 2,
          active_pro: 1,
          total_purchases: 1,
          new_users_30d: 1,
          hosted_search: { total_requests_24h: 12, p95_latency_ms: 250, trap_hits_30d: 0, top_sources: [] },
          recent_signups: [],
          recent_audit: [],
        },
      },
    });
    return;
  }

  if (path === '/intelligence/overview') {
    await route.fulfill({
      status: 200,
      headers,
      json: {
        overview: {
          total_evidence_rows: 128,
          copy_events: 0,
          favorite_events: 0,
          kit_downloads: 0,
          mcp_batches: 20,
          top_icons: [],
          top_job_categories: [],
          top_replaced_icons: [],
        },
        metadata_coverage: { classified_icons: 0 },
      },
    });
    return;
  }

  if (path === '/intelligence/search') {
    await route.fulfill({
      status: 200,
      headers,
      json: {
        search_intelligence: {
          summary: {
            unique_queries: 20,
            search_attempts: 128,
            zero_result_queries: 8,
            low_result_queries: 4,
            query_review_feature_available: true,
          },
          top_queries: [],
          top_mcp_queries: [],
        },
      },
    });
    return;
  }

  if (path === '/intelligence/evidence') {
    await route.fulfill({
      status: 200,
      headers,
      json: {
        evidence: [],
        pagination: { page: 1, page_size: 50, total: 0, page_count: 1 },
      },
    });
    return;
  }

  if (path === '/users') {
    await route.fulfill({
      status: 200,
      headers,
      json: { users: [], pagination: { page: 1, page_size: 25, total: 0, page_count: 1 } },
    });
    return;
  }

  if (path === '/audit-log') {
    await route.fulfill({
      status: 200,
      headers,
      json: { audit_log: [], pagination: { page: 1, page_size: 25, total: 0, page_count: 1 } },
    });
    return;
  }

  await route.fulfill({ status: 404, headers, json: { error: `No mock for ${path}` } });
});

await page.goto(adminUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.fill('#adminSecretInput', 'mock-secret');
await page.click('#adminSecretSubmitBtn');
await page.click('#nav-intelligence');
await page.waitForSelector('#phaseBLatestActivity .phase-b-activity-row', { timeout: 30000 });

ok(await page.locator('#intelligenceSearch').getAttribute('placeholder') === 'Search dashboard...', 'Global search copy is incorrect.');
ok(await page.locator('#queryExplorerEnvironmentFilter').count() === 0, 'A duplicate environment filter remains.');
ok(await page.locator('#queryExplorerChannelFilter').count() === 0, 'A duplicate channel filter remains.');
ok(await page.locator('#intelligenceRawSignalsDetails:not([open])').count() === 1, 'Diagnostics should start collapsed.');
ok(await page.locator('#phaseBClientsValue').innerText() === '32', 'Estimated client KPI is incorrect.');
ok(await page.locator('#phaseBSearchesValue').innerText() === '128', 'Real searches KPI is incorrect.');
ok(await page.locator('#phaseBZeroRateValue').innerText() === '6%', 'True zero KPI is incorrect.');
ok(await page.locator('#phaseBLowRateValue').innerText() === '5%', 'Low-result KPI is incorrect.');

const activityText = await page.locator('#phaseBLatestActivity').innerText();
ok(activityText.includes('database'), 'Latest Activity did not render the query.');
ok(activityText.includes('Anonymous'), 'Latest Activity did not render the visitor kind.');
ok(activityText.includes('Direct search'), 'Latest Activity did not render the origin badge.');
ok(activityText.includes('SG'), 'Latest Activity did not render an available country.');

const defaultText = await page.locator('#panel-intelligence').innerText();
ok(!defaultText.toLowerCase().includes('not captured'), 'Default dashboard includes missing-data placeholder copy.');
ok(defaultText.includes('missing brand') && defaultText.includes('rare upload'), 'Gap Worklist did not merge zero and low-result rows.');

await page.click('#intelligenceRefreshBtn');
ok(await page.locator('#intelligenceRefreshBtn').getAttribute('aria-busy') === 'true', 'Refresh state was not visible.');
ok(await page.locator('#phaseBLatestActivity').innerText().then((text) => text.includes('database')), 'Stale content disappeared during refresh.');
await page.waitForFunction(() => document.querySelector('#intelligenceRefreshBtn')?.getAttribute('aria-busy') === 'false');

await page.reload({ waitUntil: 'domcontentloaded' });
if (await page.locator('#adminSecretModal.open').count()) {
  await page.fill('#adminSecretInput', 'mock-secret');
  await page.click('#adminSecretSubmitBtn');
}
await page.click('#nav-intelligence');
const warmStart = Date.now();
await page.waitForFunction(() => document.querySelector('#phaseBLatestActivity')?.textContent?.includes('database'));
const warmRenderMs = Date.now() - warmStart;
ok(warmRenderMs < 500, `Warm cached content took ${warmRenderMs} ms to appear.`);

await page.fill('#intelligenceSearch', 'database');
await page.waitForTimeout(250);
ok((await page.locator('#phaseBLatestActivity').innerText()).includes('database'), 'Global search did not keep a matching activity row.');
await page.fill('#intelligenceSearch', 'no match');
await page.waitForTimeout(250);
ok((await page.locator('#phaseBLatestActivity').innerText()).includes('No direct searches match'), 'Global search did not filter Latest Activity.');
await page.fill('#intelligenceSearch', '');
await page.waitForTimeout(250);

await page.evaluate(() => {
  window.scrollTo(0, 0);
  const panelScroller = document.querySelector('#panel-intelligence > div[style*="overflow-y"]');
  if (panelScroller) panelScroller.scrollTop = 0;
});
await mkdir('.tmp', { recursive: true });
await page.screenshot({ path: '.tmp/admin-dashboard-phase-b.png', fullPage: true });

await page.locator('#queryExplorerTableBody [data-review-status="resolved"]').first().click();
await page.waitForTimeout(300);
ok(reviewedStatus === 'resolved', 'Gap review action did not call the review endpoint.');

const overflow = await page.evaluate(() => ({
  document: document.documentElement.scrollWidth <= document.documentElement.clientWidth + 2,
  panel: document.querySelector('#panel-intelligence > div[style*="overflow-y"]')?.scrollWidth
    <= document.querySelector('#panel-intelligence > div[style*="overflow-y"]')?.clientWidth + 2,
}));
ok(overflow.document, 'The admin page has horizontal overflow.');
ok(overflow.panel, 'The intelligence panel has horizontal overflow.');

await browser.close();

const screenshot = await readFile('.tmp/admin-dashboard-phase-b.png');
console.log(JSON.stringify({
  ok: true,
  adminUrl,
  warm_render_ms: warmRenderMs,
  screenshot: '.tmp/admin-dashboard-phase-b.png',
  screenshot_bytes: screenshot.length,
}, null, 2));
