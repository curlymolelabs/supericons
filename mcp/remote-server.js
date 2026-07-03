#!/usr/bin/env node
/**
 * Supericons hosted MCP server.
 *
 * This exposes a Streamable HTTP MCP endpoint for hosted directories and agents.
 * The local stdio package in index.js remains the main IDE setup.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import express from 'express';
import { z } from 'zod';
import { searchIconsHostedMcp } from './hosted-search-client.js';
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
import {
  buildIconContactSheetPng,
  buildPreviewTextPayload,
} from './preview-icons.js';
import { buildIntentQueryVariants } from './runtime/search-intent-core.js';
import { buildSearchQueryFrame } from './runtime/search-query-frame.js';
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
const solidIconIndex = existsSync(solidIconIndexPath) ? JSON.parse(readFileSync(solidIconIndexPath, 'utf8')) : { icons: [] };
const synonyms = existsSync(synonymsPath) ? JSON.parse(readFileSync(synonymsPath, 'utf8')) : {};
const publicIcons = [
  ...(Array.isArray(iconIndex?.icons) ? iconIndex.icons : []),
  ...(Array.isArray(solidIconIndex?.icons) ? solidIconIndex.icons : []),
];
const semanticMap = createSemanticRegistryMap(loadSemanticRegistryRecords(dataDir));

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
  (Array.isArray(iconIndex?.libraries) ? iconIndex.libraries : []).map((entry) => [
    entry.id,
    Number(entry.count || 0),
  ])
);

const libraryKeysDescription =
  'Supported values include si (Supericons AI and developer tool logos), lucide, tabler, phosphor, heroicons, bootstrap, iconoir, ionicons, material, simpleicons (Simple Icons brand logos), and mingcute.';
const multilingualLocaleValues = ['zh-Hans', 'zh-Hant', 'ja', 'ko', 'es', 'de', 'pt', 'ar', 'hi', 'vi', 'th'];
const multilingualLocaleDescription =
  'Optional locale for multilingual search terms. Supported values: zh-Hans, zh-Hant, ja, ko, es, de, pt, ar, hi, vi, th.';
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
  search_preview_url: z.string().nullable().optional().describe('Browser URL for visual inspection of the source search results.'),
  type: z.string().describe('Icon asset type, normally svg.'),
  style: z.string().describe('Icon style such as outline or solid.'),
  svg: z.string().describe('Inline SVG markup for the icon.'),
  semantic: z.record(z.unknown()).nullable().optional().describe('Public semantic guidance for search and agent selection.'),
});

const libraryResultSchema = z.object({
  id: z.string().describe('Library key used in tool calls.'),
  name: z.string().describe('Human-readable library name.'),
  label: z.string().optional().describe('Human-readable library label with key, for example Supericons (si).'),
  description: z.string().describe('Brief public description of the icon library.'),
  count: z.number().describe('Number of icons in the library.'),
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
  semantic: z.record(z.unknown()).nullable().optional().describe('Public semantic guidance for search and agent selection.'),
});

const searchIconsOutputSchema = {
  results: z.array(publicIconResultSchema).describe('Matching icons with SVG code and semantic guidance.'),
  preview_url: z.string().optional().describe('Browser URL for visual inspection of this search result set.'),
  query_frame: z.record(z.unknown()).optional().describe('Optional public-safe query understanding diagnostics.'),
};

const recommendIconsOutputSchema = {
  task: z.string().describe('Original UI task.'),
  library: z.string().optional().describe('Library filter used for recommendations, if provided.'),
  style: z.string().optional().describe('Style preference used for recommendations.'),
  slot_count: z.number().describe('Number of UI slots requested.'),
  preview_url: z.string().optional().describe('Browser URL for visual inspection of the recommended icon set.'),
  query_frame: z.record(z.unknown()).optional().describe('Optional public-safe query understanding diagnostics for the task.'),
  results: z.array(z.record(z.unknown())).describe('Recommended icon choices grouped by requested UI slot.'),
};

const previewIconsOutputSchema = {
  query: z.string().nullable().optional().describe('Search query used for the visual preview, if any.'),
  preview_url: z.string().describe('Browser URL for visual inspection.'),
  image_url: z.string().nullable().optional().describe('Direct PNG URL for clients or Markdown renderers that can show remote images.'),
  markdown_image: z.string().nullable().optional().describe('Ready-made Markdown image snippet for final answers in clients that render remote Markdown images.'),
  image_included: z.boolean().describe('Whether this response includes MCP image content.'),
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
  publicRecordCount: z.number().describe('Number of public semantic icon records searchable through the hosted MCP server.'),
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
  if (!row?.icon_id) return null;
  const [libraryFromId, ...idParts] = String(row.icon_id).split(':');
  const library = row.library || row.source_library || libraryFromId;
  const id = idParts.join(':') || row.id || row.name;
  if (!library || !id || !row.svg) return null;

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

function searchLocalFallbackIcons({ query, library, style = 'any', limit = 20, locale = null }) {
  if (publicIcons.length === 0) return [];

  const queryVariants = buildIntentQueryVariants(query, { maxVariants: 10 });
  const results = [];
  const seen = new Set();

  for (const queryVariant of queryVariants) {
    const variantResults = searchLocalIcons(queryVariant, publicIcons, synonyms, {
      library: library || null,
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

async function searchHostedIcons({
  query,
  library,
  style = 'any',
  limit = 20,
  locale = null,
  includeQueryFrame = false,
}) {
  let payload;
  try {
    payload = await searchIconsHostedMcp({
      query,
      library: library || null,
      style,
      limit,
      locale,
      includeQueryFrame,
    });
  } catch (error) {
    const fallbackResults = searchLocalFallbackIcons({
      query,
      library,
      style,
      limit,
      locale,
    });
    if (fallbackResults.length > 0) return fallbackResults;
    throw error;
  }

  const hostedResults = (payload.results || [])
    .map(normalizeHostedIcon)
    .filter(Boolean)
    .slice(0, Math.max(1, limit));

  if (hostedResults.length > 0) {
    return hostedResults;
  }

  const fallbackResults = searchLocalFallbackIcons({
    query,
    library,
    style,
    limit,
    locale,
  });
  if (fallbackResults.length > 0) return fallbackResults;

  return hostedResults;
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

async function resolveHostedIconRef(ref, { style = 'any' } = {}) {
  const parsed = parseIconRef(ref);
  if (!parsed) return null;
  const candidates = await searchHostedIcons({
    query: parsed.id.replace(/[-_]+/g, ' '),
    library: parsed.library,
    style,
    limit: 50,
  });
  const normalizedId = parsed.id.toLowerCase();
  const match = candidates.find((icon) => icon.id.toLowerCase() === normalizedId);
  return match ? buildPublicIconResult(match, { style }) : null;
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
    throw createPreviewHttpError(400, 'preview_query_too_long', `Preview query must be ${maxLength} characters or fewer.`);
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
    throw createPreviewHttpError(400, 'invalid_locale', `Preview locale must be one of: ${multilingualLocaleValues.join(', ')}.`);
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
  const resolvedRefs = iconRefs.length
    ? icons.map((icon) => icon.icon_ref).filter(Boolean)
    : [];
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
  library,
  style = 'any',
  locale,
  limit = 9,
  includeImage = false,
} = {}) {
  const effectiveLimit = normalizePreviewLimit(limit);
  const fixedRefs = normalizePreviewIconRefs(iconRefs, effectiveLimit);
  const searchQuery = normalizePreviewText(query);
  const icons = fixedRefs.length > 0
    ? (await Promise.all(fixedRefs.map((ref) => resolveHostedIconRef(ref, { style })))).filter(Boolean)
    : (await searchHostedIcons({
      query: searchQuery,
      library,
      style,
      locale,
      limit: effectiveLimit,
    })).map((icon) => buildPublicIconResult(icon, {
      query: searchQuery,
      library,
      style,
      locale,
      limit: effectiveLimit,
    }));

  const previewUrl = fixedRefs.length > 0
    ? buildPreviewBoardUrlForIcons(icons.map((icon) => icon.icon_ref).filter(Boolean))
    : buildSearchPreviewUrl({ query: searchQuery, library, style, locale, limit: effectiveLimit });
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

function createServer() {
  const freeIconCountLabel =
    productFacts?.display?.freeIconsAcrossLibrariesFreeLabel ||
    `${registrySummary.publicRecordCount.toLocaleString()} searchable free icon records`;

  const server = new McpServer({
    name: 'supericons',
    version: packageJson.version,
  });

  server.registerTool(
    'search_icons',
    {
      title: 'Search Icons',
      description: `Search ${freeIconCountLabel} by meaning, label, visual description, tags, and synonyms. Use this when the user describes an icon concept such as "database", "user profile", "chill", "security", "AI model", or "OpenAI Codex logo". Returns matching icons with SVG code, public semantic guidance, explicit library labels, and browser preview URLs. Library key si means Supericons, not Simple Icons.`,
      inputSchema: {
        query: z.string().describe('Icon concept or search phrase, for example "database", "user profile", "chill", "trash", "upload cloud", "AI model", or "beautiful".'),
        library: z.string().optional().describe(`Optional library key. ${libraryKeysDescription}`),
        style: z.enum(['any', 'outline', 'solid']).optional().default('any').describe('Optional style preference. Use "any" unless the user asks for outline or solid icons.'),
        locale: z.enum(multilingualLocaleValues).optional().describe(multilingualLocaleDescription),
        limit: z.number().min(1).max(50).optional().default(10).describe('Maximum number of icons to return. Use 5-10 for browsing and 1-3 for quick agent choices.'),
        include_query_frame: z.boolean().optional().default(false).describe('Optional public-safe diagnostics for query understanding. Leave false for normal compact responses.'),
      },
      outputSchema: searchIconsOutputSchema,
      annotations: auditedSearchAnnotations,
    },
    async ({ query, library, style, locale, limit, include_query_frame }) => {
      const results = await searchHostedIcons({
        query,
        library,
        style,
        locale,
        limit,
        includeQueryFrame: include_query_frame,
      });
      return asStructured({
        results: results.map((icon) => buildPublicIconResult(icon, {
          query,
          library,
          style,
          locale,
          limit,
        })),
        preview_url: buildSearchPreviewUrl({ query, library, style, locale, limit }),
        ...(include_query_frame ? { query_frame: buildSearchQueryFrame(query, { locale }) } : {}),
      });
    }
  );

  server.registerTool(
    'recommend_icons',
    {
      title: 'Recommend Icons',
      description: 'Recommend a coherent icon set for named UI slots in a product, app, dashboard, or navigation flow. Use this when the user needs several icons that should work together. Returns one recommendation and optional alternatives for each slot, with explicit public library labels and visual preview URLs where available. Library key si means Supericons, not Simple Icons.',
      inputSchema: {
        task: z.string().describe('Overall UI task, for example "choose icons for an AI dashboard sidebar" or "select bottom navigation icons for a finance app".'),
        slots: z.array(z.string().min(1)).min(1).max(12).describe('List of UI slots to fill, for example ["model", "prompt", "dataset", "evaluation"].'),
        library: z.string().optional().describe(`Optional library key when the user wants a consistent icon family. ${libraryKeysDescription}`),
        style: z.enum(['any', 'outline', 'solid']).optional().default('any').describe('Optional style preference. Use "outline" for most sidebar and toolbar icon sets unless the user asks otherwise.'),
        locale: z.enum(multilingualLocaleValues).optional().describe('Optional locale for multilingual slot labels. Supported values: zh-Hans, zh-Hant, ja, ko, es, de, pt, ar, hi, vi, th.'),
        limit_per_slot: z.number().min(1).max(5).optional().default(3).describe('Number of choices to return for each slot. Use 1 for a final pick or 2-3 when the user wants alternatives.'),
        response_mode: z.enum(['plan', 'assets', 'full']).optional().default('plan').describe('Response size mode. Use plan for compact icon IDs and reasons, assets to include SVG only for each top recommendation, or full to include SVG and semantic payloads for all returned choices.'),
        include_query_frame: z.boolean().optional().default(false).describe('Optional public-safe diagnostics for query understanding. Leave false for normal compact responses.'),
      },
      outputSchema: recommendIconsOutputSchema,
      annotations: auditedSearchAnnotations,
    },
    async ({ task, slots, library, style, locale, limit_per_slot, response_mode, include_query_frame }) => {
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
        searchIconsForQuery: (params) => searchHostedIcons({
          ...params,
          includeQueryFrame: include_query_frame,
        }),
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
      });
    }
  );

  server.registerTool(
    'get_icon',
    {
      title: 'Get Icon',
      description: 'Retrieve one exact SVG icon when the icon ID and library are already known. Use search_icons first if the user only described a concept. Returns SVG code, explicit public library labels, visual preview URL, and public semantic guidance for the exact icon.',
      inputSchema: {
        id: z.string().describe('Exact icon ID without the library prefix, for example "database", "user-circle", "brain-circuit", or "arrow-down".'),
        library: z.string().describe(`Required library key for the exact icon. ${libraryKeysDescription}`),
        style: z.enum(['any', 'outline', 'solid']).optional().default('any').describe('Optional style preference. Use "any" unless the caller needs a specific variant.'),
      },
      outputSchema: getIconOutputSchema,
      annotations: auditedSearchAnnotations,
    },
    async ({ id, library, style }) => {
      const candidates = await searchHostedIcons({
        query: id.replace(/[-_]+/g, ' '),
        library,
        style,
        limit: 50,
      });
      const normalizedId = id.toLowerCase();
      const match = candidates.find((icon) => icon.id.toLowerCase() === normalizedId);

      if (!match) {
        return asStructured({
          error: `No matching icon found for ${library}:${id}.`,
        }, { isError: true });
      }

      return asStructured({
        icon: buildPublicIconResult(match, { style }),
      });
    }
  );

  server.registerTool(
    'preview_icons',
    {
      title: 'Preview Icons',
      description: 'Create a visual preview for icon search results or a fixed list of icon refs. Returns a hosted preview page, direct PNG image URL, ready-made Markdown image snippet, and, when requested, an MCP image contact sheet. Use markdown_image in final answers when the client supports remote Markdown images; otherwise share image_url or preview_url.',
      inputSchema: {
        query: z.string().optional().describe('Optional search query to preview visually, for example "license plate recognition camera scan car".'),
        icon_refs: z.array(z.string()).min(1).max(12).optional().describe('Optional fixed icon refs in library:id format, for example ["si:x-ai", "mingcute:scan_2_line"].'),
        library: z.string().optional().describe(`Optional library key. ${libraryKeysDescription}`),
        style: z.enum(['any', 'outline', 'solid']).optional().default('any').describe('Optional style preference.'),
        locale: z.enum(multilingualLocaleValues).optional().describe(multilingualLocaleDescription),
        limit: z.number().min(1).max(12).optional().default(9).describe('Maximum icons to include in the preview. Keep this small for image-capable clients.'),
        include_image: z.boolean().optional().default(true).describe('When true, include a PNG contact sheet as MCP image content. A preview_url is always returned.'),
      },
      outputSchema: previewIconsOutputSchema,
      annotations: readOnlyLookupAnnotations,
    },
    async ({ query, icon_refs, library, style, locale, limit, include_image }) => {
      if (!query && (!Array.isArray(icon_refs) || icon_refs.length === 0)) {
        return asPreviewResponse({
          query: null,
          preview_url: buildSearchPreviewUrl({ library, style, locale, limit }),
          image_url: null,
          markdown_image: null,
          image_included: false,
          client_display_note: 'Provide either query or icon_refs, then open preview_url if your client cannot render inline images.',
          results: [],
          error: 'Provide either query or icon_refs.',
        }, { isError: true });
      }

      const { icons, payload } = await buildHostedPreviewModel({
        query,
        iconRefs: Array.isArray(icon_refs) ? icon_refs : [],
        library,
        style,
        locale,
        limit,
        includeImage: include_image,
      });

      let imagePng = null;
      if (include_image && icons.length > 0) {
        imagePng = buildIconContactSheetPng(icons, {
          title: query ? `Supericons preview: ${query}` : 'Supericons icon preview',
        });
      }

      return asPreviewResponse(payload, { imagePng });
    }
  );

  server.registerTool(
    'list_libraries',
    {
      title: 'List Libraries',
      description: 'List the free icon libraries available through the hosted Supericons MCP server. Use this before filtering by library or when a user asks which icon libraries are supported.',
      outputSchema: listLibrariesOutputSchema,
      annotations: readOnlyLookupAnnotations,
    },
    async () => asStructured({
      libraries: LIBRARIES.map(([id, name, description]) => ({
        id,
        name,
        label: getPublicLibraryMeta(id, { name, description }).label,
        description,
        count: libraryCounts.get(id) || 0,
      })),
      publicRecordCount: registrySummary.publicRecordCount,
    })
  );

  return server;
}

function sendJson(res, status, payload) {
  res.status(status).json(payload);
}

function buildServerCard(req) {
  const host = req.get('host');
  const protocol = req.get('x-forwarded-proto') || req.protocol || 'https';
  const baseUrl = process.env.SUPERICONS_REMOTE_MCP_BASE_URL || `${protocol}://${host}`;

  return {
    name: 'supericons',
    displayName: 'Supericons',
    description: 'Search and recommend Supericons SVG icons by meaning through MCP, including supported multilingual search terms.',
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
    tools: [
      'search_icons',
      'recommend_icons',
      'get_icon',
      'preview_icons',
      'list_libraries',
    ],
  };
}

const app = express();

app.use(express.json({ limit: '1mb' }));

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, MCP-Protocol-Version, Mcp-Session-Id');
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  next();
});

app.get('/health', (_req, res) => {
  sendJson(res, 200, {
    ok: true,
    service: 'supericons-remote-mcp',
    version: packageJson.version,
  });
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
  try {
    const params = parsePreviewRouteParams(req.query);
    const { icons } = await buildHostedPreviewModel(params);
    if (!icons.length) {
      sendJson(res, 404, {
        error: 'no_preview_icons_found',
        message: 'No icons were found for this preview request.',
      });
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
  } catch (error) {
    const status = Number(error?.status || 500);
    sendJson(res, status, {
      error: error?.code || 'preview_image_unavailable',
      message: status >= 500 ? 'Preview image generation failed.' : error.message,
    });
  }
});

app.post('/mcp', async (req, res) => {
  const server = createServer();
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
