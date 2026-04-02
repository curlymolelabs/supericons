# Pro Tools Gating: Implementation Plan

Source: [tools-gating-prd.md v6](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs/tools-gating-prd.md)

## Phase 1: Auth Foundation

Builds the async-safe auth infrastructure that all gates depend on. No UI changes.

### [MODIFY] [auth.js](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/auth.js)

1. **Add `authEpoch` counter** (new variable, starts at 0)
2. **Add `authReadyPromise`** (new variable, resolves when session + subscription are resolved)
3. **Modify `initAuth()`**: increment epoch, capture it, chain `getSession()` then `fetchSubscription()`. On resolve, check epoch match before updating state. Set up the initial `authReadyPromise`.
4. **Modify `onAuthStateChange` handler (L24)**: on SIGNED_IN, increment epoch, create new `authReadyPromise`, start `fetchSubscription()` with epoch check. On SIGNED_OUT, increment epoch, reset subscription state, resolve `authReadyPromise` immediately.
5. **Modify `fetchSubscription()` (L106)**: accept epoch param. On resolve, check if `epoch === authEpoch` before writing `subscriptionStatus`. If mismatch, discard. Add ~5s timeout wrapper.
6. **Export `waitForAuth()`**: returns the current `authReadyPromise`. Always resolves, never rejects.

**Test:** Boot app, call `waitForAuth()`, verify it resolves. Sign in, verify subscription fetch completes. Sign out mid-fetch, verify old fetch is discarded.

---

## Phase 2: Gate Function + Shared Plan Config

Adds `requirePro()` and extracts pricing data. Still no visible UI changes.

### [MODIFY] [store.js](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js)

1. **Import `waitForAuth`** from auth.js (add to existing import at L6)
2. **Extract shared plan config** to module scope (near L12):
   ```js
   const PRO_PLANS = {
     monthly: { key: 'monthly', priceId: STRIPE_PRO_MONTHLY, display: '$4/mo' },
     annual: { key: 'annual', priceId: STRIPE_PRO_YEARLY, display: '$3/mo' },
   };
   ```
   Update `handleProSubscribe()` (L536) and the pricing view (L1829, L1972) to read from `PRO_PLANS` instead of inline values.
3. **Add `requirePro()`** function:
   ```js
   async function requirePro() {
     await waitForAuth();
     if (!isLoggedIn()) {
       document.getElementById('authModal')?.classList.add('open');
       return 'anon';
     }
     if (!isPro()) return 'free';
     return 'pro';
   }
   ```

**Test:** Call `requirePro()` in console for each user state. Verify correct return values. Verify `PRO_PLANS` used by pricing view.

---

## Phase 3: Motion Lab Locked Modal

Builds the locked export modal experience for non-Pro users.

### [MODIFY] [store.js](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js)

1. **Add `showLockedExportModal()`** (new function, near `showExportModal` at L4969):
   - Renders modal shell using same DOM structure/classes as `showExportModal()`
   - CSS code block: static truncated snippet (3-4 hardcoded lines like `@keyframes si-bounce { 0% { transform: ...`), NOT generated from `generateFullCSS()`
   - SVG code block: static placeholder text (`<!-- Animated SVG available with Pro -->`)
   - `user-select: none` on both code blocks
   - No Copy/Download buttons rendered. No export handlers bound.
   - Upgrade banner inside modal with Monthly/Annual CTAs:
     - Monthly button: `handleProSubscribe('monthly')`
     - Annual button: `handleProSubscribe('annual')`
     - "Maybe Later" button: closes modal
   - Prices read from `PRO_PLANS.monthly.display` and `PRO_PLANS.annual.display`

2. **Gate `mlExportBtn` handler** (L3986):
   ```js
   // Before: exportBtn.addEventListener('click', showExportModal);
   // After:
   exportBtn.addEventListener('click', async () => {
     const status = await requirePro();
     if (status === 'pro') showExportModal();
     else if (status === 'free') showLockedExportModal();
     // 'anon': auth modal already shown by requirePro()
   });
   ```

3. **Gate `mlDownloadBtn` handler** (L3994):
   ```js
   downloadBtn.addEventListener('click', async () => {
     const status = await requirePro();
     if (status !== 'pro') {
       if (status === 'free') showLockedExportModal();
       return;
     }
     // existing download logic
   });
   ```

**Test:** Click "Copy CSS" as anon (auth modal), free user (locked modal with truncated preview), Pro (full modal). Inspect DOM to confirm full payload absent in locked modal.

---

## Phase 4: Converter Gate

Simplest phase. Two button guards + inline upgrade prompt.

### [MODIFY] [store.js](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js)

1. **Add `showUpgradePrompt(context)`** (new function):
   - Renders an inline prompt near the calling button
   - Message: "Exporting {context} requires a Pro subscription."
   - Monthly/Annual CTA buttons (same pattern as locked modal, reading from `PRO_PLANS`)
   - "Maybe Later" dismisses
   - Auto-removes on outside click

2. **Gate `convDownload` handler** (L5490):
   ```js
   // Wrap existing handler:
   const status = await requirePro();
   if (status !== 'pro') {
     if (status === 'free') showUpgradePrompt('conversions');
     return;
   }
   // existing download logic
   ```

3. **Gate `convCopyClipboard` handler** (L5502): Same pattern.

**Test:** As free user, click Download/Copy in Converter. Verify upgrade prompt appears with correct prices. As Pro, verify export works normally.

---

## Phase 5: Pricing Copy + Final Verification

### [MODIFY] [store.js](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js)

1. **Add tool bullets to Pro tier** in pricing section:
   - "Motion Lab: export CSS animations"
   - "Converter: unlimited SVG/PNG conversion"

### Full Test Matrix

| # | Test | Expected |
|---|------|----------|
| 1 | Anon + ML "Copy CSS" | Auth modal |
| 2 | Anon + ML "Download SVG" (bar) | Auth modal |
| 3 | Anon + Conv Download | Auth modal |
| 4 | Free + ML "Copy CSS" | Locked modal, truncated preview, Monthly/Annual CTAs |
| 5 | Free + inspect locked modal DOM | Full CSS/SVG NOT in DOM |
| 6 | Free + click "Monthly" in locked modal | Stripe monthly checkout |
| 7 | Free + click "Annual" in locked modal | Stripe annual checkout |
| 8 | Pro + ML "Copy CSS" | Full export modal, all buttons work |
| 9 | Pro + ML "Download SVG" (bar) | SVG downloads |
| 10 | Free + Conv Download | Upgrade prompt with Monthly/Annual |
| 11 | Free + Conv Copy | Upgrade prompt with Monthly/Annual |
| 12 | Pro + Conv Download | File downloads |
| 13 | Just signed-in Pro + export | Works (no false negative) |
| 14 | Sign out mid-fetch + export | Treated as free (epoch guard) |
| 15 | Network failure + export | Treated as free (fail closed) |
| 16 | Upgrade prompt prices | Match pricing page (shared config) |
| 17 | Icon picker export (any user) | Always works, no gate |
| 18 | `npm run build` | Passes |

---

## Summary

| Phase | Files | Effort | Depends On |
|-------|-------|--------|------------|
| 1: Auth Foundation | auth.js | Medium | None |
| 2: Gate + Plan Config | store.js | Small | Phase 1 |
| 3: ML Locked Modal | store.js | Medium | Phase 2 |
| 4: Converter Gate | store.js | Small | Phase 2 |
| 5: Pricing + Verification | store.js | Small | Phases 3, 4 |

Phases 3 and 4 can run in parallel after Phase 2. Total estimate: ~3-4 hours.
