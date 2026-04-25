import fs from 'node:fs';
import path from 'node:path';

import { Resvg } from '@resvg/resvg-js';

const repoRoot = process.cwd();

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      options[key] = true;
    } else {
      options[key] = next;
      index += 1;
    }
  }
  return options;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function loadCatalog(catalogPath) {
  const data = readJson(path.join(repoRoot, catalogPath));
  return new Map((data.icons || []).map((icon) => [`${icon.lib}:${icon.id}`, icon]));
}

function colorizeSvg(svg) {
  return svg.replace(/currentColor/g, '#000000');
}

function renderPng({ svg, outputPath, width }) {
  const resvg = new Resvg(colorizeSvg(svg), {
    fitTo: {
      mode: 'width',
      value: width,
    },
    background: 'rgba(0, 0, 0, 0)',
  });
  const pngData = resvg.render();
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, pngData.asPng());
}

function readPngDimensions(filePath) {
  const buffer = fs.readFileSync(filePath);
  const pngSignature = '89504e470d0a1a0a';
  if (buffer.subarray(0, 8).toString('hex') !== pngSignature) {
    throw new Error(`${filePath} is not a PNG file`);
  }
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

function buildTargets({ library, limit }) {
  const screenshotFolder = path.join(repoRoot, 'output', 'icon_screenshot', library);
  const mapping = readJson(path.join(screenshotFolder, 'screenshot-mapping.json'));
  const entries = mapping.entries || [];
  return entries.slice(0, limit || entries.length).map((entry) => ({
    library,
    asset_id: entry.asset_id,
    asset_style: entry.asset_style,
    asset_source_catalog: entry.asset_source_catalog,
    output: path.join(screenshotFolder, entry.recommended_screenshot_file_name),
  }));
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const library = options.library;
  if (!library) {
    throw new Error('Missing required option --library');
  }

  const limit = options.limit ? Number.parseInt(options.limit, 10) : null;
  const width = options.width ? Number.parseInt(options.width, 10) : 128;
  const height = options.height ? Number.parseInt(options.height, 10) : width;
  const targets = buildTargets({ library, limit });

  if (options['dry-run']) {
    console.log(
      JSON.stringify(
        {
          library,
          targets: targets.map((target) => ({
            ...target,
            output: path.relative(repoRoot, target.output).replaceAll(path.sep, '/'),
          })),
        },
        null,
        2
      )
    );
    return;
  }

  const catalogs = new Map();
  const issues = [];

  for (const target of targets) {
    if (!catalogs.has(target.asset_source_catalog)) {
      catalogs.set(target.asset_source_catalog, loadCatalog(target.asset_source_catalog));
    }
    const catalog = catalogs.get(target.asset_source_catalog);
    const icon = catalog.get(`${library}:${target.asset_id}`);
    if (!icon?.svg) {
      issues.push({
        asset_id: target.asset_id,
        code: 'missing_svg',
        source_catalog: target.asset_source_catalog,
      });
      continue;
    }
    renderPng({ svg: icon.svg, outputPath: target.output, width });
    const stat = fs.statSync(target.output);
    if (stat.size <= 0) {
      issues.push({
        asset_id: target.asset_id,
        code: 'empty_png',
        output: path.relative(repoRoot, target.output).replaceAll(path.sep, '/'),
      });
      continue;
    }

    const dimensions = readPngDimensions(target.output);
    if (dimensions.width !== width || dimensions.height !== height) {
      issues.push({
        asset_id: target.asset_id,
        code: 'unexpected_png_dimensions',
        expected: `${width}x${height}`,
        actual: `${dimensions.width}x${dimensions.height}`,
        output: path.relative(repoRoot, target.output).replaceAll(path.sep, '/'),
      });
    }
  }

  if (issues.length > 0) {
    const issuePath = path.join(repoRoot, 'data', 'si-registry', 'generated', 'screenshot-capture-issues.json');
    fs.mkdirSync(path.dirname(issuePath), { recursive: true });
    fs.writeFileSync(issuePath, `${JSON.stringify({ library, issues }, null, 2)}\n`, 'utf8');
  }

  console.log(
    JSON.stringify(
      {
        library,
        rendered: targets.length - issues.length,
        issues: issues.length,
      },
      null,
      2
    )
  );
}

main();
