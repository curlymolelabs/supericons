# Search v2 deterministic tie fix verification

Date: 2026-07-13
Status: local fix passed; not deployed

## Reproduction

Three equal-score candidates with the same display name produced different final orders when their input order was reversed. The live `combobox` samples showed the same failure at result positions seven and eight in both control and treatment.

## Root cause

`rerankHostedSearchCandidates` sorted by score and display name. When both values tied, JavaScript preserved the incoming row order. PostgreSQL does not guarantee a stable order for rows tied on every SQL sort key, so database order leaked into the public result order.

## Correction

The comparator now uses `icon_id` as its final tie-break:

1. final score descending;
2. display name ascending;
3. icon ID ascending.

This is a generic deterministic rule. It contains no query-specific or library-specific behavior.

## Verification

| check | result |
| --- | --- |
| Three candidate input orders | Passed with the same final icon order |
| Complete hosted HTTP parity | Passed, five cases |
| Ranking policy canaries | Passed |
| Library modes | Passed, 15 cases |
| Phase 1 fixed-suite parity | Passed, 225 cases, fingerprint unchanged |
| Evaluation structure | Passed, 225 stable IDs |

The correction is local only. It requires a new control commit, treatment commit, approval manifest, and owner approval before another hosted measurement.
