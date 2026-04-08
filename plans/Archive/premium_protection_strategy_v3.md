# Premium Icon Protection Strategy (Final)

## Decision

Accept preview leakage as a business tradeoff. Non-purchasers see
live SVG+CSS animations (best for conversion). Protection focuses on
closing the cheapest exploit vectors (direct URL access, automated
scraping) through server-side gating.

---

## Threat Model

**Assets:** 400 animated SVG icons, 8 collections, $5 each.

| Vector | Effort to exploit | Closes with |
|--------|-------------------|-------------|
| Direct URL (`curl /packs/slug/icon.svg`) | Trivial | **Supabase Storage** |
| Manifest scrape (iterate all icon names) | Trivial | **Supabase Storage** |
| DOM inspection (`querySelector('svg')`) | Easy | Accepted (preview tradeoff) |
| Network tab (read fetch response) | Easy | Accepted (preview tradeoff) |
| Screenshot + AI recreate | Moderate | Unavoidable |
| Paying customer shares files | Any | License enforcement |

---

## Shipping Plan

### Phase 1: Authenticated Asset Delivery (~4 hours)

**Goal:** Block direct URL access and automated scraping.

1. Move premium SVG+CSS files from `public/packs/{slug}/` to a
   private Supabase Storage bucket (`premium-icons/{slug}/`).
2. Create `serve-premium-asset` Edge Function:
   - Validates JWT or API key from `Authorization` header
   - Checks purchase record in `si_purchases` table
   - Returns SVG/CSS if purchased, 403 otherwise
3. Update `store.js` fetch calls to use the Edge Function
   endpoint instead of direct public URLs.
4. Strip premium icons from the public manifest. Non-purchasers
   get icon names and metadata (for the grid), not file paths.
5. **Bug fix:** `getCollectionCSS()` at store.js:770 hardcodes
   `/${slug}/${slug}.css` but two collections use different filenames:
   - `ecommerce` has `e-commerce.css` (not `ecommerce.css`)
   - `navigation-menus` has `navigation-menu.css` (not `navigation-menus.css`)
   - Fix: pass `collectionData.css` from the manifest instead of
     constructing the filename from the slug.

**Locked preview flow (non-purchasers):**
- Grid shows icon names, category tags, lock badge (from metadata).
- SVGs are still fetched and rendered for the preview. The fetch goes
  through the Edge Function, which serves them for preview but logs
  the request. The existing grid-level "PREVIEW" watermark overlay
  (store.js:732-738) remains.
- The customize panel shows a locked state prompting purchase.

**Purchased flow:**
- Same Edge Function, authenticated. Returns full SVG/CSS.
- Customize panel unlocks: color, stroke, speed, export.

### Phase 2: CSS Obfuscation (~2 hours)

**Goal:** Raise friction for casual "Inspect Element, copy CSS" theft.

1. Build a Node.js post-process script that:
   - Renames semantic CSS class names (`si-help-q` to `x7k2`)
   - Renames SVG element classes to match
   - Strips comments
   - Minifies the output
2. Run as part of the build/deploy pipeline.
3. Animation still works but code is unreadable. Effort to
   reverse-engineer goes from 2 minutes to 2+ hours.

### Phase 3: Premium Value (Ongoing, strategic)

Make the paid version meaningfully better than anything extractable:
- Figma components (editable source)
- No attribution requirement
- MCP/API access for agentic integration
- Commercial license
- Priority support and updates

---

## Dropped Approaches

| Approach | Reason | Status |
|----------|--------|--------|
| Shadow DOM | Hover-bridging complexity, Network tab bypass renders it moot | Plan archived in `plans/closed_shadow_dom_plan.md` |
| Canvas VM / Path2D | Animation fidelity ~85% of CSS originals, noticeable gap | Code stashed in `git stash` ("canvas-vm-work") |
| Per-icon watermark | Grid-level PREVIEW watermark already exists, redundant | Prototyped at `tools/watermark-demo.html` |
| Video rasterization | H.264 chroma subsampling destroys color at icon sizes | Rejected |

---

## Industry Reference

| Company | Preview for non-payers | Protection | Price |
|---------|----------------------|-----------|-------|
| Lordicon | Live animation (Lottie player) | Licensing, value-add | $9/mo |
| Flaticon | PNG thumbnail, watermarked | Watermark + licensing | $9/mo |
| Noun Project | SVG with visible watermark | Watermark + licensing | $3/icon |
| Icons8 | Low-res PNG | Format gating | $13/mo |

None use client-side DRM. All rely on server-side gating + licensing.
