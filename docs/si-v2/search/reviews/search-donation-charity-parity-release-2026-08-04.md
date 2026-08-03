# Donation and charity parity release record

Date: 2026-08-04
Status: artifacts prepared and verified

## Release identity

- Source repair revision: `994a8fd2f12aa44b4f7456750b13c36ab924ce1e`
- Main merge revision: `87e793d395e2c932f734eb2c996dc4080cdb8fab`
- Release revision: `cdef47e089c83683ea29c19a925ee2cc971fc77a`
- Release Git tree: `b5397a15453544d8f8248cbaae3d7b05c7ff73cd`
- MCP source tree: `806d8111ada42d0fb9bed152c2734bab4b1e32b9`
- Package version: `0.4.28`

## Frozen npm archive

- File: `supericons-mcp-0.4.28.tgz`
- Size: 6,208,361 bytes
- SHA-256: `ebb27bfb646b8823951277bda5ceecec83ac13d63ed40ffe7a9368201bc214c6`
- npm shasum: `a77bdf11778f6498cae8a21ea6e1736be903661b`
- npm integrity: `sha512-RX/NDWdKBV9fKH2wTIHH87vhFLHtdEXBn8creqlecz+iMTfKNO2wySY1M9Aa42lzZS1JxSCfbyCw9xICiCS1yA==`
- Packed files: 71
- Unpacked size: 25,987,214 bytes

Every packed file matches its release-source counterpart byte for byte. A clean installation of the exact archive reported zero known npm vulnerabilities. The exact archive passed the 13-case donation and charity corpus and all 225 established ordered cases. The established search fingerprint remained `df8a55dafa58e32ba1b7ea9e1933387c9bb1c7f5ef587a758567cd36e86b2357`, and the locale-route fingerprint remained `c924440e54573024cf8570769d9f46e2e360adb3b3f90f857f3507b5f6d69874`, with zero changed cases.

## Frozen Railway source

- File: `railway-source-cdef47e08.tar`
- Size: 284,764,160 bytes
- SHA-256: `b8bbac990f9d2b9298179eb20fcc60fac3d741db3bd037dd528ba1d565a274c4`
- Source revision: `cdef47e089c83683ea29c19a925ee2cc971fc77a`

The hosted-route safety gate passed hosted-primary routing, valid-zero local fallback, hosted-error visibility, retrieval concurrency, and recommendation scope.

## Frozen website artifact

- Files: 192
- Size: 94,356,413 bytes
- Tree SHA-256: `47f1b8186281a7a3db9e21a51319dba8f49577db6d76fa96fafb5cf4186a1a77`
- `index.html` SHA-256: `d0d285445b64853b7ccdd8f47262aa4b5f091b8c2256182faa05aab40ac758ef`
- Search bundle: `assets/search-pipeline-DpJpJ0Yy.js`
- Search bundle SHA-256: `9bd8e46f2e18a1c5e732e4086302e01fcb737019e71c27ae733680b2357e5f1c`

Two independent builds from the release revision produced the same file count, byte count, and established inventory-tree hash. The 192-file count includes all 118 Material SVG exports in the pinned source. Read-only checks confirmed all 118 are already live on the 0.4.27 website, so this is not an added website-content change. The previous 177-file release record understated the live inventory.

The exact release source passed the built-browser corpus: 47 of 47 cases. `donation` and `charity donation heart` returned the reviewed hand-heart family. Hosted dependency failures remained visible.

## Verified behavior

- Local `donation` returns reviewed hand-heart icons rather than an empty result.
- Local `charity donation heart` returns reviewed hand-heart icons.
- The focused corpus passed 13 of 13 through both the shared pipeline and the actual Local MCP package.
- Strict-library behavior and honest zero results remain intact.
- The 225-case established corpus had zero result changes.
- The 47-case browser corpus passed.
- Warm local search p95 was 412.5 ms against the 500 ms gate.
- The MCP schema and hosted URL are unchanged.

`blood donation` is preserved from the prior baseline, but its leading result remains `material:blood_pressure`. `charity organization` remains an honest zero. These are separate quality items and are not expanded into this release.

## Change boundary

This release adds reviewed donation and charity aliases, permanent fixtures, verification, and version metadata. It does not change telemetry, database schema, icon catalog content, admin dashboard behavior, hosted routing, MCP schemas, or the hosted MCP URL.

The website build uses PostCSS in the controlled build environment. The root build dependency audit reports one moderate PostCSS advisory. The published MCP archive has zero known vulnerabilities and does not contain that build dependency. Dependency maintenance is recorded separately and is not mixed into this search repair.

## Current public baseline and rollback references

Read-only checks on 2026-08-04 confirmed:

- Railway rollback deployment: `d13a7856-9949-4a63-9480-ba0a497597bf`
- Railway rollback image digest: `sha256:347dc973a5ccc0a0abb156f9ad2b05a06c85932039f9a103928b646c8643a9f0`
- Website rollback deployment: `6a70a8a3b02de82554449442`
- npm rollback version: `0.4.27`
- Public npm archive SHA-256: `afcf6ee2af46d2bcf539be560fdba809cc5f47780871004fea8f1d013e476d0f`
- Hosted MCP health version: `0.4.27`
- Hosted and grouped search circuits: closed, with zero active and queued requests

Provider state must be checked again immediately before each mutation. Only the frozen inputs named in this record may be deployed or staged. Any artifact byte change cancels this record and requires new hashes.

## Release sequence

1. Secure the release history on the established source remote.
2. Deploy the frozen Railway source and verify signed controlled donation cases plus health.
3. Deploy the frozen website directory and verify live file hashes plus the browser decision.
4. Stage the unchanged npm archive, download it, and confirm its SHA-256.
5. Request owner approval for the exact npm stage.
6. After publication, verify the public archive hash and restore `latest` to 0.4.27 if identity or behavior checks fail.
