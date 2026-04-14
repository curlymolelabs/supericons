# Supericons Admin Dashboard

A standalone, password-protected admin panel for managing users, subscriptions, purchases, and audit history. No new framework. Fits the existing vanilla HTML/JS/CSS stack, deployed as a separate protected page on the same Netlify site.

A working UI mockup has been built and verified at [`admin.html`](../admin.html). That file is the design/source artifact, not yet the production publish target.

Last updated: April 14, 2026 (repo-grounded audit refinement)

**Decision:** Refine this existing plan. Do not replace it with a fresh plan. The overall shape is right for Supericons, but several launch-critical implementation gaps needed to be closed so the plan matches the current repo, deployment model, and cleanup use case.

---

## Access Model: Decision Closed

**Option A is selected: Netlify Basic Auth + `ADMIN_SECRET` Edge Function header.**

Admin access is a shared password, not a per-user role. This is correct for a solo operator.

### How to assign admin access

1. Set `NETLIFY_ADMIN_BASIC_AUTH_PASS` in Netlify Dashboard > Environment Variables.
2. Set `ADMIN_SECRET` in Supabase Dashboard > Edge Functions > Secrets.
3. Redeploy the site.

Anyone with the Basic Auth password can reach `/admin.html`. The browser still needs a second credential for direct requests to the Supabase Edge Function, so the current plan keeps `ADMIN_SECRET` as an operator credential sent in `x-admin-secret`.

> [!CAUTION]
> Netlify and Vite do **not** automatically inject arbitrary environment variables into a standalone static HTML file. If Option A is kept, the published admin page must be generated explicitly (for example by a small build script that turns `admin.html` into `public/admin.html` or `dist/admin.html` with the placeholder replaced). Treat `ADMIN_SECRET` as an operator-only credential, not a backend-only secret.

**To revoke access:** Change `NETLIFY_ADMIN_BASIC_AUTH_PASS` in Netlify and trigger a redeploy. The old password stops working at the CDN edge immediately.

**To upgrade to per-user admin later:** Add `is_admin boolean default false` to `si_profiles`, gate the Edge Function on a Supabase JWT claim instead of the shared secret, and update the access model at that point.

---

## Pre-conditions (Must Ship Before UI)

> [!WARNING]
> **Cascade FK gap is a blocking pre-condition.** The missing `ON DELETE CASCADE` rules on `si_purchases` and `si_subscriptions` mean that deleting a user via the admin panel will leave orphaned billing rows. This correctness bug must ship first.

> [!WARNING]
> **The admin page is not in the publish output today.** `admin.html` lives at the repo root, but Netlify only serves the `dist/` publish directory. Unless the admin page is moved under `public/` or copied/generated into `dist/` during build, `/admin` and `/admin.html` can never work in production.

> [!WARNING]
> **`admin-api` needs browser-facing CORS and `--no-verify-jwt`.** The admin page will call the Supabase function cross-origin from `supericons.dev` (and optionally `localhost:5173`). Without an `OPTIONS` path, `Access-Control-Allow-Headers` including `x-admin-secret`, and deployment with `--no-verify-jwt`, the browser will fail before the shared-secret check runs.

> [!WARNING]
> **`auth.users` is not directly joinable the way the route table currently implies.** Admin user search/detail must aggregate `supabase.auth.admin.*` results with public-table queries, or ship a dedicated security-definer SQL helper. A direct `.from('auth.users').select(... join ...)` route is not the implementation shape available today.

---

## Proposed Changes

### Layer 0: Pre-condition Migration (Ships First)

#### [NEW] `supabase/migrations/20260414_user_deletion_cascade.sql`

Fixes the missing `ON DELETE CASCADE` foreign keys so that deleting an `auth.users` row atomically cleans all child rows.

```sql
-- Fix cascade rules for safe user deletion
-- Verify constraint names in Supabase Dashboard before running.
alter table si_purchases
  drop constraint si_purchases_user_id_fkey,
  add constraint si_purchases_user_id_fkey
    foreign key (user_id) references auth.users(id) on delete cascade;

alter table si_subscriptions
  drop constraint si_subscriptions_user_id_fkey,
  add constraint si_subscriptions_user_id_fkey
    foreign key (user_id) references auth.users(id) on delete cascade;

-- si_motion_lab_rate_limits: keyed by subject_key text, no user_id FK.
-- Rows become orphaned on user deletion but are harmless.
-- The existing 1% probabilistic sweep cleans them within ~1 day.
-- No action required.
```

> [!NOTE]
> `si_credits` and `si_api_keys` are referenced in Edge Function code but have no migration file in this repo. Verify in Supabase Dashboard whether they exist in production. If they do, add `ON DELETE CASCADE` to their `user_id` foreign keys before running the above.

---

### Layer 1: Audit Log Table

#### [NEW] `supabase/migrations/20260414_si_admin_audit_log.sql`

All destructive or sensitive admin actions are written to this table before they execute. Provides a durable paper trail.

**Design note on `target_id`:** This column is intentionally `text`, not a foreign key to `auth.users`. Audit log rows must survive user deletion to preserve the historical record. When a user is deleted, their `user_id` UUID becomes the `target_id` string. The row is never cascaded away.

```sql
create table if not exists si_admin_audit_log (
  id          uuid primary key default gen_random_uuid(),
  action      text not null,
  -- action values: 'user.delete', 'user.ban', 'user.unban',
  --                'subscription.cancel', 'purchase.revoke'
  target_id   text not null,
  -- target_id: user_id UUID (as text), stripe_subscription_id, or product slug
  -- intentionally not a FK: rows must survive user deletion
  target_email text,
  -- capture email when available so audit search survives user deletion
  actor       text not null default 'admin',
  -- extend to per-user email later when Option B is adopted
  outcome     text not null default 'started',
  -- outcome values: 'started', 'succeeded', 'failed'
  payload     jsonb,           -- snapshot of data at time of action
  note        text,            -- optional admin-entered reason
  error_text  text,            -- populated only when outcome = 'failed'
  created_at  timestamptz not null default now()
);

-- Service-role only. No public access.
alter table si_admin_audit_log enable row level security;
revoke all on table si_admin_audit_log from public;
grant select, insert, update on table si_admin_audit_log to service_role;

create index si_admin_audit_log_target_idx on si_admin_audit_log (target_id);
create index si_admin_audit_log_target_email_idx on si_admin_audit_log (target_email);
create index si_admin_audit_log_created_at_idx on si_admin_audit_log (created_at desc);
create index si_admin_audit_log_action_idx on si_admin_audit_log (action);
create index si_admin_audit_log_outcome_idx on si_admin_audit_log (outcome);
```

> [!NOTE]
> The audit log is append-first, not truly tamper-proof. Service-role code can still edit rows. The goal is durable operational traceability, including failed destructive actions, not cryptographic immutability.

---

### Layer 2: Edge Functions (Backend API)

All admin endpoints live in a single Deno Edge Function at `/functions/v1/admin-api`.

> [!IMPORTANT]
> `admin-api` must be deployed with `--no-verify-jwt`. This function authenticates with `x-admin-secret`, not a Supabase user JWT. If it is deployed with default JWT verification, the platform will return `401` before the handler runs.

> [!IMPORTANT]
> **Supabase Edge Functions have no native router.** All routing must be done by manually parsing `new URL(req.url).pathname` inside the function. The path segments after `/functions/v1/admin-api` are arbitrary strings that must be split and matched by hand. Plan for a small internal router helper (e.g. `matchPath(pathname, pattern)`) rather than importing a full framework.

#### [NEW] `supabase/functions/admin-api/index.ts`

**Internal routing pattern:**
```typescript
const url = new URL(req.url);
// Strip the Supabase function prefix: /functions/v1/admin-api
const path = url.pathname.replace(/^\/functions\/v1\/admin-api/, '') || '/';
const segments = path.split('/').filter(Boolean);
// e.g. ['users', 'abc-123', 'delete'] for POST /users/:id/delete
```

**Routes handled:**

| Method | Path | Description |
|---|---|---|
| `GET` | `/users` | Paginated user list. Aggregates `supabase.auth.admin.listUsers()` with `si_profiles`, `si_subscriptions`, and purchase counts. Supports `?q=` (email search), `?plan=`, `?status=`, `?provider=`, `?page=` (25 per page). |
| `GET` | `/users/:id` | Full user detail built from `supabase.auth.admin.getUserById(userId)` plus public-table queries for profile, purchases, subscription, API keys, and audit log. |
| `POST` | `/users/:id/delete` | Full deletion flow (see below). |
| `POST` | `/users/:id/ban` | Set `banned_until` to a future timestamp via `supabase.auth.admin.updateUserById`. Writes `user.ban` to audit log. |
| `POST` | `/users/:id/unban` | Set `banned_until` to null. Writes `user.unban` to audit log. |
| `POST` | `/subscriptions/:id/cancel` | Cancel Stripe subscription without deleting user. Writes `subscription.cancel` to audit log. |
| `POST` | `/purchases/:id/revoke` | Delete a specific `si_purchases` row. Writes `purchase.revoke` to audit log. |
| `POST` | `/api-keys/:id/revoke` | Revoke a specific `si_api_keys` row if the table exists. Writes `api_key.revoke` to audit log. |
| `GET` | `/audit-log` | Paginated `si_admin_audit_log`. Supports `?q=` (target id or email), `?action=`, `?page=`. |
| `GET` | `/stats` | Aggregate counts (see Stats query spec below). |

**CORS + auth validation (every request, runs first):**
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': allowedOrigin,
  'Access-Control-Allow-Headers': 'content-type, x-admin-secret',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
};

if (req.method === 'OPTIONS') {
  return new Response('ok', { headers: corsHeaders });
}

const secret = req.headers.get('x-admin-secret');
if (!secret || secret !== Deno.env.get('ADMIN_SECRET')) {
  return new Response('Forbidden', { status: 403, headers: corsHeaders });
}
```

Allowed origins for launch:
- `https://supericons.dev`
- `http://localhost:5173`

**User index implementation note:**
- For launch scale, it is acceptable to call `supabase.auth.admin.listUsers()` and merge the returned page of users with public-table rows in memory by `user_id`.
- Do **not** describe this as a direct SQL join against `auth.users`; that is not the primitive the Edge Function has today.
- If user count grows enough that search/filtering becomes slow, replace this with a `security definer` SQL helper that projects the auth metadata needed by the admin panel.

**Deletion flow (`POST /users/:id/delete`):**
1. Fetch full user snapshot (profile + subscription + purchases) from Supabase.
2. Write `user.delete` entry to `si_admin_audit_log` with `outcome = 'started'`, `target_email`, and the full snapshot in `payload`.
3. If `si_subscriptions.stripe_subscription_id` is set and status is one of `active`, `trialing`, `past_due`, or `unpaid`: cancel the Stripe subscription.
4. If the request explicitly opts into test cleanup and `stripe_customer_id` exists: delete the Stripe customer after the subscription is no longer active.
5. Call `supabase.auth.admin.deleteUser(userId)`. Cascade deletes: `si_profiles`, `si_purchases`, `si_subscriptions`, and any other user-owned tables fixed in Layer 0.
6. Send account-deleted email via Resend using the email captured in step 1.
7. Update the audit row to `outcome = 'succeeded'` and return `{ success: true }`.
8. If any step fails after the audit row exists, update that row to `outcome = 'failed'` with `error_text`, then return a non-200 response.

> [!NOTE]
> This flow is **not atomic** across Stripe, Supabase Auth, and Resend. The plan must treat the audit row as an execution record, not a success record. A failed deletion should remain visible in the audit log with the captured error.

**Provider-specific deletion policy (launch):**
- Email/password users: delete the local Supabase account and app data.
- Google-auth users: delete the local Supabase account and app data only. Do **not** attempt to delete or modify the user's Google account from the admin panel.
- If we later add self-serve account deletion, we may offer Google consent revocation there. That is out of scope for the launch admin dashboard.

**Stats query spec (`GET /stats`):**

The `auth.users` table is not directly queryable via the public Supabase client. Use the service-role client and `supabase.auth.admin.listUsers()` for user counts, or create a SQL function that counts `auth.users` (requires service role). Required counts:

```typescript
// Total users: supabase.auth.admin.listUsers({ perPage: 1 }) -> total from response
// Active Pro:  select count(*) from si_subscriptions where status = 'active'
// Purchases:   select count(*) from si_purchases
// New (30d):   listUsers with created_at filter, or a count SQL function
// Recent signups (5):  listUsers sorted by created_at desc, limit 5
// Recent audit (5):    select * from si_admin_audit_log order by created_at desc limit 5
```

> [!NOTE]
> `supabase.auth.admin.listUsers()` returns paginated results. For a total count, read the `total` field on the first page response rather than iterating all pages. This keeps the stats endpoint fast.

---

### Layer 3: Netlify Access Gate

#### [MODIFY] `netlify.toml`

> [!CAUTION]
> Netlify only serves files that land in the publish directory. For this plan, that means the production admin page must be emitted as `public/admin.html` (preferred) or copied/generated into `dist/admin.html` during build. The current repo-root `admin.html` is not enough by itself.

Add the Basic Auth rule and the explicit admin redirect. Order matters: the admin entries must appear before `[[redirects]] from = "/*"`.

```toml
# Admin access gate (must appear before the SPA catch-all)
[[headers]]
  for = "/admin"
  [headers.values]
    Basic-Auth = "admin:{{NETLIFY_ADMIN_BASIC_AUTH_PASS}}"

[[headers]]
  for = "/admin.html"
  [headers.values]
    Basic-Auth = "admin:{{NETLIFY_ADMIN_BASIC_AUTH_PASS}}"

# Convenience route to the real static file
[[redirects]]
  from = "/admin"
  to = "/admin.html"
  status = 200

# ... existing SPA catch-all below (unchanged) ...
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

> [!NOTE]
> `NETLIFY_ADMIN_BASIC_AUTH_PASS` is set in Netlify Dashboard > Site Settings > Environment Variables. It is never committed to source code.

**Assigning admin access:**
- Set `NETLIFY_ADMIN_BASIC_AUTH_PASS` in Netlify. Credentials are `admin:<password>`.
- Set `ADMIN_SECRET` in Supabase Edge Function secrets (separate from Netlify).
- Redeploy. To revoke: change the password and redeploy.

---

### Layer 4: Admin Frontend

#### [NEW] `public/admin.html` (generated from the verified mockup source)

A single standalone HTML file in the publish path. The checked-in repo-root [`admin.html`](../admin.html) remains the mockup/source artifact; the production file should be generated into `public/admin.html` (or copied into `dist/admin.html`) so Netlify can serve it. Uses the Supericons design system: Space Grotesk headlines, Manrope body, Inter labels, `#FF4F00` primary, `#0e0e0e` background.

**Required build step:** add a tiny generator such as `scripts/build-admin-html.mjs` that:
1. reads the mockup source `admin.html`
2. replaces the `{{ADMIN_SECRET}}` placeholder from the environment
3. writes the publishable file to `public/admin.html` or `dist/admin.html`

The `ADMIN_SECRET` value is then embedded in the published file as a JS constant. Since the file is protected by Netlify Basic Auth at the CDN edge, the secret does not reach unauthenticated visitors.

```javascript
// In generated public/admin.html script block
const ADMIN_SECRET = '{{ADMIN_SECRET}}'; // injected by Netlify env at build time
```

> [!CAUTION]
> Do not handwave this as "Netlify env injection." The repo needs an explicit build/generation step or the placeholder will ship literally.

**Shell layout (verified in mockup):**

```
+----topbar (52px)--------------------------------------------+
| Supericons [ADMIN]                    • Production | site    |
+--sidebar (220px)--+--------main content (flex 1)------------+
| OVERVIEW          | [active panel fills this area]          |
|   Stats           |                                         |
| MANAGEMENT        |                                         |
|   Users    [142]  |                                         |
|   Audit Log       |                                         |
|                   |                                         |
|   Documentation   |                                         |
+-------------------+-----------------------------------------+
```

**Panel: Stats (Overview)**
- 4 KPI cards: Total Users, Active Pro, Total Purchases, New (30d).
- Each card shows a delta label (e.g. "+12 this month").
- 2-column grid below: Recent Signups (last 5) + Recent Actions (last 5 audit log entries).
- Action chips use color-coded monospace badges: `user.delete` (red), `subscription.cancel` (yellow), `purchase.revoke` (blue), `user.ban` (purple).

**Panel: Users**
- Search bar (debounced 300ms, `?q=email or name`).
- 3 filter dropdowns: Plan, Status, Provider.
- Table columns: User (avatar + email + name), Provider, Plan, Status, Purchases, Joined, Actions.
- Status badges: Active (green), Canceled (red), Cancels Apr 30 (yellow/warning), Free (muted).
- Row click or "View" button opens User Detail Drawer.
- Pagination: 25 per page, shown at the bottom with page numbers.

**Panel: User Detail Drawer (slide-in from right, 420px wide)**

Header: avatar (initials), display name, email, provider + plan + status badge row, close button.

5 tabs:
- **Account**: Supabase user ID, email, verified, auth provider, last sign-in, joined, ban status. Action button: Ban User. Danger Zone: Delete Account button (full-width red).
- **Subscription**: Plan, status, period end, Stripe subscription ID, Stripe customer ID. Cancel Subscription button.
- **Purchases**: List of `si_purchases` rows showing pack name, date, source. Per-row Revoke button.
- **API Keys**: List of `si_api_keys` rows (if table exists). Per-row Revoke button. Shows empty state if table not found.
- **API Keys**: List of `si_api_keys` rows (if table exists). Per-row Revoke button. Launch behavior should follow the existing API key model: set `revoked = true`, not hard-delete active keys.
- **Audit Log**: All `si_admin_audit_log` entries where `target_id = user_id`. Ordered newest first.

**Deletion confirm modal (z-index above drawer):**
- Warning icon, title "Delete this account?", description text.
- Monospace block showing the target email in red.
- Text input: user must type the exact email to enable the Delete button.
- Delete button is disabled until email matches exactly. No timeout or auto-dismiss.

**Audit Log panel:**
- Search input (filter by `target_id` or `target_email` substring).
- Action filter dropdown. Date range dropdown.
- Table: Timestamp, Action chip, Target (truncated monospace), Actor, Note, Payload toggle (expandable JSON).

---

### Layer 5: Environment Variables Required

| Variable | Where set | Purpose |
|---|---|---|
| `ADMIN_SECRET` | Supabase Edge Function secrets | Validates all `/admin-api` requests |
| `NETLIFY_ADMIN_BASIC_AUTH_PASS` | Netlify environment | Basic Auth password for `/admin*` CDN gate |
| `STRIPE_SECRET_KEY` | Already exists | Used in deletion and subscription cancel flows |
| `RESEND_API_KEY` | Already exists | Account-deleted confirmation email |
| `ADMIN_ALLOWED_ORIGINS` | Supabase Edge Function secrets | Optional explicit allowlist for `supericons.dev` and local admin dev |

---

## Resolved Questions

| Question | Resolution |
|---|---|
| Option A vs. Option B for access gate | **Option A selected.** Netlify Basic Auth + shared `ADMIN_SECRET`. Sufficient for solo operator. |
| `si_credits` and `si_api_keys` existence | **To verify in Supabase Dashboard before building.** Drawer renders empty state gracefully if tables do not exist. |
| SPA redirect conflict | **Confirmed gap.** Fixed in Layer 3 with explicit `/admin` redirect before the catch-all. |
| Edge Function routing | **Confirmed gap.** Requires manual path parsing. No native router. |
| Unban route missing | **Added.** `POST /users/:id/unban` added to route table. |
| Stats query against `auth.users` | **Clarified.** Use `supabase.auth.admin.listUsers()` with service role, not a direct table query. |
| Audit log cascade behavior | **Clarified.** `target_id` is intentionally `text` (not FK). Rows survive user deletion by design. |
| Root `admin.html` vs publish path | **Confirmed gap.** The repo-root mockup is not deployed by Netlify today. Ship the real file from `public/admin.html` or copy it into `dist/`. |
| Browser-to-Supabase admin requests | **Confirmed gap.** Requires CORS handling for `OPTIONS` + `x-admin-secret`, and deployment with `--no-verify-jwt`. |
| Audit log success/failure visibility | **Confirmed gap.** Add `outcome` and `error_text` so failed destructive actions are traceable. |
| Test-user cleanup in Stripe | **Added.** For disposable test accounts, support an explicit "also delete Stripe customer" path after subscription cancellation. |
| API key revoke action | **Confirmed gap.** Drawer promised a revoke control but the route table did not include one. Add `POST /api-keys/:id/revoke`. |
| Audit search by email | **Confirmed gap.** Store `target_email` in `si_admin_audit_log` so email-based filtering still works after user deletion. |
| Google-auth deletion semantics | **Clarified.** Admin deletion removes only Supericons/Supabase data. It does not delete or alter the user's Google account. |

---

## Verification Plan

### Automated
- Deploy `admin-api` Edge Function. Run curl against each route.
- Deploy `admin-api` with `--no-verify-jwt`.
- Verify `public/admin.html` (or generated `dist/admin.html`) is present in the publish output.
- Verify `OPTIONS /functions/v1/admin-api/...` succeeds with `Access-Control-Allow-Headers: content-type, x-admin-secret`.
- Verify `403` on missing/wrong `x-admin-secret`.
- Verify `401` Basic Auth challenge on missing Netlify Basic Auth (before the page even loads).
- Create a test user with a purchase and an active subscription.
- Trigger deletion via admin panel. Verify:
  - `si_admin_audit_log` has a `user.delete` row with `outcome = 'succeeded'`.
  - `si_purchases` row is gone.
  - `si_subscriptions` row is gone.
  - `si_profiles` row is gone.
  - `si_api_keys` rows are gone if the table exists.
  - Stripe subscription is canceled in Stripe Dashboard test mode.
  - Account-deleted email arrives in Resend logs.
- Trigger ban. Verify `banned_until` is set in Supabase Auth.
- Trigger unban. Verify `banned_until` is null.
- Trigger subscription cancel without user deletion. Verify Stripe subscription is canceled, user still exists.
- Trigger API key revoke if the table exists. Verify the key is marked revoked or deleted and the audit log records `api_key.revoke`.

### Manual
- Open `supericons.dev/admin` in browser. Verify Basic Auth prompt appears before any HTML is served.
- Navigate all panels. Verify data loads, pagination steps correctly, search filters the table.
- Open User Detail drawer. Verify all 5 tabs render and tab switching works.
- Open delete modal. Verify the Delete button is disabled until email matches exactly.
- Perform a full test account deletion end-to-end using an existing disposable test user from production data.

---

## Additional Suggestions

- Ship the admin surface in two passes:
  - **Pass 1:** Read-only stats, user list, user detail drawer, audit log.
  - **Pass 2:** Destructive actions (delete, revoke, cancel, ban/unban) only after the migration, audit outcome tracking, CORS, and `--no-verify-jwt` pieces are live.
- Keep launch scope deliberately small. Do **not** add per-admin accounts, rich note systems, bulk actions, export tools, or a full support inbox in the first version.
- Add a persistent environment badge in the topbar (`Production`, `Test cleanup mode`, etc.) so destructive actions are never taken against the wrong stack by accident.
- Make "Delete Stripe customer too" a separately gated checkbox inside the delete modal, labeled clearly as **test-data cleanup only**.
- For `purchase.revoke`, require a note/reason so the audit log stays useful later.
- Add a small "copy IDs" affordance in the drawer for `user_id`, `stripe_customer_id`, and `stripe_subscription_id`; this will save a lot of dashboard hopping during support work.
