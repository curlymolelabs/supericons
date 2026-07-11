# Search v2 legacy owner-review verification

Date: 2026-07-12

Environment: local Windows workspace

Release state: not deployed and not published

## Scope

The owner approved all recommendations in the 28-case legacy evaluation review packet. This change records those judgments in the machine-readable evaluation set without changing ranking code, selecting an embedding model, or enabling semantic retrieval.

## Recorded decisions

- 19 expectations were approved as written.
- 6 expectations were sharpened to distinguish preferred, related, insufficient, required-signal, or identity-substitution behavior.
- 3 English placeholder descriptions were replaced with native-language queries: Simplified Chinese, Japanese, and Brazilian Portuguese.
- Stable case IDs were added to all 28 inherited cases.
- The six inherited groups were marked owner-reviewed.

## Verification evidence

`npm run verify:semantic-search-v2` passed with:

- 72 evaluation cases;
- 72 stable case IDs;
- 66 owner-reviewed cases;
- 6 contract fixtures;
- 75,810 generated semantic documents in memory; and
- 41 skipped records.

The native-query observation used the low-level deterministic MCP search function with each case locale. It returned no icons for the four localized legacy cases. The Simplified Chinese license-plate query matched the maintained query frame. Japanese, Spanish, and Brazilian Portuguese remained unclassified by that low-level query frame.

These are current behavior gaps, not failed owner review. The cases define required v2 outcomes and remain part of the multilingual embedding and hybrid-retrieval evaluation.

## Adjacent current-tree checks

- `npm run verify:cjk-search-quality` passed, confirming current public dictionary structure, locale coverage, and source/package parity.
- `npm run verify:cjk-search-fixtures` failed against multiple exact icon-reference expectations across several locales.
- `npm run verify:web-cjk-search` passed its general multilingual smoke rows but failed the Japanese LLM row because `material:model_training` was absent from the observed top results.

The approval batch did not modify the CJK fixture files, multilingual dictionaries, public icon index, or those two verification scripts. Their current failures are recorded as separate fixture and catalog drift, not attributed to the owner-review data change.

## Remaining limits

- The suite still needs 153 cases to reach the approved 225-case target.
- Native multilingual coverage is not broad enough for final model selection.
- No embedding generation, vector retrieval, deployment, or publication occurred.
- Model choice, latency ceilings, cost ceilings, and multilingual regression limits remain open.
