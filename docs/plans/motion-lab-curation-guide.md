# Motion Lab Curation Guide

Date: April 11, 2026
Status: Active
Purpose: Internal reference for curating the Motion Lab agent metadata dataset
Depends on:
- `docs/motion-lab-agent-library-prd.md`
- `docs/plans/agent-metadata-schema.md`

## Why this guide exists

The schema defines the fields. This guide defines how to use them consistently.

Use this document before curating any of the 80 Motion Lab presets. The goal is not to make every record sound identical. The goal is to make every record use the same vocabulary, calibration rules, and judgment standards.

This guide is for internal curation only. It is not the developer-facing Motion Lab agent guidance document.

## Curation Principles

1. Use the real Motion Lab product as the reference.
The browser preset behavior is the starting point for all judgment.

2. Prefer consistency over cleverness.
If two words mean the same thing in practice, choose one and reuse it.

3. Keep hard rules factual and editorial guidance modest.
Do not turn taste into fake certainty.

4. Write for agent usefulness.
Every field should help an agent choose, avoid, or calibrate a preset more reliably.

5. Avoid boilerplate.
If a note could be copied into every record unchanged, it probably belongs in workflow guidance, not in a preset record.

## Closed Vocabulary

### Emotional Tone

Use only these tags for `emotional_tone` in v1:

- `subtle`
- `restrained`
- `professional`
- `precise`
- `calm`
- `playful`
- `energetic`
- `bold`
- `premium`
- `dramatic`
- `friendly`
- `urgent`
- `cheerful`
- `mechanical`
- `celebratory`

Rules:

- Use 1 to 3 tags per preset in most cases.
- Use 4 only if the combination is clearly justified.
- Prefer `restrained` over `subtle` when the preset still reads intentional and visible.
- Prefer `professional` for product-safe motion that works in business interfaces.
- Use `premium` only when the preset has visible polish or showpiece quality, not just because it looks “nice.”
- Use `urgent` sparingly. It should signal alert or interruption, not merely strong motion.

### Recommended Contexts

Use only these tags for `recommended_contexts` in v1:

- `navigation`
- `hover-affordance`
- `click-feedback`
- `toggle-state`
- `success-confirmation`
- `attention-cue`
- `loading`
- `onboarding`
- `settings`
- `analytics`
- `commerce`
- `notifications`
- `security-auth`
- `feature-highlight`
- `empty-state`
- `media-controls`
- `primary-cta`
- `celebratory-ui`

Rules:

- Use 2 to 4 contexts for most presets.
- Prefer interface intent over industry labels.
- Use `analytics`, `commerce`, or `security-auth` only when the preset feels especially appropriate for that product context.
- `feature-highlight` is for spotlight moments, not everyday navigation.
- `celebratory-ui` is for delight or reward moments, not general success states.

### Avoid For

`avoid_for` must use the same vocabulary family as `recommended_contexts`.

Rules:

- Use 0 to 4 values.
- Do not negate your own strongest `recommended_contexts`.
- Use this field only when there is a real mismatch risk.
- Prefer “quietly omit” over forcing an `avoid_for` tag when the preset is broadly usable.

Good examples:

- a jittery preset can recommend `attention-cue` and avoid `navigation`
- a strong celebratory preset can recommend `celebratory-ui` and avoid `settings`

Bad example:

- recommend `hover-affordance` and also avoid `navigation` when the preset is clearly being positioned for nav hover states

## Visual Character

`visual_character` is a short phrase, not a full sentence.

Rules:

- Aim for 2 to 5 words.
- Describe how the motion reads visually.
- Do not restate the preset name.
- Do not include usage advice here.

Good examples:

- `soft outward pulse`
- `directional light sweep`
- `snappy upward rebound`
- `elastic shape wobble`

Bad examples:

- `Good for call to action icons`
- `A premium animation preset`
- `Pulse effect`

## Intensity Calibration Rules

Never copy the global tool limits directly into preset records unless a preset truly works well across the entire range.

Global tool range:

- minimum: `25`
- maximum: `200`

Preset metadata range:

- should reflect the range where the preset usually looks good in real interface use

### Motion group

These presets often loop or stay on-screen longer.

Calibration rule:

- optimize for sustained comfort, not peak spectacle
- default working range usually falls between `40` and `80`
- move above `80` only when the preset still feels readable during repeated use

Typical use:

- nav hover states
- ambient product motion
- gentle interface emphasis

### Entrances group

These presets play once when something appears.

Calibration rule:

- can tolerate stronger peaks than loop-based motion
- default working range usually falls between `50` and `100`
- allow higher peaks only when the preset remains legible and does not feel chaotic

Typical use:

- first appearance
- reveal moments
- onboarding or staged UI entry

### Exits group

These presets play once when something leaves or resolves.

Calibration rule:

- generally similar to entrances
- default working range usually falls between `50` and `100`
- preserve readability through the full departure arc

Typical use:

- dismissals
- removal transitions
- state handoff moments

### Special group

These presets vary more in character and complexity.

Calibration rule:

- calibrate case by case
- do not assume one shared range for all special presets
- prioritize control and readability over novelty

Typical use:

- standout product moments
- branded interactions
- celebration or premium emphasis

## Duration Guidance

If a preset needs a narrower `duration_range_ms` than the global tool allows, record that in the dataset.

General guidance:

- shorter durations suit sharp, feedback-style motion
- medium durations suit reveal and emphasis
- longer durations suit ambient or cinematic motion only when readability stays intact

Do not widen duration ranges just because the tool technically accepts them.

## Technical Output Notes

`technical_output_notes` must be preset-specific.

Use this field when an agent needs to know something operationally meaningful about the preset.

Good uses:

- the preset depends on `clip-path`
- the preset depends on filter effects
- the preset reads poorly on dense or symmetrical icon shapes
- the preset depends on directional silhouette
- the preset is visually stronger in CSS than in self-contained SVG, or the reverse

Do not use this field for:

- generic trigger reminders
- generic export reminders
- generic “use supported values only” language

Good example:

- `Reads best on icons with a clear left-to-right silhouette; the effect is weaker on fully radial symbols.`

Bad example:

- `Use loop, hover, or click only.`

## Record Writing Workflow

Use this order for each preset:

1. Confirm the preset id, label, and group from the shared preset source.
2. Review the actual browser behavior before writing editorial fields.
3. Fill hard-rule fields first.
4. Write `visual_character`.
5. Choose `emotional_tone` from the closed set.
6. Choose `recommended_contexts` from the closed set.
7. Add `avoid_for` only if it meaningfully prevents misuse.
8. Calibrate `default_intensity_percent` and `intensity_range_percent`.
9. Write preset-specific `technical_output_notes`.
10. Re-read the whole record for consistency and restraint.

## Review Checklist

Before approving a record, check:

- Does the record use only allowed vocabulary for `emotional_tone`?
- Does the record use only allowed vocabulary for `recommended_contexts`?
- Does `avoid_for` actually add value?
- Does `visual_character` describe appearance rather than usage advice?
- Is the intensity range preset-specific rather than copied from the tool limit?
- Are `technical_output_notes` specific to this preset?
- Would an agent make a better choice with this record than with the preset name alone?

## Escalation Rules

Pause and review with the team if:

- two curators disagree on the same preset’s tone or usage repeatedly
- a preset seems to need vocabulary outside the current closed sets
- a preset behaves inconsistently enough that the record cannot be written confidently
- a proposed note sounds like product workflow guidance rather than preset guidance

If this happens, update the guide before continuing the broader curation pass.

## What comes after this

Once this guide is in place, the next build step is the 80-record dataset itself.

That dataset should follow:

- the approved PRD
- the metadata schema
- this curation guide
