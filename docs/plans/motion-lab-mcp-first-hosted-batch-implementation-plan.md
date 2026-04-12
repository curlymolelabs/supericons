# Motion Lab MCP First Hosted Batch Implementation Plan

Date: April 12, 2026
Status: Draft
Owner: Supericons
Scope: Motion Lab only
Depends on:
- `docs/plans/motion-lab-mcp-hybrid-boundary-implementation-plan.md`
- `docs/plans/motion-lab-mcp-hosted-boundary-adr.md`
- `docs/plans/motion-lab-mcp-local-baseline-contract.md`
- `docs/plans/motion-lab-mcp-hosted-endpoints-spec.md`
- `docs/plans/motion-lab-mcp-migration-verification-checklist.md`
- `docs/plans/motion-lab-mcp-release-gates.md`
- `mcp/index.js`
- `mcp/auth.js`
- `mcp/motion-lab.js`
- `mcp/package.json`
- `lib/motion-lab-presets.js`
- `lib/motion-lab-workflow.js`
- `data/motion-lab-preset-metadata.json`
- `supabase/functions/validate-mcp-key/index.ts`

## Problem Statement

The Motion Lab planning chain is now complete enough to start a real implementation batch:

- the protected boundary is decided
- the local baseline contract is defined
- the hosted endpoint shapes are defined
- the release gates and migration verification checklist exist

What is missing is the concrete implementation sequence that moves Motion Lab from:

- local premium engine in the MCP package

to:

- reduced local preset listing
- hosted premium recipe and render paths
- clean MCP wrapper calls to the hosted layer

This first batch should be small enough to deliver safely, but complete enough to prove the hybrid boundary actually works.

## Target User

Primary user:
- the Supericons team implementing the first protected Motion Lab MCP release

User job:
- ship the first hosted Motion Lab backend batch and wrapper migration without breaking the current app build or losing control of the premium boundary

Constraints:
- Motion Lab only
- no converter work in this batch
- keep the existing browser Motion Lab feature working
- keep the local MCP install surface understandable
- avoid duplicating Motion Lab source-of-truth data by hand

## Goals

- implement the first hosted Motion Lab server batch
- migrate the MCP premium Motion Lab tools to the hosted path
- keep `list_motion_presets` local but reduced to the approved baseline
- preserve one authoring source of truth while shipping different local vs hosted artifacts
- make the package closer to standalone without forcing full publish readiness in the same batch

## Non-Goals

- converter migration
- browser consumption of the hosted Motion Lab endpoints
- recommendation tooling
- public npm launch
- full release hardening beyond the Motion Lab package gates already added

## Core Implementation Decision

This batch resolves one practical implementation question that the earlier plans left open:

**Do not ship the safe local baseline by importing `lib/motion-lab-presets.js` directly in the published package.**

Reason:

- `lib/motion-lab-presets.js` is still the full premium keyframe authoring source
- importing it in the shipped MCP package would keep the premium geometry locally exposed

So this batch should introduce a **build-artifact split**:

1. one authoring source remains in the repo
2. one reduced local Motion Lab baseline artifact is generated for the MCP package
3. one hosted Motion Lab premium artifact is generated or materialized for the server path

That keeps a single source of truth for authoring while avoiding a single distribution surface.

## Batch Scope

### In scope for this batch

1. Motion Lab artifact split
2. Motion Lab hosted session exchange
3. Motion Lab hosted recipe endpoint
4. Motion Lab hosted CSS render endpoint
5. Motion Lab hosted animated SVG render endpoint
6. MCP wrapper migration for:
   - `get_motion_recipe`
   - `export_motion_css`
   - `export_animated_svg`
   - `animate_icon`
7. local baseline migration for `list_motion_presets`
8. verification hooks needed for this batch

### Out of scope for this batch

- converter endpoints or converter package fixes
- browser app adoption of the hosted endpoints
- public install docs
- recommendation API

## Workstreams

### Workstream 1: Artifact Split

Purpose:
- preserve one authoring source while preventing the local MCP package from shipping the premium authoring files directly

Planned additions:
- `scripts/build-motion-lab-mcp-artifacts.mjs`
- `mcp/generated/motion-lab-baseline.json`
- `supabase/functions/_shared/motion-lab-generated.ts` or equivalent generated hosted artifact

Planned behavior:
- read the authoring sources:
  - `lib/motion-lab-presets.js`
  - `data/motion-lab-preset-metadata.json`
- generate:
  - reduced local baseline fields for MCP
  - hosted premium data artifact for the server path

Notes:
- introducing `_shared` under `supabase/functions/` is reasonable here even though the repo does not currently use it; Motion Lab is the first backend slice in this project that benefits clearly from shared server-side render utilities

### Workstream 2: Hosted Motion Lab Server Batch

Purpose:
- implement the first backend endpoints defined in the hosted endpoint spec

Planned additions:
- `supabase/functions/motion-lab-session/index.ts`
- `supabase/functions/motion-lab-recipe/index.ts`
- `supabase/functions/motion-lab-render-css/index.ts`
- `supabase/functions/motion-lab-render-animated-svg/index.ts`
- shared helpers under `supabase/functions/_shared/motion-lab/`

Suggested shared helpers:
- `cors.ts`
- `errors.ts`
- `auth.ts`
- `contracts.ts`
- `recipe.ts`
- `render-css.ts`
- `render-animated-svg.ts`

Implementation order:
1. session exchange
2. recipe endpoint
3. CSS render endpoint
4. animated SVG render endpoint

Why this order:
- recipe is the lowest-complexity premium path and validates auth + hosted metadata first
- CSS render adds rendered output without SVG body handling
- animated SVG render adds the final SVG composition path last

### Workstream 3: MCP Wrapper Migration

Purpose:
- re-point premium Motion Lab MCP tools at the hosted backend while keeping the current tool names and input vocabulary

Planned additions:
- `mcp/motion-lab-client.js`

Planned changes:
- `mcp/auth.js`
  - add key-hash helper reuse or a session-exchange helper
  - keep current startup validation behavior for non-migrated paths where needed
- `mcp/index.js`
  - keep `list_motion_presets` local
  - route premium Motion Lab tool handlers through the hosted client
- `mcp/motion-lab.js`
  - stop re-exporting the premium local workflow path for the protected release direction
  - reduce it to local baseline listing support or retire its current role

### Workstream 4: Local Baseline Migration

Purpose:
- implement the reduced local `list_motion_presets` contract without importing rich local Motion Lab data

Planned changes:
- read from `mcp/generated/motion-lab-baseline.json`
- remove rich metadata fields from the local listing response
- remove duplicate `id` alias from the protected listing response

### Workstream 5: Verification Integration

Purpose:
- make the implementation batch prove itself against the migration checklist

Planned changes:
- extend package verification if needed for generated baseline artifacts
- add a clean-install Motion Lab smoke test script once the startup chain is corrected
- add endpoint contract test coverage for the first hosted batch

## File-Level Plan

### New files

- `scripts/build-motion-lab-mcp-artifacts.mjs`
- `mcp/generated/motion-lab-baseline.json`
- `mcp/motion-lab-client.js`
- `supabase/functions/motion-lab-session/index.ts`
- `supabase/functions/motion-lab-recipe/index.ts`
- `supabase/functions/motion-lab-render-css/index.ts`
- `supabase/functions/motion-lab-render-animated-svg/index.ts`
- `supabase/functions/_shared/motion-lab/*`

### Updated files

- `mcp/auth.js`
- `mcp/index.js`
- `mcp/motion-lab.js`
- `mcp/package.json`
- `scripts/verify-motion-lab-mcp-package.mjs`
- Motion Lab docs pages or MCP docs only if the public contract changes visibly

### Files intentionally not changed in this batch

- converter modules
- browser Motion Lab UI implementation
- root `lib/motion-lab-workflow.js` as the live browser runtime path unless a safe extraction is needed for artifact generation

## Functional Requirements

### Requirement 1: Artifact split before wrapper migration

The batch must create the reduced local artifact and the hosted premium artifact before rerouting MCP tool handlers.

Acceptance signal:
- local listing can be served from generated baseline data without importing the premium authoring source in the MCP package

### Requirement 2: Session exchange before premium wrapper calls

The MCP wrapper migration must not hardcode raw API key forwarding on every premium call.

Acceptance signal:
- a session exchange flow exists before premium tool handlers are rerouted

### Requirement 3: Recipe-first hosted rollout

The first hosted endpoint implemented must be the recipe path.

Acceptance signal:
- recipe endpoint is implemented and contract-tested before CSS or animated SVG migration is treated as complete

### Requirement 4: Selector-safe CSS rendering

The CSS render path must support either:

- caller-provided selector input, or
- placeholder-based output using `{{ICON_SELECTOR}}`

Acceptance signal:
- no hardcoded `#icon-container svg` remains in the hosted CSS public contract

### Requirement 5: Verification mapping

Every workstream in this batch must map to one or more rows in the migration verification checklist.

Acceptance signal:
- the implementation work log or PR notes can point to the checklist rows each change satisfies

## Constraints

- use the existing Supabase Edge Function deployment model already present in the repo
- keep endpoint transport consumer-agnostic HTTP JSON
- do not require the browser app to adopt the new endpoints in this batch
- do not reopen the hosted-boundary ADR in the middle of implementation

## Success Metrics

### Primary metric

- the first hosted Motion Lab batch is implemented in a way that lets the MCP package stop depending on premium local Motion Lab workflow files for its migrated premium tool paths

Verification method:
- source read plus clean-install Motion Lab smoke test after migration

### Supporting metrics

- `list_motion_presets` uses only the approved local baseline
- hosted recipe, CSS render, and animated SVG endpoints satisfy the accepted spec
- MCP premium Motion Lab tools successfully call the hosted path using the session-token model

Verification methods:
- migration verification checklist
- contract tests for hosted endpoints
- MCP smoke tests for migrated tools

### Guardrail metrics

- root app build still passes
- Motion Lab preset parity still passes
- package verification still passes

Verification methods:
- `npm run build`
- `npm run verify:motion-lab-presets`
- `npm --prefix mcp run verify:package`

## Risks And Dependencies

### Risks

- Deno/Supabase function implementation may require small runtime adaptation from the current Node-oriented Motion Lab utilities
- generated artifacts could drift if the artifact build step is not wired into verification
- wrapper migration could temporarily create mixed local/hosted behavior if staged carelessly
- animated SVG render may reveal edge cases later than recipe and CSS render

### Dependencies

- accepted hosted-boundary ADR
- accepted local baseline contract
- accepted hosted endpoint spec
- migration verification checklist
- existing Supabase Edge Function deployment model

## Open Questions

1. Should the generated hosted premium artifact live as JSON or TypeScript for the first batch?
2. Should the MCP wrapper call three hosted endpoints for `animate_icon`, or should a follow-up bundle endpoint be considered only if latency becomes a real problem?
3. Should the local baseline artifact be regenerated manually during this batch, or wired into an npm script immediately?

## Recommended Execution Order

1. Build artifact split
2. Implement session exchange function
3. Implement recipe endpoint
4. Implement MCP client and migrate `get_motion_recipe`
5. Implement CSS render endpoint
6. Migrate `export_motion_css`
7. Implement animated SVG render endpoint
8. Migrate `export_animated_svg`
9. Migrate `animate_icon`
10. Add clean-install and contract verification gates

## Recommended Next Step

Use this document as the implementation handoff for the first protected Motion Lab build batch.

If we continue immediately after this, the first coding slice should be:

1. artifact split
2. session exchange
3. recipe endpoint

That is the smallest end-to-end vertical slice that proves the hosted boundary is real.
