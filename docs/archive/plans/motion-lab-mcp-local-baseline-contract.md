# Motion Lab MCP Local Baseline Contract

Date: April 12, 2026
Status: Accepted
Owner: Supericons
Scope: Motion Lab only
Depends on:
- `docs/plans/motion-lab-mcp-hosted-boundary-adr.md`
- `docs/plans/motion-lab-mcp-hybrid-boundary-implementation-plan.md`
- `lib/motion-lab-workflow.js`
- `lib/motion-lab-presets.js`
- `mcp/index.js`

## Purpose

Define the smallest Motion Lab surface that may remain in the local MCP package after the premium Motion Lab boundary moves to hosted services.

This contract exists to answer one question precisely:

- what can `list_motion_presets` safely keep local without continuing to ship premium Motion Lab intelligence?

It does not define the hosted endpoint shapes for premium recipe and render flows. Those are the next step.

## Problem Statement

The current local `list_motion_presets` response includes much more than a safe baseline:

- duplicate identifier fields
- calibrated timing and intensity guidance
- export compatibility details
- technical output notes
- rich curated metadata such as tone, contexts, and avoidance guidance

That enriched response helped build the current Motion Lab agent library, but it does not fit the protected boundary chosen in the hosted-boundary ADR. If it remains local, the MCP package still ships premium Motion Lab curation even after recipe and render paths move server-side.

## Target User

Primary user:
- the Supericons team implementing the protected Motion Lab MCP release

User job:
- keep a useful local preset listing while removing premium Motion Lab intelligence from the local package

Constraints:
- do not break the current MCP mental model
- keep the local baseline small enough to be safe to ship
- leave richer guidance to hosted premium paths

## Goals

- define the exact local `list_motion_presets` shape
- remove rich premium metadata from the local package boundary
- preserve a usable local preset browser for Motion Lab Pro users
- give hosted endpoint design a stable local counterpart

## Non-Goals

- defining hosted recipe response shapes
- defining hosted CSS or animated SVG render payloads
- changing Motion Lab preset ids or group names
- changing Motion Lab browser UI behavior
- changing converter behavior or MCP package scope

## Decision Summary

For the first protected Motion Lab MCP release, the local package may keep only a **minimal preset listing baseline**.

The local baseline is:

- preset ids
- group names
- labels
- short baseline descriptions
- supported triggers

The local baseline must not keep:

- keyframe geometry
- intensity-scaling logic
- premium export assembly logic
- rich curated metadata
- calibrated timing and intensity guidance
- premium decision hints

## Local Tool Scope

### Tool allowed to remain local

- `list_motion_presets`

### Tools that move to hosted premium behavior

- `get_motion_recipe`
- `export_motion_css`
- `export_animated_svg`
- `animate_icon`

These tools should no longer depend on local Motion Lab keyframes or rich local metadata in the protected release path.

## Functional Requirements

### Requirement 1: Minimal local record shape

The protected local `list_motion_presets` output must include only:

- `preset`
- `label`
- `group`
- `description`
- `supported_triggers`

Acceptance signal:
- no other preset-level fields remain in the local listing response

### Requirement 2: No rich curated metadata in local listing

The local listing must not include premium curation fields such as:

- visual or tone guidance
- context guidance
- avoidance guidance
- calibrated timing or intensity defaults
- technical notes
- export compatibility guidance

Acceptance signal:
- the removed-field list in this contract matches the implemented local response exactly

### Requirement 3: Stable Motion Lab vocabulary

The local listing must preserve the current preset id vocabulary, group labels, and trigger vocabulary.

Acceptance signal:
- preset ids remain unchanged
- group labels remain stable
- supported triggers remain `loop`, `hover`, `click`

### Requirement 4: No dependency on rich metadata loader

The protected local listing path must not depend on:

- `lib/motion-lab-agent-metadata.js`
- `data/motion-lab-preset-metadata.json`

Acceptance signal:
- `list_motion_presets` can run without importing the rich metadata loader or dataset

## Baseline Output Contract

### `list_motion_presets` local response shape

Each preset record may include only:

```json
{
  "preset": "sweep",
  "label": "Sweep",
  "group": "Special",
  "description": "Sweeps across the icon with a lit edge.",
  "supported_triggers": ["loop", "hover", "click"]
}
```

### Field rules

- `preset`: stable preset id string
- `label`: user-facing preset label
- `group`: one of the Motion Lab group labels
- `description`: short baseline description safe to expose locally
- `supported_triggers`: local-safe trigger list; currently `loop`, `hover`, `click`

## Fields Explicitly Removed From The Local Contract

The following fields must not remain in the local `list_motion_presets` response once the protected boundary is in place:

- `id`
- `default_duration_ms`
- `duration_range_ms`
- `default_intensity_percent`
- `intensity_range_percent`
- `export_compatibility`
- `technical_output_notes`
- `visual_character`
- `emotional_tone`
- `recommended_contexts`
- `avoid_for`

Reason:

These fields either expose richer curation work, calibrated premium guidance, or implementation details that belong to hosted premium behavior.

## Entitlement Rule

For the first protected Motion Lab release, `list_motion_presets` should remain under the Motion Lab Pro workflow gate even though its local baseline is safe to expose.

Reason:

- preserves current product semantics
- avoids creating a mixed free-vs-premium Motion Lab access story during the boundary transition
- keeps entitlement changes out of scope for this phase

This can be revisited later if Supericons wants a public Motion Lab preset browser for agents.

## Source Rule

The local baseline should be derived from the lightweight preset metadata already present in:

- `lib/motion-lab-presets.js`

The local baseline must not depend on:

- `lib/motion-lab-agent-metadata.js`
- `data/motion-lab-preset-metadata.json`

This is a core protection rule, not just a refactor preference.

## Description Standard

Local baseline descriptions should be:

- short
- preset-specific when available
- safe to expose as install-time metadata

They should not include:

- context scoring
- tone guidance
- premium judgment hints
- export or rendering caveats that belong to hosted premium logic

## Migration Rules

### Rule 1: Remove duplicate id alias

The protected local contract should not continue the `id` + `preset` duplication. `preset` is the only required identifier in the local baseline.

### Rule 2: Keep group labels stable

The baseline must preserve the current human-facing group labels:

- `Motion`
- `Entrances`
- `Exits`
- `Special`

### Rule 3: Keep trigger vocabulary stable

The baseline must preserve the current trigger vocabulary:

- `loop`
- `hover`
- `click`

### Rule 4: Do not reintroduce rich metadata locally

If a future enhancement needs richer local fields, it must be reviewed against the hosted boundary ADR before being added.

## Verification Requirements

The migration is correct when all of the following are true:

1. `list_motion_presets` can run without importing:
   - `lib/motion-lab-workflow.js`
   - `lib/motion-lab-agent-metadata.js`
   - `data/motion-lab-preset-metadata.json`
2. the local response shape contains only the approved baseline fields
3. the Motion Lab preset parity check still passes
4. the root app build still passes

## Success Metrics

### Primary metric

- the local Motion Lab listing can be served from a reduced baseline without loading the rich metadata dataset

Verification method:
- inspect imports and run a local listing smoke test after migration

### Supporting metrics

- the local listing still gives developers enough information to choose a preset family
- the protected release no longer exposes rich Motion Lab decision fields in the local listing

Verification methods:
- compare final local response shape to this contract
- verify removed fields are available only through hosted premium paths if still needed

### Guardrail metrics

- root app build still passes
- preset parity still passes
- the hosted-boundary ADR is not contradicted by the final local listing

## Risks

- baseline descriptions may feel too thin compared with the current enriched listing
- removing rich local metadata may reduce agent self-service discovery unless hosted recipe resolution is ready soon after
- keeping the tool Pro-gated may feel conservative given the reduced local surface, but it keeps the transition simpler

## Open Questions

1. Should baseline descriptions stay in `lib/motion-lab-presets.js`, or should a separate reduced local metadata module be introduced for clarity?
2. Should `list_motion_presets` keep exactly the current group labels, or should it switch to stable group keys in addition to labels for future endpoint alignment?
3. Should `supported_triggers` remain explicit in every record, or be moved to top-level tool documentation once the local contract is slimmed down?

## Recommended Next Step

Proceed to hosted endpoint shape definition for:

1. recipe resolution
2. CSS render
3. animated SVG render

Those hosted shapes should assume this local baseline contract is the only Motion Lab listing data available on the client.
