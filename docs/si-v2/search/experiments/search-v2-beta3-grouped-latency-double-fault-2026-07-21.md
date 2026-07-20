# Search v2 beta.3 grouped latency double-fault diagnosis

Date: 2026-07-21

Status: production endpoint absent after exact-ID rollback; third deployment blocked pending a source-level latency fix and new release packet

## Observed failures

Two guarded deployments of the additive `mcp-search-grouped` endpoint passed routing and failed the unchanged one-slot latency gate. Both attempts rolled back by deleting the exact function ID created by that attempt. Stable `mcp-search` remained unchanged at version 40.

| attempt | measurement schedule | one-slot p95 | limit | outcome |
| --- | --- | ---: | ---: | --- |
| 1 | calls spaced by 22 seconds | 4,858 ms | 3,000 ms | rolled back |
| 2 | OPTIONS keepalives, then back-to-back samples | 5,067 ms | 3,000 ms | rolled back |

Attempt 2 retained the full one-slot evidence:

- warmup: 4,781 ms;
- measured samples: 5,067 ms, 4,999 ms, and 4,755 ms;
- zero timeouts;
- all requested slots resolved.

The attempt-2 rollback record pins expected and observed function ID `27d64531-6a8d-4e8c-8a6b-3a8ae2d8f814`, records status `removed`, and records `stable_function_mutated: false`.

## Corrected worker-state conclusion

The first retry assumed that an OPTIONS request every five seconds would preserve a warm worker. Production audit rows disprove that assumption.

Each measured grouped POST started a new worker. Within one grouped POST, its parallel logical searches used later request ordinals on the same worker. Back-to-back POSTs still reset to ordinal 1 with a new module age. OPTIONS therefore kept the route reachable but did not provide worker affinity for the next POST.

The 4.8 to 5.1 second result is real first-call behavior for the current endpoint. It is not a warm result and it is not a reason to weaken the 3,000 ms gate.

## Source-level finding

`mcp-search-grouped` calls the normal `handleSearchRequest` once per logical query. The endpoint does not set `candidateBatchRpcName`, so every logical query performs separate candidate RPC calls for its generated query variants. Each logical query also performs its own account lookup, metadata reads, SVG hydration, public semantic read, and synchronous audit write.

The one-slot recommendation generated four logical queries. Production rows show the slowest logical searches finishing in about 4.3 to 4.6 seconds, which determines the grouped response time.

The hosted database already contains the additive service-role-only `si_search_icon_candidates_v3(text[], text, integer)` RPC. The broader `si_search_icon_candidates_v4(jsonb, text, integer)` shared-recommendation RPC is not deployed.

## Hypotheses and bounded experiments

### H1: Candidate variant fanout is the primary avoidable delay

Evidence: the grouped endpoint omits `candidateBatchRpcName`, while the existing v3 RPC combines all variants for one logical query into one database call. Earlier isolated measurements identified candidate search as the largest hosted stage.

Experiment:

1. Configure only the additive grouped endpoint to use `si_search_icon_candidates_v3`.
2. Add a fixture proving one candidate RPC per logical query, byte-equivalent ordered results, unchanged rate cost, unchanged fallback, and unchanged audit rows.
3. Run the full local and deterministic search gates.
4. Build a fresh isolated release packet with public-safe stage timings preserved on gate failure.

Pass condition: local call-count and parity gates pass, then a new guarded live measurement meets the unchanged 3,000 ms one-slot limit with no timeout.

### H2: Per-logical-query metadata, hydration, and audit work remains too expensive after v3

Evidence: even with parallel execution, every logical query repeats the full post-candidate database pipeline. The existing local shared-recommendation implementation combines candidate retrieval, metadata, hydration, and bulk audit work across logical queries.

Experiment:

1. Do not deploy v4 by assumption.
2. If the v3 candidate-batching candidate does not project adequate margin or fails an isolated live gate, extend the existing shared-recommendation handler to the approved 20-slot workload.
3. Verify grouped contract parity, allowance cost, safe local fallback, Material handling, ordered provenance, and bulk audit completeness.
4. Prepare the additive v4 migration and endpoint as a separately bounded packet.

Pass condition: the complete 1-slot, 10-slot, 20-slot, and Japanese 20-slot matrix passes the existing latency and timeout limits.

### H3: Synchronous audit writing or another later database stage dominates

Evidence: current production rows identify total per-query latency and worker state but do not preserve stage durations. Source inspection shows synchronous audit, metadata, public semantic, and hydration calls after candidate retrieval.

Experiment:

1. Preserve public-safe stage timings for every logical query in isolated gate evidence.
2. Compare candidate search, metadata, hydration, public semantic, and audit durations.
3. Optimize only the measured dominant stage. Telemetry must remain captured in the admin dashboard.

Pass condition: the evidence identifies the dominant stage and the selected fix removes that repeated work without dropping telemetry or changing stable search.

## Stop rule

No third production deployment of the unchanged endpoint is allowed. A third attempt requires:

- a source-level latency change;
- a regression fixture that proves the intended call reduction;
- full local parity and safety gates;
- a fresh manifest and independent review;
- the same exact-ID rollback and unchanged 3,000 ms, 10,000 ms, 15,000 ms, and 20,000 ms limits.

## Local experiment outcome

H1 is not sufficient as the release candidate. The older `mcp-search-v2-treatment` endpoint already used v3 candidate batching and still measured a 6,303 ms first recommendation call and a 16,869 ms warm recommendation p95 in the July 14 isolated run. That workload used eight logical queries, but it proves that variant batching alone does not remove the repeated metadata, hydration, semantic, and audit work.

H2 is the selected local candidate. `mcp-search-grouped` now uses the existing shared recommendation handler and is not deployed. Local verification proves:

- one candidate RPC for 4 logical queries instead of 4;
- one candidate RPC for the maximum 40 logical queries;
- one read from each private metadata table;
- one SVG hydration read;
- one public semantic read;
- one bulk audit insert retaining 40 audit rows;
- exact shared-versus-separate response parity;
- unchanged logical rate-limit cost;
- Material success and failure behavior preserved;
- the stable `mcp-search` route unchanged;
- all 225 deterministic search cases green.

The v4 candidate RPC required by this handler remains absent from production. The next packet must treat its additive creation and exact rollback as separate, bounded database mutations alongside the additive endpoint deployment.
