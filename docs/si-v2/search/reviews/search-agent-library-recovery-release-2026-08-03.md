# Agent-friendly library recovery release record

Date: 2026-08-03
Status: exact artifacts frozen, awaiting focused artifact audit

## Release identity

- Source repair revision: `5c641bd5f06c8290d6776354a17b481f5f688e3a`
- Main merge revision: `c04082b634b7e84b494d0ef8371ad32cf0763ad9`
- Release revision: `a7d4cd6921d49d2905a226ec827da00aba84e5ba`
- Release Git tree: `09f0a5017fc3c0434520b855ad38d8a7555f33c7`
- MCP source tree: `163e432ae513c6993e2b602b2d1d1338df82b5a7`
- Package version: `0.4.27`

## Frozen npm archive

- File: `supericons-mcp-0.4.27.tgz`
- Size: 6,208,046 bytes
- SHA-256: `afcf6ee2af46d2bcf539be560fdba809cc5f47780871004fea8f1d013e476d0f`
- npm shasum: `998a834e23ad7aa95fc2cd331d1a2aeca228afe7`
- npm integrity: `sha512-i17VwpVNFVTfJ2rWNsGBrVxvLMU5Tn2QihWr1p0CcioFt5Fkh35KwbyHiozgm78kzZ6IBd0ldEABt6b5FwQd0A==`
- Packed files: 71
- Unpacked size: 25,986,693 bytes

The exact frozen archive clean-installed and passed all 225 ordered stdio cases. Its fixed-search fingerprint is `df8a55dafa58e32ba1b7ea9e1933387c9bb1c7f5ef587a758567cd36e86b2357`. Its route fingerprint is `c924440e54573024cf8570769d9f46e2e360adb3b3f90f857f3507b5f6d69874`. Every packed file matches the corresponding file in the release revision by Git blob identity.

No npm stage exists for this release yet. Nothing has been published.

## Frozen Railway source

- File: `railway-source-a7d4cd692.tar`
- Size: 284,733,440 bytes
- SHA-256: `f4bf010aa9a71a1b53e2a028906b11a918867992be1b4f738218c02610dbcd94`
- Source revision: `a7d4cd6921d49d2905a226ec827da00aba84e5ba`

Nothing has been deployed from this source archive.

## Frozen website artifact

- Files: 177
- Size: 93,692,814 bytes
- Tree SHA-256: `9747014d914fd5530c5d148dfffb478996fed554058a3caeb23ec4f60c267253`
- `index.html` SHA-256: `f98267ac2ab05fc993a2fda098215730bf1d523da8ec3c84a967e0f9004b85ce`
- Search bundle: `assets/search-pipeline-OnAEenI5.js`
- Search bundle SHA-256: `a73eb9db969031b98acb4617583465d2f9dfd29ead86bd7c3c8f2f91dd302637`

The tree hash uses the established `inventoryTree` procedure in `scripts/build-web-preview-persistence-release.mjs`. A second build used by the browser verifier produced the same 177 production files byte for byte after the normal admin-artifact cleanup.

Nothing has been deployed from this website artifact.

## Verified behavior

- The focused recovery corpus passed 33 of 33 cases at the release revision.
- Strict `si` OpenAI search kept `results` empty and named three exact alternatives in guidance.
- A weaker-agent follow-up using the guidance returned the three reviewed OpenAI references.
- Copy.ai punctuation and sentence forms remained honest zeros without generic copy-action icons.
- Reviewed `.ai` file requests returned file or Illustrator results instead of false brand zeros.
- Hosted errors remained visible and did not trigger local recovery.
- The two-lookup recovery path passed its 1,000 ms warm p95 gate.
- The built-browser corpus passed 45 of 45 cases, including visible hosted failure behavior.
- The exact npm archive passed a clean install and all 225 ordered stdio cases.
- Strict-library results never included another library.
- The MCP schema and hosted URL are unchanged.

## Change boundary

This release changes search recovery guidance, brand protection, `.ai` brand and file classification, permanent fixtures, and version metadata. It does not add icons or change the icon catalog. It does not change telemetry, database schema, admin dashboard behavior, MCP input or output schemas, or the hosted MCP URL.

The unsupported URL-path form `copy.ai/logo` remains outside this release. It must not be added without demand evidence and a separate reviewed change.

## Current public baseline and rollback references

Read-only checks on 2026-08-03 confirmed npm `latest` and Hosted MCP health still report `0.4.26`. Hosted search and grouped-search circuits were closed with zero active and queued requests.

Read-only provider checks on 2026-08-03 confirmed these current 0.4.26 rollback references:

- Railway rollback deployment: `c8e7bf9f-1e5c-40b3-b326-1b1ddf277001`
- Railway rollback image digest: `sha256:dfbb3ef144f0b44daa38cbe9cc4f495b8195d4635e0e0ab965c1af67ec42f44b`
- Website rollback deployment: `6a6de012c5d3c3c950156456`
- npm rollback version: `0.4.26`

Provider state for those deployment identifiers must be checked again immediately before any mutation.

## Focused artifact audit request

Independently verify only the frozen artifacts and their release boundary:

1. Confirm the three frozen artifact hashes and the release, Git-tree, and MCP-tree identities.
2. Clean-install the exact npm archive and rerun the 33-case recovery corpus and 225-case ordered stdio gate.
3. Confirm all 71 packed files match the release revision by Git blob identity.
4. Run the 45-case browser corpus from the exact release source and confirm the production-cleaned output matches the frozen 177-file website artifact.
5. Confirm hosted failures remain visible and cannot be replaced by local results.
6. Confirm no telemetry, schema, database, catalog, admin, plugin, or unrelated UI behavior entered the release.
7. Confirm npm `latest`, Hosted MCP, and the public website remain unchanged during the audit.

After artifact GO, deploy Railway and the website using only the frozen inputs. Run signed controlled production checks for Copy.ai, `.ai` files, strict OpenAI recovery, and forced hosted failure behavior. Only after provider verification should the exact npm archive be staged for owner approval and publication.

Any artifact byte change cancels this record and requires new hashes and another focused artifact audit.
