# P1-H Editor Hold Resolution Pass Plan

## Goal

Run a focused editor pass on the four hold records from batch 03, approve the ones that now satisfy the semantic quality bar, and leave the truly context-sensitive ones in the hold queue.

## Why this step exists

The hold queue is now small enough to review with care.

At this point, we should not scale further until we learn whether editor tightening can turn the close cases into approved records without lowering the bar.

## Records in scope

- `tabler:link`
- `tabler:refresh`
- `lucide:brain-cog`
- `lucide:circuit-board`

## Working decision for this pass

- try to tighten `tabler:refresh` into an approval-ready record
- try to tighten `lucide:circuit-board` into an approval-ready record
- keep `tabler:link` on hold unless it becomes clearly specific enough
- keep `lucide:brain-cog` on hold unless the reasoning-versus-settings drift is fully resolved

## Planned changes

1. update the reviewed wording in `single-model-batch-03-reviewed-records.json`
2. update the promotion decisions for batch 03
3. regenerate:
   - `approved-records.json`
   - `editor-hold-queue.json`
   - `purpose-chip-approval-summary.json`
4. write a short resolution note for this hold pass

## Expected result

After this step:

- the hold queue should get smaller
- the approved set should grow only where the semantic bar is still respected
- the remaining hold items should have clearer reasons for why they are still not ready

## Verification

- `npm run build:purpose-chip-approved-records`
- `npm run verify:purpose-chip-approved-records`
- `npm run build:purpose-chip-pilot`
- `npm run verify:purpose-chip-pilot`
- `npm run build`
