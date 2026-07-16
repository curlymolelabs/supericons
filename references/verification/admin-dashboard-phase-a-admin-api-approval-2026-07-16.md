# Admin dashboard Phase A Packet 2R: admin API recovery

Status: Ready for independent audit and owner approval. Not executed.

## Purpose

Deploy only the already-audited Phase A `admin-api` implementation after measuring the exact remaining rollup backlog. Complete the historical rollup catch-up, then require the dashboard contract and queue latency gates.

The first Packet 2 attempt deployed candidate version 42. All 60 authorized refresh calls completed daily writes, but the gate could not make the additional no-write call required to prove that no day remained. The runner automatically restored the exact legacy source as active version 43 and verified `/stats`. The failed attempt and rollback are retained in commit `332036dc62b350f138c604b97d0ffd7ef5893dc3`.

## Pinned recovery

- Approval fingerprint: `cc86c9d1e7a2a7e04519e689c831141f10b75eb8b5ab9756b12e6b2d10ee5d68`
- Implementation revision: `3ce3224205c4ef13f7eb3ad0d83556db4c08c708`
- Implementation tree: `12070a25c24225b11cd19b0987cf500a23de1218`
- Current function id: `1ca7655a-e504-416f-9173-750016e79b73`
- Current function version: `43`
- Current update value: `1784198198114`
- Current JWT verification: disabled
- Exact rollback revision: `b0520d42f1b2cdd2a74e608495bf1e584e362e66`
- Exact rollback tree: `fc6f2e39c77638036ab1f73cab03bad5d6ab243a`

The active version 43 source was downloaded read-only after the rollback. Its normalized SHA-256 is `63fc27f93507c5e6f09d62043ff468599523c3d6998241715c1d5972e6baa981`, and it matches only the pinned rollback revision.

## Recovery correction

The recovery does not assume that 60 calls are enough.

1. Before deployment, a read-only SQL transaction measures completed telemetry days, complete rollup days, the pending backlog, partial table state, and historical holes.
2. The runner stops before deployment if the pending backlog exceeds 120 days or if a missing day exists on or before the latest completed rollup day. The sequential refresh endpoint cannot safely repair that shape.
3. The candidate gate receives the exact measured pending-day count. It permits exactly that many one-day writes plus one no-write completion call, with the existing 20-minute elapsed-time limit.
4. Every refresh response is retained in the live evidence even if a later assertion fails.
5. Local tests cover zero, one, 60, and 120 pending days, the extra completion call, duplicate-day rejection, and deadline enforcement.

## Guarded sequence

1. Reproduce the fingerprint, every file hash, implementation and rollback trees, the prior failure evidence, and the active version 43 inventory.
2. Require the linked Supabase project and pooler URL to match `kcjmkakdhsqplvasgkjv`.
3. Require `admin-api` to remain active at the pinned id, version 43, update value, and disabled JWT setting.
4. Run the Deno check, Phase A metric and API gates, and the recovery refresh boundary tests.
5. Use the database password only in process memory. Require the Packet 1 schema postflight and run the backlog query with both transaction-level and connection-level read-only enforcement.
6. Retain the measured backlog and stop before deployment unless it fits the recovery contract.
7. Require the legacy `/stats` route with the current `ADMIN_SECRET`.
8. Deploy only `admin-api` from the pinned implementation revision.
9. Refresh the exact measured pending days, up to 120 writes, then require one completion response. Stop after 20 minutes.
10. Require the Phase A dashboard response, ten warm 24-hour queue samples with p95 below 1,500 ms, and ten warm all-time queue samples with p95 below 1,000 ms.
11. If the candidate becomes active and then fails, deploy the exact legacy rollback revision and verify `/stats`.

## Secrets

The runner asks locally for the Supabase database password and the separate `ADMIN_SECRET` through hidden prompts. Both values remain only in process environment variables and are removed in `finally`. They are not written to evidence or logs. `ADMIN_SECRET` is not the Supabase service-role key.

## Mutation budget

- Supabase `admin-api` candidate deployments: one.
- Conditional `admin-api` rollback deployments: one.
- Rollup refresh writes through the candidate API: the measured pending-day count, with a hard maximum of 120.
- No-write rollup completion calls: one.
- Migration changes: zero.
- `mcp-search` changes: zero.
- Railway changes: zero.
- Direct database writes outside the API rollup refresh: zero.
- Storage changes: zero.
- npm publications: zero.

## Approval sentence

Approve Admin dashboard Phase A Packet 2R for fingerprint `cc86c9d1e7a2a7e04519e689c831141f10b75eb8b5ab9756b12e6b2d10ee5d68`: deploy only `admin-api` from implementation revision `3ce3224205c4ef13f7eb3ad0d83556db4c08c708` to Supabase project `kcjmkakdhsqplvasgkjv`, only if the linked database target matches, function id `1ca7655a-e504-416f-9173-750016e79b73` remains active at version `43`, update value `1784198198114`, with JWT verification disabled, and the Packet 1 schema postflight passes. Measure the rollup backlog in a read-only transaction, require no historical hole and at most 120 pending days, refresh exactly the measured pending days plus one no-write completion call within 20 minutes, then require the Phase A dashboard contract, 24-hour queue p95 below 1,500 ms, and all-time queue p95 below 1,000 ms. If the candidate becomes active but fails, deploy rollback revision `b0520d42f1b2cdd2a74e608495bf1e584e362e66` and verify `/stats`. No migration, `mcp-search`, Railway, storage, npm, beta, or other function change is authorized.

## Execution command after approval

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/run-admin-dashboard-phase-a-admin-api-release.ps1 -ApprovalFingerprint cc86c9d1e7a2a7e04519e689c831141f10b75eb8b5ab9756b12e6b2d10ee5d68 -Execute
```
