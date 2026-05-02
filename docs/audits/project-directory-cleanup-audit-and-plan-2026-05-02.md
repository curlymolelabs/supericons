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

## Execution Checkpoint: Registry Manual Redo Archive

The `data/si-registry/manual-redo` cleanup was reviewed as part of the registry data cleanup pass.

Audit result:

- `data/si-registry/manual-redo` is no longer present in the active tree.
- Git shows `427` tracked `manual-redo` files as removed from the active tree.
- The archived copy exists at `data/si-registry/archive/2026-05-01-pre-supabase-cutover/manual-redo`.
- The archived copy contains `894` files and is approximately `15.39 MB`.

Recommendation:

- Commit the tracked removals for `data/si-registry/manual-redo` as an archive checkpoint.
- Do not move `data/si-registry/automation` in the same commit because many legacy package scripts still reference automation files.
- Clean or deprecate old `manual-redo` and `automation` package scripts in a separate focused pass so command dependencies are not broken silently.

## Execution Checkpoint: Legacy Registry Command Surface

The package command surface was cleaned after the manual redo archive checkpoint.

Audit result:

- `package.json` still exposed old pre-Supabase registry commands for purpose-chip pilots, library rollout batches, editor-review batches, visual-review batches, approved-record promotion, manual redo, screenshot quality, and deterministic redo verification.
- The current registry source-of-truth workflow is Supabase-centered and uses commands such as:
  - `dry-run:registry-supabase-import`
  - `import:registry-supabase`
  - `export:live-registry-supabase`
  - `verify:live-supabase-registry`
  - `pull:registry-review-batch`
  - `verify:registry-review-batch`
  - `apply:registry-review-batch`
  - `snapshot:registry-rollback`
  - `verify:registry-rollback`
- The old script files were left on disk for now.

Change made:

- Removed `86` legacy registry workflow shortcuts from `package.json`.
- Kept current build, Supabase registry, search, MCP, bundle, and product verification commands.
- Did not move `data/si-registry/automation` yet.

Reason:

- This reduces the chance that future work accidentally uses the old deterministic/manual workflow instead of the Supabase workflow.
- It also prepares the repo for a later archive of `data/si-registry/automation` and the matching old script files.
- The script files should be archived in a separate pass after one more dependency check.

## Execution Checkpoint: Registry Automation Archive

The legacy registry automation data was moved after old npm workflow shortcuts were removed.

Moved into `archive/project-cleanup-2026-05-02/data-si-registry-legacy-workflow`:

- `data/si-registry/automation`
- `data/si-registry/staging/supabase-review-batches`

Archive result:

- `automation`: `896` files, approximately `81.24 MB`.
- `staging-supabase-review-batches`: `122` files, approximately `34.49 MB`.

Active tree result:

- `data/si-registry/automation` is no longer present in the active tree.
- `data/si-registry/staging/supabase-review-batches` is no longer present in the active tree.
- Git shows `895` tracked automation deletions. This is expected because the files were moved into ignored archive storage.

Kept in active tree:

- `data/si-registry/source`
- `data/si-registry/generated`
- `data/si-registry/staging/supabase-review-queues`
- `data/si-registry/staging/library-workbench`
- `data/si-registry/registry-manifest.json`

Reason:

- `automation` and old review batches are pre-Supabase workflow evidence, not the current source of truth.
- Current registry maintenance now runs through Supabase import/export/review commands.
- Generated projections and source seed folders need a separate classification pass before any move.

## Execution Checkpoint: Registry Generated Folder Cleanup

The `data/si-registry/generated` folder was reduced to active projection outputs only.

Kept in active tree:

- `free-record-preview.json`
- `premium-record-preview.json`
- `public-record-preview.json`
- `record-preview.json`
- `registry-summary.json`

Moved into `archive/project-cleanup-2026-05-02/data-si-registry-generated-legacy`:

- Old approval summaries.
- Old completion audits.
- Old editor/visual review summaries.
- Old contact sheets.
- Old damage/unmapped/workflow audit reports.
- Old Supabase import snapshot evidence.

Archive result:

- `352` files moved.
- Approximately `63.87 MB` moved into ignored archive storage.

Active tree result:

- `data/si-registry/generated` now contains exactly `5` files.
- Git shows `351` tracked generated-file deletions. This is expected because those files were moved into ignored archive storage.

Reason:

- Current build and verification scripts read/write only the five projection files listed above.
- Historical generated reports are evidence artifacts, not current registry source-of-truth files.
- The active projection files remain dirty and should be handled with the source/manifest cleanup checkpoint because they reflect the current registry projection state.

## Execution Checkpoint: Registry Source Cutover Classification

The registry source-of-truth cutover is now the next safe checkpoint.

Verified active source files:

- `data/si-registry/source/free-pilot.json`
- `data/si-registry/source/purpose-chip-approved.json`
- `data/si-registry/source/libraries/bootstrap.json`
- `data/si-registry/source/libraries/heroicons.json`
- `data/si-registry/source/libraries/iconoir.json`
- `data/si-registry/source/libraries/ionicons.json`
- `data/si-registry/source/libraries/lucide.json`
- `data/si-registry/source/libraries/material.json`
- `data/si-registry/source/libraries/mingcute.json`
- `data/si-registry/source/libraries/phosphor.json`
- `data/si-registry/source/libraries/simpleicons.json`
- `data/si-registry/source/libraries/tabler.json`

Classification:

- `data/si-registry/source` is current registry source data and should be committed.
- `data/si-registry/registry-manifest.json` now points record groups into `data/si-registry/source`.
- `data/si-registry/generated` remains generated projection output and should be committed only for the five active projection files.
- `public/registry/summary.json` and `mcp/public/registry-summary.json` are public/MCP projection summaries and should stay aligned with the generated registry summary.
- `data/si-registry/staging/library-workbench` is rebuildable staging generated from source data, so it should not be committed as durable registry data.
- `data/si-registry/pilot/purpose-chip/approved-records.json` is legacy pilot data and should not be promoted as current truth now that the manifest points to `source/purpose-chip-approved.json`.

Change made:

- Added `data/si-registry/staging/library-workbench/` to `.gitignore` so rebuildable workbench output does not keep appearing as source data.

Reason:

- The main data boundary becomes easier to understand: source files are committed, generated/staging workbench files are rebuildable, and public/MCP JSON remains export output.

## Execution Checkpoint: Registry Pilot Archive

The old purpose-chip pilot folder was moved after the registry manifest had been repointed to `data/si-registry/source`.

Moved into `archive/project-cleanup-2026-05-02/data-si-registry-legacy-pilot`:

- `data/si-registry/pilot`

Archive result:

- `35` files moved.
- Approximately `1.26 MB` moved into ignored archive storage.

Package script cleanup:

- Removed `estimate:purpose-chip-single-model-batch-tokens`.
- Removed `seed:purpose-chip-material-coverage`.

Reason:

- The pilot folder was a historical seed/review workflow, not the current registry source of truth.
- The active approved material records now live under `data/si-registry/source`.
- Removing the old npm shortcuts reduces the chance of accidentally rebuilding from stale pilot data.

## Execution Checkpoint: One-Off Script Archive

Untracked scripts were classified by whether `package.json` still calls them.

Moved into `archive/project-cleanup-2026-05-02/one-off-scripts`:

- `scripts/audit-registry-replacement-candidates.mjs`
- `scripts/heroicons-bulk-upgrade-depicts.mjs`
- `scripts/isolate-si-registry-source.mjs`
- `scripts/verify-screenshot-capture-completion.mjs`

Kept in active tree:

- Supabase import/export/review scripts still called by `package.json`.
- Registry source-boundary and rollback scripts still called by `package.json`.
- Current polish/repair scripts still called by `package.json`.

Reason:

- The moved scripts are not exposed through npm commands and appear to be one-off recovery or verification helpers.
- Keeping only package-called scripts in the active scripts folder makes the workflow easier to understand.

## Execution Checkpoint: Internal Plan Draft Archive

Untracked plan drafts under `docs/superpowers/plans` were moved into ignored archive storage instead of being promoted as durable public docs.

Moved into `archive/project-cleanup-2026-05-02/internal-plan-drafts`:

- `docs/superpowers/plans/2026-04-30-light-preview-color-fix.md`
- `docs/superpowers/plans/2026-04-30-phosphor-completion-audit-report.html`
- `docs/superpowers/plans/2026-04-30-phosphor-completion-audit-report.md`
- `docs/superpowers/plans/2026-05-01-heroicons-depicts-bulk-pass.md`
- `docs/superpowers/plans/2026-05-01-live-registry-depicts-recovery-plan.md`
- `docs/superpowers/plans/2026-05-01-registry-source-of-truth-and-projection-cleanup-plan.md`
- `docs/superpowers/plans/2026-05-01-registry-supabase-cutover-cleanup-plan.md`
- `docs/superpowers/plans/2026-05-01-search-engine-registry-metadata-enhancement.md`
- `docs/superpowers/plans/2026-05-01-semantic-registry-refactor-and-recovery-plan.md`
- `docs/superpowers/plans/2026-05-01-si-registry-source-isolation-plan.md`
- `docs/superpowers/plans/2026-05-01-supabase-registry-migration-and-data-cleanup-plan.md`

Reason:

- These are useful local operational drafts, but they include worker-oriented planning language.
- The public-facing registry docs are now under `docs/registry`.
- The audit files remain under `docs/audits`.

## Execution Checkpoint: Screenshot Capture Exception Data

One file from the archived registry automation folder is still needed by the screenshot capture tooling.

Copied into active data:

- `data/screenshot-capture/material-screenshot-capture-exceptions.json`

Updated reader:

- `lib/screenshot-capture/material-browser-fallback.js`

Reason:

- Screenshot capture exception data is not registry source data.
- Keeping it under `data/screenshot-capture` avoids bringing the old `data/si-registry/automation` folder back into the active tree.
