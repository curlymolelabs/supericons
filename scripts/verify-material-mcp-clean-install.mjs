import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const mcpDir = join(rootDir, 'mcp');
const tempDir = mkdtempSync(join(tmpdir(), 'supericons-material-mcp-'));
const installDir = join(tempDir, 'install');

function runNpm(args, cwd) {
  if (process.platform === 'win32') {
    return execFileSync(
      process.env.ComSpec,
      ['/d', '/s', '/c', `npm ${args.join(' ')}`],
      { cwd, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 },
    );
  }
  return execFileSync('npm', args, {
    cwd,
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
  });
}

function parseToolPayload(result, toolName) {
  const text = result?.content?.find((entry) => entry?.type === 'text')?.text;
  assert.equal(typeof text, 'string', `${toolName} did not return text content`);
  return JSON.parse(text);
}

let client;
let transport;
try {
  const pack = JSON.parse(runNpm([
    'pack', '--json', '--pack-destination', tempDir,
  ], mcpDir))[0];
  const tarballPath = join(tempDir, pack.filename);
  runNpm([
    'install', '--ignore-scripts', '--no-audit', '--no-fund',
    '--prefix', installDir, tarballPath,
  ], tempDir);

  const installedPackageDir = join(installDir, 'node_modules', '@supericons', 'mcp');
  const installedPackage = JSON.parse(readFileSync(
    join(installedPackageDir, 'package.json'),
    'utf8',
  ));
  assert.equal(installedPackage.version, '0.4.19-beta.2');
  const installedIndex = JSON.parse(readFileSync(
    join(installedPackageDir, 'public', 'icon-index.json'),
    'utf8',
  ));
  assert.equal(installedIndex.icons.filter((icon) => icon.lib === 'material').length, 4262);
  assert.ok(readFileSync(join(installedPackageDir, 'material-mcp-assets.json.gz')).length > 0);
  assert.equal(JSON.parse(readFileSync(
    join(installedPackageDir, 'material-mcp-assets-manifest.json'),
    'utf8',
  )).asset_count, 8524);

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
    args: [join(installedPackageDir, 'index.js')],
    cwd: installedPackageDir,
    env: {
      ...process.env,
      SUPERICONS_API_KEY: '',
      SUPERICONS_DISABLE_TELEMETRY: '1',
      SUPERICONS_MCP_LOG_STARTUP: '0',
    },
    stderr: 'pipe',
  });
  client = new Client({ name: 'material-clean-install-verifier', version: '1.0.0' });
  await client.connect(transport);

  const libraries = parseToolPayload(await client.callTool({
    name: 'list_libraries',
    arguments: {},
  }), 'list_libraries');
  const materialLibrary = libraries.find((library) => library.id === 'material');
  assert.deepEqual(materialLibrary.supportedStyles, ['outline', 'solid']);
  assert.equal(materialLibrary.count, 4262);
  assert.equal(materialLibrary.outlineCount, 4262);
  assert.equal(materialLibrary.solidCount, 4262);

  const localSearch = parseToolPayload(await client.callTool({
    name: 'search_icons',
    arguments: {
      query: 'settings',
      library_mode: 'all',
      style: 'outline',
      limit: 8,
    },
  }), 'search_icons local-first');
  assert.ok(Array.isArray(localSearch.results) && localSearch.results.length > 0);
  assert.equal(localSearch.search_runtime?.mode, 'local_first');
  assert.equal(
    localSearch.search_runtime?.index_generated_at,
    installedIndex.generatedAt,
  );

  const outline = parseToolPayload(await client.callTool({
    name: 'get_icon',
    arguments: { id: 'settings', library: 'material', style: 'outline' },
  }), 'get_icon outline');
  const solid = parseToolPayload(await client.callTool({
    name: 'get_icon',
    arguments: { id: 'settings', library: 'material', style: 'solid' },
  }), 'get_icon solid');
  for (const [variant, icon] of [['outline', outline], ['solid', solid]]) {
    assert.equal(icon.library, 'material');
    assert.equal(icon.style, variant);
    assert.match(icon.svg, /^<svg\b/);
    assert.equal(icon.type, 'svg');
    assert.equal(icon.svgSource, 'owned-material-cache:bundle');
  }

  console.log(JSON.stringify({
    status: 'ok',
    clean_install_material_ids: 4262,
    package_version: installedPackage.version,
    list_libraries_truthful: true,
    exact_outline_svg: true,
    exact_solid_svg: true,
    local_first_search: true,
    snapshot_source: outline.svgSource,
  }, null, 2));
} finally {
  if (transport) await transport.close().catch(() => {});
  void client;
  rmSync(tempDir, { recursive: true, force: true });
}
