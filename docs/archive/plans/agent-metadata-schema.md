# Motion Lab Agent Metadata Schema

Date: April 11, 2026
Status: Approved
Depends on: `docs/motion-lab-agent-library-prd.md`

## Purpose

This document defines the metadata shape for the Motion Lab agent library.

It exists to answer four practical questions before curation begins:

1. What fields belong in the metadata?
2. Which fields are hard rules versus editorial guidance?
3. What qualifies an editorial field for machine-readable output in v1?
4. What is the minimum metadata every one of the 80 Motion Lab presets must have at launch?

This document is a Phase 2 prerequisite in the Motion Lab Agent Library PRD.

## V1 Coverage Decision

V1 covers **all 80 Motion Lab presets** with lighter metadata.

That means:

- every preset gets the minimum required hard-rule fields
- every preset gets the minimum required editorial guidance fields
- deeper fields can be added iteratively after launch

This avoids recreating the same split the product is trying to remove. Agents should not see a two-tier preset library where some presets are richly described and others fall back to name matching only.

## Field Classes

The metadata model uses two classes of fields.

### 1. Hard-rule fields

These fields describe operational behavior or technical constraints.

Agents should treat them as reliable constraints.

Examples:

- supported triggers
- duration limits
- intensity limits
- export compatibility

### 2. Editorial guidance fields

These fields help agents make better choices, but they are still guidance rather than absolute truth.

Agents should treat them as informed recommendations.

Examples:

- emotional tone
- recommended contexts
- avoid-for contexts
- visual character

## Curation Threshold For Machine-Readable Editorial Fields

An editorial field can be included in machine-readable v1 output only if it meets all of the following:

1. It is phrased as guidance, not as an objective claim.
2. It helps choose between presets in a real interface context.
3. It can be defended in internal product review.
4. It does not conflict with the current Motion Lab browser experience.
5. It can be supported by at least one internal usage scenario, docs example, or pairing rationale.

If an editorial insight does not meet that threshold, it should stay in prose guidance only and not be encoded in JSON for v1.

## V1 Minimum Metadata Requirement

Every one of the 80 presets must include these fields in v1.

### Required hard-rule fields

- `preset`
- `label`
- `group`
- `description`
- `supported_triggers`
- `default_duration_ms`
- `duration_range_ms`
- `default_intensity_percent`
- `intensity_range_percent`
- `export_compatibility`
- `technical_output_notes`

### Required editorial guidance fields

- `visual_character`
- `emotional_tone`
- `recommended_contexts`
- `avoid_for`

### Optional deeper fields for later expansion

- `pairing_notes`
- `best_for`
- `context_intensity_guidance`
- `timing_character`
- `example_scenarios`

## Recommended Dataset Shape

```json
{
  "version": 1,
  "groups": ["Motion", "Entrances", "Exits", "Special"],
  "presets": []
}
```

Recommended interpretation:

- `version` tracks schema and curation revisions
- `groups` reflects the live Motion Lab browser grouping
- `presets` contains one record per preset id

## Field Definitions

| Field | Type | Required in v1 | Class | Description |
|---|---|---:|---|---|
| `preset` | `string` | Yes | Hard rule | Stable preset id used across browser, docs, and MCP |
| `label` | `string` | Yes | Hard rule | Human-readable preset name |
| `group` | `"Motion" \| "Entrances" \| "Exits" \| "Special"` | Yes | Hard rule | Browser-facing group label |
| `description` | `string` | Yes | Hard rule | One-sentence product description |
| `supported_triggers` | `string[]` | Yes | Hard rule | Allowed trigger values such as `loop`, `hover`, `click` |
| `default_duration_ms` | `number` | Yes | Hard rule | Default duration used when none is specified |
| `duration_range_ms` | `{ "min": number, "max": number }` | Yes | Hard rule | Recommended safe duration range |
| `default_intensity_percent` | `number` | Yes | Hard rule | Default intensity value |
| `intensity_range_percent` | `{ "min": number, "max": number }` | Yes | Hard rule | Recommended safe intensity range |
| `export_compatibility` | `{ "css": boolean, "animated_svg": boolean, "notes": string[] }` | Yes | Hard rule | Which export paths are supported and any related notes |
| `technical_output_notes` | `string[]` | Yes | Hard rule | Implementation or export constraints agents must respect |
| `visual_character` | `string` | Yes | Editorial guidance | Short description of how the motion reads visually |
| `emotional_tone` | `string[]` | Yes | Editorial guidance | 1 to 4 tags describing felt tone |
| `recommended_contexts` | `string[]` | Yes | Editorial guidance | Contexts where the preset is a strong fit |
| `avoid_for` | `string[]` | Yes | Editorial guidance | Contexts where the preset is usually a poor fit |
| `pairing_notes` | `string` | No | Editorial guidance | Notes about icon shapes or UI pairings |
| `best_for` | `string[]` | No | Editorial guidance | Product or interface types where the preset is especially strong |
| `context_intensity_guidance` | `object` | No | Editorial guidance | Context-specific min, max, and default intensity guidance |
| `timing_character` | `string` | No | Editorial guidance | Short phrase describing timing feel, such as `fast-snap` or `slow-drift` |
| `example_scenarios` | `string[]` | No | Editorial guidance | Short example prompts or use cases |

## Field Rules

### `preset`

- lower camel case or current product id form
- must match the shared preset source exactly
- must remain stable once published

### `label`

- should match the browser-facing label
- should not include category or trigger information

### `group`

Allowed v1 values:

- `Motion`
- `Entrances`
- `Exits`
- `Special`

### `supported_triggers`

Allowed values:

- `loop`
- `hover`
- `click`

If a preset supports all current trigger modes, encode all three explicitly.

### `export_compatibility`

Recommended shape:

```json
{
  "css": true,
  "animated_svg": true,
  "notes": []
}
```

`notes` should be used only when an export path has an important operational caveat.

This field should align with the current MCP Motion Lab export tools:

- `export_motion_css`
- `export_animated_svg`
- `animate_icon`

### `technical_output_notes`

Use this field for preset-specific implementation or export constraints.

Good uses:

- a preset depends on `clip-path`, filter effects, or another behavior the host environment must preserve
- a preset reads poorly on certain icon structures unless a caveat is known
- a preset has an export caveat that an agent should factor into its decision

Do not use this field for generic tool rules that apply to every preset, such as:

- "Use supported trigger values only"
- "Respect intensity and duration ranges"

Those belong in tool or workflow guidance, not repeated in every preset record.

### `intensity_range_percent`

This field describes the recommended working range for this preset, not the full global parameter range the export tools accept.

The MCP tools may accept `25` to `200` globally, but this field should record the range within which the preset usually produces good results for real interface use.

Curators should choose a range that reflects the preset's own behavior. If a preset becomes too aggressive, unreadable, or imperceptible outside a narrower range, encode that narrower range here.

### `emotional_tone`

Guidelines:

- keep tags short
- prefer stable, reusable terms over poetic wording
- aim for 1 to 4 tags per preset

Examples:

- `subtle`
- `playful`
- `precise`
- `energetic`
- `premium`
- `professional`

### `recommended_contexts`

These should be interface or intent contexts, not broad marketing language.

Examples:

- `navigation`
- `hover-affordance`
- `success-confirmation`
- `analytics`
- `settings`
- `attention-cue`

### `avoid_for`

This field should be used carefully. It should guide away from poor fits, not declare universal bans.

Examples:

- `destructive-actions`
- `error-states`
- `playful-contexts`
- `professional-contexts`

## Example Record

```json
{
  "preset": "sweep",
  "label": "Sweep",
  "group": "Special",
  "description": "Sweeps across the icon with a lit edge.",
  "supported_triggers": ["loop", "hover", "click"],
  "default_duration_ms": 500,
  "duration_range_ms": {
    "min": 300,
    "max": 700
  },
  "default_intensity_percent": 65,
  "intensity_range_percent": {
    "min": 40,
    "max": 80
  },
  "export_compatibility": {
    "css": true,
    "animated_svg": true,
    "notes": []
  },
  "technical_output_notes": [
    "Sweep relies on clip-path reveal and filter effects, so the host environment must preserve inline CSS and SVG filter rendering.",
    "The motion reads best when the icon has a clear directional silhouette or visible horizontal flow."
  ],
  "visual_character": "A controlled left-to-right sweep that reads as deliberate and precise.",
  "emotional_tone": ["precise", "subtle", "professional"],
  "recommended_contexts": ["navigation", "settings", "analytics", "hover-affordance"],
  "avoid_for": ["playful-contexts", "onboarding-celebration"],
  "pairing_notes": "Works especially well on icons with visible directional or horizontal stroke movement.",
  "best_for": ["enterprise-ui", "fintech", "professional-sidebar-navigation"],
  "context_intensity_guidance": {
    "navigation-professional": {
      "min": 55,
      "max": 80,
      "default": 65
    },
    "subtle-affordance": {
      "min": 40,
      "max": 65,
      "default": 55
    }
  },
  "timing_character": "medium-precision",
  "example_scenarios": [
    "Professional dashboard navigation hover state",
    "Settings icon hover response in a restrained UI"
  ]
}
```

## Validation Rules

Before a preset record is approved:

1. The `preset` id matches the shared preset source exactly.
2. The `group` value matches the browser grouping exactly.
3. All required v1 fields are present.
4. Editorial fields pass the curation threshold.
5. No field wording conflicts with published Motion Lab docs.
6. The record does not imply unsupported export or trigger behavior.

## Relationship To MCP Output

The schema does not require every field to ship in MCP on day one.

Recommended rollout:

### Phase 1 MCP output

Return:

- `preset`
- `label`
- `group`
- `description`
- `supported_triggers`
- `default_duration_ms`
- `intensity_range_percent`
- `export_compatibility`

### Phase 2 and later MCP enrichment

Add:

- `visual_character`
- `emotional_tone`
- `recommended_contexts`
- `avoid_for`
- deeper optional fields where validated

This allows the product to ship breadth first, then deepen the decision layer without creating a second preset tier.

## Recommended Next Step

Use this schema document to:

1. implement the shared preset source for the 80 browser-tested presets
2. align MCP preset exposure with that shared source
3. start metadata curation across all 80 presets using the v1 minimum field set
