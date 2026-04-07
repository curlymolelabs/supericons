# Sidebar Icons V4 Refinement Plan

## Objective

Refine the `sidebar-icons_v4.html` demo so the changed icons feel more bespoke and meaning-driven, not like generic scale, shake, or expand motions.

Primary targets:

- `All Icons`
- `MingCute`
- `Motion Lab`

---

## Audit Findings

### 1. `All Icons` is currently too generic

Current state in [sidebar-icons_v4.html](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/dist/demo/bespoke/sidebar-icons_v4.html):

- uses the live Material Symbols `apps` glyph
- animates the whole glyph with one bounce transform

Why it falls short:

- the whole icon moves as one mass
- it reads like a generic bounce, not “many icons” or “catalog activity”
- the desired “dots blinking or flashing randomly” effect is not possible with the current font glyph as a single character

Root cause:

- the `apps` icon is currently a font glyph, not a multi-part SVG
- CSS cannot target the individual dots inside the font outline

### 2. `MingCute` still feels inherited from V3

Current state:

- still uses the reused V3 `unfurl` animation
- mostly scales and rotates as one unit

Why it falls short:

- it does not feel unique to the mark
- it reads as another “grow + settle” pattern
- it does not match your desired rapid vertical spin energy

### 3. `Motion Lab` is using the wrong visual treatment

Current state:

- uses the live `animation` symbol in the demo
- inherits the shared `.ms-icon` settings with `FILL 1`
- animates with a general bounce/rotate treatment

Why it falls short:

- it appears solid, but the symbol should read like a spring/coil
- the motion is not spring-like enough
- the animation currently feels like another whole-glyph wobble

Root cause:

- the shared `.ms-icon` class sets `font-variation-settings: 'FILL' 1`
- that makes both `apps` and `animation` render as filled Material Symbols by default

### 4. The current demo file location is fragile

Current file:

- [sidebar-icons_v4.html](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/dist/demo/bespoke/sidebar-icons_v4.html)

Issue:

- `dist/` is build output, not durable source
- any future build can overwrite or remove this work

Recommendation:

- move the source mock to `public/demo/bespoke/sidebar-icons_v4.html`
- let builds copy it into `dist/`

---

## Design Direction

Each icon should communicate its meaning through motion:

- `All Icons`: catalog activity, discovery, many small items waking up
- `MingCute`: elegant but fast vertical spin / flip energy
- `Motion Lab`: elastic coil compression and rebound

The motion language should feel:

- precise
- distinctive per icon
- short and readable
- less like a generic transform preset

---

## Recommended Fix

### 1. Rebuild `All Icons` as a custom SVG grid

Do not keep the `apps` font glyph for the animated demo version.

Instead:

- recreate the live `apps` icon as a custom SVG made of discrete tiles
- use 6 to 9 rounded rectangles or dots to match the current sidebar feel
- animate individual tiles with staggered opacity and tiny scale flashes

Recommended motion:

- on hover, tiles flicker in a pseudo-random sequence
- one or two tiles brighten first
- the rest follow with short stagger
- final state returns to normal

Important note:

- CSS cannot do true randomness here
- use carefully staggered delays so it feels random enough

Suggested effect:

- a `900ms` hover loop
- tile opacity: `0.45 -> 1 -> 0.7 -> 1`
- tiny scale pulse on selected tiles only
- optional subtle orange glow for the active state, but keep the icon mostly monochrome

### 2. Give `MingCute` a vertical spin treatment

Keep the existing SVG mark, but change the animation model.

Recommended motion:

- animate the main inner group with a rapid vertical-axis flip or spin
- use `rotateY(...)` or a simulated vertical flip via `scaleX(...)`
- settle back with a slight overshoot

Best practical approach:

- wrap the animated group in a dedicated class
- apply `transform-style: preserve-3d`
- use a short `420ms` to `520ms` burst
- avoid infinite spinning; use one crisp hover-triggered flourish

Recommended sequence:

- fast quarter-turn or half-turn feel
- compress slightly mid-flip
- return to rest cleanly

Why this is better:

- it feels more unique to the faceted, folded shape
- it avoids another generic enlarge-and-return cycle

### 3. Make `Motion Lab` outline-based and spring-driven

Do not leave it as a filled glyph in the demo.

Recommended fix:

- keep the same live `animation` icon family for consistency
- override only this icon to `FILL 0`
- keep `wght 400` or slightly lighter if needed

Motion direction:

- the coil should compress down slightly
- rebound upward
- settle with one or two damped oscillations

Recommended animation:

- `translateY + scaleY + scaleX`
- start neutral
- compress downward
- rebound above baseline
- damp back to neutral

Suggested timing:

- `520ms` to `650ms`
- spring easing with visible damping

If the Material Symbols outline still does not read clearly enough:

- fallback option is to replace it with a custom inline spring SVG
- but first try the outline version, since it stays closest to the live app icon

---

## Implementation Plan

### Phase 1: Make the demo durable

Before refining animation:

1. Copy `dist/demo/bespoke/sidebar-icons_v4.html` to `public/demo/bespoke/sidebar-icons_v4.html`
2. Treat the `public/` file as the source of truth
3. Rebuild after edits so the demo also appears in `dist/`

### Phase 2: Refactor icon markup

In the V4 demo:

- replace `All Icons` font glyph with a custom SVG grid
- keep `MingCute` SVG but add a dedicated animation target wrapper if needed
- keep `Motion Lab` as a Material Symbols element or replace only if the outline version still feels weak

### Phase 3: Replace generic motion with bespoke keyframes

Add three new dedicated motion systems:

- `v5-apps-blink`
- `v5-mingcute-vertical-spin`
- `v5-motionlab-spring`

Do not reuse old keyframes for these three icons.

### Phase 4: Tune icon styling

Specifically:

- set `Motion Lab` to `FILL 0`
- preserve current active/hover color behavior
- ensure custom SVG icons inherit `currentColor`
- keep icon sizing consistent with the rest of the sidebar

---

## Acceptance Criteria

The refinement is successful when:

- `All Icons` clearly reads as multiple small items activating, not one glyph bouncing
- `MingCute` has a crisp vertical spin / flip feel rather than a generic scale pulse
- `Motion Lab` reads as an outline spring/coil and bounces like elastic motion
- the updated icons still feel visually consistent with the unchanged V3-derived set
- the demo remains hover-responsive and does not look noisy or gimmicky

---

## Verification Plan

### Visual checks

Open the demo page and verify:

- default sidebar state still looks cohesive
- hover state on the three refined icons feels more bespoke than the current version
- `Motion Lab` is no longer filled
- no icon appears blurry, cropped, or visually heavier than its neighbors

### Motion checks

Verify:

- `All Icons` has a staggered blink/flash rhythm
- `MingCute` spins vertically and settles cleanly
- `Motion Lab` shows squash/rebound behavior instead of generic shake

### Regression checks

Confirm:

- unchanged icons still behave as before
- active `All Icons` row styling still works
- the layout and counts do not shift

---

## Recommendation

Proceed with a targeted V4.1 refinement focused only on these three icons.

That gives the biggest quality lift because these are the most visibly generic motions right now, and two of them are currently constrained by font-glyph structure rather than just animation timing.
