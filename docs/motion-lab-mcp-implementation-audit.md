# Motion Lab MCP Implementation Audit

Date: April 12, 2026
Status: Active
Auditor: Antigravity
Scope: All files referenced in the Motion Lab MCP publishability and exposure plan, plus the verification scripts and agent guidance document.

Evidence basis: Every file below was read directly in this session. The npm tarball baseline was independently verified by running `npm pack --dry-run` from `mcp/`. No finding here is inferred from a secondary document.

Depends on:
- `docs/plans/motion-lab-mcp-publishability-and-exposure-plan.md`
- `docs/plans/motion-lab-mcp-publishability-and-exposure-report.md`
- `docs/plans/motion-lab-mcp-moat-audit.md`

---

## Audit Method

Each file is assessed across three dimensions:

- **Correctness:** Does the code do what it is supposed to do?
- **Best Practice:** Is the implementation idiomatic, robust, and free of silent failure modes?
- **Plan Fulfillment:** Does the implementation meet what the publishability and exposure plan required?

Critical gaps are called out explicitly.

---

## `lib/motion-lab-presets.js` (1,265 lines)

### Correctness

Sound. The 80 preset keyframe definitions are complete and internally consistent across all four groups (`Motion`, `Entrances`, `Exits`, `Special`). `MOTION_LAB_PRESET_IDS` is derived programmatically from the group order plus any ungrouped keys (lines 1215-1221), so new presets added to `MOTION_LAB_PRESETS` without a group entry do not silently disappear. The separation between the lightweight in-package `MOTION_LAB_PRESET_METADATA` (label, group, icon, description only) and the richer agent metadata in `data/motion-lab-preset-metadata.json` is intentional and correctly implemented.

### Best Practice

**Gap 1:** `DESCRIPTION_OVERRIDES` (lines 1-14) covers only 12 of the 80 presets. The remaining 68 fall through to the generic `${label} Motion Lab preset.` template. This is a curation gap, not a defect, but it means the built-in descriptions are uneven in quality.

**Gap 2:** `DESCRIPTION_OVERRIDES` is defined as a plain object without `Object.freeze()`. Every other exported constant in this file (`MOTION_LAB_PRESET_GROUPS`, `MOTION_LAB_PRESETS`, `MOTION_LAB_PRESET_IDS`, `MOTION_LAB_PRESET_METADATA`) is frozen. The inconsistency is minor since the object is module-internal, but it is worth aligning.

### Plan Fulfillment

Yes. The file is correctly identified in the report as the primary source of keyframe geometry (premium-sensitive IP, High). The full keyframe content is present and readable in the local package.

---

## `lib/motion-lab-workflow.js` (283 lines)

### Correctness

Sound. `scaleKeyframesByIntensity` handles five property types explicitly: `transform` (with sub-cases for `translateX`, `translateY`, `rotate`, `translate`, and `scale`), `opacity`, `stroke-dashoffset`, `filter`, and a passthrough fallback. The CSS assembly pipeline (`buildKeyframesCss`, `getAnimationRule`, `buildMotionCss`) is clean and deterministic. SVG manipulation functions (`mergeSvgClass`, `mergeSvgInlineStyle`, `injectSvgStyle`) use conservative regex-based injection safe for expected icon SVG shapes.

### Best Practice

**Gap 1 (surfaced in tool output):** `buildMotionLabExternalCss` (line 226) hardcodes `#icon-container svg` as the CSS selector. This selector goes directly into the output of the `export_motion_css` MCP tool untouched. Agents integrating this into a project with a different container name receive CSS that does not match their DOM, with no warning or override parameter. The tool description in `mcp/index.js` does not mention this limitation.

**Gap 2 (minor API):** `cloneAgentPresetRecord` (lines 74-93) emits both `id` and `preset` with identical values on every record. This was intentional for backward compatibility during the Phase 3 snake_case normalization pass, but there is no deprecation indicator. Every `list_motion_presets` response carries this redundancy.

**Gap 3 (minor):** `formatNumber` (line 13) uses `parseFloat(Number(value).toFixed(digits))` to strip trailing zeros. The pattern is correct but unusual enough to warrant an inline comment.

### Plan Fulfillment

Yes. The report correctly identifies this file as containing the scaling engine and export assembly logic (premium-sensitive IP, High).

---

## `lib/motion-lab-agent-metadata.js` (42 lines)

### Correctness

Sound. ESM `import.meta.url`-relative path resolution is the correct pattern for loading a sibling JSON file. Data is frozen at module load time and served through a stable lookup function. No runtime mutations are possible.

### Best Practice

**Critical gap for the moat discussion:** The entire dataset across all 80 presets is loaded synchronously via `readFileSync` and frozen into `recordsByPreset` at module evaluation time (lines 5-27). This happens before any tool is registered and before any request arrives. There is no lazy loading, no partial loading, and no filtering. Any code that imports this module receives access to the full curated metadata for all 80 presets. In the current local-only architecture this is correct and efficient. In the hybrid future, this module is the primary mechanism that must be replaced or bypassed for premium metadata enrichment to move server-side.

### Plan Fulfillment

Yes. The report correctly identifies the curated metadata as premium-sensitive IP (High). The import chain from `mcp/motion-lab.js` through `lib/motion-lab-workflow.js` to this file is correctly mapped.

---

## `lib/converter-workflow.js` (343 lines)

### Correctness

Sound. The trace configuration matrix (6 trace classes times 2 quality modes = 12 configs) is well-structured and consistently applied. Input validation covers buffer size, MIME type, and SVG string before processing. Background color validation rejects non-hex values with a clear error. The `qualityMode === 'auto'` warning (line 292) honestly acknowledges an unimplemented feature.

### Best Practice

No internal code quality gaps.

### Critical Gap (publishability blocker not in the report)

`@neplex/vectorizer` is imported at the top level (line 2) but does not appear in `mcp/package.json`. The only listed dependencies are `@modelcontextprotocol/sdk`, `@resvg/resvg-js`, and `zod`. In the dev monorepo, `@neplex/vectorizer` resolves from the workspace root `node_modules`. In a clean npm install of the published package, it is absent and the converter fails at import time.

The publishability report traces the file-level dependency chain (`mcp/converter.js -> ../lib/converter-workflow.js -> ./public-metadata-sanitizer.js`) but does not trace the npm-level dependencies of `converter-workflow.js` itself. This means the converter has two independent standalone blockers, not one:

1. `lib/converter-workflow.js` is outside the tarball boundary.
2. `@neplex/vectorizer` is not in `mcp/package.json`.

Both must be resolved before the converter can run from a clean install.

### Plan Fulfillment

Partially. The file-level dependency gap is captured. The npm-level dependency gap is not.

---

## `mcp/index.js` (749 lines)

### Correctness

Sound. Tool registration, auth gating, and error handling follow a consistent pattern across all tools. `hasProWorkflowAccess` is applied uniformly to all six Motion Lab tools (`list_motion_presets`, `get_motion_recipe`, `export_motion_css`, `export_animated_svg`, `animate_icon`) and all three Converter tools (`inspect_converter_options`, `convert_svg_to_png`, `convert_png_to_svg`). No tool bypasses the gate.

### Best Practice

**Gap 1 (tool output):** `export_motion_css` at line 575 calls `buildMotionLabExternalCss` which hardcodes `#icon-container svg` as the selector. This flows into the tool response without any override path or warning in the tool description. Same root cause as the gap in `motion-lab-workflow.js`, confirmed at the tool layer.

**Gap 2 (auth):** Auth state is module-level and startup-only (lines 325-341). This is a known accepted trade-off documented in prior audit work. Confirmed from source: `initAuth()` is called once at line 746 and the result is stored in `authState` for the lifetime of the process.

### Plan Fulfillment

Yes. The report correctly maps all tool surfaces and confirms the auth model.

---

## `mcp/auth.js` (58 lines)

### Correctness

Sound. SHA-256 hashing before transmission is the correct pattern for key validation. Anonymous fallback on any error is safe. `SUPABASE_ANON` uses the `sb_publishable_` prefix naming convention, confirming it is a publishable anon key, not a secret.

### Best Practice

No significant gaps. The startup-only validation pattern is a known accepted limitation for local MCP servers.

### Plan Fulfillment

Yes. The report correctly classifies this file as Medium sensitivity (safe locally for now; server-side auth design still needed for future premium proxy calls).

---

## `mcp/search.js` (139 lines)

### Correctness

Sound. Five-layer synonym expansion (direct key match, reverse lookup, prefix matching, suffix normalization, fuzzy edit distance) is correctly implemented. Tiered result ordering (direct matches first, synonym matches second, deduplication between tiers) is correct. The edit distance early-exit (`if (Math.abs(a.length - b.length) > 2) return 99`) is a sensible performance guard.

### Best Practice

**Minor gap:** The Levenshtein inner loop uses `prev.splice(0, n+1, ...curr)` to simulate row swapping (line 20). This allocates and spreads on every outer-loop iteration. For the expected icon dataset size (20k+ entries) this is unlikely to cause a measurable problem, but a two-variable pointer swap would be more idiomatic and free of the spread overhead.

### Plan Fulfillment

Yes. The report correctly classifies this file as Low sensitivity (safe to ship locally).

---

## `mcp/workflow-access.js` (25 lines)

### Correctness

Sound. Clean, minimal, no hidden state. `hasProWorkflowAccess` correctly returns `false` for authenticated non-Pro users (pack buyers, free tier), forcing them to the error path. `buildProWorkflowAccessError` and `buildPremiumLibraryAccessError` produce consistent structured error objects across all tool handlers.

### Best Practice

No gaps. This module is correctly scoped and does one thing.

### Plan Fulfillment

Yes. The report correctly classifies this file as Low sensitivity.

---

## `mcp/converter.js` (4 lines)

### Correctness

A thin re-export shim. Imports three functions from `../lib/converter-workflow.js` and re-exports them. Correct.

### Best Practice

No gaps. The shim pattern is appropriate.

### Plan Fulfillment

Yes. The report correctly identifies this as "safe only if its target boundary is intentionally decided."

---

## `mcp/motion-lab.js` (10 lines)

### Correctness

A thin re-export shim. Imports five functions from `../lib/motion-lab-workflow.js` and re-exports them. The relative path `../lib/motion-lab-workflow.js` is the escape that breaks clean install. Correct for dev, broken for standalone npm.

### Best Practice

No gaps in the shim itself. The problem is the relative path.

### Plan Fulfillment

Yes. The report correctly identifies this file as the primary escape point for the Motion Lab runtime chain.

---

## `scripts/verify-motion-lab-preset-parity.mjs` (83 lines)

### Correctness

Sound. Parses `store.js` with regex to extract Motion Lab preset buttons, then compares group count, group keys, group labels, preset ordering, and preset ID uniqueness against the shared source. Uses `process.exitCode = 1` (non-throwing, collects all failures before exit) rather than throwing on first failure.

### Best Practice

**Gap:** The group and button regex patterns (lines 12-13) are specific to the current HTML structure of the Motion Lab panel in `store.js`. A refactor of that markup will silently produce zero matches, and the failure message ("expected 4 groups, found 0") would not clearly indicate that the parser failed rather than the data mismatching. A minimum-match assertion (`if (browserGroups.length === 0) fail('regex matched zero groups: likely a parser failure, not a data mismatch')`) before the comparison would make this class of failure unambiguous.

### Plan Fulfillment

Yes. This script is listed in the original moat protection proposal as a verification gate and correctly enforces group and preset parity between the browser app and the shared Motion Lab source.

---

## `scripts/verify-motion-lab-agent-metadata.mjs` (114 lines)

### Correctness

Sound and thorough. Validates: group list match, preset ID coverage and ordering, all 15 required fields, trigger enum values, export compatibility structure and field types, and non-empty string constraints on `label`, `description`, `visual_character`, `emotional_tone`, and `recommended_contexts`. `avoid_for` is not validated for non-emptiness, which is intentional since some presets have no strong avoidance contexts.

### Best Practice

No significant gaps. This is the strongest of the verification scripts in terms of coverage and error clarity.

### Plan Fulfillment

Yes. The script confirms the metadata JSON is structurally complete and consistent with the shared preset source.

---

## `docs/motion-lab-agent-guidance.md` (421 lines)

### Correctness

Sound and comprehensive. The 6-step agent workflow, group-first selection approach, trigger guidance, intensity guidance, context-to-preset table, tone tiebreaker guidance, worked examples, and accessibility section are internally consistent with the metadata schema. The worked examples (dashboard hover, security authentication, success/celebration, ambient loading) directly map to four of the six Phase 4 evaluation scenarios, which is coherent with the plan's stated goal of validating whether the metadata-and-guidance layer is sufficient without a new recommendation tool.

### Best Practice

**Gap:** The CSS vs animated SVG section (lines 287-304) says "if both outputs are supported, CSS is usually the better fit" but does not document a recovery path for the case where `export_compatibility.css` is `false`. The metadata verifier confirms all 80 presets currently have `css: true`, so this is not a live failure path. But the guidance implies CSS might sometimes not be supported, then provides no instruction for that case. The note should either be removed (if CSS will always be true) or a fallback instruction should be added.

### Plan Fulfillment

The guidance document was not a deliverable of the publishability plan, but it is a core part of the Motion Lab MCP surface. It meets its stated purpose: helping agents make strong first-pass motion choices using the current metadata layer.

---

## Plan Fulfillment Summary

| Plan Phase | Status | Notes |
|---|---|---|
| Phase 1: Publish baseline | Met | Dry-run output is accurate. Independently verified. |
| Phase 2: Runtime dependency graph | Substantially met | File chain is correct. `@neplex/vectorizer` npm dependency of `converter-workflow.js` is not traced. |
| Phase 3: Sensitivity classification | Met | Ratings are defensible from source reads. |
| Phase 4: Boundary decisions | Met | Four architecture decisions correctly named. Correctly deferred to next phase. |

---

## Unresolved Gap: `@neplex/vectorizer` Missing From `mcp/package.json`

This is the most significant finding not in the publishability report.

`lib/converter-workflow.js` imports `@neplex/vectorizer` at line 2. This package is not listed in `mcp/package.json`. In the monorepo dev environment it resolves from the workspace root. In a clean npm install it is absent.

The converter has two independent standalone blockers:

1. `lib/converter-workflow.js` is outside the tarball (file boundary issue).
2. `@neplex/vectorizer` is not in `mcp/package.json` (npm dependency issue).

The hybrid-boundary plan must address both. Resolving the file boundary issue (bundling or moving the converter logic) without also adding `@neplex/vectorizer` to the package manifest still leaves the converter broken in a clean install.

---

## Critical Path Summary

The items below must be resolved before any `npm publish`:

1. **Motion Lab file boundary:** `lib/motion-lab-workflow.js`, `lib/motion-lab-presets.js`, `lib/motion-lab-agent-metadata.js`, and `data/motion-lab-preset-metadata.json` are all required at startup and all outside the tarball. The hybrid-boundary plan must decide whether these are bundled locally, reduced to thin stubs, or moved behind a hosted endpoint.

2. **Converter file boundary:** `lib/converter-workflow.js` and `lib/public-metadata-sanitizer.js` are outside the tarball.

3. **Converter npm dependency:** `@neplex/vectorizer` is not in `mcp/package.json`. This is independent of the file boundary issue.

4. **Hardcoded selector in `export_motion_css`:** `#icon-container svg` is hardcoded in `buildMotionLabExternalCss` and passes through to the tool response without an override path or warning. Agents integrating this into a real project will get broken CSS silently.

5. **Tarball self-inclusion:** A leftover `.tgz` from a prior `npm pack` run inside `mcp/` is picked up on the next pack run. A `files` allowlist or `.npmignore` rule must be in place before the first `npm publish`.

6. **Architecture decisions pending:** Hosted response model, per-call auth pattern, fallback behavior, and consumer-agnostic endpoint design are all correctly deferred to the hybrid-boundary plan. None of the above can be fully resolved without those decisions.
