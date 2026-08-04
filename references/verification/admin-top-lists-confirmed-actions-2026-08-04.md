# Admin Top Lists confirmed actions release

## Outcome

The Overview page now has two top lists:

- Queries shows the most searched queries.
- Icons shows confirmed icon actions only.

The Icons list combines Web copy and download actions with successful Hosted MCP `get_icon` calls. Search result exposure is not treated as popularity. Local MCP icon actions are shown as unavailable because they are not recorded yet.

## Release

- Source commit: `56e74538fad4dff8039853dfa550020a604c8512`
- Supabase function: `admin-api`
- Previous version and rollback target: `121`
- Active version: `122`
- Active state: `ACTIVE`
- Active bundle SHA-256: `e986d0ccf17f7d43986d79fb5405caafb5feb0ac05d7b5ae567abb79d169b275`
- Database migrations: none
- Search engine changes: none
- MCP runtime changes: none

## Data boundaries

| Dashboard venue | Icon action source |
| --- | --- |
| All venues | Web copy and download actions plus Hosted MCP `get_icon` |
| Web | Production website copy and download actions only |
| Hosted MCP | Successful Hosted MCP `get_icon` calls only |
| Local MCP | Unavailable until confirmed Local MCP icon actions are recorded |

Signed controlled traffic is excluded unless the owner enables test traffic. Preview and local website domains are excluded from the default Web view. If either source reaches its safe row limit, the Icons list reports that the period is too large instead of showing a partial ranking.

## Verification

The following checks passed on 2026-08-04:

- `deno check --no-config supabase/functions/admin-api/index.ts`
- `node scripts/verify-admin-dashboard-v2-helpers.mjs`
- `npm run verify:admin-dashboard-phase-b`
- `npm run verify:admin-dashboard-v2-api`
- `npm run verify:admin-dashboard-v2-error-states`
- `npm run verify:admin-dashboard-v2-operator-contract`
- `node scripts/verify-admin-dashboard-phase-b-browser.mjs`
- `node scripts/verify-admin-dashboard-phase-b-live.mjs --output references/verification/admin-top-lists-live-2026-08-04.json`

The authenticated live walkthrough passed with these source labels:

- All venues: `web_and_hosted_confirmed_actions`
- Web: `web_copy_and_download_events`
- Hosted MCP: `hosted_mcp_get_icon`
- Local MCP available: `false`
- Test filter metadata matched the selected state: `true`
- Source rows complete for the checked period: `true`

The machine-readable live result is stored in `references/verification/admin-top-lists-live-2026-08-04.json`.
