# Plan: Motion Lab Library Button Should Return To All Icons

## Goal

Make the `Library` button inside `Motion Lab` always return the user to the true default icon browser state:

- `All Icons` sidebar item active
- `All Icons` title shown
- `main.js state.activeLibrary` reset to `all`
- full icon grid shown, not the previously active library

## Non-Goals

This fix should **not** change:

- library ordering
- library data
- Motion Lab animation behavior
- converter behavior
- generic sidebar click behavior
- the meaning of `switchView()` for other store/tool exits

## Root Cause To Fix

Current Motion Lab button flow:

1. user clicks `mlLibraryBtn`
2. handler calls `switchView('browse')`
3. `store.js` restores the shell and sidebar highlight
4. `main.js` active library state is left untouched

So the fix must explicitly bridge the Motion Lab exit flow back into the real icon browser state.

## Implementation Strategy

### Fix 1: Add A Small Public Browser-State Helper

Expose a narrow helper from [main.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/main.js) through `window.__supericons`, for example:

- `goToAllIcons()`

That helper should:

1. call `setActiveLibrary('all')`
2. ensure the browser is in the normal icon view shell if needed

Why:

- avoid duplicating icon browser state logic in `store.js`
- reuse the existing `setActiveLibrary()` path
- keep the library reset semantics in the file that owns browser state

### Fix 2: Update Only Motion Lab Library Button Flow

In [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js), change the `mlLibraryBtn` click handler so it:

1. stops Motion Lab timers
2. exits Motion Lab shell
3. calls the main browser helper to reset to `all`

Important:

- do **not** rely on sidebar class toggling alone
- do **not** use a fake route name like `browse` unless it also resets browser state

### Fix 3: Keep Fix Narrowly Scoped

Do not change generic `switchView()` behavior for all exits.

Reason:

- a broad change could affect:
  - pricing back navigation
  - converter exit
  - packs/downloads/dashboard flows
  - favorites/recent behavior

This issue is specifically about the Motion Lab `Library` CTA and should stay local to that path.

## Files Expected To Change

- [main.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/main.js)
  - add/export a small helper on `window.__supericons`

- [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js)
  - update the `mlLibraryBtn` click handler to call the helper

## Verification Plan

### Manual Checks

Run these flows:

1. Start from `Material Symbols`
   - open Motion Lab
   - click `Library`
   - expect true `All Icons`

2. Start from `MingCute`
   - open Motion Lab
   - click `Library`
   - expect true `All Icons`

3. Start from `Favorites`
   - open Motion Lab
   - click `Library`
   - expect true `All Icons`

4. Start from `Recent`
   - open Motion Lab
   - click `Library`
   - expect true `All Icons`

### Assertions

For each case:

- sidebar active item is `All Icons`
- grid title is `All Icons`
- browser is no longer filtered to the previous library
- Motion Lab view is removed
- no stale Motion Lab panel behavior continues

## Hard Gate

The fix is complete only when the Motion Lab `Library` button behaves the same as a direct click on the `All Icons` sidebar item.

## Residual Risk

Low, if implemented as a dedicated Motion Lab-to-browser reset path.

Higher only if the fix tries to generalize `switchView()` for all non-store exits.
