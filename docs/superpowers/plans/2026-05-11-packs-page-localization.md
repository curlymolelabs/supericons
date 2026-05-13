# Packs Page Localization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Localize the `?view=packs` collections page and closely related collection purchase/detail copy across all supported Supericons locales.

**Architecture:** Keep product IDs, Stripe price IDs, routes, entitlement logic, and Supabase data unchanged. Add public-safe i18n keys for user-facing collection labels, render those keys from `store.js`, sync source catalogs to public/MCP catalogs, and add a browser smoke test that catches obvious English leakage on the packs page.

**Tech Stack:** Vite, vanilla JavaScript, existing `window.__supericons.t` i18n runtime, JSON message catalogs in `data/i18n/messages`, Playwright browser smoke checks.

---

### Task 1: Inventory And Verified Scope

**Files:**
- Read: `store.js`
- Read: `data/i18n/messages/en.json`
- Read: `scripts/build-i18n-public-catalogs.mjs`

- [x] **Step 1: Locate packs route rendering**

Verified that `renderPackCatalog()`, `createPackCard()`, `createProSubscriptionCard()`, `createLaunchEditionCard()`, `renderCollectionDetail()`, and the locked premium panel in `store.js` render the visible packs page and related collection content.

- [x] **Step 2: Identify strings to localize**

Confirmed hard-coded visible strings include `Launch Edition`, `Save {percent}%`, `All 8 collections...`, `Get Bundle`, `Preview`, `Buy $5`, `Redeem now`, pack names, pack descriptions, collection detail meta, and locked-preview purchase copy.

### Task 2: Add Catalog Keys

**Files:**
- Modify: `data/i18n/messages/*.json`
- Modify: `public/i18n/messages/*.json`
- Modify: `mcp/public/i18n/messages/*.json`
- Create: `scripts/repair-packs-localization.mjs`

- [x] **Step 1: Add `packs` message group to source catalogs**

Add `packs.empty`, `packs.types`, `packs.status`, `packs.card`, `packs.launch`, `packs.pro`, `packs.detail`, `packs.locked`, and `packs.products` keys for all 12 locales.

- [x] **Step 2: Sync public and MCP catalogs**

Run `node scripts/build-i18n-public-catalogs.mjs` so public and MCP output catalogs match source.

### Task 3: Wire Store Rendering

**Files:**
- Modify: `store.js`

- [x] **Step 1: Add localized product helpers**

Add helpers that resolve localized pack name and description by product slug, falling back to existing product data.

- [x] **Step 2: Replace hard-coded packs catalog strings**

Update `renderPackCatalog()`, `createPackCard()`, `getPackCardState()`, `createProSubscriptionCard()`, and `createLaunchEditionCard()` to use i18n keys.

- [x] **Step 3: Replace related collection detail and locked-panel strings**

Update collection detail title, description, meta, purchase actions, and locked preview copy to use i18n keys and localized product names.

### Task 4: Add Verification

**Files:**
- Create: `scripts/verify-packs-localization.mjs`

- [x] **Step 1: Add browser smoke checks**

Open the packs page in English and Simplified Chinese, verify English still renders expected baseline copy, and verify Simplified Chinese no longer shows the previously hard-coded English strings from the screenshot.

- [x] **Step 2: Run localization and build gates**

Run:

```powershell
node scripts/repair-packs-localization.mjs
node scripts/build-i18n-public-catalogs.mjs
node scripts/verify-i18n-catalogs.mjs
$env:SUPERICONS_LOCAL_URL='http://127.0.0.1:5174/'; node scripts/verify-packs-localization.mjs
npm run build
```

Expected result: all commands pass, and the packs page no longer shows the verified English leak strings in Chinese mode.
