# Directory Organization Implementation Plan

Date: 2026-04-07

## Objective

Reduce directory clutter, make the project practical to copy/share, and separate source code from vendor, generated, and scratch files without changing product behavior.

This plan is based on the current repo state:

- total files in working tree: `55,623`
- root `node_modules/`: `46,536`
- `.git/`: `4,344`
- `mcp/node_modules/`: `3,392`
- project-owned files outside deps/git: about `1,351`
- root `.gitignore`: missing

The main reason the folder feels unmanageable is not only "the icons." The biggest driver is installed dependencies, especially icon packages inside `node_modules/`, plus generated artifacts and scratch files sitting beside source files.

---

## Goals

- make the root directory readable at a glance
- keep source, generated output, and temporary files visibly separate
- make copy/archive workflows exclude rebuildable files by default
- preserve the current Vite app, MCP package, and Supabase workflow
- keep the reorganization incremental and reversible

## Non-Goals

- changing product behavior
- rewriting the build pipeline from scratch
- reducing icon library coverage
- converting everything to a monorepo in one step

---

## Current Pain Points

### 1. Vendor files overwhelm the tree

Most files come from:

- `node_modules/`
- `mcp/node_modules/`
- `.git/`

These are rebuildable or Git-internal and should not shape the human-facing project layout.

### 2. No root ignore policy

Because there is no root `.gitignore`, the working tree mixes source with:

- `dist/`
- `test-results/`
- proof-service logs
- temp screenshots
- Supabase temp output
- both dependency trees

### 3. Root contains mixed concerns

The root currently mixes:

- app runtime files such as `index.html`, `main.js`, `auth.js`, `store.js`, `style.css`
- scratch HTML mockups
- temp PNGs
- logs
- commands/reference notes

### 4. Secondary package is colocated but unmanaged

`mcp/` is a real second Node package with its own `package.json` and `package-lock.json`, but it currently behaves like an unbounded subfolder instead of an explicitly managed workspace component.

### 5. Public assets and source-like assets are close together

`public/` contains real runtime assets and generated files that must be shipped, while premium pack authoring/build assets are conceptually part content pipeline and part deployable output. That boundary needs to be clearer.

---

## Organization Principles

- keep root for high-signal files only
- treat rebuildable files as disposable
- move only one category of files at a time
- prefer compatibility shims during moves over big-bang rewrites
- define one source of truth for each asset class

---

## Recommended End State

```text
supericons/
  .gitignore
  package.json
  package-lock.json
  vite.config.js
  commands.md
  index.html
  src/
    main.js
    auth.js
    store.js
    sidebar-icons.js
    material-export.js
    styles/
      style.css
  public/
    favicon.svg
    icon-index.json
    icon-index-solid.json
    synonyms.json
    llms.txt
    mcp/
    demo/
    material-export/
    material-export-manifest.json
    packs/
  docs/
    audits/
    proposals/
    guides/
    decisions/
    mockups/
    screenshots/
  plans/
  scripts/
    build/
    maintenance/
    import/
    verification/
  tools/
    converter-proof-service/
  premium/
    source/
  mcp/
    package.json
    package-lock.json
    index.js
    search.js
    auth.js
    SKILL.md
  supabase/
  brand/
  tmp/
```

Notes:

- `public/` stays the deployable static asset folder.
- `tmp/` is for local-only outputs and should be ignored.
- `mcp/` can stay at the top level initially; moving it to `packages/` is optional later.
- `premium/source/` is the long-term content-authoring home; `public/packs/` remains the served output.

---

## Phase 0: Baseline and Safety

### Goal

Capture the current state before moving anything.

### Work

- record file-count baseline for:
  - total tree
  - repo without `node_modules`
  - repo without `dist`, temp, and logs
- capture current `git status --short`
- list all root files that are not:
  - config
  - app entry files
  - canonical docs

### Output

- one before/after baseline section added to the implementation PR or commit notes

---

## Phase 1: Add Ignore and Cleanup Policy

### Goal

Remove rebuildable and temporary clutter from the day-to-day working tree view.

### Work

- add a root `.gitignore`
- ignore at minimum:
  - `node_modules/`
  - `mcp/node_modules/`
  - `dist/`
  - `test-results/`
  - `vite-dev.log`
  - `tools/**/*.log`
  - `tools/**/artifacts/`
  - `scripts/tmp-frames/`
  - `supabase/.temp/`
  - `tmp/`
  - root `tmp-*.png`
  - other machine-generated screenshots/logs as identified
- decide whether any currently untracked outputs should be deleted locally after ignore rules land
- document reinstall commands:
  - root: `npm install`
  - MCP package: `cd mcp && npm install`

### Expected Result

The visible working set should drop from roughly `55k` files to roughly `1.3k` meaningful project files.

### Risk

Low. This phase should not affect runtime behavior.

---

## Phase 2: Clean the Root Directory

### Goal

Make the root directory reflect only the core app and repo controls.

### Work

- keep only these classes of files in root:
  - project config
  - app entry files during transition
  - high-signal operator docs such as `commands.md`
- move scratch/mockup HTML files into `docs/mockups/` or `prototypes/`
  - examples: `ecommerce-mockup.html`, `icon-rain-mockup.html`, `trial-preview.html`
- move temporary screenshots into `tmp/screenshots/` if not needed in docs
  - examples: `tmp-*.png`, `dc_verify.png`
- move one-off research/reference text files into `docs/notes/` or `docs/research/`
  - examples: `ionicons_sample.txt`, `ionicon_settings.txt`, `mc_sample_fill.txt`
- move ad hoc logs into `tmp/logs/`

### Decision Rule

If a file is not part of runtime, build, or canonical documentation, it should not live at the repo root.

### Risk

Low if moves are path-only and references are updated where needed.

---

## Phase 3: Consolidate App Source into `src/`

### Goal

Separate browser application code from repo root and align the app with common Vite structure.

### Work

- move runtime JS modules into `src/`
  - `main.js`
  - `auth.js`
  - `store.js`
  - `sidebar-icons.js`
  - `material-export.js`
- move `style.css` into `src/styles/style.css` or `src/style.css`
- update `index.html` to reference the new app entry path
- prefer one browser entrypoint
  - long-term target: `index.html` loads `src/main.js`
  - `main.js` owns auth/store initialization
- add temporary re-export shims only if build scripts need a staged migration

### Important Compatibility Check

Some Node scripts currently import `../material-export.js` from the repo root. Those imports must be updated if `material-export.js` moves, or a compatibility stub should remain temporarily in root.

### Risk

Medium. This is the first phase that can break runtime/build paths if done carelessly.

---

## Phase 4: Normalize Script and Tooling Layout

### Goal

Make automation discoverable by intent rather than by filename sprawl.

### Work

- group scripts by purpose:
  - `scripts/build/`
  - `scripts/import/`
  - `scripts/maintenance/`
  - `scripts/verification/`
- keep package scripts in `package.json` pointing to stable entry files
- move long-running local utilities to `tools/` if they are not normal build scripts
- keep `tools/converter-proof-service/` as the proof-service home
- move its logs and artifacts under ignored subfolders only

### Risk

Low to medium depending on how many hard-coded script paths exist in docs and package scripts.

---

## Phase 5: Clarify Content Pipeline Boundaries

### Goal

Separate premium-content authoring from shipped static output.

### Work

- define `public/packs/` as deployable runtime output only
- define `premium/source/` as authoring/source assets for premium collections
- update pack-related scripts so they read from a clear source location and write to a clear output location
- ensure generated artifacts such as:
  - `bundle.json`
  - manifests
  - obfuscated pack output
  live in the output side, not the source side

### Why This Matters

Right now `public/packs/` acts as both content working area and shipped asset area. That makes the asset lifecycle hard to reason about and increases accidental clutter.

### Risk

Medium. This phase touches build assumptions for premium collections and should happen only after Phases 1-4 are stable.

---

## Phase 6: Make `mcp/` an Explicit Secondary Package

### Goal

Treat the MCP server as an intentional package boundary instead of an incidental folder.

### Work

- keep `mcp/` self-contained with:
  - its own install lifecycle
  - its own lockfile
  - its own ignore behavior
- optionally adopt npm workspaces later if cross-package coordination becomes common
- optional later move:
  - from `mcp/`
  - to `packages/supericons-mcp/`
- do not do the path move in the first cleanup pass unless there is a strong reason

### Recommendation

For now, keep `mcp/` where it is and organize around it. The highest-value fix is ignoring its dependency tree, not renaming the package path.

---

## Phase 7: Normalize Documentation Buckets

### Goal

Make it obvious where to put audits, plans, mockups, and reference material.

### Work

- keep `plans/` for implementation plans and active planning docs
- organize `docs/` into subfolders such as:
  - `docs/audits/`
  - `docs/proposals/`
  - `docs/guides/`
  - `docs/decisions/`
  - `docs/mockups/`
  - `docs/screenshots/`
- move existing loose docs into those buckets gradually
- keep only enduring, canonical docs at top-level `docs/`

### Risk

Low.

---

## Suggested Implementation Sequence

1. Add `.gitignore` and ignore policy.
2. Remove or relocate temp files, logs, and scratch screenshots.
3. Clean the root directory without touching runtime imports yet.
4. Move app source into `src/`.
5. Re-point build scripts and docs as needed.
6. Separate premium source vs public output.
7. Revisit `mcp/` workspace strategy only after the repo is stable.

This order delivers the biggest clarity improvement early while keeping risk controlled.

---

## Verification Plan

### Required Checks

1. File-count check
   - compare before/after totals
   - confirm the meaningful working set drops sharply after ignore rules
2. Git hygiene check
   - `git status --short` shows intentional path moves only
3. App build check
   - `npm run build`
4. App smoke check
   - run dev server and verify the main icon search UI loads
5. Proof-service check
   - `npm run converter:proof-service`
6. MCP package check
   - start `mcp/index.js` from inside `mcp/`
7. Static asset check
   - verify `public/packs/manifest.json`
   - verify material export manifest still resolves correctly

---

## Rollback Strategy

- Phase 1 and Phase 2 can be rolled back by reverting path and ignore changes.
- Phase 3 should be committed separately so app-source moves can be reverted without losing cleanup work.
- Phase 5 should be committed separately from UI/runtime changes because it affects content pipeline assumptions.

---

## Recommended First PR

Keep the first reorganization PR intentionally narrow:

- add root `.gitignore`
- ignore generated/temp/vendor directories
- move root scratch files into `docs/` or `tmp/`
- do not move runtime source yet

This first PR should solve most of the "59k files" pain immediately and create a clean base for the deeper reorganization.
