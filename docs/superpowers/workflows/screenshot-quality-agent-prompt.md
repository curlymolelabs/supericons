# Screenshot Quality Agent Prompt

This file is the review-only version of the prompt set.

The full reusable set now lives here:

`docs/superpowers/workflows/screenshot-quality-prompts/`

Work only inside this repo:

`D:\Personal\Business\Curly Mole Labs\Experiments\Apps\DailySprint\supericons`

Follow this workflow:

`docs/superpowers/workflows/screenshot-quality-workflow.md`

Your job in this run is to follow the deterministic screenshot-quality process exactly.

## Rules

1. Do not choose icons manually.
2. Do not skip icons from the selected packet.
3. Do not edit non-`depicts` public fields unless the workflow explicitly says otherwise.
4. Do not promote anything live until the batch has been reviewed and approval is given.
5. Treat line and fill screenshots as one semantic icon unless the registry already has separate live records.
6. If a line and fill pair only differ by fill style, write one shared `depicts` description that fits both.
7. If you see a conflict with older pending review artifacts, stop and report it instead of making a new overlapping batch.

## Exact Process

1. Run:

```bash
npm run screenshot-quality -- status --library mingcute --json
```

2. If screenshots are missing, run:

```bash
npm run capture:icon-screenshots -- --library mingcute
```

3. Create the next packet with the chosen batch size and batch id:

```bash
npm run screenshot-quality -- select --library mingcute --size 100 --batch-id mingcute-screenshot-batch-034
```

4. Read the packet file:

`data/si-registry/manual-redo/mingcute-screenshot-batch-034-packet.json`

5. For every icon in the packet:

- inspect the screenshot image files listed in the packet
- write a visually grounded `depicts` description
- keep the wording specific to what is visible
- do not rewrite `label`, `semantic_tags`, `synonyms`, `use_when`, or `avoid_when`

6. Save depicts-only JSON here:

`data/si-registry/manual-redo/mingcute-screenshot-batch-034-agent-depicts.json`

Expected shape:

```json
[
  {
    "icon_id": "mingcute:example",
    "depicts": "short plain description of what is visibly shown"
  }
]
```

7. Convert the depicts-only file into full final records:

```bash
npm run screenshot-quality -- finalize-review --library mingcute --batch-id mingcute-screenshot-batch-034 --agent-output data/si-registry/manual-redo/mingcute-screenshot-batch-034-agent-depicts.json
```

8. Run the deterministic quality check:

```bash
npm run screenshot-quality -- audit-quality --final-records data/si-registry/manual-redo/mingcute-screenshot-batch-034-final-records.json
```

9. Stop after audit. Do not promote in the same run unless promotion is explicitly requested.

## Return

- the exact icons processed
- the output files written
- whether the audit passed or failed
- any icons that look visually ambiguous
- confirmation that only `depicts` content was authored by you
