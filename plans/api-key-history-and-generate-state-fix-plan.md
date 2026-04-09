# API Key History And Generate State Fix Plan

## Goal

Polish the new API Keys surface by:

1. moving revoked keys out of the primary active-key view into a clearer history treatment
2. letting users permanently remove revoked key records from that history
3. fixing the `Generate Key` button so it always returns to its normal idle state after generation succeeds or fails

This follow-up should preserve the new `API Keys` information architecture, the current entitlement model, the revoke flow that now works, and the deployed Supabase `api-keys` function contract.

## Scope

This plan covers:

- API Keys page UI in [store.js](/D:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js)
- API key page styling in [style.css](/D:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/style.css)
- API key backend lifecycle contract in [index.ts](/D:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/supabase/functions/api-keys/index.ts)

This plan does not change:

- MCP entitlement behavior
- premium pack / Pro gating rules
- API key generation format
- current `POST { action: "revoke", key_id }` revoke contract

## Current Audit Findings

### 1. Revoked entries still live in the main table

The current list rendering in [store.js](/D:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js) shows active and revoked keys in one flat table.

Current behavior:

- active keys and revoked keys are mixed together
- the usage counter correctly counts only active keys
- revoked rows remain visible as passive history

This is not wrong, but once a user rotates keys several times, the active management surface will become noisy.

### 2. There is no cleanup path for revoked records

Today a revoked key row is inert:

- it can no longer be revoked again
- it cannot be deleted
- it remains visible indefinitely

That is acceptable as a first-pass audit trail, but the user now wants a cleaner lifecycle:

- active keys stay in the main management surface
- revoked keys move to history
- revoked history entries can be explicitly deleted

### 3. The `Generating...` label is not reset on success

The current generate flow in [store.js](/D:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js) does this:

- captures the original button markup
- sets button text to `Generating...`
- sends the generate request
- on error, restores the original button markup
- on success, calls `showApiKeyModal(...)` and `fetchAndRenderApiKeys()`

Root cause:

- the success path never restores the button label or markup
- `fetchAndRenderApiKeys()` only enables or disables the existing button
- it does not reconstruct the original `Generate Key` button contents

That is why the button can remain stuck showing `Generating...` even after the key is successfully created.

This is a frontend state-reset bug, not a backend generation problem.

## Product Direction

### Desired key-management UX

The API Keys page should split into two conceptual layers:

- `Active keys`
  - primary working area
  - generate, revoke, copy, inspect
- `Revoked history`
  - secondary audit/history area
  - collapsed by default or visually separated
  - delete is allowed only here

This keeps the main surface clean while still preserving proof that revoke worked.

### Delete behavior boundary

Delete should only be available for revoked keys.

Why:

- active-key deletion creates ambiguity with revoke semantics
- revoke is the security action
- delete is the cleanup action
- requiring revoke before delete keeps the lifecycle easy to understand

Recommended lifecycle:

1. generate key
2. use key
3. revoke key when no longer needed
4. optionally delete revoked entry from history

## Fix Strategy

### Phase 1. Fix the generate button state reset

Update the frontend generate flow so the button returns to its normal idle presentation after the request completes, regardless of outcome.

Implementation direction:

- keep the existing loading state while the request is in flight
- move button restoration into a shared completion path
- restore both:
  - disabled state
  - original button markup / icon + label

Recommended approach:

- use a `finally` block inside `generateApiKey()`
- restore the original markup unless the page has been fully rerendered away
- keep the current success modal and list refresh

Expected outcome:

- the button briefly shows `Generating...`
- after success it returns to `Generate Key`
- after failure it also returns to `Generate Key`

### Phase 2. Separate revoked rows into history

Refactor the API Keys table rendering so active and revoked keys are displayed separately.

Recommended UI structure:

- top section: `Active Keys`
- secondary section: `Revoked History`

For the history section:

- show only revoked keys
- render it below the active-key table
- keep it visually muted
- optionally collapse it by default if there are many entries

Expected outcome:

- the primary table stays focused on keys the user can still act on
- revoked rows remain visible for audit and reassurance

### Phase 3. Add delete for revoked history entries only

Add a cleanup action for revoked rows.

Recommended UX:

- use a small delete / trash icon button in revoked history rows
- require a themed confirmation modal, similar to the revoke modal
- copy should clearly say this removes the history record, not the already-revoked key behavior

Recommended backend contract:

- continue using the action-based `POST /functions/v1/api-keys` pattern
- add:
  - `{ action: "delete", key_id: "..." }`

Why this is preferred:

- consistent with the new revoke transport
- avoids introducing another fragile method contract
- keeps lifecycle actions in one endpoint

Delete safety rules:

- only allow delete when `revoked = true`
- reject delete for active keys
- scope by `user_id`
- return clear errors for:
  - missing key
  - active key cannot be deleted
  - already deleted / no match

### Phase 4. Add history-specific copy and empty states

The page copy should explain the distinction:

- active keys count toward the limit
- revoked history does not count toward the limit
- revoked entries can be deleted from history

Suggested UX copy direction:

- `0 of 5 active keys in use`
- `Revoked history helps you track rotated keys. Delete entries here when you no longer need the record.`

Empty-state handling:

- no active keys, no history
- active keys present, no history
- no active keys, history present

### Phase 5. Verification

Frontend checks:

- generate a key and confirm button label resets
- revoke a key and confirm it moves out of active list
- delete a revoked history row and confirm it disappears
- verify active key count remains correct throughout

Backend checks:

- delete request succeeds only for revoked keys
- delete request fails for active keys
- deleted rows no longer appear in list response

Regression checks:

- active-key limit still uses only non-revoked rows
- existing revoke flow still works
- new API key modal still appears once on generate
- no MCP entitlement behavior changes

## Execution Order

1. fix generate button reset bug
2. split active vs revoked rendering
3. add revoked-history delete backend action
4. add delete icon + themed confirmation modal
5. run frontend and backend verification

## Risks To Avoid

- do not let delete operate on active keys
- do not break the working revoke flow while adding delete
- do not silently remove history without explicit user confirmation
- do not let the active-key counter include revoked history rows
- do not rely on browser-native dialogs for the new delete action

## Definition Of Done

This follow-up is done when:

- successful key generation no longer leaves the button stuck on `Generating...`
- revoked keys no longer clutter the active-key table
- revoked keys appear in a separate history treatment
- users can delete revoked history entries with a themed confirmation flow
- backend rejects delete attempts for active keys
- the API Keys page still works with the current entitlement and MCP systems
