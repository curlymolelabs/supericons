# x402 Rate Limit RPC and Paid Path Verification - 2026-07-06

## Scope

Verified the follow-up hardening pass for the `x402-premium-icon` beta endpoint:

- Replaced read-then-write rate limiting with an atomic Postgres RPC.
- Added `asset_unavailable` for pre-settlement asset assembly failures.
- Updated the PRD error contract and acceptance criteria.
- Added redacted audit diagnostics to the paid-path verifier.

## Migration Smoke

Temp local Supabase project was reset with:

- `20260706000000_x402_single_icon_payments.sql`
- `20260706112000_x402_rate_limit_rpc.sql`
- Temp-only `premium-icons` bucket setup

SQL checks:

```sql
select public.si_x402_increment_rate_limit('smoke'::text, '2026-07-06T00:00:00Z'::timestamptz, 60::integer);
select public.si_x402_increment_rate_limit('smoke'::text, '2026-07-06T00:00:00Z'::timestamptz, 60::integer);
select request_count from public.si_x402_rate_limit_counters where bucket_key='smoke';
```

Result:

- First increment returned `1`.
- Second increment returned `2`.
- Stored counter was `2`.
- RPC is `security definer`.
- Execute privilege is limited to `postgres` and `service_role`.

Rollback plan:

```sql
drop function if exists public.si_x402_increment_rate_limit(text, timestamptz, integer);
```

## Function Verification

Commands run:

```powershell
deno check --node-modules-dir=auto --config supabase/functions/x402-premium-icon/deno.json supabase/functions/x402-premium-icon/index.ts
deno check --node-modules-dir=auto scripts/verify-x402-paid-path.ts
npm run verify:x402-phase0-artifacts
npm run verify:x402-paid-path -- --challenge-only
npm run verify:x402-paid-path
```

Results:

- Function type check: PASS
- Paid-path verifier type check: PASS
- Phase 0 artifact verifier: PASS
- Challenge-only verifier: PASS
- Full paid-path verifier: PASS

Full paid-path checks passed:

- Disallowed browser origin rejected before payment handling.
- Unpaid request returned `402` with `PAYMENT-REQUIRED`.
- Signed payment was created from the local testnet wallet.
- Settlement returned one icon payload and `PAYMENT-RESPONSE`.
- Same signed payment redelivered inside retry window.
- Same signed payment could not buy a different icon.
- Forced-expired redelivery returned `410`.

## Rate-Limit Endpoint Smoke

With temp env `X402_RATE_LIMIT_MAX_REQUESTS=1`:

- Request 1 returned `402`.
- Request 2 returned `429`.
- Database counter stored `2`.

## Audit Sanity

Latest local audit row after the full paid-path run:

- `status`: `redelivered`
- `charged`: `true`
- `last_error_code`: empty
- Settlement reference present: yes
- Transaction hash present: yes
- Payment response header present: yes

No production systems or real-money payments were touched.
