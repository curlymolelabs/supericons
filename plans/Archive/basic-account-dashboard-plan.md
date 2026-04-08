# Basic Account Dashboard Plan

## Goal

Add a minimal logged-in account surface that gives users one clear place to manage core account details before launch.

This is intentionally **not** a full profile system. The launch-safe scope is:

- display name / username
- read-only email display
- change password

Out of scope for this pass:

- avatar upload
- email change
- billing history
- notification preferences
- public profile

## Why This Matters

The current logged-in dropdown in [index.html](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/index.html) only exposes:

- `My Purchases`
- `Manage Subscription`
- `Sign out`

That is enough for commerce, but not enough for basic account ownership. Now that password reset is implemented and working, users should also have a direct in-app place to:

- confirm which account they are using
- adjust their display name
- change their password without going through recovery

## Current Repo Grounding

- The header avatar dropdown already exists in [index.html](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/index.html).
- Display name is already derived from Supabase user metadata in [auth.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/auth.js):
  - `full_name`
  - `name`
  - email prefix fallback
- Avatar image support also already exists in [auth.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/auth.js), but avatar editing is not required for launch.
- Password reset / password update flow now exists in [auth.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/auth.js), which gives us a safe reference for validation, status handling, and success messaging.

## Proposed UX

### Entry Point

Add a new `Account` item to the existing avatar dropdown, above `My Purchases`.

### Surface Type

Use a modal, not a routed page, for this first version.

Why:

- faster to implement
- consistent with the existing auth modal pattern
- lower risk than introducing a new top-level route or dashboard shell before launch

### Account Modal Sections

#### 1. Profile

- editable `Display name`
- helper copy clarifying this is how the account is labeled inside Supericons
- save action with inline success/error state

Implementation note:

- write to Supabase auth user metadata
- prefer `full_name` as the canonical field for this app

#### 2. Email

- show current signed-in email
- read-only
- short note that email change is not available yet

#### 3. Password

- button: `Change password`
- opens a simple password form inside the modal
- fields:
  - current password
  - new password
  - confirm new password

Launch fallback if current-password verification becomes too heavy:

- keep `Change password` as a CTA that sends the user through the already-working reset-password flow instead of an inline current-password flow

Recommended launch decision:

- prefer the simpler and safer path first:
  - `Change password` opens the existing recovery-based password update path
- only add true in-session password change if it can be done cleanly without auth edge-case churn

## Scope Recommendation

### Must Have

- `Account` entry in avatar dropdown
- account modal shell
- editable display name
- read-only email display
- password-change entry point

### Nice to Have

- inline success toast after display name save
- lightweight account summary at top of modal

### Not For This Pass

- avatar uploader
- username slug
- email mutation flow
- password strength meter
- session management

## Implementation Phases

### Phase 1. Account Entry + Modal Shell

Files likely touched:

- [index.html](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/index.html)
- [style.css](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/style.css)
- [auth.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/auth.js)

Tasks:

- add `Account` item to avatar dropdown
- add account modal markup
- wire open/close behavior
- populate modal with current user display name + email

### Phase 2. Display Name Editing

Files likely touched:

- [auth.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/auth.js)
- [style.css](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/style.css)

Tasks:

- add form state and validation
- save `full_name` via Supabase auth user metadata update
- refresh header dropdown name after save
- show success/error messaging

### Phase 3. Password Change Entry

Recommended version for launch:

- add `Change password` button inside the account modal
- trigger the existing password recovery-based flow for the signed-in email

Why this version is preferred:

- reuses a tested path
- avoids reauthentication edge cases
- keeps launch scope small

Optional later upgrade:

- replace or supplement with true in-session password change once account settings are more mature

## Data Model Decision

Use this priority consistently for display name:

1. `user_metadata.full_name`
2. `user_metadata.name`
3. email prefix fallback

When saving from the new account modal:

- write to `full_name`
- optionally mirror into `name` only if the current codebase still needs compatibility

## Verification Checklist

### Functional

- logged-in user sees new `Account` item
- account modal opens and closes correctly
- current display name loads correctly
- current email displays correctly
- saving display name updates:
  - modal field state
  - avatar dropdown header
  - any other UI using `getUserDisplayName()`
- change-password action launches the correct flow

### Regression

- sign-in modal still works
- password reset flow still works
- avatar dropdown still closes properly on outside click
- `My Purchases` still opens as before
- `Manage Subscription` still works for Pro users
- `Sign out` still works

### Build / QA

- `npm run build`
- desktop browser verification
- one mobile-width check to ensure the account modal is usable and not clipped

## Risks

### Low Risk

- adding the modal shell
- showing read-only email
- editing display name metadata

### Medium Risk

- password change UX if we try to implement too much at once

Mitigation:

- launch with recovery-based password change entry if needed

## Recommended Launch Order

1. Add `Account` entry and modal shell
2. Add display name editing
3. Add password-change entry using the safest working path
4. Verify desktop behavior
5. Decide later whether avatar upload is worth post-launch scope

## Success Criteria

The feature is complete when a signed-in user can:

- open an `Account` modal from the avatar dropdown
- view their current email
- update their display name successfully
- initiate a password change from inside the product

without breaking purchases, subscription management, or existing auth flows.
