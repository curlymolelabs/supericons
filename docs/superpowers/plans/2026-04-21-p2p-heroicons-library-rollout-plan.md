# P2-P Heroicons Library Rollout Plan

## Goal

Finish the entire Heroicons semantic rollout, then close the library with the post-library audit gate before committing.

## Why this step exists

Heroicons is the next library in the agreed rollout order. It is much smaller, but it still uses the same full-library runner pattern so the whole library can close under one audit gate.

## What this step will build

1. A Heroicons next-batch selection builder
2. Heroicons editor-review and visual-review batch builders
3. A Heroicons approved-record builder and verifier
4. A Heroicons library rollout runner
5. A Heroicons post-library audit report

## Rollout method

For each Heroicons batch:

1. stage the next Heroicons automation batch
2. clear the editor-review queue
3. clear the visual-review queue
4. rebuild approved Heroicons records
5. rebuild SI Registry projections

Repeat until the whole Phosphor library is staged and resolved.

## Quality policy

- Approve high-confidence editor-review icons by default
- Use the visual-review fallback only when the shape cue reads clearly from the icon itself
- Keep ambiguous icons as hold or reviewed draft instead of forcing approval
- Keep overlap protection so Heroicons does not duplicate earlier approved free records

## Verification

Run:

- `npm run run:heroicons-rollout`
- `npm run build:library-completion-audit -- heroicons`
- `npm run verify:library-completion-audit -- heroicons`
- `npm run build`

## Expected outcome

- All Heroicons icons are processed
- Heroicons gets an approval summary, a public registry projection, and a post-library audit report
- The library is only committed after the audit verdict is clear
