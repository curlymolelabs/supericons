# Converter Multicolor Preset Regression Audit

## Issue

For flat multi-color logos such as KFC:

- `Simple` currently gives the best visual result
- `Balanced` and `Detailed` darken the red regions
- `Balanced` and `Detailed` also recolor the black `KFC` letters toward red instead of preserving black

This is a preset-specific regression inside the current `flat-art-color` fallback path.

## What The Smoke Test Shows

Observed behavior from the user-provided KFC logo screenshots:

- `Simple`
  - closest color contrast to the original
  - black letters stay black
  - much heavier output
  - example shown: `~141KB · 716 paths · Heavy`
- `Balanced`
  - much smaller and cleaner structurally
  - red becomes darker
  - black letters shift toward red
  - example shown: `~40KB · 9 paths · Light`
- `Detailed`
  - same failure mode as `Balanced`
  - red darkens further
  - black letters also shift toward red
  - example shown: `~65KB · 9 paths · Light`

## Root Cause

The problem is not one single line. It is the combination of three current design choices in [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js).

### 1. Flat-art preprocessing is too aggressive before tracing

In [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L6566), `flattenConverterColorArtwork()` snaps every foreground pixel to a very small palette before ImageTracer sees the image.

That means:

- the image is already heavily simplified before tracing starts
- neighboring dark red and black regions become easier to collapse
- anti-aliased edge colors no longer help preserve region boundaries

This preprocessing is useful for removing screenshot noise, but it is too blunt for brand marks where black text and red panels must remain distinct.

### 2. `flat-art-color` overrides most preset-level color differences

In [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L8234), the `flat-art-color` branch rewrites the tracer options to a narrow shared color budget.

That means:

- `Simple`, `Balanced`, and `Detailed` are no longer meaningfully different in color separation
- all three presets are forced toward roughly the same reduced palette
- the presets mainly differ in geometric simplification instead of chromatic fidelity

So the product appears to offer three different quality modes, but on this route they are largely tracing the same flattened color image with only minor geometry differences.

### 3. `Balanced` and `Detailed` simplify geometry in ways that erase preserved color boundaries

After the forced palette reduction, `Balanced` and especially `Detailed` use tighter curve fitting and cleaner large-shape reconstruction in [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L8190).

That ends up helping the wrong thing:

- it reduces the number of paths dramatically
- it produces a visually cleaner shape count
- but because the pre-flattened color image has already lost some separability, the simplification favors large dominant red regions
- black text and face details get absorbed into the dominant red grouping

This explains why:

- `Simple` is heavier but more faithful
- `Balanced` and `Detailed` are lighter but less correct

## Why `Simple` Looks Better

`Simple` is currently "winning" for the wrong reason.

It looks better because:

- it preserves more fragmented traced regions
- it does not smooth/abstract the flattened image as aggressively into a few large shapes
- black letter regions survive as separate shapes more often

So `Simple` is not evidence that the flat-art route is correct. It is evidence that the current fallback only stays faithful when it avoids over-simplifying.

## Conclusion

The regression is caused by:

1. palette flattening happening too early and too aggressively
2. `flat-art-color` forcing a shared low-color route across presets
3. `Balanced` and `Detailed` spending their preset differences on shape simplification instead of color preservation

The next fix should focus on preserving color-region separation for `Balanced` and `Detailed`, not on making `Simple` even heavier.
