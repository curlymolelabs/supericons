# Spanish German Portuguese Search Coverage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Spanish, German, and Portuguese multilingual icon search support for all 280 existing English synonym concept groups.

**Architecture:** Generalize the current CJK-only search expansion into a broader multilingual search layer while keeping backward-compatible CJK file names and tests. Generate `es`, `de`, and `pt` public-safe term records from the same 280-concept source used by CJK, then wire all seven locales through website search and MCP search.

**Tech Stack:** Node.js ESM scripts, JSON public term datasets, existing MCP local search, existing website search box, Vite browser smoke testing.

---

### Task 1: Generalize Locale Search Core

**Files:**
- Modify: `lib/cjk-search-core.js`
- Modify: `mcp/runtime/cjk-search-core.js`
- Modify: `lib/web-cjk-search-smoke.js`
- Modify: `main.js`
- Modify: `mcp/search.js`
- Modify: `mcp/index.js`

- [ ] **Step 1: Add locale constants**

Add `MULTILINGUAL_SEARCH_LOCALES = ['zh-Hans', 'zh-Hant', 'ja', 'ko', 'es', 'de', 'pt']` while preserving `CJK_SEARCH_LOCALES` for compatibility.

- [ ] **Step 2: Add Latin-locale query matching**

Update the expansion function so exact approved Spanish, German, and Portuguese terms or variants expand to English concepts even though they are not CJK script.

- [ ] **Step 3: Preserve CJK-specific behavior**

Keep Korean spacing compaction and CJK script matching behavior unchanged.

- [ ] **Step 4: Wire website and MCP to the generalized locale result**

Keep exported function names backward-compatible, but return `locale` for all supported languages. Update website search code to use that locale when calling hosted search.

### Task 2: Generate Spanish, German, Portuguese Terms

**Files:**
- Modify: `data/i18n/cjk-search-terms.json`
- Modify: `public/cjk-search-terms.json`
- Modify: `mcp/public/cjk-search-terms.json`

- [ ] **Step 1: Keep existing 1,120 CJK records**

Preserve current accepted CJK records.

- [ ] **Step 2: Add 840 Latin-locale records**

For each of the 280 concepts, create one accepted record for:
- `es`
- `de`
- `pt`

- [ ] **Step 3: Clean ambiguous machine translations**

Filter cross-concept primary-term collisions and patch common UI terms such as settings, logout, upload, download, password, invoice, receipt, firewall, workflow, and language-model concepts.

### Task 3: Expand Validators and Fixtures

**Files:**
- Modify: `scripts/verify-cjk-search-quality.mjs`
- Modify: `scripts/verify-cjk-search-fixtures.mjs`
- Modify: `scripts/verify-web-cjk-search.mjs`
- Modify: `data/i18n/cjk-search-fixtures.json`

- [ ] **Step 1: Validate all seven locales**

Make the quality gate require `280` records for each supported locale.

- [ ] **Step 2: Keep deterministic checks**

Check public artifacts match, no internal process metadata leaks, no mojibake, no empty normalized terms, quality scores are at least `0.85`, and each `maps_to` includes the concept.

- [ ] **Step 3: Add fixture parity**

Generate at least `57` fixtures per locale, matching the CJK breadth from the previous phase.

- [ ] **Step 4: Add website smoke cases**

Add representative browser-path smoke cases for Spanish, German, and Portuguese.

### Task 4: Run Verification Gates

**Files:**
- Read final scripts and generated JSON

- [ ] **Step 1: Run quality gate**

Run: `npm run verify:cjk-search-quality`

- [ ] **Step 2: Run multilingual fixture gate**

Run: `npm run verify:cjk-search-fixtures`

- [ ] **Step 3: Run website smoke gate**

Run: `npm run verify:web-cjk-search`

- [ ] **Step 4: Run English regression gate**

Run: `npm run verify:search-query-fixtures`

- [ ] **Step 5: Run hosted search and MCP package gates**

Run:
- `npm run verify:hosted-search-engine`
- `npm run verify:motion-lab-mcp-package`

### Task 5: Browser Verification

**Files:**
- Read local Vite page

- [ ] **Step 1: Open local site**

Use `http://127.0.0.1:5173/`.

- [ ] **Step 2: Type representative terms**

Verify examples:
- Spanish `contraseña`
- German `rechnung`
- Portuguese `fluxo de trabalho`
- Spanish `cortafuegos`
- German `musik`
- Portuguese `pesquisa`

- [ ] **Step 3: Check console errors**

Confirm browser console reports no errors.

---

## Self-Review

- Spec coverage: The plan adds Spanish, German, and Portuguese for all 280 concepts and wires them into both website and MCP search.
- Placeholder scan: No task contains `TBD`, unspecified tests, or vague “handle edge cases” placeholders.
- Type consistency: The same existing public term schema is reused, so no consuming code needs a new public record shape.
