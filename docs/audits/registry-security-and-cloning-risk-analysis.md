# Registry Security & Cloning Risk Analysis
> **Date:** 2026-05-01  
> **Scope:** Whether moving the semantic registry to Supabase protects it from cloning/reverse engineering.  
> **Short Answer:** No — not without additional architectural changes. The database move alone does not create a security boundary.

---

## The Honest Truth

Moving the registry from a monolithic JSON file to Supabase **does not, by itself, protect it from cloners.** In fact, if implemented poorly, it could make systematic extraction *easier* by providing a queryable API surface.

The semantic registry (the `depicts`, `use_when`, `avoid_when`, `semantic_tags`, and `synonyms` fields) is **Supericons' core intellectual property**. It is the moat. But right now, that moat is **already visible from the public road**.

---

## Current Exposure Map

### 1. The JSON File Is Already Public

```
https://supericons.dev/registry/records.json
```

This file is **9.6 MB of uncompressed, prettified JSON** containing all 15,103 public semantic records. Anyone can:
- `curl` it in ~2 seconds
- Parse it with one line of Python
- Have a complete clone of the semantic layer

**This is the single biggest exposure.** Until this file is removed or access-controlled, the registry is effectively open-source.

### 2. The MCP Public Gateway Is Anonymous

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

### 3. The Browser Search Path Is Also Public

The web app uses Supabase hosted search. The browser makes anonymous RPC calls to the search engine. These can be inspected, replayed, and scripted.

### 4. The Raw Asset Catalog Is Already Open Source

`public/icon-index.json` (15.9 MB) and `public/icon-index-solid.json` (5.1 MB) contain the icon metadata (names, libraries, styles). These are third-party open-source libraries, so they are not your IP — but they complete the picture for a cloner.

---

## What Moving to Supabase Actually Changes

| Threat Vector | Current (JSON) | After Moving to Supabase (No Other Changes) | After Moving to Supabase (With Proper Controls) |
|---------------|----------------|---------------------------------------------|------------------------------------------------|
| **Bulk download** | ✅ Trivial — one `curl` | ⚠️ Harder to find, but still possible via sync scripts | ❌ Blocked — no bulk export endpoint |
| **Systematic scraping** | ⚠️ Possible but inefficient (no search API) | ✅ **Easier** — queryable API with structured responses | ❌ Blocked or throttled — auth + rate limits |
| **Individual record lookup** | ❌ Not possible (no API) | ✅ Easy — search by `icon_id` | ⚠️ Controlled — auth tier determines field access |
| **Git history mining** | ✅ Full history in public repo | ✅ Full history in public repo | ⚠️ Reduced — source records in private repo or DB only |
| **MCP local file access** | ✅ File is in the npm package | ⚠️ File may not be in package, but API is | ⚠️ API requires key, local cache is encrypted or absent |

**Key insight:** Moving to Supabase *without* adding access controls actually **increases** cloning risk by replacing a static file (which requires one download) with a queryable API (which enables systematic, structured extraction).

---

## What Actually Protects the Registry

### Tier 1: Remove the Bulk Dump (Do This Immediately)

**Action:** Stop distributing `records.json` as a public static file.

- Remove `public/registry/records.json` from the deployed site.
- Remove `mcp/public/registry-records.json` from the npm package.
- If MCP needs offline access, ship an **encrypted cache** or require API key validation before download.

**Impact:** This single change eliminates the easiest cloning vector.

### Tier 2: Implement Field-Level Authorization

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

### Tier 3: Rate Limiting and Abuse Detection

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

### Tier 4: Response Watermarking / Fingerprinting

**Action:** Invisibly fingerprint responses to trace leaks.

- Insert unique, imperceptible variations in `depicts` or `synonyms` per API key or per user.
- Example: For user A, `"a magnifying glass"`; for user B, `"a magnifying glass"` (with a zero-width space or synonym swap).
- If a competitor's product contains your exact fingerprints, you have evidence of theft.

This is a common technique in financial data (Bloomberg, Reuters) and mapping (Google Maps "trap streets").

### Tier 5: Legal and Licensing

**Action:** Add explicit terms of service that prohibit scraping and bulk extraction.

- Terms should explicitly state that the semantic registry data is proprietary.
- Define permitted use (individual search queries for UI design) vs. prohibited use (building a competing index, training models on the data).
- Add a `robots.txt` and Terms of Service page.

**Note:** Legal protection is weak against overseas actors but strong against legitimate competitors.

### Tier 6: Don't Store Source Records in a Public Repo

**Action:** If the registry is your moat, the source data should not be in a public GitHub repository.

- Move `data/si-registry/` to a **private repository** or **encrypted storage**.
- The public repo should only contain build artifacts (site code, docs) and maybe a sanitized sample.
- The sync script should run from the private repo or a CI environment with secrets access.

**Current state:** The entire `data/si-registry/` directory is in this repo. If the repo is public, the raw editorial data (including internal review states) is public too.

---

## Recommended Security Architecture

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

---

## What You Should Do This Week

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

---

## Bottom Line

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

*End of Analysis*
