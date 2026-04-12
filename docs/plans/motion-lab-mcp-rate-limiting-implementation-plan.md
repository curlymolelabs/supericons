# Motion Lab MCP Rate Limiting Implementation Plan

Date: April 12, 2026
Status: Draft
Owner: Supericons
Scope: Motion Lab only
Depends on:
- `docs/motion-lab-mcp-audit-report.md`
- `docs/motion-lab-mcp-post-implementation-report.md`
- `docs/motion-lab-mcp-rate-limiting-infrastructure-analysis.md`
- `docs/plans/motion-lab-mcp-postgres-rate-limit-schema-design.md`
- `docs/plans/motion-lab-mcp-user-guide-and-ux-hardening-implementation-plan.md`
- `docs/plans/motion-lab-mcp-migration-verification-checklist.md`
- `docs/plans/motion-lab-mcp-release-gates.md`
- `docs/plans/motion-lab-mcp-hosted-endpoints-spec.md`
- `mcp/motion-lab-client.js`
- `mcp/index.js`
- `supabase/functions/_shared/motion-lab/auth.ts`
- `supabase/functions/_shared/motion-lab/errors.ts`
- `supabase/functions/motion-lab-session/index.ts`
- `supabase/functions/motion-lab-recipe/index.ts`
- `supabase/functions/motion-lab-render-css/index.ts`
- `supabase/functions/motion-lab-render-animated-svg/index.ts`
- `supabase/migrations/`

## Purpose

Turn the remaining Motion Lab moat gap into a concrete implementation batch using infrastructure Supericons already owns.

This plan defines how to add first-pass server-side rate limiting to the hosted Motion Lab premium path so that:

- valid users can still use Motion Lab normally
- automated output harvesting becomes materially slower
- rate-limit failures are understandable to humans and AI agents
- the rate limiter does not silently break the current hosted flow
- no new vendor or subscription is introduced by default

## Problem Statement

The protected Motion Lab path is now live and verified for happy-path behavior, negative-path behavior, and hosted MCP integration.

The biggest remaining cloning-resistance gap is throughput:

- a valid Pro user can still automate large numbers of recipe and render requests
- repeated output collection could be used to approximate the premium motion system over time
- there is currently no server-side throttle to slow that behavior down

This does not make Motion Lab "unprotected," but it does leave the premium path easier to mine than it should be.

## Target User

Primary users:

- the Supericons team implementing the hosted limiter
- the Supericons owner/operator making rollout and abuse-control decisions

Secondary users:

- valid Motion Lab MCP users who need understandable `429` responses
- AI agents that need clear retry guidance instead of generic failures

## Goals

- add first-pass hosted rate limiting to Motion Lab endpoints
- use Supabase Edge Functions plus Postgres as the default implementation path
- preserve current user experience for normal Motion Lab usage
- expose structured rate-limit errors that the MCP can pass through cleanly
- add verification for both below-limit and over-limit behavior
- avoid new paid vendors unless a later decision explicitly justifies them

## Non-Goals

- rate limiting for non-Motion-Lab MCP tools
- broad platform-wide API throttling
- browser consumer rollout
- perfect scraping prevention
- billing or usage metering
- a full abuse analytics dashboard
- introducing Upstash, Redis, or another new vendor in this batch

## Guiding Decisions

### Decision 1: Use Supabase Postgres as the first implementation path

Default approach:

- Supabase Edge Functions call a Postgres-backed rate-limit function

Why:

- uses infrastructure the project already owns
- avoids introducing a new vendor or billing relationship
- keeps rate-limit state close to the existing auth and entitlement data
- fits the repo's current migration + Edge Function architecture

Deferred alternative:

- external fast-counter infrastructure later only if real load proves Postgres insufficient

That later alternative is not part of this batch and must be explicitly approved if it introduces new paid infrastructure.

### Decision 2: Rate-limit session exchange separately from premium render traffic

The session endpoint and the premium render endpoints have different abuse shapes:

- session exchange should be quiet because the client caches tokens
- recipe/render endpoints are the real output-harvesting surface

So they should not share one blunt threshold.

### Decision 3: Use stable identities already available in the current architecture

First-pass limiter identity:

- `api_key_hash` for `motion-lab-session`
- `user_id` from the verified Motion Lab session for premium endpoints

This avoids relying on unstable transport headers or IP heuristics.

### Decision 4: Fail open on limiter-function errors in the first pass, but fail the release gate if the schema is missing

Reason:

- a limiter bug should not fully take down Motion Lab for valid users on day one
- but a release without the required schema/function in place should still be blocked

This is the same product tradeoff as before, but implemented with owned infrastructure:

- release-time schema/config is mandatory
- runtime limiter-specific database failure does not become a total premium-path outage
- abuse resistance degrades temporarily instead of breaking the whole product

### Decision 5: Return structured `429` errors, not generic failures

The MCP already preserves structured Motion Lab errors more cleanly than before.

The rate limiter should build on that by returning:

- clear error code
- retry guidance
- retry-after timing
- scope information

## Paid-Plan Flags

### Default recommendation in this plan

No new paid platform is required by design.

This plan assumes:

- the existing Supabase project remains the only backend dependency for rate limiting
- the required work is implemented with:
  - SQL migration(s)
  - existing Edge Functions
  - existing service-role access pattern

### Operational cost note

This plan does not introduce a new subscription, but it does add:

- more database writes
- more database reads
- more Edge Function work

So it will consume existing Supabase project quota and capacity. That is an operational usage concern, not a new vendor requirement.

### Future paid-risk items that are explicitly deferred

These are not part of the current recommendation and must be called out before adoption:

- external counter infrastructure such as Redis/Upstash
- paid scheduling/cleanup tooling if we later automate retention outside the current stack
- third-party observability or analytics products for limiter telemetry

## Proposed Policy

Separate buckets by endpoint family.

### Session exchange bucket

Endpoint:

- `POST /v1/motion-lab/session`

Identity:

- `api_key_hash`

Default first-pass limit:

- `12` requests per `10` minutes per API key hash

Reason:

- a healthy MCP client should not need frequent session refreshes
- this is high enough for normal retries but low enough to punish scripted token churn

### Recipe bucket

Endpoint:

- `POST /v1/motion-lab/recipe`

Identity:

- `user_id`

Default first-pass limit:

- `180` requests per `10` minutes per user

Reason:

- recipe calls are light and may happen repeatedly during agent exploration
- the budget should allow legitimate candidate comparison

### CSS render bucket

Endpoint:

- `POST /v1/motion-lab/render/css`

Identity:

- `user_id`

Default first-pass limit:

- `120` requests per `10` minutes per user

### Animated SVG render bucket

Endpoint:

- `POST /v1/motion-lab/render/animated-svg`

Identity:

- `user_id`

Default first-pass limit:

- `120` requests per `10` minutes per user

### Why these numbers are intentionally not tiny

`animate_icon` currently composes multiple premium calls under the hood.

The current composition is:

- `1` recipe call
- `1` CSS render call
- `1` animated SVG render call

So one `animate_icon` invocation currently consumes `3` hosted calls.

That means the `120`-per-`10`-minute CSS and animated-SVG ceilings allow roughly `40` full `animate_icon` calls in one window before either render bucket is exhausted.

The first-pass thresholds must account for this so we do not punish legitimate use while trying to slow scraping.

Longer term, the cleaner architecture is a future server-side bundle endpoint so one `animate_icon` invocation consumes one hosted bundle call instead of three separate premium calls.

## Response Contract

When a request exceeds the limit, the hosted service should return:

- HTTP `429`
- structured JSON

Example:

```json
{
  "error": "motion_lab_rate_limited",
  "message": "Motion Lab request limit reached for this window.",
  "hint": "Wait before retrying. If you are running a bulk workflow, reduce request frequency or reuse existing results where possible.",
  "retryable": true,
  "retry_after_seconds": 120,
  "limit_scope": "motion-lab-render-css:user"
}
```

Recommended header:

- `Retry-After`

## Implementation Approach

### New migration

Add a new SQL migration under `supabase/migrations/`.

Deliverables:

- `si_motion_lab_rate_limits` table
- indexes for hot lookups
- a Postgres function or RPC-safe helper that atomically:
  - resolves the current window
  - upserts or increments the counter
  - returns current count and retry timing

### Proposed schema

Suggested table:

- `si_motion_lab_rate_limits`

Suggested columns:

- `bucket` text
- `subject_kind` text
- `subject_key` text
- `window_started_at` timestamptz
- `window_seconds` integer
- `request_count` integer
- `created_at` timestamptz
- `updated_at` timestamptz

Suggested unique key:

- `(bucket, subject_kind, subject_key, window_started_at)`

Notes:

- `subject_key` is the already-hashed API key for session exchange or the existing `user_id` string for premium endpoints
- no raw API key is stored
- no new identity dimension is required in this batch

### Proposed database function

Suggested function:

- `si_enforce_motion_lab_rate_limit(...)`

Responsibilities:

- compute the current fixed window bucket
- insert or increment the matching row atomically
- calculate:
  - `allowed`
  - `request_count`
  - `remaining`
  - `retry_after_seconds`
  - `limit_scope`
- avoid race-condition-prone application-side read/then-write logic

### Retention strategy

First pass:

- no paid scheduler or new service
- keep retention simple
- delete stale rows older than a defined horizon with either:
  - a lightweight cleanup statement inside the function on a sampled basis, or
  - a manual SQL maintenance step documented for now

Recommendation for this batch:

- prefer sampled in-function cleanup only if it stays small and predictable
- otherwise document manual cleanup as the first-pass operational task

Do not depend on new scheduling infrastructure in this batch unless it is first discussed and approved.

## Shared Helper Design

### Shared file

Use:

- `supabase/functions/_shared/motion-lab/rate-limit.ts`

Responsibilities:

- read hardcoded default thresholds plus optional env overrides
- call the Postgres limiter function through the existing service-role client
- normalize the database result into the current Motion Lab limiter summary shape
- throw `MotionLabHttpError` with `429` when exceeded
- fail open when the limiter function itself errors unexpectedly

### Expected helper surface

Suggested functions:

- `enforceMotionLabRateLimit({ bucket, subject })`
- `buildMotionLabRateLimitScope(bucket, subjectKind)`
- optional `getMotionLabRateLimitConfigSummary()`

Suggested bucket names:

- `motion-lab-session`
- `motion-lab-recipe`
- `motion-lab-render-css`
- `motion-lab-render-animated-svg`

## Files to Update

### Migration layer

- `supabase/migrations/<new_motion_lab_rate_limit_migration>.sql`

Changes:

- create rate-limit table
- create indexes
- create limiter function

### Shared/auth layer

- `supabase/functions/_shared/motion-lab/auth.ts`

Changes:

- keep `validateMotionLabApiKeyHash()` and `requireMotionLabSession()` focused on auth
- expose or reuse the existing service-role client path for the limiter helper if helpful
- do not overload auth with rate-limiting logic

### Shared limiter layer

- `supabase/functions/_shared/motion-lab/rate-limit.ts`

Changes:

- remove external Redis dependency assumptions
- call the Postgres-backed limiter function
- preserve the current `429` contract

### Session function

- `supabase/functions/motion-lab-session/index.ts`

Changes:

- enforce the session bucket before minting a new session token
- use `api_key_hash` as the limiter subject

### Premium endpoints

- `supabase/functions/motion-lab-recipe/index.ts`
- `supabase/functions/motion-lab-render-css/index.ts`
- `supabase/functions/motion-lab-render-animated-svg/index.ts`

Changes:

- enforce endpoint-specific buckets after `requireMotionLabSession(req)` succeeds
- use `user_id` as the limiter subject

### Error layer

- `supabase/functions/_shared/motion-lab/errors.ts`

Changes:

- preserve `retry_after_seconds` and `limit_scope` in JSON error responses
- keep structured `429` support intact

### MCP client layer

- `mcp/motion-lab-client.js`
- `mcp/index.js`

Changes:

- preserve `retry_after_seconds` and `limit_scope` when a hosted `429` reaches the MCP client
- keep the user-facing tool response structured enough for agents to react intelligently

## Runtime Configuration

Required new env vars:

- none for the default owned-Postgres path

Recommended optional env overrides:

- `MOTION_LAB_RATE_LIMIT_SESSION_MAX`
- `MOTION_LAB_RATE_LIMIT_SESSION_WINDOW_SECONDS`
- `MOTION_LAB_RATE_LIMIT_RECIPE_MAX`
- `MOTION_LAB_RATE_LIMIT_RECIPE_WINDOW_SECONDS`
- `MOTION_LAB_RATE_LIMIT_RENDER_CSS_MAX`
- `MOTION_LAB_RATE_LIMIT_RENDER_CSS_WINDOW_SECONDS`
- `MOTION_LAB_RATE_LIMIT_RENDER_SVG_MAX`
- `MOTION_LAB_RATE_LIMIT_RENDER_SVG_WINDOW_SECONDS`

Default values should be hardcoded in the shared limiter helper so missing optional env vars do not break the service.

Release rule:

- missing migration or missing limiter function should block release sign-off

## Workstreams

### Workstream A: Schema and SQL enforcement

Deliverables:

- new migration
- Postgres limiter function
- documented retention strategy

Acceptance signals:

- the database can enforce a limit atomically without application-side race conditions
- the SQL function returns enough information to build the `429` contract

### Workstream B: Shared limiter helper pivot

Deliverables:

- Postgres-backed `rate-limit.ts`
- default bucket config
- structured `429` contract

Acceptance signals:

- helper can enforce a limit via Supabase/Postgres
- helper throws consistent `MotionLabHttpError` responses
- helper no longer depends on a new external vendor

### Workstream C: Session and premium endpoint protection

Deliverables:

- `motion-lab-session` protected by the session bucket
- recipe/render endpoints protected by per-user buckets

Acceptance signals:

- repeated session requests from the same key hash eventually produce `429`
- repeated premium calls from one user eventually produce `429`
- normal session, recipe, and render flows still work below threshold

### Workstream D: MCP error pass-through

Deliverables:

- MCP tool responses preserve limiter details

Acceptance signals:

- a `429` from hosted Motion Lab surfaces in the MCP tool response as a structured object containing:
  - `error`
  - `code`
  - `retry_after_seconds`
  - `limit_scope`
- those fields must not be collapsed into a plain `error.message` string
- the pass-through is verified by triggering a real or simulated hosted `429` and inspecting the full tool response shape

### Workstream E: Verification and rollout evidence

Deliverables:

- a rate-limit verification script or scripted manual flow
- updated release gates
- updated verification checklist

Acceptance signals:

- below-limit success path is proven
- over-limit `429` path is proven
- a limiter-function failure note is documented

## Verification Plan

### Automated checks

Use:

- `scripts/verify-motion-lab-rate-limits.mjs`

Suggested coverage:

1. success below threshold on recipe/render path
2. forced low-threshold environment for controlled verification
3. `429` contract shape
4. MCP pass-through shape for structured limit errors
5. fail-open behavior when the limiter function errors unexpectedly

### Manual or controlled checks

Needed because production thresholds should not be exercised recklessly:

1. temporarily lower one bucket threshold in Supabase function env
2. redeploy the Motion Lab functions
3. verify one endpoint crosses the threshold
4. verify recovery after window expiry
5. verify the MCP shows clear retry guidance
6. verify a limiter-specific failure path degrades safely instead of returning a generic `5xx`

## Release-Gate Updates

The release docs should be updated so that Motion Lab sign-off requires:

- owned limiter schema deployed
- below-limit path verified
- over-limit path verified
- limiter-failure behavior documented

## Deferred P2 Follow-Up

Close the first-pass logging question as a P2 follow-up, not as part of this implementation batch.

Suggested P2 scope:

- insert a row into a simple `motion_lab_rate_limit_events` table when a limit is exceeded
- include:
  - `user_id`
  - `bucket`
  - `timestamp`
  - `limit_scope`

This is intentionally deferred until the first limiter batch is stable. It is useful for abuse review and threshold tuning, but it is not required to ship the first-pass limiter itself.

## Risks

- limits set too low will frustrate legitimate agent workflows
- limits set too high will not materially slow harvesting
- fail-open behavior during limiter-function failure weakens protection temporarily
- per-user limits alone do not stop a determined attacker with many paid accounts
- a naive Postgres implementation could introduce race conditions unless the SQL function is truly atomic

## Success Metrics

### Primary metrics

- repeated Motion Lab output harvesting is materially slower than today
- normal Motion Lab MCP usage remains workable for a legitimate Pro user
- no new paid vendor is required for the first limiter release

### Supporting metrics

- structured `429` errors are understandable to humans and AI agents
- session exchange abuse is throttled separately from render usage

### Guardrail metrics

- `npm run build` still passes
- `npm run verify:motion-lab-hosted-live` still passes below threshold
- `npm run verify:motion-lab-negative-paths` still passes

## Open Questions

1. Should a second limiter dimension be added later for trusted network identity if Supabase request headers are stable enough to support it?
2. Should `animate_icon` eventually call a server-side bundle endpoint to reduce multi-call pressure on the limiter?
3. For row retention, is sampled in-function cleanup sufficient, or do we want a later scheduled cleanup path after we review current Supabase plan/features?

## Recommended Next Step

Start with the owned path, not a new vendor:

1. design the Postgres migration and atomic limiter function
2. pivot `rate-limit.ts` from external-counter assumptions to Supabase/Postgres
3. keep the existing hosted endpoint contract and MCP pass-through behavior intact

If a later step appears to require a new paid platform or paid-only feature, pause and flag it before implementation continues.
