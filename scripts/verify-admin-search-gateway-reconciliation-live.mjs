import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import {
  StdioClientTransport,
} from '@modelcontextprotocol/sdk/client/stdio.js';
import {
  StreamableHTTPClientTransport,
} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { chromium } from 'playwright';

import { createControlledRunHeaders } from '../mcp/controlled-run-auth.js';

export const RECONCILIATION_GRACE_SECONDS = 120;
const REST_PAGE_SIZE = 1000;
const PRODUCT_SETTLEMENT_TIMEOUT_MS = 60_000;
const SOURCE_SETTLEMENT_POLL_MS = 5_000;
const DEFAULT_WEBSITE_URL = 'https://supericons.dev/?view=icons';
const DEFAULT_GATEWAY_URL = 'https://mcp.supericons.dev/search-icons';

function readArg(name, fallback = '') {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

function requiredArg(name) {
  const value = readArg(name);
  assert.ok(value, `Provide --${name}.`);
  return value;
}

function parseEnvFile(path) {
  const values = {};
  const source = readFileSync(path, 'utf8');
  for (const line of source.split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    values[match[1]] = value;
  }
  return values;
}

function compactTime(value = new Date()) {
  return value.toISOString().replace(/\D/g, '').slice(0, 14);
}

function text(value) {
  return String(value ?? '').trim();
}

function normalizeQuery(value) {
  return text(value).toLowerCase().replace(/\s+/g, ' ');
}

function sha256(value) {
  return createHash('sha256').update(String(value)).digest('hex');
}

function safeIdentity(value) {
  const normalized = text(value);
  return normalized ? sha256(normalized).slice(0, 16) : null;
}

function sanitizeDiagnosticText(value) {
  return text(value)
    .replace(/\u001b\[[0-9;]*m/g, '')
    .replace(
      /\b(authorization|apikey|api[-_ ]?key|token|secret|signature|cookie)\b\s*[:=]\s*(?:bearer\s+)?[^\s,;]+/gi,
      '$1=[redacted]',
    )
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, '[token]')
    .replace(/https?:\/\/[^\s)]+/gi, (rawUrl) => {
      try {
        const parsed = new URL(rawUrl);
        return `${parsed.origin}${parsed.pathname}`;
      } catch {
        return '[url]';
      }
    })
    .replace(/[A-Za-z]:\\(?:[^\\\s]+\\)*[^\\\s]*/g, '[local path]')
    .replace(/\b[A-Za-z0-9_-]{80,}\b/g, '[long value]')
    .slice(0, 400);
}

function observeBrowserErrors(page) {
  const errors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') {
      errors.push(sanitizeDiagnosticText(message.text()));
    }
  });
  page.on('pageerror', (error) => {
    errors.push(sanitizeDiagnosticText(error?.message || String(error)));
  });
  return errors;
}

async function waitForIconViewReadiness(page, websiteUrl) {
  await page.goto(websiteUrl, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.locator('#app').waitFor({ state: 'visible', timeout: 60_000 });
  const search = page.locator('#searchInput');
  let usedVisibleStartSearchingAction = false;
  if (!await search.isVisible()) {
    const startSearching = page.locator('#heroSearchBtn');
    await startSearching.waitFor({ state: 'visible', timeout: 60_000 });
    await startSearching.click();
    usedVisibleStartSearchingAction = true;
  }
  await search.waitFor({ state: 'visible', timeout: 60_000 });
  await page.waitForFunction(() => (
    !document.body?.classList.contains('landing-active')
    && document.querySelector('#searchInput') instanceof HTMLInputElement
  ), null, { timeout: 60_000 });
  return {
    search,
    usedVisibleStartSearchingAction,
  };
}

function browserControlledRequestKind(request, {
  gatewayUrl,
  webTelemetryOrigin,
}) {
  if (request.method() !== 'POST') return null;
  const url = new URL(request.url());
  const gateway = new URL(gatewayUrl);
  if (url.origin === gateway.origin && url.pathname === gateway.pathname) {
    return 'hosted_search';
  }
  if (
    url.origin === webTelemetryOrigin
    && url.pathname.endsWith('/functions/v1/web-search-telemetry')
  ) {
    return 'web_telemetry';
  }
  return null;
}

function safeSourceRow(row, timeField = 'created_at') {
  return {
    source_id: safeIdentity(row.id || row.episode_id || row.diagnostic_id),
    event_id: safeIdentity(row.event_id),
    request_id: safeIdentity(row.request_id),
    dedupe_key: safeIdentity(row.dedupe_key),
    episode_id: safeIdentity(row.episode_id),
    recovery_chain_id: safeIdentity(row.recovery_chain_id),
    attempt_id: safeIdentity(row.attempt_id),
    source_event_id: safeIdentity(row.source_event_id),
    channel: row.channel || null,
    environment: row.environment || null,
    traffic_class: row.traffic_class || row.metadata?.traffic_class || null,
    beta_cohort: row.beta_cohort || null,
    tool_name: row.tool_name || null,
    query: row.query || row.query_norm || null,
    result_count: row.result_count ?? row.final_match_count ?? null,
    outcome: row.search_outcome || row.final_outcome || row.status || null,
    observed_at: row[timeField] || null,
  };
}

function stableFingerprint(payload) {
  const stable = {
    http_status: Number(payload.http_status || 0) || null,
    result_count: Number(payload.result_count || 0),
    ordered_icon_refs: Array.isArray(payload.ordered_icon_refs)
      ? payload.ordered_icon_refs.map(text).filter(Boolean)
      : [],
    search_execution: payload.search_execution || null,
    error_code: payload.error_code || null,
    retryable: payload.retryable ?? null,
    structured_fields: Array.isArray(payload.structured_fields)
      ? [...payload.structured_fields].map(text).filter(Boolean).sort()
      : [],
  };
  return {
    ...stable,
    sha256: sha256(JSON.stringify(stable)),
  };
}

function parseToolPayload(result) {
  if (result?.structuredContent && typeof result.structuredContent === 'object') {
    return result.structuredContent;
  }
  const textPart = (result?.content || []).find((part) => part?.type === 'text');
  assert.ok(textPart?.text, 'MCP tool returned no structured or JSON text payload.');
  return JSON.parse(textPart.text);
}

function toolRefs(payload) {
  return (payload?.results || [])
    .map((row) => row?.icon_ref || row?.icon_id || (
      row?.library && row?.id ? `${row.library}:${row.id}` : null
    ))
    .filter(Boolean);
}

function classifyGrace(observedAt, reconciliationCutoff) {
  const observedMs = Date.parse(observedAt);
  const cutoffMs = Date.parse(reconciliationCutoff);
  assert.ok(Number.isFinite(observedMs), 'Observed time is invalid.');
  assert.ok(Number.isFinite(cutoffMs), 'Reconciliation cutoff is invalid.');
  return observedMs >= cutoffMs ? 'pending_linkage' : 'outside_grace';
}

function verifyGraceBoundaryFixture() {
  const cutoff = '2026-07-24T12:00:00.000Z';
  assert.equal(classifyGrace('2026-07-24T12:00:00.001Z', cutoff), 'pending_linkage');
  assert.equal(classifyGrace('2026-07-24T12:00:00.000Z', cutoff), 'pending_linkage');
  assert.equal(classifyGrace('2026-07-24T11:59:59.999Z', cutoff), 'outside_grace');
}

async function restRows({
  supabaseUrl,
  serviceRoleKey,
  table,
  select,
  timeField,
  startedAt,
  endedAt,
}) {
  const rows = [];
  for (let offset = 0; ; offset += REST_PAGE_SIZE) {
    const url = new URL(`${supabaseUrl.replace(/\/+$/, '')}/rest/v1/${table}`);
    url.searchParams.set('select', select);
    url.searchParams.append(timeField, `gte.${startedAt}`);
    url.searchParams.append(timeField, `lte.${endedAt}`);
    url.searchParams.set('order', `${timeField}.asc`);
    const response = await fetch(url, {
      headers: {
        apikey: serviceRoleKey,
        authorization: `Bearer ${serviceRoleKey}`,
        range: `${offset}-${offset + REST_PAGE_SIZE - 1}`,
      },
      signal: AbortSignal.timeout(30_000),
    });
    const payload = await response.json().catch(() => null);
    assert.equal(
      response.status,
      200,
      `Production read for ${table} failed with HTTP ${response.status}.`,
    );
    assert.ok(Array.isArray(payload), `${table} returned invalid JSON.`);
    rows.push(...payload);
    if (payload.length < REST_PAGE_SIZE) break;
  }
  return rows;
}

async function readSources(config, startedAt, endedAt) {
  const common = {
    supabaseUrl: config.supabaseUrl,
    serviceRoleKey: config.serviceRoleKey,
    startedAt,
    endedAt,
  };
  const [audits, usage, finals, diagnostics] = await Promise.all([
    restRows({
      ...common,
      table: 'search_request_audit',
      timeField: 'created_at',
      select: [
        'id',
        'query_norm',
        'source',
        'result_count',
        'search_outcome',
        'status',
        'channel',
        'environment',
        'request_id',
        'dedupe_key',
        'episode_id',
        'recovery_chain_id',
        'attempt_id',
        'attempt_number',
        'beta_cohort',
        'execution_route',
        'created_at',
      ].join(','),
    }),
    restRows({
      ...common,
      table: 'mcp_usage_events',
      timeField: 'created_at',
      select: [
        'id',
        'event_id',
        'request_id',
        'dedupe_key',
        'event_type',
        'channel',
        'environment',
        'tool_name',
        'query_norm',
        'result_count',
        'search_outcome',
        'status',
        'beta_cohort',
        'search_request_audit_id',
        'metadata',
        'created_at',
      ].join(','),
    }),
    restRows({
      ...common,
      table: 'search_final_outcomes',
      timeField: 'completed_at',
      select: [
        'id',
        'episode_id',
        'recovery_chain_id',
        'source_event_id',
        'channel',
        'query',
        'environment',
        'traffic_class',
        'tool_name',
        'final_match_count',
        'final_outcome',
        'settlement_state',
        'completed_at',
        'metadata',
      ].join(','),
    }),
    restRows({
      ...common,
      table: 'search_episode_diagnostics',
      timeField: 'observed_at',
      select: [
        'diagnostic_id',
        'episode_id',
        'recovery_chain_id',
        'diagnostic_type',
        'channel',
        'query',
        'hosted_match_count',
        'hosted_state',
        'environment',
        'traffic_class',
        'observed_at',
        'metadata',
      ].join(','),
    }),
  ]);
  return { audits, usage, finals, diagnostics };
}

async function runWebsitePreflight({ websiteUrl, gatewayUrl }) {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  const page = await context.newPage();
  const browserErrors = observeBrowserErrors(page);
  const watchedPosts = [];
  page.on('request', (request) => {
    if (request.method() !== 'POST') return;
    const url = new URL(request.url());
    const gateway = new URL(gatewayUrl);
    if (
      (url.origin === gateway.origin && url.pathname === gateway.pathname)
      || url.pathname.endsWith('/functions/v1/web-search-telemetry')
    ) {
      watchedPosts.push({
        destination: `${url.origin}${url.pathname}`,
      });
    }
  });

  try {
    const readiness = await waitForIconViewReadiness(page, websiteUrl);
    const { search } = readiness;
    await delay(1_000);
    return {
      route_after_readiness: page.url(),
      application_visible: await page.locator('#app').isVisible(),
      icon_view_active: await page.locator('body:not(.landing-active)').count() === 1,
      search_input_visible: await search.isVisible(),
      search_input_value: await search.inputValue(),
      used_visible_start_searching_action: readiness.usedVisibleStartSearchingAction,
      hidden_desktop_toggle_clicked: false,
      watched_post_count: watchedPosts.length,
      watched_posts: watchedPosts,
      browser_error_count: browserErrors.length,
      browser_error_samples: browserErrors.slice(0, 5),
    };
  } finally {
    await context.close();
    await browser.close();
  }
}

async function runWebsiteProbe({
  websiteUrl,
  gatewayUrl,
  webTelemetryOrigin,
  query,
  controlledHeaders,
}) {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  await context.route('**/*', async (route) => {
    const request = route.request();
    const controlledRequestKind = browserControlledRequestKind(request, {
      gatewayUrl,
      webTelemetryOrigin,
    });
    if (controlledRequestKind) {
      await route.continue({
        headers: {
          ...request.headers(),
          ...controlledHeaders,
        },
      });
      return;
    }
    await route.continue();
  });
  const page = await context.newPage();
  const observed = {
    search_requests: [],
    telemetry_requests: [],
    signed_request_destinations: [],
  };
  const browserErrors = observeBrowserErrors(page);
  page.on('request', (request) => {
    const url = new URL(request.url());
    const controlledRequestKind = browserControlledRequestKind(request, {
      gatewayUrl,
      webTelemetryOrigin,
    });
    if (controlledRequestKind) {
      observed.signed_request_destinations.push(controlledRequestKind);
    }
    if (controlledRequestKind === 'hosted_search') {
      observed.search_requests.push({
        destination: `${url.origin}${url.pathname}`,
        body: request.postDataJSON(),
      });
    }
    if (controlledRequestKind === 'web_telemetry') {
      observed.telemetry_requests.push({
        destination: `${url.origin}${url.pathname}`,
        body: request.postDataJSON(),
      });
    }
  });

  try {
    const { search } = await waitForIconViewReadiness(page, websiteUrl);
    const hostedResponsePromise = page.waitForResponse(
      (response) => browserControlledRequestKind(response.request(), {
        gatewayUrl,
        webTelemetryOrigin,
      }) === 'hosted_search',
      { timeout: 60_000 },
    );
    const telemetryResponsePromise = page.waitForResponse(
      (response) => browserControlledRequestKind(response.request(), {
        gatewayUrl,
        webTelemetryOrigin,
      }) === 'web_telemetry',
      { timeout: 60_000 },
    );
    await search.fill(query);
    await search.press('Enter');
    const hostedResponse = await hostedResponsePromise;
    const hostedPayload = await hostedResponse.json();
    const telemetryResponse = await telemetryResponsePromise;
    await delay(1_000);
    const visibleIconCells = await page.locator('.icon-cell').count();
    const requestBody = observed.search_requests.at(-1)?.body || {};
    const telemetryBodies = observed.telemetry_requests.map((entry) => entry.body);
    return {
      episode_id: requestBody.episode_id || requestBody.id || null,
      recovery_chain_id: requestBody.episode_id || requestBody.id || null,
      visible_icon_cells: visibleIconCells,
      hosted_http_status: hostedResponse.status(),
      telemetry_http_status: telemetryResponse.status(),
      telemetry_bodies: telemetryBodies,
      signed_request_destinations: [...new Set(observed.signed_request_destinations)],
      console_errors: browserErrors,
      fingerprint: stableFingerprint({
        http_status: hostedResponse.status(),
        result_count: (hostedPayload.results || []).length,
        ordered_icon_refs: (hostedPayload.results || []).map((row) => row.icon_id),
        search_execution: hostedPayload.search_runtime?.mode || null,
        structured_fields: Object.keys(hostedPayload),
      }),
    };
  } finally {
    await context.close();
    await browser.close();
  }
}

async function runHostedMcpProbe({
  mcpUrl,
  query,
  requestId,
  controlledHeaders,
}) {
  const transport = new StreamableHTTPClientTransport(new URL(mcpUrl), {
    requestInit: {
      headers: {
        ...controlledHeaders,
        'x-request-id': requestId,
      },
    },
  });
  const client = new Client({
    name: 'admin-search-gateway-reconciliation',
    version: '1.0.0',
  });
  try {
    await client.connect(transport);
    const result = await client.callTool({
      name: 'search_icons',
      arguments: { query, limit: 6 },
    });
    assert.notEqual(result.isError, true, 'Hosted MCP probe failed.');
    const payload = parseToolPayload(result);
    const refs = toolRefs(payload);
    return {
      result_count: refs.length,
      fingerprint: stableFingerprint({
        http_status: 200,
        result_count: refs.length,
        ordered_icon_refs: refs,
        search_execution: payload.search_execution || payload.search_runtime?.mode || null,
        structured_fields: Object.keys(payload),
      }),
    };
  } finally {
    await client.close().catch(() => {});
  }
}

async function runLocalMcpProbe({
  packageVersion,
  query,
  controlledLabel,
}) {
  const command = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const transport = new StdioClientTransport({
    command,
    args: ['-y', `@supericons/mcp@${packageVersion}`],
    env: {
      ...process.env,
      SUPERICONS_CONTROLLED_RUN_LABEL: controlledLabel,
      SUPERICONS_MCP_LOG_STARTUP: '0',
    },
    stderr: 'pipe',
  });
  const client = new Client({
    name: 'admin-search-gateway-local-reconciliation',
    version: '1.0.0',
  });
  try {
    await client.connect(transport);
    const result = await client.callTool({
      name: 'search_icons',
      arguments: { query, limit: 6 },
    });
    assert.notEqual(result.isError, true, 'Local MCP probe failed.');
    const payload = parseToolPayload(result);
    const refs = toolRefs(payload);
    return {
      result_count: refs.length,
      fingerprint: stableFingerprint({
        http_status: 200,
        result_count: refs.length,
        ordered_icon_refs: refs,
        search_execution: payload.search_execution || payload.search_runtime?.mode || null,
        structured_fields: Object.keys(payload),
      }),
    };
  } finally {
    await client.close().catch(() => {});
  }
}

async function runDirectProbe({
  gatewayUrl,
  query,
  requestId,
  controlledHeaders = {},
}) {
  const response = await fetch(gatewayUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-request-id': requestId,
      ...controlledHeaders,
    },
    body: JSON.stringify({
      query,
      library: null,
      library_mode: 'all',
      style: 'any',
      limit: 6,
      source: 'gateway_reconciliation',
    }),
    signal: AbortSignal.timeout(60_000),
  });
  const payload = await response.json().catch(() => ({}));
  assert.equal(response.status, 200, `Direct gateway probe returned HTTP ${response.status}.`);
  return {
    result_count: (payload.results || []).length,
    fingerprint: stableFingerprint({
      http_status: response.status,
      result_count: (payload.results || []).length,
      ordered_icon_refs: (payload.results || []).map((row) => row.icon_id),
      search_execution: payload.search_runtime?.mode || null,
      error_code: payload.error || null,
      retryable: payload.retryable ?? null,
      structured_fields: Object.keys(payload),
    }),
  };
}

function controlledTraffic(row, label) {
  const cohort = text(row.beta_cohort).toLowerCase();
  const traffic = text(row.traffic_class || row.metadata?.traffic_class).toLowerCase();
  const environment = text(row.environment).toLowerCase();
  return cohort.includes(label.toLowerCase())
    || traffic === 'controlled_test'
    || environment === 'test';
}

function uniqueMatches(rows, field, value) {
  const expected = text(value);
  if (!expected) return [];
  return rows.filter((row) => text(row[field]) === expected);
}

function sourceEventForFinal(final) {
  return text(final?.source_event_id);
}

function resolveAuditLink(audit, sources, reconciliationCutoff, explainedDirectIds) {
  const backlinkMatches = sources.usage.filter(
    (row) => text(row.search_request_audit_id) === text(audit.id),
  );
  if (backlinkMatches.length) return { tier: 'audit_backlink', matches: backlinkMatches.length };

  if (audit.episode_id) {
    const matches = [
      ...uniqueMatches(sources.finals, 'episode_id', audit.episode_id),
      ...uniqueMatches(sources.diagnostics, 'episode_id', audit.episode_id),
      ...sources.usage.filter((row) => text(row.event_id) === text(audit.episode_id)),
    ];
    if (matches.length) return { tier: 'episode_id', matches: matches.length };
  }

  if (audit.recovery_chain_id) {
    const matches = [
      ...uniqueMatches(sources.finals, 'recovery_chain_id', audit.recovery_chain_id),
      ...uniqueMatches(sources.diagnostics, 'recovery_chain_id', audit.recovery_chain_id),
      ...sources.usage.filter(
        (row) => text(row.metadata?.recovery_chain_id) === text(audit.recovery_chain_id),
      ),
    ];
    if (matches.length) return { tier: 'recovery_chain_id', matches: matches.length };
  }

  const requestCandidates = sources.usage.filter((row) => (
    (audit.request_id && text(row.request_id) === text(audit.request_id))
    || (audit.dedupe_key && text(row.dedupe_key) === text(audit.dedupe_key))
  ));
  if (requestCandidates.length === 1) {
    return { tier: 'exact_request_or_dedupe', matches: 1 };
  }

  if (classifyGrace(audit.created_at, reconciliationCutoff) === 'pending_linkage') {
    return { tier: 'pending_linkage', matches: 0 };
  }

  if (explainedDirectIds.has(text(audit.request_id))) {
    return { tier: 'explained_unlinked_diagnostic', matches: 0 };
  }
  return { tier: 'unexplained', matches: requestCandidates.length };
}

function findRunRows(sources, identities, queries, label) {
  const webFinals = sources.finals.filter((row) => (
    text(row.episode_id) === text(identities.webEpisodeId)
    && row.channel === 'web'
  ));
  const hostedUsage = sources.usage.filter((row) => (
    text(row.request_id) === identities.hostedRequestId
    && row.tool_name === 'search_icons'
    && row.event_type === 'search_outcome'
  ));
  const hostedEventIds = new Set(hostedUsage.map((row) => text(row.event_id)).filter(Boolean));
  const hostedFinals = sources.finals.filter((row) => (
    row.channel === 'hosted_mcp'
    && (
      hostedEventIds.has(text(row.episode_id))
      || hostedUsage.some((usage) => sourceEventForFinal(row) === `mcp_usage_events:${usage.id}`)
    )
  ));
  const localUsage = sources.usage.filter((row) => (
    row.channel === 'local_mcp'
    && row.tool_name === 'search_icons'
    && row.event_type === 'search_outcome'
    && normalizeQuery(row.query_norm) === normalizeQuery(queries.local)
    && text(row.beta_cohort).toLowerCase().includes(label.toLowerCase())
  ));
  const localEventIds = new Set(localUsage.map((row) => text(row.event_id)).filter(Boolean));
  const localFinals = sources.finals.filter((row) => (
    row.channel === 'local_mcp'
    && (
      localEventIds.has(text(row.episode_id))
      || localUsage.some((usage) => sourceEventForFinal(row) === `mcp_usage_events:${usage.id}`)
    )
  ));
  const directUnsignedAudits = sources.audits.filter(
    (row) => text(row.request_id) === identities.directUnsignedRequestId,
  );
  const directSignedAudits = sources.audits.filter(
    (row) => text(row.request_id) === identities.directSignedRequestId,
  );
  const webAudits = sources.audits.filter((row) => (
    text(row.episode_id) === text(identities.webEpisodeId)
    || text(row.request_id) === text(identities.webEpisodeId)
  ));
  const hostedLinkIds = new Set([
    ...hostedUsage.map((row) => text(row.event_id)),
    ...hostedFinals.map((row) => text(row.episode_id)),
    ...hostedFinals.map((row) => text(row.recovery_chain_id)),
  ].filter(Boolean));
  const hostedAudits = sources.audits.filter((row) => (
    hostedLinkIds.has(text(row.episode_id))
    || hostedLinkIds.has(text(row.recovery_chain_id))
    || text(row.request_id) === identities.hostedRequestId
  ));
  const localLinkIds = new Set([
    ...localUsage.map((row) => text(row.event_id)),
    ...localFinals.map((row) => text(row.episode_id)),
    ...localFinals.map((row) => text(row.recovery_chain_id)),
  ].filter(Boolean));
  const localAudits = sources.audits.filter((row) => (
    localLinkIds.has(text(row.episode_id))
    || localLinkIds.has(text(row.recovery_chain_id))
  ));
  return {
    web: { finals: webFinals, usage: [], audits: webAudits },
    hosted_mcp: { finals: hostedFinals, usage: hostedUsage, audits: hostedAudits },
    local_mcp: { finals: localFinals, usage: localUsage, audits: localAudits },
    direct_unsigned: { finals: [], usage: [], audits: directUnsignedAudits },
    direct_signed: { finals: [], usage: [], audits: directSignedAudits },
  };
}

function countTiers(linkRows) {
  const counts = {
    audit_backlink: 0,
    episode_id: 0,
    recovery_chain_id: 0,
    exact_request_or_dedupe: 0,
    pending_linkage: 0,
    explained_unlinked_diagnostic: 0,
    unexplained: 0,
  };
  for (const row of linkRows) counts[row.tier] += 1;
  return counts;
}

function percentage(count, total) {
  return total ? Number(((count / total) * 100).toFixed(2)) : null;
}

function pathLinkReport(pathRows, sources, reconciliationCutoff, explainedDirectIds) {
  const linked = pathRows.audits.map((audit) => ({
    audit,
    ...resolveAuditLink(audit, sources, reconciliationCutoff, explainedDirectIds),
  }));
  const counts = countTiers(linked);
  return {
    eligible_raw_rows: linked.length,
    counts,
    percentages: Object.fromEntries(
      Object.entries(counts).map(([tier, count]) => [
        tier,
        percentage(count, linked.length),
      ]),
    ),
    rows: linked.map(({ audit, tier, matches }) => ({
      source: safeSourceRow(audit),
      linkage_tier: tier,
      exact_match_count: matches,
      included_by_current_admin_diagnostic_model: Boolean(audit.episode_id),
    })),
  };
}

function buildProbeEvidence({
  id,
  entryPath,
  query,
  marker,
  pathRows,
  expectedFinalChannel,
  controlledLabel,
  fingerprint,
  extra = {},
}) {
  const finals = pathRows.finals;
  const audits = pathRows.audits;
  const usage = pathRows.usage;
  const controlledFinals = finals.filter((row) => controlledTraffic(row, controlledLabel));
  const controlledAudits = audits.filter((row) => controlledTraffic(row, controlledLabel));
  const checks = {
    exactly_one_final: expectedFinalChannel ? finals.length === 1 : finals.length === 0,
    expected_final_channel: expectedFinalChannel
      ? finals[0]?.channel === expectedFinalChannel
      : true,
    controlled_final: expectedFinalChannel
      ? controlledFinals.length === 1
      : true,
    expected_usage_count: expectedFinalChannel === 'hosted_mcp'
      || expectedFinalChannel === 'local_mcp'
      ? usage.length === 1
      : usage.length === 0,
    required_diagnostics_present: expectedFinalChannel === 'web'
      || expectedFinalChannel === 'hosted_mcp'
      ? audits.length >= 1
      : true,
  };
  if (expectedFinalChannel) {
    checks.marker_classification = true;
  } else {
    checks.required_diagnostics_present = audits.length >= 1;
    checks.marker_classification = marker === 'absent'
      ? controlledAudits.length === 0
      : controlledAudits.length >= 1;
  }
  const passed = Object.values(checks).every(Boolean);
  return {
    id,
    entry_path: entryPath,
    exact_query: query,
    marker,
    expected_final_channel: expectedFinalChannel,
    observed: {
      final_rows: finals.map((row) => safeSourceRow(row, 'completed_at')),
      usage_rows: usage.map((row) => safeSourceRow(row)),
      audit_rows: audits.map((row) => safeSourceRow(row)),
    },
    final_or_diagnostic_role: expectedFinalChannel ? 'product_final' : 'gateway_diagnostic',
    checks,
    fingerprint,
    ...extra,
    status: passed ? 'passed' : 'failed',
  };
}

function currentAdminDiagnosticVisibility(pathRows) {
  return pathRows.audits.filter((row) => Boolean(row.episode_id)).length;
}

async function waitForProductSettlement(config, startedAt, identities, queries, label) {
  const deadline = Date.now() + PRODUCT_SETTLEMENT_TIMEOUT_MS;
  let sources = null;
  while (Date.now() < deadline) {
    sources = await readSources(config, startedAt, new Date().toISOString());
    const runRows = findRunRows(sources, identities, queries, label);
    const ready = (
      runRows.web.finals.length >= 1
      && runRows.hosted_mcp.finals.length >= 1
      && runRows.local_mcp.finals.length >= 1
      && runRows.direct_unsigned.audits.length >= 1
      && runRows.direct_signed.audits.length >= 1
    );
    if (ready) return { sources, runRows };
    await delay(SOURCE_SETTLEMENT_POLL_MS);
  }
  sources = sources || await readSources(config, startedAt, new Date().toISOString());
  return {
    sources,
    runRows: findRunRows(sources, identities, queries, label),
  };
}

async function writeQueryFreePreflight({
  outputPath,
  websiteUrl,
  gatewayUrl,
}) {
  const evidence = {
    schema_version: '1.1',
    artifact: 'admin_search_gateway_query_free_preflight',
    generated_at_utc: null,
    purpose: 'Confirm that the production icon view reaches a visible search input without sending a search or telemetry request.',
    website_route: websiteUrl,
    status: 'running',
  };
  try {
    const observed = await runWebsitePreflight({ websiteUrl, gatewayUrl });
    Object.assign(evidence, observed);
    evidence.status = (
      observed.application_visible
      && observed.icon_view_active
      && observed.search_input_visible
      && observed.search_input_value === ''
      && observed.hidden_desktop_toggle_clicked === false
      && observed.watched_post_count === 0
    ) ? 'passed' : 'failed';
  } catch (error) {
    evidence.status = 'failed';
    evidence.failure = {
      name: sanitizeDiagnosticText(error?.name || 'Error'),
      message: sanitizeDiagnosticText(error?.message || String(error)),
    };
  }
  evidence.generated_at_utc = new Date().toISOString();
  writeFileSync(outputPath, `${JSON.stringify(evidence, null, 2)}\n`, {
    encoding: 'utf8',
    flag: 'wx',
  });
  console.log(JSON.stringify({
    status: evidence.status,
    output: outputPath,
    watched_post_count: evidence.watched_post_count ?? null,
  }, null, 2));
  if (evidence.status !== 'passed') process.exitCode = 1;
}

async function main() {
  verifyGraceBoundaryFixture();

  const outputPath = resolve(requiredArg('output'));
  const mode = readArg('mode', 'gate');
  const websiteUrl = readArg('website-url', DEFAULT_WEBSITE_URL);
  const gatewayUrl = readArg('gateway-url', DEFAULT_GATEWAY_URL);
  assert.ok(['preflight', 'gate'].includes(mode), '--mode must be preflight or gate.');
  assert.equal(existsSync(outputPath), false, `Evidence already exists: ${outputPath}`);
  if (mode === 'preflight') {
    await writeQueryFreePreflight({
      outputPath,
      websiteUrl,
      gatewayUrl,
    });
    return;
  }

  const envPath = resolve(requiredArg('supabase-env'));
  const phase = readArg('phase', 'before');
  const baselinePath = readArg('baseline');
  assert.ok(['before', 'after'].includes(phase), '--phase must be before or after.');
  assert.ok(existsSync(envPath), `Supabase environment file is missing: ${envPath}`);
  const fileEnv = parseEnvFile(envPath);
  const controlledSecret = text(process.env.SUPERICONS_CONTROLLED_RUN_SECRET);
  const supabaseUrl = text(process.env.SUPABASE_URL || fileEnv.SUPABASE_URL);
  const serviceRoleKey = text(
    process.env.SUPABASE_SERVICE_ROLE_KEY || fileEnv.SUPABASE_SERVICE_ROLE_KEY,
  );
  assert.ok(controlledSecret.length >= 32, 'SUPERICONS_CONTROLLED_RUN_SECRET is unavailable.');
  assert.ok(supabaseUrl.startsWith('https://'), 'SUPABASE_URL is unavailable.');
  assert.ok(serviceRoleKey.length >= 32, 'SUPABASE_SERVICE_ROLE_KEY is unavailable.');

  const mcpUrl = readArg('mcp-url', 'https://mcp.supericons.dev/mcp');
  const packageVersion = readArg('package-version', '0.4.22');
  const runToken = randomUUID().slice(0, 8);
  const runId = `admin-gateway-${compactTime()}-${runToken}`;
  const controlledLabel = `gateway_gate_${runToken}`;
  const controlledHeaders = createControlledRunHeaders(
    controlledLabel,
    controlledSecret,
  );
  const startedAt = new Date(Date.now() - 2_000).toISOString();
  const identities = {
    hostedRequestId: `gateway-gate-hosted-${runToken}`,
    directUnsignedRequestId: `gateway-gate-unsigned-${runToken}`,
    directSignedRequestId: `gateway-gate-signed-${runToken}`,
    webEpisodeId: null,
  };
  const queries = {
    web: 'camera',
    hosted: 'calendar',
    local: 'settings',
    direct_unsigned: 'rocket',
    direct_signed: 'shield',
  };

  const evidence = {
    schema_version: 1,
    artifact: 'admin_search_gateway_reconciliation',
    phase,
    run_id: runId,
    status: 'running',
    generated_at: null,
    started_at: startedAt,
    data_cutoff: null,
    reconciliation_cutoff: null,
    grace_period_seconds: RECONCILIATION_GRACE_SECONDS,
    source_versions: {
      local_mcp_package: packageVersion,
      hosted_mcp_endpoint: mcpUrl,
      website: websiteUrl,
    },
    safe_run_identities: {},
    probes: [],
    link_rates: {},
    source_reconciliation: {},
    filter_metadata: {
      live_admin_endpoint_available: false,
      note: 'Production table access is used. The current local ADMIN_SECRET is not accepted by the live admin function.',
    },
    stable_search_fingerprint_comparison: null,
    overall_gate_verdict: 'running',
  };

  let website = null;
  let hosted = null;
  let local = null;
  let directUnsigned = null;
  let directSigned = null;
  try {
    website = await runWebsiteProbe({
      websiteUrl,
      gatewayUrl,
      webTelemetryOrigin: new URL(supabaseUrl).origin,
      query: queries.web,
      controlledHeaders,
    });
    assert.ok(website.episode_id, 'Website probe did not expose a search episode ID.');
    identities.webEpisodeId = website.episode_id;
    hosted = await runHostedMcpProbe({
      mcpUrl,
      query: queries.hosted,
      requestId: identities.hostedRequestId,
      controlledHeaders,
    });
    local = await runLocalMcpProbe({
      packageVersion,
      query: queries.local,
      controlledLabel,
    });
    directUnsigned = await runDirectProbe({
      gatewayUrl,
      query: queries.direct_unsigned,
      requestId: identities.directUnsignedRequestId,
    });
    directSigned = await runDirectProbe({
      gatewayUrl,
      query: queries.direct_signed,
      requestId: identities.directSignedRequestId,
      controlledHeaders,
    });

    const settled = await waitForProductSettlement(
      { supabaseUrl, serviceRoleKey },
      startedAt,
      identities,
      queries,
      controlledLabel,
    );
    const productRowsReady = (
      settled.runRows.web.finals.length === 1
      && settled.runRows.hosted_mcp.finals.length === 1
      && settled.runRows.local_mcp.finals.length === 1
    );
    if (productRowsReady) {
      const latestDirectTime = [
        ...settled.runRows.direct_unsigned.audits,
        ...settled.runRows.direct_signed.audits,
      ]
        .map((row) => Date.parse(row.created_at))
        .filter(Number.isFinite)
        .sort((left, right) => right - left)[0];
      if (latestDirectTime) {
        const graceDeadline = latestDirectTime + (RECONCILIATION_GRACE_SECONDS * 1000) + 1_000;
        const remainingMs = graceDeadline - Date.now();
        if (remainingMs > 0) await delay(remainingMs);
      }
    }

    const dataCutoff = new Date().toISOString();
    const reconciliationCutoff = new Date(
      Date.parse(dataCutoff) - (RECONCILIATION_GRACE_SECONDS * 1000),
    ).toISOString();
    const sources = await readSources(
      { supabaseUrl, serviceRoleKey },
      startedAt,
      dataCutoff,
    );
    const runRows = findRunRows(
      sources,
      identities,
      queries,
      controlledLabel,
    );
    const explainedDirectIds = new Set([
      identities.directUnsignedRequestId,
      identities.directSignedRequestId,
    ]);

    const fingerprints = {
      web: website.fingerprint,
      hosted_mcp: hosted.fingerprint,
      local_mcp: local.fingerprint,
      direct_unsigned: directUnsigned.fingerprint,
      direct_signed: directSigned.fingerprint,
    };
    evidence.probes = [
      buildProbeEvidence({
        id: 1,
        entryPath: 'production_website',
        query: queries.web,
        marker: 'verified_signed_network_marker_expected',
        pathRows: runRows.web,
        expectedFinalChannel: 'web',
        controlledLabel,
        fingerprint: fingerprints.web,
        extra: {
          browser: {
            visible_icon_cells: website.visible_icon_cells,
            hosted_http_status: website.hosted_http_status,
            telemetry_http_status: website.telemetry_http_status,
            telemetry_write_count: website.telemetry_bodies.length,
            signed_request_destinations: website.signed_request_destinations,
            console_error_count: website.console_errors.length,
            console_error_samples: website.console_errors.slice(0, 5),
          },
        },
      }),
      buildProbeEvidence({
        id: 2,
        entryPath: 'production_hosted_mcp_search_icons',
        query: queries.hosted,
        marker: 'verified_signed_network_marker_expected',
        pathRows: runRows.hosted_mcp,
        expectedFinalChannel: 'hosted_mcp',
        controlledLabel,
        fingerprint: fingerprints.hosted_mcp,
      }),
      buildProbeEvidence({
        id: 3,
        entryPath: 'published_local_mcp_search_icons',
        query: queries.local,
        marker: 'package_controlled_run_expected',
        pathRows: runRows.local_mcp,
        expectedFinalChannel: 'local_mcp',
        controlledLabel,
        fingerprint: fingerprints.local_mcp,
      }),
      buildProbeEvidence({
        id: 4,
        entryPath: 'direct_production_search_icons',
        query: queries.direct_unsigned,
        marker: 'absent',
        pathRows: runRows.direct_unsigned,
        expectedFinalChannel: null,
        controlledLabel,
        fingerprint: fingerprints.direct_unsigned,
      }),
      buildProbeEvidence({
        id: 5,
        entryPath: 'direct_production_search_icons',
        query: queries.direct_signed,
        marker: 'verified_signed_network_marker_expected',
        pathRows: runRows.direct_signed,
        expectedFinalChannel: null,
        controlledLabel,
        fingerprint: fingerprints.direct_signed,
      }),
    ];

    for (const [path, rows] of Object.entries(runRows)) {
      evidence.link_rates[path] = pathLinkReport(
        rows,
        sources,
        reconciliationCutoff,
        explainedDirectIds,
      );
    }
    const allRunAudits = Object.values(runRows).flatMap((rows) => rows.audits);
    const allLinkRows = allRunAudits.map((audit) => resolveAuditLink(
      audit,
      sources,
      reconciliationCutoff,
      explainedDirectIds,
    ));
    const tierCounts = countTiers(allLinkRows);
    const directExportVisibility = {
      unsigned: currentAdminDiagnosticVisibility(runRows.direct_unsigned),
      signed: currentAdminDiagnosticVisibility(runRows.direct_signed),
    };
    const directSourceRows = (
      runRows.direct_unsigned.audits.length
      + runRows.direct_signed.audits.length
    );
    const directVisibleRows = directExportVisibility.unsigned + directExportVisibility.signed;
    evidence.source_reconciliation = {
      eligible_source_audit_rows: allRunAudits.length,
      linkage_counts: tierCounts,
      pending_rows: tierCounts.pending_linkage,
      explained_exclusions: tierCounts.explained_unlinked_diagnostic,
      unexplained_rows: tierCounts.unexplained,
      direct_gateway_source_rows: directSourceRows,
      direct_gateway_rows_visible_in_current_admin_diagnostic_model: directVisibleRows,
      current_admin_diagnostic_model_rule: 'search_request_audit rows require episode_id',
      status: (
        tierCounts.unexplained === 0
        && directSourceRows > 0
        && directVisibleRows === directSourceRows
      ) ? 'passed' : 'failed',
    };
    evidence.safe_run_identities = {
      controlled_label: controlledLabel,
      website_episode_id: safeIdentity(identities.webEpisodeId),
      hosted_request_id: safeIdentity(identities.hostedRequestId),
      direct_unsigned_request_id: safeIdentity(identities.directUnsignedRequestId),
      direct_signed_request_id: safeIdentity(identities.directSignedRequestId),
    };
    evidence.data_cutoff = dataCutoff;
    evidence.reconciliation_cutoff = reconciliationCutoff;
    evidence.generated_at = new Date().toISOString();

    const failedProductProbe = evidence.probes
      .filter((probe) => probe.expected_final_channel)
      .find((probe) => probe.status !== 'passed');
    const hostedIdentityFailure = (
      runRows.hosted_mcp.audits.length > 0
      && evidence.link_rates.hosted_mcp.counts.episode_id === 0
      && evidence.link_rates.hosted_mcp.counts.recovery_chain_id === 0
      && evidence.link_rates.hosted_mcp.counts.audit_backlink === 0
    );
    if (failedProductProbe) {
      evidence.overall_gate_verdict = 'product_path_failure';
    } else if (hostedIdentityFailure) {
      evidence.overall_gate_verdict = 'identity_failure';
    } else if (directSourceRows > 0 && directVisibleRows < directSourceRows) {
      evidence.overall_gate_verdict = 'diagnostic_accounting_gap_confirmed';
    } else if (evidence.probes.every((probe) => probe.status === 'passed')) {
      evidence.overall_gate_verdict = 'passed_no_patch_required';
    } else {
      evidence.overall_gate_verdict = 'unexpected_finding';
    }

    if (phase === 'after') {
      assert.ok(baselinePath, 'Provide --baseline for the after gate.');
      const baseline = JSON.parse(readFileSync(resolve(baselinePath), 'utf8'));
      const beforeFingerprints = Object.fromEntries(
        baseline.probes.map((probe) => [probe.entry_path + ':' + probe.exact_query, probe.fingerprint]),
      );
      const comparisons = evidence.probes.map((probe) => {
        const before = beforeFingerprints[probe.entry_path + ':' + probe.exact_query];
        return {
          probe_id: probe.id,
          before_sha256: before?.sha256 || null,
          after_sha256: probe.fingerprint?.sha256 || null,
          matches: before?.sha256 === probe.fingerprint?.sha256,
        };
      });
      evidence.stable_search_fingerprint_comparison = {
        comparisons,
        status: comparisons.every((row) => row.matches) ? 'passed' : 'failed',
      };
      if (evidence.stable_search_fingerprint_comparison.status !== 'passed') {
        evidence.overall_gate_verdict = 'search_fingerprint_changed';
      }
    } else {
      evidence.stable_search_fingerprint_comparison = {
        comparisons: [],
        status: 'baseline_recorded',
      };
    }
    evidence.status = evidence.overall_gate_verdict === 'passed_no_patch_required'
      ? 'passed'
      : evidence.overall_gate_verdict === 'diagnostic_accounting_gap_confirmed'
        ? 'conditional_patch_allowed'
        : 'failed';
  } catch (error) {
    evidence.status = 'failed';
    evidence.generated_at = new Date().toISOString();
    evidence.overall_gate_verdict = 'gate_execution_failed';
    evidence.failure = {
      name: sanitizeDiagnosticText(error?.name || 'Error'),
      message: sanitizeDiagnosticText(error?.message || String(error)),
    };
  }

  writeFileSync(outputPath, `${JSON.stringify(evidence, null, 2)}\n`, {
    encoding: 'utf8',
    flag: 'wx',
  });
  console.log(JSON.stringify({
    status: evidence.status,
    run_id: evidence.run_id,
    output: outputPath,
    overall_gate_verdict: evidence.overall_gate_verdict,
    probe_statuses: evidence.probes.map((probe) => ({
      id: probe.id,
      status: probe.status,
    })),
  }, null, 2));
  if (!['conditional_patch_allowed', 'passed'].includes(evidence.status)) {
    process.exitCode = 1;
  }
}

await main();
