# P2-N Tabler Library Rollout Plan

## Goal

Finish the entire Tabler semantic rollout, then close the library with the post-library audit gate before committing.

## Why this step exists

Tabler is the next library in the agreed rollout order. It is larger than Lucide, so it needs the same full-library runner pattern instead of hand-run slices.

## What this step will build

1. A Tabler next-batch selection builder
2. Tabler editor-review and visual-review batch builders
3. A Tabler approved-record builder and verifier
4. A Tabler library rollout runner
5. A Tabler post-library audit report

## Rollout method

For each Tabler batch:

1. stage the next Tabler automation batch
2. clear the editor-review queue
3. clear the visual-review queue
4. rebuild approved Tabler records
5. rebuild SI Registry projections

Repeat until the whole Tabler library is staged and resolved.

## Quality policy

- Approve high-confidence editor-review icons by default
- Use the visual-review fallback only when the shape cue reads clearly from the icon itself
- Keep ambiguous icons as hold or reviewed draft instead of forcing approval
- Keep overlap protection so Tabler does not duplicate earlier approved free records

## Verification

Run:

- `npm run run:tabler-rollout`
- `npm run build:library-completion-audit -- tabler`
- `npm run verify:library-completion-audit -- tabler`
- `npm run build`

## Expected outcome

- All Tabler icons are processed
- Tabler gets an approval summary, a public registry projection, and a post-library audit report
- The library is only committed after the audit verdict is clear
