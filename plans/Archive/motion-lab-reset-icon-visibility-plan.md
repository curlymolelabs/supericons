# Motion Lab Reset Icon Visibility Plan

## Problem

The small reset icons beside Motion Lab controls are too easy to miss.

Right now, the main per-control reset button style in [style.css](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/style.css#L6036) is:

```css
.ml__ctrl-reset {
  color: var(--si-text-dim);
  opacity: 0;
}
.ml__slider-row:hover .ml__ctrl-reset {
  opacity: 1;
}
```

That means users often do not realize the reset control exists until they hover the exact row.

The user goal is simple:

- the reset icon should stay subtle
- but it should still be visible enough that users know it is there
- and it should work in both dark and light mode

## Goal

Make Motion Lab reset icons discoverable by default while keeping them visually quiet and theme-safe.

## Scope

Primary target:

- `.ml__ctrl-reset`

This covers the small per-control reset icons used beside:

- `Fill`
- `Stroke`
- `Intensity`
- `Speed`
- element property sliders such as `Scale`, `Rotate`, and `Opacity`

Related-but-separate controls:

- `.ml__reset-btn` (`Clear All`)
- `.ml__reset-anim-btn` (animation reset in bottom bar)

These are already visible and are not the main issue described here, so they do not need to be changed in this pass unless visual consistency review later suggests it.

## Design Direction

### 1. Keep reset icons always visible

Do not hide them with `opacity: 0` by default.

Instead:

- use a faint default appearance
- strengthen on row hover
- strengthen further on button hover/focus

This preserves subtlety without making the control effectively invisible.

### 2. Use existing theme tokens, not hardcoded colors

Use Supericons text tokens so the result works in both dark and light themes.

Recommended token direction:

- default state: `var(--si-text-muted)` or a reduced-opacity version of it
- hovered row: slightly stronger text token or higher opacity
- button hover/focus: `var(--si-primary)`

This avoids maintaining separate dark/light overrides for a tiny control.

### 3. Improve discoverability through opacity and background, not size

Do not enlarge the icon in this pass.

Keep:

- existing size
- existing layout
- existing hit target

Only adjust:

- visibility
- color
- background on hover/focus

That keeps the change low-risk and prevents layout shifts.

## Proposed Styling Changes

### Current behavior

- hidden by default
- only visible when the whole row is hovered
- bright primary color only on direct hover

### Proposed behavior

- faintly visible by default
- more visible when the row is hovered
- fully visible with primary highlight on direct hover/focus

Suggested visual ladder:

1. Default:
   - `color: var(--si-text-muted)`
   - low-to-medium opacity such as `0.45` to `0.6`

2. Row hover:
   - opacity increases to around `0.75` to `0.9`
   - optional subtle background tint

3. Button hover/focus-visible:
   - `color: var(--si-primary)`
   - existing orange hover background can stay or be slightly refined

## Implementation Steps

### 1. Update `.ml__ctrl-reset` in [style.css](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/style.css)

Change the default state so it is no longer fully hidden.

Specifically:

- remove `opacity: 0`
- set a faint visible opacity
- switch base color to a token intended for subdued-but-readable UI

### 2. Update `.ml__slider-row:hover .ml__ctrl-reset`

Instead of acting as a hidden/show toggle, make this a subtle emphasis state.

Example intent:

- raise opacity
- optionally lift contrast slightly

### 3. Keep `.ml__ctrl-reset:hover` as the strong interactive state

The current primary-color hover treatment is directionally correct.

Review whether:

- the current orange tint background is enough
- `:focus-visible` should match hover for keyboard discoverability

### 4. Verify in both themes

Check:

- dark mode: icon is faint but clearly present
- light mode: icon is still visible and not washed out

### 5. Regression-check all slider rows

Confirm the change works consistently for:

- playback rows (`Intensity`, `Speed`)
- property rows (`Scale`, `Rotate`, `Opacity`)
- fill/stroke reset controls in the properties panel

## Files Expected To Change

- [style.css](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/style.css)

No markup changes should be needed for this pass.

## Verification Checklist

### Visual checks

1. Open Motion Lab in dark mode
2. Load any icon
3. Confirm reset icons are visible before hovering rows
4. Confirm they become clearer on row hover
5. Confirm they become clearly interactive on direct hover

Repeat in light mode.

### UX checks

1. Users can tell reset controls exist without hunting for them
2. The controls still feel secondary, not visually noisy
3. No control row shifts or spacing changes occur

## Success Criteria

The change is successful when:

- reset icons are visible enough to be discovered immediately
- they remain subtle in the default state
- hover/focus still provides a clear interaction cue
- the result looks correct in both dark and light mode without separate hardcoded palettes
