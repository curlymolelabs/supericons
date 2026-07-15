import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  buildSupabaseAdminHeaders,
  readHostedError,
} from './seed-material-owned-cache.js';

function fakeJwt(role) {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ role })}.fake-signature`;
}

const secretKey = 'sb_secret_example_for_contract_test';
assert.deepEqual(buildSupabaseAdminHeaders(secretKey), {
  apikey: secretKey,
});

const legacyServiceRoleKey = fakeJwt('service_role');
assert.deepEqual(buildSupabaseAdminHeaders(legacyServiceRoleKey), {
  apikey: legacyServiceRoleKey,
  authorization: `Bearer ${legacyServiceRoleKey}`,
});

assert.throws(
  () => buildSupabaseAdminHeaders('sb_publishable_example_for_contract_test'),
  /publishable key cannot seed private Material assets/,
);
assert.throws(
  () => buildSupabaseAdminHeaders(fakeJwt('anon')),
  /secret key or legacy service_role JWT/,
);
assert.throws(
  () => buildSupabaseAdminHeaders('not-a-key'),
  /secret key or legacy service_role JWT/,
);

const hostedError = await readHostedError(new Response(JSON.stringify({
  code: 'InvalidMimeType',
  message: 'The specified MIME type is not valid',
}), { status: 400 }), 'Storage upload');
assert.equal(hostedError.message, 'Storage upload failed (400): InvalidMimeType');

const source = readFileSync('scripts/seed-material-owned-cache.js', 'utf8');
assert.match(source, /await verifyHostedAccess\(hostedConfig\)/);
assert.match(source, /storage\/v1\/object\/list\/material-icons/);
assert.match(source, /'content-type': 'image\/svg\+xml'/);
assert.doesNotMatch(source, /'content-type': 'image\/svg\+xml; charset=utf-8'/);

console.log(JSON.stringify({
  status: 'ok',
  new_secret_uses_apikey_only: true,
  legacy_service_role_uses_bearer_jwt: true,
  low_privilege_keys_rejected: true,
  hosted_access_checked_before_seed: true,
  storage_error_detail_retained: true,
  bucket_mime_type_exact: true,
}, null, 2));
