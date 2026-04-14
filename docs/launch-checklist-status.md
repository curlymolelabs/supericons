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
- npm publish and clean-install proof for `supericons-mcp@0.3.1`
- live `motion-lab-session` `429` proof and post-restore sanity pass

Still open or still needs follow-through:
- Supabase dashboard settings, SMTP delivery, and Google OAuth production config
- analytics verification and optional uptime monitoring decision
- final release note cleanup for Railway scope and docs route strategy
- final pre-release verification evidence and ship decision
- named runtime owners and concise rollback notes

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

Status: `Open before launch`

What the repo proves:
- no Railway config or runbook is documented in the repo snapshot I checked
- the product already leans heavily on Supabase Edge Functions for backend behavior

What is still missing:
- a decision on whether Railway is still part of launch scope
- if yes, the service deploy, environment variables, health check, and domain proof
- if no, the raw checklist should be updated to remove Railway as an assumed dependency

Current working assumption:
- Railway appears out of scope for the current launch unless the converter proof service is intentionally being promoted to a live dependency

### 4. Database + Auth (Supabase)

Status: `Implemented, verify`

What the repo proves:
- [auth.js](../auth.js) implements email/password auth, Google OAuth, resend-confirmation UX, password recovery, and portal access
- [plans/auth-abuse-controls-and-agent-access-plan.md](../plans/auth-abuse-controls-and-agent-access-plan.md) records that SMTP delivery was already configured and validated after the MX fix
- [supabase/functions](../supabase/functions) contains the expected production functions, including `api-keys`, `claim-status`, `create-checkout`, `create-portal`, `download-pack`, `serve-premium-asset`, `stripe-webhook`, and `validate-mcp-key`

What is still missing:
- migration and RLS proof from the Supabase project
- Site URL and redirect URL verification in the dashboard
- branded email-template confirmation
- fresh sign-up, sign-in, password-reset, and Google OAuth proof in the live environment
- explicit capture of auth rate-limit settings

### 5. Payments (Stripe)

Status: `Verified live`

What the repo proves:
- [supabase/functions/create-checkout/index.ts](../supabase/functions/create-checkout/index.ts), [supabase/functions/create-portal/index.ts](../supabase/functions/create-portal/index.ts), and [supabase/functions/stripe-webhook/index.ts](../supabase/functions/stripe-webhook/index.ts) exist
- [store.js](../store.js) and [auth.js](../auth.js) call checkout and portal endpoints from the product UI

Live evidence captured on April 14, 2026:
- the operator confirmed a real live Stripe payment succeeded against the production flow

What is still useful but not blocking:
- keep a written note of the exact live product/price IDs and webhook configuration owner
- capture a customer-portal-only verification note if we want fuller release evidence

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

- `Open before launch`: runtime ownership and operator accountability
  The release preflight originally found no env-doc inventory in the repo. The new [launch-runtime-inventory.md](./launch-runtime-inventory.md) closes the documentation gap, but the owner-role slots still need named humans before launch.

- `Open before launch`: rollback and outage notes
  We have deploy config, but not a concise operator note for rollback, degraded-mode behavior, and who to check first if billing/auth fails.

- `Verified live`: Motion Lab hosted hardening
  [docs/plans/motion-lab-mcp-verification-hardening-plan.md](./plans/motion-lab-mcp-verification-hardening-plan.md) is now closed for its distinct launch proof:
  - on April 14, 2026, `motion-lab-session` was verified below-limit, over-limit, and then rechecked after restoring the normal threshold
  - the live deployment also reconfirmed that `motion-lab-session` must be deployed with `--no-verify-jwt`

- `Implemented, verify`: docs route strategy
  The docs work is functionally present, but [launch-jtbd.md](./launch-jtbd.md) still calls out one unresolved canonical-route decision between `/docs/...` and `/?view=docs`.

## Recommended Next Actions

1. Record the remaining Supabase dashboard truth explicitly: Site URL, redirect URLs, Google OAuth production setup, and SMTP/auth email ownership.
2. Decide whether Railway is truly out of scope and update the raw checklist if the answer is yes.
3. Write the short rollback/outage operator note so launch handling is not trapped in memory.
4. Resolve the docs canonical-route decision between `/docs/...` and `/?view=docs`.
5. Feed the current live evidence into the pre-release gates workflow and write the final go/no-go note.

## Source Records

- [launch-checklist.md](./launch-checklist.md)
- [launch-jtbd.md](./launch-jtbd.md)
- [plans/auth-abuse-controls-and-agent-access-plan.md](../plans/auth-abuse-controls-and-agent-access-plan.md)
- [docs/plans/motion-lab-mcp-verification-hardening-plan.md](./plans/motion-lab-mcp-verification-hardening-plan.md)
- [../.agents/workflows/pre-release-gates.md](../.agents/workflows/pre-release-gates.md)
