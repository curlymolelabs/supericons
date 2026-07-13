import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';

const PROJECT_REF = 'kcjmkakdhsqplvasgkjv';
const ENDPOINT = `https://${PROJECT_REF}.supabase.co/functions/v1/mcp-search-v2-beta`;

const SEARCH_CASES = [
  { id: 'settings-all', query: 'settings', library_mode: 'all', limit: 5, locale: 'en' },
  { id: 'hello-all', query: 'hello', library_mode: 'all', limit: 8, locale: 'en' },
  { id: 'cog-bootstrap-strict', query: 'cog', library: 'bootstrap', library_mode: 'strict', limit: 8, locale: 'en' },
  { id: 'combobox-bootstrap-prefer', query: 'combobox', library: 'bootstrap', library_mode: 'prefer', limit: 8, locale: 'en' },
  { id: 'settings-zh-hans', query: '设置', library_mode: 'all', limit: 5, locale: 'zh-Hans' },
];

function readArg(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : null;
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function percentile(values, fraction) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1);
  return Number(sorted[index].toFixed(3));
}

function summaryFor(samples) {
  const durations = samples.map((sample) => sample.duration_ms);
  const errors = samples.filter((sample) => !sample.ok).length;
  return {
    samples: samples.length,
    successful: samples.length - errors,
    errors,
    error_rate_percent: Number(((errors / Math.max(1, samples.length)) * 100).toFixed(3)),
    p50_ms: percentile(durations, 0.5),
    p95_ms: percentile(durations, 0.95),
    maximum_ms: durations.length ? Number(Math.max(...durations).toFixed(3)) : 0,
  };
}

async function postSearch(searchCase) {
  const startedAt = performance.now();
  let response;
  let rawBody = '';
  let parsed = null;
  let error = null;

  try {
    response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: searchCase.query,
        library: searchCase.library || null,
        library_mode: searchCase.library_mode,
        limit: searchCase.limit,
        locale: searchCase.locale,
        source: 'mcp_beta',
        environment: 'preview',
        client_family: 'latency_gate_a',
        tool_name: 'search_icons',
        beta_cohort: 'deterministic-v2-beta',
      }),
    });
    rawBody = await response.text();
    try {
      parsed = JSON.parse(rawBody);
    } catch {
      error = 'invalid_json';
    }
  } catch (caught) {
    error = caught instanceof Error ? caught.message : 'request_failed';
  }

  const durationMs = Number((performance.now() - startedAt).toFixed(3));
  const status = response?.status || 0;
  const ok = Boolean(response?.ok && parsed && !error);
  return {
    case_id: searchCase.id,
    ok,
    status,
    duration_ms: durationMs,
    response_characters: rawBody.length,
    response_sha256: rawBody ? sha256(rawBody) : null,
    result_count: Array.isArray(parsed?.results) ? parsed.results.length : 0,
    result_icon_ids: Array.isArray(parsed?.results)
      ? parsed.results.map((row) => String(row?.icon_id || '')).filter(Boolean)
      : [],
    svg_result_count: Array.isArray(parsed?.results)
      ? parsed.results.filter((row) => typeof row?.svg === 'string' && row.svg.length > 0).length
      : 0,
    error,
  };
}

async function runSearch(variant) {
  const firstRequest = await postSearch(SEARCH_CASES[0]);
  const warmSamples = [];
  for (let repetition = 0; repetition < 5; repetition += 1) {
    for (const searchCase of SEARCH_CASES) {
      warmSamples.push(await postSearch(searchCase));
    }
  }

  return {
    mode: 'search',
    variant,
    endpoint: 'mcp-search-v2-beta',
    first_request: firstRequest,
    warm_summary: summaryFor(warmSamples),
    warm_samples: warmSamples,
  };
}

function normalizeHostedIcon(row) {
  if (!row?.icon_id) return null;
  const [libraryFromId, ...idParts] = String(row.icon_id).split(':');
  const library = row.library || row.source_library || libraryFromId;
  const id = idParts.join(':') || row.id || row.name;
  if (!library || !id || !row.svg) return null;

  return {
    id,
    name: row.name || id.replace(/[-_]/g, ' '),
    lib: library,
    library,
    type: row.icon_type || 'svg',
    style: row.style || 'outline',
    svg: row.svg,
    semantic: row.semantic || null,
  };
}

async function runRecommendationOnce(recommendIconsForTask, searchIconsHostedMcp) {
  let hostedSearchCalls = 0;
  const startedAt = performance.now();
  let payload = null;
  let error = null;

  try {
    payload = await recommendIconsForTask({
      task: 'Choose an icon for application settings.',
      slots: ['cog'],
      limitPerSlot: 3,
      responseMode: 'plan',
      locale: 'en',
      libraryMode: 'all',
      semanticMap: new Map(),
      searchIconsForQuery: async ({ query, library, style, limit, locale }) => {
        hostedSearchCalls += 1;
        const result = await searchIconsHostedMcp({
          query,
          library,
          libraryMode: 'all',
          style,
          limit,
          locale,
          usageContext: {
            source: 'mcp_beta',
            channel: 'hosted_mcp',
            environment: 'preview',
            client_family: 'latency_gate_a',
            tool_name: 'recommend_icons',
            beta_cohort: 'deterministic-v2-beta',
          },
        });
        return (result.results || []).map(normalizeHostedIcon).filter(Boolean);
      },
      buildIconResult: async (icon) => ({
        id: icon.id,
        name: icon.name,
        library: icon.library || icon.lib,
        style: icon.style,
        svg: icon.svg,
        semantic: icon.semantic || null,
      }),
    });
  } catch (caught) {
    error = caught instanceof Error ? caught.message : 'recommendation_failed';
  }

  const durationMs = Number((performance.now() - startedAt).toFixed(3));
  const publicSummary = payload
    ? {
        needs_clarification: payload.needs_clarification === true,
        result_count: Array.isArray(payload.results) ? payload.results.length : 0,
        recommended_ids: Array.isArray(payload.results)
          ? payload.results.map((row) => row?.recommended ? `${row.recommended.library}:${row.recommended.id}` : null).filter(Boolean)
          : [],
      }
    : null;
  return {
    ok: Boolean(payload && !error),
    duration_ms: durationMs,
    hosted_search_calls: hostedSearchCalls,
    response_sha256: publicSummary ? sha256(JSON.stringify(publicSummary)) : null,
    ...publicSummary,
    error,
  };
}

async function runRecommendation(variant) {
  process.env.SUPERICONS_MCP_SEARCH_URL = ENDPOINT;
  process.env.SUPERICONS_MCP_SEARCH_ANON_KEY = '';
  process.env.SUPERICONS_API_KEY = '';
  const [{ recommendIconsForTask }, { searchIconsHostedMcp }] = await Promise.all([
    import('../mcp/recommend-icons.js'),
    import('../mcp/hosted-search-client.js'),
  ]);

  const firstRequest = await runRecommendationOnce(recommendIconsForTask, searchIconsHostedMcp);
  const warmSamples = [];
  for (let index = 0; index < 20; index += 1) {
    warmSamples.push(await runRecommendationOnce(recommendIconsForTask, searchIconsHostedMcp));
  }

  return {
    mode: 'recommendation',
    variant,
    endpoint: 'mcp-search-v2-beta',
    first_request: firstRequest,
    warm_summary: {
      ...summaryFor(warmSamples),
      hosted_search_calls: warmSamples.reduce((total, sample) => total + sample.hosted_search_calls, 0),
      hosted_search_calls_per_recommendation: warmSamples.map((sample) => sample.hosted_search_calls),
    },
    warm_samples: warmSamples,
  };
}

const mode = readArg('mode');
const variant = readArg('variant');
const output = readArg('output');
assert.ok(['search', 'recommendation'].includes(mode), 'Use --mode search or --mode recommendation.');
assert.ok(['control', 'treatment'].includes(variant), 'Use --variant control or --variant treatment.');
assert.ok(output, 'Provide --output with a local JSON path.');

const result = mode === 'search'
  ? await runSearch(variant)
  : await runRecommendation(variant);
const artifact = {
  schema_version: 1,
  manifest_sha256: 'fcdfaeef7f19af49536438ca1518655813fcffd103866d352cdb792c6821bb25',
  measured_at: new Date().toISOString(),
  ...result,
};

const outputPath = resolve(output);
mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({
  status: 'ok',
  output: outputPath,
  mode: artifact.mode,
  variant: artifact.variant,
  first_request_ms: artifact.first_request.duration_ms,
  warm_summary: artifact.warm_summary,
}, null, 2));

if (!artifact.first_request.ok || artifact.warm_summary.errors > 0) {
  process.exitCode = 1;
}
