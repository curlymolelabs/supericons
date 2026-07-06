# x402 Single Icon Payment Phase 0 Technical Spike

Date: July 6, 2026
Status: Phase 0 spike complete; paid-path wallet settlement still requires live testnet credentials.

## Scope

This spike validates the implementation direction for the Supericons experimental $1 single-icon purchase flow using x402. The first hardcoded resource is `agentic-motion/x402-pay`.

Phase 0 is intentionally not a live production payment rollout. It records the protocol decisions, repo changes, storage shape, and manual gates needed before Phase 1 implementation.

## Verified Source Facts

Primary sources checked:

- Coinbase CDP x402 seller quickstart: https://docs.cdp.coinbase.com/x402/quickstart-for-sellers
- Coinbase CDP x402 buyer quickstart: https://docs.cdp.coinbase.com/x402/quickstart-for-buyers
- Coinbase CDP x402 core concepts: https://docs.cdp.coinbase.com/x402/core-concepts/how-it-works
- Coinbase CDP x402 migration guide: https://docs.cdp.coinbase.com/x402/migration-guide
- Coinbase CDP x402 FAQ: https://docs.cdp.coinbase.com/x402/support/faq
- npm package metadata for `@x402/core`, `@x402/evm`, `@x402/fetch`, and `@x402/hono` version `2.17.0`.

Verified facts:

- x402 v2 uses `PAYMENT-REQUIRED`, `PAYMENT-SIGNATURE`, and `PAYMENT-RESPONSE` headers.
- A server can return HTTP 402 with payment terms, then verify and settle the client retry through a facilitator.
- Coinbase documents `https://x402.org/facilitator` as a free testnet facilitator for Base Sepolia and Solana Devnet.
- Coinbase documents `https://api.cdp.coinbase.com/platform/v2/x402` as the recommended CDP facilitator for testnet and mainnet use.
- Base Sepolia is identified as `eip155:84532`; Base mainnet is identified as `eip155:8453`.
- Buyer flows require a wallet with USDC, and testnet flows require Base Sepolia ETH plus testnet USDC.
- Current SDK package metadata shows `@x402/core@2.17.0`, `@x402/evm@2.17.0`, `@x402/fetch@2.17.0`, and `@x402/hono@2.17.0`.
- Deno 2.7.12 can import the needed SDK entry points when npm auto-install is enabled:
  - `@x402/core@2.17.0/server`
  - `@x402/core@2.17.0/http`
  - `@x402/evm@2.17.0/exact/server`

## Repo Artifacts Added

- `supabase/functions/_shared/x402-single-icon-config.ts` defines the Phase 0 hardcoded resource, price, networks, facilitator URLs, support email, and redelivery window.
- `supabase/config.toml` pins JWT verification off for the planned `x402-premium-icon` function so unauthenticated buyers and agents can receive HTTP 402 payment terms.
- `supabase/migrations/20260706_x402_single_icon_payments.sql` drafts the private audit table, rate-limit counter table, RLS posture, and unique indexes.
- `docs/legal/supericons-single-icon-license-draft-2026-07-06.md` drafts the single-icon license language for humans, organizations, wallets, and agent-purchased use.
- `scripts/verify-x402-phase0-artifacts.mjs` checks that the PRD, config, migration, license draft, and visual artifact remain aligned.

## Contract Authority

The implementation contract is the PRD's error table in `docs/supericons-x402-single-icon-payment-prd-2026-07-06.md`. This spike report records Phase 0 findings and setup decisions, but it should not override the PRD's response codes or required JSON error shape.

## Phase 0 Decisions

Use x402 v2, not v1. The endpoint contract should use the v2 `PAYMENT-*` headers.

Use Base Sepolia first. The first testnet network is `eip155:84532`; the intended mainnet network is Base mainnet `eip155:8453`.

Use `https://x402.org/facilitator` for the earliest testnet spike because it does not require API keys. Use the CDP facilitator before production because Coinbase recommends it for production use.

Use Postgres as the backing store for audit records, concurrency locks, redelivery, and simple rate-limit counters. Supabase Edge Functions are stateless, so the rate-limit state needs a store.

Do not log every unpaid 402 challenge. The audit table is for settlement attempts, paid failures, redeliveries, and sampled or aggregated abuse signals.

Treat the signed payment payload hash as the concurrency lock. The unique index includes `settlement_pending`, `settled`, `delivery_failed`, and `redelivered`, so duplicate concurrent requests cannot both enter facilitator settlement for the same signed payment.

Keep the x402 endpoint service-role-only for database access. RLS is enabled on the audit and rate-limit tables, and no anon/authenticated policies are granted in the draft migration.

Use `support@supericons.dev` as the beta support contact for paid-but-not-delivered and settlement dispute cases unless the business chooses a different address.

## Planned Endpoint Shape

Function slug: `x402-premium-icon`

Initial route:

```text
GET /functions/v1/x402-premium-icon?pack=agentic-motion&icon=x402-pay
```

Allowed initial resource:

```text
pack: agentic-motion
icon: x402-pay
price: 1.00 USDC
testnet network: eip155:84532
mainnet network: eip155:8453
redelivery window: 30 minutes
```

Expected high-level responses are defined in the PRD error table:

- `402 payment_required`: no signed payment supplied.
- `402 payment_verification_failed`: supplied payment cannot be verified for the resource.
- `200 delivered`: settlement completed or valid redelivery with the original signed payload.
- `409 payment_already_processing`: identical signed payload is already being processed.
- `409 payment_reused_for_different_resource`: signed payment was replayed against another resource.
- `410 redelivery_window_expired`: valid old payment, but the redelivery window has passed.
- `429 rate_limited`: request is blocked before facilitator settlement.
- `503 facilitator_unavailable`: facilitator cannot verify or settle.
- `503 delivery_failed_after_settlement`: payment settled, but storage read or payload assembly failed.
- `500 internal_error`: unexpected server error.

## Environment Variables For Phase 1

Recommended endpoint variables:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
X402_RECEIVING_ADDRESS
X402_FACILITATOR_URL
X402_NETWORK
X402_PRICE_USD
X402_TEST_WALLET_ADDRESSES
X402_SUPPORT_EMAIL
```

`X402_RECEIVING_ADDRESS` should be the merchant receiving wallet. `X402_TEST_WALLET_ADDRESSES` should list internal wallets excluded from organic purchase metrics.

## Paid-Path Verification Still Required

This spike did not execute a real testnet settlement. To complete the paid path, provide:

- A receiving wallet address for Base Sepolia.
- A test buyer wallet with Base Sepolia ETH and testnet USDC.
- The chosen facilitator URL for the test, either `https://x402.org/facilitator` or the CDP facilitator with credentials.

The paid-path verifier should prove:

- First unpaid request returns 402 with valid payment terms.
- Buyer signs and retries with `PAYMENT-SIGNATURE`.
- Facilitator settlement succeeds.
- Endpoint returns the SVG/CSS payload and `PAYMENT-RESPONSE`.
- Audit row records `settled`, `charged = true`, resource path, network, payer address, settlement reference, and signed payload hash.
- Replaying the same signed payload for the same icon inside 30 minutes redelivers without a second settlement.
- Replaying the same signed payload for another icon returns `409`.
- Replaying after the redelivery window returns `410`.

## Remaining Launch Gates

- Decide whether the beta uses the x402.org facilitator for testnet only or CDP for both testnet and mainnet.
- Confirm exact SDK helper behavior for payment requirement expiry, nonce fields, facilitator response shape, and idempotency fields during the wallet test.
- Finalize and legally review the single-icon license draft.
- Verify preview fidelity for the single-icon paid asset so the buyer sees what they will receive.
- Choose production CORS origins. Agent clients do not need browser CORS, but the human browser path does.
- Add monitoring for settlement count, `delivery_failed` rows, and facilitator errors.
