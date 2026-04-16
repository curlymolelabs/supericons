# API Key Tabs And Delete Sync Fix Plan

## Goal

Resolve the revoked-key delete failure and refine the API Keys page so it scales better when users accumulate many active and revoked keys.

This follow-up focuses on two concrete fixes:

1. make revoked-key deletion actually work in the live environment
2. redesign the page from long stacked sections into a cleaner tabbed or disclosure-based management surface

## Current Audit Findings

### 1. The live delete failure is almost certainly a deployment mismatch

The current frontend is already sending:

- `POST /functions/v1/api-keys`
- body: `{ action: "delete", key_id }`

That is visible in [store.js](/D:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js).

The local backend file already supports:

- `if (action === 'delete') { ... }`

That is visible in [index.ts](/D:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/supabase/functions/api-keys/index.ts).

But the live UI returned:

- `Unsupported action`

That error only makes sense if the deployed Supabase Edge Function is still running the older version that supports `generate` and `revoke`, but not `delete`.

### 2. This is not caused by the revoked row data itself

If the revoked record were the issue, the backend would more likely return a record-specific error such as:

- key not found
- active keys must be revoked before deletion
- revoked key record could not be deleted

Instead, the server is rejecting the `delete` action name at the contract layer.

That means the highest-confidence root cause is:

- frontend deployed with delete UI
- backend not redeployed after delete support was added

### 3. The current stacked history layout will get too long

The current API Keys page now separates:

- `Active Keys`
- `Revoked History`

That is cleaner than the old mixed table, but it still creates a vertical page that will grow indefinitely as revoked rows accumulate.

The user concern is valid:

- key management should stay compact
- history should be available without dominating the page
- the UI should feel like a proper developer-access console, not a long archive

## UX Direction

### Recommended primary pattern: segmented tabs

Best-fit pattern for this surface:

- `Active`
- `Revoked`
- `All`

Each tab should show a count:

- `Active (2)`
- `Revoked (7)`
- `All (9)`

Why this is the strongest option:

- keeps the default view focused on actionable keys
- lets users quickly inspect history without page sprawl
- scales better than permanent stacked tables
- feels more intentional for a developer-access surface

### Mobile / narrow-panel fallback

If the tab row becomes cramped on smaller widths:

- keep the segmented control style
- allow wrap
- or degrade to a compact disclosure / accordion pattern

Recommended fallback:

- desktop/tablet: tabs
- narrow mobile: disclosure sections

### Default tab

The default should be:

- `Active`

Reason:

- it is the operational surface
- it aligns with the key limit and current tasks
- it keeps revoked history out of the way unless explicitly needed

## Fix Strategy

### Phase 1. Fix the live delete contract mismatch

Deploy the current `api-keys` Edge Function again so the live backend includes the new delete action.

Local file to deploy:

- [index.ts](/D:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/supabase/functions/api-keys/index.ts)

Expected backend behavior after deploy:

- `action: "generate"` works
- `action: "revoke"` works
- `action: "delete"` works
- `Unsupported action` only appears for truly unknown actions

Verification:

1. revoke a key
2. delete the revoked entry
3. confirm the row disappears

### Phase 2. Replace stacked sections with a tabbed key manager

Refactor the API Keys page UI so the key list is filtered by selected tab rather than always rendering both sections.

Recommended model:

- tab state stored in frontend only
- counts derived from the fetched key list
- single table renderer reused across tabs

Tabs:

- `Active`
- `Revoked`
- `All`

Table behavior:

- `Active` tab shows revoke action only
- `Revoked` tab shows delete action only
- `All` tab shows both statuses, with row-level action determined by state

### Phase 3. Add a compact history affordance if tabs are not enough

If you want a little extra UX polish on top of tabs:

- add a small disclosure under `Revoked` such as `Show history guidance`
- or let the `Revoked` tab remember its last scroll position

This is optional. The main improvement is the tabbed filter.

### Phase 4. Improve empty states per tab

Each tab should have its own empty state:

- `Active`: `No active keys right now. Generate one to connect a client.`
- `Revoked`: `No revoked key history yet. Revoked keys will appear here when you rotate them out.`
- `All`: `No API keys yet. Generate one to get started.`

### Phase 5. Verification

Backend:

- `delete` action works after redeploy
- active keys cannot be deleted
- revoked keys can be deleted

Frontend:

- tab switching updates visible rows correctly
- counts remain accurate
- `Active` remains the default view
- revoke and delete actions appear only where appropriate

Regression:

- generate still resets button state
- revoke still works
- active-key limit still counts only non-revoked keys

## Risks To Avoid

- do not ship the new tabs while the backend delete action is still undeployed
- do not allow delete for active keys
- do not make `All` the default tab
- do not hide revoked history completely without a path to recover it

## Recommended Execution Order

1. redeploy the Supabase `api-keys` function with delete support
2. verify delete works in the current UI
3. implement tabbed key-state filtering
4. verify counts, actions, and empty states

## Definition Of Done

This follow-up is done when:

- deleting a revoked key no longer returns `Unsupported action`
- the page no longer grows indefinitely with stacked sections
- users can switch between `Active`, `Revoked`, and `All`
- the API Keys page remains consistent with the current entitlement and revoke lifecycle
