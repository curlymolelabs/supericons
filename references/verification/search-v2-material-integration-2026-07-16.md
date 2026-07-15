# Search v2 and Material integration verification

Date: 2026-07-16

Status: Local integration verified. Ready for independent review. No deployment, database change, or npm publication was performed by this integration.

## Scope

This record reconciles the Search v2 work with the Material Symbols implementation and its production evidence. The work was completed in a clean integration worktree so the unrelated changes in the main worktree remained untouched.

Pinned inputs:

- Main starting commit: `c5edb88f95802c964b56bc8fb217f6e1b7a0687e`
- Material branch commit: `31ac66dfecc40e4549f08fc3d9dea99d583a3393`
- Shared base: `c37aefccf037328c3fb793b418a4530d93cd5ad2`
- Integration merge commit: `4c794104ff7991aec73e2cdfbd4fd2cb5b85ed06`
- Integration branch: `codex/search-v2-material-integration-20260716`

Main had three admin documentation commits after the shared base. The Material branch had 54 commits after the shared base. The integration used a merge commit to preserve both histories and their evidence references.

## Safety and provenance checks

The complete 54-commit Material range was scanned before integration, not only its final tree.

- No credential value, private connection string, CLI login URL, personal email address, or local user path was found.
- Matches for secret-like words were environment-variable references and test placeholders, not credentials.
- No internal model or prompt metadata was found in the changed public-safe files.
- The compressed Material asset bundle contains 8,524 SVG assets. The scan found no script elements, event handlers, external links, data URLs, or `foreignObject` elements.
- The Apache-2.0 source license, asset manifest, and third-party notice are present.
- The tracked `tmp/material-baseline-*.json` files remain because current verification records cite them as historical incident evidence. They were not treated as disposable runtime output.

## Shared search behavior

The shared files compose as follows in the integrated tree.

### Hosted search

`handle-search-request.ts` keeps Search v2 ranking and final SVG hydration. It separates Material result IDs from other catalog IDs, reads fixed-preset Material SVGs from `material_icon_assets`, reads other SVGs from `icon_catalog`, and restores the original result order through `hydrateServingSvgRows`.

### Result hydration

`result-hydration.ts` preserves non-Material SVG and null behavior. A ranked Material row that cannot be hydrated returns the explicit `material_asset_unavailable` error instead of disappearing from the response.

### Shared recommendation

`shared-recommendation-search-request.ts` uses the same split hydration after the grouped candidate request. Existing result parity, four logical rate units, and four audit rows remain part of the local verification contract.

### Railway MCP

`mcp/remote-server.js` uses local Material ranking for strict Material requests and hydrates from the bundled asset file. Other libraries and all-library search continue through hosted search. `mcp/material-hydration.js` can use the hosted snapshot function when the local bundle is unavailable.

### npm package

Package source version `0.4.18` contains the Material library capability data, hydration helper, icon indexes, usage-event dedupe fix, and snapshot fallback. The large compressed Material asset bundle is used by the Railway service and is not included in the npm package file list. A locally installed npm package therefore depends on the hosted snapshot fallback for Material SVG delivery.

## Deployment-state map

| Surface | Verified state on 2026-07-16 | Evidence and limit |
| --- | --- | --- |
| Integration source | Material support and Search v2 coexist on merge commit `4c794104f`. Package source version is `0.4.18`. | Local repository and combined gates. Not released from this branch. |
| Railway hosted MCP | Live health reports version `0.4.18`, 8,524 Material assets, and source revision `30f8fddd293b1f0189896dc4aaecdfaba1d37ae0`. | Read-only health request in this session and `material-railway-recovery-narrow-completion-2026-07-16.md`. |
| npm registry | `latest` remains `0.4.17`. | Read-only registry check in this session. Package `0.4.18` is not recorded as published. |
| Supabase database and Storage | Saved release evidence records migrations `20260714220000` and `20260714223000` as applied, with 8,524 table rows and 8,524 required Storage objects. | Packet 1R and Packet 2S records. Current live database state was not queried in this integration. |
| Supabase snapshot function | Saved release evidence records `serve-material-snapshot` version 49 as active and verified with outline and solid probes. | Packet 4R record. Current live function metadata awaits an authenticated read-only check. |
| Supabase stable search | Saved incident evidence records the emergency rollback as `mcp-search` version 38. | Current live function metadata awaits an authenticated read-only check. No Supabase function was deployed here. |
| Search v2 beta | No integrated beta was deployed or published. The earlier `0.4.18-beta.0` packet predates Material support. | A fresh version, fingerprint, and approval packet are required. |

## Verification results

The following checks passed on the integrated tree:

- 225-case semantic search suite, with 219 owner-reviewed cases and 6 contract fixtures
- Search v2 result fingerprint `e610fce301e92bef374fca076526ef07f0fe2f31b8d63a933cca399266593e76`
- Hosted HTTP response parity, including Material SVG hydration
- Search ranking, library modes, recommendation clarification, and shared recommendation result parity
- Batched candidate RPC and batched retrieval checks
- Result hydration, stage timing, grouped HTTP, and bounded internal concurrency checks
- Material MCP contract, 8,524-asset bundle, hosted authorization, serving behavior, Railway hydration, package inventory, and clean-install checks
- MCP public-safety scan across 44 packed files
- Disposable PostgreSQL 17 smoke checks for the Material and shared recommendation migrations, with no hosted systems touched
- Deno checks for `serve-material-snapshot`, `mcp-search`, `mcp-search-v2-beta`, and `search-icons`
- Default deterministic path check with zero model-provider calls

Three verifier assumptions were updated because the integrated architecture had changed:

1. Tool routing now tests stable package `0.4.18` and the separate beta-version contract instead of assuming the current source package is a beta.
2. Search parity now checks split catalog and Material SVG hydration instead of the pre-Material single-table fetch.
3. Package inventory and size checks now include the two public icon indexes and Material support files.

The brand review gate was also changed to accept compatible Search v2 specification versions from 1.4 onward instead of hard-coding version 1.4.

The expanded package safety scan exposed a registry synonym, `jailbreak attempt`, that was not public-safe once the full icon index became packaged. The source term was replaced with `prompt bypass attempt`, and the public registry and icon-index projections were rebuilt. The public-safety gate then passed.

## Release-impacting follow-up

Production-only dependency audits report two inherited transitive advisories:

- `hono` through `@modelcontextprotocol/sdk`, high severity
- `qs` through Express, moderate severity

The Material branch did not introduce either dependency version, and no direct use was found in the integrated code. They do not block local integration, but they must be resolved or explicitly accepted before the next npm publication or production code deployment.

## Decisions and next gate

- No Search v2 requirement changed, so the specification and decision log were not amended.
- The old search-only beta authorization is stale and must not be executed.
- Current Supabase function and migration state must be checked read-only after authentication.
- After independent review, integrate this branch into main without disturbing unrelated work.
- Recut the search-only beta from the reconciled code with a new version, fingerprint, Material regression checks, bounded concurrency, platform-log error accounting, usage dedupe verification, and cold-request reporting.
- Keep the shared recommendation treatment local until the corrected legal workload projects a pass and receives a separate measurement approval.
- Defer the database-tier decision until corrected workload and concurrency evidence can separate query design from capacity limits.

No UI screen changed, so browser verification was not applicable.
