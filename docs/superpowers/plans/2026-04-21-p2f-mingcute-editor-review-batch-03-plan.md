# P2F: MingCute Editor Review Batch 03 Plan

## Goal

Resolve the `72` high-confidence MingCute records staged in `mingcute-batch-02` that are ready for editor review.

## Why This Step Comes Next

- It is the smallest high-confidence unresolved MingCute slice.
- It should add more approved free semantic records quickly without waiting on visual-only work.
- It keeps the rollout systematic by finishing the editor queue before tackling the larger visual-review queue.

## Scope

- Create a reproducible selection for `mingcute-editor-review-batch-03`.
- Update the MingCute editor-review builder so it can read from `mingcute-batch-02`.
- Build reviewed records for the unresolved `ready_for_editor_review` queue from batch 02.
- Rebuild approved MingCute records and registry projections.
- Verify the MingCute approved set, registry projections, and app build.

## Expected Output

- `data/si-registry/automation/mingcute/mingcute-editor-review-batch-03.json`
- `data/si-registry/automation/mingcute/mingcute-editor-review-batch-03-reviewed-records.json`
- `data/si-registry/generated/mingcute-editor-review-batch-03-summary.json`
- updated `data/si-registry/automation/mingcute/approved-records.json`
- updated `data/si-registry/generated/mingcute-approval-summary.json`
- updated `data/si-registry/generated/registry-summary.json`

## Verification

- `npm run build:mingcute-editor-review-batch -- mingcute-editor-review-batch-03`
- `npm run build:mingcute-approved-records`
- `npm run verify:mingcute-approved-records`
- `npm run build:si-registry`
- `npm run verify:si-registry`
- `npm run build`
