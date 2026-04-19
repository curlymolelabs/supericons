# P0 Intelligence Foundation Discussion

Prepared: April 16, 2026

## Purpose

This note captures the current working conclusions about:

- what `P0.01` actually builds
- whether `P0.02` should come before `P0.01`
- where the captured intelligence data should live
- how it should be organized
- whether it should connect to the admin dashboard

This is intended as a handoff-friendly summary for planning and build sessions.

---

## Executive Summary

The right move is not:

- `P0.01` alone with no taxonomy context
- or full `P0.02` for all 20K+ icons before any data collection

The right move is:

1. build the `P0.01` data foundation
2. do a thin-slice `P0.02`
3. start collecting evidence immediately
4. expand taxonomy continuously in the background

In practice, that means:

- create `icon_evidence`
- create `icon_scores`
- create `icon_metadata`
- categorize only the first meaningful slice of icons
- wire the browse experience and logging to those categories
- surface the resulting intelligence in both Supabase and the admin dashboard

---

## What P0.01 Builds

`P0.01` is the foundational intelligence pipeline for Supericons.

It is not primarily a visible end-user feature. It is the memory layer that records icon decisions so Supericons can become smarter over time for both humans and agents.

### Core Tables

1. `icon_evidence`
   One row per evidence signal.

   Examples:
   - icon copied
   - icon favorited
   - icon replaced later
   - kit downloaded
   - MCP returned a batch of icons
   - editorial judgment entered
   - later: collection events
   - later: gallery events

   Important fields include:
   - `signal_type`
   - `icon_id`
   - `batch_id`
   - `collection_id`
   - `search_query`
   - `domain`
   - `ui_surface`
   - `job_category`
   - `confidence`
   - `evidence_text`
   - `context_url`
   - `session_hash`
   - `created_at`

2. `icon_scores`
   Daily aggregate per icon, rebuilt from evidence.

   Examples:
   - copy count
   - retention rate
   - top search queries
   - top UI surfaces
   - top domains
   - average result position
   - MCP acceptance rate

3. `icon_metadata`
   Taxonomy and classification source of truth.

   Examples:
   - `icon_id`
   - `source_library`
   - `job_category`
   - `secondary_categories`

### What P0.01 Gives Us

After `P0.01`, Supericons begins learning:

- which icons people actually choose
- which search terms lead to meaningful selection
- which icons survive versus get replaced
- which domains use which icons
- which MCP recommendations actually end a search loop

That becomes the basis for:

- smarter search ranking
- evidence-backed MCP responses
- kit curation improvements
- later confidence scores
- later taste profiles
- the long-term judgment moat

---

## Why P0.02 Also Matters

If we capture raw evidence with no taxonomy context, the data is still useful, but much less interpretable.

Without category structure, we can know:

- what got copied
- what search query was used
- what got replaced
- what agents requested
- what kits were downloaded

But we are much weaker on:

- what job the icon was serving
- which categories are overperforming
- what the browse experience should optimize for
- which clusters of use are emerging

So the answer is not to do full `P0.02` first.

The answer is to do enough `P0.02` so `P0.01` has context from day one.

---

## Recommended Sequence

### Not Recommended

1. full `P0.02` across all 20K+ icons before any logging
2. `P0.01` with no taxonomy

### Recommended

1. create `icon_evidence`
2. create `icon_scores`
3. create `icon_metadata`
4. define the 14 job-shaped categories
5. tag only the first meaningful slice of icons
6. start evidence collection immediately
7. expand taxonomy continuously after launch

### Minimum Viable P0.02 Scope

Do not classify the whole library first.

Classify:

- icons used in Kits 01-03
- AI and Agents wedge first
- top 150-300 likely high-traffic icons

This gives enough structure for meaningful evidence without delaying learning.

---

## Where The Data Lives

Primary storage:

- Supabase Postgres

Core tables:

- `icon_evidence`
- `icon_scores`
- `icon_metadata`

This keeps the intelligence layer queryable, operational, and tightly connected to the rest of the product infrastructure.

---

## How The Data Is Organized

The clean conceptual model is:

1. `icon_metadata`
   What we believe an icon is for.

2. `icon_evidence`
   What humans, agents, and editors actually did.

3. `icon_scores`
   What the system currently believes based on accumulated evidence.

This is the core intelligence loop:

`classification -> evidence -> aggregate belief`

---

## How We Should View The Data

We should not rely on only one surface.

### 1. Supabase

Use Supabase for:

- raw inspection
- table validation
- SQL debugging
- backfills
- cron verification
- migration verification

This is the engineering truth source.

### 2. Admin Dashboard

Use the admin dashboard for:

- operational monitoring
- trend review
- curation decisions
- product prioritization
- fast daily review

This is the product decision surface.

---

## Should It Link To The Admin Dashboard?

Yes, absolutely.

The admin dashboard is the right place for the intelligence layer to become usable.

But we should not start by dumping raw `icon_evidence` rows directly into admin as an unstructured log. That becomes noisy very quickly.

Instead, the admin dashboard should expose the intelligence in layers.

---

## Recommended Admin Information Architecture

Add an `Icon Intelligence` area to admin with 3 views.

### 1. Overview

High-level operational KPIs:

- total evidence rows
- copies in last 7 / 30 days
- MCP calls in last 7 / 30 days
- kit downloads by domain
- top job categories
- top rising icons
- top replaced icons

### 2. Evidence Explorer

A filterable raw evidence table for debugging and deeper inspection.

Recommended filters:

- signal type
- icon
- library
- domain
- job category
- UI surface
- date range

### 3. Icon Detail

A per-icon intelligence view showing:

- score summary from `icon_scores`
- latest evidence rows
- top search queries
- replacement history
- top domains
- editorial evidence
- MCP usage and convergence

This is where an icon becomes an inspectable intelligence object rather than a static SVG.

---

## Implementation Recommendation

Build order should be:

1. `P0.01` schema and logging foundation
2. thin-slice `P0.02`
3. browse/category wiring
4. admin dashboard intelligence views
5. ongoing taxonomy expansion

This gives Supericons:

- data now
- interpretation now
- compounding intelligence later

without waiting for perfect categorization.

---

## Important Product Principle

Taxonomy does not need to be complete to be valuable.

It only needs to cover the first meaningful traffic surfaces.

The goal is not to create a perfect ontology before launch.
The goal is to start collecting structured judgment signals early enough that Supericons can become evidence-backed quickly.

---

## Recommendation To Planner

The current recommendation is:

- do not run full-library taxonomy before launch
- do not run evidence capture with no job-shaped structure
- build `P0.01` and a minimum viable `P0.02` together
- store raw truth in Supabase
- surface decision views in admin

If the planner needs a short phrasing:

> Build the memory layer first, but make sure it has enough taxonomy context to mean something from day one.

---

## Additional Note

There is an older `icon_stats` popularity flow in the existing app. Long term, `icon_evidence` and `icon_scores` should become the primary intelligence system. The legacy popularity layer should either be folded into the new model or retired once the new pipeline is live and trusted.
