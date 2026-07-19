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
