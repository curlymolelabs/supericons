# x402 Phase 0 Paid-Path Verification

Date: July 6, 2026
Status: Passed against a throwaway local Supabase stack and Base Sepolia testnet funds.

## Scope

This verification covers the new local `x402-premium-icon` endpoint and testnet paid-path verifier.

No mainnet payment, production deployment, production migration, or Stripe change was performed.

## Evidence

Commands run:

```txt
deno check --node-modules-dir=auto --config supabase/functions/x402-premium-icon/deno.json supabase/functions/x402-premium-icon/index.ts
deno check --node-modules-dir=auto scripts/verify-x402-paid-path.ts
npm run verify:x402-phase0-artifacts
npm run verify:x402-paid-path -- --challenge-only
```

Results:

- Function type/module check: passed.
- Paid-path verifier type/module check: passed.
- Phase 0 artifact verifier: passed.
- Local unpaid challenge: passed. The function returned HTTP 402 with a `PAYMENT-REQUIRED` header from `http://127.0.0.1:8000/?pack=agentic-motion&icon=x402-pay`.

## Full Paid-Path Results

After Docker was started, the repo's normal local Supabase startup was still blocked by pre-existing duplicate migration version prefixes from March 2026. To avoid editing historical migrations, a throwaway local Supabase project was created under `.tmp/x402-supabase` with only the x402 schema and a local private `premium-icons` bucket.

The Agentic Motion pack was uploaded to the throwaway local bucket and verified:

```txt
npm run upload:premium-pack-storage
npm run verify:premium-pack-storage
```

The full paid-path verifier then passed:

```txt
npm run verify:x402-paid-path
```

Observed verifier results:

- `unpaid-402`: passed.
- `payment-signature`: passed.
- `paid-delivery`: passed.
- `redelivery`: passed.
- `different-resource-replay`: passed.
- `force-redelivery-expiry`: passed.
- `expired-redelivery`: passed.

Audit sanity query result:

- Payment rows: `1`
- Charged rows: `1`
- `PAYMENT-RESPONSE` stored: true
- Settlement reference stored: true
- Transaction hash stored: true
- Forced expiry exercised: true
- Final status observed: `redelivered`

## Safety Notes

The full verifier refuses to mutate a hosted Supabase database unless `X402_ALLOW_HOSTED_DB_MUTATION=1` is deliberately set.

The successful full run used local Supabase storage and database state plus Base Sepolia testnet funds. No production migration, hosted database mutation, mainnet payment, Stripe change, or UI exposure was performed.
