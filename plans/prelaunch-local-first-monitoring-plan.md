# Supericons Prelaunch Local-First Monitoring Plan

## Goal

Finish the product, auth, billing, email, and deployment configuration locally and in dashboards before the first paid Netlify deploy.

This plan is the operational tracker for the launch path. It is intentionally narrower than the broader product roadmap in [plans/launch-and-responsive-phasing-plan.md](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/plans/launch-and-responsive-phasing-plan.md).

## Working Rule

Do not do the first production deploy until all `Local-First Gate` items are complete.

That means:

- code is deploy-ready
- external dashboards are configured
- local production simulation passes
- deployment env values are known
- launch smoke steps are pre-written

## Current Snapshot

### Completed

- mobile shell-state stabilization was completed earlier
- landing page/favicon polish is in place, including the logo favicon in [public/favicon.svg](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/public/favicon.svg)
- live Stripe price IDs were updated in:
  - [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js)
  - Supabase SQL editor for the `8` single-pack `si_products` rows
- live Stripe webhook destination exists for:
  - `https://kcjmkakdhsqplvasgkjv.supabase.co/functions/v1/stripe-webhook`
- live Stripe secrets were updated in Supabase:
  - `STRIPE_SECRET_KEY`
  - `STRIPE_WEBHOOK_SECRET`
- Stripe customer portal is configured enough for launch:
  - invoice history
  - payment method updates
  - cancellation
  - monthly/annual plan switching
- converter deploy patch is complete in [tools/converter-proof-service/server.mjs](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/tools/converter-proof-service/server.mjs)
- local production-style build and preview were verified with the converter URL set
- Supabase Auth URL config is set for:
  - `https://supericons.dev`
  - `http://localhost:5173`
- Resend auth domain is verified for `auth.supericons.dev`
- password reset flow is implemented and working in [auth.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/auth.js)
- reset-password and password-changed email templates are installed and tested
- a basic account modal exists for:
  - display name editing
  - read-only email display
  - password reset trigger
- Netlify base config already exists in [netlify.toml](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/netlify.toml)

### Not Yet Finished

- Netlify site creation and production env vars
- Google OAuth production config
- Google sign-in localhost verification
- signup confirmation email end-to-end verification
- magic-link launch-scope decision
- first online deploy and live smoke tests

## Local-First Gate

All items in this section must be complete before the first paid production deploy.

### 1. Converter Deploy Readiness

Status: `completed`

- [x] patch [tools/converter-proof-service/server.mjs](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/tools/converter-proof-service/server.mjs) to support Railway-style hosting
  - [x] listen on `process.env.PORT`
  - [x] bind to `0.0.0.0`
  - [x] keep local fallback for development
- [x] verify local converter still works with proof-smoke and the updated server logic
- [ ] document the final production converter URL that Netlify will use for:
  - `VITE_CONVERTER_PROOF_URL`

Why this blocks deploy:

The frontend only uses the proof service in production if `VITE_CONVERTER_PROOF_URL` is set in [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js).

### 2. Local Production Simulation

Status: `completed`

- [x] run a production-style frontend build with the converter URL set
- [x] run local preview against the production build
- [x] verify:
  - [x] landing
  - [x] pricing
  - [x] auth modal
  - [x] converter entry flow
  - [x] MCP page
  - [x] favicon and OG asset paths
- [x] capture remaining blockers before deploy

Current remaining blocker after this simulation:
- Google OAuth still needs production configuration and localhost verification

Suggested local flow:

1. start converter service
2. set `VITE_CONVERTER_PROOF_URL=http://127.0.0.1:4318/api/convert/png-to-svg`
3. run `npm run build`
4. run `npm run preview`
5. smoke test the production build in browser

### 3. Supabase Auth Production Config

Status: `mostly_completed`

- [x] set Site URL to `https://supericons.dev`
- [x] add redirect URLs:
  - [x] `https://supericons.dev`
  - [x] `http://localhost:5173`
- [ ] verify email confirmation flow behavior
- [x] verify sign-in/sign-out behavior
- [x] implement password reset flow in the app
  - [x] add forgot-password entry point
  - [x] send recovery email with Supabase recovery API
  - [x] detect `PASSWORD_RECOVERY` return state
  - [x] show set-new-password form
  - [x] update the password successfully
- [x] verify password reset flow exists and works

Repo references:

- [auth.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/auth.js)
- Google OAuth redirect uses `window.location.origin` in [auth.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/auth.js)

### 4. Email Delivery And Templates

Status: `mostly_completed`

- [x] verify Resend domain ownership and DNS
- [x] configure Supabase custom SMTP with Resend
- [ ] set sender identity copy for launch
- [x] install and verify the confirmation email template visually in Supabase
- [x] create and install password reset email template
- [x] create and install password-changed email template
- [ ] create or verify magic-link email template if that path is enabled
- [x] send real reset and password-changed emails and confirm inbox delivery
- [ ] send a fresh signup confirmation email and verify delivery end to end

Current repo assets:

- [docs/confirmation-email-supabase.html](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs/confirmation-email-supabase.html)
- [docs/confirmation-email-template.html](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs/confirmation-email-template.html)
- [docs/reset-password-email-supabase.html](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs/reset-password-email-supabase.html)
- [docs/password-changed-email-supabase.html](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs/password-changed-email-supabase.html)

Gap to close:

- magic-link launch scope is still undecided
- signup confirmation should be re-tested once before deploy

### 5. Google OAuth Production Config

Status: `pending`

- [ ] create or update the Google OAuth web client
- [ ] set authorized JavaScript origins:
  - `https://supericons.dev`
  - `http://localhost:5173`
- [ ] set Supabase callback redirect URI in Google Cloud
- [ ] configure OAuth consent screen branding
- [ ] set publishing status to production if public login is intended
- [ ] verify Google sign-in end to end in dev/staging conditions

### 6. Launch Asset And Trust Review

Status: `in_progress`

- [x] favicon replaced with logo mark
- [x] OG image exists in [public/og-image.png](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/public/og-image.png)
- [ ] verify terms/privacy/contact/footer links are final
- [ ] verify email sender name/address copy is final
- [ ] verify pricing copy and entitlement descriptions are launch-ready

## Deployment Readiness Gate

This section starts only after the `Local-First Gate` is complete.

### 7. Cloudflare DNS Plan

Status: `pending`

- [ ] confirm Cloudflare is authoritative for `supericons.dev`
- [ ] prepare DNS records for:
  - Netlify frontend domain
  - optional `www`
  - optional Railway converter subdomain such as `api.supericons.dev`
- [ ] add Resend verification records
- [ ] decide which records should be proxied vs DNS-only

Recommended default:

- Netlify frontend: proxied is acceptable once stable
- Resend verification records: DNS-only
- Railway API subdomain: start simple, avoid extra proxy complexity unless needed

### 8. Railway Deployment

Status: `pending`

- [ ] create Railway project for converter service
- [ ] deploy converter service only
- [ ] verify `/health`
- [ ] record final public converter URL
- [ ] decide whether a custom subdomain is necessary before launch

### 9. Netlify Deployment

Status: `pending`

- [ ] create/link Netlify site
- [ ] confirm build command:
  - `npm run build`
- [ ] confirm publish directory:
  - `dist`
- [ ] set production env var:
  - `VITE_CONVERTER_PROOF_URL`
- [ ] do the first production deploy only after items 1-8 are ready
- [ ] attach `supericons.dev`
- [ ] verify SSL and routing

## Live Smoke Gate

This section starts only after the first online deploy exists.

### 10. Live Billing And Access Smoke Test

Status: `pending`

- [ ] open live site in incognito
- [ ] sign up with email
- [ ] confirm email delivery
- [ ] sign in with Google
- [ ] test one live single-pack purchase
- [ ] test one live Pro purchase
- [ ] verify Stripe webhook deliveries succeed
- [ ] verify `si_purchases`
- [ ] verify `si_subscriptions`
- [ ] verify customer portal opens and returns correctly
- [ ] verify premium pack access unlocks

### 11. Live Product Smoke Test

Status: `pending`

- [ ] landing page looks correct
- [ ] search works
- [ ] customize panel works
- [ ] export works
- [ ] converter works against the live converter backend
- [ ] MCP docs page loads
- [ ] footer/legal links work
- [ ] mobile launch-minimum pass

## Monitoring Board

Use this as the short status board during launch prep.

| Area | Status | Owner | Notes |
|---|---|---|---|
| Stripe live prices | done | user + codex | live prices updated in app and DB |
| Stripe webhook + portal | done | user + codex | live webhook created, secrets updated, portal configured |
| Favicon/logo asset | done | codex | logo-mark favicon replaced |
| Converter deploy patch | done | codex | Railway compatibility is in the repo |
| Local production simulation | done | codex | build + preview smoke completed |
| Supabase auth URLs | done | user | prod + localhost URLs configured |
| Resend SMTP + email templates | in progress | user + codex | reset/password-changed tested, signup confirmation still needs recheck |
| Password reset app flow | done | codex | recovery flow and account reset trigger shipped |
| Google OAuth production config | pending | user | still needs dashboard verification |
| Cloudflare DNS prep | pending | user | no deploy yet |
| Railway converter deploy | pending | user + codex | after patch |
| Netlify first deploy | pending | user | only after all local-first items pass |
| Live smoke test | pending | user + codex | after deployment |

## Recommended Immediate Next Step

Finish `Google OAuth production config` next.

That is the main remaining auth-side blocker before creating the Railway project and the first Netlify site.
