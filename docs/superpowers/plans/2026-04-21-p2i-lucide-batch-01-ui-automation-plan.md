# 2026-04-21 P2I Lucide Batch 01 UI Automation Plan

## Goal

Start the Lucide rollout with a controlled first automation batch that uses the existing UI semantics workflow already proven on the purpose-chip set and MingCute.

## Why Lucide Next

- It is the next library in the agreed rollout order after MingCute and Simple Icons.
- It is a strong UI icon library, so the existing `ui_semantics` path is a good fit.
- It is smaller than Tabler, which makes it a safer next validation step before the larger libraries.

## Batch 01 Scope

- Library: `lucide`
- Target size: about `200–300`
- Initial target: `220`
- Minimum acceptable staged count: `180`
- Main focus:
  - navigation and movement
  - search and discovery
  - file and folder actions
  - status and security
  - systems and developer tools
  - shell and control icons

## Execution Steps

1. Create `lucide-batch-01-selection.json`.
2. Reuse the existing generic automation builder with `template_mode = ui_semantics`.
3. Stage the Lucide worklist, candidate records, review queue, and summary.
4. Verify the staged batch with the existing semantic automation verifier.
5. If the staged count is outside the target range, tune family caps once and rebuild.

## Success Criteria

- A valid `lucide-batch-01` selection exists.
- The staged count lands inside or close to the target range.
- The staged queue is sensible enough to split into editor review and visual review next.
- The generic automation path works without adding Lucide-specific custom code yet.

## Expected Output

- `data/si-registry/automation/lucide-batch-01-selection.json`
- `data/si-registry/automation/lucide-batch-01/worklist.json`
- `data/si-registry/automation/lucide-batch-01/candidate-records.json`
- `data/si-registry/automation/lucide-batch-01/review-queue.json`
- `data/si-registry/automation/lucide-batch-01/summary.json`

## Follow-On Step

If batch 01 stages cleanly, the next step is `Lucide editor review batch 01`, followed by the Lucide visual-review slice if needed.
