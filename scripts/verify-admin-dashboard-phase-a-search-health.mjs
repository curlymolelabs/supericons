import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

function readArg(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : '';
}

function readPositiveInteger(name, fallback, minimum, maximum) {
  const raw = readArg(name);
  const value = raw ? Number(raw) : fallback;
  assert.equal(Number.isInteger(value), true, `--${name} must be an integer.`);
  assert.ok(value >= minimum && value <= maximum,
    `--${name} must be between ${minimum} and ${maximum}.`);
  return value;
}

const searchUrl = (readArg('search-url') || '').replace(/\/+$/, '');
const outputPath = resolve(readArg('output') || '');
const measuredCount = readPositiveInteger('measured-count', 2, 2, 5);
const warmupCount = readPositiveInteger('warmup-count', 1, 1, 3);
const latencyLimitMs = readPositiveInteger('latency-limit-ms', 2000, 1, 10000);
const requestTimeoutMs = readPositiveInteger('request-timeout-ms', 5000, 1, 30000);

assert.match(searchUrl, /^https?:\/\//, 'Provide --search-url with an HTTP or HTTPS endpoint.');
assert.ok(readArg('output'), 'Provide --output with a write-once JSON path.');
assert.equal(existsSync(outputPath), false, `Evidence already exists: ${outputPath}`);

const runId = randomUUID();
const evidence = {
  artifact: 'admin_dashboard_phase_a_strict_search_health',
  search_url: searchUrl,
  status: 'running',
  contract: {
    query: 'calendar',
    library: 'lucide',
    library_mode: 'strict',
    style: 'any',
    limit: 3,
    warmup_count: warmupCount,
    measured_count: measuredCount,
    measured_latency_limit_ms: latencyLimitMs,
    request_timeout_ms: requestTimeoutMs,
    source: 'verify',
    channel: 'internal_test',
    environment: 'production',
  },
  warmups: [],
  measurements: [],
  started_at: new Date().toISOString(),
};

async function runProbe(sequence, phase) {
  const startedAt = performance.now();
  const response = await fetch(searchUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      query: 'calendar',
      library: 'lucide',
      library_mode: 'strict',
      style: 'any',
      limit: 3,
      source: 'verify',
      channel: 'internal_test',
      environment: 'production',
      client_family: 'admin_dashboard_phase_a_2v',
      tool_name: 'search_icons',
      dedupe_key: `admin-dashboard-phase-a-2v:${runId}:${phase}:${sequence}`,
    }),
    signal: AbortSignal.timeout(requestTimeoutMs),
  });
  const latencyMs = Math.round((performance.now() - startedAt) * 10) / 10;
  const payload = await response.json().catch(() => null);
  assert.equal(response.status, 200, `${phase} probe ${sequence} returned HTTP ${response.status}.`);
  assert.ok(Array.isArray(payload?.results), `${phase} probe ${sequence} returned no result list.`);
  assert.equal(payload.results.length, 3, `${phase} probe ${sequence} returned the wrong result count.`);
  assert.equal(payload.results.every((row) => row?.library === 'lucide'), true,
    `${phase} probe ${sequence} returned a non-Lucide result.`);
  return {
    sequence,
    latency_ms: latencyMs,
    result_count: payload.results.length,
    valid_lucide_results: true,
  };
}

try {
  for (let index = 0; index < warmupCount; index += 1) {
    evidence.warmups.push(await runProbe(index + 1, 'warmup'));
  }
  for (let index = 0; index < measuredCount; index += 1) {
    const measurement = await runProbe(index + 1, 'measured');
    evidence.measurements.push(measurement);
    assert.ok(measurement.latency_ms < latencyLimitMs,
      `Measured probe ${index + 1} took ${measurement.latency_ms} ms.`);
  }
  evidence.status = 'ok';
} catch (error) {
  evidence.status = 'blocked';
  evidence.error = error instanceof Error ? error.message : String(error);
  process.exitCode = 1;
} finally {
  evidence.synthetic_internal_test_calls = warmupCount + measuredCount;
  evidence.mutations = 0;
  evidence.finished_at = new Date().toISOString();
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({ status: evidence.status, output: outputPath }));
}
