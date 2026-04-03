# Audit: Material Symbols in Motion Lab

## Scope

Investigate why Material Symbols icons appear to have poor or non-working Motion Lab animations compared with the other libraries, identify the root cause, and propose a safe fix without changing the current stable code path yet.

## Executive Summary

This is not the same kind of bug as the earlier Material export/selector issue.

Motion Lab is successfully loading Material icons and successfully attaching preset animations to them. The problem is that Motion Lab receives Material Symbols as export snapshot SVGs, and those snapshots are almost always single filled compound paths. Motion Lab's preset system and element workflow are much more expressive on conventional icon SVGs that have multiple drawable children and stroke-based geometry.

So the actual issue is:

- Animation binding works
- Asset structure fit is poor
- Material enters Motion Lab in a form that removes most of the structural detail Motion Lab benefits from

That is why users experience Material icons as "most animations don't work", even though CSS animation is technically running.

## Reproduction Notes

Observed in the live app after opening a Material icon and sending it to Motion Lab via the customize panel.

Example used during audit:

- Material Symbols icon: `accessibility`
- Preset tested in Motion Lab: `bounce`

Live runtime inspection showed:

- Motion Lab created a wrapped root group: `g.ml-icon-root`
- The root group received `animation-name: ml-icon`
- The computed transform changed over time, for example `matrix(1, 0, 0, 1, 0, -4.74948)`

That confirms the engine is applying animation CSS to Material icons.

## Findings

### 1. Material is opened in Motion Lab as resolved export SVG, not as variable-font glyph data

When the user clicks `Open in Motion Lab`, the app does not pass Motion Lab a font-backed Material symbol node. It first resolves the icon to export-grade SVG and then loads that SVG into Motion Lab.

Relevant code:

- [main.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/main.js#L1635)

Key behavior:

- `resolveExportSvg(icon)` runs first
- `loadSvgIntoMotionLab(resolved.svg)` receives the resolved SVG snapshot

This means Motion Lab is working with the same snapshot-style SVG used for export, not the richer variable-font source representation.

### 2. Material snapshots are structurally different from the rest of the icon libraries

Motion Lab currently treats all incoming SVGs as if they are roughly equivalent. They are not.

Sample corpus comparison from the repo:

- First 20 Material export snapshots inspected under `public/material-export/materialsymbolsoutlined`
  - `20/20` had `shapeCount = 1`
  - `20/20` had `pathCount = 1`
  - `20/20` had no inline `stroke`
  - `20/20` had no `fill="none"`
- First 20 Lucide SVGs inspected under `node_modules/lucide-static/icons`
  - shape counts ranged from `1` to `7`
  - most sample icons had stroke-based geometry
  - most sample icons used `fill="none"`

Example Material snapshot:

- [account_circle exported SVG](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/public/material-export/materialsymbolsoutlined/account_circle/fill-0/wght-300/grad-0/opsz-24.svg)

This is the key structural mismatch:

- Material export snapshots are usually one compound filled silhouette
- Typical SVG libraries in Supericons are often multi-element stroke drawings

### 3. Motion Lab's element tree collapses to a single selectable child for Material

Motion Lab builds its element tree by walking the drawable children under the animation target.

Relevant code:

- [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L3224)

Because Material snapshots usually contain one `<path>`, the element tree effectively becomes:

- one wrapper root group
- one real drawable child path

So Material loses the structural granularity that makes Motion Lab feel expressive on richer SVGs.

Practical consequence:

- per-element animation layering is basically absent
- there is very little internal structure to animate independently

### 4. Presets are applied to the root as one whole-object animation

Motion Lab presets currently target the SVG root animation target, not per-path decomposition.

Relevant code:

- [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L5015)

Key behavior:

- `applyPreset()` always writes to `__root__`
- the entire icon animates as one unit

This works fine for many icons, but it becomes much less compelling when the icon is a single filled silhouette instead of a richer SVG.

### 5. Motion Lab has large-viewBox display repair, but no structure-aware animation adaptation

Motion Lab does have a heuristic for large-viewBox assets, but it is aimed at display and stroke preservation, not animation fit.

Relevant code:

- [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L3045)

That logic:

- detects large viewBox assets
- injects default `stroke-width` if missing
- injects `stroke="currentColor"` only when `fill="none"`

This helps outline libraries such as Ionicons, but it does nothing to adapt Motion Lab behavior for:

- single filled glyphs
- compound-path silhouettes
- icons with no stroke structure at all

### 6. The preview animation engine is functioning correctly

Generated preview CSS is being injected and includes root transform setup plus preset keyframes.

Relevant code:

- [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L3906)

During audit, the Material `bounce` preset produced:

- root target selector present
- animation CSS present
- active `animation-name`
- changing computed transform values over time

So the failure is not:

- selector rewrite failure
- missing animation CSS
- broken root animation targeting
- cache or export resolution failure

## Root Cause

Material Symbols are entering Motion Lab in the wrong kind of graphic form for Motion Lab's current preset model.

More specifically:

1. Material icons are resolved into static snapshot SVGs before Motion Lab sees them.
2. Those snapshots are usually single filled compound paths.
3. Motion Lab presets animate the whole icon root as one unit.
4. Motion Lab has no asset-profile awareness, so it does not adapt its presets or controls for single-fill glyphs.

Result:

- animations technically run
- but many presets lose visible character, internal articulation, and per-part motion
- users perceive the library as "not working" in Motion Lab

## Recommended Fix

### Recommended approach: add a Motion Lab asset profile layer

Do not change the working export pipeline.

Instead, add a Motion Lab-only analysis and adaptation layer so single-fill glyph icons get motion behavior tailored to their structure.

### Proposed design

#### 1. Analyze the incoming SVG on Motion Lab load

Add a profiling step inside `loadSvgIntoMotionLab()` that records:

- drawable shape count
- path count
- presence of stroke geometry
- presence of `fill="none"`
- viewBox dimensions
- whether the asset is effectively a `single-fill-glyph`

Suggested profile labels:

- `single-fill-glyph`
- `single-stroke-shape`
- `multi-stroke`
- `multi-fill`

Material snapshots will overwhelmingly land in `single-fill-glyph`.

#### 2. Add profile-aware preset adaptation

Introduce a second preset shaping layer, for example:

- `adaptPresetForProfile(preset, profile)`

For `single-fill-glyph` icons:

- boost translation amplitudes
- slightly boost rotation amplitudes
- slightly boost scale deltas
- strengthen filter-based glow and shadow presets
- preserve opacity behavior

This keeps the current preset catalog intact while making it visually credible for Material-style glyphs.

#### 3. Add a Motion Lab capability hint for single-fill glyphs

When the icon profile is `single-fill-glyph`, show a compact note in Motion Lab such as:

- "This icon is a single filled glyph. Motion Lab is using glyph-optimized presets."

This prevents the user from assuming the engine is broken when the asset simply has less internal structure.

#### 4. De-emphasize stroke-centric expectations for fill-only glyphs

For `single-fill-glyph` icons:

- keep root-level animation fully enabled
- keep scale, rotate, opacity, and filter controls enabled
- avoid presenting stroke-centric behavior as if it will be equally expressive

This can be done via subtle helper text rather than removing controls.

## Longer-Term Fix Option

If true Motion Lab parity is desired for Material Symbols, the stronger but more expensive path is:

- create a dedicated Motion Lab source for Material that is richer than the export snapshot

Possible directions:

- precompute decomposed SVG variants for Motion Lab
- derive stroked or outlined Motion Lab variants where appropriate
- maintain a separate Motion Lab asset set for Material instead of reusing export snapshots

That would produce the best parity, but it is a much bigger asset pipeline investment.

## What Not To Do

### Do not chase this as another selector bug

The audit shows animation CSS is already attaching to Material icons.

### Do not replace Material Symbols just because Motion Lab fit is poor

The issue is not that Material is unsupported. The issue is that Motion Lab currently has no structure-aware strategy for snapshot-based single-fill glyphs.

### Do not destabilize the working export parity path

The export and Motion Lab loader path is now functioning. The fix should be additive and Motion Lab-specific.

## Safe Implementation Sequence

1. Add SVG profiling on Motion Lab load
2. Store the profile on Motion Lab state
3. Add profile-aware preset adaptation
4. Add a small UI hint for single-fill glyphs
5. Run comparison QA on:
   - Material Symbols
   - Lucide
   - Ionicons
   - Tabler
6. Tune preset multipliers only after visual QA

## Conclusion

Material Symbols are not failing in Motion Lab because animation wiring is broken. They are underperforming because Motion Lab currently receives them as single filled snapshot glyphs and then treats them like ordinary multi-structure SVG icons.

The right fix is to make Motion Lab aware of icon structure and adapt preset behavior for `single-fill-glyph` assets, with Material Symbols as the first concrete beneficiary.
