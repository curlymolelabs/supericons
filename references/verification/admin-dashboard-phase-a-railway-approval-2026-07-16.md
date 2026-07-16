# Admin dashboard Phase A Packet 3S: Railway dependency recovery, database protection, and telemetry

Status: Ready for independent audit. Not executed.

## Purpose

Recover from Packet 3R's pre-activation startup failure, then protect the shared search database before the Phase A admin API release. Packet 3R built successfully but could not start because Railway's root production install did not include the two GeoIP packages used by the MCP runtime. The active production deployment never changed.

The recovery declares both GeoIP packages in the root Railway install and adds a clean production-install import gate before upload. The hosted MCP change also removes automatic 5xx retries, caps overlapping engine requests, and opens a short circuit after repeated dependency failures. The same release carries the already verified Phase A telemetry and session-aware dedupe changes.

This packet now runs before Packet 2U. Packet 1 already added the nullable telemetry columns, so the Railway write path does not depend on the new admin API being live.

## Pinned release

- Approval fingerprint: `07abd6cafb65ae04d8e65291fd6b9450fe5d785944e33a6c9836114a364a9dac`
- Implementation revision: `e071fe7966dac6e2316d228ecf82a966af8d3cd2`
- Implementation tree: `29c06e3f6ab6a50253cc9cb26ac327e554f8a560`
- Rollback revision: `31ac66dfecc40e4549f08fc3d9dea99d583a3393`
- Railway project: `b53f5f48-607f-49ae-a71e-37cc766f6973`
- Railway environment: `6345c75b-5ac2-40d6-b176-a4a783ce3eb3` (`production`)
- Railway service: `352420e5-6a02-43a4-99f2-f6dbde522acb` (`scintillating-imagination`)
- Expected current deployment: `5ea2e0b8-201a-4be9-81b7-a450d7f85c61`
- Expected current image: `sha256:91288b2a0323f9af9341e8846768057968ff8bfb5af567bf644590c77a9a3b58`
- Expected latest failed deployment: `a62e67b8-be35-4e42-aefb-0a95a2efa714`

## Retained Packet 3R attempt

Packet 3R candidate `a62e67b8-be35-4e42-aefb-0a95a2efa714` ended `FAILED` during the startup health check with `ERR_MODULE_NOT_FOUND` for `maxmind`. It never became active. Railway kept serving deployment `5ea2e0b8-201a-4be9-81b7-a450d7f85c61`, so no rollback deployment was needed. The preflight and failed-attempt records are retained and pinned into this packet.

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
3. Require Railway's latest failed deployment to match the retained Packet 3R attempt and the active deployment to match the pinned healthy production image.
4. Run the clean root production-install gate. It must install from only the root package files, import `mcp/usage-attribution.js`, load both pinned GeoIP packages, and resolve a known dataset lookup.
5. Run the local resilience, telemetry, server, dedupe, Material hydration, and Material bundle gates.
6. Run a live health and MCP handshake check without calling any tool. Require the current service to have no resilience block yet.
7. Upload only the pinned implementation revision to the pinned service.
8. Require the new deployment to reach `SUCCESS`.
9. Repeat the live health and MCP handshake. Require version `0.4.18`, all 8,524 Material assets, the four core MCP tools, and the closed resilience circuit with limits 2 and 8.
10. If the candidate reached `SUCCESS` but failed its live contract, deploy the pinned rollback revision and verify the old health and handshake contract.

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
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/run-admin-dashboard-phase-a-railway-release.ps1 -ApprovalFingerprint 07abd6cafb65ae04d8e65291fd6b9450fe5d785944e33a6c9836114a364a9dac -Execute
```
