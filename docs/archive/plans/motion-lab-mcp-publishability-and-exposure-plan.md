# Motion Lab MCP Publishability And Exposure Plan

Date: April 12, 2026
Status: Active
Owner: Supericons
Depends on:
- `docs/plans/motion-lab-mcp-moat-protection-proposal.md`
- `docs/plans/motion-lab-mcp-moat-audit.md`
- `mcp/package.json`
- `mcp/index.js`
- `lib/motion-lab-workflow.js`
- `lib/motion-lab-presets.js`
- `lib/motion-lab-agent-metadata.js`
- `data/motion-lab-preset-metadata.json`

## Goal

Establish the real npm publish surface for `supericons-mcp`, trace every runtime dependency the package needs outside `mcp/`, classify each dependency by sensitivity, and turn that into a concrete local-vs-hosted boundary recommendation for Motion Lab.

This plan exists to answer two questions together:

1. What would the MCP package actually ship and require at runtime if published today?
2. Which parts of that runtime surface should remain local versus move behind Supericons-controlled infrastructure?

## Why This Plan Comes Next

The current moat discussion surfaced two linked risks:

- the premium Motion Lab value may be too inspectable if shipped locally
- the MCP package may not yet be a clean standalone npm package because it imports files outside `mcp/`

These questions cannot be solved independently. Before we can protect the moat, we need the publishability truth. Before we can decide the publish boundary, we need to know which runtime dependencies are sensitive.

## Scope

This plan covers:

- npm tarball contents from the `mcp/` directory
- runtime import chains starting from `mcp/index.js`
- Motion Lab runtime dependencies outside `mcp/`
- sensitivity classification for each dependency
- local-vs-hosted recommendation for each dependency class
- the minimum architecture decisions needed before hybrid implementation begins

This plan does not yet include:

- implementing hosted premium endpoints
- refactoring the MCP package
- changing the browser app architecture
- publishing public setup documentation

## Execution Steps

### Phase 1: Publish Baseline

Capture the ground truth for what `npm pack --dry-run` includes when run from `mcp/`.

Output:

- exact tarball contents
- package size and file count
- note whether the package already includes any files outside `mcp/`

Done criteria:

- the plan can cite the actual tarball contents rather than infer them

### Phase 2: Runtime Dependency Graph

Trace every runtime dependency starting from `mcp/index.js`, including:

- direct imports inside `mcp/`
- any relative imports that escape `mcp/`
- any files those imports require in turn
- runtime-loaded JSON or asset files

Output:

- dependency graph rooted at `mcp/index.js`
- explicit list of all files outside `mcp/` that are required for Motion Lab and related premium flows

Done criteria:

- every external dependency is named and sourced from a real import or runtime load path

### Phase 3: Sensitivity Classification

Classify each dependency as one of:

- premium-sensitive IP
- non-sensitive utility
- data asset
- release-support file

Also classify each dependency by boundary recommendation:

- safe to ship locally
- should be minimized locally
- should move to hosted infrastructure
- unresolved pending architecture decision

Done criteria:

- every required dependency has both a sensitivity label and a boundary recommendation

### Phase 4: Boundary Decisions

For each premium-sensitive dependency, decide the likely target state:

- local package
- protected packaging form
- hosted endpoint
- deferred

This phase must also capture the minimum design questions that gate implementation:

- hosted response model
- auth pattern for premium calls
- fallback behavior when hosted premium services are unavailable
- whether endpoints must be consumer-agnostic for both MCP and browser use later

Done criteria:

- the next implementation step is obvious and no longer blocked by missing architecture questions

## Deliverables

### Deliverable 1

`docs/plans/motion-lab-mcp-publishability-and-exposure-plan.md`

This file.

### Deliverable 2

A companion execution artifact documenting:

- actual npm tarball contents
- runtime dependency graph
- sensitivity classification
- boundary recommendations
- immediate follow-up actions

Recommended filename:

`docs/plans/motion-lab-mcp-publishability-and-exposure-report.md`

## Verification

Use evidence from:

- `npm pack --dry-run` from `mcp/`
- direct reads of import chains from `mcp/index.js`
- direct reads of runtime data-loading paths in Motion Lab modules

The work is complete when:

- the tarball baseline is recorded
- the dependency graph is complete enough to explain why the package does or does not run standalone
- premium-sensitive dependencies are explicitly named
- the next implementation move is clear

## Expected Outcome

At the end of this plan, Supericons should know:

- whether `supericons-mcp` is publishable today as a real standalone npm package
- which Motion Lab assets are currently inspectable or required locally
- which assets form the real premium moat
- what should be moved server-side first
- what architecture decisions must be made before hybrid implementation starts
