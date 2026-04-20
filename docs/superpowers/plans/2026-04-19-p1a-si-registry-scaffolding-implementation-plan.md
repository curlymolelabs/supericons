# P1-A SI Registry Scaffolding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create the first real SI Registry foundation in code: a repo-native record structure, locked ID rules, controlled vocabularies, hybrid visibility rules, validation, and side-by-side projection outputs that prepare Supericons for semantic rollout without cutting over the live product yet.

**Architecture:** Build the registry as a repo-native source layer that sits beside the current product facts and current public indexes. P1-A should make the registry real in code, but it should not yet replace the live icon index, MCP index, or browse taxonomy. This is a scaffolding phase: define the record system, make the public/protected/private split explicit, validate it, generate preview projections, and keep the current product stable while the semantic pipeline takes shape.

**Tech Stack:** Vite SPA, vanilla JavaScript modules, JSON/JSONL registry records, Node build and verification scripts, existing `public/` and `mcp/public/` projection artifacts, existing premium pack manifest and free icon indexes.

---

## Roadmap Recap

This plan is the next step in the main roadmap already underway.

### Phase P0-A

Status: done

- shared product facts layer
- packs heading fix
- top-surface count and version drift cleanup

### Phase P0-B

Status: done

- launch-facing browser QA
- dependency audit for `main.js`, `store.js`, and `style.css`

### Phase P0-C

Status: done

- route policy module
- shell contract
- first docs extraction slice

### Phase P1-A

Status: this plan

- registry source tree
- locked record shape and ID rules in code
- preview projection build pipeline
- verification for registry integrity

### Phase P1-B

Status: next after this plan

- premium metadata normalization into full registry records
- small free-corpus pilot import

### Phase P1-C

Status: after P1-B

- automated semantic tagging pilot
- visual inspection pilot
- review queue tooling

The main rule is simple: do not bulk-tag the corpus or cut over product consumers until the registry itself is small, real, and trustworthy.

---

## What P1-A Must Answer

P1-A is successful only if it answers these questions in code, not just in strategy docs:

1. What is the main shared record shape for one icon?
2. What exact rule creates a valid SI registry ID?
3. Which fields are required now, and which are allowed later?
4. Which values are controlled vocabulary versus free text?
5. What files are true registry sources, and what files are generated projections?
6. How does the registry build without breaking the current site and MCP surfaces?
7. What checks fail fast if the registry starts drifting?
8. Which parts of the registry are public, which are protected, and which are private-only?

---

## Decisions Locked By This Plan

### 1. The registry is repo-native and registry-first

The source of truth lives in the repo, not in Supabase and not inside exported SVG metadata.

### 2. The registry follows a hybrid visibility model from day one

The registry is not fully public and not fully private.

It must support:

- public/open records for free/open icons
- protected records for premium icons
- private operational enrichment that never becomes a public output by default
- generated projections that can strip or include fields based on visibility rules

### 3. P1-A does not replace live product projections yet

The current live surfaces remain:

- `public/icon-index.json`
- `public/icon-index-solid.json`
- `public/icon-taxonomy.json`
- `mcp/public/icon-index.json`
- `public/packs/manifest.json`

P1-A may generate preview registry projections, but it must not silently swap production consumers yet.

### 4. IDs are locked early

The ID rule must be enforced in code:

- aggregated icons: `{source_library}:{source_name}`
- SI-native icons: `si:{name}`

No alternate ID style should be allowed during P1-A.

### 5. Coverage stays intentionally small at first

P1-A is not the phase for full corpus tagging.

It should include:

- a tiny premium sample set
- a tiny free pilot set
- enough records to prove the system, not enough to create operational drag

### 6. Browse facets do not cut over yet

The purpose chips and `public/icon-taxonomy.json` remain on the current seed path until a later explicit cutover.

### 7. The registry must be transparent about confidence and review state

Even in scaffolding, records should preserve the difference between:

- source identity
- visual depiction
- SI recommended purpose
- evidence
- confidence
- review state

---

## Hybrid Visibility Model

P1-A must make the hybrid model explicit in code and source files, not leave it implied.

### Visibility buckets

- `public_open_record`
  - free/open icon records that are safe for public read surfaces and public semantic projections
- `protected_premium_record`
  - premium icon records that may use the same registry shape but are not public by default
- `private_operational_enrichment`
  - telemetry, ranking features, editorial scoring, internal review notes, heuristics, or model traces that must never flow into public outputs by default
- `generated_public_projection`
  - stripped outputs safe for public site, public API, or public MCP-like read surfaces where applicable
- `generated_internal_projection`
  - internal-only outputs for ops, editorial review, ranking, or later automation workflows

### Minimum control fields for P1-A

P1-A should introduce explicit control fields for pilot records:

- `access_tier`
  - example values: `public_open_record`, `protected_premium_record`, `private_operational_enrichment`
- `projection_policy`
  - example values: `public_summary`, `internal_only`, `mcp_preview`, `future_public_record`

These do not replace semantic fields. They control where a record or field set is allowed to flow.

### P1-A rule of thumb

If a piece of data increases trust and product adoption without exposing Supericons' operating edge, it can be prepared for public projection.

If a piece of data exposes premium value, internal judgment, ranking logic, or operational leverage, it should remain protected or private.

---

## Scope

This plan includes:

- source directory structure for the SI Registry
- hybrid visibility rules and projection policies
- schema helpers and field guards in code
- locked ID helpers
- controlled vocabulary file(s)
- record fixtures for premium and free pilot icons
- a build step that generates preview projections
- verification that blocks invalid records and broken projections
- package scripts for build and verify

This plan does not include:

- bulk import of all premium icons
- bulk import of all free icons
- product UI changes that consume registry records directly
- browse facet cutover
- search ranking cutover
- MCP semantic payload cutover
- review queue UI
- auth or entitlement systems for visibility enforcement beyond build-time filtering

---

## File Structure

### New source files

- `data/si-registry/README.md`
  - explains which files are source records, which are generated outputs, and how the build flow works
- `data/si-registry/registry-manifest.json`
  - top-level registry metadata such as schema version, source groups, and build expectations
- `data/si-registry/visibility-model.json`
  - allowed access tiers, projection policies, and which outputs each tier may flow into
- `data/si-registry/controlled-vocabularies.json`
  - allowed values for `category`, `intent`, `domain`, `state`, `status`, and `review_state`
- `data/si-registry/records/premium-sample.json`
  - small premium sample records in full SI shape
- `data/si-registry/records/free-pilot.json`
  - small free-icon pilot records in full SI shape
- `data/si-registry/private/README.md`
  - explains what belongs in internal-only enrichment layers later, even if P1-A keeps this directory mostly empty

### New code files

- `lib/si-registry/id-rules.js`
  - create and validate SI registry IDs
- `lib/si-registry/visibility-rules.js`
  - load and validate access tiers and projection policies
- `lib/si-registry/record-shape.js`
  - required field list, allowed optional fields, and shape helpers
- `lib/si-registry/controlled-values.js`
  - load and validate controlled vocabularies
- `lib/si-registry/projections.js`
  - convert registry records into preview outputs

### New build and verification files

- `scripts/build-si-registry-projections.mjs`
  - read records, validate them, and write generated projection previews
- `scripts/verify-si-registry-projections.mjs`
  - fail on duplicate IDs, missing required fields, invalid controlled values, and projection drift

### New generated outputs

- `data/si-registry/generated/registry-summary.json`
  - quick facts about record count, source groups, and schema version
- `data/si-registry/generated/record-preview.json`
  - merged preview of normalized records for inspection
- `data/si-registry/generated/public-record-preview.json`
  - preview of what the public-safe projection would contain after visibility filtering
- `public/registry/summary.json`
  - optional public preview surface for later product use
- `mcp/public/registry-summary.json`
  - optional MCP-facing preview surface for later tool integration

### Files to modify

- `package.json`
  - add build and verify scripts
- `docs/superpowers/plans/2026-04-19-si-registry-prd-and-blueprint.md`
  - optionally link to the implementation plan once landed
- `docs/superpowers/plans/2026-04-19-si-semantic-rollout-roadmap.md`
  - optionally link P1-A completion status later

---

## Task 1: Create the Registry Source Skeleton

**Files:**

- Create: `data/si-registry/README.md`
- Create: `data/si-registry/registry-manifest.json`
- Create: `data/si-registry/visibility-model.json`
- Create: `data/si-registry/controlled-vocabularies.json`
- Create: `data/si-registry/records/premium-sample.json`
- Create: `data/si-registry/records/free-pilot.json`
- Create: `data/si-registry/private/README.md`

- [ ] Create the `data/si-registry/` directory structure.
- [ ] Add a README that states plainly:
  - registry source files live here
  - generated files are not edited by hand
  - current live product still reads old projections until later cutover
- [ ] Add a registry manifest with:
  - schema version
  - source record groups
  - projection targets
  - build timestamp field reserved for generated outputs
- [ ] Add a visibility model file with:
  - allowed `access_tier` values
  - allowed `projection_policy` values
  - which projection targets each tier may flow into
  - which tiers are always excluded from public outputs
- [ ] Add a first controlled vocabulary file covering:
  - `category`
  - `intent`
  - `domain`
  - `state`
  - `status`
  - `review_state`
- [ ] Add a tiny premium sample fixture set.
- [ ] Add a tiny free pilot fixture set.

**Guardrail:** Do not import all premium or free icons in this phase. Keep the samples small and editorially clear.

---

## Task 2: Lock the Hybrid Visibility Model in Code

**Files:**

- Create: `lib/si-registry/visibility-rules.js`
- Modify: `lib/si-registry/projections.js`
- Modify: `scripts/build-si-registry-projections.mjs`
- Modify: `scripts/verify-si-registry-projections.mjs`

- [ ] Load and validate `access_tier` values from `visibility-model.json`.
- [ ] Load and validate `projection_policy` values from `visibility-model.json`.
- [ ] Enforce that every P1-A pilot record declares:
  - `access_tier`
  - `projection_policy`
- [ ] Enforce that public preview outputs strip or exclude records that are not allowed to flow into public surfaces.
- [ ] Enforce that protected premium records can exist in the registry preview without becoming public outputs by default.
- [ ] Enforce that private operational enrichment is blocked from public preview outputs.

**Guardrail:** P1-A should enforce visibility at build and projection time. It does not need to build a full runtime auth system yet.

---

## Task 3: Lock the ID Rules in Code

**Files:**

- Create: `lib/si-registry/id-rules.js`
- Modify: `scripts/verify-si-registry-projections.mjs`

- [ ] Implement `buildRegistryId(record)`:
  - aggregated: `{source_library}:{source_name}`
  - SI-native: `si:{name}`
- [ ] Implement `isValidRegistryId(value)`.
- [ ] Implement `assertValidRegistryId(record)` for verification use.
- [ ] Add explicit failure cases for:
  - missing `source_library`
  - missing `source_name` for aggregated records
  - invalid `si:` native names
  - whitespace, uppercase, or duplicate separators if disallowed

**Verification expectation:** The script should fail loudly on any record whose ID cannot be derived cleanly.

---

## Task 4: Lock the Record Shape in Code

**Files:**

- Create: `lib/si-registry/record-shape.js`
- Create: `lib/si-registry/controlled-values.js`

- [ ] Encode the required fields for the current minimum record:
  - `icon_id`
  - `source_library`
  - `label`
  - `purpose`
  - `category`
  - `semantic_tags`
  - `use_when`
  - `avoid_when`
  - `version`
  - `status`
- [ ] Encode the required registry control fields for P1-A pilot records:
  - `access_tier`
  - `projection_policy`
- [ ] Encode optional fields allowed in P1-A.
- [ ] Keep support for:
  - source identity
  - visual depiction
  - SI recommended purpose
  - evidence
  - confidence
  - review state
- [ ] Validate controlled vocabulary fields against `controlled-vocabularies.json`.
- [ ] Validate obvious type expectations:
  - arrays are arrays
  - booleans are booleans
  - strings are strings

**Guardrail:** P1-A should validate record shape, not over-design a full schema engine. Keep the validation direct and readable.

---

## Task 5: Build the Preview Projection Pipeline

**Files:**

- Create: `lib/si-registry/projections.js`
- Create: `scripts/build-si-registry-projections.mjs`
- Create: `data/si-registry/generated/` output directory during build
- Optional create: `public/registry/summary.json`
- Optional create: `mcp/public/registry-summary.json`

- [ ] Read the premium and free pilot fixture files.
- [ ] Normalize them into one merged record list.
- [ ] Validate every record before projection.
- [ ] Generate a summary artifact that reports:
  - schema version
  - total record count
  - counts by source group
  - counts by review state
  - counts by premium/free
- [ ] Generate a normalized preview artifact for inspection.
- [ ] Generate a public-safe preview artifact after visibility filtering.
- [ ] Optionally generate lightweight public and MCP preview outputs to prove downstream packaging works.

**Guardrail:** These are preview projections. Do not overwrite the existing product icon indexes in P1-A.

---

## Task 6: Add Verification That Fails Fast

**Files:**

- Create: `scripts/verify-si-registry-projections.mjs`
- Modify: `package.json`

- [ ] Verify duplicate `icon_id` values fail.
- [ ] Verify missing required fields fail.
- [ ] Verify invalid controlled vocabulary values fail.
- [ ] Verify invalid `access_tier` values fail.
- [ ] Verify invalid `projection_policy` values fail.
- [ ] Verify derived IDs match stored `icon_id`.
- [ ] Verify generated summary counts match record-preview counts.
- [ ] Verify public preview outputs contain only records and fields allowed by visibility rules.
- [ ] Verify output files exist after build.
- [ ] Add package scripts:
  - `build:si-registry`
  - `verify:si-registry`

**Suggested command flow:**

```bash
node scripts/build-si-registry-projections.mjs
node scripts/verify-si-registry-projections.mjs
```

Later package script form:

```bash
npm run build:si-registry
npm run verify:si-registry
```

---

## Task 7: Define the No-Cutover Boundary Explicitly

**Files:**

- Modify: `data/si-registry/README.md`
- Optional modify: `docs/superpowers/plans/2026-04-19-si-registry-prd-and-blueprint.md`

- [ ] State clearly that P1-A does not replace:
  - `public/icon-index.json`
  - `mcp/public/icon-index.json`
  - `public/icon-taxonomy.json`
  - `public/packs/manifest.json`
- [ ] State that `scripts/build-icons.js` remains the active builder for current live free-icon projections during P1-A.
- [ ] State that registry preview outputs are inspection outputs only until P1-B or later.
- [ ] State that visibility filtering in P1-A is a build-time protection layer, not the final product access-control story.
- [ ] Define the handoff to P1-B:
  - expand premium records
  - add free pilot ingest path
  - compare registry outputs against legacy outputs before any cutover

---

## Task 8: Capture the First Registry Examples Clearly

**Files:**

- Modify: `data/si-registry/records/premium-sample.json`
- Modify: `data/si-registry/records/free-pilot.json`

- [ ] Include at least one premium icon example with:
  - rich semantic tags
  - a protected access tier
  - evidence
  - confidence
  - review state
- [ ] Include at least one aggregated free icon example with:
  - source identity
  - a public access tier
  - depiction note
  - SI recommended purpose
  - guidance fields
- [ ] If useful, include one placeholder example of private operational enrichment in a separate sample or README note so the boundary is explicit without overbuilding it in P1-A.
- [ ] Make these examples clean enough to become the reference examples for later imports and auto-tagging.

**Why this matters:** The first records will become the pattern people and tools copy. They should be boringly clear.

---

## Verification Checklist

Before calling P1-A complete, run:

```bash
node scripts/build-si-registry-projections.mjs
node scripts/verify-si-registry-projections.mjs
npm run build
```

Optional if P1-A adds package scripts:

```bash
npm run build:si-registry
npm run verify:si-registry
```

Manual inspection:

- open `data/si-registry/generated/registry-summary.json`
- open `data/si-registry/generated/record-preview.json`
- open `data/si-registry/generated/public-record-preview.json`
- confirm IDs and required fields read cleanly
- confirm protected and private records do not leak into public preview outputs
- confirm preview outputs do not overwrite live product artifacts

---

## Exit Criteria

P1-A is done when all of the following are true:

- the registry source tree exists in the repo
- record shape rules exist in code
- ID rules exist in code
- controlled vocabulary validation exists
- hybrid visibility rules and projection filtering exist
- a small premium and free pilot record set exists
- projection build works
- verification fails on bad registry data
- current live product artifacts remain unchanged as the active source

P1-A is not done merely because more strategy docs exist. It is done when the registry becomes a real buildable subsystem.

---

## Risks To Watch

### Risk 1: Overbuilding the schema before real records exist

Mitigation:

- keep validation direct
- prefer a small useful shape over a speculative framework engine

### Risk 2: Accidentally cutting over live consumers too early

Mitigation:

- keep preview outputs separate
- do not swap current public indexes in P1-A

### Risk 3: Sample records are too weak to guide later work

Mitigation:

- choose a few clear examples
- include both premium and aggregated records
- include evidence and review fields from day one

### Risk 4: The registry drifts from the written spec

Mitigation:

- keep the implementation plan, blueprint, and record helpers aligned
- update docs when the code locks a rule

### Risk 5: Protected or private data leaks into public projections

Mitigation:

- require `access_tier` and `projection_policy`
- make public projection filtering part of the build
- make public projection filtering part of verification

---

## Recommended Next Step After P1-A

If P1-A lands cleanly, the next implementation slice should be:

1. `P1-B premium normalization`
2. `P1-B free pilot import`
3. `P1-C auto-tagging and visual-inspection pilot`

That order matters because it lets Supericons prove the registry with the most semantically valuable records first, then scale automation from a stronger base.
