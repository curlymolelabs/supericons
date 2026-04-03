# Tabler Stroke Outline Fix Plan

Date: 2026-04-04

Related audit:

- [audit-tabler-stroke-outline.md](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs/audit-tabler-stroke-outline.md)

Primary implementation file:

- [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js)

Secondary file for optional hardening:

- [build-icons.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/scripts/build-icons.js)

## Goal

Fix the Motion Lab stroke color bug for Tabler outline icons so that:

- clicking a stroke color dot recolors only the real visible icon strokes
- the invisible helper square never becomes visible

In user terms:

- changing stroke color should recolor the icon itself
- it should not draw a box around the icon

## Non-Goals

This fix should not change:

- how fill color works
- how stroke color works for Lucide, Iconoir, or other stroke-based libraries
- Motion Lab animation behavior
- the icon build pipeline in the first implementation pass unless verification proves it is necessary

## Root Cause To Fix

Tabler outline SVGs include an invisible helper path like:

```svg
<path stroke="none" d="M0 0h24v24H0z" fill="none"/>
```

The current stroke recolor logic in [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L3617) treats every shape in stroke-based icons as a visible stroke target:

```js
svgEl.querySelectorAll(SHAPE_TAGS).forEach(el => {
  el.setAttribute('stroke', color);
});
```

That incorrectly recolors the helper path and makes the square visible.

## Implementation Strategy

### Phase 1. Add a visible-stroke filter in `applyStrokeToSvg()`

In the stroke-based branch of `applyStrokeToSvg()`:

- parse the original SVG from `motionLab.svgText`
- iterate current preview elements and their original counterparts in parallel
- recolor only elements whose original stroke was meaningfully visible

Preferred rule:

- skip any element where original `stroke` is missing
- skip any element where original `stroke === 'none'`
- allow recolor only when the original element had a real stroke or inherited a meaningful root stroke intended for visible icon geometry

Important nuance:

- the helper path is explicitly `stroke="none"`, so this check should exclude it cleanly
- real Tabler icon strokes inherit from the root `stroke="currentColor"`, so the logic must preserve those

### Phase 2. Add a narrow helper-path safeguard

Even with the visible-stroke filter, add one extra defensive rule for the known Tabler helper path pattern.

Recommended safeguard:

- skip any shape whose original `d` exactly matches `M0 0h24v24H0z`

Why:

- this is a known cross-Tabler pattern
- it is a low-risk defensive guard
- it protects against edge cases where stroke inheritance logic could still overreach

This should be a secondary guard, not the primary logic.

### Phase 3. Keep the fix scoped to live Motion Lab preview first

Do not change the build pipeline in the first pass.

Reason:

- the live preview bug is proven
- the narrowest safe fix is in `applyStrokeToSvg()`
- changing `build-icons.js` would affect all Tabler usage surfaces and has a much wider blast radius

So the first implementation should only address:

- live stroke recolor in Motion Lab

### Phase 4. Verify export behavior after the preview fix

After the live preview fix is in place, explicitly verify whether the same invisible helper square can still appear in:

1. `Copy CSS`
2. self-contained SVG export
3. downloaded Motion Lab SVG

Why:

- export CSS still emits a broad root `stroke:` override for stroke-based icons in [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L3935)
- that may or may not still surface the helper path depending on SVG presentation attribute precedence

If export remains clean after the runtime fix:

- stop there

If export still shows the square:

- add a second narrow export-layer safeguard before considering any build-pipeline changes

### Phase 5. Defer build-time sanitization unless still needed

Only if preview and/or export still show helper-path issues after the runtime fix should we consider sanitizing Tabler SVGs at build time in [build-icons.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/scripts/build-icons.js).

Possible future hardening:

- strip the exact helper path on ingest for Tabler outline icons

This is intentionally deferred because it changes the canonical icon dataset and affects more than Motion Lab.

## Verification Checklist

### Live preview regression

1. Load a Tabler outline icon in Motion Lab.
2. Click a stroke color dot.
3. Confirm:
   - the icon stroke recolors
   - no square outline appears

Repeat with several Tabler icons:

- circle-based icon
- multi-path icon
- icon with many small strokes

### Cross-library safety

1. Repeat the same stroke-color action on:
   - Lucide
   - Iconoir
2. Confirm stroke recolor still works as before.

### Fill behavior safety

1. Use a fill-based icon (for example Material or Phosphor).
2. Confirm the stroke color path still behaves as before and does not create new outlines.

### Export verification

1. Apply a stroke color to a Tabler icon in Motion Lab.
2. Export via:
   - `Copy CSS`
   - self-contained SVG
   - `Download SVG`
3. Confirm the helper square does not appear in the exported result.

## Expected Outcome

After this fix:

- Tabler stroke recolor behaves like users expect
- the invisible helper square stays invisible
- other libraries keep their current stroke recolor behavior

## Plain-English Summary

We will stop painting Tabler’s hidden helper square when stroke color changes.

The first fix stays small and local:

- only recolor real visible strokes in Motion Lab

Then we verify export behavior before touching anything broader.
