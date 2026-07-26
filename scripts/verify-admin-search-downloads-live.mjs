import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

import { chromium } from 'playwright';

import { startAdminDashboardPhaseBLiveServer } from './serve-admin-dashboard-phase-b-live.mjs';

function readArg(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : '';
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function safeIdentity(value) {
  const normalized = String(value || '').trim();
  return normalized ? sha256(normalized).slice(0, 16) : null;
}

function parseCsv(source) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (quoted) {
      if (character === '"' && source[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        cell += character;
      }
    } else if (character === '"') {
      quoted = true;
    } else if (character === ',') {
      row.push(cell);
      cell = '';
    } else if (character === '\n') {
      row.push(cell.replace(/\r$/, ''));
      rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += character;
    }
  }
  if (cell || row.length) {
    row.push(cell.replace(/\r$/, ''));
    rows.push(row);
  }
  const nonemptyRows = rows.filter((values) => values.some((value) => value !== ''));
  const headers = nonemptyRows.shift() || [];
  return {
    headers,
    rows: nonemptyRows.map((values) => Object.fromEntries(
      headers.map((header, index) => [header, values[index] ?? '']),
    )),
  };
}

function eventMatchesSafeEpisode(event, expectedSafeEpisode) {
  if (!expectedSafeEpisode) return false;
  return [event?.episode_id, event?.recovery_chain_id]
    .map(safeIdentity)
    .includes(expectedSafeEpisode);
}

function inGateWindow(event, gate) {
  const observed = Date.parse(String(event?.recorded_at || ''));
  const started = Date.parse(String(gate?.started_at || ''));
  const ended = Date.parse(String(gate?.data_cutoff || ''));
  return Number.isFinite(observed)
    && Number.isFinite(started)
    && Number.isFinite(ended)
    && observed >= started
    && observed <= ended;
}

function probeById(gate, id) {
  const probe = (gate.probes || []).find((candidate) => Number(candidate.id) === id);
  assert.ok(probe, `Gate probe ${id} is missing.`);
  return probe;
}

function safeFinalEpisode(probe) {
  const rows = probe?.observed?.final_rows || [];
  assert.equal(rows.length, 1, `Probe ${probe.id} must have exactly one final row.`);
  assert.ok(rows[0].episode_id, `Probe ${probe.id} final episode identity is missing.`);
  return rows[0].episode_id;
}

async function waitForDashboardIdle(page) {
  await page.waitForFunction(() => (
    document.querySelector('#refreshButton')?.getAttribute('aria-busy') === 'false'
    && document.querySelector('#freshnessLine')?.textContent?.startsWith('Updated')
  ), null, { timeout: 120_000 });
}

async function downloadArtifact(page, selector, { menu = false } = {}) {
  if (menu && !(await page.locator('#searchDownloadPopover').isVisible())) {
    await page.click('#searchDownloadToggle');
  }
  const downloadPromise = page.waitForEvent('download', { timeout: 180_000 });
  await page.click(selector);
  const download = await downloadPromise;
  const path = await download.path();
  assert.ok(path, `Download ${selector} has no local file.`);
  const bytes = await readFile(path);
  return {
    filename: download.suggestedFilename(),
    bytes,
    sha256: sha256(bytes),
  };
}

async function downloadSearchSet(page) {
  const summary = await downloadArtifact(page, '[data-export="search-summary-csv"]');
  const requestLog = await downloadArtifact(page, '[data-export="request-log-csv"]', {
    menu: true,
  });
  const auditBundle = await downloadArtifact(page, '[data-export="audit-bundle-json"]', {
    menu: true,
  });
  return {
    summary: {
      ...summary,
      parsed: parseCsv(summary.bytes.toString('utf8')),
    },
    request_log: {
      ...requestLog,
      parsed: parseCsv(requestLog.bytes.toString('utf8')),
    },
    audit_bundle: {
      ...auditBundle,
      parsed: JSON.parse(auditBundle.bytes.toString('utf8')),
    },
  };
}

function assertDownloadContract(
  downloads,
  includeTest,
  { allowControlledHistoryWarning = false } = {},
) {
  assert.match(
    downloads.summary.filename,
    /^supericons-search-summary-24h-\d{8}T\d{6}Z\.csv$/,
  );
  assert.match(
    downloads.request_log.filename,
    /^supericons-request-log-24h-\d{8}T\d{6}Z\.csv$/,
  );
  assert.match(
    downloads.audit_bundle.filename,
    /^supericons-audit-bundle-24h-\d{8}T\d{6}Z\.json$/,
  );
  assert.equal(downloads.summary.parsed.headers.length, 20);
  assert.equal(downloads.request_log.parsed.headers.length, 33);
  assert.ok(downloads.summary.parsed.headers.includes('interface_locales'));
  assert.ok(downloads.request_log.parsed.headers.includes('interface_locale'));
  assert.ok(downloads.request_log.parsed.headers.includes('geo_source'));

  const audit = downloads.audit_bundle.parsed;
  assert.equal(audit.export_schema_version, '4.1');
  assert.equal(audit.export_type, 'audit_bundle');
  assert.equal(audit.filters?.include_test, includeTest);
  assert.ok(
    String(audit.source_meta?.filter_key || '').includes(`include_test=${includeTest}`),
    'Audit source filter metadata disagrees with the requested test scope.',
  );
  assert.equal(audit.search_summary?.length, downloads.summary.parsed.rows.length);
  assert.equal(audit.request_log?.length, downloads.request_log.parsed.rows.length);
  const failedIntegrityChecks = Object.entries(audit.integrity_checks?.checks || {})
    .filter(([, passed]) => passed !== true)
    .map(([name]) => name);
  assert.equal(audit.integrity_checks?.semantic_status, 'passed');
  assert.equal(Number(audit.source_reconciliation?.counts?.pending_rows || 0), 0);
  const unexplainedRows = Number(
    audit.source_reconciliation?.counts?.unexplained_rows || 0,
  );
  if (allowControlledHistoryWarning && unexplainedRows > 0) {
    const unexplainedDiagnostics = (audit.diagnostics || []).filter(
      (event) => event.diagnostic_accounting_status === 'unexplained',
    );
    assert.equal(unexplainedDiagnostics.length, unexplainedRows);
    assert.ok(unexplainedDiagnostics.every(
      (event) => event.traffic_class === 'controlled_test',
    ));
    assert.deepEqual(failedIntegrityChecks, ['source_reconciliation_passes']);
    assert.equal(audit.integrity_checks?.status, 'needs_attention');
    assert.equal(audit.integrity_checks?.structural_status, 'needs_attention');
    assert.equal(audit.integrity_checks?.checks?.source_reconciliation_passes, false);
    assert.equal(audit.source_reconciliation?.status, 'needs_attention');
  } else {
    assert.equal(
      audit.integrity_checks?.status,
      'passed',
      `Audit integrity needs attention: ${JSON.stringify({
        structural_status: audit.integrity_checks?.structural_status || null,
        semantic_status: audit.integrity_checks?.semantic_status || null,
        failed_checks: failedIntegrityChecks,
        counts: audit.integrity_checks?.counts || {},
        warnings: audit.integrity_checks?.warnings || {},
        source_reconciliation_status: audit.source_reconciliation?.status || null,
      })}`,
    );
    assert.equal(audit.integrity_checks?.structural_status, 'passed');
    assert.equal(audit.integrity_checks?.checks?.source_reconciliation_passes, true);
    assert.equal(audit.source_reconciliation?.status, 'passed');
    assert.equal(unexplainedRows, 0);
  }
  assert.equal(
    audit.source_reconciliation?.checks?.diagnostics_kept_out_of_product_rows,
    true,
  );
  assert.equal(
    Number(audit.integrity_checks?.counts?.summary_requests),
    Number(audit.integrity_checks?.counts?.groupable_primary_events),
  );
  return audit;
}

function requestMetadataFor(requests, includeTest) {
  const expected = String(includeTest);
  const matching = requests.filter((request) => (
    request.include_test === expected
    && request.filter_key.includes(`include_test=${expected}`)
  ));
  return {
    matching_requests: matching.length,
    search_requests: matching.filter((request) => request.path === '/api/admin/v2/search').length,
    event_requests: matching.filter((request) => request.path === '/api/admin/v2/search/events').length,
  };
}

function publicDownloadEvidence(downloads, audit) {
  return {
    filenames: {
      search_summary: downloads.summary.filename,
      request_log: downloads.request_log.filename,
      audit_bundle: downloads.audit_bundle.filename,
    },
    file_sha256: {
      search_summary: downloads.summary.sha256,
      request_log: downloads.request_log.sha256,
      audit_bundle: downloads.audit_bundle.sha256,
    },
    rows: {
      search_summary: downloads.summary.parsed.rows.length,
      request_log: downloads.request_log.parsed.rows.length,
      web_searches: audit.web_searches.length,
      diagnostics: audit.diagnostics.length,
    },
    product_requests: Number(audit.integrity_checks.counts.summary_requests),
    source_reconciliation: {
      status: audit.source_reconciliation.status,
      pending_rows: Number(audit.source_reconciliation.counts.pending_rows || 0),
      unexplained_rows: Number(audit.source_reconciliation.counts.unexplained_rows || 0),
      unexplained_rows_are_controlled_test_history: (
        Number(audit.source_reconciliation.counts.unexplained_rows || 0) > 0
        && (audit.diagnostics || [])
          .filter((event) => event.diagnostic_accounting_status === 'unexplained')
          .every((event) => event.traffic_class === 'controlled_test')
      ),
      explained_exclusions: Number(audit.source_reconciliation.counts.explained_exclusions || 0),
      audit_linkage_counts: audit.source_reconciliation.audit_linkage_counts,
      web_diagnostic_linkage_counts:
        audit.source_reconciliation.web_diagnostic_linkage_counts,
      usage_accounting_counts: audit.source_reconciliation.usage_accounting_counts,
    },
    integrity: {
      status: audit.integrity_checks.status,
      structural_status: audit.integrity_checks.structural_status,
      semantic_status: audit.integrity_checks.semantic_status,
      summary_requests: Number(audit.integrity_checks.counts.summary_requests || 0),
      groupable_primary_events: Number(
        audit.integrity_checks.counts.groupable_primary_events || 0,
      ),
    },
  };
}

const adminSecret = String(
  process.env.ADMIN_SECRET || process.env.PHASE_A_ADMIN_SECRET || '',
).trim();
const outputPath = resolve(readArg('output'));
const gatePath = resolve(readArg('gate-evidence'));
const deployedAdminApiVersion = Number(readArg('admin-api-version'));
assert.ok(adminSecret, 'ADMIN_SECRET must be available from a private local source.');
assert.ok(readArg('output'), 'Provide --output.');
assert.ok(readArg('gate-evidence'), 'Provide --gate-evidence.');
assert.ok(
  Number.isInteger(deployedAdminApiVersion) && deployedAdminApiVersion > 0,
  'Provide --admin-api-version.',
);

const gate = JSON.parse(await readFile(gatePath, 'utf8'));
assert.equal(gate.status, 'passed');
assert.equal(gate.stable_search_fingerprint_comparison?.status, 'passed');
const webProbe = probeById(gate, 1);
const hostedProbe = probeById(gate, 2);
const localProbe = probeById(gate, 3);
const unsignedGatewayProbe = probeById(gate, 4);
const signedGatewayProbe = probeById(gate, 5);
const controlledEpisodes = {
  web: safeFinalEpisode(webProbe),
  hosted_mcp: safeFinalEpisode(hostedProbe),
  local_mcp: safeFinalEpisode(localProbe),
};

const evidence = {
  schema_version: 1,
  artifact: 'admin_search_downloads_live_verification',
  status: 'running',
  generated_at_utc: null,
  deployed_admin_api_version: deployedAdminApiVersion,
  gate_evidence_sha256: sha256(await readFile(gatePath)),
  checks: {},
  default_scope: null,
  included_test_scope: null,
};

const dashboard = await startAdminDashboardPhaseBLiveServer({ port: 0 });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  acceptDownloads: true,
  viewport: { width: 1440, height: 1000 },
});
const apiRequests = [];
page.on('request', (request) => {
  const url = new URL(request.url());
  if (!['/api/admin/v2/search', '/api/admin/v2/search/events'].includes(url.pathname)) return;
  apiRequests.push({
    path: url.pathname,
    include_test: url.searchParams.get('include_test') || '',
    filter_key: url.searchParams.get('filter_key') || '',
  });
});

try {
  await page.goto(dashboard.url, {
    waitUntil: 'domcontentloaded',
    timeout: 120_000,
  });
  await page.fill('#adminSecretInput', adminSecret);
  await page.click('#adminSecretSubmitBtn');
  await page.waitForFunction(() => (
    document.querySelector('#adminSecretModal')?.getAttribute('aria-hidden') === 'true'
  ), null, { timeout: 30_000 });
  await waitForDashboardIdle(page);
  await page.click('#nav-intelligence');
  await page.waitForSelector('#section-intelligence:not([hidden])');
  assert.equal(await page.locator('#includeSearchTestTraffic').isChecked(), false);
  assert.match(
    await page.locator('#searchHistorySubtitle').innerText(),
    /test traffic excluded/i,
  );

  const defaultDownloads = await downloadSearchSet(page);
  const defaultAudit = assertDownloadContract(defaultDownloads, false);
  const defaultPrimary = [
    ...defaultAudit.request_log,
    ...defaultAudit.web_searches,
  ];
  for (const expectedSafeEpisode of Object.values(controlledEpisodes)) {
    assert.equal(
      defaultPrimary.some((event) => eventMatchesSafeEpisode(event, expectedSafeEpisode)),
      false,
      'Default product data includes a controlled probe.',
    );
  }

  const includeRequestStart = apiRequests.length;
  const includedSearchRequest = page.waitForRequest((request) => {
    const url = new URL(request.url());
    return url.pathname === '/api/admin/v2/search'
      && url.searchParams.get('include_test') === 'true';
  }, { timeout: 120_000 });
  await page.check('#includeSearchTestTraffic');
  await includedSearchRequest;
  await waitForDashboardIdle(page);
  assert.equal(await page.locator('#includeSearchTestTraffic').isChecked(), true);
  assert.match(
    await page.locator('#searchHistorySubtitle').innerText(),
    /test traffic included/i,
  );
  const includedDownloads = await downloadSearchSet(page);
  const includedAudit = assertDownloadContract(includedDownloads, true, {
    allowControlledHistoryWarning: true,
  });
  const includedPrimary = [
    ...includedAudit.request_log,
    ...includedAudit.web_searches,
  ];
  const expectedPrimaryLocations = {
    web: includedAudit.web_searches,
    hosted_mcp: includedAudit.request_log,
    local_mcp: includedAudit.request_log,
  };
  for (const [channel, expectedSafeEpisode] of Object.entries(controlledEpisodes)) {
    const matches = expectedPrimaryLocations[channel]
      .filter((event) => eventMatchesSafeEpisode(event, expectedSafeEpisode));
    assert.equal(matches.length, 1, `Controlled ${channel} final is missing or duplicated.`);
    assert.equal(matches[0].traffic_class, 'controlled_test');
  }

  const directProbeEvidence = [
    unsignedGatewayProbe,
    signedGatewayProbe,
  ].map((probe) => {
    const diagnosticMatches = includedAudit.diagnostics.filter((event) => (
      event.query === probe.exact_query
      && inGateWindow(event, gate)
      && event.diagnostic_accounting_status === 'explained_unlinked_gateway_diagnostic'
    ));
    const primaryMatches = includedPrimary.filter((event) => (
      event.query === probe.exact_query
      && inGateWindow(event, gate)
    ));
    assert.equal(diagnosticMatches.length, 1, `Gateway probe ${probe.id} diagnostic is missing.`);
    assert.equal(primaryMatches.length, 0, `Gateway probe ${probe.id} entered product data.`);
    return {
      probe_id: Number(probe.id),
      diagnostics: diagnosticMatches.length,
      product_rows: primaryMatches.length,
    };
  });

  const defaultMetadata = requestMetadataFor(
    apiRequests.slice(0, includeRequestStart),
    false,
  );
  const includedMetadata = requestMetadataFor(
    apiRequests.slice(includeRequestStart),
    true,
  );
  assert.ok(defaultMetadata.search_requests > 0);
  assert.ok(defaultMetadata.event_requests > 0);
  assert.ok(includedMetadata.search_requests > 0);
  assert.ok(includedMetadata.event_requests > 0);

  evidence.checks = {
    authenticated_live_admin_api: true,
    all_six_downloads_completed: true,
    filenames_and_schemas_match: true,
    request_metadata_matches_visible_filter: true,
    export_metadata_matches_visible_filter: true,
    default_product_totals_exclude_controlled_probes: true,
    controlled_web_hosted_local_finals_present_once: true,
    controlled_local_final_classification_preserved: true,
    gateway_probes_are_diagnostics_only: true,
    no_fourth_product_channel: includedPrimary.every((event) => (
      ['web', 'hosted_mcp', 'local_mcp'].includes(event.channel)
    )),
    default_source_reconciliation_passed:
      defaultAudit.source_reconciliation?.status === 'passed',
    included_test_scope_is_honest: (
      includedAudit.source_reconciliation?.status === 'passed'
      || (
        includedAudit.source_reconciliation?.status === 'needs_attention'
        && Number(includedAudit.source_reconciliation?.counts?.unexplained_rows || 0) > 0
        && includedAudit.diagnostics
          .filter((event) => event.diagnostic_accounting_status === 'unexplained')
          .every((event) => event.traffic_class === 'controlled_test')
      )
    ),
    audit_integrity_truthfully_reported: true,
  };
  assert.ok(Object.values(evidence.checks).every(Boolean));
  evidence.default_scope = {
    ...publicDownloadEvidence(defaultDownloads, defaultAudit),
    request_metadata: defaultMetadata,
    controlled_product_probe_rows: 0,
  };
  evidence.included_test_scope = {
    ...publicDownloadEvidence(includedDownloads, includedAudit),
    request_metadata: includedMetadata,
    controlled_product_probe_rows: Object.values(controlledEpisodes).length,
    direct_gateway_probes: directProbeEvidence,
    product_channels: [...new Set(includedPrimary.map((event) => event.channel))].sort(),
  };
  evidence.status = includedAudit.source_reconciliation?.status === 'passed'
    ? 'passed_after_repair'
    : 'passed_with_test_history_warning';
} catch (error) {
  evidence.status = 'failed';
  evidence.failure = {
    name: error?.name || 'Error',
    message: String(error?.message || error).slice(0, 400),
  };
  throw error;
} finally {
  evidence.generated_at_utc = new Date().toISOString();
  await browser.close();
  await dashboard.close();
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({
    status: evidence.status,
    output: outputPath,
  }, null, 2));
}
