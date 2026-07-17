# Live vs Local Usage Separation Safe Rollout Plan

Date: 2026-06-14

## Goal

Separate live production search/query analytics from local development usage without breaking the existing public site, local admin dashboard, hosted search, Motion Lab, Converter, or MCP flows.

The first implementation should be intentionally small:

- Keep current search behavior and result ranking unchanged.
- Keep current database tables.
- Default admin analysis to live usage only.
- Preserve a clear way to include local/test rows when debugging.
- Keep admin local-only unless explicitly published.
- Do not add Motion Lab or Converter telemetry in this rollout.

## Current Verified Surfaces

- Public build command runs `scripts/cleanup-dist-admin-artifacts.mjs`.
- Admin artifacts are removed from `dist` unless `PUBLISH_ADMIN_UI=true`.
- Hosted browser search currently calls `searchIconsHosted` from `main.js` with `source: 'web'`.
- `lib/search-engine-client.js` forwards the `source` value to the Supabase `search-icons` function.
- `search_request_audit.source` already stores the source value, so basic local/live separation does not require a migration.
- `lib/icon-intelligence.js` already logs existing search/copy/favorite evidence through `si_log_icon_evidence`.
- `public/admin-app.js` query filters currently include query, issue type, status, library, and job category, but not environment.
- `supabase/functions/admin-api/index.ts` builds the Query Explorer payload from both `search_request_audit` and `icon_evidence`.

## Non-Breaking Principles

1. Do not change search ranking, query expansion, result contracts, or icon payloads.
2. Do not remove existing `source = 'web'` compatibility from backend code.
3. Do not require a schema migration for this narrowed rollout.
4. Do not publish admin UI as part of the public site.
5. Do not store raw IPs, uploaded SVG/PNG/base64 content, or full query-string URLs.
6. Add filters in a way that defaults to current useful behavior: live production analytics.
7. Make rollback simple by allowing the frontend to send `source: 'web'` again and by keeping admin filtering backward-compatible.
8. Do not add new Motion Lab or Converter usage capture in this rollout.

## Environment Model

Use these analytics environment labels:

| Environment | Host examples | Search source |
| --- | --- | --- |
| production | `supericons.dev`, `www.supericons.dev`, any explicitly approved production host | `web` |
| local | `localhost`, `127.0.0.1`, `[::1]` | `local_web` |
| preview | Netlify preview or branch deploy hostnames | `preview_web` |
| test | explicit automated test flag or mock harness | `test_web` |

Production remains `web` to preserve old meaning and avoid disrupting existing dashboards.
Keep the production host list as a small allowlist in code so future custom or Netlify production domains can be added without changing the analytics model.

## Phase 1: Search Usage Separation

### Implementation

1. Add a small environment helper in the frontend.
   - Input: `window.location.hostname`
   - Output: `production`, `local`, `preview`, or `test`
   - Keep it pure and easy to test.

2. Update hosted search calls in `main.js`.
   - Keep production as `source: 'web'`.
   - Use `source: 'local_web'` for local dev.
   - Use `source: 'preview_web'` for preview deploys.
   - Use `source: 'test_web'` only when explicitly configured.

3. Do not change `lib/search-engine-client.js` request shape except if needed to centralize source defaults.

4. Add safe environment context to existing icon evidence calls that already happen in the main search/customize experience.
   - Use `p_domain` for hostname only.
   - Use `p_context_url` for path only, without query string or hash.
   - Keep existing `ui_surface` values such as `grid`, `panel`, and `component-export`.
   - Do not add Motion Lab or Converter event logging.

### Safety Checks

- Search still returns results locally.
- Search still returns results from production.
- Account/pro detection remains unchanged.
- Existing icon copy/favorite/download evidence remains non-blocking.
- Rows still insert into `search_request_audit`.
- Production rows continue to use `source = 'web'`.
- Local rows use `source = 'local_web'`.
- Existing public app actions still work if evidence logging fails.

### Deployment

- Requires `npm run build`.
- Requires Netlify redeploy for the production site to send the updated source/context values.
- Does not require redeploying `search-icons` if only the browser `source` value changes.

## Phase 2: Admin Query Explorer Environment Filter

### Implementation

1. Add an `environment` query parameter to the admin API.
   - Allowed values: `live`, `production`, `preview`, `local`, `test`, `legacy`, `all`.
   - Default: `live`.

2. Apply filtering before aggregation.
   - This is important because filtering after aggregation would still allow local rows to pollute counts.
   - Apply the same environment filter to queue, detail, and export endpoints.
   - Query detail drill-down must not reintroduce local/test rows when the queue is in `Live only` mode.
   - Query Explorer is the source of truth for environment-filtered analysis. Any review queue counts rendered from Query Explorer data should follow the same environment filter.
   - Top-query overview cards, search summaries, evidence activity, queue counts, detail rows, and exports should all use the same environment filter so the dashboard does not show conflicting numbers.

3. Map row environments as follows:
   - `search_request_audit.source = 'web'` -> `production`
   - `search_request_audit.source = 'local_web'` -> `local`
   - `search_request_audit.source = 'preview_web'` -> `preview`
   - `search_request_audit.source = 'test_web'` -> `test`
   - `icon_evidence.domain` or `context_url` host/path can infer local/preview/production when available.
   - Rows that cannot be classified should map to `legacy`.
   - `legacy` rows should be included in `all`, excluded from `live`, and selectable via a dedicated `Legacy / unknown` filter.

4. Add matching UI control in local admin.
   - Default label: `Live only`
   - Options:
     - `Live only`
     - `Production`
     - `Preview`
     - `Local`
     - `Test`
     - `Legacy / unknown`
     - `All`

5. Ensure exports honor the same environment filter.
   - CSV, JSON, and Agent Pack exports should all reflect the selected environment.

6. Ensure query detail requests carry the same environment filter.
   - Opening a row from `Live only` must load only live detail evidence.
   - Opening a row from `Local` must load only local detail evidence.
   - Opening a row from `All` may load all matching evidence.

### Safety Checks

- Admin still loads locally after `ADMIN_SECRET`.
- Query Explorer loads with default `Live only`.
- Switching to `Local` shows local rows.
- Switching to `Legacy / unknown` shows older unclassified evidence rows when present.
- Switching to `All` shows all rows.
- Query detail rows match the selected environment filter.
- CSV/JSON/Agent Pack exports match the selected filter.
- Existing historical `web` rows remain visible as production/live.
- Historical unclassified `icon_evidence` rows remain available under `Legacy / unknown` or `All`.

### Deployment

- Requires redeploying `admin-api`:

```powershell
supabase functions deploy admin-api --project-ref kcjmkakdhsqplvasgkjv --no-verify-jwt
```

- Requires using the updated local `public/admin-app.js` and `admin.html`.
- This execution also changes public app analytics source tagging, so Netlify redeploy is required after `npm run build` passes.
- The admin API allowed-origin list includes local admin hosts such as `http://localhost:5173` and `http://127.0.0.1:5173` so the local dashboard can use either hostname.

## Explicitly Out Of Scope

Motion Lab and Converter telemetry are intentionally skipped.

This rollout should not:

- Add a `tool_usage_audit` table.
- Add Motion Lab event logging.
- Add Converter event logging.
- Change Motion Lab export behavior.
- Change Converter copy/download behavior.
- Store uploaded SVG/PNG/base64 content.

Motion Lab and Converter should only be smoke-tested to confirm this search/admin analytics work did not accidentally break existing app navigation.

## Stress Test and Gap Analysis

### Risk: Historical Data Cannot Be Fully Reclassified

Old hosted-search rows with `source = 'web'` include whatever happened before this separation existed. Treat them as production by default, but document that pre-change history may include local usage.

Old `icon_evidence` rows may not have enough domain/context data to classify. Treat those as `legacy`, not `production`.

Mitigation:

- Add a note in admin exports: rows before the rollout date may include mixed local/live usage.
- Keep `Legacy / unknown` and `All` filters for audits.

### Risk: Client-Provided Source Can Be Spoofed

The browser sends `source`, so this is analytics labeling, not a security boundary.

Mitigation:

- Do not use `source` for authorization or billing.
- Use it only for admin reporting.

### Risk: Preview Deploys Pollute Production Metrics

Netlify preview URLs can generate real-looking usage.

Mitigation:

- Detect preview hostnames separately as `preview_web`.
- Default admin filter excludes preview unless selected.

### Risk: Admin API Filters After Aggregation

If local rows are filtered after aggregation, counts will still be wrong.

Mitigation:

- Filter raw `search_request_audit` and `icon_evidence` rows before building query rows.
- Add a verification case with one local and one production row for the same query.
- Apply the same raw-row environment filter before building query detail summaries, result history, recent evidence rows, related replacements, related copies, and related favorites.

### Risk: Admin UI Accidentally Published

The build currently removes admin artifacts from `dist` unless `PUBLISH_ADMIN_UI=true`.

Mitigation:

- Do not set `PUBLISH_ADMIN_UI=true` for public Netlify deploys.
- After every build, verify `dist/admin.html` and `dist/admin-app.js` are absent.

### Risk: User-Facing Site Breaks From Analytics Failure

Analytics writes can fail because of network, RLS, missing grants, or CORS.

Mitigation:

- Keep analytics calls non-blocking.
- Catch and ignore telemetry failures in UI flows.
- Do not let logging failures block search, copy, favorite, or download actions.

### Risk: Motion Lab or Converter Accidentally Affected By Nearby Edits

This rollout does not need Motion Lab or Converter code changes, but broad edits in `store.js` could still accidentally affect those views.

Mitigation:

- Do not edit Motion Lab or Converter code paths.
- Smoke-test that both views still open after build.
- If a change requires touching those sections, stop and reassess scope before editing.

## Verification Matrix

| Area | Check | Expected result |
| --- | --- | --- |
| Public build | `npm run build` | Build passes |
| Admin artifacts | inspect `dist` | no `admin.html`, no `admin-app.js` unless intentionally publishing admin |
| Public safety | `npm run verify:public-safety` | passes |
| Public boundaries | `npm run verify:public-boundaries` | passes |
| Search local | search on localhost | row source is `local_web` |
| Search production | search on `supericons.dev` | row source is `web` |
| Same-query split | search the same query once locally and once in production | default live queue/detail/export count only the production row |
| Admin default | open local admin | Query Explorer defaults to live only |
| Admin local filter | select Local | local rows appear |
| Admin legacy filter | select Legacy / unknown | unclassified historical rows appear when present |
| Admin all filter | select All | local and live rows appear |
| Exports | CSV/JSON/Agent Pack | exported rows match selected environment |
| Motion Lab smoke | open Motion Lab view | view opens; no telemetry change expected |
| Converter smoke | open Converter view | view opens; no telemetry change expected |

## Rollout Order

1. Implement frontend environment helper and search source tagging.
2. Implement admin API environment filtering.
3. Implement admin UI filter control.
4. Run local build and public-safety checks.
5. Verify local admin behavior.
6. Deploy `admin-api` with `--no-verify-jwt`.
7. Deploy public `dist` to Netlify only after local production build passes.
8. Run one local search and one production search.
9. Run the same query once locally and once in production.
10. Confirm SQL rows show separated sources.
11. Confirm default live queue, detail, and exports exclude the local row for that same query.

## Rollback Plan

If public search or app behavior breaks:

1. Revert frontend source tagging to `source: 'web'`.
2. Rebuild and redeploy Netlify.
3. Leave admin API filter code in place if it is backward-compatible.

If admin dashboard breaks:

1. Revert admin UI filter changes locally.
2. Redeploy previous `admin-api` with:

```powershell
supabase functions deploy admin-api --project-ref kcjmkakdhsqplvasgkjv --no-verify-jwt
```

## Completion Criteria

This rollout is complete when:

- Existing public search and icon copy/download flows still work.
- Motion Lab and Converter still open normally and have no new telemetry requirements.
- Local search rows no longer appear in the default live admin view.
- Admin can intentionally inspect local/test rows.
- Admin can intentionally inspect legacy/unknown rows.
- Queue, detail, and export views apply the same environment filter.
- Public `dist` does not include admin artifacts.
- Exports respect the selected environment.
- No raw personal data, uploaded asset content, raw IPs, or full URLs are logged.
