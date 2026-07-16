# Admin dashboard Phase A Packet 2S: admin API performance recovery

Status: Ready for independent audit and owner approval. Not executed.

## Purpose

Deploy the Phase A `admin-api` with a narrower 24-hour queue data path and a corrected performance gate. The target remains below 1,500 ms p95 for the 24-hour queue and below 1,000 ms p95 for the all-time queue.

Packet 2R completed the remaining 21 daily rollups and received a no-write completion response. Candidate correctness checks passed, but the release gate calculated p95 from ten samples, which made p95 equal to the single slowest sample. The reported 24-hour value was 1,757.5 ms. The gate did not retain the timing distribution before failing. The exact legacy source was restored as active version 45. The attempt evidence and rollback are retained in commit `c79c11d0565b0496825b85829787bb8d7a1c497f`.

## Pinned recovery

- Approval fingerprint: `9a6e4618b95b5a2f67539ddc9fb7aef0cebfd7c8d7343a5318436ed7f389b5b2`
- Implementation revision: `a342f51f185a7d168772fa7cf542eb7960ee8827`
- Implementation tree: `f03b8d0e3b7d9aaea050d6f4b522c86dcbce5e83`
- Current function id: `1ca7655a-e504-416f-9173-750016e79b73`
- Current function version: `45`
- Current update value: `1784201413595`
- Current JWT verification: disabled
- Exact rollback revision: `b0520d42f1b2cdd2a74e608495bf1e584e362e66`
- Exact rollback tree: `fc6f2e39c77638036ab1f73cab03bad5d6ab243a`

The active version 45 source was downloaded read-only after the rollback. Its normalized SHA-256 is `63fc27f93507c5e6f09d62043ff468599523c3d6998241715c1d5972e6baa981`, and it matches the pinned rollback revision.

## Correction

The implementation and gate changes are narrow:

1. A queue filtered to `agent_query`, `recommend_variant`, or `icon_lookup` now skips legacy icon evidence, which cannot match those filters. It fetches the eligible audit and MCP usage sources concurrently.
2. Queue behavior for `all` and `legacy_unknown` remains unchanged because those filters can include icon evidence.
3. The live gate uses 20 warm samples per queue. With the existing nearest-rank method, p95 is the nineteenth sample instead of the maximum sample.
4. The live evidence records the dashboard result, both complete timing arrays, p95, maximum, and the performance contract before any performance assertion can fail.
5. The performance limits remain unchanged.
6. A regression test locks which query origins need legacy icon evidence, and the API source gate locks the optimized queue plan.

## Guarded sequence

1. Reproduce the fingerprint, every file hash, implementation and rollback trees, the Packet 2R evidence, and the active version 45 inventory.
2. Require the linked Supabase project and pooler URL to match `kcjmkakdhsqplvasgkjv`.
3. Require `admin-api` to remain active at the pinned id, version 45, update value, and disabled JWT setting.
4. Run the Deno check, Phase A metric and API gates, and the rollup refresh boundary tests.
5. Use the database password only in process memory. Require the Packet 1 schema postflight and measure the rollup backlog with transaction-level and connection-level read-only enforcement.
6. Require exactly zero pending rollup days and no historical hole before deployment.
7. Require the legacy `/stats` route with the current `ADMIN_SECRET`.
8. Deploy only `admin-api` from the pinned implementation revision.
9. Make one rollup completion call and require it to report complete with no refreshed day.
10. Require the Phase A dashboard response, 20 warm 24-hour queue samples with p95 below 1,500 ms, and 20 warm all-time queue samples with p95 below 1,000 ms.
11. If the candidate becomes active and then fails, deploy the exact legacy rollback revision and verify `/stats`.

## Secrets

The runner asks locally for the Supabase database password and the separate `ADMIN_SECRET` through hidden prompts. Both values remain only in process environment variables and are removed in `finally`. They are not written to evidence or logs. `ADMIN_SECRET` is not the Supabase service-role key.

## Mutation budget

- Supabase `admin-api` candidate deployments: one.
- Conditional `admin-api` rollback deployments: one.
- Rollup refresh writes: zero.
- No-write rollup completion calls: one.
- Migration changes: zero.
- `mcp-search` changes: zero.
- Railway changes: zero.
- Direct database writes: zero.
- Storage changes: zero.
- npm publications: zero.

## Approval sentence

Approve Admin dashboard Phase A Packet 2S for fingerprint `9a6e4618b95b5a2f67539ddc9fb7aef0cebfd7c8d7343a5318436ed7f389b5b2`: deploy only `admin-api` from implementation revision `a342f51f185a7d168772fa7cf542eb7960ee8827` to Supabase project `kcjmkakdhsqplvasgkjv`, only if the linked database target matches, function id `1ca7655a-e504-416f-9173-750016e79b73` remains active at version `45`, update value `1784201413595`, with JWT verification disabled, the Packet 1 schema postflight passes, and the read-only backlog measurement reports exactly zero pending rollup days with no historical hole. Require one no-write rollup completion call, the Phase A dashboard contract, 20 retained warm samples per queue, 24-hour queue p95 below 1,500 ms, and all-time queue p95 below 1,000 ms. If the candidate becomes active but fails, deploy rollback revision `b0520d42f1b2cdd2a74e608495bf1e584e362e66` and verify `/stats`. No migration, rollup write, `mcp-search`, Railway, storage, npm, beta, or other function change is authorized.

## Execution command after approval

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/run-admin-dashboard-phase-a-admin-api-release.ps1 -ApprovalFingerprint 9a6e4618b95b5a2f67539ddc9fb7aef0cebfd7c8d7343a5318436ed7f389b5b2 -Execute
```
