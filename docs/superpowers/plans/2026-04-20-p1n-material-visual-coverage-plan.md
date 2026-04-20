# P1-N Material Visual Coverage Plan

## Goal

Unlock local SVG coverage for the remaining `68` Material icons so the last unresolved purpose-chip slice can move from text-only review into proper visual review.

## Why this step exists

The purpose-chip rollout has reached a clear bottleneck:

- `72` icons are approved
- `4` icons are on hold
- `6` icons are reviewed drafts
- `68` icons remain staged

All `68` remaining staged icons share the same blocker:

- they are Material icons
- they have `metadata_only` payloads
- they are therefore stuck in `text_review`

This is no longer a semantic-shape problem. It is a visual-coverage problem.

## Scope

This step will:

1. create a reproducible seed script for the remaining `68` Material icons
2. fetch owned local SVG snapshots for those icons at the default export axes
3. rebuild the Material export manifest
4. rebuild the purpose-chip pilot and scale-up summaries
5. show how many of the `68` icons convert from text-only review into visual-ready work

This step will not:

- approve the `68` icons yet
- resolve their semantic outcomes yet
- widen Material ownership beyond the purpose-chip set unless needed by the same batch

## Rule for this slice

Use these rules:

- only seed the Material icons that are still in the `text_review` queue
- use the existing owned-cache storage path and manifest format
- keep this step reproducible so future rebuilds can refresh or expand the owned set cleanly

## Planned outputs

### Source and logic

- `scripts/seed-purpose-chip-material-coverage.mjs`

### Existing files updated

- `public/material-export-manifest.json`
- `data/si-registry/generated/purpose-chip-pilot-summary.json`
- `data/si-registry/generated/purpose-chip-scale-up-summary.json`
- `data/si-registry/generated/purpose-chip-full-coverage-summary.json`

### New summary output

- `data/si-registry/generated/purpose-chip-material-coverage-summary.json`

## Expected result

After this step:

- the remaining Material purpose-chip icons should have local SVG coverage
- the `text_review` queue should shrink or disappear
- the unresolved work should become a visual-review and approval problem instead of a missing-asset problem

## Verification

Run:

- `npm run seed:purpose-chip-material-coverage`
- `npm run build:material-export-manifest`
- `npm run build:purpose-chip-scale-up`
- `npm run verify:purpose-chip-scale-up`
- `npm run build`
