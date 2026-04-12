# Motion Lab MCP Postgres Rollout Audit

Date: April 13, 2026
Auditor: Antigravity (independent review)
Reference: `docs/motion-lab-mcp-audit-handoff-summary.md`
Scope: Postgres rate limiter implementation + Motion Lab MCP E2E product audit

---

## Part 1: Postgres Rate Limiter Implementation Audit

### 1.1 SQL Schema

**Verdict: Well designed, production-ready with one minor observation.**

#### What is correct

- The unique constraint `si_motion_lab_rate_limits_window_unique` on `(bucket, subject_kind, subject_key, window_started_at)` is the right composite key for fixed-window counters
- The `INSERT ... ON CONFLICT ON CONSTRAINT ... DO UPDATE` pattern is atomic. Postgres handles this as a single lock-free operation inside a transaction. No separate select-then-update race condition is possible
- Input validation at the SQL layer (`v_bucket = ''` check, `p_limit <= 0` guard) duplicates the TypeScript layer - correct defense-in-depth
- `security definer + set search_path = public` is correct security hygiene for a function operating on a specific table
- `revoke all from public` then `grant ... to service_role` is the right permission model - the table and function are inaccessible to anonymous Supabase clients
- The probabilistic cleanup (`if random() < 0.01 then delete ... where updated_at < now() - 1 day`) is pragmatic - it cleans expired rows incrementally without a dedicated cron job

#### Observation (not a bug)

The cleanup deletes rows older than 1 day, but rate limit windows are 10 minutes. Rows from earlier in the day but outside the active window accumulate for up to 24 hours before cleanup. At current traffic volume the table remains small. At very high traffic this could grow. The handoff doc correctly flags cleanup/retention as an open item.

#### SQL bug caught and fixed during rollout

The original function body used `on conflict (bucket, subject_kind, subject_key, window_started_at)`, which caused a runtime PL/pgSQL ambiguity because `window_started_at` is also a `returns table` output column. It was correctly resolved by switching to the named constraint form:

```sql
on conflict on constraint si_motion_lab_rate_limits_window_unique
```

The local migration file reflects the fixed form. Good discipline.

---

### 1.2 TypeScript Rate Limit Helper

**Verdict: Correct and well-structured. Three observations worth knowing.**

#### What is correct

- Fail-open behavior is correctly implemented. When `SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` is missing, the function returns a degraded summary and allows the request through. This matches the stated design: fail-release on missing config at deploy time, fail-open at runtime if the backend is unavailable
- `sanitizeSubject` (`trim().toLowerCase()`) normalizes subject keys before they reach the SQL function, which also normalizes via `lower(trim(...))`. Double normalization is harmless
- The `once` warning pattern (`missingConfigWarningShown`, `backendWarningShown`) prevents log floods on repeated failures - important for Edge Function environments where log volume has a cost
- Env overrides (`MOTION_LAB_RATE_LIMIT_RECIPE_MAX`, `MOTION_LAB_RATE_LIMIT_RECIPE_WINDOW_SECONDS`, etc.) allow threshold tuning without redeployment
- The 429 error shape (`MotionLabHttpError` with status 429, `code: 'motion_lab_rate_limited'`, plus `retry_after_seconds` and `limit_scope` in details) matches the MCP pass-through contract exactly

#### Observation 1: Module-scoped warning flags reset on cold start

`missingConfigWarningShown` and `backendWarningShown` are module-level variables. Deno Edge Functions restart on cold starts, resetting these flags. The `once` guard prevents log floods within a single invocation, not across invocations. This is correct behavior - just worth knowing if repeated warnings appear in Supabase logs.

#### Observation 2: Dead export

`getMotionLabRateLimiter()` at line 153-155 returns `getMotionLabAdminClient()` but is never called from within `enforceMotionLabRateLimit`. The actual function calls `getMotionLabAdminClient()` directly at line 212. The exported `getMotionLabRateLimiter` function is dead code. Not a bug, but should be removed when convenient.

#### Observation 3: Remaining field defensive fallback

The `remaining` field fallback at line 249 (`Math.max(0, remaining) : Math.max(0, config.limit - requests)`) could produce a meaningless value if `requests > config.limit` and `remaining` is NaN - but `Math.max(0, ...)` correctly clamps it to zero in all cases. No bug. Reasoning is sound.

---

### 1.3 Hosted Endpoint Integration

**Verdict: All four endpoints are consistently wired. No gaps.**

All four endpoints follow an identical, clean pattern:

1. CORS preflight handled
2. Method guard (POST only)
3. Session authentication (`requireMotionLabSession`)
4. Rate limit enforcement (`enforceMotionLabRateLimit`)
5. Request parsing
6. Response building
7. Error normalization via `buildMotionLabErrorResponse`

The order of operations is correct. Rate limiting happens **after** authentication:

- Unauthenticated requests are rejected at step 3 before consuming a rate limit slot
- Rate limit counters are keyed by `session.userId` (a validated user ID), not by a spoofable header

The session endpoint correctly rates limits by `api_key_hash` **before** validating the key. Brute-force API key probing is rate limited even before we know if the key is valid.

---

### 1.4 MCP Client 429 Pass-Through

**Verdict: Correct. The 429 contract is preserved end-to-end.**

`normalizeErrorFromBody` correctly maps all fields from the hosted error response:

| Hosted field | MCP client property |
|---|---|
| `body.error` | `code` |
| `body.retry_after_seconds` | `retry_after_seconds` |
| `body.limit_scope` | `limit_scope` |
| `body.hint` | `hint` |
| `body.retryable` | `retryable` |

These surface in the MCP tool error output because `index.js` formats tool errors using these properties.

#### Gap found: Partial fanout consumes rate limit slots on failure

`animateMotionLabIconHosted` fires three hosted calls in parallel with `Promise.all`. If any one call triggers a 429, `Promise.all` rejects immediately but the other two calls may have already been counted against the rate limit. This means a single `animate_icon` call near the limit boundary can consume 1-2 rate limit slots from a request that fails at the user level.

This is not wrong - it is a known consequence of parallel composition. The stated thresholds (180 recipe / 120 CSS / 120 SVG per 10 min) are generous enough to absorb partial fanout events. Worth documenting for future threshold tuning.

---

## Part 2: Motion Lab MCP E2E Product Audit

### 2.1 What Is Genuinely Complete

All five layers of the protection model are implemented and verified:

| Layer | Status | Verification |
|---|---|---|
| Stripped local baseline | Complete | `motion-lab-baseline.json` contains only metadata, no keyframe geometry |
| API key gating | Complete | Session exchange requires valid `api_key_hash` against `si_api_keys` |
| HMAC-signed session tokens | Complete | `mintMotionLabSession` in `auth.ts` signs with server-side secret |
| Server-side-only rendering | Complete | All CSS/SVG computation runs inside Edge Functions; output only is returned |
| Postgres rate limiting | Complete | Deployed, live-tested, 429 triggered and proven, threshold restored to 180/10min |

The local regression checks also passed:
- `npm run build`
- `npm --prefix mcp run verify:package`

---

### 2.2 What Remains Open

#### 1. Exposed Pro API key rotation pending (most urgent)

One Pro API key appeared in terminal output and was copied into chat. Until that key is rotated, the transcript represents a live credential exposure. Rotate at the next available opportunity.

#### 2. Cleanup and retention behavior still needs observation

The probabilistic cleanup strategy is acceptable for current scale, but it has not yet been observed over longer-lived production traffic. This is now the main remaining operational question for the limiter itself.

#### 3. Token refresh remains a separate live operational check if desired

The key live rate-limit and fail-open behaviors are now proven. A separate “session expiry then refresh” run would still be useful operationally, but it is outside the core limiter proof set.

#### 4. User guide and UX hardening are still separate product work

The core MCP guide and selector response improvements exist, but docs-page integration and sidebar refinement are still separate workstreams.

---

## Part 3: Pre-Launch Priority List

| Priority | Item | Blocking launch? |
|---|---|---|
| P0 | Rotate the exposed Pro API key | Yes - credential hygiene |
| P1 | Write post-rollout verification report capturing 429 evidence | No, but before public announcement |
| P1 | Write user guide: IDE setup + error reference | No, but before public release |
| P2 | Observe cleanup/retention behavior under real traffic | No |
| P2 | Optionally run a token-refresh live check after session expiry | No |
| P3 | Remove dead `getMotionLabRateLimiter` export from `rate-limit.ts` | No |

---

## Summary Verdict

The Postgres rate limiter implementation is **solid**. The SQL is atomic and correctly uses named constraint conflict resolution. The TypeScript is defensively written with correct fail-open behavior, normalized subject keys, and a clean 429 error contract. The MCP pass-through preserves all required fields. All four hosted endpoints are consistently wired with authentication before rate limiting.

The product as a whole is **ready for controlled launch** once:

1. The exposed API key is rotated
2. The user guide is written
3. The post-rollout report is created

The main verification gaps called out earlier have now been closed in live rollout work: session `429`, CSS `429`, animated SVG `429`, and fail-open degradation. The remaining follow-ups are operational tuning, key rotation, and documentation polish.
