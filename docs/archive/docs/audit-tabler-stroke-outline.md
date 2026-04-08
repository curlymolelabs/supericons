# Tabler Stroke Color Square Outline Audit

Date: 2026-04-04

## Scope

Audit the Tabler library behavior in Motion Lab for this user-facing defect:

- select a Tabler icon
- click one of the stroke color dots
- a square outline appears around the icon
- that square outline should not appear

Files reviewed:

- [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js)
- [build-icons.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/scripts/build-icons.js)
- local Tabler source SVGs in `node_modules/@tabler/icons/icons/outline`

## Executive Summary

The root cause is clear:

- Tabler outline SVGs include an invisible helper path used as a viewbox/bounding-box reset
- Motion Lab's stroke recolor logic treats **all shape elements** in stroke-based icons as visible stroke targets
- that recolors the helper path too
- once recolored, the helper path becomes a visible square outline

This is why the issue shows up specifically when stroke color is changed on Tabler icons.

## Findings

### 1. Tabler outline icons include an invisible square helper path

A real Tabler source icon, for example `alert-circle.svg`, begins like this:

```svg
<svg
  fill="none"
  stroke="currentColor"
  ...
>
  <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
  <path d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0" />
  <path d="M12 8v4" />
  <path d="M12 16h.01" />
</svg>
```

That first path is not part of the icon art. It is an invisible helper path:

- `d="M0 0h24v24H0z"` describes the full square bounds
- `stroke="none"` makes it invisible
- `fill="none"` makes it invisible

This pattern appears broadly across Tabler outline icons.

### 2. Motion Lab recolors every shape in stroke-based icons without excluding helper paths

In [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L3617), `applyStrokeToSvg()` does this for stroke-based icons:

```js
svgEl.querySelectorAll(SHAPE_TAGS).forEach(el => {
  el.setAttribute('stroke', color);
});
```

`SHAPE_TAGS` is:

```js
path, circle, rect, polygon, polyline, line, ellipse
```

Because the Tabler helper path is a `<path>`, it is included in this loop.

So Motion Lab changes:

```svg
<path stroke="none" d="M0 0h24v24H0z" fill="none"/>
```

into something effectively like:

```svg
<path stroke="#ff6b35" d="M0 0h24v24H0z" fill="none"/>
```

That makes the square visible.

### 3. Fill recolor already has the correct kind of guard, but stroke recolor does not

In [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L3590), `applyFillToSvg()` checks the original SVG and skips elements with `fill="none"`:

```js
if (origFill === 'none') return;
```

This is the right pattern.

But in `applyStrokeToSvg()`, the stroke-based branch does not perform the equivalent check against the original element stroke value.

That asymmetry is the core implementation gap.

### 4. The build pipeline preserves the Tabler helper path unchanged

In [build-icons.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/scripts/build-icons.js#L116), Tabler SVGs are loaded directly and stored as-is:

```js
const dir = join(ROOT, 'node_modules', '@tabler', 'icons', 'icons', 'outline');
...
svg: f.svg,
```

There is no Tabler-specific sanitization step to strip the invisible helper path at ingest time.

This means every downstream Motion Lab path sees that helper path unless runtime code filters it out.

### 5. There is likely a secondary export risk

This is an inference, but a strong one:

- Motion Lab export CSS emits a static root `stroke:` rule for stroke-based icons in [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L3935)
- Tabler helper paths keep `stroke="none"` as a presentation attribute
- depending on CSS precedence in the export context, that helper path may also become visible in exported CSS/SVG scenarios

The live preview bug is proven.

The export risk should be verified separately after the preview fix, because the same underlying broad stroke model exists there too.

## Root Cause

The defect is not that Tabler SVGs are malformed.

The defect is that Motion Lab assumes:

- if an icon is stroke-based, every shape element should receive the new stroke color

That assumption is false for Tabler because it includes invisible helper paths.

## Recommended Fix Direction

There are two reasonable fix layers.

### Option A. Runtime fix in Motion Lab stroke recolor

When recoloring stroke-based icons, only recolor elements that originally had a meaningful visible stroke.

For example:

- inspect the original matching element from `motionLab.svgText`
- skip elements where original `stroke` is missing or equals `none`
- optionally also skip the exact helper path `d="M0 0h24v24H0z"`

This is the narrowest fix and directly addresses the preview bug.

### Option B. Sanitize Tabler helper paths at ingest/build time

Strip the helper path from Tabler SVGs when building the icon dataset.

That would likely fix the issue more broadly across:

- live preview
- exported SVG/CSS
- any future tooling that walks shape elements generically

This is a broader, more structural fix.

## Recommendation

Best immediate path:

- apply the narrow runtime fix first in `applyStrokeToSvg()`
- then verify whether exported SVG/CSS also needs a matching safeguard

Best long-term path:

- consider stripping known helper paths from Tabler at build time as well

## Plain-English Summary

The square outline is not a real part of the Tabler icon.

It is an invisible helper square that Tabler ships inside the SVG.

When Motion Lab changes stroke color, it accidentally paints that invisible helper too, so it becomes visible.
