# Motion Lab MCP Rate Limiting Infrastructure Analysis

Date: April 12, 2026
Auditor: Antigravity (independent review)
Sources reviewed:
- `docs/motion-lab-mcp-redis-cost-analysis.md`
- `docs/plans/motion-lab-mcp-rate-limiting-implementation-plan.md`
- `docs/motion-lab-mcp-post-implementation-report.md`
- Supabase pricing and billing documentation (April 12, 2026)

---

## Part 1: Postgres vs Redis for Supericons

### What the Redis Cost Analysis Got Right

The `motion-lab-mcp-redis-cost-analysis.md` memo is technically accurate. The pricing math is correct, the scenario tables are reasonable, and the questions it flags for an auditor are the right ones.

Its own buried conclusion at line 272-274 is the correct answer:

> "The more meaningful business question may be: 'Do we want another production dependency?' instead of: 'Can we afford the command bill?'"

Everything else in the document is pricing math around a question that is not the hard question.

---

### Why Postgres Is the Better Choice for Supericons Right Now

#### 1. Supericons is entirely inside Supabase

Every piece of the Motion Lab backend is a Supabase Edge Function. Auth lives in Supabase. The `si_api_keys` and `si_subscriptions` tables are in Supabase Postgres. The session token validation uses Supabase secrets.

Adding Upstash Redis means:
- A new vendor account
- New credentials to manage and rotate
- New failure surface to monitor
- New monthly invoice to track
- An outbound HTTP call from inside the Edge Function to an external service on every single premium Motion Lab request

That last point is not trivial. Every `motion-lab-recipe` and `motion-lab-render-css` call currently only talks to internal Supabase infrastructure. Adding Redis adds network latency on every premium generation.

#### 2. The rate limit data structure is simple, but the implementation still needs care

The proposed limit is per-user, per 10-minute window. What that requires:

- A counter key: `user_id + endpoint + window_bucket`
- A TTL: 10 minutes
- A counter: 0 to 180

Postgres can do this with a small dedicated table and an atomic database function keyed by `(subject_key, bucket, window_start)`, plus the right indexes and a cleanup path.

That is still a modest implementation for this product, but it is not "free" engineering:

- the counter increment must be atomic
- the schema needs the right unique key and lookup index
- cleanup needs to be defined
- observability needs to be good enough to know when the limiter becomes hot

So the right framing is:

- technically straightforward
- operationally manageable
- still worth designing carefully

#### 3. At current scale, Postgres is free

You are already paying for Supabase. A rate limit counter table costs nothing extra at current and near-term scale. The table will hold a few thousand rows at any moment, each under 100 bytes. Total size: well under 1 MB.

The Redis cost analysis correctly shows that Upstash PAYG would be $1 to $10/month at realistic early-stage traffic. $0 (Postgres) vs $1-10 (Redis) plus a new vendor dependency is an easy decision at this stage.

#### 4. Postgres gives you a queryable record, Redis does not

Rate limit events stored in Postgres are permanent until you clean them. You can:
- Query which users are hitting limits
- Debug a "my requests are being blocked" support ticket with a SQL query
- Tune thresholds with real data
- Spot abuse patterns without a separate analytics layer

Redis counters vanish after the TTL. If you want to keep that data for support and tuning - which the implementation plan's open question 3 correctly flags as a P2 task - you would end up writing it to Postgres anyway. That makes Redis an intermediary with no net benefit at this scale.

#### 5. Vendor simplicity matters more at solo scale

Supericons is built and run by one person. For a solo operator, vendor simplicity wins almost every time until you hit a scale where Postgres demonstrably cannot keep up.

For rate limiting at Motion Lab's current and near-term projected traffic, Postgres will not be the bottleneck. The bottlenecks will be Edge Function cold starts, render computation, and the session exchange round trip.

---

### Answering the Redis Analysis's Own Pressure-Test Questions

| Question | Answer |
|---|---|
| Is 2-3 Redis commands per hit still the right assumption? | Yes for Redis. Irrelevant if you choose Postgres. |
| Should `animate_icon` be modeled as exactly 3 calls? | Yes. Matters for Redis bill, not for Postgres. |
| Are read regions likely in our production design? | No. Single-region Supabase is fine. |
| Should comparison include engineering cost of a Postgres limiter? | Yes. That cost is low: one table, one upsert, one TTL query. |
| Is the Prod Pack realistically required for Supericons? | No. Not at current scale. |
| At what threshold does architecture matter more than cost? | Millions of premium renders per month. Not near-term. |
| Vendor simplicity vs implementation headroom? | Vendor simplicity. Solo operator. Same stack throughout. |

---

### The Pre-Defined Switch Trigger

The correct architecture is: **Postgres now, Redis later if the trigger fires.**

**Switch trigger:**
Switch to Redis only when a small set of measurable production signals say the Postgres limiter has become a real operational bottleneck.

Recommended trigger set:

- the limiter RPC/function becomes one of the top hot queries in Supabase query reporting
- p95 or p99 limiter latency becomes a meaningful part of total Motion Lab endpoint latency
- rate-limit writes and cleanup become a noticeable fraction of database load
- concurrency bursts make the limiter a visible source of response-time instability
- production traffic reaches a level where dedicated in-memory counters would simplify operations more than they complicate the vendor surface

That trigger is unlikely to fire until Motion Lab is processing hundreds of thousands of premium generations per month from thousands of concurrent Pro users. At that point you will have real usage data to right-size the Redis plan, and you will have plenty of time to migrate without urgency.

---

### Verdict: Part 1

**Postgres. Build it now. Keep Redis documented as a defined future upgrade path.**

The implementation plan correctly listed Postgres as the fallback. Based on this audit, it should be the primary path, not the fallback. Upstash Redis should be demoted to "upgrade path when the pre-defined trigger fires."

The one thing Redis does genuinely better - atomic counter increments without lock contention risk - is not a real concern at Motion Lab's current and near-term load. Postgres upserts with a proper index handle this traffic without issue.

---

## Part 2: Supabase Plan Limits and Upgrade Path

### Current Supabase Plan Limits (verified April 12, 2026)

| Feature | Free ($0) | Pro ($25/month) |
|---|---|---|
| Database size | 500 MB | 8 GB included, scales to 16 TB+ |
| Active projects | 2 max | Unlimited |
| Inactivity pause | Pauses after 1 week idle | Never pauses |
| Auth MAUs | 50,000 | 100,000 included |
| Edge function invocations | 500K/month | 2M/month included, then ~$2 per extra million |
| Max edge functions per project | 100 | 500 |
| Edge function max duration | 150s | 400s |
| Backups | None | Daily, 7-day retention |
| Email support | No | Yes |

---

### The Limit That Matters First for Supericons

**Edge function invocations, not database size.**

Every Motion Lab MCP premium call hits a Supabase Edge Function. The current call fanout:

| User action | Edge function hits |
|---|---|
| `list_motion_presets` | 0 (served from local baseline) |
| `get_motion_recipe` | 1 |
| `export_motion_css` | 1 |
| `export_animated_svg` | 1 |
| `animate_icon` | 3 (recipe + CSS render + SVG render) |

**Free plan ceiling: 500K invocations/month.**

Practical capacity estimates:

- 500,000 / 3 = 166,000 `animate_icon` calls/month
- 166,000 / 30 days = 5,500 `animate_icon` calls per day
- At 10 animations per agent session: approximately 550 productive agent sessions per day

That is a healthy ceiling for early-to-mid stage. When you approach it, the upgrade signal will be obvious in the Supabase dashboard.

---

### The One Free-Tier Problem You Need to Know Now

**Project pausing.**

Free tier projects pause after 1 week of inactivity. For a production premium product this is unacceptable. If a Pro subscriber tries to use Motion Lab MCP on a Monday morning after a quiet weekend, they get a 503 until Supabase wakes the project back up (15-30 seconds cold start).

**This is the actual reason to upgrade to Pro, not database limits or invocation limits.**

At $25/month, the no-pause guarantee alone is worth it for a paid product.

---

### What the Postgres Rate Limit Table Costs at Each Tier

A `motion_lab_rate_limits` table with this write pattern:
- 1 atomic limiter function call per endpoint hit
- internal insert-or-increment behavior inside that function
- a lightweight cleanup strategy for expired rows

At realistic early-stage Motion Lab traffic (tens of thousands of calls/month), this table holds a few thousand rows at any moment. Each row is under 100 bytes. Total table size: well under 1 MB.

**Postgres will not be a scaling constraint until you are at tens of millions of rate-limited requests per month.** At that point you will be well into Pro territory and should re-evaluate Redis at that threshold.

---

### Upgrade Decision Map

| Signal | Action |
|---|---|
| You launch Motion Lab to paying customers | Upgrade to Pro immediately. $25/month. No-pause guarantee is mandatory for a paid product. |
| Auth MAUs approach 50,000 | Already on Pro, extends gracefully to 100,000 included. |
| Edge function invocations approach 1.6M/month | Still on Pro. Overage is ~$2 per extra million after the included 2M. Very manageable. |
| Database approaches 7 GB | Consider a compute upgrade. This is far in the future for a Motion Lab/icon product. |
| Rate limit table writes measurably slow response time | Switch from Postgres to Redis. This is your pre-defined trigger from Part 1. |

---

### Bottom Line

**Upgrade to Pro before you open Motion Lab to paying customers.**

Not because of database limits, connection limits, or rate limit write volume. Because the free tier pauses inactive projects, and that is incompatible with a premium subscription product.

After that:
- Postgres rate limiting costs nothing extra
- Edge function overages are ~$2 per extra million, only kicks in after 2 million calls/month on Pro
- Database size will not be a concern for a long time
- No Redis needed until you are at a scale where the pre-defined trigger fires

The entire early-to-mid growth phase of Supericons Motion Lab fits cleanly inside $25/month on Supabase Pro, with no additional vendors and no architectural changes.

---

## Summary: The Three Decisions

| Decision | Answer |
|---|---|
| Postgres or Redis for rate limiting? | Postgres. Now. Redis only when the trigger fires. |
| Which Supabase plan? | Pro ($25/month) before launching to paying customers. |
| When to add Redis? | When the limiter becomes a measurable production bottleneck across query heat, endpoint latency, or database load. |

---

## Addendum: Implementation-State Note

This document is making an architecture recommendation, not describing the exact runtime state of the repo at every moment.

At the time of review:

- the Motion Lab plan documents had already pivoted to Postgres-first
- the repo still contained an uncommitted Upstash-based `rate-limit.ts` helper from the earlier implementation attempt

So the correct reading is:

- **recommended architecture:** Postgres now, Redis later if the trigger fires
- **current implementation state:** still needs to be fully pivoted to match that recommendation

That gap does not weaken the analysis. It only means the code should be brought back into alignment with the decision before rate limiting is considered complete.

---

## Source Note

The Supabase plan numbers above should be treated as current as of April 12, 2026 and re-checked before any public pricing or capacity commitment is published.

Primary source:

- Supabase billing docs: `https://supabase.com/docs/guides/platform/billing-on-supabase`
