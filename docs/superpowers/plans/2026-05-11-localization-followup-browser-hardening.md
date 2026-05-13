# Localization Follow-Up Browser Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Verify the follow-up localization audit and close the confirmed browser coverage gap for localized auth purchase and subscription flows.

**Architecture:** Keep the app behavior unchanged and strengthen the Playwright smoke test. The test should load each supported locale, open the pricing page, trigger the Pro subscription and Launch Bundle purchase auth flows, and assert that modal title, description, note, and submit copy are message-like without using English-only wording checks.

**Tech Stack:** Node.js, Playwright, existing Supericons Vite dev server, existing i18n catalog runtime.

---

### Task 1: Verify Audit Claims

**Files:**
- Read: `docs/localization-regression-hardening-followup-audit-2026-05-11.md`
- Read: `scripts/verify-auth-message-browser-smoke.mjs`
- Read: `scripts/verify-auth-error-localization.mjs`
- Read: `scripts/repair-auth-account-checkout-localization.mjs`
- Read: `scripts/verify-i18n-catalogs.mjs`

- [x] **Step 1: Confirm residual risk status**

Verified that `verify-auth-message-browser-smoke.mjs` still tests forgot-password in all 12 locales but tests subscribe, purchase, and wrong-password only in English.

- [x] **Step 2: Confirm verifier and repair safeguards**

Verified that `verify-auth-error-localization.mjs` includes static and dynamic action-label detection, placeholder checks, and message length checks. Verified that `repair-auth-account-checkout-localization.mjs` uses `expandGroup()` length validation and no longer rewrites question marks.

### Task 2: Expand Browser Smoke Coverage

**Files:**
- Modify: `scripts/verify-auth-message-browser-smoke.mjs`

- [x] **Step 1: Add reusable pricing auth assertion helper**

Create a helper that opens `?view=pricing&locale=<locale>`, clicks the requested pricing CTA, reads the auth modal title, description, note, and submit label, and asserts:
- title exists
- title is not identical to the submit label
- description is message-like
- note is message-like

- [x] **Step 2: Run subscribe flow for every locale**

Loop over all supported locales and test `#pricingProBtn`.

- [x] **Step 3: Run purchase flow for every locale**

Loop over all supported locales and test `#pricingLaunchBtn`.

- [x] **Step 4: Keep wrong-password check English-only**

Leave wrong-password as English-only because it depends on backend/auth behavior and was not the verified gap.

### Task 3: Verify

**Files:**
- Test: `scripts/verify-auth-message-browser-smoke.mjs`

- [x] **Step 1: Run static localization gates**

Run:

```powershell
npm run verify:auth-error-localization
node scripts/verify-i18n-catalogs.mjs
```

- [x] **Step 2: Run browser smoke with local dev server**

Run against the active local Vite server:

```powershell
$env:SUPERICONS_LOCAL_URL='http://127.0.0.1:5174/'; npm run verify:auth-message-browser-smoke
```

- [x] **Step 3: Run build**

Run:

```powershell
npm run build
```

Expected result: all commands pass.
