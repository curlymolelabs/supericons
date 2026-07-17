# Admin dashboard Phase B component inventory

Date: 2026-07-17

## Architecture

The admin dashboard remains a local-only static page.

- `admin.html` owns the page structure and embedded dashboard styles.
- `public/admin-app.js` owns state, API calls, rendering, filters, review actions, and browser storage.
- `scripts/serve-admin-dashboard-phase-b-live.mjs` serves the local walkthrough and forwards API requests without exposing the stored admin secret to the browser.
- `supabase/functions/admin-api/index.ts` defines the Phase A API contract consumed by the page. Phase B does not change this function.

## Phase B components

| Component | Main element | Data source | Purpose |
|---|---|---|---|
| Global filter bar | `#panel-intelligence .panel-header` | Local state plus all intelligence requests | Applies time, channel, environment, and free-text search across the dashboard |
| KPI strip | `#phaseBKpiStrip` | `GET /intelligence/search/dashboard` summary | Shows estimated unique clients or client-days, real searches, true zero rate, and low-result rate |
| Latest Activity | `#phaseBLatestActivity` | `GET /intelligence/search/dashboard` latest activity | Shows the newest direct searches first, with visitor and origin chips |
| Gap Worklist | `#phaseBGapPanel` | `GET /intelligence/search/queue` | Shows true zero and low-result searches with review actions |
| Diagnostics | `#intelligenceRawSignalsDetails` | Existing overview, search, and evidence endpoints | Keeps raw counts, secondary metrics, and detailed activity available without crowding the default view |
| Query detail drawer | `#queryDetailDrawer` | Existing query detail endpoint | Preserves detailed evidence and notes for a selected gap |
| Row display control | `[data-row-limit]` | Local display state | Shows 25 rows by default, with 50 and 100 row choices for long lists |
| List pagination | `[data-pagination]` | API pagination for Query explorer and All clients; local pagination for bounded lists | Shows numbered pages plus Previous and Next controls when more rows exist |
| Collapsible panel control | `[data-panel-toggle]` | Local display state | Uses a compact chevron icon and collapses or expands every panel in the same visual row together |
| Scroll region | `.scroll-region` | Rendered list or table rows | Keeps long panels within the viewport while allowing vertical scrolling without a visible scrollbar |
| Gap and request exports | Gap worklist and Icon requests panel actions | Current filtered search response | Downloads the complete filtered rows as CSV or JSON |
| Registered account directory | `#registeredUsers` | Existing protected `GET /users` endpoint plus the audience response | Shows all account and Pro totals, signup time, last sign-in, and masked email by default |
| Email visibility control | `#toggleRegisteredEmails` | Local display state | Reveals full registered-user emails only after the operator selects the eye icon |

## Shared patterns

- Existing buttons, badges, tables, drawers, colors, spacing tokens, and typography remain in use.
- Panel skeletons are visible before the first response.
- The latest Phase A dashboard response is cached in browser session storage by window, channel, and environment.
- Cached content renders immediately while a fresh request runs in the background.
- Refresh state is visible in the button and in `#phaseBRefreshStatus`.
- Latest Activity loads before the secondary intelligence requests.
- Fields that do not exist for a channel are omitted instead of replaced with missing-data text.
- The local live walkthrough uses managed authentication through a loopback-only gateway, so it does not show a password prompt or store the admin secret in browser code.
