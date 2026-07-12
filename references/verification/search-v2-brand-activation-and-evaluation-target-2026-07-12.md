# Search v2 brand activation and evaluation target verification

Date: 2026-07-12

## Scope

- Activate the approved 50-record SI brand classification with the Supericons correction.
- Enforce rejected aliases through one shared ranking rule.
- Add useful concept-sharing behavior for ambiguous brand terms without forcing weak meanings where no icon family exists.
- Expand the fixed evaluation suite to 225 stable cases, including multilingual and mixed-script candidates.

## Checks that failed before the completed implementation

- Initial ambiguous-brand retrieval reused the Swift brand query for every brand family. Queries such as `cohere` and `goose` therefore admitted Swift icons. Per-query brand retrieval overrides were added and the focused checks were rerun.
- The semantic-suite verifier still required the case count to remain below 225. It failed when the suite first reached the approved target. The gate now requires exactly 225.

## Verification results

| check | result | evidence |
| --- | --- | --- |
| Ranking policy build | Passed | `npm run build:search-ranking-policy` generated 35 interpretation families, 24 query policies, and 70 maintained brand terms. |
| Bounded brand review | Passed | `npm run verify:search-brand-classification-review` confirmed 50 SI brand records, 34 distinctive classifications, 16 ambiguous classifications, and full active coverage. |
| Ranking behavior | Passed | `npm run verify:search-ranking-policy` checked concept sharing, all ambiguous explicit-logo identities, and all rejected aliases. |
| Evaluation suite | Passed | `npm run verify:semantic-search-v2` confirmed 225 cases, 225 stable IDs, 148 owner-reviewed cases, 6 contract fixtures, and 71 multilingual candidates awaiting scoring. |
| Runtime parity | Passed | The ranking verifier confirmed byte-identical generated policy and hand-written local/MCP runtime copies. |
| Adjacent search regressions | Passed | Query-frame shadow, 15 library-mode cases, recommendation clarification, intent graph, and the no-network embedding runner all passed. |
| File integrity | Passed | Direct Node syntax checks, JSON parsing, punctuation scanning, public-safety scanning, and `git diff --check` passed for the changed batch. |

## Check not run

The backend discovery helper found `npm run build` but could not start npm through Python on Windows (`FileNotFoundError: [WinError 2]`). The full repository build was not substituted as evidence because the worktree contains unrelated in-progress changes and generated outputs. The focused Node checks above directly exercised the changed search contracts.

## Confirmed behavior

- Every explicit SI brand logo query ranks its expected SI identity first in the local deterministic search check.
- The exact single token `supericons` keeps identity priority.
- The descriptive phrase `super icons` uses the rejected-alias rule and does not rank `si:supericons` first.
- Rejected aliases such as `factory`, `components`, `eve`, and `mimo` use the same shared rule rather than query-specific code.
- Ambiguous words with useful icon meanings include those meanings in the top eight. Examples include Bolt with lightning and speed, Goose with birds, Runway with airport and fashion, Temporal with time, Grok with understanding, and Codex with books or manuscripts.
- Devin, Kimi, Exa, and Pika remain classified as ambiguous, but no weak concept family was invented merely to create diversity.

## Multilingual candidate status

The 71 multilingual cases are candidate fixtures, not approved language ground truth. They cover CJK, Spanish, Brazilian Portuguese, German, Arabic, Hindi, Thai, Vietnamese, and mixed-script brand-plus-concept queries. Native-language scoring and CJK dictionary checks remain required before they become a release gate.

## External effects

- No embedding provider API was called.
- No embedding vector was generated or stored.
- No deployment or package publication was performed.
- No spend was incurred by these local checks.

## Remaining risks and gates

- The 71 multilingual candidates require language review.
- Confidence thresholds, the downstream acceptance event, and the per-locale regression limit remain undecided.
- Current Google documentation lists both `gemini-embedding-001` and the newer stable `gemini-embedding-2`. E3 must be selected explicitly before a paid sample.
- Provider response shapes, account limits, latency, and actual usage remain unverified because no provider call was made.
