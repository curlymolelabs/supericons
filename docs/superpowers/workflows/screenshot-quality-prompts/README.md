# Screenshot Quality Prompt Set

These prompts are reusable templates for the deterministic screenshot-quality workflow.

They are universal in the sense that the structure stays the same across libraries and batches. You only swap in the run-specific values such as:

- `library`
- `batch size`
- `batch id`
- packet path
- agent output path
- final-records path

## Run Modes

1. [01-status-and-capture.md](</D:/Personal/Business/Curly Mole Labs/Experiments/Apps/DailySprint/supericons/docs/superpowers/workflows/screenshot-quality-prompts/01-status-and-capture.md>)
2. [02-review-only.md](</D:/Personal/Business/Curly Mole Labs/Experiments/Apps/DailySprint/supericons/docs/superpowers/workflows/screenshot-quality-prompts/02-review-only.md>)
3. [03-promotion-only.md](</D:/Personal/Business/Curly Mole Labs/Experiments/Apps/DailySprint/supericons/docs/superpowers/workflows/screenshot-quality-prompts/03-promotion-only.md>)
4. [04-full-cycle.md](</D:/Personal/Business/Curly Mole Labs/Experiments/Apps/DailySprint/supericons/docs/superpowers/workflows/screenshot-quality-prompts/04-full-cycle.md>)

## How To Use

- Pick the run mode that matches the job.
- Replace the library and batch values.
- Keep the rules section intact unless the workflow itself changes.
- Do not let the agent improvise around batch selection or promotion scope.

## Shared Rule

The agent should only author `depicts` unless the deterministic workflow explicitly opens another field.
