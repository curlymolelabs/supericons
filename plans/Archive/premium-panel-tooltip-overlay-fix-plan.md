# Premium Panel Tooltip Overlay Fix Plan

## Goal
Make premium customize-panel tooltips render above the icon swatches and surrounding controls so labels like `Default` are fully readable and never get covered by neighboring color dots.

## Audit Summary

### Confirmed behavior
- In the premium customize panel, the color palette tooltip can be visually overlapped by nearby color dots when the swatch row wraps.
- The screenshot shows the tooltip appearing under adjacent swatches instead of floating above them.

### Root cause
The premium panel is using the generic pseudo-element tooltip system:
- [`style.css`](D:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/style.css#L3950) defines tooltips through `[data-tip]::after`
- That tooltip is absolutely positioned with `z-index: 500`
- Premium color controls use wrapped inline swatches in [`style.css`](D:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/style.css#L2684) via `.customize-color-palette { flex-wrap: wrap; }`
- Premium swatches themselves do not raise the hovered element above sibling swatches, so the pseudo-tooltip can be painted under adjacent items in the same layout flow

There is also a secondary risk from panel clipping:
- [`style.css`](D:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/style.css#L1517) and [`style.css`](D:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/style.css#L1767) show the customize panel and panel body use scroll containers
- pseudo-element tooltips inside scroll/overflow contexts are generally more fragile than DOM-based overlays

### Relevant precedent already in the codebase
Motion Lab already solved this class of problem with a DOM tooltip rendered outside the clipped local container:
- comment and implementation begin around [`store.js`](D:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L6899)
- styles live around [`style.css`](D:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/style.css#L7871)

## Fix Strategy

### Preferred fix
Use a DOM-based tooltip for the premium customize panel controls instead of relying on the shared `[data-tip]::after` pseudo-element there.

Why this is the safest long-term fix:
- avoids sibling paint-order overlap entirely
- avoids scroll-container clipping issues
- matches the working Motion Lab pattern already proven in this repo
- limits the change to the premium panel instead of risking regressions in every tooltip site across the app

## Implementation Plan

### 1. Scope the fix to premium panel controls
- Target premium panel controls that currently use `data-tip`, especially:
  - preview play button
  - premium color swatches
  - custom color add button
  - reset button
- Do not change the global tooltip behavior for the rest of the app in the first pass

### 2. Add a premium-panel DOM tooltip layer
- Create a single tooltip element attached to `document.body`, similar to the Motion Lab tooltip pattern
- Position it from the hovered premium control’s `getBoundingClientRect()`
- Keep it above the UI with a dedicated high z-index
- Use the existing tooltip visual language so it still feels like Supericons

### 3. Suppress pseudo-tooltips inside the premium panel
- Disable `[data-tip]::after` specifically within the premium panel scope so both tooltip systems do not render at once
- Keep the global pseudo-tooltip system unchanged elsewhere

### 4. Wire premium-panel hover/focus events
- Add delegated handlers in the premium panel event wiring so tooltip behavior survives rerenders
- Support:
  - mouse hover
  - keyboard focus
  - blur / mouseleave cleanup
- Ensure tooltip content comes from the existing `data-tip` value, so markup changes stay minimal

### 5. Verify stacking and clipping behavior
- Confirm tooltips overlay:
  - wrapped color swatches
  - slider controls
  - panel section boundaries
  - adjacent controls near the right panel edge
- Confirm no duplicate tooltip appears

## Fallback Option
If we want the smallest possible CSS-only patch first:
- give hovered premium swatches a local elevated stacking order
- ensure the palette and swatches allow visible overflow

This may fix the immediate overlap, but it is less robust than the DOM-tooltip approach and still vulnerable to scroll-container clipping. So it should be treated as fallback, not preferred architecture.

## Verification
- `node --check store.js` if JS wiring is added there
- `npm run build`
- Manual checks:
  - hover `Default` swatch in premium panel
  - hover a custom hex swatch in the first row
  - hover a swatch when the palette wraps to two rows
  - confirm tooltip fully overlays nearby icons instead of sitting beneath them
  - keyboard-tab through premium controls and confirm focus tooltips behave correctly

## Risk Notes
- Low risk if scoped only to premium panel controls
- Medium risk if the global `[data-tip]` system is changed app-wide
- Best practice here is to localize the fix to the premium customize panel first, then consider later whether the shared tooltip system should be upgraded everywhere
