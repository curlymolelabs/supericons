# Motion Lab Stop/Deselect Preset Audit

Date: 2026-04-04

## Scope

Audit the Motion Lab behavior for this user-facing expectation:

- click an animation preset to apply it
- click `stop`
- the selected animation button should immediately be released from its selected state

Files reviewed:

- [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js)

## Executive Summary

The current Motion Lab behavior is internally consistent as a "pause playback" model, but it does not match the user's mental model.

Today:

- preset button selection is treated as "last applied preset"
- the play/stop button is treated as "playback state"

So when the user clicks `stop`:

- the animation CSS is stripped from the preview
- the play button changes back to `play_arrow`
- but the preset button stays selected
- and `motionLab.activePreset` remains set

That means the UI is representing two different truths at the same time:

- playback says "stopped"
- preset selection says "this animation is still active"

This is the core mismatch.

## Findings

### 1. Stop currently pauses playback, but does not deselect the preset

In the play button handler in [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L4324), clicking stop does this:

```js
motionLab.isStopped = true;
if (styleEl) styleEl.textContent = getMotionLabBaseTransformCss('mlPreview');
syncMotionLabPlayButton({ hasAnimation: true, isStopped: true });
```

It does **not**:

- remove `.active` from preset buttons
- clear `motionLab.activePreset`
- clear `motionLab.tracks`

So stop only pauses rendering. It does not release preset state.

### 2. Preset button selection and play/stop are driven by different state models

Preset selection is handled in the delegated preset click flow in [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L4426):

- clicking a preset adds `.active`
- toggling that same preset off removes `.active` and clears tracks

But the play/stop button works independently in [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L4318):

- it changes the preview CSS
- it changes the button icon
- it does not normalize preset selection

This split is why the user can end up with:

- no visible animation running
- a preset button still highlighted

### 3. Clearing only the orange highlight would be an incomplete fix

It would be tempting to only remove the `.active` class from preset buttons when stop is clicked.

That would be incomplete, because `motionLab.activePreset` is still used elsewhere, especially here:

- intensity slider in [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L4166)
- intensity reset in [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L4194)

Those flows call:

```js
applyPreset(motionLab.activePreset, true);
```

So if stop only clears the visual highlight:

- the preset would appear deselected
- but Motion Lab would still internally treat it as the active preset
- slider changes could silently re-apply a preset the user thinks is no longer selected

That would create a worse hidden-state bug.

### 4. Play-after-stop semantics are currently "resume hidden preset"

Because stop does not clear tracks or `activePreset`, clicking play after stop resumes the previously applied animation.

That behavior only makes sense if the selected preset button remains visibly active.

If the desired UX is:

- stop means "release the selected animation button"

then the hidden resume behavior becomes a mismatch too.

### 5. Current Motion Lab does not have a separate custom timeline model worth preserving here

At the moment, Motion Lab is primarily preset-driven:

- `applyPreset()` writes the preset keyframes into `motionLab.tracks` in [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L5502)
- the preset name is also stored in `motionLab.activePreset`

There is not yet a rich user-authored timeline system that would justify preserving a hidden paused preset after stop.

That means the simpler user-facing rule is also the safer one:

- if stop is clicked, clear the current preset-backed animation session

## Recommendation

Use a single user-facing rule:

- a highlighted preset button means that preset is currently active in Motion Lab
- clicking `stop` should clear that active preset state immediately

That implies stop should do more than pause CSS.

Recommended stop behavior:

1. remove `.active` from all preset buttons
2. set `motionLab.activePreset = null`
3. clear `motionLab.tracks`
4. set `motionLab.isStopped = true`
5. restore base transform CSS only
6. sync the play button back to `play_arrow`

This makes the UI truthful:

- no animation playing
- no preset selected
- no hidden preset ready to silently resume

## Why this matches the user's expectation

What the user cares about is simple:

- if the preset button is lit up, that animation is currently in effect
- if they press stop, that should no longer be true

The current behavior violates that rule.

The recommended fix restores it cleanly.

## Risk Notes

This is a behavior change, not just a visual patch.

After the fix:

- clicking stop will no longer act like "pause and resume the same preset"
- clicking play afterward should not resume a cleared preset, because there is no active animation left

That is acceptable if Motion Lab is treated as preset-driven, which is how the current product behaves.

If true pause/resume semantics are desired later, they should be introduced as a separate explicit mode rather than hidden behind a deselected preset.
