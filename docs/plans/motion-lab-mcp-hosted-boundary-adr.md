# Motion Lab MCP Hosted Boundary ADR

Date: April 12, 2026
Status: Accepted
Owner: Supericons
Scope: Motion Lab only
Depends on:
- `docs/plans/motion-lab-mcp-hybrid-boundary-implementation-plan.md`
- `docs/plans/motion-lab-mcp-publishability-and-exposure-report.md`
- `docs/plans/motion-lab-mcp-moat-protection-proposal.md`
- `docs/motion-lab-mcp-implementation-audit.md`
- `mcp/index.js`
- `mcp/auth.js`
- `lib/motion-lab-workflow.js`
- `lib/motion-lab-presets.js`
- `lib/motion-lab-agent-metadata.js`
- `data/motion-lab-preset-metadata.json`

## Decision Summary

For the first protected Motion Lab MCP release:

1. **Hosted response model:** return rendered artifacts and safe structured recipe data, not raw keyframe payloads.
2. **Auth pattern:** use a startup key exchange to mint a short-lived session token, then require per-call bearer-token authentication to hosted premium endpoints.
3. **Fallback behavior:** keep only a minimal local baseline for preset listing; premium recipe and render endpoints hard fail when hosted services are unavailable.
4. **Consumer scope:** design hosted endpoints as consumer-agnostic HTTP endpoints from day one, even though MCP is the first consumer.

## Context

The current Motion Lab MCP implementation works inside the monorepo, but its premium value remains local and inspectable:

- full keyframe geometry in `lib/motion-lab-presets.js`
- scaling and export assembly logic in `lib/motion-lab-workflow.js`
- rich curated metadata in `data/motion-lab-preset-metadata.json`

The current npm package is also not standalone because the Motion Lab startup chain escapes `mcp/` at module load time.

So the first protected release needs one practical architecture that solves both:

- do not keep the premium Motion Lab engine fully local
- do not create an MCP package that still depends on out-of-bound runtime files

## Decision 1: Hosted Response Model

### Options considered

#### Option A: Hosted rendered artifacts

The hosted service accepts Motion Lab inputs and returns:

- rendered CSS for CSS export flows
- rendered animated SVG for SVG export flows
- safe structured recipe output for reasoning and display

The local MCP never receives raw keyframe arrays or the full scaling engine.

#### Option B: Hosted raw keyframe payloads

The hosted service returns resolved keyframes and the local MCP assembles CSS or SVG.

#### Option C: Hosted opaque payloads for thin local rendering

The hosted service returns a compressed or signed payload and a thin local renderer consumes it.

### Decision

Choose **Option A: hosted rendered artifacts** for the first hybrid Motion Lab release.

### Rationale

- It removes the full keyframe library and scaling engine from the local package.
- It keeps the local MCP implementation simple enough to ship sooner.
- It avoids inventing a custom opaque payload format before the product boundary is proven.
- It still supports the current MCP tool UX: users want CSS, animated SVG, and recipe guidance as outputs.

### Explicit tradeoff

Rendered CSS and animated SVG still expose some per-call animation structure in the returned artifact.
That is accepted for v1 because it is materially narrower and more meterable than shipping the full 80-preset library and scaling engine locally.

### Response shape rule

Hosted Motion Lab endpoints may return:

- rendered CSS text
- rendered animated SVG text
- structured recipe fields that are safe to expose
- safe preset metadata needed for explanation

Hosted Motion Lab endpoints must not return:

- raw keyframe arrays
- reusable full-library keyframe catalogs
- direct scaling instructions that reconstruct the local engine

## Decision 2: Auth Pattern

### Options considered

#### Option A: forward the API key on every premium call

Simple, but gives the hosted layer no session abstraction and increases repeated key exposure.

#### Option B: mint a short-lived session token at startup and refresh it when needed

The local MCP uses the user API key only to mint a short-lived token, then sends the token on each hosted premium call.

#### Option C: validate only once at startup and trust cached local auth state

Simple for local-only MCP, but weak for hosted premium metering and entitlement enforcement.

### Decision

Choose **Option B: startup exchange plus short-lived session token with refresh**.

### Rationale

- It preserves a simple MCP install surface for the user.
- It gives hosted premium endpoints auditable per-call authentication.
- It reduces repeated raw API key transmission relative to per-call forwarding.
- It is a clearer bridge from the current local-only auth model in `mcp/auth.js`.

### Token behavior

- The local MCP starts with `SUPERICONS_API_KEY`.
- At startup, it exchanges a hashed key for a short-lived Motion Lab session token.
- Hosted premium Motion Lab calls send the session token as a bearer token.
- If the token expires, the local MCP refreshes it transparently using the startup key exchange path.
- The session token stays in memory only and is not written to disk.

## Decision 3: Fallback Behavior

### Options considered

#### Option A: hard fail for premium calls

When the hosted premium service is unavailable, premium Motion Lab tools return a clear structured error.

#### Option B: degraded local result

The local MCP produces lower-quality results from a reduced local implementation.

#### Option C: cached replay

The local MCP replays the last successful response for matching parameters.

### Decision

Choose **Option A: hard fail for premium Motion Lab calls**, while keeping a **minimal local baseline** available for listing and lightweight inspection.

### Rationale

- A degraded local renderer would force sensitive logic back into the local package.
- Cached replay adds stale-behavior complexity without solving the moat problem.
- Hard fail is the cleanest and most honest first protected boundary.

### Local baseline rule

The local package may continue to support:

- preset ids
- group names
- labels
- short baseline descriptions
- supported triggers

The local package should not continue to ship:

- full keyframe geometry
- rich curated premium metadata
- local premium export assembly logic

### Premium tool rule

The first hybrid release should treat these as hosted premium paths:

- `get_motion_recipe`
- `export_motion_css`
- `export_animated_svg`
- `animate_icon`

`list_motion_presets` may remain local if reduced to the minimal baseline above.

## Decision 4: Consumer Scope

### Decision

Hosted Motion Lab endpoints must be **consumer-agnostic from day one**.

### Rationale

- MCP is the first consumer, but browser reuse is likely later.
- Designing MCP-specific response envelopes now would create predictable redesign work later.
- Standard HTTP JSON endpoints keep the protected layer reusable without coupling it to the MCP protocol.

## Implementation Consequences

### Immediate implications

- `mcp/motion-lab.js` can no longer remain a thin re-export of `../lib/motion-lab-workflow.js` in the protected release path.
- `lib/motion-lab-presets.js`, `lib/motion-lab-workflow.js`, and the rich metadata loader should not remain part of the Motion Lab npm runtime surface for the protected premium path.
- `mcp/auth.js` needs a companion session-token exchange flow, not just startup validation state.

### CSS export implication

Before external release, the hosted CSS render path must accept either:

- a caller-provided selector parameter, or
- a tokenized selector placeholder strategy

This is required to replace the current hardcoded `#icon-container svg` assumption.

### Packaging implication

This ADR does not remove the need for tarball hardening.
`mcp/package.json` still needs an explicit `files` allowlist or equivalent ignore rules before first public publish.

## Non-Goals

- converter packaging or converter architecture
- browser implementation details
- recommendation tooling
- public docs rollout

## Follow-Up Tasks

1. Define the minimal local Motion Lab baseline contract.
2. Define the first hosted Motion Lab endpoint shapes for:
   - recipe resolution
   - CSS render
   - animated SVG render
3. Define the startup key-exchange and token-refresh flow.
4. Define the premium error contract for hosted unavailability and entitlement failures.
5. Add tarball hardening and clean-install validation before any public `npm publish`.
