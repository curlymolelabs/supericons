# Admin Dashboard V2 Final Verification

## Result

Admin Dashboard V2 passed its final production verification on 2026-07-17.

- Supabase `admin-api` is active at version 69 with JWT verification disabled.
- The deployed source matches implementation revision `3759719bd2c0389a2e9fa193dbcf8befd26b805d`.
- The deployed source SHA-256 is `b6000b27393fe737de5f7a2b04671c09999ffed80bbcffaf6325b8bbe4c16bae`.
- `mcp-search` remains active and unchanged at version 39.
- No rollback was required for the accepted release.

## Real-data walkthrough

The managed local dashboard was exercised against the live production API in headless Chromium.

- Three navigation sections rendered: Overview, Search Intelligence, and Audience.
- Four inline SVG charts rendered.
- Latest Activity rendered 50 live rows.
- The 30-day view included 27 completed rollup days.
- Custom dates reached the live API with the selected start and end dates.
- All four top-list tabs showed either real rows or a truthful reason for unavailable data.
- The query explorer, diagnostics, icon requests, contact inbox, registered users, and client list rendered truthful production states.
- Warm cached content appeared in 128 ms.
- No horizontal overflow was detected at 1440 by 1000.
- No browser credential prompt appeared, and the admin secret was not stored in the browser.

The browser screenshot was retained only in the private local temporary folder. Its SHA-256 is `1d1e5e8478daaa8bb8e54661bcd2fd4939ff42747dda026880cf01b0e0e26fb7`.

## Data accuracy

- Overview parity compared 27 completed days across nine count fields.
- Query parity compared the top 50 API rows against 3,887 database rows available for the checked period.
- The 30-day identity and geography sources were complete and not truncated.
- Copy and download rankings are available from existing web action events.
- Returned-icon rankings report unavailable for all venues because complete linkage currently exists only for Hosted MCP.
- The icon request inbox is available and returned 5 rows.
- The contact inbox is available and correctly returned 0 rows for the checked period.
- MRR reports unavailable because exact billing prices are not linked to every active subscription. No value is invented.

## Performance

- 24-hour queue cold p95: 800.7 ms, limit 1,500 ms.
- 24-hour queue warm p95: 772.8 ms, limit 1,500 ms.
- All-time queue cold p95: 904.9 ms, limit 1,300 ms.
- All-time queue warm p95: 812.2 ms, limit 1,000 ms.
- All four V2 routes passed the 5,000 ms warm request limit.
- The rollup backlog was complete, so the accepted release wrote zero rollup days.

## Mutation boundary

The accepted release changed only `admin-api`.

- Migrations: 0
- `mcp-search` changes: 0
- Railway changes: 0
- Storage changes: 0
- npm publications: 0
- Other function changes: 0

## Verification commands

- `npm run verify:admin-dashboard-phase-b`
- `npm run verify:admin-dashboard-v2-helpers`
- `npm run verify:admin-dashboard-v2-api`
- `npm run verify:admin-dashboard-phase-b-browser`
- `node scripts/verify-admin-dashboard-phase-b-live.mjs --output references/verification/admin-dashboard-v2-live-browser-walkthrough-2026-07-17.json`
- `supabase functions list --project-ref kcjmkakdhsqplvasgkjv --output json`

## Retained evidence

- `admin-dashboard-v2-final-release-completion-2026-07-17.json`
- `admin-dashboard-v2-final-release-live-2026-07-17.json`
- `admin-dashboard-v2-final-release-parity-2026-07-17.json`
- `admin-dashboard-v2-final-release-phase-a-regression-2026-07-17.json`
- `admin-dashboard-v2-live-browser-walkthrough-2026-07-17.json`
- `admin-dashboard-v2-final-live-inventory-2026-07-17.json`
