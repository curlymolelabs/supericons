# Supericons Foundation Main Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the launch-critical semantic and product-foundation work in one coordinated plan: fix current shell drift, centralize product facts, preserve the intentionally narrow purpose-chip experiment, and prepare the codebase for the SI Registry without unsafe refactors.

**Architecture:** Keep the current app shell and current product surfaces, but reduce drift by introducing a canonical product-facts layer and clearer ownership boundaries. Fix shell-title conflicts immediately. Treat large-file and app-shell refactors as dependency-sensitive extraction work with audits before every split. Establish the SI Registry documents and scaffolding first, then migrate consumers gradually rather than rewriting the app.

**Tech Stack:** Vite SPA, vanilla JavaScript modules, CSS, Supabase, MCP Node package, structured JSON data artifacts, verification scripts, targeted browser checks.

---

## Scope

This is the single collated implementation plan for the current agreed work.

It intentionally includes:

- the packs-route heading bug
- count and version consistency
- the current purpose-chip scope decision
- safe large-file refactor planning
- safe app-shell concern separation
- SI Registry groundwork

It supersedes using the earlier purpose-filter plan as the only source of truth. That earlier plan is still useful context, but the work now belongs inside this broader foundation plan.

---

## Guardrails

### 1. No broad rewrite before launch

Keep the current app shell. Extract only what lowers current risk and drift.

### 2. Refactor only with dependency maps first

For `main.js`, `store.js`, and `style.css`, do not extract blindly.

Before every boundary change:

- inventory imports and exports
- inventory DOM dependencies
- inventory route dependencies
- inventory state mutation side effects
- audit startup and route-restoration flows

### 3. One ownership boundary at a time

Do not split multiple high-risk modules in one pass.

### 4. Verification before confidence

For every extracted boundary:

- run script verification
- run targeted browser-route verification
- re-audit for hidden gaps

---

## Current Problems To Solve

## P0 problems

### 1. Packs route heading overwrite

Observed behavior:

- direct `/?view=packs` still shows `All Icons` in the main heading
- collection detail previews show the correct collection titles

Root cause:

- `store.js` correctly sets `Premium Collections`
- `main.js` later reasserts icon-grid heading ownership during startup

### 2. Product facts drift

Observed drift:

- `20,000+` across many UI and docs surfaces
- actual free outline corpus is `21,264`
- root `package.json` still says `60K+`
- MCP package and server version strings disagree
- MCP top comment says `3 tools` while docs say `12`

### 3. Purpose-chip scope must stay intentionally narrow

Decision:

- purpose chips remain an `All Icons` experiment only
- current 3-category setup is intentional

Need:

- protect this scope cleanly
- stop other product work from re-expanding it accidentally

## P1 problems

### 4. Large frontend files create risk

Files:

- `store.js`
- `main.js`
- `style.css`

Why it matters:

- hard to reason about safely
- route and state dependencies are implicit
- regressions become more likely

### 5. App shell mixes too many concerns in code

Current reality:

- packs
- detail views
- docs
- pricing
- dashboard
- tools
- legal pages

all live through the same shell and much of the same module logic

This is acceptable as a UX model but risky as an implementation model.

### 6. Registry groundwork does not yet exist in code

Need:

- canonical product facts source
- canonical semantic registry scaffolding
- clear projection strategy

---

## File Inventory and Intended Ownership

### Current files with high strategic importance

- `main.js`
  Icon-grid state, search, heading logic, shell updates, purpose-chip behavior

- `store.js`
  Store routes, packs, collection detail, docs, pricing, dashboard, tools, route syncing

- `style.css`
  Cross-surface shell styling and visibility rules

- `lib/icon-grid-behavior.js`
  Shared browse behavior and current purpose-chip scope helpers

- `lib/icon-taxonomy-seed.js`
  Current curated purpose buckets

- `public/icon-index.json`
  Current free-corpus projection

- `public/packs/manifest.json`
  Current premium metadata projection

- `scripts/build-icons.js`
  Current icon count generator for free indexes

- `mcp/index.js`
  MCP server metadata and tool registration

- `mcp/package.json`
  MCP package version source

- `package.json`
  Root package description currently drifting from actual product counts

### New files this plan should introduce

- `data/product-facts.json` or equivalent generated artifact
- `scripts/build-product-facts.mjs`
- `scripts/verify-product-facts.mjs`
- `data/si-registry/` or equivalent registry source directory
- `lib/shell-title-sync.js` or equivalent extracted ownership helper

### Future boundary extraction candidates

- `store/routes/`
- `store/packs/`
- `store/docs/`
- `store/tools/`
- `lib/product-facts.js`

These should only be introduced after dependency audits.

---

## Phase 0: Foundation Documents And Source Of Truth

### Task 1: Land the canonical docs and treat them as active source material

**Files:**

- `docs/superpowers/plans/2026-04-19-si-semantic-metadata-v1-spec.md`
- `docs/superpowers/plans/2026-04-19-si-registry-prd-and-blueprint.md`
- `docs/superpowers/plans/2026-04-19-si-semantic-rollout-roadmap.md`
- `docs/superpowers/plans/2026-04-19-supericons-foundation-main-implementation-plan.md`

- [ ] Confirm these docs are the working source for semantic and implementation decisions.
- [ ] Mark older strategy docs as context rather than active truth where needed.

### Task 2: Create a product-facts source

**Goal:** Stop count and version strings from drifting.

**Files:**

- Create: `data/product-facts.json`
- Create: `scripts/build-product-facts.mjs`
- Create: `scripts/verify-product-facts.mjs`
- Modify: `scripts/build-icons.js`
- Modify: `package.json`
- Modify: `mcp/index.js`
- Modify: `mcp/package.json`

- [ ] Define product facts keys:
  - free icon count
  - free library count
  - premium collection count
  - premium icon count
  - MCP tool count
  - MCP package version
  - marketing-safe display strings
- [ ] Build the facts artifact from actual source generators and manifests.
- [ ] Add verification that fails when public copy or package metadata drifts from canonical facts.

---

## Phase 1: Fix Launch-Critical UI Truth

### Task 3: Fix shell-title ownership for the packs route

**Files:**

- Modify: `main.js`
- Modify: `store.js`
- Optional create: `lib/shell-title-sync.js`

- [ ] Audit who currently owns `gridTitle` and `gridMeta`.
- [ ] Prevent icon-grid heading updates from running while store-shell views are active.
- [ ] Make store-route title ownership explicit.
- [ ] Verify:
  - `/`
  - `/?view=packs`
  - preview into a collection detail
  - back to collections
  - docs and pricing route transitions

### Task 4: Replace top-surface drifted product facts

**Files:**

- Create: `docs/superpowers/plans/2026-04-19-product-facts-drift-inventory.md`
- Modify: `index.html`
- Modify: `store.js`
- Modify: `docs-pages.js`
- Modify: `package.json`
- Modify: `mcp/index.js`

- [ ] Inventory every hardcoded count or version string before changing copy.
- [ ] Classify each drifted string as marketing copy, product truth, or technical metadata.
- [ ] Replace hardcoded counts where possible with generated values or synchronized constants.
- [ ] Align MCP version and tool count declarations.
- [ ] Decide which public copy should stay rounded like `20,000+` and which should display exact values like `21,264`.
- [ ] Ensure rounded copy is deliberate and exact values are canonical.

### Task 5: Keep the purpose-chip experiment intentionally narrow

**Files:**

- Modify: `lib/icon-grid-behavior.js`
- Modify: `main.js`
- Verify: `scripts/verify-icon-grid-behavior.mjs`
- Reference: `docs/superpowers/plans/2026-04-18-purpose-filter-scope-fix.md`

- [ ] Preserve the current `All Icons` only rule.
- [ ] Keep 3 seeded categories for now.
- [ ] Treat the current taxonomy seed as a short-lived browse experiment, not a second permanent metadata system.
- [ ] Decide and document that registry-backed browse facets will replace the seed in one explicit cutover when ready.
- [ ] Ensure future refactors do not accidentally re-expand scope.
- [ ] Add or keep verification that store/docs/pricing routes cannot inherit chip state.

---

## Phase 2: Safe Refactor Preparation

### Task 6: Audit `main.js` before any extraction

**Files:**

- Modify or create audit note under `docs/superpowers/plans/`

- [ ] Inventory heading-sync responsibilities.
- [ ] Inventory search, browse, and shell coupling.
- [ ] Inventory which functions mutate DOM outside icon-grid ownership.
- [ ] Identify extraction candidates that do not require broad state rewrites.

### Task 7: Audit `store.js` before any extraction

**Files:**

- Modify or create audit note under `docs/superpowers/plans/`

- [ ] Inventory route families:
  - packs
  - collection detail
  - downloads
  - dashboard
  - api keys
  - docs
  - pricing
  - privacy and terms
  - tools
- [ ] Map shared helpers used across those route families.
- [ ] Map startup path and `syncViewFromLocation` interactions.
- [ ] Identify low-risk first extraction boundaries.

### Task 8: Audit `style.css` before any extraction

**Files:**

- Modify or create audit note under `docs/superpowers/plans/`

- [ ] Identify shell visibility rules.
- [ ] Identify store-active state rules.
- [ ] Identify chip and header rules with cross-route side effects.
- [ ] Identify candidate CSS groupings that can move safely.

### Task 9: Define the regression matrix for refactor work

**Verification areas:**

- initial homepage load
- direct route to packs
- direct route to docs
- collection detail preview
- pricing route
- auth return flow
- purchase success route handling
- MCP docs route navigation
- purpose-chip visibility and state preservation

- [ ] Write the matrix into the plan or linked audit doc.
- [ ] Require re-audit after each extraction.

---

## Phase 3: First Safe Extractions

This phase should not begin until Phase 2 audits are complete.

### Task 10: Extract shell-title synchronization

**Goal:** One place owns title/meta behavior across icon-grid and store-shell views.

Potential files:

- Create: `lib/shell-title-sync.js`
- Modify: `main.js`
- Modify: `store.js`

- [ ] Move title-setting rules into a focused helper.
- [ ] Keep surface behavior unchanged except for the packs-route fix.
- [ ] Re-run route verification matrix.

### Task 11: Extract product facts consumer helpers

**Goal:** One small helper reads canonical generated facts instead of duplicating strings.

Potential files:

- Create: `lib/product-facts.js`
- Modify: `store.js`
- Modify: `docs-pages.js`

- [ ] Centralize the facts read layer.
- [ ] Keep display-format decisions explicit.

### Task 12: Extract store route modules gradually

This should happen in small, independently verifiable slices.

Recommended order:

1. packs and collection detail
2. docs
3. pricing and legal
4. dashboard and api keys
5. tools

For each extraction:

- [ ] dependency map first
- [ ] route-surface verification
- [ ] startup and back-button verification
- [ ] re-audit for hidden coupling

---

## Phase 4: Registry Foundation In Code

### Task 13: Create registry scaffolding

**Files:**

- Create: `data/si-registry/`
- Create: `scripts/build-si-registry-projections.mjs`
- Create: `scripts/verify-si-registry-projections.mjs`

- [ ] Define the canonical record storage format.
- [ ] Lock the registry ID rule: aggregated icons use `{source_library}:{source_name}`, SI-native icons use `si:{name}`.
- [ ] Write and keep a 12-tool MCP registry integration matrix as part of the registry foundation docs.
- [ ] Seed premium records first.
- [ ] Define how free corpus records will be staged and enriched.

### Task 14: Normalize premium metadata into the registry shape

**Files:**

- Modify: premium data source files
- Modify: `public/packs/manifest.json` generation path

- [ ] Convert existing premium `purpose`, `tags`, and `category` into full registry records.
- [ ] Treat this as a field-mapping and enrichment task first, not fresh semantic authoring.
- [ ] Add depiction, evidence, confidence, and review-state fields.

### Task 15: Prepare free-corpus registry rollout

**Files:**

- Modify: build and sync scripts
- Possibly create batch-tagging pipeline files

- [ ] Start with top free icons and high-value slices.
- [ ] Keep minimum viable required fields.
- [ ] Do not block launch on full long-tail coverage.
- [ ] Document how `scripts/build-icons.js` transitions from direct public-artifact builder to raw ingest and verification support during registry cutover.
- [ ] Define the registry cutover checks for `public/icon-index.json` and `mcp/public/icon-index.json`.

---

## Phase 5: Visual Inspection And Continuous Semantic Operations

### Task 16: Run a visual-inspection pilot

**Goal:** Validate whether cheap multimodal review materially improves semantic quality.

Pilot slice:

- 100 premium icons
- 100 high-traffic free icons
- 50 ambiguous icons

- [ ] Test one low-cost hosted multimodal lane.
- [ ] Test one local or open-source multimodal lane if setup friction is reasonable.
- [ ] Keep the pilot inside a low single-digit dollar hosted budget.
- [ ] Compare lexical-only vs lexical-plus-visual outcomes.
- [ ] Measure agreement with reviewed recommendations.
- [ ] Decide whether the visual step should be continuous.

### Task 17: Design the autonomous semantic workflow

**Goal:** Make semantic rollout a continuous low-cost system.

- [ ] Define the batch inputs and outputs.
- [ ] Define confidence routing.
- [ ] Define review queue triggers.
- [ ] Define cadence:
  - nightly batch
  - weekly review
  - monthly cleanup

### Task 18: Build a minimal review tool

**Goal:** Make confidence routing executable in real work, not just on paper.

**Files:**

- Create: review CLI or lightweight admin tooling
- Create or modify: batch output files used for pending review

- [ ] Show pending semantic records sorted by confidence and importance.
- [ ] Compare current versus proposed record values.
- [ ] Support approve, reject, and edit actions.
- [ ] Record an audit trail for reviewer and change reason.
- [ ] Filter by collection, category, and confidence band.

---

## Verification Requirements

### Script verification

- `npm run verify:icon-grid-behavior`
- `npm run verify:search-query-fixtures`
- `npm run build`
- new `verify-product-facts`
- future `verify-si-registry-projections`

### Browser verification

- home
- packs
- collection detail
- docs
- pricing
- motion lab
- converter

### Re-audit requirement

After every non-trivial refactor:

- [ ] compare behavior against the regression matrix
- [ ] inspect the affected route family again
- [ ] look for hidden shared state or shell conflicts
- [ ] only then continue

---

## Execution Order Recommendation

1. Keep the new docs as active decision sources.
2. Build canonical product facts.
3. Fix packs-route title ownership.
4. Stabilize purpose-chip scope rules.
5. Replace top-surface drifted facts.
6. Complete dependency audits for large-file and shell refactors.
7. Extract shell-title sync and product-facts consumers.
8. Lock registry IDs, MCP integration scope, and cutover rules.
9. Normalize premium metadata into registry scaffolding.
10. Pilot visual inspection.
11. Build the first review tool.
12. Expand semantic rollout gradually.

---

## Final Recommendation

Treat this plan as the bridge between launch discipline and long-term semantic ambition.

In plain language:

- fix what is visibly wrong now
- stop drift from continuing
- do not refactor blindly
- audit before every extraction
- make the registry real in small, durable steps
- let automation handle repetition
- reserve deeper review for ambiguity and differentiation

That is the safest and highest-leverage path forward from the current Supericons state.
