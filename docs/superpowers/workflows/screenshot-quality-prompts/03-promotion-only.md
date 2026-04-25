# Run Mode 3: Promotion Only

Work only inside this repo:

`D:\Personal\Business\Curly Mole Labs\Experiments\Apps\DailySprint\supericons`

Follow this workflow:

`docs/superpowers/workflows/screenshot-quality-workflow.md`

Your job in this run is to take an already approved screenshot-review final-records file and promote it into the live public registry.

## Rules

1. Do not create a new batch in this run.
2. Do not rewrite `depicts` in this run.
3. Do not change the reviewed batch contents before promotion unless a specific correction has already been approved.
4. Promote only the exact `*-final-records.json` file provided for this run.

## Exact Process

1. Confirm the exact file to promote, for example:

`data/si-registry/manual-redo/mingcute-screenshot-batch-034-final-records.json`

2. Run the audit one more time:

```bash
npm run screenshot-quality -- audit-quality --final-records data/si-registry/manual-redo/mingcute-screenshot-batch-034-final-records.json
```

3. If the audit passes and approval has already been given, promote:

```bash
npm run screenshot-quality -- promote --library mingcute --final-records data/si-registry/manual-redo/mingcute-screenshot-batch-034-final-records.json
```

4. After promotion, verify the workflow state:

```bash
npm run verify:screenshot-quality-workflow
```

5. Report the new live counts from:

```bash
npm run screenshot-quality -- status --library mingcute --json
```

## Safe Values To Change

- `--library`
- the exact final-records file path

## Return

- the exact final-records file promoted
- whether promotion passed
- the verification commands run
- the updated live and untouched counts
- confirmation that no new batch was started
