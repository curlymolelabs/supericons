# Supericons Prelaunch Checklist

## Goal

Finish all code, dashboard configuration, auth/email setup, and deployment prep before the first paid production deploy.

This checklist is the short step-by-step execution plan.

For the fuller status tracker, see:
- [prelaunch-local-first-monitoring-plan.md](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/plans/prelaunch-local-first-monitoring-plan.md)

## Working Rule

Do not create the first paid Netlify deploy until:

- the converter is deploy-ready
- the production build works locally
- Supabase Auth is configured
- Resend SMTP and email templates are configured
- Google OAuth is configured
- Cloudflare / Railway / Netlify settings are already decided

## Current Snapshot

### Already Done

- [x] live Stripe app-side price IDs updated in [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js)
- [x] live Stripe pack price IDs updated in Supabase `si_products`
- [x] live Stripe webhook destination created
- [x] live `STRIPE_SECRET_KEY` updated in Supabase
- [x] live `STRIPE_WEBHOOK_SECRET` updated in Supabase
- [x] Stripe customer portal configured for:
  - invoice history
  - payment method updates
  - cancellations
  - monthly/annual plan switching
- [x] converter server patched for Railway-style hosting in [tools/converter-proof-service/server.mjs](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/tools/converter-proof-service/server.mjs)
- [x] local converter proof smoke and production-style build/preview completed
- [x] Supabase Auth URL config updated for:
  - `https://supericons.dev`
  - `http://localhost:5173`
- [x] Resend auth domain verified for `auth.supericons.dev`
- [x] password reset flow implemented in the app
- [x] reset-password email template installed and tested
- [x] password-changed notification template installed and tested
- [x] basic account modal added with:
  - display name editing
  - read-only email display
  - password reset trigger
- [x] favicon replaced with the Supericons logo mark in [public/favicon.svg](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/public/favicon.svg)

### Still Missing

- [ ] Railway project not created yet
- [ ] Netlify site not created yet
- [ ] Cloudflare production DNS not prepared yet
- [ ] Google OAuth production config not verified yet
- [ ] Google sign-in has not been verified locally yet
- [ ] confirmation email signup flow has not been re-verified end to end yet
- [ ] decide whether magic-link auth is part of launch scope
- [ ] first live smoke test is still blocked on hosting setup

## Do Now

Work top to bottom. Do not skip ahead to deploy setup.

### Phase 1. Make The Code Deploy-Ready Locally

Status: `completed`

1. Patch the converter server for Railway hosting.
   - [x] update [tools/converter-proof-service/server.mjs](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/tools/converter-proof-service/server.mjs)
   - [x] support `process.env.PORT`
   - [x] bind to `0.0.0.0`
   - [x] keep local fallback for development

2. Verify the converter still works locally.
   - [x] local converter proof service is compatible with the updated host/port logic
   - [x] run `npm run converter:proof-smoke`
   - [x] confirm the proof endpoint responds locally

3. Run a local production-style frontend test.
   - [x] set `VITE_CONVERTER_PROOF_URL=http://127.0.0.1:4318/api/convert/png-to-svg`
   - [x] run `npm run build`
   - [x] run `npm run preview`
   - [x] verify the production build for:
     - [x] landing
     - [x] pricing
     - [x] auth modal
     - [x] converter entry flow
     - [x] MCP page
     - [x] favicon / OG asset paths

Why this phase is first:
- the frontend only uses the proof service in production if `VITE_CONVERTER_PROOF_URL` is set in [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js)

### Phase 2. Finish Supabase Auth And Email

Status: `mostly_completed`

4. Configure Supabase Auth URLs.
   - [x] set Site URL to `https://supericons.dev`
   - [x] add redirect URL `https://supericons.dev`
   - [x] add redirect URL `http://localhost:5173`
   - [x] verify auth flows still match [auth.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/auth.js)

5. Set up Resend.
   - [x] confirm the Resend account/project
   - [x] verify sending domain for `auth.supericons.dev`
   - [x] note required DNS records for later Cloudflare entry:
     - [x] SPF
     - [x] DKIM
     - [ ] optional DMARC

6. Configure Supabase custom SMTP with Resend.
   - [x] SMTP host `smtp.resend.com`
   - [x] SMTP port `465`
   - [x] SMTP user `resend`
   - [x] SMTP password configured
   - [x] sender identity is working for auth mail
   - [ ] final sender copy should be rechecked before launch

7. Implement the real reset-password flow in the app.
   - [x] add a `Forgot password?` entry point in the auth UI
   - [x] send recovery email with `resetPasswordForEmail(...)`
   - [x] route recovery redirects back into the app
   - [x] detect Supabase `PASSWORD_RECOVERY` state
   - [x] show a dedicated `Set new password` form
   - [x] complete password update with `updateUser({ password })`
   - [x] show success/error states clearly
   - [x] verify the recovery flow works locally end to end

8. Install and verify email templates.
   - [x] confirmation template exists in [docs/confirmation-email-supabase.html](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs/confirmation-email-supabase.html)
   - [x] branded confirmation template appears installed in Supabase
   - [x] create branded reset-password template
   - [x] install reset-password template in Supabase
   - [x] create branded password-changed template
   - [x] install password-changed template in Supabase
   - [ ] decide whether magic-link login is part of launch scope
   - [ ] if magic link is required:
     - [ ] create branded magic-link template
     - [ ] implement or verify magic-link app flow

Current remaining gap:
- email/password recovery is working, but signup confirmation should still be re-verified end to end after Google OAuth is configured

9. Verify email auth end to end.
   - [ ] sign up with email
   - [ ] receive confirmation email
   - [ ] confirm account
   - [x] sign in with email/password
   - [x] request password reset email
   - [x] open recovery link
   - [x] set a new password successfully
   - [x] sign in with the new password

### Phase 3. Finish Google OAuth

Status: `pending`

9. Create or update the Google OAuth web client.
   - [ ] open Google Cloud Console
   - [ ] create or update OAuth 2.0 Client ID for Web application

10. Configure Google OAuth URLs.
   - [ ] authorized JavaScript origin `https://supericons.dev`
   - [ ] authorized JavaScript origin `http://localhost:5173`
   - [ ] authorized redirect URI `https://kcjmkakdhsqplvasgkjv.supabase.co/auth/v1/callback`

11. Configure the Google consent screen.
   - [ ] app name `Supericons`
   - [ ] support email `hello@supericons.dev`
   - [ ] app logo
   - [ ] homepage `https://supericons.dev`
   - [ ] privacy policy URL
   - [ ] terms URL
   - [ ] developer contact `hello@supericons.dev`
   - [ ] publishing status set appropriately for public launch

12. Connect Google OAuth to Supabase.
   - [ ] paste Google Client ID into Supabase Auth Provider settings
   - [ ] paste Google Client Secret into Supabase Auth Provider settings
   - [ ] enable Google provider

13. Verify Google sign-in locally.
   - [ ] sign in with Google from localhost
   - [ ] confirm redirect returns correctly
   - [ ] confirm account/session state renders correctly

Note:
- Google OAuth in [auth.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/auth.js) uses `redirectTo: window.location.origin`

### Phase 4. Prepare DNS And Hosted Services

Status: `pending`

14. Prepare Cloudflare first.
   - [ ] confirm Cloudflare will be authoritative for `supericons.dev`
   - [ ] do not add proxy complexity until the core deploy works
   - [ ] prepare records for:
     - [ ] Netlify frontend
     - [ ] optional `www`
     - [ ] optional Railway subdomain such as `api.supericons.dev`
     - [ ] Resend verification

15. Create the Railway project for the converter.
   - [ ] create Railway project
   - [ ] deploy the converter service only
   - [ ] set runtime env/port as required
   - [ ] verify `/health`
   - [ ] record the public converter URL
   - [ ] decide whether a custom API subdomain is needed before launch

16. Create the Netlify site for the frontend.
   - [ ] create or link the Netlify site
   - [ ] confirm build command `npm run build`
   - [ ] confirm publish directory `dist`
   - [ ] set `VITE_CONVERTER_PROOF_URL` to the Railway converter endpoint
   - [ ] confirm SPA routing via [netlify.toml](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/netlify.toml)

17. Prepare Cloudflare DNS records after both hosted services exist.
   - [ ] point root domain to Netlify
   - [ ] point optional `www` to Netlify
   - [ ] point optional API subdomain to Railway
   - [ ] add Resend records as DNS-only where required

### Phase 5. Do The First Online Deploy And Live Smoke Test

Status: `pending`

18. Do the first Railway deploy.
   - [ ] verify live converter health
   - [ ] verify live converter request works

19. Do the first Netlify deploy.
   - [ ] deploy only after Phases 1-4 are ready
   - [ ] attach `supericons.dev`
   - [ ] verify SSL
   - [ ] verify main routes and assets

20. Run live smoke tests.
   - [ ] open live site in incognito
   - [ ] sign up with email
   - [ ] confirm email delivery
   - [ ] sign in with Google
   - [ ] test one live single-pack purchase
   - [ ] test one live Pro purchase
   - [ ] verify Stripe webhook delivery success
   - [ ] verify portal open/return flow
   - [ ] verify premium access unlocks
   - [ ] verify converter works against Railway

## Launch Scope Decisions Still To Confirm

- [ ] is magic-link auth required for launch
- [ ] do we want a custom Railway subdomain before launch
- [ ] do we want `www.supericons.dev` live at launch or root-only first

## Current Recommended Next Step

Start with `Phase 3, Google OAuth production config`:

- create or update the Google OAuth web client
- add `https://supericons.dev` and `http://localhost:5173`
- add the Supabase callback URL
- connect the Google client in Supabase
- verify Google sign-in locally

Once Google OAuth is verified, the next phase is creating the Railway project and Netlify site.
