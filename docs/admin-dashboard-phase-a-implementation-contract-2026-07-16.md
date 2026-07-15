# Admin dashboard Phase A implementation contract

- Date: 2026-07-16
- Baseline: `31ac66dfecc40e4549f08fc3d9dea99d583a3393`
- Scope: additive database schema, admin API metrics, and hosted MCP telemetry only
- Excluded: `mcp-search`, Search v2, npm publication, Phase B UI, and production execution

This contract turns the approved Phase A specification into implementation rules that can be tested before any release packet is prepared.

## Rollback plan, written before implementation

1. Stop the new Railway telemetry writer before removing any column it writes.
2. Roll the hosted MCP service back to the pre-Phase A Railway revision if telemetry validation fails.
3. Roll the admin API back to its pinned pre-Phase A function revision if metric validation or latency gates fail.
4. Leave additive columns, indexes, and private rollup tables in place during a code rollback. They are inert when the old code does not use them.
5. Drop the two rollup tables only through a separately approved down migration after the admin API has been rolled back.
6. Drop `query_origin` and `requested_limit` only after every released writer that may use them has been retired.
7. Never restore `anon` or `authenticated` access to either private rollup table.

## Source authority and duplicate handling

- `mcp_usage_events` is authoritative for hosted MCP user-facing attempts and outcomes.
- `search_request_audit` is authoritative for web searches and engine diagnostics.
- Rows with the same non-null `dedupe_key` count once.
- When a hosted MCP usage row and audit row share a key, the usage row supplies `query_origin`, `requested_limit`, tool outcome, client identity, and user-facing result count. Non-conflicting diagnostic fields from the audit row may be retained.
- Input order must not change the merged result.

## Metric rules

- Default headline origin: `agent_query`.
- True zero: direct query with `result_count = 0`, excluding a matched known defect, clarification, or error.
- Exact low result for `search_icons`: `0 < result_count < min(requested_limit, 3)`.
- A result count equal to `requested_limit` is capped success, never low.
- `recommend_icons` is excluded from the low-result rate. It is partial when successful slots are fewer than requested slots.
- Rows without `requested_limit` use the historical low-result rule and are reported separately as approximate.
- Estimated client identity uses the first available value in this order: `user_id`, `api_key_hash`, `anonymous_client_hash`, `session_hash`, `ip_hash`.
- Returning clients are calculated only inside one UTC calendar month because anonymous client hashes rotate monthly.

## Origin rules

- `search_icons` and top-level `recommend_icons` requests are `agent_query` in the hosted MCP ledger.
- `get_icon` is `icon_lookup`.
- Recommendation variant rows in `search_request_audit` are `recommend_variant`.
- Unclassifiable historical rows are `legacy_unknown` and remain visible as a separate filter value.
- No `mcp-search` deployment is permitted for Phase A origin work.

## Known-defect boundary

The first registry entry covers only Material zero-result outcomes before the successful Railway release completed. Its inclusive upper bound is `2026-07-15T18:06:17.8324190Z`, taken from the retained completion artifact for deployment `5ea2e0b8-201a-4be9-81b7-a450d7f85c61`.

## Rollup rules

- `admin_rollup_overview` groups completed UTC days by channel, environment, and query origin.
- `admin_rollup_queries` groups completed UTC days by query, normalized library key, query origin, channel, environment, and tool name.
- The null or empty library key is stored as `all` so conflict keys are stable.
- Current UTC day data always comes from raw rows.
- Bounded client totals come from raw rows. Longer windows expose summed client-days and do not claim cross-month unique clients.

## Country lookup and licensing decision

The Railway fallback will use the maintained MaxMind database reader `maxmind` version `5.0.6` with the exact data-only package `@ip-location-db/geolite2-country-mmdb` version `2.3.2026061719`, after trusted country headers and only for a valid public client IP. It is country-only. The pinned data package adds about 18.1 MB unpacked to the server installation.

The approved specification proposed quarterly updates. That cadence is not used because the current GeoLite2 terms require old database versions to stop being used and be destroyed within 30 days after an update. The implementation therefore requires a dependency and notice review at least every 30 days. The exact reader and data package versions stay pinned in each release for repeatable builds. A deprecated country lookup package was rejected after its direct dependency path triggered a security advisory.

Private, reserved, documentation, loopback, link-local, multicast, and unparseable IP values return no country. A successful local lookup records `geo_source = railway_geoip`. Only the two-letter country code is stored.

## Required local gates

- Migration privilege and schema contract tests.
- Metric classification, duplicate order independence, identity precedence, defect boundary, rollup key, and current-day split tests.
- Admin API type check and fixture contract tests.
- Hosted MCP attribution, requested-limit, public-IP, GeoIP, and two-session dedupe tests.
- Clean-install or production-equivalent hosted server smoke test.
- Release packet verifiers that reject unpinned surfaces or unauthorized mutation commands.
