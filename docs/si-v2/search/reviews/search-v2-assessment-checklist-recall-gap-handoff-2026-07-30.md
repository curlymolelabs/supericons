# Search v2 assessment and quality checklist recall gap

Status: Ready for a focused search-engine investigation and repair

Date: 2026-07-30

Scope: Search retrieval, relevance, and synchronized surface behavior only

## Objective

Improve search results for quality-assurance and assessment-checklist concepts, especially when the caller requires the Lucide library.

The immediate query is:

```text
assessment checklist quality assurance
```

This work must improve useful recall without weakening relevance for unrelated searches or changing telemetry, the admin dashboard, tool schemas, recommendations, allowances, or website layout.

## Why this matters

Production telemetry shows repeated attempts for this query. The hosted search returned only one Lucide icon each time. Repeated calls with the same words and different requested limits indicate that the first answer may not have provided enough useful choice.

The current behavior is not a telemetry error. It is a narrow search-recall gap and a surface-consistency gap:

- Hosted MCP returned one relevant Lucide icon.
- The current repository's local pipeline returns zero under the same strict Lucide constraint.
- The live website currently returns one result in Lucide and more results across all libraries.

## Evidence inventory

The investigation used these owner-provided exports:

- `supericons-search-summary-24h-20260729T160412Z.csv`
- `supericons-request-log-24h-20260729T160416Z.csv`
- `supericons-audit-bundle-24h-20260729T160420Z.json`

The Audit Bundle reported:

- integrity status: `passed`
- source reconciliation: `passed`
- unexplained rows: `0`
- recorded positive results for this query had returned icon references

The evidence is reliable for the Hosted MCP calls described below. It contains no Web final-outcome row for this exact query, so it cannot explain the owner's earlier Web zero.

## Production observations

The selected 24-hour period contains six top-level production calls for the exact query.

| Field | Observed value |
|---|---|
| Channel | Hosted MCP |
| Tool | `search_icons` |
| Search execution | Hosted |
| Server version | `0.4.24` |
| Library | `lucide` |
| Library mode | `strict` |
| Calls | 6 |
| Estimated client IDs | 3 |
| First recorded | 2026-07-29 14:59:29 UTC |
| Last recorded | 2026-07-29 15:28:30 UTC |
| Result count on every call | 1 |
| Returned icon on every call | `lucide:list-check` |

Request-limit breakdown:

| Requested limit | Calls | Returned | Dashboard classification |
|---:|---:|---:|---|
| 1 | 5 | 1 each | Success |
| 5 | 1 | 1 | Low |

The summary label `Mixed: 5 success, 1 low` is correct. The classifier marks a positive `search_icons` result as low when the result count is below `min(requested_limit, 3)`. See `lib/admin-dashboard-metrics.js`, function `classifySearchAttempt`.

Do not change this reporting rule as part of the search repair.

## Exact icon returned

The tool returned:

```text
lucide:list-check
```

The icon shows horizontal list lines with a checkmark. It is relevant to the checklist portion of the query, but one icon does not provide enough choice for a caller requesting five options.

## Reproduction matrix

### Current repository pipeline

Command shape used:

```js
searchIcons("assessment checklist quality assurance", icons, synonyms, options)
```

Results on 2026-07-30:

| Mode | Limit | Result |
|---|---:|---|
| All libraries, Web-like confidence floor | 60 | 7 results |
| Strict Lucide | 1 | 0 results |
| Strict Lucide | 5 | 0 results |

The seven all-library references were:

```text
material:assessment
material:checklist
material:call_quality
tabler:checklist
material:high_quality
bootstrap:card-checklist
material:checklist_rtl
```

### Live website

A browser verification on 2026-07-30 entered the exact query and waited seven seconds for hosted search to settle. The final Web telemetry request was blocked during the check.

| Website scope | Visible results |
|---|---:|
| All Icons | 18 |
| Lucide | 1 |

The Lucide result was:

```text
lucide:list-check
```

The owner's earlier Web zero does not reproduce on the current live website. Possible causes such as a previous build, an active filter, or a temporary hosted failure remain unverified because the export contains no matching Web final-outcome row.

Do not claim that the earlier Web zero is fixed unless a matching historical event or a reproducible failure explains it.

## Bug classification

### Confirmed: strict-library recall gap

Strict Lucide search has only one useful hosted result for a concept that has several plausible Lucide representations. The current repository's local pipeline returns none.

### Confirmed: search-surface disagreement

For the same query and strict Lucide constraint:

- historical hosted execution returned `lucide:list-check`
- current local pipeline returned zero
- current live Web hosted execution returned `lucide:list-check`

The search agent must identify whether this difference comes from candidate generation, protected hosted enrichment, confidence filtering, version skew, or routing. Do not assume the cause before tracing the candidate set and rejection reasons.

### Not a bug: mixed dashboard outcome

The mixed Success and Low label comes from different requested limits. All six calls returned the same icon and result count.

### Unverified: historical Web zero

There is no matching Web event in the provided export. Keep this separate from the confirmed Lucide recall problem.

## Relevant code and data

Start with:

- `mcp/runtime/search-pipeline.js`
  - candidate indexing and candidate-pool construction
  - `searchIcons`
  - `searchIconsForSingleQuery`
  - confidence-floor filtering
- `mcp/search.js`
  - shared pipeline wrapper
- `mcp/index.js`
  - local MCP `search_icons` path
  - strict-library defaults and hosted fallback
- `mcp/remote-server.js`
  - hosted MCP routing and library-mode handling
- `mcp/hosted-search-client.js`
  - hosted search request contract
- `lib/search-engine-client.js`
  - Web request to `https://mcp.supericons.dev/search-icons`
- `main.js`
  - `getHostedSearchLibraryFilter`
  - `refreshHostedSearchResults`
  - `resolveWebSearchResults`
- `data/search-intent-graph/intent-groups.json`
  - quality-assurance and testing intent group
  - checklist-tasks intent group
- `lib/admin-dashboard-metrics.js`
  - read only for this task, to understand the Low label

Existing intent data already mentions:

- `quality assurance`
- `checklist`
- testing and quality result families
- checklist and task-list fallback terms

The investigation should determine why those concepts do not produce a broader, relevant Lucide candidate set in the shared local pipeline.

## Required investigation

1. Reproduce the three cases before changing code:
   - all libraries, limit 8
   - strict Lucide, limit 1
   - strict Lucide, limit 5
2. Capture the candidate set before final filtering.
3. For plausible Lucide candidates, record why each was accepted or rejected.
4. Trace whether the hosted result comes from public lexical data, the intent graph, hosted enrichment, or another route.
5. Compare identical request parameters across:
   - local npm pipeline
   - hosted MCP
   - website hosted search
6. Confirm whether the surfaces are expected to return identical ordered references or only equivalent relevant families.
7. Implement the smallest root-cause fix.

Candidate families to review include:

```text
list check
list checks
clipboard check
clipboard list
file check
shield check
badge check
inspection
audit
verification
quality
assessment
```

These are review candidates, not an instruction to force every icon into the result set.

## Fix constraints

The repair should:

- improve meaning-family recall, not add a one-off full-query string
- preserve strict library behavior
- avoid making generic words such as `quality`, `check`, or `assessment` match unrelated icons broadly
- avoid brand results and other lexical accidents in the leading results
- keep protected search intelligence out of public client bundles, per VC-3
- preserve existing tool inputs and outputs
- preserve search allowances
- preserve telemetry behavior and event identity
- preserve recommendation behavior
- avoid admin-dashboard changes

Do not solve this by loosening the global confidence floor without evidence that the wider change is safe.

## Proposed acceptance criteria

The search agent should validate and, if necessary, refine these criteria against reviewed relevance:

1. `library=lucide`, `library_mode=strict`, `limit=1`
   - returns one relevant Lucide icon
   - `lucide:list-check` is acceptable unless a clearly better reviewed result exists
2. `library=lucide`, `library_mode=strict`, `limit=5`
   - returns at least three reviewed, relevant Lucide alternatives
   - contains no result from another library
3. all libraries, `limit=8`
   - returns multiple assessment, checklist, testing, audit, or quality-related icons
   - does not return unrelated brands in the leading results
4. related variants also work:
   - `quality assurance checklist`
   - `assessment checklist`
   - `QA checklist`
   - `inspection checklist`
   - `audit checklist`
5. identical hosted Web and Hosted MCP parameters do not disagree on zero versus positive outcome
6. Local MCP does not return zero when the hosted path returns a strong public Lucide match

If fewer than three Lucide icons pass human relevance review, document that finding and replace criterion 2 with the proven honest maximum. Do not pad results with weak icons merely to reach a count.

## Regression protection

Add a focused fixture group for this meaning family. At minimum, capture:

- query
- library and library mode
- requested limit
- required relevant families or acceptable icon references
- prohibited leading references or families
- expected zero or positive decision

Run:

- the focused new fixtures
- the full existing Search v2 regression suite
- the existing synchronized-surface checks
- the existing search fingerprint comparison
- hosted request and response-shape checks

The final evidence must list every intentional fingerprint change. All unrelated cases should remain unchanged.

## Performance and safety gates

- No material increase in search latency for the existing regression corpus.
- No new network call in the local deterministic path.
- No change to ordered results outside the reviewed target family unless separately explained.
- No protected hosted ranking data added to npm or Web bundles.
- No Search v2 result change may be hidden as a telemetry or dashboard change.

## Deliverables

1. Before-and-after result table for the exact query and five related variants.
2. Root-cause explanation naming the violated assumption.
3. Focused code change.
4. Regression fixtures and test output.
5. Surface comparison for Local MCP, Hosted MCP, and Web.
6. Search fingerprint comparison with intentional deltas identified.
7. Latency comparison.
8. Rollback commit or deployment identifier.

## Stop conditions

Stop and report if:

- improvement requires exposing protected hosted intelligence in a public bundle
- the only apparent fix weakens global relevance materially
- strict Lucide cannot produce more than one honestly relevant result
- Local and hosted behavior cannot be compared because the deployed build cannot be identified
- the historical Web zero is being used as a release claim without reproducible evidence

## Completion standard

This work is complete only when the exact query and its reviewed variants return useful, honest results across the intended surfaces, existing search quality remains intact, and the evidence identifies both the improvement and every intentional behavior change.
