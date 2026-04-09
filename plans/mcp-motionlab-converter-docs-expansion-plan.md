# MCP, Motion Lab, Converter, And Docs Expansion Plan

## Goal

Strengthen Supericons' launch roadmap by:

1. correcting MCP copy so it matches the real entitlement model
2. mapping the current MCP framework and sitemap
3. defining MCP access for Motion Lab and Converter as a Pro workflow value proposition
4. introducing a systematic guides and docs section for onboarding, workflows, and troubleshooting

This proposal is repo-grounded. No external research was required for the current-state audit because the existing codebase already contains the relevant MCP, Motion Lab, Converter, pricing, and dashboard flows.

## Current Repo-Grounded Findings

### 1. Where the current premium MCP claim is stated

This exact copy currently appears in the in-app MCP hub:

- [store.js](../store.js): `Search, retrieve, and paste SVG icons directly into code through the Model Context Protocol. Free icons work out of the box. Premium collections unlock with a Pro subscription or API key.`

Why this is incomplete:

- an API key does not independently unlock premium access
- the API key carries existing entitlement
- the actual entitlement sources are:
  - Pro subscription
  - purchased premium packs
  - generated API key tied to that entitled user

Related supporting surfaces:

- [store.js](../store.js): `API Keys` with subtitle `For MCP and programmatic access`
- [mcp/auth.js](../mcp/auth.js): MCP reads `SUPERICONS_API_KEY`
- [mcp/index.js](../mcp/index.js): premium errors instruct users to set `SUPERICONS_API_KEY`

### 2. Where the stale count/library copy is stated

This stale MCP tool description currently appears in the MCP server:

- [mcp/index.js](../mcp/index.js): `Search 19,000+ icons across 9 libraries using AI-powered synonym expansion. Returns matching icons with SVG code. Premium collections require a Pro API key.`

Why this is a problem:

- the broader product copy says `20,000+` and `10 libraries`
- the MCP package metadata also says `20,000+ icons from 10 libraries`
- the MCP `libraryMeta` currently lists 9 free libraries, so either:
  - the MCP implementation is missing one library
  - or the marketing copy is ahead of the MCP implementation

### 3. Current MCP framework and sitemap

#### Public-facing surfaces

| Surface | Route / File | Purpose | Current gap |
| --- | --- | --- | --- |
| Landing MCP teaser | [index.html](../index.html) | top-level MCP discovery and install snippet | free path only, no premium setup |
| In-app MCP hub | [store.js](../store.js) via `/?view=mcp` | main MCP product page | premium onboarding underexplained |
| Static MCP URL redirect | [public/mcp/index.html](../public/mcp/index.html) | shareable MCP URL that redirects into app shell | no independent docs IA |
| Pricing page | [store.js](../store.js) via `/?view=pricing` | communicates free vs paid MCP access | not linked tightly enough to setup flow |
| Dashboard API keys | [store.js](../store.js) via `/?view=dashboard` | generate keys for MCP / programmatic access | disconnected from MCP hub instructions |
| Terms / privacy mentions | [store.js](../store.js) | legal framing for MCP access | informational only |

#### Current MCP product architecture

| Layer | File | Responsibility |
| --- | --- | --- |
| MCP package entry | [mcp/package.json](../mcp/package.json) | package metadata, install target |
| MCP server | [mcp/index.js](../mcp/index.js) | tool registration and responses |
| MCP auth | [mcp/auth.js](../mcp/auth.js) | validates `SUPERICONS_API_KEY` |
| Edge validation | [supabase/functions/validate-mcp-key/index.ts](../supabase/functions/validate-mcp-key/index.ts) | resolves entitlement |
| Dashboard key generation | [store.js](../store.js) | user-generated API keys |

#### Current MCP tools

| Tool | Current role |
| --- | --- |
| `search_icons` | search free and entitled premium icon results |
| `get_icon` | fetch one icon payload |
| `list_libraries` | list available libraries and premium access state |

### 4. Current workflow tool status

#### Motion Lab

- current surface: browser UI only
- route: `/?view=motion-lab`
- core capability today:
  - load an icon
  - choose preset / tune parameters
  - export CSS
  - export standalone animated SVG
- current MCP status: not exposed through MCP

#### Converter

- current surface: browser UI only
- route: `/?view=converter`
- core capability today:
  - SVG to PNG
  - PNG to SVG
  - color and export controls
  - download / copy converted output
- current MCP status: not exposed through MCP

## Copy Corrections

### Replace the current premium statement

#### Current

`Free icons work out of the box. Premium collections unlock with a Pro subscription or API key.`

#### Recommended

`Free icons work out of the box. Premium collections are available when your account has Pro or purchased pack access and your MCP client is connected with your Supericons API key.`

Why this is better:

- accurate entitlement model
- includes pack buyers
- makes the API key a transport/auth step instead of the source of entitlement

### Replace the stale `19,000+ icons across 9 libraries` wording

Use one of these, depending on implementation truth at ship time.

#### Preferred launch copy if MCP is aligned to product counts

`Search 20,000+ free icons across 10 libraries. Premium collections are available when your API key is linked to a Pro subscription or purchased packs.`

#### Safe interim copy if implementation is not yet count-aligned

`Search free icons across the libraries currently supported by Supericons MCP. Premium collections are available when your API key is linked to a Pro subscription or purchased packs.`

Recommendation:

- do not ship a numeric claim in MCP until the server metadata, package metadata, and product copy all match

## Proposed MCP UX Flow

### Primary user journeys

#### Journey A: Free MCP user

1. discover MCP from landing, pricing, or docs
2. copy base MCP config
3. restart MCP client
4. ask agent for icon search
5. search icons and retrieve SVG

#### Journey B: Premium MCP user

1. sign in to Supericons
2. subscribe to Pro or buy a premium pack
3. open Dashboard
4. generate API key
5. add `SUPERICONS_API_KEY` to MCP client config
6. restart MCP client
7. ask for premium icon, Motion Lab action, or Converter action

#### Journey C: Revoked or invalid key

1. agent tries premium request
2. MCP returns access error
3. docs point user to Dashboard > API Keys
4. user regenerates or replaces key

### Required states for the MCP docs experience

- anonymous free setup
- signed-in but no entitlement
- entitled but no API key created yet
- valid premium key
- invalid or revoked key
- server installed but tool unavailable
- premium tool requested without Pro / pack entitlement

## Proposed MCP Access Expansion

## Principle

MCP should not stop at icon retrieval. For Pro, it should expose the workflow tools that make Supericons more than a library.

### A. Motion Lab MCP access

#### Product value

- lets agents animate icons without sending users back into the browser
- turns Motion Lab into a programmable workflow tool for UI prototyping, design systems, and agent-assisted frontend work
- supports the Pro promise that workflow tools are part of the subscription value

#### Proposed MCP tool family

| Tool | Purpose |
| --- | --- |
| `list_motion_presets` | list available animation presets and categories |
| `animate_icon` | apply a preset and return a preview-ready motion payload |
| `export_motion_css` | return external CSS for animated inline SVG usage |
| `export_animated_svg` | return a standalone animated SVG |
| `get_motion_recipe` | explain trigger, duration, easing, and output usage in human-readable form |

#### Proposed inputs

- icon id
- library or premium pack
- preset
- trigger: `loop`, `hover`, `click`
- duration / speed
- fill / stroke / scale / rotate overrides where supported
- output format: CSS or standalone SVG

#### Proposed outputs

- animated SVG text
- external CSS text
- metadata:
  - trigger
  - duration
  - preset name
  - entitlement source

#### Guardrails

- premium packs still require entitlement
- one-icon-per-request workflow, not bulk pack export
- preserve current sanitization and protection rules

### B. Converter MCP access

#### Product value

- gives agents direct format conversion without leaving the coding workflow
- enables automated icon pipeline tasks
- strengthens Pro as a workflow utility tier, not just a content-access tier

#### Proposed MCP tool family

| Tool | Purpose |
| --- | --- |
| `convert_svg_to_png` | convert SVG input into PNG output |
| `convert_png_to_svg` | trace raster input into SVG output |
| `inspect_converter_input` | analyze compatibility, paint support, and trace risks |
| `suggest_converter_settings` | recommend preset, asset mode, and output size before conversion |

#### Proposed inputs

- raw SVG text or PNG/image payload
- mode: `svg-to-png` or `png-to-svg`
- export size
- background
- quality or preset
- asset mode
- color overrides where applicable

#### Proposed outputs

- SVG text
- PNG artifact payload
- trace / rasterization metadata
- compatibility warnings

#### Guardrails

- use the same pro gating already applied in browser converter exports
- keep output-focused responses instead of exposing internal tracing implementation details
- clearly separate deterministic conversion outputs from heuristic suggestions

## Proposed Docs And Guides IA

## Goal

Create a lightweight but systematic docs section so users and agents can understand:

- what Supericons is
- how free vs premium access works
- how MCP works
- how to use Motion Lab and Converter
- how to troubleshoot setup and entitlement issues

### Proposed top-level docs sections

| Section | Purpose |
| --- | --- |
| Overview | what Supericons offers, who it is for |
| Quickstart | fastest path for free and premium users |
| MCP Setup | install and authenticate the MCP server |
| Client Guides | client-specific MCP instructions |
| Tool Reference | MCP tool catalog and payload examples |
| Motion Lab Guide | presets, triggers, exports, agent usage |
| Converter Guide | SVG to PNG, PNG to SVG, agent workflows |
| Entitlements | free vs Pro vs pack access |
| Recipes | common prompts and workflow patterns |
| Troubleshooting | invalid keys, no results, client config issues |
| Legal / usage | licensing, AI usage, asset boundaries |

### Proposed docs sitemap

- `/docs`
- `/docs/quickstart`
- `/docs/mcp/overview`
- `/docs/mcp/free-setup`
- `/docs/mcp/premium-setup`
- `/docs/mcp/clients/claude-code`
- `/docs/mcp/clients/codex`
- `/docs/mcp/clients/cursor`
- `/docs/mcp/clients/windsurf`
- `/docs/mcp/clients/cline`
- `/docs/mcp/clients/copilot-agent`
- `/docs/mcp/tools/icons`
- `/docs/mcp/tools/motion-lab`
- `/docs/mcp/tools/converter`
- `/docs/workflows/motion-lab`
- `/docs/workflows/converter`
- `/docs/recipes`
- `/docs/troubleshooting`
- `/docs/entitlements`

### Required documentation content

#### Free path

- install snippet
- what tools work without a key
- sample prompts

#### Premium path

- where to generate API key
- how to add `SUPERICONS_API_KEY`
- how Pro differs from pack ownership
- how Motion Lab and Converter access work for agents

#### Tool docs

- input schema
- output schema
- examples
- error states
- entitlement requirements

## Implementation Phases

### Phase 1. Copy And Truth Alignment

- fix premium MCP copy in the in-app hub
- fix stale tool description in MCP package/server
- align all numeric/library claims with actual MCP implementation

### Phase 2. MCP Hub Information Architecture

- split MCP onboarding into:
  - Free setup
  - Premium setup
- add Dashboard API key step to the premium path
- add explicit state messaging for invalid / revoked / missing key

### Phase 3. Docs And Guides Section

- introduce docs IA and route structure
- write quickstart, entitlement, and client setup guides
- add tool reference pages for icon retrieval first

### Phase 4. Motion Lab MCP

- define tool contracts
- reuse current motion export logic where possible
- enforce per-icon entitlement rules
- document example agent workflows

### Phase 5. Converter MCP

- define binary/text payload strategy
- expose conversion tools behind Pro gating
- document supported inputs, outputs, and failure states

### Phase 6. QA And Launch Readiness

- verify free and premium MCP flows end to end
- verify revoked-key and no-entitlement states
- verify docs match actual implementation
- verify Motion Lab and Converter MCP tools do not bypass existing protection measures

## Non-Goals

- rewriting the full pricing model
- rebuilding Motion Lab or Converter browser UX
- publishing speculative MCP tools before the underlying contracts are defined
- shipping count claims that are not implementation-true

## Recommended Immediate Next Steps

1. correct MCP copy and claims before launch
2. add a premium setup block to the existing MCP page
3. create the docs section IA and first three pages:
   - quickstart
   - MCP free setup
   - MCP premium setup
4. scope Motion Lab MCP as the first Pro workflow-tool expansion
5. scope Converter MCP immediately after Motion Lab
