import {
  TelemetryHttpError,
  classifyOrigin,
  countLinkedDiagnosticAttempts,
  constantTimeEqual,
  parsePayload,
  resolveLinkedWebCountry,
  verifyControlledRun,
} from '../supabase/functions/web-search-telemetry/index.ts';
import { buildSearchAuditContext } from '../supabase/functions/_shared/search-engine/handle-search-request.ts';

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
    completion_trigger: 'idle',
    locale: 'es',
    interface_locale: 'zh-Hans',
  });
  assert(final.action === 'final' && final.finalMatchCount === 12, 'Valid final event was not parsed.');
  assert(final.locale === 'es', 'Query locale was not preserved.');
  assert(final.interfaceLocale === 'zh-Hans', 'Interface locale was not preserved.');

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
    completion_trigger: 'idle',
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
    completion_trigger: 'enter',
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
    completion_trigger: 'blur',
    channel: 'hosted_mcp',
    environment: 'production',
    traffic_class: 'controlled_test',
  });
  assert(!('channel' in parsed), 'The browser was allowed to choose channel.');
  assert(!('environment' in parsed), 'The browser was allowed to choose environment.');
  assert(!('trafficClass' in parsed), 'The browser was allowed to choose traffic class.');
});

Deno.test('normalizes unsupported interface language to null without rejecting the outcome', () => {
  const parsed = parsePayload({
    action: 'final',
    contract_version: 1,
    episode_id: '7070de2e-3532-4ab7-8e65-5323730e4d36',
    query: 'camera',
    hosted_state: 'success',
    final_match_count: 5,
    final_outcome: 'success',
    settlement_state: 'completed',
    completion_trigger: 'idle',
    locale: 'fr',
    interface_locale: 'unsupported',
  });
  assert(parsed.locale === 'fr', 'Query locale behavior changed.');
  assert(parsed.interfaceLocale === null, 'Unsupported interface locale was accepted.');
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

Deno.test('keeps trusted episode and attempt linkage on diagnostic rows', () => {
  const context = buildSearchAuditContext({
    channel: 'web',
    environment: 'production',
    contract_version: 1,
    episode_id: '7089f7e0-d25b-43ba-8ec7-ae5e745a5349',
    recovery_chain_id: 'f1c77cab-a578-4894-803e-53c2ddfa2f92',
    attempt_id: '1980f8dc-47af-4775-ad29-f4ef6a11c05f',
    attempt_number: 2,
    query_variant: 'search icon',
    query_origin: 'localized_retry',
    search_engine: 'search_v2',
    execution_route: 'public_gateway',
  }, 'web');
  assert(context.channel === 'web', 'Web diagnostic channel was lost.');
  assert(context.attempt_number === 2, 'Attempt order was lost.');
  assert(context.query_origin === 'localized_retry', 'Attempt origin was lost.');
  assert(context.episode_id === '7089f7e0-d25b-43ba-8ec7-ae5e745a5349', 'Episode ID was lost.');
});

Deno.test('derives the linked diagnostic-attempt count on the server', async () => {
  const requestedTables: string[] = [];
  const requestedEpisodes: string[] = [];
  const adminClient = {
    from(table: string) {
      requestedTables.push(table);
      return {
        select() {
          return this;
        },
        async eq(field: string, value: string) {
          assert(field === 'episode_id', 'The server must count by episode ID.');
          requestedEpisodes.push(value);
          return { count: 3, error: null };
        },
      };
    },
  };
  const count = await countLinkedDiagnosticAttempts(
    adminClient,
    '48f1d781-ecb2-4ca6-83be-2d2fcfe3d0ee',
  );
  assert(count === 3, 'The server-derived attempt count must be returned.');
  assert(JSON.stringify(requestedTables) === JSON.stringify(['search_request_audit']), 'The audit table must be counted.');
  assert(
    JSON.stringify(requestedEpisodes) === JSON.stringify(['48f1d781-ecb2-4ca6-83be-2d2fcfe3d0ee']),
    'The final episode must be the count key.',
  );
});

function countryAuditClient(
  rows: Array<Record<string, unknown>>,
  expectedEnvironment = 'production',
  error: Record<string, unknown> | null = null,
) {
  const filters: Array<[string, string]> = [];
  return {
    filters,
    client: {
      from(table: string) {
        assert(table === 'search_request_audit', 'Country must come from the audit table.');
        return {
          select(fields: string) {
            assert(fields === 'country_code,geo_source', 'Country lookup selected unexpected fields.');
            return this;
          },
          eq(field: string, value: string) {
            filters.push([field, value]);
            if (filters.length === 3) {
              assert(
                JSON.stringify(filters) === JSON.stringify([
                  ['episode_id', '0cafab5c-81fb-4c15-b498-893564b8d7bc'],
                  ['channel', 'web'],
                  ['environment', expectedEnvironment],
                ]),
                'Country lookup used an unsafe identity or scope.',
              );
              return Promise.resolve({ data: rows, error });
            }
            return this;
          },
        };
      },
    },
  };
}

Deno.test('copies country only from exact, agreeing Web audit rows', async () => {
  const episodeId = '0cafab5c-81fb-4c15-b498-893564b8d7bc';
  const single = countryAuditClient([
    { country_code: 'es', geo_source: 'railway_geoip' },
  ]);
  const singleResult = await resolveLinkedWebCountry(single.client, episodeId, 'production');
  assert(singleResult.countryCode === 'ES', 'Single linked country was not normalized.');
  assert(singleResult.geoSource === 'railway_geoip', 'Linked country source was not preserved.');

  const repeated = countryAuditClient([
    { country_code: 'US', geo_source: 'railway_geoip' },
    { country_code: 'US', geo_source: 'railway_geoip' },
  ]);
  const repeatedResult = await resolveLinkedWebCountry(repeated.client, episodeId, 'production');
  assert(repeatedResult.countryCode === 'US', 'Agreeing audit attempts did not resolve.');

  const conflicting = countryAuditClient([
    { country_code: 'US', geo_source: 'railway_geoip' },
    { country_code: 'CA', geo_source: 'railway_geoip' },
  ]);
  const conflictingResult = await resolveLinkedWebCountry(conflicting.client, episodeId, 'production');
  assert(conflictingResult.countryCode === null, 'Conflicting audit countries were accepted.');

  const missing = countryAuditClient([]);
  const missingResult = await resolveLinkedWebCountry(missing.client, episodeId, 'production');
  assert(missingResult.countryCode === null, 'Missing audit evidence produced a country.');

  const nonCountry = countryAuditClient([
    { country_code: 'T1', geo_source: 'railway_geoip' },
  ]);
  const nonCountryResult = await resolveLinkedWebCountry(nonCountry.client, episodeId, 'production');
  assert(nonCountryResult.countryCode === null, 'A non-country network marker was accepted.');
});

Deno.test('country lookup failure cannot reject final telemetry', async () => {
  const episodeId = '0cafab5c-81fb-4c15-b498-893564b8d7bc';
  const failed = countryAuditClient([], 'production', { message: 'injected failure' });
  const result = await resolveLinkedWebCountry(failed.client, episodeId, 'production');
  assert(result.countryCode === null && result.geoSource === null, 'Failed lookup did not fail open.');
});
