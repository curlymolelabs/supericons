# Supabase Auth Email Production Runbook

Use this runbook when signup confirmation or password reset emails return `429 Too Many Requests`, or when preparing Supericons auth email for production.

## Verified Behavior

Supericons has two different email paths:

- Signup confirmation and password reset start inside Supabase Auth through `supabase.auth.signUp(...)`, `supabase.auth.resend(...)`, and `supabase.auth.resetPasswordForEmail(...)`.
- Password-changed notification is sent by the Supericons `notify-password-changed` Edge Function through Resend after the password update succeeds.

The localized `send-email` Edge Function is a Supabase Send Email Auth Hook. It controls rendering and delivery after Supabase Auth accepts an email-triggering request. It does not remove every Supabase Auth rate limit before the hook runs.

Supabase's default built-in email provider is intentionally limited and is not for production. Supabase documents the email-send limit for `/auth/v1/signup`, `/auth/v1/recover`, and relevant `/auth/v1/user` calls as a combined project-wide limit with the built-in provider, currently `2 emails per hour`. Supabase also documents per-user cooldowns for signup confirmation and password reset requests, usually about `60 seconds`.

Official references:

- Supabase Auth rate limits: https://supabase.com/docs/guides/auth/rate-limits
- Supabase custom SMTP: https://supabase.com/docs/guides/auth/auth-smtp
- Supabase Send Email Hook: https://supabase.com/docs/guides/auth/auth-hooks/send-email-hook
- Supabase password auth email sending: https://supabase.com/docs/guides/auth/passwords

## Production Architecture

Use both:

1. **Custom SMTP in Supabase Auth**, using a verified auth sender such as Resend SMTP.
2. **Supericons Send Email Hook**, using `supabase/functions/send-email/index.ts`, for localized branded email templates.

Custom SMTP is the provider-level production fix for the default 2/hour email bucket. The Send Email Hook is the template/localization layer. They solve different problems.

Do not build custom signup or reset-token emails outside Supabase Auth unless there is no other option. Supabase Auth should remain the source of truth for user creation, recovery tokens, verification links, sessions, and security-sensitive auth state.

## Dashboard Setup

Do not paste secret values into docs, chat, screenshots, or commits.

In Supabase:

1. Go to **Authentication > Email**.
2. Configure custom SMTP with the chosen provider.
3. Use an auth-specific sender, for example `no-reply@auth.supericons.dev`.
4. Confirm SPF, DKIM, and DMARC are configured for the sending domain.
5. Save the SMTP configuration.
6. Go to **Authentication > Rate Limits**.
7. Raise `Rate limit for sending emails` from the built-in-provider test value to a production-appropriate value.
8. Keep the per-user signup confirmation and password reset cooldowns at a user-friendly abuse-resistant value, usually around `60 seconds`.
9. Keep **Authentication > Auth Hooks > Send Email** enabled and pointed at the deployed `send-email` Edge Function.

Required Supabase Edge Function secrets by name:

- `RESEND_API_KEY`
- `SEND_EMAIL_HOOK_SECRET`
- `AUTH_EMAIL_FROM`

Required SMTP credentials are configured in the Supabase Auth Email dashboard and should not be copied into the repo.

## How To Tell Which Layer Failed

### Supabase Auth rejected the request

Evidence:

- Browser console shows `429 Too Many Requests` from `/auth/v1/signup` or `/auth/v1/recover`.
- There are no new `[send-email] Sent auth email` logs.

Meaning:

- Supabase Auth rejected the signup or recovery request before the Send Email Hook could deliver anything.
- Check custom SMTP and `rate_limit_email_sent`.

### Send Email Hook failed

Evidence:

- Browser request to Supabase Auth is not `429`, but the user gets no email.
- Edge Function logs show `[send-email] Auth email hook verification failed` or `[send-email] Auth email delivery failed`.

Meaning:

- Auth accepted the request, but the custom hook or Resend delivery failed.
- Check `SEND_EMAIL_HOOK_SECRET`, `RESEND_API_KEY`, `AUTH_EMAIL_FROM`, sender verification, and Resend logs.

### Password-changed notification failed

Evidence:

- Password update succeeds.
- No password-changed email arrives.
- `notify-password-changed` logs show an error, or there are no logs.

Meaning:

- This is separate from signup/reset. Check the deployed `notify-password-changed` function, `RESEND_API_KEY`, `AUTH_EMAIL_FROM`, and CORS/JWT settings.

## Acceptance Tests

Before testing browser flows, run the secret-safe live config verifier. It reads Supabase Auth settings through the Management API and prints only booleans, key names, and numeric limits. It does not print SMTP passwords or token values.

```bash
SUPABASE_ACCESS_TOKEN=<management-token> npm run verify:live-auth-email-config
```

If the project ref cannot be inferred from `auth.js`, also set:

```bash
SUPABASE_PROJECT_REF=<project-ref>
```

Run these after custom SMTP and hooks are configured:

1. In English, sign up with a new test email.
2. Confirm no `429` from `/auth/v1/signup`.
3. Confirm `send-email` logs show `intent: confirm_signup`.
4. Confirm the received signup email uses the Supericons localized dark template.
5. In Simplified Chinese, request password reset.
6. Confirm no `429` from `/auth/v1/recover`.
7. Confirm `send-email` logs show `intent: reset_password` and locale `zh-Hans`.
8. Confirm the reset email is localized and returns to the requesting origin.
9. Complete the reset flow.
10. Confirm `notify-password-changed` logs show the password-changed notification was sent.
11. Repeat one signup and one reset request after the previous local 60-second cooldown expires.

## Rollback

If custom SMTP causes delivery problems:

1. Do not disable the Supericons Send Email Hook first unless it is failing.
2. Check provider logs and DNS verification.
3. Lower the Auth email-send rate limit temporarily if abuse is suspected.
4. Use Google OAuth signup as the fallback account-creation path while email delivery is repaired.
