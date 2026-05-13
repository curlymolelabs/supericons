# Checkout And Auth Email Localization Plan

Date: 2026-05-11

## Goal

Make paid checkout and auth emails follow the selected Supericons language as far as the underlying services allow.

This covers:

- Stripe Checkout chrome, including payment form labels.
- Stripe Checkout product summary on the left side.
- Supabase Auth redirects for signup, resend confirmation, password reset, and Google sign-in.
- Supabase Auth emails through a deployable Send Email Auth Hook.

## Verified Constraints

- Stripe Checkout has a `locale` setting for the hosted checkout UI. If omitted or set to `auto`, Stripe uses the browser locale.
- Stripe Checkout product names and descriptions come from the product or inline line-item data we send. Stripe does not translate our product copy for us.
- Supabase Auth supports a Send Email Hook that replaces built-in email sending and can add internationalization or custom logic.
- Supabase Send Email Hook payloads include `email_data.email_action_type`, token fields, `redirect_to`, and `site_url`.
- For secure email change, Supabase can send two token/hash pairs, and the hook must send two emails with the correct token/hash mapping.

Sources:

- Stripe Checkout Session API: https://docs.stripe.com/api/checkout/sessions/create
- Supabase Send Email Hook: https://supabase.com/docs/guides/auth/auth-hooks/send-email-hook
- Supabase Email Templates: https://supabase.com/docs/guides/auth/auth-email-templates

## Implementation Plan

1. Preserve app locale in auth flows.
   - Build one localized redirect URL helper in `auth.js`.
   - Use it for signup confirmation, resend confirmation, password reset, and Google sign-in.
   - Keep English behavior unchanged when no locale is selected.

2. Localize Stripe Checkout right panel.
   - Continue passing Stripe's supported `locale` code from the selected app locale.
   - Keep existing success and cancel URLs locale-aware.

3. Localize Stripe Checkout left panel.
   - Replace direct `line_items.price` usage with inline `line_items.price_data`.
   - Retrieve the trusted Stripe price server-side.
   - Copy the amount, currency, and recurring interval into inline price data.
   - Supply localized `product_data.name` and `product_data.description`.
   - Validate product-price pairing for single packs before creating Checkout.
   - Keep metadata with `user_id`, `product_id`, and app `locale`.

4. Add localized auth email support.
   - Add a Supabase `send-email` Edge Function using the official Send Email Hook pattern.
   - Verify Supabase webhook signatures using the hook secret.
   - Send via Resend using existing email delivery infrastructure.
   - Support signup, invite, magic link, recovery, email change, and reauthentication.
   - Infer locale from the localized auth redirect URL, with metadata fallback.
   - Use RTL rendering for Arabic.
   - Handle secure email-change two-email behavior.

5. Add verification.
   - Extend the Stripe checkout locale contract test so it checks frontend locale requests and Edge Function source contract.
   - Add an auth email localization contract test for redirect usage, Send Email Hook coverage, all locales, actions, and obvious mojibake markers.

6. Deployment notes.
   - Deploy `create-checkout` after checkout changes.
   - Deploy `send-email` with `--no-verify-jwt`.
   - Configure Supabase Auth Hooks > Send Email to point at the deployed `send-email` function.
   - Set `RESEND_API_KEY`, `SEND_EMAIL_HOOK_SECRET`, and optionally `AUTH_EMAIL_FROM`.
   - If the hook is not enabled, built-in Supabase emails can still redirect back with locale, but the email body itself remains controlled by Supabase templates.

## Acceptance Checks

- `npm run verify:stripe-checkout-locale-contract`
- `npm run verify:auth-email-localization-contract`
- `npm run verify:logged-in-stripe-localization`
- `npm run build`

## Residual Risk

- The Send Email Hook must be enabled in Supabase Dashboard before localized auth emails are live.
- The hook uses automated localized copy. Legal/security email wording should stay short and operational to avoid overpromising.
- Stripe receipts, invoices, and portal emails may still use Stripe account/product settings unless separately configured in Stripe.
