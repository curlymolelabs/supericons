# Search v2 tool-scoped beta and shared recommendation pipeline

Date: 2026-07-14
Environment: local workspace and disposable PostgreSQL 17
External systems changed: none

## Outcome

The local implementation now separates the two MCP tools:

- `search_icons` in package `0.4.18-beta.0` routes to the isolated search beta function and carries the beta cohort.
- `recommend_icons` keeps the stable hosted function and has no beta cohort.
- The complete recommendation response is byte-identical in the stable and tool-routed verification paths.
- End-to-end MCP tool duration is written separately from hosted-search duration.
- Search audit rows can record first-request or reused-worker state, request order, and module age at handler entry.
- English recommendation omits locale and generates at most four outer queries. The 11 supported non-English locales may generate up to eight.

The local recommendation treatment now combines all one-slot recommendation searches into one deterministic hosted pipeline. For four logical queries, the focused verification recorded:

- one candidate RPC instead of four;
- one read from each private metadata table;
- one SVG read;
- one public semantic read;
- one synchronous bulk audit insert containing four rows;
- four reserved rate-limit units;
- four error audit rows when candidate retrieval fails; and
- exact response parity, including optional query-frame output.

The isolated treatment response includes public-safe stage timings. It does not include raw query text, icon identifiers, SVG content, credentials, session hashes, or IP hashes.

## Database changes prepared locally

Migration `20260714180000_search_v2_tool_latency_evidence.sql` is additive. It adds three nullable worker-evidence columns, three validated constraints, two partial indexes, and the latency-aware `si_log_mcp_search_outcome_v2` function. The existing logger remains available.

Migration `20260714190000_search_v2_shared_recommendation_candidates.sql` is additive. It adds the service-role-only `si_search_icon_candidates_v4` function and does not change a table or existing function.

Both migrations passed idempotent PostgreSQL 17 smoke tests. No hosted database was contacted. The tool-latency migration also passed its fixed hosted preflight and postflight SQL against the disposable database. Its guarded runner:

- requires the explicit approval switch;
- pins SHA-256 `d482408f156320fbbf518d6d66ac51ba1c1660321bacff9485f4e32a408fc3b5`;
- applies only migration `20260714180000` in one transaction;
- repairs only that migration-history version after SQL and postflight success;
- uses a hidden password prompt and clears password variables; and
- does not call normal `supabase db push`.

## Verified checks

| check | result |
| --- | --- |
| Tool-scoped routing, legal workload, full recommendation byte parity, and tool latency logger | Pass, `npm run verify:search-v2-tool-scoped-beta` |
| Shared recommendation response, rate-limit, success audit, failure audit, and in-band timing | Pass, `npm run verify:search-v2-shared-recommendation-pipeline` |
| Tool-latency migration, fixed preflight/postflight, invalid input rejection | Pass, `npm run verify:search-v2-tool-latency-migration-smoke` |
| Shared recommendation candidate migration, provenance, filtering, and rollback | Pass, `npm run verify:search-v2-shared-recommendation-migration-smoke` |
| Guarded tool-latency runner | Pass, `npm run verify:search-v2-tool-latency-hosted-runner` |
| Package dry-run and clean install | Pass, 38 files, `npm run verify:search-v2-tool-scoped-package` |
| Public-safe stage timing | Pass, `npm run verify:search-v2-stage-timing` |
| Existing grouped recommendation result parity and clarification short-circuit | Pass, `npm run verify:recommend-icons-grouped-search` |
| Existing grouped HTTP rate cost, order, and audit behavior | Pass, `npm run verify:search-v2-grouped-http-request` |
| Full hosted HTTP parity, SVG values, semantic order, and errors | Pass, `npm run verify:search-v2-hosted-http-parity` |
| 225-case fixed suite | Pass, `npm run verify:semantic-search-v2` |
| Ranking policy, library modes, and recommendation clarification | Pass |
| Deterministic default with zero external model-provider calls | Pass, `npm run verify:search-v2-deterministic-mcp-default` |
| Deno type checking for the shared handler and isolated treatment endpoint | Pass |

Two adjacent legacy checks also fail on clean commit `1cb5ff676`, before this local slice:

- `verify:hosted-search-engine` expects two normalized synonyms but the current source returns a third, `server stack`.
- `verify:search-query-fixtures` expects `lucide:bot-off` first for `hallucination`, while the current result starts with `si:hallucination-warn`.

These failures remain in their separate stale-fixture workstream and were not changed here.

## Limits and next evidence

- Neither new migration is deployed.
- Neither isolated function is deployed.
- No npm package is published.
- No production function is changed.
- The shared recommendation treatment is bounded to the approved one-slot measurement workload of at most eight logical queries. It is not yet a production replacement for every legal 12-slot recommendation.
- Local stubs and disposable PostgreSQL prove call reduction and parity, but they do not predict hosted recommendation p95 with the required 30 percent safety margin. No live measurement should be requested on the strength of a fabricated latency estimate.
- Production latency percentiles by tool have not been exported in this slice.

The next release work should be split. The search-only beta can receive its own fingerprint-bound approval packet. Recommendation stays stable while the shared treatment receives a separate confirmatory measurement packet only after its legal workload and latency projection gate are satisfied.
