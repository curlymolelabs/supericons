# Search v2 assessment checklist recall release

Date: 2026-07-30
Status: npm staged; Railway and website not deployed

## Release identity

- Search repair revision: `98c789171d907e66b8efff798455aa197ffd60a7`
- Release revision: `70f1252926c0cbc92d0d1470098e9d4641a122d0`
- Release Git tree: `c53cb6621bf9db38c8d6f0a193a75f5c37b32795`
- MCP source tree: `56a26b8be4ca823ab79a7c3d5fd1504380aeb768`
- Package version: `0.4.26`
- npm stage: `396fb152-c828-40e9-badb-bdc4fd3711d2`
- npm archive SHA-256: `afa7ad88232c53baea88313421eb508a2f1e1e48f7099935ad6a45a3535f9287`
- npm shasum: `8863405b1c16695e30e623ad31fb9c309dbf182a`
- npm integrity: `sha512-YW7apj4FaclBsNVPqk7msbK+IrdLGECYSSZWlc3AbU7QpGCkCc8p8YQPWP79UGDNREE2L31Gg9Ai7yklk4FDRg==`
- npm archive size: 6,204,011 bytes
- npm unpacked size: 25,955,891 bytes
- npm packed files: 71
- Website artifact files: 177
- Website artifact size: 93,663,111 bytes
- Website artifact tree SHA-256: `d60a929f1d7461c3b3d2fedf847018f1ea87dc0c2da586fbd137830a476e05cc`

The archive downloaded from npm stage `396fb152-c828-40e9-badb-bdc4fd3711d2` is byte-identical to the frozen local archive. Both have SHA-256 `afa7ad88232c53baea88313421eb508a2f1e1e48f7099935ad6a45a3535f9287`.

## Change scope

This release adds a bounded assessment and quality-assurance checklist intent group. It does not add a broad standalone checklist rule.

Reviewed phrases:

- `quality assurance checklist`
- `assessment checklist`
- `qa checklist`
- `inspection checklist`
- `audit checklist`

The change does not include telemetry, database, admin, catalog, or unrelated user-interface behavior.

## Verified behavior

- The focused checklist corpus passed 12 of 12 cases.
- The exact Lucide query returned `list-check`, `list-checks`, `clipboard-check`, `clipboard-list`, and `file-check`.
- Shopping-list controls remained shopping results.
- Nonsense remained an honest zero result.
- The intent graph passed with 71 groups and 27 fixtures.
- The shared and built-browser corpus passed 35 of 35 cases.
- Hosted failures remained visible.
- All 225 package cases had zero changed baseline cases.
- The fixed-search fingerprint remained `df8a55dafa58e32ba1b7ea9e1933387c9bb1c7f5ef587a758567cd36e86b2357`.
- The exact npm archive passed a clean installation and all 225 ordered stdio cases.
- Independent local latency verification measured p95 at 411.2 ms against the 500 ms gate.

## Current production and rollback targets

The current production release remains version 0.4.25.

- npm `latest`: `0.4.25`
- Railway deployment: `61fe6aa7-aa61-42ba-884d-466af9a92e6f`
- Railway image digest: `sha256:c65fe498fd50d1a92e7f76078f7b6a5d3893bf04f1efd00c3e807658aff8800b`
- Railway rollback deployment: `84443e56-93a4-40eb-9391-98f7e513a345`
- Website deployment: `6a6a497735044883fa5bbcc7`
- Website rollback deployment: `6a67697fec402812099efd9b`

Railway currently reports deployment `61fe6aa7-aa61-42ba-884d-466af9a92e6f` as successful. Netlify currently reports website deployment `6a6a497735044883fa5bbcc7` as published.

## Release boundary

The npm stage is private and requires owner approval before publication. Railway and website deployment remain blocked until the frozen npm archive, MCP source tree, and website artifact receive focused artifact verification.

No rebuild or restage is allowed after approval. Any byte change requires a new hash and another exact-artifact check.
