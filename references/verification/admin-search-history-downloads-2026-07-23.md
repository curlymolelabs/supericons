# Admin Search History Download Verification

## Scope

This record covers the internal Search history table, outcome labels, source separation, test-traffic scope, and the three download choices.

## Verified behaviors

- The Search history screen contains one full-width table and no second column.
- The download menu is an overlay and does not change the table position or size.
- Table CSV exports grouped table rows.
- Event CSV exports top-level MCP events and excludes supporting diagnostics.
- Audit JSON separates top-level MCP events, web search events, and supporting diagnostics.
- Error and clarification groups do not fall through to Success.
- Controlled-test, preview, and local-development rows are excluded by default.
- Searcher identifiers are present in the grouped table and Table CSV.
- Raw internal request IDs are excluded from the curated CSV files.

## Evidence commands

The verification suite includes:

- `node scripts/verify-admin-dashboard-phase-b.mjs`
- `node scripts/verify-admin-dashboard-v2-helpers.mjs`
- `node scripts/verify-admin-dashboard-v2-api.mjs`
- `node scripts/verify-admin-dashboard-search-events.mjs`
- `node scripts/verify-admin-dashboard-v2-error-states.mjs`
- `node scripts/verify-admin-dashboard-v2-operator-contract.mjs`
- `node scripts/verify-admin-dashboard-v2-searcher-sync.mjs`
- `node scripts/verify-admin-dashboard-search-history-cap.mjs`
- `node scripts/verify-admin-dashboard-v2-telemetry-integrity.mjs`
- `node scripts/verify-admin-dashboard-local-login.mjs`
- `deno check supabase/functions/admin-api/index.ts`

## Browser checks

The 1487 by 1058 browser view verified:

- three stacked download choices
- unchanged table dimensions when the menu opens
- working test-traffic scope switch
- working Error outcome filter
- no console errors

The visual result and comparison history are recorded in `design-qa.md`.
