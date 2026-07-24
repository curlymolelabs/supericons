# Cross-Channel Icon Popularity

Status: Proposal  
Owner: Curly Mole Labs  
Date: 2026-07-25  
Scope: Public All Icons ranking across web, hosted MCP, and local npm MCP

## Problem Statement

The public All Icons grid currently ranks icons using a global 30-day score based on web copies, downloads, and favorites. The ranking is applied only to the default All Icons view and is not labeled in the interface. [SOURCE: main.js] [SOURCE: lib/icon-grid-behavior.js] [SOURCE: supabase/migrations/20260418_icon_intelligence_popularity_refresh.sql]

The live `icon_scores` table contained 162 rows when checked on 2026-07-25, and every row had the same `calculated_at` timestamp from 2026-04-18. The live grid order matched that old score snapshot. Recent usage therefore could not affect the public ranking. [SOURCE: live read-only `icon_scores` query 2026-07-25] [SOURCE: live Supericons browser check 2026-07-25]

The existing score does not include hosted MCP or local npm MCP demand, even though the admin data model treats Web, Hosted MCP, and Local MCP/npm as separate product channels. [SOURCE: supabase/migrations/20260418_icon_intelligence_popularity_refresh.sql] [SOURCE: docs/supericons-admin-user-intelligence-dashboard-prd-2026-07-04.md]

Search volume alone does not identify a popular icon. One search can expose many icons, and an icon appearing in a result list does not prove that the user or agent chose it. [SOURCE: lib/web-search-episode.js] [SOURCE: mcp/telemetry.js] [SOURCE: mcp/remote-server.js]

The product needs one global, explainable popularity system that includes real activity from all supported channels while distinguishing confirmed use from passive search exposure. [SOURCE: owner request 2026-07-25]

## Target User

### Primary user

When a person opens All Icons without a specific query, they want useful and widely chosen icons to appear first so they can discover good defaults quickly. [ASSUMPTION]

### Secondary user

When an AI agent searches, previews, or retrieves icons through hosted MCP or local npm MCP, it should contribute privacy-safe evidence about which icons are useful across the Supericons ecosystem. [SOURCE: owner request 2026-07-25]

### Operator

When the Supericons operator reviews product demand, they want to understand which icons are popular overall and which channels contribute to that demand without confusing result exposure with actual use. [SOURCE: docs/supericons-admin-user-intelligence-dashboard-prd-2026-07-04.md]

## Jobs To Be Done

1. When I browse without a query, I want commonly used icons first so I can choose a reliable option quickly. [ASSUMPTION]
2. When I use Supericons through an agent, I want my successful icon requests to improve discovery for other users without requiring an account. [ASSUMPTION]
3. When I inspect popularity, I want to know whether an icon is popular on the web, with agents, or across both so I can interpret the ranking honestly. [SOURCE: owner request 2026-07-25]
4. When I maintain the product, I want stale or incomplete popularity data to be visible so an old snapshot is never presented as current demand. [SOURCE: live read-only `icon_scores` query 2026-07-25]

## Goals

1. Produce one global popularity score that includes Web, Hosted MCP, and Local MCP/npm. [SOURCE: owner request 2026-07-25]
2. Rank All Icons using recent, privacy-safe evidence from all channels. [SOURCE: owner request 2026-07-25]
3. Distinguish confirmed icon use from result exposure. [SOURCE: mcp/telemetry.js] [SOURCE: mcp/remote-server.js]
4. Make the active sort and data freshness visible in the public interface. [SOURCE: live Supericons browser check 2026-07-25]
5. Keep the default ordering global and consistent for all users. Favorites and Recent remain personal. [SOURCE: owner request 2026-07-25] [SOURCE: main.js]
6. Prevent controlled tests, retries, and high-volume clients from distorting public popularity. [SOURCE: docs/si-v2/search/decisions.md]

## Non-Goals

1. Do not personalize the default All Icons ranking by user, account, country, or client. [SOURCE: owner request 2026-07-25]
2. Do not use popularity as the primary relevance signal for a typed search query in this phase. It may remain a tie-breaker after semantic relevance. [SOURCE: lib/icon-grid-behavior.js] [ASSUMPTION]
3. Do not call an AI model to calculate popularity. [SOURCE: docs/si-v2/search/decisions.md]
4. Do not store raw IP addresses, authorization headers, API keys, or personal search histories in the public score. [SOURCE: docs/supericons-mcp-usage-ledger-prd-2026-07-04.md]
5. Do not call passive search-result exposure “use,” “copy,” “download,” or “selection.” [ASSUMPTION]
6. Do not require a hosted MCP URL change, MCP tool-schema change, or ChatGPT app resubmission. [ASSUMPTION]
7. Do not require local telemetry from users who disable it. Coverage must be reported honestly. [SOURCE: mcp/telemetry.js]

## Current Evidence And Available Signals

### Web

The web application records icon-specific copy, download, and favorite evidence. Downloads are recorded as copy signals with a `download:` evidence marker, and the existing score weights downloads and favorites separately. [SOURCE: main.js] [SOURCE: lib/icon-intelligence.js] [SOURCE: supabase/migrations/20260418_icon_intelligence_popularity_refresh.sql]

Web search episodes currently record query and outcome counts but do not include the final ordered icon references in the episode payload. [SOURCE: lib/web-search-episode.js]

### Hosted MCP

Hosted MCP usage events record the returned icon references in `metadata.returned_icon_refs`, along with tool name, channel, traffic classification, package version, result count, and request identity fields. [SOURCE: mcp/remote-server.js]

The admin API already reads and validates those returned icon references for hosted MCP usage rows. [SOURCE: supabase/functions/admin-api/index.ts]

### Local npm MCP

The local npm MCP records one `mcp_call` evidence row per returned search result, including icon ID, query, result position, local MCP surface, and a session hash. It also records a separate search outcome. Users can disable this telemetry. [SOURCE: mcp/telemetry.js]

Local-first operations that do not call hosted search do not consistently provide one unified tool-outcome row for every tool and returned reference. [SOURCE: mcp/index.js] [SOURCE: mcp/telemetry.js]

## Proposed Popularity Model

### 1. Separate three evidence classes

#### A. Confirmed use

These actions strongly indicate that the icon was chosen or retrieved for use:

- Web copy
- Web download
- Web favorite
- MCP `get_icon` success for an exact icon reference
- A future explicit MCP selection or acceptance event

[SOURCE: lib/icon-intelligence.js] [SOURCE: mcp/remote-server.js] [ASSUMPTION]

#### B. Active consideration

These actions indicate meaningful interest but do not prove final use:

- Web icon detail or customize-panel open
- MCP `preview_icons` with explicit icon references
- An icon assigned to a requested `recommend_icons` slot

[ASSUMPTION]

#### C. Search exposure

These actions show that the engine returned the icon:

- Web search result appearance
- Hosted MCP `search_icons` result
- Local MCP `search_icons` result
- Recommendation alternatives that were returned but not selected

[SOURCE: mcp/telemetry.js] [SOURCE: mcp/remote-server.js] [ASSUMPTION]

Search exposure must have a much smaller influence than confirmed use because one request can return up to 50 icons. [SOURCE: mcp/index.js] [ASSUMPTION]

### 2. Proposed scoring

The exact weights must be calibrated against a replay of recent production data before activation. The initial candidate weights are assumptions, not ratified product facts. [ASSUMPTION]

| Signal | Candidate points | Reason |
| --- | ---: | --- |
| Download | 5.0 | Strongest evidence that the asset was taken for use. [ASSUMPTION] |
| Copy or successful exact `get_icon` | 4.0 | Strong evidence that SVG or icon data was taken for use. [ASSUMPTION] |
| Favorite | 3.0 | Intent to keep and reuse. [ASSUMPTION] |
| Explicit preview or recommendation assignment | 1.0 | Active consideration, not confirmed use. [ASSUMPTION] |
| Search result exposure | Up to 0.20 | Discovery evidence only, reduced by result position. [ASSUMPTION] |

For search exposure, the candidate formula is `0.20 / sqrt(result_position)`, counted once per icon per search episode and only for the first 20 results. [ASSUMPTION]

An icon receives a maximum 10 percent cross-channel diversity boost when it has confirmed or active-consideration evidence from at least two of Web, Hosted MCP, and Local MCP/npm during the score window. This rewards broad usefulness without allowing low-quality result exposure to dominate. [ASSUMPTION]

### 3. Time windows

- `popular_score_30d`: rolling 30-day weighted score. [SOURCE: existing `icon_scores` design]
- `trending_score_7d`: rolling 7-day weighted score with a minimum evidence threshold. [SOURCE: existing `icon_scores` design] [ASSUMPTION]
- `confirmed_use_30d`: unweighted confirmed-use count for explanation and auditing. [ASSUMPTION]
- `channel_count_30d`: number of contributing production channels. [ASSUMPTION]

### 4. Ranking order

The default Popular order should compare:

1. `popular_score_30d`
2. `trending_score_7d`
3. `confirmed_use_30d`
4. `channel_count_30d`
5. Stable icon name

[ASSUMPTION]

Search relevance remains first when a query is present. Popularity may break ties only after query relevance. [SOURCE: lib/icon-grid-behavior.js] [ASSUMPTION]

## Data Design

### Normalized event view

Create a server-side normalized source that maps existing evidence into a common shape. [ASSUMPTION]

| Field | Purpose |
| --- | --- |
| `source_event_id` | Stable source identity for deduplication. [ASSUMPTION] |
| `occurred_at` | Event time. [ASSUMPTION] |
| `icon_id` | Stable `library:id` reference. [SOURCE: current icon evidence and MCP metadata] |
| `style` | Outline, solid, or unknown when available. [ASSUMPTION] |
| `channel` | `web`, `hosted_mcp`, or `local_mcp`. [SOURCE: docs/supericons-admin-user-intelligence-dashboard-prd-2026-07-04.md] |
| `signal_class` | `confirmed_use`, `active_consideration`, or `search_exposure`. [ASSUMPTION] |
| `signal_type` | Copy, download, favorite, exact retrieval, preview, recommendation, or search result. [ASSUMPTION] |
| `result_position` | Rank when the icon came from a result list. [SOURCE: mcp/telemetry.js] |
| `episode_id` | Search or tool episode used for deduplication. [SOURCE: lib/web-search-episode.js] [SOURCE: mcp/remote-server.js] |
| `client_group_hash` | Privacy-safe group used for caps, when available. [SOURCE: docs/supericons-mcp-usage-ledger-prd-2026-07-04.md] |
| `traffic_class` | Production, controlled test, internal, or unknown. [SOURCE: docs/si-v2/search/decisions.md] |
| `source_version` | Web build, hosted deployment, or npm package version. [SOURCE: mcp/remote-server.js] [SOURCE: mcp/index.js] |

### Daily aggregate

Create `icon_popularity_daily` with one row per date, icon, channel, and signal type. Store event count, capped count, approximate distinct client groups, and weighted points. [ASSUMPTION]

Daily aggregation keeps the public ranking query small and makes source-by-source audits practical. [ASSUMPTION]

### Current public scores

Replace or evolve `icon_scores` so it exposes only public-safe aggregates:

- Icon ID
- Popular score for 30 days
- Trending score for 7 days
- Confirmed-use count for 30 days
- Copy count
- Download count
- Favorite count
- Hosted MCP activity count
- Local MCP activity count
- Web activity count
- Contributing channel count
- Calculated timestamp

[ASSUMPTION]

Do not expose client hashes, raw queries, private metadata, or detailed event history through the public score endpoint. [SOURCE: docs/supericons-mcp-usage-ledger-prd-2026-07-04.md]

## Functional Requirements

### FR-1: Cross-channel ingestion

The score builder must include eligible Web, Hosted MCP, and Local MCP/npm events. [SOURCE: owner request 2026-07-25]  
Maps to JTBD 2 and Goal 1.  
Acceptance signal: a fixture containing one eligible event from each channel contributes to the expected icon totals.

### FR-2: Evidence-class separation

The score builder must store and aggregate confirmed use, active consideration, and search exposure separately. [ASSUMPTION]  
Maps to JTBD 3 and Goal 3.  
Acceptance signal: reports can show confirmed-use counts without including passive result exposure.

### FR-3: Trusted traffic only

Controlled tests, internal traffic, malformed icon references, errors, and zero-result events must not affect public popularity. [SOURCE: docs/si-v2/search/decisions.md]  
Maps to Goal 6 and risk mitigation.  
Acceptance signal: adding controlled or failed fixtures produces no score change.

### FR-4: Deduplication and abuse caps

The score builder must deduplicate by source event and count an exposed icon at most once per episode. It must apply privacy-safe per-client or per-session caps before aggregation. [ASSUMPTION]  
Maps to Goal 6 and risk mitigation.  
Acceptance signal: retry and repeated-result fixtures cannot multiply an icon score.

### FR-5: Honest local npm coverage

Local MCP events must be included when telemetry exists, and coverage must be reported as partial because users may disable telemetry. [SOURCE: mcp/telemetry.js]  
Maps to JTBD 3 and Goal 1.  
Acceptance signal: the admin view shows Local MCP event coverage and does not claim complete local usage.

### FR-6: Fresh recurring scores

The score refresh must run automatically, publish `calculated_at`, and alert when the latest successful score is stale. [SOURCE: live read-only `icon_scores` query 2026-07-25]  
Maps to JTBD 4 and Goal 4.  
Acceptance signal: a failed scheduled refresh is visible to the operator and the public UI does not silently present the stale order as current.

### FR-7: Visible All Icons sorting

All Icons must show a sort control with `Popular`, `Trending`, and `A-Z`. The active sort must be visible. [ASSUMPTION]  
Maps to JTBD 1 and Goals 2 and 4.  
Acceptance signal: a user can identify and change the active order without documentation.

### FR-8: Global consistency

The Popular and Trending orders must be the same for all users viewing the same score version. Local copy, download, or favorite actions must not privately reorder the global list before the next server refresh. [SOURCE: owner request 2026-07-25]  
Maps to JTBD 1 and Goal 5.  
Acceptance signal: two clean browser sessions receive the same ordered first page and score timestamp.

### FR-9: Popular section

The default All Icons screen should show a labeled `Popular across Supericons` row containing the first 12 to 24 globally ranked icons, followed by the full grid in the selected order. [ASSUMPTION]  
Maps to JTBD 1 and Goals 2 and 4.  
Acceptance signal: users can tell that the first row is based on cross-channel activity.

### FR-10: Explainability

Each popular icon should be able to display a short public-safe reason such as `Popular on web`, `Popular with agents`, `Trending this week`, or `Used across channels`. [ASSUMPTION]  
Maps to JTBD 3 and Goal 4.  
Acceptance signal: labels are derived only from aggregate fields and never expose a person or raw query.

### FR-11: No search-quality regression

The change must not alter query matching, zero-result behavior, or the maintained Search v2 result fingerprints except where popularity already acts as an approved tie-breaker. [SOURCE: docs/si-v2/search/implementation-status.md]  
Maps to Non-Goal 2 and risk mitigation.  
Acceptance signal: maintained search fixtures and fixed fingerprints remain green.

### FR-12: Public-safe delivery

The public score response must contain aggregates only and remain bounded, cacheable, and independent of authenticated admin APIs. [SOURCE: lib/icon-intelligence.js] [ASSUMPTION]  
Maps to Goal 2 and privacy risk mitigation.  
Acceptance signal: a public payload inspection finds no raw identity, raw query, secret, or event-level data.

## Public Interface Proposal

### Default All Icons

1. Heading: `All Icons`
2. Sort: `Popular`
3. Labeled row: `Popular across Supericons`
4. Optional supporting text: `Based on recent use across the website and supported agent tools.`
5. Full icon grid below

[ASSUMPTION]

### Sort options

- Popular
- Trending
- Most copied
- Most downloaded
- Popular with agents
- A-Z

[ASSUMPTION]

`Most searched` should not be used as a label unless the product explicitly means `Most shown in search results`. The preferred user-facing label is `Popular with agents` for combined hosted and local MCP evidence. [ASSUMPTION]

## Constraints

1. Hosted MCP has stronger server-side identity and event coverage than local npm MCP. [SOURCE: mcp/remote-server.js] [SOURCE: mcp/telemetry.js]
2. Local npm telemetry is best-effort and can be disabled. [SOURCE: mcp/telemetry.js]
3. Web search episodes do not yet carry final returned icon references, so web result exposure needs an instrumentation change or must initially rely on server-side returned-reference evidence. [SOURCE: lib/web-search-episode.js]
4. Existing icon scores use `library:id` and do not consistently separate style variants. [SOURCE: supabase/migrations/20260418_icon_intelligence_popularity_refresh.sql]
5. Updating hosted aggregation and the public website does not require an MCP client configuration change. Improving local-only telemetry requires a future immutable npm release. [ASSUMPTION]

## Success Metrics

### Primary

- At least 95 percent of public score refreshes complete before the freshness limit during the first 30 days. [ASSUMPTION]
- At least 90 percent of icons in the visible Popular row have confirmed-use evidence, not exposure-only evidence. [ASSUMPTION]
- The Popular order is identical across two clean public sessions using the same score version. [ASSUMPTION]

### Supporting

- Percentage of top 24 icons with evidence from at least two channels. [ASSUMPTION]
- Percentage of eligible Hosted MCP events with returned icon references. [SOURCE: mcp/remote-server.js]
- Percentage of eligible Local MCP result events accepted into aggregation. [SOURCE: mcp/telemetry.js]
- Copy or download rate from the Popular row compared with the previous unlabeled default grid. [ASSUMPTION]

### Guardrails

- No increase in search zero-result or error rates attributable to the change. [SOURCE: docs/si-v2/search/implementation-status.md]
- Public popularity fetch p95 adds no more than 100 milliseconds to page readiness when uncached. [ASSUMPTION]
- Controlled and internal traffic contributes zero public score. [SOURCE: docs/si-v2/search/decisions.md]
- No raw identifiers or queries appear in the public score payload. [SOURCE: docs/supericons-mcp-usage-ledger-prd-2026-07-04.md]

## Risks And Dependencies

### Feedback loops

Icons shown first receive more exposure and can become permanently dominant. Mitigation: confirmed use outweighs exposure, exposure is position-decayed and capped, and search relevance remains primary. [ASSUMPTION]

### Hosted MCP volume dominates

Hosted MCP may produce more events than web or local npm. Mitigation: count confirmed actions strongly, cap passive exposures, retain per-channel breakdowns, and limit the cross-channel boost. [ASSUMPTION]

### Local npm undercount

Telemetry opt-out and offline use mean Local MCP totals are incomplete. Mitigation: label coverage as partial and never estimate missing events as facts. [SOURCE: mcp/telemetry.js]

### Automated or controlled traffic

Release tests and repeated agent retries can inflate results. Mitigation: require trusted production classification, deduplicate episodes, and exclude controlled traffic. [SOURCE: docs/si-v2/search/decisions.md]

### Stale rankings

A failed scheduled job can leave an old order live for months. Mitigation: publish freshness, alert on stale refreshes, and switch to a clearly labeled stable fallback order when freshness exceeds the accepted limit. [SOURCE: live read-only `icon_scores` query 2026-07-25] [ASSUMPTION]

### Misleading labels

Calling result exposure “use” would overstate demand. Mitigation: keep evidence classes separate and use precise labels. [ASSUMPTION]

## Rollout Plan

### Phase 1: Restore trustworthy current popularity

1. Diagnose and repair the existing score refresh.
2. Rebuild current web action scores.
3. Add freshness monitoring.
4. Remove immediate private reordering of the global list.

[SOURCE: live read-only `icon_scores` query 2026-07-25] [ASSUMPTION]

### Phase 2: Cross-channel aggregation

1. Normalize existing Web, Hosted MCP, and Local MCP evidence.
2. Add deduplication, traffic filtering, and client caps.
3. Replay a recent fixed window with candidate weights.
4. Review the top icons and channel distribution before activation.

[ASSUMPTION]

### Phase 3: Public UI

1. Add visible sort controls.
2. Add the Popular across Supericons row.
3. Add aggregate explanation labels.
4. Verify identical ordering across clean sessions.

[ASSUMPTION]

### Phase 4: Better local and web evidence

1. Add final returned icon references to eligible web search episodes.
2. Add unified local npm tool-outcome evidence for exact retrieval, preview, and recommendation.
3. Publish a new npm version only if the local telemetry change is approved and needed.

[ASSUMPTION]

## Open Questions

1. Should `Popular` remain the default All Icons order, or should users retain their last explicit sort choice? [ASSUMPTION]
2. Should the public Popular row contain 12, 18, or 24 icons? [ASSUMPTION]
3. Should passive search exposure influence public popularity at all, or should Phase 1 launch using confirmed use and active consideration only? [ASSUMPTION]
4. What freshness limit should trigger the visible fallback: 2 hours, 6 hours, or 24 hours? [ASSUMPTION]
5. Should repeated confirmed use by the same client continue to count after a daily cap? [ASSUMPTION]
6. Should style variants share one popularity score or have separate outline and solid scores? [ASSUMPTION]
7. Is a new npm release justified for fuller Local MCP evidence, or is existing best-effort result telemetry sufficient for the first cross-channel version? [ASSUMPTION]

## Recommended Decisions

The proposed starting position is:

1. Default All Icons to `Popular`.
2. Launch the first cross-channel score using confirmed use and active consideration only.
3. Keep passive search exposure visible in admin analysis but out of public scoring until its effect is reviewed.
4. Use 18 icons in the Popular row.
5. Refresh scores hourly and mark them stale after 6 hours.
6. Keep one global score per `library:id`, with style handled by the active style view.
7. Use existing Local MCP telemetry for the first release and defer an npm instrumentation release until evidence shows that missing local actions materially affect ranking.

[ASSUMPTION]
