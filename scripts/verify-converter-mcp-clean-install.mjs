import { execSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(__dirname);
const mcpDir = join(repoRoot, 'mcp');
const npmExecPath = process.env.npm_execpath || null;

const SVG_FIXTURE = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><rect x="2" y="2" width="12" height="12" fill="#111111"/></svg>';
const PNG_BASE64_FIXTURE = 'iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAEklEQVR4nGNkYGD4D8RwQIYAAJpUBAFJRvoGAAAAAElFTkSuQmCC';

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

const tempRoot = mkdtempSync(join(tmpdir(), 'converter-mcp-clean-install-'));
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
    name: 'converter-mcp-clean-install-smoke',
    private: true,
    type: 'module',
  }, null, 2));

  runNpm(['install', tarballPath], installDir);

  const installedRoot = join(installDir, 'node_modules', '@supericons', 'mcp');
  const converterModule = await import(pathToFileURL(join(installedRoot, 'converter.js')).href);

  if (typeof converterModule.getConverterMcpOptions !== 'function') {
    throw new Error('Converter module did not export getConverterMcpOptions.');
  }
  if (typeof converterModule.inspectConverterInput !== 'function') {
    throw new Error('Converter module did not export inspectConverterInput.');
  }
  if (typeof converterModule.convertSvgToPng !== 'function') {
    throw new Error('Converter module did not export convertSvgToPng.');
  }
  if (typeof converterModule.convertPngToSvg !== 'function') {
    throw new Error('Converter module did not export convertPngToSvg.');
  }

  const options = converterModule.getConverterMcpOptions();
  if (!options?.proOnly || !Array.isArray(options?.pngToSvg?.traceClasses) || !Array.isArray(options?.svgToPng?.backgrounds)) {
    throw new Error('Unexpected converter options shape from clean install.');
  }
  if (!Array.isArray(options?.workflow?.recommendedOrder) || !options.workflow.recommendedOrder.includes('inspect_converter_input')) {
    throw new Error('Converter options did not include workflow guidance.');
  }
  if (!Array.isArray(options?.pngToSvg?.starterCombinations) || options.pngToSvg.starterCombinations.length < 6) {
    throw new Error('Converter options did not include the full starter combinations set.');
  }
  const starterLabels = new Set(options.pngToSvg.starterCombinations.map((entry) => entry?.label));
  for (const label of [
    'Safe full-color default',
    'Flat logo pass',
    'Tiny interface icon',
    'Single-color wordmark or brand mark',
    'Small colored icon or badge',
    'High-contrast mask or silhouette',
  ]) {
    if (!starterLabels.has(label)) {
      throw new Error(`Converter options were missing starter combination "${label}".`);
    }
  }

  const inspection = converterModule.inspectConverterInput({
    imageBase64: PNG_BASE64_FIXTURE,
  });
  if (inspection?.format !== 'png' || typeof inspection?.input?.width !== 'number' || typeof inspection?.assessment?.recommendedSettings?.traceClass !== 'string') {
    throw new Error('inspectConverterInput returned an unexpected shape.');
  }

  const pngResult = converterModule.convertSvgToPng({
    svg: SVG_FIXTURE,
    targetWidth: 32,
    background: 'transparent',
  });
  if (typeof pngResult?.pngBase64 !== 'string' || !pngResult.pngBase64.length) {
    throw new Error('convertSvgToPng did not return pngBase64.');
  }
  if (pngResult.request?.targetWidth !== 32 || pngResult.request?.background !== 'transparent') {
    throw new Error('convertSvgToPng returned an unexpected request shape.');
  }

  const svgResult = await converterModule.convertPngToSvg({
    imageBase64: PNG_BASE64_FIXTURE,
    qualityMode: 'exact',
    colorMode: 'mono',
    traceClass: 'single-color-mark',
    uiMode: 'logo',
  });
  if (typeof svgResult?.svg !== 'string' || !svgResult.svg.includes('<svg')) {
    throw new Error('convertPngToSvg did not return SVG text.');
  }
  if (svgResult.request?.qualityMode !== 'exact' || svgResult.request?.traceClass !== 'single-color-mark' || svgResult.request?.uiMode !== 'logo') {
    throw new Error('convertPngToSvg returned an unexpected request shape.');
  }

  let invalidInputRejected = false;
  try {
    await converterModule.convertPngToSvg({ imageBase64: '' });
  } catch (error) {
    invalidInputRejected = /non-empty base64 string or data URL/i.test(error.message);
  }
  if (!invalidInputRejected) {
    throw new Error('convertPngToSvg did not reject invalid input as expected.');
  }

  console.log(`Converter clean-install smoke verified: ${options.pngToSvg.traceClasses.length} trace classes, ${options.pngToSvg.starterCombinations.length} starter combinations, input inspection, SVG-to-PNG, PNG-to-SVG, and invalid-input rejection all passed.`);
} finally {
  try {
    rmSync(tempRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  } catch (error) {
    if (error?.code !== 'EPERM' && error?.code !== 'EBUSY') {
      console.warn(`Converter clean-install cleanup warning: ${error.message}`);
    }
  }
}
