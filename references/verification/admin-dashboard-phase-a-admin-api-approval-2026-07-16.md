# Admin dashboard Phase A Packet 2T: admin API preflight recovery

Status: Ready for independent audit under the standing execution delegation. Not executed.

## Purpose

Deploy the Phase A `admin-api` without making the known-slow legacy `/stats` route a latency blocker for its replacement. The candidate targets remain below 1,500 ms p95 for the 24-hour queue and below 1,000 ms p95 for the all-time queue.

Packet 2S measured zero pending rollup days, then stopped before deployment because the legacy `/stats` request exceeded its 120-second timeout. Production remained on active version 45. The attempt evidence is retained in commit `ad5b6396d69e05087061aa045dd55d97afb05827`.

## Pinned recovery

- Approval fingerprint: `585fbc0279f21f06c1c8c4d96d0e49ea575a7241547080f963d6827f20d914b0`
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

The preflight change is narrow:

1. Function metadata drift remains blocking before deployment: project, function id, version 45, update value, status, and JWT setting must match the packet.
2. The legacy `/stats` preflight still sends the supplied `ADMIN_SECRET`.
3. HTTP 401 or 403 blocks deployment because the secret was rejected.
4. HTTP 200 without the expected stats contract, any other 4xx response, and non-timeout network failures block deployment because the preflight result is not understood safely.
5. A timeout or HTTP 5xx response is retained as legacy degradation and does not block replacing the degraded function.
6. Rollback verification remains strict. It still requires a successful legacy `/stats` response after a rollback.
7. The Packet 2S candidate contract remains unchanged: one no-write rollup completion call, dashboard correctness, 20 retained warm samples per queue, and the same p95 limits.
8. Ten local classifier checks cover healthy, timeout, 5xx, rejected secret, unexpected status, invalid payload, and network failure outcomes. Three live-verifier integration cases prove that healthy and 5xx outcomes proceed while rejected authentication blocks.

## Guarded sequence

1. Reproduce the fingerprint, every file hash, implementation and rollback trees, the Packet 2R evidence, and the active version 45 inventory.
2. Require the linked Supabase project and pooler URL to match `kcjmkakdhsqplvasgkjv`.
3. Require `admin-api` to remain active at the pinned id, version 45, update value, and disabled JWT setting.
4. Run the Deno check, Phase A metric and API gates, and the rollup refresh boundary tests.
5. Use the database password only in process memory. Require the Packet 1 schema postflight and measure the rollup backlog with transaction-level and connection-level read-only enforcement.
6. Require exactly zero pending rollup days and no historical hole before deployment.
7. Probe the legacy `/stats` route with the current `ADMIN_SECRET`. Block on rejected authentication or an unknown contract. Retain and proceed on timeout or HTTP 5xx.
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

## Execution authority

The standing owner delegation applies. An independent auditor GO for the final fingerprint is the execution trigger. The owner only enters the two hidden secrets and performs final acceptance.

## Execution command after approval

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/run-admin-dashboard-phase-a-admin-api-release.ps1 -ApprovalFingerprint 585fbc0279f21f06c1c8c4d96d0e49ea575a7241547080f963d6827f20d914b0 -Execute
```
