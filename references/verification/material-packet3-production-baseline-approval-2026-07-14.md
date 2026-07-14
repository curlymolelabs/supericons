# Material Packet 3 production baseline approval

Date: 2026-07-14

Status: Ready for independent review and owner approval. No Packet 3 production measurement has run.

## Why the original Packet 3 commands were blocked

The earlier commands pointed the shared Search v2 measurement runner at stable `mcp-search`, but that runner intentionally labels its requests as beta preview traffic. Running it unchanged would have recorded stable production measurements with `source=mcp_beta`, `environment=preview`, and beta cohorts.

The corrected package leaves the paused Search v2 runner byte-for-byte unchanged. A new Material-only wrapper targets stable `mcp-search` and rewrites every outgoing measurement usage context before transmission:

- `source=mcp`
- `channel=hosted_mcp`
- `environment=production`
- `client_family=material_release_latency`
- no `beta_cohort`

Each outgoing request also receives a generated measurement run ID and unique dedupe key. The retained artifacts record the stable endpoint, production profile, request count, run ID, and audit contract.

## Pinned packet

- Release fingerprint: `534b6bb9e1405a6a15096081f8245117f5f470cdf22044c57640d06afa393b5a`
- Runner revision: `30debfdc2e4a06ef4b52fde814dd2755287b4660`
- Runner SHA-256: `b863a074bcd313426a522fcae0adc96a34b4ca30b4da83b65ab461813e39e874`
- Measurement wrapper SHA-256: `710d88083f9768c7bfa2d52fd6272a4e8edd519440f1bd694eb4d23938cb7b41`
- Measurement profile SHA-256: `5e8260820c401b5e70401a3580fcc7956336b4fe230a31cd9bf84777df2050ec`
- Shared beta runner SHA-256: `e7be5a51fb3d449285a4929c3e343b0134fa781ea56dbbbbe191938ed57ba1a9`
- Profile verifier SHA-256: `ae929b27138c989fdfdc15150c7e04b09c6976a24e19effb504c84a1efe46dbb`
- Artifact verifier SHA-256: `3566158976047eede62c8556e998ec62fd2f722899182519574b262bbd6df96e`
- Runner verifier SHA-256: `910c1fcc12f29abb9d5964585b9bf43716855b360a077e41a7831c1fc3b19184`
- Supabase project: `kcjmkakdhsqplvasgkjv`
- Approval fingerprint: `f7402463de1f9558bce7696c98bd27b8700979abd3b99c159f6dd58ab2d45883`

The approval fingerprint is SHA-256 over this exact UTF-8 text with LF line endings, including one trailing LF after the final line:

```text
packet=material_production_latency_baseline
release_fingerprint=534b6bb9e1405a6a15096081f8245117f5f470cdf22044c57640d06afa393b5a
runner_revision=30debfdc2e4a06ef4b52fde814dd2755287b4660
runner_sha256=b863a074bcd313426a522fcae0adc96a34b4ca30b4da83b65ab461813e39e874
measurement_runner_sha256=710d88083f9768c7bfa2d52fd6272a4e8edd519440f1bd694eb4d23938cb7b41
measurement_profile_sha256=5e8260820c401b5e70401a3580fcc7956336b4fe230a31cd9bf84777df2050ec
shared_beta_runner_sha256=e7be5a51fb3d449285a4929c3e343b0134fa781ea56dbbbbe191938ed57ba1a9
profile_verifier_sha256=ae929b27138c989fdfdc15150c7e04b09c6976a24e19effb504c84a1efe46dbb
artifact_verifier_sha256=3566158976047eede62c8556e998ec62fd2f722899182519574b262bbd6df96e
runner_verifier_sha256=910c1fcc12f29abb9d5964585b9bf43716855b360a077e41a7831c1fc3b19184
project_ref=kcjmkakdhsqplvasgkjv
endpoint=mcp-search
search_requests=26
recommendation_requests=21
audit_source=mcp
audit_environment=production
beta_change_authorized=false
deployments_authorized=0
```

## Authorized activity

Run one direct-search baseline of 26 requests and one grouped-recommendation baseline of 21 requests against the current stable `mcp-search`. These requests create only normal production search audit rows. Retain both output artifacts and require every request to succeed.

No database migration, seed, deletion, function deploy, Railway deploy, npm publication, beta endpoint request, or beta configuration change is authorized.

## Guarded sequence

1. Verify every pinned file hash.
2. Require both output paths to be absent. Existing evidence is never overwritten.
3. Verify the production measurement profile and preserved shared beta runner.
4. Run 26 stable direct-search requests and retain `tmp/material-baseline-search.json`.
5. Run 21 stable grouped-recommendation requests and retain `tmp/material-baseline-recommendation.json`.
6. Require stable `mcp-search`, production audit fields, no beta fields, exact request counts, zero request errors, and positive p95 values in both artifacts.
7. Remove the temporary endpoint environment variable from the runner process.

## Verification evidence

- `npm run verify:material-production-latency-profile` passed.
- `npm run verify:material-production-baseline-runner` passed.
- Syntax checks passed for the wrapper, profile helper, artifact verifier, and runner verifier.
- The shared Search v2 measurement runner has no diff from the pre-Packet 3 revision and its hash is pinned.
- A preview-tagged artifact fixture is rejected.
- The guarded runner contains no deploy, migration, Railway, or publication command.

The older `verify:search-v2-latency-rerun-packet` remains tied to its paused Search v2 authorization manifest and currently fails that manifest's pre-existing hash assertion. It is not changed or used by this Material-only packet.

## Residual risk and stop conditions

The package verifies outgoing production audit fields before transmission and retains them in each artifact. It does not query the database afterward to re-read the persisted audit rows. Any request error, beta field, endpoint mismatch, request-count mismatch, output collision, or artifact verification failure stops Packet 3. Do not rerun without inspecting retained evidence and obtaining fresh approval.

## Approved command after owner authorization

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/run-material-production-baseline.ps1 -ExecuteApprovedMaterialProductionBaseline
```

## Approval sentence

> Approve Material production Packet 3 for fingerprint `f7402463de1f9558bce7696c98bd27b8700979abd3b99c159f6dd58ab2d45883`: run only the guarded stable `mcp-search` direct-search and grouped-recommendation baselines, retain both artifacts, require the production audit contract with no beta fields, and require zero request errors. No deploy, migration, seed, deletion, Railway change, npm publication, beta request, or rerun after failure is authorized.
