# P1-O Visual Review Batch 02 Plan

## Goal

Resolve the remaining `18` purpose-chip icons currently routed to `visual_review` after the Material coverage pass, and promote the subset that now reads clearly enough for approval.

## Why this step exists

After the Material SVG coverage pass:

- `72` icons are approved
- `4` icons are on hold
- `6` icons remain reviewed drafts
- `68` icons are still staged

The important shift is that the unresolved set is no longer mostly blocked by missing visuals:

- `48` staged icons now route to `editor_review`
- `18` staged icons now route to `visual_review`
- only `2` icons remain `text_review`

That makes the `18`-icon visual slice the smallest clean high-value batch to resolve next.

## Scope

This step will:

1. define a dedicated `visual-review-batch-02`
2. generate a contact sheet for the current `18` visual-review icons
3. use visual confirmation to approve, hold, or draft each icon
4. update `promotion-decisions.json`
5. rebuild approvals, scale-up summaries, and registry counts

This step will not:

- resolve the `48` editor-review icons yet
- resolve the remaining `2` text-review icons yet
- widen semantic coverage beyond the purpose-chip set

## Review rule for this slice

Use these rules:

- approve icons whose visual shape strongly confirms the staged meaning
- hold icons whose visual shape is clear but still spans multiple product meanings
- keep icons as reviewed drafts when the concept is useful but still too broad for safe approval

## Planned outputs

### Source and logic

- `scripts/build-purpose-chip-visual-review-batch.mjs`

### Generated artifacts

- `data/si-registry/pilot/purpose-chip/visual-review-batch-02.json`
- `data/si-registry/pilot/purpose-chip/visual-review-batch-02-reviewed-records.json`
- `data/si-registry/pilot/purpose-chip/visual-review-batch-02-notes.md`
- `data/si-registry/generated/visual-review-batch-02-summary.json`
- `data/si-registry/generated/visual-review-batch-02-contact-sheet.svg`
- `data/si-registry/generated/visual-review-batch-02-contact-sheet.png`

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

- the `visual_review` queue should shrink sharply or disappear
- the approved set should grow again
- the unresolved work should concentrate into `editor_review` plus the final `2` text-only icons

## Verification

Run:

- `npm run build:purpose-chip-visual-review-batch`
- `npm run build:purpose-chip-contact-sheet -- visual-review-batch-02`
- `npm run build:purpose-chip-approved-records`
- `npm run verify:purpose-chip-approved-records`
- `npm run build:purpose-chip-scale-up`
- `npm run verify:purpose-chip-scale-up`
- `npm run verify:si-registry`
- `npm run build`
