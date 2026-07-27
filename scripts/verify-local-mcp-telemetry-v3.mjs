import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import {
  access,
  mkdir,
  mkdtemp,
  rm,
  unlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  getOrCreateLocalTelemetryInstallationId,
} from '../mcp/local-telemetry-identity.js';
import {
  configureMcpTelemetryContext,
  isTelemetryDisabled,
  logMcpSearchAttempt,
  resetMcpTelemetryForTests,
} from '../mcp/telemetry.js';

const originalFetch = globalThis.fetch;
const originalConfigDir = process.env.SUPERICONS_CONFIG_DIR;
const originalConsoleError = console.error;
const telemetryFlags = [
  'SUPERICONS_DISABLE_TELEMETRY',
  'SUPERICONS_TELEMETRY',
  'SUPERICONS_MCP_TELEMETRY_ENABLED',
  'DO_NOT_TRACK',
];
const originalFlags = Object.fromEntries(
  telemetryFlags.map((name) => [name, process.env[name]]),
);
const roots = [];

function restoreEnvironment() {
  if (originalConfigDir === undefined) delete process.env.SUPERICONS_CONFIG_DIR;
  else process.env.SUPERICONS_CONFIG_DIR = originalConfigDir;
  for (const [name, value] of Object.entries(originalFlags)) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
}

function clearTelemetryFlags() {
  for (const name of telemetryFlags) delete process.env[name];
}

async function makeTempRoot(label) {
  const root = await mkdtemp(join(tmpdir(), `supericons-${label}-`));
  roots.push(root);
  return root;
}

function telemetryInput() {
  return {
    query: 'download arrow',
    resultCount: 8,
    libraryFilter: 'lucide',
    libraryMode: 'strict',
    searchOutcome: 'results',
    toolName: 'search_icons',
    locale: 'en',
    confidenceLabel: 'high',
    betaCohort: null,
    mcpServerVersion: '0.4.24-beta.1',
    latencyMs: 42,
  };
}

try {
  clearTelemetryFlags();

  const persistentRoot = await makeTempRoot('identity');
  const installPath = join(persistentRoot, 'install.json');
  const first = await getOrCreateLocalTelemetryInstallationId({
    filePath: installPath,
  });
  assert.match(first, /^[0-9a-f-]{36}$/);
  for (let restart = 0; restart < 10; restart += 1) {
    assert.equal(
      await getOrCreateLocalTelemetryInstallationId({ filePath: installPath }),
      first,
    );
  }

  const concurrentRoot = await makeTempRoot('concurrent');
  const concurrentPath = join(concurrentRoot, 'install.json');
  const concurrent = await Promise.all([
    getOrCreateLocalTelemetryInstallationId({
      filePath: concurrentPath,
      createUuid: () => '10000000-0000-4000-8000-000000000001',
    }),
    getOrCreateLocalTelemetryInstallationId({
      filePath: concurrentPath,
      createUuid: () => '20000000-0000-4000-8000-000000000002',
    }),
  ]);
  assert.ok(concurrent[0]);
  assert.equal(concurrent[0], concurrent[1]);

  await unlink(installPath);
  const replacement = await getOrCreateLocalTelemetryInstallationId({
    filePath: installPath,
  });
  assert.ok(replacement);
  assert.notEqual(replacement, first);

  const blockedRoot = await makeTempRoot('blocked');
  const parentFile = join(blockedRoot, 'not-a-directory');
  await writeFile(parentFile, 'blocked');
  assert.equal(
    await getOrCreateLocalTelemetryInstallationId({
      filePath: join(parentFile, 'install.json'),
    }),
    null,
  );

  assert.equal(isTelemetryDisabled({ SUPERICONS_DISABLE_TELEMETRY: '1' }), true);
  assert.equal(isTelemetryDisabled({ SUPERICONS_TELEMETRY: 'off' }), true);
  assert.equal(
    isTelemetryDisabled({ SUPERICONS_MCP_TELEMETRY_ENABLED: 'false' }),
    true,
  );
  assert.equal(isTelemetryDisabled({ DO_NOT_TRACK: '1' }), true);
  assert.equal(isTelemetryDisabled({}), false);

  const v3Root = await makeTempRoot('v3');
  process.env.SUPERICONS_CONFIG_DIR = v3Root;
  resetMcpTelemetryForTests();
  configureMcpTelemetryContext({
    getClientVersion: () => ({ name: 'Codex Desktop', version: '1.2.3' }),
  });
  const requests = [];
  globalThis.fetch = async (url, options = {}) => {
    requests.push({
      url: String(url),
      body: options.body ? JSON.parse(String(options.body)) : null,
    });
    return new Response(JSON.stringify({ accepted: true, duplicate: false }), {
      status: 202,
      headers: { 'content-type': 'application/json' },
    });
  };
  await logMcpSearchAttempt(telemetryInput());
  assert.equal(requests.length, 1);
  assert.match(requests[0].url, /\/functions\/v1\/local-mcp-telemetry$/);
  assert.equal(requests[0].body.contract_version, 3);
  assert.equal(requests[0].body.client_family, 'codex_desktop');
  assert.equal(requests[0].body.client_version, '1.2.3');
  assert.match(requests[0].body.install_id, /^[0-9a-f-]{36}$/);
  assert.match(requests[0].body.episode_id, /^[0-9a-f-]{36}$/);
  assert.match(requests[0].body.attempt_id, /^[0-9a-f-]{36}$/);
  assert.equal(
    requests[0].body.recovery_chain_id,
    requests[0].body.episode_id,
  );
  assert.equal('project_path' in requests[0].body, false);

  const fallbackRoot = await makeTempRoot('fallback');
  process.env.SUPERICONS_CONFIG_DIR = fallbackRoot;
  resetMcpTelemetryForTests();
  const fallbackRequests = [];
  globalThis.fetch = async (url, options = {}) => {
    fallbackRequests.push(String(url));
    if (String(url).includes('/functions/v1/local-mcp-telemetry')) {
      return new Response('not found', { status: 404 });
    }
    return new Response(null, { status: 204 });
  };
  await logMcpSearchAttempt(telemetryInput());
  assert.equal(fallbackRequests.length, 2);
  assert.match(
    fallbackRequests[1],
    /\/rest\/v1\/rpc\/si_log_mcp_search_outcome_v2$/,
  );

  const noFallbackRoot = await makeTempRoot('no-fallback');
  process.env.SUPERICONS_CONFIG_DIR = noFallbackRoot;
  resetMcpTelemetryForTests();
  const noFallbackRequests = [];
  globalThis.fetch = async (url) => {
    noFallbackRequests.push(String(url));
    return new Response('temporary failure', { status: 503 });
  };
  console.error = () => {};
  await logMcpSearchAttempt(telemetryInput());
  assert.equal(noFallbackRequests.length, 1);

  const unknownDeliveryRoot = await makeTempRoot('unknown-delivery');
  process.env.SUPERICONS_CONFIG_DIR = unknownDeliveryRoot;
  resetMcpTelemetryForTests();
  const unknownDeliveryRequests = [];
  globalThis.fetch = async (url) => {
    unknownDeliveryRequests.push(String(url));
    throw new DOMException('timeout', 'AbortError');
  };
  await logMcpSearchAttempt(telemetryInput());
  assert.equal(unknownDeliveryRequests.length, 1);

  const disabledRoot = await makeTempRoot('disabled');
  process.env.SUPERICONS_CONFIG_DIR = disabledRoot;
  process.env.SUPERICONS_DISABLE_TELEMETRY = '1';
  resetMcpTelemetryForTests();
  let disabledFetches = 0;
  globalThis.fetch = async () => {
    disabledFetches += 1;
    return new Response(null, { status: 204 });
  };
  await logMcpSearchAttempt(telemetryInput());
  assert.equal(disabledFetches, 0);
  await assert.rejects(access(join(disabledRoot, 'install.json')));

  console.log(JSON.stringify({
    status: 'passed',
    stable_restarts: 10,
    concurrent_identity_shared: true,
    deletion_resets_identity: true,
    unwritable_path_nonblocking: true,
    opt_out_controls: 4,
    v3_fields_present: true,
    fallback_on_404_only: true,
    no_fallback_on_5xx: true,
    no_fallback_on_unknown_delivery: true,
    disabled_telemetry_creates_no_identity: true,
  }));
} finally {
  globalThis.fetch = originalFetch;
  console.error = originalConsoleError;
  restoreEnvironment();
  resetMcpTelemetryForTests();
  await Promise.all(roots.map((root) => rm(root, { recursive: true, force: true })));
}
