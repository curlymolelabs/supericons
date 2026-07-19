# Founder quality pass: local beta 0.4.19-beta.1, 2026-07-19

Method: full pass of `scripts/run-founder-beta-validation.mjs --allow-unlabeled` (72 English `search_icons` attempts against the published npm beta over stdio). Quality-only evidence; events are unlabeled and excluded from any adoption or window count.

## Headline

- Reliability and speed: 0 errors, slowest query 75 ms, most under 60 ms. The local p95 under 500 ms gate condition is met with roughly 6x headroom.
- Quality: 23 of 72 queries (32%) returned zero results and roughly a dozen more returned weak or wrong top-3 rankings. Exact brand and common UI queries are strong; the expressive and workflow tiers are the weakness.

## What works well

- Exact brands: anthropic, openai, vercel, supabase, cursor, notion, github, figma all return the right logo first.
- Common UI singles: settings, search, home, menu, close, delete, calendar, clock, checkmark, arrow right all correct.
- Some originals shine: "vibe coding", "agent thinking indicator" (Thinking Pulse), "pull request" (Agent Pull Request first, generic git icon second).
- Compound dev terms with exact matches: database backup, export data, import file, webhook, terminal.

## Zero-result backlog, categorized by fix type

### 1. Expressive and relatable tier (8 misses; this is the brand's stated differentiator)

burnout, ship it, chill, ai slop, doomscrolling, touch grass, brainstorm, lightbulb moment

Expected per the spec: personality-bearing results, or a sane nearest neighbor (flame, rocket, snowflake, lightbulb exist in the corpus). Likely fix: expressive synonym and concept mappings in maintained data.

### 2. Developer workflow concepts (5 misses)

deploy to production, rollback, error log, feature flag, k8s

Nearest neighbors exist (rocket/upload, undo/history, file-warning/bug, flag/toggle, kubernetes brand icon). Likely fix: concept synonyms; "k8s" is a canonical alias for the existing kubernetes icon.

### 3. Multi-word intent sentences (4 misses)

"icon for a page where users manage api keys", "empty state for no search results", "loading spinner for chat", "button to copy code snippet"

Long natural-language intent fails while short forms succeed (auth, refresh, copy work individually). Likely fix: intent-frame extraction of head nouns, or documented guidance that agents should compress queries.

### 4. Fuzzy brand descriptions (4 misses)

ai browser company, agent startup, code editor with ai, vector database company

Descriptive brand discovery has no path to brand icons. Likely fix: brand descriptor tags in maintained data (category, what the company does).

### 5. Style-mode token (1 miss plus an asymmetry)

"settings solid" returns zero while "settings outline" returns results. The style word is not being parsed as a style filter in the solid case.

### 6. Misspellings (2 misses)

"notifcation" returns zero; "databse" returns nonsense (1x mobiledata). No fuzzy or edit-distance recovery on the local route.

## Weak or wrong top-3 rankings

| query | got | expected neighborhood |
| --- | --- | --- |
| user profile | account balance, account balance wallet | person, user, profile icons |
| merge branch | bug report first | git merge, call merge |
| repo | bug report, file report | repository, git icons |
| docker container | animated images, broken image | Docker brand icon, container/box |
| unit test | aspect ratio, call quality | test tube, checklist, flask |
| env vars | logo dev, production quantity limits | settings, sliders, code |
| cron job | add to queue, cloud queue | clock, calendar-clock, timer |
| sync now | cloud bolt, progress bolt | refresh, sync arrows |
| send email | all inbox, alternate email | send, mail-forward |
| api endpoint | alt route first | api, plug, link |
| code review | OpenAI Codex logo first | code plus magnifier or check |
| dark mode (rank 3) | add moderator | moon variants only |

Pattern: when no strong lexical match exists, ranking falls back to what looks like alphabetical-prefix filler (account balance, add moderator, alt route, animated images, aspect ratio all lead their failures). That fallback should be replaced by concept-similarity or suppressed below a confidence floor.

## Suggested fix order

1. The alphabetical-filler fallback (one ranking-policy fix that improves every weak query at once).
2. Expressive-tier synonym data (differentiator; 8 misses).
3. Workflow concept synonyms plus the k8s alias (5 misses).
4. Style-token parsing for "solid" (asymmetric bug, likely small).
5. Misspelling tolerance on the local route.
6. Fuzzy brand descriptors and long-intent handling (larger design questions; separate proposals).

Every confirmed fix lands per `CP-01`: smallest maintained-data or general-policy change, stable regression case added, 225-case fingerprint reviewed.

## Addendum: in-client pass through a real MCP agent (same day)

A second pass ran inside OpenCode with an agent driving the same beta through its MCP tools (18 searches at limit 3, plus one `recommend_icons` call). Determinism held again where queries overlapped. New evidence beyond the scripted pass:

1. The filler mechanism is loose substring matching, not just alphabetical padding. At limit 3 the pattern is visible directly: "dark mode" pulls `add_moderator` and `airplanemode_active` (the token "mode" as a substring), "databse" pulls mobile-data icons (the substring "data"), "auth" pulls `android_wifi_3_bar_lock`. Weak lexical candidates need a confidence floor instead of being promoted to fill the requested limit. This refines fix order item 1.
2. Small limits amplify the damage. At limit 6 the right icon usually appears somewhere; at limit 3 the filler occupies a third to two thirds of everything shown. Agents typically request small limits, so the confidence floor matters more than raw recall.
3. Brand and concept results interleave badly: "vibe coding" returns the right concept icon first, then unrelated brand logos (Base44, Bolt); "cursor logo" mixes the Cursor brand with generic mouse cursors. Intent separation between brand and concept spaces needs sharpening.
4. `recommend_icons` for "icons for a developer dashboard" resolved all six slots with reasonable picks (deployments to cloud-upload, monitoring to line-chart, databases to database-search, api keys to api, logs to logs, settings to settings) at medium confidence. Recommendation quality is not the problem; its hosted latency remains the open issue tracked separately.
5. One correction to the agent's own report: it judged "user profile" as having no avatar icon, but `account_box` (its third result) is a person avatar; the true defect is ranking wallet icons above it.
6. Not yet covered by either pass: inline preview rendering inside agent chat (`preview_icons` output display), which stays on the client compatibility matrix.

## Addendum 2: natural-usage sessions in OpenCode (owner-driven, same day)

Two natural prompts ("show me auth icons using supericons, show the preview" and "search and show me ship it icons") produced findings the fixed suites could not:

1. Agents self-heal around the search gaps, at a cost. The agent's own compound queries ("auth authentication security login", "login key password security", "2fa verify shield lock") returned weak or zero results, so it decomposed into single words (key, login, shield, password, lock, auth 2fa) and assembled an excellent answer. The user experience looks fine, but each self-heal burns several extra searches: the multi-word gap triples query volume and will consume allowance units invisibly once metering exists. Single tokens work where phrases fail ("deploy" returns deployed_code while "deploy to production" is zero), which reconfirms the intent-decomposition gap as the top real-world friction even when the surface outcome looks good.
2. `preview_icons` failed its first call with MCP error -32602 (invalid params), then succeeded on retry. Root cause identified in the tool schema: `icon_refs` is capped at 12 items and the agent, having gathered roughly 40 icons across its searches, passed too many and received a raw protocol error instead of guidance. Proposed fix for a future package release: accept a larger list and truncate to the preview limit with a note in the response, so a typical first call succeeds. Not added to the beta.2 scope without owner approval; recorded here as a tool-ergonomics defect the query suites cannot see.
3. Preview rendering is confirmed working end to end in OpenCode: the hosted PNG grid rendered inline in chat, and the web preview link opened the production grid with the agent-results banner (the preview persistence release behaving correctly in real use). This closes the OpenCode row of the client compatibility matrix for preview form.
4. Owner observation with product weight: for agent clients, plain search plus the agent's own orchestration already delivers what `recommend_icons` was designed for; the agent is the recommender. Combined with hosted recommendation latency (p50 42 s), this supports keeping `recommend_icons` out of the completion critical path and revisiting its role (possibly demoting it in agent-facing docs) as a separate decision.
5. Content gaps noted by the agent: no biometric or face-id icon surfaced for auth queries and no shield-check in Material or Lucide; `tabler:password-fingerprint` exists but did not rank for the broader auth queries.

## Addendum 3: aggregate analysis of the full test day (owner's admin export, 265 attempts)

The one-day export covering all of the above sessions (7 searchers, 265 attempts, 26.8% zero overall) yields four quantified findings:

1. The engine already contains the cure for multi-word failure, proven by its own telemetry. Queries the engine generated for itself (`recommend_variant` fanout, single concepts like gauge, pulse, cloud upload) had a 4% zero rate (1 of 24). Queries composed by agents (`agent_query`) had a 29% zero rate (70 of 241). Same engine, same day, same corpus: engine-chosen terms almost never miss. Applying the existing recommendation variant generator to direct search when a phrase scores weakly is therefore not speculative; its success rate is already measured at 96% in production telemetry. This becomes the implementation basis for the one-call contract's decomposition item.
2. Multi-word queries dominate failures: 52 of 69 distinct zero events were multi-word phrases; only 8 distinct single words ever zeroed (databases, k8s, burnout, notifcation, rollback, brainstorm, doomscrolling, chill). Multi-word behavior is also brittle rather than strictly AND: "rocket launch deploy ship delivery" returns 12 icons while the shorter "rocket ship boat vessel" returns zero.
3. No plural stemming: "database" succeeds, "databases" returns zero. A one-line normalization class of fix, distinct from synonyms.
4. Strict library filter plus multi-word is the worst combination: all three `si`-filtered multi-word queries returned zero (small sample, consistent direction). Cross-searcher note: the two scripted 72-attempt sessions produced identical 23-zero outcomes, confirming determinism at the telemetry layer as well; the natural agent session consumed 49 searches to answer two user prompts, quantifying the self-heal cost at roughly 24 searches per request.
