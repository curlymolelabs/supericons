# Admin Search History Download Verification

## Scope

This record covers the internal Search history table, query summary grain, outcome labels, result counts, source separation, test-traffic scope, filenames, and the three download choices.

## Verified behaviors

- The Search history screen contains one full-width table and no second column.
- The download menu is an overlay and does not change the table position or size.
- The visible labels and subtitles are:
  - Search summary: `One row per unique query. For quick analysis.`
  - Request log: `One row per tool call. Ground truth.`
  - Audit bundle: `Everything plus integrity checks. For verification.`
- Search summary groups by normalized query, library filter, and query origin.
- Request log exports one top-level MCP tool call per row. It excludes web searches and supporting diagnostics.
- Audit bundle separates Search summary, Request log, web searches, and supporting diagnostics.
- Audit bundle includes integrity checks for positive request counts, request reconciliation, unique summary keys, unique and recorded event identifiers, and valid source roles.
- Each filename identifies the export type, selected period, and UTC generation time.
- Search summary rows with zero requests are excluded before paging, summaries, or export.
- Error, failed lookup, and clarification groups do not fall through to Success.
- Controlled-test, preview, and local-development rows are excluded by default.
- Estimated client IDs are labelled as estimates and are not presented as people.
- Typical result uses the median recorded result count.
- Typical result is unavailable when a summary mixes incompatible result units.
- Raw internal request IDs and the unreliable legacy root request identifier are excluded from the curated CSV files.
- Spreadsheet formula characters are made inert in both CSV files.

## Evidence commands and results

The following commands passed on 2026-07-23:

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
- `deno check --node-modules-dir=auto supabase/functions/admin-api/index.ts`

## Browser checks

The automated 1440 by 900 browser test passed with:

- one primary Search summary button
- exactly two menu choices: Request log and Audit bundle
- no duplicate Table CSV action
- unchanged table dimensions when the menu opens
- the approved label and subtitle text
- type, period, and UTC time in all three filenames
- 19 Search summary columns
- 27 Request log columns
- event source separation
- audit data-set separation and integrity metadata
- working test-traffic scope switch
- 41 intercepted requests and a 67.6 ms warm fixture render

These browser numbers describe the deterministic test fixture, not production latency or production row counts.

## Live production reconciliation

The same admin function code was run against production data at the fixed cutoff `2026-07-23T10:24:32.241Z`.

The 24-hour result was:

- 342 Search summary rows
- 442 represented requests
- 441 Request log rows
- 1 web search row
- 388 supporting diagnostic rows
- 0 duplicate Search summary keys
- 0 zero-request Search summary rows
- 0 mixed-unit rows with an incorrect median

All ten live checks passed:

- published grain is query, library filter, and query origin
- every Search summary page was loaded
- Search summary keys are unique
- every Search summary row has at least one request
- represented requests match the API summary
- represented requests match the top-level MCP and web event total
- mixed result units do not report a median
- top-level event identifiers are recorded
- top-level event identifiers are unique
- the fixed audit snapshot is complete

The protected production function was deployed as active `admin-api` version 91. A request without the admin secret returned HTTP 403.
