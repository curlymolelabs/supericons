# P0.02 Phase 4 Query Ops Plan

**Date:** April 17, 2026
**Scope:** Clean up noisy search-attempt test rows, establish a repeatable admin triage rubric, and add a minimal review-status workflow to Icon Intelligence

---

## 1. Goal

Turn Phase 4 search intelligence into an operating loop:

1. remove the known noisy prefix rows from April 17 testing
2. review queries with a consistent decision rubric
3. persist review outcomes in admin so the same query is not re-triaged repeatedly

This is an operational slice, not a search-engine rebuild. The settled-search fix is already working. The next step is making the data trustworthy and actionable.

---

## 2. Desired Outcomes

By the end of this slice we should have:

1. the obvious April 17, 2026 noisy prefix `search_attempt` rows removed from `public.icon_evidence`
2. a lightweight weekly admin workflow for classifying search gaps as `resolved`, `needs_alias`, `needs_icon`, or `ignore`
3. a small admin feature that lets us save and display those classifications next to query rows

---

## 3. Execution Order

### Step 1. Data hygiene first

Run a review-first cleanup SQL pass for April 17, 2026 noisy prefix rows. Do not ship the admin review feature before the dashboard reflects the settled-search behavior.

### Step 2. Lock the triage rubric

Write the rubric into the team workflow before building the status feature. The UI should reflect the rubric, not invent it.

### Step 3. Build the smallest useful review feature

Add one review table, one upsert endpoint, and one small admin interaction for setting query status and an optional note.

### Step 4. Verify the loop end-to-end

Confirm that a query can be:

1. seen in the dashboard
2. marked with a review status
3. refreshed without losing the status
4. used to drive alias or icon backlog decisions

---

## 4. Workstream A: Cleanup SQL For April 17 Noisy Prefix Rows

### Intent

Clean only the noisy `search_attempt` rows created before the settled-search fix, not legitimate search reformulations or later production data.

### Safety Rules

1. Review candidates before deleting anything.
2. Back up candidate rows into a dedicated table before delete.
3. Restrict the window to April 17, 2026 Singapore time.
4. Restrict candidates to rows that are prefixes of a later longer query in the same session and same search context.

### Time Window

`April 17, 2026` in `Asia/Singapore` corresponds to:

- start: `2026-04-16 16:00:00+00`
- end: `2026-04-17 16:00:00+00`

### SQL 1: Review candidate rows

```sql
with bounds as (
  select
    timestamptz '2026-04-16 16:00:00+00' as start_at,
    timestamptz '2026-04-17 16:00:00+00' as end_at
),
attempts as (
  select
    ie.id,
    ie.session_hash,
    ie.created_at,
    ie.search_query,
    lower(trim(ie.search_query)) as normalized_query,
    ie.result_count,
    ie.library_filter,
    ie.job_category,
    ie.ui_surface
  from public.icon_evidence ie, bounds b
  where ie.signal_type = 'search_attempt'
    and ie.created_at >= b.start_at
    and ie.created_at < b.end_at
    and nullif(trim(ie.search_query), '') is not null
),
noisy_candidates as (
  select distinct earlier.id
  from attempts earlier
  join attempts later
    on later.session_hash = earlier.session_hash
   and later.created_at > earlier.created_at
   and later.created_at <= earlier.created_at + interval '15 minutes'
   and coalesce(later.library_filter, 'all') = coalesce(earlier.library_filter, 'all')
   and coalesce(later.job_category, '') = coalesce(earlier.job_category, '')
   and coalesce(later.ui_surface, '') = coalesce(earlier.ui_surface, '')
   and char_length(later.normalized_query) > char_length(earlier.normalized_query)
   and later.normalized_query like earlier.normalized_query || '%'
)
select
  ie.id,
  ie.created_at,
  ie.session_hash,
  ie.search_query,
  ie.result_count,
  ie.library_filter,
  ie.job_category,
  ie.ui_surface
from public.icon_evidence ie
join noisy_candidates nc on nc.id = ie.id
order by ie.session_hash, ie.created_at;
```

### SQL 2: Back up candidate rows

```sql
create table if not exists public.icon_evidence_cleanup_20260417
  (like public.icon_evidence including all);

with bounds as (
  select
    timestamptz '2026-04-16 16:00:00+00' as start_at,
    timestamptz '2026-04-17 16:00:00+00' as end_at
),
attempts as (
  select
    ie.id,
    ie.session_hash,
    ie.created_at,
    lower(trim(ie.search_query)) as normalized_query,
    ie.library_filter,
    ie.job_category,
    ie.ui_surface
  from public.icon_evidence ie, bounds b
  where ie.signal_type = 'search_attempt'
    and ie.created_at >= b.start_at
    and ie.created_at < b.end_at
    and nullif(trim(ie.search_query), '') is not null
),
noisy_candidates as (
  select distinct earlier.id
  from attempts earlier
  join attempts later
    on later.session_hash = earlier.session_hash
   and later.created_at > earlier.created_at
   and later.created_at <= earlier.created_at + interval '15 minutes'
   and coalesce(later.library_filter, 'all') = coalesce(earlier.library_filter, 'all')
   and coalesce(later.job_category, '') = coalesce(earlier.job_category, '')
   and coalesce(later.ui_surface, '') = coalesce(earlier.ui_surface, '')
   and char_length(later.normalized_query) > char_length(earlier.normalized_query)
   and later.normalized_query like earlier.normalized_query || '%'
)
insert into public.icon_evidence_cleanup_20260417
select ie.*
from public.icon_evidence ie
join noisy_candidates nc on nc.id = ie.id
on conflict (id) do nothing;
```

### SQL 3: Delete candidate rows

Run this only after reviewing the candidate list and confirming the backup table is populated.

```sql
with bounds as (
  select
    timestamptz '2026-04-16 16:00:00+00' as start_at,
    timestamptz '2026-04-17 16:00:00+00' as end_at
),
attempts as (
  select
    ie.id,
    ie.session_hash,
    ie.created_at,
    lower(trim(ie.search_query)) as normalized_query,
    ie.library_filter,
    ie.job_category,
    ie.ui_surface
  from public.icon_evidence ie, bounds b
  where ie.signal_type = 'search_attempt'
    and ie.created_at >= b.start_at
    and ie.created_at < b.end_at
    and nullif(trim(ie.search_query), '') is not null
),
noisy_candidates as (
  select distinct earlier.id
  from attempts earlier
  join attempts later
    on later.session_hash = earlier.session_hash
   and later.created_at > earlier.created_at
   and later.created_at <= earlier.created_at + interval '15 minutes'
   and coalesce(later.library_filter, 'all') = coalesce(earlier.library_filter, 'all')
   and coalesce(later.job_category, '') = coalesce(earlier.job_category, '')
   and coalesce(later.ui_surface, '') = coalesce(earlier.ui_surface, '')
   and char_length(later.normalized_query) > char_length(earlier.normalized_query)
   and later.normalized_query like earlier.normalized_query || '%'
)
delete from public.icon_evidence ie
using noisy_candidates nc
where ie.id = nc.id;
```

### SQL 4: Post-delete verification

```sql
select
  signal_type,
  count(*) as row_count
from public.icon_evidence
where created_at >= timestamptz '2026-04-16 16:00:00+00'
  and created_at < timestamptz '2026-04-17 16:00:00+00'
group by signal_type
order by signal_type;
```

### Notes

1. This SQL is intentionally narrow. It only cleans the known prefix noise pattern.
2. If the review query surfaces genuine reformulations that should remain, exclude those `id` values manually before running delete.
3. This is a one-time cleanup. After the settled-search fix, this should not be part of the normal workflow.

---

## 5. Workstream B: Query-Triage Rubric For Admin Workflow

### Review Cadence

Run this once per week for the last `7d` window, then sanity-check against `30d` to avoid overreacting to one-off spikes.

### Review Order

1. `Top Zero-Result Queries`
2. `Low-Result Queries`
3. `Replacement-Heavy Queries`
4. optionally `Top Successful Queries` to mark already-solved concepts as `resolved`

### Status Definitions

| Status | Use when | Typical action |
|---|---|---|
| `resolved` | Current search results are good enough now | No further action; leave a note if a recent alias or icon addition fixed it |
| `needs_alias` | A good icon exists in the current libraries, but the query does not surface it well enough | Add curated alias, synonym, or ranking support |
| `needs_icon` | No good icon exists even after manual search across the current libraries | Add to icon curation backlog or pack-acquisition backlog |
| `ignore` | Query is typo noise, user-specific, out of scope, or not worth optimizing | No product action; optional note for why it is ignored |

### Decision Tree

1. Re-run the query in the live product.
2. If the right icon appears in the top 3 and the result set feels good, mark `resolved`.
3. If the right icon exists somewhere in the current libraries but is buried or absent from the search results, mark `needs_alias`.
4. If no credible icon exists after manual search and browse, mark `needs_icon`.
5. If the query is low-value noise or outside the Supericons promise, mark `ignore`.

### Examples

| Query pattern | Likely status | Why |
|---|---|---|
| `interconnected` returns weak or no result, but `lucide:network` is obviously correct | `needs_alias` | Search gap, not content gap |
| `agents swarm` has no convincing icon across libraries | `needs_icon` | Search cannot invent missing content |
| `llm` now returns a strong icon after the settled-search and alias work | `resolved` | Gap already closed |
| random typo, internal ticket ID, or personal proper noun | `ignore` | Not worth productizing |

### What Goes In The Note Field

Keep notes short and action-oriented:

1. for `needs_alias`: proposed icon and alias term
2. for `needs_icon`: what concept is missing and why current icons fail
3. for `resolved`: what fixed it
4. for `ignore`: reason for ignoring

Examples:

- `needs_alias: map to lucide:network`
- `needs_icon: need a stronger multi-agent cluster visual`
- `resolved: fixed by alias for lucide:timer`
- `ignore: internal project codename`

### Weekly Workflow

1. Open `Icon Intelligence` in the `7d` window.
2. Review the top 5-10 rows in `Top Zero-Result Queries`.
3. Review the top 5-10 rows in `Low-Result Queries`.
4. Review the top 5-10 rows in `Replacement-Heavy Queries`.
5. Mark each reviewed query with one of the four statuses.
6. Create follow-up backlog items only for `needs_alias` and `needs_icon`.
7. Re-check those same queries the following week and move them to `resolved` if fixed.

---

## 6. Workstream C: Small Admin Enhancement For Query Review Status

### Product Principle

This should be a tiny internal workflow feature, not a full ticketing system.

### Minimal Scope

1. save a status for a normalized query plus search context
2. optionally save a short note
3. display the saved status in the admin search-intelligence view
4. allow updating the status later

### Non-goals

1. no bulk triage tools
2. no multi-admin identity model
3. no full audit trail for every status change
4. no automatic alias generation in this slice

### Proposed Data Model

Add a small table: `public.icon_query_reviews`

Suggested shape:

```sql
create table public.icon_query_reviews (
  id uuid primary key default gen_random_uuid(),
  normalized_query text not null,
  library_filter text,
  job_category text,
  status text not null check (status in ('resolved', 'needs_alias', 'needs_icon', 'ignore')),
  note text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index icon_query_reviews_query_context_idx
  on public.icon_query_reviews (
    normalized_query,
    coalesce(library_filter, ''),
    coalesce(job_category, '')
  );
```

### Why Query + Context

Status should be scoped to:

1. `normalized_query`
2. `library_filter`
3. `job_category`

That keeps `network` in `all libraries` separate from a narrower, filtered context if needed.

### Backend Changes

Update [index.ts](/d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/supabase/functions/admin-api/index.ts) to add:

1. a helper to load reviews keyed by query context
2. a `POST /intelligence/search/review` endpoint that upserts `{ query, library_filter, job_category, status, note }`
3. review data merged into the existing `/intelligence/search` payload so the admin UI can render status badges without extra fetches for every row

### Frontend Changes

Update [admin-app.js](/d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/public/admin-app.js) and [admin.html](/d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/admin.html) to add:

1. a small status badge next to query rows in:
   - `Top Zero-Result Queries`
   - `Low-Result Queries`
   - `Replacement-Heavy Queries`
2. one shared triage form with:
   - query
   - library filter
   - purpose
   - status select
   - optional note
   - save button
3. a simple success toast after save
4. refresh of search-intelligence state after save

### UI Recommendation

Keep the first version simple:

1. clicking a query row opens a compact review form beneath the search-intelligence sections
2. the row shows either `Untriaged` or the saved status badge
3. note editing is optional, not required

This is enough to make the workflow sticky without turning the panel into an admin CMS.

### Suggested File Touches

1. `supabase/migrations/<new migration>.sql`
2. `supabase/functions/admin-api/index.ts`
3. `public/admin-app.js`
4. `admin.html`

---

## 7. Verification Plan

### Cleanup Verification

1. review query returns only obvious prefix-noise candidates
2. backup table contains the same `id` count as the delete set
3. delete removes only `search_attempt` rows in the April 17 window
4. dashboard no longer shows noisy prefixes from pre-fix testing

### Rubric Verification

1. two different reviewers would likely choose the same status for the same query
2. `needs_alias` and `needs_icon` are distinguishable in practice
3. `ignore` is reserved for real noise, not for hard-but-important queries

### Feature Verification

1. mark a query as `needs_alias`
2. refresh admin and confirm the status persists
3. update the same query to `resolved`
4. refresh admin and confirm the new status replaces the old one
5. confirm status badge appears in the relevant query list and does not break existing rendering

---

## 8. Acceptance Criteria

This slice is complete when:

1. April 17 noisy prefix rows are cleaned up with a review-first, backed-up SQL pass
2. the query-triage rubric is documented and can be followed in a weekly review
3. admin can save and display `resolved`, `needs_alias`, `needs_icon`, and `ignore` for query rows
4. the saved status persists across refreshes
5. the feature remains small and does not add unnecessary workflow complexity

---

## 9. Recommended Sequence And Estimate

### Same day

1. run cleanup review SQL
2. back up and delete confirmed noisy rows
3. refresh admin and verify the dashboard looks clean

### Next build slice

1. add migration for `icon_query_reviews`
2. extend `admin-api`
3. add small admin review UI
4. verify save and refresh behavior

### Rough effort

1. cleanup SQL and verification: `30-45 min`
2. rubric lock and workflow note: `15-20 min`
3. review-status feature: `0.5-1 day`

---

## 10. Strategic Rationale

This slice matters because it turns search intelligence from passive reporting into an active curation loop:

1. trustworthy inputs after cleanup
2. consistent human judgment through the rubric
3. memory and continuity through saved query statuses

That is the smallest version of a compounding evidence system for Supericons.
