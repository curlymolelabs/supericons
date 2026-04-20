# 2026-04-21 P2D MingCute Editor Review Batch 02 Plan

## Goal

Resolve the remaining high-confidence MingCute `ready_for_editor_review` queue after:

- `mingcute-editor-review-batch-01`
- `mingcute-visual-review-batch-01`

This batch is expected to cover the unresolved `130` MingCute editor-review records.

## Why This Is Next

- the MingCute visual queue has already been cleared once
- the remaining unresolved work is now concentrated in the text-and-pattern review lane
- resolving this batch should move most of MingCute from staged automation into approved registry records

## Scope

- build `mingcute-editor-review-batch-02`
- review the remaining unresolved `ready_for_editor_review` records
- approve strong, consistent UI meanings
- hold icons that still mix multiple product meanings
- keep a small reviewed-draft set for records that are not stable enough yet
- rebuild MingCute approvals and the live SI registry projections

## Review Rules

- approve when the icon meaning is clear enough for a reusable public semantic record
- hold when the icon still mixes two strong UI meanings
- keep as reviewed draft when the wording is useful but still too context-sensitive for approval
- avoid internal process or model metadata in any output

## Expected Output Files

- `data/si-registry/automation/mingcute/mingcute-editor-review-batch-02.json`
- `data/si-registry/automation/mingcute/mingcute-editor-review-batch-02-reviewed-records.json`
- `data/si-registry/automation/mingcute/mingcute-editor-review-batch-02-notes.md`
- `data/si-registry/generated/mingcute-editor-review-batch-02-summary.json`
- updated `promotion-decisions.json`
- updated `approved-records.json`
- updated `editor-hold-queue.json`
- updated registry summaries

## Verification

- `npm run build:mingcute-editor-review-batch -- mingcute-editor-review-batch-02`
- `npm run build:mingcute-approved-records`
- `npm run verify:mingcute-approved-records`
- `npm run build:si-registry`
- `npm run verify:si-registry`
- `npm run build`

## Success Criteria

- the remaining MingCute editor-review queue drops substantially
- MingCute approved records increase without breaking schema or projection checks
- only the genuinely ambiguous MingCute records stay in hold or draft status
