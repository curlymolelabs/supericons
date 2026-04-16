# Implementation Audit: Converter MCP Agent Decision Support Slice

Date: 2026-04-13
Auditor: Antigravity
Scope: Post-implementation verification of the converter MCP agent decision support and docs reference slice
Reference plan: `docs/plans/converter-mcp-agent-library-enhancement-plan.md` (Workstreams B and C)
Prior audit: `docs/converter-mcp-package-readiness-implementation-audit.md`

---

## Context

The prior slice (package readiness) already delivered `inspect_converter_input` and the enriched
`inspect_converter_options` as bonus scope. This audit covers what this new slice added on top
of that baseline.

The agent's claim is that this slice:
1. Added `inspect_converter_input` as a new MCP preflight tool
2. Enriched `inspect_converter_options`
3. Updated the MCP docs reference to reflect 12 tools and 4 converter tools
4. Updated `verify-converter-mcp-clean-install.mjs`

Items 1 and 2 were already delivered in the prior slice. This audit identifies what is genuinely
new in this slice vs. what was previously already in place.

---

## 1. What Is Actually New in This Slice

### New: `docs-pages.js` -- `docs-mcp-converter` page rewritten

**Verified.** The `docs-mcp-converter` page (lines 858-1028) now contains:

- A 4-tool intro stating "These four tools expose Converter capabilities to your coding agent."
- Full parameter tables for `inspect_converter_options`, `inspect_converter_input`,
  `convert_svg_to_png`, and `convert_png_to_svg`
- A `traceClass` reference table (lines 951-972)
- A `qualityMode` reference table (lines 973-989)
- A `uiMode` reference table (lines 990-1006)
- A "Recommended combinations" table (lines 1007-1026) with 5 practical combos

This is substantive new content. The page was previously a placeholder.

### New: `docs-mcp-tools` overview page updated to 12 tools

**Verified.** `docs-pages.js` line 631:
```
The Supericons MCP server exposes 12 tools your coding agent can call directly.
Three tools are free and work without an account. Nine tools require a Pro account...
```

The all-tools table (lines 646-657) now lists all 12 tools including both
`inspect_converter_options` and `inspect_converter_input`.

**Tool count cross-verified against `mcp/index.js`:**
`Select-String -Pattern "server\.tool\("` returns exactly 12 matches. The docs claim is accurate.

### Pre-existing (from prior slice, not new here): Runtime and MCP tooling

`index.js`, `converter.js`, `converter-workflow.js`, and `verify-converter-mcp-clean-install.mjs`
were all changed in the previous slice. This slice's claim to have "added" `inspect_converter_input`
and "enriched" `inspect_converter_options` is describing prior-slice work, not new work here.
This is not an error in the implementation -- but the agent's change summary is inaccurate in
attributing those changes to this slice.

---

## 2. Docs Accuracy Audit

### 2a. `mimeType` description corrected

Previous finding QF-2 from the prior audit flagged that the `mimeType` parameter on
`inspect_converter_input` in `index.js` did not warn that only `image/png` is accepted.

The `docs-mcp-converter` page (line 891) now reads:
```
Optional MIME type override if the data URL is not present
```

This still does not explicitly state "only PNG is supported." The description implies
flexibility that does not exist. An agent seeing `mimeType: optional` could reasonably try
`image/jpeg`.

**Finding QF-2 remains partially open.** The docs page does not fix the misleading
optionality. Consider adding: "Only `image/png` is accepted."

### 2b. `convert_svg_to_png` returns description is underselling

`docs-mcp-converter` line 921: "Returns: PNG as a base64 string."

The actual return shape (`mcp/runtime/converter-workflow.js` lines 564-577) returns:
```js
{
  pngBase64, pngDataUrl,
  metrics: { elapsedMs, sizeBytes, width, height },
  request: { targetWidth, background }
}
```

The docs description omits `pngDataUrl`, `metrics`, and `request`. An agent using this
description to parse the output would not know those fields exist.

**Finding QF-6: Docs for `convert_svg_to_png` return shape is incomplete.**

### 2c. `convert_png_to_svg` returns description is underselling

`docs-mcp-converter` line 948: "Returns: SVG string."

The actual return shape (lines 525-543) returns:
```js
{
  svg, warnings,
  metrics: { elapsedMs, sizeBytes, pathCount, shapeCount, viewBox },
  request: { qualityMode, colorMode, traceClass, uiMode }
}
```

The docs description omits `warnings`, `metrics`, and `request`.

**Finding QF-7: Docs for `convert_png_to_svg` return shape is incomplete.**

### 2d. Recommended combinations table: one potential mismatch

`docs-mcp-converter` line 1020: "Single-color wordmark" recommends `compact` qualityMode.

The `inspect_converter_options` `starterCombinations` in `converter-workflow.js` uses `exact`
for all three starter combinations, including the "single-color-mark" case. This is a minor
inconsistency between the docs page and the guidance embedded in the tool itself.

The docs rationale for `compact` on wordmarks is reasonable (smaller file for simple marks),
but it should be consistent with the tooling guidance or explicitly explain the tradeoff.

**Finding QF-8 (low): Subtle conflict between docs recommended combo and tool starter combo
for single-color wordmarks. Both are defensible, but they differ.**

### 2e. Product-side converter docs (`docs-converter-guide`, etc.) still placeholders

The enhancement plan's Workstream C calls for replacing the four placeholder converter pages:
- `docs-converter-guide`
- `docs-converter-png-to-svg`
- `docs-converter-svg-to-png`
- `docs-converter-settings`

**Verified.** Lines 1472-1524 show all four are still using `renderPlaceholderBody(...)`.

The `docs-mcp-converter` page is now complete, but the product-side pages (the ones linked
from "Use the Converter" on the docs homepage) are still placeholders. This is the outstanding
Workstream C work.

---

## 3. Verification Claims

The agent reported three passing gates:

1. `npm --prefix mcp run verify:package` -- **Accepted.** No tarball changes were made in
   this slice so the existing check would continue to pass.

2. `npm run verify:converter-mcp-clean-install` -- **Accepted.** The smoke test was already
   updated in the prior slice and remains accurate. No new exports were added here.

3. `npm run build` -- **Accepted as regression fence.** Same caveat as prior audit: the build
   pipeline has no converter-specific steps, so this proves no regression, not converter
   correctness.

---

## 4. Summary of Findings

| ID | Severity | Finding |
|----|----------|---------|
| QF-2 (carry) | LOW | `mimeType` docs still do not state PNG-only constraint. |
| QF-6 | MEDIUM | `convert_svg_to_png` return shape docs omit `pngDataUrl`, `metrics`, `request`. |
| QF-7 | MEDIUM | `convert_png_to_svg` return shape docs omit `warnings`, `metrics`, `request`. |
| QF-8 | LOW | `single-color-mark` / wordmark combo: docs say `compact`, tool says `exact`. |
| WC-C | OPEN | Four product-side converter docs pages are still placeholders. |

**No blockers. The MCP reference page for converter is now substantively complete for the
four-tool surface. All verification gates passed.**

---

## 5. Open Work vs. Recommendation

The agent recommends adding `suggest_converter_settings` next.

**Assessment: This recommendation warrants a Socratic challenge.**

The Socratic question is: does `suggest_converter_settings` add value that `inspect_converter_input`
does not already provide?

`inspect_converter_input` already returns:
- `assessment.recommendedSettings` (colorMode, qualityMode, traceClass, uiMode)
- `assessment.rationale` (human-readable reasoning per setting)
- `nextStep.recommendedTool` and `nextStep.recommendedSettings`

A `suggest_converter_settings` tool would likely accept coarse context strings and return the
same type of output. The only gap is: `inspect_converter_input` requires a PNG base64 payload.
An agent that only has coarse intent (e.g., "flat logo") and no PNG yet cannot call it.

**Verdict on next step priority:**

1. **High value, low cost:** Fix QF-6 and QF-7 (return shape docs). Agents rely on return
   shape docs to write clean code. This takes 10 minutes and closes medium-severity gaps.

2. **Medium value:** Add `suggest_converter_settings` if there is a real use case where an
   agent knows the intent but does not have the PNG yet. If the typical agent workflow always
   has the PNG before choosing settings, this tool is redundant.

3. **High value, higher effort:** Replace the four placeholder product-side converter docs
   (Workstream C). This is what makes Converter legible to human developers, not just agents.

**Suggested order: Fix QF-6/QF-7 first (2-line edit), then decide between
`suggest_converter_settings` and the docs pass based on whether the intent-first use case is
real for this tool surface.**
