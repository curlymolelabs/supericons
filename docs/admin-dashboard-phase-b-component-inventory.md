# Admin dashboard Phase B component inventory

Date: 2026-07-17

## Architecture

The admin dashboard remains a local-only static page.

- `admin.html` owns the page structure and embedded dashboard styles.
- `public/admin-app.js` owns state, API calls, rendering, filters, review actions, and browser storage.
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

## Shared patterns

- Existing buttons, badges, tables, drawers, colors, spacing tokens, and typography remain in use.
- Panel skeletons are visible before the first response.
- The latest Phase A dashboard response is cached in browser session storage by window, channel, and environment.
- Cached content renders immediately while a fresh request runs in the background.
- Refresh state is visible in the button and in `#phaseBRefreshStatus`.
- Latest Activity loads before the secondary intelligence requests.
- Fields that do not exist for a channel are omitted instead of replaced with missing-data text.
