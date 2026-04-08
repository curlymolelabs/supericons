# Auth UX Flow Hardening Plan

## Goal

Make every auth path in Supericons truthful, recoverable, and launch-safe before the next Netlify redeploy.

This plan is grounded in the current auth implementation and audit findings across:

- [auth.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/auth.js)
- [index.html](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/index.html)
- [style.css](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/style.css)
- [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js)
- [auth_hardening_plan_audit.md](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs/auth_hardening_plan_audit.md)

Official behavior references:

- Supabase sign up behavior: https://supabase.com/docs/reference/javascript/auth-signup
- Supabase resend signup confirmation: https://supabase.com/docs/reference/javascript/auth-resend
- Supabase password reset flow: https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail
- Supabase identity linking: https://supabase.com/docs/guides/auth/auth-identity-linking
- Supabase redirect URL handling: https://supabase.com/docs/guides/auth/redirect-urls

## Audit Amendments And Current Local Status

This plan was updated after reviewing [auth_hardening_plan_audit.md](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs/auth_hardening_plan_audit.md).

### Corrections from the audit

- The verify-stage neutral copy and verify-stage Google CTA were already partially fixed and should not stay in the blocker list.
- The duplicate-signup interpretation now uses `user.identities.length === 0` only as a likely-existing-account hint, not as a guaranteed truth source.
- Resend confirmation needs a visible client cooldown so repeated clicks do not immediately collide with rate limits.
- Callback error handling should explicitly cover fragments such as:
  - `#error=access_denied&error_code=403&error_description=...`
- Dead legacy auth listener code should be removed instead of left in place.

### Implemented locally already

- Neutral verify-stage copy for ambiguous signup outcomes
- Verify-stage Google CTA
- Duplicate-signup heuristic using `identities: []` as a hint
- Resend-confirmation action with client cooldown
- Sign-in error normalization for:
  - unconfirmed email
  - invalid credentials
  - basic rate limits
- Neutral forgot-password success copy
- Callback error parsing for invalid and expired auth links
- Provider-aware password action labels in the account modal
- Removal of dead legacy auth listener code

### Still required before the next redeploy

- Run the full auth scenario matrix and record evidence
- Verify resend confirmation against a truly unconfirmed live email account
- Verify expired-link handling with a real expired reset or confirmation URL
- Verify that an OAuth-first user can add password sign-in and still keep Google sign-in working

## Audit Conclusion

We had not stress-tested the auth UX deeply enough.

The backend behavior is mostly privacy-safe. The larger risk is frontend wording that sounds more certain than Supabase actually is. The biggest example is duplicate signup:

- a brand-new signup and an already-existing confirmed user can both return `session: null`
- Supabase does that intentionally to prevent account enumeration
- the frontend must stay neutral unless it has high-confidence evidence to say more

## Required Scenario Coverage

The following six scenarios are now treated as explicit launch flows, not incidental behavior:

### 1. Unconfirmed email sign-in + resend confirmation

- Dedicated verify-stage mode:
  - `AUTH_VERIFY_KIND.SIGNIN_UNCONFIRMED`
- Mitigation:
  - normalized sign-in error
  - resend confirmation action
  - client cooldown

### 2. Duplicate signup with existing email account

- Dedicated verify-stage mode:
  - `AUTH_VERIFY_KIND.SIGNUP_EXISTING_HINT`
- Mitigation:
  - neutral no-enumeration copy
  - sign-in recovery path
  - `identities.length === 0` used only as a hint

### 3. Duplicate signup with Google-first account

- Dedicated verify-stage mode:
  - `AUTH_VERIFY_KIND.SIGNUP_EXISTING_HINT`
- Mitigation:
  - neutral no-enumeration copy
  - explicit Google CTA on verify stage

### 4. Unknown-email forgot-password

- Dedicated neutral forgot-password success copy
- Mitigation:
  - no claim that an email definitely exists
  - same user-facing outcome as the known-email case

### 5. Expired or invalid recovery link

- Dedicated verify-stage mode:
  - `AUTH_VERIFY_KIND.CALLBACK_ERROR`
- Mitigation:
  - explicit callback error parsing
  - recovery-aware copy
  - direct “Request new reset link” path when the failed callback was a recovery flow

### 6. OAuth-first “Set password” follow-through

- Dedicated reset-stage mode:
  - `AUTH_RESET_KIND.ADD_PASSWORD`
- Mitigation:
  - account modal says `Add password sign-in`
  - reset stage switches to add-password wording
  - success copy confirms password sign-in was added without breaking Google access

## Current Auth Surface Inventory

### Entry points

- Default sign-in entry from the header button
- Purchase-gated auth prompt
- Subscription-gated auth prompt
- Pro-tool-gated auth prompt
- Account modal password action
- Google OAuth redirect return
- Email confirmation redirect return
- Password recovery redirect return

### Current UI stages

- Auth form stage
  - sign in
  - sign up
- Verify stage
- Forgot password stage
- Reset password stage
- Account modal

### Current intent contexts

- `default`
- `purchase`
- `subscribe`
- `pro`

These are preserved through [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js) using `setAuthIntent()` and `consumeAuthIntent()`.

## Scenario Matrix

### 1. Guest signs in with valid email/password

- Expected:
  - sign-in succeeds
  - modal closes
  - user resumes the original intent
- Current status: covered
- Remaining gap:
  - still needs explicit QA evidence

### 2. Guest signs in with wrong password

- Expected:
  - clear failure message
  - no suggestion that the account definitely does not exist
  - recovery path remains available
- Current status: implemented locally
- Remaining gap:
  - still needs manual QA confirmation of the normalized copy

### 3. Guest signs in with an unconfirmed email account

- Expected:
  - message explains the account exists but email is not yet confirmed
  - resend confirmation is available
  - Google fallback remains visible when useful
- Current status: implemented locally
- Remaining gap:
  - still needs live validation against a truly unconfirmed account

### 4. Guest signs up with a brand-new email

- Expected:
  - neutral or accurate “check your email” guidance
  - resend confirmation available
  - intent is preserved
- Current status: implemented locally
- Remaining gap:
  - verify-stage copy is still not fully context-aware

### 5. Guest signs up with an existing confirmed email/password account

- Expected:
  - do not imply a new account was created
  - guide the user back to sign in
- Current status: implemented locally, not redeployed
- Remaining gap:
  - still needs regression validation after the neutral verify-state change

### 6. Guest signs up with an email already used by a Google account

- Expected:
  - do not imply a new account was created
  - provide a clear Google recovery path
- Current status: implemented locally, not redeployed
- Remaining gap:
  - still needs regression validation after the neutral verify-state change

### 7. Guest signs in with Google and account already exists

- Expected:
  - sign-in works
  - account identity links correctly
  - original intent resumes
- Current status: validated on localhost and Netlify
- Remaining gap:
  - QA evidence not yet recorded in a formal matrix

### 8. Guest signs in with Google for the first time

- Expected:
  - account creation succeeds
  - return to app signed in
- Current status: validated
- Remaining gap:
  - cancellation or provider-denial path still needs explicit QA notes

### 9. User requests password reset for an existing email account

- Expected:
  - reset link guidance appears
  - recovery link works
- Current status: implemented locally
- Remaining gap:
  - still needs QA confirmation that the neutral copy is understandable

### 10. User requests password reset for an unknown email

- Expected:
  - privacy-safe neutral copy
  - no account enumeration
- Current status: implemented locally
- Remaining gap:
  - still needs QA confirmation that no leakage occurs through wording

### 11. User opens a valid recovery link

- Expected:
  - reset stage opens
  - user can update password
  - user returns authenticated
- Current status: covered and previously tested
- Remaining gap:
  - success-to-context messaging is still generic

### 12. User opens an expired or invalid recovery link

- Expected:
  - explicit invalid or expired link state
  - retry path available
- Current status: implemented locally
- Remaining gap:
  - still needs manual verification with a real expired or invalid link

### 13. User clicks an email confirmation link

- Expected:
  - user lands signed in or gets a clear next step
  - original intent resumes if present
- Current status: partial
- Remaining gap:
  - still needs manual confirmation that callback success and error states read clearly

### 14. Signed-in user changes display name

- Expected:
  - validation
  - save success
  - header and dropdown update correctly
- Current status: covered
- Remaining gap:
  - no loading label on save action

### 15. Signed-in email user wants password help

- Expected:
  - clear secure flow
  - reset email arrives
- Current status: implemented locally
- Remaining gap:
  - still needs QA verification in the account modal path

### 16. Signed-in OAuth-first user wants password access

- Expected:
  - clear “set password” path
  - no confusing “reset” implication if no password existed
- Current status: implemented locally
- Remaining gap:
  - still needs end-to-end verification with a real OAuth-first account

### 17. User enters auth from a gated purchase, subscribe, or pro intent

- Expected:
  - original context resumes after auth
- Current status: mostly covered
- Remaining gap:
  - verify, forgot, and reset stages are not yet fully context-aware in their copy

## Gap Summary

### High severity

- No QA evidence yet for the full auth scenario matrix
- Live resend-confirmation behavior still needs end-to-end validation against a truly unconfirmed account
- Expired and invalid auth-link handling still needs end-to-end validation with real callback URLs

### Medium severity

- Context-aware copy for gated auth interruptions is still incomplete
- Account-password UX for OAuth-first users needs explicit follow-through verification
- Verify, forgot, and reset stages do not yet fully reflect the original gated intent

### Low severity

- No loading labels on async auth submits
- No formal QA evidence matrix artifact yet

## Detailed Implementation Plan

### Phase 1. Truth-safe sign-up and sign-in messaging

Objective:

- Remove misleading auth copy without pretending we know hidden backend facts.

Implementation:

- Keep the verify-stage hardening already added in:
  - [auth.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/auth.js)
  - [index.html](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/index.html)
  - [style.css](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/style.css)
- Use a small auth-result interpreter:
  - `immediate_session`
  - `confirmation_or_existing_account`
  - `error`
- Use `data.user.identities.length === 0` only as a likely-existing-account hint.
- Replace definitive signup and forgot-password copy with neutral security-safe wording.
- Normalize common sign-in errors:
  - invalid credentials
  - email not confirmed
  - too many requests
  - generic fallback
- Remove dead legacy listener code once the new path is verified.

Acceptance criteria:

- Existing email/password signup attempts no longer imply a new account was created
- Existing Google-email signup attempts offer a clear Google path
- Common raw backend strings are not shown verbatim to users

### Phase 2. Unconfirmed account and resend-confirmation flow

Objective:

- Give unconfirmed users a complete recovery path.

Implementation:

- Extend the verify stage with an explicit unconfirmed-email mode.
- Add `Resend confirmation email` via:
  - `supabase.auth.resend({ type: 'signup', email, options: { emailRedirectTo: window.location.origin } })`
- Show neutral resend success copy.
- Add a short client-side resend cooldown.
- Preserve original auth intent through resend flow.
- Keep provider-aware guidance visible:
  - “If you created this account with Google, continue with Google instead.”

Acceptance criteria:

- Unconfirmed email sign-in leads to a clear resend-confirmation path
- Resend action works without leaking account existence

### Phase 3. Password and provider management hardening

Objective:

- Make password-related UX correct for both email and OAuth-first accounts.

Implementation:

- Keep provider-aware account-password labels.
- For email-identity users:
  - preserve the recovery-email path
- For OAuth-first users:
  - present this as “Set password” rather than “Reset password”
- Verify that adding password access does not break Google sign-in.

Acceptance criteria:

- OAuth-first users are not told to “reset” a password that never existed
- Email users still have a familiar recovery path

### Phase 4. Redirect error and expired-link states

Objective:

- Handle auth callback failures explicitly.

Implementation:

- Parse both hash and query params for auth callback failures.
- Explicitly handle callback fragments like:
  - `#error=access_denied&error_code=403&error_description=...`
- Detect expired and invalid recovery or confirmation cases.
- Show explicit blocked states with:
  - message
  - retry action
  - back to sign in
- Clear consumed callback fragments after handling.

Acceptance criteria:

- Expired or invalid auth links never fail silently
- Users always have a next action

### Phase 5. Context-aware auth copy

Objective:

- Keep gated auth flows coherent after detours into verify or recovery stages.

Implementation:

- Extend auth modal state so verify, forgot, and reset copy can reflect:
  - purchase
  - subscribe
  - pro
- Update copy to say where the user will return after auth completes.

Acceptance criteria:

- Purchase and Pro flows still feel connected after auth interruptions

### Phase 6. Auth QA matrix and stress-test pass

Objective:

- Turn the audit into a repeatable launch gate.

Implementation:

- Create or record a manual QA checklist covering at minimum:
  - new email signup
  - duplicate email signup
  - duplicate Google-email signup
  - unconfirmed email sign-in
  - wrong password
  - Google sign-in
  - forgot-password existing email
  - forgot-password unknown email
  - valid recovery link
  - expired recovery link
  - account modal display-name save
  - account modal password path for email user
  - account modal password path for OAuth-first user
  - purchase-gated auth resume
  - Pro-gated auth resume
- Record expected copy, CTA, and end state for each scenario.

Acceptance criteria:

- No auth redeploy without running the full matrix

## Recommended Implementation Order

1. Keep the local truth-safe verify-stage patch and duplicate-signup heuristic
2. Validate resend-confirmation flow on a truly unconfirmed account
3. Validate normalized sign-in and forgot-password behavior across duplicate and unknown-account cases
4. Validate expired and invalid callback handling with real auth-link failures
5. Validate the OAuth-first “set password” path end-to-end
6. Run the full auth QA matrix locally and record evidence
7. Only then rebuild and redeploy Netlify

## Explicit Launch Blockers Before Next Redeploy

- The full auth QA matrix must be executed and recorded
- Unconfirmed email resend confirmation must be verified live
- Unknown-email forgot-password behavior must be verified as neutral
- At least one expired or invalid auth-link path must be manually verified
- OAuth-first users must be able to add password sign-in without breaking Google access

## Immediate Next Work

- Finish the audit-aligned plan update
- Run a clean local build to ensure the new auth paths compile safely
- Execute the auth scenario matrix in a controlled local pass before the next Netlify upload
