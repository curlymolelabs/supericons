# Search v2 beta.3 recommendation reliability audit request

Date: 2026-07-20
State: source candidate and guarded endpoint packet implemented and locally verified, not deployed, versioned, staged, or published
Source commit: `ff5698272072409caeefaf29998a80cf753fbe11`
Source tree: `7cdd231acf5fa434d00996452409725f33b8f3f4`
Specification: `D-031`, `FR-46`, `FR-47`

## Outcome

The earlier candidate at `35744b8a8` received a no-go because it changed the stable hosted route, skipped existing local fallback behavior, accepted malformed grouped results as empty results, lacked endpoint rollback compatibility, and could bypass safe allowance accounting. Source commit `ff5698272` supersedes that release design and the incomplete repair at `e48858314`.

The repaired candidate:

1. Accepts 1 to 20 recommendation slots on local and hosted MCP.
2. Returns plain-language codes, reasons, and next steps for correctable inputs and service failures.
3. Keeps HTTP 429 limit responses visible, including the full retry delay.
4. Uses a new additive `mcp-search-grouped` endpoint for grouped recommendation searches.
5. Retries distinct searches through the stable individual endpoint once if grouped mode is missing, unavailable, or invalid.
6. Sends grouped empty results through the same local fallback used by individual searches.
7. Deduplicates identical generated searches before the grouped request.
8. Rejects malformed JSON, a `null` request body, and malformed successful subresponses.
9. Disables grouped execution when tier enforcement is active, then lets the client use the existing individual route. This avoids group-specific allowance bypass until D-030 account identity and race-safe accounting exist.
10. Keeps the 12-icon inline preview safety limit while preserving up to 24 accepted refs in the browser preview.
11. Converts invalid JSON from a successful grouped HTTP response into a classified dependency failure, then retries through the stable individual route.
12. Uses separate grouped and stable circuit breakers so concurrent grouped failures cannot block the compatibility fallback.
13. Keeps hosted HTTP 429 responses visible even when local fallback is enabled.
14. Honors a custom individual search URL without silently sending grouped requests to the default production endpoint.

## Serving-path boundary

The stable `supabase/functions/mcp-search/index.ts` source has Git blob `71e568f3014a3e07f7271801b4503080b7111ec7`, equal to main.

Grouped behavior is isolated in:

- `supabase/functions/mcp-search-grouped/index.ts`
- `supabase/functions/_shared/search-engine/grouped-search-request.ts`
- `mcp/hosted-search-client.js`

Beta.3 must not deploy the stable `mcp-search` function.

## Verification results

The following commands passed against source commit `ff5698272`:

| area | command and result |
| --- | --- |
| MCP contract | `npm --prefix mcp run verify:search-v2-shell` passed. |
| Grouped HTTP input and allowance safety | `npm run verify:search-v2-grouped-http-request` passed. |
| Grouped client validation and rollback | `npm run verify:hosted-search-grouped-client` passed. |
| Recommendation parity and deduplication | `npm run verify:recommend-icons-grouped-search` passed. |
| Daily allowance contract | `npm run verify:search-v2-daily-allowance` passed. |
| Shared recommendation pipeline | `npm run verify:search-v2-shared-recommendation-pipeline` passed. |
| Search regression | `npm run verify:search-v2-phase1-parity` passed 225 cases with fingerprint `3e529b41a8eb1d175f20c9da51788fea7e101a0eb51795e305ccdb5641729777`. |
| Multilingual MCP | `npm run verify:mcp-multilingual-support` passed. |
| Material package contracts | `verify:material-mcp-contract`, `verify:material-mcp-clean-install`, and `verify:material-mcp-package` passed. |
| Hosted resilience | `npm run verify:hosted-search-resilience` passed. |
| Tool-scoped source | `npm run verify:search-v2-tool-scoped-beta` passed. |
| Exact clean-install package | `npm run verify:search-v2-tool-scoped-package` passed 150 eligible stdio cases. |
| Package safety and contents | `npm --prefix mcp run verify:public-safety` and `npm --prefix mcp run verify:package` passed with 65 packed files. |
| Protected public artifacts | `npm run verify:search-v2-protected-public-artifacts` passed VC-3 and VC-4. |
| Usage deduplication | `npm run verify:mcp-usage-dedupe` passed. |
| Public 20-slot copy | `npm run verify:recommend-icons-doc-limits` passed all 12 locales and all maintained and generated catalogs. |
| Documentation generation | `verify:i18n-catalogs`, `verify:localized-docs-bodies`, and `verify:docs-site-render` passed. |
| Production web build | `npm run build` passed after the locked root dependencies were installed. |
| Syntax and type checks | Node syntax checks for changed MCP files and Deno checks for both Supabase entrypoints passed. |

The permanent regression checks also reproduce the four later audit findings:

- successful HTTP 200 responses with invalid JSON fall back through the stable route;
- concurrent grouped HTTP 503 responses do not open the stable route's circuit breaker;
- a hosted HTTP 429 remains visible when local fallback is enabled;
- a custom individual route is used directly when no matching grouped route is configured.

The controlled 20-slot fixture generated two distinct searches for 20 repeated settings slots. Both local and hosted MCP fixtures also proved local fallback after grouped empty results.

## Known inherited guard failure

`npm run verify:material-production-search-surface` reports actual aggregate `f52be4b6aa28cde419a3fae52c4cf3b360dae16229d041f3638e87ef0e359780` instead of recorded aggregate `050db70ca82676339aa0e186d23e50d50c1578a0f6e77f71262764e400b60733`.

The same failure reproduces on main `4a96175c6`. It is inherited cumulative stable-function drift, not a beta.3 repair change. Do not update the historical record or deploy the stable function as part of this release.

## Independent verification requests

1. Confirm the stable `mcp-search/index.ts` blob is byte-identical to main.
2. Trace every grouped endpoint fallback condition to the stable individual request call.
3. Confirm malformed grouped status 200 responses cannot become false empty results.
4. Reproduce grouped empty-result local fallback on both MCP transports.
5. Reproduce malformed JSON, `null`, malformed subresponse, and tier-enforcement behavior.
6. Confirm HTTP 429 never falls back or hides its retry details.
7. Confirm repeated 20-slot requests are deduplicated without changing slot ordering or results.
8. Confirm all 12 source, web, and MCP documentation catalogs state the 20-slot limit.
9. Rerun the clean-install, package safety, 225-case regression, and exact MCP integration checks.
10. Confirm the known Material guard failure is identical on main and does not authorize a stable-route deployment.
11. Reproduce the four permanent regression cases listed above and trace each assertion to its production call site.
12. Verify the release packet pins source commit `ff5698272`, contains exactly one grouped deployment command, contains one conditional grouped deletion command, and contains no stable-route deployment or npm publication command.

## Guarded grouped endpoint packet

The packet manifest is:

`docs/si-v2/search/reviews/search-v2-beta3-grouped-release-manifest-2026-07-20.json`

Its normalized SHA-256 is:

`e63ac32333be9ce32a765b722b014560b3978a963a5f77309c514a2d93d62f2a`

The packet verifier passed locally:

```powershell
node scripts/verify-search-v2-beta3-grouped-packet.mjs --manifest-hash e63ac32333be9ce32a765b722b014560b3978a963a5f77309c514a2d93d62f2a
```

The release runner:

- expands the exact source commit through `git archive`;
- refuses to run if `mcp-search-grouped` already exists;
- pins the existing `mcp-search` id, version, update time, keyless setting, and active state;
- deploys only `mcp-search-grouped`;
- checks direct grouped HTTP, MCP grouped routing, and stable fallback when the grouped route is absent;
- runs the accepted FR-47 warm limits for 1, 10, and 20 slots, plus a Japanese 20-slot case;
- deletes only `mcp-search-grouped` if deployment or either live gate fails;
- never deploys or deletes `mcp-search`, and never publishes npm.

## Remaining release gates

1. Receive independent source and packet verification.
2. Run the packet in preflight mode and confirm it performs no mutation.
3. Deploy only `mcp-search-grouped` with delete-on-failure rollback.
4. Verify live grouped success and stable individual fallback.
5. Run the exact candidate's `FR-47` warm workload: p95 at most 3 seconds for 1 slot, 10 seconds for 10 slots, and 15 seconds for 20 slots, with zero timeouts. Include one supported non-English 20-slot case.
6. Assign the beta.3 version only after the hosted gates pass.
7. Build and verify the exact beta.3 tarball before staging or publication.

No release-go claim is made by this record.
