#!/usr/bin/env node
/**
 * Supericons hosted MCP server.
 *
 * This exposes a Streamable HTTP MCP endpoint for hosted directories and agents.
 * The local stdio package in index.js remains the main IDE setup.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import express from 'express';
import { z } from 'zod';
import { searchIconsHostedMcp } from './hosted-search-client.js';
import { recommendIconsForTask } from './recommend-icons.js';
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
  ['simpleicons', 'Simple Icons', 'Brand and product icons'],
  ['tabler', 'Tabler', 'Large open-source SVG icon library'],
];

const libraryKeysDescription =
  'Supported values include lucide, tabler, phosphor, heroicons, bootstrap, iconoir, ionicons, material, simpleicons, and mingcute.';
const multilingualLocaleValues = ['zh-Hans', 'zh-Hant', 'ja', 'ko', 'es', 'de', 'pt', 'ar', 'hi', 'vi', 'th'];
const multilingualLocaleDescription =
  'Optional locale for multilingual search terms. Supported values: zh-Hans, zh-Hant, ja, ko, es, de, pt, ar, hi, vi, th.';

const readOnlySearchAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

const publicIconResultSchema = z.object({
  id: z.string().describe('Icon ID without the library prefix.'),
  name: z.string().describe('Human-readable icon name.'),
  library: z.string().describe('Source icon library key.'),
  type: z.string().describe('Icon asset type, normally svg.'),
  style: z.string().describe('Icon style such as outline or solid.'),
  svg: z.string().describe('Inline SVG markup for the icon.'),
  semantic: z.record(z.unknown()).nullable().optional().describe('Public semantic guidance for search and agent selection.'),
});

const libraryResultSchema = z.object({
  id: z.string().describe('Library key used in tool calls.'),
  name: z.string().describe('Human-readable library name.'),
  description: z.string().describe('Brief public description of the icon library.'),
});

const searchIconsOutputSchema = {
  results: z.array(publicIconResultSchema).describe('Matching icons with SVG code and semantic guidance.'),
};

const recommendIconsOutputSchema = {
  task: z.string().describe('Original UI task.'),
  library: z.string().optional().describe('Library filter used for recommendations, if provided.'),
  style: z.string().optional().describe('Style preference used for recommendations.'),
  slot_count: z.number().describe('Number of UI slots requested.'),
  results: z.array(z.record(z.unknown())).describe('Recommended icon choices grouped by requested UI slot.'),
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

async function searchHostedIcons({ query, library, style = 'any', limit = 20, locale = null }) {
  const payload = await searchIconsHostedMcp({
    query,
    library: library || null,
    style,
    limit,
    locale,
  });

  return (payload.results || [])
    .map(normalizeHostedIcon)
    .filter(Boolean)
    .slice(0, Math.max(1, limit));
}

function buildPublicIconResult(icon) {
  return {
    id: icon.id,
    name: icon.name,
    library: icon.library,
    type: icon.type,
    style: icon.style,
    svg: icon.svg,
    semantic: icon.semantic,
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
      description: `Search ${freeIconCountLabel} by meaning, label, visual description, tags, and synonyms. Use this when the user describes an icon concept such as "database", "user profile", "chill", "security", or "AI model". Returns matching icons with SVG code and public semantic guidance.`,
      inputSchema: {
        query: z.string().describe('Icon concept or search phrase, for example "database", "user profile", "chill", "trash", "upload cloud", "AI model", or "beautiful".'),
        library: z.string().optional().describe(`Optional library key. ${libraryKeysDescription}`),
        style: z.enum(['any', 'outline', 'solid']).optional().default('any').describe('Optional style preference. Use "any" unless the user asks for outline or solid icons.'),
        locale: z.enum(multilingualLocaleValues).optional().describe(multilingualLocaleDescription),
        limit: z.number().min(1).max(50).optional().default(10).describe('Maximum number of icons to return. Use 5-10 for browsing and 1-3 for quick agent choices.'),
      },
      outputSchema: searchIconsOutputSchema,
      annotations: readOnlySearchAnnotations,
    },
    async ({ query, library, style, locale, limit }) => {
      const results = await searchHostedIcons({ query, library, style, locale, limit });
      return asStructured({
        results: results.map(buildPublicIconResult),
      });
    }
  );

  server.registerTool(
    'recommend_icons',
    {
      title: 'Recommend Icons',
      description: 'Recommend a coherent icon set for named UI slots in a product, app, dashboard, or navigation flow. Use this when the user needs several icons that should work together. Returns one recommendation and optional alternatives for each slot.',
      inputSchema: {
        task: z.string().describe('Overall UI task, for example "choose icons for an AI dashboard sidebar" or "select bottom navigation icons for a finance app".'),
        slots: z.array(z.string().min(1)).min(1).max(12).describe('List of UI slots to fill, for example ["model", "prompt", "dataset", "evaluation"].'),
        library: z.string().optional().describe(`Optional library key when the user wants a consistent icon family. ${libraryKeysDescription}`),
        style: z.enum(['any', 'outline', 'solid']).optional().default('any').describe('Optional style preference. Use "outline" for most sidebar and toolbar icon sets unless the user asks otherwise.'),
        locale: z.enum(multilingualLocaleValues).optional().describe('Optional locale for multilingual slot labels. Supported values: zh-Hans, zh-Hant, ja, ko, es, de, pt, ar, hi, vi, th.'),
        limit_per_slot: z.number().min(1).max(5).optional().default(3).describe('Number of choices to return for each slot. Use 1 for a final pick or 2-3 when the user wants alternatives.'),
      },
      outputSchema: recommendIconsOutputSchema,
      annotations: readOnlySearchAnnotations,
    },
    async ({ task, slots, library, style, locale, limit_per_slot }) => {
      const payload = await recommendIconsForTask({
        task,
        slots,
        library,
        style,
        locale,
        limitPerSlot: limit_per_slot,
        semanticMap,
        searchIconsForQuery: searchHostedIcons,
        buildIconResult: async (icon) => buildPublicIconResult(icon),
      });

      return asStructured(payload);
    }
  );

  server.registerTool(
    'get_icon',
    {
      title: 'Get Icon',
      description: 'Retrieve one exact SVG icon when the icon ID and library are already known. Use search_icons first if the user only described a concept. Returns SVG code and public semantic guidance for the exact icon.',
      inputSchema: {
        id: z.string().describe('Exact icon ID without the library prefix, for example "database", "user-circle", "brain-circuit", or "arrow-down".'),
        library: z.string().describe(`Required library key for the exact icon. ${libraryKeysDescription}`),
        style: z.enum(['any', 'outline', 'solid']).optional().default('any').describe('Optional style preference. Use "any" unless the caller needs a specific variant.'),
      },
      outputSchema: getIconOutputSchema,
      annotations: readOnlySearchAnnotations,
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
        icon: buildPublicIconResult(match),
      });
    }
  );

  server.registerTool(
    'list_libraries',
    {
      title: 'List Libraries',
      description: 'List the free icon libraries available through the hosted Supericons MCP server. Use this before filtering by library or when a user asks which icon libraries are supported.',
      outputSchema: listLibrariesOutputSchema,
      annotations: readOnlySearchAnnotations,
    },
    async () => asStructured({
      libraries: LIBRARIES.map(([id, name, description]) => ({
        id,
        name,
        description,
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
