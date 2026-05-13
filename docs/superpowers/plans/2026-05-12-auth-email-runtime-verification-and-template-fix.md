# Auth Email Runtime Verification And Template Fix Implementation Plan

**Goal:** Make password reset and password-change emails provably use the current Supericons email templates, remove verification-code output everywhere, and make reset cooldown messaging clear in the UI.

**Architecture:** Keep Supabase Auth as the source of truth for secure auth links and rate limits. Keep the `send-email` Edge Function as the only custom email renderer. Add runtime version evidence so dashboard/deployed behavior can be distinguished from local source behavior without exposing secrets.

**Tech Stack:** Supabase Auth Hooks, Supabase Edge Functions, Deno, Resend, static HTML email templates, `auth.js`, i18n JSON catalogs, Node verification scripts.

---

## Verified Findings

- The current local `supabase/functions/send-email/index.ts` does not contain `Verification code`, `code below`, `codeLabel`, `magiclink`, or `Sign in to Supericons`.
- The current local `supabase/templates/reset_password.html` is dark themed and does not contain a verification code.
- The screenshot email is light themed and contains `Use the button or code below` plus `Verification code`, so it is not rendered from the current local `send-email/index.ts` source or the current local `supabase/templates/reset_password.html`.
- The account password reset UI uses a 60-second cooldown via `AUTH_EMAIL_REQUEST_COOLDOWN_MS`.
- The account password reset cooldown button currently reuses `auth.resendInSeconds`, whose English copy says `Resend confirmation {seconds}s`, which is wrong for a password reset flow.
- Supabase's documented password reset request cooldown is a 60-second window for the same user. Supabase's built-in email provider also has a low project-wide email-send limit; custom SMTP changes that provider limit, but the per-user reset cooldown still applies.

## Task 1: Add Runtime Fingerprints To `send-email`

**Files:**

- Modify: `supabase/functions/send-email/index.ts`
- Modify: `scripts/verify-auth-email-localization-contract.mjs`

Steps:

- [x] Add a constant:

```ts
const EMAIL_TEMPLATE_VERSION = 'supericons-auth-email-v2-link-only-2026-05-12';
```

- [x] Add the version to every outgoing email HTML as a harmless comment:

```html
<!-- supericons-auth-email-v2-link-only-2026-05-12 -->
```

- [x] Add the version to the Resend payload tags if supported by the current Resend API shape:

```ts
tags: [{ name: 'template_version', value: EMAIL_TEMPLATE_VERSION }]
```

- [x] Log the version only as safe operational metadata:

```ts
console.info('[send-email] Sent auth email', { intent, locale, templateVersion: EMAIL_TEMPLATE_VERSION });
```

- [x] Update `scripts/verify-auth-email-localization-contract.mjs` to assert the version marker exists.

## Task 2: Make `send-email` Use The Exact Existing Template Style

**Files:**

- Read: `supabase/templates/reset_password.html`
- Read: `supabase/templates/password_change_notification.html`
- Read: `supabase/templates/confirm_signup.html`
- Modify: `supabase/functions/send-email/index.ts`
- Modify: `scripts/verify-auth-email-localization-contract.mjs`

Steps:

- [x] Change `buildEmailHtml()` to match the local template geometry:
  - outer max width `480px`
  - logo image height `34`
  - logo margin bottom `32px`
  - card padding `48px 40px`
  - card background `#131313`
  - page background `#0e0e0e`
  - CTA radius `99px`
  - CTA padding `14px 32px`
  - no redundant Curly Mole Labs footer copy
- [x] Keep localized text from `send-email/index.ts`.
- [x] Keep `dir="rtl"` for Arabic only.
- [x] Keep no verification-code block.
- [x] Update the verification script to assert the template geometry markers.

## Task 3: Add A Local Render Snapshot Check

**Files:**

- Create: `scripts/verify-send-email-render-output.mjs`
- Modify: `package.json`

Steps:

- [x] Export or test-call the email renderer without sending email.
- [x] Generate sample HTML for English reset password.
- [x] Assert the sample contains:
  - `supericons-auth-email-v2-link-only-2026-05-12`
  - `Password Recovery`
  - `Use the secure link below`
  - `logo_email_header.png`
  - `#0e0e0e`
  - `#131313`
- [x] Assert the sample does not contain:
  - `Verification code`
  - `code below`
  - `Sign in to Supericons`
  - any raw token value
- [x] Add script:

```json
"verify:send-email-render-output": "node scripts/verify-send-email-render-output.mjs"
```

## Task 4: Fix Password Reset Cooldown Wording

**Files:**

- Modify: `auth.js`
- Modify: `data/i18n/messages/en.json`
- Modify: `public/i18n/messages/en.json`
- Modify: all other locale message files under `data/i18n/messages/` and `public/i18n/messages/`
- Modify: `scripts/verify-auth-email-localization-contract.mjs`

Steps:

- [x] Add a separate key:

```json
"passwordResetInSeconds": "Send another reset email in {seconds}s"
```

- [x] Change the account password reset button cooldown from `auth.resendInSeconds` to `account.password.resetInSeconds` or equivalent.
- [x] Leave confirmation resend flows using `auth.resendInSeconds`.
- [x] Update verification to assert account password reset does not reuse confirmation wording.

## Task 5: Add Dashboard/Deployment Checklist

**Files:**

- Create: `docs/supabase-auth-email-deployment-checklist.md`

Steps:

- [x] Document that restarting Vite does not update Supabase Edge Functions.
- [x] Document that after code changes, `send-email` must be redeployed.
- [x] Document the expected runtime evidence:
  - Edge Function log contains `[send-email] Sent auth email`
  - log includes `templateVersion: supericons-auth-email-v2-link-only-2026-05-12`
  - received HTML contains the version comment
  - no email contains `Verification code`
- [x] Document secret-safe dashboard checks:
  - Send Email hook enabled
  - HTTPS target is the `send-email` function URL
  - function Verify JWT is off
  - `SEND_EMAIL_HOOK_SECRET`, `RESEND_API_KEY`, and `AUTH_EMAIL_FROM` are configured
  - do not print or paste secret values

## Task 6: Verification Commands

Run:

```bash
deno check --allow-import supabase/functions/send-email/index.ts
npm run verify:auth-email-localization-contract
npm run verify:send-email-render-output
npm run verify:auth-error-localization
npm run build
```

Expected:

- The Deno check passes.
- The contract check proves no verification-code copy exists in source.
- The render-output check proves generated HTML is dark themed and link-only.
- The auth error localization check proves in-app auth messages still behave separately.
- The build passes.

## Task 7: Manual End-To-End Test

Steps:

- [ ] Redeploy `send-email`.
- [ ] Trigger one password reset.
- [ ] In Supabase Edge Function logs, verify one successful invocation.
- [ ] Confirm the log contains the new template version.
- [ ] In the received email, inspect message source and confirm the version comment exists.
- [ ] Confirm the email uses the dark Supericons layout.
- [ ] Confirm the email does not contain a verification code.
- [ ] Click the reset link and complete the password change.
- [ ] Confirm the password changed email uses the security-notice copy and contains no sign-in copy.

## Residual Risk

The exact deployed runtime cannot be proven from local files alone. The version marker and function log are required to prove that Supabase is running the current hook rather than an older deployed function or dashboard template path.
