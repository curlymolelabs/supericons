# Material Packet 2 hosted seed approval

Date: 2026-07-14

Status: Superseded. The approved attempt stopped at its empty-prefix preflight before the service-role prompt. No Packet 2 seed report was created. Use the Packet 2R approval package instead.

Production preflight result: the Material storage prefix contained 91 objects, so this packet correctly stopped. A follow-up read-only inventory confirmed that all 91 are required paths from the pinned asset set, with 90 outline paths, 1 solid path, and 0 other paths. The empty-prefix assumption was wrong because the private bucket predates the new asset table.

## Pinned packet

- Release fingerprint: `534b6bb9e1405a6a15096081f8245117f5f470cdf22044c57640d06afa393b5a`
- Runner revision: `d919078c160d18c3bba453a45af817859cd3b5b8`
- Runner SHA-256: `3d55e4c8486714fc0df69fed8f49afbd2090a1af8c207affce3a5cb75dd2060f`
- Seeder SHA-256: `a3dd8a252819930cd7ab1dfa014eea76907fff6b9a9d2ed51715214fced82b19`
- Pinned asset report SHA-256: `4e04f3894566fc0b8f9011f38847f27cb40d48d738415ea9c6df41f1d58e9e92`
- Report verifier SHA-256: `1e8f7fe040c721e5691fb501ccd4f1529628a0737041a5a6b58b70da90059d24`
- Seed preflight SHA-256: `897ffbfad2a4ff65fb0286b7a972f0aee7231bba6a3e6da858d7cf20aee83cee`
- Seed postflight SHA-256: `a06ad0cc8a4c4e9cb9b5ad01f3f6328c64dce1598302fd243a97216b2125a5d4`
- Supabase project: `kcjmkakdhsqplvasgkjv`
- Approval fingerprint: `09a42dbf198729a5f0ca775273d4db8ce423caec46fa0ab6257ea6b6df6039e5`

The approval fingerprint is SHA-256 over this exact UTF-8 text with LF line endings, including one trailing LF after the final line:

```text
packet=material_hosted_seed
release_fingerprint=534b6bb9e1405a6a15096081f8245117f5f470cdf22044c57640d06afa393b5a
runner_revision=d919078c160d18c3bba453a45af817859cd3b5b8
runner_sha256=3d55e4c8486714fc0df69fed8f49afbd2090a1af8c207affce3a5cb75dd2060f
seeder_sha256=a3dd8a252819930cd7ab1dfa014eea76907fff6b9a9d2ed51715214fced82b19
asset_report_sha256=4e04f3894566fc0b8f9011f38847f27cb40d48d738415ea9c6df41f1d58e9e92
report_verifier_sha256=1e8f7fe040c721e5691fb501ccd4f1529628a0737041a5a6b58b70da90059d24
preflight_sha256=897ffbfad2a4ff65fb0286b7a972f0aee7231bba6a3e6da858d7cf20aee83cee
postflight_sha256=a06ad0cc8a4c4e9cb9b5ad01f3f6328c64dce1598302fd243a97216b2125a5d4
project_ref=kcjmkakdhsqplvasgkjv
expected_assets=8524
destination_required_empty=true
```

## Authorized mutation

Run one from-scratch hosted seed for 4,262 Material IDs in outline and solid presets. The seed may upload exactly 8,524 objects to the private `material-icons` bucket and upsert exactly 8,524 matching rows into `material_icon_assets`.

No hosted deletion is authorized. No database migration, function deploy, Railway deploy, npm publication, or beta endpoint change is authorized.

## Guarded sequence

1. Verify every pinned file hash.
2. Prompt for the database password without retaining it.
3. Require both Material migration versions, a private empty table, and an empty Material storage prefix.
4. Prompt for the service-role key without retaining it.
5. Run the fixed seeder with `--all --hosted --no-resume`.
6. Compare every hosted report asset to the pinned 8,524-asset validation report.
7. Verify exactly 8,524 table rows, 4,262 rows per variant, 4,262 distinct IDs, exact preset axes, exact pinned revision, and exactly 8,524 matching private storage objects.
8. Remove both secrets from the runner process and retain the seed report.

The service-role key must be pasted only into the hidden interactive prompt. It must not be sent in chat or written to a repository file.

## Failure handling

If preflight fails, no Packet 2 write runs. If any upload, table upsert, report comparison, or postflight check fails after writing begins, stop and retain the partial state for inspection. Do not rerun and do not delete anything without a new approval packet. The current production serving path does not use these assets before the later serving deploy.

## Approved command after owner authorization

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/apply-material-hosted-seed.ps1 -ExecuteApprovedMaterialHostedSeed
```

## Approval sentence

> Approve Material production Packet 2 for fingerprint `09a42dbf198729a5f0ca775273d4db8ce423caec46fa0ab6257ea6b6df6039e5`: run the guarded from-scratch hosted seed only if the Material table and storage prefix are empty, write exactly 8,524 pinned assets, retain and verify the hosted report, and require exact table, variant, and private storage counts. No migration, deletion, function deploy, Railway deploy, npm publication, beta change, or rerun after partial failure is authorized.
