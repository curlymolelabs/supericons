const BASE_FILTER_TAGS = Object.freeze(['agentic-ai-tools-pack', 'brand-logo']);

export const SUPERICONS_AI_CATEGORY_DEFINITIONS = Object.freeze([
  {
    id: 'ai-app-builders',
    label: 'AI App Builders',
    description: 'Text-to-app, text-to-site, no-code, low-code, and vibe-coding products.',
    sidebarGlyph: 'auto_fix_high',
  },
  {
    id: 'coding-agents-dev-environments',
    label: 'Coding Agents & Dev Environments',
    description: 'Agentic IDEs, coding assistants, developer agents, and software-building workspaces.',
    sidebarGlyph: 'terminal',
  },
  {
    id: 'model-platforms-ai-labs',
    label: 'Model Platforms & AI Labs',
    description: 'Foundation model providers, model studios, AI labs, and model API platforms.',
    sidebarGlyph: 'model_training',
  },
  {
    id: 'ai-search-research-evaluation',
    label: 'AI Search, Research & Evaluation',
    description: 'AI-native search, research, retrieval, benchmarking, ranking, and evaluation tools.',
    sidebarGlyph: 'database_search',
  },
  {
    id: 'generative-media-creative-ai',
    label: 'Generative Media & Creative AI',
    description: 'AI video, image, avatar, creative studio, and synthetic media products.',
    sidebarGlyph: 'movie',
  },
  {
    id: 'voice-audio-ai',
    label: 'Voice & Audio AI',
    description: 'Speech, voice, music, audio generation, and audio model products.',
    sidebarGlyph: 'graphic_eq',
  },
  {
    id: 'agent-infrastructure-runtime',
    label: 'Agent Infrastructure & Runtime',
    description: 'Agent runtime, browser automation, memory, vector storage, workflow, and observability infrastructure.',
    sidebarGlyph: 'account_tree',
  },
  {
    id: 'mcp-tooling-protocols',
    label: 'MCP, Tooling & Protocols',
    description: 'MCP servers, tool directories, context services, protocol tooling, and agent tool distribution.',
    sidebarGlyph: 'hub',
  },
  {
    id: 'general-agents-assistants',
    label: 'General Agents & Assistants',
    description: 'General-purpose assistants, autonomous task agents, local agents, and multi-step AI workers.',
    sidebarGlyph: 'smart_toy',
  },
  {
    id: 'design-ui-intelligence',
    label: 'Design & UI Intelligence',
    description: 'Design references, UI kits, component systems, creative assets, and visual product intelligence.',
    sidebarGlyph: 'palette',
  },
  {
    id: 'agent-business-monetization',
    label: 'Agent Business & Monetization',
    description: 'Revenue, referrals, commerce, affiliate, and monetization tools for agent ecosystems.',
    sidebarGlyph: 'payments',
  },
]);

const CATEGORY_LABEL_BY_ID = new Map(SUPERICONS_AI_CATEGORY_DEFINITIONS.map((category) => [category.id, category.label]));

function taxonomy(jobCategory, secondaryCategories, aiFilterTags = []) {
  return Object.freeze({
    jobCategory,
    secondaryCategories: Object.freeze([...secondaryCategories]),
    aiFilterTags: Object.freeze([...aiFilterTags]),
  });
}

export const SUPERICONS_AI_ICON_TAXONOMY = Object.freeze({
  'si:artificial-analysis': taxonomy(
    'ai-search-research-evaluation',
    ['model-benchmarking', 'ai-evaluation', 'provider-comparison'],
    ['ai-benchmarking', 'llm-leaderboard', 'provider-comparison']
  ),
  'si:base44': taxonomy(
    'ai-app-builders',
    ['ai-app-builder', 'no-code-low-code', 'vibe-coding'],
    ['text-to-app', 'app-generation', 'vibe-coding']
  ),
  'si:bolt': taxonomy(
    'ai-app-builders',
    ['ai-app-builder', 'browser-app-builder', 'vibe-coding'],
    ['bolt-new', 'web-app-generation', 'vibe-coding']
  ),
  'si:bridgemind-ai': taxonomy(
    'coding-agents-dev-environments',
    ['coding-agent', 'developer-tooling', 'code-assistant'],
    ['ai-development', 'developer-agent', 'code-workflow']
  ),
  'si:browserbase': taxonomy(
    'agent-infrastructure-runtime',
    ['browser-automation', 'web-agent-runtime', 'agent-infrastructure'],
    ['headless-browser', 'web-automation', 'agent-runtime']
  ),
  'si:capcut': taxonomy(
    'generative-media-creative-ai',
    ['video-editing', 'short-form-video', 'creative-ai'],
    ['creator-tools', 'video-editor', 'social-video']
  ),
  'si:cartesia': taxonomy(
    'voice-audio-ai',
    ['voice-ai', 'speech-generation', 'audio-models'],
    ['text-to-speech', 'voice-models', 'real-time-audio']
  ),
  'si:cohere': taxonomy(
    'model-platforms-ai-labs',
    ['enterprise-llm', 'reranking', 'model-api'],
    ['foundation-models', 'embedding-models', 'enterprise-ai']
  ),
  'si:context7': taxonomy(
    'mcp-tooling-protocols',
    ['mcp-docs', 'developer-context', 'tool-protocol'],
    ['context-server', 'developer-docs', 'mcp']
  ),
  'si:devin': taxonomy(
    'coding-agents-dev-environments',
    ['coding-agent', 'software-engineering-agent', 'autonomous-development'],
    ['developer-agent', 'engineering-automation', 'ai-coding']
  ),
  'si:exa': taxonomy(
    'ai-search-research-evaluation',
    ['ai-search', 'web-search-api', 'research-retrieval'],
    ['semantic-search', 'web-retrieval', 'research-api']
  ),
  'si:factory-ai': taxonomy(
    'coding-agents-dev-environments',
    ['coding-agent', 'software-development', 'engineering-automation'],
    ['developer-agent', 'ai-engineering', 'code-automation']
  ),
  'si:fal-ai': taxonomy(
    'generative-media-creative-ai',
    ['image-video-generation', 'model-inference', 'creative-api'],
    ['media-models', 'inference-api', 'creative-infrastructure']
  ),
  'si:firecrawl': taxonomy(
    'agent-infrastructure-runtime',
    ['web-crawling', 'agent-ingestion', 'data-extraction'],
    ['web-scraping', 'site-ingestion', 'agent-data']
  ),
  'si:glama': taxonomy(
    'mcp-tooling-protocols',
    ['mcp-directory', 'tool-discovery', 'agent-tools'],
    ['mcp', 'tool-registry', 'agent-tooling']
  ),
  'si:google-ai-studio': taxonomy(
    'model-platforms-ai-labs',
    ['model-studio', 'gemini', 'prompt-prototyping'],
    ['google-ai', 'model-prototyping', 'ai-studio']
  ),
  'si:google-antigravity': taxonomy(
    'coding-agents-dev-environments',
    ['agentic-ide', 'coding-agent', 'developer-environment'],
    ['google-ai', 'developer-workspace', 'ai-coding']
  ),
  'si:goose': taxonomy(
    'general-agents-assistants',
    ['local-agent', 'desktop-agent', 'task-automation'],
    ['agent-assistant', 'local-automation', 'multi-step-agent']
  ),
  'si:hermes-agent': taxonomy(
    'general-agents-assistants',
    ['general-agent', 'browser-agent', 'task-agent'],
    ['autonomous-agent', 'ai-assistant', 'agent-worker']
  ),
  'si:heygen': taxonomy(
    'generative-media-creative-ai',
    ['avatar-video', 'synthetic-video', 'ai-video'],
    ['video-generation', 'avatar-generation', 'creative-ai']
  ),
  'si:higgsfield': taxonomy(
    'generative-media-creative-ai',
    ['ai-video', 'motion-generation', 'creative-ai'],
    ['video-generation', 'image-to-video', 'cinematic-ai']
  ),
  'si:inngest': taxonomy(
    'agent-infrastructure-runtime',
    ['workflow-orchestration', 'durable-functions', 'event-driven-agents'],
    ['background-jobs', 'agent-workflows', 'workflow-engine']
  ),
  'si:kickbacks-ai': taxonomy(
    'agent-business-monetization',
    ['affiliate-monetization', 'agent-commerce', 'referrals'],
    ['revenue-tools', 'agent-marketplace', 'affiliate-ai']
  ),
  'si:kilo-code': taxonomy(
    'coding-agents-dev-environments',
    ['coding-agent', 'open-source-ide', 'developer-agent'],
    ['ai-coding', 'code-assistant', 'developer-workspace']
  ),
  'si:kimi': taxonomy(
    'model-platforms-ai-labs',
    ['chat-assistant', 'long-context', 'foundation-model'],
    ['model-platform', 'llm-assistant', 'ai-lab']
  ),
  'si:kling-ai': taxonomy(
    'generative-media-creative-ai',
    ['ai-video', 'image-to-video', 'generative-media'],
    ['video-generation', 'creative-ai', 'synthetic-video']
  ),
  'si:lovable': taxonomy(
    'ai-app-builders',
    ['ai-app-builder', 'vibe-coding', 'web-app-generation'],
    ['text-to-app', 'product-builder', 'frontend-generation']
  ),
  'si:luma-ai': taxonomy(
    'generative-media-creative-ai',
    ['ai-video', '3d-generation', 'creative-ai'],
    ['dream-machine', 'video-generation', 'world-model']
  ),
  'si:manus-ai': taxonomy(
    'general-agents-assistants',
    ['general-agent', 'autonomous-agent', 'multi-step-tasks'],
    ['ai-assistant', 'agent-worker', 'task-automation']
  ),
  'si:mobbin': taxonomy(
    'design-ui-intelligence',
    ['design-inspiration', 'ui-reference', 'product-design'],
    ['screen-library', 'design-research', 'ui-patterns']
  ),
  'si:openai-codex-app': taxonomy(
    'coding-agents-dev-environments',
    ['coding-agent', 'software-engineering-agent', 'developer-environment'],
    ['ai-coding', 'developer-agent', 'code-generation']
  ),
  'si:openclaw': taxonomy(
    'general-agents-assistants',
    ['general-agent', 'open-source-agent', 'desktop-agent'],
    ['autonomous-agent', 'agent-assistant', 'local-agent']
  ),
  'si:opencode': taxonomy(
    'coding-agents-dev-environments',
    ['terminal-coding-agent', 'developer-cli', 'coding-agent'],
    ['ai-coding', 'command-line-agent', 'code-assistant']
  ),
  'si:pika': taxonomy(
    'generative-media-creative-ai',
    ['ai-video', 'generative-video', 'creative-ai'],
    ['video-generation', 'text-to-video', 'synthetic-video']
  ),
  'si:pinecone': taxonomy(
    'agent-infrastructure-runtime',
    ['vector-database', 'retrieval-memory', 'agent-memory'],
    ['embeddings', 'semantic-retrieval', 'rag-infrastructure']
  ),
  'si:pixverse': taxonomy(
    'generative-media-creative-ai',
    ['ai-video', 'generative-video', 'creative-ai'],
    ['video-generation', 'text-to-video', 'synthetic-video']
  ),
  'si:portkey': taxonomy(
    'agent-infrastructure-runtime',
    ['ai-gateway', 'llm-observability', 'model-routing'],
    ['model-gateway', 'ai-observability', 'llm-routing']
  ),
  'si:runway': taxonomy(
    'generative-media-creative-ai',
    ['ai-video', 'creative-studio', 'generative-media'],
    ['video-generation', 'film-tools', 'synthetic-media']
  ),
  'si:shadcn-ui': taxonomy(
    'design-ui-intelligence',
    ['ui-components', 'design-system', 'frontend-ui'],
    ['component-library', 'design-system', 'interface-building']
  ),
  'si:smithery': taxonomy(
    'mcp-tooling-protocols',
    ['mcp-directory', 'mcp-server-hosting', 'tool-registry'],
    ['mcp', 'agent-tools', 'server-directory']
  ),
  'si:stagehand': taxonomy(
    'agent-infrastructure-runtime',
    ['browser-automation', 'web-agent-runtime', 'agent-testing'],
    ['web-automation', 'browser-agent', 'agent-runtime']
  ),
  'si:stepfun': taxonomy(
    'model-platforms-ai-labs',
    ['foundation-model', 'chat-assistant', 'model-platform'],
    ['llm', 'ai-lab', 'model-api']
  ),
  'si:suno-ai': taxonomy(
    'voice-audio-ai',
    ['music-generation', 'audio-generation', 'voice-audio-ai'],
    ['ai-music', 'song-generation', 'audio-models']
  ),
  'si:supericons': taxonomy(
    'design-ui-intelligence',
    ['ai-icon-library', 'design-assets', 'ui-icons'],
    ['icon-system', 'brand-icons', 'design-tooling']
  ),
  'si:temporal': taxonomy(
    'agent-infrastructure-runtime',
    ['durable-workflows', 'workflow-orchestration', 'agent-runtime'],
    ['workflow-engine', 'long-running-tasks', 'reliable-execution']
  ),
  'si:trae': taxonomy(
    'coding-agents-dev-environments',
    ['agentic-ide', 'coding-agent', 'developer-environment'],
    ['ai-coding', 'developer-workspace', 'code-assistant']
  ),
  'si:vercel-eve': taxonomy(
    'agent-infrastructure-runtime',
    ['agent-runtime', 'web-agent', 'deployment-platform'],
    ['ai-agent', 'vercel-platform', 'web-runtime']
  ),
  'si:x-ai': taxonomy(
    'model-platforms-ai-labs',
    ['foundation-model', 'grok', 'grok-imagine', 'ai-lab'],
    ['model-provider', 'llm', 'image-generation', 'video-generation', 'xai']
  ),
  'si:xiaomi-mimo': taxonomy(
    'model-platforms-ai-labs',
    ['foundation-model', 'edge-ai', 'ai-lab'],
    ['model-provider', 'mobile-ai', 'xiaomi-ai']
  ),
  'si:z-ai': taxonomy(
    'model-platforms-ai-labs',
    ['foundation-model', 'open-model', 'ai-lab'],
    ['model-provider', 'llm', 'zai']
  ),
});

function uniqueStrings(values) {
  const seen = new Set();
  const normalized = [];
  for (const value of values || []) {
    if (typeof value !== 'string') continue;
    const trimmed = value.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    normalized.push(trimmed);
  }
  return normalized;
}

function normalizeSupericonsIconId(iconId) {
  const value = String(iconId || '').trim();
  if (!value) return '';
  return value.includes(':') ? value : `si:${value}`;
}

export function getSupericonsAiCategoryLabel(categoryId) {
  return CATEGORY_LABEL_BY_ID.get(categoryId) || null;
}

export function getSupericonsAiTaxonomy(iconId) {
  return SUPERICONS_AI_ICON_TAXONOMY[normalizeSupericonsIconId(iconId)] || null;
}

export function getSupericonsAiMetadata(iconId) {
  const entry = getSupericonsAiTaxonomy(iconId);
  if (!entry) return null;

  const aiFilterTags = uniqueStrings([
    ...BASE_FILTER_TAGS,
    entry.jobCategory,
    ...entry.secondaryCategories,
    ...entry.aiFilterTags,
  ]);

  return {
    aiCategory: entry.jobCategory,
    aiCategoryLabel: getSupericonsAiCategoryLabel(entry.jobCategory),
    aiFilterTags,
    jobCategory: entry.jobCategory,
    secondaryCategories: uniqueStrings([...entry.secondaryCategories, ...entry.aiFilterTags]),
  };
}

export function getSupericonsAiRegistryPatch(iconId) {
  const metadata = getSupericonsAiMetadata(iconId);
  if (!metadata) return null;

  return {
    ai_category: metadata.aiCategory,
    ai_category_label: metadata.aiCategoryLabel,
    ai_filter_tags: metadata.aiFilterTags,
    job_category: metadata.jobCategory,
    secondary_categories: metadata.secondaryCategories,
  };
}

export function buildSupericonsAiTaxonomyEntries() {
  return Object.entries(SUPERICONS_AI_ICON_TAXONOMY).map(([iconId, entry], index) => ({
    iconId,
    sourceLibrary: 'si',
    jobCategory: entry.jobCategory,
    secondaryCategories: uniqueStrings([...entry.secondaryCategories, ...entry.aiFilterTags]),
    rank: 1000 + index,
  }));
}
