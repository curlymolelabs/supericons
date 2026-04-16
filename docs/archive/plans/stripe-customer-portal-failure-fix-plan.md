# Stripe Customer Portal Failure Fix Plan

Last updated: April 14, 2026

## Problem

On live `supericons.dev`, a signed-in Pro user can click `Manage Subscription` and still get the toast `Portal unavailable`.

This is no longer explainable only by deleted legacy test users:
- the legacy guard experiment was reverted from the frontend
- the live backend `create-portal` function was hardened and redeployed
- a current live user still reproduces the failure

So the remaining issue is a real customer-portal launch gap, not just stale old data.

## What The Audit Found

### 1. The portal flow has four runtime dependencies

The app-side entry point is [auth.js](../../auth.js), where `openCustomerPortal()`:
- reads the current Supabase session
- calls `POST /functions/v1/create-portal`
- expects JSON `{ url }`
- redirects the browser to Stripe

The backend entry point is [supabase/functions/create-portal/index.ts](../../supabase/functions/create-portal/index.ts), where the function:
- authenticates the caller with the Supabase access token
- reads `si_subscriptions` for the current user
- expects an active subscription row
- expects `stripe_customer_id` or a recoverable `stripe_subscription_id`
- creates a Stripe Billing Portal session via `stripe.billingPortal.sessions.create(...)`

That means the live flow only works if all of these are true at once:
1. the browser has a valid Supabase session token
2. `si_subscriptions` has the right row for the signed-in user
3. the row maps correctly to live Stripe IDs
4. the live Stripe account has customer-portal configuration that can create sessions

### 2. The frontend was previously hiding the real backend failure

Before the current hardening, `openCustomerPortal()` threw `Portal unavailable` for every non-`200` response, which collapsed all failure modes into one generic toast.

That made these very different cases look identical:
- stale or expired auth session
- no matching subscription row
- missing Stripe customer ID
- inactive or expired subscription row
- Stripe-side portal configuration failure
- non-JSON platform/runtime response

The current local/frontend code now retries once on `401` and surfaces JSON error bodies when available, but the live symptom still looks generic. That strongly suggests at least one of these is still true:
- the live frontend bundle is still not exposing the real JSON error
- the response body is not JSON
- the request is failing before our handler returns its JSON error shape

### 3. `create-portal` still relies on Stripe account state we have not directly proven

The code assumes the live Stripe account can create billing portal sessions without passing an explicit configuration ID.

That is only safe if:
- the live Stripe account has Billing Portal enabled
- the live default portal configuration exists
- the account mode and secret key match the subscription/customer being used

We have live payment proof, but we do not yet have live portal-session proof.

### 4. Subscription data can still be correct enough for Pro access but wrong for portal access

The app shows `Manage Subscription` when `subscriptionStatus === 'active'` from [auth.js](../../auth.js).

That status comes from:
- `status`
- `current_period_end`

It does **not** prove:
- `stripe_customer_id` exists
- `stripe_subscription_id` exists
- those IDs refer to live Stripe objects
- those objects are in the same mode as the configured Stripe secret key

So a user can be "active Pro" in the app while the portal still fails.

### 5. The webhook is the main source of Stripe linkage, but we have not proven its portal-specific result

[supabase/functions/stripe-webhook/index.ts](../../supabase/functions/stripe-webhook/index.ts) upserts:
- `stripe_subscription_id`
- `stripe_customer_id`
- `status`
- `plan`

This is the intended source of truth for portal access.

But we still lack an end-to-end proof that a live subscription:
- reached the webhook
- wrote the correct IDs
- can immediately open the billing portal

### 6. The current backend hardening is good but still not enough for diagnosis

The live `create-portal` function now:
- loads `stripe_customer_id`, `stripe_subscription_id`, `status`, and `current_period_end`
- rejects missing/inactive subscription records with clearer JSON messages
- backfills `stripe_customer_id` from Stripe when only `stripe_subscription_id` exists

This improves resilience, but we still do not have:
- portal-specific structured error codes
- a quick operator script to test portal creation for a live authenticated user
- captured logs from the failing live click path

## Most Likely Root Cause Buckets

Order these from most to least likely based on the current evidence.

### A. Live Stripe portal configuration is incomplete or not usable

This is now a top-tier hypothesis because:
- live checkout was proven
- current users still fail
- the backend assumes default Stripe portal configuration exists
- a Stripe-side configuration failure can still produce a backend error even with correct subscription IDs

Examples:
- customer portal not enabled in live mode
- no default portal configuration in live mode
- live secret key mismatch with the customer/subscription objects

### B. `si_subscriptions` rows are active but missing valid live Stripe linkage

This is still plausible for newly created users if:
- checkout completed but the webhook did not write the row correctly
- the row was created manually or backfilled incompletely
- the row points to stale or cross-mode Stripe IDs

### C. The live frontend is still not surfacing the real backend error

If the user still sees exactly `Portal unavailable` after redeploy, then one of these may be true:
- the fresh frontend bundle was not actually the one tested
- the response body is not JSON
- the request is failing at a layer outside our app JSON contract

### D. Session/auth mismatch during the portal click

Less likely now, but still possible:
- stale session token
- token refresh fails
- Supabase function receives an auth state different from what the UI thinks

The current frontend retry makes this less likely than the Stripe/data hypotheses.

## Fix Strategy

Do not guess. Prove each layer in order.

### Phase 1. Capture the exact live failing error

Goal:
- stop treating `Portal unavailable` as a diagnosis

Actions:
1. Reproduce the click with browser devtools open.
2. Inspect the network request to `POST /functions/v1/create-portal`.
3. Record:
   - response status
   - response headers
   - raw response body
4. If the body is JSON, record the exact `error` message.
5. If the body is not JSON, record whether it is Supabase platform text, an HTML error page, or an empty response.

Done when:
- we know the exact runtime error string or exact non-JSON failure shape for the live click

### Phase 2. Verify the signed-in user’s subscription linkage in Supabase

Goal:
- prove whether the live app row is portal-capable

Actions:
1. In Supabase, inspect the failing user’s row in `si_subscriptions`.
2. Record:
   - `status`
   - `current_period_end`
   - `plan`
   - `stripe_subscription_id`
   - `stripe_customer_id`
3. Confirm:
   - `status = active`
   - `current_period_end` is null or in the future
   - both Stripe IDs point to the same real live subscriber
4. If either Stripe ID is missing, determine whether the webhook ever wrote it.

Done when:
- we know whether the row itself is valid, incomplete, or mismatched

### Phase 3. Verify the live Stripe objects and portal configuration

Goal:
- prove whether Stripe can create the billing portal session for this user

Actions:
1. In the live Stripe dashboard, open the customer and subscription referenced by Supabase.
2. Confirm:
   - the customer exists
   - the subscription exists
   - the subscription is active
   - the subscription belongs to the same live account as `STRIPE_SECRET_KEY`
3. Open Stripe Billing Portal settings in live mode.
4. Confirm:
   - billing portal is enabled
   - a default configuration exists
   - cancellations, payment-method updates, and plan switching are configured as intended

Done when:
- Stripe-side configuration is either proven healthy or clearly identified as the blocker

### Phase 4. Audit webhook integrity for subscriptions

Goal:
- verify that checkout-to-webhook-to-subscription-row is complete for live subscribers

Actions:
1. Inspect the live webhook events for the failing user’s subscription purchase.
2. Confirm `checkout.session.completed` and `customer.subscription.updated` were received successfully.
3. Verify the event timeline matches what [stripe-webhook/index.ts](../../supabase/functions/stripe-webhook/index.ts) expects.
4. If needed, compare the event payload’s customer/subscription IDs against the current `si_subscriptions` row.

Done when:
- we know whether the data problem is upstream at webhook ingestion or downstream at portal creation

### Phase 5. Add permanent portal diagnostics

Goal:
- make this class of bug cheap to diagnose next time

Actions:
1. Return explicit structured error codes from `create-portal`, for example:
   - `portal_no_subscription_row`
   - `portal_subscription_inactive`
   - `portal_missing_customer_id`
   - `portal_stripe_configuration_error`
2. Log the failure bucket server-side with enough context to debug safely:
   - user id
   - whether subscription row exists
   - whether customer/subscription IDs exist
   - Stripe error type/code
3. Add a small operator verification script or manual checklist for:
   - checkout
   - webhook
   - portal open/return

Done when:
- portal failures are immediately attributable without guesswork

### Phase 6. Decide whether portal availability needs a stronger UI contract

Goal:
- avoid offering a portal action that cannot succeed

Actions:
1. Revisit the reverted frontend guard only after Phase 1-4 prove the real source of failure.
2. If legacy or manually-managed Pro users still exist in production, decide whether:
   - they should see no portal button
   - they should see a different support path
   - they should be migrated into Stripe-managed subscriptions
3. Only reintroduce UI gating if it matches the real billing model, not just a guessed heuristic.

Done when:
- the UI contract matches the actual billing ownership model

## Recommended Order Of Execution

1. Capture the exact live `create-portal` response in browser devtools.
2. Inspect the failing user’s `si_subscriptions` row in Supabase.
3. Verify the same user’s live customer/subscription and Billing Portal configuration in Stripe.
4. Cross-check the webhook event history for that subscription.
5. Only then decide whether the fix is:
   - Stripe dashboard configuration
   - missing webhook/backfill logic
   - better portal diagnostics
   - UI gating

## What We Already Changed

These changes are already in place and should not be re-audited from scratch:
- [auth.js](../../auth.js): portal request now retries once after a `401`
- [auth.js](../../auth.js): frontend now attempts to surface JSON error messages instead of collapsing every failure into the same generic string
- [create-portal/index.ts](../../supabase/functions/create-portal/index.ts): backend now validates active subscription state more explicitly
- [create-portal/index.ts](../../supabase/functions/create-portal/index.ts): backend now backfills `stripe_customer_id` from Stripe when only `stripe_subscription_id` exists
- the updated `create-portal` function has already been redeployed live

## Success Criteria

This issue is fixed when:
- a live Stripe-backed Pro user can click `Manage Subscription` and land in Stripe Billing Portal
- the portal can return back to `supericons.dev` correctly
- the app no longer hides the real cause when portal creation fails
- the launch tracker contains explicit proof that portal open/return has been verified live
