# Supericons Admin Dashboard

A standalone, password-protected admin panel for managing users, subscriptions, purchases, and audit history. No new framework. Fits the existing vanilla HTML/JS/CSS stack, deployed as a separate protected page on the same Netlify site.

A working UI mockup has been built and verified at [`admin.html`](../admin.html).

Last updated: April 14, 2026 (post-mockup audit pass)

---

## Access Model: Decision Closed

**Option A is selected: Netlify Basic Auth + `ADMIN_SECRET` Edge Function header.**

Admin access is a shared password, not a per-user role. This is correct for a solo operator.

### How to assign admin access

1. Set `NETLIFY_ADMIN_BASIC_AUTH_PASS` in Netlify Dashboard > Environment Variables.
2. Set `ADMIN_SECRET` in Supabase Dashboard > Edge Functions > Secrets.
3. Redeploy the site.

Anyone with the Basic Auth password can reach `/admin.html`. The `ADMIN_SECRET` is embedded in `admin.html` at build time (via Netlify environment injection or hardcoded in the file, never in git). The Edge Function rejects any request not carrying the correct `x-admin-secret` header.

**To revoke access:** Change `NETLIFY_ADMIN_BASIC_AUTH_PASS` in Netlify and trigger a redeploy. The old password stops working at the CDN edge immediately.

**To upgrade to per-user admin later:** Add `is_admin boolean default false` to `si_profiles`, gate the Edge Function on a Supabase JWT claim instead of the shared secret, and update the access model at that point.

---

## Pre-conditions (Must Ship Before UI)

> [!WARNING]
> **Cascade FK gap is a blocking pre-condition.** The missing `ON DELETE CASCADE` rules on `si_purchases` and `si_subscriptions` mean that deleting a user via the admin panel will leave orphaned billing rows. This correctness bug must ship first.

> [!WARNING]
> **The SPA catch-all redirect in `netlify.toml` will swallow `/admin*` paths.** The current `/* -> /index.html` redirect (line 20) is evaluated before header rules in Netlify's routing pipeline. The Basic Auth gate will never fire unless admin routing is explicitly ordered before the catch-all. See Layer 3 fix below.

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

All destructive or sensitive admin actions are written to this table before they execute. Provides a tamper-resistant paper trail.

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
  actor       text not null default 'admin',
  -- extend to per-user email later when Option B is adopted
  payload     jsonb,           -- snapshot of data at time of action
  note        text,            -- optional admin-entered reason
  created_at  timestamptz not null default now()
);

-- Service-role only. No public access.
alter table si_admin_audit_log enable row level security;
revoke all on table si_admin_audit_log from public;
grant select, insert on table si_admin_audit_log to service_role;

create index si_admin_audit_log_target_idx on si_admin_audit_log (target_id);
create index si_admin_audit_log_created_at_idx on si_admin_audit_log (created_at desc);
create index si_admin_audit_log_action_idx on si_admin_audit_log (action);
```

---

### Layer 2: Edge Functions (Backend API)

All admin endpoints live in a single Deno Edge Function at `/functions/v1/admin-api`.

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
| `GET` | `/users` | Paginated user list. Joins `auth.users` + `si_profiles` + `si_subscriptions`. Supports `?q=` (email search), `?plan=`, `?status=`, `?provider=`, `?page=` (25 per page). |
| `GET` | `/users/:id` | Full user detail: profile, purchases, subscription, audit log entries for this user. |
| `POST` | `/users/:id/delete` | Full deletion flow (see below). |
| `POST` | `/users/:id/ban` | Set `banned_until` to a future timestamp via `supabase.auth.admin.updateUserById`. Writes `user.ban` to audit log. |
| `POST` | `/users/:id/unban` | Set `banned_until` to null. Writes `user.unban` to audit log. |
| `POST` | `/subscriptions/:id/cancel` | Cancel Stripe subscription without deleting user. Writes `subscription.cancel` to audit log. |
| `POST` | `/purchases/:id/revoke` | Delete a specific `si_purchases` row. Writes `purchase.revoke` to audit log. |
| `GET` | `/audit-log` | Paginated `si_admin_audit_log`. Supports `?target_id=`, `?action=`, `?page=`. |
| `GET` | `/stats` | Aggregate counts (see Stats query spec below). |

**Auth validation (every request, runs first):**
```typescript
const secret = req.headers.get('x-admin-secret');
if (!secret || secret !== Deno.env.get('ADMIN_SECRET')) {
  return new Response('Forbidden', { status: 403 });
}
```

**Deletion flow (`POST /users/:id/delete`):**
1. Fetch full user snapshot (profile + subscription + purchases) from Supabase.
2. Write `user.delete` entry to `si_admin_audit_log` with the full snapshot in `payload`.
3. If `si_subscriptions.stripe_subscription_id` is set and `status === 'active'`: call `stripe.subscriptions.cancel(subscriptionId)`.
4. Call `supabase.auth.admin.deleteUser(userId)`. Cascade deletes: `si_profiles`, `si_purchases`, `si_subscriptions`.
5. Send account-deleted email via Resend using the email captured in step 1.
6. Return `{ success: true }`.

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
> The current `/* -> /index.html` SPA redirect (line 20) is evaluated before header rules in Netlify's routing pipeline. If `admin.html` is simply placed in `dist/`, Netlify will serve it as a static file before the SPA redirect fires. However, if the catch-all matches first, the Basic Auth header rule may not apply. The safest fix is to add an explicit static-file redirect for `/admin` before the catch-all.

Add the Basic Auth rule and the explicit admin redirect. Order matters: the admin entries must appear before `[[redirects]] from = "/*"`.

```toml
# Admin access gate (must appear before the SPA catch-all)
[[headers]]
  for = "/admin*"
  [headers.values]
    Basic-Auth = "admin:{{NETLIFY_ADMIN_BASIC_AUTH_PASS}}"

# Serve admin.html as a real file (prevents SPA catch-all from intercepting)
[[redirects]]
  from = "/admin"
  to = "/admin.html"
  status = 200

[[redirects]]
  from = "/admin.html"
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

#### [NEW] `admin.html` (mockup built and verified)

A single standalone HTML file in the project root. Built, deployed, and verified in the browser. Uses the Supericons design system: Space Grotesk headlines, Manrope body, Inter labels, `#FF4F00` primary, `#0e0e0e` background.

The `ADMIN_SECRET` value is embedded in this file as a JS constant. Since the file is protected by Netlify Basic Auth at the CDN edge, the secret never reaches unauthenticated users.

```javascript
// In admin.html script block
const ADMIN_SECRET = '{{ADMIN_SECRET}}'; // injected by Netlify env at build time
// OR hardcoded (acceptable since the file is CDN-gated)
```

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
- **Account**: Supabase user ID, email, verified, auth provider, last sign-in, joined, ban status. Action buttons: Ban User, Send Email. Danger Zone: Delete Account button (full-width red).
- **Subscription**: Plan, status, period end, Stripe subscription ID, Stripe customer ID. Cancel Subscription button.
- **Purchases**: List of `si_purchases` rows showing pack name, date, source. Per-row Revoke button.
- **API Keys**: List of `si_api_keys` rows (if table exists). Per-row Revoke button. Shows empty state if table not found.
- **Audit Log**: All `si_admin_audit_log` entries where `target_id = user_id`. Ordered newest first.

**Deletion confirm modal (z-index above drawer):**
- Warning icon, title "Delete this account?", description text.
- Monospace block showing the target email in red.
- Text input: user must type the exact email to enable the Delete button.
- Delete button is disabled until email matches exactly. No timeout or auto-dismiss.

**Audit Log panel:**
- Search input (filter by `target_id` or email substring).
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

---

## Verification Plan

### Automated
- Deploy `admin-api` Edge Function. Run curl against each route.
- Verify `403` on missing/wrong `x-admin-secret`.
- Verify `403` on missing Netlify Basic Auth (before the page even loads).
- Create a test user with a purchase and an active subscription.
- Trigger deletion via admin panel. Verify:
  - `si_admin_audit_log` has a `user.delete` row.
  - `si_purchases` row is gone.
  - `si_subscriptions` row is gone.
  - `si_profiles` row is gone.
  - Stripe subscription is canceled in Stripe Dashboard test mode.
  - Account-deleted email arrives in Resend logs.
- Trigger ban. Verify `banned_until` is set in Supabase Auth.
- Trigger unban. Verify `banned_until` is null.
- Trigger subscription cancel without user deletion. Verify Stripe subscription is canceled, user still exists.

### Manual
- Open `supericons.dev/admin` in browser. Verify Basic Auth prompt appears before any HTML is served.
- Navigate all panels. Verify data loads, pagination steps correctly, search filters the table.
- Open User Detail drawer. Verify all 5 tabs render and tab switching works.
- Open delete modal. Verify the Delete button is disabled until email matches exactly.
- Perform a full test account deletion end-to-end.
