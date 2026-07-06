# x402 Hosted Deploy and Paid-Path Verification - 2026-07-06

## Scope

Verified the hosted `x402-premium-icon` Supabase Edge Function after the first hosted deployment attempt.

Project ref: `kcjmkakdhsqplvasgkjv`

Endpoint checked:

```text
https://kcjmkakdhsqplvasgkjv.supabase.co/functions/v1/x402-premium-icon?pack=agentic-motion&icon=x402-pay
```

## What Happened

The function deploy completed, but `supabase db push --dry-run --linked` and `supabase db push --linked` both stopped because the remote migration history contains `20260314102246`, which is not present in the local migrations directory.

Because the function was already deployed and the normal unpaid challenge returned `500`, I checked the exact required x402 database objects:

```sql
select
  to_regclass('public.si_x402_icon_payments') as icon_payments_table,
  to_regclass('public.si_x402_rate_limit_counters') as rate_limit_table,
  to_regprocedure('public.si_x402_increment_rate_limit(text,timestamp with time zone,integer)') as rate_limit_rpc;
```

Initial result: all three were `NULL`.

To avoid repairing or rewriting remote migration history during the x402 release check, I applied only these two scoped SQL files directly to the linked database:

```powershell
supabase db query --linked --file supabase/migrations/20260706_x402_single_icon_payments.sql
supabase db query --linked --file supabase/migrations/20260706112000_x402_rate_limit_rpc.sql
```

After applying them, the same object check returned:

```text
si_x402_icon_payments
si_x402_rate_limit_counters
si_x402_increment_rate_limit(text,timestamp with time zone,integer)
```

## Hosted Secrets

The hosted function then failed with `Missing X402_RECEIVING_ADDRESS`.

I set only the server-side x402 runtime values from `supabase/.env.local`:

```text
X402_RECEIVING_ADDRESS
X402_NETWORK
X402_FACILITATOR_URL
X402_SUPPORT_EMAIL
X402_TEST_WALLET_ADDRESSES
```

I did not upload `X402_TEST_BUYER_PRIVATE_KEY` to Supabase secrets.

## Verification Results

Hosted challenge-only verifier:

```powershell
$env:X402_TEST_ENDPOINT_URL = "https://kcjmkakdhsqplvasgkjv.supabase.co/functions/v1/x402-premium-icon?pack=agentic-motion&icon=x402-pay"
npm run verify:x402-paid-path -- --challenge-only
```

Result:

```text
[PASS] origin-allowlist: Disallowed browser origin is rejected before payment handling.
[PASS] unpaid-402: Endpoint returned 402 with PAYMENT-REQUIRED.
[SKIP] paid-path: Challenge-only mode does not sign or settle a payment.
```

Hosted CORS probes:

```powershell
curl.exe -i -s -H "Origin: https://blocked.example" -H "Accept: application/json" "https://kcjmkakdhsqplvasgkjv.supabase.co/functions/v1/x402-premium-icon?pack=agentic-motion&icon=x402-pay"
curl.exe -i -s -H "Origin: https://supericons.dev" -H "Accept: application/json" "https://kcjmkakdhsqplvasgkjv.supabase.co/functions/v1/x402-premium-icon?pack=agentic-motion&icon=x402-pay"
curl.exe -i -s -H "Accept: application/json" "https://kcjmkakdhsqplvasgkjv.supabase.co/functions/v1/x402-premium-icon?pack=agentic-motion&icon=x402-pay"
```

Results:

```text
Blocked browser origin: 403 invalid_request
Allowed browser origin: 402 payment_required with PAYMENT-REQUIRED
No-Origin agent request: 402 payment_required with PAYMENT-REQUIRED
```

Hosted full testnet paid-path verifier:

```powershell
$env:X402_TEST_ENDPOINT_URL = "https://kcjmkakdhsqplvasgkjv.supabase.co/functions/v1/x402-premium-icon?pack=agentic-motion&icon=x402-pay"
$env:X402_ALLOW_HOSTED_DB_MUTATION = "1"
npm run verify:x402-paid-path
```

Result:

```text
[PASS] origin-allowlist: Disallowed browser origin is rejected before payment handling.
[PASS] unpaid-402: Endpoint returned 402 with PAYMENT-REQUIRED.
[PASS] payment-signature: Created PAYMENT-SIGNATURE from local testnet wallet.
[PASS] paid-delivery: Settlement returned one icon payload and PAYMENT-RESPONSE.
[PASS] redelivery: Same signed payment redelivered inside retry window.
[PASS] different-resource-replay: Same signed payment cannot buy a different icon.
[PASS] force-redelivery-expiry: Updated audit row expiry in local/test DB.
[PASS] expired-redelivery: Expired retry window returned 410.
```

## Remaining Issue

The Supabase remote migration history still needs a separate cleanup decision.

Current blocker:

```text
Remote migration versions not found in local migrations directory.
Missing remote version: 20260314102246
```

Do not run `supabase migration repair` as part of x402 payment testing without first deciding whether `20260314102246` should be represented locally, marked reverted, or reconciled by a clean `supabase db pull` workflow.

## Status

The hosted testnet x402 endpoint is verified for:

- Origin enforcement.
- Unpaid HTTP 402 challenge.
- Testnet payment signature flow.
- Settlement and single-icon delivery.
- Redelivery inside the retry window.
- Replay rejection for a different icon.
- Expired redelivery returning 410.

The endpoint is ready for the next gated step: a controlled mainnet configuration and purchase test, after the owner approves the move from testnet to mainnet.
