# Theme Tooltip And Favorites/Recent Clear Actions Plan

## Why This Pass Exists

Two small UX issues are now visible on the live site:

1. The theme toggle shows both the custom `data-tip` tooltip and the browser's native `title` tooltip.
2. The `Favorites` and `Recent` library views have no direct way to clear their stored device-local data.

These are both lightweight frontend fixes, but they touch shared header/grid UI and local persistence, so they should be handled deliberately instead of as isolated patches.

## Current Findings

### 1. Theme Tooltip Duplication

- The theme button is initialized in [index.html](../../index.html) with all three attributes:
  - `aria-label="Light Mode"`
  - `data-tip="Light Mode"`
  - `title="Light Mode"`
- The runtime sync in [main.js](../../main.js) also updates all three attributes, including `title`, inside `syncThemeToggleButton()`.
- The visible custom tooltip comes from the shared `[data-tip]::after` system in [style.css](../../style.css).
- Result: hover shows the custom tooltip immediately and the browser-native `title` tooltip shortly after, which feels broken and redundant.

### 2. Favorites / Recent Have No Clear Action

- `Favorites` and `Recent` are device-local state in [main.js](../../main.js):
  - `si-favorites`
  - `si-recent`
  - `si-recent-colors`
- The library header in [index.html](../../index.html) only renders the style toggle buttons.
- `switchLibrary()` updates `gridTitle`, but there is no contextual action area for library-specific controls.
- The current empty state already tells users favorites stay on this device, but there is no matching way to remove all device-local items at once.
- `Recent` also lacks a dedicated empty-state message today, so if it is cleared manually in storage the fallback copy is not fully tailored to that view.

## Implementation Goals

### Theme Tooltip

- Keep the current custom tooltip behavior.
- Keep accessible labeling via `aria-label`.
- Remove the native browser tooltip entirely.
- Ensure both dark-mode and light-mode states still announce the correct next action:
  - dark theme -> `Light Mode`
  - light theme -> `Dark Mode`

### Favorites / Recent Clear Actions

- Add a visible clear button only when the active library is `Favorites` or `Recent`.
- Use a compact icon-style action in the grid header so it feels native to the current UI.
- Use explicit confirmation before destructive clearing.
- Clear only the targeted dataset:
  - `Favorites` clears `si-favorites`
  - `Recent` clears `si-recent`
- Do not clear `si-recent-colors`; that is a separate customize feature and should remain untouched.
- Update counts, empty state, and grid contents immediately after clearing.

## Recommended UX

### 1. Theme Toggle

- Remove `title` from the theme button in both static markup and runtime sync.
- Leave `data-tip` and `aria-label` in place.
- Do not replace this with any extra JS tooltip logic; the existing tooltip system is already sufficient.

### 2. Favorites / Recent Clear Actions

- Add a contextual clear button to the right side of `.grid-header__actions`.
- Use a trash/clear icon with a short tooltip:
  - `Clear favorites`
  - `Clear recent`
- Keep the button hidden outside these two library views.
- Disable or hide it when the relevant list is already empty.

### Confirmation Pattern

- Do not use `window.confirm()`.
- Reuse the project's existing custom modal patterns as the visual baseline, or add a lightweight shared confirm modal if needed.
- Confirmation copy should be specific:
  - `Clear all favorites from this device?`
  - `Clear recent icons from this device?`
- Add a short supporting line noting this affects only the current browser/device.

## File-Level Plan

### 1. Remove Native Theme Tooltip

Files:
- [index.html](../../index.html)
- [main.js](../../main.js)

Changes:
- Remove the initial `title` attribute from `#themeToggle`.
- Remove `themeToggleBtn.setAttribute('title', actionLabel);` from `syncThemeToggleButton()`.
- Optionally add `themeToggleBtn.removeAttribute('title');` inside sync as a defensive cleanup in case stale DOM survives a partial render.

### 2. Add Contextual Clear Button In Grid Header

Files:
- [index.html](../../index.html)
- [main.js](../../main.js)
- [style.css](../../style.css)

Changes:
- Add a dedicated button container or button placeholder in `.grid-header__actions`.
- Render or toggle the clear button based on `state.activeLibrary`.
- Match the existing visual language of the grid header controls.
- Add tooltip and `aria-label` text that changes with the active library.

### 3. Add Clear State Helpers

File:
- [main.js](../../main.js)

Changes:
- Add small helpers for:
  - clearing favorites
  - clearing recent
  - refreshing counts and visible grid state
- Ensure these helpers:
  - update `state`
  - write back to localStorage
  - rerender the current library view
  - preserve unrelated localStorage keys

### 4. Add Confirmation UI

Files:
- [main.js](../../main.js)
- possibly [style.css](../../style.css)

Changes:
- Reuse an existing modal pattern if one can be adapted cleanly.
- If not, add a small shared confirm modal component for local destructive actions.
- Wire confirm/cancel, `Escape`, backdrop click, and focus behavior.

### 5. Tighten Empty-State Copy

File:
- [main.js](../../main.js)

Changes:
- Add a dedicated `Recent` empty title and body.
- Keep existing `Favorites` copy, but make sure it still reads well after a manual clear.
- Suggested copy direction:
  - `No recent icons yet`
  - `Icons you open appear here on this device.`

## Verification Plan

### Theme Toggle

1. Hover the theme button in dark mode.
2. Confirm only the custom tooltip appears.
3. Toggle to light mode.
4. Confirm the tooltip updates to the opposite action.
5. Inspect the button and confirm there is no `title` attribute left on `#themeToggle`.

### Favorites Clear

1. Add multiple icons to favorites.
2. Open `Favorites`.
3. Confirm the clear button is visible and labeled correctly.
4. Open the confirm modal and cancel.
5. Confirm nothing changes.
6. Confirm the action.
7. Verify:
   - favorites count becomes `0`
   - grid empties immediately
   - favorites empty state appears
   - `si-favorites` is removed or emptied in localStorage

### Recent Clear

1. Open several icons to populate recent history.
2. Open `Recent`.
3. Confirm the clear button is visible and labeled correctly.
4. Confirm/cancel flow works.
5. After confirming, verify:
   - recent count becomes `0`
   - grid empties immediately
   - recent-specific empty state appears
   - `si-recent` is removed or emptied in localStorage
   - `si-recent-colors` remains unchanged

### Regression Checks

1. Verify `All Icons` and pack/library views do not show the clear button.
2. Verify grid style toggle buttons still work.
3. Verify theme toggle still updates icon, tooltip, and `aria-label`.
4. Verify no native browser tooltip appears for the theme button in either theme.

## Suggested Implementation Order

1. Remove the theme `title` attribute and verify the duplicate tooltip is gone.
2. Add the contextual clear button shell in the grid header.
3. Add favorites/recent clear helpers and rerender flow.
4. Add confirmation UI.
5. Tighten empty-state copy for `Recent`.
6. Run browser verification on desktop and narrow mobile width.
