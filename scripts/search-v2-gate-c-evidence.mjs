import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

import { SEARCH_CASES, SEARCH_WARM_REPETITIONS } from './search-v2-gate-c-workload.mjs';

function readArg(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : null;
}

function normalizedTextSha256(text) {
  return createHash('sha256').update(text.replace(/\r\n?/g, '\n'), 'utf8').digest('hex');
}

function requiredFiniteNumber(value, label, { minimum = 0, maximum = Infinity } = {}) {
  assert.equal(typeof value, 'number', `${label} must be a number`);
  assert.equal(Number.isFinite(value), true, `${label} must be finite`);
  assert.equal(value >= minimum, true, `${label} is below the minimum`);
  assert.equal(value <= maximum, true, `${label} exceeds the maximum`);
  return value;
}

function requiredCount(value, label, { minimum = 0 } = {}) {
  requiredFiniteNumber(value, label, { minimum });
  assert.equal(Number.isInteger(value), true, `${label} must be an integer`);
  return value;
}

function requiredTimestamp(value, label) {
  assert.equal(typeof value, 'string', `${label} must be a string`);
  assert.equal(value.trim().length > 0, true, `${label} is missing`);
  const timestamp = Date.parse(value);
  assert.equal(Number.isFinite(timestamp), true, `${label} is invalid`);
  return timestamp;
}

function requiredObject(value, label) {
  assert.equal(
    Boolean(value) && typeof value === 'object' && !Array.isArray(value),
    true,
    `${label} must be an object`,
  );
  return value;
}

function requiredArray(value, label, expectedLength) {
  assert.equal(Array.isArray(value), true, `${label} must be an array`);
  assert.equal(value.length, expectedLength, `${label} count changed`);
  return value;
}

function requiredString(value, label) {
  assert.equal(typeof value, 'string', `${label} must be a string`);
  assert.equal(value.trim().length > 0, true, `${label} is missing`);
  return value;
}

function calculatedRate(count, total) {
  return Number(((count / Math.max(1, total)) * 100).toFixed(3));
}

function summaryCounts(samples) {
  const durations = samples.map((sample, index) => (
    requiredFiniteNumber(sample.duration_ms, `summary sample ${index + 1} duration`)
  ));
  const errors = samples.filter((sample) => !sample.ok).length;
  const sorted = [...durations].sort((left, right) => left - right);
  const percentile = (fraction) => {
    if (sorted.length === 0) return 0;
    const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1);
    return Number(sorted[index].toFixed(3));
  };
  return {
    samples: samples.length,
    successful: samples.length - errors,
    errors,
    error_rate_percent: calculatedRate(errors, samples.length),
    p50_ms: percentile(0.5),
    p95_ms: percentile(0.95),
    maximum_ms: durations.length ? Number(Math.max(...durations).toFixed(3)) : 0,
  };
}

function requireCountSummary(summary, label, expected) {
  requiredObject(summary, `${label} summary`);
  const samples = requiredCount(summary.samples, `${label} samples`);
  const successful = requiredCount(summary.successful, `${label} successful`);
  const errors = requiredCount(summary.errors, `${label} errors`);
  const errorRate = requiredFiniteNumber(
    summary.error_rate_percent,
    `${label} error rate`,
    { maximum: 100 },
  );
  const p50 = requiredFiniteNumber(summary.p50_ms, `${label} p50`);
  const p95 = requiredFiniteNumber(summary.p95_ms, `${label} p95`);
  const maximum = requiredFiniteNumber(summary.maximum_ms, `${label} maximum`);
  assert.equal(successful + errors, samples, `${label} success and error totals changed`);
  assert.equal(samples, expected.samples, `${label} sample total changed`);
  assert.equal(successful, expected.successful, `${label} success total changed`);
  assert.equal(errors, expected.errors, `${label} error total changed`);
  assert.equal(errorRate, expected.error_rate_percent, `${label} error rate changed`);
  assert.equal(p50, expected.p50_ms, `${label} p50 changed`);
  assert.equal(p95, expected.p95_ms, `${label} p95 changed`);
  assert.equal(maximum, expected.maximum_ms, `${label} maximum changed`);
}

function requireTiming(timing, label) {
  requiredObject(timing, `${label} measurement timing`);
  assert.equal(timing.event, 'search_stage_timing', `${label} timing event changed`);
  assert.equal(
    ['first_request', 'reused_worker', 'unknown'].includes(timing.worker_state),
    true,
    `${label} worker state changed`,
  );
  requiredFiniteNumber(timing.total_ms, `${label} timing total`);
  return timing;
}

function requireDirectSample(sample, label, { expectedOk = true, expectedStatus = 200 } = {}) {
  requiredObject(sample, label);
  assert.equal(typeof sample.ok, 'boolean', `${label} ok flag is missing`);
  assert.equal(sample.ok, expectedOk, `${label} outcome changed`);
  assert.equal(requiredCount(sample.status, `${label} status`, { minimum: 100 }), expectedStatus);
  requiredFiniteNumber(sample.duration_ms, `${label} duration`);
  requireTiming(sample.measurement_timing, label);
  return sample;
}

function workerAttempt(sample) {
  return {
    ok: sample.ok,
    duration_ms: sample.measurement_timing.total_ms,
    measurement_timing: sample.measurement_timing,
  };
}

function requireWorkerSummary(artifact, label, attempts) {
  const workerSummary = requiredObject(artifact?.worker_summary, `${label} worker summary`);
  const groups = {
    first_request: [],
    reused_worker: [],
    unknown: [],
  };
  for (const attempt of attempts) {
    const state = attempt.measurement_timing.worker_state;
    groups[state].push(attempt);
  }
  for (const state of ['first_request', 'reused_worker', 'unknown']) {
    requireCountSummary(
      workerSummary[state],
      `${label} ${state}`,
      summaryCounts(groups[state]),
    );
  }
}

function requirePerformance(artifact, label, limits) {
  const p95 = requiredFiniteNumber(artifact?.warm_summary?.p95_ms, `${label} p95`);
  const errorRate = requiredFiniteNumber(
    artifact?.warm_summary?.error_rate_percent,
    `${label} error rate`,
    { maximum: 100 },
  );
  assert.equal(p95 <= limits.p95, true, `${label} p95 exceeds the limit`);
  assert.equal(
    errorRate <= limits.errorRate,
    true,
    `${label} error rate exceeds the limit`,
  );
}

const fixedWorkload = Object.freeze({
  search_first_requests: 1,
  search_case_ids: Object.freeze(SEARCH_CASES.map((entry) => entry.id)),
  search_warm_repetitions: SEARCH_WARM_REPETITIONS,
  search_warm_samples: SEARCH_CASES.length * SEARCH_WARM_REPETITIONS,
  localized_first_samples: 1,
  localized_warm_samples: 5,
  localized_hosted_attempts_per_sample: 2,
  smoke_samples: 3,
  eligible_requests: 41,
});

function requireSearchWorkload(search) {
  const first = requireDirectSample(search?.first_request, 'search first request');
  assert.equal(
    requiredString(first.case_id, 'search first request case_id'),
    fixedWorkload.search_case_ids[0],
    'search first request case changed',
  );
  const warm = requiredArray(
    search?.warm_samples,
    'search warm samples',
    fixedWorkload.search_warm_samples,
  ).map((sample, index) => requireDirectSample(sample, `search warm sample ${index + 1}`));
  const caseCounts = new Map(fixedWorkload.search_case_ids.map((caseId) => [caseId, 0]));
  for (const [index, sample] of warm.entries()) {
    const caseId = requiredString(sample.case_id, `search warm sample ${index + 1} case_id`);
    assert.equal(caseCounts.has(caseId), true, `search warm sample ${index + 1} case changed`);
    caseCounts.set(caseId, caseCounts.get(caseId) + 1);
  }
  for (const caseId of fixedWorkload.search_case_ids) {
    assert.equal(
      caseCounts.get(caseId),
      fixedWorkload.search_warm_repetitions,
      `search warm distribution changed for ${caseId}`,
    );
  }
  requireCountSummary(search?.warm_summary, 'search warm', summaryCounts(warm));
  const attempts = [first, ...warm].map(workerAttempt);
  requireWorkerSummary(search, 'search', attempts);
  return attempts;
}

function requireLocalizedSample(sample, label) {
  requiredObject(sample, label);
  assert.equal(sample.ok, true, `${label} outcome changed`);
  requiredFiniteNumber(sample.duration_ms, `${label} duration`);
  const hostedAttempts = requiredArray(
    sample.hosted_attempts,
    `${label} hosted attempts`,
    fixedWorkload.localized_hosted_attempts_per_sample,
  ).map((attempt, index) => {
    requiredObject(attempt, `${label} hosted attempt ${index + 1}`);
    assert.equal(
      requiredCount(attempt.status, `${label} hosted status ${index + 1}`, { minimum: 100 }),
      200,
      `${label} hosted status changed`,
    );
    requiredFiniteNumber(attempt.duration_ms, `${label} hosted duration ${index + 1}`);
    requireTiming(attempt.measurement_timing, `${label} hosted attempt ${index + 1}`);
    return {
      ok: true,
      duration_ms: attempt.measurement_timing.total_ms,
      measurement_timing: attempt.measurement_timing,
    };
  });
  assert.equal(
    requiredCount(sample.hosted_requests, `${label} hosted request count`),
    hostedAttempts.length,
    `${label} hosted request count changed`,
  );
  return { sample, hostedAttempts };
}

function requireLocalizedWorkload(localized) {
  const first = requireLocalizedSample(localized?.first_request, 'localized first request');
  const warm = requiredArray(
    localized?.warm_samples,
    'localized warm samples',
    fixedWorkload.localized_warm_samples,
  ).map((sample, index) => requireLocalizedSample(sample, `localized warm sample ${index + 1}`));
  requireCountSummary(
    localized?.warm_summary,
    'localized warm',
    summaryCounts(warm.map((entry) => entry.sample)),
  );
  const warmHostedRequests = warm.reduce((total, entry) => total + entry.hostedAttempts.length, 0);
  assert.equal(
    requiredCount(localized?.warm_summary?.hosted_requests, 'localized warm hosted requests'),
    warmHostedRequests,
    'localized warm hosted request total changed',
  );
  assert.deepEqual(
    localized?.warm_summary?.hosted_requests_per_search,
    Array.from(
      { length: fixedWorkload.localized_warm_samples },
      () => fixedWorkload.localized_hosted_attempts_per_sample,
    ),
    'localized hosted requests per search changed',
  );
  const attempts = [first, ...warm].flatMap((entry) => entry.hostedAttempts);
  requireWorkerSummary(localized, 'localized', attempts);
  return attempts;
}

function requireSmokeWorkload(smoke) {
  const outline = requireDirectSample(smoke?.material_outline, 'Material outline smoke');
  const solid = requireDirectSample(smoke?.material_solid, 'Material solid smoke');
  const invalid = requireDirectSample(smoke?.invalid_request, 'invalid-request smoke', {
    expectedOk: false,
    expectedStatus: 400,
  });
  for (const [sample, style, label] of [
    [outline, 'outline', 'Material outline smoke'],
    [solid, 'solid', 'Material solid smoke'],
  ]) {
    const resultCount = requiredCount(sample.result_count, `${label} result count`, { minimum: 1 });
    assert.equal(
      requiredCount(sample.svg_result_count, `${label} SVG count`),
      resultCount,
      `${label} SVG availability changed`,
    );
    assert.equal(Array.isArray(sample.result_libraries), true, `${label} libraries are missing`);
    assert.equal(
      sample.result_libraries.length > 0
        && sample.result_libraries.every((library) => library === 'material'),
      true,
      `${label} library result changed`,
    );
    assert.equal(Array.isArray(sample.result_styles), true, `${label} styles are missing`);
    assert.equal(
      sample.result_styles.length > 0 && sample.result_styles.every((entry) => entry === style),
      true,
      `${label} style result changed`,
    );
  }
  assert.equal(invalid.response_error_code, 'invalid_library_mode', 'Invalid request error changed');
  assert.deepEqual(smoke?.smoke_summary, {
    material_passed: true,
    style_passed: true,
    invalid_request_passed: true,
    all_passed: true,
  }, 'Smoke summary changed');
  const attempts = [outline, solid, invalid].map(workerAttempt);
  requireWorkerSummary(smoke, 'smoke', attempts);
  return attempts;
}

function requireUnchangedFunction(functions, key) {
  const entry = functions?.[key];
  assert.equal(typeof entry, 'object', `${key} function evidence is missing`);
  const beforeVersion = requiredCount(entry?.before_version, `${key} before version`, { minimum: 1 });
  const afterVersion = requiredCount(entry?.after_version, `${key} after version`, { minimum: 1 });
  assert.equal(afterVersion, beforeVersion, `${key} version changed`);
}

function requireArtifactBinding({ artifact, label, manifestHash, manifest, workload, window }) {
  assert.equal(artifact?.manifest_sha256, manifestHash, `${label} manifest binding changed`);
  assert.equal(artifact?.mode, label, `${label} artifact mode changed`);
  assert.equal(artifact?.endpoint, manifest?.implementation?.endpoint, `${label} endpoint changed`);
  assert.equal(artifact?.variant, workload?.measurement_variant, `${label} variant changed`);
  const measuredAt = requiredTimestamp(artifact?.measured_at, `${label} measured_at`);
  assert.equal(measuredAt >= window.startedAt, true, `${label} predates the live evidence window`);
  assert.equal(measuredAt <= window.endedAt, true, `${label} exceeds the live evidence window`);
}

export function evaluateGateC({
  manifest,
  manifestText,
  manifestHash,
  search,
  localized,
  smoke,
  liveEvidence,
  localGates,
}) {
  assert.match(manifestHash || '', /^[a-f0-9]{64}$/, 'Manifest hash is missing or invalid');
  assert.equal(normalizedTextSha256(manifestText), manifestHash, 'Manifest hash does not match');

  const release = manifest?.release_gates || {};
  const p95Limit = requiredFiniteNumber(release.search_warm_p95_ms_max, 'Search p95 limit');
  const errorRateLimit = requiredFiniteNumber(
    release.error_rate_percent_max,
    'Error-rate limit',
    { maximum: 100 },
  );
  const captureLimit = requiredFiniteNumber(
    release.eligible_request_audit_capture_percent_min,
    'Audit-capture limit',
    { maximum: 100 },
  );

  assert.equal(liveEvidence?.manifest_sha256, manifestHash, 'Live evidence manifest binding changed');
  const workload = liveEvidence?.workload;
  assert.equal(typeof workload, 'object', 'Live workload identity is missing');
  assert.equal(workload?.endpoint, manifest?.implementation?.endpoint, 'Live workload endpoint changed');
  assert.equal(workload?.beta_cohort, manifest?.implementation?.beta_cohort, 'Live beta cohort changed');
  assert.equal(workload?.client_family, 'latency_gate_a', 'Live client family changed');
  assert.equal(workload?.measurement_variant, 'treatment', 'Live measurement variant changed');

  const startedAt = requiredTimestamp(liveEvidence?.window?.started_at, 'Live evidence start time');
  const endedAt = requiredTimestamp(liveEvidence?.window?.ended_at, 'Live evidence end time');
  assert.equal(startedAt <= endedAt, true, 'Live evidence window is reversed');
  const window = { startedAt, endedAt };

  for (const [label, artifact] of Object.entries({ search, localized, smoke })) {
    requireArtifactBinding({ artifact, label, manifestHash, manifest, workload, window });
  }
  const searchAttempts = requireSearchWorkload(search);
  const localizedAttempts = requireLocalizedWorkload(localized);
  const smokeAttempts = requireSmokeWorkload(smoke);
  requirePerformance(search, 'search', { p95: p95Limit, errorRate: errorRateLimit });
  requirePerformance(localized, 'localized', { p95: p95Limit, errorRate: errorRateLimit });
  const expectedEligibleRequests = searchAttempts.length
    + localizedAttempts.length
    + smokeAttempts.length;
  assert.equal(
    expectedEligibleRequests,
    fixedWorkload.eligible_requests,
    'Gate C workload size changed',
  );
  assert.equal(
    requiredCount(workload?.expected_eligible_requests, 'Live workload request count'),
    expectedEligibleRequests,
    'Live workload request count does not match the Gate C artifacts',
  );

  assert.equal(localGates?.recommendation_response_byte_parity, true, 'Recommendation byte parity failed');
  assert.equal(localGates?.usage_dedupe, true, 'Usage dedupe verification failed');

  assert.equal(liveEvidence?.endpoint, manifest?.implementation?.endpoint, 'Live endpoint evidence changed');

  const platform = liveEvidence?.platform_error_evidence;
  assert.equal(platform?.readable, true, 'Platform error evidence is unreadable');
  const platformRequests = requiredCount(platform?.eligible_requests, 'Platform request count', {
    minimum: 1,
  });
  const platformErrors = requiredCount(platform?.error_count, 'Platform error count');
  assert.equal(
    platformRequests,
    expectedEligibleRequests,
    'Platform request count does not match the Gate C workload',
  );
  assert.equal(platformErrors <= platformRequests, true, 'Platform errors exceed platform requests');
  const platformRate = calculatedRate(platformErrors, platformRequests);
  assert.equal(platformRate <= errorRateLimit, true, 'Platform error rate exceeds the limit');
  assert.match(platform?.source_sha256 || '', /^[a-f0-9]{64}$/, 'Platform source hash is missing');

  const audit = liveEvidence?.search_audit_evidence;
  assert.equal(audit?.readable, true, 'Search audit evidence is unreadable');
  const auditExpected = requiredCount(
    audit?.expected_eligible_requests,
    'Expected audit request count',
    { minimum: 1 },
  );
  const auditCaptured = requiredCount(audit?.captured_rows, 'Captured audit row count');
  const auditErrors = requiredCount(audit?.error_rows, 'Audit error row count');
  assert.equal(
    auditExpected,
    expectedEligibleRequests,
    'Expected audit request count does not match the Gate C workload',
  );
  assert.equal(
    auditCaptured <= expectedEligibleRequests,
    true,
    'Captured audit row count exceeds the Gate C workload',
  );
  assert.equal(auditErrors <= auditCaptured, true, 'Audit errors exceed captured audit rows');
  const auditCapture = calculatedRate(auditCaptured, auditExpected);
  const auditErrorRate = calculatedRate(auditErrors, auditCaptured);
  assert.equal(auditCapture >= captureLimit, true, 'Audit capture is below the required minimum');
  assert.equal(auditErrorRate <= errorRateLimit, true, 'Audit error rate exceeds the limit');
  assert.match(audit?.source_sha256 || '', /^[a-f0-9]{64}$/, 'Audit source hash is missing');

  const functions = liveEvidence?.production_functions;
  assert.equal(functions?.readable, true, 'Production function evidence is unreadable');
  requireUnchangedFunction(functions, 'search_icons');
  requireUnchangedFunction(functions, 'mcp_search');

  const npm = liveEvidence?.npm_registry;
  assert.equal(npm?.readable, true, 'npm registry evidence is unreadable');
  assert.equal(npm?.latest_before, manifest?.package?.latest_tag_must_remain, 'npm latest pre-state changed');
  assert.equal(npm?.latest_after, npm?.latest_before, 'npm latest changed during Gate C');

  return {
    status: 'ok',
    manifest_sha256: manifestHash,
    search_p95_ms: search.warm_summary.p95_ms,
    localized_p95_ms: localized.warm_summary.p95_ms,
    platform_error_rate_percent: platformRate,
    audit_error_rate_percent: auditErrorRate,
    audit_capture_percent: auditCapture,
    expected_eligible_requests: expectedEligibleRequests,
    recommendation_response_byte_parity: true,
    production_functions_unchanged: true,
    npm_latest_unchanged: true,
    material_and_invalid_smoke: true,
  };
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const manifestPath = readArg('manifest');
  const manifestHash = readArg('manifest-hash');
  const searchPath = readArg('search');
  const localizedPath = readArg('localized');
  const smokePath = readArg('smoke');
  const liveEvidencePath = readArg('live-evidence');
  const localGatesPath = readArg('local-gates');
  for (const [label, value] of Object.entries({
    manifestPath,
    manifestHash,
    searchPath,
    localizedPath,
    smokePath,
    liveEvidencePath,
    localGatesPath,
  })) {
    assert.ok(value, `${label} is required`);
  }

  const manifestText = readFileSync(manifestPath, 'utf8');
  const result = evaluateGateC({
    manifest: JSON.parse(manifestText),
    manifestText,
    manifestHash,
    search: readJson(searchPath),
    localized: readJson(localizedPath),
    smoke: readJson(smokePath),
    liveEvidence: readJson(liveEvidencePath),
    localGates: readJson(localGatesPath),
  });
  console.log(JSON.stringify(result, null, 2));
}
