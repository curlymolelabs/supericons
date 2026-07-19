# Admin Dashboard V2 Fix Round 2 Completion

Status: Ready for the round 3 owner walkthrough.

## Released source

- Git revision: `3d4b60f55179c63164274c6e5a01840df1089d22`
- Release fingerprint: `8a6a7b2b8b68938e4dacbca25e0626667658de99f9fdaca6bbd7f53336975c67`
- Supabase project: `kcjmkakdhsqplvasgkjv`
- Function: `admin-api`
- Function version: `74`
- Function status: `ACTIVE`
- JWT verification: disabled, unchanged
- Downloaded production source matches the released Git revision.
- `mcp-search` remains unchanged at version `39`.

## Correctness results

- Fresh production telemetry recorded three searches with result count `3` and two exact icon lookups with result count `1`.
- All fresh rows carried the expected search or lookup origin.
- The dashboard returned the fresh searches across the 1-day, 7-day, 30-day, and all-history views without false Zero labels.
- The dashboard returned both exact icon lookups as successful rows with result count `1`.
- True Zero Rate uses zero attempts divided by total attempts.
- Query Explorer keeps search and exact lookup origins separate when their query text and library match.
- Overview Top Searched totals remain combined across origins.
- Rollup parity passed for 27 completed days, 50 top query rows, and semantic samples across the 7-day, 30-day, and all-history views.

## Performance results

- 24-hour queue cold p95: `606.8 ms`, limit `1,500 ms`
- 24-hour queue warm p95: `551.4 ms`, limit `1,500 ms`
- All-history queue cold p95: `803.7 ms`, limit `1,300 ms`
- All-history queue warm p95: `761.2 ms`, limit `1,000 ms`
- Rollup backlog was complete and required no day refresh.

## Browser walkthrough

- 14 live API requests completed.
- 50 Latest Activity rows rendered.
- 27 completed series days rendered.
- All four inline SVG charts rendered.
- Warm dashboard render: `126 ms`
- No horizontal overflow.
- No browser credential prompt.
- Screenshot SHA-256: `cc09967c311136e7f77594a3f988caf3d1609f4ece284ba0e598e0056a0b4657`

## Railway and telemetry health

- Hosted MCP version `0.4.18` is healthy.
- Search protection is closed with zero failures, zero active requests, and zero queued requests at the health check.
- A fresh post-restart trace again recorded three searches and two exact icon lookups.
- Temporary telemetry debug logging was removed before the final restart.

## Truthful unavailable states

- Returned-icon totals remain unavailable outside the fully covered Hosted MCP view.
- MRR remains unavailable until a confirmed price source is linked.
- Contact submissions currently contain no rows.

These states are labeled as unavailable rather than displayed as zero or filled with placeholder data.

## Change scope

- No database migration was run.
- No storage change was made.
- No npm package was published.
- No public website was deployed.
- No Git remote was pushed.
