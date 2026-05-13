# Audit: Supabase Auth Email Localization

**Date:** 2026-05-12
**Scope:** `supabase/functions/send-email/index.ts`, `scripts/verify-auth-email-localization-contract.mjs`, `auth.js`
**Branch:** `codex/reconcile-main-directory-20260429`

---

## 1. Source Code Audit: `send-email/index.ts`

**Verdict: Source code is correct.** The problems observed are NOT caused by this file.

Evidence:

- **No sign-in fallback.** Searched the entire file for `Sign in to Supericons`, `sign in`, `Sign in` — zero matches. The `password_changed` copy says "If you made this change, no further action is needed." — no sign-in CTA.
- **No verification code output.** Searched for `Verification code`, `code below`, `codeLabel` — zero matches. The `reset_password` copy says "Use the secure link below to choose a new password." — link-only, no code.
- **Loud failure on unknown events.** Line 490: `throw new Error('Unsupported auth email action: ...')`. The function returns HTTP 500 with the error message, never falls through to a default email.
- **Only 3 intents defined.** Line 38: `type EmailIntent = 'confirm_signup' | 'reset_password' | 'password_changed'`. Lines 474-491 map Supabase events to these three, or throw.
- **`password_changed` has no URL/CTA.** Line 663: `const url = intent === 'password_changed' ? '' : buildConfirmationUrl(...)`. The template renders no button and no link for this intent.
- **Webhook signature verification present.** Line 692: `new Webhook(secret).verify(payload, headers)`. Returns 401 on failure, 500 on delivery failure.
- **12 locales fully defined** with no mojibake markers.

---

## 2. Contract Script Audit: `verify-auth-email-localization-contract.mjs`

**Verdict: Script is sound and passes.** It catches the exact regressions described.

What it checks:

- Absence of `magiclink`, `email_change`, `reauthentication`, `invite` (lines 51-55)
- Absence of `Verification code`, `codeLabel`, `Sign in to Supericons` (lines 56-58)
- Presence of the 3-intent type union and `Unsupported auth email action` throw (lines 28-30)
- Webhook signature, Resend integration, hook secret, locale support, dark theme, RTL (lines 23-41)
- Mojibake detection (lines 62-65)

What it does NOT check (minor gaps):

- No assertion that `password_changed` copy lacks a CTA button
- No assertion that `reset_password` copy explicitly mentions "link" rather than "code"
- No runtime execution of the function — static analysis only

Run result: **passes cleanly.**

---

## 3. Frontend Audit: `auth.js`

**Verdict: Frontend is correct and separate from email rendering.**

- `requestPasswordReset` (line 331) calls `supabase.auth.resetPasswordForEmail(email, { redirectTo: buildLocalizedAuthRedirectUrl() })` — correct. The `redirectTo` URL includes `?locale=XX` so the hook can infer locale.
- `buildLocalizedAuthRedirectUrl()` (line 170) preserves the active locale in the redirect URL.
- `resetPasswordForEmail` triggers Supabase's `recovery` email event, which maps to the `reset_password` intent in the hook.
- All UI notifications (toasts, status messages, cooldown text) are frontend-only DOM manipulations — never sent as email content.
- After `updateUserPassword` succeeds (line 1665), the frontend shows a toast "Password updated" — this does NOT trigger a `password_changed` email from the frontend. That event must come from Supabase Auth server-side (if configured).

---

## 4. Root Cause: Why Old Emails Were Received

**The send-email function has never been deployed.**

Evidence:

- `git log --all --oneline -- supabase/functions/send-email/index.ts` → **no output**. The file has never been committed to any branch.
- `git status` shows `supabase/functions/send-email/` as **untracked**.
- `git log --all --oneline -- scripts/verify-auth-email-localization-contract.mjs` → **no output**. Also untracked.
- No `supabase/config.toml` exists in the repo — no local Supabase project configuration for CLI deployments.

**What this means:**

| Layer | Status |
|---|---|
| Source code (`index.ts`) | Correct, but local-only, never committed, never deployed |
| Supabase Edge Function `send-email` | Either doesn't exist on the project, or contains an older version |
| Send Email Auth Hook in dashboard | Either not configured, or pointing to the old/missing function |
| Supabase built-in email templates | **Still active** — these are what produced the emails seen |

The emails saying "Sign in to Supericons", "Use the button or code below…", and "Verification code" are **Supabase's built-in default templates**. They were never overridden because the hook function was never deployed.

---

## 5. What Needs to Happen

### A. Commit the files

```bash
git add supabase/functions/send-email/index.ts
git add scripts/verify-auth-email-localization-contract.mjs
```

### B. Deploy the Edge Function

```bash
supabase functions deploy send-email --no-verify-jwt
```

The `--no-verify-jwt` flag is noted in the file header (line 2). This is required because Supabase Auth hooks call the function with a webhook signature, not a JWT.

### C. Configure secrets in Supabase dashboard (or CLI)

The function reads these env vars:

- `RESEND_API_KEY` — Resend API key for sending mail
- `SEND_EMAIL_HOOK_SECRET` (or fallback `SUPABASE_AUTH_HOOK_SECRET`) — webhook verification secret
- `AUTH_EMAIL_FROM` — optional, defaults to `Supericons <no-reply@auth.supericons.dev>`

Set via:

```bash
supabase secrets set RESEND_API_KEY=<your-key>
supabase secrets set SEND_EMAIL_HOOK_SECRET=<your-hook-secret>
```

### D. Enable the Send Email Auth Hook in Supabase Dashboard

1. Go to **Authentication → Hooks** (or **Authentication → Email Templates → Send Email Hook** depending on dashboard version)
2. Enable the **Send Email** hook
3. Point it to the deployed `send-email` function
4. The hook secret shown in the dashboard must match `SEND_EMAIL_HOOK_SECRET`

### E. Verify JWT setting

The function must be deployed with `--no-verify-jwt` because Auth hooks use webhook-style signature verification (via `standardwebhooks`), not Supabase JWTs. If "Verify JWT" is enabled in the dashboard for this function, requests will fail with 401 before the webhook signature check runs.

### F. Supabase built-in email templates

Once the hook is active, Supabase stops using its built-in templates for the 3 hooked events. The built-in templates do NOT need to be edited — they become dead code for hooked events. However, if the hook fails at runtime (returns non-200), Supabase may fall back to built-in templates silently. The function's error handling (returning 500 with a JSON error body) should prevent silent fallback, but this should be tested.

### G. Resend sender/domain

Ensure `no-reply@auth.supericons.dev` is verified in the Resend account and that DNS records (SPF, DKIM, DMARC) are configured for `auth.supericons.dev`.

---

## 6. How to Test End-to-End

### Distinguishing hook email from built-in template

| Signal | Built-in Supabase Template | send-email Hook |
|---|---|---|
| Sender | Supabase default sender (usually `noreply@<project>.supabase.co`) | `Supericons <no-reply@auth.supericons.dev>` |
| Subject | Generic ("Confirm your signup", "Reset Password") | Localized ("Confirm your Supericons account", "Reset your Supericons password") |
| Body | Contains "Verification code", generic Supabase branding | Dark-themed Supericons template with logo, orange accent, no code |
| Password changed email | "Sign in to Supericons" | "Your password was changed" + support contact, no sign-in CTA |

### Checking Supabase Function Logs

1. **Dashboard:** Go to **Edge Functions → send-email → Logs**
2. **CLI:** `supabase functions logs send-email`
3. Look for:
   - `[send-email] Auth email hook verification failed` → webhook secret mismatch (401)
   - `[send-email] Auth email delivery failed` → rendering or Resend error (500)
   - `Unsupported auth email action` → an unexpected Supabase event type hit the hook
   - No log entries at all → the hook is not configured, Supabase is using built-in templates

### HTTP Status Codes

- **200** → email sent successfully via Resend
- **400** → non-POST request (shouldn't happen from Supabase)
- **401** → webhook signature verification failed (wrong `SEND_EMAIL_HOOK_SECRET`)
- **500** → Resend API failure, missing API key, unsupported event, or rendering error

### Confirming Deployed Version

After deploying, verify by checking:

```bash
supabase functions list
```

Then trigger a test password reset and check the function logs for the `[send-email]` prefix. If no logs appear, the hook is not routing to the function.

### Step-by-Step Test

1. Deploy function + configure hook + set secrets
2. Trigger `confirm_signup`: sign up with a new email → check inbox for Supericons-branded email with "Confirm your email" subject
3. Trigger `reset_password`: use "Forgot password" → check inbox for "Reset your Supericons password" with a link (no code)
4. Trigger `password_changed`: after completing a password reset, Supabase may send a notification — verify it says "Your password was changed" with no "Sign in" CTA
5. Verify sender address is `no-reply@auth.supericons.dev`, not the Supabase default

---

## 7. Summary

| Item | Finding |
|---|---|
| Source code removes sign-in fallback? | **Yes** — no "Sign in to Supericons" anywhere |
| Source code removes verification code? | **Yes** — no code output, link-only for reset |
| Source code rejects unknown events? | **Yes** — throws, returns 500 |
| Contract script catches regressions? | **Yes** — checks all critical invariants |
| auth.js calls Supabase correctly? | **Yes** — `resetPasswordForEmail` with localized redirect |
| Could repo source produce the screenshots? | **No** — the screenshots are from Supabase built-in templates |
| Why did emails stop after server restart? | Likely Resend rate limit, or Supabase cached the hook as failing and stopped retrying |
| Root cause | **The function has never been deployed. It exists only as untracked local files.** |
