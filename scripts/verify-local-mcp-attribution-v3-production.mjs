import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { SUPABASE_ANON, SUPABASE_URL } from '../mcp/auth.js';

function argument(name, fallback = '') {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

const accessToken = String(process.env.SUPABASE_ACCESS_TOKEN || '').trim();
const projectRef = argument('project-ref', 'kcjmkakdhsqplvasgkjv');
const outputPath = argument('output');
const label = `local_attr_${Date.now().toString(36)}`;
const packageCohort = `controlled-run:${label}`;
const spoofCohort = `controlled-run:${label}_spoof`;
const v2Cohort = `controlled-run:${label}_v2`;
const managementUrl =
  `https://api.supabase.com/v1/projects/${projectRef}/database/query/read-only`;
const telemetryUrl =
  `${SUPABASE_URL}/rest/v1/rpc/si_log_local_mcp_search_outcome_v3`;
const rootDir = resolve(import.meta.dirname, '..');
const mcpDir = join(rootDir, 'mcp');
const configDir = await mkdtemp(join(tmpdir(), 'supericons-live-attribution-'));

assert.ok(accessToken, 'SUPABASE_ACCESS_TOKEN must be present.');
assert.ok(outputPath, 'Provide --output for retained evidence.');

async function queryDatabase(query) {
  const response = await fetch(managementUrl, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ query, parameters: [] }),
    signal: AbortSignal.timeout(30_000),
  });
  const payload = await response.json().catch(() => null);
  assert.ok(response.ok, `Database read failed with HTTP ${response.status}.`);
  assert.ok(Array.isArray(payload), 'Unexpected database response.');
  return payload;
}

async function waitForRows(query, expectedCount) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    const rows = await queryDatabase(query);
    if (rows.length >= expectedCount) return rows;
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 500));
  }
  assert.fail(`Timed out waiting for ${expectedCount} telemetry rows.`);
}

async function postV3(payload, extraHeaders = {}) {
  const response = await fetch(telemetryUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      apikey: SUPABASE_ANON,
      authorization: `Bearer ${SUPABASE_ANON}`,
      ...extraHeaders,
    },
    body: JSON.stringify({ p_payload: payload }),
    signal: AbortSignal.timeout(10_000),
  });
  const body = await response.json().catch(() => ({}));
  assert.equal(response.status, 200, JSON.stringify(body));
  return body;
}

let client;
let transport;
try {
  const sdkBase = join(
    mcpDir,
    'node_modules',
    '@modelcontextprotocol',
    'sdk',
    'dist',
    'esm',
    'client',
  );
  const { Client } = await import(pathToFileURL(join(sdkBase, 'index.js')).href);
  const { StdioClientTransport } = await import(
    pathToFileURL(join(sdkBase, 'stdio.js')).href
  );
  transport = new StdioClientTransport({
    command: process.execPath,
    args: [join(mcpDir, 'index.js')],
    cwd: mcpDir,
    env: {
      ...process.env,
      SUPERICONS_API_KEY: '',
      SUPERICONS_CONFIG_DIR: configDir,
      SUPERICONS_CONTROLLED_RUN_LABEL: label,
      SUPERICONS_MCP_LOG_STARTUP: '0',
    },
    stderr: 'pipe',
  });
  client = new Client({
    name: 'local-attribution-production-check',
    version: '1.0.0',
  });
  await client.connect(transport);

  const toolResult = await client.callTool({
    name: 'search_icons',
    arguments: {
      query: 'settings',
      library_mode: 'all',
      style: 'outline',
      limit: 8,
    },
  });
  const text = toolResult.content?.find((entry) => entry.type === 'text')?.text;
  const parsedToolResult = JSON.parse(String(text || '{}'));
  assert.ok(Array.isArray(parsedToolResult.results));
  assert.ok(parsedToolResult.results.length > 0);
  const orderedRefs = parsedToolResult.results.map((entry) => entry.icon_ref);
  const orderedRefsHash = createHash('sha256')
    .update(JSON.stringify(orderedRefs))
    .digest('hex');

  const packageRows = await waitForRows(`
    select
      e.id,
      e.install_hash,
      e.install_key_version,
      e.client_family,
      e.client_version,
      e.os_platform,
      e.country_code,
      e.geo_source,
      e.episode_id,
      e.attempt_id,
      e.recovery_chain_id,
      e.result_count,
      e.mcp_server_version,
      f.id as final_id,
      f.traffic_class,
      f.install_hash as final_install_hash,
      f.install_key_version as final_install_key_version,
      f.client_version as final_client_version,
      f.os_platform as final_os_platform
    from public.mcp_usage_events e
    left join public.search_final_outcomes f
      on f.source_event_id = 'mcp_usage_events:' || e.id::text
    where e.beta_cohort = '${packageCohort}'
      and e.event_type = 'search_outcome'
    order by e.created_at desc;
  `, 1);
  assert.equal(packageRows.length, 1);
  const packageRow = packageRows[0];
  assert.match(packageRow.install_hash, /^[a-f0-9]{64}$/);
  assert.equal(Number(packageRow.install_key_version), 1);
  assert.equal(packageRow.client_family, 'local-attribution-production-check');
  assert.equal(packageRow.client_version, '1.0.0');
  assert.equal(packageRow.os_platform, 'win32');
  assert.equal(packageRow.traffic_class, 'controlled_test');
  assert.equal(Number(packageRow.result_count), parsedToolResult.results.length);
  assert.equal(packageRow.mcp_server_version, '0.4.24');
  assert.ok(packageRow.final_id);
  assert.equal(packageRow.final_install_hash, packageRow.install_hash);
  assert.equal(Number(packageRow.final_install_key_version), 1);
  assert.equal(packageRow.final_client_version, '1.0.0');
  assert.equal(packageRow.final_os_platform, 'win32');

  const installFile = JSON.parse(
    await readFile(join(configDir, 'install.json'), 'utf8'),
  );
  const rawInstallId = String(installFile.installation_id);
  assert.match(
    rawInstallId,
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
  );

  const spoofEpisode = randomUUID();
  const spoofPayload = {
    contract_version: 3,
    install_id: rawInstallId,
    episode_id: spoofEpisode,
    attempt_id: randomUUID(),
    recovery_chain_id: spoofEpisode,
    query: 'settings',
    result_count: parsedToolResult.results.length,
    library_filter: 'all',
    library_mode: 'all',
    search_outcome: 'results',
    tool_name: 'search_icons',
    locale: null,
    confidence_label: null,
    beta_cohort: spoofCohort,
    mcp_server_version: '0.4.24',
    latency_ms: 1,
    client_family: 'spoof_check',
    client_version: '1.0.0',
    os_platform: 'win32',
    session_hash: createHash('sha256').update(randomUUID()).digest('hex'),
  };
  const spoofFirst = await postV3(spoofPayload, {
    'cf-ipcountry': 'NZ',
    'x-vercel-ip-country': 'CA',
    'x-country-code': 'JP',
  });
  const spoofDuplicate = await postV3(spoofPayload, {
    'cf-ipcountry': 'NZ',
  });
  assert.equal(spoofFirst.duplicate, false);
  assert.equal(spoofDuplicate.duplicate, true);

  const spoofRows = await waitForRows(`
    select
      e.id,
      e.install_hash,
      e.country_code,
      e.geo_source,
      f.traffic_class,
      (
        select count(*)::int
        from public.search_final_outcomes f
        where f.source_event_id = 'mcp_usage_events:' || e.id::text
      ) as final_count
    from public.mcp_usage_events e
    left join public.search_final_outcomes f
      on f.source_event_id = 'mcp_usage_events:' || e.id::text
    where e.beta_cohort = '${spoofCohort}'
      and e.episode_id = '${spoofEpisode}'::uuid;
  `, 1);
  assert.equal(spoofRows.length, 1);
  assert.equal(spoofRows[0].install_hash, packageRow.install_hash);
  assert.notEqual(spoofRows[0].country_code, 'NZ');
  assert.equal(spoofRows[0].geo_source, 'supabase_postgrest_cf');
  assert.equal(spoofRows[0].traffic_class, 'controlled_test');
  assert.equal(Number(spoofRows[0].final_count), 1);

  const rawIdRows = await queryDatabase(`
    select count(*)::int as raw_identifier_matches
    from public.mcp_usage_events e
    where position('${rawInstallId}' in to_jsonb(e)::text) > 0;
  `);
  assert.equal(Number(rawIdRows[0].raw_identifier_matches), 0);

  const v2Response = await fetch(
    `${SUPABASE_URL}/rest/v1/rpc/si_log_mcp_search_outcome_v2`,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        apikey: SUPABASE_ANON,
        authorization: `Bearer ${SUPABASE_ANON}`,
        prefer: 'return=minimal',
      },
      body: JSON.stringify({
        p_query_norm: 'settings',
        p_result_count: parsedToolResult.results.length,
        p_library_filter: 'all',
        p_library_mode: 'all',
        p_search_outcome: 'results',
        p_tool_name: 'search_icons',
        p_session_hash: createHash('sha256').update(randomUUID()).digest('hex'),
        p_locale: null,
        p_confidence_label: null,
        p_beta_cohort: v2Cohort,
        p_mcp_server_version: '0.4.23',
        p_latency_ms: 1,
        p_created_at: new Date().toISOString(),
      }),
      signal: AbortSignal.timeout(10_000),
    },
  );
  assert.ok(v2Response.ok, `Legacy v2 write failed with ${v2Response.status}.`);
  const v2Rows = await waitForRows(`
    select
      install_hash,
      install_key_version,
      client_version,
      os_platform,
      f.traffic_class
    from public.mcp_usage_events e
    left join public.search_final_outcomes f
      on f.source_event_id = 'mcp_usage_events:' || e.id::text
    where e.beta_cohort = '${v2Cohort}'
      and e.event_type = 'search_outcome';
  `, 1);
  assert.equal(v2Rows.length, 1);
  assert.equal(v2Rows[0].install_hash, null);
  assert.equal(v2Rows[0].install_key_version, null);
  assert.equal(v2Rows[0].client_version, null);
  assert.equal(v2Rows[0].os_platform, null);
  assert.equal(v2Rows[0].traffic_class, 'controlled_test');

  const evidence = {
    artifact: 'local_mcp_attribution_v3_production_verification',
    generated_at: new Date().toISOString(),
    package_version: '0.4.24',
    controlled_rows_created: 3,
    ordinary_dashboard_rows_created: 0,
    package_path: {
      final_outcomes: 1,
      client_family: packageRow.client_family,
      client_version: packageRow.client_version,
      os_platform: packageRow.os_platform,
      country_code: packageRow.country_code,
      geo_source: packageRow.geo_source,
      result_count: Number(packageRow.result_count),
      ordered_result_refs_sha256: orderedRefsHash,
      install_hash_present: true,
      raw_install_identifier_stored: false,
    },
    spoof_resistance: {
      caller_country: 'NZ',
      stored_country: spoofRows[0].country_code,
      stored_geo_source: spoofRows[0].geo_source,
      caller_country_rejected: spoofRows[0].country_code !== 'NZ',
    },
    idempotency: {
      first_duplicate: spoofFirst.duplicate,
      retry_duplicate: spoofDuplicate.duplicate,
      usage_rows: spoofRows.length,
      final_rows: Number(spoofRows[0].final_count),
    },
    legacy_v2: {
      accepted: true,
      attribution_fields_null: true,
    },
    traffic_class: 'controlled_test',
    status: 'passed',
  };
  const resolvedOutput = resolve(outputPath);
  await mkdir(dirname(resolvedOutput), { recursive: true });
  await writeFile(resolvedOutput, `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(JSON.stringify({
    status: evidence.status,
    output: resolvedOutput,
    controlled_rows_created: evidence.controlled_rows_created,
    raw_install_identifier_stored: false,
    caller_country_rejected: true,
    idempotency_passed: true,
    v2_compatible: true,
  }));
} finally {
  if (transport) await transport.close().catch(() => {});
  void client;
  await rm(configDir, { recursive: true, force: true });
}
