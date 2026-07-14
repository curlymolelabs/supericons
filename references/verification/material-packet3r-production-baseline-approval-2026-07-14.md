# Material Packet 3R production baseline approval

Date: 2026-07-14

Status: Completed successfully. Packet 3R is closed and must not be rerun.

## Completion evidence

The approved guarded runner completed with exit code 0 on 2026-07-14. It created only internal-test audit traffic against the stable production endpoint and retained both measurement artifacts.

- Direct-search artifact: `tmp/material-baseline-search.json`
- Direct-search artifact SHA-256: `0344385fd16aac5aa6e55ff2a5dd5fd82f5f1f86230025025922ea1de27332ae`
- Direct-search requests: 26 total, 25 warm samples, zero errors
- Direct-search warm p95: 3,337.062 ms
- Grouped-recommendation artifact: `tmp/material-baseline-recommendation.json`
- Grouped-recommendation artifact SHA-256: `151ec835b5ac0e510510f692f395eee2169e461606470b9fae14a4c6714cea99`
- Grouped-recommendation requests: 21 total, 20 warm samples, zero errors
- Grouped-recommendation warm p95: 459.204 ms
- Audit contract in both artifacts: `source=verify`, `channel=internal_test`, `environment=production`, `client_family=material_release_latency`, with no beta cohort

The artifact verifier passed with the pinned release fingerprint, exact request counts, positive p95 values, zero errors, the required audit contract, and no beta fields. No deploy, migration, seed, deletion, Railway change, npm publication, or beta request ran.

The direct-search baseline is above the active 2,000 ms release gate. Packet 3R is still successful because its purpose was to measure the pre-deploy baseline. Packet 5 must independently prove that the deployed treatment is at or below 2,000 ms warm p95 and no more than 100 ms slower than this baseline. If it does not, the serving release cannot remain deployed under the current contract.

## Why Packet 3R replaces Packet 3

Packet 3 was technically executable but had two avoidable weaknesses:

1. Its synthetic requests used `channel=hosted_mcp`, which could make measurement traffic appear to be real user traffic in dashboard views that do not filter the dedicated client family.
2. One pinned hash depended on Windows checkout line endings, so the same committed text could fail on another checkout.

Packet 3R keeps `environment=production`, because the measurements target production, but changes the traffic identity to:

- `source=verify`
- `channel=internal_test`
- `environment=production`
- `client_family=material_release_latency`
- no `beta_cohort`

All Packet 3R text-file hashes are computed after converting CRLF and CR line endings to LF and encoding as UTF-8 without a byte-order mark. The guarded runner and its verifier use the same rule.

## Pinned packet

- Release fingerprint: `534b6bb9e1405a6a15096081f8245117f5f470cdf22044c57640d06afa393b5a`
- Runner revision: `0abc3e663eb8c9f34faa017486f55a2f5f9b6ef0`
- Runner normalized SHA-256: `073f403f6239e9e2ef8157285bfd8ab175804420b8e9765c030a1227f2212ea0`
- Measurement wrapper normalized SHA-256: `ccc227f446ae18ec0212bb2582e5bfe3cf1c6297a935bc648e2c22576cb4f719`
- Measurement profile normalized SHA-256: `155a2391296732730d31a11556d54669e959c724613718c90b895da100970b2a`
- Shared beta runner normalized SHA-256: `774d698b94afa7adc40104226f603b9d13b3c07539eb7c7c9aa81904cf011018`
- Profile verifier normalized SHA-256: `4d3420f8a25320e202320e2080bb266ca0af08929cbdd0e0d98d65ffcdb2c4dd`
- Artifact verifier normalized SHA-256: `cb242285317dae13a4cec97c05523b24cd116da364161a0363b809045f39b40c`
- Runner verifier normalized SHA-256: `1cb25bd57c169dcd59526a33372e0162b0ccd18879841e4f8d88401de74e2931`
- Supabase project: `kcjmkakdhsqplvasgkjv`
- Approval fingerprint: `80f193e20bbaf3dc175f8088e812256f9ec65bc274578ff15f76887ab9a9bcd4`

The approval fingerprint is SHA-256 over this exact UTF-8 text with LF line endings, including one trailing LF after the final line:

```text
packet=material_production_latency_baseline_internal_test
release_fingerprint=534b6bb9e1405a6a15096081f8245117f5f470cdf22044c57640d06afa393b5a
runner_revision=0abc3e663eb8c9f34faa017486f55a2f5f9b6ef0
runner_normalized_sha256=073f403f6239e9e2ef8157285bfd8ab175804420b8e9765c030a1227f2212ea0
measurement_runner_normalized_sha256=ccc227f446ae18ec0212bb2582e5bfe3cf1c6297a935bc648e2c22576cb4f719
measurement_profile_normalized_sha256=155a2391296732730d31a11556d54669e959c724613718c90b895da100970b2a
shared_beta_runner_normalized_sha256=774d698b94afa7adc40104226f603b9d13b3c07539eb7c7c9aa81904cf011018
profile_verifier_normalized_sha256=4d3420f8a25320e202320e2080bb266ca0af08929cbdd0e0d98d65ffcdb2c4dd
artifact_verifier_normalized_sha256=cb242285317dae13a4cec97c05523b24cd116da364161a0363b809045f39b40c
runner_verifier_normalized_sha256=1cb25bd57c169dcd59526a33372e0162b0ccd18879841e4f8d88401de74e2931
hash_mode=lf_normalized_utf8
project_ref=kcjmkakdhsqplvasgkjv
endpoint=mcp-search
search_requests=26
recommendation_requests=21
audit_source=verify
audit_channel=internal_test
audit_environment=production
beta_change_authorized=false
deployments_authorized=0
```

## Authorized activity

Run one direct-search baseline of 26 requests and one grouped-recommendation baseline of 21 requests against the current stable `mcp-search`. These requests may create only normal audit rows classified as internal testing against production. Retain both output artifacts and require every request to succeed.

No database migration, seed, deletion, function deploy, Railway deploy, npm publication, beta endpoint request, or beta configuration change is authorized.

## Guarded sequence

1. Verify every pinned text file with the LF-normalized SHA-256 rule.
2. Require both output paths to be absent. Existing evidence is never overwritten.
3. Verify the internal-test production measurement profile and the preserved shared beta runner.
4. Run 26 stable direct-search requests and retain `tmp/material-baseline-search.json`.
5. Run 21 stable grouped-recommendation requests and retain `tmp/material-baseline-recommendation.json`.
6. Require stable `mcp-search`, the internal-test production audit contract, no beta fields, exact request counts, zero request errors, and positive p95 values in both artifacts.
7. Remove the temporary endpoint environment variable from the runner process.

## Verification evidence

- `npm run verify:material-production-latency-profile` passed with source `verify`, channel `internal_test`, environment `production`, and no beta cohort.
- `npm run verify:material-production-baseline-runner` passed.
- The verifier proved LF and CRLF forms of the same text produce the same pinned hash.
- Syntax checks passed for the wrapper, profile helper, artifact verifier, and runner verifier.
- The shared Search v2 measurement runner has no diff from the pre-Packet 3 revision.
- A preview-tagged artifact fixture is rejected.
- The guarded runner contains no deploy, migration, Railway, Storage, or publication command.

The generic repository preflight scanner did not find repository-wide CI or observability configuration. Packet 3R is a one-time request runner, not a deployed service. Its two retained artifacts, exact request counts, request-level errors, audit contract, and p95 summaries provide the packet-level evidence.

## Failure handling

Any request error, beta field, endpoint mismatch, audit-contract mismatch, request-count mismatch, output collision, hash mismatch, or artifact verification failure stops Packet 3R. Do not rerun without inspecting the retained evidence and obtaining fresh approval. The successful internal-test audit rows are retained; no audit-row deletion is authorized.

## Approved command after owner authorization

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/run-material-production-baseline.ps1 -ExecuteApprovedMaterialProductionBaseline
```

## Approval sentence

> Approve Material production Packet 3R for fingerprint `80f193e20bbaf3dc175f8088e812256f9ec65bc274578ff15f76887ab9a9bcd4`: run only the guarded stable `mcp-search` direct-search and grouped-recommendation baselines, classify every request as internal testing against production, retain both artifacts, and require zero request errors. No deploy, migration, seed, deletion, Railway change, npm publication, beta request, or rerun after failure is authorized.
