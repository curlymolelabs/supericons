# Admin dashboard Phase A Packet 2U: healthy-window recovery

Status: Ready for independent audit under the standing execution delegation. Not executed.

## Purpose

Deploy the repeatedly verified Phase A `admin-api` only while the shared database is healthy. The candidate replaces full-history dashboard scans with bounded rollup reads. It must meet the existing dashboard contract, a 24-hour queue p95 below 1,500 ms, and an all-time queue p95 below 1,000 ms.

The Packet 2T attempt proved that the candidate and exact rollback source both failed while the shared database was in a statement-timeout incident. The candidate did not fail a correctness check. Packet 2U prevents another deployment during that incident shape and retains a precise record if strict rollback verification later encounters environmental degradation.

## Pinned recovery

- Approval fingerprint: `08574b7055d1707342d2db7c94172c2cd85b0a105fda6bf60d8ceece30909b19`
- Implementation revision: `a342f51f185a7d168772fa7cf542eb7960ee8827`
- Implementation tree: `f03b8d0e3b7d9aaea050d6f4b522c86dcbce5e83`
- Current function id: `1ca7655a-e504-416f-9173-750016e79b73`
- Current function version: `47`
- Current update value: `1784204357587`
- Current JWT verification: disabled
- Exact rollback revision: `b0520d42f1b2cdd2a74e608495bf1e584e362e66`
- Exact rollback tree: `fc6f2e39c77638036ab1f73cab03bad5d6ab243a`
- Required Railway protection deployment: `d02a8053-0683-4f59-a68f-2ef27b143be1`

The active version 47 source was downloaded read-only after CLI authentication was restored. Its normalized SHA-256 is `63fc27f93507c5e6f09d62043ff468599523c3d6998241715c1d5972e6baa981`, and it matches only the pinned rollback revision in repository history.

## Healthy-window rules

1. The owner or executor confirms that the Supabase dashboard does not show a Disk IO Budget warning before the runner starts.
2. Railway protection must be live at version 0.4.18 with a closed circuit, at most 2 active hosted-engine calls, at most 8 queued calls, all required MCP tools, 8,524 Material assets, and zero synthetic tool calls from this gate.
3. The legacy `/stats` preflight has a 10,000 ms healthy limit and a 12,000 ms transport cutoff.
4. Any timeout or response above 10,000 ms blocks before deployment, regardless of HTTP status.
5. A fast HTTP 5xx under the threshold may proceed because it identifies a degraded legacy endpoint without the slow shared-database signature.
6. HTTP 401 or 403, unknown statuses, invalid payloads, and non-timeout network failures remain blocking.

## Measured rollup budget

1. The live backlog is measured in a read-only transaction after schema postflight.
2. Any historical hole blocks the deployment.
3. The measured pending count must be between 0 and 120.
4. Candidate verification authorizes exactly the measured pending-day writes plus one required no-write completion call, within 20 minutes.
5. Repeated days, extra days, incomplete completion, or deadline overrun fail the candidate gate.

## Guarded sequence

1. Reproduce the fingerprint, every file hash, implementation and rollback trees, Packet 2T evidence, the Railway protection completion evidence, and the active version 47 inventory.
2. Require the linked Supabase project and pooler URL to match `kcjmkakdhsqplvasgkjv`.
3. Require `admin-api` to remain active at the pinned id, version 47, update value, and disabled JWT setting.
4. Require the healthy-window confirmation and the live Railway protection contract before collecting secrets.
5. Run the Deno check, Phase A metric and API gates, classifier tests, and rollup boundary tests.
6. Use the database password only in process memory. Require the Packet 1 schema postflight and measure the rollup backlog with transaction-level and connection-level read-only enforcement.
7. Run the single latency-aware legacy preflight.
8. Deploy only `admin-api` from the pinned implementation revision.
9. Refresh exactly the measured pending rollup days and require the no-write completion call.
10. Require the Phase A dashboard response, 20 warm 24-hour queue samples with p95 below 1,500 ms, and 20 warm all-time queue samples with p95 below 1,000 ms.
11. If the candidate becomes active and then fails, deploy the exact legacy rollback revision and verify `/stats` strictly.
12. If exact rollback source becomes active but strict verification fails, retain separate code-restoration and service-restoration states. Timeout or HTTP 5xx is recorded as possible shared-database degradation, not as verified service restoration.

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

The standing owner delegation applies. An independent auditor GO for this exact fingerprint is the execution trigger. The owner only enters the two hidden secrets and performs final acceptance.

## Execution command after audit GO

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/run-admin-dashboard-phase-a-admin-api-release.ps1 -ApprovalFingerprint 08574b7055d1707342d2db7c94172c2cd85b0a105fda6bf60d8ceece30909b19 -Execute -DiskIoWindowConfirmed
```
