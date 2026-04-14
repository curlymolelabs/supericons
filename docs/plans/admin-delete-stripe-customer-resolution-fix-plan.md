# Admin Delete Stripe Customer Resolution Fix Plan

## Problem

The new admin delete flow correctly removes Pro users from Stripe when `si_subscriptions.stripe_customer_id` is present, but it misses users who only bought one-time products such as:

- single packs
- bundle packs
- Launch Edition / multi-pack grants tied to a checkout payment

Observed behavior:

- Pro subscriber deleted from Supabase and Stripe as expected
- one-time buyer deleted from Supabase, but the Stripe customer still remained in Stripe

## Why This Matters

For pre-launch cleanup, the goal is a true clean slate:

- delete the Supabase user
- delete user-owned app rows
- optionally delete the Stripe customer too

Right now, that last part only works reliably for subscription users.

That creates two problems:

- test-user cleanup is inconsistent
- the admin dashboard gives a misleading impression that "delete Stripe customer" covers all paid users

## Root Cause

The current admin delete flow is subscription-centric.

In [admin-api](../../supabase/functions/admin-api/index.ts):

- it reads `stripe_customer_id` only from the user's `si_subscriptions` row
- if present and the checkbox is enabled, it runs `stripe.customers.del(customerId)`

That works for Pro users because `si_subscriptions` stores:

- `stripe_subscription_id`
- `stripe_customer_id`

But one-time buyers are stored differently.

In [si_purchases](../../supabase/migrations/20260324_si_products_purchases.sql), we persist:

- `user_id`
- `product_id`
- `stripe_session_id`

And in [stripe-webhook](../../supabase/functions/stripe-webhook/index.ts), one-time purchases are recorded from `checkout.session.completed` by saving `stripe_session_id = session.id`.

So for bundle or pack buyers:

- we often have `stripe_session_id`
- we do **not** currently persist `stripe_customer_id`
- the admin delete flow therefore has no Stripe customer to delete

## Scope Decision

Do **not** overengineer this into a billing data remodel.

For launch and pre-launch cleanup, the right fix is:

- keep the current `si_subscriptions` path for Pro users
- add a fallback path that resolves Stripe customer IDs from `si_purchases.stripe_session_id`

Do **not** add a new billing table or a multi-step reconciliation system right now.

## Fix Strategy

### Phase 1. Add a Stripe customer resolution helper

In [admin-api](../../supabase/functions/admin-api/index.ts), add a helper such as:

- `resolveStripeCustomerIdsForUser(snapshot, stripe)`

Behavior:

1. Start with an empty set of Stripe customer IDs.
2. If `snapshot.subscription.stripe_customer_id` exists, add it.
3. For each purchase in `snapshot.purchases`:
   - read `stripe_session_id`
   - skip empty, null, or synthetic values such as `credit_redeem`
   - call `stripe.checkout.sessions.retrieve(sessionId)`
   - if the session has a `customer`, add it to the set
4. Return the deduplicated list of customer IDs.

Why a set:

- Launch Edition or bundle-style grants can create multiple `si_purchases` rows tied to the same checkout session
- we only want to delete a given Stripe customer once

### Phase 2. Update delete flow to use the helper

In `POST /users/:id/delete`:

1. Keep the current subscription cancel behavior:
   - if `stripe_subscription_id` exists and status is cancelable, cancel it first
2. If `delete_stripe_customer` is enabled:
   - resolve Stripe customer IDs from both subscription and purchase history
   - delete each resolved Stripe customer
3. Continue with:
   - `supabase.auth.admin.deleteUser(userId)`
   - account-deleted email
   - audit success/failure update

### Phase 3. Record warnings instead of failing on partial cleanup

The delete flow should stay operator-friendly.

Recommended behavior:

- if Supabase user deletion fails: return failure
- if Stripe customer resolution fails for one session:
  - add a warning
  - continue trying the rest
- if one Stripe customer delete fails:
  - add a warning
  - continue

Return shape:

- `success: true`
- `warnings: [...]`

This matches the existing audit-log style better than turning every Stripe cleanup miss into a hard blocker.

## Suggested Implementation Details

### Session filtering

Skip purchase rows whose `stripe_session_id` is clearly not a real Stripe checkout session, for example:

- `null`
- empty string
- `credit_redeem`

Only attempt Stripe retrieval for values that look like real Checkout Session IDs, typically `cs_...`.

### Defensive retrieval

When retrieving checkout sessions:

- catch `No such checkout.session` errors
- record them as warnings, not fatal errors

This is useful for:

- manually altered historical data
- non-Stripe purchase sources
- launch-grant rows copied from earlier workflows

### Deletion semantics

Deleting the Stripe customer does not necessarily make the customer disappear from the Stripe dashboard as if they never existed.

Expected outcome:

- Stripe customer is marked deleted / no longer active
- Stripe preserves enough record history for audit purposes

So verification should check for "deleted customer" semantics, not "gone from search forever."

## Optional Follow-Up, Not Required Now

If we later want faster or more reliable billing cleanup, we can persist Stripe customer IDs on one-time purchases too.

Possible future schema addition:

- add `stripe_customer_id text` to `si_purchases`

But that is explicitly **not required** for the launch fix. The current repo already has enough information via `stripe_session_id`.

## Verification Plan

### Case 1. Pro subscriber

Delete a disposable Pro test user with:

- active or recently canceled subscription
- `delete_stripe_customer = true`

Verify:

- Supabase auth user deleted
- `si_profiles`, `si_subscriptions`, `si_purchases` gone
- Stripe subscription canceled
- Stripe customer deleted / marked deleted
- audit row shows success

### Case 2. Single-pack-only buyer

Delete a disposable test user who:

- has one `si_purchases` row
- has no `si_subscriptions` row

Verify:

- Supabase auth user deleted
- purchase row removed
- Stripe customer deleted / marked deleted
- audit row shows success

### Case 3. Bundle or Launch Edition buyer

Delete a disposable test user who:

- has multiple `si_purchases` rows tied to the same checkout session
- has no Pro subscription

Verify:

- Stripe customer resolution deduplicates correctly
- only one Stripe customer delete attempt happens
- all local purchase rows are removed
- audit row shows success

### Case 4. Non-Stripe purchase row

Delete a test user with a non-Stripe or synthetic purchase source such as:

- credit/grant path
- `stripe_session_id = credit_redeem`

Verify:

- user deletion still succeeds
- warnings note skipped Stripe cleanup if relevant
- no fatal error is raised just because no Stripe customer could be resolved

## Recommended Build Order

1. Add Stripe customer resolution helper from purchase history
2. Wire it into `POST /users/:id/delete`
3. Add warning collection for partial Stripe cleanup failures
4. Test on:
   - one Pro user
   - one single-pack user
   - one bundle buyer if available
5. Only after that, use the admin dashboard to clear the remaining pre-launch test users

## Decision

Refine the implementation, not the whole admin plan.

The existing admin dashboard plan is still correct overall. The gap is narrow:

- Stripe customer cleanup currently assumes subscription ownership
- it must also resolve customers from one-time purchase history

That is a focused backend fix, not a reason to redesign the admin dashboard.
