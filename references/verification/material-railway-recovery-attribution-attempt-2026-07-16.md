# Material Railway query-attribution recovery attempt

Date: 2026-07-16

Approval fingerprint: `8a73d9d4b755e9068b7c8b1625604ce1909075783ee9f8aaf2b706c64830dcda`

## Outcome

The guarded runner deployed the pinned Material candidate after its second preflight window passed. All 11 Material-local checks and all six follow-up correctness checks passed. One engine-path latency check exceeded 3,000 ms. The query-matched direct-engine comparison found 3,261.3 ms of observed through-candidate overhead, above the approved 1,000 ms budget. The runner restored and verified the pinned rollback revision.

Production is healthy on rollback deployment `9186be87-a85f-4dd8-9807-323394e47c33`, image digest `sha256:77a61f1c058822ccbb81f83ae471297b9bd472de1aba0704b0fd53938025ee41`, and MCP version `0.4.17`.

## Stability preflight

The first preflight window stopped after its second probe took 6,877.8 ms, above the approved 5,000 ms ceiling. No upload had occurred.

The second window passed all six probes. Durations ranged from 2,713.0 ms to 4,115.4 ms. The candidate upload then began.

## Candidate deployment

- Candidate deployment: `d96bc655-c6d9-40c3-9fbf-7b8552366783`
- Candidate image digest: `sha256:444a9682aba047de5a83c7b39030f6c7786a1413fb315400cc45e89d825e6391`
- Expected MCP version: `0.4.18`

The candidate passed every Material-local check:

- Complete 8,524-asset health contract
- Material capability count of 4,262 icon IDs
- Valid outline and solid search and exact lookup
- Distinct outline and solid SVG payloads
- Real PNG preview content
- Relevance fixture 20 of 20 in the first five results for both styles
- Strict Material search warm p95 of 376.5 ms
- Exact lookup warm p95 of 242.6 ms
- Preview warm p95 of 510.6 ms

The candidate also passed all six follow-up correctness checks. Candidate-local recommendation completed in 787.1 ms, and its five-sample warm p95 was 783.0 ms.

## Query-matched latency result

The all-mode `settings` request returned 10 deliverable rows but took 4,893.3 ms. The gate recorded a structured latency failure and immediately sent the same query shape directly to the stable search function:

- Query: `settings`
- Library mode: `strict` with no requested library
- Style: `any`
- Limit: 10
- Through-candidate latency: 4,893.3 ms
- Direct-engine latency: 1,632.0 ms
- Allowed candidate latency: 2,632.0 ms
- Observed overhead: 3,261.3 ms

The direct result returned HTTP 200 with the required 10 rows. The observed overhead exceeded the approved 1,000 ms budget, so the runner classified the attempt as `candidate_engine_overhead_exceeded_attempt_1` and started the authorized rollback.

This result proves that the approved end-to-end overhead contract was not met in this attempt. It does not isolate the overhead to Material hydration code. The through-candidate request traversed the public MCP service and Railway before the Railway service called Supabase, while the direct control traveled from the release runner directly to Supabase. Network path, MCP transport, response serialization, and candidate processing are all included in the measured difference.

## Rollback

- Rollback deployment: `9186be87-a85f-4dd8-9807-323394e47c33`
- Rollback image digest: `sha256:77a61f1c058822ccbb81f83ae471297b9bd472de1aba0704b0fd53938025ee41`
- Restored MCP version: `0.4.17`

The legacy gate passed after rollback. It confirmed a healthy service, the known pre-release Material behavior, and valid Lucide results.

## Retained evidence

- Legacy preflight: `material-railway-recovery-attribution-legacy-preflight-2026-07-15.json`, raw SHA-256 `a0c07efbb82d7783a384dd93f185c3c2fdda28c7be1166f9990c3b6a7f07a516`
- Stability attempt 1: `material-railway-recovery-attribution-stability-preflight-attempt-1-2026-07-15.json`, raw SHA-256 `68cc7dacd15761c7291f4c2ae66e5a7fb43c7351f0983c44f0aeb51e9d91180a`
- Stability attempt 2: `material-railway-recovery-attribution-stability-preflight-attempt-2-2026-07-15.json`, raw SHA-256 `747178c9f730777c8f50f5e44f5f9e128c6932092b859058f0c895030149dbfd`
- Material-local gate: `material-railway-recovery-attribution-material-gate-2026-07-15.json`, raw SHA-256 `8a0b011c2a7685a44f8490d569c3d7bef071c72afd0bbe5d59478cd490d9d605`
- Follow-up gate: `material-railway-recovery-attribution-engine-attempt-1-2026-07-15.json`, raw SHA-256 `fc5120ab2f3b2bec34e12e7cb60f580f52717afb187f329e5dced76d22e67d32`
- Query attribution: `material-railway-recovery-attribution-attempt-1-2026-07-15.json`, raw SHA-256 `048f5d34b6ab11d28bd25c8f9f47f74d5e77b3265587fd09cd561b8d67368363`
- Rollback evidence: `material-railway-recovery-attribution-rollback-2026-07-15.json`, raw SHA-256 `0d4a6f1b3a73dca84676aeac0ac74a81828fe4c2c3dc1149e13bf72ab69633c5`

## Next boundary

This approval is consumed. No further deployment is authorized. The next step is a read-only overhead diagnosis or an explicit owner decision to accept a wider end-to-end latency budget for the heavy all-mode path. Any later deployment requires a fresh packet, fingerprint, and approval.
