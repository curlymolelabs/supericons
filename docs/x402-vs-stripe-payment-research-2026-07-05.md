# x402 vs Stripe for $1 Single-Icon Purchases: Research Findings and Decision

Date: 2026-07-05
Project: Supericons
Companion to: `docs/x402-single-icon-payment-exploration-2026-07-05.md`

## Purpose

This document records the verified research and the resulting decision on whether to use x402 payments for the $1 single-icon purchase, whether humans can pay an x402 endpoint without a crypto wallet, and how x402 compares to Stripe. It is written so another agent or contributor can act on it without re-researching.

## Decision summary

1. Build x402 as an additive, agent-first payment path only. Do not replace Stripe.
2. Keep all human purchases on Stripe. For the $1 price point, prefer a credits pack (for example 5 icons for $4) over single $1 card charges to fix the fee ratio.
3. Do not attempt a "human pays by card, crypto happens invisibly" flow. It is not buildable at $1 in mid-2026 (evidence below).
4. Skip the human wallet UI (Phase 2 of the exploration doc) until a real fiat facilitator for x402 ships. Re-check the landscape around early 2027.
5. Treat x402 revenue expectations as near zero initially. The value is positioning, agent-ecosystem discovery, and being early in an unoccupied niche.

## Key finding 1: fee economics strongly favor x402 for agent payments

Merchant view of a $1 digital good:

| Path | Fees on $1 | Merchant keeps |
|---|---|---|
| Stripe standard US card (2.9% + $0.30) | ~$0.33 (~33%) | ~$0.67 |
| Native x402, USDC on Base, pre-funded wallet | ~$0.001 to $0.011 (~0.1% to 1%) | ~$0.99 |
| Card-to-USDC onramp then x402 | Onramp fee exceeds the $1 principal | Negative for the buyer |

Details:

- Stripe US online card rate 2.9% + $0.30: corroborated by multiple current 2026 secondary sources citing stripe.com/pricing. Caveat: direct fetches of stripe.com/pricing geo-resolved to a non-US page (3.4% + SGD 0.50), so confirm the exact rate in the Stripe dashboard before publishing numbers.
- x402 has zero protocol fees ("x402 is free for the customer and the merchant, just pay nominal payment network fees", x402.org). The Coinbase CDP facilitator is free for the first 1,000 settled transactions per month, then $0.001 per transaction (fee introduced January 2026).
- Base gas for a USDC transfer: roughly $0.001 to $0.01 (triangulated estimate from Base docs and third-party sources, not measured on-chain).
- Third-party claims like "2,360x cheaper than Stripe" circulate but are not published by Coinbase or Stripe; treat as unverified marketing.

## Key finding 2: "invisible x402" for wallet-less humans does not exist at $1

The hoped-for flow (human pays $1 by card, a service converts to USDC and pays the x402 endpoint invisibly) fails on onramp economics and minimums, all verified from official provider pages:

- Coinbase Onramp: 2.5% for cards (US debit only, no credit cards), 0.5% ACH, plus price spread. Documented minimum ~$5 for Apple Pay / Google Pay. The Coinbase-hosted guest checkout widget was discontinued 2026-06-30; the Headless Onramp API replaces it. Guest checkout uses OTP verification and is capped at $500/week (US).
- MoonPay: up to 4.5% card fee with a minimum fee of up to $3.99 ($4.50 partner-referred), and a $20 minimum transaction amount. A $1 purchase would carry a ~400% fee even if allowed.
- Transak: tiered KYC applies at all transaction sizes (no KYC-free tier); card fees 3.5% to 5.5% plus ~1 EUR flat.
- Card networks add a separate friction layer: Visa classifies crypto onramp purchases as quasi-cash (MCC 6051), and many issuing banks block or surcharge these transactions regardless of onramp-side KYC.

Additional confirmations:

- The official x402 FAQ states fiat and card deposits are "not natively" supported; facilitators or third-party gateways can wrap x402 with onramps, but none was found live in production for card-paying consumers.
- x402 V2 (protocol update) explicitly makes room for card, ACH, and SEPA facilitators in its architecture, but no shipped implementation was verified.
- Stripe's x402 product (docs.stripe.com/payments/machine/x402) is merchant-side only: the buyer still pays USDC (Base, Solana, Tempo), Stripe captures a PaymentIntent when funds settle on-chain, and the transaction appears in normal Stripe reporting. Status: preview API version `2026-03-04.preview`, US businesses only, requires "Stablecoins and Crypto" payment method approval. Fees and fiat-settlement mechanics are not documented. Useful later for unified accounting, not for wallet-less buyers.
- Nevermined announced x402-to-Visa-Intelligent-Commerce routing (agents pay x402, merchants receive card-rail settlement). Framework only; no named live merchants verified.

The closest buildable "invisible crypto" pattern is a top-up model: an embedded wallet created behind an email or passkey sign-in (Coinbase CDP Embedded Wallets ship a `useX402` hook; Privy, now Stripe-owned, ships x402 support), funded once via onramp at the ~$5 minimum, then spent in $1 increments. This is a DIY integration of three products and is functionally a credits system. For human buyers, a plain Stripe credits pack achieves the same UX with less complexity and no crypto support burden.

## Key finding 3: real x402 demand is small and agent-centric

- Independent on-chain analysis (Artemis, reported by CoinDesk, March 2026) found roughly $28,000/day in x402 volume across ~131,000 transactions (average ~$0.20), with about half of observed transactions flagged as artificial (self-dealing or wash trading). A February 2026 spike to ~$2M/day was attributed to infrastructure testing.
- Cumulative transaction counts are large (Chainalysis cites 100M+ on Base through Q1 2026) but dollar volume is modest, and partner press releases outpace measured commerce.
- Ecosystem directories (Coinbase x402 Bazaar, x402-list.com, Onyx Bazaar) list real, live services, but almost entirely sub-cent to low-dollar API and data calls for agents. No x402 marketplace for consumer digital goods (icons, stock images, articles) was found.
- No verified live merchant anywhere sells the same product to agents via x402 and to humans via card on one checkout. Supericons would be first in that pattern, which cuts both ways: differentiation with no proven playbook.
- Governance matured in April 2026: the protocol moved to an x402 Foundation under the Linux Foundation, with members including Coinbase, Cloudflare, Google, Stripe, Visa, Mastercard, AWS, Shopify, and Circle. Cloudflare's Monetization Gateway (x402-based paywall) is waitlist-only.

Implication: expect trickle revenue from the agent endpoint at first. The Coinbase Bazaar auto-lists a seller within ~10 minutes of the first payment settled through the CDP facilitator (and delists after 30 days without transactions), so a live endpoint earns free agent-ecosystem discovery.

## Why x402 still beats Stripe for the agent path specifically

- The exploration doc verified in source that a correct Stripe single-icon flow is not a small patch: it needs icon-level entitlements, checkout metadata, a webhook branch, idempotent fulfillment, and a restricted delivery endpoint. With x402 the URL itself is the checkout: pay for this exact resource, receive this exact icon, no account, no webhook.
- Agents cannot complete a Stripe Checkout redirect; they can parse a 402 challenge and pay programmatically.
- Selling the `x402-pay` icon through an actual x402 endpoint is a self-evident story for the agent-tools audience Supericons already serves via its MCP server.

## Recommended build (unchanged from the exploration doc, Phase 1 only)

- One public Edge Function: `x402-premium-icon`, JWT verification disabled, testnet first, then Base mainnet USDC with the Coinbase CDP facilitator.
- Return only the purchased icon's SVG and CSS, never the full pack bundle.
- Keep the minimal `si_x402_icon_payments` audit table separate from `si_purchases`.
- Defer Phase 2 (human wallet UI) and Phase 3 (repeat access, receipts) until usage justifies them.
- Decide open question 7 of the exploration doc (full-fidelity public previews of paid icons) before launch; it affects both payment paths equally.

## Watch list (re-check around early 2027)

- Stripe machine payments x402 reaching GA, with published fees and fiat settlement.
- Any production fiat facilitator for x402 (card pays a 402 directly).
- Nevermined/Visa Intelligent Commerce going live with named merchants.
- Cloudflare Monetization Gateway general availability.
- Coinbase Headless Onramp minimums dropping below $5.

## Source index

Protocol and facilitator:
- https://docs.cdp.coinbase.com/x402/welcome
- https://github.com/coinbase/x402
- https://www.x402.org/ and https://www.x402.org/writing/x402-v2-launch
- https://x402.gitbook.io/x402/faq (fiat "not natively" supported; facilitator fee)
- https://docs.cdp.coinbase.com/x402/bazaar

Stripe:
- https://docs.stripe.com/payments/machine/x402 (preview, US-only, USDC on Base/Solana/Tempo)
- https://stripe.com/pricing (verify US rate in dashboard; fetches geo-resolved abroad)

Onramps and embedded wallets:
- https://docs.cdp.coinbase.com/onramp/additional-resources/faq (2.5% card, $5 minimum)
- https://docs.cdp.coinbase.com/embedded-wallets/x402-payments (useX402 hook)
- https://docs.privy.io/recipes/agent-integrations/x402 and https://docs.privy.io/recipes/card-based-funding
- https://www.moonpay.com/legal/pricing_disclosure ($3.99 minimum fee; $20 minimum)
- https://support.transak.com/en/articles/7845942-how-does-transak-calculate-prices-and-fees
- https://www.visa.co.uk/content/dam/VCOM/regional/ve/unitedkingdom/PDF/issuers-community/uk-crypto-best-practice-guide.pdf (MCC 6051 quasi-cash)

Adoption and demand:
- https://www.coindesk.com/markets/2026/03/11/coinbase-backed-ai-payments-protocol-wants-to-fix-micropayment-but-demand-is-just-not-there-yet (Artemis data, ~$28k/day, ~half artificial)
- https://www.chainalysis.com/blog/x402-agentic-payments-adoption/ (100M+ transactions through Q1 2026)
- https://nevermined.ai/facilitator/ (fiat-wrapping facilitator, announced)
- Linux Foundation x402 Foundation press release, April 2026

Verification notes: figures marked as estimates (Base gas range, some volume statistics) were triangulated from secondary sources rather than measured directly. Provider fees and minimums were read from the providers' own pages on 2026-07-05 and may change.
