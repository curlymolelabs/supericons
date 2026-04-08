# Pro Tools Gating: Implementation Plan

Source: [tools-gating-prd.md v6](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs/tools-gating-prd.md)

## Phase 1: Auth Foundation

Builds the async-safe auth infrastructure that all gates depend on. No UI changes.

### [MODIFY] [auth.js](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/auth.js)

1. **Add `authEpoch` counter** (new module-scope variable, starts at 0)
2. **Add `authReadyPromise`** + its `resolve` handle (new module-scope variables)
3. **Modify `initAuth()`**: increment epoch, capture it, create initial `authReadyPromise`, chain `getSession()`. If session has no user, resolve `authReadyPromise` immediately (anonymous boot), keep `subscriptionStatus = null`, ensure `creditBalance = 0`, and keep Pro badge / manage-subscription UI hidden. If session has a user, call `fetchSubscriptionForEpoch(capturedEpoch)`. This is the **boot-time owner** of the ready promise.
4. **Modify `onAuthStateChange` handler (L24)**:
   - On SIGNED_IN: increment epoch, create **new** `authReadyPromise`, call `fetchSubscriptionForEpoch(capturedEpoch)`
   - On SIGNED_OUT: increment epoch, reset `subscriptionStatus` to `null`, reset `creditBalance = 0`, update Pro badge / manage-subscription UI to hidden, resolve `authReadyPromise` immediately
5. **Rename/refactor `fetchSubscription()` (L106) to `fetchSubscriptionForEpoch(epoch)`**:
   - Accepts epoch as a required param
   - On resolve: if `epoch !== authEpoch`, discard result silently (do NOT update `subscriptionStatus` or resolve `authReadyPromise`)
   - On match: update `subscriptionStatus`, preserve existing side effects (`updateProBadge()`, `fetchCreditBalance()` for active Pro, `creditBalance = 0` otherwise), then resolve the current `authReadyPromise`
   - On failure/timeout (~5s): fail closed with `subscriptionStatus = null`, `creditBalance = 0`, Pro badge / manage-subscription UI hidden, then resolve `authReadyPromise`
6. **Export `waitForAuth()`**: returns the current `authReadyPromise`. Always resolves, never rejects.

**Ownership rules:**
- **Only `fetchSubscriptionForEpoch()` and the SIGNED_OUT handler may write `subscriptionStatus`** (`fetchSubscriptionForEpoch` only when its epoch matches; SIGNED_OUT always resets to `null`)
- **Preserve current auth side effects**: whenever subscription state becomes non-Pro or user becomes signed out/anonymous, `creditBalance` resets to `0` and Pro badge / manage-subscription UI stay hidden; active Pro users still fetch credits and show Pro UI
- **Only `fetchSubscriptionForEpoch()`, the SIGNED_OUT handler, and the anonymous boot path in `initAuth()` may resolve `authReadyPromise`**
- `initAuth()` (with-user path) and the SIGNED_IN handler create new promises but delegate resolution to `fetchSubscriptionForEpoch()`

**Test:** Boot app as anon, call `waitForAuth()`, verify resolves immediately and Pro UI stays hidden. Sign in, verify subscription fetch completes and active Pro still gets credit balance + Pro badge. Sign out mid-fetch, verify old fetch result is discarded (epoch mismatch), `creditBalance` resets to `0`, and Pro UI hides immediately.

---

## Phase 2: Gate Function + Shared Plan Config

Adds `requirePro()` and extracts pricing data. Still no visible UI changes.

### [MODIFY] [store.js](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js)

1. **Import `waitForAuth`** from auth.js (add to existing import at L6)
2. **Extract shared plan config** to module scope (near L14, after Stripe constants):
   ```js
   const PRO_PLANS = {
     monthly: {
       key: 'monthly',
       priceId: STRIPE_PRO_MONTHLY,
       amount: '$15',
       period: '/mo',
       ctaLabel: '$15/mo',
     },
     annual: {
       key: 'annual',
       priceId: STRIPE_PRO_YEARLY,
       amount: '$99',
       period: '/yr',
       originalAmount: '$180',
       ctaLabel: '$99/yr',
     },
   };
   ```
   - `PRO_PLANS` is the **single source of truth** for price IDs and display values
   - Update `setPeriod()` (L1979-L1988) to read entirely from `PRO_PLANS` instead of inline literals
   - The pricing HTML template (L1828-L1832) should render initial values from `PRO_PLANS.monthly` when the pricing view mounts, or normalize from `PRO_PLANS` after the pricing DOM is created
   - Update `handleProSubscribe()` (L536) to use `PRO_PLANS[plan].priceId` instead of the ternary
   - Upgrade prompts read `PRO_PLANS.monthly.ctaLabel` / `PRO_PLANS.annual.ctaLabel`
   - Do not add new CTA text changes unless product wants them
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
      - Monthly button: label from `PRO_PLANS.monthly.ctaLabel`, calls `handleProSubscribe('monthly')`
      - Annual button: label from `PRO_PLANS.annual.ctaLabel`, calls `handleProSubscribe('annual')`
      - "Maybe Later" button: closes modal

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

1. **Add `showUpgradePrompt(anchorEl, context)`** (new function):
   - `anchorEl`: the button element the user clicked (determines placement)
   - `context`: string label for the message (e.g. `'conversions'`)
   - Renders an inline prompt positioned relative to `anchorEl` (e.g., below or above it using `getBoundingClientRect()`)
   - Message: "Exporting {context} requires a Pro subscription."
   - Monthly/Annual CTA buttons (same pattern as locked modal, reading from `PRO_PLANS`)
   - "Maybe Later" dismisses
   - Auto-removes on outside click

2. **Gate `convDownload` handler** (L5490):
   ```js
   // Wrap existing handler (use event param, not `this`, since handlers are arrow functions):
   convDownloadBtn.addEventListener('click', async (e) => {
     const status = await requirePro();
     if (status !== 'pro') {
       if (status === 'free') showUpgradePrompt(e.currentTarget, 'conversions');
       return;
     }
     // existing download logic
   });
   ```

3. **Gate `convCopyClipboard` handler** (L5502): Same pattern.

**Test:**
- Free user: click Download. Verify upgrade prompt with correct prices ($15/mo, $99/yr).
- Free user: click Copy. Same prompt.
- Free user: click Monthly CTA in prompt. Verify routes to Stripe monthly checkout.
- Free user: click Annual CTA in prompt. Verify routes to Stripe annual checkout.
- Pro user: click Download/Copy. Verify export works normally.

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
| 13 | Pro + Conv Copy | Copy succeeds |
| 14 | Free + click "Monthly" in Conv prompt | Stripe monthly checkout |
| 15 | Free + click "Annual" in Conv prompt | Stripe annual checkout |
| 16 | Just signed-in Pro + export | Works (no false negative) |
| 17 | Sign out mid-fetch + export | Auth modal opens (user is now anon). Stale fetch discarded by epoch guard. |
| 18 | Network failure + export | Treated as free (fail closed) |
| 19 | Upgrade prompt prices | Match pricing page (shared config) |
| 20 | Icon picker export (any user) | Always works, no gate |
| 21 | `npm run build` | Passes |

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
