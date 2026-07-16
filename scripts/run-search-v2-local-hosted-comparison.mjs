import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { SUPABASE_ANON } from '../mcp/auth.js';

const repoRoot = resolve(import.meta.dirname, '..');
const defaultManifestPath = join(
  repoRoot,
  'docs',
  'si-v2',
  'search',
  'reviews',
  'search-v2-local-first-beta-publication-authorization-manifest-2026-07-16.json',
);
const args = process.argv.slice(2);

function getArgument(name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : null;
}

function normalizeText(value) {
  return value.replace(/\r\n?/g, '\n');
}

function sha256Text(value) {
  return createHash('sha256').update(normalizeText(value)).digest('hex');
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
  assert.equal(typeof text, 'string', 'Local MCP tool returned no text payload.');
  return JSON.parse(text);
}

function resultRefs(payload) {
  return (payload?.results || []).map((icon) => `${icon.library}:${icon.id}`);
}

function overlapCount(left, right) {
  const rightSet = new Set(right);
  return left.filter((value) => rightSet.has(value)).length;
}

const manifestPath = resolve(getArgument('--manifest') || defaultManifestPath);
const manifestText = readFileSync(manifestPath, 'utf8');
const manifestFingerprint = sha256Text(manifestText);
const manifest = JSON.parse(manifestText);
const approvedFingerprint = getArgument('--execute-approved');
const caseIds = manifest.hosted_comparison.case_ids;

assert.equal(manifest.hosted_comparison.maximum_requests, 50);
assert.equal(manifest.hosted_comparison.maximum_concurrency, 1);
assert.equal(manifest.hosted_comparison.maximum_retries, 0);
assert.equal(caseIds.length, 50);
assert.equal(new Set(caseIds).size, 50);

if (!approvedFingerprint) {
  console.log(JSON.stringify({
    status: 'plan_only',
    manifest_sha256: manifestFingerprint,
    hosted_endpoint: manifest.hosted_comparison.endpoint,
    sanitized_fixed_cases: caseIds.length,
    maximum_requests: manifest.hosted_comparison.maximum_requests,
    maximum_concurrency: manifest.hosted_comparison.maximum_concurrency,
    maximum_retries: manifest.hosted_comparison.maximum_retries,
    network_calls_made: 0,
  }, null, 2));
  process.exit(0);
}

assert.equal(
  approvedFingerprint,
  manifestFingerprint,
  'The supplied owner approval fingerprint does not match the current manifest.',
);

const evaluationSet = JSON.parse(readFileSync(
  join(repoRoot, 'data', 'semantic-search-v2', 'evaluation-set.json'),
  'utf8',
));
const byCaseId = new Map(
  evaluationSet.query_groups
    .flatMap((group) => group.queries || [])
    .map((entry) => [entry.case_id, entry]),
);
const selectedCases = caseIds.map((caseId) => {
  const entry = byCaseId.get(caseId);
  assert.ok(entry, `Comparison case is missing: ${caseId}`);
  const query = String(entry.query || entry.slot || entry.task || '').trim();
  assert.ok(query && !entry.locale && !/[^\x00-\x7f]/.test(query));
  return { ...entry, query };
});

const archivePath = isAbsolute(manifest.package.archive_path)
  ? manifest.package.archive_path
  : join(repoRoot, manifest.package.archive_path);
const evidencePath = isAbsolute(manifest.hosted_comparison.evidence_output)
  ? manifest.hosted_comparison.evidence_output
  : join(repoRoot, manifest.hosted_comparison.evidence_output);
const temporaryRoot = mkdtempSync(join(tmpdir(), 'search-v2-local-hosted-comparison-'));
let client;
let transport;
let requestCount = 0;

try {
  runNpm([
    'install',
    '--ignore-scripts',
    '--no-audit',
    '--no-fund',
    archivePath,
  ], temporaryRoot);
  const installedRoot = join(temporaryRoot, 'node_modules', '@supericons', 'mcp');
  const installedPackage = JSON.parse(readFileSync(join(installedRoot, 'package.json'), 'utf8'));
  assert.equal(installedPackage.version, manifest.package.version);

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
    env: {
      ...process.env,
      SUPERICONS_API_KEY: '',
      SUPERICONS_DISABLE_TELEMETRY: '1',
      SUPERICONS_MCP_LOG_STARTUP: '0',
    },
    stderr: 'pipe',
  });
  client = new Client({ name: 'search-v2-local-hosted-comparison', version: '1.0.0' });
  await client.connect(transport);

  const observations = [];
  for (const entry of selectedCases) {
    const toolArguments = {
      query: entry.query,
      ...(entry.requested_library ? { library: entry.requested_library } : {}),
      library_mode: entry.library_mode || 'all',
      limit: 8,
    };
    const localResult = await client.callTool({
      name: 'search_icons',
      arguments: toolArguments,
    });
    const localPayload = parseToolPayload(localResult);
    assert.equal(localPayload.search_runtime?.mode, 'local_first');

    requestCount += 1;
    assert.ok(requestCount <= manifest.hosted_comparison.maximum_requests);
    const response = await fetch(manifest.hosted_comparison.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON,
      },
      body: JSON.stringify({
        query: entry.query,
        library: entry.requested_library || null,
        library_mode: entry.library_mode || 'all',
        limit: 8,
        style: 'any',
        locale: null,
        source: 'internal',
        channel: 'local_mcp',
        environment: 'preview',
        client_family: 'search_v2_local_hosted_comparison',
        tool_name: 'search_icons',
        request_id: `comparison-${entry.case_id}`,
        mcp_server_version: manifest.package.version,
      }),
      signal: AbortSignal.timeout(manifest.hosted_comparison.request_timeout_ms),
    });
    assert.ok(response.ok, `Hosted comparison failed for ${entry.case_id} with ${response.status}.`);
    const hostedPayload = await response.json();
    const localRefs = resultRefs(localPayload);
    const hostedRefs = resultRefs(hostedPayload);
    observations.push({
      case_id: entry.case_id,
      local_result_refs: localRefs,
      hosted_result_refs: hostedRefs,
      exact_order_match: JSON.stringify(localRefs) === JSON.stringify(hostedRefs),
      top_result_match: (localRefs[0] || null) === (hostedRefs[0] || null),
      top_eight_overlap_count: overlapCount(localRefs, hostedRefs),
    });
  }

  const report = {
    schema_version: 1,
    status: 'ok',
    manifest_sha256: manifestFingerprint,
    package_version: manifest.package.version,
    stable_hosted_requests: requestCount,
    retries: 0,
    concurrency: 1,
    exact_order_matches: observations.filter((entry) => entry.exact_order_match).length,
    top_result_matches: observations.filter((entry) => entry.top_result_match).length,
    observations,
  };
  mkdirSync(dirname(evidencePath), { recursive: true });
  writeFileSync(evidencePath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(report, null, 2));
} finally {
  if (transport) await transport.close().catch(() => {});
  void client;
  rmSync(temporaryRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
