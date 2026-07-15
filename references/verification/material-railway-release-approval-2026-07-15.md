# Material Railway hydration release approval

Date: 2026-07-15

Status: Ready for owner approval. Not executed.

## Outcome

This packet deploys one Railway service change that completes hosted MCP support for Material Symbols without changing the stable Supabase search function.

The Railway MCP will serve the pinned Material asset bundle locally. This gives MCP users valid SVG output for Material search, exact lookup, recommendations, and previews in both outline and solid styles. The deployment does not alter the website search path.

## Why this release path is narrow

Production already has the validated Material asset store and snapshot function. The stable search function still returns Material catalog rows without SVG content. The current Railway MCP drops those rows because it requires every returned icon to carry a usable SVG.

This release puts the already validated 8,524 fixed-preset assets into the Railway MCP bundle. Strict Material queries use the local Material index and bundle. Non-Material requests keep their current path. The stable Supabase search function remains on version 38 and is not deployed by this packet.

## Pinned implementation

- Implementation revision: `13f28d7e72484538b0a2be14f680ef8a4c4e3c52`
- Implementation tree: `27668ce5ff4027aabe28432f1ce2eaf6386bb109`
- Material bundle SHA-256: `66ef383bad9e3847da107f0d8f37f0bd1cb695afd4e3c4cd3470ef1c97723ed9`
- Upstream Material revision: `30f8fddd293b1f0189896dc4aaecdfaba1d37ae0`
- Material assets: 8,524 total, 4,262 outline and 4,262 solid
- Expected MCP package version after deployment: `0.4.18`

The bundle verifier checks every included SVG against the retained 8,524-asset validation report before release. The bundle is part of the Railway source archive but remains excluded from the published npm package.

## Exact Railway target

- Project: `supericons-converter-node` (`b53f5f48-607f-49ae-a71e-37cc766f6973`)
- Environment: `production` (`6345c75b-5ac2-40d6-b176-a4a783ce3eb3`)
- Service: `scintillating-imagination` (`352420e5-6a02-43a4-99f2-f6dbde522acb`)
- Public MCP URL: `https://mcp.supericons.dev/mcp`
- Current deployment: `36e284e7-df61-4c4b-95c6-f17492db5cf7`
- Current image digest: `sha256:2e246dabd3caabd1ca13da1de88ab75d682c3b59aa06f32b2411b12b6841f73f`

The runner stops before deployment if the project, environment, service, deployment ID, image digest, or current health contract has changed.

## Verified local evidence

The following checks passed against the pinned implementation revision:

- Full bundle verification: 8,524 of 8,524 assets matched the pinned checksums.
- Hydration suite: 11 of 11 checks passed, including process-wide concurrency limits and in-flight request sharing.
- Server contract: exact Material lookup fetched one asset, a three-icon preview fetched three assets, the preview returned a real PNG, and snapshot failure retained `material_asset_unavailable` in telemetry.
- Usage dedupe regression: separate sessions that both send JSON-RPC request ID 1 no longer collide, while retries in the same session still dedupe.
- MCP package verification: package version `0.4.18`, both Material styles, and 8,524 of 8,524 source assets validated.
- Clean npm installation: Material outline and solid exact lookup both returned valid SVG.
- Local server connected to the production search and snapshot services: 17 of 17 live checks passed. The 20-query relevance fixture passed at top five in both styles.
- Warm local-server p95 through the MCP protocol: search 101.9 ms, exact lookup 2.8 ms, preview 317.4 ms, and recommendations 450.9 ms.

The current production Railway service was also probed before release. It reports version `0.4.17`, returns three valid Lucide results, and returns zero Material results for strict `settings`, which is the expected pre-release behavior.

## Guarded execution

The guarded runner is `scripts/run-material-railway-release.ps1`.

It performs this sequence:

1. Verify the approved fingerprint, runner hash, verifier hash, implementation tree, rollback tree, live gate, legacy gate, and Material bundle.
2. Re-run the local bundle, hydration, server-contract, and usage-dedupe checks.
3. Confirm the exact Railway project, production environment, service, active deployment, image digest, and legacy live behavior.
4. Build the upload directory from `git archive` of the pinned implementation revision. Uncommitted workspace files cannot enter the upload.
5. Upload one candidate deployment to only the pinned Railway service.
6. Wait for Railway status `SUCCESS`, then allow up to 60 seconds for the new container health contract.
7. Require version `0.4.18`, the 8,524-asset bundle, and all 17 production MCP checks.
8. Retain the preflight, live gate, deployment, and any rollback evidence at write-once paths.

The 17-check production gate covers:

- `list_libraries` capability truth
- Material search in outline and solid
- Material exact lookup in outline and solid
- Material recommendations in outline and solid
- SVG and PNG previews in outline and solid
- The 20-query relevance fixture in both styles
- Full deliverable counts in all-mode searches
- All-mode solid Material results
- Lucide regression behavior
- Warm p95 limits of 2,000 ms for search, exact lookup, and preview, and 3,000 ms for recommendations

## Automatic rollback

Rollback is authorized only if the candidate reaches Railway status `SUCCESS` and then fails the pinned health or production gate. A build that never becomes active leaves the existing deployment in place and does not trigger another deployment.

The rollback uploads the exact verified pre-Material source checkpoint:

- Revision: `02b2c22ea8a76decee92d83c853ca6cf33899e6c`
- Tree: `b5cea763f36be4e32453d4e1aca49988a4d3a72f`
- Expected restored package version: `0.4.17`

After rollback, the legacy live gate must show a healthy service, three valid Lucide results, and the known pre-release Material zero-result behavior. If rollback cannot be verified, the runner stops and reports the exact failure without making any further change.

## Mutation boundary

Authorized after owner approval:

- One Railway deployment to the pinned production service.
- One conditional Railway rollback deployment to the same service, only under the failure condition above.
- Controlled MCP verification requests to `mcp.supericons.dev`.

Not authorized:

- Any Supabase function deploy or configuration change.
- Any database migration, write, seed, or storage change.
- Any npm publication.
- Any beta endpoint change.
- Any Railway project, environment, service, variable, or domain change.
- Any change to another Railway service.

## Fingerprint

The approval fingerprint is SHA-256 over the LF-normalized, LF-terminated UTF-8 content of `references/verification/material-railway-release-fingerprint-2026-07-15.txt`. Text file hashes use the same normalization. The gzip bundle uses its raw bytes:

`0830bf06faeeb14cf8fee1b050a8783d0fe6cbebdd17f7ce2a10a95b73fbaea7`

Pinned packet file hashes:

- Runner: `44508d663429abc1913e6d1b8c499a4eb541c162bb128a8301e4d3367250dbb7`
- Packet verifier: `790edab687999553bea657d69dd8987d5a283f8094e89d2fa24e8133496b251c`
- Production live gate: `922d973ba6f8648f71a7a3e97182642c93d07e4e13d9609486c9b959b6bc193e`
- Legacy live gate: `c87cd1cb2ca37ba118a65e918453246966aee4432383848a183a36a7f65e970d`

## Approval sentence

> Approve the Material Railway hydration release for fingerprint `0830bf06faeeb14cf8fee1b050a8783d0fe6cbebdd17f7ce2a10a95b73fbaea7`: deploy implementation revision `13f28d7e72484538b0a2be14f680ef8a4c4e3c52` once to Railway project `b53f5f48-607f-49ae-a71e-37cc766f6973`, production environment `6345c75b-5ac2-40d6-b176-a4a783ce3eb3`, service `352420e5-6a02-43a4-99f2-f6dbde522acb`, then require the pinned health contract and all 17 production MCP checks. If and only if the candidate reaches `SUCCESS` but fails those checks, automatically deploy rollback revision `02b2c22ea8a76decee92d83c853ca6cf33899e6c` to the same service and verify the legacy contract. No Supabase, database, storage, npm, beta, Railway configuration, or other Railway service change is authorized.
