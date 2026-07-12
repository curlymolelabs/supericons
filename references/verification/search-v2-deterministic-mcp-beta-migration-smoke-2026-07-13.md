# Search v2 deterministic MCP beta migration smoke

Date: 2026-07-13
Environment: disposable local PostgreSQL 17 container
Status: target migration and RPC smoke passed; Gate B remains blocked by historical migration-version collisions

## Scope

Closed the database-specific Gate A checks for `20260712_search_v2_beta_measurement.sql` without connecting to hosted Supabase.

The smoke uses `public.ecr.aws/supabase/postgres:17.6.1.132`, creates only the two prerequisite audit tables and local roles, applies the checked-in migration, runs the checks inside transactions, rolls test rows back, and removes the container afterward.

## Passed checks

- 8 additive columns exist across `search_request_audit` and `mcp_usage_events`.
- 6 label constraints exist and are validated.
- 2 partial beta-cohort indexes exist.
- `si_log_mcp_search_outcome` exists.
- A valid clarification outcome writes the approved public fields.
- Invalid library mode is rejected.
- Invalid search outcome is rejected.
- Invalid confidence label is rejected.
- Invalid session hash is rejected.
- Clarification and zero remain separate outcomes with a `2|1|1` total, clarification, and zero check.
- Locale attempt aggregation returned sorted counts and ignored a negative invalid value.
- Gate A contract, Deno checks, admin query workbench contract, zero-provider-call gate, and 225-case evaluation passed again after the shared locale helper was added.

## Sanitized locale-count path

Locale attempt aggregation now lives in `lib/search-beta-measurement.js`. The admin analysis pack calls this function, and the migration smoke directly exercises the same function with English, Japanese, Thai, and missing-locale counts.

Observed test result:

```json
{
  "(missing)": 1,
  "en": 7,
  "ja": 2,
  "th": 2
}
```

This verifies aggregation behavior. A live admin export remains a Gate C observation after deployment approval.

## Historical migration-chain finding

The Supabase CLI could start PostgreSQL but could not rebuild the full repository migration chain. It stopped before the target migration because multiple historical files share the same migration version prefix.

Duplicate groups verified in the workspace:

- `20260324`: 4 files
- `20260406`: 2 files
- `20260414`: 3 files
- `20260416`: 3 files
- `20260417`: 2 files
- `20260418`: 4 files
- `20260501`: 3 files

The first failure was a duplicate `20260324` key in `supabase_migrations.schema_migrations`. This is older repository migration debt, not a failure of the new additive migration. It still affects the safety of a future CLI deployment because the repository cannot currently prove a clean full-chain rebuild.

Do not rename historical migration files or repair hosted migration history without a separate inventory and approved reconciliation plan. Do not use production as the first test environment.

## Commands corrected during the smoke

- The first test assumed an old local Supabase container name. The final smoke creates and removes its own named disposable container.
- The Supabase PostgreSQL image restarts during bootstrap. The final smoke waits for stable readiness.
- The image's GraphQL placeholder trigger expects the full Supabase bootstrap. The final minimal-schema smoke disables that unrelated placeholder trigger inside the disposable container only.
- Schema setup and migration apply use the image's owning `supabase_admin` role.

## External state

- No hosted Supabase connection
- No hosted migration or function deployment
- No npm publication or tag change
- No Netlify deployment
- No password or provider credential used
- No model-provider call

## Result

The target migration, RPC, outcome separation, and locale-count helper are locally verified on real PostgreSQL. Gate A's target checks are complete. Gate B is not ready for approval until the historical migration ledger and safe deployment method are reconciled.
