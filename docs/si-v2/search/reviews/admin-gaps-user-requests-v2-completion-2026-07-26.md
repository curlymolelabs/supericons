# Gaps and User requests v2 completion

## Result

Status: passed against production data.

The Searches page now has three separate tables in this order:

1. Search history
2. Gaps
3. User requests

Gaps is the existing failed and weak search worklist. Its data source, grouping, issue rules, and action rules did not change.

User requests is a separate table for sentences entered after a Web search returned no icons.

## User request source

A row qualifies only when:

- `signal_type = 'search_attempt'`
- `ui_surface = 'grid_empty_feedback'`
- `evidence_text` is not empty
- The stored Web domain is a listed production host when test traffic is excluded

This prevents machine-made evidence text from appearing as a human request.

The table shows the stored sentence first. The failed query, library, and date appear below it.

## Review writes

Status and note are saved through:

`POST /v2/icon-requests/review`

The admin API verifies that the selected ID belongs to a `grid_empty_feedback` search row before writing to `public.admin_icon_request_reviews`.

The review write does not create or change an icon, alias, ranking rule, search result, or public product record.

## Production proof

Verified at: `2026-07-25T16:36:02.575Z`

Verified period: 30 days

Verified filters:

- Channel: all
- Test traffic: excluded
- Production Web domain: `supericons.dev`

Observed in the running dashboard:

- 25 Gaps rows on the visible page
- 9 User requests
- Request text, failed query, library, date, status, and note all rendered
- A temporary review status and note survived a full page reload
- The temporary review row was removed after verification
- Automatic product writes: 0

The recent period is expected to be empty. Production contains 0 matching requests in 7 days and 9 matching requests in 30 days.

## Checks run

- `deno check supabase/functions/admin-api/index.ts`
- `node --check public/admin-app.js`
- `node scripts/verify-admin-demand-inbox-v2.mjs`
- `node scripts/verify-admin-dashboard-phase-b.mjs`
- `node scripts/verify-admin-dashboard-phase-b-browser.mjs`
- `node scripts/verify-admin-dashboard-v2-api.mjs`
- `node scripts/verify-admin-dashboard-phase-a-api.mjs`
- Authenticated production browser verification

## Deployment and rollback

Deployed function: `admin-api`

Deployed version: 106

Deployed status: active

Deployed bundle SHA-256: `815b6e89a17a89dfe84be4315acd30c5da479b99099860c0cf16a6a0e195f49e`

Previous version: 104

The previous function entry source was preserved locally before deployment. No migration was applied.
