# Search v2 search-only beta Gate C execution

Date: 2026-07-16
Manifest: `bf59e6cfd4b73a8df654ce37ec293f399a43b024ee3f785fa98566e55621d734`
Implementation commit: `415f401b7a034690ab039b5245f77b01f1d4fab2`
Decision: release stopped and isolated endpoint deleted

## External actions completed

- Linked the isolated release worktree to Supabase.
- Applied migration `20260714180000` through the approved hash-pinned runner.
- Passed hosted SQL preflight and postflight checks.
- Repaired only migration-history version `20260714180000`.
- Deployed `mcp-search-v2-beta` once.
- Ran sequential search and localized Gate C samples.
- Deleted `mcp-search-v2-beta` after Gate C failed.

No production search function was deployed. No npm package or tag changed. No Railway or site deployment occurred. No model provider was called. The drafted monitoring routines remain inactive.

## Local artifacts

| artifact | SHA-256 |
| --- | --- |
| `.tmp/search-v2-beta-gate-c-20260716/search.json` | `d1e2b4f97ccfa41ab5b71d58f7c5da5e70ad3079adfb0af9de1b430634e97772` |
| `.tmp/search-v2-beta-gate-c-20260716/localized.json` | `434a5a2e33bf5b449be281a068085dd428ecf59e49a0f212674807cceabcdee2` |

The files are local-only because they are detailed execution evidence. They contain response hashes and result IDs, not credentials or SVG bodies.

## Gate C results

| check | result | limit | verdict |
| --- | ---: | ---: | --- |
| Search first request | 8,689.161 ms | reported separately | Fail signal |
| Search warm p95 | 7,151.057 ms | 2,000 ms | Fail |
| Search warm requests | 24 of 25 successful | at most 1 percent errors | Fail |
| Localized first request | 1,639.681 ms | reported separately | Pass signal |
| Localized warm p95 | 2,286.601 ms | 2,000 ms | Fail |
| Audit capture | 38 of 38 hosted requests | at least 95 percent | Pass |
| Audit-row errors | 1 of 38, 2.63 percent | at most 1 percent | Fail |
| Audit-row p95 | 5,303.9 ms | supporting evidence | Fail signal |

The one HTTP 500 occurred on `settings` after 9,392 ms of recorded handler time with error code `search_service_unavailable`. The client observed 10,029.780 ms.

## Worker evidence

The database query returned six rows that either failed or exceeded 2,000 ms. Every one was marked:

- `worker_state = first_request`;
- `worker_request_ordinal = 1`; and
- module age at handler entry between 5 and 6 ms.

The slow rows covered `settings`, `hello`, `cog`, and `combobox`. This is strong evidence that repeated new workers are associated with the latency failures. It does not prove whether module startup, database connection setup, candidate retrieval, metadata work, SVG hydration, or audit work was the dominant internal stage.

## Localized request count

Each localized MCP search made two hosted requests. Six localized client calls therefore produced 12 hosted requests. The client retries with a deterministic localized expansion when the first localized request returns no results. This behavior is deterministic, but the extra round trip must be included in latency and capacity planning.

## Evidence gap

The endpoint returned a public-safe `measurement_timing` object and also wrote the same timing record to platform logs. The Gate C client retained response hashes and durations but did not retain `measurement_timing` or the structured error response. Platform logs were not exported before rollback.

The exact slow stage and the underlying HTTP 500 cause therefore remain unverified. Do not attribute the failure solely to Supabase, the database tier, or search architecture from the current evidence.

The command wrapper also allowed the localized command to run after the search command returned a failed gate. Future execution must check each native command's exit code before continuing.

## Rollback verification

Read-only checks after deletion confirmed:

| item | final state |
| --- | --- |
| `mcp-search-v2-beta` | Absent |
| Production `search-icons` | Active, version 35 |
| Production `mcp-search` | Active, version 38 |
| npm `latest` | `0.4.17` |
| npm `0.4.19-beta.0` | Not published |

Migration `20260714180000` remains applied. It adds nullable measurement fields, validated checks, indexes, and a logging function that stable search code ignores.

## Next gate

Do not rerun or publish the same build.

Before another live request, the local Gate C client must:

1. retain the public-safe stage timing and structured error code for every request;
2. record first-request and reused-worker groups separately;
3. stop immediately when a safety or performance command fails;
4. preserve the localized hosted-request count; and
5. project a plausible pass before requesting another deployment.

If retained timing shows database stages dominate, reduce or combine database work before remeasurement. If startup dominates independently of database stages, compare a deterministic local-index path against hosted execution. Scheduled warm pings remain outside the plan because they hide cold behavior and create ongoing cost.
