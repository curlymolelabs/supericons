# Admin Demand Inbox v2 verification

## Verdict

Status: passed after repair.

The v2 admin dashboard shows a Demand Inbox built from trusted final search outcomes. The current 24-hour production view rendered 14 failed or weak query rows with test traffic excluded.

## Production state

- Database review constraint accepts the seven ratified actions.
- Existing review rows before and after migration: 16.
- Existing status counts stayed unchanged: 10 ignore, 4 resolved, 2 needs alias.
- Admin API rollback point before this work: function version 101.
- Current deployed admin API: version 104.
- No website, Search v2, MCP runtime, npm, allowance, icon, alias, ranking, or documentation system was deployed or changed.

## Verification matrix

| Check | Result | Proof |
|---|---|---|
| Focused Demand Inbox contract | Passed | `npm run verify:admin-demand-inbox-v2` |
| Admin API type check | Passed | `deno check supabase/functions/admin-api/index.ts` |
| V2 API contract | Passed | `node scripts/verify-admin-dashboard-v2-api.mjs` |
| V2 helper behavior | Passed | `node scripts/verify-admin-dashboard-v2-helpers.mjs` |
| Search detail limit behavior | Passed | `node scripts/verify-admin-dashboard-search-history-cap.mjs` |
| Static dashboard contract | Passed | `node scripts/verify-admin-dashboard-phase-b.mjs` |
| Full mocked browser flow | Passed | `node scripts/verify-admin-dashboard-phase-b-browser.mjs` |
| Live browser with real rows | Passed | `npm run verify:admin-demand-inbox-v2-live` |
| Live review write | Passed | Controlled `add_icon` review saved through `/v2/search/review`, verified, then removed |
| Automatic product writes | None | Review endpoint writes only to `icon_query_reviews` |

## Live browser result

Source: `references/verification/admin-demand-inbox-v2-live-20260725.json`

- Period: 24 hours
- Channel: all
- Test traffic: excluded
- Real Demand Inbox rows rendered: 14
- Rows with complete visible states: 14
- Rows with all review choices: 14
- Rows with channel recorded: 14
- Rows with result count recorded: 14
- Rows with country recorded: 3
- Rows with language recorded: 0
- Visible columns: Query, Issue, Channel, Language, Country, Result count, Searches, Action

The current 14 rows do not contain a recorded language value. The dashboard shows Language not recorded. It does not guess.

## Defect found and repaired

The first live deployment returned 96 real searches but zero Demand Inbox rows. The worklist read pre-normalization field names after the rows had already been normalized. The admin API was corrected to use `true_zero_count` and `low_result_count`.

A focused regression fixture now proves that a zero-result row remains in the worklist after v2 normalization. It also proves that language, country, and environment details survive normalization. The live rerun then returned and rendered 14 real rows.

## Rollback

- Admin API: restore function version 101 if the current function fails.
- Database: run `supabase/rollbacks/20260725130000_expand_query_review_actions.down.sql`.
- The database rollback stops if new action values exist. This prevents a saved human decision from being discarded or mislabelled.
