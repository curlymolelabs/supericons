# Search v2 beta hot-path diagnosis

Date: 2026-07-16

Scope: compare the last measured-fast hosted implementation at `8ba345fa9` with the failed beta build at `415f401b7`, preserve the known live evidence, and identify which latency claims remain unproven.

## Verified live evidence

The preserved bounded SQL output records 38 beta audit rows, one error, and an audit-row p95 of 5,303.9 ms. The six error-or-over-2,000-ms rows are all marked `first_request`, have worker request order 1, and entered the handler 5 or 6 ms after module evaluation. The client Gate C artifact reports a search p95 of 7,151.057 ms and a localized p95 of 2,286.601 ms.

This proves repeated new-worker latency during the failed run. It does not prove that a reused worker regressed from the July 14 measurements. The slow stage remains unknown because the safe stage-timing payload was not preserved before the isolated endpoint was deleted.

Evidence source:

- `tmp/search-v2-audit-bridge/evidence/gate-c-audit-sql-output-2026-07-16.txt` in the main workspace
- `references/verification/search-v2-search-only-beta-gate-c-execution-2026-07-16.md`

## Hosted-path comparison

### Tool-latency logging

`si_log_mcp_search_outcome_v2` is called by the local MCP package after a search result or error is available. Every call site uses `void logMcpSearchAttempt(...)`, so the MCP response does not wait for that RPC. The direct Gate C endpoint requests do not run this package telemetry call. It cannot explain the measured direct endpoint latency.

The edge handler does synchronously wait for its ordinary `search_request_audit` insert before returning. That wait already existed at `8ba345fa9`, so it is a standing cost rather than a newly added beta stage. The later beta build adds worker fields to the same audit payload.

### Material serving

The beta build adds one serial `material_icon_assets` eligibility query whenever the candidate set contains at least one Material row. This can run for a non-Material query in `all` mode or `prefer` mode because those modes ask the candidate function for all libraries. It does not run for a strict non-Material search when the candidate function is restricted to that library.

If a Material row survives into the final results, the beta build also fetches the selected Material SVG rows. That fetch runs in parallel with public semantic data and any catalog SVG fetch, but the response waits for the slowest branch. These Material paths are credible added latency for mixed-library searches, but the missing stage logs prevent attributing the live failure to them.

### Ranking policy

The reintegration adds an in-memory expressive-fallback penalty and changes the speed-family retrieval phrase from `fast` to `fast arrow`. It does not add a hosted database call or a broader family fan-out. This is not a credible explanation for a multi-second increase by itself.

### Localized requests

The hosted client sends the localized query first. If it returns no results, the client sends the reviewed English expansion as a later hosted request. The fixed Gate C contract deliberately measures two hosted attempts per localized sample. This makes localized tool latency the sum of two hosted requests, but it does not explain why individual requests landed on new workers.

## Platform log recovery

The current Supabase CLI credential can no longer read the project. A read-only Management API request for `function_logs` in the failed window returned HTTP 401, and `supabase projects list` also returned unauthorized. No platform log was recovered. Owner dashboard access is required to check whether the short-retention logs still exist.

## Conclusion

The direct beta failure is confirmed, but a reused-worker regression is not. The comparison rules out MCP tool-latency telemetry and the ranking-policy change as primary causes. Material's conditional database work remains a credible added cost for mixed-library cases, while repeated new workers remain the only worker state proven by the live SQL evidence. Do not redeploy the unchanged beta. The next beta candidate must remove or bypass avoidable hosted round trips, project a pass with margin locally, preserve safe stage evidence before rollback, and require a fresh audited manifest.

## Verification commands

```powershell
git diff -U12 8ba345fa9 415f401b7 -- supabase/functions/_shared/search-engine/handle-search-request.ts
git grep -n "logMcpSearchAttempt\|si_log_mcp_search_outcome_v2" 415f401b7 -- mcp supabase/functions
git diff -U20 8ba345fa9 415f401b7 -- lib/search-ranking-policy.js data/search-intent-graph/ranking-policy.json
node scripts/verify-search-v2-gate-c-evidence.mjs
```
