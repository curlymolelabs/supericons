import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { chromium } from 'playwright';
import { startAdminDashboardPhaseBLiveServer } from './serve-admin-dashboard-phase-b-live.mjs';

function readArg(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : '';
}

const projectRef = 'kcjmkakdhsqplvasgkjv';
const adminSecret = String(process.env.ADMIN_SECRET || '').trim();
const accessToken = String(process.env.SUPABASE_ACCESS_TOKEN || '').trim();
const outputPath = readArg('output')
  || 'references/verification/admin-gaps-user-requests-v2-live-20260726.json';
const screenshotPath = readArg('screenshot');
const managementQueryUrl = `https://api.supabase.com/v1/projects/${projectRef}/database/query`;

assert.ok(adminSecret, 'ADMIN_SECRET must be present in the process environment.');
assert.ok(accessToken, 'SUPABASE_ACCESS_TOKEN must be present in the process environment.');

async function queryDatabase(query) {
  const response = await fetch(managementQueryUrl, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });
  const bodyText = await response.text();
  assert.equal(response.ok, true, `The production database query failed with HTTP ${response.status}.`);
  return bodyText ? JSON.parse(bodyText) : [];
}

const [candidate] = await queryDatabase(`
  select
    e.id,
    count(*) over ()::integer as unreviewed_request_count
  from public.icon_evidence e
  left join public.admin_icon_request_reviews r
    on r.icon_evidence_id = e.id
  where e.signal_type = 'search_attempt'
    and e.ui_surface = 'grid_empty_feedback'
    and nullif(trim(e.evidence_text), '') is not null
    and e.domain = 'supericons.dev'
    and e.created_at >= now() - interval '30 days'
    and r.icon_evidence_id is null
  order by e.created_at desc
  limit 1
`);

assert.ok(candidate?.id, 'No unreviewed production user request exists in the 30-day window.');
assert.match(candidate.id, /^[0-9a-f-]{36}$/i, 'The selected evidence ID is malformed.');

const dashboard = await startAdminDashboardPhaseBLiveServer({ port: 0 });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const searchRequests = [];
const verificationNote = `Live persistence check ${new Date().toISOString()}`;
let reviewWritten = false;
let reviewCleaned = false;
let gapRowsRendered = 0;
let userRequestRowsRendered = 0;

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

async function unlockDashboard() {
  await page.waitForFunction(() => document.querySelector('#adminSecretModal'));
  const modalHidden = await page.locator('#adminSecretModal').getAttribute('aria-hidden');
  if (modalHidden !== 'true') {
    await page.waitForFunction(() => document.activeElement?.id === 'adminSecretInput');
    await page.fill('#adminSecretInput', adminSecret);
    await page.click('#adminSecretSubmitBtn');
    await page.waitForFunction(() => (
      document.querySelector('#adminSecretModal')?.getAttribute('aria-hidden') === 'true'
    ), null, { timeout: 120_000 });
  }
}

async function openThirtyDaySearches() {
  await page.click('#nav-intelligence');
  await page.waitForSelector('#section-intelligence:not([hidden])');
  await page.click('[data-window="30d"]');
  await page.waitForFunction(() => (
    document.querySelectorAll('#gapWorklist tbody tr').length > 0
      && document.querySelectorAll('#iconRequests tbody tr').length > 0
  ), null, { timeout: 120_000 });
}

try {
  await page.goto(dashboard.url, { waitUntil: 'domcontentloaded', timeout: 120_000 });
  await unlockDashboard();
  await openThirtyDaySearches();

  const panelOrder = await page.locator('#section-intelligence > .panel').evaluateAll((panels) => (
    panels.map((panel) => panel.getAttribute('data-row-key'))
  ));
  assert.ok(
    panelOrder.indexOf('queries') < panelOrder.indexOf('worklist')
      && panelOrder.indexOf('worklist') < panelOrder.indexOf('iconRequests'),
    `Search history, Gaps, and User requests are in the wrong order: ${JSON.stringify(panelOrder)}`,
  );

  const gapHeaders = await page.locator('#gapWorklist th').evaluateAll((headers) => (
    headers.map((header) => header.textContent.replace(/\s+/g, ' ').trim())
  ));
  assert.deepEqual(gapHeaders, [
    'Query',
    'Issue',
    'Channel',
    'Language',
    'Country',
    'Result count',
    'Searches',
    'Action',
  ]);

  const requestHeaders = await page.locator('#iconRequests th').evaluateAll((headers) => (
    headers.map((header) => header.textContent.replace(/\s+/g, ' ').trim())
  ));
  assert.deepEqual(requestHeaders, ['User request', 'Review']);
  const requestRows = await page.locator('#iconRequests tbody tr').evaluateAll((rows) => rows.map((row) => {
    const primary = row.querySelector('td:first-child strong')?.textContent?.trim() || '';
    const secondary = row.querySelector('td:first-child .activity-meta')?.textContent?.trim() || '';
    return {
      has_human_sentence: primary.length > 0,
      has_failed_query: secondary.includes('Failed query:'),
      has_library: secondary.includes('Library:'),
      has_date: secondary.split('|').length >= 3,
      has_status: Boolean(row.querySelector('[data-icon-request-status]')),
      has_note: Boolean(row.querySelector('[data-icon-request-note]')),
      has_save: Boolean(row.querySelector('[data-icon-request-save]')),
    };
  }));
  gapRowsRendered = await page.locator('#gapWorklist tbody tr').count();
  userRequestRowsRendered = requestRows.length;
  assert.ok(requestRows.length > 0, 'No real user requests rendered in the 30-day period.');
  for (const row of requestRows) {
    assert.equal(row.has_human_sentence, true);
    assert.equal(row.has_failed_query, true);
    assert.equal(row.has_library, true);
    assert.equal(row.has_date, true);
    assert.equal(row.has_status, true);
    assert.equal(row.has_note, true);
    assert.equal(row.has_save, true);
  }

  if (screenshotPath) {
    await page.locator('#gapWorklist td:first-child strong').evaluateAll((nodes) => {
      nodes.forEach((node) => {
        node.textContent = '[query hidden]';
      });
    });
    await page.locator('#iconRequests td:first-child').evaluateAll((nodes) => {
      nodes.forEach((node) => {
        node.innerHTML = '<strong>[request hidden]</strong><div class="activity-meta">Failed query, library, and date verified</div>';
      });
    });
    await mkdir(dirname(resolve(screenshotPath)), { recursive: true });
    await page.screenshot({ path: resolve(screenshotPath), fullPage: true });
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 120_000 });
    await unlockDashboard();
    await openThirtyDaySearches();
  }

  const review = page.locator(`[data-icon-request-review][data-request-id="${candidate.id}"]`);
  assert.equal(await review.count(), 1, 'The selected real user request did not render.');
  await review.locator('[data-icon-request-status]').selectOption('planned');
  await review.locator('[data-icon-request-note]').fill(verificationNote);
  const savedResponse = page.waitForResponse((response) => (
    response.request().method() === 'POST'
      && response.url().includes('/api/admin/v2/icon-requests/review')
  ));
  await review.locator('[data-icon-request-save]').click();
  const saveResult = await savedResponse;
  assert.equal(saveResult.ok(), true, 'The production review write failed.');
  reviewWritten = true;

  await page.waitForFunction(({ id, note }) => {
    const row = document.querySelector(`[data-icon-request-review][data-request-id="${id}"]`);
    return row?.querySelector('[data-icon-request-status]')?.value === 'planned'
      && row?.querySelector('[data-icon-request-note]')?.value === note;
  }, { id: candidate.id, note: verificationNote }, { timeout: 120_000 });

  await page.reload({ waitUntil: 'domcontentloaded', timeout: 120_000 });
  await unlockDashboard();
  await openThirtyDaySearches();
  await page.waitForFunction(({ id, note }) => {
    const row = document.querySelector(`[data-icon-request-review][data-request-id="${id}"]`);
    return row?.querySelector('[data-icon-request-status]')?.value === 'planned'
      && row?.querySelector('[data-icon-request-note]')?.value === note;
  }, { id: candidate.id, note: verificationNote }, { timeout: 120_000 });

  assert.ok(searchRequests.some((request) => (
    request.include_test === 'false'
      && request.channel === 'all'
      && request.window === '30d'
  )));
} finally {
  if (reviewWritten) {
    const cleanupRows = await queryDatabase(`
      delete from public.admin_icon_request_reviews
      where icon_evidence_id = '${candidate.id}'::uuid
        and note = '${verificationNote.replaceAll("'", "''")}'
      returning icon_evidence_id
    `).catch(() => []);
    reviewCleaned = cleanupRows.length === 1;
  }
  await page.close().catch(() => {});
  await browser.close().catch(() => {});
  await dashboard.close().catch(() => {});
}

assert.equal(reviewWritten, true, 'The live review persistence check did not run.');
assert.equal(reviewCleaned, true, 'The temporary live review was not removed.');

const evidence = {
  artifact: 'admin_gaps_user_requests_v2_live_verification',
  verified_at: new Date().toISOString(),
  status: 'passed',
  period: '30d',
  channel: 'all',
  include_test: false,
  gaps_rows_rendered: gapRowsRendered,
  user_request_rows_rendered: userRequestRowsRendered,
  user_request_filter: {
    signal_type: 'search_attempt',
    ui_surface: 'grid_empty_feedback',
    production_domain: 'supericons.dev',
  },
  user_request_fields_verified: [
    'request_text',
    'failed_query',
    'library_filter',
    'created_at',
    'status',
    'note',
  ],
  review_persisted_after_page_reload: true,
  temporary_review_removed: true,
  automatic_product_writes: 0,
};

await mkdir(dirname(resolve(outputPath)), { recursive: true });
await writeFile(resolve(outputPath), `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(evidence, null, 2));
