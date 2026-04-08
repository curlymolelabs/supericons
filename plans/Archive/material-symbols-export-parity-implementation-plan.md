# Material Symbols Export Parity: Implementation Plan

Source proposal: [docs/material-symbols-export-parity-proposal.md](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs/material-symbols-export-parity-proposal.md)  
Baseline checkpoint: `fb77cfc`

## Objective

Bring Material Symbols to practical export parity with the SVG-based libraries while preserving the current strengths of the Material implementation:

- font-based grid rendering
- live 4-axis preview sliders
- existing component export flows

The implementation goal is to make Material Symbols participate in the same **graphical export pipeline** as the other libraries for:

- Copy SVG
- Copy Base64 SVG
- Download SVG
- Download PNG
- Download ICO
- Batch SVG ZIP
- Batch PNG ZIP
- Batch ICO ZIP
- Open in Motion Lab
- MCP SVG delivery

## Current State

### Confirmed blockers

1. Material Symbols are ingested as `type: 'font'` only in [scripts/build-icons.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/scripts/build-icons.js).
2. The export path assumes an `icon.svg` string exists and returns `null` otherwise in [main.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/main.js#L1688).
3. Motion Lab is hidden for non-SVG icons in [main.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/main.js#L836).
4. Batch export filters to `i.type === 'svg'` in [main.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/main.js#L1162).
5. MCP excludes font icons because clients need SVG output in [mcp/index.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/mcp/index.js#L36).

### Stability constraints

1. Do not regress the current Material browsing and preview experience.
2. Do not destabilize non-Material icon libraries.
3. Do not make export depend primarily on browser-only font tricks.
4. Do not couple core export behavior to live third-party network fetches.

## Chosen Implementation Direction

Use a **dual-representation architecture**:

1. Keep Material Symbols font-based for the grid, panel preview, and component export.
2. Introduce a **Material SVG snapshot export layer** that resolves a real SVG string for export-grade use cases.

### Shared contract

Introduce one export gateway:

```txt
resolveExportSvg(icon, customizeState, context)
  -> SVG libraries: return styled inline svg
  -> Material font icons: return resolved material snapshot svg
```

Every graphical workflow must route through this gateway instead of talking directly to `icon.svg`.

## Delivery Strategy

This should ship in gated phases so the stable app does not get disrupted by a large all-at-once change.

---

## Phase 0: Baseline Lock and Feasibility Gate

No production behavior changes in this phase.

### Goals

1. Lock the current failing behavior as the baseline.
2. Confirm the upstream/source strategy for Material snapshot acquisition.
3. Choose the export-safe axis matrix.
4. Decide storage mode before wiring the runtime.

### Work items

#### [VERIFY] Baseline behavior

Document and manually verify:

1. Material Symbols can browse and preview correctly today.
2. Copy SVG fails for Material.
3. Base64 fails for Material.
4. Download SVG fails for Material.
5. PNG and ICO fail for Material.
6. Motion Lab button is absent for Material.
7. Batch SVG/PNG/ICO excludes Material.
8. Component export still works for Material.

#### [DECIDE] Export-safe axis matrix

The current slider space is too large to assume full 1:1 snapshot coverage. Lock a normalized export matrix before coding.

Recommended starting matrix:

- `FILL`: `0`, `1`
- `WGHT`: `100`, `200`, `300`, `400`, `500`, `600`, `700`
- `GRAD`: `-25`, `0`, `200`
- `OPSZ`: `20`, `24`, `40`, `48`

This preserves meaningful user choice while keeping export tractable.

#### [DECIDE] Snapshot storage mode

Choose one of the two allowed modes:

### Mode A: Static owned snapshot bundle

Use if the normalized matrix produces an acceptable asset footprint after compression.

Pros:

- simplest runtime
- no export-time latency
- no backend dependency

Cons:

- potentially very large asset set

### Mode B: Owned lazy cache plus seeded hot presets

Use if the static bundle is too large.

Model:

1. Ship a seeded cache for the most common presets.
2. Resolve cache misses through a repo-owned snapshot service or storage-backed cache.
3. Upstream acquisition is allowed only as a backend bootstrap, never as the direct client path.

Pros:

- lower initial bundle size
- still produces owned, cacheable SVG assets

Cons:

- more moving parts

### Exit criteria

1. Export-safe axis matrix is locked.
2. Storage mode is chosen.
3. Snapshot key format is locked.

---

## Phase 1: Build the Material Snapshot Asset Pipeline

This phase creates the export-grade source of truth without changing the current UI.

### File inventory

Likely new or changed files:

- [scripts/build-icons.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/scripts/build-icons.js)
- `scripts/build-material-export-snapshots.js` or similar new script
- `public/material-export-manifest.json` new generated file
- `public/material-export/...` new directory if Mode A is chosen

### Work items

#### [ADD] Material snapshot build script

Create a dedicated build script that:

1. reads the Material codepoint list already used by the app
2. iterates the locked export-safe axis matrix
3. acquires or generates real path-based SVG snapshots
4. writes them into an owned cache structure
5. writes a manifest keyed by:
   - icon id
   - fill
   - weight
   - grade
   - optical size
   - relative path or cache key

#### [KEEP] `build-icons.js` focused on icon indexing

Do not overload the current icon index builder with all snapshot logic. Prefer:

1. keeping `build-icons.js` responsible for index assembly
2. chaining the new snapshot build step after or alongside it

#### [DEFINE] Snapshot key format

Recommended format:

```txt
material/outlined/fill-1/wght-400/grad-0/opsz-24/search.svg
```

or an equivalent manifest key:

```txt
material:search:f1:w400:g0:o24
```

#### [ADD] Manifest metadata

The manifest should include:

1. supported axis values
2. normalization rules
3. version
4. generated timestamp
5. path or cache key lookup map

### Guardrails

1. Do not change the current front-end rendering behavior yet.
2. Do not enable new UI until snapshot coverage is proven.
3. Do not remove font-based component export.

### Exit criteria

1. Snapshot assets resolve to real SVG strings.
2. Manifest lookup works for known Material icons.
3. Asset size and generation time are within acceptable limits.

---

## Phase 2: Introduce a Shared Export Resolver

This is the core runtime refactor. The goal is to stop assuming that only `icon.svg` icons are exportable.

### File inventory

Likely changed files:

- [main.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/main.js)

### Work items

#### [ADD] `normalizeMaterialExportAxes(customizeState)`

Purpose:

1. snap live slider state to the locked export-safe matrix
2. return both:
   - normalized export axes
   - whether snapping occurred

Example return:

```js
{
  fill: 1,
  wght: 400,
  grad: 0,
  opsz: 24,
  snapped: true
}
```

#### [ADD] `resolveMaterialSnapshotSvg(icon, customizeState)`

Responsibilities:

1. normalize the axes
2. look up the snapshot from the manifest/cache
3. return the raw snapshot SVG
4. return metadata indicating whether snapping occurred

#### [ADD] `resolveExportSvg(icon, customizeState, options?)`

Responsibilities:

1. delegate SVG libraries to the existing styling path
2. delegate Material to the snapshot resolver
3. apply shared export styling:
   - color
   - gradient if relevant
   - animation wrapper CSS if relevant
4. return one consistent result object for all export callers

Suggested return shape:

```js
{
  svg: '<svg .../>',
  source: 'svg' | 'material-snapshot',
  snapped: boolean,
  axes: { ...normalizedAxes }
}
```

#### [REFACTOR] Fold `getStyledSvg(icon)` into the new gateway

Do not keep two competing export-resolution paths.

Preferred outcome:

1. either replace `getStyledSvg(icon)` with the new gateway
2. or keep `getStyledSvg(icon)` as a thin compatibility wrapper around `resolveExportSvg(...)`

### Guardrails

1. Preserve existing behavior for non-Material SVG libraries.
2. Preserve current font preview rendering.
3. Keep component export logic unchanged in this phase.

### Exit criteria

1. The runtime can resolve a real SVG string for both:
   - a normal SVG icon
   - a Material font icon
2. Existing SVG library export behavior is unchanged.

---

## Phase 3: Enable Single-Icon Export and Motion Lab Parity

This phase unlocks the most visible user-facing wins first.

### File inventory

Likely changed files:

- [main.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/main.js)

### Work items

#### [MODIFY] Single export buttons

Update these flows to use `resolveExportSvg(...)`:

1. Copy SVG
2. Copy Base64
3. Download SVG
4. Download PNG
5. Download ICO

#### [MODIFY] Motion Lab entrypoint

Change Material behavior from “button hidden” to:

1. show “Open in Motion Lab” when a snapshot is resolvable
2. load the resolved SVG into Motion Lab instead of the font span

#### [ADD] User-facing snap disclosure

If the selected slider values were normalized for export:

1. show a small non-blocking note in the panel
2. reuse the same note for export success toasts when appropriate

Suggested copy:

- `Export uses nearest supported Material snapshot`

### Guardrails

1. Do not remove the variable font sliders.
2. Do not change the current preview renderer to use snapshots.
3. If a snapshot cannot be resolved, fail gracefully and preserve today’s fallback messaging.

### Exit criteria

1. Material can export SVG, Base64, PNG, and ICO.
2. Material can open in Motion Lab.
3. Non-Material export behavior remains unchanged.

---

## Phase 4: Batch Export Parity

Once single-icon export is stable, extend the same resolver to batch flows.

### File inventory

Likely changed files:

- [main.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/main.js)

### Work items

#### [REFACTOR] Batch filters

Stop filtering batch actions to `i.type === 'svg'`.

Replace with:

1. include icons that can resolve through `resolveExportSvg(...)`
2. exclude only icons that fail resolution

#### [MODIFY] Batch ZIP builders

Update:

1. Copy SVGs
2. Download SVGs ZIP
3. Download PNGs ZIP
4. Download ICOs ZIP

to use the resolved export SVG result for each icon.

#### [ADD] Batch failure handling

For mixed selections:

1. do not fail the whole batch on one resolver miss
2. skip unresolved items
3. report counts clearly:
   - resolved
   - skipped

### Exit criteria

1. Material participates in batch SVG/PNG/ICO export.
2. Mixed-library batch exports behave predictably.
3. ZIP output counts match the resolved icon count.

---

## Phase 5: MCP and External Consumer Parity

This phase closes the gap for downstream consumers.

### File inventory

Likely changed files:

- [mcp/index.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/mcp/index.js)

### Work items

#### [MODIFY] MCP icon loading contract

Stop hard-skipping Material just because the primary icon index stores font entries.

Instead:

1. expose Material entries only when snapshot SVG resolution is available
2. serve resolved SVG output through the same export-grade path as the UI

#### [ALIGN] Resolver behavior across app surfaces

MCP should not invent a second Material export path. Reuse the same manifest and normalization rules as the front-end.

### Exit criteria

1. MCP can return usable Material SVG output.
2. Material is no longer artificially excluded from SVG-capable downstream clients.

---

## Phase 6: UX, Telemetry, and Hardening

This phase makes the solution trustworthy and supportable.

### Work items

#### [ADD] Snapshot miss telemetry

Track:

1. requested Material export axes
2. normalized axes
3. snapshot misses
4. export format requested

This helps decide whether the axis matrix needs expansion.

#### [ADD] Performance budgets

Track:

1. manifest load size
2. snapshot fetch latency
3. batch export throughput
4. Motion Lab open latency for Material

#### [HARDEN] Cache invalidation and versioning

Ensure the manifest and snapshot storage have explicit versioning so old clients do not serve mismatched data.

### Exit criteria

1. Snapshot resolution is observable.
2. Performance is within acceptable budgets.
3. Version mismatches are detectable.

---

## Explicit Non-Goals

1. Replacing Material Symbols with another library.
2. Changing Material grid rendering to SVG.
3. Removing live variable font sliders.
4. Guaranteeing mathematically exact export for every slider position.
5. Redesigning Motion Lab itself.

## Guardrails During Implementation

1. Do not touch non-Material icon ingestion unless required by shared resolver logic.
2. Keep preview and export models separate on purpose.
3. Do not ship batch parity before single-icon parity is stable.
4. Do not ship MCP parity before UI export parity is stable.
5. Keep a graceful fallback if a Material snapshot cannot be resolved.

## Verification Matrix

| Area | Test | Expected |
|---|---|---|
| Preview | Material icon with non-default axes | Live font preview remains unchanged |
| Single export | Copy SVG on Material | Returns real SVG, not fallback toast |
| Single export | Download PNG on Material | Produces PNG successfully |
| Single export | Download ICO on Material | Produces ICO successfully |
| Motion Lab | Open Material icon in Motion Lab | Loads resolved SVG successfully |
| Batch export | Mixed Material + Lucide SVG ZIP | Both libraries included when resolvable |
| Batch export | Mixed Material + Lucide PNG ZIP | Both libraries included when resolvable |
| MCP | Material icon via MCP | Returns usable SVG output |
| Regression | Lucide/Tabler export | Unchanged from current behavior |
| Regression | Material component export | Unchanged from current behavior |
| UX | Non-default axes export | Snap notice shown when needed |

## Recommended Rollout Order

1. Phase 0: baseline and feasibility gate
2. Phase 1: snapshot asset pipeline
3. Phase 2: shared export resolver
4. Phase 3: single-icon export plus Motion Lab
5. Phase 4: batch export parity
6. Phase 5: MCP parity
7. Phase 6: telemetry and hardening

## Expected Outcome

After Phase 3, Material Symbols should stop feeling like a second-class library in the panel. After Phase 5, Material should deliver nearly the same practical export value as the rest of the platform, while still keeping the unique live variable-font experience that makes it valuable in the first place.
