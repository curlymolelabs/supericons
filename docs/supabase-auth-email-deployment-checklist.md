# Supabase Auth Email Deployment Checklist

Use this after any change to `supabase/functions/send-email/index.ts` or `supabase/functions/notify-password-changed/index.ts`.

`notify-password-changed` is intentionally self-contained so it can be deployed from the Supabase browser editor. Do not add imports from sibling function folders such as `../send-email/index.ts`; the browser deploy bundler will not include those files.

For production signup and password reset email capacity, also follow `docs/supabase-auth-email-production-runbook.md`. The Send Email Hook controls Supericons email rendering and delivery, but Supabase Auth can still reject `/auth/v1/signup` and `/auth/v1/recover` before the hook runs when the default built-in email provider rate limit is exhausted.

## What Must Be Deployed

Restarting the local Vite server does not update Supabase Edge Functions. After changing the auth email hook, deploy:

```bash
supabase functions deploy send-email --no-verify-jwt
supabase functions deploy notify-password-changed --no-verify-jwt
```

The deployed email must include this version marker in the HTML source:

```text
supericons-auth-email-v2-link-only-2026-05-12
```

## Secret-Safe Dashboard Checks

Do not copy, print, or share secret values.

Check only that these are configured:

- `RESEND_API_KEY`
- `SEND_EMAIL_HOOK_SECRET`
- `AUTH_EMAIL_FROM`

Check the Supabase Auth email provider:

- Authentication > Email has custom SMTP configured for production.
- The SMTP sender domain is verified with SPF, DKIM, and DMARC.
- Authentication > Rate Limits has `Rate limit for sending emails` raised from the default built-in-provider test value.
- Signup confirmation and password reset per-user cooldowns remain enabled, usually around 60 seconds.

Optional secret-safe live check:

```bash
SUPABASE_ACCESS_TOKEN=<management-token> npm run verify:live-auth-email-config
```

This prints configuration booleans and rate-limit numbers only; it does not print SMTP passwords or token values.

Check the Supabase dashboard:

- Authentication > Auth Hooks has the Send Email hook enabled.
- The Send Email hook points to the `send-email` Edge Function HTTPS URL.
- The hook secret matches `SEND_EMAIL_HOOK_SECRET`.
- Redirect URLs include the exact local origin `http://localhost:5173`.
- For more reliable local/dev testing, also add `http://localhost:5173/**` so locale query strings and future callback paths do not fall back to the Site URL.
- Edge Functions > `send-email` has Verify JWT turned off.
- Edge Functions > `notify-password-changed` has Verify JWT turned off so browser CORS preflight can reach the function. The function still verifies the signed-in user inside the function with `supabase.auth.getUser()` before sending mail.

## Runtime Evidence

After deployment, trigger one password reset and check:

- Edge Function logs show `[send-email] Sent auth email`.
- The log metadata includes `templateVersion: supericons-auth-email-v2-link-only-2026-05-12`.
- The log metadata includes `redirectOrigin`. For local reset tests this should be `http://localhost:5173`.
- If the reset email was requested from `http://localhost:5173`, the received reset link should verify through Supabase and then return to `http://localhost:5173`, not `https://supericons.dev`.
- The received email source contains `supericons-auth-email-v2-link-only-2026-05-12`.
- The received reset email has the dark Supericons layout.
- The received reset email does not contain `Verification code`.
- The received reset email does not contain `code below`.

If there are no `send-email` logs after triggering a reset email, Supabase is not routing that email through the hook.

If the browser shows `429 Too Many Requests` from `/auth/v1/signup` or `/auth/v1/recover` before any `send-email` log appears, Supabase Auth rejected the request before the hook could send mail. Check custom SMTP and `rate_limit_email_sent`.

After changing a password in the app, check:

- Edge Function logs show `[notify-password-changed] Sent password change email`.
- The received password-changed email source contains `supericons-auth-email-v2-link-only-2026-05-12`.
- The received password-changed email does not mention a sign-in action.
- The received password-changed email does not contain the removed Curly Mole Labs security footer.

## Expected Password Reset Cooldown

Supabase limits repeated password reset requests for the same user. The app shows a 60-second local countdown after requesting a reset email. During that countdown, the account modal button should say:

```text
Send another reset email in {seconds}s
```

It should not say `Resend confirmation` in the password reset flow.
