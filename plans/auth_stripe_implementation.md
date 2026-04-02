# Supericons: Auth + Stripe Implementation Plan

> **Single source of truth.** Update this document after each phase is complete.
> Last updated: 2026-03-24
> Status: All phases complete

---

## Site Audit

### Layout (index.html, 378 lines)

```
Landing Hero (#landingHero)                -- Dismissible intro
  #app
  |-- Header (#header)                     -- L187
  |     |-- Hamburger (#sidebarToggle)
  |     |-- Logo + Wordmark (a.header__logo)
  |     |-- Search bar (#searchInput)
  |     |-- Icon count (#iconCount)
  |     |-- Action buttons (div.header__actions)  -- L213
  |     |     |-- Multi-select toggle
  |     |     |-- Panel toggle (Customize)
  |     |     |-- Theme toggle
  |     |     |-- [AUTH BUTTON]                   << NEW
  |
  |-- Main Layout (#mainLayout)            -- 3-column flex
  |     |-- Sidebar (#sidebar)             -- L231
  |     |     |-- Browse: All Icons, Favorites, Recent
  |     |     |-- Divider
  |     |     |-- Libraries (9 items, COLLAPSIBLE) << MODIFIED
  |     |     |-- [PRO SECTION]                    << NEW
  |     |
  |     |-- Grid (#gridArea)               -- L258
  |     |-- Panel (#panel)                 -- L291
  |
  |-- Compare Drawer                       -- L312
  |-- Footer                               -- L326
  |-- Contact Modal                        -- L342 (reuse pattern for auth modal)
  |-- Toast                                -- L372
```

### Existing Supabase Connection

Supericons already uses the **CML Supabase project** via direct REST API:
- URL: `kcjmkakdhsqplvasgkjv.supabase.co` (main.js L13)
- Anon key: already in main.js L14
- Used for: `icon_stats` table (fire-and-forget POST)
- No Supabase JS client installed. Raw `fetch()` calls only.

**Decision:** We will add the Supabase JS client (`@supabase/supabase-js`) via CDN for auth. The existing REST calls for icon_stats remain unchanged.

---

## UI Placement

### 1. Auth Button (Header, top-right, after theme toggle)

**Logged out:** Small "Sign in" text button with subtle border.
```
[Multi-select] [Customize] [Theme] [Sign in]
```

**Logged in:** 28px avatar circle (initials fallback, orange border).
```
[Multi-select] [Customize] [Theme] [G ▾]
```

Click opens dropdown:
- My Purchases
- Manage Subscription (if Pro)
- Sign Out

### 2. Auth Modal (Overlay)

Same styling as Contact Modal (`#contactModal`). Two modes toggled by text link:
- **Sign In:** Email + password, "Sign in with Google" button
- **Sign Up:** Email + password + display name, "Sign up with Google" button

After sign-up: Supabase sends verification email. Show "Check your email" message.

**Mobile:** Modal becomes full-width bottom sheet (existing pattern).

### 3. Collapsible Libraries Sidebar

Libraries section becomes collapsible (click header to toggle).
- Default: **collapsed** to save space for the Pro section
- Chevron icon rotates on toggle
- State persisted to localStorage
- Font size reduced from current to 0.8rem for sidebar items

### 4. Pro Sidebar Section (below Libraries)

New section after Libraries divider:
```
PRO
  Animated Packs     8
  My Downloads       3    (logged-in only)
```

### 5. Pack Catalog (Grid Area, new view)

When "Animated Packs" clicked, grid switches to show pack cards.
Back button returns to icon grid.

### 6. Dashboard (Grid Area, new view)

When "My Purchases" clicked from avatar dropdown, grid shows dashboard.

---

## Database Schema

All tables in the existing CML Supabase project. Prefix with `si_` to namespace.

### si_profiles
```sql
create table si_profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text not null,
  display_name text,
  avatar_url   text,
  created_at   timestamptz default now()
);
alter table si_profiles enable row level security;
create policy "users_read_own" on si_profiles for select using (auth.uid() = id);
create policy "users_update_own" on si_profiles for update using (auth.uid() = id);
```

### si_products
```sql
create table si_products (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  slug            text unique not null,
  description     text,
  price_cents     int not null,
  stripe_price_id text,
  pack_type       text not null default 'single', -- 'single' | 'bundle' | 'pro_exclusive'
  icon_count      int not null default 10,
  preview_url     text,  -- path to demo HTML
  css_filename    text,  -- filename in storage bucket
  status          text not null default 'active',  -- 'active' | 'draft'
  created_at      timestamptz default now()
);
alter table si_products enable row level security;
create policy "public_read_active" on si_products for select using (status = 'active');
```

### si_purchases
```sql
create table si_purchases (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id),
  product_id        uuid not null references si_products(id),
  stripe_session_id text,
  purchased_at      timestamptz default now(),
  unique(user_id, product_id)
);
alter table si_purchases enable row level security;
create policy "users_read_own" on si_purchases for select using (auth.uid() = user_id);
```

### si_subscriptions
```sql
create table si_subscriptions (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid unique not null references auth.users(id),
  stripe_subscription_id  text unique,
  stripe_customer_id      text,
  status                  text not null default 'active', -- active | canceled | past_due
  current_period_end      timestamptz,
  plan                    text default 'pro'
);
alter table si_subscriptions enable row level security;
create policy "users_read_own" on si_subscriptions for select using (auth.uid() = user_id);
```

---

## Build Phases

### Phase 1: Auth Layer
> Status: **DONE**

**Goal:** Users can sign in/out. Profile stored. Sidebar collapsible.

| Action | File | Detail |
|---|---|---|
| Add Supabase JS CDN | `index.html` | `<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2">` before main.js |
| Create auth module | `auth.js` [NEW] | `initAuth()`, `signIn()`, `signUp()`, `signOut()`, `onAuthChange()`, `getUser()`, Google OAuth |
| Auth button in header | `index.html` L213 | After theme toggle, inside `div.header__actions` |
| Auth modal markup | `index.html` | After `#contactModal`, same card pattern |
| Avatar dropdown | `style.css` | `.auth-avatar`, `.auth-dropdown`, logged-in/out states |
| Collapsible libraries | `index.html` + `style.css` + `main.js` | Wrap library list in collapsible container, add toggle chevron, persist state |
| Smaller sidebar font | `style.css` | Reduce `.sidebar__item-name` to 0.8rem |
| Wire auth to main.js | `main.js` | Import auth, update header on auth state change |
| Create profile trigger | Supabase console | SQL function: auto-create `si_profiles` row on auth.users insert |
| Enable auth providers | Supabase console | **Manual: User must enable Email + Google OAuth in Supabase dashboard** |

**Manual user task:** Enable Email and Google OAuth providers in Supabase dashboard. Configure Google OAuth with client ID/secret from Google Cloud Console.

### Phase 2: Pro Store + Stripe Checkout
> Status: **DONE**

**Goal:** Users browse packs, preview animations, pay via Stripe Checkout.

| Action | File | Detail |
|---|---|---|
| Create store module | `store.js` [NEW] | `renderPackCatalog()`, `renderPackCard()`, `handlePurchase()` |
| ~~Pro sidebar section~~ | ~~`index.html`~~ | ~~Already done in Phase 1~~ |
| Pack catalog view | `index.html` + `style.css` | Pack cards in grid area, reusing `.icon-grid` container |
| Checkout Edge Function | `supabase/functions/create-checkout/index.ts` [NEW] | Creates Stripe Checkout Session, returns URL |
| Webhook Edge Function | `supabase/functions/stripe-webhook/index.ts` [NEW] | Handles `checkout.session.completed`, inserts `si_purchases` |
| Seed products table | SQL migration | Insert rows for Status & Feedback pack + upcoming packs |
| File delivery | Supabase Storage | Private `pack-files` bucket, signed URL generation in Edge Function |
| View switching | `main.js` | Sidebar click toggles between icon grid and pack catalog |

**Manual user task:** Create Stripe account. Create products + prices. Add Stripe secret key to Supabase Edge Function secrets. Add webhook signing secret.

### Phase 3: Pro Subscription
> Status: **DONE**

**Goal:** $9/mo subscription with gating.

| Action | File | Detail |
|---|---|---|
| Subscription checkout | `store.js` | Add Pro subscription card, Stripe Checkout in subscription mode |
| Subscription webhook | `stripe-webhook/index.ts` | Handle `customer.subscription.created/updated/deleted` |
| Subscription status | `auth.js` | Fetch `si_subscriptions` on login, expose `isPro()` helper |
| Pro gating | `store.js` | Pro-exclusive packs show "Upgrade to Pro" for non-subscribers |
| Customer Portal | `auth.js` | Stripe Customer Portal link for self-service cancellation |

### Phase 4: Dashboard + Polish
> Status: **DONE**

**Goal:** Purchase history, re-downloads, subscription management.

| Action | File | Detail |
|---|---|---|
| Dashboard view | `store.js` | Purchase history table, re-download buttons (signed URLs) |
| Dashboard styles | `style.css` | History table, subscription card, API key section |
| Portal redirect | `auth.js` | "Manage Subscription" links to Stripe Customer Portal |
| API key gen | Future | Deferred: implement when API access is ready |

---

## Error Handling

| Scenario | Behavior |
|---|---|
| Stripe Checkout fails/canceled | User returns to site, toast: "Payment was not completed. Try again." |
| Webhook delivery fails | Stripe retries up to 3 days. Edge Function must be idempotent (upsert, not insert). |
| Auth token expired | Supabase JS client auto-refreshes. If refresh fails, redirect to sign-in. |
| Network error during auth | Toast: "Connection error. Please try again." |
| Duplicate purchase attempt | DB unique constraint (user_id, product_id) prevents doubles. UI shows "Already purchased." |

---

## Security Checklist

- [ ] RLS on all `si_*` tables
- [ ] Stripe webhook signature verification in Edge Function
- [ ] Signed URLs for pack file downloads (1-hour expiry)
- [ ] No Stripe secret key in client-side JS (only in Edge Functions)
- [ ] Supabase anon key is fine in client (RLS protects data)
- [ ] CORS: Edge Functions allow only supericons.dev origin
- [ ] Profile trigger: runs as `security definer` with service role

---

## Progress Log

| Phase | Status | Date | Notes |
|---|---|---|---|
| Phase 1 | **DONE** | 2026-03-24 | auth.js, auth modal, avatar dropdown, collapsible sidebar, Pro section, si_profiles migration |
| Phase 2 | **DONE** | 2026-03-24 | store.js, pack catalog CSS, Edge Functions (create-checkout, stripe-webhook, download-pack), si_products migration, view switching |
| Phase 3 | **DONE** | 2026-03-24 | si_subscriptions migration, create-portal Edge Function, isPro(), fetchSubscription(), openCustomerPortal(), Pro card in pack catalog, Pro badge in dropdown |
| Phase 4 | **DONE** | 2026-03-24 | Dashboard already built in Phase 2, Portal redirect in Phase 3, API key deferred per plan |
