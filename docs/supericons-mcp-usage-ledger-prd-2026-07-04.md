# Supericons MCP Usage Ledger PRD

Status: Draft  
Owner: Curly Mole Labs  
Date: 2026-07-04  
Scope: Product analytics for MCP and agent usage only

## Problem

Supericons needs a reliable way to understand non-registered MCP usage, including what people and agents search for, whether searches succeed, which clients are being used, and whether usage comes from hosted MCP, local MCP, CLI, API-like flows, or the web. [SOURCE: user request 2026-07-04]

Umami should remain separate from this feature because Umami is currently used for web traffic and browser-side events, while MCP traffic is server-to-server or local-tool traffic that does not naturally appear as browser pageviews. [SOURCE: main.js] [SOURCE: mcp/remote-server.js] [SOURCE: user request 2026-07-04]

The existing hosted search handler already records query-level audit data into `search_request_audit`, including normalized query, source, result count, status, latency, session hash, IP hash, country code, geo source, user id, registered status, account plan, subscription status, and pro status when available. [SOURCE: supabase/functions/_shared/search-engine/handle-search-request.ts]

The existing hosted MCP client sends hosted search requests with `source: 'mcp'`, which gives the backend a useful but incomplete source tag. [SOURCE: mcp/hosted-search-client.js]

The existing local MCP package logs `search_attempt` and `mcp_call` signals through MCP telemetry, but that data is not yet organized as a dedicated usage ledger with client family, channel, anonymous-client counting, and dashboard-ready aggregates. [SOURCE: mcp/index.js] [SOURCE: mcp/telemetry.js]

## Target User

Primary user: the Supericons operator who needs to decide what icons, aliases, docs, MCP integrations, and product improvements to build next. [SOURCE: user request 2026-07-04]

Secondary user: a future Supericons business or partnership reviewer who asks how many people use the MCP server, which clients they use, and what they search for. [SOURCE: user request 2026-07-04]

## Goals

1. Count anonymous MCP usage in a way that is useful, honest, and does not require users to register. [SOURCE: user request 2026-07-04]
2. Separate web traffic analytics from product and MCP usage analytics. [SOURCE: user request 2026-07-04]
3. Show real search demand by channel, client family, country, locale, query, result quality, and user segment when available. [SOURCE: user request 2026-07-04]
4. Preserve the current fast, no-friction MCP experience while adding better server-side observability. [SOURCE: mcp/remote-server.js] [ASSUMPTION]
5. Keep monetization out of this phase so the product can first collect trustworthy usage evidence. [SOURCE: user request 2026-07-04]

## Non-Goals

1. Do not send MCP usage events to Umami in this phase. [SOURCE: user request 2026-07-04]
2. Do not replace Umami as the web traffic analytics product. [SOURCE: user request 2026-07-04]
3. Do not implement affiliate links, sponsored results, paid placements, quotas, or pricing changes in this phase. [SOURCE: user request 2026-07-04]
4. Do not identify anonymous users as named people unless they authenticate through a supported Supericons account or API key flow. [ASSUMPTION]
5. Do not store raw IP addresses, raw auth tokens, service role keys, API keys, or raw authorization headers. [SOURCE: supabase/functions/_shared/search-engine/rate-limit.ts] [ASSUMPTION]
6. Do not build a complicated analytics suite with red-tape workflows. The admin dashboard should stay practical and decision-focused. [SOURCE: user request 2026-07-04]

## Current Architecture

The hosted search path writes successful and failed searches into `search_request_audit`. [SOURCE: supabase/functions/_shared/search-engine/handle-search-request.ts]

The `search_request_audit` schema already includes `query_norm`, `source`, `library_filter`, `result_count`, `status`, `latency_ms`, `session_hash`, `ip_hash`, and `created_at`. [SOURCE: supabase/migrations/20260418_hosted_search_engine_schema.sql]

The `search_request_audit` schema has been extended with `country_code`, `geo_source`, `user_id`, `is_registered`, `account_plan`, `subscription_status`, and `is_pro`. [SOURCE: supabase/migrations/20260612_search_audit_geo_account_fields.sql]

The rate-limit and audit identity helper hashes the client IP and reads trusted country headers instead of storing a raw IP address. [SOURCE: supabase/functions/_shared/search-engine/rate-limit.ts]

The hosted MCP server exposes `/mcp` as the Streamable HTTP MCP endpoint and `/preview-icons.png` as the direct PNG preview endpoint. [SOURCE: mcp/remote-server.js]

The web app uses Umami browser events for web-side actions such as icon copy, icon download, search, and contact submit. [SOURCE: main.js]

The local admin dashboard includes Umami CSV import controls, which are separate from hosted MCP telemetry. [SOURCE: public/admin-app.js] [SOURCE: admin.html]

## Jobs To Be Done

1. When an anonymous agent uses Supericons MCP, I want to count that usage without requiring signup, so I can understand real adoption. [SOURCE: user request 2026-07-04]
2. When an MCP search fails or returns weak results, I want to see the query, channel, client family, country, locale, and result count, so I can improve icons, aliases, or ranking. [SOURCE: user request 2026-07-04]
3. When someone asks how many users use Supericons, I want to show honest numbers for web visitors, registered users, pro users, anonymous MCP clients, and MCP tool events without mixing those categories. [SOURCE: user request 2026-07-04]
4. When a new MCP client or directory sends traffic, I want to see whether it came from hosted MCP, local MCP, CLI, API-like usage, or web, so I can support the right integration first. [SOURCE: user request 2026-07-04]
5. When a registered or pro user searches through a supported authenticated path, I want their searches to be grouped under their account segment, so I can understand if pro users get enough value. [SOURCE: supabase/functions/_shared/search-engine/handle-search-request.ts] [ASSUMPTION]

## Scope

### In Scope

1. Add a Supericons-owned MCP usage ledger for hosted MCP, local MCP, CLI, API-like flows, and future agent clients. [SOURCE: mcp/remote-server.js] [SOURCE: mcp/telemetry.js] [ASSUMPTION]
2. Enrich hosted MCP events with channel, client family, tool name, result count, country code, locale, account segment, and anonymous-client hash when available. [SOURCE: supabase/functions/_shared/search-engine/handle-search-request.ts] [SOURCE: supabase/functions/_shared/search-engine/rate-limit.ts] [ASSUMPTION]
3. Keep `search_request_audit` as the search-quality ledger and add a companion event table for MCP tool usage that is not always a search. [SOURCE: supabase/migrations/20260418_hosted_search_engine_schema.sql] [ASSUMPTION]
4. Update the local admin dashboard to show MCP usage as a first-class section instead of hiding it behind query filters. [SOURCE: public/admin-app.js] [SOURCE: admin.html] [ASSUMPTION]
5. Add admin metrics for anonymous MCP clients, MCP tool events, MCP search success rate, zero-result MCP searches, low-result MCP searches, client family, country, locale, and account segment. [SOURCE: user request 2026-07-04] [ASSUMPTION]
6. Add a QA export that can support public-safe claims such as "MCP tool events in last 30 days" and "anonymous MCP client groups in last 30 days." [SOURCE: user request 2026-07-04] [ASSUMPTION]

### Out of Scope

1. Sending MCP events to Umami. [SOURCE: user request 2026-07-04]
2. Umami API sync or Umami CSV import improvements. [SOURCE: user request 2026-07-04]
3. Monetization, affiliate programs, sponsored placements, or paid MCP quotas. [SOURCE: user request 2026-07-04]
4. Session replay or heatmaps. [SOURCE: user request 2026-07-04]
5. Raw IP, raw user-agent, raw authorization, raw API key, or raw token storage. [ASSUMPTION]

## Proposed Data Model

### Extend `search_request_audit`

Add optional columns that improve search rows without breaking existing inserts. [ASSUMPTION]

| Column | Purpose | Source |
| --- | --- | --- |
| `channel` | Normalized interface: `web`, `hosted_mcp`, `local_mcp`, `cli`, `api`, `internal_test`, `unknown`. | [ASSUMPTION] |
| `client_family` | Normalized client family such as `claude_desktop`, `smithery`, `chatgpt`, `cursor`, `codex`, `opencode`, `local_npm`, or `unknown`. | [ASSUMPTION] |
| `tool_name` | MCP tool or search surface such as `search_icons`, `preview_icons`, `recommend_icons`, `get_icon`, or `web_search`. | [ASSUMPTION] |
| `locale` | Request locale when provided. | [SOURCE: supabase/functions/_shared/search-engine/handle-search-request.ts] |
| `anonymous_client_hash` | Rotating hash for approximate distinct anonymous client groups. | [ASSUMPTION] |
| `user_agent_hash` | Hash of user-agent string, if available, without storing the raw value. | [ASSUMPTION] |
| `api_key_hash` | Hash of a Supericons API key, if provided, without storing the raw key. | [SOURCE: mcp/hosted-search-client.js] [ASSUMPTION] |
| `mcp_server_version` | Hosted or package MCP version at request time. | [SOURCE: mcp/remote-server.js] [ASSUMPTION] |

### Add `mcp_usage_events`

Create a companion event table for MCP calls that are not fully represented by search rows. [ASSUMPTION]

| Column | Purpose | Source |
| --- | --- | --- |
| `id` | Event id. | [ASSUMPTION] |
| `event_id` | Stable event id generated by the server for idempotency and debugging. | [ASSUMPTION] |
| `request_id` | Per-request id used to connect a hosted MCP request, tool call, and search audit row without storing raw headers. | [ASSUMPTION] |
| `dedupe_key` | Optional hash used to prevent retry storms from being counted as many separate user actions. | [ASSUMPTION] |
| `created_at` | Event timestamp. | [ASSUMPTION] |
| `event_type` | `tool_call`, `tool_error`, `preview_image`, `search`, `recommend`, `get_icon`, `list_libraries`. | [ASSUMPTION] |
| `channel` | Hosted MCP, local MCP, CLI, API-like, web, or internal test. | [ASSUMPTION] |
| `environment` | Production, preview, local, test, or unclassified. | [ASSUMPTION] |
| `client_family` | Normalized client family. | [ASSUMPTION] |
| `tool_name` | MCP tool name. | [SOURCE: mcp/remote-server.js] |
| `query_norm` | Normalized query when the tool has a query. | [SOURCE: supabase/functions/_shared/search-engine/handle-search-request.ts] |
| `library_filter` | Requested library filter when available. | [SOURCE: supabase/functions/_shared/search-engine/handle-search-request.ts] |
| `result_count` | Number of returned results when available. | [SOURCE: supabase/functions/_shared/search-engine/handle-search-request.ts] |
| `status` | `ok`, `error`, `rate_limited`, or `fallback`. | [SOURCE: supabase/functions/_shared/search-engine/handle-search-request.ts] [ASSUMPTION] |
| `latency_ms` | Request or tool latency. | [SOURCE: supabase/functions/_shared/search-engine/handle-search-request.ts] |
| `country_code` | Trusted two-letter country when available. | [SOURCE: supabase/functions/_shared/search-engine/rate-limit.ts] |
| `geo_source` | Trusted infra source for country code. | [SOURCE: supabase/functions/_shared/search-engine/rate-limit.ts] |
| `locale` | Requested locale when available. | [SOURCE: mcp/hosted-search-client.js] |
| `anonymous_client_hash` | Rotating anonymous-client group hash. | [ASSUMPTION] |
| `session_hash` | Existing Supericons session hash when available. | [SOURCE: supabase/functions/_shared/search-engine/rate-limit.ts] |
| `ip_hash` | Existing IP hash when available. | [SOURCE: supabase/functions/_shared/search-engine/rate-limit.ts] |
| `user_id` | Supabase user id when authenticated. | [SOURCE: supabase/functions/_shared/search-engine/handle-search-request.ts] |
| `is_registered` | Whether the request resolved to a registered user. | [SOURCE: supabase/migrations/20260612_search_audit_geo_account_fields.sql] |
| `is_pro` | Whether the request resolved to an active pro subscription. | [SOURCE: supabase/migrations/20260612_search_audit_geo_account_fields.sql] |
| `account_plan` | Account plan when available. | [SOURCE: supabase/migrations/20260612_search_audit_geo_account_fields.sql] |
| `search_request_audit_id` | Optional link back to the search audit row for search events. | [ASSUMPTION] |

## Anonymous Client Counting

Anonymous client counts must be labeled as approximate client groups, not exact people. [ASSUMPTION]

The dashboard should display `anonymous MCP client groups` rather than `anonymous users` unless the row is linked to a signed-in account. [ASSUMPTION]

The anonymous-client hash should be computed from stable request signals that are already available at the server, such as IP hash, user-agent hash, client family, and a rotating time bucket. [SOURCE: supabase/functions/_shared/search-engine/rate-limit.ts] [ASSUMPTION]

The time bucket should rotate monthly for trend reporting unless a shorter retention or privacy setting is chosen later. [ASSUMPTION]

The ledger should not store raw IP addresses, raw user agents, or raw auth headers. [SOURCE: supabase/functions/_shared/search-engine/rate-limit.ts] [ASSUMPTION]

## Functional Requirements

FR1. The hosted MCP server must log one `mcp_usage_events` row for each MCP tool call, including tool name, channel, environment, client family, status, latency, and account segment when available. [SOURCE: mcp/remote-server.js] [ASSUMPTION]  
Maps to JTBD 1, 3, and 4.

FR2. Hosted MCP `search_icons` and `preview_icons` search paths must keep writing search-quality rows to `search_request_audit` and must add normalized channel/client fields when available. [SOURCE: supabase/functions/_shared/search-engine/handle-search-request.ts] [SOURCE: mcp/hosted-search-client.js] [ASSUMPTION]  
Maps to JTBD 2 and 4.

FR3. Local MCP telemetry must either write into the new usage ledger or provide enough fields for the admin API to normalize it into the same dashboard categories. [SOURCE: mcp/telemetry.js] [ASSUMPTION]  
Maps to JTBD 1 and 4.

FR4. The admin API must expose MCP usage aggregates for time range, channel, client family, country, locale, account segment, tool name, result quality, and status. [SOURCE: public/admin-app.js] [SOURCE: supabase/functions/admin-api/index.ts] [ASSUMPTION]  
Maps to JTBD 1, 2, 3, and 4.

FR5. The admin dashboard must show a dedicated MCP Usage section with at least these cards: anonymous MCP client groups, MCP tool events, MCP searches, MCP zero-result searches, MCP low-result searches, top client families, top countries, and top queries. [SOURCE: user request 2026-07-04] [ASSUMPTION]  
Maps to JTBD 1, 2, and 3.

FR6. The dashboard must keep Web, Hosted MCP, Local MCP, CLI, API, Internal/Test, and Unclassified as separate channels. [SOURCE: admin.html] [SOURCE: public/admin-app.js] [ASSUMPTION]  
Maps to JTBD 4.

FR7. The dashboard must show registered and pro user segments when a request can be linked to Supabase Auth or a trusted API-key/account flow. [SOURCE: supabase/functions/_shared/search-engine/handle-search-request.ts] [SOURCE: supabase/migrations/20260612_search_audit_geo_account_fields.sql] [ASSUMPTION]  
Maps to JTBD 3 and 5.

FR8. The dashboard must avoid presenting anonymous client groups as exact people. [ASSUMPTION]  
Maps to JTBD 3 and risk mitigation.

FR9. The ledger must provide exportable summaries for founder-facing reporting, including time range, channel, client family, approximate client groups, tool events, search count, and success/zero-result counts. [SOURCE: user request 2026-07-04] [ASSUMPTION]  
Maps to JTBD 3.

FR10. The implementation must not send MCP events to Umami. [SOURCE: user request 2026-07-04]  
Maps to non-goal 1.

FR11. Usage writes must happen server-side only through trusted hosted services or locked-down RPC paths. Public clients must not be able to insert arbitrary `mcp_usage_events` rows directly. [ASSUMPTION]  
Maps to risk mitigation and data integrity.

FR12. MCP retry behavior must be handled explicitly. Repeated retries from the same request should either be deduped by `request_id` or labeled as retry events so founder-facing usage numbers are not inflated. [ASSUMPTION]  
Maps to JTBD 3 and risk mitigation.

FR13. The dashboard must show attribution quality instead of hiding uncertainty. It should expose counts for `Known hosted MCP`, `Known local MCP`, `Known web`, and `Unclassified`, with short labels explaining why rows are unclassified. [SOURCE: user request 2026-07-04] [ASSUMPTION]  
Maps to JTBD 4 and the filter-confusion problem.

FR14. Local MCP telemetry expansion must remain non-blocking and must have a documented opt-out before additional local telemetry fields are enabled. [SOURCE: mcp/telemetry.js] [ASSUMPTION]  
Maps to JTBD 1 and no-friction usage.

FR15. Founder-facing totals must not combine registered users, web visitors, anonymous MCP client groups, and raw tool events into one `users` number. These are separate metrics with separate labels. [SOURCE: user request 2026-07-04] [ASSUMPTION]  
Maps to JTBD 3.

## Dashboard UX Requirements

1. Add a top-level `MCP Usage` panel inside Icon Intelligence or as a sibling under Management. [ASSUMPTION]
2. Make the panel answer: who used MCP, through what client, from where, for what query, with what result quality. [SOURCE: user request 2026-07-04]
3. Use plain labels:
   - `Anonymous MCP client groups`
   - `Registered MCP users`
   - `Pro MCP users`
   - `Hosted MCP`
   - `Local MCP`
   - `Client family`
   - `Search quality`
   [SOURCE: user request 2026-07-04] [ASSUMPTION]
4. Put query-level investigation in the Query Explorer and put aggregate adoption metrics above it. [SOURCE: public/admin-app.js] [ASSUMPTION]
5. Keep raw/debug signal sections collapsed by default so the operator can focus on useful queries and user patterns. [SOURCE: user request 2026-07-04]
6. Show an `Attribution Health` strip near the filters so the operator can see how much data is classified versus unclassified before trusting a filtered view. [SOURCE: user request 2026-07-04] [ASSUMPTION]

## Reporting Definitions

`MCP tool event`: one logged MCP tool invocation, such as `search_icons`, `preview_icons`, `recommend_icons`, `get_icon`, or `list_libraries`. [SOURCE: mcp/remote-server.js]

`MCP search`: one MCP tool event that performs a search or produces search-like results. [SOURCE: mcp/hosted-search-client.js] [ASSUMPTION]

`Anonymous MCP client group`: an approximate count of non-registered client groups based on hashed and rotated request signals. [ASSUMPTION]

`Registered MCP user`: a MCP request linked to a Supabase Auth user id. [SOURCE: supabase/functions/_shared/search-engine/handle-search-request.ts]

`Pro MCP user`: a MCP request linked to an active pro subscription state at request time. [SOURCE: supabase/functions/_shared/search-engine/handle-search-request.ts] [SOURCE: supabase/migrations/20260612_search_audit_geo_account_fields.sql]

`Zero-result search`: a search with result count equal to zero. [SOURCE: supabase/functions/_shared/search-engine/handle-search-request.ts]

`Low-result search`: a search with one to three results unless a different threshold is selected later. [ASSUMPTION]

## Success Metrics

1. The admin dashboard can show hosted MCP searches separately from web searches for the selected time range. [SOURCE: user request 2026-07-04]
2. The admin dashboard can show approximate anonymous MCP client groups for a selected time range. [ASSUMPTION]
3. The admin dashboard can show top MCP client families for hosted MCP usage. [ASSUMPTION]
4. The admin dashboard can show top MCP zero-result and low-result searches. [SOURCE: user request 2026-07-04]
5. The admin dashboard can show registered/pro counts for MCP usage when account data is available. [SOURCE: supabase/functions/_shared/search-engine/handle-search-request.ts]
6. MCP usage reporting can be exported without raw IPs, raw user agents, raw tokens, or raw API keys. [ASSUMPTION]

## Risks

1. Anonymous client counting can overcount or undercount people because one person can use multiple clients and one network can represent multiple people. [ASSUMPTION]
2. Client-family detection can be incomplete if upstream MCP clients do not provide clear headers or user-agent strings. [ASSUMPTION]
3. Local MCP telemetry may not have the same request headers as hosted MCP, so hosted and local attribution quality may differ. [SOURCE: mcp/telemetry.js] [ASSUMPTION]
4. Free-text search queries can contain sensitive project or business terms, so exports should be admin-only and not public by default. [ASSUMPTION]
5. Adding too many dashboard controls can recreate the current confusion, so MVP reporting should prefer a small set of useful filters. [SOURCE: user request 2026-07-04]
6. MCP clients and gateways can retry tool calls, so naive event counts can overstate usage unless retries are deduped or clearly labeled. [ASSUMPTION]
7. A large `unknown` bucket can become useless if the dashboard does not explain which fields were missing and what code path produced the row. [SOURCE: user request 2026-07-04] [ASSUMPTION]

## Implementation Plan

### Phase 1: Schema and Event Contract

1. Add optional normalized attribution columns to `search_request_audit`. [ASSUMPTION]
2. Add `mcp_usage_events` as a companion table for MCP tool calls. [ASSUMPTION]
3. Add `event_id`, `request_id`, and `dedupe_key` to support idempotent MCP event capture. [ASSUMPTION]
4. Add indexes for `created_at`, `channel`, `client_family`, `tool_name`, `country_code`, `anonymous_client_hash`, and `user_id`. [ASSUMPTION]
5. Add public-safe comments explaining that anonymous client groups are approximate. [ASSUMPTION]
6. Add migration checks that confirm existing `search_request_audit` inserts still work without the new optional fields. [ASSUMPTION]

### Phase 2: Hosted MCP Instrumentation

1. Create a request-context helper in `mcp/remote-server.js` that derives channel, environment, client family, package/server version, and anonymous-client hash without storing raw IP or raw user-agent. [SOURCE: mcp/remote-server.js] [ASSUMPTION]
2. Pass the request context into MCP tool handlers. [SOURCE: mcp/remote-server.js] [ASSUMPTION]
3. Log tool calls and tool errors into `mcp_usage_events`. [ASSUMPTION]
4. Add normalized context headers or body fields when hosted MCP calls the hosted search function. [SOURCE: mcp/hosted-search-client.js] [ASSUMPTION]
5. Update the hosted search function to persist normalized context into `search_request_audit`. [SOURCE: supabase/functions/_shared/search-engine/handle-search-request.ts] [ASSUMPTION]
6. Verify that the hosted MCP request path does not emit browser analytics or Umami events. [SOURCE: mcp/remote-server.js] [SOURCE: main.js] [ASSUMPTION]

### Phase 3: Local MCP and CLI Attribution

1. Extend local MCP telemetry to include package version, tool name, channel `local_mcp`, result count, locale, and anonymous process/session grouping. [SOURCE: mcp/telemetry.js] [SOURCE: mcp/index.js] [ASSUMPTION]
2. Preserve the existing no-blocking behavior where telemetry failures do not break icon search. [SOURCE: mcp/telemetry.js]
3. Add a documented opt-out environment variable for local package telemetry if one is not already present. [ASSUMPTION]

### Phase 4: Admin API and Dashboard

1. Add admin API endpoints or extend existing Icon Intelligence endpoints to return MCP usage aggregates. [SOURCE: supabase/functions/admin-api/index.ts] [ASSUMPTION]
2. Add a dedicated MCP Usage panel with the metrics listed in this PRD. [SOURCE: public/admin-app.js] [ASSUMPTION]
3. Update Query Explorer filters so MCP usage rows can be filtered by hosted MCP, local MCP, client family, country, locale, account segment, result quality, and time range. [SOURCE: public/admin-app.js] [ASSUMPTION]
4. Add export buttons for JSON and CSV summaries that use the new reporting definitions. [SOURCE: public/admin-app.js] [ASSUMPTION]
5. Add an attribution explanation for `Unclassified` rows, such as missing channel, missing client family, legacy row, or old event shape. [SOURCE: user request 2026-07-04] [ASSUMPTION]

### Phase 5: QA and Release

1. Add unit checks for source/channel/client-family normalization. [ASSUMPTION]
2. Add browser-level admin tests for MCP Usage filters. [SOURCE: scripts/verify-admin-query-workbench-browser.mjs] [ASSUMPTION]
3. Add a hosted MCP smoke test that calls `search_icons`, `preview_icons`, and `list_libraries`, then verifies new ledger rows appear. [SOURCE: mcp/remote-server.js] [ASSUMPTION]
4. Add a local MCP smoke test that verifies local package telemetry still logs search attempts without blocking responses. [SOURCE: mcp/index.js] [SOURCE: mcp/telemetry.js] [ASSUMPTION]
5. Add a retry/idempotency smoke test that repeats the same request id and verifies the public usage summary is not inflated. [ASSUMPTION]
6. Add a no-Umami smoke test for hosted MCP paths by checking that MCP server code and hosted search requests do not call `window.umami` or emit Umami payloads. [SOURCE: mcp/remote-server.js] [SOURCE: main.js] [ASSUMPTION]

## Acceptance Criteria

1. Hosted MCP searches appear under `Hosted MCP`, not `Unclassified`, in the admin dashboard. [SOURCE: user request 2026-07-04]
2. Hosted MCP tool calls can be counted even when the user is not registered. [ASSUMPTION]
3. Anonymous MCP usage is labeled as approximate client groups, not exact people. [ASSUMPTION]
4. Registered and pro MCP usage is shown when account data is available. [SOURCE: supabase/functions/_shared/search-engine/handle-search-request.ts]
5. MCP usage data is not sent to Umami. [SOURCE: user request 2026-07-04]
6. Raw IP addresses, raw user agents, raw auth headers, raw API keys, and raw tokens are not stored in the new ledger. [ASSUMPTION]
7. The admin dashboard can answer: top MCP queries, zero-result MCP queries, low-result MCP queries, top client families, top countries, top locales, and anonymous client groups for the selected time range. [SOURCE: user request 2026-07-04]
8. The feature ships without changing the public icon search UX. [ASSUMPTION]
9. Unclassified rows are visible with a reason, not silently mixed into known Hosted MCP, Local MCP, Web, CLI, or API counts. [SOURCE: user request 2026-07-04] [ASSUMPTION]
10. Repeated MCP retries are deduped or labeled so founder-facing summaries do not overstate real usage. [ASSUMPTION]
11. Local MCP telemetry changes are documented, non-blocking, and opt-out capable before release. [SOURCE: mcp/telemetry.js] [ASSUMPTION]

## Open Questions

1. Should anonymous-client hashes rotate daily, weekly, or monthly for the first release? [ASSUMPTION]
2. Which client-family labels should be supported first: Claude Desktop, Smithery, ChatGPT, Cursor, Codex, OpenCode, local npm, and unknown? [ASSUMPTION]
3. Should local MCP telemetry have an explicit opt-out before new fields are added? [ASSUMPTION]
4. Should `mcp_usage_events` be MCP-only, or should it become a broader `usage_events` table for web, MCP, CLI, and API flows later? [ASSUMPTION]
5. How long should raw query text be retained in admin-only telemetry? [ASSUMPTION]
6. Should future API keys be used to link anonymous MCP usage to an account or workspace? [ASSUMPTION]
7. What should the first retention policy be for detailed MCP event rows: 90 days, 180 days, or 365 days? [ASSUMPTION]
8. Should historical `source: mcp` rows be reclassified through a view only, or should a one-time backfill update old rows with `hosted_mcp` where confidence is high? [ASSUMPTION]
9. What secret or salt source should generate rotating anonymous-client hashes in production, and how should local development use a non-secret fallback? [ASSUMPTION]

## Socratic QA Pass

Question: If someone asks "how many users use Supericons MCP," what number would be honest?  
Answer: Use separate numbers: registered MCP users, pro MCP users, anonymous MCP client groups, MCP searches, and MCP tool events. Do not merge them into one user count. [SOURCE: user request 2026-07-04] [ASSUMPTION]

Question: What would make the dashboard misleading even if events are being captured?  
Answer: Retry storms, unclassified rows, and mixed channel labels would make the numbers look better or worse than reality. The PRD now requires dedupe fields, unclassified reasons, and separate channel labels. [ASSUMPTION]

Question: What can be known without asking users to log in?  
Answer: Query text, result quality, channel, client family, rough geography from trusted infra headers, locale if provided, and approximate anonymous client groups. Exact identity requires account or API-key linkage and is out of scope for anonymous usage. [SOURCE: supabase/functions/_shared/search-engine/rate-limit.ts] [ASSUMPTION]

Question: What should remain outside this feature?  
Answer: Umami event sync, monetization, affiliate attribution, raw identifiers, and broad web analytics changes. The MCP ledger should serve Supericons product decisions, not become another general analytics suite. [SOURCE: user request 2026-07-04]

Question: What must be true before this is production-ready?  
Answer: Hosted MCP rows classify as Hosted MCP, local telemetry remains non-blocking and opt-out capable, retries do not inflate summary metrics, unclassified rows explain what is missing, and no MCP path sends data to Umami. [ASSUMPTION]

## Recommended MVP Decision

Build a dedicated `mcp_usage_events` companion table and enrich `search_request_audit` with normalized attribution fields. [ASSUMPTION]

Keep Umami completely out of the MCP ledger and use Umami only for web traffic analysis outside this feature. [SOURCE: user request 2026-07-04]

Do not build monetization features until the dashboard can show trustworthy MCP demand, client family, result quality, and anonymous-client trends. [SOURCE: user request 2026-07-04]
