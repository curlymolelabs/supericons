# Admin dashboard Phase A migration approval

- Date: 2026-07-16
- Status: Ready for independent audit. Not executed.
- Fingerprint: `eb94a5886623ec9b356e84be1532d93ba474f1c24dc19879fe20cbb06a3e93d9`
- Implementation revision: `3ce3224205c4ef13f7eb3ad0d83556db4c08c708`
- Supabase project: `kcjmkakdhsqplvasgkjv`

## Authorized change

Apply only migration `20260716040000_admin_dashboard_phase_a.sql` in one transaction. The migration adds three nullable telemetry columns, two validated constraints, five supporting indexes, and two empty private rollup tables. Repair only migration-history version `20260716040000` after the hosted postflight passes.

## Guarded runner

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/run-admin-dashboard-phase-a-migration.ps1 -ApprovalFingerprint eb94a5886623ec9b356e84be1532d93ba474f1c24dc19879fe20cbb06a3e93d9 -Execute
```

Before execution, the owner must run `supabase login` and link only project `kcjmkakdhsqplvasgkjv`. The database password is entered only into the hidden runner prompt.

The runner stops if any Phase A column, table, index, or migration-history row already exists. Its postflight requires the exact schema counts, enabled row level security, no `anon` or `authenticated` read access, service-role write access, and zero rollup rows.

No normal `supabase db push` is permitted. If SQL and postflight pass but history repair fails, do not rerun the SQL.

## Approval sentence

> Approve Admin dashboard Phase A Packet 1 for fingerprint `eb94a5886623ec9b356e84be1532d93ba474f1c24dc19879fe20cbb06a3e93d9`: apply only migration `20260716040000` to Supabase project `kcjmkakdhsqplvasgkjv` with the guarded single-transaction runner, require the pinned private-table postflight, and repair only that exact migration-history version. No function deployment, Railway deployment, storage change, npm publication, seed, deletion, or normal database push is authorized.
