# Admin Search History Download Verification

## Scope

This record covers the internal Search history table, outcome labels, source separation, test-traffic scope, and the three download choices.

## Verified behaviors

- The Search history screen contains one full-width table and no second column.
- The download menu is an overlay and does not change the table position or size.
- Grouped CSV exports one row per searcher, query, venue, library, job category, and origin.
- MCP Requests CSV exports top-level MCP searches and exact icon lookups. It excludes web searches and supporting diagnostics.
- Full Audit JSON separates grouped history, top-level MCP requests, web searches, and supporting diagnostics.
- Full Audit JSON includes integrity checks for positive activity, reconciled activity counts, unique event identifiers, recorded identifiers, and valid source roles.
- Each filename identifies the export type, selected period, and UTC generation time.
- Grouped rows with zero activity are excluded before paging, summaries, or export.
- Error and clarification groups do not fall through to Success.
- Controlled-test, preview, and local-development rows are excluded by default.
- Searcher identifiers are present in the grouped table and Table CSV.
- Raw internal request IDs are excluded from the curated CSV files.

## Evidence commands

The verification suite includes:

- `node scripts/verify-admin-dashboard-phase-b.mjs`
- `node scripts/verify-admin-dashboard-phase-b-browser.mjs`
- `node scripts/verify-admin-dashboard-search-export-contract.mjs`
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

The automated 1440 by 900 browser test verified:

- one primary Grouped CSV button
- exactly two menu choices: MCP Requests CSV and Full Audit JSON
- no duplicate Table CSV action
- unchanged table dimensions when the menu opens
- type, period, and UTC time in all three filenames
- expected grouped CSV analysis fields
- event source separation
- audit data-set separation and integrity metadata
- working test-traffic scope switch
- no browser test failures
