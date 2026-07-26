# Icon request entry points verification

Date: 2026-07-27

Branch: `codex/icon-request-entry-points-20260727`

## Scope

The website supports icon requests from:

- A search with zero results
- A search with one or two results
- The permanent sidebar action, with or without a prior search

New requests use the dedicated `si_log_icon_request` database function and do not create search attempts. The Demand Inbox reads both the legacy request shape and the dedicated request shape.

## Passed checks

| Check | Result |
| --- | --- |
| JavaScript syntax for website writer, website UI, and admin UI | Passed |
| Deno type check for the admin API | Passed |
| Icon request static contract | Passed |
| Demand Inbox static contract | Passed |
| Admin API route contract | Passed |
| Admin operator contract | Passed |
| Admin browser regression | Passed |
| Website browser flow for all three placements | Passed |
| Twelve locale catalogs | Passed |
| Existing icon grid behavior | Passed |
| Production website build | Passed |
| Added-line whitespace and prohibited dash scan | Passed |

The browser flow captured three request writes. The zero-result request recorded zero results, the low-result request recorded one result, and the standalone sidebar request recorded no search query and no result count.

Screenshot: [icon request browser verification](icon-request-entry-points-2026-07-27.png)

## Release gates

The disposable PostgreSQL migration test could not run because the local Docker Desktop daemon was unavailable.

The linked Supabase project was reachable. `supabase db push --linked --dry-run` made no changes and stopped because the remote migration history contains a version missing from the local migration directory, while the local directory also contains older versions missing remotely. Migration history must be reconciled through the repository's release process before this migration is applied.

No database migration, Edge Function deployment, website deployment, or production request write was performed.
