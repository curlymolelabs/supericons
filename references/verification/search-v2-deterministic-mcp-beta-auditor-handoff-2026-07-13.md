# Search v2 deterministic MCP beta audit handoff

Date: 2026-07-13
Status: database stage complete; isolated function deployment, live Gate C smoke, and npm prerelease publication remain pending

## Executive result

The deterministic Search Engine v2 beta reached the hosted database safely, but the beta is not live yet.

Completed:

- read-only hosted migration inventory;
- rollback-first reconciliation plan;
- guarded exact-file migration runner;
- disposable PostgreSQL 17 verification;
- hosted beta measurement migration;
- hosted postflight with test rows rolled back;
- migration history repair for version `20260712` only;
- local MCP prerelease verification and npm dry-run;
- owner reauthentication for Supabase and npm.

Not completed:

- deployment of `mcp-search-v2-beta`;
- live search, recommendation, clarification, localized-query, and invalid-request smoke tests;
- live audit-row inspection and live p95 measurement;
- publication of `@supericons/mcp@0.4.18-beta.0`;
- beta adoption or measurement window.

## Approved release boundary

The approved Gate B scope is limited to:

- database migration `20260712_search_v2_beta_measurement.sql`;
- hosted migration history repair for version `20260712` after successful SQL verification;
- isolated Supabase function `mcp-search-v2-beta`;
- npm prerelease `@supericons/mcp@0.4.18-beta.0` under the `beta` tag;
- cohort `deterministic-v2-beta`;
- 7 complete days, extending to 14 days only if the minimum sample is not reached;
- production endpoint `mcp-search` and npm `latest` left unchanged.

Excluded:

- normal `supabase db push`;
- historical migration repair;
- semantic-documents migration `20260701`;
- model-provider calls;
- Netlify deployment;
- production search endpoint replacement;
- npm `latest` movement.

## Commits in scope

| commit | purpose |
| --- | --- |
| `13a0c0614` | Prepared the deterministic MCP beta candidate. |
| `d7e970b85` | Verified the target migration on disposable PostgreSQL 17. |
| `580b5198e` | Recorded the hosted migration inventory and safe reconciliation plan. |
| `7d1af1caa` | Added the guarded hosted migration runner and exact SQL checks. |
| `75003c712` | Fixed the PowerShell connection URL bug and added regression protection. |
| `1779ef9ae` | Recorded the successful hosted database stage and authentication blockers. |

## Hosted migration inventory

Before execution, the hosted ledger reported one older migration while the local folder contained 34 migration files. Most related schema objects already existed remotely, and seven timestamp prefixes were reused locally.

Verified classification from the schema-only dump:

- 25 migrations had matching hosted object names;
- 7 migrations were not fully provable from a `public` schema-only dump;
- `20260701_semantic_search_v2_documents.sql` was absent;
- `20260712_search_v2_beta_measurement.sql` was absent.

The current worktree also contains uncommitted additions to the historical taxonomy seed migration. For these reasons, normal `db push`, historical renaming, and broad migration-history repair remain prohibited.

Controlling inventory: `references/verification/search-v2-hosted-migration-inventory-2026-07-13.md`.

## Migration design

The beta measurement migration is additive:

- 8 nullable columns across `search_request_audit` and `mcp_usage_events`;
- 6 validated check constraints;
- 2 partial cohort indexes;
- 1 new logging function;
- no backfill;
- no destructive statement;
- no replacement of the existing logger.

The rollback order is traffic first, function and indexes second, and nullable columns retained until compatibility and evidence-retention requirements permit later removal.

## Guarded runner

`scripts/apply-search-v2-beta-hosted.ps1` provides these protections:

- explicit `-ExecuteApprovedGateB` switch;
- exact migration SHA-256 check;
- hidden password prompt;
- password passed through temporary environment variables only;
- read-only target-object preflight;
- PostgreSQL single-transaction migration apply;
- postflight schema and RPC checks;
- valid test write rolled back;
- 4 invalid-input checks;
- history repair only after postflight success;
- password variables removed in a `finally` block;
- second run fails closed if target objects already exist.

The exact preflight and postflight SQL are independently exercised by `npm run verify:search-v2-beta-migration-smoke` against disposable PostgreSQL 17.

## First runner failure and correction

The first hosted runner attempt stopped before database authentication with:

```text
psql: error: invalid connection option ""
```

Root cause: PowerShell interpreted `$poolerUrl?sslmode` as a larger variable name, removing the base URL from the connection string.

Correction in `75003c712`:

```powershell
"${poolerUrl}?sslmode=require&application_name=supericons_gate_b"
```

Regression protection was added to the Gate A verifier, and direct URL assembly, Gate A, and the disposable migration smoke passed afterward. No hosted connection or SQL occurred during the failed attempt.

## Successful hosted database execution

The second guarded execution produced this ordered result:

1. `hosted_beta_preflight_ok`
2. 2 table alterations
3. constraint creation and validation
4. 2 index creations
5. function creation, comment, revoke, and grant
6. `hosted_beta_postflight_ok`
7. valid audit write inside a transaction
8. 4 invalid inputs rejected
9. test transaction rolled back
10. migration version `20260712` recorded as applied
11. final migration list showed local and remote `20260712`

The older hosted ledger entry and unmatched historical local migrations were not changed.

## Verification matrix

| area | command or evidence | result |
| --- | --- | --- |
| Gate A contract | `npm run verify:search-v2-beta-gate-a` | Passed |
| Database smoke | `npm run verify:search-v2-beta-migration-smoke` | Passed on disposable PostgreSQL 17 |
| Default search path | `npm run verify:search-v2-deterministic-mcp-default` | Passed, 0 external model-provider calls across 7 packaged and 13 hosted files |
| Evaluation suite | `npm run verify:semantic-search-v2` | Passed, 225 stable cases and 75,810 generated documents |
| Public safety | `npm run verify:public-safety` from `mcp` | Passed across 38 packed files |
| Package verification | `npm run verify:package` from `mcp` | Passed across 38 files and 2,396,680 unpacked bytes |
| Package dry-run | `npm pack --dry-run --json` from `mcp` | Passed, 38 entries and 350,950 packed bytes |
| Hosted database apply | guarded runner terminal evidence | Passed |
| Hosted postflight | guarded runner terminal evidence | Passed, test row rolled back |
| Migration ledger | final `supabase migration list --linked` | Version `20260712` present locally and remotely |
| Supabase authentication | `supabase projects list` after owner login | Passed |
| npm authentication | `npm whoami` after owner login | Passed |
| Hosted beta function state | `supabase functions list` | `mcp-search-v2-beta` absent; production `mcp-search` remains listed |
| npm registry state | `npm view @supericons/mcp dist-tags --json` | `latest` is `0.4.17` |
| npm beta version state | `npm view @supericons/mcp@0.4.18-beta.0 version --json` | Not found, confirming prerelease is not published |

## Authentication interruption

The first isolated function deployment attempt stopped with `401 Unauthorized` before a success receipt. `npm whoami` also returned `401 Unauthorized` before owner reauthentication.

The owner then authenticated directly through the Supabase and npm login flows. Authentication and account details are omitted from this report.

Fresh read-only checks after reauthentication confirmed:

- Supabase project access works;
- the isolated beta function is still absent;
- npm account access works;
- npm `latest` remains `0.4.17`;
- `0.4.18-beta.0` remains unpublished.

## Current external state

| surface | current state |
| --- | --- |
| Beta measurement schema | Deployed |
| Hosted migration version `20260712` | Recorded as applied |
| Isolated function `mcp-search-v2-beta` | Not deployed |
| Production function `mcp-search` | Listed and not replaced by this work |
| npm `0.4.18-beta.0` | Not published |
| npm `latest` | `0.4.17` |
| Beta traffic | Not started |
| Netlify | Not touched |
| Model providers | Not called |

## Residual risks

1. Historical migration debt remains and still blocks normal `db push`.
2. The isolated function has not received live runtime verification.
3. Live audit fields and cohort separation have not been checked through real endpoint traffic.
4. Hosted p95 latency has not been measured.
5. The prerelease has not been installed from npm in a clean environment.
6. Beta adoption may not reach 200 eligible attempts across 20 sessions within 7 days.

## Next release actions after audit approval

1. Deploy only `mcp-search-v2-beta` with JWT verification disabled as recorded in `supabase/config.toml`.
2. Confirm the production `mcp-search` function version did not change.
3. Run one live search, one recommendation, one clarification, one localized query, and one invalid request.
4. Confirm live audit rows carry `library_mode`, `search_outcome`, `confidence_label`, `beta_cohort`, and locale presence.
5. Record live p95 against the 2,000 ms ceiling.
6. Publish only `@supericons/mcp@0.4.18-beta.0` under the `beta` tag.
7. Confirm npm `latest` remains `0.4.17`.
8. Install the prerelease in a clean temporary directory and repeat the live smoke.
9. Prepare plain-language invitation copy for owner review and manual sharing.
10. Start the 7-day beta clock only after the first verified eligible request.

## Independent audit checklist

The auditor should:

1. Inspect commits `580b5198e`, `7d1af1caa`, `75003c712`, and `1779ef9ae`.
2. Confirm the migration hash in the guarded runner matches the checked migration file.
3. Re-run Gate A and the disposable PostgreSQL migration smoke.
4. Review the preflight and postflight SQL for mutation boundaries and rollback behavior.
5. Confirm the first runner failure occurred before a hosted connection.
6. Confirm only migration version `20260712` was repaired.
7. Confirm the isolated beta function is absent and production `mcp-search` remains listed.
8. Confirm npm `latest` is `0.4.17` and `0.4.18-beta.0` is absent.
9. Confirm no provider credential or external model call exists on the default or beta search path.
10. Give a go or no-go recommendation for the remaining isolated function deployment, Gate C smoke, and beta-tag publication.
