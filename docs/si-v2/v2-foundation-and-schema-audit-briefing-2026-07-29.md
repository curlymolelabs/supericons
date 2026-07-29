# SI v2 foundation and schema: audit briefing

Date: 2026-07-29. Purpose: independent review. This document compiles the v2
foundation work and the schema finalization discussion so a second reviewer can
form their own view. Recommendations below are attributed to the coordinator
session that produced them and are open to challenge. Counterarguments known at
writing time are listed with each proposal. Nothing here is final except items
explicitly marked as owner rulings.

Repository paths are relative to the `supericons` repo unless noted. The v2
skeleton lives in the sibling folder `../supericons-v2/` (outside the repo; the
live site is untouched by all of this).

---

## Part A. Work completed on the v2 foundation

### A1. Production skeleton (verified working)

`../supericons-v2/` contains a modular port of the owner-approved single-file
MVP: native ES modules, no dependencies, no build step. `node server.mjs`
serves on port 8932.

Structure: `src/app.js` (boot), `store.js` (state + localStorage + migration),
`search.js` (scored synonym search, honest zeros), `agent.js` (window.si, an
MCP-shaped surface), `api/index.js` (async facade of six calls: listIcons,
search, getIcon, logDemand, submitToGate, publish; mock today, designed as the
seam for a future `api/supabase.js` adapter), `api/seeds.js` (record schema and
seed data), `ui/main.js` (all DOM; splitting it is tracked debt).

Verification was done in a live browser against localhost, 2026-07-27:

- 84 tiles rendered, no icon visible twice (lane packing guarantees the loop
  twin is off-screen; short lanes go static).
- Grow-to-card works: one copy expands to a 222x314 card with stats, dual
  human/agent ratings, timestamps, media chip, actions.
- Full flywheel: zero-result search opened the make door, the Lab opened
  prefilled, candidates rendered, publish passed the mock taste gate, and the
  record landed on the map.
- Persistence across reload via localStorage, including schema migration.
- Agent parity: `await si.search_icons("quantum badge")` returned the record a
  human had just published (`community:quantum-badge-...`, license
  creator-owned).

Known limitations of that verification: it used scripted DOM probes plus
manual timing allowances (the embedded preview pane throttles timers and does
not composite CSS transitions). Two early false failures were traced to probe
timing, not product defects; the transcript details are in the session, and a
reviewer may want to re-run the flow by hand.

### A2. Documentation set produced

In `../supericons-v2/`: `README.md` (contracts, debts, drawing set),
`PLAN.html` (sitemap and phases P1..P5), `SCHEMA.md` (registry alignment,
summarized in Part B), `BLUEPRINT.html` (41-part layered dataset, the single
source of truth for the visuals), `MAP.html` (flat tracking view), plus
`scripts/gen-vault.mjs` which regenerates an Obsidian vault (48 notes, one per
part, wikilinked by dependency) and injects the same dataset into every visual.

Process note a reviewer may find relevant: two 3D visualizations
(`EXPLODED.html`, `TEARDOWN.html`) passed scripted verification but failed for
the owner in real use (camera controls; the embedded pane renders 3D as flat
snapshots). They were superseded by the flat `MAP.html`, which the owner
approved. Two real defects in MAP.html were found only after user-visible
symptoms or manual counting: a status missing from the filter set (one of 41
nodes invisible on load) and a CSS class collision (`.dec`) that broke a
progress bar. Both fixed and re-verified. The general lesson recorded: scripted
probe passes are not sufficient evidence of user-facing correctness.

### A3. Phases (proposed, not owner-ratified as a whole)

P1 harden the frame (module split, router, record-page template, a11y).
P2 read-only Supabase adapter composing records from the icon index plus live
take evidence plus the existing search engine. P3 labeled beta surface merged
into the main repo. P4 write paths (records table, taste gate, ratings, real
publish; requires a community license decision). P5 economy and default
cutover, gated on the master blueprint's evidence gates.

---

## Part B. Schema and registry: verified findings

These are facts checked against the repo on 2026-07-29, not opinions.

1. The authoring format in production is semantic record v1,
   `schemaVersion 1.0.0` per `data/si-registry/registry-manifest.json`,
   validated by `lib/si-registry/record-shape.js`
   (13 required fields, 16 optional, controlled vocabulary enforced for
   category, state, status, review_state).
2. Field census across all source record files: 15,209 records. The 18-19
   core fields are present in effectively all records. Five taxonomy fields
   (`ai_category`, `ai_category_label`, `ai_filter_tags`, `job_category`,
   `secondary_categories`) appear in only 106 records (the two first-party
   files `supericons.json` and `supericons-concepts.json`) and are absent from
   the validator's field lists entirely. They are consumed by the search layer
   (`lib/supericons-ai-taxonomy.js`, `lib/hosted-search-core.js`,
   `lib/semantic-search-documents.js`).
3. Naming convention conflict: registry vocabulary uses underscores
   (`everyday_objects`); the taxonomy overlay uses hyphens
   (`everyday-objects`). `secondary_categories` currently follows the hyphen
   convention while the universal schema document assigns it to the registry
   vocabulary.
4. A deeper layer exists as a pilot: 4 design records under
   `data/si-registry/source/design/` (Agent Pulse) using nested sections
   named face, soul, pulse, construction, with a v0 validator at
   `lib/si-registry/design-record-shape.js`. The full version is
   `docs/si-v2/design-record-schema-v1-proposal.md`, drafted 2026-07-06,
   status in the file: proposal awaiting owner approval.
5. A superset document exists: `docs/si-v2/supericon-schema-v1.md`
   (2026-07-06), five sections with public/gated/internal tier tags per field
   and projection rules. Its stated projection rule: approved records project
   their public fields into the existing v1 registry record shape.
   `lib/si-registry/projections.js` exists.
6. Search consumption today (verified in `lib/semantic-search-documents.js`):
   documents are built from label, purpose, semantic_tags, synonyms, use_when,
   avoid_when, depicts, plus the taxonomy overlay. `avoid_when` is indexed as
   document text; no evidence was found that it acts as a ranking anti-signal.

---

## Part C. Proposals on the table

Status key: RULED means the owner decided; OPEN means proposed with a
recommendation but not decided. The auditor is asked to evaluate all of them
on the merits, including the ruled one if they see a problem worth raising.

### C1. Section naming (RULED by owner, 2026-07-29)

JSON section names use literal industry terms; the metaphor vocabulary remains
product-surface language only. Mapping: face to `visual`, soul to `semantics`,
construction to `geometry`, pulse to `behavior`, hands to `actions`, wallet to
`economics`; `identity`, `community`, `process` unchanged.

Owner's rationale: immediate human readability and one vocabulary across DNA,
code, search, and conversation. The coordinator initially recommended keeping
the metaphor names for brand coherence and consistency with existing docs and
pilots, then reversed after weighing switch cost (currently low: 4 pilot
records, one skeleton file, doc prose) against long-term clarity.
Implication if upheld: the 4 design pilots, the universal schema doc, the v2
skeleton record shape, and related docs need a rename pass before further
records are authored in the old names.

### C2. Record shape for v2 (OPEN, coordinator recommends hybrid)

Proposal: supericon record v2 = the exact v1 flat core, unchanged, plus
optional nested section blocks (`visual{}`, `geometry{}`, `behavior{}`
absorbing today's `motion`, `actions{}`, `economics{}`, `community{}`,
`process{}`), each field tier-tagged public/gated/internal. Manifest bumps to
2.0.0; validator gains additive section checks.

Claimed consequences: every existing record is already a valid v2 record;
propagation to third-party libraries is a no-op with depth added per icon
later; the 4 design pilots fold into their icons' section blocks.

Alternatives considered: full nesting (rejected in-session for breaking all
tooling and forcing a 15,209-record migration) and staying flat forever
(rejected for leaving gated design intelligence without a structured home).
Points a reviewer may probe: whether hybrid creates a two-shape reading burden
for consumers; whether `motion` moving into `behavior{}` breaks any consumer;
whether tier tags belong in the schema doc only or also in machine-readable
form; versioning discipline for section evolution.

### C3. Taxonomy overlay fields (OPEN, coordinator recommends legalizing)

Add the five taxonomy fields to `OPTIONAL_RECORD_FIELDS` in
`record-shape.js`, documented as a search-facing overlay with its own
(hyphenated) convention, owned by the taxonomy module. Alternative: relocate
them out of records into the search index build, which is cleaner separation
but touches live search paths for no user-visible gain. A reviewer may weigh
whether "legalize the stowaways" sets a precedent for schema growth by
accretion rather than design.

### C4. `secondary_categories` convention (OPEN, coordinator recommends
registry vocabulary)

Make `secondary_categories` underscore vocabulary (validated), leaving
hyphenated values to `ai_filter_tags`. Requires correcting the 106 records
that currently hold hyphenated values there. Alternative: declare it part of
the taxonomy overlay and leave as is.

### C5. Design record proposal disposition (OPEN, coordinator recommends
approval-by-absorption)

Approve the 2026-07-06 design record schema by folding it into the v2 section
blocks (under the C1 literal names), retiring it as a separate pending
decision. Alternative: keep design records as a separate record species with
their own validator, which preserves separation of authoring concerns at the
cost of two record kinds to maintain.

### C6. Search synchronization contract (OPEN, coordinator proposal)

One-way flow: registry to build to search documents; search never writes back
into records (usage signals reach the DNA only through human curation). Add an
explicit search projection whitelist module naming exactly which record fields
enter search documents, so new sections change nothing in search until
admitted, gated fields cannot leak into the public index by construction, and
each index build records the registry fingerprint it was built from.

Noted opportunity, not yet designed: `avoid_when` is already indexed as text
and could become a ranking anti-signal (down-weighting icons whose avoid_when
matches the query). A reviewer may consider whether the whitelist should be
data (JSON) or code, and how parity is proven across a rebuild (a golden query
set exists in the search track).

### C7. Rollout order (OPEN)

1. Rulings C2..C5, then write the finalized schema doc (not a proposal) and
   the additive validator upgrade.
2. First-party supericons records (106) become the reference implementation:
   overlay legalized, conventions fixed, design pilots folded in.
3. Search projection module plus index rebuild, verified for before/after
   parity on the golden query set.
4. Third-party libraries: no migration required under C2; enrichment
   prioritized by demand and take evidence.

---

## Part D. Questions where a second perspective is most valuable

1. Does the hybrid shape (C2) hold up under adversarial reading, especially
   consumer complexity and the `motion` relocation?
2. Is legalizing the taxonomy overlay (C3) the right call versus relocating
   it, considering long-term schema hygiene?
3. Are there failure modes in the search projection contract (C6),
   for example fields search needs that the whitelist would forget, or
   fingerprint discipline that will not survive real release pressure?
4. Is anything in Part A's verification record insufficient as evidence, and
   what would you re-verify by hand before P1/P2 proceed?
5. Any risk in the propagation claim "every v1 record is already a valid v2
   record" that the census in Part B does not cover (for example the 9
   records carrying `state`, the 2 with `routing_score`, or archive paths)?

## Part E. Reproduction pointers

- Field census: iterate `data/si-registry/source/**.json`, count keys per
  record (script used in-session; trivially re-runnable with node).
- Validator lists: `lib/si-registry/record-shape.js` lines 5-45.
- Search consumption: `lib/semantic-search-documents.js` (document builders),
  `lib/hosted-search-core.js` (record normalization).
- Skeleton verification: serve `../supericons-v2/` with `node server.mjs`,
  exercise the flywheel by hand at http://localhost:8932.
- Visuals dataset: `../supericons-v2/BLUEPRINT.html` embedded `LAYERS` array;
  regenerate derived artifacts with `node scripts/gen-vault.mjs`.
