# x402 Payment-Required Resource URL Fix Plan - 2026-07-06

## Purpose

Fix the hosted x402 `PAYMENT-REQUIRED` challenge so agent clients see the public callable Supericons endpoint, not Supabase's internal request URL.

This should be completed before publishing x402 docs, handing the endpoint to external agents, or moving to a controlled mainnet purchase.

## Verified Current Issue

On July 6, 2026, an unpaid hosted request to:

```text
https://kcjmkakdhsqplvasgkjv.supabase.co/functions/v1/x402-premium-icon?pack=agentic-motion&icon=x402-pay
```

returned a `PAYMENT-REQUIRED` header whose decoded `resource.url` was:

```text
http://kcjmkakdhsqplvasgkjv.supabase.co/x402-premium-icon?pack=agentic-motion&icon=x402-pay
```

That URL is malformed for public clients because it uses `http` and omits `/functions/v1/`.

Local source check:

- `supabase/functions/x402-premium-icon/index.ts` currently provides `getUrl: () => req.url` in the HTTP adapter.
- `@x402/core` uses `routeConfig.resource || enrichedContext.adapter.getUrl()` when building the payment-required resource info.
- The route config currently does not set `resource`, so the hosted challenge inherits Supabase's request URL shape.

## Risk

The hosted testnet payment flow can still pass if the client ignores `resource.url` and pays the original endpoint it requested.

However, some agent clients may treat `resource.url` as the resource to retry or document. For those clients, the malformed URL can cause failed payment retries, bad examples, or broken integrations.

## Proposed Fix

Add an explicit public resource URL to the x402 route config instead of relying on `req.url`.

Recommended behavior:

- Default to the hosted Supabase function URL for the current project.
- Allow override through an environment variable, such as `X402_PUBLIC_RESOURCE_BASE_URL` or `X402_PUBLIC_RESOURCE_URL`.
- Build the final resource URL with the known `pack` and `icon` query values.
- Keep the value server-side and non-secret.

Suggested contract:

```text
X402_PUBLIC_RESOURCE_BASE_URL=https://kcjmkakdhsqplvasgkjv.supabase.co/functions/v1/x402-premium-icon
```

Expected `resource.url` after the fix:

```text
https://kcjmkakdhsqplvasgkjv.supabase.co/functions/v1/x402-premium-icon?pack=agentic-motion&icon=x402-pay
```

## Implementation Steps

1. Add a helper in `supabase/functions/x402-premium-icon/index.ts` that returns the public x402 resource URL.

2. Use that helper in the `x402HTTPResourceServer` route config:

```ts
resource: publicResourceUrl(),
```

3. Keep `adapter.getUrl()` unchanged unless the x402 library also needs the public URL for verification. The narrowest fix is setting `routeConfig.resource`, because the library already gives that field precedence.

4. Add a verifier assertion in `scripts/verify-x402-paid-path.ts`:

- Decode `PAYMENT-REQUIRED`.
- Assert `paymentRequired.resource.url` uses `https`.
- Assert the path includes `/functions/v1/x402-premium-icon`.
- Assert query params include `pack=agentic-motion` and `icon=x402-pay`.

5. Document the new non-secret env var near the x402 setup notes if one is added.

## Verification Gates

Run locally or against a test endpoint first:

```powershell
deno check --node-modules-dir=auto --config supabase/functions/x402-premium-icon/deno.json supabase/functions/x402-premium-icon/index.ts
npm run verify:x402-paid-path -- --challenge-only
```

After hosted deploy:

```powershell
supabase functions deploy x402-premium-icon --project-ref kcjmkakdhsqplvasgkjv
$env:X402_TEST_ENDPOINT_URL = "https://kcjmkakdhsqplvasgkjv.supabase.co/functions/v1/x402-premium-icon?pack=agentic-motion&icon=x402-pay"
npm run verify:x402-paid-path -- --challenge-only
```

Then decode one hosted `PAYMENT-REQUIRED` header and confirm:

```text
resource.url == https://kcjmkakdhsqplvasgkjv.supabase.co/functions/v1/x402-premium-icon?pack=agentic-motion&icon=x402-pay
```

If challenge-only passes, rerun one hosted testnet paid-path check before mainnet:

```powershell
$env:X402_ALLOW_HOSTED_DB_MUTATION = "1"
npm run verify:x402-paid-path
```

## Rollback

If the fix causes challenge generation or settlement to fail:

1. Revert the code change.
2. Redeploy `x402-premium-icon`.
3. Run the hosted challenge-only verifier.
4. Keep the x402 UI hidden and do not publish agent-facing docs until the resource URL is corrected.

## Out of Scope

Do not combine this fix with:

- Supabase migration-history reconciliation.
- Mainnet x402 configuration.
- Stripe changes.
- Public UI enablement.
- License text revisions.

Those are separate launch gates.

## Recommended Order From Here

1. Fix the malformed `resource.url`.
2. Deploy and verify hosted challenge-only.
3. Rerun hosted testnet paid path.
4. Separately reconcile Supabase migration history.
5. Confirm live license URL and support mailbox.
6. Decide whether to disable testnet delivery or move promptly to a controlled mainnet purchase test.
