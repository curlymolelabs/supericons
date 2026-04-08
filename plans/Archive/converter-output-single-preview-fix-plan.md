# Converter Output Single Preview Fix Plan

## Goal

Make `PNG -> SVG` output preview behave exactly as users expect:

`One selected compare mode should render one corresponding preview presentation.`

In particular:

- `Trace` should show only the traced SVG
- `Original` should show only the original image
- `Split` should show exactly two panes
- `Overlay` should show only the intended overlay stack

## Scope

This fix is limited to the `PNG -> SVG` output preview system in:

- [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js)
- [style.css](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/style.css)

It does not change:

- tracing engines
- tracing quality controls
- export behavior
- output file generation
- size policy for bad inputs

## Product Note

This is an icon converter, not a general-purpose image simplifier.

So for poor source inputs, such as:

- screenshots of webpages
- noisy photos
- large UI captures used as pseudo-logos

the system may still produce large SVGs.

That is not the bug being fixed here.

The intended product behavior is:

- keep preview logic clean and trustworthy
- allow users to trace non-ideal images if they want
- use hints and output warnings for oversized results
- avoid hard-blocking export just because an input is not logo-optimized

This fix is only about making the preview stage show the correct single active view.

## Root Cause To Fix

The inactive compare container is not being reliably hidden because:

- JS uses the `hidden` attribute
- CSS still assigns explicit layout display modes to those same nodes

As a result, multiple preview systems can render at the same time.

## Fix Strategy

## Phase 1: Enforce Real Hidden State

Add an explicit CSS guard so compare containers respect hidden mode:

- `.conv__compare-overlay[hidden]`
- `.conv__compare-split[hidden]`

They must resolve to:

- `display: none !important`

Why:

- this is the smallest, safest fix
- it preserves the existing JS switching logic
- it immediately restores one-active-view behavior

## Phase 2: Keep Compare Modes Mutually Exclusive

Review `updateConverterPreviewStage()` and confirm:

- `split.hidden = !isSplit`
- `overlay.hidden = isSplit`

remain the only parent-container switch

Then verify child visibility inside overlay still matches:

- `Trace` -> output only
- `Original` -> original only
- `Overlay` -> both visible

## Phase 3: Add Safety Cleanup for Inactive Views

Optionally tighten the rendering contract by clearing inactive image sources when a view is not active.

Example direction:

- if `split` is inactive, clear or defer `split` image `src`
- if overlay original is inactive, optionally clear it instead of only hiding it

This is not strictly required for the bug fix, but it reduces future leakage risk.

## Phase 4: Structural Hardening

If we want the preview system to be more robust long term, move to a single explicit stage mode:

- `#convPreviewStage[data-compare-mode="trace"]`
- `#convPreviewStage[data-compare-mode="original"]`
- `#convPreviewStage[data-compare-mode="split"]`
- `#convPreviewStage[data-compare-mode="overlay"]`

Then CSS can control visibility from one source of truth.

This phase is optional for the immediate fix.

## Recommended Implementation Order

1. Add the `[hidden] { display:none !important; }` guard for compare containers
2. Re-test all four compare modes
3. Only if leakage remains, add inactive `src` cleanup
4. Defer the stage-level mode refactor unless needed

## Verification Checklist

Use a real PNG upload and verify:

### Trace

- only one traced preview is visible
- no original preview remains
- no split pane remains

### Original

- only one original preview is visible
- no traced preview remains

### Split

- exactly two panes are visible
- original on one side
- traced SVG on the other

### Overlay

- exactly one stacked overlay presentation is visible
- no split pane remains

### Background modes

Check all preview backgrounds:

- Transparent
- White
- Black
- Custom

Ensure background changes do not reintroduce leaked preview items.

## Success Criteria

This fix is complete when:

- users see exactly one compare presentation at a time
- `Trace` mode no longer shows extra preview items
- compare controls remain responsive
- no regression is introduced in SVG download/copy flows

## User-Centered Check

Ask the simplest question:

`If I choose Trace, do I see exactly one trace preview and nothing else?`

If the answer is not yes, the fix is not complete.
