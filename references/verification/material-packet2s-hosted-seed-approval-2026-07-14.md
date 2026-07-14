# Material Packet 2S hosted seed recovery approval

Date: 2026-07-14

Status: Completed successfully. Packet 2S is closed and must not be rerun.

## Execution result

The owner authorized the auditor-approved Packet 2S fingerprint `07bd55ac6e294ea9fa7d9dad78f36d16677d2b763fe784285401be5dc8937f4c`.

The guarded runner returned exit code 0. The canary report matched the pinned `material:settings` outline asset, checksum, and upstream revision. The full hosted report then matched all 8,524 pinned assets exactly.

- Canary report SHA-256: `f44ad160cad193c6cf6803c8f55e3a1aa1f6287eb441c3220d12390e20cde5fb`
- Full hosted report SHA-256: `44c86cf6b87babf9a7d9382b61ba19f575067614fa87cb3c8925f8ccf0782da0`
- Requested assets: 8,524
- Successful assets: 8,524
- Resumed assets: 0
- Failed assets: 0
- Source revision: `30f8fddd293b1f0189896dc4aaecdfaba1d37ae0`

The production SQL postflight passed with exactly 8,524 table rows, 4,262 outline rows, 4,262 solid rows, 8,524 required Storage objects, and 8,524 total objects under the fixed Material prefix.

## Why Packet 2S is required

Packet 2R passed its read-only preflight but every Storage upload returned HTTP 400. The retained report recorded:

- Requested assets: 8,524
- Successful assets: 0
- Resumed assets: 0
- Failed assets: 8,524
- Unique failure: `Storage upload failed (400)`
- Report SHA-256: `00bdba6670479e20a754ecb3e23858052dc016cb4c0b141f7c9d9062e9b7f40c`

A post-failure read-only production preflight proved that the table remained empty and the private Storage prefix remained at the original 91 objects. Packet 2R made no production change.

The seeder always copied its supplied key into both the `apikey` and bearer authorization headers. Supabase requires new secret keys in the `apikey` header and does not accept them as bearer JWTs. The supplied key type was not retained, but the HTTP 400 failure under the old headers and successful live read-only access under the corrected headers are consistent with a new secret key. The corrected check passed against both the private table and Storage listing with the same supplied credential.

## Recovery changes

Packet 2S makes these narrow changes:

1. New `sb_secret_` keys use only the `apikey` header.
2. Legacy `service_role` JWTs continue to use both `apikey` and bearer authorization.
3. Publishable, anonymous, malformed, and empty credentials are rejected before seeding.
4. Private table and Storage access are checked before any asset fetch or write.
5. Storage uploads use the bucket's exact allowed MIME type, `image/svg+xml`.
6. Safe Storage and table response codes are retained in failure reports.
7. One pinned `material:settings` outline asset is written and its report is compared with the full validation report before the 8,524-asset seed starts.

The canary limits another upload-contract failure to one attempted asset. If it passes, the full seed runs from scratch and upserts the canary again as part of the complete fixed set.

## Pinned packet

- Release fingerprint: `534b6bb9e1405a6a15096081f8245117f5f470cdf22044c57640d06afa393b5a`
- Runner revision: `b9e69fa47c5f39146a01a46572f5b76e514d54db`
- Runner SHA-256: `c8fefdb0d7e1e85df3d4b98dcc446d90ed766fc4dda44b46b2640444df1f0791`
- Seeder SHA-256: `915d8f9f6562fae556493cabc4c1f0d0e4e82ea087c0cd9e7fe0bdd0d0dc94fa`
- Pinned asset report SHA-256: `4e04f3894566fc0b8f9011f38847f27cb40d48d738415ea9c6df41f1d58e9e92`
- Full report verifier SHA-256: `1e8f7fe040c721e5691fb501ccd4f1529628a0737041a5a6b58b70da90059d24`
- Authentication contract verifier SHA-256: `7e91ffe0f9d97f3e73c4d846c4d566e3bffb2c276af017cc680ac1bd55ca00d4`
- Canary report verifier SHA-256: `55186111a5d704531fffe570c4d90e3d80bb8bd37412deea848de9f0dd99c76c`
- Seed preflight SHA-256: `2f0e40e64baa64046a96c8b6df457b9a421e350de7a95b22016daff71b718ff0`
- Seed postflight SHA-256: `4a20a37ab27537ba710e8d323785ab287310bfc4ed3d36d7f916856df40a8453`
- Supabase project: `kcjmkakdhsqplvasgkjv`
- Approval fingerprint: `07bd55ac6e294ea9fa7d9dad78f36d16677d2b763fe784285401be5dc8937f4c`

The approval fingerprint is SHA-256 over this exact UTF-8 text with LF line endings, including one trailing LF after the final line:

```text
packet=material_hosted_seed_secret_key_recovery
release_fingerprint=534b6bb9e1405a6a15096081f8245117f5f470cdf22044c57640d06afa393b5a
runner_revision=b9e69fa47c5f39146a01a46572f5b76e514d54db
runner_sha256=c8fefdb0d7e1e85df3d4b98dcc446d90ed766fc4dda44b46b2640444df1f0791
seeder_sha256=915d8f9f6562fae556493cabc4c1f0d0e4e82ea087c0cd9e7fe0bdd0d0dc94fa
asset_report_sha256=4e04f3894566fc0b8f9011f38847f27cb40d48d738415ea9c6df41f1d58e9e92
report_verifier_sha256=1e8f7fe040c721e5691fb501ccd4f1529628a0737041a5a6b58b70da90059d24
auth_contract_verifier_sha256=7e91ffe0f9d97f3e73c4d846c4d566e3bffb2c276af017cc680ac1bd55ca00d4
canary_report_verifier_sha256=55186111a5d704531fffe570c4d90e3d80bb8bd37412deea848de9f0dd99c76c
preflight_sha256=2f0e40e64baa64046a96c8b6df457b9a421e350de7a95b22016daff71b718ff0
postflight_sha256=4a20a37ab27537ba710e8d323785ab287310bfc4ed3d36d7f916856df40a8453
project_ref=kcjmkakdhsqplvasgkjv
expected_assets=8524
production_table_rows_before_retry=0
existing_storage_objects=91
canary_asset=material:settings:outline
hosted_deletion_authorized=false
```

## Authorized mutation

Run one guarded canary and, only after it passes, one no-resume hosted seed for 4,262 Material IDs in outline and solid presets. The canary may upsert the pinned `material:settings` outline asset and its row. The full seed may then upload and upsert all 8,524 required assets, including the canary and the 91 verified existing paths.

No hosted deletion is authorized. No database migration, function deploy, Railway deploy, npm publication, beta endpoint change, or unrelated mutation is authorized.

## Guarded sequence

1. Verify every pinned file hash and the local authentication contract.
2. Prompt for the database password without retaining it.
3. Require both Material migration versions, an empty private table, and the same 91 allowed existing Storage objects.
4. Prompt for the Supabase secret or legacy service-role key without retaining it.
5. Check private table and Storage list access with no write.
6. Upload and upsert only `material:settings` outline.
7. Require the canary report to match the pinned ID, variant, checksum, axes, source, and revision.
8. Run the complete fixed seeder with `--all --hosted --no-resume`.
9. Compare every hosted report asset with the pinned 8,524-asset validation report.
10. Verify exactly 8,524 table rows, 4,262 rows per variant, 4,262 distinct IDs, exact preset axes, exact pinned revision, and 8,524 required table-to-storage matches.
11. Remove both secrets from the runner process.

## Failure handling

If the initial preflight or access check fails, no Packet 2S write runs. If the canary fails, stop after that one attempted asset and retain its report. If the canary succeeds but the full seed or postflight fails, stop and retain the partial state. Do not rerun and do not delete anything without a new inspection and approval packet.

## Verified preparation

- The post-failure production preflight passed with 0 table rows and the original 91 Storage objects.
- The corrected live read-only credential check passed for private table and Storage access.
- `npm run verify:material-hosted-auth-contract` passed.
- `npm run verify:material-hosted-seed-runner` passed with the canary ordered before the full seed.
- `npm run verify:material-seeder` passed with 4 selected assets, zero exceptions, deterministic checksums, and no hosted mutation.
- `npm run verify:material-asset-migration` passed its migration, preflight, postflight, count, privacy, and rollback checks in disposable PostgreSQL.

## Approved command after owner authorization

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/apply-material-hosted-seed.ps1 -ExecuteApprovedMaterialHostedSeed
```

## Approval sentence

> Approve Material production Packet 2S for fingerprint `07bd55ac6e294ea9fa7d9dad78f36d16677d2b763fe784285401be5dc8937f4c`: use the corrected Supabase secret-key headers, preserve the 91 verified existing objects, write and verify the single pinned `material:settings` outline canary, then run the guarded no-resume seed for all 8,524 pinned assets only if the canary passes. Require 8,524 table rows and 8,524 required Storage matches. No migration, deletion, function deploy, Railway deploy, npm publication, beta change, or rerun after partial failure is authorized.
