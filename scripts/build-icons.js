/**
 * build-icons.js
 *
 * Aggregates icons from multiple open-source libraries into a unified JSON index.
 * Sources:
 *   - Material Symbols: fetched from Google's GitHub codepoints file (variable font, not SVG)
 *   - Lucide, Tabler, Phosphor, Heroicons, Bootstrap, Ionicons, Iconoir: SVGs from npm
 *   - Simple Icons: brand logos from npm (simple-icons)
 *
 * Output:
 *   - public/icon-index.json        (outline icons, loaded on startup)
 *   - public/icon-index-solid.json   (solid/filled icons, lazy-loaded on toggle)
 *
 * Usage: node scripts/build-icons.js
 */

import { readdir, readFile, writeFile, mkdir } from 'fs/promises';
import { join, basename, extname } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');

// ============================================================
// Helpers
// ============================================================

/** Convert kebab-case filename to display name */
function toDisplayName(filename) {
  return filename
    .replace(extname(filename), '')
    .replace(/-/g, ' ')
    .replace(/_/g, ' ');
}

/** Strip XML comments and clean SVG for embedding */
function cleanSvg(svg) {
  return svg
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\n\s*/g, ' ')
    .trim();
}

/** Read all SVG files from a directory */
async function readSvgDir(dirPath) {
  const files = await readdir(dirPath);
  const svgFiles = files.filter((f) => f.endsWith('.svg'));
  const results = [];

  for (const file of svgFiles) {
    const content = await readFile(join(dirPath, file), 'utf-8');
    results.push({
      filename: file,
      name: toDisplayName(file),
      svg: cleanSvg(content),
    });
  }

  return results;
}

// ============================================================
// OUTLINE LOADERS
// ============================================================

async function fetchMaterialSymbols() {
  console.log('  Fetching Material Symbols codepoints from GitHub...');
  const url =
    'https://raw.githubusercontent.com/google/material-design-icons/master/variablefont/MaterialSymbolsOutlined%5BFILL%2CGRAD%2Copsz%2Cwght%5D.codepoints';

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch Material Symbols: ${response.status}`);
  }

  const text = await response.text();
  const lines = text.trim().split('\n');
  const icons = [];

  for (const line of lines) {
    const [name] = line.split(' ');
    if (name) {
      icons.push({
        name: name.replace(/_/g, ' '),
        id: name,
        lib: 'material',
        type: 'font',
        style: 'outline',
      });
    }
  }

  console.log(`  Found ${icons.length} Material Symbols`);
  return icons;
}

async function loadLucide() {
  const dir = join(ROOT, 'node_modules', 'lucide-static', 'icons');
  console.log('  Reading Lucide SVGs...');
  const files = await readSvgDir(dir);
  const icons = files.map((f) => ({
    name: f.name,
    id: basename(f.filename, '.svg'),
    lib: 'lucide',
    type: 'svg',
    style: 'outline',
    svg: f.svg,
  }));
  console.log(`  Found ${icons.length} Lucide icons`);
  return icons;
}

async function loadTabler() {
  const dir = join(ROOT, 'node_modules', '@tabler', 'icons', 'icons', 'outline');
  console.log('  Reading Tabler SVGs...');
  const files = await readSvgDir(dir);
  const icons = files.map((f) => ({
    name: f.name,
    id: basename(f.filename, '.svg'),
    lib: 'tabler',
    type: 'svg',
    style: 'outline',
    svg: f.svg,
  }));
  console.log(`  Found ${icons.length} Tabler icons`);
  return icons;
}

async function loadPhosphor() {
  const dir = join(ROOT, 'node_modules', '@phosphor-icons', 'core', 'assets', 'regular');
  console.log('  Reading Phosphor SVGs...');
  const files = await readSvgDir(dir);
  const icons = files.map((f) => ({
    name: f.name,
    id: basename(f.filename, '.svg'),
    lib: 'phosphor',
    type: 'svg',
    style: 'outline',
    svg: f.svg,
  }));
  console.log(`  Found ${icons.length} Phosphor icons`);
  return icons;
}

async function loadHeroicons() {
  const dir = join(ROOT, 'node_modules', 'heroicons', '24', 'outline');
  console.log('  Reading Heroicons SVGs...');
  const files = await readSvgDir(dir);
  const icons = files.map((f) => ({
    name: f.name,
    id: basename(f.filename, '.svg'),
    lib: 'heroicons',
    type: 'svg',
    style: 'outline',
    svg: f.svg,
  }));
  console.log(`  Found ${icons.length} Heroicons`);
  return icons;
}

async function loadSimpleIcons() {
  const dir = join(ROOT, 'node_modules', 'simple-icons', 'icons');
  console.log('  Reading Simple Icons (brand logos)...');
  const files = await readSvgDir(dir);
  const icons = files.map((f) => {
    let svg = f.svg;
    // Simple Icons SVGs have no fill on paths -- inject fill="currentColor" on root
    // so they inherit CSS color. Without this they are invisible (no fill, no stroke).
    if (!/<svg[^>]*\bfill=/.test(svg)) {
      svg = svg.replace('<svg ', '<svg fill="currentColor" ');
    }
    // Strip role="img" (not needed for our embedding context)
    svg = svg.replace(/\s*role="[^"]*"/g, '');
    // Derive a clean display name: filename is slug (e.g. "github.svg" -> "GitHub")
    // Simple Icons uses titlecase slugs; convert properly
    const slug = basename(f.filename, '.svg');
    const name = slug
      .replace(/([a-z])([A-Z])/g, '$1 $2') // camelCase split
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase()); // title-case each word
    return {
      name,
      id: slug,
      lib: 'simpleicons',
      type: 'svg',
      style: 'outline', // all brand logos are single-style (flat filled)
      svg,
    };
  });
  console.log(`  Found ${icons.length} Simple Icons`);
  return icons;
}

async function loadBootstrapOutline() {
  const dir = join(ROOT, 'node_modules', 'bootstrap-icons', 'icons');
  console.log('  Reading Bootstrap Icons (outline)...');
  const allFiles = await readSvgDir(dir);
  const files = allFiles.filter((f) => !f.filename.includes('-fill'));
  const icons = files.map((f) => ({
    name: f.name,
    id: basename(f.filename, '.svg'),
    lib: 'bootstrap',
    type: 'svg',
    style: 'outline',
    svg: f.svg,
  }));
  console.log(`  Found ${icons.length} Bootstrap outline icons`);
  return icons;
}

async function loadIoniconsOutline() {
  const dir = join(ROOT, 'node_modules', 'ionicons', 'dist', 'svg');
  console.log('  Reading Ionicons (outline)...');
  const allFiles = await readSvgDir(dir);
  const files = allFiles.filter((f) => f.filename.includes('outline'));
  const icons = files.map((f) => {
    let svg = f.svg;
    // Strip hardcoded stroke-width (512x512 viewbox uses 32-48px values)
    svg = svg.replace(/\s*stroke-width="[^"]*"/g, '');
    // Strip class="ionicon" (not needed, can cause style conflicts)
    svg = svg.replace(/\s*class="[^"]*"/g, '');
    // Ensure fill="none" on SVG root (414/421 files are missing it).
    // Without this, inner paths default to SVG black fill.
    if (!/<svg[^>]*\bfill="/.test(svg)) {
      svg = svg.replace('<svg ', '<svg fill="none" ');
    }
    // Ensure stroke="currentColor" on SVG root so strokes inherit CSS color.
    if (!/<svg[^>]*\bstroke="/.test(svg)) {
      svg = svg.replace('<svg ', '<svg stroke="currentColor" ');
    }
    return {
      name: f.name.replace(' outline', ''),
      id: basename(f.filename, '.svg'),
      lib: 'ionicons',
      type: 'svg',
      style: 'outline',
      svg,
    };
  });
  console.log(`  Found ${icons.length} Ionicons (outline)`);
  return icons;
}

async function loadIconoirOutline() {
  const dir = join(ROOT, 'node_modules', 'iconoir', 'icons', 'regular');
  console.log('  Reading Iconoir (outline)...');
  const files = await readSvgDir(dir);
  const icons = files.map((f) => ({
    name: f.name,
    id: basename(f.filename, '.svg'),
    lib: 'iconoir',
    type: 'svg',
    style: 'outline',
    svg: f.svg,
  }));
  console.log(`  Found ${icons.length} Iconoir icons`);
  return icons;
}

async function loadMingCuteOutline() {
  const baseDir = join(ROOT, 'node_modules', 'mingcute_icon', 'svg');
  console.log('  Reading MingCute SVGs (outline _line)...');
  const categories = await readdir(baseDir);
  const icons = [];
  for (const cat of categories) {
    const catDir = join(baseDir, cat);
    const files = await readdir(catDir).catch(() => []);
    for (const file of files) {
      if (!file.endsWith('_line.svg')) continue;
      const content = await readFile(join(catDir, file), 'utf-8');
      const slug = basename(file, '.svg');
      const name = slug.replace(/_line$/, '').replace(/_/g, ' ');
      // Replace any hardcoded fill color (e.g. #09244B) with currentColor
      // so icons inherit CSS color, matching all other libraries.
      // fill="none" is preserved (used on the MingCute ghost/layout path).
      const svg = cleanSvg(content).replace(/fill="(?!none|currentColor)[^"]+"/g, 'fill="currentColor"');
      icons.push({
        name,
        id: slug,
        lib: 'mingcute',
        type: 'svg',
        style: 'outline',
        svg,
      });
    }
  }
  console.log(`  Found ${icons.length} MingCute outline icons`);
  return icons;
}

async function loadMingCuteFilled() {
  const baseDir = join(ROOT, 'node_modules', 'mingcute_icon', 'svg');
  console.log('  Reading MingCute SVGs (filled _fill)...');
  const categories = await readdir(baseDir);
  const icons = [];
  for (const cat of categories) {
    const catDir = join(baseDir, cat);
    const files = await readdir(catDir).catch(() => []);
    for (const file of files) {
      if (!file.endsWith('_fill.svg')) continue;
      const content = await readFile(join(catDir, file), 'utf-8');
      const slug = basename(file, '.svg');
      const name = slug.replace(/_fill$/, '').replace(/_/g, ' ');
      // Replace any hardcoded fill color with currentColor; preserve fill="none".
      const svg = cleanSvg(content).replace(/fill="(?!none|currentColor)[^"]+"/g, 'fill="currentColor"');
      icons.push({
        name,
        id: slug,
        lib: 'mingcute',
        type: 'svg',
        style: 'solid',
        svg,
      });
    }
  }
  console.log(`  Found ${icons.length} MingCute filled icons`);
  return icons;
}

// ============================================================
// SOLID/FILLED LOADERS
// ============================================================

async function loadTablerFilled() {
  const dir = join(ROOT, 'node_modules', '@tabler', 'icons', 'icons', 'filled');
  console.log('  Reading Tabler filled SVGs...');
  const files = await readSvgDir(dir);
  const icons = files.map((f) => ({
    name: f.name,
    id: basename(f.filename, '.svg'),
    lib: 'tabler',
    type: 'svg',
    style: 'solid',
    svg: f.svg,
  }));
  console.log(`  Found ${icons.length} Tabler filled icons`);
  return icons;
}

async function loadPhosphorFilled() {
  const dir = join(ROOT, 'node_modules', '@phosphor-icons', 'core', 'assets', 'fill');
  console.log('  Reading Phosphor filled SVGs...');
  const files = await readSvgDir(dir);
  const icons = files.map((f) => ({
    name: f.name.replace(/ fill$/, ''),
    id: basename(f.filename, '.svg'),
    lib: 'phosphor',
    type: 'svg',
    style: 'solid',
    svg: f.svg,
  }));
  console.log(`  Found ${icons.length} Phosphor filled icons`);
  return icons;
}

async function loadHeroiconsSolid() {
  const dir = join(ROOT, 'node_modules', 'heroicons', '24', 'solid');
  console.log('  Reading Heroicons solid SVGs...');
  const files = await readSvgDir(dir);
  const icons = files.map((f) => ({
    name: f.name,
    id: basename(f.filename, '.svg'),
    lib: 'heroicons',
    type: 'svg',
    style: 'solid',
    svg: f.svg,
  }));
  console.log(`  Found ${icons.length} Heroicons solid`);
  return icons;
}

async function loadIoniconsFilled() {
  const dir = join(ROOT, 'node_modules', 'ionicons', 'dist', 'svg');
  console.log('  Reading Ionicons (filled)...');
  const allFiles = await readSvgDir(dir);
  // Filled = no "-outline" and no "-sharp" suffix
  const files = allFiles.filter(
    (f) => !f.filename.includes('-outline') && !f.filename.includes('-sharp')
  );
  const icons = files.map((f) => {
    let svg = f.svg;
    // Strip class="ionicon" (not needed)
    svg = svg.replace(/\s*class="[^"]*"/g, '');
    // Ensure fill="currentColor" on the SVG root so paths inherit CSS color.
    // Without this, SVG paths default to fill black (#000).
    if (!svg.includes('fill="currentColor"')) {
      svg = svg.replace('<svg ', '<svg fill="currentColor" ');
    }
    return {
      name: f.name,
      id: basename(f.filename, '.svg'),
      lib: 'ionicons',
      type: 'svg',
      style: 'solid',
      svg,
    };
  });
  console.log(`  Found ${icons.length} Ionicons (filled)`);
  return icons;
}

async function loadBootstrapFilled() {
  const dir = join(ROOT, 'node_modules', 'bootstrap-icons', 'icons');
  console.log('  Reading Bootstrap Icons (filled)...');
  const allFiles = await readSvgDir(dir);
  const files = allFiles.filter((f) => f.filename.includes('-fill'));
  const icons = files.map((f) => ({
    name: f.name.replace(/ fill$/, ''),
    id: basename(f.filename, '.svg'),
    lib: 'bootstrap',
    type: 'svg',
    style: 'solid',
    svg: f.svg,
  }));
  console.log(`  Found ${icons.length} Bootstrap filled icons`);
  return icons;
}

async function loadIconoirSolid() {
  const dir = join(ROOT, 'node_modules', 'iconoir', 'icons', 'solid');
  console.log('  Reading Iconoir solid SVGs...');
  const files = await readSvgDir(dir);
  const icons = files.map((f) => ({
    name: f.name,
    id: basename(f.filename, '.svg'),
    lib: 'iconoir',
    type: 'svg',
    style: 'solid',
    svg: f.svg,
  }));
  console.log(`  Found ${icons.length} Iconoir solid icons`);
  return icons;
}

// ============================================================
// Build library counts
// ============================================================
function buildLibCounts(icons) {
  const counts = {};
  for (const icon of icons) {
    counts[icon.lib] = (counts[icon.lib] || 0) + 1;
  }
  return counts;
}

// ============================================================
// Main
// ============================================================
async function main() {
  console.log('SuperIcons: Building icon index...\n');

  // Load outline icons (primary, loaded on startup)
  const outlineResults = await Promise.all([
    fetchMaterialSymbols(),
    loadLucide(),
    loadTabler(),
    loadPhosphor(),
    loadHeroicons(),
    loadBootstrapOutline(),
    loadIoniconsOutline(),
    loadIconoirOutline(),
    loadSimpleIcons(),
    loadMingCuteOutline(),
  ]);
  const outlineIcons = outlineResults.flat();

  // Load solid/filled icons (secondary, lazy-loaded)
  const solidResults = await Promise.all([
    loadTablerFilled(),
    loadPhosphorFilled(),
    loadHeroiconsSolid(),
    loadIoniconsFilled(),
    loadBootstrapFilled(),
    loadIconoirSolid(),
    loadMingCuteFilled(),
  ]);
  const solidIcons = solidResults.flat();

  console.log(`\nOutline total: ${outlineIcons.length} icons`);
  console.log(`Solid total:   ${solidIcons.length} icons`);
  console.log(`Grand total:   ${outlineIcons.length + solidIcons.length} icons\n`);

  const outlineCounts = buildLibCounts(outlineIcons);
  const solidCounts = buildLibCounts(solidIcons);

  console.log('Outline library counts:');
  for (const [lib, count] of Object.entries(outlineCounts)) {
    console.log(`  ${lib}: ${count}`);
  }
  console.log('Solid library counts:');
  for (const [lib, count] of Object.entries(solidCounts)) {
    console.log(`  ${lib}: ${count}`);
  }

  // Write output files
  const outDir = join(ROOT, 'public');
  await mkdir(outDir, { recursive: true });

  // Outline index (loaded on startup)
  const outlineOutput = {
    version: '0.2.0',
    generatedAt: new Date().toISOString(),
    totalCount: outlineIcons.length,
    libraries: Object.entries(outlineCounts).map(([id, count]) => ({ id, count })),
    icons: outlineIcons,
  };
  const outlinePath = join(outDir, 'icon-index.json');
  await writeFile(outlinePath, JSON.stringify(outlineOutput));
  const outlineSize = (await readFile(outlinePath)).length;

  // Solid index (lazy-loaded on toggle)
  const solidOutput = {
    version: '0.2.0',
    generatedAt: new Date().toISOString(),
    totalCount: solidIcons.length,
    libraries: Object.entries(solidCounts).map(([id, count]) => ({ id, count })),
    icons: solidIcons,
  };
  const solidPath = join(outDir, 'icon-index-solid.json');
  await writeFile(solidPath, JSON.stringify(solidOutput));
  const solidSize = (await readFile(solidPath)).length;

  console.log(`\nWritten outline: ${outlinePath} (${(outlineSize / 1024 / 1024).toFixed(2)} MB)`);
  console.log(`Written solid:   ${solidPath} (${(solidSize / 1024 / 1024).toFixed(2)} MB)`);
  console.log('Done.');
}

main().catch((err) => {
  console.error('Build failed:', err);
  process.exit(1);
});
