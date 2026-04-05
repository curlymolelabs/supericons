# PNG to SVG Icon / Logo Mode Implementation Plan

## Goal

Replace the old engine-oriented mode model with a user-facing semantic mode model:

- `Icon`
- `Logo`

This is meant to replace the old `Monochrome / Color` thinking with a mode split that matches the actual problem classes we found during testing.

## Why This Change Is Needed

The current PNG -> SVG work revealed that the main split is **not**:

- monochrome vs color

The real split is:

- tiny icons and symbols that need shape preservation
- raster logos and brand marks that need color-region preservation

That is why the same pipeline behaves differently across the assets we tested:

### Works relatively well now

- `Shell_logo.svg.png`
- `Kfc_logo.png`
- `McDonalds-logo-500x281.png`

These are logo-like assets:

- a few solid colors
- large flat regions
- foreground/background separation is the main challenge

### Still needs refinement

- `alien-48px.png`
- `air-balloon-48px.png`

These are icon-like assets:

- tiny symbols
- internal holes and narrow gaps
- geometry fidelity matters more than color separation

So the user-facing control should reflect the actual asset type, not the engine’s color model.

## Product Decision

Introduce two top-level modes in `PNG -> SVG`:

### `Icon`

For:

- tiny symbols
- simple app icons
- white-on-transparent icons
- one-color or mostly one-color small marks
- assets where exact silhouette and cutout preservation matter most

Primary goal:

- preserve shape, holes, gaps, and proportions

### `Logo`

For:

- raster logos
- flat brand marks
- multi-color badges
- icon tiles where the user wants the logo artwork preserved as shown

Primary goal:

- preserve flat color regions and overall brand appearance

## Why `Icon / Logo` Is Better Than `Monochrome / Color`

### `Monochrome / Color` is engine language

Users do not think:

- "my file is monochrome"
- "my file is color"

They think:

- "this is an icon"
- "this is a logo"

### `Icon / Logo` maps to different success criteria

For icons:

- edge and hole fidelity
- line gap preservation
- no weird simplification

For logos:

- stable foreground/background extraction
- correct brand colors
- clean shape boundaries

This is a much more honest product model.

## Proposed UI

### Keep

- `Mode`: `Icon | Logo`
- `Preset`: `Auto | Compact | Exact`
- `Background`
- `Compare`
- `Auto Crop`

### Remove

- `Color Mode`
- `Monochrome`
- `Threshold`
- `Smoothness`
- `Cleanup`
- `Enhance Small Icons`
- `Invert`

These should remain internal tuning decisions, not user-facing controls.

## User-Facing Behavior

### If `Icon` is selected

The system should:

- use the tiny-icon / symbol pipeline
- preserve narrow gaps and small internal holes
- prefer mask fidelity over region smoothing
- use stricter micro-icon configs in the Node proof service

Expected good targets:

- alien
- balloon
- simple white-on-transparent icons
- small one-color symbols

### If `Logo` is selected

The system should:

- use the flat-logo / logo-art pipeline
- preserve solid color regions
- handle multi-color brand marks
- tolerate some smoothing if overall logo fidelity improves

Expected good targets:

- Shell
- KFC
- McDonald's
- simple brand PNG logos

## Internal Mapping

The UI mode should map to internal route intent, not directly to one tracer flag.

### `Icon` mode maps to:

- `tiny-line-icon`
- `single-color-mark`
- `mono-mask`

The exact internal route can still be chosen automatically underneath, but it stays within the icon-oriented family.

### `Logo` mode maps to:

- `flat-logo-color`
- `tile-icon-color`
- `general-color`

Again, the app can still route internally, but within the logo-oriented family.

## Preset Behavior Within Each Mode

### In `Icon`

Preset differences should be small and safe.

- `Auto`: balanced icon preservation
- `Compact`: slightly smaller output, but still shape-safe
- `Exact`: highest geometry fidelity

Important rule:

`Compact` must not destroy tiny cutouts or silhouette accuracy just to save size.

### In `Logo`

Preset differences can be more meaningful.

- `Auto`: best default for most logo PNGs
- `Compact`: smaller file, acceptable simplification
- `Exact`: higher fidelity, larger output tolerated

Important rule:

`Exact` must not become worse than `Compact` by reintroducing anti-aliased baggage or outline noise.

## Implementation Steps

### Step 1. Add the new visible mode control

In:

- [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js)

Replace the old hidden `colorMode` assumptions with a visible semantic mode:

- `icon`
- `logo`

This is a UI and state-model change only.

### Step 2. Map `Icon / Logo` to internal trace families

Update routing so:

- `Icon` constrains routing to icon-oriented classes
- `Logo` constrains routing to logo-oriented classes

This still allows internal sub-routing, but removes irrelevant branches.

### Step 3. Update proof-service request contract

Send both:

- `uiMode`
- `traceClass`

to the Node service.

That way the service knows both:

- what the user intends
- what the profiler detected

### Step 4. Update service config tables

In:

- [service.mjs](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/tools/converter-proof-service/service.mjs)

Keep separate config families for:

- icon-oriented tracing
- logo-oriented tracing

Do not use one shared config table for everything.

### Step 5. Tune icon mode independently

Use the tiny-icon shape-preservation plan as the next refinement layer:

- [converter-tiny-icon-shape-preservation-plan.md](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/plans/converter-tiny-icon-shape-preservation-plan.md)

### Step 6. Tune logo mode independently

Keep current logo wins stable while fixing:

- KFC `Exact` overfitting
- any remaining outline baggage
- tile/background policy consistency

## Acceptance Criteria

### Icon Mode

#### Alien

- head outline preserved
- eyes remain correctly shaped
- mouth remains centered and proportional

#### Air balloon

- balloon silhouette preserved
- interior rails remain distinct
- basket remains proportionate

### Logo Mode

#### Shell

- red and yellow preserved
- no fake background block
- acceptable in `Auto` and `Exact`

#### KFC

- text stays black
- bars stay red
- cup outline does not gain extra fringe

#### McDonald's

- arches remain yellow
- red tile remains consistent with chosen logo behavior
- no solid block-only failure

## Rollout Recommendation

### Phase 1

Ship the UI change first:

- visible `Icon | Logo`
- keep existing presets
- keep current simplified control surface

### Phase 2

Route `Icon` and `Logo` into their own internal families.

### Phase 3

Tune `Icon` mode until the tiny plain-icon cases are launch-acceptable.

## Non-Goals

This plan does not attempt to make PNG -> SVG:

- a general-purpose raster-to-vector converter
- a photo tracer
- a screenshot vectorizer for arbitrary full-page images

It is specifically about making the converter understandable and reliable for the actual product scope:

- logos
- simple icons

## Recommendation

Proceed with this mode change.

It improves:

- product clarity
- control relevance
- internal routing discipline
- launch confidence

And it matches the evidence from the real benchmark assets we already tested.

