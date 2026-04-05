# PNG to SVG Icon Preview Geometry Fix Plan

## Goal

Fix the tiny-icon preview/export distortion introduced by the current proof-service geometry mismatch, while leaving the working logo path untouched.

Target cases:

- `alien-48px.png`
- `air-balloon-48px.png`

Must not regress:

- `Shell_logo.svg.png`
- `Kfc_logo.png`
- `McDonalds-logo-500x281.png`

## Root Fix Strategy

Introduce a separate concept for the proof-service trace input size and use it to normalize icon SVGs correctly.

The current system only tracks:

- crop size
- export size

It also needs:

- `traceGeometrySize`

for proof-service routes that trace an upscaled raster.

## Implementation Plan

### Step 1: Track proof-service geometry size explicitly

In [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js):

- when the proof-service image comes from `cropCanvas`, set:
  - `traceGeometryWidth = cropBounds.width`
  - `traceGeometryHeight = cropBounds.height`
- when the proof-service image comes from `upscaledCanvas`, set:
  - `traceGeometryWidth = upscaledCanvas.width`
  - `traceGeometryHeight = upscaledCanvas.height`

This should be computed right next to the `proofServiceImageBase64` creation so the geometry source is unambiguous.

### Step 2: Add a geometry-aware normalization path for proof-service SVGs

Extend `buildConverterServiceTraceArtifact(...)` to accept:

- `traceGeometryWidth`
- `traceGeometryHeight`
- `targetViewBoxWidth`
- `targetViewBoxHeight`

Do not reuse `originalWidth` / `originalHeight` for both concerns.

### Step 3: Scale tiny icon geometry back to crop coordinates

For icon proof-service routes where:

- `traceGeometryWidth !== cropBounds.width`
- or `traceGeometryHeight !== cropBounds.height`

apply a deterministic SVG transform before final normalization:

- scale X by `cropBounds.width / traceGeometryWidth`
- scale Y by `cropBounds.height / traceGeometryHeight`

Then normalize final SVG with:

- `viewBox="0 0 cropBounds.width cropBounds.height"`
- `width="exportWidth"`
- `height="exportHeight"`

This keeps:

- preview sizing
- compare sizing
- metadata
- export sizing

all aligned to the crop-space model already used by the app.

### Step 4: Scope the fix only to icon proof-service routes

Add a strict guard so this path only runs when:

- `assetMode === 'icon'`
- proof-service output came from upscaled raster input

Do not apply this transform to:

- `Logo` mode
- browser fallback traces
- non-upscaled proof-service traces

This is the key anti-regression guard.

### Step 5: Keep preview sizing unchanged

Do not change:

- `outputPreviewSize`
- split/default compare layout
- export-size control behavior

Those should keep using crop-space dimensions.

The fix is only about making the SVG geometry match the preview/export coordinate system again.

## Acceptance Criteria

### Tiny icons

For:

- `alien-48px.png`
- `air-balloon-48px.png`

Expected:

- full icon appears in preview
- no clipped sliver
- default and split compare show the whole traced icon
- download/copy contain the full traced icon

### Logos

For:

- `Shell_logo.svg.png`
- `Kfc_logo.png`
- `McDonalds-logo-500x281.png`

Expected:

- no visible regression
- preview still fits correctly
- split compare still fits correctly
- output-size control still works

## Verification

### Required checks

1. `Icon` mode:
   - `Auto`
   - `Compact`
   - `Exact`
   - for both `alien` and `air-balloon`

2. `Logo` mode:
   - `Auto` on Shell
   - `Auto` on KFC
   - `Auto` on McDonald’s

3. Export-size check:
   - verify icon preview remains correct with:
     - `Auto`
     - `Original`
     - `Custom`

## Non-Goals

This fix does **not** aim to:

- make tiny icons thinner
- smooth icon outlines further
- change the icon trace profile

Those are separate quality-tuning questions.

This fix is strictly about:

- geometry correctness
- full-shape preview/export rendering

## Recommendation

Implement this before any further icon-quality tuning.

There is no value in tuning line thickness or smoothing if the icon preview/export is still normalized against the wrong coordinate space.
