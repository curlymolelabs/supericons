# Worktree And Filesystem Organization Audit - 2026-05-01

## Verified Git Worktrees

Command:

```powershell
git worktree list --porcelain
```

Verified worktrees:

| Role | Path | Branch | HEAD |
| --- | --- | --- | --- |
| Main checkout | `D:/Personal/Business/Curly Mole Labs/Experiments/Apps/DailySprint/supericons` | `codex/reconcile-main-directory-20260429` | `a856b513` |
| Nested worktree | `D:/Personal/Business/Curly Mole Labs/Experiments/Apps/DailySprint/supericons/.worktrees/semantic-registry-refactor` | `codex/semantic-registry-refactor` | `a856b513` |

## Verified Branches

Command:

```powershell
git branch --list
```

Verified branches:

- `codex/icon-intelligence-checkpoint`
- `codex/mingcute-recovery-rescue-20260429`
- `codex/reconcile-main-directory-20260429`
- `codex/semantic-registry-refactor`
- `master`

## Current Source Of Truth Recommendation

Use this folder as the only active working source of truth:

```text
D:/Personal/Business/Curly Mole Labs/Experiments/Apps/DailySprint/supericons
```

Do not continue active implementation in:

```text
D:/Personal/Business/Curly Mole Labs/Experiments/Apps/DailySprint/supericons/.worktrees/semantic-registry-refactor
```

The nested worktree contains useful experimental recovery scripts and generated artifacts, but it creates a second reality and should be removed after useful changes are either copied into main or explicitly discarded.

## Can The Worktree Run Supericons?

Verified:

- `package.json` exists in the worktree.
- `public/registry/records.json` exists in the worktree.
- `node_modules` does not exist in the worktree.

Conclusion:

The worktree has the project source files, but it is not a complete ready-to-run checkout unless dependencies are installed. The main folder currently has `node_modules` and is the more complete working checkout.

## Top-Level Main Folder Size Audit

Verified largest folders in main:

| Folder | Approx Size |
| --- | ---: |
| `archive` | 460.93 MB |
| `node_modules` | 434.71 MB |
| `.worktrees` | 427.00 MB |
| `.git` | 288.61 MB |
| `data` | 150.76 MB |
| `output` | 82.12 MB |
| `mcp` | 42.92 MB |
| `public` | 35.47 MB |
| `dist` | 27.48 MB |
| `tmp` | 11.08 MB |

## Worktree Folder Size Audit

Verified largest folders in `.worktrees/semantic-registry-refactor`:

| Folder | Approx Size |
| --- | ---: |
| `data` | 304.64 MB |
| `output` | 51.41 MB |
| `public` | 30.09 MB |
| `mcp` | 28.81 MB |
| `docs` | 5.26 MB |

## Data Folder Audit

Verified `data/si-registry` in main:

| Folder | Files | Approx Size |
| --- | ---: | ---: |
| `automation` | 896 | 81.27 MB |
| `generated` | 356 | 52.72 MB |
| `manual-redo` | 894 | 15.39 MB |
| `pilot` | 35 | 1.26 MB |
| `source-maps` | 2 | 0.01 MB |
| `benchmarks` | 2 | 0.00 MB |
| `records` | 2 | 0.00 MB |
| `private` | 1 | 0.00 MB |

## Output Folder Audit

Verified `output/icon_screenshot` in main:

- File count: 31,538
- Approx size: 82.07 MB

This is likely useful evidence for visual recovery, but it should be treated as generated/rebuildable evidence, not primary registry source.

## Codex Home Audit

Verified selected folders under `C:/Users/guanh/.codex`:

| Folder | Files | Approx Size |
| --- | ---: | ---: |
| `sessions` | 36 | 1129.15 MB |
| `archived_sessions` | 23 | 240.33 MB |
| `.tmp` | 2464 | 71.48 MB |
| `worktrees` | 0 | 0.00 MB |
| `tmp` | 8 | 0.00 MB |
| `cache` | 7 | 0.00 MB |

Verified `C:/Users/guanh/.codex/worktrees/e455` exists as a directory but contains no files from the scan.

## Reorganization Recommendation

### Immediate

1. Stop using `.worktrees/semantic-registry-refactor` for new work.
2. Decide whether to preserve or discard the worktree changes.
3. If preserving, copy only selected files into main and verify main directly.
4. Remove the nested worktree after preservation/discard decision.

### Registry Source Structure

Make `public/registry/records.json` and `mcp/public/registry-records.json` generated outputs only.

Recommended source folders:

```text
data/si-registry/canonical/       # approved source records only
data/si-registry/imports/         # upstream library inputs and source maps
data/si-registry/review-queues/   # active human/agent review queues
data/si-registry/generated/       # rebuildable outputs only
data/si-registry/archive/         # old deterministic workflow artifacts
output/icon_screenshot/           # visual evidence, rebuildable when possible
```

### Supabase Direction

Do not bulk-load the messy current `data/si-registry` folder into Supabase.

Recommended migration path:

1. Establish canonical source records.
2. Move or archive workflow artifacts.
3. Define Supabase tables and constraints.
4. Import only validated canonical records.
5. Export public/MCP JSON from Supabase or canonical build scripts after quality gates pass.

## Safe Worktree Removal Commands

Only run after useful worktree files are copied or intentionally discarded:

```powershell
git worktree remove .worktrees/semantic-registry-refactor
git branch -D codex/semantic-registry-refactor
```

If Git refuses because the worktree is dirty:

```powershell
git worktree remove --force .worktrees/semantic-registry-refactor
git branch -D codex/semantic-registry-refactor
```

Do not force-remove until the preservation decision is made.

## Public And MCP Registry Duplication Audit

Question audited:

Why do both of these files exist, and is there a hidden reason?

```text
public/registry/records.json
mcp/public/registry-records.json
```

Verified writer:

`scripts/build-si-registry-projections.mjs` writes both files from the same generated projection:

```text
projections.publicRecordPreview
```

Verified verifier:

`scripts/verify-si-registry-projections.mjs` asserts:

- `public/registry/records.json` equals `data/si-registry/generated/public-record-preview.json`
- `mcp/public/registry-records.json` equals `data/si-registry/generated/public-record-preview.json`
- `public/registry/summary.json` equals `mcp/public/registry-summary.json`

Verified website/Supabase consumer:

`scripts/sync-search-catalog-to-supabase.mjs` reads:

```text
public/registry/records.json
```

That file is the current public website/hosted-search export.

Verified MCP package consumer:

`mcp/package.json` includes these files in the npm package:

```text
public/registry-records.json
public/registry-summary.json
```

`mcp/semantic-registry.js` loads:

```text
registry-records.json
```

from the MCP package data directory.

Conclusion:

There is a real packaging reason for two physical files: the website and hosted search use `public/registry/records.json`, while the MCP npm package needs a self-contained copy under `mcp/public/registry-records.json`.

There is no verified evidence that these are intended to be two independent sources of truth. The build and verifier show the opposite: both are downstream artifacts from one generated public projection and must stay identical.

Recommended plan update:

1. Keep two physical files only as deploy/package artifacts.
2. Rename the mental model from "two registries" to "two projections of one public registry".
3. Keep `data/si-registry/generated/public-record-preview.json` as the intermediate generated public projection for now.
4. Move long-term source of truth to canonical records or Supabase.
5. Keep a verifier that fails if website and MCP projections drift.
6. Do not hand-edit either public output file.
