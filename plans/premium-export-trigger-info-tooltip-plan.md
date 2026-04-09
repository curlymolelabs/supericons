# Premium Export Trigger Info Tooltip Plan

## Goal
Add an info icon beside the premium customize-panel `Export trigger` title and show a tooltip that explains what the trigger controls, using the same interaction model and tone already established in Motion Lab.

## Audit Summary

### Current premium panel state
- The premium customize panel renders the section title at [`store.js`](D:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L2413) as plain text:
  - `Export trigger`
- The three trigger choices are:
  - `Loop`
  - `Hover`
  - `Click`
- There is no explanatory affordance next to that label today.

### Existing pattern to mirror
- Motion Lab already uses an inline info icon beside its trigger label in [`store.js`](D:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L5338)
- Its current tooltip copy explains the trigger semantics in plain language
- The visual treatment is defined in [`style.css`](D:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/style.css#L8293)

### New enabling factor
- The premium panel now has its own scoped DOM tooltip overlay system, so this new info icon can use `data-tip` safely without the swatch-overlap issue
- That means we do not need a second tooltip implementation for this feature

## Proposed UX

### Label row
Replace the plain premium subtitle row with a compact label group:
- `Export trigger`
- inline info icon button or span

### Tooltip copy
Recommended copy:

`Sets how the exported animation behaves. Loop: plays continuously. Hover: plays when someone hovers the icon. Click: plays when the icon is pressed or when an .active class is applied.`

Why this wording:
- aligns with premium export behavior
- explains outcome, not implementation

## Implementation Plan

### 1. Update premium panel markup
- In the premium customize panel section, replace the standalone subtitle node with a small inline label row
- Add an info affordance beside `Export trigger`
- Feed the tooltip through `data-tip` so it uses the premium panel's DOM tooltip path

### 2. Reuse existing premium tooltip system
- Do not build a new tooltip system
- Let the new info icon participate in the premium-panel tooltip overlay that was just added
- Keep the tooltip scoped to the premium panel only

### 3. Add a small premium-panel info-icon style
- Either:
  - reuse the Motion Lab info-icon treatment if it fits visually, or
  - create a premium-panel-specific helper class with the same visual hierarchy
- The icon should read as secondary help, not compete with the title

### 4. Keep logic unchanged
- Do not change the meaning of:
  - `Loop`
  - `Hover`
  - `Click`
- This is an explanatory UX improvement only

## Verification
- `node --check store.js`
- `npm run build`
- Manual UI checks:
  - info icon appears inline beside `Export trigger`
  - tooltip opens above surrounding controls without clipping
  - tooltip copy matches premium trigger behavior exactly
  - no overlap with the reset button or segmented controls

## Risk Notes
- Low risk if kept to markup plus local styling
- Keep the tooltip aligned with the shipped premium trigger set so the premium panel and Motion Lab do not drift again
