#!/usr/bin/env node
/**
 * SuperIcons MCP Server
 * Provides 3 tools: search_icons, get_icon, list_libraries
 * Transport: stdio (for local IDE integration)
 * Auth: SUPERICONS_API_KEY env var for premium icon access
 *
 * Premium access tiers:
 *   - Pro subscribers: all premium collections
 *   - Pack/Bundle buyers: purchased collections only
 *   - Anonymous: free icons only (20,000+)
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';
import { searchIcons } from './search.js';
import { validateApiKey } from './auth.js';
import {
  MATERIAL_EXPORT_DEFAULT_AXES,
  MATERIAL_EXPORT_SOURCE,
  buildMaterialCacheKey,
  buildMaterialSnapshotUrl,
} from '../material-export.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ============================================================
// Data Loading
// ============================================================
const dataDir = join(__dirname, '..', 'public');
const packsDir = join(dataDir, 'packs');
const manifestPath = join(packsDir, 'manifest.json');
const materialExportManifestPath = join(dataDir, 'material-export-manifest.json');

const MATERIAL_EXPORT_MANIFEST_FALLBACK = {
  version: 1,
  source: MATERIAL_EXPORT_SOURCE,
  defaultAxes: MATERIAL_EXPORT_DEFAULT_AXES,
};

const materialExportState = {
  manifest: null,
  svgCache: new Map(),
  failedKeys: new Set(),
};

function loadData() {
  const raw = JSON.parse(readFileSync(join(dataDir, 'icon-index.json'), 'utf8'));
  const synonyms = JSON.parse(readFileSync(join(dataDir, 'synonyms.json'), 'utf8'));

  // icon-index.json has { icons: [...] } where each entry is { id, name, lib, type, style, svg? }
  // Include Material Symbols so MCP tools can resolve export-grade SVG snapshots on demand.
  const freeIcons = raw.icons
    .filter(entry => (entry.type === 'svg' && entry.svg) || (entry.lib === 'material' && entry.type === 'font'))
    .map(icon => ({ ...icon, premium: false }));

  return { freeIcons, synonyms };
}

function loadPremiumPacks() {
  const premiumIcons = [];
  if (!existsSync(packsDir)) return premiumIcons;

  // Load manifest for classMap (reverse obfuscation of wrapper classes)
  let manifest = {};
  try {
    manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  } catch {
    // No manifest: premium icons served as-is
  }

  const packDirs = readdirSync(packsDir, { withFileTypes: true })
    .filter(d => d.isDirectory());

  for (const packDir of packDirs) {
    const packPath = join(packsDir, packDir.name);
    const svgFiles = readdirSync(packPath).filter(f => f.endsWith('.svg'));
    const slug = packDir.name;

    // Load CSS for this collection (for serving with premium icons)
    const cssFiles = readdirSync(packPath).filter(f => f.endsWith('.css'));
    let collectionCss = '';
    if (cssFiles.length > 0) {
      collectionCss = readFileSync(join(packPath, cssFiles[0]), 'utf8');
    }

    // Build reverse classMap: obfuscated -> original (for wrapper classes only)
    const classMap = manifest[slug]?.classMap || {};
    const reverseMap = {};
    for (const [iconName, token] of Object.entries(classMap)) {
      reverseMap[token] = iconName;
    }

    // Reverse-map wrapper classes in CSS (si-anim--{icon} only)
    let cleanCss = collectionCss;
    for (const [token, iconName] of Object.entries(reverseMap)) {
      cleanCss = cleanCss.replaceAll(`.${token}`, `.si-anim--${iconName}`);
    }

    for (const svgFile of svgFiles) {
      try {
        const svg = readFileSync(join(packPath, svgFile), 'utf8');
        const id = basename(svgFile, '.svg');

        // Extract this icon's CSS block from collection CSS
        // The wrapper class is si-anim--{iconName} in clean CSS
        const iconCssClass = `si-anim--${id}`;
        const iconCssLines = extractIconCss(cleanCss, iconCssClass);

        premiumIcons.push({
          id,
          name: id.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
          lib: slug,
          type: 'svg',
          svg,
          css: iconCssLines,
          premium: true,
        });
      } catch {
        // Skip unreadable files
      }
    }
  }

  return premiumIcons;
}

/**
 * Extract CSS rules relevant to a specific icon from the collection CSS.
 * Returns the matched rules as a string, or the full CSS if extraction fails.
 */
function extractIconCss(fullCss, iconClass) {
  if (!fullCss || !iconClass) return '';

  // Match all rule blocks that reference this icon's wrapper class
  const lines = fullCss.split('\n');
  const relevantLines = [];
  let inBlock = false;
  let braceDepth = 0;
  const keyframeNames = new Set();

  for (const line of lines) {
    if (!inBlock && line.includes(`.${iconClass}`)) {
      inBlock = true;
      braceDepth = 0;
    }

    if (inBlock) {
      relevantLines.push(line);
      braceDepth += (line.match(/{/g) || []).length;
      braceDepth -= (line.match(/}/g) || []).length;
      if (braceDepth <= 0) {
        inBlock = false;
      }

      // Track referenced keyframe names
      const animMatch = line.match(/animation[^:]*:\s*([a-z][a-z0-9-]+)/i);
      if (animMatch) keyframeNames.add(animMatch[1]);
    }
  }

  // Also extract referenced @keyframes blocks
  inBlock = false;
  braceDepth = 0;
  for (const line of lines) {
    if (!inBlock) {
      const kfMatch = line.match(/@keyframes\s+([a-z0-9-]+)/i);
      if (kfMatch && keyframeNames.has(kfMatch[1])) {
        inBlock = true;
        braceDepth = 0;
      }
    }

    if (inBlock) {
      relevantLines.push(line);
      braceDepth += (line.match(/{/g) || []).length;
      braceDepth -= (line.match(/}/g) || []).length;
      if (braceDepth <= 0) {
        inBlock = false;
      }
    }
  }

  return relevantLines.join('\n');
}

function loadMaterialExportManifest() {
  if (materialExportState.manifest) return materialExportState.manifest;
  if (existsSync(materialExportManifestPath)) {
    try {
      materialExportState.manifest = JSON.parse(readFileSync(materialExportManifestPath, 'utf8'));
      return materialExportState.manifest;
    } catch {
      // Fall back below
    }
  }
  materialExportState.manifest = MATERIAL_EXPORT_MANIFEST_FALLBACK;
  return materialExportState.manifest;
}

function getMaterialExportAxes() {
  const manifest = loadMaterialExportManifest();
  return { ...MATERIAL_EXPORT_DEFAULT_AXES, ...(manifest?.defaultAxes || {}) };
}

function normalizeMaterialSnapshotSvg(rawSvg) {
  if (!rawSvg) return null;
  if (/\bfill="/.test(rawSvg)) return rawSvg;
  return rawSvg.replace(/<svg([^>]*)>/, '<svg$1 fill="currentColor">');
}

async function resolveMaterialSnapshotSvg(icon) {
  const manifest = loadMaterialExportManifest();
  const axes = getMaterialExportAxes();
  const cacheKey = buildMaterialCacheKey(icon.id, axes);

  if (materialExportState.svgCache.has(cacheKey)) {
    return {
      svg: materialExportState.svgCache.get(cacheKey),
      axes,
      source: 'material-snapshot',
    };
  }

  if (materialExportState.failedKeys.has(cacheKey)) return null;

  const url = buildMaterialSnapshotUrl(icon.id, axes, manifest?.source || MATERIAL_EXPORT_SOURCE);
  let response;
  try {
    response = await fetch(url);
  } catch {
    materialExportState.failedKeys.add(cacheKey);
    return null;
  }
  if (!response.ok) {
    materialExportState.failedKeys.add(cacheKey);
    return null;
  }

  const svg = normalizeMaterialSnapshotSvg(await response.text());
  materialExportState.svgCache.set(cacheKey, svg);
  return {
    svg,
    axes,
    source: 'material-snapshot',
  };
}

async function buildToolIconResult(icon) {
  let svg = icon.svg;
  let materialAxes = null;
  let svgSource = 'native-svg';

  if (icon.lib === 'material') {
    const resolved = await resolveMaterialSnapshotSvg(icon);
    if (!resolved?.svg) return null;
    svg = resolved.svg;
    materialAxes = resolved.axes;
    svgSource = resolved.source;
  }

  const result = {
    id: icon.id,
    name: icon.name,
    library: icon.lib,
    libraryName: libraryMeta[icon.lib]?.name || icon.lib,
    type: 'svg',
    originalType: icon.type,
    premium: icon.premium || false,
    svg,
    svgSource,
  };

  if (materialAxes) {
    result.materialExportAxes = materialAxes;
  }

  if (icon.premium && icon.css) {
    result.css = icon.css;
    result.usage = `<div class="si-anim si-anim--${icon.id}"><!-- paste SVG here --></div>`;
  }

  return result;
}

const { freeIcons, synonyms } = loadData();
const premiumIcons = loadPremiumPacks();

// Combined icon set (auth determines which subset is searchable)
const allIcons = [...freeIcons, ...premiumIcons];

// ============================================================
// Auth State (resolved at startup)
// ============================================================
let authState = { authenticated: false, isPro: false, purchasedSlugs: [], userId: null, error: null };

async function initAuth() {
  authState = await validateApiKey();
  if (authState.error) {
    console.error(`[SuperIcons] Auth: ${authState.error}`);
  } else if (authState.isPro) {
    console.error(`[SuperIcons] Auth: Pro (${freeIcons.length} free + ${premiumIcons.length} premium icons)`);
  } else if (authState.purchasedSlugs.length > 0) {
    const purchasedCount = premiumIcons.filter(i => authState.purchasedSlugs.includes(i.lib)).length;
    console.error(`[SuperIcons] Auth: Pack buyer (${freeIcons.length} free + ${purchasedCount} purchased premium icons)`);
  } else if (authState.authenticated) {
    console.error(`[SuperIcons] Auth: Free tier (${freeIcons.length} free icons, ${premiumIcons.length} premium locked)`);
  } else {
    console.error(`[SuperIcons] Auth: Anonymous (${freeIcons.length} free icons)`);
  }
}

// Get the searchable icon set based on auth
function getAccessibleIcons() {
  if (authState.isPro) return allIcons;
  if (authState.purchasedSlugs.length > 0) {
    const purchased = premiumIcons.filter(i => authState.purchasedSlugs.includes(i.lib));
    return [...freeIcons, ...purchased];
  }
  return freeIcons;
}

// Check if user has access to a specific premium library
function hasLibraryAccess(library) {
  if (authState.isPro) return true;
  if (authState.purchasedSlugs.includes(library)) return true;
  return false;
}

// ============================================================
// Library Metadata
// ============================================================
const libraryMeta = {
  material: { name: 'Material Symbols', description: 'Google Material Symbols with 4-axis variable font support', hasStroke: false },
  lucide: { name: 'Lucide', description: 'Beautiful, consistent open-source icons', hasStroke: true },
  tabler: { name: 'Tabler', description: 'Over 5,000 free MIT-licensed SVG icons', hasStroke: true },
  phosphor: { name: 'Phosphor', description: 'Flexible icon family for interfaces and beyond', hasStroke: false },
  heroicons: { name: 'Heroicons', description: 'Beautiful hand-crafted SVG icons by Tailwind CSS', hasStroke: true },
  bootstrap: { name: 'Bootstrap', description: 'Official open-source SVG icon library for Bootstrap', hasStroke: false },
  iconoir: { name: 'Iconoir', description: 'High-quality open-source icon library', hasStroke: true },
  ionicons: { name: 'Ionicons', description: 'Premium open-source icons for Ionic Framework', hasStroke: true },
  simpleicons: { name: 'Simple Icons', description: '3,400+ SVG icons for popular brands', hasStroke: false },
};

// Add premium pack libraries
const packDirNames = existsSync(packsDir)
  ? readdirSync(packsDir, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name)
  : [];

for (const packName of packDirNames) {
  const displayName = packName.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  libraryMeta[packName] = {
    name: `${displayName} (Premium)`,
    description: `Premium animated icon pack: ${displayName}`,
    hasStroke: false,
    premium: true,
  };
}

// Compute counts per library
const libCounts = {};
for (const icon of allIcons) {
  libCounts[icon.lib] = (libCounts[icon.lib] || 0) + 1;
}

// ============================================================
// MCP Server
// ============================================================
const server = new McpServer({
  name: 'supericons',
  version: '0.2.0',
});

// --- Tool: search_icons ---
server.tool(
  'search_icons',
  'Search 19,000+ icons across 9 libraries using AI-powered synonym expansion. Returns matching icons with SVG code. Premium collections require a Pro API key.',
  {
    query: z.string().describe('Search term (e.g. "heart", "login", "download arrow")'),
    library: z.string().optional().describe('Filter by library: lucide, tabler, phosphor, heroicons, bootstrap, iconoir, ionicons, material, simpleicons, or premium pack names'),
    limit: z.number().min(1).max(50).optional().default(10).describe('Max results (1-50, default 10)'),
  },
  async ({ query, library, limit }) => {
    const accessibleIcons = getAccessibleIcons();

    // If user requests a premium library without Pro access, return 403-like message
    // Check if requesting premium library without access
    if (libraryMeta[library]?.premium && !hasLibraryAccess(library)) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            error: 'Premium access required',
            message: `The "${libraryMeta[library].name}" pack requires a purchase or Pro subscription. Visit https://supericons.dev`,
            hint: 'Set SUPERICONS_API_KEY in your MCP config with your API key.',
          }, null, 2),
        }],
      };
    }

    const results = searchIcons(query, accessibleIcons, synonyms, { library, limit });
    if (results.length === 0) {
      return {
        content: [{ type: 'text', text: `No icons found for "${query}"${library ? ` in ${library}` : ''}.` }],
      };
    }
    const formatted = (await Promise.all(results.map(icon => buildToolIconResult(icon)))).filter(Boolean);
    if (formatted.length === 0) {
      return {
        content: [{
          type: 'text',
          text: `Icons were found for "${query}"${library ? ` in ${library}` : ''}, but their SVG payloads could not be resolved right now.`,
        }],
      };
    }
    return {
      content: [{ type: 'text', text: JSON.stringify({ results: formatted, source: 'Powered by SuperIcons (https://supericons.dev)' }, null, 2) }],
    };
  }
);

// --- Tool: get_icon ---
server.tool(
  'get_icon',
  'Retrieve a specific icon by its ID and library. Returns the full SVG code and metadata. Premium icons require a Pro API key.',
  {
    id: z.string().describe('Icon ID (e.g. "heart", "arrow-right", "settings")'),
    library: z.string().describe('Library name (e.g. "lucide", "tabler", "phosphor", or premium pack name)'),
  },
  async ({ id, library }) => {
    // Check if requesting premium library without access
    if (libraryMeta[library]?.premium && !hasLibraryAccess(library)) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            error: 'Premium access required',
            message: `Icon "${id}" is in the premium "${libraryMeta[library].name}" pack. Visit https://supericons.dev`,
            hint: 'Set SUPERICONS_API_KEY in your MCP config with your API key.',
          }, null, 2),
        }],
      };
    }

    const accessibleIcons = getAccessibleIcons();
    const icon = accessibleIcons.find(i => i.id === id && i.lib === library);
    if (!icon) {
      // Try case-insensitive
      const loose = accessibleIcons.find(i =>
        i.id.toLowerCase() === id.toLowerCase() && i.lib.toLowerCase() === library.toLowerCase()
      );
      if (!loose) {
        return {
          content: [{ type: 'text', text: `Icon "${id}" not found in library "${library}". Use search_icons to find available icons.` }],
        };
      }
      const result = await buildToolIconResult(loose);
      if (!result) {
        return {
          content: [{
            type: 'text',
            text: `Icon "${loose.id}" was found in library "${loose.lib}", but its SVG payload could not be resolved right now.`,
          }],
        };
      }
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }
    const result = await buildToolIconResult(icon);
    if (!result) {
      return {
        content: [{
          type: 'text',
          text: `Icon "${icon.id}" was found in library "${icon.lib}", but its SVG payload could not be resolved right now.`,
        }],
      };
    }
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2),
      }],
    };
  }
);

// --- Tool: list_libraries ---
server.tool(
  'list_libraries',
  'List all available icon libraries with their names, icon counts, and descriptions. Premium libraries are marked.',
  {},
  async () => {
    const libs = Object.entries(libraryMeta).map(([id, meta]) => ({
      id,
      name: meta.name,
      count: libCounts[id] || 0,
      hasStroke: meta.hasStroke,
      description: meta.description,
      premium: meta.premium || false,
      accessible: meta.premium ? hasLibraryAccess(id) : true,
    }));
    return {
      content: [{ type: 'text', text: JSON.stringify(libs, null, 2) }],
    };
  }
);

// ============================================================
// Start
// ============================================================
await initAuth();
const transport = new StdioServerTransport();
await server.connect(transport);
