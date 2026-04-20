# P1-K Bulk Purpose-Chip Scale-Up Plan

## Goal

Expand the purpose-chip semantic pilot from the current reviewed subset to the full `150`-icon set by staging the remaining `114` icons with stronger automation, clear next-step routing, and a full coverage summary.

## Why this step exists

The pilot has already proved the important parts:

- the semantic record shape works
- visual confirmation improves quality
- approved records improve agent retrieval once search uses them

What is still missing is scale.

Right now:

- `30` icons are approved for import
- `2` icons are on hold
- `4` icons are reviewed drafts
- `114` icons are still only sitting in the generic candidate queue

That means the purpose-chip pilot is not yet operating as a full `150`-icon system.

## Scope

This step will:

1. keep the `30` approved, `2` hold, and `4` reviewed-draft icons unchanged
2. generate stronger automation-staged semantic records for the remaining `114` icons
3. assign each staged icon a simple next-step bucket based on confidence and visual payload availability
4. generate a full coverage summary for all `150` purpose-chip icons
5. add verification so the staged coverage stays internally consistent

This step will not:

- auto-import the remaining `114` icons into the public free registry
- overwrite the manually reviewed records
- claim the staged records are approved

## Scale-up rule for this slice

Use these rules:

- approved, hold, and reviewed-draft icons remain the source of truth for the handled subset
- only the remaining unhandled icons are staged by automation
- staged records stay internal-only and draft-status
- staged records use better lexical rules than the old generic lane filler
- each staged record gets a next-step bucket:
  - `editor_review`
  - `visual_review`
  - `text_review`
  - `manual_tightening`

## Planned outputs

### Source and logic

- `lib/si-registry/purpose-chip-scale-up.js`
- `scripts/build-purpose-chip-scale-up.mjs`
- `scripts/verify-purpose-chip-scale-up.mjs`

### Generated artifacts

- `data/si-registry/pilot/purpose-chip/automation-staged-records.json`
- `data/si-registry/pilot/purpose-chip/automation-next-steps.json`
- `data/si-registry/generated/purpose-chip-scale-up-summary.json`
- `data/si-registry/generated/purpose-chip-full-coverage-summary.json`

### Supporting changes

- add npm scripts for building and verifying the scale-up slice
- keep the staged records aligned with the registry record validator

## Expected result

After this step:

- the full `150` purpose-chip icons will be accounted for
- the reviewed subset will remain protected
- the remaining icons will have a stronger first semantic draft than the old lane-only filler
- the team will be able to see which staged icons are closest to approval and which still need more work

## Verification

Run:

- `npm run build:purpose-chip-scale-up`
- `npm run verify:purpose-chip-scale-up`
- `npm run build:purpose-chip-pilot`
- `npm run verify:purpose-chip-pilot`
- `npm run build`
