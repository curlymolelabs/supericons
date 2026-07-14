# Search v2 round-trip latency execution

Date: 2026-07-14
Manifest: `d0ebaabd2ccb439755ad5bd53d44faa1ba0c8ab08acd96ed52e92d6bf07937c8`
Implementation commit: `8ba345fa9`
Decision: publication blocked

## External actions completed

- Applied migration `20260714120000` through the approved hash-pinned runner.
- Passed hosted SQL preflight and postflight parity checks.
- Repaired only migration-history version `20260714120000`.
- Deployed `mcp-search-v2-control` once at version 1.
- Deployed `mcp-search-v2-treatment` once at version 1.
- Ran the fixed interleaved measurement.
- Deleted both isolated endpoints after the run.

No production function was deployed. No npm package or tag changed. No model provider was called.

## Artifact

The complete local measurement artifact is:

`.tmp/search-v2-roundtrip-latency-results/measurement-20260714.json`

SHA-256:

`c95dc9f2719218909a6c92cae8c18a02df07361a5feef88350eb4c360e29dee2`

The artifact was written at `2026-07-14T03:46:54Z`. The wrapper command reached its ten-minute shell limit after the artifact was complete, so the process was stopped after evidence had been written. All required measurement sections are present and parse as valid JSON.

## Safety and parity

- All five control and treatment parity cases passed.
- Recommendation public-result parity passed.
- Direct search, localized search, and recommendation each recorded zero request errors.
- The artifact reports `safety_stop: false`.

## Results

| surface | control first | treatment first | control warm p95 | treatment warm p95 | treatment change | limit | verdict |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Direct search | 916.872 ms | 962.804 ms | 2,162.117 ms | 1,647.287 ms | 23.81 percent faster | 2,000 ms | Pass |
| Localized search | 1,590.371 ms | 1,459.073 ms | 1,512.686 ms | 1,549.441 ms | 2.43 percent slower | 2,000 ms | Pass |
| Recommendation | 12,155.676 ms | 6,303.357 ms | 22,966.010 ms | 16,868.760 ms | 26.55 percent faster | 3,000 ms | Fail |

Recommendation treatment p50 improved from 12,941.588 ms to 6,525.023 ms, a 49.58 percent reduction. This is still too slow to publish. Treatment recommendation p95 is 5.62 times the limit.

The direct-search treatment had one 7,398.961 ms warm outlier, but its 25-sample p95 remained below the formal limit.

## Recommendation workload discrepancy

Every measured control recommendation recorded eight search callback calls and eight HTTP requests. Because these counts match, there is no evidence of an HTTP retry in this phase.

The manifest expected four recommendation searches. The runner passes `locale: 'en'`, and the recommendation code currently allows up to eight query variants whenever `locale` is any non-empty value. English therefore took the eight-variant branch. This is a workload-contract mismatch in the approved runner and implementation, not a hidden retry.

Every treatment recommendation grouped the same eight query variants into one hosted callback and one HTTP request. Grouping therefore removed seven of eight observed HTTP requests while preserving the public recommendation result.

The grouped handler still runs each recommendation query through a separate complete search pipeline inside the function. Candidate retrieval, private metadata, public semantic data, final SVG hydration, and audit work remain per search. The live result proves that removing network fan-out alone is insufficient.

The recommendation numbers are useful evidence for the eight-variant path, but they do not verify the intended four-variant workload. This mismatch independently blocks publication and must be corrected before another live comparison.

## Stage evidence limitation

The read-only Supabase Management API returned HTTP 403 for both the legacy and current log-query endpoints using the CLI credential. No unsafe workaround was attempted, and no raw log output was committed. Client-side latency, parity, request counts, and error evidence are complete, but stage-level timing and worker-reuse conclusions remain unavailable for this run.

Before another live run, the measurement client should record the generated query count plus every retry status, and the owner should provide a permitted stage-log export path through the Supabase dashboard or an analytics-enabled token.

## Closeout

Read-only checks after endpoint deletion confirmed:

| item | final state |
| --- | --- |
| `mcp-search-v2-control` | Absent |
| `mcp-search-v2-treatment` | Absent |
| Production `search-icons` | Active, version 34 |
| Production `mcp-search` | Active, version 35 |
| npm `latest` | `0.4.17` |

## Decision and next engineering target

Publication remains blocked because recommendation misses its 3,000 ms p95 limit and the recommendation workload used eight query variants instead of the intended four.

The next local slice should first make the English recommendation variant limit explicit and fixture-backed. It should then build a recommendation-specific deterministic pipeline that combines all query variants before database retrieval, performs shared metadata and SVG hydration once, and writes one logical recommendation audit record. It should also record the generated query count and the status and delay for every retry. Another live measurement requires a new fingerprint-bound approval.
