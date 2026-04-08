# SVG-to-PNG Logo Compatibility Plan

## Status

This is the canonical implementation plan for the Supericons logo SVG fix and now reflects the implemented approach.

The earlier proposal in [svg_input_proposal.md](/d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs/svg_input_proposal.md) is useful as exploratory thinking, but it is broader than the bug we actually need to fix. The narrow `SVG -> PNG` stabilization work in this document is the active plan.

Implemented in this pass:

- preflight detection now uses raw SVG text so risky SVGs can be identified even when the original XML is malformed
- the converter strips only external `@import` rules before any XML parsing or rasterization
- the converter warns when it had to remove an external web font import
- an export-safe compatibility logo asset was added at [supericons-logo-export-safe.svg](/d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs/supericons-logo-export-safe.svg)

## Goal

Make `SVG -> PNG` reliable for branded lockups like [supericons-logo.svg](/d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs/supericons-logo.svg), and prevent silent failure when users upload SVGs that depend on unsupported external resources.

## What Failed

The current logo SVG does not decode in the converter's browser raster path.

Evidence from the repo:

- [supericons-logo.svg](/d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs/supericons-logo.svg#L2) includes a `<style>` block with `@import url('https://fonts.googleapis.com/...')`
- [supericons-logo.svg](/d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs/supericons-logo.svg#L29) uses `<text>` for the `Supericons` wordmark, so it depends on that imported font for the intended appearance
- [store.js](/d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L6941) to [store.js](/d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L6957) serializes the uploaded SVG almost as-is
- [store.js](/d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L8943) to [store.js](/d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L9032) turns that serialized SVG into a `Blob`, loads it via `new Image()`, and draws it to canvas

Repro result:

- The uploaded logo produced a broken input preview and broken output preview in the live converter
- The loaded SVG blob had `naturalWidth = 0`, which confirms browser image decode failure
- Feature isolation showed:
  - original SVG: fails
  - same SVG with only the `@import` removed: works
  - path-only logo mark: works

Conclusion:

- The root incompatibility is the external font import inside the SVG image pipeline
- In this specific logo file, the Google Fonts URL also contains an unescaped `&display=swap`, which makes the uploaded SVG invalid XML until the import rule is removed
- The product currently accepts this SVG, but does not normalize or warn about it before rasterization

## Desired Outcome

1. The converter should not silently fail on SVGs with external font imports or similar external dependencies.
2. The Supericons logo should have an export-safe SVG variant that always works in `SVG -> PNG`.
3. The converter should clearly explain when an uploaded SVG cannot be faithfully rasterized.
4. The fix should stay scoped to the existing `SVG -> PNG` path, not expand into a new traced-SVG feature.

## Phase 1: Add SVG Preflight Detection

Add a preflight pass before `Image(blobUrl)` rasterization.

Detect and flag:

- `@import` inside `<style>`
- `url(http...)` or `url(https...)` references
- external `<image href>`
- `<text>` nodes that depend on non-system fonts

Implementation target:

- extend the current SVG preparation path around [store.js](/d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L6927)
- make detection work on raw SVG text instead of relying on `DOMParser`, because the failing logo is malformed XML until the `@import` is removed

UI behavior:

- if the SVG uses external font imports, show a clear note in the converter:
  - `This SVG depends on an external web font. Browser image export may fail unless the text is converted to paths or the font import is removed.`

## Phase 2: Normalize SVGs For Browser Rasterization

Make the converter safer by stripping unsupported external dependencies before rasterization.

Minimum normalization:

- remove `@import` rules from inline `<style>` blocks
- preserve the rest of the SVG styles
- keep nested `<svg>` and filters if they still decode successfully
- do the normalization as a raw text transform first, before any XML parsing

Why this is safe:

- the repro proved that removing only `@import` makes this logo decode
- the current nested SVG and glow filter are not the blocking issue for this file
- the free icon regression check showed a normal icon SVG remained byte-for-byte unchanged because the converter only normalizes files that actually contain risky external imports

Important limitation:

- stripping `@import` may change the final wordmark appearance if the SVG depends on a non-system font
- this fixes converter stability, not visual fidelity by itself

### Phase 2.1: Selective Resource Inlining Enhancement

Borrow the strongest idea from the exploratory proposal, but keep it as an enhancement rather than a hard requirement for this bug fix.

Possible later additions:

- inline external `<image href>` assets as data URIs
- selectively inline fetched font CSS when the fetch is successful and the SVG can truly be made self-contained
- use offscreen DOM rendering only when resource inlining is verified complete

Important guardrail:

- do **not** treat DOM injection + `XMLSerializer` as inherently reliable on its own
- only use this path after resources have been normalized successfully

Non-goal for this pass:

- adding a new `SVG -> traced SVG` product capability

## Phase 3: Ship An Export-Safe Canonical Logo SVG

Create a production-safe logo asset specifically for export workflows.

Recommended asset strategy:

- keep the current expressive SVG for design/reference use if needed
- add a new export-safe lockup variant that does not depend on remote fonts

Best options:

1. convert the `Supericons` wordmark to paths
2. or replace the text lockup with a pure-vector wordmark asset

Preferred option:

- convert the final wordmark to paths

Reason:

- it guarantees consistent appearance across browser preview, canvas rasterization, design tools, and downloads

Suggested output asset:

- `docs/supericons-logo-export-safe.svg`

Current implementation note:

- this pass ships a compatibility export-safe logo asset without the remote font import
- converting the wordmark fully to paths is still the preferred future hardening step if pixel-perfect brand fidelity is required across all tools

## Phase 4: Improve Failure Feedback

Right now the converter only ends with a generic `SVG render failed` toast from [store.js](/d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L9031).

Upgrade this to actionable guidance.

If decode fails:

- keep the generic failure state
- also show a richer note in the output panel:
  - `This SVG could not be rasterized by the browser image pipeline. Common causes: external web fonts, remote images, or unsupported embedded resources.`

If preflight already found external font imports:

- tailor the message to that specific cause

## Phase 5: Add Regression Fixtures

Add converter regression fixtures so this does not regress again.

Required fixtures:

- current failing logo SVG with `@import`
- same logo with `@import` removed
- path-only mark
- a simple plain-text SVG using a system font

Verification target:

- input preview renders
- output preview renders
- output blob is non-empty
- decode failure produces an explicit warning, not just a vague toast

## Delivery Order

1. add preflight detection and richer error messaging
2. strip `@import` during raster preparation
3. add export-safe Supericons logo asset
4. add regression fixtures and verification notes
5. evaluate selective resource inlining only after the narrow fix is stable

## Verification Notes

The implemented fix was validated against both paths we care about:

- failing logo SVG:
  - preview now renders
  - PNG output now renders
  - warning note explains that the external web font import was removed
- normal free icon SVG:
  - preview and PNG output still render
  - the uploaded preview hash matched the original file hash exactly, which confirms the converter left the already-working icon SVG untouched

## Recommendation

Do both product-level and asset-level fixes.

Product-level:

- the converter should detect and explain external-resource SVG failures

Asset-level:

- the official Supericons lockup used for export should be path-based and font-independent

That combination fixes the immediate product weakness and gives us a canonical branded asset that always works in our own tool.
