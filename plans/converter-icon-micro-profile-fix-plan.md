# PNG to SVG Icon Micro-Profile Fix Plan

## Goal

Fix the remaining `PNG -> SVG` shape distortion for tiny plain icons in `Icon` mode without regressing the now-improved `Logo` mode.

This plan is specifically for assets like:

- `alien-48px.png`
- `air-balloon-48px.png`
- small one-color symbols
- simple transparent app icons

It is **not** a general logo-color plan. Shell, KFC, and McDonald's already show that the `Logo` path is now directionally correct.

## Current Situation

### Working reasonably well now

- `Shell_logo.svg.png`
- `Kfc_logo.png`
- `McDonalds-logo-500x281.png`

These are behaving like logo assets:

- larger flat regions
- simple region boundaries
- color preservation is the main challenge

### Still off

- `alien-48px.png`
- `air-balloon-48px.png`
- similar tiny symbols with narrow gaps and interior cutouts

These are behaving like micro-icons:

- tiny geometry
- narrow negative spaces
- interior holes
- small proportion shifts become visually obvious

## Root Cause

The remaining issue is not that the converter needs a generic user-facing `Smoothness` control.

It is that tiny icons are still being traced with a configuration family that is too logo-oriented.

### What the current evidence suggests

- `Icon | Logo` was the right product split.
- The Node-backed path is the right architecture.
- The tiny icon route still simplifies shapes too aggressively.

### Why a generic `Smoothness` control is not the right first fix

VTracer-style tracing does not have one universal "make this smoother" knob.

The real geometry controls are a combination of:

- simplification mode
- corner threshold
- segment length threshold
- max iterations
- splice threshold
- path precision

For tiny icons, more smoothing can easily make the result worse by:

- rounding narrow cutouts
- shifting tiny features
- collapsing thin interior rails
- reshaping eyes, mouths, baskets, or similar details

So the right fix is a dedicated micro-icon tracing profile, not a new broad control.

## Design Decision

Keep:

- `Mode: Icon | Logo`
- `Preset: Auto | Compact | Exact`

Do not add a visible `Smoothness` control for now.

Instead:

- make `Icon` mode use a dedicated micro-icon profile internally
- keep preset differences in `Icon` mode small and safe

## Proposed Fix

### 1. Create a dedicated `micro-icon-binary` route family

In practice this can remain represented as:

- `tiny-line-icon`
- `mono-mask`
- `single-color-mark`

But they should be treated as one internal family with stricter shape-preservation rules.

Key rule:

`Icon` mode should optimize for geometry fidelity first, not elegance of curves.

### 2. Use a stricter binary mask before tracing

For tiny icons:

- favor alpha-driven masks where possible
- avoid color-region interpretation
- prefer a clean binary foreground/background mask before the trace engine runs

This is especially important for:

- white-on-transparent icons
- white-on-dark micro symbols

### 3. Increase micro-icon upscale before trace

Current upscaling for tiny icons improved things, but the remaining misses suggest the engine still does not have enough resolution to preserve tiny cutouts faithfully.

Test:

- `6x` upscale
- `8x` upscale

with nearest-neighbor or non-smoothed upscaling before binary trace.

### 4. Change the tiny-icon simplification profile

The current tiny-icon profile is still too spline-oriented.

Investigate switching tiny-icon tracing toward:

- `polygon` mode, or
- a less spline-heavy configuration

Then tune:

- lower `lengthThreshold`
- lower `spliceThreshold`
- lower `filterSpeckle`
- higher `pathPrecision`
- fewer destructive smoothing passes

Important principle:

For micro-icons, a slightly more mechanical outline is acceptable if the shape is more faithful.

### 5. Minimize preset divergence inside `Icon` mode

For tiny icons:

- `Auto` should already be fidelity-first
- `Compact` should save size carefully, not destroy shape
- `Exact` can preserve even more detail, but should not dramatically reshape the icon

Preset differences should be much smaller in `Icon` mode than in `Logo` mode.

### 6. Add artifact inspection for failing icon classes

If a tiny icon still looks wrong after the config changes:

- inspect the emitted SVG path output for that icon class directly
- compare:
  - mask input
  - traced SVG
  - final cleaned SVG

This prevents more blind tuning.

## Implementation Steps

### Step 1. Tighten `Icon` route preprocessing in the frontend

In:

- [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js)

Adjust:

- micro-icon mask generation
- alpha-first handling
- tiny-icon upscale factor

### Step 2. Retune the tiny-icon service config

In:

- [service.mjs](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/tools/converter-proof-service/service.mjs)

Update:

- `tiny-line-icon`
- `mono-mask`
- possibly `single-color-mark` when used from `Icon` mode

Focus on:

- lower destructive simplification
- better corner retention
- better small-gap preservation

### Step 3. Keep `Logo` mode unchanged unless regression is found

Do not re-open the KFC / Shell / McDonald's route unnecessarily.

The point of this plan is to isolate the remaining icon issue, not restart the whole converter.

### Step 4. Benchmark against the known failing icons

Primary benchmark set:

- `alien-48px.png`
- `air-balloon-48px.png`

Secondary sanity set:

- `Shell_logo.svg.png`
- `Kfc_logo.png`
- `McDonalds-logo-500x281.png`

## Acceptance Criteria

### Alien

- outer head contour remains balanced
- both eyes stay correctly shaped
- mouth/inner feature stays centered
- no lopsided or collapsed cutouts

### Air balloon

- balloon silhouette remains round and proportionate
- interior vertical rails remain distinct
- basket remains separated and correctly sized
- no merged or drifted negative spaces

### Non-regression

- Shell still preserves red and yellow correctly
- KFC still keeps black text and correct red bars
- McDonald's still preserves arches instead of collapsing to a tile block

## Rollout Recommendation

### Phase 1

Implement the internal micro-icon profile only.

### Phase 2

Retest the tiny icons manually.

### Phase 3

Only if still needed, consider a future advanced control like:

- `Edge Style: Crisp | Smooth`

But only after the default `Icon` mode is already reliable.

## Non-Goals

This plan does not:

- add a generic `Smoothness` slider
- change the visible `Icon | Logo` UI
- re-open the broad browser-vs-Node architecture question
- attempt to support arbitrary raster images

## Recommendation

Proceed with a dedicated `Icon` micro-profile fix, not a general smoothing control.

That is the shortest path to improving the remaining icon failures while protecting the progress already made on logo assets.
