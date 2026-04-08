# Implementation Plan: Simplified Pro Collection Claims (Hardened v3)

Date: 2026-04-06
Decision doc: [pro-tools-credit-system-decision.md](../docs/pro-tools-credit-system-decision.md)
Dependency audit: [audit-simplified-credit-system-dependency-hardening.md](../docs/audit-simplified-credit-system-dependency-hardening.md)

## Goal

Replace the visible credit balance / badge / counter system with a simpler Pro claim model:

- active Pro users get live access to all premium collections while subscribed
- active Pro users can permanently add **1 collection every 30 days**
- already-owned collections remain permanently owned through `si_purchases`
- no visible credit balance in the UI
- no sidebar badge
- no "X credits left" wording

This plan is intentionally designed to avoid breaking:
- premium preview access
- MCP access
- pack downloads
- existing permanent ownership
- current licensing behavior

---

## Final Design Decisions

### 1. Claim cadence uses a rolling 30-day window

Why:
- `si_subscriptions` only stores `current_period_end`
- it does not store a monthly claim anchor
- this avoids broken annual logic

User-facing product copy can still say:
- `1 collection/month`

Implementation truth:
- eligible if the most recent `source='credit'` purchase is at least 30 days old

### 2. Existing `si_credits` are grandfathered (intentional drain)

We will **stop issuing new credits**, but we will **not** strand existing earned credits.

Rule:
- active Pro required
- unused legacy credits are **grandfathered**
- they can be claimed immediately, one per request, until exhausted (no 30-day cooldown between legacy claims)
- once exhausted, the user falls into the rolling 30-day cadence

### 3. Ownership contract remains unchanged

Claimed collections still create:
- `si_purchases` row
- `source='credit'`

This preserves:
- pack downloads
- purchased collection access
- MCP purchased-slug access
- current license determination

### 4. No new `source` values

Keep existing values only:
- `'purchase'`
- `'launch_edition'`
- `'credit'`

### 5. Eligibility logic centralized in one shared SQL helper

Both the read path (can claim?) and write path (do claim) must use the same underlying SQL eligibility helper so the business rules cannot drift.
- internal helper: `si_resolve_claim_status(p_user_id)`
- read RPC: `si_get_claim_status(p_user_id)`
- write RPC: `si_claim_pack(p_user_id, p_product_id)`

---

## Scope Boundaries

### In scope

- claim eligibility logic (SQL)
- claim mutation logic (SQL)
- visible credits UI removal
- pricing / FAQ / terms copy alignment
- stopping future credit issuance

### Out of scope

- reworking Pro access rules
- changing MCP permission model
- changing download license behavior
- changing ownership source semantics
- changing Stripe checkout products or pricing

---

## Proposed Changes

### Phase 0: Dependency-Safe Preparation

Before coding, verify:
- Grep for `getCreditBalance()` to ensure consumers are understood.
  - e.g. `rg "getCreditBalance"` (Should only be in `auth.js` and `store.js`)
- Grep for `creditBalance` reference.
- Grep for `updateSidebarCreditBadge`.
- Grep for `handleCreditRedeem`.
- Identify pricing/FAQ/terms blocks citing credits in `store.js` or HTML template.
- Verify no batch or download flow reads `si_credits` directly.

No behavior changes in this phase.

---

### Phase 1: Database Logic (Source of Truth)

#### [NEW] `si_resolve_claim_status(p_user_id uuid)` SQL helper (Shared Truth)

Internal helper used by both read and write paths.

Returns the normalized claim decision payload needed by both:
- whether the user can claim
- why they can or cannot claim
- next available date if cooling down

Responsibilities:
1. Verify active subscription:
   - `status = 'active'`
   - `current_period_end IS NULL OR current_period_end > now()`
     *(Note: The IS NULL check is required defensively. Stripe checkout completes and creates a subscription row initially with a null period end until customer.subscription.updated fires).*
2. Check if user already owns all active launch packs. If yes, resolve `"reason": "all_owned", "canClaim": false`.
3. Compute legacy unused credits from `si_credits`.
4. If legacy credits > 0: resolve `"canClaim": true, "reason": "legacy_credit"`.
5. Compute latest `source='credit'` claim timestamp in `si_purchases`.
6. If last claim < 30 days ago: resolve `"canClaim": false, "reason": "cooldown_wait", "nextAvailable": [date]`.
7. Else: resolve `"canClaim": true, "reason": "cooldown_ready"`.

#### [NEW] `si_get_claim_status(p_user_id uuid)` RPC (Read Path)

Returns `json` detailing claim eligibility.

Shape:
```json
{
  "canClaim": true,
  "nextAvailable": null,
  "reason": "legacy_credit" | "cooldown_ready" | "cooldown_wait" | "subscription_required" | "all_owned"
}
```

Responsibilities:
1. Call `si_resolve_claim_status(p_user_id)`.
2. Return the helper output directly as JSON.

#### [NEW] `si_claim_pack(p_user_id uuid, p_product_id uuid)` RPC (Write Path)

Responsibilities:
1. Acquire a transaction-level advisory lock per-user to prevent double claim races.
   - `SELECT pg_advisory_xact_lock(hashtext(p_user_id::text));`
2. Call `si_resolve_claim_status(p_user_id)` inside the same transaction.
3. Abort unless `canClaim = true`.
4. Verify product exists and is not already owned by user.
5. If legacy credits > 0:
   - insert a `type='redeemed'` row into `si_credits`.
6. Insert `si_purchases(source='credit')`.
7. Return success.

---

### Phase 2: Backend Edge Functions

#### [NEW] `supabase/functions/claim-status/index.ts`

Read-only endpoint replacing legacy balance UI fetches.
- Authenticate user via JWT.
- Call RPC `si_get_claim_status(user.id)`.
- Return the JSON payload directly.

#### [MODIFY] `supabase/functions/redeem-credit/index.ts`

Endpoint handling mutations.
- Authenticate user via JWT.
- Call atomic RPC `si_claim_pack(user.id, productId)`.
- Map RPC results to HTTP responses:
  - success -> `200`
  - already owned / all owned / active cooldown -> `409`
  - missing/inactive subscription -> `403`

#### [MODIFY] `supabase/functions/stripe-webhook/index.ts`

- Remove the `invoice.paid` credit issuance block (stops creating new `earned` and `bonus` `si_credits` rows).
- Leave existing sub-updates exactly as they are. No annual bonus grants needed.

---

### Phase 3: Frontend Auth State

#### [MODIFY] `auth.js`

Remove visible credit state:
- `creditBalance` variable.
- `getCreditBalance()` export.
- `fetchCreditBalance()` routine.

Add:
- `let cachedClaimStatus = null;`
- `fetchClaimStatus()` (calls `claim-status` edge function and sets cache).
- `getClaimStatus()` (returns cache).
- `invalidateClaimStatus()` (resets to null).

Call `fetchClaimStatus()` when opening the premium collections UI. During load, it should return a "Checking access..." state so UI CTAs don't flip from "Buy" -> "Add to My Collection".

---

### Phase 4: Premium Collection UI & Copy

#### [MODIFY] `store.js`

Remove claim logic:
- `updateSidebarCreditBadge()` and references.
- `handleCreditRedeem()` text referring to remaining credits.

Update CTA logic on pack cards:
1. Owned pack -> `Download`
2. Active Pro + `canClaim=true` -> `Add to My Collection`
3. Active Pro + `canClaim=false` & `reason='all_owned'` -> `All Collections Owned` (disabled)
4. Active Pro + `canClaim=false` & `reason='cooldown_wait'` -> `Available [nextAvailable]` (disabled)
5. Not Pro -> normal purchase / upgrade CTAs

Flow after claim:
1. Trigger `invalidateClaimStatus()`.
2. Await `fetchClaimStatus()`.
3. Update specific card to `Download`.

**Specific Copy Updates in `store.js` Pricing/FAQ/Terms blocks** (approx lines):
- **L1907**: "Pro tools, premium access, and 1 collection to keep each month."
- **L1916**: "1 collection/month to keep forever"
- **L1917**: "Access all collections while active"
- **L1922**: Remove line about bonus packs upfront altogether.
- **L1947/L1974**: Replace "No monthly credit drops" with "No Pro tools (Motion Lab, Converter)".
- **L2009**: FAQ headline: "How does the monthly collection work?"
- **L2013**: FAQ body: "Pro subscribers can add 1 premium collection to their permanent library each month. Claimed collections are yours forever, even if you cancel."
- Remove wording globally implying permanent unlimited rights after cancel, or references to "3 bonus packs".

---

### Phase 5: Transitional Data Policy

#### `si_credits`
- Table remains.
- No new writes (except `redeemed` rows handled by the RPC when draining).
- Protects historical context.

#### `si_purchases` & `si_subscriptions`
- Tables remain.
- No schema changes.

---

## Verification Plan

### Backend Correctness (SQL / RPC Level)
1. Monthly active sub, 0 legacy credits, no recent claims -> `canClaim: true` (`cooldown_ready`).
2. Monthly active sub, 0 legacy credits, recent source=credit < 30 days -> `canClaim: false` (`cooldown_wait`).
3. Single annual active sub -> behavior exactly matches #1 and #2.
4. Active sub, >=1 legacy credits -> `canClaim: true` (`legacy_credit`).
5. Inactive sub -> `canClaim: false` (`subscription_required`).
6. Already-owned all target packs -> `canClaim: false` (`all_owned`).
7. Double redemption race -> only 1 claim succeeds per `user_id` due to `pg_advisory_xact_lock(hashtext(user_id))`.

### Frontend UX Regression
1. UI checks: No sidebar credit badge, no claim counter inside modals.
2. Premium catalog loading prevents button state flicker ("Buy" briefly showing while `fetchClaimStatus` is running).
3. Post-claim, button switches seamlessly to `Download` and no other claims are allowed.

### Safety Check
- Rollback is 100% capable by reverting `redeem-credit` / `stripe-webhook` edge functions and dropping the 2 SQL RPCs. No schema structural breaking changes are made.
