# Admin Search History and Download Contract

## Purpose

The internal Search history screen should make normal analysis easy while keeping deeper evidence available when needed.

The screen has one event history table, one outcome filter, one test-traffic switch, and one compact download control. It does not show raw diagnostics in the main table.

## Source roles

### Final product outcomes

Rows from `search_final_outcomes` represent completed top-level Web, Hosted MCP, and Local MCP outcomes after their verified cutovers.

### Hosted MCP history

Trusted `mcp_usage_events` search outcomes remain the source for Hosted MCP history that predates the final-outcome ledger. The admin API includes only source events that do not already have a matching `search_final_outcomes.source_event_id`.

This compatibility read is deduplicated by the source event ID. It does not use query text or elapsed time as identity.

### Web and Local MCP history

Web and Local MCP final outcomes begin at their independently verified cutovers. Earlier rows remain investigation evidence and are not presented as comparable final product outcomes.

### Search diagnostics

Rows from `search_request_audit` and `search_episode_diagnostics` are supporting diagnostics. They can add attempt-level detail, but they must not be counted as additional user activity when a final outcome already represents the product action.

## Default Search history scope

By default, the table:

- includes top-level MCP activity and top-level web search activity
- excludes controlled tests, preview traffic, and local development traffic
- keeps every recorded search or exact icon lookup in its own row
- does not combine identical search text
- shows the estimated client ID, outcome, country, channel, exact recorded result count, and time for that event
- uses server pagination so the browser does not need the full history in memory

Search history can be sorted by search term, estimated client ID, outcome, country, channel, result count, or time. Searchers can be sorted by searcher ID, plan, country, first seen, last seen, searches, or top query.

The API accepts only those named fields through `sort_by`. `sort_direction` is either `asc` or `desc`. The API sorts the complete filtered list before selecting the requested page, and rows without a recorded value stay last. Requests without sorting keep the existing default order. Invalid sorting requests return a 400 response.

The Include test traffic switch changes only the Search history request. It does not silently change the other dashboard sections.

The table subtitle is:

`One row per recorded search. No grouping.`

The Search summary download keeps the grouped grain described below. This separation lets the table show what actually happened while the download remains useful for query-level analysis.

## Outcome rules

- Success: all requests completed with a usable result.
- Zero: all search requests completed with zero results.
- Low: search requests completed with low results. This includes approximate low results from older or local clients.
- Not found: all exact icon lookups reported no match.
- Error: all requests ended in an error.
- Clarification: all requests asked the caller for clarification.
- Mixed: the summary contains more than one result category. The label states the category counts.

Errors, failed lookups, and clarification responses must not be labelled Success.

Every request must belong to exactly one displayed outcome component. For each summary row, the component counts must equal the request count.

## Result count rules

`typical_result_count` is the median of the recorded result counts in the summary row. Median is used because repeated client retries can change the requested limit and create extreme high or low values.

The file also identifies the result unit:

- `icon` for direct search results
- `match` for exact icon lookups
- `primary_pick` for recommendations

If one summary row contains more than one result unit, `typical_result_count` is empty. The Audit bundle keeps the supporting detail and explains why the value is unavailable. Counts with different meanings must not be combined.

## Identity rule

`distinct_searcher_ids` is an estimated count of privacy-safe client identifiers, not a count of people. One user may produce several IDs, and one ID may represent shared infrastructure. Treat it as an upper bound, not a verified unique-user count.

## Download choices

### Search summary

UI subtitle:

`One row per unique query. For quick analysis.`

Grain: one row per normalized query, library filter, and query origin.

Filename pattern: `supericons-search-summary-{period}-{generated-at-utc}.csv`.

Columns:

- `query`
- `library_filter`
- `query_origin`
- `tool`
- `searches`
- `lookups`
- `distinct_searcher_ids`
- `outcome`
- `success_count`
- `zero_count`
- `low_count`
- `not_found_count`
- `error_count`
- `typical_result_count`
- `result_unit`
- `country_codes`
- `channel`
- `first_seen_utc`
- `last_seen_utc`

This is the recommended download for normal analysis. It omits repeated file metadata, raw request IDs, per-searcher rows, and internal diagnostic fields.

`low_count` includes exact low results and approximate low results. The Audit bundle keeps the approximate subtype for deeper review.

### Request log

UI subtitle:

`One row per tool call. Ground truth.`

Grain: one recorded top-level MCP tool call per row.

Filename pattern: `supericons-request-log-{period}-{generated-at-utc}.csv`.

Columns:

- `event_id`
- `episode_id`
- `recovery_chain_id`
- `recorded_at_utc`
- `query`
- `query_origin`
- `tool_name`
- `outcome`
- `status`
- `error_code`
- `library_filter`
- `library_mode`
- `locale`
- `requested_limit`
- `result_count`
- `returned_icon_refs`
- `returned_icon_refs_recorded`
- `latency_ms`
- `search_execution`
- `diagnostic_attempt_count`
- `server_version`
- `server_build`
- `traffic_class`
- `channel`
- `environment`
- `client_family`
- `estimated_client_id`
- `country_code`
- `registered`
- `pro`
- `identity_quality`

Search diagnostics are excluded. Web search activity is not mixed into this file because its telemetry grain differs.

`returned_icon_refs_recorded` is false when a positive result count has no usable icon references. An empty recorded list remains valid for a zero-result request.

The legacy root request identifier is omitted from this CSV because current records do not prove that it is a unique request or session identifier.

### Audit bundle

UI subtitle:

`Everything plus integrity checks. For verification.`

Filename pattern: `supericons-audit-bundle-{period}-{generated-at-utc}.json`.

The file keeps these data sets separate:

- `search_summary`
- `request_log`
- `web_searches`
- `diagnostics`
- `source_reconciliation`
- field coverage
- CSV schemas
- data definitions
- source metadata

This separation prevents diagnostic rows from inflating user activity while preserving supporting detail for investigation.

The bundle includes export schema version `4.0`, selected period and filters, plain-language content descriptions, summary counts, and these integrity checks:

- every summary row has at least one request
- summary request totals match groupable primary events
- summary grain keys are unique
- request event IDs are unique
- request event IDs are recorded
- request roles are valid
- diagnostic roles are valid
- source rows reconcile to exported product outcomes or explained diagnostics
- outcome component counts equal summary request counts
- Success labels agree with successful request counts
- no represented request remains unclassified
- positive result rows that claim references were recorded contain at least one reference
- searcher-detail availability agrees with the included detail

The bundle reports structural, meaning, and source reconciliation checks separately. Its overall status passes only when all three pass.

Direct calls to the hosted search gateway can be valid diagnostics without a top-level product outcome. They remain outside Search summary and request totals. A diagnostic is accepted only when it is linked by an exact recorded identifier, is still within the short write grace period, or is clearly identified as a direct gateway request. Old rows that cannot be explained make source reconciliation fail.

A positive result with `returned_icon_refs_recorded = false` is a coverage warning, not a false integrity claim. The field coverage section shows how many rows lack references. A positive result with `returned_icon_refs_recorded = true` and an empty list fails the meaning checks.

Strong signs of query-text replacement are reported as a review warning. They do not fail the bundle because a user may type question marks intentionally.

The Audit bundle may retain legacy correlation fields for investigation, but its definitions must clearly state that the current root request identifier is not a proven session identifier.

## Safe scale behavior

The API remains bounded so one very large request cannot exhaust database, function, or browser memory.

The table uses stable server pagination. Downloads request every page from one fixed snapshot. If a requested period exceeds the safe raw-detail limit, the dashboard must explain that the operator should narrow the period or filters. The long-term scale path is dated rollups for long periods, not an unlimited raw export.

## Data correction recorded on 2026-07-23

An inspected one-day grouped CSV contained 492 rows. Of those, 127 rows had zero recorded activity but were labelled Success.

The cause was the raw 24-hour path treating hosted diagnostic rows as Search history activity. Diagnostics can carry a query but do not represent another user search. The corrected source handling:

- classifies source rows as search, exact lookup, diagnostic, or other
- includes only search and exact lookup roles before grouping
- rejects any summary with zero activity
- calculates pagination and summary totals from the same accepted rows
- reports the number of excluded non-activity rows
- keeps diagnostics in the Audit bundle

The numbers above describe the inspected file only. Future dashboard values are calculated from the selected live period and are not hardcoded.
