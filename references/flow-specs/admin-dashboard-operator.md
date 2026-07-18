# Admin dashboard operator flow

- Date: 2026-07-18
- PRD: `docs/admin-dashboard-v2-prd-2026-07-17.md`
- Repair plan: `docs/admin-dashboard-v2-gap-remediation-plan-2026-07-18.md`
- Primary user: the Supericons operator
- Primary action: understand current product activity and act on search gaps

## 1. Flow

1. The operator starts the managed dashboard server and opens its local URL.
2. The managed gateway confirms that it has server-side access to the admin API.
   - If the gateway lacks the required secret, the server does not start and its terminal names the missing environment value.
   - If direct development mode is used, the dashboard opens the Admin access dialog and keeps the entered secret in memory only.
3. The dashboard opens Overview and starts Activity, Overview, Search, Audience, and Accounts requests together.
4. Each panel leaves its loading state independently.
   - A successful panel renders its own data.
   - An empty panel names why no rows exist.
   - A failed panel names the failed source and offers Retry.
   - Cached data may remain visible only when it belongs to the same active filter key, and it is labeled Stale until refresh succeeds.
5. The operator changes period, date range, venue, test-traffic inclusion, or search text.
   - Every affected panel enters Loading or Stale for the new filter key.
   - Account directory identity rows remain loaded when only activity filters change.
   - The dashboard never presents data from the previous filter key as current.
6. The operator opens Search Intelligence to inspect queries and work items.
7. The operator may page, change row count, filter outcomes, export complete filtered data, open diagnostics, or navigate from a Top zero row to its worklist entry.
8. The operator may triage a gap or update an icon-request status.
   - A successful write refreshes only the affected panels.
   - A failed write keeps the prior row, explains the failure, and allows Retry.
9. The operator opens Audience to review all registered accounts and activity-linked clients.
10. The operator may reveal masked emails for the current memory-only session. Full emails are never stored in browser storage.

## 2. Navigation rules

- Overview, Search Intelligence, and Audience are the only primary sections.
- Selecting a section changes the visible main section without discarding loaded data.
- Period buttons expose one selected state.
- Custom becomes active only after both dates are valid.
- Venue choices reflect venues with data for the active window. The current venue remains visible while its new-window count is loading.
- Top zero worklist links select Search Intelligence, reveal the worklist, apply the matching query, and focus the row.
- Browser Back is not used for section or filter state.

## 3. Screen inventory

1. Admin access dialog
2. Global dashboard shell
3. Overview
4. Search Intelligence
5. Audience
6. Gap or request write state

## 4. State matrix

### 4.1 Admin access dialog

| State | Required behavior |
|---|---|
| Empty | The input is blank, focus is in the input, and the primary action is Continue. |
| Loading | Continue is disabled while the first authenticated request is checked. |
| Success | The dialog closes, focus returns to the element that opened it, and the secret remains in memory only. |
| Error | The dialog stays open and says whether the value was missing or rejected. Focus returns to the input. |
| Blocked | If managed mode lacks its server-side secret, the server refuses to start. The browser does not offer a workaround. |
| Edge | Escape closes only when an existing valid memory-only secret can continue to serve the session. Tab and Shift+Tab stay inside the open dialog. |

### 4.2 Global dashboard shell

| State | Required behavior |
|---|---|
| Empty | Before any request completes, the shell shows navigation, filters, and panel skeletons. |
| Loading | The freshness line says Loading production data. Refresh is busy while requests are active. |
| Success | The freshness line says Up to date only after all required requests for the active filter key succeed. |
| Error | If all required requests fail, the freshness line says Production data could not be loaded and Refresh remains available. |
| Blocked | An expired or rejected secret opens the Admin access dialog. No production values remain labeled current. |
| Edge | A partial refresh says Some panels could not be updated. Same-filter cached panels are labeled Stale. Previous-filter data is not rendered. |

### 4.3 Overview

| State | Required behavior |
|---|---|
| Empty | Each chart or list names the valid reason it has no observations in the selected filters. KPI cards show No data, not numeric zero, when the measure is absent. |
| Loading | Each Overview panel keeps its own skeleton until its source resolves. Activity does not block KPI and chart requests. |
| Success | KPIs, charts, top lists, geography, and activity use the active filter key and completeness metadata. |
| Error | Each failed panel names the failed data source and offers Retry. Numeric placeholders are forbidden. |
| Blocked | A permission failure opens Admin access. The panel does not reveal old values as current. |
| Edge | Truncated or deadline-limited aggregates show an unavailable reason. Low-result coverage gaps render as gaps, and client-day values are labeled client-days. |

### 4.4 Search Intelligence

| State | Required behavior |
|---|---|
| Empty | Explorer, worklist, icon requests, and contact inbox each name why no rows match. |
| Loading | Only the panel being filtered, paged, exported, or refreshed shows busy state. |
| Success | Query semantics, venue, result availability, client measure, pagination, exports, and work actions match the API contract. |
| Error | A failed list or export leaves other panels usable, states what failed, and offers Retry. |
| Blocked | A failed write caused by permission leaves the row unchanged and opens Admin access when direct mode is active. |
| Edge | Full exports may exceed the visible row count. Aggregate result counts may be unavailable or minimum values and must say which. CSV user text is inert in spreadsheets. |

### 4.5 Audience

| State | Required behavior |
|---|---|
| Empty | The account list says No registered accounts only when the auth directory total is zero. A user with no linked activity says No linked search activity. |
| Loading | Account identities and activity enrichment load independently. Already loaded account identities remain visible while activity filters refresh. |
| Success | All auth accounts remain visible for every period. Matching telemetry supplies searches, venues, country, and true last activity. |
| Error | If enrichment fails, account identities remain visible and the activity columns state that activity could not be loaded. |
| Blocked | A permission failure does not expose account data and opens Admin access where direct mode is active. |
| Edge | All-time exact client profiles may be unavailable while account identities, client-days, and funnel history remain available. Email visibility lasts only for the current memory-only session. |

### 4.6 Gap or request write state

| State | Required behavior |
|---|---|
| Empty | A row without prior review shows Not reviewed or New, matching the source type. |
| Loading | The selected row disables its write controls and announces Saving. Other rows remain usable. |
| Success | The saved WHY or status appears and only affected panels refresh. |
| Error | The row keeps its last confirmed value, displays the save failure, and provides Retry. |
| Blocked | Missing or rejected permission prevents the write and requests Admin access without losing the attempted choice. |
| Edge | Repeating the current value is safe. Conflicting later data wins only after the API returns its confirmed record. |

## 5. Decision-critical information

- Freshness must distinguish current, stale, partial, and failed data.
- Every count must state whether it represents people, client-days, attempts, eligible attempts, or rows.
- Every partial source must expose its coverage or unavailable reason.
- Operator writes must show the last confirmed server state.
- Every export must state its active filters and include the complete filtered set.

## 6. Screen-state coverage result

| Screen | Empty | Loading | Success | Error | Blocked | Edge |
|---|---:|---:|---:|---:|---:|---:|
| Admin access dialog | Covered | Covered | Covered | Covered | Covered | Covered |
| Global dashboard shell | Covered | Covered | Covered | Covered | Covered | Covered |
| Overview | Covered | Covered | Covered | Covered | Covered | Covered |
| Search Intelligence | Covered | Covered | Covered | Covered | Covered | Covered |
| Audience | Covered | Covered | Covered | Covered | Covered | Covered |
| Gap or request write state | Covered | Covered | Covered | Covered | Covered | Covered |

All six required states are defined for every screen in this flow. Frontend repair may proceed against these contracts.
