# Stripe Webhook 401 Recovery Handoff

Date: 2026-07-05  
Project: Supericons  
Endpoint: `https://kcjmkakdhsqplvasgkjv.supabase.co/functions/v1/stripe-webhook`

## Summary

Stripe reported repeated live-mode delivery failures for the Supericons webhook endpoint. The failures were HTTP `401` responses from Supabase, not Stripe payment failures.

The issue has been resolved at the Supabase function gateway level. The `stripe-webhook` function now receives requests again, failed Stripe webhook deliveries for the two unique affected event IDs were replayed, and the subscription row was checked by the owner.

No customer was charged again by the replay. Stripe's resend action only sends the event notification again.

## Final Status

Resolved:

- Supabase JWT verification was turned off for the `stripe-webhook` Edge Function.
- A direct unsigned POST now reaches the function and returns `400 {"error":"Invalid signature"}`, which is the expected response for a non-Stripe request.
- The owner resent the two unique failed Stripe events:
  - `customer.subscription.updated`
  - `invoice.paid`
- The owner confirmed both unique event deliveries recovered with `200 OK`.
- The owner confirmed the affected `si_subscriptions` row is now OK.

Still recommended:

- Run `npm run verify:stripe-webhook-gateway` after future `stripe-webhook` deploys.
- Run the new Agentic Motion pack purchase test only after this recovered webhook state.

## What Happened

Stripe sent an email warning that live webhook deliveries to the Supericons Supabase endpoint had been failing since 2026-07-02. The Stripe dashboard showed repeated `401 ERR` delivery attempts for subscription-related events.

The failing response body shown by Stripe was:

```json
{
  "code": "UNAUTHORIZED_NO_AUTH_HEADER",
  "message": "Missing authorization header"
}
```

That response is from the Supabase gateway. It means the request was blocked before the `stripe-webhook` function code ran.

## Root Cause

The Supabase Edge Function setting **Verify JWT with legacy secret** was enabled for `stripe-webhook`.

Stripe webhook requests do not send a Supabase JWT in the `Authorization` header. They use Stripe's `stripe-signature` header instead. The Supericons webhook code validates that Stripe signature inside the function with `STRIPE_WEBHOOK_SECRET`.

Because Supabase JWT verification was enabled, Supabase rejected Stripe's requests before the function could validate the Stripe signature.

## Evidence

Directly verified before the fix:

- POSTing to the live webhook without a Supabase `Authorization` header returned HTTP `401`.
- The response included `sb-error-code: UNAUTHORIZED_NO_AUTH_HEADER`.
- The body was `{"code":"UNAUTHORIZED_NO_AUTH_HEADER","message":"Missing authorization header"}`.

Directly verified after the fix:

- POSTing the same unsigned request returned HTTP `400`.
- The body was `{"error":"Invalid signature"}`.
- This proves the request now reaches the function and is rejected by the function's Stripe signature validation, which is expected for a non-Stripe request.

Code checked:

- `supabase/functions/stripe-webhook/index.ts` has no `401` response path after the handler starts.
- Bad Stripe signatures return `400`.
- Successfully processed or ignored events return `200 {"received": true}`.
- Unexpected handler errors return `500`.
- `deno check --node-modules-dir=auto supabase/functions/stripe-webhook/index.ts` passed in this session.

User-confirmed in Stripe and Supabase UI:

- The unique `customer.subscription.updated` event was resent and recovered with `200 OK`.
- The unique `invoice.paid` event was resent and recovered with `200 OK`.
- The relevant subscription database row is OK after replay.

## Code Behavior

Important handler paths:

- `checkout.session.completed`
  - Writes `si_purchases` for one-time pack purchases.
  - Writes `si_subscriptions` for subscription checkouts.
  - Sends purchase or subscription emails when appropriate.

- `customer.subscription.updated`
  - Updates `si_subscriptions.status`, `plan`, and `current_period_end`.
  - Only sends an email if `cancel_at_period_end` changed to `true`.

- `customer.subscription.deleted`
  - Marks the subscription canceled.
  - Sends a subscription-ended email with duplicate prevention.

- `invoice.paid`
  - Not handled explicitly.
  - Falls through to the default path and returns `200 {"received": true}`.

This means replaying the affected `invoice.paid` event was safe and only cleared Stripe's failed delivery state.

## Duplicate Replay Guidance

Stripe's Event deliveries list may show multiple red rows for the same event because Stripe retried the same Event ID several times.

Do not resend every red row blindly. Instead:

1. Click a red delivery row.
2. Compare the Event ID on the right.
3. Resend each unique Event ID only once.
4. Skip old failed attempts if the same Event ID already has a newer green `200 OK / Recovered` delivery.

For this incident, the owner identified only two unique failed Event IDs:

- one `customer.subscription.updated`
- one `invoice.paid`

Both have been recovered.

## Impact

Confirmed impact:

- Stripe payments and API operations could still succeed.
- Webhook delivery to Supabase failed while JWT verification was enabled.
- Subscription state in `si_subscriptions` could become stale until the `customer.subscription.updated` event was replayed.

Risk if not fixed:

- Future `checkout.session.completed` events would fail to reach Supericons.
- Customers could pay successfully but not receive their purchase entitlement in `si_purchases`.
- Subscription status and period-end fields could become stale.

Current state after recovery:

- Webhook gateway access is fixed.
- The two unique failed events were replayed.
- The subscription row was checked by the owner and is OK.

## Action Taken

1. The owner opened Supabase Edge Functions settings for `stripe-webhook`.
2. The owner turned off **Verify JWT with legacy secret**.
3. A direct unsigned POST was run against the live endpoint.
4. The response changed from Supabase `401` to function-level `400 Invalid signature`.
5. The owner resent the unique failed `customer.subscription.updated` event in Stripe.
6. The event recovered with `200 OK`.
7. The owner resent the unique failed `invoice.paid` event in Stripe.
8. The event recovered with `200 OK`.
9. The owner confirmed the relevant Supabase subscription row is OK.
10. `supabase/config.toml` was added with `verify_jwt = false` for `stripe-webhook` only.
11. `npm run verify:stripe-webhook-gateway` was added and verified against the live endpoint.

## Recommended Follow-Up

### 1. Supabase Config Guard

Implemented in `supabase/config.toml`:

```toml
[functions.stripe-webhook]
verify_jwt = false
```

This prevents future CLI deploys from accidentally re-enabling Supabase JWT verification for this webhook.

### 2. Post-Deploy Smoke Test

Implemented as `npm run verify:stripe-webhook-gateway`.

After any deploy of `stripe-webhook`, run:

```text
npm run verify:stripe-webhook-gateway
```

Expected result:

```text
HTTP 400
{"error":"Invalid signature"}
```

Bad result:

```text
HTTP 401
UNAUTHORIZED_NO_AUTH_HEADER
```

The bad result means Supabase JWT verification is blocking Stripe again.

### 3. Test Agentic Motion Purchase Flow

The new Agentic Motion pack should be tested now that the webhook is recovered.

Suggested flow:

1. Make sure the Agentic Motion `si_products` row is active for the test.
2. Start a live checkout test from the app.
3. Complete payment.
4. Confirm `checkout.session.completed` reaches Stripe webhook deliveries with `200`.
5. Confirm `si_purchases` has the new entitlement.
6. Confirm the app shows owned state and can serve the premium asset.
7. Refund the test charge if appropriate.

### 4. Decide Whether to Handle `invoice.paid`

Currently, `invoice.paid` is not explicitly handled. That is acceptable for this recovery because subscription state is updated by `customer.subscription.updated`.

If the product later needs invoice-specific behavior, add an explicit `invoice.paid` case with idempotency protection.

## Files to Review

- `supabase/functions/stripe-webhook/index.ts`
- `supabase/functions/create-checkout/index.ts`
- `auth.js`
- `store.js`
- optional follow-up: `supabase/config.toml`

## Notes for the Next Agent

- Do not treat old red Stripe rows as still broken without comparing Event IDs.
- A green recovered delivery for the same Event ID is enough.
- Do not re-enable Supabase JWT verification on `stripe-webhook`.
- The webhook should rely on Stripe signature verification, not Supabase JWT verification.
- No sensitive customer identifiers are included in this handoff.
