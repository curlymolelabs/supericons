# Search v2 latency Gate A partial execution

Date: 2026-07-13
Status: stopped on response-parity rule; isolated endpoint deleted
Approved manifest SHA-256: `fcdfaeef7f19af49536438ca1518655813fcffd103866d352cdb792c6821bb25`

## Authorized scope reached

- The guarded runner applied migration `20260713150000` and recorded the matching history entry.
- Control commit `ba7f7ea18` reached isolated function version 1.
- Treatment commit `cacd283cb` reached isolated function version 2.
- Two of the four allowed deployments were used.
- Search control and treatment measurements ran.
- Recommendation control and treatment measurements did not run.
- The isolated function was deleted after the live parity check failed.

No production function, npm tag, Netlify site, or external model provider was changed.

## Search measurements

Each variant used one separate first request and 25 warm samples. The warm set contained five repetitions of the five fixed manifest queries.

| measurement | control | treatment |
| --- | ---: | ---: |
| First request | 11,821.639 ms | 5,614.826 ms |
| Warm p50 | 4,459.115 ms | 1,054.036 ms |
| Warm p95 | 13,400.583 ms | 1,785.161 ms |
| Warm maximum | 16,202.313 ms | 1,844.918 ms |
| Successful warm requests | 25 of 25 | 25 of 25 |
| Error rate | 0 percent | 0 percent |

Treatment reduced warm p95 by 86.68 percent and passed the 2,000 ms warm search limit. The first treatment request remained above the limit and was reported separately.

Local measurement artifacts:

- `.tmp/search-v2-latency-results/control-search.json`, SHA-256 `e0f23224c1b6127a6a7224738edae8d2fb9c3a7dcb3e8d148093f61aa9bc2a96`
- `.tmp/search-v2-latency-results/treatment-search.json`, SHA-256 `0bf447613d0bafbc5ef44b4c539276b37aaaa342541126cdfa9b0e17db982578`

These artifacts contain durations, counts, response hashes, result icon IDs, and SVG-result counts. They do not store SVG bodies, credentials, login links, verification codes, session hashes, or IP hashes.

## Live response comparison

Four fixed inputs had stable, identical response hashes across control and treatment. The `combobox` preferred-library input did not.

For `combobox`, the first six result IDs remained stable. Positions seven and eight varied among Lucide, Tabler, Heroicons, and Ionicons chevron candidates. The order also varied between repeated requests inside each variant. This shows a pre-existing unstable tie rather than evidence that the SVG treatment changed the intended ranking, but the approval required a stop on any live response-parity failure.

Two other live observations require later quality review but did not differ between variants:

- `cog` with Bootstrap strict mode returned zero results through the hosted path.
- Simplified Chinese `settings` returned zero results when sent directly to the hosted function. The MCP client normally performs localized retry expansion outside this function.

## Stop and rollback

The run stopped before recommendation measurement. The isolated function was deleted immediately.

Post-rollback checks:

| item | verified state |
| --- | --- |
| `search-icons` | Active, version 34, HTTP 200, three results |
| `mcp-search` | Active, version 35, HTTP 200, three results |
| `mcp-search-v2-beta` | Absent from the hosted function list |
| npm `latest` | `0.4.17` |
| npm beta tag | Absent |

The single post-rollback checks were also slow: 5,100.981 ms for `search-icons` and 11,572.402 ms for `mcp-search`. These two requests are observations, not a representative latency sample.

## Root cause of the parity stop

The shared hosted reranker sorted by final score and display name. It did not use `icon_id` when both values tied. Several libraries have candidates with the same display name and score, so the incoming database row order determined their final order.

The next local correction adds `icon_id` as the last stable tie-break and protects it with an input-order regression test. Any new hosted measurement requires a new fingerprint-bound approval.
