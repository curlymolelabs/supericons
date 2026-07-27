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
| Sidebar context invalidation across two searches | Passed |
| Request-form view observer and unchanged grid order | Passed |
| Twelve locale catalogs | Passed |
| Existing icon grid behavior | Passed |
| PostgreSQL 17 migration, postflight, history, and rollback | Passed |
| Guarded hosted migration packet | Passed |
| Production website build | Passed |
| Added-line whitespace and prohibited dash scan | Passed |

The browser flow captured five request writes. It proved:

- A zero-result request records zero results.
- A low-result request records one result.
- A sidebar request records the active query and result count.
- Changing from `onlyone` to `zzzz-no-match` invalidates sidebar context and records the new zero-result context.
- A standalone sidebar request records no search query and no result count.
- Leaving and returning to the icon grid clears sidebar context without changing icon order.

Screenshot: [icon request browser verification](icon-request-entry-points-2026-07-27.png)

## Release gates

The disposable PostgreSQL 17 migration test passed. It applied the migration twice, preserved the existing evidence function, ran the guarded postflight, verified exact history state, rejected invalid contexts, confirmed private table access, and proved that operational rollback preserves recorded rows.

The linked project still has unrelated migration-history drift, so broad `supabase db push` remains prohibited. A targeted runner now:

1. Pins the linked project and exact migration hash.
2. Verifies current constraint and function fingerprints.
3. Applies only migration `20260727120000` in one transaction.
4. Verifies constraints, privileges, table access, existing rows, and the unchanged evidence function.
5. Marks only migration `20260727120000` as applied.
6. Provides an operational rollback that preserves request rows.

Packet fingerprint: `3ef743d3277991014bb8fa4df539b5a40eafec23631bc4019780982edee4c73d`

The guarded database release completed against project `kcjmkakdhsqplvasgkjv` from
commit `4a45db49418acc97f7356a26c2fd28fdc2866d3b`. The preflight, postflight,
and exact history check passed. No synthetic request row was created by the
migration. The admin API and website had not yet been deployed when this record
was updated.
