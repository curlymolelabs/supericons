# Search v2 evaluation expansion verification

Date: 2026-07-11

Status: locally verified candidate-suite expansion

## Scope

This change expands the Search Engine v2 evaluation seed and adds repeatable checks for the next implementation phase. It does not change public ranking, deploy a search service, or promote the reviewed query terms into global aliases.

Changed artifacts:

- `data/semantic-search-v2/evaluation-set.json`
- `scripts/verify-semantic-search-v2.mjs`
- `scripts/verify-search-query-frame-shadow.mjs`
- `scripts/evaluate-search-v2-candidate-baseline.mjs`
- `package.json`

## Evaluation inventory

The candidate suite now contains 61 cases toward the approved target of 225:

| status | cases | meaning |
| --- | ---: | --- |
| Legacy seed pending owner confirmation | 28 | Existing expected families are retained but are not newly claimed as owner-scored. |
| Public-safe July seed pending owner scoring | 12 | Query terms were reviewed as safe regression seeds; expected and proposed avoid families still need owner review. |
| Library contract seed pending owner scoring | 15 | Strict, preferred, and all-library behavior is defined as a candidate contract. |
| Cross-surface contract seed | 6 | Search and recommendation query-frame wiring cases. |

The suite remains 164 cases short of the 225-case target. Candidate count does not equal owner-reviewed release-gate count.

## Checks run

| check | result | evidence |
| --- | --- | --- |
| `npm run verify:semantic-search-v2` | Passed | 61 candidate cases, 33 stable case IDs, 75,810 semantic documents generated in memory from current inputs, five document types, 41 skipped records. |
| `npm run verify:search-query-frame-shadow` | Passed | Web and packaged MCP builders matched, and six recommendation task/slot cases used the shared builder with task context. |
| `npm run verify:semantic-search-v2-smoke` | Passed | 13 existing exact, semantic-intent, and long-query smoke cases passed. |
| `npm run verify:search-intent-graph` | Passed | 9 intent groups and 12 intent fixtures passed. |
| `node scripts/verify-recommend-icons-response-modes.mjs` | Passed | Plan, assets, full response, exact-logo, and recommendation guard checks completed. |
| `npm run evaluate:search-v2-candidate-baseline` | Completed | Produced the bounded current deterministic baseline summarized below. |

The first semantic verification run failed because a new punctuation check was applied to copied third-party icon metadata. The check was corrected to apply only to the agent-authored evaluation file, consistent with the repository fidelity rule. The focused verifier then passed.

## Current deterministic baseline

The repeatable candidate baseline reports:

- 12 July seed cases;
- 1 all-library zero-result case: `magnifier`;
- 12 July seed query frames still unclassified;
- 10 runnable strict/all library cases;
- 4 zero-result library cases;
- 5 preferred-library cases marked `not_implemented`; and
- 6 cases with proposed avoid-family hits among the top observed results.

Examples of verified current behavior:

- `cog` under strict Bootstrap ranks `incognito` first;
- `respond` under strict Phosphor returns no result;
- `combobox` under strict Bootstrap returns no result;
- `magnifier` returns no result in both all-library and strict Lucide cases;
- `bell` under strict Phosphor includes `barbell` among the top results; and
- all preferred-library cases remain unimplemented.

These observations are prioritization evidence. Proposed acceptable and avoid families are not release assertions until owner scoring is recorded.

## Checks not run

- No owner scoring was performed for expected or proposed avoid families.
- No pass/fail ranking evaluation was run for the 33 new stable cases.
- Preferred-library runtime behavior was not tested because it is not implemented.
- No hosted, Supabase, Netlify, npm publication, or production check was run.
- No embedding provider, model, dimension, or vector backend was selected or exercised.

## Residual risk

- The current verifier generated 75,810 semantic documents from current workspace inputs, while the saved July 1 evidence reports 75,560. The evaluation change did not regenerate the saved output artifact. Input drift must be reconciled before document-count changes are attributed to Search Engine v2 work.
- The candidate baseline uses current deterministic local MCP search. It does not prove hosted or web parity beyond the query-frame contract.
- Family matching in the candidate baseline is observational and does not replace owner relevance judgment.
- Adding one-off aliases before owner scoring could improve a narrow case while making broader search noisier.

## Next gate

1. Owner-score the July and library-mode candidate expectations.
2. Define the downstream action that counts as recommendation acceptance.
3. Decide confidence behavior for useful, related, fallback, and honest-gap outcomes.
4. Implement preferred-library behavior behind a compatible contract.
5. Improve the reviewed query families through maintained intent or record data, then add ranking assertions.
