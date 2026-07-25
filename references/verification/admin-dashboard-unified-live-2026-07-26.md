# Admin dashboard unified live verification

Date: 2026-07-26

Branch commit: `ec945113a488c36a29716c7ed2944127bada8fba`

Deployed Supabase function: `admin-api` version 108

Rollback sources:

- Version 107 source is stored in the ignored local temp folder.
- Version 106 source is stored separately in the ignored local temp folder.
- No database migration, Railway deployment, website deployment, or npm release was made.

## Live result

Status: passed with one controlled test-history warning.

The production dashboard loaded real data. Search history, Gaps, and User requests appeared in the correct order. A real User request review was changed, reloaded successfully, and then the temporary review was removed.

## Sorting

Authenticated API requests tested the complete filtered datasets:

| Endpoint | Sort | Rows checked | Result |
|---|---|---:|---|
| `/v2/search` | searches descending | 25 | Correct order |
| `/v2/audience` | searches descending | 25 | Correct order |
| `/v2/search` | invalid field | n/a | HTTP 400 |

The browser contract also clicked Search history and Searchers sort controls, confirmed the API parameters, and confirmed the first returned row changed to the complete-dataset result.

## Demand views

Live 30-day verification:

| Check | Result |
|---|---:|
| Gaps rows rendered | 25 |
| User requests rendered | 9 |
| User request filter | `signal_type = search_attempt`, `ui_surface = grid_empty_feedback`, production domain |
| Review survived reload | Yes |
| Temporary review removed | Yes |
| Automatic icon, alias, or ranking writes | 0 |

## Downloads

All six downloads completed through the authenticated dashboard:

| Scope | Search summary | Request log | Web searches | Diagnostics | Reconciliation |
|---|---:|---:|---:|---:|---|
| Test traffic excluded | 57 rows | 52 rows | 9 | 139 | Passed, 0 unexplained |
| Test traffic included | 61 rows | 57 rows | 12 | 148 | Needs attention, 2 unexplained controlled diagnostics |

The filenames, CSV schemas, export metadata, request metadata, and visible test-traffic switch agreed. Default product totals excluded all controlled probes. When test traffic was included, one Web, one Hosted MCP, and one Local MCP controlled final appeared exactly once. Two direct gateway probes appeared only as diagnostics and never as a product channel.

The two unexplained test rows were failed controlled Hosted MCP gate attempts. The audit bundle correctly retained the warning. The verifier accepts this only because every unexplained row in that scope is confirmed `controlled_test`. It does not change the product integrity rule.

## Historical reconciliation

The earlier headline of 601 unexplained rows mixed two different conditions:

| Condition | Rows | Current treatment |
|---|---:|---|
| Local MCP rows before verified Local coverage | 452 | `outside_verified_coverage` |
| Hosted MCP audit rows without an exact final link | 142 | Unexplained |
| Web audit rows without an exact final link | 7 | Unexplained |

The 149 genuinely unexplained rows run from 2026-07-19 to 2026-07-23. The seven-day audit therefore remains `needs_attention`. No historical row was fabricated, backfilled, or promoted into Search Summary.

The default 24-hour audit passed with zero unexplained and zero pending rows.

## Traffic check

Authenticated live API results with test traffic excluded:

| Period | Product searches | Web | Hosted MCP | Local MCP | Source complete |
|---|---:|---:|---:|---:|---|
| 24 hours | 61 | 9 | 52 | 0 | Yes |
| 7 days | 1,153 | 69 | 1,064 | 20 | Yes |
| 30 days | 1,796 | 69 | 1,707 | 20 | Yes |

Latest captured activity:

- Web: 2026-07-25 15:58 UTC
- Hosted MCP: 2026-07-25 18:17 UTC
- Local MCP: 2026-07-24 15:42 UTC

The five-probe evidence generated on 2026-07-24 at 19:13 UTC passed Web, Hosted MCP, Local MCP, signed gateway, and unsigned gateway checks. Search fingerprints, Hosted latency, and reconciliation passed in that run. Writer code was not changed by this dashboard release.

Conclusion: the lower 24-hour traffic is supported by complete current data, not by a known dashboard truncation or channel merge. Web and Hosted MCP are actively recording. Local MCP had no organic event in the latest 24 hours, but its last event and the recent passing controlled probe confirm that it has recorded successfully. A new signed five-probe run was not executed because the controlled-run secret was not available from the current secure local environment. The query-free website and gateway preflight passed without sending any search.

## Verification commands

- `npm run build:admin-html`
- `npm run verify:admin-dashboard-server-sorting`
- `npm run verify:admin-dashboard-v2-api`
- `npm run verify:admin-dashboard-search-export-contract`
- `npm run verify:admin-final-outcome-contract`
- `npm run verify:admin-demand-inbox-v2`
- `npm run verify:admin-dashboard-search-events`
- `npm run verify:admin-dashboard-phase-b-browser`
- `node scripts/verify-admin-demand-inbox-v2-live.mjs`
- `node scripts/verify-admin-search-downloads-live.mjs`

The Docker-based review-table migration smoke test was blocked because Docker Desktop was not running. No schema or migration changed in this release.

## Final release verdict

GO.

Version 108 meets the requested dashboard behavior and keeps known historical uncertainty visible. Rollback to version 107 is executable from the saved source if authenticated dashboard checks regress.
