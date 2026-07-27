# Search v2 production zero-result source audit

Date: 2026-07-22

Status: Source-verified audit, action required

Scope: Hosted MCP and synchronized Search v2 version 0.4.20

Verdict: **NO-GO on treating version 0.4.20 as a validated baseline for free-form agent search. GO on a bounded shared-route correction.**

## Executive finding

The reported zero results are real. They are not a dashboard export defect.

Direct read-only Supabase queries reproduced all 105 top-level zero-result events in the final 24-hour export window. Every exported zero matched the source row on event ID, normalized query, library, result count, server version, and timestamp. All 93 version 0.4.20 zero events recorded `search_execution: local_first`.

The browser can still show good results for the same phrase because it has a separate local fallback. The public page builds query variants in the browser and keeps those local results when the Railway response is empty. The hosted MCP caller receives only the empty Railway result and has no equivalent fallback. A direct live request to the Railway `/search-icons` endpoint returned zero for `network proximity graph nodes` and `hard hat construction worker`, both with and without the relevant strict library filter.

The primary defect was introduced by commit `674d7e027e56e7417c4efb160093cf2279d4fac6`, `release synchronized Search v2 surfaces`. The new normal local-first branch calls the file explicitly labeled as a local fallback engine once with the full phrase. It does not run the existing query-variant generator. The previous hosted handler does run those variants before candidate retrieval.

This is why a phrase such as `network proximity graph nodes` can return zero through hosted MCP while `graph nodes` immediately returns `phosphor:graph`, and why `hard hat construction worker` can return zero while `hard hat` returns `lucide:hard-hat`.

The immediate priority is to fix shared server-side retrieval. The proposed caller-agent recovery contract should not be the first remedy. Returning retry suggestions before exhausting safe deterministic recovery would add tool calls around a server routing defect.

## Audit questions and answers

### Did these searches really return zero?

Yes.

- The direct Supabase source contains 105 `search_outcome = zero` rows in the exact export window.
- The event CSV contains the same 105 zero events.
- The source and export have zero row-level disagreement for the zero-event facts.
- All zero rows are top-level `mcp_usage_events`, not lower-level hosted search diagnostics.
- The live Railway endpoint currently reproduces the same empty behavior for representative phrases.

### Is the dashboard data corrupted?

Not for the zero results.

The event export intentionally transforms two values for display:

- database outcome `results` becomes export outcome `success`;
- a null library filter becomes display value `all`.

Those are presentation normalizations, not data corruption.

The event CSV omits some non-search detail:

- Direct Supabase returned 376 `mcp_usage_events` rows for the window, while the CSV contained 345 of those rows.
- The 31 omitted rows were 26 non-search `tool_call` rows and 5 `preview` rows. They had no search outcome and do not affect the search denominator.
- Direct Supabase returned 111 `search_request_audit` rows, while the event CSV contained 56. The omitted rows are lower-level diagnostics and are not top-level user searches.
- All 105 top-level zero events were present and exact.

The grouped query CSV contains 102 zero rows while the event CSV contains 105 zero events because repeated queries can be grouped into one dashboard row. The event-level source is the correct source for attempt counts.

### Why does browser search work?

Browser search and hosted MCP do not currently behave the same.

The browser path:

1. builds a web search plan and query variants in `main.js:2080-2085`;
2. ranks local tier 1 and tier 2 results from those variants in `main.js:2116`;
3. calls the Railway endpoint in the background;
4. keeps the local results when the hosted result is empty in `main.js:1991-1994`.

The hosted MCP path:

1. enters `searchRailwayLocalIcons` in `mcp/remote-server.js:427`;
2. calls `searchLocalIcons` once with the complete query in `mcp/remote-server.js:461`;
3. accepts an empty array as a successful local response;
4. falls back to hosted search only when an exception is thrown, as shown in `mcp/railway-local-search.js:103-116`.

The public Railway `/search-icons` route uses the same direct local function at `mcp/remote-server.js:1929-1933`. Browser success therefore does not prove that the server returned a result. It proves that the browser's separate local ranking recovered after the server returned zero.

## Evidence set

### Final attached files

The files changed on disk once during the audit. This report uses the final stable copies only.

| File | Rows | SHA-256 |
|---|---:|---|
| `supericons-query-events-1d.csv` | 401 | `0d765d1e399f85dbdec9c130c74665fc652eda4e1c9d408832544af23d784dc7` |
| `supericons-queries-csv-1d (2).csv` | 376 | `305ec4b48eed74772aa0bd7b821ebefb5e4caa3d5700006e79343f9290a8f944` |

Export window: `2026-07-21T15:58:07.249Z` through `2026-07-22T15:53:14.914059Z`.

### Direct production sources

- Supabase table `public.mcp_usage_events`, queried read-only for the exact export window.
- Supabase table `public.search_request_audit`, queried read-only for the exact export window.
- Live Railway public endpoint `https://mcp.supericons.dev/search-icons`, queried with representative phrases.
- Current source and release history in this repository.

No production row, service configuration, deployment, or credential was changed.

### Private all-case ledger

The complete 94-query case ledger is stored locally at:

`data/admin/private/search-v2-zero-result-case-ledger-2026-07-22.md`

It is intentionally private and must not be committed or published. Decision `D-015` requires raw admin query evidence to remain in private analytics storage. This shareable report includes only reviewed generic examples and aggregate counts.

## Production measurements

### All top-level zero events

| Measure | Count |
|---|---:|
| Zero events | 105 |
| Distinct query and library pairs | 94 |
| Live or unclassified events | 99 |
| Controlled cohort events | 6 |
| `search_icons` zero events | 104 |
| `recommend_icons` zero events | 1 |
| Version 0.4.20 zero events | 93 |
| Version 0.4.19 zero events | 6 |
| Version 0.4.19-beta.2 zero events | 6 |

The six controlled events include two explicit nonsense canaries and four diagnostic queries. They should not be counted as ordinary customer failures.

### Version 0.4.20 outcome rate

For top-level version 0.4.20 calls in the exact window:

| Tool | Results | Zero | Error | Clarification | Zero rate |
|---|---:|---:|---:|---:|---:|
| `search_icons` | 86 | 92 | 0 | 0 | 51.7% |
| `recommend_icons` | 29 | 1 | 6 | 3 | 2.6% |
| Combined | 115 | 93 | 6 | 3 | 42.9% |

The direct-search sample is large enough to reject the idea that these are a few isolated bad prompts. It does not by itself estimate all-user search quality because the 24-hour workload contains clustered agent sessions and repeated debugging queries.

### Query shape

| Word count | Zero events | Share |
|---|---:|---:|
| 1 word | 10 | 9.5% |
| 2 words | 19 | 18.1% |
| 3 to 5 words | 68 | 64.8% |
| 6 or more words | 8 | 7.6% |

At least two words appear in 95 of 105 zero events. At least three words appear in 76 of 105. Multiword free-form agent requests are the dominant failure shape.

### Deterministic replay

The current repository engine and packaged icon data were replayed against every distinct zero query and its original library and locale filters.

| Replay result | Events | Distinct cases |
|---|---:|---:|
| Current full query now returns a result | 1 | 1 |
| Full query is empty, existing variant generator finds at least one result | 83 | 74 |
| No result from the current full query or existing variants | 21 | 19 |

The 83 variant-recoverable events are mechanical recovery opportunities, not 83 approved answers. Some variants are strong, while others are unsafe:

- Strong: `hard hat` returns `lucide:hard-hat`.
- Strong: `graph nodes` returns `phosphor:graph`.
- Strong: `shield check` returns `lucide:shield-check`.
- Strong: `audio waveform equalizer` returns `lucide:audio-waveform`.
- Unsafe: `connection` returns Phosphor Wi-Fi icons for a people-care relationship query.
- Unsafe: `forks` returns Git and grill fork icons for a forklift query.
- Unsafe: `minus` returns subtraction icons for a fortress query containing `minimal`.
- Unsafe: `hook` returns fish-hook icons for a crane-hook query.

This is why the fix must fuse and score candidate variants against the original request. It must not simply return the first nonempty subquery.

Only 2 of the 105 zero events matched a packaged Search v2 meaning group. Both were explicit brand searches whose requested brands were absent. The other multiword phrases stayed outside the reviewed meaning graph.

## Representative cases

| Original request | Requested scope | Production | Existing deterministic evidence | Audit classification |
|---|---|---:|---|---|
| `network proximity graph nodes` | Phosphor | 0 | `graph nodes` returns `phosphor:graph` | Confirmed false zero |
| `network graph nodes` | Phosphor | 0 | `graph nodes` returns `phosphor:graph` | Confirmed false zero |
| `hard hat construction worker` | Lucide | 0 | `hard hat` returns `lucide:hard-hat` | Confirmed false zero |
| `verification audit shield check` | Lucide | 0 | `shield check` returns `lucide:shield-check` | Confirmed false zero |
| `zoom out magnify minus` | Lucide | 0 | `zoom out magnify` returns `lucide:zoom-out` | Confirmed false zero |
| `car repair truck` | Material | 0 | `car repair` returns `material:car_repair` | Confirmed false zero |
| `connection two people together care relationship` | Phosphor | 0 | `connection` returns Wi-Fi icons, while the library contains people, handshake, heart, and hand-heart concepts | Context-composition failure, naive backoff unsafe |
| `forklift forks` | Tabler | 0 | `forks` returns Git and grill fork icons | Metadata or concept gap, naive backoff unsafe |
| `minimal citadel fortress castle tower geometric emblem` | All | 0 | Current backoff reaches `minus` | Backoff construction defect |
| `inbox` | Phosphor | 0 | Other libraries contain inbox icons | Honest strict-library gap, return useful guidance |
| `sweep` | Tabler | 0 | Material contains `sweep` | Honest strict-library gap, return useful guidance |
| `tow` | Tabler | 0 | Material contains `auto_towing` | Honest strict-library gap, return useful guidance |
| `salesforce logo` | All | 0 | No exact requested identity in the current data | Honest corpus gap unless the brand is added |
| `gong logo` | All | 0 | No exact requested identity in the current data | Honest corpus gap unless the brand is added |
| `checklist tarefas pendentes` | Lucide, Portuguese | 0 | Current locale path and variants find nothing | Localized metadata or composition gap |
| `clientes empresas contatos` | Lucide, Portuguese | 0 | Current variant maps `clientes` to unrelated library icons | Localized false-relevance risk |
| `????` | All | 0 | No deterministic match | Correct honest zero |
| `zzzzqv unsupported nonsense 918273645` | Lucide, controlled | 0 | No deterministic match | Correct controlled canary zero |

## Root cause

### 1. The synchronized release changed the normal hosted path

Before commit `674d7e027`, the hosted MCP handler called `searchHostedIcons`. The established hosted handler builds up to ten intent variants and additional ranking variants before candidate retrieval in `supabase/functions/_shared/search-engine/handle-search-request.ts:525-532`.

Commit `674d7e027` changed the normal path to `searchRailwayLocalIcons`. Its non-candidate branch calls `searchLocalIcons` once with the full query at `mcp/remote-server.js:460-467`.

### 2. The selected engine says it is fallback-only

`mcp/search.js:2-3` says:

> Local fallback search only. Do not treat this file as the production ranking engine.

The synchronized release nevertheless made it the normal production search path.

### 3. Full-phrase matching is strict outside reviewed meaning groups

The fallback engine expects all meaningful words to match candidate tokens in several direct scoring paths, including `mcp/search.js:478-484`. If the query frame does not match a reviewed meaning group and fuzzy correction does not qualify, one semantic path returns empty at `mcp/search.js:301`.

That behavior is reasonable for one direct stage. It is not a complete free-form agent search pipeline without decomposition and candidate fusion.

### 4. Empty is treated as success, so no fallback runs

`mcp/railway-local-search.js:103-116` falls back to hosted search only inside `catch`. An empty array is a successful return value, so the previous hosted variant search is never consulted.

### 5. The browser masks the server defect

The browser independently runs query variants and local ranking before its background hosted request. When hosted results are empty, it leaves the local set on screen. This makes browser quality look healthy while hosted MCP records a genuine zero.

## Why the release gates missed it

### Live probes were too curated

The synchronized live verifier checks:

- `application settings`;
- `amazing`;
- `sports`;
- localized equivalents;
- `dropdown`;
- one nonsense query.

These are exact or explicitly reviewed meaning-group cases. The verifier did not include an unseen free-form 3 to 6 word agent description under a strict library filter.

### The 225-case fingerprint is not a relevance oracle

`scripts/verify-search-v2-phase1-parity.mjs:74-93` runs 225 cases, confirms that every observation contains a result array, and fingerprints the arrays. It does not assert an acceptable icon family for every case in that script. A stable fingerprint can preserve a stable zero.

### Meaning coverage proved only reviewed phrases

The 244 English and 612 localized gates validate the 49 reviewed meaning groups. Production agent phrases do not automatically map to those groups. The 24-hour sample shows that only 2 zero events matched a meaning group.

### Surface parity was structural, not behavioral

Version, route label, package fingerprint, and selected canaries were synchronized. Browser and MCP recovery behavior were not. The browser has a local fallback that the MCP contract does not expose.

## Relationship to Search v2 version 0.4.20

Version 0.4.20 did improve reviewed broad terms such as `amazing`, `sports`, and maintained localized equivalents. Those improvements are real within their tested meaning groups.

It did not deliver general natural-language composition for arbitrary agent phrases. Embedding and hybrid phases `P3` through `P6` remain unimplemented or paused, as recorded in `docs/si-v2/search/implementation-status.md:71-74`.

The release claim becomes misleading when interpreted as broad free-form agent search. The production defect is not that Search v2 failed to understand every sentence. The defect is that the synchronized route skipped deterministic decomposition already used by the previous hosted path and by the browser fallback.

The current `agent-zero-result-recovery-prd-2026-07-22.md` correctly protects honest zeros, but it starts after the wrong boundary. It treats the caller's extra retry as the first recovery stage. The source evidence shows that many misses should first be resolved inside the existing search call.

## Required correction

### Phase 0: Fix the shared server pipeline

Implement one shared search executor for hosted MCP, public Railway search, and local npm search:

1. Run exact identity and reviewed meaning-group search.
2. If empty, build bounded query variants with the existing generator.
3. Retrieve candidates for all approved variants.
4. Fuse and rerank candidates against the original query, not only the subquery.
5. Apply a confidence floor and forbidden-family checks.
6. Preserve strict library behavior.
7. Return an honest zero only after safe internal recovery is exhausted.

Do not wire the current `searchLocalFallbackIcons` result concatenation directly into production without a relevance gate. The unsafe examples above show why first-nonempty backoff is insufficient.

### Phase 1: Add contextual composition rules

The initial bounded set should cover repeated production shapes:

- connected people, relationship, care, and social graph;
- graph, network nodes, proximity, and hierarchy;
- construction worker, hard hat, and tools;
- inbox, queue, review, and empty state;
- attachments, route, travel time, and links;
- financial up, down, gain, and loss;
- localized people, company, contact, and task concepts.

Each rule needs acceptable and forbidden icon families. For example, a people-care relationship fixture may accept users, handshake, hand-heart, or heart-linked concepts and must reject Wi-Fi icons.

### Phase 2: Turn the private zero ledger into a judged regression corpus

Classify every private case as one of:

- must return a result;
- may return an honest zero;
- must return an honest zero;
- strict-library gap with labeled cross-library guidance;
- clarification required;
- controlled traffic excluded from quality metrics.

For must-return cases, record acceptable top icon families and forbidden families. A count-only test is not enough.

### Phase 3: Test the real surfaces

Release gates must call all of these exact paths:

- hosted MCP `search_icons`;
- Railway public `/search-icons`;
- local npm stdio `search_icons`;
- browser search with hosted success;
- browser search with hosted zero;
- strict Phosphor, Lucide, Tabler, and Material cases;
- all maintained locales with at least one free-form multiword case.

The same query, filters, and release bytes must produce equivalent ranked icon identities or an explicitly labeled surface-specific fallback. Route parity cannot be inferred from a shared version string.

### Phase 4: Revise the caller recovery contract

Keep the proposed agent-cooperative recovery contract as a second line of defense:

1. safe internal deterministic recovery;
2. structured suggestions for still-empty meaningful requests;
3. one caller-controlled retry;
4. clarification or honest stop.

This avoids charging users extra calls for misses the server can already resolve.

## Acceptance gates for the hotfix

1. `network proximity graph nodes`, strict Phosphor, returns `phosphor:graph` or another reviewed graph family.
2. `hard hat construction worker`, strict Lucide, includes `lucide:hard-hat` in the approved top range.
3. `verification audit shield check`, strict Lucide, includes `lucide:shield-check`.
4. People-care relationship fixtures never return Wi-Fi as a confident result.
5. Forklift fixtures never return Git forks or eating utensils as a confident result.
6. Fortress fixtures never return subtraction icons because of `minimal`.
7. Crane-hook fixtures never return fish hooks as a confident result.
8. Strict-library gaps remain strict and provide labeled guidance instead of silently crossing libraries.
9. Brand identities absent from the corpus remain honest zeros.
10. Nonsense canaries remain zero.
11. All 94 private cases have an explicit expected class.
12. Hosted MCP, public Railway, npm stdio, and browser paths pass the same judged corpus.
13. Warm local search p95 remains within the accepted Search v2 limit.
14. Production telemetry records the final search stage, selected variant when applicable, server build, and whether fallback was used.

## Deployment recommendation

Do not deploy the current caller-retry PRD as the primary fix. Do not reopen embeddings or add a model call yet. The evidence points first to a deterministic route-wiring and fusion defect.

The next executor should make one bounded correction to the shared search path, run the judged case corpus, and perform one guarded synchronized deployment. If a safe deterministic fusion cannot pass the relevance fixtures, restore the previous hosted `search_icons` path for hosted MCP while keeping the Railway recommendation path separate. That rollback is preferable to normalizing a 51.7% direct-search zero rate.

## Evidence limitations

- The 24-hour workload includes clustered agent sessions and repeated diagnostic searches, so its zero rate is not a general population estimate.
- The current repository replay is not proof of the exact deployed container bytes. One Chinese query recorded a production zero but returns results in the current local replay, which requires a build-level parity check.
- Many nonempty variant results are only candidates. They require relevance judgment before promotion.
- Direct Railway platform logs were not required to establish the defect. Direct Supabase rows, live endpoint responses, source code, and commit history agree.
- Raw searcher identifiers and raw private exports are intentionally excluded from this document.

## Auditor decision requested

Please decide only these questions:

1. Does the source evidence support a real hosted MCP false-zero defect rather than export corruption?
2. Is commit `674d7e027` the correct introduction point for the missing decomposition stage?
3. Is shared server-side variant fusion the correct first fix?
4. Are the proposed relevance and surface-parity gates sufficient to prevent a repeat?
5. Should the existing caller recovery PRD be reordered behind internal deterministic recovery?

