# Supericons Agentic AI Tools Tag Vetting

Date: 2026-06-17

## Purpose

This note lists the current 50 Supericons Agentic AI Tools logos and a proposed tag set for human review.

It is a vetting document, not an implementation change.

## Verified Current State

The current pack contains 50 icons in `data/supericons/icon-library/agentic-ai-tools-logos-001/manifest.json`.

The source registry has richer meaning fields in `data/si-registry/source/libraries/supericons.json`, including:

- `purpose`
- `category`
- `semantic_tags`
- `use_when`
- `avoid_when`
- `access_tier`
- `review_state`
- `synonyms`

The public icon index only exposes:

- `id`
- `lib`
- `name`
- `style`
- `svg`
- `type`

That means the current public app data does not expose the richer Supericons meaning fields.

The runtime taxonomy layer in `lib/icon-taxonomy-seed.js` maps only 12 of the 50 Supericons icons to a visible job category. `public/icon-taxonomy.json` currently contains 0 `si:` entries.

## Schema Diagnosis

The icon schema is not complete enough for the Supericons goal.

The current manifest is useful for loading SVGs, but it is too thin for search, filtering, agent use, and review. The source registry is closer to the right direction, but its useful fields are not projected into the public icon index or the dropdown taxonomy.

Recommended next schema layer:

- Keep the current lightweight icon index for fast loading.
- Add a public-safe Supericon profile projection for the 50 records.
- Keep `semantic_tags` as search terms.
- Add `filter_tags` for faceted browsing.
- Add `job_category` and `secondary_categories` for dropdown filtering.
- Add `source_trust`, `review_status`, and `rights_notes` for audit and release readiness.

## Proposed Tag Vocabulary

Every icon in this batch should keep base tags:

- `brand-logo`
- `agentic-ai-tools-pack`

Use the following additional filter tags for vetting:

- `ai-app-builder`
- `coding-agent-devtools`
- `browser-web-automation`
- `mcp-agent-tools`
- `model-llm-platform`
- `creative-video-media`
- `voice-audio`
- `workflow-infrastructure`
- `design-research`
- `assistant-agent`
- `ai-search-research`
- `generative-media-infrastructure`
- `monetization-agent-ads`
- `icon-library-brand`

## Vetting Table

| # | Icon | Recommended Dropdown Category | Proposed Tags To Vet |
|---:|---|---|---|
| 1 | Artificial Analysis | Data & Analytics | `model-llm-platform`, `benchmark-leaderboard`, `ai-provider-comparison` |
| 2 | Base44 | Code & Development | `ai-app-builder`, `no-code-low-code`, `vibe-coding` |
| 3 | Bolt | Code & Development | `ai-app-builder`, `browser-app-builder`, `vibe-coding`, `web-development` |
| 4 | BridgeMind.ai | Code & Development | `ai-app-builder`, `coding-agent-devtools`, `vibe-coding` |
| 5 | Browserbase | Code & Development | `browser-web-automation`, `agent-browser`, `web-data-infrastructure` |
| 6 | CapCut | Media & Playback | `creative-video-media`, `video-editor`, `content-creation` |
| 7 | Cartesia | Media & Playback | `voice-audio`, `text-to-speech`, `realtime-voice` |
| 8 | Cohere | AI & Automation | `model-llm-platform`, `enterprise-ai`, `embeddings-rerank` |
| 9 | Context7 | Code & Development | `mcp-agent-tools`, `documentation-lookup`, `agent-context` |
| 10 | Devin | Code & Development | `coding-agent-devtools`, `software-engineering-agent`, `autonomous-agent` |
| 11 | Exa | Data & Analytics | `ai-search-research`, `web-search-api`, `mcp-agent-tools` |
| 12 | Factory AI | Code & Development | `coding-agent-devtools`, `software-engineering-agent`, `agentic-development` |
| 13 | fal.ai | Media & Playback | `generative-media-infrastructure`, `creative-video-media`, `image-video-api` |
| 14 | Firecrawl | Code & Development | `browser-web-automation`, `web-crawling`, `web-data-extraction` |
| 15 | Glama | Code & Development | `mcp-agent-tools`, `mcp-directory`, `agent-tools-directory` |
| 16 | Google AI Studio | AI & Automation | `model-llm-platform`, `ai-developer-platform`, `gemini-api` |
| 17 | Google Antigravity | Code & Development | `coding-agent-devtools`, `agentic-development`, `ai-editor` |
| 18 | Goose | Code & Development | `assistant-agent`, `local-agent`, `open-source-agent`, `developer-tool` |
| 19 | Hermes Agent | AI & Automation | `assistant-agent`, `agent-workflow`, `personal-ai` |
| 20 | HeyGen | Media & Playback | `creative-video-media`, `ai-avatar`, `video-generator` |
| 21 | Higgsfield | Media & Playback | `creative-video-media`, `ai-video`, `creator-tool` |
| 22 | Inngest | Code & Development | `workflow-infrastructure`, `durable-execution`, `background-jobs` |
| 23 | Kickbacks.ai | Commerce & Finance | `monetization-agent-ads`, `wait-state-monetization`, `spinner-ads` |
| 24 | Kilo Code | Code & Development | `coding-agent-devtools`, `coding-agent`, `developer-tool` |
| 25 | Kimi | AI & Automation | `assistant-agent`, `llm-client`, `moonshot-ai` |
| 26 | Kling AI | Media & Playback | `creative-video-media`, `ai-video`, `video-generator` |
| 27 | Lovable | Code & Development | `ai-app-builder`, `vibe-coding`, `app-generation` |
| 28 | Luma AI | Media & Playback | `creative-video-media`, `ai-video`, `3d-generation` |
| 29 | Manus AI | AI & Automation | `assistant-agent`, `general-agent`, `automation` |
| 30 | Mobbin | Design & Editing | `design-research`, `ui-inspiration`, `interface-patterns` |
| 31 | OpenAI Codex | Code & Development | `coding-agent-devtools`, `coding-agent`, `openai-platform` |
| 32 | OpenClaw | AI & Automation | `assistant-agent`, `personal-ai`, `agentic-workflow` |
| 33 | OpenCode | Code & Development | `coding-agent-devtools`, `terminal-agent`, `open-source-agent` |
| 34 | Pika | Media & Playback | `creative-video-media`, `ai-video`, `video-generator` |
| 35 | Pinecone | Data & Analytics | `model-llm-platform`, `vector-database`, `rag-memory` |
| 36 | PixVerse | Media & Playback | `creative-video-media`, `ai-video`, `video-generator` |
| 37 | Portkey | Code & Development | `workflow-infrastructure`, `ai-gateway`, `observability`, `guardrails` |
| 38 | Runway | Media & Playback | `creative-video-media`, `ai-video`, `video-generation` |
| 39 | shadcn/ui | Design & Editing | `design-research`, `component-library`, `developer-ui-tooling` |
| 40 | Smithery | Code & Development | `mcp-agent-tools`, `mcp-directory`, `tool-directory` |
| 41 | Stagehand | Code & Development | `browser-web-automation`, `agent-browser`, `browserbase-stack` |
| 42 | StepFun | AI & Automation | `model-llm-platform`, `model-provider`, `ai-model` |
| 43 | Suno | Media & Playback | `voice-audio`, `ai-music`, `generative-audio` |
| 44 | Supericons | Design & Editing | `icon-library-brand`, `design-assets`, `agentic-icons` |
| 45 | Temporal | Code & Development | `workflow-infrastructure`, `durable-execution`, `workflow-orchestration` |
| 46 | Trae | Code & Development | `coding-agent-devtools`, `ai-editor`, `agentic-development` |
| 47 | Vercel Eve | Code & Development | `workflow-infrastructure`, `agent-framework`, `durable-agents` |
| 48 | xAI | AI & Automation | `model-llm-platform`, `grok`, `ai-model` |
| 49 | Xiaomi MiMo | AI & Automation | `model-llm-platform`, `model-provider`, `ai-model` |
| 50 | Z.ai | AI & Automation | `model-llm-platform`, `glm`, `model-provider` |

## Suggested Implementation Direction After Vetting

1. Add `filter_tags`, `job_category`, and `secondary_categories` to the source registry records.
2. Update the build step so public Supericons records expose safe metadata beyond the SVG.
3. Generate `public/icon-taxonomy.json` with `si:` entries instead of relying only on seed mappings.
4. Keep broad search keywords in `semantic_tags`, not in the dropdown.
5. Keep dropdown tags fewer and cleaner than search tags.

## Open Vetting Questions

- Should all brand logos sit under `Brands & Social`, or should AI-tool logos remain under their practical use category?
- Should creative generation tools live under `Media & Playback`, `Design & Editing`, or a new `Creative AI` category?
- Should infrastructure tools like Pinecone, Portkey, Temporal, Inngest, Firecrawl, and Browserbase live under `Code & Development` or a new `AI Infrastructure` category?
- Should `brand-logo` be hidden as a base tag instead of shown in the dropdown?
- Should `model-llm-platform` and `assistant-agent` be separate user-facing tags, or should both roll up into `AI & Automation`?
