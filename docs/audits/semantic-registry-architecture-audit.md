# Semantic Registry Architecture Audit

**Date:** 2026-05-01
**Scope:** `public/registry/records.json` and surrounding registry infrastructure
**Artifact:** 291,402 lines / 9.6 MB / 15,103 records / 21,264 icons across 10 libraries

---

## 1. Current Structure — Solid Foundation, Brittle Scale

### What Works Well

| Layer | Detail |
|---|---|
| **Schema** | Rich semantic model — `label`, `depicts`, `semantic_tags[]`, `synonyms[]`, `use_when`, `avoid_when`, `purpose`, `category` — far beyond what icon libraries typically provide |
| **Visibility** | 3-tier access model (`public_open_record`, `protected_premium_record`, `private_operational_enrichment`) with projection policies — clean separation of public vs premium content |
| **Source/pipeline** | `data/si-registry/` holds per-library approved records; `build-si-registry-projections.mjs` aggregates, validates, and projects them into distribution targets |
| **Validation** | Records go through `validateRegistryRecord()` (15 required fields, controlled vocabularies) — no bad data can leak to public |
| **Search quality** | Weighted scoring across 7 semantic fields with edit-distance fuzzy matching and synonym expansion in `mcp/semantic-registry.js` |
| **Supporting ecosystem** | `synonyms.json` (298 entries), `icon-taxonomy.json` (1,676 lines), per-pack bundle manifests, `icon-index.json` (21K+ icons) |

### What Is Problematic

| Issue | Severity | Impact |
|---|---|---|
| **Single 9.6 MB JSON file** | High | Every MCP search call loads 9.6 MB into memory via `loadSemanticRegistryRecords()` → `Map`. Browser-side usage would be catastrophic. |
| **Duplication** | Medium | `public/registry/records.json` and `mcp/public/registry-records.json` are identical copies — 2x disk usage and 2x build writes |
| **All-or-nothing updates** | High | Changing one record's `depicts` requires rebuilding all 15K projections. Build script reads every source file, normalizes all records, writes all outputs. |
| **No database layer** | High | Zero ability to query a subset, update incrementally, or handle concurrency |
| **Git-hostile** | Medium | A 1-word typo fix in one record produces a 9.6 MB diff — unreviewable in PRs |
| **Browser load cost** | High | If any client-side code touches this file (SEO JSON-LD, sitemap enhancement, search), it's a 9.6 MB uncompressed download |
| **Memory pressure** | Medium | MCP server holds a `Map` of all 15,103 records in memory — grows linearly with registry size |

---

## 2. Design-Thinking Perspective

### Jobs to Be Done

- **JTBD 1:** As a human typing "download" into a search box, I want relevant icons instantly → needs <50ms latency
- **JTBD 2:** As an AI agent building a UI, I want to find an icon by semantic intent ("show me a verified status icon") → needs rich semantic matching
- **JTBD 3:** As the registry owner, I want to update 50 records from a new library batch → needs partial/delta updates, not full rebuilds

### Gap Analysis

The current design **over-serves JTBD 2** (great semantic matching infrastructure) but **under-serves JTBD 1** (search latency — parsing 9.6 MB) and **actively fights JTBD 3** (all-or-nothing rebuilds make updates toil-heavy).

### The Core Tension

> A **search-first** product with a **compile-last** data model.

The registry is architected like a static site generator's content graph — excellent for build-time correctness, poor for run-time query performance. For a tool whose primary function is real-time search, the data must be queryable directly, not loaded into memory and scanned.

---

## 3. Data Storage Analysis

### Is This a Database Structure?

**No.** It is purely file-system JSON with a deterministic build pipeline:

- No indexed queries — `loadSemanticRegistryRecords()` does `JSON.parse(readFileSync(...))` every time
- No partial reads — the entire file is parsed even for a single record lookup
- No incremental writes — any record change means flagging the file for full regeneration
- No transaction boundaries — no assurance the file isn't mid-write during a read
- No concurrent access control

The project already has **Supabase** infrastructure (auth, products, purchases, Stripe, Edge Functions). The semantic registry is one of the few remaining pieces living entirely in git-tracked JSON files.

### Is JSON the Best Format?

**For the compiled CDN artifact — yes.** JSON is universally parseable, CDN-friendly, gzips to ~1.5-2 MB, and every MCP runtime reads it natively.

**For the source of truth — no.** The source records in `data/si-registry/automation/<library>/approved-records.json` should live in a database. The JSON files should be **compiled outputs**, not the **live data store**.

### Current vs. Desired Flow

```
Current:  Source JSON → Build → Output JSON → MCP loads entire Output JSON into memory
Better:   Database → Query → Serialize → CDN cache → MCP/client queries lazily
```

### Record Distribution by Library

| Library | Records | Percentage |
|---|---|---|
| tabler | ~4,800 | ~32% |
| material | ~4,200 | ~28% |
| simpleicons | ~3,000 | ~20% |
| lucide | ~1,300 | ~9% |
| phosphor | ~1,000 | ~7% |
| bootstrap | ~800 | ~5% |
| iconoir | ~800 | ~5% |
| mingcute | ~800 | ~5% |
| ionicons | ~300 | ~2% |
| heroicons | ~100 | ~1% |

---

## 4. Clone & Reverse-Engineering Protection

A database-backed registry on Supabase does **not** protect the public data from being cloned. It *does* improve the enforcement of premium boundaries and make bulk exfiltration harder.

### The Hard Constraint

The public semantic data in `records.json` is already fully exposed as a static download. Anyone can `wget` it today. Moving it behind an API endpoint doesn't hide what users need to see to get search results — browser search and MCP clients *must* receive icon metadata to function. The data that is free today will remain free to discover. The real intellectual property moat is the **premium content**, not the public catalog.

### What Improves With a Database

| Mechanism | File-based (Current) | Database-backed (Supabase + RLS) |
|---|---|---|
| **Premium data isolation** | Build-script filter — correctness depends on build not failing to exclude `protected_premium_record` and `private_operational_enrichment` tiers | Row-Level Security policies enforced at SQL query time — impossible to leak premium rows through a misconfigured build step |
| **Bulk exfiltration** | Single `wget` of a static URL downloads the entire public dataset in one request | Rate limiting per API key, `LIMIT` + `OFFSET` pagination caps, query complexity thresholds on Edge Functions |
| **Audit trail** | None — no way to know who accessed the file or how often | Every query logged via `pg_stat_statements`, Supabase logs, or Edge Function telemetry; unusual access patterns are detectable |
| **Access revocation** | Rebuild and redeploy the entire file to remove records from public view | Revoke the API key or tighten RLS policy instantly at the database level — no deployment needed |
| **Granular field exposure** | All-or-nothing — every public field is in the static file | Per-field RLS or API-level stripping — e.g., serve `label` and `semantic_tags` to unauthenticated clients but withhold `use_when` and `avoid_when` |
| **Search abuse prevention** | None — a scraper can run local regex/levenshtein against the downloaded file offline, bypassing any server-side rate limiting entirely | All search traffic flows through controlled endpoints with per-key quotas, CAPTCHA, and anomaly detection |

### What Doesn't Change

- **Dedicated cloners will still get the data.** A determined scraper with a valid API key can paginate through every record. The goal shifts from *preventing* access to *detecting* and *limiting* bulk extraction.
- **Public search results must remain public.** The value proposition for humans (browser search via SEO) and AI agents (MCP search) depends on surfacing icon metadata openly. Obfuscating the catalog would defeat the product's purpose.
- **The real defense is premium content.** The `visibility-model.json` already defines `protected_premium_record` and `private_operational_enrichment` tiers with projection restrictions. A database makes this restriction **enforceable at query time** rather than relying on a build script that could silently fail to filter.

### Strategic Recommendation

Accept that the public catalog is cloneable — that's the cost of discoverability. Invest the database migration effort into:

1. **Hardening premium isolation** — RLS policies that make it structurally impossible for premium records to appear in public queries, regardless of build-time errors.
2. **Rate limiting and usage-tiering** — free API keys get lower rate limits and fewer results per page; pro keys get full access. This gives legitimate users what they need while making bulk scraping uneconomical.
3. **Progressive disclosure** — public/unauthenticated queries return only `icon_id`, `label`, `source_library`, and `semantic_tags`. Rich fields like `depicts`, `use_when`, and `avoid_when` require an authenticated MCP/API key. This preserves search quality while withholding the editorial curation layer.
4. **Watermarking the editorial data** — the `use_when`, `avoid_when`, and curation taxonomy are the defensible intellectual property, not the icon names from open-source libraries. Treat those fields as premium editorial content rather than public domain metadata.

---

## 5. Internal Data Model Audit

### Full Internal Record Schema (`lib/si-registry/record-shape.js`)

**Required fields (18):**
`icon_id`, `source_library`, `source_name`, `label`, `purpose`, `category`, `semantic_tags[]`, `use_when`, `avoid_when`, `depicts`, `version`, `status`, `access_tier`, `projection_policy`

**Optional fields (15):**
`source_group`, `source_asset_name`, `collection_id`, `collection_title`, `is_premium`, `raw_category`, `synonyms[]`, `state`, `review_state`, `evidence[]`, `editorialNotes`, `internalSignals`, `projectionTargets[]`

### Public Projection Fields (what goes to `records.json`)

`icon_id`, `source_library`, `source_name`, `label`, `depicts`, `semantic_tags[]`, `synonyms[]`, `use_when`, `avoid_when`

### Controlled Vocabularies (`data/si-registry/controlled-vocabularies.json`)

- **Category (17):** `agent_lifecycle`, `analytics_data`, `brand_identity`, `commerce`, `communication_social`, `configuration`, `data_controls`, `destructive_actions`, `engineering_developer_tools`, `message_actions`, `media_playback`, `navigation_interface`, `search_discovery`, `security`, `security_auth`, `status_feedback`, `system_control`, `systems_architecture`
- **Intent (11):** `act`, `control`, `configure`, `inform`, `confirm`, `delete`, `discover`, `dismiss`, `navigate`, `refine`, `warn`
- **Status (3):** `draft`, `reviewed`, `approved`
- **Review State (3):** `human_reviewed`, `editor_approved`, `source_mapped`

### Build Pipeline (`scripts/build-si-registry-projections.mjs`)

1. Reads all 10 record groups from `data/si-registry/automation/<library>/approved-records.json`
2. Reads import sources (premium manifest from `public/packs/manifest.json`)
3. Normalizes every record (`buildRegistryId`, `normalizeSourceGroup`, projection targets)
4. Validates every record against `record-shape.js`
5. Applies visibility rules (access tier × projection policy intersection)
6. Sorts all records alphabetically by `icon_id`
7. Writes 7 output files including the two 9.6 MB JSON artifacts

---

## 6. Recommendations

### Phase 1 — Quick Wins (no infra changes)

**1. Split `records.json` per library**

Instead of one 9.6 MB file, produce 10 files totaling 9.6 MB:

```
public/registry/records/material.json
public/registry/records/lucide.json
public/registry/records/tabler.json
...
```

The MCP search can lazy-load only the libraries it hasn't searched yet. If a user searches within a specific library, only that library's file needs to be loaded.

**2. Pre-build a serialized search index**

Use a lightweight inverted-index library (MiniSearch — works in Node and browser, <50KB) to produce a serialized index alongside the records:

```
public/registry/search-index.json   (~200 KB, grows sublinearly)
public/registry/records/*.json      (per-library, lazy-loaded on demand)
```

Benefits:
- MCP startup memory drops from 9.6 MB to ~200 KB of index
- Individual records are looked up by `icon_id` on demand
- Search index can include `semantic_tags`, `synonyms`, and weighted `label/depicts/use_when` fields
- Updates only rebuild the index, not all records

**3. Stop duplicating `mcp/public/registry-records.json`**

Have the MCP code read from `public/registry/` directly rather than maintaining an identical copy.

**4. Gzip pre-compression**

Generate `.json.gz` alongside each JSON file. Netlify (already in use) can serve these with `Content-Encoding: gzip`, reducing transfer from 9.6 MB to ~1.5 MB.

### Phase 2 — Database-backed Source of Truth

**5. Move source records to Supabase**

Create a `si_registry_records` table:

```sql
CREATE TABLE si_registry_records (
  icon_id TEXT PRIMARY KEY,
  source_library TEXT NOT NULL,
  source_name TEXT NOT NULL,
  source_group TEXT DEFAULT 'free',
  label TEXT NOT NULL,
  purpose TEXT NOT NULL,
  category TEXT NOT NULL,
  semantic_tags TEXT[] NOT NULL DEFAULT '{}',
  synonyms TEXT[] DEFAULT '{}',
  use_when TEXT NOT NULL,
  avoid_when TEXT NOT NULL,
  depicts TEXT,
  version TEXT DEFAULT '1.0.0',
  status TEXT DEFAULT 'draft',
  access_tier TEXT NOT NULL,
  projection_policy TEXT NOT NULL,
  is_premium BOOLEAN DEFAULT false,
  review_state TEXT,
  evidence TEXT[] DEFAULT '{}',
  editorial_notes TEXT,
  internal_signals JSONB,
  routing_score NUMERIC(3,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_registry_library ON si_registry_records(source_library);
CREATE INDEX idx_registry_access_tier ON si_registry_records(access_tier);
CREATE INDEX idx_registry_status ON si_registry_records(status);

-- FTS for semantic search
ALTER TABLE si_registry_records ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english',
      coalesce(label, '') || ' ' ||
      coalesce(depicts, '') || ' ' ||
      coalesce(use_when, '') || ' ' ||
      coalesce(avoid_when, '') || ' ' ||
      coalesce(array_to_string(semantic_tags, ' '), '') || ' ' ||
      coalesce(array_to_string(synonyms, ' '), '')
    )
  ) STORED;

CREATE INDEX idx_registry_fts ON si_registry_records USING GIN(search_vector);
```

Benefits:
- Update individual records with `UPDATE ... WHERE icon_id = $1`
- Query subsets by library, review state, or status
- Postgres FTS provides fast semantic search
- Row-level concurrency

**6. Build pipeline becomes an export step**

Instead of reading JSON sources and building projections, the build script:
1. Pulls records from Supabase (filtering by `can_appear_in_public = true`)
2. Applies validation
3. Writes JSON artifacts to `public/registry/` as CDN-friendly static files

This runs once per library-batch-approval or on a cron schedule — not on every individual edit.

**7. MCP search queries the database (or Edge Function)**

Two options:
- **Direct DB query:** MCP server uses Supabase client to query `si_registry_records` with FTS
- **Edge Function:** A `search-registry` Edge Function that accepts a query string and returns scored results

Both eliminate the 9.6 MB in-memory load entirely.

### Phase 3 — Scale & Future-Proofing

**8. Vector search for semantic similarity**

Add a `pgvector` embedding column to enable "find icons similar to this concept" queries:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
ALTER TABLE si_registry_records ADD COLUMN embedding vector(384);

CREATE INDEX idx_registry_embedding ON si_registry_records
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

Embed the concatenation of `label + depicts + use_when + semantic_tags` using a small embedding model. This unlocks queries like "show me icons that feel trustworthy" that keyword matching cannot express.

**9. Delta sync to CDN**

Use Supabase Realtime or a webhook to push incremental record changes to a CDN invalidation queue, enabling stale-while-revalidate on the compiled JSON artifacts.

**10. Registry growth projection buffer**

At the current rate, if the registry grows to 50K+ records:
- JSON file size would reach ~30 MB — untenable for client-side
- In-memory Map would exceed 150 MB
- FTS index in Postgres would remain sub-second even at 500K records

The database-backed approach scales linearly with query patterns, not data volume.

---

## 7. Summary

| Aspect | Current | Recommended |
|---|---|---|
| **Source of truth** | JSON files in `data/si-registry/` | Supabase `si_registry_records` table |
| **Public distribution** | Single 9.6 MB JSON + duplicate copy | Per-library JSONs + pre-built search index |
| **MCP search** | Load 9.6 MB JSON → in-memory Map → score | Query database or deserialized index → score |
| **Updates** | Rebuild all projections for any change | UPDATE row in DB → re-export changed library's JSON |
| **Version control** | JSON diffs unreadable | Schema migrations + seed data in SQL |
| **Search latency** | ~100ms-500ms (parse + scan) | <10ms (indexed query) |
| **Memory footprint** | 9.6 MB per MCP instance | ~200 KB (index) + per-record lookups |

### Bottom Line

The **semantic model is excellent** — the problem is purely how it is stored, distributed, and queried. The fix is moving from a file-based monolith (compile-first, search-later) to a database-backed architecture (query-first, export-later), using the compiled JSON files as CDN artifacts rather than the live data source.
