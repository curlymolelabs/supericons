# Simple Icons Batch 01 Brand Automation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Start the Simple Icons rollout with a first approved brand/logo batch that uses official brand identity semantics instead of generic UI-icon semantics.

**Architecture:** Reuse the shared semantic automation batch builder, but add a brand-specific template mode for Simple Icons. The batch should stage brand records from upstream Simple Icons metadata, then promote an approved first batch into the free SI registry path through a library-specific approval builder.

**Tech Stack:** Node.js scripts, JSON registry artifacts, existing SI registry validators and projection builders

---

## Scope

This slice covers only `Simple Icons batch 01`.

It should:
- add a Simple Icons brand template mode
- generate a staged batch using real Simple Icons metadata
- promote an approved first batch into the registry
- keep outputs public-safe and free of internal process metadata

It should not:
- finish the entire Simple Icons library
- change the live search ranking logic
- redesign the existing MingCute or purpose-chip workflow

## Design Notes

- Simple Icons are brand marks, not generic UI action icons.
- The semantic purpose should describe the icon as the official brand or product mark for a service, company, platform, or tool.
- The first-pass draft should lean on upstream fields already shipped by `simple-icons`, especially `title`, `slug`, `source`, and `guidelines`.
- Brand records should avoid pretending a logo means a generic action like delete, refresh, send, or warning.
- Where the brand domain is obvious, the draft may route it into a broad domain like `commerce`, `communication`, `developer_tools`, or `ai_agents`.
- Where the brand domain is not obvious, the batch should fall back to a neutral brand domain instead of inventing detail.

## File Map

### New
- `data/si-registry/automation/simpleicons-batch-01-selection.json`
- `data/si-registry/automation/simpleicons-batch-01/`
- `data/si-registry/automation/simpleicons/approved-records.json`
- `data/si-registry/automation/simpleicons/promotion-decisions.json`
- `data/si-registry/generated/simpleicons-approval-summary.json`
- `docs/superpowers/plans/2026-04-21-p2g-simple-icons-batch-01-brand-automation-plan.md`
- `docs/superpowers/plans/2026-04-21-p2g-simple-icons-batch-01-brand-automation-plan.html`
- `scripts/build-simpleicons-approved-records.mjs`
- `scripts/verify-simpleicons-approved-records.mjs`

### Modify
- `data/si-registry/automation/library-order.json`
- `data/si-registry/controlled-vocabularies.json`
- `data/si-registry/registry-manifest.json`
- `lib/si-registry/semantic-automation-config.js`
- `lib/si-registry/semantic-automation.js`
- `package.json`

## Tasks

### Task 1: Add Simple Icons brand vocabulary and batch config

**Files:**
- Modify: `data/si-registry/automation/library-order.json`
- Modify: `data/si-registry/controlled-vocabularies.json`
- Create: `data/si-registry/automation/simpleicons-batch-01-selection.json`

- [ ] Add the correct `simpleicons` library id to the automation order and keep `brand_semantics` as its template mode.
- [ ] Add any new controlled vocabulary values needed for brand/logo records.
- [ ] Create a first batch selection config for about `200–300` Simple Icons records.

### Task 2: Teach the shared automation builder brand semantics

**Files:**
- Modify: `lib/si-registry/semantic-automation-config.js`
- Modify: `lib/si-registry/semantic-automation.js`

- [ ] Extend batch discovery helpers so Simple Icons batch files can be loaded the same way as MingCute.
- [ ] Add a brand-mode path that builds draft records from Simple Icons metadata instead of UI-token heuristics.
- [ ] Keep staged records private and public-safe.
- [ ] Make sure the builder still validates every staged record with the existing registry validator.

### Task 3: Wire batch build and promotion for Simple Icons

**Files:**
- Create: `scripts/build-simpleicons-approved-records.mjs`
- Create: `scripts/verify-simpleicons-approved-records.mjs`
- Modify: `data/si-registry/registry-manifest.json`
- Modify: `package.json`

- [ ] Add a library-specific approval builder that converts reviewed Simple Icons records into approved registry records.
- [ ] Register the approved Simple Icons record group in the SI registry manifest.
- [ ] Add npm commands for building and verifying the approved Simple Icons set.

### Task 4: Generate batch 01 and seed its first approvals

**Files:**
- Create: `data/si-registry/automation/simpleicons-batch-01/`
- Create: `data/si-registry/automation/simpleicons/promotion-decisions.json`
- Create: `data/si-registry/automation/simpleicons/approved-records.json`
- Create: `data/si-registry/generated/simpleicons-approval-summary.json`

- [ ] Run the shared batch builder for `simpleicons-batch-01`.
- [ ] Seed a first reviewed-and-approved slice from that batch so the library is not left as staged-only.
- [ ] Rebuild registry projections after the approved records are registered.

### Task 5: Verify and summarize

**Files:**
- Modify: generated registry outputs as needed

- [ ] Run batch verification for `simpleicons-batch-01`.
- [ ] Run approved-record verification for Simple Icons.
- [ ] Run the SI registry build and verification.
- [ ] Run the full project build.
- [ ] Record the resulting batch size, approved count, and new registry totals.

## Verification Commands

- `npm run build:semantic-automation-batch -- simpleicons-batch-01`
- `npm run verify:semantic-automation-batch -- simpleicons-batch-01`
- `npm run build:simpleicons-approved-records`
- `npm run verify:simpleicons-approved-records`
- `npm run build:si-registry`
- `npm run verify:si-registry`
- `npm run build`

## Expected Outcome

At the end of this slice:
- Simple Icons has its own brand-safe semantic template
- batch 01 is staged successfully
- a first approved Simple Icons slice is live in the free SI registry path
- the repo is ready to continue library-by-library through later Simple Icons batches
