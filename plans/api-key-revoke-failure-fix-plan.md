# API Key Revoke And Management UX Plan

## Goal

Fix the Dashboard API key revoke flow so revoking an MCP key works reliably in local and deployed environments, then restructure API key management into a first-class product surface that matches developer expectations without breaking the existing MCP, purchase, and entitlement systems.

## Priority Order

This work should be executed in this order:

1. Revoke fix and lifecycle hardening
2. API Keys IA split-out and dedicated page/route
3. API key optics and copy cleanup
4. Key-limit policy update from 3 to 5 active keys

The key-limit increase should **not** ship before revoke is proven stable.

## Current State Snapshot

### Current menu and placement

Today, API keys are rendered inside the Dashboard page reached from `My Purchases`.

Relevant surfaces:

- dropdown item in [index.html](D:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/index.html)
- dashboard heading and purchases view in [store.js](D:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js)
- API key table embedded inside the same dashboard in [store.js](D:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js)

### Current entitlement rule

API keys are currently available to:

- Pro subscribers
- users with at least one purchased pack

This is visible in [store.js](D:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js), where key UI wiring currently checks `isPro() || userPurchases.length > 0`.

### Current key limit

The current backend limit is **3 active API keys** per entitled account, enforced in [supabase/functions/api-keys/index.ts](D:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/supabase/functions/api-keys/index.ts#L150).

## Problem Summary

Current user-visible behavior:

- Clicking `Revoke` shows the confirmation dialog.
- After confirming, the app now shows `Failed to fetch`.
- The key remains `Active`.
- The confirmation prompt still uses the browser-native dialog, which looks off-brand and visually harsh inside the Supericons UI.

This is happening in the Dashboard API Keys section rendered from [store.js](D:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js).

In addition, the current IA has a product-UX mismatch:

- users discover API keys via `My Purchases`
- but API keys are not purchase history
- they are an access/configuration surface for MCP and programmatic workflows

This weakens discoverability and makes the product feel less intentional.

## Audit Findings

### 1. The frontend currently hides the real backend error

The revoke flow in [store.js](D:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js) sends:

- `DELETE /functions/v1/api-keys`
- JSON body: `{ key_id }`

But on failure it does this:

- throws a generic `Failed to revoke key`
- shows a generic toast
- does not surface the actual response body from the Edge Function

Result:

- we lose the real reason for failure
- we cannot distinguish auth failure, bad request body, database failure, or deployed-code mismatch from the UI

Latest symptom update:

- the browser is now surfacing `Failed to fetch`, which means the request is failing at the transport/network layer before we even get a structured JSON response back

This is materially different from a normal `400`/`404`/`500` application response.

### 2. The revoke contract is the weakest part of the API key flow

The same Edge Function in [supabase/functions/api-keys/index.ts](D:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/supabase/functions/api-keys/index.ts) uses:

- `GET` for list
- `POST` for generate
- `DELETE` plus JSON body for revoke

This is the odd one out. `DELETE` with a JSON request body is legal, but it is a more fragile contract than `POST`/`PATCH` with JSON because:

- some runtimes, proxies, and integrations handle DELETE bodies inconsistently
- the function depends on `await req.json()` succeeding on a DELETE request
- if the body is missing or stripped, revoke fails before it even reaches the update

This is the highest-confidence root-cause candidate from the code audit.

Latest status:

- the deployed Edge Function already supports the safer `POST { action: "revoke", key_id }` contract
- the frontend is still using the older `DELETE` revoke path

This means the current revoke failure is most likely happening because the browser/client path is still exercising the fragile transport contract, not because the backend lacks revoke support.

### 3. The backend response model is too generic

The revoke handler currently:

- reads `key_id` from `req.json()`
- runs `.update({ revoked: true }).eq('id', key_id).eq('user_id', user.id)`
- returns `Failed to revoke key` on any database error

Missing safeguards:

- no explicit branch for malformed DELETE body
- no branch for `no matching key found`
- no branch for `key already revoked`
- no structured diagnostics for update failure

Important nuance:

- because the current symptom is `Failed to fetch`, this is likely **not** the key record itself failing business validation
- if it were an invalid key id, already revoked key, or missing row, we would expect a normal JSON error response such as `Invalid key_id`, `API key not found`, or `API key already revoked`

That makes “the key was created before the new implementation” an unlikely root cause.

### 4. The current codebase does not prove this is related to the metadata sanitization work

The revoke flow lives in:

- [store.js](D:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js)
- [supabase/functions/api-keys/index.ts](D:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/supabase/functions/api-keys/index.ts)

The metadata sanitization work mainly touched:

- public pack CSS and bundle assets
- export sanitization helpers
- `material-export.js` and `material-export-manifest.json`

Those changes do not intersect the revoke code path.

This does **not** prove the revoke bug is old in production, but it does show the most likely issue is the revoke flow itself, not the metadata cleanup.

### 5. The current IA is mixing commerce and developer access

Right now the Dashboard page combines:

- purchase history
- API key generation
- API key revocation

That creates a mental-model mismatch:

- `My Purchases` implies receipts, ownership, and acquired content
- `API Keys` implies configuration, access, security, and developer setup

For a developer using MCP, hiding keys inside `My Purchases` adds friction at the exact moment they need quick setup or key rotation.

### 6. The current key limit is serviceable but tight

The current active-key cap of `3` works for the simplest setup, but it is restrictive for realistic agent workflows:

- one key for Cursor
- one key for Claude
- one key for Codex or another machine
- no spare for safe rotation

This does **not** justify increasing the limit before revoke works, but it does support a post-fix increase to `5`.

### 7. The revoke confirmation UI is still raw browser chrome

The current prompt in [store.js](D:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js) uses:

- native `confirm('Revoke this API key? This cannot be undone.')`

This is functional, but it creates UX issues:

- looks visually disconnected from the rest of the product
- uses browser styling instead of Supericons styling
- prevents richer copy and clearer context
- feels rougher than the rest of the API Keys page

## Root Cause Assessment

### Most likely root cause

The revoke flow is still relying on a brittle request contract from the frontend:

- `DELETE` request
- JSON body required
- generic error handling on both frontend and backend

If the request body is missing, malformed, or handled differently by the runtime, the revoke operation fails and the UI cannot tell us why.

Most likely immediate cause of the current `Failed to fetch` symptom:

- the frontend is still using `DELETE`
- the backend is already prepared for the safer `POST action` path
- the request is likely failing before a normal JSON response is returned

Most likely **not** the cause:

- the key being old
- the key being created before the new implementation

Reason:

- revoke is based on the row id and user ownership, not on when the key was created
- an old key would still revoke if the transport succeeds
- record-specific issues would more likely produce a structured JSON error, not a raw network fetch failure

### Secondary contributing causes

- frontend error masking
- backend response masking
- no confirmation that the row was actually updated
- no revoke-specific regression test coverage
- possible local-vs-deployed function mismatch is currently invisible
- native browser confirmation dialog instead of themed product UI

## Fix Strategy

### Phase 1. Make revoke transport robust

Change the live frontend revoke mutation away from `DELETE + JSON body` to the already-supported safer explicit JSON mutation contract.

Recommended approach:

- keep `GET /api-keys` for listing
- keep `POST /api-keys` for key generation
- use `POST /api-keys` with an action body for revoke:
  - `{ action: "revoke", key_id: "..." }`

Why this is the safest option:

- same JSON parsing path as the working generate route
- avoids DELETE-body ambiguity
- keeps one Edge Function endpoint
- lower deployment and wiring risk

Compatibility note:

- keep temporary backward support for the current DELETE path in the Edge Function during transition
- update the frontend to use the new action-based POST contract immediately
- remove DELETE later only after production verification

Why this is now the priority:

- the backend has already been deployed with POST revoke support
- the frontend still needs to switch to it
- this is the highest-confidence fix for the observed `Failed to fetch` error

### Phase 2. Improve backend revoke semantics

In [supabase/functions/api-keys/index.ts](D:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/supabase/functions/api-keys/index.ts):

- separate create and revoke handling cleanly inside POST
- validate `key_id` format before the update
- return specific errors for:
  - missing `key_id`
  - unauthenticated request
  - key not found for this user
  - key already revoked
  - database update failure
- request a returning row or count so the function can confirm the revoke actually happened

### Phase 3. Improve frontend error handling

In [store.js](D:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js):

- parse the revoke response body on non-OK responses
- show the specific returned error in dev-friendly logs
- keep user-facing toast concise but more accurate
- disable the revoke button while the request is in flight
- optimistically prevent double-click race conditions

### Phase 3.5. Replace the raw browser confirm with a themed revoke modal

After the transport fix is in place, replace the native `confirm()` call with an in-app confirmation modal that matches the site theme.

Recommended behavior:

- title: `Revoke API key?`
- body copy: `This key will stop working for MCP clients and apps immediately. This action cannot be undone.`
- secondary detail: show the key prefix and label when available
- actions:
  - `Cancel`
  - `Revoke key`

Why this should happen after the transport fix:

- the broken lifecycle issue is more urgent than visual polish
- once revoke works reliably, the modal can be wired to the final stable action path

Implementation direction:

- reuse the existing modal/backdrop/card styling patterns already used elsewhere in the app
- do not use browser-native dialogs for this flow

### Phase 4. Add observability and regression checks

Add explicit verification for:

- active key revokes successfully
- revoked key disappears from active state and shows `Revoked`
- revoked key fails MCP validation afterward
- user cannot revoke another user’s key
- malformed request returns a clear 400
- expired/missing auth returns a clear 401

If feasible, also add temporary server logging around revoke failures so local and deployed issues can be differentiated quickly.

### Phase 5. Ship a dedicated API Keys section

After revoke is stable, separate API key management from `My Purchases`.

Recommended structure:

- keep `Account` as the profile popup
- keep `My Purchases` focused on purchase history and owned content
- add a new dropdown item: `API Keys`
- route that item to a dedicated page/section for key management

Recommended page naming:

- nav label: `API Keys`
- page title: `Developer Access`
- supporting copy: `For MCP and programmatic access`

Why this is the safest IA upgrade:

- minimal navigation change
- no need to turn `Account` into a full settings system yet
- preserves existing dashboard behavior for purchases
- matches the mental model developers expect

### Phase 6. Refactor the Dashboard split cleanly

Rescope the current dashboard surface into 2 destinations:

- `My Purchases`
  - purchase history
  - owned collections / relevant actions
- `API Keys`
  - key table
  - generate key form
  - revoke controls
  - key usage guidance

Important rule:

- API keys remain available to all entitled accounts, not only Pro
- entitlement language should reflect `Pro or purchased pack access`

### Phase 7. Improve API key optics and copy

The API Keys page should feel like a trust and access surface, not a billing appendix.

Recommended UX copy goals:

- explain what keys are for in one sentence
- reassure users that the key carries existing entitlement, not new entitlement
- make key labels feel purposeful: device, IDE, agent, machine
- present revoke as a security action, not a destructive mystery

Copy themes to use:

- `Use API keys to connect MCP clients and programmatic workflows to your Supericons account.`
- `Your key carries the access your account already owns through Pro or purchased packs.`
- `Label keys by app or device so you can rotate them confidently later.`

### Phase 8. Increase the active key limit from 3 to 5

Only after Phases 1 through 7 are stable:

- raise the backend limit from `3` to `5`
- update the UI copy so the limit is clear
- keep the limit account-based for all entitled users

Rationale:

- supports realistic multi-agent workflows
- leaves room for safe rotation
- still limits abuse and key sharing

### Phase 9. Deployment and parity check

Because the failure happens against the live Edge Function from localhost, verify:

- local code matches deployed function behavior
- the updated function is actually deployed before retest
- the deployed frontend is not carrying an older revoke contract

## Implementation Notes

### Files expected to change

- [store.js](D:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js)
- [supabase/functions/api-keys/index.ts](D:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/supabase/functions/api-keys/index.ts)
- [index.html](D:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/index.html)

### Files likely not affected

- [auth.js](D:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/auth.js)
- [material-export.js](D:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/material-export.js)
- public metadata sanitization helpers and pack assets

## Acceptance Criteria

- Revoking a valid API key from Dashboard succeeds on first attempt.
- Revoking a pre-existing key created before this fix also succeeds.
- The key status updates from `Active` to `Revoked` without a full reload.
- The same key no longer validates through MCP.
- The UI surfaces meaningful failure reasons during development.
- The revoke confirmation no longer uses the browser-native dialog.
- `My Purchases` no longer contains API key management.
- Users can access a dedicated `API Keys` destination directly from the avatar dropdown.
- The API Keys page clearly communicates that keys are for MCP and programmatic access.
- The product preserves the entitlement rule of `Pro or purchased pack access`.
- After the lifecycle fix ships, the active key cap can be raised safely from `3` to `5`.
- The fix does not break:
  - key generation
  - key listing
  - MCP key validation
  - pack-owner entitlement behavior
  - Pro entitlement behavior

## Verification Plan

1. Generate a new key from the new API Keys section.
2. Revoke an older existing key that predates this fix.
3. Confirm the row updates to `Revoked`.
4. Generate a fresh key and revoke that too.
5. Attempt MCP validation with the revoked key and confirm rejection.
6. Refresh the page and confirm the revoked state persists.
7. Confirm the revoke flow uses the themed modal instead of the browser-native prompt.
8. Confirm `My Purchases` still works and no longer shows key management UI.
9. Confirm the dropdown contains `API Keys` and routes correctly.
10. Verify generation and revoke for:
   - Pro account
   - purchased-pack account
11. After the limit bump ships, verify the cap is exactly 5 and the message is updated.
12. Verify generate/list/revoke on localhost and deployed environment.

## Recommendation

Treat this as a sequenced API key hardening initiative:

1. fix revoke first
2. then split API keys into their own first-class destination
3. then improve optics and copy
4. then raise the limit from 3 to 5

That sequencing resolves the trust issue first, then improves discoverability and developer ergonomics without layering nicer UI on top of unreliable key lifecycle behavior.
