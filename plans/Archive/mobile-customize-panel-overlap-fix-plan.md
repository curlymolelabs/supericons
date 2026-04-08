# Mobile Customize Panel Overlap Fix Plan

## Goal

Fix the mobile customize-panel overlap without breaking the existing desktop app, store views, or any dependencies.

This plan is intentionally tighter than the first draft:

- preserve desktop right-rail behavior after the landing is dismissed
- preserve the existing dependency tree and build pipeline
- change mobile overlay behavior only where it is currently broken
- isolate landing-mode fixes from the rest of the app instead of relying on z-index battles

## Reproduced Behavior

I reproduced the issue at about `430px` width.

### Repro 1: Landing still visible

- The landing shell is active and not hidden.
- The customize panel is already open.
- On mobile, the panel becomes a fixed bottom sheet and renders above the landing.

Relevant references:

- [main.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/main.js#L70)
- [index.html](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/index.html#L339)
- [style.css](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/style.css#L169)
- [style.css](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/style.css#L2973)
- [style.css](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/style.css#L3034)
- [style.css](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/style.css#L3035)

### Repro 2: Landing dismissed

This was the important second audit check.

Even after dismissing the landing, mobile still boots into the main app with the empty bottom sheet open. So this is not only a landing-overlay bug. It is also a real mobile default-state bug in the app itself.

That means the fix must cover both:

- landing-active overlay suppression
- mobile default panel state for the app after landing dismissal

## Root Cause

There are three connected causes.

### 1. The panel starts open by default

- JS state initializes with `panelOpen: true` in [main.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/main.js#L70)
- markup renders the panel as `panel panel-open` in [index.html](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/index.html#L339)

### 2. Mobile turns that open panel into a fixed bottom sheet

At the mobile breakpoint:

- the layout becomes single-column in [style.css](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/style.css#L3000)
- the panel becomes `position: fixed`, full-width, bottom-aligned, with `max-height: 70vh` in [style.css](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/style.css#L3026) and [style.css](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/style.css#L3034)
- it sits at `z-index: 300` in [style.css](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/style.css#L3035)

### 3. Panel state is not fully centralized

This was the main audit gap in the earlier draft.

`main.js` owns `state.panelOpen` and toggles classes in [main.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/main.js#L837), but `store.js` also directly manipulates `.panel-open`, `.panel-hidden`, and `.panel--pricing-hidden` during view switches in:

- [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L420)
- [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L430)
- [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L503)
- [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L521)
- [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L534)

So a fix that only changes `main.js` state without aligning these DOM mutations can create state drift.

## Additional Audit Findings

### Landing lifecycle is partly legacy

`dismissHero()` now works through the landing shell in [main.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/main.js#L2549), but `store.js` still references `landingHero` directly in:

- [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L452)
- [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L566)

That is a smell from before the landing moved into `#landingShell`. The fix should avoid adding more logic against `landingHero` alone.

### A z-index-only patch would still be fragile

The compare drawer is a separate fixed overlay at `z-index: 900` in:

- [style.css](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/style.css#L2639)
- [style.css](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/style.css#L2647)

So “just raise the landing shell above the panel” is not a durable fix.

## Safe Scope Boundaries

These boundaries are what keep the fix from breaking the main site.

### What should change

- mobile bottom-sheet default state
- landing-active overlay suppression
- panel state synchronization
- resize/orientation handling where mobile and desktop behavior diverge

### What should not change

- desktop right-rail behavior after landing dismissal
- pricing, Motion Lab, and Converter full-width behavior
- dependencies, package versions, or install steps
- icon rendering/export logic

## Fix Strategy

### Phase 1: Remove Default-Open Markup And Make Initial State Explicit

Change the initial panel state so the DOM and JS do not disagree.

- remove `panel-open` from [index.html](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/index.html#L339)
- stop hardcoding `panelOpen: true` in [main.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/main.js#L70)

Tightened rule:

- desktop may still initialize with the panel visible if we explicitly want that
- mobile overlay mode must initialize with the panel closed

This avoids changing desktop behavior unintentionally while fixing mobile first-load behavior.

### Phase 2: Introduce One Authoritative Panel-State Helper

Replace the toggle-only path with a shared helper such as `setPanelOpen(isOpen, options)`.

The helper should be responsible for:

- `state.panelOpen`
- `.panel-open`
- `.panel-hidden`
- optionally syncing from current breakpoint

Important audit note:

Do not solve this by importing `main.js` into `store.js`, because that invites circular dependency problems. Prefer one of these:

- a tiny new shared UI-state module
- or a DOM-based helper attached in a deliberately narrow way

### Phase 3: Keep Desktop Behavior, Close Mobile By Default

The intended behavior after tightening the scope:

- desktop: preserve current docked customize rail behavior after landing dismissal
- mobile: start with the bottom sheet closed until the user selects an icon or taps customize

This is the only intentional main-app behavior change, and it is limited to the broken mobile mode.

### Phase 4: Add `landing-active` Overlay Suppression

When the landing shell is visible, mark the UI as landing-active using the shell or body.

While landing-active is set:

- force the customize panel hidden
- force the sidebar overlay hidden
- force the compare drawer hidden

Do not rely on z-index alone.

This should be implemented through landing-shell lifecycle, not just `landingHero`, because the shell now owns the landing experience.

### Phase 5: Align `store.js` With The New Panel Authority

This was missing from the first version and should be treated as required.

Any place in `store.js` that currently directly adds/removes:

- `.panel-open`
- `.panel-hidden`
- `.panel--pricing-hidden`

must either:

- call the new shared panel helper
- or be explicitly reconciled with it

The goal is to prevent stale `state.panelOpen` vs DOM-class mismatches after switching between:

- icons
- pricing
- Motion Lab
- converter

### Phase 6: Add Breakpoint And Orientation Sync

On viewport changes:

- if entering mobile bottom-sheet mode with no icon selected, close the panel
- if returning to desktop, restore the intended docked state without forcing unrelated UI resets
- keep landing-active suppression authoritative regardless of breakpoint

## CSS Changes

Keep the current mobile bottom-sheet design, but only show it when intentionally open.

Primary areas:

- mobile panel rules in [style.css](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/style.css#L2973)
- landing shell block in [style.css](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/style.css#L166)
- compare drawer suppression in [style.css](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/style.css#L2639)

Do not use a landing-shell z-index bump as the primary solution.

## Verification Plan

### 1. Mobile landing, first load

- landing visible
- customize panel hidden
- sidebar hidden
- compare drawer hidden

### 2. Mobile app, after landing dismissal

- landing hidden
- icon grid fully usable
- empty customize bottom sheet not shown by default

### 3. Mobile app interaction

- selecting an icon opens the customize panel
- tapping the customize toggle opens and closes it correctly
- closing it keeps the grid usable

### 4. Desktop regression

- landing dismissed
- desktop right rail still behaves as before
- pricing, Motion Lab, and Converter still collapse and restore the panel correctly

### 5. View-switch regression

- switch to pricing, Motion Lab, and Converter
- return to icons
- confirm no stale panel-open / panel-hidden mismatch

### 6. Responsive transitions

- load on desktop and resize to mobile
- load on mobile and rotate
- confirm panel state remains sane and does not re-overlay the landing

## Recommended Implementation Order

1. Remove default-open markup and make initial state breakpoint-aware.
2. Add a shared panel-state helper.
3. Update `main.js` to use the helper.
4. Reconcile `store.js` panel mutations with the helper.
5. Add landing-active suppression for app overlays.
6. Add resize/orientation sync.
7. Run mobile and desktop browser verification plus `npm run build`.

## Expected Outcome

After the fix:

- the landing no longer gets covered by the mobile bottom sheet
- the mobile app no longer boots with an empty customize sheet covering the grid
- desktop behavior remains intact
- store/tool views continue to work
- no dependency or install changes are required
