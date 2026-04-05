# PNG to SVG Final Refinement Plan

## Goal

Stabilize the Node-backed `PNG -> SVG` converter so it works reliably for the logo and icon classes we already tested in the app:

- flat multicolor logos
- single-color logos on light backgrounds
- tiled app-icon logos
- tiny transparent icons and symbols
- white-on-transparent small icons

This plan is intentionally narrower than "convert any PNG into a good SVG." It focuses on the real launch set we have been testing.

## Current State

The local Node proof-service path is now clearly better than the old browser fallback path for many color cases, especially:

- Shell
- KFC `Auto` / `Compact`
- some single-color logos

But the current integrated flow still fails in recognizable ways for specific classes:

### 1. Tiny transparent icons lose shape fidelity

Examples:

- `alien-48px.png`
- `air-balloon-48px.png`

Observed behavior:

- shape is close but not exact
- thin negative spaces and inner cutouts drift
- the output feels simplified in the wrong places

### 2. Small tiled icon logos keep the tile instead of the mark

Example:

- `McDonalds-logo-500x281.png`

Observed behavior:

- the red rounded square becomes the dominant SVG shape
- the yellow arches survive, but the converter preserves too much of the icon tile
- output is technically valid but semantically wrong

### 3. Single-color marks on light backgrounds can explode

Example:

- `logo_lightmode.png`

Observed behavior:

- the mark becomes oversized and distorted
- interior cutouts and whitespace are not preserved correctly

### 4. Exact mode still overfits some flat logos

Example:

- `Kfc_logo.png`

Observed behavior:

- `Compact` and `Auto` are often acceptable
- `Exact` can add outline noise and anti-aliased edge baggage
- file size and path count jump without corresponding quality gains

## Root Cause Summary

The remaining problems are no longer "the whole converter is broken." They come from one design gap:

The Node service currently only understands:

- quality mode: `compact` vs `exact`
- color mode: `color` vs `binary`

It does **not** yet understand the semantic image class it is tracing.

Right now we have only one service config family in:

- [service.mjs](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/tools/converter-proof-service/service.mjs)

That means the same vectorization strategy is being applied to:

- Shell
- KFC
- McDonald's app icon
- tiny balloon icon
- alien face icon
- orange single-color logo

Those are not the same problem.

## Design Conclusion

The right path is still the Node-backed converter.

The wrong part is the current "one service mode fits everything" design.

We need to add one more layer before vectorization:

- classify the source image
- preprocess differently by class
- send route-aware hints into the Node service

This is the missing refinement layer.

## Recommended Fix Strategy

### A. Keep `Auto Crop`, but do not rely on helpers as user controls

`Auto Crop` is still useful and should stay.

The other old helper-style controls should stay hidden. Their intent should be absorbed internally into routing and preprocessing, not exposed as user tuning knobs.

That means:

- keep `Auto Crop`
- keep visible presets only if they still map to real output goals
- move small-icon cleanup, inversion logic, and shape preservation into internal rules

### B. Add explicit asset-class routing

Extend trace profiling in:

- [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js)

to classify at least these cases:

1. `flat-logo-color`
- large flat multicolor brand marks
- Shell, KFC

2. `tile-icon-color`
- app icon or logo tile with a strong background block and a smaller foreground mark
- McDonald's red square

3. `tiny-line-icon`
- small transparent symbol with thin strokes or small holes
- alien, air-balloon

4. `single-color-mark`
- one-color brand mark on light or transparent background
- orange `logo_lightmode`

### C. Preprocess by class before service trace

#### For `flat-logo-color`

Use the current Node color path, but:

- keep `Compact` as the practical default
- keep `Exact` stricter and more conservative
- reduce anti-aliased fringe preservation in `Exact`

#### For `tile-icon-color`

Add foreground extraction before sending to the service:

- detect dominant tile/background color
- isolate the foreground mark from the icon tile
- decide whether launch behavior should keep the tile or remove it

If the product goal is "convert the full app icon," keep the tile.

If the product goal is "extract the logo mark," remove the tile before tracing.

We need to choose one behavior and make it consistent.

#### For `tiny-line-icon`

Do not send raw tiny PNG pixels directly into the color service path.

Instead:

- upscale the raster first
- build a stronger foreground mask from alpha and local contrast
- preserve narrow gaps and holes
- trace with a tiny-icon-oriented mode

This is the most likely fix for alien and balloon fidelity.

#### For `single-color-mark`

Before tracing:

- detect the background fill from corners
- separate the single-color foreground from the light background
- preserve negative space

This should prevent the `logo_lightmode` blow-up.

### D. Add service-side route-aware configs

Update:

- [service.mjs](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/tools/converter-proof-service/service.mjs)

so it no longer only chooses between:

- `compact`
- `exact`
- `binary`
- `color`

It should also accept a route hint such as:

- `flat-logo-color`
- `tile-icon-color`
- `tiny-line-icon`
- `single-color-mark`

That allows different vectorizer configs per class.

### E. Make `Exact` fidelity-aware, not just heavier

Right now `Exact` often means:

- more paths
- more anti-aliased noise
- more file size

It should instead mean:

- higher shape fidelity
- better hole preservation
- better corner/curve retention
- still reject obvious fringe noise

For KFC, `Exact` should not reintroduce the cup outline fringe and anti-aliased edge baggage.

## Implementation Sequence

### Step 1. Add route classification

In frontend profiling, add booleans or a `traceClass` value for:

- tiny icon
- line icon
- tile icon
- single-color mark

### Step 2. Add route hint to proof-service request

Extend the proof-service payload contract to include:

- `traceClass`
- optional `backgroundHint`
- optional `foregroundHint`

### Step 3. Build class-specific preprocessors

Frontend-side:

- tiny icon upscale + mask prep
- tile icon separation
- single-color foreground extraction

### Step 4. Build class-specific service configs

Service-side:

- separate config tables per `traceClass`
- keep `Compact` and `Exact` within each class

### Step 5. Rebenchmark the known set

Must pass visually for:

- Shell
- KFC
- McDonald's icon
- alien
- air-balloon
- orange `logo_lightmode`

## Acceptance Criteria

### Shell

- red and yellow stay distinct
- no fake background block
- `Auto` and `Exact` both acceptable

### KFC

- black text stays black
- red bars stay red
- no unwanted outer outline baggage
- `Exact` must not be worse than `Compact`

### McDonald's icon

- arches stay yellow
- red tile behavior is consistent with chosen product rule
- no block-only output

### Alien

- face outline preserved
- eye and mouth holes remain clean
- no square block artifact

### Air balloon

- balloon silhouette remains balanced
- inner gaps remain visible
- no lopsided or merged lobes

### Orange single-color logo

- mark stays centered
- inner white cutouts remain cut out
- no oversized shape explosion

## Non-Goals

This plan does not attempt to make launch support:

- photos
- screenshots of full UIs
- noisy illustrations
- gradient artwork
- arbitrary raster images

## Launch Recommendation After Refinement

If this plan succeeds, launch positioning should be:

"Convert clean PNG logos and simple icons into SVG."

Not:

"Convert any PNG into a production-ready SVG."

