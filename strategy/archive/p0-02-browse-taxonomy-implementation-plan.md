# P0.02 Browse Taxonomy Refactor: Implementation Plan

**Date:** April 16, 2026  
**Status:** Ready for implementation  
**Context:** P0.01 and P0.02 data foundations are live. The taxonomy model is correct. The current browse UI expression is not.

---

## 1. Executive Decision

Supericons should **not** expose job categories as a top-level sidebar navigation system.

The correct implementation is:

- `Libraries` remain a primary browse axis in the sidebar
- `Purpose` becomes a secondary filter axis above the grid
- `Search` remains the primary discovery mechanism
- `GitHub free kits` remain a separate distribution surface, not site IA
- `Taxonomy + telemetry` remain the underlying intelligence layer

This plan refactors the current `Jobs` sidebar implementation into a **search-led, faceted browse model**.

### Copy guidance

- Use `Purpose` as the site chip-row label because it is shorter and more natural.
- Treat `job_category` as an internal-only DB/code field and never user-facing copy.
- Use `Purpose` / `Top Purposes` / `Purpose` in product UI, while keeping `job_category` unchanged internally.
- Do not expose `Job Categories` anywhere in product UI.

---

## 2. Problem Statement

The current implementation introduced a `Jobs` section in the sidebar:

- `AI & Agents`
- `Navigation & Wayfinding`
- `Status & Feedback`

This created the wrong mental model:

- it makes `Purpose` look equivalent to `Library`
- it prevents compound exploration like `Lucide + AI & Agents`
- it conflates internal taxonomy with GitHub distribution packs
- it teaches users that Supericons is a category browser first, instead of a semantic icon explorer

The data layer is correct. The issue is the **information architecture and UI surface**.

---

## 3. Product Principle

Supericons should express taxonomy through **facets**, not **navigation branches**.

Human users need:

- search for known intent
- quick browse by purpose
- library filtering
- low-friction visual scanning

Agents need:

- stable IDs
- semantic aliases
- use-case classification
- suitability metadata
- structured ranking signals

GitHub users need:

- curated downloadable packs
- clear README-driven discovery
- no dependency on site browse IA

Therefore:

- **Site UI** = search + filters + library browse
- **GitHub kits** = curated distribution assets
- **Taxonomy system** = shared semantic substrate beneath both

---

## 4. Target UX Model

### Primary surfaces

1. **Search bar**
   - primary entry point
   - semantic search remains the core differentiator

2. **Library sidebar**
   - `All Icons`
   - `Favorites`
   - `Recent`
   - library list

3. **Purpose chip row above grid**
   - `All`
   - `AI & Agents`
   - `Navigation & Wayfinding`
   - `Status & Feedback`
   - future categories can be added here

### Interaction model

- selecting a library filters by source
- selecting a purpose chip filters by taxonomy
- selecting both performs **intersection**
- search applies on top of both

Example:

- `Lucide + AI & Agents + "quota"` = Lucide AI-related icons matching quota-like semantics
- `All Libraries + Status & Feedback` = all status icons across libraries

---

## 5. Scope

### In scope

- remove `Jobs` as sidebar browse IA
- preserve taxonomy data and telemetry
- add purpose filter chips above the grid
- update filtering logic to support `Library AND Purpose`
- improve search vocabulary for AI/domain terms in `public/synonyms.json`
- mirror synonym updates to `mcp/public/synonyms.json`
- define a lightweight curated precision layer for the seeded 150 icons

### Out of scope

- tagging all 20K icons manually
- server-side faceted search backend
- GitHub kit repo creation and release packaging
- full agent-ranking or scoring changes
- redesigning the whole site

---

## 6. Implementation Strategy

### Phase 1: Correct the browse IA

**Goal:** Remove the wrong mental model with minimal risk.

#### Changes

- Remove the `Jobs` section from the sidebar
- Add a new `Purpose` chip row above the grid header
- Introduce dedicated state for purpose filtering rather than overloading `state.activeLibrary`

#### Files

- `index.html`
- `main.js`

#### Technical design

Add a new state field:

```js
activeJobCategoryFilter: 'all'
```

Replace the current `job:`-based browse behavior with:

- `state.activeLibrary` for library/favorites/recent/all
- `state.activeJobCategoryFilter` for purpose selection

Update filtering order in `applyFilters()`:

1. choose icon set by style
2. apply library filter
3. apply purpose filter
4. apply search
5. apply popularity sort where relevant

#### Acceptance criteria

- no `Jobs` section appears in the sidebar
- purpose chips render above the grid
- library and purpose filters work together
- telemetry still records `job_category`
- existing library browse behavior still works

---

### Phase 2: Strengthen semantic search

**Goal:** Improve known-need retrieval without new IA complexity.

#### Changes

Expand synonyms using the editorial source in `strategy/kit01-icon-reference-guide.html`.

Priority terms:

- `quota`
- `tool call`
- `tool-call`
- `guardrail`
- `langchain`
- `langgraph`
- `pinecone`
- `weaviate`
- `chroma`
- any other AI/agent terms documented in the guide but missing or weakly covered

#### Files

- `public/synonyms.json`
- `mcp/public/synonyms.json`

#### Notes

Some terms already have partial coverage:

- `observability`
- `rag`

These should be reviewed, not blindly duplicated.

#### Acceptance criteria

- known AI-domain queries return useful related results instead of zero-result states
- web and MCP synonym corpora stay aligned
- no regression in generic search behavior

#### Minimum synonym verification matrix

| Query | Expected icon | Expected tier | Notes |
|---|---|---|---|
| `quota` | `lucide:cpu` | Tier 2 | Should appear via synonym expansion rather than staying a zero-result query. |
| `langgraph` | `lucide:workflow` | Tier 2 | Should resolve through orchestration/workflow vocabulary. |
| `tool call` | `material:webhook` | Tier 2 | Should resolve through tool-call/webhook vocabulary. |
| `guardrail` | `tabler:shield-check` | Tier 2 | Should resolve through safety/security vocabulary. |

---

### Phase 3: Add precision metadata for curated icons

**Goal:** Reduce noisy matches for the curated seed without tagging the full catalog.

#### Changes

Introduce a lightweight alias/tag layer for the 150 seeded icons only.

Recommended format:

- new JSON or JS map keyed by canonical `icon_id`
- each icon maps directly to a flat array of curated aliases
- no extra semantic fields in Phase 3

Example:

```json
{
  "tabler:api": ["tool call", "function call", "agent tool", "external service call"],
  "lucide:workflow": ["langgraph", "orchestration", "agent flow", "pipeline"],
  "lucide:eye": ["observability", "trace", "inspect", "monitor"]
}
```

#### Files

- recommended new file: `lib/icon-semantic-aliases.js`
- `main.js`
- `mcp/search.js`

#### Search behavior change

Update search matching so curated aliases are checked before broad substring-based synonym matches.

Apply this same alias source to both:

- site search
- MCP search

This improves precision for queries like:

- `tool call`
- `observability`
- `langgraph`
- `semantic search`

without requiring full-catalog tagging.

#### Acceptance criteria

- curated AI queries rank the intended icons earlier
- noise from substring collisions is reduced on the curated set
- the site and MCP return the same intended first-tier icon family for the seeded concept queries
- the architecture remains lightweight and uses one shared alias source of truth

#### Minimum curated-alias verification matrix

| Query | Expected icon | Expected tier | Notes |
|---|---|---|---|
| `tool call` | `tabler:api` | Tier 1 | Curated alias should elevate the API-interface concept above generic tool-related matches. |
| `observability` | `lucide:eye` | Tier 1 | Curated alias should make the intended inspection icon first-class. |
| `langgraph` | `lucide:workflow` | Tier 1 | Curated alias should outperform broad orchestration synonyms. |
| `semantic search` | `lucide:shuffle` | Tier 1 | Curated alias should beat generic database/search substring noise with the more accurate retrieval metaphor. |

---

### Phase 4: Measure and iterate

**Goal:** Let the evidence layer guide future taxonomy expansion.

#### Changes

- complete a Phase 4A admin language pass before deeper analytics work:
  - rename `Top Job Categories` to `Top Purposes`
  - rename the evidence table column `Category` to `Purpose`
  - render human labels like `AI & Agents` instead of raw slugs like `ai-agent-workflows`
  - use `Purpose` as the site chip-row label
- add one explicit explanatory note in admin:
  - blank `Purpose` means the icon was outside the seeded taxonomy or no purpose filter was active during the event
- use `icon_evidence` to identify:
  - zero-result queries
  - low-conversion search queries
  - repeated replacements after specific queries
- use this data to drive:
  - next synonym additions
  - next alias/tag additions
  - next taxonomy expansion

#### Files

- no immediate UI changes required
- monitor through:
  - `public.icon_evidence`
  - `public.icon_scores`
  - admin intelligence views

#### Acceptance criteria

- no user-facing admin copy exposes `Job Categories`
- admin renders human-readable purpose labels instead of raw taxonomy slugs
- admin explains blank purpose values so seeded-taxonomy gaps do not look like broken data
- search improvements are driven by actual evidence, not guesswork
- future semantic coverage expands where users and agents actually need it
- one weekly review uses search evidence to justify the next synonym or alias additions

---

## 7. File-by-File Plan

### `index.html`

#### Remove

- `Jobs` section title
- `#jobList` sidebar container

#### Add

- a `Purpose` chip row above the grid
- optional compact label like `Purpose`
- an `All` chip plus one chip per `JOB_CATEGORY_DEFINITIONS`

---

### `main.js`

#### Keep

- taxonomy map creation
- job category counting
- `getTelemetryJobCategory()`
- category metadata helpers

#### Refactor

- stop using `job:` library IDs as a browse mode
- add `state.activeJobCategoryFilter`
- replace `renderJobCategories()` with `renderUseCaseChips()`
- update event handlers for chip selection
- update `applyFilters()` to combine library + use case
- update `updateCounts()` to show combined state
- update empty-state copy for active purpose filters

#### Interaction rules

- Clicking the `All` chip clears only the purpose filter.
- If the user is on `Lucide + AI & Agents` and clicks `All`, the state becomes `Lucide + All Purposes`.
- If no specific library is selected, choosing a purpose chip filters across all libraries.
- Changing the purpose chip does not clear the active search query.

#### `applyFilters()` pseudocode

```js
function applyFilters() {
  let icons = getIconsForCurrentStyle();

  if (state.activeLibrary === 'favorites') {
    icons = filterFavorites(icons);
  } else if (state.activeLibrary === 'recent') {
    icons = filterRecent(icons);
  } else if (state.activeLibrary !== 'all') {
    icons = icons.filter((icon) => icon.lib === state.activeLibrary);
  }

  if (state.activeJobCategoryFilter !== 'all') {
    icons = icons
      .filter((icon) => getIconJobCategory(icon) === state.activeJobCategoryFilter)
      .sort((a, b) => getIconJobRank(a) - getIconJobRank(b));
  }

  icons = applySearchQuery(icons, state.searchQuery);
  icons = applyDefaultPopularitySortIfNeeded(icons);

  state.filteredIcons = icons;
  renderGrid();
}
```

#### Recommended implementation detail

Keep `buildJobLibraryId()` and `parseJobLibraryId()` temporarily if other code paths still reference them, but remove browse dependence from them.

---

### `lib/icon-taxonomy-seed.js`

#### Keep

- `JOB_CATEGORY_DEFINITIONS`
- `JOB_ICON_TAXONOMY_SEED`
- `createIconTaxonomyMap()`
- `createJobCategoryMap()`

#### Optional cleanup

After the refactor stabilizes, deprecate:

- `JOB_LIBRARY_PREFIX`
- `buildJobLibraryId()`
- `parseJobLibraryId()`

if they are no longer needed anywhere.

---

### `public/synonyms.json`

#### Update

- add missing AI-domain terms from Kit 01 editorial material
- prefer conceptually correct expansions
- do not over-broaden short ambiguous terms

---

### `mcp/public/synonyms.json`

#### Update

- mirror the same semantic additions as the web client

---

### `lib/icon-semantic-aliases.js`

#### New

- curated alias layer for the 150 seeded icons
- this is the precision layer, distinct from broad synonyms
- use a flat `icon_id -> aliases[]` structure for Phase 3
- treat it as the shared precision source for both the site and MCP

---

### `mcp/search.js`

#### Refactor

- import the shared alias map from `../lib/icon-semantic-aliases.js`
- mirror the curated-alias ranking step used in the site search path
- keep synonym expansion as the broad recall layer underneath
- preserve the existing `library` filter and `limit` handling

---

## 8. UX Acceptance Criteria

The refactor is successful when:

1. A user can browse by library without seeing purpose taxonomy as a rival top-level nav system.
2. A user can combine `Library + Purpose`.
3. A user can still rely on search as the primary discovery method.
4. The purpose layer feels like refinement, not a second site architecture.
5. GitHub packs remain conceptually separate from the site browse system.
6. Telemetry still captures `job_category` for copy/favorite/search-driven behavior.

---

## 9. Technical Acceptance Criteria

The implementation is successful when:

1. `P0.01` evidence capture keeps working.
2. `job_category` still appears on newly logged events.
3. Library filtering works exactly as before.
4. Purpose chips work with AND semantics.
5. Search still supports direct and related results.
6. Synonym updates are mirrored in both web and MCP copies.
7. No server-side dependency is introduced for browse filtering.

---

## 10. Verification Plan

### UI verification

1. Open the app
2. Confirm the sidebar no longer contains `Jobs`
3. Confirm purpose chips render above the grid
4. Select:
   - `Lucide`
   - `AI & Agents`
5. Confirm only the intersection is shown
6. Clear the purpose chip and confirm normal library browse returns

### Search verification

Test known terms:

- `quota`
- `rag`
- `observability`
- `tool call`

Verify:

- useful direct or related results appear
- no obvious regressions for common generic terms
- MCP search returns the same intended first-tier icon family for the seeded concept queries

### Telemetry verification

Generate events from filtered views:

- favorite an icon
- copy an icon
- perform one chip-only copy or favorite event
- perform one search-driven copy or favorite event inside an active purpose filter

Then verify in Supabase:

```sql
select signal_type, icon_id, job_category, search_query, ui_surface, evidence_text, created_at
from public.icon_evidence
order by created_at desc
limit 20;
```

Expected:

- new rows show valid `job_category`
- chip-only events may have `search_query = null`
- search-driven events inside an active purpose filter should show both `job_category` and `search_query`
- new rows reflect current UI context

### MCP verification

Run MCP or local Node verification for:

- `tool call`
- `observability`
- `langgraph`
- `semantic search`

Expected:

- the first-tier icon family matches the web app for the same query
- curated alias matches appear before broad synonym-only matches

---

## 11. Rollout Order

Recommended execution order:

1. Browse IA refactor
2. Synonym enhancement
3. Curated alias/tag layer
4. Shared MCP precision pass
5. Telemetry-informed iteration

This order is intentionally low-risk:

- fix the wrong IA first
- improve retrieval second
- add precision third
- mirror the same precision into MCP fourth
- expand only where evidence justifies it

---

## 12. Risks and Mitigations

### Risk: chip row becomes cluttered over time

**Mitigation:** show top categories first and use horizontal scroll or `more` behavior later.

### Risk: synonym expansion becomes noisy

**Mitigation:** keep broad vocabulary in synonyms, but use curated aliases for precision on the seed set.

### Risk: taxonomy feels hidden after removing the sidebar

**Mitigation:** make the chip row visually prominent and include concise labels.

### Risk: implementation churn from changing the current P0.02 UI

**Mitigation:** retain the taxonomy data model and telemetry exactly as-is; refactor only presentation and filter state.

---

## 13. Final Recommendation

The best approach is:

- **keep the taxonomy**
- **remove the Jobs sidebar**
- **introduce purpose chips**
- **improve AI-domain search**
- **add precision aliases for the curated 150 icons**
- **share that precision layer with MCP**
- **let evidence guide what expands next**

This preserves the strongest part of the current work, corrects the weakest part, and aligns Supericons with its real product thesis:

**a semantic icon intelligence system for humans and agents, with GitHub packs as a separate distribution channel.**

