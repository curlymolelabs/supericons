import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
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

function sleep(milliseconds) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds));
}

const searchUrl = (readArg('search-url') || '').replace(/\/+$/, '');
const outputPath = resolve(readArg('output') || '');
const count = readPositiveInteger('count', 1, 1, 10);
const intervalMilliseconds = readPositiveInteger('interval-ms', 0, 0, 300000);
const latencyLimitMilliseconds = readPositiveInteger('latency-limit-ms', 3000, 1, 120000);
const requestTimeoutMilliseconds = readPositiveInteger('request-timeout-ms', 10000, 1, 120000);
const clientFamily = readArg('client-family') || 'material_railway_recovery';
const latencyPolicy = readArg('latency-policy') || 'blocking';

assert.match(searchUrl, /^https?:\/\//, 'Provide --search-url with an HTTP or HTTPS endpoint');
assert.ok(readArg('output'), 'Provide --output with a write-once JSON path');
assert.equal(existsSync(outputPath), false, `Probe evidence already exists: ${outputPath}`);
assert.ok(['blocking', 'record-only'].includes(latencyPolicy),
  '--latency-policy must be blocking or record-only');

const runId = randomUUID();
const artifact = {
  artifact: 'material_search_engine_stability_probe',
  search_url: searchUrl,
  started_at: new Date().toISOString(),
  contract: {
    count,
    interval_ms: intervalMilliseconds,
    latency_limit_ms: latencyLimitMilliseconds,
    latency_policy: latencyPolicy,
    request_timeout_ms: requestTimeoutMilliseconds,
    source: 'verify',
    channel: 'internal_test',
    environment: 'production',
    client_family: clientFamily,
  },
  probes: [],
};

let failure = '';
for (let index = 0; index < count; index += 1) {
  if (index > 0) await sleep(intervalMilliseconds);

  const startedAt = performance.now();
  const probe = {
    sequence: index + 1,
    started_at: new Date().toISOString(),
  };
  try {
    const response = await fetch(searchUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: 'calendar',
        library: 'lucide',
        library_mode: 'strict',
        style: 'any',
        limit: 3,
        source: 'verify',
        channel: 'internal_test',
        environment: 'production',
        client_family: clientFamily,
        tool_name: 'search_icons',
        dedupe_key: `material-railway-recovery:${runId}:${index + 1}`,
      }),
      signal: AbortSignal.timeout(requestTimeoutMilliseconds),
    });
    probe.duration_ms = Number((performance.now() - startedAt).toFixed(1));
    probe.status_code = response.status;
    const rawBody = await response.text();
    if (response.status !== 200) {
      failure = `probe ${index + 1} returned HTTP ${response.status}`;
      probe.error = failure;
    } else {
      const body = JSON.parse(rawBody);
      probe.result_count = Array.isArray(body?.results) ? body.results.length : 0;
      const validResults = Array.isArray(body?.results)
        && body.results.length === 3
        && body.results.every((row) => row?.library === 'lucide');
      if (!validResults) {
        failure = `probe ${index + 1} returned an invalid Lucide result set`;
        probe.error = failure;
      } else if (probe.duration_ms > latencyLimitMilliseconds) {
        probe.latency_exceeded = true;
        if (latencyPolicy === 'blocking') {
          failure = `probe ${index + 1} took ${probe.duration_ms} ms, above ${latencyLimitMilliseconds} ms`;
          probe.error = failure;
        }
      }
    }
  } catch (error) {
    probe.duration_ms = Number((performance.now() - startedAt).toFixed(1));
    probe.status_code = null;
    failure = `probe ${index + 1} failed: ${error.message}`;
    probe.error = failure;
  }
  probe.finished_at = new Date().toISOString();
  artifact.probes.push(probe);
  if (failure) break;
}

artifact.status = failure ? 'degraded' : 'ok';
if (failure) artifact.error = failure;
artifact.finished_at = new Date().toISOString();
mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8');

console.log(JSON.stringify({
  status: artifact.status,
  probes_completed: artifact.probes.length,
  output: outputPath,
}, null, 2));

if (failure) process.exitCode = 1;
