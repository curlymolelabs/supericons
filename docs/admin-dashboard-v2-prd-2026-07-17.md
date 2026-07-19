# Admin dashboard v2 PRD

- Date: 2026-07-17
- Status: owner-approved design; ready for implementation.
- Design authority: the owner approved the interactive mockup at `mockups/admin-dashboard-v2-mockup-2026-07-17.html` as the target look, layout, and information architecture. Where this PRD and the mockup disagree on visuals, the mockup wins; where the mockup is silent on behavior, this PRD wins.
- Foundations: Phase A data layer (live: query_origin, requested_limit, country_code, client_ip_public, identity precedence, defect registry, rollup tables, bounded caches) and the approved v2 design brief (`docs/admin-dashboard-v2-design-brief-2026-07-17.md`).

## 1. Goals

The dashboard must answer the owner's ten questions (brief section 1) on real production data, fast, without explanation. It is internal tooling for one operator; clarity beats density, honesty beats completeness.

## 2. Information architecture

Sidebar: Overview, Search Intelligence, Audience. No Stats page (merged into Overview), no Audit Log page (raw evidence remains reachable from the diagnostics drawer inside Search Intelligence). Users page is replaced by the Audience section.

Global elements on every section:
- Filter bar: free-text search; period presets (24h, 7d, 30d, 90d, 12m, all time) plus custom from-to date range; venue selector with live counts and empty venues hidden; single "include test traffic" toggle (default off) replacing the environment dropdown. Every panel obeys every filter.
- Freshness line ("Up to date, loaded in N ms") and per-panel skeleton loaders with stale-while-revalidate. No blank states, no placeholder copy.

## 3. Overview section

### 3.1 KPI strip (existing, amended)
Four cards: Estimated Unique Clients (subtext: registered count, pro count, anonymous count); Real Searches (subtext: per-client ratio and success percent); True Zero Rate (subtext: count, with defect and outage eras excluded); Low-Result Rate (subtext: eligible fraction). True Zero depends on the outage-window defect-registry entries landing (already in flight).

### 3.2 Charts (new, owner-requested)
Rendered as dependency-free inline SVG (no chart library; match the existing vanilla JS approach). All series come from admin_rollup_overview (completed days) plus the bounded raw path for today, so charts are cheap. Each chart respects the global filters and offers PNG-free simplicity: hover tooltip with exact values, and a CSV export of the underlying series.

1. Searches over time: daily bars for the selected window, stacked or coloured by venue; toggle between total and per-venue lines.
2. Unique clients over time: daily line using client-day counts, labeled "client-days" beyond calendar-month windows per the Phase A honesty rule.
3. Quality trend: true-zero rate and low-result rate as two lines over the window; defect-era spans shaded with a label (for example "outage Jul 16") so anomalies are explained in-chart.
4. Funnel mini-trend: registered and pro counts over time as a small sparkline pair in the Audience funnel strip (see 5.1).

### 3.3 Top lists (new)
One panel with four tabs, each top-50, venue-sortable, CSV/JSON export:
- Top searched queries: searches, distinct clients, hit rate.
- Top returned icons: the icons most often present in result sets, from the existing search-to-icon evidence linkage; confirm coverage during V2.2 endpoint design and use the unavailable-data state if the linkage proves partial.
- Top copied or downloaded icons via web: depends on web copy/download event discovery (see 7.3); if events are absent, the tab shows the unavailable-data state, never fake numbers.
- Top zero-result queries: count, distinct clients, last seen, link into the gap worklist row.

### 3.4 Geography panel (new)
Country bars: distinct clients and searches per country with percentages, unknown bucket labeled (private IPs and pre-GeoIP rows, never guessed), coverage percentage in the subtitle. CSV export.

### 3.5 Latest Activity (existing, amended)
Concise rows: query, library and origin subtext, visitor chip (kind-aware: anonymous hash, registered handle, PRO badge), result count with zero/low pill when applicable, country flag chip, venue chip, timestamp. CSV export. Loads before all other panels.

## 4. Search Intelligence section

### 4.1 Search history (the single query interface)
Every query in the window, grouped only when the same searcher repeats the same query in the same venue, library, and origin. The same query from different searchers must appear as separate rows. Columns: query (with library and origin subtext), searcher, search count, outcome, country, venue, results, last seen. The free-text search supports plain text plus key:value filters (zero:true, low:true, venue:web, country:DE, origin:user, registered:true). CSV/JSON export of the filtered set. The legacy evidence tables are deleted.

### 4.2 Gap worklist (existing, amended)
True-zero and low-result queries ranked by distinct clients. Columns add a WHY triage value captured at review time: missing icon, extraction problem, sparse coverage, filtered library, ignore. Actions: Alias, Add icon, Resolve, Ignore (existing review write path). Rows link back to explorer detail.

### 4.3 Icon request inbox (new)
Rows from public.icon_evidence (user-submitted requests from the web form). Columns: request text, submitter (visitor chip, country when known), submitted date, status (New, Planned, Added, Declined) with status writes stored alongside the existing review mechanism. Badge with open count in the sidebar.

### 4.4 Diagnostics drawer (existing)
Collapsed by default; holds pruned stats, raw evidence access, and engine-health signals including defect-registry listings.

## 5. Audience section

### 5.1 Funnel strip (new)
Unique clients, registered (count and percent), pro (count and percent), MRR for the window. Registered and pro sparklines from 3.2.4. MRR derives from pro count and plan price; if no billing source exists yet, show pro count only and omit currency until a price source is configured (no invented numbers).

### 5.2 Registered users (replaces Users page)
From auth (read-only) enriched with telemetry: identifier (email or handle, truncated), plan pill, signup date, last active, searches in window, venues used, country. CSV export. Sorted by last active by default.

### 5.3 All clients (new)
Per-client profiles from identity precedence: visitor key chip, kind pill, country, first seen, last seen, searches, top query. Anonymous identity is monthly-stable; cross-month lists carry the estimate label. CSV export.

## 6. Non-functional requirements

- First contentful section under 500 ms warm; every panel has a skeleton state; stale-while-revalidate everywhere; visible refresh state.
- Empty-state rules, classified: FORBIDDEN are placeholders that fake or noise-fill data ("not captured", invented values, mock rows). SUPPORTED are labeled unavailable-data states that tell the truth about why a panel is empty ("not instrumented yet", "no submissions stored; contact form currently delivers to email only", "no data in this window"). Every supported empty state names its reason.
- All aggregates from rollups or bounded windows; no full-history raw scans in any default path; new aggregate endpoints reuse the Phase A cache pattern (30s TTL, cleared on writes).
- Speed bars for the API remain as shipped (24h p95 1500 cold and warm; all-time 1300 cold, 1000 warm); new endpoints must not regress them.
- No AI or process metadata in any output; public-safe copy throughout; no U+2013 or U+2014 characters.
- Credentials: zero-touch environment-first pattern (as landed in 2AA) for any deploy; secrets never in browser code or storage (loopback gateway pattern from Phase B live verification).

## 7. Data work required

### 7.1 New admin-api endpoints (production deploy, internal gates apply)
- Time-series: daily overview series by venue and origin (rollup-backed).
- Top lists: searched, zero (rollup-backed via admin_rollup_queries); returned (from the search-to-icon evidence linkage, coverage confirmed during endpoint design); copied (pending 7.3).
- Geography aggregate: clients and searches by country for the window.
- Audience: per-client profile list with kind, plan, first/last seen (bounded windows); registered enrichment joining auth read-only.
- Icon requests: read icon_evidence; status writes.

### 7.2 Schema
No new tables expected; icon-request status may reuse the existing review-write pattern or a small additive table if cleaner. Additive migrations only, standard internal packet discipline.

### 7.3 Discovery items (report findings before building)
- Web copy/download events: confirm whether the web app emits per-icon copy or download telemetry. If not, adding events touches the public site: owner-visible decision before shipping (category 2b).
- Contact form storage: locate where contact submissions persist; if email-only today, report and stub the panel with an honest empty state.
- icon_evidence schema: confirm columns before the inbox build.
- Plan price source for MRR: confirm where pro pricing lives; omit MRR until confirmed.

## 8. Phasing

- V2.1 UI on existing API: IA restructure (three sections, nav merge, deletions), explorer consolidation, activity CSV, custom date range, venue counts, test-traffic toggle, wording pass. No production deploy needed.
- V2.2 API extensions: time-series, top lists (searched, returned, and zero), geography, audience endpoints; one admin-api deploy under the zero-touch internal gates; charts and new panels go live on real data.
- V2.3 Discovery-dependent: copied/downloaded top list, contact-form panel, MRR figure, each landing when its discovery item resolves (with owner input only where flagged).

## 9. Acceptance

Owner walkthrough on real production data answers all ten brief questions without help; charts render for 24h, 7d, 30d, and a custom range; every list exports; the three-section navigation contains everything the owner uses weekly; nothing in the default views is a placeholder, a mock, or an unexplained anomaly.

## 10. Out of scope

Search engine v2 integration surfaces (a served-from badge and stage-timing diagnostics land after that lane ships), public site changes beyond the copy-event decision, email digests, multi-operator roles.
