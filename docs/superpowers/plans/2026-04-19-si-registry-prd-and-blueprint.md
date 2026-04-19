# SI Registry PRD and Blueprint

Status: Draft for alignment  
Date: April 19, 2026  
Owner: Supericons

## One-Sentence Product

The SI Registry is the canonical, versioned system that defines what every Supericons icon is, what it means, how it should be used, and how that meaning flows into search, MCP, UI, export, and future programmable icon behavior.

---

## Product Questions We Must Keep Asking

This document uses a Socratic and design-thinking posture on purpose. Before we build the registry, we should keep pressure-testing it with questions like:

- What problem does the registry solve that the current search index does not?
- What becomes easier, safer, or more differentiated if the registry exists?
- What should be public because openness increases adoption?
- What should stay private because that is where operating leverage lives?
- What should be true for every icon record before we call the system real?
- What part of this needs to exist before launch, and what part can grow after launch?

---

## Problem Statement

Supericons currently has useful pieces of semantic intelligence, but they are split across disconnected layers:

- public free icon indexes
- curated alias maps
- taxonomy seed files
- premium pack manifests
- hosted search private tables
- strategy docs and editorial intent

That creates five problems:

1. There is no single semantic source of truth.
2. Search, MCP, UI, docs, and exports cannot all rely on the same meaning system.
3. Counts, labels, and semantic claims drift across surfaces.
4. The current search engine can retrieve related icons, but it cannot yet guarantee a stable semantic contract.
5. Future ideas like self-describing exports, intent-based selection, motion-aware icons, and programmable icon behavior have no canonical home.

The SI Registry exists to solve those problems.

---

## Why Now

Why build this now instead of later?

- The search improvements already proved that semantic retrieval creates real value.
- The strategy has outgrown the current data model.
- The purpose chip experiment and premium metadata both need a canonical semantic backbone.
- Launch readiness depends on narrowing the product story, but long-term differentiation depends on a stronger semantic system.

So the registry is both:

- a launch-discipline tool
- a long-term strategic foundation

---

## Users

### 1. Builders and designers

They need:

- the right icon faster
- confidence that the icon means what they think it means
- usage guidance, not just a glyph

### 2. Coding agents

They need:

- machine-readable meaning
- a stable retrieval contract
- explanations for why an icon matched

### 3. Supericons itself

The product needs:

- one canonical meaning layer
- one canonical count/version source
- one system to drive search, MCP, UI, docs, and future exports

### 4. Future external adopters

If SI grows into a broader standard, external systems may want:

- public registry lookups
- self-describing export support
- validation against the SI schema

---

## Goals

### Primary goals

- establish one canonical semantic source of truth for icons
- support every current product surface from that source
- make semantic metadata progressive, auditable, and reviewable
- allow self-describing exports to be generated from canonical records
- create a platform for future intent-based icon retrieval

### Secondary goals

- centralize product facts like counts and semantic coverage
- support progressive automation of metadata generation
- create a durable bridge toward motion, state, and programmable icon behavior

---

## Non-Goals

The SI Registry is not, at least in its initial phases:

- a replacement for SVG rendering itself
- a promise that every icon meaning is objectively true
- a fully decentralized or multi-vendor standard on day one
- a launch blocker for 100 percent manually reviewed coverage
- a reason to rewrite the app before launch

---

## What the SI Registry Is

At its core, the registry is a versioned canonical record layer.

Each record answers:

- identity
- visual depiction
- SI recommended purpose
- usage guidance
- accessibility defaults
- dynamic capability
- evidence and review state

Everything else should be generated or synced from these records.

---

## Similar Patterns and Useful Analogies

The SI Registry is not identical to any single existing system, but these analogies are useful:

### Simple Icons

Useful analogy:

- a public corpus of icon data with disciplined naming and structured records

What SI adds:

- semantic purpose
- usage guidance
- confidence
- motion and future programmability

### Material Symbols

Useful analogy:

- a structured icon system with variant axes and a cohesive family model

What SI adds:

- registry semantics beyond rendering variants

### OpenAPI

Useful analogy:

- a canonical spec that many tools, clients, and workflows can generate from

What SI adds:

- visual and semantic meaning rather than API endpoint meaning

### Design Tokens

Useful analogy:

- a vendor-neutral schema that many downstream tools can consume

## Competitive reality check

The registry should be judged against what strong adjacent systems already do well:

### Simple Icons

Already strong at:

- disciplined naming
- public JSON records
- license and source provenance

Still weak for SI goals:

- no `use_when`
- no `avoid_when`
- no confidence or review state
- no motion-aware semantic layer

### Material Symbols

Already strong at:

- cohesive family system
- rendering axes and variants

Still weak for SI goals:

- no editorial usage guidance
- no explicit depiction-versus-recommendation model
- no confidence-aware semantic review flow

### Iconify

Already strong at:

- aggregation
- unified delivery
- broad icon-set coverage

Still weak for SI goals:

- no SI-style semantic judgment layer
- no `anti_pairs`
- no review-state model
- no semantic-motion bridge

Fields that should remain clearly differentiated for SI:

- `use_when`
- `avoid_when`
- `anti_pairs`
- `depicts`
- `confidence_score`
- `review_state`
- `motion_family`

What SI adds:

- visual semantics, retrieval logic, and export behavior

The important entrepreneurial insight is this:

The registry is valuable not because the concept is impossible to copy, but because it creates operational leverage, product consistency, and an ecosystem surface others can build against.

---

## Public vs Private Posture

## Recommended approach

Adopt a hybrid model.

### Public

These should be open or publicly readable:

- the SI metadata schema
- controlled vocabulary definitions
- free/open icon registry records
- the public registry API for free/open records
- self-describing export format documentation

Why:

- openness increases adoption
- public schema encourages ecosystem tooling
- free registry transparency improves trust

### Private

These should stay private:

- telemetry
- ranking features
- behavioral scores
- manual boosts and penalties
- premium entitlements
- premium asset delivery
- commercially sensitive editorial heuristics

Why:

- this is where operating leverage and monetization discipline live

### Strategic position

The schema should be open. The intelligence and commercial layer should remain private.

That balances adoption and defensibility.

---

## Architecture Blueprint

## Canonical layer

Repo-native SI Registry records.

Recommended source-of-truth format:

- structured JSON or JSONL
- versioned in-repo
- validated at build time

## Projections

The registry should project into:

1. `public/icon-index.json`
2. `mcp/public/icon-index.json`
3. Supabase `icon_catalog`
4. Supabase `icon_metadata`
5. Supabase private hosted search manifest tables
6. SVG embedded `si:icon` passport metadata
7. compact `si://` payload
8. product facts and counters
9. browse facets and docs surfaces

## Registry ID rule

The registry must lock one ID rule early and keep every projection aligned to it.

Rule:

- aggregated icons use `{source_library}:{source_name}`
- SI-native icons use `si:{name}`

Compatibility notes:

- MCP responses may still expose `id` and `library` separately, but they must derive the same registry ID
- taxonomy seed entries that already use `library:name` format are compatible with the aggregated icon rule

## Build pipeline transition

The registry should not introduce a second source of truth for `icon-index.json`.

### Today

- `scripts/build-icons.js` reads installed icon packages
- it generates `public/icon-index.json` and related free-corpus artifacts directly
- `mcp/public/icon-index.json` follows as a copied or packaged derivative

### Bridge phase

- keep `scripts/build-icons.js` as the raw icon-ingest and validation stage
- add registry projection scripts that read SI registry records and validated raw-ingest outputs
- compare legacy and registry-generated outputs before any cutover

### Cutover rule

- `public/icon-index.json` and `mcp/public/icon-index.json` must ship from one projection path only
- after cutover, `scripts/build-icons.js` should stop writing the final public artifact directly
- if needed, `scripts/build-icons.js` becomes a raw package importer, validator, or source snapshot builder

### Required verification before cutover

- same total icon counts where intended
- same ID resolution for existing free icons
- same library coverage
- explicit diff report for any intentional output change

## MCP integration map

Registry integration should be bounded by tool, not treated as one vague MCP task.

| Tool | Registry dependency | Planned registry use |
|---|---|---|
| `search_icons` | High | `label`, `purpose`, `semantic_tags`, `synonyms`, `confidence_score` |
| `get_icon` | High | identity, depiction, `use_when`, `avoid_when`, review metadata |
| `list_libraries` | Medium | library-level facts, counts, provenance labels |
| `list_motion_presets` | Low | independent today, optional semantic alignment later |
| `get_motion_recipe` | Low | optional future alignment with `motion_family` |
| `export_motion_css` | Medium | optional future consistency checks for motion-capable icons |
| `export_animated_svg` | Medium | optional future consistency checks for motion-capable icons |
| `animate_icon` | Medium | optional future consistency checks for motion-capable icons |
| `inspect_converter_options` | None | independent utility tool |
| `inspect_converter_input` | None | independent utility tool |
| `convert_svg_to_png` | None | independent utility tool |
| `convert_png_to_svg` | None | independent utility tool |

Priority order:

1. `search_icons`
2. `get_icon`
3. `list_libraries`
4. motion tools where semantic alignment adds user value

## Ingestion and enrichment pipeline

For aggregated icons:

1. source ingest
2. lexical suggestion
3. visual inspection
4. contextual enrichment
5. confidence scoring
6. review routing
7. publish registry record

For SI-native icons:

1. intentional design brief
2. authored semantic record
3. visual review
4. optional motion/state enrichment
5. publish

---

## Why Registry-First Beats DB-First

A database-first live counter or live metadata system is useful for dashboards and operations, but weak as the canonical product source.

### Why DB-first is tempting

- live counts
- easy admin views
- centralized updates

### Why DB-first is weak as the main source

- harder to reproduce locally
- npm package and static site can drift from runtime truth
- product copy and docs become dependent on live services
- repo history stops being the clearest source of truth

### Better model

- registry records live in repo
- build scripts generate facts and projections
- database is synced from registry outputs
- dashboards may still read DB live, but product truth starts in the registry

That gives us reproducibility without losing runtime power.

---

## Governance Model

### Who owns the truth?

Supericons owns the final editorial recommendation for SI fields.

### Who proposes?

- source ingest
- lexical taggers
- visual inspection models
- telemetry-informed suggestion systems

### Who approves?

- human review for high-value or low-confidence icons
- editorial approval for final controlled-vocabulary changes and sensitive semantic records

### What must be reviewable?

- why the record exists
- why a field was assigned
- what model or process proposed it
- how confident the system is

## Minimum review tooling

The review model is not real until at least one review surface exists.

Minimum acceptable first version:

- pending-record list
- current-versus-proposed metadata comparison
- approve, reject, and edit actions
- audit trail for who changed what
- filtering by confidence, collection, and category

A CLI is acceptable first. An admin page can follow later.

---

## Progressive Rollout Philosophy

The registry should not require perfect coverage before it becomes useful.

Recommended progression:

1. schema finalization
2. premium metadata normalization
3. top free-icon slice coverage
4. search projection integration
5. public registry API for free records
6. self-describing export embedding
7. intent-based MCP retrieval

This is the product-builder version of “start small, but do not give up early.”

---

## Taxonomy seed transition decision

The current taxonomy seed should be treated as a short-lived bootstrap layer, not a second permanent ownership system.

Decision:

- keep the current 3-chip seed only for the narrow `All Icons` experiment
- allow the seed to bootstrap early tagging and QA
- do not expand long-term category ownership in the seed file
- once registry-backed browse facets are ready, replace the seed-driven browse projection in one explicit cutover
- after cutover, keep the seed only as historical input if it still adds training or QA value

## Business hypotheses to validate

The registry needs a business case, not just a technical one.

Working hypotheses:

1. Better semantic search raises successful free-session completion and improves premium conversion on intent-heavy searches.
2. Better MCP explanations increase API key activation, retained developer usage, and trust in paid access.
3. Richer premium metadata improves perceived pack value and makes premium collections easier to merchandise.
4. Better semantic quality reduces confusion, poor icon choice, and support burden.

## Success Metrics

### Launch-adjacent success

- one canonical product facts layer exists
- premium metadata normalized into the registry shape
- top free icons receive reviewed semantic records
- packs heading and shell-title drift are fixed
- build cutover plan is documented and agreed

### Foundation success

- one record shape drives all major projections
- count/version drift drops toward zero
- semantic record coverage grows continuously
- confidence-aware review workflow exists
- per-tool MCP integration scope is explicit

### Strategic success

- `request_semantic_icon` becomes feasible and trustworthy
- SVG passport metadata can be generated directly from registry records
- native SI icons become the highest-quality semantic tier
- semantic quality shows measurable lift in conversion, activation, or retention signals

---

## Risks

### Risk 1: Over-design before shipping

Mitigation:

- ship the schema and first projections before full ecosystem ambitions

### Risk 2: Semantic overclaiming

Mitigation:

- separate depiction from recommendation
- require evidence and confidence

### Risk 3: Coverage stalls

Mitigation:

- use progressive automation and cadence-based review

### Risk 4: Refactor drift while integrating projections

Mitigation:

- dependency audits before extractions
- one boundary at a time
- strong regression verification

---

## Key Product Decisions Locked By This Blueprint

1. The SI Registry is registry-first, not SVG-first and not DB-first.
2. SVG self-describing metadata is a projection from the registry, not the source of truth.
3. The public schema should be open.
4. The free/open registry records should be public.
5. Telemetry, ranking, and commercial layers stay private.
6. Semantic records express SI editorial recommendation, not objective universal truth.
7. Evidence, confidence, and review state are first-class.

---

## Final Recommendation

Build the SI Registry as the semantic operating system of Supericons.

Do not position it as “just more metadata.” Position it internally as the system that makes these things possible:

- trustworthy semantic search
- intent-based MCP retrieval
- stable browse facets
- self-describing exports
- motion-aware semantic icons
- a future public registry standard if adoption earns it

The short technopreneur version is:

The registry is not merely a database. It is the leverage layer that turns Supericons from a useful icon search product into a durable semantic icon platform.
