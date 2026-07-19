# Admin dashboard searcher sync verification

- Date: 2026-07-18
- Branch: `codex/admin-dashboard-v2-gap-repair`
- API function: `admin-api`
- Active API version: 79
- Active API SHA-256: `2bd4be4570999dbec0ff675dbf6d28f7dcbf1b06aee21fd1f6577e9557164df8`

## Verified result

Overview, Search Intelligence, and Audience now use one shared view marker, data cutoff, and filter key per refresh. Responses with a different marker are rejected instead of replacing the current view.

The 30-day live production walkthrough returned matching figures:

- Overview searches: 14,736
- Search Intelligence searches: 14,736
- Overview estimated reach: 933 searchers
- Audience estimated reach: 933 searchers

The Overview Estimated reach card now shows only the selected-period searcher count. All-time registered and Pro account totals remain separate on Audience.

Query rows show searches and searchers as separate measures. Searcher details can be opened when the grouped source data is available. Registered accounts show Last sign-in and Last search separately.

## Verification

The following checks passed:

- Searcher and page-sync contract: 35 checks
- Local browser contract: 33 requests, three navigation sections, three inline SVG charts
- Live production browser walkthrough: 19 API requests, 25 latest-activity rows, 27 completed series days, four inline SVG charts
- Live warm render: 72 ms
- Live horizontal overflow: none
- Live credential prompt: none
- JavaScript syntax checks: passed
- Git whitespace check: passed

The live screenshot was retained locally for visual inspection and was not added to Git.

## Production boundary

Only `admin-api` was deployed. The active `mcp-search` function remains version 39. No database migration, storage change, npm publication, or Git push was performed.
