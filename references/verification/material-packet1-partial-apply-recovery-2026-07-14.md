# Material Packet 1 partial-apply recovery

Date: 2026-07-14

Status: Production recovery completed. Packet 1 is closed and Packet 2 requires its separate approval.

## Pinned recovery

- Original implementation revision: `425d8c2873e244988ed93ade18396e0f5c688f5e`
- Recovery tooling revision: `03d53c8847649f019105b98f1b3391c7fa1c1f48`
- Original migration SHA-256: `497f6b838e8e3b01e8a3bbeb8d2e57327512c16784d3ad37c2824b6c99699d08`
- Recovery migration SHA-256: `2be4ba6f0cf81f1093108dedf41b27328590c92cc77a36f251f0e69b3f91827e`
- Recovery approval fingerprint: `71f9c2be7843ec48475479f4529ff73aaf0a8ba47ef359d6c3e00c7c592b4d29`
- Supabase project: `kcjmkakdhsqplvasgkjv`

The approval fingerprint is SHA-256 over this exact UTF-8 text with LF line endings, including one trailing LF after the final line:

```text
incident=material_packet1_private_roles_recovery
original_implementation_revision=425d8c2873e244988ed93ade18396e0f5c688f5e
recovery_tooling_revision=03d53c8847649f019105b98f1b3391c7fa1c1f48
original_migration_sha256=497f6b838e8e3b01e8a3bbeb8d2e57327512c16784d3ad37c2824b6c99699d08
recovery_migration_sha256=2be4ba6f0cf81f1093108dedf41b27328590c92cc77a36f251f0e69b3f91827e
project_ref=kcjmkakdhsqplvasgkjv
production_table_required_empty=true
```

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

## Production recovery result

The owner approved fingerprint `71f9c2be7843ec48475479f4529ff73aaf0a8ba47ef359d6c3e00c7c592b4d29`. The guarded production runner returned exit code 0.

The runner can return 0 only after this fixed sequence succeeds:

1. The recovery preflight confirms that the table exists, is empty, has RLS enabled, and still has the diagnosed direct-role privilege mismatch.
2. Recovery migration `20260714223000` runs in one transaction.
3. The full hosted postflight confirms the private-role boundary, service-role access, constraints, indexes, error columns, and empty table.
4. Migration-history versions `20260714220000` and `20260714223000` are marked applied.
5. The final linked migration list succeeds.

No original migration SQL was rerun. No seed, function deploy, Railway deploy, npm publication, normal database push, data write, or privilege grant ran in Packet 1R.

The repository now also runs `npm run verify:private-table-migrations`. For migrations after `20260714223000`, every newly created table must declare whether it is private or public. A private table must revoke direct `anon` and `authenticated` access in the same migration.

## Approved command after owner authorization

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/apply-material-private-roles-recovery-hosted.ps1 -ExecuteApprovedMaterialPrivateRolesRecovery
```

Stop if the table is missing, contains any row, lacks RLS, no longer has the diagnosed privilege mismatch, any hash differs, the recovery transaction fails, or the full postflight fails.

## Approval sentence

> Approve Material production Packet 1R for fingerprint `71f9c2be7843ec48475479f4529ff73aaf0a8ba47ef359d6c3e00c7c592b4d29`: apply only recovery migration `20260714223000` to the empty RLS-enabled Material asset table, rerun the full postflight, and repair only migration-history versions `20260714220000` and `20260714223000` after postflight passes. Do not rerun the original migration SQL. No seed, function deploy, Railway deploy, npm publish, normal database push, data write, or privilege grant is authorized.
