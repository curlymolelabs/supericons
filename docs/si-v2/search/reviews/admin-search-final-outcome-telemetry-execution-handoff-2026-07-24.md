# Supericons final-outcome telemetry execution handoff

Status: Controlling implementation handoff  
Date: 2026-07-24  
Owning workstream: Admin dashboard and telemetry  
Production change authorized by this document: None  
Product behavior change authorized by this document: None

## 1. Purpose of this handoff

This document consolidates the incident evidence, product intent, current implementation facts, corrected measurement contract, cross-workstream dependencies, implementation boundary, test matrix, cutover rules, rollback plan, and completion rule for one bounded repair.

The repair must make the Supericons admin dashboard a trustworthy record of what people and agents actually received from:

- the Supericons website;
- Hosted MCP, including the ChatGPT app and other remote clients; and
- Local MCP from the npm package.

This is a telemetry and dashboard correction. It is not a Search v2 ranking change.

The controlling rule is:

> One countable product action produces one final top-level outcome. Internal searches, translations, retries, fallbacks, and diagnostics stay linked underneath it and never become peer user outcomes.

This handoff is standalone. An executor should not need the earlier discussion to understand the task.

## 2. Executive direction

Proceed with one bounded telemetry repair owned by the admin dashboard and telemetry workstream.

The implementation must:

1. record one truthful final Web outcome for each countable website search episode;
2. preserve separate Web, Hosted MCP, and Local MCP channels based on where the user entered;
3. keep internal hosted attempts as diagnostics;
4. stop the dashboard from treating a diagnostic zero as a product zero;
5. remove the database rule that hides stable Local MCP search outcomes;
6. preserve the hosted allowance ledger and its existing measurement unit;
7. align future zero-result recovery telemetry with the same identity model;
8. mark historical Web and Local MCP measurements as incomplete before their verified cutovers; and
9. leave search results, ranking, responses, interactions, latency-sensitive paths, and public contracts unchanged.

The dashboard cutover happens last, after raw database records prove the new contract end to end.

## 3. Why this matters to Supericons

### 3.1 Website purpose

The Supericons website helps a person search, inspect, compare, customize, copy, and download icons.

The website combines:

- immediate browser matching; and
- later hosted refinement.

The person cares about the useful icon choices finally shown on the site. They do not care how many internal search attempts were needed.

### 3.2 Hosted MCP purpose

Hosted MCP serves the ChatGPT app and other remote agent clients.

One MCP tool call should create one final tool outcome. Translation, fallback, query variants, and search-engine attempts are supporting work. They must not appear as separate user searches in headline metrics.

### 3.3 Local MCP purpose

The npm package gives local agents a local-first stdio path. It has different latency, privacy, fallback, and adoption characteristics from Hosted MCP.

Local MCP must remain a separate channel even when it calls shared hosted infrastructure.

### 3.4 Admin dashboard purpose

The admin dashboard is a protected operator tool. It should answer:

- Are people and agents receiving useful icon choices?
- Which real product queries end with no result?
- Which results appear weak or irrelevant?
- Which libraries, filters, and languages need attention?
- Which entry point is being used: Web, Hosted MCP, or Local MCP?
- Did a search fail because nothing matched, because a dependency failed, or because the user moved on?
- Are users copying, downloading, favoriting, or otherwise using the returned icons?

The dashboard must summarize product outcomes. It must not create its own version of truth by interpreting low-level attempts as if they were outcomes.

This repair supports the SI v2 charter:

- VC-3: usage-derived intelligence stays protected and server-side.
- VC-6: records remain honest.
- VC-7: human and agent channels remain first-class and are not mixed.

## 4. Incident verdict

The current Web dashboard data is not trustworthy for:

- Web search totals;
- Web zero-result rate;
- exact Web adoption;
- direct comparisons between Web and MCP channels; or
- judgments about whether Search v2 succeeded for a specific website query.

The failure is not proof that Search v2 ranking itself failed. It is proof that the measurement path cannot currently tell the difference reliably.

The primary defects are:

- no complete final-outcome contract for a website search that combines local and hosted work;
- a browser snapshot captured before hosted work necessarily finishes;
- a dashboard path that excludes ordinary browser search records;
- a hosted boundary that labels website diagnostics as Hosted MCP;
- query-and-time deduplication used as a substitute for event identity;
- stable Local MCP outcomes suppressed by a database function; and
- historical rows that cannot be reconstructed into final product outcomes safely.

## 5. Verified current implementation

The following facts were checked against the current repository on 2026-07-24.

### 5.1 Browser search snapshots can be premature

`main.js:518-529` builds the browser search payload from the current `state.filteredIcons.length`.

`main.js:567-573` stores that payload and writes it after the existing 2,500 ms idle interval.

Hosted refinement begins separately at `main.js:1960`.

Hosted results can later replace or extend `state.filteredIcons` at `main.js:1999`.

Waiting before writing therefore does not prove the stored count is final. The payload itself can still contain the earlier local count.

### 5.2 Existing timing constants are different concepts

The current website has:

- input debounce: 150 ms at `main.js:4229-4240`;
- countable-search idle interval: 2,500 ms through `SEARCH_ATTEMPT_IDLE_MS` at `main.js:172` and `main.js:571-573`.

These values must remain unchanged in this telemetry repair.

They must also receive different names in the contract and tests:

- `SEARCH_INPUT_DEBOUNCE_MS = 150`;
- `SEARCH_EPISODE_IDLE_MS = 2500`.

Changing either value would change product behavior or the meaning of a countable search and is outside this task.

### 5.3 Current browser deduplication is not event identity

`lib/icon-intelligence.js:246-290` logs browser searches through `si_log_icon_evidence`.

At `lib/icon-intelligence.js:263-276`, it builds a signature from query, result count, filters, and surface, then suppresses the same signature for 30 seconds.

This can:

- allow two rows for one search when the result count changes; and
- suppress a genuine second search when the same query and count repeat within 30 seconds.

A random episode ID is required. Query text and elapsed time must not decide whether two actions are the same event.

### 5.4 Website entry-point identity is lost at the hosted boundary

`lib/search-engine-client.js:120-143` sends `source = 'web'` by default.

The hosted request context at `mcp/remote-server.js:1335-1404` assigns:

- `channel = 'hosted_mcp'`; and
- `source = 'mcp'`.

The public website route is `/search-icons` at `mcp/remote-server.js:2254`.

This explains how internal work for a website search can appear as Hosted MCP diagnostics. Shared infrastructure must not replace entry-point identity.

### 5.5 The dashboard excludes ordinary browser records from its main identity path

`supabase/functions/admin-api/index.ts:1497-1570` loads current V2 identity telemetry from:

- `search_request_audit`; and
- `mcp_usage_events`.

That path does not load ordinary `icon_evidence` grid-search rows.

### 5.6 Stable Local MCP search outcomes are suppressed

`supabase/migrations/20260718100000_local_mcp_telemetry_attribution.sql:125-128` returns without inserting when:

- the tool is `search_icons`; and
- `beta_cohort` is null.

The current stable local writer calls `si_log_mcp_search_outcome_v2` through `mcp/telemetry.js:88-130`, but it does not send a client-generated episode ID.

Removing suppression is necessary, but exact idempotency for already-published legacy packages cannot be invented safely from query text and time.

### 5.7 Hosted search has a 20-second client timeout, Web search does not

`mcp/hosted-search-client.js:147` defines:

`HOSTED_SEARCH_REQUEST_TIMEOUT_MS = 20000`

The timeout is applied at `mcp/hosted-search-client.js:183`.

The browser client in `lib/search-engine-client.js:120-145` currently calls `fetch` without an explicit timeout.

The telemetry repair must not quietly add a browser fetch timeout or abort a search. That would change the website experience and belongs to a separate product decision.

### 5.8 Hosted allowance accounting depends on the attempt ledger

`supabase/functions/_shared/search-engine/rate-limit.ts:176-188` counts rows in `search_request_audit` for the dormant daily allowance.

The accepted measurement definition in `docs/si-v2/search/experiments/hosted-allowance-measurement-2026-07-19.md:65-72` states:

- one `search_request_audit` row is one hosted logical search;
- it is not one MCP tool call;
- recommendation fanout can consume several units; and
- translation or fallback searches consume additional units.

The new final-outcome ledger must not replace or change this allowance unit.

## 6. Verified production evidence

### 6.1 Rolling seven-day snapshot

A read-only production query at 2026-07-23 16:51:40 UTC, equivalent to 2026-07-24 00:51:40 SGT, found:

- 356 browser `search_attempt` records with `ui_surface = 'grid'` during the rolling seven-day window;
- four same-session, same-query transitions from zero to a positive count within 30 seconds;
- the shortest transition was 1.163 seconds; and
- the longest transition was 12.665 seconds.

The total is time-dependent because the window is rolling. It is evidence of omitted website activity, not a permanent product count.

### 6.2 Chinese website search trace

A read-only trace around the known Chinese website search found:

- a browser row with 1,981 results at 14:32:27 UTC;
- another browser row with 1,987 results at 14:32:34 UTC;
- a hosted attempt for the original Chinese query with zero results at 14:32:41 UTC;
- an English retry for `search` with 50 results at 14:32:46 UTC;
- the two hosted attempts shared the same request ID;
- both hosted attempts were labelled `hosted_mcp`; and
- a later browser row repeated 1,987 results at 14:35:08 UTC.

The stored Chinese text is visibly mis-encoded in the queried rows. This handoff does not reproduce the damaged value.

The trace proves:

1. the website had many visible results;
2. the hosted pipeline contained an internal zero and a successful retry;
3. the dashboard could select the internal zero while omitting the browser result; and
4. raw attempts are not a safe substitute for the final product outcome.

### 6.3 What the evidence does not prove

The transition records prove that stored counts changed after an initial snapshot.

They do not prove exactly what a person saw on screen at every moment.

A separate UX observation should verify whether the website visibly shows zero while hosted work is pending and whether a loading or settling state would help. That is a follow-up product question, not a blocker for truthful telemetry.

## 7. Non-negotiable scope boundary

This task must not change:

- Search v2 ranking;
- icon order;
- aliases;
- semantic meaning groups;
- multilingual mappings;
- local or hosted query planning;
- translation or fallback decisions;
- local and hosted result merge behavior;
- tool names, inputs, outputs, or schemas;
- Hosted MCP URL;
- ChatGPT app configuration;
- `preview_icons`, `get_icon`, or recommendation behavior;
- website icon rendering, copy, download, favorite, or search interactions;
- the 150 ms input debounce;
- the 2,500 ms countable-search idle interval;
- the hosted allowance unit;
- the current browser network timeout behavior;
- npm package bytes unless a separate package change is explicitly approved; or
- historical records through a manufactured backfill.

Telemetry writes must be best effort and non-blocking. A telemetry failure must not make search fail.

If a proposed implementation requires changing search output or user-visible search timing, stop and split that work into a separate product task.

## 8. Corrected identity model

Use three identity levels.

### 8.1 Recovery chain

`recovery_chain_id` groups a later recovery journey across more than one product action.

Example:

1. one MCP tool call returns an honest zero;
2. the product offers a narrower query;
3. the agent makes another MCP tool call;
4. the retry succeeds.

Those are two distinct product episodes linked by one recovery chain.

The recovery chain is grouping only. It is not the final-outcome identity and must not collapse separate tool calls into one event.

### 8.2 Episode

`episode_id` identifies one countable product action:

- one committed website search; or
- one MCP tool call.

Each episode produces at most one top-level final outcome.

Repeated identical queries are separate episodes when the person or agent intentionally searches again.

### 8.3 Attempt

`attempt_id` identifies internal work within one episode:

- original hosted search;
- translated query;
- fallback query;
- local candidate lookup;
- retry;
- grouped variant; or
- dependency error.

Attempts are diagnostics. They never enter the headline search count or zero-rate denominator.

### 8.4 Identity relationship

```text
recovery_chain_id
  episode_id for initial product action
    attempt_id 1
    attempt_id 2
  episode_id for later retry action
    attempt_id 1
```

This structure preserves both truths:

- one product action has one final outcome; and
- a recovery journey can span several real product actions.

## 9. Conflict with the future zero-result recovery work

`docs/si-v2/search/agent-zero-result-recovery-prd-2026-07-22.md:156-170` defines recovery telemetry with a recovery identifier and an original event or request identifier.

Its Phase 1 begins at line 367.

Before that Phase 1 is implemented, add a corrective note:

1. rename or define the recovery identifier as `recovery_chain_id`;
2. require a distinct `episode_id` for every tool call;
3. require an `attempt_id` for internal searches;
4. keep the initial miss and later retry as separate final outcomes;
5. link those episodes through `recovery_chain_id`; and
6. calculate recovery metrics across the chain without changing ordinary search counts.

Do not implement the recovery feature as part of this telemetry repair. Only align its future contract so it cannot create a second measurement grammar.

## 10. Final top-level event contract

Create one versioned final-outcome record for each eligible episode.

Required fields:

- `contract_version`
- `episode_id`
- `channel`
- `query`
- `environment`
- `traffic_class`
- `client_family`
- `tool_name`, nullable for Web
- `library_filter`
- `library_mode`
- `style`
- `locale`
- `final_match_count`
- `final_outcome`
- `settlement_state`
- `search_execution`
- `server_build`, when applicable
- `completed_at`

Recommended optional fields:

- `recovery_chain_id`
- `diagnostic_attempt_count`
- `legacy_identity_quality`
- `source_version`

Do not place raw IP addresses, raw session identifiers, credentials, protected ranking inputs, or internal semantic data in this record.

### 10.1 Final outcome values

- `success`: the final product response contained one or more matches.
- `zero`: every eligible search path completed successfully and the final product response contained no matches.
- `error`: the product reached a stable terminal state without establishing a valid result.

### 10.2 Settlement state values

- `completed`: eligible work finished normally.
- `failed`: a dependency or finalization path failed.
- `superseded`: a newer website query replaced the episode.
- `incomplete`: no stable final state was established.

`superseded` and `incomplete` are not top-level KPI outcomes. They may be diagnostic records.

### 10.3 Website outcome rules

| Local state | Hosted state | Final product outcome | Settlement | KPI eligible |
|---|---|---|---|---|
| Positive | Positive | Success | Completed | Yes |
| Positive | Zero | Success | Completed | Yes |
| Positive | Failure | Success | Failed | Yes |
| Zero | Positive | Success | Completed | Yes |
| Zero | Zero | Zero | Completed | Yes |
| Zero | Failure | Error | Failed | Yes, but excluded from zero denominator |
| Any | Superseded | No final outcome | Superseded diagnostic | No |
| Any | Still unresolved at observation deadline | No final outcome yet | Incomplete diagnostic | No |

A dependency failure does not erase valid local results. A dependency failure also does not become a true zero when local results are empty.

### 10.4 Observation deadline

Define:

`WEB_SEARCH_OBSERVATION_DEADLINE_MS = 20000`

This is a telemetry health deadline only.

It must:

- emit or update an `incomplete` diagnostic when hosted work has not settled after 20 seconds;
- remain excluded from final-outcome KPIs;
- not abort the browser fetch;
- not freeze or replace the result grid;
- not emit a top-level zero;
- not prevent a later real completion from writing the one final outcome; and
- not finalize a superseded episode.

This value aligns operational observation with the existing 20-second hosted client bound while preserving the website’s current network behavior.

If the product later introduces a visible website timeout, that requires a separate UX and product decision. The telemetry contract can then represent that actual terminal state.

## 11. Website episode lifecycle

The website implementation must follow this lifecycle:

1. A committed query state receives a random `episode_id` before its hosted request starts.
2. The input debounce remains 150 ms.
3. The query becomes countable after the existing 2,500 ms idle interval, Enter, or blur.
4. The episode ID travels with the hosted request.
5. Every hosted translation, fallback, and search attempt receives its own `attempt_id` and the parent `episode_id`.
6. A changed query creates a new episode and supersedes the old one.
7. A late response for an old episode cannot change the current grid or finalize the new episode.
8. When the current countable episode reaches a real terminal state, the browser coordinator computes the final displayed match count.
9. The browser reports the final event to a trusted server ingestion path.
10. The server derives or validates channel, environment, traffic class, and schema version.
11. The database accepts no more than one top-level final event for the episode ID.
12. A later intentional search for the same words receives a new episode ID.

The browser owns the meaning of the final displayed Web result because it knows the final merged state.

The server owns trusted classification and persistence because the browser must not be allowed to claim arbitrary production, organic, or channel labels.

## 12. Hosted MCP contract

Hosted MCP already has a natural product boundary: one tool call.

The repair must:

- preserve one final `mcp_usage_events` tool outcome per tool call;
- preserve distinct repeated identical tool calls;
- link hosted search attempts to the tool-call episode;
- keep translations and fallbacks as diagnostics;
- preserve the Hosted MCP channel for genuine remote calls;
- preserve tool responses and ordered icon references;
- preserve the current MCP URL and ChatGPT app configuration; and
- keep hosted dependency errors visible.

The public website route may share hosted infrastructure, but its diagnostic rows must retain a Web parent episode and must not become Hosted MCP product outcomes.

## 13. Local MCP contract and legacy limitation

### 13.1 Immediate repair

Remove the database suppression at:

`supabase/migrations/20260718100000_local_mcp_telemetry_attribution.sql:125-128`

After the verified cutover:

- stable Local MCP search outcomes must be stored;
- they must be labelled `local_mcp`;
- hosted fallback must remain an execution detail, not a channel change;
- repeated identical calls must not be deduplicated by query and time; and
- the dashboard must annotate the accounting cutover because volume will jump when hidden events become visible.

### 13.2 Exact idempotency limitation

The current stable local package does not send a client-generated episode ID through `mcp/telemetry.js:88-130`.

The database cannot reconstruct exact tool-call identity from:

- query;
- result count;
- session;
- timestamp; or
- a short deduplication window.

The executor must choose one of these bounded paths and document the proof:

1. **Backward-compatible server path:** accept each legacy RPC call as a distinct legacy final event, assign a server event ID, do not query-time deduplicate, and label its identity quality as legacy or best effort.
2. **Future exact path:** add a client-generated episode ID in a later immutable npm version, then enforce exact idempotency for that version.

Do not silently republish or mutate an existing npm version.

Do not expand this admin-dashboard repair into an npm release unless exact Local MCP idempotency is declared a material launch blocker and separately approved.

Until a client-provided episode ID is available, the dashboard must not claim stronger exactly-once guarantees for legacy local packages than the data supports.

## 14. Diagnostic contract

Internal work remains available for engineering diagnosis.

Recommended diagnostic fields:

- `contract_version`
- `attempt_id`
- `episode_id`
- `recovery_chain_id`, when applicable
- `attempt_number`
- `query_variant`
- `query_origin`
- `search_engine`
- `execution_route`
- `result_count`
- `status`
- `latency_ms`
- `error_code`
- `server_build`
- `created_at`

Diagnostics answer why an episode succeeded, returned zero, failed, or recovered.

They do not:

- create peer search rows;
- enter headline search totals;
- enter channel-adoption totals;
- enter true-zero denominators; or
- replace the product outcome.

## 15. Preserve D-030 allowance accounting

`search_request_audit` remains the hosted logical-search and allowance ledger.

This repair must not change:

- when a hosted logical search writes an audit row;
- how recommendation fanout is counted;
- how translation or fallback searches are counted;
- the daily allowance period;
- the per-client counter subject; or
- the dormant enforcement thresholds.

Add this regression gate:

> For a fixed request matrix, the exact `search_request_audit` row count and request-cost total are identical before and after the telemetry repair.

The matrix must include:

- one direct hosted `search_icons` success;
- one hosted zero;
- one translated or fallback search;
- one `recommend_icons` call with more than one generated search;
- one website hosted refinement; and
- one controlled test request.

If the row count or cost changes, stop the cutover. Re-derive the D-030 measurement artifact before allowance enforcement can ever be enabled.

Final-outcome storage must be additive. It must not reuse the allowance ledger as the KPI ledger.

## 16. Dashboard contract

### 16.1 Main Searches view

Show final top-level product outcomes only.

Recommended columns:

- query;
- channel;
- final outcome;
- final match count;
- library and style context;
- locale;
- searcher classification;
- country when legitimately derived;
- execution route;
- completion time; and
- legacy or incomplete coverage warning when applicable.

Do not show translated queries or fallback attempts as peer searches.

### 16.2 Diagnostics

Provide a separate drill-down or export for linked internal attempts.

The operator should be able to expand one final row and see:

- local count;
- hosted count;
- translation or fallback queries;
- timing;
- route;
- errors; and
- recovery-chain links.

### 16.3 Zero-rate denominator

The denominator contains eligible final product outcomes only.

Exclude:

- errors;
- superseded website queries;
- incomplete episodes;
- internal attempts;
- preview traffic;
- controlled tests when organic filters are active;
- unsupported non-search tool calls; and
- pre-cutover rows when showing trustworthy Web or Local MCP quality.

The numerator contains only final `zero` outcomes.

### 16.4 Channel adoption

Channel follows the client entry point:

- website equals `web`;
- remote agent or ChatGPT app equals `hosted_mcp`;
- local stdio package equals `local_mcp`.

Execution route is a separate field:

- local;
- hosted;
- hosted fused;
- hosted fallback;
- or another versioned route.

### 16.5 Positive results are not proof of relevance

A positive match count proves only that results were returned.

It does not prove that the icons were relevant.

The dashboard should preserve the ability to link later copy, download, favorite, or reviewed relevance evidence. Building a new relevance model is not part of this repair.

### 16.6 Screen and export parity

Dashboard screens, CSV exports, and any scorecard calculations must use the same:

- final-event source;
- eligibility filter;
- zero numerator;
- denominator;
- channel rule;
- test-traffic rule; and
- cutover dates.

## 17. Historical data and cutover policy

Do not manufacture a backfill.

### 17.1 Before the Web cutover

- Browser rows are legacy snapshots.
- Hosted website attempts have unreliable product-channel attribution.
- A hosted diagnostic zero may coexist with a successful final website experience.
- Exact final Web outcomes cannot be reconstructed safely.

### 17.2 Before the Local MCP cutover

- Stable Local MCP search outcomes may be absent because of database suppression.
- A later increase in recorded Local MCP volume is an accounting change, not necessarily organic adoption growth.

### 17.3 Required cutover markers

Record two independent verified timestamps:

- `web_final_outcome_cutover_at`;
- `local_mcp_coverage_cutover_at`.

Dashboard comparisons that cross either cutover must show a warning.

Pre-cutover rows may remain available for investigation, but the UI and export must not present them as comparable final outcomes.

## 18. Security, privacy, and trust boundary

The implementation must prove:

- the browser cannot choose trusted production, organic, registered, paid, or channel labels;
- the server derives or validates those classifications;
- random episode IDs reveal no query, session, account, or network information;
- no service-role credential enters the public bundle;
- no protected ranking or semantic intelligence enters the public bundle;
- the ingestion path has reasonable abuse and rate controls;
- telemetry failure does not block search;
- controlled test markers cannot be forged by an ordinary client;
- raw IP addresses and full session identifiers do not enter public reports; and
- diagnostics remain protected operator data.

## 19. Record-keeping requirements before implementation

The existing decisions remain valid:

- D-029: channel follows client entry point.
- D-030: hosted allowance thresholds and measurement grain.
- D-035: maintenance mode and the future recovery experiment.

Do not say D-029 is superseded. This repair enforces it.

Add the next accepted search decision, expected to be D-038 if no earlier decision is added first.

The decision must:

1. ratify the three-level identity model;
2. ratify final outcomes as the dashboard KPI source;
3. preserve `search_request_audit` allowance semantics;
4. preserve existing search behavior;
5. define Web and Local MCP cutovers;
6. mark historical metrics as incomplete;
7. constrain the later recovery experiment to `recovery_chain_id`, `episode_id`, and `attempt_id`; and
8. update the controlling Search v2 specification in the same change set.

Also correct:

- `docs/si-v2/search/reviews/admin-search-architecture-actual-flow-2026-07-23.html`, so it shows the browser coordinator owning final Web outcome meaning and a trusted server owning persistence;
- `docs/si-v2/search/agent-zero-result-recovery-prd-2026-07-22.md`, with the identity clarification before Phase 1.

## 20. Implementation plan

### Phase 0: Freeze the contract

1. Ratify the final-event, diagnostic, and identity contracts.
2. Add the new decision and specification change.
3. Correct the architecture HTML.
4. Add the recovery PRD identity note.
5. Record the unchanged timing constants and non-goals.

Exit gate:

- one unambiguous contract;
- no search behavior change;
- no conflict with D-030 or D-035.

### Phase 1: Additive storage and trusted ingestion

1. Add versioned final-event storage.
2. Add diagnostic linkage fields where needed.
3. Add the trusted Web ingestion path.
4. Add unique constraints for final episode identity.
5. Add server-side classification and validation.
6. Add migration rollback.
7. Keep current dashboard metrics unchanged.

Exit gate:

- additive schema only;
- legacy writers continue working;
- duplicate final episode writes are rejected or safely treated as the same write;
- no production KPI source changes.

### Phase 2: Writers and linkage

1. Add Web episode IDs to the browser search coordinator.
2. Propagate Web episode identity to hosted diagnostics.
3. Write one Web final outcome only after real settlement.
4. Record unresolved 20-second cases as diagnostics only.
5. Preserve the Hosted MCP final tool-event path.
6. Link Hosted MCP attempts to the tool-call episode.
7. Remove stable Local MCP suppression.
8. Implement the documented legacy Local MCP identity policy.
9. Preserve D-030 audit-row semantics.

Exit gate:

- raw rows match every deterministic case;
- no result, response, UI, or route changes;
- no telemetry failure affects search.

### Phase 3: Shadow verification

1. Leave current Web dashboard metrics marked untrusted.
2. Run the full matrix in Section 21.
3. Inspect raw database rows after every case.
4. Compare old diagnostics with new final events.
5. Verify exact allowance-ledger counts.
6. Verify site and MCP product output fingerprints or ordered refs are unchanged.

Exit gate:

- one final event per eligible episode;
- no false zero;
- no duplicate or missing top-level outcome;
- channel attribution follows entry point;
- D-030 counts are unchanged.

### Phase 4: Dashboard and export cutover

1. Switch Search history and headline metrics to final events.
2. Move attempts to diagnostics.
3. Apply the zero denominator.
4. Add both cutover markers and warnings.
5. Update CSV exports to the same contract.
6. Run the same cases through screen and export.

Exit gate:

- raw rows, dashboard, filters, KPIs, and exports agree.

### Phase 5: Bounded observation

1. Run a small labelled production test matrix.
2. Confirm controlled traffic is excluded from organic views.
3. Confirm the cutover timestamps.
4. Confirm no unexpected writer errors or latency effect.
5. Close the incident after deterministic evidence passes.

Do not wait for an arbitrary volume of organic traffic before closing the repair.

## 21. Required verification matrix

For every case, verify:

- product result or tool response;
- exact top-level final-event count;
- exact diagnostic-attempt count;
- parent and child IDs;
- dashboard row;
- KPI inclusion or exclusion;
- channel;
- environment and traffic class;
- screen and export parity; and
- unchanged search result order.

### 21.1 Website cases

1. Chinese query with original hosted zero and successful English retry.
2. Local positive and hosted positive.
3. Local positive and hosted zero.
4. Local positive and hosted failure.
5. Local zero and hosted positive.
6. Local zero and hosted zero.
7. Local zero and hosted failure.
8. Hosted work unresolved at the 20-second observation deadline.
9. Hosted work completes after the observation deadline.
10. Rapid typing supersedes at least two earlier queries.
11. A late response arrives for a superseded query.
12. The same intentional query is submitted twice.
13. Strict-library search returns zero.
14. Multilingual search records locale.
15. Controlled production-URL test traffic is identifiable.
16. Telemetry ingestion fails while search still works.
17. Enter commits a query.
18. Blur commits a query.
19. The 150 ms debounce and 2,500 ms idle behavior remain unchanged.

### 21.2 Hosted MCP cases

1. Normal `search_icons` success.
2. Honest no-result.
3. Translated or fallback recovery.
4. Hosted dependency error.
5. Repeated identical tool calls remain separate episodes.
6. Internal attempts never become peer searches.
7. A website call through `/search-icons` remains a Web episode.
8. Tool response, schema, ordered icon refs, and preview links remain unchanged.
9. Telemetry failure does not change the tool response.

### 21.3 Local MCP cases

1. Stable local-first search success.
2. Honest no-result.
3. Hosted fallback.
4. Repeated identical calls.
5. No stable event is suppressed.
6. Channel remains `local_mcp` during hosted fallback.
7. Legacy identity quality is labelled honestly.
8. No query-and-time dedupe collapses genuine calls.

### 21.4 Dashboard and export cases

1. Web filter contains only website entry points.
2. Hosted MCP filter contains only remote MCP entry points.
3. Local MCP filter contains only local stdio entry points.
4. A recovered query displays one final success with linked diagnostics.
5. A diagnostic zero does not appear as a final zero.
6. Superseded and incomplete episodes do not enter search totals.
7. Errors do not enter the true-zero denominator.
8. Controlled tests are excluded by default and visible when included.
9. Pre-cutover Web history shows incomplete.
10. Pre-cutover Local MCP history shows incomplete.
11. A comparison crossing a cutover shows a warning.
12. Screen and CSV export produce the same totals.

### 21.5 Allowance and dependency cases

1. Exact `search_request_audit` row counts match the pre-repair baseline.
2. Translation and fallback searches keep their existing units.
3. Recommendation fanout keeps its existing units.
4. The final-event ledger does not participate in allowance enforcement.
5. The future recovery PRD uses the same three-level identity model.

### 21.6 Security cases

1. Browser attempts to spoof channel are rejected or overwritten.
2. Browser attempts to spoof production or organic traffic are rejected or overwritten.
3. Duplicate final-event submission is idempotent.
4. Random identifiers contain no derived personal data.
5. Public bundles contain no credential or protected search intelligence.
6. Ingestion abuse limits do not affect normal search.

## 22. Material blocker definition

Only these findings block cutover:

- a false final outcome;
- duplicate or missing top-level final events for supported current clients;
- wrong entry-point channel;
- an incorrect zero numerator or denominator;
- a changed D-030 allowance unit or row count;
- spoofable trusted traffic classification;
- changed site, MCP, or search-engine product behavior;
- a privacy or protected-data boundary failure;
- dashboard and export disagreement; or
- a migration or rollback path that can corrupt or strand production data.

Examples of non-blocking follow-up findings:

- naming preference;
- code-style preference;
- optional additional diagnostic fields;
- an unrelated dashboard visual improvement;
- a new relevance-scoring idea;
- an unrelated search-quality edge case;
- a preview-tool issue; or
- a general release-framework improvement.

The designated measurement-integrity reviewer makes the initial materiality classification using this list. The product owner may promote a finding when it presents a concrete product or business risk. Minor findings do not reopen the repair.

## 23. Stop rule

This work gets:

1. one corrected contract;
2. one bounded implementation;
3. one independent measurement-integrity review;
4. one guarded dashboard cutover.

Do not create an open-ended sequence of broad re-audits.

If every material gate passes, the repair is complete. Record unrelated minor findings as separate backlog items.

If a material gate fails, roll back only the affected telemetry or dashboard component, correct the specific defect, and rerun the affected deterministic cases plus shared invariants. Do not reopen Search v2 ranking or the entire release system without evidence that they are involved.

## 24. Rollback plan

The implementation should be additive and independently reversible.

Required rollback controls:

- dashboard source can return to the previous source without deleting new rows;
- new Web final-event ingestion can be disabled without breaking website search;
- diagnostics continue independently of the headline KPI source;
- site changes can roll back separately from admin API changes;
- Hosted MCP telemetry linkage can roll back without changing tool behavior;
- Local MCP database suppression can be restored if the new writer causes a material problem;
- no migration rollback deletes historical evidence; and
- cutover timestamps remain recorded even if the dashboard rolls back.

The rollback simulation must prove that disabling telemetry does not disable search.

## 25. Required deliverables

The owning workstream should produce:

- the corrected architecture HTML;
- the new accepted decision and specification update;
- the recovery PRD identity note;
- additive database migration and rollback;
- trusted Web final-event ingestion;
- website episode lifecycle changes limited to telemetry coordination;
- Hosted MCP parent-child diagnostic linkage;
- Local MCP suppression removal and documented legacy identity handling;
- admin API final-event queries;
- dashboard and export cutover;
- deterministic tests for the full matrix;
- allowance-ledger regression evidence;
- a production verification record with both cutover timestamps;
- raw-count evidence with no personal identifiers; and
- a clean, scoped worktree with no unrelated files included.

## 26. Completion checklist

The repair is complete only when all items are true:

- [ ] One website search produces at most one final Web event.
- [ ] One Hosted MCP tool call produces one final Hosted MCP event.
- [ ] Stable Local MCP outcomes are no longer suppressed.
- [ ] Internal translations and retries are diagnostics only.
- [ ] Recovery-chain identity does not collapse separate episodes.
- [ ] Repeated identical intentional searches remain distinct.
- [ ] Superseded queries never become zeros.
- [ ] Unresolved observation deadlines never become zeros.
- [ ] Errors are excluded from the true-zero denominator.
- [ ] Channel follows the client entry point.
- [ ] Trusted classifications are server-controlled.
- [ ] Search result behavior is unchanged.
- [ ] Site and MCP latency-sensitive behavior is unchanged.
- [ ] D-030 audit-row counts are unchanged.
- [ ] Screen and export semantics match.
- [ ] Historical Web metrics show incomplete before cutover.
- [ ] Historical Local MCP metrics show incomplete before cutover.
- [ ] Both cutover timestamps are visible.
- [ ] Telemetry failure does not break search.
- [ ] Rollback is proven.
- [ ] Material findings are closed.

## 27. Recommended next action

Assign this file to the admin dashboard and telemetry executor.

The first implementation action is Phase 0 only:

1. add the new decision and specification update;
2. correct the architecture HTML;
3. add the recovery PRD identity clarification; and
4. return the exact proposed schema and migration boundary for one focused review.

After that focused contract check, proceed through additive storage, writers, shadow verification, and dashboard cutover without reopening unrelated Search v2 work.

## 28. Evidence sources

Repository sources:

- `main.js`
- `lib/icon-intelligence.js`
- `lib/search-engine-client.js`
- `mcp/hosted-search-client.js`
- `mcp/remote-server.js`
- `mcp/index.js`
- `mcp/telemetry.js`
- `supabase/functions/admin-api/index.ts`
- `supabase/functions/_shared/search-engine/rate-limit.ts`
- `supabase/migrations/20260718100000_local_mcp_telemetry_attribution.sql`
- `lib/admin-dashboard-v2.js`
- `lib/admin-dashboard-metrics.js`
- `docs/si-v2/search/decisions.md`
- `docs/si-v2/search/experiments/hosted-allowance-measurement-2026-07-19.md`
- `docs/si-v2/search/agent-zero-result-recovery-prd-2026-07-22.md`
- `docs/si-v2/search/reviews/admin-search-architecture-actual-flow-2026-07-23.html`
- `docs/si-v2/vision-charter.md`

Production data sources checked read-only:

- `public.icon_evidence`
- `public.search_request_audit`
- `public.mcp_usage_events`

No credentials, raw personal identifiers, protected ranking data, or internal model metadata are included in this handoff.
