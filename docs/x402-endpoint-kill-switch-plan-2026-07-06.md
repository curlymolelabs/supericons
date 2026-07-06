# x402 Endpoint Kill Switch Plan - 2026-07-06

## Purpose

Add a reversible off-switch for the experimental x402 single-icon endpoint.

This is useful in two cases:

- Parking the hosted testnet endpoint if mainnet setup will wait.
- Quickly stopping mainnet payment attempts during an incident without deleting the function.

## Contract

Environment variable:

```text
X402_ENDPOINT_DISABLED=1
```

When enabled, normal `GET` requests should return:

```text
HTTP 503
```

```json
{
  "error": "endpoint_disabled",
  "message": "The x402 single-icon endpoint is temporarily disabled.",
  "charged": false,
  "request_id": "...",
  "support_email": "hello@supericons.dev"
}
```

The disabled path must:

- Return before payment challenge generation.
- Return before database client creation.
- Return before rate-limit counter increments.
- Return before facilitator verification or settlement.
- Keep `OPTIONS` and CORS behavior intact.
- Keep disallowed browser origins rejected with `403`.

## Implementation Plan

1. Add an `endpointDisabled()` helper in `supabase/functions/x402-premium-icon/index.ts`.
2. Check it after CORS and method validation, before parsing the x402 resource and before creating the Supabase admin client.
3. Return a machine-readable `503 endpoint_disabled` JSON response with `charged: false`.
4. Add a comment near the static `resource` URL to warn future maintainers that the singleton route is hardcoded for one resource.
5. Add verifier support for disabled mode:

```powershell
npm run verify:x402-paid-path -- --expect-disabled
```

6. Update the PRD error table and Phase 0 env list.
7. Deploy the function and verify hosted enabled and disabled modes.

## Verification Plan

Enabled mode:

```powershell
$env:X402_TEST_ENDPOINT_URL = "https://kcjmkakdhsqplvasgkjv.supabase.co/functions/v1/x402-premium-icon?pack=agentic-motion&icon=x402-pay"
npm run verify:x402-paid-path -- --challenge-only
```

Disabled mode:

```powershell
supabase secrets set --project-ref kcjmkakdhsqplvasgkjv X402_ENDPOINT_DISABLED=1
$env:X402_TEST_ENDPOINT_URL = "https://kcjmkakdhsqplvasgkjv.supabase.co/functions/v1/x402-premium-icon?pack=agentic-motion&icon=x402-pay"
npm run verify:x402-paid-path -- --expect-disabled
```

Restore enabled mode:

```powershell
supabase secrets set --project-ref kcjmkakdhsqplvasgkjv X402_ENDPOINT_DISABLED=0
npm run verify:x402-paid-path -- --challenge-only
```

## Rollback

If the kill switch causes incorrect behavior:

1. Set `X402_ENDPOINT_DISABLED=0`.
2. Redeploy the previous function version if needed.
3. Run challenge-only verification.
4. Keep the public `$1` UI hidden until the endpoint state is confirmed.

## Recommended Final Hosted State

For now, leave the endpoint enabled only if mainnet setup is happening soon.

If mainnet setup will wait, set `X402_ENDPOINT_DISABLED=1` after verification so testnet faucet USDC cannot keep buying real icon assets.
