# Motion Lab Export Preview Parity Fix Plan

Source:
- [audit-motion-lab-export-preview-mismatch.md](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs/audit-motion-lab-export-preview-mismatch.md)

## User Promise

This plan is anchored to the actual user expectation:

1. I selected this icon
2. I selected this animation
3. I saw it working in Motion Lab
4. I exported it
5. it should still look and behave the same in my project

That is the standard for completion.

## Problem Summary

Motion Lab preview and Motion Lab export are currently not using the same complete styling contract.

Preview uses:
- animation CSS
- static overrides
- root transform overrides
- preview-only SVG transform foundation

Export uses:
- animation CSS
- static overrides
- root transform overrides
- but not the preview-only SVG transform foundation

Because of that mismatch, standalone SVG export and CSS-only export can render differently from the preview, especially for:

1. large-viewBox icons
2. scaled icons
3. Material-style single filled glyphs

## Objective

Make Motion Lab export faithfully match Motion Lab preview for both:

1. `Copy CSS`
2. `Copy Self-contained SVG`
3. downloaded animated SVG files

Success means that when a user previews an icon animation and exports it, the exported result:

1. starts from the same resting position
2. has the same effective scale
3. follows the same visible animation path
4. behaves the same for the selected trigger mode

## Non-Goals

This plan does not attempt to:

1. redesign Motion Lab presets
2. change icon export outside Motion Lab
3. change the Material owned-cache pipeline
4. change how preview currently behaves, unless preview itself is proven wrong
5. support non-inline SVG consumers such as `<img src="...">` as the primary animation target

## Chosen Fix Direction

Create a single shared Motion Lab “base transform contract” and use it in both preview and export.

In practical terms:

1. identify the preview-only SVG foundation CSS
2. move it into a reusable helper
3. inject the same foundation into:
   - preview
   - standalone SVG export
   - CSS-only export

This is the smallest safe fix because it does not rewrite presets or selector logic. It only removes the inconsistency between preview and export.

## Design Principles

1. One visual model
   The same icon state should not be rendered by two different transform foundations.

2. Preview is the source of truth
   Since the user approves the preview, export must conform to preview, not the other way around.

3. Keep the fix local
   The changes should remain inside Motion Lab CSS generation and export paths in [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js).

4. Avoid partial duplication
   Do not manually duplicate preview CSS in multiple places. Instead, centralize the base CSS generation.

5. Verify with real artifacts
   This fix is only complete when an actual exported SVG visually matches the preview.

---

## Phase 0: Baseline Reproduction Lock

No production logic changes in this phase.

### Reference case

Use the exact user-reported example:

1. icon: Material accessibility glyph
2. preset: `glide`
3. trigger: `hover`
4. size: `48`
5. scale: `+35%`
6. rotate: `0deg`
7. color: orange fill

### Capture the three outputs

Before changing code, capture:

1. Motion Lab preview screenshot
2. `Copy CSS` export output
3. `Copy Self-contained SVG` output
4. downloaded SVG artifact such as [download_icon_ms2.svg](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs/download_icon_ms2.svg)

### Baseline diagnosis question

Ask of the current system:

`What hidden preview rule is making the icon look right in Motion Lab but not in export?`

The audit already answered this:

1. `transform-box: fill-box`
2. preview transform-origin foundation for root and children

### Exit criteria

1. We have a locked before-state.
2. We have one concrete reproduction artifact to compare after the fix.

---

## Phase 1: Extract the Shared Motion Lab Base Transform CSS

### [MODIFY] [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js)

Introduce a dedicated helper for Motion Lab’s SVG transform foundation.

### New helper

Add a helper such as:

```js
function generateMotionLabBaseTransformCss(mode = 'preview') { ... }
```

Or a pair of smaller helpers:

```js
function getMotionLabPreviewBaseCss(containerId = 'mlPreview') { ... }
function getMotionLabExportBaseCss(containerId) { ... }
```

### What the helper must include

The shared foundation should include the exact rules preview depends on:

1. root animated target gets `transform-box: fill-box`
2. root animated target gets `transform-origin: center`
3. SVG descendants get `transform-box: fill-box`
4. SVG descendants get `transform-origin: center`

### Important constraint

Do not hand-build a “similar” rule set.

The goal is not:
- “approximately the same”

The goal is:
- “the same transform foundation the preview already uses”

### Socratic checkpoint

Before moving on, ask:

`If I removed all animation keyframes and only kept the base transform CSS, would preview and export still agree on the icon’s resting geometry?`

If the answer is no, the helper is incomplete.

### Exit criteria

1. Preview base transform CSS exists as a reusable helper, not as inline duplication.
2. The helper is precise enough to support both preview and export.

---

## Phase 2: Make Preview Use the Shared Helper

### [MODIFY] [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js)

Refactor `generateAndInjectCSS(...)` to consume the shared base helper instead of hardcoding preview-only base CSS inline.

### Goal

This is not a behavior change.

It is a refactor to make the preview path and export path share the same source of truth.

### Guardrails

1. Do not change current preview behavior.
2. Do not change when preview injects animation CSS.
3. Keep stop/play behavior intact.

### Socratic checkpoint

Ask:

`After this refactor, does the preview render exactly the same before and after on the existing reference icon?`

If no, stop and fix preview first before touching export.

### Exit criteria

1. Preview behavior is unchanged.
2. Preview now uses the shared base transform helper.

---

## Phase 3: Make Self-Contained SVG Export Use the Same Base Contract

### [MODIFY] [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js)

Update both standalone SVG export paths:

1. direct download from `Download SVG`
2. modal `Copy Self-contained SVG` / `Download SVG`

### Required change

When building the `<style>` tag for exported SVG, prepend:

1. the export-rewritten version of the shared base transform CSS
2. then the existing rewritten Motion Lab animation CSS

The exported SVG should therefore contain:

1. base transform foundation
2. animation keyframes and trigger rules
3. static overrides
4. root transform overrides

in one complete bundle

### Important constraint

Do not rely on:

1. browser defaults
2. SVG viewer interpretation
3. the assumption that `transform-origin: center` alone is enough

The audit already showed it is not enough.

### Socratic checkpoint

Ask:

`If I open the exported SVG by itself in a blank HTML page, will its resting position match the preview before hover even starts?`

If no, export is still incomplete.

### Exit criteria

1. Standalone SVG contains the same transform foundation as preview.
2. The exported SVG no longer appears cropped, shifted, or collapsed on the reference case.

---

## Phase 4: Make CSS-Only Export Use the Same Base Contract

### [MODIFY] [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js)

Update the CSS-only export flow so it also includes the shared base transform foundation, rewritten for `#icon-container`.

### Expected result

The copied CSS should be sufficient for this usage:

```html
<div id="icon-container">
  <!-- inline SVG here -->
</div>
```

without requiring users to guess or manually add missing SVG transform rules.

### Important note

This export mode should explicitly target inline SVG usage.

Do not promise parity for:

1. `<img src="...">`
2. CSS background-image SVGs
3. tools that sanitize internal SVG styles

### Improve usage note

Update the usage comment so it is more explicit, for example:

```css
/* Usage: apply this CSS with an inline <svg> inside <div id="icon-container">...</div> */
```

If needed, mention that the SVG must remain inline for hover animation to work.

### Socratic checkpoint

Ask:

`If a normal user copies this CSS and pastes the inline SVG exactly as shown, will they get the same motion they saw in preview?`

If the answer depends on undocumented extra CSS, the export is still not ready.

### Exit criteria

1. CSS-only export includes the shared base transform foundation.
2. Inline SVG usage now matches preview on the reference case.

---

## Phase 5: Normalize Export Assembly So The Two Export Paths Cannot Drift Again

### [MODIFY] [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js)

Introduce a small shared export assembly helper so the standalone export paths cannot silently diverge.

### New helper

Add something like:

```js
function buildMotionLabStandaloneSvgCss() { ... }
function buildMotionLabExternalCss() { ... }
```

or:

```js
function buildMotionLabExportCss(mode) { ... }
```

### Purpose

Centralize:

1. base transform CSS
2. animation CSS
3. selector rewriting
4. export usage note

This avoids the same bug reappearing later in:

1. modal export
2. direct download export
3. future copy/download variants

### Guardrails

1. Do not over-abstract the entire Motion Lab engine.
2. Only centralize the pieces needed to keep preview/export parity.

### Exit criteria

1. Direct download and modal export use the same standalone CSS builder.
2. CSS-only export uses the same base transform source.

---

## Phase 6: Verification

### Static checks

Run:

1. `node --check store.js`
2. `npm run build`

If build fails for an environmental reason such as Windows file lock in `dist`, record that separately and continue with browser verification.

### Manual verification matrix

#### Reference case

Material accessibility glyph:

1. Preview in Motion Lab
2. Copy Self-contained SVG
3. Save and open that SVG in a blank HTML file
4. Copy CSS + use inline SVG in a blank HTML file
5. Compare against preview

Expected:

1. same resting geometry
2. same hover animation path
3. same effective scale
4. same visible centering

#### Secondary cases

Also verify:

1. one Lucide icon
2. one Tabler icon
3. one Ionicons icon

Expected:

1. no regression
2. export still matches preview

### Browser-based verification questions

Ask these explicitly during QA:

1. `Does the exported icon start in the same place as the preview?`
2. `Does the hover path move the same way as the preview?`
3. `Does the exported icon occupy the same visual footprint as the preview?`
4. `If I did not know which one was preview and which one was export, would I notice a difference?`

If the answer to question 4 is yes, the fix is not done.

---

## Risks and Mitigations

### Risk 1: Fixing export accidentally changes preview

Mitigation:

1. first extract preview base CSS without changing behavior
2. verify preview remains identical before touching export

### Risk 2: Selector rewriting breaks when base CSS is added

Mitigation:

1. keep base CSS generation separate from rewriting
2. test both `#animated-icon` and `#icon-container` outputs explicitly

### Risk 3: CSS-only export still fails in consumer projects

Mitigation:

1. document inline SVG requirement clearly
2. verify with a real plain HTML usage file

### Risk 4: Large-viewBox assets still behave differently

Mitigation:

1. include at least one large-viewBox Material case in verification
2. compare exported geometry, not just whether the animation technically runs

---

## Proposed File Scope

Primary edit target:
- [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js)

Optional verification artifacts only if needed:
- temporary local HTML reproduction files

No changes should be required to:

1. Material export ownership pipeline
2. Supabase function code
3. icon library indexing
4. Motion Lab preset catalog

---

## Acceptance Criteria

This fix is complete only when all of the following are true:

1. Motion Lab preview and exported standalone SVG match visually for the reference case.
2. Motion Lab preview and CSS-only export with inline SVG match visually for the reference case.
3. The exported result works the way the user selected it in Motion Lab.
4. Material and non-Material icons remain stable.
5. The preview/export mismatch no longer breaks user trust in Motion Lab export.
