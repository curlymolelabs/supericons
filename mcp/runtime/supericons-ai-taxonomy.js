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

export const SUPERICONS_CONCEPT_CATEGORY_DEFINITIONS = Object.freeze([
  {
    id: 'coding-agent-tools',
    label: 'Coding Agent Tools',
    description: 'Agent-authored code, patches, pull requests, terminals, sandboxes, and developer workflows.',
    sidebarGlyph: 'terminal',
  },
  {
    id: 'agent-lifecycle-states',
    label: 'Agent Lifecycle States',
    description: 'Agent progress, handoffs, approval gates, completion, retries, thinking, loading, and error states.',
    sidebarGlyph: 'progress_activity',
  },
  {
    id: 'agent-trust-safety',
    label: 'Agent Trust and Safety',
    description: 'Identity, guardrails, oversight, prompt attacks, policy boundaries, and safe autonomy controls.',
    sidebarGlyph: 'verified_user',
  },
  {
    id: 'agent-workflow-mcp',
    label: 'Agent Workflow and MCP',
    description: 'Tool calls, MCP connectors, memory, orchestration, planning, context, and multi-agent workflows.',
    sidebarGlyph: 'account_tree',
  },
  {
    id: 'agentic-payments',
    label: 'Agentic Payments',
    description: 'Agent wallets, autonomous payments, spending limits, stablecoins, and x402-style payment flows.',
    sidebarGlyph: 'payments',
  },
  {
    id: 'frontier-compute',
    label: 'Frontier Compute',
    description: 'Edge AI, quantum concepts, chips, sensors, voice interfaces, wearables, and emerging compute surfaces.',
    sidebarGlyph: 'memory',
  },
  {
    id: 'physical-automation',
    label: 'Physical Automation',
    description: 'Robots, drones, delivery automation, sensors, robotic arms, and embodied agent systems.',
    sidebarGlyph: 'precision_manufacturing',
  },
  {
    id: 'cars-vehicles',
    label: 'Cars & Vehicles',
    description: 'Cars, trucks, EVs, and vehicle silhouettes from daily life and current culture.',
    sidebarGlyph: 'directions_car',
  },
  {
    id: 'trending-culture',
    label: 'Trending & Culture',
    description: 'Viral moments, memes, and internet culture: of-the-moment icons that are instantly relatable.',
    sidebarGlyph: 'local_fire_department',
  },
  {
    id: 'agent-identity',
    label: 'Agent Identity',
    description: 'Faces and avatars for named agents in a fleet: scouts, companions, builders, and assistants.',
    sidebarGlyph: 'face',
  },
  {
    id: 'game-assets',
    label: 'Game Assets',
    description: 'Controllers, characters, enemies, and props for builders shipping their own games.',
    sidebarGlyph: 'sports_esports',
  },
  {
    id: 'everyday-objects',
    label: 'Everyday Objects',
    description: 'Ordinary things from daily life: household items, hardware, tools, and personal effects.',
    sidebarGlyph: 'category',
  },
  {
    id: 'health-body',
    label: 'Health and Body',
    description: 'Anatomy, organs, microbiology, and human or veterinary health concepts.',
    sidebarGlyph: 'health_and_safety',
  },
  {
    id: 'personal-care',
    label: 'Personal Care',
    description: 'Grooming, hair care, oral care, cosmetics, and everyday bathroom routines.',
    sidebarGlyph: 'self_care',
  },
  {
    id: 'food-dining',
    label: 'Food and Dining',
    description: 'Meals, dishes, restaurant service, and food delivery.',
    sidebarGlyph: 'restaurant',
  },
  {
    id: 'nature-animals',
    label: 'Nature and Animals',
    description: 'Animals, prehistoric life, fossils, and the natural world.',
    sidebarGlyph: 'pets',
  },
  {
    id: 'kitchen',
    label: 'Kitchen',
    description: 'Cookware, tableware, prep tools, and kitchen appliances.',
    sidebarGlyph: 'skillet',
  },
]);

export const SUPERICONS_SPECIALIZED_CATEGORY_DEFINITIONS = Object.freeze([
  ...SUPERICONS_AI_CATEGORY_DEFINITIONS,
  ...SUPERICONS_CONCEPT_CATEGORY_DEFINITIONS,
]);

const CATEGORY_LABEL_BY_ID = new Map(SUPERICONS_SPECIALIZED_CATEGORY_DEFINITIONS.map((category) => [category.id, category.label]));

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

export const SUPERICONS_CONCEPT_ICON_TAXONOMY = Object.freeze({
  'si:agent-commit': taxonomy(
    'coding-agent-tools',
    ['developer-tools', 'version-control'],
    ['git', 'save']
  ),
  'si:agent-diff': taxonomy(
    'coding-agent-tools',
    ['developer-tools', 'version-control'],
    ['patch', 'change']
  ),
  'si:agent-face': taxonomy(
    'agent-lifecycle-states',
    ['status-feedback', 'communication'],
    ['bot', 'avatar', 'assistant']
  ),
  'si:agent-handoff': taxonomy(
    'agent-lifecycle-states',
    ['multi-agent', 'agent-state'],
    ['delegate', 'transfer']
  ),
  'si:agent-id-badge': taxonomy(
    'agent-trust-safety',
    ['governance', 'developer-tools'],
    ['identity', 'scope']
  ),
  'si:agent-pr': taxonomy(
    'coding-agent-tools',
    ['developer-tools', 'version-control'],
    ['git', 'review']
  ),
  'si:agent-swarm': taxonomy(
    'agent-workflow-mcp',
    ['multi-agent', 'architecture'],
    ['mesh', 'cluster']
  ),
  'si:agent-wallet': taxonomy(
    'agentic-payments',
    ['crypto', 'governance'],
    ['funds', 'account']
  ),
  'si:approval-gate': taxonomy(
    'agent-lifecycle-states',
    ['security', 'agent-state'],
    ['consent', 'pause']
  ),
  'si:ar-glasses': taxonomy(
    'frontier-compute',
    ['hardware-devices'],
    ['wearable', 'xr']
  ),
  'si:autonomy-dial': taxonomy(
    'agent-trust-safety',
    ['governance', 'ui-controls'],
    ['delegation', 'level']
  ),
  'si:bison-yeet': taxonomy(
    'trending-culture',
    ['humor', 'meme'],
    ['surprise', 'yeet']
  ),
  'si:context-gauge': taxonomy(
    'agent-workflow-mcp',
    ['analytics', 'developer-tools'],
    ['window', 'capacity']
  ),
  'si:cybertruck': taxonomy(
    'cars-vehicles',
    ['trending-culture', 'ev'],
    ['tesla', 'truck']
  ),
  'si:cybertruck-low': taxonomy(
    'cars-vehicles',
    ['trending-culture', 'ev'],
    ['tesla', 'truck']
  ),
  'si:cybertruck-solid': taxonomy(
    'cars-vehicles',
    ['trending-culture', 'ev'],
    ['tesla', 'truck']
  ),
  'si:delivery-robot': taxonomy(
    'physical-automation',
    ['hardware-devices', 'commerce'],
    ['sidewalk', 'parcel']
  ),
  'si:done-spark': taxonomy(
    'agent-lifecycle-states',
    ['agent-state'],
    ['complete', 'success']
  ),
  'si:drone-delivery': taxonomy(
    'physical-automation',
    ['hardware-devices', 'commerce'],
    ['parcel', 'drop']
  ),
  'si:drone-quad': taxonomy(
    'physical-automation',
    ['hardware-devices'],
    ['uav', 'fpv']
  ),
  'si:edge-ai-chip': taxonomy(
    'frontier-compute',
    ['hardware-devices', 'developer-tools'],
    ['edge-ai', 'chip', 'hardware']
  ),
  'si:entangled-pair': taxonomy(
    'frontier-compute',
    ['science'],
    ['linked', 'correlated']
  ),
  'si:error-glitch': taxonomy(
    'agent-lifecycle-states',
    ['agent-state'],
    ['fault', 'alert']
  ),
  'si:guardrail-path': taxonomy(
    'agent-trust-safety',
    ['agent-state', 'governance'],
    ['bounds', 'policy']
  ),
  'si:hallucination-warn': taxonomy(
    'agent-trust-safety',
    ['status-feedback', 'governance'],
    ['distortion', 'verify']
  ),
  'si:human-in-loop': taxonomy(
    'agent-trust-safety',
    ['governance', 'agent-state'],
    ['oversight', 'review']
  ),
  'si:humanoid-robot': taxonomy(
    'physical-automation',
    ['robotics', 'hardware-devices'],
    ['robotics', 'humanoid', 'hardware']
  ),
  'si:lidar-sensor': taxonomy(
    'physical-automation',
    ['hardware-devices'],
    ['scan', 'range']
  ),
  'si:loader-orbit': taxonomy(
    'agent-lifecycle-states',
    ['loading-states', 'agent-state'],
    ['loading', 'spinner']
  ),
  'si:machine-pay': taxonomy(
    'agentic-payments',
    ['crypto', 'multi-agent'],
    ['m2m', 'autonomous']
  ),
  'si:mcp-connector': taxonomy(
    'agent-workflow-mcp',
    ['mcp', 'developer-tools'],
    ['plug', 'server']
  ),
  'si:memory-store': taxonomy(
    'agent-workflow-mcp',
    ['data', 'agent-state'],
    ['context', 'recall']
  ),
  'si:orchestrator': taxonomy(
    'agent-workflow-mcp',
    ['multi-agent', 'architecture'],
    ['supervisor', 'multi-agent']
  ),
  'si:person-airborne': taxonomy(
    'trending-culture',
    ['humor', 'meme'],
    ['fail', 'yeet']
  ),
  'si:person-launched': taxonomy(
    'trending-culture',
    ['humor', 'meme'],
    ['launch', 'speed']
  ),
  'si:pipeline-run': taxonomy(
    'agent-workflow-mcp',
    ['architecture', 'developer-tools'],
    ['workflow', 'chain']
  ),
  'si:plan-branches': taxonomy(
    'agent-workflow-mcp',
    ['agent-state', 'developer-tools'],
    ['tasks', 'decompose']
  ),
  'si:progress-ring': taxonomy(
    'agent-lifecycle-states',
    ['loading-states', 'analytics'],
    ['progress', 'task']
  ),
  'si:prompt-field': taxonomy(
    'agent-workflow-mcp',
    ['ui-controls', 'communication'],
    ['input', 'ask']
  ),
  'si:prompt-injection': taxonomy(
    'agent-trust-safety',
    ['developer-tools', 'governance'],
    ['attack', 'input']
  ),
  'si:quantum-chip': taxonomy(
    'frontier-compute',
    ['hardware-devices', 'science'],
    ['qpu', 'processor']
  ),
  'si:qubit-sphere': taxonomy(
    'frontier-compute',
    ['hardware-devices', 'science'],
    ['bloch', 'state']
  ),
  'si:retry-route': taxonomy(
    'agent-lifecycle-states',
    ['agent-state', 'status-feedback'],
    ['recover', 'reroute']
  ),
  'si:robot-arm': taxonomy(
    'physical-automation',
    ['hardware-devices'],
    ['manipulator', 'industrial']
  ),
  'si:robot-dog': taxonomy(
    'physical-automation',
    ['hardware-devices'],
    ['quadruped', 'patrol']
  ),
  'si:sandbox-run': taxonomy(
    'coding-agent-tools',
    ['security', 'developer-tools'],
    ['isolated', 'safe']
  ),
  'si:skill-module': taxonomy(
    'agent-workflow-mcp',
    ['developer-tools', 'mcp'],
    ['plugin', 'capability']
  ),
  'si:spend-limit': taxonomy(
    'agentic-payments',
    ['crypto', 'governance'],
    ['cap', 'policy']
  ),
  'si:stablecoin': taxonomy(
    'agentic-payments',
    ['crypto'],
    ['peg', 'currency']
  ),
  'si:streaming-caret': taxonomy(
    'agent-lifecycle-states',
    ['status-feedback', 'loading-states'],
    ['typing', 'response']
  ),
  'si:terminal-agent': taxonomy(
    'coding-agent-tools',
    ['developer-tools'],
    ['cli', 'shell']
  ),
  'si:thinking-pulse': taxonomy(
    'agent-lifecycle-states',
    ['status-feedback', 'loading-states'],
    ['agent-state', 'thinking', 'reasoning', 'loading-state']
  ),
  'si:token-meter': taxonomy(
    'agent-workflow-mcp',
    ['analytics', 'developer-tools'],
    ['usage', 'budget']
  ),
  'si:tool-call': taxonomy(
    'agent-workflow-mcp',
    ['mcp', 'developer-tools'],
    ['function', 'invoke']
  ),
  'si:voice-agent': taxonomy(
    'frontier-compute',
    ['communication', 'hardware-devices'],
    ['speech', 'waveform']
  ),
  'si:x402-pay': taxonomy(
    'agentic-payments',
    ['crypto', 'developer-tools'],
    ['protocol', 'http']
  ),
  'si:agent-scout': taxonomy(
    'agent-identity',
    ['agent-lifecycle-states', 'people-accounts'],
    ['bot', 'explorer', 'chatbot', 'avatar']
  ),
  'si:agent-wink': taxonomy(
    'agent-identity',
    ['agent-lifecycle-states', 'people-accounts'],
    ['bot', 'friendly', 'companion', 'avatar']
  ),
  'si:game-pad': taxonomy(
    'game-assets',
    ['devices-hardware', 'media-playback'],
    ['controller', 'play', 'gaming', 'console']
  ),
  'si:game-ghost': taxonomy(
    'game-assets',
    ['trending-culture'],
    ['enemy', 'sprite', 'arcade', 'npc']
  ),
  'si:toothpaste': taxonomy(
    'everyday-objects',
    ['health-body', 'trending-culture'],
    ['dental', 'hygiene', 'teeth', 'routine']
  ),
  'si:bacteria': taxonomy(
    'health-body',
    ['frontier-compute'],
    ['germ', 'microbe', 'pathogen', 'microbiology']
  ),
  'si:stomach': taxonomy(
    'health-body',
    [],
    ['gut', 'digestion', 'organ', 'anatomy']
  ),
  'si:lawn-mower': taxonomy(
    'physical-automation',
    ['everyday-objects'],
    ['mower', 'grass', 'gardening', 'yard']
  ),
  'si:house-key': taxonomy(
    'everyday-objects',
    ['security-access', 'maps-places-travel'],
    ['key', 'home', 'real-estate', 'property']
  ),
  'si:screw': taxonomy(
    'everyday-objects',
    [],
    ['fastener', 'hardware', 'diy', 'tornillo']
  ),
  'si:agent-pod': taxonomy(
    'agent-identity',
    ['agent-lifecycle-states', 'people-accounts'],
    ['bot', 'avatar', 'ai-face', 'companion']
  ),
  'si:cashback': taxonomy(
    'agentic-payments',
    ['commerce-finance', 'everyday-objects'],
    ['refund', 'rebate', 'rewards', 'money-back']
  ),
  'si:lottery-ticket': taxonomy(
    'agentic-payments',
    ['trending-culture', 'commerce-finance'],
    ['raffle', 'lotto', 'prize-draw', 'sweepstakes']
  ),
  'si:noodle-bowl': taxonomy(
    'food-dining',
    ['kitchen', 'everyday-objects'],
    ['ramen', 'noodles', 'pasta', 'meal']
  ),
  'si:dinosaur': taxonomy(
    'nature-animals',
    ['trending-culture'],
    ['t-rex', 'dino', 'prehistoric', 'paleontology']
  ),
  'si:fossil': taxonomy(
    'nature-animals',
    [],
    ['ammonite', 'paleontology', 'archaeology', 'geology']
  ),
  'si:comb': taxonomy(
    'personal-care',
    ['everyday-objects'],
    ['hair-care', 'grooming', 'barber', 'styling']
  ),
  'si:hairbrush': taxonomy(
    'personal-care',
    ['everyday-objects'],
    ['hair-care', 'grooming', 'paddle-brush', 'styling']
  ),
  'si:hair-clipper': taxonomy(
    'personal-care',
    ['everyday-objects'],
    ['hair-care', 'grooming', 'barber', 'trimmer']
  ),
  'si:mascara': taxonomy(
    'personal-care',
    ['trending-culture'],
    ['cosmetics', 'beauty', 'makeup', 'eyelashes']
  ),
  'si:nail-polish': taxonomy(
    'personal-care',
    ['trending-culture'],
    ['cosmetics', 'beauty', 'manicure', 'nails']
  ),
  'si:toothbrush': taxonomy(
    'personal-care',
    ['everyday-objects', 'health-body'],
    ['oral-care', 'hygiene', 'dental', 'brushing']
  ),
  'si:dental-floss': taxonomy(
    'personal-care',
    ['health-body'],
    ['oral-care', 'hygiene', 'flossing', 'dental']
  ),
  'si:shampoo': taxonomy(
    'personal-care',
    ['everyday-objects'],
    ['hair-care', 'shower', 'toiletries', 'grooming']
  ),
  'si:lotion': taxonomy(
    'personal-care',
    ['everyday-objects', 'health-body'],
    ['skincare', 'moisturizer', 'toiletries', 'grooming']
  ),
  'si:sunscreen': taxonomy(
    'personal-care',
    ['everyday-objects', 'health-body'],
    ['skincare', 'spf', 'sun-protection', 'summer']
  ),
  'si:cotton-swab': taxonomy(
    'personal-care',
    ['everyday-objects', 'health-body'],
    ['hygiene', 'first-aid', 'q-tip', 'cotton-bud']
  ),
  'si:tweezers': taxonomy(
    'personal-care',
    ['everyday-objects', 'health-body'],
    ['grooming', 'beauty', 'eyebrows', 'precision']
  ),
  'si:plate': taxonomy(
    'kitchen',
    ['food-dining'],
    ['tableware', 'dining', 'restaurant', 'place-setting']
  ),
  'si:cutting-board': taxonomy(
    'kitchen',
    ['everyday-objects'],
    ['prep-tools', 'chopping', 'food-prep', 'cookware']
  ),
  'si:wok': taxonomy(
    'kitchen',
    ['food-dining'],
    ['cookware', 'stir-fry', 'asian-cooking', 'pan']
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

export function buildSupericonsConceptTaxonomyEntries() {
  return Object.entries(SUPERICONS_CONCEPT_ICON_TAXONOMY).map(([iconId, entry], index) => ({
    iconId,
    sourceLibrary: 'si',
    jobCategory: entry.jobCategory,
    secondaryCategories: uniqueStrings([...entry.secondaryCategories, ...entry.aiFilterTags]),
    rank: 2000 + index,
  }));
}
