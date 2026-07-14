# Material Symbols production release packets

Date: 2026-07-14

Status: Packet 1R completed successfully. Packet 1 is closed and must not be rerun. Packet 2 is ready for its separate approval.

Execution update, 2026-07-14: the production project applies default table privileges to `anon` or `authenticated`. The original migration revoked `PUBLIC` but did not remove those direct role privileges. Its transaction created an empty, RLS-enabled table and additive audit columns. The fixed postflight then stopped before migration-history repair. No seed or serving deploy ran. See `references/verification/material-packet1-partial-apply-recovery-2026-07-14.md`.

Packet 1R recovery fingerprint: `71f9c2be7843ec48475479f4529ff73aaf0a8ba47ef359d6c3e00c7c592b4d29`. Its guarded runner returned exit code 0 after the recovery preflight, private-role revocation, full hosted postflight, exact two-version history repair, and final linked migration list. Packet 2 remains blocked only on its own approval and preconditions.

## Pinned release

- Implementation revision: `425d8c2873e244988ed93ade18396e0f5c688f5e`
- Approval fingerprint: `534b6bb9e1405a6a15096081f8245117f5f470cdf22044c57640d06afa393b5a`
- Migration SHA-256: `497f6b838e8e3b01e8a3bbeb8d2e57327512c16784d3ad37c2824b6c99699d08`
- Full asset report SHA-256: `4e04f3894566fc0b8f9011f38847f27cb40d48d738415ea9c6df41f1d58e9e92`
- Material upstream revision: `30f8fddd293b1f0189896dc4aaecdfaba1d37ae0`
- npm package: `@supericons/mcp@0.4.18`
- Supabase project: `kcjmkakdhsqplvasgkjv`

The approval fingerprint is SHA-256 over this exact UTF-8 text with LF line endings:

```text
revision=425d8c2873e244988ed93ade18396e0f5c688f5e
migration_sha256=497f6b838e8e3b01e8a3bbeb8d2e57327512c16784d3ad37c2824b6c99699d08
asset_report_sha256=4e04f3894566fc0b8f9011f38847f27cb40d48d738415ea9c6df41f1d58e9e92
upstream_revision=30f8fddd293b1f0189896dc4aaecdfaba1d37ae0
package_version=0.4.18
```

## Release-order decision

The temporary Batch 0 Material exclusion is not deployed as a separate release. It was useful as an implementation checkpoint, but full Material serving is now complete and locally verified. A separate interim deploy would add risk and another production change without reducing the remaining time to full support. Production therefore starts with the additive migration and complete seed, followed by the final serving deploy.

## Verified local prerequisites

- The full 8,524-asset from-scratch validation passed with zero exceptions.
- The migration, hosted preflight, hosted postflight, and rollback passed in disposable PostgreSQL.
- The production probe runner passed 92 production-shaped search checks and five tools through the actual hosted MCP HTTP server against a controlled local service.
- A clean `0.4.18` tarball install returned valid outline and solid Material SVGs.
- Package routing is pinned to stable `mcp-search`, not the paused Search v2 beta endpoint.
- The full verification record is `references/verification/material-symbols-mcp-support-verification-2026-07-14.md`.

## Access prerequisites

Supabase CLI authentication and project linking were sufficient for Packet 1R. The database password was entered only in the guarded interactive process and was removed from that process after completion.

Railway and npm access were not used or rechecked during Packet 1R. Their related packets must verify access immediately before execution.

No credential value belongs in this file or in committed shell history.

## Packet 1: production migration

Execution status: the original SQL stopped at postflight, then the approved Packet 1R recovery passed. Both exact migration-history versions are applied. This packet is closed and must not be rerun.

### Authorized mutation

Apply only `supabase/migrations/20260714220000_material_icon_assets.sql`, run its fixed preflight and postflight, then mark only migration version `20260714220000` as applied. Do not run `supabase db push`. Do not repair any older migration version.

### Preconditions

1. Check out revision `425d8c2873e244988ed93ade18396e0f5c688f5e` with a clean worktree.
2. Run `supabase login`.
3. Run `supabase link --project-ref kcjmkakdhsqplvasgkjv`.
4. Run `npm run verify:material-hosted-migration-runner`.
5. Confirm the migration hash printed by the verifier matches this packet.

### Approved command

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/apply-material-assets-hosted.ps1 -ExecuteApprovedMaterialAssetMigration
```

### Stop conditions

- The preflight reports any Material table or `error_code` column already present.
- The migration hash differs.
- The single transaction fails.
- The postflight finds public read access, missing constraints, missing indexes, or a non-empty new table.
- Migration-history repair reports an error. If SQL and postflight passed, do not rerun the SQL by assumption.

### Approval sentence

> Approve Material production Packet 1 for fingerprint `534b6bb9e1405a6a15096081f8245117f5f470cdf22044c57640d06afa393b5a`: apply only migration `20260714220000` with the guarded runner and repair only that exact migration-history version. No seed, function deploy, Railway deploy, npm publish, or normal database push is authorized.

## Packet 2: hosted asset seed

Execution status: ready for separate approval. The hardened packet fingerprint is `09a42dbf198729a5f0ca775273d4db8ce423caec46fa0ab6257ea6b6df6039e5`. See `references/verification/material-packet2-hosted-seed-approval-2026-07-14.md`.

### Authorized mutation

Upload and upsert exactly 4,262 Material IDs in outline and solid presets, for 8,524 table rows and corresponding private bucket objects.

### Preconditions

1. Packet 1 postflight passed.
2. `SUPABASE_URL` points to the pinned project.
3. `SUPERICONS_SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_SERVICE_ROLE_KEY` is present only in the process environment.
4. `npm run verify:material-seeder` passes.
5. The retained full asset report still has the pinned SHA-256 from this packet.

### Approved command

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/apply-material-hosted-seed.ps1 -ExecuteApprovedMaterialHostedSeed
```

### Required result

- `requested_assets`: 8,524
- `successful_assets`: 8,524
- `failed_assets`: 0
- `resumed_assets`: 0
- `source_revision`: `30f8fddd293b1f0189896dc4aaecdfaba1d37ae0`
- Hosted table count: 8,524
- Hosted outline count: 4,262
- Hosted solid count: 4,262
- Private bucket objects for the two fixed preset paths: 8,524

### Stop conditions

- Any failed asset or checksum mismatch.
- Any count differs from the required result.
- Any row uses another upstream revision.
- The exception rate is above zero for this pinned release.

### Approval sentence

> Approve Material production Packet 2 for fingerprint `09a42dbf198729a5f0ca775273d4db8ce423caec46fa0ab6257ea6b6df6039e5`: run the guarded from-scratch hosted seed only if the Material table and storage prefix are empty, write exactly 8,524 pinned assets, retain and verify the hosted report, and require exact table, variant, and private storage counts. No migration, deletion, function deploy, Railway deploy, npm publication, beta change, or rerun after partial failure is authorized.

## Packet 3: fresh production latency baseline

### Authorized activity

Run fixed search and grouped recommendation measurements against the current stable `mcp-search` before its deploy. These requests create only normal search audit rows.

### Commands

```powershell
$env:SUPERICONS_SEARCH_V2_MEASUREMENT_ENDPOINT='mcp-search'
node scripts/run-search-v2-latency-measurement.mjs --mode search --variant control --output tmp/material-baseline-search.json --manifest-hash 534b6bb9e1405a6a15096081f8245117f5f470cdf22044c57640d06afa393b5a
node scripts/run-search-v2-latency-measurement.mjs --mode recommendation --variant control --recommendation-path grouped --output tmp/material-baseline-recommendation.json --manifest-hash 534b6bb9e1405a6a15096081f8245117f5f470cdf22044c57640d06afa393b5a
```

Retain both output files. Any request error blocks the search deploy.

### Approval sentence

> Approve Material production Packet 3 for fingerprint `534b6bb9e1405a6a15096081f8245117f5f470cdf22044c57640d06afa393b5a`: run the fixed direct-search and grouped-recommendation baseline requests against stable `mcp-search`. No deploy, seed, migration, publication, or unrelated measurement is authorized.

## Packet 4: Material snapshot function deploy

### Authorized mutation

Deploy revision `425d8c2873e244988ed93ade18396e0f5c688f5e` to `serve-material-snapshot` with public gateway JWT verification disabled as checked into `supabase/config.toml`.

### Command

```powershell
supabase functions deploy serve-material-snapshot --project-ref kcjmkakdhsqplvasgkjv --no-verify-jwt
```

After deployment, request `material:settings` through the function in both fixed presets and require valid SVG. Do not publish npm until both pass.

### Rollback

Redeploy the previous function version. The seeded private assets remain safe and unused by the previous function.

### Approval sentence

> Approve Material production Packet 4 for fingerprint `534b6bb9e1405a6a15096081f8245117f5f470cdf22044c57640d06afa393b5a`: deploy only `serve-material-snapshot` from revision `425d8c2873e244988ed93ade18396e0f5c688f5e` and run its two fixed-preset probes. No search deploy, Railway deploy, npm publish, migration, or seed is authorized.

## Packet 5: stable hosted search deploy

### Authorized mutation

Deploy revision `425d8c2873e244988ed93ade18396e0f5c688f5e` to stable `mcp-search`. Do not deploy or change any Search v2 beta endpoint.

### Command

```powershell
supabase functions deploy mcp-search --project-ref kcjmkakdhsqplvasgkjv --no-verify-jwt
```

### Required live verification

```powershell
npm run verify:material-production-release -- --revision 425d8c2873e244988ed93ade18396e0f5c688f5e --output tmp/material-search-production.json --search-url https://kcjmkakdhsqplvasgkjv.supabase.co/functions/v1/mcp-search
```

Then repeat Packet 3 with `--variant treatment` and new output paths. Direct search must remain at or under 2,000 ms warm p95 and within 100 ms of baseline. Grouped recommendation must remain within 100 ms p95 of its own baseline. Its pre-existing absolute latency does not block this Material release.

### Stop and rollback conditions

- Any of the 92 search gates fails.
- A Material result lacks SVG or reports the wrong style.
- `settings` or `cog` all-mode results are shortened.
- A Material asset gap is classified as a content zero.
- A latency budget fails.

Rollback by restoring the previous known-good Supabase function version recorded immediately before Packet 5, then rerun the all-mode and strict Material probes. The additive table and assets can remain.

### Approval sentence

> Approve Material production Packet 5 for fingerprint `534b6bb9e1405a6a15096081f8245117f5f470cdf22044c57640d06afa393b5a`: deploy only stable `mcp-search` from revision `425d8c2873e244988ed93ade18396e0f5c688f5e`, run the 92 search gates, and run the fixed post-deploy latency comparison. No beta endpoint, Railway service, npm package, migration, or seed may change.

## Packet 6: Railway hosted MCP deploy

### Authorized mutation

Deploy the `mcp` directory from revision `425d8c2873e244988ed93ade18396e0f5c688f5e` to the existing Supericons hosted MCP Railway service.

### Preconditions

1. Packet 5 is green.
2. Run `railway login`.
3. Link the existing project and service with `railway link`. Do not create a new service.
4. Confirm the service root is `mcp`, the start command is `npm run start:remote`, and the platform supplies `PORT`.

### Deploy command

Run from the `mcp` directory after the existing service is linked:

```powershell
railway up --detach
```

### Required live verification

Run the production release verifier again with both `--search-url` and the deployed Railway `/mcp` URL in `--mcp-url`. It must pass `list_libraries`, outline and solid `search_icons`, exact `get_icon`, `recommend_icons`, and `preview_icons`.

Rollback to the previous Railway deployment if health, protocol, tool, count, style, or SVG checks fail.

### Approval sentence

> Approve Material production Packet 6 for fingerprint `534b6bb9e1405a6a15096081f8245117f5f470cdf22044c57640d06afa393b5a`: deploy only the existing Railway hosted MCP service from the pinned revision and run the five-tool live gate. No new Railway service, npm publish, Supabase change, migration, or seed is authorized.

## Packet 7: npm stable publication

### Authorized mutation

Publish `@supericons/mcp@0.4.18` once under npm tag `latest`.

### Preconditions

1. Packets 4, 5, and 6 are green.
2. Run `npm login`.
3. Confirm `npm view @supericons/mcp@0.4.18 version` returns not found before publication.
4. Run `npm run verify:material-mcp-package`.
5. Run `npm run verify:material-mcp-clean-install`.
6. Run the package's normal prepublish checks.

### Publish command

```powershell
npm --prefix mcp publish --access public --tag latest
```

### Postflight

```powershell
npm view @supericons/mcp version dist-tags --json
```

Require both `version` and `dist-tags.latest` to equal `0.4.18`. Install from npm into a clean temporary directory and repeat the outline and solid `material:settings` checks.

npm publication is not rolled back by deleting the version. If postflight fails, deprecate the bad version and publish a new patch only under a separately approved packet.

### Approval sentence

> Approve Material production Packet 7 for fingerprint `534b6bb9e1405a6a15096081f8245117f5f470cdf22044c57640d06afa393b5a`: publish only `@supericons/mcp@0.4.18` under `latest`, verify the public registry result, and run a clean registry install. No other package, tag, deploy, migration, seed, or external mutation is authorized.

## Completion and monitoring

Material support is complete only after all seven packets pass in order and retained production evidence is committed. Monitor for one week:

- Material asset errors remain zero.
- Strict Material searches return valid SVG in both styles.
- All-mode result sets do not shrink because of Material.
- Direct search stays inside its latency contract.
- Recommendation shows no Material-specific p95 regression.
- Advertised Material counts remain 4,262 IDs, 4,262 outline, and 4,262 solid.

Search Engine v2 remains paused. Its old beta approval package is invalid because this release changes the MCP package version, stable serving behavior, baseline, and verification fingerprint.
