# Semantic Registry Format & Architecture Audit
> **Date:** 2026-05-01  
> **Auditor:** Kimi Code CLI  
> **Scope:** `public/registry/records.json`, the SI Registry pipeline (`data/si-registry/`), MCP consumption, browser search integration, and the update workflow.  
> **Record Count Audited:** 15,103 public records (9.6 MB, 291,403 lines of prettified JSON).  

---

## Executive Summary

The Supericons semantic registry is a **high-value, high-maintenance asset** that sits at the intersection of human browser search, AI agent search (MCP), and semantic meaning-layer quality. The current architecture is **functional but not optimal** for the scale and velocity the product is approaching. It suffers from three core problems:

1. **Monolithic JSON as a production read-path** — The entire registry is a single 9.6 MB array loaded into memory for MCP and rebuilt as a single blob on every update.
2. **Batch-oriented, human-gated update pipeline** — Updating even one icon requires deterministic batch scripts, review cycles, and full-registry rebuilds.
3. **Split-brain between file-system source-of-truth and database search** — Supabase hosts a tsvector-powered search table, but the canonical registry data lives in Git-tracked JSON files that must be manually synced.

From a **Design Thinking + Apps Engineering** perspective, the registry is currently optimized for *correctness and auditability* (which is good), but it is not optimized for *velocity, partial updates, or runtime scalability* (which is becoming a bottleneck).

---

## 1. Current Architecture Map

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DATA/SI-REGISTRY (Source of Truth)                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐│
│  │ records/    │  │ automation/ │  │ pilot/      │  │ private/ (future)   ││
│  │ free-pilot  │  │ <lib>/      │  │ purpose-chip│  │                     ││
│  │ .json       │  │ approved-   │  │ approved-   │  │                     ││
│  │             │  │ records.json│  │ records.json│  │                     ││
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └─────────────────────┘│
└─────────┼────────────────┼────────────────┼─────────────────────────────────┘
          │                │                │
          └────────────────┴────────────────┘
                           │
              ┌────────────▼────────────┐
              │ build-si-registry-      │
              │ projections.mjs         │
              │ (read → normalize →     │
              │  sort → project)        │
              └────────────┬────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
  ┌──────▼──────┐  ┌───────▼────────┐  ┌─────▼──────────┐
  │ public/     │  │ mcp/public/    │  │ data/si-registry│
  │ registry/   │  │ registry-      │  │ /generated/     │
  │ records.json│  │ records.json   │  │ (projections)   │
  │ 9.6 MB      │  │ (same data)    │  │                 │
  └──────┬──────┘  └───────┬────────┘  └─────────────────┘
         │                 │
  ┌──────▼──────┐  ┌───────▼────────┐
  │ Browser     │  │ MCP Server     │
  │ (does NOT   │  │ (loads entire  │
  │  load JSON; │  │  file into     │
  │  uses       │  │  memory Map)   │
  │  Supabase   │  │                │
  │  hosted     │  │                │
  │  search)    │  │                │
  └─────────────┘  └────────────────┘
```

### 1.1 Record Schema (Public Projection)

```json
{
  "icon_id": "library:icon_name",
  "source_library": "library",
  "source_name": "icon_name",
  "label": "Human Label",
  "depicts": "Perceptual-literal visual description",
  "semantic_tags": ["tag"],
  "synonyms": ["phrase"],
  "use_when": "When to use it",
  "avoid_when": "When not to use it"
}
```

### 1.2 Library Distribution (Public Records)

| Library     | Count | % of Total |
|-------------|-------|------------|
| tabler      | 5,021 | 33.2%      |
| simpleicons | 3,412 | 22.6%      |
| lucide      | 1,951 | 12.9%      |
| mingcute    | 1,662 | 11.0%      |
| phosphor    | 1,512 | 10.0%      |
| iconoir     |   534 | 3.5%       |
| bootstrap   |   529 | 3.5%       |
| heroicons   |   325 | 2.2%       |
| ionicons    |    92 | 0.6%       |
| material    |    65 | 0.4%       |
| **Total**   | **15,103** | **100%** |

---

## 2. The Five Critical Questions — Answered

### Q1: Is the current structure best practice and optimal?

**Short answer:** No. It is **best practice for a small, static dataset**, but it is **suboptimal for a living registry** of 15K+ records that is actively growing.

**Evidence:**

| Criterion | Current State | Best Practice |
|-----------|---------------|---------------|
| **Partial updates** | ❌ Rebuild entire 9.6 MB blob | ✅ Row-level updates (DB or chunked files) |
| **Runtime memory** | ❌ MCP loads full array into heap | ✅ Lazy load, shard by library, or DB query |
| **Concurrent editing** | ❌ Git-merge conflicts on single JSON | ✅ Record-level locking or DB transactions |
| **Search performance** | ⚠️ In-memory Map scan (O(n)) | ✅ Indexed DB query (O(log n) or better) |
| **Browser payload** | ✅ 9.6 MB is NOT downloaded by browser (uses Supabase) | ✅ Keep it this way — do NOT load in browser |
| **Audit trail** | ✅ Full Git history of every batch | ✅ Good, but can be achieved with DB audit tables |
| **Offline/distributed** | ✅ JSON is portable | ✅ Still achievable with SQLite or export snapshots |

**Verdict:** The current structure is a **“pre-production” data pattern** that has survived because the team prioritized correctness, review gates, and Git-based auditability. It is now creating drag.

---

### Q2: What would an IDEO Design Thinking + Apps Developer expert recommend?

An IDEO-informed product engineer would reframe the problem around **three user journeys**:

#### Journey A: The Human Browser User
*Wants:* "I type `settings gear` and the right icon surfaces in <200ms."  
*Current state:* Served well by Supabase hosted search + tsvector.  
*Recommendation:* **Keep the hosted-search path, but decouple it from the JSON rebuild.** The DB should become the live search layer, with the JSON becoming a cold archive or MCP cache, not the sync trigger.

#### Journey B: The AI Agent (MCP)
*Wants:* "I need semantic context for `lucide:settings` instantly."  
*Current state:* MCP loads the entire 9.6 MB JSON into a Map on startup. At 15K records this is fine; at 100K+ it is a memory and cold-start problem.  
*Recommendation:* **Shard the MCP registry by library** (`mcp/public/registry-<library>.json`) and lazy-load only the shards referenced in a session. Or move MCP to a lightweight SQLite read-replica.

#### Journey C: The Registry Maintainer (You)
*Wants:* "I approved a batch of 50 icons. Promote them now without rebuilding everything."  
*Current state:* Run `build:si-registry` → rebuilds ALL projections → run sync script → full Supabase upsert.  
*Recommendation:* **Adopt an "event-sourced" or "append-only log" model.** Each approved record is a row-level event. The public projection becomes a *materialized view*, not a hand-rolled JSON concat.

#### IDEO Design Principles Applied

1. **Empathize with the maintainer:** The update workflow is described in the repo as "enormous and resource heavy." The design should optimize for *cognitive load reduction* — smaller, autonomous files; clear promotion paths; no full-rebuild anxiety.
2. **Ideate on autonomy:** What if each library were a self-contained, versioned micro-registry? Tabler could update without touching Simple Icons.
3. **Prototype fast feedback:** A maintainer should see the effect of a single record change in <2 seconds, not <2 minutes.
4. **Test for scale:** The current system will break (or at least become painful) somewhere between 30K–50K records when full-array sorts and JSON stringifies dominate build time.

---

### Q3: How should the registry be engineered for fast and accurate updating?

#### Recommended Target Architecture: "Registry as a Database, JSON as Cache"

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         EDITORIAL LAYER (Git + Human Review)                │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  data/si-registry/sources/<library>/<icon_id>.json  (one file each) │   │
│  │  OR                                                                 │   │
│  │  data/si-registry/sources/<library>.ndjson  (append-only stream)    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      │
                              ┌───────▼────────┐
                              │  Promotion     │
                              │  (CLI / API)   │
                              └───────┬────────┘
                                      │
┌─────────────────────────────────────▼───────────────────────────────────────┐
│                         DATABASE LAYER (Supabase / Postgres)                │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Table: icon_registry_records                                       │   │
│  │  - icon_id (PK)                                                     │   │
│  │  - source_library, source_name, label, depicts...                   │   │
│  │  - review_state: 'draft' | 'approved' | 'deprecated'                │   │
│  │  - version, updated_at, updated_by                                  │   │
│  │  - search_document (tsvector, generated)                            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    │                 │                 │
            ┌───────▼──────┐  ┌──────▼────────┐  ┌─────▼──────────┐
            │  MCP Server  │  │  Browser API  │  │  JSON Exporter │
            │  (SQL query) │  │  (SQL + RPC)  │  │  (CI/CD build) │
            │              │  │               │  │                │
            └──────────────┘  └───────────────┘  └───────┬────────┘
                                                        │
                                              ┌─────────▼──────────┐
                                              │ public/registry/   │
                                              │ records.json       │
                                              │ (optional cache)   │
                                              └────────────────────┘
```

#### Specific Engineering Changes

| # | Change | Effort | Impact |
|---|--------|--------|--------|
| 1 | **Per-library NDJSON or per-record JSON files** instead of monolithic arrays. | Low | High — eliminates merge conflicts, enables partial builds |
| 2 | **Promote DB to source-of-truth for live search**; keep Git files as the *editorial* source-of-truth. | Medium | High — instant search updates, no sync lag |
| 3 | **Add `icon_registry_records` table** with `review_state`, `version`, `updated_at`, and row-level security. | Low | High — enables real-time editorial workflow |
| 4 | **Build an incremental projection script** that reads *only changed* source files, upserts to DB, and optionally rebuilds JSON cache. | Medium | High — turns 2-min rebuild into 2-sec update |
| 5 | **Shard MCP registry by library** (`registry-tabler.json`, `registry-lucide.json`, etc.) and lazy-load. | Low | Medium — improves MCP cold-start and memory |
| 6 | **Introduce a simple migration/seed CLI** (`si-registry promote <library> --since <timestamp>`) instead of dozens of per-library scripts. | Medium | High — replaces ~60 ad-hoc scripts with one command |
| 7 | **Compress public JSON** (`records.json.gz` or `records.json.br`) for CDN distribution if browser ever needs it. | Low | Low — future-proofing |

#### The "One Command" Vision

Instead of:
```bash
npm run build:si-registry
npm run verify:pruned-semantic-fields
npm run build:redo-progress-checklists
node scripts/sync-search-catalog-to-supabase.mjs
```

The maintainer runs:
```bash
si-registry promote --library tabler --batch batch-2026-05-01-a
# → reads 50 changed NDJSON records
# → validates schema
# → upserts to Supabase
# → rebuilds affected library shard
# → updates checklist
```

---

### Q4: Is the current structure using a database structure?

**No, not as its primary structure.**

The current system uses **flat JSON files** as the canonical source of truth. It *projects* that data into:
- A Supabase table (`icon_search_public_registry_metadata`) for hosted search.
- An in-memory Map for MCP.

But the **database is a downstream consumer, not the source of truth.** This means:
- Every update requires a full rebuild + full sync.
- There is no row-level versioning, no `updated_at` per record, no soft-delete.
- The DB schema (tsvector, GIN indexes) is actually *more sophisticated* than the file structure — but it is underutilized because it is treated as a mirror, not a master.

**The DB schema is well-designed:** it has weighted tsvector columns (`search_document`, `avoid_document`), GIN indexes, and foreign-key relationships to `icon_catalog`. The team should **lean into this schema** rather than treat it as a sync target.

---

### Q5: Is storing the registry data in JSON format the best way?

**JSON is the best format for portability and Git diffing, but the worst format for partial updates and search at scale.**

Here is the decision matrix:

| Format | Partial Update | Human Readable | Git Diffable | Searchable | Scale >50K | Recommendation |
|--------|---------------|----------------|--------------|------------|------------|----------------|
| **Monolithic JSON** | ❌ | ✅ | ⚠️ (huge diffs) | ❌ | ❌ | **Current — replace** |
| **Per-record JSON** | ✅ | ✅ | ✅ | ❌ | ⚠️ | Good for Git editorial layer |
| **NDJSON (newline-delimited)** | ✅ | ✅ | ✅ (line-level) | ❌ | ✅ | **Best for append-only logs** |
| **SQLite** | ✅ | ❌ | ❌ | ✅ (FTS5) | ✅ | Good for MCP local cache |
| **Postgres (Supabase)** | ✅ | ❌ | ❌ | ✅ (tsvector) | ✅ | **Best for live search + API** |
| **Parquet / Arrow** | ✅ | ❌ | ❌ | ✅ (columnar) | ✅ | Overkill for now |

**Recommended Hybrid:**

```
Editorial Source Layer (Git)  →  Per-library NDJSON  →  Human review, batch approval
Production Query Layer (DB)   →  Postgres + tsvector →  Live search, MCP, browser API
Runtime Cache Layer (CDN)     →  Per-library JSON.gz →  Fast MCP cold-start
```

This is the pattern used by large open-data projects (e.g., Wikidata dumps, NPM registry metadata, Stripe’s public API specs).

---

## 3. Pain Points Deep-Dive

### 3.1 The "Full Rebuild" Tax

Current `build-si-registry-projections.mjs`:
- Reads **all** source record groups.
- Flattens them into one array.
- Sorts the entire array alphabetically (`O(n log n)` on 15K+ items).
- Writes the same data to **7 different files**.

At 15K records this takes seconds. At 50K+ records it will take 10–30 seconds and create multi-megabyte Git diffs on every commit.

### 3.2 The Sync Lag

`sync-search-catalog-to-supabase.mjs` does a **full upsert** of all registry rows every time it runs. It chunks by 500, but it does not track deltas. This means:
- Unnecessary DB write load.
- Risk of transient errors invalidating the entire sync.
- No easy rollback of a single bad batch.

### 3.3 The MCP Memory Footprint

`mcp/semantic-registry.js` loads the entire registry into a `Map`.  
Memory footprint ≈ 9.6 MB JSON → ~30–50 MB parsed JS objects.  
This is acceptable today. It will not be acceptable at 100K records.

### 3.4 The Script Proliferation

There are **~60 scripts** for building, verifying, and reviewing registry batches:
- `build-<library>-approved-records.mjs`
- `build-<library>-visual-review-batch.mjs`
- `build-<library>-editor-review-batch.mjs`
- `verify-<library>-approved-records.mjs`

This is a strong signal that the abstraction layer is wrong. If every library needs its own build/verify pair, the system is not generic enough.

---

## 4. Recommended Roadmap

### Phase 1: Shard Without Changing Source of Truth (1–2 weeks)

1. **Split `public/registry/records.json` into per-library files:**
   - `public/registry/tabler-records.json`
   - `public/registry/lucide-records.json`
   - ...etc.
2. **Update `build-si-registry-projections.mjs`** to write both monolith and shards.
3. **Update MCP** to lazy-load shards by library prefix.
4. **Keep everything else the same.**  
*Risk:* Near-zero. *Benefit:* Immediate MCP memory and rebuild wins.

### Phase 2: Incremental Sync (2–3 weeks)

1. Add `updated_at` and `checksum` fields to source records.
2. Build `scripts/sync-registry-deltas-to-supabase.mjs` that only upserts changed rows.
3. Add a `registry_manifest` table tracking last sync per library.
4. Update the redo workflow to trigger delta sync after promotion.

### Phase 3: DB-First Editorial Workflow (4–6 weeks)

1. Create `icon_registry_records` table as the **live** source of truth.
2. Build a simple admin API or CLI for promoting records directly to DB.
3. Retain Git NDJSON as the *backup / seed / audit* layer, not the primary sync driver.
4. Rebuild the 60+ ad-hoc scripts into a single `si-registry` CLI with subcommands:
   - `si-registry import --library <lib> --file <batch.ndjson>`
   - `si-registry review --batch <id>`
   - `si-registry promote --batch <id>`
   - `si-registry export --format json|ndjson|csv`

### Phase 4: Scale & Observability (Ongoing)

1. Add DB metrics: query latency, index hit rates, sync lag.
2. Compress static JSON caches with Brotli.
3. Evaluate columnar storage (e.g., DuckDB) if analytics/search ranking need offline heavy lifting.

---

## 5. Security, Cloning Risk, and IP Protection

> **Question:** If we make the registry a database and store it on Supabase, will it protect the registry from cloners or reverse engineers?

> **Short answer:** No — not without additional architectural changes. The database move alone does not create a security boundary.

### 5.1 The Honest Truth

Moving the registry from a monolithic JSON file to Supabase **does not, by itself, protect it from cloners.** In fact, if implemented poorly, it could make systematic extraction *easier* by providing a queryable API surface.

The semantic registry (the `depicts`, `use_when`, `avoid_when`, `semantic_tags`, and `synonyms` fields) is **Supericons' core intellectual property**. It is the moat. But right now, that moat is **already visible from the public road**.

### 5.2 Current Exposure Map

#### 5.2.1 The JSON File Is Already Public

```
https://supericons.dev/registry/records.json
```

This file is **9.6 MB of uncompressed, prettified JSON** containing all 15,103 public semantic records. Anyone can:
- `curl` it in ~2 seconds
- Parse it with one line of Python
- Have a complete clone of the semantic layer

**This is the single biggest exposure.** Until this file is removed or access-controlled, the registry is effectively open-source.

#### 5.2.2 The MCP Public Gateway Is Anonymous

The `mcp-search` edge function (`/functions/v1/mcp-search`) is designed to work **without any authentication**:

```js
// Anyone can call this — no API key required
fetch("https://kcjmkakdhsqplvasgkjv.supabase.co/functions/v1/mcp-search", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ query: "calendar", limit: 20, source: "mcp" }),
});
```

This is by design — it supports the free tier. But it means a determined actor can:
1. Query every term in a dictionary
2. Collect every result set
3. Reconstruct the full registry over time

#### 5.2.3 The Browser Search Path Is Also Public

The web app uses Supabase hosted search. The browser makes anonymous RPC calls to the search engine. These can be inspected, replayed, and scripted.

#### 5.2.4 The Raw Asset Catalog Is Already Open Source

`public/icon-index.json` (15.9 MB) and `public/icon-index-solid.json` (5.1 MB) contain the icon metadata (names, libraries, styles). These are third-party open-source libraries, so they are not your IP — but they complete the picture for a cloner.

### 5.3 What Moving to Supabase Actually Changes

| Threat Vector | Current (JSON) | After Moving to Supabase (No Other Changes) | After Moving to Supabase (With Proper Controls) |
|---------------|----------------|---------------------------------------------|------------------------------------------------|
| **Bulk download** | ✅ Trivial — one `curl` | ⚠️ Harder to find, but still possible via sync scripts | ❌ Blocked — no bulk export endpoint |
| **Systematic scraping** | ⚠️ Possible but inefficient (no search API) | ✅ **Easier** — queryable API with structured responses | ❌ Blocked or throttled — auth + rate limits |
| **Individual record lookup** | ❌ Not possible (no API) | ✅ Easy — search by `icon_id` | ⚠️ Controlled — auth tier determines field access |
| **Git history mining** | ✅ Full history in public repo | ✅ Full history in public repo | ⚠️ Reduced — source records in private repo or DB only |
| **MCP local file access** | ✅ File is in the npm package | ⚠️ File may not be in package, but API is | ⚠️ API requires key, local cache is encrypted or absent |

**Key insight:** Moving to Supabase *without* adding access controls actually **increases** cloning risk by replacing a static file (which requires one download) with a queryable API (which enables systematic, structured extraction).

### 5.4 What Actually Protects the Registry

#### Tier 1: Remove the Bulk Dump (Do This Immediately)

**Action:** Stop distributing `records.json` as a public static file.

- Remove `public/registry/records.json` from the deployed site.
- Remove `mcp/public/registry-records.json` from the npm package.
- If MCP needs offline access, ship an **encrypted cache** or require API key validation before download.

**Impact:** This single change eliminates the easiest cloning vector.

#### Tier 2: Implement Field-Level Authorization

**Action:** Return different data based on the caller's auth tier.

| Tier | Search Capability | Semantic Fields Returned |
|------|-------------------|--------------------------|
| Anonymous (browser) | ✅ Search by keyword | `label`, `depicts` only |
| Free registered user | ✅ Search by keyword | `label`, `depicts`, `semantic_tags` |
| Pro / API key holder | ✅ Full search + ranking | All fields including `use_when`, `avoid_when`, `synonyms` |
| Internal / service_role | ✅ Everything | Everything + audit logs |

**Implementation:**

```sql
-- Example: RPC that returns tiered fields
CREATE OR REPLACE FUNCTION public.search_icons_tiered(
  query text,
  library text DEFAULT NULL,
  limit_count int DEFAULT 20,
  api_key text DEFAULT NULL
)
RETURNS TABLE (
  icon_id text,
  label text,
  depicts text,
  semantic_tags text[],
  -- ... other fields conditionally
) AS $$
DECLARE
  user_tier text := 'anonymous';
BEGIN
  -- Validate API key if provided
  IF api_key IS NOT NULL THEN
    user_tier := resolve_api_key_tier(api_key);
  END IF;

  RETURN QUERY
  SELECT
    r.icon_id,
    r.label,
    CASE WHEN user_tier IN ('pro', 'internal') THEN r.depicts ELSE NULL END as depicts,
    CASE WHEN user_tier IN ('registered', 'pro', 'internal') THEN r.semantic_tags ELSE '{}' END as semantic_tags,
    -- ... etc
  FROM icon_search_public_registry_metadata r
  WHERE r.search_document @@ plainto_tsquery('simple', query)
  ORDER BY ts_rank(r.search_document, plainto_tsquery('simple', query)) DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Impact:** A scraper with anonymous access gets a degraded, incomplete copy that is not commercially useful.

#### Tier 3: Rate Limiting and Abuse Detection

**Action:** Implement tiered rate limits with anomaly detection.

| Tier | Requests / Minute | Requests / Hour | Notes |
|------|-------------------|-----------------|-------|
| Anonymous | 10 | 100 | IP-based + fingerprint |
| Free registered | 30 | 500 | User-ID based |
| Pro API key | 120 | 2,000 | Key-based, soft limit |
| Enterprise | 600 | 10,000 | Negotiated |

**Abuse signals:**
- Querying every letter of the alphabet systematically
- Requests with `limit=1000` repeatedly
- Geographic distribution anomalies (100 IPs from one data center)
- Empty query strings with high pagination

**Implementation:** The `search_request_audit` table already exists. Add a materialized view or edge function that flags suspicious patterns and temporarily blocks IPs or API keys.

#### Tier 4: Response Watermarking / Fingerprinting

**Action:** Invisibly fingerprint responses to trace leaks.

- Insert unique, imperceptible variations in `depicts` or `synonyms` per API key or per user.
- Example: For user A, `"a magnifying glass"`; for user B, `"a magnifying glass"` (with a zero-width space or synonym swap).
- If a competitor's product contains your exact fingerprints, you have evidence of theft.

This is a common technique in financial data (Bloomberg, Reuters) and mapping (Google Maps "trap streets").

#### Tier 5: Legal and Licensing

**Action:** Add explicit terms of service that prohibit scraping and bulk extraction.

- Terms should explicitly state that the semantic registry data is proprietary.
- Define permitted use (individual search queries for UI design) vs. prohibited use (building a competing index, training models on the data).
- Add a `robots.txt` and Terms of Service page.

**Note:** Legal protection is weak against overseas actors but strong against legitimate competitors.

#### Tier 6: Don't Store Source Records in a Public Repo

**Action:** If the registry is your moat, the source data should not be in a public GitHub repository.

- Move `data/si-registry/` to a **private repository** or **encrypted storage**.
- The public repo should only contain build artifacts (site code, docs) and maybe a sanitized sample.
- The sync script should run from the private repo or a CI environment with secrets access.

**Current state:** The entire `data/si-registry/` directory is in this repo. If the repo is public, the raw editorial data (including internal review states) is public too.

### 5.5 Recommended Security Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PRIVATE ZONE (Not Publicly Accessible)              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Private Git Repo / Encrypted Storage                               │   │
│  │  - data/si-registry/sources/ (editorial layer)                      │   │
│  │  - Internal review files, batch outputs, approval queues            │   │
│  │  - This is the TRUE source of truth                                 │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                           ┌────────▼────────┐                              │
│                           │  CI/CD Pipeline │                              │
│                           │  (GitHub Actions│                              │
│                           │   or similar)   │                              │
│                           └────────┬────────┘                              │
└────────────────────────────────────┼────────────────────────────────────────┘
                                     │
┌────────────────────────────────────▼────────────────────────────────────────┐
│                         PROTECTED ZONE (API-Gated)                          │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Supabase Database                                                  │   │
│  │  - icon_search_public_registry_metadata                             │   │
│  │  - icon_catalog                                                     │   │
│  │  - search_request_audit                                             │   │
│  │  - RLS: service_role for writes, RPC for reads                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                           ┌────────▼────────┐                              │
│                           │  Edge Functions   │                            │
│                           │  - mcp-search     │  (public, rate-limited,     │
│                           │  - search-icons   │   field-redacted)           │
│                           │  - validate-mcp-key│                             │
│                           └────────┬────────┘                              │
└────────────────────────────────────┼────────────────────────────────────────┘
                                     │
┌────────────────────────────────────▼────────────────────────────────────────┐
│                         PUBLIC ZONE (Browser, MCP, Competitors)             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐ │
│  │  Browser User   │  │  MCP User       │  │  Competitor / Scraper       │ │
│  │  (anonymous)    │  │  (api key)      │  │  (anonymous or stolen key)  │ │
│  │                 │  │                 │  │                             │ │
│  │  Gets:          │  │  Gets:          │  │  Gets:                      │ │
│  │  - label        │  │  - label        │  │  - label                    │ │
│  │  - depicts      │  │  - depicts      │  │  - depicts                  │ │
│  │  - icon preview │  │  - all fields   │  │  - rate limited             │ │
│  │                 │  │  - ranked       │  │  - fingerprinted            │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.6 Security Quick Wins (Do This Week)

1. **Audit public exposure**
   - Confirm whether `supericons.dev/registry/records.json` is currently live and accessible without auth.
   - Confirm whether the Git repository is public or private.
   - If public, the source data is already exposed.

2. **Remove or gate the public JSON file**
   - If the browser does not need it (it uses Supabase), remove it from `public/registry/`.
   - If MCP needs it, ship it **inside the npm package only**, not on the web server.
   - Add `public/registry/records.json` to `.gitignore` and stop building it.

3. **Add field-level redaction to the search RPC**
   - Modify the search edge function to return only `label` and `depicts` for anonymous queries.
   - Return full fields only when a valid `SUPERICONS_API_KEY` is present.

4. **Implement rate limiting per IP**
   - Even anonymous users should be capped at ~10 requests/minute.
   - Log to `search_request_audit` and flag patterns.

5. **Consider repository privacy**
   - If `data/si-registry/` contains your proprietary IP, the repository should not be public.
   - If you want the site code open-source, split the registry data into a private submodule or separate private repo.

### 5.7 Bottom Line on Security

> **A database does not protect data. Access controls protect data.**

Moving to Supabase is a good architectural move for **performance, maintainability, and scale**. But for **security against cloning**, you need:

1. **Stop shipping bulk dumps** (remove public JSON)
2. **Field-level authorization** (tiered API responses)
3. **Rate limiting and abuse detection**
4. **Fingerprinting** (to trace leaks)
5. **Private source storage** (don't keep the crown jewels in a public repo)
6. **Legal terms** (ToS prohibiting scraping)

Do these, and the registry becomes genuinely defensible. Skip them, and Supabase just becomes a more convenient API for cloners to use.

---

## 6. Quick Wins (Do This Week)

1. **Stop treating `records.json` as the browser delivery mechanism.** The browser already uses Supabase. Remove any future temptation to load 9.6 MB in the browser by documenting this boundary.
2. **Minify the public JSON.** The file is currently prettified (291K lines). A minified version would be ~3–4 MB, saving 50%+ on disk and parse time. Prettified JSON is for humans; machines should read compact JSON.
3. **Add a `size` and `lineCount` check to CI.** Alert if `records.json` grows by >5% in a single PR — this catches runaway batch imports.
4. **Document the `icon_id` → `source_name` resolution rules** in one place. `hosted-search-core.js` and `semantic-registry.js` each have slightly different normalization logic. Unify them.

---

## 7. Conclusion

The Supericons semantic registry is a **strategic moat**. The quality of the `depicts`, `use_when`, and `semantic_tags` fields directly determines whether users and AI agents find the right icon fast. The current JSON-heavy, batch-oriented pipeline protected quality early on, but it is now a **velocity bottleneck**.

The correct next evolution is **not** to abandon JSON or Git — it is to **promote the database to first-class citizen** and relegate the monolithic JSON to a cache/backup role. Keep the human review gates, but replace the "rebuild the world" step with "promote the row."

**Bottom line:** If you continue with the monolithic JSON as the source of truth, you will spend progressively more time waiting for builds and less time improving semantics. Fix the architecture now, while 15K records is still manageable.

---

*End of Audit*
