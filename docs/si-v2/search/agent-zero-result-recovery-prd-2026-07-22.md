# Agent zero-result recovery PRD

Date: 2026-07-22

Status: Proposed for implementation

Product area: Search v2, MCP agent experience

Decision authority: `D-035`

## Telemetry identity clarification

This future recovery feature must follow `D-038` before Phase 1 begins:

1. `recovery_chain_id` connects a later recovery journey across more than one real product action.
2. Every tool call receives its own `episode_id` and remains a separate final outcome.
3. Every internal original, translated, fallback, grouped, or retry search receives its own `attempt_id`.
4. The initial miss and a later caller retry must not be collapsed into one ordinary search count.
5. Recovery metrics may evaluate progress across the recovery chain without changing headline search totals or zero-rate denominators.
6. Recovery identifiers remain protected diagnostic data and do not enter public reports.

This note changes telemetry identity only. It does not implement recovery behavior, add retries, or change Search v2 results.

## 1. Problem statement

Search v2 deliberately returns an honest empty result when a query is unsupported or too ambiguous. It does not return unrelated filler merely to avoid an empty response. [SOURCE: `docs/si-v2/search/decisions.md`, `D-034`]

The current no-result response gives the caller general advice, such as trying a broader term or removing a library filter. It does not yet give the caller a small set of concrete visual queries, identify the best Supericons tool for the next attempt, link the retry to the original miss, or measure whether the agent recovered. [SOURCE: `mcp/index.js`, current `no_icons_found` response; `docs/si-v2/search/decisions.md`, `D-035`]

The reviewed seven-day hosted MCP export contained 1,030 user-facing search or recommendation attempts. Direct `search_icons` calls produced 94 zero-result attempts out of 788, while primary `recommend_icons` selections produced 2 zero-result attempts out of 242. [SOURCE: `references/verification/hosted-mcp-search-quality-7d-2026-07-22.json`]

Those 96 user-facing misses contained 93 distinct normalized queries, and 90 appeared only once. This is a long tail, so adding every missed phrase to a dictionary is not a complete recovery strategy. [SOURCE: `references/verification/hosted-mcp-search-quality-7d-2026-07-22.json`]

The product need is therefore not to promise a match for every possible phrase. The need is to help an agent make one better, informed attempt when the first search returns nothing, then stop honestly if that attempt also fails. [SOURCE: `docs/si-v2/search/decisions.md`, `D-034` and `D-035`]

## 2. Target users and jobs to be done

### Primary user

The primary user is an AI agent using Supericons through hosted MCP or the local npm MCP package to find icons, recommend a coherent icon set, retrieve exact SVG markup, or preview valid icon references. [SOURCE: `docs/si-v2/vision-charter.md`, `VC-7`; `docs/si-v2/search/search-engine-v2.md`, `FR-49`]

### Secondary user

The secondary user is a person supervising the agent who wants useful icon results without having to invent search synonyms, understand Supericons tool routing, or inspect internal errors. [ASSUMPTION]

### Jobs

| ID | Job to be done |
|---|---|
| `J-01` | When an icon search returns no results, I want a specific next action so I can recover without guessing random synonyms. [SOURCE: `D-035`] |
| `J-02` | When my request describes an interface, workflow, or several UI slots, I want the agent to use the recommendation tool so I receive a coherent set rather than many disconnected searches. [SOURCE: `docs/si-v2/search/search-engine-v2.md`, `FR-46` and `FR-48`] |
| `J-03` | When no relevant icon can be found after a reasonable retry, I want an honest stop or a useful clarification question so I do not receive fabricated relevance. [SOURCE: `D-034` and `D-035`] |
| `J-04` | When I search in a maintained language, I want recovery guidance in that language or a clearly labeled English fallback. [ASSUMPTION]

## 3. Goals

| ID | Goal |
|---|---|
| `G-01` | Increase the share of genuine user-facing zero-result searches that produce a relevant result within the next two tool calls. [SOURCE: `D-035`] |
| `G-02` | Reduce blind repetition, random synonym guessing, and unnecessary MCP calls after a miss. [ASSUMPTION] |
| `G-03` | Preserve the honest no-result behavior and prevent fabricated icon references. [SOURCE: `D-034`] |
| `G-04` | Produce privacy-safe evidence that shows whether deterministic agent guidance closes enough of the remaining gap. [SOURCE: `D-035`] |
| `G-05` | Keep recovery behavior consistent across hosted MCP and the local npm MCP package. [SOURCE: `docs/si-v2/search/search-engine-v2.md`, `FR-49`; `D-033`] |

## 4. Non-goals

- This release will not add embeddings, a request-time query encoder, or an internal language-model call. [SOURCE: `D-035`]
- This release will not promise an icon result for every word or sentence. [SOURCE: `D-034`]
- This release will not restart broad, unbounded dictionary expansion. [SOURCE: `D-035`]
- This release will not allow the server to retry repeatedly or run an autonomous search loop. [SOURCE: `D-035`, single-retry limit]
- This release will not redesign the admin dashboard. It will define the telemetry fields that the dashboard may consume. [ASSUMPTION: dashboard work is owned by a separate workstream]
- This release will not change rate limits, account tiers, billing, or keyless access policy. [ASSUMPTION]
- This release will not automatically send private queries to a third-party model or service. [SOURCE: `D-035`]

## 5. Product principles

1. A zero result is a valid search outcome, not permission to invent a match. [SOURCE: `D-034`]
2. Suggestions describe visual concepts to search for. They are never presented as real icon references until a search returns those references. [ASSUMPTION]
3. The caller agent owns the retry. The server supplies guidance but does not silently make another user-facing tool call. [ASSUMPTION]
4. Recovery is bounded to one linked retry. A second miss ends the automated recovery chain. [SOURCE: `D-035`]
5. Backend failures, timeouts, invalid input, and rate limits keep their own error codes. They must not be relabeled as `no_icons_found`. [SOURCE: existing agent-friendly error contract in `mcp/search-tool-shell.js`; `D-035` scorecard denominator requirement]
6. Exact identity searches keep priority over broad meaning expansion and recovery suggestions. [SOURCE: `D-034`]

## 6. Scope

### In scope

- Add a structured recovery section to top-level `search_icons` no-result responses. [SOURCE: `D-035`]
- Add equivalent bounded guidance when `recommend_icons` cannot produce a primary selection. [SOURCE: `D-035`; seven-day telemetry shows two primary recommendation misses]
- Add route guidance when `get_icon` misses an exact library and ID, without pretending a replacement is the requested icon. [ASSUMPTION: the reviewed export contained 13 explicit icon lookup misses]
- Generate one to three deterministic visual query suggestions from reviewed Search v2 data already shipped with the product. [SOURCE: `D-034`; ASSUMPTION: one to three is the initial response-size bound]
- Recommend `search_icons` or `recommend_icons` based on the request shape. [SOURCE: `D-035`]
- Link the original miss and the caller's one retry with a recovery identifier. [ASSUMPTION]
- Record privacy-safe recovery events and compute the recovery scorecard defined in this PRD. [SOURCE: `D-035`]
- Preserve locale-specific guidance for all 11 maintained non-English locales. [SOURCE: `D-034`; ASSUMPTION: localized recovery copy is required]
- Ship the same contract through hosted MCP and local npm MCP. [SOURCE: `D-033`; `FR-49`]

### Follow-up scope

- Reuse the deterministic suggestion generator in public web search after the MCP experiment proves useful. [ASSUMPTION]
- Add recovery reporting to the admin dashboard after the telemetry contract is stable. [ASSUMPTION]
- Consider a compact multilingual retriever or bounded model-assisted reformulator only if the recovery scorecard proves a persistent meaningful gap. [SOURCE: `D-035`]

## 7. Functional requirements

### `FR-ZR-01`: Structured no-result response

When a genuine top-level search has no results, the response must retain the existing `code: "no_icons_found"` contract and add a structured `recovery` object. The response must include a plain-language message, the original query, relevant filters, a recommended tool, zero to three suggested visual queries, and one clear next step. [SOURCE: current MCP response contract; `D-035`; ASSUMPTION: additive response shape]

The first no-result response must not contain `icon_ref`, `svg`, `image_url`, `markdown_image`, or any other field that implies an icon was found. [SOURCE: `D-034`; ASSUMPTION: explicit response safety rule]

### `FR-ZR-02`: Deterministic suggestion generation

Suggestions must come from the packaged deterministic Search v2 meaning groups, query frames, known aliases, and indexed icon terms. They must not require a network model call. [SOURCE: `D-034` and `D-035`]

Each suggestion must:

- express a visual concept rather than repeat the full original sentence; [ASSUMPTION]
- differ from the normalized original query; [ASSUMPTION]
- differ from every other suggestion in the same response; [ASSUMPTION]
- avoid unsupported library and icon identity claims; [SOURCE: `D-034`]
- include a short reason that explains the visual interpretation; [ASSUMPTION]
- carry a confidence label of `direct`, `related`, or `exploratory`; [ASSUMPTION]
- preserve an exact brand, product, technical term, or explicit icon identity instead of replacing it with a broad metaphor. [SOURCE: `D-034`]

If the deterministic data cannot produce a useful suggestion, the response must return an empty suggestion list and ask for clarification. [SOURCE: `D-034`; ASSUMPTION]

### `FR-ZR-03`: Tool routing guidance

The response must recommend `search_icons` for one visual concept, `recommend_icons` for a product surface, workflow, or multiple UI slots, and `get_icon` only when an exact library and ID are known. `preview_icons` must only be recommended after valid icon references exist. [SOURCE: existing MCP tool responsibilities; ASSUMPTION: routing rules]

### `FR-ZR-04`: One linked retry

The first miss must return a recovery identifier, `attempt: 0`, and `max_attempts: 1`. The caller may include that identifier and `attempt: 1` in one follow-up `search_icons` or `recommend_icons` call. [SOURCE: `D-035`; ASSUMPTION: linkage fields]

The server must accept at most one linked retry. A request with an attempt above 1 must not generate another suggestion chain. [SOURCE: `D-035`]

The recovery fields must be optional and additive so existing clients that do not send them continue to work. [SOURCE: compatibility constraint in `docs/si-v2/search/search-engine-v2.md`; ASSUMPTION]

### `FR-ZR-05`: Terminal recovery outcome

If the linked retry succeeds, the normal successful result contract applies and the response records that recovery succeeded. [ASSUMPTION]

If the linked retry also returns no results, the response must use `code: "no_icons_found_after_recovery"`, return no further suggested queries, and give one of these next steps:

1. ask the person to choose between two or three clearly different visual directions; or
2. state that Supericons could not find a relevant icon and stop. [SOURCE: `D-034`; ASSUMPTION: terminal response code and paths]

### `FR-ZR-06`: Locale behavior

For Simplified Chinese, Traditional Chinese, Japanese, Korean, Spanish, German, Portuguese, Arabic, Hindi, Vietnamese, and Thai, the response must use the maintained locale data to produce suggestions and recovery copy in the requested locale when suitable reviewed terms exist. [SOURCE: `D-034`; maintained locale set in `mcp/index.js`]

If no suitable localized suggestion exists, the response may include a clearly labeled English fallback without changing the original locale field. It must not claim that the fallback is localized. [ASSUMPTION]

No per-locale quality claim may be made from a small production sample alone. [SOURCE: seven-day telemetry confidence intervals in `references/verification/hosted-mcp-search-quality-7d-2026-07-22.json`]

### `FR-ZR-07`: Exact lookup miss guidance

When `get_icon` cannot find an exact library and ID, it must preserve the exact-miss outcome and may recommend a new `search_icons` query based on the requested ID. It must not substitute a different library or icon without labeling it as an alternative. [SOURCE: `D-034`; ASSUMPTION]

Exact lookup misses must be recorded as misses rather than dashboard successes. [SOURCE: the reviewed seven-day export contained 13 responses labeled Success that explicitly said Icon not found]

### `FR-ZR-08`: Agent-readable and human-readable output

Every recovery response must expose the same facts in structured content and concise suggested response text. The text must explain what happened, what the agent can try once, and what it should do if the retry fails. [SOURCE: current one-call presentation contract in `mcp/search-tool-shell.js`; `D-035`]

The response must not use a protocol or validation error code for a normal no-match outcome. Existing surface-specific MCP `isError` behavior may remain unchanged in the first experiment, but the test matrix must prove that supported clients can read and follow the recovery fields. [ASSUMPTION: compatibility-first experiment]

### `FR-ZR-09`: Recovery telemetry

The system must record enough data to join the initial miss to the next two tool calls without storing new raw personal identifiers. [SOURCE: `D-035`]

The minimum recovery event fields are:

- recovery identifier; [ASSUMPTION]
- original event or request identifier; [ASSUMPTION]
- event type: `offered`, `attempted`, `succeeded`, `failed`, `clarification_requested`, or `abandoned`; [ASSUMPTION]
- top-level tool name and execution route; [SOURCE: `D-035`; existing telemetry route contract]
- original normalized query category, locale, library mode, and result count; [SOURCE: `D-035`]
- suggested query position, confidence label, and recommended tool; [ASSUMPTION]
- retry tool, retry result count, final code, and elapsed recovery time; [SOURCE: `D-035`]
- MCP package or hosted service version and client family when available; [SOURCE: seven-day telemetry observability gaps]
- flags that distinguish user-facing calls from internal recommendation variants, scripted checks, test cohorts, noise, and exact icon lookups. [SOURCE: `D-035`]

Public and shareable reports must use aggregate counts and rates. They must not expose raw searcher hashes, IP addresses, account identifiers, or recovery identifiers. [SOURCE: `D-035`, privacy-safe scorecard; `AGENTS.md`, public-safe output rule]

### `FR-ZR-10`: Shared behavior across agent surfaces

The recovery generator, response fields, validation, and telemetry semantics must live in shared MCP code used by both the local npm package and Railway hosted MCP. Surface adapters may format the text differently, but they must preserve the structured meaning. [SOURCE: `D-033`; `FR-49`]

The OpenAI app and remote MCP clients inherit the hosted contract. Local OpenCode, Claude Code, Cursor, and similar clients inherit the npm contract. [ASSUMPTION: client transport mapping]

### `FR-ZR-11`: Failure isolation

A failure in suggestion generation or recovery telemetry must not turn an honest no-result into a server error. The system must fall back to the current plain no-result response. [SOURCE: deterministic maintenance boundary in `D-035`; ASSUMPTION: fail-open guidance, fail-closed relevance]

Rate limits, timeouts, invalid inputs, unavailable services, and other infrastructure failures must retain their original status and next step. They do not count as eligible zero-result recovery cases. [SOURCE: `D-035` denominator rules; existing MCP error contract]

## 8. Proposed response contract

### First no-result response

```json
{
  "error": "No icons found",
  "code": "no_icons_found",
  "query": "amazing",
  "locale": null,
  "results": [],
  "recommended_tool": "search_icons",
  "suggested_queries": [
    {
      "query": "sparkles",
      "reason": "A common visual for delight or something impressive.",
      "confidence": "related"
    },
    {
      "query": "celebration",
      "reason": "Useful when amazing means a happy achievement.",
      "confidence": "exploratory"
    }
  ],
  "next_step": "Retry once with one suggested query. If it also returns no results, ask what visual direction the user prefers.",
  "recovery": {
    "id": "opaque-short-lived-id",
    "attempt": 0,
    "max_attempts": 1
  }
}
```

This example illustrates the proposed additive shape. The exact suggestions remain deterministic outputs of the candidate release and are not guaranteed literals. [ASSUMPTION]

### Linked retry input

```json
{
  "query": "sparkles",
  "recovery": {
    "id": "opaque-short-lived-id",
    "attempt": 1
  }
}
```

The nested object is the preferred initial schema because it keeps recovery metadata separate from search meaning and leaves room for compatible additions. [ASSUMPTION]

### Terminal no-result response

```json
{
  "error": "No icons found after one recovery attempt",
  "code": "no_icons_found_after_recovery",
  "results": [],
  "suggested_queries": [],
  "next_step": "Ask whether the user wants a celebration, quality, surprise, or achievement symbol. Do not invent an icon reference.",
  "recovery": {
    "id": "opaque-short-lived-id",
    "attempt": 1,
    "max_attempts": 1,
    "outcome": "failed"
  }
}
```

## 9. Recovery flow

```text
User asks for an icon
        |
        v
Agent calls the appropriate Supericons tool
        |
        +---------------- result found ----------------+
        |                                               |
        v                                               v
No result                                      Return real icon refs
        |
        v
Supericons returns up to 3 visual queries,
the recommended tool, and one recovery ID
        |
        v
Agent chooses one suggestion and retries once
        |
        +---------------- result found ----------------+
        |                                               |
        v                                               v
Second no result                               Return real icon refs
        |
        v
Stop the automated retry chain
        |
        v
Ask for a visual direction or report an honest miss
```

This flow is intentionally caller-controlled and limited to one retry. [SOURCE: `D-035`; ASSUMPTION: caller-controlled execution]

## 10. Success metrics

### Primary outcome

`Recovery success rate` equals eligible top-level zero-result roots that produce a positive user-facing result within the next two tool calls, divided by eligible top-level zero-result roots where recovery guidance was offered. [SOURCE: `D-035`; metric design follows completion-rate guidance]

### Supporting metrics

| Metric | Definition |
|---|---|
| Recovery attempt rate | Eligible recovery offers followed by a linked retry within the next two tool calls, divided by eligible recovery offers. [ASSUMPTION] |
| First-retry success rate | Linked attempt-1 calls with at least one valid result, divided by linked attempt-1 calls. [ASSUMPTION] |
| Clarification rate | Recovery chains that end with a useful clarification request, divided by failed recovery chains. [ASSUMPTION] |
| Recovery time | Time from the original no-result response to success, terminal failure, or abandonment. [SOURCE: `D-035`] |
| Calls to resolution | Number of tool calls from the original miss through the final outcome. [ASSUMPTION] |
| Locale recovery rate | Recovery success rate segmented by locale, reported only when the sample is large enough to avoid a misleading claim. [SOURCE: `D-035`; seven-day sample limitations] |
| Client recovery rate | Recovery success rate segmented by client family when the field is available. [SOURCE: `D-035`] |
| Wrong confident result rate | Reviewed recovered results judged unrelated despite a `direct` or `related` suggestion, divided by reviewed recovered results with those labels. [SOURCE: `D-035`] |

### Guardrails

| Guardrail | Release requirement |
|---|---|
| Fabricated icon references | Zero in the fixed recovery suite. [SOURCE: `D-034`] |
| Automated retry depth | No recovery chain may exceed one linked retry. [SOURCE: `D-035`] |
| Error misclassification | Rate limits, invalid input, timeouts, and backend failures remain distinct from no-result outcomes in every fixture. [SOURCE: existing error contract; `D-035`] |
| Search regression | The fixed 225-case Search v2 suite must keep its approved fingerprint unless every changed case receives a case-level review. [SOURCE: `D-034`] |
| Maintained language regression | The 612 localized meaning checks and 638 established multilingual fixtures must remain green on the exact candidate. [SOURCE: `D-034`; `FR-50`] |
| Added local processing time | Recovery generation p95 should add no more than 50 ms on the approved fixed workload. [ASSUMPTION: initial performance budget] |
| Privacy | No new raw identity value may enter public or shareable recovery reports. [SOURCE: `D-035`; public-safe output rule] |

The first production scorecard should be treated as directional until it contains at least 100 eligible recovery offers. Per-locale conclusions should require at least 100 eligible offers in that locale plus a reviewed relevance sample. [ASSUMPTION: initial evidence thresholds, not a universal statistical standard]

## 11. Acceptance tests

### Contract and safety

1. A meaningful unsupported query returns `no_icons_found`, no icon or image fields, a recommended tool, zero to three deterministic suggestions, a next step, and recovery attempt 0. [SOURCE: `D-034`; proposed contract]
2. Nonsensical input returns an honest empty result and may return no suggestions when no useful visual interpretation exists. [SOURCE: `D-034`]
3. A linked retry can succeed and returns only icon references produced by the real search engine. [ASSUMPTION]
4. A linked retry that misses returns `no_icons_found_after_recovery`, no further suggestions, and a clarification or stop instruction. [SOURCE: `D-035`; proposed contract]
5. Attempt 2 or higher cannot start another recovery chain. [SOURCE: `D-035`]
6. A rate limit, timeout, malformed request, and injected backend exception each retain their existing code and are excluded from recovery metrics. [SOURCE: existing MCP error contract; `D-035`]
7. Suggestion generation and telemetry failures fall back to the current plain no-result response. [ASSUMPTION]

### Tool routing

8. A single visual concept recommends `search_icons`. [ASSUMPTION]
9. A six-slot interface request recommends `recommend_icons`. [SOURCE: current recommendation contract]
10. An exact `library:id` request keeps `get_icon`; an exact miss labels any broader search as an alternative. [SOURCE: `D-034`; proposed contract]
11. `preview_icons` is never recommended before valid icon references exist. [SOURCE: current preview tool responsibility]

### Language behavior

12. Every maintained locale has at least one recovery-success fixture and one terminal honest-miss fixture. [ASSUMPTION]
13. Localized suggestions use terms from the exact packaged locale and meaning data. [SOURCE: `D-034`]
14. A labeled English fallback does not overwrite or misreport the requested locale. [ASSUMPTION]
15. Locale-absent non-English input keeps the current safe language-detection behavior and does not infer unsupported certainty. [SOURCE: current search behavior; ASSUMPTION]

### Surface parity

16. The exact npm candidate and hosted MCP candidate produce equivalent structured recovery fields for the same fixed inputs. [SOURCE: `D-033`; `FR-49`]
17. At least one OpenAI app or generic remote MCP client and one local stdio client can read the recovery fields and complete a linked retry. [ASSUMPTION]
18. Existing clients that omit the recovery object continue to search normally. [SOURCE: compatibility constraint]

### Telemetry

19. One complete success chain records `offered`, `attempted`, and `succeeded` under one recovery identifier. [ASSUMPTION]
20. One failed chain records `offered`, `attempted`, and `failed`, then stops. [ASSUMPTION]
21. Internal recommendation variants do not enter the top-level recovery denominator. [SOURCE: `D-035`]
22. Scripted fixtures, controlled tests, noise, infrastructure errors, and exact lookup rows remain distinguishable from genuine top-level searches. [SOURCE: `D-035`]
23. Public scorecard export contains aggregates and no raw identity or recovery identifier. [SOURCE: `D-035`; public-safe output rule]

### Regression

24. The exact candidate passes the fixed 225 search cases, 244 English meaning checks, 612 localized checks, 638 multilingual fixtures, and existing honest no-result checks. [SOURCE: `D-034`; `FR-50`]
25. Recovery generation meets the proposed 50 ms p95 added-processing budget on the approved fixed workload. [ASSUMPTION]

## 12. Implementation plan

### Phase 1: Freeze the contract and fixtures

1. Add the response and input schemas for `recovery`, `recommended_tool`, and `suggested_queries` as additive fields. [ASSUMPTION]
2. Build a fixed recovery corpus from current honest misses, reviewed production zero-result clusters, exact lookup misses, nonsense inputs, multi-slot requests, and every maintained locale. [SOURCE: `D-035`; seven-day telemetry artifact]
3. Mark each fixture as `recoverable`, `clarification_required`, `unsupported`, or `not_eligible_error`. [ASSUMPTION]
4. Record the accepted response shape and retry rule in the Search v2 contract before runtime wiring. [ASSUMPTION]

Exit gate: schema fixtures prove additive compatibility, zero fabricated references, and a hard maximum of one linked retry. [SOURCE: `D-034` and `D-035`]

### Phase 2: Build the shared deterministic recovery generator

1. Implement one shared module that normalizes the original query and reads the existing packaged meaning groups, query frames, aliases, locale terms, and index vocabulary. [SOURCE: `D-034`; `FR-49`]
2. Rank candidate visual queries with exact identity preservation, word-boundary rules, locale priority, deduplication, and a maximum of three suggestions. [SOURCE: `D-034`; ASSUMPTION]
3. Add tool routing based on single-concept, interface, workflow, and multi-slot request shapes. [ASSUMPTION]
4. Return no suggestions when the confidence floor is not met. [SOURCE: honest no-result contract; ASSUMPTION]

Exit gate: the fixed recovery corpus passes in every maintained locale, processing meets the proposed latency budget, and the approved search fingerprint remains unchanged. [SOURCE: `D-034`; ASSUMPTION]

### Phase 3: Wire MCP tools and enforce the retry boundary

1. Add recovery output to `search_icons` no-result responses in the shared shell and both transport paths. [SOURCE: current code structure; `D-035`]
2. Add equivalent terminal guidance to primary `recommend_icons` misses. [SOURCE: `D-035`]
3. Add alternative-search guidance to exact `get_icon` misses. [ASSUMPTION]
4. Validate the optional recovery input object, accept attempt 1, and suppress further suggestions after that attempt. [SOURCE: `D-035`]
5. Preserve rate-limit, invalid-input, timeout, and infrastructure error behavior. [SOURCE: existing MCP error contract]

Exit gate: hosted HTTP and local stdio integration tests pass every contract, error, retry, locale, and compatibility case. [ASSUMPTION]

### Phase 4: Add privacy-safe recovery measurement

1. Add recovery event fields and root linkage to the best-effort telemetry path. [SOURCE: `D-035`]
2. Separate top-level calls from internal recommendation variants, exact lookups, scripted tests, noise, and non-search errors. [SOURCE: `D-035`]
3. Build an aggregate scorecard query for recovery success, attempt rate, time, client, locale, terminal outcome, and wrong confident result review. [SOURCE: `D-035`]
4. Correct exact lookup outcome mapping so an explicit `Icon not found` response is measured as a miss rather than a success. [SOURCE: seven-day telemetry artifact]
5. Document missing-field and best-effort telemetry limits beside every scorecard. [SOURCE: seven-day telemetry artifact; `D-035`]

Exit gate: a synthetic success chain, failed chain, abandoned chain, excluded internal chain, and exact lookup miss produce the correct private events and public aggregates. [ASSUMPTION]

### Phase 5: Candidate verification and bounded rollout

1. Build exact npm and hosted candidates from the same shared code and packaged Search v2 data. [SOURCE: `D-033`; `FR-49`]
2. Run the full acceptance suite on the exact candidate bytes. [SOURCE: established release discipline]
3. Exercise one remote MCP client and one local stdio client to confirm that the caller can read the fields and perform one retry. [ASSUMPTION]
4. Release to a labeled or otherwise distinguishable initial cohort without enabling embeddings or a model fallback. [SOURCE: `D-035`]
5. Observe errors, retry depth, added latency, wrong confident results, and recovery completion before broad promotion. [SOURCE: `D-035`]
6. Release each affected npm or hosted surface only after it passes the shared contract and its own surface gate. Do not redeploy an unaffected surface for version-label alignment. [SOURCE: `D-046`; `FR-49`]

Exit gate: all affected-surface guardrails pass, the initial cohort shows no safety or compatibility blocker, and the release record maps each affected surface to its exact artifact and compatible recovery contract. [SOURCE: `D-046`; `FR-49`]

### Phase 6: Evidence review and architecture decision

1. Produce the first recovery scorecard after the proposed minimum of 100 eligible offers. [ASSUMPTION]
2. Review a sample of recovered results and every high-confidence wrong result. [SOURCE: `D-035`]
3. Group unresolved meaningful queries by repeated gap type rather than treating every unique phrase as a new dictionary task. [SOURCE: `D-035`]
4. Continue deterministic maintenance if guided retries resolve enough useful cases without material guardrail regressions. [SOURCE: `D-035`]
5. Open a new architecture decision only if a persistent meaningful gap remains. Compare deterministic suggestions, caller-agent reformulation, compact multilingual retrieval, and a bounded model-assisted reformulator on the same evidence. [SOURCE: `D-035`]

Exit gate: record a decision to keep the deterministic recovery contract, refine it with bounded evidence, or begin a separately approved adaptive-retrieval experiment. [SOURCE: `D-035`]

## 13. Dependencies and constraints

- The implementation depends on the packaged Search v2 meaning graph, locale files, query-frame logic, and index vocabulary remaining available to both npm and Railway builds. [SOURCE: `D-034`; `FR-49`]
- The implementation depends on a telemetry root or recovery identifier that can link up to two later tool calls without exposing raw identity in reports. [SOURCE: `D-035`; ASSUMPTION]
- The implementation must remain compatible with current public APIs and clients that do not understand recovery fields. [SOURCE: `docs/si-v2/search/search-engine-v2.md`, Constraints]
- The implementation must not make local npm search depend on a hosted service or third-party model. [SOURCE: `D-035`]
- The implementation must not change the accepted keyless access or allowance policy. [ASSUMPTION]

## 14. Risks and mitigations

| ID | Risk | Mitigation |
|---|---|---|
| `R-01` | Suggestions create loops and waste rate allowance. [SOURCE: `D-035`] | Enforce one linked retry in the server contract, not only in prompt text. [ASSUMPTION] |
| `R-02` | Broad suggestions return visually unrelated icons with high confidence. [SOURCE: `D-034`; `D-035`] | Use confidence floors, exact-term priority, an honest empty suggestion list, and reviewed wrong-confidence samples. [SOURCE: `D-034`; `D-035`] |
| `R-03` | Recovery linkage creates new privacy exposure. [SOURCE: `D-035`] | Use opaque short-lived identifiers, keep raw linkage out of public reports, and retain only fields needed for the scorecard. [ASSUMPTION] |
| `R-04` | Hosted and npm responses drift. [SOURCE: `D-033`] | Implement the generator and schemas in shared code, then require exact surface-parity fixtures. [SOURCE: `FR-49`; ASSUMPTION] |
| `R-05` | Suggestion generation slows every successful search. [ASSUMPTION] | Run it only after a genuine no-result and enforce the proposed 50 ms p95 added-processing budget. [ASSUMPTION] |
| `R-06` | Infrastructure errors pollute the recovery denominator. [SOURCE: `D-035`] | Keep error codes distinct and explicitly exclude non-search failures and scripted traffic. [SOURCE: `D-035`] |
| `R-07` | Small locale samples lead to misleading quality claims. [SOURCE: seven-day telemetry artifact] | Report confidence limits and require a larger sample plus relevance review before per-locale conclusions. [ASSUMPTION] |
| `R-08` | Exact lookup alternatives are mistaken for the requested official icon. [ASSUMPTION] | Preserve the exact miss and label every broader match as an alternative. [SOURCE: `D-034`; ASSUMPTION] |

## 15. Open questions

1. What short-lived retention window is sufficient to link a recovery chain while minimizing stored linkage data? [ASSUMPTION: engineering decision required]
2. Should client families that ignore structured recovery fields receive stronger suggested response text, or should the first release keep identical text on every client? [ASSUMPTION: client evidence required]
3. Is 100 eligible recovery offers sufficient for the first production read, or should the first decision wait for a larger cohort? [ASSUMPTION: product measurement decision required]
4. When should the public web search adopt the same suggestions: immediately after MCP proof, or as a separate user-interface experiment? [ASSUMPTION: roadmap decision required]

None of these questions blocks Phases 1 through 4. The implementation can use short-lived opaque identifiers, identical fallback text, the proposed initial reporting threshold, and MCP-only rollout as the default assumptions until production evidence supports a change. [ASSUMPTION]

## 16. Definition of done

This work is complete when all of the following are true:

- hosted MCP and local npm MCP return the same additive recovery contract on genuine top-level no-result cases; [SOURCE: `D-033`; proposed contract]
- the caller can perform one linked retry and the server prevents a second automated recovery attempt; [SOURCE: `D-035`]
- successful recovery returns only real search results, while failed recovery ends with clarification or an honest stop; [SOURCE: `D-034`; proposed contract]
- every maintained locale passes localized recovery and terminal-miss fixtures; [SOURCE: `D-034`; ASSUMPTION]
- infrastructure failures and internal recommendation variants remain outside the recovery denominator; [SOURCE: `D-035`]
- the exact candidate passes all Search v2 regression, multilingual, compatibility, privacy, and performance gates; [SOURCE: `D-034`; `FR-50`; proposed gates]
- a privacy-safe scorecard can measure recovery within the next two tool calls and explain its telemetry limits; and [SOURCE: `D-035`]
- embeddings and model-assisted fallback remain off unless a later accepted decision authorizes them from evidence. [SOURCE: `D-035`]

## 17. Source index

- `docs/si-v2/vision-charter.md`: agent-first product boundary and owner-controlled promotion. [SOURCE]
- `docs/si-v2/search/decisions.md`, `D-033`: synchronized deterministic surfaces. [SOURCE]
- `docs/si-v2/search/decisions.md`, `D-034`: broad deterministic meaning coverage and honest no-results. [SOURCE]
- `docs/si-v2/search/decisions.md`, `D-035`: agent-cooperative zero-result experiment, privacy-safe recovery scorecard, and paused adaptive retrieval. [SOURCE]
- `docs/si-v2/search/search-engine-v2.md`, `FR-46`, `FR-48`, `FR-49`, `FR-50`, and `FR-51`: tool behavior, local-first routing, surface consistency, maintained meaning coverage, and maintenance mode. [SOURCE]
- `docs/si-v2/search/implementation-status.md`: verified 0.4.20 release baseline and current maintenance state. [SOURCE]
- `mcp/index.js`, `mcp/remote-server.js`, and `mcp/search-tool-shell.js`: current no-result, structured response, and agent-facing presentation behavior. [SOURCE]
- `references/verification/hosted-mcp-search-quality-7d-2026-07-22.json`: reproducible seven-day hosted MCP quality and observability analysis. [SOURCE]

## 18. Requirement traceability

Every MVP requirement below exists to serve a named user job, goal, or risk. [ASSUMPTION: product traceability]

| Requirement | User jobs | Goals | Main risks controlled |
|---|---|---|---|
| `FR-ZR-01` Structured no-result response | `J-01`, `J-03` | `G-01`, `G-03` | `R-02`, `R-04` |
| `FR-ZR-02` Deterministic suggestions | `J-01`, `J-03`, `J-04` | `G-01`, `G-03` | `R-02`, `R-05`, `R-07` |
| `FR-ZR-03` Tool routing | `J-01`, `J-02` | `G-01`, `G-02` | `R-01` |
| `FR-ZR-04` One linked retry | `J-01`, `J-03` | `G-02`, `G-04` | `R-01`, `R-03` |
| `FR-ZR-05` Terminal outcome | `J-03` | `G-03` | `R-01`, `R-02` |
| `FR-ZR-06` Locale behavior | `J-04` | `G-01`, `G-05` | `R-02`, `R-07` |
| `FR-ZR-07` Exact lookup guidance | `J-01`, `J-03` | `G-03`, `G-04` | `R-08` |
| `FR-ZR-08` Agent-readable output | `J-01`, `J-03` | `G-02`, `G-03`, `G-05` | `R-04` |
| `FR-ZR-09` Recovery telemetry | `J-01` | `G-04` | `R-03`, `R-06`, `R-07` |
| `FR-ZR-10` Shared agent surfaces | `J-01`, `J-04` | `G-05` | `R-04` |
| `FR-ZR-11` Failure isolation | `J-03` | `G-03` | `R-02`, `R-05`, `R-06` |

## 19. Expected implementation touchpoints

These are the expected code and record locations based on the current repository structure. Exact placement may change if a smaller shared boundary is found during implementation. [SOURCE: current repository structure; ASSUMPTION: implementation placement]

| Area | Expected change |
|---|---|
| `mcp/search-zero-result-recovery.js` | New shared deterministic suggestion, routing, retry-boundary, and terminal-response module. [ASSUMPTION] |
| `mcp/search-tool-shell.js` | Shared agent instructions and human-readable recovery presentation. [SOURCE: current presentation code; ASSUMPTION: extension point] |
| `mcp/index.js` | Local stdio input schema, no-result response wiring, linked-retry handling, and local telemetry calls. [SOURCE: current local tool implementation] |
| `mcp/remote-server.js` | Hosted input and output schemas plus the same shared recovery wiring. [SOURCE: current hosted tool implementation] |
| `mcp/telemetry.js` | Privacy-safe recovery event fields and outcome classification. [SOURCE: current telemetry implementation] |
| Search v2 verification scripts | Fixed recovery corpus, locale matrix, error-isolation checks, retry-depth checks, surface parity, latency, and public-safe scorecard checks. [ASSUMPTION] |
| `docs/si-v2/search/decisions.md` | Record the accepted runtime contract as a new decision before release rather than rewriting `D-035` as if the experiment were already shipped. [ASSUMPTION] |
| `docs/si-v2/search/search-engine-v2.md` | Add the accepted recovery requirement and binding release gate. [ASSUMPTION] |
| `docs/si-v2/search/implementation-status.md` | Report the feature as implemented only after the exact released surfaces pass the stated evidence gates. [SOURCE: evidence-ledger authority rule] |
