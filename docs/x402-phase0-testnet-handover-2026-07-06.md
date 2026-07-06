# x402 Phase 0 Testnet Handover

Date: 2026-07-06
Purpose: hand off the funded testnet wallet setup so the implementing agent can build and run the paid-path verification (Phase 0 completion into Phase 1 start).
References:
- `docs/supericons-x402-single-icon-payment-prd-2026-07-06.md` (v3, authoritative spec)
- `docs/x402-phase-0-technical-spike-2026-07-06.md` (spike report)
- `supabase/functions/_shared/x402-single-icon-config.ts` (shared config)
- `supabase/migrations/20260706_x402_single_icon_payments.sql` (draft migration, not applied)

## Wallet setup completed by the owner

- MetaMask installed in Chrome with a dedicated throwaway wallet (testnet only, never to hold real funds).
- Base Sepolia network added (chain ID 84532, RPC sepolia.base.org).
- Account 1 "SI Buyer Testnet": the test buyer wallet, funded with Base Sepolia ETH (CDP faucet) and 10 testnet USDC (Circle faucet, contract 0x036CbD53842c5426634e7929541eC2318f3dCF7e).
- Account 2 "SI Receiving Testnet": the merchant receiving wallet, unfunded by design.

## Credentials and config location

All values are in `supabase/.env.local` (gitignored). Variables:

```txt
X402_TEST_BUYER_PRIVATE_KEY   buyer wallet private key (SECRET: read from env only, never print, log, or commit)
X402_RECEIVING_ADDRESS        merchant receiving address (Account 2)
X402_TEST_WALLET_ADDRESSES    comma-separated buyer + receiving addresses, excluded from organic metrics
X402_FACILITATOR_URL          https://x402.org/facilitator (keyless testnet facilitator for this first run)
X402_NETWORK                  eip155:84532 (Base Sepolia)
X402_SUPPORT_EMAIL            hello@supericons.dev
```

Rules for the agent:
- Read the private key from the env file at runtime only. Never echo it, write it to another file, include it in a commit, or send it to any service other than signing the test payment.
- Addresses may be printed and committed; keys may not.

## Task: run the paid-path verification

Implement and execute the paid-path verifier described in the spike report ("Paid-Path Verification Still Required"). It must prove, on Base Sepolia against the x402.org facilitator:

1. Unpaid GET returns 402 with valid v2 payment terms.
2. Buyer signs and retries with the v2 payment header; facilitator settlement succeeds.
3. Endpoint returns exactly one icon SVG plus scoped CSS and the settlement response header.
4. Audit row records settled, charged = true, resource, network, payer address, settlement reference, and signed payload hash.
5. Replaying the same signed payload for the same icon within 30 minutes redelivers without a second settlement.
6. Replaying the same signed payload for a different icon returns 409.
7. Replaying after the redelivery window returns 410.

Prerequisite: this requires the `x402-premium-icon` function and the migration to exist at least locally (supabase local dev / test project). The migration has NOT been applied anywhere yet; apply it only to a local or test database, not production, until the owner approves.

## Fixes required before or during this task (from PRD v3 review)

1. Migration is missing columns the PRD v3 schema requires: `paid_at`, `delivered_at`, `redelivery_expires_at`, `transaction_hash`, and the `duplicate` status. Restore them or amend the PRD deliberately; the 30-minute window and 410 logic need a settlement timestamp or expiry column.
2. The spike report's "Planned Endpoint Shape" error codes (401/403/500 variants) contradict the PRD v3 error contract (402 payment_verification_failed, 503 delivery_failed_after_settlement, 503 facilitator_unavailable). The PRD contract is authoritative; update the spike report to reference it.
3. Support email is resolved to `hello@supericons.dev` to match the public Supericons terms and contact copy.
4. In `x402-single-icon-config.ts`, `cssPath` points at the full pack stylesheet. It is the extraction source only; the endpoint must never serve it raw. Add a comment saying so.

## Boundaries

- Testnet only. No mainnet transactions, no mainnet keys, no production deploys, no production migration, no changes to Stripe flows.
- Do not commit unless the owner asks.
- The visible $1 button stays hidden; no UI exposure in this task.
- Costs: everything in this task uses faucet funds and a keyless facilitator; there should be zero real-money spend.

## Definition of done

All eight verification checks above pass against a locally served endpoint on Base Sepolia, with command output captured in a short results report saved under `docs/` (for example `docs/x402-phase0-paid-path-results-<date>.md`), plus the four fixes above resolved or explicitly deferred with the owner's approval. That closes Phase 0; Phase 1 (hidden agent beta, controlled mainnet purchase) is a separate approval.
