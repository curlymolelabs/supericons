import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const repoRoot = resolve(import.meta.dirname, '..');
const mcpDir = join(repoRoot, 'mcp');
const tempRoot = mkdtempSync(join(tmpdir(), 'search-v2-tool-scoped-package-'));
const packDir = join(tempRoot, 'pack');
const installDir = join(tempRoot, 'install');
const args = process.argv.slice(2);
mkdirSync(packDir, { recursive: true });
mkdirSync(installDir, { recursive: true });
let client;
let transport;

function getArgument(name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : null;
}

function countFiles(root) {
  return readdirSync(root, { withFileTypes: true }).reduce(
    (total, entry) => total + (entry.isDirectory() ? countFiles(join(root, entry.name)) : 1),
    0,
  );
}

function runNpm(args, cwd) {
  const npmExecPath = process.env.npm_execpath
    || join(dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js');
  assert.equal(existsSync(npmExecPath), true, 'npm CLI entry point was not found.');
  return execFileSync(process.execPath, [npmExecPath, ...args], {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

try {
  const packageSpec = getArgument('--package-spec');
  let tarballPath;
  if (packageSpec) {
    tarballPath = resolve(packageSpec);
    assert.equal(existsSync(tarballPath), true, `Package archive not found: ${tarballPath}`);
  } else {
    const packOutput = runNpm([
      'pack',
      '--json',
      '--ignore-scripts',
      '--pack-destination',
      packDir,
    ], mcpDir);
    const [packRecord] = JSON.parse(packOutput);
    tarballPath = join(packDir, packRecord.filename);
  }

  writeFileSync(join(installDir, 'package.json'), JSON.stringify({
    name: 'search-v2-tool-scoped-package-check',
    private: true,
    type: 'module',
  }, null, 2));
  runNpm(['install', '--ignore-scripts', tarballPath], installDir);

  const installedRoot = join(installDir, 'node_modules', '@supericons', 'mcp');
  for (const required of [
    'controlled-run-auth.js',
    'hosted-search-client.js',
    'index.js',
    'material-mcp-assets.json.gz',
    'material-mcp-assets-manifest.json',
    'public/synonyms.json',
    'recommend-icons.js',
    'release-channel.js',
    'remote-server.js',
    'search-query-normalization.js',
    'telemetry.js',
  ]) {
    assert.equal(existsSync(join(installedRoot, required)), true, `Package is missing ${required}.`);
  }
  const installedPackage = JSON.parse(readFileSync(join(installedRoot, 'package.json'), 'utf8'));
  assert.equal(installedPackage.version, '0.4.22');
  const installedServer = JSON.parse(readFileSync(join(installedRoot, 'server.json'), 'utf8'));
  assert.equal(installedServer.version, installedPackage.version);
  assert.equal(installedServer.packages[0].version, installedPackage.version);

  const release = await import(
    `${pathToFileURL(join(installedRoot, 'release-channel.js')).href}?check=${Date.now()}`
  );
  assert.equal(
    release.getHostedSearchFunctionNameForTool(installedPackage.version, 'search_icons'),
    'mcp-search',
  );
  assert.equal(
    release.getHostedSearchFunctionNameForTool(installedPackage.version, 'recommend_icons'),
    'mcp-search',
  );
  assert.equal(release.getBetaCohortForTool(installedPackage.version, 'recommend_icons'), null);
  assert.equal(release.shouldUseLocalFirstSearch(installedPackage.version, {
    toolName: 'search_icons',
    query: 'settings',
  }), true);
  assert.equal(release.shouldUseLocalFirstSearch(installedPackage.version, {
    toolName: 'search_icons',
    query: '设置',
    locale: 'zh-Hans',
  }), true);
  assert.equal(release.shouldUseLocalFirstSearch(installedPackage.version, {
    toolName: 'recommend_icons',
    query: 'application settings',
  }), true);

  const installedTelemetry = readFileSync(join(installedRoot, 'telemetry.js'), 'utf8');
  const installedIndex = readFileSync(join(installedRoot, 'index.js'), 'utf8');
  assert.match(installedTelemetry, /si_log_mcp_search_outcome_v2/);
  assert.match(installedTelemetry, /p_latency_ms/);
  assert.match(installedIndex, /toolName:\s*'recommend_icons'/);
  assert.match(installedIndex, /latencyMs:\s*performance\.now\(\) - toolStartedAt/);

  const { searchIcons } = await import(
    `${pathToFileURL(join(installedRoot, 'search.js')).href}?quality=${Date.now()}`
  );
  const evaluationSet = JSON.parse(readFileSync(
    join(repoRoot, 'data', 'semantic-search-v2', 'evaluation-set.json'),
    'utf8',
  ));
  const installedIcons = JSON.parse(readFileSync(
    join(installedRoot, 'public', 'icon-index.json'),
    'utf8',
  )).icons;
  const installedSynonyms = JSON.parse(readFileSync(
    join(installedRoot, 'public', 'synonyms.json'),
    'utf8',
  ));
  const observations = evaluationSet.query_groups.flatMap((group) => group.queries || [])
    .map((entry) => {
      const query = String(entry.query || entry.slot || entry.task || '').trim();
      const results = searchIcons(query, installedIcons, installedSynonyms, {
        library: entry.requested_library || null,
        libraryMode: entry.library_mode || 'all',
        limit: 8,
      });
      return {
        case_id: entry.case_id,
        result_refs: results.map((icon) => `${icon.lib}:${icon.id}`),
      };
    });
  const installedFingerprint = createHash('sha256')
    .update(JSON.stringify(observations))
    .digest('hex');
  assert.equal(
    installedFingerprint,
    '84a5e8b3c1b4e31e25cc865b37f397effb6c6c4c820b98706995012b8b80e3ff',
    'Clean-installed package changed the fixed search fingerprint.',
  );
  const routeExpectedObservations = evaluationSet.query_groups.flatMap((group) => group.queries || [])
    .map((entry) => {
      const query = String(entry.query || entry.slot || entry.task || '').trim();
      const results = searchIcons(query, installedIcons, installedSynonyms, {
        library: entry.requested_library || null,
        libraryMode: entry.library_mode || 'all',
        locale: entry.locale || null,
        limit: 8,
      });
      return {
        case_id: entry.case_id,
        result_refs: results.map((icon) => `${icon.lib}:${icon.id}`),
      };
    });

  const sdkBase = join(
    installDir,
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
  client = new Client({ name: 'search-v2-route-package-check', version: '1.0.0' });
  await client.connect(transport);

  const eligibleCases = evaluationSet.query_groups.flatMap((group) => group.queries || [])
    .filter((entry) => {
      const query = String(entry.query || entry.slot || entry.task || '').trim();
      return release.shouldUseLocalFirstSearch(installedPackage.version, {
        toolName: 'search_icons',
        query,
        locale: entry.locale || null,
      });
    });
  assert.equal(eligibleCases.length, routeExpectedObservations.length);

  const helperByCase = new Map(routeExpectedObservations.map((entry) => [entry.case_id, entry.result_refs]));
  const routeObservations = [];
  for (const entry of eligibleCases) {
    const query = String(entry.query || entry.slot || entry.task || '').trim();
    const result = await client.callTool({
      name: 'search_icons',
      arguments: {
        query,
        ...(entry.requested_library ? { library: entry.requested_library } : {}),
        library_mode: entry.library_mode || 'all',
        ...(entry.locale ? { locale: entry.locale } : {}),
        limit: 8,
      },
    });
    const text = result?.content?.find((content) => content?.type === 'text')?.text;
    assert.equal(typeof text, 'string', `${entry.case_id} returned no text payload.`);
    const payload = JSON.parse(text);
    assert.equal(
      payload.search_runtime?.mode,
      'local_first',
      `${entry.case_id} did not use the installed local-first route.`,
    );
    const routeRefs = (payload.results || []).map((icon) => `${icon.library}:${icon.id}`);
    assert.deepEqual(
      routeRefs,
      helperByCase.get(entry.case_id),
      `${entry.case_id} changed the approved ordered result references.`,
    );
    routeObservations.push({ case_id: entry.case_id, result_refs: routeRefs });
  }
  const routeFingerprint = createHash('sha256')
    .update(JSON.stringify(routeObservations))
    .digest('hex');
  assert.equal(
    routeFingerprint,
    'c447744c04d2d7628959f685090b95159f912c5ca74ce3ec950d0c3175f89f44',
    'Clean-installed stdio route changed the 225-case ordered result contract.',
  );

  console.log(JSON.stringify({
    status: 'ok',
    package: installedPackage.name,
    version: installedPackage.version,
    packed_files: countFiles(installedRoot),
    package_spec: packageSpec ? tarballPath : 'source_pack',
    clean_install: true,
    search_route: 'local_first_all_supported_locales',
    localized_search_route: 'local_first',
    recommendation_route: 'local_first',
    recommendation_beta_cohort: null,
    latency_rpc: 'si_log_mcp_search_outcome_v2',
    fixed_search_fingerprint: installedFingerprint,
    eligible_stdio_cases: routeObservations.length,
    stdio_route_fingerprint: routeFingerprint,
    stdio_ordered_result_parity: true,
    published: false,
  }, null, 2));
} finally {
  if (transport) await transport.close().catch(() => {});
  void client;
  rmSync(tempRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
