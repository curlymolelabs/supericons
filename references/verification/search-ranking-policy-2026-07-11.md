# Search ranking policy verification

Date: 2026-07-11
Environment: local workspace
Deployment state: not deployed
Publication state: not published

## Scope

This check covers the owner-reviewed July meaning families, ambiguous `hello` and `picker` behavior, and generic brand-intent gating for local fallback and hosted reranking code.

The public contract is unchanged in this slice. Search results still use the existing result shape. Recommendation clarification responses remain future work.

## Maintained source

`data/search-intent-graph/ranking-policy.json` is the maintained source for:

- 20 interpretation families;
- 10 query policies; and
- 2 reviewed brand-term classifications.

The build script creates matching runtime copies for shared library code and the MCP package. Ranking code reads these generated copies. Fixtures prove behavior but do not create query-specific code branches.

## Verified behavior

Before implementation, the local fallback returned HelloFresh first for bare `hello`, returned only two results, returned no results for contextual `hello` searches, and returned no results for `magnifier`.

After implementation, `npm run verify:search-ranking-policy` passed and verified:

- bare `hello` does not rank HelloFresh first;
- the top eight for `hello` cover four approved families: greeting gesture, friendly face, communication, and written greeting;
- contextual `hello onboarding screen` ranks a greeting gesture first;
- contextual `hello message` ranks communication first;
- exact `hellofresh` and `HelloFresh logo` keep HelloFresh first;
- bare `swift` includes both speed/motion and brand interpretations;
- bare `picker` covers four approved families in the top eight;
- `magnifier` resolves to search or zoom; and
- `bell` excludes barbell substring collisions.

The same verification uses synthetic hosted candidates to prove that hosted reranking suppresses a HelloFresh substring collision, diversifies `hello`, and preserves exact HelloFresh identity priority.

## Checks

| Check | Result |
| --- | --- |
| `npm run build:search-ranking-policy` | Passed: 20 families, 10 query policies, 2 brand terms |
| `npm run verify:search-ranking-policy` | Passed |
| `npm run verify:semantic-search-v2` | Passed: 71 cases, 22 owner-reviewed |
| `npm run verify:search-intent-graph` | Passed: 9 groups, 12 fixtures |
| Forbidden U+2013/U+2014 scan for changed files | Passed |
| Generated library/MCP ranking policy parity | Passed inside focused verification |

## Adjacent test debt

Two existing checks did not pass for reasons outside this slice:

- `npm run verify:hosted-search-engine` expects normalized registry synonyms to exclude the record label, while the current builder includes `server stack` from the label.
- `npm run verify:search-query-fixtures` expects `lucide:bot-off` first for `hallucination`, while the current catalog and existing ranking return `si:hallucination-warn` first. The other seven fixtures passed their required first-result checks.

The backend check helper discovered only the full npm build, then failed to start `npm` on Windows with `FileNotFoundError`. Focused Node checks were run directly instead.

## Residual limits

- No deployment or live hosted request was performed.
- Recommendation does not yet return the specified `needs_clarification` response.
- The 15 preferred-library cases and 28 legacy cases still await owner review.
- The evaluation suite remains at 71 of the approved 225 cases.
- Vector retrieval, embeddings, and hybrid fusion are not part of this slice.
