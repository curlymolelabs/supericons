# P2-M Post-Library Audit Gate Plan

## Goal

Add one reusable audit gate that runs after each library rollout is declared complete.

## Why this step exists

Library completion currently proves that the pipeline finished. It does not by itself answer whether the library is safe to close, how much semantic follow-up still exists, or whether public registry outputs match the approved records.

## What this step will build

1. A reusable library completion audit builder
2. A reusable library completion audit verifier
3. A Lucide audit report as the first real audit-gate run

## Audit checks

The audit must answer these questions:

1. Does the processed total reconcile to the official library size?
2. Does the public registry projection match the approved count?
3. Did any sensitive workflow fields leak into approved or hold records?
4. How much approved, hold, draft, and overlap-skipped work remains?
5. Is the library operationally complete, or complete with follow-up?

## Outputs

For each audited library:

1. JSON audit report in `data/si-registry/generated/`
2. Markdown audit report in `docs/superpowers/plans/`
3. Plain-language HTML audit report in `docs/superpowers/plans/`

## Quality policy

- Treat coverage mismatch as a blocking failure
- Treat public projection mismatch as a blocking failure
- Treat leaked workflow metadata as a blocking failure
- Treat non-zero hold or draft counts as follow-up gaps, not blockers, as long as totals still reconcile
- Make the final verdict explicit instead of implying that “processed” means “gap free”

## Verification

Run:

- `npm run build:library-completion-audit -- lucide`
- `npm run verify:library-completion-audit -- lucide`
- `npm run build`

## Expected outcome

- Lucide has a reusable post-library audit report
- Future libraries can be closed with the same audit standard
- We stop describing a library as “gap free” unless the audit really says it is clean
