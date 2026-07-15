import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

function readArg(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : '';
}

function readPositiveInteger(name, fallback, minimum = 1, maximum = Number.MAX_SAFE_INTEGER) {
  const raw = readArg(name);
  const value = raw ? Number(raw) : fallback;
  assert.equal(Number.isInteger(value), true, `--${name} must be an integer`);
  assert.ok(value >= minimum && value <= maximum, `--${name} must be between ${minimum} and ${maximum}`);
  return value;
}

const expectedCases = {
  all_mode_settings: {
    direct_request: {
      query: 'settings', library_mode: 'strict', style: 'any', limit: 10, locale: null,
    },
    expected: { result_count: 10 },
  },
  all_mode_cog: {
    direct_request: {
      query: 'cog', library_mode: 'strict', style: 'any', limit: 10, locale: null,
    },
    expected: { result_count: 10 },
  },
  lucide_strict_calendar: {
    direct_request: {
      query: 'calendar', library: 'lucide', library_mode: 'strict', style: 'any', limit: 5, locale: null,
    },
    expected: { result_count: 5, library: 'lucide' },
  },
};

const searchUrl = (readArg('search-url') || '').replace(/\/+$/, '');
const gateEvidencePath = resolve(readArg('gate-evidence') || '');
const outputPath = resolve(readArg('output') || '');
const overheadBudgetMs = readPositiveInteger('overhead-budget-ms', 1000, 1, 10000);
const requestTimeoutMs = readPositiveInteger('request-timeout-ms', 120000, 1000, 180000);
const clientFamily = readArg('client-family') || 'material_railway_recovery_attribution';

assert.match(searchUrl, /^https?:\/\//, 'Provide --search-url with an HTTP or HTTPS endpoint');
assert.ok(readArg('gate-evidence'), 'Provide --gate-evidence with a latency-failed gate artifact');
assert.ok(readArg('output'), 'Provide --output with a write-once JSON path');
assert.equal(existsSync(outputPath), false, `Attribution evidence already exists: ${outputPath}`);

const artifact = {
  artifact: 'material_engine_latency_attribution',
  search_url: searchUrl,
  gate_evidence_path: gateEvidencePath,
  overhead_budget_ms: overheadBudgetMs,
  request_timeout_ms: requestTimeoutMs,
  started_at: new Date().toISOString(),
  comparisons: [],
};

let outcome = 'engine_attributed';
try {
  const gate = JSON.parse(readFileSync(gateEvidencePath, 'utf8'));
  assert.equal(gate.artifact, 'material_railway_recovery_live_gate');
  assert.equal(gate.profile, 'engine-dependent');
  assert.equal(gate.status, 'latency_failed');
  assert.equal(gate.checks?.length, 6, 'Latency attribution requires all six correctness checks');
  assert.ok(Array.isArray(gate.latency_failures) && gate.latency_failures.length > 0,
    'Latency attribution requires at least one structured latency failure');

  const seen = new Set();
  const runId = randomUUID();
  for (const [index, failure] of gate.latency_failures.entries()) {
    const expectedCase = expectedCases[failure.case_id];
    assert.ok(expectedCase, `Unsupported attribution case: ${failure.case_id}`);
    assert.equal(seen.has(failure.case_id), false, `Duplicate attribution case: ${failure.case_id}`);
    seen.add(failure.case_id);
    assert.equal(failure.metric, 'elapsed_ms');
    assert.equal(Number.isFinite(failure.through_candidate_ms), true);
    assert.ok(failure.through_candidate_ms > failure.gate_ms);
    assert.deepEqual(failure.direct_request, expectedCase.direct_request,
      `${failure.case_id} direct request drifted from the pinned query shape`);
    assert.deepEqual(failure.expected, expectedCase.expected,
      `${failure.case_id} result contract drifted from the pinned query shape`);

    const comparison = {
      case_id: failure.case_id,
      metric: failure.metric,
      through_candidate_ms: failure.through_candidate_ms,
      overhead_budget_ms: overheadBudgetMs,
      direct_request: failure.direct_request,
      started_at: new Date().toISOString(),
    };
    try {
      const startedAt = performance.now();
      const response = await fetch(searchUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...failure.direct_request,
          source: 'verify',
          channel: 'internal_test',
          environment: 'production',
          client_family: clientFamily,
          tool_name: 'search_icons',
          dedupe_key: `material-attribution:${runId}:${index + 1}`,
        }),
        signal: AbortSignal.timeout(requestTimeoutMs),
      });
      comparison.status_code = response.status;
      const rawBody = await response.text();
      comparison.direct_engine_ms = Number((performance.now() - startedAt).toFixed(1));
      if (response.status !== 200) {
        comparison.status = 'dependency_degraded';
        comparison.error = `direct engine returned HTTP ${response.status}`;
        if (outcome !== 'candidate_overhead') outcome = 'dependency_degraded';
      } else {
        const body = JSON.parse(rawBody);
        const rows = Array.isArray(body?.results) ? body.results : [];
        comparison.result_count = rows.length;
        const expected = failure.expected;
        assert.equal(rows.length, expected.result_count,
          `${failure.case_id} direct engine returned the wrong result count`);
        if (expected.library) {
          assert.ok(rows.every((row) => row?.library === expected.library),
            `${failure.case_id} direct engine returned the wrong library`);
        }
        comparison.allowed_candidate_ms = Number((comparison.direct_engine_ms + overheadBudgetMs).toFixed(1));
        comparison.observed_overhead_ms = Number((
          failure.through_candidate_ms - comparison.direct_engine_ms
        ).toFixed(1));
        if (failure.through_candidate_ms <= comparison.allowed_candidate_ms) {
          comparison.status = 'engine_attributed';
        } else {
          comparison.status = 'candidate_overhead';
          outcome = 'candidate_overhead';
        }
      }
    } catch (error) {
      comparison.status = 'dependency_degraded';
      comparison.error = error.message;
      if (outcome !== 'candidate_overhead') outcome = 'dependency_degraded';
    }
    comparison.finished_at = new Date().toISOString();
    artifact.comparisons.push(comparison);
  }
} catch (error) {
  outcome = 'invalid_gate_evidence';
  artifact.error = error.message;
}

artifact.status = outcome;
artifact.finished_at = new Date().toISOString();
mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8');

console.log(JSON.stringify({
  status: artifact.status,
  comparisons: artifact.comparisons.length,
  output: outputPath,
}, null, 2));

if (outcome === 'candidate_overhead') process.exitCode = 2;
else if (outcome !== 'engine_attributed') process.exitCode = 1;
