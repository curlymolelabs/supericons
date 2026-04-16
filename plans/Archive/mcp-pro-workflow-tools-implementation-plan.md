# MCP Pro Workflow Tools Implementation Plan

Date: 2026-04-09

## Goal

Implement Motion Lab MCP and Converter MCP as real Pro workflow tools, using the existing Supericons entitlement system without weakening current premium protections or breaking the browser experience.

This plan is intentionally scoped to:

- Pro gating for workflow tools
- MCP architecture and tool design
- safe extraction of shared logic from browser-only code
- rollout order
- verification and abuse controls

The docs-link routing issue is already fixed separately and is not part of this build plan.

## Product Decision

### Entitlement rule

- `search_icons`, `get_icon`, and `list_libraries` keep the current access model
  - free icons: anonymous or authenticated
  - premium pack icons: `isPro` or matching `purchasedSlugs`
- Motion Lab MCP is `Pro only`
- Converter MCP is `Pro only`

### Why this split is correct

- browser Motion Lab exports are already Pro-gated in [store.js](../store.js)
- browser Converter exports are already Pro-gated in [store.js](../store.js)
- premium icon retrieval already supports either Pro or purchased-pack entitlement in [mcp/index.js](../mcp/index.js)
- workflow tools are part of the Pro value proposition, not part of single-pack ownership

### Explicit boundary

- a purchased pack owner without Pro may access their entitled premium icon assets through MCP
- a purchased pack owner without Pro may not access Motion Lab MCP or Converter MCP

## Current Repo-Grounded Foundation

### Existing MCP auth and entitlement flow

- [mcp/auth.js](../mcp/auth.js)
  - reads `SUPERICONS_API_KEY`
  - validates the key through Supabase
- [supabase/functions/validate-mcp-key/index.ts](../supabase/functions/validate-mcp-key/index.ts)
  - returns:
    - `authenticated`
    - `isPro`
    - `purchasedSlugs`
    - `userId`
- [mcp/index.js](../mcp/index.js)
  - already distinguishes:
    - full premium access for `isPro`
    - pack-scoped premium access for `purchasedSlugs`

### Existing browser workflow gating

- Motion Lab export actions are gated by `requirePro()` in [store.js](../store.js)
- Converter copy/download actions are gated by `requirePro()` in [store.js](../store.js)
- dashboard API key UI already appears for:
  - Pro users
  - users with purchased packs

This means the launch-safe move is to reuse the current entitlement truth, not invent a new MCP-specific billing model.

## Implementation Principles

1. Keep entitlement logic server-truthful.
2. Do not trust client-side MCP tool hints as the source of access control.
3. Reuse existing export builders wherever possible.
4. Extract pure logic out of browser-render code before exposing any MCP tool.
5. Ship Motion Lab MCP before Converter MCP.
6. Add payload and rate guardrails before enabling binary-heavy converter workflows.

## Phase 1: Shared MCP Capability Layer

### Objective

Create a small capability resolver so every MCP tool can make one consistent entitlement decision.

### Changes

- add a shared helper in MCP runtime, for example:
  - `hasPremiumPackAccess(packSlug)`
  - `hasProWorkflowAccess()`
  - `canUseMotionLabMcp()`
  - `canUseConverterMcp()`
- define rules centrally:
  - `hasPremiumPackAccess(packSlug)` returns true for `isPro` or matching `purchasedSlugs`
  - `hasProWorkflowAccess()` returns true only for `isPro`

### Why first

This prevents entitlement drift once more MCP tools are added.

## Phase 2: Motion Lab Shared Logic Extraction

### Objective

Separate Motion Lab export generation from browser DOM concerns so it can be called by MCP tools safely.

### Current browser-only sources

- [store.js](../store.js) Motion Lab rendering and controls
- existing CSS and animated SVG export builders in the Motion Lab section

### Extraction target

Create a shared module that accepts structured input and returns exportable output without depending on:

- `document`
- mounted preview DOM
- active browser view state
- tooltip or panel UI state

### Candidate extracted functions

- preset lookup and validation
- animation track normalization
- trigger normalization
- standalone animated SVG builder
- motion CSS builder
- recipe summary builder

### Input contract

- icon SVG
- icon identifier
- preset
- trigger
- duration or speed
- optional fill and stroke overrides
- optional transform overrides where supported

### Output contract

- standalone animated SVG string
- external CSS string
- metadata:
  - preset
  - trigger
  - duration
  - warnings if unsupported

## Phase 3: Motion Lab MCP Tool Family

### Objective

Expose the first Pro workflow MCP surface using the extracted shared module.

### Proposed tools

- `list_motion_presets`
  - returns available presets and categories
- `animate_icon`
  - validates icon and preset, returns normalized motion payload
- `export_motion_css`
  - returns CSS animation code for the requested icon and preset
- `export_animated_svg`
  - returns standalone animated SVG
- `get_motion_recipe`
  - returns human-readable usage guidance for trigger, duration, and output

### Gating

- all five tools require `hasProWorkflowAccess()`
- non-Pro keys receive a clear access error:
  - explain that Motion Lab MCP is a Pro workflow tool
  - point to Pricing and Dashboard API Keys

### Safe launch constraints

- first version supports one icon at a time
- first version supports a curated preset list only
- first version supports text outputs only
  - SVG string
  - CSS string
  - recipe text

## Phase 4: Converter Shared Logic Extraction

### Objective

Separate reusable converter transforms from the browser workspace and preview UI.

### Current browser-heavy areas

- SVG-to-PNG export path in [store.js](../store.js)
- PNG-to-SVG tracing path in [store.js](../store.js)
- preview zoom, split view, mobile hints, and other UI-only behaviors

### Extraction target

Create shared converter services for:

- sanitizing input SVG
- preparing SVG for rasterization
- generating styled SVG export payload
- tracing PNG to SVG through the approved engine path
- packaging final output and metadata

### Important design constraint

Do not expose the entire browser workspace model to MCP. MCP should expose task-oriented conversion tools, not the full UI state machine.

## Phase 5: Converter MCP Tool Family

### Objective

Expose Pro-only converter workflows in a narrow, agent-friendly way.

### Proposed tools

- `convert_svg_to_png`
  - input: SVG text, output size, background mode
  - output: PNG as base64 or downloadable artifact text payload format
- `convert_png_to_svg`
  - input: PNG payload plus trace options
  - output: SVG text
- `inspect_converter_options`
  - returns supported presets, size ranges, and current limits

### Gating

- all converter MCP tools require `hasProWorkflowAccess()`
- pack ownership alone does not grant converter access

### Guardrails

- no arbitrary remote URL fetching in v1
- no filesystem path access through MCP in v1
- payload size limit for input images
- maximum output dimensions
- timeout protection for tracing jobs
- structured errors for unsupported payloads

## Phase 6: Docs And Product Copy Alignment

### Objective

Keep the product honest while the rollout is phased.

### During implementation

- keep public docs and MCP hub saying:
  - Motion Lab MCP is planned until Phase 3 ships
  - Converter MCP is planned until Phase 5 ships

### When Motion Lab MCP ships

- update docs to mark Motion Lab MCP as live
- keep Converter MCP labeled planned

### When Converter MCP ships

- update docs and pricing language to mark both as live Pro workflow tools

## Phase 7: Security And Abuse Controls

### Objective

Prevent MCP from becoming a bulk extraction or unbounded file-processing surface.

### Required controls

- enforce auth on every Pro workflow tool call
- apply per-request payload limits
- apply rate limits keyed to API key and user
- reject unsupported MIME types
- avoid returning internal stack traces
- log entitlement failures and oversized payload failures

### Protection compatibility

This plan preserves the existing protection model by:

- keeping pack entitlement checks for premium icon access
- keeping Pro-only gating for workflow tools
- not exposing raw premium bundle internals
- reusing existing sanitized export builders where applicable

## Rollout Order

### Recommended sequence

1. shared MCP capability layer
2. Motion Lab shared logic extraction
3. Motion Lab MCP tools
4. QA and docs update for Motion Lab live state
5. Converter shared logic extraction
6. Converter MCP tools
7. QA and docs update for full workflow-tool live state

### Why this order

- Motion Lab is mostly text-output generation and is lower risk
- Converter involves binary payloads, size control, and heavier processing
- shipping Motion Lab first delivers Pro MCP value sooner without forcing the more complex converter work into the same launch window

## Verification Plan

### Entitlement verification

- anonymous keyless MCP session:
  - can use free icon tools
  - cannot use Motion Lab MCP
  - cannot use Converter MCP
- purchased-pack-only API key:
  - can retrieve owned premium icons
  - cannot use Motion Lab MCP
  - cannot use Converter MCP
- Pro API key:
  - can use all entitled premium icon tools
  - can use Motion Lab MCP
  - can use Converter MCP
- revoked or invalid API key:
  - all Pro-gated MCP tools fail cleanly

### Functional verification

- Motion Lab MCP outputs match browser-export behavior for the same preset and trigger
- Converter MCP SVG-to-PNG output matches browser export dimensions and background handling
- Converter MCP PNG-to-SVG output matches approved trace path expectations

### Regression verification

- existing icon MCP tools still behave unchanged
- existing browser Motion Lab flow still works
- existing browser Converter flow still works
- existing premium pack protections still work

## Open Questions To Resolve Before Build Starts

1. Should Motion Lab MCP allow pack-owned premium animated icons for animation export if the user is not Pro?
   - recommendation: no, keep workflow tools Pro-only
2. What is the v1 converter return format for PNG outputs?
   - recommendation: base64 string plus metadata, not raw file streaming in the first release
3. Should Motion Lab MCP support free icons in v1?
   - recommendation: yes only if the workflow tool itself remains Pro-gated; otherwise keep all workflow MCP Pro-only for product clarity

## Success Criteria

- Motion Lab MCP works behind Pro entitlement with clean error handling
- Converter MCP works behind Pro entitlement with payload guardrails
- purchased-pack users do not gain workflow-tool access unless they are Pro
- current browser flows remain unchanged
- docs stay accurate at every rollout step
