# Motion Lab Rotating Tips Panel Plan

## Goal

Replace the current bottom-area placeholder in Motion Lab with a rotating content panel that:

- starts as a helpful `Quick Tips` surface
- can fade between messages automatically
- can later be repurposed into an advert / promo panel without another structural rewrite

This should be designed as a reusable content slot, not a one-off tips widget.

## Why This Direction Is Better

If this area will later become an advert panel, the right design now is:

- one reusable panel shell
- one rotating content system
- different content sources over time

That avoids building:

1. a static tips box now
2. then deleting it later
3. then rebuilding a promo/rotation component from scratch

Instead, we build the container once and swap the content model later.

## Product Intent

### Phase 1

Use the panel for rotating Motion Lab guidance:

- how to preview presets
- how to adjust properties
- how export triggers work
- how to finish export

### Phase 2

Use the same panel for:

- premium feature promos
- MCP workflow reminders
- new animation pack announcements
- “try this motion” highlights

## UX Principles

### 1. Keep it subtle

This is a support surface, not the star of Motion Lab.

The animation should feel:

- calm
- elegant
- low-distraction

No aggressive carousel behavior.

### 2. One message at a time

Do not show multiple cards or a busy slider.

Show:

- one title
- one short body line
- optional tiny meta label or dot indicator

### 3. Fade and slight motion only

The transition should be:

- fade out
- slight translate / rotate
- fade in

Keep it restrained so it feels premium, not gimmicky.

### 4. Manual reading must win over auto-rotation

If the user hovers the panel, auto-rotation should pause.

If the user is interacting nearby, the panel should not feel rushed.

## Recommended Motion Style

For each content change:

- current message fades out
- shifts up a few pixels or rotates by 1–2 degrees
- next message fades in and settles

Recommended characteristics:

- interval: `4.5s` to `6s`
- transition duration: `300ms` to `450ms`
- easing: soft ease
- rotation: tiny, optional, around `1deg`

This should feel like “quiet product polish.”

## Architecture Recommendation

Build this as a generic Motion Lab rotating panel.

### Suggested model

One panel component / render block with:

- static shell
- message list array
- active index
- timer
- pause-on-hover behavior

### Suggested content object shape

```js
{
  kind: 'tip',
  title: 'Preview instantly',
  body: 'Click or hover an animation button to preview it.',
  tone: 'neutral'
}
```

Later this can support:

```js
{
  kind: 'promo',
  eyebrow: 'New',
  title: 'Use Motion Lab with MCP',
  body: 'Search, animate, and export icons from your own agent workflow.',
  ctaLabel: 'Learn more'
}
```

Important:

Do not hardcode the panel around only “tips.”

Hardcode the initial content list, but design the panel to support future promo entries.

## Content Strategy for Phase 1

Start with 4–6 concise tips.

Recommended initial set:

1. `Preview instantly`
   `Click or hover an animation button to preview it.`

2. `Adjust the icon`
   `Use Fill, Stroke, Size, Rotate, and Fade on the right.`

3. `Choose playback`
   `Loop, Hover, and Click change how your export will behave.`

4. `Export when ready`
   `Download SVG or copy CSS once the motion looks right.`

5. `Reset anytime`
   `Use the small reset icons to restore a control to its default.`

Optional sixth:

6. `Try layering`
   `Different presets can create very different moods for the same icon.`

## Layout Recommendation

Replace the removed AI Agent area with:

- a slim bordered panel
- one small header such as `Quick Tips`
- one rotating message body
- subtle dot indicators or a tiny status line

Possible structure:

- `.ml__rotating-panel`
- `.ml__rotating-panel-head`
- `.ml__rotating-panel-body`
- `.ml__rotating-panel-title`
- `.ml__rotating-panel-copy`
- `.ml__rotating-panel-dots`

Keep the footprint similar to the current bottom area so Motion Lab layout does not shift dramatically.

## Interaction Rules

### Auto-rotation

- starts automatically when Motion Lab is visible
- rotates every few seconds

### Pause behavior

- pause when user hovers the panel
- resume when hover ends

### Accessibility

- do not rotate too fast
- avoid flashing
- consider respecting reduced motion

If reduced motion is enabled:

- disable animated transitions
- optionally keep the first message static

## Future Advert / Promo Readiness

The panel should be built so later we can swap tips for:

- premium collection promotions
- new feature callouts
- MCP guidance
- upgrade nudges

To make that easy:

1. separate content data from rendering logic
2. keep styles generic, not tip-specific
3. avoid naming the whole system only around “tips”

Recommended compromise:

- visible label can be `Quick Tips` for now
- internal implementation should still be generic rotating-panel logic

## Implementation Steps

### 1. Remove static AI section

As planned in [motion-lab-ai-removal-and-tips-plan.md](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/plans/motion-lab-ai-removal-and-tips-plan.md):

- remove AI markup
- remove AI event logic
- remove AI-specific styles

### 2. Add rotating panel markup

In [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js):

- add a generic panel shell in the bottom area
- render one active message at a time
- include optional dots / progress indicator

### 3. Add content list

Create a small array of starter messages in JS.

Keep it easy to replace later with promos.

### 4. Add rotation controller

Implement:

- active index tracking
- interval timer
- hover pause / resume
- safe re-init when Motion Lab reopens

### 5. Add subtle transition styling

In [style.css](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/style.css):

- style the panel
- add fade/translate/rotate transitions
- keep it theme-safe
- respect reduced motion

### 6. Verify layout and behavior

Check:

- no SVG loaded
- SVG loaded
- small viewport height
- dark mode
- light mode

## Verification Checklist

### Functional

1. Motion Lab opens without the old AI box
2. the new panel renders correctly
3. messages rotate automatically
4. hover pauses the rotation
5. leaving hover resumes rotation

### Visual

1. transition feels calm and premium
2. panel does not distract from the main animation stage
3. text remains readable in dark and light mode

### Accessibility

1. reduced-motion users are not forced into animated content rotation
2. content remains readable without rushing

### Future-proofing

1. content source can later be changed from tips to promos without changing layout structure
2. the naming/classes do not lock the component into “tips only”

## Files Expected To Change

- [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js)
- [style.css](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/style.css)

## Success Criteria

The change is successful when:

- the old AI box is gone
- Motion Lab gains a polished rotating help panel
- the panel helps users now
- the same slot can later become a promo/advert panel with minimal rework
