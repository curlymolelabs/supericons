import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

function readArg(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : '';
}

function parseToolPayload(result) {
  if (result?.structuredContent && typeof result.structuredContent === 'object') {
    return result.structuredContent;
  }
  const textPart = (result?.content || []).find((part) => part?.type === 'text');
  assert.ok(textPart?.text, 'MCP tool response did not contain JSON.');
  return JSON.parse(textPart.text);
}

function sqlLiteral(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

const projectRef = readArg('project-ref') || 'kcjmkakdhsqplvasgkjv';
const mcpUrl = (readArg('mcp-url') || 'https://mcp.supericons.dev/mcp').replace(/\/+$/, '');
const adminUrl = (readArg('admin-url')
  || `https://${projectRef}.supabase.co/functions/v1/admin-api`).replace(/\/+$/, '');
const outputPath = resolve(readArg('output') || '');
const telemetryOnly = process.argv.includes('--telemetry-only');
const accessToken = String(process.env.SUPABASE_ACCESS_TOKEN || '').trim();
const adminSecret = String(process.env.PHASE_A_ADMIN_SECRET || '').trim();
const traceSessionId = `admin-dashboard-round-2-${randomUUID()}`;

assert.match(projectRef, /^[a-z]{20}$/, 'Project reference is malformed.');
assert.ok(readArg('output'), 'Provide --output with a write-once JSON path.');
assert.equal(existsSync(outputPath), false, `Evidence already exists: ${outputPath}`);
assert.ok(accessToken, 'SUPABASE_ACCESS_TOKEN must be present in the process environment.');
if (!telemetryOnly) {
  assert.ok(adminSecret, 'PHASE_A_ADMIN_SECRET must be present in the process environment.');
}

const searchProbes = [
  { query: 'database admin dashboard trace', library: 'lucide', limit: 3 },
  { query: 'calendar admin dashboard trace', library: 'lucide', limit: 3 },
  { query: 'snowflake admin dashboard trace', library: 'tabler', limit: 3 },
];
const lookupProbes = [
  { id: 'cut', library: 'tabler' },
  { id: 'snowflake', library: 'lucide' },
];
const probeTerms = [
  ...searchProbes.map((probe) => probe.query),
  ...lookupProbes.map((probe) => probe.id),
];
const startedAt = new Date(Date.now() - 2_000).toISOString();
const managementQueryUrl = `https://api.supabase.com/v1/projects/${projectRef}/database/query`;
const evidence = {
  artifact: 'admin_dashboard_v2_round_2_live_trace',
  project_ref: projectRef,
  telemetry_only: telemetryOnly,
  status: 'running',
  started_at: new Date().toISOString(),
  probe_contract: {
    search_calls: searchProbes.length,
    lookup_calls: lookupProbes.length,
    environment: 'production',
    synthetic: true,
    unique_session: true,
  },
};

async function queryDatabase(sql) {
  const response = await fetch(managementQueryUrl, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
    signal: AbortSignal.timeout(15_000),
  });
  const payload = await response.json().catch(() => null);
  assert.ok(
    response.status === 200 || response.status === 201,
    `Telemetry query failed with HTTP ${response.status}.`,
  );
  assert.ok(Array.isArray(payload), 'Telemetry query returned invalid JSON.');
  return payload;
}

async function readProbeTelemetry() {
  const terms = probeTerms.map(sqlLiteral).join(', ');
  return queryDatabase(`
begin read only;
set local statement_timeout = '3000ms';
select
  event_type,
  tool_name,
  query_norm,
  library_filter,
  query_origin,
  result_count,
  search_outcome,
  status,
  country_code,
  created_at
from public.mcp_usage_events
where created_at >= ${sqlLiteral(startedAt)}::timestamptz
  and query_norm in (${terms})
order by created_at desc;
rollback;
  `);
}

async function waitForProbeTelemetry() {
  const deadline = Date.now() + 30_000;
  let rows = [];
  while (Date.now() < deadline) {
    rows = await readProbeTelemetry();
    const searchesReady = searchProbes.every((probe) => rows.some((row) => (
      row.tool_name === 'search_icons'
      && row.query_norm === probe.query
      && Number(row.result_count) > 0
    )));
    const lookupsReady = lookupProbes.every((probe) => rows.some((row) => (
      row.tool_name === 'get_icon'
      && row.query_norm === probe.id
      && Number(row.result_count) === 1
    )));
    if (searchesReady && lookupsReady) return rows;
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 2_000));
  }
  return rows;
}

async function requestAdmin(path) {
  const response = await fetch(`${adminUrl}${path}`, {
    headers: {
      accept: 'application/json',
      'x-admin-secret': adminSecret,
    },
    signal: AbortSignal.timeout(120_000),
  });
  const payload = await response.json().catch(() => null);
  assert.equal(response.status, 200, `GET ${path.split('?')[0]} failed with HTTP ${response.status}.`);
  assert.ok(payload && typeof payload === 'object', 'Admin API returned invalid JSON.');
  return payload;
}

function findQueryRow(payload, probe, origin) {
  const row = (payload.queries || []).find((candidate) => (
    candidate.query === (probe.query || probe.id)
    && candidate.library_filter === probe.library
    && candidate.query_origin === origin
  ));
  assert.ok(row, `Dashboard did not return the expected ${origin} probe row.`);
  return row;
}

const transport = new StreamableHTTPClientTransport(new URL(mcpUrl), {
  requestInit: {
    headers: {
      'x-session-id': traceSessionId,
    },
  },
});
const client = new Client({ name: 'admin-dashboard-round-2-trace', version: '1.0.0' });

try {
  await client.connect(transport);
  const searchResults = [];
  for (const probe of searchProbes) {
    const result = await client.callTool({
      name: 'search_icons',
      arguments: {
        query: probe.query,
        library: probe.library,
        library_mode: 'strict',
        limit: probe.limit,
      },
    });
    assert.notEqual(result.isError, true, 'A synthetic search probe failed.');
    const payload = parseToolPayload(result);
    assert.ok(Array.isArray(payload.results), 'A synthetic search probe returned no result list.');
    assert.equal(payload.results.length, probe.limit, 'A synthetic search probe returned the wrong result count.');
    searchResults.push(payload.results.length);
  }

  for (const probe of lookupProbes) {
    const result = await client.callTool({
      name: 'get_icon',
      arguments: {
        id: probe.id,
        library: probe.library,
      },
    });
    assert.notEqual(result.isError, true, 'A synthetic icon lookup failed.');
    const payload = parseToolPayload(result);
    assert.ok(payload.icon?.svg, 'A synthetic icon lookup returned no SVG.');
  }

  let telemetryRows = await waitForProbeTelemetry();
  const missingSearchProbes = searchProbes.filter((probe) => !telemetryRows.some((row) => (
    row.tool_name === 'search_icons'
    && row.query_norm === probe.query
    && Number(row.result_count) > 0
  )));
  const missingLookupProbes = lookupProbes.filter((probe) => !telemetryRows.some((row) => (
    row.tool_name === 'get_icon'
    && row.query_norm === probe.id
    && Number(row.result_count) === 1
  )));
  for (const probe of missingSearchProbes) {
    const retry = await client.callTool({
      name: 'search_icons',
      arguments: {
        query: probe.query,
        library: probe.library,
        library_mode: 'strict',
        limit: probe.limit,
      },
    });
    assert.notEqual(retry.isError, true, 'A synthetic search telemetry retry failed.');
  }
  for (const probe of missingLookupProbes) {
    const retry = await client.callTool({
      name: 'get_icon',
      arguments: {
        id: probe.id,
        library: probe.library,
      },
    });
    assert.notEqual(retry.isError, true, 'A synthetic lookup telemetry retry failed.');
  }
  if (missingSearchProbes.length || missingLookupProbes.length) {
    telemetryRows = await waitForProbeTelemetry();
  }
  const searchTelemetry = searchProbes.map((probe) => telemetryRows.find((row) => (
    row.tool_name === 'search_icons'
    && row.query_norm === probe.query
    && Number(row.result_count) > 0
  )));
  const lookupTelemetry = lookupProbes.map((probe) => telemetryRows.find((row) => (
    row.tool_name === 'get_icon'
    && row.query_norm === probe.id
    && Number(row.result_count) === 1
  )));
  assert.equal(searchTelemetry.every(Boolean), true, 'A successful search probe is missing from telemetry.');
  assert.equal(lookupTelemetry.every(Boolean), true, 'A successful icon lookup is missing from telemetry.');
  assert.equal(searchTelemetry.every((row) => row.query_origin === 'agent_query'), true);
  assert.equal(searchTelemetry.every((row) => row.event_type === 'search_outcome'), true);
  assert.equal(searchTelemetry.every((row) => row.search_outcome !== 'zero'), true);
  assert.equal(lookupTelemetry.every((row) => row.query_origin === 'icon_lookup'), true);
  assert.equal(lookupTelemetry.every((row) => row.event_type === 'tool_call'), true);
  assert.equal(lookupTelemetry.every((row) => Number(row.result_count) === 1), true);

  evidence.telemetry = {
    search_rows_verified: searchTelemetry.length,
    lookup_rows_verified: lookupTelemetry.length,
    search_result_counts: searchTelemetry.map((row) => Number(row.result_count)),
    lookup_result_counts: lookupTelemetry.map((row) => Number(row.result_count)),
    search_origins_correct: true,
    lookup_origins_correct: true,
    lookup_source_result_count_correct: true,
    search_telemetry_retries: missingSearchProbes.length,
    lookup_telemetry_retries: missingLookupProbes.length,
  };

  if (!telemetryOnly) {
    const windows = ['1d', '7d', '30d', 'all'];
    const searchWindowChecks = [];
    for (const [probeIndex, probe] of searchProbes.entries()) {
      for (const windowKey of windows) {
        const params = new URLSearchParams({
          window: windowKey,
          channel: 'all',
          include_test: 'false',
          q: probe.query,
          page: '1',
          page_size: '100',
        });
        const payload = await requestAdmin(`/v2/search?${params}`);
        const row = findQueryRow(payload, probe, 'agent_query');
        assert.notEqual(row.issue_type, 'zero_result', 'A successful search rendered as Zero.');
        assert.notEqual(row.issue_type, 'mixed_result', 'A new successful search rendered as mixed.');
        assert.equal(row.outcome_label, 'Success');
        if (windowKey === '1d') {
          assert.equal(row.result_count_available, true);
          assert.equal(Number(row.result_count), searchResults[probeIndex]);
          const telemetryCountry = searchTelemetry[probeIndex].country_code || null;
          assert.equal(row.country_available, Boolean(telemetryCountry));
          assert.equal(row.country_code, telemetryCountry);
        } else {
          assert.equal(row.result_count_available, false);
          assert.equal(row.result_count, null);
          assert.equal(row.result_count_reason, 'Not available for aggregate view');
          assert.equal(row.country_available, false);
          assert.equal(row.country_code, null);
        }
        searchWindowChecks.push({ window: windowKey, outcome: row.outcome_label });
      }
    }

    const lookupChecks = [];
    for (const probe of lookupProbes) {
      const params = new URLSearchParams({
        window: '1d',
        channel: 'all',
        include_test: 'false',
        q: probe.id,
        page: '1',
        page_size: '100',
      });
      const payload = await requestAdmin(`/v2/search?${params}`);
      const row = findQueryRow(payload, probe, 'icon_lookup');
      assert.equal(row.issue_type, 'successful');
      assert.equal(row.outcome_label, 'Success');
      assert.equal(row.result_count_available, true);
      assert.equal(Number(row.result_count), 1);
      lookupChecks.push({ outcome: row.outcome_label, result_count: Number(row.result_count) });
    }

    const overview = await requestAdmin('/v2/overview?window=1d&channel=all&include_test=false');
    assert.equal(
      Number(overview.kpis.true_zero_rate),
      Number(overview.kpis.attempts)
        ? Number(overview.kpis.true_zero_count) / Number(overview.kpis.attempts)
        : 0,
      'True Zero Rate is not calculated from per-attempt counts.',
    );
    evidence.dashboard = {
      search_rows_verified: searchWindowChecks.length,
      search_windows_verified: windows,
      lookup_rows_verified: lookupChecks.length,
      lookup_result_counts: lookupChecks.map((row) => row.result_count),
      true_zero_rate_uses_attempt_counts: true,
    };
  }

  evidence.status = 'ok';
} catch (error) {
  evidence.status = 'failed';
  evidence.error = error instanceof Error ? error.message : String(error);
  process.exitCode = 1;
} finally {
  evidence.finished_at = new Date().toISOString();
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
  await client.close().catch(() => {});
  console.log(JSON.stringify({ status: evidence.status, output: readArg('output') }));
}
