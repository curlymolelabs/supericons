# Motion Lab MCP Rate Limiting Plan Audit

Date: April 12, 2026
Auditor: Antigravity (independent review)
Source plan: `docs/plans/motion-lab-mcp-rate-limiting-implementation-plan.md`
Status: Pre-implementation review

---

## Verdict

Good to proceed with Workstream A. Three issues should be resolved before the session and render endpoint wiring begins (Workstreams B and C).

---

## What Is Solid

The core decisions are all correct and do not need changes.

### Fail release on missing config, fail open on Redis outage

This is the right first-pass tradeoff. Failing open preserves Motion Lab availability for legitimate users during a transient Redis outage. Failing the release gate on missing Upstash credentials ensures the limiter is never silently absent in production.

### Separate buckets per endpoint

Correct. Session exchange and render endpoints have genuinely different abuse shapes and must not share one threshold. The session endpoint should be quiet because the client caches tokens. The recipe and render endpoints are the real output-harvesting surface.

### Identity strategy

Using `api_key_hash` for session exchange and `user_id` for premium endpoints is correct. `api_key_hash` is the only verified identity available at session-exchange time. `user_id` is the stable identity after a session is established.

### Structured `429` contract

The contract shape is right. `retry_after_seconds`, `limit_scope`, `retryable`, and `hint` give both humans and AI agents enough information to react correctly rather than silently retry or hard-fail.

### `animate_icon` multi-call awareness in threshold reasoning

The plan correctly identifies that `animate_icon` composes multiple premium calls, and uses this as the reason for setting thresholds high enough to accommodate legitimate agent use. This is the most important nuance in the plan and it is handled correctly.

---

## Issue 1: The `animate_icon` multi-call composition is noted but not quantified

**Where it appears:** Plan lines 209-211 (Why these numbers are intentionally not tiny).

**The gap:**

The plan says `animate_icon` composes multiple premium calls and that thresholds must account for this. But it does not specify how many sub-calls `animate_icon` actually makes.

From the audited code (`mcp/index.js` lines 666-683), `animate_icon` calls `animateMotionLabIconHosted()` which internally composes:

- 1 recipe call (`getMotionLabRecipeHosted`)
- 1 CSS render call (`renderMotionLabCssHosted`)
- 1 SVG render call (`renderMotionLabAnimatedSvgHosted`)

That is 3 hosted calls per one user-visible `animate_icon` invocation.

At the current thresholds (120 CSS renders and 120 SVG renders per 10 minutes), a user making 40 `animate_icon` calls would consume both ceilings simultaneously. 40 `animate_icon` calls per 10 minutes is a reasonable user ceiling, so 120 is likely correct - but the reasoning is not documented inside the plan.

**What to add:**

Document the sub-call composition explicitly in the policy section:

> `animate_icon` = 1 recipe call + 1 CSS render call + 1 SVG render call = 3 hosted calls per invocation. The 120-per-10-minute ceiling allows approximately 40 `animate_icon` calls in one window.

Also flag open question 2 ("Should `animate_icon` eventually call a server-side bundle endpoint?") as the recommended long-term fix. A single server-side bundle endpoint would consume 1 rate-limit counter instead of 3. This is the correct architectural path once the first-pass limiter proves stable.

---

## Issue 2: Workstream D lacks a code-level acceptance signal for the MCP pass-through

**Where it appears:** Workstream D acceptance signals.

**The gap:**

The current catch block pattern in `mcp/index.js` (lines 548-550, 591-593, and similar) is:

```javascript
} catch (error) {
  return buildTextResponse({ error: error.message });
}
```

`error.message` is a string. The structured `429` fields (`retry_after_seconds`, `limit_scope`, `retryable`) will be silently dropped here unless Workstream D explicitly rewrites these catch blocks to forward the full error object rather than just its message.

The plan correctly identifies Workstream D as the MCP pass-through step, but the acceptance signal only says "429 from hosted Motion Lab becomes structured MCP output with retry guidance." This is vague enough that the workstream could be marked done while the fields are still swallowed.

**What to add:**

Replace the current Workstream D acceptance signal with:

> A `429` error from hosted Motion Lab surfaces in the MCP tool response as a structured object containing `error`, `code`, `retry_after_seconds`, and `limit_scope`. These fields must not be collapsed into a plain `error.message` string. The pass-through should be verified by triggering a real or simulated `429` from the hosted endpoint and inspecting the full tool response shape.

This gives the implementer a testable target and prevents the "technically done" failure mode.

---

## Issue 3: No verification path for fail-open behavior during Redis outage

**Where it appears:** Verification Plan, Workstream E coverage list.

**The gap:**

Decision 4 states that a transient Redis outage should not take down Motion Lab. The current Workstream E verification list covers:

1. Success below threshold
2. Forced low-threshold for local/staging verification
3. `429` contract shape
4. MCP pass-through shape

There is no item for: Upstash is unavailable - verify the fail-open path allows the request through without a 5xx.

This matters because the fail-open behavior is a deliberate design decision that needs to be proved, not assumed. A bug in the fail-open branch (for example, an unhandled exception when the Upstash client throws a connection error) would silently become a hard fail, contradicting the plan's stated intent.

**What to add:**

Add a fifth verification item to Workstream E:

> Simulate a Redis connection failure (for example, by configuring bad Upstash credentials in a test environment) and verify that the hosted Motion Lab endpoint still returns a valid result rather than a 5xx error.

Document the observed behavior as the reference for the "fail-open path is confirmed" release gate item.

---

## Observation: Open Question 3 Should Be Closed as a P2 Follow-Up

Open question 3 asks: "Should rate-limit events be logged into Postgres for abuse review and support workflows?"

This is worth closing now even if the answer is "not in this batch." Logging `429` hits to Postgres does not require a separate analytics dashboard. It only requires inserting a row into a simple `motion_lab_rate_limit_events` table when the limit is triggered. The cost is minimal. The value is high: being able to see which users are actually hitting limits is the primary input for tuning thresholds in the next pass.

Recommended: Close this as a P2 follow-up with a concrete scope note rather than leaving it as a question.

Scope for P2: on limit exceeded, insert a row with `user_id`, `bucket`, `timestamp`, and `limit_scope`. No aggregation or UI in this pass.

---

## Summary Scorecard

| Item | Status |
|---|---|
| Upstash Redis as default path | Good |
| Separate buckets per endpoint | Good |
| Identity strategy (`api_key_hash` for session, `user_id` for premium) | Good |
| Structured `429` contract | Good |
| Fail release on missing limiter config | Good |
| Fail open on Redis outage | Good decision. Gap: no verification for it |
| `animate_icon` multi-call count documented | Gap: composition count not explicit in plan |
| MCP pass-through for `429` fields | Gap: Workstream D needs a concrete code-level acceptance signal |
| Postgres logging for abuse review | Recommend closing as P2 follow-up instead of leaving as open question |

---

## Recommended Actions Before Code Starts

| Action | When | Effort |
|---|---|---|
| Document `animate_icon` = 3 hosted calls in policy section | Before Workstream B/C | Low |
| Rewrite Workstream D acceptance signal with field-level test target | Before Workstream D | Low |
| Add fail-open outage test to Workstream E coverage list | Before Workstream E | Low |
| Close open question 3 as a named P2 follow-up | Before Workstream A closes | Low |

None of these block starting Workstream A. The shared helper and bucket thresholds can be written immediately. Issues 1 and 2 become relevant when wiring the session and render endpoint protection. Issue 3 becomes relevant when writing the verification scripts.
