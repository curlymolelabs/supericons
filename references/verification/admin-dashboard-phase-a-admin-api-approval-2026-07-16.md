# Admin dashboard Phase A Packet 2Z: owner-approved cold all-time bound

Status: Ready for independent audit. Not executed.

## Purpose

Deploy the verified Phase A `admin-api` only when direct measurements show that its shared dependencies are healthy. Packet 2Z first checks Supabase CLI authentication and the exact live function pins, before it writes any live-check evidence. It must run in the owner's visible, authenticated terminal so the two hidden credential prompts remain available. Background console launch is not allowed. The Supabase Disk IO Budget banner is retained as observed context, but it is not a release gate because it can remain visible after query performance has recovered.

The candidate replaces full-history dashboard scans with bounded rollup reads. It also loads independent queue sources concurrently and keeps identical queue payloads for 30 seconds in a cache capped at 64 entries. It must meet the existing dashboard contract, both 24-hour queue p95 measurements below 1,500 ms, the cold all-time p95 below 1,300 ms, and the warm all-time p95 below 1,000 ms. Cold and warm measurements are retained and enforced separately so cache speed cannot hide an uncached regression. The cold all-time limit is the only changed product bound. It is pinned to the owner-approved spec revision `56866d654abadf614b77d664d3c152a347dd0f4b`.

## Pinned recovery

- Approval fingerprint: `040c93e5c6f0d5e6c1c1c273618e9cbba54f74dd1b5bc10d450ca8d10a4a73c0`
- Implementation revision: `f12fbb56807e9aec9a4bc02348de26c485467ad0`
- Implementation tree: `ec786e919c7a42ce641f6d1853832b156fafba6a`
- Current function id, version, update value, and JWT setting: pinned by the verified Packet 2Y rollback evidence and rechecked live before any new evidence or mutation
- Exact rollback revision: `b0520d42f1b2cdd2a74e608495bf1e584e362e66`
- Exact rollback tree: `fc6f2e39c77638036ab1f73cab03bad5d6ab243a`
- Required Railway protection deployment: `d02a8053-0683-4f59-a68f-2ef27b143be1`

## Measured pre-deploy health rules

1. Supabase CLI authentication and the exact live `admin-api` id, version, update value, active status, and JWT setting must match before any write-once live-check evidence is created.
2. The live Railway service must report version 0.4.18, 8,524 Material assets, a closed hosted-search circuit, zero consecutive failures, at most two active calls, and at most eight queued calls. This check makes no synthetic MCP tool call.
3. The Packet 1 schema postflight must pass through a read-only database connection.
4. Three cheap indexed reads must each finish within 1,000 ms.
5. One query over a bounded 15-minute telemetry window must finish within 2,000 ms.
6. The legacy `/stats` response must be healthy and complete within 10,000 ms. Fast legacy failures do not proceed.
7. One strict Lucide search warms the production path. The next two strict searches must each return three valid Lucide results within 2,000 ms.
8. The strict search calls use `channel=internal_test` and `source=verify`, so the dashboard excludes them from real usage metrics.
9. The observed Disk IO Budget banner value is written to evidence as `visible`, `absent`, or `unknown`. It cannot block or permit the deploy.

## Measured rollup budget

1. The live backlog is measured in a read-only transaction after schema postflight.
2. Any historical hole blocks the deployment.
3. The measured pending count must be between 0 and 120.
4. Candidate verification authorizes exactly the measured pending-day writes plus one required no-write completion call, within 20 minutes.
5. Repeated days, extra days, incomplete completion, or deadline overrun fail the candidate gate.

## Guarded sequence

1. Reproduce the fingerprint, every file hash, implementation and rollback trees, retained prior-attempt evidence, Railway protection completion evidence, and the fresh active-function inventory.
2. Require the linked Supabase project and pooler URL to match `kcjmkakdhsqplvasgkjv`.
3. Require `admin-api` to remain active at the fresh inventory's exact id, version, update value, and disabled JWT setting.
4. Run the local Deno, metric, API, parser, search mock, preflight, and rollup boundary checks.
5. Require the live Railway protection contract before collecting secrets.
6. Use the database password only in process memory. Require the schema postflight, measured database health gate, and measured rollup backlog with transaction-level and connection-level read-only enforcement.
7. Require a healthy legacy `/stats` response and two measured strict production searches under their pinned thresholds.
8. Deploy only `admin-api` from the pinned implementation revision.
9. Refresh exactly the measured pending rollup days and require the no-write completion call.
10. Require the Phase A dashboard response. For each queue window, retain 20 cache-busted cold samples and 20 same-URL warm samples. Require both 24-hour distributions below 1,500 ms p95, the cold all-time distribution below 1,300 ms p95, and the warm all-time distribution below 1,000 ms p95.
11. If the candidate becomes active and then fails, deploy the exact legacy rollback revision and verify `/stats` strictly.
12. If the exact rollback source becomes active but strict verification fails, retain separate code-restoration and service-restoration states.

## Secrets

The runner asks locally for the Supabase database password and the separate `ADMIN_SECRET` through hidden prompts. Both remain only in process environment variables and are removed in `finally`. They are not written to evidence or logs. `ADMIN_SECRET` is not the Supabase service-role key.

## Mutation budget

- Supabase `admin-api` candidate deployments: one.
- Conditional `admin-api` rollback deployments: one.
- Rollup refresh writes: exactly the measured pending count, at most 120.
- No-write rollup completion calls: one.
- Migration changes: zero.
- `mcp-search` changes: zero.
- Railway changes: zero.
- Direct database changes outside the bounded rollup endpoint: zero.
- Storage changes: zero.
- npm publications: zero.

## Execution authority

The standing owner delegation applies. An independent auditor GO for the final exact fingerprint is the execution trigger. The owner runs the command in the same visible terminal where `supabase login` succeeded, enters the two hidden secrets, and performs final acceptance.

## Execution command after audit GO

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/run-admin-dashboard-phase-a-admin-api-release.ps1 -ApprovalFingerprint 040c93e5c6f0d5e6c1c1c273618e9cbba54f74dd1b5bc10d450ca8d10a4a73c0 -Execute -DiskIoBannerObserved visible
```
