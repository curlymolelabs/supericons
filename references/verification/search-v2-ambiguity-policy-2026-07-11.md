# Search v2 ambiguity policy verification

Date: 2026-07-11

Status: specification and evaluation contract verified locally; ranking implementation not started

## Scope

This change records two intended Search Engine v2 behaviors before ranking code changes:

- ambiguous list search diversifies across approved interpretation families, while recommendation narrows with task and slot context or asks for clarification; and
- brand ranking distinguishes distinctive exact, ambiguous exact, and prefix/substring matches.

The specification and decision log were updated together through `FR-27`, `FR-28`, `D-016`, and `D-017`. No existing requirement or decision ID was renumbered.

## Evaluation changes

The candidate suite expanded from 61 to 71 cases:

- 6 ambiguous-intent cases for `hello` and context-narrowed forms;
- 4 brand-intent cases for bare `hello`, exact HelloFresh identity, explicit HelloFresh logo intent, and ambiguous `swift` identity; and
- corrected broad-word expectations for `picker`, `chooser`, `alarm`, `alert`, and `bell`.

The bare `picker` case now allows selection, color, date/time, file, and emoji interpretations. Color picker and eyedropper are no longer treated as universally unacceptable for the bare query.

`alarm` accepts `alarm` and `alarm clock`. Timer, reminder, bell, notification, and warning remain proposed related families pending owner scoring. `alert`, `alarm`, and `bell` remain related but distinct.

## Checks run

| check | result | evidence |
| --- | --- | --- |
| `npm run verify:semantic-search-v2` | Passed | 71 candidate cases, 43 stable case IDs, 10 policy seeds pending owner scoring, five semantic document types, and 41 skipped records. |
| `npm run verify:search-query-frame-shadow` | Passed | Existing parity cases plus five context-narrowed ambiguity cases used the shared web/MCP/recommendation query-frame builder. |
| `npm run evaluate:search-v2-candidate-baseline` | Completed | Six ambiguity policy cases remain unclassified, diversification is not implemented, one prohibited brand top hit remains, and both explicit HelloFresh identity cases currently rank correctly. |
| Specification consistency review | Passed | Version 1.1 contains `FR-27`, `FR-28`, `OQ-09`, and `OQ-10`; the decision log contains matching accepted `D-016` and `D-017` records. |

## Verified current behavior

- Bare `hello` has an unclassified low-confidence query frame.
- Bare `hello` currently returns only `simpleicons:hellofresh` in local deterministic search.
- `HelloFresh logo` carries brand-logo intent and returns `simpleicons:hellofresh` first.
- All six new ambiguity policy cases remain unclassified by the current query frame.
- No result currently carries interpretation-family labels or `needs_clarification` behavior.

## Checks not run

- No ambiguity detector, interpretation-family retrieval, diversified ranking, or clarification payload was implemented.
- No brand match classifier or generic brand-intent rank gate was implemented.
- No owner relevance scoring was recorded for the 10 new policy cases.
- No hosted, web, deployment, or production check was run.

## Residual decisions

- `OQ-09`: ownership and evidence rules for distinctive versus ambiguous brand terms.
- `OQ-10`: the ambiguity signal and relevance floor that trigger diversification or clarification.
- Owner scoring for the proposed `hello`, `picker`, `chooser`, alarm-related, and common-word brand families.

## Next gate

1. Owner-score the 10 policy cases and related-family proposals.
2. Define maintained interpretation-family and brand-term data shapes.
3. Implement query ambiguity and brand match classification without query-specific rank code.
4. Add failing ranking assertions before changing ranking behavior.
5. Implement the smallest generic ranking change that makes the approved assertions pass.
