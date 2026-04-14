# Launch Readiness Verification

Date: April 14, 2026
Scope: launch readiness check for Supericons across infrastructure, package publish state, runtime inventory, local production smoke, and Motion Lab hosted verification prerequisites

## Scope

- verify the current public infrastructure truth outside the repo
- write a minimal env/runtime inventory
- run a smoke pass against a local production build because the public domain is not resolving
- verify `supericons-mcp` local publish readiness and registry status
- attempt the live `motion-lab-session` `429` verification path
- produce evidence for a release go/no-go decision

## Checks Run

- `Resolve-DnsName supericons.dev -Type NS`
  Result: `supericons.dev` currently uses `dns1.registrar-servers.com` and `dns2.registrar-servers.com`

- `Resolve-DnsName supericons.dev -Type A`
  Result: no public A record resolved; only SOA/authority data was returned

- `Resolve-DnsName www.supericons.dev -Type CNAME`
  Result: `www.supericons.dev` does not exist

- `Resolve-DnsName api.supericons.dev -Type CNAME`
  Result: `api.supericons.dev` does not exist

- `curl.exe -I https://supericons.dev`
  Result: hostname did not resolve, so the production domain is not reachable

- `npm view supericons-mcp version`
  Result: `404 Not Found`; package is not published on npm

- `npm whoami`
  Result: registry auth is not healthy in this shell

- `curl.exe -i https://kcjmkakdhsqplvasgkjv.supabase.co/auth/v1/settings -H "apikey: ..."`
  Result: public auth settings endpoint responded `200 OK`; email auth and Google auth are enabled, anonymous users are disabled

- `curl.exe -i https://kcjmkakdhsqplvasgkjv.supabase.co/functions/v1/validate-mcp-key ...`
  Result: endpoint responded `200 OK` with `Invalid or revoked API key` for a bogus hash, confirming the function is live and behaving as expected

- `Invoke-WebRequest https://kcjmkakdhsqplvasgkjv.supabase.co/functions/v1/motion-lab-session ...`
  Result: endpoint responded `401 Unauthorized` with `motion_lab_auth_required` for an invalid key hash, confirming the auth gate is live

- `Invoke-WebRequest https://kcjmkakdhsqplvasgkjv.supabase.co/functions/v1/create-checkout ...`
  Result: endpoint responded `401 Unauthorized` without a user session, confirming anonymous checkout is blocked

- `Invoke-WebRequest https://kcjmkakdhsqplvasgkjv.supabase.co/functions/v1/create-portal ...`
  Result: endpoint responded `401 Unauthorized` without a user session, confirming anonymous portal access is blocked

- `npm run build`
  Result: passed; production build completed successfully

- local preview via `npm run preview -- --host 127.0.0.1 --port 4173`
  Result: local production preview served successfully

- local manual smoke on desktop (`1279x851` actual screenshot capture)
  Result: app shell loaded, icon grid rendered, search for `heart` filtered results, icon selection worked, customize panel opened, `Copy SVG` succeeded, pricing and privacy routes opened from the app shell

- local manual smoke on phone (`390x844`)
  Result: docs page loaded, header docs-menu button showed `Open docs navigation`, drawer opened successfully, docs content remained readable

- local manual smoke on tablet (`834x1112`)
  Result: pricing page rendered with usable two-column cards and shell navigation intact

- Playwright console error review
  Result: no browser console errors were captured during the local smoke pass

- `npm --prefix ./mcp run verify:package`
  Result: passed; package contents verified at 12 files

- `npm run verify:motion-lab-mcp-clean-install`
  Result: passed; clean-install smoke verified Motion Lab package imports and preset payloads

- `npm run verify:converter-mcp-clean-install`
  Result: passed; clean-install smoke verified converter flows and invalid-input handling

- `npm publish ./mcp`
  Result: failed with registry `E404`; package did not publish

- launch runtime inventory written at [launch-runtime-inventory.md](../../launch-runtime-inventory.md)
  Result: completed; owner-role slots, env vars, and rollback notes are now documented in-repo

## Checks Not Run

- production smoke on `https://supericons.dev`
  Why it was not run: the hostname does not currently resolve
  Risk created by that gap: no proof of custom domain, SSL, production headers, or deployed site behavior

- live Stripe purchase and subscription smoke
  Why it was not run: no live domain, no authenticated test account in this session, and no direct Stripe dashboard evidence
  Risk created by that gap: live checkout, webhook, portal, and entitlement sync remain unproven

- Supabase dashboard verification for Site URL, redirect URLs, RLS, SMTP, and branded email templates
  Why it was not run: dashboard access is outside the repo and not available in this session
  Risk created by that gap: auth and email configuration could still drift from repo expectations

- live `motion-lab-session` `429` proof
  Why it was not run: `SUPERICONS_API_KEY` is not present in this shell, and the verifier also expects a controlled threshold change for deterministic proof
  Risk created by that gap: the distinct pre-launch rate-limit proof remains open

- authenticated npm publish verification through `npx -y supericons-mcp`
  Why it was not run: registry publish failed
  Risk created by that gap: the public install path does not exist yet

- explicit observability and alerting review
  Why it was not run: no dedicated observability inventory or alert proof was available in this pass
  Risk created by that gap: runtime failure detection may still depend on manual noticing

## Failures

- Production domain unresolved
  Evidence: `curl.exe -I https://supericons.dev` failed with host resolution error; `www` and `api` subdomains also do not exist
  Current status: blocker

- npm publish failed
  Evidence: `npm publish ./mcp` returned `E404 Not Found - PUT https://registry.npmjs.org/supericons-mcp`
  Current status: blocker

- Live infrastructure ownership is still unnamed
  Evidence: [launch-runtime-inventory.md](../../launch-runtime-inventory.md) records owner roles but no named human owners from repo evidence
  Current status: blocker for operational readiness

## Residual Risk

- Local production smoke is positive, but it does not substitute for a real production-domain smoke pass.
- Stripe live mode, webhook wiring, and billing emails remain unverified end to end.
- Supabase dashboard settings are only partially inferable from public endpoints.
- The distinct live `motion-lab-session` `429` proof remains open.
- Release rollback exists only as an untested plan, not a rehearsed procedure.
