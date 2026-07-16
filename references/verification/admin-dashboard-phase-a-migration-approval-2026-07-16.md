# Admin dashboard Phase A migration approval

- Date: 2026-07-16
- Status: Ready for independent audit. Not executed.
- Fingerprint: `0b41ec129a7a778808a5711fba912675cb66f5f9b9ef363099e74c04b6191df5`
- Implementation revision: `3ce3224205c4ef13f7eb3ad0d83556db4c08c708`
- Supabase project: `kcjmkakdhsqplvasgkjv`

## Authorized change

Apply only migration `20260716040000_admin_dashboard_phase_a.sql` in one transaction. The migration adds three nullable telemetry columns, two validated constraints, five supporting indexes, and two empty private rollup tables. Repair only migration-history version `20260716040000` after the hosted postflight passes.

## Guarded runner

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/run-admin-dashboard-phase-a-migration.ps1 -ApprovalFingerprint 0b41ec129a7a778808a5711fba912675cb66f5f9b9ef363099e74c04b6191df5 -Execute
```

Before execution, the owner must run `supabase login` and link only project `kcjmkakdhsqplvasgkjv`. The runner requires the linked-project metadata and pooler URL to match that exact project. The database password is entered only into the hidden runner prompt.

The runner stops if any Phase A column, table, index, or migration-history row already exists. Before changing the schema, it runs a read-only migration-list command to prove the Supabase CLI session and linked project are usable. The hidden password is provided to PostgreSQL as `PGPASSWORD` and to the Supabase CLI as `SUPABASE_DB_PASSWORD`; both process variables are removed in `finally`. The migration and hosted postflight run together in one `psql --single-transaction` invocation, so a failed postflight rolls back the migration. The postflight requires the exact schema counts, enabled row level security, no `anon` or `authenticated` read access, service-role write access, and zero rollup rows. Supabase CLI notices cannot override the command exit code, so a successful command is not treated as failed because it printed a notice.

## Attempt 1

The first approved attempt stopped at the read-only Supabase CLI connectivity precheck because the runner provided only `PGPASSWORD`. The CLI required `SUPABASE_DB_PASSWORD`. The failure happened before either hosted SQL invocation, so no production mutation occurred. The retained evidence is `admin-dashboard-phase-a-migration-attempt-1-2026-07-16.json`. This packet fixes only that credential handoff and requires a fresh approval.

No normal `supabase db push` is permitted. If SQL and postflight pass but history repair fails, do not rerun the SQL.

## Approval sentence

> Approve Admin dashboard Phase A Packet 1R for fingerprint `0b41ec129a7a778808a5711fba912675cb66f5f9b9ef363099e74c04b6191df5`: apply only migration `20260716040000` to Supabase project `kcjmkakdhsqplvasgkjv` with the guarded single-transaction runner, provide the hidden database password only through the two required process environment variables, require the pinned private-table postflight in that same transaction, and repair only that exact migration-history version. No function deployment, Railway deployment, storage change, npm publication, seed, deletion, or normal database push is authorized.
