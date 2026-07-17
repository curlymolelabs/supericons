import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const repoRoot = resolve(import.meta.dirname, '..');
const evaluationSet = JSON.parse(readFileSync(
  join(repoRoot, 'data', 'semantic-search-v2', 'evaluation-set.json'),
  'utf8',
));
const args = process.argv.slice(2);

function getArgument(name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : null;
}

function runNpm(npmArgs, cwd) {
  const npmExecPath = process.env.npm_execpath
    || join(dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js');
  assert.ok(existsSync(npmExecPath), 'npm CLI entry point was not found.');
  return execFileSync(process.execPath, [npmExecPath, ...npmArgs], {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function parseToolPayload(result) {
  const text = result?.content?.find((entry) => entry?.type === 'text')?.text;
  assert.equal(typeof text, 'string', 'MCP tool returned no text payload.');
  return JSON.parse(text);
}

const packageSpec = getArgument('--package-spec');
const expectedVersion = getArgument('--expected-version');
const expectedRouteFingerprint = getArgument('--expected-route-fingerprint');
const injectHostedCall = args.includes('--inject-hosted-call');
assert.ok(packageSpec, '--package-spec is required.');
assert.ok(expectedVersion, '--expected-version is required.');
assert.match(expectedRouteFingerprint || '', /^[a-f0-9]{64}$/);

const temporaryRoot = mkdtempSync(join(tmpdir(), 'search-v2-published-smoke-'));
const hostedCallCounterPath = join(temporaryRoot, 'hosted-calls.jsonl');
const networkInterceptorPath = join(temporaryRoot, 'network-interceptor.mjs');
let client;
let transport;

function readHostedCallCount() {
  if (!existsSync(hostedCallCounterPath)) return 0;
  return readFileSync(hostedCallCounterPath, 'utf8')
    .split(/\r?\n/)
    .filter(Boolean)
    .length;
}

function assertNoHostedCalls() {
  assert.equal(
    readHostedCallCount(),
    0,
    'Hosted calls were observed during the local-first published-package smoke.',
  );
}

try {
  runNpm([
    'install',
    '--ignore-scripts',
    '--no-audit',
    '--no-fund',
    packageSpec,
  ], temporaryRoot);

  const installedRoot = join(temporaryRoot, 'node_modules', '@supericons', 'mcp');
  const installedPackage = JSON.parse(readFileSync(join(installedRoot, 'package.json'), 'utf8'));
  assert.equal(installedPackage.version, expectedVersion);

  writeFileSync(networkInterceptorPath, `
import { appendFileSync } from 'node:fs';

const counterPath = process.env.SUPERICONS_HOSTED_CALL_COUNTER_FILE;
globalThis.fetch = async function observedFetch(input, init = {}) {
  const url = typeof input === 'string' ? input : input?.url || String(input);
  appendFileSync(counterPath, JSON.stringify({
    method: init.method || input?.method || 'GET',
    url,
  }) + '\\n');
  return new Response(JSON.stringify({ error: 'blocked_by_local_first_smoke' }), {
    status: 503,
    headers: { 'content-type': 'application/json' },
  });
};
`, 'utf8');

  const interceptorOption = `--import=${pathToFileURL(networkInterceptorPath).href}`;
  const childEnvironment = {
    ...process.env,
    NODE_OPTIONS: [process.env.NODE_OPTIONS, interceptorOption].filter(Boolean).join(' '),
    SUPERICONS_API_KEY: '',
    SUPERICONS_DISABLE_TELEMETRY: '1',
    SUPERICONS_HOSTED_CALL_COUNTER_FILE: hostedCallCounterPath,
    SUPERICONS_MATERIAL_SNAPSHOT_URL: 'https://supericons-smoke.invalid/material',
    SUPERICONS_MCP_SEARCH_URL: 'https://supericons-smoke.invalid/search',
    SUPERICONS_SEARCH_ENGINE_URL: 'https://supericons-smoke.invalid/search-engine',
    SUPERICONS_SUPABASE_URL: 'https://supericons-smoke.invalid',
    SUPERICONS_MCP_LOG_STARTUP: '0',
  };

  const release = await import(pathToFileURL(join(installedRoot, 'release-channel.js')).href);
  const sdkBase = join(
    temporaryRoot,
    'node_modules',
    '@modelcontextprotocol',
    'sdk',
    'dist',
    'esm',
    'client',
  );
  const { Client } = await import(pathToFileURL(join(sdkBase, 'index.js')).href);
  const { StdioClientTransport } = await import(pathToFileURL(join(sdkBase, 'stdio.js')).href);
  transport = new StdioClientTransport({
    command: process.execPath,
    args: [join(installedRoot, 'index.js')],
    cwd: installedRoot,
    env: childEnvironment,
    stderr: 'pipe',
  });
  client = new Client({ name: 'search-v2-published-smoke', version: '1.0.0' });
  await client.connect(transport);

  if (injectHostedCall) {
    execFileSync(process.execPath, [
      '-e',
      "fetch('https://supericons-smoke.invalid/negative-probe')",
    ], {
      env: childEnvironment,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    assertNoHostedCalls();
  }

  const eligibleCases = evaluationSet.query_groups.flatMap((group) => group.queries || [])
    .filter((entry) => {
      const query = String(entry.query || entry.slot || entry.task || '').trim();
      return release.shouldUseLocalFirstBetaSearch(installedPackage.version, {
        toolName: 'search_icons',
        query,
        locale: entry.locale || null,
      });
    });
  assert.equal(eligibleCases.length, 150);

  const routeObservations = [];
  for (const entry of eligibleCases) {
    const query = String(entry.query || entry.slot || entry.task || '').trim();
    const result = await client.callTool({
      name: 'search_icons',
      arguments: {
        query,
        ...(entry.requested_library ? { library: entry.requested_library } : {}),
        library_mode: entry.library_mode || 'all',
        limit: 8,
      },
    });
    const payload = parseToolPayload(result);
    assert.equal(payload.search_runtime?.mode, 'local_first');
    routeObservations.push({
      case_id: entry.case_id,
      result_refs: (payload.results || []).map((icon) => `${icon.library}:${icon.id}`),
    });
  }

  const routeFingerprint = createHash('sha256')
    .update(JSON.stringify(routeObservations))
    .digest('hex');
  assert.equal(routeFingerprint, expectedRouteFingerprint);

  const materialChecks = [];
  for (const style of ['outline', 'solid']) {
    const result = await client.callTool({
      name: 'search_icons',
      arguments: {
        query: 'settings',
        library: 'material',
        library_mode: 'strict',
        style,
        limit: 3,
      },
    });
    const payload = parseToolPayload(result);
    assert.equal(payload.search_runtime?.mode, 'local_first');
    assert.equal(payload.results?.length, 3);
    assert.ok(payload.results.every((icon) => icon.library === 'material'));
    assert.ok(payload.results.every((icon) => icon.style === style));
    assert.ok(payload.results.every((icon) => typeof icon.svg === 'string' && icon.svg.includes('<svg')));
    materialChecks.push({ style, result_count: payload.results.length });
  }

  assertNoHostedCalls();
  const hostedCallsObserved = readHostedCallCount();

  console.log(JSON.stringify({
    status: 'ok',
    package: installedPackage.name,
    version: installedPackage.version,
    eligible_stdio_cases: routeObservations.length,
    stdio_route_fingerprint: routeFingerprint,
    material_checks: materialChecks,
    telemetry_disabled: true,
    hosted_calls: hostedCallsObserved,
  }, null, 2));
} finally {
  if (transport) await transport.close().catch(() => {});
  void client;
  rmSync(temporaryRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
