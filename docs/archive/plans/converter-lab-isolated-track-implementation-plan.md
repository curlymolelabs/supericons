Date: April 13, 2026
Status: Proposed
Scope: Isolated experimental browser converter track

Depends on:
- [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js)
- [commands.md](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/commands.md)
- [converter-workflow.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/mcp/runtime/converter-workflow.js)
- [converter.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/mcp/converter.js)
- [converter-quality-fixture-matrix-implementation-plan.md](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs/plans/converter-quality-fixture-matrix-implementation-plan.md)

## Objective

Create a separate `converter-lab` experience for browser-based converter experimentation so we can explore better conversion quality and stronger UX without risking regressions in the current Supericons converter.

This track is intentionally defensive.

The existing `converter` view remains the stable production baseline.
The lab exists to test ideas, compare outputs, and prove value before any changes are promoted into the live browser converter.

## Decision Summary

The current browser converter is already good enough that it should not be treated as an open-ended refactor target.

The safer product move is:

1. freeze the current `converter` view as the baseline
2. build a separate `converter-lab` route
3. use the lab to compare stronger conversion paths and UX ideas
4. promote only proven improvements later

This keeps experimentation reversible.

## Why This Track Exists

Three things are true at the same time:

1. The current browser converter is working and should not regress.
2. The MCP-side converter runtime is now stronger in structure, guidance, and verification.
3. We do not yet have enough side-by-side evidence to claim that a new browser converter path is visually better for real assets.

That means the next correct move is not to rewrite the production converter in place.

It is to create an isolated proving ground.

## Product Principles

### 1. Stable converter is sacred

The current `/?view=converter` experience should keep:

- its current route
- its current state behavior
- its current export behavior
- its current entitlement checks
- its current proof-service flow

No lab work should silently change stable converter behavior.

### 2. Experimental work must be visibly separate

The lab should be a distinct route, label, and state container.

Recommended route:

- `/?view=converter-lab`

Recommended user framing:

- experimental
- comparison-oriented
- not the default converter entry point

### 3. Promotion requires evidence

The lab is not automatically the future of the production converter.

A lab change should only be promoted if it proves better on real assets by:

- visual comparison
- output sanity
- repeated fixture checks
- practical UX value

## In Scope

### Phase 1

1. Add a new isolated route:
   - `converter-lab`
2. Add a separate render function and state object for the lab.
3. Copy the current converter UI as the starting baseline for the lab.
4. Keep the stable converter untouched except for minimal routing or navigation hooks if needed.
5. Add explicit lab labeling in the UI.
6. Ensure the lab can run the same local proof-service workflow already described in [commands.md](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/commands.md).

### Phase 2

1. Add lab-only comparison helpers.
2. Add space for alternate conversion strategies or settings bundles.
3. Use real assets to compare:
   - browser stable converter
   - browser lab converter
   - MCP-side runtime output when relevant

### Phase 3

1. Decide whether any lab improvement deserves promotion.
2. Promote only narrow proven wins.
3. Keep unproven ideas in the lab.

## Out of Scope

- replacing the current `converter` route
- deleting the current converter implementation
- changing MCP contracts as part of this initial lab slice
- building a hosted converter backend
- promising that the lab is immediately better than the production converter
- migrating existing user settings into the lab

## Chosen Technical Approach

### Route strategy

Add a new view key in the same style as existing app views:

- `converter-lab`

This should behave like an internal product experiment, not a docs-only mockup.

### State isolation

Do not reuse `converterState` directly for the lab.

Create a separate lab state object such as:

- `converterLabState`

This prevents:

- leaked settings between stable and lab
- shared reset behavior
- accidental behavioral coupling

### UI strategy

Start by cloning the current converter interface into a lab-specific renderer.

Recommended pattern:

1. copy the current converter render and control wiring into lab-specific functions
2. rename ids and handlers to lab-specific names
3. keep the initial lab behavior intentionally close to the baseline
4. only then add improvements in controlled steps

This is safer than trying to parameterize the current production converter immediately.

### Runtime strategy

The lab may experiment with stronger conversion logic, but it should do so behind the lab boundary only.

Possible experimental paths include:

- different proof-service settings
- different trace presets
- different recommendation defaults
- a browser-to-proof-service path that more closely mirrors the MCP runtime assumptions

The first lab slice does not need to solve all of those.
It only needs the boundary and a realistic comparison surface.

## Files Likely To Change

### Initial implementation

- [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js)
- optionally [docs-pages.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs-pages.js) if we add docs or internal links to the lab
- optionally [commands.md](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/commands.md) if the lab needs explicit run instructions

### Possible follow-up support files

- a dedicated lab comparison script under `scripts/`
- a lab notes or evaluation report under `docs/`

## Execution Plan

### Step 1: Add the route without changing converter behavior

1. Add `converter-lab` to the allowed direct views.
2. Add rendering and teardown handling for the lab view.
3. Do not change existing `converter` routing logic except where required to recognize the new view.

Success condition:

- `/?view=converter` still behaves exactly as before
- `/?view=converter-lab` loads independently

### Step 2: Clone the current converter into the lab

1. Create lab-specific renderer and control functions.
2. Create a dedicated lab state object.
3. Use separate DOM ids and event wiring.
4. Keep the first lab render visually familiar so comparisons are fair.

Success condition:

- both views can be opened independently
- interactions in one do not mutate the other

### Step 3: Add explicit experimental framing

1. Add a lab badge or eyebrow.
2. Add a short note that the stable converter remains the default production workflow.
3. Make it obvious that the lab exists for testing and comparison.

Success condition:

- users can tell which surface is stable and which is experimental

### Step 4: Add comparison instrumentation

The lab should make it easier to compare results, not just run them.

Minimum useful comparison support:

1. export the lab result cleanly
2. expose the exact settings path used
3. optionally show a short result summary:
   - route used
   - preset/settings used
   - output size

Success condition:

- a user can compare stable converter output against lab output without guesswork

### Step 5: Evaluate on real assets before any promotion

Use assets like:

- [converted_logo.svg](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/brand/converted_logo.svg)
- [logo_128x128.png](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/brand/logo_128x128.png)

Compare:

1. stable browser converter
2. lab browser converter
3. MCP-side outputs when relevant

Judge on:

- shape fidelity
- edge smoothness
- path simplicity
- color preservation
- practical export usefulness

Success condition:

- promotion decisions are based on evidence, not intuition

## Verification Gates

This track should not be considered complete until all of these are true:

### Gate A: Stable converter non-regression

1. `/?view=converter` still loads
2. SVG to PNG still works
3. PNG to SVG still works
4. current proof-service guidance still works
5. no new console or runtime errors are introduced

### Gate B: Lab isolation

1. `/?view=converter-lab` loads independently
2. lab settings do not leak into stable converter
3. stable settings do not leak into lab
4. opening one view does not break the other

### Gate C: Comparison usefulness

1. the lab produces output files
2. the lab makes route/settings differences visible enough to compare
3. at least one real-asset comparison can be completed end to end

## Risks

### 1. Copy drift

Cloning the current converter into a lab creates duplication risk.

That is acceptable for this experimental phase because safety is more important than elegance.

If the lab eventually proves out, we can refactor shared pieces later.

### 2. False confidence

The lab may feel more sophisticated without actually producing better output.

That is why the plan requires side-by-side asset comparison before promotion.

### 3. Hidden stable regressions

The most important risk is unintentionally breaking the live converter while adding the lab route.

That is why the first verification gate is explicit stable non-regression.

## Promotion Rules

Nothing should graduate from lab to stable converter unless it meets all of these:

1. better output on real assets
2. no clear UX tradeoff that makes normal use worse
3. no new dependency or runtime fragility that outweighs the gain
4. easy rollback path

If a lab idea does not meet those conditions, it stays in the lab.

## Bottom Line

This plan makes one promise:

"We can explore a stronger browser converter without gambling with the converter that already works."

That is the right next move for this product surface.
