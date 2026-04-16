# Launch Readiness Verification

Date: April 14-15, 2026
Scope: final launch evidence for Supericons after live domain, billing, converter, package, hosted Motion Lab, and local-only admin hardening verification work completed

## Live Evidence Captured

### 1. Domain, Hosting, and Production Site

- `supericons.dev` is live on Netlify with working HTTPS
- `www.supericons.dev` redirects to the apex domain
- the latest production build was deployed successfully
- the operator reported a live smoke pass after deployment
- Umami analytics was verified live on April 15, 2026:
  - `https://cloud.umami.is/script.js` loaded successfully
  - the live send request returned `200`
  - the request chain confirmed production analytics traffic from `supericons.dev`

### 2. Supabase Auth and Email Configuration

Dashboard verification completed:
- `Site URL` is `https://supericons.dev`
- redirect URLs include:
  - `https://supericons.dev`
  - `http://localhost:5173`
  - `https://lucky-faun-ce5f0.netlify.app`
- Google provider is enabled with a configured client ID, client secret, and the expected Supabase callback URL
- auth rate-limit settings were reviewed and are launch-safe
- SMTP is configured through Resend with branded sender details

Operator-confirmed:
- auth flows were already tested extensively on the live stack before this final pass
- admin maintenance is now local-only:
  - `admin-api` accepts only `http://localhost:5173`
  - production `/admin` and `/admin.html` no longer expose the admin dashboard
  - the rotated `ADMIN_SECRET` was re-tested successfully from local `admin.html`

### 3. Stripe Billing and Entitlements

Verified live:
- live Stripe checkout opens successfully
- live customer portal opens successfully
- live Stripe payment flow succeeded previously on the production path
- cancellation-scheduled billing email now sends successfully
- `si_billing_notifications` logs the cancellation event for idempotency
- `current_period_end` is now populated correctly and the billing email includes the real end date
- the Supabase Stripe secret key was replaced with a new live key and both checkout and portal were reverified afterward

Important deployment note:
- `create-portal` and `stripe-webhook` rely on the correct Supabase deployment mode and must not be treated as generic redeploys

### 4. Railway Converter Runtime

Verified live:
- the Railway-backed converter service is already deployed
- the converter flow was exercised from the live production site
- no converter-service code changes were made afterward, so no new Railway deploy was needed
- the production bundle was rebuilt with the Railway converter URL embedded so live and local converter quality now match

### 5. MCP Package and Registry

Verified live:
- `supericons-mcp@0.3.1` is published
- `0.3.0` is deprecated
- clean-install proof succeeded in a fresh temp folder
- `npx -y supericons-mcp@latest` starts successfully

### 6. Motion Lab Hosted Runtime

Verified live:
- the distinct `motion-lab-session` `429` proof was captured
- the normal threshold was restored afterward
- a post-restore sanity pass succeeded

Important deployment note:
- `motion-lab-session` must be deployed with `--no-verify-jwt`

### 7. Mobile / Tablet Minimum

Operator-confirmed:
- the launch minimum was completed at a desktop-first level
- this is intentionally not a full mobile-parity claim

### 8. Pre-Launch Data Hygiene

Operator-confirmed:
- pre-launch test users were removed from Supabase
- the only remaining Stripe oddity is the known guest-customer residue for some one-time purchase flows
- that guest-customer behavior is documented as a future cleanup-consistency improvement, not a launch blocker

## Checks Treated As Non-Blocking For Launch

These are still useful, but are not treated as hard release blockers:

- uptime monitoring setup
- Search Console submission
- social preview checks
- cookie-consent follow-up if later needed for specific jurisdictions

## Residual Risk

- rollback and outage handling are now documented, but not fully rehearsed as a live drill
- docs routing remains shell-first for launch; clean `/docs/...` deep routes are explicitly deferred
- mobile/tablet support is accepted at the current launch minimum, not a full parity standard
- observability is adequate for a solo launch, but not deeply instrumented

## Evidence Sources

- [launch-checklist-status.md](../../launch-checklist-status.md)
- [launch-jtbd.md](../../launch-jtbd.md)
- [launch-rollback-outage-note.md](../../launch-rollback-outage-note.md)
- [docs-canonical-route-decision-2026-04-14.md](../docs-canonical-route-decision-2026-04-14.md)
