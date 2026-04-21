# P2-O Phosphor Library Rollout Plan

## Goal

Finish the entire Phosphor semantic rollout, then close the library with the post-library audit gate before committing.

## Why this step exists

Phosphor is the next library in the agreed rollout order. It needs the same full-library runner pattern instead of hand-run slices so the whole library can close under one audit gate.

## What this step will build

1. A Phosphor next-batch selection builder
2. Phosphor editor-review and visual-review batch builders
3. A Phosphor approved-record builder and verifier
4. A Phosphor library rollout runner
5. A Phosphor post-library audit report

## Rollout method

For each Phosphor batch:

1. stage the next Phosphor automation batch
2. clear the editor-review queue
3. clear the visual-review queue
4. rebuild approved Phosphor records
5. rebuild SI Registry projections

Repeat until the whole Phosphor library is staged and resolved.

## Quality policy

- Approve high-confidence editor-review icons by default
- Use the visual-review fallback only when the shape cue reads clearly from the icon itself
- Keep ambiguous icons as hold or reviewed draft instead of forcing approval
- Keep overlap protection so Phosphor does not duplicate earlier approved free records

## Verification

Run:

- `npm run run:phosphor-rollout`
- `npm run build:library-completion-audit -- phosphor`
- `npm run verify:library-completion-audit -- phosphor`
- `npm run build`

## Expected outcome

- All Phosphor icons are processed
- Phosphor gets an approval summary, a public registry projection, and a post-library audit report
- The library is only committed after the audit verdict is clear
