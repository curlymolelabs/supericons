# x402 Mainnet Prep: License and Deploy Gate - 2026-07-06

## Scope

Prepared the remaining non-code launch gates that can be handled safely from the repo:

- Support mailbox decision
- Public single-icon license URL
- Netlify route for the license URL
- Build verification for the static license page
- Hosted Supabase deployment readiness check

## Decisions

- Support email: `hello@supericons.dev`
- License URL path: `/legal/supericons-single-icon-license`
- Production origins expected for x402 browser requests:
  - `https://supericons.dev`
  - `https://www.supericons.dev`

## Files Updated

- `supabase/functions/_shared/x402-single-icon-config.ts`
- `docs/legal/supericons-single-icon-license-draft-2026-07-06.md`
- `docs/x402-phase0-testnet-handover-2026-07-06.md`
- `netlify.toml`
- `public/legal/supericons-single-icon-license/index.html`

## Verification

Commands run:

```powershell
deno check --node-modules-dir=auto --config supabase/functions/x402-premium-icon/deno.json supabase/functions/x402-premium-icon/index.ts
npm exec vite -- build
Test-Path scripts/preflight_release_checks.py
```

Results:

- Edge Function type check: PASS
- Vite build: PASS
- Release preflight script: NOT RUN, `scripts/preflight_release_checks.py` is not present in this repo
- Built file exists: `dist/legal/supericons-single-icon-license/index.html`
- Built license page contains `hello@supericons.dev`
- Built license page does not contain `support@supericons.dev`

## Hosted Supabase Deployment Gate

Attempted to inspect hosted Supabase project access:

```powershell
supabase projects list --output json
```

Result:

- BLOCKED: Supabase CLI returned `Unauthorized`.

No hosted migration or hosted function deploy was attempted after that authorization failure.

## Next Authenticated Steps

Run from an authenticated terminal:

```powershell
supabase login
supabase db push --dry-run --linked
supabase db push --linked
supabase functions deploy x402-premium-icon --project-ref kcjmkakdhsqplvasgkjv
```

After deploy, run hosted challenge-only verification with the hosted endpoint URL:

```powershell
$env:X402_TEST_ENDPOINT_URL = "https://kcjmkakdhsqplvasgkjv.supabase.co/functions/v1/x402-premium-icon?pack=agentic-motion&icon=x402-pay"
npm run verify:x402-paid-path -- --challenge-only
```

Then check hosted CORS behavior for the allowlist:

- Disallowed `Origin` should return `403` before payment handling.
- Allowed production origins should be accepted.
- Server or agent requests without `Origin` should still receive normal x402 payment terms.

Do not run a controlled mainnet purchase until the hosted challenge-only and CORS checks pass.
