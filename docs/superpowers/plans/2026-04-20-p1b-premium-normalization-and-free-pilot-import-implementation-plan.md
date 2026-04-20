# P1-B Premium Normalization and Free Pilot Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand the SI Registry from a two-record scaffold into a meaningful working slice by normalizing all premium collection icons into the registry shape and by importing a slightly larger curated free pilot set, while keeping the hybrid visibility model intact.

**Architecture:** Keep the registry repo-native and keep the live product unchanged. Premium icons should be normalized from the existing pack manifest through explicit mapping rules, not hand-authored one by one. Free pilot icons should still be manually curated so the public-facing semantic layer stays clean while the premium protected layer grows quickly.

**Tech Stack:** Vite SPA, vanilla JavaScript modules, JSON source maps, existing premium pack manifest, existing free icon index, SI Registry helpers and build scripts from P1-A.

---

## Roadmap Recap

### P1-A

Status: done

- registry source tree exists
- ID rules exist
- hybrid visibility rules exist
- preview outputs build and verify

### P1-B

Status: this plan

- normalize all premium pack icons into registry records
- expand free pilot import from one record to a small curated set
- keep protected premium records out of public projections

### P1-C

Status: next after this plan

- automation pilot
- visual inspection pilot
- review queue tooling

---

## Critical Constraint

Premium raw icon names are not globally unique across packs.

That means P1-B must not assume raw pack icon names can safely become `si:{name}` ids.

Instead, P1-B should introduce a stable SI-native naming rule for premium imports, such as:

- `si:{collection-slug}-{icon-name}`

while preserving the original pack icon name separately for provenance.

---

## Scope

This plan includes:

- premium collection normalization rules
- unique SI-native name generation for premium icons
- expanded free pilot records
- updated registry build outputs and verification
- premium and free preview inspection outputs

This plan does not include:

- public premium record exposure
- runtime access control
- automation or visual model pipelines
- MCP semantic payload cutover
- full free corpus import

---

## File Structure

### New files

- `data/si-registry/source-maps/premium-collection-map.json`
  - collection-by-collection normalization rules
- `lib/si-registry/premium-normalization.js`
  - premium manifest to registry-record mapper

### Files to modify

- `data/si-registry/controlled-vocabularies.json`
- `data/si-registry/records/free-pilot.json`
- `data/si-registry/registry-manifest.json`
- `lib/si-registry/record-shape.js`
- `lib/si-registry/projections.js`
- `scripts/build-si-registry-projections.mjs`
- `scripts/verify-si-registry-projections.mjs`
- `package.json`

### Generated outputs expected after P1-B

- `data/si-registry/generated/registry-summary.json`
- `data/si-registry/generated/record-preview.json`
- `data/si-registry/generated/public-record-preview.json`
- `data/si-registry/generated/premium-record-preview.json`
- `data/si-registry/generated/free-record-preview.json`
- `public/registry/summary.json`
- `mcp/public/registry-summary.json`

---

## Task 1: Write the failing verification first

**Files:**

- Modify: `scripts/verify-si-registry-projections.mjs`

- [ ] Update expected counts from the two-record P1-A scaffold to the P1-B target.
- [ ] Verify:
  - total records include all premium icons plus the expanded free pilot
  - protected premium records stay out of public preview
  - premium normalized ids are unique
  - free pilot public records remain public-safe
- [ ] Run the verify script before changing build logic and confirm it fails for the right reason.

---

## Task 2: Define premium normalization rules

**Files:**

- Create: `data/si-registry/source-maps/premium-collection-map.json`

- [ ] Add one rule per premium collection slug.
- [ ] Define:
  - registry category
  - domain
  - intent default if needed
  - naming prefix strategy
  - use/avoid guidance context
- [ ] Keep the rules simple and readable. The file should explain how raw pack metadata becomes registry metadata.

---

## Task 3: Implement premium normalization in code

**Files:**

- Create: `lib/si-registry/premium-normalization.js`
- Modify: `lib/si-registry/record-shape.js`

- [ ] Read the pack manifest and collection mapping rules.
- [ ] Normalize all `400` premium icons into registry records.
- [ ] Preserve:
  - original pack slug
  - original raw icon name
  - original purpose
  - original tags
  - raw category if needed for provenance
- [ ] Generate stable SI-native names that avoid cross-pack collisions.
- [ ] Keep premium records as:
  - `access_tier = protected_premium_record`
  - `projection_policy = internal_only`
- [ ] Mark premium normalized review state honestly, for example `source_mapped`.

---

## Task 4: Expand the free pilot import

**Files:**

- Modify: `data/si-registry/records/free-pilot.json`
- Modify: `data/si-registry/controlled-vocabularies.json`

- [ ] Expand the free pilot from one record to a small curated set.
- [ ] Use real free icons that are semantically clear.
- [ ] Keep these as public-safe records:
  - `access_tier = public_open_record`
  - `projection_policy = future_public_record`
- [ ] Add any new controlled vocabulary values needed by the expanded pilot.

---

## Task 5: Update projections and generated outputs

**Files:**

- Modify: `lib/si-registry/projections.js`
- Modify: `scripts/build-si-registry-projections.mjs`

- [ ] Combine:
  - normalized premium records
  - curated free pilot records
- [ ] Write split preview files for:
  - all records
  - public-safe records
  - premium records
  - free records
- [ ] Keep public summary safe and do not expose premium record details.

---

## Task 6: Re-verify and run the full build

**Files:**

- Modify: `package.json` only if more commands are needed

- [ ] Run:
  - `node scripts/verify-si-registry-projections.mjs`
  - `npm run build:si-registry`
  - `npm run verify:si-registry`
  - `npm run build`
- [ ] Confirm the registry still integrates into the main build without changing live product consumers.

---

## Success Criteria

P1-B is done when:

- all `400` premium icons normalize into registry records
- premium ids are stable and collision-safe
- the free pilot is larger than the P1-A seed and still curated
- public preview contains only the curated public-safe free records
- premium records are visible only in internal previews
- full build stays green

---

## Next Step After P1-B

If this lands cleanly, the next step is P1-C:

- bulk-tagging automation pilot
- visual inspection pilot
- review queue design
