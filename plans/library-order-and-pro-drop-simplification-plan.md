# Implementation Plan: Library Order And Pro Drop Simplification

Date: 2026-04-06

## Goal

Implement two product changes cleanly and without cross-surface drift:

1. Reorder the library sidebar so `MingCute` and `Simple Icons` move to the top, and `Material Symbols` moves to the bottom.
2. Replace the Pro credit system with a simpler premium-drop access model:
   - active `Pro` unlocks all released premium collections
   - future drops are automatically included
   - permanent ownership remains with `Single Pack` and `Launch Bundle`

## Non-Goals

- Do not redesign the entire catalog UI.
- Do not change the premium icon asset format.
- Do not remove historical purchase records.
- Do not change MCP search behavior away from `Pro = premium access`; instead align the web app to that model.

## Final Product Rule

### Library ordering

User-facing library order should be explicit and stable.

Final order:

1. `mingcute`
2. `simpleicons`
3. `lucide`
4. `tabler`
5. `phosphor`
6. `heroicons`
7. `bootstrap`
8. `iconoir`
9. `ionicons`
10. `material`

### Premium collections

Final entitlement model:

- `Pro`
  - active subscription grants access to all currently released premium collections
  - new premium collection drops are automatically included
  - access ends when subscription ends unless the user separately owns packs
- `Single Pack`
  - permanent ownership of that collection
- `Launch Bundle`
  - permanent ownership of all included collections
- historical credit-claimed packs
  - remain treated as permanent ownership via existing purchase history

## Implementation Phases

## Phase 1: Library Order

### 1.1 Add explicit runtime ordering

Files:

- `main.js`

Changes:

- add a `LIBRARY_PRIORITY` map or ordered array
- add a helper like `sortLibrariesForSidebar(libraries)`
- apply that helper inside `renderLibraries()`

Why:

- the sidebar is the actual user-facing surface
- runtime ordering guarantees the UX even if build order changes later

### 1.2 Mirror order in build output

Files:

- `scripts/build-icons.js`

Changes:

- sort `outlineOutput.libraries`
- sort `solidOutput.libraries`
- keep a fallback so unknown future libraries sort after known ones

Why:

- keeps generated JSON stable
- avoids confusion when inspecting built data

### 1.3 Verify no unintended regressions

Checks:

- `All`, `Favorites`, and `Recent` remain unchanged
- counts remain correct
- no library disappears
- Material Symbols appears last in sidebar
- MingCute and Simple Icons appear first

## Phase 2: Replace Pro Credits With Included Drops

### 2.1 Lock the new entitlement rule in the UI

Files:

- `store.js`
- `auth.js`

Changes:

- remove visible credit badge logic from sidebar
- stop showing `Claim (X left)` CTAs
- remove `getCreditBalance()` dependency from pack card decisions
- for active Pro:
  - premium pack cards should show `Included with Pro` or `Open`
  - no claim step
- pack detail/download access should treat active Pro as entitled

Recommended CTA behavior:

- `purchased` -> `Open`
- `isPro && !purchased` -> `Included with Pro`
- otherwise -> `Get Collection $5`

### 2.2 Remove active UI dependency on credits

Files:

- `auth.js`
- `store.js`

Changes:

- stop fetching credit balance as part of active app behavior
- keep old credit records intact in backend/data for now
- remove `handleCreditRedeem()` from live flow
- remove `redeem-credit` fetch path from active UI

Safer rollout note:

- historical code can remain temporarily if unused
- first objective is to remove user-facing dependency on credits

### 2.3 Update pricing and promo copy

Files:

- `store.js`
- possibly `index.html` if any marketing copy references the old model

Replace credit language with included-drop language.

Examples:

- old:
  - `1 pack credit per billing cycle`
  - `3 bonus packs upfront (annual)`
  - `claimed packs are yours forever`
- new:
  - `All released premium collections included while subscribed`
  - `New premium collection drops included automatically`
  - `Unlimited commercial use while Pro is active`

Recommended updated Pro card language:

- description:
  - `All premium collections included while subscribed. New drops are added automatically.`
- feature bullets:
  - `Everything in Free`
  - `All released premium collections`
  - `New premium drops included automatically`
  - `Motion Lab: export CSS animations`
  - `Converter: unlimited SVG/PNG conversion`
  - `Full MCP access (free + premium)`
  - `Commercial use, unlimited projects while subscribed`
  - `Priority support`

### 2.4 Update FAQ and legal wording

Files:

- `store.js` pricing FAQ content
- `store.js` terms content

Required copy shifts:

- FAQ:
  - remove “How do monthly Pro credits work?”
  - replace with “How do premium collection drops work with Pro?”
- answer:
  - `Active Pro subscribers get access to all released premium collections. New drops are included automatically while the subscription is active. If you want permanent ownership, buy a single pack or the Launch Bundle.`

Terms / refund / licensing:

- remove references to:
  - `credit redemptions`
  - `claimed packs with credits`
- keep license distinctions clear:
  - Pro = active subscription usage rights
  - purchases = permanent ownership

### 2.5 Align MCP and site messaging

Files:

- `mcp/index.js`
- docs mentioning premium access

Changes:

- keep the current MCP access behavior
- update comments/messages so they match the new product rule:
  - active Pro unlocks premium
  - purchased packs unlock owned premium

This is mostly a copy/alignment task because MCP is already closest to the desired model.

## Phase 3: Migration And Backward Compatibility

### 3.1 Preserve historical ownership

Do not delete:

- `si_purchases`
- prior credit-claimed ownership

Rule:

- if a user already owns a pack, it stays owned permanently

### 3.2 Retire credits softly

Short-term:

- stop displaying balances
- stop redeeming
- stop marketing credits

Later cleanup:

- remove unused credit code
- deprecate `redeem-credit` function
- archive or leave `si_credits` as historical data

This avoids risky launch-time data churn.

## Phase 4: Verification

### Library ordering checks

- MingCute is first in the library list
- Simple Icons is second
- Material Symbols is last
- counts match previous totals
- filtering by library still works

### Premium entitlement checks

Signed out:

- premium pack cards show purchase CTA
- no Pro-only unlock state

Logged in, no Pro, no purchases:

- premium pack cards still show purchase CTA

Logged in, purchased single pack:

- purchased pack shows `Open`
- non-owned packs show purchase CTA

Logged in, active Pro:

- all premium packs show unlocked/included state
- no claim button
- no credit badge
- no credit wording anywhere in pricing, FAQ, or promo banner

MCP checks:

- Pro key returns premium icons
- purchased-pack-only access still works
- free tier does not get premium icons

## Recommended Implementation Order

1. Runtime library ordering in `main.js`
2. Build-time ordering in `scripts/build-icons.js`
3. Replace pack-card credit logic in `store.js`
4. Remove visible credit badge and claim flow
5. Rewrite pricing / FAQ / terms copy
6. Align MCP comments and messages
7. Run verification checks

## Acceptance Criteria

This work is complete when:

- the library sidebar order is explicit and stable
- MingCute and Simple Icons are promoted
- Material Symbols is at the bottom
- no user-facing Pro flow mentions credits
- Pro users access premium collections without claiming
- pricing, FAQ, store, and MCP all describe the same Pro model
- permanent purchase ownership still works for individual packs and Launch Bundle

## Launch Recommendation

Ship the simplified model, not a transitional half-state.

That means:

- do not keep credit wording visible anywhere
- do not leave claim UI in place
- do not market Pro one way in the web app and a different way in MCP

The clean launch story should be:

- `Pro` = access to all premium collections while subscribed, with future drops included
- `Single Pack` = permanent ownership of one collection
- `Launch Bundle` = permanent ownership of all launch collections

