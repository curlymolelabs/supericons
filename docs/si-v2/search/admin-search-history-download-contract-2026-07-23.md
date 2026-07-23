# Admin Search History and Download Contract

## Purpose

The internal Search history screen answers two questions:

1. What search activity happened?
2. What data should be downloaded for normal analysis or a deeper audit?

The screen stays minimal. It has one grouped table, one outcome filter, one test-traffic switch, and one download control.

## Source roles

### Top-level MCP activity

Rows from `mcp_usage_events` represent completed top-level MCP tool calls. They are the main source for hosted and local MCP activity.

### Web search activity

Rows from `search_request_audit` with the web channel represent top-level web search attempts.

### Hosted search diagnostics

Rows from `search_request_audit` for hosted or local MCP traffic are supporting diagnostics. They can add request-level detail, but they must not be counted as additional user activity when a top-level MCP row already represents the request.

## Default Search history scope

By default, the table:

- includes top-level MCP activity and top-level web search activity
- excludes controlled tests, preview traffic, and local development traffic
- groups exact matches by query, searcher identity, library, query origin, and channel
- shows the grouped row count and underlying activity count separately
- uses server pagination so the browser does not need the full history in memory

The Include test traffic switch changes only the Search history request. It does not silently change the other dashboard sections.

## Outcome rules

- Success: all grouped activities completed with a usable result.
- Zero: all grouped search attempts completed with zero results.
- Low: grouped search attempts completed with low results.
- Error: all grouped activities ended in an error.
- Clarification: all grouped activities asked the caller for clarification.
- Mixed: the group contains more than one result category. The label states the category counts.

Errors and clarification responses must not be labeled Success.

## Download choices

### Grouped CSV

This is the recommended download for normal analysis.

Grain: one row per searcher, query, venue, library, job category, and query origin.

Filename pattern: `supericons-search-history-grouped-{period}-{generated-at-utc}.csv`.

It includes:

- searcher identifier and identity kind
- account-linked state
- activity count, activity unit, and a readable activity label
- outcome label plus success, zero, low, error, clarification, and defect components
- exact lookup found, not found, error, and unknown components
- country value, recorded state, exact-for-group state, count, scope, and explanation
- venue value, exact-for-group state, and explanation
- result count range
- result availability, unit, range, sample count, scope, and explanation
- library, job category, query origin, channel, and tool names
- first and last seen time
- review fields
- row-grain and export metadata

It does not export raw internal request IDs.

### MCP Requests CSV

Use this when one row per recorded top-level MCP request is required.

Grain: one top-level MCP search or exact icon lookup per row.

Filename pattern: `supericons-search-mcp-requests-{period}-{generated-at-utc}.csv`.

Hosted search diagnostics are excluded. Web search activity is not mixed into this file because its telemetry grain differs.

### Full Audit JSON

Use this for a complete quality or telemetry audit.

Filename pattern: `supericons-search-full-audit-{period}-{generated-at-utc}.json`.

The file keeps these groups separate:

- `grouped_history`
- `top_level_mcp_requests`
- `web_searches`
- `hosted_diagnostics`
- field coverage
- data definitions
- source metadata

This separation prevents diagnostic rows from inflating user activity while preserving the additional detail for investigation.

The JSON also includes:

- export schema version and export type
- selected period and filters
- a plain-language description for each data set
- summary counts
- integrity checks for grouped activity, event identifiers, and source roles

## Safe scale behavior

The API remains bounded so one very large request cannot exhaust database, function, or browser memory.

The table uses stable server pagination. Downloads request every page from one fixed snapshot. If a requested period exceeds the safe raw-detail limit, the dashboard must explain that the operator should narrow the period or filters. The long-term scale path is dated rollups for long periods, not an unlimited raw export.

## Data correction recorded on 2026-07-23

The supplied one-day grouped CSV contained 492 rows. Of those, 127 rows had zero recorded activity but were labelled Success. A sample was the query `biểu tượng tìm kiếm`.

The cause was the raw 24-hour path treating hosted diagnostic rows as Search history activity. Diagnostics can carry a query but do not represent another user search. The corrected contract now:

- classifies source rows as search, exact lookup, diagnostic, or other
- includes only search and exact lookup roles before grouping
- rejects any compacted group with zero activity
- calculates pagination and summary totals from the same accepted grouped rows
- reports the number of excluded non-activity rows
- includes reconciliation checks in Full Audit JSON

The numbers above describe the inspected file only. Future dashboard values are calculated from the selected live period and are not hardcoded.
