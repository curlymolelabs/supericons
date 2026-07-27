import assert from 'node:assert/strict';

import {
  LocalTelemetryHttpError,
  constantTimeEqual,
  hmacSha256Hex,
  normalizeTrustedCountry,
  parseLocalTelemetryPayload,
} from './index.ts';

const VALID_PAYLOAD = {
  contract_version: 3,
  install_id: '10000000-0000-4000-8000-000000000001',
  episode_id: '20000000-0000-4000-8000-000000000002',
  attempt_id: '30000000-0000-4000-8000-000000000003',
  recovery_chain_id: '40000000-0000-4000-8000-000000000004',
  query: 'download arrow',
  result_count: 8,
  library_filter: 'lucide',
  library_mode: 'strict',
  search_outcome: 'results',
  tool_name: 'search_icons',
  locale: 'en',
  confidence_label: 'high',
  beta_cohort: null,
  mcp_server_version: '0.4.24-beta.1',
  latency_ms: 42,
  client_family: 'codex',
  client_version: '1.2.3',
  os_platform: 'win32',
  session_hash: 'a'.repeat(64),
};

Deno.test('v3 payload keeps only bounded approved fields', () => {
  const parsed = parseLocalTelemetryPayload({
    ...VALID_PAYLOAD,
    query: `  ${'download '.repeat(100)}  `,
    client_family: 'Codex Desktop',
    ignored_private_path: 'C:\\private\\project',
  });

  assert.equal(parsed.query.length, 500);
  assert.equal(parsed.clientFamily, 'codex_desktop');
  assert.equal('ignored_private_path' in parsed, false);
});

Deno.test('v3 keeps accepted controlled-run cohort markers intact', () => {
  const controlledRun = parseLocalTelemetryPayload({
    ...VALID_PAYLOAD,
    beta_cohort: 'controlled-run:local_attribution',
  });
  const founderControlled = parseLocalTelemetryPayload({
    ...VALID_PAYLOAD,
    beta_cohort: 'deterministic-v2-beta:founder_controlled',
  });
  const controlledSuffix = parseLocalTelemetryPayload({
    ...VALID_PAYLOAD,
    beta_cohort: 'release:controlled_example',
  });

  assert.equal(controlledRun.betaCohort, 'controlled-run:local_attribution');
  assert.equal(
    founderControlled.betaCohort,
    'deterministic-v2-beta:founder_controlled',
  );
  assert.equal(controlledSuffix.betaCohort, 'release:controlled_example');
});

Deno.test('v3 requires random version 4 identities', () => {
  assert.throws(
    () => parseLocalTelemetryPayload({
      ...VALID_PAYLOAD,
      install_id: '10000000-0000-1000-8000-000000000001',
    }),
    (error) => error instanceof LocalTelemetryHttpError
      && error.code === 'local_telemetry_invalid_id',
  );
});

Deno.test('v3 rejects oversized counts and unsupported values', () => {
  assert.throws(
    () => parseLocalTelemetryPayload({
      ...VALID_PAYLOAD,
      result_count: 100001,
    }),
    (error) => error instanceof LocalTelemetryHttpError
      && error.code === 'local_telemetry_invalid_number',
  );
  assert.throws(
    () => parseLocalTelemetryPayload({
      ...VALID_PAYLOAD,
      os_platform: 'freebsd',
    }),
    (error) => error instanceof LocalTelemetryHttpError
      && error.code === 'local_telemetry_platform_invalid',
  );
});

Deno.test('country accepts only a real two-letter code', () => {
  assert.equal(normalizeTrustedCountry('sg'), 'SG');
  assert.equal(normalizeTrustedCountry('ZZ'), null);
  assert.equal(normalizeTrustedCountry('Singapore'), null);
});

Deno.test('installation HMAC is deterministic and secret-dependent', async () => {
  const first = await hmacSha256Hex('a'.repeat(64), 'install|v1|fixture');
  const second = await hmacSha256Hex('a'.repeat(64), 'install|v1|fixture');
  const rotated = await hmacSha256Hex('b'.repeat(64), 'install|v1|fixture');

  assert.match(first, /^[a-f0-9]{64}$/);
  assert.equal(first, second);
  assert.notEqual(first, rotated);
  assert.equal(constantTimeEqual(first, second), true);
  assert.equal(constantTimeEqual(first, rotated), false);
});
