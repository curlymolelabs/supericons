# Search v2 latency rerun execution

Date: 2026-07-14
Status: stopped on the approved cold-request rule; isolated endpoint deleted
Approved manifest SHA-256: `5be12fca18ad902af3569366691a17bbfaafb6114cec4dc413945c8d18c586c6`

## Outcome

Repeated live response parity passed. The lightweight candidate treatment also passed the direct warm-search limit, with a warm p95 of 1,645.140 ms and zero errors.

The run stopped because the first treatment request exceeded 2,000 ms on two consecutive treatment deployments. The measured first requests were 3,179.451 ms during treatment parity and 6,625.318 ms during treatment search. The approved rule requires this surface to fail even when its warm p95 passes.

The isolated function was deleted immediately. Localized treatment and recommendation measurements did not run. No public beta or package publication is allowed from this result.

## Authorized scope used

Four of the six allowed isolated deployments were used:

1. Control parity.
2. Treatment parity.
3. Control search and localized control measurement.
4. Treatment search measurement.

The two recommendation deployments were not used. No hosted SQL, migration-history repair, production function deployment, npm action, Netlify action, scheduled warm ping, or model-provider call occurred.

## Repeated live parity

Five fixed cases ran three times per variant. Every case was stable inside each variant and equal across variants on HTTP status, exact response hash, icon order, and SVG availability.

| case | results | SVG results | verdict |
| --- | ---: | ---: | --- |
| settings, all libraries | 5 | 5 | Exact match |
| hello, all libraries | 8 | 8 | Exact match |
| cog, Bootstrap strict | 7 | 7 | Exact match; minimum-result rule passed |
| combobox, Bootstrap preferred | 8 | 8 | Exact match |
| expanded Simplified Chinese settings | 5 | 5 | Exact match; minimum-result rule passed |

Parity artifacts:

- `.tmp/search-v2-latency-rerun/control-parity.json`, SHA-256 `cc9af10bca743689d311086fa9c807b139f68221c8a9f5e497e0e1bb793aefb5`
- `.tmp/search-v2-latency-rerun/treatment-parity.json`, SHA-256 `1cdccd040600643e4450b96a4fb91ee83c554221e52f895a83da758bad08dc93`

## Direct search measurement

Each variant used one separately reported first request and 25 fixed warm requests.

| measurement | control | treatment |
| --- | ---: | ---: |
| First request | 2,580.200 ms | 6,625.318 ms |
| Warm p50 | 1,349.558 ms | 997.889 ms |
| Warm p95 | 6,558.290 ms | 1,645.140 ms |
| Warm maximum | 10,889.583 ms | 2,118.340 ms |
| Successful warm requests | 25 of 25 | 25 of 25 |
| Error rate | 0 percent | 0 percent |

The treatment reduced direct warm p95 by 74.92 percent and passed the 2,000 ms warm limit. The cold-request rule still failed.

Direct-search artifacts:

- `.tmp/search-v2-latency-rerun/control-search.json`, SHA-256 `ce589dc700e35c98f2564cf6467bce0cece86b169675679d4964fd418e526a64`
- `.tmp/search-v2-latency-rerun/treatment-search.json`, SHA-256 `c1922f45f2ae6268be18887335f75637609de159b4ea17cf90de18f27c8a10da`

## Localized search measurement

The control path completed one separately reported first search and five warm searches. Every localized search used two hosted requests, as expected.

| measurement | control |
| --- | ---: |
| First request | 4,761.281 ms |
| Warm p50 | 1,865.230 ms |
| Warm p95 | 2,811.984 ms |
| Warm maximum | 2,811.984 ms |
| Successful warm searches | 5 of 5 |
| Hosted requests | 10 total, 2 per search |
| Error rate | 0 percent |

The treatment localized path was not run after the cold-request stop. No control-versus-treatment localized verdict is available.

Localized artifact:

- `.tmp/search-v2-latency-rerun/control-localized.json`, SHA-256 `39f0668253b53f82a9ee687f3ac71a8c13d0c81d4a6075a5939666c194f9070c`

## Safe stage evidence

A read-only Supabase Management API query selected only `search_stage_timing` messages from `function_logs` for `2026-07-13T16:15:00Z` through `2026-07-13T16:30:00Z`. The query returned 94 safe records:

- 53 control records: 15 parity requests, 26 direct-search requests, and 12 hosted requests from the localized path.
- 41 treatment records: 15 parity requests and 26 direct-search requests.

The exported fields were limited to time, variant, worker state, outcome, durations, counts, and approximate sizes. No credentials, request text, icon IDs, SVG content, session hashes, IP hashes, or unrelated logs were selected.

| stage evidence | control | treatment |
| --- | ---: | ---: |
| Candidate SVG characters, average | 31,233.4 | 0 |
| Candidate SVG characters, maximum | 76,337 | 0 |
| Candidate payload characters, average | 40,059.2 | 9,734.0 |
| Candidate payload characters, maximum | 102,862 | 25,405 |
| Total stage p50 | 1,195.830 ms | 933.262 ms |
| Total stage p95 | 6,429.128 ms | 2,664.691 ms |
| Candidate-search stage p95 | 4,054.433 ms | 1,458.506 ms |
| Rate-limit stage p95 | 556.748 ms | 363.284 ms |
| Private-metadata stage p95 | 1,211.993 ms | 418.537 ms |
| Public-semantic stage p95 | 524.029 ms | 318.976 ms |
| Final-SVG stage p95 | Not present | 300.659 ms |
| Audit-write stage p95 | 502.849 ms | 204.608 ms |

The treatment removed all SVG characters from candidate transport and reduced average candidate payload size by 75.70 percent. Candidate search remained the largest p95 treatment stage. The stage aggregate mixes parity, direct, and localized requests, so it explains the bottleneck but does not replace the per-surface latency results.

The runtime marked 52 of 53 control records and 38 of 41 treatment records as `first_request`. Worker reuse was uncommon during this window, which makes first-request cost a real release concern rather than a rare edge case.

## Stop and closeout

The isolated `mcp-search-v2-beta` function was deleted after the stop rule triggered.

Read-only closeout checks verified:

| item | state after rollback |
| --- | --- |
| `search-icons` | Active, version 35, HTTP 200 |
| `mcp-search` | Active, version 36, HTTP 200 |

Correction recorded 2026-07-14: the original table reported both production function versions one version low. The retained 2026-07-05 paired deployment transcript and the functions' shared production update timestamp establish `search-icons` version 35 and `mcp-search` version 36.
| `mcp-search-v2-beta` | Absent |
| npm `latest` | `0.4.17` |
| npm beta tag | Absent |

## Decision

The lightweight candidate design is a meaningful improvement and preserves the complete live response. It is not ready to publish because the approved cold-request rule failed, localized treatment was not measured, and recommendation was not measured.

The next local engineering slice should reduce work that repeats on newly started workers. The first target is the candidate and metadata database path, because treatment candidate search still had the largest stage p95 at 1,458.506 ms and the later database-backed stages remain additive. A new live run requires a new fingerprint-bound approval.
