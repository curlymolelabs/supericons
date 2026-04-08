# PNG to SVG Tiny Icon Shape Preservation Plan

## Scope

This plan covers the remaining PNG -> SVG failures for tiny plain icons and symbols after the Node-backed color path started working well for logos.

Confirmed good enough now:

- KFC
- Shell
- McDonald's
- other flat colored logo-style assets

Still off:

- `alien-48px.png`
- `air-balloon-48px.png`

## Current Diagnosis

The remaining issue is **not** the overall PNG -> SVG architecture anymore.

It is a narrow geometry-preservation problem in the tiny-icon route.

The frontend now correctly classifies these assets as tiny icons and sends them through the proof service with a `tiny-line-icon` route hint.

However, the current service config for that route still uses:

- `PathSimplifyMode.Spline`
- aggressive corner smoothing
- iterative simplification tuned for logos, not tiny symbols

That is why:

- the alien eyes and mouth shift shape
- the balloon interior rails and lower basket simplify incorrectly
- the output is recognizable, but not faithful

## Root Cause

Tiny icons have a different constraint than logos:

- logos tolerate some smoothing if the silhouette stays clean
- tiny icons depend on preserving tiny cutouts, narrow gaps, and small internal negative spaces

The current tiny-icon service path is still optimizing for:

- smooth curves
- fewer nodes

But what it should optimize for is:

- pixel-faithful geometry preservation

That means the main root cause is:

`tiny-line-icon` is still being traced with the wrong simplification strategy.

## Design Conclusion

Helpers are not the main fix here.

`Auto Crop` can stay, but:

- it is not the reason the alien eyes move
- it is not the reason the balloon basket changes

The real fix is to make tiny plain icons use a dedicated micro-icon tracing mode.

## Proposed Fix

### 1. Create a stricter `micro-icon-binary` tracing config

In:

- [service.mjs](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/tools/converter-proof-service/service.mjs)

Change the `tiny-line-icon` route away from spline-heavy simplification.

Use settings biased toward preservation:

- `colorMode: Binary`
- `mode: PathSimplifyMode.Polygon` or `PathSimplifyMode.None`
- much lower or zero iterative smoothing
- lower `lengthThreshold`
- lower `filterSpeckle`
- higher path precision

The goal is:

- preserve small holes
- preserve narrow line gaps
- preserve tiny corners

even if the SVG becomes slightly less elegant.

### 2. Increase tiny-icon upscale before tracing

In:

- [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js)

The current 4x nearest-neighbor upscale is a good start, but for 48px icons we should test:

- `6x`
- `8x`

This gives the binary tracer more room to preserve the negative spaces before simplification.

### 3. Preserve alpha-driven masks more strictly

For tiny transparent icons:

- prefer alpha/mask fidelity over color-derived thresholding
- do not let luminance heuristics reinterpret the mark unnecessarily

This is especially important for white-on-transparent icons like:

- alien
- balloon

### 4. Treat tiny icons as fidelity-first regardless of visible preset

For this route, `Auto`, `Compact`, and `Exact` should not diverge dramatically.

Reason:

- for 48px icons, the user goal is not file-size optimization
- it is shape preservation

So for `tiny-line-icon`, preset differences should be minimal and safe.

## Implementation Steps

### Step 1

Update `tiny-line-icon` config in the proof service:

- switch away from spline mode
- reduce smoothing/iteration
- increase precision

### Step 2

Increase tiny-icon preprocessing upscale in the frontend for this class.

### Step 3

Retest:

- `alien-48px.png`
- `air-balloon-48px.png`

### Step 4

Only if needed:

- add a second tiny-icon branch for ultra-small icons under 64px

## Acceptance Criteria

### Alien

- outer head shape preserved
- both eyes remain correctly shaped
- mouth/inner cutout remains centered
- no lopsided facial features

### Balloon

- balloon cage lines stay distinct
- center rails do not collapse or merge
- basket shape stays proportional
- silhouette remains balanced

## Non-Goals

This plan does not change:

- the successful flat-logo color route
- the current KFC / Shell / McDonald's wins
- launch positioning

It only targets the tiny plain-icon route.

## Recommendation

Proceed with this as the next implementation batch.

This is now a narrow and tractable problem:

- logos are mostly good
- tiny icons need a micro-icon geometry-preservation route

