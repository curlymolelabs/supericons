# Public Registry Audit Findings

**Date:** 2026-05-01  
**Scope:** `public/registry/records.json`, generated registry projections, public search goals, MCP search goals, and registry update workflow.

## Executive Summary

The public semantic registry is a useful and well-structured export for AI agent consumption, but a single large JSON array should not be treated as the long-term editing surface or the main human search surface.

The current project already separates source records, generated public records, MCP records, and hosted search database tables. That is a strong foundation. The next improvement should be to make the registry easier to update incrementally and easier for humans to discover through search engines.

Recommended direction:

- Keep `records.json` as a generated public export.
- Do not edit the large public JSON file by hand.
- Keep authoritative registry data in smaller source files or normalized database tables.
- Use database indexes for fast search and ranking.
- Generate human-readable HTML pages for browser search engines.
- Add diff-based update workflows so unchanged records are not repeatedly reviewed or rebuilt.

## Verified Current State

The following facts were verified from the repo during the audit.

| Item | Verified Finding |
|---|---|
| Public registry path | `public/registry/records.json` |
| Public summary path | `public/registry/summary.json` |
| Public registry format | One pretty-printed JSON array |
| Public registry line count | 291,403 lines |
| Public registry size | About 9.6 MB |
| Public semantic record count | 15,103 records |
| Full icon asset catalog count | 21,264 icons in `public/icon-index.json` |
| Duplicate public semantic IDs | 0 duplicate `icon_id` values found |
| Empty semantic tag arrays | 0 records found |
| Records without synonyms | 6 records found |
| Records using the generic avoid text | 3,633 records found |
| Registry verification command | `npm run verify:si-registry` |
| Verification result | `verify-si-registry-projections: ok` |

The public semantic registry does not currently contain more than 21,000 semantic records. The 21,000+ count applies to the broader icon asset catalog.

## Current Architecture

The current registry is not just one JSON file. It has several layers:

- Source records live under `data/si-registry/`.
- `data/si-registry/registry-manifest.json` defines record groups and generated outputs.
- `scripts/build-si-registry-projections.mjs` builds generated registry outputs.
- `lib/si-registry/projections.js` normalizes, sorts, filters, and sanitizes records.
- `public/registry/records.json` is a public-safe generated projection.
- `mcp/public/registry-records.json` mirrors the public registry for MCP use.
- Supabase migrations define database-backed hosted search tables and full-text indexes.
- `scripts/sync-search-catalog-to-supabase.mjs` syncs catalog and public registry metadata into hosted search tables.

This means `records.json` is best understood as a distribution artifact, not the source of truth.

## Is JSON The Best Format?

JSON is suitable for:

- Public export.
- Static hosting.
- MCP package distribution.
- Simple ingestion by many programming languages.
- Versioned snapshots.

JSON is weaker for:

- Partial updates.
- Large review workflows.
- Fine-grained ownership.
- Fast runtime search.
- Ranking and analytics.
- Browser search engine discovery.

For the current size, a 9.6 MB JSON export is workable. For long-term growth, the risk is not only file size. The larger problem is maintainability: one large public JSON array is hard to review, diff, update, and reason about.

## Is The Current Structure A Database?

`public/registry/records.json` is not a database. It is a generated JSON export.

The project does have a database-backed search layer in Supabase. Verified database elements include:

- `icon_catalog`
- `icon_search_public_registry_metadata`
- generated full-text search documents
- GIN indexes
- `si_search_icon_candidates(...)` search RPC

That database layer is a better fit for hosted search, ranking, and runtime retrieval than loading and scanning a large JSON file.

## Would Supabase Protect The Registry From Cloners?

Moving the authoritative registry into Supabase would improve control, but it would not fully protect any data that the product intentionally exposes.

The important rule is simple:

> If a browser, public API, public JSON file, generated HTML page, or MCP response can see the data, a determined cloner can copy it.

Supabase can protect:

- private source records
- premium-only registry records
- internal review notes
- search quality signals
- query analytics
- owner workflow data
- unreleased records
- fields that should not be returned to the public client

Supabase cannot fully protect:

- public icon labels
- public semantic tags
- public synonyms
- public usage guidance
- public SEO pages
- public MCP search results
- any JSON export hosted without authentication

This means a database is useful for access control and operational security, but it is not a complete anti-cloning strategy by itself.

### Recommended Protection Model

The registry should be split into public, protected, and private layers.

| Layer | Where It Can Live | Cloning Risk | Notes |
|---|---|---|---|
| Public discovery data | Generated HTML, sitemap, limited public JSON, public MCP responses | High | Assume it can be copied. Keep it useful but not exhaustive if cloning risk matters. |
| Protected premium data | Supabase with authentication and entitlement checks | Medium | Only return to entitled users. Still protect API limits and monitor abuse. |
| Private operating data | Supabase private tables or private repo files | Low if access is configured well | Never expose through public exports, public APIs, or client-side bundles. |

### Practical Anti-Cloning Controls

Recommended controls if the registry moves to Supabase:

- Keep Row Level Security enabled on registry tables.
- Use service-role keys only in server-side functions, never in browser code.
- Return only the fields needed for each user action.
- Keep premium and internal fields out of public search responses.
- Rate-limit search and MCP endpoints.
- Add API key or account-based access for higher-volume MCP usage.
- Log unusual scraping patterns, repeated full-catalog walks, and high-volume queries.
- Avoid offering a full public dump unless the business intentionally accepts copying risk.
- Publish generated HTML pages for SEO, but keep them focused on human discovery rather than exposing every private ranking signal.
- Keep internal signals, review notes, and quality scores out of public JSON, public HTML, and MCP responses.

### Product Reality

For public icon search, some data must be visible for the product to work. The goal should not be "make public data impossible to copy." That is not realistic. The better goal is:

- protect private and premium value
- make scraping expensive enough to discourage casual cloning
- keep operational intelligence private
- make the live product better than a copied snapshot through ranking, updates, support, premium access, and workflow quality

In short: Supabase helps protect the source of truth and private layers, but public registry data remains copyable once exposed.

## Design Thinking Assessment

The registry should be judged by the jobs it needs to support.

For humans, the job is:

- Search for a concept.
- Understand which icon fits.
- Compare alternatives quickly.
- Trust that the result matches intent.

For AI agents, the job is:

- Convert a user intent into good icon candidates.
- Retrieve SVG output quickly.
- Avoid misleading icons.
- Explain why an icon is suitable when useful.

For the registry owner, the job is:

- Add or improve records quickly.
- Review only what changed.
- Catch quality problems before release.
- Avoid expensive full-registry regeneration when a small slice changes.

The current design supports correctness and auditability better than update speed. The next design goal should be reducing owner effort while preserving quality.

## Search Experience Recommendations

### For Browser Search Engines

A large JSON file is not the best human-facing search surface. Search engines generally perform better with crawlable pages.

Recommended public outputs:

- One page per icon.
- One page per library.
- One page per semantic tag.
- One page per use case or job category.
- Sitemap entries for those pages.
- Plain-language descriptions on generated HTML pages.

Example page patterns:

- `/icons/lucide/shield-check/`
- `/icons/tabler/trash/`
- `/icons/tags/security/`
- `/icons/use/delete/`
- `/icons/libraries/lucide/`

These pages should be generated from the same registry data, not maintained by hand.

### For MCP And AI Agents

MCP should use an indexed search path rather than relying only on a large static file.

Recommended MCP search flow:

1. Normalize the query.
2. Search database-backed text indexes.
3. Add synonym and tag matches.
4. Apply ranking and avoid-rule penalties.
5. Return a short candidate list with SVG references.
6. Include semantic fields only where they improve selection.

For complex intent queries, consider adding embedding search as a second-stage reranker, especially for phrases like:

- "delete account"
- "AI assistant"
- "sync failed"
- "medical appointment"
- "secure checkout"

## Update Workflow Recommendations

The registry should be engineered so the owner can update small slices safely.

Recommended workflow:

1. Track source library version and icon content hash.
2. Detect added, removed, renamed, and visually changed icons.
3. Generate candidate semantic records only for changed icons.
4. Queue changed records for review by library and risk level.
5. Promote approved records into source files or database tables.
6. Rebuild public projections from source.
7. Run verification.
8. Sync hosted search tables.
9. Generate sitemap and static SEO pages.

This avoids paying the full review cost every time.

## Data Model Recommendations

A normalized source model would be easier to maintain than one large public array.

Recommended core entities:

| Entity | Purpose |
|---|---|
| `icons` | Stable icon identity, library, source name, style, asset references |
| `semantic_records` | Label, purpose, depicts, use rules, status, version |
| `semantic_terms` | Tags, synonyms, aliases, weighted terms |
| `visual_variants` | Outline, solid, filled, stroke, or pack-specific variants |
| `review_events` | Review status, reviewer decisions, quality notes |
| `search_metrics` | Queries, clicks, no-result searches, selected icons |
| `exports` | Generated public and MCP snapshots |

Public exports should include only public-safe business data. Internal review notes, operational signals, and process metadata should stay private.

## Format Recommendations

Use different formats for different jobs:

| Job | Recommended Format |
|---|---|
| Human editing and review | Small per-library JSON files, JSONL, or database admin UI |
| Runtime hosted search | Postgres tables with full-text indexes |
| Static MCP distribution | Minified JSON or split JSON by library |
| Browser SEO | Generated HTML pages and sitemap files |
| Analytics and feedback | Database tables |
| Backups and releases | Versioned export snapshots |

JSON is still useful, but it should be one output of the system, not the whole system.

## Specific Issues To Watch

The audit found 3,633 records using the same generic avoid text:

> Do not use when the product needs a more specific action, status, or domain meaning than this generic draft can support.

This is not necessarily invalid, but it limits search quality. `avoid_when` is most useful when it distinguishes confusing cases, such as:

- trash vs archive
- lock vs shield
- alert vs error
- upload vs send
- user vs account

The audit also found 6 records without synonyms. That is a small number, but synonym coverage should remain part of registry quality checks.

## Recommended Roadmap

### Near Term

- Keep generating `public/registry/records.json`.
- Add a minified export for public/MCP use.
- Split public registry exports by library.
- Add a small quality report for missing synonyms and generic avoid text.
- Make sure generated public files are not manually edited.
- Define which registry fields are public, protected, and private before moving more data into Supabase.

### Medium Term

- Generate SEO pages for icons, tags, use cases, and libraries.
- Add sitemap entries for generated registry pages.
- Use query logs to identify missing terms and poor matches.
- Add diff-based registry update scripts.
- Add quality gates for generic or low-value semantic copy.
- Add rate limits, scraping detection, and entitlement checks around hosted registry search.

### Long Term

- Move authoritative registry management into a normalized database or structured registry service.
- Keep Git-tracked exports for release snapshots.
- Add embedding search or semantic reranking for intent-heavy queries.
- Build an owner-facing review dashboard for changed icons, low-confidence records, and no-result queries.

## Final Recommendation

The current registry format is acceptable as a generated public artifact, but it is not optimal as the primary registry maintenance model.

The best architecture is a registry pipeline:

- structured source data for ownership and updates
- validation for safety and quality
- database indexes for fast search
- generated JSON for MCP and static distribution
- generated HTML for browser discovery
- feedback loops from real searches

This gives humans and AI agents faster search while giving the registry owner a much lighter update workflow.
