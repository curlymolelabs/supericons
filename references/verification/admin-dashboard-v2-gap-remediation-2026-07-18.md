# Admin dashboard v2 gap remediation

- Date: 2026-07-18
- Status: complete
- Branch: `codex/admin-dashboard-v2-gap-repair`
- Implementation revision: `8cd1dab9b5e63c6dca11929c2fabecdf565f4235`
- Production project: `kcjmkakdhsqplvasgkjv`

## Result

The dashboard now uses truthful screen states, complete filtered exports, independent panel loading, stable venue choices, correct aggregate query semantics, complete account totals, Local MCP attribution, and bounded operator review actions. The managed local server keeps the admin secret outside browser code and browser storage.

The supported data limitations remain explicit:

- MRR stays unavailable until a verified billing price source exists.
- A list that cannot be complete within its safe source limit says why it is unavailable instead of showing partial values as complete.
- Account activity stays separate from account existence, so all accounts remain visible even when no matching telemetry exists.

## Gap closure

| Gap | Closure proof |
| --- | --- |
| Error values shown as zero | Forced HTTP 500 checks render named panel errors and a failed freshness state. |
| Wrong-window stale data | A failed period change no longer labels data from the previous period as current. |
| Long-window truncation | Paged rollup reads return complete groups or a named limitation. |
| Test traffic leakage | Preview and `internal_test` fixtures obey the test-traffic toggle across endpoints. |
| Local npm MCP shown as Hosted MCP | Source, RPC, migration, triggers, and live activity now use `local_mcp` with production environment. |
| Split dashboard and telemetry work | Both change sets are present on one integration branch. |
| Clients confused with client-days | Raw ranges say clients. Completed rollups say client-days. |
| Low-result rate without coverage | The rate shows its eligible coverage, and zero eligibility is unavailable rather than 0 percent. |
| Registered-user activity discarded | Auth accounts join to telemetry by stable identity while every account stays visible. |
| Passive work queues | Gap triage and icon-request review actions use authenticated, bounded writes. |
| Current-page-only exports | Paged exports fetch the complete filtered set within safe limits. |
| Spreadsheet formula execution | Browser and API CSV writers neutralize formula-leading cells. |
| Sequential loading | Panels load independently, targeted actions refresh only their own data, and slow Activity does not block Overview. |
| Row limit mismatch | List controls and APIs agree on 25, 50, and 100 rows with full pagination. |
| Missing visual controls | Chart mode switches, readable labels, sparklines, worklist links, compact panel controls, and diagnostics are present. |
| Browser-stored secret or account data | Managed mode keeps the secret in the loopback gateway and stores only a sanitized aggregate Overview cache. |
| Accessibility and stale checks | Named controls, dialog focus handling, keyboard-reachable scroll regions, selected period state, current browser checks, and cold database readiness checks pass. |

## Production data proof

The following production facts were checked after deployment:

- `admin-api` is active at version 75.
- The deployed source SHA-256 is `94e99179046320f79ebbecbf887c3abd5fe3dd35391c533dcd9f7da0952db3e6`.
- Migration `20260718100000` is recorded locally and remotely.
- Migration `20260718160000` is recorded locally and remotely.
- The attribution correction changed only its exact eligible rows. Before correction, 14 usage rows, 122 audit rows, and 4,019 icon-evidence labels matched the correction predicate. The post-check found zero eligible rows left with the wrong attribution.
- Two attribution-normalization triggers are present.
- The icon-request review table has row-level security enabled. Anonymous and authenticated roles cannot read it directly. The service role can manage it.
- The account directory returns 24 registered accounts, including 2 active Pro accounts.
- The 24-hour Local MCP view contains 84 events. The newest checked event is a production `search_icons` call with five results, outcome `results`, and venue `local_mcp`.
- One newly completed daily rollup was refreshed during the final health check. The following check confirmed a zero-day backlog.

## Browser proof

The managed live walkthrough passed with:

- 3 navigation sections
- 4 inline SVG charts
- 25 real Latest Activity rows
- 26 completed series days
- 18 live API requests
- no horizontal overflow
- no credential prompt
- no secret, email-bearing account payload, or account directory payload in browser storage
- 58 ms warm cached content render, below the 500 ms requirement
- screenshot SHA-256 `5290810a1506bed98e3284da054d6e60583f7fa9152f018e79e45b6956d67a4d`

The fully loaded screenshot includes complete KPI notes, Local MCP as its own chart venue, real top-list data, geography, and real Activity rows.

## Performance proof

The first retained Phase A live gate saw two transient all-time cold outliers and failed its p95 limit. The unchanged 20-sample rerun passed every shipped limit:

| Queue | Measured p95 | Limit |
| --- | ---: | ---: |
| 24-hour cold | 1,040.9 ms | 1,500 ms |
| 24-hour warm | 1,050.1 ms | 1,500 ms |
| All-time cold | 908.9 ms | 1,300 ms |
| All-time warm | 925.1 ms | 1,000 ms |

Fresh v2 panel requests measured from about 0.4 to 3.9 seconds, depending on the endpoint. Panels load independently and show their own progress. The sanitized aggregate cache supplies visible warm content in 58 ms while live data refreshes.

## Verification

The final source passed:

- Phase A metric, API, cache, and disposable migration checks
- Phase B source, browser, and legacy browser-entry checks
- v2 helper, API, error-state, and operator-contract checks
- local MCP attribution and Search v2 local-first checks
- icon-request review migration checks, including direct-role denial
- TypeScript and JavaScript syntax checks
- the full production build
- a dependency audit with zero known vulnerabilities
- a scan for credentials, tokens, credentialed database URLs, local user paths, and forbidden dash characters in changed public files

## Release boundaries

- `admin-api` was the only deployed function.
- `mcp-search` was not deployed.
- No npm package was published.
- No storage service was changed.
- No Git remote was pushed.
