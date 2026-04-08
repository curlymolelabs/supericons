# Implementation Plan: Collection Overview Auto-Sync And Purchased CTA Label Fix

Date: 2026-04-06
Owner: Frontend Store/Auth
Status: Implemented (2026-04-06)

## Implementation Outcome

Implemented in:

1. `store.js` (purchase sync helper, packs/downloads/dashboard refresh wiring, purchase success polling refinement, owned CTA copy alignment)
2. `style.css` (open/view CTA label fit and action row support)

Validated with:

1. `node --check store.js`
2. `npm run build`

## Goal

Fix two UX regressions in the premium collection flow:

1. Newly purchased or redeemed collections should appear in collection surfaces without requiring a manual click on `My Collection`.
2. Purchased/redeemed collection CTA in the premium collections overview should not say `Download`; it should say `Open` or `View` (recommended: `View Collection`).

## Current Symptoms

1. After purchase/redeem, UI can remain stale in the premium collections overview unless user opens `My Collection`.
2. Owned cards in the premium collections overview show a `Download` CTA even though the click action opens collection detail rather than downloading directly.

## Root Cause Summary

1. `switchView('packs')` renders catalog immediately but does not ensure fresh `si_purchases` data first.
2. Purchase hydration paths are inconsistent:
   - sidebar `My Collection` and dashboard paths fetch purchases before rendering
   - packs view does not always force a fresh purchase sync
3. Checkout success polling currently exits too early for users who already had prior purchases.
4. CTA copy drift: `getPackCtaState()` maps owned items to `download` icon + `Download`, while click handler opens detail.

## Scope

### In Scope

- `store.js` purchase synchronization orchestration for packs/downloads/dashboard views
- checkout success polling condition improvements
- owned CTA label/icon semantics for premium overview cards
- regression verification for purchase and redeem flows

### Out of Scope

- SQL changes
- Edge function behavior changes
- redesign of collection-detail page actions

## Decision

Recommended owned CTA text in premium overview:

- `View Collection`

Reason:
- Matches current behavior (opens detail view)
- Clearer than `Download`
- Slightly more explicit than plain `Open`

## Implementation Plan

## Phase 1: Centralize Purchase Sync In Store

### 1.1 Add a guarded purchase-sync helper

File:
- `store.js`

Changes:
- Add `let purchasesLoadPromise = null`.
- Add helper `ensureUserPurchasesLoaded({ force = false } = {})`:
  - no-op and clear local state if logged out
  - dedupe parallel requests with `purchasesLoadPromise`
  - call `fetchUserPurchases()`
  - on completion, clear promise
  - optionally rerender if current view is `packs`, `downloads`, or `dashboard`

Why:
- avoid redundant calls
- guarantee consistent state refresh across entry points

### 1.2 Wire helper into packs view entry

File:
- `store.js`

Changes:
- In `switchView('packs')`, trigger `ensureUserPurchasesLoaded()` before or alongside `renderPackCatalog()`.
- Keep optimistic first render if needed, then rerender when sync resolves.

Why:
- eliminates dependency on clicking `My Collection` to refresh owned states

### 1.3 Wire helper into auth lifecycle refresh points

Files:
- `store.js`
- optional: `auth.js` (only if event bridge is added)

Changes:
- On store init and authenticated sessions, schedule `ensureUserPurchasesLoaded()`.
- On sign-out, clear `userPurchases` and rerender store surfaces if active.

Why:
- prevents stale ownership after sign-in/sign-out transitions

## Phase 2: Fix Checkout Success Polling Semantics

### 2.1 Poll for the specific expected purchase

File:
- `store.js`

Changes:
- Add product context to success flow:
  - append `product_id` in checkout `success_url` where possible
- Update `handlePurchaseSuccess()` polling stop condition:
  - stop when the expected `product_id` exists in `userPurchases`
  - fallback to safe timeout if Stripe webhook is delayed

Why:
- current condition `userPurchases.length > 0` is true for existing buyers and can stop early

### 2.2 Keep existing UX feedback but make it deterministic

File:
- `store.js`

Changes:
- keep success toast and redirect behavior
- ensure destination view renders from freshly synced purchases

Why:
- stable and predictable post-checkout experience

## Phase 3: Correct Owned CTA Label/Icon In Overview

### 3.1 Update owned CTA mapping

File:
- `store.js`

Changes:
- In `getPackCtaState()` for `isPurchased`:
  - change label from `Download` to `View Collection`
  - change icon from `download` to `visibility` (or `open_in_new`)
  - keep action as `open`

Why:
- aligns wording with behavior

### 3.2 Optional style tuning for text width

File:
- `style.css` (only if needed)

Changes:
- Ensure `pack-card__btn--open` supports longer label text cleanly on small cards.

Why:
- avoids truncation and layout shift

## Phase 4: Redeem Flow Consistency

### 4.1 Ensure claim success updates all active collection surfaces

File:
- `store.js`

Changes:
- After successful claim, use shared purchase sync helper instead of ad-hoc refresh pattern.
- Keep claim status invalidation/refresh behavior unchanged.

Why:
- same behavior standard as purchase success path

## Verification Plan

## Manual Scenarios

1. Existing user with purchases opens `Premium Collections`:
   - owned packs display `View Collection`
   - no `Download` label in overview CTA
2. New purchase flow:
   - complete checkout
   - return to app
   - purchased pack appears as owned without clicking `My Collection`
3. Redeem flow:
   - click `Add to My Collection`
   - success toast appears
   - card updates to owned state immediately
4. Sign-out then sign-in as different account:
   - ownership state updates correctly (no leaked prior user purchases)
5. `My Collection` and `Dashboard` still show accurate owned items/counts.

## Network / Console Checks

1. Purchase sync fetch is deduped (no excessive duplicate requests on one navigation).
2. No console errors introduced in packs/downloads/dashboard transitions.
3. Stripe return path handles delayed webhook within retry window.

## Acceptance Criteria

1. User does not need to click `My Collection` for newly owned collection to appear in premium overview state.
2. Owned CTA in premium overview never displays `Download`.
3. Owned CTA text is `View Collection` and opens collection detail.
4. No regression in claim status loading, purchase flow, or downloads/dashboard rendering.

## Risks And Mitigations

1. Risk: extra purchase fetches causing unnecessary load.
   - Mitigation: request dedupe (`purchasesLoadPromise`) and conditional rerender.
2. Risk: race between auth init and first packs render.
   - Mitigation: guard on `waitForAuth()` where needed; rerender once sync resolves.
3. Risk: webhook lag causing temporary stale state after checkout.
   - Mitigation: specific-product polling with bounded retries and fallback UX messaging.

## Rollout

1. Implement phases 1-3 in one PR.
2. Validate manual scenarios above in local + production preview.
3. Deploy frontend.
4. Monitor first post-deploy purchase/redeem sessions for stale ownership reports.
