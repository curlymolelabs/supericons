# Arabic Hindi Vietnamese Thai Search Coverage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Arabic, Hindi, Vietnamese, and Thai multilingual icon search support for all 280 existing English synonym concept groups.

**Architecture:** Extend the existing public-safe multilingual search-term dataset and generalized search expansion layer. Keep the same concept-led approach used for CJK, Spanish, German, and Portuguese: one accepted record per concept per locale, deterministic quality gates, broad fixture coverage, and browser smoke tests.

**Tech Stack:** Node.js ESM scripts, JSON data files, existing website search box, existing MCP local search, Vite browser smoke testing.

---

### Task 1: Extend Locale Support

**Files:**
- Modify: `lib/cjk-search-core.js`
- Modify: `mcp/runtime/cjk-search-core.js`
- Modify: `mcp/index.js`

- [ ] **Step 1: Add locales**

Add these locale codes to the supported multilingual locale list:
- `ar`
- `hi`
- `vi`
- `th`

- [ ] **Step 2: Enable exact approved-term expansion**

Ensure `expandCjkQuery()` can expand explicit or inferred approved terms for Arabic, Hindi, Vietnamese, and Thai, while preserving Korean spacing handling and existing CJK behavior.

- [ ] **Step 3: Update MCP schema**

Allow `search_icons({ locale })` to accept the four new locale codes.

### Task 2: Generate 280-Concept Records

**Files:**
- Modify: `data/i18n/cjk-search-terms.json`
- Modify: `public/cjk-search-terms.json`
- Modify: `mcp/public/cjk-search-terms.json`

- [ ] **Step 1: Preserve existing records**

Keep all existing records for `zh-Hans`, `zh-Hant`, `ja`, `ko`, `es`, `de`, and `pt`.

- [ ] **Step 2: Add four new locales**

For every concept in `public/synonyms.json`, create accepted records for:
- `ar`
- `hi`
- `vi`
- `th`

- [ ] **Step 3: Patch high-value UI terms**

Use explicit stable terms for common product/search concepts such as search, settings, menu, save, upload, download, login, logout, password, invoice, receipt, firewall, workflow, prompt, and language-model concepts.

- [ ] **Step 4: Remove cross-concept collisions**

Filter variants that duplicate another concept’s primary term in the same locale.

### Task 3: Expand Quality Gates and Fixtures

**Files:**
- Modify: `scripts/verify-cjk-search-quality.mjs`
- Modify: `scripts/verify-cjk-search-fixtures.mjs`
- Modify: `scripts/verify-web-cjk-search.mjs`
- Modify: `data/i18n/cjk-search-fixtures.json`

- [ ] **Step 1: Validate all 11 locales**

Require 280 records per locale across all supported locales.

- [ ] **Step 2: Add script checks**

Check Arabic script for `ar`, Devanagari for `hi`, Latin for `vi`, and Thai script for `th`.

- [ ] **Step 3: Generate fixture parity**

Generate 57 fixtures per locale, matching the breadth of the previous phases.

- [ ] **Step 4: Add website smoke cases**

Add website smoke checks for representative Arabic, Hindi, Vietnamese, and Thai terms.

### Task 4: Run Verification Gates

**Files:**
- Read final generated JSON and scripts

- [ ] **Step 1: Run quality gate**

Run: `npm run verify:cjk-search-quality`

- [ ] **Step 2: Run multilingual fixture gate**

Run: `npm run verify:cjk-search-fixtures`

- [ ] **Step 3: Run website smoke gate**

Run: `npm run verify:web-cjk-search`

- [ ] **Step 4: Run English regression and MCP gates**

Run:
- `npm run verify:search-query-fixtures`
- `npm run verify:hosted-search-engine`
- `npm run verify:motion-lab-mcp-package`

### Task 5: Browser Verification

**Files:**
- Read local Vite page

- [ ] **Step 1: Open local site**

Use `http://127.0.0.1:5173/`.

- [ ] **Step 2: Type representative terms**

Verify examples:
- Arabic password
- Hindi invoice
- Vietnamese workflow
- Thai search
- Arabic firewall
- Vietnamese music

- [ ] **Step 3: Check browser console**

Confirm the browser reports no console errors.

---

## Self-Review

- Spec coverage: This adds Arabic, Hindi, Vietnamese, and Thai across all 280 concept groups and verifies website plus MCP behavior.
- Placeholder scan: No task relies on vague placeholders or omitted verification commands.
- Type consistency: The same public term schema and search expansion interface remain in place.
