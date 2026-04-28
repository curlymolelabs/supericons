# Screenshot Quality Workflow

This workflow keeps deterministic work in scripts and leaves only the visual `depicts` wording to the agent.

## Purpose

Use this workflow when screenshot images exist for a library and the public registry needs better visual descriptions.

The program owns:

- screenshot capture targets
- next-batch selection
- unmapped concept diagnosis
- library completion gating
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

Check whether a library is actually complete:

```bash
npm run screenshot-quality -- completion-status --library mingcute --json
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

Create the next packet from unresolved unmapped concepts that already have reviewed source records:

```bash
npm run screenshot-quality -- select-unmapped --library mingcute --size 100 --batch-id mingcute-unmapped-batch-001
```

Use this when mapped review is exhausted but unresolved unmapped concepts remain and the concepts already exist as reviewed draft records in the library source-of-truth.

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

The same `finalize-review` command is also used for `select-unmapped` packets. It will preserve the reviewed source record fields and only replace `depicts`.

Run deterministic quality checks:

```bash
npm run screenshot-quality -- audit-quality --final-records data/si-registry/manual-redo/mingcute-screenshot-batch-034-final-records.json
```

Promote only after approval:

```bash
npm run screenshot-quality -- promote --library mingcute --final-records data/si-registry/manual-redo/mingcute-screenshot-batch-034-final-records.json
```

Promote a finalized unmapped draft-backed batch by updating the reviewed source records and moving the icons from draft to approved import:

```bash
npm run screenshot-quality -- promote-unmapped --library mingcute --final-records data/si-registry/manual-redo/mingcute-unmapped-batch-001-final-records.json
```

Diagnose unresolved unmapped concepts:

```bash
npm run screenshot-quality -- diagnose-unmapped --library mingcute --json
```

Scaffold a local-only resolution artifact for unresolved unmapped concepts:

```bash
npm run screenshot-quality -- scaffold-unmapped-resolution --library mingcute
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
- Do not move to the next library when unresolved unmapped concepts still exist.
- Screenshot review is only one phase of library completion.

## State Names

- `completed_live`: the live public record matches a recognized screenshot final-records file.
- `reviewed_pending`: a screenshot final-records file exists, but live has not been updated yet.
- `untouched`: screenshot-backed icon still has no recognized screenshot review artifact.
- `unmapped`: screenshot mapping does not resolve to a live registry record.

In many libraries, unresolved `unmapped` concepts are not missing source data. They often already exist as reviewed draft records that still need screenshot-grounded `depicts` and an explicit promotion decision.

## Completion Rule

A library is only complete when all of the following are true:

- `reviewed_pending` is `0`
- `untouched` is `0`
- unresolved `unmapped` concepts are `0`

If mapped review work is finished but unresolved unmapped concepts remain, do not move to the next library. Diagnose and resolve the unmapped backlog first.

## Recovery

If an agent accidentally creates overlapping review artifacts, do not continue with new work. Reconcile the overlap into one tracker-recognized `*-final-records.json` file, promote it if approved, rebuild the registry, and regenerate the checklist before selecting the next batch.
