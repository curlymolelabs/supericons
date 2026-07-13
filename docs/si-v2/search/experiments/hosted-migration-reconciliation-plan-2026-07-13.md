# Hosted migration reconciliation plan

Date: 2026-07-13
Status: plan ready; hosted execution requires Gate B approval

## Outcome

Use a narrow beta-only release path while keeping the older migration-history problem blocked from normal deployment.

The hosted database already contains most historical schema objects, but its migration ledger records only one older version. The local folder also contains repeated date prefixes and one modified historical seed migration. A normal `supabase db push` is therefore unsafe.

The current release does not need the paused semantic-documents migration. It needs only `20260712_search_v2_beta_measurement.sql`, whose prerequisites are present and whose objects are absent from the hosted schema.

## Rollback plan

Rollback is defined before any hosted write:

1. Route the beta prerelease away from the isolated beta endpoint and deprecate the prerelease package.
2. Disable or remove the isolated `mcp-search-v2-beta` function if it has been deployed.
3. Stop calls to `si_log_mcp_search_outcome`.
4. Drop the beta logger function and the two beta cohort indexes only if a database rollback is needed.
5. Leave the eight nullable audit columns and their constraints in place until no released client writes them.
6. Remove columns only in a later reviewed migration after compatibility and evidence retention are confirmed.

If the migration transaction fails, the entire transaction must roll back and no migration-history repair may run. If the SQL succeeds but history repair fails, verify the hosted objects and retry only the history repair. Do not rerun the SQL by assumption.

## Approved technical shape

After Gate B approval:

1. Run `scripts/apply-search-v2-beta-hosted.ps1 -ExecuteApprovedGateB`, which first performs a read-only hosted preflight proving the two audit tables exist and the beta objects are absent.
2. Apply only `20260712_search_v2_beta_measurement.sql` with PostgreSQL single-transaction behavior and stop on the first error.
3. Run the same RPC and invalid-input checks used by the disposable PostgreSQL smoke, inside transactions that roll back their test rows.
4. Mark only version `20260712` as applied in the hosted migration ledger.
5. Re-run `supabase migration list --linked` and save the result.
6. Keep every older unmatched local migration blocked from `db push`.
7. Deploy the isolated beta function only after the database checks pass.
8. Publish only the prerelease package and keep the `latest` tag unchanged.

The beta release must not apply `20260701_semantic_search_v2_documents.sql`. Semantic retrieval remains paused under D-021.

## Prohibited operations

- Do not run `supabase db push` or `supabase db push --include-all`.
- Do not run `supabase db reset --linked`.
- Do not rename historical migration files during the beta release.
- Do not repair older hosted migration entries from object-name evidence alone.
- Do not include seed data in the beta apply.
- Do not deploy the production `mcp-search` function.
- Do not publish or retag `latest`.

## Why this is the safest beta path

The beta migration is additive:

- eight nullable columns;
- six validated check constraints;
- two partial indexes;
- one new logging function;
- no backfill;
- no destructive statement;
- no replacement of the existing search logger.

It already passed a disposable PostgreSQL 17 apply and RPC smoke. Applying the exact file in one transaction avoids replaying unrelated historical migrations and avoids guessing about the incomplete hosted ledger.

Supabase documents that `db push` applies local migrations not recorded remotely, and that `migration repair` changes the tracking table without applying SQL. This plan uses those facts narrowly: exact SQL first, verification second, then a repair for only the exact version that was applied. See [Database migrations](https://supabase.com/docs/guides/deployment/database-migrations) and the [CLI reference](https://supabase.com/docs/reference/cli/supabase-db-push).

## Long-term migration cleanup

The beta exception does not close the older migration debt. That work remains separate:

1. Freeze the committed form of every historical migration and separate the uncommitted taxonomy additions into a new migration.
2. Assign unique 14-digit versions to every historical file using a reviewed chronology map.
3. Verify the seven data, storage, and privilege changes with aggregate-only hosted queries.
4. Rebuild a fresh local database from the proposed history.
5. Compare the rebuilt schema against the hosted schema and explain every difference.
6. Choose between per-file hosted history repair and a fresh baseline only after the rebuild passes.
7. Test the chosen history repair against a disposable copy before touching the hosted ledger.

A fresh schema squash is not the default choice because Supabase states that squashing omits data changes, storage buckets, and other data manipulation. This repository contains those changes, so a squash would require a separate reviewed data-bootstrap plan.

## Gate B approval boundary

The next approval request must name:

- the exact database migration file and version;
- the isolated Edge Function name;
- the npm prerelease version and beta tag;
- the beta cohort and duration;
- the adoption message or README change;
- the migration-history repair for version `20260712`;
- the rollback target and stop conditions;
- every hosted Supabase and npm mutation.

No item in this document authorizes external execution by itself.
