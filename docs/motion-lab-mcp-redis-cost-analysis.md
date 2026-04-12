# Motion Lab MCP Redis Cost Analysis

Date: April 12, 2026
Status: Research memo
Owner: Supericons
Scope: Motion Lab hosted rate limiting
Purpose:
- estimate what managed Redis could cost for Motion Lab if usage becomes high
- define what "high" means in practical Motion Lab terms
- provide enough context for another agent to audit the assumptions and recommendation

## Why This Memo Exists

Motion Lab needs server-side rate limiting to make output harvesting materially harder.

We explored a managed Redis path earlier because Redis is a very natural fit for counters and expiring windows. Before deciding whether that cost is worth paying for, this memo estimates likely command usage and maps it back to real Motion Lab workflows.

This memo is not a final architecture decision.

It is a pricing and scaling input for the decision.

## Current Product Context

Current hosted Motion Lab endpoints:

- `motion-lab-session`
- `motion-lab-recipe`
- `motion-lab-render-css`
- `motion-lab-render-animated-svg`

Current MCP composition:

- `get_motion_recipe` -> one hosted recipe call
- `export_motion_css` -> one hosted CSS render call
- `export_animated_svg` -> one hosted animated SVG render call
- `animate_icon` -> three hosted calls:
  - one recipe call
  - one CSS render call
  - one animated SVG render call

So one user-visible `animate_icon` call is currently a three-endpoint hosted fanout.

## Research Sources

Official sources used:

- Upstash pricing page:
  - https://upstash.com/pricing
- Upstash pricing and limits docs:
  - https://upstash.com/docs/redis/overall/pricing
- Upstash ratelimit command-cost docs:
  - https://upstash.com/docs/redis/sdks/ratelimit-ts/costs
- Upstash ratelimit overview:
  - https://upstash.com/docs/redis/sdks/ratelimit-ts/overview

Research date:

- April 12, 2026

Pricing may change later. Any final decision should recheck the official pages above.

## Official Upstash Pricing Snapshot

As researched on April 12, 2026:

- Free:
  - `500K` commands per month
  - `256 MB` data
- Pay-as-you-go:
  - `$0.20` per `100K` commands
  - first `200 GB` monthly bandwidth free
  - storage billed at `$0.25 / GB`
- Fixed plan starts at:
  - `250 MB`
  - `$10 / month`
  - no per-command pricing
- Prod Pack:
  - `+$200 / month per database`
- Published max request rate for most plans:
  - `10,000 req/sec`

For Motion Lab rate limiting, command cost is the main driver. Storage and bandwidth should be small because rate-limit keys are tiny and short-lived.

## Assumptions Used For Motion Lab

### Assumption 1: One endpoint hit costs about 2 to 3 Redis commands

Why this is reasonable:

- Upstash fixed-window rate limiting docs show:
  - first hit: `3` commands
  - intermediate hit: `2` commands
  - cached blocked hit can be `0`

For rough costing, `2 to 3` commands per rate-limited endpoint hit is a practical planning estimate.

### Assumption 2: One `animate_icon` call uses 3 hosted endpoints today

Current composition:

- `1` recipe request
- `1` CSS render request
- `1` animated SVG render request

So one `animate_icon` call uses roughly:

- `6 to 9` Redis commands

Math:

- `3` hosted endpoint hits
- each hit costs about `2 to 3` Redis commands

### Assumption 3: No global read regions are enabled

This memo assumes a simple single-region setup.

Upstash notes that with global/read-region setups, write command cost increases. If read regions are enabled later, actual cost will be higher than the estimates in this memo.

### Assumption 4: We are modeling the rate limiter only

This memo does not price:

- storing rendered SVGs in Redis
- queueing
- analytics-heavy Redis usage
- broader platform caching

It only prices the Redis command cost for Motion Lab rate limiting.

## Simple Cost Formula

Pay-as-you-go request price:

- `$0.20` per `100,000` commands

Equivalent shorthand:

- `1M commands` = `$2`
- `5M commands` = `$10`
- `10M commands` = `$20`
- `50M commands` = `$100`

## Scenario Set A: By `animate_icon` Volume

Assumption:

- `1 animate_icon = 6 to 9 Redis commands`

| Monthly `animate_icon` calls | Monthly Redis commands | Estimated PAYG Redis cost |
|---|---:|---:|
| 10,000 | 60K to 90K | $0.12 to $0.18 |
| 100,000 | 600K to 900K | $1.20 to $1.80 |
| 500,000 | 3.0M to 4.5M | $6.00 to $9.00 |
| 1,000,000 | 6.0M to 9.0M | $12.00 to $18.00 |
| 5,000,000 | 30.0M to 45.0M | $60.00 to $90.00 |

## Scenario Set B: By User Behavior

Assumption:

- each user action here is a full `animate_icon` call
- 30 days/month
- `1 animate_icon = 6 to 9 Redis commands`

| Active users | `animate_icon` calls per user per day | Monthly `animate_icon` calls | Monthly Redis commands | Estimated PAYG Redis cost |
|---|---:|---:|---:|---:|
| 100 | 10 | 30,000 | 180K to 270K | $0.36 to $0.54 |
| 1,000 | 10 | 300,000 | 1.8M to 2.7M | $3.60 to $5.40 |
| 1,000 | 20 | 600,000 | 3.6M to 5.4M | $7.20 to $10.80 |
| 5,000 | 10 | 1.5M | 9.0M to 13.5M | $18.00 to $27.00 |
| 10,000 | 20 | 6.0M | 36.0M to 54.0M | $72.00 to $108.00 |

## Scenario Set C: Recipe-Only Exploration

This helps if a future agent argues that many users may call recipes more often than full bundles.

Assumption:

- one recipe request = `2 to 3` Redis commands

| Monthly recipe calls | Monthly Redis commands | Estimated PAYG Redis cost |
|---|---:|---:|
| 100,000 | 200K to 300K | $0.40 to $0.60 |
| 1,000,000 | 2.0M to 3.0M | $4.00 to $6.00 |
| 10,000,000 | 20.0M to 30.0M | $40.00 to $60.00 |

## What "High" Means For Motion Lab

For this product, a practical framing is:

- Low:
  - under `500K` Redis commands/month
  - likely free-tier or near-free
- Moderate:
  - `500K` to `5M` commands/month
  - roughly `$1` to `$10`/month
- High:
  - `5M` to `50M` commands/month
  - roughly `$10` to `$100`/month
- Very high:
  - `50M+` commands/month
  - this is the point where architectural and observability concerns become more important than raw command price

Important:

- For Motion Lab specifically, "high" is not "a few thousand users."
- It is more like:
  - hundreds of thousands of premium motion generations per month
  - or millions of rate-limited endpoint hits

## Break-Even Against The Fixed $10 Plan

PAYG break-even vs the `250MB / $10` fixed plan happens around:

- `5,000,000` commands/month

That means the fixed plan starts making sense around:

- roughly `550K to 830K` `animate_icon` calls/month

Because:

- `550K` bundle calls x `9` commands = `4.95M`
- `830K` bundle calls x `6` commands = `4.98M`

So unless Motion Lab is doing many hundreds of thousands of premium bundle generations each month, PAYG is likely the cheaper Redis plan.

## What Could Increase Cost Beyond These Estimates

### 1. Read regions

Upstash warns that with read/global regions, write command cost rises.

That matters for rate limiting because counters are write-heavy.

### 2. Analytics or extra limiter features

If analytics or extra Redis-backed features are added, command count rises.

### 3. Enterprise/production extras

If the product needs:

- uptime SLA
- advanced monitoring
- RBAC
- SOC 2 package

then the `Prod Pack` at `+$200/month per database` becomes the real cost driver, not raw commands.

## What This Analysis Does Not Yet Price

This memo does not compare:

- Redis cost vs exact Supabase compute-upgrade cost
- engineering cost of building/maintaining a Postgres limiter
- self-hosted Redis operations cost
- the value of reduced implementation risk with Redis

Those are decision factors, but they are not command-pricing inputs.

## Preliminary Interpretation

### What looks true from the pricing

- Raw Redis command pricing is probably not expensive for Motion Lab at near-term scale.
- For many realistic early-to-mid production scenarios, PAYG Redis cost looks more like:
  - single-digit dollars/month
  - or low tens of dollars/month
- The more meaningful business question may be:
  - "Do we want another production dependency?"
  instead of:
  - "Can we afford the command bill?"

### What could make Redis feel expensive

Not command usage alone, but:

- vendor sprawl
- enterprise add-ons
- read-region multipliers
- future desire for SLA and monitoring package

## Questions Another Agent Should Pressure-Test

1. Is `2 to 3` Redis commands per endpoint hit still the right assumption for our specific Motion Lab implementation path?
2. Should `animate_icon` be modeled as exactly `3` rate-limited backend calls, or will future bundling change that enough to materially alter the cost curve?
3. Are read regions likely in our production design? If yes, how much should cost estimates be adjusted upward?
4. Should Motion Lab be compared on pure Redis command price alone, or should the decision include the engineering opportunity cost of building and maintaining a Postgres limiter?
5. Is the `Prod Pack` realistically required for Supericons production, or can Motion Lab safely start on PAYG without those enterprise extras?
6. At what usage threshold would the architecture decision matter more for latency/operability than for raw monthly cost?
7. If Motion Lab succeeds faster than expected, is vendor simplicity or implementation headroom the more important strategic constraint?

## Bottom-Line Summary

If the decision is based only on raw Redis command pricing:

- managed Redis looks financially reasonable for Motion Lab even at fairly serious usage

If the decision is based on total platform simplicity and cost control:

- the tradeoff is less about the command bill
- and more about whether Supericons wants another paid production dependency

The Redis option should not be rejected because it is obviously too expensive.

It should be judged on:

- vendor count
- operational preference
- architecture preference
- whether the team wants the technically cleaner counter system enough to justify another managed dependency

## Recommended Next Step For Audit

Ask another agent to review this memo together with:

- `docs/plans/motion-lab-mcp-rate-limiting-implementation-plan.md`
- `docs/motion-lab-mcp-post-implementation-report.md`
- the current Motion Lab hosted endpoint design

Specifically ask them to answer:

1. Are the Redis command assumptions realistic for Motion Lab?
2. Is the Redis cost still acceptable under more aggressive growth assumptions?
3. Would they recommend Redis now, Postgres now, or Redis later with a predefined switch trigger?
