# Material Symbols Hosted MCP Problem Statement and Related Issues

Date: 2026-07-14  
Status: Approved requirements; implementation decisions resolved in the execution PRD
Decision: Build Material Symbols support now. Search Engine v2 remains paused until this capability is complete and verified. [SOURCE: owner decision, 2026-07-14]
Resolution record: `docs/material-symbols-mcp-support-prd-2026-07-14.md` resolves the implementation questions in Section 11 and defines the ordered execution plan. [SOURCE: `docs/material-symbols-mcp-support-prd-2026-07-14.md`]

## 1. Purpose

This document defines the Material Symbols serving problem, its root cause, its user impact, and every directly related issue found during the repository audit. It is intended to be the source for an execution PRD and implementation plan. [SOURCE: owner request, 2026-07-14]

## 2. Problem

Supericons advertises Material Symbols as a supported free library through the hosted MCP server, but the hosted serving path cannot return usable Material SVG results. The primary icon index contains 4,262 Material records, all stored as font metadata with no inline SVG. The hosted catalog sync preserves those records with a null SVG. The hosted MCP server then rejects any result without an SVG. [SOURCE: `public/icon-index.json`; `lib/hosted-search-core.js`; `scripts/sync-search-catalog-to-supabase.mjs`; `mcp/remote-server.js`]

This is a product capability defect, not an admin-dashboard-only reporting problem. It affects the actual hosted MCP tools used by clients. The dashboard exposes the failure through zero-result data, but changing the dashboard cannot make Material results usable. [SOURCE: `mcp/remote-server.js`; `docs/supericons-admin-dashboard-refinement-prd-2026-07-14.md`]

The defect also affects searches that do not explicitly request Material. The hosted search handler ranks candidates and applies the requested limit before the hosted MCP server removes SVG-less rows. A Material candidate can therefore occupy a limited result slot and then disappear, causing an all-library search to return fewer usable results than requested. [SOURCE: `supabase/functions/_shared/search-engine/handle-search-request.ts`; `mcp/remote-server.js`]

The user need is straightforward: when Supericons says a library is supported, its search, lookup, recommendation, and preview paths must return real, safe, usable SVGs, or return a clear engine error when the serving system fails. Missing infrastructure must not appear as a genuine content gap or a normal zero-result search. [SOURCE: owner decision, 2026-07-14; `docs/supericons-admin-dashboard-refinement-prd-2026-07-14.md`]

## 3. Target User

- MCP users and agents that request Material Symbols directly by library, icon ID, style, or task. [SOURCE: `mcp/remote-server.js`; `mcp/index.js`]
- MCP users and agents that search across all libraries and expect the requested number of usable results. [SOURCE: `mcp/remote-server.js`; `supabase/functions/_shared/search-engine/handle-search-request.ts`]
- The product owner and administrator, who need engine defects separated from real unmet icon demand. [SOURCE: `docs/supericons-admin-dashboard-refinement-prd-2026-07-14.md`]
- Maintainers who need one capability contract across the website, installed MCP package, hosted MCP server, search catalog, and owned asset cache. [SOURCE: `main.js`; `mcp/index.js`; `mcp/remote-server.js`; `material-export.js`]

## 4. Verified Current State

### 4.1 Catalog and asset counts

- `public/icon-index.json` contains 21,424 records. It contains 4,262 Material records, all marked `outline`, and none of those Material records has an SVG. [SOURCE: `public/icon-index.json`, counted 2026-07-14]
- `mcp/public/icon-index.json` has the same 21,424 total records, 4,262 Material records, and zero Material SVGs. [SOURCE: `mcp/public/icon-index.json`, counted 2026-07-14]
- `public/icon-index-solid.json` contains 6,059 SVG records across seven non-Material libraries and contains no Material records. [SOURCE: `public/icon-index-solid.json`, counted 2026-07-14]
- The owned Material export manifest contains 118 cached variants covering 92 unique Material icon IDs: 92 outline variants and 26 filled variants. This is partial coverage, not complete coverage of the advertised library. [SOURCE: `public/material-export-manifest.json`, counted 2026-07-14]

### 4.2 Hosted MCP failure chain

1. The hosted MCP library list and tool descriptions include `material`. [SOURCE: `mcp/remote-server.js`]
2. The catalog builder stores a null SVG when the source icon has no SVG. [SOURCE: `lib/hosted-search-core.js`]
3. The catalog sync reads only `public/icon-index.json`, which contains Material metadata but no Material SVG. [SOURCE: `scripts/sync-search-catalog-to-supabase.mjs`; `public/icon-index.json`]
4. The hosted search handler filters by style, ranks candidates, and slices to the requested limit before final SVG hydration. Its final SVG lookup reads only `icon_catalog`. [SOURCE: `supabase/functions/_shared/search-engine/handle-search-request.ts`]
5. The hosted MCP normalizer returns null for any row without `row.svg`, then removes null rows. [SOURCE: `mcp/remote-server.js`]
6. The result is an advertised library whose ranked candidates can disappear before the MCP response reaches the user. [SOURCE: `mcp/remote-server.js`; `supabase/functions/_shared/search-engine/handle-search-request.ts`]

### 4.3 Existing Material infrastructure that should be reused

- The website and local MCP code share Material axis normalization, deterministic cache keys, owned storage paths, and an owned snapshot URL builder. [SOURCE: `material-export.js`; `mcp/material-export.js`]
- The repository already has a private Supabase Storage bucket named `material-icons`. [SOURCE: `supabase/migrations/20260403_material_snapshot_bucket.sql`]
- The snapshot function checks the owned bucket, fetches an upstream snapshot on a cache miss, stores it, and returns SVG content. [SOURCE: `supabase/functions/serve-material-snapshot/index.ts`]
- The seeding script supports all Material IDs and two presets: the current default axes and a filled preset. [SOURCE: `scripts/seed-material-owned-cache.js`]
- The local MCP resolver can read a local cached asset or request an owned snapshot. It maps `solid` by changing the fill axis over the default axes, while the seed script defines a different filled preset. This mismatch is recorded as M-19. [SOURCE: `mcp/index.js`; `scripts/seed-material-owned-cache.js`]

These components prove that part of the asset acquisition and export path already exists. They do not connect full Material coverage to the hosted search result path. [SOURCE: `material-export.js`; `mcp/index.js`; `mcp/remote-server.js`; `supabase/functions/_shared/search-engine/handle-search-request.ts`]

## 5. Related Issue Inventory

### M-01: Advertised capability does not match serving capability

`list_libraries` always includes Material and reports a count from the catalog metadata. It does not report whether the library can return SVG-usable results. Tool descriptions also accept `material` as a library filter. [SOURCE: `mcp/remote-server.js`]

Impact: clients are invited to request a library that the hosted MCP path cannot currently serve. [SOURCE: `mcp/remote-server.js`]

### M-02: Material catalog rows have no SVG payload

All 4,262 Material rows in both primary outline indexes have no SVG. The hosted catalog builder turns missing SVG data into null. [SOURCE: `public/icon-index.json`; `mcp/public/icon-index.json`; `lib/hosted-search-core.js`]

Impact: search ranking can find Material metadata, but the serving layer has no final asset to return. [SOURCE: `supabase/functions/_shared/search-engine/handle-search-request.ts`; `mcp/remote-server.js`]

### M-03: All-library searches can return shortened result sets

The hosted handler applies the result limit before the hosted MCP removes null-SVG rows. This ordering lets unavailable Material candidates consume result slots. [SOURCE: `supabase/functions/_shared/search-engine/handle-search-request.ts`; `mcp/remote-server.js`]

Impact: the Material defect can reduce result counts for users who did not request Material. [SOURCE: `supabase/functions/_shared/search-engine/handle-search-request.ts`; `mcp/remote-server.js`]

### M-04: Strict Material failures look like normal zero results

The hosted MCP filters unusable Material rows and can fall through to an empty result rather than identifying an asset-serving failure. [SOURCE: `mcp/remote-server.js`]

Impact: an engine defect is misclassified as missing content or an unmet query. This pollutes gap analysis and hides operational failures. [SOURCE: `docs/supericons-admin-dashboard-refinement-prd-2026-07-14.md`]

### M-05: Search, lookup, recommendation, and preview do not share one proven Material contract

The code exposes Material through search, `get_icon`, `recommend_icons`, and preview-related schemas. The hosted remote path requires inline SVG during normalization, while the local MCP path has a separate on-demand Material resolver. [SOURCE: `mcp/remote-server.js`; `mcp/index.js`]

Impact: success on one surface does not prove success on another. Each public tool and runtime needs an end-to-end check through its real serving path. [SOURCE: `mcp/remote-server.js`; `mcp/index.js`]

### M-06: Website, local MCP, and hosted MCP behavior have drifted

The website and local MCP contain Material snapshot resolution logic. The hosted MCP server does not use that resolver and rejects null-SVG Material rows. [SOURCE: `main.js`; `mcp/index.js`; `mcp/remote-server.js`]

Impact: partial support on the website and in local code can make the product appear complete while the hosted service remains broken. [SOURCE: `main.js`; `mcp/index.js`; `mcp/remote-server.js`]

### M-07: The MCP package definition does not bundle the Material catalog or snapshot inventory

The MCP package file list does not include `public/icon-index.json`, `public/icon-index-solid.json`, `public/material-export-manifest.json`, or `public/material-export/`. The local resolver can use hosted search and the owned snapshot service, but its long-tail Material behavior therefore depends on network access unless assets are supplied another way. [SOURCE: `mcp/package.json`; `mcp/index.js`]

Impact: installed-package behavior must be tested separately from repository-local behavior, and any network requirement must be documented honestly. [SOURCE: `mcp/package.json`; `mcp/index.js`]

### M-08: Existing owned cache coverage is too small

The current manifest covers 92 of 4,262 advertised Material icon IDs, and only 26 of those have a filled cached variant. [SOURCE: `public/material-export-manifest.json`; `public/icon-index.json`, counted 2026-07-14]

Impact: the existing seeded cache cannot provide complete outline and solid MCP support by itself. [SOURCE: `public/material-export-manifest.json`; `mcp/index.js`]

### M-09: The upstream source is not revision-pinned

Both Material export modules and the snapshot function read from the upstream `master` branch. [SOURCE: `material-export.js`; `mcp/material-export.js`; `supabase/functions/serve-material-snapshot/index.ts`]

Impact: the same seed command can produce different assets over time, weakening reproducibility, rollback, and checksum verification. [SOURCE: `material-export.js`; `supabase/functions/serve-material-snapshot/index.ts`]

### M-10: Current SVG normalization is not a complete validation gate

The current normalizer checks whether content exists and adds `fill="currentColor"` when needed. It does not verify a required `viewBox`, reject scripts or external resources, parse malformed SVG, or record a checksum. [SOURCE: `material-export.js`; `supabase/functions/serve-material-snapshot/index.ts`]

Impact: a full asset build needs explicit safety, shape, and integrity checks before assets enter the serving store. [SOURCE: `material-export.js`; `supabase/functions/serve-material-snapshot/index.ts`]

### M-11: The owned cache is not connected to final hosted search hydration

The hosted handler hydrates final SVG data only from `icon_catalog`. It does not query Material-owned snapshot storage or a Material asset table. [SOURCE: `supabase/functions/_shared/search-engine/handle-search-request.ts`]

Impact: seeding the current storage bucket alone will not repair hosted MCP search. The final-result hydration path must explicitly resolve Material assets. [SOURCE: `supabase/functions/_shared/search-engine/handle-search-request.ts`; `supabase/functions/serve-material-snapshot/index.ts`]

### M-12: Style support is broader than the hosted import can prove

MCP schemas accept `any`, `outline`, and `solid`. The repository has 6,059 non-Material solid SVG records, but the catalog sync reads only the outline index. Direct production probes confirmed zero solid results in all-library mode and in strict Lucide and Tabler searches. Those retained probes confirm the defect on the tested paths, while the full library-by-style matrix remains an execution gate. [SOURCE: `mcp/remote-server.js`; `mcp/index.js`; `public/icon-index-solid.json`; `scripts/sync-search-catalog-to-supabase.mjs`; `references/verification/hosted-capability-probes-2026-07-14.json`]

Impact: Material needs two real fixed presets, and the broader library-style advertising contract needs a separate truth check. [SOURCE: `mcp/index.js`; `scripts/seed-material-owned-cache.js`; `scripts/sync-search-catalog-to-supabase.mjs`]

### M-13: Capability advertising is hand-written instead of verified from serving data

The hosted library list is a static array. Its counts come from index metadata, not from successful SVG delivery through the real tool path. [SOURCE: `mcp/remote-server.js`]

Impact: the same class of defect can recur for another library or style even after Material is fixed. [SOURCE: `mcp/remote-server.js`]

### M-14: Existing Material tests do not prove real SVG delivery

The Material variant verification substitutes `'<material-snapshot />'` when an icon has no SVG. Other search tests use Material metadata or null-SVG fixtures, but no current gate proves that an installed package and the hosted MCP tools retrieve a real Material SVG through the production-shaped path. [SOURCE: `scripts/verify-mcp-variant-access.mjs`; `scripts/verify-hosted-search-engine.mjs`; `scripts/verify-search-v2-hosted-http-parity.ts`; `scripts/verify-search-v2-result-hydration.ts`]

Impact: tests can pass while the advertised capability remains unusable. [SOURCE: `scripts/verify-mcp-variant-access.mjs`; `mcp/remote-server.js`]

### M-15: Material failures contaminate search-quality reporting

The admin PRD reports that 250 of 252 Material-filtered query rows were zero results, but the retained July 11 analysis artifact does not reproduce this Material-specific count. The code-level defect is verified, while the exact production frequency remains unverified from a retained reproducible artifact. [SOURCE: `docs/supericons-admin-dashboard-refinement-prd-2026-07-14.md`; `output/search-zero-results-analysis-2026-07-11/artifact.json`; `output/search-zero-results-analysis-2026-07-11/analysis.sql`]

Impact: historical Material failures must be recorded as a time-bounded engine defect, and acceptance queries should come from a sanitized, reproducible usage summary before exact frequency claims are used. [SOURCE: `docs/supericons-admin-dashboard-refinement-prd-2026-07-14.md`]

### M-16: Search Engine v2 release evidence becomes stale after this fix

The paused Search Engine v2 beta packet is bound to an exact implementation commit, package hash, migration, endpoint, and manifest fingerprint. Material serving changes will alter relevant behavior or package evidence. [SOURCE: `docs/si-v2/search/reviews/search-v2-search-only-beta-approval-request-2026-07-14.md`]

Impact: the current beta packet must not be executed after Material work lands. Search Engine v2 must later receive a fresh baseline, package build, verification record, manifest fingerprint, and approval. [SOURCE: owner decision, 2026-07-14; `docs/si-v2/search/reviews/search-v2-search-only-beta-approval-request-2026-07-14.md`]

### M-17: Hosted changes require controlled migration and release steps

The durable fix is expected to add stored assets and modify hosted final-result hydration. Those are database and serving-path changes. [ASSUMPTION]

Impact: migration, seeding, handler deployment, hosted MCP deployment if required, rollback, and post-deploy checks need separate guarded execution steps. [ASSUMPTION]

### M-18: A temporary protection may be needed while full support is built

Until final Material hydration is live, excluding unavailable Material candidates before the all-library result limit would prevent them from shrinking other libraries' results. Strict Material requests should return a clear temporary engine response during that interval. This does not require removing Material from the library list. [SOURCE: `supabase/functions/_shared/search-engine/handle-search-request.ts`; `mcp/remote-server.js`; owner decision to retain Material, 2026-07-14]

Impact: the temporary rule reduces current harm without reversing the decision to build full Material support. [SOURCE: owner decision, 2026-07-14]

### M-19: The current solid preset is inconsistent across code paths

The local MCP `getMaterialExportAxes` function keeps the default weight of 300 and changes only `fill` to 1 for a solid request. The seeding script defines its filled preset as `fill=1`, `wght=400`, `grad=0`, `opsz=24`. [SOURCE: `mcp/index.js`; `scripts/seed-material-owned-cache.js`; `material-export.js`]

Impact: a local MCP solid request can miss a seeded filled asset and fetch a different weight from the owned snapshot function. The implementation must select one solid contract and apply it everywhere. [SOURCE: `mcp/index.js`; `scripts/seed-material-owned-cache.js`]

### M-20: Local Material counts and style availability can overstate deliverable assets

The local MCP metadata hard-codes a Material count of 4,205 while the current index contains 4,262 Material IDs. When local indexes are available, `list_libraries` reports Material solid count from the outline count because the library is marked solid-capable, not because every solid asset was verified. [SOURCE: `mcp/index.js`; `public/icon-index.json`, counted 2026-07-14]

Impact: installed MCP clients can receive stale counts or a full solid count that is not backed by the current 26 filled cached variants. Counts and supported styles must come from verified deliverable assets. [SOURCE: `mcp/index.js`; `public/material-export-manifest.json`, counted 2026-07-14]

## 6. Scope

### In scope

- Complete outline and solid Material SVG availability for every currently advertised Material icon ID. [SOURCE: owner decision, 2026-07-14]
- Hosted MCP support for `search_icons`, `get_icon`, `recommend_icons`, and preview-related output where Material is accepted. [SOURCE: `mcp/remote-server.js`; `mcp/index.js`]
- Correct all-library result counts when Material candidates rank. [SOURCE: `supabase/functions/_shared/search-engine/handle-search-request.ts`; `mcp/remote-server.js`]
- Pinned asset acquisition, validation, integrity metadata, license and attribution metadata, seeding, and rollback. [ASSUMPTION]
- Honest engine-error and telemetry classification for missing or failed Material hydration. [SOURCE: `docs/supericons-admin-dashboard-refinement-prd-2026-07-14.md`]
- End-to-end capability checks across advertised libraries, styles, tools, and package modes. [SOURCE: issue M-13 and M-14]
- A fresh Search Engine v2 release packet after Material support is complete. [SOURCE: owner decision, 2026-07-14]

### Out of scope

- Changing the website's variable-axis customization experience. [SOURCE: `main.js`; owner request focuses on Material MCP support]
- Bundling every possible Material weight, grade, fill, and optical-size combination for MCP. [SOURCE: `material-export.js`; `mcp/index.js`]
- Resuming embeddings or deeper Search Engine v2 work before Material support is complete. [SOURCE: owner decision, 2026-07-14]
- Redesigning the admin dashboard in this workstream. The dashboard should consume honest defect data after the engine fix, but it is not the fix itself. [SOURCE: owner decision, 2026-07-14; `docs/supericons-admin-dashboard-refinement-prd-2026-07-14.md`]

## 7. Functional Requirements

### FR-1: Preserve and fulfill the Material library promise

Material remains an advertised library, and the product must build the serving capability now rather than remove the library as the final solution. [SOURCE: owner decision, 2026-07-14]

Acceptance: every Material ID advertised by the active catalog can return at least one usable SVG through the intended MCP serving path. [ASSUMPTION]

### FR-2: Provide two fixed MCP variants

The MCP contract uses an outline preset of `fill=0`, `wght=300`, `grad=0`, `opsz=24`, and a solid preset of `fill=1`, `wght=400`, `grad=0`, `opsz=24`. The outline values match the current defaults, and the solid values match the seeding script. The local MCP resolver must be changed to match the solid preset. [SOURCE: `mcp/index.js`; `scripts/seed-material-owned-cache.js`; `material-export.js`; issue M-19]

Acceptance: 4,262 current Material IDs multiplied by two presets produces a target inventory of 8,524 variant assets, subject to upstream availability and a recorded exception list. [SOURCE: `public/icon-index.json`, counted 2026-07-14; `scripts/seed-material-owned-cache.js`]

### FR-3: Store Material assets outside the lightweight candidate payload

Use a private Material asset store keyed by icon ID and variant. Store SVG content and the metadata needed for source revision, axes, checksum, license, attribution, and update time. Candidate retrieval must remain lightweight. [ASSUMPTION]

Acceptance: candidate rows do not carry bulk SVG data, and final selected Material results can be hydrated in one bounded lookup. [ASSUMPTION]

### FR-4: Make asset generation reproducible and safe

Pin an immutable upstream revision. Validate nonempty SVG, required `viewBox`, safe `currentColor` behavior, valid markup, no scripts, and no external resources. Record a checksum and reject failures before import. [SOURCE: issue M-09 and M-10]

Acceptance: the same source revision and preset produce the same checksum, and invalid assets fail the seed before hosted data changes. [ASSUMPTION]

### FR-5: Hydrate final Material results in the shared hosted path

After ranking and limiting, hydrate Material SVGs from the private asset store while keeping non-Material SVG hydration compatible with the existing `icon_catalog` path. [SOURCE: issue M-11; `supabase/functions/_shared/search-engine/handle-search-request.ts`]

Acceptance: ranked Material rows reach the MCP response with SVG content and preserve deterministic order. [ASSUMPTION]

### FR-6: Never silently drop a ranked result

A missing Material asset after ranking is an engine failure, not a true zero. The serving path must return a clear error or an explicitly partial response with diagnostics suitable for internal telemetry. [SOURCE: issue M-03 and M-04]

Acceptance: no public tool converts a missing Material SVG into a normal empty result without an error classification. [ASSUMPTION]

### FR-7: Protect all-library searches during implementation

Before full hydration ships, unavailable Material candidates must not consume result slots in all-library searches. Strict Material requests must return a clear temporary-unavailable engine response. [SOURCE: issue M-18]

Acceptance: fixed queries such as `settings` and `cog` return their full requested count from usable libraries during the temporary period, and strict Material does not report a misleading content zero. [ASSUMPTION]

### FR-8: Add end-to-end capability gates

Test real SVG delivery for Material outline and solid through hosted `search_icons`, all-library search, `get_icon`, `recommend_icons`, preview output, and a clean installed package. Also verify honest failure behavior when the asset store is unavailable. [SOURCE: issue M-05, M-07, and M-14]

Acceptance: tests reject placeholders, null SVG, malformed SVG, shortened all-library results, and silent fallthrough. [ASSUMPTION]

### FR-9: Make capability advertising truthful

Every advertised library and style must have a serving-path verification. Library counts and style claims should be derived from verified deliverable data where practical. [SOURCE: issue M-12, M-13, and M-20]

Acceptance: a capability-truth gate fails when a listed library cannot return SVG-usable results or when an advertised style has no verified data for that library. [ASSUMPTION]

### FR-10: Preserve honest measurement and release boundaries

Mark historical and future Material asset failures as engine defects, keep sanitized query fixtures reproducible, and generate a new Search Engine v2 beta packet only after Material behavior is stable. [SOURCE: issue M-15 and M-16]

Acceptance: Material engine failures are excluded from genuine content-gap metrics, and no stale Search Engine v2 manifest is executed. [ASSUMPTION]

## 8. Non-Goals

- Do not solve the defect by permanently removing Material from the product. [SOURCE: owner decision, 2026-07-14]
- Do not add every Material variable-axis combination to the MCP contract. [SOURCE: `material-export.js`; `mcp/index.js`]
- Do not put all Material SVGs into the browser search index or candidate-search payload. [SOURCE: existing lightweight final-hydration architecture in `supabase/functions/_shared/search-engine/handle-search-request.ts`]
- Do not count asset-serving failures as real zero-result demand. [SOURCE: `docs/supericons-admin-dashboard-refinement-prd-2026-07-14.md`]
- Do not resume or publish the paused Search Engine v2 beta from its current packet. [SOURCE: owner decision, 2026-07-14]

## 9. Success Metrics

- 100 percent of Material IDs that remain advertised have a valid outline asset; any upstream exception is removed from candidate eligibility and served counts. [ASSUMPTION]
- 100 percent of Material IDs that remain advertised have a valid solid asset; any upstream exception is removed from candidate eligibility and served counts. [ASSUMPTION]
- Hosted strict Material searches return SVG-usable results for the approved acceptance query set. [ASSUMPTION]
- All-library searches return the requested number of usable results when enough valid candidates exist. [ASSUMPTION]
- `get_icon`, `recommend_icons`, and preview checks return real Material SVGs, not placeholders. [ASSUMPTION]
- Missing or unavailable assets produce zero silent drops and zero false content-zero classifications. [ASSUMPTION]
- Non-Material response order and SVG behavior remain unchanged in regression tests. [ASSUMPTION]
- Material search and hydration pass the active hosted latency gate before release. [ASSUMPTION]

## 10. Risks

- Upstream icon IDs or variant files may be missing at the pinned revision. Mitigation: produce a deterministic exception report and reconcile it before advertising counts. [ASSUMPTION]
- Bulk seeding may be interrupted or partially applied. Mitigation: use resumable, checksum-aware batches and verify expected counts before activation. [ASSUMPTION]
- SVG validation may reject legitimate upstream files or accept unsafe constructs. Mitigation: use explicit fixtures for valid and invalid cases, then review every exception. [ASSUMPTION]
- Final hydration may add latency. Mitigation: hydrate only final selected IDs in one bounded lookup and measure the real hosted path. [ASSUMPTION]
- The local MCP package may remain network-dependent for uncached Material assets. Mitigation: the execution PRD accepts an owned-service request on cache miss and requires the package documentation to state that behavior. [SOURCE: issue M-07; `docs/material-symbols-mcp-support-prd-2026-07-14.md` Section 3 item 3]
- Broader hosted solid-style support may remain inconsistent even after Material is fixed. Mitigation: Phase M2 is the named follow-up, and this release records each non-Material library and style combination as verified or known-failing. [SOURCE: issue M-12; `docs/material-symbols-mcp-support-prd-2026-07-14.md` Section 3 item 4]
- Historical dashboard counts may overstate unmet demand until defect tagging is applied. Mitigation: keep a permanent, time-bounded Material defect record. [SOURCE: issue M-15]

## 11. Implementation Questions Resolved by the Execution PRD

These questions were open when the problem statement was written. Section 3 of `docs/material-symbols-mcp-support-prd-2026-07-14.md` now records their resolutions. [SOURCE: `docs/material-symbols-mcp-support-prd-2026-07-14.md`]

1. Should the temporary all-library exclusion in FR-7 ship immediately, or can the full hydration release be completed quickly enough to avoid an interim deployment? [ASSUMPTION]
2. Is a private database table the final Material SVG store, or should the private Storage bucket remain the payload store with a database metadata index? [ASSUMPTION]
3. Must the installed local MCP package work with all Material icons fully offline, or is an owned-service request on a cache miss acceptable? [SOURCE: issue M-07]
4. Is the broader non-Material solid-index import gap part of this release, or a separately gated capability-truth follow-up? [SOURCE: issue M-12]
5. Which sanitized production queries will form the Material top-query acceptance set, and where will the reproducible summary artifact live? [SOURCE: issue M-15]
6. What exact latency threshold applies to final Material hydration for each public tool? [ASSUMPTION]
7. What license and attribution fields are required in the asset record and exported response metadata? [ASSUMPTION]

## 12. Execution Readiness

The problem and root cause are ready for implementation planning. The repository already contains the source icon IDs, two intended Material presets, an owned private cache, an acquisition function, a seeding script, and local resolution logic. The missing work is complete asset coverage, stronger validation, hosted final-result integration, truthful capability gates, and release verification. [SOURCE: `public/icon-index.json`; `scripts/seed-material-owned-cache.js`; `supabase/migrations/20260403_material_snapshot_bucket.sql`; `supabase/functions/serve-material-snapshot/index.ts`; `mcp/index.js`; `mcp/remote-server.js`]

The owner resolved the main product decision: build Material support now and keep Search Engine v2 paused. The execution PRD resolves the implementation shape and release boundaries. Production mutations remain separately owner-gated. [SOURCE: owner decision, 2026-07-14; `docs/material-symbols-mcp-support-prd-2026-07-14.md`]
