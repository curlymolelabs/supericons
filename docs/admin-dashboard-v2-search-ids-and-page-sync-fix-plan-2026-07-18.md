# Admin dashboard Search IDs and page sync fix plan

- Date: 2026-07-18
- Status: revised for audit
- Branch: `codex/admin-dashboard-v2-gap-repair`
- Product authority: `docs/admin-dashboard-v2-prd-2026-07-17.md`
- Design authority: `mockups/admin-dashboard-v2-mockup-2026-07-17.html`
- Related evidence: `docs/admin-dashboard-v2-query-summary-integrity-2026-07-18.md`

## 1. Goal

Make identity and activity figures understandable without help, and make Overview, Search Intelligence, and Audience agree when they show the same filtered search data.

The dashboard must separate these concepts:

- a Search ID attached to search activity
- a registered account
- an active Pro account
- a search attempt

A Search ID is not automatically a person. It is a code attached to a search source, such as an app setup, API key, signed-in account, or shared service. One person can use more than one Search ID, and a shared service can represent more than one person.

## 2. Verified problems

The current code and screenshot confirm these issues:

1. The UI uses the phrase "privacy-safe identifiers," which does not explain the number in normal language.
2. Query summary no longer shows the Search ID count, even though that count can help distinguish concentrated repeat demand from broader demand.
3. Overview and Audience use the same date, venue, and test-traffic filters for search telemetry, but registered and Pro headline totals come from the all-time account directory.
4. Audience clears the text query before calculating its headline search figures, while some Audience lists still use the text query.
5. Search telemetry and account sign-in timestamps can appear in the same Last active column even though they follow different filter rules.
6. The dashboard loads its sections through separate requests, so one refresh is not a single locked view of the data.
7. Overview may briefly restore saved data while other sections load fresh data, creating a temporary mismatch.

## 3. Plain-language naming contract

Keep the clear existing term `Estimated reach`. Replace only the jargon around it:

| Current label | Replacement |
| --- | --- |
| Estimated reach | Estimated reach |
| Privacy-safe identifiers | Search IDs |
| Observed identifiers | Search IDs |
| Estimated reach over time | Estimated reach over time |
| Client-days in visible UI copy | Daily reach |
| Clients, when the value is not a confirmed account count | Search IDs |

### Default card copy

Keep the main card short:

- label: `Estimated reach`
- note for an exact view: `Search IDs seen in the selected period`
- note for a long-range daily total: `Daily reach for the selected period`

Put any deeper explanation behind the info icon. Do not place a long definition in the default card.

For registered and Pro figures, use the word "accounts," never "clients" or "Search IDs."

## 4. Search ID display

### 4.1 Overview

Keep the Estimated reach card:

- label: Estimated reach
- value: distinct Search IDs for the selected filters when exact identity rows are available
- note: `Search IDs seen in the selected period`
- info icon: states whether the number uses exact Search IDs or daily reach totals

Do not place all-time registered or Pro totals in this card's note. If linked-account activity is useful here, show filtered values explicitly:

- Search IDs linked to registered accounts in this period
- Search IDs linked to Pro accounts in this period

### 4.2 Query summary

Restore the Search ID count as supporting information without presenting it as a people count.

The Activity cell should show:

- primary: `20 searches`
- secondary: `3 Search IDs`
- details icon: opens the Search ID detail drawer for that row

Keep interpretation and deeper explanation inside the details view, not in the default table.

### 4.3 Search ID details

The details drawer should show only data that already belongs to the selected query group and filters:

- masked Search ID
- source type when known: signed-in account, API key, Local MCP, Hosted MCP, web, or unknown
- linked account status
- venue
- first seen
- last seen
- number of searches
- top query or the selected query
- country when recorded
- request references for debugging

Full internal values should not appear by default. The masked value must be stable enough to compare activity without exposing an email, API key, network address, or secret.

### 4.4 Audience

Keep the chart title `Estimated reach over time`. Rename the `Observed identifiers` list to `Search IDs`.

Keep two clearly separate groups:

1. Search activity:
   - Estimated reach
   - Search IDs linked to registered accounts in the selected period
   - Search IDs linked to Pro accounts in the selected period
2. Account inventory:
   - All registered accounts
   - All active Pro accounts

Account inventory cards must carry an `All time` scope label because date and venue filters do not change the existence of an account.

## 5. Cross-page filter contract

### 5.1 Filters that apply to search activity everywhere

These filters must produce the same search scope on Overview, Search Intelligence, and Audience:

- period
- custom from and to dates
- venue
- include test traffic
- query text when the panel contains query-based search activity

### 5.2 Account inventory scope

The full registered-user directory and total registered and Pro account counts are all-time account data.

- Do not silently change them when a search period changes.
- Label them `All time`.
- Activity columns inside the account table must follow the selected search filters.
- Last account sign-in must be shown as `Last sign-in`.
- Last linked search must be shown separately as `Last search`.

### 5.3 Text search

The global text field must not filter only part of a headline number.

Choose and enforce one rule per panel:

- query-based panels: text filters queries and recalculates their totals
- account inventory: text filters the account list but does not change all-time account totals
- a panel that cannot apply the text filter states that fact beside its title

## 6. Shared refresh contract

Every refresh should carry one shared view marker:

- selected filter key
- requested data cutoff time
- completed load time

Every v2 response should return:

- the applied filter key
- the applied data cutoff time
- the metric scope, such as filtered search activity or all-time accounts
- completeness or truncation state

The browser must reject a response whose filter key does not match the active controls.

Do not label the whole dashboard `Up to date` unless every required panel has loaded the same filter key. If one panel is stale or failed, identify that panel and keep the other verified panels usable.

## 7. Implementation order

### Phase 1: failing reconciliation checks

Add tests that fail against the current build:

1. Overview estimated reach equals Audience estimated reach for the same period, venue, and test-traffic setting.
2. Overview real searches equal the complete Search Intelligence attempt total for the same filters.
3. Venue totals add up to the all-venue total.
4. Account totals match the complete registered-user directory and remain labelled All time.
5. Account activity columns change with period and venue, while account totals do not.
6. A text query cannot filter an Audience list while leaving a related headline search figure unfiltered.
7. Last sign-in and Last search remain separate.
8. Responses from a previous filter key cannot replace the active view.
9. Search ID wording contains no unexplained "privacy-safe identifier" or "client" label. `Estimated reach` remains allowed.

### Phase 2: API contract repair

1. Add the shared filter key, data cutoff time, metric scope, and completeness fields.
2. Use one cutoff time across the v2 requests in a refresh.
3. Return Search ID counts and masked Search ID details at the correct query grain.
4. Keep account inventory totals separate from filtered account-linked activity.
5. Make Audience text filtering follow the contract in section 5.3.
6. Keep all raw scans bounded. No database migration is expected.

### Phase 3: UI repair

1. Apply the naming contract from section 3 without renaming Estimated reach.
2. Restore Search IDs as secondary information in Query summary.
3. Add the Search ID details icon and drawer.
4. Split Last sign-in and Last search.
5. Add visible scope labels: selected period or All time.
6. Show partial, stale, failed, and unavailable states without replacing missing data with zero.

### Phase 4: verification and release

1. Run unit and API contract tests.
2. Run browser tests for every period and venue.
3. Test a text query across all three sections.
4. Create one Local MCP search and one Hosted MCP search, then trace each through Overview, Search Intelligence, and Audience.
5. Confirm account totals match the complete account directory.
6. Confirm Search ID details contain no secret, email, raw API key, or network address.
7. Run a real-data walkthrough with screenshots.
8. Deploy only `admin-api` if the API contract changed.
9. Do not deploy `mcp-search`, publish npm, migrate storage, or push a Git remote as part of this fix.

## 8. Screen states

Every affected panel must define:

- loading: skeleton and active filter label
- empty: no matching search activity for the selected filters
- success: value, scope, and applied cutoff time
- error: data could not be loaded, with no false zero
- stale: previous value remains visible and clearly marked
- partial: limitation and missing coverage are stated beside the value

## 9. Navigation and interaction rules

1. Changing a global filter refreshes filtered search activity on all three sections.
2. Changing a global filter does not alter all-time account totals.
3. Opening Search ID details does not reset filters, pagination, or scroll position.
4. Closing Search ID details returns focus to the icon that opened it.
5. A response from an older filter key never replaces the active view.

## 10. Done criteria

This fix is complete only when:

1. The dashboard keeps Estimated reach and uses Search IDs and account language consistently.
2. The default cards and tables contain no long Search ID explanation; deeper meaning is available through the info or details icon.
3. The same filtered search measure agrees across Overview, Search Intelligence, and Audience.
4. All-time account totals are visibly separate from filtered search activity.
5. Query summary provides Search ID context and an inspectable details view.
6. Cross-page reconciliation tests fail against the current behavior and pass after the repair.
7. The live walkthrough produces no unexplained mismatch between pages.
