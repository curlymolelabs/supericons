# 2026-04-21 P2E MingCute Batch 02 Automation Plan

## Goal

Stage the next non-overlapping MingCute automation batch after the first MingCute staged set of `226` icons has been fully resolved.

This batch should:

- skip everything already staged in `mingcute-batch-01`
- use the current approved free semantic records as stronger reference material
- keep the next staged set as a strong `180+` icon slice instead of padding it with weak candidates

## Why This Is Next

- the first MingCute staged batch is now fully resolved
- we can safely move to the next MingCute slice without carrying queue debt
- a second staged batch proves the automation path can repeat cleanly inside the same library

## Scope

- add `mingcute-batch-02` selection config
- extend automation config lookup to recognize the new batch
- upgrade the automation batch builder so it can:
  - exclude prior automation batch worklists
  - use all approved free registry records as reference inputs
- generate the new batch outputs
- verify the new staged batch

## Output Files

- `data/si-registry/automation/mingcute-batch-02-selection.json`
- `data/si-registry/automation/mingcute-batch-02/worklist.json`
- `data/si-registry/automation/mingcute-batch-02/candidate-records.json`
- `data/si-registry/automation/mingcute-batch-02/review-queue.json`
- `data/si-registry/automation/mingcute-batch-02/summary.json`
- updated `data/si-registry/generated/semantic-automation-summary.json`

## Verification

- `npm run build:semantic-automation-batch -- mingcute-batch-02`
- `npm run verify:semantic-automation-batch -- mingcute-batch-02`
- `npm run build`

## Success Criteria

- the batch contains a new non-overlapping MingCute slice
- the selected count stays inside the adjusted safe range
- the batch uses stronger reference coverage than batch 01
- the staged queue is ready for the next MingCute editor and visual review passes
