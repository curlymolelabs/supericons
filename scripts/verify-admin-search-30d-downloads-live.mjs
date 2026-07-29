import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

import { chromium } from 'playwright';

import { startAdminDashboardPhaseBLiveServer } from './serve-admin-dashboard-phase-b-live.mjs';

const adminSecret = String(
  process.env.ADMIN_SECRET
  || process.env.SUPERICONS_ADMIN_SECRET
  || '',
).trim();
assert.ok(adminSecret, 'ADMIN_SECRET is required.');

function hash(value) {
  return createHash('sha256').update(value).digest('hex');
}

function csvRowCount(source) {
  let rows = 0;
  let quoted = false;
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (character === '"' && quoted && source[index + 1] === '"') {
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === '\n' && !quoted) {
      rows += 1;
    }
  }
  if (source && !source.endsWith('\n')) rows += 1;
  return rows;
}

async function waitForDashboard(page) {
  await page.waitForFunction(() => (
    document.querySelector('#refreshButton')?.getAttribute('aria-busy') === 'false'
    && document.querySelector('#freshnessLine')?.textContent?.startsWith('Updated')
  ), null, { timeout: 180_000 });
}

async function download(page, selector) {
  if (!(await page.locator('#searchDownloadPopover').isVisible())) {
    await page.click('#searchDownloadToggle');
  }
  const startedAt = performance.now();
  const pending = page.waitForEvent('download', { timeout: 600_000 });
  await page.click(selector);
  const artifact = await pending;
  const path = await artifact.path();
  assert.ok(path, `Download ${selector} did not produce a file.`);
  const bytes = await readFile(path);
  return {
    bytes,
    duration_ms: Math.round(performance.now() - startedAt),
    filename: artifact.suggestedFilename(),
    sha256: hash(bytes),
  };
}

const server = await startAdminDashboardPhaseBLiveServer({ port: 0 });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const eventRequests = [];
const browserErrors = [];
page.on('request', (request) => {
  const url = new URL(request.url());
  if (url.pathname.endsWith('/v2/search/events')) {
    eventRequests.push(Object.fromEntries(url.searchParams));
  }
});
page.on('console', (message) => {
  if (message.type() === 'error') browserErrors.push(message.text());
});
page.on('pageerror', (error) => browserErrors.push(error.message));

try {
  await page.goto(server.url, { waitUntil: 'domcontentloaded', timeout: 120_000 });
  await page.fill('#adminSecretInput', adminSecret);
  await page.click('#adminSecretSubmitBtn');
  await waitForDashboard(page);
  await page.click('#nav-intelligence');
  await page.click('[data-window="30d"]');
  await waitForDashboard(page);

  const requestLog = await download(page, '[data-export="request-log-csv"]');
  const auditBundle = await download(page, '[data-export="audit-bundle-json"]');
  const requestLogText = requestLog.bytes.toString('utf8');
  const audit = JSON.parse(auditBundle.bytes.toString('utf8'));

  assert.match(requestLog.filename, /^supericons-request-log-30d-\d{8}T\d{6}Z\.csv$/);
  assert.match(auditBundle.filename, /^supericons-audit-bundle-30d-\d{8}T\d{6}Z\.json$/);
  assert.equal(audit.period?.key, '30d');
  assert.equal(audit.filters?.include_test, false);
  assert.equal(audit.source_meta?.export_partition_count, 5);
  assert.equal(audit.source_meta?.export_partitions?.length, 5);
  assert.equal(audit.source_reconciliation?.partition_count, 5);
  assert.ok(
    ['passed', 'needs_attention'].includes(audit.source_reconciliation?.status),
    'The audit bundle did not retain reconciliation results.',
  );
  assert.equal(csvRowCount(requestLogText), audit.request_log.length + 1);
  assert.ok(audit.request_log.length > 0);
  assert.ok(audit.diagnostics.length > 0);

  const firstPageRequests = eventRequests.filter((request) => request.page === '1');
  const partitionKeys = new Set(firstPageRequests.map((request) => (
    `${request.event_scope}:${request.from}:${request.to}`
  )));
  assert.equal(partitionKeys.size, 10);
  assert.ok(firstPageRequests.every((request) => request.page_size === '500'));
  assert.ok(firstPageRequests.every((request) => request.window === 'custom'));
  assert.equal(browserErrors.length, 0, `Browser errors: ${browserErrors.join(' | ')}`);

  console.log(JSON.stringify({
    status: 'passed',
    request_log: {
      rows: audit.request_log.length,
      bytes: requestLog.bytes.length,
      duration_ms: requestLog.duration_ms,
      sha256: requestLog.sha256,
    },
    audit_bundle: {
      search_summary_rows: audit.search_summary.length,
      request_log_rows: audit.request_log.length,
      web_search_rows: audit.web_searches.length,
      diagnostic_rows: audit.diagnostics.length,
      bytes: auditBundle.bytes.length,
      duration_ms: auditBundle.duration_ms,
      sha256: auditBundle.sha256,
      source_reconciliation_status: audit.source_reconciliation.status,
      unexplained_rows: Number(audit.source_reconciliation?.counts?.unexplained_rows || 0),
    },
    partitions: audit.source_meta.export_partitions,
  }, null, 2));
} finally {
  await browser.close();
  await server.close();
}
