# Admin Dashboard Refactor: Phase A (data correctness) and Phase B (UI consolidation)

- Date: 2026-07-16
- Status: Ready for executor implementation. Phase A first; Phase B follows once Phase A numbers are live.
- Owner acceptance basis: the dashboard must answer four questions quickly and accurately: how many distinct clients (estimated), how many real searches, what genuinely returned nothing or too little, and what happened just now.
- Inputs: docs/supericons-admin-dashboard-refinement-prd-2026-07-14.md (plus its external audit corrections), references/verification/material-acceptance-queries artifacts, the 2026-07-15 incident telemetry findings, and the owner's 2026-07-16 UI review.

## Phase A: data correctness and speed (backend)

Everything the UI will display must first be true and fast. Additive migrations only. Every production mutation (migration, admin-api function deploy, Railway deploy) ships under the established guarded-packet discipline with owner approval sentences.

### A1. query_origin classification WITHOUT touching mcp-search

- No mcp-search deployment in Phase A. Origin is obtained two ways:
  a. `search_request_audit` rows: derived at READ time in the admin API from existing fields. Mapping: `tool_name = 'recommend_icons'` means `recommend_variant`; `tool_name = 'get_icon'` means `icon_lookup`; `tool_name = 'search_icons'` (or web sources) means `agent_query`; anything unclassifiable means `legacy_unknown`.
  b. `mcp_usage_events`: additive `query_origin text` column written by the Railway server (which already knows the call site); the recommend task string is `agent_query`, inner slot searches are not usage events. NULL reads as `legacy_unknown`.
- Additive `requested_limit integer` column on `mcp_usage_events`, written by the Railway server from tool args. Low-result rules are PER TOOL, because result_count means different things: for `search_icons`, low means `0 < result_count < min(requested_limit, 3)`, and result_count equal to requested_limit is a capped success, never low. For `recommend_icons`, result_count counts successful SLOTS, so it is EXCLUDED from the low-result KPI entirely; instead, `successful_slots < slots.length` is reported separately as "partial recommendations" (requested_limit stores slots.length for this tool). Audit-table rows without requested_limit keep the legacy definition and are labeled approximate.
- Known-defect classification (restored): a small versioned defect registry (JSON in the repo, loaded by the admin API) mapping error_code values, date ranges, and library filters to named defects; matching rows are excluded from true-zero and shown under Engine health. The first registry entry: Material historical zeros, matching ZERO-RESULT outcomes only with library filter material, from history start until the exact production-fix completion timestamp of Railway deployment 5ea2e0b8-201a-4be9-81b7-a450d7f85c61 (the executor pins the precise UTC timestamp from the retained completion evidence). Successful Material events on and after 2026-07-16 are never defect-classified.
- Admin API groups and filters by origin. Default views and all headline counts use `agent_query` only; `legacy_unknown` is its own visible bucket, never merged.
- Acceptance: the Top MCP Queries list filtered to agent_query contains no recommendation slot fragments (current examples: reply, respond, answer, dropdown); a search with limit 3 returning 3 is not counted low; pre-fix material zeros appear as defect-classified, not as content gaps.

### A2. Estimated unique clients (identity precedence)

- One precedence rule everywhere: `user_id`, else `api_key_hash`, else `anonymous_client_hash`, else `session_hash`, else `ip_hash`. First non-null becomes `visitor_key` (prefixed by kind, for example `anon:abc123`). Never union different hash kinds as separate visitors for the same row.
- Admin API returns per-query-row `estimated_unique_clients` and per-window totals: estimated unique clients, searches per client, and returning clients (within the same calendar month).
- Dedupe-aware counting with defined authority: rows in `search_request_audit` and `mcp_usage_events` sharing a `dedupe_key` count once. `mcp_usage_events` is authoritative for hosted MCP user-facing counts and outcomes (it carries requested_limit and query_origin); `search_request_audit` is authoritative for web searches and engine diagnostics. Duplicate merging always preserves the richer usage-event fields; the API never keeps whichever row it happens to encounter first.
- Honesty constraint: the anonymous client hash includes a monthly rotation bucket (remote-server.js identity derivation), so cross-month identity is not stable. All UI copy says "estimated unique clients"; returning-client metrics are computed within a calendar month only, and the limitation is documented in the dashboard help text.
- Acceptance: a manual SQL spot check of one 24h window matches the endpoint's estimated-unique-clients total; a single client issuing 10 searches shows 10 searches, 1 client.

### A3. Country capture on Railway

- Country-level GeoIP inside the hosted MCP server, computed from the client IP before hashing, only when the existing header chain (cf-ipcountry and friends) yields nothing. Concrete requirements: a country-only GeoLite2-derived package small enough to bundle (a few MB, executor selects and pins the exact package and dataset version); GeoLite2 license notice and attribution added to the repo license documentation; dataset updates via pinned dependency bumps on a quarterly cadence recorded in the spec; private, reserved, or unparseable client IPs yield country null with geo_source null (never a guessed country); record `geo_source: railway_geoip` on successful lookups.
- Acceptance: at least 90 percent of new hosted MCP events carry `country_code` within 24 hours of deploy, where the denominator excludes internal_test and verify channels and events without a valid public client IP; the dashboard audience line shows countries for new traffic.

### A4. Endpoint speed: indexes plus rollups

- Add supporting indexes for the windowed aggregation paths (created_at plus the grouping columns actually used by the queue endpoint) on both telemetry tables.
- Two additive rollup tables, split by purpose: `admin_rollup_overview` keyed by (day, channel, environment, query_origin) for KPI totals, and `admin_rollup_queries` keyed by (day, query_norm, library_filter, query_origin, channel, environment, tool_name) storing searches, zero, low, and errors, so the all-time worklist obeys every global filter and per-tool outcome semantics. Days are UTC; only completed UTC days are rolled up; the current day always combines raw rows with completed-day rollups. Maintained by on-demand refresh when a completed day is missing.
- Distinct-client counts are computed only from raw rows within bounded windows (24h, 7d, calendar month). Longer windows display per-day client-day sums labeled exactly that ("client-days"), never as unique clients.
- Acceptance: queue endpoint p95 under 1.5 seconds for the 24h window at current volume, measured cold (cache-bypassed) and warm separately; "all time" responds under 1 second warm and under 1.3 seconds cold from rollups (cold bound relaxed from 1.0s by owner decision 2026-07-17 after measured evidence: cold p95 1.07s network-inclusive with 0.7s median; every other bound unchanged); no full-history raw scans remain in any default path.

### A5. Honest field exposure

- API stops emitting permanently empty fields for MCP rows (plan, purpose, source domain, replaced counts) except inside the detail drawer payload where present. Country and visitor kind are emitted explicitly so the UI never invents placeholders.

### Implementation baseline (mandatory)

- Production Railway MCP runs branch `codex/material-railway-hydration-release` at `31ac66dfe` (v0.4.18 with the dedupe fix). Main still carries `0.4.18-beta.0` without it. All Phase A Railway-side work branches from `31ac66dfe` in a CLEAN dedicated worktree; the dirty main worktree (uncommitted admin.html, admin-app.js, admin-api changes) is not an implementation base. The executor verifies the deployed admin-api baseline as part of packet preparation, as done for prior packets. Merging the release branch back to main is a separate follow-up task, not part of Phase A.

### Phase A packaging

Three external mutations, sequenced: (1) migration (mcp_usage_events columns, indexes, two rollup tables), (2) admin-api function deploy (read-time origin derivation, identity precedence, defect registry, rollups), (3) Railway MCP deploy (origin and requested_limit writing plus GeoIP). No mcp-search deployment. Each mutation gets the standard fingerprinted packet, auditor verification, and owner sentence. Gate probes classify as internal_test. Rollback per packet: additive schema stays; function and Railway deploys roll back by redeploying prior pinned versions (deployment IDs captured pre-deploy).

## Phase B: UI consolidation (local-only, no production gates)

1. Page structure, top to bottom: one global filter bar (time window, channel, environment, free-text search) obeyed by every section; a four-KPI strip (estimated unique clients, real searches, true zero rate, low-result rate, all agent_query-based, with searches-per-client and window deltas); the Latest Activity feed as the primary panel (current concise format, plus visitor key chip and origin badge per row); the gap worklist (real zero and low queries with triage actions); a collapsed Diagnostics drawer holding everything pruned (raw signal counts, kit downloads, replaced icons, purpose coverage, empty charts).
2. Remove duplicated filter rows inside Query Explorer and Latest Activity; section-specific filters (issue type, library, status) appear only inside their expanded section.
3. Loading feedback: skeleton loaders per panel, stale-while-revalidate (always render last data immediately, refresh in background), a visible spinner on the Refresh control, and progressive loading with Latest Activity first. No blank multi-second page states.
4. Labels: no "not captured" placeholders for fields that cannot exist for a channel; show nothing instead. "Visitor - Plan not captured" becomes the visitor key chip with kind (anonymous, registered, api-key).
5. Acceptance: owner walkthrough on localhost; every visible number traceable to a Phase A endpoint field; zero placeholder text in the default view; first contentful section under 500 ms with warm cache.

## Out of scope

Local-first all-library search, SQL diagnostics execution, npm publication, Search v2 resumption, monetization instrumentation. Each proceeds separately.
