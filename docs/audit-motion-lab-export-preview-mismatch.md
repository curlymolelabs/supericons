# Motion Lab Export Preview Mismatch Audit

Date:
- April 3, 2026

Scope:
- Motion Lab preview
- Motion Lab `Copy CSS`
- Motion Lab `Copy Self-contained SVG`
- Motion Lab downloaded animated SVG artifacts such as [download_icon_ms2.svg](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs/download_icon_ms2.svg)

## Summary

The exported Motion Lab output does not faithfully match what the user sees in the preview.

This is a real product bug, not user error.

The root cause is that the preview and export paths do not use the same SVG transform foundation. The preview injects extra SVG transform rules that are never included in either:

1. `Copy CSS`
2. `Copy Self-contained SVG`
3. downloaded standalone animated SVG files

As a result, exported icons can look cropped, shifted, or visually different from the preview, especially when:

1. the icon is a large-viewBox SVG
2. Motion Lab applies root scale or rotate
3. the icon is a single filled Material-style glyph

## User-Reproduced Evidence

Preview state from the provided example:

1. icon: Material accessibility glyph
2. preset: `glide`
3. trigger: `hover`
4. size: `48`
5. scale: `+35%`
6. rotate: `0deg`

The preview shows a centered orange icon inside Motion Lab.

The exported outputs provided by the user contain:

1. keyframes with `translateX(...) scale(1.35) rotate(...)`
2. root transform override `transform: scale(1.35); transform-origin: center;`
3. no `transform-box: fill-box`

The downloaded standalone SVG then renders incorrectly and appears visually collapsed/cropped compared with the preview.

## Findings

### Finding 1: Preview injects base SVG transform rules that export never carries forward

In [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js), the preview path uses `generateAndInjectCSS(...)` to prepend this base CSS:

```css
#mlPreview ... { transform-box: fill-box; transform-origin: center; }
#mlPreview svg * { transform-box: fill-box; transform-origin: center; }
```

Relevant code:
- [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L3968)

This matters because SVG transforms behave differently depending on `transform-box`. For Motion Lab, `fill-box` makes the transform pivot around the painted bounds of the icon, which is what the preview is using.

Export does not include those same rules.

### Finding 2: `generateFullCSS()` only emits animation and static override rules

The export-oriented CSS builder in [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L3780) emits:

1. keyframes
2. trigger rules
3. static fill/stroke/opacity rules
4. root transform overrides

It does not emit the preview base transform rules.

That means the export CSS is structurally incomplete relative to the preview.

### Finding 3: Self-contained SVG export uses the incomplete CSS

Both standalone export paths inject:

```js
rewriteForStandalone(generateFullCSS())
```

Relevant code:
- [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L4272)
- [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L5413)

So the self-contained SVG export is missing the exact preview CSS that makes the icon render correctly in Motion Lab.

This explains why the exported SVG can fail even when the preview looks correct.

### Finding 4: CSS-only export has the same mismatch

The `Copy CSS` flow rewrites selectors for `#icon-container`, but it still starts from the same incomplete CSS model:

```js
rewriteForExternal(generateFullCSS())
```

Relevant code:
- [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments\Apps\DailySprint\supericons/store.js#L5401)

So the CSS-only flow also omits the base SVG transform rules needed to match preview behavior.

This means the mismatch is not limited to downloaded SVG files. It also affects the external CSS export contract.

### Finding 5: The issue is cross-cutting, but Material makes it obvious

This is not fundamentally a Material Symbols export bug.

It is a Motion Lab export parity bug that becomes much more visible on Material because:

1. Material exports are often single filled glyphs
2. many Material snapshots use large viewBox coordinates
3. root scale and hover motion are more sensitive to missing `transform-box: fill-box`

So Material is the clearest reproducer, but the architectural gap is broader.

## Root Cause

The preview and export paths are not generated from the same complete CSS contract.

More specifically:

1. preview path:
   - `generateAndInjectCSS(...)`
   - includes preview-only base SVG transform rules
2. export path:
   - `generateFullCSS(...)`
   - omits those base SVG transform rules

The exported artifact therefore lacks part of the styling model required to look like the preview.

## What Is Not The Root Cause

The following are not the primary cause of this bug:

1. Material Symbols owned-cache export pipeline
2. Motion Lab root wrapper insertion
3. selector rewriting in `rewriteForStandalone(...)`
4. the new glyph-profile hint
5. preset adaptation for `single-fill-glyph`

Those systems may influence visibility, but they do not explain why the preview and export diverge for the same saved animation state.

## Gaps Identified

### Gap 1: Export parity gap

Motion Lab preview and Motion Lab export are not using a single shared, complete CSS generation model.

### Gap 2: Missing base transform rules in standalone SVG export

Standalone SVG export does not include:

1. `transform-box: fill-box`
2. the same transform-origin foundation the preview uses

### Gap 3: Missing base transform rules in CSS-only export

The external CSS export contract is incomplete for inline SVG consumers.

### Gap 4: Export guidance gap

The CSS export usage hint:

```css
/* Usage: <div id="icon-container"><svg>...</svg></div> */
```

does not tell the user that the exported CSS currently omits the preview’s SVG transform foundation.

So even users who follow the usage comment exactly can still get a mismatch.

### Gap 5: High-visibility failure on large-viewBox assets

Large-viewBox icons are more sensitive to transform-box differences, so the export failure presents as an obvious broken result instead of a subtle drift.

## Severity

High.

Reason:

Motion Lab’s promise is that users can preview an animation and then export that same animation.

Right now, the exported result can differ materially from what the user approved in preview. That breaks trust in the tool.

## Recommended Fix Direction

The next implementation should make preview and export share the same base SVG transform contract.

At minimum, the export path needs to carry over the same transform foundation the preview currently injects.

The correct fix should be handled in three steps:

1. audit the preview/export CSS divergence formally
2. write a focused implementation plan for export parity
3. update standalone SVG and CSS-only export generation so they include the same base transform behavior as preview

## Acceptance Criteria For The Future Fix

The issue is fixed only when all of the following are true:

1. the Motion Lab preview and exported standalone SVG render the icon in the same position and scale at rest
2. exported hover animation follows the same visible path as the preview
3. CSS-only export behaves the same when used with inline SVG
4. Material and non-Material icons both remain stable
5. no preview behavior regresses
