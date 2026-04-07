## Simplified Credit System: Deep Dependency Audit

Date: 2026-04-06

### Objective

Pressure-test the simplified Pro collection claim proposal before implementation and identify every dependency that could regress if the claim model changes.

This audit is intentionally conservative. The goal is to simplify the Pro UX without breaking the premium access, ownership, download, MCP, billing, or licensing flows that are already working.

---

## Current Stable Behaviors We Must Not Break

### 1. Active Pro unlocks live premium access

Stable today:
- [`serve-premium-asset`](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/supabase/functions/serve-premium-asset/index.ts)
- [`validate-mcp-key`](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/supabase/functions/validate-mcp-key/index.ts)

Behavior:
- active Pro can preview and use all premium collections while subscribed
- MCP treats active Pro as all-access

Conclusion:
- do not rewrite these flows as part of the simplified claim implementation
- regression-test them, but keep them out of the change set unless a hard blocker appears

### 2. Permanent ownership is represented by `si_purchases`

Stable today:
- [`download-pack`](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/supabase/functions/download-pack/index.ts)
- [`api-keys`](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/supabase/functions/api-keys/index.ts)
- premium collection rendering in [`store.js`](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js)

Behavior:
- purchased packs are durable because they exist in `si_purchases`
- claimed packs are also durable because they are inserted into `si_purchases` with `source='credit'`

Conclusion:
- the simplified model must continue to grant ownership by inserting `si_purchases`
- do not introduce a second ownership table or alternate ownership source

### 3. License tier depends on purchase source plus active subscription

Stable today:
- [`download-pack`](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/supabase/functions/download-pack/index.ts)

Behavior:
- active Pro => unlimited-project download license while active
- `launch_edition` / `bundle` => unlimited-project permanent ownership
- `purchase` / `credit` => single-project permanent ownership

Conclusion:
- the simplified claim model must not accidentally imply that claimed packs become permanently unlimited
- pricing, FAQ, and terms copy must stay aligned with this exact behavior

### 4. Billing state is Stripe-driven through `si_subscriptions`

Stable today:
- [`stripe-webhook`](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/supabase/functions/stripe-webhook/index.ts)
- [`auth.js`](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/auth.js)
- migration [`20260324_si_subscriptions.sql`](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/supabase/migrations/20260324_si_subscriptions.sql)

Important schema reality:
- `si_subscriptions` stores `status`, `plan`, and `current_period_end`
- it does **not** store `current_period_start`
- it does **not** store a monthly claim anchor for annual plans

Conclusion:
- any plan that derives “1 monthly claim window” from `current_period_end - 1 month` is unsafe for annual subscriptions

---

## Dependency Map

### Frontend surfaces affected by claim model changes

- [`auth.js`](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/auth.js)
  - `creditBalance`
  - `getCreditBalance()`
  - `fetchCreditBalance()`
  - active-subscription state

- [`store.js`](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js)
  - sidebar badge
  - pack CTA rendering
  - `handleCreditRedeem()`
  - pricing copy
  - terms and FAQ copy

### Backend mutation/read paths affected by claim model changes

- [`redeem-credit`](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/supabase/functions/redeem-credit/index.ts)
- [`stripe-webhook`](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/supabase/functions/stripe-webhook/index.ts)
- new `claim-status` endpoint

### Backend paths that depend on ownership remaining unchanged

- [`download-pack`](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/supabase/functions/download-pack/index.ts)
- [`api-keys`](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/supabase/functions/api-keys/index.ts)
- [`validate-mcp-key`](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/supabase/functions/validate-mcp-key/index.ts)
- [`serve-premium-asset`](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/supabase/functions/serve-premium-asset/index.ts)

Conclusion:
- the blast radius is real, but most of it can be protected by keeping the ownership contract unchanged and narrowing changes to the claim layer only

---

## Critical Risks In The Previous Plan

### Risk 1: Annual claim math was wrong

Previous plan:
- claim window = `current_period_end - 1 month`

Why this breaks:
- for annual subscriptions, `current_period_end` is one year in the future
- subtracting one month only covers the final month of the annual term
- earlier monthly claims would not be counted correctly

Required correction:
- stop deriving claim windows from `current_period_end`
- use a rolling claim cadence instead

### Risk 2: Existing earned credits could be stranded

Current system still has:
- `si_credits` historical rows
- earned / bonus / redeemed history

If we simply stop reading the table:
- users with existing earned-but-unredeemed credits silently lose value

Required correction:
- preserve `si_credits` as a transitional entitlement source
- consume legacy credits first, but do not show the balance in UI

### Risk 3: Two fast claims could both succeed

Current `redeem-credit` model is:
- check eligibility
- then insert

If rewritten naively:
- two concurrent requests could both pass the check before either writes the claim
- user could claim two packs inside the same cooldown window

Required correction:
- mutation path must be atomic
- use a single SQL function / RPC or another transaction-safe locking approach

### Risk 4: Copy could overpromise permanent Pro license rights

Current code reality:
- active Pro download license is unlimited while active
- canceled Pro + `source='credit'` falls back to single-project ownership

If the new plan says only “keep forever” without clarifying license scope:
- product language drifts away from actual enforcement

Required correction:
- keep “yours forever” for ownership
- do not imply permanently unlimited project rights for claimed packs after cancellation

---

## Safest Architecture For The Simplified Model

### Keep unchanged

- `si_purchases` as the ownership source of truth
- `source='credit'` for claimed packs
- `download-pack`, `serve-premium-asset`, `validate-mcp-key`, `api-keys`, `create-portal`
- subscription creation/update flows in Stripe webhook except credit issuance

### Change only

- claim eligibility computation
- claim mutation path
- credit-related UI copy and affordances

### New claim rule

Recommended server rule:
- active Pro required
- if user has unused historical credits, they may claim immediately and a `redeemed` row is written to `si_credits`
- otherwise user may claim once every 30 days from the most recent `source='credit'` purchase timestamp

Why this is safer:
- works uniformly for monthly and annual
- requires no new subscription anchor field
- preserves existing unused credit value
- keeps ownership contract unchanged

---

## Implementation Guardrails

### Guardrail 1: Use one mutation authority

Do not duplicate claim eligibility logic across multiple write paths.

Recommended:
- implement a single atomic SQL function or RPC for claiming
- edge function becomes a thin wrapper

### Guardrail 2: Use one read model for claim status

`claim-status` should be the only frontend read path for eligibility.

Frontend should not:
- infer eligibility from `plan`
- infer eligibility from `current_period_end`
- count `si_credits` directly

### Guardrail 3: Keep pricing and terms aligned with runtime

Must update:
- pricing page copy
- FAQ
- terms language that still mentions visible monthly credits or annual bonus packs

### Guardrail 4: Keep stable premium tools untouched

Do not refactor unrelated Pro-gated tools in the same batch:
- Motion Lab gating
- Converter gating
- MCP access logic
- pack asset serving

---

## Recommendation

The simplified model is feasible and safe **if** implementation follows these rules:

1. Use a rolling claim cadence, not `current_period_end - 1 month`
2. Preserve legacy `si_credits` as a transition source
3. Make claim mutation atomic
4. Keep ownership and license semantics unchanged
5. Limit the code change set to the claim layer and UI language

That is the smallest viable change that resolves user confusion without destabilizing the premium system that already works.
