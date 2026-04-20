# P1-P Editor Review Batch 02 Plan

## Goal

Resolve the remaining `48` purpose-chip icons currently routed to `editor_review` and promote the clear subset into the approved free SI semantic set.

## Why this step exists

After visual review batch 02:

- `84` icons are approved
- `9` icons are on hold
- `7` icons remain reviewed drafts
- `50` icons are still staged

The remaining staged work is now concentrated in:

- `48` icons routed to `editor_review`
- `2` icons still stuck in `text_review`

This means the main remaining rollout work is now editorial tightening, not visual coverage.

## Scope

This step will:

1. create a dedicated `editor-review-batch-02`
2. generate a contact sheet for the current `48` editor-review icons
3. approve the icons whose current semantic framing already reads clearly
4. hold or draft any icons that still need tighter wording
5. update promotion decisions, approvals, and rollout summaries

This step will not:

- resolve the last `2` text-review icons yet
- widen coverage beyond the `150` purpose-chip set
- rework older approved records unless a serious mismatch is found

## Review rule for this slice

Use these rules:

- approve icons whose label, purpose, and visual shape all align clearly
- hold icons that are useful but still span too many nearby meanings
- keep icons as reviewed drafts when the concept is promising but still too broad for safe approval

## Planned outputs

### Source and logic

- `scripts/build-purpose-chip-editor-review-batch.mjs`

### Generated artifacts

- `data/si-registry/pilot/purpose-chip/editor-review-batch-02.json`
- `data/si-registry/pilot/purpose-chip/editor-review-batch-02-reviewed-records.json`
- `data/si-registry/pilot/purpose-chip/editor-review-batch-02-notes.md`
- `data/si-registry/generated/editor-review-batch-02-summary.json`
- `data/si-registry/generated/editor-review-batch-02-contact-sheet.svg`
- `data/si-registry/generated/editor-review-batch-02-contact-sheet.png`

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

- the `editor_review` queue should shrink sharply
- the approved set should grow again
- the rollout should be left with only a small residue of holds, drafts, and the final `2` text-only icons

## Verification

Run:

- `node scripts/build-purpose-chip-editor-review-batch.mjs`
- `npm run build:purpose-chip-contact-sheet -- editor-review-batch-02`
- `npm run build:purpose-chip-approved-records`
- `npm run verify:purpose-chip-approved-records`
- `npm run build:purpose-chip-scale-up`
- `npm run verify:purpose-chip-scale-up`
- `npm run verify:si-registry`
- `npm run build`
