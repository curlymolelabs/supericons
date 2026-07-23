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

### Table CSV

This is the recommended download for normal analysis.

Grain: one row per grouped Search history row.

It includes the visible business fields plus useful analysis fields such as:

- searcher identifier and identity kind
- account-linked state
- first and last seen time
- result count range
- zero, low, error, and clarification counts
- library, origin, channel, and venue

It does not export raw internal request IDs.

### Event CSV

Use this when one row per recorded top-level MCP request is required.

Grain: one top-level MCP request per row.

Hosted search diagnostics are excluded. Web search activity is not mixed into this file because its telemetry grain differs.

### Audit JSON

Use this for a complete quality or telemetry audit.

The file keeps these groups separate:

- grouped table rows
- top-level MCP events
- top-level web search events
- supporting diagnostics
- field coverage
- data definitions
- source metadata

This separation prevents diagnostic rows from inflating user activity while preserving the additional detail for investigation.

## Safe scale behavior

The API remains bounded so one very large request cannot exhaust database, function, or browser memory.

The table uses stable server pagination. Downloads request every page from one fixed snapshot. If a requested period exceeds the safe raw-detail limit, the dashboard must explain that the operator should narrow the period or filters. The long-term scale path is dated rollups for long periods, not an unlimited raw export.

## Verified one-day evidence

The supplied one-day event export contained 401 records:

- 345 `mcp_usage_events` records
- 56 `search_request_audit` records
- 46 controlled-test records

After excluding controlled tests and treating hosted audit rows as diagnostics, the default scope contained:

- 299 top-level MCP activities
- 56 supporting hosted diagnostics
- 283 grouped Search history rows

These numbers describe the supplied 2026-07-22 export only. The dashboard values are calculated from the selected live period and are not hardcoded.
