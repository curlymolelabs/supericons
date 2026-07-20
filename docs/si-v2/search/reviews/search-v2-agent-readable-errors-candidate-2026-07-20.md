# Search v2 agent-readable errors and 20-slot recommendation candidate

Date: 2026-07-20
State: implemented and locally verified, not deployed or published
Specification: `D-031`, `FR-46`

## Outcome

This candidate changes the MCP recommendation and preview contract in four ways:

1. `recommend_icons` accepts 1 to 20 UI slots on both local stdio MCP and hosted HTTP MCP.
2. A request with more than 20 slots, missing task text, or missing slots returns a stable code, a plain-language reason, and a useful next step instead of a bare parameter error.
3. Resolved recommendation searches use one grouped hosted request. Fan-out is capped at 40 logical queries, including localized 20-slot calls, within the hosted route limit of 96.
4. `preview_icons` safely clamps inline output to 12 icons. The response warns about the clamp and keeps up to 24 accepted refs in the browser preview.

Hosted recommendation failures now preserve safe recovery details. Timeouts explain that the request took too long. Rate-limit responses preserve the tier details and full retry delay. Invalid grouped responses fail as structured recommendation errors instead of appearing as false no-results.

## Changed serving paths

- `mcp/search-tool-shell.js`: shared normalization, error presentation, slot limit, preview clamp, and server instructions.
- `mcp/index.js`: local stdio schemas, 20-slot handler, grouped client wiring, and preview response behavior.
- `mcp/remote-server.js`: hosted schemas, 20-slot handler, grouped client wiring, output schema alignment, structured errors, and preview response behavior.
- `mcp/hosted-search-client.js`: grouped subrequest failure propagation.
- `mcp/recommend-icons.js`: grouped failure propagation and 40-query fan-out bound.
- `supabase/functions/mcp-search/index.ts`: backward-compatible single or grouped request handling.
- `mcp/preview-icons.js`: rendered and browser preview counts plus a specific next step when the browser preview contains more refs.

## Verification results

| check | verified result |
| --- | --- |
| MCP shell | `npm --prefix mcp run verify:search-v2-shell` passed. Local and hosted transports accepted 20 slots. A 21-slot request returned `recommendation_slot_limit_exceeded`. Missing task text returned `recommendation_task_required`. |
| Real grouped local call | `scripts/verify-mcp-agent-friendly-errors.mjs` sent 20 resolved slots through the local MCP server and observed one hosted request containing 40 logical queries. All 20 slots returned a recommendation. |
| Hosted structured failure | The same verifier sent a hosted recommendation through a controlled 429 response and preserved code `daily_allowance_exceeded`, retry delay 43,200 seconds, and a plain-language next step. |
| Grouped recommendation core | `scripts/verify-recommend-icons-grouped-search.mjs` passed result parity, clarification short-circuiting, failure propagation, and English and localized 20-slot fan-out of 40 queries. |
| Grouped client | `scripts/verify-hosted-search-grouped-client.mjs` passed single-request ordering and 429 detail propagation. |
| Stable Edge route | `deno check supabase/functions/mcp-search/index.ts` and `scripts/verify-search-v2-grouped-http-request.ts` passed single-request compatibility, per-query rate cost, response order, bounded concurrency, and synchronous audit rows. |
| Preview behavior | `scripts/verify-search-v2-one-call-contract.mjs` sent 15 refs with limit 13. The call succeeded, rendered no more than 12, reported the clamp, and kept all 15 refs in `preview_url`. |
| Search regression | `scripts/verify-search-v2-phase1-parity.mjs` passed all 225 cases with unchanged fingerprint `3e529b41a8eb1d175f20c9da51788fea7e101a0eb51795e305ccdb5641729777`. |
| Clean install | `scripts/verify-search-v2-tool-scoped-package.mjs` passed 65 packed files, clean install, 150 eligible stdio cases, and unchanged route fingerprint `357d161cf6059b9371ea38591f267f623e43e37cfd680cb5a097af50861c1659`. |
| Package contents | `npm --prefix mcp run verify:package` passed with 65 files and 25,498,899 unpacked bytes. |
| Package safety | `npm --prefix mcp run verify:public-safety` scanned all 65 packed files and passed. |

The repository-root safety scanner is not the MCP package release check. When run from the root, it reported an existing root-only script reference to a local environment file. The scoped MCP package scan above passed, and this candidate does not change that root script.

## Release boundaries

- Package metadata remains `0.4.19-beta.2`. This source must receive a new prerelease version before publication.
- No Supabase function was deployed.
- No npm package was staged or published.
- Live hosted recommendation latency was not measured. The candidate removes repeated client HTTP round trips, but it does not claim a production latency pass.
- The public `beta` tag continues to require an MCP process restart before a running client loads a newly published version.

## Required release checks

Before deployment or publication:

1. Verify the exact diff and rerun every command in the verification table.
2. Deploy the stable `mcp-search` grouped wrapper with a bounded rollback plan.
3. Prove existing single-query response compatibility on the deployed function.
4. Measure end-to-end `recommend_icons` latency for 1, 10, and 20 resolved slots, including a 20-slot localized case.
5. Prepare a newly versioned tarball, run the MCP shell and clean-install checks on its exact bytes, then perform the normal staged publication checks.
6. After publication, restart OpenCode and verify that its running MCP process reports the new package version.
