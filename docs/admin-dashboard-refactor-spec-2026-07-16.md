# Admin Dashboard Refactor: Phase A (data correctness) and Phase B (UI consolidation)

- Date: 2026-07-16
- Status: Ready for executor implementation. Phase A first; Phase B follows once Phase A numbers are live.
- Owner acceptance basis: the dashboard must answer four questions quickly and accurately: how many unique visitors, how many real searches, what genuinely returned nothing or too little, and what happened just now.
- Inputs: docs/supericons-admin-dashboard-refinement-prd-2026-07-14.md (plus its external audit corrections), references/verification/material-acceptance-queries artifacts, the 2026-07-15 incident telemetry findings, and the owner's 2026-07-16 UI review.

## Phase A: data correctness and speed (backend)

Everything the UI will display must first be true and fast. Additive migrations only. Every production mutation (migration, admin-api function deploy, Railway deploy) ships under the established guarded-packet discipline with owner approval sentences.

### A1. query_origin tagging

- Additive columns `query_origin text` on `search_request_audit` and `mcp_usage_events`. No write backfill; reads treat NULL as `legacy_unknown`.
- Writers in the hosted MCP server set per call site: `agent_query` (top-level search_icons and the recommend_icons task string), `recommend_variant` (recommendation inner per-query searches), `icon_lookup` (get_icon resolution searches). The engine handler passes the field through from the request body into both audit writes.
- Admin API groups and filters by origin. Default views and all headline counts use `agent_query` only; `legacy_unknown` is its own visible bucket, never merged.
- Acceptance: the Top MCP Queries list filtered to agent_query contains no recommendation slot fragments (current examples: reply, respond, answer, dropdown). A spot query proves inner recommendation searches carry `recommend_variant`.

### A2. Visitor identity and unique-visitor counting

- One precedence rule everywhere: `user_id`, else `api_key_hash`, else `anonymous_client_hash`, else `session_hash`, else `ip_hash`. First non-null becomes `visitor_key` (prefixed by kind, for example `anon:abc123`). Never union different hash kinds as separate visitors for the same row.
- Admin API returns per-query-row `unique_visitors` and per-window totals: unique visitors, searches per visitor, and returning visitors (seen in a prior window).
- Dedupe-aware counting: rows in `search_request_audit` and `mcp_usage_events` sharing a `dedupe_key` count once (reliable now that the v2 dedupe key shipped in MCP 0.4.18).
- Acceptance: a manual SQL spot check of one 24h window matches the endpoint's unique-visitor total; a single client issuing 10 searches shows 10 searches, 1 visitor.

### A3. Country capture on Railway

- Country-level GeoIP inside the hosted MCP server, computed from the client IP before hashing, only when the existing header chain (cf-ipcountry and friends) yields nothing. Use a country-only dataset small enough to bundle (geoip-country class, a few MB); record `geo_source: railway_geoip`. Include dataset license notice in the repo license documentation.
- Acceptance: at least 90 percent of new hosted MCP events carry `country_code` within 24 hours of deploy; the dashboard audience line shows countries instead of "country not captured" for new traffic.

### A4. Endpoint speed: indexes plus rollups

- Add supporting indexes for the windowed aggregation paths (created_at plus the grouping columns actually used by the queue endpoint) on both telemetry tables.
- New additive table `admin_search_rollups`: daily buckets keyed by (day, channel, environment, query_origin) storing searches, zero_results, low_results, errors, and distinct-visitor count for that day. Maintained by a scheduled job or on-demand refresh triggered by the admin API when a day is stale.
- Windowing policy: 24h and 7d views aggregate raw rows (index-backed); longer windows and "all time" read rollups only and label visitor totals as per-day sums.
- Acceptance: queue endpoint p95 under 1.5 seconds for the 24h window at current volume; "all time" responds under 1 second from rollups; no full-history raw scans remain in any default path.

### A5. Honest field exposure

- API stops emitting permanently empty fields for MCP rows (plan, purpose, source domain, replaced counts) except inside the detail drawer payload where present. Country and visitor kind are emitted explicitly so the UI never invents placeholders.

### Phase A packaging

Three external mutations, sequenced: (1) migration (columns, indexes, rollup table), (2) admin-api function deploy, (3) Railway MCP deploy (origin tagging plus GeoIP; note this is also the release vehicle for the npm-pending dedupe fix already live in 0.4.18). Each gets the standard fingerprinted packet, auditor verification, and owner sentence. Gate probes classify as internal_test. Rollback per packet: additive schema stays; function and Railway deploys roll back by redeploying prior versions (deployment IDs pinned pre-deploy).

## Phase B: UI consolidation (local-only, no production gates)

1. Page structure, top to bottom: one global filter bar (time window, channel, environment, free-text search) obeyed by every section; a four-KPI strip (unique visitors, real searches, true zero rate, low-result rate, all agent_query-based, each with searches-per-visitor and window deltas); the Latest Activity feed as the primary panel (current concise format, plus visitor key chip and origin badge per row); the gap worklist (real zero and low queries with triage actions); a collapsed Diagnostics drawer holding everything pruned (raw signal counts, kit downloads, replaced icons, purpose coverage, empty charts).
2. Remove duplicated filter rows inside Query Explorer and Latest Activity; section-specific filters (issue type, library, status) appear only inside their expanded section.
3. Loading feedback: skeleton loaders per panel, stale-while-revalidate (always render last data immediately, refresh in background), a visible spinner on the Refresh control, and progressive loading with Latest Activity first. No blank multi-second page states.
4. Labels: no "not captured" placeholders for fields that cannot exist for a channel; show nothing instead. "Visitor - Plan not captured" becomes the visitor key chip with kind (anonymous, registered, api-key).
5. Acceptance: owner walkthrough on localhost; every visible number traceable to a Phase A endpoint field; zero placeholder text in the default view; first contentful section under 500 ms with warm cache.

## Out of scope

Local-first all-library search, SQL diagnostics execution, npm publication, Search v2 resumption, monetization instrumentation. Each proceeds separately.
