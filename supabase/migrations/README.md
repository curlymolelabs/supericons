# Database migration access contract

For every migration after `20260714223000` that creates a table, add one access marker for each new table:

```sql
-- table-access: private public.example_private_table
```

or:

```sql
-- table-access: public public.example_public_table
```

A private table must also remove Supabase's direct default grants in the same migration:

```sql
revoke all on table public.example_private_table from anon, authenticated;
```

Revoking access from `PUBLIC` alone is not enough. Run `npm run verify:private-table-migrations` before applying a migration. The verifier rejects an unclassified new table and rejects a private table without the direct role revocation.
