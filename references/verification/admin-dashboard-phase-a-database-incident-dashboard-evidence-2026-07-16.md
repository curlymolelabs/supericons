# Admin dashboard Phase A database incident dashboard evidence

## Observation window

- Date: 2026-07-16
- Local time: approximately 20:35 to 20:46 Asia/Singapore
- Source: read-only inspection of the signed-in Supabase dashboard for project `kcjmkakdhsqplvasgkjv`
- Production mutation performed during this inspection: none
- Synthetic function or search request sent during this inspection: none

## Verified dashboard observations

### Project and database

- Project health status: `Unhealthy`
- Database compute: `nano` (`t4g.nano`), Mumbai region
- Database memory usage: 411.32 MB
- Database memory commitment: 1.61 GB
- Database connections observed on the project overview: 19 of 60
- CPU observed on the project overview: 22%
- Disk observed on the project overview: 7%
- RAM observed on the project overview: 42%
- The detailed database CPU, network, IOPS, throughput, connection, and disk charts displayed `Unable to load data` during the incident window.
- The project overview showed approximately 3,693 requests in the preceding 60 minutes, a 48.9% success rate, 811 API Gateway errors, and 1,054 Postgres errors.

### `mcp-search`

- The 15-minute overview showed 76 invocations and a 100% 5xx rate.
- The error summary showed 50 status 546 responses at approximately 150,084 ms.
- Average execution time was 128,625 ms and maximum execution time was 150,189 ms.
- Average CPU time was 40 ms and maximum CPU time was 58 ms.
- The live invocation list contained status 500, 504, and 546 responses.
- The function log stream showed repeated boot and shutdown events during the same period.

### `admin-api`

- The overview recorded a GET response with status 500 after 96,456 ms.
- The function log contained PostgreSQL error code `57014` with the message `canceling statement due to statement timeout`.
- The same log group also contained a Deno event-loop shutdown error after the database timeout. This appears after the database error and is not treated as the initiating failure.

## Evidence-based assessment

1. The immediate production failure is a database statement-timeout incident. This is directly confirmed by PostgreSQL error code `57014` in the `admin-api` log.
2. The incident affects both the preserved legacy `admin-api` code and the unchanged production `mcp-search` path. The observations do not support attributing the incident to the Phase A candidate code.
3. `mcp-search` spent roughly 128 to 150 seconds per failed invocation while using only tens of milliseconds of CPU. This is consistent with the function waiting on a downstream dependency, and the `admin-api` database error identifies PostgreSQL as that dependency for at least one affected request.
4. The deeper database cause remains unresolved. These observations do not distinguish among lock waits, a poor query plan, stale statistics, pooler congestion, memory pressure, or a platform incident.

## Current safety boundary

- No additional `/stats` request should be sent while the database is degraded because that path performs a large historical read.
- No function redeploy, database restart, migration, storage change, Railway change, or npm publication was performed as part of this inspection.
- The next recovery action requires an explicit owner decision because both a database restart and a byte-identical `mcp-search` redeploy cross the existing mutation boundary.
