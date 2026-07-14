# PRD: Material Symbols Hosted MCP Support

- Status: Ready for execution
- Date: 2026-07-14
- Problem source: `docs/material-symbols-hosted-mcp-problem-statement-2026-07-14.md` (issues M-01 to M-20, FR-1 to FR-10)
- Decision of record: build Material Symbols support now, no de-advertising; Search Engine v2 stays paused until the done criteria in Section 11 are met. [SOURCE: owner decision, 2026-07-14]

## 1. Summary

The hosted MCP advertises Material Symbols (4,262 icons) but cannot serve a single one: the catalog stores Material rows without SVG, and the MCP server drops SVG-less results. This PRD turns the approved problem statement into an executable plan: six implementation batches, resolved open questions, a concrete data model, a test matrix, governance-gated release steps, and measurable done criteria. [SOURCE: problem statement M-01 to M-05]

Verification status of the inputs: the failure chain, the all-mode pollution, the solid-preset mismatch (M-19), the stale local counts (M-20), and the package omissions (M-07) were each verified against code on 2026-07-14. The suspected global solid-style gap (M-12) was confirmed live the same day: production hosted search returns zero results for `style=solid` in every probed library, because only the outline index is synced. Probe results are retained in `references/verification/hosted-capability-probes-2026-07-14.json`. [SOURCE: live production probes, 2026-07-14; `scripts/sync-search-catalog-to-supabase.mjs`]

### Problem, target user, and scope

The problem, target users, verified current state, related issue inventory (M-01 to M-20), scope, functional requirements (FR-1 to FR-10), non-goals, success metrics, risks, and source or assumption labels are defined normatively in `docs/material-symbols-hosted-mcp-problem-statement-2026-07-14.md` and are incorporated here by reference. In one sentence: an MCP user or agent searching for a Material icon must receive that icon as usable inline SVG whenever the search matches, and today the hosted path serves none of the 4,262 advertised Material icons. Target users are MCP clients requesting Material directly, all-library searchers whose result counts Material currently corrupts, and the owner who needs engine defects separated from real demand. This PRD adds the execution plan; it does not restate or alter the problem statement's requirements except where Section 3 records explicit resolutions. [SOURCE: `docs/material-symbols-hosted-mcp-problem-statement-2026-07-14.md`]

## 2. Goals

- G1: Every advertised Material icon returns a real, safe, inline SVG through hosted `search_icons`, `get_icon`, `recommend_icons`, and preview paths, in both outline and solid presets.
- G2: All-library searches return full result counts; Material candidates never silently consume or vanish from result slots.
- G3: Serving failures are engine errors in telemetry, never fake zero-result content gaps.
- G4: Capability advertising (libraries, counts, styles) is backed by verified deliverable data, with a machine-checked gate so this defect class cannot recur.
- G5: The release leaves a clean seam for Search Engine v2 resumption (fresh beta packet on top of the Material-era code).

Traceability: G1 covers FR-1, FR-2, FR-5; G2 covers FR-7 and M-03; G3 covers FR-6, FR-10; G4 covers FR-8, FR-9, M-12, M-13, M-20; G5 covers M-16.

### Requirement traceability

| Requirement | User goal or risk | Execution batches |
|---|---|---|
| FR-1, preserve and fulfill Material support | G1 | 3, 4, 5 |
| FR-2, provide two fixed variants | G1 | 1, 3, 4, 5 |
| FR-3, keep assets outside candidate payloads | G1 and hydration-latency risk | 2, 3, 4 |
| FR-4, reproducible and safe assets | Upstream-change and unsafe-SVG risks | 3 |
| FR-5, hydrate final Material results | G1 | 4 |
| FR-6, never silently drop ranked results | G3 | 0, 4, 5 |
| FR-7, protect all-library searches | G2 | 0, 4 |
| FR-8, add end-to-end gates | G4 and regression risk | 1, 3, 4, 5 |
| FR-9, make capability advertising truthful | G4 | 1, 4, 5 |
| FR-10, preserve measurement and release boundaries | G3 and G5 | 0, 2, 4, 5 |

## 3. Resolved open questions

The problem statement left seven implementation questions. All are resolved below. The owner approved proceeding with the plan, while every production mutation still requires its own approval packet at execution time. [SOURCE: owner decision, 2026-07-14]

1. Interim protection (FR-7): **ship Batch 0 now** as its own small gated release. Rationale: the all-mode pollution harms non-Material users daily, and the owner's stated reason for pausing v2 was active user harm. This is the program's first production `mcp-search` deploy, so it carries its own approval packet with a results-parity-except-material-exclusion proof. [DECIDED: owner approved proceeding, 2026-07-14; the standard per-deploy approval packet still applies at execution time]
2. Asset store (FR-3): **private database table `material_icon_assets` is the serving store** for SVG payloads and metadata; the existing private Storage bucket remains the acquisition cache. Rationale: final hydration needs one bounded indexed lookup per request (up to 50 ids); a table with a primary key on (icon_id, variant) does that in one query, the same proven shape as `icon_catalog` hydration.
3. Local package offline (M-07): **owned-service fetch on cache miss is acceptable.** Offline completeness is not a release requirement. The network caveat is documented in the package README and tool descriptions. Bundling 8,524 SVGs into the npm package is rejected for size reasons.
4. Non-Material solid gap (M-12): **separate fast-follow release (Phase M2), not in this scope.** The retained live probes confirm the gap in all-library mode and for strict Lucide and Tabler searches, while the catalog sync design shows that the solid index is not imported. Fixing the broader gap means syncing `public/icon-index-solid.json` (6,059 records) into the hosted catalog, which touches the same sync and hydration machinery but none of the Material asset pipeline. In this release, the capability-truth gate (Batch 1) records each non-Material library and style result as pass or known-failing, and `list_libraries` style claims are corrected to verified data (M-20). The gate flips to enforcing for a library and style once M2 makes that combination servable. [SOURCE: problem statement M-12; `references/verification/hosted-capability-probes-2026-07-14.json`]
5. Acceptance queries (FR-8): **three separate gates, committed and reproducible.**
   - Observed smoke set: `references/verification/material-acceptance-queries-2026-07-14.json`, the top 50 material-filtered zero-result requests from the 7-day production export (source export SHA-256 embedded in the artifact; regenerated by `scripts/extract-material-acceptance-queries.mjs`). Honesty note: 48 of 50 rows originate from recommend_icons internal fan-out and some are machine fragments, so this set gates only "material requests do not fail or silently disappear," never relevance.
   - Curated relevance set: `references/verification/material-relevance-fixture-2026-07-14.json`, 20 exact concepts with acceptable Material icon IDs, every ID verified present in the index. Gates: strict material search returns at least one acceptable ID with valid SVG in both presets.
   - Coverage set: all 4,262 Material IDs checked for both variants and exact `get_icon` availability (Batch 3 and Batch 5 gates).
6. Latency (FR-5): **per-tool contracts, with a fresh baseline required.** The retained latency evidence (`references/verification/search-v2-roundtrip-latency-summary-2026-07-14.json`) separates tool paths: direct search measured 1,647 ms warm p95 in the isolated v2 treatment (passing its 2,000 ms gate), while recommendation measured 16,869 ms warm p95 and failed its own 3,000 ms gate for pre-existing reasons unrelated to Material. Therefore:
   - Before the Batch 4 deploy, measure a fresh warm p95 baseline on the production `mcp-search` path per tool (the 1,647 ms figure belongs to the isolated v2 endpoint, not production).
   - Direct search, `get_icon`, and preview must meet the active search gate (warm p95 at or under 2,000 ms) after hydration, and within +100 ms of the fresh baseline.
   - Recommendation must show no Material-specific regression against its fresh baseline (+100 ms p95 budget on the same measurement shape). Its pre-existing latency problem is tracked in the paused Search v2 program and must neither block this release nor be silently worked on under it.
7. License metadata (FR-4): each asset row records `license` (Apache-2.0), `source_repo`, `source_revision` (pinned commit SHA), and `checksum`. A NOTICE entry for Material Symbols is added to the repository license documentation. Attribution is not embedded per response; Apache-2.0 requires notice preservation, not per-payload attribution. [ASSUMPTION: standard Apache-2.0 practice; flag to owner if legal review is wanted]
8. Exception policy (resolves the conflict between "every advertised ID works" and "an exception list exists"): **an ID with a missing or invalid asset at the pinned revision is removed from serving, never left rankable.** For every exception, the release either stays blocked until both variants exist, or the ID is excluded from candidate eligibility and from advertised served counts, with the exclusion recorded in the deterministic exception report. The advertised promise then holds exactly: every ID that remains advertised is servable. Target exception rate stays under 1 percent; a higher rate blocks the release for owner review.
9. Telemetry contract (makes FR-6 implementable): the `search_outcome` column is constrained to `results`, `clarification`, `zero`, and `error` (migration `20260712_search_v2_beta_measurement.sql`), so no new outcome value is invented. Material serving failures log **`search_outcome='error'` plus `error_code='material_asset_unavailable'`** (Batch 0 interim message uses `error_code='material_support_pending'`). The `error_code` columns are added in the Batch 2 migration. The admin dashboard's engine-defect tagging consumes `error_code`, which keeps these failures out of genuine content-gap metrics without schema conflicts.

## 4. Architecture

```
Pinned upstream revision (Google material-design-icons @ <SHA>)
  -> acquisition: seed script fetches, validates, checksums
  -> private Storage bucket `material-icons` (acquisition cache, existing)
  -> private table `material_icon_assets` (serving store, new)
  -> hosted search final-result hydration (after rank and limit)
  -> hosted MCP tools (search_icons, get_icon, recommend_icons, preview)
```

Fixed MCP presets (the contract from the problem statement FR-2):

- `outline`: `fill=0, wght=300, grad=0, opsz=24` (matches current defaults)
- `solid`: `fill=1, wght=400, grad=0, opsz=24` (matches the seed script; the local MCP resolver in `mcp/index.js` is changed to match, resolving M-19)
- `any` resolves to outline for Material.

The browser index stays lightweight: no Material SVGs enter `public/icon-index.json` or the candidate payload (problem statement non-goal). The website's variable-axis experience is untouched.

## 5. Data model

New additive migration `supabase/migrations/<date>_material_icon_assets.sql`:

```sql
create table public.material_icon_assets (
  icon_id text not null references public.icon_catalog(icon_id) on delete cascade,
  variant text not null check (variant in ('outline', 'solid')),
  svg text not null check (char_length(trim(svg)) > 0),
  axes jsonb not null,
  source_repo text not null,
  source_revision text not null,
  checksum text not null,
  license text not null default 'Apache-2.0',
  updated_at timestamptz not null default now(),
  primary key (icon_id, variant)
);

alter table public.material_icon_assets enable row level security;
revoke all on table public.material_icon_assets from public;
grant select, insert, update, delete on table public.material_icon_assets to service_role;

-- Same migration: telemetry error-code support (see Section 3 item 9).
alter table public.search_request_audit add column if not exists error_code text;
alter table public.mcp_usage_events add column if not exists error_code text;
```

`material_icon_assets.icon_id` uses the hosted catalog key, for example `material:settings`, not the raw source index ID `settings`. This keeps the foreign key and hydration lookup aligned with `icon_catalog`. [SOURCE: `lib/hosted-search-core.js`; `supabase/migrations/20260418_hosted_search_engine_schema.sql`]

Rollback order: revert the handler and candidate-query functions first, then drop the additive table and telemetry columns if required. This restores prior behavior without changing `icon_catalog`.

## 6. Implementation batches

### Batch 0: interim protection (production, small, ships first)

- Exclude Material rows from hosted candidate retrieval so they cannot occupy ranked slots (one condition in the candidate query path in `supabase/functions/_shared/search-engine/handle-search-request.ts`, or the candidate RPC parameters).
- Strict `library=material` requests return an explicit engine response: clear temporary-unavailable message, logged per the telemetry contract (Section 3 item 9; before the Batch 2 migration lands, `search_outcome='error'` alone is acceptable, upgraded to carry `error_code` once the column exists).
- In `mcp/remote-server.js`, replace the silent SVG-null drop with the same explicit classification for Material (non-Material behavior unchanged).
- Removed again in Batch 4.

Acceptance: `settings` and `cog` all-library searches return the full requested count; strict material returns the explicit message; results for non-material queries are byte-identical to pre-change output except for the Material exclusion (parity proof retained). Verification record in `references/verification/`.

Governance: own hash-pinned approval packet; first production `mcp-search` function deploy of the program (production currently at version 36, corrected from an earlier one-version-low report); Railway MCP deploy included if the remote-server change ships in the same step.

### Batch 1: contract lock and failing gates (no serving change)

- Encode the preset contract and fix M-19 in `mcp/index.js` (solid = `fill=1, wght=400`).
- New verification script (production-shaped, hosted path): Material outline and solid through `search_icons` (strict and all), `get_icon`, `recommend_icons`, preview output, installed-package mode, honest failure when the asset store is empty. All initially failing except the Batch 0 behaviors.
- Capability-truth gate: for every library and style combination advertised by `list_libraries`, run a committed known-matching query and require at least one SVG-usable result through the real serving path. Each fixture row records the library, style, query, and at least one acceptable icon ID. Non-Material solid failures are recorded as known-failing until Phase M2 (Section 3, item 4).
- Fixtures: the committed acceptance-query artifact plus the curated core set (Section 3, item 5).
- Replace the `'<material-snapshot />'` placeholder path in `scripts/verify-mcp-variant-access.mjs` so no test can pass on fake SVG (M-14).

Acceptance: gates run in CI, red for Material end-to-end, green for Batch 0 protections.

### Batch 2: asset store migration

- The migration from Section 5, applied through the guarded runner with fingerprint-bound approval.

Acceptance: table exists, RLS verified (anon and authenticated reads fail), FK enforced, constraints reject empty SVG and bad variants, `error_code` columns present on both telemetry tables.

### Batch 3: seeding pipeline (8,524 variants)

Extend the existing owned-cache tooling (`scripts/seed-material-owned-cache.js`, `material-export.js`, `supabase/functions/serve-material-snapshot/index.ts`); do not build a second Material system.

1. Pin the upstream source to a specific revision SHA (replaces `master` in both export modules and the snapshot function, M-09).
2. Read all 4,262 Material IDs from the index; fetch both presets per ID.
3. Validate each SVG: nonempty, required `viewBox`, valid markup, no scripts, no external resources, `currentColor` normalization; compute sha256 checksum (M-10).
4. Store snapshot in the existing bucket; upsert SVG plus metadata into `material_icon_assets`.
5. Resumable batches, limited concurrency, retries, dry-run and selected-icon modes, deterministic exception report for upstream misses.
6. Public-safe summary output: counts, failures, exception list. No SVGs committed to git.

Acceptance: `material_icon_assets` holds 8,524 rows minus a reconciled exception list governed by the exception policy. Every excepted ID is excluded from candidate eligibility and served counts before activation, never left rankable. Re-running the seeder at the same revision produces identical checksums, and every row passes validation constraints.

Governance: seeding writes to the hosted database; runs under the guarded runner with the migration's approval packet or a linked one.

### Batch 4: hosted final-result hydration

- Before ranking and limiting, make a Material candidate eligible only when `material_icon_assets` contains the requested variant for that catalog ID. `any` requires outline availability. Apply the same eligible set to served counts. This may use an `exists` condition in the candidate RPC or an equivalent pre-rank filter, but it must not add SVG payloads to candidate rows. This is the mechanism that enforces the exception policy in Section 3 item 8.
- In the shared handler (`handle-search-request.ts` and the result-hydration module): after ranking and limiting, hydrate eligible Material rows from `material_icon_assets` for the resolved variant (outline for `any`); one bounded lookup; non-Material rows keep the `icon_catalog` path; deterministic order preserved.
- Hydration enablement (verified gap, must be explicit): the stable production entrypoint (`supabase/functions/mcp-search/index.ts`) calls the shared handler with default options, and the handler defaults `hydrateFinalSvg` to false; non-Material SVG currently rides on candidate rows. **Material hydration is therefore mandatory in the shared handler regardless of the `hydrateFinalSvg` flag.** Do not gate it behind an option the stable entrypoint never sets.
- Style-filter correction (required, easy to miss): the handler currently filters `row.style === style` before hydration, and every Material catalog row is stored as `outline`. Without a change, `style=solid` would drop all Material candidates before hydration ever runs. Material candidates must be treated as capable of both presets at the filter stage (bypass or widen the style filter for Material rows), with the actual variant selected at hydration time and the resolved style reported on the result.
- Resolve and report style accurately per result.
- A ranked Material row with no asset is an engine error: logged with an engine-defect classification, never a silent drop or a fake zero (FR-6).
- Remove the Batch 0 exclusion.

Acceptance: smoke set produces no failures or silent drops; relevance set returns an acceptable ID with valid SVG in both presets per query; all-library counts remain full; non-Material regression suite passes unchanged; latency per the Section 3 item 6 contract (fresh production baseline first, per-tool gates, +100 ms budget).

Governance: production `mcp-search` deploy, hash-pinned packet, latency evidence attached, rollback documented (revert function version; assets stay).

### Batch 5: MCP surface truth

- `mcp/remote-server.js`: never silently discard a ranked result (generalized beyond Material); clear engine error on unexpected hydration gaps.
- `list_libraries` and tool descriptions: counts and style claims derived from verified deliverable data (fixes the hard-coded 4,205 and the unverified solid counts, M-20); Material listed with its true served count.
- Local and hosted parity check: equivalent icon IDs and styles for the acceptance set.
- Package README and tool descriptions document the local-package network caveat for Material (M-07).

Acceptance: capability-truth gate green for Material outline and solid on both runtimes; advertised counts match served reality; parity record retained.

Governance: Railway MCP deploy plus npm package publish, gated as usual.

## 7. Release order

1. Batch 0 packet: approve, deploy production `mcp-search`, live probes, verification record. (Owner decision from Section 3 item 1 gates this step.)
2. Batches 1 to 3 in sequence: tests red, migration, seed, counts and checksums verified. No serving-path change yet.
3. Batch 4 packet: deploy hosted search, run direct hosted probes plus the full acceptance set, latency evidence.
4. Batch 5: deploy Railway MCP server and publish the package if changed; live tool probes (`search_icons`, `get_icon`, `recommend_icons`); record results.
5. Post-release: monitor Material engine-error rate and hosted latency for one week; the admin dashboard's Engine health work consumes the new engine-defect classification.

Every step with external mutation (migration, seed, function deploys, package publish) runs under a fingerprint-bound approval packet and the guarded runner, matching program governance. [SOURCE: problem statement M-17; program release practice]

## 8. Test matrix

| Check | Path | Batch | Gate |
|---|---|---|---|
| Observed smoke set: no failures, no silent drops | hosted HTTP + MCP tool | 1 red, 4 green | release |
| Curated relevance set: acceptable ID with SVG, both presets | hosted HTTP + MCP tool | 1 red, 4 green | release |
| Coverage set: all advertised IDs servable in both variants | seeder + get_icon | 3 and 5 | release |
| Solid vs outline visibly distinct, correct axes | hosted + local | 1 red, 4 to 5 green | release |
| get_icon exact Material ID | both runtimes | 1 red, 5 green | release |
| recommend_icons material-only task | hosted | 1 red, 5 green | release |
| All-library count integrity (`settings`, `cog`) | hosted | 0 green | release |
| No silent ranked-result drops (any library) | MCP server unit + live | 5 | release |
| Missing asset yields engine error, not zero | hosted, asset deleted in fixture | 4 | release |
| Capability-truth: every advertised library serves SVG per style | both runtimes | 1 (known-fail for non-Material solid until M2) | CI |
| Non-Material regression (order, SVG, latency) | existing suites | 4 | release |
| Checksum reproducibility at pinned revision | seeder | 3 | CI |
| RLS: no public read of `material_icon_assets` | supabase | 2 | CI |

## 9. Metrics

- Coverage: 100 percent of IDs that remain advertised have valid outline and solid assets; excepted IDs are removed from serving and counts per the exception policy (target exception rate under 1 percent, higher blocks release).
- Honesty: zero silent drops; zero Material engine failures classified as content zeros after Batch 4; failures carry `error_code`.
- Performance: per-tool contract from Section 3 item 6 (search, lookup, preview inside the 2,000 ms warm p95 gate; recommendation shows no Material-specific regression against its fresh baseline).
- Adoption signal (dashboard, post-release): report the measured strict-Material serving-failure rate and genuine content-zero rate without using an unverified historical percentage; track whether all-library low-result events decline after slot pollution ends. [SOURCE: problem statement M-15]

## 10. Risks

Inherited from the problem statement (upstream misses, interrupted seeding, validation false positives or negatives, hydration latency, package network dependency, cross-library solid gap, historical dashboard contamination) with these additions:

- Batch 0 is the first production deploy of this function; mitigations: smallest possible diff, parity proof, immediate rollback path (redeploy previous version).
- Seed volume against upstream: 8,524 fetches; mitigations: limited concurrency, resume, and the acquisition cache so retries do not re-fetch.
- The paused v2 beta packet becomes stale by design (M-16); mitigation: the resumption checklist already requires a fresh packet, recorded in the v2 program notes.

## 11. Done criteria (gates v2 resumption)

All problem-statement done conditions, concretely: acceptance set green in strict mode with real SVG on both surfaces and both styles; exact get_icon green; material-only recommendations green; all-library counts full; hosted MCP serving of advertised IDs makes no request-time request to Google's upstream; the local package may call the owned snapshot service on a cache miss as resolved in Section 3 item 3; non-Material behavior is unchanged; latency is inside the gate; live production evidence is retained in `references/verification/`; capability advertising matches served reality; historical Material zeros carry a dated engine-defect record.

## 12. Open questions

None block execution. Remaining items are tracked as follow-ups (Section 13) or owner-flagged notes: the Apache-2.0 attribution approach in Section 3 item 7 is standard practice but can get legal review if the owner wants it, and the Phase M2 timing (solid index sync for the other libraries) is scheduled after this release rather than inside it.

## 13. Follow-ups explicitly out of this release

- Phase M2: sync the solid icon index (6,059 records) for non-Material library and style combinations that fail the capability-truth gate, then flip each repaired combination from known-failing to enforced. [SOURCE: problem statement M-12]
- Generated capability advertisement (derive tool descriptions and library lists from verified data at build time) beyond the count corrections in Batch 5.
- Admin dashboard refinement continues in its own PRD; it consumes the engine-defect classification this release introduces.
