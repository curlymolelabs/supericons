import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const CONTROL_REVISION = '02b2c22ea8a76decee92d83c853ca6cf33899e6c';
const TREATMENT_REVISION = '425d8c2873e244988ed93ade18396e0f5c688f5e';
const DEFAULT_SEARCH_ARTIFACT = 'tmp/material-baseline-search.json';
const DEFAULT_RECOMMENDATION_ARTIFACT = 'tmp/material-baseline-recommendation.json';

const SCENARIOS = [
  {
    id: 'packet3r-one-slot',
    task: 'Choose an icon for application settings.',
    slots: ['cog'],
  },
  {
    id: 'four-slot-navigation',
    task: 'Choose icons for a mobile application bottom navigation.',
    slots: ['Home tab', 'Search tab', 'Alerts tab', 'Profile tab'],
  },
  {
    id: 'twelve-slot-structural-sample',
    task: 'Choose clear icons for twelve named application navigation destinations.',
    slots: [
      'Home tab',
      'Search tab',
      'Create action',
      'Alerts tab',
      'Profile tab',
      'Settings',
      'Help',
      'Messages',
      'Calendar',
      'Files',
      'Analytics',
      'Logout',
    ],
  },
];

function readArg(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : null;
}

function materializeRevision(revision) {
  const directory = mkdtempSync(join(tmpdir(), `supericons-material-concurrency-${revision.slice(0, 9)}-`));
  const archive = execFileSync('git', ['archive', revision, 'mcp', 'lib', 'supabase/functions', 'package.json'], {
    maxBuffer: 256 * 1024 * 1024,
  });
  const extracted = spawnSync('tar', ['-xf', '-', '-C', directory], {
    input: archive,
    maxBuffer: 256 * 1024 * 1024,
  });
  assert.equal(extracted.status, 0, extracted.stderr?.toString() || 'Unable to extract revision archive.');
  return directory;
}

function parseIntegerConstant(source, name) {
  const match = source.match(new RegExp(`const\\s+${name}\\s*=\\s*(\\d+)`));
  assert.ok(match, `Missing ${name}.`);
  return Number(match[1]);
}

function calculatePeakCandidateStatements(calls) {
  const events = calls.flatMap((call) => [
    { time: call.started_at_ms, kind: 'start', call },
    { time: call.ended_at_ms, kind: 'end', call },
  ]).sort((left, right) => (
    left.time - right.time
    || (left.kind === 'end' ? -1 : 1)
  ));
  const active = new Map();
  let activeStatements = 0;
  let peakStatements = 0;
  let peakQueries = [];
  for (const event of events) {
    if (event.kind === 'end') {
      const removed = active.get(event.call.call_id);
      if (removed) {
        activeStatements -= removed.candidate_variant_count;
        active.delete(event.call.call_id);
      }
      continue;
    }
    active.set(event.call.call_id, event.call);
    activeStatements += event.call.candidate_variant_count;
    if (activeStatements > peakStatements) {
      peakStatements = activeStatements;
      peakQueries = [...active.values()].map((call) => ({
        query: call.query,
        candidate_variant_count: call.candidate_variant_count,
      }));
    }
  }
  return {
    candidate_statements: peakStatements,
    queries: peakQueries,
  };
}

async function analyzeRevision({ revision, variant }) {
  const directory = materializeRevision(revision);
  try {
    const recommendSource = readFileSync(join(directory, 'mcp/recommend-icons.js'), 'utf8');
    const remoteSource = readFileSync(join(directory, 'mcp/remote-server.js'), 'utf8');
    const stableIndexSource = readFileSync(join(directory, 'supabase/functions/mcp-search/index.ts'), 'utf8');
    const handlerSource = readFileSync(
      join(directory, 'supabase/functions/_shared/search-engine/handle-search-request.ts'),
      'utf8',
    );
    const candidateRetrievalPath = join(
      directory,
      'supabase/functions/_shared/search-engine/candidate-retrieval.ts',
    );
    const candidateRetrievalSource = variant === 'treatment'
      ? readFileSync(candidateRetrievalPath, 'utf8')
      : '';

    const [{ recommendIconsForTask }, intentModule, rankingModule] = await Promise.all([
      import(pathToFileURL(join(directory, 'mcp/recommend-icons.js')).href),
      import(pathToFileURL(join(directory, 'lib/search-intent-core.js')).href),
      variant === 'treatment'
        ? import(pathToFileURL(join(directory, 'lib/search-ranking-policy.js')).href)
        : Promise.resolve(null),
    ]);

    const slotConcurrency = parseIntegerConstant(recommendSource, 'SLOT_SEARCH_CONCURRENCY');
    const queryConcurrency = parseIntegerConstant(recommendSource, 'SLOT_QUERY_CONCURRENCY');
    const stableAcceptsGroupedEnvelope = /handleGroupedSearchRequest|body\.queries/.test(stableIndexSource);
    const hostedRecommendationUsesGroupedClient = /searchIconsForQueries\s*:/.test(remoteSource);
    const candidateCallsAreParallel = variant === 'control'
      ? /Promise\.all\(\s*queryVariants\.map/.test(handlerSource)
      : /Promise\.all\(\s*queryVariants\.map/.test(candidateRetrievalSource);

    const candidateVariantsFor = (query) => {
      const base = intentModule.buildIntentQueryVariants(query, { maxVariants: 10 });
      return variant === 'control'
        ? base
        : rankingModule.buildSearchRankingQueryVariants(query, base, { maxVariants: 14 });
    };

    const scenarios = [];
    for (const scenario of SCENARIOS) {
      let activeSearchRequests = 0;
      let maximumConcurrentSearchRequests = 0;
      const calls = [];

      await recommendIconsForTask({
        task: scenario.task,
        slots: scenario.slots,
        limitPerSlot: 3,
        responseMode: 'plan',
        locale: 'en',
        semanticMap: new Map(),
        searchIconsForQuery: async ({ query }) => {
          const startedAt = performance.now();
          activeSearchRequests += 1;
          maximumConcurrentSearchRequests = Math.max(maximumConcurrentSearchRequests, activeSearchRequests);
          const candidateVariants = candidateVariantsFor(query);
          const call = {
            call_id: calls.length,
            query,
            candidate_variant_count: candidateVariants.length,
            started_at_ms: startedAt,
            ended_at_ms: null,
          };
          calls.push(call);
          await new Promise((resolvePromise) => setTimeout(resolvePromise, 5));
          call.ended_at_ms = performance.now();
          activeSearchRequests -= 1;
          return [];
        },
        buildIconResult: async (icon) => icon,
      });

      const peak = calculatePeakCandidateStatements(calls);
      scenarios.push({
        id: scenario.id,
        slots: scenario.slots.length,
        search_requests: calls.length,
        maximum_concurrent_search_requests: maximumConcurrentSearchRequests,
        total_candidate_statements: calls.reduce(
          (total, entry) => total + entry.candidate_variant_count,
          0,
        ),
        maximum_concurrent_candidate_statements: peak.candidate_statements,
        queries_at_candidate_statement_peak: peak.queries,
        maximum_candidate_variants_per_search: calls.reduce(
          (maximum, entry) => Math.max(maximum, entry.candidate_variant_count),
          0,
        ),
      });
    }

    return {
      revision,
      variant,
      stable_http_contract: stableAcceptsGroupedEnvelope ? 'grouped' : 'single_search_per_post',
      hosted_recommendation_transport: hostedRecommendationUsesGroupedClient ? 'grouped' : 'separate_per_query',
      slot_search_concurrency: slotConcurrency,
      slot_query_concurrency: queryConcurrency,
      candidate_calls_parallel_within_search: candidateCallsAreParallel,
      structural_candidate_statement_ceiling: slotConcurrency * (variant === 'control' ? 10 : 14),
      scenarios,
    };
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

function analyzeSearchBaseline(path, artifactLabel) {
  const artifact = JSON.parse(readFileSync(path, 'utf8'));
  const samples = [artifact.first_request, ...(artifact.warm_samples || [])];
  const definitions = {
    'settings-all': {
      intended_outcome: 'nonzero_with_svg',
      encoded_in_original_runner: false,
    },
    'hello-all': {
      intended_outcome: 'known_pre_material_ranked_without_svg',
      encoded_in_original_runner: false,
    },
    'cog-bootstrap-strict': {
      intended_outcome: 'zero_for_strict_library_inventory',
      encoded_in_original_runner: false,
    },
    'combobox-bootstrap-prefer': {
      intended_outcome: 'unasserted_zero',
      encoded_in_original_runner: false,
    },
    'settings-zh-hans-expanded': {
      intended_outcome: 'nonzero_with_svg',
      encoded_in_original_runner: false,
    },
  };

  const cases = Object.entries(definitions).map(([caseId, definition]) => {
    const caseSamples = samples.filter((sample) => sample?.case_id === caseId);
    return {
      case_id: caseId,
      ...definition,
      samples: caseSamples.length,
      distinct_response_hashes: [...new Set(caseSamples.map((sample) => sample.response_sha256))].length,
      result_counts: [...new Set(caseSamples.map((sample) => sample.result_count))],
      svg_result_counts: [...new Set(caseSamples.map((sample) => sample.svg_result_count))],
      durations_ms: caseSamples.map((sample) => sample.duration_ms),
    };
  });

  return {
    path: artifactLabel,
    warm_p95_ms: artifact.warm_summary?.p95_ms ?? null,
    configured_absolute_gate_ms: 2000,
    warm_samples: artifact.warm_samples?.length || 0,
    zero_result_warm_samples: (artifact.warm_samples || []).filter((sample) => sample.result_count === 0).length,
    distinct_warm_response_hashes: new Set(
      (artifact.warm_samples || []).map((sample) => sample.response_sha256),
    ).size,
    cases,
    valid_for_original_packet3r_gates: true,
    valid_as_semantic_search_baseline: false,
    valid_for_2000ms_absolute_recovery_gate: false,
    reasons: [
      'The original runner asserted transport success but encoded no per-case semantic outcomes.',
      'One case measured the known pre-Material SVG capability defect.',
      'One prefer-mode zero result had no encoded expectation.',
      'The measured warm p95 already exceeded the proposed absolute recovery gate.',
    ],
  };
}

function analyzeRecommendationBaseline(path, artifactLabel) {
  const artifact = JSON.parse(readFileSync(path, 'utf8'));
  const samples = [artifact.first_request, ...(artifact.warm_samples || [])];
  return {
    path: artifactLabel,
    recommendation_path: artifact.recommendation_path,
    samples: samples.length,
    samples_marked_ok: samples.filter((sample) => sample.ok).length,
    samples_with_recommendations: samples.filter(
      (sample) => Array.isArray(sample.recommended_ids) && sample.recommended_ids.length > 0,
    ).length,
    samples_needing_clarification: samples.filter((sample) => sample.needs_clarification === true).length,
    distinct_response_hashes: new Set(samples.map((sample) => sample.response_sha256)).size,
    valid_for_latency_comparison: false,
    reason: 'Every sample was accepted without a recommendation or clarification after a grouped transport mismatch was swallowed.',
  };
}

const outputPath = resolve(
  readArg('output')
    || 'references/verification/material-incident-concurrency-analysis-2026-07-15.json',
);
const searchArtifactLabel = readArg('search-artifact') || DEFAULT_SEARCH_ARTIFACT;
const recommendationArtifactLabel = readArg('recommendation-artifact') || DEFAULT_RECOMMENDATION_ARTIFACT;
const searchArtifactPath = resolve(searchArtifactLabel);
const recommendationArtifactPath = resolve(recommendationArtifactLabel);

const [control, treatment] = await Promise.all([
  analyzeRevision({ revision: CONTROL_REVISION, variant: 'control' }),
  analyzeRevision({ revision: TREATMENT_REVISION, variant: 'treatment' }),
]);

const output = {
  schema_version: 1,
  analysis_date: '2026-07-15',
  control,
  treatment,
  conclusion: {
    grouped_v37_incident_theory_supported: false,
    reason: 'Both deployed hosted MCP revisions used separate per-query recommendation requests, and stable mcp-search accepted one search per POST.',
    outer_recommendation_concurrency_changed: false,
    observed_sample_peak_changed: false,
    theoretical_candidate_statement_ceiling_changed: true,
    treatment_generated_fewer_search_requests_in_all_scenarios: treatment.scenarios.every((scenario, index) => (
      scenario.search_requests < control.scenarios[index].search_requests
    )),
    remaining_risk: 'Each individual search fans candidate variants concurrently, while up to two recommendation searches can overlap. The treatment theoretical inner ceiling is higher even though these recommendation samples did not reach it.',
  },
  retained_baselines: {
    recommendation: analyzeRecommendationBaseline(recommendationArtifactPath, recommendationArtifactLabel),
    search: analyzeSearchBaseline(searchArtifactPath, searchArtifactLabel),
  },
  required_rebaseline_contract: {
    recommendation_transport: 'separate_per_query',
    recommendation_sample_valid_when: 'recommended_ids_nonempty_or_needs_clarification_true',
    grouped_transport_requires_responses_envelope: true,
    all_samples_identical_response_hash_fails_run: true,
    search_zero_results_require_explicit_fixture_expectation: true,
    absolute_latency_gate_requires_new_evidence: true,
  },
};

writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({
  status: 'ok',
  output: outputPath,
  control_peak: Math.max(...control.scenarios.map((scenario) => scenario.maximum_concurrent_candidate_statements)),
  treatment_peak: Math.max(...treatment.scenarios.map((scenario) => scenario.maximum_concurrent_candidate_statements)),
  recommendation_baseline_valid: output.retained_baselines.recommendation.valid_for_latency_comparison,
  search_baseline_semantically_valid: output.retained_baselines.search.valid_as_semantic_search_baseline,
}, null, 2));
