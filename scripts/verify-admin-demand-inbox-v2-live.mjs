import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { chromium } from 'playwright';
import { startAdminDashboardPhaseBLiveServer } from './serve-admin-dashboard-phase-b-live.mjs';

function readArg(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : '';
}

const adminSecret = String(process.env.ADMIN_SECRET || '').trim();
const outputPath = readArg('output')
  || 'references/verification/admin-demand-inbox-v2-live-20260725.json';

assert.ok(adminSecret, 'ADMIN_SECRET must be present in the process environment.');

const dashboard = await startAdminDashboardPhaseBLiveServer({ port: 0 });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const searchRequests = [];

page.on('request', (request) => {
  const url = new URL(request.url());
  if (url.pathname === '/api/admin/v2/search') {
    searchRequests.push({
      include_test: url.searchParams.get('include_test'),
      channel: url.searchParams.get('channel'),
      window: url.searchParams.get('window'),
    });
  }
});

try {
  await page.goto(dashboard.url, { waitUntil: 'domcontentloaded', timeout: 120_000 });
  await page.waitForFunction(() => document.activeElement?.id === 'adminSecretInput');
  await page.fill('#adminSecretInput', adminSecret);
  await page.click('#adminSecretSubmitBtn');
  await page.waitForFunction(() => (
    document.querySelector('#adminSecretModal')?.getAttribute('aria-hidden') === 'true'
  ), null, { timeout: 120_000 });
  await page.click('#nav-intelligence');
  await page.waitForSelector('#section-intelligence:not([hidden])');
  await page.waitForFunction(() => (
    document.querySelectorAll('#gapWorklist tbody tr').length > 0
  ), null, { timeout: 120_000 });

  const headers = await page.locator('#gapWorklist th').allTextContents();
  assert.deepEqual(headers, [
    'Query',
    'Issue',
    'Channel',
    'Language',
    'Country',
    'Result count',
    'Searches',
    'Action',
  ]);

  const visible = await page.locator('#gapWorklist tbody tr').evaluateAll((rows) => rows.map((row) => {
    const cells = [...row.querySelectorAll('td')];
    const select = row.querySelector('[data-query-review]');
    return {
      cell_count: cells.length,
      nonempty_cells: cells.filter((cell) => cell.textContent?.trim()).length,
      option_count: select?.querySelectorAll('option').length || 0,
      has_query: Boolean(select?.getAttribute('data-query')?.trim()),
      has_channel: Boolean(cells[2]?.textContent?.trim()),
      has_language_state: Boolean(cells[3]?.textContent?.trim()),
      has_country_state: Boolean(cells[4]?.textContent?.trim()),
      has_result_state: Boolean(cells[5]?.textContent?.trim()),
      has_search_count: Boolean(cells[6]?.textContent?.trim()),
    };
  }));

  assert.ok(visible.length > 0, 'No real Demand Inbox rows rendered.');
  for (const row of visible) {
    assert.equal(row.cell_count, 8);
    assert.equal(row.nonempty_cells, 8);
    assert.equal(row.option_count, 8);
    assert.ok(row.has_query);
    assert.ok(row.has_channel);
    assert.ok(row.has_language_state);
    assert.ok(row.has_country_state);
    assert.ok(row.has_result_state);
    assert.ok(row.has_search_count);
  }

  const subtitle = await page.locator('#demandInboxSubtitle').innerText();
  assert.ok(subtitle.includes('test traffic excluded'));
  assert.ok(searchRequests.some((request) => (
    request.include_test === 'false'
      && request.channel === 'all'
      && request.window === '1d'
  )));

  const evidence = {
    artifact: 'admin_demand_inbox_v2_live_verification',
    verified_at: new Date().toISOString(),
    status: 'passed',
    period: '24h',
    channel: 'all',
    include_test: false,
    real_rows_rendered: visible.length,
    expected_columns: headers,
    rows_with_complete_visible_states: visible.filter((row) => row.nonempty_cells === 8).length,
    rows_with_all_review_actions: visible.filter((row) => row.option_count === 8).length,
    automatic_product_writes: 0,
  };

  await mkdir(dirname(resolve(outputPath)), { recursive: true });
  await writeFile(resolve(outputPath), `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(evidence, null, 2));
} finally {
  await page.close().catch(() => {});
  await browser.close().catch(() => {});
  await dashboard.close().catch(() => {});
}
