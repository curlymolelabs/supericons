# Converter Multicolor Preset Separation Fix Plan

## Goal

Fix `PNG -> SVG` so flat multi-color logos keep distinct brand colors across presets.

Immediate target:

- KFC-style red + black + white logos

Expected outcome:

- `Balanced` and `Detailed` should preserve black text/details instead of recoloring them red
- red panels should stay closer to the original hue
- preset differences should feel intentional:
  - `Simple`: rougher but faithful
  - `Balanced`: cleaner while still preserving the main color regions
  - `Detailed`: most faithful edges and internal separations, not just smoother curves

## Scope

Work only inside the current stable ImageTracer-based color fallback path.

Do not:

- reintroduce the rolled-back wrapper-based color engine
- change the mono route
- redesign the whole converter UI in this fix

## Root Strategy

Shift the preset differences for `flat-art-color` away from "geometry cleanup only" and toward "color-region preservation first."

## Fix 1: Make flat-art preprocessing less destructive for multi-color marks

Adjust [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L6566) so `flattenConverterColorArtwork()` behaves differently for:

- `single-hue logo`
- `multi-color flat artwork`

### Change

Keep current hard flattening for `single-hue logo`.

For `flat-art-color`:

- reduce the amount of palette snapping
- preserve more distinct palette entries
- avoid majority-label smoothing on multi-color logos
- keep anti-aliased transitions only where they help separate adjacent black/red regions

## Fix 2: Give `Balanced` and `Detailed` a larger effective color budget

Adjust [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L8234) so `flat-art-color` does not collapse all presets into nearly the same color budget.

### Change

Map presets more explicitly:

- `Simple`
  - lower color budget
  - stronger omission
  - smaller file
- `Balanced`
  - medium color budget
  - preserve main secondary color groups
  - protect black text/details
- `Detailed`
  - highest color budget within the stable fallback
  - least omission
  - prioritize internal contrast over aggressive cleanup

## Fix 3: Reduce region loss from omission thresholds

Review `pathomit` and `mincolorratio` in the `flat-art-color` branch of [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L8234).

### Change

For `Balanced` and `Detailed`:

- lower omission pressure on secondary/low-area shapes
- lower color-ratio pruning enough to keep black letters/details from being swallowed

The guiding rule is:

- small black regions inside a dominant red logo are still semantically important

## Fix 4: Keep color preservation independent from curve smoothing

Today, the presets mainly diverge through geometry tuning.

For `flat-art-color`, rebalance the preset logic so:

- curve smoothing does not become the main source of preset difference
- color separation is established first
- only then do smoothing/fitting differences apply

## Fix 5: Keep output preview synced to the selected preset

The user also found a state bug:

- click `Simple`
- click `Balanced` or `Detailed`
- click back to `Simple`
- the output preview can remain on the previous preset result instead of reflecting the newly selected state

### Likely cause

The converter is behaving like an async race or stale-result issue:

- a later trace result is still being shown after the preset selection has changed again
- or the preview DOM/object URL is not being replaced consistently when switching presets quickly

### Change

Harden the preset-switch flow in [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js) so:

- every preset click always increments the active trace token
- only the latest selected preset can update the output preview
- stale async results are discarded before they touch preview state
- switching back to `Simple` immediately reflects the current `Simple` output once the trace completes

This fix is part of the same batch, because preset fidelity is not trustworthy if the preview itself can lag behind the selected state.

## Verification

Use the same user-provided KFC test case and confirm:

1. `Simple`
   - still acceptable
   - may remain heavier
2. `Balanced`
   - black letters remain black
   - red stays closer to the original
   - output is lighter than `Simple`
3. `Detailed`
   - preserves at least as much internal color separation as `Balanced`
   - does not turn the letters red

4. Preset switching
   - click `Simple` -> preview shows `Simple`
   - click `Balanced` -> preview updates to `Balanced`
   - click `Detailed` -> preview updates to `Detailed`
   - click back to `Simple` -> preview returns to the actual `Simple` result, not a stale previous trace

Also recheck Shell-style yellow/red logos to confirm the fix generalizes beyond KFC.

## Success Criteria

- `Balanced` and `Detailed` no longer recolor black logo text/details into the dominant red
- `Detailed` is not less faithful than `Simple`
- preset differences become understandable:
  - `Simple` = roughest
  - `Balanced` = clean default
  - `Detailed` = most faithful
