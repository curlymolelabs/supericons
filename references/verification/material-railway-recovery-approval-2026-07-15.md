# Material Railway hydration recovery approval

Date: 2026-07-15

Status: Ready for owner-coordinated audit. Not executed.

## Outcome

This packet retries the verified Railway Material hydration release without changing its implementation. It preserves every blocking correctness check and replaces the invalid generic latency control with query-matched direct-engine attribution.

The candidate serves all 8,524 pinned Material SVG assets from the Railway MCP bundle. It does not deploy or modify the Supabase search function.

## Why this respin is required

The prior candidate passed all 11 Material-local production checks, including both styles, exact lookup, preview, 20 of 20 relevance in both styles, and sub-600 ms warm p95 values. Its engine-dependent recommendation check also passed.

The candidate then returned a correct all-mode `settings` result in 5,555.7 ms. The prior packet compared that latency with a different strict Lucide `calendar` query, which completed in 1,854.6 ms, and rolled back. That comparison could not assign the latency to the candidate because the request shapes were different. The retained attempt record is `references/verification/material-railway-recovery-respin-attempt-2026-07-15.md`.

The current verified rollback deployment previously took 8.3 seconds on the same all-mode `settings` shape. This packet therefore compares a slow through-candidate request only with the exact same request sent directly to the engine.

## Pinned implementation

- Implementation revision: `13f28d7e72484538b0a2be14f680ef8a4c4e3c52`
- Implementation tree: `27668ce5ff4027aabe28432f1ce2eaf6386bb109`
- Material bundle SHA-256: `66ef383bad9e3847da107f0d8f37f0bd1cb695afd4e3c4cd3470ef1c97723ed9`
- Upstream Material revision: `30f8fddd293b1f0189896dc4aaecdfaba1d37ae0`
- Material assets: 8,524 total, 4,262 outline and 4,262 solid
- Expected MCP version after deployment: `0.4.18`

The implementation is byte-for-byte the revision that passed the prior candidate's Material production checks. This packet changes release verification only.

## Exact Railway target

- Project: `supericons-converter-node` (`b53f5f48-607f-49ae-a71e-37cc766f6973`)
- Environment: `production` (`6345c75b-5ac2-40d6-b176-a4a783ce3eb3`)
- Service: `scintillating-imagination` (`352420e5-6a02-43a4-99f2-f6dbde522acb`)
- Public MCP URL: `https://mcp.supericons.dev/mcp`
- Current deployment: `01453e0d-20e5-496c-a9da-40b135e173c4`
- Current image digest: `sha256:043f4d748963bcd3e6198880472066a02690351569c601db0ef289b52cef9392`
- Search control URL: `https://kcjmkakdhsqplvasgkjv.supabase.co/functions/v1/mcp-search`

The runner stops before upload if the Railway project, environment, service, deployment ID, image digest, or legacy health contract changes.

## Pre-upload stability requirement

Before upload, the runner may try up to three numbered preflight windows inside 15 minutes. Each window sends six direct strict Lucide probes over three minutes.

- Six consecutive HTTP 200 responses are required.
- Every response must contain three Lucide results.
- Every response must finish within 5,000 ms.
- The probes use internal-test telemetry fields.
- Every attempted window writes separate evidence.

The first healthy window permits upload. If none passes, the runner stops before any mutation.

## Split production gates

After the candidate reaches `SUCCESS` and reports the complete 8,524-asset health contract, the runner applies two gate classes.

### Material-local gates

The following 11 checks run once and cannot be retried:

- Bundle health and capability count
- Material outline search and exact lookup
- Material solid search and exact lookup
- Distinct outline and solid payloads
- Real PNG preview from fixed Material references
- The 20-query relevance fixture in both styles, with every query accepted in the first five results
- Warm p95 at or below 2,000 ms for strict Material search, exact lookup, and preview

Any failure triggers the verified rollback.

### Six follow-up checks

The six follow-up checks retain their full correctness contracts:

- Material recommendation with valid SVG
- All-mode `settings` with 10 deliverable results
- All-mode `cog` with 10 deliverable results
- All-mode solid with 10 deliverable Material results
- Lucide strict with five valid Lucide results
- Recommendation warm p95 at or below 3,000 ms

Code inspection confirms that Material recommendation and all-mode solid use the candidate's local Material index. Their latency limits remain candidate-local and blocking. A correctness or candidate-local latency failure triggers immediate rollback.

All-mode `settings`, all-mode `cog`, and strict Lucide call the existing Supabase engine. Their correctness checks remain blocking. If one is correct but exceeds the 3,000 ms latency target, the gate records a structured latency failure instead of assigning blame from a different query.

## Query-matched latency attribution

For every structured engine latency failure, the runner immediately sends the exact same search shape directly to the search engine:

- The same query, library mode, style, limit, locale, and requested library are required.
- The direct result must satisfy the same count and library contract.
- The candidate is allowed up to 1,000 ms beyond the direct-engine response for MCP transport, hydration, and response processing.
- If `through_candidate_ms <= direct_engine_ms + 1,000`, the latency is attributed to the existing engine and the correct candidate response passes.
- If the candidate exceeds the direct engine by more than 1,000 ms, the candidate triggers immediate rollback.
- If the direct engine errors or returns an invalid result, the dependency is degraded. The runner waits 90 seconds and may retry within three attempts and ten minutes.

Correctness is never waived. Query-matched attribution applies only after all six correctness checks pass and only to latency from the three verified engine paths.

If the dependency retry budget expires, the runner restores the verified rollback revision.

## Automatic rollback

Rollback is authorized only after a candidate reaches Railway status `SUCCESS` and then fails health, correctness, candidate-local latency, candidate overhead attribution, or exhausts the dependency retry budget.

- Rollback revision: `02b2c22ea8a76decee92d83c853ca6cf33899e6c`
- Rollback tree: `b5cea763f36be4e32453d4e1aca49988a4d3a72f`
- Expected restored version: `0.4.17`

The legacy gate must then show a healthy service, three valid Lucide results, and the known pre-release Material behavior. A candidate build that never reaches `SUCCESS` does not trigger another deployment.

## Evidence retention

All production evidence paths are write-once. The packet retains:

- Legacy preflight behavior
- Up to three numbered stability preflight windows
- The single Material-local gate
- Up to three six-check follow-up gate artifacts
- A query-matched direct-engine attribution artifact for each latency-failed attempt
- Completion evidence or verified rollback evidence

## Mutation boundary

Authorized after owner approval:

- One Railway candidate deployment to the exact pinned service
- One conditional Railway rollback deployment under the rules above
- Bounded health, MCP, and direct search verification requests
- Ordinary telemetry rows produced by the approved verification traffic

Not authorized:

- Any Supabase deployment or configuration change
- Any direct database command, migration, seed, deletion, or storage change
- Any npm publication
- Any beta endpoint change
- Any Railway project, environment, service, variable, domain, or replica change
- Any change to another Railway service

## Fingerprint

The approval fingerprint is SHA-256 over the LF-normalized, LF-terminated UTF-8 content of `references/verification/material-railway-recovery-fingerprint-2026-07-15.txt`. Text file hashes use the same normalization. The gzip bundle uses raw bytes:

`8a73d9d4b755e9068b7c8b1625604ce1909075783ee9f8aaf2b706c64830dcda`

## Approval sentence

> Approve the Material Railway hydration recovery for fingerprint `8a73d9d4b755e9068b7c8b1625604ce1909075783ee9f8aaf2b706c64830dcda`: allow up to three numbered preflight windows within 15 minutes, each requiring six consecutive direct-engine probes over three minutes with all responses HTTP 200 under 5,000 ms, then deploy implementation revision `13f28d7e72484538b0a2be14f680ef8a4c4e3c52` once to Railway project `b53f5f48-607f-49ae-a71e-37cc766f6973`, production environment `6345c75b-5ac2-40d6-b176-a4a783ce3eb3`, service `352420e5-6a02-43a4-99f2-f6dbde522acb`. Run the 11 Material-local checks once and all six follow-up correctness checks. Keep candidate-local latency failures blocking. For a correct engine-path response above 3,000 ms, compare it with the exact same query sent directly to the engine and accept engine attribution only when the through-candidate latency is no more than 1,000 ms above the direct-engine latency. Roll back on any correctness failure, candidate-local latency failure, or candidate overhead above 1,000 ms. If a query-matched direct control is degraded, allow up to three attempts over ten minutes, then roll back if the dependency remains unresolved. No Supabase deployment or configuration change, direct database or storage change, npm publication, beta change, Railway configuration change, or other Railway service change is authorized.
