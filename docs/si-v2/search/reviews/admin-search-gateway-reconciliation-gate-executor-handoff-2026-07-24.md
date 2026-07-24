# Admin Search Gateway Reconciliation Gate and Conditional Repair Handoff

Date: 2026-07-24

Status: The diagnostic gate is authorized. No telemetry patch, schema change, search change, or deployment is authorized until the gate results are recorded and reviewed.

## 1. Purpose

The Supericons admin dashboard exists to answer two different questions without mixing them:

1. How are people and agents using the three supported search surfaces?
2. Can an operator trace the lower-level work behind those product actions when something looks wrong?

The three supported product channels remain:

- Web
- Hosted MCP
- Local MCP

The main Search History must count one final outcome for each eligible website search episode or MCP tool call. Internal search attempts, retries, fallbacks, direct gateway probes, superseded website work, and incomplete work remain diagnostics. They must be available for investigation without inflating product-search totals.

This handoff addresses one measured accounting gap: some production gateway requests exist in the raw search audit table but are absent from the dashboard audit bundle. It does not change Search v2 behavior.

## 2. Executive decision

Proceed in this order:

1. Build and run one five-probe diagnostic gate.
2. Record the evidence before changing implementation.
3. If the evidence confirms only a diagnostic-accounting gap, implement one bounded telemetry and export patch.
4. Run the same gate again.
5. Verify search fingerprint parity.
6. Complete one focused review and stop.

Anything newly discovered becomes evidence for a separate task. It does not expand this work automatically.

## 3. Governing contract

The implementation must preserve these existing decisions:

- `FR-45`: telemetry venue identifies the client entry point, not the server that performs internal work.
- `FR-53`: live verification uses a server-verified controlled-run marker. Missing, invalid, forged, or expired markers remain normal traffic.
- `FR-54`: one final top-level outcome is recorded for each eligible website search episode or MCP tool call. Internal attempts never enter search totals or the true-zero denominator.
- `VC-6`: records stay honest.
- `VC-7`: agents are first-class citizens while humans keep the website flow.
- `VC-9`: the owner controls changes to the default experience.

The relevant contract is in `docs/si-v2/search/search-engine-v2.md`. This task must not amend it.

## 4. Verified current evidence

### 4.1 Downloaded audit bundle

The downloaded production artifact `supericons-audit-bundle-24h-20260724T112737Z.json` was inspected directly.

It reports:

- generated at `2026-07-24T11:27:37.927Z`;
- period `24h`;
- channel `all`;
- `include_test: true`;
- 228 Search Summary rows;
- 196 Request Log rows;
- 45 Web rows;
- 267 Hosted Diagnostics rows; and
- integrity status `passed`.

The exact case-insensitive query `ship it` appears zero times in all four sections.

The same bundle contains a metadata contradiction:

- the requested filter reports `include_test: true`; but
- `source_meta.filter_key` contains `include_test=false`.

This proves that the downloaded bundle did not expose the `ship it` gateway requests and that its filter metadata is not internally trustworthy.

### 4.2 Production database observations to recheck in the gate

Production inspection associated with this incident reported four `ship it` rows in `search_request_audit` between 10:48 and 10:49 UTC on 2026-07-24. The reported rows:

- used the production environment;
- were labelled `hosted_mcp` at the raw boundary;
- had no website episode ID;
- had no verified controlled-run marker;
- returned results;
- had no corresponding MCP usage event; and
- produced no final outcome.

These observations establish the incident specimen, but the new gate must query and record the relevant production rows again rather than treating this historical observation as permanent truth.

### 4.3 Current linkage limitations

The database schema contains `mcp_usage_events.search_request_audit_id`, but current repository writers do not populate it reliably.

The incident database inspection reported:

- 0 of 8,147 `mcp_usage_events` rows had `search_request_audit_id`; and
- only 1 of 8 recently sampled hosted audit rows with a request ID matched a usage event.

These production figures must be remeasured by the gate and reported with the gate's fixed cutoff. They must not be used as an implementation assumption.

The source supports the concern:

- `supabase/migrations/20260704_mcp_usage_ledger.sql` defines `search_request_audit_id` as optional.
- `mcp/remote-server.js` does not add `search_request_audit_id` to its Hosted MCP usage payload.
- The final-outcome trigger links a final record to `mcp_usage_events`, not directly to every raw audit attempt.

The source also records the intended identity propagation:

- `mcp/hosted-search-client.js` accepts `episode_id` and `recovery_chain_id` in its usage context.
- `scripts/verify-search-telemetry-linkage.mjs` asserts that single and grouped hosted attempts receive the parent episode and recovery identifiers.

The gate must determine whether the current live path satisfies that intended contract. It must not assume that a low historical request-ID match rate proves a missing writer field.

## 5. Bug classification

Primary classification: specification and observability gap.

The final-outcome model intentionally counts website episodes and MCP tool calls. It does not currently guarantee that every raw gateway request is represented in the exported diagnostic accounting.

Secondary confirmed defects within the same accounting boundary:

- contradictory `include_test` metadata in the downloaded bundle; and
- previously observed loss of controlled-test classification when some source events become final outcomes.

The separate rapid-typing Web episode ownership concern is not part of this task.

## 6. Product interpretation

The public `/search-icons` route is a shared search transport. Public reachability alone does not create a fourth product channel.

Do not add a `Direct API` product channel in this task.

Classify an episode-less, unlinked gateway request as a diagnostic unless a future approved product contract explicitly introduces a public REST API surface.

The existing `ship it` rows must not be reclassified retroactively as controlled tests. A server-verified marker was not present.

## 7. Scope

### 7.1 Authorized gate work

The implementation owner may:

- add one diagnostic gate script;
- run five bounded production probes;
- query the relevant telemetry tables and admin endpoints read-only after those probes;
- write a public-safe evidence artifact; and
- run existing local contract and fingerprint checks.

The probes naturally create normal telemetry records. Apart from those expected records, the gate must make no production mutation.

### 7.2 Conditional patch scope

Only after the gate confirms the expected defect, the implementation owner may propose one patch that:

- includes eligible unlinked gateway requests in diagnostic accounting;
- reconciles raw audit requests with final outcomes or explicit diagnostic explanations;
- makes bundle integrity fail on unexplained disappearance after a grace period;
- preserves server-verified controlled-test classification;
- corrects `include_test` filter metadata; and
- adds regression coverage for the confirmed paths.

The patch is not authorized until the gate evidence is reported.

### 7.3 Access preconditions

The gate requires:

- authenticated read access to the production telemetry tables or an existing trusted admin endpoint that exposes the required source rows;
- the current controlled-run signing secret for signed network probes;
- access to the production website and Hosted MCP endpoint;
- the currently published Local MCP package; and
- a local output location that is excluded from public deployment.

If any required access is unavailable, stop and request only the missing access. Do not replace a signed product-path probe with an unsigned call. The only deliberately unsigned call is direct gateway case 4.

### 7.4 Explicit non-goals

Do not:

- add a fourth product channel;
- change the dashboard headline;
- change Search v2 ranking, query expansion, fallback, or result order;
- change HTTP or MCP response schemas;
- change the website search coordinator;
- change the 150 ms input debounce or 2,500 ms search-episode idle interval;
- change search allowances or rate-limit enforcement;
- add a database field merely for possible future use;
- populate a singular audit backlink with an arbitrary child attempt;
- join records by query text plus approximate time;
- reconstruct or relabel historical traffic;
- repair the separate Web rapid-typing race;
- change npm packages or publish an npm version; or
- deploy anything before the gate report is complete.

## 8. Gate implementation

### 8.1 Proposed script

Add a dedicated script with a clear name such as:

`scripts/verify-admin-search-gateway-reconciliation-live.mjs`

Reuse existing helpers where possible:

- `mcp/controlled-run-auth.js`
- `scripts/verify-search-telemetry-linkage.mjs`
- `scripts/verify-controlled-run-auth.mjs`
- existing admin authentication and request helpers

Do not embed credentials or marker signatures in source or evidence.

### 8.2 Run identity

Generate one run ID and stable request identities before the probes begin.

Prefer stable search phrases plus unique request, episode, recovery, and controlled-run identifiers. Do not depend only on modifying query text, because a random suffix can change search relevance and invalidate the search fingerprint comparison.

The evidence artifact must still record the exact query used for each probe.

### 8.3 Five production probes

Run exactly these product and gateway cases:

| Case | Entry path | Test declaration | Expected top-level result | Expected supporting records |
|---|---|---|---|---|
| 1 | Actual production website search | Signed network controlled-run marker | One controlled Web final outcome | One or more linked Web or hosted diagnostics |
| 2 | Actual production Hosted MCP `search_icons` tool call | Signed network controlled-run marker | One controlled Hosted MCP final outcome | One or more linked raw hosted attempts |
| 3 | Published Local MCP `search_icons` tool call | Package-supported controlled-run mechanism | One controlled Local MCP final outcome | Local usage event and any linked fallback diagnostics |
| 4 | Direct production `/search-icons` request | No marker | No product final outcome | One unclassified gateway diagnostic |
| 5 | Direct production `/search-icons` request | Valid signed marker | No product final outcome | One controlled gateway diagnostic |

For the website case, browser automation must exercise the real production page, input, episode coordinator, hosted request, displayed result settlement, and browser final-event writer. Directly calling `/search-icons` is not a website test.

For the Hosted MCP case, use the actual MCP protocol and `search_icons` tool. Directly calling `/search-icons` is not a Hosted MCP test.

For Local MCP, use the actual published package over stdio. Use its supported controlled-run mechanism. Do not claim a signed HTTP marker when that transport does not use one.

Invalid, forged, and expired marker cases remain deterministic unit fixtures. Do not add more production probes for them.

### 8.4 Fixed cutoffs

Record:

- bundle data cutoff `T`; and
- reconciliation cutoff `T minus 120 seconds`.

Rows newer than the reconciliation cutoff are `pending_linkage`. They must remain visible in diagnostic evidence but must not fail reconciliation until the grace period expires.

Rows older than the reconciliation cutoff must resolve through the identity ladder or be reported as unexplained.

The 120-second grace period must be one named constant with a fixture covering:

- just inside the grace period;
- exactly at the boundary; and
- just outside the grace period.

### 8.5 Exact identity ladder

Resolve raw audit rows in this order:

1. Exact `search_request_audit_id`, when present.
2. Exact shared `episode_id`.
3. Exact shared `recovery_chain_id`.
4. Exact request or dedupe identity only when uniqueness is proven within the run.
5. `pending_linkage` inside the grace period.
6. Unlinked diagnostic outside the grace period.

Never join using:

- query text plus time;
- client family plus time;
- IP or user-agent similarity;
- library plus result count; or
- nearest-record heuristics.

One top-level MCP action may own several child audit attempts. The gate must support one-to-many linkage through episode or recovery identity. A singular `search_request_audit_id` cannot represent that fan-out by itself.

### 8.6 Link-rate report

Report the count and percentage of eligible raw rows resolved at each tier:

- audit backlink;
- episode ID;
- recovery-chain ID;
- exact request or dedupe identity;
- pending linkage;
- explained unlinked diagnostic; and
- unexplained.

Report separate rates for:

- Web;
- Hosted MCP;
- Local MCP fallback diagnostics;
- signed direct gateway probes; and
- unsigned direct gateway probes.

Do not combine these into one headline percentage that hides a failing product path.

## 9. Evidence artifact

The before and after gate must write the same schema so their results can be compared mechanically.

Suggested location:

`references/verification/admin-search-gateway-reconciliation-<run-id>.json`

The artifact must include:

- schema version;
- run ID;
- generated time;
- data cutoff;
- reconciliation cutoff;
- grace-period seconds;
- deployment and source versions when publicly safe;
- each probe's entry path;
- exact query;
- request, episode, and recovery identifiers in public-safe form;
- whether the marker was expected, verified, absent, or rejected;
- expected rows by table;
- observed rows by table;
- exact linkage tier used;
- final or diagnostic role;
- traffic class;
- result count and ordered icon-reference fingerprint;
- pass or fail per probe;
- link-rate counts by tier and path;
- pending rows;
- explained exclusions;
- unexplained rows;
- stable search fingerprint comparison; and
- overall gate verdict.

The artifact must exclude:

- credentials;
- controlled-run secrets or signatures;
- API keys;
- raw IP addresses;
- full user-agent strings;
- raw personal identifiers;
- private prompts; and
- internal model or review-process metadata.

## 10. Gate decisions

### 10.1 Expected branch

If Web, Hosted MCP, and Local MCP each produce exactly one correct final outcome, while direct gateway probes are present only in raw audit storage and disappear from the exported diagnostic accounting:

1. Mark the product paths as passing.
2. Mark diagnostic export reconciliation as failing.
3. Propose the one bounded telemetry and export patch in Section 11.

### 10.2 Product-path failure

If Web, Hosted MCP, or Local MCP does not produce its expected final outcome:

1. Stop.
2. Record the failing path and exact evidence.
3. Do not expand the gateway patch.
4. Open a separate defect for that product surface.

### 10.3 Identity failure

If current exact identities cannot link genuine Hosted MCP child attempts:

1. Stop after the gate report.
2. Report link rates and the first exact point where identity is lost.
3. Propose the smallest writer correction.
4. Do not implement it automatically.
5. Do not add a schema field until existing episode and recovery propagation has been tested end to end.

### 10.4 Unexpected new finding

Record it as separate evidence. Do not add it to the current patch without a new bounded decision.

## 11. Conditional implementation plan

This section is a proposed branch, not authorization to implement before the gate.

### 11.1 Diagnostic accounting

Expose eligible raw gateway audit rows in the diagnostic data used by the Request Log and audit bundle.

Each row must receive a derived accounting status such as:

- linked diagnostic;
- pending linkage;
- explained unlinked gateway diagnostic; or
- unexplained.

Do not promote these rows into Search Summary or final-outcome totals.

Prefer deriving this status from existing fields. Add persistent schema only if the gate proves that exact classification is impossible without it.

### 11.2 Source-backed integrity

Replace self-contained bundle reconciliation with a bounded source-backed check.

For the same fixed window and cutoff, the integrity result must compare:

- eligible `search_request_audit` rows;
- relevant `mcp_usage_events` rows;
- `search_final_outcomes`;
- `search_episode_diagnostics`; and
- exported summary, request, Web, and diagnostic records.

The check passes only when every eligible source record is:

- linked to exactly one product action;
- retained as an explained diagnostic;
- pending inside the grace period; or
- excluded for a recorded contract reason.

An unexplained row older than the grace period makes source reconciliation fail.

The bundle may retain separate structural and semantic checks, but its overall result must not report `passed` when source reconciliation fails.

### 11.3 Test-traffic propagation

Preserve server-verified controlled traffic across:

- raw request audit;
- MCP usage event;
- final outcome;
- dashboard filtering; and
- export metadata.

Missing or invalid markers remain normal or unclassified traffic. Do not infer test status from query text, timing, client family, or operator memory.

### 11.4 Filter metadata

The exported `filters.include_test`, source metadata, filter key, snapshot identity, screen state, and downloaded filenames must describe the same request.

Add a regression fixture that would fail on the observed state:

- `filters.include_test` is `true`; and
- `source_meta.filter_key` contains `include_test=false`.

### 11.5 Conditional writer correction

Only if the gate proves live Hosted MCP attempts lose their parent identity:

- locate the first boundary where `episode_id` or `recovery_chain_id` is dropped;
- propagate the existing parent identity to every child attempt;
- preserve one-to-many fan-out;
- keep `attempt_id` unique per child; and
- keep `attempt_number` ordered within the parent action.

Do not set one singular audit backlink to an arbitrary child and treat that as complete linkage.

The existing `scripts/verify-search-telemetry-linkage.mjs` fixture must remain passing and should be extended to cover the confirmed live failure mode.

## 12. Regression protection

At minimum, add or extend checks for:

1. One Web final with linked diagnostics.
2. One Hosted MCP final with linked child attempts.
3. One Local MCP final.
4. Unsigned direct gateway probe remains an unclassified diagnostic.
5. Signed direct gateway probe remains a controlled diagnostic.
6. Direct gateway diagnostics never enter product totals.
7. Valid markers become controlled traffic.
8. Invalid, forged, and expired markers fail closed.
9. One-to-many hosted fan-out retains parent identity and unique attempt identity.
10. Repeated identical product calls remain separate actions.
11. Grace-window rows remain pending.
12. Old unexplained rows fail source reconciliation.
13. `include_test` metadata agrees everywhere.
14. Search Summary, Request Log, diagnostic export, and audit bundle reconcile at one fixed cutoff.
15. Search fingerprints remain unchanged.

Relevant existing checks include:

- `scripts/verify-controlled-run-auth.mjs`
- `scripts/verify-search-telemetry-linkage.mjs`
- `scripts/verify-admin-final-outcome-contract.ts`
- `scripts/verify-admin-dashboard-search-export-contract.mjs`
- `scripts/verify-admin-dashboard-v2-telemetry-integrity.mjs`
- `scripts/verify-admin-dashboard-phase-b-browser.mjs`
- `scripts/verify-search-v2-hosted-route-product.mjs`
- `scripts/verify-search-v2-hosted-route-integrity.mjs`

## 13. Search fingerprint parity

Do not require byte-for-byte equality from live responses because request IDs and timing fields may change.

Compare a stable fingerprint containing:

- HTTP status;
- stable response-schema fields;
- result count;
- ordered icon references;
- search execution mode;
- error code and retryability for error fixtures; and
- MCP structured-result fields that are part of the public contract.

Exclude:

- request IDs;
- timestamps;
- worker age;
- timing measurements; and
- other documented nondeterministic fields.

The patch passes only if the before and after fingerprints match for the same fixed queries and surfaces.

## 14. Rollout and rollback

No rollout begins before the gate report.

If the conditional patch changes only admin API and export behavior:

1. Verify locally.
2. Run the full relevant admin packet.
3. Deploy through the existing guarded admin release path.
4. Run the same five-probe gate.
5. Download and inspect the resulting audit bundle.
6. Roll back the admin deployment if source reconciliation, product totals, or filter parity fails.

If a Hosted MCP telemetry writer correction becomes necessary:

1. Treat it as a separate deployable component within the same approved measurement boundary.
2. Prove search fingerprint parity before deployment.
3. Deploy through the existing guarded Railway path.
4. Re-run the same gate.
5. Roll back immediately if search behavior, product totals, or product-channel attribution changes unexpectedly.

No npm publication is part of this work.

## 15. Deferred Web episode concern

The previously observed rapid-typing episode ownership concern is deferred.

A future task may reproduce it using:

- rapid typing;
- at least one superseded request;
- one late hosted response;
- exact episode IDs;
- the final visible query; and
- direct database inspection.

That future task must not be folded into this gateway reconciliation work.

## 16. Completion criteria

This task is complete only when:

- the before gate artifact exists;
- its findings are reported before implementation;
- any implemented patch matches the confirmed gate branch;
- the after gate uses the same artifact schema;
- every product probe has exactly one correct final outcome;
- every direct gateway probe has no product final and one visible diagnostic accounting path;
- no unexplained source row older than the grace period is omitted;
- controlled and unclassified traffic remain correctly separated;
- export filter metadata agrees with the requested filter;
- search fingerprints match;
- the three product-channel totals and headline meaning remain unchanged except for correctly included controlled outcomes when explicitly requested;
- rollback has been verified; and
- no unrelated defect was added to the work.

## 17. First instruction to the implementation owner

Run the five-probe diagnostic gate and produce the evidence artifact. Make no code, schema, configuration, or deployment change before reporting the gate results.
