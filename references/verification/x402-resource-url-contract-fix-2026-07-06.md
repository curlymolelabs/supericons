# x402 Resource URL Contract Fix Verification - 2026-07-06

## Scope

Verified the hosted `x402-premium-icon` payment challenge after fixing the x402 `PAYMENT-REQUIRED` `resource.url`.

Hosted endpoint:

```text
https://kcjmkakdhsqplvasgkjv.supabase.co/functions/v1/x402-premium-icon?pack=agentic-motion&icon=x402-pay
```

## Issue Verified Before Fix

Before the function redeploy, the decoded hosted `PAYMENT-REQUIRED` header advertised:

```text
http://kcjmkakdhsqplvasgkjv.supabase.co/x402-premium-icon?pack=agentic-motion&icon=x402-pay
```

That was malformed for public clients because it used `http` and omitted `/functions/v1/`.

## Fix

The function now sets an explicit x402 route `resource` URL instead of falling back to the Supabase request URL.

Resolution order:

1. `X402_PUBLIC_RESOURCE_URL`
2. `X402_PUBLIC_RESOURCE_BASE_URL`
3. `SUPABASE_URL + /functions/v1/x402-premium-icon`
4. Local development fallback

The paid-path verifier now decodes `PAYMENT-REQUIRED` and checks that `resource.url` points at the public x402 endpoint.

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

Pre-deploy verifier against hosted function:

```powershell
$env:X402_TEST_ENDPOINT_URL = "https://kcjmkakdhsqplvasgkjv.supabase.co/functions/v1/x402-premium-icon?pack=agentic-motion&icon=x402-pay"
npm run verify:x402-paid-path -- --challenge-only
```

Result: failed as expected with:

```text
PAYMENT-REQUIRED resource.url has wrong path: http://kcjmkakdhsqplvasgkjv.supabase.co/x402-premium-icon?pack=agentic-motion&icon=x402-pay
```

Hosted deploy:

```powershell
supabase functions deploy x402-premium-icon --project-ref kcjmkakdhsqplvasgkjv
```

Result: deployed.

Hosted challenge-only verifier after deploy:

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

Decoded hosted `PAYMENT-REQUIRED` after deploy:

```text
resource.url = https://kcjmkakdhsqplvasgkjv.supabase.co/functions/v1/x402-premium-icon?pack=agentic-motion&icon=x402-pay
```

Blocked-Origin probe after deploy:

```text
https://blocked.example returned 403 invalid_request
```

Hosted full testnet paid path after deploy:

```powershell
$env:X402_TEST_ENDPOINT_URL = "https://kcjmkakdhsqplvasgkjv.supabase.co/functions/v1/x402-premium-icon?pack=agentic-motion&icon=x402-pay"
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

## Status

The x402 payment challenge now advertises the correct public resource URL on the hosted testnet endpoint.

The endpoint remains testnet-only until the owner separately approves mainnet configuration and a controlled mainnet purchase test.
