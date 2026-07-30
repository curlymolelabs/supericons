# Search v2 assessment checklist recall release

Date: 2026-07-30
Status: released and verified on Railway, the website, and npm

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
- Website artifact size: 93,688,050 bytes
- Website artifact tree SHA-256: `697edfcc95bdf93009dc8e7fa1f6b2c6ffb91c947138343a39668c6d21776421`
- Railway deployment: `094b470a-e633-4f86-9ce6-19da91cc2a55`
- Railway image digest: `sha256:26b71e38a3cb538eea9f3fb8b001a6871f8b38cfbae3b8d3e6005e27d4921e80`
- Website deployment: `6a6a72f067e468d23496b5fb`

The archive downloaded from npm stage `396fb152-c828-40e9-badb-bdc4fd3711d2` is byte-identical to the frozen local archive. Both have SHA-256 `afa7ad88232c53baea88313421eb508a2f1e1e48f7099935ad6a45a3535f9287`.

The website artifact was rebuilt once in an isolated worktree pinned to release revision `70f1252926c0cbc92d0d1470098e9d4641a122d0`. The copied frozen directory is byte-identical to that isolated build. Its tree hash uses the established `inventoryTree` procedure in `scripts/build-web-preview-persistence-release.mjs`.

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
- Production HTTP returned the exact five reviewed Lucide checklist icons in `hosted_fused` mode.
- Production MCP returned the same five reviewed Lucide checklist icons in the same order.
- The live website index and changed search bundle are byte-identical to the frozen audited files.
- A real browser search displayed the repaired checklist family and called the hosted search endpoint.
- npm `latest` resolves to `0.4.26`.
- The public npm archive is byte-identical to the audited staged archive at SHA-256 `afa7ad88232c53baea88313421eb508a2f1e1e48f7099935ad6a45a3535f9287`.
- Public npm metadata reports 71 files, unpacked size 25,955,891 bytes, shasum `8863405b1c16695e30e623ad31fb9c309dbf182a`, and the audited integrity value.

## Production and rollback targets

Railway, the website, and npm now serve the 0.4.26 release.

- npm `latest`: `0.4.26`
- Railway deployment: `094b470a-e633-4f86-9ce6-19da91cc2a55`
- Railway image digest: `sha256:26b71e38a3cb538eea9f3fb8b001a6871f8b38cfbae3b8d3e6005e27d4921e80`
- Railway rollback deployment: `61fe6aa7-aa61-42ba-884d-466af9a92e6f`
- Railway rollback image digest: `sha256:c65fe498fd50d1a92e7f76078f7b6a5d3893bf04f1efd00c3e807658aff8800b`
- Website deployment: `6a6a72f067e468d23496b5fb`
- Website rollback deployment: `6a6a497735044883fa5bbcc7`

Railway reports deployment `094b470a-e633-4f86-9ce6-19da91cc2a55` as successful. Netlify reports website deployment `6a6a72f067e468d23496b5fb` as ready and published.

## Release boundary

The owner approved the exact npm stage. Railway, the website, and npm used only the exact source and website bytes covered by focused artifact verification.

No rebuild or restage is allowed after approval. Any byte change requires a new hash and another exact-artifact check.
