# Audit: Motion Lab Library Button Does Not Return To True All Icons

## Summary

The `Library` button inside `Motion Lab` currently does **not** route the user back to the true default icon browser state.

It exits Motion Lab visually, but it does not reset the main icon browser's active library filter. As a result:

- the left sidebar can highlight `All Icons`
- the grid title can say `All Icons`
- but the actual icon grid can still be filtered to the previously active library, such as `Material Symbols`

This creates a state mismatch between the store/tool shell in `store.js` and the icon browser state in `main.js`.

## Current Click Path

In [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js), the Motion Lab button is wired like this:

- `renderMotionLab()` renders the button with `id="mlLibraryBtn"`
- `initMotionLabLoading()` attaches:

```js
libBtn?.addEventListener('click', () => {
  stopMotionLabRotatingPanel();
  switchView('browse');
});
```

The important part is the call to `switchView('browse')`.

## What `switchView('browse')` Actually Does

In [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js), `switchView(view)` treats any non-store/tool view in the same generic restore branch.

That restore branch:

- removes `store-active`
- restores header actions
- sets `gridTitle` to `All Icons`
- clears `gridMeta`
- restores the landing hero
- removes lingering tool views
- calls `updateSidebarActive(view)`

And `updateSidebarActive(view)` defaults to:

- clearing all sidebar items
- re-highlighting `.sidebar__item[data-library="all"]`

This is only a **visual sidebar reset**.

## What It Does Not Do

It does **not** call the actual icon browser state setter in [main.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/main.js):

```js
function setActiveLibrary(libraryId) {
  state.activeLibrary = libraryId;
  ...
  applyFilters();
}
```

That means `state.activeLibrary` can remain whatever it was before entering Motion Lab, for example:

- `material`
- `simpleicons`
- `mingcute`
- `favorites`
- `recent`

So after leaving Motion Lab:

- the shell says `All Icons`
- the sidebar says `All Icons`
- but the actual filter may still be `material`

## Root Cause

There are two different navigation/state layers:

1. `store.js`
   - controls full-width views like pricing, Motion Lab, converter, packs
   - restores the shell layout and sidebar highlight

2. `main.js`
   - controls the actual icon browser filter state via `state.activeLibrary`
   - updates grid title and results through `setActiveLibrary()`

The Motion Lab button currently only resets layer 1.
It does not reset layer 2.

## Why This Shows Up As Material Symbols

If the user previously browsed `Material Symbols`, then:

- `main.js state.activeLibrary === 'material'`
- Motion Lab opens
- clicking `Library` exits Motion Lab visually
- `state.activeLibrary` is still `material`

So the user lands in the Material Symbols filtered grid even though the UI visually suggests `All Icons`.

## Scope Of Fix

This does **not** require changing:

- library data
- sidebar item definitions
- search behavior
- icon browser filtering logic
- Motion Lab itself beyond the button target

The fix should be narrowly scoped to the Motion Lab `Library` button flow.

## Recommended Direction

When the Motion Lab `Library` button is clicked, the app should:

1. leave Motion Lab
2. explicitly restore the main icon browser
3. explicitly set the active library to `all`

That means the click path should end in the same true default state as if the user had clicked the `All Icons` library item directly.

## Risk Assessment

This is a low-risk fix if implemented narrowly.

Safe if:

- only the Motion Lab button path is changed
- the reset uses the existing `setActiveLibrary('all')` flow

Risky if:

- `switchView()` is broadly changed for all view exits
- generic non-store routing is redefined without testing favorites/recent/library flows

## Acceptance Signal

After the fix:

- entering Motion Lab from any library
- clicking `Library`
- should always land on the true `All Icons` page

That means:

- `state.activeLibrary === 'all'`
- sidebar highlights `All Icons`
- grid title reads `All Icons`
- visible results are not limited to the previously active library
