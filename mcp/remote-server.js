#!/usr/bin/env node
/**
 * Supericons hosted MCP server.
 *
 * This exposes a Streamable HTTP MCP endpoint for hosted directories and agents.
 * The local stdio package in index.js remains the main IDE setup.
 */
import { existsSync, readFileSync } from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import express from 'express';
import { z } from 'zod';
import { classifyMcpTraffic, extractReturnedIconRefs } from './usage-event-detail.js';
import {
  getGroupedHostedSearchResilienceStatus,
  getHostedSearchResilienceStatus,
  searchIconQueriesHostedMcp,
  searchIconsHostedMcp,
} from './hosted-search-client.js';
import { getMaterialBundleStatus, hydrateMaterialHostedRows } from './material-hydration.js';
import { SUPABASE_URL } from './auth.js';
import { searchIcons as searchLocalIcons } from './search.js';
import { recommendIconsForTask } from './recommend-icons.js';
import {
  buildPreviewBoardUrlForIcons,
  buildPreviewImageUrl,
  buildPreviewMarkdownImage,
  buildSearchPreviewUrl,
  enrichPublicIconResult,
  getPublicLibraryMeta,
  parseIconRef,
} from './public-icon-preview.js';
import { buildIconContactSheetPng, buildPreviewTextPayload } from './preview-icons.js';
import {
  SEARCH_TOOL_SERVER_INSTRUCTIONS,
  buildRecommendationFailurePresentation,
  buildSearchFailurePresentation,
  buildSearchMatchPresentation,
  buildSearchNoResultPresentation,
  coerceToolBoolean,
  coerceToolIconRefs,
  coerceToolNumber,
  coerceToolSlots,
  coerceToolString,
  normalizePreviewToolArguments,
  normalizeRecommendationToolArguments,
  normalizeSearchToolArguments,
} from './search-tool-shell.js';
import { buildIntentQueryVariants } from './runtime/search-intent-core.js';
import { buildSearchQueryFrame } from './runtime/search-query-frame.js';
import { getBetaCohortForTool } from './release-channel.js';
import { verifyControlledRunHeaders } from './controlled-run-auth.js';
import {
  createRailwayCandidateIndex,
  createRailwayRecommendationSearch,
  createRailwaySearchRoute,
  isRailwayLocalFirstEnabled,
} from './railway-local-search.js';
import { buildLibraryCapability } from './library-capabilities.js';
import { buildMcpUsageDedupeKey } from './usage-dedupe.js';
import { deriveMcpQueryOrigin, getMcpRequestedLimit, resolveCountryContext } from './usage-attribution.js';
import {
  buildPublicSemanticPayload,
  createSemanticRegistryMap,
  getSemanticRecordForIcon,
  loadSemanticRegistryRecords,
} from './semantic-registry.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, 'public');
const packageJson = JSON.parse(readFileSync(join(__dirname, 'package.json'), 'utf8'));
const productFacts = JSON.parse(readFileSync(join(dataDir, 'product-facts.json'), 'utf8'));
const registrySummary = JSON.parse(readFileSync(join(dataDir, 'registry-summary.json'), 'utf8'));
const iconIndexPath = join(dataDir, 'icon-index.json');
const solidIconIndexPath = join(dataDir, 'icon-index-solid.json');
const synonymsPath = join(dataDir, 'synonyms.json');
const iconIndex = existsSync(iconIndexPath) ? JSON.parse(readFileSync(iconIndexPath, 'utf8')) : { icons: [] };
const solidIconIndex = existsSync(solidIconIndexPath)
  ? JSON.parse(readFileSync(solidIconIndexPath, 'utf8'))
  : { icons: [] };
const synonyms = existsSync(synonymsPath) ? JSON.parse(readFileSync(synonymsPath, 'utf8')) : {};
const publicIcons = [
  ...(Array.isArray(iconIndex?.icons) ? iconIndex.icons : []),
  ...(Array.isArray(solidIconIndex?.icons) ? solidIconIndex.icons : []),
];
const previewExactIconIndex = new Map();
for (const icon of publicIcons) {
  if (!icon?.lib || !icon?.id) continue;
  const refKey = `${icon.lib}:${icon.id}`.toLowerCase();
  const styleKey = String(icon.style || 'outline').toLowerCase();
  let styles = previewExactIconIndex.get(refKey);
  if (!styles) {
    styles = new Map();
    previewExactIconIndex.set(refKey, styles);
  }
  if (!styles.has(styleKey)) styles.set(styleKey, icon);
}
const semanticMap = createSemanticRegistryMap(loadSemanticRegistryRecords(dataDir));
const railwayLocalFirstEnabled = isRailwayLocalFirstEnabled();
const MCP_USAGE_WRITE_TIMEOUT_MS = 500;
const railwayCandidateIndex = createRailwayCandidateIndex({
  icons: publicIcons,
  synonyms,
  getSearchValues: (icon) => {
    const semanticRecord = getSemanticRecordForIcon(semanticMap, icon?.lib, icon?.id);
    return [
      icon?.id,
      icon?.name,
      semanticRecord?.label,
      semanticRecord?.purpose,
      semanticRecord?.depicts,
      ...(semanticRecord?.semantic_tags || []),
      ...(semanticRecord?.synonyms || []),
      semanticRecord?.use_when,
    ].filter(Boolean);
  },
});
const RAILWAY_RECOMMENDATION_CACHE_LIMIT = 512;
const railwayRecommendationSearchCache = new Map();
const mcpApiKeyAccountCache = new Map();
const MCP_API_KEY_ACCOUNT_CACHE_MS = 5 * 60 * 1000;

const LIBRARIES = [
  ['bootstrap', 'Bootstrap', 'Official Bootstrap SVG icons'],
  ['heroicons', 'Heroicons', 'Interface icons by Tailwind Labs'],
  ['iconoir', 'Iconoir', 'Open-source outline and solid icons'],
  ['ionicons', 'Ionicons', 'Icons for app and interface design'],
  ['lucide', 'Lucide', 'Consistent open-source outline icons'],
  ['material', 'Material Symbols', 'Google Material Symbols'],
  ['mingcute', 'MingCute', 'Modern interface icons'],
  ['phosphor', 'Phosphor', 'Flexible icon family'],
  ['si', 'Supericons', 'AI and developer tool logos curated for agentic app builders'],
  ['simpleicons', 'Simple Icons', 'Brand and product icons'],
  ['tabler', 'Tabler', 'Large open-source SVG icon library'],
];
const libraryCounts = new Map(
  (Array.isArray(iconIndex?.libraries) ? iconIndex.libraries : []).map((entry) => [entry.id, Number(entry.count || 0)]),
);
const hostedOutlineCounts = Object.fromEntries(libraryCounts);

const libraryKeysDescription =
  'Supported values include si (Supericons AI and developer tool logos), lucide, tabler, phosphor, heroicons, bootstrap, iconoir, ionicons, material, simpleicons (Simple Icons brand logos), and mingcute.';
const multilingualLocaleValues = ['zh-Hans', 'zh-Hant', 'ja', 'ko', 'es', 'de', 'pt', 'ar', 'hi', 'vi', 'th'];
const multilingualLocaleDescription =
  'Optional locale for multilingual search terms. Supported values: zh-Hans, zh-Hant, ja, ko, es, de, pt, ar, hi, vi, th.';
const forgivingStringSchema = z.preprocess(coerceToolString, z.string());
const forgivingNonEmptyStringSchema = z.preprocess(coerceToolString, z.string().min(1));
const forgivingSearchLimitSchema = z.preprocess(coerceToolNumber, z.number().min(1).max(50));
const forgivingPreviewLimitSchema = z.preprocess(coerceToolNumber, z.union([z.number(), z.string()]));
const forgivingRecommendationLimitSchema = z.preprocess(coerceToolNumber, z.union([z.number(), z.string()]));
const forgivingRecommendationSlotsSchema = z.preprocess(coerceToolSlots, z.array(z.string()));
const forgivingBooleanSchema = z.preprocess(coerceToolBoolean, z.boolean());
const previewStyles = new Set(['any', 'outline', 'solid']);
const previewLocales = new Set(multilingualLocaleValues);

const auditedSearchAnnotations = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: false,
};

const readOnlyLookupAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

const publicIconResultSchema = z.object({
  id: z.string().describe('Icon ID without the library prefix.'),
  name: z.string().describe('Human-readable icon name.'),
  library: z.string().describe('Source icon library key.'),
  library_key: z.string().describe('Source icon library key repeated for explicit agent display.'),
  library_name: z.string().describe('Public source library name, for example Supericons or Simple Icons.'),
  library_label: z.string().describe('Public source library label, for example Supericons (si).'),
  libraryName: z.string().optional().describe('Legacy camelCase public source library name.'),
  icon_ref: z.string().describe('Stable icon reference in library:id format.'),
  icon_preview_url: z.string().nullable().describe('Browser URL for visual inspection of this icon.'),
  search_preview_url: z
    .string()
    .nullable()
    .optional()
    .describe('Browser URL for visual inspection of the source search results.'),
  type: z.string().describe('Icon asset type, normally svg.'),
  style: z.string().describe('Icon style such as outline or solid.'),
  svg: z.string().describe('Inline SVG markup for the icon.'),
  semantic: z
    .record(z.unknown())
    .nullable()
    .optional()
    .describe('Public semantic guidance for search and agent selection.'),
});

const libraryResultSchema = z.object({
  id: z.string().describe('Library key used in tool calls.'),
  name: z.string().describe('Human-readable library name.'),
  label: z.string().optional().describe('Human-readable library label with key, for example Supericons (si).'),
  description: z.string().describe('Brief public description of the icon library.'),
  count: z.number().describe('Number of icons in the library.'),
  outlineCount: z.number().describe('Number of outline icons served by the hosted MCP server.'),
  solidCount: z.number().describe('Number of solid icons served by the hosted MCP server.'),
  supportedStyles: z.array(z.enum(['outline', 'solid'])).describe('Styles verified on the hosted serving path.'),
});

const previewIconResultSchema = z.object({
  id: z.string().describe('Icon ID without the library prefix.'),
  name: z.string().describe('Human-readable icon name.'),
  library: z.string().describe('Source icon library key.'),
  library_key: z.string().describe('Source icon library key repeated for explicit agent display.'),
  library_name: z.string().optional().describe('Public source library name, for example Supericons or Simple Icons.'),
  library_label: z.string().optional().describe('Public source library label, for example Supericons (si).'),
  icon_ref: z.string().describe('Stable icon reference in library:id format.'),
  icon_preview_url: z.string().nullable().optional().describe('Browser URL for visual inspection of this icon.'),
  style: z.string().optional().describe('Icon style such as outline or solid.'),
  semantic: z
    .record(z.unknown())
    .nullable()
    .optional()
    .describe('Public semantic guidance for search and agent selection.'),
});

const searchIconsOutputSchema = {
  results: z.array(publicIconResultSchema).describe('Matching icons with SVG code and semantic guidance.'),
  library_mode: z.enum(['strict', 'prefer', 'all']).describe('Library behavior used for this search.'),
  requested_library: z.string().nullable().describe('Preferred or required library, when supplied.'),
  preview_url: z.string().optional().describe('Browser URL for visual inspection of this search result set.'),
  image_url: z.string().optional().describe('Direct PNG URL when usable icons exist.'),
  markdown_image: z.string().optional().describe('Ready-made Markdown image when usable icons exist.'),
  suggested_response_markdown: z.string().describe('Compact answer that accurately reflects this response.'),
  next_step: z.string().describe('Useful next action for the caller.'),
  warnings: z.array(z.string()).optional().describe('Unsupported optional inputs that were safely ignored.'),
  error: z.string().optional().describe('Plain-language error for a structured no-result.'),
  code: z.string().optional().describe('Stable code for a structured no-result.'),
  hint: z.string().optional().describe('Plain-language recovery hint for a structured no-result.'),
  retryable: z.boolean().optional().describe('Whether changing the query or filters may produce a result.'),
  status: z.number().optional().describe('HTTP status from an upstream search failure.'),
  retry_after_seconds: z.number().optional().describe('Seconds to wait before retrying a rate-limited search.'),
  limit_scope: z.string().optional().describe('Allowance scope reported by a rate limit.'),
  details: z.record(z.unknown()).optional().describe('Structured rate-limit or upstream failure details.'),
  query_frame: z.record(z.unknown()).optional().describe('Optional public-safe query understanding diagnostics.'),
  search_runtime: z
    .object({
      mode: z.enum(['local_first', 'local_fallback', 'hosted_fallback', 'hosted', 'hosted_fused']),
      fallback_used: z.boolean(),
      hosted_search_calls: z.number(),
      local_failure_code: z.string().nullable(),
      local_fusion_used: z.boolean().optional(),
      index_generated_at: z.string(),
    })
    .optional()
    .describe('Search execution path used for this request.'),
};

const recommendIconsOutputSchema = {
  task: z.string().describe('Original UI task.'),
  library: z.string().optional().describe('Library filter used for recommendations, if provided.'),
  style: z.string().optional().describe('Style preference used for recommendations.'),
  response_mode: z.enum(['plan', 'assets', 'full']).describe('Response size mode used for this recommendation.'),
  slot_count: z.number().describe('Number of UI slots requested.'),
  all_slots_resolved: z
    .boolean()
    .describe('Whether every requested slot received a recommendation without clarification.'),
  needs_clarification: z.boolean().describe('Whether one or more ambiguous slots require more context.'),
  clarification_slots: z.array(z.string()).describe('Slots that need the caller to choose an interpretation.'),
  low_confidence_slots: z.array(z.string()).describe('Slots whose result is missing or has low confidence.'),
  fallback_recommended: z.boolean().describe('Whether the caller should consider direct search or clarification.'),
  preview_url: z.string().optional().describe('Browser URL for visual inspection of the recommended icon set.'),
  query_frame: z
    .record(z.unknown())
    .optional()
    .describe('Optional public-safe query understanding diagnostics for the task.'),
  results: z.array(z.record(z.unknown())).describe('Recommended icon choices grouped by requested UI slot.'),
  warnings: z.array(z.string()).optional().describe('Unsupported optional inputs that were safely ignored or clamped.'),
  error: z.string().optional().describe('Plain-language reason the recommendation did not complete.'),
  code: z.string().optional().describe('Stable error code for programmatic recovery.'),
  hint: z.string().optional().describe('Plain-language recovery instruction.'),
  retryable: z.boolean().optional().describe('Whether a corrected or later request may succeed.'),
  status: z.number().optional().describe('HTTP status from a hosted dependency failure.'),
  retry_after_seconds: z.number().optional().describe('Seconds to wait before retrying a rate-limited recommendation.'),
  details: z.record(z.unknown()).optional().describe('Structured limits or failure details.'),
  suggested_response_markdown: z
    .string()
    .optional()
    .describe('Plain-language explanation suitable for the agent response.'),
  next_step: z.string().optional().describe('Useful next action for the caller.'),
  search_runtime: z
    .object({
      mode: z.enum(['local_first', 'hosted_fallback', 'hosted']),
      fallback_used: z.boolean(),
      hosted_search_calls: z.number(),
      local_failure_code: z.string().nullable(),
      index_generated_at: z.string(),
    })
    .optional()
    .describe('Search execution path used for this recommendation.'),
};

const previewIconsOutputSchema = {
  query: z.string().nullable().optional().describe('Search query used for the visual preview, if any.'),
  preview_url: z.string().describe('Browser URL for visual inspection.'),
  image_url: z
    .string()
    .nullable()
    .optional()
    .describe('Direct PNG URL for clients or Markdown renderers that can show remote images.'),
  markdown_image: z
    .string()
    .nullable()
    .optional()
    .describe('Ready-made Markdown image snippet for final answers in clients that render remote Markdown images.'),
  image_included: z.boolean().describe('Whether this response includes MCP image content.'),
  rendered_count: z.number().describe('Number of icons rendered in the inline preview.'),
  browser_preview_count: z.number().describe('Number of accepted icon refs available at preview_url.'),
  truncated_from: z.number().optional().describe('Original icon ref count when the input was truncated.'),
  warnings: z.array(z.string()).optional().describe('Unsupported optional inputs that were safely ignored.'),
  next_step: z.string().describe('Useful next action for the caller.'),
  client_display_note: z.string().describe('Plain-language note for clients that do not render images inline.'),
  error: z.string().optional().describe('Recoverable error message when preview inputs are missing or invalid.'),
  results: z.array(previewIconResultSchema).describe('Icons included in the visual preview.'),
};

const getIconOutputSchema = {
  icon: publicIconResultSchema.optional().describe('Exact matching icon when found.'),
  error: z.string().optional().describe('Recoverable error message when no exact icon is found.'),
};

const listLibrariesOutputSchema = {
  libraries: z.array(libraryResultSchema).describe('Free icon libraries available through this hosted MCP server.'),
  publicRecordCount: z
    .number()
    .describe('Number of public semantic icon records searchable through the hosted MCP server.'),
};

function asStructured(payload, { isError = false } = {}) {
  return {
    structuredContent: payload,
    content: [
      {
        type: 'text',
        text: JSON.stringify(payload, null, 2),
      },
    ],
    ...(isError ? { isError: true } : {}),
  };
}

function normalizeHostedIcon(row) {
  if (!row?.icon_id) {
    const error = new Error('Hosted search returned a result without an icon ID.');
    error.code = 'search_result_invalid';
    throw error;
  }
  const [libraryFromId, ...idParts] = String(row.icon_id).split(':');
  const library = row.library || row.source_library || libraryFromId;
  const id = idParts.join(':') || row.id || row.name;
  if (!library || !id) {
    const error = new Error(`Hosted search returned an invalid icon reference: ${row.icon_id}.`);
    error.code = 'search_result_invalid';
    throw error;
  }
  if (!row.svg) {
    const error = new Error(`Hosted search returned a result without usable SVG: ${row.icon_id}.`);
    error.code = library === 'material' ? 'material_asset_unavailable' : 'search_result_svg_unavailable';
    throw error;
  }

  const icon = {
    id,
    name: row.name || id.replace(/[-_]/g, ' '),
    library,
    lib: library,
    type: row.icon_type || 'svg',
    style: row.style || 'outline',
    svg: row.svg,
    semantic: row.semantic || null,
  };

  const semanticRecord = getSemanticRecordForIcon(semanticMap, library, id);
  return {
    ...icon,
    semantic: buildPublicSemanticPayload(semanticRecord) || icon.semantic || null,
  };
}

function getHostedRowIdentity(row) {
  const [libraryFromId, ...idParts] = String(row?.icon_id || '').split(':');
  return {
    library: row?.library || row?.source_library || libraryFromId || null,
    id: idParts.join(':') || row?.id || row?.name || null,
  };
}

function isExactHostedRow(row, library, id) {
  const identity = getHostedRowIdentity(row);
  return identity.library === library && String(identity.id || '').toLowerCase() === String(id || '').toLowerCase();
}

function normalizeLocalIcon(icon) {
  if (!icon?.id || !icon?.lib || !icon?.svg) return null;

  const semanticRecord = getSemanticRecordForIcon(semanticMap, icon.lib, icon.id);
  return {
    id: icon.id,
    name: icon.name || icon.id.replace(/[-_]/g, ' '),
    library: icon.lib,
    lib: icon.lib,
    type: icon.type || 'svg',
    style: icon.style || 'outline',
    svg: icon.svg,
    semantic: buildPublicSemanticPayload(semanticRecord) || null,
  };
}

function searchLocalFallbackIcons({
  query,
  library,
  libraryMode = 'strict',
  style = 'any',
  limit = 20,
  locale = null,
  expandIntentVariants = true,
  iconPool = publicIcons,
}) {
  if (iconPool.length === 0) return [];

  const queryVariants = expandIntentVariants ? buildIntentQueryVariants(query, { maxVariants: 10 }) : [query];
  const results = [];
  const seen = new Set();

  for (const queryVariant of queryVariants) {
    const variantResults = searchLocalIcons(queryVariant, iconPool, synonyms, {
      library: library || null,
      libraryMode,
      style,
      limit: Math.max(limit * 2, 20),
      locale,
    });

    for (const icon of variantResults) {
      const normalized = normalizeLocalIcon(icon);
      if (!normalized) continue;
      const key = `${normalized.library}:${normalized.id}:${normalized.style || 'outline'}`;
      if (seen.has(key)) continue;
      seen.add(key);
      results.push(normalized);
    }
  }

  return results.slice(0, Math.max(1, limit));
}

async function searchRailwayLocalIcons(params) {
  const cacheKey = JSON.stringify([
    String(params.query || '')
      .trim()
      .toLowerCase(),
    String(params.library || '')
      .trim()
      .toLowerCase(),
    String(params.libraryMode || 'strict')
      .trim()
      .toLowerCase(),
    String(params.style || 'any')
      .trim()
      .toLowerCase(),
    Number(params.limit) || 20,
    String(params.locale || '')
      .trim()
      .toLowerCase(),
    params.candidateOnly === true,
  ]);
  const cached = railwayRecommendationSearchCache.get(cacheKey);
  if (cached) {
    railwayRecommendationSearchCache.delete(cacheKey);
    railwayRecommendationSearchCache.set(cacheKey, cached);
    return cached;
  }

  const limit = Math.max(1, Number(params.limit) || 20);
  let results;
  if (params.candidateOnly === true && params.library === 'material') {
    results = await searchHostedIcons(params);
  } else if (params.candidateOnly === true) {
    const candidateIcons = railwayCandidateIndex.select(params.query);
    results = searchLocalFallbackIcons({
      query: params.query,
      library: params.library,
      libraryMode: params.libraryMode || 'strict',
      style: params.style,
      limit,
      locale: params.locale,
      expandIntentVariants: false,
      iconPool: candidateIcons,
    });
  } else {
    const rankedIcons = searchLocalIcons(params.query, publicIcons, synonyms, {
      library: params.library || null,
      libraryMode: params.libraryMode || 'strict',
      style: params.style || 'any',
      limit,
      locale: params.locale || null,
    });
    const rankedRows = rankedIcons.map((icon) => ({
      icon_id: `${icon.lib}:${icon.id}`,
      id: icon.id,
      name: icon.name || icon.id.replace(/[-_]/g, ' '),
      library: icon.lib,
      source_library: icon.lib,
      icon_type: icon.type || 'svg',
      style: icon.style || 'outline',
      svg: icon.svg || null,
    }));
    const hydration = await hydrateMaterialHostedRows(rankedRows, {
      style: params.style || 'any',
      onError: (error) => console.error('[SuperIcons] Railway Material hydration failed:', error.message),
    });
    results = hydration.kept.map(normalizeHostedIcon).slice(0, limit);
  }

  railwayRecommendationSearchCache.set(cacheKey, results);
  if (railwayRecommendationSearchCache.size > RAILWAY_RECOMMENDATION_CACHE_LIMIT) {
    const oldestKey = railwayRecommendationSearchCache.keys().next().value;
    railwayRecommendationSearchCache.delete(oldestKey);
  }
  return results;
}

function shouldUseLocalFallbackForHostedError(error) {
  const status = Number(error?.status);
  if (Number.isFinite(status) && status >= 400 && status < 500) return false;
  return true;
}

function searchLocalMaterialRows({ query, limit = 20, locale = null, exactIconId = null }) {
  if (exactIconId) {
    const exact = publicIcons.find(
      (icon) => icon?.lib === 'material' && String(icon.id).toLowerCase() === exactIconId.toLowerCase(),
    );
    if (!exact) return [];
    return [
      {
        icon_id: `material:${exact.id}`,
        id: exact.id,
        name: exact.name || exact.id.replace(/[-_]/g, ' '),
        library: 'material',
        icon_type: 'font',
        style: 'outline',
        svg: null,
      },
    ];
  }

  const normalizedQuery = String(query || '')
    .trim()
    .toLowerCase();
  const tokens = normalizedQuery.split(/\s+/).filter(Boolean);
  const directSynonyms = tokens.flatMap((token) => synonyms[token] || []);
  const reverseSynonyms = Object.entries(synonyms)
    .filter(
      ([, values]) => Array.isArray(values) && values.some((value) => tokens.includes(String(value).toLowerCase())),
    )
    .map(([key]) => key);
  const queryVariants = [
    ...new Set(
      [normalizedQuery, ...directSynonyms, ...reverseSynonyms, ...buildIntentQueryVariants(query, { maxVariants: 10 })]
        .map((value) => String(value || '').trim())
        .filter(Boolean),
    ),
  ].slice(0, 16);
  const rows = [];
  const seen = new Set();
  const rankedByVariant = queryVariants.map((queryVariant) =>
    searchLocalIcons(queryVariant, publicIcons, synonyms, {
      library: 'material',
      libraryMode: 'strict',
      style: 'any',
      limit: Math.max(limit, 20),
      locale,
    }),
  );

  for (let rank = 0; rows.length < Math.max(1, limit); rank += 1) {
    let foundAtRank = false;
    for (const variantResults of rankedByVariant) {
      const icon = variantResults[rank];
      if (!icon) continue;
      foundAtRank = true;
      if (icon?.lib !== 'material' || !icon.id || seen.has(icon.id)) continue;
      seen.add(icon.id);
      rows.push({
        icon_id: `material:${icon.id}`,
        id: icon.id,
        name: icon.name || icon.id.replace(/[-_]/g, ' '),
        library: 'material',
        icon_type: 'font',
        style: 'outline',
        svg: null,
      });
      if (rows.length >= Math.max(1, limit)) break;
    }
    if (!foundAtRank) break;
  }

  return rows;
}

async function finishHostedIconSearch({
  rankedRows,
  query,
  library,
  libraryMode = 'strict',
  style = 'any',
  limit = 20,
  locale = null,
  exactIconId = null,
  hostedLibrary = library,
  expandLocalIntentVariants = true,
  allowLocalEmptyFallback = true,
}) {
  const selectedRows = exactIconId
    ? rankedRows.filter((row) => isExactHostedRow(row, hostedLibrary, exactIconId)).slice(0, 1)
    : rankedRows.slice(0, Math.max(1, limit));
  const hydration = await hydrateMaterialHostedRows(selectedRows, {
    style,
    onError: (error) => console.error('[SuperIcons] Material hydration failed:', error.message),
  });
  const selectedMaterialRows = selectedRows.filter((row) => getHostedRowIdentity(row).library === 'material');
  if (hydration.failed > 0 && selectedMaterialRows.length > 0 && hydration.kept.length === 0) {
    const error = new Error('Material assets are temporarily unavailable from the snapshot service.');
    error.code = 'material_asset_unavailable';
    throw error;
  }

  const hostedResults = hydration.kept.map(normalizeHostedIcon).slice(0, Math.max(1, limit));
  if (hostedResults.length > 0) return hostedResults;
  if (!allowLocalEmptyFallback) return [];

  const fallbackResults = searchLocalFallbackIcons({
    query,
    library,
    libraryMode,
    style,
    limit,
    locale,
    expandIntentVariants: expandLocalIntentVariants,
  });
  return exactIconId
    ? fallbackResults
        .filter((icon) => icon.library === library && icon.id.toLowerCase() === exactIconId.toLowerCase())
        .slice(0, 1)
    : fallbackResults;
}

async function searchHostedIcons({
  query,
  library,
  libraryMode = 'strict',
  style = 'any',
  limit = 20,
  locale = null,
  includeQueryFrame = false,
  usageContext = null,
  exactIconId = null,
  allowLocalEmptyFallback = true,
}) {
  // Material is the only library with verified solid support in the stable
  // hosted catalog. Its rows are tagged outline, so solid searches must rank
  // Material without the engine style filter and select the solid asset here.
  const allModeMaterialSolid = libraryMode === 'all' && style === 'solid';
  const hostedLibrary = allModeMaterialSolid ? 'material' : library;
  const hostedLibraryMode = allModeMaterialSolid ? 'strict' : libraryMode;
  const hostedStyle = hostedLibrary === 'material' && style === 'solid' ? 'any' : style;
  const hostedLimit = exactIconId ? Math.max(limit, 50) : limit;
  const useLocalMaterialRanking = hostedLibrary === 'material' && hostedLibraryMode === 'strict';

  let rankedRows;
  if (useLocalMaterialRanking) {
    rankedRows = searchLocalMaterialRows({
      query,
      limit: hostedLimit,
      locale,
      exactIconId,
    });
  } else {
    const payload = await searchIconsHostedMcp({
      query,
      library: hostedLibrary || null,
      libraryMode: hostedLibraryMode,
      style: hostedStyle,
      limit: hostedLimit,
      locale,
      includeQueryFrame,
      usageContext,
    });
    rankedRows = Array.isArray(payload.results) ? payload.results : [];
  }

  return await finishHostedIconSearch({
    rankedRows,
    query,
    library,
    libraryMode,
    style,
    limit,
    locale,
    exactIconId,
    hostedLibrary,
    allowLocalEmptyFallback,
  });
}

async function searchHostedIconQueries(queries = [], { usageContextForQuery } = {}) {
  let payloads;
  try {
    payloads = await searchIconQueriesHostedMcp({
      queries: queries.map((query, index) => ({
        ...query,
        libraryMode: 'strict',
        routeToolName: 'recommend_icons',
        usageContext: typeof usageContextForQuery === 'function' ? usageContextForQuery(query, index) : null,
      })),
    });
  } catch (error) {
    if (!shouldUseLocalFallbackForHostedError(error)) throw error;
    const fallbackResults = queries.map((query) =>
      searchLocalFallbackIcons({
        query: query.query,
        library: query.library,
        libraryMode: 'strict',
        style: query.style,
        limit: query.limit,
        locale: query.locale,
        expandIntentVariants: false,
      }),
    );
    if (fallbackResults.every((results) => results.length > 0)) {
      return fallbackResults;
    }
    throw error;
  }

  return await Promise.all(
    payloads.map(async (payload, index) => {
      const query = queries[index] || {};
      const limit = Math.max(1, Number(query.limit) || 10);
      try {
        return await finishHostedIconSearch({
          rankedRows: Array.isArray(payload.results) ? payload.results : [],
          query: query.query,
          library: query.library,
          libraryMode: 'strict',
          style: query.style,
          limit,
          locale: query.locale,
          expandLocalIntentVariants: false,
        });
      } catch (error) {
        if (!shouldUseLocalFallbackForHostedError(error)) throw error;
        const fallbackResults = searchLocalFallbackIcons({
          query: query.query,
          library: query.library,
          libraryMode: 'strict',
          style: query.style,
          limit,
          locale: query.locale,
          expandIntentVariants: false,
        });
        if (fallbackResults.length > 0) return fallbackResults;
        throw error;
      }
    }),
  );
}

function buildPublicIconResult(icon, options = {}) {
  const result = {
    id: icon.id,
    name: icon.name,
    library: icon.library,
    type: icon.type,
    style: icon.style,
    svg: icon.svg,
    semantic: icon.semantic,
  };
  return enrichPublicIconResult(result, options);
}

function getLocalPreviewIconSource(ref, { style = 'any' } = {}) {
  const parsed = parseIconRef(ref);
  if (!parsed) return null;
  const styles = previewExactIconIndex.get(`${parsed.library}:${parsed.id}`.toLowerCase());
  if (!styles) return null;

  if (parsed.library.toLowerCase() === 'material') {
    return styles.get('outline') || styles.get('solid') || styles.values().next().value || null;
  }
  if (style === 'outline' || style === 'solid') {
    return styles.get(style) || null;
  }
  return styles.get('outline') || styles.get('solid') || styles.values().next().value || null;
}

async function resolveLocalPreviewIconRefs(refs, { style = 'any' } = {}) {
  const selected = [];
  const unresolvedRefs = [];

  for (const ref of refs) {
    const source = getLocalPreviewIconSource(ref, { style });
    if (!source) {
      unresolvedRefs.push(ref);
      continue;
    }
    selected.push({
      ref,
      row: {
        icon_id: `${source.lib}:${source.id}`,
        id: source.id,
        name: source.name || source.id.replace(/[-_]/g, ' '),
        library: source.lib,
        source_library: source.lib,
        icon_type: source.type || 'svg',
        style: source.style || 'outline',
        svg: source.svg || null,
      },
    });
  }

  const hydration = await hydrateMaterialHostedRows(
    selected.map((entry) => entry.row),
    {
      style,
      onError: (error) => console.error('[SuperIcons] Preview Material hydration failed:', error.message),
    },
  );
  const keptRows = new Set(hydration.kept);
  for (const entry of selected) {
    if (!keptRows.has(entry.row)) unresolvedRefs.push(entry.ref);
  }

  return {
    icons: hydration.kept.map((row) => buildPublicIconResult(normalizeHostedIcon(row), { style })),
    unresolvedRefs,
  };
}

function firstQueryValue(value) {
  return Array.isArray(value) ? value[0] : value;
}

function createPreviewHttpError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

function normalizePreviewLimit(limit) {
  const value = Number.parseInt(String(limit ?? ''), 10);
  if (!Number.isFinite(value)) return 9;
  return Math.min(12, Math.max(1, value));
}

function normalizePreviewText(value, { maxLength = 240 } = {}) {
  const text = String(firstQueryValue(value) || '').trim();
  if (!text) return '';
  if (text.length > maxLength) {
    throw createPreviewHttpError(
      400,
      'preview_query_too_long',
      `Preview query must be ${maxLength} characters or fewer.`,
    );
  }
  return text;
}

function normalizePreviewStyle(value) {
  const style = String(firstQueryValue(value) || 'any').trim() || 'any';
  if (!previewStyles.has(style)) {
    throw createPreviewHttpError(400, 'invalid_style', 'Preview style must be one of: any, outline, solid.');
  }
  return style;
}

function normalizePreviewLocale(value) {
  const locale = String(firstQueryValue(value) || '').trim();
  if (!locale) return undefined;
  if (!previewLocales.has(locale)) {
    throw createPreviewHttpError(
      400,
      'invalid_locale',
      `Preview locale must be one of: ${multilingualLocaleValues.join(', ')}.`,
    );
  }
  return locale;
}

function normalizePreviewIconRefs(input, limit) {
  const values = Array.isArray(input) ? input : [input];
  const refs = values
    .flatMap((value) => String(value || '').split(','))
    .map((value) => value.trim())
    .filter(Boolean);
  const uniqueRefs = [];
  const seen = new Set();
  for (const ref of refs) {
    if (ref.length > 160) {
      throw createPreviewHttpError(400, 'invalid_icon_ref', 'Preview icon refs must be 160 characters or fewer.');
    }
    if (!parseIconRef(ref)) {
      throw createPreviewHttpError(400, 'invalid_icon_ref', 'Preview icon refs must use library:id format.');
    }
    const key = ref.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    uniqueRefs.push(ref);
    if (uniqueRefs.length >= limit) break;
  }
  return uniqueRefs;
}

function parsePreviewRouteParams(query = {}) {
  const limit = normalizePreviewLimit(firstQueryValue(query.limit));
  const iconRefs = normalizePreviewIconRefs(query.icons ?? query.icon_refs, limit);
  const searchQuery = normalizePreviewText(query.q ?? query.query);
  if (!searchQuery && iconRefs.length === 0) {
    throw createPreviewHttpError(400, 'preview_input_required', 'Provide q/query or icons/icon_refs.');
  }
  return {
    query: searchQuery || undefined,
    iconRefs,
    library: normalizePreviewText(query.library, { maxLength: 48 }) || undefined,
    style: normalizePreviewStyle(query.style),
    locale: normalizePreviewLocale(query.locale),
    limit,
  };
}

function buildDirectPreviewImageFields({ query, iconRefs = [], library, style, locale, limit, icons = [] } = {}) {
  if (!icons.length) {
    return {
      imageUrl: null,
      markdownImage: null,
    };
  }
  const resolvedRefs = iconRefs.length ? icons.map((icon) => icon.icon_ref).filter(Boolean) : [];
  const imageOptions = {
    query: iconRefs.length ? null : query,
    iconRefs: resolvedRefs,
    library,
    style,
    locale,
    limit,
  };
  const imageUrl = buildPreviewImageUrl(imageOptions);
  return {
    imageUrl,
    markdownImage: buildPreviewMarkdownImage(imageOptions),
  };
}

async function buildHostedPreviewModel({
  query,
  iconRefs = [],
  browserIconRefs = [],
  library,
  style = 'any',
  locale,
  limit = 9,
  includeImage = false,
  usageContext = null,
  truncatedFrom = null,
  warnings = [],
} = {}) {
  const effectiveLimit = normalizePreviewLimit(limit);
  const fixedRefs = normalizePreviewIconRefs(iconRefs, effectiveLimit);
  const searchQuery = normalizePreviewText(query);
  const previewWarnings = [...warnings];
  let icons;
  if (fixedRefs.length > 0) {
    const resolved = await resolveLocalPreviewIconRefs(fixedRefs, { style });
    icons = resolved.icons;
    if (resolved.unresolvedRefs.length > 0) {
      previewWarnings.push(`Could not resolve icon refs: ${resolved.unresolvedRefs.join(', ')}.`);
    }
  } else {
    icons = (
      await searchHostedIcons({
        query: searchQuery,
        library,
        style,
        locale,
        limit: effectiveLimit,
        usageContext,
      })
    ).map((icon) =>
      buildPublicIconResult(icon, {
        query: searchQuery,
        library,
        style,
        locale,
        limit: effectiveLimit,
      }),
    );
  }

  const previewUrl =
    fixedRefs.length > 0
      ? buildPreviewBoardUrlForIcons(normalizePreviewIconRefs(browserIconRefs.length ? browserIconRefs : fixedRefs, 24))
      : buildSearchPreviewUrl({
          query: searchQuery,
          library,
          style,
          locale,
          limit: effectiveLimit,
        });
  const { imageUrl, markdownImage } = buildDirectPreviewImageFields({
    query: searchQuery,
    iconRefs: fixedRefs,
    library,
    style,
    locale,
    limit: effectiveLimit,
    icons,
  });

  return {
    icons,
    previewUrl,
    imageUrl,
    markdownImage,
    payload: buildPreviewTextPayload({
      query: searchQuery || null,
      icons,
      previewUrl,
      imageUrl,
      markdownImage,
      imageIncluded: Boolean(includeImage && icons.length > 0),
      truncatedFrom,
      browserPreviewCount:
        fixedRefs.length > 0
          ? normalizePreviewIconRefs(browserIconRefs.length ? browserIconRefs : fixedRefs, 24).length
          : icons.length,
      warnings: previewWarnings,
    }),
  };
}

function asPreviewResponse(payload, { imagePng = null, isError = false } = {}) {
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
    ...(isError ? { isError: true } : {}),
  };
}

function normalizeUsageToken(value, { maxLength = 80 } = {}) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, maxLength);
}

function normalizeUsageText(value, { maxLength = 120 } = {}) {
  const text = String(value || '').trim();
  return text ? text.slice(0, maxLength) : null;
}

function normalizeUsageUuid(value) {
  const text = String(value || '').trim().toLowerCase();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(text)
    ? text
    : null;
}

function normalizeUsageQuery(value) {
  return (
    String(value || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .slice(0, 400) || null
  );
}

function hashUsageValue(value) {
  const text = String(value || '').trim();
  return text ? createHash('sha256').update(text).digest('hex') : null;
}

function getFirstHeader(req, names) {
  for (const name of names) {
    const value = req.get(name);
    if (value) return value;
  }
  return '';
}

function getServiceRoleKey() {
  return process.env.SUPERICONS_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
}

function detectRequestEnvironment(req) {
  const configured = normalizeUsageToken(process.env.SUPERICONS_MCP_ENVIRONMENT, { maxLength: 40 });
  if (['production', 'preview', 'local', 'test', 'legacy'].includes(configured)) return configured;

  const host = String(req.get('host') || '').toLowerCase();
  if (host.includes('localhost') || host.includes('127.0.0.1')) return 'local';
  if (host.includes('netlify.app') || host.includes('deploy-preview')) return 'preview';
  if (String(process.env.NODE_ENV || '').toLowerCase() === 'test') return 'test';
  return 'production';
}

function detectClientFamily(req, extraHint = '') {
  const hint = [
    req.get('x-supericons-client'),
    req.get('x-mcp-client'),
    req.get('x-client-name'),
    extraHint,
    req.get('user-agent'),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (hint.includes('smithery')) return 'smithery';
  if (hint.includes('claude')) return 'claude';
  if (hint.includes('chatgpt') || hint.includes('openai')) return 'chatgpt';
  if (hint.includes('cursor')) return 'cursor';
  if (hint.includes('codex')) return 'codex';
  if (hint.includes('opencode')) return 'opencode';
  if (hint.includes('slack')) return 'slack';
  if (hint.includes('telegram')) return 'telegram';
  if (hint.includes('railway')) return 'railway';
  return 'unknown';
}

function normalizeIpToken(value) {
  let token = String(value || '').trim();
  if (!token || token.toLowerCase() === 'unknown') return '';
  token = token.split(',')[0].trim();
  token = token.replace(/^"|"$/g, '');
  token = token.replace(/^\[|\]$/g, '');
  token = token.replace(/^::ffff:/i, '');
  return token.slice(0, 120);
}

function getForwardedForToken(value) {
  const raw = String(value || '');
  const match = raw.match(/(?:^|[;,])\s*for="?([^";,]+)"?/i);
  return normalizeIpToken(match?.[1] || '');
}

function getClientIpToken(req) {
  const candidates = [
    req.get('cf-connecting-ip'),
    req.get('true-client-ip'),
    req.get('x-forwarded-for'),
    req.get('x-real-ip'),
    req.get('x-client-ip'),
    getForwardedForToken(req.get('forwarded')),
    req.ip,
    req.socket?.remoteAddress,
  ];
  for (const candidate of candidates) {
    const token = normalizeIpToken(candidate);
    if (token) return token;
  }
  return '';
}

function getCountryContext(req, clientIp) {
  const headerCandidates = [
    ['cf-ipcountry', req.get('cf-ipcountry')],
    ['x-vercel-ip-country', req.get('x-vercel-ip-country')],
    ['x-country-code', req.get('x-country-code')],
    ['x-railway-edge-country', req.get('x-railway-edge-country')],
    ['x-railway-country', req.get('x-railway-country')],
    ['fly-client-ip-country', req.get('fly-client-ip-country')],
    ['cloudfront-viewer-country', req.get('cloudfront-viewer-country')],
    ['x-appengine-country', req.get('x-appengine-country')],
  ];
  return resolveCountryContext({ clientIp, headerCandidates });
}

function extractMcpApiKey(req) {
  const explicit = normalizeUsageText(req.get('x-supericons-api-key'), {
    maxLength: 240,
  });
  if (explicit) return explicit;

  const authHeader = String(req.get('authorization') || '').trim();
  const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/i);
  const bearerToken = bearerMatch?.[1]?.trim() || '';
  return bearerToken.startsWith('si_') ? bearerToken.slice(0, 240) : null;
}

async function fetchSupabaseRestRows(path, serviceRoleKey) {
  const response = await fetch(`${SUPABASE_URL.replace(/\/+$/, '')}/rest/v1/${path}`, {
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
    },
  });
  if (!response.ok) {
    throw new Error(`Supabase REST request failed with ${response.status}`);
  }
  return await response.json();
}

async function updateSupabaseRestRow(path, serviceRoleKey, body) {
  const response = await fetch(`${SUPABASE_URL.replace(/\/+$/, '')}/rest/v1/${path}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(body),
  });
  if (!response.ok && process.env.SUPERICONS_MCP_USAGE_DEBUG === '1') {
    console.warn(`[Supericons MCP] API key last_used update failed (${response.status})`);
  }
}

async function resolveMcpApiKeyAccount(apiKey) {
  const apiKeyHash = hashUsageValue(apiKey);
  if (!apiKeyHash) {
    return {
      api_key_hash: null,
      api_key_present: false,
      api_key_valid: null,
      user_id: null,
      is_registered: false,
      is_pro: false,
      account_plan: null,
      subscription_status: null,
    };
  }

  const cached = mcpApiKeyAccountCache.get(apiKeyHash);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const serviceRoleKey = getServiceRoleKey();
  const unresolved = {
    api_key_hash: apiKeyHash,
    api_key_present: true,
    api_key_valid: false,
    user_id: null,
    is_registered: false,
    is_pro: false,
    account_plan: null,
    subscription_status: null,
  };
  if (!serviceRoleKey) {
    mcpApiKeyAccountCache.set(apiKeyHash, {
      expiresAt: Date.now() + MCP_API_KEY_ACCOUNT_CACHE_MS,
      value: unresolved,
    });
    return unresolved;
  }

  try {
    const keyRows = await fetchSupabaseRestRows(
      `si_api_keys?select=id,user_id&key_hash=eq.${encodeURIComponent(apiKeyHash)}&revoked=eq.false&limit=1`,
      serviceRoleKey,
    );
    const keyRow = Array.isArray(keyRows) ? keyRows[0] : null;
    const userId = typeof keyRow?.user_id === 'string' ? keyRow.user_id : null;
    if (!userId) {
      mcpApiKeyAccountCache.set(apiKeyHash, {
        expiresAt: Date.now() + MCP_API_KEY_ACCOUNT_CACHE_MS,
        value: unresolved,
      });
      return unresolved;
    }

    void updateSupabaseRestRow(`si_api_keys?id=eq.${encodeURIComponent(String(keyRow.id))}`, serviceRoleKey, {
      last_used: new Date().toISOString(),
    });

    const subscriptionRows = await fetchSupabaseRestRows(
      `si_subscriptions?select=status,plan&user_id=eq.${encodeURIComponent(userId)}&status=eq.active&limit=1`,
      serviceRoleKey,
    );
    const subscription = Array.isArray(subscriptionRows) ? subscriptionRows[0] : null;
    const subscriptionStatus = typeof subscription?.status === 'string' ? subscription.status : null;
    const value = {
      api_key_hash: apiKeyHash,
      api_key_present: true,
      api_key_valid: true,
      user_id: userId,
      is_registered: true,
      is_pro: subscriptionStatus === 'active',
      account_plan: typeof subscription?.plan === 'string' ? subscription.plan : null,
      subscription_status: subscriptionStatus,
    };
    mcpApiKeyAccountCache.set(apiKeyHash, {
      expiresAt: Date.now() + MCP_API_KEY_ACCOUNT_CACHE_MS,
      value,
    });
    return value;
  } catch (error) {
    if (process.env.SUPERICONS_MCP_USAGE_DEBUG === '1') {
      console.warn('[Supericons MCP] API key attribution lookup failed:', error?.message || error);
    }
    mcpApiKeyAccountCache.set(apiKeyHash, {
      expiresAt: Date.now() + 60_000,
      value: unresolved,
    });
    return unresolved;
  }
}

async function buildRequestContext(req) {
  const userAgent = String(req.get('user-agent') || '').trim();
  const clientInfoHint = [req.body?.params?.clientInfo?.name, req.body?.params?.clientInfo?.version]
    .filter(Boolean)
    .join(' ');
  const clientFamily = detectClientFamily(req, clientInfoHint);
  const clientIp = getClientIpToken(req);
  const monthBucket = new Date().toISOString().slice(0, 7);
  const apiKeyAccount = await resolveMcpApiKeyAccount(extractMcpApiKey(req));
  const requestId = normalizeUsageText(req.get('x-request-id') || req.get('cf-ray') || req.body?.id || randomUUID(), {
    maxLength: 120,
  });
  const country = getCountryContext(req, clientIp);
  const sessionHash = hashUsageValue(req.get('mcp-session-id') || req.get('x-session-id') || '');
  const controlledRun = verifyControlledRunHeaders(
    (name) => req.get(name),
    process.env.SUPERICONS_CONTROLLED_RUN_SECRET,
  );

  return {
    request_id: requestId,
    rpc_id: normalizeUsageText(req.body?.id, { maxLength: 80 }),
    channel: 'hosted_mcp',
    environment: detectRequestEnvironment(req),
    client_family: clientFamily,
    country_code: country.country_code,
    geo_source: country.geo_source,
    client_ip_public: country.client_ip_public,
    session_hash: sessionHash,
    ip_hash: hashUsageValue(clientIp),
    anonymous_client_hash: hashUsageValue(
      `${clientIp}|${userAgent}|${clientFamily}|${monthBucket}|supericons-hosted-mcp`,
    ),
    user_agent_hash: hashUsageValue(userAgent),
    api_key_hash: apiKeyAccount.api_key_hash,
    api_key_present: apiKeyAccount.api_key_present,
    api_key_valid: apiKeyAccount.api_key_valid,
    user_id: apiKeyAccount.user_id,
    is_registered: apiKeyAccount.is_registered,
    is_pro: apiKeyAccount.is_pro,
    account_plan: apiKeyAccount.account_plan,
    subscription_status: apiKeyAccount.subscription_status,
    mcp_server_version: packageJson.version,
    beta_cohort: controlledRun.valid ? `controlled-run:${controlledRun.label}` : null,
  };
}

function buildToolUsageContext(requestContext, toolName, args = {}, { eventId = randomUUID() } = {}) {
  const context = requestContext || {
    request_id: randomUUID(),
    channel: 'hosted_mcp',
    environment: 'production',
    client_family: 'unknown',
    mcp_server_version: packageJson.version,
  };
  const argsHash = hashUsageValue(
    JSON.stringify({
      query: args.query || null,
      task: args.task || null,
      id: args.id || null,
      library: args.library || null,
      limit: args.limit || args.limit_per_slot || null,
    }),
  )?.slice(0, 24);

  const requestBetaCohort = context.beta_cohort || null;
  const toolBetaCohort = requestBetaCohort || getBetaCohortForTool(packageJson.version, toolName);
  return {
    source: context.source || 'mcp',
    channel: context.channel,
    environment: requestBetaCohort?.startsWith('controlled-run:')
      ? 'test'
      : toolBetaCohort
        ? 'preview'
        : context.environment,
    client_family: context.client_family,
    tool_name: toolName,
    request_id: context.request_id,
    contract_version: 1,
    episode_id: normalizeUsageUuid(context.episode_id),
    recovery_chain_id: normalizeUsageUuid(context.recovery_chain_id),
    dedupe_key: buildMcpUsageDedupeKey({
      sessionHash: context.session_hash,
      anonymousClientHash: context.anonymous_client_hash,
      requestId: context.request_id,
      rpcId: context.rpc_id,
      toolName,
      argsHash,
      eventId,
    }),
    session_hash: context.session_hash,
    ip_hash: context.ip_hash,
    country_code: context.country_code,
    geo_source: context.geo_source,
    anonymous_client_hash: context.anonymous_client_hash,
    user_agent_hash: context.user_agent_hash,
    api_key_hash: context.api_key_hash,
    user_id: context.user_id,
    is_registered: context.is_registered,
    is_pro: context.is_pro,
    account_plan: context.account_plan,
    subscription_status: context.subscription_status,
    mcp_server_version: context.mcp_server_version,
    beta_cohort: toolBetaCohort,
  };
}

function getResultCountFromToolResult(result, toolName) {
  const payload = result?.structuredContent || {};
  if (toolName === 'recommend_icons' && Array.isArray(payload.results)) {
    return payload.results.filter((slot) => Boolean(slot?.recommended)).length;
  }
  if (Array.isArray(payload.results)) return payload.results.length;
  if (Array.isArray(payload.libraries)) return payload.libraries.length;
  if (payload.icon) return 1;
  return 0;
}

function getSearchOutcomeFromToolResult(result, toolName, status) {
  if (status === 'error') return 'error';
  const payload = result?.structuredContent || {};
  if (toolName === 'recommend_icons' && payload.needs_clarification === true) return 'clarification';
  return getResultCountFromToolResult(result, toolName) > 0 ? 'results' : 'zero';
}

function getConfidenceLabelFromToolResult(result) {
  const payload = result?.structuredContent || {};
  const direct = payload?.query_frame?.confidence_floor;
  if (['low', 'medium', 'high'].includes(direct)) return direct;
  const labels = Array.isArray(payload.results)
    ? payload.results.map((slot) => slot?.confidence?.level).filter(Boolean)
    : [];
  if (labels.includes('low')) return 'low';
  if (labels.includes('medium')) return 'medium';
  if (labels.includes('high')) return 'high';
  return null;
}

function buildMcpUsageEventPayload(
  requestContext,
  toolName,
  args,
  result,
  startedAt,
  status = 'ok',
  error = null,
  eventId = randomUUID(),
) {
  const context = buildToolUsageContext(requestContext, toolName, args, {
    eventId,
  });
  return {
    event_id: eventId,
    request_id: context.request_id,
    dedupe_key: context.dedupe_key,
    event_type: ['search_icons', 'recommend_icons'].includes(toolName)
      ? 'search_outcome'
      : toolName === 'preview_icons'
        ? 'preview'
        : 'tool_call',
    channel: context.channel,
    environment: context.environment,
    client_family: context.client_family,
    tool_name: toolName,
    query_norm: normalizeUsageQuery(args?.query || args?.task || args?.id || null),
    library_filter: normalizeUsageToken(args?.library, { maxLength: 80 }) || null,
    library_mode: ['search_icons', 'recommend_icons'].includes(toolName)
      ? normalizeUsageToken(args?.library_mode, { maxLength: 20 }) || 'strict'
      : null,
    query_origin: deriveMcpQueryOrigin(toolName),
    requested_limit: getMcpRequestedLimit(toolName, args),
    result_count: status === 'ok' ? getResultCountFromToolResult(result, toolName) : 0,
    search_outcome: ['search_icons', 'recommend_icons'].includes(toolName)
      ? getSearchOutcomeFromToolResult(result, toolName, status)
      : null,
    confidence_label: ['search_icons', 'recommend_icons'].includes(toolName)
      ? getConfidenceLabelFromToolResult(result)
      : null,
    beta_cohort: context.beta_cohort || null,
    status,
    error_code: status === 'error' ? normalizeUsageToken(error?.code, { maxLength: 80 }) || null : null,
    latency_ms: Math.max(0, Date.now() - startedAt),
    country_code: requestContext?.country_code || null,
    geo_source: requestContext?.geo_source || null,
    client_ip_public: requestContext?.client_ip_public === true,
    locale: normalizeUsageText(args?.locale, { maxLength: 32 }),
    session_hash: context.session_hash || null,
    ip_hash: context.ip_hash || null,
    anonymous_client_hash: context.anonymous_client_hash || null,
    user_agent_hash: context.user_agent_hash || null,
    api_key_hash: context.api_key_hash || null,
    user_id: context.user_id || null,
    is_registered: context.is_registered === true,
    is_pro: context.is_pro === true,
    account_plan: context.account_plan || null,
    subscription_status: context.subscription_status || null,
    mcp_server_version: context.mcp_server_version,
    metadata: {
      rpc_id: requestContext?.rpc_id || null,
      api_key_present: requestContext?.api_key_present === true,
      api_key_valid: requestContext?.api_key_valid === true,
      search_execution: result?.structuredContent?.search_runtime?.mode || null,
      root_request_hash: hashUsageValue(context.request_id),
      returned_icon_refs: extractReturnedIconRefs(result, toolName),
      returned_icon_refs_recorded: true,
      server_build: normalizeUsageText(
        process.env.RAILWAY_GIT_COMMIT_SHA || process.env.RAILWAY_DEPLOYMENT_ID || null,
        { maxLength: 120 },
      ),
      traffic_class: classifyMcpTraffic(context),
      episode_id: context.episode_id || eventId,
      recovery_chain_id: context.recovery_chain_id || eventId,
    },
  };
}

async function logMcpUsageEvent(payload) {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPERICONS_SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) return;

  try {
    const response = await fetch(`${SUPABASE_URL.replace(/\/+$/, '')}/rest/v1/mcp_usage_events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(MCP_USAGE_WRITE_TIMEOUT_MS),
    });

    if (!response.ok && response.status !== 409) {
      console.warn(`[Supericons MCP] usage ledger write failed (${response.status})`);
    }
  } catch (error) {
    console.warn(
      '[Supericons MCP] usage ledger write failed:',
      error?.name || error?.code || 'unknown_error',
    );
  }
}

async function withMcpUsageEvent(requestContext, toolName, args, handler) {
  const startedAt = Date.now();
  const eventId = randomUUID();
  const episodeContext = {
    ...(requestContext || {}),
    episode_id: eventId,
    recovery_chain_id: eventId,
  };
  const usageContext = buildToolUsageContext(episodeContext, toolName, args, { eventId });
  let attemptNumber = 0;
  usageContext.next_attempt_number = () => {
    attemptNumber += 1;
    return attemptNumber;
  };
  try {
    const result = await handler(usageContext);
    const resultIsError = result?.isError === true;
    await logMcpUsageEvent(
      buildMcpUsageEventPayload(
        episodeContext,
        toolName,
        args,
        result,
        startedAt,
        resultIsError ? 'error' : 'ok',
        resultIsError ? result?.structuredContent : null,
        eventId,
      ),
    );
    return result;
  } catch (error) {
    await logMcpUsageEvent(
      buildMcpUsageEventPayload(
        episodeContext,
        toolName,
        args,
        null,
        startedAt,
        'error',
        error,
        eventId,
      ),
    );
    throw error;
  }
}

function createServer({ requestContext = null } = {}) {
  const freeIconCountLabel =
    productFacts?.display?.freeIconsAcrossLibrariesFreeLabel ||
    `${registrySummary.publicRecordCount.toLocaleString()} searchable free icon records`;

  const server = new McpServer(
    {
      name: 'supericons',
      version: packageJson.version,
    },
    {
      instructions: SEARCH_TOOL_SERVER_INSTRUCTIONS,
    },
  );

  server.registerTool(
    'search_icons',
    {
      title: 'Search Icons',
      description: `Use this as the main icon tool. Search ${freeIconCountLabel} by meaning, label, visual description, tags, and synonyms. When matches exist, the response includes a paste-ready suggested answer, a direct preview image, and Markdown that can show the image in the final reply. When no supported match exists, it returns an honest structured no-result with a next step and no fabricated icon. Library key si means Supericons, not Simple Icons.`,
      inputSchema: {
        query: forgivingNonEmptyStringSchema.describe(
          'Icon concept or search phrase, for example "database", "user profile", "chill", "trash", "upload cloud", "AI model", or "beautiful".',
        ),
        library: forgivingStringSchema.optional().describe(`Optional library key. ${libraryKeysDescription}`),
        library_mode: forgivingStringSchema
          .optional()
          .default('strict')
          .describe(
            'Library behavior. Strict stays inside the requested library, prefer puts it first and includes labeled alternatives, and all searches every eligible library. Unsupported values are ignored with a warning.',
          ),
        style: forgivingStringSchema
          .optional()
          .default('any')
          .describe('Optional style preference. Unsupported values are ignored with a warning.'),
        locale: forgivingStringSchema
          .optional()
          .describe(`${multilingualLocaleDescription} Unsupported values are ignored with a warning.`),
        limit: forgivingSearchLimitSchema
          .optional()
          .default(10)
          .describe('Maximum number of icons from 1 to 50. Numeric strings are accepted.'),
        include_query_frame: forgivingBooleanSchema
          .optional()
          .default(false)
          .describe(
            'Optional public-safe diagnostics for query understanding. Boolean strings are accepted. Leave false for normal compact responses.',
          ),
      },
      outputSchema: searchIconsOutputSchema,
      annotations: auditedSearchAnnotations,
    },
    async (rawArgs) => {
      const args = normalizeSearchToolArguments(rawArgs, {
        supportedLocales: multilingualLocaleValues,
      });
      return withMcpUsageEvent(requestContext, 'search_icons', args, async (usageContext) => {
        const { query, library, library_mode, style, locale, limit, include_query_frame, warnings } = args;
        if (library_mode === 'prefer' && !library) {
          return asStructured(
            {
              results: [],
              library_mode,
              requested_library: null,
              error: 'Preferred-library mode requires a library.',
              code: 'preferred_library_required',
              hint: 'Provide a library or use all mode.',
              suggested_response_markdown:
                'A preferred library was not provided. Choose a library or search all libraries.',
              next_step: 'Provide a library or set library_mode to "all".',
              ...(warnings.length ? { warnings } : {}),
              retryable: false,
            },
            { isError: true },
          );
        }
        let results;
        let searchRuntime;
        try {
          const searchExecution = createRailwaySearchRoute({
            localSearchOne: searchRailwayLocalIcons,
            hostedSearchOne: (params) =>
              searchHostedIcons({
                ...params,
                includeQueryFrame: include_query_frame,
                usageContext,
                allowLocalEmptyFallback: false,
              }),
          });
          results = await searchExecution.searchOne({
            query,
            library,
            libraryMode: library_mode,
            style,
            locale,
            limit,
          });
          searchRuntime = {
            ...searchExecution.getRuntime(),
            index_generated_at: iconIndex.generatedAt,
          };
        } catch (error) {
          return asStructured(
            {
              results: [],
              library_mode,
              requested_library: library || null,
              ...buildSearchFailurePresentation({
                query,
                error,
                fallbackMessage: 'Supericons search is unavailable.',
              }),
              ...(warnings.length ? { warnings } : {}),
            },
            { isError: true },
          );
        }
        const formatted = results.map((icon) =>
          buildPublicIconResult(icon, {
            query,
            library,
            style,
            locale,
            limit,
          }),
        );
        const previewUrl = buildSearchPreviewUrl({
          query,
          library,
          style,
          locale,
          limit,
        });
        if (formatted.length === 0) {
          const hint = locale
            ? 'Try a broader term in the same language, remove the library filter, or search with an English concept.'
            : 'Try a broader term, remove the library filter, or add locale when searching with a non-English term.';
          return asStructured({
            results: [],
            library_mode,
            requested_library: library || null,
            preview_url: previewUrl,
            error: 'No icons found',
            code: 'no_icons_found',
            hint,
            ...buildSearchNoResultPresentation({ query, hint }),
            ...(warnings.length ? { warnings } : {}),
            retryable: true,
            ...(searchRuntime ? { search_runtime: searchRuntime } : {}),
            ...(include_query_frame ? { query_frame: buildSearchQueryFrame(query, { locale }) } : {}),
          });
        }
        const imageOptions = { query, library, style, locale, limit };
        const imageUrl = buildPreviewImageUrl(imageOptions);
        const markdownImage = buildPreviewMarkdownImage(imageOptions);
        return asStructured({
          results: formatted,
          library_mode,
          requested_library: library || null,
          preview_url: previewUrl,
          ...buildSearchMatchPresentation({
            query,
            results: formatted,
            previewUrl,
            imageUrl,
            markdownImage,
          }),
          ...(warnings.length ? { warnings } : {}),
          ...(searchRuntime ? { search_runtime: searchRuntime } : {}),
          ...(include_query_frame ? { query_frame: buildSearchQueryFrame(query, { locale }) } : {}),
        });
      });
    },
  );

  server.registerTool(
    'recommend_icons',
    {
      title: 'Recommend Icons',
      description:
        'Recommend a coherent icon set for up to 20 named UI slots in one call. Uses task context to narrow ambiguous meanings. When context is insufficient, returns needs_clarification with labeled interpretation options instead of guessing. Invalid inputs and service failures return a plain-language reason and a next step instead of a bare protocol error. Returns one recommendation and optional alternatives for each resolved slot, with explicit public library labels and visual preview URLs where available. Library key si means Supericons, not Simple Icons.',
      inputSchema: {
        task: forgivingStringSchema
          .optional()
          .default('')
          .describe(
            'Overall UI task, for example "choose icons for an AI dashboard sidebar" or "select bottom navigation icons for a finance app". Missing task text returns a structured recovery message.',
          ),
        slots: forgivingRecommendationSlotsSchema
          .optional()
          .default([])
          .describe(
            'List of 1 to 20 UI slots to fill, for example ["model", "prompt", "dataset", "evaluation"]. A single string is accepted as one slot. Larger lists return a structured split instruction.',
          ),
        library: forgivingStringSchema
          .optional()
          .describe(`Optional library key when the user wants a consistent icon family. ${libraryKeysDescription}`),
        style: forgivingStringSchema
          .optional()
          .default('any')
          .describe('Optional style preference. Unsupported values are ignored with a warning.'),
        locale: forgivingStringSchema
          .optional()
          .describe('Optional locale for multilingual slot labels. Unsupported values are ignored with a warning.'),
        limit_per_slot: forgivingRecommendationLimitSchema
          .optional()
          .default(3)
          .describe(
            'Number of choices per slot. Values outside 1 to 5 are clamped with a warning. Numeric strings are accepted.',
          ),
        response_mode: forgivingStringSchema
          .optional()
          .default('plan')
          .describe('Response size mode: plan, assets, or full. Unsupported values use plan with a warning.'),
        include_query_frame: forgivingBooleanSchema
          .optional()
          .default(false)
          .describe(
            'Optional public-safe diagnostics for query understanding. Boolean strings are accepted. Leave false for normal compact responses.',
          ),
      },
      outputSchema: recommendIconsOutputSchema,
      annotations: auditedSearchAnnotations,
    },
    async (rawArgs) => {
      const args = normalizeRecommendationToolArguments(rawArgs, {
        supportedLocales: multilingualLocaleValues,
      });
      return withMcpUsageEvent(requestContext, 'recommend_icons', args, async (usageContext) => {
        const {
          task,
          slots,
          library,
          style,
          locale,
          limit_per_slot,
          response_mode,
          include_query_frame,
          warnings,
          input_error,
        } = args;
        if (input_error) {
          return asStructured(input_error, { isError: true });
        }

        try {
          const recommendationSearch = createRailwayRecommendationSearch({
            enabled: railwayLocalFirstEnabled,
            localSearchOne: (params) =>
              searchRailwayLocalIcons({
                ...params,
                includeQueryFrame: include_query_frame,
                candidateOnly: true,
              }),
            hostedSearchOne: (params) =>
              searchHostedIcons({
                ...params,
                includeQueryFrame: include_query_frame,
                usageContext,
              }),
            hostedSearchMany: (queries) =>
              searchHostedIconQueries(queries, {
                usageContextForQuery: () => usageContext,
              }),
          });
          const payload = await recommendIconsForTask({
            task,
            slots,
            library,
            style,
            locale,
            limitPerSlot: limit_per_slot,
            responseMode: response_mode,
            includeQueryFrame: include_query_frame,
            semanticMap,
            searchIconsForQuery: recommendationSearch.searchOne,
            searchIconsForQueries: recommendationSearch.searchMany,
            buildIconResult: async (icon) => buildPublicIconResult(icon),
          });

          const iconRefs = [];
          for (const slot of payload.results || []) {
            const candidates = [
              slot.recommended,
              slot.recommendation,
              slot.icon,
              ...(Array.isArray(slot.alternatives) ? slot.alternatives : []),
              ...(Array.isArray(slot.choices) ? slot.choices : []),
            ].filter(Boolean);
            for (const candidate of candidates) {
              if (candidate.icon_ref) iconRefs.push(candidate.icon_ref);
            }
          }

          return asStructured({
            ...payload,
            preview_url: buildPreviewBoardUrlForIcons(iconRefs),
            search_runtime: {
              ...recommendationSearch.getRuntime(),
              index_generated_at: iconIndex.generatedAt,
            },
            ...(warnings.length ? { warnings } : {}),
          });
        } catch (error) {
          return asStructured(
            buildRecommendationFailurePresentation({
              task,
              library,
              style,
              responseMode: response_mode,
              slots,
              error,
              warnings,
            }),
            { isError: true },
          );
        }
      });
    },
  );

  server.registerTool(
    'get_icon',
    {
      title: 'Get Icon',
      description:
        'Retrieve one exact SVG icon when the icon ID and library are already known. Use search_icons first if the user only described a concept. Returns SVG code, explicit public library labels, visual preview URL, and public semantic guidance for the exact icon.',
      inputSchema: {
        id: z
          .string()
          .describe(
            'Exact icon ID without the library prefix, for example "database", "user-circle", "brain-circuit", or "arrow-down".',
          ),
        library: z.string().describe(`Required library key for the exact icon. ${libraryKeysDescription}`),
        style: z
          .enum(['any', 'outline', 'solid'])
          .optional()
          .default('any')
          .describe(
            'Optional style preference. Material Symbols supports outline and solid. Other hosted libraries report their verified styles in list_libraries.',
          ),
      },
      outputSchema: getIconOutputSchema,
      annotations: auditedSearchAnnotations,
    },
    async (args) =>
      withMcpUsageEvent(requestContext, 'get_icon', args, async () => {
        const { id, library, style } = args;
        const candidates = await searchHostedIcons({
          query: id.replace(/[-_]+/g, ' '),
          library,
          style,
          limit: 50,
          exactIconId: id,
          usageContext: buildToolUsageContext(requestContext, 'get_icon', args),
        });
        const normalizedId = id.toLowerCase();
        const match = candidates.find((icon) => icon.id.toLowerCase() === normalizedId);

        if (!match) {
          return asStructured(
            {
              error: `No matching icon found for ${library}:${id}.`,
              code: 'icon_not_found',
              hint: 'Confirm the icon ID and library, or call search_icons to find the closest available icon.',
              next_step: 'Call search_icons when the exact icon ID is not known or is unavailable.',
              retryable: false,
            },
            { isError: true },
          );
        }

        return asStructured({
          icon: buildPublicIconResult(match, { style }),
        });
      }),
  );

  server.registerTool(
    'preview_icons',
    {
      title: 'Preview Icons',
      description:
        'Refine an icon result set or preview known icon refs. Use search_icons first for normal icon requests. Long icon lists are accepted and safely truncated to 12. Returns a hosted preview page, direct PNG image URL, ready-made Markdown image snippet, and, when requested, an MCP image contact sheet.',
      inputSchema: {
        query: forgivingStringSchema
          .optional()
          .describe(
            'Optional search query to preview visually, for example "license plate recognition camera scan car".',
          ),
        icon_refs: z
          .preprocess(coerceToolIconRefs, z.array(z.string()).min(1))
          .optional()
          .describe(
            'Optional fixed icon refs in library:id format. Arrays, a single ref, and comma-separated refs are accepted. Up to 100 are accepted, 24 appear on the browser preview, and 12 are rendered inline. Larger lists are safely truncated with a warning.',
          ),
        library: forgivingStringSchema.optional().describe(`Optional library key. ${libraryKeysDescription}`),
        style: forgivingStringSchema
          .optional()
          .default('any')
          .describe('Optional style preference. Unsupported values are ignored with a warning.'),
        locale: forgivingStringSchema
          .optional()
          .describe(`${multilingualLocaleDescription} Unsupported values are ignored with a warning.`),
        limit: forgivingPreviewLimitSchema
          .optional()
          .default(12)
          .describe(
            'Requested inline icon count. Values outside 1 to 12 are safely clamped with a warning. Numeric strings are accepted.',
          ),
        include_image: forgivingBooleanSchema
          .optional()
          .default(true)
          .describe(
            'When true, include a PNG contact sheet as MCP image content. Boolean strings are accepted. A preview_url is always returned.',
          ),
      },
      outputSchema: previewIconsOutputSchema,
      annotations: readOnlyLookupAnnotations,
    },
    async (rawArgs) => {
      const args = normalizePreviewToolArguments(rawArgs, {
        supportedLocales: multilingualLocaleValues,
      });
      return withMcpUsageEvent(requestContext, 'preview_icons', args, async () => {
        const {
          query,
          icon_refs,
          browser_icon_refs,
          library,
          style,
          locale,
          limit,
          include_image,
          truncated_from,
          warnings,
        } = args;
        if (!query && (!Array.isArray(icon_refs) || icon_refs.length === 0)) {
          return asPreviewResponse(
            {
              query: null,
              preview_url: buildSearchPreviewUrl({
                library,
                style,
                locale,
                limit,
              }),
              image_url: null,
              markdown_image: null,
              image_included: false,
              rendered_count: 0,
              browser_preview_count: 0,
              next_step: 'Provide a search query or one or more icon refs in library:id format.',
              ...(warnings.length ? { warnings } : {}),
              client_display_note:
                'Provide either query or icon_refs, then open preview_url if your client cannot render inline images.',
              results: [],
              error: 'Provide either query or icon_refs.',
            },
            { isError: true },
          );
        }

        const { icons, payload } = await buildHostedPreviewModel({
          query,
          iconRefs: Array.isArray(icon_refs) ? icon_refs : [],
          browserIconRefs: Array.isArray(browser_icon_refs) ? browser_icon_refs : [],
          library,
          style,
          locale,
          limit,
          includeImage: include_image,
          usageContext: buildToolUsageContext(requestContext, 'preview_icons', args),
          truncatedFrom: truncated_from,
          warnings,
        });

        let imagePng = null;
        if (include_image && icons.length > 0) {
          imagePng = buildIconContactSheetPng(icons, {
            title: query ? `Supericons preview: ${query}` : 'Supericons icon preview',
          });
        }

        return asPreviewResponse(payload, { imagePng });
      });
    },
  );

  server.registerTool(
    'list_libraries',
    {
      title: 'List Libraries',
      description:
        'List the free icon libraries available through the hosted Supericons MCP server. Use this before filtering by library or when a user asks which icon libraries are supported.',
      outputSchema: listLibrariesOutputSchema,
      annotations: readOnlyLookupAnnotations,
    },
    async (args = {}) =>
      withMcpUsageEvent(requestContext, 'list_libraries', args, async () =>
        asStructured({
          libraries: LIBRARIES.map(([id, name, description]) => {
            const capability = buildLibraryCapability(id, {
              outlineCounts: hostedOutlineCounts,
              materialUsesOutlineForSolid: true,
            });
            return {
              id,
              name,
              label: getPublicLibraryMeta(id, { name, description }).label,
              description,
              ...capability,
            };
          }),
          publicRecordCount: registrySummary.publicRecordCount,
        }),
      ),
  );

  return server;
}

function sendJson(res, status, payload) {
  res.status(status).json(payload);
}

function classifyTrustedWebsiteOrigin(req) {
  const rawOrigin = String(req.get('origin') || '').trim();
  if (!rawOrigin) return null;
  try {
    const url = new URL(rawOrigin);
    const hostname = url.hostname.toLowerCase();
    const configuredHosts = String(process.env.SUPERICONS_PRODUCTION_WEB_HOSTS || '')
      .split(',')
      .map((host) => host.trim().toLowerCase())
      .filter(Boolean);
    if (
      url.protocol === 'https:'
      && new Set(['supericons.dev', 'www.supericons.dev', ...configuredHosts]).has(hostname)
    ) {
      return { environment: 'production' };
    }
    if (url.protocol === 'https:' && hostname.endsWith('.netlify.app')) {
      return { environment: 'preview' };
    }
    if (
      (url.protocol === 'http:' || url.protocol === 'https:')
      && ['localhost', '127.0.0.1', '::1', '[::1]'].includes(hostname)
    ) {
      return { environment: 'local' };
    }
  } catch {
    return null;
  }
  return null;
}

function parsePublicSearchRequest(body = {}) {
  const query = String(body.query || '').trim();
  if (!query) {
    throw createPreviewHttpError(400, 'search_query_required', 'Enter a search term.');
  }
  if (query.length > 240) {
    throw createPreviewHttpError(400, 'search_query_too_long', 'Search terms must be 240 characters or fewer.');
  }

  const library = String(body.library || '').trim() || null;
  const supportedLibraries = new Set(LIBRARIES.map(([id]) => id));
  if (library && !supportedLibraries.has(library)) {
    throw createPreviewHttpError(
      400,
      'unsupported_library',
      'Choose a supported icon library or search all libraries.',
    );
  }

  const style = String(body.style || 'any').trim() || 'any';
  if (!previewStyles.has(style)) {
    throw createPreviewHttpError(400, 'unsupported_style', 'Style must be any, outline, or solid.');
  }

  const requestedLocale = String(body.locale || '').trim() || null;
  const locale = requestedLocale === 'en' ? null : requestedLocale;
  if (locale && !previewLocales.has(locale)) {
    throw createPreviewHttpError(400, 'unsupported_locale', 'Choose a supported locale or leave locale empty.');
  }

  const requestedLimit = Number.parseInt(String(body.limit ?? '60'), 10);
  const limit = Number.isFinite(requestedLimit) ? Math.min(100, Math.max(1, requestedLimit)) : 60;
  const rawEpisodeId = body.episode_id ?? null;
  const episodeId = rawEpisodeId ? normalizeUsageUuid(rawEpisodeId) : null;
  if (rawEpisodeId && !episodeId) {
    throw createPreviewHttpError(400, 'search_episode_invalid', 'The search episode ID is invalid.');
  }

  return {
    query,
    library,
    libraryMode: library ? 'strict' : 'all',
    style,
    locale,
    limit,
    includeQueryFrame: body.include_query_frame === true,
    episodeId,
  };
}

async function runRailwayPublicSearch(params, usageContext = null) {
  const execution = createRailwaySearchRoute({
    localSearchOne: searchRailwayLocalIcons,
    hostedSearchOne: (fallbackParams) =>
      searchHostedIcons({
        ...fallbackParams,
        allowLocalEmptyFallback: false,
      }),
  });
  const results = await execution.searchOne({ ...params, usageContext });
  return {
    results,
    searchRuntime: {
      ...execution.getRuntime(),
      index_generated_at: iconIndex.generatedAt,
    },
  };
}

function buildServerCard(req) {
  const host = req.get('host');
  const protocol = req.get('x-forwarded-proto') || req.protocol || 'https';
  const baseUrl = process.env.SUPERICONS_REMOTE_MCP_BASE_URL || `${protocol}://${host}`;

  return {
    name: 'supericons',
    displayName: 'Supericons',
    description:
      'Search and recommend Supericons SVG icons by meaning through MCP, including supported multilingual search terms.',
    version: packageJson.version,
    websiteUrl: 'https://supericons.dev',
    transport: {
      type: 'streamable-http',
      url: `${baseUrl.replace(/\/+$/, '')}/mcp`,
    },
    configSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
    tools: ['search_icons', 'recommend_icons', 'get_icon', 'preview_icons', 'list_libraries'],
  };
}

const app = express();

app.use(express.json({ limit: '1mb' }));

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, MCP-Protocol-Version, Mcp-Session-Id, X-Session-Id, X-Supericons-Api-Key, X-Supericons-Client, X-Mcp-Client, X-Client-Name, X-Supericons-Controlled-Run-Label, X-Supericons-Controlled-Run-Timestamp, X-Supericons-Controlled-Run-Signature',
  );
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  next();
});

app.get('/health', (_req, res) => {
  const materialAssets = getMaterialBundleStatus();
  const hostedSearch = getHostedSearchResilienceStatus();
  const groupedHostedSearch = getGroupedHostedSearchResilienceStatus();
  sendJson(res, 200, {
    ok: true,
    service: 'supericons-remote-mcp',
    version: packageJson.version,
    material_assets: {
      available: materialAssets.available,
      source_revision: materialAssets.sourceRevision,
      asset_count: materialAssets.assetCount,
    },
    hosted_search: hostedSearch,
    grouped_hosted_search: groupedHostedSearch,
    railway_local_first: {
      enabled: railwayLocalFirstEnabled,
      search_mode: 'hosted_primary',
      recommendation_mode: railwayLocalFirstEnabled ? 'local_first' : 'hosted',
      index_generated_at: iconIndex.generatedAt,
      icon_count: publicIcons.length,
      semantic_record_count: semanticMap.size,
      candidate_index_token_count: railwayCandidateIndex.token_count,
      recommendation_cache_limit: RAILWAY_RECOMMENDATION_CACHE_LIMIT,
      recommendation_cache_size: railwayRecommendationSearchCache.size,
    },
  });
});

app.post('/search-icons', async (req, res) => {
  try {
    const params = parsePublicSearchRequest(req.body);
    const baseRequestContext = await buildRequestContext(req);
    const websiteOrigin = params.episodeId ? classifyTrustedWebsiteOrigin(req) : null;
    const requestContext = websiteOrigin
      ? {
          ...baseRequestContext,
          source: 'web',
          channel: 'web',
          environment: websiteOrigin.environment,
          client_family: 'browser',
          request_id: params.episodeId,
          episode_id: params.episodeId,
          recovery_chain_id: params.episodeId,
        }
      : baseRequestContext;
    const usageContext = buildToolUsageContext(requestContext, 'search_icons', params);
    const { results, searchRuntime } = await runRailwayPublicSearch(params, usageContext);
    sendJson(res, 200, {
      results: results.map((icon, index) => ({
        icon_id: `${icon.library}:${icon.id}`,
        id: icon.id,
        name: icon.name,
        library: icon.library,
        source_library: icon.library,
        style: icon.style,
        icon_type: icon.type,
        rank: index + 1,
      })),
      search_runtime: searchRuntime,
      ...(params.includeQueryFrame
        ? {
            query_frame: buildSearchQueryFrame(params.query, {
              locale: params.locale,
            }),
          }
        : {}),
    });
  } catch (error) {
    const status = Number(error?.status || 500);
    sendJson(res, status, {
      error: error?.code || 'search_unavailable',
      message: status >= 500 ? 'Icon search is temporarily unavailable. Try again shortly.' : error.message,
      retryable: status >= 500,
    });
  }
});

app.get('/.well-known/mcp/server-card.json', (req, res) => {
  sendJson(res, 200, buildServerCard(req));
});

app.get('/.well-known/openai-apps-challenge', (_req, res) => {
  const token = String(process.env.OPENAI_APPS_CHALLENGE_TOKEN || '').trim();
  if (!token) {
    res.status(404).type('text/plain').send('Not Found');
    return;
  }
  res.status(200).type('text/plain').send(token);
});

app.get('/preview-icons.png', async (req, res) => {
  const requestContext = await buildRequestContext(req);
  const startedAt = Date.now();
  const args = {
    query: req.query?.q || req.query?.query || null,
    library: req.query?.library || null,
    locale: req.query?.locale || null,
    limit: req.query?.limit || null,
  };
  try {
    const params = parsePreviewRouteParams(req.query);
    const { icons } = await buildHostedPreviewModel({
      ...params,
      usageContext: buildToolUsageContext(requestContext, 'preview_image', args),
    });
    if (!icons.length) {
      sendJson(res, 404, {
        error: 'no_preview_icons_found',
        message: 'No icons were found for this preview request.',
      });
      void logMcpUsageEvent(buildMcpUsageEventPayload(requestContext, 'preview_image', args, null, startedAt, 'error'));
      return;
    }

    const imagePng = buildIconContactSheetPng(icons, {
      title: params.query ? `Supericons preview: ${params.query}` : 'Supericons icon preview',
    });
    res
      .status(200)
      .set({
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=300, s-maxage=600',
        'X-Content-Type-Options': 'nosniff',
      })
      .send(Buffer.from(imagePng));
    void logMcpUsageEvent(
      buildMcpUsageEventPayload(
        requestContext,
        'preview_image',
        args,
        { structuredContent: { results: icons } },
        startedAt,
        'ok',
      ),
    );
  } catch (error) {
    const status = Number(error?.status || 500);
    sendJson(res, status, {
      error: error?.code || 'preview_image_unavailable',
      message: status >= 500 ? 'Preview image generation failed.' : error.message,
    });
    void logMcpUsageEvent(
      buildMcpUsageEventPayload(requestContext, 'preview_image', args, null, startedAt, 'error', error),
    );
  }
});

app.post('/mcp', async (req, res) => {
  const requestContext = await buildRequestContext(req);
  const server = createServer({ requestContext });
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });

  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error('Error handling MCP request:', error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal server error',
        },
        id: null,
      });
    }
  } finally {
    res.on('close', () => {
      void transport.close();
      void server.close();
    });
  }
});

app.get('/mcp', (_req, res) => {
  res.status(405).set('Allow', 'POST').send('Method Not Allowed');
});

app.delete('/mcp', (_req, res) => {
  res.status(405).set('Allow', 'POST').send('Method Not Allowed');
});

const port = Number(process.env.PORT || 3333);

app.listen(port, (error) => {
  if (error) {
    console.error('Failed to start hosted Supericons MCP server:', error);
    process.exit(1);
  }
  console.log(`Hosted Supericons MCP server listening on port ${port}`);
});
