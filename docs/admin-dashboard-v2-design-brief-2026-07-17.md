# Admin dashboard v2: total design brief

- Date: 2026-07-17
- Status: owner-defined requirements; supersedes the Phase B refinement scope. Phase A data layer (live in production) remains the foundation; this brief defines the destination UI and the remaining data surfaces.
- Source: owner walkthrough feedback, verbatim requirements list, 2026-07-17.

## The ten owner questions the dashboard must answer

1. Who is currently using Supericons?
2. Where are they from?
3. Are they registered? Free or pro?
4. What do they search for? What genuinely returns zero and why (missing icon, bad extraction)? What icon requests have users submitted?
5. How do they search (web, hosted MCP, local npm)?
6. Can I see last 24 hours, and select 7 days, 30 days, or a custom period?
7. Totals: unique users, searches per user, searches by venue, top 50 icons searched and copied or downloaded, top zero-result queries, sortable by venue.
8. What issues are worth working on? Users list with signup dates. Audit section is dead weight.
9. Contact-form requests and feedback must be visible (dashboard or email).
10. Everything loads fast with visible loading states.

## Information architecture (replaces current navigation)

Sidebar: three sections plus one inbox.

### A. Overview (landing)
- Global filter bar: period presets 24h, 7d, 30d, 90d, 12m, all time, plus custom from-to; venue (channel) with live counts, empty venues hidden; single "include test and preview traffic" toggle (default off).
- KPI strip: estimated unique clients (with registered count subtext), real searches (with searches per client), true zero rate (defect eras excluded), low-result rate.
- Top lists panel, venue-sortable, each exportable CSV/JSON: top 50 searched queries; top 50 icons returned; top icons copied or downloaded via web (web copy and download events); top zero-result queries.
- Geography panel: country breakdown of clients and searches (counts and percentages, coverage note for pre-GeoIP rows).
- Latest Activity feed (current concise format: visitor chip, origin badge, result count, country, timestamp) with CSV export.

### B. Search intelligence
- The single query explorer (already decided): global filters plus free-text search over query text; columns for outcome, origin, visitor kind, country, venue, last seen; CSV/JSON export.
- Gap worklist: true-zero and low-result queries ranked by distinct clients, with triage actions (Alias, Icon, Resolve, Ignore) and a "why" classification (missing icon, extraction problem, filtered library) captured at triage time.
- Icon request inbox: rows from the public.icon_evidence table (user-submitted icon requests from the web form; 4 known rows) presented as actionable items with status tracking (new, planned, added, declined).

### C. Audience
- Per-client profiles from telemetry identity precedence: visitor key, kind (anonymous, registered, api-key), plan (free or pro from account_plan), country, first seen, last seen, total searches, venues used.
- Registered users list enriched from auth data: email or handle, signup date, plan, last activity, total searches. Replaces and improves the current Users page.
- Funnel line: total unique clients vs registered vs pro, per selected window.

### D. Inbox (or merged into B if volume stays tiny)
- Icon requests (from B if preferred as one inbox) plus contact-form submissions surfaced in-dashboard. If a contact-form storage table exists, read it; if submissions only go to email today, state that and leave a stub with the owner informed.

### Removed
- Audit Log section (dead by owner verdict; raw audit data remains queryable in the diagnostics drawer or SQL).
- Legacy evidence tables (already decided; deleted, not hidden).
- Stats as a separate page (merged into Overview).

## Data notes for the executor

- is_registered, is_pro, account_plan, api_key_hash, user_id already flow in mcp_usage_events; audit rows carry the subset available to web traffic. Registered enrichment (signup date) comes from the auth schema read-only.
- Web copy and download events: discover the existing web telemetry (kit download and copy signals from the legacy dashboard) and map them into the top-copied list; if the web app does not currently emit per-icon copy events, record the gap and propose the minimal web-side event addition as a separate owner-visible item (it touches the public site, category 2b).
- icon_evidence: read-only integration; confirm schema before building.
- Contact form storage location: discover; do not guess.
- All aggregates go through the Phase A rollup or bounded-window patterns; no full-history raw scans; every panel keeps skeleton loaders and stale-while-revalidate.
- True-zero KPI: pending the outage-window defect-registry investigation (July 15 and 16 windows); land that correction so the Overview numbers are honest.

## Acceptance

Owner walkthrough on real data answers all ten questions above without explanation from anyone. Every list exports. First contentful section under 500 ms warm; no placeholder text anywhere in default views.
