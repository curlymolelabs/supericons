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

function calculatedRate(count, total) {
  return Number(((Number(count) / Math.max(1, Number(total))) * 100).toFixed(3));
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
  assert.equal(artifact?.warm_summary?.p95_ms <= limits.p95, true, `${label} p95 exceeds the limit`);
  assert.equal(
    artifact?.warm_summary?.error_rate_percent <= limits.errorRate,
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
  assert.equal(Number.isInteger(Number(entry.before_version)), true, `${key} before version is missing`);
  assert.equal(Number.isInteger(Number(entry.after_version)), true, `${key} after version is missing`);
  assert.equal(Number(entry.after_version), Number(entry.before_version), `${key} version changed`);
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
  const p95Limit = Number(release.search_warm_p95_ms_max);
  const errorRateLimit = Number(release.error_rate_percent_max);
  const captureLimit = Number(release.eligible_request_audit_capture_percent_min);
  assert.equal(Number.isFinite(p95Limit), true, 'Search p95 limit is missing');
  assert.equal(Number.isFinite(errorRateLimit), true, 'Error-rate limit is missing');
  assert.equal(Number.isFinite(captureLimit), true, 'Audit-capture limit is missing');

  for (const artifact of [search, localized, smoke]) {
    assert.equal(artifact?.manifest_sha256, manifestHash, 'Artifact manifest binding changed');
  }
  requirePerformance(search, 'search', { p95: p95Limit, errorRate: errorRateLimit });
  requirePerformance(localized, 'localized', { p95: p95Limit, errorRate: errorRateLimit });
  assert.equal(smoke?.smoke_summary?.all_passed, true, 'Material or invalid-request smoke failed');
  requireWorkerSummary(smoke, 'smoke');
  const expectedEligibleRequests = eligibleRequestCount(search, localized, smoke);
  assert.equal(expectedEligibleRequests > 0, true, 'Expected request count is missing');

  assert.equal(localGates?.recommendation_response_byte_parity, true, 'Recommendation byte parity failed');
  assert.equal(localGates?.usage_dedupe, true, 'Usage dedupe verification failed');

  assert.equal(liveEvidence?.endpoint, manifest?.implementation?.endpoint, 'Live endpoint evidence changed');
  assert.equal(typeof liveEvidence?.window?.started_at, 'string', 'Live evidence start time is missing');
  assert.equal(typeof liveEvidence?.window?.ended_at, 'string', 'Live evidence end time is missing');

  const platform = liveEvidence?.platform_error_evidence;
  assert.equal(platform?.readable, true, 'Platform error evidence is unreadable');
  assert.equal(
    Number(platform?.eligible_requests),
    expectedEligibleRequests,
    'Platform request count does not match the Gate C workload',
  );
  const platformRate = calculatedRate(platform?.error_count, platform?.eligible_requests);
  assert.equal(platformRate <= errorRateLimit, true, 'Platform error rate exceeds the limit');
  assert.match(platform?.source_sha256 || '', /^[a-f0-9]{64}$/, 'Platform source hash is missing');

  const audit = liveEvidence?.search_audit_evidence;
  assert.equal(audit?.readable, true, 'Search audit evidence is unreadable');
  assert.equal(
    Number(audit?.expected_eligible_requests),
    expectedEligibleRequests,
    'Expected audit request count does not match the Gate C workload',
  );
  assert.equal(Number(audit?.captured_rows) >= 0, true, 'Captured audit row count is missing');
  assert.equal(
    Number(audit?.captured_rows) <= expectedEligibleRequests,
    true,
    'Captured audit row count exceeds the Gate C workload',
  );
  const auditCapture = calculatedRate(audit?.captured_rows, audit?.expected_eligible_requests);
  const auditErrorRate = calculatedRate(audit?.error_rows, audit?.captured_rows);
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
