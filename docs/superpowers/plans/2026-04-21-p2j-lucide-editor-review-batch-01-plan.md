# P2-J Lucide Editor Review Batch 01 Plan

## Goal

Approve the first Lucide semantic batch from the high-confidence editor-review queue so Lucide records can enter the live free SI Registry path.

## Scope

- Source batch: `lucide-batch-01`
- Review queue target: all `ready_for_editor_review` items from the first staged Lucide batch
- Keep the existing `needs_visual_review` items out of this slice

## What this slice will build

1. A Lucide editor-review batch builder
2. A Lucide approved-records builder
3. A Lucide approved-records verifier
4. Registry-manifest wiring so approved Lucide records flow into the public free registry projection
5. Generated summaries for the Lucide approval state

## Review policy

- Approve the strong Lucide editor-review items by default
- Tighten a small set of obvious generic drafts before approval
- Hold only the icons that still blend multiple plausible meanings too broadly

## Known conservative cases

- `lucide:calendar_x`
- `lucide:clock_arrow_down`
- `lucide:clock_arrow_up`

These stay out of approval for now because their likely meanings still depend too much on nearby product context.

## Verification

Run:

- `npm run build:lucide-editor-review-batch`
- `npm run build:lucide-approved-records`
- `npm run verify:lucide-approved-records`
- `npm run build`

## Expected outcome

- Lucide gets its first approved semantic slice in the live SI Registry
- The public free registry count increases
- The remaining Lucide work is narrowed to the `needs_visual_review` queue
