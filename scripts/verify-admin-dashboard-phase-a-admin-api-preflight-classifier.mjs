import assert from 'node:assert/strict';
import {
  ADMIN_API_PREFLIGHT_MAX_LATENCY_MS,
  classifyAdminApiPreflight,
} from './admin-dashboard-admin-api-preflight-classifier.mjs';

assert.deepEqual(
  classifyAdminApiPreflight({ httpStatus: 200, payloadHasStats: true, latencyMs: 500 }),
  { proceed: true, outcome: 'healthy', reason: 'legacy_contract_verified' },
);
assert.equal(ADMIN_API_PREFLIGHT_MAX_LATENCY_MS, 10_000);
assert.equal(classifyAdminApiPreflight({ errorName: 'TimeoutError' }).proceed, false);
assert.equal(classifyAdminApiPreflight({ errorMessage: 'The operation timed out' }).outcome, 'timeout');
assert.equal(classifyAdminApiPreflight({ httpStatus: 500, latencyMs: 900 }).proceed, true);
assert.equal(classifyAdminApiPreflight({ httpStatus: 503, latencyMs: 1200 }).outcome, 'http_5xx');
assert.equal(classifyAdminApiPreflight({
  httpStatus: 200,
  payloadHasStats: true,
  latencyMs: 10_000,
}).proceed, true);
assert.deepEqual(classifyAdminApiPreflight({
  httpStatus: 200,
  payloadHasStats: true,
  latencyMs: 10_001,
}), { proceed: false, outcome: 'slow_response', reason: 'shared_database_unhealthy' });
assert.equal(classifyAdminApiPreflight({ httpStatus: 503, latencyMs: 10_001 }).proceed, false);
assert.equal(classifyAdminApiPreflight({ httpStatus: 401 }).proceed, false);
assert.equal(classifyAdminApiPreflight({ httpStatus: 403 }).outcome, 'auth_rejected');
assert.equal(classifyAdminApiPreflight({ httpStatus: 404 }).proceed, false);
assert.equal(classifyAdminApiPreflight({ httpStatus: 200, payloadHasStats: false }).proceed, false);
assert.equal(classifyAdminApiPreflight({ errorName: 'TypeError', errorMessage: 'fetch failed' }).proceed, false);

console.log(JSON.stringify({ status: 'ok', checks: 14, max_latency_ms: 10_000 }));
