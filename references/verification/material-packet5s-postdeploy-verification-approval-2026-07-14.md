# Material Packet 5S post-deploy verification approval

Date: 2026-07-14

Status: Ready for independent review and owner approval. No Packet 5S production request has run.

## Purpose

Packet 5R deployed the approved stable `mcp-search` implementation as production version 37, then stopped because its release verifier used a test-only grouped HTTP envelope. The production endpoint accepts one search request per POST. The failure happened before any Material result assertion, before the release artifact was written, and before either treatment measurement ran.

Packet 5S does not deploy or change production. It authorizes only the corrected 92-request gate and the two previously approved treatment measurements against the already active version 37.

## Pinned packet

- Failed packet fingerprint: `57ec4b352a2446d1b18a891e1cc74a4bcf9775a5aa142c7410ab3475b49cb026`
- Incident and correction revision: `f3c979acb5019c85ff0e11abea64b31eece99a76`
- Incident normalized SHA-256: `67319ab1efd09c4d44e2ba5908561de2592dd13f549dc9d18f977d556c582230`
- Implementation revision: `425d8c2873e244988ed93ade18396e0f5c688f5e`
- Search deploy-surface aggregate SHA-256: `050db70ca82676339aa0e186d23e50d50c1578a0f6e77f71262764e400b60733`
- Search-surface verifier normalized SHA-256: `d346e00b96bbefe189b32bec395808e6863f2cc267d17350a999a85b86d4a935`
- Supabase project: `kcjmkakdhsqplvasgkjv`
- Function: `mcp-search`
- Active function version: 37
- Active bundle SHA-256: `3ab7d0b18b8b48d123c851c3896fb62ea23c42a39b94c094b735b29caf1eac01`
- Corrected release verifier normalized SHA-256: `a07a377eed6aa703b8b7a26ffdce4f75f30c117be69cb0778240d5a628a2d792`
- Corrected release-runner verifier normalized SHA-256: `538721324f2265f527100091d315db895a8dffd109b111ece4a877a2a9a32bca`
- Treatment runner normalized SHA-256: `c78e97cf9ed16db78e129c40e477f9f373dbed81fda3bbcb234e228b3eea0e4e`
- Treatment wrapper normalized SHA-256: `f62a507623057bc88fdaffb0f8ea9f6769e3fa4a457224f4316fb6586cf4c958`
- Treatment profile verifier normalized SHA-256: `4d3420f8a25320e202320e2080bb266ca0af08929cbdd0e0d98d65ffcdb2c4dd`
- Treatment artifact verifier normalized SHA-256: `2521fb0cfaf2dac7b44c7ec3db4e5453a312484f5aeae637dc4741727c7c275b`
- Treatment-runner verifier normalized SHA-256: `d9763cff6d22ea57b560e2aa53d5261be252cb663d27bece5d5fa2f6a47e2564`
- Relevance fixture normalized SHA-256: `4709daa089156d1f88edab94b80620d9cc368f799fd9a6613e51b3148f0ce2e3`
- Acceptance fixture normalized SHA-256: `d6c46d4aa31f9364f2e4724ba7d8f54e2f319cd3b8f827032f05d6fbad592b86`
- Direct-search baseline normalized SHA-256: `0344385fd16aac5aa6e55ff2a5dd5fd82f5f1f86230025025922ea1de27332ae`
- Recommendation baseline normalized SHA-256: `151ec835b5ac0e510510f692f395eee2169e461606470b9fae14a4c6714cea99`
- Hash mode: LF-normalized UTF-8 without a byte-order mark
- Approval fingerprint: `3a8aa55059b0badcc89a5ca575fb86971b6a83bdc23cedd10b2b10b026c981fb`

The approval fingerprint is SHA-256 over this exact UTF-8 text with LF line endings, including one trailing LF after the final line:

```text
packet=material_stable_search_postdeploy_verification_recovery
failed_packet=5R
failed_packet_fingerprint=57ec4b352a2446d1b18a891e1cc74a4bcf9775a5aa142c7410ab3475b49cb026
incident_revision=f3c979acb5019c85ff0e11abea64b31eece99a76
incident_normalized_sha256=67319ab1efd09c4d44e2ba5908561de2592dd13f549dc9d18f977d556c582230
implementation_revision=425d8c2873e244988ed93ade18396e0f5c688f5e
search_surface_aggregate_sha256=050db70ca82676339aa0e186d23e50d50c1578a0f6e77f71262764e400b60733
surface_verifier_normalized_sha256=d346e00b96bbefe189b32bec395808e6863f2cc267d17350a999a85b86d4a935
project_ref=kcjmkakdhsqplvasgkjv
function_name=mcp-search
active_function_version=37
active_bundle_sha256=3ab7d0b18b8b48d123c851c3896fb62ea23c42a39b94c094b735b29caf1eac01
verify_jwt=false
release_verifier_normalized_sha256=a07a377eed6aa703b8b7a26ffdce4f75f30c117be69cb0778240d5a628a2d792
release_runner_verifier_normalized_sha256=538721324f2265f527100091d315db895a8dffd109b111ece4a877a2a9a32bca
treatment_runner_normalized_sha256=c78e97cf9ed16db78e129c40e477f9f373dbed81fda3bbcb234e228b3eea0e4e
treatment_wrapper_normalized_sha256=f62a507623057bc88fdaffb0f8ea9f6769e3fa4a457224f4316fb6586cf4c958
treatment_profile_verifier_normalized_sha256=4d3420f8a25320e202320e2080bb266ca0af08929cbdd0e0d98d65ffcdb2c4dd
treatment_artifact_verifier_normalized_sha256=2521fb0cfaf2dac7b44c7ec3db4e5453a312484f5aeae637dc4741727c7c275b
treatment_runner_verifier_normalized_sha256=d9763cff6d22ea57b560e2aa53d5261be252cb663d27bece5d5fa2f6a47e2564
relevance_fixture_normalized_sha256=4709daa089156d1f88edab94b80620d9cc368f799fd9a6613e51b3148f0ce2e3
acceptance_fixture_normalized_sha256=d6c46d4aa31f9364f2e4724ba7d8f54e2f319cd3b8f827032f05d6fbad592b86
baseline_search_normalized_sha256=0344385fd16aac5aa6e55ff2a5dd5fd82f5f1f86230025025922ea1de27332ae
baseline_recommendation_normalized_sha256=151ec835b5ac0e510510f692f395eee2169e461606470b9fae14a4c6714cea99
hash_mode=lf_normalized_utf8
search_gate_requests=92
relevance_checks=40
smoke_checks=50
all_mode_checks=2
search_absolute_limit_ms=2000
search_regression_limit_ms=100
recommendation_regression_limit_ms=100
deployments_authorized=0
rollback_deployment_authorized=false
database_change_authorized=false
storage_change_authorized=false
railway_deploy_authorized=false
npm_publication_authorized=false
beta_change_authorized=false
```

## Guarded sequence

1. Recompute the approval fingerprint and every pinned normalized hash.
2. Confirm production `mcp-search` is still active at version 37 with the pinned bundle hash and `verify_jwt=false`.
3. Require all three evidence paths to remain absent.
4. Run the search-surface, corrected release-runner, and treatment-runner verification commands.
5. Run 92 individual stable-endpoint requests and retain `tmp/material-search-production.json`.
6. Require 40 relevance checks, 50 smoke checks, two all-mode checks, valid Material SVG in both styles, and full all-mode result counts.
7. Run and retain the 26-request direct-search and 21-request grouped-recommendation treatment measurements.
8. Require zero request errors, direct-search warm p95 at or below 2,000 ms, direct-search regression no greater than 100 ms, and recommendation regression no greater than 100 ms.
9. Record and commit the three evidence artifacts. Do not rerun Packet 5S.

## Stop policy

Any fingerprint, hash, function-version, bundle, JWT-setting, output-path, live-result, telemetry, request, or latency mismatch stops Packet 5S. No deployment or rollback is authorized. Packets 6 and 7 remain blocked until Packet 5S completes successfully.

## Approval sentence

> Approve Material production Packet 5S for fingerprint `3a8aa55059b0badcc89a5ca575fb86971b6a83bdc23cedd10b2b10b026c981fb`: against unchanged active `mcp-search` version 37, run and retain the corrected 92-request Material release gate and the two internal-test treatment measurements, then enforce the fixed direct-search and recommendation latency limits. No Supabase deployment, rollback, database or storage change, Railway deployment, npm publication, or beta change is authorized.
