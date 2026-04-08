# MingCute Fill Block Fix Plan

## Problem

In Motion Lab, selecting a fill color for some MingCute `_line` icons turns the icon into a solid colored square/block.

From the audit in [audit-mingcute-fill-block.md](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs/audit-mingcute-fill-block.md), the root cause is:

- MingCute `_line` icons include a hidden helper/layout path
- that helper path inherits `fill="none"` from a parent `<g>`
- Motion Lab fill recolor currently only checks the shape's own `fill` attribute
- so the helper path is incorrectly recolored and becomes visible

## Goal

Make MingCute fill recolor behave correctly in Motion Lab:

- recolor only visible glyph shapes
- never recolor the hidden helper box path
- preserve current behavior for other libraries
- ensure exported output matches the fixed preview

## Non-Goals

- no large-scale rewrite of the SVG ingestion pipeline
- no build-time normalization pass across all icon libraries unless runtime fix proves insufficient
- no unrelated Motion Lab animation changes

## Fix Strategy

Apply a narrow runtime fix in [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js), specifically in the fill recolor path.

### Principle

The fill recolor logic should skip shapes that are intentionally non-painted in the original SVG, including:

- explicit `fill="none"`
- inherited `fill="none"` from ancestor groups
- known MingCute ghost/helper box paths if a second safeguard is needed

## Implementation Steps

### 1. Add a fill-visibility helper next to the existing Motion Lab recolor helpers

In [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js):

- add a helper that determines whether an original shape should be excluded from fill recolor
- inspect the original SVG DOM, not just the live recolored DOM

The helper should:

- return `true` if the original element explicitly has `fill="none"`
- return `true` if the original element inherits `fill="none"` from an ancestor group
- optionally return `true` for MingCute's known helper path signature if inherited-fill detection alone is not enough

Suggested helper shape:

```js
function shouldSkipFillRecolor(origEl) { ... }
```

### 2. Update `applyFillToSvg(color)` to use the helper

Current issue:

- `applyFillToSvg()` skips only `origFill === 'none'`

Change it so that:

- each original element is checked with the new helper
- only real visible fill targets receive the chosen color

That keeps the fix local and low-risk.

### 3. Add a MingCute-specific fallback guard only if necessary

If inherited-fill detection alone does not fully solve the issue, add a second line of defense for the known hidden bounds/helper path.

This should be narrow, library-safe, and only used as a fallback.

Examples of acceptable fallback matching:

- path data normalization for the known box helper path pattern
- only applied in the fill recolor helper

Do not start with a broad pattern delete or SVG mutation.

### 4. Verify preview behavior in Motion Lab

Use a real MingCute `_line` icon that currently reproduces the problem.

Confirm:

- before recolor, helper path remains invisible
- after selecting a fill color, only the visible icon path changes color
- no solid square/block appears

### 5. Verify export behavior

After live preview is fixed, verify that exported output also stays correct.

Check:

- `Copy SVG`
- `Download SVG`
- `Copy CSS` if fill is baked into live SVG before export

Reason:

- if the live DOM is corrected, export should usually follow
- but this should still be explicitly checked because export paths sometimes apply additional styling logic

## Files Expected To Change

- [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js)

Plan-only reference:

- [audit-mingcute-fill-block.md](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs/audit-mingcute-fill-block.md)

## Verification Checklist

### Static checks

- `node --check store.js`
- `npm run build`

### Runtime checks

In Motion Lab:

1. Open a MingCute `_line` icon that previously showed the square block
2. Click a fill palette color
3. Confirm only the visible glyph recolors
4. Confirm no square outline/block appears

### Regression checks

Also check:

1. a normal fill-based icon from another library still recolors correctly
2. a stroke-based icon still behaves normally
3. the recent Tabler stroke fix remains intact

### Export checks

Confirm exported SVG does not contain a visibly recolored helper box path.

## Risk Notes

Primary risk:

- over-skipping fill targets and accidentally leaving some legitimate visible shapes uncolored

Mitigation:

- prefer inherited `fill="none"` detection before any path-signature heuristics
- keep MingCute-specific fallback narrow
- regression test another fill-based library after the change

## Success Criteria

The fix is successful when:

- MingCute fill palette recolors only the intended visible icon shapes
- the solid square/block no longer appears
- preview and export remain visually aligned
- no regressions appear in other fill-based or stroke-based libraries
