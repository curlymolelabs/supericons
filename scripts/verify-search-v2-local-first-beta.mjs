import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const rootDir = join(import.meta.dirname, '..');
const mcpDir = join(rootDir, 'mcp');
const packageJson = JSON.parse(readFileSync(join(mcpDir, 'package.json'), 'utf8'));
const hostedCalls = [];
const materialAssetCalls = [];
const telemetryCalls = [];
let failTelemetry = false;

function parseToolPayload(result, toolName) {
  const text = result?.content?.find((entry) => entry?.type === 'text')?.text;
  assert.equal(typeof text, 'string', `${toolName} did not return text content`);
  return JSON.parse(text);
}

function hostedResultFor(entry = {}) {
  const library = entry.library || 'lucide';
  const id = library === 'material' ? 'settings' : 'settings';
  return {
    icon_id: `${library}:${id}`,
    id,
    name: 'settings',
    library,
    source_library: library,
    icon_type: library === 'material' ? 'font' : 'svg',
    style: entry.style === 'solid' ? 'solid' : 'outline',
    svg: library === 'material'
      ? null
      : '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M1 1h2v2H1z"/></svg>',
  };
}

const server = createServer(async (request, response) => {
  if (request.method === 'GET') {
    materialAssetCalls.push(request.url);
    response.writeHead(200, { 'Content-Type': 'image/svg+xml' });
    response.end('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M2 2h20v20H2z"/></svg>');
    return;
  }

  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  if (request.url?.startsWith('/rest/v1/rpc/')) {
    telemetryCalls.push({ url: request.url, body });
    response.writeHead(failTelemetry ? 503 : 200, { 'Content-Type': 'application/json' });
    response.end(failTelemetry ? JSON.stringify({ error: 'telemetry unavailable' }) : 'null');
    return;
  }
  hostedCalls.push(body);
  response.writeHead(200, { 'Content-Type': 'application/json' });
  if (Array.isArray(body.queries)) {
    response.end(JSON.stringify({
      responses: body.queries.map((entry, index) => ({
        index,
        status: 200,
        body: { results: [hostedResultFor(entry)] },
      })),
    }));
    return;
  }
  response.end(JSON.stringify({ results: [hostedResultFor(body)] }));
});

await new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(0, '127.0.0.1', resolve);
});
const address = server.address();
const baseUrl = `http://127.0.0.1:${address.port}`;

async function waitForTelemetryCount(minimumCount) {
  const deadline = Date.now() + 2000;
  while (Date.now() < deadline) {
    const count = telemetryCalls.filter((entry) => (
      entry.url.endsWith('/rpc/si_log_mcp_search_outcome_v2')
    )).length;
    if (count >= minimumCount) return;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  assert.fail(`Timed out waiting for ${minimumCount} search outcome telemetry calls`);
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
  const { StdioClientTransport } = await import(pathToFileURL(join(sdkBase, 'stdio.js')).href);
  transport = new StdioClientTransport({
    command: process.execPath,
    args: [join(mcpDir, 'index.js')],
    cwd: mcpDir,
    env: {
      ...process.env,
      SUPERICONS_API_KEY: '',
      SUPERICONS_MCP_LOG_STARTUP: '0',
      SUPERICONS_MCP_SEARCH_URL: `${baseUrl}/search`,
      SUPERICONS_MATERIAL_SNAPSHOT_URL: `${baseUrl}/material`,
      SUPERICONS_SUPABASE_URL: baseUrl,
    },
    stderr: 'pipe',
  });
  client = new Client({ name: 'search-v2-local-first-verifier', version: '1.0.0' });
  await client.connect(transport);

  const callsBeforeEnglish = hostedCalls.length;
  const english = parseToolPayload(await client.callTool({
    name: 'search_icons',
    arguments: {
      query: 'settings',
      library_mode: 'all',
      style: 'outline',
      limit: 8,
      include_query_frame: true,
    },
  }), 'search_icons English');
  const callsAfterEnglish = hostedCalls.length;
  await waitForTelemetryCount(1);
  const englishOutcomeCalls = telemetryCalls.filter((entry) => (
    entry.url.endsWith('/rpc/si_log_mcp_search_outcome_v2')
  ));

  const materialOutline = parseToolPayload(await client.callTool({
    name: 'search_icons',
    arguments: {
      query: 'settings',
      library: 'material',
      library_mode: 'strict',
      style: 'outline',
      limit: 3,
    },
  }), 'search_icons Material outline');
  const materialSolid = parseToolPayload(await client.callTool({
    name: 'search_icons',
    arguments: {
      query: 'settings',
      library: 'material',
      library_mode: 'strict',
      style: 'solid',
      limit: 3,
    },
  }), 'search_icons Material solid');
  const callsAfterMaterial = hostedCalls.length;

  const localized = parseToolPayload(await client.callTool({
    name: 'search_icons',
    arguments: {
      query: '设置',
      locale: 'zh-Hans',
      library_mode: 'all',
      style: 'outline',
      limit: 5,
    },
  }), 'search_icons localized');
  const callsAfterLocalized = hostedCalls.length;

  const untaggedNonAscii = parseToolPayload(await client.callTool({
    name: 'search_icons',
    arguments: {
      query: '设置',
      library_mode: 'all',
      style: 'outline',
      limit: 5,
    },
  }), 'search_icons non-ASCII without locale');
  const callsAfterUntaggedNonAscii = hostedCalls.length;

  const recommendation = parseToolPayload(await client.callTool({
    name: 'recommend_icons',
    arguments: {
      task: 'Choose an icon for settings.',
      slots: ['settings'],
      limit_per_slot: 1,
    },
  }), 'recommend_icons');
  const callsAfterRecommendation = hostedCalls.length;
  await waitForTelemetryCount(6);
  const localizedHostedCall = hostedCalls[callsAfterMaterial];
  const untaggedNonAsciiCall = hostedCalls[callsAfterLocalized];
  const recommendationHostedCalls = hostedCalls.slice(callsAfterUntaggedNonAscii);

  const materialRows = [...(materialOutline.results || []), ...(materialSolid.results || [])];

  failTelemetry = true;
  const callsBeforeTelemetryFailure = hostedCalls.length;
  const telemetryFailureSearch = parseToolPayload(await client.callTool({
    name: 'search_icons',
    arguments: {
      query: 'settings panel',
      library_mode: 'all',
      style: 'outline',
      limit: 4,
    },
  }), 'search_icons with telemetry failure');
  await waitForTelemetryCount(7);
  const callsAfterTelemetryFailure = hostedCalls.length;

  const callsBeforeZero = hostedCalls.length;
  const localZero = parseToolPayload(await client.callTool({
    name: 'search_icons',
    arguments: {
      query: 'zzqvxxjk',
      library_mode: 'all',
      style: 'outline',
      limit: 4,
    },
  }), 'search_icons local zero');
  await waitForTelemetryCount(8);
  const callsAfterZero = hostedCalls.length;

  const invalidRequest = parseToolPayload(await client.callTool({
    name: 'search_icons',
    arguments: {
      query: 'settings',
      library_mode: 'prefer',
      style: 'outline',
      limit: 4,
    },
  }), 'search_icons invalid preferred mode');

  const checks = {
    package_has_material_bundle: packageJson.files.includes('material-mcp-assets.json.gz'),
    package_has_material_manifest: packageJson.files.includes('material-mcp-assets-manifest.json'),
    english_skips_hosted_search: callsAfterEnglish === callsBeforeEnglish,
    material_searches_skip_hosted_search: callsAfterMaterial === callsAfterEnglish,
    localized_uses_hosted_search: callsAfterLocalized > callsAfterMaterial,
    untagged_non_ascii_uses_hosted_search: callsAfterUntaggedNonAscii > callsAfterLocalized,
    recommendation_uses_hosted_search: callsAfterRecommendation > callsAfterUntaggedNonAscii,
    localized_has_no_beta_cohort: localizedHostedCall?.beta_cohort === undefined,
    untagged_non_ascii_has_no_beta_cohort: untaggedNonAsciiCall?.beta_cohort === undefined,
    recommendation_has_no_beta_cohort: recommendationHostedCalls.every((entry) => (
      Array.isArray(entry.queries)
        ? entry.queries.every((query) => query.beta_cohort === undefined)
        : entry.beta_cohort === undefined
    )),
    english_has_results: Array.isArray(english.results) && english.results.length > 0,
    english_has_query_frame: Boolean(english.query_frame),
    english_reports_local_runtime: english.search_runtime?.mode === 'local_first'
      && typeof english.search_runtime?.index_generated_at === 'string',
    localized_has_results: Array.isArray(localized.results) && localized.results.length > 0,
    untagged_non_ascii_has_results: Array.isArray(untaggedNonAscii.results)
      && untaggedNonAscii.results.length > 0,
    recommendation_has_results: Array.isArray(recommendation.results),
    material_outline_has_svg: materialOutline.results?.every((entry) => (
      entry.library === 'material' && entry.style === 'outline' && entry.svg?.startsWith('<svg')
    )) === true,
    material_solid_has_svg: materialSolid.results?.every((entry) => (
      entry.library === 'material' && entry.style === 'solid' && entry.svg?.startsWith('<svg')
    )) === true,
    material_assets_are_local: materialAssetCalls.length === 0,
    material_bundle_source_reported: materialRows.every((entry) => (
      entry.svgSource === 'owned-material-cache:bundle'
    )),
    local_search_writes_one_outcome_attempt: englishOutcomeCalls.length === 1
      && englishOutcomeCalls[0].body.p_beta_cohort === 'deterministic-v2-beta'
      && englishOutcomeCalls[0].body.p_tool_name === 'search_icons'
      && englishOutcomeCalls[0].body.p_search_outcome === 'results'
      && englishOutcomeCalls[0].body.p_result_count === english.results.length,
    hosted_fallback_keeps_local_client_attribution: [
      localizedHostedCall,
      untaggedNonAsciiCall,
      ...recommendationHostedCalls,
    ].every((entry) => (
      entry?.channel === 'local_mcp'
      && entry?.environment === 'production'
      && entry?.client_family === 'mcp_stdio'
    )),
    hosted_fallback_reuses_local_session_identity: [
      localizedHostedCall,
      untaggedNonAsciiCall,
      ...recommendationHostedCalls,
    ].every((entry) => (
      /^[a-f0-9]{64}$/.test(String(entry?.session_hash || ''))
      && telemetryCalls
        .filter((call) => call.url.endsWith('/rpc/si_log_mcp_search_outcome_v2'))
        .some((call) => call.body.p_session_hash === entry.session_hash)
    )),
    returned_icon_evidence_uses_local_venue: telemetryCalls
      .filter((entry) => entry.url.endsWith('/rpc/si_log_icon_evidence'))
      .every((entry) => entry.body.p_ui_surface === 'local_mcp'),
    telemetry_failure_does_not_fail_local_search: Array.isArray(telemetryFailureSearch.results)
      && telemetryFailureSearch.results.length > 0
      && callsAfterTelemetryFailure === callsBeforeTelemetryFailure,
    local_zero_is_explicit_and_local: localZero.code === 'no_icons_found'
      && localZero.search_runtime?.mode === 'local_first'
      && typeof localZero.search_runtime?.index_generated_at === 'string'
      && callsAfterZero === callsBeforeZero,
    invalid_request_rejected: invalidRequest.code === 'preferred_library_required'
      && invalidRequest.retryable === false,
    package_pre_publish_runs_local_gate: packageJson.scripts?.prepublishOnly?.includes(
      'verify:local-first-beta',
    ) === true,
    package_pre_publish_runs_stdio_route_gate: packageJson.scripts?.prepublishOnly?.includes(
      'verify:route-package',
    ) === true,
  };

  assert.deepEqual(
    Object.entries(checks).filter(([, passed]) => !passed),
    [],
    `Local-first beta checks failed: ${JSON.stringify({ checks, localZero, invalidRequest })}`,
  );

  console.log(JSON.stringify({
    status: 'ok',
    checks,
    hosted_calls: hostedCalls.length,
    material_asset_calls: materialAssetCalls.length,
    search_outcome_telemetry_calls: telemetryCalls.filter((entry) => (
      entry.url.endsWith('/rpc/si_log_mcp_search_outcome_v2')
    )).length,
    english_result_count: english.results.length,
    localized_result_count: localized.results.length,
  }, null, 2));
} finally {
  if (transport) await transport.close().catch(() => {});
  void client;
  await new Promise((resolve) => server.close(resolve));
}
