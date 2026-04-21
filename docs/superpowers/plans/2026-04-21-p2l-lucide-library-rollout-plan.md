# P2-L Lucide Library Rollout Plan

## Goal

Finish the entire Lucide semantic rollout, not just the first Lucide batch.

## Why this step exists

The first Lucide batch is now fully resolved. The remaining work is large enough that it should move from hand-run slices into a reusable rollout runner.

## What this step will build

1. A Lucide next-batch selection builder
2. A Lucide library rollout runner
3. A safer Lucide visual-review fallback so future visual batches do not stop on new file, folder, or debug variants

## Rollout method

For each remaining Lucide batch:

1. stage the next Lucide automation batch
2. clear the editor-review queue
3. clear the visual-review queue
4. rebuild approved Lucide records
5. rebuild SI Registry projections

Repeat until the whole Lucide library is staged and resolved.

## Quality policy

- Approve high-confidence editor-review icons by default
- Approve visual-review icons only when the shape cue reads clearly after visual confirmation
- Hold or draft icons that still need nearby product wording to stay safe
- Keep overlap protection so Lucide does not duplicate earlier approved free records

## Verification

Run:

- `npm run run:lucide-rollout`
- `npm run build`

## Expected outcome

- All Lucide icons are processed
- Lucide approval totals rise well beyond the first batch
- The registry summary reflects the completed Lucide library rollout
