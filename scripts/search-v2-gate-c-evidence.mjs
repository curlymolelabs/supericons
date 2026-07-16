import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

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

function calculatedRate(count, total) {
  return Number(((count / Math.max(1, total)) * 100).toFixed(3));
}

function requireWorkerSummary(artifact, label) {
  assert.equal(typeof artifact?.worker_summary, 'object', `${label} worker summary is missing`);
  for (const state of ['first_request', 'reused_worker', 'unknown']) {
    assert.equal(
      typeof artifact.worker_summary?.[state],
      'object',
      `${label} ${state} summary is missing`,
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
  requireWorkerSummary(artifact, label);
}

function hostedAttemptsFor(sample) {
  return Array.isArray(sample?.hosted_attempts) ? sample.hosted_attempts.length : 1;
}

function eligibleRequestCount(search, localized, smoke) {
  const directSearch = 1 + (Array.isArray(search?.warm_samples) ? search.warm_samples.length : 0);
  const localizedSamples = [localized?.first_request, ...(localized?.warm_samples || [])]
    .filter(Boolean);
  const localizedRequests = localizedSamples.reduce(
    (total, sample) => total + hostedAttemptsFor(sample),
    0,
  );
  const smokeRequests = [
    smoke?.material_outline,
    smoke?.material_solid,
    smoke?.invalid_request,
  ].filter(Boolean).length;
  return directSearch + localizedRequests + smokeRequests;
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
  requirePerformance(search, 'search', { p95: p95Limit, errorRate: errorRateLimit });
  requirePerformance(localized, 'localized', { p95: p95Limit, errorRate: errorRateLimit });
  assert.equal(smoke?.smoke_summary?.all_passed, true, 'Material or invalid-request smoke failed');
  requireWorkerSummary(smoke, 'smoke');
  const expectedEligibleRequests = eligibleRequestCount(search, localized, smoke);
  assert.equal(expectedEligibleRequests > 0, true, 'Expected request count is missing');
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
