# Material Railway hydration recovery approval

Date: 2026-07-15

Status: Ready for owner-coordinated audit. Not executed.

## Outcome

This packet retries the already verified Railway Material hydration release without changing its implementation. It uses a retryable stability precondition and separates deterministic Material checks from checks that depend on the existing Supabase search engine.

The candidate serves all 8,524 pinned Material SVG assets from the Railway MCP bundle. It does not deploy or modify the Supabase search function.

## Why a recovery packet is justified

The first candidate reached Railway status `SUCCESS` and passed nine production checks before the first all-mode search exceeded the MCP client's 60-second timeout. Material search, exact lookup, recommendations, previews, both styles, and 40 relevance searches had already passed.

Direct search-engine probes from a separate network path recorded an overlapping congestion period. The retained notes are in `references/verification/material-railway-incident-engine-probes-2026-07-15.json`. The probe record supports a dependency-related explanation for the timed-out request but does not identify the underlying database cause.

The original packet completed its authorized rollback. Production is currently healthy on the verified pre-Material deployment.

The first recovery packet then stopped before upload because its second direct probe completed in 3,508.5 ms against a 3,000 ms health threshold. The response was HTTP 200 with the required three Lucide results. The retained attempt record is `references/verification/material-railway-recovery-preflight-attempt-2026-07-15.md`.

This respin raises only the dependency health threshold to 5,000 ms and lets the read-only preflight try up to three numbered windows. The 3,000 ms user-facing engine gate remains separate.

## Pinned implementation

- Implementation revision: `13f28d7e72484538b0a2be14f680ef8a4c4e3c52`
- Implementation tree: `27668ce5ff4027aabe28432f1ce2eaf6386bb109`
- Material bundle SHA-256: `66ef383bad9e3847da107f0d8f37f0bd1cb695afd4e3c4cd3470ef1c97723ed9`
- Upstream Material revision: `30f8fddd293b1f0189896dc4aaecdfaba1d37ae0`
- Material assets: 8,524 total, 4,262 outline and 4,262 solid
- Expected MCP version after deployment: `0.4.18`

The implementation is byte-for-byte the same revision that passed the first candidate's Material production checks. This packet changes release verification only.

## Exact Railway target

- Project: `supericons-converter-node` (`b53f5f48-607f-49ae-a71e-37cc766f6973`)
- Environment: `production` (`6345c75b-5ac2-40d6-b176-a4a783ce3eb3`)
- Service: `scintillating-imagination` (`352420e5-6a02-43a4-99f2-f6dbde522acb`)
- Public MCP URL: `https://mcp.supericons.dev/mcp`
- Current deployment: `e789c810-ad5d-4808-9bdc-396a799372c5`
- Current image digest: `sha256:043f4d748963bcd3e6198880472066a02690351569c601db0ef289b52cef9392`
- Search control URL: `https://kcjmkakdhsqplvasgkjv.supabase.co/functions/v1/mcp-search`

The runner stops before any upload if the Railway project, environment, service, deployment ID, image digest, or legacy health contract has changed.

## Pre-upload stability requirement

Before an upload, the runner sends six direct Lucide search probes to the stable search function over three minutes:

- Six consecutive HTTP 200 responses are required.
- Every response must contain three Lucide results.
- Every response must finish within 5,000 ms.
- The probes use `source=verify`, `channel=internal_test`, `environment=production`, and `client_family=material_railway_recovery`.
- A failed window writes numbered evidence and does not consume the packet immediately.

The probe interval is 36 seconds, so the first and sixth probes are separated by 180 seconds.

The runner may try up to three numbered stability windows inside a 15-minute retry budget. It waits 90 seconds after a failed window if another attempt fits inside the remaining budget. The first complete healthy window permits the upload. If no window passes, the runner stops before upload and retains every attempt.

## Split production gates

After the candidate reaches `SUCCESS` and reports the complete 8,524-asset health contract, the runner applies two gate classes.

### Material-local gates

The following 11 checks run once. They are not retried:

- Bundle health and capability count
- Material outline search and exact lookup
- Material solid search and exact lookup
- Distinct outline and solid payloads
- Real PNG preview from fixed Material references
- The 20-query relevance fixture in both styles, with every query accepted in the first five results
- Warm p95 at or below 2,000 ms for strict Material search, exact lookup, and preview

Any failure is a candidate failure and triggers the verified rollback.

### Engine-dependent gates

The following six checks may run up to three times within a ten-minute window:

- Material recommendation with valid SVG
- All-mode `settings` with 10 deliverable results
- All-mode `cog` with 10 deliverable results
- All-mode solid with 10 deliverable Material results
- Lucide strict regression behavior
- Recommendation warm p95 at or below 3,000 ms

Each all-mode, Lucide, and initial recommendation request must also complete within 3,000 ms. The MCP transport timeout is 120 seconds so a slow successful response is retained and classified by the latency gate instead of appearing only as a 60-second transport timeout.

After each failed engine-dependent attempt, the runner sends one direct search-engine control probe:

- A control is healthy only when it returns the required result set within 5,000 ms.
- Healthy control plus failed candidate gate means candidate failure and immediate rollback.
- A failed, invalid, or slower control means an engine episode. The runner waits 90 seconds and retries if time and attempts remain.
- Three degraded attempts, or expiry of the ten-minute retry window, means the candidate remains unverified. The runner restores the verified rollback revision and records `dependency_unresolved_after_retry_budget` or `dependency_unresolved_after_retry_window`.

This final rule fails closed. The runner never leaves an incompletely verified candidate active.

## Automatic rollback

Rollback is authorized only after a candidate reaches Railway status `SUCCESS` and then fails health or a production gate, or exhausts the dependency retry budget.

The rollback uploads the exact verified pre-Material source checkpoint:

- Revision: `02b2c22ea8a76decee92d83c853ca6cf33899e6c`
- Tree: `b5cea763f36be4e32453d4e1aca49988a4d3a72f`
- Expected restored version: `0.4.17`

The legacy gate must then show a healthy service, three valid Lucide results, and the known pre-release Material zero-result behavior. A candidate build that never reaches `SUCCESS` does not trigger another deployment.

## Evidence retention

All production evidence paths are write-once. The packet retains:

- Legacy preflight behavior
- Up to three numbered six-probe search-engine stability preflights
- The single-attempt Material-local gate
- Up to three engine-dependent attempt artifacts
- A direct control artifact after each failed engine-dependent attempt
- Completion evidence or verified rollback evidence

## Mutation boundary

Authorized after owner approval:

- One Railway candidate deployment to the exact pinned service.
- One conditional Railway rollback deployment to the same service under the rules above.
- Bounded health, MCP, and direct search verification requests.
- Ordinary telemetry rows produced by the approved verification traffic.

Not authorized:

- Any Supabase function deployment or configuration change.
- Any direct database command, migration, seed, deletion, or storage change.
- Any npm publication.
- Any beta endpoint change.
- Any Railway project, environment, service, variable, domain, or replica change.
- Any change to another Railway service.

## Fingerprint

The approval fingerprint is SHA-256 over the LF-normalized, LF-terminated UTF-8 content of `references/verification/material-railway-recovery-fingerprint-2026-07-15.txt`. Text file hashes use the same normalization. The gzip bundle uses its raw bytes:

`8990c4ae5a0b5d9362d0dcd16bdc9b2a202ed1e6bec7af5710d0c113cd6c9939`

Key pinned packet hashes:

- Runner: `ac4b0e9618cd22e143220f1518b50d3c4fa2d5f5f94787fdd44e5c986fa1af82`
- Packet verifier: `051d6ceac9887e0e654f6444cdb1b90f5c5a72c556f7bdb2ef3917c260559af2`
- Split recovery gate: `1a364416953be026a0a1a72fc7f3115bcbb8c7efdfcf89ddb107734035c09cdf`
- Direct search probe: `abaa6601236c625387ad03b3084609fb9d569083dbc43dc6d304856a3b2c7941`
- Direct search probe verifier: `30602fb5e3394432592f8f257aa330e260519a5b499113c68ebe546db49d0809`

## Approval sentence

> Approve the Material Railway hydration recovery for fingerprint `8990c4ae5a0b5d9362d0dcd16bdc9b2a202ed1e6bec7af5710d0c113cd6c9939`: allow up to three numbered preflight windows within 15 minutes, each requiring six consecutive direct-engine probes over three minutes with all responses HTTP 200 under 5,000 ms, then deploy implementation revision `13f28d7e72484538b0a2be14f680ef8a4c4e3c52` once to Railway project `b53f5f48-607f-49ae-a71e-37cc766f6973`, production environment `6345c75b-5ac2-40d6-b176-a4a783ce3eb3`, service `352420e5-6a02-43a4-99f2-f6dbde522acb`. Run the 11 Material-local checks once and allow up to three engine-dependent attempts over ten minutes, with a direct control probe using the same 5,000 ms health threshold after each failure. If the control is healthy while the candidate fails, or the dependency retry budget expires, deploy rollback revision `02b2c22ea8a76decee92d83c853ca6cf33899e6c` and verify the legacy contract. No Supabase deployment or configuration change, direct database or storage change, npm publication, beta change, Railway configuration change, or other Railway service change is authorized.
