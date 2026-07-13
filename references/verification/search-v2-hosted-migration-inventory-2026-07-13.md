# Search v2 hosted migration inventory

Date: 2026-07-13
Status: read-only inventory complete; no hosted change made

## Evidence source

The linked project's `public` schema was dumped without table data.

- Local evidence file: `.tmp/supabase-remote-public-schema-20260713.sql`
- Size: 111,022 bytes
- SHA-256: `1ee0df0e1293d9d52d60889483a4d17abfac205a7ca71e37b85232b9fec5641a`
- Hosted migration ledger entries reported by the CLI: 1
- Hosted ledger version: `20260314102246`
- Local migration files: 34

The dump contains schema definitions only. It does not prove seed rows, storage bucket rows, historical execution order, or the exact body of a function that was later replaced.

## Local migration version problem

Seven local version prefixes are reused:

- `20260324`: 4 files
- `20260406`: 2 files
- `20260414`: 3 files
- `20260416`: 3 files
- `20260417`: 2 files
- `20260418`: 4 files
- `20260501`: 3 files

The Supabase CLI compares the timestamp before the first underscore. These repeated prefixes prevent a clean local rebuild and cannot represent separate applied rows in the hosted migration ledger.

## Hosted schema classification

### Matching object names

The hosted dump contains the tables, columns, functions, and indexes named by these 25 files. Name presence is strong evidence that related changes reached the hosted schema, but it is not proof that every statement or the current local file body was applied exactly.

- `20260324_si_products_purchases.sql`
- `20260324_si_profiles.sql`
- `20260324_si_subscriptions.sql`
- `20260326_si_purchases_source.sql`
- `20260406_simplified_claim_system.sql`
- `20260412_motion_lab_rate_limits.sql`
- `20260414_si_admin_audit_log.sql`
- `20260414_si_billing_notifications.sql`
- `20260416_icon_intelligence_foundation.sql`
- `20260416_icon_intelligence_overview_kit_downloads.sql`
- `20260417_icon_intelligence_search_attempts.sql`
- `20260417_icon_query_reviews.sql`
- `20260418_hosted_search_engine_feature_refresh.sql`
- `20260418_hosted_search_engine_rpcs.sql`
- `20260418_hosted_search_engine_schema.sql`
- `20260418_icon_intelligence_popularity_refresh.sql`
- `20260501_hosted_search_public_registry_metadata.sql`
- `20260501_hosted_search_registry_rpc.sql`
- `20260501_semantic_registry_source_of_truth.sql`
- `20260503_icon_catalog_public_payload.sql`
- `20260612_search_audit_geo_account_fields.sql`
- `20260704_mcp_usage_ledger.sql`
- `20260705_claimable_packs.sql`
- `20260706_x402_single_icon_payments.sql`
- `20260706112000_x402_rate_limit_rpc.sql`

The hosted schema also confirms these deeper changes:

- user-owned foreign keys use `ON DELETE CASCADE`;
- `icon_registry_public_export` has `security_invoker=true`;
- the public data objects and sequences have hosted grants, although some hosted grants are broader than the local explicit-grants migration;
- `search_request_audit` and `mcp_usage_events` exist, which are the two required tables for the beta measurement migration.

### Not provable from this schema dump

These seven files change rows, storage state, or privileges in ways that a `public` schema-only dump cannot fully prove:

- `20260324_stripe_price_ids.sql`
- `20260403_material_snapshot_bucket.sql`
- `20260406_pro_annual_launch_grants.sql`
- `20260414_user_deletion_cascade.sql`, execution history is unprovable even though the current cascade state is present
- `20260416_icon_taxonomy_seed_p0.sql`
- `20260502_icon_registry_public_export_security_invoker.sql`, execution history is unprovable even though the current view setting is present
- `20260602_public_data_api_explicit_grants.sql`, execution history is unprovable because hosted grants may have other sources

The taxonomy migration also has 100 uncommitted inserted lines in the current worktree. Its current contents must not be treated as the historical version that may have reached the hosted database.

### Clearly absent

The hosted dump contains none of the named objects from these two migrations:

- `20260701_semantic_search_v2_documents.sql`
- `20260712_search_v2_beta_measurement.sql`

For the beta migration specifically, the hosted dump confirms:

- `search_request_audit` exists;
- `mcp_usage_events` exists;
- `library_mode` is absent;
- `search_outcome` is absent;
- `confidence_label` is absent;
- `beta_cohort` is absent;
- `si_log_mcp_search_outcome` is absent;
- both beta cohort indexes are absent.

## Safety conclusion

Do not run `supabase db push --include-all`. It would treat nearly every historical local file as pending even though the hosted schema already contains most related objects.

Do not mark the historical files as applied from this evidence alone. A history repair changes only the ledger and requires stronger evidence for data-only changes, unique local versions, and the modified taxonomy migration.

The beta measurement migration has verified prerequisites, is absent from the hosted schema, and passed its disposable PostgreSQL smoke test. It can use a separate exact-file transactional apply after explicit Gate B approval. The paused semantic-documents migration must remain unapplied.

## External state

- No hosted SQL executed
- No hosted migration history repaired
- No Edge Function deployed
- No npm package published
- No beta traffic enabled
