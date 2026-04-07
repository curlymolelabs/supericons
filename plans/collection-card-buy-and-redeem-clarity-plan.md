# Implementation Plan: Collection Card Buy + Redeem Clarity

Date: 2026-04-06
Owner: Frontend (Store UI)
Status: Implemented (2026-04-06)

## Implementation Outcome

Implemented in:

1. `store.js` (card state model, markup, action wiring, copy updates)
2. `style.css` (two-button action row, redeem row styles, responsive behavior)

Validated with:

1. `node --check store.js`
2. `npm run build`

## Goal

Improve premium collection card clarity by separating:

1. Purchase action (`Buy`)
2. Preview action (`Preview`)
3. Pro redeem timing/status (`Redeem now` / `Redeem on <date>`)

This removes ambiguity from mixed states like `Get Collection $5` vs `Available <date>`.

## Problem Summary

Current behavior causes confusion because:

1. The main CTA changes between buy and cooldown status, so users cannot always see a direct buy action.
2. Cooldown text appears where a button normally appears, which looks like a disabled purchase path.
3. `Preview` button text feels too long visually in narrow cards.
4. Owned cards currently look improved (`View Collection`), but unowned states still mix intent.

## UX Decision (Target State)

## Unowned cards

Always show two compact action buttons side-by-side:

1. `Preview`
2. `Buy $5`

Then show redeem state separately as a status row:

- Pro + claim ready: `Redeem now` (secondary action/button)
- Pro + cooldown: `Redeem on May 6, 2026`
- Pro + all owned: `All claimable collections owned`
- Non-Pro or non-claimable pack: no redeem row

## Owned cards

Show:

1. `Preview`
2. `View Collection`

No redeem row.

## Scope

### In scope

- card-level CTA copy and layout in premium collections grid
- claim status display wording and placement
- event wiring for preview / buy / redeem / view actions
- responsive adjustments for desktop and mobile

### Out of scope

- SQL or RPC logic changes
- claim eligibility rules
- checkout backend behavior
- collection detail page redesign

## Files To Change

1. `store.js`
2. `style.css`

## Implementation Phases

## Phase 1: Refactor card state model

File:
- `store.js`

Changes:

1. Replace single-CTA state model with a structured card action model, e.g.:
   - `previewAction`
   - `buyAction` (for unowned)
   - `viewAction` (for owned)
   - `redeemAction` (optional)
   - `redeemHint` (optional text)
2. Keep existing helpers (`formatClaimAvailability`, claim status reads) and map into clearer UI states.
3. Ensure non-claimable packs still show purchase path only.

Acceptance:

- Each product state maps to exactly one clear visual pattern.

## Phase 2: Update card markup and event wiring

File:
- `store.js`

Changes:

1. Update `createPackCard(...)` markup to render:
   - action row with `Preview` + `Buy $5` (or `View Collection` if owned)
   - redeem row below actions when applicable
2. Keep event handlers explicit:
   - `Preview` -> `renderCollectionDetail(product)`
   - `Buy` -> `handlePurchase(product)`
   - `View Collection` -> `renderCollectionDetail(product)`
   - `Redeem now` -> `handlePackClaim(product)`
3. Prevent click-event collisions between row buttons and card-level click behavior.

Acceptance:

- Buttons trigger the intended actions in every state.

## Phase 3: Copy and messaging cleanup

File:
- `store.js`

Changes:

1. Use concise button labels:
   - `Preview`
   - `Buy $5`
   - `View Collection`
2. Use redeem-specific status copy:
   - `Redeem now`
   - `Redeem on <MMM D, YYYY>`
3. Keep date formatting consistent with existing locale handling.

Acceptance:

- No card shows cooldown text as a fake purchase button.

## Phase 4: Styling updates

File:
- `style.css`

Changes:

1. Add action row layout class for two-button horizontal alignment.
2. Create compact button variants:
   - preview button (neutral)
   - buy button (primary)
   - view button (owned style)
   - redeem secondary button/chip
3. Add redeem status chip styles for cooldown/all-owned states.
4. Add responsive rule for narrow widths:
   - stack to two lines cleanly without truncation.

Acceptance:

- Cards remain readable and aligned on desktop and mobile.

## Verification Plan

## Functional scenarios

1. Logged out user on premium collections:
   - unowned cards show `Preview` + `Buy $5`
   - no redeem row
2. Pro user with claim ready:
   - unowned claimable card shows `Preview` + `Buy $5` and `Redeem now`
3. Pro user on cooldown:
   - unowned claimable card shows `Preview` + `Buy $5` and `Redeem on <date>`
4. Pro user all-owned:
   - cards show owned state or `All claimable collections owned` where relevant
5. Purchased/redeemed card:
   - shows `Preview` + `View Collection`
6. Clicking `Buy` still starts checkout flow correctly.
7. Clicking `Redeem now` still triggers claim modal + claim flow.

## UI checks

1. No long/truncated `Preview` copy.
2. No confusing state where purchase and cooldown compete for same button slot.
3. Visual parity in dark and light themes.

## Risks And Mitigations

1. Risk: too many actions make cards feel crowded.
   - Mitigation: compact secondary styling and clear hierarchy (`Buy` primary, redeem secondary).
2. Risk: event overlap due to card-level click handler.
   - Mitigation: explicit `stopPropagation` on action buttons.
3. Risk: claim status loading flicker.
   - Mitigation: temporary neutral redeem placeholder or delayed redeem-row render until status resolves.

## Rollout

1. Implement in one frontend PR.
2. Validate with manual scenario checklist.
3. Deploy frontend and smoke-test with a Pro account and a non-Pro account.
