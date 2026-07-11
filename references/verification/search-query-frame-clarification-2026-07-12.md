# Search query frame and recommendation clarification verification

Date: 2026-07-12

Environment: local Windows workspace

Release state: not deployed and not published

## Scope

This change completes the approved local P1 behavior for maintained ambiguous queries:

- project maintained interpretation families into the shared public query frame;
- use task context to narrow an ambiguous recommendation slot when possible;
- return labeled clarification options when the slot remains ambiguous;
- keep internal ranking scores out of the clarification response; and
- keep local and MCP runtime policy modules aligned.

The specification already required this behavior in FR-27, so this implementation did not add or renumber a requirement.

## Before the change

Focused failing checks established the starting gap:

- the query-frame check stopped at `j11-cog` because the maintained policy query was still classified as unclassified; and
- the recommendation check found no `needs_clarification` field for an under-specified `hello` slot.

These checks were written before the implementation change.

## Public contract

The shared query frame now includes maintained interpretation family IDs, public labels, an interpretation status, and a clarification flag. The public `recommend_icons` response now includes:

- `needs_clarification` at the response and affected-slot levels;
- `clarification_slots` at the response level;
- public interpretation options containing only `family_id` and `label`;
- no recommended icon or alternatives for an unresolved ambiguous slot; and
- no numeric confidence score for that unresolved slot.

For example, an under-specified `hello` slot can offer greeting gesture, friendly face, communication, and written greeting. An onboarding task narrows the same slot to the greeting-gesture family and continues with icon retrieval.

## Verification evidence

| check | result | coverage |
| --- | --- | --- |
| `npm run verify:search-query-frame-shadow` | Passed | All 12 July meaning seeds and 7 ambiguity policy cases produced classified, aligned local and MCP query frames. |
| `npm run verify:recommend-icons-clarification` | Passed | Under-specified `hello` clarified without a score, contextual `hello` narrowed, and `cog` stayed single-family. |
| `npm run verify:search-ranking-policy` | Passed | Maintained public intent types and ranking-policy behavior. |
| `npm run verify:search-library-modes` | Passed | Existing strict, prefer, and all library-mode behavior. |
| `npm run verify:semantic-search-v2` | Passed | 72-case evaluation schema, including the durable recommendation clarification case. |
| `npm run verify:search-intent-graph` | Passed | Existing generated intent graph and fixtures. |
| `node scripts/verify-recommend-icons-response-modes.mjs` | Passed | Existing plan, assets, and full recommendation response modes. |
| `npm run verify:mcp-variant-access` | Passed | Existing lookup, search, and recommendation variant access. |
| `npm run verify:mcp-docs-setup` | Passed | MCP documentation setup. |
| `npm run verify:mcp-search-preview-localization` | Passed | Existing preview localization behavior. |
| `npm pack --dry-run --json` from `mcp/` | Passed | The package inventory contains the generated policy, shared policy, and shared query-frame runtime modules. Nothing was published. |
| Node syntax checks | Passed | Changed query-frame, ranking-policy, recommendation, remote-schema, and focused verification modules parsed successfully. |
| Runtime parity and punctuation scan | Passed | Local and MCP runtime copies were byte-identical; changed files contained no U+2013 or U+2014 characters. |

The candidate evaluator reported 72 cases, zero unclassified July seed frames, and zero unclassified ambiguity-policy frames.

## Remaining limits

- The 28 legacy evaluation cases still need owner scoring.
- The suite has 72 of the planned 225 cases.
- Confidence thresholds, the downstream acceptance event, and the diversity relevance floor remain open design decisions.
- No real vector lane exists yet. Its candidates must be tested against the shared policy boundary when P4 is implemented.
- This behavior has not been deployed, published, or observed live.
- Two previously recorded adjacent tests remain outside this change: the synonym-label expectation and the older hallucination result fixture.
- The backend skill helper discovered the root build command but could not start npm from Python on Windows. The focused Node and MCP checks above ran directly. The full root build was not used as evidence for this batch.
