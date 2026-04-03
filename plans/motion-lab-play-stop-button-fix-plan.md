# Motion Lab Play/Stop Button Fix Plan

Date: 2026-04-04

Related audit:

- [audit-motion-lab-play-stop-button.md](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs/audit-motion-lab-play-stop-button.md)

Primary implementation file:

- [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js)

## Goal

Make the Motion Lab play/stop button reflect the real animation state at all times.

In plain terms:

- if no animation is active, the button should show `play_arrow`
- if an animation is active, the button should show `stop`
- toggling a preset off should immediately restore the default play state
- hover preview should not leave the play button in a false active state

## Non-Goals

This fix does not change:

- preset visuals
- export CSS or SVG format
- Motion Lab trigger semantics (`loop`, `hover`, `click`)
- timeline authoring behavior

This is a state-consistency fix only.

## Root Cause To Fix

Current bug:

- [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L4064) derives `hasAnimation` from `css.trim().length > 0`
- but [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L3856) always emits Motion Lab comment/header text
- so Motion Lab can treat "header-only CSS" as "real animation exists"

Secondary gap:

- play-button UI state is updated in several different places instead of one shared helper

## Implementation Strategy

### Phase 1. Create one real animation-state test

Add a small helper near the Motion Lab CSS/state utilities, for example:

- `hasMotionLabAnimationTracks()`

It should return `true` only when Motion Lab has at least one real animated track, for example:

- at least one track key in `motionLab.tracks`
- and at least one keyframe in one of those tracks

It must **not** use generated CSS text length.

Preferred rule:

```js
Object.values(motionLab.tracks).some(track => track?.keyframes?.length > 0)
```

Why:

- this directly answers the question the user cares about:
  "is there an animation active right now?"

### Phase 2. Add one shared play-button sync helper

Create a single helper, for example:

- `syncMotionLabPlayButton(hasAnimation, { preserveStopped = false } = {})`

Responsibility:

- update `motionLab.isStopped` when appropriate
- set the icon text to `stop` or `play_arrow`
- add/remove `.ml__play-btn--active`

Expected behavior:

- if `hasAnimation === false`
  - force default play state
  - icon: `play_arrow`
  - button: `.ml__play-btn--active`
  - `motionLab.isStopped = true`
- if `hasAnimation === true` and playback is live
  - icon: `stop`
  - button: remove `.ml__play-btn--active`
  - `motionLab.isStopped = false`

Important nuance:

- when the user explicitly presses stop, Motion Lab should still honor that stopped state
- so the helper should support a mode where animation exists but playback is intentionally paused

### Phase 3. Fix `generateAndInjectCSS()` to use real animation state

In [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L4064):

Replace:

```js
const hasAnimation = css.trim().length > 0;
```

With:

```js
const hasAnimation = hasMotionLabAnimationTracks();
```

Then update the play-button sync section to call the shared helper instead of inlining button text/class logic.

Expected result:

- if tracks are empty, the button always returns to `play_arrow`
- header-only CSS no longer fools the UI

### Phase 4. Normalize all "no animation" transitions

Any flow that transitions Motion Lab into an empty-animation state should call the shared sync helper explicitly.

Touch points to normalize:

1. Preset toggle-off
   - [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L4406)

2. Hover preview restore
   - [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L4392)

3. Reset Animation
   - [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L4231)
   - this one is already mostly correct; convert it to use the shared helper

4. Clear button
   - [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L2934)
   - explicitly set default play state after clearing

5. SVG load/reload
   - [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L3095)
   - normalize the play button after stale state is cleared and before any new preset is applied

6. Play button click handler
   - [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L4309)
   - keep explicit stop/resume behavior, but route the final button UI through the shared helper

### Phase 5. Keep stop behavior distinct from "no animation"

There are two different states that should not be conflated:

1. No animation exists
   - no preset active
   - no tracks
   - play button should show `play_arrow`

2. Animation exists but playback is stopped
   - tracks still exist
   - play button should also show `play_arrow`

The implementation should preserve both states correctly.

Suggested model:

- `hasAnimationTracks` answers whether animation exists
- `motionLab.isStopped` answers whether playback is currently paused

Display logic:

- no tracks -> `play_arrow`
- tracks + stopped -> `play_arrow`
- tracks + playing -> `stop`

This keeps the model honest and predictable.

## Suggested Code Shape

Keep the fix small and local:

1. Add:
   - `hasMotionLabAnimationTracks()`
   - `syncMotionLabPlayButton()`

2. Update:
   - `generateAndInjectCSS()`
   - clear/reset/load/play/preset handlers

3. Do not refactor unrelated Motion Lab code in this pass.

## Verification Plan

### Required functional checks

1. Apply one preset, then click it again.
   Expected:
   - preset button deselects
   - icon is static
   - play button shows `play_arrow`

2. Hover a preset without clicking, then move out.
   Expected:
   - prior state returns exactly
   - if no animation existed before hover, play button shows `play_arrow`

3. Apply preset, click `Stop`, then click preset again to clear it.
   Expected:
   - play button remains `play_arrow`

4. Apply preset, click `Reset Animation`.
   Expected:
   - play button shows `play_arrow`

5. Click `Clear`.
   Expected:
   - no stale stop state remains

6. Load a new icon after stopping or clearing an old one.
   Expected:
   - play button is normalized to default state

### Regression checks

1. Apply a preset normally.
   Expected:
   - play button shows `stop`

2. Click `Stop`, then click play again.
   Expected:
   - animation resumes
   - play button returns to `stop`

3. Export still works after applying a preset.
   Expected:
   - no export regression from the new state helpers

## Risks

### Risk 1. Breaking explicit stopped playback

If the helper is too aggressive, it could auto-flip the button to `stop` when the user intentionally paused playback.

Mitigation:

- keep `hasAnimationTracks` and `isStopped` as separate concepts
- only force default state when there are no tracks

### Risk 2. Hover preview unintentionally mutates persistent stop state

Hover preview should not permanently change play/stop when the user never committed a preset.

Mitigation:

- restore both tracks and button state from the pre-hover state

### Risk 3. Over-refactoring stable Motion Lab code

This bug is narrow. A broad refactor would create unnecessary regression risk.

Mitigation:

- keep the fix to small helpers plus targeted call-site updates

## Completion Criteria

This fix is complete when:

- toggling a preset off always restores the default play state
- hover-preview restore does not leave the play button lying
- clear/reset/load all normalize the play button
- the play button accurately reflects whether animation is present and playing
- syntax/build checks pass

## Proposed Deliverable

One small implementation pass in [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js), followed by verification of the six interaction cases above.
