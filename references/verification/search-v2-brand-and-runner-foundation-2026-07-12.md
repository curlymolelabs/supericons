# Search v2 brand policy and offline runner verification

Date: 2026-07-12

Environment: local Windows workspace

Release state: not deployed, not published, and no provider API called

## Scope

This batch:

- corrects bare Lovable from a required brand winner to an ambiguous brand-and-concept search;
- preserves explicit `lovable logo` identity priority;
- records the bounded 50-SI-brand maintenance rule as D-019 and FR-29;
- creates a complete 50-record owner-review proposal without activating unapproved entries;
- adds locale-aware generic-instruction requirements to the embedding experiment; and
- implements provider-neutral `plan` and `dry-run` modes with no network or file writes.

## Red checks before implementation

- The ranking-policy check failed because bare `lovable` had no brand interpretation family in the maintained policy.
- The runner check failed because the pure planning module did not exist.

## Focused verification

| check | result | evidence |
| --- | --- | --- |
| `npm run build:search-ranking-policy` | Passed | 21 families, 11 query policies, and 3 active brand terms generated. |
| `npm run verify:search-ranking-policy` | Passed | Bare Lovable covered brand and love/affection families; explicit Lovable logo stayed rank 1; boxing-glove leakage was removed. |
| `npm run verify:search-brand-classification-review` | Passed | All 50 current SI brand-logo records appeared once in the pending review table; only 3 approved brand terms were active. |
| `npm run verify:search-v2-embedding-runner` | Passed | Candidate validation, deterministic fingerprints, dry-run batch planning, fail-closed mode handling, and static no-network checks passed. |
| `npm run plan:search-v2-embeddings` | Passed | 75,810 documents and five candidates planned with network and writes disabled. |
| `npm run dry-run:search-v2-embeddings -- --candidate e1-voyage-4-large-1024 --batch-size 250` | Passed | One candidate planned in 304 batches with no network or writes. |
| `npm run verify:semantic-search-v2` | Passed | 73 stable cases: 67 owner-reviewed and 6 contract fixtures. |

## Current behavior

Bare `lovable` returned love, heart, favorite, and Lovable brand results in the top eight. The brand appeared but was not required to hold rank 1. `lovable logo` returned `si:lovable` at rank 1.

## Limits and gates

- The 50-brand table remains pending owner review. Its unapproved rows do not affect ranking.
- Generated semantic documents are currently all `en`; multilingual tiers remain incomplete.
- Only planning and dry-run exist. Sample, build, evaluate, storage, rollback execution, and provider adapters do not exist.
- Paid execution and embedding baseline capture remain blocked on approved brand fixtures, multilingual tiers, cost limits, and provider re-verification.
- No migration, provider request, deployment, package publication, or external write occurred.
- The required backend helper discovered `npm run build` but could not launch npm from Python on Windows. Focused Node syntax, contract, policy, evaluation, plan, and dry-run checks ran directly. The full root build was not used as evidence for this scoped offline batch.
