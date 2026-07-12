# Search v2 deterministic-first pivot verification

Date: 2026-07-12

## Scope

This record verifies the owner decision to revoke the external embedding sample and make deterministic search the required default for free web and MCP requests.

## Decision and authorization

- Specification version 1.5 and decision `D-021` were updated in the same change.
- The embedding authorization status is `revoked_by_owner`.
- The exact sample command reports `failed_before_execution` and zero request attempts.
- No provider credential, execution ledger, provider request, deployment, or publication was created.

## Checks run

| check | result |
| --- | --- |
| `npm run verify:search-v2-embedding-sample` | Passed. The historical sample fingerprint remains reproducible while authorization stays revoked. |
| `npm run verify:search-v2-embedding-executor` | Passed. Five denied paths, two replay paths, and one concurrent reservation path were verified; the revoked command made zero attempts. |
| `npm run verify:semantic-search-v2` | Passed with 225 stable cases: 219 owner-reviewed and 6 contract fixtures. |
| `npm run verify:search-intent-graph` | Passed with 9 groups and 12 fixtures. |
| `npm run verify:search-ranking-policy` | Passed with maintained ambiguity and brand-policy observations. |
| `npm run verify:search-library-modes` | Passed all 15 strict, prefer, and all-mode cases. |
| `npm run verify:recommend-icons-clarification` | Passed ambiguity, context narrowing, and single-family behavior. |
| `npm run verify:search-query-frame-shadow` | Passed shared query-frame behavior. |
| `npm run verify:search-v2-deterministic-mcp-default` | Passed. Seven required deterministic files are in the MCP package list, provider artifacts are absent, and both the packaged source and 13 hosted default-path files contain zero selected-provider endpoint or key references. |
| `npm pack --dry-run --json` from `mcp/` | Passed for `@supericons/mcp` 0.4.17 with 37 listed files. No package was published. |
| PRD section helper | Completed with a naming limitation. It recognized problem, goals, non-goals, requirements, and open questions, but its exact-heading check did not recognize the existing `Target users and jobs`, `Evaluation and success metrics`, and `Risks and mitigations` sections. Source review confirmed those sections remain present. |

## Remaining gate

The deterministic MCP package has not been deployed, published, or observed live. `FR-26` requires explicit owner approval before those external changes. A controlled beta also needs a rollback record and measurement plan for zero results, low confidence, exact regressions, latency, errors, reformulation, and abuse.
