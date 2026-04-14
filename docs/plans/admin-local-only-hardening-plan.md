# Admin Local-Only Hardening Plan

## Goal

Keep the Supericons admin dashboard usable for solo operator maintenance while reducing the risk of a publicly reachable destructive admin surface.

The main app should remain public.

The admin workflow should move toward:

- admin page used locally by the operator
- admin API callable only from localhost origins
- no reliance on a permanently exposed production `/admin` page for routine operations

## Why This Matters

The current admin setup is workable, but it is still a shared-secret browser admin:

- `/admin` is publicly reachable on the production site
- Netlify Basic Auth protects the page
- `ADMIN_SECRET` protects the Supabase `admin-api`
- the browser stores `ADMIN_SECRET` in `sessionStorage` for the active tab

That is acceptable for a solo launch, but it is not the strongest long-term posture for destructive actions like:

- deleting users
- canceling subscriptions
- revoking purchases
- revoking API keys

The cleanest improvement is not a new auth system. It is simply reducing exposure.

## Current State

### Production admin page

- `/admin` redirects to `/admin.html`
- Netlify applies Basic Auth headers when the build includes `NETLIFY_ADMIN_BASIC_AUTH_PASS`
- the page calls the live Supabase Edge Function `admin-api`

### Production admin API

`admin-api` currently accepts browser calls from:

- `https://supericons.dev`
- `http://localhost:5173`

unless `ADMIN_ALLOWED_ORIGINS` is explicitly overridden.

### Auth model

- first gate: Netlify Basic Auth
- second gate: `x-admin-secret`
- operator enters `ADMIN_SECRET` manually in the admin UI

## Target State

For normal operations:

- run the admin UI locally
- keep the production app public
- allow `admin-api` only from localhost

Required end state for this hardening pass:

- production `/admin` removed from the public site
- admin workflow remains available locally only
- admin actions only available from local operator sessions

## Scope Decision

Do **not** overengineer this into:

- a full RBAC system
- Supabase admin-user roles
- OAuth-based admin login
- an internal VPN or new backend gateway

This plan is intentionally lightweight.

## Recommended Strategy

### Phase 1. Keep the current setup working

Do not break the current admin path immediately.

Before tightening anything:

1. confirm local `/admin` works against live `admin-api`
2. confirm the operator can still:
   - view users
   - inspect audit log
   - delete a test user

This gives a known-good fallback before restricting origins.

### Phase 2. Restrict `admin-api` to localhost

Set Supabase Edge Function secret:

- `ADMIN_ALLOWED_ORIGINS=http://localhost:5173`

Then redeploy `admin-api`.

Expected result:

- local admin page continues to work
- production-hosted `/admin` can no longer successfully call the live admin API

This is the biggest security win for the least complexity.

### Phase 3. Remove production `/admin` in the same hardening pass

After localhost-only origin restriction is confirmed, remove the public admin surface immediately.

This is not deferred work. It is part of the hardening sequence.

Required actions:

1. remove the `/admin` redirect from `netlify.toml`
2. stop emitting `admin.html` into the production publish output
3. stop generating production `_headers` entries for `/admin` and `/admin.html`

Result:

- `supericons.dev/admin` no longer exposes a public admin shell
- the only supported admin path is local operator use

### Phase 4. Rotate secrets after hardening

After the origin restriction is in place:

1. rotate `ADMIN_SECRET`
2. rotate `NETLIFY_ADMIN_BASIC_AUTH_PASS` if you keep production `/admin`

This is especially useful after heavy setup/testing.

## Concrete Changes

### Change 1. Supabase secret

Add or update:

```text
ADMIN_ALLOWED_ORIGINS=http://localhost:5173
```

If local admin is served from a different port later, update accordingly.

### Change 2. Redeploy `admin-api`

Redeploy with:

- same `--no-verify-jwt` setting
- no code change required unless additional localhost origins are needed

### Change 3. Local operator workflow

Document the normal admin workflow as:

1. run the local app
2. open local `/admin.html`
3. enter `ADMIN_SECRET`
4. perform admin actions against live Supabase

### Change 4. Remove production admin publish artifacts

Update the build/deploy path so production no longer publishes:

- `/admin`
- `/admin.html`
- admin-specific Basic Auth headers

Keep the repo-root [`admin.html`](../../admin.html) and [`public/admin-app.js`](../../public/admin-app.js) as local operator assets and source artifacts.

Recommended implementation shape:

- keep the source files in the repo
- stop copying `admin.html` into `public/admin.html` during production build
- remove `/admin` redirect from `netlify.toml`
- avoid generating `_headers` entries for admin in production builds
- if you ever need to intentionally republish the admin UI, require an explicit opt-in flag such as `PUBLISH_ADMIN_UI=true`

If local build support still needs a generated admin page, gate that behavior behind an explicit local-only flag instead of making it the default production behavior.

## Verification Plan

### Check 1. Local admin still works

From localhost:

- load `/admin.html`
- enter `ADMIN_SECRET`
- load stats
- load users
- load audit log

### Check 2. Production admin path is gone

From `https://supericons.dev/admin` and `https://supericons.dev/admin.html`:

- page should no longer expose the admin dashboard
- route should fall back to the public app or a non-admin response

Expected outcome:

- no public admin page shell
- no public-origin admin API access

### Check 3. Existing app flows remain unaffected

Verify:

- public site still loads
- checkout still works
- portal still works
- converter still works

Because this plan only changes admin origin policy, the public product should be unaffected.

## Risks and Notes

### 1. Localhost origin must match reality

If you use a different local port than `5173`, the admin API will reject the browser requests until `ADMIN_ALLOWED_ORIGINS` is updated.

### 2. CORS is not the only security layer

Origin restriction helps, but it is not the sole control.

The admin API should still keep:

- `ADMIN_SECRET`
- `--no-verify-jwt`
- narrow CORS headers

### 3. Production `/admin` removal should follow immediately after origin restriction

Origin restriction is the highest-value security control.

But because the public admin page is no longer wanted, remove it in the same hardening pass rather than treating it as future polish.

## Recommended Build Order

1. confirm local admin works against live `admin-api`
2. set `ADMIN_ALLOWED_ORIGINS=http://localhost:5173`
3. redeploy `admin-api`
4. verify localhost admin works
5. remove public `/admin` publish/routing
6. deploy once with public admin removed
7. verify production `/admin` and `/admin.html` are gone
8. rotate `ADMIN_SECRET`
9. rotate Netlify Basic Auth password only if you still need it for some other protected page

## Decision

The right next hardening step is **not** a redesign. It is:

- make `admin-api` localhost-only
- keep the admin workflow local
- remove public `/admin` in the same sequence
- rotate secrets afterward

That gives most of the security benefit with very little implementation risk.
