# CJK 280 Search Coverage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand automated CJK icon search coverage from the first 50 concept groups to all 280 existing English synonym groups.

**Architecture:** Keep the search feature concept-led instead of translating all 21k icon names. Use `public/synonyms.json` as the source of truth for concept coverage, generate public-safe CJK search records for each concept and locale, and keep deterministic validators as the release gate.

**Tech Stack:** Node.js scripts, JSON data files, existing `lib/cjk-search-core.js`, existing MCP search engine, existing website search-box path.

---

### Task 1: Make Concept Coverage Data-Driven

**Files:**
- Modify: `scripts/verify-cjk-search-quality.mjs`
- Read: `public/synonyms.json`

- [ ] **Step 1: Replace the hardcoded 50-concept list**

Load `public/synonyms.json` inside `scripts/verify-cjk-search-quality.mjs` and derive `EXPECTED_CONCEPTS` from its keys.

- [ ] **Step 2: Keep public metadata checks safe**

Update the internal-metadata regex so legitimate public concepts like `prompt` are allowed, while internal fields such as `prompt_notes`, `workflow_trace`, `reviewer_model`, and `agent_notes` remain blocked.

- [ ] **Step 3: Verify the old data fails coverage**

Run: `npm run verify:cjk-search-quality`

Expected before expansion: failure because each locale still has only 50 records while the synonym source has 280 concepts.

### Task 2: Generate 280-Concept CJK Term Data

**Files:**
- Modify: `data/i18n/cjk-search-terms.json`
- Modify: `public/cjk-search-terms.json`
- Modify: `mcp/public/cjk-search-terms.json`

- [ ] **Step 1: Preserve the first 50 curated terms**

Use the existing records for matching locale/concept pairs so the known-good sample searches keep their current behavior.

- [ ] **Step 2: Add translated records for the remaining synonym concepts**

For each concept in `public/synonyms.json`, create one `auto_accept` record per locale:
- `zh-Hans`
- `zh-Hant`
- `ja`
- `ko`

Each record must include `locale`, `concept`, `term`, `variants`, `maps_to`, `source_confidence`, `quality_score`, `quality_warnings`, and `gate`.

- [ ] **Step 3: Keep public artifacts identical**

Copy the generated source data to both website and MCP public locations.

### Task 3: Expand Fixture Coverage

**Files:**
- Modify: `data/i18n/cjk-search-fixtures.json`
- Modify: `scripts/verify-cjk-search-fixtures.mjs`
- Modify: `scripts/verify-web-cjk-search.mjs`

- [ ] **Step 1: Raise the minimum fixture count**

Require at least 25 fixtures per locale.

- [ ] **Step 2: Add broad fixtures**

Add fixtures for common concepts across UI, commerce, media, security, health, travel, developer, and AI concepts.

- [ ] **Step 3: Keep website smoke coverage focused**

Use a smaller set of representative website smoke cases that proves the browser search path uses the expanded public dataset.

### Task 4: Run Verification Gates

**Files:**
- Read: final generated JSON and scripts

- [ ] **Step 1: Run CJK quality gate**

Run: `npm run verify:cjk-search-quality`

Expected: pass.

- [ ] **Step 2: Run CJK search fixture gate**

Run: `npm run verify:cjk-search-fixtures`

Expected: pass.

- [ ] **Step 3: Run website CJK smoke gate**

Run: `npm run verify:web-cjk-search`

Expected: pass.

- [ ] **Step 4: Run English regression gate**

Run: `npm run verify:search-query-fixtures`

Expected: pass.

- [ ] **Step 5: Run MCP packaging gate**

Run: `npm run verify:motion-lab-mcp-package`

Expected: pass.

### Task 5: Browser Verification

**Files:**
- Read: local Vite page

- [ ] **Step 1: Open the local site**

Use the existing dev server at `http://127.0.0.1:5173/`, or start one if needed.

- [ ] **Step 2: Type representative CJK terms**

Verify expanded terms such as Japanese `音楽`, Korean `비밀번호`, Simplified Chinese `防火墙`, and Traditional Chinese `發票` return matching icon families.

- [ ] **Step 3: Check browser console**

Verify the page reports no browser console errors.

---

## Self-Review

- Spec coverage: This plan expands the same website/MCP CJK search path from 50 concept groups to the 280 synonym concepts already used by English search.
- Placeholder scan: No implementation step relies on `TBD`, vague error handling, or omitted test commands.
- Type consistency: The generated records preserve the same public schema already consumed by `lib/cjk-search-core.js`, MCP search, and website search.
