# Run Mode 1: Status And Capture

Work only inside this repo:

`D:\Personal\Business\Curly Mole Labs\Experiments\Apps\DailySprint\supericons`

Follow this workflow:

`docs/superpowers/workflows/screenshot-quality-workflow.md`

Your job in this run is to inspect the current screenshot-quality state and prepare screenshots if they are missing.

## Rules

1. Do not create a new review batch in this run unless explicitly requested.
2. Do not write or rewrite `depicts` in this run.
3. Do not promote anything live in this run.
4. If screenshots already exist and pass the dry-run check, report that instead of doing extra work.

## Exact Process

1. Run:

```bash
npm run screenshot-quality -- status --library mingcute --json
```

2. Report:

- completed live count
- reviewed pending count
- untouched count
- the next untouched icons shown by the status command

3. If screenshots are missing or need to be created, preview the render targets:

```bash
npm run capture:icon-screenshots -- --library mingcute --dry-run --limit 20
```

4. If the dry run looks correct, render the screenshots:

```bash
npm run capture:icon-screenshots -- --library mingcute
```

5. Stop after capture and report what was found or rendered.

## Safe Values To Change

- `--library`
- `--limit`
- `--width`
- `--height`

## Return

- the current counts
- whether screenshots were already present or had to be rendered
- any capture issues
- the exact files or folders affected
