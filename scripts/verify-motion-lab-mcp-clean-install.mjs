import { execSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(__dirname);
const mcpDir = join(repoRoot, 'mcp');
const npmExecPath = process.env.npm_execpath || null;

function run(command, args, cwd) {
  const escapedCommand = `"${String(command).replace(/"/g, '\\"')}"`;
  const escapedArgs = args.map((arg) => {
    const text = String(arg);
    return `"${text.replace(/"/g, '\\"')}"`;
  });
  return execSync([escapedCommand, ...escapedArgs].join(' '), {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: true,
  });
}

function runNpm(args, cwd) {
  if (npmExecPath) {
    return run(process.execPath, [npmExecPath, ...args], cwd);
  }
  return run('npm', args, cwd);
}

const tempRoot = mkdtempSync(join(tmpdir(), 'motion-lab-mcp-clean-install-'));
const packDir = join(tempRoot, 'pack');
const installDir = join(tempRoot, 'install');
mkdirSync(packDir, { recursive: true });
mkdirSync(installDir, { recursive: true });

try {
  run(process.execPath, [join(repoRoot, 'scripts', 'build-motion-lab-mcp-artifacts.mjs')], repoRoot);

  const packRaw = runNpm(['pack', '--json', '--pack-destination', packDir], mcpDir);
  const packInfo = JSON.parse(packRaw);
  const packEntry = Array.isArray(packInfo) ? packInfo[0] : packInfo;
  const tarballPath = join(packDir, packEntry.filename);

  writeFileSync(join(installDir, 'package.json'), JSON.stringify({
    name: 'motion-lab-mcp-clean-install-smoke',
    private: true,
    type: 'module',
  }, null, 2));

  runNpm(['install', tarballPath], installDir);

  const installedRoot = join(installDir, 'node_modules', 'supericons-mcp');
  const motionLabModule = await import(pathToFileURL(join(installedRoot, 'motion-lab.js')).href);
  const motionLabClientModule = await import(pathToFileURL(join(installedRoot, 'motion-lab-client.js')).href);

  const presets = motionLabModule.listMotionLabPresets();
  if (!Array.isArray(presets) || presets.length !== 80) {
    throw new Error(`Expected 80 Motion Lab presets from clean install, received ${Array.isArray(presets) ? presets.length : 'non-array'}.`);
  }

  const first = presets[0];
  const keys = Object.keys(first).sort();
  const expectedKeys = ['description', 'group', 'label', 'preset', 'supported_triggers'];
  if (JSON.stringify(keys) !== JSON.stringify(expectedKeys)) {
    throw new Error(`Unexpected clean-install preset shape: ${keys.join(', ')}`);
  }

  if (typeof motionLabClientModule.getMotionLabRecipeHosted !== 'function') {
    throw new Error('Motion Lab hosted client did not export getMotionLabRecipeHosted.');
  }

  console.log(`Motion Lab clean-install smoke verified: ${presets.length} baseline presets and hosted client imports cleanly.`);
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}
