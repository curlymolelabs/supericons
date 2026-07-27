# Search pipeline unification release

Date: 2026-07-27

## Purpose

This release removes the search decision split between the website and the local npm package. The browser and npm package now use the same shared public search pipeline while the hosted service keeps its protected hosted ranking and routing rules.

Telemetry attribution is not part of this release.

## Release identity

- Source revision: `a8cf0f07c8e099e3913296f7fa4cc7b90bc9b07d`
- Main integration revision: `3328fe3d2`
- MCP package candidate: `@supericons/mcp@0.4.23`
- npm stage: `cd7f7139-61fb-48b8-8e87-f9217093ef30`
- MCP archive SHA-256: `1e5be0a41cf6685f8d3bbe1a526a0a274e69d43645a4996ff55b19969327a17e`
- MCP archive npm shasum: `1bc3fd346a7ea0218facbb59687134d7d7dbaaf9`
- Web artifact tree SHA-256: `df6e11875d12f43ccdb0180ee5d51a60562f4d1874571efa8ab3e90cc9dbafeb`
- Common-snapshot corpus SHA-256: `4e8bbba5c82e93f435313e9107fd207cf5c885ac53d1196f5f38cd1c0c4b4f64`

## What changed

- The website and npm package now call one shared public search pipeline.
- Multiword phrases use bounded query variants instead of stopping at the full phrase.
- Known misleading matches are filtered before results are shown.
- Exact references, library limits, style limits, locale handling, and honest no-result behavior are preserved.
- Hosted network and server errors remain visible. Local results cannot hide an invalid hosted response.
- The browser loads the shared search code only when the first search begins.

## Verification

The historical pipeline failed 11 of 21 decision cases. The release candidate passes all 21 through both the npm adapter and a built browser artifact.

Additional checks passed:

- 225 local parity cases
- Exact archive installation and 225 stdio cases
- Downloaded npm stage matched the audited archive byte-for-byte and passed the exact archive verifier
- 39 remote-server cases through both HTTP and MCP
- Maintained multilingual fixtures
- Real browser smoke tests on the production website
- Isolated local latency p95 below the 500 ms release limit in three repeated runs

The production browser smoke produced:

| Query | Result |
|---|---|
| `hard hat construction worker` | 55 icons, with a hard-hat result first |
| `network proximity graph nodes` | 83 icons, including graph results |
| `スポーツ` | 94 sports results |
| `florblequux` | Honest no-result message |

## Production state

Railway deployment `df24709f-ae4f-4003-a00d-091750952804` is active with image digest `sha256:60599be89fa5f7b8ad563fc7b18e426b1962255b318d14647da652b6c42ca95d`.

Netlify deploy `6a67697fec402812099efd9b` is active on `https://supericons.dev`.

The live 39-case Railway product matrix passed for both the public HTTP route and hosted MCP. The hosted MCP URL and tool schemas did not change, so existing hosted clients and submitted plugin configurations do not require an update.

The npm `latest` tag remains at `0.4.22`. Stage `cd7f7139-61fb-48b8-8e87-f9217093ef30` holds the exact audited 0.4.23 archive and is ready for owner approval.

## Rollback

- Railway rollback source: revision `4445e3d8c`
- Previous Railway deployment: `c8243baa-b790-421d-ace7-daff51732b30`
- Previous Netlify deploy: `6a673845fe070f06068470f1`
- npm rollback after publication: move `latest` back to `0.4.22`

## Remaining release step

Approve stage `cd7f7139-61fb-48b8-8e87-f9217093ef30` in the npm browser, then verify that the public 0.4.23 archive matches the audited bytes. No other production surface is waiting on this step.

