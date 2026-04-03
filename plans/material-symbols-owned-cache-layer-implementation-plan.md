# Material Symbols Owned Cache Layer: Implementation Plan

Related docs:
- [material-symbols-export-parity-proposal.md](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs/material-symbols-export-parity-proposal.md)
- [material-symbols-export-parity-implementation-plan.md](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/plans/material-symbols-export-parity-implementation-plan.md)

Baseline:
- Material export parity is now functionally working via runtime fetches to Google-hosted snapshot SVGs.
- The remaining gap is operational ownership and reliability.

## Objective

Replace the current client-side dependency on Google-hosted Material snapshot SVGs with a Supericons-owned snapshot cache layer so Material exports behave like the rest of the libraries operationally, not just functionally.

Success means:

- Material export no longer depends on `raw.githubusercontent.com` at user action time.
- The app and MCP resolve Material SVGs from Supericons-controlled assets or infrastructure.
- Snapshot naming, storage, versioning, and invalidation are deterministic.
- The current stable preview/customizer experience remains unchanged.

## What Exists Today

Current implementation characteristics:

1. Material export axes are normalized locally in [material-export.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/material-export.js).
2. Export-grade SVG URLs are still built against Google raw URLs in [material-export.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/material-export.js).
3. The app fetches those URLs at runtime in [main.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/main.js).
4. MCP fetches those same URLs at runtime in [mcp/index.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/mcp/index.js).
5. A local manifest exists, but it currently describes the external source rather than a Supericons-owned asset inventory in [public/material-export-manifest.json](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/public/material-export-manifest.json).

This is acceptable as an interim bridge, but not the end-state architecture.

## Non-Goals

This plan does not aim to:

- replace Material Symbols with another library
- remove the variable font sliders
- change the grid or panel preview from font-based rendering to SVG rendering
- generate mathematically exact SVGs for every possible slider position
- redesign Motion Lab

## Recommended End-State Architecture

Use a two-tier Supericons-owned cache model:

1. A versioned local manifest that defines the export-safe axis matrix and snapshot key format.
2. A Supericons-owned snapshot store that serves export-grade Material SVGs by cache key.

### Why this approach

This avoids both extremes:

- not a giant monolithic static bundle of every possible snapshot checked into the repo
- not a fragile live dependency on Google raw URLs during user export actions

It gives us:

- controlled asset ownership
- deployable versioning
- measurable hit/miss behavior
- lower app bundle size than a fully baked local static tree

## Chosen Storage Strategy

Recommended strategy:

### Tier 1: Seeded owned cache

Ship a seeded snapshot inventory for hot presets and the most frequently used icons or axis combinations.

Examples:

- default preset: `fill=0, wght=300, grad=0, opsz=24`
- filled preset: `fill=1, wght=400, grad=0, opsz=24`
- other top presets identified from telemetry

These can be stored in:

- `public/material-export/` for local dev and static fallback
- or Supabase Storage / equivalent object store for production delivery

### Tier 2: Cache-on-demand population

When a cache key is requested and not yet owned:

1. a server-side job fetches the upstream snapshot once
2. validates and normalizes the SVG
3. stores it into the owned cache
4. updates the owned manifest/index
5. serves future requests from Supericons-owned storage only

Important:

- only the backend may ever talk to the upstream source
- browser and MCP clients should never directly fetch Google raw URLs once this plan is complete

## Snapshot Key Design

Use a deterministic key format shared across build, app, MCP, and storage:

```txt
material:{iconId}:f{fill}:w{wght}:g{grad}:o{opsz}
```

Example:

```txt
material:search:f1:w400:g0:o24
```

Storage path equivalent:

```txt
material/outlined/search/fill-1/wght-400/grad-0/opsz-24.svg
```

Requirements:

- key must be reversible from normalized axes
- key must be stable across deploys within the same manifest version
- path layout must not depend on upstream naming quirks

## Asset Normalization Rules

All owned snapshots must be normalized before storage:

1. preserve `viewBox`
2. remove irrelevant width/height if needed for consistency
3. ensure colorability:
   - if no explicit fill exists, inject `fill="currentColor"` on root
4. reject malformed or empty SVGs
5. optionally strip unnecessary metadata and comments

This makes Material exports behave the same as other Supericons SVGs downstream.

## Manifest Design

Introduce an owned manifest format that describes Supericons-owned assets, not the external source.

Suggested fields:

```json
{
  "version": 2,
  "generatedAt": "...",
  "exportMatrix": {
    "fill": [0, 1],
    "wght": [100, 200, 300, 400, 500, 600, 700],
    "grad": [-25, 0, 200],
    "opsz": [20, 24, 40, 48]
  },
  "defaultAxes": {
    "fill": 0,
    "wght": 300,
    "grad": 0,
    "opsz": 24
  },
  "storage": {
    "mode": "owned-static-and-cache",
    "baseUrl": "/material-export"
  },
  "entries": {
    "material:search:f0:w300:g0:o24": {
      "path": "material/outlined/search/fill-0/wght-300/grad-0/opsz-24.svg",
      "etag": "...",
      "cachedAt": "..."
    }
  }
}
```

The manifest must support:

- local dev
- production CDN/object-store URLs
- cache presence checks
- versioned invalidation

## Required System Components

## 1. Build-time manifest generator

Add a build step that:

1. writes the export matrix and defaults
2. optionally includes preseeded entries
3. emits a versioned manifest file for the app and MCP to consume

Likely file:

- `scripts/build-material-owned-manifest.js`

## 2. Snapshot normalization worker

Add a script or server-side function that:

1. receives icon id + normalized axes
2. fetches upstream once if the asset is absent
3. validates SVG content
4. normalizes it
5. writes to owned storage
6. records metadata in the manifest or cache index

Possible implementations:

- CLI seeding script for local and CI
- serverless function for production cache misses
- background worker if using queue-based hydration

## 3. Owned asset delivery path

The app and MCP should request:

- local static path in dev
- owned CDN/storage path in production

Examples:

- `/material-export/...`
- Supabase Storage public bucket URL
- Vercel static asset path

## 4. Shared resolver update

Update the shared resolver contract in `material-export.js` so it stops building Google raw URLs and instead builds owned cache URLs/paths from the manifest.

## Rollout Phases

## Phase 0: Prepare and Freeze Contracts

Goals:

1. lock the export matrix already in use
2. lock key format
3. lock normalization rules
4. choose storage backend

Deliverables:

- written contract for key format
- written contract for manifest schema
- written contract for normalization

Exit criteria:

- no unresolved naming/versioning questions remain

## Phase 1: Build Owned Manifest and Seeding Tooling

Goals:

1. create the owned manifest generator
2. create a seeding script for a starter cache population
3. prove storage roundtrip works

Work:

1. add a dedicated seeding script:
   - `scripts/seed-material-owned-cache.js`
2. populate a starter set for:
   - top-used icons
   - default axes
   - common filled variant
3. emit a versioned owned manifest

Verification:

- seeded snapshots are readable from owned storage
- manifest path lookup works locally

## Phase 2: Server-Side Cache Miss Filler

Goals:

1. eliminate client dependence on external upstream fetches
2. allow long-tail icon/axis combinations without bloating the initial bundle

Work:

1. add a server-side cache-fill route/function
2. route missing owned cache keys through backend-only upstream acquisition
3. persist the normalized result into owned storage
4. persist metadata into cache index / manifest sidecar

Rules:

- client never talks to upstream
- backend never serves unvalidated upstream content directly

Verification:

- first miss hydrates cache
- second request is served from owned store

## Phase 3: Switch App Resolver to Owned Assets

Goals:

1. update the app to resolve only against the owned manifest/storage path
2. preserve all current Material parity behavior

Work:

1. change `buildMaterialSnapshotUrl(...)` behavior to read owned paths
2. change `resolveMaterialSnapshotSvg(...)` in the app to:
   - check owned manifest/path
   - optionally call a Supericons cache-fill endpoint
   - never call Google raw directly

Verification:

- Material export still works with network access to Supericons only
- blocking `raw.githubusercontent.com` no longer breaks export

## Phase 4: Switch MCP Resolver to Owned Assets

Goals:

1. align MCP with the same owned path
2. avoid external runtime dependency in MCP environments

Work:

1. update `mcp/index.js` to consume the owned manifest/storage base
2. optionally expose clearer metadata:
   - `svgSource: "owned-material-cache"`

Verification:

- MCP `search_icons` and `get_icon` return Material SVGs without external fetches to Google

## Phase 5: Add Telemetry and Operational Controls

Goals:

1. understand cache behavior
2. tune seed coverage
3. detect upstream drift early

Metrics to capture:

- cache hit rate
- cache miss rate
- hydration latency
- hydration failure rate
- top requested icon/axis combos
- stale manifest/version mismatches

Operational controls:

- cache version bump
- re-seed command
- purge specific keys
- dry-run validator

## Phase 6: Hardening and Fallback Policy

Goals:

1. make failure behavior predictable
2. avoid broken exports during outages

Recommended fallback order:

1. owned static asset
2. owned cache object store
3. owned cache-fill endpoint
4. graceful user-facing failure

Not allowed in final state:

- browser fallback to Google raw
- MCP fallback to Google raw

## File and Module Impact

Likely affected files:

- [material-export.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/material-export.js)
- [main.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/main.js)
- [mcp/index.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/mcp/index.js)
- [package.json](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/package.json)
- `scripts/build-material-owned-manifest.js`
- `scripts/seed-material-owned-cache.js`
- `scripts/validate-material-owned-cache.js`
- `public/material-export-manifest.json` or a versioned replacement

Potential infra additions:

- Supabase Storage bucket or equivalent object storage
- serverless function / edge function / API route for cache fill
- CI seeding job

## Acceptance Criteria

The owned cache layer is complete only when all of these are true:

1. Material export works when access to Google raw URLs is blocked.
2. App Material exports resolve from Supericons-owned paths only.
3. MCP Material SVG delivery resolves from Supericons-owned paths only.
4. Cache key generation is deterministic and versioned.
5. Seeded and hydrated snapshots are normalized and colorable.
6. Cache hit/miss behavior is observable.
7. Existing Material preview and slider behavior is unchanged.
8. Existing non-Material library behavior is unchanged.

## Risks

### Storage growth

If the long-tail cache grows quickly, object count and storage cost may rise.

Mitigation:

- seed only hot variants
- hydrate on demand
- expire cold keys if necessary

### Upstream drift during hydration

If Google changes naming or asset layout, hydration may start failing.

Mitigation:

- centralize upstream adapter in one server-side component
- alert on hydration failure spikes
- pin upstream version if possible

### Manifest drift

If clients use stale manifests, asset lookup can fail.

Mitigation:

- version manifest
- add cache-busting
- add manifest/schema validation

## Recommended Rollout Order

1. contract freeze
2. owned manifest generator
3. seeding tool
4. server-side cache fill
5. app switch-over
6. MCP switch-over
7. telemetry and hardening

## Expected Outcome

After this plan is complete, Material Symbols will not only look feature-complete in Supericons, they will also be operationally first-class:

- same export reliability expectation as the other libraries
- same internal ownership model for runtime delivery
- same resilience against third-party network or host issues

That is the final step needed to make Material truly equivalent in product value, not just equivalent in UI behavior.
