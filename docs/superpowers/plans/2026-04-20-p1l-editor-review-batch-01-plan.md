# P1-L Editor Review Batch 01 Plan

## Goal

Promote the `27` automation-staged purpose-chip icons that are already in the `editor_review` bucket into the approved import path.

## Why this step exists

The scale-up slice now covers all `150` purpose-chip icons, but the remaining work is not evenly hard.

The current staged breakdown shows:

- `27` icons already ready for editor review
- `19` icons that still want visual review
- `68` icons that still rely on text-only review because visual payloads are missing

That means the fastest way to keep momentum is to clear the strongest batch first.

## Scope

This step will:

1. build a dedicated editor-review batch for the `27` strongest staged icons
2. generate reviewed records for that batch using the staged semantic records as the base
3. add the batch to `promotion-decisions.json`
4. rebuild the approved-record path so the reviewed batch becomes import-ready
5. regenerate the scale-up summary after those approvals land

This step will not:

- touch the `19` visual-review icons yet
- touch the `68` text-review icons yet
- resolve the `2` older hold records

## Promotion rule for this slice

Use these rules:

- only icons currently in `automation-next-steps.json` with `next_step = editor_review` join this batch
- the reviewed batch stays business-safe and does not include internal model or workflow metadata
- the batch is approved for import unless an obvious semantic mismatch appears during the pass

## Planned outputs

### Source and logic

- `scripts/build-purpose-chip-editor-review-batch.mjs`

### Generated artifacts

- `data/si-registry/pilot/purpose-chip/editor-review-batch-01.json`
- `data/si-registry/pilot/purpose-chip/editor-review-batch-01-reviewed-records.json`
- `data/si-registry/pilot/purpose-chip/editor-review-batch-01-notes.md`
- `data/si-registry/generated/editor-review-batch-01-summary.json`
- `data/si-registry/generated/editor-review-batch-01-contact-sheet.svg`
- `data/si-registry/generated/editor-review-batch-01-contact-sheet.png`

### Existing files updated

- `data/si-registry/pilot/purpose-chip/promotion-decisions.json`
- `data/si-registry/pilot/purpose-chip/approved-records.json`
- `data/si-registry/pilot/purpose-chip/editor-hold-queue.json`
- `data/si-registry/generated/purpose-chip-approval-summary.json`
- `data/si-registry/generated/purpose-chip-scale-up-summary.json`
- `data/si-registry/generated/purpose-chip-full-coverage-summary.json`

## Expected result

After this step:

- the approved set should grow beyond the current `30`
- the remaining scale-up queue should shrink
- the next unresolved work will be concentrated in the `19` visual-review icons and the `68` text-review icons

## Verification

Run:

- `npm run build:purpose-chip-editor-review-batch`
- `npm run build:purpose-chip-contact-sheet -- editor-review-batch-01`
- `npm run build:purpose-chip-approved-records`
- `npm run verify:purpose-chip-approved-records`
- `npm run build:purpose-chip-scale-up`
- `npm run verify:purpose-chip-scale-up`
- `npm run build`
