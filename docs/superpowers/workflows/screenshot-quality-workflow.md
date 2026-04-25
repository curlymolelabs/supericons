# Screenshot Quality Workflow

This workflow keeps deterministic work in scripts and leaves only the visual `depicts` wording to the agent.

## Purpose

Use this workflow when screenshot images exist for a library and the public registry needs better visual descriptions.

The program owns:

- screenshot capture targets
- next-batch selection
- reviewed-but-not-live tracking
- final record normalization
- deterministic quality checks
- promotion into approved records

The agent owns:

- looking at the screenshots
- writing the new `depicts` value
- flagging visual ambiguity

## Commands

Check current state:

```bash
npm run screenshot-quality -- status --library mingcute --json
```

Capture screenshots from the mapped icon catalogs:

```bash
npm run capture:icon-screenshots -- --library mingcute
```

Create the next packet for an agent:

```bash
npm run screenshot-quality -- select --library mingcute --size 100 --batch-id mingcute-screenshot-batch-034
```

The packet is agent input only. It is not a final registry artifact.

The agent must return depicts-only JSON:

```json
[
  {
    "icon_id": "mingcute:chrome",
    "depicts": "circle divided into three curved sections around a small center circle"
  }
]
```

Convert the depicts-only output into public-schema final records:

```bash
npm run screenshot-quality -- finalize-review --library mingcute --batch-id mingcute-screenshot-batch-034 --agent-output data/si-registry/manual-redo/mingcute-screenshot-batch-034-agent-depicts.json
```

Run deterministic quality checks:

```bash
npm run screenshot-quality -- audit-quality --final-records data/si-registry/manual-redo/mingcute-screenshot-batch-034-final-records.json
```

Promote only after approval:

```bash
npm run screenshot-quality -- promote --library mingcute --final-records data/si-registry/manual-redo/mingcute-screenshot-batch-034-final-records.json
```

Verify the workflow state:

```bash
npm run verify:screenshot-quality-workflow
```

## Agent Rules

- Do not choose batches manually.
- Do not skip icons from the selected packet.
- Do not calculate progress counts manually.
- Do not promote review-only batches.
- Only author `depicts` unless the workflow explicitly opens another field.
- Preserve line and fill variants as one semantic record unless the registry has separate public records.
- If line and fill variants differ only by fill style, write one shared visual description that fits both.
- If duplicate pending artifacts exist for the same icon, reconcile them before selecting more icons.

## State Names

- `completed_live`: the live public record matches a recognized screenshot final-records file.
- `reviewed_pending`: a screenshot final-records file exists, but live has not been updated yet.
- `untouched`: screenshot-backed icon still has no recognized screenshot review artifact.
- `unmapped`: screenshot mapping does not resolve to a live registry record.

## Recovery

If an agent accidentally creates overlapping review artifacts, do not continue with new work. Reconcile the overlap into one tracker-recognized `*-final-records.json` file, promote it if approved, rebuild the registry, and regenerate the checklist before selecting the next batch.
