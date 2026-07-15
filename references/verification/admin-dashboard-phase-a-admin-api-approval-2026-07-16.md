# Admin dashboard Phase A Packet 2: admin API

Status: Ready for independent audit and owner approval. Not executed.

## Purpose

Deploy only the Phase A admin API after Packet 1 completes. The function adds the corrected dashboard metrics, read-time query-origin derivation, identity precedence, known-defect classification, bounded daily rollups, and the fast dashboard and queue paths.

## Pinned release

- Approval fingerprint: `ba68e3aa8f75ae8b099595e3b7fee880868ca9bfe2ab2977fbb1ce141886fed9`
- Implementation revision: `3ce3224205c4ef13f7eb3ad0d83556db4c08c708`
- Implementation tree: `12070a25c24225b11cd19b0987cf500a23de1218`
- Current function id: `1ca7655a-e504-416f-9173-750016e79b73`
- Current function version: `41`
- Current update time: `2026-07-07T09:53:07.672Z`
- Current JWT verification: disabled
- Exact rollback revision: `b0520d42f1b2cdd2a74e608495bf1e584e362e66`
- Exact rollback tree: `fc6f2e39c77638036ab1f73cab03bad5d6ab243a`

The live version 41 source was downloaded read-only from Supabase. It did not exactly match any existing commit because it had been deployed from an uncommitted working state. The downloaded source was preserved byte-for-byte after line-ending normalization in the dedicated rollback revision above. Its normalized SHA-256 is `63fc27f93507c5e6f09d62043ff468599523c3d6998241715c1d5972e6baa981`.

## Guarded sequence

1. Reproduce the packet fingerprint, file hashes, implementation tree, rollback tree, and live source inventory.
2. Require `admin-api` to remain active at function id `1ca7655a-e504-416f-9173-750016e79b73`, version `41`, update value `1783417987672`, with JWT verification disabled.
3. Run the Deno type check and the local metrics and API contract gates.
4. Use a read-only database connection to require Packet 1's columns, constraints, indexes, private rollup tables, and empty initial rollups.
5. Require the current admin API `/stats` route to pass with the existing admin secret.
6. Deploy only `admin-api` from the pinned implementation revision.
7. Require the function id to remain unchanged, the version to advance, active status, and JWT verification to remain disabled.
8. Refresh at most 60 completed UTC days and stop after 20 minutes. Each refresh processes only one day. The per-query rows write before the overview completion marker, so a partial write is replay-safe.
9. Require the Phase A dashboard response and its default `agent_query` contract.
10. After one warm-up request, measure ten 24-hour queue requests and ten all-time queue requests. Require 24-hour p95 below 1,500 ms and all-time p95 below 1,000 ms.
11. If the candidate reached active status but failed the candidate contract, redeploy the exact downloaded version 41 source and require the legacy `/stats` contract.

## Secrets

The runner asks locally for the Supabase database password and `ADMIN_SECRET` using hidden prompts. Both values are held only in process environment variables for the guarded checks and are removed in `finally`. They are not written to evidence or logs.

## Mutation budget

- Supabase `admin-api` candidate deployments: one.
- Conditional `admin-api` rollback deployments: one.
- Rollup refresh writes through the deployed API: up to 60 bounded daily calls.
- Migration changes: zero.
- `mcp-search` changes: zero.
- Railway changes: zero.
- Direct database writes outside the API rollup refresh: zero.
- Storage changes: zero.
- npm publications: zero.

## Approval sentence

Approve Admin dashboard Phase A Packet 2 for fingerprint `ba68e3aa8f75ae8b099595e3b7fee880868ca9bfe2ab2977fbb1ce141886fed9`: deploy only `admin-api` from implementation revision `3ce3224205c4ef13f7eb3ad0d83556db4c08c708` to Supabase project `kcjmkakdhsqplvasgkjv`, only if function id `1ca7655a-e504-416f-9173-750016e79b73` remains active at version `41`, update value `1783417987672`, with JWT verification disabled and the Packet 1 schema postflight passes. Refresh at most 60 completed-day rollups within 20 minutes, require the Phase A dashboard contract, 24-hour queue p95 below 1,500 ms, and all-time queue p95 below 1,000 ms. If the candidate becomes active but fails those checks, deploy exact production-v41 rollback revision `b0520d42f1b2cdd2a74e608495bf1e584e362e66` and verify `/stats`. No migration, `mcp-search`, Railway, storage, npm, beta, or other function change is authorized.

## Execution command after approval

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/run-admin-dashboard-phase-a-admin-api-release.ps1 -ApprovalFingerprint ba68e3aa8f75ae8b099595e3b7fee880868ca9bfe2ab2977fbb1ce141886fed9 -Execute
```
