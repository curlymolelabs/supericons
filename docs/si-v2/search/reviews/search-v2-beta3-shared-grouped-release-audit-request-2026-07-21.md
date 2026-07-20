# Search v2 beta.3 shared grouped release audit request

Date: 2026-07-21

Requested verdict: independent GO or findings for the guarded attempt-3 release packet. Do not deploy, merge, version, or publish during this audit.

## Why attempt 3 exists

Attempts 1 and 2 deployed only the additive `mcp-search-grouped` endpoint. Both passed live routing and rolled back after the one-slot latency gate failed.

Attempt 2 recorded a one-slot p95 of 5,067 ms. A read-only trace of hosted audit rows then showed that every measured POST reached a different worker. The earlier `OPTIONS` keepalive schedule did not create worker affinity. Attempt 3 therefore removes the warm-worker claim and measures real first-call requests.

The underlying endpoint was also doing one complete search pipeline per logical query. Attempt 3 replaces that fanout with the existing shared recommendation pipeline:

- One candidate RPC for up to 40 logical queries.
- One read per metadata table.
- One final SVG hydration read.
- One public semantic read.
- One bulk audit insert covering all logical queries.
- In-band stage timing in the direct grouped response.

The stable `mcp-search` route remains byte-identical to `main`.

## Commit chain

Audit every commit after the last attempt-2 record:

1. `85647ebdbcf6669606291927ec8f9f49c75d7ee1` replaces grouped fanout with the shared recommendation pipeline and records the double-fault diagnosis.
2. `f479e7300` adds the database manager, database fixture, first-call measurement, combined rollback simulation, and attempt-3 packet verifier.
3. `4cdec1bca` fixes a PowerShell return-stream defect found by the committed rollback simulation.
4. `f62d6c589` binds the attempt-3 release manifest.

The deployment source is intentionally pinned to `85647ebdbcf6669606291927ec8f9f49c75d7ee1`. Later commits change only release controls and the manifest.

## Exact packet identity

- Manifest: `docs/si-v2/search/reviews/search-v2-beta3-shared-grouped-release-manifest-2026-07-21.json`
- Manifest SHA-256: `9699660da02f2f460e45df2a1208960b5dfce84f35226d98c0b7ea0242116f70`
- Source revision: `85647ebdbcf6669606291927ec8f9f49c75d7ee1`
- Source tree: `ba2929b59912e5eb1814a397ee48a706c7deadfb`
- Stable route blob: `71e568f3014a3e07f7271801b4503080b7111ec7`
- Shared candidate migration raw SHA-256: `e864e9ef9052fa4f894894285fc27993732ef00c46068f2ad2e52818c1b183c3`

## Authorized mutation budget

The guarded runner authorizes:

- One additive `mcp-search-grouped` deployment.
- One conditional deletion of that endpoint after exact function-ID match.
- One additive `si_search_icon_candidates_v4(jsonb,text,integer)` creation.
- One matching migration-history insert.
- One conditional database rollback that drops the exact v4 function and matching migration-history row after definition fingerprints match.
- Zero stable `mcp-search` deployments.
- Zero stable `mcp-search` deletions.
- Zero npm publications.

The database creation, parity checks, privilege checks, and migration-history insert run in one transaction. The database rollback also runs in one transaction.

## Required independent checks

### 1. Packet and source identity

- Recompute the manifest SHA-256.
- Verify every source and packet hash.
- Confirm the pinned source tree.
- Confirm the stable route blob equals `main`.
- Confirm no deployable source changed after `85647ebdb`.

### 2. Shared pipeline behavior

- Trace `mcp-search-grouped/index.ts` into `handleSharedRecommendationSearchRequest`.
- Verify the endpoint uses `si_search_icon_candidates_v4`, final SVG hydration, in-band timing, and a 40-query maximum.
- Rerun the shared-pipeline fixture and confirm one candidate RPC for both 4 and 40 logical queries.
- Confirm response parity with the separate control path.
- Confirm one bulk audit insert retains one row per logical query.
- Confirm the 20-slot English, Japanese, and repeated-slot fixtures pass.

### 3. Database manager safety

- Read the exact migration and manager line by line.
- Verify the v4 function is additive and service-role only.
- Verify apply checks v3 existence, v4 absence, migration-history absence, table presence, parity with v3, and function privileges before commit.
- Verify rollback refuses a mismatched SHA-256 or database MD5 fingerprint.
- Verify rollback drops only the v4 signature and deletes only the matching migration-history row.
- Rerun the committed database manager fixture.

### 4. Combined rollback safety

- Confirm endpoint rollback occurs before database rollback.
- Confirm missing or mismatched endpoint IDs refuse endpoint deletion.
- Confirm the database dependency is retained when endpoint identity is not verified.
- Confirm an exact endpoint match deletes once, then the exact database definition rolls back once.
- Confirm both Windows bsdtar and Git GNU tar scenarios execute the actual PowerShell runner.
- Confirm stable-function mutations remain zero in every scenario.
- Confirm the apply-output recovery path inspects database state before deciding rollback.

### 5. Measurement truthfulness

- Confirm the latency script makes no `OPTIONS` keepalive requests.
- Confirm it records `worker_affinity_assumed: false`.
- Confirm each scenario waits for the rate window, then measures back-to-back first-call requests.
- Confirm failed samples and p95 remain in the evidence before an assertion stops the run.
- Confirm the live direct grouped check requires in-band candidate-search and audit-write timing.

### 6. Read-only production preflight

- Confirm `mcp-search-grouped` is absent.
- Confirm stable `mcp-search` remains ID `ce1f7353-c5e7-4c8c-aeac-75d1f4df5a43`, version 40, active, and keyless.
- Confirm v3 is present.
- Confirm v4 and its migration-history record are absent.
- Confirm npm remains `beta` 0.4.19-beta.2 and `latest` 0.4.17.

## Reproduction commands

Run from the branch worktree:

```powershell
node scripts/verify-search-v2-beta3-grouped-packet.mjs --manifest-hash 9699660da02f2f460e45df2a1208960b5dfce84f35226d98c0b7ea0242116f70
```

```powershell
node scripts/manage-search-v2-shared-candidate-rpc.mjs --action preflight --project-ref kcjmkakdhsqplvasgkjv --expected-migration-hash e864e9ef9052fa4f894894285fc27993732ef00c46068f2ad2e52818c1b183c3
```

```powershell
& scripts/run-search-v2-beta3-grouped-release.ps1 -ExpectedManifest 9699660da02f2f460e45df2a1208960b5dfce84f35226d98c0b7ea0242116f70
```

The runner command above is a no-mutation dry run because it omits `-ExecuteApprovedGroupedRelease`.

## Executor reproduction already completed

The following results are claims for the auditor to reproduce, not substitutes for independent verification:

- Full packet passed with 37 source files and 9 packet files.
- Database manager fixture passed absent inspection, apply, present inspection, verify, mismatched-definition refusal, and exact rollback.
- Combined rollback simulation passed missing-ID, mismatched-ID, exact-ID bsdtar, and exact-ID GNU tar scenarios.
- Shared pipeline fixture passed one candidate RPC for 4 and 40 logical queries.
- Recommendation fixtures passed 20-slot English, Japanese, and repeated-slot cases.
- Exact runner dry run reported `preflight_ok_no_mutation`.
- The worktree was clean after the manifest commit.

## Release rule after audit

A full independent GO authorizes only the guarded attempt-3 database and grouped-endpoint release. It does not authorize beta.3 packaging or npm publication. Those remain separate gates after live latency passes.
