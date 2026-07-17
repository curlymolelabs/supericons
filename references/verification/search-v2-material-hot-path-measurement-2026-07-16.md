# Search v2 Material hot-path measurement

Date: 2026-07-16

## Question

Could the Material serving additions explain why requests on new workers increased from about 1.6 seconds on July 14 to 5.3 to 7.2 seconds on July 16?

## Result

The Material SQL itself is very small. Its p95 execution time stayed between 0.089 and 0.137 milliseconds in disposable PostgreSQL. The function dependency graph grew by one local module and 8,824 local bytes, a 0.75 percent increase in the total graph size.

Neither measurement is large enough to explain the multi-second increase by itself. The extra remote database round trip remains a credible contributor because this local SQL test excludes connection setup, TLS, PostgREST, network travel, and fresh-worker connection costs.

## Material query measurement

Method:

- PostgreSQL 17 in a disposable local container
- 8,524 Material asset rows with the same primary key shape used by the serving table
- the five fixed Gate C cases imported from `scripts/search-v2-gate-c-workload.mjs`
- candidate IDs generated through the current local search implementation
- 500 repetitions for each executed branch
- SVG reads forced with `sum(octet_length(svg))`, so PostgreSQL could not skip the payload column
- no hosted network or PostgREST cost included

| Case | Material candidates | Eligibility p95 | Final SVG p95 | SVG bytes |
| --- | ---: | ---: | ---: | ---: |
| settings, all libraries | 40 | 0.089 ms | 0.115 ms | 7,342 |
| hello, all libraries | 40 | 0.103 ms | 0.137 ms | 7,403 |
| cog, Bootstrap strict | 0 | not executed | not executed | 0 |
| combobox, Bootstrap preferred | 39 | 0.110 ms | 0.102 ms | 4,486 |
| localized settings, English expansion | 40 | 0.092 ms | 0.117 ms | 7,342 |

The strict Bootstrap case proves the no-Material branch: neither Material query runs when the candidate set has no Material rows.

Reproduction command:

```powershell
node scripts/measure-search-v2-material-query-cost.mjs
```

## Function dependency graph comparison

Method:

- temporary clean worktrees at each pinned commit
- `deno info --json supabase/functions/mcp-search-v2-beta/index.ts`
- local and remote module counts and source sizes summed separately
- temporary worktrees removed after measurement

| Measurement | July 14 build `8ba345fa9` | Material beta build `415f401b7` | Change |
| --- | ---: | ---: | ---: |
| Total modules | 94 | 95 | +1 |
| Local modules | 18 | 19 | +1 |
| Remote modules | 76 | 76 | 0 |
| Total graph bytes | 1,176,162 | 1,184,986 | +8,824 (+0.75%) |
| Local bytes | 229,100 | 237,924 | +8,824 |
| Remote bytes | 947,062 | 947,062 | 0 |

The dependency graph change is too small to support the claim that bundle growth caused the multi-second regression.

## Decision

Do not deploy another hosted correction from these local numbers alone. The next evidence path is:

1. Reconcile the local results with the saved live stage logs if the owner can export them before retention expires.
2. Continue the evaluation-only local-first search study against quality, multilingual behavior, package size, startup memory, update cadence, cross-library ranking, brand and ambiguity rules, recommendation quality, and telemetry behavior.
3. Keep production and npm unchanged until the combined evidence is reviewed.

## Limits

This measurement does not reproduce Supabase network travel, PostgREST processing, connection setup, connection-pool state, or free-tier resource contention. It isolates database execution and dependency graph size only.
