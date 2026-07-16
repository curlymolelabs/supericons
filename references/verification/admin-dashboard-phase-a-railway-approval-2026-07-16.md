# Admin dashboard Phase A Packet 3R: Railway database protection and telemetry

Status: Ready for independent audit. Not executed.

## Purpose

Protect the shared search database before the Phase A admin API release. The hosted MCP change removes automatic 5xx retries, caps overlapping engine requests, and opens a short circuit after repeated dependency failures. The same release carries the already verified Phase A telemetry and session-aware dedupe changes.

This packet now runs before Packet 2U. Packet 1 already added the nullable telemetry columns, so the Railway write path does not depend on the new admin API being live.

## Pinned release

- Approval fingerprint: `bb9e5e5c8dc96dbb5f88d0f46206cb33a7675697443a7e1f5f2ea5d62cb48a92`
- Implementation revision: `dbec69dc768cd10d2978b2872be993a5c86de78b`
- Implementation tree: `c985431c2988b8b02ae76ff785e54dd2c1db11cc`
- Rollback revision: `31ac66dfecc40e4549f08fc3d9dea99d583a3393`
- Railway project: `b53f5f48-607f-49ae-a71e-37cc766f6973`
- Railway environment: `6345c75b-5ac2-40d6-b176-a4a783ce3eb3` (`production`)
- Railway service: `352420e5-6a02-43a4-99f2-f6dbde522acb` (`scintillating-imagination`)
- Expected current deployment: `5ea2e0b8-201a-4be9-81b7-a450d7f85c61`
- Expected current image: `sha256:91288b2a0323f9af9341e8846768057968ff8bfb5af567bf644590c77a9a3b58`

## Database protection contract

1. At most two hosted engine requests may run at once in one Railway process. At most eight more may wait for five seconds.
2. HTTP 5xx responses are not retried inside the hosted MCP client. Two failed calls now create two dependency requests, not six.
3. Two dependency failures open the circuit for 30 seconds. Calls during that window fail fast and use the existing local fallback where available.
4. One request may test recovery after the 30-second window. A success closes the circuit; a dependency failure opens it again.
5. Each hosted dependency request has a 20-second client timeout.
6. The public health response reports the circuit state, active requests, queue depth, and the fixed limits.

This is a Railway request cap, not a change to the query-variant fan-out inside `mcp-search`. A true per-variant database concurrency change remains part of the separate Search v2 or engine lane.

## Guarded sequence

1. Reproduce the packet fingerprint and every pinned hash.
2. Require the current Railway project, environment, service, deployment, image, and health contract to match the packet.
3. Run the local resilience, telemetry, server, dedupe, Material hydration, and Material bundle gates.
4. Run a live health and MCP handshake check without calling any tool. Require the current service to have no resilience block yet.
5. Upload only the pinned implementation revision to the pinned service.
6. Require the new deployment to reach `SUCCESS`.
7. Repeat the live health and MCP handshake. Require version `0.4.18`, all 8,524 Material assets, the four core MCP tools, and the closed resilience circuit with limits 2 and 8.
8. If the candidate reached `SUCCESS` but failed its live contract, deploy the pinned rollback revision and verify the old health and handshake contract.

## Live gate choice

The public MCP endpoint has no authenticated release-probe identity. Synthetic tool calls would be recorded as real traffic. This packet therefore verifies behavior with local HTTP fixtures and uses only health, initialization, and tool listing against production. These live calls write no usage event.

## Mutation budget

- Railway candidate deployments: one.
- Conditional Railway rollback deployments: one, only after a successful candidate fails its live contract.
- Railway configuration changes: zero.
- Supabase function or configuration changes: zero.
- Direct database or storage changes: zero.
- npm publications: zero.

## Execution authority

The standing owner delegation applies after independent audit GO. No hidden secret is required for this Railway packet.

## Execution command after audit GO

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/run-admin-dashboard-phase-a-railway-release.ps1 -ApprovalFingerprint bb9e5e5c8dc96dbb5f88d0f46206cb33a7675697443a7e1f5f2ea5d62cb48a92 -Execute
```
