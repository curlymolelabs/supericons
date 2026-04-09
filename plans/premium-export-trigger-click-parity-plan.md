# Premium Export Trigger Click Parity Plan

## Goal
Replace the premium customize-panel export trigger option `Play once` with `Click` and make the premium export behavior match Motion Lab’s interaction model across every animated export interface.

## Product Decision
- Premium animated icon export should follow Motion Lab trigger semantics.
- Premium export trigger options become:
  - `Loop`
  - `Hover`
  - `Click`
- `Play once` is removed from the premium export trigger UI.

## Audit Summary

### Current premium trigger behavior
The premium customize panel still uses the older trigger model:
- [`store.js`](D:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L2416) shows:
  - `Loop`
  - `Hover`
  - `Play once`
- [`store.js`](D:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L1711) implements `once` by replacing `infinite` with `1`
- [`store.js`](D:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L1744) documents premium `playMode` as `loop | hover | once`

### Current Motion Lab behavior
Motion Lab already uses the desired model:
- [`store.js`](D:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L5338) exposes `Loop`, `Hover`, `Click`
- [`lib/motion-lab-workflow.js`](D:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/lib/motion-lab-workflow.js#L218) treats `click` as finite-run interaction playback
- [`lib/motion-lab-workflow.js`](D:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/lib/motion-lab-workflow.js#L222) uses `:active` and `.active` selectors for click semantics

### Shared export path that must change
All premium animated export interfaces depend on the same builder path:
- [`store.js`](D:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L2161) `buildPremiumAnimatedExportSvg(...)`
- which calls [`store.js`](D:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L1635) `buildAnimatedSvg(...)`

That means one correct fix at the builder level will flow into:
- `Download Animated SVG`
- `Copy Animated SVG`
- `Copy React`
- `Copy Base64`
- `Copy HTML`
- `Copy Vue`
- `Copy Svelte`

## Scope

### In scope
- Premium customize-panel trigger UI
- Premium export state model
- Shared premium animated SVG builder
- All premium animated export outputs
- Premium trigger help text / tooltip copy
- Premium docs/mockups/reference files that explicitly mention `Play once`

### Out of scope
- Motion Lab trigger model itself
- Free icon customize panel behavior
- Static SVG export
- PNG export behavior

## Required Behavior After Change

### Premium export trigger semantics
- `Loop`
  - animation runs continuously
- `Hover`
  - animation runs while the exported SVG is hovered
- `Click`
  - animation runs when the exported SVG is pressed via `:active`
  - animation can also be triggered by applying an `.active` class in code contexts

### Preview behavior
Keep premium preview behavior separate from export trigger behavior.

Current premium preview intentionally uses one-shot preview playback:
- [`store.js`](D:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L2060) `buildPremiumPreviewSvg()` always uses `'once'` for preview

Recommendation:
- preserve one-shot preview playback for the premium preview rail
- change only export trigger options and export payload semantics

Why:
- preview is a local authoring experience
- export trigger is output behavior
- these were already intentionally separated

## Implementation Plan

### 1. Update premium trigger state model
- Change the premium trigger domain from `loop | hover | once` to `loop | hover | click`
- Update [`store.js`](D:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L1744) comments/default documentation to reflect the new domain
- Confirm default remains `loop`

### 2. Update premium panel UI
- Replace the third premium trigger button label from `Play once` to `Click`
- Change its `data-prem-trigger` from `once` to `click`
- Keep the visual segmented control and active-state behavior unchanged

### 3. Update shared premium export builder
- Extend [`store.js`](D:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L1635) `buildAnimatedSvg(...)` to support a real `click` branch
- Introduce a click-target selector equivalent to Motion Lab semantics, scoped to the standalone premium SVG root:
  - root `:active`
  - root `.active`
- Preserve existing loop and hover behavior
- Remove the special `once` export rewrite path from premium export mode

### 4. Keep preview-only one-shot logic separate
- Do not repurpose premium preview playback to mean click
- Leave preview helper text/status as preview-specific, or rename if needed for clarity
- Confirm preview play button still triggers a single preview cycle without depending on export trigger choice

### 5. Propagate through all animated export interfaces
Because all of these source from `buildPremiumAnimatedExportSvg(...)`, verify parity for:
- Download Animated SVG
- Copy Animated SVG
- Copy React
- Copy Base64
- Copy HTML
- Copy Vue
- Copy Svelte

No format-specific branching should remain for trigger behavior.

### 6. Update tooltip/help copy
Update any premium panel helper copy so it matches the new trigger model.

This includes:
- the premium `Export trigger` info tooltip plan in [premium-export-trigger-info-tooltip-plan.md](D:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/plans/premium-export-trigger-info-tooltip-plan.md)

Recommended tooltip copy after the change:

`Sets how the exported animation starts. Loop: plays continuously. Hover: plays on mouse over. Click: plays when the icon is pressed or when an .active class is applied.`

### 7. Update docs and design references that are no longer truthful
Update current, user-facing or active planning/docs references that explicitly describe the premium trigger as `Play once` or `once`, especially:
- [premium-export-trigger-info-tooltip-plan.md](D:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/plans/premium-export-trigger-info-tooltip-plan.md)
- [premium-animated-panel-audit.md](D:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs/premium-animated-panel-audit.md)
- [light-mode-redesign-mockup.html](D:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs/light-mode-redesign-mockup.html)
- any current non-archive premium panel plans that still describe `Play once` as shipped behavior

Archive docs can be left alone unless they are still actively surfaced.

## Verification

### Code-level
- `node --check store.js`
- `npm run build`

### Behavior checks
For one premium icon with visible motion:
1. Select `Loop`
   - Download Animated SVG
   - verify root animation runs continuously
2. Select `Hover`
   - Copy Animated SVG
   - verify animation runs only on hover
3. Select `Click`
   - Copy Animated SVG
   - verify animation runs on `:active`
   - verify adding `.active` to the root also triggers playback in code contexts

### Export interface parity checks
Using the same icon and trigger setting:
- React snippet contains the same animated SVG payload as direct animated SVG copy
- HTML snippet contains the same click-capable payload
- Vue and Svelte snippets preserve click-capable payload
- Base64 decodes to the same trigger-aware SVG

### Regression checks
- Premium preview play button still works
- Reset still returns export trigger to default `Loop`
- Static SVG copy remains static
- PNG export remains unaffected

## Risk Notes
- Low risk if the change is isolated to premium export UI/state and `buildAnimatedSvg(...)`
- Main risk is selector rewriting for click mode in standalone exported SVGs
- Best mitigation is to mirror Motion Lab’s click semantics conceptually:
  - finite run count
  - `:active`
  - `.active` escape hatch for framework users

## Recommended Sequence
1. Change shared trigger domain and builder behavior
2. Change premium UI labels/state
3. Update tooltip/help copy
4. Verify every animated export format
5. Refresh docs/mockups that still mention `Play once`
