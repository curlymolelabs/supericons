import assert from 'node:assert/strict';
import { classifyAdminApiPreflight } from './admin-dashboard-admin-api-preflight-classifier.mjs';

assert.deepEqual(
  classifyAdminApiPreflight({ httpStatus: 200, payloadHasStats: true }),
  { proceed: true, outcome: 'healthy', reason: 'legacy_contract_verified' },
);
assert.equal(classifyAdminApiPreflight({ errorName: 'TimeoutError' }).proceed, true);
assert.equal(classifyAdminApiPreflight({ errorMessage: 'The operation timed out' }).outcome, 'timeout');
assert.equal(classifyAdminApiPreflight({ httpStatus: 500 }).proceed, true);
assert.equal(classifyAdminApiPreflight({ httpStatus: 503 }).outcome, 'http_5xx');
assert.equal(classifyAdminApiPreflight({ httpStatus: 401 }).proceed, false);
assert.equal(classifyAdminApiPreflight({ httpStatus: 403 }).outcome, 'auth_rejected');
assert.equal(classifyAdminApiPreflight({ httpStatus: 404 }).proceed, false);
assert.equal(classifyAdminApiPreflight({ httpStatus: 200, payloadHasStats: false }).proceed, false);
assert.equal(classifyAdminApiPreflight({ errorName: 'TypeError', errorMessage: 'fetch failed' }).proceed, false);

console.log(JSON.stringify({ status: 'ok', checks: 10 }));
