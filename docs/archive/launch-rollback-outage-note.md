# Launch Rollback And Outage Note

Last updated: April 14, 2026

This is the minimum operator note for launch-day regressions.

Scope:
- this is for fast recovery, not for root-cause analysis
- the current launch model is a solo-operator setup
- when in doubt, restore the last known good customer path first, then investigate

## Operator Model

- Primary operator: `Solo Supericons operator`
- Runtime ownership model:
  - Netlify site + domain
  - Supabase auth + edge functions
  - Stripe billing + portal + webhook
  - Railway converter service
  - npm package owner

## First 5 Minutes

If a launch-day issue is reported:

1. Identify which user-facing path is broken:
   - site shell / docs
   - auth
   - checkout / portal / billing emails
   - converter
   - MCP install or hosted Motion Lab
2. Check whether the issue is isolated or global.
3. Prefer restoring the last known good path before making new feature changes.
4. Keep the production domain, DNS, and active Stripe products unchanged unless the issue is clearly there.

## Known Critical Deployment Rules

These are the easiest ways to break otherwise-working flows:

- `create-portal` must be deployed with `--no-verify-jwt`
- `motion-lab-session` must be deployed with `--no-verify-jwt`
- `stripe-webhook` must be deployed with `--no-verify-jwt`

If any of those functions start returning unexpected `401` errors after a redeploy, check the deployment mode first.

## By Surface

### 1. Netlify Site / Frontend Shell

Symptoms:
- `supericons.dev` loads the wrong build
- app shell or docs regress after a deploy
- static assets or styles are broken

First checks:
- Netlify deploy history
- current production deploy vs previous successful deploy
- custom domain still attached and serving HTTPS

Rollback:
- restore the previous known-good Netlify deploy
- if the issue is strictly frontend, do not change Supabase or Stripe first

### 2. Supabase Auth

Symptoms:
- sign-in fails
- password reset fails
- Google OAuth fails
- auth emails stop arriving

First checks:
- Auth `Site URL` and redirect URLs
- Google provider config
- SMTP / Resend config
- auth rate-limit settings

Rollback / recovery:
- revert dashboard changes to the last known working values
- if an auth email regression was caused by SMTP changes, restore the last known SMTP config

### 3. Stripe Checkout / Portal / Billing Emails

Symptoms:
- checkout does not open
- customer portal says unavailable
- cancellation emails stop sending

First checks:
- `create-checkout`, `create-portal`, and `stripe-webhook` deployments
- `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` secrets in Supabase
- Stripe webhook deliveries in Stripe dashboard
- customer portal configuration in Stripe

Rollback / recovery:
- if portal fails with `401`, recheck `create-portal` deployment mode first
- if webhook deliveries fail, restore the last known webhook secret / destination config
- if the current live Stripe secret key is invalid or compromised, create a replacement live key, update the Supabase secret, and recheck portal + checkout

Important note:
- the previous Stripe secret key has already been revoked, so rollback is not "restore the old key"
- the practical recovery path is "create a fresh live key and update Supabase"

### 4. Railway Converter Service

Symptoms:
- converter fails on the live site while the rest of the app works

First checks:
- Railway service health
- Railway deploy history
- Railway environment variables
- app-side converter calls from the live site

Rollback / recovery:
- if no code changed, prefer restoring the previous healthy Railway deploy rather than changing the frontend
- if the converter is degraded but the rest of the site works, keep the outage scoped there and avoid touching Stripe or auth

### 5. Motion Lab Hosted Runtime

Symptoms:
- MCP Motion Lab session exchange fails
- hosted Motion Lab suddenly returns auth or rate-limit errors unexpectedly

First checks:
- `motion-lab-session` deployment mode
- current rate-limit secrets
- whether a temporary threshold was left behind after testing

Rollback / recovery:
- restore the normal rate-limit secrets
- redeploy `motion-lab-session` with `--no-verify-jwt`

### 6. npm Package

Symptoms:
- bad published MCP version

Rollback / recovery:
- do not rely on unpublish as rollback
- publish a fixed patch version quickly
- keep the deprecation path in place for bad versions when needed

## Post-Fix Checks

After any recovery:

- confirm `https://supericons.dev` loads
- confirm checkout opens
- confirm portal opens
- confirm converter still works if Railway was touched
- confirm `npx -y supericons-mcp@latest` still starts if npm was touched

## Launch Risk Note

This rollback path is executable, but it is still mostly untested as a full rehearsal.
That is acceptable for this launch only if the remaining residual risks are explicitly accepted in the release decision.
