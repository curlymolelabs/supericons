# Motion Lab MCP Verification Hardening Plan

Date: April 13, 2026
Status: Narrowed for pre-launch execution
Scope: Motion Lab hosted verification only

## Purpose

Close the one remaining pre-launch verification gap that is materially distinct from what has already been proven, while deferring lower-value symmetric proofs until after launch or the next threshold-change cycle.

This plan now addresses:

1. a dedicated live `429` proof for:
   - `motion-lab-session`
2. a deferred runbook for:
   - CSS render `429` proof
   - animated SVG render `429` proof
   - controlled fail-open proof

## Why This Plan Exists

The current Motion Lab system is materially complete end to end:

- hosted premium path is deployed
- Postgres-backed limiter is deployed
- recipe endpoint `429` proof is captured
- MCP pass-through for `429` metadata is proven

The audit review surfaced an important distinction:

- `motion-lab-session` is a genuinely distinct path
- CSS and animated SVG `429` proofs are mostly symmetric confidence checks
- fail-open proof is operational hardening, not launch-trust verification

So the pre-launch hardening batch should focus on the distinct path now, while preserving a clean deferred path for the rest.

## Quality Standard

This work should meet three standards:

1. **Deterministic**
   - no dependence on accidental load or timing luck
   - every proof uses a controlled threshold or controlled failure trigger

2. **Contained**
   - temporary verification changes must be narrow in scope and easy to roll back
   - normal production thresholds must be restored immediately after each proof

3. **Auditable**
   - each run should produce clear evidence:
     - command output
     - exact target bucket or failure mode
     - expected and observed result

## Non-Goals

- redesigning the limiter architecture
- changing core Motion Lab tool behavior
- replacing fail-open with fail-closed
- adding a new paid service or vendor
- performance benchmarking at production scale

## Current Gaps

### Gap 1: Session endpoint is still unproven live

Already proven:

- `motion-lab-recipe:user`

- `motion-lab-session:api_key_hash`

Why this one matters more:

- it rate limits by `api_key_hash`, not `user`
- it runs before key validation
- it has a different threshold
- it is the only limiter path not already represented by the recipe proof

### Gap 2: Additional hardening remains available but is not pre-launch critical

Still open:

- `motion-lab-render-css:user` live `429` proof
- `motion-lab-render-animated-svg:user` live `429` proof
- fail-open proof

These should be treated as deferred hardening work, not as the immediate pre-launch blocker.

## High-Level Strategy

### Verification family A: one controlled over-limit proof for the distinct path

For `motion-lab-session`:

- temporarily lower the live threshold
- redeploy the session function
- run a deterministic verifier that crosses the threshold
- confirm:
  - the session endpoint rate limits
  - the structured `429` contract is returned
- restore the real threshold immediately

### Verification family B: deferred operational hardening

After launch or during a low-traffic maintenance window:

- optionally prove CSS render `429`
- optionally prove animated SVG render `429`
- optionally prove fail-open degradation

## Key Safety Decision

Use **temporary permission denial on the SQL function** as the preferred fail-open trigger, not schema mutation or function deletion.

Recommended trigger:

- temporarily revoke `execute` on `public.si_enforce_motion_lab_rate_limit(...)` from `service_role`

Why this is preferred:

- reversible with one grant statement
- avoids renaming or dropping database objects
- exercises the real RPC failure branch the Edge Functions rely on
- lower operational risk than function deletion or table alteration

## Workstream A: Extend the Verifier for `session`

### Objective

Expand the current verification flow so the distinct session bucket can be exercised intentionally and repeatably.

### Current baseline

Existing script:

- [verify-motion-lab-rate-limits.mjs](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/scripts/verify-motion-lab-rate-limits.mjs)

Current supported targets:

- `recipe`
- `css`
- `animated-svg`

Current limitation:

- no `session` target

### Required implementation

1. Extend `verify-motion-lab-rate-limits.mjs` to support `session`
2. Keep target-specific assertions explicit
3. Keep below-threshold proof and over-threshold proof separate in output
4. Preserve the existing `recipe`, `css`, and `animated-svg` behavior unchanged

### Session target design

The session target should:

- call the live session exchange path directly
- use a valid Pro API key hash input repeatedly
- confirm below-threshold success
- confirm over-threshold `429`
- assert:
  - `code = motion_lab_rate_limited`
  - `limit_scope = motion-lab-session:api_key_hash`
  - `retry_after_seconds` is present

### Acceptance signal

One verifier script can intentionally prove the remaining distinct bucket:

- `session`

without regressing the already working target modes.

## Workstream B: Run the Live `429` Proof for `session`

### Objective

Capture direct evidence for the distinct session bucket before launch.

### Verification method

For `session`:

1. set a temporary low threshold in Supabase secrets
2. redeploy the session function
3. run the verifier with `SUPERICONS_MOTION_LAB_EXPECT_429=1`
4. capture evidence
5. restore the normal threshold
6. redeploy the session function again

### Bucket-specific threshold suggestions

Use:

- session: `2 / 600s`

These should trigger quickly without requiring broad or noisy request bursts.

### Acceptance signal

Captured live proof:

- `motion-lab-session:api_key_hash`

## Workstream C: Defer Symmetric `429` Proofs and Fail-Open Proof

### Objective

Keep the remaining hardening work defined without treating it as pre-launch blocking.

### Fail-open proof requirements

Deferred items:

- CSS render `429` proof
- animated SVG `429` proof
- fail-open proof via temporary revoke of `execute` on `public.si_enforce_motion_lab_rate_limit(...)` from `service_role`

Recommended trigger:

- after launch, during the first maintenance window
- or whenever thresholds are changed and a fresh verification pass is already planned

## Workstream D: Evidence Capture and Rollback Discipline

### Objective

Make the session proof operationally clean and reviewable.

### Required evidence

For the session proof, capture:

- target bucket or fault mode
- temporary threshold or injected failure condition
- command(s) run
- deploy output
- verifier output
- restore action output

### Required rollback rule

Every test that changes live thresholds must include an explicit restore step in the same runbook.

No verification is considered complete until:

- original thresholds are restored
- affected functions are redeployed if needed

## Workstream E: Documentation Alignment

### Objective

Keep the verification record honest once the session proof is complete.

### Files to update after execution

- [motion-lab-mcp-migration-verification-checklist.md](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs/plans/motion-lab-mcp-migration-verification-checklist.md)
- [motion-lab-mcp-release-gates.md](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs/plans/motion-lab-mcp-release-gates.md)
- [motion-lab-mcp-audit-handoff-summary.md](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs/motion-lab-mcp-audit-handoff-summary.md)
- [motion-lab-mcp-postgres-rollout-audit.md](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs/motion-lab-mcp-postgres-rollout-audit.md) if we want the audit follow-up status reflected

### Acceptance signal

The repo no longer describes the session proof as open once it has been completed.

## File Targets

Implementation targets:

- [verify-motion-lab-rate-limits.mjs](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/scripts/verify-motion-lab-rate-limits.mjs)
- [rate-limit.ts](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/supabase/functions/_shared/motion-lab/rate-limit.ts) only if a small observability tweak is needed

Verification/runbook targets:

- [motion-lab-mcp-migration-verification-checklist.md](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs/plans/motion-lab-mcp-migration-verification-checklist.md)
- [motion-lab-mcp-release-gates.md](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs/plans/motion-lab-mcp-release-gates.md)

## Operational Risk Notes

### No new paid dependency required

This plan stays on the existing Supabase stack.

It does **not** require:

- Redis
- Upstash
- any new paid service

## Execution Order

1. extend the verifier to support `session`
2. prove live `429` for `session`
3. update verification docs with evidence
4. defer CSS/SVG/fail-open hardening until after launch or the next threshold-change cycle

## Recommendation

Proceed with the session proof now and defer the rest.

That gives us the one additional piece of evidence that meaningfully increases launch confidence without spending pre-launch time re-proving symmetric paths that are already strongly implied by the working recipe proof.
