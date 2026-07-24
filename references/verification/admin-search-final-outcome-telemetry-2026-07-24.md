# Admin search final-outcome telemetry verification

Date: 2026-07-24

## Release decision

Production cutover completed and passed.

The additive storage, trusted writers, Web and MCP linkage, independent cutovers, final dashboard source, local password prompt, screen totals, and download integrity were verified against production. The tested rollback remains available.

## Scope

This change separates final outcomes by entry point:

- Web: the browser records the result set that a person actually saw.
- Hosted MCP: the hosted server records the final response returned to an agent.
- Local MCP: the local package records the final response returned to an agent.
- Shared search attempts remain diagnostics. They do not count as final product outcomes.

The Search v2 ranking, recovery behavior, daily allowance accounting, and protected public files are outside this change.

## Acceptance results

| Area | Result | Proof |
| --- | --- | --- |
| Database additions | Passed | Disposable PostgreSQL 17 migration test covered additive install, repeat install, privacy, access denial, rate limiting, duplicate rejection, stable Local MCP capture, and rollback. |
| Web settlement | Passed | Six local and hosted result combinations, superseded input, late completion, incomplete work, strict-library metadata, repeated searches, and non-blocking telemetry failure passed. |
| Hosted MCP linkage | Passed | Final episode, recovery chain, ordered attempts, recommendation variants, and Web-linked hosted diagnostics passed. |
| Local MCP capture | Passed | Stable `search_icons` calls are no longer suppressed. Repeated calls remain distinct. Legacy identity is labeled best effort. |
| Dashboard source | Passed | Overview, searches, audience, table, downloads, and integrity checks use final rows when the final source is enabled. Diagnostics do not become headline rows. |
| Dashboard browser flow | Passed | The full browser suite passed with the Searches label, 31-column request log, and visible cutover warning. |
| Daily allowance | Passed | Direct success, honest zero, localized retry, recommendation fanout, Web-hosted search, and controlled hosted search retained exact call and allowance parity. |
| Search behavior | Passed | The 225-case Search v2 parity fingerprint remained `3ec9fae16fbd1c6900d1bdf4ed4f48270d7e4baec0e6d26783aa54821f6f7d24`. The hosted route product suite passed 39 real candidate cases. |
| Build and public files | Passed | The production build and protected-public-artifact check passed. The built site contains no admin dashboard files or protected search mappings. |
| Secret and access boundary | Passed | Public database roles cannot read or write the private telemetry tables. Origin, environment, traffic class, identity hashing, controlled-test signatures, and diagnostic counts are decided by trusted server code. |

## Real browser evidence

The local production build was exercised through a real browser and the network boundary was captured.

- Chinese search `搜索图标`: the page displayed 1,981 icons. The final Web payload reported local 1,981, hosted 2, final 1,981, hosted success, final success, locale `zh-Hans`, and completion by Enter.
- Genuine miss `definitelymissingbrandzz`: the page displayed no icons. The final Web payload reported local zero, hosted zero, final zero, and final zero.
- Forced telemetry HTTP 503: search still displayed two icons. Telemetry failure did not block search.
- An earlier debounced episode was marked superseded. The Enter episode became the one final countable outcome.

Screenshots:

- [Chinese Web success](admin-search-final-outcome-telemetry-2026-07-24/web-final-chinese-success.png)
- [Genuine Web zero](admin-search-final-outcome-telemetry-2026-07-24/web-final-genuine-zero.png)
- [Admin data integrity view](admin-search-final-outcome-telemetry-2026-07-24/admin-search-data-integrity.png)

## Allowance parity

| Case | Search calls | Audit rows | Allowance cost |
| --- | ---: | ---: | ---: |
| Direct success | 1 | 1 | 1 |
| Honest zero | 1 | 1 | 1 |
| Localized retry | 2 | 2 | 2 |
| Recommendation fanout of four | 4 | 4 | 4 |
| Web-hosted search | 1 | 1 | 1 |
| Controlled hosted search | 1 | 1 | 1 |

The grouped search and rate-limit implementations remained byte-for-byte unchanged. Final-outcome storage is outside allowance accounting.

## Rollback readiness

- Dashboard: set `dashboard_source` back to `legacy`.
- Web ingestion: set `web_ingestion_enabled` to false.
- Local MCP: restore the prior stable-event suppression with its focused rollback migration.
- Database: the tested rollback removes only the new private telemetry objects.
- Edge, website, and hosted MCP code can be restored to the last successful deployment.

## Known pre-existing findings

Two checks fail in the unchanged main branch and in this candidate:

- `verify:hosted-search-engine` has an existing `avoid_when` ranking assertion failure. The authoritative 225-case fingerprint and hosted product suite pass, and this change does not modify ranking.
- `npm audit --omit=dev --audit-level=high` reports four existing dependency findings: one low, two moderate, and one high. This telemetry repair does not add or change those dependencies.

These findings are recorded as existing risk. They are not evidence of a regression in this change and are not expanded into this release.

## Production cutover gate

The final source was enabled after all of these production cases reconciled with the visible or returned result:

1. Chinese Web search with hosted recovery.
2. Genuine Web miss.
3. Stable Local MCP search.
4. Hosted MCP search with retries.
5. Controlled test rows remain excluded from normal dashboard totals.
6. Dashboard totals equal the final rows selected by the same filters.

## Production verification

### Deployed versions

- Website deploy `6a625b770560ef7a286fb015`, published 2026-07-23 18:25:36.653 UTC.
- Hosted MCP deploy `631a8513-535e-40dc-a98d-86665e643df6`, status `SUCCESS`.
- Supabase `web-search-telemetry` version 2.
- Supabase `mcp-search` version 43.
- Supabase `search-icons` version 40.
- Supabase `admin-api` version 96.

### Cutovers

- Website final-outcome coverage begins 2026-07-23 18:25:36.653 UTC.
- Local MCP coverage begins 2026-07-23 18:37:26.593 UTC.
- Dashboard source is `final`.
- Website ingestion is enabled.

### Controlled production cases

| Case | Product result | Stored result |
| --- | --- | --- |
| Website Chinese recovery | 1,987 icons displayed | One Web success, 1,981 local matches, 100 hosted matches, two linked attempts, locale `zh-Hans` |
| Website genuine miss | Empty result view | One Web zero after completed hosted zero |
| Hosted MCP success | Three Lucide results returned | One Hosted MCP success with one linked attempt |
| Hosted MCP recommendation | Three slots resolved | One Hosted MCP success |
| Stable Local MCP 0.4.22 | Two repeated calls returned three results each | Two distinct Local MCP successes, both labelled `legacy_best_effort` |

The Chinese Website case retained the actual internal recovery:

1. `搜索图标` returned zero from hosted search.
2. The English retry `search` returned 50 hosted candidates.
3. The browser merged local and hosted work and recorded the 1,987 icons actually displayed.

### Dashboard and downloads

At the retained 24-hour browser snapshot:

- The Searches screen displayed 6 rows and 6 searches.
- Search summary contained 6 rows whose `searches` values summed to 6.
- Request log contained 6 top-level MCP calls.
- Audit bundle contained the same 6 summary rows, 6 MCP request rows, and 4 linked hosted diagnostics.
- Audit integrity status was `passed`.
- Audit metadata stated source `final` and included both cutover timestamps.
- Controlled test traffic was absent from the normal view and appeared only when explicitly included.
- Unauthenticated admin access returned HTTP 403.
- The current local admin secret returned HTTP 200 and opened the browser dashboard.

Downloaded filenames identified their purpose:

- `supericons-search-summary-24h-<UTC timestamp>.csv`
- `supericons-request-log-24h-<UTC timestamp>.csv`
- `supericons-audit-bundle-24h-<UTC timestamp>.json`
