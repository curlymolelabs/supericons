# Motion Lab MCP Publishability And Exposure Report

Date: April 12, 2026
Status: Active
Plan:
- `docs/plans/motion-lab-mcp-publishability-and-exposure-plan.md`

## Executive Summary

The current `supericons-mcp` package is not yet a clean standalone npm package.

Evidence from `npm pack --dry-run` and a clean local install test shows:

- the published tarball currently includes only the `mcp/` directory files
- the runtime import chain escapes `mcp/` into `../lib`, `../data`, `../public`, and `../material-export.js`
- a clean install fails when `motion-lab.js` tries to resolve `../lib/motion-lab-workflow.js`

This means the immediate problem is not only exposure. It is publishability plus exposure together.

The most important premium-sensitive Motion Lab assets are:

1. keyframe geometry in `lib/motion-lab-presets.js`
2. intensity-scaling and export assembly logic in `lib/motion-lab-workflow.js`
3. curated metadata in `data/motion-lab-preset-metadata.json`

Before public npm release, Supericons needs to:

- decide what the package must actually include to run
- classify which of those dependencies are safe to ship
- move or redesign the most sensitive ones behind Supericons-controlled services

## Evidence Baseline

### 1. npm tarball baseline

Command run:

```powershell
cd mcp
npm pack --dry-run
```

Observed tarball contents:

- `CHANGELOG.md`
- `SKILL.md`
- `auth.js`
- `converter.js`
- `index.js`
- `motion-lab.js`
- `package.json`
- `search.js`
- `workflow-access.js`

Key finding:

- the tarball does **not** currently include `../lib`, `../data`, `../public`, or `../material-export.js`

### 2. Clean-install import test

Test method:

1. pack the MCP package from `mcp/`
2. install that tarball into a clean scratch directory
3. import `node_modules/supericons-mcp/motion-lab.js`

Observed failure:

```text
Cannot find module '...\\node_modules\\lib\\motion-lab-workflow.js'
imported from ...\\node_modules\\supericons-mcp\\motion-lab.js
```

Key finding:

- the package does not currently run standalone from npm because its Motion Lab shim expects a `../lib` sibling that is not present in a clean install

## Runtime Dependency Graph

### Entry point

- `mcp/index.js`

### Direct relative imports from `mcp/index.js`

- `./search.js`
- `./auth.js`
- `./motion-lab.js`
- `./converter.js`
- `./workflow-access.js`
- `../material-export.js`

### Motion Lab chain

- `mcp/motion-lab.js`
  - imports `../lib/motion-lab-workflow.js`
- `lib/motion-lab-workflow.js`
  - imports `./motion-lab-presets.js`
  - imports `./motion-lab-agent-metadata.js`
- `lib/motion-lab-agent-metadata.js`
  - reads `../data/motion-lab-preset-metadata.json`

### Converter chain

- `mcp/converter.js`
  - imports `../lib/converter-workflow.js`
- `lib/converter-workflow.js`
  - imports `./public-metadata-sanitizer.js`

### Runtime-loaded data and asset paths from `mcp/index.js`

These are not static imports, but they are required at runtime:

- `../public/icon-index.json`
- `../public/synonyms.json`
- `../public/packs/manifest.json`
- `../public/packs/*/*.svg`
- `../public/packs/*/*.css`
- `../public/material-export-manifest.json`
- `../public/material-export/**`

## Publishability Findings

### Finding 1: The npm package is not yet standalone

The `mcp/` package currently behaves like a dev-local package, not a fully self-contained npm package.

Reason:

- the packed tarball excludes files that the runtime still requires outside `mcp/`

Impact:

- public npm release would fail for Motion Lab and converter flows unless the package boundary changes

### Finding 2: The package boundary is not yet the protection boundary

Because the package is not standalone, the project has not yet made a real decision about what should ship locally versus what should stay on Supericons-controlled infrastructure.

That makes the moat question premature unless publishability and exposure are handled together.

### Finding 3: repeated `npm pack` can self-include the tarball if not cleaned

During the clean-install test, the generated `.tgz` file inside `mcp/` became packable content on the next pack run.

Impact:

- release packaging should eventually be hardened with an explicit `files` field or ignore rule
- but that hardening should happen after the standalone package boundary is intentionally defined

## Sensitivity Classification

| Dependency | Role | Sensitivity | Recommendation |
|---|---|---|---|
| `mcp/index.js` | MCP server entrypoint | Low | Safe to ship locally |
| `mcp/search.js` | Free search logic | Low | Safe to ship locally |
| `mcp/auth.js` | API key validation bridge | Medium | Safe locally for now; server-side auth design still needed for future premium proxy calls |
| `mcp/workflow-access.js` | Entitlement gate helpers | Low | Safe to ship locally |
| `mcp/motion-lab.js` | Thin shim into Motion Lab logic | Low by itself | Safe only if its target boundary is fixed |
| `lib/motion-lab-presets.js` | 80 preset definitions and keyframe geometry | High | Should not remain fully exposed in the long-term premium path |
| `lib/motion-lab-workflow.js` | Scaling logic, CSS assembly, SVG assembly, recipe shaping | High | Should be reduced locally or moved behind hosted premium services over time |
| `data/motion-lab-preset-metadata.json` | Curated metadata and motion decision hints | High | Minimize locally; richer layer should move server-side |
| `lib/motion-lab-agent-metadata.js` | Metadata loader | Medium | Can stay local only if it loads a reduced local metadata baseline |
| `mcp/converter.js` | Thin shim into converter workflow | Low by itself | Safe only if converter boundary is intentionally decided |
| `lib/converter-workflow.js` | Premium converter workflow logic | High, adjacent premium IP | Should be handled in the same boundary review, though Motion Lab is the current priority |
| `lib/public-metadata-sanitizer.js` | Export metadata cleanup utility | Low | Safe to ship locally |
| `material-export.js` | Material export URL and axis normalization logic | Medium | Likely safe locally, but should be reviewed alongside the browser and export architecture |
| `public/icon-index.json` | Free icon data | Low | Safe to ship locally or alongside app assets |
| `public/synonyms.json` | Search synonyms | Low | Safe to ship locally |
| `public/packs/**` | Premium icon assets and CSS | High | Should not be coupled to the MCP npm package |
| `public/material-export/**` | Material export snapshots | Medium | Keep out of the MCP package unless deliberately required |

## Boundary Recommendations

### Safe to keep local now

- MCP tool names and request shapes
- free search flows
- thin orchestration wrappers
- non-sensitive utilities
- a minimal local preset list and group list if needed for install-time usability

### Should not remain fully local if Motion Lab is meant to be defensible

- full keyframe geometry
- full scaling engine
- richer curated metadata
- premium export assembly logic

### Recommended target state

1. Local MCP package
- thin adapter
- lightweight validation
- free/local-safe tool handling
- authenticated calls to hosted premium services

2. Hosted premium layer
- premium metadata enrichment
- premium export orchestration
- future recommendation/ranking if ever approved
- per-call entitlement and usage visibility

## Architecture Decisions Needed Before Implementation

### Decision 1: Hosted response model

The project must choose what premium Motion Lab endpoints return:

- rendered CSS / rendered animated SVG
- raw keyframe payloads
- opaque or signed payloads consumed by a thin local renderer

This decision determines how much IP still reaches the client.

### Decision 2: Auth pattern for premium calls

The current MCP auth model validates once at startup and caches `authState`.

For hosted premium calls, the design must choose one of:

- per-call API key validation
- short-lived session token issued at startup
- another server-auditable request model

### Decision 3: Fallback behavior

If hosted premium services are unreachable, the local MCP must choose one behavior:

- hard fail
- degraded local result
- cached replay of last successful response

This is a product decision, not only an implementation detail.

### Decision 4: Consumer scope

If the browser app may later consume the same hosted premium layer, the endpoint design should be consumer-agnostic from the start.

Recommended rule:

- design Phase C hosted endpoints for MCP first, but keep them usable by a future browser consumer without a breaking redesign

## Immediate Follow-Up Actions

### Action 1

Create a hybrid-boundary implementation plan that decides:

- what the standalone npm package should actually contain
- which Motion Lab premium capabilities move server-side first

### Action 2

Define the hosted response model before any boundary refactor begins.

### Action 3

Design the premium auth pattern for server-backed Motion Lab calls.

### Action 4

Only after the intended package boundary is decided, harden packaging with:

- explicit `files` allowlist and/or
- ignore rules for generated tarballs and non-runtime content

## Recommendation

Do not proceed directly to public npm release docs.

The correct next step is a **Motion Lab hybrid-boundary implementation plan** grounded in this report.

That plan should start from one principle:

- the local MCP package should remain easy to run, but the premium Motion Lab advantage should not remain fully inspectable in the client long-term
