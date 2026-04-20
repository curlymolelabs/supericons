# P1-G Approved Record Promotion And Editor Hold Queue Plan

## Goal

Promote the reviewed semantic records that are ready for import into the purpose-chip approved path, preserve them across pilot rebuilds, and generate a small editor hold queue for the remaining unresolved records.

## Why this step exists

The semantic review work is now ahead of the import path.

We already have:

- reviewed records from batches 01 to 03
- a minimum viable approval rubric
- an empty `approved-records.json` file

But we do not yet have:

- a repeatable way to convert reviewed records into registry-valid approved records
- a safe way to preserve approved records when `build:purpose-chip-pilot` runs again
- a focused editor queue for the records that still need tightening

## Scope

This step will:

1. create a small promotion decision source for reviewed batches
2. generate registry-valid approved records for the import-ready path
3. generate an editor hold queue for unresolved reviewed records
4. preserve approved records across purpose-chip pilot rebuilds
5. update verification so the promoted records and hold queue stay consistent

This step will not:

- import the approved records into the live free registry yet
- publish hold or draft records
- expand review to new batches

## Promotion rule for this slice

Use these rules:

- all reviewed records from `single-model-batch-01` are approved for import
- all reviewed records from `single-model-batch-02` are approved for import
- `single-model-batch-03` keeps its existing split:
  - `approve_for_import`
  - `hold_for_editor_review`
  - `keep_as_reviewed_draft`

This keeps the earlier clear batches moving while preserving the harder ambiguity decisions from batch 03.

## Planned outputs

### Source and logic

- `data/si-registry/pilot/purpose-chip/promotion-decisions.json`
- `lib/si-registry/purpose-chip-approved-records.js`
- `scripts/build-purpose-chip-approved-records.mjs`
- `scripts/verify-purpose-chip-approved-records.mjs`

### Generated artifacts

- `data/si-registry/pilot/purpose-chip/approved-records.json`
- `data/si-registry/pilot/purpose-chip/editor-hold-queue.json`
- `data/si-registry/generated/purpose-chip-approval-summary.json`

### Supporting schema changes

- widen controlled vocabularies only where the approved records require it
- allow `synonyms` in registry records so approved semantic imports do not lose useful retrieval meaning
- preserve `approved-records.json` across future `build:purpose-chip-pilot` runs

## Expected result

After this step:

- the purpose-chip pilot will have a real import-ready approved set
- the unresolved records will be isolated into a small editor queue
- rerunning the pilot build will no longer wipe the approved set
- the next step will become a short editor pass over a much smaller hold set

## Verification

Run:

- `npm run build:purpose-chip-approved-records`
- `npm run verify:purpose-chip-approved-records`
- `npm run build:purpose-chip-pilot`
- `npm run verify:purpose-chip-pilot`
- `npm run build`
