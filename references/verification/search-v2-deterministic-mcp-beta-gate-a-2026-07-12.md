# Search v2 deterministic MCP beta Gate A verification

Date: 2026-07-12
Environment: local workspace
Status: release candidate prepared; migration smoke blocked; no deployment or publication performed

## Scope

Prepared the isolated deterministic MCP beta release candidate:

- separate `mcp-search-v2-beta` Supabase function
- additive beta measurement fields and final-outcome RPC
- clarification-safe admin aggregation and locale counts
- `@supericons/mcp` prerelease version `0.4.18-beta.0`
- automatic prerelease routing to the isolated endpoint
- package and rollback checks
- local deterministic latency baseline

## Endpoint contract

- Caller: explicit `@supericons/mcp@0.4.18-beta.0` installation or an approved hosted beta client
- Method and path: `POST /functions/v1/mcp-search-v2-beta`
- Authentication: public search gateway with Supabase JWT verification disabled; existing rate limiting and optional Supericons API-key handling remain in the shared handler
- Request: existing search request plus library mode, locale, and public-safe usage context
- Response: existing deterministic search response
- Writes: hosted request row in `search_request_audit`; final local MCP search or recommendation outcome in `mcp_usage_events`
- Failure behavior: search errors retain the existing public error response; outcome telemetry failures are contained and do not fail the user request

## Schema and rollback

The migration adds nullable `library_mode`, `search_outcome`, `confidence_label`, and `beta_cohort` fields to `search_request_audit` and `mcp_usage_events`. It adds validated label constraints, partial beta-cohort indexes, and the additive `si_log_mcp_search_outcome` RPC.

The migration contains the rollback order before the first schema statement. The beta route and RPC writes stop first. The RPC and indexes can then be removed. Nullable columns remain until no prerelease writes them. There is no backfill or destructive column change.

## Checks passed

| check | result |
| --- | --- |
| `npm run verify:search-v2-beta-gate-a` | Passed. Verified route isolation, package routing, audit contract, clarification handling, stubbed telemetry success, and contained telemetry failure. |
| Deno check for beta endpoint, shared handler, and admin API | Passed. |
| Node syntax checks for changed JavaScript and verification scripts | Passed. |
| `node scripts/verify-admin-query-workbench.mjs` | Passed. |
| `npm run verify:search-v2-deterministic-mcp-default` | Passed with zero external model-provider calls. |
| `npm run verify:search-ranking-policy` | Passed. |
| `npm run verify:search-library-modes` | Passed for 15 cases. |
| `npm run verify:recommend-icons-clarification` | Passed. |
| `npm run verify:semantic-search-v2` | Passed with 225 cases and 225 stable IDs. |
| `npm run verify:search-query-frame-shadow` | Passed. |
| MCP public-safety scan | Passed across 38 packed files. |
| MCP package allowlist check | Passed with 38 files and 2,396,680 unpacked bytes after the production build refreshed generated package artifacts. |
| `npm pack --dry-run --json --ignore-scripts` | Passed for `@supericons/mcp@0.4.18-beta.0`; no publication occurred. |
| Root production build | Passed on the current workspace tree. |

## Local latency baseline

`npm run measure:search-v2-beta-latency` measured the deterministic in-process candidate search after one warmup pass:

- fixed cases: 225
- measured repetitions: 3
- samples: 675
- p50: 30.071 ms
- p95: 163.644 ms
- maximum: 511.177 ms
- Node: v24.12.0

This does not include hosted network or database time. It is the Gate A code baseline, not a production latency claim. Gate C must record live beta latency separately against the 2,000 ms rollback ceiling.

## Measurement protections

- Clarification is counted separately from zero results.
- Final `mcp_usage_events` outcomes are the beta attempt denominator.
- Hosted search rows generated inside one recommendation remain diagnostic evidence and do not create additional beta attempts.
- Locale attempt counts are exported with the query pack.
- Stable production versions continue to route to `mcp-search`; only the approved prerelease pattern routes to `mcp-search-v2-beta`.

## Checks blocked or failed

### Local migration smoke blocked

The Supabase CLI is installed, but Docker Desktop was stopped. Starting its Windows service required elevated permission that was not available. No migration was applied locally or remotely. Static schema checks passed, but they are not a substitute for a real PostgreSQL migration run.

Gate B is blocked until the migration runs in a disposable local or approved test database and the RPC success and validation paths pass.

### Adjacent hosted-search test failure

`npm run verify:hosted-search-engine` failed on a pre-existing synonym expectation. The current builder returned `self hosted`, `server cluster`, and `server stack`, while the fixture expected only the first two. This Gate A batch did not change that builder or fixture. Focused ranking, query-frame, and 225-case gates passed. The stale test remains separate work and is not hidden by this record.

### Command corrections

- The shared backend-check helper could not launch `npm` on Windows. The build and backend checks were run directly.
- No `verify:admin-query-workbench` npm shortcut exists. Its checked-in script was run directly and passed.

## External state

- No Supabase migration or function deployment
- No npm publication, tag change, or tarball release
- No Netlify deployment
- No model-provider call or credential use
- No user invitation or public beta announcement

## Result

Gate A implementation and all runnable scoped checks are complete. Gate A is not fully closed because the database migration smoke is unrun. Gate B approval must wait for that check and must include the beta-adoption choice.
