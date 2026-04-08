# Audit: MingCute Fill Palette Turning Icon Into Solid Block

## Issue

In Motion Lab, some MingCute icons turn into a solid colored square/block when a fill color is selected from the fill palette.

This is a runtime recolor issue, not an animation issue.

## What I Checked

- Motion Lab fill recolor logic in [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js)
- MingCute ingestion logic in [build-icons.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/scripts/build-icons.js)
- Real MingCute `_line` SVG source files in `node_modules/mingcute_icon/svg/...`

## Root Cause

The current fill recolor logic only skips shapes whose original element explicitly has `fill="none"`.

Current behavior in [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js):

```js
const origEls = origDoc.querySelectorAll(SHAPE_TAGS);
svgEl.querySelectorAll(SHAPE_TAGS).forEach((el, i) => {
  const origFill = origEls[i]?.getAttribute('fill');
  if (origFill === 'none') return;
  el.setAttribute('fill', color);
});
```

That works for icons where the non-visible helper shape declares `fill="none"` directly on the shape.

MingCute `_line` icons are different.

Example source structure:

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24">
  <g fill="none" fill-rule="nonzero">
    <path d="M24 0v24H0V0h24Z..." />
    <path fill="#09244B" d="..." />
  </g>
</svg>
```

Important detail:

- the first path is a hidden ghost/layout path covering the full icon box
- it does **not** carry `fill="none"` on the path itself
- instead, it inherits `fill="none"` from the parent `<g>`

Motion Lab currently inspects only the path-level `fill` attribute. So for that first helper path:

- `getAttribute('fill')` returns `null`
- Motion Lab assumes it is safe to recolor
- Motion Lab sets `fill="<chosen color>"` on that hidden box path
- the invisible helper path becomes a visible square block

That is why the whole icon appears to turn into a colored square.

## Why Build-Time Normalization Does Not Prevent It

MingCute import logic in [build-icons.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/scripts/build-icons.js) replaces hardcoded visible fills with `currentColor`:

```js
const svg = cleanSvg(content).replace(/fill="(?!none|currentColor)[^\"]+"/g, 'fill="currentColor"');
```

This preserves explicit `fill="none"` values, which is correct in general.

But for MingCute `_line` icons, the hidden helper path often has:

- no path-level `fill` attribute
- inherited `fill="none"` from the wrapping `<g>`

So build-time replacement does not mark that helper path in a way Motion Lab can later recognize with its current path-only check.

## Gap Summary

### Gap 1: Fill recolor ignores inherited `fill="none"`

Motion Lab only checks `origEl.getAttribute('fill')`.

It does not account for:

- `fill="none"` inherited from a parent `<g>`
- other inherited visibility rules that make a shape intentionally non-painted

This is the primary root cause.

### Gap 2: Shape recolor is index-based and assumes simple one-to-one visible shapes

The runtime recolor logic matches shapes by index between the original SVG document and the live SVG.

That is usually okay, but it becomes fragile when a library includes:

- helper bounds paths
- ghost layout paths
- invisible metadata shapes

MingCute exposes that weakness clearly.

### Gap 3: The runtime recolor layer has a stroke safeguard now, but no equivalent MingCute-style fill safeguard

The recent Tabler fix addressed invisible stroke helpers in the stroke recolor path.

There is not yet an equivalent guard in the fill recolor path for:

- inherited `fill="none"`
- known ghost/layout paths like MingCute's box path

### Gap 4: Export risk likely exists anywhere filled path colors are baked from the live SVG

If the live SVG in Motion Lab already contains the wrongly recolored helper path, then exported SVG/CSS can preserve that bad state too.

So this is not only a preview bug. It is likely an export correctness bug as well.

## Scope of Impact

Likely affected:

- MingCute `_line` icons in Motion Lab when using the fill palette
- any other library that uses inherited `fill="none"` on helper paths rather than explicit path-level `fill="none"`

Not the cause here:

- animation preset logic
- Motion Lab transform logic
- fill palette UI itself

## Recommended Fix Direction

The safest fix is in Motion Lab runtime fill recolor, not a broad rewrite of all icon ingestion first.

Recommended direction:

1. Teach fill recolor to skip shapes that inherit `fill="none"` from the original SVG tree, not just shapes with explicit path-level `fill="none"`.
2. Add a narrow guard for MingCute's known hidden helper path pattern if needed as a second line of defense.
3. Re-verify both preview and export after the runtime fix.

## What Success Looks Like

After the fix:

- selecting a fill color on MingCute icons recolors only the visible glyph path(s)
- the invisible box/helper path remains invisible
- no solid color square appears in preview
- exported SVG/CSS reflects the corrected visual result

## Conclusion

This is a fill recolor gap caused by inherited `fill="none"` on MingCute helper paths.

The recolor code currently treats those invisible helper paths as visible fill targets, which turns them into solid blocks. The fix should be made in the runtime fill recolor layer, with export verification afterward.
