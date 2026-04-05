# Converter Output Extra Preview Items Audit

## Issue

In `PNG -> SVG`, the `Output` stage should show exactly one preview item in `Trace` mode.

Instead, the UI can show multiple preview artifacts at once:

- a large dark original preview
- the traced output in the center
- another small preview on the right

This makes the converter feel broken because the user expects:

`I selected one compare mode, so I should only see that one compare result.`

## Reproduction

1. Open `Converter`
2. Switch to `PNG -> SVG`
3. Upload a PNG
4. Leave `Compare` on `Trace`
5. Observe the `Output` stage

## Root Cause

The bug is caused by a mismatch between the JS visibility logic and the CSS layout rules.

### What the JS is doing

`updateConverterPreviewStage()` in [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js) tries to switch between:

- `#convCompareOverlay`
- `#convCompareSplit`

It uses:

- `split.hidden = !isSplit`
- `overlay.hidden = isSplit`

and then toggles child image visibility inside the overlay container.

### What the CSS is doing

In [style.css](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/style.css), the compare containers are hard-coded with visible layout modes:

- `.conv__compare-overlay { display: flex; ... }`
- `.conv__compare-split { display: grid; ... }`

That means the HTML `hidden` attribute is not reliably acting as the final source of truth for display state in this component.

## Why the user sees 3 items

The output stage always mounts all preview image elements:

- overlay original
- overlay output
- split original
- split output

Because the inactive compare container is not being truly collapsed, stale preview nodes remain visible.

In `Trace` mode, the intended visible item is:

- overlay output only

But the split container can still render:

- split original
- split output

So the user ends up seeing a combination of:

- one overlay preview
- plus two split previews

## Gaps Identified

### 1. `hidden` is not the actual display authority

The component uses `hidden` in JS but also uses direct `display:flex` / `display:grid` in CSS for the same elements.

That is a fragile dual-control setup.

### 2. Inactive compare DOM stays populated

`updateConverterPreviewStage()` assigns `src` to all four preview images on every update, even when a mode is inactive.

So if visibility control leaks, stale previews are ready to render immediately.

### 3. Child-level visibility is compensating for parent-level leakage

The current code hides individual images inside the overlay container:

- original hidden for `Trace`
- output hidden for `Original`

That works only if the parent containers are already guaranteed to be mutually exclusive.

Right now they are not.

### 4. The compare stage lacks one explicit source of truth

There is no single mode contract like:

- `data-compare-mode="trace"`
- `data-compare-mode="original"`
- `data-compare-mode="split"`
- `data-compare-mode="overlay"`

Instead, state is split across:

- hidden attributes
- class toggles
- child `display` styles

That increases the chance of mode drift.

## Impact

For users, this is a trust problem more than a styling problem.

What they expect:

`One selected compare mode -> one corresponding visual result`

What the UI currently does:

`One selected compare mode -> multiple overlapping preview systems`

That makes it harder to judge trace quality and undermines the purpose of the new compare tools.

## Proposed Fix Direction

Use one clear compare-mode rendering contract.

Recommended approach:

1. Make the stage own a single explicit compare mode state
2. Ensure inactive compare containers are truly `display:none`
3. Keep only the active compare view visible
4. Optionally clear inactive image `src` values for extra safety

## Best Practical Fix

Short term:

- add explicit CSS for hidden compare containers, for example:
  - `.conv__compare-overlay[hidden], .conv__compare-split[hidden] { display: none !important; }`

Then:

- keep the current JS mode switching

This is the smallest, safest fix.

## Better Structural Follow-up

Move compare rendering to a stage-level mode system:

- set `data-compare-mode` on `#convPreviewStage`
- let CSS decide which subview is visible
- keep JS focused on data and mode, not competing display rules

That would make the preview system easier to reason about and less likely to regress.
