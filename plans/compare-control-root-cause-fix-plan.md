# Compare Control Root-Cause Fix Plan

## Objective

Fix the icon-card compare control so it:

- reads as visually centered above the main icon
- has intentional, stable spacing from the main icon
- remains consistent across font icons and SVG icons
- does not depend on fragile absolute-position offsets

This plan addresses the current issue where the compare button still appears off-center even after CSS offset adjustments.

---

## Audit Findings

### 1. The compare button box is already mathematically centered

Live browser inspection of the current built app shows:

- the compare button box center aligns with the icon container center
- the inner glyph box aligns with the button center
- the vertical gap is currently about `10px`

So the remaining problem is **not** a simple left/right CSS offset bug.

### 2. The control still looks off because it uses a separate positioning system

The main icon and the compare button are not laid out together:

- the main icon is centered by the card’s flex column layout
- the compare button is absolutely positioned on top of that layout

This means the control is visually associated with the icon, but technically positioned against the card box, not the icon block. Even when the numbers line up, it can still feel detached or misaligned.

### 3. The `compare_arrows` font glyph is the main optical culprit

The compare control currently uses a Material Symbols font glyph in [main.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/main.js):

- `compare_arrows` is centered by font metrics, not by visible stroke mass
- at `14px` inside a `22px` button, its ink appears optically off-center
- this makes the control still look wrong even when the button itself is centered

In short: the box is centered, but the **glyph design** is what still reads as off.

### 4. The spacing model is still fragile

The current gap depends on:

- top padding reserved inside `.icon-cell`
- an absolutely positioned compare button with a negative top offset

That works for one tuned state, but it is brittle across:

- different card widths
- hover vs selected states
- font vs SVG icon cells
- future control changes

---

## Root Cause Summary

The issue is structural, not just positional.

The compare control still looks misaligned because:

1. it is absolutely positioned instead of sharing the icon’s layout flow
2. it uses a small font glyph whose visible strokes are optically off-center

This is why repeated `top`, `left`, or `margin` tweaks do not reliably solve the problem.

---

## Recommended Fix

### Recommendation A: Move the compare control into a real centered control row

Refactor the card markup so the compare button sits in a dedicated row above the icon, instead of floating absolutely.

Proposed structure:

```html
<div class="icon-cell">
  <div class="icon-cell__controls">
    <button class="icon-cell__compare">...</button>
  </div>
  <div class="icon-cell__icon">...</div>
  <span class="icon-cell__name">...</span>
</div>
```

Benefits:

- compare and icon share the same alignment system
- spacing becomes a normal layout gap instead of a top-offset hack
- centering becomes deterministic and easier to maintain

### Recommendation B: Replace the compare font glyph with a small inline SVG

Do not keep relying on `compare_arrows` as a font icon inside the small card button.

Use either:

- a tiny inline SVG compare mark
- or a custom two-arrow icon rendered as inline SVG paths

Benefits:

- no font sidebearing issues
- precise optical centering
- consistent rendering across browsers and DPIs

This is the strongest fix for the “still looks off-center” complaint.

### Recommendation C: Use layout spacing, not positional spacing

Once the control is moved into flow:

- give `.icon-cell__controls` a fixed height
- center the compare button within that row
- use a small layout gap like `6px` to `8px` between controls row and icon

This will make the spacing stable and easy to tune.

---

## Proposed Implementation

### Phase 1: Markup Refactor

Update [main.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/main.js) in `renderIconCell()`:

- wrap the compare button in `.icon-cell__controls`
- place `.icon-cell__controls` before `.icon-cell__icon`
- remove the need for absolute top-centering logic on `.icon-cell__compare`

### Phase 2: Replace the Compare Glyph

In [main.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/main.js):

- replace the current Material Symbols compare glyph
- render a small inline SVG inside the compare button

Suggested characteristics:

- `12px` to `14px` viewport
- symmetrical left/right arrows
- stroke-based or simplified line icon
- centered within a `22px` square button

### Phase 3: CSS Cleanup

Update [style.css](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/style.css):

- remove absolute positioning from `.icon-cell__compare`
- add `.icon-cell__controls`
- define fixed control-row height
- center compare button with flexbox
- tune the vertical gap between control row and icon
- preserve hover-only visibility behavior using opacity only, not position

Recommended shape:

- `.icon-cell__controls { height: 22px; display:flex; justify-content:center; align-items:center; }`
- `.icon-cell__compare { position: static; }`
- `.icon-cell { gap: 6px; }`

### Phase 4: Interaction Preservation

Ensure behavior remains unchanged:

- compare still appears on hover
- compare still works in selected cards
- compare still works in multi-select mode
- no regression to grid height, card click target, or compare drawer

---

## Why This Is Better Than More Offset Tweaks

This fix addresses the actual causes:

- structure: compare shares the same layout system as the icon
- optics: compare uses a truly centerable SVG instead of a font glyph

It avoids continuing the current loop of:

- move button left/right a few pixels
- reduce gap
- still feel visually off

---

## Verification Plan

### Code Checks

- `node --check main.js`
- `node --check store.js`
- `npm run build`

### Browser Checks

Verify in the built app:

- compare button is visually centered above the icon on regular cards
- compare button remains centered on the previously problematic `ACCESSIBLE...` card
- gap between compare and icon looks intentional on both desktop and narrow widths
- compare still appears on hover and still opens the compare drawer
- selected-state cards do not shift the control off center
- both Material font icons and SVG icon libraries render correctly

### Regression Checks

Also spot-check:

- list view icon cells
- multi-select state
- hover state
- theme-light mode

---

## Risks

### Risk 1: Card height changes slightly

Moving the compare control into normal layout flow may slightly change card height or icon placement.

Mitigation:

- keep the control row compact
- verify grid density after implementation

### Risk 2: Hover behavior feels too jumpy

If the compare row is opacity-hidden but always reserves space, the card will remain visually stable. This is preferred over hidden controls that change layout on hover.

### Risk 3: Inline SVG styling may differ from existing icon fonts

Mitigation:

- inherit current button color from CSS
- use `currentColor` in the SVG

---

## Recommendation

Proceed with the structural refactor, not another positional tweak.

The best implementation is:

1. move compare into a centered control row
2. replace the font-based compare glyph with inline SVG
3. tune spacing with normal layout gaps

That should resolve both complaints at once:

- the compare control will actually look centered
- the gap will be easier to tune and keep consistent
