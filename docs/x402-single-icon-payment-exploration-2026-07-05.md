# x402 Single-Icon Payment Exploration

Date: 2026-07-05
Project: Supericons
Subject: Frictionless `$1` single-icon purchases for humans and agents using x402 stablecoin payments

## Executive summary

Supericons is considering x402 as an experimental payment path for small digital products, starting with the `$1` "Buy icon" action in the Agentic Motion premium collection.

The idea is sound. x402 is a strong fit for commodity-like digital assets where the buyer wants the asset immediately, the price is low, and the buyer may be an AI agent or a human assisted by an agent. It avoids the account, checkout redirect, and webhook-heavy shape of Stripe Checkout.

The recommended first version is an x402-protected paid resource endpoint:

```txt
GET /functions/v1/x402-premium-icon?pack=agentic-motion&icon=x402-pay
```

The endpoint should return `402 Payment Required` until payment is supplied, then return only that icon's licensed SVG and CSS after x402 verification and settlement.

Effort comparison:

- Minimal x402 pay-per-download: likely less work than a correct Stripe single-icon entitlement system.
- Full x402 human purchase system with wallet UI, repeat access, receipts, refunds, and "My Purchases" integration: comparable to or more work than Stripe.
- Stripe is still better for mainstream users, packs, subscriptions, receipts, refunds, and account-based ownership.
- x402 is better for agents, developers, crypto-native humans, and low-friction per-resource purchases.

Recommendation: build x402 as an additive beta path, not as a replacement for Stripe.

## Current Supericons state

Verified in source:

- The customize panel already renders two premium motion purchase buttons: `Buy icon - $1` and `Buy pack - $9.99`.
  - Source: `main.js:2535-2536`.
- The `$1` button is currently a stub that shows "Single icon purchase is coming after the pack pilot."
  - Source: `main.js:2626-2630`.
- The Agentic Motion config already contains both Stripe price IDs:
  - Pack price: `price_1TpW6m35D7agOGFj2SwGhsJc`.
  - Single icon price: `price_1TpW8r35D7agOGFj2zmO5fUl`.
  - Source: `lib/si-premium-motion.js:16-25`.
- The current Stripe purchase flow is product/pack-based. `startPackCheckout` sends `price_id` and `product_id` to `create-checkout`.
  - Source: `store.js:6226-6258`.
- Current ownership is determined by an `si_purchases` row for `user_id + product_id`.
  - Source: `store.js:725-738`, `supabase/migrations/20260324_si_products_purchases.sql:24-30`.
- The Stripe webhook records completed one-time product purchases by upserting into `si_purchases`.
  - Source: `supabase/functions/stripe-webhook/index.ts:546-606`.
- The licensed premium asset endpoint requires a signed-in user and a pack-level `si_purchases` row before it serves private storage content.
  - Source: `supabase/functions/serve-premium-asset/index.ts:58-111`.

Important consequence: using the existing Stripe path for the `$1` button is not a safe small patch. A correct Stripe version needs icon-level entitlement data, webhook metadata, and a delivery endpoint that only serves the purchased icon.

## What x402 provides

x402 is an HTTP-native payment protocol built around `402 Payment Required`. It allows a server to request payment for a resource, a client to send a signed payment payload, and the server to verify/settle payment before returning the resource.

Relevant source facts:

- Coinbase describes x402 as supporting digital content, APIs, human developers, and AI agents without accounts, sessions, or complex authentication.
  - Source: https://docs.cdp.coinbase.com/x402/welcome
- x402 buyers and sellers interact through HTTP requests; payment is handled through the protocol.
  - Source: https://docs.cdp.coinbase.com/x402/welcome
- The standard flow is: request resource, receive `402`, construct payment payload, retry with `PAYMENT-SIGNATURE`, verify and settle, then receive the resource.
  - Source: https://docs.cdp.coinbase.com/x402/welcome
- x402 supports machine-to-machine and microtransaction use cases.
  - Source: https://docs.cdp.coinbase.com/x402/welcome
- The Payment-Identifier extension exists for retry/idempotency behavior, helping avoid duplicate payment processing on retries.
  - Source: https://docs.x402.org/extensions/payment-identifier
- Sign-In-With-X can support repeat access to previously purchased content by proving wallet ownership, but this is an additional layer.
  - Source: https://docs.x402.org/extensions/sign-in-with-x

## Product fit

The `$1 single icon` purchase has three traits that fit x402 well:

1. It is small and commodity-like.
2. The buyer wants immediate access to one resource, not a long checkout flow.
3. The buyer may be an AI agent that can parse a `402` challenge and pay programmatically.

Human buyer fit depends on wallet readiness:

- Good fit: crypto-native humans, developers, agent-assisted buyers, users with USDC on Base/Solana/etc.
- Weak fit: mainstream users with no wallet, no stablecoin, or no understanding of network selection.

Therefore the best UI is not "replace Stripe." It is:

```txt
Buy icon - $1
Pay with card / Stripe
Pay with USDC / x402 beta
```

Or, for the first experiment:

```txt
Agent purchase endpoint: Pay $1 USDC via x402
```

## Recommended v1 design

### Endpoint

Add a new public Supabase Edge Function:

```txt
GET /functions/v1/x402-premium-icon?pack=agentic-motion&icon=x402-pay
```

The function must be deployed with JWT verification disabled, because unauthenticated clients and agents need to reach the function and receive the `402 Payment Required` challenge.

### Request without payment

Response:

```txt
HTTP 402 Payment Required
PAYMENT-REQUIRED: <base64 payment requirements>
Content-Type: application/json
```

Body:

```json
{
  "error": "payment_required",
  "pack": "agentic-motion",
  "icon": "x402-pay",
  "price": "$1.00",
  "asset": "animated SVG and CSS"
}
```

### Request with valid payment

Response:

```txt
HTTP 200 OK
PAYMENT-RESPONSE: <settlement result>
Content-Type: application/json
Cache-Control: private, no-store
```

Body:

```json
{
  "pack": "agentic-motion",
  "icon": "x402-pay",
  "license": "single-icon-license",
  "svg": "<svg ...>",
  "css": "..."
}
```

### Delivery rule

Do not return `bundle.json` for x402 single-icon purchases. The endpoint must return only the purchased icon's SVG and only the CSS needed for that icon.

This matters because Agentic Motion contains 50 animated icons. A `$1` buyer should not receive the full pack payload through the paid endpoint.

### Storage source

The function can read from the existing private `premium-icons` bucket. It can either:

- read `{pack}/{icon}.svg` plus `{pack}/agentic-motion.css` and extract only the relevant CSS, or
- read `{pack}/bundle.json` internally and return a reduced single-icon payload.

Internal reads from the full bundle are acceptable; the external response must be reduced.

### Minimal audit table

For v1, keep this pay-per-download and mostly stateless, but record settled purchases for operations:

```sql
create table si_x402_icon_payments (
  id uuid primary key default gen_random_uuid(),
  pack_slug text not null,
  icon_name text not null,
  network text not null,
  amount_usd numeric not null,
  payer_address text,
  payment_identifier text,
  settlement_reference text,
  paid_at timestamptz not null default now()
);
```

This table should support:

- debugging failed or duplicated requests,
- lightweight sales analytics,
- possible future wallet-based repeat access,
- support/refund lookup.

It should not be part of the normal `si_purchases` pack ownership model.

## Human UX proposal

For humans, x402 needs a small wallet payment UI:

1. User clicks "Buy icon - $1 USDC beta".
2. UI requests the x402 endpoint.
3. Endpoint returns `402 Payment Required`.
4. UI displays price, network, token, and destination terms.
5. User connects wallet and signs payment authorization.
6. UI retries request with `PAYMENT-SIGNATURE`.
7. UI receives SVG/CSS and shows "Copy animated SVG" and "Copy animation CSS".

For mainstream users, retain Stripe:

- "Pay with card" remains more familiar.
- Stripe handles receipts, refunds, and buyer trust better.
- Stripe is more appropriate for pack purchases and subscriptions.

For crypto-native users, x402 may be smoother:

- no Supericons account required,
- no email required,
- no checkout redirect,
- immediate asset response.

## Agent UX proposal

Add a documented agent-facing endpoint:

```txt
GET https://kcjmkakdhsqplvasgkjv.supabase.co/functions/v1/x402-premium-icon?pack=agentic-motion&icon=x402-pay
```

Agent behavior:

1. Fetch the URL.
2. Parse `PAYMENT-REQUIRED`.
3. Confirm price, token, network, and requested resource.
4. Pay with x402-compatible wallet.
5. Retry with `PAYMENT-SIGNATURE`.
6. Store returned SVG/CSS and receipt.

This should be discoverable in a small public doc page or machine-readable manifest, for example:

```json
{
  "service": "Supericons x402 premium icon delivery",
  "resource": "agentic-motion single icon",
  "method": "GET",
  "price": "$1.00",
  "formats": ["json"],
  "returns": ["svg", "css", "license"]
}
```

## Effort comparison: x402 vs Stripe

### Option A: Stripe single-icon purchase

A correct Stripe implementation requires:

- new icon-level entitlement table,
- checkout request metadata for `pack_slug` and `icon_name`,
- create-checkout validation for single-icon price/product relationship,
- webhook branch for `checkout.session.completed` single-icon purchases,
- idempotent fulfillment,
- frontend owned-state check for pack-owned or icon-owned,
- delivery endpoint that serves only one icon for icon owners,
- refund and support handling,
- possible email receipt customization.

Stripe advantages:

- familiar human checkout,
- receipts and refunds are standard,
- account purchase history fits existing `si_purchases` patterns,
- lower product risk for mainstream users.

Stripe disadvantages for this use case:

- account/login flow is friction,
- webhook fulfillment must be correct,
- not naturally agent-native,
- heavy for a `$1` commodity asset,
- card/payment processing overhead is proportionally more painful for small purchases.

### Option B: Direct x402 pay-per-download

A minimal direct x402 implementation requires:

- one new public Edge Function,
- x402 payment requirement generation,
- facilitator verification and settlement,
- icon slug validation,
- single-icon payload extraction,
- optional audit table,
- optional human wallet UI,
- verification script for unpaid/paid/error flows.

x402 advantages:

- agent-native,
- no Supericons account required,
- no Stripe Checkout redirect,
- no Stripe webhook fulfillment,
- direct paid-resource semantics,
- better fit for low-value digital commodities,
- easier to expose as an API/tool endpoint.

x402 disadvantages:

- humans need wallet and stablecoin,
- user support is more crypto-specific,
- repeat access needs additional wallet-auth design,
- refunds are not as standardized as Stripe,
- accounting/reporting may be less polished unless built,
- production facilitator configuration must be handled carefully.

### Option C: Stripe x402 / machine payment path

Stripe also documents an x402 machine-payment flow using Stripe PaymentIntents and crypto payment methods.

Relevant source facts:

- Stripe's x402 guide says Stripe handles deposit addresses and captures the PaymentIntent when funds settle on-chain.
  - Source: https://docs.stripe.com/payments/machine/x402
- Stripe's x402 flow requires the Stablecoins and Crypto payment method and an access review.
  - Source: https://docs.stripe.com/payments/machine/x402
- Stripe's guide uses PaymentIntents and a preview API version.
  - Source: https://docs.stripe.com/payments/machine/x402

This may be useful later if Supericons wants stablecoin payments inside Stripe reporting and settlement. It is not the minimal "no complicated Stripe wiring" path.

## Answer to "will x402 be more effort than Stripe?"

For the MVP we actually want, no: direct x402 is likely less effort than a correct Stripe single-icon implementation.

The key reason is that Stripe single-icon purchase still requires a new entitlement model and webhook fulfillment. x402 lets the resource itself be the checkout: pay for this exact URL, receive this exact icon.

However, x402 becomes more work than Stripe if v1 requires:

- polished wallet UI for mainstream non-crypto users,
- repeat downloads without paying again,
- account library integration,
- automatic receipts,
- refunds,
- customer support tooling,
- revenue dashboards equivalent to Stripe,
- tax/accounting workflows.

So the right split is:

```txt
x402 v1: pay-per-download for agents and crypto-native humans.
Stripe: account-based pack purchases and mainstream checkout.
```

## Implementation plan

### Phase 1: Agent-first proof of concept

Build:

- `x402-premium-icon` Edge Function.
- Testnet configuration first.
- Single hardcoded resource initially, such as `agentic-motion/x402-pay`.
- Return only `{ svg, css, license }`.
- Add unpaid request verifier: expects `402`.
- Add paid request verifier using a test wallet or documented manual test.

Acceptance criteria:

- no Supabase login required,
- unpaid request returns valid x402 payment requirement,
- paid request returns one icon only,
- invalid icon names are rejected,
- no full pack bundle is exposed,
- duplicate/retry behavior is defined.

### Phase 2: Human beta UI

Build:

- small "Pay $1 USDC beta" button,
- wallet connection/payment flow,
- copy/download controls after payment,
- clear fallback to Stripe/card path where appropriate.

Acceptance criteria:

- human can complete stablecoin payment in-browser,
- UI handles wrong network and insufficient funds gracefully,
- completed payment unlocks immediate copy/download for the selected icon only.

### Phase 3: Repeat access and receipts

Consider:

- Sign-In-With-X for wallet-based repeat access,
- signed receipts extension,
- audit table search/admin view,
- public agent manifest or Bazaar/discovery metadata.

Do this only if early usage justifies it.

## Open questions for review

1. Should the first production network be Base mainnet USDC, Solana USDC, or both?
2. Should Supericons use Coinbase/CDP facilitator, another facilitator, or a Stripe x402 flow for settlement/accounting?
3. Should v1 be strictly pay-per-download, or should wallet-based repeat access be included from the start?
4. Should the human UI be visible in the main product, or hidden behind an "x402 beta" link until proven?
5. How should refunds be handled for accidental duplicate payments?
6. Should successful x402 payments appear in a user's Supericons account if they are signed in, or remain wallet/resource based?
7. Is the current full-fidelity public preview model acceptable for a `$1` licensed source product, or should public previews become lower-fidelity before launch?

## Recommendation

Proceed with x402 as an experiment.

The best first build is a narrow, agent-first, pay-per-download endpoint for one icon. It should prove that a client can request a Supericons premium resource, pay `$1` in stablecoin through x402, and receive exactly one licensed asset without account creation or webhook fulfillment.

Do not replace Stripe yet. Keep Stripe for packs, subscriptions, and mainstream human checkout. Use x402 where it is strongest: small atomic digital goods bought by agents, developers, and crypto-ready humans.
