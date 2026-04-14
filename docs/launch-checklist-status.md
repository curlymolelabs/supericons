# Launch Checklist Status

Last updated: April 14, 2026

This note converts the raw [launch checklist](./launch-checklist.md) into a repo-backed status snapshot.

Scope note:
- this started as a repo-backed status note and now also includes live operator evidence captured on April 14, 2026
- `Implemented, verify` means the code or static asset exists in the repo, but the live service or dashboard still needs proof
- `Verified live` means the production path was exercised directly and the result is now known
- `Open before launch` means the repo does not prove readiness yet, or the item is inherently operational
- keep the raw checklist as the operator checklist and use this file to decide what we should do next

## Snapshot

Looks materially built in the repo:
- Netlify deploy config and SPA routing
- Supabase auth surface and edge-function code
- Stripe checkout, portal, and webhook code paths
- docs, troubleshooting, and docs mobile/tablet drawer behavior
- legal pages, OG image, sitemap, robots, and Umami tagging
- MCP package source and package manifest

Verified live on April 14, 2026:
- `supericons.dev` DNS, SSL, and Netlify production hosting
- latest production deploy and live smoke pass
- live Stripe payment flow
- live Stripe customer-portal flow after the `--no-verify-jwt` redeploy correction
- live cancellation-scheduled billing email delivery plus idempotency logging
- live `current_period_end` repair and date-specific cancellation email copy
- live Stripe secret-key replacement validated through portal and checkout
- npm publish and clean-install proof for `supericons-mcp@0.3.1`
- live `motion-lab-session` `429` proof and post-restore sanity pass

Still open or still needs follow-through:
- analytics verification and optional uptime monitoring decision
- named runtime owners if we want them written more explicitly than the solo-operator model
- optional SEO / social / legal polish after launch

## Release Readiness Signals

Repo-backed evidence found:
- [netlify.toml](../netlify.toml) defines the build, publish directory, docs redirect, SPA fallback, cache headers, and security headers.
- [package.json](../package.json) contains the production build pipeline plus verification scripts for Motion Lab and Converter.
- [supabase/functions](../supabase/functions) contains the production-facing function code for auth, billing, downloads, MCP validation, and Motion Lab.
- [index.html](../index.html) includes OG image tags and the Umami analytics script.
- [store.js](../store.js) renders the in-app Terms and Privacy pages.
- [mcp/package.json](../mcp/package.json) defines the published package name `supericons-mcp` and the `supericons-mcp` bin.

Preflight note:
- I ran `python C:\Users\guanh\.codex\skills\deployment-and-release\scripts\preflight_release_checks.py --project .`
- the useful signal was that no env-doc inventory was found
- the script's CI/runtime scan is noisy here because it traverses `node_modules`, so treat it as a prompt to document environment assumptions, not as a clean release audit

Operator note:
- the missing env/runtime inventory has now been added in [launch-runtime-inventory.md](./launch-runtime-inventory.md)
- the earlier external-check note is now superseded by the live April 14, 2026 verification work:
  - `https://supericons.dev` returns `200 OK`
  - `https://www.supericons.dev` returns `301` to the apex domain
  - the latest site build was deployed to Netlify and smoke-tested successfully
  - `supericons-mcp@0.3.1` is published, `0.3.0` is deprecated, and a clean temp-folder install now starts successfully
  - the live `motion-lab-session` path was proven below-limit, over-limit, and restored to the normal threshold

## Status By Checklist Area

### 1. Domain + DNS

Status: `Verified live`

What the repo proves:
- the app consistently references `https://supericons.dev` in metadata and product copy

Live evidence captured on April 14, 2026:
- Namecheap remains the DNS manager and Netlify is the production host
- `supericons.dev` resolves publicly and returns `HTTP/1.1 200 OK`
- `www.supericons.dev` resolves publicly and returns `301` to `https://supericons.dev/`
- Netlify issued the TLS certificate and serves HSTS on the live domain

Operator note:
- `api.supericons.dev` still does not exist, which is acceptable for the current launch because the product still uses Supabase-hosted function URLs directly

### 2. Frontend Hosting (Netlify)

Status: `Verified live`

What the repo proves:
- [netlify.toml](../netlify.toml) sets `npm run build`, `dist`, docs redirects, SPA fallback, cache headers, and security headers
- [public/og-image.png](../public/og-image.png), [public/robots.txt](../public/robots.txt), and [public/sitemap.xml](../public/sitemap.xml) exist

Live evidence captured on April 14, 2026:
- the latest build was deployed to the live Netlify site
- the custom domain is attached and serving production traffic
- post-deploy smoke passed on the live site

What is still useful but not blocking:
- keep a short record of which live pages were included in the smoke pass

### 3. Backend Services (Railway)

Status: `Verified live`

What the repo proves:
- the raw checklist still treated Railway as a possible launch dependency
- the converter path is the only Railway-backed production dependency still in scope

Live evidence captured on April 14, 2026:
- the operator confirmed the converter proof service is already deployed on Railway
- the live converter flow was exercised from the production site and worked successfully
- no converter-service code changes were made afterward, so no Railway redeploy is currently needed

What is still useful but not blocking:
- keep a short note of the Railway service name, env owner, and health-check location for runtime/rollback reference

### 4. Database + Auth (Supabase)

Status: `Verified live`

What the repo proves:
- [auth.js](../auth.js) implements email/password auth, Google OAuth, resend-confirmation UX, password recovery, and portal access
- [plans/auth-abuse-controls-and-agent-access-plan.md](../plans/auth-abuse-controls-and-agent-access-plan.md) records that SMTP delivery was already configured and validated after the MX fix
- [supabase/functions](../supabase/functions) contains the expected production functions, including `api-keys`, `claim-status`, `create-checkout`, `create-portal`, `download-pack`, `serve-premium-asset`, `stripe-webhook`, and `validate-mcp-key`

Live evidence captured on April 14, 2026:
- Supabase Auth `Site URL` is set to `https://supericons.dev`
- redirect URLs were reviewed in the dashboard
- Google provider config was reviewed in the dashboard and matches the expected Supabase callback
- auth rate-limit settings were reviewed in the dashboard and are launch-safe
- SMTP is configured through Resend with branded sender settings
- the operator reports that sign-up, sign-in, password reset, and Google OAuth were already tested extensively on the live stack

What is still useful but not blocking:
- keep screenshots or a short written bundle of the dashboard-state evidence if we want stronger release records

### 5. Payments (Stripe)

Status: `Verified live`

What the repo proves:
- [supabase/functions/create-checkout/index.ts](../supabase/functions/create-checkout/index.ts), [supabase/functions/create-portal/index.ts](../supabase/functions/create-portal/index.ts), and [supabase/functions/stripe-webhook/index.ts](../supabase/functions/stripe-webhook/index.ts) exist
- [store.js](../store.js) and [auth.js](../auth.js) call checkout and portal endpoints from the product UI

Live evidence captured on April 14, 2026:
- the operator confirmed a real live Stripe payment succeeded against the production flow
- `Manage Subscription` was reverified successfully after redeploying `create-portal` with `--no-verify-jwt`
- the new cancellation confirmation email flow was exercised successfully against the live stack
- `si_billing_notifications` now records `subscription_cancel_scheduled` as the idempotency guard for webhook retries
- `si_subscriptions.current_period_end` was repaired and reverified, and the cancellation email now includes the actual end date
- the Stripe secret key in Supabase was replaced with a newly created live key, and both portal and checkout were rechecked successfully afterward

What is still useful but not blocking:
- keep a written note of the exact live product/price IDs and webhook configuration owner
- keep a short note that `create-portal` and `motion-lab-session` must stay deployed with `--no-verify-jwt`

### 6. Analytics + Monitoring

Status: `Implemented, verify`

What the repo proves:
- [index.html](../index.html) loads the Umami script
- [main.js](../main.js) tracks key events such as search, icon copy/download, and contact submission

What is still missing:
- proof that the production site is sending page views and key events to the right Umami property
- a decision on whether uptime monitoring is required before launch

### 7. SEO + Social

Status: `Implemented, verify`

What the repo proves:
- [index.html](../index.html) sets OG and Twitter image metadata
- [public/og-image.png](../public/og-image.png), [public/robots.txt](../public/robots.txt), and [public/sitemap.xml](../public/sitemap.xml) exist

What is still missing:
- social-card preview checks against the deployed domain
- Search Console submission and indexing confirmation if we want it before launch

### 8. Legal

Status: `Implemented, verify`

What the repo proves:
- [store.js](../store.js) renders both Terms and Privacy pages
- footer and app navigation already route to those views

What is still missing:
- deployed accessibility check for both pages
- a decision on whether cookie consent is actually required for the planned launch jurisdictions

### 9. MCP Server (npm)

Status: `Verified live`

What the repo proves:
- [mcp/package.json](../mcp/package.json) defines the npm package name, bin, packaged files, and package verification script
- [public/mcp](../public/mcp) exists as the static MCP docs surface
- the docs implementation now includes setup and troubleshooting paths for MCP clients

Live evidence captured on April 14, 2026:
- `supericons-mcp@0.3.1` was published to npm on April 14, 2026
- `npm view supericons-mcp dist-tags --json` shows `latest` pointing to `0.3.1`
- the previously broken `0.3.0` release was deprecated with an upgrade message
- a fresh temp-folder install plus `npx -y supericons-mcp@latest` now starts successfully

What changed during release hardening:
- the package now includes the local runtime files needed for standalone npm installs:
  - `material-export.js`
  - `public/icon-index.json`
  - `public/synonyms.json`

### 10. Pre-launch Smoke Test

Status: `Verified live`

What the repo proves:
- the app has a production build pipeline in [package.json](../package.json)
- targeted verification scripts exist for Motion Lab, Converter, and MCP package integrity

Live evidence captured on April 14, 2026:
- the latest production deploy was smoke-tested after the Netlify upload
- the operator reported the live smoke pass was clear after deployment

What is still useful:
- capture a more formal evidence table if we want a stronger final release note

## Cross-Cutting Gaps

These are not a single raw-checklist checkbox, but they are still launch work:

- `Risk accepted at launch`: runtime ownership and operator accountability
  The launch model is currently a solo-operator setup. If we later need multi-person runtime ownership, the owner-role slots can be expanded beyond the current operator note.

- `Closed`: rollback and outage notes
  The concise operator note now exists in [launch-rollback-outage-note.md](./launch-rollback-outage-note.md).

- `Verified live`: Motion Lab hosted hardening
  [docs/plans/motion-lab-mcp-verification-hardening-plan.md](./plans/motion-lab-mcp-verification-hardening-plan.md) is now closed for its distinct launch proof:
  - on April 14, 2026, `motion-lab-session` was verified below-limit, over-limit, and then rechecked after restoring the normal threshold
  - the live deployment also reconfirmed that `motion-lab-session` must be deployed with `--no-verify-jwt`

- `Closed`: docs route strategy
  The launch route decision is now documented in [docs-canonical-route-decision-2026-04-14.md](./references/docs-canonical-route-decision-2026-04-14.md): shell-native `/?view=docs` is canonical for this launch, while clean `/docs/...` deep routes are deferred.

## Recommended Next Actions

1. Keep the rollback/outage note close at hand for launch-day operations, especially the `--no-verify-jwt` deployment rules.
2. Treat analytics, uptime monitoring, and social preview checks as the highest-value post-launch follow-through.
3. Preserve the shell-first docs route decision for this launch window and avoid a route migration during launch.

## Source Records

- [launch-checklist.md](./launch-checklist.md)
- [launch-jtbd.md](./launch-jtbd.md)
- [plans/auth-abuse-controls-and-agent-access-plan.md](../plans/auth-abuse-controls-and-agent-access-plan.md)
- [docs/plans/motion-lab-mcp-verification-hardening-plan.md](./plans/motion-lab-mcp-verification-hardening-plan.md)
- [../.agents/workflows/pre-release-gates.md](../.agents/workflows/pre-release-gates.md)
