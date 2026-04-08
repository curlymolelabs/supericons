# Pro Tools Gating PRD (v6)

## 1. Objective

Gate all export actions in **Motion Lab** and **Converter** behind a Pro subscription. Free users can use tools fully (preview, customize, adjust settings) but cannot extract output via the provided Download/Copy controls. Pro users get unlimited exports.

> [!NOTE]
> **Scope of gate:** The gate targets the provided extraction controls (buttons, code blocks). Right-click extraction from rendered image previews (e.g. Converter output `<img>`) is an accepted risk at MVP. This is consistent with the client-side-gate-as-UX-barrier philosophy. See Section 5.4 for details.

This PRD covers **web UI gating only**. MCP animation tools are a separate deliverable (see [mcp-animation-tools-prd.md](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs/mcp-animation-tools-prd.md)).

---

## 2. Key Decisions

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | **Icon library export stays free.** "SVG, PNG, CSS export" in the free tier refers to static icons from the icon picker. No change. | Existing product promise. Not a tool. |
| 2 | **Motion Lab export = Pro.** All animation CSS/SVG output is gated. | Net-new creative value. Never had a free promise. |
| 3 | **Converter export = Pro.** All download/copy actions are gated. Same taste-and-lock model as Motion Lab. | Maximizes Pro value. Standardizes gate pattern. |
| 4 | **No metering.** No "5 free exports" or usage counters. Binary: Pro or not. | Simplicity. No localStorage/Supabase tracking needed. |
| 5 | **Pack/Bundle buyers do NOT get tool access.** Tools are Pro-only. Pack buyers paid for icon collections, not tools. | Keeps Pro tier differentiated. |
| 6 | **Two render paths for the export modal.** Non-Pro users see a locked shell with a truncated preview. The full payload is never generated or placed in the DOM. | Audit fix: blurring a `<pre>` with full text in the DOM is cosmetic, not a data gate. |
| 7 | **Auth-ready check with defined state machine.** `waitForAuth()` always resolves, never hangs. Fail-closed on network errors. | Audit fix: prevents false negatives for just-signed-in Pro users. |
| 8 | **Subscribe CTA calls existing Pro subscribe handler.** Does not reinvent checkout flow. | Audit fix: existing handler already routes anon users to auth and logged-in users to checkout. |
| 9 | **MCP animation tools are a separate deliverable.** This PRD does not add or gate MCP tools. | Audit fix: MCP tools don't exist yet. |

---

## 3. What Is Free vs. Pro

### Free (no account needed)

- Browse and search 20,000+ free icons
- Customize panel: color, size, stroke width
- Export: SVG, PNG, CSS from the **icon picker**
- Motion Lab: preview all 56 animation presets, adjust sliders, change triggers
- Converter: upload files, adjust settings, preview output

### Pro subscription

- All free features
- Motion Lab: **export** animation CSS and animated SVG
- Converter: **export** converted PNG/SVG files
- Premium animated icon packs (per subscription tier, see pricing for details)
- MCP access for premium icons
- MCP animation tools (future)

> [!IMPORTANT]
> This PRD gates **tools** only. Pack entitlements (which packs, how many, credits vs. bundles) are defined by the pricing model and are NOT restated here. The pricing page is the single source of truth for pack access.

**One rule: tools let you play, Pro lets you take.**

---

## 4. Export Surface Inventory

### 4.1 Motion Lab (8 gate points)

| # | Surface | Element / Line | Gate Strategy |
|---|---------|---------------|---------------|
| 1 | "Copy CSS" button (bottom bar, opens export modal) | `mlExportBtn` [L3986](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L3986) | **Primary gate.** Check `requirePro()`. Pro: call `showExportModal()`. Free: call `showLockedExportModal()`. Anon: auth modal. |
| 2 | Export modal: CSS code block | [L5013](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L5013) | In locked path: only a static truncated preview (3-4 lines) is placed in the DOM. Full payload never generated. |
| 3 | Export modal: SVG code block | [L5024](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L5024) | Same: truncated preview only. |
| 4 | Export modal: Copy CSS button | `mlCopyCss` [L5054](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L5054) | Not rendered in locked modal. No handler bound. |
| 5 | Export modal: Download CSS button | `mlDownloadCss` [L5059](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L5059) | Not rendered in locked modal. |
| 6 | Export modal: Copy SVG button | `mlCopySvg` [L5064](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L5064) | Not rendered in locked modal. |
| 7 | Export modal: Download SVG button | `mlDownloadSvg` [L5069](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L5069) | Not rendered in locked modal. |
| 8 | "Download SVG" (bottom bar, direct download) | `mlDownloadBtn` [L3994](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L3994) | Gate with `requirePro()`. |

### 4.2 Converter (2 gate points)

| # | Surface | Element / Line | Gate Strategy |
|---|---------|---------------|---------------|
| 9 | Download button | `convDownload` [L5490](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L5490) | Gate with `requirePro()`. |
| 10 | Copy to clipboard button | `convCopyClipboard` [L5502](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L5502) | Gate with `requirePro()`. |

**Total: 10 gate points** (8 Motion Lab + 2 Converter).

> [!NOTE]
> **Converter preview leak (mode-specific analysis):**
>
> | Mode | Output blob | Right-click gets | Risk | Rationale for accepting |
> |------|------------|-----------------|------|------------------------|
> | **SVG-to-PNG** | PNG image | The exact configured PNG | Low | User uploaded the SVG they own. PNG is a commodity format conversion. |
> | **PNG-to-SVG** | SVG markup | Browser-dependent. May save as SVG file, or render as PNG. Opening blob URL in new tab exposes raw SVG source. | Medium | The traced SVG is computational value (vectorization). However: (1) right-click SVG behavior is browser-inconsistent, (2) traced quality depends heavily on settings, (3) closing this requires canvas rendering (medium effort). |
>
> **Both modes are accepted MVP tradeoffs.** The gate stops the primary extraction paths (Download/Copy buttons). V2 option: canvas-based rendering or watermarked preview overlay.

---

## 5. Gate Implementation Design

### 5.1 `requirePro()` Function

Reusable async guard called at every gate point.

```
async requirePro():
  1. await waitForAuth()           // ensure subscription state is resolved
  2. if not logged in:
       open auth modal              // existing auth modal flow
       return 'anon'
  3. if not isPro():
       return 'free'                // caller shows locked modal or upgrade prompt
  4. return 'pro'                   // caller proceeds with full export
```

Returns a status string so callers can branch:
- `'anon'`: auth modal already opened, stop
- `'free'`: show locked modal or upgrade prompt
- `'pro'`: proceed with normal export

### 5.2 `waitForAuth()` State Machine

**Definition of "ready":** Auth is ready when:
1. `getSession()` has returned (user identity resolved)
2. If a user exists, `fetchSubscription()` has completed (success or failure)
3. If no user, immediately ready

**State transitions:**

| Event | Behavior |
|-------|----------|
| **App boot** | Promise created. Resolves after `getSession()` + `fetchSubscription()`. |
| **SIGNED_IN** | Ready resets. New promise created. Resolves after `fetchSubscription()` completes for new user. |
| **SIGNED_OUT** | Ready resets. Immediately resolves (`isPro()` = false). |
| **`fetchSubscription()` fails** | Resolves with `isPro()` = false. Fail closed. |
| **Network timeout** | Same as failure. Resolve after ~5s max. Never hangs. |

**Stale request protection:**
- Maintain an `authEpoch` counter (integer, starts at 0)
- Each auth transition (SIGNED_IN, SIGNED_OUT, app boot) increments `authEpoch`
- When `fetchSubscription()` starts, it captures the current epoch value
- When it resolves, it checks if its captured epoch matches the current `authEpoch`
- If **mismatch**: result is discarded (a newer auth cycle has started). Do not update `subscriptionStatus`.
- If **match**: update `subscriptionStatus` and resolve the ready promise normally
- This prevents the race: sign-in starts slow fetch, sign-out resets state, old fetch resolves and incorrectly overwrites the signed-out state

**Key invariant:** `waitForAuth()` **always resolves, never rejects or hangs.** Worst case is a Pro user temporarily treated as free due to a network error. They can retry by refreshing.

### 5.3 Two Render Paths for Motion Lab Export Modal

When `mlExportBtn` is clicked, `requirePro()` determines the path:

**Pro path: `showExportModal()`** (current behavior, unchanged)
- Generates full CSS payload via `generateFullCSS()`
- Generates full SVG export
- Renders both into `<pre>` blocks
- Binds Copy CSS, Download CSS, Copy SVG, Download SVG handlers
- All buttons functional

**Free path: `showLockedExportModal()`** (new)
- Does NOT call `generateFullCSS()` or build SVG export
- Renders a static truncated preview: first 3-4 lines of a generic CSS snippet (hardcoded or sliced then discarded)
- Code blocks have `user-select: none` as a cosmetic safeguard
- No copy/download buttons are rendered in the DOM
- No export handlers are bound
- Upgrade banner is shown with Subscribe CTA

**Why this matters:** In the current implementation, `showExportModal()` builds the full CSS/SVG payload and writes it into `<pre>` elements. Even with CSS blur and `user-select: none`, the full text would be accessible via DevTools DOM inspection. The locked path avoids this by never generating or placing the full payload.

### 5.4 Converter Gate

Simpler than Motion Lab (no modal leak):
- Download and Copy buttons call `requirePro()` on click
- If not Pro: show upgrade prompt
- The converted output preview remains visible as a rendered `<img>` element
- **Accepted risk (mode-specific):** See Section 4.2 note for per-mode analysis. SVG-to-PNG is low risk (commodity conversion). PNG-to-SVG is medium risk (traced SVG is computational value). Both accepted at MVP.
- **V2 option:** Replace `<img>` preview with a `<canvas>` rendering (not right-click saveable) or add a watermark overlay for non-Pro users

### 5.5 Upgrade Prompt

Inline prompt that appears in context (near the blocked button or inside the locked modal):

```
+-----------------------------------------------+
|  Pro feature                                  |
|                                               |
|  Exporting [animations / conversions]         |
|  requires a Pro subscription.                 |
|                                               |
|  [Monthly - $X/mo]    [Annual - $X/mo]        |
|                                               |
|  [Maybe Later]                                |
+-----------------------------------------------+
```

**Plan selection:**
- Two CTA buttons: Monthly and Annual, each displaying the price
- Each button calls `handleProSubscribe()` at [store.js L536](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L536) with the plan key string `'monthly'` or `'annual'` (not a Stripe price ID)
- The handler maps these keys to the correct Stripe price IDs internally ([store.js L546](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L546))
- That handler already routes correctly: anonymous users go to auth modal first, logged-in users go directly to Stripe checkout
- Do NOT reinvent the checkout flow, the price ID mapping, or route through the full pricing page

**Pricing data prerequisite:**
- The current pricing data (monthly/annual prices, Stripe price IDs) is defined inline within the pricing view's local scope ([store.js L1829](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L1829), [L1972](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L1972))
- **Before building the upgrade prompt:** extract plan metadata (display prices, Stripe price IDs, plan names) into a shared config object at module scope in store.js
- Both the pricing section and the upgrade prompt read from this shared config
- This prevents price drift between the pricing page and tool upsells

**"Maybe Later"** dismisses the prompt.

---

## 6. Existing Infrastructure (Already Built)

| Component | File | Status |
|-----------|------|--------|
| `isPro()` | [auth.js L97](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/auth.js#L97) | Exists. Returns `subscriptionStatus === 'active'`. |
| `isLoggedIn()` | [auth.js L93](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/auth.js#L93) | Exists. |
| `initAuth()` | [auth.js L16](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/auth.js#L16) | Exists. Initializes Supabase, listens for auth changes. |
| `fetchSubscription()` | [auth.js L106](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/auth.js#L106) | Exists. Queries `si_subscriptions`. |
| Auth imports in store.js | [store.js L6](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L6) | Already imported. `isPro` and `isLoggedIn` are available. |
| Pro subscribe handler | [store.js L536](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L536) | Exists. Routes anon to auth, logged-in to checkout. |
| Vite production minification | [vite.config.js](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/vite.config.js) | Already configured. |
| ToS clause | Footer/terms | Already covers IP and reverse engineering. |

### What Needs to Be Built

| Component | Effort |
|-----------|--------|
| Extract shared plan config (prices, IDs) to module scope | Small |
| `waitForAuth()` with state machine in auth.js | Medium |
| `requirePro()` function in store.js | Small |
| `showLockedExportModal()` for Motion Lab | Medium |
| Upgrade prompt UI (Monthly/Annual CTAs) | Small |
| Gate wiring on all 10 surfaces | Small |
| Pricing copy: add tool bullets to Pro tier | Small |

---

## 7. Pricing Copy Update

No free tier copy changes needed. "SVG, PNG, CSS export" refers to icon library export and remains true.

Pro tier: add explicit tool bullets:

| Current Pro Bullets | Add |
|---|---|
| (existing pack/MCP bullets) | (keep as-is, do not restate here) |
| | **"Motion Lab: export CSS animations"** |
| | **"Converter: unlimited SVG/PNG conversion"** |

---

## 8. Anti-Cloning / Reverse Engineering

### Defense Layers (MVP)

| Layer | Technique | Note |
|-------|-----------|------|
| **Data gate** | `showLockedExportModal()` never generates or places full payload in DOM | Primary defense |
| **Cosmetic** | `user-select: none` on truncated preview | Deters casual copy of even the preview snippet |
| **Minification** | Vite production build mangles variable names | PRESETS harder to read from source |
| **Legal** | ToS covers reverse engineering | Standard practice |

### Deferred (V2)

- Server-side CSS generation (strongest, high effort)
- Dynamic keyframe injection
- CSS watermarking (embed user ID in exported comments)
- Canvas-based Converter preview (prevents right-click save)
- Watermarked preview overlay for non-Pro users

---

## 9. Implementation Order

| Step | Description | Depends On |
|------|------------|------------|
| 1 | Extract shared plan config (prices, Stripe IDs) to module scope | None |
| 2 | Add `waitForAuth()` state machine to auth.js | None |
| 3 | Create `requirePro()` in store.js | Step 2 |
| 4 | Build `showLockedExportModal()` (truncated preview, no payload, upgrade CTA) | Steps 1, 3 |
| 5 | Gate Motion Lab: `mlExportBtn` branches to locked vs full modal | Steps 3, 4 |
| 6 | Gate Motion Lab: `mlDownloadBtn` (bottom bar) | Step 3 |
| 7 | Gate Converter: `convDownload` + `convCopyClipboard` | Step 3 |
| 8 | Update pricing copy: add tool bullets to Pro tier | None |
| 9 | Test all 10 gate points across 3 user states | Steps 5, 6, 7 |

---

## 10. Verification Plan

| Test | Expected |
|------|----------|
| **Anonymous** + click ML "Copy CSS" | Auth modal opens (existing flow) |
| **Anonymous** + click ML "Download SVG" (bottom bar) | Auth modal opens |
| **Anonymous** + click Converter Download | Auth modal opens |
| **Free user** + click ML "Copy CSS" | Locked export modal: truncated preview, no action buttons, upgrade banner with Monthly/Annual CTAs |
| **Free user** + inspect locked modal DOM | Full CSS/SVG payload is NOT in the DOM |
| **Free user** + click "Monthly" in ML locked modal | Routes to Stripe monthly checkout |
| **Free user** + click "Annual" in ML locked modal | Routes to Stripe annual checkout |
| **Pro user** + click ML "Copy CSS" | Full export modal: complete code, all buttons functional |
| **Pro user** + click ML "Download SVG" (bottom bar) | SVG downloads |
| **Free user** + Converter Download | Upgrade prompt with Monthly/Annual CTAs |
| **Free user** + Converter Copy | Upgrade prompt with Monthly/Annual CTAs |
| **Free user** + click "Monthly" in Converter prompt | Routes to Stripe monthly checkout (or auth first if anon) |
| **Free user** + click "Annual" in Converter prompt | Routes to Stripe annual checkout (or auth first if anon) |
| **Pro user** + Converter Download | File downloads |
| **Just signed in** Pro + click export immediately | `waitForAuth()` resolves after subscription fetch, export works (no false negative) |
| **Network failure** during subscription fetch | `waitForAuth()` resolves, user treated as free (fail-closed), can retry |
| **Upgrade prompt prices** | Match pricing page values (shared config, no drift) |
| **Icon picker** SVG/PNG export (any user) | Always works, no gate |
| `npm run build` | Passes |

---

## 11. Out of Scope

- MCP animation tool gating (separate PRD, separate deliverable)
- Usage metering or counters (decision: binary Pro gate, no metering)
- Pack/Bundle buyer tool access (decision: Pro-only)
- Icon library export gating (stays free, always)
- Server-side CSS generation (V2)
- Analytics/funnel events (recommended but not required for MVP)
