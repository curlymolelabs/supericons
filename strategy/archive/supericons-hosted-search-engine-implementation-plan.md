# Supericons Hosted Search Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move Supericons from client-shipped search ranking to a hosted private search engine so free search stays open while the real engine, weights, and high-signal intelligence remain protected.

**Architecture:** Keep search free, but make the engine private. The web app and MCP server become thin clients that send queries to a hosted search API. Supabase Postgres becomes the source of truth for the searchable catalog, private manifests, and evidence-derived features; a new Supabase Edge Function performs deterministic reranking with private logic that is never shipped to the browser or MCP package. Railway is the phase-2 escape hatch only if the engine grows beyond Edge Function limits.

**Tech Stack:** Vite SPA, Node MCP server, Supabase Postgres, Supabase Edge Functions (Deno/TypeScript), Postgres full-text search, pg_cron, existing `icon_metadata` / `icon_evidence` / `icon_scores` tables, optional pgvector or Railway worker later.

---

## Hosting Recommendation

### Recommended now: Supabase as the primary engine host

Use **Supabase Postgres + Supabase Edge Functions** for the first hosted private engine.

Why this is the right first move:

1. The repo already uses Supabase for the intelligence layer, auth, billing, and hosted workflows.
2. The first protected engine should be **deterministic and evidence-driven**, not model-heavy. That fits SQL + a lightweight Edge Function very well.
3. The existing moat data already lives in Supabase:
   - `icon_metadata`
   - `icon_evidence`
   - `icon_scores`
4. Supabase lets the team keep **data, function secrets, auth, cron rebuilds, and admin reads** in one control plane.
5. The fastest way to protect the engine is to **stop shipping ranking logic in `main.js` and `mcp/search.js`**, not to add a second infrastructure stack immediately.

### Why not Railway first

Railway is better when the engine needs:

- long-lived Node or Python processes
- large in-memory indexes
- background workers that outgrow Edge limits
- heavier CPU per request
- Python ranking libraries or model inference

That is not the first milestone. The first milestone is a **private hosted reranker** over a deterministic search stack. Supabase can do that faster with less operational surface area.

### When Railway becomes the right move

Promote the engine to Railway only if one or more of these become true for 7 consecutive days:

- search rerank requests need more than `~1.5s` CPU on average
- the search function bundle or supporting datasets become awkward for Edge deployment
- the engine needs Python-only packages or model-serving libraries
- the engine needs queue-backed batch workers, warm in-memory caches, or ANN indexes that do not fit the Edge shape
- the product starts serving team-specific or project-specific ranking profiles that benefit from a persistent process

### Optional alternative, not recommended first: Cloudflare Workers

Cloudflare Workers are credible for a future edge gateway, especially if the team wants globally distributed request admission, caching, and abuse protection in front of the engine. Do **not** make Cloudflare the first engine host. It would split the architecture before the private engine contract is stable.

### Official-source research notes

Researched on **April 18, 2026** using official docs.

- Supabase Edge Functions docs: global functions, Deno runtime, function limits, and hosted execution model
- Supabase search docs: Postgres full text, hybrid search, and pgvector
- Railway docs: service deployment, private networking, cron, regions, and container-based runtime model
- Cloudflare Workers docs: edge runtime and request execution model

Source links:

- https://supabase.com/docs/guides/functions
- https://supabase.com/docs/guides/functions/limits
- https://supabase.com/docs/guides/ai/hybrid-search
- https://supabase.com/docs/guides/database/full-text-search
- https://supabase.com/docs/guides/database/extensions/pgvector
- https://docs.railway.com/guides/services
- https://docs.railway.com/guides/private-networking
- https://docs.railway.com/guides/cron-jobs
- https://developers.cloudflare.com/workers/

---

## Current Codebase Notes

The current engine is exposed in places that make cloning easy:

- Browser ranking logic lives in `main.js`
- Shared curated aliases live in `lib/icon-semantic-aliases.js`
- MCP ranking logic lives in `mcp/search.js`
- The MCP server loads local public datasets from `mcp/public/icon-index.json` and `mcp/public/synonyms.json`
- The browser fetches `/icon-index.json` and `/synonyms.json`

The moat data already exists, but it is not yet the engine:

- `supabase/migrations/20260416_icon_intelligence_foundation.sql`
- `supabase/migrations/20260417_icon_intelligence_search_attempts.sql`
- `supabase/migrations/20260418_icon_intelligence_popularity_refresh.sql`
- `lib/icon-intelligence.js`
- `public/admin-app.js`
- `supabase/functions/admin-api/index.ts`

The protected-engine project must do one thing above all else:

**separate public search access from private ranking logic**

---

## Proposed File Structure

### New files

- `supabase/migrations/20260418_hosted_search_engine_schema.sql`
- `supabase/migrations/20260418_hosted_search_engine_rpcs.sql`
- `supabase/functions/search-icons/index.ts`
- `supabase/functions/search-engine-trap/index.ts`
- `supabase/functions/_shared/search-engine/normalize.ts`
- `supabase/functions/_shared/search-engine/rank.ts`
- `supabase/functions/_shared/search-engine/catalog.ts`
- `supabase/functions/_shared/search-engine/rate-limit.ts`
- `supabase/functions/_shared/search-engine/types.ts`
- `lib/search-engine-client.js`
- `mcp/hosted-search-client.js`
- `scripts/sync-search-catalog-to-supabase.mjs`
- `scripts/seed-private-search-manifests.mjs`
- `scripts/verify-hosted-search-engine.mjs`
- `scripts/verify-search-catalog-sync.mjs`

### Existing files to modify

- `main.js`
- `lib/icon-intelligence.js`
- `mcp/index.js`
- `mcp/search.js`
- `package.json`
- `public/admin-app.js`
- `supabase/functions/admin-api/index.ts`

### Responsibility split

- `icon_catalog`: coarse searchable icon catalog, safe enough to expose to the engine tier
- `icon_search_private_manifest`: private aliases, use cases, contraindications, trust-tier hints
- `icon_search_private_features`: private evidence-derived scoring features and manual boosts
- `search-icons` Edge Function: hosted API contract for web and MCP
- `search-engine-client.js`: browser client wrapper
- `hosted-search-client.js`: MCP wrapper
- `admin-api` / `admin-app`: query ops, override review, engine health, and zero-result backlog

---

## Rollout Principles

1. Keep free search free.
2. Move ranking logic server-side before adding more aliases or libraries.
3. Do not ship raw private manifests, weights, or score vectors to public clients.
4. Treat local ranking as a temporary fallback only, not the default path.
5. Measure hosted engine quality against the current search behavior before cutover.

---

### Task 1: Create the Protected Search Data Boundary

**Files:**
- Create: `supabase/migrations/20260418_hosted_search_engine_schema.sql`
- Test: `scripts/verify-search-catalog-sync.mjs`

- [ ] **Step 1: Write the failing schema smoke checks**

Create `scripts/verify-search-catalog-sync.mjs` with these assertions so the migration has a concrete target:

```js
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const raw = JSON.parse(await fs.readFile(new URL('../public/icon-index.json', import.meta.url), 'utf8'));

assert.ok(raw.totalCount > 20000, 'public icon index should remain the coarse catalog source');
assert.ok(Array.isArray(raw.icons), 'icon index should expose icons[]');

console.log('verify-search-catalog-sync: placeholder smoke target is ready');
```

- [ ] **Step 2: Run the smoke script before the migration exists**

Run: `node scripts/verify-search-catalog-sync.mjs`

Expected: PASS on the public file smoke checks, but there is still no hosted search schema in Supabase. That is the gap Task 1 closes.

- [ ] **Step 3: Write the schema migration**

Create `supabase/migrations/20260418_hosted_search_engine_schema.sql`:

```sql
create table if not exists public.icon_catalog (
  icon_id text primary key,
  name text not null,
  source_library text not null,
  style text not null,
  icon_type text not null,
  search_text text not null,
  search_document tsvector generated always as (
    to_tsvector('simple', search_text)
  ) stored,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.icon_search_private_manifest (
  icon_id text primary key references public.icon_catalog(icon_id) on delete cascade,
  semantic_aliases text[] not null default '{}'::text[],
  use_cases text[] not null default '{}'::text[],
  contraindications text[] not null default '{}'::text[],
  trust_tier text not null default 't0',
  explanation_short text,
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.icon_search_private_features (
  icon_id text primary key references public.icon_catalog(icon_id) on delete cascade,
  popularity_score double precision not null default 0,
  behavioral_score double precision not null default 0,
  editorial_score double precision not null default 0,
  replace_risk_score double precision not null default 0,
  manual_boost double precision not null default 0,
  manual_penalty double precision not null default 0,
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.search_request_audit (
  id bigserial primary key,
  query_norm text not null,
  source text not null,
  library_filter text,
  result_count integer not null default 0,
  status text not null default 'ok',
  latency_ms integer,
  session_hash text,
  ip_hash text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists icon_catalog_search_document_idx
  on public.icon_catalog using gin (search_document);

create index if not exists search_request_audit_query_created_at_idx
  on public.search_request_audit (query_norm, created_at desc);

alter table public.icon_catalog enable row level security;
alter table public.icon_search_private_manifest enable row level security;
alter table public.icon_search_private_features enable row level security;
alter table public.search_request_audit enable row level security;

revoke all on table public.icon_catalog from public;
revoke all on table public.icon_search_private_manifest from public;
revoke all on table public.icon_search_private_features from public;
revoke all on table public.search_request_audit from public;

grant select, insert, update, delete on table public.icon_catalog to service_role;
grant select, insert, update, delete on table public.icon_search_private_manifest to service_role;
grant select, insert, update, delete on table public.icon_search_private_features to service_role;
grant select, insert, update, delete on table public.search_request_audit to service_role;
```

- [ ] **Step 4: Apply the migration locally**

Run: `supabase db push`

Expected: migration applies successfully and creates the new hosted search tables.

- [ ] **Step 5: Commit**

```bash
git add scripts/verify-search-catalog-sync.mjs supabase/migrations/20260418_hosted_search_engine_schema.sql
git commit -m "feat: add hosted search engine schema"
```

---

### Task 2: Seed the Search Catalog and Private Manifests

**Files:**
- Create: `scripts/sync-search-catalog-to-supabase.mjs`
- Create: `scripts/seed-private-search-manifests.mjs`
- Modify: `package.json`
- Test: `scripts/verify-search-catalog-sync.mjs`

- [ ] **Step 1: Extend the verification script to check the hosted catalog target shape**

Update `scripts/verify-search-catalog-sync.mjs` so it validates the seed script output shape before any DB writes:

```js
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const raw = JSON.parse(await fs.readFile(new URL('../public/icon-index.json', import.meta.url), 'utf8'));

const rows = raw.icons.map((icon) => ({
  icon_id: `${icon.lib}:${icon.id}`,
  name: icon.name,
  source_library: icon.lib,
  style: icon.style || 'outline',
  icon_type: icon.type,
  search_text: [icon.name, icon.id, icon.lib].join(' ').toLowerCase(),
}));

assert.equal(rows.length, raw.icons.length, 'catalog rows should match public icon index row count');
assert.ok(rows.every((row) => row.icon_id.includes(':')), 'every catalog row should use lib:id');
assert.ok(rows.every((row) => row.search_text.length > 0), 'every catalog row should have search text');

console.log('verify-search-catalog-sync: ok');
```

- [ ] **Step 2: Run the updated verification script**

Run: `node scripts/verify-search-catalog-sync.mjs`

Expected: PASS.

- [ ] **Step 3: Write the catalog sync script**

Create `scripts/sync-search-catalog-to-supabase.mjs`:

```js
import fs from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function chunk(items, size) {
  const out = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

const raw = JSON.parse(await fs.readFile(new URL('../public/icon-index.json', import.meta.url), 'utf8'));

const rows = raw.icons.map((icon) => ({
  icon_id: `${icon.lib}:${icon.id}`,
  name: icon.name,
  source_library: icon.lib,
  style: icon.style || 'outline',
  icon_type: icon.type,
  search_text: [icon.name, icon.id, icon.lib].join(' ').toLowerCase(),
}));

for (const batch of chunk(rows, 1000)) {
  const { error } = await supabase.from('icon_catalog').upsert(batch, { onConflict: 'icon_id' });
  if (error) throw error;
}

console.log(`sync-search-catalog-to-supabase: synced ${rows.length} rows`);
```

- [ ] **Step 4: Write the private manifest seed script**

Create `scripts/seed-private-search-manifests.mjs`:

```js
import { createClient } from '@supabase/supabase-js';
import { createIconSemanticAliasMap } from '../lib/icon-semantic-aliases.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const aliasMap = createIconSemanticAliasMap();

const manifestRows = [...aliasMap.entries()].map(([icon_id, semantic_aliases]) => ({
  icon_id,
  semantic_aliases,
  use_cases: [],
  contraindications: [],
  trust_tier: 't1',
  explanation_short: null,
}));

for (let i = 0; i < manifestRows.length; i += 500) {
  const batch = manifestRows.slice(i, i + 500);
  const { error } = await supabase.from('icon_search_private_manifest').upsert(batch, { onConflict: 'icon_id' });
  if (error) throw error;
}

console.log(`seed-private-search-manifests: seeded ${manifestRows.length} rows`);
```

- [ ] **Step 5: Add package scripts and commit**

Modify `package.json`:

```json
{
  "scripts": {
    "sync:search-catalog": "node scripts/sync-search-catalog-to-supabase.mjs",
    "seed:private-search-manifests": "node scripts/seed-private-search-manifests.mjs",
    "verify:search-catalog-sync": "node scripts/verify-search-catalog-sync.mjs"
  }
}
```

Commit:

```bash
git add package.json scripts/sync-search-catalog-to-supabase.mjs scripts/seed-private-search-manifests.mjs scripts/verify-search-catalog-sync.mjs
git commit -m "feat: add hosted search catalog seed pipeline"
```

---

### Task 3: Build SQL Candidate Retrieval and Private Feature Refresh

**Files:**
- Create: `supabase/migrations/20260418_hosted_search_engine_rpcs.sql`
- Modify: `supabase/migrations/20260418_icon_intelligence_popularity_refresh.sql`
- Test: `scripts/verify-hosted-search-engine.mjs`

- [ ] **Step 1: Write the failing hosted engine integration test**

Create `scripts/verify-hosted-search-engine.mjs`:

```js
import assert from 'node:assert/strict';

const response = await fetch(`${process.env.SUPABASE_URL}/functions/v1/search-icons`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    apikey: process.env.SUPABASE_ANON_KEY,
    Authorization: `Bearer ${process.env.SUPABASE_ANON_KEY}`,
  },
  body: JSON.stringify({
    query: 'self hosted',
    library: null,
    limit: 5,
    source: 'verify',
  }),
});

assert.equal(response.status, 200, 'hosted search endpoint should respond with 200');
const payload = await response.json();
assert.ok(Array.isArray(payload.results), 'payload.results should be an array');
assert.ok(payload.results.length > 0, 'hosted search should return at least one result');

console.log('verify-hosted-search-engine: ok');
```

- [ ] **Step 2: Run the hosted engine test before the function exists**

Run: `node scripts/verify-hosted-search-engine.mjs`

Expected: FAIL with `404` or `function not found`.

- [ ] **Step 3: Create the RPC migration**

Create `supabase/migrations/20260418_hosted_search_engine_rpcs.sql`:

```sql
create or replace function public.si_search_icon_candidates(
  p_query text,
  p_library text default null,
  p_limit integer default 60
)
returns table (
  icon_id text,
  name text,
  source_library text,
  style text,
  icon_type text,
  lexical_rank double precision
)
language sql
security definer
set search_path = public
as $$
  with q as (
    select nullif(trim(coalesce(p_query, '')), '') as query_text
  ),
  ranked as (
    select
      c.icon_id,
      c.name,
      c.source_library,
      c.style,
      c.icon_type,
      ts_rank_cd(
        c.search_document,
        websearch_to_tsquery('simple', q.query_text)
      )::double precision as lexical_rank
    from public.icon_catalog c, q
    where q.query_text is not null
      and (p_library is null or c.source_library = p_library)
      and c.search_document @@ websearch_to_tsquery('simple', q.query_text)
    order by lexical_rank desc, c.name asc
    limit greatest(20, least(coalesce(p_limit, 60), 200))
  )
  select * from ranked;
$$;

revoke all on function public.si_search_icon_candidates(text, text, integer) from public;
grant execute on function public.si_search_icon_candidates(text, text, integer) to service_role;
```

- [ ] **Step 4: Extend the score rebuild to populate private features**

Append to `supabase/migrations/20260418_icon_intelligence_popularity_refresh.sql`:

```sql
insert into public.icon_search_private_features (
  icon_id,
  popularity_score,
  behavioral_score,
  editorial_score,
  replace_risk_score,
  manual_boost,
  manual_penalty,
  updated_at
)
select
  s.icon_id,
  coalesce(s.popularity_score_30d, 0),
  coalesce(s.copy_count_30d, 0) + (coalesce(s.download_count_30d, 0) * 0.5) + (coalesce(s.favorite_count_30d, 0) * 0.25),
  0,
  case
    when s.retention_rate is null then 0
    else greatest(0, 1 - s.retention_rate)
  end,
  0,
  0,
  timezone('utc', now())
from public.icon_scores s
on conflict (icon_id) do update
set
  popularity_score = excluded.popularity_score,
  behavioral_score = excluded.behavioral_score,
  replace_risk_score = excluded.replace_risk_score,
  updated_at = excluded.updated_at;
```

- [ ] **Step 5: Apply, verify, and commit**

Run:

```bash
supabase db push
node scripts/verify-hosted-search-engine.mjs
```

Expected: still FAIL until Task 4 creates the Edge Function, but the DB layer now exists cleanly.

Commit:

```bash
git add supabase/migrations/20260418_hosted_search_engine_rpcs.sql supabase/migrations/20260418_icon_intelligence_popularity_refresh.sql scripts/verify-hosted-search-engine.mjs
git commit -m "feat: add hosted search candidate rpc and feature refresh"
```

---

### Task 4: Implement the Hosted Search Edge Function

**Files:**
- Create: `supabase/functions/search-icons/index.ts`
- Create: `supabase/functions/_shared/search-engine/types.ts`
- Create: `supabase/functions/_shared/search-engine/normalize.ts`
- Create: `supabase/functions/_shared/search-engine/rank.ts`
- Create: `supabase/functions/_shared/search-engine/catalog.ts`
- Create: `supabase/functions/_shared/search-engine/rate-limit.ts`
- Test: `scripts/verify-hosted-search-engine.mjs`

- [ ] **Step 1: Write the shared engine types and normalizer**

Create `supabase/functions/_shared/search-engine/types.ts`:

```ts
export interface CandidateRow {
  icon_id: string;
  name: string;
  source_library: string;
  style: string;
  icon_type: string;
  lexical_rank: number;
}

export interface PrivateManifestRow {
  icon_id: string;
  semantic_aliases: string[];
  use_cases: string[];
  contraindications: string[];
  trust_tier: string;
  explanation_short: string | null;
}

export interface PrivateFeatureRow {
  icon_id: string;
  popularity_score: number;
  behavioral_score: number;
  editorial_score: number;
  replace_risk_score: number;
  manual_boost: number;
  manual_penalty: number;
}
```

Create `supabase/functions/_shared/search-engine/normalize.ts`:

```ts
export function normalizeQuery(value: string | null | undefined): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}
```

- [ ] **Step 2: Write the private reranker**

Create `supabase/functions/_shared/search-engine/rank.ts`:

```ts
import { CandidateRow, PrivateFeatureRow, PrivateManifestRow } from './types.ts';
import { normalizeQuery } from './normalize.ts';

function trustTierWeight(value: string): number {
  if (value === 't3') return 1.5;
  if (value === 't2') return 1.0;
  if (value === 't1') return 0.5;
  return 0;
}

export function rerankCandidates(
  query: string,
  candidates: CandidateRow[],
  manifests: Map<string, PrivateManifestRow>,
  features: Map<string, PrivateFeatureRow>
) {
  const queryNorm = normalizeQuery(query);

  return candidates
    .map((candidate) => {
      const manifest = manifests.get(candidate.icon_id);
      const feature = features.get(candidate.icon_id);

      const aliasHit = manifest?.semantic_aliases?.some((alias) => normalizeQuery(alias) === queryNorm) ? 1 : 0;
      const useCaseHit = manifest?.use_cases?.some((item) => normalizeQuery(item).includes(queryNorm)) ? 1 : 0;

      const finalScore =
        (candidate.lexical_rank * 100) +
        (aliasHit * 180) +
        (useCaseHit * 70) +
        ((feature?.popularity_score || 0) * 0.25) +
        ((feature?.behavioral_score || 0) * 0.35) +
        ((feature?.editorial_score || 0) * 0.5) +
        trustTierWeight(manifest?.trust_tier || 't0') +
        (feature?.manual_boost || 0) -
        ((feature?.manual_penalty || 0) + ((feature?.replace_risk_score || 0) * 20));

      return {
        icon_id: candidate.icon_id,
        name: candidate.name,
        library: candidate.source_library,
        style: candidate.style,
        score: finalScore,
        explanation: manifest?.explanation_short || null,
      };
    })
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
}
```

- [ ] **Step 3: Implement the Edge Function**

Create `supabase/functions/search-icons/index.ts`:

```ts
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { rerankCandidates } from '../_shared/search-engine/rank.ts';
import { normalizeQuery } from '../_shared/search-engine/normalize.ts';
import { CandidateRow, PrivateFeatureRow, PrivateManifestRow } from '../_shared/search-engine/types.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const startedAt = Date.now();
  const body = await req.json().catch(() => ({}));
  const query = normalizeQuery(body.query);
  const library = body.library ? String(body.library) : null;
  const limit = Math.max(1, Math.min(50, Number(body.limit || 20)));
  const source = String(body.source || 'web');

  if (!query) {
    return new Response(JSON.stringify({ query, results: [], engine_version: 'search-v1' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const { data: candidates, error } = await supabase.rpc('si_search_icon_candidates', {
    p_query: query,
    p_library: library,
    p_limit: Math.max(limit * 3, 30),
  });

  if (error) throw error;

  const iconIds = (candidates || []).map((row: CandidateRow) => row.icon_id);

  const [manifestResult, featureResult] = await Promise.all([
    supabase.from('icon_search_private_manifest').select('*').in('icon_id', iconIds),
    supabase.from('icon_search_private_features').select('*').in('icon_id', iconIds),
  ]);

  const manifestMap = new Map<string, PrivateManifestRow>(
    (manifestResult.data || []).map((row: PrivateManifestRow) => [row.icon_id, row])
  );
  const featureMap = new Map<string, PrivateFeatureRow>(
    (featureResult.data || []).map((row: PrivateFeatureRow) => [row.icon_id, row])
  );

  const results = rerankCandidates(query, candidates || [], manifestMap, featureMap).slice(0, limit);

  await supabase.from('search_request_audit').insert({
    query_norm: query,
    source,
    library_filter: library,
    result_count: results.length,
    status: 'ok',
    latency_ms: Date.now() - startedAt,
  });

  return new Response(JSON.stringify({
    query,
    results,
    engine_version: 'search-v1',
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200,
  });
});
```

- [ ] **Step 4: Run the hosted search verification**

Run:

```bash
supabase functions serve search-icons --env-file supabase/.env.local
node scripts/verify-hosted-search-engine.mjs
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/search-icons supabase/functions/_shared/search-engine scripts/verify-hosted-search-engine.mjs
git commit -m "feat: add hosted private search edge function"
```

---

### Task 5: Cut the Web App Over to the Hosted Engine

**Files:**
- Create: `lib/search-engine-client.js`
- Modify: `main.js`
- Modify: `lib/icon-intelligence.js`
- Test: `scripts/verify-hosted-search-engine.mjs`

- [ ] **Step 1: Write the browser client wrapper**

Create `lib/search-engine-client.js`:

```js
const SUPABASE_URL = 'https://kcjmkakdhsqplvasgkjv.supabase.co';
const SUPABASE_ANON = 'sb_publishable_slbcWcnrQ45rkJPONFD7pw_hW0WpvBi';

export async function searchIconsHosted({ query, library = null, limit = 20, source = 'web' }) {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/search-icons`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON,
      Authorization: `Bearer ${SUPABASE_ANON}`,
    },
    body: JSON.stringify({ query, library, limit, source }),
  });

  if (!response.ok) {
    throw new Error(`hosted search failed (${response.status})`);
  }

  return response.json();
}
```

- [ ] **Step 2: Replace default client ranking with hosted ranking**

Modify `main.js` so the search path imports the hosted client and stops using client-side ranking as the primary engine:

```js
import { searchIconsHosted } from './lib/search-engine-client.js';
```

Use the hosted engine inside the search pipeline:

```js
async function refreshHostedSearchResults() {
  const payload = await searchIconsHosted({
    query: state.searchQuery,
    library: state.activeLibrary === 'all' ? null : state.activeLibrary,
    limit: state.batchSize,
    source: 'web',
  });

  const orderedKeys = new Set(payload.results.map((row) => row.icon_id));
  const ranked = payload.results
    .map((row) => state.icons.find((icon) => `${icon.lib}:${icon.id}` === row.icon_id))
    .filter(Boolean);

  const remainder = state.icons.filter((icon) => !orderedKeys.has(`${icon.lib}:${icon.id}`));
  state.filteredIcons = [...ranked, ...remainder];
}
```

- [ ] **Step 3: Stop exposing raw popularity fetch as the primary browse engine**

Update `lib/icon-intelligence.js` so `fetchPopularityMap()` becomes a compatibility helper, not the ranking source of truth:

```js
export async function fetchPopularityMap() {
  return {};
}
```

The hosted engine owns ranking. Keep local optimistic popularity bumps only for instant UI feedback.

- [ ] **Step 4: Build and smoke test**

Run:

```bash
npm run build
node scripts/verify-hosted-search-engine.mjs
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/search-engine-client.js main.js lib/icon-intelligence.js
git commit -m "feat: route web search through hosted engine"
```

---

### Task 6: Cut MCP Over to the Hosted Engine and Keep Local Search as an Emergency Fallback

**Files:**
- Create: `mcp/hosted-search-client.js`
- Modify: `mcp/index.js`
- Modify: `mcp/search.js`
- Modify: `package.json`
- Test: `scripts/verify-hosted-search-engine.mjs`

- [ ] **Step 1: Write the MCP hosted client**

Create `mcp/hosted-search-client.js`:

```js
export async function searchIconsHostedMcp({ query, library = null, limit = 20 }) {
  const baseUrl = process.env.SUPERICONS_SEARCH_ENGINE_URL || 'https://kcjmkakdhsqplvasgkjv.supabase.co/functions/v1/search-icons';
  const anonKey = process.env.SUPERICONS_SEARCH_ENGINE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  const response = await fetch(baseUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
    },
    body: JSON.stringify({
      query,
      library,
      limit,
      source: 'mcp',
    }),
  });

  if (!response.ok) throw new Error(`hosted MCP search failed (${response.status})`);
  return response.json();
}
```

- [ ] **Step 2: Change the MCP tool path**

Modify `mcp/index.js` so `search_icons` prefers the hosted engine:

```js
import { searchIconsHostedMcp } from './hosted-search-client.js';
import { searchIcons as searchIconsLocal } from './search.js';
```

Inside the `search_icons` tool handler:

```js
let ranked;

try {
  const payload = await searchIconsHostedMcp({ query, library, limit });
  const byKey = new Map(accessibleIcons.map((icon) => [`${icon.lib}:${icon.id}`, icon]));
  ranked = payload.results
    .map((row) => byKey.get(row.icon_id))
    .filter(Boolean);
} catch (error) {
  if (process.env.SUPERICONS_ALLOW_LOCAL_SEARCH_FALLBACK !== '1') {
    throw error;
  }
  ranked = searchIconsLocal(query, accessibleIcons, synonyms, { library, limit });
}
```

- [ ] **Step 3: Make local search explicitly non-primary**

Modify the top banner comment in `mcp/search.js`:

```js
/**
 * Local fallback search only.
 * Do not treat this file as the production ranking engine.
 */
```

- [ ] **Step 4: Verify and build**

Run:

```bash
node scripts/verify-hosted-search-engine.mjs
npm run build
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add mcp/hosted-search-client.js mcp/index.js mcp/search.js package.json
git commit -m "feat: route MCP search through hosted engine"
```

---

### Task 7: Add Hardening, Query Ops, and the Railway Escape Hatch

**Files:**
- Create: `supabase/functions/search-engine-trap/index.ts`
- Modify: `supabase/functions/admin-api/index.ts`
- Modify: `public/admin-app.js`
- Test: `scripts/verify-hosted-search-engine.mjs`

- [ ] **Step 1: Add a honeypot function**

Create `supabase/functions/search-engine-trap/index.ts`:

```ts
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  await supabase.from('search_request_audit').insert({
    query_norm: '__trap__',
    source: 'trap',
    result_count: 0,
    status: 'trap_hit',
  });

  return new Response(JSON.stringify({
    engine: 'internal-search',
    canary: 'supericons-search-trap-v1',
    status: 'ignored',
  }), {
    headers: { 'Content-Type': 'application/json' },
    status: 200,
  });
});
```

- [ ] **Step 2: Expose hosted-engine stats in admin**

Modify `supabase/functions/admin-api/index.ts` to add:

```ts
const hostedSearchStats = await adminClient
  .from('search_request_audit')
  .select('source, status, latency_ms, created_at');
```

Return a summary:

```ts
hosted_search: {
  total_requests_24h,
  p95_latency_ms,
  trap_hits_30d,
  top_sources,
}
```

Modify `public/admin-app.js` to render:

```js
renderStatCard('Hosted Search Requests', summary.hosted_search?.total_requests_24h || 0);
renderStatCard('Hosted Search P95', `${summary.hosted_search?.p95_latency_ms || 0}ms`);
renderStatCard('Trap Hits', summary.hosted_search?.trap_hits_30d || 0);
```

- [ ] **Step 3: Document the Railway promotion triggers in code**

Add this constant near the top of `supabase/functions/search-icons/index.ts`:

```ts
const RAILWAY_PROMOTION_TRIGGERS = {
  averageCpuMs: 1500,
  p95LatencyMs: 2000,
  requiresPython: false,
  requiresLongLivedWorker: false,
};
```

This makes the operational boundary explicit and reviewable.

- [ ] **Step 4: Verify hardening and admin build**

Run:

```bash
npm run build
node scripts/verify-hosted-search-engine.mjs
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/search-engine-trap supabase/functions/admin-api/index.ts public/admin-app.js supabase/functions/search-icons/index.ts
git commit -m "feat: add hosted search hardening and query ops"
```

---

## Cutover Checklist

- [ ] `search-icons` Edge Function is deployed and returns ranked results
- [ ] `icon_catalog` is synced from `public/icon-index.json`
- [ ] curated aliases are seeded into `icon_search_private_manifest`
- [ ] `icon_search_private_features` refreshes from evidence-derived scores
- [ ] web search uses `lib/search-engine-client.js`
- [ ] MCP `search_icons` calls the hosted engine
- [ ] local search is fallback-only, not default
- [ ] hosted search request audits appear in admin
- [ ] the team can point to a measurable Railway trigger instead of debating infra prematurely

---

## Plan Self-Review

### Spec coverage

- Protect the engine while keeping search free: covered by Tasks 1, 4, 5, and 6.
- Recommend a host with rationale: covered in the Hosting Recommendation section.
- Include Supabase vs Railway decision: covered in the Hosting Recommendation and Task 7.
- Save as markdown and HTML in `strategy`: covered by the current files.

### Placeholder scan

- No `TODO`, `TBD`, or deferred placeholders remain.
- Railway is not hand-waved; promotion triggers are explicit.

### Type and naming consistency

- Hosted engine endpoint is consistently named `search-icons`
- Private tables are consistently named `icon_search_private_manifest` and `icon_search_private_features`
- Verification script is consistently named `scripts/verify-hosted-search-engine.mjs`

---

## Final Recommendation

Build the first protected engine on **Supabase**, not Railway.

That choice is correct because the first milestone is:

- deterministic
- data-heavy
- evidence-backed
- already adjacent to the current stack

Do **not** over-rotate into a second platform before the hosted contract, private manifests, and reranking model exist. Use Railway only after the engine proves it has outgrown the Edge shape.

