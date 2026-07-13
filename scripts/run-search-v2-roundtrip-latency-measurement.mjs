import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';

const PROJECT_REF = 'kcjmkakdhsqplvasgkjv';
const ENDPOINTS = {
  control: 'mcp-search-v2-control',
  treatment: 'mcp-search-v2-treatment',
};
const SEARCH_CASES = [
  { id: 'settings-all', query: 'settings', library_mode: 'all', limit: 5, locale: 'en' },
  { id: 'hello-all', query: 'hello', library_mode: 'all', limit: 8, locale: 'en' },
  { id: 'cog-bootstrap-strict', query: 'cog', library: 'bootstrap', library_mode: 'strict', limit: 8, locale: 'en' },
  { id: 'combobox-bootstrap-prefer', query: 'combobox', library: 'bootstrap', library_mode: 'prefer', limit: 8, locale: 'en' },
  {
    id: 'settings-zh-hans-expanded',
    query: 'settings',
    library_mode: 'all',
    limit: 5,
    locale: null,
    localized_query: '设置',
    localized_locale: 'zh-Hans',
  },
];

function readArg(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : null;
}

function endpointUrl(variant) {
  return `https://${PROJECT_REF}.supabase.co/functions/v1/${ENDPOINTS[variant]}`;
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

function summarize(samples) {
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

function variantOrder(pairIndex) {
  return pairIndex % 2 === 0 ? ['control', 'treatment'] : ['treatment', 'control'];
}

async function postSearch(variant, searchCase) {
  const startedAt = performance.now();
  let response;
  let rawBody = '';
  let parsed = null;
  let error = null;
  try {
    response = await fetch(endpointUrl(variant), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: searchCase.query,
        library: searchCase.library || null,
        library_mode: searchCase.library_mode,
        limit: searchCase.limit,
        locale: searchCase.locale,
        localized_query: searchCase.localized_query || null,
        localized_locale: searchCase.localized_locale || null,
        source: 'mcp_beta',
        environment: 'preview',
        client_family: 'roundtrip_latency_gate',
        tool_name: 'search_icons',
        beta_cohort: 'deterministic-v2-roundtrip-measurement',
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

  return {
    variant,
    case_id: searchCase.id,
    ok: Boolean(response?.ok && parsed && !error),
    status: response?.status || 0,
    duration_ms: Number((performance.now() - startedAt).toFixed(3)),
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

async function runParity() {
  const samples = [];
  let pairIndex = 0;
  for (let repetition = 0; repetition < 3; repetition += 1) {
    for (const searchCase of SEARCH_CASES) {
      for (const variant of variantOrder(pairIndex)) {
        samples.push(await postSearch(variant, searchCase));
      }
      pairIndex += 1;
    }
  }

  const cases = SEARCH_CASES.map((searchCase) => {
    const control = samples.filter((sample) => sample.case_id === searchCase.id && sample.variant === 'control');
    const treatment = samples.filter((sample) => sample.case_id === searchCase.id && sample.variant === 'treatment');
    const controlHashes = [...new Set(control.map((sample) => sample.response_sha256))];
    const treatmentHashes = [...new Set(treatment.map((sample) => sample.response_sha256))];
    return {
      case_id: searchCase.id,
      control_samples: control.length,
      treatment_samples: treatment.length,
      stable_control: controlHashes.length === 1,
      stable_treatment: treatmentHashes.length === 1,
      exact_cross_variant_match: controlHashes.length === 1
        && treatmentHashes.length === 1
        && controlHashes[0] === treatmentHashes[0]
        && control[0]?.status === treatment[0]?.status
        && control[0]?.svg_result_count === treatment[0]?.svg_result_count,
      control_hash: controlHashes.length === 1 ? controlHashes[0] : null,
      treatment_hash: treatmentHashes.length === 1 ? treatmentHashes[0] : null,
      minimum_results_passed: !searchCase.minimum_results
        || (control[0]?.result_count >= searchCase.minimum_results && treatment[0]?.result_count >= searchCase.minimum_results),
    };
  });
  const passed = samples.every((sample) => sample.ok)
    && cases.every((entry) => entry.stable_control && entry.stable_treatment && entry.exact_cross_variant_match && entry.minimum_results_passed);
  return { passed, cases, samples };
}

async function runDirectSearch() {
  const first_requests = {};
  for (const variant of variantOrder(0)) {
    first_requests[variant] = await postSearch(variant, SEARCH_CASES[0]);
  }
  const samples = { control: [], treatment: [] };
  let pairIndex = 0;
  for (let repetition = 0; repetition < 5; repetition += 1) {
    for (const searchCase of SEARCH_CASES) {
      for (const variant of variantOrder(pairIndex)) {
        samples[variant].push(await postSearch(variant, searchCase));
      }
      pairIndex += 1;
    }
  }
  return {
    first_requests,
    control: summarize(samples.control),
    treatment: summarize(samples.treatment),
    samples,
  };
}

function configureClientEndpoint(variant) {
  process.env.SUPERICONS_MCP_SEARCH_URL = endpointUrl(variant);
  process.env.SUPERICONS_MCP_SEARCH_ANON_KEY = '';
  process.env.SUPERICONS_API_KEY = '';
}

async function runLocalizedOnce(variant, searchIconsHostedMcp) {
  configureClientEndpoint(variant);
  const originalFetch = globalThis.fetch;
  let hostedRequests = 0;
  globalThis.fetch = async (...args) => {
    hostedRequests += 1;
    return originalFetch(...args);
  };
  const startedAt = performance.now();
  let payload = null;
  let error = null;
  try {
    payload = await searchIconsHostedMcp({
      query: '设置',
      libraryMode: 'all',
      limit: 5,
      locale: 'zh-Hans',
      usageContext: {
        source: 'mcp_beta',
        channel: 'hosted_mcp',
        environment: 'preview',
        client_family: 'roundtrip_latency_gate',
        tool_name: 'search_icons',
        beta_cohort: 'deterministic-v2-roundtrip-measurement',
      },
    });
  } catch (caught) {
    error = caught instanceof Error ? caught.message : 'localized_search_failed';
  } finally {
    globalThis.fetch = originalFetch;
  }
  const summary = payload ? {
    result_count: Array.isArray(payload.results) ? payload.results.length : 0,
    result_icon_ids: Array.isArray(payload.results)
      ? payload.results.map((row) => String(row?.icon_id || '')).filter(Boolean)
      : [],
  } : null;
  return {
    variant,
    ok: Boolean(payload && !error),
    duration_ms: Number((performance.now() - startedAt).toFixed(3)),
    hosted_requests: hostedRequests,
    response_sha256: summary ? sha256(JSON.stringify(summary)) : null,
    ...summary,
    error,
  };
}

async function runLocalized(searchIconsHostedMcp) {
  const first_requests = {};
  for (const variant of variantOrder(0)) {
    first_requests[variant] = await runLocalizedOnce(variant, searchIconsHostedMcp);
  }
  const samples = { control: [], treatment: [] };
  for (let pairIndex = 0; pairIndex < 5; pairIndex += 1) {
    for (const variant of variantOrder(pairIndex)) {
      samples[variant].push(await runLocalizedOnce(variant, searchIconsHostedMcp));
    }
  }
  return {
    first_requests,
    control: { ...summarize(samples.control), hosted_requests_per_search: samples.control.map((sample) => sample.hosted_requests) },
    treatment: { ...summarize(samples.treatment), hosted_requests_per_search: samples.treatment.map((sample) => sample.hosted_requests) },
    samples,
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

async function runRecommendationOnce(
  variant,
  recommendIconsForTask,
  searchIconsHostedMcp,
  searchIconQueriesHostedMcp,
) {
  configureClientEndpoint(variant);
  const grouped = variant === 'treatment';
  let hostedSearchCalls = 0;
  let actualHttpRequests = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (...args) => {
    actualHttpRequests += 1;
    return originalFetch(...args);
  };
  const usageContext = {
    source: 'mcp_beta',
    channel: 'hosted_mcp',
    environment: 'preview',
    client_family: 'roundtrip_latency_gate',
    tool_name: 'recommend_icons',
    beta_cohort: 'deterministic-v2-roundtrip-measurement',
  };
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
      semanticMap: new Map(),
      searchIconsForQuery: async (query) => {
        hostedSearchCalls += 1;
        const result = await searchIconsHostedMcp({ ...query, libraryMode: 'all', usageContext });
        return (result.results || []).map(normalizeHostedIcon).filter(Boolean);
      },
      ...(grouped ? {
        searchIconsForQueries: async (queries) => {
          hostedSearchCalls += 1;
          const results = await searchIconQueriesHostedMcp({
            queries: queries.map((query) => ({ ...query, libraryMode: 'all', usageContext })),
          });
          return results.map((result) => (result.results || []).map(normalizeHostedIcon).filter(Boolean));
        },
      } : {}),
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
  } finally {
    globalThis.fetch = originalFetch;
  }
  const publicSummary = payload ? {
    needs_clarification: payload.needs_clarification === true,
    result_count: Array.isArray(payload.results) ? payload.results.length : 0,
    recommended_ids: Array.isArray(payload.results)
      ? payload.results.map((row) => row?.recommended ? `${row.recommended.library}:${row.recommended.id}` : null).filter(Boolean)
      : [],
  } : null;
  return {
    variant,
    recommendation_path: grouped ? 'grouped' : 'separate',
    ok: Boolean(payload && !error),
    duration_ms: Number((performance.now() - startedAt).toFixed(3)),
    hosted_search_calls: hostedSearchCalls,
    actual_http_requests: actualHttpRequests,
    response_sha256: publicSummary ? sha256(JSON.stringify(publicSummary)) : null,
    ...publicSummary,
    error,
  };
}

async function runRecommendation(clients) {
  const first_requests = {};
  for (const variant of variantOrder(0)) {
    first_requests[variant] = await runRecommendationOnce(variant, ...clients);
  }
  const samples = { control: [], treatment: [] };
  for (let pairIndex = 0; pairIndex < 20; pairIndex += 1) {
    for (const variant of variantOrder(pairIndex)) {
      samples[variant].push(await runRecommendationOnce(variant, ...clients));
    }
  }
  const publicResultParity = first_requests.control.response_sha256 === first_requests.treatment.response_sha256
    && samples.control.every((sample, index) => sample.response_sha256 === samples.treatment[index]?.response_sha256);
  return {
    first_requests,
    public_result_parity: publicResultParity,
    control: {
      ...summarize(samples.control),
      hosted_search_calls_per_recommendation: samples.control.map((sample) => sample.hosted_search_calls),
      actual_http_requests_per_recommendation: samples.control.map((sample) => sample.actual_http_requests),
    },
    treatment: {
      ...summarize(samples.treatment),
      hosted_search_calls_per_recommendation: samples.treatment.map((sample) => sample.hosted_search_calls),
      actual_http_requests_per_recommendation: samples.treatment.map((sample) => sample.actual_http_requests),
    },
    samples,
  };
}

const manifestHash = readArg('manifest-hash');
const output = readArg('output');
assert.match(manifestHash || '', /^[a-f0-9]{64}$/, 'Provide --manifest-hash with the approved fingerprint.');
assert.ok(output, 'Provide --output with a local JSON path.');

const [{ searchIconsHostedMcp, searchIconQueriesHostedMcp }, { recommendIconsForTask }] = await Promise.all([
  import('../mcp/hosted-search-client.js'),
  import('../mcp/recommend-icons.js'),
]);

const parity = await runParity();
const artifact = {
  schema_version: 1,
  manifest_sha256: manifestHash,
  measured_at: new Date().toISOString(),
  endpoints: ENDPOINTS,
  parity,
  direct_search: null,
  localized_search: null,
  recommendation: null,
  safety_stop: !parity.passed,
};

if (parity.passed) {
  artifact.direct_search = await runDirectSearch();
  artifact.localized_search = await runLocalized(searchIconsHostedMcp);
  artifact.recommendation = await runRecommendation([
    recommendIconsForTask,
    searchIconsHostedMcp,
    searchIconQueriesHostedMcp,
  ]);
}

const outputPath = resolve(output);
mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({
  status: artifact.safety_stop ? 'safety_stop' : 'ok',
  output: outputPath,
  parity_passed: parity.passed,
  direct_search: artifact.direct_search ? {
    control_p95_ms: artifact.direct_search.control.p95_ms,
    treatment_p95_ms: artifact.direct_search.treatment.p95_ms,
  } : null,
  localized_search: artifact.localized_search ? {
    control_p95_ms: artifact.localized_search.control.p95_ms,
    treatment_p95_ms: artifact.localized_search.treatment.p95_ms,
  } : null,
  recommendation: artifact.recommendation ? {
    public_result_parity: artifact.recommendation.public_result_parity,
    control_p95_ms: artifact.recommendation.control.p95_ms,
    treatment_p95_ms: artifact.recommendation.treatment.p95_ms,
  } : null,
}, null, 2));

if (artifact.safety_stop) process.exitCode = 1;
