# Audit: Redeemed Tag Dependency Impact

Date: 2026-04-06
Scope: Frontend badge labeling for owned premium collections based on `si_purchases.source`
Owner: Store UI

## Summary

The codebase already has a stable data contract for ownership source attribution. Implementing a `Redeemed` badge is low risk if we limit changes to UI label derivation and keep a safe fallback for unknown/null source values.

No SQL, RPC, or Edge Function changes are required for this feature.

## Dependency Inventory

## Source Of Truth

1. Table: `si_purchases`
2. Column: `source`
3. Migration guarantee: column exists and defaults to `'purchase'`
   - `supabase/migrations/20260326_si_purchases_source.sql`

## Writers Of `si_purchases.source`

1. Stripe one-time pack checkout writes `'purchase'`
   - `supabase/functions/stripe-webhook/index.ts`
2. Launch Edition bundle fan-out writes `'launch_edition'`
   - `supabase/functions/stripe-webhook/index.ts`
3. Pro claim RPC writes `'credit'`
   - `supabase/migrations/20260406_simplified_claim_system.sql`

## Readers Of `si_purchases.source`

1. Download license tier logic:
   - `'launch_edition'` / `'bundle'` => unlimited license
   - others => single-project unless active Pro
   - `supabase/functions/download-pack/index.ts`
2. Current premium catalog card UI does not read source yet:
   - uses owned boolean only
   - `store.js` (`createPackCard`)

## Risk Assessment

## Compatibility Risk

Low. Existing fetch path already selects all purchase fields (`select=*,si_products(*)`), so `source` is available in `userPurchases` without API changes.

## Behavioral Risk

Low. Badge text/class changes are presentation-only when the user already owns the product; no change to claimability, checkout, entitlement, or download authorization.

## Data Risk

Low-medium. Historical/manual rows could have unexpected values. Mitigation: default unknown source to `Purchased`.

## Integrity Checks

1. Ownership uniqueness remains enforced by DB unique key (`user_id`, `product_id`).
2. Claim cooldown and eligibility logic use `source='credit'` in SQL and remain unchanged.
3. License logic in download function remains unchanged.

## Recommended Implementation Guardrails

1. Introduce a small source-to-badge mapper in `store.js`:
   - `credit` => `Redeemed`
   - default => `Purchased`
2. Keep fallback behavior for unknown source values.
3. Reuse existing badge dimensions and tokenized theme colors.
4. Apply same label mapping in both:
   - Premium Collections cards
   - My Collection cards

## Verification Checklist

1. Owned via claim (`source='credit'`) shows `Redeemed`.
2. Owned via checkout (`source='purchase'`) shows `Purchased`.
3. Owned via Launch Edition (`source='launch_edition'`) shows `Purchased`.
4. Unowned cards unchanged (`Preview + Buy` and redeem-row behavior).
5. Download flow and license output unchanged.
