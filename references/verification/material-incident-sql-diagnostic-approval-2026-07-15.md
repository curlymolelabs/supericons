# Material incident SQL diagnostic approval

Date: 2026-07-15

Status: Draft. Not approved or executed.

## Purpose

This packet collects low-load evidence about the production database conditions that accompanied the Material version 37 outage. It is diagnostic only. It does not change the database, deploy code, test concurrency, or retry the Material release.

The earlier Packet 3R recommendation baseline was invalidated because it measured a swallowed transport failure rather than successful recommendations. No replacement recommendation baseline is run by this packet. Baseline replacement remains a separate owner-gated action under the retained semantic contract.

## Environment facts and boundaries

- Supabase project: `kcjmkakdhsqplvasgkjv`
- Required stable function: `mcp-search` version 38 with `verify_jwt=false`
- Database plan: Free plan, observed by the owner in the Supabase dashboard on 2026-07-15
- The runner rechecks the function version and JWT setting before and after the SQL diagnostic.
- The SQL records PostgreSQL's configured and session settings, including the SQL-visible connection ceiling.
- Supavisor and platform pool settings may not be visible through PostgreSQL. The packet does not infer an unavailable pool limit from `max_connections`.

## Safety contract

The SQL has two independent read-only guards:

1. the connection starts with `default_transaction_read_only=on`; and
2. the file starts `begin transaction read only` and ends with `rollback`.

Every SQL statement is also limited to five seconds, with a one-second lock timeout and a 30-second idle transaction timeout. The script uses one plain `EXPLAIN` to inspect the rate-limit query plan. It does not use an executing plan, does not execute the candidate RPC, and does not calculate exact full-table counts.

The two Lucide health probes are ordinary stable searches, one before SQL and one after SQL. They are classified as `source=verify`, `channel=internal_test`, `environment=production`, and `client_family=material_incident_diagnostic`. They may create up to two normal internal-test audit rows. No other database write is authorized.

## Diagnostic statement inventory

| Section | Source | Evidence collected | Load property |
| --- | --- | --- | --- |
| Settings | `pg_settings`, `current_setting` | statement and lock timeouts, connection settings, configured reset values, source, restart state | catalog reads only |
| Connections | `pg_stat_activity` | counts grouped by database scope, backend type, and state | aggregate over the activity view, no session details |
| Table maintenance | `pg_stat_user_tables`, `pg_class` | estimated live and dead rows, changes since analyze, vacuum and analyze times, scan counters, relation sizes | statistics and relation metadata only |
| Planner statistics | `pg_stats` | selected `icon_catalog` column statistics | statistics view only |
| Indexes | `pg_index`, `pg_class` | index definitions, validity, readiness, uniqueness, and predicates for the three relevant tables | catalog reads only |
| Rate-limit plan | planner-only `EXPLAIN` | estimated plan for the exact IP-hash and one-minute count shape | query is planned but not run |
| Candidate functions | `pg_proc`, `pg_get_functiondef` | installed candidate-RPC signatures and definitions | catalog reads only |
| Historical statements | guarded `pg_stat_statements` | calls, total, mean, maximum time, rows, normalized query text, and statistics reset time for candidate and rate-limit statements | statistics view only, capped at 25 entries per category |

The estimated dead-row ratio and relation sizes are maintenance indicators, not a precise bloat measurement. The planner-only plan supplies estimates, not runtime cost. Missing `pg_stat_statements` entries do not prove that a statement never ran because availability, reset time, permissions, and retention affect the view.

## Private retained outputs

The runner refuses to overwrite any of these paths:

1. `tmp/material-incident-health-before-2026-07-15.json`
2. `tmp/material-incident-sql-diagnostic-2026-07-15.txt`
3. `tmp/material-incident-health-after-2026-07-15.json`

The raw SQL output remains private and local until reviewed. It may contain function definitions and normalized statement text. Any committed evidence must be reduced to public-safe findings without user query values, credentials, connection strings, or raw operational identifiers.

## Guarded sequence

1. Verify the pinned SQL hash and refuse existing evidence paths.
2. Require Docker, a linked Supabase pooler URL, and a readable Supabase function list.
3. Require active `mcp-search` version 38 and `verify_jwt=false`.
4. Run one Lucide strict `calendar` health probe and require HTTP 200 with only deliverable SVG results.
5. Prompt for the database password through a hidden prompt. Do not send the password in chat or write it to a file.
6. Run the pinned SQL through PostgreSQL read-only mode and retain its output even if a statement fails.
7. Remove the password and PostgreSQL guard variables from the process.
8. Recheck version 38 and run the second Lucide health probe.
9. Stop. Do not rerun after any partial failure without inspection and a fresh packet.

## Pinned files

Runner revision: `72ce52e6d2e884861658bfe57b358bfe70a98436`

Hash mode: LF-normalized UTF-8 without a byte-order mark.

| File | Normalized SHA-256 |
| --- | --- |
| `scripts/sql/material-incident-production-diagnostic.sql` | `1eae111b4d2f4e88bf3f4ff05becff1ad5858be77955586adead3e20543efb43` |
| `scripts/run-material-incident-production-diagnostic.ps1` | `11558db2a26529897269ab79787b8d2282a8062417fdf78876fd8f4dd1791c9e` |
| `scripts/verify-material-incident-diagnostic-packet.mjs` | `ef1cb99fa413ccdff4d70cb177e2c35df366fe6e5409b54186a127527bfaee81` |
| `package.json` | `674dad4a61cdc0b94bce5b4099ad0953aaa923cee81316ecb563839317e34caa` |

- Approval fingerprint: `10a135a874a8ac276b63d9d57c4295e1afc346e90a4809210d6d3cc90a1bcc8d`

## Fingerprint input

The approval fingerprint is SHA-256 over this exact UTF-8 text with LF line endings, including one trailing LF after the final line:

```text
packet=material_incident_read_only_sql_diagnostic
runner_revision=72ce52e6d2e884861658bfe57b358bfe70a98436
sql_normalized_sha256=1eae111b4d2f4e88bf3f4ff05becff1ad5858be77955586adead3e20543efb43
runner_normalized_sha256=11558db2a26529897269ab79787b8d2282a8062417fdf78876fd8f4dd1791c9e
verifier_normalized_sha256=ef1cb99fa413ccdff4d70cb177e2c35df366fe6e5409b54186a127527bfaee81
package_normalized_sha256=674dad4a61cdc0b94bce5b4099ad0953aaa923cee81316ecb563839317e34caa
hash_mode=lf_normalized_utf8
project_ref=kcjmkakdhsqplvasgkjv
function_name=mcp-search
function_version_required=38
verify_jwt_required=false
function_list_reads_authorized=2
health_probes_authorized=2
health_probe_query=calendar
health_probe_library=lucide
health_probe_audit_channel=internal_test
health_probe_audit_rows_authorized=2_max
sql_transaction_mode=read_only
sql_statement_timeout_ms=5000
sql_lock_timeout_ms=1000
planner_only_explain_count=1
explain_analyze_authorized=false
exact_full_table_counts_authorized=false
candidate_rpc_execution_authorized=false
load_test_authorized=false
diagnostic_sql_database_writes_authorized=false
deployments_authorized=0
migrations_authorized=0
storage_changes_authorized=0
railway_changes_authorized=0
npm_publications_authorized=0
beta_changes_authorized=0
output_overwrite_authorized=false
rerun_after_partial_failure_authorized=false
```

## Failure handling

Any file-hash mismatch, existing output, function-version drift, JWT-setting drift, failed health probe, credential failure, SQL timeout, SQL error, or failed post-SQL health probe stops the packet. Retain any completed evidence. Do not delete it and do not rerun without a new approval packet.

## Approved command after owner authorization

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/run-material-incident-production-diagnostic.ps1 -ExecuteApprovedMaterialIncidentSqlDiagnostic
```

## Approval sentence

> Approve Material incident SQL diagnostic for fingerprint `10a135a874a8ac276b63d9d57c4295e1afc346e90a4809210d6d3cc90a1bcc8d`: run exactly two version 38 Lucide health probes classified as internal testing and one five-second read-only SQL diagnostic with one planner-only plan. The probes may create up to two internal-test audit rows. No other database write, exact full-table count, candidate-RPC execution, load test, deploy, migration, storage change, Railway change, npm publication, beta change, output overwrite, or rerun after partial failure is authorized.
