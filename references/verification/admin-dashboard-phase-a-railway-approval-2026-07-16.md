# Admin dashboard Phase A Packet 3: Railway telemetry

Status: Ready for independent audit and owner approval. Not executed.

## Purpose

Deploy only the hosted MCP telemetry changes after the Phase A migration and admin API are live. The release writes query origin, requested limit, public-IP eligibility, and country code to the existing private usage ledger. It also carries the already verified session-aware dedupe fix.

## Pinned release

- Approval fingerprint: `ce49c7695c6ac1da7fc16777bffcfe43f9b0e18578bd38bbcc2829528bd3c5d2`
- Implementation revision: `3ce3224205c4ef13f7eb3ad0d83556db4c08c708`
- Implementation tree: `12070a25c24225b11cd19b0987cf500a23de1218`
- Rollback revision: `31ac66dfecc40e4549f08fc3d9dea99d583a3393`
- Railway project: `b53f5f48-607f-49ae-a71e-37cc766f6973`
- Railway environment: `6345c75b-5ac2-40d6-b176-a4a783ce3eb3` (`production`)
- Railway service: `352420e5-6a02-43a4-99f2-f6dbde522acb` (`scintillating-imagination`)
- Expected current deployment: `5ea2e0b8-201a-4be9-81b7-a450d7f85c61`
- Expected current image: `sha256:91288b2a0323f9af9341e8846768057968ff8bfb5af567bf644590c77a9a3b58`

## Guarded sequence

1. Reproduce the packet fingerprint and every pinned hash.
2. Require the current Railway project, environment, service, deployment, image, and health contract to match the packet.
3. Run the local telemetry, server contract, dedupe, Material hydration, and Material bundle gates.
4. Run a live health and MCP handshake check without calling any tool. This creates no synthetic usage row.
5. Upload only the pinned implementation revision to the pinned service.
6. Require the new deployment to reach `SUCCESS`.
7. Repeat the live health and MCP handshake check. Require version `0.4.18`, all 8,524 Material assets, and the four core MCP tools.
8. If the candidate reached `SUCCESS` but failed its live contract, deploy the pinned rollback revision to the same service and verify the legacy health and handshake contract.

## Telemetry gate choice

The public MCP endpoint has no authenticated release-probe identity. Sending synthetic tool calls would record them as real hosted MCP traffic. This packet therefore uses mocked local contract tests to verify the exact telemetry payload and uses only health, initialization, and tool listing against production. These live calls write no usage events. Country coverage is measured after 24 hours of eligible real traffic, excluding internal and invalid-IP rows as defined in the specification.

## Mutation budget

- Railway candidate deployments: one.
- Conditional Railway rollback deployments: one, only after a successful candidate fails its live contract.
- Railway configuration changes: zero.
- Supabase function or configuration changes: zero.
- Direct database or storage changes: zero.
- npm publications: zero.

## Approval sentence

Approve Admin dashboard Phase A Packet 3 for fingerprint `ce49c7695c6ac1da7fc16777bffcfe43f9b0e18578bd38bbcc2829528bd3c5d2`: deploy implementation revision `3ce3224205c4ef13f7eb3ad0d83556db4c08c708` once to Railway project `b53f5f48-607f-49ae-a71e-37cc766f6973`, production environment `6345c75b-5ac2-40d6-b176-a4a783ce3eb3`, service `352420e5-6a02-43a4-99f2-f6dbde522acb`, only if deployment `5ea2e0b8-201a-4be9-81b7-a450d7f85c61` and image `sha256:91288b2a0323f9af9341e8846768057968ff8bfb5af567bf644590c77a9a3b58` are still active and all local telemetry gates pass. Require the pinned live health and MCP handshake without synthetic tool calls. If the candidate reaches SUCCESS but fails that contract, deploy rollback revision `31ac66dfecc40e4549f08fc3d9dea99d583a3393` to the same service and verify it. No Railway configuration, Supabase function or configuration, direct database or storage, npm, beta, or other Railway service change is authorized.

## Execution command after approval

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/run-admin-dashboard-phase-a-railway-release.ps1 -ApprovalFingerprint ce49c7695c6ac1da7fc16777bffcfe43f9b0e18578bd38bbcc2829528bd3c5d2 -Execute
```
