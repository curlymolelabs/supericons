Date: April 13, 2026
Status: In progress
Scope: First curated converter quality-fixture matrix

Depends on:
- [converter-workflow.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/mcp/runtime/converter-workflow.js)
- [verify-converter-mcp-clean-install.mjs](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/scripts/verify-converter-mcp-clean-install.mjs)
- [converter-mcp-agent-library-enhancement-plan.md](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs/plans/converter-mcp-agent-library-enhancement-plan.md)

## Objective

Add a small curated converter quality-fixture matrix so the converter surface has stronger long-term regression evidence than the current clean-install smoke test alone.

This slice is intentionally small.

It is not trying to prove perfect visual fidelity for every converter scenario.

It is trying to prove that a representative set of source categories still:

- rasterize successfully
- inspect successfully
- trace successfully
- return stable request and metrics shapes
- preserve the expected converter route for each intended fixture class

## Why This Slice Is Next

The converter MCP surface is now:

- package-safe
- documented
- decision-support capable

The next gap is regression confidence over time.

Today the clean-install smoke proves the package loads and basic conversion works.
It does not yet give us a curated set of reference source categories that we can use to catch drift in:

- trace-class handling
- output-shape stability
- unexpectedly broken SVG-to-PNG or PNG-to-SVG paths

## Scope

### In scope

1. Add a new verification script:
   - `scripts/verify-converter-quality-fixtures.mjs`
2. Add a small in-script fixture matrix with representative source categories.
3. Wire the script into root `package.json`.
4. Verify that the script passes locally.

### Out of scope

- pixel-perfect snapshot testing
- golden-file diffs
- production/browser proof-service rollout
- binary fixture asset management
- hosted converter architecture changes

## Chosen Approach

Use self-contained inline fixture definitions inside the verification script.

Each fixture should start as a compact SVG string, then:

1. render to PNG with `convertSvgToPng`
2. inspect the PNG with `inspectConverterInput`
3. trace the PNG back to SVG with `convertPngToSvg`
4. verify stable shape-level expectations

This keeps the slice:

- deterministic
- easy to review
- free of binary fixture sprawl

## Initial Fixture Set

The first useful matrix should cover at least these categories:

1. Flat logo
   - intended route: `flat-logo-color`
2. Tiny interface icon
   - intended route: `tiny-line-icon`
3. Single-color mark
   - intended route: `single-color-mark`
4. Small colored badge
   - intended route: `tile-icon-color`
5. High-contrast mask or silhouette
   - intended route: `mono-mask`
6. Deliberately harder full-color artwork
   - intended route: `general-color`
   - purpose: prove the surface still handles a more complex input without breaking

## Verification Expectations

Each fixture should prove:

- PNG rendering returns:
  - `pngBase64`
  - `pngDataUrl`
  - `metrics`
  - `request`
- PNG inspection returns:
  - `input`
  - `assessment`
  - `recommendedSettings`
- PNG tracing returns:
  - `svg`
  - `warnings`
  - `metrics`
  - `request`

The traced result should also pass fixture-level expectations such as:

- expected request `traceClass`
- expected request `uiMode`
- expected request `colorMode`
- non-zero `pathCount` or `shapeCount`
- valid `viewBox`

One comparative expectation should also exist for the harder full-color fixture so we have at least one signal that more complex artwork still produces materially heavier output than a simple logo or icon.

## Files Likely To Change

- [package.json](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/package.json)
- `scripts/verify-converter-quality-fixtures.mjs`
- optionally [converter-mcp-agent-library-enhancement-plan.md](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs/plans/converter-mcp-agent-library-enhancement-plan.md) after the script lands

## Verification Gates

This slice is complete only if these pass:

1. `npm run verify:converter-quality-fixtures`
2. `npm run verify:converter-mcp-clean-install`
3. `npm run build`

## Bottom Line

This slice should make one promise true:

"Converter no longer relies on a single smoke fixture. It has a small but deliberate quality matrix that exercises the main intended source categories."
