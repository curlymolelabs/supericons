# Proposal: Favorite Action in Customize Panel

Date: 2026-04-06
Owner: Frontend + Product
Status: Draft
Related:
- `plans/pro-banner-layout-and-favorites-followup-plan.md`

## Problem Statement

The current `Favorites` feature has two UX issues:

1. The sidebar destination exists, but the save action is easy to miss in the icon grid and is currently broken for first-time hover reveal on non-favorited icons.
2. The customize panel already has the clearest single-icon context in the product, but it does not currently offer a direct save action near the icon name and metadata.

That creates an unnecessary gap between:

- selecting an icon for inspection
- understanding what icon is selected
- saving that icon to `Favorites`

The proposal is to add a persistent favorite action inside the customize panel’s icon-info area so the user has an explicit, touch-friendly, keyboard-accessible way to save the current icon.

---

## Current State

The customize panel already has a natural home for this action:

1. `renderPanelForIcon()` builds a top metadata section with the icon name, library/type/id, and `Also in` pills in [main.js](/d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/main.js#L888).
2. That block currently uses inline layout styles rather than dedicated semantic classes, so it is ready for a small structural cleanup.
3. `attachCustomizeListeners()` already wires panel-local actions like color, palettes, and `Also in` pills in [main.js](/d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/main.js#L1532).
4. The underlying favorite model already exists through `toggleFavorite()`, sidebar counts, and the `Favorites` filter in [main.js](/d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/main.js#L278), [main.js](/d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/main.js#L309), and [main.js](/d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/main.js#L657).

This means the proposal does not require a new data model. It only needs a better surface.

---

## Proposed UX Direction

Add a favorite toggle to the customize panel’s top metadata block for single-icon mode.

### Placement

Put the control on the same row as the icon name:

1. left: icon name
2. right: favorite action
3. below: library, format, icon id
4. below that: `Also in` pills when available

This keeps the action close to the selected icon identity instead of hiding it in the preview canvas or deeper in the control stack.

### Recommended Control

Use a compact saved-state chip, not a bare icon-only button.

Recommended states:

1. default: `favorite_border Save`
2. active: `favorite Saved`

Why this is the preferred option:

1. It still satisfies the desire for a visible favorite icon.
2. The label removes ambiguity for first-time users.
3. It works better on touch and keyboard than a tiny icon-only affordance.
4. It gives clearer state feedback than a lone filled heart.

Counterproposal:

If product wants the lightest possible chrome, an icon-only circular heart button can work, but it is the weaker option for clarity and accessibility.

---

## Interaction Rules

### Single Icon Mode

When one icon is selected:

1. The panel shows the favorite chip in the icon-info block.
2. Clicking the chip toggles the same favorite state used by the grid.
3. The chip updates immediately between `Save` and `Saved`.
4. The sidebar `Favorites` count updates immediately.
5. If the icon is visible in the current grid, its grid heart state should stay in sync.

### Favorites View Edge Case

If the current active library is `favorites` and the user removes the selected icon from favorites inside the panel:

1. the grid should re-filter
2. the selected icon should not remain as a ghost selection if it no longer exists in the current result set
3. the panel should either:
   - clear back to placeholder state, or
   - move to the next available favorite if product wants that behavior later

Recommended behavior for now:

Clear back to placeholder state. It is simpler and less surprising.

### Batch Mode

Do not show this favorite control in multi-select/batch customize mode.

Reason:

1. favorites are currently a single-icon mental model
2. batch save introduces new product questions that are outside this proposal

### Placeholder and Locked States

Do not add the control to:

1. empty placeholder panel
2. locked premium placeholder panels
3. batch panels

This proposal is only for the standard single selected icon flow.

---

## Visual and Layout Proposal

### Structural Refactor

Replace the inline-styled metadata block with semantic classes such as:

1. `.panel__meta`
2. `.panel__meta-head`
3. `.panel__meta-copy`
4. `.panel__meta-title`
5. `.panel__meta-subtitle`
6. `.panel__favorite-btn`

### Visual Style

Recommended button style:

1. pill or rounded-rectangle chip
2. subtle surface background by default
3. orange-tinted active state when saved
4. inline heart icon plus short label
5. small enough to fit the panel width without crowding the title

### Responsive Behavior

At narrow panel widths:

1. allow the title and favorite chip row to wrap cleanly
2. preserve the icon name as the primary visual element
3. do not let the control overlap the subtitle or `Also in` pills

---

## Gate Results

### Usability Heuristics

- Proposed direction: Pass
- Rationale:
  - the action becomes visible in the highest-context area for the selected icon
  - the `Save`/`Saved` label reduces guesswork

### Accessibility Baseline

- Proposed direction: Pass, if implemented correctly
- Required:
  - real `button`
  - `aria-pressed`
  - clear accessible name such as `Save stack to favorites` / `Remove stack from favorites`
  - visible focus state

### Adaptive Quality

- Proposed direction: Pass
- Rationale:
  - the panel already stacks content vertically
  - a small chip is easier to fit here than another floating hover control in the grid

### Trust and Safety UX

- Proposed direction: Pass
- Rationale:
  - this is low-risk and reversible
  - the state change is immediate and understandable

### Consistency and Implementation Readiness

- Proposed direction: Pass
- Rationale:
  - the proposal uses the existing favorite state model
  - it fits the current panel architecture with a localized markup/style update

---

## Implementation Handoff Checklist

### [MODIFY] `main.js`

1. Refactor the single-icon info block in `renderPanelForIcon()` to use semantic panel-meta classes instead of inline layout styles.
2. Add a favorite toggle control to the top metadata block.
3. Derive the control state from `state.favorites.has(iconKey(icon))`.
4. In `attachCustomizeListeners()`, wire the panel favorite button to the existing `toggleFavorite()` logic.
5. Update the panel button label, icon, `title`, and `aria-pressed` after toggle.
6. If the current grid view is `favorites` and the selected icon is removed from favorites, clear the panel selection and re-run filtering.
7. Keep batch customize mode unchanged.

### [MODIFY] `style.css`

1. Add semantic styles for the new panel metadata block.
2. Add styles for the favorite chip in default, hover, focus, and active states.
3. Make the active state visually stronger than the default state.
4. Ensure the metadata row wraps cleanly at narrower widths.
5. Preserve spacing with the existing `Also in` pills and section divider rhythm.

### [KEEP] Existing Favorites Model

1. Keep `toggleFavorite()`
2. Keep localStorage persistence
3. Keep sidebar count updates
4. Keep the `Favorites` filtered view

This is a surface-level improvement, not a model rewrite.

---

## Acceptance Checks

1. Selecting a single icon shows a favorite action beside the icon name in the customize panel.
2. The control clearly reads as `Save` when the icon is not favorited and `Saved` when it is.
3. Clicking the control updates the sidebar `Favorites` count immediately.
4. The grid and panel stay visually in sync for the selected icon’s favorite state.
5. In `Favorites` view, removing the current icon from the panel does not leave a stale selected state behind.
6. The control is keyboard focusable and exposes the correct `aria-pressed` state.
7. The control fits without breaking the panel layout at compact widths.
8. Batch customize mode does not show the single-icon favorite control.

---

## Residual Risks

1. If the grid favorite hover bug remains unresolved, this panel action improves the selected-icon path but does not fully solve browse-first discoverability.
2. If the chip is too visually loud, it may compete with the icon name in a narrow panel.
3. If we later add account-synced favorites, the copy `Favorites stay on this device` would need to be revisited elsewhere.

---

## Recommendation

Proceed with the customize-panel favorite action as a **supplementary primary path** for saving a selected icon.

Important nuance:

1. This should not replace fixing the grid favorite reveal bug.
2. It should become the most explicit save affordance in the product for single-icon flows.
3. It is a strong fit for the current panel because that area already communicates icon identity, library, and related variants.

## Next Iteration Target

After this lands, evaluate whether the grid still needs:

1. a repaired hover/focus heart
2. a faint always-visible heart on touch and keyboard
3. a `No favorites yet` instructional empty state

Those remain valuable even if the panel action is added.
