import {
  TelemetryHttpError,
  classifyOrigin,
  constantTimeEqual,
  parsePayload,
  verifyControlledRun,
} from '../supabase/functions/web-search-telemetry/index.ts';

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

function expectCode(run: () => unknown, expectedCode: string) {
  try {
    run();
  } catch (error) {
    if (!(error instanceof TelemetryHttpError)) {
      throw new Error(`Expected TelemetryHttpError, received ${String(error)}`);
    }
    assert(error.code === expectedCode, `Expected ${expectedCode}, received ${error.code}`);
    return;
  }
  throw new Error(`Expected ${expectedCode} to be rejected.`);
}

async function hmacHex(secret: string, value: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const bytes = new Uint8Array(
    await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value)),
  );
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

Deno.test('classifies trusted website origins without client-selected labels', () => {
  Deno.env.set('SUPERICONS_PRODUCTION_WEB_HOSTS', 'app.supericons.dev');
  assert(classifyOrigin('https://supericons.dev').environment === 'production', 'Production origin was not recognized.');
  assert(classifyOrigin('https://app.supericons.dev').environment === 'production', 'Configured production origin was not recognized.');
  assert(classifyOrigin('https://deploy-preview-1.netlify.app').environment === 'preview', 'Preview origin was not recognized.');
  assert(classifyOrigin('http://localhost:5173').environment === 'local', 'Local origin was not recognized.');
  expectCode(() => classifyOrigin('https://supericons.dev.attacker.example'), 'web_telemetry_origin_forbidden');
  expectCode(() => classifyOrigin(null), 'web_telemetry_origin_required');
});

Deno.test('accepts valid final and diagnostic contracts', () => {
  const final = parsePayload({
    action: 'final',
    contract_version: 1,
    episode_id: '2c79b3bc-dfaa-46e4-8ef8-863c8a11e8e2',
    query: 'camera',
    local_match_count: 12,
    hosted_match_count: 8,
    hosted_state: 'success',
    final_match_count: 12,
    final_outcome: 'success',
    settlement_state: 'completed',
  });
  assert(final.action === 'final' && final.finalMatchCount === 12, 'Valid final event was not parsed.');

  const diagnostic = parsePayload({
    action: 'diagnostic',
    contract_version: 1,
    episode_id: '53270c35-483a-4ccc-99c4-aef8812cb4e2',
    query: 'search',
    diagnostic_type: 'superseded',
    local_match_count: 0,
    hosted_state: 'pending',
  });
  assert(
    diagnostic.action === 'diagnostic' && diagnostic.diagnosticType === 'superseded',
    'Valid diagnostic was not parsed.',
  );
});

Deno.test('rejects false zeros, invalid identity, and client trust fields', () => {
  expectCode(() => parsePayload({
    action: 'final',
    contract_version: 1,
    episode_id: 'c030a41c-5d40-49f6-bc42-24155daef54e',
    query: 'camera',
    hosted_state: 'pending',
    final_match_count: 0,
    final_outcome: 'zero',
    settlement_state: 'completed',
  }), 'web_telemetry_false_zero');

  expectCode(() => parsePayload({
    action: 'final',
    contract_version: 1,
    episode_id: '0123456789abcdef0123456789abcdef',
    query: 'camera',
    hosted_state: 'zero',
    final_match_count: 0,
    final_outcome: 'zero',
    settlement_state: 'completed',
  }), 'web_telemetry_invalid_id');

  const parsed = parsePayload({
    action: 'final',
    contract_version: 1,
    episode_id: '2116e613-c5b0-4888-a77c-d1ad67d95713',
    query: 'camera',
    hosted_state: 'zero',
    final_match_count: 0,
    final_outcome: 'zero',
    settlement_state: 'completed',
    channel: 'hosted_mcp',
    environment: 'production',
    traffic_class: 'controlled_test',
  });
  assert(!('channel' in parsed), 'The browser was allowed to choose channel.');
  assert(!('environment' in parsed), 'The browser was allowed to choose environment.');
  assert(!('trafficClass' in parsed), 'The browser was allowed to choose traffic class.');
});

Deno.test('accepts only correctly signed controlled-run headers', async () => {
  const secret = 'test-only-controlled-run-secret-1234567890';
  Deno.env.set('SUPERICONS_CONTROLLED_RUN_SECRET', secret);
  const label = 'telemetry-contract';
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = await hmacHex(secret, `${timestamp}.${label}`);
  const request = new Request('https://example.test', {
    headers: {
      'x-supericons-controlled-run-label': label,
      'x-supericons-controlled-run-timestamp': timestamp,
      'x-supericons-controlled-run-signature': signature,
    },
  });
  const valid = await verifyControlledRun(request);
  assert(valid.valid === true && valid.label === label, 'Valid controlled-run headers were rejected.');

  const forged = new Request('https://example.test', {
    headers: {
      'x-supericons-controlled-run-label': label,
      'x-supericons-controlled-run-timestamp': timestamp,
      'x-supericons-controlled-run-signature': '0'.repeat(64),
    },
  });
  assert((await verifyControlledRun(forged)).valid === false, 'Forged controlled-run headers were accepted.');
  assert(constantTimeEqual(signature, signature), 'Constant-time equality rejected equal signatures.');
  assert(!constantTimeEqual(signature, '0'.repeat(64)), 'Constant-time equality accepted a different signature.');
});
