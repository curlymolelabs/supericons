# x402 Phase 0 Paid-Path Results

Date: July 6, 2026
Status: Passed against local Supabase and Base Sepolia testnet.

## Summary

The experimental x402 single-icon payment path was verified for the hardcoded `agentic-motion/x402-pay` resource.

The test used:

- Local throwaway Supabase stack under `.tmp/x402-supabase`.
- Local private `premium-icons` storage bucket populated with Agentic Motion assets.
- Base Sepolia testnet funds.
- x402.org testnet facilitator.

No production database, production storage, mainnet wallet, Stripe flow, or public UI was changed.

## Why a Throwaway Supabase Stack Was Used

The repo's normal local Supabase startup is currently blocked by older migration files that share the same `20260324` version prefix. Supabase's migration ledger requires unique versions, so startup fails before reaching the x402 migration.

To avoid renaming historical migrations or changing production migration history, the verification used a disposable local Supabase project with only the x402 schema and a local private storage bucket.

## Commands Verified

```txt
deno check --node-modules-dir=auto --config supabase/functions/x402-premium-icon/deno.json supabase/functions/x402-premium-icon/index.ts
deno check --node-modules-dir=auto scripts/verify-x402-paid-path.ts
npm run verify:x402-phase0-artifacts
npm run upload:premium-pack-storage
npm run verify:premium-pack-storage
npm run verify:x402-paid-path
```

## Paid-Path Results

The full verifier passed:

- Unpaid request returned HTTP `402` with `PAYMENT-REQUIRED`.
- Buyer test wallet created `PAYMENT-SIGNATURE`.
- Settlement returned one icon payload plus `PAYMENT-RESPONSE`.
- Same signed payment redelivered inside the retry window.
- Same signed payment against a different icon returned `409`.
- Forced expired redelivery returned `410`.

Audit sanity query confirmed:

- One payment row was created.
- One charged row was recorded.
- Payment response, settlement reference, and transaction hash were present.
- Forced redelivery expiry was exercised.
- Final row status was `redelivered`.

## Remaining Before Phase 1

- Decide whether to repair/rename old local migration prefixes in a separate cleanup task.
- Keep the visible `$1` purchase button hidden until the hidden beta is explicitly approved.
- Confirm production support email before it appears in customer-facing error responses.
- Do not deploy the x402 function or apply the x402 migration to production without separate approval.
