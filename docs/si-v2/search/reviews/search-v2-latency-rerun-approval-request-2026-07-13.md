# Search v2 latency rerun approval request

Date: 2026-07-13
Status: awaiting owner approval; this document does not authorize external action by itself
Manifest fingerprint: `5be12fca18ad902af3569366691a17bbfaafb6114cec4dc413945c8d18c586c6`

## Purpose

Complete the latency measurement that stopped on unstable live result ordering. The rerun confirms repeated response parity first, then measures direct hosted search, the real localized MCP search path, and one-slot recommendation.

This is an internal measurement. It is not a public beta, production rollout, or npm release.

## Corrections since the stopped run

- Both variants include the stable final icon-ID tie-break from commit `371ae98ba`.
- Both variants add the first distinct family retrieval term. The live `cog` query can therefore reach the maintained `gear` route without expanding every synonym.
- The localized measurement now uses the MCP client's real two-request path instead of counting a direct localized zero result as a completed search.
- Repeated parity is a separate gate before latency sampling.

## Bound artifacts

| item | exact value |
| --- | --- |
| Isolated endpoint | `mcp-search-v2-beta` |
| Shared rerun base | `5a2d054af` |
| Control commit | `53191e366` |
| Treatment commit | `87c445b7c` |
| Required existing migration | `20260713150000` |
| Migration SHA-256 | `8ad558920ae3565bd26fe3706a1ba8ef0e8c3b2ac9ddafce9f7b15e995ede42e` |
| Authorization manifest | `docs/si-v2/search/reviews/search-v2-latency-rerun-authorization-manifest-2026-07-13.json` |
| Manifest SHA-256 | `5be12fca18ad902af3569366691a17bbfaafb6114cec4dc413945c8d18c586c6` |

Control and treatment differ only in the isolated endpoint's measurement label, candidate RPC, and final-SVG setting.

## Requested external actions

Approval authorizes at most six deployments of the isolated endpoint, in this order:

1. Control parity.
2. Treatment parity.
3. Control search measurement.
4. Treatment search measurement.
5. Control recommendation measurement.
6. Treatment recommendation measurement.

The endpoint must be deleted after completion or immediately after any stop trigger.

Migration `20260713150000` is already applied. This request authorizes no SQL, migration-history repair, npm action, production function deployment, Netlify action, provider call, user invitation, or scheduled warm ping.

## Gate 1: repeated live parity

- Five fixed cases.
- Three responses per case per variant.
- Every case must have one stable response hash inside control and one inside treatment.
- Control and treatment must match on HTTP status, exact body hash, icon order, and SVG availability.
- The Bootstrap strict `cog` case and expanded Simplified Chinese settings case must return at least one result.

If any check fails, delete the endpoint and stop before latency sampling.

## Gate 2: search measurement

- One separate first request per variant.
- Twenty-five direct warm hosted requests per variant.
- One separate localized MCP first request per variant.
- Five localized MCP warm searches per variant.
- Report the number of hosted requests used by every localized search.

Limits:

- Direct hosted search warm p95 at or below 2,000 ms.
- Localized end-to-end MCP search warm p95 at or below 2,000 ms.
- Error rate at or below 1 percent.

## Gate 3: recommendation measurement

- Task: `Choose an icon for application settings.`
- Slot: `cog`.
- One separate first recommendation per variant.
- Twenty warm recommendations per variant.
- Report full recommendation duration and hosted search calls per recommendation.

Limit: treatment one-slot recommendation warm p95 at or below 3,000 ms.

## First-request rule

Report every first request separately. Do not hide it inside a warm average. Two consecutive treatment first requests above the relevant limit fail that surface.

## Stage evidence

After the measurement, export only `search_stage_timing` records for the isolated function and measurement window. The records must show variant, worker state, stage durations, counts, candidate SVG characters, approximate candidate payload characters, and response characters.

Use the Supabase function log view or an equivalent read-only export. Do not commit an export that contains credentials, raw queries, SVG content, session hashes, IP hashes, or unrelated logs. If safe stage evidence cannot be produced, the measurement is incomplete and publication remains blocked.

## Stop and rollback

Delete the isolated endpoint immediately if:

- repeated parity fails;
- a production function version changes;
- private data appears in logs;
- an unapproved external call occurs;
- error or latency limits trigger a stop; or
- safe stage evidence cannot be obtained.

The existing additive RPC may remain unused. Production functions and npm must remain unchanged.

## Decision after measurement

- Search and localized search pass, recommendation fails: build the one-call recommendation path.
- Candidate stage remains dominant: consider projection, index, or batching work.
- Startup, database cache, network, audit, or another stage dominates: fix that stage.
- All gates pass: prepare a separate public-beta approval. Do not publish automatically.

## Approval wording

To authorize this exact rerun, reply:

> Approve Search v2 latency rerun manifest `5be12fca18ad902af3569366691a17bbfaafb6114cec4dc413945c8d18c586c6` with up to six isolated beta deployments and the read-only measurements listed in the approval request. No SQL mutation, production function deployment, npm publication, scheduled warm ping, or model-provider call is authorized.
