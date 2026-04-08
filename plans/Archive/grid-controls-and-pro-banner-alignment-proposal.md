# Proposal: Grid Controls and Pro Banner Alignment

Date: 2026-04-06
Owner: Frontend + Product
Status: Draft
Related:
- `plans/pro-banner-layout-and-favorites-followup-plan.md`
- `plans/customize-panel-favorite-action-proposal.md`

## Problem Statement

Three UI issues are now linked together:

1. The grid card heart and compare controls compete for the same corner and create click/hover friction.
2. The grid heart icons feel visually inconsistent, even when the underlying button boxes are aligned.
3. The Go Pro diamond icon shifts slightly in annual mode because the longer description wraps and re-centers the left cluster vertically.

The goal of this proposal is to simplify the icon-card controls, preserve a clear path to favorites, and stabilize the Pro banner layout.

---

## Current Audit Summary

### Issue 1: Heart and Compare now compete in the same zone

Current state:

1. The compare button remains the primary quick action on the icon card.
2. The favorite control was made visible on the card to compensate for the earlier favorites-discoverability problem.
3. In practice, both controls now occupy the same top-right interaction area and compete visually and spatially.

UX risk:

1. accidental clicks
2. hover ambiguity
3. reduced clarity about which quick action is primary

### Issue 2: Heart placement looks inconsistent

Current state:

1. The favorite button boxes are aligned consistently.
2. The visual inconsistency appears to come mostly from the icon glyph rendering inside the button, not different button positions per card.

UX risk:

1. the grid feels less polished
2. the inconsistent glyph placement makes the control feel unstable

### Issue 3: The Pro diamond icon drops in annual mode

Current state:

1. The annual description wraps to a second line.
2. The left cluster still aligns items vertically in a way that re-centers the diamond against a taller text block.

UX risk:

1. visual jitter when toggling Monthly -> Annual
2. the banner feels less intentional even though the copy is correct

---

## Decision Options

### Grid Card Controls

#### Option A: Compare only on the card

Behavior:

1. Remove the favorite action from the icon card.
2. Keep compare as the only quick card action.
3. Keep favorites accessible through:
   - the customize panel `Save` / `Saved` action
   - the sidebar `Favorites` destination

Pros:

1. cleanest grid
2. removes action overlap completely
3. makes compare the unambiguous card-level quick action
4. avoids the heart-placement polish problem entirely

Cons:

1. favorites are no longer a direct grid action
2. saved-state visibility in the grid becomes weaker unless we add a passive indicator later

Recommendation: preferred.

#### Option B: Keep both by splitting corners

Behavior:

1. Move compare to top-left
2. Keep favorite at top-right

Pros:

1. both actions remain directly available
2. avoids same-corner collision

Cons:

1. top-left is already visually adjacent to multi-select affordances and selection indicators
2. the card becomes busier
3. this creates more icon clutter in a dense grid

Recommendation: acceptable fallback, not preferred.

#### Option C: Keep both in a vertical stack

Behavior:

1. Stack compare and favorite vertically on the right edge

Pros:

1. preserves both actions
2. clearer than overlap

Cons:

1. the smallest cards become visually crowded
2. stacked controls compete with the icon artwork and label
3. heavier visual noise than the product probably wants

Recommendation: only if product explicitly wants both card actions.

---

## Proposed Product Direction

### Recommended Choice

Use Option A:

1. remove the heart action from the icon card
2. keep compare as the only quick grid action
3. keep the customize panel `Save` / `Saved` chip as the primary favorite action
4. keep the sidebar `Favorites` list as the retrieval surface

Why I recommend this:

1. The customize panel is already the highest-context place to save an icon.
2. Compare is the stronger candidate for the single quick action on the card.
3. Removing the card heart resolves both the overlap issue and the heart-placement inconsistency in one move.
4. This gives the grid a calmer, more intentional visual hierarchy.

Counterproposal:

If you decide later that saved-state visibility is still needed in the grid, add a passive saved indicator only for already-favorited icons, not an always-available heart action.

That would preserve recognition without reintroducing action competition.

### Pro Banner

Keep the current annual copy, but anchor the diamond icon to the top of the left cluster so it does not shift when the description wraps.

Preferred treatment:

1. top-align the left cluster for Pro
2. keep the diamond at a fixed visual start position
3. let only the text block grow downward

---

## Mockup Coverage

A visual mockup file is included at:

`docs/grid-controls-and-banner-alignment-mockup.html`

It compares:

1. compare-only cards
2. split-corner cards
3. stacked-action cards
4. centered vs top-aligned Pro banner icon behavior

The intent of the mockup is to validate the control density and banner alignment before applying the next production change.

---

## Gate Results

### Usability Heuristics

- Proposed direction: Pass
- Rationale:
  - one primary quick action per card is easier to understand
  - favorites remain available in the panel where the selected icon context is strongest

### Accessibility Baseline

- Proposed direction: Pass
- Rationale:
  - fewer competing small targets on the card
  - panel save action remains the clearer keyboard and touch target

### Adaptive Quality

- Proposed direction: Pass
- Rationale:
  - compare-only scales better on dense grids
  - top-aligned banner icon is more stable when copy wraps

### Trust and Safety UX

- Proposed direction: Pass
- Rationale:
  - no hidden consequence
  - cleaner action model reduces accidental clicks

### Consistency and Implementation Readiness

- Proposed direction: Pass
- Rationale:
  - grid, panel, and sidebar each get a clearer role
  - the proposal removes UI conflict instead of adding more layout complexity

---

## Implementation Handoff Checklist

### 1. Grid Control Simplification

#### [MODIFY] `main.js`

1. Remove the card-level favorite button from `renderIconCell()`.
2. Remove the delegated grid favorite-click handling path that depends on the card heart.
3. Keep compare handling unchanged.
4. Keep the panel `Save` / `Saved` action and existing favorite model.

#### [MODIFY] `style.css`

1. Remove or retire the now-unused card-heart styles.
2. Keep compare as the visible card quick action.
3. If needed, slightly refine compare placement once it becomes the only card action.

### 2. Favorites Product Model

#### [KEEP] `main.js`

1. Keep localStorage favorites
2. Keep sidebar favorites count
3. Keep `Favorites` filtered view
4. Keep the customize panel `Save` / `Saved` chip as the primary save affordance
5. Keep the favorites empty-state guidance

### 3. Banner Alignment Fix

#### [MODIFY] `style.css`

1. Top-align `.promo-banner--pro .promo-banner__left`
2. Ensure the diamond icon remains pinned to the first line block instead of re-centering against wrapped text
3. Preserve the current banner width and annual copy

---

## Acceptance Checks

1. Icon cards show compare only, with no heart/compare overlap.
2. Favorites remain fully usable through the customize panel and sidebar.
3. The favorites empty state still explains how to save an icon.
4. The grid feels visually cleaner after the card heart is removed.
5. Toggling the Go Pro banner to annual does not make the diamond icon drop.
6. The Pro banner still reads cleanly with the panel open and at narrower widths.

---

## Residual Risks

1. Removing the card heart reduces grid-level favorite discoverability, so the panel save action must remain obvious.
2. If users expect a visible saved marker on cards, we may later need a passive indicator.
3. Any Pro banner alignment tweak should still be checked against the shared promo-banner styles used elsewhere.

---

## Recommendation

Proceed with:

1. compare-only cards
2. panel-based favorites as the primary save action
3. sidebar favorites as the browse/retrieval surface
4. top-aligned Pro diamond icon in annual mode

This is the simplest, cleanest solution to the three issues and best matches the product direction you just described.
