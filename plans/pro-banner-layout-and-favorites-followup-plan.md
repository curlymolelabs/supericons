# Follow-up Plan: Pro Banner Layout and Favorites Discoverability

Date: 2026-04-06
Owner: Frontend + Product
Status: Draft
Related:
- `plans/go-pro-banner-annual-info-alignment-plan.md`

## Problem Statement

Two UX regressions surfaced after the annual-offer rollout:

1. The Go Pro banner now wraps awkwardly because the approved annual copy exceeds the original layout budget. On medium content widths, the right-side plan controls drop below the title block instead of staying in a stable header row.
2. The sidebar `Favorites` view is not actually dead, but it looks dead because the save action is broken for first-time use in the live grid. The heart button exists in the DOM for each icon tile, but non-favorited free icons do not visually reveal the heart on hover in the built app, so users can land on a `Favorites` nav item without any discoverable way to add items to it.

The goal of this follow-up is to fix both issues without weakening the approved annual offer and without removing existing functionality that already works.

---

## Discover and Define

### Target User and Job

- Users comparing Pro Monthly vs Pro Annual should be able to read the offer and act on it without the banner looking broken.
- Users browsing icons should be able to understand that they can save favorites and retrieve them later from the sidebar.

### Precise UX Problems

1. Banner layout problem:
   - Current annual description is valid product copy, but `.promo-banner` has no dedicated responsive treatment for the longer sentence.
   - The layout relies on the previous shorter copy and wraps unpredictably.

2. Favorites creation and discoverability problem:
   - `Favorites` is wired in the sidebar and filter logic.
   - The creation affordance is `.icon-cell__fav`.
   - In the built app, non-active favorite buttons remain visually hidden on free icon hover, even though the button is present in the DOM.
   - Active favorited icons do show the heart correctly, so the bug is in the non-active reveal path, not the storage model.
   - On touch devices and first-time desktop flows, this makes the feature feel missing.

### Success Definition

1. Go Pro banner keeps an intentional two-row structure:
   - row 1: title and description on the left, toggle plus pricing CTA on the right
   - row 2: feature list across the full width
2. Annual description may wrap to two lines, but it should not force the controls into an accidental stack except on intentionally narrow/mobile layouts.
3. A first-time user can discover how to add a favorite without guessing.
4. Clicking `Favorites` with zero saved icons shows explicit guidance instead of a generic empty state.

---

## Direction Options

### Banner Options

#### Option A: Shorten the annual copy again

Example:

`Own 8 premium collections now, plus future drops during your annual term.`

Pros:
- easiest layout fix
- lowest CSS risk

Cons:
- weakens an already-approved offer line
- does not solve the underlying layout brittleness
- likely regresses again the next time copy grows

Recommendation: not preferred.

#### Option B: Keep the approved copy and fix the layout system

Approved copy:

`Own all 8 premium collections now, plus future drops while annual is active.`

Pros:
- preserves the product decision
- fixes the actual layout weakness
- gives the banner a stable structure for future copy changes

Cons:
- requires coordinated CSS adjustments and responsive QA

Recommendation: preferred.

### Favorites Options

#### Option A: Remove `Favorites` from the sidebar

Pros:
- removes confusion immediately

Cons:
- throws away an already-implemented feature
- loses a lightweight retention and workflow affordance
- does not improve icon-grid usability

Recommendation: not preferred unless product wants to de-scope favorites completely.

#### Option B: Keep `Favorites` and make the save action discoverable

Pros:
- preserves working functionality
- resolves the "dead link" perception
- improves mobile and keyboard usability

Cons:
- needs a small UI and copy pass

Recommendation: preferred.

---

## Proposed UX Direction

### Banner

Keep the approved annual copy and move to an intentional two-row banner layout:

1. Header row:
   - left: icon, title, annual description
   - right: monthly/annual toggle, price, CTA
2. Details row:
   - full-width feature list beneath the header row

Design rules:

1. The description should wrap at a controlled measure, ideally about two lines in the annual state.
2. The right-side controls should keep a fixed enough footprint that they do not randomly fall under the title block at medium widths.
3. On genuinely narrow layouts, the header may stack intentionally, but that should happen via explicit responsive rules, not accidental wrapping.

### Favorites

Keep the sidebar item and improve affordance clarity:

1. Restore the heart action for non-favorited free icons so it actually appears in the grid.
2. Make the heart action visible enough to discover on desktop, not only on hover.
3. Make the heart clearly visible on touch and coarse-pointer devices.
4. Support keyboard discovery via `:focus-within`, `aria-label`, and `aria-pressed`.
5. Add a `Favorites`-specific empty state:
   - title: `No favorites yet`
   - text: `Click the heart on any icon to save it here. Favorites stay on this device.`

Counterproposal:

Do not hide the sidebar item when the count is `0`. Keeping it visible teaches the feature exists, as long as the empty state explains how to use it.

---

## Gate Results

### Usability Heuristics

- Current state: Fail
- Rationale:
  - the banner does not preserve visual hierarchy under longer copy
  - `Favorites` exposes a destination before it explains the action that populates it

### Accessibility Baseline

- Current state: Partial fail
- Rationale:
  - the favorite control is visually hidden by default and currently fails to reveal for non-active icons in the built app
  - keyboard and screen-reader semantics should be stronger
  - the empty state is generic instead of task-guiding

### Adaptive and Responsive Behavior

- Current state: Fail
- Rationale:
  - the banner has no dedicated responsive rule for the longer annual sentence
  - the current hover reveal path is not reliable for non-active icons
  - hover-only discovery performs poorly on touch devices

### Trust and Clarity

- Current state: Partial fail
- Rationale:
  - the `Favorites` nav item suggests a feature that looks missing because the save affordance is currently broken for first-time use
  - the banner can appear visually broken even though the pricing logic is correct

### Consistency and Cognitive Load

- Current state: Partial fail
- Rationale:
  - the store presents a saved-icons concept in the sidebar, but the icon grid does not surface the save action clearly enough

---

## Implementation Handoff Checklist

### 1. Banner Layout Hardening

#### [MODIFY] `style.css`

1. Refine `.promo-banner` so the header row has a more stable left/right split.
2. Give `.promo-banner__left` a flexible basis and `.promo-banner__right` a protected minimum footprint.
3. Limit `.promo-banner__desc` to a readable measure so the annual sentence wraps intentionally instead of stretching indefinitely.
4. Increase line-height for `.promo-banner__desc` slightly so the two-line state reads cleanly.
5. Ensure `.promo-tooltip` remains a dedicated full-width second row.
6. Add an explicit responsive breakpoint for narrow layouts where the right-side controls stack intentionally and align left.
7. Add a small-screen rule for `.promo-tooltip__features` if needed so the feature list drops to one column before it becomes cramped.

#### [KEEP] `store.js`

1. Keep the approved annual description:
   - `Own all 8 premium collections now, plus future drops while annual is active.`
2. Do not shorten the annual message as the primary fix.

### 2. Favorites Discoverability Fix

#### [MODIFY] `style.css`

1. Make `.icon-cell__fav` faintly visible by default on desktop instead of fully invisible.
2. Keep stronger visibility on hover and active states.
3. Add visibility on `.icon-cell:focus-within` so keyboard users can discover the control.
4. Add a coarse-pointer rule so the heart is visible on touch devices.
5. If needed, give the heart a subtle background chip on touch so it reads as an interactive control.
6. Verify there is no selector or cascade interaction preventing `.icon-cell:hover .icon-cell__fav` from taking effect for non-active buttons.

#### [MODIFY] `main.js`

1. Add `aria-label` and `aria-pressed` to the favorite button markup in `renderIconCell()`.
2. Keep those attributes updated in the delegated click handler after toggling.
3. Add a `Favorites`-specific empty state in `renderGrid()`:
   - when `state.activeLibrary === 'favorites'` and there are no saved icons, show a dedicated title and instructional text
4. Leave the localStorage-backed favorites model intact.
5. If CSS-only restoration is not sufficient, add a minimal JS fallback class or interaction hook so non-active favorite buttons reliably become visible on hover or focus.

#### [KEEP] `index.html`

1. Keep the sidebar `Favorites` item.
2. Do not remove it unless product decides to cut the feature altogether.

---

## Acceptance Checks

1. With the sidebar open on desktop, the Go Pro banner keeps the title/description on the left and the toggle plus price/CTA on the right.
2. In annual mode, the approved description wraps cleanly to about two lines instead of causing an accidental header collapse.
3. On narrow/mobile widths, the banner stacks intentionally and still looks balanced.
4. The Launch Edition banner remains visually correct after the shared promo-banner CSS changes.
5. In the default icon grid, a non-favorited free icon visibly reveals the heart control.
6. In the default icon grid, the favorite heart is discoverable without requiring hover guesswork.
7. On touch or coarse-pointer emulation, the favorite control remains visible and tappable.
8. Clicking `Favorites` with zero saved icons shows the dedicated instructional empty state.
9. Adding and removing favorites updates the sidebar count and the `Favorites` view correctly.
10. Keyboard users can tab to a favorite control and understand its current state.

---

## Verification Plan

### Automated

1. Run `node --check main.js`
2. Run `node --check store.js`
3. Run `npm run build`

### Manual

1. Open Premium Collections with the sidebar visible and verify the Go Pro banner in monthly and annual modes.
2. Verify the banner with the customize panel open and closed, since available width changes.
3. Verify the Launch Edition banner still aligns correctly after the shared CSS changes.
4. In the icon grid, confirm a non-favorited free icon reveals the heart on desktop hover.
5. Confirm a favorited icon still shows the active heart state correctly.
6. Confirm the heart action is visible on keyboard focus and touch emulation.
7. Add a favorite, open `Favorites`, then remove it from inside the `Favorites` view and confirm the grid re-renders correctly.
8. Open `Favorites` with zero items and verify the dedicated instructional empty state appears.

---

## Residual Risks

1. Because `.promo-banner` is shared by Go Pro and Launch Edition, banner CSS changes must be checked against both surfaces.
2. Favorites are stored locally, so the empty-state guidance should avoid implying cross-device sync.
3. Because the current evidence shows active hearts working while non-active hover reveal fails, the final fix should be verified against real browser hover behavior, not source inspection alone.
4. If annual offer copy expands again later, the banner should be re-QA'd rather than assuming the current wrap rules will always hold.

---

## Recommendation

Proceed with:

1. Banner Option B: preserve the approved annual copy and harden the layout
2. Favorites Option B: keep the feature and fix discoverability instead of removing the sidebar item

This is the smallest change set that restores clarity without undoing product decisions or removing already-working functionality.
