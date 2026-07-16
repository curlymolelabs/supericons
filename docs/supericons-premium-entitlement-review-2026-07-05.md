# Premium pack entitlement review: claim access model and the serve-premium-asset inconsistency

Date: 2026-07-05
Status: analysis and proposal, no code changes made for the inconsistency described here
Audience: implementation agent
Repo: supericons (D:\Personal\Business\Curly Mole Labs\Experiments\Apps\DailySprint\supericons)
Contains no customer identifiers. Internal architecture detail; do not publish as-is.

---

## 1. Purpose

The owner has confirmed the intended entitlement rule for premium packs:

- Buying a pack grants ownership.
- A Pro subscription does NOT grant ownership of packs by itself.
- Pro subscribers earn one monthly claim; claiming a pack grants ownership of that pack.
- Ownership is what unlocks pack assets and the licensed source.

Most of the system now enforces this. One server function does not. This report documents the model as built, the remaining inconsistency, and a recommended fix for the implementing agent.

## 2. The entitlement model as built

### 2.1 Ownership record

Ownership is a row in the Supabase table `si_purchases` keyed by `(user_id, product_id)` with a `source` field distinguishing acquisition paths:

- `purchase`: Stripe checkout (written by the webhook)
- `credit`: monthly Pro claim (written by the claim RPC)
- `pro_annual_grant` / launch grants: bulk inserts for launch packs (written by the webhook)

All access decisions are supposed to reduce to "does an si_purchases row exist".

### 2.2 Write paths

- Stripe purchase: `supabase/functions/stripe-webhook/index.ts`, `checkout.session.completed` case, upserts `si_purchases`. Verified working end to end on 2026-07-05 after the webhook 401 incident (see `docs/incidents/stripe-webhook-401-recovery-handoff-2026-07-05.md`).
- Monthly claim: UI redeem button -> `supabase/functions/redeem-credit/index.ts` -> Postgres RPC `si_claim_pack` -> inserts `si_purchases` with `source = 'credit'` and enforces a 30 day cooldown via the latest `source = 'credit'` purchase timestamp. RPC defined in `supabase/migrations/20260406_simplified_claim_system.sql` and superseded by `supabase/migrations/20260705_claimable_packs.sql` (see 2.4).

### 2.3 Read paths (access checks)

| Surface | File | Rule | Consistent with intended model? |
|---|---|---|---|
| Customize panel owned state | `store.js` `isProductOwned` | si_purchases row only (Pro shortcut removed in commit e1a963c1c) | Yes |
| My Purchases view | `store.js` `fetchUserPurchases` | si_purchases join | Yes |
| Pack detail owned/locked state | `store.js` (userPurchases checks) | si_purchases | Yes |
| ZIP/licensed download | `supabase/functions/download-pack/index.ts` | Requires si_purchases row (403 otherwise); active subscription only upgrades the license tier to unlimited AFTER the purchase check passes | Yes |
| Per-file premium delivery | `supabase/functions/serve-premium-asset/index.ts` | si_purchases row OR any active subscription ("Pro subscribers have access to all packs") | NO, see section 3 |

### 2.4 Claim eligibility (which packs the monthly claim can redeem)

Changed on 2026-07-05, commit 1a2760492:

- New column `si_products.claimable` is the single source of monthly claim eligibility.
- `supabase/migrations/20260705_claimable_packs.sql` adds the column, backfills `claimable = true` for all `v1_launch = true` packs, sets it for slug `agentic-motion`, and recreates `si_resolve_claim_status` and `si_claim_pack` against the column.
- `v1_launch` continues to control only Launch Edition bundle membership and the Pro annual grant. Agentic Motion has `v1_launch = false` and is therefore claimable monthly but excluded from bundles and annual grants, per the owner's decision.
- Client mirror: `store.js` `isClaimableProduct` prefers `claimable`, falls back to the legacy `v1_launch` rule for rows without the column.
- IMPORTANT: this migration is committed to the repo but NOT yet applied to production. It must run (SQL editor paste or `supabase db push`) before or with the Agentic Motion launch.

### 2.5 The product in question

- Pack: Agentic Motion, slug `agentic-motion`, 50 animated icons, $9.99.
- `si_products` id: f74ed439-f1de-4a15-8c4f-1e272097a088, currently `status = 'draft'` (hidden pilot), `v1_launch = false`.
- Stripe price: price_1TpW6m35D7agOGFj2SwGhsJc.
- Delivery functions intentionally ignore product status, so entitlements keep working while the product is hidden. `create-checkout` requires `status = 'active'` to purchase.

## 3. The inconsistency: serve-premium-asset grants blanket Pro access

`supabase/functions/serve-premium-asset/index.ts` (authenticated branch, around lines 88-104): after checking for an si_purchases row, it falls back to:

```ts
// Pro subscribers have access to all packs
if (!isPurchased) {
  const { data: sub } = await adminClient
    .from('si_subscriptions')
    .select('status')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle();
  if (sub) isPurchased = true;
}
```

Effect: any active subscriber's token can fetch any pack file (including `bundle.json` with the full animated source and per-icon SVGs) through the licensed delivery endpoint without ever claiming or buying. This contradicts the owner's stated rule and is inconsistent with `download-pack`, which requires the purchase row.

History note: this permissive rule predates the current work. It also misled the customize panel implementation briefly (an `isPro()` shortcut in `isProductOwned` was added by mirroring it, then removed in commit e1a963c1c after the owner caught the wrong owned state in the UI).

### 3.1 Materiality: what this does and does not leak

- It does NOT leak anything confidential today. The same `bundle.json` is served publicly without auth at `/packs/<slug>/bundle.json` for the collection preview page. That is the existing, deliberate preview model for all 9 packs: previews are public, the business model relies on licensing, friction, and the licensed download path, not secrecy of the preview bundle.
- What it DOES undermine:
  1. Model consistency: two delivery functions disagree about what entitles access. Future code will copy one of them; the wrong one was already copied once (see history note).
  2. The licensed delivery story: `serve-premium-asset` is the designated gate for licensed, per-customer delivery (planned per-license fingerprinting and watermarked source). A gate that waves through all subscribers cannot anchor that.
  3. The Pro claim mechanic: if subscribers can fetch everything anyway, the monthly claim only controls UI badges, not access, which makes the just-shipped claimable feature cosmetically enforced at one endpoint and actually enforced at another.

## 4. Recommended course of action

### 4.1 Primary fix (small, do this)

In `serve-premium-asset/index.ts`, remove the subscription fallback so access requires an si_purchases row, matching `download-pack`. Keep everything else (path traversal guards, preview-mode cache headers, admin client usage) unchanged.

Acceptance behavior after the fix:

- Signed-in owner of the pack (purchase or claim): file served, as today.
- Active Pro subscriber without a purchase/claim row: 403 (or the function's existing not-entitled response), previously served.
- Signed-out or non-entitled: unchanged.

Deployment: `supabase functions deploy serve-premium-asset` by the owner, then run the gateway smoke test habit (`npm run verify:stripe-webhook-gateway` covers only the webhook; a direct authenticated/unauthenticated fetch against serve-premium-asset is the relevant manual check here).

### 4.2 Check the blast radius before shipping (implementer checklist)

1. Grep the client for `serve-premium-asset` / `PREMIUM_ASSET_FN` callers (`store.js` `fetchPremiumAsset` is the central helper; also `mcp/` runtime if any). Confirm every caller either (a) is used only for owned content, or (b) handles a 403 gracefully. Known callers: the owned-state copy actions in the customize panel (owner-only by construction), pack detail asset previews (verify which path they use; the detail page reads the public bundle directly per `store.js` collection detail code, so it should be unaffected).
2. Confirm the Pro annual grant and Launch Edition flows still deliver: those users have si_purchases rows, so they pass the stricter check. No change expected.
3. Confirm the single existing Pro subscriber's experience: after the fix they can no longer pull unowned pack files via the endpoint. They keep whatever they have claimed or been granted. Decide whether this needs a customer note (likely not; there is no UI path that exercised the loophole).
4. DEV fallback awareness: `fetchPremiumAsset` in `store.js` falls back to the public `/packs/` URL under `import.meta.env.DEV`, so local dev behavior masks entitlement failures. Test the 403 path against the deployed function, not just local dev.

### 4.3 Optional hardening to consider in the same pass (owner decisions, not defaults)

- Decide whether `serve-premium-asset` should keep serving files for `status = 'draft'` products to entitled users (current behavior, and the hidden-pilot workflow depends on it). Recommendation: keep as-is; document it as the intended contract.
- Longer term, if premium source secrecy ever matters more than preview convenience: stop shipping full animated CSS in the public `/packs/<slug>/bundle.json` and serve a preview-degraded bundle publicly, with the full bundle only via the licensed endpoint. This is a product decision with UX cost (the collection preview page currently uses the real bundle) and is explicitly out of scope for the primary fix. The owner previously rejected raster-degraded previews for fidelity reasons; any change here must keep preview fidelity intact, for example full-fidelity preview CSS for hover in preview surfaces while the downloadable licensed bundle carries per-customer fingerprinting.

### 4.4 Sequencing relative to the launch

The fix is independent of the Agentic Motion launch but touches the same function that will deliver the pack. Sensible order:

1. Complete the pending $9.99 live purchase test (validates webhook fulfillment and owned-state UX; currently the open item).
2. Apply the claimable migration (20260705) to production.
3. Ship the serve-premium-asset fix and deploy.
4. Re-test: purchase path owner account can copy source; a Pro account without claim gets 403 from the endpoint but sees correct buy/claim UI.
5. Proceed with the launch checklist (record promotion, search seeding, copy updates, status flip).

## 5. Key files and references

- `supabase/functions/serve-premium-asset/index.ts`: the function to fix (subscription fallback around lines 88-104).
- `supabase/functions/download-pack/index.ts`: the reference implementation of the strict rule (purchase row required; subscription only affects license tier).
- `supabase/functions/redeem-credit/index.ts` and `supabase/functions/claim-status/index.ts`: claim flow endpoints.
- `supabase/migrations/20260406_simplified_claim_system.sql`: original claim RPCs.
- `supabase/migrations/20260705_claimable_packs.sql`: claimable column and updated RPCs (NOT yet applied to production).
- `store.js`: `isProductOwned` (owned state, purchases only), `isClaimableProduct` (claim eligibility), `fetchPremiumAsset` (central premium fetch helper with DEV fallback), `fetchUserPurchases`.
- `lib/si-premium-motion.js`: customize panel premium preview and licensed-source copy actions (`extractIconCss`).
- `docs/incidents/stripe-webhook-401-recovery-handoff-2026-07-05.md`: webhook incident recovery context (fulfillment path health).
- Relevant commits: e1a963c1c (ownership requires purchase row, not Pro), 1a2760492 (claimable flag), 677c1b39a (owned state in panel), de0182260 (pack and commerce wiring).

## 6. Summary for the implementer

One function, one branch, one deploy: remove the active-subscription fallback in `serve-premium-asset` so it requires an `si_purchases` row like `download-pack` does. Verify callers tolerate 403, confirm granted/claimed users still pass, and test against the deployed function rather than dev (dev falls back to public files). Everything else in the entitlement model already matches the owner's intended rule: buy or claim to own; own to access.
