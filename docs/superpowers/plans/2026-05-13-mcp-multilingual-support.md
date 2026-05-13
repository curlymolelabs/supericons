# MCP Multilingual Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve MCP multilingual usefulness without localizing all 20,000+ icon names or changing stable tool and icon identifiers.

**Architecture:** Keep English icon IDs, library keys, file-format labels, and MCP tool names stable. Add multilingual support where it helps search and agent comprehension: `locale` plumbing, localized search aliases, docs/examples, and locale-aware telemetry metadata.

**Tech Stack:** Node ESM, MCP SDK, Zod schemas, existing Supericons search runtime, public JSON artifacts, npm verification scripts.

---

## Verified Starting Point

- `mcp/index.js` already exposes `search_icons.locale` for `zh-Hans`, `zh-Hant`, `ja`, `ko`, `es`, `de`, `pt`, `ar`, `hi`, `vi`, and `th`.
- `mcp/remote-server.js` does not expose or pass `locale` for hosted MCP `search_icons`.
- `mcp/recommend-icons.js` currently normalizes slot/task text with a Latin-only regex, so localized slot labels do not become useful English search variants.
- `mcp/telemetry.js` logs MCP search attempts but ignores the `locale` value passed by callers.
- `docs-pages.js` documents `search_icons` without the `locale` parameter or multilingual examples.
- `data/i18n/cjk-search-terms.json`, `public/cjk-search-terms.json`, and `mcp/public/cjk-search-terms.json` contain 280 concept groups per non-English locale, but there is no separate localized category/tag alias artifact.

## Files

- Modify: `mcp/index.js`
- Modify: `mcp/remote-server.js`
- Modify: `mcp/recommend-icons.js`
- Modify: `mcp/search.js`
- Modify: `mcp/hosted-search-client.js`
- Modify: `mcp/telemetry.js`
- Modify: `mcp/package.json`
- Modify: `mcp/server.json`
- Modify: `docs-pages.js`
- Modify: `main.js`
- Modify: `scripts/build-motion-lab-mcp-artifacts.mjs`
- Modify: `scripts/verify-motion-lab-mcp-package.mjs`
- Create: `scripts/build-multilingual-search-aliases.mjs`
- Create: `scripts/verify-mcp-multilingual-support.mjs`
- Create: `data/i18n/multilingual-search-aliases.json`
- Create: `public/multilingual-search-aliases.json`
- Create: `mcp/public/multilingual-search-aliases.json`

## Task 1: Add Locale Constants And Alias Artifact

- [ ] **Step 1: Create `scripts/build-multilingual-search-aliases.mjs`**

Build a public-safe JSON artifact from existing localized `filters.categories` labels. Map each category to stable English concepts already present in `public/synonyms.json`.

- [ ] **Step 2: Run the alias build script**

Run:

```bash
node scripts/build-multilingual-search-aliases.mjs
```

Expected: source, website public, and MCP public alias files are written with matching content.

- [ ] **Step 3: Wire alias artifact into package build**

Copy `public/multilingual-search-aliases.json` into `mcp/public/multilingual-search-aliases.json` from `scripts/build-motion-lab-mcp-artifacts.mjs`.

## Task 2: Expand Search Runtime Safely

- [ ] **Step 1: Load aliases in MCP local fallback search**

Update `mcp/search.js` so `expandCjkQuery` receives both approved concept terms and approved category aliases.

- [ ] **Step 2: Load aliases in website search planning**

Update `main.js` so the browser search query planner receives both approved concept terms and category aliases.

- [ ] **Step 3: Preserve existing CJK term quality gates**

Do not add category aliases to `cjk-search-terms.json`; keep the strict 280-concept quality verifier unchanged.

## Task 3: Add Locale To Hosted MCP Search And Recommendations

- [ ] **Step 1: Add `locale` to hosted MCP `search_icons`**

Update `mcp/remote-server.js` schema and handler to pass `locale` into `searchIconsHostedMcp`.

- [ ] **Step 2: Add `locale` to `recommend_icons`**

Update local and hosted MCP schemas so localized slot labels can be interpreted. Preserve `task`, `slots`, `library`, `style`, and `limit_per_slot`.

- [ ] **Step 3: Expand localized slot labels**

Update `mcp/recommend-icons.js` so localized task/slot strings expand through the same approved multilingual terms before scoring and searching.

## Task 4: Improve Human-Readable MCP Help And Telemetry

- [ ] **Step 1: Improve no-result guidance**

Return a structured no-results payload with the original query, library filter, locale, and a short hint. Do not change successful result fields.

- [ ] **Step 2: Preserve locale in telemetry metadata**

Store locale in the existing `p_evidence_text` field as `search_icons locale=<locale>` so failed-query tracking remains useful without changing the database contract.

## Task 5: Update Public MCP Docs And Registry Copy

- [ ] **Step 1: Add `locale` docs**

Update `docs-pages.js` so `search_icons` references the optional `locale` parameter and includes multilingual examples.

- [ ] **Step 2: Update MCP package metadata**

Update `mcp/package.json` and `mcp/server.json` descriptions to mention multilingual semantic search without localizing tool names or identifiers.

## Task 6: Verification

- [ ] **Step 1: Add MCP multilingual verifier**

Create `scripts/verify-mcp-multilingual-support.mjs` to check:

```text
- stdio and hosted MCP schemas expose the same supported locale list for search_icons
- recommend_icons exposes locale in both servers
- hosted client forwards locale
- category alias files exist and match across data/public/mcp
- localized aliases expand to expected English concepts
- docs mention locale and multilingual examples
- package dry-run includes the alias artifact
```

- [ ] **Step 2: Run focused checks**

Run:

```bash
node scripts/build-multilingual-search-aliases.mjs
npm run verify:cjk-search-quality
npm run verify:cjk-search-fixtures
npm run verify:web-cjk-search
node scripts/verify-mcp-multilingual-support.mjs
npm run verify:mcp-docs-setup
npm run verify:motion-lab-mcp-package
npm run build
```

Expected: all commands pass. If `npm run build` hits a transient Windows file lock, retry once and report the first failure honestly.

## Self-Review

- Spec coverage: This plan covers MCP locale behavior, docs/examples, errors/help text, telemetry-friendly failed-query tracking, and category/tag aliases without changing icon names.
- Stable identifiers: Tool names, icon IDs, library names, file-format labels, SVG/PNG/CSS labels, and code identifiers remain stable.
- Scope boundary: Full 20,000+ icon-name localization remains out of scope.
