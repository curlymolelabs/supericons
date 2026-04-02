# Collection Loading: Static Bundle + Obfuscation Fix

## Problem

Opening a premium collection takes 1-2s before any icons appear.
The user sees a blank page during this time.

### Why it's slow

1. **51 Edge Function calls.** Each of the 50 icons + 1 CSS file goes
   through `serve-premium-asset`, which performs 3-5 DB queries per call
   (getUser, product lookup, purchase check, subscription check, storage
   download). Total: ~200 redundant DB queries.

2. **Sequential await bottleneck.** The CSS must be awaited before icons
   render because `getAnimClass` inspects loaded stylesheets at runtime
   (a workaround for the compound class obfuscation bug).

3. **Late DOM shell.** The collection header and grid skeleton don't
   appear until both the manifest AND CSS have loaded.

### Why the Edge Function was the wrong tool for grid rendering

The `serve-premium-asset` Edge Function was designed for individual icon
access (customize panel, export). Per v3 strategy, preview content is
served regardless of purchase status. Running full auth for 50 identical
preview requests is an N+1 antipattern that produces no actionable delta.

---

## Solution Overview

1. Fix the obfuscation script (root cause of the CSS await)
2. Build static bundle JSON per collection at deploy time
3. Serve bundles from public CDN path (no Edge Function for grid)
4. Show shell + skeleton instantly, fill icons from bundle
5. Keep `serve-premium-asset` for customize/export only

---

## Step 0: Fix Obfuscation Script

### Root Cause

`obfuscate-assets.js` line 172 uses `replaceAll`:

```js
css = css.replaceAll(`.si-anim--${iconName}`, `.${token}`);
```

Processing order matters. When `agent` (token: `ko8vty`) is processed,
it replaces ALL occurrences of `.si-anim--agent`, including the substring
inside `.si-anim--agent-group`. Result: `.si-anim--agent-group` becomes
`.ko8vty-group`. When `agent-group` (token: `b7pk0q`) is processed next,
there's nothing left to replace.

### Affected Icons (17 total across 4 collections)

| Collection | Broken Icons |
|-----------|-------------|
| ai-agentic (5) | agent-group, agent-stop, agent-workflow, model-selector, prompt-template |
| social-communication (4) | user-check, phone-call, phone-incoming, phone-outgoing |
| ecommerce (6) | shopping-bag-alt, gift-card, gift-alt, wallet-alt, coin-stack, barcode-scan |
| navigation-menus (2) | menu-open, close-fullscreen |

### Fix

Sort replacements by name length descending before applying. Longer
names get replaced first, so `.si-anim--agent-group` is replaced before
`.si-anim--agent`, preventing substring collision.

#### [MODIFY] [obfuscate-assets.js](file:///d:/Personal/Business/Curly Mole Labs/Experiments/Apps/DailySprint/supericons/scripts/obfuscate-assets.js)

In Step 6 (line 170), sort `iconClassMap` entries by key length descending:

```diff
-    for (const [iconName, token] of Object.entries(iconClassMap)) {
+    const sortedEntries = Object.entries(iconClassMap)
+      .sort((a, b) => b[0].length - a[0].length);
+    for (const [iconName, token] of sortedEntries) {
```

### Post-fix actions

1. Re-run `node scripts/obfuscate-assets.js` to regenerate obfuscated
   CSS + SVGs with correct class mappings.
2. Verify all 17 broken icons now have matching CSS tokens.
3. **Do NOT re-upload to Supabase Storage yet** (Step 1 will generate
   bundles from the corrected files; upload happens in Step 2).

---

## Step 1: Build Static Bundle JSON

### New Script

#### [NEW] [build-collection-bundles.js](file:///d:/Personal/Business/Curly Mole Labs/Experiments/Apps/DailySprint/supericons/scripts/build-collection-bundles.js)

Reads from `public/packs/{slug}/` and produces one JSON file per
collection:

```
public/packs/{slug}/bundle.json
```

Contents:

```json
{
  "css": "/* obfuscated CSS content */",
  "icons": {
    "agent": "<svg ...>...</svg>",
    "agent-group": "<svg ...>...</svg>",
    ...
  }
}
```

Logic:
1. Read the CSS file (`collectionData.css` from manifest).
2. Read all `.svg` files in the directory.
3. Write `bundle.json` with CSS + all SVGs keyed by filename (minus `.svg`).

Estimated size: ~50 SVGs at ~1KB each + ~10KB CSS = ~60KB per bundle.
Gzipped: ~15-20KB.

### Integration with build pipeline

Add to `package.json`:

```json
"scripts": {
  "build:bundles": "node scripts/build-collection-bundles.js",
  "build": "npm run build:bundles && vite build"
}
```

---

## Step 2: Update Upload Script + Serve Bundles Publicly

### Current state

- `upload-premium-assets.js` uploads individual SVGs + CSS to the
  private `premium-icons` bucket.
- The `serve-premium-asset` Edge Function downloads from that bucket.

### Change

#### [MODIFY] [upload-premium-assets.js](file:///d:/Personal/Business/Curly Mole Labs/Experiments/Apps/DailySprint/supericons/scripts/upload-premium-assets.js)

Add `bundle.json` to the upload list. Upload it to the SAME private
bucket (it's still obfuscated content; we don't want clean filenames
in public URLs).

However, for grid rendering, the bundle needs to be fetched without
Edge Function overhead. Two options:

**Option A: Serve bundle.json from public/packs/ via Vite/CDN**

The bundle is already in `public/packs/{slug}/bundle.json` after the
build step. Vite serves it directly. In production, it's a static asset
on the CDN. No Edge Function needed.

- Pro: Zero latency overhead, CDN-cached, simple.
- Con: The bundle is at a predictable URL. But it contains obfuscated
  content (same as what DevTools shows), so the security posture matches
  the v3 strategy: "Accept preview leakage as a business tradeoff."

**Option B: New lightweight Edge Function for bundles**

A `serve-collection-bundle` endpoint that reads the single bundle.json
from storage with minimal auth (just apikey, no per-user purchase check).

- Pro: No public URL.
- Con: Edge Function cold start + storage read. Still slower than CDN.

**Recommendation: Option A.** The content is already visible in the DOM
after rendering. A public CDN URL for the obfuscated bundle adds no new
attack surface. The per-icon Edge Function stays for authenticated
customize/export where purchase verification matters.

---

## Step 3: Update renderCollectionDetail

#### [MODIFY] [store.js](file:///d:/Personal/Business/Curly Mole Labs/Experiments/Apps/DailySprint/supericons/store.js)

### 3a: Simplify getAnimClass (lines 595-647)

With the obfuscation fix, `getAnimClass` goes back to a simple map lookup.
Remove the runtime stylesheet inspection, the `_animClassCache`, and the
compound fallback:

```js
function getAnimClass(collectionData, iconName) {
  return collectionData?.classMap?.[iconName] || `si-anim--${iconName}`;
}
```

### 3b: Remove CSS await (line 736)

Change `await loadCollectionCSS(...)` back to fire-and-forget. The CSS
is now also embedded in the bundle, so it can be injected from bundle
data instead of a separate fetch.

### 3c: Show shell before any await (line 807)

Move `gridArea.appendChild(detail)` to BEFORE `await loadManifest()`.
Build the header from the `product` object (already in memory). Show a
shimmer skeleton grid while the bundle loads.

### 3d: Replace 50x fetchPremiumAsset with single bundle fetch

Replace the `Promise.all(iconList.map(async (iconData) => { ... }))` block
(lines 818-900) with:

```js
// Fetch bundle (single CDN request, no Edge Function)
const bundleRes = await fetch(`/packs/${product.slug}/bundle.json`);
const bundle = await bundleRes.json();

// Inject CSS from bundle
const cssId = `collection-css-${product.slug}`;
if (!document.getElementById(cssId)) {
  const style = document.createElement('style');
  style.id = cssId;
  style.textContent = bundle.css;
  document.head.appendChild(style);
}

// Render icons from bundle data
for (const iconData of iconList) {
  const iconName = typeof iconData === 'string' ? iconData : iconData.name;
  const svgText = bundle.icons[iconName];
  // ... build cell, insert SVG, append to grid
}
```

### 3e: Keep fetchPremiumAsset for customize panel

The `selectPremiumIcon()` and `showLockedPanel()` functions still use
`fetchPremiumAsset` for individual icon access in the customize panel.
This is the correct use case for the per-icon Edge Function.

---

## Step 4: Staggered Reveal (Optional Polish)

#### [MODIFY] [style.css](file:///d:/Personal/Business/Curly Mole Labs/Experiments/Apps/DailySprint/supericons/style.css)

Add a CSS cascade animation for icon cells:

```css
.collection-detail__icon-cell {
  opacity: 0;
  animation: si-cell-reveal 0.3s ease forwards;
  animation-delay: calc(var(--cell-index) * 30ms);
}

@keyframes si-cell-reveal {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

Set `--cell-index` on each cell during rendering.

---

## Verification Plan

### After Step 0 (Obfuscation fix)

```bash
node scripts/obfuscate-assets.js
node -e "..." # verify 0 broken icons across all 8 collections
```

### After Step 1 (Bundle build)

```bash
node scripts/build-collection-bundles.js
# verify bundle.json exists for all 8 collections
# verify each bundle has correct icon count + CSS content
```

### After Step 3 (Grid rendering)

1. Open collection: header appears instantly (no blank page).
2. Icons appear within 200ms (single fetch, no Edge Function).
3. Hover over previously-broken icons: animations play correctly.
4. Click an icon: customize panel still works via fetchPremiumAsset.
5. Network tab: 1 bundle.json request instead of 51 individual fetches.

### Cross-collection spot check

Test at least 3 collections: ai-agentic (had compound bug), ecommerce
(different CSS filename), status-feedback (no compound issues).

---

## Security Impact

| Aspect | Before | After |
|--------|--------|-------|
| Grid preview SVGs | Served via Edge Function (auth checked, same result) | Served from CDN bundle (obfuscated, same content) |
| Customize/export SVGs | fetchPremiumAsset Edge Function | fetchPremiumAsset Edge Function (unchanged) |
| CSS class names | Obfuscated (with 17 broken tokens) | Obfuscated (all tokens correct) |
| Public URL for bulk icons | None (edge fn required) | `/packs/{slug}/bundle.json` (obfuscated) |
| DOM inspection | SVGs visible | SVGs visible (unchanged) |
| Network tab | 51 responses with clean SVG content | 1 response with obfuscated JSON bundle |
| Automated scraping | 50 predictable filenames via manifest | 1 URL per collection (obfuscated content) |

Net effect: equivalent or slightly better. A scraper needs to parse JSON
instead of clean SVG files, and gets obfuscated class names instead of
semantic ones. The v3 strategy ("accept preview leakage") is unchanged.
