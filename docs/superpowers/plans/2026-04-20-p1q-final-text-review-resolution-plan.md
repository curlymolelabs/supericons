# P1-Q Final Text Review Resolution Plan

## Goal

Close the first full `150`-icon purpose-chip rollout by resolving the last `2` `text_review` records:

- `material:launch`
- `material:workflow`

## Why this slice exists

The remaining icons are not blocked by weak semantics. They are blocked by missing renderable SVG payloads in the local Material export path. That means the safest finish is a narrow text-review pass that uses:

- the staged semantic draft
- source-name evidence
- taxonomy-seed context
- approved equivalent records that already passed the review standard

## Current state before this step

- `127` approved
- `13` hold
- `8` reviewed drafts
- `2` automation-staged
- `0` remaining `visual_review`
- `0` remaining `editor_review`
- `2` remaining `text_review`

## Resolution standard

Approve a text-only record only if all of the following are true:

1. The source name is unusually direct and low-ambiguity.
2. The staged semantic draft already matches the approved SI wording pattern.
3. There is an already-approved equivalent record whose purpose and usage language strongly aligns.
4. The record does not introduce a new risky category, domain, or interpretation leap.

If any of those fail, keep the record on hold rather than forcing closure.

## Expected decision

### `material:launch`

Expected action: approve.

Reason:

- the staged record already matches the approved `material:open_in_new` meaning closely
- the Material icon name `launch` is commonly used for external-open behavior
- the semantic wording is already stable and specific

### `material:workflow`

Expected action: approve.

Reason:

- the staged record already aligns with the approved `lucide:workflow` concept
- the icon name is direct and purpose-specific
- the semantic wording fits the `AI & Agents` lane without stretching into unrelated meanings

## Files to create

- `data/si-registry/pilot/purpose-chip/text-review-batch-01.json`
- `data/si-registry/pilot/purpose-chip/text-review-batch-01-reviewed-records.json`
- `data/si-registry/pilot/purpose-chip/text-review-batch-01-notes.md`
- `data/si-registry/generated/text-review-batch-01-summary.json`
- `scripts/build-purpose-chip-text-review-batch.mjs`

## Files to update

- `data/si-registry/pilot/purpose-chip/promotion-decisions.json`
- `package.json`

## Execution steps

1. Build a stable text-review batch file for the remaining `2` icons.
2. Generate reviewed records using the staged draft plus the approved reference records.
3. Add `text-review-batch-01` to promotion decisions.
4. Rebuild:
   - approved records
   - scale-up summaries
   - SI registry projections
5. Verify:
   - purpose-chip approval records
   - purpose-chip scale-up summaries
   - SI registry projections
   - full build

## Expected result

If both records are approved, the first `150`-icon purpose-chip rollout should end at:

- `129` approved
- `13` hold
- `8` reviewed drafts
- `0` staged

That should also move the public free semantic registry from `133` to `135` records.
