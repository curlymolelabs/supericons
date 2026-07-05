#!/usr/bin/env node
/**
 * SuperIcons MCP Server
 * Provides free icon search plus premium Motion Lab and Converter workflows.
 * Transport: stdio (for local IDE integration)
 * Auth: SUPERICONS_API_KEY env var for Pro workflow tools
 *
 * Premium access tiers:
 *   - Pro subscribers: Motion Lab and Converter workflow tools
 *   - Pack/Bundle buyers: purchased collections in the Supericons web app
 *   - Anonymous: free icon access only
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';
import { searchIconsHostedMcp } from './hosted-search-client.js';
import { recommendIconsForTask } from './recommend-icons.js';
import { validateApiKey } from './auth.js';
import {
  MATERIAL_EXPORT_DEFAULT_AXES,
  MATERIAL_EXPORT_STORAGE,
  buildMaterialCacheKey,
  buildMaterialOwnedSnapshotUrl,
  getMaterialManifestEntry,
  normalizeMaterialSnapshotSvg as normalizeOwnedMaterialSnapshotSvg,
} from './material-export.js';
import { listMotionLabPresets } from './motion-lab.js';
import {
  SUPPORTED_MCP_OUTPUT_LOCALES,
  localizeConverterOptions,
  localizeIconNotFoundHint,
  localizeMotionRecipe,
  localizeSearchNoResultsHint,
  localizeSelectorInstructions,
  localizeWorkflowAccessPayload,
} from './mcp-output-localization.js';
import {
  animateMotionLabIconHosted,
  getMotionLabRecipeHosted,
  renderMotionLabAnimatedSvgHosted,
  renderMotionLabCssHosted,
} from './motion-lab-client.js';
import {
  buildIntentQueryVariants,
  buildSearchIntentProfile,
  getIntentCandidateAdjustment,
} from './runtime/search-intent-core.js';
import { buildSearchQueryFrame } from './runtime/search-query-frame.js';
import {
  buildPreviewBoardUrlForIcons,
  buildPreviewImageUrl,
  buildPreviewMarkdownImage,
  buildSearchPreviewUrl,
  enrichPublicIconResult,
  getPublicLibraryMeta,
  parseIconRef,
} from './public-icon-preview.js';
import {
  buildIconContactSheetPng,
  buildPreviewTextPayload,
} from './preview-icons.js';
import { convertPngToSvg, convertSvgToPng, getConverterMcpOptions, inspectConverterInput } from './converter.js';
import {
  buildPremiumLibraryAccessError,
  buildProWorkflowAccessError,
  hasPremiumLibraryAccess,
  hasProWorkflowAccess,
} from './workflow-access.js';
import { logMcpSearchAttempt, logMcpSearchBatch } from './telemetry.js';
import {
  attachSemanticPayload,
  createSemanticRegistryMap,
  loadSemanticRegistryRecords,
  mergeSemanticMatchesIntoIcons,
} from './semantic-registry.js';
import {
  buildVariantLookupCandidates,
  compareVariantPreference,
  getConceptKeyForIcon,
  iconMatchesRequestedStyle,
  librarySupportsSolid,
  normalizeRequestedStyle,
  VARIANT_STYLES,
} from './variant-support.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ============================================================
// Data Loading
// ============================================================
const dataDir = join(__dirname, 'public');
const packsDir = join(dataDir, 'packs');
const manifestPath = join(packsDir, 'manifest.json');
const materialExportManifestPath = join(dataDir, 'material-export-manifest.json');
const materialExportDir = join(dataDir, 'material-export');
const productFactsPath = join(dataDir, 'product-facts.json');
const mcpPackagePath = join(__dirname, 'package.json');

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
const semanticRegistryMap = createSemanticRegistryMap(loadSemanticRegistryRecords(dataDir));

function loadData() {
  const iconIndexPath = join(dataDir, 'icon-index.json');
  if (!existsSync(iconIndexPath)) {
    return { freeIcons: [], outlineIcons: [], solidIcons: [], synonyms: {} };
  }

  const raw = JSON.parse(readFileSync(iconIndexPath, 'utf8'));
  const solidPath = join(dataDir, 'icon-index-solid.json');
  const solidRaw = existsSync(solidPath)
    ? JSON.parse(readFileSync(solidPath, 'utf8'))
    : { icons: [] };
  const synonymsPath = join(dataDir, 'synonyms.json');
  const synonyms = existsSync(synonymsPath)
    ? JSON.parse(readFileSync(synonymsPath, 'utf8'))
    : {};

  // icon-index.json has { icons: [...] } where each entry is { id, name, lib, type, style, svg? }
  // Include Material Symbols so MCP tools can resolve export-grade SVG snapshots on demand.
  const outlineIcons = raw.icons
    .filter(entry => (entry.type === 'svg' && entry.svg) || (entry.lib === 'material' && entry.type === 'font'))
    .map(icon => ({ ...icon, premium: false }));
  const solidIcons = (solidRaw.icons || [])
    .filter(entry => entry.type === 'svg' && entry.svg)
    .map(icon => ({ ...icon, premium: false }));
  const freeIcons = [...outlineIcons, ...solidIcons];

  return { freeIcons, outlineIcons, solidIcons, synonyms };
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

function loadProductFacts() {
  try {
    return JSON.parse(readFileSync(productFactsPath, 'utf8'));
  } catch {
    return null;
  }
}

function loadPackageMetadata() {
  try {
    return JSON.parse(readFileSync(mcpPackagePath, 'utf8'));
  } catch {
    return { version: '0.0.0' };
  }
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

function getMaterialExportAxes(style = VARIANT_STYLES.OUTLINE) {
  const manifest = loadMaterialExportManifest();
  const normalizedStyle = normalizeRequestedStyle(style);
  return {
    ...MATERIAL_EXPORT_DEFAULT_AXES,
    ...(manifest?.defaultAxes || {}),
    fill: normalizedStyle === VARIANT_STYLES.SOLID ? 1 : 0,
  };
}

function normalizeMaterialSnapshotSvg(rawSvg) {
  return normalizeOwnedMaterialSnapshotSvg(rawSvg);
}

async function resolveMaterialSnapshotSvg(icon, style = VARIANT_STYLES.OUTLINE) {
  const manifest = loadMaterialExportManifest();
  const axes = getMaterialExportAxes(style);
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

async function buildToolIconResult(icon, options = {}) {
  const requestedStyle = normalizeRequestedStyle(options.style);
  const resolvedStyle = icon.lib === 'material'
    ? (requestedStyle === VARIANT_STYLES.SOLID ? VARIANT_STYLES.SOLID : VARIANT_STYLES.OUTLINE)
    : (icon.style || VARIANT_STYLES.OUTLINE);
  let svg = icon.svg;
  let materialAxes = null;
  let svgSource = 'native-svg';

  if (icon.lib === 'material') {
    const resolved = await resolveMaterialSnapshotSvg(icon, resolvedStyle);
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
    style: resolvedStyle,
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

  if (icon.semantic) {
    result.semantic = icon.semantic;
  }

  return enrichPublicIconResult(
    attachSemanticPayload(result, semanticRegistryMap, icon),
    options,
  );
}

const { freeIcons, outlineIcons, solidIcons, synonyms } = loadData();
const premiumIcons = loadPremiumPacks();

// Combined icon set (auth determines which subset is searchable)
const allIcons = [...freeIcons, ...premiumIcons];

// ============================================================
// Auth State (resolved at startup)
// ============================================================
let authState = { authenticated: false, isPro: false, purchasedSlugs: [], userId: null, error: null };
const shouldLogStartupAuth = process.env.SUPERICONS_MCP_LOG_STARTUP === '1';

async function initAuth() {
  authState = await validateApiKey();
  if (shouldLogStartupAuth) {
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

function getResultKey(icon, requestedStyle) {
  const normalizedStyle = normalizeRequestedStyle(requestedStyle);
  if (normalizedStyle === VARIANT_STYLES.ANY) {
    return getConceptKeyForIcon(icon) || `${icon.lib}:${icon.id}:${icon.style || VARIANT_STYLES.OUTLINE}`;
  }
  return `${icon.lib}:${icon.id}:${icon.style || VARIANT_STYLES.OUTLINE}`;
}

function mergeOrderedSearchResults(primaryResults, secondaryResults, requestedStyle) {
  const normalizedStyle = normalizeRequestedStyle(requestedStyle);
  const selected = new Map();
  const orderedKeys = [];

  for (const icon of [...primaryResults, ...secondaryResults]) {
    const key = getResultKey(icon, normalizedStyle);
    const existing = selected.get(key);

    if (!existing) {
      selected.set(key, icon);
      orderedKeys.push(key);
      continue;
    }

    if (compareVariantPreference(existing, icon, normalizedStyle) > 0) {
      selected.set(key, icon);
    }
  }

  return orderedKeys.map((key) => selected.get(key));
}

function rerankIconsForIntent(query, icons) {
  const intentProfile = buildSearchIntentProfile(query);
  if (!intentProfile.expanded) return icons;

  return icons
    .map((icon, index) => {
      const adjustment = getIntentCandidateAdjustment(icon, intentProfile);
      return {
        icon,
        index,
        score: adjustment.boost - adjustment.penalty,
      };
    })
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      return left.index - right.index;
    })
    .map((entry) => entry.icon);
}

function choosePreferredIconCandidate(candidates, requestedStyle) {
  if (!Array.isArray(candidates) || candidates.length === 0) return null;
  return [...candidates].sort((left, right) => compareVariantPreference(left, right, requestedStyle))[0] || null;
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

function buildPreviewResponse(payload, { imagePng = null } = {}) {
  const content = [
    {
      type: 'text',
      text: JSON.stringify(payload, null, 2),
    },
  ];

  if (imagePng) {
    content.push({
      type: 'image',
      data: Buffer.from(imagePng).toString('base64'),
      mimeType: 'image/png',
    });
  }

  return {
    structuredContent: payload,
    content,
  };
}

async function resolvePreviewIconRef(ref, { style = VARIANT_STYLES.ANY } = {}) {
  const parsed = parseIconRef(ref);
  if (!parsed) return null;
  return resolveAccessibleIcon(parsed.id, parsed.library, { style });
}

function buildWorkflowAccessResponse(featureName, locale = null) {
  return buildTextResponse(localizeWorkflowAccessPayload(
    buildProWorkflowAccessError(authState, featureName),
    locale
  ));
}

function buildStructuredToolErrorResponse(error, fallbackMessage) {
  const payload = {
    error: typeof error?.message === 'string' ? error.message : fallbackMessage,
  };

  if (typeof error?.code === 'string') {
    payload.code = error.code;
  }
  if (typeof error?.hint === 'string') {
    payload.hint = error.hint;
  }
  if (typeof error?.retryable === 'boolean') {
    payload.retryable = error.retryable;
  }
  if (typeof error?.status === 'number') {
    payload.status = error.status;
  }
  if (typeof error?.retry_after_seconds === 'number') {
    payload.retry_after_seconds = error.retry_after_seconds;
  }
  if (typeof error?.limit_scope === 'string') {
    payload.limit_scope = error.limit_scope;
  }

  return buildTextResponse(payload);
}

function shouldAllowLocalSearchFallback() {
  const raw = String(process.env.SUPERICONS_ALLOW_LOCAL_SEARCH_FALLBACK || '').trim().toLowerCase();
  if (!raw) return false;
  return raw === '1' || raw === 'true' || raw === 'on';
}

function hasLocalSearchData() {
  return freeIcons.length > 0;
}

function buildHostedIcon(row) {
  if (!row?.icon_id) return null;
  const [libraryFromId, ...idParts] = String(row.icon_id).split(':');
  const library = row.library || row.source_library || libraryFromId;
  const id = idParts.join(':') || row.id || row.name;
  if (!library || !id) return null;
  if (!row.svg && library !== 'material') return null;

  return {
    id,
    name: row.name || id.replace(/[-_]/g, ' '),
    lib: library,
    type: row.icon_type || 'svg',
    style: row.style || VARIANT_STYLES.OUTLINE,
    svg: row.svg,
    semantic: row.semantic || null,
    premium: false,
    hosted: true,
  };
}

function buildSelectorInstructions(selectorMode, selectorToken) {
  if (selectorMode === 'literal') {
    return 'The CSS already includes the selector you supplied, so you can use it as returned without replacing any placeholder token.';
  }

  if (selectorToken) {
    return `Replace ${selectorToken} with the CSS selector that targets your inline <svg> element, for example ".settings-button svg" or "#login-icon svg".`;
  }

  return 'Use the returned CSS with the SVG selector that targets your inline icon element.';
}

function buildMotionLabIconLookupError(id, library, locale = null) {
  if (libraryMeta[library]?.premium && !hasLibraryAccess(library)) {
    return buildTextResponse({
      ...buildPremiumLibraryAccessError(
        libraryMeta[library].name,
        'Use a Pro-linked SUPERICONS_API_KEY or a key that includes access to this premium pack.'
      ),
      message: `Motion Lab could not export "${id}" from "${libraryMeta[library].name}" because this premium pack is not available to the current API key. Visit https://supericons.dev`,
    });
  }

  return buildTextResponse({
    error: 'Icon not found',
    code: 'icon_not_found',
    message: `Icon "${id}" not found in library "${library}". Use search_icons to find available icons.`,
    hint: 'Confirm the icon id and library, or call search_icons before exporting.',
    ...(localizeIconNotFoundHint(locale)
      ? {
          localized: {
            locale,
            hint: localizeIconNotFoundHint(locale),
          },
        }
      : {}),
    retryable: false,
  });
}

async function resolveAccessibleIcon(id, library, options = {}) {
  const requestedStyle = normalizeRequestedStyle(options.style);
  const accessibleIcons = getAccessibleIcons().filter((icon) => icon.lib.toLowerCase() === library.toLowerCase());

  for (const candidateId of buildVariantLookupCandidates({ library, id, style: requestedStyle })) {
    const candidates = accessibleIcons.filter((icon) =>
      icon.id.toLowerCase() === candidateId.toLowerCase() && iconMatchesRequestedStyle(icon, requestedStyle)
    );

    const chosen = choosePreferredIconCandidate(candidates, requestedStyle);
    if (chosen) {
      return buildToolIconResult(chosen, { style: requestedStyle });
    }
  }

  try {
    const hostedPayload = await searchIconsHostedMcp({
      query: id.replace(/[-_]+/g, ' '),
      library,
      limit: 50,
      style: requestedStyle,
      usageContext: buildLocalMcpUsageContext('get_icon', {
        request_id: `get_icon:${library}:${id}`,
      }),
    });
    const requestedIds = new Set(
      buildVariantLookupCandidates({ library, id, style: requestedStyle }).map((candidate) => candidate.toLowerCase())
    );
    const hostedIcon = (hostedPayload.results || [])
      .map(buildHostedIcon)
      .filter(Boolean)
      .find((icon) =>
        icon.lib.toLowerCase() === library.toLowerCase()
        && requestedIds.has(icon.id.toLowerCase())
        && iconMatchesRequestedStyle(icon, requestedStyle)
      );
    if (hostedIcon) {
      return buildToolIconResult(hostedIcon, { style: requestedStyle });
    }
  } catch (error) {
    if (!shouldAllowLocalSearchFallback() || !hasLocalSearchData()) {
      throw error;
    }
  }

  return null;
}

async function searchAccessibleIcons({
  query,
  library,
  limit,
  style = VARIANT_STYLES.ANY,
  locale = null,
  includeQueryFrame = false,
}) {
  const requestedStyle = normalizeRequestedStyle(style);
  const accessibleIcons = getAccessibleIcons();
  const searchableIcons = library
    ? accessibleIcons.filter((icon) => icon.lib === library && iconMatchesRequestedStyle(icon, requestedStyle))
    : accessibleIcons.filter((icon) => iconMatchesRequestedStyle(icon, requestedStyle));

  let hostedResults = [];
  try {
    const hostedPayload = await searchIconsHostedMcp({
      query,
      library,
      limit,
      style: requestedStyle,
      locale,
      includeQueryFrame,
      usageContext: buildLocalMcpUsageContext('search_icons'),
    });
    hostedResults = (hostedPayload.results || [])
      .map(buildHostedIcon)
      .filter((icon) => icon && iconMatchesRequestedStyle(icon, requestedStyle));
    if (hostedResults.length > 0) {
      return hostedResults.slice(0, Math.max(1, limit));
    }
  } catch (error) {
    if (!shouldAllowLocalSearchFallback() || !hasLocalSearchData()) {
      throw error;
    }
  }

  if (!hasLocalSearchData()) return [];

  const { searchIcons } = await import('./search.js');
  const localQueryVariants = buildIntentQueryVariants(query, { maxVariants: 10 });
  const localResults = [];
  const localSeen = new Set();

  for (const queryVariant of localQueryVariants) {
    const variantResults = searchIcons(queryVariant, searchableIcons, synonyms, {
      library,
      limit: Math.max(limit * 2, 20),
      style: requestedStyle,
      locale,
    });

    for (const icon of variantResults) {
      const key = `${icon.lib}:${icon.id}:${icon.style || VARIANT_STYLES.OUTLINE}`;
      if (localSeen.has(key)) continue;
      localSeen.add(key);
      localResults.push(icon);
    }
  }

  const baselineResults = requestedStyle === VARIANT_STYLES.SOLID
    ? localResults
    : mergeOrderedSearchResults(hostedResults, localResults, requestedStyle);

  const intentProfile = buildSearchIntentProfile(query);
  const semanticMergeLimit = intentProfile.expanded ? Math.max(limit * 4, 40) : limit;
  const merged = mergeSemanticMatchesIntoIcons(query, baselineResults, searchableIcons, semanticRegistryMap, {
    limit: semanticMergeLimit,
  });
  const intentRanked = rerankIconsForIntent(query, merged);
  return mergeOrderedSearchResults(intentRanked, [], requestedStyle).slice(0, Math.max(1, limit));
}

// ============================================================
// Library Metadata
// ============================================================
const libraryMeta = {
  material: { name: 'Material Symbols', description: 'Google Material Symbols with 4-axis variable font support', hasStroke: false, hasFilled: true, count: 4205, outlineCount: 4205, solidCount: 4205 },
  lucide: { name: 'Lucide', description: 'Beautiful, consistent open-source icons', hasStroke: true, hasFilled: false, count: 1951, outlineCount: 1951, solidCount: 0 },
  tabler: { name: 'Tabler', description: 'Over 5,000 free MIT-licensed SVG icons', hasStroke: true, hasFilled: true, count: 5021, outlineCount: 5021, solidCount: 1053 },
  phosphor: { name: 'Phosphor', description: 'Flexible icon family for interfaces and beyond', hasStroke: false, hasFilled: true, count: 1512, outlineCount: 1512, solidCount: 1512 },
  heroicons: { name: 'Heroicons', description: 'Beautiful hand-crafted SVG icons by Tailwind CSS', hasStroke: true, hasFilled: true, count: 324, outlineCount: 324, solidCount: 324 },
  bootstrap: { name: 'Bootstrap', description: 'Official open-source SVG icon library for Bootstrap', hasStroke: false, hasFilled: true, count: 1373, outlineCount: 1373, solidCount: 705 },
  iconoir: { name: 'Iconoir', description: 'High-quality open-source icon library', hasStroke: true, hasFilled: true, count: 1383, outlineCount: 1383, solidCount: 288 },
  ionicons: { name: 'Ionicons', description: 'Premium open-source icons for Ionic Framework', hasStroke: true, hasFilled: true, count: 421, outlineCount: 421, solidCount: 515 },
  simpleicons: { name: 'Simple Icons', description: '3,400+ SVG icons for popular brands', hasStroke: false, hasFilled: false, count: 3412, outlineCount: 3412, solidCount: 0 },
  mingcute: { name: 'MingCute', description: 'Modern open-source icon set with broad interface coverage', hasStroke: false, hasFilled: true, count: 1662, outlineCount: 1662, solidCount: 1662 },
  si: { name: 'Supericons', description: 'First-party AI and developer tool logos curated for agentic app builders', hasStroke: false, hasFilled: false, count: 50, outlineCount: 50, solidCount: 0 },
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
const outlineLibCounts = {};
for (const icon of outlineIcons) {
  outlineLibCounts[icon.lib] = (outlineLibCounts[icon.lib] || 0) + 1;
}
const solidLibCounts = {};
for (const icon of solidIcons) {
  solidLibCounts[icon.lib] = (solidLibCounts[icon.lib] || 0) + 1;
}
const freeLibraryCount = Object.values(libraryMeta).filter(meta => !meta.premium).length;
const productFacts = loadProductFacts();
const mcpPackage = loadPackageMetadata();
const freeIconCountLabel = productFacts?.display?.freeIconsAcrossLibrariesFreeLabel
  || `${freeIcons.length.toLocaleString()} free icons across ${freeLibraryCount} libraries`;
const mcpLocaleSchema = z.enum(SUPPORTED_MCP_OUTPUT_LOCALES);
const mcpLocaleDescription = `Optional locale for multilingual output. Supported values: ${SUPPORTED_MCP_OUTPUT_LOCALES.join(', ')}.`;

function buildLocalMcpUsageContext(toolName, context = {}) {
  return {
    source: 'mcp',
    channel: 'local_mcp',
    environment: 'local',
    client_family: 'mcp_stdio',
    tool_name: toolName,
    mcp_server_version: mcpPackage.version,
    ...context,
  };
}

// ============================================================
// MCP Server
// ============================================================
const server = new McpServer({
  name: 'supericons',
  version: mcpPackage.version,
});

// --- Tool: search_icons ---
server.tool(
  'search_icons',
  `Search ${freeIconCountLabel} using AI-powered synonym expansion. Returns matching free icons with SVG code, explicit public library labels, browser preview URLs, and SI semantic guidance when available, including Supericons AI and developer tool logos. Library key si means Supericons, not Simple Icons. Pro API keys unlock workflow tools; premium pack icon search is not exposed through MCP yet.`,
  {
    query: z.string().describe('Search term (e.g. "heart", "login", "download arrow")'),
    library: z.string().optional().describe('Filter by free library: si (Supericons AI and developer tool logos), lucide, tabler, phosphor, heroicons, bootstrap, iconoir, ionicons, material, simpleicons (Simple Icons brand logos), or mingcute'),
    style: z.enum(['any', 'outline', 'solid']).optional().default('any').describe('Optional style preference. Use `solid` only for libraries that ship fill or solid variants.'),
    locale: z.enum(['zh-Hans', 'zh-Hant', 'ja', 'ko', 'es', 'de', 'pt', 'ar', 'hi', 'vi', 'th']).optional().describe('Optional locale for multilingual search terms. Supported values: zh-Hans, zh-Hant, ja, ko, es, de, pt, ar, hi, vi, th.'),
    limit: z.number().min(1).max(50).optional().default(10).describe('Max results (1-50, default 10)'),
    include_query_frame: z.boolean().optional().default(false).describe('Optional public-safe diagnostics for query understanding. Leave false for normal compact responses.'),
  },
  async ({ query, library, style, locale, limit, include_query_frame }) => {
    // If user requests a premium library without Pro access, return 403-like message
    // Check if requesting premium library without access
    if (libraryMeta[library]?.premium && !hasLibraryAccess(library)) {
      return buildTextResponse(buildPremiumLibraryAccessError(libraryMeta[library].name));
    }

    let results;
    const queryFrame = include_query_frame ? buildSearchQueryFrame(query, { locale }) : null;
    try {
      results = await searchAccessibleIcons({
        query,
        library,
        style,
        locale,
        limit,
        includeQueryFrame: include_query_frame,
      });
    } catch (error) {
      return buildStructuredToolErrorResponse(error, 'SuperIcons search is unavailable.');
    }

    if (results.length === 0) {
      void logMcpSearchAttempt({
        query,
        resultCount: 0,
        libraryFilter: library || 'all',
        locale: locale || null,
      });
      return buildTextResponse({
        error: 'No icons found',
        code: 'no_icons_found',
        query,
        library: library || null,
        locale: locale || null,
        hint: locale
          ? 'Try a broader term in the same language, remove the library filter, or search with an English concept.'
          : 'Try a broader term, remove the library filter, or add locale when searching with a non-English term.',
        ...(localizeSearchNoResultsHint(locale, Boolean(locale))
          ? {
              localized: {
                locale,
                hint: localizeSearchNoResultsHint(locale, Boolean(locale)),
              },
            }
          : {}),
        ...(queryFrame ? { query_frame: queryFrame } : {}),
        retryable: true,
      });
    }
    const formatted = (await Promise.all(results.map(icon => buildToolIconResult(icon, {
      style,
      query,
      library,
      locale,
      limit,
    })))).filter(Boolean);
    if (formatted.length === 0) {
      void logMcpSearchAttempt({
        query,
        resultCount: 0,
        libraryFilter: library || 'all',
        locale: locale || null,
      });
      return buildTextResponse(`Icons were found for "${query}"${library ? ` in ${library}` : ''}, but their SVG payloads could not be resolved right now.`);
    }
    void logMcpSearchAttempt({
      query,
      resultCount: formatted.length,
      libraryFilter: library || 'all',
      locale: locale || null,
    });
    void logMcpSearchBatch({
      query,
      results: formatted,
      locale: locale || null,
    });
    return buildTextResponse({
      results: formatted,
      preview_url: buildSearchPreviewUrl({ query, library, style, locale, limit }),
      ...(queryFrame ? { query_frame: queryFrame } : {}),
      source: 'Powered by SuperIcons (https://supericons.dev)',
    });
  }
);

// --- Tool: recommend_icons ---
server.tool(
  'recommend_icons',
  'Recommend the most suitable icons for one or more UI slots. Returns shortlist choices with preview-ready SVGs, explicit public library labels, browser preview URLs, short reasons, and SI semantic guidance when available. Library key si means Supericons, not Simple Icons.',
  {
    task: z.string().describe('Overall UI task, for example "replace the 4 bottom navigation icons" or "choose icons for a settings panel".'),
    library: z.string().optional().describe('Optional library filter such as si (Supericons), mingcute, lucide, tabler, material, or simpleicons (Simple Icons).'),
    style: z.enum(['any', 'outline', 'solid']).optional().default('any').describe('Optional style preference. Use `solid` to prefer filled variants where they exist.'),
    locale: z.enum(['zh-Hans', 'zh-Hant', 'ja', 'ko', 'es', 'de', 'pt', 'ar', 'hi', 'vi', 'th']).optional().describe('Optional locale for multilingual slot labels. Supported values: zh-Hans, zh-Hant, ja, ko, es, de, pt, ar, hi, vi, th.'),
    slots: z.array(z.string().min(1)).min(1).max(12).describe('List of UI slots to fill, for example ["Home tab", "Create action", "Alerts tab", "Profile tab"].'),
    limit_per_slot: z.number().min(1).max(5).optional().default(3).describe('How many choices to return per slot, including the top recommendation.'),
    response_mode: z.enum(['plan', 'assets', 'full']).optional().default('plan').describe('Response size mode. Use plan for compact icon IDs and reasons, assets to include SVG only for each top recommendation, or full to include SVG and semantic payloads for all returned choices.'),
    include_query_frame: z.boolean().optional().default(false).describe('Optional public-safe diagnostics for query understanding. Leave false for normal compact responses.'),
  },
  async ({ task, library, style, locale, slots, limit_per_slot, response_mode, include_query_frame }) => {
    if (libraryMeta[library]?.premium && !hasLibraryAccess(library)) {
      return buildTextResponse(buildPremiumLibraryAccessError(libraryMeta[library].name));
    }

    try {
      const payload = await recommendIconsForTask({
        task,
        library,
        style,
        locale,
        slots,
        limitPerSlot: limit_per_slot,
        responseMode: response_mode,
        includeQueryFrame: include_query_frame,
        semanticMap: semanticRegistryMap,
        searchIconsForQuery: ({ query, library: searchLibrary, style: searchStyle, limit, locale: searchLocale }) =>
          searchAccessibleIcons({ query, library: searchLibrary, style: searchStyle, limit, locale: searchLocale }),
        buildIconResult: (icon, options = {}) => buildToolIconResult(icon, {
          ...options,
          library,
          locale,
          limit: limit_per_slot,
        }),
      });

      return buildTextResponse({
        ...payload,
        preview_url: buildPreviewBoardUrlForIcons(
          (payload.results || []).flatMap((slot) => [
            slot.recommended?.icon_ref,
            ...(Array.isArray(slot.alternatives) ? slot.alternatives.map((icon) => icon.icon_ref) : []),
          ]).filter(Boolean),
        ),
        source: 'Powered by SuperIcons (https://supericons.dev)',
      });
    } catch (error) {
      return buildStructuredToolErrorResponse(error, 'SuperIcons icon recommendation is unavailable.');
    }
  }
);

// --- Tool: get_icon ---
server.tool(
  'get_icon',
  'Retrieve a specific free icon by its ID and library. Returns the full SVG code, metadata, explicit public library labels, browser preview URL, and SI semantic guidance when available. Premium pack icon retrieval is not exposed through MCP yet.',
  {
    id: z.string().describe('Icon ID (e.g. "heart", "arrow-right", "settings")'),
    library: z.string().describe('Free library key, for example si (Supericons), lucide, tabler, phosphor, iconoir, mingcute, or simpleicons (Simple Icons).'),
    style: z.enum(['any', 'outline', 'solid']).optional().default('any').describe('Optional style preference. Use `solid` to request a filled variant when the library supports it.'),
  },
  async ({ id, library, style }) => {
    // Check if requesting premium library without access
    if (libraryMeta[library]?.premium && !hasLibraryAccess(library)) {
      return buildTextResponse({
        ...buildPremiumLibraryAccessError(libraryMeta[library].name),
        message: `Icon "${id}" is in the premium "${libraryMeta[library].name}" pack. Visit https://supericons.dev`,
      });
    }

    const result = await resolveAccessibleIcon(id, library, { style });
    if (!result) {
      return buildTextResponse(`Icon "${id}" not found in library "${library}". Use search_icons to find available icons.`);
    }
    return buildTextResponse(result);
  }
);

// --- Tool: preview_icons ---
server.tool(
  'preview_icons',
  'Create a visual preview for icon search results or a fixed list of icon refs. Returns a browser preview page, direct PNG image URL, ready-made Markdown image snippet, and, when requested, an MCP image contact sheet. Use markdown_image in final answers when the client supports remote Markdown images; otherwise share image_url or preview_url.',
  {
    query: z.string().optional().describe('Optional search query to preview visually, for example "license plate recognition camera scan car".'),
    icon_refs: z.array(z.string()).min(1).max(12).optional().describe('Optional fixed icon refs in library:id format, for example ["si:x-ai", "mingcute:scan_2_line"].'),
    library: z.string().optional().describe('Optional library filter such as si (Supericons), mingcute, lucide, tabler, material, or simpleicons (Simple Icons).'),
    style: z.enum(['any', 'outline', 'solid']).optional().default('any').describe('Optional style preference.'),
    locale: z.enum(['zh-Hans', 'zh-Hant', 'ja', 'ko', 'es', 'de', 'pt', 'ar', 'hi', 'vi', 'th']).optional().describe('Optional locale for multilingual search terms.'),
    limit: z.number().min(1).max(12).optional().default(9).describe('Maximum icons to include in the preview. Keep this small for image-capable clients.'),
    include_image: z.boolean().optional().default(true).describe('When true, include a PNG contact sheet as MCP image content. A preview_url is always returned.'),
  },
  async ({ query, icon_refs, library, style, locale, limit, include_image }) => {
    if (!query && (!Array.isArray(icon_refs) || icon_refs.length === 0)) {
      return buildTextResponse({
        error: 'Provide either query or icon_refs.',
      });
    }

    let icons = [];
    if (Array.isArray(icon_refs) && icon_refs.length > 0) {
      icons = (await Promise.all(
        icon_refs.slice(0, limit).map((ref) => resolvePreviewIconRef(ref, { style })),
      )).filter(Boolean);
    } else {
      const results = await searchAccessibleIcons({
        query,
        library,
        style,
        locale,
        limit,
      });
      icons = (await Promise.all(results.map((icon) => buildToolIconResult(icon, {
        style,
        query,
        library,
        locale,
        limit,
      })))).filter(Boolean);
    }

    const previewUrl = Array.isArray(icon_refs) && icon_refs.length > 0
      ? buildPreviewBoardUrlForIcons(icons.map((icon) => icon.icon_ref).filter(Boolean))
      : buildSearchPreviewUrl({ query, library, style, locale, limit });
    const previewImageOptions = Array.isArray(icon_refs) && icon_refs.length > 0
      ? {
        iconRefs: icons.map((icon) => icon.icon_ref).filter(Boolean),
        library,
        style,
        locale,
        limit,
      }
      : {
        query,
        library,
        style,
        locale,
        limit,
      };
    const imageUrl = icons.length > 0
      ? buildPreviewImageUrl(previewImageOptions)
      : null;
    const markdownImage = imageUrl
      ? buildPreviewMarkdownImage(previewImageOptions)
      : null;
    const payload = buildPreviewTextPayload({
      query: query || null,
      icons,
      previewUrl,
      imageUrl,
      markdownImage,
      imageIncluded: Boolean(include_image && icons.length > 0),
    });

    let imagePng = null;
    if (include_image && icons.length > 0) {
      imagePng = buildIconContactSheetPng(icons, {
        title: query ? `Supericons preview: ${query}` : 'Supericons icon preview',
      });
    }

    return buildPreviewResponse(payload, { imagePng });
  }
);

// --- Tool: list_libraries ---
server.tool(
  'list_libraries',
  'List the free icon libraries available through Supericons MCP with their names, icon counts, and descriptions.',
  {},
  async () => {
    const libs = Object.entries(libraryMeta).map(([id, meta]) => ({
      id,
      name: meta.name,
      label: getPublicLibraryMeta(id, { name: meta.name, description: meta.description }).label,
      count: libCounts[id] || meta.count || 0,
      outlineCount: outlineLibCounts[id] || meta.outlineCount || 0,
      solidCount: id === 'material'
        ? (librarySupportsSolid(id) ? outlineLibCounts[id] || meta.solidCount || meta.outlineCount || 0 : 0)
        : (solidLibCounts[id] || meta.solidCount || 0),
      hasStroke: meta.hasStroke,
      hasFilled: meta.hasFilled || librarySupportsSolid(id),
      supportedStyles: meta.hasFilled || librarySupportsSolid(id) ? ['outline', 'solid'] : ['outline'],
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
  'List the Motion Lab presets currently available through Supericons MCP, including preset id, label, group, description, and supported triggers. Motion Lab MCP is a Pro workflow tool.',
  {
    locale: mcpLocaleSchema.optional().describe(mcpLocaleDescription),
  },
  async ({ locale }) => {
    if (!hasProWorkflowAccess(authState)) {
      return buildWorkflowAccessResponse('Motion Lab MCP', locale);
    }
    return buildTextResponse({
      presets: listMotionLabPresets(locale),
      source: 'Powered by SuperIcons Motion Lab',
    });
  }
);

// --- Tool: get_motion_recipe ---
server.tool(
  'get_motion_recipe',
  'Return a human-readable Motion Lab recipe for a preset, trigger, and duration. Use this before export tools when you want to compare presets or confirm the motion fit. Motion Lab MCP is a Pro workflow tool.',
  {
    preset: z.string().describe('Motion preset id, for example pulse, bounce, spin, trace, or typing.'),
    trigger: z.enum(['loop', 'hover', 'click']).optional().default('loop').describe('How the animation should start.'),
    duration_ms: z.number().min(100).max(4000).optional().default(500).describe('Animation duration in milliseconds.'),
    intensity_percent: z.number().min(25).max(200).optional().default(100).describe('Intensity scaling for the preset.'),
    locale: mcpLocaleSchema.optional().describe(mcpLocaleDescription),
  },
  async ({ preset, trigger, duration_ms, intensity_percent, locale }) => {
    if (!hasProWorkflowAccess(authState)) {
      return buildWorkflowAccessResponse('Motion Lab MCP', locale);
    }
    try {
      const recipe = await getMotionLabRecipeHosted({
        preset,
        trigger,
        duration_ms,
        intensity_percent,
      });
      return buildTextResponse(localizeMotionRecipe(recipe, locale));
    } catch (error) {
      return buildStructuredToolErrorResponse(error, 'Motion Lab recipe generation failed.');
    }
  }
);

// --- Tool: export_motion_css ---
server.tool(
  'export_motion_css',
  'Generate Motion Lab CSS for a Supericons icon. The returned CSS uses a portable {{ICON_SELECTOR}} token you replace with your inline SVG selector. Call get_motion_recipe first if you want to compare presets before exporting. Motion Lab MCP is a Pro workflow tool.',
  {
    id: z.string().describe('Icon ID, for example heart, scan-virus, or fingerprint-scan.'),
    library: z.string().describe('Free icon library key, for example lucide, tabler, phosphor, iconoir, or mingcute.'),
    preset: z.string().describe('Motion preset id.'),
    trigger: z.enum(['loop', 'hover', 'click']).optional().default('loop').describe('How the animation should start.'),
    duration_ms: z.number().min(100).max(4000).optional().default(500).describe('Animation duration in milliseconds.'),
    intensity_percent: z.number().min(25).max(200).optional().default(100).describe('Intensity scaling for the preset.'),
    locale: mcpLocaleSchema.optional().describe(mcpLocaleDescription),
  },
  async ({ id, library, preset, trigger, duration_ms, intensity_percent, locale }) => {
    if (!hasProWorkflowAccess(authState)) {
      return buildWorkflowAccessResponse('Motion Lab MCP', locale);
    }

    const icon = await resolveAccessibleIcon(id, library);
    if (!icon?.svg) {
      return buildMotionLabIconLookupError(id, library, locale);
    }

    try {
      const cssResponse = await renderMotionLabCssHosted({
        preset,
        trigger,
        duration_ms,
        intensity_percent,
      });
      return buildTextResponse({
        id: icon.id,
        library: icon.library,
        preset: localizeMotionRecipe(
          await getMotionLabRecipeHosted({ preset, trigger, duration_ms, intensity_percent }),
          locale
        ),
        css: cssResponse.css,
        selector_mode: cssResponse.selector_mode,
        ...(cssResponse.selector_token ? { selector_token: cssResponse.selector_token } : {}),
        selector_instructions: buildSelectorInstructions(cssResponse.selector_mode, cssResponse.selector_token),
        ...(localizeSelectorInstructions(cssResponse.selector_mode, cssResponse.selector_token, locale)
          ? {
              localized_selector_instructions: localizeSelectorInstructions(
                cssResponse.selector_mode,
                cssResponse.selector_token,
                locale
              ),
            }
          : {}),
      });
    } catch (error) {
      return buildStructuredToolErrorResponse(error, 'Motion Lab CSS export failed.');
    }
  }
);

// --- Tool: export_animated_svg ---
server.tool(
  'export_animated_svg',
  'Generate a self-contained animated SVG using Motion Lab presets. Call get_motion_recipe first if you want to compare presets before exporting. Motion Lab MCP is a Pro workflow tool.',
  {
    id: z.string().describe('Icon ID, for example heart, scan-virus, or fingerprint-scan.'),
    library: z.string().describe('Free icon library key, for example lucide, tabler, phosphor, iconoir, or mingcute.'),
    preset: z.string().describe('Motion preset id.'),
    trigger: z.enum(['loop', 'hover', 'click']).optional().default('loop').describe('How the animation should start.'),
    duration_ms: z.number().min(100).max(4000).optional().default(500).describe('Animation duration in milliseconds.'),
    intensity_percent: z.number().min(25).max(200).optional().default(100).describe('Intensity scaling for the preset.'),
    color: z.string().optional().describe('Optional CSS color override for icons that inherit currentColor.'),
    locale: mcpLocaleSchema.optional().describe(mcpLocaleDescription),
  },
  async ({ id, library, preset, trigger, duration_ms, intensity_percent, color, locale }) => {
    if (!hasProWorkflowAccess(authState)) {
      return buildWorkflowAccessResponse('Motion Lab MCP', locale);
    }

    const icon = await resolveAccessibleIcon(id, library);
    if (!icon?.svg) {
      return buildMotionLabIconLookupError(id, library, locale);
    }

    try {
      const animatedSvgResponse = await renderMotionLabAnimatedSvgHosted({
        svg: icon.svg,
        preset,
        trigger,
        duration_ms,
        intensity_percent,
        color: color || null,
      });
      return buildTextResponse({
        id: icon.id,
        library: icon.library,
        preset: localizeMotionRecipe(
          await getMotionLabRecipeHosted({ preset, trigger, duration_ms, intensity_percent }),
          locale
        ),
        animated_svg: animatedSvgResponse.animated_svg,
        ...(animatedSvgResponse.applied_color ? { applied_color: animatedSvgResponse.applied_color } : {}),
      });
    } catch (error) {
      return buildStructuredToolErrorResponse(error, 'Motion Lab animated SVG export failed.');
    }
  }
);

// --- Tool: animate_icon ---
server.tool(
  'animate_icon',
  'Generate both Motion Lab CSS and a self-contained animated SVG for one icon. The CSS output uses a portable {{ICON_SELECTOR}} token you replace with your inline SVG selector. Call get_motion_recipe first if you want to compare presets before exporting. Motion Lab MCP is a Pro workflow tool.',
  {
    id: z.string().describe('Icon ID, for example heart, scan-virus, or fingerprint-scan.'),
    library: z.string().describe('Free icon library key, for example lucide, tabler, phosphor, iconoir, or mingcute.'),
    preset: z.string().describe('Motion preset id.'),
    trigger: z.enum(['loop', 'hover', 'click']).optional().default('loop').describe('How the animation should start.'),
    duration_ms: z.number().min(100).max(4000).optional().default(500).describe('Animation duration in milliseconds.'),
    intensity_percent: z.number().min(25).max(200).optional().default(100).describe('Intensity scaling for the preset.'),
    color: z.string().optional().describe('Optional CSS color override for icons that inherit currentColor.'),
    locale: mcpLocaleSchema.optional().describe(mcpLocaleDescription),
  },
  async ({ id, library, preset, trigger, duration_ms, intensity_percent, color, locale }) => {
    if (!hasProWorkflowAccess(authState)) {
      return buildWorkflowAccessResponse('Motion Lab MCP', locale);
    }

    const icon = await resolveAccessibleIcon(id, library);
    if (!icon?.svg) {
      return buildMotionLabIconLookupError(id, library, locale);
    }

    try {
      const bundle = await animateMotionLabIconHosted({
        svg: icon.svg,
        preset,
        trigger,
        duration_ms,
        intensity_percent,
        color: color || null,
      });
      return buildTextResponse({
        id: icon.id,
        library: icon.library,
        recipe: localizeMotionRecipe(bundle.recipe, locale),
        css: bundle.css,
        animated_svg: bundle.animated_svg,
        selector_mode: bundle.selector_mode,
        ...(bundle.selector_token ? { selector_token: bundle.selector_token } : {}),
        selector_instructions: buildSelectorInstructions(bundle.selector_mode, bundle.selector_token),
        ...(localizeSelectorInstructions(bundle.selector_mode, bundle.selector_token, locale)
          ? {
              localized_selector_instructions: localizeSelectorInstructions(
                bundle.selector_mode,
                bundle.selector_token,
                locale
              ),
            }
          : {}),
        ...(bundle.applied_color ? { applied_color: bundle.applied_color } : {}),
      });
    } catch (error) {
      return buildStructuredToolErrorResponse(error, 'Motion Lab bundle export failed.');
    }
  }
);

// --- Tool: inspect_converter_options ---
server.tool(
  'inspect_converter_options',
  'List the current Converter MCP options, workflow hints, and recommended starting combinations. Converter MCP is a Pro workflow tool.',
  {
    locale: mcpLocaleSchema.optional().describe(mcpLocaleDescription),
  },
  async ({ locale }) => {
    if (!hasProWorkflowAccess(authState)) {
      return buildWorkflowAccessResponse('Converter MCP', locale);
    }
    return buildTextResponse(localizeConverterOptions(getConverterMcpOptions(), locale));
  }
);

// --- Tool: inspect_converter_input ---
server.tool(
  'inspect_converter_input',
  'Inspect a PNG before tracing. Returns structural hints, likely risks, and recommended starting settings for Converter MCP.',
  {
    imageBase64: z.string().describe('PNG as base64 text or data URL.'),
    mimeType: z.string().optional().describe('Optional MIME type override. Only image/png is currently supported.'),
    locale: mcpLocaleSchema.optional().describe(mcpLocaleDescription),
  },
  async ({ imageBase64, mimeType, locale }) => {
    if (!hasProWorkflowAccess(authState)) {
      return buildWorkflowAccessResponse('Converter MCP', locale);
    }
    try {
      return buildTextResponse(inspectConverterInput({
        imageBase64,
        mimeType,
      }));
    } catch (error) {
      return buildTextResponse({ error: error.message });
    }
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
    locale: mcpLocaleSchema.optional().describe(mcpLocaleDescription),
  },
  async ({ svg, targetWidth, background, locale }) => {
    if (!hasProWorkflowAccess(authState)) {
      return buildWorkflowAccessResponse('Converter MCP', locale);
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
    locale: mcpLocaleSchema.optional().describe(mcpLocaleDescription),
  },
  async ({ imageBase64, qualityMode, colorMode, traceClass, uiMode, locale }) => {
    if (!hasProWorkflowAccess(authState)) {
      return buildWorkflowAccessResponse('Converter MCP', locale);
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
