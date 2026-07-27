# Admin dashboard v2 discovery and API contract

- Date: 2026-07-17
- Scope: verified production data sources and the internal API contract for dashboard v2
- Safety: discovery used read-only catalog and aggregate queries. No contact details, query text, client identifiers, credentials, or other personal values were retained.

## Verified data sources

### Copy and download events

The public web app already records per-icon actions through `si_log_icon_evidence`.

- `lib/icon-intelligence.js` writes `signal_type=copy` with the icon ID, optional search query, result position, UI surface, and an action label in `evidence_text`.
- `main.js` calls that writer for SVG, Base64, component, PNG, ICO, and other copy or download actions.
- Production has 604 copy-family rows covering 196 rows explicitly labeled as copy or download. The remaining older rows still identify the icon but predate the explicit action label.
- The copied/downloaded top list can therefore ship without a public-site change. Rows are labeled by the recorded action, and older unlabeled rows are counted only in the combined total.

### Returned icons

Returned-icon coverage is partial.

- Hosted MCP result rows are recorded as `mcp_call` with query, icon ID, result position, and batch ID. Production has 3,996 such rows with full linkage.
- Web `search_attempt` rows record query and result count but not every icon in the result set.
- A venue-wide "top returned" number would therefore overstate incomplete data. The API reports the coverage as partial and the default UI uses a supported unavailable-data state that names the missing web result-set linkage. It may show MCP-only rows only when the user explicitly selects Hosted MCP.

### Icon requests

The four known icon requests are verified.

- They are `icon_evidence` rows with `signal_type=search_attempt`, `ui_surface=grid_empty_feedback`, and non-empty `evidence_text`.
- Production has four rows from three monthly-stable submitter identities.
- `icon_evidence` has no request status column. V2 first ships the real request inbox read-only. Status writes require a separate additive status store and are not inferred from query-review statuses because the vocabularies differ.

### Contact submissions

Contact submissions are stored.

- The active `contact-form` function is version 54 and inserts into `public.contact_submissions` before sending an email notification.
- The table has `id`, `name`, `email`, `interest`, `message`, and `created_at`.
- Production currently has one stored submission.
- The table has no workflow status column. V2 shows the stored submission and does not invent a status.

### Audience and signups

- `auth.users` provides signup time, last sign-in time, provider, email, and user metadata.
- Production currently has Google and email signups. Common metadata includes name and avatar fields for Google accounts.
- `mcp_usage_events` provides registered, Pro, account plan, API-key identity, country, and query-origin fields needed for telemetry enrichment.
- The API returns truncated display identifiers. It does not expose full client hashes.

### MRR

Exact MRR is not safe to calculate from the current database records.

- The public pricing source identifies the current monthly and annual Stripe price IDs and displays $15 per month and $99 per year.
- `si_subscriptions` stores the plan label but not the subscribed Stripe price ID or paid unit amount.
- Production includes both `pro_monthly` and a legacy generic `pro` plan. Applying the current monthly price to the generic row would be an assumption.
- V2 shows active Pro counts and plan coverage. Currency is omitted until each active subscription can be joined to an authoritative billing price.

### July 16 outage classification

- Rows whose audit status is `error` are already classified as errors by the Phase A metric contract and do not count as true zero results.
- The verified July 16 database outage produced a concentrated set of error rows between roughly 11:30 and 13:20 UTC.
- The quality chart may label this outage span for context. The true-zero calculation must not exclude otherwise successful zero-result rows merely because they occurred in the same clock window.

## Internal API contract

Every route:

- requires the existing `x-admin-secret` header;
- is read-only unless the route explicitly says it writes a review;
- accepts only bounded filters;
- uses a 30-second bounded cache for aggregate reads;
- returns a `meta` object with the shared view marker, data cutoff, applied filter marker, metric scope, completeness notes, and generation time;
- never returns raw IP addresses or full anonymous, API-key, session, or user-agent hashes.

### `GET /v2/activity`

Purpose: load the latest activity before all aggregate panels.

Query:

- `window`: `1d`, `7d`, `30d`, `90d`, `1y`, or `all`
- `from`, `to`: optional UTC date boundaries for a custom range
- `channel`: supported venue or `all`
- `include_test`: `true` or `false`, default `false`
- `q`: optional plain-text query filter
- `view_id`, `data_cutoff`, and `filter_key`: shared values sent by one dashboard refresh
- `limit`: 1 to 100, default 50

Response:

- `activity`: compact rows with query, library, origin, visitor kind and truncated key, result count, country, venue, and timestamp
- `channel_counts`: live counts for the venue selector
- `meta`

### `GET /v2/overview`

Purpose: load the KPI strip, charts, top lists, and geography.

Query: the shared window, channel, include-test, and text filters.

Response:

- `kpis`: estimated reach, attempts, success rate, searches per searcher, true-zero rate, and low-result rate
- `series`: daily rows by venue with attempts, client-days, registered clients, Pro clients, true zeros, low results, and eligible attempts
- `outage_spans`: labeled operational windows for chart shading
- `top_lists.searched`
- `top_lists.zero`
- `top_lists.returned`, including `available` and `coverage`
- `top_lists.copied`
- `geography`
- `meta`

### `GET /v2/search`

Purpose: provide the single query explorer, gap worklist, icon request inbox, diagnostics summary, and stored contact inbox.

Query:

- shared window, channel, include-test, and text filters
- `page` and `page_size`, capped at 100 rows
- supported key filters: `zero`, `low`, `country`, `origin`, `registered`, and `venue`

Response:

- `queries`: paged explorer rows
- `summary`: complete request and summary-row totals for reconciliation
- query rows use one row per recorded top-level search or exact icon lookup
- identical search text remains in separate rows
- query rows include the estimated client ID, outcome, exact recorded result count, result unit, country, channel, tool, and recorded time
- estimated client IDs are not verified people. One person may produce several IDs, and one ID may represent shared infrastructure
- `pagination`
- `worklist`: ranked zero and low-result rows with existing query-review state
- `icon_requests`: the verified `grid_empty_feedback` rows
- `contact_submissions`: bounded newest-first rows
- `diagnostics`: compact coverage and defect-registry facts
- `meta`

`view=summary` changes only the paged `queries` list to one row per normalized query, library filter, and query origin. Search summary and Audit bundle downloads use this mode. The visible Search history table does not.

The existing `POST /intelligence/search/review` route remains the write path for query triage.

### `GET /v2/search/events`

Purpose: provide a bounded event-detail source for Request log and Audit bundle without changing the Search summary contract.

Query:

- shared window, channel, include-test, and text filters
- `page` and `page_size`, capped at 100 rows

Response:

- `events`: one telemetry event per row after exact key-based source merging
- each event includes the estimated client identifier, query origin, tool, locale, requested limit, result count, returned icon references when recorded, latency, outcome, error code, traffic class, client family, server version, and build identifier
- `field_coverage`: recorded count, total count, and coverage rate for fields that may be missing from older events
- `definitions`: event grain, outcome, traffic-class, and null-handling rules
- `events_complete` and `events_export_available`: false when the selected detail exceeds the bounded source limit
- `pagination`
- `meta`

This endpoint never returns raw request IDs, raw session values, raw network values, API keys, user-agent strings, full hashes, or user email addresses. Null means a value was not recorded and is never converted to zero.

Top-level MCP metrics use rows whose source is `mcp_usage_events`. Rows whose source is `search_request_audit` describe lower-level hosted search work, including recommendation variants and fallbacks. They remain diagnostic rows and are not added to top-level MCP counts. The legacy root request identifier is retained only as supporting audit data because current records do not prove that it is a unique request or session identifier. Rows are never joined by time or query text.

### `GET /v2/audience`

Purpose: load estimated reach, the registered-account list, and the Searchers list.

Query:

- shared window, channel, include-test, and text filters
- `page` and `page_size`, capped at 100 rows

Response:

- `funnel`: estimated reach, registered account totals, Pro account totals, plus an explicit MRR availability reason
- `registered_users`: masked account label, provider, plan, signup, last search, searches, venues, and country
- `clients`: masked searcher label, kind, plan, country, first and last seen, searches, and top query
- `series`: daily registered and Pro client counts
- `pagination`
- `meta`

## Failure behavior

- Invalid ranges or filters return 400 with one plain-language error.
- Missing optional tables return a supported unavailable-data object with a reason.
- Authentication failure remains 403.
- Unexpected database or service failures return 500 and do not substitute stale or invented values.
