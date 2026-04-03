## Motion Lab Replace `Fade` with `Drift In` Plan

### Goal
Replace the duplicate `Fade` entrance preset with a new `Drift In` entrance preset so the Motion Lab entrances section offers more distinct value.

### Problem Summary
In Motion Lab, the entrances section currently contains both:

- `Fade`
- `Fade In`

At the preset-definition level, they are functionally identical in [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js):

- both animate `opacity` from `0` to `1`
- both use `ease-in-out`

So one button is effectively wasting space and creating false choice.

### Product Decision
Keep `Fade In` as the canonical simple opacity entrance, and replace `Fade` with `Drift In`.

Why `Drift In`:

- it is immediately distinct from `Fade In`
- it complements `Slide Up` without feeling redundant
- it should work well on both outline icons and Material-style filled glyphs
- it avoids introducing a more fragile filter-heavy preset unless we explicitly want that later

### Desired Motion Behavior
`Drift In` should feel like a soft atmospheric entrance rather than a strong directional slide.

Recommended behavior:

- starts slightly offset on one axis or a shallow diagonal
- starts faded out
- eases into final position cleanly
- avoids dramatic overshoot

Suggested character:

- small translation distance
- opacity ramp from `0` to `1`
- smooth, premium motion

### Implementation Steps

1. Update the Motion Lab entrances button label in the template block in [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js):
   - change the existing `Fade` button to `Drift In`
   - keep its position in the entrances group
   - change `data-preset` from `fade` to `driftIn`
   - optionally choose a better icon if needed, but this is secondary

2. Replace the old duplicate `fade` preset definition in [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js):
   - remove the duplicate plain fade behavior
   - add a new `driftIn` preset definition

3. Ensure the new preset works with existing Motion Lab systems:
   - preset click application
   - hover preview
   - export
   - intensity scaling
   - glyph-profile adaptation path

4. Update the keyword matching map for the AI/agent preset picker in [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js):
   - remove reliance on `fade` as the duplicate entrance slot
   - add `drift`, `drift in`, `float in`, `soft enter`, or similar mappings to `driftIn`

### Safety Constraints
- Do not change `Fade In`
- Do not alter exit `Fade Out`
- Do not reorder unrelated preset groups
- Keep the change scoped to the duplicated entrance slot and supporting preset wiring

### Verification

1. Open Motion Lab and confirm the entrances section shows:
   - `Drift In`
   - `Fade In`

2. Apply `Drift In` and confirm it is visually distinct from:
   - `Fade In`
   - `Slide Up`

3. Test on:
   - a regular outline icon
   - a Material Symbols filled glyph icon

4. Confirm:
   - hover preview works
   - click-to-apply works
   - export still works
   - no console errors appear

### Success Criteria
The user should feel there is one simple fade entrance and one separate soft-motion entrance, rather than two copies of the same effect.
