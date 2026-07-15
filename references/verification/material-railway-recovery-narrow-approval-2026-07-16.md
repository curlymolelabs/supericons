# Material Railway hydration narrow recovery approval

Date: 2026-07-16

Status: Ready for independent audit and owner approval. Not executed.

## Goal

Ship the existing Railway Material hydration implementation and judge it against the user-visible Material support requirement:

- Material searches return deliverable SVGs in outline and solid styles.
- Exact lookup, recommendations, previews, relevance, and all-mode results remain correct.
- The Railway MCP service stays healthy.
- Latency introduced by the candidate's Material code stays within the approved limits.

This packet does not make the existing Supabase search engine's latency a release blocker. That latency is measured and retained because the candidate neither deploys nor changes that engine.

## Why this packet is narrower

The unchanged implementation passed all 11 Material-local production checks in the latest retained attempt. It also passed all six follow-up correctness checks. The retained measurements were:

- Material search warm p95: 376.5 ms
- Material exact lookup warm p95: 242.6 ms
- Material preview warm p95: 510.6 ms
- Recommendation warm p95: 783 ms
- All-mode `settings` through the candidate: 4,893.3 ms
- The later direct-engine `settings` request: 1,632 ms

The last comparison did not isolate candidate overhead because the two requests took different network paths and were not simultaneous. It therefore cannot support either a pass or a rollback decision. The packet removes that invalid attribution step.

All-mode behavior still remains correctness-blocking. The candidate can add hydrated Material rows to all-mode responses, so full result counts, libraries, and SVG delivery must still pass. Only latency originating from the unchanged engine path becomes record-only.

The retained prior-attempt record is `references/verification/material-railway-recovery-attribution-attempt-2026-07-16.md`.

## Pinned implementation

- Implementation revision: `13f28d7e72484538b0a2be14f680ef8a4c4e3c52`
- Implementation tree: `27668ce5ff4027aabe28432f1ce2eaf6386bb109`
- Material bundle SHA-256: `66ef383bad9e3847da107f0d8f37f0bd1cb695afd4e3c4cd3470ef1c97723ed9`
- Upstream Material revision: `30f8fddd293b1f0189896dc4aaecdfaba1d37ae0`
- Material assets: 8,524 total, 4,262 outline and 4,262 solid
- Expected MCP version after deployment: `0.4.18`

The implementation is unchanged. This packet changes release verification only.

## Exact Railway target

- Project: `supericons-converter-node` (`b53f5f48-607f-49ae-a71e-37cc766f6973`)
- Environment: `production` (`6345c75b-5ac2-40d6-b176-a4a783ce3eb3`)
- Service: `scintillating-imagination` (`352420e5-6a02-43a4-99f2-f6dbde522acb`)
- Public MCP URL: `https://mcp.supericons.dev/mcp`
- Current deployment: `9186be87-a85f-4dd8-9807-323394e47c33`
- Current image digest: `sha256:77a61f1c058822ccbb81f83ae471297b9bd472de1aba0704b0fd53938025ee41`
- Search dependency URL: `https://kcjmkakdhsqplvasgkjv.supabase.co/functions/v1/mcp-search`

The runner stops before upload if the Railway project, environment, service, deployment ID, image digest, or legacy health contract changes.

## Pre-upload availability check

Before upload, the runner may try up to three numbered windows inside 15 minutes. Each window sends six direct strict Lucide probes over three minutes.

Blocking requirements:

- Six consecutive HTTP 200 responses
- Three valid Lucide results in every response
- Each request completes within the 30-second request timeout

The 5,000 ms observation threshold remains in the evidence but does not block deployment. A response above that threshold is recorded as slow. An error, timeout, or invalid response blocks that window. Each attempted window has a separate write-once evidence file.

## Blocking production gates

After the candidate reaches Railway status `SUCCESS` and reports the complete 8,524-asset health contract, the runner applies two gate classes.

### Eleven Material-local checks

These checks run once and cannot be retried:

- Bundle health and capability count
- Material outline search and exact lookup
- Material solid search and exact lookup
- Distinct outline and solid SVG payloads
- Real PNG preview from fixed Material references
- The 20-query relevance fixture in both styles, with every query accepted in the first five results
- Warm p95 at or below 2,000 ms for Material search, exact lookup, and preview

Any health, correctness, or latency failure triggers the verified rollback.

### Six follow-up checks

All six correctness contracts remain blocking:

- Material recommendation returns valid Material SVG
- All-mode `settings` returns 10 deliverable results
- All-mode `cog` returns 10 deliverable results
- All-mode solid returns 10 deliverable Material results
- Strict Lucide search returns five valid Lucide SVG results
- Recommendation warm measurements return correct Material results

The following candidate-local latency checks also remain blocking at 3,000 ms:

- Initial Material recommendation
- All-mode solid, which uses the candidate's local Material index
- Recommendation warm p95

The runner records, but does not fail on, latency for all-mode `settings`, all-mode `cog`, and strict Lucide. Those requests depend on the unchanged Supabase engine. Their result counts, libraries, and SVG correctness remain blocking.

## Automatic rollback

One rollback deployment is authorized only after the candidate reaches Railway status `SUCCESS` and then fails one of these release-owned requirements:

- Railway service health or the 8,524-asset capability contract
- Any Material-local health, correctness, relevance, preview, or latency check
- Any follow-up correctness check
- Any candidate-local follow-up latency check

Rollback revision: `02b2c22ea8a76decee92d83c853ca6cf33899e6c`

Rollback tree: `b5cea763f36be4e32453d4e1aca49988a4d3a72f`

Expected restored version: `0.4.17`

The legacy gate must then show a healthy service, three valid Lucide results, and the known pre-release Material behavior. A candidate build that never reaches `SUCCESS` does not trigger another deployment.

## Evidence retention

All production evidence paths are new and write-once. The packet retains:

- Legacy preflight behavior
- Up to three numbered availability windows
- One 11-check Material-local artifact
- One six-check follow-up artifact, including engine latency observations
- Completion evidence or verified rollback evidence

## Mutation boundary

Authorized after owner approval:

- One Railway candidate deployment to the exact pinned service
- One conditional Railway rollback deployment under the rules above
- Bounded health, MCP, and direct search verification requests
- Ordinary internal-test telemetry produced by the verification traffic

Not authorized:

- Any Supabase deployment or configuration change
- Any direct database command, migration, seed, deletion, or storage change
- Any npm publication
- Any beta endpoint change
- Any Railway project, environment, service, variable, domain, or replica change
- Any change to another Railway service

## Fingerprint

The approval fingerprint is SHA-256 over the LF-normalized, LF-terminated UTF-8 content of `references/verification/material-railway-recovery-narrow-fingerprint-2026-07-16.txt`. Text file hashes use the same normalization. The gzip bundle uses raw bytes:

`6fde47285e50415b2b25233606a6ae7530ed87fecfee8b05a43c32c7354f8165`

## Approval sentence

> Approve the Material Railway hydration narrow recovery for fingerprint `6fde47285e50415b2b25233606a6ae7530ed87fecfee8b05a43c32c7354f8165`: allow up to three numbered preflight windows inside 15 minutes, each requiring six consecutive direct-engine probes over three minutes with HTTP 200 and three valid Lucide results, while recording latency without using it as a pre-upload blocker. Then deploy implementation revision `13f28d7e72484538b0a2be14f680ef8a4c4e3c52` once to Railway project `b53f5f48-607f-49ae-a71e-37cc766f6973`, production environment `6345c75b-5ac2-40d6-b176-a4a783ce3eb3`, service `352420e5-6a02-43a4-99f2-f6dbde522acb`. Require the 11 Material-local checks, all six follow-up correctness checks, and the candidate-local latency limits. Record but do not block on latency from all-mode `settings`, all-mode `cog`, and strict Lucide. If the candidate reaches `SUCCESS` but fails service health, Material-local requirements, follow-up correctness, or candidate-local latency, deploy rollback revision `02b2c22ea8a76decee92d83c853ca6cf33899e6c` and verify the legacy contract. No Supabase deployment or configuration change, direct database or storage change, npm publication, beta change, Railway configuration change, or other Railway service change is authorized.
