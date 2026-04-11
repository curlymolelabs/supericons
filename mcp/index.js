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
  MATERIAL_EXPORT_STORAGE,
  buildMaterialCacheKey,
  buildMaterialOwnedSnapshotUrl,
  getMaterialManifestEntry,
  normalizeMaterialSnapshotSvg as normalizeOwnedMaterialSnapshotSvg,
} from '../material-export.js';
import { buildMotionLabAnimatedSvg, buildMotionLabBundle, buildMotionLabExternalCss, buildMotionLabRecipe, listMotionLabPresets } from './motion-lab.js';
import { convertPngToSvg, convertSvgToPng, getConverterMcpOptions } from './converter.js';
import {
  buildPremiumLibraryAccessError,
  buildProWorkflowAccessError,
  hasPremiumLibraryAccess,
  hasProWorkflowAccess,
} from './workflow-access.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ============================================================
// Data Loading
// ============================================================
const dataDir = join(__dirname, '..', 'public');
const packsDir = join(dataDir, 'packs');
const manifestPath = join(packsDir, 'manifest.json');
const materialExportManifestPath = join(dataDir, 'material-export-manifest.json');
const materialExportDir = join(dataDir, 'material-export');

const MATERIAL_EXPORT_MANIFEST_FALLBACK = {
  version: 2,
  upstream: null,
  defaultAxes: MATERIAL_EXPORT_DEFAULT_AXES,
  storage: MATERIAL_EXPORT_STORAGE,
  entries: {},
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
  return normalizeOwnedMaterialSnapshotSvg(rawSvg);
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

  const entry = getMaterialManifestEntry(manifest, icon.id, axes);
  if (entry?.path) {
    const localPath = join(materialExportDir, entry.path);
    if (existsSync(localPath)) {
      const svg = normalizeMaterialSnapshotSvg(readFileSync(localPath, 'utf8'));
      materialExportState.svgCache.set(cacheKey, svg);
      return {
        svg,
        axes,
        source: 'owned-material-cache:local',
      };
    }
  }

  const url = buildMaterialOwnedSnapshotUrl(icon.id, axes, manifest);
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
    source: response.headers.get('X-Cache-Status')
      ? `owned-material-cache:${response.headers.get('X-Cache-Status')}`
      : 'owned-material-cache',
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
  return hasPremiumLibraryAccess(authState, library);
}

function buildTextResponse(payload) {
  return {
    content: [{ type: 'text', text: typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2) }],
  };
}

function buildWorkflowAccessResponse(featureName) {
  return buildTextResponse(buildProWorkflowAccessError(featureName));
}

async function resolveAccessibleIcon(id, library) {
  const accessibleIcons = getAccessibleIcons();
  const exact = accessibleIcons.find((icon) => icon.id === id && icon.lib === library);
  if (exact) {
    return buildToolIconResult(exact);
  }

  const loose = accessibleIcons.find((icon) =>
    icon.id.toLowerCase() === id.toLowerCase() && icon.lib.toLowerCase() === library.toLowerCase()
  );
  if (!loose) return null;
  return buildToolIconResult(loose);
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
  mingcute: { name: 'MingCute', description: 'Modern open-source icon set with broad interface coverage', hasStroke: false },
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
const freeLibraryCount = Object.values(libraryMeta).filter(meta => !meta.premium).length;
const freeIconCountLabel = `${freeIcons.length.toLocaleString()} free icons across ${freeLibraryCount} libraries`;

// ============================================================
// MCP Server
// ============================================================
const server = new McpServer({
  name: 'supericons',
  version: '0.3.0',
});

// --- Tool: search_icons ---
server.tool(
  'search_icons',
  `Search ${freeIconCountLabel} using AI-powered synonym expansion. Returns matching icons with SVG code. Premium collections are available when your API key is linked to a Pro subscription or purchased packs.`,
  {
    query: z.string().describe('Search term (e.g. "heart", "login", "download arrow")'),
    library: z.string().optional().describe('Filter by library: lucide, tabler, phosphor, heroicons, bootstrap, iconoir, ionicons, material, simpleicons, mingcute, or premium pack names'),
    limit: z.number().min(1).max(50).optional().default(10).describe('Max results (1-50, default 10)'),
  },
  async ({ query, library, limit }) => {
    const accessibleIcons = getAccessibleIcons();

    // If user requests a premium library without Pro access, return 403-like message
    // Check if requesting premium library without access
    if (libraryMeta[library]?.premium && !hasLibraryAccess(library)) {
      return buildTextResponse(buildPremiumLibraryAccessError(libraryMeta[library].name));
    }

    const results = searchIcons(query, accessibleIcons, synonyms, { library, limit });
    if (results.length === 0) {
      return {
        content: [{ type: 'text', text: `No icons found for "${query}"${library ? ` in ${library}` : ''}.` }],
      };
    }
    const formatted = (await Promise.all(results.map(icon => buildToolIconResult(icon)))).filter(Boolean);
    if (formatted.length === 0) {
      return buildTextResponse(`Icons were found for "${query}"${library ? ` in ${library}` : ''}, but their SVG payloads could not be resolved right now.`);
    }
    return buildTextResponse({ results: formatted, source: 'Powered by SuperIcons (https://supericons.dev)' });
  }
);

// --- Tool: get_icon ---
server.tool(
  'get_icon',
  'Retrieve a specific icon by its ID and library. Returns the full SVG code and metadata. Premium icons require an API key linked to a Pro subscription or purchased packs.',
  {
    id: z.string().describe('Icon ID (e.g. "heart", "arrow-right", "settings")'),
    library: z.string().describe('Library name (e.g. "lucide", "tabler", "phosphor", or premium pack name)'),
  },
  async ({ id, library }) => {
    // Check if requesting premium library without access
    if (libraryMeta[library]?.premium && !hasLibraryAccess(library)) {
      return buildTextResponse({
        ...buildPremiumLibraryAccessError(libraryMeta[library].name),
        message: `Icon "${id}" is in the premium "${libraryMeta[library].name}" pack. Visit https://supericons.dev`,
      });
    }

    const result = await resolveAccessibleIcon(id, library);
    if (!result) {
      return buildTextResponse(`Icon "${id}" not found in library "${library}". Use search_icons to find available icons.`);
    }
    return buildTextResponse(result);
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
    return buildTextResponse(libs);
  }
);

// --- Tool: list_motion_presets ---
server.tool(
  'list_motion_presets',
  'List the Motion Lab presets currently available through Supericons MCP. Motion Lab MCP is a Pro workflow tool.',
  {},
  async () => {
    if (!hasProWorkflowAccess(authState)) {
      return buildWorkflowAccessResponse('Motion Lab MCP');
    }
    return buildTextResponse({
      presets: listMotionLabPresets(),
      source: 'Powered by SuperIcons Motion Lab',
    });
  }
);

// --- Tool: get_motion_recipe ---
server.tool(
  'get_motion_recipe',
  'Return a human-readable Motion Lab recipe for a preset, trigger, and duration. Motion Lab MCP is a Pro workflow tool.',
  {
    preset: z.string().describe('Motion preset id, for example pulse, bounce, spin, trace, or typing.'),
    trigger: z.enum(['loop', 'hover', 'click']).optional().default('loop').describe('How the animation should start.'),
    duration_ms: z.number().min(100).max(4000).optional().default(500).describe('Animation duration in milliseconds.'),
    intensity_percent: z.number().min(25).max(200).optional().default(100).describe('Intensity scaling for the preset.'),
  },
  async ({ preset, trigger, duration_ms, intensity_percent }) => {
    if (!hasProWorkflowAccess(authState)) {
      return buildWorkflowAccessResponse('Motion Lab MCP');
    }
    try {
      return buildTextResponse(buildMotionLabRecipe({
        presetId: preset,
        trigger,
        durationMs: duration_ms,
        intensityPercent: intensity_percent,
      }));
    } catch (error) {
      return buildTextResponse({ error: error.message });
    }
  }
);

// --- Tool: export_motion_css ---
server.tool(
  'export_motion_css',
  'Generate Motion Lab CSS for a Supericons icon. Motion Lab MCP is a Pro workflow tool.',
  {
    id: z.string().describe('Icon ID, for example heart, scan-virus, or fingerprint-scan.'),
    library: z.string().describe('Library or premium pack name.'),
    preset: z.string().describe('Motion preset id.'),
    trigger: z.enum(['loop', 'hover', 'click']).optional().default('loop').describe('How the animation should start.'),
    duration_ms: z.number().min(100).max(4000).optional().default(500).describe('Animation duration in milliseconds.'),
    intensity_percent: z.number().min(25).max(200).optional().default(100).describe('Intensity scaling for the preset.'),
  },
  async ({ id, library, preset, trigger, duration_ms, intensity_percent }) => {
    if (!hasProWorkflowAccess(authState)) {
      return buildWorkflowAccessResponse('Motion Lab MCP');
    }

    const icon = await resolveAccessibleIcon(id, library);
    if (!icon?.svg) {
      return buildTextResponse(`Icon "${id}" not found in library "${library}". Use search_icons to find available icons.`);
    }

    try {
      return buildTextResponse({
        id: icon.id,
        library: icon.library,
        preset: buildMotionLabRecipe({ presetId: preset, trigger, durationMs: duration_ms, intensityPercent: intensity_percent }),
        css: buildMotionLabExternalCss({
          presetId: preset,
          trigger,
          durationMs: duration_ms,
          intensityPercent: intensity_percent,
        }),
      });
    } catch (error) {
      return buildTextResponse({ error: error.message });
    }
  }
);

// --- Tool: export_animated_svg ---
server.tool(
  'export_animated_svg',
  'Generate a self-contained animated SVG using Motion Lab presets. Motion Lab MCP is a Pro workflow tool.',
  {
    id: z.string().describe('Icon ID, for example heart, scan-virus, or fingerprint-scan.'),
    library: z.string().describe('Library or premium pack name.'),
    preset: z.string().describe('Motion preset id.'),
    trigger: z.enum(['loop', 'hover', 'click']).optional().default('loop').describe('How the animation should start.'),
    duration_ms: z.number().min(100).max(4000).optional().default(500).describe('Animation duration in milliseconds.'),
    intensity_percent: z.number().min(25).max(200).optional().default(100).describe('Intensity scaling for the preset.'),
    color: z.string().optional().describe('Optional CSS color override for icons that inherit currentColor.'),
  },
  async ({ id, library, preset, trigger, duration_ms, intensity_percent, color }) => {
    if (!hasProWorkflowAccess(authState)) {
      return buildWorkflowAccessResponse('Motion Lab MCP');
    }

    const icon = await resolveAccessibleIcon(id, library);
    if (!icon?.svg) {
      return buildTextResponse(`Icon "${id}" not found in library "${library}". Use search_icons to find available icons.`);
    }

    try {
      return buildTextResponse({
        id: icon.id,
        library: icon.library,
        preset: buildMotionLabRecipe({ presetId: preset, trigger, durationMs: duration_ms, intensityPercent: intensity_percent }),
        animated_svg: buildMotionLabAnimatedSvg({
          svg: icon.svg,
          presetId: preset,
          trigger,
          durationMs: duration_ms,
          intensityPercent: intensity_percent,
          color: color || null,
        }),
      });
    } catch (error) {
      return buildTextResponse({ error: error.message });
    }
  }
);

// --- Tool: animate_icon ---
server.tool(
  'animate_icon',
  'Generate both Motion Lab CSS and a self-contained animated SVG for one icon. Motion Lab MCP is a Pro workflow tool.',
  {
    id: z.string().describe('Icon ID, for example heart, scan-virus, or fingerprint-scan.'),
    library: z.string().describe('Library or premium pack name.'),
    preset: z.string().describe('Motion preset id.'),
    trigger: z.enum(['loop', 'hover', 'click']).optional().default('loop').describe('How the animation should start.'),
    duration_ms: z.number().min(100).max(4000).optional().default(500).describe('Animation duration in milliseconds.'),
    intensity_percent: z.number().min(25).max(200).optional().default(100).describe('Intensity scaling for the preset.'),
    color: z.string().optional().describe('Optional CSS color override for icons that inherit currentColor.'),
  },
  async ({ id, library, preset, trigger, duration_ms, intensity_percent, color }) => {
    if (!hasProWorkflowAccess(authState)) {
      return buildWorkflowAccessResponse('Motion Lab MCP');
    }

    const icon = await resolveAccessibleIcon(id, library);
    if (!icon?.svg) {
      return buildTextResponse(`Icon "${id}" not found in library "${library}". Use search_icons to find available icons.`);
    }

    try {
      const bundle = buildMotionLabBundle({
        svg: icon.svg,
        presetId: preset,
        trigger,
        durationMs: duration_ms,
        intensityPercent: intensity_percent,
        color: color || null,
      });
      return buildTextResponse({
        id: icon.id,
        library: icon.library,
        recipe: bundle.preset,
        css: bundle.css,
        animated_svg: bundle.animated_svg,
      });
    } catch (error) {
      return buildTextResponse({ error: error.message });
    }
  }
);

// --- Tool: inspect_converter_options ---
server.tool(
  'inspect_converter_options',
  'List the current Converter MCP options and limits. Converter MCP is a Pro workflow tool.',
  {},
  async () => {
    if (!hasProWorkflowAccess(authState)) {
      return buildWorkflowAccessResponse('Converter MCP');
    }
    return buildTextResponse(getConverterMcpOptions());
  }
);

// --- Tool: convert_svg_to_png ---
server.tool(
  'convert_svg_to_png',
  'Convert an SVG string to PNG. Converter MCP is a Pro workflow tool.',
  {
    svg: z.string().describe('Raw SVG string to render.'),
    targetWidth: z.number().min(16).max(2048).optional().default(512).describe('Output width in pixels.'),
    background: z.string().optional().default('transparent').describe('Background color: `transparent` or a hex value like `#ffffff`.'),
  },
  async ({ svg, targetWidth, background }) => {
    if (!hasProWorkflowAccess(authState)) {
      return buildWorkflowAccessResponse('Converter MCP');
    }
    try {
      return buildTextResponse(convertSvgToPng({
        svg,
        targetWidth,
        background,
      }));
    } catch (error) {
      return buildTextResponse({ error: error.message });
    }
  }
);

// --- Tool: convert_png_to_svg ---
server.tool(
  'convert_png_to_svg',
  'Convert a PNG payload to SVG. Converter MCP is a Pro workflow tool.',
  {
    imageBase64: z.string().describe('PNG as base64 text or data URL.'),
    qualityMode: z.enum(['exact', 'compact']).optional().default('exact').describe('Tracing quality mode.'),
    colorMode: z.enum(['color', 'mono']).optional().default('color').describe('Tracing color mode.'),
    traceClass: z.enum(['general-color', 'flat-logo-color', 'tile-icon-color', 'tiny-line-icon', 'single-color-mark', 'mono-mask']).optional().default('general-color').describe('Tracing profile tuned for the source image.'),
    uiMode: z.enum(['logo', 'icon']).optional().default('logo').describe('Output bias for logo or icon-style artwork.'),
  },
  async ({ imageBase64, qualityMode, colorMode, traceClass, uiMode }) => {
    if (!hasProWorkflowAccess(authState)) {
      return buildWorkflowAccessResponse('Converter MCP');
    }
    try {
      return buildTextResponse(await convertPngToSvg({
        imageBase64,
        qualityMode,
        colorMode,
        traceClass,
        uiMode,
      }));
    } catch (error) {
      return buildTextResponse({ error: error.message });
    }
  }
);

// ============================================================
// Start
// ============================================================
await initAuth();
const transport = new StdioServerTransport();
await server.connect(transport);
