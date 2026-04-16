# Subscription `current_period_end` Sync Fix Plan

## Problem

The cancellation confirmation feature is working, but the verified test flow left `si_subscriptions.current_period_end` as `NULL`.

Observed live state after cancellation scheduling:

- cancellation email fired correctly
- `si_billing_notifications` logged `subscription_cancel_scheduled`
- `si_subscriptions.plan` normalized to `pro_monthly`
- `si_subscriptions.current_period_end` remained `NULL`

That produced fallback email copy:

- `Your subscription stays active until the end of your current billing period`

instead of a date-specific message.

## Why This Matters

This is not only an email-copy issue.

The repo currently uses `current_period_end` in several places:

- [auth.js](../../auth.js) uses it to decide whether an `active` subscription is expired for badge and `Manage Subscription` display
- [create-portal](../../supabase/functions/create-portal/index.ts) uses it to decide whether the Stripe portal should still open
- SQL logic already treats `current_period_end is null or current_period_end > now()` as eligible in some subscription-related flows

So if `current_period_end` remains null:

- date-specific cancellation emails downgrade to generic wording
- expiry-sensitive UI may stay looser than intended
- future entitlement checks can drift if they depend on null meaning "still active"

## Audit Findings

### 1. The current webhook assumes a deprecated Stripe field shape

In [stripe-webhook](../../supabase/functions/stripe-webhook/index.ts), `customer.subscription.updated` currently does:

- read `subscription.current_period_end`
- write that value into `si_subscriptions.current_period_end`

But the verified live event behaved as if that field was absent.

### 2. This likely matches Stripe's Basil-era billing-period change

Stripe's official changelog says the Basil `2025-03-31` upgrade removed subscription-level billing period fields and moved them onto subscription items.

Official source:

- [Adds subscription item-level billing periods and removes subscription-level periods](https://docs.stripe.com/changelog/basil/2025-03-31/deprecate-subscription-current-period-start-and-end)

Relevant Stripe change:

- `Subscription.current_period_end` removed
- `SubscriptionItem.current_period_end` added

That matches what we saw:

- webhook event still had enough data to update `status` and `plan`
- `current_period_end` resolved to `null`
- cancellation email therefore used fallback wording

### 3. The issue can already affect more than one path

The same assumption appears in:

- [stripe-webhook](../../supabase/functions/stripe-webhook/index.ts)
- [docs/stripe-webhook-manual-paste.ts](../stripe-webhook-manual-paste.ts)

The creation path also intentionally seeds subscription rows with `current_period_end: null` and waits for `customer.subscription.updated` to populate it later. That makes the system more sensitive to the webhook field-shape mismatch.

## Root-Cause Hypothesis

Most likely root cause:

- the Stripe webhook endpoint or account is on a Basil-era API version
- webhook payloads no longer provide `subscription.current_period_end`
- our code still reads the old top-level field

So the write path silently stores `NULL` even though the real billing-period end still exists on `subscription.items.data[*].current_period_end`

## Fix Strategy

### Phase 1. Confirm the live Stripe payload shape

In Stripe Workbench / event inspector:

1. inspect a recent `customer.subscription.updated` event
2. confirm whether:
   - `data.object.current_period_end` is absent or null
   - `data.object.items.data[0].current_period_end` is present

Done when:

- we have direct confirmation of the live payload shape

### Phase 2. Add a single helper for period-end extraction

In [stripe-webhook](../../supabase/functions/stripe-webhook/index.ts), add a helper like:

- `getSubscriptionPeriodEndIso(subscription)`

Behavior:

1. read all available `subscription.items.data[*].current_period_end` timestamps
2. if item-level values exist, use the earliest item period end
3. otherwise fall back to legacy `subscription.current_period_end`
4. return ISO string or `null`

Why "earliest":

- it best matches the old subscription-level `current_period_end` meaning
- it aligns with Stripe's mixed-interval documentation, where the subscription-level period end tracks the earliest active item period end

Official source:

- [Mixed interval subscriptions](https://docs.stripe.com/billing/subscriptions/mixed-interval)

Done when:

- period-end extraction no longer depends on a deprecated top-level field

### Phase 3. Use the helper everywhere the webhook writes subscription period end

Update these paths in [stripe-webhook](../../supabase/functions/stripe-webhook/index.ts):

1. `checkout.session.completed` for `mode === 'subscription'`
   - after retrieving the Stripe subscription
   - populate `current_period_end` immediately from the helper instead of always writing `null`

2. `customer.subscription.updated`
   - replace direct `subscription.current_period_end` usage with the helper
   - keep the cancellation-scheduled email using the same normalized value

Done when:

- a new subscription row is created with a real billing end when Stripe already provides it
- subsequent subscription updates keep the field synced

### Phase 4. Backfill existing active rows with null period ends

We already have at least one real row with:

- valid `stripe_subscription_id`
- `status = active`
- `plan = pro_monthly`
- `current_period_end = null`

Add a one-time backfill step:

1. query `si_subscriptions` for rows where:
   - `stripe_subscription_id is not null`
   - `status in ('active', 'trialing')`
   - `current_period_end is null`
2. fetch each subscription from Stripe
3. compute normalized period end with the new helper logic
4. update the row in Supabase

Implementation options:

- a one-off Node script
- a Deno admin script
- a manual admin repair for the currently affected rows if volume is tiny

Recommendation:

- use a small one-off script so the fix is repeatable and inspectable

Done when:

- active subscriptions no longer rely on null period ends unless Stripe truly provides no period end

### Phase 5. Re-verify the cancellation email copy

Repeat the same cancel-at-period-end flow after the fix.

Expected result:

- email subject still matches
- body now says a specific date, for example `Your subscription stays active until April 30, 2026`
- `si_billing_notifications.event_context.current_period_end` stores an ISO date, not `null`
- `si_subscriptions.current_period_end` is populated

Done when:

- the cancellation email uses date-specific copy

## Files Likely Touched

- [supabase/functions/stripe-webhook/index.ts](../../supabase/functions/stripe-webhook/index.ts)
- [docs/stripe-webhook-manual-paste.ts](../stripe-webhook-manual-paste.ts)
- one new one-off backfill script under `scripts/` or `supabase/` if we choose the scripted repair path

## Verification Checklist

Minimum:

1. `npm run build`
2. `npx deno check --node-modules-dir=auto supabase/functions/stripe-webhook/index.ts`
3. verify one live/test subscription row now stores `current_period_end`
4. verify one cancellation email includes the specific billing-end date

## Decision

Treat this as a small follow-up audit/fix, not as a blocker for the already working cancellation-confirmation feature.
