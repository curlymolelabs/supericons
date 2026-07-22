import assert from 'node:assert/strict';

import {
  CONTROLLED_RUN_HEADERS,
  createControlledRunHeaders,
  verifyControlledRunHeaders,
} from '../mcp/controlled-run-auth.js';

const secret = 'incident-closure-test-secret-with-more-than-32-characters';
const otherSecret = 'different-test-secret-with-more-than-32-characters';
const nowMs = Date.UTC(2026, 6, 23, 0, 0, 0);
const validHeaders = createControlledRunHeaders('route-product-gate', secret, {
  nowMs,
});

assert.deepEqual(verifyControlledRunHeaders(validHeaders, secret, { nowMs }), {
  valid: true,
  label: 'route-product-gate',
  reason: null,
});
assert.equal(verifyControlledRunHeaders(validHeaders, otherSecret, { nowMs }).reason, 'invalid_signature');
assert.equal(
  verifyControlledRunHeaders({ ...validHeaders, [CONTROLLED_RUN_HEADERS.label]: 'other-run' }, secret, { nowMs })
    .reason,
  'invalid_signature',
);
assert.equal(verifyControlledRunHeaders(validHeaders, secret, { nowMs: nowMs + 301_000 }).reason, 'expired');
assert.equal(verifyControlledRunHeaders(validHeaders, '', { nowMs }).reason, 'secret_unavailable');
assert.throws(() => createControlledRunHeaders('bad label', secret, { nowMs }));

console.log('verify-controlled-run-auth: ok');
