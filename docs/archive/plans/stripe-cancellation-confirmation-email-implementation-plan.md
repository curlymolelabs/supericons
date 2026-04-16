# Stripe Cancellation Confirmation Email Implementation Plan

Last updated: April 14, 2026

## Goal

When a user cancels a Supericons Pro subscription through Stripe-managed billing, send a clear confirmation email from Supericons.

Priority:
- primary: UX clarity and trust
- secondary: compliance support

The user should never be left wondering whether the cancellation "went through."

## What Exists Today

Current behavior in [stripe-webhook/index.ts](../../supabase/functions/stripe-webhook/index.ts):
- purchase confirmation emails are already sent through Resend
- Pro activation emails are already sent through Resend
- `customer.subscription.updated` updates `si_subscriptions`
- `customer.subscription.deleted` updates `si_subscriptions`
- no cancellation confirmation email is sent today

Current email infrastructure already available:
- `RESEND_API_KEY`
- `PURCHASE_EMAIL_FROM`
- `PURCHASE_EMAIL_REPLY_TO`
- shared HTML/text email generation pattern in `stripe-webhook`

So this is not a greenfield email project. It is an extension of an existing webhook email system.

## Product Decision

Treat cancellation as two distinct user-visible moments:

1. `Cancellation scheduled`
- the user clicks cancel in Stripe
- access remains active until the period end
- email should fire immediately to confirm the cancellation request was accepted

2. `Subscription ended`
- the subscription actually ends
- email can optionally fire to confirm Pro has ended

For UX, the first email is the important one.

If we only send on `customer.subscription.deleted`, the confirmation can be delayed until the end of the billing period, which is too late for the user reassurance we want.

## Recommended Behavior

### Minimum launch-safe behavior

Send a cancellation confirmation email when Stripe reports that the subscription is set to cancel.

That means:
- listen on `customer.subscription.updated`
- detect the transition where `cancel_at_period_end` becomes `true`
- send one email immediately

### Recommended full behavior

Handle both stages:

1. `customer.subscription.updated`
- if `cancel_at_period_end` changes from `false` to `true`
- send `Your cancellation is scheduled`

2. `customer.subscription.deleted`
- send `Your subscription has ended`

Optional later:
- if `cancel_at_period_end` flips back to `false`, send `Your subscription stays active`

## Why `subscription.updated` Is Required

If the Stripe portal is configured for cancellation at period end, the user action does not mean "subscription deleted now."

The immediate user action usually means:
- the subscription remains active for the rest of the paid period
- Stripe marks it to end later
- `customer.subscription.updated` reflects that state change first

So the UX-confirmation email belongs on `subscription.updated`, not only on `subscription.deleted`.

## Scope

### In scope

- extend [stripe-webhook/index.ts](../../supabase/functions/stripe-webhook/index.ts)
- add billing-email builders for cancellation states
- send cancellation confirmation through Resend
- prevent duplicate sends from repeated webhook deliveries
- verify live behavior against the Stripe portal flow

### Out of scope

- redesigning the Stripe portal
- building a full notification-preferences system
- rewriting the purchase email system
- legal copy review beyond basic product sanity

## Implementation Plan

### Phase 1. Extract email sending into a more generic billing-email layer

Problem:
- the current helper names are purchase-oriented
- cancellation is a different lifecycle event

Changes:
- rename or generalize `sendPurchaseConfirmationEmail(...)` into something like `sendBillingEmail(...)`
- keep the same Resend transport and env vars
- preserve the current purchase and activation email behavior exactly

Why:
- cancellation emails should share the same sender, reply-to, and HTML shell
- we should not duplicate email transport code inside the webhook

Done when:
- purchase, activation, and cancellation emails can all use one shared sender helper

### Phase 2. Add dedicated cancellation email builders

Add two new email builders in `stripe-webhook`:

1. `buildCancellationScheduledEmail(...)`
- subject example: `Your Supericons Pro cancellation is scheduled`
- body should say:
  - cancellation was received
  - access remains active until the billing period ends
  - where to manage billing if needed
  - where to contact support

2. `buildSubscriptionEndedEmail(...)`
- subject example: `Your Supericons Pro subscription has ended`
- body should say:
  - Pro access has ended
  - free icons remain available
  - how to rejoin if wanted

Recommended content tone:
- clear
- calm
- no guilt or churn language
- no legalese

CTA recommendation:
- scheduled email: `Manage account`
- ended email: `Open Supericons`

Done when:
- both email states have HTML and text templates consistent with the existing purchase emails

### Phase 3. Detect cancellation scheduling correctly

Add logic in `customer.subscription.updated`:

1. load the existing `si_subscriptions` row before updating
2. inspect Stripe subscription fields relevant to cancellation:
   - `cancel_at_period_end`
   - `cancel_at`
   - `status`
   - `current_period_end`
3. update the local row as today
4. send the scheduled-cancellation email only when:
   - the Stripe subscription says `cancel_at_period_end === true`
   - and the idempotency layer has not already recorded that cancellation notice

Important:
- Stripe retries webhook events
- multiple `subscription.updated` events can fire for the same subscription
- the email must fire only once per scheduling action

Implementation clarification:
- the current `si_subscriptions` schema does **not** store `cancel_at_period_end`
- because of that, we should not depend on local-row diffing as the main duplicate guard
- for the first implementation, treat the notification log as the source of truth for "have we already sent this cancellation-scheduled notice?"
- only add `cancel_at_period_end` to `si_subscriptions` later if we decide we need richer in-app billing state, not just email idempotency
- Stripe's `customer.subscription.updated` event includes `previous_attributes`, so the handler should short-circuit unless `cancel_at_period_end` actually changed in that event before it even attempts the idempotency insert

Done when:
- clicking cancel in Stripe produces one immediate confirmation email

### Phase 4. Add duplicate-send protection

This is the key reliability requirement.

We should not rely on "it probably only happens once."

Recommended options:

#### Option A. New notification log table

Create a small table like `si_billing_notifications` with:
- `id`
- `user_id`
- `stripe_subscription_id`
- `event_kind`
- `stripe_event_id`
- `sent_at`

Suggested unique constraints:
- unique on `stripe_event_id`
- optionally unique on (`stripe_subscription_id`, `event_kind`, `cancel_at_timestamp`) for scheduled cancellations

Why this is the best option:
- explicit
- easy to inspect
- safe against webhook retries
- future-proof for other billing emails

#### Option B. Reuse existing subscription row fields

Add columns on `si_subscriptions` like:
- `cancel_scheduled_email_sent_at`
- `subscription_ended_email_sent_at`

Why this is smaller:
- fewer moving parts

Why it is weaker:
- harder to support repeated cancellation / uncancel / recancel cycles cleanly
- less general for future billing notifications

Recommendation:
- use Option A as the primary and explicit launch path

Implementation clarification:
- for this feature, Option A should be treated as the main idempotency mechanism, not an optional enhancement
- the simplest safe rule is:
  - insert a `si_billing_notifications` row keyed by `stripe_event_id`
  - only send the email if that insert succeeds
  - if the insert conflicts, skip sending because Stripe is retrying or the event was already processed
- this avoids adding `cancel_at_period_end` persistence to `si_subscriptions` just to support cancellation-email diffing

Done when:
- duplicate Stripe deliveries do not create duplicate emails

### Phase 5. Handle actual subscription end

In `customer.subscription.deleted`:
- keep the existing `status: 'canceled'` update
- look up the existing `si_subscriptions` row by `stripe_subscription_id`
- use that row to recover `user_id`
- resolve the email via `supabase.auth.admin.getUserById(userId)`
- send `buildSubscriptionEndedEmail(...)`
- protect it with the same idempotency layer

Do the same lookup pattern for `customer.subscription.updated` when sending the scheduled-cancellation email:
- use `subscription.id` to load the `si_subscriptions` row
- read `user_id` from that row
- resolve the email from Supabase Auth

Implementation note:
- the current purchase helper `resolveUserEmail(...)` is session-oriented because `checkout.session.completed` carries more direct email context
- cancellation handlers need a separate helper for subscription lifecycle events, for example `resolveSubscriptionUserEmail(...)`
- that helper should accept `stripe_subscription_id` or `user_id`, not a Stripe Checkout Session

Why still do this:
- it completes the lifecycle
- it helps users understand when access actually ended
- it gives us a reliable end-state email even if they ignored the earlier one

Done when:
- an actual ended subscription also gets a clean confirmation email once

### Phase 6. Decide reactivation behavior

Optional but recommended:
- if `customer.subscription.updated` shows `cancel_at_period_end` changed from `true` to `false`
- send a short `Your subscription remains active` email

This is not required for the first implementation.

Default recommendation:
- leave this out of the first patch
- revisit after scheduled/end emails are proven stable

## Data / State Design

### Existing source of truth

Current subscription row:
- `user_id`
- `stripe_subscription_id`
- `stripe_customer_id`
- `status`
- `plan`
- `current_period_end`

### Proposed notification state

Preferred:
- new `si_billing_notifications` table

Minimal example:
- `user_id uuid not null references auth.users(id) on delete cascade`
- `stripe_subscription_id text not null`
- `stripe_event_id text unique not null`
- `event_kind text not null`
- `event_context jsonb`
- `sent_at timestamptz not null default now()`

Suggested `event_kind` values:
- `subscription_cancel_scheduled`
- `subscription_ended`

## UX Copy Direction

### Cancellation scheduled

User should understand:
- the cancellation succeeded
- Pro remains active until a specific date
- they do not need to do anything else

Example message shape:
- `Your Supericons Pro cancellation is scheduled`
- `Your subscription will stay active until April 30, 2026. After that, Pro billing will stop and your account will return to the free experience.`

### Subscription ended

User should understand:
- Pro access is no longer active
- the account still exists
- they can subscribe again whenever they want

Example message shape:
- `Your Supericons Pro subscription has ended`
- `Your account is still available and free icons remain accessible. If you want Pro again, you can resubscribe anytime.`

## Verification Plan

### Local / code-level checks

- `node --check` does not apply directly to the Deno function, so use the project build plus careful code review
- run `npm run build`

### Stripe event verification

Use Stripe test mode first:

1. create a test subscription
2. cancel it from the Stripe portal with `cancel at period end`
3. confirm:
   - `customer.subscription.updated` arrives
   - one scheduled-cancellation email is sent
   - no duplicate email is sent on webhook retry

Then test actual end:
4. advance or end the test subscription
5. confirm:
   - `customer.subscription.deleted` arrives
   - one ended email is sent

### Live verification

After test-mode proof:

1. use a live internal test subscription
2. cancel via the same Stripe portal your users see
3. confirm:
   - the scheduled cancellation email arrives promptly
   - sender and reply-to are correct
   - links return to `supericons.dev`

## Rollout Notes

Deploy requirement:
- `stripe-webhook` is already live and operational, so this should be a narrow function update

Operational note:
- if Resend is down or `RESEND_API_KEY` is missing, webhook handling must still succeed
- email send failure should log clearly but must not block subscription-state updates

## Recommended Build Order

1. generalize the current email transport helper
2. add cancellation email templates
3. write and deploy the `si_billing_notifications` migration
4. add idempotency persistence wired to that table
5. wire `customer.subscription.updated`
6. wire `customer.subscription.deleted`
7. test in Stripe test mode
8. verify once in live mode

## Success Criteria

This work is complete when:
- canceling in Stripe triggers an immediate confirmation email from Supericons
- ending the subscription triggers one final end-state email
- duplicate webhook deliveries do not spam the user
- existing purchase and activation emails still work unchanged
