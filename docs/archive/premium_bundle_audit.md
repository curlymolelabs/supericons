# Premium Bundle Exposure: Independent Audit

Audit of findings from a prior agent session. Each claim is verified against actual source code viewed in this session.

---

## Finding 1: bundle.json ships full premium SVG + CSS payloads

**Verdict: TRUE**

| Claim | Evidence |
|---|---|
| `build-collection-bundles.js` creates JSON with all SVGs + CSS | Confirmed: [L64](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/scripts/build-collection-bundles.js#L64) `const bundle = { css, icons }` |
| The bundle includes every `.svg` file in the collection directory | Confirmed: [L55-61](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/scripts/build-collection-bundles.js#L55-L61) reads all `.svg` files |
| The bundle contains the full CSS file | Confirmed: [L52](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/scripts/build-collection-bundles.js#L52) reads the complete CSS |
| The bundle is written to `public/packs/{slug}/bundle.json` | Confirmed: [L65-68](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/scripts/build-collection-bundles.js#L65-L68) |

The `ai-agentic` bundle is 108KB and contains all 50+ obfuscated SVGs plus the 58KB CSS file.

**Severity: Confirmed Critical.** The bundle is the complete premium payload in a single fetchable JSON file.

---

## Finding 2: The UI fetches the bundle before entitlement is enforced

**Verdict: TRUE**

| Claim | Evidence |
|---|---|
| `renderCollectionDetail` always fetches `/packs/${product.slug}/bundle.json` | Confirmed: [store.js L1092-1094](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L1092-L1094) |
| The fetch happens unconditionally (no auth check) | Confirmed: the `Promise.all` at L1092 runs before the `isPurchased` gating at L1179 |
| This is a static file fetch, not an Edge Function call | Confirmed: it uses `/packs/${product.slug}/bundle.json` (direct URL), not `PREMIUM_ASSET_FN` |

> [!IMPORTANT]
> The agent correctly identified the core issue: the bundle is fetched as a static file from Netlify, completely bypassing the Edge Function entitlement flow. The `fetchPremiumAsset` function (used for individual icon download in the customize panel) does go through the Edge Function, but the grid preview fetch does not.

**Severity: Confirmed Critical.** Anyone (including anonymous users) can `curl` the bundle URL.

---

## Finding 3: Non-purchasers receive raw premium SVG markup

**Verdict: TRUE**

| Claim | Evidence |
|---|---|
| SVG text is read from the bundle and injected via `innerHTML` | Confirmed: [store.js L1213-1215](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L1213-L1215) |
| The PREVIEW watermark is a visual overlay only | Confirmed: [store.js L1180-1186](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L1180-L1186) creates a CSS overlay div |
| The raw SVG is extractable from the JSON response | Confirmed: the bundle is plain JSON with no encryption or transformation |

**One nuance the agent missed:** The SVGs are obfuscated (class names randomized by [obfuscate-assets.js](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/scripts/obfuscate-assets.js)). This means the SVG markup itself is unmodified and usable, but the CSS animation class names are randomized. A scraper would get working static SVGs, but would need to reverse-map the CSS to get the animations.

However, since `bundle.json` ships both the obfuscated CSS and the obfuscated SVGs *together*, the mapping is trivially recoverable. The obfuscation is speed-bump only.

**Severity: Confirmed Critical.**

---

## Finding 4: Vite plugin removes individual files but preserves bundle.json

**Verdict: TRUE**

| Claim | Evidence |
|---|---|
| `excludePremiumAssets` plugin explicitly skips `bundle.json` | Confirmed: [vite.config.js L33](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/vite.config.js#L33) `if (file === 'bundle.json') continue;` |
| Individual `.svg` and `.css` files are removed from `dist/packs/` | Confirmed: [vite.config.js L31-39](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/vite.config.js#L31-L39) |
| Verified in actual `dist/` output | Confirmed: `dist/packs/ai-agentic/` contains only `bundle.json` (no individual SVGs or CSS) |

> [!NOTE]
> The build pipeline correctly removes individual SVG/CSS files from production. The gap is that `bundle.json` is the actual exposure vector and it is intentionally preserved.

**Severity: Confirmed High.** The comment at [L6-12](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/vite.config.js#L6-L12) explicitly documents this tradeoff: *"Keeps: bundle.json per collection (grid rendering: CSS + all SVGs in one file)"*.

---

## Finding 5: Rest of public site is deterrence-only

**Verdict: TRUE, but partially overstated**

| Claim | Evidence | Accurate? |
|---|---|---|
| No sourcemaps enabled | Confirmed: no `sourcemap` config in [vite.config.js](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/vite.config.js) and Vite defaults to no sourcemaps in build mode | TRUE |
| Security headers present in netlify.toml | Confirmed: [netlify.toml L24-31](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/netlify.toml#L24-L31) includes X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy | TRUE |
| "Does not stop layout or frontend cloning" | This is true for any browser app, but the original agent's point about the general site is not the real concern | OVERSTATED |

**What the agent missed on this point:** The Edge Function ([serve-premium-asset/index.ts](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/supabase/functions/serve-premium-asset/index.ts)) is actually well-designed for individual asset serving. It verifies JWT, checks purchase records, and checks Pro subscriptions. The problem is specifically that the grid rendering path bypasses this Edge Function entirely by using the static `bundle.json`.

The Edge Function also explicitly documents at [L10-16](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/supabase/functions/serve-premium-asset/index.ts#L10-L16) that it allows unauthenticated preview access intentionally ("friction-based deterrence"), so even the Edge Function path would not block a determined scraper.

**Severity: Confirmed Moderate.**

---

## Summary Assessment

| # | Finding | Verified | Severity | Agent Accurate? |
|---|---|---|---|---|
| 1 | bundle.json ships full payload | TRUE | Critical | Yes |
| 2 | Bundle fetched before entitlement | TRUE | Critical | Yes |
| 3 | Non-purchasers get raw SVGs | TRUE | Critical | Yes, missed obfuscation nuance |
| 4 | Vite removes files but keeps bundle | TRUE | High | Yes |
| 5 | Deterrence-only protection | TRUE | Moderate | Partially overstated |

> [!WARNING]
> **The core diagnosis is correct.** `bundle.json` is publicly fetchable at a predictable URL (`/packs/{slug}/bundle.json`) and contains the complete premium payload (all SVGs + all CSS) with no authentication. Any user can:
> 1. Load `manifest.json` to discover collection slugs
> 2. Fetch `/packs/{slug}/bundle.json` for each collection
> 3. Parse the JSON to extract all SVGs and CSS
> 4. The obfuscation adds no meaningful barrier since both sides of the mapping ship together

## What the original agent got right
- All five code references are accurate (correct files, correct line numbers, correct behavior)
- The recommendation to stop shipping `bundle.json` with raw assets is sound
- The suggestion to use an Edge Function for grid rendering is the correct architectural direction

## What the original agent missed or overstated
1. **The Edge Function already exists and works.** The issue is not "no server-side protection" but rather "the grid rendering path bypasses the server-side protection that already exists."
2. **The obfuscation layer exists** (randomized CSS class names, randomized keyframe names). It does not prevent extraction, but it is not "zero protection" either.
3. **The Edge Function itself is also permissive.** Even routing grid previews through the Edge Function would still serve assets to unauthenticated users (per L10-16 design comment). The real fix requires deciding: should previews show real SVGs at all, or should they show rasterized/watermarked alternatives?

## Open Questions

> [!IMPORTANT]
> Before planning a fix, you should decide:
> 1. **Is the grid preview showing real SVGs acceptable?** The Edge Function already allows unauthenticated preview access. Moving bundle data behind it would add latency but not access control unless the Edge Function policy also changes.
> 2. **What is the acceptable preview experience for non-purchasers?** Options:
>    - Real SVGs with animations (current: trivially extractable)
>    - Rasterized PNG/WebP thumbnails (prevents SVG extraction, requires build step)
>    - Low-fidelity SVG placeholders (simpler outlines, no detail)
>    - No preview at all (just names and purchase CTA)
> 3. **Is the $5 per-pack price point worth the engineering cost of rasterized previews?** The Edge Function comment at L16 suggests you already considered this tradeoff ("accepted as a business tradeoff for a $5 product").
