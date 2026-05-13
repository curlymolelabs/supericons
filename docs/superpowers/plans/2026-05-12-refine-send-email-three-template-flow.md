# Refine Send Email Three Template Flow Implementation Plan

## Goal

Restrict the Supabase `send-email` hook to the three real Supericons auth emails:

- Confirm sign up
- Reset password
- Password changed notification

Supabase Auth remains responsible for users, sessions, secure links, and auth rate limits. The Supericons frontend remains responsible for in-app messages such as wrong password, reset link sent, and cooldown countdowns. The `send-email` Edge Function only renders and sends actual emails through Resend.

## Verified Problem

The current hook contains broad email actions for sign-in links, invites, email changes, and reauthentication. It also falls back to a sign-in email when the incoming payload has no recognized action. That fallback can make a password-change notification look like a sign-in email, which is misleading.

## Implementation Tasks

### 1. Replace Generic Actions With Three Supported Intents

Files:

- `supabase/functions/send-email/index.ts`

Tasks:

- [x] Remove sign-in link, invite, email change, and reauthentication email copy.
- [x] Add an explicit `EmailIntent` union:
  - `confirm_signup`
  - `reset_password`
  - `password_changed`
- [x] Map Supabase payloads to those three intents.
- [x] Reject unknown email events with a clear server error instead of falling back to another email type.
- [x] Log only safe event metadata for unsupported events; never log tokens or links.

### 2. Use The Existing Supericons Email Design

Files:

- `supabase/templates/confirm_signup.html`
- `supabase/templates/reset_password.html`
- `supabase/templates/password_change_notification.html`
- `supabase/functions/send-email/index.ts`

Tasks:

- [x] Render dark Supericons email HTML with the same visual language as the existing templates.
- [x] Use a clear orange button for confirm sign up and reset password.
- [x] Include a fallback link for link-based emails.
- [x] Do not show a verification code in any email.
- [x] Render password changed as a security notice with no primary action button.

### 3. Preserve Language And Direction Support

Files:

- `supabase/functions/send-email/index.ts`

Tasks:

- [x] Keep locale detection from `user.user_metadata.locale`.
- [x] Keep locale detection from `email_data.redirect_to?locale=...`.
- [x] Support all current locales: English, Simplified Chinese, Traditional Chinese, Japanese, Korean, Spanish, German, Portuguese, Arabic, Hindi, Vietnamese, and Thai.
- [x] Set the email document `lang` attribute.
- [x] Set `dir="rtl"` only for Arabic.
- [x] Keep the Supericons logo visually normal in all directions.

### 4. Harden Verification

Files:

- `scripts/verify-auth-email-localization-contract.mjs`

Tasks:

- [x] Assert the hook includes only the three supported email intents.
- [x] Assert unsupported email types are not present.
- [x] Assert there is no verification-code block.
- [x] Assert unknown email events are rejected.
- [x] Assert the auth UI message contract still stays in `auth.js`.

### 5. Run Checks

Commands:

- [x] `deno check --allow-import supabase/functions/send-email/index.ts`
- [x] `npm run verify:auth-email-localization-contract`
- [x] `npm run verify:auth-error-localization`
- [x] `npm run build`

## Deployment Note

For this task, only the Supabase Edge Function needs redeployment:

```text
supabase/functions/send-email/index.ts
```

No Stripe change is needed for auth emails. No frontend redeploy is needed unless `auth.js` changes.
