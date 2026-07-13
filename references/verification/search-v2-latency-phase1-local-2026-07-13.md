# Search v2 latency Phase 1 local verification

Date: 2026-07-13
Status: local implementation and checks complete; no deployment or publication authorized by this record

## Scope

This phase addresses the first hosted latency finding without changing the stable web or MCP routes.

1. Add safe timing for the shared hosted search stages.
2. Add an independent beta candidate RPC that keeps the current matching and ranking SQL but does not return SVG content for every candidate.
3. Make the isolated beta handler fetch SVG only for the final result IDs.

The wider search projection, index changes, query batching, and one-call recommendation work remain outside this phase.

## Implemented changes

### Safe timing

The shared handler accepts an optional timing sink. Stable handlers leave it disabled. The isolated beta handler enables it.

The timing record contains only stage durations, cold or reused-worker state, counts, and approximate character totals. It does not contain query text, icon IDs, SVG content, session hashes, IP hashes, or credentials. A timing-output failure cannot change the search response.

Measured stages include request parsing, rate limiting, account lookup, candidate search, private metadata, reranking, public semantic data, final SVG lookup, and audit writing.

### Lightweight candidate RPC

`si_search_icon_candidates_v2` is additive and beta-only. Its SQL matching, filtering, ranking, ordering, and limit logic match the current `si_search_icon_candidates` function. The only return-shape change is removal of the SVG column.

The rollback is to stop beta callers and drop only `si_search_icon_candidates_v2(text, text, integer)`. The production function and catalog data remain unchanged.

### Final SVG hydration

The isolated beta handler uses the lightweight RPC, ranks the candidates, then fetches `icon_id, svg` only for the final IDs from `icon_catalog`. That fetch uses the `icon_id` primary key. The SVG lookup and the public semantic lookup run in parallel.

Stable web and MCP handlers retain their old defaults and continue to call `si_search_icon_candidates`.

## Verification evidence

| Check | Result |
| --- | --- |
| Safe timing unit check | Passed. Safe fields only, disabled path preserved, sink failure contained. |
| Deno type check for shared and beta handlers | Passed. |
| Lightweight RPC static parity | Passed. Function body matches the existing SQL after removing only `c.svg`. |
| Disposable PostgreSQL 17 smoke | Passed. Four old/new candidate comparisons matched, v2 omitted SVG, rollback preserved the old RPC, and final SVG lookup used a primary-key index scan. |
| Final SVG response hydration | Passed. Result order, string SVG, and null SVG were preserved; a missing final row failed closed. |
| Fixed-suite parity | Passed. All 225 stable case IDs executed with deterministic result fingerprint `564464d5da3416a956ff6d900ee1ccf09f3fa491b2b72e7bff3de75c273e08b2`. |
| Ranking policy canaries | Passed. |
| Strict, prefer, and all library modes | Passed, 15 cases. |
| Recommendation clarification | Passed. |
| Existing beta Gate A checks | Passed after the beta-only RPC and hydration assertions were added. |
| Default-path provider-call check | Passed with zero external model-provider calls. |

The broad `verify:hosted-search-engine` command still has an unrelated failure in the existing dirty worktree: its expected synonym list omits `server stack`, while the current taxonomy builder returns it. This phase did not edit that taxonomy code or its test.

## External state

No hosted SQL, Supabase function deployment, npm publication, Netlify deployment, or external model-provider call was performed for this phase.

The new migration and beta handler changes are local only. Live latency remains unverified. The formal limits remain:

- hosted search p95 at or below 2,000 ms;
- common one-slot recommendation p95 at or below 3,000 ms.

Cold samples must be reported separately from warm samples. A warm average must not hide a cold-start failure.

## Next gate

1. Independently review this local evidence.
2. Prepare a guarded exact-SQL plan for only `20260713150000_search_v2_lightweight_candidates.sql`. Do not use normal `db push`.
3. Request explicit approval before any hosted SQL or function deployment.
4. If approved, deploy only the additive v2 RPC and isolated beta handler.
5. Run cold and warm live search and recommendation checks before any npm publication.
