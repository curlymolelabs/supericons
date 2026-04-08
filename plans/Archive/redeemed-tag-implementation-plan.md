# Implementation Plan: Redeemed Tag For Claimed Collections

Date: 2026-04-06
Owner: Frontend (Store UI)
Status: Implemented (2026-04-06)

## Audit Link

Dependency audit completed:

1. `docs/audit-redeemed-tag-dependency-impact.md`

Audit conclusion:

1. No backend/schema changes required.
2. `si_purchases.source` is already populated by all acquisition flows.
3. Safe UI-only change with fallback to `Purchased` for unknown sources.

## Goal

Show a clear `Redeemed` badge for collections acquired via Pro claim credits (`si_purchases.source = 'credit'`) instead of labeling all owned collections as `Purchased`.

## Problem Summary

Current card rendering only checks owned/not-owned and always shows `Purchased` for owned cards.
This hides an important distinction between:

1. Direct purchase (`source = 'purchase'` or `source = 'launch_edition'`)
2. Credit claim (`source = 'credit'`)

## UX Decision

Badge mapping for owned collections:

1. `source = 'credit'` -> `Redeemed`
2. all other owned sources -> `Purchased`

Scope is intentionally narrow to avoid changing pricing or claim logic.

## Scope

### In Scope

1. Premium collection card badge text/class logic
2. My Collection card badge text/class logic (consistency across ownership surfaces)
3. Redeemed badge visual style (dark + light mode compatibility)
4. Manual verification scenarios

### Out of Scope

1. SQL schema/migration changes
2. RPC or edge function behavior changes
3. Claim eligibility logic
4. Checkout flow changes

## Files To Change

1. `store.js`
2. `style.css`
3. `docs/audit-redeemed-tag-dependency-impact.md` (reference, no runtime impact)

## Implementation Phases

## Phase 1: Ownership Source Resolution

File:
- `store.js`

Changes:

1. In `createPackCard(product)`, replace boolean-only ownership lookup with record lookup:
   - find purchase row for `product.id` from `userPurchases`
2. Derive:
   - `isOwned` boolean
   - `ownershipSource` string (`purchase`, `credit`, `launch_edition`, etc.)
3. Add helper for badge metadata, e.g.:
   - `getOwnedBadgeMeta(source) -> { text, className }`

Acceptance:

1. Card rendering can distinguish `credit` ownership from normal purchase.

## Phase 2: Badge Rendering

File:
- `store.js`

Changes:

1. Update owned badge markup in pack cards:
   - source `credit` -> `Redeemed`
   - otherwise -> `Purchased`
2. Apply the same mapping in My Collection cards (currently `Owned`).
3. Keep existing owned behavior unchanged otherwise:
   - single CTA (`View Collection`) for owned cards
   - no preview button for owned cards

Acceptance:

1. Claimed collections show `Redeemed`.
2. Paid collections still show `Purchased`.
3. My Collection does not show conflicting ownership labels.

## Phase 3: Styling

File:
- `style.css`

Changes:

1. Add a redeemed badge variant class (for example `.pack-card__badge--redeemed`).
2. Use existing design tokens for theme-safe colors (no hardcoded mode-specific values).
3. Keep size/shape consistent with current purchased badge to avoid layout shift.

Acceptance:

1. Badge is visually distinct but consistent with site style in dark and light themes.

## Verification Plan

## Functional Checks

1. Credit-claimed collection card shows `Redeemed`.
2. Directly purchased collection card shows `Purchased`.
3. Launch Edition-owned items still show `Purchased` (unless a separate bundle tag decision is made later).
4. My Collection cards follow the same source-based labels.
5. Owned cards continue to open correctly via `View Collection`.

## Regression Checks

1. Unowned cards remain `Preview + Buy`.
2. Redeem row logic still works (`Redeem now` / `Redeem on <date>`).
3. No console errors in packs view.

## Risks And Mitigations

1. Risk: source value missing on legacy rows.
   - Mitigation: fallback to `Purchased` when source is null/unknown.
2. Risk: multiple purchase rows edge case.
   - Mitigation: choose deterministic row (existing query currently returns unique row per `user_id, product_id`).

## Rollout

1. Implement frontend changes in one PR.
2. Validate with one purchased and one redeemed product on production data.
3. Deploy frontend.
4. Smoke test Premium Collections view after hard refresh.

## Implementation Outcome

Implemented in:

1. `store.js`
2. `style.css`

Verified with:

1. `node --check store.js`
2. `npm run build`
