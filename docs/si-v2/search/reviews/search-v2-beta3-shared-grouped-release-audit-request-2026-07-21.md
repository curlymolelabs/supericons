# Search v2 beta.3 shared grouped release audit request

Date: 2026-07-21

Requested verdict: independent GO or findings for the guarded attempt-3 release packet, revision 3. Do not deploy, merge, version, or publish during this audit.

## Why this packet was rebound

Attempts 1 and 2 deployed only the additive `mcp-search-grouped` endpoint. Both passed live routing and rolled back after the one-slot latency gate failed. Attempt 2 recorded a one-slot p95 of 5,067 ms. Its samples reached different workers, so an earlier `OPTIONS` keepalive schedule did not prove warm-worker performance.

Attempt 3 replaces the per-query fanout with the shared recommendation pipeline. It uses one candidate RPC for up to 40 logical queries, shared metadata and SVG reads, one bulk audit insert, and in-band timing.

Independent review and the executor's follow-up review found six release-control gaps:

1. Latency evidence did not retain worker state, request ordinal, or module age.
2. Fixed temporary paths allowed concurrent runs to interfere.
3. The database recovery path could adopt a matching v4 function created by another run.
4. The no-mutation dry run recursively invoked release simulations.
5. Aborted runs could leave a fixed workspace that confused later runs.
6. Concurrent standalone packet audits could share rollback-simulation evidence paths.

Packet revision 3 closes those gaps. It does not expand the mutation budget.

## Complete commit chain

Audit every commit after the attempt-2 record:

1. `85647ebdbcf6669606291927ec8f9f49c75d7ee1` replaces grouped fanout with the shared recommendation pipeline.
2. `f479e7300` adds the database manager, database fixture, measurement controls, combined rollback simulation, and attempt-3 packet verifier.
3. `4cdec1bca` isolates PowerShell command output used by the release runner.
4. `f62d6c589` binds the first attempt-3 manifest.
5. `9bf24fdc6` records the first attempt-3 audit request.
6. `8291049d98b54817a50f098c3165a98fedf9803c` closes the five independent review findings.
7. `6aa095040` binds packet revision 2 to the corrected source and control files.
8. `837245aa3` updates the audit handoff after revision 2 passed.
9. The current audit-closure commit adds the standalone simulation lock and binds packet revision 3.

The deployment source is pinned to `8291049d98b54817a50f098c3165a98fedf9803c`. Later commits change only release controls, the manifest, and this audit request.

## Exact packet identity

- Manifest: `docs/si-v2/search/reviews/search-v2-beta3-shared-grouped-release-manifest-2026-07-21.json`
- Manifest SHA-256: `f56e256293cd232e7a19ca49bdc5331ce2ba9ebf03efabb5c099174ad8639831`
- Source revision: `8291049d98b54817a50f098c3165a98fedf9803c`
- Source tree: `255e4b7cae1e004d5c6ef01e93baaf0167593869`
- Stable route blob: `71e568f3014a3e07f7271801b4503080b7111ec7`
- Shared candidate migration raw SHA-256: `e864e9ef9052fa4f894894285fc27993732ef00c46068f2ad2e52818c1b183c3`
- Superseded packet-revision-2 manifest SHA-256: `59dd98f9cd81c40c59381e97f91ef752f8d2556d7bb7b4bd6f5741f2217f5550`

## Authorized mutation budget

The guarded runner authorizes:

- One additive `mcp-search-grouped` deployment.
- One conditional deletion of that endpoint after an exact function-ID match.
- One additive `si_search_icon_candidates_v4(jsonb,text,integer)` creation.
- One matching migration-history insert.
- One conditional database rollback after function fingerprint and run-owner checks.
- Zero stable `mcp-search` deployments or deletions.
- Zero npm publications.

The database creation, ownership record, parity checks, privilege checks, and migration-history insert run in one transaction. Database rollback checks the function fingerprint and matching run owner inside its transaction.

## Required independent checks

### 1. Packet and source identity

- Recompute the manifest SHA-256 and every source and packet hash.
- Confirm the pinned source tree and the stable route blob.
- Confirm the stable route equals `main`.
- Confirm no deployable source changed after `8291049d9`.

### 2. Worker timing and latency cohorts

- Trace `timingSink` and `includeTimingInResponse` from `mcp-search-grouped/index.ts` into the shared handler.
- Trace `measurement_timing` through `mcp/hosted-search-client.js` into the measurement-only JSONL record.
- Confirm normal MCP tool responses are unchanged.
- Confirm every sample records worker state, request ordinal, module age, end-to-end latency, handler latency, candidate-search time, and audit-write time.
- Confirm first-request and reused-worker cohorts remain separate.
- Confirm FR-47 p95 gates use only the reused-worker cohort and fail if too few reused-worker samples exist.
- Rerun the mixed-worker and missing-warm-cohort fixtures.

### 3. Shared pipeline behavior

- Trace `mcp-search-grouped/index.ts` into `handleSharedRecommendationSearchRequest`.
- Verify v4 candidate retrieval, final SVG hydration, in-band timing, and the 40-query maximum.
- Confirm one candidate RPC for both 4 and 40 logical queries.
- Confirm response parity, one audit row per logical query, and 20-slot English, Japanese, and repeated-slot coverage.

### 4. Database ownership and rollback

- Confirm apply records the generated run ID in the function comment and migration statements inside the same transaction.
- Confirm inspect reports `present_other_owner` without returning rollback fingerprints to a different run.
- Confirm verify and rollback refuse a different run owner.
- Confirm exact-owner rollback still checks SHA-256 and database MD5 fingerprints inside the transaction.
- Confirm rollback removes only the v4 signature and matching migration row.
- Rerun the database manager fixture.

### 5. Concurrent-run and workspace safety

- Confirm the lock lives under the Git common directory, so all worktrees share it.
- Confirm lock acquisition is atomic and release requires the exact run ID.
- Confirm the release runner and standalone rollback simulator use separate cross-worktree locks.
- Confirm each runner uses a unique workspace and removes it in `finally`.
- Confirm the dry run skips nested release simulations only under the runner marker.
- Rerun the concurrent-run fixture and verify the second runner changes no evidence or workspace state.

### 6. Combined rollback safety

- Confirm endpoint rollback occurs before database rollback.
- Confirm missing or mismatched endpoint IDs refuse deletion.
- Confirm the database dependency remains when endpoint identity is unverified.
- Confirm an exact endpoint ID removes the endpoint once, then exact-owner database rollback runs once.
- Confirm both Windows bsdtar and Git GNU tar execute the real PowerShell runner.
- Confirm stable-function mutations remain zero.

### 7. Read-only production preflight

- Confirm `mcp-search-grouped` is absent.
- Confirm stable `mcp-search` remains ID `ce1f7353-c5e7-4c8c-aeac-75d1f4df5a43`, version 40, active, and keyless.
- Confirm v3 is present, while v4 and its migration-history record are absent.
- Confirm npm remains `beta` 0.4.19-beta.2 and `latest` 0.4.17.

## Reproduction commands

Run from the branch worktree:

```powershell
node scripts/verify-search-v2-beta3-grouped-packet.mjs --manifest-hash f56e256293cd232e7a19ca49bdc5331ce2ba9ebf03efabb5c099174ad8639831
```

```powershell
node scripts/manage-search-v2-shared-candidate-rpc.mjs --action preflight --project-ref kcjmkakdhsqplvasgkjv --expected-migration-hash e864e9ef9052fa4f894894285fc27993732ef00c46068f2ad2e52818c1b183c3
```

```powershell
& scripts/run-search-v2-beta3-grouped-release.ps1 -ExpectedManifest f56e256293cd232e7a19ca49bdc5331ce2ba9ebf03efabb5c099174ad8639831
```

The runner command above omits `-ExecuteApprovedGroupedRelease`, so it cannot deploy, delete, or mutate the database.

## Executor results to reproduce

These are claims for independent reproduction:

- Full packet passed with 37 source files and 11 packet files.
- Database fixture passed different-owner inspect, verify, and rollback refusal plus exact-owner rollback.
- Measurement fixture passed mixed-worker classification and blocked a missing warm cohort.
- Concurrent-run fixture refused both a second runner and a second rollback simulator across worktrees without changing evidence or workspaces.
- Combined rollback simulation passed missing-ID, mismatched-ID, exact-ID bsdtar, and exact-ID GNU tar cases.
- Exact no-mutation runner returned `preflight_ok_no_mutation` and removed its unique workspace and release lock.
- Read-only production checks found the grouped endpoint absent, v4 absent, stable version 40, npm beta.2, and npm latest 0.4.17.

## Release rule after audit

A full independent GO authorizes only the guarded attempt-3 database and grouped-endpoint release. It does not authorize beta.3 packaging or npm publication. Those remain separate gates after live latency passes.
