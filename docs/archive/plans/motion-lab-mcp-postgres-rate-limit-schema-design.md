# Motion Lab MCP Postgres Rate-Limit Schema Design

Date: April 12, 2026
Status: Draft
Owner: Supericons
Scope: Motion Lab hosted premium path only
Depends on:
- `docs/plans/motion-lab-mcp-rate-limiting-implementation-plan.md`
- `docs/motion-lab-mcp-rate-limiting-infrastructure-analysis.md`
- `supabase/functions/motion-lab-session/index.ts`
- `supabase/functions/motion-lab-recipe/index.ts`
- `supabase/functions/motion-lab-render-css/index.ts`
- `supabase/functions/motion-lab-render-animated-svg/index.ts`

## Purpose

Turn the Postgres-first rate-limiting decision into a concrete database design that is:

- atomic under concurrent requests
- cheap enough for early and mid-stage Motion Lab traffic
- observable enough to support tuning and future migration decisions
- compatible with the existing Motion Lab `429` error contract

This document is the implementation target for the owned Supabase/Postgres path. It replaces the earlier external-counter assumption.

## Decision Summary

Use a small dedicated Postgres table plus one atomic SQL function.

The Edge Functions should:

1. compute the limiter subject in application code
2. call one Postgres function through the existing service-role client
3. receive a normalized result
4. convert an exceeded result into the existing Motion Lab `429` response shape

The database should be responsible for:

- window bucketing
- insert-or-increment behavior
- concurrency safety
- returning request count and retry timing

## Non-Goals

- cross-product rate limiting
- IP-based rate limiting
- browser rollout
- analytics-heavy abuse reporting
- a Redis implementation in this batch
- introducing any new paid vendor

## Data Model

### Table

Create:

- `public.si_motion_lab_rate_limits`

### Columns

Recommended columns:

- `bucket text not null`
- `subject_kind text not null`
- `subject_key text not null`
- `window_started_at timestamptz not null`
- `window_seconds integer not null`
- `request_count integer not null default 0`
- `created_at timestamptz not null default timezone('utc', now())`
- `updated_at timestamptz not null default timezone('utc', now())`

### Constraints

Recommended constraints:

- `check (window_seconds > 0)`
- `check (request_count >= 0)`
- `check (char_length(bucket) > 0)`
- `check (char_length(subject_kind) > 0)`
- `check (char_length(subject_key) > 0)`

### Unique Key

Use one unique key to guarantee one row per fixed window:

- `(bucket, subject_kind, subject_key, window_started_at)`

### Indexes

Recommended indexes:

1. unique index on `(bucket, subject_kind, subject_key, window_started_at)`
2. cleanup index on `(updated_at)`
3. optional support index on `(subject_key, bucket, updated_at desc)`

The unique index is the hot path. The cleanup index exists only to make stale-row deletion predictable.

## Identity Model

The table intentionally stores stable non-raw identities only.

For `motion-lab-session`:

- `subject_kind = 'api_key_hash'`
- `subject_key = <hashed api key already supplied to the session endpoint>`

For premium endpoints:

- `subject_kind = 'user'`
- `subject_key = <verified user_id from the Motion Lab session token>`

This avoids:

- storing raw API keys
- depending on unstable IP heuristics
- mixing auth logic with limiter logic

## Windowing Strategy

Use a fixed-window bucket for the first implementation.

Given:

- `window_seconds = 600`
- request timestamp `t`

The function should derive:

- `window_started_at = to_timestamp(floor(extract(epoch from t) / window_seconds) * window_seconds)`

Why fixed window first:

- easy to explain
- easy to debug
- cheap to compute
- sufficient for Motion Lab’s first-pass anti-harvesting goals

Sliding-window precision is not required for this batch.

## Database Function

### Function Name

Recommended function:

- `public.si_enforce_motion_lab_rate_limit`

### Suggested Signature

```sql
si_enforce_motion_lab_rate_limit(
  p_bucket text,
  p_subject_kind text,
  p_subject_key text,
  p_limit integer,
  p_window_seconds integer,
  p_now timestamptz default timezone('utc', now())
)
```

### Return Shape

Return one row with:

- `allowed boolean`
- `request_count integer`
- `remaining integer`
- `retry_after_seconds integer`
- `window_started_at timestamptz`
- `window_ends_at timestamptz`

The Edge helper can derive:

- `limit_scope`
- bucket summary metadata

### Function Responsibilities

The function should:

1. validate inputs
2. compute the fixed window start/end
3. atomically insert or increment the matching row
4. return the new count
5. compute remaining budget
6. compute retry timing as `window_ends_at - p_now`

### Atomicity Strategy

Use:

- `INSERT ... ON CONFLICT (...) DO UPDATE`

with:

- `request_count = si_motion_lab_rate_limits.request_count + 1`
- `updated_at = timezone('utc', now())`

and return the final row in the same SQL statement.

This keeps the hot path inside one atomic database write instead of an application-side:

- read
- compare
- write

pattern that would race under concurrency.

## Example Behavior

### Allowed request

Input:

- bucket: `motion-lab-recipe`
- subject: `user:e655c...`
- limit: `180`
- window: `600`
- current count before request: `17`

Return:

- `allowed = true`
- `request_count = 18`
- `remaining = 162`

### Exceeded request

Input:

- bucket: `motion-lab-render-css`
- subject: `user:e655c...`
- limit: `120`
- window: `600`
- current count before request: `120`

Return:

- `allowed = false`
- `request_count = 121`
- `remaining = 0`
- `retry_after_seconds = <seconds until current window ends>`

This is acceptable for the first pass. The over-limit request is still counted, which slightly penalizes aggressive retries and keeps the implementation simple.

## Edge Helper Contract

The shared helper in:

- `supabase/functions/_shared/motion-lab/rate-limit.ts`

should normalize the function result into the current Motion Lab summary shape:

- `enabled`
- `available`
- `degraded`
- `bucket`
- `subjectKind`
- `limit`
- `windowSeconds`
- `limitScope`
- `requests`
- `remaining`
- `retryAfterSeconds`
- `reason`

And when `allowed = false`, it should throw a `MotionLabHttpError` carrying:

- `status: 429`
- `code: 'motion_lab_rate_limited'`
- `retry_after_seconds`
- `limit_scope`
- `retryable: true`

This keeps the hosted error contract stable while the storage backend changes.

## Cleanup Strategy

First pass:

- keep stale rows for a bounded short horizon
- remove rows older than a small multiple of the largest supported window

Recommended starting rule:

- delete rows older than `24 hours`

Recommended implementation order:

1. prefer lightweight sampled cleanup inside the function or helper only if it remains cheap
2. otherwise document manual cleanup SQL as the first operational step
3. revisit scheduled cleanup later only if table growth actually becomes noticeable

Why not over-engineer cleanup now:

- the table is tiny at expected early traffic
- the limiting factor is correctness and visibility, not storage

## Observability

Day-one observability should be enough to answer:

- is the limiter hot?
- are users being rate-limited unexpectedly?
- is cleanup becoming noisy?

Recommended day-one signals:

- Edge logs when a `429` is returned
- ability to query the table by `subject_key` and `bucket`
- `pg_stat_statements` review once live traffic exists

Recommended support queries:

- recent rows for a given `user_id`
- recent rows for a given `api_key_hash`
- top buckets by write volume

Deferred P2:

- separate `si_motion_lab_rate_limit_events` table for exceeded requests

## Security Notes

- do not store raw API keys
- do not expose the limiter table directly to clients
- call the SQL function only through the existing service-role path used by Motion Lab backend code
- keep the table outside browser-facing access patterns

RLS is not the primary control here because the table should only be touched by privileged backend code.

## Failure Behavior

If the SQL function is missing or mis-deployed:

- release should be blocked

If the SQL function exists but fails at runtime unexpectedly:

- the helper should fail open in the first pass
- log the problem
- preserve availability for legitimate users

This matches the current product decision for first-pass abuse resistance:

- do not silently ship without the limiter
- do not take the premium path down on transient limiter failure

## Migration Notes

The migration should include:

1. table creation
2. constraints
3. unique index
4. cleanup/support index
5. limiter function creation
6. comments describing purpose and identity model

Keep the migration narrowly scoped to Motion Lab only.

## Rollout Plan

1. add the migration
2. deploy the function/schema
3. pivot the shared Edge helper away from Upstash assumptions
4. keep endpoint bucket thresholds unchanged
5. verify:
   - below-threshold success
   - over-threshold `429`
   - MCP pass-through shape
   - limiter-failure fail-open behavior

## Risks

- a naive SQL function can still race if the upsert logic is not written carefully
- excessive cleanup inside the hot path could make the limiter more expensive than necessary
- counting exceeded requests changes retry behavior and should be documented
- fixed windows are simpler but can be burstier at boundary edges than sliding windows

## Recommendation

Build the first Motion Lab limiter with this shape:

- one small Postgres table
- one atomic limiter function
- one shared Edge helper

Keep Redis documented as an upgrade path, not as the first dependency.
