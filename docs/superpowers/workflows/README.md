# Supericons Workflow Index

This folder stores tracked workflow docs for Supericons.

Use these files when you want a reusable, versioned process that can be read by future agents and humans from the repo itself.

## What Lives Here

| Workflow | Purpose |
| --- | --- |
| [semantic-registry-redo.md](/D:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs/superpowers/workflows/semantic-registry-redo.md) | Deterministic semantic metadata redo using checklists, policy-sized approval batches, and live public registry promotion |

## Local vs Tracked

- The local operational workflow may also exist under `.agents/workflows/`.
- In this repo, `.agents/` is git-ignored, so files there are local-only.
- The docs in this folder are the tracked repo-level copy.

## When To Use The Semantic Registry Redo Workflow

Use [semantic-registry-redo.md](/D:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs/superpowers/workflows/semantic-registry-redo.md) when you need to:

- continue the current purpose icon redo
- redo a library in deterministic policy-sized batches
- show the exact public-schema JSON for approval
- promote approved records into the live public registry
- register and start a future library in the same redo system

New libraries should enter in calibration mode first. Increase batch size only after the user confirms the outputs are reliable.

## Current Verified Entry Point

The current redo system is grounded by:

- [redo-progress-summary.json](/D:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/data/si-registry/generated/redo-progress-summary.json)
- [checklists/index.md](/D:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs/superpowers/plans/checklists/index.md)
- [restart-order.json](/D:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/data/si-registry/manual-redo/restart-order.json)

Start there before you continue any redo work.
