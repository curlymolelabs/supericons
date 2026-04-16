# Motion Lab MCP Moat Protection Proposal

Date: April 12, 2026
Status: Draft
Owner: Supericons
Depends on:
- `docs/motion-lab-agent-library-prd.md`
- `docs/motion-lab-agent-guidance.md`
- `docs/plans/motion-lab-phase-4-baseline-evaluation-report.md`
- `mcp/package.json`
- `lib/motion-lab-workflow.js`
- `data/motion-lab-preset-metadata.json`

## Problem Statement

Supericons now has a real Motion Lab agent library through MCP:

- one shared 80-preset source
- enriched metadata
- agent guidance
- a stable MCP contract
- build-time parity and metadata verification

That is strong product progress, but it also creates a business question:

- which parts of the Motion Lab MCP surface are safe to distribute in a local npm package
- which parts should move behind Supericons-controlled infrastructure before public release

If too much of the differentiated value remains in the local MCP package, then competitors can inspect the shipped JavaScript, imitate the tool shape, and recreate much of the workflow without needing to solve the same product problem themselves.

The goal of this proposal is not to hide everything. The goal is to decide what should remain local for convenience and what should be protected because it represents premium workflow value, proprietary curation effort, or future recommendation quality.

## Current Implementation Inventory

### What exists today

The Motion Lab MCP implementation currently includes:

1. Shared preset source
- `lib/motion-lab-presets.js`
- 80 presets in 4 groups shared by browser and MCP

2. Curated agent metadata
- `data/motion-lab-preset-metadata.json`
- structured fields such as `visual_character`, `emotional_tone`, `recommended_contexts`, `avoid_for`, timing guidance, and export compatibility

3. Agent guidance
- `docs/motion-lab-agent-guidance.md`
- worked examples, selection heuristics, trigger guidance, and reduced-motion guidance

4. MCP workflow logic
- `lib/motion-lab-workflow.js`
- `mcp/index.js`
- `mcp/motion-lab.js`

5. Verification and integrity checks
- `scripts/verify-motion-lab-preset-parity.mjs`
- `scripts/verify-motion-lab-agent-metadata.mjs`

6. Packaging and release surface
- `mcp/package.json`
- npm package name: `supericons-mcp`
- local stdio execution via `npx -y supericons-mcp`

### What the current architecture implies

The current MCP distribution model is:

- publish a local Node package to npm
- let the user's MCP client download and run it locally

This means the shipped package is inspectable by anyone who installs it.

## Evidence-Backed Risk Summary

### Checked facts

- The current MCP package is designed to run locally over stdio from npm.
- The Motion Lab selection and export logic currently lives in local code.
- The curated metadata dataset currently lives in local code.
- The agent guidance document currently lives in local docs.
- The baseline Phase 4 evaluation concluded that the current metadata-and-guidance layer is already strong enough without a new recommendation tool.

### Business implication

If the premium differentiator is mostly:

- curated metadata
- workflow decision heuristics
- export logic
- selection quality

and all of that ships locally, then the moat is weak.

The convenience layer is still valuable, but the deeper product advantage is too easy to inspect and imitate.

## Protection Classification

### Safe to expose locally

These are acceptable to keep in the local MCP package:

- tool names and argument shapes
- basic MCP wrapper logic
- free icon search flows
- non-sensitive docs and onboarding copy
- browser-independent convenience helpers
- high-level group names such as `Motion`, `Entrances`, `Exits`, `Special`

Reason:

These are interface and usability layers, not the core premium advantage.

### Better protected over time

These can remain local temporarily, but should not be treated as long-term moat:

- full curated Motion Lab metadata
- detailed preset guidance
- premium workflow decision heuristics
- premium export calibration defaults

Reason:

These are part of what makes Motion Lab feel smart and differentiated to agents. Shipping them locally makes imitation much easier.

### Should move behind Supericons-controlled infrastructure

These should become server-protected if Motion Lab is intended to be a durable premium moat:

- premium recommendation logic
- premium metadata enrichment beyond the minimal local baseline
- premium export orchestration and future higher-quality rendering logic
- premium scoring or ranking logic for preset selection
- entitlement enforcement and usage metering
- any future recommendation or context-to-preset system

Reason:

These are the parts that should remain hard to clone.

## Proposed Moat Strategy

### Core principle

Keep the MCP local, but make it thinner over time.

The local MCP should remain the user-friendly bridge.
The premium intelligence should move behind Supericons-controlled APIs.

### Target architecture

1. Local MCP layer
- launched by the user's MCP client
- handles tool registration, local orchestration, and free/local-safe tasks
- sends authenticated requests to Supericons services for premium intelligence and premium output generation

2. Supericons hosted premium layer
- validates API key and entitlement
- serves premium metadata enrichments
- serves future recommendation responses
- serves premium export and workflow decisions
- meters usage and enables abuse controls

3. Browser app layer
- continues to run on Netlify as the public website and docs
- consumes hosted premium services where needed

### What changes under this model

The local npm package stops being the main place where premium product intelligence lives.

Instead:

- the local package becomes a thin adapter
- the premium advantage stays on Supericons infrastructure

## Product Requirements

### Requirement 1: Separate convenience from moat

The local MCP package must be limited to:

- client integration
- request shaping
- local-safe helpers
- thin output formatting

The local package should not remain the long-term home of premium workflow intelligence.

### Requirement 2: Define a protected premium boundary

Supericons must identify which Motion Lab capabilities become server-backed first.

Recommended first candidates:

- premium metadata enrichment endpoint
- premium preset recommendation endpoint if ever approved
- premium export orchestration endpoint

### Requirement 3: Preserve local DX

The MCP should still feel easy to install and use.

That means:

- local `npx` setup can remain the install surface
- the MCP client still talks to a local process
- the local process can call Supericons services when premium functionality is requested

### Requirement 4: Keep free and premium paths understandable

The product must clearly distinguish:

- what can run fully local
- what requires a Supericons API call
- what requires a Pro account

### Requirement 5: Protect curation investment

The curation work in `motion-lab-preset-metadata.json` should be split into:

- a minimal local metadata baseline that is acceptable to expose
- a richer premium server-backed metadata layer that improves selection quality

This lets the local MCP remain useful without shipping the full premium decision layer.

## Proposed Phases

### Phase A: Packaging and exposure audit

Before public npm release:

- audit exactly what the npm tarball includes
- identify which local files are premium-sensitive
- classify each one as keep local, minimize, or move server-side

Deliverable:

- exposure matrix for Motion Lab MCP package contents

### Phase B: Hybrid premium architecture spec

Design the boundary between local MCP and hosted premium services.

Define:

- which Motion Lab tools stay local
- which tool responses become server-backed
- request and auth flow
- entitlement behavior
- fallback behavior when offline or unauthenticated

Deliverable:

- Motion Lab hybrid MCP architecture spec

### Phase C: Server-backed premium endpoints

Implement the first protected premium services.

Recommended order:

1. premium metadata enrichment
2. premium export orchestration
3. recommendation layer only if later justified

Deliverable:

- hosted Motion Lab premium API layer

### Phase D: Thin MCP migration

Refactor the local MCP package so premium requests call Supericons-controlled services rather than doing all premium logic locally.

Deliverable:

- local MCP package acting as a thin authenticated adapter

### Phase E: Public release docs

Once the architecture boundary is stable:

- publish official install docs
- publish npm package guidance
- publish entitlement explanation
- publish testing and troubleshooting docs

Deliverable:

- release-ready external documentation

## What should be protected first

If we cannot protect everything immediately, protect in this order:

1. premium export workflow logic
2. richer curated premium metadata
3. future preset recommendation logic
4. usage metering and abuse controls

Why this order:

- export and premium workflow quality are closest to monetized value
- recommendation should not be built locally and then moved later if it can be avoided
- metering and abuse controls only really work when the premium path is server-backed

## What can stay local for now

These can remain local in the near term without major business harm:

- shared preset ids and groups
- basic preset listing
- thin recipe inspection
- free/basic guidance
- install and integration convenience

## Recommendation On What To Build Next

Do not prioritize public documentation expansion first.

The better next move is:

1. architecture and exposure audit
2. hybrid premium boundary spec
3. packaging fix and publish-readiness work
4. then external documentation

### Why not documentation first

Documentation is useful, but it increases discoverability and distribution before the protection boundary is decided.

Right now the bigger strategic risk is not that the docs are incomplete.
The bigger risk is that the premium Motion Lab value is still too local and too inspectable.

### What documentation should still happen now

Only internal or decision-support docs should continue immediately:

- exposure inventory
- hybrid architecture proposal
- release-readiness notes

External launch docs should wait until the premium boundary is settled.

## Recommended Immediate Next Step

Write a Motion Lab MCP exposure inventory and hybrid-boundary implementation plan.

That plan should answer:

- exactly what ships in the npm package
- which Motion Lab files contain premium-sensitive logic
- which parts remain local
- which parts move to hosted services first
- what the MVP hosted premium path looks like

## Success Metrics

This moat strategy is working if:

- the local MCP package remains easy to use
- premium functionality depends on Supericons-controlled services
- cloning the npm package no longer reproduces the premium workflow quality
- recommendation and premium export quality improve without being fully inspectable in the client
- entitlement enforcement and usage visibility improve

## Open Questions

1. What is the smallest useful premium service boundary for Motion Lab without overcomplicating the first hybrid release?
2. How much metadata should remain local as a useful baseline before premium enrichment begins?
3. Should premium export itself become server-backed first, or should premium metadata enrichment move first?
4. Does the browser app already need the same hosted premium layer, or should MCP be the first consumer?
