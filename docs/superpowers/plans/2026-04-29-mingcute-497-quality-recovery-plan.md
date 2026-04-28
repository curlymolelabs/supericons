# Mingcute 497 Quality Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remediate the 497 current `audit-quality` blockers in the live Mingcute approved records until the approved-record audit passes with zero blockers.

**Architecture:** Mingcute is tracker-complete but not quality-complete, so recovery must happen through the deterministic manual-redo lane rather than the `select` or `select-unmapped` screenshot-quality batch selectors. The recovery loop is: export the current blocker inventory, author one 5-icon deterministic selection file from live blockers, build and audit final-record candidates, promote only the approved batch, then re-run the library audit to measure remaining blocker count.

**Tech Stack:** Node.js scripts, `lib/screenshot-quality/quality-audit.js`, `scripts/build-manual-redo-batch.mjs`, `scripts/screenshot-quality-workflow.mjs`, MingCute screenshot captures in `output/icon_screenshot/mingcute`, approved records in `data/si-registry/automation/mingcute/approved-records.json`.

---

## File Structure

- Create: `D:/Personal/Business/Curly Mole Labs/Experiments/Apps/DailySprint/supericons/scripts/build-mingcute-quality-recovery-inventory.mjs`
  - Exports the current Mingcute audit blockers into a deterministic JSON inventory grouped by issue code and family.
- Modify: `D:/Personal/Business/Curly Mole Labs/Experiments/Apps/DailySprint/supericons/package.json`
  - Adds a short npm command for the inventory builder.
- Create: `D:/Personal/Business/Curly Mole Labs/Experiments/Apps/DailySprint/supericons/data/si-registry/generated/mingcute-quality-recovery-inventory.json`
  - Current blocker inventory used to choose the next batch.
- Create: `D:/Personal/Business/Curly Mole Labs/Experiments/Apps/DailySprint/supericons/data/si-registry/manual-redo/mingcute-screenshot-quality-recovery-batch-001-selection.json`
  - First deterministic 5-icon recovery batch.
- Create: `D:/Personal/Business/Curly Mole Labs/Experiments/Apps/DailySprint/supericons/data/si-registry/manual-redo/mingcute-manual-redo-screenshot-quality-recovery-batch-001-internal-review-reviewed-records.json`
  - Built review artifact for the first recovery batch.
- Create: `D:/Personal/Business/Curly Mole Labs/Experiments/Apps/DailySprint/supericons/data/si-registry/manual-redo/mingcute-manual-redo-screenshot-quality-recovery-batch-001-final-records.json`
  - Final-record candidates for the first recovery batch.
- Create: `D:/Personal/Business/Curly Mole Labs/Experiments/Apps/DailySprint/supericons/docs/superpowers/plans/2026-04-29-mingcute-manual-redo-screenshot-quality-recovery-batch-001-internal-review.html`
  - Human review page for the first recovery batch.

### Task 1: Establish The Recovery Lane

**Files:**
- Create: `D:/Personal/Business/Curly Mole Labs/Experiments/Apps/DailySprint/supericons/scripts/build-mingcute-quality-recovery-inventory.mjs`
- Modify: `D:/Personal/Business/Curly Mole Labs/Experiments/Apps/DailySprint/supericons/package.json`
- Create: `D:/Personal/Business/Curly Mole Labs/Experiments/Apps/DailySprint/supericons/data/si-registry/generated/mingcute-quality-recovery-inventory.json`

- [ ] **Step 1: Export the current blocker inventory**

Run:

```bash
npm run build:mingcute-quality-recovery-inventory
```

Expected:
- writes `data/si-registry/generated/mingcute-quality-recovery-inventory.json`
- includes `issue_count`, `blocker_count`, `counts_by_code`, and one entry per blocked `icon_id`

- [ ] **Step 2: Verify the live Mingcute audit baseline**

Run:

```bash
npm run screenshot-quality -- completion-status --library mingcute --json
npm run screenshot-quality -- audit-quality --final-records data/si-registry/automation/mingcute/approved-records.json
```

Expected:
- completion still reports `library_complete: true`
- audit still reports the current blocker count before recovery work

### Task 2: Batch The Backlog By Recovery Pattern

**Files:**
- Read: `D:/Personal/Business/Curly Mole Labs/Experiments/Apps/DailySprint/supericons/data/si-registry/generated/mingcute-quality-recovery-inventory.json`
- Create: next `D:/Personal/Business/Curly Mole Labs/Experiments/Apps/DailySprint/supericons/data/si-registry/manual-redo/mingcute-screenshot-quality-recovery-batch-###-selection.json`

- [ ] **Step 1: Always pick exactly 5 icons**

Use the active Mingcute policy from `data/si-registry/manual-redo/restart-order.json`:

```json
{
  "phase": "calibration",
  "batch_size": 5,
  "approval_scope": "full_batch",
  "fallback_batch_size": 5
}
```

- [ ] **Step 2: Use this priority order**

1. `missing_*_visual`
2. `too_short_depicts`
3. `duplicate_depicts_modifier_family`

Reason:
- modifier-cue blockers are the fastest high-confidence wins
- short `depicts` are usually simple visual upgrades
- duplicate family cleanup needs direct side-by-side comparison and should come after the easier wins

- [ ] **Step 3: Keep one family shape per batch whenever possible**

Preferred batch patterns:
- one modifier family with 5 variants
- one issue code across 5 icons
- one visually related family such as `user_*`, `notification_*`, or `calendar_*`

Avoid:
- mixing unrelated brand, object, and modifier families in one batch unless needed to use all 5 slots

- [ ] **Step 4: Keep `screenshot` in every recovery batch id**

Use this naming shape:

```text
mingcute-screenshot-quality-recovery-batch-###
```

Reason:
- `lib/screenshot-quality/state.js` only recognizes tracker artifacts whose filenames contain `screenshot`
- that keeps `completion-status` aligned with the live approved-record recovery work

### Task 3: Author Deterministic Recovery Selections

**Files:**
- Create: `D:/Personal/Business/Curly Mole Labs/Experiments/Apps/DailySprint/supericons/data/si-registry/manual-redo/mingcute-screenshot-quality-recovery-batch-###-selection.json`
- Read: `D:/Personal/Business/Curly Mole Labs/Experiments/Apps/DailySprint/supericons/output/icon_screenshot/mingcute/*.png`
- Read: `D:/Personal/Business/Curly Mole Labs/Experiments/Apps/DailySprint/supericons/node_modules/mingcute_icon/svg/**/<icon>_line.svg`

- [ ] **Step 1: Ground every item in the live screenshot or SVG**

For each icon:
- inspect the Mingcute screenshot or SVG first
- inspect the official source file second
- keep `depicts_observation` at 8-22 words
- mention visible modifier cues such as `plus`, `x`, `slash`, `clock`, or `row`
- avoid repeating the label or writing abstract product language

- [ ] **Step 2: Fill the required deterministic fields**

Each item must contain:
- `icon_id`
- `official_source_url`
- `depicts_observation`
- `popular_reading`
- `plausible_readings`
- `context_bias`
- `ambiguity_note`
- `selection_reason`

- [ ] **Step 3: Use screenshot filenames when the batch should review rendered captures**

For Mingcute screenshot-grounded recovery batches, also include:

```json
{
  "screenshot_file_name": "mingcute_<source_name>_line.png"
}
```

That keeps the manual-redo HTML page tied to the same rendered asset the user would inspect.

### Task 4: Build And Audit Each Recovery Batch

**Files:**
- Create: `D:/Personal/Business/Curly Mole Labs/Experiments/Apps/DailySprint/supericons/data/si-registry/manual-redo/mingcute-manual-redo-screenshot-quality-recovery-batch-###-internal-review-reviewed-records.json`
- Create: `D:/Personal/Business/Curly Mole Labs/Experiments/Apps/DailySprint/supericons/data/si-registry/manual-redo/mingcute-manual-redo-screenshot-quality-recovery-batch-###-final-records.json`
- Create: `D:/Personal/Business/Curly Mole Labs/Experiments/Apps/DailySprint/supericons/docs/superpowers/plans/YYYY-MM-DD-mingcute-manual-redo-screenshot-quality-recovery-batch-###-internal-review.html`

- [ ] **Step 1: Validate the selection file**

Run:

```bash
npm run verify:manual-redo-determinism
```

Expected:
- the new Mingcute recovery selection file passes deterministic validation

- [ ] **Step 2: Build the manual redo batch**

Run:

```bash
npm run build:manual-redo-batch -- mingcute-screenshot-quality-recovery-batch-###
```

Expected:
- internal review JSON exists
- final-records JSON exists
- review HTML exists

- [ ] **Step 3: Run the batch quality audit**

Run:

```bash
npm run screenshot-quality -- audit-quality --final-records data/si-registry/manual-redo/mingcute-manual-redo-screenshot-quality-recovery-batch-###-final-records.json
```

Expected:
- `blocker_count: 0`
- if blockers remain, edit the selection file and rebuild before promotion

### Task 5: Promote, Verify, And Measure Burn-Down

**Files:**
- Modify: `D:/Personal/Business/Curly Mole Labs/Experiments/Apps/DailySprint/supericons/data/si-registry/automation/mingcute/approved-records.json`
- Modify: `D:/Personal/Business/Curly Mole Labs/Experiments/Apps/DailySprint/supericons/public/registry/records.json`
- Modify: `D:/Personal/Business/Curly Mole Labs/Experiments/Apps/DailySprint/supericons/data/si-registry/generated/mingcute-quality-recovery-inventory.json`

- [ ] **Step 1: Promote only passing batches**

Run:

```bash
npm run screenshot-quality -- promote --library mingcute --final-records data/si-registry/manual-redo/mingcute-manual-redo-screenshot-quality-recovery-batch-###-final-records.json
```

Expected:
- the 5 records overwrite the live Mingcute approved records
- registry projections rebuild during promotion

- [ ] **Step 2: Run post-promotion verification**

Run:

```bash
npm run verify:pruned-semantic-fields
npm run verify:si-registry
npm run verify:mingcute-approved-records
npm run screenshot-quality -- audit-quality --final-records data/si-registry/automation/mingcute/approved-records.json
```

Expected:
- all verify commands pass
- Mingcute blocker count is lower than before the batch

- [ ] **Step 3: Refresh the inventory before creating the next batch**

Run:

```bash
npm run build:mingcute-quality-recovery-inventory
```

Expected:
- next batch is chosen from fresh live blocker data instead of stale notes

## Success Criteria

- Mingcute `completion-status` stays complete during the whole recovery run
- every promoted recovery batch passes `audit-quality` before promotion
- the live Mingcute approved-record audit eventually reaches `0 blockers`
- no recovery batch uses `select` or `select-unmapped`
- no public record is changed without a built and audited final-records batch
