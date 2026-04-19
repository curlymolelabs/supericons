# P0 Product Facts and Packs Title Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop visible product-fact drift, create one shared product-facts source, and fix the `/?view=packs` title ownership bug without unsafe refactors.

**Architecture:** Add a generated product-facts artifact that reads from the real free-icon catalog, premium manifest, and MCP package metadata. Use a small shared browser helper plus Node-side readers so top-surface copy and MCP metadata can stop drifting. Fix the packs heading bug by moving title resolution into a testable helper so store views can keep ownership of their own heading text.

**Tech Stack:** Vite SPA, vanilla JavaScript modules, JSON build artifacts, Node verification scripts, MCP Node server.

---

## File Structure

### New files

- `data/product-facts.json`
  Generated shared facts artifact with exact counts, rounded display labels, and MCP metadata.
- `scripts/build-product-facts.mjs`
  Builds `data/product-facts.json` from real source artifacts.
- `scripts/verify-product-facts.mjs`
  Verifies the generated facts against source artifacts and checks the classified top-surface strings.
- `lib/product-facts.js`
  Browser-facing helper for reading shared facts and common display labels.
- `docs/superpowers/plans/2026-04-19-product-facts-drift-inventory.md`
  P0 inventory of drifted count/version/tool strings with classification and action.
- `docs/superpowers/plans/2026-04-19-p0-product-facts-and-packs-title-implementation-plan.html`
  Plain-language HTML copy of this plan.

### Files to modify

- `package.json`
  Add `build:product-facts` and `verify:product-facts`, fix the root description drift, and run product-facts generation in build.
- `main.js`
  Import shared product facts and replace the high-surface placeholder/empty-state strings. Fix grid title ownership using a small helper.
- `store.js`
  Import shared product facts and replace the high-surface pricing / MCP count strings.
- `docs-pages.js`
  Import shared product facts and replace the high-surface docs copy and MCP tool table strings.
- `lib/icon-grid-behavior.js`
  Add a pure helper for grid-title resolution so store views can preserve their title.
- `scripts/verify-icon-grid-behavior.mjs`
  Add a failing-then-passing assertion for store-view title ownership.
- `mcp/index.js`
  Read shared facts, remove the stale `3 tools` assumption, align version/tool labeling, and use shared free-icon display text.

---

## Task 1: Inventory Drift Before Changing Copy

**Files:**

- Create: `docs/superpowers/plans/2026-04-19-product-facts-drift-inventory.md`
- Read/inspect: `index.html`
- Read/inspect: `main.js`
- Read/inspect: `store.js`
- Read/inspect: `docs-pages.js`
- Read/inspect: `mcp/index.js`
- Read/inspect: `package.json`
- Read/inspect: `mcp/package.json`

- [ ] Record every P0-relevant string that currently drifts.
- [ ] Classify each entry as:
  - marketing copy
  - product truth
  - technical metadata
- [ ] Record the intended future source for each entry:
  - shared product facts
  - static rounded marketing copy
  - package-local metadata

**Verification command:**

- `Get-Content "docs/superpowers/plans/2026-04-19-product-facts-drift-inventory.md"`

Expected:

- inventory exists
- every P0-touched string is classified

---

## Task 2: Build Shared Product Facts With Verification First

**Files:**

- Create: `scripts/build-product-facts.mjs`
- Create: `scripts/verify-product-facts.mjs`
- Create: `data/product-facts.json`
- Modify: `package.json`

- [ ] Write `scripts/verify-product-facts.mjs` first so it fails when `data/product-facts.json` is missing or stale.
- [ ] Run the verification script and confirm the initial failure.
- [ ] Implement `scripts/build-product-facts.mjs` to read:
  - `public/icon-index.json`
  - `public/packs/manifest.json`
  - `mcp/package.json`
  - `mcp/index.js`
- [ ] Write these minimum fields:
  - exact `freeIconCount`
  - exact `freeLibraryCount`
  - exact `premiumCollectionCount`
  - exact `premiumIconCount`
  - exact `mcpToolCount`
  - exact `mcpPackageVersion`
  - rounded display labels for `20,000+` style UI copy
- [ ] Add `build:product-facts` and `verify:product-facts` to `package.json`.
- [ ] Run the generator, then rerun verification and confirm it passes.
- [ ] Add `build:product-facts` to the main build pipeline before Vite build.
- [ ] Fix the root package description drift as part of the classified P0 copy.

**Verification commands:**

- `node scripts/verify-product-facts.mjs`
- `node scripts/build-product-facts.mjs`
- `node scripts/verify-product-facts.mjs`

Expected:

- first verify fails for missing/stale facts
- build writes `data/product-facts.json`
- second verify passes

---

## Task 3: Wire Top-Surface Consumers To Shared Facts

**Files:**

- Create: `lib/product-facts.js`
- Modify: `main.js`
- Modify: `store.js`
- Modify: `docs-pages.js`
- Modify: `mcp/index.js`

- [ ] Add a browser helper that exposes shared facts and the most common display labels.
- [ ] Replace the P0 top-surface runtime strings in:
  - `main.js`
  - `store.js`
  - `docs-pages.js`
- [ ] Keep intentionally rounded marketing copy rounded where the inventory says it should stay rounded.
- [ ] Use shared facts in MCP for:
  - free icon label text
  - tool count wording where appropriate
- [ ] Stop MCP server version drift by reading the MCP package version instead of duplicating it in two places.
- [ ] Remove or update the stale `Provides 3 tools` top comment.

**Verification commands:**

- `node scripts/verify-product-facts.mjs`
- `npm run verify:search-query-fixtures`

Expected:

- shared facts still verify
- existing MCP search fixtures still pass

---

## Task 4: Fix Packs Route Title Ownership With A Failing Test First

**Files:**

- Modify: `lib/icon-grid-behavior.js`
- Modify: `scripts/verify-icon-grid-behavior.mjs`
- Modify: `main.js`

- [ ] Add a failing assertion to `scripts/verify-icon-grid-behavior.mjs` for store-view title preservation.
- [ ] Run the script and confirm the new assertion fails.
- [ ] Add a small pure helper in `lib/icon-grid-behavior.js` that resolves the grid heading while allowing store views to preserve the current title.
- [ ] Update `main.js` to use the helper instead of blindly overwriting the heading during store views.
- [ ] Keep the rest of `updateCounts()` behavior unchanged.
- [ ] Rerun `verify-icon-grid-behavior` and confirm it passes.

**Verification commands:**

- `npm run verify:icon-grid-behavior`

Expected:

- first run fails on the new title-preservation assertion
- second run passes after the helper-based fix

---

## Task 5: Final P0 Verification

**Files:**

- Verify: `data/product-facts.json`
- Verify: `docs/superpowers/plans/2026-04-19-product-facts-drift-inventory.md`
- Verify: app source files touched above

- [ ] Run the focused product-facts verification.
- [ ] Run the focused icon-grid verification.
- [ ] Run the existing search fixture verification.
- [ ] Run the full app build.
- [ ] Confirm the P0 plan and inventory docs still match the delivered behavior.

**Verification commands:**

- `node scripts/verify-product-facts.mjs`
- `npm run verify:icon-grid-behavior`
- `npm run verify:search-query-fixtures`
- `npm run build`

Expected:

- all commands exit `0`

---

## Self-Review

### Spec coverage

- shared product-facts source: covered by Tasks 2 and 3
- drift inventory: covered by Task 1
- packs route title bug: covered by Task 4
- verification and build integration: covered by Tasks 2 and 5

### Placeholder scan

- no `TODO` / `TBD`
- all tasks list exact files
- all verification steps include exact commands

### Naming consistency

- `product-facts` is used consistently for the shared facts layer
- `drift inventory` is used consistently for the P0 snapshot doc
- `title ownership` is used consistently for the packs bug fix

---

Plan complete and saved to `docs/superpowers/plans/2026-04-19-p0-product-facts-and-packs-title-implementation-plan.md`.

Execution in this session: inline, immediately after plan creation.
