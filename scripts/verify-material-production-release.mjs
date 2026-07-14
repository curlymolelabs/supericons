import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const defaultSearchUrl = 'https://kcjmkakdhsqplvasgkjv.supabase.co/functions/v1/mcp-search';

function readArg(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : '';
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function chunks(values, size) {
  const result = [];
  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size));
  }
  return result;
}

function isSvg(value) {
  return typeof value === 'string'
    && /^<svg\b/i.test(value.trim())
    && !/<script\b/i.test(value)
    && !/<image\b/i.test(value);
}

function isAllowedEndpoint(value) {
  return /^https:\/\//.test(value)
    || /^http:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?(?:\/|$)/.test(value);
}

function iconId(row) {
  return String(row?.icon_id || row?.id || '').replace(/^material:/, '');
}

function parseToolPayload(result, toolName) {
  assert.notEqual(result?.isError, true, `${toolName} returned an MCP error`);
  if (result?.structuredContent && typeof result.structuredContent === 'object') {
    return result.structuredContent;
  }
  const text = result?.content?.find((entry) => entry?.type === 'text')?.text;
  assert.equal(typeof text, 'string', `${toolName} returned no structured or text payload`);
  return JSON.parse(text);
}

async function runTimed(operation) {
  const startedAt = performance.now();
  const value = await operation();
  return {
    value,
    duration_ms: Number((performance.now() - startedAt).toFixed(3)),
  };
}

async function runSearchGate(searchUrl, apiKey) {
  const relevance = readJson(join(
    rootDir,
    'references',
    'verification',
    'material-relevance-fixture-2026-07-14.json',
  ));
  const smoke = readJson(join(
    rootDir,
    'references',
    'verification',
    'material-acceptance-queries-2026-07-14.json',
  ));
  const cases = [];

  for (const entry of relevance.queries) {
    for (const style of ['outline', 'solid']) {
      cases.push({
        kind: 'relevance',
        id: `relevance:${entry.query}:${style}`,
        acceptableIconIds: entry.acceptable_icon_ids,
        request: {
          query: entry.query,
          library: 'material',
          library_mode: 'strict',
          style,
          limit: 10,
        },
      });
    }
  }
  for (const entry of smoke.queries) {
    cases.push({
      kind: 'smoke',
      id: `smoke:${entry.query}`,
      request: {
        query: entry.query,
        library: 'material',
        library_mode: 'strict',
        style: 'outline',
        limit: 3,
      },
    });
  }
  for (const query of ['settings', 'cog']) {
    cases.push({
      kind: 'all_mode',
      id: `all:${query}`,
      request: {
        query,
        library: null,
        library_mode: 'all',
        style: 'any',
        limit: 10,
      },
    });
  }

  const summaries = [];
  const requestDurations = [];
  for (const batch of chunks(cases, 24)) {
    const headers = { 'Content-Type': 'application/json' };
    if (apiKey) headers['x-supericons-api-key'] = apiKey;
    const timed = await runTimed(async () => {
      const response = await fetch(searchUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          queries: batch.map((entry, index) => ({
            ...entry.request,
            source: 'verify',
            channel: 'hosted_mcp',
            environment: 'production',
            client_family: 'material_release_gate',
            tool_name: 'search_icons',
            dedupe_key: `material-release:${entry.id}:${index}`.slice(0, 180),
          })),
        }),
      });
      const rawBody = await response.text();
      assert.equal(response.status, 200, `grouped search returned ${response.status}: ${rawBody.slice(0, 300)}`);
      return JSON.parse(rawBody);
    });
    requestDurations.push(timed.duration_ms);
    assert.equal(timed.value.responses?.length, batch.length, 'grouped search response count changed');

    for (let index = 0; index < batch.length; index += 1) {
      const testCase = batch[index];
      const entry = timed.value.responses[index];
      assert.equal(entry?.index, index, `${testCase.id} returned out of order`);
      assert.ok(entry.status >= 200 && entry.status < 300, `${testCase.id} returned status ${entry.status}`);
      assert.ok(Array.isArray(entry.body?.results), `${testCase.id} returned no results array`);
      assert.notEqual(entry.body?.error_code, 'material_asset_unavailable', `${testCase.id} hit an asset gap`);
      const results = entry.body.results;

      if (testCase.kind === 'relevance') {
        const acceptable = results.find((row) => testCase.acceptableIconIds.includes(iconId(row)));
        assert.ok(acceptable, `${testCase.id} returned no acceptable Material icon`);
        assert.ok(isSvg(acceptable.svg), `${testCase.id} returned an invalid SVG`);
        assert.equal(acceptable.style, testCase.request.style, `${testCase.id} returned the wrong style`);
      } else if (testCase.kind === 'all_mode') {
        assert.equal(results.length, testCase.request.limit, `${testCase.id} returned a shortened result set`);
        assert.ok(results.every((row) => isSvg(row.svg)), `${testCase.id} returned a result without valid SVG`);
      }

      summaries.push({
        id: testCase.id,
        kind: testCase.kind,
        result_count: results.length,
        result_icon_ids: results.map(iconId),
      });
    }
  }

  return {
    endpoint: searchUrl,
    grouped_requests: requestDurations.length,
    grouped_request_durations_ms: requestDurations,
    logical_queries: cases.length,
    relevance_checks: summaries.filter((entry) => entry.kind === 'relevance').length,
    smoke_checks: summaries.filter((entry) => entry.kind === 'smoke').length,
    all_mode_checks: summaries.filter((entry) => entry.kind === 'all_mode').length,
    cases: summaries,
  };
}

async function runMcpGate(mcpUrl, apiKey) {
  const headers = {};
  if (apiKey) headers['x-supericons-api-key'] = apiKey;
  const transport = new StreamableHTTPClientTransport(new URL(mcpUrl), {
    requestInit: { headers },
  });
  const client = new Client({ name: 'material-release-verifier', version: '1.0.0' });
  const timings = {};

  async function callTool(name, args) {
    const timed = await runTimed(() => client.callTool({ name, arguments: args }));
    timings[name] = [...(timings[name] || []), timed.duration_ms];
    return parseToolPayload(timed.value, name);
  }

  try {
    await client.connect(transport);
    const libraries = await callTool('list_libraries', {});
    const material = libraries.libraries?.find((library) => library.id === 'material');
    assert.ok(material, 'list_libraries omitted Material Symbols');
    assert.equal(material.count, 4262);
    assert.equal(material.outlineCount, 4262);
    assert.equal(material.solidCount, 4262);
    assert.deepEqual(material.supportedStyles, ['outline', 'solid']);

    const searches = {};
    const exact = {};
    for (const style of ['outline', 'solid']) {
      const search = await callTool('search_icons', {
        query: 'settings',
        library: 'material',
        library_mode: 'strict',
        style,
        limit: 5,
      });
      assert.ok(search.results?.length > 0, `MCP search returned no ${style} Material results`);
      assert.ok(search.results.every((row) => isSvg(row.svg)), `MCP search returned invalid ${style} SVG`);
      assert.ok(search.results.some((row) => iconId(row) === 'settings'), `MCP search missed settings in ${style}`);
      searches[style] = search.results.map(iconId);

      const icon = await callTool('get_icon', { id: 'settings', library: 'material', style });
      assert.equal(icon.icon?.id, 'settings');
      assert.equal(icon.icon?.library, 'material');
      assert.equal(icon.icon?.style, style);
      assert.ok(isSvg(icon.icon?.svg), `MCP get_icon returned invalid ${style} SVG`);
      exact[style] = true;
    }

    const recommendation = await callTool('recommend_icons', {
      task: 'Choose a Material icon for application settings.',
      slots: ['settings'],
      library: 'material',
      style: 'solid',
      limit_per_slot: 3,
      response_mode: 'assets',
    });
    const recommended = recommendation.results?.[0]?.recommended;
    assert.equal(recommended?.library, 'material');
    assert.ok(isSvg(recommended?.svg), 'MCP recommendation returned no valid Material SVG');

    const preview = await callTool('preview_icons', {
      query: 'settings',
      library: 'material',
      style: 'solid',
      limit: 3,
      include_image: false,
    });
    assert.ok(preview.results?.length > 0, 'MCP preview returned no Material results');
    assert.ok(
      preview.results.every((row) => (
        row.library === 'material'
        && row.style === 'solid'
        && String(row.icon_ref || '').startsWith('material:')
      )),
      'MCP preview returned the wrong library, style, or icon reference',
    );
    assert.match(preview.preview_url || '', /^https:\/\//, 'MCP preview returned no public preview URL');

    return {
      endpoint: mcpUrl,
      material_library: {
        count: material.count,
        outline_count: material.outlineCount,
        solid_count: material.solidCount,
        supported_styles: material.supportedStyles,
      },
      search_result_icon_ids: searches,
      exact_icon_checks: exact,
      recommendation_icon_id: iconId(recommended),
      preview_result_count: preview.results.length,
      tool_durations_ms: timings,
    };
  } finally {
    await transport.close().catch(() => {});
  }
}

const output = readArg('output');
const revision = readArg('revision');
const searchUrl = (readArg('search-url') || process.env.SUPERICONS_MCP_SEARCH_URL || defaultSearchUrl).replace(/\/+$/, '');
const mcpUrl = (readArg('mcp-url') || process.env.SUPERICONS_REMOTE_MCP_URL || '').replace(/\/+$/, '');
const apiKey = process.env.SUPERICONS_API_KEY || '';

assert.ok(output, 'Provide --output with a local JSON path.');
assert.match(revision, /^[a-f0-9]{40}$/, 'Provide --revision with the approved 40-character commit SHA.');
assert.ok(isAllowedEndpoint(searchUrl), 'The search gate requires HTTPS except for a local verification server.');
if (mcpUrl) assert.ok(isAllowedEndpoint(mcpUrl), 'The hosted MCP gate requires HTTPS except for a local verification server.');

const artifact = {
  schema_version: 1,
  measured_at: new Date().toISOString(),
  revision,
  search: await runSearchGate(searchUrl, apiKey),
  hosted_mcp: mcpUrl ? await runMcpGate(mcpUrl, apiKey) : null,
};

const outputPath = resolve(output);
mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({
  status: 'ok',
  output: outputPath,
  revision,
  search_logical_queries: artifact.search.logical_queries,
  relevance_checks: artifact.search.relevance_checks,
  smoke_checks: artifact.search.smoke_checks,
  all_mode_checks: artifact.search.all_mode_checks,
  hosted_mcp_checked: artifact.hosted_mcp !== null,
}, null, 2));
