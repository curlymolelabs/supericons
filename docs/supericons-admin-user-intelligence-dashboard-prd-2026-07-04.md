# Supericons Admin User Intelligence Dashboard PRD

Date: 2026-07-04

## Problem

Supericons is early and growing slowly, so the admin dashboard needs to help the team learn from every real user and every search. The current local admin dashboard has useful telemetry, but it mixes environment, channel, event type, and user segment in ways that make it hard to answer practical business questions. [SOURCE: admin.html] [SOURCE: public/admin-app.js]

The team needs to know who users are, where they come from, whether they are free or pro users, what interface they use, what languages they use, what searches fail, and which product or library improvements would help them most. [SOURCE: user request 2026-07-04]

Umami exports show meaningful early traffic and acquisition signals: 228 visitors, 634 visits, and 4.82k views in the selected Umami period shown in the dashboard. [SOURCE: Screenshot 2026-07-04 145433.png]

Umami exports also show that the root page dominates traffic, with `/` receiving 222 visitors, 620 visits, and 4,418 pageviews. MCP pages have smaller but strategically important traffic, including `/mcp/` with 14 visitors, `/mcp/claude-code/` with 7 visitors, `/mcp/codex/` with 7 visitors, and `/mcp/cursor/` with 5 visitors. [SOURCE: path.csv]

Traffic sources show early discovery through direct traffic, search, referrals, and LLMs. The Umami channel export shows 196 direct visitors, 25 organic-search visitors, 7 referral visitors, 7 LLM visitors, and 1 organic-social visitor. [SOURCE: channel.csv]

Referrer data shows Google, ChatGPT, Stripe, GitHub, mcp.so, and cursor.directory as visible discovery or workflow touchpoints. [SOURCE: referrer.csv]

Geography is broad for a small product: country-level Umami data shows Singapore, United States, Brazil, Germany, Japan, China, India, South Korea, France, and Canada among the top countries. [SOURCE: Screenshot 2026-07-04 145617.png]

Language demand is visible indirectly through localized page titles: English, Simplified Chinese, Traditional Chinese, Korean, Japanese, and German titles appear in the Umami title export. [SOURCE: title.csv]

Generic Umami dimensions such as browser, operating system, device type, city, country, referrer, and page path are useful product analytics inputs. The verified privacy risk is narrower: URL paths and fragments can accidentally contain auth callback payloads. A local pattern scan of the supplied Umami CSV exports found 91 auth-token parameter matches and 182 JWT-shaped fragments across `path.csv`, `fullPath.csv`, `entry.csv`, and `exit.csv`. This PRD intentionally does not quote those values. The dashboard and analytics pipeline must scrub auth fragments and sensitive URL parameters before analytics ingestion or display. [SOURCE: local CSV pattern scan 2026-07-04] [SOURCE: path.csv] [SOURCE: fullPath.csv] [SOURCE: entry.csv] [SOURCE: exit.csv]

## Target User

Primary target user: Supericons operator or founder reviewing product growth, user behavior, and search failures in the local-only admin dashboard. [SOURCE: user request 2026-07-04]

Secondary target user: Supericons maintainer deciding what aliases, icons, docs, MCP integrations, or onboarding improvements to build next. [SOURCE: user request 2026-07-04]

The dashboard is not intended for public users and must remain local/admin-only. [SOURCE: admin build output: `Admin page kept local-only; no production admin artifacts emitted.`]

## Goals

1. Help the Supericons operator understand who is using the product, where they came from, what they searched for, and whether they succeeded. [SOURCE: user request 2026-07-04]

2. Separate acquisition analytics from product/search intelligence so Umami and Supericons-owned telemetry each do the job they are best suited for. [SOURCE: channel.csv] [SOURCE: mcp/hosted-search-client.js] [SOURCE: public/admin-app.js]

3. Make failed, weak, and high-value searches actionable through a Demand Inbox that recommends add-icon, add-alias, improve-ranking, improve-docs, watch, ignore, or resolved actions. [SOURCE: user request 2026-07-04] [SOURCE: public/admin-app.js]

4. Preserve production safety by keeping admin local-only and by scrubbing token-shaped URL payloads before import, storage, display, or export. [SOURCE: scripts/build-admin-html.mjs] [SOURCE: scripts/cleanup-dist-admin-artifacts.mjs] [SOURCE: local CSV pattern scan 2026-07-04]

## Jobs To Be Done

1. When I see a new user or pro user, I want to understand where they came from, what they searched, and whether they succeeded, so I can improve activation and retention. [SOURCE: user request 2026-07-04]

2. When searches fail or return weak results, I want to see the query, channel, language, country, user segment, and result count, so I can decide whether to add an icon, add aliases, improve ranking, or write docs. [SOURCE: user request 2026-07-04]

3. When traffic arrives from Google, ChatGPT, MCP directories, or docs pages, I want to see which pages and flows attract users, so I can double down on the right acquisition paths. [SOURCE: referrer.csv] [SOURCE: path.csv] [SOURCE: query.csv]

4. When users interact through web, MCP, CLI, or API-like surfaces, I want those channels separated from production/local/preview environment, so the dashboard does not hide important usage behind ambiguous labels. [SOURCE: admin.html] [SOURCE: supabase/functions/admin-api/index.ts]

5. When analytics include sensitive URL fragments, I want those values removed or masked, so admin insight does not create a security or privacy leak. [SOURCE: entry.csv]

## Current State

The existing admin dashboard has a Stats page, Icon Intelligence page, Users page, and Audit Log page. [SOURCE: admin.html]

The current Stats page loads `total_users`, `active_pro`, `total_purchases`, `new_users_30d`, recent signups, hosted search counts, p95 latency, and trap hits from the admin API. [SOURCE: public/admin-app.js] [SOURCE: supabase/functions/admin-api/index.ts]

The Total Users value is populated, but the subtitle remains `Waiting for live data`, because `renderStats()` updates the number but does not update `statsTotalUsersDelta`. [SOURCE: public/admin-app.js] [SOURCE: admin.html]

The Icon Intelligence environment selector currently includes `Live only`, `Production`, `Preview`, `Local`, `Test`, `Legacy / unknown`, and `All`. [SOURCE: admin.html]

The current admin API treats `web` as production, `local_web` as local, `preview_web` as preview, and `test_web` as test. It does not classify `mcp` as production in `classifyAnalyticsSource()`. [SOURCE: supabase/functions/admin-api/index.ts]

Hosted MCP search requests currently send `source: 'mcp'`. [SOURCE: mcp/hosted-search-client.js] [SOURCE: supabase/functions/mcp-search/index.ts]

Country metadata is partially supported for hosted search through trusted country headers and `search_request_audit.country_code`. [SOURCE: supabase/functions/_shared/search-engine/rate-limit.ts] [SOURCE: supabase/migrations/20260612_search_audit_geo_account_fields.sql]

Locale is used by hosted search request handling for localized query framing, but locale is not currently exposed as a first-class `search_request_audit` field in the admin query intelligence view. [SOURCE: supabase/functions/_shared/search-engine/handle-search-request.ts] [SOURCE: supabase/functions/admin-api/index.ts]

Umami supports API access for analytics data, including website statistics, metrics, events, event data, filters, and Cloud API-key access. This makes an API sync feasible after the CSV-import MVP. [SOURCE: https://docs.umami.is/docs/api] [SOURCE: https://docs.umami.is/docs/api/website-stats] [SOURCE: https://docs.umami.is/docs/api/events]

Umami also supports custom event tracking through HTML data attributes or JavaScript, but those events are still best treated as web analytics signals rather than the full source of truth for Supericons search quality. [SOURCE: https://docs.umami.is/docs/track-events]

## Product Principle

The dashboard should move from raw telemetry to an operator cockpit:

**Who searched what, from where, through which interface, did they succeed, and what should we do next?** [ASSUMPTION]

## Decision Dashboard Philosophy

The admin dashboard should be robust, but not complicated. Its job is to help the Supericons operator make better product decisions with less effort. It should not become a reporting maze, a compliance dashboard, or a collection of charts that are interesting but not actionable. [SOURCE: user request 2026-07-04]

Every dashboard module must answer at least one practical operator question. [ASSUMPTION]

| Operator Question | Dashboard Answer | Product Decision It Supports |
| --- | --- | --- |
| Who is using Supericons? | User segment, plan, geography, language, channel, recency | Decide which users and use cases to support first. |
| How did they find us? | Umami channel, referrer, landing page, docs path | Decide where to improve acquisition and onboarding. |
| What do they need? | Searches, failed searches, weak-result searches, feedback | Decide which icons, aliases, rankings, and docs to build. |
| Are users succeeding? | Result count, copy/download/save/preview actions, repeat searches | Decide whether search quality or UI needs work. |
| Are pro users getting value? | Pro user searches, actions, retained activity, pain points | Decide what paid features or support need attention. |
| What should I do next? | Demand Inbox priority and recommended action | Decide the next icon, alias, ranking, docs, or UX task. |

If a widget does not help answer one of these questions, it should not be in the MVP. [ASSUMPTION]

The dashboard should prefer compact, scannable information over deep analytics controls. A founder should be able to open it and quickly see: users, demand, failures, channels, and next actions. [SOURCE: user request 2026-07-04]

## Socratic Product Review

These questions should be used to keep the dashboard simple and useful. [ASSUMPTION]

1. What decision will this metric help me make?
2. If the number changes, what action would I take?
3. Is this about acquisition, product usage, search quality, revenue, or user support?
4. Is Umami already the best source for this, or does Supericons need first-party tracking?
5. Can this be shown as a short answer instead of a complicated chart?
6. Does this help identify a user need, failed search, weak search, pro-user need, or growth opportunity?
7. Does this create risk or clutter without improving product decisions?
8. Can this wait until there are more users and more traffic?

## Privacy Clarification

The privacy concern is not that Supericons sees generic aggregate dimensions like country, city, browser, operating system, device type, referrer, or page path. Those are normal analytics inputs for understanding product demand. [SOURCE: browser.csv] [SOURCE: city.csv] [SOURCE: referrer.csv] [SOURCE: path.csv]

The concern is that URL paths, query strings, and hash fragments can accidentally include sensitive auth data if an authentication redirect leaks into analytics. This already appears in the supplied Umami exports as token-shaped URL fragments. [SOURCE: local CSV pattern scan 2026-07-04] [SOURCE: path.csv] [SOURCE: fullPath.csv] [SOURCE: entry.csv] [SOURCE: exit.csv]

The MVP privacy work should therefore be practical and narrow. It should not add red tape to the dashboard; it should quietly clean unsafe URL fragments so the operator can focus on users and product decisions. [SOURCE: user request 2026-07-04]

1. Strip hash fragments from analytics paths before import or display. [SOURCE: entry.csv]
2. Strip or mask sensitive query keys such as token-like, code-like, secret-like, key-like, and session-like parameters. [ASSUMPTION]
3. Keep aggregate location, browser, device, referrer, and page data because those answer product questions without exposing raw credentials. [SOURCE: browser.csv] [SOURCE: city.csv] [SOURCE: referrer.csv]
4. Mask registered emails by default in the admin UI even though the admin dashboard is local-only, because user identity is operationally useful but should not be overexposed. [ASSUMPTION]

## Analytics Strategy Decision

Recommended decision: use a hybrid analytics model. [ASSUMPTION]

Umami should be the aggregate web analytics layer. It should answer acquisition and web behavior questions:

- Which countries, cities, browsers, devices, and referrers are showing up? [SOURCE: city.csv] [SOURCE: browser.csv] [SOURCE: referrer.csv]
- Which public pages and docs paths attract traffic? [SOURCE: path.csv] [SOURCE: fullPath.csv] [SOURCE: query.csv]
- Which languages or localized pages are being viewed? [SOURCE: title.csv]
- Are LLM, search, referral, and direct channels growing? [SOURCE: channel.csv]

Supericons-owned telemetry should be the product intelligence layer. It should answer search and user-success questions:

- What did the user search for? [SOURCE: supabase/functions/_shared/search-engine/handle-search-request.ts]
- Was it web, hosted MCP, local MCP/npm, CLI, API, or internal/test? [SOURCE: mcp/hosted-search-client.js] [SOURCE: supabase/functions/mcp-search/index.ts]
- Did the search return enough relevant results? [SOURCE: public/admin-app.js]
- Did the user copy, download, save, preview, or abandon? [SOURCE: public/admin-app.js]
- Was the user anonymous, signed-in free, pro, or internal? [SOURCE: supabase/functions/admin-api/index.ts]
- What operator action should be taken: add alias, improve ranking, create icon, improve docs, watch, ignore, or mark resolved? [ASSUMPTION]

This avoids two bad extremes. Umami-only would miss hosted MCP, CLI, plan state, exact search quality, and icon actions unless Supericons overuses custom events. Own-tracking-only would duplicate Umami's mature web analytics and make the admin dashboard more complex than needed. [ASSUMPTION]

## Umami Sync Options

### Option A: CSV Import MVP

Import the existing Umami CSV exports into the local admin dashboard. This is fastest, safe for current workflow, and does not require new hosted credentials. [SOURCE: provided CSV files]

Pros:

- Works with current exports. [SOURCE: provided CSV files]
- Good enough for a founder/operator review loop. [ASSUMPTION]
- Can be kept local-only. [ASSUMPTION]

Cons:

- Manual and not real-time. [ASSUMPTION]
- Requires repeat exports. [ASSUMPTION]

### Option B: Umami API Sync

Use Umami's API to pull stats, metrics, events, event data, and filtered website analytics into the local admin API. Umami Cloud calls use `https://api.umami.is` with an API key, while self-hosted instances use the instance API endpoint. [SOURCE: https://docs.umami.is/docs/api]

Pros:

- Removes repeated CSV exports. [ASSUMPTION]
- Can support scheduled refresh or a manual `Sync Umami` button. [ASSUMPTION]
- Uses Umami as intended for programmatic analytics access. [SOURCE: https://docs.umami.is/docs/api]

Cons:

- Requires storing a local-only Umami API key or token. [SOURCE: https://docs.umami.is/docs/api]
- Must still scrub URL data before display. [SOURCE: local CSV pattern scan 2026-07-04]

### Option C: Umami Custom Events

Send coarse web events to Umami for product funnel visibility, such as pricing view, docs CTA click, MCP setup click, preview opened, or feedback submitted. Umami supports event tracking through data attributes and JavaScript. [SOURCE: https://docs.umami.is/docs/track-events]

Pros:

- Useful for web funnel analytics. [ASSUMPTION]
- Keeps high-level events in Umami reports. [ASSUMPTION]

Cons:

- Not ideal for detailed search-quality workflows. [ASSUMPTION]
- Event names have limits and event data should stay coarse. [SOURCE: https://docs.umami.is/docs/track-events]

### Option D: Supericons First-Party Event Store

Track product-specific events in Supabase for web, MCP, CLI, and signed-in user flows. [ASSUMPTION]

Pros:

- Best source of truth for search quality, icon actions, plan status, and MCP/CLI behavior. [ASSUMPTION]
- Can join to signed-in users and subscription state where safe. [SOURCE: supabase/functions/admin-api/index.ts]
- Works beyond browser pageviews. [SOURCE: mcp/hosted-search-client.js] [SOURCE: mcp/telemetry.js]

Cons:

- Requires careful schema, retention, and admin UI work. [ASSUMPTION]
- Must avoid logging raw secrets, raw IP addresses, or sensitive prompts. [ASSUMPTION]

## First-Party Product Events

The admin dashboard should own these product events because they directly answer user-success and search-quality questions. [ASSUMPTION]

| Event | Channel | Key Fields | Why It Matters |
| --- | --- | --- | --- |
| `search_performed` | Web, MCP, CLI, API | query, result_count, library_filter, locale, country_code, plan_segment | Shows demand and success rate. |
| `search_no_results` | Web, MCP, CLI, API | query, locale, channel, plan_segment | Feeds Demand Inbox. |
| `low_result_search` | Web, MCP, CLI, API | query, result_count, top_results | Flags weak coverage. |
| `icon_previewed` | Web, MCP | query, icon_id, library, result_rank | Shows whether visual preview helps selection. |
| `icon_copied` | Web | icon_id, library, format, query_context | Confirms icon utility. |
| `icon_downloaded` | Web | icon_id, library, format, size | Confirms asset utility. |
| `icon_saved` | Web | icon_id, library, user_segment | Indicates stronger intent. |
| `mcp_tool_called` | Hosted MCP, local MCP | tool_name, client_hint, result_count, latency_ms | Shows agent adoption. |
| `feedback_submitted` | Web | query_context, message_length, locale | Captures unmet demand. |
| `pricing_viewed` | Web | referrer, user_segment, country_code | Connects demand to revenue interest. |

Raw prompts, raw tokens, raw IP addresses, and auth fragments should not be stored in this event layer. [SOURCE: local CSV pattern scan 2026-07-04] [ASSUMPTION]

## Visual Concept Model

The generated concept visuals suggest three product patterns for the refined dashboard. [SOURCE: GPT image ideation 2026-07-04]

1. **Growth + Demand Cockpit:** one overview that combines audience, channels, search demand, and recommended actions. [SOURCE: GPT image ideation 2026-07-04]
2. **Hybrid Data Architecture:** Umami feeds aggregate traffic; Supericons-owned telemetry feeds product/search intelligence; a privacy scrubber cleans URLs before admin display. [SOURCE: GPT image ideation 2026-07-04]
3. **Search Signal To Product Action:** every failed or weak search should move through normalization, demand clustering, visual review, operator action, and follow-up QA. [SOURCE: GPT image ideation 2026-07-04]

## Scope

### MVP Scope

1. Rename and separate filters into Time Range, Channel, Environment, User Segment, and Locale. [SOURCE: admin.html] [SOURCE: user request 2026-07-04]

2. Replace `Live only` with clearer environment language. `Production` should mean production runtime. `Channel` should separately capture Web, Hosted MCP, Local MCP/npm, CLI, API, and Internal/Test. [SOURCE: admin.html] [SOURCE: supabase/functions/admin-api/index.ts]

3. Add a Growth & Audience section that combines Supabase Auth users, subscription status, and search activity. [SOURCE: supabase/functions/admin-api/index.ts]

4. Add a Demand Inbox that ranks search opportunities by user value, not only raw query count. [SOURCE: public/admin-app.js] [SOURCE: user request 2026-07-04]

5. Add Umami Insight cards using CSV import first, but only for decision-useful signals: acquisition channel, top referrers, top pages, entry/exit pages, browser/device, country/city, and localized title signals. [SOURCE: channel.csv] [SOURCE: referrer.csv] [SOURCE: path.csv] [SOURCE: entry.csv] [SOURCE: exit.csv] [SOURCE: browser.csv] [SOURCE: city.csv] [SOURCE: title.csv]

6. Add privacy-safe URL scrubbing for auth fragments and sensitive query parameters before analytics data is stored, imported, displayed, or exported. [SOURCE: local CSV pattern scan 2026-07-04] [SOURCE: entry.csv]

7. Add a Supericons-owned first-party event layer for product/search behavior that Umami should not own as the main source of truth: searches, no-result searches, low-result searches, icon previews, copies, downloads, saves, MCP calls, and feedback submissions. [SOURCE: mcp/hosted-search-client.js] [SOURCE: mcp/telemetry.js] [SOURCE: public/admin-app.js]

8. Make the stats copy truthful: Total Users should say it is from Supabase Auth, Active Pro should say active paid subscriptions, and Hosted Search should show channel breakdown. [SOURCE: public/admin-app.js] [SOURCE: supabase/functions/admin-api/index.ts]

9. Add query detail panels that show search journey context: channel, environment, locale, country, user segment, result count, copied/downloaded/saved actions, and recommended operator action. [SOURCE: public/admin-app.js] [SOURCE: supabase/functions/admin-api/index.ts]

10. Keep the admin dashboard local-only and excluded from production `dist`. [SOURCE: scripts/build-admin-html.mjs] [SOURCE: scripts/cleanup-dist-admin-artifacts.mjs]

11. Add a visible `Needs attention` summary that lists the top 3 to 5 product actions for the operator: failed search cluster, pro-user issue, acquisition opportunity, docs/onboarding gap, or search-quality problem. [SOURCE: user request 2026-07-04] [ASSUMPTION]

### Later Scope

1. Connect to the Umami API directly instead of relying only on CSV imports. [ASSUMPTION]

2. Add session replay links or heatmap references if Umami data is available and privacy rules allow it. [ASSUMPTION]

3. Add weekly operator digests: top failing searches, new pro activity, traffic source changes, and recommended content/icon work. [ASSUMPTION]

4. Add trend comparisons across periods once there is enough data volume. [ASSUMPTION]

5. Add exact cross-device identity stitching only if there is a clear product need and a privacy-safe design. [ASSUMPTION]

## Non-Goals

The MVP will not expose the admin dashboard on the production website. [SOURCE: scripts/build-admin-html.mjs]

The MVP will not store raw IP addresses. Existing behavior uses hashed or prefix-style IP signals. [SOURCE: supabase/functions/_shared/search-engine/rate-limit.ts] [SOURCE: supabase/functions/admin-api/index.ts]

The MVP will not identify anonymous Umami visitors as named people unless they are also signed in through Supabase Auth and the linkage is privacy-safe. [ASSUMPTION]

The MVP will not replace Umami as the source of web traffic analytics. It will summarize Umami data inside the local admin workflow. [SOURCE: user request 2026-07-04]

The MVP will not build a general BI dashboard. It will focus on Supericons growth, search quality, and user intelligence. [ASSUMPTION]

The MVP will not add charts, filters, or tables that do not map to a clear product decision. [SOURCE: user request 2026-07-04]

## Information Architecture

### Top-Level Admin Navigation

1. Overview
2. Demand Inbox
3. Users
4. Channels
5. Audit Log
6. Documentation

This reduces the current split between Stats and Icon Intelligence by making the operator jobs more explicit. [ASSUMPTION]

### Global Filters

`Time range`

Values: Last 24 hours, Last 7 days, Last 30 days, Last 90 days, All time. [ASSUMPTION]

`Channel`

Values: All, Web app, Hosted MCP, Local MCP/npm, CLI, API, Internal/Test. [SOURCE: mcp/hosted-search-client.js] [SOURCE: channel.csv] [ASSUMPTION]

`Environment`

Values: All, Production, Preview, Local/Test, Unknown. [SOURCE: admin.html] [SOURCE: supabase/functions/admin-api/index.ts]

`User segment`

Values: All, Anonymous, Signed-in free, Pro, Internal. [SOURCE: supabase/functions/admin-api/index.ts] [ASSUMPTION]

`Locale`

Values: All, English, Chinese, Japanese, Korean, German, other detected locales. [SOURCE: title.csv] [ASSUMPTION]

## Proposed Screens

### 1. Overview

Purpose: show whether Supericons is growing and where attention is needed. [SOURCE: user request 2026-07-04]

Cards:

- Real users: Supabase Auth total and 30-day new users. [SOURCE: supabase/functions/admin-api/index.ts]
- Pro users: active paid subscriptions. [SOURCE: supabase/functions/admin-api/index.ts]
- Web visitors: Umami visitors. [SOURCE: Screenshot 2026-07-04 145433.png]
- Web searches: hosted web search requests. [SOURCE: supabase/functions/admin-api/index.ts]
- MCP searches: hosted MCP requests plus MCP evidence rows. [SOURCE: mcp/hosted-search-client.js] [SOURCE: mcp/telemetry.js]
- Failed or weak searches: zero-result and low-result query counts. [SOURCE: public/admin-app.js]
- Conversion actions: copies, downloads, saves, pricing visits, checkout referrers. [SOURCE: public/admin-app.js] [SOURCE: referrer.csv]

### 2. Demand Inbox

Purpose: make it obvious what the team should improve next. [SOURCE: user request 2026-07-04]

Columns:

- Query
- Query cluster
- Channel
- Environment
- Locale
- Country
- User segment
- Result count
- Search count
- Copy/download/save count
- Last seen
- Action needed

Action labels:

- Add icon
- Add alias
- Improve ranking
- Improve docs
- Watch
- Resolved
- Ignore

Ranking logic:

`priority = user value + demand + failure severity + recency + pro/signed-in weight - resolved penalty` [ASSUMPTION]

### 3. Users

Purpose: understand real users without leaking sensitive data. [SOURCE: user request 2026-07-04]

Rows:

- User or anonymous visitor group
- Plan: anonymous, signed-in free, pro
- Country
- Locale
- Channel used
- Top searches
- Last active
- Conversion actions
- Notes/action status

Registered emails should be masked by default, with an explicit reveal action only in local admin. [ASSUMPTION]

### 4. Channels

Purpose: separate acquisition and usage surfaces. [SOURCE: channel.csv] [SOURCE: referrer.csv] [SOURCE: mcp/hosted-search-client.js]

Sections:

- Acquisition: Direct, Organic search, LLM, Referral, Organic social. [SOURCE: channel.csv]
- Referrers: Google, ChatGPT, Stripe, GitHub, mcp.so, cursor.directory. [SOURCE: referrer.csv]
- Product surfaces: Web app, MCP docs, Claude Code docs, Codex docs, Cursor docs, converter, pricing. [SOURCE: path.csv] [SOURCE: query.csv]
- Runtime channel: Web app, Hosted MCP, Local MCP/npm, CLI, API. [ASSUMPTION]

### 5. Query Detail Drawer

Purpose: explain one query end-to-end. [SOURCE: public/admin-app.js]

Sections:

- Query summary
- Who searched: anonymous/signed-in/pro, country, locale
- Where it happened: channel and environment
- What was returned: result count, libraries, first results
- What happened next: copy, download, save, replacement, exit
- Recommended action
- Operator note and status

## Data Model Plan

### Normalize Existing Concepts

`environment`

Production, preview, local, test, unknown. [SOURCE: supabase/functions/admin-api/index.ts]

`channel`

Web app, hosted MCP, local MCP/npm, CLI, API, internal/test. [ASSUMPTION]

`source`

Keep existing source values for compatibility, but map them into `channel` and `environment` for dashboard display. [SOURCE: supabase/functions/admin-api/index.ts]

### Extend Hosted Search Audit

Add or expose these fields when safe:

- `channel`
- `client_name`
- `client_version`
- `locale`
- `browser_language`
- `referrer_domain`
- `landing_path`
- `entry_path`
- `user_segment`

Country, user ID, account plan, subscription status, and pro status already have partial support. [SOURCE: supabase/migrations/20260612_search_audit_geo_account_fields.sql]

### Umami Import Layer

MVP should support local CSV import from the existing Umami exports:

- `path.csv`
- `fullPath.csv`
- `entry.csv`
- `exit.csv`
- `title.csv`
- `query.csv`
- `referrer.csv`
- `channel.csv`
- `domain.csv`
- `browser.csv`
- `city.csv`

These files provide enough aggregate context for acquisition, page interest, locale hints, referrers, devices, and geography. [SOURCE: provided CSV files]

CSV import should scrub sensitive values before display or persistence. [SOURCE: entry.csv]

### Supericons-Owned Event Layer

The first-party event layer should capture product behavior that Umami cannot fully explain: search intent, result quality, selected icons, MCP/CLI tool usage, user plan segment, and operator follow-up status. [SOURCE: public/admin-app.js] [SOURCE: mcp/hosted-search-client.js] [SOURCE: mcp/telemetry.js]

This layer should be query-optimized for admin review, not for broad website traffic reporting. Umami remains the source for aggregate web reach, acquisition, device, browser, and page analytics. [SOURCE: channel.csv] [SOURCE: browser.csv] [SOURCE: path.csv]

Every stored event should have a normalized `channel`, `environment`, `locale`, `country_code`, `plan_segment`, and `event_time` when available. [ASSUMPTION]

Every admin-visible event row should pass through the same URL scrubber and public-safe display rules. [SOURCE: local CSV pattern scan 2026-07-04]

### Identity Stitching

Do not attempt exact anonymous identity stitching in MVP. [ASSUMPTION]

For signed-in users, join search audit rows through trusted `user_id` where present. [SOURCE: supabase/functions/_shared/search-engine/handle-search-request.ts] [SOURCE: supabase/functions/admin-api/index.ts]

For anonymous users, show aggregate session/IP-hash groups, not identities. [SOURCE: supabase/functions/admin-api/index.ts]

## Functional Requirements

FR1. The dashboard must separate Channel from Environment in both UI filters and API payloads. Maps to JTBD 4. [SOURCE: admin.html] [SOURCE: supabase/functions/admin-api/index.ts]

FR2. The dashboard must rename or remove `Live only` because it is ambiguous. Maps to JTBD 4. [SOURCE: admin.html]

FR3. The Stats overview must replace stale subtitles like `Waiting for live data` with truthful source/status copy. Maps to JTBD 1. [SOURCE: public/admin-app.js] [SOURCE: admin.html]

FR4. The Demand Inbox must show query, channel, environment, country, locale, user segment, result count, search count, and action needed. Maps to JTBD 2. [SOURCE: user request 2026-07-04]

FR5. The dashboard must show MCP traffic separately from web traffic. Maps to JTBD 4. [SOURCE: mcp/hosted-search-client.js] [SOURCE: mcp/telemetry.js]

FR6. The dashboard must show user plan status where available: anonymous, signed-in free, or pro. Maps to JTBD 1. [SOURCE: supabase/functions/admin-api/index.ts]

FR7. The dashboard must show geography using trusted hosted-search country data and imported Umami aggregate country/city data. Maps to JTBD 1 and JTBD 3. [SOURCE: supabase/migrations/20260612_search_audit_geo_account_fields.sql] [SOURCE: city.csv]

FR8. The dashboard must show language/locale using explicit app locale when available and Umami title/query signals as fallback. Maps to JTBD 1 and JTBD 2. [SOURCE: title.csv] [SOURCE: supabase/functions/_shared/search-engine/handle-search-request.ts]

FR9. The dashboard must scrub auth tokens and sensitive URL fragments from Umami imports and displayed paths. Maps to JTBD 5. [SOURCE: entry.csv]

FR10. The query detail drawer must show a compact journey from search to result to action. Maps to JTBD 2. [SOURCE: public/admin-app.js]

FR11. The dashboard must stay local-only and excluded from production `dist`. Maps to risk mitigation. [SOURCE: scripts/build-admin-html.mjs] [SOURCE: scripts/cleanup-dist-admin-artifacts.mjs]

FR12. The admin API must preserve existing endpoints while adding new normalized fields so current dashboard functionality does not regress. Maps to risk mitigation. [SOURCE: supabase/functions/admin-api/index.ts]

FR13. The dashboard must support an Umami CSV import MVP for aggregate web analytics and an API-sync path for later automation. Maps to JTBD 3. [SOURCE: provided CSV files] [SOURCE: https://docs.umami.is/docs/api]

FR14. The dashboard must use Supericons-owned telemetry as the source of truth for search quality, icon actions, plan segment, MCP behavior, CLI behavior, and operator action status. Maps to JTBD 1 and JTBD 2. [SOURCE: mcp/hosted-search-client.js] [SOURCE: mcp/telemetry.js] [SOURCE: public/admin-app.js]

FR15. The dashboard must show an explicit data-source label on each module: Umami aggregate, Supericons search audit, Supabase Auth, Stripe/subscription data, or mixed. Maps to risk mitigation. [SOURCE: channel.csv] [SOURCE: supabase/functions/admin-api/index.ts]

FR16. The dashboard must include a `Needs attention` summary that turns raw data into the top 3 to 5 recommended operator actions. Maps to JTBD 1, JTBD 2, and the decision-dashboard principle. [SOURCE: user request 2026-07-04]

FR17. The dashboard must avoid adding a metric, chart, or table unless it answers an explicit operator question or supports a clear product decision. Maps to the non-goal of avoiding a general BI dashboard. [SOURCE: user request 2026-07-04]

## Acceptance Criteria

1. Admin Overview shows correct user count and no longer says `Waiting for live data` after stats load. [SOURCE: admin.html] [SOURCE: public/admin-app.js]

2. Global filters include separate Channel and Environment controls. [SOURCE: admin.html]

3. Hosted MCP searches appear under Channel = MCP, not hidden by Environment = Legacy / unknown. [SOURCE: mcp/hosted-search-client.js] [SOURCE: supabase/functions/admin-api/index.ts]

4. Demand Inbox can show at least: query, channel, environment, user segment, country, locale, result count, and action needed. [SOURCE: user request 2026-07-04]

5. Umami CSV import rejects, masks, or strips auth-token-like URL fragments before display. [SOURCE: local CSV pattern scan 2026-07-04] [SOURCE: entry.csv]

6. Local admin browser QA passes for overview, filters, demand inbox, and query detail drawer. [SOURCE: scripts/verify-admin-query-workbench-browser.mjs]

7. Static contract verification passes for dashboard structure and public-safe fields. [SOURCE: scripts/verify-admin-query-workbench.mjs]

8. Production build still removes admin artifacts from `dist`. [SOURCE: scripts/cleanup-dist-admin-artifacts.mjs]

9. Every dashboard card or table declares whether it is powered by Umami, Supericons telemetry, Supabase Auth, Stripe/subscription data, or mixed data. [ASSUMPTION]

10. Demand Inbox can be filtered by Web, Hosted MCP, Local MCP/npm, CLI, API, and Internal/Test without changing the Environment filter. [SOURCE: user request 2026-07-04] [SOURCE: mcp/hosted-search-client.js]

11. The first visible dashboard section includes a short action list such as `Fix weak query`, `Review pro user need`, `Improve docs path`, `Add icon request`, or `Watch trend`. [SOURCE: user request 2026-07-04] [ASSUMPTION]

12. Any new dashboard module must document which operator decision it supports before it is implemented. [SOURCE: user request 2026-07-04]

## Success Metrics

The operator can answer "what should we improve next?" within two minutes of opening the dashboard. [ASSUMPTION]

At least 90% of new hosted search audit rows should have a normalized channel after implementation. [ASSUMPTION]

At least 80% of production hosted search rows should have an environment classification after implementation. [ASSUMPTION]

Sensitive auth-token-like URL fragments should appear in zero admin-visible Umami rows after scrubbing. [SOURCE: entry.csv]

The dashboard should surface at least one concrete action per active failing query cluster: add icon, add alias, improve ranking, improve docs, watch, resolve, or ignore. [ASSUMPTION]

## Risks

Sensitive URL leakage is the highest priority risk because Umami exports already show auth callback fragments. [SOURCE: entry.csv]

Channel and environment terminology can remain confusing if MCP is treated as an environment instead of a channel. [SOURCE: admin.html] [SOURCE: supabase/functions/admin-api/index.ts]

Small traffic volume can make trends noisy, so the dashboard should emphasize individual opportunities and qualitative review, not only aggregate charts. [SOURCE: Screenshot 2026-07-04 145433.png] [ASSUMPTION]

Anonymous analytics cannot reliably answer “who is this user?” without privacy tradeoffs. [ASSUMPTION]

Umami and Supabase data may not share a common visitor key, so MVP should use aggregate correlation rather than pretending exact stitching exists. [ASSUMPTION]

## Implementation Plan

### Phase 0: Analytics URL Hygiene

1. Add analytics URL scrubber for auth fragments and sensitive query/hash parameters before Umami capture or admin import. [SOURCE: local CSV pattern scan 2026-07-04] [SOURCE: entry.csv]

2. Add admin CSV importer sanitizer that masks sensitive path values before rendering. [SOURCE: local CSV pattern scan 2026-07-04] [SOURCE: entry.csv]

3. Add verification fixtures containing fake token-shaped values to prove they are stripped. [ASSUMPTION]

4. Keep generic aggregate dimensions such as browser, device, country, city, referrer, and page path available after sanitization. [SOURCE: browser.csv] [SOURCE: city.csv] [SOURCE: referrer.csv] [SOURCE: path.csv]

### Phase 1: Terminology And Existing UI Fixes

1. Replace `Live only` labels with `Production only` or split into explicit Environment filter. [SOURCE: admin.html]

2. Add Channel filter next to Environment filter. [SOURCE: user request 2026-07-04]

3. Update Stats card subtitles to describe source and period. [SOURCE: public/admin-app.js]

4. Classify `mcp` as Channel = Hosted MCP and Environment = Production when coming from hosted production endpoints. [SOURCE: mcp/hosted-search-client.js] [SOURCE: supabase/functions/mcp-search/index.ts]

5. Add data-source labels to dashboard modules so the operator knows whether a card comes from Umami, Supericons telemetry, Supabase Auth, Stripe/subscription data, or mixed sources. [ASSUMPTION]

### Phase 2: Data Enrichment And First-Party Events

1. Add locale/browser language to hosted search audit where safe. [SOURCE: supabase/functions/_shared/search-engine/handle-search-request.ts]

2. Add normalized channel mapping in admin API responses. [SOURCE: supabase/functions/admin-api/index.ts]

3. Add Umami CSV import endpoint or local-only parser for the supplied export files. [SOURCE: provided CSV files]

4. Add aggregate acquisition and audience summary payloads. [SOURCE: channel.csv] [SOURCE: referrer.csv] [SOURCE: city.csv]

5. Add or normalize first-party product events for search, no-result search, low-result search, preview, copy, download, save, MCP tool call, feedback, and pricing intent. [SOURCE: public/admin-app.js] [SOURCE: mcp/telemetry.js]

6. Add a future Umami API sync adapter behind a local-only environment variable or settings field. [SOURCE: https://docs.umami.is/docs/api]

### Phase 3: New Dashboard Layout

1. Build Overview with growth, channel, and audience cards. [SOURCE: user request 2026-07-04]

2. Build Demand Inbox with action-oriented query prioritization. [SOURCE: public/admin-app.js]

3. Build User Insights table with plan, geography, locale, searches, and activity. [SOURCE: supabase/functions/admin-api/index.ts]

4. Build Channel page combining Umami acquisition and Supericons product usage. [SOURCE: channel.csv] [SOURCE: path.csv]

### Phase 4: QA And Release Safety

1. Extend `verify-admin-query-workbench.mjs` for Channel, Environment, Locale, and sanitized Umami import coverage. [SOURCE: scripts/verify-admin-query-workbench.mjs]

2. Extend browser QA for the new filters and demand drawer. [SOURCE: scripts/verify-admin-query-workbench-browser.mjs]

3. Run production build and confirm admin artifacts are excluded from `dist`. [SOURCE: scripts/cleanup-dist-admin-artifacts.mjs]

## Open Questions

1. Should registered user emails be visible by default in local admin, or masked until clicked? [ASSUMPTION]

2. Should the first Umami integration be CSV import only, or should the dashboard connect to the Umami API? [ASSUMPTION]

3. Should hosted MCP always count as production, or should MCP clients pass an explicit environment value? [SOURCE: mcp/hosted-search-client.js] [ASSUMPTION]

4. Should CLI be a separate channel immediately, or should it be folded under MCP until there is a dedicated CLI telemetry source? [ASSUMPTION]

5. What is the acceptable analytics retention period for local admin imports and search audit rows? [ASSUMPTION]

6. Should pro user searches receive higher Demand Inbox priority than anonymous searches? [ASSUMPTION]

7. Should failed searches from LLM referrals or MCP docs visitors be prioritized differently because they may signal agent/developer adoption? [SOURCE: referrer.csv] [SOURCE: path.csv] [ASSUMPTION]

## Recommended MVP Decision

Build the MVP in this order:

1. Privacy scrubber.
2. Rename/split filters.
3. Fix stats copy.
4. Normalize MCP as a channel.
5. Add Demand Inbox user/context columns.
6. Add Umami CSV import summary.
7. Add user insight panel.

This order protects data first, removes misleading labels second, and then improves operator learning. [SOURCE: entry.csv] [SOURCE: admin.html] [SOURCE: user request 2026-07-04]
