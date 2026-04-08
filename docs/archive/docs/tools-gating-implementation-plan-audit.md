# Tools Gating Implementation Plan — Audit Analysis

**Source:** Review of `tools-gating-implementation-plan.md`  
**Date:** 4/2/2026

---

## Overview

No high-severity blockers remain. Three medium-severity issues should be resolved before implementation:

1. Shared plan config isn't the only pricing source of truth
2. Converter prompt API is under-specified
3. Final verification matrix is out of sync

---

## Issue 1: Shared Plan Config Isn't the Only Pricing Source of Truth

**Severity:** Medium  
**References:** [implementation plan L40](d:/Personal/Business/Curly Mole Labs/Experiments/Apps/DailySprint/supericons/plans/tools-gating-implementation-plan.md#L40), [plan L60](d:/Personal/Business/Curly Mole Labs/Experiments/Apps/DailySprint/supericons/plans/tools-gating-implementation-plan.md#L60), [store.js L1829](d:/Personal/Business/Curly Mole Labs/Experiments/Apps/DailySprint/supericons/store.js#L1829), [store.js L1974](d:/Personal/Business/Curly Mole Labs/Experiments/Apps/DailySprint/supericons/store.js#L1974)

### Finding

The current code has multiple sources of truth for pricing:

- **Hardcoded template** (store.js L1829): `$15` and `/mo` literal values in the DOM
- **Hardcoded `setPeriod()`** (store.js L1979–1988): `$99`, `/yr`, `$180` literals instead of reading from `PRO_PLANS`
- **`handleProSubscribe()`** (store.js L546): Uses a ternary `plan === 'annual' ? STRIPE_PRO_YEARLY : STRIPE_PRO_MONTHLY` instead of `PRO_PLANS[plan].priceId`

**The risk:** On initial page render (before any toggle interaction), the template shows `$15/mo` hardcoded. If the plan config ever changes, the template, `setPeriod()`, and the checkout redirect could all diverge.

### Recommended Fix

Phase 2 should explicitly add an `initPricingFromConfig()` call that runs at module init time:

```js
function initPricingFromConfig() {
  const { monthly, annual } = PRO_PLANS;
  proAmount.textContent = monthly.amount;
  proPeriod.textContent = monthly.period;
  proOriginal.style.display = 'none';
  // Also update the CTA button text
  document.getElementById('pricingProBtn').textContent =
    `Go Pro — ${monthly.ctaLabel}`;
}
```

Rewrite `setPeriod()` to read entirely from config:

```js
function setPeriod(annual) {
  isAnnualState = annual;
  monthlyBtn.classList.toggle('pricing-toggle__seg--active', !annual);
  annualBtn.classList.toggle('pricing-toggle__seg--active', annual);

  const plan = annual ? PRO_PLANS.annual : PRO_PLANS.monthly;
  proAmount.textContent = plan.amount;
  proPeriod.textContent = plan.period;
  if (plan.originalAmount) {
    proOriginal.style.display = 'inline';
    proOriginal.textContent = plan.originalAmount;
  } else {
    proOriginal.style.display = 'none';
  }
}
```

---

## Issue 2: Converter Prompt API Is Under-Specified

**Severity:** Medium  
**References:** [implementation plan L131](d:/Personal/Business/Curly Mole Labs/Experiments/Apps/DailySprint/supericons/plans/tools-gating-implementation-plan.md#L131), [plan L138](d:/Personal/Business/Curly Mole Labs/Experiments/Apps/DailySprint/supericons/plans/tools-gating-implementation-plan.md#L138)

### Finding

The plan defines `showUpgradePrompt(context)` taking only a string context, then shows "Exporting {context} requires Pro." But there's no mechanism for *where* the prompt renders relative to the "calling button."

The gated handlers only pass `'conversions'` as context, which gives no anchor element — the prompt would need to know which button triggered it to position itself nearby.

### Recommended Fix

**Option A — Pass anchor element:** Change the signature to accept an anchor element or event:

```js
async function showUpgradePrompt(anchorEl, context = 'conversions') {
  // Position prompt relative to anchorEl.getBoundingClientRect()
  // or insert as a sibling/next-sibling of anchorEl.closest('.converter-actions')
}
```

And update the gated handlers to pass the button element:

```js
document.getElementById('convDownload')?.addEventListener('click', async (e) => {
  const status = await requirePro();
  if (status !== 'pro') {
    if (status === 'free') showUpgradePrompt(e.currentTarget, 'conversions');
    return;
  }
  // existing download logic
});
```

**Option B — Fixed slot:** Define a fixed container (e.g., `#converterUpgradeSlot`) that the prompt always renders into, avoiding positioning complexity entirely.

Either approach should be explicitly stated in the plan.

---

## Issue 3: Final Verification Matrix Is Out of Sync

**Severity:** Medium  
**References:** [plan L63](d:/Personal/Business/Curly Mole Labs/Experiments/Apps/DailySprint/supericons/plans/tools-gating-implementation-plan.md#L63), [plan L151](d:/Personal/Business/Curly Mole Labs/Experiments/Apps/DailySprint/supericons/plans/tools-gating-implementation-plan.md#L151), [plan L170](d:/Personal/Business/Curly Mole Labs/Experiments/Apps/DailySprint/supericons/plans/tools-gating-implementation-plan.md#L170), [plan L185](d:/Personal/Business/Curly Mole Labs/Experiments/Apps/DailySprint/supericons/plans/tools-gating-implementation-plan.md#L185)

### Finding

Three discrepancies between Phase 4 test definitions and the Phase 5 verification matrix:

| Gap | Detail |
|-----|--------|
| **Missing Converter CTA tests** | Phase 4 explicitly tests Monthly/Annual CTA in the upgrade prompt (verifying Stripe checkout opens), but the final matrix does not include these as explicit rows. |
| **Missing Pro convCopyClipboard test** | Test #12 covers "Pro + Conv Download" but there's no "Pro + Conv Copy" row — the gated `convCopyClipboard` handler would be untested for Pro users. |
| **"Sign out mid-fetch" contradiction** | Test #14 says "Sign out mid-fetch + export → treated as free," but `requirePro()` returns `'anon'` for logged-out users, which triggers the auth modal (not a locked modal). The plan's own contract contradicts the expected outcome. |

### Recommended Fixes

1. **Add explicit rows to the matrix:**
   - `#14b: Free + click Monthly CTA in upgrade prompt → Stripe monthly checkout`
   - `#14c: Free + click Annual CTA in upgrade prompt → Stripe annual checkout`
   - `#15b: Pro + Conv Copy → SVG/PNG copied (no prompt)`

2. **Fix test #14 description to match actual behavior:**
   - Change "Treated as free (epoch guard)" → "Auth modal opens (anon path of requirePro); epoch guard discards stale subscription"
   - This accurately reflects what happens: the user signs out → epoch increments → in-flight fetch result discarded → `requirePro()` sees no session → opens auth modal

---

## Summary

| Finding | Severity | Action Required |
|---------|----------|-----------------|
| Pricing source of truth | Medium | Add `initPricingFromConfig()` and rewrite `setPeriod()` to use `PRO_PLANS` exclusively |
| Prompt API under-specified | Medium | Change `showUpgradePrompt(context)` → `showUpgradePrompt(anchorEl, context)` or define a fixed slot |
| Verification matrix out of sync | Medium | Add missing Converter CTA rows, Pro `convCopyClipboard` row, and fix test #14 description |

