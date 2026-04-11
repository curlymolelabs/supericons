# Motion Lab Agent Guidance

Date: April 11, 2026
Status: Active
Audience: Developers and AI coding agents using Motion Lab through MCP
Depends on:
- `docs/motion-lab-agent-library-prd.md`
- `docs/plans/agent-metadata-schema.md`
- `data/motion-lab-preset-metadata.json`

## Why this guide exists

Humans can browse Motion Lab visually. Agents usually cannot.

This guide helps an agent make strong first-pass motion choices using the same 80 Motion Lab presets available in the browser. It is meant to improve selection quality before deeper recommendation tooling exists.

## What an agent should do first

Use this order:

1. Call `list_motion_presets` to see the full preset set.
2. Filter by `group`, `supported_triggers`, and `export_compatibility`.
3. Narrow by `recommended_contexts` and `avoid_for`.
4. Compare `visual_character` and `emotional_tone` across the remaining candidates.
5. Use `get_motion_recipe` on the strongest candidates before export.
6. Export with `export_motion_css`, `export_animated_svg`, or `animate_icon` only after the preset, trigger, and output path are settled.

## Current Motion Lab surface

The shared Motion Lab library currently includes 80 presets in 4 groups:

- `Motion`: 25 presets
- `Entrances`: 15 presets
- `Exits`: 15 presets
- `Special`: 25 presets

Today all 80 presets support:

- `loop`
- `hover`
- `click`
- CSS export
- animated SVG export

Even so, agents should still inspect `export_compatibility` first. That keeps the workflow safe if export support changes later for any preset.

## How to read the metadata

The metadata has two jobs.

### Hard-rule fields

Use these as constraints:

- `group`
- `supported_triggers`
- `default_duration_ms`
- `duration_range_ms`
- `default_intensity_percent`
- `intensity_range_percent`
- `export_compatibility`
- `technical_output_notes`

These fields help an agent avoid unsupported or low-quality output.

### Guidance fields

Use these to compare candidates:

- `visual_character`
- `emotional_tone`
- `recommended_contexts`
- `avoid_for`

These fields should guide choice, not overrule product judgment. If two presets both fit technically, these fields help the agent choose the one that better matches the UI mood and interaction goal.

## Choose the right group first

Start with the group before comparing individual presets.

### Motion

Use `Motion` when the icon stays visible and the animation may repeat.

Best fit:

- hover affordances
- ambient emphasis
- loading
- subtle feedback

Strong examples:

- `glide` for restrained directional movement
- `breathe` for calm ambient emphasis
- `ring` for notification-style motion
- `radar` for scanning or analysis states

Avoid this group when you need a clear one-time reveal or exit.

### Entrances

Use `Entrances` when an icon is arriving, appearing, or being introduced.

Best fit:

- onboarding
- reveal moments
- first appearance
- staged UI entry

Strong examples:

- `fadeIn` for product-safe reveal
- `magneticIn` for polished feature reveal
- `glitchOn` for digital or security-heavy arrival
- `bloom` for upbeat appearance moments

Avoid this group for persistent hover states. These presets read best as single-play entry actions.

### Exits

Use `Exits` when an icon is leaving, dismissing, or resolving out of view.

Best fit:

- dismissals
- state handoff
- navigation transitions
- removal moments

Strong examples:

- `slideOut` for directional departure
- `fadeOut` for low-drama resolution
- `vortex` for more stylized disappearance
- `glitchOff` for digital shutdown or disconnect moments

Avoid this group for ongoing ambient motion.

### Special

Use `Special` when the interaction needs distinct personality, stronger metaphor, or branded emphasis.

Best fit:

- premium moments
- feature highlights
- celebratory UI
- signature product interactions

Strong examples:

- `sweep` for precise premium polish
- `typing` for staged reveal
- `sparkle` for cheerful highlight
- `fingerprint` for identity or security flows
- `supernova` for strong celebratory moments

Start here only when the UI really needs a stronger signature. If the product surface is restrained, `Motion` or `Entrances` will usually be the better first pass.

## Match the preset to the interface intent

Use the context tags as a quick filter.

| Interface intent | Strong starting presets | Notes |
|---|---|---|
| Professional navigation or settings | `sweep`, `glide`, `fadeIn`, `typing` | Favor restrained motion and lower intensity |
| Analytics or scanning UI | `radar`, `sweep`, `glide`, `fingerprint` | Prefer precise, directional, or scanning-like motion |
| Notifications and alert cues | `ring`, `shake`, `tremor`, `beacon` | Use sparingly; these presets can overwhelm calm surfaces |
| Success or celebratory moments | `sparkle`, `bloom`, `supernova`, `pop` | Escalate from soft delight to full celebration based on context |
| Security and authentication | `fingerprint`, `radar`, `glitchOn`, `shake` | Favor precise or mechanical motion over playful choices |
| Empty states and loading | `breathe`, `float`, `pulse`, `radar` | Prefer longer durations and lower intensity |

## Use tone to break ties

When two presets fit the same context, tone usually decides the better choice.

Examples:

- Choose `sweep` over `bounce` when the UI needs to feel professional, precise, and low-drama.
- Choose `glide` over `shake` when the goal is polished navigation rather than an alert state.
- Choose `sparkle` over `supernova` when the UI should feel premium and cheerful rather than explosive.
- Choose `fadeIn` over `glitchOn` when the entry should feel calm and product-safe.

## Trigger guidance

### `hover`

Best for:

- navigation icons
- settings icons
- toolbars
- subtle discovery cues

Good presets:

- `glide`
- `sweep`
- `typing`
- `pulse`

Avoid loud presets on hover unless the surface is intentionally playful.

### `click`

Best for:

- direct user confirmation
- action buttons
- toggle moments
- strong feedback

Good presets:

- `bounce`
- `pop`
- `tap`
- `ring`

Use shorter duration and tighter intensity than you would for looping motion.

### `loop`

Best for:

- loading
- ambient states
- premium detail
- persistent scanning or emphasis

Good presets:

- `breathe`
- `float`
- `radar`
- `spin`

Keep looping motion comfortable. If the user may see it for more than a second or two, err on the restrained side.

## Intensity and duration guidance

Agents should not default to the highest allowed values.

Use the preset-specific ranges in metadata, then bias downward unless the interface clearly calls for stronger motion.

### Safe default behavior

- Start from `default_intensity_percent`.
- Stay inside `intensity_range_percent`.
- Use the lower half of the range for professional product UI.
- Move toward the upper half only for celebratory, attention-seeking, or theatrical moments.

### Group-level rule of thumb

- `Motion`: optimize for comfort across repeated use
- `Entrances`: allow stronger peaks because the motion plays once
- `Exits`: similar to entrances, but keep the departure readable
- `Special`: calibrate individually; this group varies the most

### Practical examples

- A fintech dashboard nav icon should start closer to `sweep` or `glide` at modest intensity, not `bounce` or `supernova`.
- A success badge can tolerate stronger values on `sparkle` or `bloom` because the motion is short-lived.
- A loading spinner using `spin` or `radar` should use comfort-first timing so it remains readable over time.

## CSS vs animated SVG

Use `export_compatibility` to confirm the preset supports the output path, then choose based on the integration surface.

### Prefer CSS export when:

- the host app already owns the SVG markup
- you want animation separated from markup
- the icon needs to inherit surrounding CSS or app-level styling
- you are integrating into a component system

### Prefer animated SVG when:

- you want one portable self-contained asset
- the result needs to travel outside the app codebase
- you want a single artifact for email, docs, or design handoff

If both outputs are supported, CSS is usually the better fit for product implementation and animated SVG is usually the better fit for asset portability.

## Use technical notes before committing

`technical_output_notes` exist to stop avoidable mistakes.

Common patterns:

- some presets read better on icons with a clear directional silhouette
- some presets become noisy at high intensity
- some presets depend on opacity, clip-path, or filter behavior reading clearly

If a note says a preset reads poorly on dense or radial icons, treat that as a real warning rather than a soft suggestion.

## Recommended agent workflow

For a new task, use this decision path:

1. Identify the interaction goal.
2. Choose the group that matches the job: ongoing motion, arrival, exit, or signature moment.
3. Filter candidates by context tags.
4. Remove candidates that appear in `avoid_for`.
5. Compare tone and visual character.
6. Confirm trigger support.
7. Start from the preset default intensity and duration.
8. Check technical notes.
9. Choose CSS or animated SVG based on the host environment.
10. Export only after the preset rationale is clear.

## Worked examples

### Example 1: Professional dashboard hover motion

Goal: add motion to sidebar icons in a fintech dashboard.

Good first candidates:

- `sweep`
- `glide`
- `typing`

Reasoning:

- all three suit navigation or settings
- all three read as precise or restrained
- none push the UI toward a playful or noisy feel

Likely avoid:

- `bounce`
- `shake`
- `supernova`

### Example 2: Security login confirmation

Goal: animate an authentication or identity icon without making it childish.

Good first candidates:

- `fingerprint`
- `radar`
- `glitchOn`

Reasoning:

- the tone is precise, professional, or mechanical
- the contexts align with `security-auth`
- the motion feels intentional rather than decorative

### Example 3: Success and celebration

Goal: celebrate a completed action in a warmer surface.

Good first candidates:

- `sparkle`
- `bloom`
- `supernova`

How to choose:

- `sparkle` for premium polish
- `bloom` for a friendly arrival feel
- `supernova` for the strongest celebratory burst

### Example 4: Ambient loading or empty state

Goal: keep a status icon alive without distracting the user.

Good first candidates:

- `breathe`
- `float`
- `radar`

Reasoning:

- these presets tolerate loop playback better than most high-energy options
- their calmer default intensity makes them easier to keep comfortable over time

## Final guidance

Agents should not try to be clever by default.

The best first choice is usually:

- less intense
- more context-appropriate
- easier to explain

If two presets seem equally good, prefer the one that is:

- more restrained
- more product-safe
- easier to maintain across repeated use

Motion Lab already gives agents the same preset surface humans use. The job now is to choose from that shared set with good judgment.
