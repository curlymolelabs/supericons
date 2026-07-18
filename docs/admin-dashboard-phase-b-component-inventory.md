# Admin dashboard component inventory

Date: 2026-07-18

## Architecture

The admin dashboard is a local operator tool backed by the protected production admin API.

- `admin.html` owns the page structure and dashboard styles.
- `public/admin-app.js` owns filter state, independent panel loading, rendering, paging, exports, and operator actions.
- `scripts/serve-admin-dashboard-phase-b-live.mjs` provides the recommended loopback-only gateway at `/admin` and keeps the admin secret out of browser code and storage.
- `supabase/functions/admin-api/index.ts` provides the bounded v2 read endpoints and protected review-write endpoints.
- `lib/admin-dashboard-v2.js` owns shared data normalization, grouping, KPI, series, and list semantics.

## Main components

| Component | Main element | Data source | Purpose |
|---|---|---|---|
| Global filter bar | `.filter-bar` | Local state shared by v2 requests | Applies time, venue, environment, and free-text filters |
| KPI strip | `.kpi-grid` | `GET /v2/overview` plus the complete account directory | Shows clients or client-days, real searches, true zero rate, and low-result rate |
| Search charts | `#searchesChart`, `#clientsChart`, `#qualityChart` | `GET /v2/overview` | Shows total or per-venue search volume, client history, and quality history |
| Top lists | `#topListRows` | `GET /v2/overview` | Shows searched, returned, copied, and true-zero rankings when the source is complete |
| Latest Activity | `#latestActivity` | `GET /v2/activity` | Shows newest search activity with server paging |
| Query explorer | `#queryExplorer` | `GET /v2/search` | Shows grouped search outcomes with server paging and complete filtered export |
| Gap worklist | `#gapWorklist` | `GET /v2/search` plus `POST /intelligence/search/review` | Shows repeated zero and low-result work with triage actions |
| Icon requests | `#iconRequests` | `GET /v2/search` plus `POST /v2/icon-requests/review` | Shows stored requests with New, Planned, Added, and Declined states |
| Contact inbox | `#contactInbox` | `GET /v2/search` | Shows stored contact messages with CSV and JSON exports |
| Diagnostics | `#diagnosticsContent` | `GET /v2/search` | Shows bounded source and completeness details with CSV and JSON exports |
| Audience funnel | `.funnel-grid` | `GET /v2/audience` plus the complete account directory | Shows client or client-day totals, registered accounts, active Pro accounts, and truthful MRR availability |
| Registered users | `#registeredUsers` | Protected paged `GET /users` plus `GET /v2/audience` telemetry | Shows every account with signup time, linked activity, venue, country, and masked email by default |
| All clients | `#allClients` | `GET /v2/audience` | Shows privacy-safe client profiles with server paging |

## Shared behavior

- Every list offers 25, 50, and 100 row choices.
- Server-backed query, activity, and client lists use numbered paging. Bounded lists use local numbered paging.
- Every panel has a compact named chevron control. Panels sharing a visual row collapse and expand together.
- Scroll regions are height-bounded, keyboard reachable, and hide the visual scrollbar.
- CSV and JSON exports use the complete filtered source. Export refuses a partial source rather than presenting partial rows as complete.
- CSV text beginning with a spreadsheet formula character is made inert before download.
- Activity, overview, search, audience, and account requests start independently. A slow panel does not block the others.
- Search explorer changes refresh only Search Intelligence. Account rows are not reloaded for unrelated filter changes.
- The browser may keep a sanitized aggregate Overview payload for up to 30 seconds. Secrets, emails, account rows, query rows, request rows, contact rows, and client rows are never stored in browser storage.
- Direct development mode keeps the entered admin secret in memory only and asks again after a reload.
- The managed gateway is the normal start path. It keeps `ADMIN_SECRET` in the local Node process and forwards protected API requests over loopback.
- Missing, partial, stale, loading, empty, failed, and ready states are explicit. A missing measurement is not rendered as zero.
