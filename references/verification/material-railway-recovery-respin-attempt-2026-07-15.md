# Material Railway recovery respin attempt

Date: 2026-07-15

Approval fingerprint: `8990c4ae5a0b5d9362d0dcd16bdc9b2a202ed1e6bec7af5710d0c113cd6c9939`

## Outcome

The guarded runner deployed the pinned Material candidate after its third preflight window passed. All 11 Material-local production checks passed. The first engine-dependent attempt then failed its all-mode `settings` latency gate, the approved control probe was healthy, and the runner restored the verified rollback revision.

Production is healthy on rollback deployment `01453e0d-20e5-496c-a9da-40b135e173c4`, image digest `sha256:043f4d748963bcd3e6198880472066a02690351569c601db0ef289b52cef9392`, and MCP version `0.4.17`.

## Preflight windows

1. Attempt 1 stopped after probe 2 took 9,100.2 ms. No upload had occurred.
2. Attempt 2 stopped after probe 2 took 6,294.9 ms. No upload had occurred.
3. Attempt 3 passed all six probes. Durations ranged from 3,105.0 ms to 4,554.7 ms, all below the approved 5,000 ms health threshold.

## Candidate deployment

- Candidate deployment: `51f2125b-2ffa-4997-b8e7-d5171700942a`
- Candidate image digest: `sha256:7869b0548e6d9d7d5355106ead990974029edcf419fc320667f7eb8b18b5ae89`
- Expected MCP version: `0.4.18`

The candidate passed all Material-local checks:

- Complete 8,524-asset health contract
- Material capability count of 4,262 icon IDs
- Valid outline and solid search and exact lookup
- Distinct outline and solid SVG payloads
- Real PNG preview content
- Relevance fixture 20 of 20 in the first five results for both styles
- Warm p95 of 494.7 ms for strict Material search
- Warm p95 of 568.8 ms for exact lookup
- Warm p95 of 396.8 ms for preview

## Engine-dependent stop and rollback

The recommendation check passed in 1,274.6 ms. The next all-mode `settings` request returned valid results but took 5,555.7 ms, above its separate 3,000 ms user-facing latency gate.

The immediate direct control probe returned HTTP 200 with three Lucide results in 1,854.6 ms, below the 5,000 ms control threshold. Under the approved policy, the runner classified this as `candidate_engine_gate_failed_with_healthy_control_attempt_1` and started the authorized rollback.

The control and failed request used different search shapes. The control was a strict Lucide `calendar` query, while the failed gate was all-mode `settings`. The policy classification triggered the correct approved action, but the timing comparison alone does not prove that candidate code caused the slower all-mode request.

Rollback deployment `01453e0d-20e5-496c-a9da-40b135e173c4` reached `SUCCESS`. The legacy gate then passed with MCP version `0.4.17`, zero legacy Material results, and three valid Lucide results.

## Retained evidence

- Legacy preflight: `material-railway-recovery-respin-legacy-preflight-2026-07-15.json`, raw SHA-256 `643f286aad6a7365873f64f61670f2093b565cbc0d8fc3dd596ca576f4e3d502`
- Stability attempt 1: `material-railway-recovery-respin-stability-preflight-attempt-1-2026-07-15.json`, raw SHA-256 `77675540b0f105c50afec2128368867ad950508318bc945f936e59c13f4a0bb4`
- Stability attempt 2: `material-railway-recovery-respin-stability-preflight-attempt-2-2026-07-15.json`, raw SHA-256 `06251e63c5458192b4ef63a38b6e4bdf281a70b58411c733894505a1d4ffcbd8`
- Stability attempt 3: `material-railway-recovery-respin-stability-preflight-attempt-3-2026-07-15.json`, raw SHA-256 `c0c6b210e341db8e8d4f9373eff63d105b813476d4ce18d465f5b61ca33994e7`
- Material-local gate: `material-railway-recovery-respin-material-gate-2026-07-15.json`, raw SHA-256 `dbbf08aa31a5f23353570096ef3c2776b24f57b0b193305ae9ecf1d434028438`
- Engine attempt 1: `material-railway-recovery-respin-engine-attempt-1-2026-07-15.json`, raw SHA-256 `d74486e59da8d7fdbcfa774a1da5c3af23212dea46bc843cbac63dde4fd52c4d`
- Control attempt 1: `material-railway-recovery-respin-control-attempt-1-2026-07-15.json`, raw SHA-256 `c12d675d2deef9c9eef47b33d086ebda8d4ac9e10add1df9b7fd41bd2af92078`
- Rollback evidence: `material-railway-recovery-respin-rollback-2026-07-15.json`, raw SHA-256 `5794ebcb9560b7f70e98177a9c925998dd48e33423c7982ad9d27e56b89d53f7`

## Next boundary

This approval is consumed. No additional deployment is authorized. Any later attempt requires a fresh packet, fingerprint, and owner approval.
