# Admin Search history event grain verification

Date: 2026-07-27

## Result

The visible Search history table now uses one row per recorded top-level search or exact icon lookup.

Identical search text is not combined. Each row keeps its own:

- estimated client ID
- outcome
- country
- channel
- exact recorded result count
- recorded time

The Search summary download remains a separate grouped export. It still uses one row per normalized query, library filter, and query origin.

## Verification

The browser fixture rendered four separate `varying results` searches with exact result counts of 2, 4, 6, and 8 icons.

Checks completed:

- `deno check supabase/functions/admin-api/index.ts`
- `node --check public/admin-app.js`
- `npm run verify:admin-dashboard-phase-b`
- `npm run verify:admin-dashboard-v2-helpers`
- `npm run verify:admin-dashboard-v2-api`
- `npm run verify:admin-dashboard-search-events`
- `npm run verify:admin-dashboard-search-export-contract`
- `node scripts/verify-admin-dashboard-v2-telemetry-integrity.mjs`
- `node scripts/verify-admin-dashboard-table-sorting.mjs`
- `node scripts/verify-admin-demand-inbox-v2.mjs`
- `node scripts/verify-admin-dashboard-v2-operator-contract.mjs`
- `node scripts/verify-admin-dashboard-v2-searcher-sync.mjs`
- `npm run verify:admin-dashboard-phase-b-browser`
- `npx vite build`

The browser check also confirmed server paging, sorting, outcome filtering, test-traffic filtering, Gaps, User requests, Search summary export, Request log export, and Audit bundle export still operate.

## Boundaries

- No Search v2 retrieval, ranking, icon results, or MCP tool response changed.
- No database schema or stored telemetry changed.
- Gaps keeps its query-level grouping and review actions.
- Request log and Audit bundle event sources are unchanged.
