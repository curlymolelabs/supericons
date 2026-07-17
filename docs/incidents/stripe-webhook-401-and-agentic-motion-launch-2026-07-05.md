# Incident and launch-readiness report: Stripe webhook 401 failures and Agentic Motion pack wiring

INTERNAL ONLY. Contains a customer email address and live Stripe identifiers. Do not publish.

Date: 2026-07-05
Author: engineering session working on the supericons repo
Audience: follow-up analysis agent
Repo: supericons (local path D:\Personal\Business\Curly Mole Labs\Experiments\Apps\DailySprint\supericons)
Production: https://supericons.dev, Supabase project kcjmkakdhsqplvasgkjv, live Stripe account

---

## Executive summary

Two threads share one root cause.

1. Stripe emailed the owner that the live webhook endpoint has failed 11 times since 2026-07-02 01:32:21 UTC and will be disabled on 2026-07-11 if not fixed. Root cause is confirmed from the Stripe dashboard: every delivery fails with HTTP 401, body `{"code": "UNAUTHORIZED", "message": "Missing a..."}` (missing authorization header). The Supabase gateway is rejecting Stripe's requests before the `stripe-webhook` edge function runs, meaning JWT verification is enabled on that function. Stripe never sends a Supabase JWT; the function authenticates requests itself via the Stripe signature header and `STRIPE_WEBHOOK_SECRET`. The fix is to disable JWT verification for this one function and replay the failed events.

2. The new Agentic Motion premium pack (50 animated icons, $9.99) is fully wired in the repo and one step from proven: the end-to-end test purchase was intentionally not completed. Had it been completed while the webhook was failing, payment would have succeeded but fulfillment (the `si_purchases` row) would not have been written. The test purchase should be completed only after the webhook fix is verified with a 200.

Only one customer is affected by the outage window: the single Pro subscriber, whose 2026-07-02 renewal succeeded on Stripe's side but whose Supabase subscription record is now stale.

---

## Issue 1: webhook endpoint failing with 401

### Evidence

- Stripe email: 11 failed deliveries since 2026-07-02 01:32:21 UTC to `https://kcjmkakdhsqplvasgkjv.supabase.co/functions/v1/stripe-webhook`; endpoint will be disabled 2026-07-11 01:32:21 UTC. The email categorized failures as "other errors".
- Stripe dashboard (Workbench, Webhooks, Event deliveries), observed 2026-07-05: every attempt shows HTTP status 401 with response body starting `{"code": "UNAUTHORIZED", "message": "Missing a` (truncated in UI; consistent with Supabase's standard "Missing authorization header" gateway response).
- Failing event types in the window: `customer.subscription.updated` and `invoice.paid`, with automatic retries on Jul 2, Jul 3, Jul 4, and Jul 5. All belong to one subscriber's renewal (see Impact).
- First failure timestamp equals the renewal event burst: 2026-07-02 09:32 (+08) which is 01:32 UTC. There were no webhook events between the last successful delivery (date unknown) and this burst, so the misconfiguration could have been introduced any time in the days before Jul 2, not necessarily on Jul 2.

### Root cause

Supabase edge functions have a per-function "Enforce JWT verification" setting (also controlled by the CLI flag `--no-verify-jwt` at deploy time and by `supabase/config.toml` entries). When enabled, the Supabase gateway requires a valid Supabase JWT in the Authorization header and rejects requests with 401 before invoking the function. Stripe webhook requests carry a `stripe-signature` header, not a Supabase JWT, so they are rejected at the gateway.

The function code itself is not at fault. `supabase/functions/stripe-webhook/index.ts` verifies the Stripe signature with `stripe.webhooks.constructEventAsync` (the async variant correct for Deno), returns 400 on bad signatures, 200 for unhandled event types, and 500 with a catch-all. None of those paths were reached; the gateway blocked first.

How the setting got enabled is unresolved. The repo has no `supabase/config.toml`, so every `supabase functions deploy` relies on the operator remembering `--no-verify-jwt` or on the dashboard toggle state. The most likely cause is a function deploy in late June or on Jul 1-2 without the flag. Note: the only deploy from the current work stream was `create-checkout` on 2026-07-05, which is after failures began and unrelated (and `create-checkout` demonstrably works; a live checkout session for the new pack was created 2026-07-05 00:38 +08, visible as `POST /v1/checkout/sessions` 200, amount_total 999).

### Impact

- Affected: exactly one customer, the sole Pro subscriber ([customer email redacted], $15.00 monthly).
  - Their renewal payment on 2026-07-02 succeeded on Stripe's side (`invoice_payment.paid`, USD 15.00, 09:32:18 +08).
  - The corresponding `invoice.paid` and `customer.subscription.updated` events never reached Supabase, so the `si_subscriptions` row (notably `current_period_end` and status) was not refreshed and is stale. Depending on how the app gates Pro features on `current_period_end`, their Pro access may wrongly lapse mid-cycle.
  - Payment method question: the event sequence (`customer.updated` at 09:32:16, payment success at 09:32:18) suggests the customer paid manually through the hosted invoice page (customer records are typically updated when a customer pays interactively) rather than an automatic off-session charge. This is inference; the invoice's activity timeline in Stripe states it definitively. Context: the owner had emailed this customer about a failed payment with a payment link, so manual payment is plausible.
- Not affected: no pack purchases occurred in the failure window. The new pack's test purchase was not completed (checkout session created, payment page reached, payment not submitted). No other customers transacted.
- Future risk if unfixed: Stripe disables the endpoint on 2026-07-11. After that, all purchase fulfillment (si_purchases writes), subscription state updates, and receipt emails silently stop, while payments continue to succeed. This is the worst failure mode for a commerce system: money taken, product not delivered.

### Remediation plan (owner actions, in order)

1. Disable JWT verification for the function: Supabase Dashboard, Edge Functions, `stripe-webhook`, turn off "Enforce JWT verification". CLI equivalent: `supabase functions deploy stripe-webhook --no-verify-jwt`. This is safe: webhook authenticity is enforced inside the function by Stripe signature verification against `STRIPE_WEBHOOK_SECRET`.
2. Verify: in Stripe's webhook Event deliveries, Resend the most recent failed attempt; expect HTTP 200 `{"received": true}`.
3. Replay backlog: Resend all failed events, oldest first. Handlers are idempotent upserts (`si_purchases` on conflict user_id+product_id; `si_subscriptions` upsert), so replays are safe. Side effect: duplicate emails are possible for email-sending paths; for this backlog (subscription update + invoice paid) verify whether the handler emails on those event types before replaying if duplicate emails matter.
4. Verify the subscriber's row: `si_subscriptions` for the customer should show status active and `current_period_end` around 2026-08-02 after replay.
5. Audit other functions' JWT settings while in the dashboard. Only `stripe-webhook` requires verification off. Functions that expect user tokens (`create-checkout`, `download-pack`, `serve-premium-asset`, etc.) can keep gateway verification on or off since they validate tokens internally; confirm current state matches intent.
6. Prevention options (not yet done):
   - Add `supabase/config.toml` pinning `[functions.stripe-webhook] verify_jwt = false` so CLI deploys cannot regress it. Small behavioral change: CLI starts reading the file for all functions listed.
   - Add monitoring: Stripe webhook failure alerts are email-only by default; consider a periodic check or a Stripe CLI smoke test after any function deploy.
   - Post-incident archaeology: identify what deployed or changed function settings between the last successful webhook delivery and 2026-07-02 to close the loop on root cause attribution.

---

## Issue 2: Agentic Motion premium pack, state and launch readiness

### What the product is

A new premium pack, slug `agentic-motion`, name "Agentic Motion", 50 animated icons covering agent lifecycle states, workflow and MCP, coding agents, trust and safety, agentic payments, robotics and drones, quantum and frontier compute. Each animation is meaning-derived (examples: agent-handoff plays a baton pass between two agent nodes; approval-gate opens and slams its doors with a rubber squash-and-stretch on the house; drone rotors blur while the airframe bobs). Pricing decided by the owner: $9.99 one-off for the pack; a $1 Single Icon License product exists in Stripe but is deliberately not wired yet (phase two; requires icon-level entitlement schema).

### Commerce wiring (all committed to main)

- Stripe (live mode): product "Agentic Motion" with price `price_1TpW6m35D7agOGFj2SwGhsJc` ($9.99 one-off). Secondary product "Single Icon License" with price `price_1TpW8r35D7agOGFj2zmO5fUl` ($1, unused).
- Supabase `si_products` row id `f74ed439-f1de-4a15-8c4f-1e272097a088`, slug `agentic-motion`, price_cents 999, pack_type single, `v1_launch=false` (excluded from Launch Edition and Pro Annual grants), `css_filename='agentic-motion.css'` (required by download-pack). Status is `draft` for the hidden pilot; `create-checkout` requires `status='active'`, so the row must be flipped active during purchase testing and can be flipped back to draft afterward (delivery functions do not check status, so entitlements keep working while hidden).
- Repo wiring: pack assets under `public/packs/agentic-motion/` (bundle.json, css, 50 svgs, obfuscated classMaps in the same conventions as the 8 existing packs); manifest entry in `public/packs/manifest.json`; `premium-collection-map.json` entry; localized checkout copy for 12 locales in `supabase/functions/create-checkout/index.ts` (deployed 2026-07-05); packs page shows the pack first with a "Supericons Edition" badge (launch packs keep "Launch Edition"); customize panel shows an animated hover preview (closed shadow root) plus Buy icon $1 (stub toast) and Buy pack $9.99 (real checkout via `startPackCheckout` in store.js) for every si concept icon; owned state flips the buy row to "Copy animated SVG" and "Copy animation CSS" served through `serve-premium-asset` (store.js `isProductOwned`, `fetchPremiumPackBundle`; `extractIconCss` in `lib/si-premium-motion.js`).
- Relevant commits on main: e18fb0ad9 (concept library), de0182260 (premium pack and commerce), 5401893b7 (mockups), 677c1b39a (owned state).

### Verified so far

- Checkout session creation works end to end up to the Stripe payment page (live session created 2026-07-05 00:38 +08, amount 999, seen in Stripe API logs). This exercised auth, product lookup (after the row was set active), localized copy, and price mapping.
- All 50 pack animations play on hover (frame-diff harness, 50/50), registry projections contain the 450 premium records with zero leakage into public artifacts, and the full verifier suite passes (si-registry, source boundaries, product facts, logo launch search, packs localization for 12 locales, customize preview, icon grid).
- Owned-state code paths are unit and UI tested for the signed-out and unowned cases; `extractIconCss` produces valid scoped CSS for all 50 icons against the real bundle.

### Not yet verified (blocked, in order, on the webhook fix)

1. Payment completion: the $9.99 charge itself.
2. Webhook fulfillment: `checkout.session.completed` writing `si_purchases` and sending the receipt email.
3. Owned-state flip with a real entitlement: My Purchases listing, customize panel showing the licensed copy actions, `serve-premium-asset` delivering bundle.json to the owner account.

Test protocol once the webhook returns 200s: set the product row active, sign in with the owner account on the local app (production Supabase and live Stripe), buy from the Agent Handoff customize panel, verify the three items above, flip the row back to draft, confirm entitlement still works while hidden, refund the charge in Stripe (entitlement persists).

### Remaining launch checklist (after the test passes)

- Owner review of all 50 animations (taste pass; each is a small spec tweak in the generator if changes are wanted).
- Promote the 50 free concept-icon registry records from status draft, review_state source_mapped to reviewed, human_reviewed after actual human review.
- Update `si_products.icon_count` from 1 to 50 for agentic-motion.
- Seed Supabase hosted search so the 50 free concept icons are searchable in production (`npm run import:registry-supabase` path; not yet run).
- Marketing copy still says "8 premium packs" in several places (store.js FAQ and Launch Edition copy, Pro annual email copy in stripe-webhook); update to reflect 9 when the pack goes public.
- Product decision, owner-only: whether Agentic Motion joins Pro annual grants and the Launch Edition bundle or stays standalone. Current wiring keeps it standalone (`v1_launch=false`).
- Flip `si_products.status` to active to launch.

---

## Interaction between the two issues

- The webhook outage made completing the pack test purchase unsafe; had it been completed, payment would have succeeded with no fulfillment. Sequencing is therefore: fix webhook, verify 200, replay backlog, then run the pack test purchase.
- Both threads converge on the same fragile point: fulfillment integrity depends entirely on one webhook endpoint whose gateway config can be silently flipped by a deploy flag. The prevention items (config.toml pin, post-deploy webhook smoke test) protect the upcoming pack launch as much as the existing subscription business.

## Open questions for further analysis

1. What changed the JWT setting, and when exactly? (Check Supabase audit logs if available, and any function deploys between late June and Jul 2.)
2. Does the stripe-webhook handler email customers on `invoice.paid` or `customer.subscription.updated` replays? If yes, decide whether duplicate emails to the subscriber are acceptable before replaying, or replay only the most recent of each type.
3. Is app-side Pro gating currently denying the subscriber anything while `si_subscriptions` is stale? (Check `current_period_end` handling in store.js `isPro` and related.)
4. Should `serve-premium-asset` and `download-pack` also enforce product status for delivery, or is the current status-independent delivery (which the hidden pilot relies on) the intended contract?
