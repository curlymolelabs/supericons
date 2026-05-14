import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');

async function readJson(relativePath) {
  const absolutePath = path.join(repoRoot, relativePath);
  return JSON.parse(await fs.readFile(absolutePath, 'utf8'));
}

async function readText(relativePath) {
  const absolutePath = path.join(repoRoot, relativePath);
  return fs.readFile(absolutePath, 'utf8');
}

function roundDownDisplayCount(count) {
  if (count >= 10000) {
    return `${Math.floor(count / 10000) * 10000}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '+';
  }
  if (count >= 1000) {
    return `${Math.floor(count / 1000) * 1000}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '+';
  }
  return count.toLocaleString();
}

function countMcpTools(source) {
  return (source.match(/server\.tool\(/g) || []).length;
}

const FREE_MCP_TOOL_IDS = Object.freeze([
  'search_icons',
  'get_icon',
  'list_libraries',
]);

export async function buildProductFactsObject() {
  const freeCatalog = await readJson('public/icon-index.json');
  const premiumManifest = await readJson('public/packs/manifest.json');
  const mcpPackage = await readJson('mcp/package.json');
  const mcpSource = await readText('mcp/index.js');

  const freeIcons = Array.isArray(freeCatalog.icons) ? freeCatalog.icons : [];
  const freeLibraries = new Set(freeIcons.map((icon) => icon.lib).filter(Boolean));
  const premiumCollections = Object.entries(premiumManifest || {});
  const premiumCollectionCount = premiumCollections.length;
  const premiumIconCount = premiumCollections.reduce((sum, [, collection]) => sum + (collection.icons?.length || 0), 0);
  const freeIconCount = freeIcons.length;
  const freeLibraryCount = freeLibraries.size;
  const mcpToolCount = countMcpTools(mcpSource);
  const mcpFreeToolCount = FREE_MCP_TOOL_IDS.length;
  const freeIconsRounded = roundDownDisplayCount(freeIconCount);

  return {
    generatedAt: new Date().toISOString(),
    freeIconCount,
    freeLibraryCount,
    premiumCollectionCount,
    premiumIconCount,
    mcpToolCount,
    mcpFreeToolCount,
    mcpPackageVersion: mcpPackage.version,
    display: {
      freeIconsRounded,
      freeIconsLabel: `${freeIconsRounded} curated SVG icons`,
      freeIconsAcrossLibrariesLabel: `${freeIconsRounded} icons across ${freeLibraryCount} libraries`,
      freeIconsAcrossLibrariesFreeLabel: `${freeIconsRounded} curated SVG icons across ${freeLibraryCount} libraries`,
      freeSvgIconsAcrossLibrariesLabel: `${freeIconsRounded} free SVG icons from ${freeLibraryCount} libraries`,
      openSourceSvgIconsAcrossLibrariesLabel: `${freeIconsRounded} open-source SVG icons from ${freeLibraryCount} libraries`,
      freeIconLibraryLabel: `${freeIconsRounded} icon library`,
      freeResultsLabel: `${freeIconsRounded} results`,
      searchPlaceholderLabel: `Search ${freeIconsRounded} icons...`,
      mcpServerFreeIconsLabel: `MCP server (${freeIconsRounded} curated SVG icons)`,
      mcpToolCountLabel: `${mcpToolCount} tools`,
      mcpToolsLabel: `${mcpToolCount} MCP tools`,
      mcpFreeToolCountLabel: `${mcpFreeToolCount} free tools`,
    },
  };
}

export async function readExistingProductFacts() {
  return readJson('data/product-facts.json');
}
