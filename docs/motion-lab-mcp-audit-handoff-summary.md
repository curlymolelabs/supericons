# Motion Lab MCP Audit Handoff Summary

Date: April 13, 2026
Status: Internal handoff note
Scope: Motion Lab MCP hosted protection path, including Postgres-backed rate limiting

## Current Status

Motion Lab MCP is now in a materially different state from the original local-only implementation:

- the hosted premium Motion Lab path is implemented and deployed
- session exchange, recipe, CSS render, and animated SVG render are live in Supabase Edge Functions
- the premium path now uses a hosted backend instead of relying on a rich local package surface
- a Postgres-backed server-side rate limiter is now deployed and live-tested

This means the Motion Lab protection strategy is no longer just planned. The hosted path is real, and the first-pass abuse-throttling layer is also real.

## What Was Built

### Hosted Motion Lab endpoints

Deployed hosted endpoints:

- `motion-lab-session`
- `motion-lab-recipe`
- `motion-lab-render-css`
- `motion-lab-render-animated-svg`

Repo paths:

- [motion-lab-session](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/supabase/functions/motion-lab-session/index.ts)
- [motion-lab-recipe](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/supabase/functions/motion-lab-recipe/index.ts)
- [motion-lab-render-css](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/supabase/functions/motion-lab-render-css/index.ts)
- [motion-lab-render-animated-svg](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/supabase/functions/motion-lab-render-animated-svg/index.ts)

Shared hosted runtime/auth/error paths:

- [auth.ts](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/supabase/functions/_shared/motion-lab/auth.ts)
- [errors.ts](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/supabase/functions/_shared/motion-lab/errors.ts)
- [runtime.ts](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/supabase/functions/_shared/motion-lab/runtime.ts)

### Local MCP wrapper and baseline

Local MCP-side integration:

- [motion-lab-client.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/mcp/motion-lab-client.js)
- [motion-lab.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/mcp/motion-lab.js)
- [index.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/mcp/index.js)

Reduced local baseline artifact:

- [motion-lab-baseline.json](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/mcp/generated/motion-lab-baseline.json)

### Postgres-backed rate limiting

Migration and helper paths:

- [20260412_motion_lab_rate_limits.sql](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/supabase/migrations/20260412_motion_lab_rate_limits.sql)
- [rate-limit.ts](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/supabase/functions/_shared/motion-lab/rate-limit.ts)

The limiter currently uses:

- session bucket by `api_key_hash`
- premium buckets by `user_id`
- fixed 10-minute windows
- Postgres table + atomic SQL function

Current default thresholds:

- session: `12 / 10 min`
- recipe: `180 / 10 min`
- CSS render: `120 / 10 min`
- animated SVG render: `120 / 10 min`

## What Was Verified

### Previously verified hosted path

Already proven before the Postgres limiter rollout:

- session exchange works
- hosted recipe endpoint works
- hosted CSS render works
- hosted animated SVG render works
- hosted MCP client can resolve the live hosted path with local fallback disabled

Primary references:

- [motion-lab-mcp-post-implementation-report.md](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs/motion-lab-mcp-post-implementation-report.md)
- [motion-lab-mcp-hosted-endpoints-spec.md](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs/plans/motion-lab-mcp-hosted-endpoints-spec.md)
- [motion-lab-mcp-migration-verification-checklist.md](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs/plans/motion-lab-mcp-migration-verification-checklist.md)

### Newly verified Postgres limiter rollout

Verified in this rollout:

- Postgres rate-limit table/function applied in Supabase
- hosted Motion Lab functions redeployed against the Postgres-backed helper
- below-threshold hosted recipe path verified
- below-threshold MCP recipe path verified
- real live `429` triggered successfully after temporarily lowering the recipe bucket
- live `429` triggered successfully for the session bucket after temporarily lowering the session threshold
- live `429` triggered successfully for the CSS render bucket after temporarily lowering the CSS threshold
- live `429` triggered successfully for the animated SVG render bucket after temporarily lowering the SVG threshold
- MCP pass-through preserved:
  - `code`
  - `retry_after_seconds`
  - `limit_scope`
- fail-open degradation was proven by temporarily revoking execute on `si_enforce_motion_lab_rate_limit(...)`, observing `403` RPC failures, and confirming hosted CSS plus MCP CSS still returned `200`
- recipe threshold was restored to `180 / 10 min` afterward
- session threshold was restored to `12 / 10 min` afterward
- CSS render threshold was restored to `120 / 10 min` afterward
- animated SVG threshold was restored to `120 / 10 min` afterward

### Local regression checks

Passed locally:

- `npm run build`
- `npm --prefix mcp run verify:package`
- prior hosted/negative-path verification scripts remain part of the active verification set

## Important Rollout Detail

During rollout, one SQL bug was found in the original function body:

- `on conflict (bucket, subject_kind, subject_key, window_started_at)` caused a runtime ambiguity inside PL/pgSQL because `window_started_at` is also a `returns table` output column

It was corrected to:

- `on conflict on constraint si_motion_lab_rate_limits_window_unique`

The local migration file now includes the corrected form:

- [20260412_motion_lab_rate_limits.sql](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/supabase/migrations/20260412_motion_lab_rate_limits.sql)

## Remaining Open Items

These are still worth watching:

- cleanup/retention behavior at real traffic levels over time
- threshold tuning against real production usage patterns
- token refresh after expiry as a separate live operational check if desired

These are not blockers to recognizing the limiter as implemented, but they are fair audit targets.

## Recommended Audit Questions For Another Agent

1. Does the Postgres limiter function enforce the fixed window correctly and safely under concurrency?
2. Is the fail-open behavior the right product/security tradeoff for the first pass?
3. Are the current threshold numbers reasonable for legitimate agent workflows versus harvesting resistance?
4. Does the MCP preserve enough structure from hosted `429` responses for agent recovery?
5. Are any active docs still inconsistent with the Postgres-first path?
6. Is the switch trigger from Postgres to Redis defined clearly enough and based on the right operational signals?
7. Does the hosted Motion Lab path still avoid leaking richer premium internals than intended?

## Related Documents

Architecture and roadmap:

- [motion-lab-mcp-hybrid-boundary-implementation-plan.md](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs/plans/motion-lab-mcp-hybrid-boundary-implementation-plan.md)
- [motion-lab-mcp-first-hosted-batch-implementation-plan.md](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs/plans/motion-lab-mcp-first-hosted-batch-implementation-plan.md)
- [motion-lab-mcp-post-implementation-report.md](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs/motion-lab-mcp-post-implementation-report.md)

Hosted boundary and contract:

- [motion-lab-mcp-hosted-boundary-adr.md](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs/plans/motion-lab-mcp-hosted-boundary-adr.md)
- [motion-lab-mcp-local-baseline-contract.md](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs/plans/motion-lab-mcp-local-baseline-contract.md)
- [motion-lab-mcp-hosted-endpoints-spec.md](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs/plans/motion-lab-mcp-hosted-endpoints-spec.md)

Verification and release:

- [motion-lab-mcp-migration-verification-checklist.md](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs/plans/motion-lab-mcp-migration-verification-checklist.md)
- [motion-lab-mcp-release-gates.md](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs/plans/motion-lab-mcp-release-gates.md)

Rate limiting decision trail:

- [motion-lab-mcp-rate-limiting-plan-audit.md](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs/motion-lab-mcp-rate-limiting-plan-audit.md)
- [motion-lab-mcp-redis-cost-analysis.md](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs/motion-lab-mcp-redis-cost-analysis.md)
- [motion-lab-mcp-rate-limiting-infrastructure-analysis.md](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs/motion-lab-mcp-rate-limiting-infrastructure-analysis.md)
- [motion-lab-mcp-rate-limiting-implementation-plan.md](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs/plans/motion-lab-mcp-rate-limiting-implementation-plan.md)
- [motion-lab-mcp-postgres-rate-limit-schema-design.md](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs/plans/motion-lab-mcp-postgres-rate-limit-schema-design.md)

## Product Roadmap Recap

### What is complete

1. Local Motion Lab agent-library foundation
- shared preset source
- metadata layer
- agent guidance
- enriched MCP output

2. Hosted protection architecture
- hosted boundary defined
- local baseline reduced
- hosted endpoints implemented
- MCP hosted wrapper implemented

3. Hosted verification
- session
- recipe
- CSS render
- animated SVG render
- hosted MCP path
- negative-path verification

4. First-pass moat hardening
- package hardening
- clean-install checks
- Postgres-backed rate limiting
- live `429` proofs across recipe, session, CSS render, and animated SVG render
- live fail-open degradation proof

### What is partially complete

1. Rate-limit operational hardening
- limiter is live
- long-run cleanup and threshold tuning still need real-traffic observation

2. Documentation/guide polish
- architecture and verification docs are broad
- user-facing or founder-facing simplification can still improve

### What is next

1. Keep the release/verification docs aligned with the completed Postgres rollout evidence
2. Rotate the exposed Pro API key used during verification
3. Optionally audit threshold tuning and future bundle-endpoint design
4. Only revisit Redis if measured production signals show Postgres becoming a real bottleneck

## Short Bottom Line

Motion Lab MCP is no longer just a local experimental library.

It now has:

- a live hosted premium path
- a reduced local baseline
- verified MCP integration
- deployed Postgres-backed server-side rate limiting

The current roadmap position is:

- **core hosted migration: complete**
- **first-pass moat hardening: complete**
- **operational tuning and future optimization: next**
