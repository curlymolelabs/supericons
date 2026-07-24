# Admin final-outcome history repair verification

Date: 2026-07-24

## Scope

This repair is limited to admin telemetry and reporting. It does not change Search v2 ranking, website search results, MCP tool responses, npm publication, or public tool names.

The repair:

- combines trusted Hosted MCP outcomes from `mcp_usage_events` with the newer `search_final_outcomes` records;
- removes duplicates using the source event ID;
- keeps Web, Hosted MCP, and Local MCP as separate channels;
- calculates channel menu counts without applying the selected channel;
- preserves Hosted MCP latency;
- records recommendation icon references from either `icon_ref` or `library:id`;
- treats an unrecorded positive result reference as missing coverage, not as a false integrity failure;
- restores the reviewed dashboard frontend and its 31-column request log.

## Production deployment

| Part | Verified production state |
|---|---|
| Database migration | `20260724120000` is recorded in `supabase_migrations.schema_migrations`. |
| Admin API | Supabase function `admin-api` is active at version 98. |
| Hosted MCP telemetry mapper | Railway deployment `922fa03e-38db-4232-b464-8f82916a7186` is active with status `SUCCESS`. |
| Hosted MCP health | `/health` returned `ok: true`, version `0.4.22`, both resilience circuits closed, no active or queued work, and zero consecutive failures. |

## Production data reconciliation

The following counts use a fixed cutoff of `2026-07-24 09:02:02.53137 UTC`. Test, preview, and local development traffic are excluded.

| Period | Total | Web | Hosted MCP | Local MCP | Hosted with latency |
|---|---:|---:|---:|---:|---:|
| 24h | 230 | 7 | 213 | 10 | 213 |
| 7d | 1,109 | 7 | 1,092 | 10 | 1,092 |
| 30d | 1,626 | 7 | 1,609 | 10 | 1,609 |

These period totals are different, which confirms that longer periods no longer collapse to the new ledger's short history.

Additional database checks:

- 79 of 79 current Hosted MCP final-ledger rows contain latency.
- Zero positive recommendation rows claim recorded references while holding an empty reference list.
- No historical Web outcomes were invented. Web coverage begins at its verified final-outcome cutover.

## Verification commands

The following checks passed against commit `e24740c09`:

- `npm run verify:mcp-usage-event-detail`
- `npm run verify:admin-final-outcome-contract`
- `npm run verify:admin-dashboard-search-export-contract`
- `npm run verify:admin-dashboard-v2-api`
- `npm run verify:admin-dashboard-phase-b`
- `npm run verify:admin-dashboard-v2-helpers`
- `npm run verify:admin-dashboard-search-events`
- `npm run verify:admin-dashboard-phase-b-browser`
- `npm run verify:admin-dashboard-local-login`
- `npm run verify:search-final-outcome-migration`
- `npm run build`

The migration verification used a disposable PostgreSQL 17 database and passed its apply, repeated apply, data preservation, rollback, access, and rate-limit checks.

## Local dashboard integration check

Before main-folder integration, the reviewed frontend had SHA-256:

`9FD22FE45EE8DBDB556672AA59F101CB21E794BE3EB95D12373A6F5756A38693`

The old main-folder and served frontend both had SHA-256:

`14C55CFBEE6B71D0560AB70AAB943BE7463028AE98AC76B7323BC2957AFDEA9E`

This proves that the running dashboard still served the old main-folder file before integration. The final merge and restart check must show that the main-folder and served hashes match the reviewed frontend hash.

## Rollback

- Database: run `supabase/rollbacks/20260724120000_repair_final_outcome_history_fields.rollback.sql`. The rollback removes the added latency column and trigger assignment without deleting final outcomes.
- Admin API: redeploy the prior function bundle.
- Hosted MCP: redeploy the prior Railway deployment.
- Local dashboard: stop the server and start it from the intended main folder.

## Release decision

Production data reconciliation and automated checks are ready for integration. Final GO still requires the main-folder merge, dashboard restart, served-file hash match, and one final browser load from the restarted server.
