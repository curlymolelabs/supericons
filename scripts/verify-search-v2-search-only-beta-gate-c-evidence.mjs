import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { evaluateGateC } from './search-v2-gate-c-evidence.mjs';
import { SEARCH_CASES, SEARCH_WARM_REPETITIONS } from './search-v2-gate-c-workload.mjs';

const manifest = {
  implementation: {
    endpoint: 'mcp-search-v2-beta',
    beta_cohort: 'deterministic-v2-beta',
  },
  package: { latest_tag_must_remain: '0.4.17' },
  release_gates: {
    search_warm_p95_ms_max: 2000,
    error_rate_percent_max: 1,
    eligible_request_audit_capture_percent_min: 95,
  },
};
const manifestText = `${JSON.stringify(manifest, null, 2)}\n`;
const manifestHash = createHash('sha256').update(manifestText).digest('hex');

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

function timing(workerState, totalMs = 10) {
  return {
    event: 'search_stage_timing',
    worker_state: workerState,
    total_ms: totalMs,
  };
}

function directSample({
  caseId = null,
  workerState = 'reused_worker',
  ok = true,
  status = 200,
  durationMs = 12,
  style = 'outline',
} = {}) {
  return {
    ...(caseId ? { case_id: caseId } : {}),
    ok,
    status,
    duration_ms: durationMs,
    measurement_timing: timing(workerState, durationMs - 1),
    result_count: ok ? 2 : 0,
    svg_result_count: ok ? 2 : 0,
    result_libraries: ok ? ['material', 'material'] : [],
    result_styles: ok ? [style, style] : [],
    response_error_code: ok ? null : 'invalid_library_mode',
  };
}

function localizedSample({ workerState = 'reused_worker', durationMs = 25 } = {}) {
  const hostedAttempts = [
    {
      status: 200,
      duration_ms: 10,
      measurement_timing: timing(workerState, 9),
    },
    {
      status: 200,
      duration_ms: 11,
      measurement_timing: timing('reused_worker', 10),
    },
  ];
  return {
    ok: true,
    duration_ms: durationMs,
    hosted_requests: hostedAttempts.length,
    hosted_attempts: hostedAttempts,
  };
}

function workerSummaryFor(attempts) {
  const groups = {
    first_request: [],
    reused_worker: [],
    unknown: [],
  };
  for (const attempt of attempts) {
    groups[attempt.measurement_timing.worker_state].push({
      ok: attempt.ok,
      duration_ms: attempt.measurement_timing.total_ms,
    });
  }
  return Object.fromEntries(
    Object.entries(groups).map(([state, samples]) => [state, summaryFor(samples)]),
  );
}

function buildArtifacts(hash, endpoint) {
  const searchFirst = directSample({
    caseId: SEARCH_CASES[0].id,
    workerState: 'first_request',
  });
  const searchWarm = Array.from(
    { length: SEARCH_WARM_REPETITIONS },
    () => SEARCH_CASES.map((entry) => directSample({ caseId: entry.id })),
  ).flat();
  const searchAttempts = [searchFirst, ...searchWarm];

  const localizedFirst = localizedSample({ workerState: 'first_request' });
  const localizedWarm = Array.from({ length: 5 }, () => localizedSample());
  const localizedAttempts = [localizedFirst, ...localizedWarm].flatMap((sample) => (
    sample.hosted_attempts.map((attempt) => ({
      ok: attempt.status >= 200 && attempt.status < 400,
      measurement_timing: attempt.measurement_timing,
    }))
  ));

  const outline = directSample({ style: 'outline' });
  const solid = directSample({ style: 'solid' });
  const invalid = directSample({ ok: false, status: 400 });
  const smokeAttempts = [outline, solid, invalid];

  return {
    search: {
      manifest_sha256: hash,
      measured_at: '2026-07-16T00:01:00Z',
      mode: 'search',
      endpoint,
      variant: 'treatment',
      first_request: searchFirst,
      warm_samples: searchWarm,
      warm_summary: summaryFor(searchWarm),
      worker_summary: workerSummaryFor(searchAttempts),
    },
    localized: {
      manifest_sha256: hash,
      measured_at: '2026-07-16T00:02:00Z',
      mode: 'localized',
      endpoint,
      variant: 'treatment',
      first_request: localizedFirst,
      warm_samples: localizedWarm,
      warm_summary: {
        ...summaryFor(localizedWarm),
        hosted_requests: 10,
        hosted_requests_per_search: [2, 2, 2, 2, 2],
      },
      worker_summary: workerSummaryFor(localizedAttempts),
    },
    smoke: {
      manifest_sha256: hash,
      measured_at: '2026-07-16T00:03:00Z',
      mode: 'smoke',
      endpoint,
      variant: 'treatment',
      first_request: outline,
      material_outline: outline,
      material_solid: solid,
      invalid_request: invalid,
      smoke_summary: {
        material_passed: true,
        style_passed: true,
        invalid_request_passed: true,
        all_passed: true,
      },
      worker_summary: workerSummaryFor(smokeAttempts),
    },
  };
}

function buildLiveEvidence({ hash, endpoint, betaCohort, latest }) {
  return {
    manifest_sha256: hash,
    endpoint,
    workload: {
      endpoint,
      beta_cohort: betaCohort,
      client_family: 'latency_gate_a',
      measurement_variant: 'treatment',
      expected_eligible_requests: 41,
    },
    window: {
      started_at: '2026-07-16T00:00:00Z',
      ended_at: '2026-07-16T00:05:00Z',
    },
    platform_error_evidence: {
      readable: true,
      eligible_requests: 41,
      error_count: 0,
      source_sha256: 'a'.repeat(64),
    },
    search_audit_evidence: {
      readable: true,
      expected_eligible_requests: 41,
      captured_rows: 41,
      error_rows: 0,
      source_sha256: 'b'.repeat(64),
    },
    production_functions: {
      readable: true,
      search_icons: { before_version: 35, after_version: 35 },
      mcp_search: { before_version: 38, after_version: 38 },
    },
    npm_registry: {
      readable: true,
      latest_before: latest,
      latest_after: latest,
    },
  };
}

const artifacts = buildArtifacts(manifestHash, manifest.implementation.endpoint);
const liveEvidence = buildLiveEvidence({
  hash: manifestHash,
  endpoint: manifest.implementation.endpoint,
  betaCohort: manifest.implementation.beta_cohort,
  latest: manifest.package.latest_tag_must_remain,
});
const localGates = {
  recommendation_response_byte_parity: true,
  usage_dedupe: true,
};

function evaluate(overrides = {}) {
  return evaluateGateC({
    manifest,
    manifestText,
    manifestHash,
    search: structuredClone(artifacts.search),
    localized: structuredClone(artifacts.localized),
    smoke: structuredClone(artifacts.smoke),
    liveEvidence: structuredClone(liveEvidence),
    localGates: structuredClone(localGates),
    ...overrides,
  });
}

assert.equal(evaluate().status, 'ok');

const failureCases = [
  ['platform evidence required', () => {
    const value = structuredClone(liveEvidence);
    value.platform_error_evidence.readable = false;
    evaluate({ liveEvidence: value });
  }],
  ['platform errors enforced', () => {
    const value = structuredClone(liveEvidence);
    value.platform_error_evidence.error_count = 1;
    evaluate({ liveEvidence: value });
  }],
  ['null platform errors rejected', () => {
    const value = structuredClone(liveEvidence);
    value.platform_error_evidence.error_count = null;
    evaluate({ liveEvidence: value });
  }],
  ['negative platform errors rejected', () => {
    const value = structuredClone(liveEvidence);
    value.platform_error_evidence.error_count = -1;
    evaluate({ liveEvidence: value });
  }],
  ['impossible platform errors rejected', () => {
    const value = structuredClone(liveEvidence);
    value.platform_error_evidence.error_count = 42;
    evaluate({ liveEvidence: value });
  }],
  ['platform request count enforced', () => {
    const value = structuredClone(liveEvidence);
    value.platform_error_evidence.eligible_requests = 40;
    evaluate({ liveEvidence: value });
  }],
  ['audit evidence required', () => {
    const value = structuredClone(liveEvidence);
    value.search_audit_evidence.readable = false;
    evaluate({ liveEvidence: value });
  }],
  ['audit capture enforced', () => {
    const value = structuredClone(liveEvidence);
    value.search_audit_evidence.captured_rows = 38;
    evaluate({ liveEvidence: value });
  }],
  ['audit workload count enforced', () => {
    const value = structuredClone(liveEvidence);
    value.search_audit_evidence.expected_eligible_requests = 40;
    evaluate({ liveEvidence: value });
  }],
  ['audit errors enforced', () => {
    const value = structuredClone(liveEvidence);
    value.search_audit_evidence.error_rows = 1;
    evaluate({ liveEvidence: value });
  }],
  ['null audit errors rejected', () => {
    const value = structuredClone(liveEvidence);
    value.search_audit_evidence.error_rows = null;
    evaluate({ liveEvidence: value });
  }],
  ['impossible audit errors rejected', () => {
    const value = structuredClone(liveEvidence);
    value.search_audit_evidence.error_rows = 42;
    evaluate({ liveEvidence: value });
  }],
  ['null performance rejected', () => {
    const value = structuredClone(artifacts.search);
    value.warm_summary.p95_ms = null;
    evaluate({ search: value });
  }],
  ['empty performance rejected', () => {
    const value = structuredClone(artifacts.search);
    value.warm_summary.error_rate_percent = '';
    evaluate({ search: value });
  }],
  ['invalid live timestamp rejected', () => {
    const value = structuredClone(liveEvidence);
    value.window.started_at = 'not-a-time';
    evaluate({ liveEvidence: value });
  }],
  ['reversed live window rejected', () => {
    const value = structuredClone(liveEvidence);
    value.window.started_at = '2026-07-16T00:04:00Z';
    value.window.ended_at = '2026-07-16T00:00:00Z';
    evaluate({ liveEvidence: value });
  }],
  ['out-of-window artifact rejected', () => {
    const value = structuredClone(artifacts.search);
    value.measured_at = '2030-01-01T00:00:00Z';
    evaluate({ search: value });
  }],
  ['live manifest binding enforced', () => {
    const value = structuredClone(liveEvidence);
    value.manifest_sha256 = 'f'.repeat(64);
    evaluate({ liveEvidence: value });
  }],
  ['live workload binding enforced', () => {
    const value = structuredClone(liveEvidence);
    value.workload.beta_cohort = 'other-cohort';
    evaluate({ liveEvidence: value });
  }],
  ['recommendation parity enforced', () => {
    evaluate({ localGates: { ...localGates, recommendation_response_byte_parity: false } });
  }],
  ['production function state enforced', () => {
    const value = structuredClone(liveEvidence);
    value.production_functions.mcp_search.after_version = 39;
    evaluate({ liveEvidence: value });
  }],
  ['null production version rejected', () => {
    const value = structuredClone(liveEvidence);
    value.production_functions.mcp_search.before_version = null;
    value.production_functions.mcp_search.after_version = null;
    evaluate({ liveEvidence: value });
  }],
  ['npm latest enforced', () => {
    const value = structuredClone(liveEvidence);
    value.npm_registry.latest_after = '0.4.18';
    evaluate({ liveEvidence: value });
  }],
  ['null worker summary rejected', () => {
    const value = structuredClone(artifacts.search);
    value.worker_summary.first_request = null;
    evaluate({ search: value });
  }],
  ['missing search first request rejected', () => {
    const value = structuredClone(artifacts.search);
    delete value.first_request;
    evaluate({ search: value });
  }],
  ['missing search warm samples rejected', () => {
    const value = structuredClone(artifacts.search);
    value.warm_samples = [];
    evaluate({ search: value });
  }],
  ['missing localized first request rejected', () => {
    const value = structuredClone(artifacts.localized);
    delete value.first_request;
    evaluate({ localized: value });
  }],
  ['missing localized warm samples rejected', () => {
    const value = structuredClone(artifacts.localized);
    value.warm_samples = [];
    evaluate({ localized: value });
  }],
  ['missing smoke sample rejected', () => {
    const value = structuredClone(artifacts.smoke);
    delete value.material_solid;
    evaluate({ smoke: value });
  }],
  ['inconsistent summary count rejected', () => {
    const value = structuredClone(artifacts.search);
    value.warm_summary.samples = 24;
    evaluate({ search: value });
  }],
  ['inconsistent latency summary rejected', () => {
    const value = structuredClone(artifacts.search);
    value.warm_summary.p95_ms = 1;
    evaluate({ search: value });
  }],
  ['inconsistent hosted request count rejected', () => {
    const value = structuredClone(artifacts.localized);
    value.warm_summary.hosted_requests = 9;
    evaluate({ localized: value });
  }],
  ['missing search case identity rejected', () => {
    const value = structuredClone(artifacts.search);
    delete value.first_request.case_id;
    for (const sample of value.warm_samples) delete sample.case_id;
    evaluate({ search: value });
  }],
  ['duplicate-only search case distribution rejected', () => {
    const value = structuredClone(artifacts.search);
    for (const sample of value.warm_samples) sample.case_id = SEARCH_CASES[0].id;
    evaluate({ search: value });
  }],
  ['unexpected search case identity rejected', () => {
    const value = structuredClone(artifacts.search);
    value.warm_samples[0].case_id = 'unapproved-case';
    evaluate({ search: value });
  }],
  ['wrong first search case rejected', () => {
    const value = structuredClone(artifacts.search);
    value.first_request.case_id = SEARCH_CASES[1].id;
    evaluate({ search: value });
  }],
];

for (const [name, operation] of failureCases) {
  assert.throws(operation, undefined, name);
}

const integrationRoot = mkdtempSync(join(tmpdir(), 'search-v2-gate-c-evidence-'));
try {
  const actualManifestPath = resolve(
    'docs/si-v2/search/reviews/search-v2-search-only-beta-authorization-manifest-2026-07-16.json',
  );
  const actualManifestText = readFileSync(actualManifestPath, 'utf8');
  const actualManifest = JSON.parse(actualManifestText);
  const actualManifestHash = createHash('sha256')
    .update(actualManifestText.replace(/\r\n?/g, '\n'))
    .digest('hex');
  const integrationArtifacts = buildArtifacts(
    actualManifestHash,
    actualManifest.implementation.endpoint,
  );
  const integrationLiveEvidence = buildLiveEvidence({
    hash: actualManifestHash,
    endpoint: actualManifest.implementation.endpoint,
    betaCohort: actualManifest.implementation.beta_cohort,
    latest: actualManifest.package.latest_tag_must_remain,
  });

  for (const [name, value] of Object.entries({
    'search.json': integrationArtifacts.search,
    'localized.json': integrationArtifacts.localized,
    'smoke.json': integrationArtifacts.smoke,
    'live-evidence.json': integrationLiveEvidence,
  })) {
    writeFileSync(join(integrationRoot, name), `${JSON.stringify(value, null, 2)}\n`);
  }

  const powershell = process.platform === 'win32' ? 'powershell.exe' : 'pwsh';
  const integration = spawnSync(powershell, [
    '-NoProfile',
    '-ExecutionPolicy',
    'Bypass',
    '-File',
    resolve('scripts/run-search-v2-search-only-beta-gate-c.ps1'),
    '-ManifestHash',
    actualManifestHash,
    '-OutputDirectory',
    integrationRoot,
    '-Phase',
    'finalize',
    '-LiveEvidencePath',
    join(integrationRoot, 'live-evidence.json'),
    '-ExecuteApprovedGateC',
  ], {
    cwd: process.cwd(),
    encoding: 'utf8',
    timeout: 120000,
  });
  assert.equal(
    integration.status,
    0,
    `PowerShell finalize integration failed:\n${integration.stdout}\n${integration.stderr}`,
  );
  assert.match(integration.stdout, /"status":\s*"ok"/);
} finally {
  rmSync(integrationRoot, { recursive: true, force: true });
}

console.log(JSON.stringify({
  status: 'ok',
  passing_contract: true,
  fixed_workload_requests: 41,
  powershell_finalize_integration: true,
  fail_closed_cases: failureCases.map(([name]) => name),
}, null, 2));
