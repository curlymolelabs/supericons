# Semantic Registry Redo Workflow

This is the tracked repo mirror of the local operational workflow at:

```text
.agents/workflows/semantic-registry-redo.md
```

Use this workflow when you need to continue, resume, or start deterministic semantic metadata redo for an existing Supericons track or a future library that has been registered into the redo system.

This workflow is intentionally project-specific. It is the operational entry point for the redo loop we already use in this repo.

---

## What This Workflow Is For

- deterministic semantic redo of icon metadata
- exact policy-sized batch review
- approval against the exact public-schema JSON
- promotion into the live public registry only after approval
- current tracks and future libraries that are registered into the redo system

## Public Acceptance Target

The approval target is the public schema below:

```json
{
  "icon_id": "library:icon",
  "source_library": "library",
  "source_name": "icon_name",
  "label": "Human Label",
  "depicts": "Perceptual-literal visual description",
  "semantic_tags": ["tag"],
  "synonyms": ["phrase"],
  "use_when": "When to use it",
  "avoid_when": "When not to use it"
}
```

Do not ask for approval on internal review files alone. Show the exact policy-sized public-schema JSON from the generated `*-final-records.json` file.

---

## Source Of Truth Map

| File | Role |
| --- | --- |
| `data/si-registry/manual-redo/restart-order.json` | track order and active stage |
| `data/si-registry/generated/redo-progress-summary.json` | latest machine summary |
| `docs/superpowers/plans/checklists/index.md` | checklist entry point |
| `docs/superpowers/plans/checklists/<track>-progress.md` | per-track progress |
| `data/si-registry/manual-redo/*-selection.json` | batch input |
| `data/si-registry/manual-redo/*-final-records.json` | exact public-schema candidate output |
| `public/icon-index.json` | browser outline asset catalog |
| `public/icon-index-solid.json` | browser solid or fill asset catalog |
| `public/registry/records.json` | live public registry |
| `mcp/public/icon-index.json` | MCP outline asset catalog |
| `mcp/public/icon-index-solid.json` | MCP solid or fill asset catalog |
| `mcp/public/registry-records.json` | MCP-facing public registry projection |

## Hard Boundaries

- Internal review files are not public registry inputs.
- Do not treat `*-internal-review-reviewed-records.json` or internal-review HTML files as live output.
- The acceptance target is the exact public-schema JSON from `*-final-records.json`, then the rebuilt live public registry after approval.
- Never trust memory over the checklist and live registry files.
- The semantic registry is the meaning layer, not the raw asset-variant inventory.
- If an icon has outline and solid or fill forms, prefer one semantic record plus multiple asset variants unless the variant meaning is actually different.
- Use `public/icon-index*.json` and `mcp/public/icon-index*.json` for variant-aware asset lookup, not `public/registry/records.json`.

---

## Preflight

Always start here:

```bash
npm run build:redo-progress-checklists
```

Expected output shape:

```text
build-redo-progress-checklists: wrote data/si-registry/generated/redo-progress-summary.json and ...
```

Then read:

1. `docs/superpowers/plans/checklists/index.md`
2. `data/si-registry/generated/redo-progress-summary.json`
3. the active track checklist from `docs/superpowers/plans/checklists/`

---

## Main Loop

### Step 1: Find The Active Track

Use these files, in this order:

1. `data/si-registry/generated/redo-progress-summary.json`
2. `docs/superpowers/plans/checklists/index.md`
3. `docs/superpowers/plans/checklists/<track>-progress.md`

The active track is the first track that still has unchecked items in the current redo order.

### Step 2: Clear Reviewed But Not Promoted Blockers First

If the checklist says:

```text
reviewed in ... but the live public registry still differs
```

that blocker must be resolved before touching later icons.

Promotion is not complete until:

1. the source record group has been updated
2. `npm run build:si-registry` has been run
3. `npm run verify:pruned-semantic-fields` has been run
4. `npm run build:redo-progress-checklists` has been run
5. the checklist shows those icons as `[x]`

### Step 3: Pick The Next Batch Icons

Only after blockers are clear:

1. open the active track checklist
2. take the first N untouched unchecked icons in source order, where N is the active stage review-policy batch size
3. never choose from memory
4. never skip ahead

Batch size comes from the active stage review policy in `data/si-registry/manual-redo/restart-order.json`.

If the current batch output feels weaker or more mechanical than the approved standard, stop scaling and use the stage fallback batch size for the next batch.

### Step 4: Build Or Update The Selection File

The batch input file is:

```text
data/si-registry/manual-redo/<batch-id>-selection.json
```

The deterministic selection file must include:

- `batch_id`
- `track_id`
- `track_label`
- `title`
- `review_goal`
- `record_source_path`
- `review_policy_snapshot`
- `visual_source`
- `items`

Each item must include:

- `icon_id`
- `official_source_url`
- `depicts_observation`
- `popular_reading`
- `plausible_readings`
- `context_bias`
- `ambiguity_note`
- `selection_reason`

Optional per item when screenshot naming differs from `source_library` + `source_name`:

- `screenshot_file_name`

Required evidence order:

1. rendered screenshot when `output/icon_screenshot/<source_library>_<source_name>.png` exists
2. SVG structure
3. official icon source
4. current record
5. public supporting reference when ambiguity remains

`depicts_observation` comes first. Meaning fields come after visual grounding.
When a screenshot exists, the screenshot is the primary visual source and the SVG is a secondary check.

Quality rule for `depicts_observation`:

- use the rendered screenshot first when it exists
- prefer perceptual-literal phrasing, not primitive geometry
- use the strongest stable object name first when the SVG clearly supports it
- for common control icons, prefer names like `magnifying glass`, `gear`, `robot face`, `ellipsis dots`, or `screen panels`
- do not break a familiar icon into awkward primitive parts if the standard object name is clearer
- for brand logos, describe the visible mark itself instead of repeating the brand name
- if letters or numerals are visibly part of the mark, describe those visible forms
- avoid generic placeholders like `logo silhouette` or `main brand mark` as the whole `depicts`

### Step 5: Run The Deterministic Command Chain

Run exactly this:

```bash
npm run verify:manual-redo-determinism
npm run build:manual-redo-batch -- <batch-id>
npm run verify:pruned-semantic-fields
```

If one step fails, stop and fix the batch before moving on.

### Step 6: Show The Exact Public JSON

Read the generated file:

```text
data/si-registry/manual-redo/<track>-manual-redo-<batch>-final-records.json
```

Show only:

- the exact public-schema JSON
- the full current batch size
- no prose summary in place of the JSON
- no claim that the batch is live yet

Wait for approval or rejection.

### Step 7: Promote Approved Icons

If approved:

1. merge the approved public fields into the source record group
2. rebuild the live public registry
3. rebuild the checklist

Commands:

```bash
npm run build:si-registry
npm run verify:pruned-semantic-fields
npm run build:redo-progress-checklists
```

Promotion is complete only when the checklist flips those icons to `[x]`.

### Step 8: Repeat Until The Track Is Fully Checked

Keep repeating the loop until the active checklist has no unchecked items.

A track is complete only when every item in its checklist is `[x]`.

---

## Promotion Rules

When promoting a reviewed batch into the track source record group, update only the public fields:

- `source_library`
- `source_name`
- `label`
- `depicts`
- `semantic_tags`
- `synonyms`
- `use_when`
- `avoid_when`

Do not copy internal review fields into public record groups.

---

## Future Library Bootstrap

This workflow is reusable for future libraries only if the library is first registered into the redo system.

New libraries should start in calibration mode with a small batch size. Increase the batch size only after the user confirms the outputs are reliable.

### A New Library Must Be Registered In Restart Order

Add it to:

```text
data/si-registry/manual-redo/restart-order.json
```

Example shape:

```json
{
  "order": 12,
  "stage_id": "newlibrary",
  "label": "New Library",
  "source_total_icons": 123,
  "status": "pending",
  "review_policy": {
    "phase": "calibration",
    "batch_size": 5,
    "approval_scope": "full_batch",
    "fallback_batch_size": 5
  }
}
```

### The Checklist Generator Has Scope Rules

The checklist generator currently derives non-purpose library scope from:

- `public/icon-index.json`
- live source-name matching rules in `scripts/build-redo-progress-checklists.mjs`

If a new library uses naming conventions that do not match the current normalization rules, update the checklist generator before starting redo work.

### Fail Fast Conditions For New Libraries

Stop and extend the system first if:

- the new library is not represented in `public/icon-index.json`
- source-name matching is ambiguous
- the track does not yet have a usable source record file for promotion
- the batch selection file cannot point `record_source_path` at the track's real source records

Do not start manual redo batches against an untracked library scope.

---

## Dry Run Questions This Workflow Must Always Answer

Before using it for real work, the workflow should let an agent answer these from files alone:

- what the active track is
- which icons come next under the current review policy
- which file contains the exact public-schema batch output
- which commands promote a batch to the live public registry
- how a future library gets registered into the redo system

---

## Not Yet A Skill

This is intentionally a project workflow first.

If the same redo loop stays stable across multiple additional libraries, the reusable judgment layer can later be extracted into a Supericons project skill.

---

## References

- `docs/superpowers/workflows/screenshot-quality-workflow.md`
- `docs/superpowers/plans/2026-04-22-deterministic-redo-checklist-process-plan.md`
- `docs/superpowers/plans/2026-04-22-deterministic-manual-redo-process-lock.md`
- `data/si-registry/manual-redo/README.md`
- `scripts/build-redo-progress-checklists.mjs`
- `scripts/build-manual-redo-batch.mjs`
- `scripts/verify-manual-redo-determinism.mjs`
