# Registry Data Folder Cleanup Inventory - 2026-05-01

## Purpose

This inventory classifies the registry-related folders so cleanup can happen without breaking Supericons.

The immediate rule is simple: do not delete or move registry files until the rebuild and verification path proves they are not source data.

## Verified Folder Sizes

Verified from the current main workspace on 2026-05-01:

| Path | Files | Size | Classification | Recommended action |
| --- | ---: | ---: | --- | --- |
| `data/si-registry/automation` | 896 | 81.25 MB | mixed source and staging | keep now; split after Supabase import exists |
| `data/si-registry/generated` | 356 | 52.82 MB | generated | delete only if rebuildable and verified |
| `data/si-registry/manual-redo` | 894 | 15.39 MB | staging/review evidence | archived to `data/si-registry/archive/2026-05-01-pre-supabase-cutover/manual-redo` |
| `data/si-registry/pilot` | 35 | 1.26 MB | mixed source and pilot history | keep manifest-listed source; archive non-source later |
| `data/si-registry/source` | 11 | not remeasured in this table | active source | keep |
| `data/si-registry/source-maps` | 2 | 0.01 MB | support metadata | keep |
| `data/si-registry/benchmarks` | 2 | under 0.01 MB | benchmark evidence | keep or archive after migration |
| `data/si-registry/records` | 2 | under 0.01 MB | source | keep until Supabase becomes source |
| `data/si-registry/private` | 1 | under 0.01 MB | private/local | keep separate from public exports |

## Current Temporary Source

The current temporary source is the manifest, plus the files it lists in `recordGroups` and `importSources`.

As of 2026-05-01, active semantic source files have been isolated under:

```text
data/si-registry/source/
```

Manifest:

```text
data/si-registry/registry-manifest.json
```

Manifest-listed source records:

```text
data/si-registry/source/free-pilot.json
data/si-registry/source/purpose-chip-approved.json
data/si-registry/source/libraries/mingcute.json
data/si-registry/source/libraries/simpleicons.json
data/si-registry/source/libraries/lucide.json
data/si-registry/source/libraries/tabler.json
data/si-registry/source/libraries/phosphor.json
data/si-registry/source/libraries/heroicons.json
data/si-registry/source/libraries/bootstrap.json
data/si-registry/source/libraries/iconoir.json
data/si-registry/source/libraries/ionicons.json
public/packs/manifest.json
```

These files are the active local source until Supabase becomes the operational source of truth.

## Mixed Folder Risk

`data/si-registry/automation` was the riskiest folder because it contained both active approved records and many workflow batch folders.

As of 2026-05-01, `data/si-registry/registry-manifest.json` no longer points into `automation/`; it points into `source/`.

Verified size by top-level automation folder on 2026-05-01:

| Folder | Files | Size |
| --- | ---: | ---: |
| `tabler` | 126 | 17.26 MB |
| `simpleicons` | 75 | 7.78 MB |
| `mingcute` | 57 | 7.75 MB |
| `lucide` | 63 | 6.07 MB |
| `phosphor` | 42 | 5.03 MB |
| `iconoir` | 39 | 3.94 MB |
| `bootstrap` | 39 | 3.81 MB |
| `ionicons` | 15 | 1.28 MB |
| `heroicons` | 15 | 0.95 MB |
| `*-batch-*` folders | mostly 4 files each | staging history |

Recommendation:

- Keep the library folders temporarily as staging/recovery evidence.
- Do not treat `automation/*/approved-records.json` as active source unless the manifest is deliberately repointed and verification passes.
- Treat batch folders as staging/evidence, not source.
- Archive batch folders only after their useful reviewed records have been promoted or deliberately rejected.

## Generated Deployment Artifacts

These are generated outputs, not editable source:

```text
data/si-registry/generated/
public/registry/
mcp/public/
```

The website and hosted search use `public/registry/records.json`.

The MCP npm package uses `mcp/public/registry-records.json`.

Both should be generated from the same public registry projection. They should not be hand-edited.

## Evidence And Large Output Folders

`output/icon_screenshot` was previously verified as 31,538 files and 82.07 MB. It appears to be evidence/test output rather than source registry data.

Recommendation:

- Keep until all active audits no longer need screenshot evidence.
- Move to an archive location after migration.
- Do not load it into Supabase.

## Cleanup Policy

Use these actions only:

| Action | Meaning |
| --- | --- |
| `keep` | Required by current build, source, package, or deployment flow. |
| `move after migration` | Can be reorganized after Supabase import/export is proven. |
| `archive after migration` | Useful evidence/history, but not needed in active source folders. |
| `delete only if rebuildable and verified` | Generated output that can be recreated and passes verification after deletion. |

## Cleanup Actions Completed

Verified and completed on 2026-05-01:

```text
npm run export:registry-supabase
mode: compare-current
public records: 15103

npm run archive:si-registry-workflow -- --apply
data/si-registry/manual-redo
-> data/si-registry/archive/2026-05-01-pre-supabase-cutover/manual-redo
894 files
16132638 bytes
```

Post-archive gates passed:

```text
npm run verify:si-registry-source-boundaries
npm run dry-run:registry-supabase-import -- --strict
npm run verify:registry-rollback
npm run import:registry-supabase
npm run verify:registry-supabase
npm run export:registry-supabase
npm run verify:si-registry
```

Important: `data/si-registry/generated/`, `public/registry/`, `mcp/public/`, and `data/si-registry/staging/library-workbench/` remain active and were not archived.

## Recommended Target Layout Before Supabase Cutover

Use a clearer local layout only after import/export scripts exist:

```text
data/si-registry/source/
data/si-registry/staging/
data/si-registry/generated/
data/si-registry/archive/
```

Recommended mapping:

| Current data | Target before cutover |
| --- | --- |
| manifest-listed approved records | `source/` |
| batch folders and manual redo files | `staging/` or `archive/` |
| projection files | `generated/` |
| old audits, screenshots, abandoned attempts | `archive/` |

## Supabase Cutover Rule

Supabase should not receive the whole messy folder tree.

Only validated source records should be imported into structured tables. Staging, generated files, screenshots, and workflow evidence should stay out of the operational registry database unless they are needed in a separate audit/evidence table.
