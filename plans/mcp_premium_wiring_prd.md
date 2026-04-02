# MCP Premium Icons Wiring: Implementation Plan

## Goal

Wire premium animated icon collections into the Supericons MCP server so that
paying users (Pro subscribers, Pack buyers, Launch Bundle buyers) can search and
retrieve premium icons programmatically through AI coding agents.

## Decisions (Finalized)

1. **Pack/Bundle buyers get MCP access** to their purchased collections.
2. **Clean CSS** served via MCP (not obfuscated).
3. **Anonymous users see only free icons** in search (no premium teaser).

---

## Current State

### Access Model

```
No API key  ->  Anonymous  ->  Free icons only (20,000+)
API key     ->  Validate   ->  Pro? All icons. Otherwise free only.
```

### Key Files

| File | Role |
|---|---|
| `mcp/index.js` | MCP server. 3 tools: search_icons, get_icon, list_libraries |
| `mcp/auth.js` | Validates SUPERICONS_API_KEY against si_api_keys table |
| `mcp/search.js` | 5-layer synonym search engine |
| `supabase/functions/api-keys/index.ts` | API key CRUD (Pro-only generation) |
| `public/packs/manifest.json` | Collection metadata + classMap (icon -> obfuscated class) |
| `public/packs/{slug}/{slug}.css` | Obfuscated CSS per collection |
| `public/packs/{slug}/*.svg` | Obfuscated SVGs per collection |

### What's Missing

1. Pack/Bundle buyers cannot generate API keys (api-keys function requires Pro).
2. `auth.js` only checks subscription, not purchases. Binary: Pro or not.
3. Premium icons returned without CSS. Animations don't work.
4. CSS on disk is obfuscated. MCP should serve clean, readable CSS.
5. Pricing page shows "Premium icons via MCP" as X for Pack/Bundle tiers.

---

## Proposed Changes

### Change 1: API Key Generation for Pack Buyers

**File**: `supabase/functions/api-keys/index.ts`

**Current** (line 119): Rejects non-Pro users with "Active Pro subscription required."

**New logic**:
```
Allow key generation if:
  - User has active Pro subscription, OR
  - User has at least 1 record in si_purchases
```

**Diff** (~10 lines): After the Pro check fails, query `si_purchases` for the user.
If any purchase exists, allow key generation. If neither Pro nor any purchase,
return the existing 403.

**Risk**: Low. Only changes the guard condition. Key storage and validation unchanged.

---

### Change 2: Auth Returns Purchased Slugs

**File**: `mcp/auth.js`

**Current**: Returns `{ authenticated, isPro, userId, error }`

**New**: Also queries `si_purchases` joined with `si_products` to get purchased
collection slugs. Returns:
```js
{
  authenticated: true,
  isPro: false,
  purchasedSlugs: ['ai-agentic', 'ecommerce'],
  userId: '...',
  error: null
}
```

**Implementation**: After the Pro subscription check, add a second fetch:
```
GET /rest/v1/si_purchases?user_id=eq.{userId}&select=si_products(slug)
```

**RLS consideration**: The `si_purchases` and `si_products` tables must allow
read access via the anon/publishable key for the user's own records. If RLS
blocks this, we need an Edge Function to proxy this query. Current auth.js
uses the publishable key, so check that RLS allows:
- `si_api_keys`: read where `key_hash` matches (anon reads needed)
- `si_subscriptions`: read where `user_id` matches (anon reads needed)
- `si_purchases`: read where `user_id` matches (anon reads needed, NEW)

**Verify**: Run a test query with the anon key to confirm RLS allows it.

**Risk**: Low. Adds one additional Supabase REST call at MCP startup.

---

### Change 3: Per-Collection Icon Gating

**File**: `mcp/index.js`

**Current** (line 96):
```js
function getAccessibleIcons() {
  return authState.isPro ? allIcons : freeIcons;
}
```

**New**:
```js
function getAccessibleIcons() {
  if (authState.isPro) return allIcons;
  if (authState.purchasedSlugs?.length > 0) {
    const purchased = premiumIcons.filter(i =>
      authState.purchasedSlugs.includes(i.lib)
    );
    return [...freeIcons, ...purchased];
  }
  return freeIcons;
}
```

**Impact on tools**:
- `search_icons`: Automatically scoped by `getAccessibleIcons()`. No change needed.
- `get_icon`: Already checks `libraryMeta[library]?.premium`. Needs update to
  also allow if `authState.purchasedSlugs?.includes(library)`.
- `list_libraries`: Update `accessible` field to reflect per-collection access.

**Risk**: Low. Pure filter logic change.

---

### Change 4: Include Clean CSS with Premium Icons

**File**: `mcp/index.js`

**Problem**: The CSS files on disk are obfuscated (class names like `xznek0`
instead of `si-anim--sparkle`). The SVGs are also obfuscated (matching classes).
MCP should serve clean, human-readable CSS.

**Solution**: Use the `classMap` in `manifest.json` to reverse the obfuscation
at MCP startup. The classMap maps `icon-name -> obfuscated-class`.

**Reverse map approach**:
1. Load `manifest.json` and the obfuscated CSS for each collection.
2. Build a reverse map: `obfuscated-class -> original-class` from classMap.
3. Replace all obfuscated tokens in CSS and SVGs with their original names.
4. Store the clean versions in memory for serving.

**classMap structure** (from manifest.json):
```json
{
  "ai-agentic": {
    "classMap": {
      "sparkle": "xznek0",
      "agent-loop": "f91tcy",
      "streaming": "xxyxwf"
    }
  }
}
```

The classMap only covers the top-level `si-anim--{icon}` class renames.
Internal classes (SVG path classes), keyframe names, and SVG IDs are also
obfuscated but NOT recorded in the classMap.

**This means**: We cannot fully reverse the obfuscation from the classMap alone.
The internal tokens (keyframes, path classes, SVG IDs) are lost.

**Alternative approach**: Modify the obfuscation script to save a clean copy
before overwriting. The clean copy is stored alongside the obfuscated files
(e.g., `public/packs/{slug}/clean/{slug}.css` and `clean/*.svg`).

**Recommended approach**: Modify `scripts/obfuscate-assets.js` to:
1. Before obfuscating, copy CSS and SVGs to `public/packs/{slug}/clean/`
2. Then obfuscate the originals as before
3. The Vite build plugin already strips non-bundle files from dist, so clean/
   files won't appear in production

The MCP server reads from `clean/` subdirectory for premium icon responses.
The website reads from the obfuscated files as before.

**New response format for get_icon (premium)**:
```json
{
  "id": "sparkle",
  "name": "Sparkle",
  "library": "ai-agentic",
  "libraryName": "Agentic AI (Premium)",
  "premium": true,
  "svg": "<svg ...clean SVG with readable classes...>",
  "css": ".si-anim--sparkle:hover .sparkle-path { animation: sparkle-glow 0.6s ease; } @keyframes sparkle-glow { ... }",
  "usage": "<div class=\"si-anim si-anim--sparkle\"><!-- paste SVG here --></div>"
}
```

**Risk**: Medium. Requires modifying the obfuscation script and re-running
the finalization pipeline. BUT the clean files are just copies made before
obfuscation, so no logic risk.

---

### Change 5: Pricing Page Update

**File**: `store.js` (lines 1865, 1892)

**Current**: Single Pack and Launch Bundle show "Premium icons via MCP" as dimmed/X.

**New**: Change to a green check mark.

Single Pack:
```html
<li><span class="material-symbols-outlined">check</span> MCP access for purchased pack</li>
```

Launch Bundle:
```html
<li><span class="material-symbols-outlined">check</span> MCP access for all 8 packs</li>
```

**Risk**: None. Text change only.

---

## Implementation Order

| Step | Change | Depends On | Effort |
|---|---|---|---|
| 1 | Obfuscation script: save clean copies | None | Small |
| 2 | Re-run finalization pipeline | Step 1 | Small (scripted) |
| 3 | MCP auth.js: query purchases | None | Small |
| 4 | MCP index.js: per-collection gating | Step 3 | Small |
| 5 | MCP index.js: serve clean CSS | Steps 1, 2 | Medium |
| 6 | API key Edge Function: allow buyers | None | Small |
| 7 | Pricing page text | None | Small |
| 8 | Deploy Edge Function | Step 6 | Requires Supabase CLI |
| 9 | Re-upload to Supabase Storage | Step 2 | Manual (service key) |

---

## Verification Plan

### Automated
1. Run obfuscation script, verify clean/ directory created with readable CSS
2. Run MCP server with no API key: confirm only free icons returned
3. Run MCP server with a test Pro API key: confirm all 400 premium icons accessible
4. Verify clean CSS contains readable class names (grep for `si-anim--`)
5. Verify obfuscated CSS does NOT contain `si-anim--` (unchanged)
6. Build production (`npx vite build`): verify clean/ files excluded from dist

### Manual
1. Generate an API key as a Pack buyer (not Pro) via the Dashboard
2. Set SUPERICONS_API_KEY and run MCP server
3. Search for a premium icon, verify SVG + CSS returned
4. Paste SVG + CSS into a test HTML file, verify animation works

---

## RLS Prerequisite Check

Before implementing Change 2, we must verify that the Supabase anon/publishable
key can read from `si_purchases` joined with `si_products`. If RLS blocks this,
we need either:
- A new RLS policy allowing authenticated reads on own purchases
- An Edge Function proxy (adds latency, adds a function to maintain)

Preferred: Add an RLS policy. The user's purchases are not sensitive data.

---

## Non-Goals

- MCP for the animation pattern library (separate feature)
- NPM publishing of the MCP package (future)
- Rate limiting on MCP usage (not needed at current scale)
- Real-time collection updates via MCP (MCP loads at startup)
