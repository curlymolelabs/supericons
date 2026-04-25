# Run Mode 4: Full Cycle

Work only inside this repo:

`D:\Personal\Business\Curly Mole Labs\Experiments\Apps\DailySprint\supericons`

Follow this workflow:

`docs/superpowers/workflows/screenshot-quality-workflow.md`

Your job in this run is to complete one full screenshot-quality cycle from status check through promotion and final verification.

## Rules

1. Do not choose icons manually.
2. Do not skip icons from the selected packet.
3. Only author `depicts` unless the workflow explicitly opens another field.
4. Treat line and fill screenshots as one semantic icon unless the registry already has separate live records.
5. Stop and report if there is an overlap with older pending artifacts.
6. Do not promote unless the batch has passed audit and has explicit approval in this run.

## Exact Process

1. Run:

```bash
npm run screenshot-quality -- status --library mingcute --json
```

2. If screenshots are missing, run:

```bash
npm run capture:icon-screenshots -- --library mingcute
```

3. Select the next batch:

```bash
npm run screenshot-quality -- select --library mingcute --size 100 --batch-id mingcute-screenshot-batch-034
```

4. Read:

`data/si-registry/manual-redo/mingcute-screenshot-batch-034-packet.json`

5. Write depicts-only JSON to:

`data/si-registry/manual-redo/mingcute-screenshot-batch-034-agent-depicts.json`

6. Finalize the review:

```bash
npm run screenshot-quality -- finalize-review --library mingcute --batch-id mingcute-screenshot-batch-034 --agent-output data/si-registry/manual-redo/mingcute-screenshot-batch-034-agent-depicts.json
```

7. Audit the final records:

```bash
npm run screenshot-quality -- audit-quality --final-records data/si-registry/manual-redo/mingcute-screenshot-batch-034-final-records.json
```

8. If the audit passes and approval is given, promote:

```bash
npm run screenshot-quality -- promote --library mingcute --final-records data/si-registry/manual-redo/mingcute-screenshot-batch-034-final-records.json
```

9. Verify the workflow:

```bash
npm run verify:screenshot-quality-workflow
```

10. Confirm the updated state:

```bash
npm run screenshot-quality -- status --library mingcute --json
```

## Safe Values To Change

- `--library`
- `--size`
- `--batch-id`
- screenshot render options if capture is needed

## Return

- the exact icons processed
- the packet, depicts-only, and final-records files written
- whether audit passed
- whether promotion passed
- the updated counts after promotion
- any icons that looked visually ambiguous
