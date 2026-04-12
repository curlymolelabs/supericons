# Motion Lab MCP Hybrid Boundary Implementation Plan

Date: April 12, 2026
Status: Draft
Owner: Supericons
Scope: Motion Lab only
Depends on:
- `docs/plans/motion-lab-mcp-moat-protection-proposal.md`
- `docs/plans/motion-lab-mcp-publishability-and-exposure-plan.md`
- `docs/plans/motion-lab-mcp-publishability-and-exposure-report.md`
- `docs/plans/motion-lab-mcp-hosted-boundary-adr.md`
- `docs/plans/motion-lab-mcp-local-baseline-contract.md`
- `docs/plans/motion-lab-mcp-hosted-endpoints-spec.md`
- `docs/plans/motion-lab-mcp-release-gates.md`
- `docs/plans/motion-lab-mcp-migration-verification-checklist.md`
- `docs/plans/motion-lab-mcp-first-hosted-batch-implementation-plan.md`
- `docs/motion-lab-mcp-implementation-audit.md`
- `lib/motion-lab-presets.js`
- `lib/motion-lab-workflow.js`
- `lib/motion-lab-agent-metadata.js`
- `data/motion-lab-preset-metadata.json`
- `mcp/index.js`
- `mcp/motion-lab.js`
- `mcp/package.json`

## Problem Statement

Motion Lab is built and working inside the Supericons repo, but its premium value still lives in local MCP code:

- keyframe geometry in `lib/motion-lab-presets.js`
- intensity-scaling and export assembly logic in `lib/motion-lab-workflow.js`
- curated metadata in `data/motion-lab-preset-metadata.json`

At the same time, the current `supericons-mcp` package is not yet standalone for Motion Lab because the runtime escapes the `mcp/` tarball boundary at startup:

- `mcp/motion-lab.js` imports `../lib/motion-lab-workflow.js`
- `lib/motion-lab-workflow.js` imports `./motion-lab-presets.js` and `./motion-lab-agent-metadata.js`
- `lib/motion-lab-agent-metadata.js` reads `../data/motion-lab-preset-metadata.json` during module evaluation

This means Motion Lab has two linked problems that must be solved together before npm release:

1. the standalone package boundary is broken
2. the premium Motion Lab advantage is still too inspectable locally

This plan focuses only on Motion Lab. Converter and broader MCP package release readiness are explicitly deferred.

## Target User

Primary user:
- the Supericons team designing the first protected Motion Lab release path

User job:
- preserve the easy local MCP developer experience while moving premium Motion Lab value behind Supericons-controlled infrastructure

Constraints:
- do not break the current monorepo build
- do not block local/internal Motion Lab development
- keep the MCP install surface understandable
- defer converter and non-Motion-Lab release work for now

## Goals

- make the Motion Lab premium boundary explicit
- define what the standalone Motion Lab-capable MCP package should actually contain
- reduce local exposure of premium Motion Lab assets over time
- keep local MCP usage simple for developers and agents
- block public npm release until Motion Lab package boundary and tarball hygiene are intentionally solved

## Non-Goals

- redesigning Converter or fixing Converter release readiness
- changing the browser Motion Lab feature set
- building a new recommendation tool
- publishing external launch documentation
- implementing hosted endpoints in this planning step

## Evidence Inventory

### Checked facts

- `npm pack --dry-run` from `mcp/` currently includes only `mcp/` files.
- A clean temp install of `supericons-mcp` fails when importing `motion-lab.js` because `../lib/motion-lab-workflow.js` is missing.
- Motion Lab dependencies are startup-coupled, not just request-time coupled.
- `lib/motion-lab-agent-metadata.js` eagerly reads the full curated metadata JSON at module load time.
- The root app build and Motion Lab verification scripts currently pass in the monorepo.

### Assumptions

- Motion Lab should remain a premium differentiator worth protecting.
- A hosted premium path is acceptable if it preserves a clean local MCP experience.
- Browser reuse is likely later, but MCP is the first protected consumer to optimize for.

### Unresolved questions

- how much Motion Lab metadata should remain local as a baseline
- which hosted premium capability should ship first: richer metadata enrichment or export orchestration

## Coupling Classification

| Motion Lab dependency | Role | Coupling type | Release implication |
|---|---|---|---|
| `mcp/motion-lab.js` | MCP shim | startup-static | missing target prevents server startup |
| `lib/motion-lab-workflow.js` | scaling, export assembly, recipe shaping | startup-static | currently outside tarball, premium-sensitive |
| `lib/motion-lab-presets.js` | keyframe geometry | startup-static | currently outside tarball, premium-sensitive |
| `lib/motion-lab-agent-metadata.js` | metadata loader | startup-static | eagerly loads premium metadata at startup |
| `data/motion-lab-preset-metadata.json` | curated metadata | startup-static | currently outside tarball, premium-sensitive |
| `buildMotionLabExternalCss()` output contract | CSS export surface | runtime output | requires selector strategy before external release |

## Functional Requirements

### Requirement 1: Motion Lab-only release blocker framing

The plan must treat Motion Lab publishability and Motion Lab moat protection as concurrent release blockers.

User job supported:
- avoid shipping a Motion Lab npm package that is either broken or overexposed

Business goal supported:
- protect premium Motion Lab value before public npm distribution

Acceptance signal:
- all Motion Lab release blockers are tracked in one implementation plan and no step assumes publishability can be solved separately from the premium boundary

### Requirement 2: Tarball hygiene is a pre-release gate

The first public npm release must not proceed until `mcp/package.json` uses an explicit `files` allowlist or an equivalent ignore rule that blocks nested tarballs and stray non-runtime content.

User job supported:
- keep package contents intentional and reviewable

Business goal supported:
- prevent accidental inclusion regressions during release packaging

Acceptance signal:
- the plan includes a packaging-hardening task before any public `npm publish`

### Requirement 3: Hosted response model must be chosen before refactor

Before any Motion Lab boundary refactor begins, the team must choose one primary hosted response model:

- rendered CSS / animated SVG
- raw keyframe payload
- opaque or signed payload for thin local rendering

User job supported:
- give implementers a stable contract target

Business goal supported:
- avoid rework and accidental client-side exposure

Acceptance signal:
- the plan contains an ADR-style decision task and the implementation work is blocked on its resolution

### Requirement 4: Startup-static Motion Lab dependencies must move together

The first hybrid Motion Lab release must address these startup-static dependencies together:

- `mcp/motion-lab.js`
- `lib/motion-lab-workflow.js`
- `lib/motion-lab-presets.js`
- `lib/motion-lab-agent-metadata.js`
- `data/motion-lab-preset-metadata.json`

User job supported:
- avoid partial refactors that still leave the package unbootable

Business goal supported:
- solve Motion Lab standalone packaging and premium-boundary design in one coherent change

Acceptance signal:
- the implementation workstream treats the Motion Lab startup chain as one migration unit

### Requirement 5: CSS export must be integration-safe

The Motion Lab CSS export path must not silently assume a hardcoded host selector in its public contract.

User job supported:
- let agents and developers integrate CSS exports into real DOM structures without hidden mismatch

Business goal supported:
- improve real-world success of Motion Lab MCP outputs

Acceptance signal:
- the plan includes either:
  - a selector parameter, or
  - a documented tokenized selector strategy, or
  - a clearly documented limitation accepted for an internal-only phase

### Requirement 6: Auth pattern must support premium proxy calls

The hosted premium path must define how the local MCP authenticates Motion Lab requests:

- per-call API key validation
- short-lived session token with refresh
- another server-auditable request model

User job supported:
- preserve a simple install experience while keeping premium requests auditable

Business goal supported:
- enable entitlement enforcement, rate awareness, and future metering

Acceptance signal:
- the plan names one auth decision task and treats it as a prerequisite for hosted premium implementation

### Requirement 7: Fallback behavior must be explicit

The Motion Lab hybrid path must define one fallback mode when hosted premium services are unavailable:

- hard fail
- degraded local result
- cached replay

User job supported:
- let developers know what the MCP will do during outages or offline use

Business goal supported:
- keep product behavior intentional, not accidental

Acceptance signal:
- the plan records fallback choice as a named open decision before implementation

## Workstreams

### Workstream A: Motion Lab release blockers

Scope:
- add package tarball hardening for `mcp/`
- define Motion Lab-only release blockers separate from converter
- add a clean-install Motion Lab smoke test to release validation

Outputs:
- `docs/plans/motion-lab-mcp-release-gates.md`
- package-content gate for `npm pack`

### Workstream B: Motion Lab boundary decision record

Scope:
- record and apply the accepted hosted boundary decisions
- use the ADR to unblock packaging and contract work
- confirm how those decisions map onto the first hosted Motion Lab endpoints

Outputs:
- `docs/plans/motion-lab-mcp-hosted-boundary-adr.md`
- implementation checklist derived from the ADR

### Workstream C: Thin local Motion Lab contract

Scope:
- define the smallest local Motion Lab surface that remains acceptable to ship
- decide whether local baseline includes:
  - preset ids
  - group names
  - minimal label/description metadata
  - no full keyframe geometry
  - no rich curated premium metadata

Outputs:
- `docs/plans/motion-lab-mcp-local-baseline-contract.md`

### Workstream D: Hosted premium Motion Lab path

Scope:
- define first hosted premium capabilities
- recommended initial order:
  1. richer metadata enrichment
  2. export orchestration
  3. future recommendation only if later justified

Outputs:
- `docs/plans/motion-lab-mcp-hosted-endpoints-spec.md`

### Workstream E: Migration verification

Scope:
- prove the package boots from a clean install
- prove premium Motion Lab calls follow the chosen hosted path
- prove the existing monorepo build still passes

Outputs:
- `docs/plans/motion-lab-mcp-migration-verification-checklist.md`
- residual risk summary

## Constraints

- Motion Lab-only scope for this phase
- no converter changes in this plan
- no browser refactor in this plan
- current local/internal Motion Lab workflows must keep working until the hybrid path is ready

## Success Metrics

### Primary metric

- a clean-installed Motion Lab-capable MCP package can boot successfully without importing premium Motion Lab implementation files directly from outside the package boundary

Verification method:
- clean temp install plus Motion Lab tool smoke test

### Supporting metrics

- Motion Lab premium outputs depend on Supericons-controlled services rather than fully local keyframe and export logic
- the local package tarball contains only intended files
- the local package still exposes a usable Motion Lab install surface for developers

Verification methods:
- inspect final tarball file list
- run a premium Motion Lab call with the hosted service disabled and confirm the chosen fallback mode
- verify documented setup remains within a small fixed step count

### Guardrail metrics

- root app build still passes
- Motion Lab preset parity still passes
- Motion Lab agent metadata verification still passes for any remaining local baseline dataset

Verification methods:
- `npm run build`
- `npm run verify:motion-lab-presets`
- `npm run verify:motion-lab-agent-metadata`

## Risks And Dependencies

### Risks

- the hosted response model could accidentally leak enough structure to weaken the moat anyway
- a thin local baseline may become too weak for acceptable DX
- a hard fallback choice may make local MCP feel unreliable during outages
- delaying browser reuse decisions too long could force endpoint redesign later

### Dependencies

- package tarball hardening before first public publish
- accepted hosted boundary ADR
- accepted local baseline contract
- hosted Motion Lab endpoint spec
- migration verification checklist

## Open Questions

1. Should the first server implementation batch prioritize recipe resolution or CSS render once backend work begins?
2. Should baseline descriptions stay in `lib/motion-lab-presets.js`, or move to a separate reduced local metadata module?
3. Should `list_motion_presets` keep exactly the current group labels, or add stable group keys for future endpoint alignment?

## Recommended Next Step

Workstream B is now resolved by `docs/plans/motion-lab-mcp-hosted-boundary-adr.md`.
Workstream C is now resolved by `docs/plans/motion-lab-mcp-local-baseline-contract.md`.
Workstream D is now defined by `docs/plans/motion-lab-mcp-hosted-endpoints-spec.md`.
Workstream A now has its package hardening and release-gate artifact in place via `docs/plans/motion-lab-mcp-release-gates.md`, `mcp/package.json`, and `scripts/verify-motion-lab-mcp-package.mjs`.
Workstream E is now defined by `docs/plans/motion-lab-mcp-migration-verification-checklist.md`.

Proceed next with:

1. Execute `docs/plans/motion-lab-mcp-first-hosted-batch-implementation-plan.md`
2. Implement the hosted/local split against the ADR, local baseline contract, endpoint spec, and verification checklist
3. Revisit the clean-install publish gate once the Motion Lab hosted/local split is implemented
