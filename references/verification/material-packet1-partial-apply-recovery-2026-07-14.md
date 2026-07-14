# Material Packet 1 partial-apply recovery

Date: 2026-07-14

Status: Recovery implemented and locally verified. Production recovery has not run and requires a separate owner approval.

## What happened

The guarded Packet 1 runner applied the exact original migration transaction. Its fixed postflight then failed with:

```text
ERROR: A public role can read material_icon_assets
```

The remote migration ledger does not list version `20260714220000`, so the runner correctly stopped before history repair. The original SQL must not be rerun.

## Verified production state

- `material_icon_assets` exists.
- The table is empty.
- Row level security is enabled.
- The service role has the required access.
- `anon` or `authenticated` retains direct table privileges from production default privileges.
- The original migration version is absent from the remote migration ledger.
- No hosted seed, function deploy, Railway deploy, or npm publication ran.

The table is empty and RLS has no public policy, so no Material SVG asset was exposed. The privilege grant still violates the required private-store contract and must be removed before seeding.

## Root cause

The original migration ran:

```sql
revoke all on table public.material_icon_assets from public;
```

The production project also applies direct default privileges to `anon` or `authenticated`. Revoking the `PUBLIC` pseudo-role does not remove grants made directly to those roles.

## Recovery design

The additive recovery migration is `supabase/migrations/20260714223000_material_icon_assets_private_roles.sql`.

It changes no schema and no data. It only runs:

```sql
revoke all on table public.material_icon_assets from anon, authenticated;
```

The guarded recovery runner:

1. Requires the table to exist, remain empty, and have RLS enabled.
2. Requires the production privilege mismatch to still exist.
3. Applies only recovery migration `20260714223000` in one transaction.
4. Reruns the full original postflight.
5. Repairs only ledger versions `20260714220000` and `20260714223000` after postflight passes.
6. Never reruns the original migration SQL and never runs `supabase db push`.

## Rollback

Do not restore anonymous or authenticated privileges. A full feature rollback uses `supabase/rollbacks/20260714220000_material_icon_assets.down.sql` after serving code and seed writers are stopped. The recovery migration's standalone rollback is intentionally a no-op.

## Local verification

- `npm run verify:material-hosted-recovery-runner`: passed.
- `npm run verify:material-asset-migration`: passed after reproducing production default privileges in disposable PostgreSQL.
- The recovery migration is idempotent.
- The original postflight fails before recovery and passes after recovery.
- Anonymous read is denied after recovery.
- Full rollback is verified.
- The recovery runner refuses to start without its approval switch.

One disposable PostgreSQL attempt failed before SQL because its container socket was not ready. The immediate retry passed the full migration and rollback sequence. This startup flake is recorded and is not reported as a clean first-attempt pass.
