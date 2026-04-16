# Launch Runtime Inventory

Last updated: April 14, 2026

This is the minimum launch operations note for Supericons.

Purpose:
- record the current live infrastructure truth outside the repo
- list the runtime secrets and config we can prove from source
- assign owner roles without inventing specific people
- capture rollback checks so launch work is not trapped in memory

Important scope note:
- this is an evidence-backed operator note, not a claim that every live system is launch-ready
- when the repo does not name a specific person, the owner field stays `Unassigned in repo`
- when rollback steps have not been tested, they are marked `Untested`

## External Truth Snapshot

Observed on April 14, 2026:

- `supericons.dev` nameservers currently resolve to `dns1.registrar-servers.com` and `dns2.registrar-servers.com`, not Cloudflare.
- `supericons.dev` does not currently resolve to a live A or CNAME record.
- `www.supericons.dev` does not exist.
- `api.supericons.dev` does not exist.
- `https://supericons.dev` is not reachable from the public internet because the hostname does not resolve.
- Supabase project `kcjmkakdhsqplvasgkjv` is reachable publicly.
- `GET /auth/v1/settings` on Supabase reports `email: true`, `google: true`, `anonymous_users: false`, and `disable_signup: false`.
- `POST /functions/v1/create-checkout` and `POST /functions/v1/create-portal` return `401 Unauthorized` without a user session, which is consistent with deployed auth-gated functions.
- `POST /functions/v1/validate-mcp-key` is deployed but returned `500 Internal Server Error` for a bogus key-hash request during this check. That needs investigation before launch.
- npm registry does not currently have a published `supericons-mcp` package.

## Runtime Surfaces

### 1. Domain and DNS

- Owner role: `DNS / domain owner`
- Named owner: `Unassigned in repo`
- Source of truth: registrar account, DNS host, domain records
- Current state:
  - nameservers point to registrar-hosted DNS, not Cloudflare
  - root domain is not resolving publicly
  - `www` and `api` subdomains are not present
- Launch check:
  - attach working root domain before any production smoke pass
  - decide whether `www` is required at launch
  - decide whether `api.supericons.dev` is needed or fully out of scope
- Rollback path:
  - revert nameserver or DNS-record changes to the last known working config
  - Tested: `No`

### 2. Frontend Hosting

- Owner role: `Netlify deploy owner`
- Named owner: `Unassigned in repo`
- Source of truth: Netlify site dashboard
- Repo-backed runtime:
  - [netlify.toml](../netlify.toml) defines `npm run build`, `dist`, docs redirect handling, SPA fallback, cache headers, and security headers
- Current live state:
  - custom domain cannot be verified because `supericons.dev` is not resolving
- Launch check:
  - confirm active Netlify production site
  - confirm custom-domain attachment and SSL issuance
  - confirm last known good deploy is restorable
- Rollback path:
  - restore the previous good Netlify deploy
  - Tested: `No`

### 3. Supabase Project

- Owner role: `Supabase project owner`
- Named owner: `Unassigned in repo`
- Source of truth: Supabase dashboard for project `kcjmkakdhsqplvasgkjv`
- Current live state:
  - public auth settings endpoint is reachable
  - external auth providers show Google enabled
  - email auth is enabled
  - anonymous users are disabled
- Launch check:
  - confirm Site URL and redirect URLs in dashboard
  - confirm migrations and RLS in dashboard
  - confirm SMTP and branded email templates
  - investigate the unexpected `validate-mcp-key` `500` response
- Rollback path:
  - redeploy last known good edge functions
  - revert changed dashboard settings and secrets
  - Tested: `No`

### 4. Stripe Billing

- Owner role: `Stripe billing owner`
- Named owner: `Unassigned in repo`
- Source of truth: Stripe dashboard plus Supabase edge-function secrets
- Repo-backed runtime:
  - [create-checkout](../supabase/functions/create-checkout/index.ts)
  - [create-portal](../supabase/functions/create-portal/index.ts)
  - [stripe-webhook](../supabase/functions/stripe-webhook/index.ts)
- Current live state:
  - checkout and portal endpoints are deployed and reject anonymous requests with `401`
  - live-mode product, price, webhook, and portal settings were not directly verifiable from the public internet
- Launch check:
  - confirm live products and prices
  - confirm webhook destination and signing secret
  - confirm customer portal configuration
  - run an authenticated end-to-end purchase and subscription smoke test
- Rollback path:
  - revert pricing-page deploy if checkout points to the wrong environment
  - restore previous webhook secret and endpoint config if a live billing regression is introduced
  - Tested: `No`

### 5. Resend / Purchase Email

- Owner role: `Transactional email owner`
- Named owner: `Unassigned in repo`
- Source of truth: Resend dashboard plus Supabase secrets
- Repo-backed runtime:
  - [stripe-webhook](../supabase/functions/stripe-webhook/index.ts) uses `RESEND_API_KEY`, `PURCHASE_EMAIL_FROM`, and `PURCHASE_EMAIL_REPLY_TO`
  - archived plans say auth email delivery was previously validated after the `send.auth.supericons.dev` MX fix
- Current live state:
  - not directly verifiable from the public internet without dashboard access or a successful live purchase
- Launch check:
  - confirm sending domain, API key, and inbox delivery
  - confirm purchase-confirmation emails and auth emails both deliver successfully
- Rollback path:
  - switch email sending off by removing the Resend secret or restore the prior working API key
  - Tested: `No`

### 6. MCP Package and Registry

- Owner role: `npm package owner`
- Named owner: `Unassigned in repo`
- Source of truth: npm registry and local package workspace
- Current live state:
  - `npm view supericons-mcp version` returned `404 Not Found`
  - `npm pack --dry-run ./mcp` and `npm publish --dry-run ./mcp` both succeeded locally for version `0.3.0`
  - `npm whoami` returned `401 Unauthorized`, so the current shell is not authenticated for a real publish
- Launch check:
  - authenticate npm publish access
  - publish `supericons-mcp`
  - verify clean install with `npx -y supericons-mcp`
- Rollback path:
  - npm packages cannot be unpublished safely as a general rollback path
  - if a bad version ships, publish a fixed patch release immediately
  - Tested: `No`

### 7. Motion Lab Hosted Runtime

- Owner role: `Motion Lab runtime owner`
- Named owner: `Unassigned in repo`
- Source of truth: Supabase functions plus verification scripts
- Repo-backed runtime:
  - [motion-lab-session](../supabase/functions/motion-lab-session/index.ts)
  - [shared auth](../supabase/functions/_shared/motion-lab/auth.ts)
  - [shared rate-limit](../supabase/functions/_shared/motion-lab/rate-limit.ts)
- Current live state:
  - hosted function is deployed
  - direct live `429` proof for `motion-lab-session` is still outstanding
- Launch check:
  - capture the distinct `motion-lab-session` `429` proof
  - confirm expected token expiry and error contract under live conditions
- Rollback path:
  - redeploy prior Motion Lab function code and restore previous limit settings
  - Tested: `No`

## Environment Variable Catalog

No repo-level `.env` files or env-doc inventory were found during this pass.

### Supabase Edge Functions

`SUPABASE_URL`
- Purpose: project base URL for edge-function and admin clients
- Environment: production
- Required or optional: required
- Default or fallback: none
- Secret handling: not secret, but should still be recorded centrally

`SUPABASE_ANON_KEY`
- Purpose: user-scoped Supabase client in auth-gated functions
- Environment: production
- Required or optional: required for functions that validate user sessions
- Default or fallback: none
- Secret handling: publishable, but should be sourced from platform config not memory

`SUPABASE_SERVICE_ROLE_KEY`
- Purpose: privileged database and storage access in edge functions
- Environment: production
- Required or optional: required
- Default or fallback: none
- Secret handling: secret; store only in Supabase function secrets

`SITE_URL`
- Purpose: fallback return URL for Stripe portal flow
- Environment: production
- Required or optional: optional but recommended
- Default or fallback: falls back to `https://supericons.dev`
- Secret handling: not secret

`APP_BASE_URL`
- Purpose: links in purchase emails and webhook-generated URLs
- Environment: production
- Required or optional: optional but recommended
- Default or fallback: falls back to `https://supericons.dev`
- Secret handling: not secret

### Stripe and Purchase Flows

`STRIPE_SECRET_KEY`
- Purpose: create checkout sessions, create portal sessions, verify webhook events
- Environment: production
- Required or optional: required
- Default or fallback: none
- Secret handling: secret; store only in edge-function secrets

`STRIPE_WEBHOOK_SECRET`
- Purpose: verify Stripe webhook signatures
- Environment: production
- Required or optional: required for webhook
- Default or fallback: none
- Secret handling: secret; store only in edge-function secrets

`RESEND_API_KEY`
- Purpose: send purchase confirmation emails from `stripe-webhook`
- Environment: production
- Required or optional: optional in code, but required for purchase emails
- Default or fallback: missing key skips sending and logs a warning
- Secret handling: secret; store only in edge-function secrets

`PURCHASE_EMAIL_FROM`
- Purpose: override sender identity for purchase emails
- Environment: production
- Required or optional: optional
- Default or fallback: `Supericons <receipts@auth.supericons.dev>`
- Secret handling: not secret

`PURCHASE_EMAIL_REPLY_TO`
- Purpose: reply-to address for purchase emails
- Environment: production
- Required or optional: optional
- Default or fallback: `hello@supericons.dev`
- Secret handling: not secret

### Motion Lab Hosted Runtime

`MOTION_LAB_SESSION_SECRET`
- Purpose: HMAC signing secret for Motion Lab session tokens
- Environment: production
- Required or optional: required for proper session signing
- Default or fallback: falls back to `SUPABASE_SERVICE_ROLE_KEY` if missing
- Secret handling: secret; should be set explicitly instead of relying on fallback

`MOTION_LAB_SESSION_TTL_SECONDS`
- Purpose: session-token lifetime
- Environment: production
- Required or optional: optional
- Default or fallback: defaults to `900`
- Secret handling: not secret

`MOTION_LAB_RATE_LIMIT_SESSION_MAX`
`MOTION_LAB_RATE_LIMIT_SESSION_WINDOW_SECONDS`
`MOTION_LAB_RATE_LIMIT_RECIPE_MAX`
`MOTION_LAB_RATE_LIMIT_RECIPE_WINDOW_SECONDS`
`MOTION_LAB_RATE_LIMIT_RENDER_CSS_MAX`
`MOTION_LAB_RATE_LIMIT_RENDER_CSS_WINDOW_SECONDS`
`MOTION_LAB_RATE_LIMIT_RENDER_SVG_MAX`
`MOTION_LAB_RATE_LIMIT_RENDER_SVG_WINDOW_SECONDS`
- Purpose: override the Postgres-backed rate-limit buckets for Motion Lab
- Environment: production
- Required or optional: optional
- Default or fallback: code defaults are used when not set
- Secret handling: not secret

`MATERIAL_SNAPSHOT_BUCKET`
- Purpose: override the private storage bucket for Material snapshots
- Environment: production
- Required or optional: optional
- Default or fallback: `material-icons`
- Secret handling: not secret

### MCP Consumer Runtime

`SUPERICONS_API_KEY`
- Purpose: authenticate MCP access to premium libraries and Pro workflows
- Environment: user machine or CI
- Required or optional: optional for free icons, required for premium access
- Default or fallback: missing key means free-tier access only
- Secret handling: secret; user secret, not repo secret

`SUPERICONS_SUPABASE_URL`
- Purpose: override MCP auth endpoint base URL
- Environment: user machine or CI
- Required or optional: optional
- Default or fallback: defaults to project Supabase URL
- Secret handling: not secret

`SUPERICONS_SUPABASE_ANON`
- Purpose: override MCP publishable anon key
- Environment: user machine or CI
- Required or optional: optional
- Default or fallback: defaults to the current publishable key baked into the package
- Secret handling: not secret

`SUPERICONS_MOTION_LAB_BASE_URL`
- Purpose: override hosted Motion Lab functions base URL
- Environment: user machine or CI
- Required or optional: optional
- Default or fallback: defaults to `${SUPABASE_URL}/functions/v1`
- Secret handling: not secret

`SUPERICONS_MOTION_LAB_LOCAL_FALLBACK`
- Purpose: allow or disable local Motion Lab fallback behavior during verification
- Environment: user machine or CI
- Required or optional: optional
- Default or fallback: code-specific fallback behavior
- Secret handling: not secret

## Launch-Day Checks

Before launch:
- assign a named human owner to each owner-role slot above
- fix domain resolution before attempting production smoke tests
- investigate the live `validate-mcp-key` `500`
- confirm npm publish auth for the package owner
- capture a known-good rollback target for Netlify and Supabase

Immediately after release:
- verify landing page, docs, pricing, checkout, auth, and footer links
- verify Umami traffic on the deployed site
- verify Stripe webhook activity and purchase email delivery
- verify MCP install and one authenticated premium workflow

## Source Records

- [launch-checklist-status.md](./launch-checklist-status.md)
- [launch-checklist.md](./launch-checklist.md)
- [netlify.toml](../netlify.toml)
- [mcp/package.json](../mcp/package.json)
- [supabase/functions](../supabase/functions)
