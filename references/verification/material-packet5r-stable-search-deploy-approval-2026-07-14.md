# Material Packet 5R stable search deploy approval

Date: 2026-07-14

Status: Ready for independent review and owner approval. No Packet 5 or Packet 5R deployment has run.

## Why Packet 5R replaces Packet 5

The original Packet 5 identified the correct stable search deployment and 92 live search gates, but it did not yet contain the separately fingerprinted treatment-measurement runner required by the amended latency contract. Its 92 synthetic queries also used the real hosted-MCP channel instead of the internal-test channel.

Packet 5R closes both gaps:

- All 92 release queries use `source=verify`, `channel=internal_test`, `environment=production`, and `client_family=material_release_gate`.
- A write-once treatment runner measures the same 26 direct-search and 21 grouped-recommendation requests as Packet 3R, with separate treatment identities and output paths.
- The comparison rejects direct-search warm p95 above 2,000 ms or more than 100 ms slower than baseline. It rejects grouped-recommendation warm p95 more than 100 ms slower than baseline.
- The 19 local modules in the `mcp-search` dependency graph are pinned by one aggregate hash and confirmed unchanged from implementation revision `425d8c2873e244988ed93ade18396e0f5c688f5e`.
- Every output path is write-once. Existing evidence blocks the command before new live requests run.

## Post-incident supersession notice

This packet is no longer executable. Packet 5R deployed version 37 and was followed by the emergency version 38 rollback. The later incident review also invalidated both pinned latency comparisons: the recommendation baseline measured a swallowed grouped-contract failure, and the search baseline lacked semantic expectations while already exceeding its proposed absolute gate.

Any replacement Packet 5 must use a fresh, owner-approved, semantically gated baseline. It must not reuse the recommendation baseline hash, the 459.204 ms recommendation value, the 3,337.062 ms search value as a binding comparison, or the 2,000 ms absolute ceiling without new evidence.

## Pinned packet

- Release fingerprint: `534b6bb9e1405a6a15096081f8245117f5f470cdf22044c57640d06afa393b5a`
- Implementation revision: `425d8c2873e244988ed93ade18396e0f5c688f5e`
- Release-tooling revision: `f50b95646a0aa9b596f99f1868de928d8ab78bf0`
- Search deploy-surface aggregate SHA-256: `050db70ca82676339aa0e186d23e50d50c1578a0f6e77f71262764e400b60733`
- Search-surface verifier normalized SHA-256: `d346e00b96bbefe189b32bec395808e6863f2cc267d17350a999a85b86d4a935`
- Production-release verifier normalized SHA-256: `a6d64b84e9c74479ef6d58c3b91a7c14df969b5d05f2d2d2caa6a3af67d6bda1`
- Production-release runner verifier normalized SHA-256: `c56606a881297bf6f737f4997a1e61d577881f7231f7ce49571fba08e78871e7`
- Treatment measurement wrapper normalized SHA-256: `f62a507623057bc88fdaffb0f8ea9f6769e3fa4a457224f4316fb6586cf4c958`
- Treatment runner normalized SHA-256: `c78e97cf9ed16db78e129c40e477f9f373dbed81fda3bbcb234e228b3eea0e4e`
- Treatment artifact verifier normalized SHA-256: `2521fb0cfaf2dac7b44c7ec3db4e5453a312484f5aeae637dc4741727c7c275b`
- Treatment runner verifier normalized SHA-256: `d9763cff6d22ea57b560e2aa53d5261be252cb663d27bece5d5fa2f6a47e2564`
- Relevance fixture normalized SHA-256: `4709daa089156d1f88edab94b80620d9cc368f799fd9a6613e51b3148f0ce2e3`
- Acceptance fixture normalized SHA-256: `d6c46d4aa31f9364f2e4724ba7d8f54e2f319cd3b8f827032f05d6fbad592b86`
- Direct-search baseline normalized SHA-256: `0344385fd16aac5aa6e55ff2a5dd5fd82f5f1f86230025025922ea1de27332ae`
- Recommendation baseline normalized SHA-256: `151ec835b5ac0e510510f692f395eee2169e461606470b9fae14a4c6714cea99`
- Supabase config normalized SHA-256: `4b269bece10187113107e019fdac3db55752d4faf24693fbc7aa543d29d50df3`
- Package manifest normalized SHA-256: `c80076b1feb1b55ac03757eed43dccc4fa78dca90cd89e7f728a15ce6ab9b9c0`
- Hash mode: LF-normalized UTF-8 without a byte-order mark
- Supabase project: `kcjmkakdhsqplvasgkjv`
- Function: `mcp-search`
- Pre-deploy function version: 36
- Pre-deploy bundle SHA-256: `3416251449e61cd0c96abfaa0fd8fc1b4c15f572b40aec295c7f5c6efa97d5d5`
- Approval fingerprint: `57ec4b352a2446d1b18a891e1cc74a4bcf9775a5aa142c7410ab3475b49cb026`

The approval fingerprint is SHA-256 over this exact UTF-8 text with LF line endings, including one trailing LF after the final line:

```text
packet=material_stable_search_deploy
release_fingerprint=534b6bb9e1405a6a15096081f8245117f5f470cdf22044c57640d06afa393b5a
implementation_revision=425d8c2873e244988ed93ade18396e0f5c688f5e
tooling_revision=f50b95646a0aa9b596f99f1868de928d8ab78bf0
search_surface_aggregate_sha256=050db70ca82676339aa0e186d23e50d50c1578a0f6e77f71262764e400b60733
surface_verifier_normalized_sha256=d346e00b96bbefe189b32bec395808e6863f2cc267d17350a999a85b86d4a935
release_verifier_normalized_sha256=a6d64b84e9c74479ef6d58c3b91a7c14df969b5d05f2d2d2caa6a3af67d6bda1
release_runner_verifier_normalized_sha256=c56606a881297bf6f737f4997a1e61d577881f7231f7ce49571fba08e78871e7
treatment_wrapper_normalized_sha256=f62a507623057bc88fdaffb0f8ea9f6769e3fa4a457224f4316fb6586cf4c958
treatment_runner_normalized_sha256=c78e97cf9ed16db78e129c40e477f9f373dbed81fda3bbcb234e228b3eea0e4e
treatment_artifact_verifier_normalized_sha256=2521fb0cfaf2dac7b44c7ec3db4e5453a312484f5aeae637dc4741727c7c275b
treatment_runner_verifier_normalized_sha256=d9763cff6d22ea57b560e2aa53d5261be252cb663d27bece5d5fa2f6a47e2564
relevance_fixture_normalized_sha256=4709daa089156d1f88edab94b80620d9cc368f799fd9a6613e51b3148f0ce2e3
acceptance_fixture_normalized_sha256=d6c46d4aa31f9364f2e4724ba7d8f54e2f319cd3b8f827032f05d6fbad592b86
baseline_search_normalized_sha256=0344385fd16aac5aa6e55ff2a5dd5fd82f5f1f86230025025922ea1de27332ae
baseline_recommendation_normalized_sha256=151ec835b5ac0e510510f692f395eee2169e461606470b9fae14a4c6714cea99
supabase_config_normalized_sha256=4b269bece10187113107e019fdac3db55752d4faf24693fbc7aa543d29d50df3
package_normalized_sha256=c80076b1feb1b55ac03757eed43dccc4fa78dca90cd89e7f728a15ce6ab9b9c0
hash_mode=lf_normalized_utf8
project_ref=kcjmkakdhsqplvasgkjv
function_name=mcp-search
predeploy_function_version=36
predeploy_bundle_sha256=3416251449e61cd0c96abfaa0fd8fc1b4c15f572b40aec295c7f5c6efa97d5d5
verify_jwt=false
search_gate_queries=92
search_absolute_limit_ms=2000
search_regression_limit_ms=100
recommendation_regression_limit_ms=100
deployments_authorized=1
rollback_deployment_authorized=false
beta_change_authorized=false
```

## Pre-deploy version 36 provenance

Version 36 is the expected pre-Material production deployment. It was created on 2026-07-05 at `05:09:18.858Z` (`13:09:18.858` Asia/Singapore) by this successful paired command:

```powershell
supabase functions deploy search-icons mcp-search --project-ref kcjmkakdhsqplvasgkjv --no-verify-jwt --use-api
```

The retained deployment transcript shows both functions uploaded and completed. Production metadata gives `mcp-search` version 36 and `search-icons` version 35 the same update timestamp, which ties both version numbers to that paired deploy. The deploy shipped the hosted MCP attribution handoff for country, geo source, IP hash, and session hash. It predates the Material implementation.

The source inputs used by that deploy were subsequently checkpointed in commit `02b2c22ea8a76decee92d83c853ca6cf33899e6c`. The retained execution record shows no edit to an uploaded search-function file between the successful deploy and that checkpoint. An attempted archived-body download returned HTTP 401, so direct byte comparison of the hosted bundle to the checkpoint is unavailable. The pre-deploy identity is instead bound by the retained deployment transcript, the exact shared production timestamp, live pre-Material behavior, function version 36, and bundle SHA-256 `3416251449e61cd0c96abfaa0fd8fc1b4c15f572b40aec295c7f5c6efa97d5d5`.

Earlier Search v2 records reported `search-icons` version 34 and `mcp-search` version 35. Those records were one version low and are corrected to 35 and 36. No unexplained `mcp-search` deployment occurred during the Material program, and the Packet 5R fingerprint remains unchanged because this provenance note does not alter the fingerprinted approval text.

## Authorized activity

Deploy only the stable `mcp-search` function to project `kcjmkakdhsqplvasgkjv` with gateway JWT verification disabled. Then run:

1. The 92-query Material production release gate.
2. The 26-request direct-search treatment measurement.
3. The 21-request grouped-recommendation treatment measurement.
4. The fixed baseline comparison.

All synthetic search and latency traffic must use internal-test production classification. No Search v2 beta endpoint, snapshot function, database object, storage object, Railway service, npm package, or other Supabase function may change.

## Guarded sequence

1. Recompute the Packet 5R approval fingerprint and every pinned normalized hash.
2. Confirm the authenticated project, active pre-deploy function version 36, bundle hash, and gateway JWT setting.
3. Require all three evidence output paths to be absent.
4. Run the search-surface, 92-query runner, and treatment-runner verification commands.
5. Deploy only `mcp-search`.
6. Require the linked function list to show one new active `mcp-search` version with gateway JWT verification disabled.
7. Run the 92-query release gate and retain `tmp/material-search-production.json`.
8. Run the treatment runner and retain `tmp/material-treatment-search.json` and `tmp/material-treatment-recommendation.json`.
9. Require all 92 search gates, zero treatment request errors, direct-search warm p95 at or below 2,000 ms, direct-search regression no greater than 100 ms, and recommendation regression no greater than 100 ms.
10. Record and commit the deployment and all three evidence artifacts. Do not rerun Packet 5R.

## Commands after approval

```powershell
npm run verify:material-production-search-surface
npm run verify:material-production-runner
npm run verify:material-production-treatment-runner
supabase functions deploy mcp-search --project-ref kcjmkakdhsqplvasgkjv --no-verify-jwt
npm run verify:material-production-release -- --revision 425d8c2873e244988ed93ade18396e0f5c688f5e --output tmp/material-search-production.json --search-url https://kcjmkakdhsqplvasgkjv.supabase.co/functions/v1/mcp-search
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/run-material-production-treatment.ps1 -ExecuteApprovedMaterialProductionTreatment
```

## Stop and rollback policy

Any deploy-surface mismatch, function-version mismatch, output collision, live search failure, missing or wrong-style SVG, shortened all-mode result, asset-gap error, request error, telemetry mismatch, or latency failure stops Packet 5R and blocks Packets 6 and 7.

This approval does not authorize a rollback deployment. If the deploy succeeds but a live gate fails, retain all evidence, leave every later packet blocked, and prepare a separately pinned rollback to the recorded pre-deploy function version 36. The platform deployment history and pre-deploy bundle hash identify the rollback target.

## Verification evidence

- `npm run verify:material-production-search-surface` passed with 19 locked local modules, the pinned aggregate hash, successful Deno checking, and `verify_jwt=false`.
- `npm run verify:material-serving` passed strict outline and solid hydration, mandatory hydration, all-mode result preservation, asset-gap errors, and recommendation hydration.
- `npm run verify:search-v2-hosted-http-parity` passed five direct and five grouped cases with Material SVG hydration.
- `npm run verify:search-v2-shared-recommendation-pipeline` passed its grouped pipeline, bounded reads, audit, and error cases.
- `npm run verify:search-v2-result-hydration` passed order, SVG, null, and missing-row behavior.
- `npm run verify:material-production-runner` passed 92 logical queries and all five hosted MCP tool checks locally. It also proved the internal-test audit contract.
- `npm run verify:material-production-treatment-runner` passed baseline pins, write-once outputs, the stable endpoint, treatment identity, and both failure thresholds.
- `npm run verify:material-production-baseline-runner` still passes unchanged, preserving Packet 3R reproducibility.

## Approval sentence

> Approve Material production Packet 5R for fingerprint `57ec4b352a2446d1b18a891e1cc74a4bcf9775a5aa142c7410ab3475b49cb026`: deploy only stable `mcp-search` from the pinned 19-file implementation surface, run and retain the 92-query Material release gate plus the two internal-test treatment measurements, and enforce the fixed direct-search and recommendation latency limits. No beta endpoint, snapshot function, database or storage object, Railway service, npm package, rollback deployment, or other Supabase function may change.
