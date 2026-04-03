# Motion Lab Play/Stop Button Audit

Date: 2026-04-04

## Scope

Audit the Motion Lab play/stop button behavior in relation to preset button interactions, especially this user-facing failure:

- click an animation preset to apply it
- click the same preset again to clear it
- play/stop button still shows `stop` instead of returning to the default `play_arrow` state

Files reviewed:

- [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js)

## Executive Summary

The main bug is real and the root cause is clear:

- the play/stop button state is derived from `hasAnimation = css.trim().length > 0`
- but `generateFullCSS()` always returns a non-empty string because it always includes the Motion Lab comment header, even when there are no animation tracks
- so Motion Lab can report "animation exists" when there is actually no animation at all

This means the play/stop button can incorrectly stay in the `stop` state after:

- toggling a preset off
- hover-previewing a preset and moving out
- other flows that call `generateAndInjectCSS()` while `motionLab.tracks` is empty and `motionLab.isStopped` is still `false`

There are also secondary state gaps:

- some reset/clear/load flows do not explicitly sync the play button
- different Motion Lab flows rely on different sources of truth (`tracks`, `activePreset`, `isStopped`, generated CSS contents)
- only some flows update the button directly, while others rely on `generateAndInjectCSS()` to infer state

## Findings

### 1. Primary Root Cause: `hasAnimation` is computed from non-empty CSS, not real animation state

In [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L4064), `generateAndInjectCSS()` does:

```js
const css = generateFullCSS(true);
const hasAnimation = css.trim().length > 0;
```

But in [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L3856), `generateFullCSS()` always emits:

- `/* Supericons Motion Lab */`
- `/* Animation: ... */`

even before checking whether any tracks exist.

So when `motionLab.tracks` is empty:

- `css` is still non-empty
- `hasAnimation` becomes `true`
- the play button is forced into the `stop` state

This is the main logic bug.

### 2. Toggling a preset off clears tracks, but still routes through the broken `hasAnimation` check

In [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L4406), clicking an already-active preset does:

```js
motionLab.activePreset = null;
motionLab.tracks = {};
generateAndInjectCSS();
```

This is conceptually correct. The issue is that `generateAndInjectCSS()` then uses the broken CSS-length heuristic, so the UI can still show `stop` even though the preset was successfully cleared.

This matches the user-reported symptom directly.

### 3. Hover preview can also leave the button in a false "stop" state

In [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments\Apps\DailySprint\supericons/store.js#L4382), hover preview temporarily applies a preset.

On mouseout in [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments\Apps\DailySprint\supericons/store.js#L4392), Motion Lab restores the saved state and calls:

```js
generateAndInjectCSS();
```

If the pre-hover state had no animation tracks:

- `savedTracks` restores to empty
- `generateAndInjectCSS()` still sees non-empty comment/header CSS
- play/stop can remain on `stop`

So this is not just a click-toggle bug. The hover preview path has the same underlying defect.

### 4. State ownership is split across too many signals

The current behavior depends on several overlapping pieces of state:

- `motionLab.tracks`
- `motionLab.activePreset`
- `motionLab.isStopped`
- whether generated CSS text is empty or not

These are not treated consistently as a single authoritative source of truth.

Examples:

- `applyPreset()` in [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments\Apps\DailySprint\supericons/store.js#L5491) assumes applying a preset should force playback
- the play button click handler in [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments\Apps\DailySprint\supericons/store.js#L4309) explicitly changes the icon text and class
- the reset animation handler in [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments\Apps\DailySprint\supericons/store.js#L4231) also explicitly sets the play button to `play_arrow`
- but preset toggle-off and hover preview rely on `generateAndInjectCSS()` to infer state indirectly

This split ownership is why the UI drifts.

### 5. Clear and reload flows do not fully normalize play-button state

In the clear button handler in [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments\Apps\DailySprint\supericons/store.js#L2934):

- Motion Lab clears tracks and active preset
- removes the style tag
- resets some controls
- but does not explicitly reset `motionLab.isStopped`
- and does not explicitly sync `#mlPlayBtn`

Similarly, in `loadSvgIntoMotionLab()` at [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments\Apps\DailySprint\supericons/store.js#L3095):

- stale animation state is partially cleared
- but there is no explicit play-button reset at load time

If a previous icon/session left the button in a stopped/playing visual state, a fresh load depends on later side effects to clean it up.

### 6. Reset Animation flow is more robust than other flows, which confirms the gap

The reset animation handler in [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments\Apps\DailySprint\supericons/store.js#L4268) explicitly does the right thing:

- sets `motionLab.isStopped = true`
- sets the icon text to `play_arrow`
- adds the stopped visual class

This is the clearest proof that the app already knows how to restore the correct play-button state. The gap is that not all non-animated states use the same normalization path.

## User Impact

From the user point of view, the button is lying.

When no animation is active, the user expects:

- preset button looks deselected
- icon is static
- play button shows the default play state

Instead, Motion Lab can show:

- no preset active
- no visible animation
- but play button still says `stop`

That creates confusion about:

- whether an animation is still active
- whether playback is stuck
- whether export would still include animation

This weakens trust in the Motion Lab controls.

## Root Cause Statement

The primary root cause is:

- play/stop state is inferred from the presence of generated CSS text
- generated CSS text is non-empty even when there are zero animation tracks

Secondary architectural gap:

- play-button UI state is not normalized through one shared helper across all preset/reset/hover/clear/load flows

## Recommended Fix Direction

### Fix the real animation-state test

Do not use:

```js
const hasAnimation = css.trim().length > 0;
```

Instead, base animation state on something real, such as:

- `Object.keys(motionLab.tracks).length > 0`
- and/or at least one track with at least one keyframe

That should determine whether Motion Lab is in an animated state.

### Add one shared play-button sync helper

Create one helper responsible for syncing:

- `motionLab.isStopped`
- play icon text (`stop` vs `play_arrow`)
- `.ml__play-btn--active`

Then call that helper from:

- preset apply
- preset toggle-off
- hover preview restore
- reset animation
- clear
- SVG load/reload
- play button click

### Prefer explicit normalization when animation state becomes empty

Whenever Motion Lab transitions to "no active animation":

- empty tracks
- no active preset
- style stripped

the UI should explicitly return to the default play state, rather than relying on downstream inference.

## Suggested Verification Cases

1. Load an icon, click one preset, click it again.
   Expected: no active preset, no animation, play button shows `play_arrow`.

2. Hover a preset without clicking, then move out.
   Expected: previous state is restored exactly; if no animation existed before hover, play button remains `play_arrow`.

3. Click `Reset Animation`.
   Expected: play button shows `play_arrow`.

4. Click `Clear`.
   Expected: Motion Lab returns to a clean default play state.

5. Load a second icon after stopping or clearing the first.
   Expected: play button starts in a correct, normalized state.

6. Apply a preset, click stop, then toggle preset off.
   Expected: play button remains/returns to `play_arrow` consistently.

## Conclusion

This is not a visual-only bug. It is a state-model bug.

The preset buttons and play/stop button are not currently driven by one clean animation-state source of truth. The most important correction is to stop treating "non-empty CSS string" as proof that animation exists. Once that is fixed and the play-button sync is centralized, the toggle-off behavior should become consistent.
