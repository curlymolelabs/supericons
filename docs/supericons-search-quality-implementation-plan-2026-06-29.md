# Supericons Search Quality Implementation Plan

Date: 2026-06-29

Status: Draft implementation plan

## Problem

Supericons search needs to handle short icon names, brand/logo searches, and longer natural-language phrases across the web UI, hosted MCP, local MCP, CLI-style usage, and `recommend_icons`. [SOURCE: current product discussion]

The current shared search intent layer can build query variants and candidate adjustments. [SOURCE: lib/search-intent-core.js] The hosted Supabase search handler uses `buildSearchIntentProfile`, `buildIntentQueryVariants`, `si_search_icon_candidates`, and `getIntentCandidateAdjustment` before ranking candidates. [SOURCE: supabase/functions/_shared/search-engine/handle-search-request.ts] The MCP `recommend_icons` path has its own slot-query variant flow and candidate scoring. [SOURCE: mcp/recommend-icons.js]

Long user phrases can describe a real visual concept even when no exact icon exists. For example, `license plate recognition camera scan car` describes vehicle plate scanning, not six unrelated keywords. [SOURCE: current product discussion]

## Target Users

- Web users searching the Supericons UI by natural language, product name, app logo, or use case. [ASSUMPTION]
- Coding agents using hosted MCP or local MCP to search, recommend, and retrieve SVG icons. [SOURCE: mcp/index.js]
- Supericons maintainers reviewing no-result and low-confidence searches to improve the library. [ASSUMPTION]
- Future Icons Lab users who turn repeated search gaps into new icon briefs and production-ready SVGs. [SOURCE: references/flow-specs/guided-static-icon-pack-creation.md]

## Jobs To Be Done

- When I describe an icon in normal language, I want Supericons to understand the meaning so I can find a usable icon without knowing its exact file name. [SOURCE: current product discussion]
- When I ask an agent for an icon, I want the same search behavior as the web UI so I can trust MCP and web results to match. [ASSUMPTION]
- When a concept has no exact icon, I want Supericons to return the best visual fallback and identify the missing icon opportunity. [SOURCE: current product discussion]
- When maintainers review search failures, they need a deterministic way to decide whether to add metadata, an intent rule, a synonym, or a new Icons Lab icon brief. [ASSUMPTION]

## Goals

1. Improve long natural-language search without over-broad matching.
2. Keep web search, hosted MCP, local MCP, and `recommend_icons` aligned.
3. Make search behavior deterministic enough to test and debug.
4. Preserve exact brand/logo search quality for the Supericons logo library.
5. Convert repeated no-result searches into actionable metadata or Icons Lab backlog items.

## Non-Goals

- Do not add a general LLM call to every search request in the critical path.
- Do not let generic words such as `logo`, `icon`, `app`, or `ai` become strong standalone fallback queries.
- Do not change pricing, affiliate links, or deployment flow as part of this search-quality plan.
- Do not create new icons inside this implementation pass.
- Do not expose private ranking, service keys, internal review notes, or operational process metadata in public search responses.

## Scope

### In Scope

- Shared intent expansion and keyword backoff rules.
- Curated compound-phrase dictionary for real failed or weak searches.
- Shared fixtures for web, hosted MCP, local MCP, and `recommend_icons`.
- Search response diagnostics that are safe for public or maintainer use.
- A repeatable review workflow for no-result and low-confidence queries.
- Hooks from repeated gaps into future Icons Lab concept briefs.

### Out Of Scope

- Payment, auth, or subscription changes.
- Netlify deployment.
- npm publish.
- Supabase data sync.
- Quiver, GPT Image, or other generation-provider implementation.

## Current Verified Surfaces

| Surface | Verified Current File | Role |
| --- | --- | --- |
| Shared web/local search intent | `lib/search-intent-core.js` | Builds normalized intent profiles, query variants, and candidate adjustments. |
| Local MCP runtime copy | `mcp/runtime/search-intent-core.js` | Runtime copy used by MCP package code. |
| Hosted search handler | `supabase/functions/_shared/search-engine/handle-search-request.ts` | Applies intent variants to hosted web/MCP search and merges candidate batches. |
| MCP search tool | `mcp/index.js` | Exposes `search_icons`, `recommend_icons`, and `get_icon`. |
| MCP recommendation logic | `mcp/recommend-icons.js` | Builds slot-level query variants and scores candidates for multiple UI slots. |
| Regression fixture script | `scripts/verify-search-intent-expansion.mjs` | Verifies intent variants, forbidden generic fallbacks, and candidate adjustment rules. |

## Search Intent Model

The search layer should parse each query into deterministic roles where possible:

| Role | Example From `license plate recognition camera scan car` | Search Use |
| --- | --- | --- |
| Compound concept | `license plate recognition` | Try as exact phrase and known alias. |
| Domain | `computer vision`, `transport`, `security` | Metadata and future icon backlog. |
| Object | `license plate`, `car`, `vehicle` | Strong visual fallback. |
| Action | `scan`, `recognize`, `detect` | Pair with object or device. |
| Device | `camera` | Strong visual fallback. |
| Weak standalone terms | `license`, `plate`, `recognition` | Avoid unless part of a compound phrase or known alias. |

## Functional Requirements

### FR1: Query Classification

Classify each query into one or more intent types:

- `brand_logo`
- `literal_object`
- `compound_concept`
- `abstract_metaphor`
- `ui_slot`
- `library_filtered`
- `missing_icon_candidate`

Mapping: user job 1, user job 2, risk mitigation for over-broad search.

### FR2: Compound Phrase Dictionary

Create or extend a public-safe curated dictionary for high-value phrases:

- `license plate recognition` -> `alpr`, `vehicle scan`, `license plate camera`, `traffic camera`, `camera scan`, `car scan`
- `dream interpretation` -> `moon`, `star`, `eye`, `sparkles`
- `neck pain` -> `person`, `body`, `activity`, `accessibility`
- `code editor` -> Supericons coding-tool logo aliases and generic code-editor icons
- `ai app builder` -> Base44, Bolt, Lovable, and related AI builder concepts

Mapping: user job 1, user job 4.

### FR3: Ranked Query Variant Plan

For each query, build variants in this order:

1. Full normalized query.
2. Known compound phrases and aliases.
3. Strong object-action or object-device pairs.
4. Strong single visual terms.
5. Safe generic fallback only when the query has no better semantic anchors.

Mapping: user job 1, user job 3, risk mitigation for irrelevant results.

### FR4: Weak Token Suppression

Maintain a weak-token list that prevents generic standalone fallbacks:

- `icon`
- `icons`
- `logo`
- `logos`
- `app`
- `apps`
- `ai`
- `tool`
- `tools`
- `company`
- `website`
- `platform`

These words can still appear inside stronger phrase variants when useful.

Mapping: risk mitigation for noisy results.

### FR5: Brand And Logo Exactness

Brand/logo queries must prioritize exact Supericons records when available:

- `xai`, `x.ai`, `grok` -> `si:x-ai`
- `codex`, `openai codex` -> `si:openai-codex-app`
- `lovable` -> `si:lovable`
- `kickbacks`, `kickbacks ai` -> `si:kickbacks-ai`

Mapping: user job 1, business goal of improving AI-logo discovery.

### FR6: Shared Web And MCP Behavior

The same intent rules must feed:

- web search
- hosted MCP search
- local npm MCP search
- CLI-style local MCP usage

If separate runtime copies remain necessary, add a verification guard that fails when `lib/search-intent-core.js` and `mcp/runtime/search-intent-core.js` drift in important behavior.

Mapping: user job 2, risk mitigation for inconsistent agent behavior.

### FR7: Recommend Tool Alignment

Update `recommend_icons` to use the same phrase and brand/logo intent concepts when slot labels include brand names, product names, or long natural-language needs.

Mapping: user job 2, user job 3.

### FR8: Search Gap Classification

When search returns no exact result or low-confidence fallback, classify the gap:

- `metadata_gap`: existing icon exists but needs tags or aliases.
- `intent_gap`: query needs a phrase rule or token-suppression adjustment.
- `library_gap`: no suitable icon exists in the current library filter.
- `new_icon_gap`: a new icon should be added through Icons Lab.

Mapping: user job 3, user job 4.

### FR9: Icons Lab Backlog Output

For `new_icon_gap`, generate a lightweight concept brief that Icons Lab can use later:

```json
{
  "id": "vehicle-plate-scan",
  "label": "Vehicle plate scan",
  "meaning": "Automatic license plate recognition or vehicle scanning",
  "must_show": ["car", "license plate", "scan"],
  "avoid": ["legal license document", "dinner plate", "generic camera only"],
  "search_aliases": ["license plate recognition", "alpr", "vehicle scan", "traffic camera"]
}
```

Mapping: user job 3, future Icons Lab workflow.

### FR10: Regression Fixtures From Real Queries

Promote real failed and weak searches into fixtures:

- query
- expected variants
- forbidden variants
- expected top icon or acceptable icon family
- library filter behavior
- search gap classification

Mapping: user job 4, risk mitigation for regressions.

### FR11: Public-Safe Diagnostics

Add optional diagnostics for maintainers that show:

- normalized query
- query type
- query variants
- selected fallback reason
- gap classification

Diagnostics must not include secrets, service role keys, private user identifiers, internal model names, or hidden review metadata.

Mapping: maintainer job, public-safe output rule.

### FR12: Review Workflow

Create a lightweight review workflow:

1. Export failed and low-result search queries.
2. Cluster similar queries.
3. Classify each cluster as metadata, intent, library, or new-icon gap.
4. Add tests first.
5. Implement the smallest rule or metadata change.
6. Smoke test web and MCP paths.
7. Sync hosted catalog only after local verification.

Mapping: user job 4, release risk reduction.

## Implementation Phases

### Phase 1: Foundation And Fixtures

Deliverables:

- Add `data/search-intent-fixtures/real-query-gaps.json`.
- Add fixture cases for:
  - `license plate recognition camera scan car`
  - `vercel v0 ai app builder logo`
  - `cursor ai code editor logo`
  - `neck pain person`
  - `dream interpretation moon star eye mystical`
- Extend `scripts/verify-search-intent-expansion.mjs` or add a focused verifier for real query gaps.

Acceptance criteria:

- Each fixture has expected variants and forbidden weak variants.
- The verifier fails if a known long query falls back only to irrelevant standalone words.
- The verifier passes locally before implementation moves to hosted search changes.

### Phase 2: Intent Dictionary And Variant Builder

Deliverables:

- Add curated compound-phrase rules to the shared search-intent layer.
- Add role-aware query variant generation:
  - compound phrase
  - object-action pair
  - object-device pair
  - strong single visual term
- Keep weak-token suppression.

Acceptance criteria:

- `license plate recognition camera scan car` includes useful variants such as `license plate recognition`, `license plate camera`, `vehicle scan`, `camera scan`, `camera`, `scan`, and `car`.
- It does not treat `license` or `plate` as strong standalone fallbacks.
- `xai artificial intelligence logo` still prioritizes `xai` and does not broaden into standalone `logo`.

### Phase 3: Hosted Web And MCP Alignment

Deliverables:

- Confirm hosted search uses the updated shared intent behavior.
- Keep query variant fan-out bounded to avoid expensive searches.
- Add tests around `supabase/functions/_shared/search-engine/handle-search-request.ts` expectations where practical.

Acceptance criteria:

- The same query variant plan is available to web and hosted MCP search.
- Candidate batches remain bounded.
- No public response exposes sensitive server configuration.

### Phase 4: Local MCP And Recommend Alignment

Deliverables:

- Mirror the shared intent changes into `mcp/runtime/search-intent-core.js` if the runtime copy remains.
- Update `recommend_icons` to use compound phrase and brand/logo intent where useful.
- Add direct recommendation smoke tests for brand/logo slots and long concept slots.

Acceptance criteria:

- `recommend_icons` keeps exact brand/logo recommendations for Codex, Lovable, Kickbacks.ai, and xAI.
- Long concept slots return useful families or a clear low-confidence fallback.
- MCP package verification passes before publishing.

### Phase 5: Gap Classification And Icons Lab Bridge

Deliverables:

- Add a gap classifier for no-result and low-confidence cases.
- Add public-safe `missing_icon_candidate` output for internal review or admin workflows.
- Define an export shape that Icons Lab can consume as a concept brief later.

Acceptance criteria:

- `license plate recognition camera scan car` can be classified as a new-icon gap when no dedicated icon exists.
- The fallback remains useful, such as camera or car scan related icons.
- The concept brief includes `must_show`, `avoid`, and `search_aliases`.

### Phase 6: Review And Release Workflow

Deliverables:

- Add or update a maintainer checklist for search quality releases.
- Run local smoke tests.
- Run package/public-safety checks.
- Sync hosted catalog only after approval.
- Deploy hosted changes only after explicit approval.
- Publish npm only after package verification and account login readiness.

Acceptance criteria:

- No Netlify deploy is run without explicit approval.
- No npm publish is attempted until package checks pass.
- No Supabase sync is run without the required hosted credentials being provided by the owner.

## Test Plan

### Unit And Fixture Tests

- `node scripts/verify-search-intent-expansion.mjs`
- `node scripts/verify-search-intent-dictionary.mjs`
- New real-query gap fixture verifier

### Local MCP Smoke Tests

Run local searches for:

- `xai logo`
- `license plate recognition camera scan car`
- `cursor ai code editor logo`
- `vercel v0 ai app builder logo`
- `neck pain person`
- `dream interpretation moon star eye mystical`

Expected behavior:

- Exact brand/logo queries return exact Supericons results where available.
- Long non-logo queries return useful fallback icon families instead of no results.
- Weak standalone variants do not dominate results.

### Hosted Search Smoke Tests

After approved deployment or function update:

- Test the web search endpoint.
- Test hosted MCP `search_icons`.
- Compare the query variant behavior against local expectations.

### Recommend Tool Smoke Tests

Run `recommend_icons` for:

- AI tool logo slots: Codex, Lovable, Kickbacks.ai, xAI.
- UI concept slots: license plate recognition, dream interpretation, neck pain.

Expected behavior:

- Exact brand/logo slots preserve high confidence.
- Concept slots either return useful icon families or clear low-confidence guidance.

### Public-Safety Tests

- `node scripts/verify-public-safety.mjs --verbose`
- `npm --prefix mcp run verify:public-safety`
- MCP package verification before publish.

## Success Metrics

- Lower no-result rate for long natural-language queries. [ASSUMPTION]
- Higher exact-match rate for AI tool/logo searches. [ASSUMPTION]
- Fewer MCP agents incorrectly narrowing logo searches to `simpleicons` when the Supericons library has the match. [SOURCE: current product discussion]
- More failed queries converted into explicit metadata, intent, or Icons Lab backlog actions. [ASSUMPTION]
- No increase in noisy results for short exact searches. [ASSUMPTION]

## Risks

| Risk | Mitigation |
| --- | --- |
| Over-broad search from generic words | Keep weak-token suppression and forbidden-variant tests. |
| Web and MCP drift | Use shared fixtures and a runtime-copy drift check. |
| Brand/logo exact matches get diluted | Keep exact brand/logo tests and library-specific boosts. |
| Hosted search cost increases from more query variants | Cap variants and candidate batch limits. |
| Maintainer workflow becomes subjective | Require each query cluster to be classified as metadata, intent, library, or new-icon gap. |
| Public diagnostics leak private details | Limit diagnostics to normalized query, variants, and safe classification fields. |

## Open Questions

1. Should the compound-phrase dictionary live in code, JSON data, or the public registry metadata?
2. Should hosted search return a public `gap_type` field, or should that stay in admin/search-audit tooling only?
3. What score threshold defines `low-confidence` across web search and MCP?
4. Should `recommend_icons` call the same variant builder directly, or keep a slot-specific wrapper around it?
5. How much query variant fan-out is acceptable for hosted search before latency or Supabase load becomes a concern?
6. Which repeated search gaps should become first Icons Lab backlog items after the search layer is stable?

## Proposed Immediate Next Step

Implement Phase 1 and Phase 2 together:

1. Add real-query fixtures.
2. Add compound phrase rules for the five known gaps.
3. Extend the verifier.
4. Run local smoke tests for web-intent behavior and local MCP search behavior.

This gives Supericons a repeatable search-quality loop before any hosted deployment, npm publish, or Supabase sync.
