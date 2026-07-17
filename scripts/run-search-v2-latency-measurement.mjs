import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';

import { SEARCH_CASES, SEARCH_WARM_REPETITIONS } from './search-v2-gate-c-workload.mjs';

const PROJECT_REF = 'kcjmkakdhsqplvasgkjv';
const ENDPOINT_NAME = process.env.SUPERICONS_SEARCH_V2_MEASUREMENT_ENDPOINT || 'mcp-search-v2-beta';
const ENDPOINT = `https://${PROJECT_REF}.supabase.co/functions/v1/${ENDPOINT_NAME}`;

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

function publicMeasurementTiming(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const allowedStages = [
    'request_parse',
    'rate_limit',
    'account_resolution',
    'candidate_search',
    'material_eligibility',
    'private_metadata',
    'reranking',
    'public_semantic',
    'final_svg',
    'material_svg',
    'audit_write',
  ];
  const stages = {};
  for (const stage of allowedStages) {
    const duration = Number(value?.stages_ms?.[stage]);
    if (Number.isFinite(duration) && duration >= 0) stages[stage] = duration;
  }
  return {
    schema_version: Number(value.schema_version) || null,
    event: value.event === 'search_stage_timing' ? value.event : null,
    measurement_variant: typeof value.measurement_variant === 'string'
      ? value.measurement_variant
      : null,
    worker_state: typeof value.worker_state === 'string' ? value.worker_state : null,
    worker_request_ordinal: Number(value.worker_request_ordinal) || null,
    module_age_ms_at_handler_entry: Number(value.module_age_ms_at_handler_entry) || 0,
    outcome: typeof value.outcome === 'string' ? value.outcome : null,
    total_ms: Number(value.total_ms) || 0,
    stages_ms: stages,
    counts: {
      query_variants: Number(value?.counts?.query_variants) || 0,
      candidate_rows: Number(value?.counts?.candidate_rows) || 0,
      unique_candidates: Number(value?.counts?.unique_candidates) || 0,
      final_results: Number(value?.counts?.final_results) || 0,
    },
    approximate_sizes: {
      candidate_svg_characters: Number(value?.approximate_sizes?.candidate_svg_characters) || 0,
      candidate_payload_characters: Number(value?.approximate_sizes?.candidate_payload_characters) || 0,
      response_json_characters: Number(value?.approximate_sizes?.response_json_characters) || 0,
    },
  };
}

function publicResponseEvidence(response, payload, durationMs) {
  return {
    status: response?.status || 0,
    duration_ms: Number(durationMs.toFixed(3)),
    error_code: typeof payload?.error === 'string' ? payload.error : null,
    retryable: payload?.retryable === true,
    measurement_timing: publicMeasurementTiming(payload?.measurement_timing),
  };
}

function workerStateSummaryFor(samples) {
  const groups = {
    first_request: [],
    reused_worker: [],
    unknown: [],
  };

  for (const sample of samples) {
    const attempts = Array.isArray(sample?.hosted_attempts) ? sample.hosted_attempts : [sample];
    for (const attempt of attempts) {
      const timing = attempt?.measurement_timing;
      const state = timing?.worker_state === 'first_request'
        ? 'first_request'
        : timing?.worker_state === 'reused_worker'
          ? 'reused_worker'
          : 'unknown';
      const handlerDuration = Number(timing?.total_ms);
      const observedDuration = Number(attempt?.duration_ms);
      groups[state].push({
        duration_ms: Number.isFinite(handlerDuration) && handlerDuration >= 0
          ? handlerDuration
          : Number.isFinite(observedDuration) && observedDuration >= 0
            ? observedDuration
            : 0,
        ok: typeof attempt?.ok === 'boolean'
          ? attempt.ok
          : Number(attempt?.status) >= 200 && Number(attempt?.status) < 400,
      });
    }
  }

  return Object.fromEntries(
    Object.entries(groups).map(([state, entries]) => [state, summaryFor(entries)]),
  );
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
        style: searchCase.style || 'any',
        limit: searchCase.limit,
        locale: searchCase.locale,
        localized_query: searchCase.localized_query || null,
        localized_locale: searchCase.localized_locale || null,
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
    result_libraries: Array.isArray(parsed?.results)
      ? parsed.results.map((row) => String(row?.source_library || row?.library || '')).filter(Boolean)
      : [],
    result_styles: Array.isArray(parsed?.results)
      ? parsed.results.map((row) => String(row?.style || '')).filter(Boolean)
      : [],
    response_error_code: typeof parsed?.error === 'string' ? parsed.error : null,
    response_retryable: parsed?.retryable === true,
    measurement_timing: publicMeasurementTiming(parsed?.measurement_timing),
    error,
  };
}

async function runSearch(variant) {
  const firstRequest = await postSearch(SEARCH_CASES[0]);
  const warmSamples = [];
  for (let repetition = 0; repetition < SEARCH_WARM_REPETITIONS; repetition += 1) {
    for (const searchCase of SEARCH_CASES) {
      warmSamples.push(await postSearch(searchCase));
    }
  }

  return {
    mode: 'search',
    variant,
    endpoint: ENDPOINT_NAME,
    first_request: firstRequest,
    warm_summary: summaryFor(warmSamples),
    worker_summary: workerStateSummaryFor([firstRequest, ...warmSamples]),
    warm_samples: warmSamples,
  };
}

async function runParity(variant) {
  const samples = [];
  for (let repetition = 0; repetition < 3; repetition += 1) {
    for (const searchCase of SEARCH_CASES) {
      samples.push(await postSearch(searchCase));
    }
  }

  const cases = SEARCH_CASES.map((searchCase) => {
    const caseSamples = samples.filter((sample) => sample.case_id === searchCase.id);
    const first = caseSamples[0];
    const responseHashes = [...new Set(caseSamples.map((sample) => sample.response_sha256))];
    return {
      case_id: searchCase.id,
      samples: caseSamples.length,
      successful: caseSamples.filter((sample) => sample.ok).length,
      stable_within_variant: responseHashes.length === 1,
      response_sha256: responseHashes.length === 1 ? responseHashes[0] : null,
      distinct_response_hashes: responseHashes,
      status: first?.status || 0,
      result_count: first?.result_count || 0,
      result_icon_ids: first?.result_icon_ids || [],
      svg_result_count: first?.svg_result_count || 0,
      response_characters: first?.response_characters || 0,
    };
  });

  return {
    mode: 'parity',
    variant,
    endpoint: ENDPOINT_NAME,
    first_request: samples[0],
    parity_summary: {
      cases: cases.length,
      requests: samples.length,
      all_requests_successful: samples.every((sample) => sample.ok),
      all_cases_stable_within_variant: cases.every((entry) => entry.stable_within_variant),
    },
    cases,
    samples,
  };
}

async function runLocalizedOnce(searchIconsHostedMcp) {
  const originalFetch = globalThis.fetch;
  const hostedAttempts = [];
  globalThis.fetch = async (...args) => {
    const attemptStartedAt = performance.now();
    try {
      const response = await originalFetch(...args);
      const payload = await response.clone().json().catch(() => null);
      hostedAttempts.push(publicResponseEvidence(
        response,
        payload,
        performance.now() - attemptStartedAt,
      ));
      return response;
    } catch (error) {
      hostedAttempts.push({
        status: 0,
        duration_ms: Number((performance.now() - attemptStartedAt).toFixed(3)),
        error_code: error instanceof Error ? error.name : 'request_failed',
        retryable: false,
        measurement_timing: null,
      });
      throw error;
    }
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
        client_family: 'latency_gate_a',
        tool_name: 'search_icons',
        beta_cohort: 'deterministic-v2-beta',
      },
    });
  } catch (caught) {
    error = caught instanceof Error ? caught.message : 'localized_search_failed';
  } finally {
    globalThis.fetch = originalFetch;
  }

  const publicSummary = payload
    ? {
        result_count: Array.isArray(payload.results) ? payload.results.length : 0,
        result_icon_ids: Array.isArray(payload.results)
          ? payload.results.map((row) => String(row?.icon_id || '')).filter(Boolean)
          : [],
      }
    : null;
  return {
    ok: Boolean(payload && !error),
    duration_ms: Number((performance.now() - startedAt).toFixed(3)),
    hosted_requests: hostedAttempts.length,
    hosted_attempts: hostedAttempts,
    response_sha256: publicSummary ? sha256(JSON.stringify(publicSummary)) : null,
    ...publicSummary,
    error,
  };
}

async function runSmoke(variant) {
  const outline = await postSearch({
    id: 'material-settings-outline',
    query: 'settings',
    library: 'material',
    library_mode: 'strict',
    limit: 3,
    locale: 'en',
    style: 'outline',
  });
  const solid = await postSearch({
    id: 'material-settings-solid',
    query: 'settings',
    library: 'material',
    library_mode: 'strict',
    limit: 3,
    locale: 'en',
    style: 'solid',
  });
  const invalid = await postSearch({
    id: 'invalid-library-mode',
    query: 'settings',
    library_mode: 'unsupported',
    limit: 3,
    locale: 'en',
  });
  const materialPassed = [outline, solid].every((sample) => (
    sample.ok
    && sample.result_count > 0
    && sample.svg_result_count === sample.result_count
    && sample.result_libraries.every((library) => library === 'material')
  ));
  const stylePassed = outline.result_styles.every((style) => style === 'outline')
    && solid.result_styles.every((style) => style === 'solid');
  const invalidPassed = invalid.status === 400
    && invalid.response_error_code === 'invalid_library_mode';

  return {
    mode: 'smoke',
    variant,
    endpoint: ENDPOINT_NAME,
    first_request: outline,
    material_outline: outline,
    material_solid: solid,
    invalid_request: invalid,
    smoke_summary: {
      material_passed: materialPassed,
      style_passed: stylePassed,
      invalid_request_passed: invalidPassed,
      all_passed: materialPassed && stylePassed && invalidPassed,
    },
    worker_summary: workerStateSummaryFor([outline, solid, invalid]),
  };
}

async function runLocalized(variant) {
  process.env.SUPERICONS_MCP_SEARCH_URL = ENDPOINT;
  process.env.SUPERICONS_MCP_SEARCH_ANON_KEY = '';
  process.env.SUPERICONS_API_KEY = '';
  const { searchIconsHostedMcp } = await import('../mcp/hosted-search-client.js');

  const firstRequest = await runLocalizedOnce(searchIconsHostedMcp);
  const warmSamples = [];
  for (let index = 0; index < 5; index += 1) {
    warmSamples.push(await runLocalizedOnce(searchIconsHostedMcp));
  }

  return {
    mode: 'localized',
    variant,
    endpoint: ENDPOINT_NAME,
    first_request: firstRequest,
    warm_summary: {
      ...summaryFor(warmSamples),
      hosted_requests: warmSamples.reduce((total, sample) => total + sample.hosted_requests, 0),
      hosted_requests_per_search: warmSamples.map((sample) => sample.hosted_requests),
    },
    worker_summary: workerStateSummaryFor([firstRequest, ...warmSamples]),
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

async function runRecommendationOnce(
  recommendIconsForTask,
  searchIconsHostedMcp,
  searchIconQueriesHostedMcp,
  recommendationPath,
) {
  let hostedSearchCalls = 0;
  const startedAt = performance.now();
  let payload = null;
  let error = null;

  try {
    const commonUsageContext = {
      source: 'mcp_beta',
      channel: 'hosted_mcp',
      environment: 'preview',
      client_family: 'latency_gate_a',
      tool_name: 'recommend_icons',
      beta_cohort: 'deterministic-v2-roundtrip-measurement',
    };
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
          usageContext: commonUsageContext,
        });
        return (result.results || []).map(normalizeHostedIcon).filter(Boolean);
      },
      ...(recommendationPath === 'grouped' ? {
        searchIconsForQueries: async (queries) => {
          hostedSearchCalls += 1;
          const results = await searchIconQueriesHostedMcp({
            queries: queries.map((query) => ({ ...query, libraryMode: 'all', usageContext: commonUsageContext })),
          });
          return results.map((result) => (
            (result.results || []).map(normalizeHostedIcon).filter(Boolean)
          ));
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
  const recommendationPath = readArg('recommendation-path') || 'separate';
  assert.ok(['separate', 'grouped'].includes(recommendationPath), 'Use separate or grouped recommendation path.');
  const [{ recommendIconsForTask }, { searchIconsHostedMcp, searchIconQueriesHostedMcp }] = await Promise.all([
    import('../mcp/recommend-icons.js'),
    import('../mcp/hosted-search-client.js'),
  ]);

  const firstRequest = await runRecommendationOnce(
    recommendIconsForTask,
    searchIconsHostedMcp,
    searchIconQueriesHostedMcp,
    recommendationPath,
  );
  const warmSamples = [];
  for (let index = 0; index < 20; index += 1) {
    warmSamples.push(await runRecommendationOnce(
      recommendIconsForTask,
      searchIconsHostedMcp,
      searchIconQueriesHostedMcp,
      recommendationPath,
    ));
  }

  return {
    mode: 'recommendation',
    variant,
    endpoint: ENDPOINT_NAME,
    recommendation_path: recommendationPath,
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
const manifestHash = readArg('manifest-hash');
assert.ok(
  ['parity', 'search', 'localized', 'recommendation', 'smoke'].includes(mode),
  'Use --mode parity, search, localized, recommendation, or smoke.',
);
assert.ok(['control', 'treatment'].includes(variant), 'Use --variant control or --variant treatment.');
assert.ok(output, 'Provide --output with a local JSON path.');
assert.match(manifestHash || '', /^[a-f0-9]{64}$/, 'Provide --manifest-hash with the approved fingerprint.');

const runners = {
  parity: runParity,
  search: runSearch,
  localized: runLocalized,
  recommendation: runRecommendation,
  smoke: runSmoke,
};
const result = await runners[mode](variant);
const artifact = {
  schema_version: 1,
  manifest_sha256: manifestHash,
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
  summary: artifact.warm_summary || artifact.parity_summary || artifact.smoke_summary,
}, null, 2));

if (
  !artifact.first_request.ok
  || (artifact.warm_summary && artifact.warm_summary.errors > 0)
  || (artifact.parity_summary && (
    !artifact.parity_summary.all_requests_successful
    || !artifact.parity_summary.all_cases_stable_within_variant
  ))
  || (artifact.smoke_summary && !artifact.smoke_summary.all_passed)
) {
  process.exitCode = 1;
}
