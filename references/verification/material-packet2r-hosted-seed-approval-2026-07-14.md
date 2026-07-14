# Material Packet 2R hosted seed approval

Date: 2026-07-14

Status: Closed after a failed no-write attempt. Do not rerun Packet 2R.

## Execution result

The owner approved Packet 2R with fingerprint `a1d4e4e983f31e6542691c8ba5d9d1f2648bd74116ac97147ecd1faedda1e2ff`.

The runner preflight passed, then all 8,524 Storage upload attempts returned HTTP 400. The retained report recorded 8,524 requested, 0 successful, 0 resumed, and 8,524 failed. Its SHA-256 was `00bdba6670479e20a754ecb3e23858052dc016cb4c0b141f7c9d9062e9b7f40c`.

A post-failure read-only production preflight passed with the same state as before execution: 0 table rows and 91 existing Storage objects, split into 90 outline and 1 solid. Packet 2R therefore made no production change.

The seeder sent every supplied key as both `apikey` and `Authorization: Bearer`. Supabase does not accept its new non-JWT secret keys as bearer tokens. The key type was not retained, but the HTTP 400 failure under the old headers and the successful live read-only check under the corrected headers are consistent with a new secret key. Packet 2S corrects this header contract and adds a one-asset canary before the full seed. See `references/verification/material-packet2s-hosted-seed-approval-2026-07-14.md`.

## Why Packet 2R is required

The original approved Packet 2 attempt returned exit code 1 at its read-only preflight because the Material storage prefix was not empty. The runner stopped before the service-role prompt and created no hosted seed report.

A separate read-only production inventory found:

- Existing objects under `materialsymbolsoutlined/`: 91
- Required pinned path overlap: 91
- Required outline paths: 90
- Required solid paths: 1
- Other paths: 0

These are legitimate existing cache objects. Packet 2R preserves them and permits the seeder to upsert the complete fixed set. It still blocks if the table is not empty or if an existing object is outside the two pinned preset paths.

## Pinned packet

- Release fingerprint: `534b6bb9e1405a6a15096081f8245117f5f470cdf22044c57640d06afa393b5a`
- Runner revision: `9c9d254645ad99c7b62c0a8a82ed71a6dc8a17f1`
- Runner SHA-256: `e0a37fa4e194fe75e917658b3e351a2ca67975d032f3cf2cce459ea6cfabad0a`
- Seeder SHA-256: `a3dd8a252819930cd7ab1dfa014eea76907fff6b9a9d2ed51715214fced82b19`
- Pinned asset report SHA-256: `4e04f3894566fc0b8f9011f38847f27cb40d48d738415ea9c6df41f1d58e9e92`
- Report verifier SHA-256: `1e8f7fe040c721e5691fb501ccd4f1529628a0737041a5a6b58b70da90059d24`
- Seed preflight SHA-256: `2f0e40e64baa64046a96c8b6df457b9a421e350de7a95b22016daff71b718ff0`
- Seed postflight SHA-256: `4a20a37ab27537ba710e8d323785ab287310bfc4ed3d36d7f916856df40a8453`
- Supabase project: `kcjmkakdhsqplvasgkjv`
- Approval fingerprint: `a1d4e4e983f31e6542691c8ba5d9d1f2648bd74116ac97147ecd1faedda1e2ff`

The approval fingerprint is SHA-256 over this exact UTF-8 text with LF line endings, including one trailing LF after the final line:

```text
packet=material_hosted_seed_preserve_existing
release_fingerprint=534b6bb9e1405a6a15096081f8245117f5f470cdf22044c57640d06afa393b5a
runner_revision=9c9d254645ad99c7b62c0a8a82ed71a6dc8a17f1
runner_sha256=e0a37fa4e194fe75e917658b3e351a2ca67975d032f3cf2cce459ea6cfabad0a
seeder_sha256=a3dd8a252819930cd7ab1dfa014eea76907fff6b9a9d2ed51715214fced82b19
asset_report_sha256=4e04f3894566fc0b8f9011f38847f27cb40d48d738415ea9c6df41f1d58e9e92
report_verifier_sha256=1e8f7fe040c721e5691fb501ccd4f1529628a0737041a5a6b58b70da90059d24
preflight_sha256=2f0e40e64baa64046a96c8b6df457b9a421e350de7a95b22016daff71b718ff0
postflight_sha256=4a20a37ab27537ba710e8d323785ab287310bfc4ed3d36d7f916856df40a8453
project_ref=kcjmkakdhsqplvasgkjv
expected_assets=8524
destination_table_required_empty=true
existing_storage_objects=91
existing_storage_required_path_overlap=91
existing_storage_other_paths=0
hosted_deletion_authorized=false
```

## Authorized mutation

Run one no-resume hosted seed for 4,262 Material IDs in outline and solid presets. The seed may upload and upsert all 8,524 required private storage paths, including the 91 verified paths that already exist, and upsert exactly 8,524 matching rows into the empty `material_icon_assets` table.

No hosted deletion is authorized. No database migration, function deploy, Railway deploy, npm publication, or beta endpoint change is authorized.

## Guarded sequence

1. Verify every pinned file hash.
2. Prompt for the database password without retaining it.
3. Require both Material migration versions, a private empty table, and a private bucket.
4. Require every existing Material-prefix object to match a catalog ID and one of the two fixed preset paths.
5. Prompt for the service-role key without retaining it.
6. Run the fixed seeder with `--all --hosted --no-resume`.
7. Compare every hosted report asset to the pinned 8,524-asset validation report.
8. Verify exactly 8,524 table rows, 4,262 rows per variant, 4,262 distinct IDs, exact preset axes, exact pinned revision, and 8,524 required table-to-storage matches.
9. Preserve any unrelated cached variants and remove both secrets from the runner process.

The service-role key must be pasted only into the hidden interactive prompt. It must not be sent in chat or written to a repository file.

## Failure handling

If preflight fails, no Packet 2R write runs. If any upload, table upsert, report comparison, or postflight check fails after writing begins, stop and retain the partial state for inspection. Do not rerun and do not delete anything without a new approval packet. The current production serving path does not use these assets before the later serving deploy.

## Approved command after owner authorization

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/apply-material-hosted-seed.ps1 -ExecuteApprovedMaterialHostedSeed
```

## Approval sentence

> Approve Material production Packet 2R for fingerprint `a1d4e4e983f31e6542691c8ba5d9d1f2648bd74116ac97147ecd1faedda1e2ff`: preserve the 91 verified existing fixed-path objects, run the guarded no-resume seed only if the table is empty and every existing Material-prefix object is one of the two pinned preset paths, upsert all 8,524 pinned assets, retain and verify the hosted report, and require 8,524 table rows plus 8,524 required storage matches. No migration, deletion, function deploy, Railway deploy, npm publication, beta change, or rerun after partial failure is authorized.
