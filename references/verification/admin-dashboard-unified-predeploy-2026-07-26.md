# Admin dashboard unified predeploy verification

Date: 2026-07-26

Commit under test: `14ffca03c44a7300eb50dc6db272270aecbd02e8`

## Scope

This branch combines the restored Gaps and User requests tables with sortable dashboard tables. Search history and Searchers now send an approved sort field and direction to the admin API. The API sorts the complete filtered dataset before pagination.

The changed-file inventory from `git diff --name-only d1b988d94..HEAD` contains only the admin page, admin frontend, admin API, admin verification scripts, package scripts, and the admin download contract. It contains no website search, Search v2 ranking, MCP runtime, npm package, allowance, or product-channel files.

## Verification matrix

| Area | Command | Result |
|---|---|---|
| Admin page build | `npm run build:admin-html` | Passed. The builder confirmed the page remains local-only. |
| Frontend syntax | `node --check public/admin-app.js` | Passed. |
| Browser test syntax | `node --check scripts/verify-admin-dashboard-phase-b-browser.mjs` | Passed. |
| Client table sorting | `node scripts/verify-admin-dashboard-table-sorting.mjs` | Passed. |
| Complete server sorting | `npm run verify:admin-dashboard-server-sorting` | Passed, 2 tests. |
| Admin API contract | `npm run verify:admin-dashboard-v2-api` | Passed. |
| Search export contract | `npm run verify:admin-dashboard-search-export-contract` | Passed, 13 integrity checks retained. |
| Final outcome and reconciliation rules | `npm run verify:admin-final-outcome-contract` | Passed, 10 tests. |
| Demand Inbox and User requests | `npm run verify:admin-demand-inbox-v2` | Passed. |
| Search event shape and privacy | `npm run verify:admin-dashboard-search-events` | Passed, 4 cases. |
| Combined browser flow | `npm run verify:admin-dashboard-phase-b-browser` | Passed, 49 requests, 3 navigation sections, and 3 inline SVG charts. |
| Patch whitespace | `git diff --check` | Passed. |
| Forbidden dash scan | `rg -n '[\u2013\u2014]'` across changed files | Passed with no matches. |

## Browser proof

The browser test loaded the current dashboard, sorted Search history through the API in both directions, sorted Searchers through the API, paged both lists, saved a Gaps action, saved a User requests status and note, reloaded the updated data, and generated:

`output/playwright/admin-search-data-integrity.png`

Visual inspection confirmed:

- Search history remains the main table.
- Gaps sits directly below Search history.
- User requests sits below Gaps.
- Sorting is visible on Search history.
- The Gaps and User requests layouts remain intact.
- No side panel reduces the main table width.

## Blocked non-gating check

`npm run verify:admin-icon-request-review-migration` could not start because Docker Desktop was not running. The exact failure was that the Docker Linux named pipe did not exist.

This branch changes no migration or schema file. The Demand Inbox API and browser contract tests passed against the existing review-table interface. The blocked Docker migration smoke test remains an environment limitation, not a passing result.

## Predeploy verdict

GO for a guarded admin API deployment and live dashboard verification.

Rollback point: deployed admin API version 106.

Production completion is not claimed by this file. Live authenticated API checks, controlled channel capture, export verification, and the historical reconciliation decision remain required.
