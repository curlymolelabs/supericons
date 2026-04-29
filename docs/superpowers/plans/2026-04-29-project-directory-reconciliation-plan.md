# Project Directory Reconciliation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Centralize the authoritative Supericons repo state into the main project directory, remove dependence on the linked Codex worktree, and quarantine scratch or non-portable artifacts into a repo-local archive without breaking the registry, MCP, or screenshot-quality workflows.

**Architecture:** Use Git history as the source of truth for committed repo content and move the main project directory onto a new non-worktree branch based on the verified rescue head `4781534`. Rescue the small set of uncommitted keeper source files from the linked worktree with hash-verified copies, regenerate derived assets in the main project directory, and archive scratch or non-portable artifacts under a new ignored `archive/` root so the project folder stays self-contained and saveable.

**Tech Stack:** Git, PowerShell, Node.js, Vite, screenshot-quality workflow scripts, MCP registry artifacts, JSON and HTML generated review outputs.

---

## Verified Audit Facts

- Main checkout: `D:\Personal\Business\Curly Mole Labs\Experiments\Apps\DailySprint\supericons`
  - branch `master`
  - HEAD `e98ba1a`
  - `public/registry/records.json` is absent
  - `package.json` does not contain the screenshot-quality command surface
  - `git ls-files --others --exclude-standard` returned `21` untracked paths
- Linked checkout: `C:\Users\guanh\.codex\worktrees\e455\supericons`
  - branch `codex/mingcute-recovery-rescue-20260429`
  - HEAD `4781534`
  - `public/registry/records.json` exists there
  - `package.json` contains the screenshot-quality command surface
  - `git status --short` shows `120` modified tracked entries and `5881` collapsed untracked entries
  - `git ls-files --others --exclude-standard` returned `21020` untracked paths
- `output/icon_screenshot/` is active workflow input and is referenced by:
  - `data/si-registry/*`
  - `scripts/screenshot-quality-workflow.mjs`
  - `scripts/build-mingcute-screenshot-quality-checklist.mjs`
  - `tests/screenshot-quality/review-packet.test.mjs`
- `output/qa/`, `output/qa-spotcheck/`, `output/tmp-*`, and root `batch-*.png` / `qa-*.png` scratch files were not found in active code references during this audit.
- `38` HTML files under `docs/superpowers/plans/` in the linked checkout embed absolute `file:///C:/Users/guanh/.codex/worktrees/e455/supericons/...` paths and are not portable.
- The linked checkout contains uncommitted keeper source files that active code already references:
  - `scripts/build-redo-progress-checklists.mjs`
  - `scripts/verify-mcp-variant-access.mjs`
  - `lib/screenshot-quality/unmapped-diagnosis.js`
  - `lib/screenshot-quality/unmapped-review.js`
  - `mcp/variant-support.js`
- The linked checkout also contains `mcp/public/icon-index-solid.json` as an uncommitted derived file. This should be regenerated in the centralized main checkout, not manually curated.

### Task 1: Create Archive Guardrails And Audit Manifests

**Files:**
- Modify: `.gitignore`
- Create: `archive/repo-reconciliation/2026-04-29/README.md`
- Create: `archive/repo-reconciliation/2026-04-29/main-checkout-status.txt`
- Create: `archive/repo-reconciliation/2026-04-29/linked-worktree-status.txt`
- Create: `archive/repo-reconciliation/2026-04-29/worktree-list.txt`
- Create: `archive/repo-reconciliation/2026-04-29/main-root-inventory.txt`
- Create: `archive/repo-reconciliation/2026-04-29/linked-root-inventory.txt`

- [ ] **Step 1: Extend `.gitignore` so the archive and recurring scratch locations stop polluting `git status`**

Append these exact lines to `.gitignore`:

```gitignore
archive/
.playwright-cli/
.playwright-mcp/
.roo/
batch-*.png
qa-*.png
tmp-batch-review/
tmp-review-*/
mingcute-remaining-page-*.png
output/qa/
output/qa-spotcheck/
output/tmp-*/
```

- [ ] **Step 2: Create the archive directory scaffold inside the project directory**

Run:

```powershell
New-Item -ItemType Directory -Force `
  'archive/repo-reconciliation/2026-04-29', `
  'archive/repo-reconciliation/2026-04-29/main-root-temp', `
  'archive/repo-reconciliation/2026-04-29/linked-worktree', `
  'archive/repo-reconciliation/2026-04-29/keeper-file-backups', `
  'archive/repo-reconciliation/2026-04-29/nonportable-review-html' | Out-Null
```

Expected: no errors, and all five directories exist under `archive/repo-reconciliation/2026-04-29/`.

- [ ] **Step 3: Save machine-readable manifests before any files move**

Run:

```powershell
git worktree list --porcelain > 'archive/repo-reconciliation/2026-04-29/worktree-list.txt'
git status --short --branch > 'archive/repo-reconciliation/2026-04-29/main-checkout-status.txt'
git -C 'C:\Users\guanh\.codex\worktrees\e455\supericons' status --short --branch > 'archive/repo-reconciliation/2026-04-29/linked-worktree-status.txt'
Get-ChildItem -Force . | Select-Object Mode,LastWriteTime,Length,Name | Out-String -Width 4096 > 'archive/repo-reconciliation/2026-04-29/main-root-inventory.txt'
Get-ChildItem -Force 'C:\Users\guanh\.codex\worktrees\e455\supericons' | Select-Object Mode,LastWriteTime,Length,Name | Out-String -Width 4096 > 'archive/repo-reconciliation/2026-04-29/linked-root-inventory.txt'
```

Expected:
- `worktree-list.txt` names both the main checkout and the linked checkout
- `main-checkout-status.txt` shows the current `master` state
- `linked-worktree-status.txt` captures the dirty linked checkout before cleanup

- [ ] **Step 4: Write a short archive README that explains what this folder is preserving**

Create `archive/repo-reconciliation/2026-04-29/README.md` with this exact content:

```md
# Repo Reconciliation Archive

This folder preserves pre-cleanup manifests, scratch artifacts, non-portable review files, and linked-worktree residue from the April 29, 2026 project-directory reconciliation.

The active codebase must stay outside this folder.

Anything here is archive-only unless it is explicitly promoted back into tracked repo paths.
```

### Task 2: Clear Safe Loose Clutter From The Current Main Checkout

**Files:**
- Move: `.playwright-cli/`
- Move: `.playwright-mcp/`
- Move: `.tmp-mcp-publish-check/`
- Move: root `.tmp-*` files
- Move: `mingcute-remaining-page-01.png`
- Move: `mingcute-remaining-page-02.png`
- Move: `mingcute-remaining-page-03.png`
- Move: `mingcute-remaining-page-04.png`
- Move: `tmp-batch-004-review.png`
- Move: `tmp-batch-005-review.png`
- Move: `tmp-batch-006-review.png`
- Move: `preview.log`
- Move: `vite-dev.err.log`
- Move: `vite-dev.log`
- Keep in place: `.env.local`
- Keep in place: `supabase/.env.local`

- [ ] **Step 1: Move the current main-checkout scratch files into the new archive**

Run:

```powershell
$root = 'D:\Personal\Business\Curly Mole Labs\Experiments\Apps\DailySprint\supericons'
$archive = Join-Path $root 'archive\repo-reconciliation\2026-04-29\main-root-temp'

@(
  '.playwright-cli',
  '.playwright-mcp',
  '.tmp-mcp-publish-check'
) | ForEach-Object {
  $p = Join-Path $root $_
  if (Test-Path $p) { Move-Item -LiteralPath $p -Destination $archive }
}

Get-ChildItem -LiteralPath $root -File | Where-Object {
  $_.Name -like '.tmp-*' -or
  $_.Name -like 'tmp-batch-*-review.png' -or
  $_.Name -like 'mingcute-remaining-page-*.png' -or
  $_.Name -like '*.log' -or
  $_.Name -like '*.err.log'
} | Move-Item -Destination $archive
```

Expected:
- the scratch files leave the repo root
- `.env.local` and `supabase/.env.local` remain untouched

- [ ] **Step 2: Verify the main checkout is clean enough to switch branches safely**

Run:

```powershell
git status --short
```

Expected:
- no tracked-file modifications
- only intentionally preserved local env files may remain untracked

- [ ] **Step 3: Save a text manifest of the preserved local env files without moving them**

Run:

```powershell
@(
  '.env.local',
  'supabase/.env.local'
) | Out-File -Encoding utf8 'archive/repo-reconciliation/2026-04-29/preserved-local-env-files.txt'
```

Expected: `preserved-local-env-files.txt` contains the two env file paths and nothing else.

### Task 3: Centralize The Authoritative Rescue Head Into The Main Project Directory

**Files:**
- Create in the main checkout branch: `public/registry/records.json`
- Create in the main checkout branch: `public/registry/summary.json`
- Create in the main checkout branch: `tests/screenshot-quality/`
- Create in the main checkout branch: `output/`
- Copy into the main checkout branch: `scripts/build-redo-progress-checklists.mjs`
- Copy into the main checkout branch: `scripts/verify-mcp-variant-access.mjs`
- Copy into the main checkout branch: `lib/screenshot-quality/unmapped-diagnosis.js`
- Copy into the main checkout branch: `lib/screenshot-quality/unmapped-review.js`
- Copy into the main checkout branch: `mcp/variant-support.js`
- Regenerate in the main checkout branch: `mcp/public/icon-index-solid.json`

- [ ] **Step 1: Create a new main-checkout branch at the committed rescue head**

Run:

```powershell
git branch --list codex/reconcile-main-directory-20260429
git switch -c codex/reconcile-main-directory-20260429 4781534
```

Expected:
- the first command returns no output
- the second command reports `Switched to a new branch 'codex/reconcile-main-directory-20260429'`

- [ ] **Step 2: Verify the new branch brings the committed rescue tree into the main project directory**

Run:

```powershell
Get-Item 'public/registry/records.json','public/registry/summary.json','tests/screenshot-quality','output','package.json' | Select-Object FullName,Length,LastWriteTime
```

Expected:
- both `public/registry` files exist
- `tests/screenshot-quality/` exists
- `output/` exists

- [ ] **Step 3: Back up and promote the five uncommitted keeper source files from the linked worktree**

Run:

```powershell
$main = 'D:\Personal\Business\Curly Mole Labs\Experiments\Apps\DailySprint\supericons'
$linked = 'C:\Users\guanh\.codex\worktrees\e455\supericons'
$backup = Join-Path $main 'archive\repo-reconciliation\2026-04-29\keeper-file-backups'
$paths = @(
  'scripts/build-redo-progress-checklists.mjs',
  'scripts/verify-mcp-variant-access.mjs',
  'lib/screenshot-quality/unmapped-diagnosis.js',
  'lib/screenshot-quality/unmapped-review.js',
  'mcp/variant-support.js'
)

foreach ($relative in $paths) {
  $src = Join-Path $linked $relative
  $bak = Join-Path $backup $relative
  $dst = Join-Path $main $relative

  New-Item -ItemType Directory -Force (Split-Path $bak) | Out-Null
  New-Item -ItemType Directory -Force (Split-Path $dst) | Out-Null

  Copy-Item -LiteralPath $src -Destination $bak -Force
  Copy-Item -LiteralPath $src -Destination $dst -Force

  $srcHash = (Get-FileHash -Algorithm SHA256 $src).Hash
  $dstHash = (Get-FileHash -Algorithm SHA256 $dst).Hash
  if ($srcHash -ne $dstHash) { throw "Hash mismatch after copying $relative" }
}
```

Expected:
- all five files now exist in the main checkout
- no hash mismatch is thrown

- [ ] **Step 4: Install dependencies and regenerate the derived MCP solid index**

Run:

```powershell
npm install
npm run build:motion-lab-mcp-artifacts
Get-Item 'mcp/public/icon-index-solid.json' | Select-Object FullName,Length,LastWriteTime
```

Expected:
- `npm install` completes successfully
- `mcp/public/icon-index-solid.json` exists after the build step

- [ ] **Step 5: Verify the centralized main checkout with the commands that matter for the current registry state**

Run:

```powershell
npm run screenshot-quality -- completion-status --library mingcute --json
npm run screenshot-quality -- audit-quality --final-records data/si-registry/automation/mingcute/approved-records.json
npm run screenshot-quality -- audit-quality --final-records data/si-registry/automation/simpleicons/approved-records.json
npm run screenshot-quality -- audit-quality --final-records data/si-registry/automation/lucide/approved-records.json
npm run screenshot-quality -- audit-quality --final-records data/si-registry/automation/tabler/approved-records.json
npm run verify:screenshot-quality-workflow -- --library mingcute
npm run verify:mingcute-approved-records
npm run verify:si-registry
```

Expected:
- Mingcute `issue_count: 0` and `blocker_count: 0`
- Simple Icons, Lucide, and Tabler each report `issue_count: 0` and `blocker_count: 0`
- the verify commands pass from the main project directory

### Task 4: Quarantine The Dirty Linked Worktree Before It Is Removed

**Files:**
- Create: `archive/repo-reconciliation/2026-04-29/linked-worktree/linked-worktree-dirty.patch`
- Create: `archive/repo-reconciliation/2026-04-29/linked-worktree/linked-worktree-untracked.txt`
- Create: `archive/repo-reconciliation/2026-04-29/linked-worktree/linked-worktree-modified-tracked.txt`
- Move or copy into archive: linked-worktree scratch outputs, non-portable review HTML, and unneeded QA artifacts

- [ ] **Step 1: Capture the dirty tracked diff from the linked worktree as a patch**

Run:

```powershell
git -C 'C:\Users\guanh\.codex\worktrees\e455\supericons' diff > 'archive/repo-reconciliation/2026-04-29/linked-worktree/linked-worktree-dirty.patch'
git -C 'C:\Users\guanh\.codex\worktrees\e455\supericons' status --short --untracked-files=no > 'archive/repo-reconciliation/2026-04-29/linked-worktree/linked-worktree-modified-tracked.txt'
git -C 'C:\Users\guanh\.codex\worktrees\e455\supericons' ls-files --others --exclude-standard > 'archive/repo-reconciliation/2026-04-29/linked-worktree/linked-worktree-untracked.txt'
```

Expected:
- all three files are written
- the patch preserves the `120` modified tracked entries for later forensic review

- [ ] **Step 2: Archive the clearly scratch-only linked-worktree root artifacts into the main project directory**

Run:

```powershell
$main = 'D:\Personal\Business\Curly Mole Labs\Experiments\Apps\DailySprint\supericons'
$linked = 'C:\Users\guanh\.codex\worktrees\e455\supericons'
$archive = Join-Path $main 'archive\repo-reconciliation\2026-04-29\linked-worktree'

@(
  'batch-035-bottom.png',
  'batch-035-mid1.png',
  'batch-035-mid2.png',
  'batch-035-review-full.png',
  'batch-035-top.png',
  'batch-036-bottom.png',
  'batch-036-mid1.png',
  'batch-036-mid2.png',
  'batch-036-top.png',
  'batch-037-bottom.png',
  'batch-037-mid1.png',
  'batch-037-mid2.png',
  'batch-037-snapshot-top.md',
  'batch-037-top.png',
  'batch-038-bottom.png',
  'batch-038-mid1.png',
  'batch-038-mid2.png',
  'batch-038-top.png',
  'batch-039-grid.png',
  'batch-040-grid.png',
  'batch-041-grid.png',
  'batch-042-grid.png',
  'batch-043-grid.png',
  'batch-044-grid.png',
  'batch-045-grid.png',
  'batch-046-grid.png',
  'batch-047-grid.png',
  'qa-036-grid.png',
  'qa-037-grid.png',
  'qa-038-grid.png',
  'qa-039-grid.png',
  'qa-040-grid.png',
  'qa-041-grid.png',
  'qa-simpleicons-batch-001-sample.png',
  'qa-simpleicons-batch-002-sample.png',
  'qa-simpleicons-batch-003-sample.png',
  'qa-simpleicons-batch-007-009-sample.png',
  'qa-simpleicons-batch-013-015-sample.png',
  'qa-substack-subtitle.png',
  'test-small.txt',
  'test.txt',
  'tmp-batch-004-ids.json',
  'brand/factsheet.html',
  'brand/factsheet.md',
  '.roo'
) | ForEach-Object {
  $src = Join-Path $linked $_
  if (Test-Path $src) {
    $dst = Join-Path $archive $_
    New-Item -ItemType Directory -Force (Split-Path $dst) | Out-Null
    Copy-Item -LiteralPath $src -Destination $dst -Recurse -Force
  }
}
```

Expected:
- the scratch artifacts are preserved under `archive/repo-reconciliation/2026-04-29/linked-worktree/`
- nothing active in the main checkout depends on those archived copies

- [ ] **Step 3: Archive the linked-worktree `output/qa*` and `output/tmp-*` evidence instead of keeping it live**

Run:

```powershell
$main = 'D:\Personal\Business\Curly Mole Labs\Experiments\Apps\DailySprint\supericons'
$linked = 'C:\Users\guanh\.codex\worktrees\e455\supericons'
$archive = Join-Path $main 'archive\repo-reconciliation\2026-04-29\linked-worktree\output'

@(
  'output/qa',
  'output/qa-spotcheck',
  'output/tmp-batch-017-sheets',
  'output/tmp-batch-018-spotcheck',
  'output/tmp-visual-checks',
  'output/mingcute-random-spot-check-2026-04-24.html',
  'output/mingcute-random-spot-check-2026-04-24.png',
  'output/batch-013-icons.txt'
) | ForEach-Object {
  $src = Join-Path $linked $_
  if (Test-Path $src) {
    $dst = Join-Path $archive ($_ -replace '^output[\\/]', '')
    New-Item -ItemType Directory -Force (Split-Path $dst) | Out-Null
    Copy-Item -LiteralPath $src -Destination $dst -Recurse -Force
  }
}
```

Expected:
- `output/icon_screenshot/` stays active in the main checkout
- the non-referenced `output/qa*` and `output/tmp-*` material is preserved only in the archive

- [ ] **Step 4: Archive the `38` non-portable HTML review files that embed absolute linked-worktree paths**

Run:

```powershell
$main = 'D:\Personal\Business\Curly Mole Labs\Experiments\Apps\DailySprint\supericons'
$linked = 'C:\Users\guanh\.codex\worktrees\e455\supericons'
$archive = Join-Path $main 'archive\repo-reconciliation\2026-04-29\nonportable-review-html'

git -C $linked grep -l "file:///C:/Users/guanh/.codex/worktrees/e455/supericons/" -- docs | ForEach-Object {
  $src = Join-Path $linked $_
  $dst = Join-Path $archive ($_ -replace '^docs[\\/]', '')
  New-Item -ItemType Directory -Force (Split-Path $dst) | Out-Null
  Copy-Item -LiteralPath $src -Destination $dst -Force
}
```

Expected:
- the `38` HTML files are preserved in archive form
- the active codebase no longer needs to carry non-portable `file:///` review documents

### Task 5: Keep The Repo Lean Without Breaking Active Workflows

**Files:**
- Keep active: `data/`, `docs/`, `lib/`, `mcp/`, `public/`, `scripts/`, `tests/`, `tools/`, `supabase/`, `output/icon_screenshot/`
- Archive: recurring scratch outputs and one-off QA proof assets
- Defer for a later docs-only pass: tracked `strategy/*.html` and `strategy/*.md` reshuffling

- [ ] **Step 1: Preserve the directories that active code or verified workflow commands depend on**

Do not move these paths during the initial reconciliation pass:

```text
data/
docs/
lib/
mcp/
public/
scripts/
tests/
tools/
supabase/
output/icon_screenshot/
```

Expected: all runtime, registry, screenshot-quality, and MCP verification commands continue to resolve these paths.

- [ ] **Step 2: Keep the first cleanup pass scoped to scratch and non-portable files**

Do not move tracked strategy documents, product docs, or planning documents in the same pass that centralizes the codebase. Limit the first pass to:

```text
root scratch files
linked-worktree scratch files
non-portable HTML review files
output/qa/
output/qa-spotcheck/
output/tmp-*/
```

Expected: the first cleanup pass is operationally safe and easy to verify.

- [ ] **Step 3: Run a reference scan before declaring the archive sweep safe**

Run:

```powershell
git grep -n "archive/repo-reconciliation\|output/qa/\|output/qa-spotcheck/\|tmp-batch-review/\|file:///C:/Users/guanh/.codex/worktrees" -- . ':!archive/*'
```

Expected:
- no active source files depend on the archived paths
- any remaining matches are limited to archived copies or future cleanup notes

### Task 6: Retire The Linked Worktree And Make The Main Project Directory The Only Working Copy

**Files:**
- Remove checkout: `C:\Users\guanh\.codex\worktrees\e455\supericons`
- Keep checkout: `D:\Personal\Business\Curly Mole Labs\Experiments\Apps\DailySprint\supericons`

- [ ] **Step 1: Remove the linked worktree only after Tasks 3 and 4 are complete**

Run:

```powershell
git worktree remove 'C:\Users\guanh\.codex\worktrees\e455\supericons'
git worktree list --porcelain
```

Expected:
- the linked worktree path disappears from `git worktree list`
- only the main project directory remains

- [ ] **Step 2: Fast-forward `master` to the centralized branch if `master` should remain the daily branch**

Run:

```powershell
git switch master
git merge --ff-only codex/reconcile-main-directory-20260429
Get-Item 'public/registry/records.json','public/registry/summary.json' | Select-Object FullName,Length,LastWriteTime
```

Expected:
- the merge is a fast-forward
- `public/registry/records.json` and `public/registry/summary.json` exist on `master`

- [ ] **Step 3: Verify the final single-checkout workflow from the project directory**

Run:

```powershell
git status --short
git worktree list --porcelain
npm run screenshot-quality -- completion-status --library mingcute --json
```

Expected:
- `git worktree list` shows only the main project directory
- `git status --short` is clean apart from intentionally preserved local env files
- the Mingcute completion-status command works from the main project directory

## Execution Notes

- The delicate part is not copying the whole linked checkout by hand. The safe path is:
  1. switch the main project directory onto the authoritative committed rescue head
  2. promote only the verified uncommitted keeper source files
  3. regenerate derived files in the main project directory
  4. archive scratch and non-portable residue
  5. remove the linked worktree after verification
- `output/icon_screenshot/` stays active because the screenshot-quality workflow still references it.
- `output/qa*`, root scratch PNGs, and non-portable review HTML are archive material, not active code.
