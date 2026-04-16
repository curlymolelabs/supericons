Date: April 13, 2026
Status: In progress
Scope: MCP converter runtime, agent ergonomics, docs, and verification

Depends on:
- [index.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/mcp/index.js)
- [converter.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/mcp/converter.js)
- [package.json](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/mcp/package.json)
- [converter-workflow.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/lib/converter-workflow.js)
- [converter-workflow.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/mcp/runtime/converter-workflow.js)
- [docs-pages.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs-pages.js)
- [motion-lab-mcp-implementation-audit.md](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs/motion-lab-mcp-implementation-audit.md)
- [converter-png-to-svg-deep-audit.md](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs/archive/docs/converter-png-to-svg-deep-audit.md)
- [mcp-reference-progressive-refinement-plan.md](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs/plans/mcp-reference-progressive-refinement-plan.md)

## Decision Summary

Converter MCP is the next agent-surface enhancement track after Motion Lab.

At the start of this plan, the converter surface needed five upgrades:

- standalone/package readiness
- stronger agent decision support
- a workflow layer comparable to Motion Lab
- non-placeholder product docs
- verification discipline for clean-install and fixture-based quality checks

Those needs have now been addressed across the first three implementation slices:

- Workstream A package/runtime readiness: complete
- Workstream B first-pass decision support: complete
- Workstream C product docs replacement: complete
- Workstream D verification and evidence: in progress

The earlier question about a dedicated `suggest_converter_settings` tool is now resolved:

- do not add the tool
- complete the intent-before-input path by expanding `starterCombinations` instead

That keeps the surface smaller while closing the real gap.

## Current Reality

### What already exists

The current MCP server exposes four converter tools:

- `inspect_converter_options`
- `inspect_converter_input`
- `convert_svg_to_png`
- `convert_png_to_svg`

These are registered in [index.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/mcp/index.js) and are gated behind Pro workflow access.

The runtime returns structured outputs:

- `inspect_converter_options`
  - setting families
  - limits
  - workflow guidance
  - starter combinations
- `inspect_converter_input`
  - input metadata
  - structural assessment
  - risks
  - recommended settings
  - next-step guidance
- `convert_svg_to_png`
  - `pngBase64`
  - `pngDataUrl`
  - `metrics`
  - `request`
- `convert_png_to_svg`
  - `svg`
  - `warnings`
  - `metrics`
  - `request`

### What is materially better than before

The converter MCP surface is now package-safe:

- [converter.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/mcp/converter.js) imports from `./runtime/...`
- [package.json](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/mcp/package.json) declares `@neplex/vectorizer`
- the runtime files are included in the published package allowlist
- clean-install verification proves the converter surface imports and runs outside the monorepo

The converter docs are also now real instead of placeholder-only:

- `docs-mcp-converter`
- `docs-converter-guide`
- `docs-converter-png-to-svg`
- `docs-converter-svg-to-png`
- `docs-converter-settings`

### What is still weak

#### 1. Runtime duplication risk remains

The package-boundary problem is fixed, but the converter runtime now exists in two places:

- [converter-workflow.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/lib/converter-workflow.js)
- [converter-workflow.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/mcp/runtime/converter-workflow.js)

That is acceptable for now, but it is a real maintenance risk if one copy evolves without the other.

#### 2. Intent guidance is now the right lightweight abstraction

The current decision-support layer is already much stronger than the original converter surface:

- agents can inspect valid options
- agents can inspect a PNG before tracing
- agents receive recommended settings and rationale
- agents receive warnings and metrics after conversion

The right way to cover the intent-before-input path is through richer `starterCombinations`, not through another public MCP tool. That keeps the recommendation logic discoverable in `inspect_converter_options` without adding redundant surface area.

#### 3. Product docs will still need normal editorial refinement

The structural docs gap is closed, but the converter docs will still benefit from future:

- copy tightening
- duplication trimming between product docs and MCP reference
- examples based on real fixture outcomes

That is normal polish work, not a current readiness blocker.

#### 4. Verification is improving, but not exhaustive forever

Converter now has:

- tarball/package verification
- clean-install verification
- fixture-based smoke checks
- invalid-input rejection coverage
- structured output verification

The next verification slice adds a small curated converter quality-fixture matrix so the surface is no longer validated by a single minimal smoke path alone.

What it does not yet have is a broader curated quality-fixture matrix for long-term regression tracking. That is a maturity improvement, not a current release blocker.

## Goal

Turn converter MCP into an agent-grade workflow surface with:

- reliable package boundaries
- clear tool guidance
- stronger decision support
- better docs
- repeatable verification evidence

The end state should feel parallel to Motion Lab in quality, even though the runtime architecture is different.

## Non-Goals

This plan does not assume all converter quality issues are solved inside this pass.

Out of scope for the current track:

- redesigning the entire browser converter
- promising perfect multi-color PNG-to-SVG output
- shipping a hosted converter backend
- solving every quality limitation from older browser-converter audits

This plan is about upgrading the MCP converter surface first.

## Workstream Status

### Workstream A: Package and runtime readiness

Status: Complete

Delivered:

1. Resolved the package-boundary issue for converter runtime code.
2. Added missing npm dependency coverage for `@neplex/vectorizer`.
3. Updated `mcp/package.json` allowlist so runtime files are present after install.
4. Added clean-install verification to prove converter tools load outside the repo workspace.

Success criteria met:

- `supericons-mcp` installs cleanly in a fresh environment
- converter imports work
- converter execution does not fail due to missing package files or dependencies

### Workstream B: Agent decision-support layer

Status: Complete

Delivered:

1. `inspect_converter_options` now includes stronger descriptions, workflow order, and starter combinations.
2. `inspect_converter_input` now provides a preflight inspection step with:
   - PNG metadata
   - likely risks
   - recommended settings
   - next-step guidance

Success criteria reached so far:

- agents no longer have to guess blindly once they have the PNG input
- the docs can recommend a real tool order instead of only parameter tables

Decision taken:

- do not add `suggest_converter_settings`
- expand `starterCombinations` instead so the intent-before-input path remains inside the existing options surface

### Workstream C: Docs and learning path

Status: Complete

Delivered:

1. Replaced the placeholder converter product pages in [docs-pages.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs-pages.js):
   - `docs-converter-guide`
   - `docs-converter-png-to-svg`
   - `docs-converter-svg-to-png`
   - `docs-converter-settings`
2. Expanded the MCP reference so it accurately describes the full four-tool converter surface.
3. Made the docs honest about quality boundaries and best-fit source types.

Success criteria met:

- no placeholder converter docs remain
- the docs explain how to use converter well, not just what the parameters are

### Workstream D: Verification and evidence

Status: In progress

Delivered:

1. package verification includes converter runtime files
2. clean-install verification covers:
   - options export
   - input inspection
   - SVG-to-PNG conversion
   - PNG-to-SVG conversion
   - invalid-input rejection

Current slice:

3. a first curated quality-fixture matrix is being added to cover:
   - flat logo
   - tiny interface icon
   - single-color mark
   - small colored badge
   - high-contrast mask or silhouette
   - a harder full-color artwork case

Remaining maturity opportunity:

- broaden the matrix further only if this first slice reveals real gaps worth tracking

## Recommended Execution Order

### Phase 1: Converter package readiness

Status: Complete

### Phase 2: Agent ergonomics

Status: Complete

Delivered:

- richer option guidance
- preflight/input inspection

Delivered:

- richer option guidance
- preflight/input inspection
- expanded intent-first starter combinations without adding another MCP tool

### Phase 3: Docs implementation

Status: Complete

### Phase 4: Verification hardening

Status: In progress

## Next Recommended Slice

The best next slice is no longer package readiness or placeholder docs.

The best next slice is:

1. complete and verify the first curated quality-fixture matrix
2. then decide whether any additional fixture categories are worth keeping permanently

## Suggested Audit Questions

An independent auditor reviewing the current state should answer:

1. What is the smallest useful fixture set for long-term converter quality regression tracking?
2. Are the product-side converter docs now clear enough for human developers, or do they still over-index on implementation detail?
3. Is the `mcp/runtime` vs `lib` duplication acceptable for now, or should boundary unification become a dedicated future slice?
