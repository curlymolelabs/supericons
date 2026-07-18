import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';
import { startAdminDashboardPhaseBLiveServer } from './serve-admin-dashboard-phase-b-live.mjs';

const server = await startAdminDashboardPhaseBLiveServer({
  adminSecret: 'browser-contract-only',
  managedAuth: false,
  port: 0,
});
const apiBase = 'https://kcjmkakdhsqplvasgkjv.supabase.co/functions/v1/admin-api';
const requests = [];
const writes = [];
let requestRound = 0;
const registeredRows = Array.from({ length: 23 }, (_, index) => ({
  user_id: `user-${index + 1}`,
  identifier: `u***${index + 1}@example.test`,
  provider: index % 2 === 0 ? 'Google' : 'Email',
  plan: index < 2 ? 'pro_monthly' : 'Free',
  signup_at: `2026-06-${String((index % 23) + 1).padStart(2, '0')}T00:00:00Z`,
  last_active: null,
  searches: index < 3 ? 10 - index : 0,
  venues: index < 3 ? ['web'] : [],
  country_code: index < 3 ? 'SG' : null,
  activity_linked: index < 3,
}));
const accountRows = Array.from({ length: 23 }, (_, index) => ({
  id: `user-${index + 1}`,
  email: `user${index + 1}@example.test`,
  provider: index % 2 === 0 ? 'Google' : 'Email',
  plan: index < 2 ? 'pro_monthly' : null,
  subscription_status: index < 2 ? 'active' : 'free',
  created_at: `2026-06-${String((index % 23) + 1).padStart(2, '0')}T08:15:00Z`,
  last_sign_in_at: `2026-07-${String((index % 17) + 1).padStart(2, '0')}T09:30:00Z`,
  api_key_count: index < 2 ? 1 : 0,
}));
const queryRows = [
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
    activity_count: 5,
    activity_kind: 'search',
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
    activity_count: 5,
    activity_kind: 'search',
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
    result_count_kind: 'exact',
    result_unit: 'match',
    issue_type: 'successful',
    outcome_label: 'Success',
    attempt_count: 0,
    activity_count: 1,
    activity_kind: 'lookup',
    estimated_client_id_count: 1,
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
    activity_count: 1,
    activity_kind: 'lookup',
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
    result_count_kind: 'exact',
    result_unit: 'icon',
    issue_type: 'zero_result',
    outcome_label: 'Zero',
    attempt_count: 5,
    activity_count: 5,
    activity_kind: 'search',
    zero_attempt_count: 5,
    last_seen: '2026-07-17T07:30:00Z',
  },
  {
    query: '=SUM(1,1)',
    library_filter: 'all',
    query_origin: 'agent_query',
    visitor_kind: 'anonymous',
    client_label: '1 client',
    country_code: 'SG',
    country_available: true,
    channel: 'web',
    result_count: 1,
    result_count_available: true,
    result_count_kind: 'exact',
    result_unit: 'icon',
    issue_type: 'successful',
    outcome_label: 'Success',
    attempt_count: 1,
    activity_count: 1,
    activity_kind: 'search',
    zero_attempt_count: 0,
    last_seen: '2026-07-17T07:25:00Z',
  },
  {
    query: 'varying results',
    library_filter: 'lucide',
    query_origin: 'recommend_variant',
    visitor_kind: 'anonymous',
    country_code: 'SG',
    country_available: true,
    channel: 'local_mcp',
    result_count: null,
    result_count_min: 2,
    result_count_max: 8,
    result_count_available: true,
    result_count_kind: 'range_across_attempts',
    result_count_reason: 'Results ranged from 2 to 8 across 4 searches',
    result_unit: 'icon',
    issue_type: 'successful',
    outcome_label: 'Success',
    attempt_count: 4,
    activity_count: 4,
    activity_kind: 'search',
    estimated_client_id_count: 2,
    searcher_details_available: true,
    searchers: [
      {
        label: 'Anonymous a1b2c3',
        kind: 'anonymous',
        account_linked: false,
        searches: 3,
        channels: ['local_mcp'],
        countries: ['SG'],
        first_seen: '2026-07-17T07:10:00Z',
        last_seen: '2026-07-17T07:22:00Z',
      },
      {
        label: 'Registered d4e5f6',
        kind: 'registered',
        account_linked: true,
        searches: 1,
        channels: ['local_mcp'],
        countries: ['SG'],
        first_seen: '2026-07-17T07:21:00Z',
        last_seen: '2026-07-17T07:21:00Z',
      },
    ],
    zero_attempt_count: 0,
    last_seen: '2026-07-17T07:22:00Z',
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
    activity_count: index + 1,
    activity_kind: 'search',
    zero_attempt_count: 0,
    last_seen: '2026-07-17T07:20:00Z',
  })),
];
const clientRows = Array.from({ length: 55 }, (_, index) => ({
  visitor_kind: 'anonymous',
  client_label: `anon:client${index + 1}`,
  plan: 'Free',
  country_code: index % 2 ? 'SG' : 'US',
  first_seen: '2026-07-15T00:00:00Z',
  last_seen: '2026-07-17T07:58:00Z',
  searches: index + 1,
  top_query: `query ${index + 1}`,
}));

function ok(condition, message) {
  if (!condition) throw new Error(message);
}

async function assertPanelActionsStayOnOneLine(page, sectionSelector) {
  const issues = await page.locator(`${sectionSelector} .panel-head`).evaluateAll((heads) => heads.flatMap((head) => {
    if (!(head instanceof HTMLElement) || head.offsetParent === null) return [];
    const actions = head.querySelector(':scope > .panel-actions');
    if (!(actions instanceof HTMLElement)) return [];
    const children = Array.from(actions.children).filter((child) => child instanceof HTMLElement && child.offsetParent !== null);
    if (children.length < 2) return [];
    const rects = children.map((child) => child.getBoundingClientRect());
    const top = Math.min(...rects.map((rect) => rect.top));
    const bottom = Math.max(...rects.map((rect) => rect.bottom));
    const tallest = Math.max(...rects.map((rect) => rect.height));
    const wrapped = bottom - top > tallest + 2;
    const overflowed = actions.scrollWidth > actions.clientWidth + 1 || head.scrollWidth > head.clientWidth + 1;
    if (!wrapped && !overflowed) return [];
    return [{
      panel: head.querySelector('.panel-title')?.textContent?.trim() || 'Unknown panel',
      wrapped,
      overflowed,
    }];
  }));
  ok(issues.length === 0, `Panel actions wrapped or overflowed at 1024px: ${JSON.stringify(issues)}`);
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
      channel_counts: { all: 17, web: 10, hosted_mcp: 7 },
      meta,
    };
  }
  if (path === '/v2/overview') {
    return {
      kpis: {
        estimated_unique_clients: allHistory ? 90 : 32,
        registered_clients: 0,
        pro_clients: 0,
        anonymous_clients: 32,
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
    const page = Number(searchParams.get('page') || 1);
    const pageSize = Number(searchParams.get('page_size') || 25);
    const pageCount = Math.ceil(queryRows.length / pageSize);
    const start = (page - 1) * pageSize;
    return {
      queries: queryRows.slice(start, start + pageSize),
      pagination: {
        page,
        page_size: pageSize,
        total: queryRows.length,
        page_count: pageCount,
      },
      worklist: [{ query: 'missing brand', issue_type: 'zero_result', distinct_clients: 4, attempt_count: 5 }],
      icon_requests: {
        available: true,
        status_available: true,
        rows: [{
          id: '11111111-1111-4111-8111-111111111111',
          request_text: 'A better database migration icon',
          visitor_kind: 'anonymous',
          client_label: 'anon:req123',
          country_code: 'SG',
          status: 'new',
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
    const page = Number(searchParams.get('page') || 1);
    const pageSize = Number(searchParams.get('page_size') || 25);
    const pageCount = Math.ceil(clientRows.length / pageSize);
    const start = (page - 1) * pageSize;
    return {
      funnel: {
        unique_clients: allHistory ? 90 : 32,
        registered_clients: 0,
        registered_percentage: 0,
        pro_clients: 0,
        pro_percentage: 0,
        client_measure: allHistory ? 'client_days' : 'estimated_unique_clients',
        identity_available: !allHistory,
        identity_unavailable_reason: allHistory ? 'Exact client profiles are unavailable for all recorded history.' : null,
        mrr: { available: false, reason: 'Exact billing price is not linked to every active subscription.' },
      },
      series: [
        { day: '2026-07-15', channel: 'all', client_days: 12, registered_clients: 3, pro_clients: 1 },
        { day: '2026-07-16', channel: 'all', client_days: 14, registered_clients: 4, pro_clients: 1 },
        { day: '2026-07-17', channel: 'all', client_days: 13, registered_clients: 5, pro_clients: 2 },
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
        rows: clientRows.slice(start, start + pageSize),
      },
      pagination: {
        page,
        page_size: pageSize,
        total: clientRows.length,
        page_count: pageCount,
      },
      meta,
    };
  }
  if (path === '/users') {
    return {
      users: accountRows,
      pagination: {
        page: 1,
        page_size: 25,
        total: accountRows.length,
        page_count: 1,
      },
    };
  }
  return { error: `No mock for ${path}` };
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1024, height: 1000 } });

await page.route(`${apiBase}/**`, async (route) => {
  const url = new URL(route.request().url());
  const path = url.pathname.replace('/functions/v1/admin-api', '');
  if (route.request().method() === 'POST') {
    const body = route.request().postDataJSON();
    writes.push({ path, body });
    await route.fulfill({
      status: 200,
      headers: { 'access-control-allow-origin': '*' },
      json: {
        success: true,
        review: path.includes('icon-requests')
          ? { icon_evidence_id: body.icon_evidence_id, status: body.status }
          : { normalized_query: body.query, status: body.status },
      },
    });
    return;
  }
  requests.push({ path, search: url.search });
  requestRound += 1;
  if (requestRound > 4) await new Promise((resolve) => setTimeout(resolve, 450));
  const payload = responseFor(path, url.searchParams);
  if (payload?.meta) {
    payload.meta = {
      ...payload.meta,
      view_id: url.searchParams.get('view_id'),
      data_cutoff: url.searchParams.get('data_cutoff'),
      filter_key: url.searchParams.get('filter_key'),
    };
  }
  await route.fulfill({
    status: payload.error ? 404 : 200,
    headers: { 'access-control-allow-origin': '*' },
    json: payload,
  });
});

try {
  await page.goto(server.url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  ok(await page.locator('#adminSecretModal').getAttribute('role') === 'dialog', 'The admin access prompt has no dialog role.');
  ok(await page.locator('#adminSecretModal').getAttribute('aria-modal') === 'true', 'The admin access prompt is not modal.');
  await page.waitForFunction(() => document.activeElement?.id === 'adminSecretInput');
  await page.focus('#adminSecretSubmitBtn');
  await page.keyboard.press('Tab');
  ok(await page.evaluate(() => document.activeElement?.id === 'adminSecretInput'), 'Tab escaped the admin access dialog.');
  await page.fill('#adminSecretInput', 'mock-secret');
  await page.click('#adminSecretSubmitBtn');
  await page.waitForFunction(() => document.querySelector('#kpiClients')?.textContent === '32');
  const initialV2Requests = requests.filter((request) => request.path.startsWith('/v2/')).slice(0, 4);
  for (const field of ['view_id', 'data_cutoff', 'filter_key']) {
    const values = new Set(initialV2Requests.map((request) => new URLSearchParams(request.search).get(field)));
    ok(values.size === 1 && !values.has(null), `Initial v2 requests do not share one ${field}.`);
  }

  ok(await page.locator('.nav-button').count() === 3, 'The dashboard must have exactly three navigation sections.');
  const unnamedControls = await page.locator('button, input, select').evaluateAll((elements) => elements.flatMap((element) => {
    if (!(element instanceof HTMLElement) || element.offsetParent === null) return [];
    const label = element.getAttribute('aria-label')
      || element.getAttribute('title')
      || element.textContent?.trim()
      || element.closest('label')?.textContent?.trim();
    return label ? [] : [element.outerHTML.slice(0, 120)];
  }));
  ok(unnamedControls.length === 0, `Visible controls lack accessible names: ${JSON.stringify(unnamedControls)}`);
  ok(
    await page.locator('[data-window="30d"]').getAttribute('aria-pressed') === 'true',
    'The selected dashboard period is not announced.',
  );
  const unfocusableScrollRegions = await page.locator('.scroll-region').evaluateAll(
    (regions) => regions.filter((region) => region.tabIndex < 0).map((region) => region.id || region.className),
  );
  ok(unfocusableScrollRegions.length === 0, `Scroll regions are not keyboard reachable: ${unfocusableScrollRegions.join(', ')}`);
  ok(await page.getByText('Stats', { exact: true }).count() === 0, 'The Stats section still exists.');
  ok(await page.getByText('Audit Log', { exact: true }).count() === 0, 'The Audit Log section still exists.');
  ok(await page.locator('#kpiSearches').innerText() === '128', 'Real search KPI is incorrect.');
  ok(await page.locator('#kpiZero').innerText() === '6%', 'True zero KPI is incorrect.');
  ok(await page.locator('#kpiLow').innerText() === '5%', 'Low-result KPI is incorrect.');
  const reachNote = await page.locator('#kpiClientsNote').innerText();
  ok(reachNote.includes('32 searchers'), 'Estimated reach does not identify the selected-period searcher count.');
  ok(!reachNote.includes('registered'), 'The filtered reach card mixes in all-time registered-account totals.');
  ok(!reachNote.includes('Pro'), 'The filtered reach card mixes in all-time Pro-account totals.');
  await assertPanelActionsStayOnOneLine(page, '#section-overview:not([hidden])');

  const activity = await page.locator('#latestActivity').innerText();
  ok(activity.includes('database'), 'Latest Activity did not render the live query.');
  ok(activity.includes('User query'), 'Latest Activity did not use the approved origin wording.');
  ok(activity.includes('SG'), 'Latest Activity did not render the country.');

  const channelOptions = await page.locator('#channelFilter option').allTextContents();
  ok(channelOptions.some((value) => value.includes('Web (10)')), 'The venue selector does not show live counts.');
  ok(channelOptions.some((value) => value === 'Local MCP (0)'), 'The stable venue selector hides Local MCP when its count is zero.');
  ok(channelOptions.every((value) => !value.startsWith('CLI')), 'The venue selector advertises an unused CLI venue.');
  ok(channelOptions.every((value) => !value.startsWith('API')), 'The venue selector advertises an unused API venue.');
  ok(await page.locator('#searchesChart svg').count() === 1, 'The search chart did not render inline SVG.');
  await page.click('[data-search-chart-mode="total"]');
  ok(await page.locator('[data-search-chart-mode="total"]').getAttribute('aria-pressed') === 'true', 'The total search chart mode was not selected.');
  ok((await page.locator('#searchesChart').innerText()).includes('Total'), 'The total search chart legend is missing.');
  await page.click('[data-search-chart-mode="venue"]');
  ok(await page.locator('#qualityChart').innerText().then((text) => !text.includes('No chart')), 'The quality chart did not render.');
  const chartFontSizes = await page.locator('#section-overview .chart svg text').evaluateAll(
    (nodes) => nodes.map((node) => {
      const svg = node.ownerSVGElement;
      const scale = svg.getBoundingClientRect().width / svg.viewBox.baseVal.width;
      return Number(node.getAttribute('font-size')) * scale;
    }),
  );
  ok(chartFontSizes.length > 0, 'The charts did not render any readable labels.');
  ok(chartFontSizes.every((size) => Number.isFinite(size) && size >= 12), 'A rendered chart label is smaller than 12px.');

  await page.click('[data-top-list="returned"]');
  ok((await page.locator('#topListTable').innerText()).includes('linkage is incomplete'), 'Returned-icon coverage was not explained.');
  await page.click('[data-top-list="copied"]');
  ok((await page.locator('#topListTable').innerText()).includes('lucide:database'), 'Copied icons did not render.');
  await page.click('[data-top-list="zero"]');
  await page.click('[data-open-worklist="missing brand"]');
  await page.waitForSelector('#section-intelligence:not([hidden])');
  ok(await page.locator('#explorerSearch').inputValue() === 'missing brand', 'Top zero did not open the matching worklist query.');
  await page.waitForFunction(() => (
    document.querySelector('#queryExplorer tbody tr')
      && document.querySelector('#refreshButton')?.getAttribute('aria-busy') === 'false'
  ));

  await page.click('#nav-intelligence');
  await page.waitForSelector('#section-intelligence:not([hidden])');
  await assertPanelActionsStayOnOneLine(page, '#section-intelligence:not([hidden])');
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
  ok(await page.locator('[data-pagination="queries"] [data-page-number="1"]').count() === 1, 'Query page 1 is missing.');
  ok(await page.locator('[data-pagination="queries"] [data-page-number="2"]').count() === 1, 'Query page 2 is missing.');
  ok(await page.locator('[data-pagination="queries"] [data-page-number="3"]').count() === 1, 'Query page 3 is missing.');
  ok(await page.locator('[data-pagination="queries"] [data-page-next]').count() === 1, 'The query Next button is missing.');
  await page.click('[data-pagination="queries"] [data-page-number="2"]');
  await page.waitForFunction(() => document.querySelector('[data-pagination="queries"] [aria-current="page"]')?.textContent === '2');
  ok(requests.some((request) => request.path === '/v2/search' && request.search.includes('page=2') && request.search.includes('page_size=25')), 'Query page 2 was not requested from the API.');
  await page.click('[data-pagination="queries"] [data-page-number="1"]');
  await page.waitForFunction(() => document.querySelector('[data-pagination="queries"] [aria-current="page"]')?.textContent === '1');
  await page.selectOption('[data-row-limit="queries"]', '50');
  await page.waitForFunction(() => document.querySelectorAll('#queryExplorer tbody tr').length === 50);
  ok(requests.some((request) => request.path === '/v2/search' && request.search.includes('page_size=50')), 'The 50-row query page was not requested from the API.');
  const unrelatedBeforeExplorerFilter = requests.filter((request) => request.path !== '/v2/search').length;
  const filteredSearchRequest = page.waitForRequest((request) => (
    request.url().includes('/functions/v1/admin-api/v2/search')
    && new URL(request.url()).searchParams.get('q')?.includes('healthy')
  ));
  await page.fill('#explorerSearch', 'healthy');
  await filteredSearchRequest;
  await page.waitForFunction(() => document.querySelector('#refreshButton')?.getAttribute('aria-busy') === 'false');
  ok(
    requests.filter((request) => request.path !== '/v2/search').length === unrelatedBeforeExplorerFilter,
    'Explorer filtering reloaded an unrelated dashboard endpoint.',
  );
  const clearedSearchRequest = page.waitForRequest((request) => (
    request.url().includes('/functions/v1/admin-api/v2/search')
    && !new URL(request.url()).searchParams.get('q')
  ));
  await page.fill('#explorerSearch', '');
  await clearedSearchRequest;
  await page.waitForFunction(() => document.querySelector('#refreshButton')?.getAttribute('aria-busy') === 'false');
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
  ok(await page.locator('[data-panel-toggle] svg').count() === await page.locator('[data-panel-toggle]').count(), 'Collapse controls must use icons.');
  const toggleLabels = await page.locator('[data-panel-toggle]').evaluateAll((buttons) => buttons.map((button) => button.textContent.trim()));
  ok(toggleLabels.every((label) => label === ''), 'Collapse controls still waste space on text labels.');
  const gapPanel = page.locator('.panel[data-row-key="worklist"]');
  const requestPanel = page.locator('.panel[data-row-key="iconRequests"]');
  await gapPanel.locator('[data-panel-toggle]').click();
  ok(await gapPanel.evaluate((panel) => panel.classList.contains('is-collapsed')), 'The gap worklist did not collapse.');
  ok(await requestPanel.evaluate((panel) => panel.classList.contains('is-collapsed')), 'The paired icon request panel did not collapse with the gap worklist.');
  await requestPanel.locator('[data-panel-toggle]').click();
  ok(!(await gapPanel.evaluate((panel) => panel.classList.contains('is-collapsed'))), 'The paired gap worklist did not expand with icon requests.');
  ok((await page.locator('#queryExplorer').innerText()).includes('missing brand'), 'The single query explorer did not render.');
  ok(await page.locator('.panel[data-row-key="queries"] .panel-title').innerText() === 'Query summary', 'The grouped table is still labelled like an event explorer.');
  const queryHeaders = await page.locator('#queryExplorer th').allTextContents();
  ok(queryHeaders.includes('Activity'), 'The query summary does not show recorded activity.');
  ok(queryHeaders.includes('Returned'), 'The query summary does not label returned values.');
  ok(!queryHeaders.includes('Client'), 'The query summary still presents privacy-safe identifiers as people.');
  const varyingRow = page.locator('#queryExplorer tbody tr').filter({ hasText: 'varying results' });
  ok((await varyingRow.innerText()).includes('4 searches'), 'Grouped activity is not shown as a search count.');
  ok((await varyingRow.innerText()).includes('2 searchers'), 'Grouped activity does not show its searcher count.');
  ok((await varyingRow.innerText()).includes('2 to 8 icons'), 'Varying grouped results are not shown as a range.');
  await varyingRow.locator('[data-searcher-details]').click();
  ok(await page.locator('#searcherDetailsModal').getAttribute('aria-hidden') === 'false', 'Searcher details did not open.');
  ok((await page.locator('#searcherDetailsContent').innerText()).includes('Anonymous a1b2c3'), 'Searcher details omitted the masked searcher label.');
  ok((await page.locator('#searcherDetailsContent').innerText()).includes('Account linked'), 'Searcher details omitted the account-link status.');
  await page.click('#closeSearcherDetails');
  ok(await page.locator('#searcherDetailsModal').getAttribute('aria-hidden') === 'true', 'Searcher details did not close.');
  ok(!(await varyingRow.innerText()).includes('min'), 'A grouped result range still uses the ambiguous minimum label.');
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
  ok((await iconLookupRow.innerText()).includes('1 lookup'), 'A successful icon lookup did not render its activity count.');
  ok((await iconLookupRow.innerText()).includes('1 searcher'), 'A singular searcher label is incorrect.');
  ok((await iconLookupRow.innerText()).includes('1 match'), 'A successful icon lookup did not render one match.');
  const pendingLookupRow = page.locator('#queryExplorer tbody tr').filter({
    has: page.getByText('icon lookup pending', { exact: true }),
  });
  ok((await pendingLookupRow.innerText()).includes('Lookup'), 'An unavailable icon lookup did not render an honest lookup state.');
  ok(!(await pendingLookupRow.innerText()).includes('Zero'), 'An unavailable icon lookup rendered a false Zero pill.');
  ok((await pendingLookupRow.innerText()).includes('Lookup completed'), 'The unavailable icon lookup result state was not explained.');
  ok((await page.locator('#iconRequests').innerText()).includes('migration icon'), 'The icon request inbox did not render.');
  ok((await page.locator('#contactInbox').innerText()).includes('Licensing'), 'The contact inbox did not render.');
  await page.selectOption('[data-query-review]', 'needs_alias');
  await page.waitForFunction(() => window.__operatorWriteWait === undefined);
  await page.waitForTimeout(50);
  ok(writes.some((write) => write.path === '/intelligence/search/review' && write.body.status === 'needs_alias'), 'Gap WHY triage did not save through the existing review boundary.');
  await page.selectOption('[data-icon-request-review]', 'planned');
  await page.waitForTimeout(50);
  ok(writes.some((write) => write.path === '/v2/icon-requests/review' && write.body.status === 'planned'), 'Icon request status did not save.');
  for (const key of ['gap-worklist-csv', 'gap-worklist-json', 'icon-requests-csv', 'icon-requests-json', 'contact-csv', 'contact-json']) {
    ok(await page.locator(`[data-export="${key}"]`).count() === 1, `${key} is missing.`);
  }
  const gapDownload = page.waitForEvent('download');
  await page.click('[data-export="gap-worklist-csv"]');
  ok((await gapDownload).suggestedFilename().endsWith('.csv'), 'The gap worklist CSV export failed.');
  const requestDownload = page.waitForEvent('download');
  await page.click('[data-export="icon-requests-json"]');
  ok((await requestDownload).suggestedFilename().endsWith('.json'), 'The icon request JSON export failed.');
  const contactDownload = page.waitForEvent('download');
  await page.click('[data-export="contact-csv"]');
  ok((await contactDownload).suggestedFilename().endsWith('.csv'), 'The contact CSV export failed.');
  const queryDownload = page.waitForEvent('download');
  await page.click('[data-export="queries-csv"]');
  const queryExport = await queryDownload;
  const queryExportPath = await queryExport.path();
  const queryExportText = await readFile(queryExportPath, 'utf8');
  ok(queryExportText.split(/\r?\n/).filter(Boolean).length === queryRows.length + 1, 'The query export contains only the visible page.');
  ok(queryExportText.includes("\"'=SUM(1,1)\""), 'The query CSV leaves a spreadsheet formula active.');
  ok(await page.locator('#diagnosticsDrawer:not([open])').count() === 1, 'Diagnostics should start collapsed.');

  await page.click('#nav-audience');
  await page.waitForSelector('#section-audience:not([hidden])');
  await assertPanelActionsStayOnOneLine(page, '#section-audience:not([hidden])');
  ok((await page.locator('#section-audience').innerText()).includes('Reach and accounts'), 'Separate reach and account totals are still presented as one funnel.');
  ok(!(await page.locator('#section-audience').innerText()).includes('Audience funnel'), 'The audience section still claims separate populations form a funnel.');
  ok(await page.locator('#funnelRegistered').innerText() === '23', 'Registered funnel count is incorrect.');
  ok(await page.locator('#funnelPro').innerText() === '2', 'Pro funnel count is incorrect.');
  ok(
    await page.locator('#funnelClients').innerText() === await page.locator('#kpiClients').innerText(),
    'Overview and Audience estimated reach disagree for the same view.',
  );
  ok(await page.locator('#funnelRegisteredSpark svg').count() === 1, 'The registered funnel sparkline is missing.');
  ok(await page.locator('#funnelProSpark svg').count() === 1, 'The Pro funnel sparkline is missing.');
  ok(await page.locator('#audienceChart svg').getAttribute('aria-label') === 'Account-linked searchers over time', 'The audience chart does not explain that it measures API-key-linked search activity.');
  ok((await page.locator('#registeredUsers').innerText()).includes('pro_monthly'), 'Registered users did not render.');
  ok((await page.locator('#registeredUsersSubtitle').innerText()).includes('23 accounts in all recorded history'), 'The registered-account scope is missing.');
  ok(await page.locator('#toggleRegisteredEmails svg').count() === 1, 'The email visibility icon is missing.');
  ok(!(await page.locator('#registeredUsers').innerText()).includes('user1@example.test'), 'Full emails must start hidden.');
  ok((await page.locator('#registeredUsers').innerText()).includes('u***@example.test'), 'Masked emails are missing.');
  await page.click('#toggleRegisteredEmails');
  ok((await page.locator('#registeredUsers').innerText()).includes('user1@example.test'), 'The email visibility control did not reveal emails.');
  const enrichedRegisteredRow = page.locator('#registeredUsers tbody tr').filter({ hasText: 'user1@example.test' });
  ok((await enrichedRegisteredRow.innerText()).includes('10'), 'Registered-user search activity was discarded.');
  ok((await enrichedRegisteredRow.innerText()).includes('Web'), 'Registered-user venue enrichment was discarded.');
  const firstRegisteredRow = page.locator('#registeredUsers tbody tr').first();
  const registeredHeaders = await page.locator('#registeredUsers th').allTextContents();
  ok(registeredHeaders.includes('Last sign-in'), 'The account sign-in time is not separate.');
  ok(registeredHeaders.includes('Last search'), 'The linked search time is not separate.');
  ok(/\d{1,2}:\d{2}/.test(await firstRegisteredRow.innerText()), 'Signup and activity timestamps are missing their time.');
  ok(await page.locator('[data-pagination="clients"] [data-page-next]').count() === 1, 'The client list Next button is missing.');
  await page.click('[data-pagination="clients"] [data-page-next]');
  await page.waitForFunction(() => document.querySelector('[data-pagination="clients"] [aria-current="page"]')?.textContent === '2');
  ok(requests.some((request) => request.path === '/v2/audience' && request.search.includes('page=2') && request.search.includes('page_size=25')), 'Client page 2 was not requested from the API.');

  await page.click('[data-window="all"]');
  await page.waitForFunction(() => document.querySelector('#kpiClients')?.textContent === '90');
  ok((await page.locator('#kpiClientsNote').innerText()).includes('Daily reach'), 'The All view did not label its daily reach estimate.');
  ok(await page.locator('#funnelClients').innerText() === '90', 'The All-view funnel did not render daily reach.');
  ok((await page.locator('#funnelClientsNote').innerText()).includes('Daily reach'), 'The All-view funnel estimate is not labelled.');
  ok((await page.locator('#audienceChart').innerText()).includes('Daily reach'), 'The All-view audience chart did not use the honest daily reach fallback.');
  ok((await page.locator('#allClients').innerText()).includes('Choose a shorter date range'), 'The All-view client list did not show its bounded notice.');
  ok((await page.locator('#registeredUsersSubtitle').innerText()).includes('23 accounts in all recorded history'), 'The All view hid registered accounts.');

  await page.click('[data-window="custom"]');
  await page.fill('#customFrom', '2026-07-15');
  await page.fill('#customTo', '2026-07-17');
  await page.click('#applyCustomRange');
  await page.waitForTimeout(700);
  ok(requests.some((request) => request.search.includes('window=custom') && request.search.includes('from=2026-07-15') && request.search.includes('to=2026-07-17')), 'Custom date filters were not sent to the API.');
  ok(
    requests.filter((request) => request.path === '/users').length === 1,
    'Filter changes reloaded the all-account directory.',
  );

  const download = page.waitForEvent('download');
  await page.click('[data-export="registered-users"]');
  const downloaded = await download;
  ok(downloaded.suggestedFilename().endsWith('.csv'), 'The list export did not create a CSV file.');

  const thirtyDayOverviewResponse = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return url.pathname.endsWith('/v2/overview')
      && url.searchParams.get('window') === '30d';
  });
  await page.click('[data-window="30d"]');
  await thirtyDayOverviewResponse;
  await page.waitForFunction(() => (
    document.querySelector('#refreshButton')?.getAttribute('aria-busy') === 'false'
      && document.querySelector('#freshnessLine')?.textContent?.startsWith('Up to date')
  ), null, { timeout: 5000 });
  const cachedOverviewBeforeReload = await page.evaluate(() => {
    const key = Object.keys(window.localStorage)
      .find((candidate) => candidate.includes('si_admin_dashboard_v2_cache:overview:'));
    return key ? JSON.parse(window.localStorage.getItem(key) || 'null') : null;
  });
  ok(
    cachedOverviewBeforeReload?.payload?.__partial === true
      && cachedOverviewBeforeReload?.payload?.kpis?.estimated_unique_clients === 32,
    `The warm aggregate Overview cache was not written before reload: ${JSON.stringify(cachedOverviewBeforeReload)}`,
  );
  await page.reload({ waitUntil: 'domcontentloaded' });
  ok(await page.locator('#adminSecretModal.open').count() === 1, 'Direct development mode persisted its secret across reload.');
  ok(
    await page.evaluate(() => (
      window.sessionStorage.getItem('si_admin_secret') === null
      && window.localStorage.getItem('si_admin_secret') === null
    )),
    'Direct development mode stored the admin secret.',
  );
  const cacheKeysAfterReload = await page.evaluate(() => Object.keys(window.localStorage));
  ok(
    cacheKeysAfterReload.some((candidate) => candidate.endsWith(
      ':overview:/v2/overview?window=30d&channel=all&include_test=false',
    )),
    `Reload removed the warm aggregate Overview cache: ${JSON.stringify(cacheKeysAfterReload)}`,
  );
  await page.fill('#adminSecretInput', 'mock-secret');
  await page.evaluate(() => {
    window.__warmRenderStartedAt = performance.now();
    window.__warmRenderAt = null;
    const target = document.querySelector('#kpiClients');
    const observer = new MutationObserver(() => {
      if (target?.textContent === '32') {
        window.__warmRenderAt = performance.now();
        observer.disconnect();
      }
    });
    observer.observe(target, { childList: true, characterData: true, subtree: true });
  });
  await page.click('#adminSecretSubmitBtn');
  await page.waitForFunction(() => Number.isFinite(window.__warmRenderAt), null, { polling: 20 });
  const warmMs = await page.evaluate(() => window.__warmRenderAt - window.__warmRenderStartedAt);
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
