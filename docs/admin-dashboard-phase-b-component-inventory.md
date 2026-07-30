# Admin dashboard component inventory

Date: 2026-07-18

## Architecture

The admin dashboard is a local operator tool backed by the protected production admin API.

- `admin.html` owns the page structure and dashboard styles.
- `public/admin-app.js` owns filter state, independent panel loading, rendering, paging, exports, and operator actions.
- `scripts/serve-admin-dashboard-phase-b-live.mjs` provides the recommended loopback-only gateway at `/admin`. It checks the secret entered through the local sign-in window and keeps the accepted value only in server memory.
- `supabase/functions/admin-api/index.ts` provides the bounded v2 read endpoints and protected review-write endpoints.
- `lib/admin-dashboard-v2.js` owns shared data normalization, grouping, KPI, series, and list semantics.

## Main components

| Component | Main element | Data source | Purpose |
|---|---|---|---|
| Header brand | `.brand-logo` | `brand/supericons-logo.svg` | Shows the official combined Supericons symbol and name |
| Global filter bar | `.filter-bar` | Local state shared by v2 requests | Applies time, venue, environment, and free-text filters |
| KPI strip | `.kpi-grid` | `GET /v2/overview` plus the complete account directory | Shows estimated reach or daily reach, real searches, true zero rate, and low-result rate |
| Search charts | `#searchesChart`, `#clientsChart`, `#qualityChart` | `GET /v2/overview` | Shows total or per-venue search volume, reach history, and quality history |
| Top lists | `#topListRows` | `GET /v2/overview` | Shows searched, returned, copied, and true-zero rankings when the source is complete |
| Latest Activity | `#latestActivity` | `GET /v2/activity` | Shows newest search activity with server paging |
| Search history | `#queryExplorer` | `GET /v2/search` | Shows one row per recorded top-level search or exact icon lookup, with server paging |
| Search summary | `[data-export="search-summary-csv"]` | Complete filtered `GET /v2/search?view=summary` pages | Downloads one row per unique query context for quick analysis |
| Request log | `[data-export="request-log-csv"]` | Complete fixed snapshot from `GET /v2/search/events?event_scope=primary` | Downloads one top-level MCP tool call per row as the ground truth request log |
| Audit bundle | `[data-export="audit-bundle-json"]` | Complete fixed snapshot from `GET /v2/search/events?event_scope=audit` plus Search summary | Keeps summary, MCP requests, web searches, and hosted diagnostics separate, with coverage, definitions, schemas, source metadata, and integrity checks |
| Reach and accounts | `.funnel` | `GET /v2/audience` plus the complete account directory | Shows estimated or daily reach, all-time registered accounts, all-time active Pro accounts, and truthful MRR availability |
| Registered users | `#registeredUsers` | Protected paged `GET /users` plus `GET /v2/audience` telemetry | Shows every account with separate signup, last sign-in, and last-search times, plus linked venue and country |
| Searchers | `#allClients` | `GET /v2/audience` | Shows masked searcher profiles with server paging |

## Shared behavior

- Every list offers 25, 50, and 100 row choices.
- Server-backed query, activity, and client lists use numbered paging. Bounded lists use local numbered paging.
- Every panel has a compact named chevron control. Panels sharing a visual row collapse and expand together.
- Scroll regions are height-bounded, keyboard reachable, and hide the visual scrollbar.
- Search has one visible table and three downloads. The main button is Search summary. Its small menu contains Request log and Audit bundle.
- Search history does not group identical search text. Every recorded top-level search or exact icon lookup remains a separate row with its own client ID, outcome, country, channel, result count, and time.
- CSV and JSON exports use the complete filtered source. Export refuses a partial source rather than presenting partial rows as complete.
- Search summary groups by normalized query, library filter, and query origin. It includes request and outcome counts, estimated client ID count, median result count, requested-limit distribution, country codes, channels, and time range in 21 columns. Approximate low results are included in the Low count and never fall through to Success.
- Request log uses one top-level MCP request per row after exact key-based source merging. It includes request-level fields only when recorded and never substitutes zero for a missing value. A positive result without usable icon references is marked as not recorded.
- Audit bundle keeps Search summary, top-level MCP requests, web searches, and hosted diagnostics in separate arrays. Its integrity section checks outcome reconciliation, honest Success labels, returned references, and searcher-detail availability. Likely query-text damage is a review warning, not an automatic failure.
- Estimated client IDs are not people. One user may produce several IDs, and one ID may represent shared infrastructure.
- The legacy root request identifier is excluded from Request log because it is not a proven request or session identifier. It may remain in Audit bundle diagnostics with an explicit warning.
- Search export filenames state the export type, selected period, and UTC generation time so repeated downloads remain distinguishable.
- CSV text beginning with a spreadsheet formula character is made inert before download.
- Activity, overview, search, audience, and account requests start independently. A slow panel does not block the others.
- Every filtered endpoint in one refresh uses the same view marker, data cutoff, and filter marker. Older responses are rejected.
- Search Intelligence summary totals use the same aggregate source as Overview. Search history rows use bounded detailed records so late records remain visible.
- Search history changes refresh only Search Intelligence. Account rows are not reloaded for unrelated filter changes.
- The browser may keep a sanitized aggregate Overview payload for up to 30 seconds. Secrets, emails, account rows, query rows, request rows, contact rows, and client rows are never stored in browser storage.
- Direct development mode keeps the entered admin secret in browser memory only and asks again after a reload.
- The managed gateway is the normal start path. It starts without a secret, accepts sign-in only over loopback, validates the value against the protected admin API, and keeps an accepted value only in the local Node process.
- The managed gateway clears its secret when the protected API rejects it, so an expired or rotated value returns the operator to the sign-in window.
- Missing, partial, stale, loading, empty, failed, and ready states are explicit. A missing measurement is not rendered as zero.
