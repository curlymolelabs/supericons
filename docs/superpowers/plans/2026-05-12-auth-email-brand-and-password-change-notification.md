# Auth Email Brand And Password Change Notification Implementation Plan

**Goal:** Remove redundant Curly Mole Labs security footer copy from Supericons auth emails and make password-change notification email delivery reliable after a successful in-app password update.

**Architecture:** Keep Supabase Auth responsible for changing passwords. Keep `send-email` responsible for Supabase Auth Hook emails. Add a narrow authenticated Edge Function for the app to send a password-changed security notification to the signed-in user's own email after `updateUserPassword()` succeeds, because Supabase password-changed emails are security notification emails that must be enabled separately at the project level.

**Tech Stack:** Supabase Auth, Supabase Edge Functions, Deno, Resend, browser `fetch`, i18n message catalogs, Node/Deno verification scripts.

---

## Verified Findings

- Supabase documents password-changed emails as **security notification emails**, separate from authentication emails.
- Supabase security notification emails are only sent if the respective notification is enabled at the project level.
- Current local `send-email/index.ts` contains and renders redundant brand footer copy:
  - `Curly Mole Labs sends this email for Supericons account security.`
  - `© 2026 Curly Mole Labs`
- Current frontend `updateUserPassword()` only calls `supabase.auth.updateUser({ password })`; it does not send any app-controlled email after success.

## Task 1: Remove Redundant Curly Mole Labs Footer From Auth Email Rendering

**Files:**

- Modify: `supabase/functions/send-email/index.ts`
- Modify: `supabase/templates/confirm_signup.html`
- Modify: `supabase/templates/reset_password.html`
- Modify: `supabase/templates/password_change_notification.html`
- Modify: `scripts/verify-auth-email-localization-contract.mjs`
- Modify: `scripts/verify-send-email-render-output.ts`

Steps:

- [x] Remove visible footer text that says Curly Mole Labs sends the email for account security.
- [x] Remove `© 2026 Curly Mole Labs` from auth email output.
- [x] Keep the brand as Supericons in the logo and email content.
- [x] Update verification so the rendered auth email output must not include the removed footer strings.

## Task 2: Export Reusable Password-Changed Email Rendering

**Files:**

- Modify: `supabase/functions/send-email/index.ts`

Steps:

- [x] Export a helper that returns `{ subject, html, text }` for a given `intent`, `locale`, `url`, and `recipientEmail`.
- [x] Keep the helper pure; it must not send email or read secrets.
- [x] Use the same rendered password-changed template output as `send-email`, embedded in `notify-password-changed` so Supabase browser deploy can bundle it as a single function file.

## Task 3: Add Authenticated Password-Changed Notification Function

**Files:**

- Create: `supabase/functions/notify-password-changed/index.ts`

Steps:

- [x] Accept only `POST` and `OPTIONS`.
- [x] Authenticate the caller using their Supabase JWT.
- [x] Read the current user from Supabase Auth.
- [x] Send only to `user.email`; do not accept arbitrary recipient addresses.
- [x] Use `RESEND_API_KEY` and `AUTH_EMAIL_FROM`.
- [x] Render localized `password_changed` email copy through the shared renderer.
- [x] Return `{ ok: true }` after Resend accepts the email.

## Task 4: Call Notification Function After Password Update

**Files:**

- Modify: `auth.js`

Steps:

- [x] Add `notifyPasswordChanged()` that calls `/functions/v1/notify-password-changed`.
- [x] Pass only locale metadata in the JSON body.
- [x] Call it after `updateUserPassword()` succeeds.
- [x] Do not roll back or report password update failure if the notification email fails.
- [x] Log a warning if the notification fails.

## Task 5: Add Verification

**Files:**

- Modify: `scripts/verify-auth-email-localization-contract.mjs`
- Modify: `scripts/verify-send-email-render-output.ts`
- Modify: `package.json`

Steps:

- [x] Assert `notify-password-changed` exists.
- [x] Assert it authenticates via Supabase Auth.
- [x] Assert it sends only to `user.email`.
- [x] Assert it does not accept a recipient from the request body.
- [x] Assert rendered emails do not contain redundant Curly Mole Labs footer text.

## Task 6: Run Checks

Commands:

```bash
deno check --allow-import supabase/functions/send-email/index.ts supabase/functions/notify-password-changed/index.ts scripts/verify-send-email-render-output.ts
npm run verify:auth-email-localization-contract
npm run verify:send-email-render-output
npm run verify:auth-error-localization
npm run build
```

## Deployment Note

After this work, deploy both Edge Functions:

```bash
supabase functions deploy send-email --no-verify-jwt
supabase functions deploy notify-password-changed --no-verify-jwt
```

`send-email` must keep Verify JWT off because Supabase Auth Hooks use webhook signatures. `notify-password-changed` must also keep Verify JWT off for browser CORS preflight compatibility, but it still verifies the signed-in user inside the function with `supabase.auth.getUser()` before sending mail. The notification function is intentionally self-contained; do not import from sibling Edge Function folders when deploying through the Supabase browser editor.
