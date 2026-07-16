import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const repoRoot = process.cwd();
const mcpDir = join(repoRoot, 'mcp');
const tempRoot = mkdtempSync(join(tmpdir(), 'search-v2-tool-scoped-package-'));
const packDir = join(tempRoot, 'pack');
const installDir = join(tempRoot, 'install');
mkdirSync(packDir, { recursive: true });
mkdirSync(installDir, { recursive: true });

function runNpm(args, cwd) {
  const npmExecPath = process.env.npm_execpath;
  const command = npmExecPath ? process.execPath : 'npm';
  const commandArgs = npmExecPath ? [npmExecPath, ...args] : args;
  return execFileSync(command, commandArgs, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: !npmExecPath && process.platform === 'win32',
  });
}

try {
  const packOutput = runNpm([
    'pack',
    '--json',
    '--ignore-scripts',
    '--pack-destination',
    packDir,
  ], mcpDir);
  const [packRecord] = JSON.parse(packOutput);
  const packedPaths = new Set(packRecord.files.map((entry) => entry.path));
  for (const required of [
    'hosted-search-client.js',
    'index.js',
    'material-mcp-assets.json.gz',
    'material-mcp-assets-manifest.json',
    'public/synonyms.json',
    'recommend-icons.js',
    'release-channel.js',
    'remote-server.js',
    'telemetry.js',
  ]) {
    assert.equal(packedPaths.has(required), true, `Package is missing ${required}.`);
  }

  writeFileSync(join(installDir, 'package.json'), JSON.stringify({
    name: 'search-v2-tool-scoped-package-check',
    private: true,
    type: 'module',
  }, null, 2));
  const tarballPath = join(packDir, packRecord.filename);
  runNpm(['install', '--ignore-scripts', tarballPath], installDir);

  const installedRoot = join(installDir, 'node_modules', '@supericons', 'mcp');
  const installedPackage = JSON.parse(readFileSync(join(installedRoot, 'package.json'), 'utf8'));
  assert.equal(installedPackage.version, '0.4.19-beta.0');
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
  assert.equal(release.shouldUseLocalFirstBetaSearch(installedPackage.version, {
    toolName: 'search_icons',
    query: 'settings',
  }), true);
  assert.equal(release.shouldUseLocalFirstBetaSearch(installedPackage.version, {
    toolName: 'search_icons',
    query: '设置',
  }), false);

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
    'ef2934097555867d1695e9861f35c346132f6c33ec9899c602635ce12aba76c8',
    'Clean-installed package changed the fixed search fingerprint.',
  );

  console.log(JSON.stringify({
    status: 'ok',
    package: installedPackage.name,
    version: installedPackage.version,
    packed_files: packRecord.files.length,
    clean_install: true,
    search_route: 'local_first_english',
    localized_search_route: 'mcp-search',
    recommendation_route: 'mcp-search',
    recommendation_beta_cohort: null,
    latency_rpc: 'si_log_mcp_search_outcome_v2',
    fixed_search_fingerprint: installedFingerprint,
    published: false,
  }, null, 2));
} finally {
  rmSync(tempRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
