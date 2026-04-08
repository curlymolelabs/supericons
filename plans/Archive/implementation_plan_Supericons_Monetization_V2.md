# Supericons Monetization V2: PRD + Implementation Plan

> **Builds on:** [auth_stripe_implementation.md](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/plans/auth_stripe_implementation.md) (Phases 1-4 DONE)
> **Strategy:** [monetization_strategy.md](file:///C:/Users/guanh/.gemini/antigravity/brain/a548c71c-3096-44c5-a79a-13b7ff814c33/monetization_strategy.md)
> **Audit:** [monetization_audit_mindmap.md](file:///C:/Users/guanh/.gemini/antigravity/brain/a548c71c-3096-44c5-a79a-13b7ff814c33/monetization_audit_mindmap.md)

---

## Stripe Configuration (DONE)

| Product | Price | Mode | Stripe Price ID |
|---|---|---|---|
| Pro Monthly | $15/mo | Subscription | `price_1TEtIs3eLO1ro0kliSB6whjH` |
| Pro Annual | $99/yr | Subscription | `price_1TEtK73eLO1ro0klfhQrsrJa` |
| Launch Edition | $29 | One-time | `price_1TEtZz3eLO1ro0kl0Xk8q1Nw` |
| Individual Pack | $5 | One-time | (existing per-pack price IDs) |

---

## Existing Infrastructure (Already Built)

| Component | File | Status |
|---|---|---|
| Auth (email, Google OAuth, session) | [auth.js](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/auth.js) | DONE |
| Store (catalog, checkout, dashboard) | [store.js](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js) | DONE |
| Stripe Checkout session creation | [create-checkout/index.ts](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/supabase/functions/create-checkout/index.ts) | DONE |
| Stripe Webhook handler | [stripe-webhook/index.ts](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/supabase/functions/stripe-webhook/index.ts) | DONE |
| Pack file download (signed URLs) | [download-pack/index.ts](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/supabase/functions/download-pack/index.ts) | DONE |
| Customer portal redirect | [create-portal/index.ts](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/supabase/functions/create-portal/index.ts) | DONE |
| DB: `si_profiles`, `si_products`, `si_purchases`, `si_subscriptions` | Supabase | DONE |

---

## Proposed Changes

### Phase 1: Stripe Reconfiguration (DONE)

Summary: Wire the new Stripe price IDs into the codebase and add Launch Edition bulk-purchase logic.

---

#### [MODIFY] [store.js](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js)

- Replace `STRIPE_PRO_MONTHLY` value with `price_1TEtIs3eLO1ro0kliSB6whjH`
- Replace `STRIPE_PRO_YEARLY` value with `price_1TEtK73eLO1ro0klfhQrsrJa`
- Add `STRIPE_LAUNCH_EDITION = 'price_1TEtZz3eLO1ro0kl0Xk8q1Nw'`
- Add Launch Edition card to pack catalog (with "Save 27%" badge vs buying individually)

#### [MODIFY] [stripe-webhook/index.ts](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/supabase/functions/stripe-webhook/index.ts)

- In `checkout.session.completed` (payment mode): detect Launch Edition product. Query `si_products where v1_launch = true`, bulk-insert 8 rows into `si_purchases`.
- Add `invoice.paid` event handler (needed for Phase 2 credit issuance).

#### [MODIFY] Supabase: `si_products` table

```sql
alter table si_products add column v1_launch boolean default false;
-- Then set the flag on the 8 launch collections:
update si_products set v1_launch = true where slug in (
  'ai-agentic', 'status-feedback', 'e-commerce', 'navigation-menus',
  'data-visualization', 'communication', 'media-playback', 'security-auth'
);
```

#### Stripe Dashboard (Manual, DONE)

- [x] Pro Monthly: $15/mo
- [x] Pro Annual: $99/yr  
- [x] Launch Edition: $29 one-time
- [x] Add `invoice.paid` to webhook events

---

### Phase 2: Credit System (DONE)

Summary: Audible-style drip. Pro subscribers earn 1 collection credit per billing cycle. Annual gets 3 upfront. Caps: 3 (monthly), 5 (annual). Claimed packs permanent.

---

#### [NEW] SQL Migration: `si_credits`

```sql
create table si_credits (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  type        text not null, -- 'earned' | 'bonus' | 'redeemed'
  product_id  uuid references si_products(id), -- set when type='redeemed'
  created_at  timestamptz default now(),
  note        text
);
alter table si_credits enable row level security;
create policy "users_read_own" on si_credits for select using (auth.uid() = user_id);
```

Balance = `count(earned + bonus) - count(redeemed)` (append-only ledger, idempotent-safe).

#### [MODIFY] [stripe-webhook/index.ts](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/supabase/functions/stripe-webhook/index.ts)

Add `invoice.paid` handler:
1. Look up `si_subscriptions` by `stripe_subscription_id`
2. Get subscription plan (monthly vs annual) from `si_subscriptions.plan`
3. Calculate current credit balance
4. Determine cap: 3 (monthly) or 5 (annual)
5. If balance < cap: insert 1 `earned` credit
6. If first invoice on annual plan: insert 3 `bonus` credits (check no existing bonus rows)

#### [MODIFY] `si_subscriptions` table

```sql
-- Add plan field if not present (values: 'pro_monthly' | 'pro_annual')
alter table si_subscriptions add column if not exists plan text default 'pro_monthly';
```

The webhook sets `plan` based on which Stripe price ID was used during checkout.

#### [NEW] Edge Function: `redeem-credit/index.ts`

```
POST /functions/v1/redeem-credit
Body: { product_id: string }
Auth: Supabase JWT required

1. Verify active Pro subscription
2. Calculate credit balance (earned + bonus - redeemed)
3. If balance <= 0: 400 "No credits available"
4. If product already in si_purchases: 400 "Already owned"
5. Insert si_credits row (type='redeemed', product_id)
6. Insert si_purchases row (user_id, product_id, stripe_session_id='credit_redeem')
7. Return { success: true, remaining_credits }
```

#### [MODIFY] [store.js](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js)

- Add `fetchCredits()` and `getCreditBalance()` functions
- Update collection card CTA logic:
  - Pro + credits + not owned: "Claim with Credit (X left)"
  - Pro + no credits + not owned: "Get Collection $5"
  - Owned: "Download"
- Add confirmation modal for credit redemption
- Add credit balance badge in sidebar Pro section

#### [MODIFY] [auth.js](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/auth.js)

- Add `getCreditBalance()` export
- Fetch credit balance alongside subscription status on login

---

### Phase 3: API Key Management + Rate Limiting

Summary: Pro subscribers generate API keys for MCP/programmatic access.

---

#### [NEW] SQL Migration: `si_api_keys`

```sql
create table si_api_keys (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  key_prefix  text not null,       -- 'si_a1b2c3d4' (first 8 chars for display)
  key_hash    text not null unique, -- SHA-256 of full key
  label       text default 'Default',
  created_at  timestamptz default now(),
  last_used   timestamptz,
  revoked     boolean default false
);
alter table si_api_keys enable row level security;
create policy "users_read_own" on si_api_keys for select using (auth.uid() = user_id);
create policy "users_update_own" on si_api_keys for update using (auth.uid() = user_id);
```

#### [NEW] Edge Function: `api-keys/index.ts`

- **POST** (generate): Verify Pro sub, limit 3 active keys, generate `si_` + 32 hex chars, store SHA-256 hash, return full key once
- **DELETE** (revoke): Set `revoked = true` (soft delete)

#### [MODIFY] [store.js](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js)

- Dashboard: API Keys section (list, generate, copy, revoke)
- Key display modal (shown once, then masked)

#### Rate Limiting (MCP Server)

| Tier | Identification | Limit |
|---|---|---|
| Unauthenticated | No header | 30 req/hr |
| Free (with key) | Valid key, no Pro | 200 req/hr |
| Pro | Valid key + active sub | 2,000 req/hr |

Response headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`. 429 with `Retry-After` when exceeded.

---

### Phase 4: MCP Server Auth Gating (DONE)

Summary: Restrict premium icons to Pro API keys only.

---

#### [MODIFY] MCP Server (`mcp/` directory)

1. Auth middleware: check `Authorization: Bearer si_xxxxx` header
2. Hash key, look up in `si_api_keys` (not revoked)
3. Join to `si_subscriptions` for Pro status check
4. No key or no Pro: return free icons only
5. Pro key: return free + all premium icons
6. Premium request without Pro: `403 { error: "Pro subscription required" }`

---

### Phase 5: Pricing Page + UI Updates (DONE)

Summary: Dedicated pricing comparison and conditional CTAs.

---

#### [MODIFY] [store.js](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js)

- `renderPricingPage()`: 4-column comparison (Free / $5 / Pro / Launch Edition)
- Monthly/Annual toggle with animated price swap + "Save 45%" badge
- "Most Popular" ribbon on Pro Annual
- FAQ accordion
- CTA buttons wired to `handleCheckout()` with correct price IDs

#### [MODIFY] [index.html](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/index.html)

- Add "Pricing" link to sidebar and footer
- Pricing page container markup

#### [MODIFY] [style.css](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/style.css)

- Pricing tier cards, toggle switch, FAQ accordion, responsive layout

#### Collection Card CTA Logic

```
if (!loggedIn):         "Get Collection $5" -> auth modal -> checkout
if (isPro && credits):  "Claim with Credit (X left)" -> redeem-credit
if (isPro && !credits): "Get Collection $5" -> checkout
if (owned):             "Download" -> download-pack
```

#### Launch Edition Card

- Shown in pack catalog: "Launch Edition: All 8 Collections"
- Price: "$29" with "Save 27%" badge
- If user owns all 8: show "Complete" badge

---

### Phase 6: Legal + Polish (DONE)

---

#### [MODIFY] [download-pack/index.ts](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/supabase/functions/download-pack/index.ts)

- Inject LICENSE.txt into zip based on tier:
  - A-la-carte / credit: "Single Project" license
  - Pro subscription / Launch Edition: "Unlimited Projects" license

#### [NEW] Terms of Service Page

- Usage rights, AI output rights, no raw SVG redistribution, refund policy

---

## Verification Plan

### Per-Phase Tests

| Phase | Verification |
|---|---|
| 1 | Checkout creates session with new price IDs. Launch Edition triggers 8 bulk purchases. |
| 2 | `invoice.paid` issues credit. Balance respects caps (3/5). Redemption creates purchase + deducts. |
| 3 | Key generation returns `si_xxx`. Hash validates on lookup. 429 after rate exceeded. |
| 4 | MCP without key: free only. With Pro key: all icons. Premium without Pro: 403. |
| 5 | Pricing page renders 4 tiers. Toggle switches prices. CTAs open correct checkouts. |
| 6 | Downloaded zip contains correct LICENSE.txt. |

### Manual Verification

- Stripe test mode: $15 checkout, verify credit in DB
- Claim collection via credit, verify download works
- Cancel sub, verify claimed packs remain
- Generate API key, use in MCP, verify premium access
- Annual checkout: verify 3 bonus credits appear
