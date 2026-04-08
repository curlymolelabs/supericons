## Motion Lab Button Title Removal Plan

### Goal
Remove the default browser tooltips that appear on Motion Lab animation buttons while preserving:

- the visible button labels
- button click and hover behavior
- keyboard accessibility

### Problem Summary
Motion Lab preset buttons currently use native HTML `title` attributes in the button markup inside [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js).

Because of that, browsers show their default tooltip bubbles on hover. These native tooltips feel noisy on the canvas and overlap with the actual UI.

### Root Cause
The following Motion Lab button groups render `title="..."` attributes directly:

- Motion presets
- Entrance presets
- Exit presets
- My Animations presets

This is a markup-level issue, not an animation-engine issue.

### Fix Strategy
Use the smallest safe fix:

1. Remove the `title` attributes from all `.ml__preset-btn` buttons in the Motion Lab template.
2. Keep the visible text labels exactly as they are.
3. Do not change `data-preset`, event handlers, or class names.
4. Do not introduce a custom tooltip system in this pass.

### Why This Is Safe
- Preset selection logic relies on `data-preset`, not `title`.
- The visible button text already communicates the action.
- Removing `title` only removes native browser hover text.

### Verification
After the change:

1. Open Motion Lab.
2. Hover over preset buttons on all four sections.
3. Confirm no native browser tooltip appears.
4. Click several presets and confirm they still apply correctly.
5. Keyboard-tab through a few buttons and confirm focus still works normally.

### Out of Scope
- Adding custom designed tooltips
- Renaming presets
- Changing layout, styling, or animation behavior
