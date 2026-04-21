# P2-K Lucide Visual Review Batch 01 Plan

## Goal

Resolve the remaining visually ambiguous Lucide icons from the first Lucide automation batch so the first Lucide slice can move past raw name-based drafting.

## Scope

- Source batch: `lucide-batch-01`
- Queue target: all `needs_visual_review` items from the first staged Lucide batch
- Do not widen to a second Lucide staging batch yet

## What this slice will build

1. A Lucide visual-review batch builder
2. A Lucide contact-sheet builder for visual QA
3. Updated Lucide promotion decisions
4. Rebuilt Lucide approved records and summary counts

## Review policy

- Approve the file and folder variants where the second cue reads clearly after visual confirmation
- Hold the icons where the added cue still depends too much on nearby product context
- Keep any developer-specific symbol as a reviewed draft if the meaning still drifts across multiple plausible jobs

## Known careful cases

- `lucide:file_clock`
- `lucide:file_user`
- `lucide:folder_clock`
- `lucide:folder_open_dot`
- `lucide:bug_play`

## Verification

Run:

- `npm run build:lucide-visual-review-batch`
- `npm run build:lucide-contact-sheet -- lucide-visual-review-batch-01`
- `npm run build:lucide-approved-records`
- `npm run verify:lucide-approved-records`
- `npm run build`

## Expected outcome

- The first Lucide visual-review queue is cleared
- Approved Lucide count increases again
- Lucide batch 01 is fully resolved, leaving the next step as `lucide-batch-02` staging
