# P1-M Visual Review Batch 01 Plan

## Goal

Review the `19` purpose-chip icons currently routed to `visual_review`, resolve the visually confirmable ones, and promote the approved subset into the import-ready path.

## Why this step exists

After the first editor-review pass:

- `57` icons are approved
- `2` icons are on hold
- `4` icons remain reviewed drafts
- `87` icons are still staged

The next smallest unresolved high-value slice is the `19`-icon `visual_review` batch. These icons already have renderable visual payloads, so they can be judged properly instead of staying stuck in text-only staging.

## Scope

This step will:

1. build a dedicated visual-review batch for the current `19` icons
2. generate a contact sheet for side-by-side icon inspection
3. convert the reviewed subset into reviewed records
4. update `promotion-decisions.json` with approve, hold, or draft outcomes
5. rebuild approvals, scale-up summaries, and registry counts

This step will not:

- resolve the `68` text-review icons yet
- revisit the older `2` hold records yet
- auto-approve icons that still look semantically broad after visual review

## Review rule for this slice

Use these rules:

- approve icons whose current staged meaning is strongly confirmed by the visual shape
- hold icons whose shape is visually clear but still spans too many product meanings
- keep icons as reviewed drafts when the meaning is useful but still too broad for approval

## Planned outputs

### Source and logic

- `scripts/build-purpose-chip-visual-review-batch.mjs`

### Generated artifacts

- `data/si-registry/pilot/purpose-chip/visual-review-batch-01.json`
- `data/si-registry/pilot/purpose-chip/visual-review-batch-01-reviewed-records.json`
- `data/si-registry/pilot/purpose-chip/visual-review-batch-01-notes.md`
- `data/si-registry/generated/visual-review-batch-01-summary.json`
- `data/si-registry/generated/visual-review-batch-01-contact-sheet.svg`
- `data/si-registry/generated/visual-review-batch-01-contact-sheet.png`

### Existing files updated

- `data/si-registry/pilot/purpose-chip/promotion-decisions.json`
- `data/si-registry/pilot/purpose-chip/approved-records.json`
- `data/si-registry/pilot/purpose-chip/editor-hold-queue.json`
- `data/si-registry/generated/purpose-chip-approval-summary.json`
- `data/si-registry/generated/purpose-chip-scale-up-summary.json`
- `data/si-registry/generated/purpose-chip-full-coverage-summary.json`
- `data/si-registry/generated/registry-summary.json`

## Expected result

After this step:

- the approved set should grow again
- the `visual_review` queue should shrink sharply or disappear
- the unresolved work should be concentrated in the text-review slice

## Verification

Run:

- `npm run build:purpose-chip-visual-review-batch`
- `npm run build:purpose-chip-contact-sheet -- visual-review-batch-01`
- `npm run build:purpose-chip-approved-records`
- `npm run verify:purpose-chip-approved-records`
- `npm run build:purpose-chip-scale-up`
- `npm run verify:purpose-chip-scale-up`
- `npm run verify:si-registry`
- `npm run build`
