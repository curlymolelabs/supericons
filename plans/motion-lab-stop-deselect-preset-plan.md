# Motion Lab Stop/Deselect Preset Fix Plan

Date: 2026-04-04

Related audit:

- [audit-motion-lab-stop-deselect-preset.md](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs/audit-motion-lab-stop-deselect-preset.md)

Primary implementation file:

- [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js)

## Goal

When the user clicks `stop` in Motion Lab:

- any selected animation preset button should immediately lose its selected state
- the current preset-backed animation should be cleared
- the play button should return to the default `play_arrow` state

In user terms:

- highlighted preset means active animation
- stop means that active animation is no longer active

## Non-Goals

This fix does not change:

- preset visuals
- exported CSS or SVG format
- preset definitions
- trigger semantics (`loop`, `hover`, `click`)

This fix also does **not** introduce a separate pause/resume mode for hidden preset state.

## Product Rule To Implement

Adopt one simple rule:

- if a preset button is active, that preset is currently applied
- if the user clicks `stop`, no preset should remain applied

That means `stop` should behave like a full preset disengage, not just a visual playback pause.

## Implementation Strategy

### Phase 1. Add one shared preset-button deselect helper

Near the existing Motion Lab UI sync utilities, add a small helper, for example:

- `clearMotionLabPresetSelection()`

Responsibility:

- remove `.active` from all `.ml__preset-btn`

Why:

- this logic already exists inline in multiple places
- stop should use the same exact deselection path as other reset flows

### Phase 2. Add one shared "clear active preset animation" helper

Create one helper, for example:

- `clearMotionLabActivePresetAnimation({ keepBaseCss = true } = {})`

Responsibility:

1. call `clearMotionLabPresetSelection()`
2. set `motionLab.activePreset = null`
3. set `motionLab.tracks = {}`
4. set `motionLab.isStopped = true`
5. restore base transform CSS if needed
6. call `syncMotionLabPlayButton({ hasAnimation: false, isStopped: true })`

Why:

- stop, toggle-off, reset, and clear should not each hand-roll slightly different "empty state" logic

### Phase 3. Update the play/stop button stop path

In the stop branch of the play button handler in [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L4338):

Replace the current pause-only logic with the shared clear helper.

Current problem:

- it only removes animation CSS
- it leaves active preset state behind

New behavior:

- clicking stop should fully clear the current preset-backed animation session

Expected result:

- active preset button immediately deselects
- no hidden preset remains available to silently resume

### Phase 4. Keep preset toggle-off behavior aligned

The preset click-toggle path already behaves similarly:

- deselect buttons
- clear tracks
- clear active preset

Refactor that path to use the same shared clear helper.

Touch point:

- [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L4442)

Why:

- stop and toggle-off should end in the same empty state

### Phase 5. Normalize reset and clear flows onto the same helper

Refactor these flows to use the shared clear helper too:

1. `Reset Animation`
   - [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L4247)

2. `Clear`
   - [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L2934)

This ensures all "back to empty motion state" transitions produce the same UI:

- no selected preset
- no active tracks
- play button reset

### Phase 6. Preserve preview hover behavior without leaking selected state

Hover preview should continue to:

- temporarily apply a preset on hover
- restore the prior state on mouseout

But if the prior state is empty:

- no preset button should remain selected afterward

So after hover restore, ensure the restored preset selection and active state remain truthful.

Touch points:

- [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L4399)
- [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L4410)

### Phase 7. Make play-after-stop behavior explicit

After this fix:

- stop leaves Motion Lab with no active preset and no active tracks
- clicking play after stop should therefore do nothing except stay in default play state

This is intentional.

It prevents a hidden preset from resuming when no preset button is selected.

## Verification Checklist

### Core behavior

1. Load an icon into Motion Lab.
2. Click `Bounce`.
3. Confirm:
   - `Bounce` button becomes active
   - play button shows `stop`
4. Click `stop`.
5. Confirm:
   - `Bounce` button immediately loses active state
   - play button shows `play_arrow`
   - no animation remains active

### Repeat with another preset

1. Click `Glide`.
2. Confirm `Glide` becomes active.
3. Click `stop`.
4. Confirm `Glide` deselects immediately.

### Toggle-off equivalence

1. Click `Magnetic`.
2. Click `Magnetic` again.
3. Confirm final state matches the stop flow:
   - no active preset
   - no tracks
   - play button at `play_arrow`

### Play-after-stop

1. Click a preset.
2. Click `stop`.
3. Click `play`.
4. Confirm:
   - no hidden preset resumes
   - no preset button becomes active by itself
   - play button remains in default state

### Reset and clear parity

1. Apply a preset.
2. Click `Reset Animation`.
3. Confirm no preset is selected.
4. Apply a preset again.
5. Click `Clear`.
6. Confirm no preset is selected and Motion Lab returns cleanly.

## Expected Outcome

After this fix, Motion Lab will follow the rule the user expects:

- selected preset means active animation
- stop means no active animation

That makes the control model simpler, more honest, and easier to trust.
