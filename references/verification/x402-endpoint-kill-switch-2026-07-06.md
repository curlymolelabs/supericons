# x402 Endpoint Kill Switch Verification - 2026-07-06

## Scope

Added and verified a reversible kill switch for the hosted `x402-premium-icon` Supabase Edge Function.

Hosted endpoint:

```text
https://kcjmkakdhsqplvasgkjv.supabase.co/functions/v1/x402-premium-icon?pack=agentic-motion&icon=x402-pay
```

Kill switch:

```text
X402_ENDPOINT_DISABLED=1
```

## Code Contract

When disabled, normal `GET` requests return:

```text
HTTP 503 endpoint_disabled
charged: false
```

The disabled branch runs after CORS and method validation but before:

- Query/resource parsing.
- Supabase admin client creation.
- Rate-limit counter increment.
- x402 payment challenge generation.
- Facilitator verification or settlement.

The verifier now supports:

```powershell
npm run verify:x402-paid-path -- --expect-disabled
```

## Checks Run

Function type check:

```powershell
deno check --node-modules-dir=auto --config supabase/functions/x402-premium-icon/deno.json supabase/functions/x402-premium-icon/index.ts
```

Result: pass.

Verifier type check:

```powershell
deno check --node-modules-dir=auto scripts/verify-x402-paid-path.ts
```

Result: pass.

Hosted deploy:

```powershell
supabase functions deploy x402-premium-icon --project-ref kcjmkakdhsqplvasgkjv
```

Result: deployed.

Hosted enabled challenge-only check:

```powershell
$env:X402_TEST_ENDPOINT_URL = "https://kcjmkakdhsqplvasgkjv.supabase.co/functions/v1/x402-premium-icon?pack=agentic-motion&icon=x402-pay"
npm run verify:x402-paid-path -- --challenge-only
```

Result:

```text
[PASS] origin-allowlist: Disallowed browser origin is rejected before payment handling.
[PASS] resource-url: PAYMENT-REQUIRED resource.url points at the public x402 endpoint.
[PASS] unpaid-402: Endpoint returned 402 with PAYMENT-REQUIRED.
[SKIP] paid-path: Challenge-only mode does not sign or settle a payment.
```

Hosted disabled check:

```powershell
supabase secrets set --project-ref kcjmkakdhsqplvasgkjv X402_ENDPOINT_DISABLED=1
npm run verify:x402-paid-path -- --expect-disabled
```

Result:

```text
[PASS] origin-allowlist: Disallowed browser origin is rejected before payment handling.
[PASS] endpoint-disabled: Endpoint returned 503 without payment terms while disabled.
```

Hosted re-enable check:

```powershell
supabase secrets set --project-ref kcjmkakdhsqplvasgkjv X402_ENDPOINT_DISABLED=0
npm run verify:x402-paid-path -- --challenge-only
```

Result:

```text
[PASS] origin-allowlist: Disallowed browser origin is rejected before payment handling.
[PASS] resource-url: PAYMENT-REQUIRED resource.url points at the public x402 endpoint.
[PASS] unpaid-402: Endpoint returned 402 with PAYMENT-REQUIRED.
[SKIP] paid-path: Challenge-only mode does not sign or settle a payment.
```

Hosted full testnet paid path with switch off:

```powershell
$env:X402_ALLOW_HOSTED_DB_MUTATION = "1"
npm run verify:x402-paid-path
```

Result:

```text
[PASS] origin-allowlist: Disallowed browser origin is rejected before payment handling.
[PASS] resource-url: PAYMENT-REQUIRED resource.url points at the public x402 endpoint.
[PASS] unpaid-402: Endpoint returned 402 with PAYMENT-REQUIRED.
[PASS] payment-signature: Created PAYMENT-SIGNATURE from local testnet wallet.
[PASS] paid-delivery: Settlement returned one icon payload and PAYMENT-RESPONSE.
[PASS] redelivery: Same signed payment redelivered inside retry window.
[PASS] different-resource-replay: Same signed payment cannot buy a different icon.
[PASS] force-redelivery-expiry: Updated audit row expiry in local/test DB.
[PASS] expired-redelivery: Expired retry window returned 410.
```

Final hosted disabled check:

```powershell
supabase secrets set --project-ref kcjmkakdhsqplvasgkjv X402_ENDPOINT_DISABLED=1
npm run verify:x402-paid-path -- --expect-disabled
```

Result:

```text
[PASS] origin-allowlist: Disallowed browser origin is rejected before payment handling.
[PASS] endpoint-disabled: Endpoint returned 503 without payment terms while disabled.
```

Direct hosted response while disabled:

```text
HTTP/1.1 503 Service Unavailable
Retry-After: 300

{"error":"endpoint_disabled","message":"The x402 single-icon endpoint is temporarily disabled.","charged":false,...}
```

No `PAYMENT-REQUIRED` header was returned in disabled mode.

## Final Hosted State

The hosted testnet endpoint is intentionally parked:

```text
X402_ENDPOINT_DISABLED=1
```

To re-enable for a controlled test:

```powershell
supabase secrets set --project-ref kcjmkakdhsqplvasgkjv X402_ENDPOINT_DISABLED=0
npm run verify:x402-paid-path -- --challenge-only
```

Do not publish agent-facing docs or expose the `$1` UI until mainnet setup is approved and verified.
