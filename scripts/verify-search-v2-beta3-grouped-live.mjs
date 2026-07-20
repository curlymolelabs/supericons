import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

function readArgument(name, fallback = null) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

const groupedUrl = readArgument(
  '--grouped-url',
  'https://kcjmkakdhsqplvasgkjv.supabase.co/functions/v1/mcp-search-grouped',
);
const stableUrl = readArgument(
  '--stable-url',
  'https://kcjmkakdhsqplvasgkjv.supabase.co/functions/v1/mcp-search',
);
const stableFallbackSentinelUrl =
  `${stableUrl}-grouped-route-must-not-fallback`;
const outputPath = readArgument('--output');
const requestTimeoutMs = Number(readArgument('--request-timeout-ms', '20000'));

assert.ok(Number.isInteger(requestTimeoutMs) && requestTimeoutMs > 0);

function buildQuery(query, requestId) {
  return {
    query,
    library_mode: 'all',
    limit: 3,
    source: 'mcp',
    channel: 'internal_test',
    environment: 'production',
    client_family: 'release_gate',
    tool_name: 'recommend_icons',
    request_id: requestId,
  };
}

async function postJson(url, body) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(requestTimeoutMs),
  });
  const text = await response.text();
  let payload = null;
  try {
    payload = JSON.parse(text);
  } catch {
    assert.fail(`${url} returned invalid JSON with HTTP ${response.status}.`);
  }
  return { response, payload };
}

function assertGroupedResponse(payload, expectedCount) {
  assert.equal(payload?.schema_version, 1);
  assert.equal(payload?.response_count, expectedCount);
  assert.equal(payload?.responses?.length, expectedCount);
  for (const [index, entry] of payload.responses.entries()) {
    assert.equal(entry.index, index);
    assert.equal(entry.status, 200);
    assert.ok(Array.isArray(entry.body?.results));
    assert.ok(entry.body.results.length > 0);
  }
}

const originalGroupedUrl = process.env.SUPERICONS_MCP_GROUPED_SEARCH_URL;
const originalStableUrl = process.env.SUPERICONS_MCP_SEARCH_URL;
const originalTelemetry = process.env.SUPERICONS_MCP_TELEMETRY_ENABLED;
const originalUsageDebug = process.env.SUPERICONS_MCP_USAGE_DEBUG;

const summary = {
  artifact: 'search_v2_beta3_grouped_live_gate',
  status: 'blocked',
  grouped_url: groupedUrl,
  stable_url: stableUrl,
  checks: {},
};
let failure = null;

try {
  const direct = await postJson(groupedUrl, {
    queries: [
      buildQuery('settings', 'beta3-live-direct-settings'),
      buildQuery('calendar', 'beta3-live-direct-calendar'),
    ],
  });
  assert.equal(direct.response.status, 200);
  assertGroupedResponse(direct.payload, 2);
  summary.checks.direct_grouped_http = {
    status: 'ok',
    response_count: direct.payload.response_count,
  };

  process.env.SUPERICONS_MCP_GROUPED_SEARCH_URL = groupedUrl;
  process.env.SUPERICONS_MCP_SEARCH_URL = stableFallbackSentinelUrl;
  process.env.SUPERICONS_MCP_TELEMETRY_ENABLED = '0';
  process.env.SUPERICONS_MCP_USAGE_DEBUG = '0';
  const { searchIconQueriesHostedMcp } = await import('../mcp/hosted-search-client.js');

  const groupedClient = await searchIconQueriesHostedMcp({
    queries: [
      {
        query: 'settings',
        libraryMode: 'all',
        limit: 3,
        routeToolName: 'recommend_icons',
        usageContext: {
          source: 'mcp',
          channel: 'internal_test',
          environment: 'production',
          client_family: 'release_gate',
          tool_name: 'recommend_icons',
          request_id: 'beta3-live-client-grouped',
        },
      },
    ],
  });
  assert.ok(groupedClient[0]?.results?.length > 0);
  summary.checks.mcp_grouped_client = {
    status: 'ok',
    result_count: groupedClient[0].results.length,
    stable_fallback_disabled: true,
  };

  process.env.SUPERICONS_MCP_GROUPED_SEARCH_URL =
    `${groupedUrl}-rollback-probe-missing`;
  process.env.SUPERICONS_MCP_SEARCH_URL = stableUrl;
  const fallbackClient = await searchIconQueriesHostedMcp({
    queries: [
      {
        query: 'settings',
        libraryMode: 'all',
        limit: 3,
        routeToolName: 'recommend_icons',
        usageContext: {
          source: 'mcp',
          channel: 'internal_test',
          environment: 'production',
          client_family: 'release_gate',
          tool_name: 'recommend_icons',
          request_id: 'beta3-live-client-stable-fallback',
        },
      },
    ],
  });
  assert.ok(fallbackClient[0]?.results?.length > 0);
  summary.checks.missing_grouped_uses_stable_fallback = {
    status: 'ok',
    result_count: fallbackClient[0].results.length,
  };

  summary.status = 'ok';
  summary.finished_at = new Date().toISOString();
} catch (error) {
  summary.error = {
    name: error?.name || 'Error',
    message: error?.message || String(error),
  };
  summary.finished_at = new Date().toISOString();
  failure = error;
} finally {
  if (originalGroupedUrl === undefined) delete process.env.SUPERICONS_MCP_GROUPED_SEARCH_URL;
  else process.env.SUPERICONS_MCP_GROUPED_SEARCH_URL = originalGroupedUrl;
  if (originalStableUrl === undefined) delete process.env.SUPERICONS_MCP_SEARCH_URL;
  else process.env.SUPERICONS_MCP_SEARCH_URL = originalStableUrl;
  if (originalTelemetry === undefined) delete process.env.SUPERICONS_MCP_TELEMETRY_ENABLED;
  else process.env.SUPERICONS_MCP_TELEMETRY_ENABLED = originalTelemetry;
  if (originalUsageDebug === undefined) delete process.env.SUPERICONS_MCP_USAGE_DEBUG;
  else process.env.SUPERICONS_MCP_USAGE_DEBUG = originalUsageDebug;

  const serialized = `${JSON.stringify(summary, null, 2)}\n`;
  if (outputPath) writeFileSync(resolve(outputPath), serialized, 'utf8');
  console.log(serialized.trim());
}

if (failure) {
  console.error(failure?.stack || failure?.message || String(failure));
  process.exitCode = 1;
}
