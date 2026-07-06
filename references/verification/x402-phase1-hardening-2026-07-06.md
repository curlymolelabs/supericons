# x402 Phase 1 Hardening Verification - 2026-07-06

## Scope

Verified the first hardening pass for the `x402-premium-icon` Supabase Edge Function:

- Origin allowlist before payment handling
- Basic per-IP/resource rate limiting
- Correct pre-settlement delivery failure error naming
- Explicit facilitator unavailable response path
- Paid-path verifier update for the origin allowlist check

## Verification

Commands run:

```powershell
deno check --node-modules-dir=auto --config supabase/functions/x402-premium-icon/deno.json supabase/functions/x402-premium-icon/index.ts
deno check --node-modules-dir=auto scripts/verify-x402-paid-path.ts
npm run verify:x402-paid-path -- --challenge-only
```

Results:

- Function type check: PASS
- Paid-path verifier type check: PASS
- Challenge-only verifier: PASS
  - `origin-allowlist`: PASS, disallowed browser origin returned `403`
  - `unpaid-402`: PASS, unpaid request returned `402` with `PAYMENT-REQUIRED`
  - Paid settlement: SKIP by challenge-only mode

Manual local rate-limit probe:

- Temp local limit set to `X402_RATE_LIMIT_MAX_REQUESTS=1`
- Request 1 returned `402`
- Request 2 returned `429`
- Result: PASS

## Paid Settlement Retry

A full paid-path retry was attempted against the local temp stack. It reached settlement, but the testnet facilitator/RPC rejected the transaction before delivery.

Observed local audit state:

- Latest attempt status: `verify_failed`
- `charged`: `false`
- Settlement reference: absent
- Transaction hash: absent
- Error source: Base Sepolia RPC rejected `eth_sendRawTransaction`

The buyer test wallet still had test USDC but only a small Base Sepolia ETH balance for gas. No production system or real-money payment was touched.

## CORS Note

The local Supabase/Kong gateway injects `access-control-allow-origin: *` even when the function sends a specific origin. Because of that gateway behavior, the hardening is implemented as an application-level Origin allowlist:

- Browser requests with a disallowed `Origin` are rejected with `403` before payment handling.
- Agent/server requests without an `Origin` remain eligible for the normal x402 flow.

This should be rechecked on hosted Supabase before enabling a browser-facing UI for x402.
