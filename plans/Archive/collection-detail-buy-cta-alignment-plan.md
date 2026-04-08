# Implementation Plan: Collection Detail Buy CTA Alignment

Date: 2026-04-06
Owner: Frontend (Store UI)
Status: Implemented (2026-04-06)

## Discussion And Decision

Current runtime copy mixes two purchase verbs for the same action:

1. Catalog cards use `Buy $5`
2. Collection detail header uses `Get Collection`
3. Locked icon panel uses `$5 Get Collection`

This is inconsistent and makes the purchase action feel less predictable.

Recommended direction:

1. Use `Buy` language everywhere for one-time purchase actions.
2. Keep `View Collection` for owned state and `Redeem` for claim actions.

CTA label choice by surface:

1. Collection detail header (price shown beside button): button label `Buy`
2. Locked panel (price embedded in button): label `Buy $5` (or computed `Buy $${priceDisplay}`)

## Goal

Standardize one-time purchase CTA copy from `Get Collection` to `Buy` in collection-detail surfaces without changing purchase logic.

## Scope

### In Scope

1. Collection detail header CTA text
2. Locked panel CTA text
3. Optional minor width/spacing tweaks if needed after label change

### Out Of Scope

1. Claim/redeem behavior
2. Pricing logic
3. Checkout/session payloads
4. SQL or Edge Function changes

## Files To Change

1. `store.js`
2. `style.css` (only if spacing adjustment is needed)

## Dependency Safety Audit

Dependencies expected to remain intact:

1. `handlePurchase(product)` wiring remains unchanged.
2. Button selectors (`#collectionBuyBtn`, `#lockedPanelBuyBtn`) remain unchanged.
3. No backend dependency on CTA text values.

Known runtime text locations to update:

1. Collection detail header button currently `Get Collection`
2. Locked panel button currently `$${priceDisplay} Get Collection`

## Implementation Phases

## Phase 1: Copy Update In Collection Detail Header

File:
- `store.js`

Changes:

1. Replace `Get Collection` label with `Buy` for `#collectionBuyBtn`.
2. Keep the existing left-side price label (`$${priceDisplay}`).

Acceptance:

1. In collection detail, CTA reads `Buy`.
2. Clicking `Buy` still starts checkout flow.

## Phase 2: Copy Update In Locked Panel

File:
- `store.js`

Changes:

1. Replace `$${priceDisplay} Get Collection` with `Buy $${priceDisplay}` for `#lockedPanelBuyBtn`.
2. Keep icon-lock upsell flow unchanged.

Acceptance:

1. Locked panel CTA reads `Buy $5` (or formatted price).
2. Clicking CTA still starts checkout flow.

## Phase 3: Visual Regression Pass

Files:
- `store.js`
- `style.css` (if needed)

Changes:

1. Verify button still fits cleanly on desktop and mobile.
2. If truncation appears, adjust padding/min-width in existing button classes.

Acceptance:

1. No clipping/wrapping regressions.
2. Style remains consistent in dark and light mode.

## Verification Plan

1. Open an unowned collection detail page:
- Verify CTA is `Buy`
- Verify click triggers checkout redirect flow
2. Open a locked premium icon in customize panel:
- Verify CTA is `Buy $5`
- Verify click triggers checkout redirect flow
3. Owned collection detail remains unchanged:
- No buy CTA shown
- Owned badge and open flow still works
4. Claim states in catalog remain unchanged (`Redeem now` / `Redeem on <date>`).

## Rollout

1. Implement in one frontend commit.
2. Run `node --check store.js` and `npm run build`.
3. Deploy frontend and do a quick smoke test on one unowned collection.

## Implementation Outcome

Implemented in:

1. `store.js`

Verified with:

1. `node --check store.js`
2. `npm run build`
