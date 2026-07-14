import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { productionizeMeasurementPayload } from './lib/search-measurement-profile.mjs';

const PROJECT_REF = 'kcjmkakdhsqplvasgkjv';
const ENDPOINT_NAME = 'mcp-search';
const ENDPOINT = `https://${PROJECT_REF}.supabase.co/functions/v1/${ENDPOINT_NAME}`;

function readArg(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : null;
}

const mode = readArg('mode');
const output = readArg('output');
assert.ok(['search', 'recommendation'].includes(mode), 'Use --mode search or recommendation.');
assert.ok(output, 'Provide --output with a local JSON path.');

const configuredEndpoint = String(process.env.SUPERICONS_SEARCH_V2_MEASUREMENT_ENDPOINT || '').trim();
assert.ok(
  !configuredEndpoint || configuredEndpoint === ENDPOINT_NAME,
  'Material production baselines must target stable mcp-search.',
);
process.env.SUPERICONS_SEARCH_V2_MEASUREMENT_ENDPOINT = ENDPOINT_NAME;

const runId = randomUUID();
const originalFetch = globalThis.fetch;
let sanitizedRequestCount = 0;

globalThis.fetch = async (input, init = {}) => {
  const url = typeof input === 'string' ? input : input?.url;
  if (url !== ENDPOINT || String(init.method || 'GET').toUpperCase() !== 'POST') {
    return originalFetch(input, init);
  }

  assert.equal(typeof init.body, 'string', 'Stable measurement request body must be JSON text.');
  const payload = JSON.parse(init.body);
  const productionPayload = productionizeMeasurementPayload(payload, {
    runId,
    requestSequence: sanitizedRequestCount,
  });
  const encoded = JSON.stringify(productionPayload);
  assert.ok(!encoded.includes('mcp_beta'), 'Stable measurement request retained beta source.');
  assert.ok(!encoded.includes('"environment":"preview"'), 'Stable measurement request retained preview environment.');
  assert.ok(!encoded.includes('beta_cohort'), 'Stable measurement request retained beta cohort.');
  sanitizedRequestCount += 1;
  return originalFetch(input, { ...init, body: encoded });
};

try {
  await import('./run-search-v2-latency-measurement.mjs');
} finally {
  globalThis.fetch = originalFetch;
}

const expectedRequestCount = mode === 'search' ? 26 : 21;
assert.equal(sanitizedRequestCount, expectedRequestCount, 'Stable measurement request count changed.');

const outputPath = resolve(output);
const artifact = JSON.parse(readFileSync(outputPath, 'utf8'));
assert.equal(artifact.endpoint, ENDPOINT_NAME);
assert.equal(artifact.mode, mode);
assert.equal(artifact.first_request?.ok, true);
assert.equal(artifact.warm_summary?.errors, 0);

const retainedArtifact = {
  ...artifact,
  measurement_profile: 'production',
  measurement_run_id: runId,
  sanitized_request_count: sanitizedRequestCount,
  audit_contract: {
    source: 'verify',
    channel: 'internal_test',
    environment: 'production',
    client_family: 'material_release_latency',
    beta_cohort: null,
  },
};
writeFileSync(outputPath, `${JSON.stringify(retainedArtifact, null, 2)}\n`, 'utf8');

console.log(JSON.stringify({
  status: 'ok',
  output: outputPath,
  mode,
  measurement_profile: retainedArtifact.measurement_profile,
  measurement_run_id: retainedArtifact.measurement_run_id,
  sanitized_request_count: retainedArtifact.sanitized_request_count,
  p95_ms: retainedArtifact.warm_summary.p95_ms,
}, null, 2));
