# Motion Lab AI Box Removal and Tips Replacement Plan

## Goal

Remove the unused `AI Agent` chat box from Motion Lab and replace that area with concise, practical guidance that helps users understand how to use Motion Lab immediately.

This matches the new product direction:

- no in-app AI agent
- users can use their own MCP tools externally
- Motion Lab should feel like a focused manual animation studio

This plan also includes one separate UI cleanup:

- remove the dedicated Fill and Stroke reset icons, because the `Default` color dot already serves as the reset action for both

## Why This Change Matters

Right now the bottom section in Motion Lab presents:

- an `AI Agent` title
- a `Coming Soon` chip
- a textarea prompt
- a generate button

But it is no longer aligned with product direction, and it creates three UX problems:

1. it suggests a feature users cannot actually use as intended
2. it takes up valuable space in the Motion Lab layout
3. it competes with the real interaction model, which is preset-first manual control

Replacing it with lightweight guidance will make Motion Lab:

- clearer
- more honest
- easier to learn

## Current Implementation Surface

### Markup

The current AI Agent block lives in [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L2797).

### Event wiring

The related prompt handler lives in [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L2979).

This is currently local keyword-matching, not a real AI integration.

### Styles

There are AI-agent-related Motion Lab styles in [style.css](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/style.css#L5176) and [style.css](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/style.css#L5621).

### Fill / Stroke reset controls

The redundant reset icons live in the properties markup in [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L3514) and [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L3526).

They are currently wired as:

- `#mlFillReset`
- `#mlStrokeReset`

But the color dot row already includes a `Default` option that resets back to the original icon color, so these extra reset icons are duplicative.

## Desired End State

Instead of the AI prompt area, the bottom section should become a compact onboarding/help panel for Motion Lab.

It should:

- fit in the same general footprint
- feel native to the Motion Lab UI
- not look like an error state or placeholder
- help users take the next action quickly

Also:

- Fill and Stroke should rely on the `Default` color dot as their reset path
- the extra reset icons beside `Fill` and `Stroke` should be removed
- per-slider reset icons for controls like `Intensity`, `Speed`, `Scale`, `Rotate`, and `Opacity` should remain

## Content Strategy

The replacement should not be a long paragraph.

It should be short, useful, and action-oriented.

Recommended structure:

### Header

Use something like:

- `Quick Tips`
- `How to Use`
- `Motion Tips`

Best recommendation:

- `Quick Tips`

It is short, clear, and neutral.

### Tip content

Use 3-4 compact tips, such as:

1. `Click or hover an animation button to preview it.`
2. `Adjust Fill, Stroke, Size, Rotate, and Fade on the right.`
3. `Use Loop, Hover, or Click to control exported playback.`
4. `Download SVG or copy CSS when the motion looks right.`

Optional fifth tip if space allows:

5. `Reset icons return a control to its default value.`

### Optional secondary note

If wanted, include one subtle note about external workflows:

- `Use your own MCP tools to search, customize, or animate outside the app.`

This should be optional and visually secondary.

I would not make MCP the main message inside Motion Lab itself.

## Layout Recommendation

Keep the replacement visually lightweight.

Recommended UI:

- a short title row
- a vertical list of compact tips
- each tip with a small icon or subtle bullet

Avoid:

- a large card with too much padding
- paragraph-heavy instructional copy
- a second CTA button

The area should feel like “helpful orientation,” not another feature block.

## Implementation Steps

### 1. Remove the AI Agent markup from Motion Lab

In [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L2797):

- remove the `AI Agent` block
- remove the textarea
- remove the generate button
- remove the `Coming Soon` chip from that section

Replace it with a new guidance block, for example:

- `.ml__tips-box`
- `.ml__tips-header`
- `.ml__tips-list`
- `.ml__tip-item`

### 2. Remove the AI Agent event wiring

In [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L2979):

- remove the `mlAgentApply` / `mlAgentInput` query logic
- remove the keyword-matching prompt handler attached to that button

Important:

- do not remove preset definitions themselves
- only remove the fake prompt-to-preset bridge

### 3. Remove Motion Lab AI styles

In [style.css](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/style.css):

- remove the AI agent-specific Motion Lab styles
- replace them with styles for the new tips block

This includes both style clusters currently related to:

- `.ml__agent-box`
- `.ml__agent-header`
- `.ml__agent-title`
- `.ml__agent-row`
- `.ml__agent-input`
- `.ml__agent-apply-btn`

### 4. Separate fix: remove redundant Fill / Stroke reset icons

In [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js):

- remove the `#mlFillReset` button from the `Fill` property group
- remove the `#mlStrokeReset` button from the `Stroke` property group

Also remove the related event wiring for those two IDs.

Reason:

- the `Default` color dot already resets Fill
- the `Default` color dot already resets Stroke
- keeping both the dot and the icon reset is redundant and adds visual clutter

Important:

- do not remove the `Default` color dots
- do not remove reset icons from slider-based controls
- do not remove `Clear All`

### 5. Add new Motion Lab tips styles

Create a small, subdued instructional section that visually matches Motion Lab.

Recommended style direction:

- muted heading
- compact list spacing
- subtle border-top like the current bottom section
- tip text in `var(--si-text-muted)` or `var(--si-text-dim)`
- small icons in `var(--si-primary)` only if needed for emphasis

### 6. Ensure empty/loading and loaded states still feel balanced

After removing the AI box, check:

- Motion Lab with no SVG loaded
- Motion Lab after icon load
- smaller viewport heights

The bottom of the center column should still feel intentional and not awkwardly empty.

## Verification Checklist

### Structural checks

1. Motion Lab no longer shows `AI Agent`
2. no `Coming Soon` chip remains in that area
3. no textarea or generate button remains
4. Fill and Stroke no longer show redundant reset icons

### Behavioral checks

1. no dead AI button or input handler remains in JS
2. clicking presets, playback controls, and export controls still works normally
3. no console errors occur from removed DOM references
4. clicking the `Default` fill dot still resets fill correctly
5. clicking the `Default` stroke dot still resets stroke correctly

### UX checks

1. a new user can immediately understand how to start using Motion Lab
2. the tips are short enough not to feel noisy
3. the layout feels cleaner than before
4. the properties panel feels less cluttered around Fill and Stroke

### Regression checks

1. Motion Lab still opens correctly from an icon
2. bottom bar and properties panel spacing remain intact
3. no broken styles remain from removed AI classes
4. slider reset icons still work for non-color controls

## Files Expected To Change

- [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js)
- [style.css](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/style.css)

## Success Criteria

The change is successful when:

- the fake AI Agent box is fully removed
- Motion Lab feels more focused and trustworthy
- the new tip area helps users understand the core workflow quickly
- no dead event wiring or stale styles remain
