Date: April 13, 2026
Status: Proposed
Scope: Lab-only post-trace normalization pipeline for PNG to SVG

Depends on:
- [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js)
- [converter-lab-isolated-track-implementation-plan.md](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs/plans/converter-lab-isolated-track-implementation-plan.md)
- [converter-quality-fixture-matrix-implementation-plan.md](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs/plans/converter-quality-fixture-matrix-implementation-plan.md)

## Objective

Improve the experimental browser converter by adding a lab-only post-trace normalization stage after raw PNG to SVG conversion.

This track does not try to win by more trace-route tuning.

It tries to win by cleaning the SVG that comes out of tracing so the result:

- follows the source image more closely
- drops obvious junk geometry
- keeps the main silhouette and intended cutouts
- avoids copying tiny outlier fragments that make the result feel less original

## Decision Summary

The current browser converter and the first lab experiment are not visibly different enough on real logos.

That result matters.

It tells us the next meaningful improvement is not another route-selection tweak.
It is a second-stage geometry cleanup pass.

The stable browser converter remains unchanged.
This pipeline exists only inside `converter-lab`.

## Why This Slice Is Next

The current differences between stable and lab mostly affect:

- trace route
- mono vs color preference
- preset bias
- proof-service quality mode

Those can help at the margin, but they do not fundamentally change the geometry that the tracer emits.

If the raw trace still contains:

- speckle fragments
- stair-step micro-zigzags
- awkward path density
- tiny accidental islands

then preset tuning alone will not create a strong visible upgrade.

## Product Rule

This normalization pass must remain lab-only until it proves better on real assets.

No stable converter behavior should change during this track.

## In Scope

### Phase 1

1. Add a lab-only normalization pipeline after raw PNG to SVG conversion.
2. Add one new lab strategy that runs:
   - trace
   - normalize
   - preview
3. Expose summary metadata so we can tell when normalization ran and what it changed.
4. Compare normalized output against:
   - stable browser converter
   - current lab baseline

### Phase 2

1. Tune thresholds on real logos and badges.
2. Prove that cleanup helps more often than it harms.
3. Decide whether any part is promotable.

## Out of Scope

- changing the stable `converter` route
- adding new MCP tools
- changing MCP contracts
- claiming mathematically perfect vector restoration
- inventing geometry not present in the source silhouette
- aggressive beautification that changes brand character

## Desired Output Behavior

The normalized SVG should be:

- cleaner than raw conversion
- not softer for the sake of softness
- not more decorative than the source
- not more generic than the source

The pipeline should preserve:

- the dominant outer silhouette
- major internal holes and cutouts
- intended brand asymmetry
- major shape relationships

The pipeline should reduce:

- tiny isolated fragments
- accidental speckles
- exaggerated staircase noise
- needless path density
- color-region fragmentation that does not help the result

## Chosen Technical Approach

Normalize after trace, not before.

Recommended order:

1. trace PNG to raw SVG
2. parse SVG geometry
3. run conservative cleanup passes
4. serialize normalized SVG
5. preview and compare

This is safer than making the tracer itself more aggressive because:

- the cleanup stage is inspectable
- thresholds are easier to tune
- rollback is simple
- we can compare raw versus normalized output directly

## Proposed Normalization Passes

### Pass 1: Remove tiny isolated paths

Drop path fragments whose area or bounding box is below a conservative threshold and which are not connected to larger geometry.

Use cases:

- raster speckles
- stray anti-alias fragments
- tiny detached dots that do not belong to the logo

Guardrail:

- never remove a small path if it is the only path in the file
- never remove a path that behaves like an intentional hole marker or critical accent

### Pass 2: Simplify path point density

Run a conservative path simplification pass on high-point paths to remove jitter while preserving the general outline.

Goal:

- smoother geometry
- fewer unnecessary points
- smaller output

Guardrail:

- keep tolerance low
- preserve corner structure where the source clearly wants sharp edges

### Pass 3: Smooth micro-zigzags only

Add a cleanup step aimed at pixel staircasing, not global rounding.

Goal:

- reduce tiny back-and-forth noise
- keep the silhouette honest

Guardrail:

- no blanket corner rounding
- no smoothing pass that changes large recognizable features

### Pass 4: Merge near-touching same-color fragments

Where the trace creates obviously broken-up same-color pieces separated by tiny gaps, allow a conservative merge.

Goal:

- cleaner fills
- fewer artificial seams

Guardrail:

- same-color only
- tiny-gap only
- skip if merge changes recognizable internal structure

### Pass 5: Preserve holes and major cutouts

Explicitly protect important negative space so cleanup does not over-fill shapes.

Examples:

- inner counters
- eyes
- ring holes
- shield cutouts

Guardrail:

- preserving important holes is more important than removing one more stray fragment

## Lab Strategy Design

Add a new lab-only strategy such as:

- `normalized cleanup`

This strategy should:

1. run the existing raw trace path
2. build a raw SVG artifact
3. run normalization
4. expose both:
   - normalized preview
   - summary of what changed

Recommended summary fields:

- normalization strategy key
- number of paths removed
- point-reduction estimate if available
- whether same-color merge ran
- warnings if cleanup was skipped due to risk

## Files Likely To Change

- [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js)
- optionally a new helper under `lib/` or `scripts/` if geometry utilities become too large for `store.js`
- optionally a lab evaluation note under `docs/`

## Execution Plan

### Step 1: Add the lab-only normalization strategy flag

1. Add a new strategy option inside `converter-lab`.
2. Keep stable converter and stable lab baseline untouched.

Success condition:

- users can switch between raw lab baseline and normalized lab output

### Step 2: Build the first conservative cleanup pass

Start with the highest-confidence cleanup only:

1. remove tiny isolated fragments
2. preserve larger dominant geometry

Success condition:

- obvious junk paths disappear without harming clean logos

### Step 3: Add low-tolerance simplification

Only after fragment removal is stable:

1. simplify dense paths conservatively
2. compare against raw output

Success condition:

- cleaner path structure without visible shape drift

### Step 4: Add lab summary metadata

Expose what normalization actually did.

Success condition:

- we can explain why one output looks better or worse

### Step 5: Evaluate on real assets

Use:

- clean logo marks
- wordmarks
- circular brand marks
- low-resolution colored badges
- one intentionally harder edge case

Judge on:

- silhouette fidelity
- cutout preservation
- color-region stability
- path cleanliness
- whether the result looks more original rather than more generic

## Verification Gates

This slice is complete only if all of these are true:

### Gate A: Stable non-regression

1. `/?view=converter` behaves exactly as before
2. stable browser exports still work
3. `npm run build` passes

### Gate B: Lab isolation

1. new normalization logic runs only in `converter-lab`
2. stable converter never uses the normalization path

### Gate C: Visual usefulness

1. on at least one real logo, normalized output is clearly cleaner than raw trace
2. on at least one already-good logo, normalization does not make the result worse

### Gate D: Honesty check

If normalization only makes output different, but not better, do not promote it.

## Risks

### 1. Over-cleaning

The cleanup pass may remove intentional small details.

Mitigation:

- conservative thresholds
- protect holes and major accents
- keep raw baseline available in the lab

### 2. Genericization

Too much smoothing can make logos feel less original.

Mitigation:

- no aggressive beautification
- prefer shape cleanup over style reinterpretation

### 3. Hidden complexity

Post-trace normalization can become a mini-vector editor if it grows unchecked.

Mitigation:

- start with one conservative pass
- add only the next pass that proves value

## Bottom Line

This track makes one specific promise:

"If the lab improves PNG to SVG meaningfully, it will be because the geometry was cleaned after tracing, not because we kept nudging presets and hoping for a miracle."
