# Packs Page Localization Audit

**Date:** 2026-05-11
**Scope:** `?view=packs` page, collection detail, locked panel, My Purchases cards, dashboard purchase names, catalog integrity

---

## Verdict

**No blocking issues.** The packs-page localization is comprehensive and correct. All visible strings are localized across all 12 locales. Catalogs are synchronized. Build passes. English did not regress.

---

## Findings

### 1. Are any visible packs-page strings still hard-coded in English for non-English locales?

**No.** All packs rendering functions use `t('packs.*')` calls with English fallbacks. Verified by scanning `renderPackCatalog`, `createPackCard`, `createProSubscriptionCard`, `renderCollectionDetail`, the locked panel, and `createLaunchEditionCard` in `store.js`. English fallback strings still exist inside `t(..., fallback)` calls by design; the checked render paths do not bypass localization.

### 2. Are any product names/descriptions missing, awkward, or inconsistent?

**No.** All 8 product slugs (`ai-agentic`, `status-feedback`, `ecommerce`, `navigation-menus`, `data-charts`, `social-communication`, `media-playback`, `security-auth`) have localized names and descriptions in all 12 locales. The `getLocalizedProductName()` and `getLocalizedProductDescription()` helpers resolve from `packs.products.{slug}.name/description` with fallback to existing product data.

### 3. Does locale switching rerender the packs page correctly?

**Yes.** The `supericons:locale-change` event handler calls `switchView(currentView, { historyMode: 'silent' })`, which re-renders the current view. For packs, this triggers `renderPackCatalog()`. For collection detail, `rerenderCollectionSurfaceForCurrentView()` re-renders the detail view. The same rerender path is also used after claim status updates.

### 4. Do placeholders match English across all locales?

**Yes.** All placeholder signatures (`{price}`, `{count}`, `{date}`, `{owned}`, `{total}`, `{percent}`, `{name}`) match English across all 12 locales. Verified programmatically for all `packs.*` keys.

### 5. Are public/MCP catalogs synced with source catalogs?

**Yes.** All 12 locale JSON files are byte-identical across `data/i18n/messages/`, `public/i18n/messages/`, `mcp/public/i18n/messages/`, and `dist/i18n/messages/` after build.

### 6. Does the browser smoke test cover the real regression?

**Yes, for the packs-page localization surface.** The test (`verify-packs-localization.mjs`) now covers all 12 locales and verifies:
- Launch Edition banner name, savings badge, description, and action
- Pack card preview, localized product names/descriptions, and `Buy {price}` rendering
- Pro card monthly and annual plan copy, plan toggle behavior, feature lists, and subscribe action
- Collection detail back button, icon count, and SVG metadata
- Locked premium panel message, buy action, and Pro action
- Pro redeem states for ready, cooldown, and all-owned scenarios using mocked authenticated browser state

The test intentionally avoids live checkout or real account mutation. Stripe checkout and logged-in account flows remain covered by their dedicated checks.

### 7. Did this change introduce regressions in pricing, auth, checkout, collection detail, or logged-in purchase flows?

**No.** Verified:
- `npm run build` passes
- `verify-i18n-catalogs.mjs` passes for key parity, placeholder parity, mojibake, metadata, and sync
- `verify-packs-localization.mjs` passes for all 12 locales
- All 12 locales have complete `packs`, `loggedIn.downloads`, `loggedIn.dashboard`, and `claimFlow` sections
- Dashboard uses `getLocalizedProductName()` for purchase names
- Downloads page uses `getLocalizedProductName()` and `getLocalizedProductDescription()`
- No hard-coded English strings found in the checked packs rendering functions

---

## Command Results

| Command | Result |
|---------|--------|
| `node scripts/verify-i18n-catalogs.mjs` | PASS |
| `npm run build` | PASS |
| `node scripts/verify-packs-localization.mjs` | PASS |
| Catalog sync (source/public/mcp/dist) | PASS |
| Placeholder signature check (all 12 locales) | PASS |
| Packs key completeness (all 12 locales) | PASS |
| Mojibake/replacement character scan | PASS |
| Hard-coded English string scan | PASS |

---

## Residual Risks

1. **Live checkout is not exercised by the packs-page smoke test.** The test verifies localized checkout entry points and avoids opening Stripe or mutating real account state. Stripe locale forwarding and checkout behavior should stay covered by logged-in/Stripe-specific checks.

2. **`packs.card.optionsLoading` is not a stable visible page state in the packs catalog.** It appears as a toast fallback when claim options cannot be focused. The catalog key is structurally verified, while the stable redeem states are browser-tested.

3. **`$29` and `$40` price strings are hard-coded in `createLaunchEditionCard`.** These are numeric USD price displays, not localizable copy, so this is expected behavior, but price formatting remains USD-only.
