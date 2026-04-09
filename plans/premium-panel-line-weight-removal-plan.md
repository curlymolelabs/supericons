# Premium Panel Line Weight Removal Plan

## Goal
Remove the `Line weight` control from the premium icon customize panel and restore premium preview/export behavior so premium animated collections no longer inherit free-icon stroke-width editing behavior.

## Audit Summary

### What the user is seeing
- Premium pack icons such as `status-feedback / eye` are showing a `Line weight` slider in the premium customize panel.
- That control should not exist in the premium pack flow.

### Root cause
This is not coming from the metadata sanitization work.

The issue comes from the premium customize-panel logic added in [store.js](D:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L1752):
- [store.js](D:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L1768) sets `supportsStrokeWidth` for premium icons.
- [store.js](D:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L1799) treats any premium SVG containing stroke attributes as stroke-width editable.
- [store.js](D:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L2435) conditionally renders the `Line weight` UI in the premium panel.
- [store.js](D:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L2175) rewrites premium SVG `stroke-width` values in the preview/export path.

Git history shows this behavior was introduced in the premium panel enhancement commit, not in the later sanitization commit.

## Desired Outcome
- Free icon customize panel keeps its line-weight control exactly as-is.
- Premium collection customize panel never shows a line-weight control.
- Premium preview and premium exports preserve each icon's authored stroke widths as shipped.
- No regressions to color, speed, trigger mode, static SVG export, animated SVG export, or purchase gating.

## Implementation Plan

### 1. Remove premium stroke-width customization from premium panel state
- Stop treating premium panel state as stroke-width editable.
- Remove or neutralize premium-only state fields whose only purpose is stroke editing:
  - `supportsStrokeWidth`
  - `defaultStrokeWidth`
  - premium stroke reset branches
- Keep the rest of premium state intact:
  - color
  - color mode
  - animation speed
  - play mode
  - preview state

### 2. Remove the premium `Line weight` UI block
- Delete the conditional `Line weight` control block from the premium panel renderer in [store.js](D:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L2435).
- Remove the premium stroke slider event binding and display updates.
- Keep the free icon panel line-weight UI in [main.js](D:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/main.js) unchanged.

### 3. Stop mutating premium SVG stroke widths in preview/export
- Remove premium-panel stroke-width rewrites from:
  - static premium preview builder
  - premium animated export builder inputs
  - premium reset logic
- Premium exports should use the authored stroke widths already present in the premium SVG/CSS payloads.

### 4. Keep scope isolated from Motion Lab and free icons
- Do not touch the free icon customize pipeline in [main.js](D:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/main.js).
- Do not touch Motion Lab’s separate stroke normalization heuristics for large-viewBox free SVGs in [store.js](D:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L5563).
- Do not change premium metadata sanitization/export sanitization logic.

### 5. Verification
- Syntax/build:
  - `node --check store.js`
  - `npm run build`
- Manual UI checks:
  - free icon with stroke support still shows line-weight control
  - premium icon no longer shows line-weight control
  - premium preview still animates
  - premium static SVG export still works
  - premium animated SVG export still works
  - outlined premium icons such as `eye` still render correctly without manual stroke editing

## Risk Notes
- Low risk to free icons if changes stay confined to `store.js` premium panel code.
- Moderate regression risk to premium outlined icons if any preview/export path still assumes `strokeWidth` exists after UI removal.
- The safest implementation is to remove the premium stroke-edit branch consistently from state, rendering, events, and export assembly together rather than only hiding the control visually.
