# Material Packet 4R snapshot deploy approval

Date: 2026-07-14

Status: Ready for independent review and owner approval. No Packet 4 or Packet 4R deployment has run.

## Why Packet 4R replaces Packet 4

The owner approved Packet 4, but its pre-deploy type check failed before the deployment command ran. Current Deno resolved `ReturnType<typeof createClient>` to a generic Supabase client type that did not accept the actual client returned by `createClient`. The approved project login, pinned function content, public gateway configuration, and Material seeder checks all passed.

The correction replaces the inferred generic return type with the public `SupabaseClient` type. This is a type-only change. The function request handling, asset paths, storage access, response bodies, and headers are unchanged. A dedicated `verify:material-snapshot-function` command now runs the exact Deno check that stopped Packet 4.

Packet 4 made no production change. The deployment command never ran.

## Pinned packet

- Release fingerprint: `534b6bb9e1405a6a15096081f8245117f5f470cdf22044c57640d06afa393b5a`
- Deploy revision: `c0cb32f16009e9a2684fba2b4d8f3d0c67d6c6f6`
- Function normalized SHA-256: `da427256b668f0607100d86cd869a2578bb5048afe1d0717d1d03948be3a544c`
- Supabase config normalized SHA-256: `4b269bece10187113107e019fdac3db55752d4faf24693fbc7aa543d29d50df3`
- Package manifest normalized SHA-256: `85de631341f6afa894ea40bb4ffeb9e5b75b71986f5b737f92098e77147ba3c9`
- Hash mode: LF-normalized UTF-8 without a byte-order mark
- Supabase project: `kcjmkakdhsqplvasgkjv`
- Function: `serve-material-snapshot`
- Approval fingerprint: `22b17c4a72a32edb1fe45ec99099d8756df5ffe2de82df0a95d087a4b0084e33`

The approval fingerprint is SHA-256 over this exact UTF-8 text with LF line endings, including one trailing LF after the final line:

```text
packet=material_snapshot_function_deploy_typecheck_recovery
release_fingerprint=534b6bb9e1405a6a15096081f8245117f5f470cdf22044c57640d06afa393b5a
deploy_revision=c0cb32f16009e9a2684fba2b4d8f3d0c67d6c6f6
function_normalized_sha256=da427256b668f0607100d86cd869a2578bb5048afe1d0717d1d03948be3a544c
config_normalized_sha256=4b269bece10187113107e019fdac3db55752d4faf24693fbc7aa543d29d50df3
package_normalized_sha256=85de631341f6afa894ea40bb4ffeb9e5b75b71986f5b737f92098e77147ba3c9
hash_mode=lf_normalized_utf8
project_ref=kcjmkakdhsqplvasgkjv
function_name=serve-material-snapshot
verify_jwt=false
source_revision=30f8fddd293b1f0189896dc4aaecdfaba1d37ae0
outline_checksum=56d601be3e1f01215f4c757f98829109f0e5c0d7817718147cc495ba7fbcbeef
solid_checksum=f00b353efc4767f8b30359f28e9289cc45fcbce9a037d4e237fdb50b5e7d71d7
deployments_authorized=1
```

## Authorized activity

Deploy only `serve-material-snapshot` from the pinned revision to the pinned Supabase project with gateway JWT verification disabled. Then request `material:settings` in the fixed outline and solid presets.

Require both responses to return HTTP 200, SVG content, the exact pinned body checksum, `X-Cache-Status: hit`, the exact axes, and source revision `30f8fddd293b1f0189896dc4aaecdfaba1d37ae0`.

No search deploy, database mutation, seed, deletion, Railway deploy, npm publication, beta change, or second function deployment is authorized.

## Pre-deploy evidence

- Supabase CLI project access passed for `kcjmkakdhsqplvasgkjv`.
- The original Packet 4 function and config matched revision `425d8c2873e244988ed93ade18396e0f5c688f5e` before the type check ran.
- `npm run verify:material-seeder` passed with four selected assets and no hosted mutation.
- `npm run verify:material-snapshot-function` passes after the type-only correction.
- `git diff --check` and the prohibited-character scan pass.
- Live pre-deploy requests returned HTTP 200, cache hits, fixed outline and solid axes, and the two pinned checksums. The current production function does not return the pinned source-revision header, which distinguishes it from the deploy candidate.

## Guarded sequence

1. Confirm the authenticated Supabase session can access only the approved project for this command.
2. Recompute the three LF-normalized hashes and the Packet 4R approval fingerprint.
3. Run `npm run verify:material-snapshot-function` and `npm run verify:material-seeder`.
4. Require both probe checksums to match the pinned validation report before deployment.
5. Deploy only `serve-material-snapshot` with `--no-verify-jwt`.
6. Repeat both probes and require the pinned checksums, cache-hit headers, exact axes, and pinned source-revision header.
7. Record the deployment and probe evidence. Do not rerun this packet.

## Rollback

If the deployment command succeeds but either post-deploy probe fails, stop before every later packet. Do not deploy another function under this approval. Prepare a separately pinned rollback packet from the known pre-Packet 4 function revision or use the Supabase deployment history after separately approving that rollback.

## Approval sentence

> Approve Material production Packet 4R for fingerprint `22b17c4a72a32edb1fe45ec99099d8756df5ffe2de82df0a95d087a4b0084e33`: deploy only `serve-material-snapshot` from revision `c0cb32f16009e9a2684fba2b4d8f3d0c67d6c6f6` with public gateway JWT verification disabled, then require the two fixed `material:settings` probes to match their pinned SVG checksums, axes, cache-hit headers, and source revision. No search deploy, database mutation, seed, deletion, Railway deploy, npm publication, beta change, rollback deployment, or second function deployment is authorized.
