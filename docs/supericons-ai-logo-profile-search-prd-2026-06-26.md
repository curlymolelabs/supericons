# Supericons AI Logo Profile Search PRD

Date: 2026-06-26

Status: Launch preparation plan

Scope: Supericons Agentic AI Tools logo pack, currently 50 logos

## Problem Statement

Supericons is preparing to launch a new AI-focused logo library. The first pack is useful only if humans and AI agents can find the right logo by product name, alternate name, category, and practical job. For logos, the visual identity is straightforward, but the search profile still needs enough context to answer questions such as:

- "Find the Bolt logo"
- "Find an AI app builder logo"
- "Find a browser automation logo for agents"
- "Find a vector database logo for RAG"
- "Find an MCP directory logo"

The source registry already contains rich meaning fields. The remaining launch risk is that those fields are not fully exposed or weighted everywhere users search: public web search, in-app search, generated indexes, and MCP tools.

This matters because Supericons is not trying to win as another folder of SVGs. The strategy docs define Supericons as a visual meaning layer for agent-assisted software: assets plus metadata, usage rules, context, source trust, and agent-readable search.

## Research Basis

This PRD is grounded in:

- Local source registry: `data/si-registry/source/libraries/supericons.json`
- Public app index: `public/icon-index.json`
- Public registry exports: `public/registry/records.json` and `mcp/public/registry-records.json`
- Supericons strategy: `strategy/latest-strategic-vision-2026-05-15.md`
- Supericons visual language concept: `strategy/supericons-programmable-visual-language-concept-2026-05-16.md`
- Supericons icon library standard: `docs/supericons-agentic-icon-library-standard-2026-06-16.md`
- Supericons tag vetting note: `docs/supericons-agentic-ai-tools-tag-vetting-2026-06-17.md`
- External registry references: Iconify JSON and collection metadata, Simple Icons source metadata, Lucide JSON metadata descriptors, Material Symbols metadata.

## Verified Current State

The Supericons source registry at `data/si-registry/source/libraries/supericons.json` is a top-level JSON array with 50 records.

Each of the 50 source records currently has non-empty values for:

- `icon_id`
- `label`
- `purpose`
- `category`
- `semantic_tags`
- `ai_category`
- `ai_category_label`
- `ai_filter_tags`
- `job_category`
- `secondary_categories`
- `use_when`
- `avoid_when`
- `depicts`
- `synonyms`

The public app index at `public/icon-index.json` contains 50 `lib: "si"` icons and exposes AI category fields such as `aiCategory`, `aiCategoryLabel`, `aiFilterTags`, `jobCategory`, and `secondaryCategories`.

The same public app index does not currently expose `semantic_tags` or `synonyms` for the 50 `si` icons.

The public registry exports at `public/registry/records.json` and `mcp/public/registry-records.json` each contain 50 `si:` records with semantic fields.

## Product Vision

For launch, the logos should be free. Paid value should come later from original Supericons packs, agent-state systems, animated smart loaders, style adapters, premium workflow exports, and richer product kits.

The AI logo pack should be the free wedge that proves the Supericons profile idea:

```text
Supericon = asset + meaning profile + usage guidance + source context + search behavior
```

The launch promise:

> Supericons helps builders and AI agents find the right AI tool logo by name, intent, category, and product context.

## Target Users

Primary users:

- Vibe coders building apps with AI app builders and coding agents.
- Indie developers building AI dashboards, agent consoles, SaaS tools, model comparison pages, and launch sites.
- AI coding agents using MCP to choose icons while implementing UI.
- Designers and design engineers who need current AI tool logos in a consistent, searchable library.

Primary jobs:

- Search by product name and retrieve the correct logo.
- Search by practical intent and find relevant tools.
- Understand when a logo should or should not be used.
- Use the logo safely as brand reference, not as generic iconography.
- Give agents enough metadata to avoid generic or misleading icon choices.

## Goals

- Make every logo searchable by exact name, alternate spelling, domain, category, and practical usage.
- Make public web search and MCP search use the same meaning profile.
- Add source context for each logo so the registry can explain what the logo refers to.
- Keep logos free to maximize reach, trust, and SEO/MCP discovery.
- Prepare a profile structure that can later support non-logo Supericons packs.
- Use the 50-logo pack as the launch proof for the Supericons profile standard.

## Non-Goals

- Do not charge per logo for this launch.
- Do not lock popular AI logos behind Pro.
- Do not imply affiliation, sponsorship, or endorsement by any brand.
- Do not overbuild a full protocol or motion system for static logos.
- Do not add agent-state or motion fields to brand-logo records unless a logo genuinely supports that use.
- Do not replace the existing registry pipeline in this PRD.

## Registry Lessons From Existing Libraries

Existing icon libraries point to four practical launch lessons:

- Iconify uses a shared JSON model with prefixes, icon records, aliases, categories, and collection metadata.
- Simple Icons makes source URL and brand title central to each brand icon record.
- Lucide requires a JSON metadata descriptor for each icon with tags and categories.
- Material Symbols separates icon glyph delivery from searchable metadata such as categories and tags.

Supericons should follow the useful parts of those patterns, then go further for AI workflows:

- Keep stable IDs and library prefixes.
- Keep source/reference URLs for logos.
- Keep aliases and synonyms separate from categories.
- Keep small user-facing categories, but richer hidden search terms.
- Add `use_when` and `avoid_when`, because agents need selection rules, not only tags.
- Add source and rights notes for launch trust.

## Logo Profile Requirements

Each logo should have a public-safe profile with these fields or field equivalents:

| Field | Purpose |
|---|---|
| `id` | Stable Supericons ID, such as `si:bolt`. |
| `name` | Human-readable product or brand name. |
| `slug` | URL-safe and file-safe name. |
| `asset_type` | For this pack, `brand-logo`. |
| `pack` | `agentic-ai-tools-logos-001`. |
| `category` | User-facing category or current AI category. |
| `aliases` | Brand aliases, old names, domains, and spelling variants. |
| `search_terms` | Rich search terms, including category and task terms. |
| `filter_tags` | Controlled facet tags for browsing. |
| `source_url` | Official or best available reference URL. |
| `source_trust` | One of `official_site`, `official_docs`, `official_repository`, `official_app_listing`, `reviewed_secondary_source`. |
| `meaning` | One-sentence description of what the logo refers to. |
| `use_when` | When to use this logo. |
| `avoid_when` | When not to use this logo. |
| `rights` | Trademark and brand-use note. |
| `variants` | Available SVG variants, initially mono/currentColor unless a color variant is added. |
| `quality_status` | Public-safe readiness status such as `draft`, `ready`, `needs_source_check`, or `deprecated`. |

## Per-Logo Context Matrix

For launch, every logo needs enough context to answer: what does this brand/product refer to, which searches should find it, and what source supports that meaning?

| # | Icon | Reference URL | What It Refers To | Primary Search Intents |
|---:|---|---|---|---|
| 1 | Artificial Analysis | https://artificialanalysis.ai/ | AI model and API benchmarking, leaderboards, and provider comparison. | `ai benchmark`, `llm leaderboard`, `model comparison`, `provider comparison` |
| 2 | Base44 | https://base44.com/ | AI app builder for creating apps and websites from natural language. | `ai app builder`, `vibe coding`, `no code app builder`, `text to app` |
| 3 | Bolt | https://bolt.new/ | Browser-based AI app and web development builder from StackBlitz. | `bolt.new`, `ai app builder`, `browser app builder`, `vibe coding` |
| 4 | BridgeMind.ai | https://www.bridgemind.ai/ | Vibe coding and agentic coding platform for builders using AI agents. | `agentic coding`, `vibe coding platform`, `ai coding platform` |
| 5 | Browserbase | https://www.browserbase.com/ | Browser infrastructure and browser-agent platform for web automation. | `browser automation`, `browser agents`, `headless browser`, `agent runtime` |
| 6 | CapCut | https://www.capcut.com/ | Video editing and AI-assisted creative video platform. | `video editor`, `ai video editor`, `short video editing`, `creator tool` |
| 7 | Cartesia | https://cartesia.ai/ | Real-time voice AI, speech models, and text-to-speech APIs. | `voice ai`, `text to speech`, `realtime voice`, `speech model` |
| 8 | Cohere | https://cohere.com/ | Enterprise AI platform with LLMs, embeddings, search, and reranking. | `enterprise ai`, `llm platform`, `embeddings`, `rerank` |
| 9 | Context7 | https://github.com/upstash/context7 | Upstash MCP server and docs lookup tool for up-to-date code documentation. | `context7`, `mcp docs`, `documentation lookup`, `agent context` |
| 10 | Devin | https://devin.ai/ | Cognition's AI coding agent and software engineering agent. | `devin ai`, `coding agent`, `software engineer agent`, `autonomous coding` |
| 11 | Exa | https://exa.ai/ | AI search engine, search API, crawler, and research API for apps and agents. | `ai search`, `web search api`, `research api`, `agent search` |
| 12 | Factory AI | https://factory.ai/ | Agent-native software development platform and Factory Droids. | `coding agent`, `software development agent`, `droids`, `agentic development` |
| 13 | fal.ai | https://fal.ai/ | Generative media model platform and inference infrastructure for developers. | `generative media`, `image generation api`, `video generation api`, `model inference` |
| 14 | Firecrawl | https://www.firecrawl.dev/ | Web search, scraping, crawling, extraction, and agent web-data APIs. | `web crawler`, `web scraping`, `crawl api`, `agent web data` |
| 15 | Glama | https://glama.ai/ | MCP server registry, inspector, and gateway for discovering agent tools. | `mcp directory`, `mcp registry`, `agent tools`, `tool discovery` |
| 16 | Google AI Studio | https://ai.google.dev/aistudio | Google developer surface for building with Gemini and the Gemini API. | `google ai studio`, `gemini api`, `model studio`, `ai developer platform` |
| 17 | Google Antigravity | https://antigravity.google/ | Google's agentic development platform and agent-first coding environment. | `google antigravity`, `agentic ide`, `coding agent`, `agent development platform` |
| 18 | Goose | https://goose-docs.ai/ | Open-source local AI agent for code, research, writing, automation, and data tasks. | `goose agent`, `local ai agent`, `open source agent`, `desktop agent` |
| 19 | Hermes Agent | https://hermes-agent.nousresearch.com/ | Nous Research open-source self-improving AI agent. | `hermes agent`, `nous research`, `self improving agent`, `open source agent` |
| 20 | HeyGen | https://www.heygen.com/ | AI video generator with avatars, video translation, and marketing video workflows. | `ai avatar`, `ai video generator`, `synthetic video`, `video translation` |
| 21 | Higgsfield | https://higgsfield.ai/ | AI image and video generation platform for creators and campaigns. | `ai video`, `creative ai`, `image generation`, `video generation` |
| 22 | Inngest | https://www.inngest.com/ | Durable execution, background jobs, workflows, and AI agent orchestration. | `durable execution`, `workflow orchestration`, `background jobs`, `ai workflows` |
| 23 | Kickbacks.ai | https://kickbacks.ai/ | Monetization for AI-agent wait states through sponsored status lines. | `agent monetization`, `ai agent ads`, `wait state monetization`, `spinner ads` |
| 24 | Kilo Code | https://kilo.ai/ | Open-source AI coding agent for IDE, CLI, and cloud workflows. | `kilo code`, `ai coding agent`, `open source coding agent`, `agentic engineering` |
| 25 | Kimi | https://www.moonshot.ai/ | Moonshot AI's Kimi assistant, API, and model platform. | `kimi`, `moonshot ai`, `llm assistant`, `long context` |
| 26 | Kling AI | https://kling.ai/ | AI creative studio for image, video, sound, and generative media tools. | `kling ai`, `ai video`, `image to video`, `creative studio` |
| 27 | Lovable | https://lovable.dev/ | Full-stack AI app builder for web apps and websites from natural language. | `lovable`, `ai app builder`, `vibe coding`, `full stack app builder` |
| 28 | Luma AI | https://lumalabs.ai/ | Creative AI platform for video generation, image creation, agents, and APIs. | `luma ai`, `dream machine`, `ai video`, `creative agents` |
| 29 | Manus AI | https://manus.im/ | General AI agent for executing tasks, automating workflows, and building outputs. | `manus ai`, `general agent`, `autonomous agent`, `workflow automation` |
| 30 | Mobbin | https://mobbin.com/ | UI and UX design inspiration library with searchable app screens and flows. | `ui inspiration`, `ux research`, `design patterns`, `app screenshots` |
| 31 | OpenAI Codex | https://developers.openai.com/codex/cloud | OpenAI coding agent for reading, editing, running, and reviewing code. | `openai codex`, `codex app`, `coding agent`, `software engineering agent` |
| 32 | OpenClaw | https://openclaw.ai/ | Personal AI assistant and self-hosted agent surface across chat apps and devices. | `openclaw`, `personal ai assistant`, `self hosted agent`, `chat agent` |
| 33 | OpenCode | https://opencode.ai/docs/ | Open-source AI coding agent for terminal, desktop, and IDE surfaces. | `opencode`, `terminal coding agent`, `open source coding agent`, `developer cli` |
| 34 | Pika | https://pika.art/ | AI video and creative-agent platform from Pika Labs. | `pika`, `ai video`, `video generator`, `creative agent` |
| 35 | Pinecone | https://www.pinecone.io/ | Managed vector database for AI search, RAG, embeddings, and agent memory. | `pinecone`, `vector database`, `rag`, `embeddings`, `agent memory` |
| 36 | PixVerse | https://pixverse.ai/en | AI media and video generation platform with text-to-video and image-to-video workflows. | `pixverse`, `ai video`, `text to video`, `image to video` |
| 37 | Portkey | https://portkey.ai/ | Production stack for GenAI apps including AI gateway, observability, guardrails, and prompts. | `ai gateway`, `llm gateway`, `observability`, `guardrails`, `prompt management` |
| 38 | Runway | https://runwayml.com/ | AI video, image, and creative tools for generation and production workflows. | `runway`, `ai video`, `video generation`, `creative ai` |
| 39 | shadcn/ui | https://ui.shadcn.com/ | Open-source component library and design-system foundation for React apps. | `shadcn`, `ui components`, `component library`, `design system` |
| 40 | Smithery | https://smithery.ai/servers | MCP server directory and connection platform for extending AI agents. | `smithery`, `mcp server`, `mcp directory`, `agent tools` |
| 41 | Stagehand | https://www.browserbase.com/stagehand | Browserbase's open-source AI browser automation framework. | `stagehand`, `browser automation`, `browser agent`, `natural language automation` |
| 42 | StepFun | https://www.stepfun.com/ | StepFun AI model and application platform for building AI apps and agent workflows. | `stepfun`, `llm platform`, `model provider`, `agent platform` |
| 43 | Suno | https://suno.com/ | AI music generator for songs, lyrics, beats, and audio creation. | `suno`, `ai music`, `music generator`, `generative audio` |
| 44 | Supericons | https://supericons.dev/ | Supericons icon search, MCP, Motion Lab, converter, and agent-friendly icon workflows. | `supericons`, `icon library`, `mcp icons`, `agentic icons` |
| 45 | Temporal | https://temporal.io/ | Open-source durable execution and workflow orchestration platform. | `temporal`, `durable execution`, `workflow orchestration`, `reliable workflows` |
| 46 | Trae | https://www.trae.ai/ | AI coding IDE and work assistant for agentic development workflows. | `trae`, `ai coding ide`, `coding agent`, `agentic ide` |
| 47 | Vercel Eve | https://vercel.com/docs/eve | Filesystem-first TypeScript framework for durable backend AI agents. | `vercel eve`, `agent framework`, `durable agents`, `filesystem first agents` |
| 48 | xAI | https://x.ai/ | AI company building Grok models, API, and assistant experiences. | `xai`, `grok`, `llm platform`, `frontier ai models` |
| 49 | Xiaomi MiMo | https://mimo.xiaomi.com/ | Xiaomi MiMo model family and AI platform for reasoning, coding, and agent workflows. | `xiaomi mimo`, `mimo`, `reasoning model`, `coding model`, `agent model` |
| 50 | Z.ai | https://z.ai/ | GLM model platform and AI assistant/API for coding, agents, and long-horizon tasks. | `z.ai`, `zai`, `glm`, `glm model`, `agentic engineering` |

## Search And MCP Requirements

### Requirement 1: Keep Logos Free

All 50 logos should remain free at launch.

Acceptance signal:

- No `si` logo is paywalled.
- Search results and MCP responses can return the SVG for these logos without Pro gating.
- Public messaging says the logo pack is free and clarifies trademark ownership remains with each brand owner.

### Requirement 2: Preserve Rich Source Registry Profiles

The source registry should remain the richest record for each logo.

Acceptance signal:

- Every logo has exact name, aliases, semantic tags, filter tags, use guidance, avoid guidance, source URL, source trust, and rights note.
- Each direct product-name query maps to the correct `si:` logo.

### Requirement 3: Expose Meaning Metadata To Public Search

The public app index should either expose `semantic_tags` and `synonyms`, or the search layer should read the richer registry export when ranking `si` icons.

Acceptance signal:

- Queries such as `bolt ai logo`, `vector database`, `text to speech`, `mcp browser automation`, and `ai app builder` rank relevant Supericons results above generic shape icons when the user intent is logo/tool discovery.

### Requirement 4: Align Web Search And MCP Search

MCP tools should use the same searchable fields as the web app.

Acceptance signal:

- `search_icons`, `recommend_icons`, and any future `get_supericon_profile` tool agree on top candidates for the same user intent.
- MCP responses include concise `meaning`, `use_when`, `avoid_when`, and `source_url` for `si` logos when requested.

### Requirement 5: Use Controlled Facets, But Rich Hidden Search

User-facing filters should stay clean. Hidden search terms can be more expansive.

Acceptance signal:

- Facets use a small controlled vocabulary such as `ai-app-builders`, `coding-agents-dev-environments`, `agent-infrastructure-runtime`, `mcp-tooling-protocols`, `generative-media-creative-ai`, `voice-audio-ai`, `model-platforms-ai-labs`, `design-ui-intelligence`, and `ai-search-research-evaluation`.
- Hidden search covers aliases, domains, products, parent companies, and common builder phrases.

## Implementation Plan

### Phase 0: Inventory And Source Context

- Add or generate a source-context field set for all 50 logos.
- Use the per-logo matrix above as the initial launch reference.
- Prefer official homepages, official docs, official repositories, official app listings, or official product pages.
- Mark any logo with weak or ambiguous source context as `needs_source_check`.

Deliverable:

- Updated source registry or generated profile projection with `source_url`, `source_trust`, and `rights` fields.

### Phase 1: Profile Projection

- Define a public-safe Supericon Profile v0.1 projection for `brand-logo`.
- Generate profile records from the existing source registry.
- Avoid internal process metadata in public files.
- Keep public fields business-safe and product-focused.

Deliverable:

- Public profile projection for the 50 logos.
- Schema validation for required launch fields.

### Phase 2: Search Ranking

- Include `semantic_tags`, `synonyms`, `ai_filter_tags`, `job_category`, and `secondary_categories` in web and MCP ranking.
- Add direct brand-match boost for exact labels, slugs, domains, and aliases.
- Add logo-intent boost when a query includes `logo`, `brand`, `icon`, `mark`, or a known product name.
- Add category-intent boost for AI-tool phrases such as `vibe coding`, `browser automation`, `mcp directory`, `text to speech`, `vector database`, `ai video`, and `ai app builder`.

Deliverable:

- Shared scoring behavior for web and MCP.

### Phase 3: Query Fixtures

Add a launch query fixture suite.

Required exact-name fixtures:

- `bolt logo` should return `si:bolt` in the top result group.
- `pinecone logo` should return `si:pinecone`.
- `cartesia logo` should return `si:cartesia`.
- `context7 mcp logo` should return `si:context7`.
- `openai codex logo` should return `si:openai-codex-app`.

Required intent fixtures:

- `ai app builder logo` should return Base44, Bolt, Lovable, or BridgeMind.ai among the top candidates.
- `browser automation agent logo` should return Browserbase or Stagehand among the top candidates.
- `mcp server directory logo` should return Glama or Smithery among the top candidates.
- `text to speech ai logo` should return Cartesia among the top candidates.
- `vector database ai logo` should return Pinecone among the top candidates.
- `ai video generator logo` should return Runway, Kling AI, Pika, Luma AI, PixVerse, Higgsfield, HeyGen, CapCut, or fal.ai among the top candidates.

Deliverable:

- Automated fixtures that fail when generic icon libraries outrank obvious `si` logo matches for AI-logo intent queries.

### Phase 4: Launch Readiness

- Confirm all 50 logos render in the public app.
- Confirm all 50 profiles appear in MCP-accessible registry data.
- Confirm no logo is marked premium.
- Add public launch copy that says the AI logo pack is free.
- Add a trademark note: logos belong to their respective owners and are provided for identification and UI reference.
- Add a "request a logo" path for missing AI products.
- Add analytics or event tracking for failed searches and logo copy/export events.

Deliverable:

- Launch checklist with search, MCP, profile, rights, and visual QA complete.

## Success Metrics

Primary metric:

- Direct logo searches return the intended Supericons logo in the top result group for at least 95 percent of the 50 logos.

Supporting metrics:

- Intent queries for AI categories return relevant `si` logos in the top 5.
- MCP `search_icons` and public web search agree on relevant `si` candidates.
- Failed searches for AI-logo terms decrease after launch.
- Users copy or export `si` logos from the public app and through MCP.
- "Request a logo" submissions identify the next AI logos to add.

Guardrail metrics:

- No paid gating appears on the 50 free logos.
- No public profile claims endorsement or affiliation.
- No public profile includes internal generation, model, or workflow metadata.

## Risks And Dependencies

| Risk | Why It Matters | Mitigation |
|---|---|---|
| Trademark confusion | Logos belong to third-party brands. | Add rights notes and avoid endorsement language. |
| Search overfitting | Brand logos might outrank generic icons when user wants a generic concept. | Use logo-intent boosts only when query suggests product, brand, or logo intent. |
| Metadata drift | AI products change quickly. | Store source URL and update date; add periodic source check. |
| Public index mismatch | Rich source fields may exist but not reach app search. | Use a shared registry export or profile projection for all search surfaces. |
| Too many tags | Search can become noisy if every term is equally weighted. | Separate exact aliases, semantic search terms, and browse filters. |
| Weak source pages | Some newer products may have sparse official pages. | Allow official docs, official repository, or app listing as source trust fallback. |

## Open Questions

- Should source URLs live directly in `supericons.json`, or in a generated profile projection that enriches the source registry?
- Should the public app index stay lightweight and search against registry records separately?
- Should Supericons add a new MCP tool named `get_supericon_profile`, or fold profiles into existing `get_icon`/`search_icons` responses?
- Should brand logos live under a visible `Brands` category, or remain categorized by the practical AI job they support?
- Should `brand-logo` be hidden as a base filter tag rather than shown as a user-facing category?

## Recommendation

Use the logo pack as the free launch wedge.

Do not sell logos one by one. A $1 per-icon model adds friction, creates rights ambiguity around third-party marks, and weakens the free discovery loop. The stronger launch move is to make the 50 logos free, extremely searchable, source-aware, and agent-friendly.

Monetize later with original Supericons products:

- AI agent status icon systems
- Trust, approval, risk, and guardrail icon packs
- Smart loaders for AI tools
- Animated stateful icons
- Style-matched UI icon families
- Figma-ready and React-ready bundles
- Advanced MCP workflows and profile tools

## Goal Prompt

Use this prompt for the next implementation pass:

```text
Prepare the Supericons Agentic AI Tools logo pack for launch without changing the monetization decision: all 50 logos stay free.

Start by verifying the current source registry, public app index, public registry export, and MCP registry export. Then implement a public-safe Supericon Profile v0.1 projection or equivalent registry enrichment for the 50 `si` brand-logo records.

For each logo, ensure the searchable profile includes:
- stable id, name, slug, pack, asset_type
- source_url and source_trust
- meaning
- aliases/synonyms
- semantic search terms
- controlled filter tags
- category, job category, and secondary categories
- use_when and avoid_when
- rights/trademark note
- free access tier
- public-safe quality status

Use the PRD at `docs/supericons-ai-logo-profile-search-prd-2026-06-26.md` as the product source of truth.

Then align public web search and MCP search so they use the same meaning fields. Include semantic_tags, synonyms, ai_filter_tags, job_category, and secondary_categories in scoring. Add brand-match and logo-intent boosts, while avoiding over-boosting logos for generic concept searches.

Add launch query fixtures that prove direct logo searches and practical AI intent searches return the correct Supericons logos. At minimum cover Bolt, Pinecone, Cartesia, Context7, OpenAI Codex, AI app builders, browser automation agents, MCP directories, text-to-speech, vector databases, and AI video generators.

Run the existing registry verification plus the new search fixtures. Report exactly what changed, which files were touched, and which verification commands passed or failed.
```
