# Project Directory Cleanup Audit and Plan

Date: 2026-05-02

## Goal

Clean up the Supericons project directory without breaking the website, MCP package, Supabase-backed registry workflow, or current public registry exports.

The cleanup must reduce confusion by separating:

- core product files that must stay active
- registry source and export files that must stay protected
- generated files that can be rebuilt
- historical workflow evidence that can be archived
- local scratch files that can be deleted or moved out of the working tree

## Current Verified State

This audit was run from:

`D:\Personal\Business\Curly Mole Labs\Experiments\Apps\DailySprint\supericons`

Latest commit at audit time:

`a7a8dbc0 Checkpoint semantic registry visual quality cleanup`

Registry projection verification still passes:

`npm run verify:si-registry` returned `verify-si-registry-projections: ok`.

Two summary projection files are currently dirty:

- `public/registry/summary.json`
- `mcp/public/registry-summary.json`

That means cleanup must not assume the tree is fully stable until those summary files are either accepted, regenerated, or intentionally reverted by a separate decision.

## Top-Level Directory Inventory

Verified top-level size and dirty-file hotspots:

| Path | Files | Size | Tracked files | Dirty entries | Classification |
| --- | ---: | ---: | ---: | ---: | --- |
| `.git` | 66,831 | 482.75 MB | 0 | 0 | Git internals. Do not touch. |
| `archive` | 24,536 | 460.93 MB | 0 | 0 | Ignored archive area. Keep as destination for cleanup evidence. |
| `node_modules` | 94,315 | 434.71 MB | 0 | 0 | Local dependency install. Regenerable with `npm ci`; do not commit. |
| `data` | 2,342 | 270.22 MB | 1,722 | 471 | Registry workflow data. Needs careful cleanup. |
| `output` | 31,539 | 82.12 MB | 14,771 | 16,777 | Screenshot/generated output. Largest dirty hotspot. |
| `mcp` | 3,418 | 44.17 MB | 26 | 1 | MCP package. Core. |
| `public` | 8,443 | 36.71 MB | 557 | 3,976 | Public runtime assets. Needs careful cleanup. |
| `dist` | 156 | 27.48 MB | 0 | 0 | Build output. Ignored and regenerable. |
| `tmp` | 122 | 11.08 MB | 0 | 0 | Temporary files. Ignored and removable after safety snapshot. |
| `docs` | 416 | 5.48 MB | 393 | 18 | Project docs and audits. Keep useful docs; archive stale scratch docs later. |
| `scripts` | 347 | 1.61 MB | 143 | 27 | Operational scripts. Core, but needs later workflow pruning. |
| `strategy` | 51 | 1.46 MB | 51 | 0 | Product/strategy docs. Keep unless owner wants a separate docs cleanup. |
| `plans` | 128 | 1.12 MB | 128 | 0 | Project plans. Keep unless owner wants a separate docs cleanup. |
| `tools` | 9 | 0.71 MB | 7 | 0 | Tooling. Keep. |
| `premium` | 329 | 0.54 MB | 329 | 0 | Premium icon assets. Keep. |
| `supabase` | 64 | 0.44 MB | 51 | 4 | Database migrations/functions. Core. |
| `lib` | 43 | 0.35 MB | 42 | 2 | Shared code. Core. |
| `brand` | 19 | 0.28 MB | 19 | 0 | Brand assets. Keep. |
| `.agents` | 32 | 0.13 MB | 0 | 0 | Local agent metadata. Ignored. |
| `.playwright-mcp` | 6 | 0.10 MB | 0 | 0 | Local browser automation state. Ignored and removable. |
| `tests` | 9 | 0.01 MB | 8 | 1 | Tests. Core. |
| `.vscode` | 1 | 0 MB | 0 | 0 | Local editor settings. Ignored. |

## Core Product and Working Folders

These should remain active in the main project directory.

### Website Runtime

- `index.html`
- `admin.html`
- `main.js`
- `store.js`
- `style.css`
- `auth.js`
- `docs-pages.js`
- `landing-effects.js`
- `material-export.js`
- `sidebar-icons.js`
- `favicon.svg`
- `vite.config.js`
- `netlify.toml`
- `package.json`
- `package-lock.json`
- `.env.example`
- `.gitignore`

### Source Code and Tests

- `lib`
- `scripts`
- `tests`
- `tools`
- `supabase`

Some scripts are now legacy registry workflow scripts, but they should not be deleted until their replacements are confirmed and the package scripts are cleaned in a separate pass.

### Public Runtime Assets

- `public/registry`
- `public/mcp`
- `public/packs`
- `public/docs`
- `public/scripts`
- `public/icon-index.json`
- `public/icon-index-solid.json`
- `public/icon-taxonomy.json`
- `public/synonyms.json`
- `public/material-export-manifest.json`
- `public/material-export`

`public/material-export` is messy and dirty, but it is inside the public runtime tree. It must be audited against `public/material-export-manifest.json` before anything is archived from it.

### MCP Package

- `mcp`
- `mcp/public/registry-records.json`
- `mcp/public/registry-summary.json`

The MCP package intentionally has its own public projection files because the package needs local bundled data. The source of truth should still be Supabase plus controlled exports, not hand-edited duplicate registry files.

### Registry Source and Current Export Boundary

Active registry boundary:

- Supabase live tables
- `data/si-registry/source`
- `data/si-registry/registry-manifest.json`
- `data/si-registry/controlled-vocabularies.json`
- `data/si-registry/visibility-model.json`
- `data/si-registry/staging/supabase-review-queues/registry-review-queue-snapshot.json`
- `public/registry/records.json`
- `public/registry/summary.json`
- `mcp/public/registry-records.json`
- `mcp/public/registry-summary.json`

These files and folders should not be treated as disposable temp output.

## Cleanup Candidates

### High Confidence: Archive or Remove

These are not core runtime source and are safe cleanup candidates after a rollback snapshot.

- `tmp`
- `.playwright-mcp`
- `dist`
- root scratch files:
  - `temp-batch-082-output.json`
  - `temp-batch-083-output.json`
  - `temp-batch-084-output.json`
  - `temp-batch-085-output.json`
  - `tmp-material-classification.json`
  - `tmp-material-upstream-icons.json`

Recommended action:

- remove ignored local temp/build folders
- move root scratch JSON files into `archive/project-cleanup-2026-05-02/root-scratch`
- do not commit archive contents because `archive` is ignored

### Medium Confidence: Archive After Verification

These are large or dirty and likely no longer part of the active source of truth, but they include tracked files or workflow evidence.

- `output/icon_screenshot`
- `data/si-registry/manual-redo`
- `data/si-registry/automation`
- `data/si-registry/staging/supabase-review-batches`
- older generated review outputs inside `data/si-registry/generated`

Recommended action:

- archive first
- commit tracked deletions only after verification passes
- update `.gitignore` to prevent regenerated screenshots and review batches from returning

### Needs Separate Audit Before Cleanup

These are dirty but may be active runtime or operational files.

- `public/material-export`
- `scripts`
- `lib`
- `supabase`
- `tests`
- `commands.md`
- `style.css`
- `package-lock.json`

Recommended action:

- inspect each change
- classify as product change, registry workflow change, or scratch
- only archive/delete after confirming whether the change is intentional

## Why the Current Mess Happened

The registry work created several kinds of artifacts in the same repo:

- source records and seed files
- public JSON exports
- MCP JSON exports
- Supabase import/export snapshots
- review queues
- batch files
- screenshot evidence
- generated previews
- historical recovery files

Because many generated or evidence files were tracked by Git, later cleanup became confusing. Some folders now contain a mixture of source, generated cache, review evidence, and stale workflow output.

The fix is not just deleting files. The fix is defining folder roles and enforcing them with scripts, `.gitignore`, and verification gates.

## Target Folder Model

Recommended long-term structure:

```text
data/
  si-registry/
    source/                 # local seed/source import files only
    archive/                # ignored historical evidence and rollback packs
    staging/                # short-lived generated review queues only
    generated/              # regenerated outputs only, minimized over time

public/
  registry/                 # website registry export
  mcp/                      # public MCP metadata files used by browser/site
  packs/                    # public icon pack assets
  material-export/          # public material export assets, only if runtime needs them

mcp/
  public/                   # bundled MCP registry export

output/                     # local QA screenshots only; should be ignored

archive/                    # repo-level ignored cleanup archives
```

## Implementation Plan

### Phase 0: Safety Gate

- [ ] Run `npm run verify:si-registry`.
- [ ] Run `node --env-file=.env.local scripts/verify-live-supabase-registry-state.mjs`.
- [ ] Run `npm run snapshot:registry-rollback`.
- [ ] Run `npm run verify:registry-rollback`.
- [ ] Record the rollback snapshot hash in the cleanup commit message.
- [ ] Create ignored archive root: `archive/project-cleanup-2026-05-02`.

Expected result:

- registry projections verify
- live Supabase registry verifies
- rollback snapshot verifies
- no files have been moved yet

### Phase 1: Resolve Current Registry Projection Dirt

- [ ] Inspect `public/registry/summary.json`.
- [ ] Inspect `mcp/public/registry-summary.json`.
- [ ] If both are expected outputs from the latest Supabase export, keep them.
- [ ] If they are stale or accidental, regenerate from the correct export command.
- [ ] Run `npm run verify:si-registry`.

Expected result:

- registry summary changes are intentional and explainable
- `public/registry` and `mcp/public` remain synchronized

### Phase 2: Archive Root Scratch and Ignored Local Output

- [ ] Move root scratch JSON files into `archive/project-cleanup-2026-05-02/root-scratch`.
- [ ] Delete or archive `tmp`.
- [ ] Delete or archive `.playwright-mcp`.
- [ ] Delete `dist` because it is build output and can be regenerated.
- [ ] Run `git status --short`.

Expected result:

- root directory becomes easier to scan
- ignored temp/build folders are gone or moved to ignored archive
- no source/runtime files are touched

### Phase 3: Archive Screenshot Output

- [ ] Move `output/icon_screenshot` into `archive/project-cleanup-2026-05-02/output-icon-screenshot`.
- [ ] Move any other one-off screenshot/sample files in `output` into the same archive.
- [ ] Add `output/icon_screenshot/` to `.gitignore`.
- [ ] Run `git status --short -- output .gitignore`.

Expected result:

- dirty `output` entries are gone from the active workspace
- tracked screenshot deletions are visible and intentional
- future screenshot runs do not pollute Git status

### Phase 4: Archive Legacy Registry Workflow Evidence

- [ ] Extend `scripts/archive-si-registry-workflow-artifacts.mjs` so it handles more than `data/si-registry/manual-redo`.
- [ ] Dry-run the archive script.
- [ ] Archive:
  - `data/si-registry/manual-redo`
  - `data/si-registry/automation`
  - `data/si-registry/staging/supabase-review-batches`
  - obsolete generated review files inside `data/si-registry/generated`
- [ ] Keep:
  - `data/si-registry/source`
  - `data/si-registry/registry-manifest.json`
  - `data/si-registry/controlled-vocabularies.json`
  - `data/si-registry/visibility-model.json`
  - current Supabase review queue snapshot
  - current public and MCP registry projections
- [ ] Run `npm run verify:si-registry`.
- [ ] Run `node --env-file=.env.local scripts/verify-live-supabase-registry-state.mjs`.

Expected result:

- old workflow evidence leaves the active tree
- source and exports remain intact
- registry checks still pass

### Phase 5: Audit `public/material-export`

- [ ] Read `public/material-export-manifest.json`.
- [ ] Compare manifest-listed files against files under `public/material-export`.
- [ ] Identify unlisted files.
- [ ] Identify dirty tracked files.
- [ ] Run `npm run build:material-export-manifest`.
- [ ] Run `npm run build` if material export changes are made.

Expected result:

- only runtime-needed material export assets stay in `public`
- stale generated material files are archived or removed
- site build still works

### Phase 6: Review Smaller Dirty Source Areas

- [ ] Review `commands.md` and decide whether it is active documentation or scratch command history.
- [ ] Review `style.css`.
- [ ] Review `package-lock.json`.
- [ ] Review dirty `lib` files.
- [ ] Review dirty `scripts` files.
- [ ] Review dirty `supabase` files.
- [ ] Review dirty `tests` files.

Expected result:

- intentional product/workflow changes are committed
- scratch changes are archived or reverted only with explicit owner approval
- no unrelated source changes remain unexplained

### Phase 7: Final Verification

- [ ] Run `npm run verify:si-registry`.
- [ ] Run `node --env-file=.env.local scripts/verify-live-supabase-registry-state.mjs`.
- [ ] Run `npm run build`.
- [ ] Run `git status --short`.

Expected result:

- core checks pass
- build passes
- remaining dirty files are either intended product changes or documented follow-up work

### Phase 8: Commit Cleanup

- [ ] Commit `.gitignore` changes.
- [ ] Commit tracked deletions for archived generated/evidence files.
- [ ] Commit any cleanup script updates.
- [ ] Do not commit ignored archive contents.

Suggested commit message:

`Clean up legacy registry workflow artifacts`

## Recommended Execution Order

Do not start with `public/material-export`. It is inside the public runtime tree and needs a manifest check first.

Start with:

1. Phase 0 safety gate
2. Phase 1 projection dirt check
3. Phase 2 root scratch cleanup
4. Phase 3 screenshot output archive

Then pause and review `git status --short` before touching `data/si-registry/automation`, `data/si-registry/generated`, or `public/material-export`.

## Important Guardrails

- Do not edit `.env.local`.
- Do not commit secrets.
- Do not delete `node_modules` unless the owner wants disk cleanup; it is not a Git cleanliness problem.
- Do not delete `archive`; it is ignored and currently holds historical evidence.
- Do not hand-edit `public/registry/records.json` or `mcp/public/registry-records.json`.
- Do not clean `public/material-export` until the manifest comparison is complete.
- Do not remove old registry scripts until package scripts and replacement workflows are audited.

## Execution Checkpoint: 2026-05-02

The first cleanup slice was executed as a reorganization-only move. Files were moved into the ignored archive area instead of being deleted from disk.

Safety checks completed before moving files:

- `npm run verify:si-registry` passed.
- `node --env-file=.env.local scripts/verify-live-supabase-registry-state.mjs` passed with zero open quality findings and zero open review queue rows.
- `npm run snapshot:registry-rollback` created rollback snapshot `data\si-registry\archive\rollback-snapshots\latest-registry-rollback-snapshot.json`.
- `npm run verify:registry-rollback` passed.
- Rollback aggregate sha256: `4e23871a11802bebb9a992b3c9ae188833e7244dc7506e07c2692e573ea93452`.

Projection check:

- `public/registry/summary.json` and `mcp/public/registry-summary.json` were confirmed as matching generated summary changes from `13939` to `15103` public records.
- `npm run verify:si-registry` passed after this check.

Moved into `archive/project-cleanup-2026-05-02`:

- `root-scratch`: 6 root scratch JSON files.
- `local-generated-output`: `tmp`, `dist`, and `.playwright-mcp`.
- `output`: `output/icon_screenshot` and `output/tmp-phosphor-latest-sample-sheet.png`.

Ignore rule added:

- `output/icon_screenshot/`

Verification after the move:

- `npm run verify:si-registry` passed.
- `node --env-file=.env.local scripts/verify-live-supabase-registry-state.mjs` passed with zero open quality findings and zero open review queue rows.

Expected Git status effect:

- `output/icon_screenshot` now appears as tracked deletions because the files were moved into ignored archive storage.
- The physical files still exist under `archive/project-cleanup-2026-05-02/output/icon_screenshot`.
- The next cleanup decision is whether to commit those tracked removals and keep screenshot evidence only in ignored archive storage.

## Execution Checkpoint: Material Export Cleanup

The `public/material-export` cleanup was executed as a reorganization-only move. Files were moved into the ignored archive area instead of being deleted from disk.

Audit result before moving files:

- `public/material-export-manifest.json` declares `118` owned static material export entries.
- `public/material-export` contained `8004` files.
- `118` manifest-listed files were present.
- `0` manifest-listed files were missing.
- `7886` files were not listed in the manifest.
- Git status showed `3975` dirty untracked material export entries.

Moved into `archive/project-cleanup-2026-05-02/public-material-export-extra`:

- `7886` non-manifest material SVG files.

Result after moving files:

- `public/material-export` contains exactly `118` files.
- `118` manifest-listed files are present.
- `0` manifest-listed files are missing.
- `0` non-manifest files remain in `public/material-export`.
- `archive/project-cleanup-2026-05-02/public-material-export-extra` contains `7886` files.

Verification after the move:

- `npm run build:material-export-manifest` completed and wrote `118` owned entries.
- `npm run verify:si-registry` passed.
- `git status --short -- public/material-export public/material-export-manifest.json` returned no dirty entries after refreshing the manifest file.
