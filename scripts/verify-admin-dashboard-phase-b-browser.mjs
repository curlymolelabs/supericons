import { chromium } from 'playwright';
import { startAdminDashboardPhaseBLiveServer } from './serve-admin-dashboard-phase-b-live.mjs';

const server = await startAdminDashboardPhaseBLiveServer({
  adminSecret: 'browser-contract-only',
  managedAuth: false,
  port: 0,
});
const apiBase = 'https://kcjmkakdhsqplvasgkjv.supabase.co/functions/v1/admin-api';
const requests = [];
let requestRound = 0;
const registeredRows = Array.from({ length: 23 }, (_, index) => ({
  identifier: `u***${index + 1}@example.test`,
  provider: index % 2 === 0 ? 'Google' : 'Email',
  plan: index < 2 ? 'pro_monthly' : 'Free',
  signup_at: `2026-06-${String((index % 23) + 1).padStart(2, '0')}T00:00:00Z`,
  last_active: index < 3 ? '2026-07-17T07:00:00Z' : null,
  searches: index < 3 ? 10 - index : 0,
  venues: index < 3 ? ['web'] : [],
  country_code: index < 3 ? 'SG' : null,
}));

function ok(condition, message) {
  if (!condition) throw new Error(message);
}

function responseFor(path, searchParams = new URLSearchParams()) {
  const windowKey = searchParams.get('window') || '30d';
  const allHistory = windowKey === 'all';
  const meta = { window: windowKey, generated_at: '2026-07-17T08:00:00Z' };
  if (path === '/v2/activity') {
    return {
      activity: [{
        query: 'database',
        library_filter: 'lucide',
        query_origin: 'agent_query',
        visitor_kind: 'anonymous',
        client_label: 'anon:abc123',
        result_count: 3,
        country_code: 'SG',
        channel: 'web',
        created_at: '2026-07-17T07:58:00Z',
      }],
      channel_counts: { all: 17, web: 10, hosted_mcp: 7, cli: 0 },
      meta,
    };
  }
  if (path === '/v2/overview') {
    return {
      kpis: {
        estimated_unique_clients: allHistory ? 90 : 32,
        registered_clients: 5,
        pro_clients: 2,
        anonymous_clients: 27,
        attempts: 128,
        success_count: 116,
        success_rate: 0.90625,
        searches_per_client: 4,
        true_zero_count: 8,
        true_zero_rate: 0.0625,
        low_result_count: 4,
        low_result_eligible_count: 80,
        low_result_rate: 0.05,
        client_measure: allHistory ? 'client_days' : 'estimated_unique_clients',
        identity_available: !allHistory,
        identity_unavailable_reason: allHistory ? 'Exact client profiles are unavailable for all recorded history.' : null,
      },
      series: [
        { day: '2026-07-15', channel: 'all', attempts: 40, client_days: 12, true_zero_count: 2, low_result_count: 1, low_result_eligible_count: 30, registered_clients: 3, pro_clients: 1 },
        { day: '2026-07-15', channel: 'web', attempts: 25 },
        { day: '2026-07-15', channel: 'hosted_mcp', attempts: 15 },
        { day: '2026-07-16', channel: 'all', attempts: 45, client_days: 14, true_zero_count: 4, low_result_count: 2, low_result_eligible_count: 25, registered_clients: 4, pro_clients: 1 },
        { day: '2026-07-16', channel: 'web', attempts: 30 },
        { day: '2026-07-16', channel: 'hosted_mcp', attempts: 15 },
        { day: '2026-07-17', channel: 'all', attempts: 43, client_days: 13, true_zero_count: 2, low_result_count: 1, low_result_eligible_count: 25, registered_clients: 5, pro_clients: 2 },
        { day: '2026-07-17', channel: 'web', attempts: 28 },
        { day: '2026-07-17', channel: 'hosted_mcp', attempts: 15 },
      ],
      outage_spans: [{ from: '2026-07-16T11:30:00Z', to: '2026-07-16T13:20:00Z', label: 'Outage Jul 16' }],
      top_lists: {
        searched: { available: true, rows: [{ query: 'database', searches: 18, distinct_clients: 9, hit_rate: 1 }] },
        returned: { available: false, reason: 'Web result-set linkage is incomplete.', rows: [] },
        copied: { available: true, rows: [{ icon_id: 'lucide:database', action: 'copy', actions: 7, distinct_clients: 4 }] },
        zero: { available: true, rows: [{ query: 'missing brand', count: 5, distinct_clients: 4, last_seen: '2026-07-17T07:30:00Z' }] },
      },
      geography: {
        available: true,
        coverage_rate: 0.75,
        rows: [
          { country_code: 'SG', searches: 60, distinct_clients: 14, percentage: 0.46875 },
          { country_code: 'US', searches: 36, distinct_clients: 9, percentage: 0.28125 },
          { country_code: 'Unknown', searches: 32, distinct_clients: 9, percentage: 0.25 },
        ],
      },
      meta,
    };
  }
  if (path === '/v2/search') {
    return {
      queries: [
        {
          query: 'healthy aggregate',
          library_filter: 'all',
          query_origin: 'agent_query',
          visitor_kind: 'anonymous',
          client_label: '3 clients',
          country_code: null,
          country_available: false,
          country_reason: 'Not available for aggregate view',
          channel: 'web',
          result_count: null,
          result_count_available: false,
          result_count_reason: 'Not available for aggregate view',
          issue_type: 'successful',
          outcome_label: 'Success',
          attempt_count: 5,
          zero_attempt_count: 0,
          last_seen: '2026-07-17T07:40:00Z',
        },
        {
          query: 'mixed aggregate',
          library_filter: 'all',
          query_origin: 'agent_query',
          visitor_kind: 'anonymous',
          client_label: '4 clients',
          country_code: null,
          country_available: false,
          country_reason: 'Not available for aggregate view',
          channel: 'web',
          result_count: null,
          result_count_available: false,
          result_count_reason: 'Not available for aggregate view',
          issue_type: 'mixed_result',
          outcome_label: 'Mixed: 1 of 5 zero',
          attempt_count: 5,
          zero_attempt_count: 1,
          last_seen: '2026-07-17T07:35:00Z',
        },
        {
          query: 'icon lookup',
          library_filter: 'lucide',
          query_origin: 'icon_lookup',
          visitor_kind: 'anonymous',
          client_label: '1 client',
          country_code: 'SG',
          country_available: true,
          channel: 'hosted_mcp',
          result_count: 1,
          result_count_available: true,
          issue_type: 'successful',
          outcome_label: 'Success',
          attempt_count: 0,
          zero_attempt_count: 0,
          last_seen: '2026-07-17T07:32:00Z',
        },
        {
          query: 'icon lookup pending',
          library_filter: 'lucide',
          query_origin: 'icon_lookup',
          visitor_kind: 'anonymous',
          client_label: '1 client',
          country_code: 'SG',
          country_available: true,
          channel: 'hosted_mcp',
          result_count: null,
          result_count_available: false,
          result_count_reason: 'Not available for this view',
          issue_type: 'successful',
          outcome_label: 'Success',
          attempt_count: 0,
          zero_attempt_count: 0,
          last_seen: '2026-07-17T07:31:00Z',
        },
        {
          query: 'missing brand',
          library_filter: 'all',
          query_origin: 'agent_query',
          visitor_kind: 'anonymous',
          client_label: 'anon:def456',
          country_code: 'DE',
          country_available: true,
          channel: 'hosted_mcp',
          result_count: 0,
          result_count_available: true,
          issue_type: 'zero_result',
          outcome_label: 'Zero',
          attempt_count: 5,
          zero_attempt_count: 5,
          last_seen: '2026-07-17T07:30:00Z',
        },
        ...Array.from({ length: 55 }, (_, index) => ({
          query: `healthy query ${index + 1}`,
          library_filter: 'all',
          query_origin: 'agent_query',
          visitor_kind: 'anonymous',
          client_label: `${index + 1} clients`,
          country_code: null,
          country_available: false,
          country_reason: 'Not available for aggregate view',
          channel: 'web',
          result_count: null,
          result_count_available: false,
          result_count_reason: 'Not available for aggregate view',
          issue_type: 'successful',
          outcome_label: 'Success',
          attempt_count: index + 1,
          zero_attempt_count: 0,
          last_seen: '2026-07-17T07:20:00Z',
        })),
      ],
      worklist: [{ query: 'missing brand', issue_type: 'zero_result', distinct_clients: 4, attempt_count: 5 }],
      icon_requests: {
        available: true,
        rows: [{
          request_text: 'A better database migration icon',
          visitor_kind: 'anonymous',
          client_label: 'anon:req123',
          country_code: 'SG',
          created_at: '2026-07-17T06:00:00Z',
        }],
      },
      contact_submissions: {
        available: true,
        rows: [{
          name: 'Product team',
          email: 'team@example.test',
          interest: 'Licensing',
          message: 'Need an icon license for an app.',
          created_at: '2026-07-17T05:00:00Z',
        }],
      },
      diagnostics: { known_defects: 2, raw_access: 'available through API export' },
      meta,
    };
  }
  if (path === '/v2/audience') {
    return {
      funnel: {
        unique_clients: allHistory ? 90 : 32,
        registered_clients: allHistory ? 23 : 5,
        registered_percentage: allHistory ? null : 0.15625,
        pro_clients: 2,
        pro_percentage: allHistory ? null : 0.0625,
        client_measure: allHistory ? 'client_days' : 'estimated_unique_clients',
        identity_available: !allHistory,
        identity_unavailable_reason: allHistory ? 'Exact client profiles are unavailable for all recorded history.' : null,
        mrr: { available: false, reason: 'Exact billing price is not linked to every active subscription.' },
      },
      series: [
        { day: '2026-07-15', channel: 'all', registered_clients: 3, pro_clients: 1 },
        { day: '2026-07-16', channel: 'all', registered_clients: 4, pro_clients: 1 },
        { day: '2026-07-17', channel: 'all', registered_clients: 5, pro_clients: 2 },
      ],
      registered_users: {
        available: true,
        total: 23,
        rows: registeredRows,
      },
      clients: allHistory ? {
        available: false,
        reason: 'Exact client profiles exceed the bounded identity-row limit for this period. Choose a shorter date range.',
        rows: [],
      } : {
        available: true,
        rows: [{
          visitor_kind: 'anonymous',
          client_label: 'anon:abc123',
          plan: 'Free',
          country_code: 'SG',
          first_seen: '2026-07-15T00:00:00Z',
          last_seen: '2026-07-17T07:58:00Z',
          searches: 6,
          top_query: 'database',
        }],
      },
      meta,
    };
  }
  return { error: `No mock for ${path}` };
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

await page.route(`${apiBase}/**`, async (route) => {
  const url = new URL(route.request().url());
  const path = url.pathname.replace('/functions/v1/admin-api', '');
  requests.push({ path, search: url.search });
  requestRound += 1;
  if (requestRound > 4) await new Promise((resolve) => setTimeout(resolve, 450));
  const payload = responseFor(path, url.searchParams);
  await route.fulfill({
    status: payload.error ? 404 : 200,
    headers: { 'access-control-allow-origin': '*' },
    json: payload,
  });
});

try {
  await page.goto(server.url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.fill('#adminSecretInput', 'mock-secret');
  await page.click('#adminSecretSubmitBtn');
  await page.waitForFunction(() => document.querySelector('#kpiClients')?.textContent === '32');

  ok(await page.locator('.nav-button').count() === 3, 'The dashboard must have exactly three navigation sections.');
  ok(await page.getByText('Stats', { exact: true }).count() === 0, 'The Stats section still exists.');
  ok(await page.getByText('Audit Log', { exact: true }).count() === 0, 'The Audit Log section still exists.');
  ok(await page.locator('#kpiSearches').innerText() === '128', 'Real search KPI is incorrect.');
  ok(await page.locator('#kpiZero').innerText() === '6%', 'True zero KPI is incorrect.');
  ok(await page.locator('#kpiLow').innerText() === '5%', 'Low-result KPI is incorrect.');

  const activity = await page.locator('#latestActivity').innerText();
  ok(activity.includes('database'), 'Latest Activity did not render the live query.');
  ok(activity.includes('User query'), 'Latest Activity did not use the approved origin wording.');
  ok(activity.includes('SG'), 'Latest Activity did not render the country.');

  const channelOptions = await page.locator('#channelFilter option').allTextContents();
  ok(channelOptions.some((value) => value.includes('Web (10)')), 'The venue selector does not show live counts.');
  ok(!channelOptions.some((value) => value.startsWith('CLI')), 'An empty venue was not hidden.');
  ok(await page.locator('#searchesChart svg').count() === 1, 'The search chart did not render inline SVG.');
  ok(await page.locator('#qualityChart').innerText().then((text) => !text.includes('No chart')), 'The quality chart did not render.');
  const chartFontSizes = await page.locator('.chart svg text').evaluateAll(
    (nodes) => nodes.map((node) => Number(node.getAttribute('font-size'))),
  );
  ok(chartFontSizes.length > 0, 'The charts did not render any readable labels.');
  ok(chartFontSizes.every((size) => Number.isFinite(size) && size >= 12), 'A chart label is smaller than 12px.');

  await page.click('[data-top-list="returned"]');
  ok((await page.locator('#topListTable').innerText()).includes('linkage is incomplete'), 'Returned-icon coverage was not explained.');
  await page.click('[data-top-list="copied"]');
  ok((await page.locator('#topListTable').innerText()).includes('lucide:database'), 'Copied icons did not render.');

  await page.click('#nav-intelligence');
  await page.waitForSelector('#section-intelligence:not([hidden])');
  ok(await page.locator('[data-row-limit]').count() === 8, 'Every long list must have a row display control.');
  ok(
    await page.locator('[data-panel-toggle]').count() === await page.locator('.panel').count(),
    'Every dashboard panel must have a collapse control.',
  );
  const initialRowLimits = await page.locator('[data-row-limit]').evaluateAll(
    (selects) => selects.map((select) => select.value),
  );
  ok(initialRowLimits.every((value) => value === '25'), 'Long lists must show 25 rows by default.');
  for (const key of ['topList', 'activity', 'queries', 'worklist', 'iconRequests', 'contact', 'registeredUsers', 'clients']) {
    ok(
      await page.locator(`.panel[data-row-key="${key}"] [data-row-limit="${key}"]`).count() === 1,
      `The ${key} row control is attached to the wrong panel.`,
    );
  }
  ok(await page.locator('#queryExplorer tbody tr').count() === 25, 'The query explorer did not apply the 25-row default.');
  await page.selectOption('[data-row-limit="queries"]', '50');
  ok(await page.locator('#queryExplorer tbody tr').count() === 50, 'The query explorer did not apply the 50-row choice.');
  const scrollStyle = await page.locator('#queryExplorer').evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      maxHeight: style.maxHeight,
      overflowY: style.overflowY,
      scrollbarWidth: style.scrollbarWidth,
    };
  });
  ok(scrollStyle.maxHeight !== 'none', 'The query explorer height is not bounded.');
  ok(scrollStyle.overflowY === 'auto', 'The query explorer does not scroll vertically.');
  ok(scrollStyle.scrollbarWidth === 'none', 'The query explorer shows a vertical scrollbar.');
  const queryPanel = page.locator('.panel[data-row-key="queries"]');
  await queryPanel.locator('[data-panel-toggle]').click();
  ok(!(await page.locator('#queryExplorer').isVisible()), 'Collapsing the query explorer did not hide its content.');
  ok(await queryPanel.locator('[data-panel-toggle]').getAttribute('aria-expanded') === 'false', 'The collapsed panel state is not announced.');
  await queryPanel.locator('[data-panel-toggle]').click();
  ok(await page.locator('#queryExplorer').isVisible(), 'Expanding the query explorer did not restore its content.');
  ok((await page.locator('#queryExplorer').innerText()).includes('missing brand'), 'The single query explorer did not render.');
  const healthyRow = page.locator('#queryExplorer tbody tr').filter({ hasText: 'healthy aggregate' });
  ok((await healthyRow.innerText()).includes('Success'), 'A healthy aggregate query was not labelled Success.');
  ok((await healthyRow.innerText()).includes('Not available for aggregate view'), 'Aggregate result and country gaps were not explained.');
  ok(!(await healthyRow.innerText()).includes('Unknown'), 'An aggregate query still shows a false Unknown country pill.');
  const mixedRow = page.locator('#queryExplorer tbody tr').filter({ hasText: 'mixed aggregate' });
  ok((await mixedRow.innerText()).includes('Mixed: 1 of 5 zero'), 'A mixed aggregate query was mislabelled.');
  const iconLookupRow = page.locator('#queryExplorer tbody tr').filter({
    has: page.getByText('icon lookup', { exact: true }),
  });
  ok((await iconLookupRow.innerText()).includes('Success'), 'A successful icon lookup did not render as Success.');
  ok(!(await iconLookupRow.innerText()).includes('Zero'), 'An icon lookup rendered a false Zero pill.');
  ok((await iconLookupRow.innerText()).includes('1'), 'A successful icon lookup did not render one result.');
  const pendingLookupRow = page.locator('#queryExplorer tbody tr').filter({
    has: page.getByText('icon lookup pending', { exact: true }),
  });
  ok((await pendingLookupRow.innerText()).includes('Lookup'), 'An unavailable icon lookup did not render an honest lookup state.');
  ok(!(await pendingLookupRow.innerText()).includes('Zero'), 'An unavailable icon lookup rendered a false Zero pill.');
  ok((await pendingLookupRow.innerText()).includes('Lookup completed'), 'The unavailable icon lookup result state was not explained.');
  ok((await page.locator('#iconRequests').innerText()).includes('migration icon'), 'The icon request inbox did not render.');
  ok((await page.locator('#contactInbox').innerText()).includes('Licensing'), 'The contact inbox did not render.');
  for (const key of ['gap-worklist-csv', 'gap-worklist-json', 'icon-requests-csv', 'icon-requests-json']) {
    ok(await page.locator(`[data-export="${key}"]`).count() === 1, `${key} is missing.`);
  }
  const gapDownload = page.waitForEvent('download');
  await page.click('[data-export="gap-worklist-csv"]');
  ok((await gapDownload).suggestedFilename().endsWith('.csv'), 'The gap worklist CSV export failed.');
  const requestDownload = page.waitForEvent('download');
  await page.click('[data-export="icon-requests-json"]');
  ok((await requestDownload).suggestedFilename().endsWith('.json'), 'The icon request JSON export failed.');
  ok(await page.locator('#diagnosticsDrawer:not([open])').count() === 1, 'Diagnostics should start collapsed.');

  await page.click('#nav-audience');
  ok(await page.locator('#funnelRegistered').innerText() === '5', 'Registered funnel count is incorrect.');
  ok(await page.locator('#funnelPro').innerText() === '2', 'Pro funnel count is incorrect.');
  ok((await page.locator('#registeredUsers').innerText()).includes('pro_monthly'), 'Registered users did not render.');
  ok((await page.locator('#registeredUsersSubtitle').innerText()).includes('23 total users'), 'The registered-user total is missing.');
  ok((await page.locator('#registeredUsers').innerText()).includes('No activity in period'), 'Window-scoped inactive users were hidden.');

  await page.click('[data-window="all"]');
  await page.waitForFunction(() => document.querySelector('#kpiClients')?.textContent === '90');
  ok((await page.locator('#kpiClientsNote').innerText()).includes('Client-days'), 'The All view did not label its client-day estimate.');
  ok(await page.locator('#funnelClients').innerText() === '90', 'The All-view funnel did not render client-days.');
  ok((await page.locator('#funnelClientsNote').innerText()).includes('Client-days'), 'The All-view funnel estimate is not labelled.');
  ok((await page.locator('#audienceChart').innerText()).includes('Client-days'), 'The All-view audience chart did not use the honest client-day fallback.');
  ok((await page.locator('#allClients').innerText()).includes('Choose a shorter date range'), 'The All-view client list did not show its bounded notice.');
  ok((await page.locator('#registeredUsersSubtitle').innerText()).includes('23 total users'), 'The All view hid registered users.');

  await page.click('[data-window="custom"]');
  await page.fill('#customFrom', '2026-07-15');
  await page.fill('#customTo', '2026-07-17');
  await page.click('#applyCustomRange');
  await page.waitForTimeout(700);
  ok(requests.some((request) => request.search.includes('window=custom') && request.search.includes('from=2026-07-15') && request.search.includes('to=2026-07-17')), 'Custom date filters were not sent to the API.');

  const download = page.waitForEvent('download');
  await page.click('[data-export="registered-users"]');
  const downloaded = await download;
  ok(downloaded.suggestedFilename().endsWith('.csv'), 'The list export did not create a CSV file.');

  await page.click('[data-window="30d"]');
  await page.waitForFunction(() => (
    document.querySelector('#refreshButton')?.getAttribute('aria-busy') === 'false'
      && document.querySelector('#freshnessLine')?.textContent?.startsWith('Up to date')
  ), null, { timeout: 5000 });
  const warmStarted = Date.now();
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('#kpiClients')?.textContent === '32');
  const warmMs = Date.now() - warmStarted;
  ok(warmMs < 500, `Warm cached content took ${warmMs} ms to appear.`);

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ok(overflow <= 1, `The dashboard has ${overflow}px of horizontal overflow.`);

  console.log(JSON.stringify({
    status: 'ok',
    requests: requests.length,
    warm_render_ms: warmMs,
    navigation_sections: 3,
    inline_svg_charts: await page.locator('.chart svg').count(),
  }, null, 2));
} finally {
  await browser.close();
  await server.close();
}
