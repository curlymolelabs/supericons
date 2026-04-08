# Converter Mono Route Parity Fix Plan

## Problem

The current `PNG -> SVG` smoke test exposed two real quality gaps on screenshot-derived logo traces:

1. the traced SVG includes an unwanted dark outline
2. `Simple`, `Balanced`, and `Detailed` all produce effectively the same result

For users, that means:

- the output does not match the uploaded mark closely enough
- the presets do not feel trustworthy
- the converter appears to ignore user controls on simple logo/icon cases

## Root Cause

### 1. Unwanted black outline

The browser-safe mono tracer (`vectortracer`) only exposes:

- `pathFill`
- `backgroundColor`
- generic attributes
- geometry parameters

It does **not** expose a `pathStroke` or `strokeWidth` option in its JS API.

So the mono route currently returns SVG paths that still carry a default stroke, which shows up as the dark outline in the output.

### 2. Preset collapse on mono exact traces

The current auto-routing correctly detects a screenshot-derived single-color mark and switches it into the mono exact route.

But the preset mapping inside `buildConverterMonoEngineConfig()` is still too narrow:

- `Simple`
- `Balanced`
- `Detailed`

all converge to nearly the same geometry for a clean logo like Starbucks.

That is why:

- the file size stays the same
- the path count stays the same
- the preview looks the same

## Fix Goal

Make the mono exact route behave like a polished icon/logo converter:

- no unwanted black outline
- clearer preset differences
- cleaner user understanding when auto-routing takes over

## Proposed Fix

## Phase 1: Remove Mono Route Stroke Artifacts

Add a structural cleanup pass after mono tracing and before final artifact creation.

### Implementation

- add a dedicated helper such as `stripConverterMonoStroke(svgStr)`
- parse the SVG with `DOMParser`
- target mono-route shapes only
- remove:
  - `stroke`
  - `stroke-width`
  - `stroke-linecap`
  - `stroke-linejoin`
  - `vector-effect`
- preserve:
  - `fill`
  - `viewBox`
  - output dimensions

### Why post-process instead of config

Because the current `vectortracer` browser API does not expose stroke controls, post-processing is the narrowest safe fix.

### Expected result

- the dark outline disappears
- the traced logo reads as fill-only vector artwork
- the output is visually closer to the original screenshot/logo

## Phase 2: Make Mono Presets Meaningfully Different

Retune the mono route so `Simple`, `Balanced`, and `Detailed` produce visibly different outcomes.

### Target behavior

#### `Simple`

- most aggressive simplification
- lowest precision
- strongest speckle cleanup
- fewer corner details preserved
- smallest or near-smallest file size

#### `Balanced`

- clean default for most logos/icons
- moderate simplification
- moderate precision
- smoother curves without overfitting

#### `Detailed`

- highest fidelity
- more corner retention
- less aggressive cleanup
- higher path precision
- allowed to keep more detail when the source justifies it

### Concrete tuning direction

Retune `buildConverterMonoEngineConfig()` more aggressively across:

- `mode`
- `cornerThreshold`
- `lengthThreshold`
- `maxIterations`
- `spliceThreshold`
- `filterSpeckle`
- `pathPrecision`

### Important rule

Do not tune these so far apart that `Detailed` starts reintroducing noisy screenshot edge artifacts.

The goal is:

- visible difference
- still icon/logo appropriate

not:

- wildly different geometry for the same clean mark

## Phase 3: Clarify Auto-Routing Behavior

When a color image is auto-routed into the mono exact path:

- keep the existing info note
- refine it so users understand that the converter chose a cleaner exact route for this image

### Possible wording

`This image looked like a single-color mark, so Supericons used an exact logo trace automatically. Presets still control how tightly the shape is simplified.`

### Why this matters

Right now the user can reasonably assume:

- the app ignored the preset

when what is really happening is:

- the app auto-switched engines and the preset differences are too small

## Phase 4: Verification

## Smoke test set

### Case 1: screenshot-derived single-color logo

Use the Starbucks screenshot again.

Expected after the fix:

- no black outline
- output looks closer to the source
- `Simple`, `Balanced`, and `Detailed` are not identical
- at least one of:
  - file size differs
  - path count differs
  - visible curve/detail changes exist

### Case 2: simple monochrome icon

Expected:

- no dark outline
- presets show a meaningful fidelity gradient

### Case 3: screenshot-heavy / UI-heavy image

Expected:

- mono route either does not win, or falls back safely
- warning/hint behavior still works

## Exit Criteria

This fix is done when:

- mono exact outputs no longer carry the dark stroke artifact
- preset differences are visible on appropriate mono/logo traces
- auto-routed logo traces feel intentional rather than confusing
- no regression is introduced to fallback behavior or output download/copy flows

## Out of Scope

This fix does **not** include:

- full color-engine replacement
- worker architecture
- control-model redesign

Those remain part of the larger roadmap in:

[converter-png-to-svg-full-roadmap.md](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs/converter-png-to-svg-full-roadmap.md)
